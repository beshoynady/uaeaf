import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { classifyWriteFailure } from "@/lib/api/admin-write";
import { callUpstream, UpstreamError } from "@/lib/api/upstream";
import { readAccessToken } from "@/lib/auth/session-cookies";
import type { AlbumErrorCode } from "./error-codes";

/**
 * What the album route handlers share.
 *
 * Not `forwardWrite`, for two reasons found in the API rather than chosen:
 *
 * - **Some album routes answer 200 with no body on success.** Reordering and
 *   removing a photo return `void`. `forwardWrite` reads an empty body as the
 *   "record does not exist" quirk of the roles routes and reports `notFound`,
 *   so a reorder that landed would be announced as a failure. Each handler here
 *   says which of the two an empty body means for its route.
 * - **Albums refuse with a status the shared classifier folds away.** The
 *   affiliation rules answer 422, which `classifyWriteFailure` turns into a
 *   502 "service unavailable" — the one sentence that would send the editor to
 *   wait for a server rather than fix a field. The two 409s mean different
 *   things on different album routes, so each gets its own name here.
 */

export type FailureContext = "write" | "create" | "order";

export const classifyAlbumFailure = (
  error: unknown,
  context: FailureContext,
): { status: number; code: string } => {
  if (error instanceof UpstreamError) {
    const own = (code: AlbumErrorCode, status: number) => ({ status, code });
    if (error.status === 422) return own("affiliationIncoherent", 422);
    if (error.status === 409 && context === "order") return own("photoOrderStale", 409);
    if (error.status === 409 && context === "create") return own("albumSlugTaken", 409);
  }
  return classifyWriteFailure(error);
};

export const readToken = async (): Promise<string | null> => {
  const store = await cookies();
  return readAccessToken((name) => store.get(name)?.value) ?? null;
};

export const sessionExpired = () => NextResponse.json({ code: "sessionExpired" }, { status: 401 });

/**
 * One upstream call, answered to the browser.
 *
 * `empty` says what a 200 with no body means on this route: `"ok"` for the
 * routes that return nothing, `"notFound"` for the ones that return the album
 * and answer null when there is none.
 */
export const forwardAlbum = async (
  path: string,
  init: { method: "PATCH" | "DELETE"; body?: unknown },
  options: { empty: "ok" | "notFound"; context?: FailureContext },
): Promise<NextResponse> => {
  const accessToken = await readToken();
  if (!accessToken) return sessionExpired();

  try {
    const result = await callUpstream<unknown>(path, { ...init, accessToken });
    if (result === null && options.empty === "notFound") {
      return NextResponse.json({ code: "notFound" }, { status: 404 });
    }
    return NextResponse.json(result ?? {});
  } catch (error) {
    const { status, code } = classifyAlbumFailure(error, options.context ?? "write");
    return NextResponse.json({ code }, { status });
  }
};

/**
 * Writes an album, then publishes it and makes it the featured album when the
 * editor asked for either — in that order, on the server, as one request from
 * the browser.
 *
 * Publish before feature: the gallery leads with its featured album, and a
 * featured draft is a lead slot the public site cannot fill.
 *
 * When a later step is refused, the album is still saved. The answer says so
 * (`saved: true` with the id) rather than undoing the write: deleting a record
 * to make a failure atomic throws away what the editor typed, and the
 * remaining step is one press to repeat.
 */
export const writeAlbumChain = async ({
  write,
  publish,
  feature,
  context,
}: {
  write: { path: string; method: "POST" | "PATCH"; body: unknown };
  publish: boolean;
  feature: boolean;
  context: FailureContext;
}): Promise<NextResponse> => {
  const accessToken = await readToken();
  if (!accessToken) return sessionExpired();

  let saved: { id?: unknown; _id?: unknown } | null;
  try {
    saved = await callUpstream<{ id?: unknown; _id?: unknown } | null>(write.path, {
      method: write.method,
      body: write.body,
      accessToken,
    });
  } catch (error) {
    const { status, code } = classifyAlbumFailure(error, context);
    return NextResponse.json({ code }, { status });
  }

  const rawId = saved?.id ?? saved?._id;
  const id = typeof rawId === "string" ? rawId : null;
  if (!id) {
    // The API answers null for a PATCH on an album that no longer exists.
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }

  const steps = [
    ...(publish ? [`/albums/${id}/publish`] : []),
    ...(feature ? [`/albums/${id}/featured`] : []),
  ];

  let latest: unknown = saved;
  for (const step of steps) {
    try {
      latest = (await callUpstream<unknown>(step, { method: "PATCH", accessToken })) ?? latest;
    } catch (error) {
      const { status, code } = classifyAlbumFailure(error, "write");
      return NextResponse.json({ code, saved: true, id }, { status });
    }
  }

  return NextResponse.json({ ...(typeof latest === "object" && latest !== null ? latest : {}), id });
};

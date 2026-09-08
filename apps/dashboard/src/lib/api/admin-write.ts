import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callUpstream, UpstreamError } from "./upstream";
import { readAccessToken } from "../auth/session-cookies";

/**
 * The one place the administration screens write through.
 *
 * Every write is a route handler, not a browser fetch: the access token is
 * httpOnly and the API has no CORS, so the browser could not call it even if
 * we wanted it to (owner decision D1). This module holds the parts every one
 * of those handlers repeats — reading the token, forwarding, and turning the
 * API's answer into something the screen can act on.
 *
 * ## Why the error mapping is this specific
 *
 * `PermissionsGuard` and `RolesService`/`UsersController` all answer 403, for
 * four different reasons. Collapsing them into one "forbidden" would leave the
 * administrator staring at a refusal with no idea whether they lack a
 * permission, touched a system role, tried to grant something they do not
 * hold, or edited their own account.
 *
 * They are told apart by the `code` the API stamps on every error body, not
 * by the sentence beside it. Until 2026-09-08 this matched fragments of the
 * English message, and that contract had already broken silently: the refusal
 * on `PATCH /users/:id/status` is worded unlike the self role-assignment one,
 * matched nothing, and reported to the administrator as a missing permission
 * — which no permission would have fixed.
 *
 * An unknown or absent code degrades to the status default — less
 * information, never wrong information.
 */

/**
 * Everything an administration write can fail with, as a runtime list so the
 * copy catalogues can be checked against it (`write-error-copy.spec.ts`).
 * A code with no copy renders as its own key on the screen of the person who
 * just lost their work, and nothing fails until that moment.
 */
export const WRITE_ERROR_CODES = [
  /** The access token was rejected. The write did not happen and will not
   *  happen until the person signs in again. */
  "sessionExpired",
  "forbidden",
  "systemRole",
  "ungrantablePermission",
  "selfAssignment",
  /** The submitted permission set is not a coherent role: it may change a
   *  resource it cannot read. Not an authorization failure — the actor may
   *  hold the missing read — so it is a 400, and the body names the exact
   *  pairs that would fix it. */
  "impliedReadMissing",
  "invalidRequest",
  "notFound",
  "conflict",
  "tooManyRequests",
  "serviceUnavailable",
] as const;

export type WriteErrorCode = (typeof WRITE_ERROR_CODES)[number];

/** The API returns 200 with an empty body instead of 404 on four routes
 *  (PATCH roles/:id/name, PATCH roles/:id/permissions, DELETE roles/:id,
 *  PATCH users/:id/roles). A caller that treated that as success would tell
 *  the user a change landed on a record that does not exist. */
export class MissingRecordError extends Error {}

export async function forwardWrite(
  path: string,
  // PUT is here for the singleton content pages: there is exactly one
  // row of each, it may not exist yet, and the API upserts it.
  init: { method: "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown },
): Promise<NextResponse> {
  const store = await cookies();
  const accessToken = readAccessToken((name) => store.get(name)?.value);
  if (!accessToken) {
    return NextResponse.json({ code: "sessionExpired" }, { status: 401 });
  }

  try {
    const result = await callUpstream<unknown>(path, { ...init, accessToken });
    if (result === null || result === undefined) {
      throw new MissingRecordError(path);
    }
    return NextResponse.json(result);
  } catch (error) {
    const { status, code } = classifyWriteFailure(error);
    return NextResponse.json({ code }, { status });
  }
}

export function classifyWriteFailure(error: unknown): { status: number; code: WriteErrorCode } {
  if (error instanceof MissingRecordError) {
    return { status: 404, code: "notFound" };
  }

  if (!(error instanceof UpstreamError)) {
    return { status: 502, code: "serviceUnavailable" };
  }

  const status = STATUS_PASSTHROUGH.has(error.status) ? error.status : 502;
  return { status, code: FROM_API_CODE[error.apiCode ?? ""] ?? fallbackFor(status) };
}

/** Statuses the browser is told verbatim. Anything else — a 500, a 502 from a
 *  proxy, an unmapped 4xx — becomes a 502: the screen's only useful reaction
 *  to all of them is the same. */
const STATUS_PASSTHROUGH = new Set([400, 401, 403, 404, 409, 429]);

/** The API's vocabulary (api/src/common/errors/api-error-code.ts) translated
 *  into this app's. Kept as an explicit map rather than a pass-through so a
 *  code added upstream cannot reach a screen that has no copy for it. */
const FROM_API_CODE: Record<string, WriteErrorCode> = {
  badRequest: "invalidRequest",
  unauthorized: "sessionExpired",
  forbidden: "forbidden",
  notFound: "notFound",
  conflict: "conflict",
  tooManyRequests: "tooManyRequests",
  internalError: "serviceUnavailable",
  systemRole: "systemRole",
  ungrantablePermission: "ungrantablePermission",
  selfAssignment: "selfAssignment",
  impliedReadMissing: "impliedReadMissing",
};

function fallbackFor(status: number): WriteErrorCode {
  switch (status) {
    case 400:
      return "invalidRequest";
    case 401:
      // Conclusive on its own: nothing else answers 401 to a request that
      // carried a bearer token, so the code is not needed to be sure.
      return "sessionExpired";
    case 403:
      return "forbidden";
    case 404:
      // Real now. Until the API's four empty-200 routes were fixed on
      // 2026-09-08 a missing record came back as a success with no body,
      // which MissingRecordError above still catches for any route that
      // regresses.
      return "notFound";
    case 409:
      // A taken email. `UsersService.create` catches the duplicate key and
      // the global filter is the net behind it, so this is the API's own
      // answer — it used to arrive as a bare 500 and had to be inferred.
      return "conflict";
    case 429:
      return "tooManyRequests";
    default:
      return "serviceUnavailable";
  }
}

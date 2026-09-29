import { NextResponse } from "next/server";
import { forwardRead } from "@/lib/api/admin-write";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson } from "@/lib/admin/hero-requests";
import { readPatchSeason } from "@/lib/admin/seasons/requests";
import { forwardSeason } from "@/lib/admin/seasons/route-support";

type Context = { params: Promise<{ id: string }> };

/** A malformed id names nothing. Sent upstream it is a cast failure, which
 *  would read as the service being down. */
const notFound = () => NextResponse.json({ code: "notFound" }, { status: 404 });

export const GET = async (_request: Request, { params }: Context) => {
  const { id } = await params;
  return isMongoId(id) ? forwardRead(`/seasons/${id}`) : notFound();
};

/** Saves a season's fields. Its address is not in the body: `UpdateSeasonDto`
 *  omits it. */
export const PATCH = async (request: Request, { params }: Context) => {
  const { id } = await params;
  if (!isMongoId(id)) return notFound();
  const parsed = readPatchSeason(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardSeason(`/seasons/${id}`, { method: "PATCH", body: parsed.body }, "write");
};

/** Archives the season (a soft delete upstream). Refused while an album or
 *  video falls inside its range, answered as `seasonHasContent`. */
export const DELETE = async (_request: Request, { params }: Context) => {
  const { id } = await params;
  return isMongoId(id) ? forwardSeason(`/seasons/${id}`, { method: "DELETE" }, "delete") : notFound();
};

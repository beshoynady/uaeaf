import { NextResponse } from "next/server";
import { forwardRead } from "@/lib/api/admin-write";
import { editorialRevisionsPath, findEditorialEntity } from "@/lib/admin/editorial-entities";

/** The upstream default, restated here so a caller that asks for nothing gets
 *  the same bounded page the API would have given it. */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

/**
 * One page of a record's version history.
 *
 * `page` and `limit` are parsed rather than forwarded: a query string reaches
 * this handler as text, and passing it on untouched would let the browser
 * choose how much of the history one request costs the API. The upstream
 * validator would refuse an absurd `limit` anyway — this refuses it a round
 * trip earlier, and refuses `page=abc` by falling back rather than by error,
 * since a malformed page number is a caller bug, not a reader's problem.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityType: string; id: string }> },
) {
  const { entityType, id } = await params;

  const entity = findEditorialEntity(entityType);
  if (!entity) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }

  const query = new URL(request.url).searchParams;
  const page = bounded(query.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = bounded(query.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);

  return forwardRead(editorialRevisionsPath(entity, id, page, limit));
}

function bounded(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

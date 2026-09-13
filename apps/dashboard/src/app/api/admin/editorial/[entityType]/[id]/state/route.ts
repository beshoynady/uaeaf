import { NextResponse } from "next/server";
import { forwardRead } from "@/lib/api/admin-write";
import { editorialStatePath, findEditorialEntity } from "@/lib/admin/editorial-entities";

/**
 * The status panel's own read.
 *
 * The page already renders this state on the server for the first paint. This
 * handler exists for everything after it: the explicit refresh button, and
 * the re-read after every decision — the two moments requirement 7 names,
 * and the reason the panel needs no polling to stay honest.
 *
 * `entityType` is resolved against the registry before anything is fetched,
 * which is the same boundary the write handlers beside it have. A read is not
 * a lesser case: `/api/admin/editorial/users/<id>/state` forwarding to the
 * users module would disclose a record this screen has no business reading.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityType: string; id: string }> },
) {
  const { entityType, id } = await params;

  const entity = findEditorialEntity(entityType);
  if (!entity) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }

  return forwardRead(editorialStatePath(entity, id));
}

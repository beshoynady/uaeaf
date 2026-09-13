import { NextResponse } from "next/server";
import { forwardRead } from "@/lib/api/admin-write";
import { editorialRevisionPath, findEditorialEntity } from "@/lib/admin/editorial-entities";

/**
 * One version's content.
 *
 * The record's own segments are not sent upstream — `GET /revisions/:id` takes
 * the revision alone — but they stay in this path so the version reads sit
 * with the rest of a record's editorial routes rather than in a family of one.
 * The registry lookup is still the boundary it is everywhere else here: an
 * entity type this screen may not address is refused before anything is read.
 *
 * Which record a revision belongs to is settled upstream, not here:
 * `PublishingService.readRevision` checks the caller holds Read on the
 * revision's *own* entity type, so a well-formed id for someone else's content
 * is refused there rather than trusted because this path looked plausible.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityType: string; revisionId: string }> },
) {
  const { entityType, revisionId } = await params;

  const entity = findEditorialEntity(entityType);
  if (!entity) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }

  return forwardRead(editorialRevisionPath(revisionId));
}

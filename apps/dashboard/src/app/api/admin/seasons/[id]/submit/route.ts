import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { forwardSeason } from "@/lib/admin/seasons/route-support";

/**
 * Sends the saved season for approval, when the type's policy requires one.
 *
 * Upstream this is `PublishingService.submit`, behind `seasons:Update`: it
 * resolves the policy's own workflow definition and freezes the saved record
 * into a revision, so nothing about the review is chosen here and no body is
 * sent. Its refusals — no approval required, a review already running, the
 * banner still missing — reach the screen under the season's own names.
 */
export const POST = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardSeason(`/seasons/${id}/submit`, { method: "POST" }, "submit");
};

import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { forwardSeason } from "@/lib/admin/seasons/route-support";

/**
 * Puts a season whose review is approved live.
 *
 * Upstream this is `PublishingService.publishApproved`, behind
 * `seasons:Publish`: it finds the approval standing under the policy's own
 * workflow and publishes the revision that was approved, so nothing is chosen
 * here and no body is sent. The screen offers it only when the editorial
 * state reports it; a refusal (no approval standing, the banner missing)
 * still reaches the screen by name.
 */
export const POST = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardSeason(`/seasons/${id}/publish-approved`, { method: "POST" }, "publishApproved");
};

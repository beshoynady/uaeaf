import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson } from "@/lib/admin/hero-requests";
import { readPublishSeason } from "@/lib/admin/seasons/requests";
import { forwardSeason } from "@/lib/admin/seasons/route-support";

/**
 * Publishes the version of the season the editor read.
 *
 * Upstream this is `PublishingService.publishDirect`: behind `seasons:Publish`
 * and the type's approval policy, refused as `workflowRequired` when the
 * policy asks for a review (answered here as `seasonNeedsReview`) and as
 * `staleRecord` when the season changed after `expectedUpdatedAt` — each
 * reaches the screen under its own name.
 */
export const PATCH = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  const parsed = readPublishSeason(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardSeason(`/seasons/${id}/publish`, { method: "PATCH", body: parsed.body }, "publish");
};

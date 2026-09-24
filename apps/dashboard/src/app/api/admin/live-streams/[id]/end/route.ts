import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { isMongoId } from "@/lib/admin/request-shapes";

/**
 * Takes the broadcast off the public site now.
 *
 * Its own route rather than a field on the PATCH above: this is the one
 * action here with an immediate effect on every visitor, and it must not be
 * reachable by accident from a form that was only fixing a typo in the title.
 */
export const POST = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardWrite(`/live-streams/${id}/end`, { method: "POST" });
};

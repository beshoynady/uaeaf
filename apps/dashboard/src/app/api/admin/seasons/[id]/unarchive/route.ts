import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { forwardSeason } from "@/lib/admin/seasons/route-support";

/** Brings back an archived season — `seasons:Restore` upstream. Its own
 *  segment rather than `:id/restore`, which is the revision restore
 *  (ADR-0120). */
export const POST = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardSeason(`/seasons/${id}/unarchive`, { method: "POST" }, "action");
};

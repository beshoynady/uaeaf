import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { forwardSeason } from "@/lib/admin/seasons/route-support";

/** Makes this the current season. The API clears the previous holder in the
 *  same transaction, which is why there is no "unset" route to forward. */
export const PATCH = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardSeason(`/seasons/${id}/set-current`, { method: "PATCH" }, "action");
};

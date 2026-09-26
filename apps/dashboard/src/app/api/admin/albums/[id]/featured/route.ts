import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { forwardAlbum } from "@/lib/admin/albums/route-support";

/** Makes this the featured album. The API clears the previous holder in the
 *  same call, which is why there is no "unfeature" route to forward. */
export const PATCH = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardAlbum(`/albums/${id}/featured`, { method: "PATCH" }, { empty: "notFound" });
};

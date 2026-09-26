import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { forwardAlbum } from "@/lib/admin/albums/route-support";

/** Archives one photo of the album. When it was the cover the API promotes the
 *  next photo itself; the screen re-reads the album afterwards to show it. */
export const DELETE = async (
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) => {
  const { id, photoId } = await params;
  if (!isMongoId(id) || !isMongoId(photoId)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardAlbum(`/albums/${id}/photos/${photoId}`, { method: "DELETE" }, { empty: "ok" });
};

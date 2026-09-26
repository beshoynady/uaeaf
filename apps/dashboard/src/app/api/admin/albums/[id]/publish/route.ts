import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { forwardAlbum } from "@/lib/admin/albums/route-support";

/** Publishes one album from the list, without opening it. Behind
 *  `albums:Publish` upstream; the list offers it only to holders. */
export const PATCH = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardAlbum(`/albums/${id}/publish`, { method: "PATCH" }, { empty: "notFound" });
};

import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson } from "@/lib/admin/hero-requests";
import { readCover } from "@/lib/admin/albums/requests";
import { forwardAlbum } from "@/lib/admin/albums/route-support";

/** Makes one of the album's own photos its cover. */
export const PATCH = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  const parsed = readCover(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardAlbum(`/albums/${id}/cover`, { method: "PATCH", body: parsed.body }, { empty: "notFound" });
};

import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson } from "@/lib/admin/hero-requests";
import { readPatchAlbum } from "@/lib/admin/albums/requests";
import { forwardAlbum, writeAlbumChain } from "@/lib/admin/albums/route-support";

type Context = { params: Promise<{ id: string }> };

/** Saves an album's fields, then publishes and features it if asked. Its
 *  address and its state are not in the body: `UpdateAlbumDto` omits both. */
export const PATCH = async (request: Request, { params }: Context) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  const parsed = readPatchAlbum(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return writeAlbumChain({
    write: { path: `/albums/${id}`, method: "PATCH", body: parsed.body.album },
    publish: parsed.body.publish,
    feature: parsed.body.feature,
    context: "write",
  });
};

/** Archives the album (a soft delete upstream). The API answers the archived
 *  document, or nothing when the id named no album. */
export const DELETE = async (_request: Request, { params }: Context) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardAlbum(`/albums/${id}`, { method: "DELETE" }, { empty: "notFound" });
};

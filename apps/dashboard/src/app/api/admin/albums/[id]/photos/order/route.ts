import { NextResponse } from "next/server";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson } from "@/lib/admin/hero-requests";
import { readPhotoOrder } from "@/lib/admin/albums/requests";
import { forwardAlbum } from "@/lib/admin/albums/route-support";

/**
 * Rewrites the order of every photo in the album.
 *
 * The API answers 200 with no body when it lands, and 409 when the ids are not
 * the album's photos exactly once — a photo added or removed under the editor.
 * That 409 reaches the screen as `photoOrderStale`, whose words tell the
 * editor to reload rather than that something "conflicts".
 */
export const PATCH = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  const parsed = readPhotoOrder(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardAlbum(
    `/albums/${id}/photos/order`,
    { method: "PATCH", body: parsed.body },
    { empty: "ok", context: "order" },
  );
};

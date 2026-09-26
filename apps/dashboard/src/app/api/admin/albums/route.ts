import { NextResponse } from "next/server";
import { readJson } from "@/lib/admin/hero-requests";
import { readCreateAlbum } from "@/lib/admin/albums/requests";
import { writeAlbumChain } from "@/lib/admin/albums/route-support";

/**
 * Creates an album, then publishes and features it if the editor asked.
 *
 * The API creates every album as `Draft` or `Archived`; `Published` is only
 * reachable through `PATCH /albums/:id/publish`, behind its own permission. So
 * "publish" here is a create followed by that call — made on the server, as
 * the video create does it, so the form cannot forget the second request and
 * report success over an album nobody can see.
 */
export const POST = async (request: Request) => {
  const parsed = readCreateAlbum(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return writeAlbumChain({
    write: { path: "/albums", method: "POST", body: parsed.body.album },
    publish: parsed.body.publish,
    feature: parsed.body.feature,
    context: "create",
  });
};

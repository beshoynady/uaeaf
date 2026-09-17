import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson, readSectionSettings } from "@/lib/admin/hero-requests";

/**
 * Saves a page section's settings: for the homepage hero, the next-event bar
 * and the playback. Only `configuration` is forwarded; a section's place, type
 * and visibility are not this screen's to change.
 */
export const PATCH = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  const parsed = readSectionSettings(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite(`/page-sections/${id}`, { method: "PATCH", body: parsed.body });
};

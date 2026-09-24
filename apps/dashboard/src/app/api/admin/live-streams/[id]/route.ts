import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson } from "@/lib/admin/hero-requests";
import { readLiveStreamPatch } from "@/lib/admin/videos/requests";

/** Corrects a running broadcast's title, venue or end time. */
export const PATCH = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  const parsed = readLiveStreamPatch(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite(`/live-streams/${id}`, { method: "PATCH", body: parsed.body });
};

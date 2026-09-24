import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson } from "@/lib/admin/hero-requests";
import { readVideoPatch } from "@/lib/admin/videos/requests";

/** Edits a video's title, category, status or publish date. Its URL, platform
 *  and external id are what the resolver found and are not editable — a
 *  different link is a different video. */
export const PATCH = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  const parsed = readVideoPatch(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite(`/videos/${id}`, { method: "PATCH", body: parsed.body });
};

export const DELETE = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardWrite(`/videos/${id}`, { method: "DELETE" });
};

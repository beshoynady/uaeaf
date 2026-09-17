import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson, readUpdateSlide } from "@/lib/admin/hero-requests";

/**
 * Edits or deletes one homepage hero slide.
 *
 * The id is checked to be an id before it is placed in the upstream path: the
 * caller never chooses which route a body is forwarded to.
 */
export const PATCH = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  const parsed = readUpdateSlide(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite(`/hero-slides/${id}`, { method: "PATCH", body: parsed.body });
};

export const DELETE = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  return forwardWrite(`/hero-slides/${id}`, { method: "DELETE" });
};

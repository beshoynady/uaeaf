import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson } from "@/lib/admin/hero-requests";
import { readStatusBody } from "@/lib/admin/contact-messages";

/**
 * Moves one contact message to another status.
 *
 * The id is checked to be an id before it is placed in the upstream path, and
 * the body is rebuilt from the status alone: this route cannot carry a reply.
 */
export const PATCH = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isMongoId(id)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }
  const body = readStatusBody(await readJson(request));
  if (!body) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite(`/contact-messages/${id}/status`, { method: "PATCH", body });
};

import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { readCreateSlide, readJson } from "@/lib/admin/hero-requests";

/**
 * Creates one homepage hero slide. The body is narrowed to a slide's own
 * fields (`hero-requests.ts`); visibility, completeness and limits are the
 * API's to judge, and its refusal comes back with the field it names.
 */
export const POST = async (request: Request) => {
  const parsed = readCreateSlide(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite("/hero-slides", { method: "POST", body: parsed.body });
};

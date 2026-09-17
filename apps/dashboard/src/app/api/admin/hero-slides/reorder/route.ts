import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { readJson, readReorder } from "@/lib/admin/hero-requests";

/**
 * Writes a hero section's whole slide order at once. The API refuses a list
 * that is not exactly the section's slides, so an order computed against a list
 * that has since changed cannot land half applied.
 */
export const PATCH = async (request: Request) => {
  const parsed = readReorder(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite("/hero-slides/reorder", { method: "PATCH", body: parsed.body });
};

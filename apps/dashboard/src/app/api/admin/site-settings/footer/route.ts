import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { readJson } from "@/lib/admin/hero-requests";
import { readFooterBody } from "@/lib/admin/footer-settings";

/** The footer's own words (ADR-0092 D12), written whole. */
export const PUT = async (request: Request) => {
  const parsed = readFooterBody(await readJson(request));
  if (!parsed.ok) return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  return forwardWrite("/site-settings/footer", { method: "PUT", body: parsed.body });
};

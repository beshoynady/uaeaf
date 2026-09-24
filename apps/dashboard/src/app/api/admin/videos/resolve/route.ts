import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { readJson } from "@/lib/admin/hero-requests";
import { readResolveBody } from "@/lib/admin/videos/requests";

/**
 * Asks the API what a pasted link is.
 *
 * A POST rather than a GET because it is not a read: the API opens an outbound
 * request on the caller's input, which is why it is gated on `videos:Create`
 * upstream rather than on read. Nothing here inspects the URL — the allowlist
 * that decides which hosts may be contacted lives in one place, in the API.
 */
export const POST = async (request: Request) => {
  const parsed = readResolveBody(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite("/videos/resolve", { method: "POST", body: parsed.body });
};

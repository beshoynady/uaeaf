import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { readJson } from "@/lib/admin/hero-requests";
import { readLiveStreamBody } from "@/lib/admin/videos/requests";

/** Puts a broadcast on the public site. Starting one ends whichever was
 *  running — the API enforces that, not this handler. */
export const POST = async (request: Request) => {
  const parsed = readLiveStreamBody(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite("/live-streams", { method: "POST", body: parsed.body });
};

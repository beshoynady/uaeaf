import { NextResponse } from "next/server";
import { forwardRead } from "@/lib/api/admin-write";
import { readJson } from "@/lib/admin/hero-requests";
import { readCreateSeason } from "@/lib/admin/seasons/requests";
import { forwardSeason } from "@/lib/admin/seasons/route-support";

/** Every live season, most recently started first — `seasons:Read` upstream. */
export const GET = async () => forwardRead("/seasons");

/**
 * Creates a season, as a draft.
 *
 * Only a create: publishing is `PATCH :id/publish`, which needs the version
 * the editor is looking at and runs the type's approval policy, so it is the
 * editor's own second step rather than something chained here.
 */
export const POST = async (request: Request) => {
  const parsed = readCreateSeason(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardSeason("/seasons", { method: "POST", body: parsed.body }, "create");
};

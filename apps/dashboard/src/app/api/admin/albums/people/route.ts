import { NextResponse } from "next/server";
import { readPeople, searchPeople } from "@/lib/admin/albums/people";
import { readToken, sessionExpired } from "@/lib/admin/albums/route-support";

/**
 * Searches athletes or clubs for the album form's pickers.
 *
 * The browser cannot reach the API (no CORS, httpOnly token), and the two
 * public lists take no search term, so the matching happens here. Signed-in
 * only, although the lists themselves are public: this is a dashboard route,
 * and an open search endpoint on it would be one nobody meant to publish.
 */
export const GET = async (request: Request) => {
  if (!(await readToken())) return sessionExpired();

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const term = (url.searchParams.get("q") ?? "").slice(0, 80);
  if (kind !== "athletes" && kind !== "clubs") {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  return NextResponse.json({ items: searchPeople(await readPeople(kind), term) });
};

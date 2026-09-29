import { NextResponse } from "next/server";

/**
 * Same-origin relay for site search (`GET /search/public` upstream,
 * `@Public()`, rate-limited 60/60s there).
 *
 * The dialog's `fetch` cannot reach the API's own origin directly, the same
 * reason `/api/contact` exists: a public GET without a CORS grant, and an API
 * origin this relay keeps off the wire to every visitor. Query params are
 * forwarded by name rather than spread, so a caller cannot smuggle an
 * unrelated one through.
 */

const API_URL = process.env.UAEAF_API_URL ?? "http://localhost:3000";
const TIMEOUT_MS = 4000;
const FORWARDED_PARAMS = ["q", "locale", "types", "limit"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const upstream = new URL(`${API_URL}/api/v1/search/public`);
  for (const key of FORWARDED_PARAMS) {
    const value = searchParams.get(key);
    if (value !== null) upstream.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  // Carries the browser's own cancellation (a superseded keystroke aborting
  // its `fetch`) into the upstream request too, not only this relay's timeout.
  request.signal.addEventListener("abort", () => controller.abort());

  try {
    const response = await fetch(upstream, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ ok: false }, { status: response.status });

    const body = await response.json();
    return NextResponse.json(body);
  } catch {
    // Network refused, DNS failure, timeout, malformed JSON, or the request
    // above being aborted. All read the same to the dialog: search failed.
    return NextResponse.json({ ok: false }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

import { NextResponse } from "next/server";

/**
 * Same-origin relay for the public contact form.
 *
 * `POST /api/v1/contact-messages` upstream is `@Public()` — it is the one
 * unauthenticated write on the platform — but the browser must not call it
 * directly: that would require a CORS grant on exactly that route and would
 * publish the API's origin to every visitor. The form posts here instead and
 * this runs server-side.
 *
 * The body is forwarded as received. Validation belongs upstream, where the
 * closed `messageType` vocabulary and every length bound already live; a
 * second copy of those rules here would be a second place for them to drift.
 * What this does own is the shape of what comes back: the caller learns
 * whether the message was accepted and nothing else, so an upstream error
 * message can never be reflected to an anonymous submitter.
 */

const API_URL = process.env.UAEAF_API_URL ?? "http://localhost:3000";
const TIMEOUT_MS = 8000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/api/v1/contact-messages`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    // 4xx is the submitter's problem and 5xx is ours, but the distinction the
    // form needs is only "accepted or not" — it retries neither.
    return NextResponse.json({ ok: response.ok }, { status: response.ok ? 202 : 400 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

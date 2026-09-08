import { NextResponse } from "next/server";
import { requestPasswordReset, translateResetRequestFailure } from "@/lib/auth/password-reset";
import { isAppLocale, routing } from "@/i18n/routing";

/**
 * Starts password recovery.
 *
 * Answers 202 for every address the upstream accepts — registered or not.
 * The screen behind this shows the same "check your inbox" panel either
 * way, which is what stops the form from becoming a directory of who holds
 * a federation account. Uniformity upstream is the API's responsibility
 * (see lib/auth/password-reset.ts); this handler simply never adds a
 * distinction of its own.
 *
 * ⚠ `POST /auth/forgot-password` does not exist on the API yet. Until it
 * does, every request here returns 502 `serviceUnavailable` — deliberately,
 * rather than a confirmation for a mail that was never sent.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidEmail" }, { status: 400 });
  }

  const { email, locale } = (body ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || email.trim().length === 0) {
    return NextResponse.json({ code: "invalidEmail" }, { status: 400 });
  }

  const requestLocale = isAppLocale(locale) ? locale : routing.defaultLocale;

  try {
    await requestPasswordReset(email.trim(), requestLocale);
    return new NextResponse(null, { status: 202 });
  } catch (error) {
    const { status, code, retryAfterSeconds } = translateResetRequestFailure(error);
    return NextResponse.json(
      { code, retryAfterSeconds },
      {
        status,
        headers: retryAfterSeconds === null ? undefined : { "retry-after": String(retryAfterSeconds) },
      },
    );
  }
}

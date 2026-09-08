import { NextResponse } from "next/server";
import { performLogin, translateLoginFailure } from "@/lib/auth/login";
import {
  LOCALE_COOKIE,
  THEME_COOKIE,
  isProductionRuntime,
  preferenceCookieOptions,
} from "@/lib/auth/cookies";
import { writeSessionTokens } from "@/lib/auth/session-cookies";
import { isAppLocale, routing } from "@/i18n/routing";

/**
 * The BFF login endpoint (owner decision D1, 2026-09-07).
 *
 * The tokens are set as httpOnly cookies and are deliberately NOT in the
 * response body: the browser must have no way to read them, or the whole
 * reason for routing through here instead of enabling CORS disappears.
 * What the body does carry is where to go next — the user's own
 * `preferredLanguage`/`preferredTheme`, read at login so a returning
 * administrator lands in their own language on the first paint.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidCredentials" }, { status: 401 });
  }

  const { email, password, locale } = (body ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ code: "invalidCredentials" }, { status: 401 });
  }

  const requestLocale = isAppLocale(locale) ? locale : routing.defaultLocale;

  try {
    const outcome = await performLogin({ email, password }, requestLocale);

    const response = NextResponse.json({ locale: outcome.locale, theme: outcome.theme });
    const preferenceOptions = preferenceCookieOptions(isProductionRuntime());

    // Chunked: a Super Admin's token is ~11 KB and a single cookie cannot
    // exceed 4 KB — see lib/auth/cookie-chunks.ts for why that is silent.
    writeSessionTokens(response.cookies, outcome.tokens);
    response.cookies.set(LOCALE_COOKIE, outcome.locale, preferenceOptions);
    if (outcome.theme) {
      response.cookies.set(THEME_COOKIE, outcome.theme, preferenceOptions);
    } else {
      // No stored preference means "follow the OS" — clearing any cookie
      // left by a previous user on this machine is what makes that true.
      response.cookies.delete(THEME_COOKIE);
    }

    return response;
  } catch (error) {
    const { status, code, retryAfterSeconds } = translateLoginFailure(error);
    // The wait is echoed in both places on purpose: the body is what the
    // form reads to run its countdown, and the header is what any other
    // client (or a proxy) would honour without knowing this app's shape.
    return NextResponse.json(
      { code, retryAfterSeconds },
      {
        status,
        headers: retryAfterSeconds === null ? undefined : { "retry-after": String(retryAfterSeconds) },
      },
    );
  }
}

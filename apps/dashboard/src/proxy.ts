import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing, isAppLocale, type AppLocale } from "./i18n/routing";
import {
  clearSessionTokens,
  readAccessToken,
  readRefreshToken,
  writeSessionTokens,
} from "./lib/auth/session-cookies";
import { decodeAccessToken, isAccessTokenUsable } from "./lib/auth/token";
import { classifyRoute, decideSessionAction } from "./lib/auth/session-policy";
import { refreshSession } from "./lib/auth/refresh";

/**
 * Next.js 16 renamed the middleware convention: the file is `proxy.ts` and
 * the exported function must be named `proxy` (same as apps/web/src/proxy.ts).
 *
 * Two jobs, in order: next-intl's locale routing, then the session gate.
 *
 * The session gate decides where the *browser* is sent. It is not the
 * authorization boundary — Next's own docs warn that a matcher change can
 * silently remove proxy coverage — so every screen still fetches through
 * the API with a Bearer token, and PermissionsGuard remains the only thing
 * that actually grants or refuses anything.
 */
const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = localeFromPathname(pathname);

  // No locale prefix yet (e.g. a bare "/"): let next-intl redirect first.
  // The gate then runs on the next pass, when a locale exists to build
  // redirect URLs from.
  if (!locale) {
    return handleI18nRouting(request);
  }

  const read = (name: string) => request.cookies.get(name)?.value;
  const refreshToken = readRefreshToken(read);
  const accessToken = readAccessToken(read);

  const action = decideSessionAction({
    kind: classifyRoute(pathname),
    hasRefreshToken: Boolean(refreshToken),
    accessTokenUsable: isAccessTokenUsable(
      accessToken ? decodeAccessToken(accessToken) : null,
      Date.now(),
    ),
  });

  switch (action) {
    case "redirectLogin":
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));

    case "redirectHome":
      return NextResponse.redirect(new URL(`/${locale}`, request.url));

    case "refresh":
      return renewSession(request, locale, refreshToken as string);

    case "allow":
      return handleI18nRouting(request);
  }
}

/**
 * Rotates the token pair, then redirects to the same URL so the page renders
 * with the new cookies already in the request.
 *
 * A redirect rather than mutating the forwarded request: it is one extra
 * round trip, but it is unambiguous — the page reads exactly what the
 * browser stored, with no dependence on whether next-intl's own middleware
 * forwards a mutated request object. The loop that shape could cause is
 * closed below by verifying the *new* token is actually usable before
 * redirecting; a clock skew that made it stale on arrival would otherwise
 * refresh forever.
 */
async function renewSession(request: NextRequest, locale: AppLocale, refreshToken: string) {
  const renewed = await refreshSession(refreshToken);
  const usable =
    renewed !== null && isAccessTokenUsable(decodeAccessToken(renewed.accessToken), Date.now());

  if (!usable) {
    const response = NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    // Clearing both is what makes the failure terminal: on the next request
    // there is no refresh token, so the gate says "allow" for the login
    // route instead of trying to renew again.
    clearSessionTokens(response.cookies);
    return response;
  }

  const response = NextResponse.redirect(request.url);
  writeSessionTokens(response.cookies, renewed);
  return response;
}

function localeFromPathname(pathname: string): AppLocale | null {
  const [, first] = pathname.split("/");
  return isAppLocale(first) ? first : null;
}

export const config = {
  // Excludes /api so the BFF route handlers are never gated by the very
  // session logic they exist to establish, plus Next internals and files.
  //
  // The backslash is doubled on purpose. This is a JavaScript string, so
  // "\\." is the regex \. — a literal dot, i.e. a request for a file.
  // Written with a single backslash the parser drops it, the alternative
  // becomes .*..* ("any non-empty path"), and because that sits inside the
  // negative lookahead the matcher then excludes EVERY page.
  //
  // Found 2026-09-07 by letting a real session sit past its 15-minute
  // access-token life: the gate had never run at all, so a stale token was
  // never refreshed and the user was bounced to /login instead. Nothing
  // failed loudly — the pages still rendered, and their own
  // requireSession/fetchAsUser checks produced a redirect that looked like
  // a normal logout. apps/web/src/proxy.ts had the escape right; this file
  // did not. Covered by proxy-matcher.spec.ts.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

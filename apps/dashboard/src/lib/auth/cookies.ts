/**
 * Session cookie contract for the dashboard's BFF (owner decision D1,
 * 2026-09-07: route handlers, not CORS).
 *
 * Both token cookies are `httpOnly`, which is the entire point of the BFF:
 * an admin access token carries Publish/Delete grants, and a token readable
 * by `document.cookie` is a token any injected script can exfiltrate. The
 * browser never sees these values — it sends them, the Next server reads
 * them, and only the Next server ever puts them in an Authorization header.
 */
export const ACCESS_TOKEN_COOKIE = "uaeaf_admin_at";
export const REFRESH_TOKEN_COOKIE = "uaeaf_admin_rt";

/** Deliberately readable by JavaScript, unlike the token cookies: the theme
 *  toggle updates it optimistically so the switch feels instant, and the
 *  server reads it to render `data-theme` on the first paint (Chapter 7
 *  §7.4 — theme resolution is a `data-theme` attribute). It holds a
 *  presentation preference, never an identity. */
export const THEME_COOKIE = "uaeaf_admin_theme";

/** next-intl's own locale cookie name — set at login so a returning user
 *  lands in their `preferredLanguage` without a round trip. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Matches the API's `jwt.refreshExpiry` default of 7 days. The access
 *  cookie deliberately gets the SAME lifetime rather than the access
 *  token's own ~15 minutes: an expired-but-present access cookie is what
 *  tells the proxy to refresh. If the cookie vanished with the token, every
 *  request past 15 minutes would look identical to "never signed in". */
const SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface SessionCookieOptions {
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  secure: boolean;
  path: string;
  maxAge: number;
}

/** `sameSite: "lax"` rather than "strict": the dashboard is a first-party
 *  app with no cross-site POST surface, and "strict" would drop the session
 *  on any inbound link (an email from an editor, say), logging the user out
 *  for no security gain here. */
export function sessionCookieOptions(isProduction: boolean): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  };
}

/** Same lifetime and scope, but readable by the client — see THEME_COOKIE. */
export function preferenceCookieOptions(isProduction: boolean): SessionCookieOptions {
  return { ...sessionCookieOptions(isProduction), httpOnly: false };
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

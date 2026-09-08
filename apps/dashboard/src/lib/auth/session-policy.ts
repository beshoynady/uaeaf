/**
 * The proxy's routing decision, isolated from the proxy so it can be tested
 * as a truth table instead of through a running Next.js request.
 *
 * This decides where the browser is *sent*. It is not an authorization
 * check — Next's own documentation is explicit that proxy coverage can be
 * silently removed by a matcher change, so every screen still fetches its
 * data through the API with a Bearer token and `PermissionsGuard` remains
 * the enforcement point.
 */
export type SessionAction = "allow" | "redirectLogin" | "redirectHome" | "refresh";

/**
 * Three kinds, not two, because the recovery flow needs a route that is
 * open in *both* directions:
 *
 * - `protected`      — the dashboard itself; a session is required.
 * - `signedOutOnly`  — login and "forgot password"; pointless once signed
 *                      in, so a live session is bounced home.
 * - `public`         — the reset-password screen; the token in the URL is
 *                      the user's intent and must be honoured whatever the
 *                      cookie jar says.
 */
export type RouteKind = "protected" | "signedOutOnly" | "public";

export interface SessionState {
  kind: RouteKind;
  hasRefreshToken: boolean;
  accessTokenUsable: boolean;
}

/** The locale segment is always present (`localePrefix: "always"`), so a
 *  bare `/login` never reaches here — next-intl has already redirected it.
 *  Anchored end-to-end so `/ar/login/history` stays protected. */
const ROUTE_PATTERNS: ReadonlyArray<readonly [RegExp, RouteKind]> = [
  [/^\/[^/]+\/(login|forgot-password)\/?$/, "signedOutOnly"],
  [/^\/[^/]+\/reset-password\/?$/, "public"],
];

export function classifyRoute(pathname: string): RouteKind {
  for (const [pattern, kind] of ROUTE_PATTERNS) {
    if (pattern.test(pathname)) {
      return kind;
    }
  }
  return "protected";
}

export function decideSessionAction(state: SessionState): SessionAction {
  if (state.kind === "public") {
    return "allow";
  }

  // The refresh token is what makes a session renewable, so it — not the
  // short-lived access token — is what "signed in" means here.
  if (!state.hasRefreshToken) {
    return state.kind === "protected" ? "redirectLogin" : "allow";
  }
  if (state.kind === "signedOutOnly") {
    return "redirectHome";
  }
  return state.accessTokenUsable ? "allow" : "refresh";
}

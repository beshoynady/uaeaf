/**
 * Reads the claims out of an access token WITHOUT verifying its signature.
 *
 * That is deliberate and it is safe here, because nothing in this app trusts
 * the result for authorization: the token is forwarded to the NestJS API on
 * every call and `JwtAuthGuard`/`PermissionsGuard` are the only things that
 * decide whether it is genuine. What this decode answers is narrower — "is
 * this cookie worth sending at all". Forging a token here buys an attacker a
 * dashboard shell whose every request the API rejects.
 *
 * Since the owner's 2026-09-07 token decision the payload carries `roleIds`
 * and no permissions, so this can no longer answer "what may this user do".
 * That question is answered by GET /users/me, whose `permissions` field the
 * API resolves from the database for that request — see
 * `readCurrentUser` in ./session.
 */
export interface AccessTokenClaims {
  userId: string;
  /** What the token claims the user's roles are. Enough to know a session
   *  exists; never enough to decide what it may reach. */
  roleIds: string[];
  /** `exp` as sent by the API: seconds since the epoch, not milliseconds. */
  expiresAt: number;
}

/** Refresh a little before the real expiry so a request cannot be issued with
 *  a token that dies in flight — the user would experience that as being
 *  logged out at random. */
const EXPIRY_SKEW_SECONDS = 30;

export function decodeAccessToken(token: string): AccessTokenClaims | null {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(decodeBase64Url(segments[1]));
  } catch {
    return null;
  }

  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const { sub, type, roleIds, exp } = payload as Record<string, unknown>;

  // The same access/refresh confusion the API closed server-side
  // (auth-security-audit-2026-09-05.md P1). A refresh token names no roles,
  // so silently accepting one would render a shell for an identity the API
  // refuses on every call — an auth problem wearing a permissions costume.
  if (type !== "access") {
    return null;
  }
  if (typeof sub !== "string" || sub.length === 0) {
    return null;
  }
  if (typeof exp !== "number") {
    return null;
  }
  // An access token always carries the array (possibly empty). Anything else
  // is a malformed token, not a user without roles.
  //
  // This is also the whole migration path for tokens minted before
  // 2026-09-07, which carried `permissions` instead: they fail here, the
  // proxy reads "no usable session", and /auth/refresh mints the new shape
  // from the still-valid refresh cookie. One redirect, no dual-shape code.
  if (!Array.isArray(roleIds)) {
    return null;
  }

  return {
    userId: sub,
    roleIds: roleIds as string[],
    expiresAt: exp,
  };
}

/**
 * Decodes a JWT segment without `Buffer`.
 *
 * `Buffer` is a Node global, and this module runs inside `proxy.ts` as well
 * as in server components. The proxy is bundled for a runtime where that
 * global is not guaranteed, and the failure was ugly precisely because it
 * was quiet: the missing global threw inside the `try` above, the catch read
 * it as "malformed token", and every valid session was reported as no
 * session — a login that succeeded and bounced straight back to the login
 * screen, with no error anywhere. `atob` and `TextDecoder` are standard in
 * both Node and edge runtimes, so this works wherever the module is bundled.
 */
function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  // Via TextDecoder rather than the binary string directly: JWT payloads are
  // UTF-8, and a name like "مسؤول المنصة" would otherwise decode to mojibake.
  return new TextDecoder().decode(bytes);
}

/** @param nowMs current time in milliseconds (injected so this stays pure/testable). */
export function isAccessTokenUsable(claims: AccessTokenClaims | null, nowMs: number): boolean {
  if (!claims) {
    return false;
  }
  return claims.expiresAt - EXPIRY_SKEW_SECONDS > nowMs / 1000;
}

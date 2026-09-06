import { createHash } from 'node:crypto';

/** Hashes a high-entropy token (a signed JWT, not a user-chosen secret) for
 *  storage — a fast SHA-256 digest is appropriate here, unlike bcrypt for
 *  passwords: the token's own randomness is the defense, not a slow KDF, so
 *  a fast hash keeps every refresh-token lookup cheap while still meaning a
 *  stolen DB row alone (`refreshTokenHash`) can't be replayed as a token
 *  (auth-security-audit-2026-09-05.md P0 #4 — AuthSession never stores the
 *  raw refresh token). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

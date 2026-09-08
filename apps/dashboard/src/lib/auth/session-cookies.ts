import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  isProductionRuntime,
  sessionCookieOptions,
  type SessionCookieOptions,
} from "./cookies";
import { chunkCookieValue, chunkName, readChunkedCookie, staleChunkNames } from "./cookie-chunks";

/**
 * Reading and writing the session token cookies in one place.
 *
 * Both tokens go through the chunking helpers even though only the access
 * token is ever large enough to need it: one storage format means the
 * proxy, the route handlers and the server components all read cookies the
 * same way, and a refresh token that grows later needs no second fix.
 */

/** The highest chunk index ever written. Bounds the delete loop that clears
 *  a previous, longer token's leftovers — without which an orphaned chunk
 *  would be appended to the next value and corrupt it. */
const MAX_SESSION_CHUNKS = 8;

/** The subset of Next's `ResponseCookies` / `cookies()` store this needs.
 *  Declared structurally so the same functions serve a route handler's
 *  `NextResponse.cookies` and the proxy's response cookies alike. */
export interface CookieWriter {
  set(name: string, value: string, options: SessionCookieOptions): unknown;
  delete(name: string): unknown;
}

export type CookieReader = (name: string) => string | undefined;

export function writeSessionTokens(
  writer: CookieWriter,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const options = sessionCookieOptions(isProductionRuntime());
  writeChunked(writer, ACCESS_TOKEN_COOKIE, tokens.accessToken, options);
  writeChunked(writer, REFRESH_TOKEN_COOKIE, tokens.refreshToken, options);
}

export function clearSessionTokens(writer: CookieWriter): void {
  for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]) {
    for (const stale of staleChunkNames(name, 0, MAX_SESSION_CHUNKS)) {
      writer.delete(stale);
    }
  }
}

export function readAccessToken(read: CookieReader): string | null {
  return readChunkedCookie(read, ACCESS_TOKEN_COOKIE);
}

export function readRefreshToken(read: CookieReader): string | null {
  return readChunkedCookie(read, REFRESH_TOKEN_COOKIE);
}

function writeChunked(
  writer: CookieWriter,
  name: string,
  value: string,
  options: SessionCookieOptions,
): void {
  const chunks = chunkCookieValue(value);
  chunks.forEach((chunk, index) => writer.set(chunkName(name, index), chunk, options));
  // Clears whatever a longer previous token left behind. Deleting a cookie
  // that does not exist is harmless, and this only runs on login/refresh.
  for (const stale of staleChunkNames(name, chunks.length, MAX_SESSION_CHUNKS)) {
    writer.delete(stale);
  }
}

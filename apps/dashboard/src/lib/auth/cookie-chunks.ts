/**
 * Splits an oversized cookie value across numbered cookies.
 *
 * WHY THIS EXISTS
 * The access token used to embed the user's flattened permission set
 * (BE-PLAN-010 §4.4), so it grew with the user's privileges: a Super Admin
 * holding all 164 permissions produced an 11,384-byte JWT — against a
 * 4,096-byte per-cookie limit that browsers enforce by silently DISCARDING
 * the cookie. Not an error, not a truncation: the Set-Cookie is accepted and
 * the cookie simply never appears again, which presented as "login succeeds,
 * then immediately bounces back to the login screen".
 *
 * WHY IT IS NOW DORMANT
 * The owner's 2026-09-07 decision removed the permission set from the token,
 * which now carries roleIds only — around 300 bytes, one cookie, for any
 * user. Nothing in normal operation reaches the chunking path any more.
 *
 * It is kept rather than deleted because it is the load-bearing guard for a
 * failure mode that is invisible when it happens: any future claim that
 * pushes the token past 4 KB would otherwise reproduce the same silent
 * bounce. Removing it is a separate decision, recorded as an open item.
 */

/** 4096 is the limit for the whole cookie: name, value, and attributes
 *  (`Path`, `Expires`, `Max-Age`, `HttpOnly`, `SameSite`) together. Those
 *  attributes run to roughly 100 bytes and the chunk names to ~20, so 3600
 *  leaves comfortable headroom rather than sitting on the edge of a limit
 *  whose overflow behaviour is silent. */
const MAX_CHUNK_LENGTH = 3600;

/** JWTs are base64url — ASCII only — so character length equals byte length
 *  and a naive slice cannot split a multi-byte character. */
export function chunkCookieValue(value: string, maxLength = MAX_CHUNK_LENGTH): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += maxLength) {
    chunks.push(value.slice(offset, offset + maxLength));
  }
  return chunks.length > 0 ? chunks : [""];
}

export function chunkName(name: string, index: number): string {
  return `${name}.${index}`;
}

/**
 * Reassembles a chunked value.
 *
 * Stops at the first gap and returns `null` rather than joining what it
 * found: a partially delivered cookie set yields a corrupt JWT, and the API
 * would answer 401 — indistinguishable to the user from being logged out at
 * random. Reading it as "no session" produces an honest redirect to login.
 */
export function readChunkedCookie(
  read: (name: string) => string | undefined,
  name: string,
  maxChunks = 16,
): string | null {
  const parts: string[] = [];
  for (let index = 0; index < maxChunks; index += 1) {
    const part = read(chunkName(name, index));
    if (part === undefined) {
      break;
    }
    parts.push(part);
  }

  if (parts.length === 0) {
    return null;
  }
  // A gap means chunk 0 was present but a later one was not, and the loop
  // above already stopped there. Confirm nothing sits beyond the gap, which
  // would prove the value is incomplete rather than simply shorter now.
  if (read(chunkName(name, parts.length + 1)) !== undefined) {
    return null;
  }
  return parts.join("");
}

/** The chunk cookies a previous, longer value left behind. They must be
 *  deleted explicitly: an orphaned `tok.3` would be appended to the next,
 *  shorter token and make every later request unparseable. */
export function staleChunkNames(name: string, newCount: number, previousCount: number): string[] {
  const names: string[] = [];
  for (let index = newCount; index < previousCount; index += 1) {
    names.push(chunkName(name, index));
  }
  return names;
}

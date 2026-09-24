import { parseVideoUrl } from './url-allowlist.js';
import type { ParsedVideoUrl } from './url-allowlist.js';

/**
 * Talking to the platforms, defensively.
 *
 * Every function here calls a machine nobody on this project controls, so each
 * one is written for a reply that misbehaves rather than a reply that is
 * merely wrong. Four failures are ordinary, not exotic — a slow endpoint, an
 * HTML error page served at status 200, a body that never ends, and a redirect
 * pointing somewhere internal — and all four resolve to `null`. Nothing here
 * throws: a platform having a bad afternoon is not an exception in this
 * application, it is an editor typing the title by hand instead.
 */

/** An oEmbed document is a few hundred bytes. A quarter megabyte is already
 *  three orders of magnitude of slack, and the cap is what stops a hostile or
 *  broken endpoint from streaming until this process dies. */
export const MAX_OEMBED_BYTES = 256 * 1024;

const TIMEOUT_MS = 5_000;

/** Short links only. Following redirects is a privilege, not the default:
 *  every other platform URL already names its video, so nothing else has a
 *  reason to make this server chase a `Location` header. */
const SHORT_LINK_HOSTS = new Set(['vm.tiktok.com']);

const MAX_HOPS = 3;

export interface OembedResult {
  title: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

const isRedirect = (status: number) => status >= 300 && status < 400;

const numberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * Fetch one oEmbed document, or `null`.
 *
 * `redirect: 'manual'` is the load-bearing option: left to follow, a
 * compromised endpoint could bounce this request to `169.254.169.254` and the
 * fetch would go there with no further check. Manual means a redirect is just
 * a reply with a status we decline to act on.
 */
export const fetchOembed = async (endpoint: string): Promise<OembedResult | null> => {
  try {
    const response = await fetch(endpoint, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });

    if (isRedirect(response.status) || response.status !== 200) return null;

    // Checked before the body is read: an HTML error page is the common shape
    // of a rate-limited platform, and parsing it would throw where returning
    // null is the honest answer.
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return null;

    // Refused on the DECLARED length first, so an oversized body is never
    // read at all. The previous shape called `.text()` and measured
    // afterwards, which is the check running after the cost it exists to
    // avoid had already been paid.
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_OEMBED_BYTES) return null;

    const body = await response.text();
    // BYTES, not `String.length`, which counts UTF-16 code units: a body of
    // 3-byte UTF-8 characters reaches roughly 768KB at a 256K "cap" measured
    // the other way. A chunked reply declares no length, so this is the check
    // that actually holds for one.
    if (Buffer.byteLength(body, 'utf8') > MAX_OEMBED_BYTES) return null;

    const parsed = JSON.parse(body) as Record<string, unknown>;
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    // No title means nothing to show the editor or the reader. The row would
    // have to be titled by hand anyway, so this is the fallback path, not a
    // partial success.
    if (title === '') return null;

    return {
      title,
      thumbnailUrl: typeof parsed.thumbnail_url === 'string' ? parsed.thumbnail_url : null,
      width: numberOrNull(parsed.width),
      height: numberOrNull(parsed.height),
    };
  } catch {
    // Timeout, DNS failure, socket reset, malformed JSON — the caller's
    // response to all of them is identical, so they are not told apart.
    return null;
  }
};

/**
 * Resolve a short link to the video it points at.
 *
 * The guarantee that matters: **every hop is checked by `parseVideoUrl`
 * before a socket is opened to it.** Checking only the URL the editor pasted
 * would leave the redirect chain unguarded, and a short link is precisely a
 * URL whose destination somebody else chooses.
 */
export const followShortLink = async (raw: string): Promise<ParsedVideoUrl | null> => {
  let current = raw;

  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    // The starting URL is checked too, so this never fetches a host the
    // allowlist would refuse.
    const parsed = parseVideoUrl(current);
    if (!parsed) return null;
    if (parsed.externalId !== null) return parsed;

    let host: string;
    try {
      host = new URL(current).hostname.toLowerCase();
    } catch {
      return null;
    }
    if (!SHORT_LINK_HOSTS.has(host)) return null;

    let response: Response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return null;
    }

    if (!isRedirect(response.status)) return null;

    const location = response.headers.get('location');
    if (!location) return null;

    // Relative redirects resolve against the hop we are on; an absolute one
    // replaces it. Either way the result goes back through the allowlist at
    // the top of the next iteration.
    try {
      current = new URL(location, current).toString();
    } catch {
      return null;
    }
  }

  // Out of hops: a loop, or a chain longer than any legitimate short link.
  return null;
};

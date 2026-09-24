import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from '../../media-assets/upload/upload-constraints.js';

/**
 * Fetching the picture a platform named — the second untrusted URL.
 *
 * `url-allowlist.ts` guards the link an editor typed. This one was chosen by
 * the remote oEmbed service, so it is not the editor's input at all: a
 * compromised, hijacked or merely wrong platform reply can put
 * `http://169.254.169.254/` in `thumbnail_url`, and without this guard the
 * server would fetch it from inside the network with nobody having asked.
 *
 * ── Why the bytes are copied at all ────────────────────────────────────────
 *
 * Instagram and TikTok sign their CDN URLs and expire them, usually within
 * days. Hotlinking one means every card on the site turns into a broken image
 * at a time nobody chose, so the bytes are stored in this platform's own
 * media library at the moment the video is saved.
 *
 * ── Why this matches by suffix where the other guard matches exactly ───────
 *
 * CDNs mint unpredictable subdomains — `scontent-lhr8-1.cdninstagram.com`
 * today, something else tomorrow — so there is no fixed set to compare
 * against. A suffix match is safe only when it is anchored at both ends, and
 * both anchors are doing work: without the leading dot,
 * `evil-cdninstagram.com` matches; without the end anchor,
 * `cdninstagram.com.evil.test` does. Both are domains an attacker can simply
 * register.
 */

/** The registered domains each platform serves thumbnails from. Suffix
 *  matched, dot-anchored — see the note above. */
const THUMBNAIL_DOMAINS = [
  'ytimg.com',
  'twimg.com',
  'cdninstagram.com',
  'fbcdn.net',
  'tiktokcdn.com',
  'tiktokcdn-us.com',
];

/** Literal addresses that never belong to a CDN. The suffix rule already
 *  refuses every one of them — an IP matches no domain — but they are
 *  rejected by name as well, so that a future loosening of the domain list
 *  cannot quietly re-open the door this guard exists to hold shut. */
const PRIVATE_ADDRESS =
  /^(?:localhost|\[?::1\]?|0\.0\.0\.0|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|\[?f[cd][0-9a-f]{2}:.*\]?)$/i;

const TIMEOUT_MS = 5_000;

export interface ThumbnailBytes {
  buffer: Buffer;
  mimeType: string;
}

export const isAllowedThumbnailHost = (hostname: string): boolean => {
  const host = hostname.trim().toLowerCase();
  if (host === '') return false;
  if (PRIVATE_ADDRESS.test(host)) return false;
  // A bare IPv4 literal is never a CDN hostname, and would otherwise have to
  // be excluded one range at a time.
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false;

  // A leading dot makes the label empty: '.ytimg.com'.endsWith('.ytimg.com')
  // is true, and `new URL` parses that host without complaint. Unreachable —
  // an empty DNS label resolves nowhere — but the suffix rule is supposed to
  // be anchored in both directions and this is where it was not.
  if (host.startsWith('.') || host.includes('..')) return false;

  return THUMBNAIL_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
};

/**
 * Fetch the thumbnail's bytes, or `null`.
 *
 * Never throws. A missing thumbnail is the one part of a video row that can be
 * absent without the row being useless, so every failure here — refused host,
 * unreachable CDN, wrong content type, oversized body — resolves to `null` and
 * the video saves without a picture.
 */
export const fetchThumbnailBytes = async (raw: string): Promise<ThumbnailBytes | null> => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  if (url.username !== '' || url.password !== '') return null;
  if (!isAllowedThumbnailHost(url.hostname)) return null;

  try {
    const response = await fetch(url.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // A redirect is declined rather than followed: its target is chosen by the
    // same party whose URL we are already treating as untrusted.
    if (response.status !== 200) return null;

    const mimeType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    // The upload path's own list, not `startsWith('image/')`. That prefix
    // admits `image/svg+xml`, and `upload-constraints.ts` excludes SVG by
    // explicit decision because it is a script-bearing document — one stored
    // here would be served from this platform's own origin.
    //
    // This trusts the CLAIMED type; the bytes are probed by `assertUploadable`
    // when they reach the upload path, which is where a PNG header on an HTML
    // payload is caught.
    if (!(ACCEPTED_TYPES as readonly string[]).includes(mimeType)) return null;

    const body = await response.arrayBuffer();
    // The same ceiling the upload path enforces, applied before the bytes are
    // handed to it, so an oversized thumbnail is refused here rather than
    // rejected after a round trip.
    if (body.byteLength > MAX_UPLOAD_BYTES || body.byteLength === 0) return null;

    return { buffer: Buffer.from(body), mimeType };
  } catch {
    return null;
  }
};

import type { VideoExternalPlatform, VideoKind } from '../schemas/video.schema.js';

/**
 * The allowlist a pasted link must pass before the server will touch it.
 *
 * Everything that gets through here becomes two things: a URL this server
 * fetches (oEmbed, thumbnail) and a frame a visitor's browser loads. A host
 * that slips past is therefore a request made from inside the network on
 * somebody else's instruction — server-side request forgery — and the classic
 * way in is a host that merely *looks* right. Two rules follow, and both are
 * load-bearing:
 *
 * 1. **Equality against a fixed set, never `endsWith`.** `youtube.com.evil.test`
 *    is a domain an attacker owns outright, and a suffix test that asks
 *    "does it end with youtube.com" is the check that hands it the keys. (The
 *    thumbnail guard in `thumbnail.service.ts` *does* match by suffix, for a
 *    reason written there — CDNs use unpredictable subdomains — and it is
 *    anchored differently because of it.)
 * 2. **No credentials, https only.** A browser reads everything left of `@`
 *    as userinfo and discards it, so `https://youtube.com@127.0.0.1/` is a
 *    request to loopback wearing a costume. Refusing any URL that carries a
 *    username or password removes the whole trick rather than trying to
 *    out-parse it.
 *
 * The literal private ranges (`127.*`, `10.*`, `169.254.*`, `localhost`) are
 * never reachable anyway once hosts must match the set exactly. They are in
 * the tests regardless, because this function's contract is "refuse anything
 * that is not one of these platforms" and a future edit that loosens the host
 * rule should fail loudly rather than quietly.
 */

/** Every host, mapped to its platform. The key IS the match — one entry per
 *  spelling a platform actually serves, because equality has no wildcards. */
const HOSTS: Record<string, VideoExternalPlatform> = {
  'youtube.com': 'youtube',
  'www.youtube.com': 'youtube',
  'm.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'instagram.com': 'instagram',
  'www.instagram.com': 'instagram',
  'tiktok.com': 'tiktok',
  'www.tiktok.com': 'tiktok',
  'vm.tiktok.com': 'tiktok',
  'x.com': 'x',
  'www.x.com': 'x',
  'twitter.com': 'x',
  'www.twitter.com': 'x',
  'facebook.com': 'facebook',
  'www.facebook.com': 'facebook',
};

export interface ParsedVideoUrl {
  platform: VideoExternalPlatform;
  /** `null` only for a short link, whose id is revealed by following it. */
  externalId: string | null;
  kind: VideoKind;
}

/** The path segments each platform puts a video id behind, and the shape that
 *  implies. Order matters within a platform: the first match wins. */
const YOUTUBE_PATHS: { prefix: string; kind: VideoKind }[] = [
  { prefix: 'shorts', kind: 'reel' },
  { prefix: 'live', kind: 'video' },
  { prefix: 'embed', kind: 'video' },
];

const INSTAGRAM_PATHS: { prefix: string; kind: VideoKind }[] = [
  { prefix: 'reel', kind: 'reel' },
  { prefix: 'reels', kind: 'reel' },
  { prefix: 'p', kind: 'video' },
  { prefix: 'tv', kind: 'video' },
];

/** A platform id: what these services actually mint. Anything else is either
 *  a path we misread or somebody probing, and both deserve a refusal. */
const ID = /^[A-Za-z0-9_-]{1,64}$/;

const idOrNull = (value: string | undefined | null): string | null =>
  value && ID.test(value) ? value : null;

const youtube = (url: URL, segments: string[]): ParsedVideoUrl | null => {
  if (url.hostname === 'youtu.be') {
    const id = idOrNull(segments[0]);
    return id ? { platform: 'youtube', externalId: id, kind: 'video' } : null;
  }

  if (segments[0] === 'watch') {
    // `v` only. Reading the whole query would carry `si`/`t`/`feature` into
    // the id; taking the one parameter that names the video ignores them by
    // construction rather than by maintaining a list of junk to strip.
    const id = idOrNull(url.searchParams.get('v'));
    return id ? { platform: 'youtube', externalId: id, kind: 'video' } : null;
  }

  for (const { prefix, kind } of YOUTUBE_PATHS) {
    if (segments[0] !== prefix) continue;
    const id = idOrNull(segments[1]);
    return id ? { platform: 'youtube', externalId: id, kind } : null;
  }

  return null;
};

const instagram = (segments: string[]): ParsedVideoUrl | null => {
  for (const { prefix, kind } of INSTAGRAM_PATHS) {
    if (segments[0] !== prefix) continue;
    const id = idOrNull(segments[1]);
    return id ? { platform: 'instagram', externalId: id, kind } : null;
  }
  return null;
};

const tiktok = (url: URL, segments: string[]): ParsedVideoUrl | null => {
  // The short host carries no id at all — only a redirect reveals one, which
  // is `followShortLink`'s job. Saying so explicitly beats returning null,
  // which the caller could not tell apart from "refused".
  if (url.hostname === 'vm.tiktok.com') {
    return segments.length > 0 ? { platform: 'tiktok', externalId: null, kind: 'reel' } : null;
  }

  const videoAt = segments.indexOf('video');
  if (videoAt === -1) return null;
  const id = idOrNull(segments[videoAt + 1]);
  return id ? { platform: 'tiktok', externalId: id, kind: 'reel' } : null;
};

const x = (segments: string[]): ParsedVideoUrl | null => {
  // `/uaeaf/status/1800` and `/i/status/1800` differ only in the first
  // segment, so the id is read from the one after `status` either way.
  const statusAt = segments.indexOf('status');
  if (statusAt === -1) return null;
  const id = idOrNull(segments[statusAt + 1]);
  return id ? { platform: 'x', externalId: id, kind: 'video' } : null;
};

const facebook = (segments: string[]): ParsedVideoUrl | null => {
  const videosAt = segments.indexOf('videos');
  if (videosAt === -1) return null;
  const id = idOrNull(segments[videosAt + 1]);
  return id ? { platform: 'facebook', externalId: id, kind: 'video' } : null;
};

/**
 * Read a pasted link, or refuse it.
 *
 * `null` means "do not store this and do not fetch it" — the caller shows the
 * editor the supported-platforms message. It never throws: a malformed string
 * is an ordinary thing for a person to paste, not an exception.
 */
export const parseVideoUrl = (raw: string): ParsedVideoUrl | null => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  // Userinfo is the `https://youtube.com@127.0.0.1/` trick; refusing the whole
  // shape is simpler and safer than trying to out-parse it.
  if (url.username !== '' || url.password !== '') return null;

  const platform = HOSTS[url.hostname.toLowerCase()];
  if (!platform) return null;

  const segments = url.pathname.split('/').filter((segment) => segment !== '');

  switch (platform) {
    case 'youtube':
      return youtube(url, segments);
    case 'instagram':
      return instagram(segments);
    case 'tiktok':
      return tiktok(url, segments);
    case 'x':
      return x(segments);
    case 'facebook':
      return facebook(segments);
  }
};

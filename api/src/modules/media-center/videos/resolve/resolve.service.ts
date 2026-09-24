import { parseVideoUrl } from './url-allowlist.js';
import { fetchOembed, followShortLink } from './oembed-client.js';
import { isAllowedThumbnailHost } from './thumbnail.service.js';
import type { ParsedVideoUrl } from './url-allowlist.js';
import { VIDEO_TITLE_MAX_LENGTH } from '../schemas/video.schema.js';
import type { VideoExternalPlatform, VideoKind } from '../schemas/video.schema.js';

/**
 * Turning a pasted link into the fields the drawer shows.
 *
 * Three outcomes, and the third is the one this is shaped around:
 *
 * - `null` — nothing claims this URL. The editor sees the supported-platforms
 *   message.
 * - a resolved video — title and thumbnail came back.
 * - a **fallback** — the platform is supported and the id is known, but its
 *   oEmbed could not be read. Instagram and Facebook need a Meta app token
 *   this deployment may not have, and platforms rate-limit. An editor meeting
 *   either should be asked for a title, not shown an error about a token they
 *   cannot obtain, so this is a form to fill rather than a failure.
 */

export interface ResolvedVideo {
  platform: VideoExternalPlatform;
  externalId: string;
  kind: VideoKind;
  title: string;
  thumbnailUrl: string | null;
}

export interface ResolveFallback {
  fallback: true;
  platform: VideoExternalPlatform;
  externalId: string;
  kind: VideoKind;
}

/** The platforms whose oEmbed needs no credentials. Instagram and Facebook are
 *  absent because Meta's endpoint requires an app token. */
const PUBLIC_OEMBED: Partial<Record<VideoExternalPlatform, (url: string) => string>> = {
  youtube: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  tiktok: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  x: (url) => `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`,
};

const META_OEMBED: Partial<Record<VideoExternalPlatform, string>> = {
  instagram: 'https://graph.facebook.com/v18.0/instagram_oembed',
  facebook: 'https://graph.facebook.com/v18.0/oembed_video',
};

/**
 * The oEmbed endpoint to ask, and the URL to ask it about.
 *
 * The URL is the one the editor actually pasted (or, for a short link, the
 * canonical one the redirect named). An earlier version rebuilt it from parts,
 * which invented `@uaeaf` into every TikTok link and rewrote a Facebook
 * `/videos/<id>` as `/watch/?v=<id>`. Both are strings the platform is then
 * asked to recognise, and if it validates the handle or the path shape the
 * link degrades to a fallback with the editor never learning why.
 *
 * The token is returned SEPARATELY rather than interpolated here, so no single
 * string ever holds both an endpoint and a secret. The natural debugging edit —
 * logging the endpoint on failure — then cannot leak the Meta app token.
 */
/** Only for a followed short link, whose own URL names no video. Every other
 *  path asks about the URL the editor pasted. */
const canonicalFromShortLink = (parsed: ParsedVideoUrl & { externalId: string }): string => {
  switch (parsed.platform) {
    case 'tiktok':
      return `https://www.tiktok.com/video/${parsed.externalId}`;
    case 'youtube':
      return `https://youtu.be/${parsed.externalId}`;
    default:
      return `https://www.${parsed.platform}.com/${parsed.externalId}`;
  }
};

const endpointFor = (
  platform: VideoExternalPlatform,
  url: string,
): { endpoint: string; token?: string } | null => {
  const publicEndpoint = PUBLIC_OEMBED[platform];
  if (publicEndpoint) return { endpoint: publicEndpoint(url) };

  const metaEndpoint = META_OEMBED[platform];
  const token = process.env.META_OEMBED_TOKEN;
  // No token means no endpoint — not an endpoint that will refuse us. Saying
  // so here is what keeps the editor from waiting on a certain rejection.
  if (!metaEndpoint || !token) return null;

  return { endpoint: `${metaEndpoint}?url=${encodeURIComponent(url)}`, token };
};

/**
 * The picture the platform named, but only if it is somewhere we would fetch
 * from.
 *
 * `thumbnail_url` is chosen by the remote service, and the drawer renders it
 * as an `<img src>` preview — so an unchecked value makes the EDITOR'S browser
 * fetch an attacker-chosen URL from inside the federation's network, leaking
 * its address on every drawer open. Validating at this boundary means the
 * guarantee travels with the value instead of living in one consumer.
 */
const safeThumbnailUrl = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (url.username !== '' || url.password !== '') return null;
    return isAllowedThumbnailHost(url.hostname) ? raw : null;
  } catch {
    return null;
  }
};

/**
 * A portrait frame is a reel, whatever the URL said.
 *
 * Only consulted when the path was ambiguous: a TikTok `/video/` is always a
 * reel and a YouTube `/shorts/` always is too, but a Short shared as `/watch`
 * looks like an ordinary video until its dimensions arrive.
 */
const shapeOf = (parsed: ParsedVideoUrl, width: number | null, height: number | null): VideoKind => {
  if (parsed.kind === 'reel') return 'reel';
  if (width !== null && height !== null && height > width) return 'reel';
  return 'video';
};

export const resolveVideo = async (raw: string): Promise<ResolvedVideo | ResolveFallback | null> => {
  const parsed = parseVideoUrl(raw);
  if (!parsed) return null;

  // A short link names no video until it is followed; every hop of that is
  // re-checked against the allowlist inside `followShortLink`.
  const known = parsed.externalId === null ? await followShortLink(raw) : parsed;
  if (!known || known.externalId === null) return null;

  const identified = known as ParsedVideoUrl & { externalId: string };
  // The URL the editor pasted, unless a short link was followed — in which
  // case the canonical one the redirect named.
  const askAbout = parsed.externalId === null ? canonicalFromShortLink(identified) : raw;
  const target = endpointFor(identified.platform, askAbout);

  const oembed = target
    ? await fetchOembed(target.token ? `${target.endpoint}&access_token=${encodeURIComponent(target.token)}` : target.endpoint)
    : null;
  if (!oembed) {
    return {
      fallback: true,
      platform: identified.platform,
      externalId: identified.externalId,
      kind: identified.kind,
    };
  }

  return {
    platform: identified.platform,
    externalId: identified.externalId,
    kind: shapeOf(identified, oembed.width, oembed.height),
    // Trimmed, not refused: a verbose platform should not make a link
    // unaddable, and the editor can edit the title in the drawer anyway.
    title: oembed.title.slice(0, VIDEO_TITLE_MAX_LENGTH),
    thumbnailUrl: safeThumbnailUrl(oembed.thumbnailUrl),
  };
};

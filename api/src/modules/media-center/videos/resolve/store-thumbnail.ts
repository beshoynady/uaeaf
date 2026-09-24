import { Types } from 'mongoose';
import { STORAGE_FOLDERS } from '../../storage/storage-provider.js';
import { fetchThumbnailBytes } from './thumbnail.service.js';
import { resolveVideo } from './resolve.service.js';
import type { MediaAssetsService } from '../../media-assets/media-assets.service.js';
import type { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/**
 * The still a platform names, copied into this platform's own library.
 *
 * ── Why the bytes are copied rather than linked ────────────────────────────
 *
 * Instagram and TikTok sign their CDN URLs and expire them, usually within
 * days, so a stored link turns into a broken image at a moment nobody chose.
 * `thumbnail.service.ts` has held the fetch-and-guard half of this since the
 * video system shipped; what was missing was anything that called it. This is
 * that caller.
 *
 * ── Best effort, always ────────────────────────────────────────────────────
 *
 * Every step here can fail for a reason the editor cannot act on: a platform
 * that answers nothing, an oEmbed reply with no picture in it, a CDN timeout,
 * a storage provider having a bad minute. None of those is a reason to refuse
 * to publish a video or to put a broadcast on air, so every one answers
 * `null` and the record simply has no still. The surfaces all draw the
 * federation's motif on a dark ground in that case, which is a deliberate
 * state rather than a hole.
 *
 * That is also why nothing is thrown: a caller that had to wrap this in its
 * own try/catch would eventually forget, and the failure would take the
 * broadcast down with it.
 */
export const storeResolvedThumbnail = async (
  url: string,
  mediaAssets: Pick<MediaAssetsService, 'uploadAndCreate'>,
  describe: { caption: LocalizedTextDto; altText: LocalizedTextDto },
): Promise<Types.ObjectId | null> => {
  try {
    const resolved = await resolveVideo(url);
    // A fallback answer identifies the video but carries no picture — Meta's
    // oEmbed needs an app token this deployment may not have.
    if (!resolved || 'fallback' in resolved || !resolved.thumbnailUrl) return null;

    const bytes = await fetchThumbnailBytes(resolved.thumbnailUrl);
    if (!bytes) return null;

    const asset = await mediaAssets.uploadAndCreate(
      {
        buffer: bytes.buffer,
        size: bytes.buffer.byteLength,
        // Named after the video it belongs to, so the library does not fill
        // with rows called `thumbnail`.
        originalname: `${resolved.platform}-${resolved.externalId}.jpg`,
      },
      { caption: describe.caption, altText: describe.altText },
      STORAGE_FOLDERS.library,
    );

    return asset._id as Types.ObjectId;
  } catch {
    return null;
  }
};

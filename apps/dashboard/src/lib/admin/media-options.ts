import type { LocalizedText } from "@/lib/api/types";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";

/**
 * The media library, turned into what an image field can offer.
 *
 * Two things happen here, and both are the kind that are silently forgotten
 * when each screen does its own: the API's `_id` becomes the picker's `id`,
 * and anything that is not an image is dropped. A screen that forwards the
 * raw list instead draws a grid whose every tile selects `undefined` — the
 * thumbnails render, the clicks do nothing, and nothing anywhere reports an
 * error.
 *
 * One function rather than one per screen, because the twelve content pages
 * after this one each have an image field and each would get that wrong
 * separately.
 */

/** A media asset as the API serializes it: a raw Mongoose document, so the
 *  id is `_id` and there is no `id` virtual. */
interface RawMediaAsset {
  _id?: unknown;
  caption?: unknown;
  altText?: unknown;
  isAiGenerated?: unknown;
  file?: { url?: unknown; mimeType?: unknown; width?: unknown; height?: unknown } | null;
}

export const toMediaOptions = (assets: readonly unknown[] | null | undefined): MediaAssetOption[] => {
  // A refused library is an absence, not an error (the picker then offers
  // upload only), so it maps to the same empty list as a library nobody has
  // put anything in.
  if (!assets) {
    return [];
  }

  return assets.flatMap((entry) => {
    const asset = entry as RawMediaAsset;
    const url = asset.file?.url;
    const mimeType = asset.file?.mimeType;

    if (
      typeof asset._id !== "string" ||
      typeof url !== "string" ||
      typeof mimeType !== "string" ||
      !mimeType.startsWith("image/")
    ) {
      return [];
    }

    // The size, the alternative text and the provenance mark are carried when
    // the record has them: the hero screen warns about a picture too narrow
    // for the hero and marks a generated one as temporary.
    const option: MediaAssetOption = { id: asset._id, caption: asset.caption as LocalizedText, url };
    if (typeof asset.file?.width === "number") option.width = asset.file.width;
    if (typeof asset.file?.height === "number") option.height = asset.file.height;
    if (asset.altText) option.altText = asset.altText as LocalizedText;
    if (typeof asset.isAiGenerated === "boolean") option.isAiGenerated = asset.isAiGenerated;
    return [option];
  });
};

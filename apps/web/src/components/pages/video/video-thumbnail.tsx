import Image from "next/image";
import { UaeafMotif } from "@/components/brand/uaeaf-motif";
import { altOf, isExternalMedia } from "@/lib/api/media";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * A video's still, with no way for it to be missing.
 *
 * Every surface in this system draws it through here, so "the resolver could
 * not fetch a thumbnail" is answered once rather than at each call site --
 * and so no future card can forget and leave a hole. Instagram's and TikTok's
 * still URLs expire, which is why the API stores the file rather than linking
 * to it; this renders whatever survived that.
 *
 * The placeholder is the federation's own motif on the system's dark surface,
 * and it is `aria-hidden`: it says only that there is no still, which is not
 * information worth reading out once per card down a grid of twelve. The
 * card's title is already the video's accessible name.
 */
export const VideoThumbnail = ({
  asset,
  locale,
  sizes,
  priority = false,
  /** The slow push in. Only the one featured still gets it -- a grid of
   *  twelve simultaneously zooming images is a fairground, not a federation. */
  kenBurns = false,
  className = "",
}: {
  asset?: MediaAssetPublic;
  locale: AppLocale;
  sizes: string;
  priority?: boolean;
  kenBurns?: boolean;
  className?: string;
}) => {
  if (asset) {
    return (
      <Image
        src={asset.file.url}
        alt={altOf(asset, locale)}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${kenBurns ? "vs-kenburns" : ""} ${className}`}
        unoptimized={isExternalMedia(asset.file.url)}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ background: "linear-gradient(135deg, var(--vs-surface-raised), var(--vs-surface))" }}
    >
      <UaeafMotif
        tone="inherit"
        className="absolute opacity-25"
        style={{
          insetInlineStart: "50%",
          top: "50%",
          width: "44%",
          color: "var(--vs-text-muted)",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
};

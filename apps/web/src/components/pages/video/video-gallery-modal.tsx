"use client";

import { useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import type { useVideoGallery } from "./use-video-gallery";
import { VideoPlayerModal } from "./video-player-modal";

/**
 * The player a list of video cards opens, with every label it needs taken from
 * the `VideoSystem` messages.
 *
 * The labels are the same for every list that opens the player; only the list's
 * name, its length and the share address differ. Written once so a new list —
 * the homepage carousel, a season's videos — cannot drop one of them.
 * Nothing renders while the gallery is closed.
 */
export const VideoGalleryModal = ({
  gallery,
  total,
  listName,
  locale,
  shareUrl,
}: {
  gallery: ReturnType<typeof useVideoGallery>;
  total: number;
  listName: string;
  locale: AppLocale;
  /** A path on this site to share instead of the platform's address. */
  shareUrl?: string;
}) => {
  const t = useTranslations("VideoSystem");
  const video = gallery.video;
  if (!video) return null;
  const platform = t(`platform_${video.platform}`);

  return (
    <VideoPlayerModal
      video={video}
      locale={locale}
      labels={{
        play: t("play"),
        failedTitle: t("failedTitle"),
        failedBody: t("failedBody"),
        retry: t("retry"),
        close: t("close"),
        previous: t("previous"),
        next: t("next"),
        position: t("position", { index: (gallery.index ?? 0) + 1, total, list: listName }),
        platform,
        category: t(`category_${video.category}`),
        share: t("share"),
        shareCopied: t("shareCopied"),
        openOn: t("openOn", { platform }),
      }}
      shareUrl={shareUrl}
      onClose={gallery.close}
      onPrevious={gallery.previous}
      onNext={gallery.next}
      hasPrevious={gallery.hasPrevious}
      hasNext={gallery.hasNext}
      returnFocusTo={gallery.openerElement}
    />
  );
};

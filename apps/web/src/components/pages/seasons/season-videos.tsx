"use client";

import { useTranslations } from "next-intl";
import { VideoCard } from "@/components/pages/video/video-card";
import { VideoGalleryModal } from "@/components/pages/video/video-gallery-modal";
import { useVideoGallery } from "@/components/pages/video/use-video-gallery";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { VideoPublic } from "@/lib/video/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * A season's first videos as the library draws them, playing in the same
 * player the homepage and the library open. Landscape videos only: a reel has
 * its own card and its own shelf in the library.
 */
export const SeasonVideos = ({
  videos,
  thumbnails,
  listName,
  locale,
}: {
  videos: readonly VideoPublic[];
  thumbnails: Map<string, MediaAssetPublic>;
  listName: string;
  locale: AppLocale;
}) => {
  const t = useTranslations("VideoSystem");
  const gallery = useVideoGallery(videos);

  return (
    <>
      <ul className="grid gap-6 sm:grid-cols-2">
        {videos.map((video, index) => (
          <li key={video.id}>
            <VideoCard
              video={video}
              thumbnail={video.thumbnailId ? thumbnails.get(video.thumbnailId) : undefined}
              locale={locale}
              labels={{ platform: t(`platform_${video.platform}`), category: t(`category_${video.category}`) }}
              onPlay={() => gallery.open(index)}
            />
          </li>
        ))}
      </ul>
      <VideoGalleryModal gallery={gallery} total={videos.length} listName={listName} locale={locale} />
    </>
  );
};

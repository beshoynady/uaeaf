"use client";

import { PlatformBadge } from "./platform-badge";
import { PlayButton } from "./play-button";
import { VideoThumbnail } from "./video-thumbnail";
import { titleOf } from "@/lib/video/types";
import type { VideoPublic } from "@/lib/video/types";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * One vertical short, on the reels shelf.
 *
 * -- Why this is a separate component and not a variant ---------------------
 *
 * A reel is not a landscape card turned sideways. Its still is 9:16, so it
 * cannot be cropped to 16:9 without losing the subject; its title sits on the
 * image rather than under it, because a 9:16 card with a caption block beneath
 * would be taller than the viewport on a phone; and it never appears in the
 * landscape carousel, which is why the section's `includeReels` defaults off.
 * Sharing one component and branching on `kind` would put all three of those
 * differences inside conditionals in a file that is mostly conditionals.
 *
 * The overlaid title is the reason for the scrim: the still is an uncontrolled
 * photograph, and white text on a stadium roof is unreadable. The gradient is
 * heavier at the foot than the landscape card's because it carries text there
 * rather than just a mark.
 */
export const ReelCard = ({
  video,
  thumbnail,
  locale,
  labels,
  onPlay,
  revealIndex,
}: {
  video: VideoPublic;
  thumbnail?: MediaAssetPublic;
  locale: AppLocale;
  labels: { platform: string };
  onPlay: () => void;
  revealIndex?: number;
}) => {
  const title = titleOf(video, locale);

  return (
    <button
      type="button"
      onClick={onPlay}
      data-testid="reel-card"
      className="vs-rise group relative block w-full overflow-hidden text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--vs-green)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--vs-bg)]"
      style={{
        aspectRatio: "9 / 16",
        borderRadius: "var(--vs-radius-reel)",
        background: "var(--vs-surface)",
        ...(revealIndex === undefined ? {} : { ["--vs-reveal-index" as string]: revealIndex }),
      }}
    >
      <VideoThumbnail
        asset={thumbnail}
        locale={locale}
        sizes="(max-width: 640px) 46vw, 200px"
        className="transition-transform duration-500 ease-[cubic-bezier(.16,.8,.24,1)] group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />

      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(10,12,11,0.4) 0%, transparent 30%, transparent 46%, rgba(10,12,11,0.88) 100%)" }}
      />

      <span className="absolute end-2.5 top-2.5">
        <PlatformBadge platform={video.platform} label={labels.platform} size={24} />
      </span>

      {/* Towards the top rather than dead centre: the foot of the card belongs
          to the title, and a disc over the words would compete with them. */}
      <span className="absolute start-2.5 top-2.5">
        <span className="transition-opacity duration-[var(--motion-duration-fast)] group-hover:opacity-0 motion-reduce:transition-none">
          <PlayButton size="sm" />
        </span>
        <span className="absolute inset-0 opacity-0 transition-opacity duration-[var(--motion-duration-fast)] group-hover:opacity-100 motion-reduce:transition-none">
          <PlayButton size="sm" filled />
        </span>
      </span>

      <span className="absolute inset-x-0 bottom-0 block p-3">
        <span className="line-clamp-3 text-body-sm font-semibold leading-snug" style={{ color: "#FFFFFF" }}>
          {title}
        </span>
      </span>
    </button>
  );
};

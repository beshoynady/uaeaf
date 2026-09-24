"use client";

import { PlatformBadge } from "./platform-badge";
import { PlayButton } from "./play-button";
import { PublishDate } from "@/components/pages/news/publish-date";
import { VideoThumbnail } from "./video-thumbnail";
import { titleOf } from "@/lib/video/types";
import type { VideoPublic } from "@/lib/video/types";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * One landscape video, as the carousel and the library grid both draw it.
 *
 * -- Why the card is a button and not a link -------------------------------
 *
 * Playback happens in a modal on this page; there is no per-video route to
 * link to, and a link with `href="#"` is a lie a keyboard reader pays for. So
 * the card is a `<button>`, which is what it behaves like, and the modal
 * returns focus here when it closes.
 *
 * -- 16:9, always -----------------------------------------------------------
 *
 * A reel is 9:16 and belongs in `ReelCard`, on its own shelf. Putting one here
 * would either letterbox it into bars or crop the subject's head off, and both
 * are worse than the separate shelf the design draws. `video-cards.spec.tsx`
 * holds that line.
 */
export const VideoCard = ({
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
  labels: { platform: string; category: string };
  onPlay: () => void;
  /** Position in the entering batch, for the 100ms stagger. */
  revealIndex?: number;
}) => {
  const title = titleOf(video, locale);

  return (
    <button
      type="button"
      onClick={onPlay}
      data-testid="video-card"
      className="vs-rise group flex w-full flex-col gap-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--vs-green)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--vs-bg)]"
      style={{ borderRadius: "var(--vs-radius-card)", ...(revealIndex === undefined ? {} : { ["--vs-reveal-index" as string]: revealIndex }) }}
    >
      <span
        className="relative block w-full overflow-hidden"
        style={{ aspectRatio: "16 / 9", borderRadius: "var(--vs-radius-card)", background: "var(--vs-surface)" }}
      >
        <VideoThumbnail
          asset={thumbnail}
          locale={locale}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 320px"
          className="transition-transform duration-500 ease-[cubic-bezier(.16,.8,.24,1)] group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />

        {/* A scrim under the marks. The still is an uncontrolled photograph, so
            a mark sitting straight on it can land on a white stadium roof. */}
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(10,12,11,0.34) 0%, transparent 34%, transparent 62%, rgba(10,12,11,0.5) 100%)" }}
        />

        {/* The far corner in either language: `end-3` is `right` in English and
            `left` in Arabic, which is where the approved composition puts it. */}
        <span className="absolute end-3 top-3">
          <PlatformBadge platform={video.platform} label={labels.platform} size={26} />
        </span>

        <span className="absolute inset-0 flex items-center justify-center">
          {/* `filled` on hover is the design's one hover promise: the disc
              takes the federation's green. Group-hover cannot cross into a
              prop, so both are drawn and one is faded out -- no layout moves. */}
          <span className="transition-opacity duration-[var(--motion-duration-fast)] group-hover:opacity-0 motion-reduce:transition-none">
            <PlayButton size="sm" />
          </span>
          <span className="absolute opacity-0 transition-opacity duration-[var(--motion-duration-fast)] group-hover:opacity-100 motion-reduce:transition-none">
            <PlayButton size="sm" filled />
          </span>
        </span>
      </span>

      <span className="flex flex-col gap-1.5">
        {/* Two lines, clamped. A third would push the meta row of one card out
            of line with its neighbours, and a row of cards whose feet do not
            agree reads as broken rather than as varied. */}
        <span
          className="line-clamp-2 text-body font-semibold leading-snug"
          style={{ color: "var(--vs-text)", fontSize: "1.0625rem" }}
        >
          {title}
        </span>
        {/* The date goes through `PublishDate`, the site's one date component:
            it is what pins Latin numerals in Arabic (Chapter 19 §5), and a
            second place calling `useFormatter` with its own options would
            silently get the locale's default numbering system instead. */}
        <span className="flex items-center gap-2 text-caption" style={{ color: "var(--vs-text-muted)" }}>
          <span style={{ color: "var(--vs-green)" }}>{labels.category}</span>
          {video.publishedAt ? <span aria-hidden="true">·</span> : null}
          <PublishDate date={video.publishedAt} />
        </span>
      </span>
    </button>
  );
};

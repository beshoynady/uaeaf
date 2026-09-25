"use client";

import { EmbedFrame } from "./embed-frame";
import { LiveBadge } from "./live-badge";
import { PlatformBadge } from "./platform-badge";
import { PlayButton } from "./play-button";
import { VideoThumbnail } from "./video-thumbnail";
import type { EmbedLabels } from "./embed-frame";
import type { VideoPlatform } from "@/lib/video/types";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { BrandBorder } from "@uaeaf/brand-ui";

/**
 * The large player, in the one shape both states share.
 *
 * The resting state and the live state are the same rectangle with the same
 * facade, the same still and the same play affordance. What differs is the
 * frame (a breathing red edge), the badge (a pulsing "live now" instead of
 * nothing) and which YouTube origin the embed comes from. Drawing them as two
 * components would mean two places to keep the facade's zero-iframe promise.
 *
 * `live` is the switch. Everything it changes is listed here, in one file,
 * rather than being scattered as `isLive &&` across a section.
 */
export const VideoStage = ({
  platform,
  externalId,
  url,
  title,
  thumbnail,
  locale,
  labels,
  live = false,
  liveLabel,
  kenBurns = false,
  priority = false,
}: {
  platform: VideoPlatform;
  externalId: string;
  url: string;
  title: string;
  thumbnail?: MediaAssetPublic;
  locale: AppLocale;
  labels: EmbedLabels & { platform: string };
  live?: boolean;
  liveLabel?: string;
  kenBurns?: boolean;
  priority?: boolean;
}) => (
  /*
   * While a broadcast is live the stage carries the kit's one continuously
   * rotating edge (ADR-0098 D5, `BrandBorder variant="live"`): the rotation
   * stopping is the information, which is why this is the single place in the
   * system where motion does not end on its own. Off air it is the same ring,
   * static — so nothing about the stage's geometry moves when a stream ends.
   *
   * It replaces a `box-shadow` glow the video system drew in Federation Red.
   * ADR-0038 reserves red, and a shadow is clipped to nothing by the
   * `overflow: hidden` a player needs, which is why the glow had already been
   * frozen at its resting frame.
   */
  <BrandBorder
    variant={live ? "live" : "static"}
    className="w-full"
    style={{ aspectRatio: "16 / 9" }}
  >
  <div
    className="relative w-full overflow-hidden"
    style={{
      aspectRatio: "16 / 9",
      borderRadius: "var(--radius-xl)",
    }}
  >
    <EmbedFrame platform={platform} externalId={externalId} url={url} title={title} live={live} labels={labels}>
      <span className="absolute inset-0 block">
        <VideoThumbnail
          asset={thumbnail}
          locale={locale}
          sizes="(max-width: 1024px) 100vw, 1200px"
          priority={priority}
          kenBurns={kenBurns}
        />

        {/* The scrim exists for the badges, which sit over an uncontrolled
            photograph. It is lighter than a card's: this image is the
            section's own artwork, not a thumbnail. */}
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--color-surface-overlay) 36%, transparent) 0%, transparent 32%)" }}
        />

        {live && liveLabel ? (
          <span className="absolute start-4 top-4">
            <LiveBadge label={liveLabel} />
          </span>
        ) : null}

        <span className="absolute end-4 top-4">
          <PlatformBadge platform={platform} label={labels.platform} size={30} />
        </span>

        <span className="absolute inset-0 flex items-center justify-center">
          <PlayButton size="lg" pulsing />
        </span>
      </span>
    </EmbedFrame>
  </div>
  </BrandBorder>
);

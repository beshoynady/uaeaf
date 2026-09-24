"use client";

import { PlatformMark } from "./platform-mark";
import { VideoStill } from "./video-still";
import type { VideoCategory, VideoKind, VideoPlatform } from "@/lib/admin/videos/types";

/**
 * The card as the public site will draw it.
 *
 * -- Why it is dark inside a light dashboard --------------------------------
 *
 * The video system's public surface is a dark register (`#0A0C0B` / `#121614`,
 * scoped to `.video-system` on the site). A preview drawn on the dashboard's
 * light surface would be a card nobody approved: the editor would sign off on
 * a contrast, a scrim and a play button that do not exist anywhere. So the
 * preview carries the site's own ground, as literals, and says so.
 *
 * They are literals rather than tokens for the same reason they are literals
 * on the site: the dark register is that system's alone, and a token would
 * invite it into screens that never agreed to it.
 *
 * -- It updates as the editor types -----------------------------------------
 *
 * Every value is a prop. The form owns the draft; this owns only how one
 * looks. That is what makes "change the title and watch the card change" free
 * rather than a second piece of state to keep in step.
 */
export const VideoPreviewCard = ({
  title,
  categoryLabel,
  dateLabel,
  platform,
  kind,
  thumbnailUrl,
  live = false,
  liveLabel,
}: {
  title: string;
  categoryLabel?: string;
  dateLabel?: string;
  platform: VideoPlatform | null;
  kind: VideoKind;
  thumbnailUrl: string | null;
  /** Draws the broadcast's red frame and badge instead of the resting card. */
  live?: boolean;
  liveLabel?: string;
}) => (
  <div
    className="flex flex-col gap-3 overflow-hidden rounded-[14px] p-3"
    style={{ background: "#0A0C0B" }}
  >
    <div
      className="relative w-full overflow-hidden rounded-[10px]"
      style={{
        aspectRatio: kind === "reel" ? "9 / 16" : "16 / 9",
        background: "#121614",
        boxShadow: live ? "0 0 0 1px #D11A27, 0 0 28px -8px #D11A27" : undefined,
      }}
    >
      <span className="absolute inset-0">
        <VideoStill url={thumbnailUrl} rounded="" />
      </span>

      {/* The scrim the site draws, so the marks read over any still. */}
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(10,12,11,0.34) 0%, transparent 34%)" }}
      />

      {live && liveLabel ? (
        <span
          className="absolute start-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-bold"
          style={{ background: "#D11A27", color: "#FFFFFF" }}
        >
          <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-current" />
          {liveLabel}
        </span>
      ) : null}

      {platform ? (
        <span className="absolute end-2 top-2">
          <PlatformMark platform={platform} />
        </span>
      ) : null}

      {/* The play disc, dark with a white rim — the same fix the site needed:
          a translucent white disc vanishes over a pale still. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center"
      >
        <span
          className="inline-flex size-11 items-center justify-center rounded-full"
          style={{ background: "rgba(10,12,11,0.46)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55)" }}
        >
          <svg viewBox="0 0 24 24" className="size-4" focusable="false">
            <path d="M8 5.2 19 12 8 18.8V5.2Z" fill="#FFFFFF" />
          </svg>
        </span>
      </span>
    </div>

    <div className="flex flex-col gap-1">
      <p className="line-clamp-2 text-body-sm font-semibold leading-snug" style={{ color: "#F3F5F2" }}>
        {title}
      </p>
      {categoryLabel || dateLabel ? (
        <p className="flex items-center gap-2 text-caption" style={{ color: "#8A938D" }}>
          {categoryLabel ? <span style={{ color: "#2BD46E" }}>{categoryLabel}</span> : null}
          {categoryLabel && dateLabel ? <span aria-hidden="true">·</span> : null}
          {dateLabel ? <span>{dateLabel}</span> : null}
        </p>
      ) : null}
    </div>
  </div>
);

/** The status card's one row: a label and its value. */
export const StatusRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-1.5">
    <span className="text-caption text-[color:var(--color-text-secondary)]">{label}</span>
    <span className="flex items-center gap-2 text-body-sm font-medium text-[color:var(--color-text-primary)]">
      {children}
    </span>
  </div>
);

/** A published/draft badge, the same one the table draws. */
export const StatusBadge = ({ status, label }: { status: "draft" | "published"; label: string }) => (
  <span
    className={`inline-flex min-h-6 items-center rounded-[var(--radius-full)] px-2.5 text-caption font-bold ${
      status === "published"
        ? "bg-[color-mix(in_srgb,var(--color-semantic-success)_14%,transparent)] text-[color:var(--color-text-primary)]"
        : "bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-secondary)]"
    }`}
  >
    {label}
  </span>
);

export type { VideoCategory };

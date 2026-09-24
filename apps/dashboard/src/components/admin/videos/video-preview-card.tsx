"use client";

import { PlatformMark } from "./platform-mark";
import { VideoStill } from "./video-still";
import type { VideoCategory, VideoKind, VideoPlatform } from "@/lib/admin/videos/types";

/**
 * The card as the public site will draw it.
 *
 * -- Why it is dark inside a light dashboard --------------------------------
 *
 * The site draws this card on ADR-0098's ink surface, so the preview declares
 * that surface too. Drawn on the dashboard's own light ground it would be a
 * card nobody approved: the editor would sign off on a contrast, a scrim and a
 * play button that exist nowhere. Both sides read the same `--surface-*` set
 * from the same kit, so the preview cannot drift from the page it mirrors.
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
  // The preview shows the public site's ground, so it declares that
  // ground: `data-surface="ink"` resolves every `--surface-*` below to
  // ADR-0098's ink set, exactly as the site resolves them. Literals here
  // would be a second copy of a surface the kit already publishes.
  <div
    data-surface="ink"
    className="flex flex-col gap-3 overflow-hidden rounded-[14px] p-3"
    style={{ background: "var(--surface-bg)" }}
  >
    <div
      className="relative w-full overflow-hidden rounded-[10px]"
      style={{
        aspectRatio: kind === "reel" ? "9 / 16" : "16 / 9",
        background: "color-mix(in srgb, var(--surface-text) 6%, var(--surface-bg))",
        // The site's frame, to the value (`.vs-live-frame`): a preview that shows a
        // different red at a different spread is not showing the card.
        boxShadow: live
          ? "0 0 0 1px var(--color-brand-secondary), 0 0 34px -6px color-mix(in srgb, var(--color-brand-secondary) 70%, transparent)"
          : undefined,
      }}
    >
      <span className="absolute inset-0">
        <VideoStill url={thumbnailUrl} rounded="" />
      </span>

      {/* The scrim the site draws, so the marks read over any still. */}
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--color-surface-overlay) 34%, transparent) 0%, transparent 34%)" }}
      />

      {live && liveLabel ? (
        // `brand-red` publishes the ground and the ink together, measured in
        // ADR-0098 §8.3 -- the same pair `LiveBadge` asks for on the site.
        <span
          data-surface="brand-red"
          className="absolute start-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-bold"
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
          style={{ background: "color-mix(in srgb, var(--color-surface-overlay) 46%, transparent)", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--surface-text) 55%, transparent)" }}
        >
          <svg viewBox="0 0 24 24" className="size-4" focusable="false">
            <path d="M8 5.2 19 12 8 18.8V5.2Z" fill="var(--surface-text)" />
          </svg>
        </span>
      </span>
    </div>

    <div className="flex flex-col gap-1">
      <p className="line-clamp-2 text-body-sm font-semibold leading-snug" style={{ color: "var(--surface-text)" }}>
        {title}
      </p>
      {categoryLabel || dateLabel ? (
        <p className="flex items-center gap-2 text-caption" style={{ color: "var(--surface-text-muted)" }}>
          {categoryLabel ? <span style={{ color: "var(--surface-text)" }}>{categoryLabel}</span> : null}
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

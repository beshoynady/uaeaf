"use client";

import { useEffect, useRef } from "react";
import { EmbedFrame } from "./embed-frame";
import { PlatformBadge } from "./platform-badge";
import { PublishDate } from "@/components/pages/news/publish-date";
import { ShareButton } from "./share-button";
import { titleOf } from "@/lib/video/types";
import type { EmbedLabels } from "./embed-frame";
import type { VideoPublic } from "@/lib/video/types";
import type { AppLocale } from "@/i18n/routing";
import { FOCUS } from "@/components/ui/interactive";
import { Button, IconButton } from "@uaeaf/brand-ui";

/**
 * The cinematic player.
 *
 * -- Focus, in three parts --------------------------------------------------
 *
 * 1. **Trapped.** Tab and Shift+Tab cycle inside the dialog. Without it a
 *    reader tabs straight out into the page behind, which is still there and
 *    still full of cards -- they are then operating a page they cannot see.
 * 2. **Escape closes**, from anywhere. The listener is on `document`, not on
 *    the panel: measured in Chromium, a click on the title -- which is not
 *    focusable -- leaves `document.activeElement` as `<body>`, and a keydown
 *    handler bound to the panel never fires again. A reader who clicks the
 *    title and then presses Escape would be stuck in a dialog that ignores
 *    them. The same applies after any click into the platform's iframe, whose
 *    keystrokes never reach this document at all.
 * 3. **Returned.** Focus goes back to the exact element that opened the
 *    dialog, captured on open rather than looked up on close: by then the grid
 *    may have re-rendered and the old node is gone.
 *
 * The panel itself carries `tabIndex={-1}`, so focus that has fallen to the
 * body can be pulled back into the dialog rather than tabbing into the header
 * behind it.
 *
 * -- Why not `<dialog>` -----------------------------------------------------
 *
 * `reference_dialog_search_escape`: inside a native `<dialog>`, Chromium's
 * first Escape on a `type="search"` field clears the field and fires no
 * `cancel`, and jsdom's shim hides the difference so a test would not catch
 * it. This dialog has no search field today, but the library page behind it
 * does and the two are one keyboard surface. A plain element with explicit
 * handling behaves the same everywhere.
 *
 * -- Previous and next ------------------------------------------------------
 *
 * The arrows move within the list the reader opened the dialog from, and the
 * counter says where they are in it. They are `disabled` at the ends rather
 * than wrapping: a reader who has reached the last video should be told so,
 * not silently returned to the first.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export interface ModalLabels extends EmbedLabels {
  close: string;
  previous: string;
  next: string;
  /** "{index} of {total} in «{list}»". */
  position: string;
  platform: string;
  category: string;
  share: string;
  shareCopied: string;
}

export const VideoPlayerModal = ({
  video,
  locale,
  labels,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  /** The element to hand focus back to. Captured by the opener. */
  returnFocusTo,
  shareUrl,
}: {
  video: VideoPublic;
  locale: AppLocale;
  labels: ModalLabels;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  returnFocusTo: HTMLElement | null;
  /** What Share sends. The library passes its own address for this video, so
   *  the link opens the player rather than landing on the platform. The
   *  homepage passes nothing and falls back to the platform's URL, because the
   *  homepage has no address for one video. */
  shareUrl?: string;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const title = titleOf(video, locale);

  // Focus starts on Close: it is the one control every reader needs, and
  // landing on the iframe would hand the first keystroke to the platform.
  useEffect(() => {
    closeButton.current?.focus();
  }, []);

  // The page behind must not scroll under the dialog.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Return focus on unmount, to the node captured when the dialog opened.
  useEffect(
    () => () => {
      returnFocusTo?.focus();
    },
    [returnFocusTo],
  );

  // On `document`, not on the panel — see point 2 of the header.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // No visibility filter. `offsetParent` is the obvious one to reach for
      // and it is wrong twice over: it is null for everything inside a
      // fixed-positioned subtree, which this dialog is, and null for
      // everything in jsdom, so the trap would silently do nothing and the
      // test would still pass. Nothing in this dialog is conditionally hidden
      // anyway -- the two arrows are `disabled`, which the selector already
      // excludes.
      const nodes = [...(container.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      // Focus has fallen outside the dialog — a click on the title, or on the
      // panel's padding. Tab would otherwise walk into the page behind.
      if (!container.current?.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      // Wrapping is done by hand at the two ends only; everywhere between
      // them the browser's own order is correct and is left alone.
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    // The scrim, and only the scrim. The surface is declared on the panel
    // inside it, not here: `[data-surface]` sets `position: relative`, which
    // beats the `fixed` utility -- unlayered CSS wins over Tailwind's layer --
    // and the overlay dropped into the page flow at the foot of the document.
    <div
      className="video-system fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ background: "color-mix(in srgb, var(--color-surface-overlay) 93%, transparent)" }}
      // A press on the ground closes; a press inside does not. `currentTarget`
      // rather than a stopPropagation on the panel, so a drag that starts
      // inside and ends outside does not close it either.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={container}
        data-surface="ink"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={title}
        className="flex w-full max-w-5xl flex-col gap-4"
        // The panel is the ink surface, but it draws no ground of its own: the
        // scrim behind it is the ground. Everything inside still reads the
        // ink set from here.
        style={{ background: "transparent" }}
      >
        <div className="flex items-center justify-between gap-3">
          {/* The dismiss carries the raised-on-ink step, which the ink surface
              now publishes as a token. It is a fill and not a boundary -- at
              1.25:1 against the ground it cannot be one -- so the shape comes
              from `IconButton`'s own edge at 6.44:1. */}
          <IconButton
            ref={closeButton}
            shape="circle"
            onClick={onClose}
            aria-label={labels.close}
            className="vs-fill-strong"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </IconButton>

          <p className="flex items-center gap-2.5 text-caption" style={{ color: "var(--surface-text-muted)" }}>
            {labels.position}
            <PlatformBadge platform={video.platform} label={labels.platform} size={26} />
          </p>
        </div>

        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "16 / 9", borderRadius: "var(--radius-xl)", background: "var(--surface-bg)" }}
        >
          <EmbedFrame
            platform={video.platform}
            externalId={video.externalId}
            url={video.url}
            title={title}
            labels={labels}
            autoStart
          >
            {/* Drawn for exactly one case, and it is not a rare one: a platform
                with no embeddable player. `autoStart` cannot start what
                `embedSrc` returns `null` for, so X would otherwise open a black
                16:9 rectangle whose only affordance — an invisible stretched
                link — a reader has no way to find. */}
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <PlatformBadge platform={video.platform} label={labels.platform} size={44} />
              <span className="text-body-sm" style={{ color: "var(--surface-text-muted)" }}>
                {labels.openOn}
              </span>
            </span>
          </EmbedFrame>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-h4 font-bold leading-snug" style={{ color: "var(--surface-text)" }}>
              {title}
            </h2>
            <p className="flex items-center gap-2 text-caption" style={{ color: "var(--surface-text-muted)" }}>
              <span style={{ color: "var(--surface-text)" }}>{labels.category}</span>
              {video.publishedAt ? <span aria-hidden="true">·</span> : null}
              <PublishDate date={video.publishedAt} />
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ShareButton url={shareUrl ?? video.url} title={title} label={labels.share} copiedLabel={labels.shareCopied} />
            <Button
              variant="secondary"
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
              </svg>
              {labels.openOn}
            </Button>

            <IconButton shape="circle" onClick={onPrevious} disabled={!hasPrevious} aria-label={labels.previous}>
              {/* The chevron follows the reading direction: "previous" is
                  towards the start of the line, which is the right in Arabic. */}
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 5.5 8 12l6.5 6.5" />
              </svg>
            </IconButton>
            <IconButton shape="circle" onClick={onNext} disabled={!hasNext} aria-label={labels.next}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 5.5 16 12l-6.5 6.5" />
              </svg>
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";

import { memo, useState, type DragEvent, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  HERO_SLIDE_MAX,
  slideImageIds,
  slideStatus,
  type MediaLookup,
  type SlideDraft,
  type SlideStatus,
} from "@/lib/admin/homepage-hero";

/**
 * The slides in the order visitors see them, as cards: picture, number, title,
 * status, and the marks for a temporary picture and unsaved changes.
 *
 * Three ways to reorder, all ending in the same announcement: dragging a card,
 * the two move buttons, and the arrow keys on the drag handle (earlier is the
 * reading direction's start: Right in Arabic, Left in English, and Up in both).
 */

const STATUS_KEY: Record<SlideStatus, string> = {
  visible: "statusVisible",
  hidden: "statusHidden",
  scheduled: "statusScheduled",
};

const STATUS_MARK: Record<SlideStatus, string> = {
  visible: "bg-[color:var(--color-semantic-success)]",
  // A paired role: `--color-semantic-neutral` has no measured partner (token contract).
  hidden: "bg-[color:var(--color-text-muted)]",
  scheduled: "bg-[color:var(--color-semantic-info)]",
};

const SlideStripView = ({
  slides,
  selectedKey,
  changedKeys,
  media,
  now,
  onSelect,
  onMove,
  onMoveBy,
  onAdd,
}: {
  slides: readonly SlideDraft[];
  selectedKey: string | null;
  /** Keys of the slides with unsaved changes of their own. */
  changedKeys: ReadonlySet<string>;
  media: MediaLookup;
  now: Date;
  onSelect: (key: string) => void;
  /** Moves a dropped slide to a place. */
  onMove: (key: string, to: number) => void;
  /** Moves a slide one place from wherever it is in the current draft. */
  onMoveBy: (key: string, delta: -1 | 1) => void;
  onAdd: () => void;
}) => {
  const t = useTranslations("HomepageHero");
  const locale = useLocale() as "ar" | "en";
  const [dragging, setDragging] = useState<string | null>(null);
  // The slide last moved, and where it was when the move began. The list drawn
  // here follows the draft a beat behind, so nothing is announced until it shows
  // the slide somewhere else: announcing earlier would name the old position.
  const [moved, setMoved] = useState<{ key: string; from: number } | null>(null);
  const full = slides.length >= HERO_SLIDE_MAX;

  const movedAt = moved ? slides.findIndex((slide) => slide.key === moved.key) : -1;
  const announcement =
    moved && movedAt >= 0 && movedAt !== moved.from ? t("movedTo", { position: movedAt + 1, total: slides.length }) : "";

  const moveBy = (key: string, delta: -1 | 1) => {
    setMoved({ key, from: slides.findIndex((slide) => slide.key === key) });
    onMoveBy(key, delta);
  };

  const onHandleKey = (event: KeyboardEvent<HTMLButtonElement>, key: string) => {
    const earlier = locale === "ar" ? "ArrowRight" : "ArrowLeft";
    const later = locale === "ar" ? "ArrowLeft" : "ArrowRight";
    if (event.key === "ArrowUp" || event.key === earlier) {
      event.preventDefault();
      moveBy(key, -1);
    } else if (event.key === "ArrowDown" || event.key === later) {
      event.preventDefault();
      moveBy(key, 1);
    }
  };

  const onDrop = (event: DragEvent<HTMLLIElement>, at: number) => {
    event.preventDefault();
    const key = dragging ?? event.dataTransfer.getData("text/plain");
    setDragging(null);
    if (!key) return;
    setMoved({ key, from: slides.findIndex((slide) => slide.key === key) });
    onMove(key, at);
  };

  return (
    <section aria-labelledby="hero-slides-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="hero-slides-heading" className="text-h4 text-[color:var(--color-text-primary)]">
          {t("slidesHeading")}{" "}
          <span className="text-body-sm font-normal text-[color:var(--color-text-secondary)]">
            {t("counter", { count: slides.length, max: HERO_SLIDE_MAX })}
          </span>
        </h2>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {slides.map((slide, at) => {
          const status = slideStatus(slide, now);
          const picture = slide.imageAssetId ? media.get(slide.imageAssetId) : undefined;
          const temporary = slideImageIds(slide).some((id) => media.get(id)?.isAiGenerated === true);
          const selected = slide.key === selectedKey;
          const title = slide.title[locale].trim() || t("untitled");
          const number = at + 1;
          return (
            <li
              key={slide.key}
              draggable
              data-slide-card=""
              data-dragging={dragging === slide.key ? "" : undefined}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", slide.key);
                setDragging(slide.key);
              }}
              onDragEnd={() => setDragging(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop(event, at)}
              className={`relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border bg-[color:var(--color-surface-raised)] transition-colors duration-[var(--motion-duration-fast)] data-[dragging]:opacity-60 ${
                selected
                  ? "border-2 border-[color:var(--color-brand-primary)]"
                  : "border-[color:var(--color-border-default)] hover:border-[color:var(--color-border-strong)] active:border-[color:var(--color-border-strong)]"
              }`}
            >
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(slide.key)}
                className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)] flex min-h-11 flex-col text-start active:bg-[color:var(--color-surface-sunken)]`}
              >
                <span className="relative block aspect-video w-full bg-[color:var(--color-surface-sunken)]">
                  {picture ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a thumbnail of a library picture, the same element MediaPicker uses.
                    <img
                      src={picture.url}
                      alt=""
                      className="size-full object-cover"
                      style={{ objectPosition: `${slide.desktopFocalPoint.x}% ${slide.desktopFocalPoint.y}%` }}
                    />
                  ) : null}
                </span>
                <span className="flex flex-col gap-1 p-3">
                  <span className="text-caption font-bold tabular-nums text-[color:var(--color-text-secondary)]">
                    {t("slideNumber", { number })}
                  </span>
                  <span className="line-clamp-2 text-label font-medium text-[color:var(--color-text-primary)]">{title}</span>
                  <span className="flex flex-wrap items-center gap-2 text-caption text-[color:var(--color-text-secondary)]">
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_MARK[status]}`} />
                      {t(STATUS_KEY[status])}
                    </span>
                    {temporary ? (
                      <span className="rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-warning)] px-1.5 font-medium text-[color:var(--color-semantic-warning-text)]">
                        {t("temporary")}
                      </span>
                    ) : null}
                    {changedKeys.has(slide.key) ? (
                      <span className="inline-flex items-center gap-1 font-medium text-[color:var(--color-text-primary)]">
                        <span aria-hidden="true" className="size-2 rounded-full border-2 border-[color:var(--color-brand-primary)]" />
                        {t("unsavedSlide")}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>

              <div className="flex items-center justify-between gap-1 border-t border-[color:var(--color-border-default)] p-1">
                <button
                  type="button"
                  aria-label={t("dragHandle", { number })}
                  onKeyDown={(event) => onHandleKey(event, slide.key)}
                  className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)] inline-flex size-11 cursor-grab items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-sunken)] hover:text-[color:var(--color-text-primary)] active:cursor-grabbing active:bg-[color:var(--color-surface-sunken)]`}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current">
                    <path d="M5 3h2v2H5zM9 3h2v2H9zM5 7h2v2H5zM9 7h2v2H9zM5 11h2v2H5zM9 11h2v2H9z" />
                  </svg>
                </button>
                <span className="flex items-center gap-1">
                  <Button variant="icon" aria-label={t("moveEarlier", { number })} disabled={at === 0} onClick={() => moveBy(slide.key, -1)}>
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current ltr:rotate-180">
                      <path d="M6 3l5 5-5 5-1.4-1.4L8.2 8 4.6 4.4z" />
                    </svg>
                  </Button>
                  <Button variant="icon" aria-label={t("moveLater", { number })} disabled={at === slides.length - 1} onClick={() => moveBy(slide.key, 1)}>
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current rtl:rotate-180">
                      <path d="M6 3l5 5-5 5-1.4-1.4L8.2 8 4.6 4.4z" />
                    </svg>
                  </Button>
                </span>
              </div>
            </li>
          );
        })}

        <li className="flex">
          {/* Kept at the limit, disabled, with the reason beside it: a control
              that disappears leaves nothing to explain why. */}
          <button
            type="button"
            onClick={onAdd}
            disabled={full}
            aria-describedby="hero-add-hint"
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)] flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[color:var(--color-border-strong)] p-4 text-label font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-brand-primary)] hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-sunken)] disabled:cursor-not-allowed disabled:border-[color:var(--color-border-default)] disabled:bg-transparent disabled:text-[color:var(--color-text-disabled)]`}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-5 fill-current">
              <path d="M7 2h2v5h5v2H9v5H7V9H2V7h5z" />
            </svg>
            {t("addSlide")}
            <span id="hero-add-hint" className="text-caption font-normal text-[color:var(--color-text-secondary)]">
              {full ? t("addLimit") : t("addHint")}
            </span>
          </button>
        </li>
      </ol>
    </section>
  );
};

// Memoised: the screen re-renders on every keystroke, and this part only has to
// when its own props change (the props it receives are kept stable for that).
export const SlideStrip = memo(SlideStripView);

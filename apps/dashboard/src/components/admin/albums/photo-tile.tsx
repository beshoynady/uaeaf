"use client";

import { useTranslations } from "next-intl";
import { BUTTON_GHOST, BUTTON_ICON, FOCUS_RING } from "@/components/ui/interactive";
import { UiIcon } from "@/lib/icons/ui-icons";
import { isGeneratedAlt } from "@/lib/admin/albums/generated-alt";
import type { AlbumPhoto } from "@/lib/admin/albums/types";

/**
 * One photo in the album grid.
 *
 * -- Two ways to move it, equal ------------------------------------------------
 *
 * The tile is draggable (native HTML5 drag and drop, no library), and it
 * carries "move back" and "move forward" buttons. The buttons are not a
 * fallback for the drag; they are the same act for anyone who does not use a
 * pointer, and they move one place per press so the result is predictable
 * from the keyboard. Both end in the same write: the album's complete order.
 *
 * "Back" and "forward" follow the reading direction, so the arrows swap sides
 * in Arabic with the grid itself.
 *
 * -- What the tile says without being opened ----------------------------------
 *
 * Its position, whether it is the cover, and whether its alternative text is
 * still the generated fallback — the three facts an editor arranging forty
 * photos needs at a glance. Everything else is in the details panel.
 */
export const PhotoTile = ({
  photo,
  index,
  count,
  isCover,
  selected,
  detailsOpen,
  dropTarget,
  canUpdate,
  busy,
  locale,
  onMove,
  onCover,
  onSelect,
  onDetails,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  photo: AlbumPhoto;
  index: number;
  count: number;
  isCover: boolean;
  selected: boolean;
  detailsOpen: boolean;
  /** A dragged photo is over this one and would land here. */
  dropTarget: boolean;
  canUpdate: boolean;
  busy: boolean;
  locale: "ar" | "en";
  onMove: (delta: -1 | 1) => void;
  onCover: () => void;
  onSelect: (selected: boolean) => void;
  onDetails: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) => {
  const t = useTranslations("Albums");
  const position = index + 1;
  const alt = photo.altText[locale] || photo.altText.ar || photo.altText.en;
  const movable = canUpdate && !busy;

  return (
    <li
      draggable={movable}
      onDragStart={(event) => {
        // Marked as a move of our own, so the upload drop zone — which
        // accepts files — can tell a reordering drag from a file drag.
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", photo.id);
        onDragStart();
      }}
      onDragOver={(event) => {
        if (!movable || event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDrop={(event) => {
        if (event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      aria-label={t("photoPosition", { position, count })}
      className={`flex flex-col overflow-hidden rounded-[var(--radius-md)] border bg-[color:var(--color-surface-raised)] ${
        dropTarget || selected
          ? "border-[color:var(--color-brand-primary)]"
          : "border-[color:var(--color-border-default)]"
      } ${movable ? "cursor-grab" : ""}`}
    >
      <div className="relative aspect-[4/3] bg-[color:var(--color-surface-sunken)]">
        {/* The alternative text the photo actually carries, so what a screen
            reader hears here is what a visitor's will hear. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={alt} loading="lazy" draggable={false} className="size-full object-cover" />

        <span className="absolute start-2 top-2 inline-flex min-h-6 items-center rounded-[var(--radius-full)] bg-[color:var(--color-surface-raised)] px-2 text-caption font-bold text-[color:var(--color-text-primary)]">
          {position}
        </span>
        {isCover ? (
          <span className="absolute end-2 top-2 inline-flex min-h-6 items-center rounded-[var(--radius-full)] bg-[color:var(--color-brand-primary)] px-2 text-caption font-bold text-[color:var(--color-text-on-brand)]">
            {t("coverBadge")}
          </span>
        ) : null}
        {isGeneratedAlt(photo.altText) ? (
          <span className="absolute bottom-2 start-2 inline-flex min-h-6 items-center rounded-[var(--radius-full)] bg-[color-mix(in_srgb,var(--color-semantic-warning)_10%,var(--color-surface-raised))] px-2 text-caption font-medium text-[color:var(--color-semantic-warning-text)]">
            {t("generatedAltBadge")}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1 p-2">
        {canUpdate ? (
          <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelect(event.target.checked)}
              aria-label={t("selectPhoto", { position })}
              className={`size-5 cursor-pointer accent-[color:var(--color-brand-primary)] ${FOCUS_RING}`}
            />
          </label>
        ) : null}

        {canUpdate ? (
          <>
            <button
              type="button"
              aria-label={t("moveBack", { position })}
              disabled={!movable || index === 0}
              onClick={() => onMove(-1)}
              className={BUTTON_ICON}
            >
              <UiIcon name="chevron-right" className="size-[var(--icon-size-xs)] rotate-180 rtl:rotate-0" />
            </button>
            <button
              type="button"
              aria-label={t("moveForward", { position })}
              disabled={!movable || index === count - 1}
              onClick={() => onMove(1)}
              className={BUTTON_ICON}
            >
              <UiIcon name="chevron-right" className="size-[var(--icon-size-xs)] rtl:-scale-x-100" />
            </button>
          </>
        ) : null}

        <button
          type="button"
          aria-expanded={detailsOpen}
          aria-label={t("photoDetailsFor", { position })}
          onClick={onDetails}
          className={BUTTON_ICON}
        >
          <UiIcon name="more-horizontal" className="size-[var(--icon-size-xs)]" />
        </button>

        {canUpdate && !isCover ? (
          <button type="button" disabled={busy} onClick={onCover} className={`${BUTTON_GHOST} ms-auto`}>
            {t("setCover")}
          </button>
        ) : null}
      </div>
    </li>
  );
};

"use client";

import { memo, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import type { PointLike } from "@uaeaf/content/hero";

/**
 * Choosing the point a picture's crop must keep in view.
 *
 * The whole picture is shown at its own proportions, so a point on screen is
 * the same percentage of the picture the site crops (`object-position`).
 * Three ways to set it, all ending in the same value:
 *
 * - **Pointer:** a press places the point; dragging moves it, captured so it
 *   follows past the picture's edge and stops at 0 or 100.
 * - **Keyboard:** the marker is a button; the arrow keys move it 1%, with Shift
 *   10%. Left and right are physical here: a point on a picture has no reading
 *   direction.
 * - Its accessible name says where it is, and a live line repeats it for
 *   screen readers as it moves.
 *
 * A translucent band shows where the site sets the text, so the editor keeps
 * the subject out of it: the right third of an Arabic landscape picture, the
 * left third of an English one, the bottom third of a phone picture.
 */

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const FocalPointPickerView = ({
  imageUrl,
  width,
  height,
  value,
  onChange,
  textZone,
  label,
}: {
  imageUrl: string;
  width: number;
  height: number;
  value: PointLike;
  onChange: (point: PointLike) => void;
  textZone: "right" | "left" | "bottom";
  label: string;
}) => {
  const t = useTranslations("HomepageHero");
  const frame = useRef<HTMLDivElement>(null);
  const helpId = useId();
  // State, not a ref: the live coordinates line goes quiet while dragging, so a
  // screen reader hears where the point settled rather than every step on the way.
  const [dragging, setDragging] = useState(false);

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    onChange({
      x: clamp(((event.clientX - box.left) / box.width) * 100),
      y: clamp(((event.clientY - box.top) / box.height) * 100),
    });
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, PointLike> = {
      ArrowLeft: { x: value.x - step, y: value.y },
      ArrowRight: { x: value.x + step, y: value.y },
      ArrowUp: { x: value.x, y: value.y - step },
      ArrowDown: { x: value.x, y: value.y + step },
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    onChange({ x: clamp(next.x), y: clamp(next.y) });
  };

  const zone =
    textZone === "bottom"
      ? "inset-x-0 bottom-0 h-1/3"
      : textZone === "right"
        ? "inset-y-0 right-0 w-1/3"
        : "inset-y-0 left-0 w-1/3";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-label font-medium text-[color:var(--color-text-secondary)]">{label}</p>
      <div
        ref={frame}
        dir="ltr"
        className="relative w-full max-w-md touch-none select-none overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-border-default)]"
        style={{ aspectRatio: `${width} / ${height}` }}
        onPointerDown={(event) => {
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          fromPointer(event);
        }}
        onPointerMove={(event) => {
          if (dragging) fromPointer(event);
        }}
        onPointerUp={() => {
          setDragging(false);
        }}
        onPointerCancel={() => {
          setDragging(false);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" draggable={false} className="absolute inset-0 size-full" />
        <div aria-hidden="true" className={`pointer-events-none absolute ${zone} bg-[color-mix(in_srgb,var(--color-surface-overlay)_45%,transparent)]`}>
          <span className="absolute start-2 top-2 rounded-[var(--radius-sm)] bg-[color:var(--color-surface-overlay)] px-1.5 py-0.5 text-caption text-[color:var(--color-text-on-brand)]">
            {t("textZone")}
          </span>
        </div>
        <button
          type="button"
          aria-label={t("focalControl", { x: value.x, y: value.y })}
          aria-describedby={helpId}
          onKeyDown={onKey}
          className="absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-full)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)] hover:scale-110 active:scale-95"
          style={{ left: `${value.x}%`, top: `${value.y}%` }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-2.5 rounded-[var(--radius-full)] border-[3px] border-[color:var(--color-text-on-brand)] bg-[color:var(--color-brand-primary)] shadow-card"
          />
        </button>
      </div>
      <p id={helpId} className="text-caption text-[color:var(--color-text-muted)]">
        {t("focalHelp")}
      </p>
      <p aria-live={dragging ? "off" : "polite"} className="text-caption font-medium text-[color:var(--color-text-secondary)]">
        {t("focalCoordinates", { x: value.x, y: value.y })}
      </p>
    </div>
  );
};

// Memoised: the screen re-renders on every keystroke, and this part only has to
// when its own props change (the props it receives are kept stable for that).
export const FocalPointPicker = memo(FocalPointPickerView);

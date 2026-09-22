import { ChevronIcon } from "@/components/ui/chevron-icon";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";

/** Round, 44px, on the section's own ground. The edge is `strong`, the edge of
 *  an object (ADR-0066 D1), where the canvas draws a hairline. */
const STEP =
  `${FOCUS} ${TRANSITION} inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border-strong)] text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-sunken)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)] disabled:hover:bg-transparent`;

/**
 * The previous and next steps of a carousel, and where the reader is in it
 * (`CMP-CAROUSEL-001`, Chapter 8 L6: manual navigation, never swipe alone).
 *
 * The dots are a picture of the position, not controls: at 8px they cannot
 * carry a 44px target without spreading apart, so the two steps are the
 * controls and the position is also said in words to a screen reader. The
 * current dot is wider as well as green, so it does not depend on colour.
 *
 * Presentational: the carousel that owns the scroll decides the page count
 * and what a step does.
 */
export const CarouselControls = ({
  pages,
  current,
  onPrevious,
  onNext,
  controls,
  labels,
}: {
  pages: number;
  current: number;
  onPrevious: () => void;
  onNext: () => void;
  /** The id of the track these controls move. */
  controls: string;
  labels: { previous: string; next: string; position: string };
}) => (
  <div className="flex items-center justify-center gap-5">
    <button
      type="button"
      className={STEP}
      aria-label={labels.previous}
      aria-controls={controls}
      disabled={current <= 0}
      onClick={onPrevious}
    >
      <ChevronIcon direction="back" />
    </button>

    <div aria-hidden="true" className="flex items-center gap-2">
      {Array.from({ length: pages }, (_, page) => (
        <span
          key={page}
          data-current={page === current ? "" : undefined}
          className={`block h-2 rounded-full transition-[width,background-color] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] ${
            page === current
              ? "w-5 bg-[color:var(--color-action-default)]"
              : "w-2 bg-[color:var(--color-border-strong)]"
          }`}
        />
      ))}
    </div>
    <p className="sr-only" aria-live="polite">
      {labels.position}
    </p>

    <button
      type="button"
      className={STEP}
      aria-label={labels.next}
      aria-controls={controls}
      disabled={current >= pages - 1}
      onClick={onNext}
    >
      <ChevronIcon direction="forward" />
    </button>
  </div>
);

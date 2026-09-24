import { BrandBorder } from "@uaeaf/brand-ui";

/**
 * The mark on the selected item of a section manager's list — the slide being
 * edited, the sponsor being edited.
 *
 * Two cues, never one (Chapter 12 §12.15.1 item 3, Chapter 6 §6.2 / WCAG
 * 1.4.1):
 *
 * - the library's `BrandBorder`, `static`, laid over the item's own edge. It is
 *   an overlay rather than a wrapper so the item keeps its own element, its
 *   drag handlers and its list semantics. Never `hover`: an operator's pointer
 *   crosses these rows constantly and motion following it is noise.
 * - a check in the item's inline-end corner, so a reader who cannot tell the
 *   tricolour from the neutral edge still sees which item is selected.
 *
 * Both are `aria-hidden` / decorative: the selected state is already announced
 * by `aria-current` on the item's own control, which this does not replace.
 *
 * The parent must be `position: relative`; both layers are absolutely placed
 * and ignore the pointer, so nothing underneath stops being operable.
 */
export const SelectedMark = ({ radius }: { radius: "md" | "lg" }) => {
  const rounded = radius === "lg" ? "rounded-[var(--radius-lg)]" : "rounded-[var(--radius-md)]";

  return (
    <>
      <BrandBorder variant="static" tone="tricolor" className={`pointer-events-none absolute inset-0 ${rounded}`} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute end-2 [inset-block-start:var(--space-2)] inline-flex size-6 items-center justify-center rounded-full bg-[color:var(--color-brand-primary)] text-[color:var(--color-text-on-brand)] shadow-card"
      >
        <svg
          viewBox="0 0 16 16"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 8.5 3.5 3.5L13 5" />
        </svg>
      </span>
    </>
  );
};

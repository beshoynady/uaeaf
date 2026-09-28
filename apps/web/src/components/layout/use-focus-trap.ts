import { useEffect, useRef, type RefObject } from "react";

/**
 * Focusable selector, deliberately with no visibility filter such as
 * `offsetParent`: that check is null for everything jsdom renders (it has no
 * layout engine), so a test suite would watch the trap do nothing and still
 * pass. `[hidden]` is a real DOM attribute the drawer's own closed panels set
 * (`MegaPanel`'s `hidden` prop), so a `:not(:has(...))`-free ancestor check
 * against it excludes exactly the content that is not actually reachable,
 * in a browser and under jsdom alike.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const isReachable = (node: HTMLElement) => node.closest("[hidden]") === null;

/**
 * True when `node` can actually take focus back: still in the document, and
 * still rendered (`display` resolves to something other than `none`).
 *
 * The trigger this restores to can vanish from under it — crossing the row
 * breakpoint with the drawer open hides that same trigger with `xl:hidden`
 * (a stylesheet rule, not a DOM attribute), and per the HTML focusing steps
 * `.focus()` on a boxless element is a silent no-op: it does not throw and it
 * does not move focus elsewhere, so an unguarded restore would just strand
 * focus wherever the trap left it. `getComputedStyle` reads the resolved
 * `display`, so a rule reached through a class is caught exactly like an
 * inline style — `getClientRects`/`offsetParent` were not used here because
 * jsdom answers both with nothing for every element regardless of visibility.
 */
const isRestorable = (node: HTMLElement) =>
  node.isConnected && getComputedStyle(node).display !== "none";

/**
 * Keeps Tab (and Shift+Tab) cycling inside `ref` while `active`, and restores
 * focus to whatever held it beforehand once `active` turns false.
 *
 * The focusable set is read fresh on every keypress, not captured once when
 * the trap engages: an accordion row opened inside the drawer adds links,
 * and a conditional item (e.g. a live-stream entry) can appear or vanish
 * between renders. A list captured at activation would go stale and trap
 * focus on elements that no longer exist, or ignore ones that now do.
 */
export const useFocusTrap = (ref: RefObject<HTMLElement | null>, active: boolean) => {
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    restoreTo.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isReachable);
      if (items.length === 0) return;

      const first = items[0]!;
      const last = items.at(-1)!;
      const at = document.activeElement;

      if (event.shiftKey && at === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && at === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const target = restoreTo.current;
      // No fallback target: the browser has already blurred an unrestorable
      // trigger, and refocusing a landmark instead would need an artificial
      // `tabindex="-1"` added solely for this moment.
      if (target && isRestorable(target)) target.focus();
    };
  }, [ref, active]);
};

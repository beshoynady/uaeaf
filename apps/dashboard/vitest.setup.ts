import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/**
 * No real Next.js App Router is mounted under Vitest/jsdom, so `next/navigation`'s
 * hooks (used internally by `next-intl`'s `usePathname`/`Link`) return `null`
 * instead of throwing — which crashes next-intl's `Link` on `href.pathname`.
 * Same stub apps/web uses, for the same reason.
 */
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    usePathname: () => "/",
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
  };
});

/**
 * jsdom 29 ships `HTMLDialogElement` with none of its methods: `showModal`,
 * `show` and `close` are all `undefined`. Without them every component built
 * on the platform's own modal crashes on mount under test.
 *
 * This shim implements only what the HTML specification says those three do,
 * and deliberately no more:
 *
 * - `showModal()` sets `open`, focuses the first focusable descendant, and
 *   makes `Esc` fire a cancelable `cancel` event followed by `close()`.
 * - `close()` clears `open`, fires `close`, and returns focus to whatever
 *   had it before.
 *
 * What it does NOT reproduce, and therefore what no test using it may claim:
 * the top layer, the `::backdrop` pseudo-element, inertness of the rest of
 * the page, and the focus trap. Those are the browser's, and they are
 * verified by opening the page, not here.
 */
const dialogPrototype = globalThis.HTMLDialogElement?.prototype;
if (dialogPrototype && typeof dialogPrototype.showModal !== "function") {
  const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const previouslyFocused = new WeakMap<HTMLDialogElement, Element | null>();

  function onKeyDown(this: HTMLDialogElement, event: KeyboardEvent) {
    if (event.key !== "Escape" || !this.open) {
      return;
    }
    event.preventDefault();
    const cancelled = !this.dispatchEvent(new Event("cancel", { cancelable: true }));
    if (!cancelled) {
      this.close();
    }
  }

  const handlers = new WeakMap<HTMLDialogElement, (event: KeyboardEvent) => void>();

  dialogPrototype.showModal = function showModal(this: HTMLDialogElement) {
    previouslyFocused.set(this, this.ownerDocument.activeElement);
    this.setAttribute("open", "");
    const handler = onKeyDown.bind(this);
    handlers.set(this, handler);
    this.ownerDocument.addEventListener("keydown", handler);
    this.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  };

  dialogPrototype.show = function show(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };

  dialogPrototype.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.open) {
      return;
    }
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.removeAttribute("open");
    const handler = handlers.get(this);
    if (handler) {
      this.ownerDocument.removeEventListener("keydown", handler);
      handlers.delete(this);
    }
    const restore = previouslyFocused.get(this);
    if (restore instanceof HTMLElement) {
      restore.focus();
    }
    this.dispatchEvent(new Event("close"));
  };
}

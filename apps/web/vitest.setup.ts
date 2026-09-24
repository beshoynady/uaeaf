import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/**
 * No real Next.js App Router is mounted under Vitest/jsdom, so `next/navigation`'s
 * hooks (used internally by `next-intl`'s `usePathname`/`Link`) return `null`
 * instead of throwing — which crashes next-intl's `Link` on `href.pathname`
 * (`typeof null === "object"`). Standard Next.js App Router test setup: stub the
 * hooks rather than mounting a real router.
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
 * jsdom implements no CSS media-query engine, so `window.matchMedia` does not
 * exist at all — a component that asks whether it is in the row layout, or
 * whether the device has a real pointer, throws before it renders.
 *
 * The stub answers `false` to every query, which is the same answer the server
 * snapshot gives: the stacked, no-hover layout. That is deliberate — it makes
 * the drawer, not the row, the shape every test asserts against unless the
 * test overrides it, and the drawer is the layer PR-006 calls mobile-priority.
 * A test that needs the row overrides `window.matchMedia` itself.
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

/**
 * jsdom implements no layout, so it ships no `ResizeObserver` — a component
 * that watches its own box for a size change throws on mount, before it
 * renders anything.
 *
 * The stub observes nothing and never fires, which is the truthful answer
 * here: nothing in jsdom ever changes size, so a faithful implementation would
 * also never call back. Components that read a measurement must therefore
 * behave correctly with the one they start with — which is the property worth
 * having anyway, since that is also what a real browser shows on first paint.
 */
class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: NoopResizeObserver,
});
globalThis.ResizeObserver = NoopResizeObserver;

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

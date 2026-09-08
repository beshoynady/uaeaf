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

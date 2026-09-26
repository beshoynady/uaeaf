import { useSyncExternalStore } from "react";
import { vi } from "vitest";

/**
 * A stand-in for `next/navigation`, as a module.
 *
 * Used as the whole factory rather than as a helper called inside one:
 *
 *   vi.mock("next/navigation", () => import("@/test/next-navigation"));
 *   import { navigation } from "@/test/next-navigation";
 *
 * `vi.mock` is hoisted above every import, so a factory that closes over a
 * variable declared in the spec throws "Cannot access before initialization".
 * Returning this module sidesteps that, and the spec still reaches the spies by
 * importing it normally — the same instance either way.
 *
 * ── Why `replace` really navigates ────────────────────────────────────────
 *
 * `EditorShell` keeps the selected tab in the URL: it reads `?tab=` through
 * `useSearchParams` and writes it with `router.replace` (ADR-0102 §D1). A
 * `replace` that only recorded the call would leave a test clicking a tab and
 * watching nothing happen — and the test would then be written around the
 * limitation, by reaching into the component's props or by asserting on the spy
 * instead of on the panel. So this mock models the one behaviour the component
 * depends on: `replace` updates the query and the subscribed hooks re-render.
 *
 * The spy is still there, for the tests that are about the call itself.
 */

const listeners = new Set<() => void>();
let params = new URLSearchParams();

const publish = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Takes `?tab=seo`, `/ar/news?tab=seo` or `?` — whatever a component passes to
 *  `replace`. Everything before the `?` is the path, which this mock does not
 *  model. */
const queryOf = (url: string): string => {
  const at = url.indexOf("?");
  return at === -1 ? "" : url.slice(at + 1);
};

const go = (url: string) => {
  params = new URLSearchParams(queryOf(url));
  publish();
};

const refresh = vi.fn();
const push = vi.fn((url: string) => go(url));
const replace = vi.fn((url: string) => go(url));

/** The spies, and the URL, for a spec to assert on or to set. */
export const navigation = {
  refresh,
  push,
  replace,
  /** Opens the spec on a different URL — `?tab=history`, say. */
  setSearch: (search: string) => {
    params = new URLSearchParams(search);
    publish();
  },
  reset: () => {
    refresh.mockClear();
    push.mockClear();
    replace.mockClear();
    params = new URLSearchParams();
    publish();
  },
};

export const useRouter = () => ({ refresh, push, replace });

/** Subscribed, so a `replace` re-renders the component that read it — which is
 *  how the real hook behaves and what makes a tab click testable. */
export const useSearchParams = () =>
  useSyncExternalStore(
    subscribe,
    () => params,
    () => params,
  );

export const usePathname = () => "/ar/test";

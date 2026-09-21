/**
 * Addresses a screen used to live at, and where it lives now.
 *
 * Plain data, in its own module, so `next.config.mjs` serves it and a unit
 * test can read it without loading the configuration's plugins
 * (`src/lib/legacy-redirects.spec.ts`). Next applies these before the proxy and
 * before it looks for a page, so a bookmark to the old address still arrives.
 *
 * The languages are written out because this file cannot import the
 * TypeScript routing config; the test fails if they drift from it.
 */
export const LEGACY_REDIRECTS = [
  // The approval policies moved from News to Users & Access (IA §4.8,
  // amended 2026-09-21, G3).
  {
    source: "/:locale(ar|en)/news/policies",
    destination: "/:locale/approval-policies",
    permanent: true,
  },
  {
    source: "/news/policies",
    destination: "/approval-policies",
    permanent: true,
  },
];

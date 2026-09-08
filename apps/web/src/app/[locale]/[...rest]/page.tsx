import { notFound } from "next/navigation";

/**
 * Catch-all, so an unmatched path inside a locale reaches the locale's own
 * 404 rather than the framework's.
 *
 * Without it, `/ar/about` falls through to Next.js's root `not-found`, which
 * renders outside `[locale]/layout.tsx` — no header, no footer, no `dir`, no
 * translations, and an English default in an Arabic session. next-intl's
 * documented App Router setup names this file as the fix.
 *
 * It is deliberately absent from `PUBLIC_PAGES`: it is not a page, it is the
 * absence of one, and `seo-contract.spec.ts` exempts it by name for that
 * reason rather than by pattern.
 */
export default function CatchAllNotFound() {
  notFound();
}

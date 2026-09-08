import { unstable_noStore } from "next/cache";

/**
 * Reads from the API's public surface.
 *
 * The public site talks to the same NestJS application the dashboard does,
 * but only to endpoints marked `@Public()` upstream — no session, no
 * credentials, no cookie forwarding. That is a deliberate difference from
 * `apps/dashboard`'s `fetchAsUser`: a page rendered for an anonymous visitor
 * must never carry an authenticated identity, or a cached response could
 * leak one reader's view to another.
 *
 * Every failure resolves to `null`. A federation's public site must render
 * when the API is slow, restarting, or not running at all — the alternative
 * is an error page for every visitor whenever a backend deploy takes ten
 * seconds. Callers decide what a `null` means for their page; most of them
 * have a documented answer, because Chapter 14 §11 already says a page
 * without its content stays `noindex` rather than shipping thin.
 */

const API_URL = process.env.UAEAF_API_URL ?? "http://localhost:3000";
const PREFIX = "/api/v1";

/**
 * Seconds before a cached response is considered stale.
 *
 * PENDING OWNER DECISION. No caching or freshness policy exists anywhere in
 * the design system — Chapter 21 (Technical Architecture) does not mention
 * revalidation, ISR or staleness at all. Sixty seconds is the conservative
 * reading of two documented pressures pulling in opposite directions:
 * Chapter 14 §7 makes Core Web Vitals an SEO requirement (argues for longer),
 * and Chapter 13's editorial model has editors publishing through the admin
 * panel and expecting to see the result (argues for shorter). It is a
 * placeholder for a ruling, not a derived value, and is recorded as such in
 * the slice report rather than presented as a design-system decision.
 */
export const PUBLIC_REVALIDATE_SECONDS = 60;

/** How long to wait before giving up on the API. Chapter 14 §7 again: a page
 *  that blocks on a hung upstream fails Core Web Vitals for every visitor,
 *  and a section that renders without its data is strictly better than a
 *  page that never renders. */
const TIMEOUT_MS = 4000;

export async function fetchPublic<T>(path: string): Promise<T | null> {
  const url = `${API_URL}${PREFIX}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    });

    // A singleton page that has never been saved returns 404, which is a
    // legitimate state rather than a fault — it means an editor has not
    // filled the page in yet.
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // Network refused, DNS failure, timeout, malformed JSON. All of them mean
    // the same thing to a page: there is no content to show right now.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Opt a render out of caching entirely. Exported so a future preview route
 *  has the escape hatch without reaching into Next internals itself. */
export { unstable_noStore as doNotCache };

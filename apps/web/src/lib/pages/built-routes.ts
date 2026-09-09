import { PUBLIC_PAGES } from "./public-pages";

/**
 * The routes that resolve today.
 *
 * The approved nine-item navigation (IA §8.1) and the footer's legal strip
 * point at destinations that have no page yet — `/about`, `/members`,
 * `/championships`, `/events/federation-events`, `/help`,
 * `/accessibility`, `/privacy`, `/terms`, `/sitemap`. Next.js prefetches every
 * `<Link>` that enters the viewport, so each of those fired a request that came
 * back 404: **451 of them across a 112-page sweep**, roughly ten per page load,
 * against a server that has to answer every one.
 *
 * Prefetching is switched off for those links until their pages exist. The
 * links themselves stay — IA §8.1 is the approved navigation and removing an
 * item would be an IA change — and they now reach a designed 404 rather than
 * the framework's default.
 *
 * Derived from the page registry rather than listed again here: a route
 * becomes prefetchable on the day its page is registered, with nothing else
 * to remember.
 */
const BUILT = new Set<string>(["/", ...PUBLIC_PAGES.map((page) => page.route)]);

export function isBuilt(route: string): boolean {
  return BUILT.has(route);
}

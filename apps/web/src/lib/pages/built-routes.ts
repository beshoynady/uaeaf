import { PREPARING_PAGES, PUBLIC_PAGES } from "./public-pages";

/**
 * The routes that resolve today: the homepage, every built page, and every
 * page in preparation.
 *
 * Next.js prefetches every `<Link>` that enters the viewport, and a link to a
 * route with no page answers that prefetch with a 404 (451 of them across a
 * 112-page sweep, roughly ten per page load, when the navigation's unbuilt
 * destinations had no page). The header and footer switch prefetching off for
 * any link whose route is not here.
 *
 * Derived from the page registry rather than listed again here: a route
 * becomes prefetchable on the day its page is registered, with nothing else
 * to remember.
 */
const BUILT = new Set<string>([
  "/",
  ...PUBLIC_PAGES.map((page) => page.route),
  ...PREPARING_PAGES.map((page) => page.route),
]);

export function isBuilt(route: string): boolean {
  return BUILT.has(route);
}

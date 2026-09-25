import type { BreadcrumbItem } from "@uaeaf/brand-ui";
import type { Crumb } from "@/components/ui/breadcrumb";
import type { AppLocale } from "@/i18n/routing";

/**
 * A page's trail as the kit's hero draws it.
 *
 * ── Why this is one function and not a `map` at each call site ──────────────
 *
 * `PageHero` marks every step without an `href` as `aria-current="page"`, which
 * is the right behaviour for the one step that *is* the current page and a false
 * statement about any other. A step with no destination of its own — "About" and
 * "Media Centre" have no landing page (IA §8.1) — therefore cannot be rendered
 * as a step at all; it has to be left out of the visible trail while staying in
 * the structured data, which describes the hierarchy rather than the links.
 *
 * Written out at each screen, that rule was applied in one place and missed in
 * two: `/about/board-members` and `/about/committees` each announced two current
 * pages. This is the same shape as the five copies of one search field that
 * carried one WCAG failure into five pages — so it is one function, and the
 * screens call it.
 *
 * The last step is the current page and never a link, whatever its route says.
 */
export const visibleTrail = (trail: readonly Crumb[], locale: AppLocale): BreadcrumbItem[] => {
  const steps = trail.filter((crumb, index) => crumb.route !== null || index === trail.length - 1);

  return steps.map((crumb, index) => ({
    label: crumb.name,
    href:
      index === steps.length - 1 || crumb.route === null
        ? undefined
        : `/${locale}${crumb.route === "/" ? "" : crumb.route}`,
  }));
};

/**
 * The shortest trail that is still true for a page with none of its own.
 *
 * IA §8.5 makes a trail mandatory only from depth two, so a top-level page has
 * no hierarchy to show — but the kit's hero draws a trail row whenever it is
 * given one, and an empty row is worse than a short one. "Home / this page" is
 * what the listing pages show there.
 */
export const rootTrail = (home: string, title: string, locale: AppLocale): BreadcrumbItem[] => [
  { label: home, href: `/${locale}` },
  { label: title },
];

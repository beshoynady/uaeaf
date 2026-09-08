import { Link } from "@/i18n/navigation";
import { REGISTER_CLASSES, type Register } from "./section";

export interface Crumb {
  name: string;
  /** `null` for a section that groups pages but has no landing page of its
   *  own — `/about` and `/media` are both real levels of the IA hierarchy and
   *  neither is a destination. A crumb without a route renders as text, not
   *  as a link that 404s. */
  route: string | null;
}

/**
 * IA §8.5: `Home / Section / Subsection / Object`, mandatory from depth ≥ 2.
 *
 * The last crumb is the current page and is not a link — it carries
 * `aria-current="page"` instead. A link to the page you are already on is a
 * keyboard stop that does nothing, and screen readers announce it as a
 * navigation option that is not one.
 *
 * The separator is a CSS-generated character on the list item rather than
 * markup, so it is never read out. Rendering "/" as text makes a screen
 * reader announce "slash" between every level.
 */
export function Breadcrumb({
  trail,
  label,
  register,
}: {
  trail: readonly Crumb[];
  /** Accessible name for the landmark — several navs can share a page, so
   *  each needs its own name (WCAG 2.1 §1.3.1). */
  label: string;
  register: Register;
}) {
  const tone = REGISTER_CLASSES[register];

  return (
    <nav aria-label={label} className="mb-4">
      <ol className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-caption ${tone.muted}`}>
        {trail.map((crumb, index) => {
          const isCurrent = index === trail.length - 1;
          return (
            <li
              key={`${crumb.name}-${index}`}
              className="flex items-center gap-x-2 before:content-['/'] before:opacity-50 first:before:hidden"
            >
              {crumb.route && !isCurrent ? (
                <Link
                  href={crumb.route}
                  className="rounded-xs underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
                >
                  {crumb.name}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined}>{crumb.name}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

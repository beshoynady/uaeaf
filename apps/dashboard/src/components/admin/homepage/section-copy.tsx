import { HOMEPAGE_SECTIONS } from "@/lib/admin/homepage/sections";

/**
 * The names and one-line descriptions for every section, read from the
 * `Homepage` namespace once.
 *
 * Built here rather than in each screen because two screens draw the same list
 * — the management page and the rail on every section editor — and a second
 * copy of "which message key names which section" is a second place for them
 * to drift.
 *
 * A section the registry does not name falls through to its raw type, which is
 * ugly and correct: the reader can still see it, order it and hide it, and the
 * ugliness is the signal that the registry needs the new entry.
 */
export const sectionCopy = (t: (key: string) => string) => {
  const names: Record<string, string> = {};
  const descriptions: Record<string, string> = {};

  for (const { messageKey } of HOMEPAGE_SECTIONS) {
    names[messageKey] = t(`section.${messageKey}.name`);
    descriptions[messageKey] = t(`section.${messageKey}.description`);
  }

  return { names, descriptions };
};

/**
 * Opens the public homepage in a new tab.
 *
 * A plain `<a>`, not the localised `Link`: it leaves this application for the
 * public site, which is a different origin in every environment but this one.
 * `rel="noopener"` because `target="_blank"` otherwise hands the opened page a
 * reference back to this one.
 */
export const HomepagePreviewLink = ({ label }: { label: string }) => (
  <a
    href={process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "http://localhost:3001"}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] px-4 text-body-sm font-semibold text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface-skeleton)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
  >
    {label}
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="size-[var(--icon-size-xs)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  </a>
);

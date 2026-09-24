import type { ReactNode } from "react";

/**
 * The top of an administration screen: where it sits, what it is, and what can
 * be done to it.
 *
 * `breadcrumb` and `actions` are both optional and both additive — every
 * screen that called this with a title and a description still draws exactly
 * what it drew before.
 *
 * -- The trail is a list, not a sentence ------------------------------------
 *
 * An `<ol>` inside a `<nav>`, with the separators `aria-hidden`. Written as
 * "Content / Homepage" in one string it reads to a screen reader as a path
 * with a slash in the middle of it, and the last item — the page you are on —
 * is not distinguishable from the ancestors that are links.
 *
 * -- Actions sit in the header, not above the form --------------------------
 *
 * The approved design puts Save and Preview beside the title. A form's own
 * sticky bar is for a long authoring form where the actions must follow the
 * reader down the page (`StickyFormActions`); a settings screen that fits on
 * one or two screens does not need the bar to move, and two bars would be two
 * places to look for the same button.
 */
export const PageHeader = ({
  title,
  description,
  breadcrumb,
  actions,
}: {
  title: string;
  description?: string;
  /** Ancestors first; the current page is added as the last, unlinked item. */
  breadcrumb?: { label: string; href?: string }[];
  actions?: ReactNode;
}) => {
  return (
    <header className="flex flex-col gap-2 border-b border-[color:var(--color-border-default)] pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {breadcrumb && breadcrumb.length > 0 ? (
            <nav aria-label={title}>
              <ol className="flex flex-wrap items-center gap-1.5 text-caption text-[color:var(--color-text-muted)]">
                {breadcrumb.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                    {index > 0 ? <span aria-hidden="true">/</span> : null}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="rounded-[var(--radius-xs)] underline-offset-4 hover:text-[color:var(--color-text-primary)] hover:underline active:bg-[color:var(--color-surface-skeleton)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)]"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <h1 className="text-h3 text-[color:var(--color-text-primary)]">{title}</h1>
          {description ? (
            <p className="max-w-[70ch] text-body-sm text-[color:var(--color-text-muted)]">{description}</p>
          ) : null}
        </div>

        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  );
};

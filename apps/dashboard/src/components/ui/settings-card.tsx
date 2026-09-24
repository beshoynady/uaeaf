import type { ReactNode } from "react";

/**
 * One group of settings, on its own card.
 *
 * -- Why this and not `FormSection` -----------------------------------------
 *
 * `FormSection` is a numbered `<details>` for a long authoring form: it
 * collapses, it counts itself, and it reports whether its required fields are
 * filled. A settings screen is none of those things — the approved design
 * draws flat white cards that are always open, unnumbered, and grouped by
 * subject rather than by step. Bending `FormSection` into that would mean four
 * new props that switch off most of what it is.
 *
 * -- The header is optional --------------------------------------------------
 *
 * A card that is one control with its own label does not need a heading above
 * it repeating the same word. When `title` is given it is a real heading, so
 * the screen can still be skimmed by heading — a settings page whose group
 * names are plain `<p>` gives a screen-reader user no way to move between
 * groups.
 */
export const SettingsCard = ({
  title,
  description,
  actions,
  children,
  as: Heading = "h2",
}: {
  title?: string;
  description?: string;
  /** Drawn opposite the title: the section's own on/off switch, usually. */
  actions?: ReactNode;
  children?: ReactNode;
  as?: "h2" | "h3";
}) => (
  <section className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-6">
    {title || actions ? (
      <div className="flex flex-wrap items-start justify-between gap-4">
        {title ? (
          <div className="flex min-w-0 flex-col gap-1">
            <Heading className="text-h4 text-[color:var(--color-text-primary)]">{title}</Heading>
            {description ? (
              <p className="max-w-prose text-body-sm text-[color:var(--color-text-secondary)]">{description}</p>
            ) : null}
          </div>
        ) : null}
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    ) : null}
    {children}
  </section>
);

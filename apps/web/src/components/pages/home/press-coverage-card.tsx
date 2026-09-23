import type { ReactNode } from "react";
import { CARD_INTERACTIVE_LG } from "@/components/ui/surface";
import { FOCUS, TEXT_TARGET } from "@/components/ui/interactive";

const ExternalIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className="size-[13px] shrink-0"
  >
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
  </svg>
);

/**
 * One piece of coverage another outlet published (Homepage Specification
 * §11b, `CT-EXTERNALMEDIA-001`; approved canvas 2026-09-22).
 *
 * Two shapes of one card. `full` is the homepage carousel's, unchanged.
 * `compact` is the newsroom sidebar's row from `NewsListing.dc.html`: the same
 * content and the same link rules at a 424px measure, where a 132px logo panel
 * above a two-line headline would fill the column with three items.
 *
 * A variant rather than a second component, because everything that matters
 * here is the same in both — the publication leads, the only way out is the
 * external link, and there is no link to a page of the federation's own. A
 * separate widget would be free to quietly lose one of those.
 *
 * Built so it cannot pass for the federation's own story: the publication
 * leads, and the only way out is the external link, which carries its icon,
 * opens a new window and says so in its accessible name. There is no link to
 * a page of the federation's own, because none exists per item (ADR-0042).
 *
 * The logo panel is one flat recessed ground where the canvas draws a
 * gradient: a gradient between two steps of one family carries nothing a
 * reader can decode (ADR-0065 R2).
 */
export const PressCoverageCard = ({
  logo,
  publication,
  title,
  excerpt,
  date,
  href,
  labels,
  variant = "full",
}: {
  /** The publication's logo, or what stands in for it. */
  logo: ReactNode;
  publication: string;
  title: string;
  excerpt: string | null;
  /** `dateTime` when the value is a real date; a placeholder has none. */
  date: { label: string; dateTime?: string };
  href: string;
  labels: { read: string; readLabel: string };
  /** `full` for the homepage carousel, `compact` for the sidebar row. */
  variant?: "full" | "compact";
}) =>
  variant === "compact" ? (
    // A row, not a card: the sidebar already draws the panel these sit in, and
    // a card inside a card is two edges saying the same thing. The separator
    // between rows is the parent's, so the last row has none.
    <article className="flex items-start gap-3 py-3">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] text-caption font-bold text-[color:var(--color-text-secondary)]">
        {logo}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-caption font-bold text-[color:var(--color-text-secondary)]">{publication}</span>
        {/* The headline is the link here, so the row is one target and one tab
            stop, and the accessible name is the headline rather than "read". */}
        <h3 className="line-clamp-2 text-body-sm font-bold text-[color:var(--color-text-primary)]">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.readLabel}
            className={`${TEXT_TARGET} ${FOCUS} inline rounded-xs underline-offset-4 hover:underline`}
          >
            {title}
            <ExternalIcon />
          </a>
        </h3>
      </div>
    </article>
  ) : (
  <article className={`${CARD_INTERACTIVE_LG} flex h-full flex-col overflow-hidden p-0`}>
    <div className="flex h-[132px] shrink-0 items-center justify-center bg-[color:var(--color-surface-sunken)] text-caption font-bold text-[color:var(--color-text-secondary)]">
      {logo}
    </div>
    <div className="flex flex-1 flex-col gap-2.5 px-4.5 pb-5 pt-4.5">
      <span className="text-caption font-bold text-[color:var(--color-text-secondary)]">{publication}</span>
      <h3 className="line-clamp-2 text-title font-bold text-[color:var(--color-text-primary)]">{title}</h3>
      {excerpt ? (
        <p className="line-clamp-2 text-body-sm text-[color:var(--color-text-secondary)]">{excerpt}</p>
      ) : null}
      <div className="mt-auto pt-1.5">
        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border-default)] pt-3">
          {date.dateTime ? (
            <time dateTime={date.dateTime} className="text-caption text-[color:var(--color-text-secondary)]">
              {date.label}
            </time>
          ) : (
            <span className="text-caption text-[color:var(--color-text-secondary)]">{date.label}</span>
          )}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.readLabel}
            className={`${TEXT_TARGET} ${FOCUS} inline-flex items-center gap-1 rounded-xs text-label font-bold text-[color:var(--color-text-link)] underline-offset-4 hover:underline`}
          >
            {labels.read}
            <ExternalIcon />
          </a>
        </div>
      </div>
    </div>
  </article>
  );

import type { ReactNode } from "react";

import { BrandAccentBar } from "../accent/brand-accent-bar";
import { BrandBorder } from "../accent/brand-border";
import { Button } from "../controls/button";

/**
 * Which category the document belongs to. The colour follows the category and
 * is fixed — never per item (ADR-0065 D3). Green for regulations, red for
 * policies.
 */
export type DocumentCategory = "regulation" | "policy" | "guide";

export type DocumentCardProps = {
  title: string;
  description?: string;
  /** The document type as shown on the badge, already localised. */
  typeLabel: string;
  category: DocumentCategory;
  /**
   * Already formatted for the active locale. Absent when the document has no
   * published date — and then **nothing is rendered**, not a dash: a dash is a
   * value a reader has to interpret, and every reader interprets it
   * differently.
   */
  date?: string;
  /** Formatted size, e.g. "1.2 MB". Absent when unknown; again, nothing shown. */
  size?: string;
  /**
   * Localised terms for the two metadata values, rendered for assistive
   * technology only.
   *
   * A definition list whose terms are hidden still needs the *right* terms: a
   * screen-reader user hears "published, 12 March 2026" rather than a bare
   * date floating between two buttons. Required whenever the matching value is
   * provided, which the description list below enforces by rendering neither
   * without both.
   */
  dateLabel?: string;
  sizeLabel?: string;
  viewHref: string;
  viewLabel: string;
  downloadHref: string;
  /**
   * The download control is an icon, so it needs its own name — and the name
   * has to say *which* document, because a page of these otherwise announces
   * "download" fourteen times.
   */
  downloadLabel: string;
  /**
   * The federation's founding regulation is one card on one page. It takes the
   * ink header and a static tricolour edge instead of its category's colour.
   */
  featured?: boolean;
  /** A short extra badge on the featured card, e.g. "الأساسية". */
  featuredBadge?: string;
  /** `hover` on the public site; the dashboard passes nothing (Chapter 12 §12.15.1). */
  borderVariant?: "static" | "hover";
  icon?: ReactNode;
  className?: string;
};

const TONE_BY_CATEGORY = {
  regulation: "green",
  policy: "red",
  guide: "tricolor",
} as const;

/**
 * A document as a card: a coloured header carrying the type, a neutral body
 * carrying the text and the two controls.
 *
 * The body is always neutral. The header is where the category colour lives,
 * which keeps the coloured area away from the text a reader has to read and
 * satisfies Chapter 27 §20's rule that content sits on a flat token surface.
 *
 * Absent metadata is absent. `date` and `size` render nothing at all when they
 * are missing — no dash, no "—", no empty row holding space. The original
 * specification called this out, and it is the one behaviour here with a
 * dedicated test.
 *
 * Server Component: the hover border is CSS, and both controls are links.
 */
export const DocumentCard = ({
  title,
  description,
  typeLabel,
  category,
  date,
  size,
  dateLabel,
  sizeLabel,
  viewHref,
  viewLabel,
  downloadHref,
  downloadLabel,
  featured = false,
  featuredBadge,
  borderVariant = "static",
  icon,
  className,
}: DocumentCardProps) => {
  // A value is shown only when its term is too. Half a definition list is
  // worse than none: the value renders, the term does not, and a screen reader
  // reads a date with no idea what it dates.
  const showDate = date !== undefined && dateLabel !== undefined;
  const showSize = size !== undefined && sizeLabel !== undefined;

  return (
    <BrandBorder
      as="article"
      variant={borderVariant}
      tone={featured ? "tricolor" : TONE_BY_CATEGORY[category]}
      className={["brand-document-card", className].filter(Boolean).join(" ")}
    >
      <div
        className="brand-document-card__header"
        data-category={category}
        data-featured={featured ? "true" : undefined}
      >
        {/* The featured card's header is the ink surface, so it needs the same
            non-surface edge every ink surface needs (ADR-0098 §8.4). */}
        {featured ? <BrandAccentBar className="brand-document-card__edge" /> : null}
        <span className="brand-document-card__type">{typeLabel}</span>
        {featured && featuredBadge !== undefined ? (
          <span className="brand-document-card__featured-badge">{featuredBadge}</span>
        ) : null}
        {icon === undefined ? null : (
          <span className="brand-document-card__icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      {/* Its own neutral plate, and therefore its own surface: without this the
          card inherits the section's ink and paints white text on white. */}
      <div className="brand-document-card__body" data-surface="raised">
        <h3 className="brand-document-card__title">{title}</h3>
        {description === undefined ? null : (
          <p className="brand-document-card__description">{description}</p>
        )}

        {showDate || showSize ? (
          <dl className="brand-document-card__meta">
            {showDate ? (
              <div>
                <dt className="brand-visually-hidden">{dateLabel}</dt>
                <dd>{date}</dd>
              </div>
            ) : null}
            {showSize ? (
              <div>
                <dt className="brand-visually-hidden">{sizeLabel}</dt>
                <dd>{size}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="brand-document-card__actions">
          <Button href={viewHref} variant="secondary">
            {viewLabel}
          </Button>
          <a
            className="brand-document-card__download"
            href={downloadHref}
            aria-label={downloadLabel}
            download
          >
            <span aria-hidden="true">&darr;</span>
          </a>
        </div>
      </div>
    </BrandBorder>
  );
};

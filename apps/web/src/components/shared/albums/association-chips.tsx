import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND_FOCUSABLE } from "@uaeaf/brand-ui";
import { narrowestAffiliation } from "@/lib/albums/affiliations";
import type { AssociationChipsProps } from "./types";
import "./albums.css";

/**
 * The occasion an album belongs to, as a row of chips.
 *
 * Each chip names its kind in words before the occasion's name — «بطولة:»,
 * «منافسة:», «فعالية:» — so a reader who cannot tell the plates apart, and a
 * screen reader, both learn it from the chip itself (WCAG 1.4.1, ADR-0065
 * D3c: a category's label is always shown as text). The plate's colour, which
 * `albums.css` chooses from the kind within each placement, only makes that
 * word quicker to find.
 *
 * An album with no affiliation renders nothing at all, not an empty row: a
 * card that sometimes has a blank strip over its photograph reads as broken.
 *
 * Server Component. A `media` chip is never a link, because on a card it sits
 * inside the card's own link and a link inside a link is invalid and
 * unreachable by keyboard.
 */
export const AssociationChips = ({ items, placement, className }: AssociationChipsProps) => {
  const t = useTranslations("albums.chips");

  const shown =
    placement === "media" ? [narrowestAffiliation(items)].filter((item) => item !== undefined) : items;
  if (shown.length === 0) return null;

  return (
    <ul
      className={["album-chips", className].filter(Boolean).join(" ")}
      data-placement={placement}
      aria-label={t("label")}
    >
      {shown.map((item) => {
        // One line of text as the chip's only flex item, so an ellipsis cuts
        // the end of the name and never the kind word in front of it.
        const content = (
          <span className="album-chip__text">
            <span className="album-chip__kind">{t(`kind_${item.kind}`)}:</span> {item.label}
          </span>
        );

        return (
          <li key={`${item.kind}:${item.id}`} className="flex min-w-0">
            {placement === "hero" && item.href ? (
              <Link href={item.href} className={`album-chip text-caption ${BRAND_FOCUSABLE}`} data-kind={item.kind}>
                {content}
              </Link>
            ) : (
              <span className="album-chip text-caption" data-kind={item.kind}>
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

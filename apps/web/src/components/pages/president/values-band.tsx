import type { CSSProperties } from "react";
import { PHOTO_PANEL, PhotoGround } from "@/components/ui/photo-ground";
import { Section } from "@/components/ui/section";
import { CARD, CARD_ICON } from "@/components/ui/surface";
import type { AppLocale } from "@/i18n/routing";
import type { PresidentMessagePublic, PublicImage } from "@/lib/api/types";
import { ValueIcon } from "@/lib/icons/value-icons";

/**
 * The values band (`page-president-message.md` §7.4, §7.5-2).
 *
 * - The page's own `green` register; Figma's `#0d1f12` matches no register.
 * - Cards are the shared `CARD` recipe as it stands, standing on the green
 *   band (owner decision 2026-09-13; PENDING FIGMA BACK-SYNC). They are not
 *   links, so they carry no lift (§7.4 I5).
 * - One green icon chip for every value (PM-D23), the vendored glyph the
 *   editor picked. Icon, title and text on the reading edge (PM-D27).
 * - The grid collapses as extracted (§1.3 rule 4): five across from `xl`, two
 *   from `md` with an odd last card taking the whole row, one on a phone.
 *   Cards in a row share its height (PM-D12). Gaps: 16px on a phone as
 *   extracted, 24px from `md` as on the board-members grid (Figma's 20px is
 *   not on the spacing scale).
 *
 * With a photograph (Vision & Mission's `valuesImage`, a field on its record:
 * owner rule 2026-09-14), the band stands on it in a panel the width of the
 * container under the shared scrim, and the cards are unchanged. The
 * President's Message passes none and keeps the green register.
 *
 * Each card is marked for the one-shot reveal: the chip rises from 92%, the
 * words follow two steps later, and the script staggers cards that enter the
 * view together in reading order. The surface itself never moves.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

export const ValuesBand = ({
  record,
  locale,
  titleId = "president-values-title",
  field,
  ground = null,
}: {
  /** Also the federation's values on Vision & Mission (ADR-0070), passed in
   *  this shape. */
  record: Pick<PresidentMessagePublic, "values" | "valuesTitle">;
  locale: AppLocale;
  titleId?: string;
  /** The stored field the list prints, for a page whose text is compared
   *  against the stored record in a browser: marks the list and each card's
   *  title and description. */
  field?: string;
  /** The band's stored photograph, where the page's record has one. */
  ground?: PublicImage | null;
}) => {
  const values = [...record.values].sort((a, b) => a.displayOrder - b.displayOrder);
  if (values.length === 0) return null;

  const title = record.valuesTitle?.[locale];
  const odd = values.length % 2 === 1;
  // Five across from `xl` for five values; six, as on Vision & Mission, stand
  // three across in two rows (Figma `1160:2166`), never five and one.
  const wide = values.length % 3 === 0 && values.length % 5 !== 0 ? "xl:grid-cols-3" : "xl:grid-cols-5";

  const body = (
    <>
      {title ? (
        <div data-reveal="">
          <h2 id={titleId} data-reveal-part="rise" className="text-h2 text-balance">
            {title}
          </h2>
        </div>
      ) : null}

      <ul data-field={field} className={`${title ? "mt-8" : ""} grid gap-4 md:grid-cols-2 md:gap-6 ${wide}`}>
        {values.map((value, index) => (
          <li
            key={`${value.displayOrder}-${value.iconKey}`}
            data-reveal=""
            className={`${CARD} flex flex-col items-start gap-4 px-6 py-8 text-start ${
              odd && index === values.length - 1 ? "md:max-xl:col-span-2" : ""
            }`}
          >
            <span data-reveal-part="chip" style={revealStep(0)} className={`${CARD_ICON} size-14`}>
              <ValueIcon iconKey={value.iconKey} className="size-6" />
            </span>
            <div data-reveal-part="rise" style={revealStep(2)}>
              <h3
                data-part={field ? "title" : undefined}
                className="text-h4 text-balance text-[color:var(--color-text-primary)]"
              >
                {value.title[locale]}
              </h3>
              <p
                data-part={field ? "description" : undefined}
                className="mt-2 text-body-sm text-pretty text-[color:var(--color-text-secondary)]"
              >
                {value.description[locale]}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );

  if (ground) {
    return (
      <Section enter={false} labelledBy={title ? titleId : undefined} className="py-12 md:py-16">
        <div className={`${PHOTO_PANEL} px-6 py-10 md:px-12 md:py-14`}>
          <PhotoGround image={ground} locale={locale} />
          {body}
        </div>
      </Section>
    );
  }

  return (
    <Section register="green" enter={false} labelledBy={title ? titleId : undefined} className="py-12 md:py-16">
      {body}
    </Section>
  );
};

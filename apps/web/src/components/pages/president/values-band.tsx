import { AccentRule } from "@/components/ui/accent-rule";
import { ItemCard, itemTone } from "@/components/ui/item-card";
import { Section } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { PresidentMessagePublic } from "@/lib/api/types";

/**
 * The values band (`page-president-message.md` §7.4; ADR-0072 D1, D5).
 *
 * - On the green register on both pages: the President's Message's own, and
 *   Vision & Mission's after the goals, where the neutral grounds alone did not
 *   show the seam (ADR-0074 D2). The neutral register stays available.
 * - Each value is an `ItemCard` in the colour its position gives it, with the
 *   glyph the editor picked in the item's ink and no chip; no number, because
 *   the values are not ordered. Not links, so no lift and no arrow.
 * - The heading is marked by the accent rule, in the band's own text colour on
 *   the green register.
 * - The grid collapses as extracted (§1.3 rule 4): five across from `xl`, two
 *   from `md` with an odd last card taking the whole row, one on a phone.
 *   Cards in a row share its height (PM-D12). Gaps: 16px on a phone, 24px from
 *   `md`.
 *
 * Each card is marked for the one-shot reveal, and cards that enter the view
 * together follow one another in reading order.
 */

export const ValuesBand = ({
  record,
  locale,
  titleId = "president-values-title",
  field,
  register = "green",
  ground = "base",
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
  register?: "green" | "neutral";
  /** The neutral register's ground, where the band stands on it. */
  ground?: "base" | "sunken";
}) => {
  const values = [...record.values].sort((a, b) => a.displayOrder - b.displayOrder);
  if (values.length === 0) return null;

  const title = record.valuesTitle?.[locale];
  const odd = values.length % 2 === 1;
  // Five across from `xl` for five values; six, as on Vision & Mission, stand
  // three across in two rows (Figma `1160:2166`), never five and one.
  const wide = values.length % 3 === 0 && values.length % 5 !== 0 ? "xl:grid-cols-3" : "xl:grid-cols-5";

  return (
    <Section
      register={register}
      ground={ground}
      enter={false}
      labelledBy={title ? titleId : undefined}
      className="py-12 md:py-16 lg:py-24"
    >
      {title ? (
        <div data-reveal="">
          <h2 id={titleId} data-reveal-part="rise" className="flex items-center gap-4 text-h2 text-balance">
            <AccentRule onRegister={register === "green"} />
            {title}
          </h2>
        </div>
      ) : null}

      <ul data-field={field} className={`${title ? "mt-8 md:mt-12" : ""} grid gap-4 md:grid-cols-2 md:gap-6 ${wide}`}>
        {values.map((value, index) => (
          <ItemCard
            key={`${value.displayOrder}-${value.iconKey}`}
            tone={itemTone(index)}
            iconKey={value.iconKey}
            title={value.title[locale]}
            description={value.description[locale]}
            field={Boolean(field)}
            className={odd && index === values.length - 1 ? "md:max-xl:col-span-2" : ""}
          />
        ))}
      </ul>
    </Section>
  );
};

import type { CSSProperties } from "react";
import { Section } from "@/components/ui/section";
import { CARD, CARD_ICON } from "@/components/ui/surface";
import type { AppLocale } from "@/i18n/routing";
import type { PresidentMessagePublic } from "@/lib/api/types";
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
 * Each card is marked for the one-shot reveal: the chip rises from 92%, the
 * words follow two steps later, and the script staggers cards that enter the
 * view together in reading order. The surface itself never moves.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

export const ValuesBand = ({ record, locale }: { record: PresidentMessagePublic; locale: AppLocale }) => {
  const values = [...record.values].sort((a, b) => a.displayOrder - b.displayOrder);
  if (values.length === 0) return null;

  const title = record.valuesTitle?.[locale];
  const titleId = "president-values-title";
  const odd = values.length % 2 === 1;

  return (
    <Section register="green" enter={false} labelledBy={title ? titleId : undefined} className="py-12 md:py-16">
      {title ? (
        <div data-reveal="">
          <h2 id={titleId} data-reveal-part="rise" className="text-h2 text-balance">
            {title}
          </h2>
        </div>
      ) : null}

      <ul className={`${title ? "mt-8" : ""} grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-5`}>
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
              <h3 className="text-h4 text-balance text-[color:var(--color-text-primary)]">{value.title[locale]}</h3>
              <p className="mt-2 text-body-sm text-pretty text-[color:var(--color-text-secondary)]">
                {value.description[locale]}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
};

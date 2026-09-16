import type { CSSProperties } from "react";
import { MEASURE } from "@/components/pages/president/president-message";
import { AccentRule } from "@/components/ui/accent-rule";
import { SeamLines } from "@/components/ui/identity-hero";
import { ItemCard, itemTone } from "@/components/ui/item-card";
import { Section } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, PlanItemPublic } from "@/lib/api/types";

/**
 * The strategic pillars, «محاورنا الاستراتيجية» (Figma `757:202`): a card
 * grid on the base ground after the green timeline band (ADR-0075).
 *
 * - The goals' heading pattern: the stored heading is the `h2` with the
 *   accent rule, and the stored paragraph follows at `body-lg`, at Chapter 4
 *   §4.6's measure so it stays clear of the strokes in the far corner.
 * - An ordered list of `ItemCard`s, numbered 01–06 and coloured by position
 *   (ADR-0072 D1). Figma numbers the pillars, and the frame's green accent bar
 *   and the six loose accent hues are replaced by the item palette. No icon:
 *   the frame draws none.
 * - Identity strokes below the seam with the band before, from `md`
 *   (`SeamLines placement="below" from="md"`, ADR-0075 M0-B): the
 *   section-scale element rule 1 asks for, standing wholly on the page's
 *   ground. On a phone the heading spans the line and no corner stays 32px
 *   clear of it (IL-5 measured 3.7–11px at 360), so the strokes are not drawn
 *   there and the finding is recorded for that width.
 * - One column on a phone, two from `md`, three from `xl`, as the goals.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

export const PlanPillars = ({
  pillars,
  title,
  text,
  locale,
}: {
  pillars: readonly PlanItemPublic[];
  title: LocalizedText;
  text: LocalizedText | null;
  locale: AppLocale;
}) => {
  const ordered = [...pillars].sort((a, b) => a.displayOrder - b.displayOrder);
  if (ordered.length === 0) return null;

  const titleId = "strategic-plan-pillars-title";

  return (
    <Section enter={false} labelledBy={titleId} ground="base" className="relative py-12 md:py-16 lg:py-24">
      <SeamLines placement="below" from="md" />
      <div data-reveal="">
        <h2
          id={titleId}
          data-reveal-part="rise"
          className="flex items-center gap-4 text-h2 text-balance text-[color:var(--color-text-primary)]"
        >
          <AccentRule />
          <span data-field="pillarsTitle">{title[locale]}</span>
        </h2>
        {text ? (
          <p
            data-field="pillarsText"
            data-reveal-part="rise"
            style={revealStep(1)}
            className={`mt-2 ${MEASURE[locale]} text-body-lg text-pretty text-[color:var(--color-text-secondary)]`}
          >
            {text[locale]}
          </p>
        ) : null}
      </div>

      <ol data-field="pillars" className="mt-8 grid gap-4 md:mt-12 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {ordered.map((pillar, index) => (
          <ItemCard
            key={pillar.id}
            tone={itemTone(index)}
            number={String(index + 1).padStart(2, "0")}
            title={pillar.title[locale]}
            description={pillar.description[locale]}
            field
          />
        ))}
      </ol>
    </Section>
  );
};

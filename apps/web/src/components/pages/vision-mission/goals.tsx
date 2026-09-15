import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { AccentRule } from "@/components/ui/accent-rule";
import { SeamLines } from "@/components/ui/identity-hero";
import { ItemCard, itemTone } from "@/components/ui/item-card";
import { Section } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { VisionMissionPublic } from "@/lib/api/types";

/**
 * The strategic goals (Figma `1499:2258`), on the base ground after the
 * mission's sunken one (ADR-0072 D5).
 *
 * - The values' heading pattern, as the reference sets it: "Goals" is the `h2`
 *   at its size, marked by the accent rule, and the stored sentence follows at
 *   `body-lg` in the secondary tier.
 * - An ordered list. The goals are numbered in every frame, and the strategic
 *   plan refers to them by number, so the number is content: the list carries
 *   it for assistive technology, and the card prints it for the eye.
 * - Each goal is an `ItemCard` in the colour its position gives it, with its
 *   number and the icon its record names (ADR-0072 D1; the icon field, owner
 *   approval 2026-09-15). Not links, so no lift and no arrow.
 * - One column on a phone, two from `md`, three from `xl` (Figma's 3 × 2).
 *   Gaps 16px, then 24px from `md`.
 * - Identity strokes on the seam with the mission, in the corner the heading
 *   leaves empty (`SeamLines`). The base and sunken grounds alone do not show
 *   where one section ends, and the cards and the accent rule do not read as
 *   the section's identity (owner brief 2026-09-15 §4.2–4.3; ADR-0073 D2).
 *
 * Each card rises once when it enters the view, one after another.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

export const StrategicGoals = async ({ record, locale }: { record: VisionMissionPublic; locale: AppLocale }) => {
  const goals = [...record.strategicGoals].sort((a, b) => a.displayOrder - b.displayOrder);
  if (goals.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "VisionMission" });
  const titleId = "vision-mission-goals-title";

  return (
    <Section enter={false} labelledBy={titleId} ground="base" className="relative py-12 md:py-16 lg:py-24">
      <SeamLines />
      <div data-reveal="">
        <h2
          id={titleId}
          data-reveal-part="rise"
          className="flex items-center gap-4 text-h2 text-balance text-[color:var(--color-text-primary)]"
        >
          <AccentRule />
          {t("goals")}
        </h2>
        {record.goalsTitle ? (
          <p
            data-field="goalsTitle"
            data-reveal-part="rise"
            style={revealStep(1)}
            className="mt-2 text-body-lg text-pretty text-[color:var(--color-text-secondary)]"
          >
            {record.goalsTitle[locale]}
          </p>
        ) : null}
      </div>

      <ol data-field="strategicGoals" className="mt-8 grid gap-4 md:mt-12 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {goals.map((goal, index) => (
          <ItemCard
            key={goal.displayOrder}
            tone={itemTone(index)}
            number={String(index + 1).padStart(2, "0")}
            iconKey={goal.iconKey}
            title={goal.title[locale]}
            description={goal.description[locale]}
            field
          />
        ))}
      </ol>
    </Section>
  );
};

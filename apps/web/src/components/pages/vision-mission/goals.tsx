import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { CARD } from "@/components/ui/surface";
import type { AppLocale } from "@/i18n/routing";
import type { VisionMissionPublic } from "@/lib/api/types";

/**
 * The strategic goals (Figma `1499:2258`), on the neutral band after the two
 * statements (ADR-0070).
 *
 * - The same heading pattern as the statements: "Goals" is the `h2`, the
 *   stored sentence takes the h2 size under it.
 * - An ordered list. The goals are numbered in every frame, and the strategic
 *   plan refers to them by number, so the number is content: the list carries
 *   it for assistive technology, and the card prints it for the eye.
 * - The shared `CARD` recipe as it stands; not links, so no lift (§7.4 I5).
 *   Figma's six tinted grounds are colour for decoration (ADR-0065 R2) and are
 *   not drawn.
 * - The grid collapses as the values band does: one column on a phone, two
 *   from `md`, and three from `xl`, which is Figma's 3 × 2. Gaps 16px, then
 *   24px from `md`.
 *
 * Each card rises once when it enters the view; the surface itself never moves.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

export const StrategicGoals = async ({ record, locale }: { record: VisionMissionPublic; locale: AppLocale }) => {
  const goals = [...record.strategicGoals].sort((a, b) => a.displayOrder - b.displayOrder);
  if (goals.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "VisionMission" });
  const titleId = "vision-mission-goals-title";

  return (
    <Section enter={false} labelledBy={titleId} className="pb-12 md:pb-16">
      <div data-reveal="">
        <h2
          id={titleId}
          data-reveal-part="rise"
          className="text-label font-bold text-[color:var(--color-text-secondary)]"
        >
          {t("goals")}
        </h2>
        {record.goalsTitle ? (
          <p
            data-field="goalsTitle"
            data-reveal-part="rise"
            style={revealStep(1)}
            className="mt-2 text-h2 text-balance text-[color:var(--color-text-primary)]"
          >
            {record.goalsTitle[locale]}
          </p>
        ) : null}
      </div>

      <ol data-field="strategicGoals" className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {goals.map((goal, index) => (
          <li key={goal.displayOrder} data-reveal="" className={`${CARD} flex flex-col gap-4 px-6 py-8 text-start`}>
            <span
              aria-hidden="true"
              data-reveal-part="rise"
              style={revealStep(0)}
              className="text-display-l tabular-nums text-[color:var(--color-text-muted)]"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div data-reveal-part="rise" style={revealStep(1)}>
              <h3 data-part="title" className="text-h4 text-balance text-[color:var(--color-text-primary)]">
                {goal.title[locale]}
              </h3>
              <p data-part="description" className="mt-2 text-body-sm text-pretty text-[color:var(--color-text-secondary)]">
                {goal.description[locale]}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
};

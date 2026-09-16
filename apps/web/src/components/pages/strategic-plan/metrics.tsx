import { AccentRule } from "@/components/ui/accent-rule";
import { itemInk, itemTone } from "@/components/ui/item-card";
import { Section } from "@/components/ui/section";
import { SlantedPhoto } from "@/components/ui/slanted-photo";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, PlanMetricPublic, PublicImage } from "@/lib/api/types";
import { CountUp } from "./count-up";

/**
 * The key performance indicators, «نقيس التقدم، ونصنع الأثر» (Figma
 * `758:202`): figures beside a photograph on the base ground (ADR-0075).
 *
 * - Figma sets four filled cards in blue, teal and orange on a black panel.
 *   Those hues are outside the palette; the figures stand on the page's ground
 *   in the item inks their positions give them (ADR-0072 D1), a closed set of
 *   four, at Display L — the size the goals' and the objectives' numbers take.
 * - A photograph at the end of the reading line, mirroring the objectives'
 *   at the start, so the two sections meet at their seam as a mirrored pair
 *   (rule 3, rule 5's one allowed pair).
 * - Each figure counts up once when it enters the view (`CountUp`); the
 *   label under it at `body`, never below Chapter 4 §4.10's 13px (the frame's
 *   12px labels are not kept).
 * - Not numbered and not ordered: a `ul`.
 */
export const PlanMetrics = ({
  metrics,
  title,
  label,
  image,
  locale,
  sizes,
}: {
  metrics: readonly PlanMetricPublic[];
  title: LocalizedText;
  /** The list's accessible name. */
  label: string;
  image: PublicImage | null;
  locale: AppLocale;
  sizes: string;
}) => {
  const ordered = [...metrics].sort((a, b) => a.displayOrder - b.displayOrder);
  if (ordered.length === 0) return null;

  const titleId = "strategic-plan-metrics-title";

  return (
    <Section enter={false} labelledBy={titleId} ground="base" className="relative isolate overflow-clip py-12 md:py-16 lg:py-24">
      <div className={image ? "grid gap-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8" : undefined}>
        <div className={`min-w-0 ${image ? "lg:col-span-7 lg:col-start-1" : ""}`}>
          <div data-reveal="">
            <h2
              id={titleId}
              data-reveal-part="rise"
              className="flex items-center gap-4 text-h2 text-balance text-[color:var(--color-text-primary)]"
            >
              <AccentRule />
              <span data-field="metricsTitle">{title[locale]}</span>
            </h2>
          </div>

          <ul data-field="metrics" aria-label={label} className="mt-8 grid gap-6 sm:grid-cols-2 md:mt-12 md:gap-8">
            {ordered.map((metric, index) => (
              <li key={metric.id} data-reveal="" className="flex flex-col gap-2">
                <span data-reveal-part="numeral" className="block">
                  <CountUp value={metric.value} className={`text-display-l tabular-nums ${itemInk(itemTone(index))}`} />
                </span>
                <p data-part="label" className="text-body text-pretty text-[color:var(--color-text-secondary)]">
                  {metric.label[locale]}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {image ? <SlantedPhoto image={image} locale={locale} side="end" sizes={sizes} /> : null}
      </div>
    </Section>
  );
};

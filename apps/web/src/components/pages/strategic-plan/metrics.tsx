import { SectionHeading, Surface } from "@uaeaf/brand-ui";
import { CONTAINER } from "@/components/ui/section";
import { SlantedPhoto } from "@/components/ui/slanted-photo";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, PlanMetricPublic, PublicImage } from "@/lib/api/types";
import { CountUp } from "./count-up";

/**
 * The key performance indicators, «نقيس التقدم، ونصنع الأثر»: figures beside a
 * photograph on a full-bleed ink surface with the mesh.
 *
 * - Ink because the figures are the plan's proof, and the one dark band in the
 *   page's run of canvas sections is where the eye lands. The mesh is the
 *   section's required edge cue (ADR-0098 §8.4): ink measures 1.05:1 against
 *   the dark page ground.
 * - Every word here is the surface's one white tier — the figures, the labels
 *   and the heading alike. Hierarchy is size: the figures at Display L, the
 *   labels at `body` (never below Chapter 4 §4.10's 13px). The pastel item
 *   inks the figures used to take are gone.
 * - A photograph at the end of the reading line, mirroring the objectives' at
 *   the start (`SlantedPhoto`; the kit's `SplitFeature` takes project assets
 *   only, and this is a stored Cloudinary asset).
 * - Each figure counts up once when it enters the view (`CountUp`).
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

  return (
    <Surface kind="ink" mesh className="overflow-clip">
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        <div className={image ? "grid gap-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8" : undefined}>
          <div className={`min-w-0 ${image ? "lg:col-span-7 lg:col-start-1" : ""}`}>
            <SectionHeading title={<span data-field="metricsTitle">{title[locale]}</span>} />

            <ul data-field="metrics" aria-label={label} className="grid gap-6 sm:grid-cols-2 md:gap-8">
              {ordered.map((metric) => (
                <li key={metric.id} data-reveal="" className="flex flex-col gap-2">
                  <span data-reveal-part="numeral" className="block">
                    <CountUp value={metric.value} className="text-display-l tabular-nums text-[color:var(--surface-text)]" />
                  </span>
                  <p data-part="label" className="text-body text-pretty text-[color:var(--surface-text)]">
                    {metric.label[locale]}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {image ? <SlantedPhoto image={image} locale={locale} side="end" sizes={sizes} /> : null}
        </div>
      </div>
    </Surface>
  );
};

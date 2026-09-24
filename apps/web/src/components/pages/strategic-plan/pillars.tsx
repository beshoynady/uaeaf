import { FEATURE_CYCLE, FeatureCard, SectionHeading, Surface } from "@uaeaf/brand-ui";
import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, PlanItemPublic } from "@/lib/api/types";

/**
 * The strategic pillars, «محاورنا الاستراتيجية»: a card grid on a canvas
 * surface with the mesh, after the green phases band.
 *
 * - The stored heading is the kit's `SectionHeading`, and the stored paragraph
 *   is its description.
 * - An ordered list of `FeatureCard`s, numbered 01–06 as ghost ordinals, whose
 *   grounds cycle green, ink, red by position (`FEATURE_CYCLE`). This replaces
 *   the pastel item palette (owner flag): the pillars are the federation's own
 *   axes, so they carry its own colours. No icon: the record stores none.
 * - One column on a phone, two from `md`, three from `xl`.
 */
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

  return (
    <Surface kind="canvas" mesh>
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        <SectionHeading
          title={<span data-field="pillarsTitle">{title[locale]}</span>}
          description={text ? <span data-field="pillarsText">{text[locale]}</span> : undefined}
        />

        <ol data-field="pillars" className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
          {ordered.map((pillar, index) => (
            <li key={pillar.id}>
              <FeatureCard
                className="h-full"
                tone={FEATURE_CYCLE[index % FEATURE_CYCLE.length]}
                ordinal={String(index + 1).padStart(2, "0")}
                title={<span data-part="title">{pillar.title[locale]}</span>}
                description={<span data-part="description">{pillar.description[locale]}</span>}
              />
            </li>
          ))}
        </ol>
      </div>
    </Surface>
  );
};

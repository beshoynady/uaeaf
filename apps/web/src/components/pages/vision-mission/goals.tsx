import { getTranslations } from "next-intl/server";
import { FEATURE_CYCLE, FeatureCard, SectionHeading, Surface } from "@uaeaf/brand-ui";
import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { VisionMissionPublic } from "@/lib/api/types";
import { ValueIcon } from "@/lib/icons/value-icons";

/**
 * The strategic goals, on a canvas surface with the mesh.
 *
 * - "Goals" is the kit's `SectionHeading`, and the stored sentence is its
 *   description.
 * - An ordered list: the strategic plan refers to the goals by number, so the
 *   number is content. The list carries it for assistive technology, and each
 *   card prints it as its ghost ordinal for the eye.
 * - Each goal is a `FeatureCard` whose ground cycles green, ink, red by
 *   position (`FEATURE_CYCLE`). This replaces the pastel item palette the
 *   owner flagged as off-identity: the goals are the federation's own
 *   statements, so they carry the federation's own colours. Ink always falls
 *   between green and red in the cycle, which keeps the two identity grounds
 *   from touching at card scale.
 * - The icon the record names, in the card's one white ink.
 * - One column on a phone, two from `md`, three from `xl`.
 */
export const StrategicGoals = async ({ record, locale }: { record: VisionMissionPublic; locale: AppLocale }) => {
  const goals = [...record.strategicGoals].sort((a, b) => a.displayOrder - b.displayOrder);
  if (goals.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "VisionMission" });

  return (
    <Surface kind="canvas" mesh>
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        <SectionHeading
          title={t("goals")}
          description={record.goalsTitle ? <span data-field="goalsTitle">{record.goalsTitle[locale]}</span> : undefined}
        />

        <ol data-field="strategicGoals" className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
          {goals.map((goal, index) => (
            <li key={goal.displayOrder}>
              <FeatureCard
                className="h-full"
                tone={FEATURE_CYCLE[index % FEATURE_CYCLE.length]}
                ordinal={String(index + 1).padStart(2, "0")}
                icon={goal.iconKey ? <ValueIcon iconKey={goal.iconKey} className="size-8" /> : undefined}
                title={<span data-part="title">{goal.title[locale]}</span>}
                description={<span data-part="description">{goal.description[locale]}</span>}
              />
            </li>
          ))}
        </ol>
      </div>
    </Surface>
  );
};

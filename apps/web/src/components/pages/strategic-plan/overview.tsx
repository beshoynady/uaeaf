import { MEASURE } from "@/components/pages/president/president-message";
import { AccentRule } from "@/components/ui/accent-rule";
import { Section } from "@/components/ui/section";
import { SlantedPhoto } from "@/components/ui/slanted-photo";
import type { AppLocale } from "@/i18n/routing";
import type { StrategicPlanPublic } from "@/lib/api/types";

/**
 * The strategic overview, «خارطة طريق نحو المستقبل» (Figma `756:214`), as a
 * statement beside a photograph (ADR-0075): the first section after the hero.
 *
 * - The heading pattern of the goals: the stored heading is the `h2`, marked
 *   by the accent rule, and the stored paragraph follows at `body-lg` in the
 *   secondary tier at Chapter 4 §4.6's measure.
 * - The photograph stands at the start of the reading line from `lg`, so the
 *   timeline band after it takes the seam on its own and the words keep seven
 *   of the twelve columns (ADR-0072 D6). Without a photograph the words are
 *   one column, and the seam after the hero still marks this section.
 * - The heading and the paragraph rise once as a block; the picture slides
 *   in from the page edge inside its cut.
 */
export const PlanOverview = ({
  record,
  locale,
  sizes,
}: {
  record: Pick<StrategicPlanPublic, "introHeading" | "introText" | "introImage">;
  locale: AppLocale;
  /** The photograph's `sizes`, set from the crop this section shows. */
  sizes: string;
}) => {
  const titleId = "strategic-plan-overview-title";
  const image = record.introImage;

  return (
    <Section labelledBy={titleId} ground="base" enter={false} className="relative isolate overflow-clip py-12 md:py-16 lg:py-24">
      <div className={image ? "grid gap-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8" : undefined}>
        <div data-reveal="" className={`flex min-w-0 flex-col gap-4 ${image ? "lg:col-span-7 lg:col-start-6" : ""}`}>
          <h2
            id={titleId}
            data-reveal-part="rise"
            className="flex items-center gap-4 text-h2 text-balance text-[color:var(--color-text-primary)]"
          >
            <AccentRule />
            <span data-field="introHeading">{record.introHeading[locale]}</span>
          </h2>
          <p data-field="introText" className={`${MEASURE[locale]} text-body-lg text-pretty text-[color:var(--color-text-secondary)]`}>
            {record.introText[locale]}
          </p>
        </div>

        {image ? <SlantedPhoto image={image} locale={locale} side="start" sizes={sizes} /> : null}
      </div>
    </Section>
  );
};

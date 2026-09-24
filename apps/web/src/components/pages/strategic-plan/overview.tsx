import { SectionHeading, Surface } from "@uaeaf/brand-ui";
import { MEASURE } from "@/components/pages/president/president-message";
import { CONTAINER } from "@/components/ui/section";
import { SlantedPhoto } from "@/components/ui/slanted-photo";
import type { AppLocale } from "@/i18n/routing";
import type { StrategicPlanPublic } from "@/lib/api/types";

/**
 * The strategic overview, «خارطة طريق نحو المستقبل», as a statement beside a
 * photograph: the first section after the hero, on a canvas surface with the
 * mesh.
 *
 * - The stored heading is the kit's `SectionHeading`; the stored paragraph
 *   follows at `body-lg` at Chapter 4 §4.6's measure.
 * - The photograph stands at the start of the reading line from `lg`, and the
 *   words keep seven of the twelve columns. It stays the approved
 *   `SlantedPhoto` rather than the kit's `SplitFeature`, which renders through
 *   `next/image` and takes project assets only — this is a stored Cloudinary
 *   asset. Without a photograph the words are one column.
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
  const image = record.introImage;

  return (
    <Surface kind="canvas" mesh className="overflow-clip">
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        <div className={image ? "grid gap-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8" : undefined}>
          <div data-reveal="" className={`min-w-0 ${image ? "lg:col-span-7 lg:col-start-6" : ""}`}>
            <SectionHeading title={<span data-field="introHeading">{record.introHeading[locale]}</span>} />
            <p
              data-field="introText"
              className={`${MEASURE[locale]} text-body-lg text-pretty text-[color:var(--surface-text-muted)]`}
            >
              {record.introText[locale]}
            </p>
          </div>

          {image ? <SlantedPhoto image={image} locale={locale} side="start" sizes={sizes} /> : null}
        </div>
      </div>
    </Surface>
  );
};

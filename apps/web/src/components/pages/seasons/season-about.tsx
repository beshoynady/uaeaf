import { useTranslations } from "next-intl";
import { SectionHeading } from "@uaeaf/brand-ui";
import { Section } from "@/components/ui/section";
import { RECESS } from "@/components/ui/surface";
import { seasonWindow } from "@/lib/seasons/season-days";
import type { SeasonPublic } from "@/lib/seasons/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * About the season, and its closing summary once the season is over.
 *
 * "Over" is after the whole of the last Dubai day (`season-days.ts`). The API
 * also withholds the summary, from the start of the last day; checking here too
 * keeps the summary off the page for that final day.
 */
export const SeasonAbout = ({
  season,
  now,
  locale,
  ground,
}: {
  season: Pick<SeasonPublic, "about" | "closingSummary" | "startDate" | "endDate">;
  now: Date;
  locale: AppLocale;
  ground: "base" | "sunken";
}) => {
  const t = useTranslations("Seasons.about");
  const about = season.about[locale]?.trim();
  const isOver = now.getTime() >= seasonWindow(season.startDate, season.endDate).to.getTime();
  const closing = isOver ? season.closingSummary?.[locale]?.trim() : undefined;
  if (!about && !closing) return null;

  return (
    <Section ground={ground} labelledBy="season-about-heading" className="py-16">
      <div className="flex max-w-[68ch] flex-col gap-6">
        <SectionHeading title={<span id="season-about-heading">{t("heading")}</span>} />
        {about ? <p className="whitespace-pre-line text-body-lg">{about}</p> : null}
        {closing ? (
          <div className={`${RECESS} flex flex-col gap-2 p-6`} data-testid="season-closing">
            <h3 className="text-h4">{t("closingHeading")}</h3>
            <p className="whitespace-pre-line text-body">{closing}</p>
          </div>
        ) : null}
      </div>
    </Section>
  );
};

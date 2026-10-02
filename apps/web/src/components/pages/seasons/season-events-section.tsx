import { useTranslations } from "next-intl";
import { EmptyState, SectionHeading } from "@uaeaf/brand-ui";
import { Section } from "@/components/ui/section";

/**
 * The season's events — an empty state, and only that, until public events
 * exist (spec §4.1 point 4). The events module will add a data prop here; this
 * component does not guess at its shape. No count and no "all events" link: a
 * count of events the platform cannot read yet would be invented.
 */
export const SeasonEventsSection = ({ ground }: { ground: "base" | "sunken" }) => {
  const t = useTranslations("Seasons.events");

  return (
    <Section ground={ground} labelledBy="season-events-heading" className="py-16">
      <div className="flex flex-col gap-8">
        <SectionHeading title={<span id="season-events-heading">{t("heading")}</span>} />
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </div>
    </Section>
  );
};

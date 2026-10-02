import { useTranslations } from "next-intl";
import { Button } from "@uaeaf/brand-ui";
import { CARD_LINK } from "@/components/ui/interactive";
import { Section } from "@/components/ui/section";
import { CARD_INTERACTIVE } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import type { SeasonPublic } from "@/lib/seasons/types";
import type { AppLocale } from "@/i18n/routing";

type Neighbour = Pick<SeasonPublic, "slug" | "name"> | null;

/**
 * The seasons either side of this one in time, and the way back to the archive.
 * A side with no season is left empty rather than drawn as a disabled card: a
 * control that does nothing is a false affordance.
 */
export const SeasonNav = ({
  previous,
  next,
  locale,
  ground,
}: {
  previous: Neighbour;
  next: Neighbour;
  locale: AppLocale;
  ground: "base" | "sunken";
}) => {
  const t = useTranslations("Seasons.nav");

  return (
    <Section ground={ground} className="py-12">
      <nav aria-label={t("label")} className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <NeighbourCard season={previous} label={t("previous")} direction="previous" locale={locale} />
        <div className="flex justify-center">
          <Button variant="secondary" href="/seasons" linkComponent={Link}>
            {t("archive")}
          </Button>
        </div>
        <NeighbourCard season={next} label={t("next")} direction="next" locale={locale} />
      </nav>
    </Section>
  );
};

const NeighbourCard = ({
  season,
  label,
  direction,
  locale,
}: {
  season: Neighbour;
  label: string;
  direction: "previous" | "next";
  locale: AppLocale;
}) => {
  if (!season) return <div aria-hidden="true" />;

  return (
    <div className={`${CARD_INTERACTIVE} relative flex items-center gap-4 p-5 ${direction === "next" ? "flex-row-reverse text-end" : ""}`}>
      {/* The arrow points the way the reader moves through time, which reverses
          with the reading direction. */}
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={`size-5 shrink-0 ${direction === "previous" ? "rotate-180 rtl:rotate-0" : "rtl:rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5l7 7-7 7" />
      </svg>
      <span className="flex min-w-0 flex-col">
        <span className="text-caption text-[color:var(--color-text-secondary)]">{label}</span>
        <Link href={`/seasons/${season.slug}`} className={`text-title font-bold ${CARD_LINK}`}>
          {season.name[locale]}
        </Link>
      </span>
    </div>
  );
};

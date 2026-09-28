import { useTranslations } from "next-intl";
import { FeatureCard } from "@/components/layout/cards/feature-card";

/**
 * The About panel's featured card with no live data behind it yet.
 *
 * `tone="brand-green"` is an exact match for the panel's approved green.
 */
export const PresidentFallbackCard = () => {
  const t = useTranslations("HeaderCards");
  return (
    <FeatureCard
      tone="brand-green"
      eyebrow={t("presidentEyebrow")}
      title={t("presidentFallbackTitle")}
      href="/about/president"
      cta={t("presidentCta")}
    />
  );
};

/**
 * The Championships panel's featured card with no live data behind it yet.
 *
 * `tone="brand-red"` is an exact match for the panel's approved red.
 */
export const ChampionshipFallbackCard = () => {
  const t = useTranslations("HeaderCards");
  return (
    <FeatureCard
      tone="brand-red"
      eyebrow={t("championshipEyebrow")}
      title={t("championshipFallbackTitle")}
      href="/championships"
      cta={t("championshipCta")}
    />
  );
};

/**
 * The Events panel's featured card with no live data behind it yet.
 *
 * DESIGN DECISION REQUIRED: the Events panel's design colour is blue, and
 * `surfaces.css` defines no blue surface. `tone="section-black"` is the
 * nearest existing value, not an approved match — see the task report.
 */
export const EventFallbackCard = () => {
  const t = useTranslations("HeaderCards");
  return (
    <FeatureCard
      tone="section-black"
      eyebrow={t("eventEyebrow")}
      title={t("eventFallbackTitle")}
      href="/events?view=calendar"
      cta={t("eventCta")}
    />
  );
};

/**
 * The Athletics panel's featured card with no live data behind it yet.
 *
 * DESIGN DECISION REQUIRED: the Athletics panel's design colour is dark
 * blue, and `surfaces.css` defines no blue surface. `tone="section-black"`
 * is the nearest existing value, not an approved match — see the task
 * report. It is the same nearest value `EventFallbackCard` falls back to,
 * so the two panels read identically until the owner approves a distinct
 * token.
 */
export const ClubFinderCard = () => {
  const t = useTranslations("HeaderCards");
  return (
    <FeatureCard
      tone="section-black"
      eyebrow={t("clubFinderEyebrow")}
      title={t("clubFinderFallbackTitle")}
      href="/athletics#clubs"
      cta={t("clubFinderCta")}
    />
  );
};

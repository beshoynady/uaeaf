import { useTranslations } from "next-intl";
import { FeatureCard } from "@/components/layout/cards/feature-card";
import { ArticleTeaser } from "@/components/layout/cards/article-teaser";
import { SeasonPicker } from "@/components/layout/cards/season-picker";
import type { HeaderFeatures } from "@/lib/header/features";
import type { ReactNode } from "react";

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

/** The About panel's card once the President's Message has a live excerpt.
 *  Same eyebrow, tone and call to action as its fallback — only the title
 *  (the pull-quote itself) and the destination are real. */
export const PresidentCard = ({ quote, href }: { quote: string; href: string }) => {
  const t = useTranslations("HeaderCards");
  return (
    <FeatureCard tone="brand-green" eyebrow={t("presidentEyebrow")} title={quote} href={href} cta={t("presidentCta")} />
  );
};

/** The Championships panel's card once a next championship is served. Not
 *  reachable today — `HeaderFeatures.nextChampionship` has no reader yet
 *  (owned by a later project) — kept so that project only has to fill in the
 *  reader, not the card. */
export const ChampionshipCard = ({
  title,
  date,
  venue,
  href,
}: {
  title: string;
  date: string;
  venue: string;
  href: string;
}) => {
  const t = useTranslations("HeaderCards");
  return (
    <FeatureCard
      tone="brand-red"
      eyebrow={t("championshipEyebrow")}
      title={title}
      meta={[date, venue].filter(Boolean).join(" · ") || null}
      href={href}
      cta={t("championshipCta")}
    />
  );
};

/** The Events panel's card once a next event is served. Not reachable today
 *  — `HeaderFeatures.nextEvent` has no reader yet (owned by a later project)
 *  — and carries no countdown: the countdown needs `NextEventLike`'s full
 *  shape (`isVisible`, bilingual `label`/`name`/`venue`, `endsAt`), none of
 *  which `HeaderFeatures.nextEvent` has or should invent ahead of that
 *  project's own data model. */
export const EventCard = ({ title, href }: { title: string; href: string }) => {
  const t = useTranslations("HeaderCards");
  return (
    <FeatureCard tone="section-black" eyebrow={t("eventEyebrow")} title={title} href={href} cta={t("eventCta")} />
  );
};

/** The Media panel's card once a latest video is served. No fallback: a
 *  panel with nothing to promote is a shorter panel, not one with a
 *  placeholder in it. Eyebrow and call to action reuse `VideoSystem`'s own
 *  approved copy for this exact destination, rather than new text. */
export const VideoCard = ({ title, href }: { title: string; href: string }) => {
  const t = useTranslations("VideoSystem");
  return <FeatureCard tone="ink" eyebrow={t("eyebrow")} title={title} href={href} cta={t("libraryCta")} />;
};

/** The panel's card, or the standing card that stands in for it — `null` for
 *  a panel with no card at all (the Media panel with nothing to promote). */
export const panelFeature = (key: string, features: HeaderFeatures): ReactNode => {
  switch (key) {
    case "about":
      return features.presidentExcerpt ? (
        <PresidentCard quote={features.presidentExcerpt.quote} href={features.presidentExcerpt.href} />
      ) : (
        <PresidentFallbackCard />
      );
    case "athletics":
      return <ClubFinderCard />;
    case "championshipsResults":
      return features.nextChampionship ? (
        <ChampionshipCard {...features.nextChampionship} />
      ) : (
        <ChampionshipFallbackCard />
      );
    case "eventsSeasons":
      return features.nextEvent ? (
        <EventCard title={features.nextEvent.title} href={features.nextEvent.href} />
      ) : (
        <EventFallbackCard />
      );
    case "media":
      return features.latestVideo ? (
        <VideoCard title={features.latestVideo.title} href={features.latestVideo.href} />
      ) : null;
    default:
      return null;
  }
};

/** The panel's middle content track (design spec §5/§3.4/§3.5), or `null` for
 *  a panel with no such slot, or nothing to show in it yet: Events & Seasons'
 *  season picker and Media's latest article. Championships' season summary
 *  (§3.3) has no source yet. */
export const panelMiddle = (key: string, features: HeaderFeatures): ReactNode => {
  if (key === "eventsSeasons") {
    return features.seasons.length > 0 ? <SeasonPicker seasons={features.seasons} /> : null;
  }
  if (key !== "media" || !features.latestArticle) return null;
  return (
    <ArticleTeaser
      slug={features.latestArticle.slug}
      title={features.latestArticle.title}
      date={features.latestArticle.date}
      category={features.latestArticle.category}
      href={features.latestArticle.href}
      cover={features.latestArticle.cover}
    />
  );
};

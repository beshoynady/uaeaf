import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PressCoverageCard } from "@/components/pages/home/press-coverage-card";
import { ChevronIcon } from "@/components/ui/chevron-icon";
import { FOCUS, TEXT_TARGET } from "@/components/ui/interactive";
import { SocialChannelLink } from "@/components/ui/social-channel-link";
import { BADGE, LIFT } from "@/components/ui/surface";
import { ARTICLE_TOPICS } from "@/lib/api/types";
import { COVERAGE_PLACEHOLDER_COUNT, showsCoveragePlaceholders } from "@/lib/pages/media-coverage";
import { feedHref } from "@/lib/news/feed-query";
import { socialChannels } from "@/lib/social-channels";
import { loadSocialChannels } from "@/lib/pages/social-content";
import type { FeedQuery } from "@/lib/news/feed-query";
import type { ArticleTopic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The newsroom's sidebar (approved canvas `NewsListing.dc.html`, 2026-09-22).
 *
 * Three panels beside the listing: the federation's channels, the media
 * round-up slot, and the topics. It is `position: sticky` from `lg`, following
 * the pattern `president-message.tsx` already established, so it stays in view
 * while the reader works down a long feed.
 *
 * ── One component for both languages ───────────────────────────────────────
 *
 * Every edge here is logical — `border-s`, `ps-`, `text-start` — and the
 * column's side comes from the grid's own order under `dir`. There is no
 * Arabic copy and no English copy of this file; there is one, and it lands on
 * the correct side of the page because the document says which way it reads.
 *
 * ── The topic chips ────────────────────────────────────────────────────────
 *
 * These ARE the coloured `TopicBadge` palette, unlike the filter bar's chips
 * above the listing. The distinction is deliberate: the bar is the control a
 * reader operates while scanning, and it wears one pressed state so the
 * pressed one is obvious; this panel is a directory of the subjects, where the
 * colours are the point — a reader learns the palette here and then recognises
 * it on every card.
 */

/** The panel shell: the canvas's card at `radius.lg` with 24px of padding,
 *  both of which are steps of the approved scales. */
const PANEL =
  "flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] p-6";

/**
 * The canvas sets these panel headings at 16px/800. The type scale has no
 * 16px heading role — `text-title` is 18px and `text-h4` is 20px — so this
 * takes the nearest documented ROLE rather than the nearest number (Chapter 4
 * §8): a small panel heading is a title.
 */
const PANEL_HEADING = "text-title font-bold text-[color:var(--color-text-primary)]";

export const NewsSidebar = async ({ query, locale }: { query: FeedQuery; locale: AppLocale }) => {
  const t = await getTranslations({ locale, namespace: "News" });
  const tCoverage = await getTranslations({ locale, namespace: "HomeCoverage" });
  const tSocial = await getTranslations({ locale, namespace: "Social" });

  const { channels: links, icons } = await loadSocialChannels();
  const channels = socialChannels(links, icons, (key) => tSocial(key));

  return (
    // `self-start` is what lets `sticky` work inside a grid: a stretched item
    // is already as tall as the row, so it has nothing to stick within.
    <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-[var(--space-32)] lg:self-start">
      {channels.length > 0 ? (
        <section aria-labelledby="news-follow" className={PANEL}>
          <h2 id="news-follow" className={PANEL_HEADING}>
            {t("followHeading")}
          </h2>
          <ul className="flex list-none flex-wrap items-center gap-2.5 p-0">
            {channels.map((channel) => (
              <li key={channel.href}>
                {/* The same button the footer and the contact page draw. The
                    round shell is this panel's own: the canvas draws circles
                    here where the footer draws rounded squares. */}
                <SocialChannelLink channel={channel} className={`${LIFT} rounded-full`} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/*
       * "الاتحاد في الإعلام" — coverage other outlets published
       * (`CT-EXTERNALMEDIA-001`). Still the slot it has always been:
       * placeholders outside production, nothing at all inside it, and never
       * filled with the federation's own `FederationInMedia` articles, which
       * are its own reporting and live in the grid beside this.
       *
       * `id="news-in-media"` because the homepage's coverage section links to
       * `/news#news-in-media`. That anchor pointed at the article shelf this
       * page used to draw; the shelf is gone into the unified grid, and this
       * is the panel the link now means.
       */}
      {showsCoveragePlaceholders() ? (
        <section id="news-in-media" aria-labelledby="news-coverage" className={PANEL}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="news-coverage" className={PANEL_HEADING}>
              {tCoverage("heading")}
            </h2>
          </div>
          <ul className="flex list-none flex-col divide-y divide-[color:var(--color-border-default)] p-0">
            {Array.from({ length: COVERAGE_PLACEHOLDER_COUNT }, (_, index) => (
              <li key={index}>
                <PressCoverageCard
                  variant="compact"
                  // The short form the canvas itself draws in this 64px
                  // box. The carousel's long "[Publication logo 1]" overflows
                  // it, which is what a placeholder must never do: it would
                  // read as broken artwork rather than as absent artwork.
                  logo={tCoverage("placeholderLogoShort")}
                  publication={tCoverage("placeholderPublication")}
                  title={tCoverage("placeholderTitle")}
                  excerpt={null}
                  date={{ label: tCoverage("placeholderDate") }}
                  href="#"
                  labels={{ read: tCoverage("read"), readLabel: tCoverage("readLabel") }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="news-topics" className={PANEL}>
        <h2 id="news-topics" className={PANEL_HEADING}>
          {t("browseByTopic")}
        </h2>
        <ul className="flex list-none flex-wrap gap-2 p-0">
          {ARTICLE_TOPICS.map((topic: ArticleTopic) => (
            <li key={topic}>
              <Link
                href={feedHref(query, { topic })}
                aria-current={query.topic === topic ? "page" : undefined}
                className={`${BADGE} ${TEXT_TARGET} ${FOCUS} text-overline font-bold ${TOPIC_TONES[topic]}`}
              >
                {t(`topic_${topic}`)}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={feedHref(query, { topic: undefined })}
          className={`${TEXT_TARGET} ${FOCUS} inline-flex items-center gap-1 self-start rounded-xs text-label font-bold text-[color:var(--color-text-link)] underline-offset-4 hover:underline`}
        >
          {t("topicAll")}
          <ChevronIcon direction="forward" className="size-3.5" />
        </Link>
      </section>
    </aside>
  );
};

/**
 * The same tones `TopicBadge` paints, written out for the same reason it
 * writes them out: Tailwind generates only the class names it finds in the
 * source, so a name assembled at runtime is never styled.
 *
 * Deliberately not imported from `TopicBadge` — that component is a label with
 * no behaviour, and these are links. Sharing the component would mean a badge
 * that is sometimes a link, which is exactly the ambiguity the filter bar
 * above avoids by not being coloured at all.
 */
const TOPIC_TONES: Record<ArticleTopic, string> = {
  nationalTeam:
    "border-[color:var(--color-topic-national-team-edge)] bg-[color:var(--color-topic-national-team-surface)] text-[color:var(--color-topic-national-team-ink)]",
  training:
    "border-[color:var(--color-topic-training-edge)] bg-[color:var(--color-topic-training-surface)] text-[color:var(--color-topic-training-ink)]",
  youth:
    "border-[color:var(--color-topic-youth-edge)] bg-[color:var(--color-topic-youth-surface)] text-[color:var(--color-topic-youth-ink)]",
  international:
    "border-[color:var(--color-topic-international-edge)] bg-[color:var(--color-topic-international-surface)] text-[color:var(--color-topic-international-ink)]",
  community:
    "border-[color:var(--color-topic-community-edge)] bg-[color:var(--color-topic-community-surface)] text-[color:var(--color-topic-community-ink)]",
  records:
    "border-[color:var(--color-topic-records-edge)] bg-[color:var(--color-topic-records-surface)] text-[color:var(--color-topic-records-ink)]",
};

import { getTranslations } from "next-intl/server";
import { selectShowcase, sponsorStats } from "@uaeaf/content/sponsors";
import { SeamLines } from "@/components/ui/identity-hero";
import { FOCUS, TOUCH_TARGET, TRANSITION } from "@/components/ui/interactive";
import { Section } from "@/components/ui/section";
import { CARD } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, SponsorshipPublic } from "@/lib/api/types";
import { CardBadge, OrganizationCard } from "./organization-card";
import { SectionHeading } from "./section-heading";
import { SponsorBanner } from "./sponsor-banner";

/**
 * The sponsors section (ADR-0085 D5, D6): heading, figures, banner, grid, and
 * the partnership call to action when it has somewhere to go.
 *
 * - Which sponsorship fills the banner and which the grid is `selectShowcase`
 *   from `@uaeaf/content/sponsors`, the function the dashboard previews with:
 *   the highest tier present, never pinned to Strategic (D5.1).
 * - Absent, not empty, when no sponsorship is running at `now` (the API read is
 *   cached, so the window is asked again here).
 * - Neutral base ground after the strip's black band: the seam lines stand
 *   below the seam (ADR-0075 M0-B), from lg, as the section's identity element, and the
 *   register change is the separator (page rules 1 and 3).
 * - One level of cards: the grid sits in the section, not in a card (D3 #6);
 *   the container is the site's 1312 (D3 #7).
 * - The CTA's text and link are the section's own fields; with either missing
 *   nothing is drawn, because no page describes the programme yet.
 */

export interface SponsorsSectionSettings {
  ctaText: LocalizedText | null;
  ctaUrl: string | null;
  configuration: Record<string, unknown> | null;
  sectionTitle?: LocalizedText | null;
  sectionSubtitle?: LocalizedText | null;
}

const TITLE_ID = "home-sponsors-title";

const isExternal = (url: string) => /^https:\/\//i.test(url);

export const SponsorsSection = async ({
  sponsorships,
  section,
  locale,
  now = new Date(),
}: {
  sponsorships: readonly SponsorshipPublic[];
  section: SponsorsSectionSettings | null;
  locale: AppLocale;
  now?: Date;
}) => {
  const bannerSponsorshipId = section?.configuration?.bannerSponsorshipId;
  const { banner, grid } = selectShowcase(
    sponsorships.map((item) => ({ ...item, sponsorId: item.sponsor.id })),
    { bannerSponsorshipId: typeof bannerSponsorshipId === "string" ? bannerSponsorshipId : null },
    now,
  );
  if (!banner) return null;

  const t = await getTranslations({ locale, namespace: "HomeSponsors" });
  const stats = sponsorStats(
    sponsorships.map((item) => ({ ...item, sponsorId: item.sponsor.id })),
    now,
  );
  const cta = section?.ctaText && section.ctaUrl ? { text: section.ctaText[locale], url: section.ctaUrl } : null;

  return (
    <Section enter={false} labelledBy={TITLE_ID} ground="base" className="relative py-12 md:py-16 lg:py-24">
      {/* From lg: at md the heading spans the line and the strokes came 0–28px
          from it (IL-5, measured 2026-09-17), the President's finding. */}
      <SeamLines placement="below" from="lg" />
      <SectionHeading
        id={TITLE_ID}
        title={section?.sectionTitle?.[locale] ?? t("sponsors.title")}
        subtitle={section?.sectionSubtitle?.[locale] ?? t("sponsors.subtitle")}
      />

      {stats.length > 0 ? (
        <dl aria-label={t("sponsors.stats.label")} className="mt-8 grid grid-cols-3 gap-2 md:mt-12 md:gap-4">
          {stats.map((stat) => (
            <div key={stat.key} data-stat={stat.key} className={`flex flex-col items-center gap-1 p-3 text-center md:p-4 ${CARD}`}>
              <dt className="order-2 text-body-sm text-[color:var(--color-text-secondary)]">{t(`sponsors.stats.${stat.key}`)}</dt>
              <dd className="order-1 text-h2 font-black tabular-nums text-[color:var(--color-text-primary)]">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-8 md:mt-12">
        {await SponsorBanner({ sponsorship: banner, locale })}
      </div>

      {grid.length > 0 ? (
        <ul data-sponsor-grid="" data-reveal="" className="mt-6 flex flex-wrap justify-center gap-4">
          {grid.map((item) => (
            <OrganizationCard
              key={item.id}
              name={item.sponsor.name}
              logo={item.sponsor.logo}
              locale={locale}
              emphasis={item.isFeatured}
              badges={
                <>
                  <CardBadge>{t(`tiers.${item.tier}`)}</CardBadge>
                  {item.isFeatured ? <CardBadge strong>{t("sponsors.featured")}</CardBadge> : null}
                </>
              }
              details={
                item.sponsor.categoryLabel ? (
                  <p className="text-center text-body-sm text-[color:var(--color-text-secondary)]">{item.sponsor.categoryLabel[locale]}</p>
                ) : null
              }
            />
          ))}
        </ul>
      ) : null}

      {cta ? (
        <div data-sponsors-cta="" className="mt-8 flex justify-center md:mt-12">
          {isExternal(cta.url) ? (
            <a
              href={cta.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex ${TOUCH_TARGET} items-center justify-center rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] px-6 py-3 text-body-sm font-semibold text-[color:var(--button-primary-text)] hover:bg-[color:var(--button-primary-background-hover)] active:bg-[color:var(--button-primary-background-pressed)] ${TRANSITION} ${FOCUS}`}
            >
              {cta.text}
              <span className="sr-only"> ({t("sponsors.opensInNewTab")})</span>
            </a>
          ) : (
            <Link
              href={cta.url}
              className={`inline-flex ${TOUCH_TARGET} items-center justify-center rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] px-6 py-3 text-body-sm font-semibold text-[color:var(--button-primary-text)] hover:bg-[color:var(--button-primary-background-hover)] active:bg-[color:var(--button-primary-background-pressed)] ${TRANSITION} ${FOCUS}`}
            >
              {cta.text}
            </Link>
          )}
        </div>
      ) : null}
    </Section>
  );
};

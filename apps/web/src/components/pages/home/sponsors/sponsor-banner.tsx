import { getTranslations } from "next-intl/server";
import { displayName } from "@uaeaf/content/sponsors";
import { PhotoLines } from "@/components/ui/identity-hero";
import { FOCUS, TOUCH_TARGET, TRANSITION } from "@/components/ui/interactive";
import { REGISTER_CLASSES } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { SponsorshipPublic } from "@/lib/api/types";
import { sponsorTone } from "./organization-card";
import { OrganizationLogo } from "./organization-logo";
import { OrganizationName } from "./organization-name";
import { BrandBorder } from "@uaeaf/brand-ui";

/**
 * The sponsors section's banner (ADR-0085 D6): the sponsorship of the highest
 * tier present (D5.1), on the black register.
 *
 * - No photograph: the Figma ground was an industrial scene, which page rule 2
 *   does not publish. The black register is an official brand ground.
 * - The identity lines stand in the banner's inline-end corner (`PhotoLines`,
 *   red and green only, both above 3:1 on black). The text column keeps their
 *   footprint clear, which the identity-lines guard measures (IL-5).
 * - One tier label, from the data; no VIP badge (the banner is already the
 *   emphasis, ADR-0077 Risk 3); the name at H3; the scope line when stored.
 * - One action: the sponsor's website, in a new tab, its purpose and the new
 *   tab in its accessible name (WCAG 2.4.4, 3.2.5).
 */

const BLACK = REGISTER_CLASSES.black;

export const SponsorBanner = async ({ sponsorship, locale }: { sponsorship: SponsorshipPublic; locale: AppLocale }) => {
  const t = await getTranslations({ locale, namespace: "HomeSponsors" });
  const { sponsor } = sponsorship;
  const shown = displayName(sponsor.name, locale);

  return (
    // The banner is the one commercial relationship the homepage singles out,
    // so it carries the static identity edge (usage matrix §5-D), in the tone
    // its tier earns (`sponsorTone`): the tricolour for a strategic partner,
    // the green line for any other tier the banner may hold (D5.1).
    // `static`, never `hover`: the card is not interactive as a whole.
    //
    // The border wraps the `<article>` rather than replacing it. `BrandBorder`
    // forwards no ARIA — widening it to would make it a second place where an
    // accessible name can be set — and replacing the element here would have
    // silently dropped `aria-labelledby`, leaving the banner unnamed.
    <BrandBorder variant="static" tone={sponsorTone(sponsorship.tier)} className="rounded-[var(--radius-lg)]">
    <article
      data-sponsor-banner=""
      aria-labelledby={`sponsor-banner-${sponsorship.id}`}
      className={`relative overflow-clip rounded-[var(--radius-lg)] ${BLACK.surface}`}
    >
      {/* From lg only: below it the text spans the banner's width and the
          strokes came 28px from it at 768 (IL-5, measured 2026-09-17). The
          wrapper is unpositioned, so the lines still place against the banner. */}
      <div className="max-lg:hidden">
        <PhotoLines side="start" />
      </div>
      <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8 lg:pe-40">
        <OrganizationLogo logo={sponsor.logo} name={sponsor.name} locale={locale} size="banner" decorative />
        <div className="min-w-0 flex-1">
          <p className={`text-body-sm font-semibold ${BLACK.muted}`}>
            {t(`tiers.${sponsorship.tier}`)}
            {locale === "ar" ? (
              <>
                {" · "}
                <bdi lang="en" className="font-latin">{t(`tiersEnglish.${sponsorship.tier}`)}</bdi>
              </>
            ) : null}
          </p>
          <h3 id={`sponsor-banner-${sponsorship.id}`} className="mt-2 text-h3 text-balance">
            <OrganizationName name={sponsor.name} locale={locale} />
          </h3>
          {sponsorship.scopeLabel ? (
            <p className={`mt-2 text-body text-pretty ${BLACK.muted}`}>{sponsorship.scopeLabel[locale]}</p>
          ) : null}
          {sponsor.website && shown ? (
            <a
              href={sponsor.website}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 inline-flex ${TOUCH_TARGET} items-center gap-2 text-body-sm font-semibold underline underline-offset-4 ${TRANSITION} ${FOCUS} hover:decoration-2 active:opacity-80`}
            >
              {t("sponsors.visitWebsite", { name: shown.text })}
              <span aria-hidden="true">↗</span>
              <span className="sr-only">({t("sponsors.opensInNewTab")})</span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
    </BrandBorder>
  );
};

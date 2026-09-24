import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { InfoCard } from "@uaeaf/brand-ui";
import type { AppLocale } from "@/i18n/routing";
import type { ContactUsPage, LocalizedText, MediaAssetPublic } from "@/lib/api/types";
import { altOf, isExternalMedia } from "@/lib/api/media";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import { ContactIcon, type ContactIconName } from "@/components/ui/contact-icon";
import { TOUCH_TARGET } from "@/components/ui/interactive";
import {
  HERO_COMPOSITION,
  HERO_MEASURE,
  HERO_MEDIA,
  HERO_MOTIF,
  HERO_PARALLAX,
  HERO_SCRIM,
  HERO_STAGE,
  HERO_TEXT,
  HERO_VIEWPORT,
} from "@/components/ui/surface";
import { UaeafMotif } from "@/components/brand/uaeaf-motif";
import { text } from "@/components/pages/static-page-screen";

/**
 * Contact hero: one photograph, the page heading, and the four contact cards.
 *
 * Figma `2616:1382` — AR `862:445`, EN `1475:2549`, tablet `1472:2525`,
 * mobile `1472:2657` + `1472:2660`.
 *
 * The cards are one DOM node placed twice: static below the photo band on
 * small screens (their own section in the mobile frame), absolutely pinned
 * inside the photo band from `md` up. Duplicating the markup per breakpoint
 * would put four contact details in the accessibility tree twice.
 *
 * The bottom padding on the photo band is the room the absolutely-positioned
 * card row needs, and it is measured, not guessed: the row is 312px at `md`
 * and `lg`, where it is a 2 x 2 grid, and 184-210px at `xl`, where it is one
 * line of four. At the designed 200px the two-row layout ran 58px (Arabic) to
 * 74px (English) into the subtitle.
 *
 * The heading sits above the cards, never behind them. The AR desktop frame
 * centres its title block at y≈365 while the cards start at y 341.6, so the
 * `<h1>` is completely covered there; every other frame in the file clears it
 * (ADR-0064 C1). An invisible `<h1>` is a WCAG 2.4.6 and indexing defect, not
 * a composition choice.
 */

const CARD_ICONS: readonly ContactIconName[] = ["phone", "mail", "mapPin", "clock"];

/**
 * The four cards are the kit's `InfoCard` with its accent (ADR-0098): the
 * neutral raised plate, a `BrandAccentBar` along its top edge, the icon, the
 * label and the value.
 *
 * ADR-0065 R2 still holds: the four are peers and carry no hue of their own —
 * the only colour is the identity edge, the same on all four, which encodes
 * nothing about a telephone number that it does not also say about an email
 * address. The plate is the same in both of the card's situations — stacked
 * on the page below `md`, pinned over the photograph from `md` — because it
 * paints its own ground (`data-surface="raised"`), so neither situation can
 * inherit the other's text colour.
 *
 * The actionable values are written as their own links inside the card rather
 * than through `InfoCard`'s `href`: the kit's link has no minimum height, and
 * the telephone and email are the page's primary actions on a phone, where a
 * 20px-tall link fails WCAG 2.5.8's floor. `TOUCH_TARGET` keeps them at 44px.
 */
const VALUE_LINK = `inline-flex ${TOUCH_TARGET} items-center rounded-xs underline decoration-current/50 underline-offset-4 text-[color:var(--surface-link)] transition-[text-decoration-color] duration-[var(--motion-duration-fast)] hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-focus-ring)] focus-visible:ring-offset-2`;

export const ContactHero = async ({
  locale,
  record,
  titleId,
  title,
  subtitle,
  heroImage,
}: {
  locale: AppLocale;
  record: ContactUsPage | null;
  titleId: string;
  title: string;
  subtitle: string | null;
  heroImage: MediaAssetPublic | undefined;
}) => {
  const t = await getTranslations({ locale, namespace: "Contact" });

  const label = (own: LocalizedText | null | undefined, fallback: string) =>
    text(own, locale) ?? fallback;

  const cards = [
    {
      label: label(record?.phones?.[0]?.label, t("cards.phone")),
      value: record?.phones?.[0]?.number ?? null,
      href: record?.phones?.[0] ? `tel:${record.phones[0].number.replace(/\s+/g, "")}` : null,
      ltr: true,
    },
    {
      label: label(record?.cardLabels?.email, t("cards.email")),
      value: record?.email ?? null,
      href: record?.email ? `mailto:${record.email}` : null,
      ltr: true,
    },
    {
      label: label(record?.cardLabels?.location, t("cards.location")),
      value: text(record?.locationSummary, locale),
      href: null,
      ltr: false,
    },
    {
      label: label(record?.cardLabels?.officeHours, t("cards.officeHours")),
      value: text(record?.officeHours, locale),
      href: null,
      ltr: false,
    },
  ];

  return (
    <section
      aria-labelledby={titleId}
      data-testid="contact-hero"
      className={`relative flex flex-col ${HERO_VIEWPORT}`}
    >
      <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-4 pt-8 pb-8 sm:px-6 md:px-8 md:pb-[360px] lg:px-12 xl:px-16 xl:pb-[236px]">
        {heroImage ? (
          // The ground plane: its own element, because the picture carries the
          // load-in settle and this carries the scroll parallax, and two
          // animations on one `transform` leave only the last one running.
          <div className={HERO_PARALLAX}>
            {isCloudinaryUrl(heroImage.file.url) ? (
              // A plain <img>, not next/image: the resizing is the CDN's, and
              // next/image can only be told that through a `loader` function,
              // which a server component may not hand to the client component
              // it renders. The srcset is a string, which may cross that line.
              //
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage.file.url}
                srcSet={cloudinarySrcSet(heroImage.file.url, heroImage.file.width)}
                sizes="100vw"
                alt={altOf(heroImage, locale)}
                fetchPriority="high"
                className={HERO_MEDIA}
              />
            ) : (
              <Image
                src={heroImage.file.url}
                alt={altOf(heroImage, locale)}
                fill
                priority
                unoptimized={isExternalMedia(heroImage.file.url)}
                sizes="100vw"
                className={HERO_MEDIA}
              />
            )}
          </div>
        ) : (
          // The black register, not raw `brand.black`: ADR-0059 D2 resolves it
          // to `neutral-warm.700` in the dark theme, where pure black cannot
          // depart from a near-black page and the cards would have nothing to
          // sit on.
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[color:var(--color-section-black-surface)]"
          />
        )}
        <div aria-hidden="true" className={HERO_SCRIM} />

        <div
          className={`relative mx-auto w-full max-w-[1248px] ${HERO_COMPOSITION} text-[color:var(--color-text-on-brand)]`}
        >
          <div className={HERO_TEXT}>
            <h1
              id={titleId}
              className="rise-in text-display-l text-balance"
              style={{ "--rise-index": HERO_STAGE.title } as React.CSSProperties}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className={`rise-in mt-4 ${HERO_MEASURE} text-body-lg opacity-85`}
                style={{ "--rise-index": HERO_STAGE.subtitle } as React.CSSProperties}
              >
                {subtitle}
              </p>
            ) : null}
          </div>

          {/* The ascent motif, in `inherit` tone so its four strokes collapse
              to the band's own white — Federation Green and Red measure 1.15:1
              against each other (ADR-0059 §D2) and neither survives a dark
              photograph. It answers the title from the far side of the same
              baseline rather than sitting behind it: Chapter 6 puts WCAG AA
              above composition, and artwork crossing under text changes the
              measured ratio of every character it passes. */}
          <UaeafMotif
            tone="inherit"
            className={`rise-in ${HERO_MOTIF} opacity-25`}
            style={{ "--rise-index": HERO_STAGE.motif } as React.CSSProperties}
          />
        </div>
      </div>

      {/* `shrink-0` is load-bearing below `md`, where this is a flex item in a
          section whose height is the first screen. Flexbox was compressing it
          by 10px to make the section's numbers add up, and grid items do not
          shrink with their container — so the fourth card ran past the fold
          while every box measured correct. The band above takes the
          difference instead: it is the element that can afford to. */}
      <ul
        data-testid="contact-cards"
        className="mx-auto grid w-full max-w-[1248px] shrink-0 grid-cols-1 gap-2 px-4 pt-4 sm:px-6 md:absolute md:inset-x-0 md:bottom-8 md:grid-cols-2 md:gap-4 md:px-8 md:pt-0 lg:px-12 xl:grid-cols-4 xl:gap-6 xl:px-16"
      >
        {cards.map((card, index) => (
          // `.rise-in`, not `.rise-scroll`. A scroll-driven entry belongs to
          // content below the fold; these cards are now inside the first
          // screen by construction, so a scroll animation sits near zero
          // progress on first paint and holds the card ten pixels low —
          // measured, and visible as the fourth card being clipped by the
          // bottom edge. The page-load entrance is the one that matches where
          // they actually are, and it still travels the ascent vector.
          <li
            key={card.label}
            className="rise-in flex"
            style={{ "--rise-index": HERO_STAGE.card + index } as React.CSSProperties}
          >
            <InfoCard
              accent
              className="w-full"
              icon={<ContactIcon name={CARD_ICONS[index]} className="size-full" />}
              label={card.label}
              // A card with no stored value still names what it is for; the
              // value line is simply empty rather than a placeholder.
              value={
                card.value && card.href ? (
                  <a href={card.href} dir={card.ltr ? "ltr" : undefined} className={VALUE_LINK}>
                    {card.value}
                  </a>
                ) : card.value ? (
                  <span dir={card.ltr ? "ltr" : undefined}>{card.value}</span>
                ) : null
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

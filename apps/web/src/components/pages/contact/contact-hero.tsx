import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import type { ContactUsPage, LocalizedText, MediaAssetPublic } from "@/lib/api/types";
import { altOf, isExternalMedia } from "@/lib/api/media";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import { ContactIcon, type ContactIconName } from "@/components/ui/contact-icon";
import { TOUCH_TARGET } from "@/components/ui/interactive";
import {
  CARD_ICON,
  CARD_INTERACTIVE,
  GLASS_EDGE_MD,
  GLASS_OVER_ART_MD,
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
 * The cards carry no hue at all — and two grounds, not one.
 *
 * ADR-0065 R2: four cards distinguished by four steps of one ramp encode
 * nothing — a telephone number is not "lighter green" than an email address
 * in any sense a reader can decode. The four are peers, so they are painted
 * as peers.
 *
 * What the earlier version got wrong is that this component appears in two
 * places. From `md` up it is pinned inside the hero band, over a photograph
 * under a fixed dark overlay; below `md` it leaves the band entirely and
 * stacks on the page's own surface. One set of classes was written for the
 * first situation and inherited by the second, which put white text on
 * `#FAFAF8` at 1.04:1 — the four contact details, unreadable on every phone
 * in the light theme, on the page whose whole job is to give them.
 *
 * So the unprefixed classes describe the stacked card and follow the theme,
 * and the `md:` ones describe the pinned card and deliberately do not: the
 * band's ground is an uploaded picture under a fixed overlay, and a token
 * that flipped with the theme would invert over a ground that never does.
 * `currentColor` carries the icon ring and the underline across both, so
 * neither can be forgotten when the other changes.
 *
 * The pinned card's 12% and the overlay's 0.64/0.74 remain one decision:
 * solved against the worst admissible input, a pure white photograph. Both
 * situations are measured by `contact-card-contrast.spec.ts`.
 */
const CARD = `${CARD_INTERACTIVE} ${GLASS_OVER_ART_MD} ${GLASS_EDGE_MD} flex w-full items-center gap-4 px-4 py-3 text-start text-[color:var(--color-text-primary)] md:flex-col md:justify-center md:gap-2 md:py-6 md:text-center md:text-[color:var(--color-text-on-brand)] xl:gap-3 xl:px-6 xl:py-8`;

export async function ContactHero({
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
}) {
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
          // Entry and interaction on two elements, never one. A scroll-driven
          // animation holds `transform` for the whole life of the element, and
          // the animation origin outranks any rule — so `.rise-scroll` and
          // `.lift` on the same node silently cancel the hover lift. Measured
          // on a live page: the card stayed at `matrix(1,0,0,1,0,0)` under
          // `:focus-within`. Guarded by `motion-contract.spec.ts`.
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
            <div className={CARD}>
              {/* Two grounds, two treatments, one class list. On the stacked
                  card the icon is the shared `CARD_ICON` — Federation Green
                  on the recessed step, inverting to white-on-green when the
                  card is hovered. On the pinned card the ground is a
                  photograph under a fixed overlay, where that green measures
                  3.1:1 and reads as dim, so the ring falls back to
                  `currentColor` (the band's white) and the hover inversion is
                  the same green fill either way. */}
              <span
                className={`${CARD_ICON} size-11 md:border-2 md:border-current md:bg-transparent md:text-[color:var(--color-text-on-brand)] xl:size-13`}
              >
                <ContactIcon name={CARD_ICONS[index]} className="size-[18px] xl:size-[22px]" />
              </span>
              <span className="flex min-w-0 flex-col gap-1 md:contents">
              <span className="text-label font-bold">{card.label}</span>
              {card.value ? (
                card.href ? (
                  // Underlined at rest, not on hover — the affordance never
                  // rests on colour alone (WCAG 1.4.1), and on the pinned card
                  // Federation Green would fail 1.4.3 against the dark band
                  // anyway.
                  //
                  // `min-h-11` is the reason this is an inline-flex box: at
                  // its natural line height the link measured 109×20, under
                  // even the 24px floor of WCAG 2.5.8, on the two card values
                  // that are the page's primary actions on a phone.
                  <a
                    href={card.href}
                    dir={card.ltr ? "ltr" : undefined}
                    className={`text-body-sm inline-flex ${TOUCH_TARGET} items-center justify-center rounded-xs px-2 underline decoration-current/50 underline-offset-4 transition-[text-decoration-color,color] duration-[var(--motion-duration-fast)] hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-transparent xl:text-body`}
                  >
                    {card.value}
                  </a>
                ) : (
                  <span className="text-body-sm xl:text-body">{card.value}</span>
                )
              ) : null}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

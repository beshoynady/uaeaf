import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import type { ContactUsPage, LocalizedText, MediaAssetPublic } from "@/lib/api/types";
import { altOf, isExternalMedia } from "@/lib/api/media";
import { ContactIcon, type ContactIconName } from "@/components/ui/contact-icon";
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
 * The cards carry no hue at all.
 *
 * ADR-0065 R2: four cards distinguished by four steps of one ramp encode
 * nothing — a telephone number is not "lighter green" than an email address
 * in any sense a reader can decode. The four are peers, so they are painted
 * as peers.
 *
 * The panel is a fixed translucent white rather than a surface token: the
 * ground behind it is theme-independent — a photograph under a fixed dark
 * overlay — so a token that flips with the theme would invert over a ground
 * that does not.
 *
 * Its 12% and the overlay's 0.64/0.74 are one decision, not two. The
 * photograph is whatever an editor uploaded, so the pair is set against the
 * worst admissible input, a pure white image, where it holds white card text
 * above AA at both ends of the gradient. Measured by
 * `contact-card-contrast.spec.ts`.
 */
const CARD =
  "lift w-full flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[rgb(255_255_255/0.35)] bg-[rgb(255_255_255/0.12)] px-4 py-6 text-center text-[color:var(--color-text-on-brand)] backdrop-blur-[12px] xl:gap-3 xl:px-6 xl:py-8";

/** The overlay that makes the band a legible ground.
 *
 *  Its strength is set by the card above it, not by taste. The cards are
 *  translucent so they stay visible when no photograph is set, which means
 *  they *lighten* whatever is beneath them — so the overlay has to do enough
 *  work that even the lightest stop still holds white text after the card has
 *  added its own 12%. Solving that against a pure white image puts the floor
 *  at 0.61; the designed 0.45/0.55 measured 3.74:1 and failed. */
const HERO_OVERLAY =
  "absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.64),rgb(0_0_0/0.74))]";

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
    <section aria-labelledby={titleId} data-testid="contact-hero" className="relative">
      <div className="relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden px-4 pt-12 pb-8 sm:px-6 md:min-h-[551px] md:px-8 md:pb-[360px] lg:px-12 xl:min-h-[550px] xl:px-16 xl:pb-[236px]">
        {heroImage ? (
          <Image
            src={heroImage.file.url}
            alt={altOf(heroImage, locale)}
            fill
            priority
            unoptimized={isExternalMedia(heroImage.file.url)}
            sizes="100vw"
            className="object-cover"
          />
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
        <div aria-hidden="true" className={HERO_OVERLAY} />

        <div className="relative flex w-full max-w-[900px] flex-col items-center gap-4 text-center text-[color:var(--color-text-on-brand)]">
          <h1
            id={titleId}
            className="rise-in text-display-l text-balance"
            style={{ "--rise-index": 0 } as React.CSSProperties}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className="rise-in text-body-lg opacity-85"
              style={{ "--rise-index": 1 } as React.CSSProperties}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <ul
        data-testid="contact-cards"
        className="mx-auto grid w-full max-w-[1248px] grid-cols-1 gap-3 px-4 pt-6 sm:px-6 md:absolute md:inset-x-0 md:bottom-8 md:grid-cols-2 md:gap-4 md:px-8 md:pt-0 lg:px-12 xl:grid-cols-4 xl:gap-6 xl:px-16"
      >
        {cards.map((card, index) => (
          // Entry and interaction on two elements, never one. A scroll-driven
          // animation holds `transform` for the whole life of the element, and
          // the animation origin outranks any rule — so `.rise-scroll` and
          // `.lift` on the same node silently cancel the hover lift. Measured
          // on a live page: the card stayed at `matrix(1,0,0,1,0,0)` under
          // `:focus-within`. Guarded by `motion-contract.spec.ts`.
          <li key={card.label} className="rise-scroll flex">
            <div className={CARD}>
              <span className="flex size-11 items-center justify-center rounded-full border-2 border-[color:var(--color-text-on-brand)] xl:size-13">
                <ContactIcon name={CARD_ICONS[index]} className="size-[18px] xl:size-[22px]" />
              </span>
              <span className="text-label font-bold">{card.label}</span>
              {card.value ? (
                card.href ? (
                  // Underlined at rest, not on hover. Federation Green is the
                  // action colour (ADR-0065 D2) and cannot be spent here: over
                  // the dark hero ground it would fail WCAG 1.4.3. The
                  // underline carries the affordance instead, which also
                  // satisfies 1.4.1 — the link is never distinguished by
                  // colour alone.
                  <a
                    href={card.href}
                    dir={card.ltr ? "ltr" : undefined}
                    className="text-body-sm rounded-xs underline decoration-[rgb(255_255_255/0.5)] underline-offset-4 transition-[text-decoration-color] duration-[var(--motion-duration-fast)] hover:decoration-[currentColor] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-text-on-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent xl:text-body"
                  >
                    {card.value}
                  </a>
                ) : (
                  <span className="text-body-sm xl:text-body">{card.value}</span>
                )
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

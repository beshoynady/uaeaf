import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { UaeafLogo } from "@/components/brand/uaeaf-logo";
import { LocationMap } from "@/components/pages/contact/location-map";
import { FooterMapFrame } from "./footer-map-frame";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { REGISTER_CLASSES, SURFACE_OF } from "@/components/ui/section";
import { SocialChannelLink } from "@/components/ui/social-channel-link";
import { FOOTER_QUICK_LINKS, LEGAL_LINKS } from "@/lib/navigation";
import { isBuilt } from "@/lib/pages/built-routes";
import type { FooterContent } from "@/lib/pages/footer-content";
import { socialChannels } from "@/lib/social-channels";
import { BrandAccentBar } from "@uaeaf/brand-ui";

/**
 * Global site footer (ADR-0092).
 *
 * Visual source: Figma `Section / Footer`, node 2374:2198, inside
 * `Homepage - AR / RTL (APPROVED BASELINE v1)`. That node is clipped out of its
 * parent frame and renders blank there — read its geometry directly, and use
 * `720:834` (the same footer on a static page) for visual confirmation. The
 * live map, the first-screen height and the studio credit have no frame yet:
 * PENDING FIGMA BACK-SYNC.
 *
 * Four columns in the approved order — Brand and the channels, Quick Links,
 * Location, Contact — then the legal strip. The first child lands on the
 * reading start in either direction, so this order reproduces the approved
 * composition in both without `flex-row-reverse` and keeps the screen-reader
 * order matching the visual one. Alignment is `start`, never `end`, which
 * would put each language against its own direction (ADR-0061 D1, guarded by
 * `direction-and-logo-contract.spec.ts`).
 *
 * Where each thing comes from (`loadFooterContent`): the place, the map, the
 * email, the office hours and the channels from the contact page's record,
 * which is their one source; the description, the copyright line and the
 * headings from the site settings, with the catalogue's text when an editor
 * has saved none. A contact fact the record cannot supply is left out rather
 * than remembered.
 *
 * From `lg` the footer is at least the screen minus the header
 * (`.footer-first-screen`), and the map takes what the columns leave over.
 * Below `lg` it is as tall as its content.
 *
 * Colour comes from the black register (ADR-0059 §D2), never from literal
 * `text-white` or `--color-brand-black`: that token is `#000000` in every
 * theme and measures 1.12:1 against the dark page.
 *
 * `useTranslations`, not `getTranslations` — keeps this a non-async Server
 * Component so tests can render it directly under `<NextIntlClientProvider>`.
 */
const tone = REGISTER_CLASSES.black;

const FOOTER_LINK = `rounded-xs text-caption ${tone.muted} ${TRANSITION} hover:text-[color:var(--color-section-black-text)] active:text-[color:var(--color-section-black-text-muted)] ${FOCUS}`;

/** The studio that designed the site (owner request 2026-09-22). A name is
 *  not translated, so it lives here rather than in the catalogue, which holds
 *  only the sentence around it. */
const DESIGN_STUDIO = {
  name: "NOTIME",
  href: "https://notimehub.com/",
} as const;

/**
 * Decorative brand swooshes, Figma nodes 2737:38–41.
 *
 * Angle and placement are governed separately, and conflating them breaks
 * English (ADR-0061 D2):
 *
 *  - The ANGLE is fixed brand geometry. `-rotate-35` is a physical transform
 *    and must never mirror — ADR-0059 §D7.1 forbids mirroring the ascent
 *    vector, so the strokes rise the same way in both languages.
 *  - The PLACEMENT belongs to the composition, which does mirror. `start`/`end`
 *    keep the art beside the Brand and Contact columns as those columns swap
 *    sides; physical `left`/`right` would leave it crossing the wordmark under
 *    `dir="ltr"`.
 *
 * Drawn only from `xl` (ADR-0061 D3). The artwork has fixed pixel sizes
 * composed against the 1440px frame while the columns around it shrink, so
 * below 1280 the strokes reach the text — at 1024 the white one runs through
 * two words of the brand description, white on white. No Figma frame exists
 * for a small-screen treatment and §13 forbids inventing one; the art is
 * `aria-hidden`, so not drawing it costs no content. PENDING FIGMA BACK-SYNC.
 */
const decorations = [
  {
    src: "/brand/swoosh-red.svg",
    w: 202,
    h: 23,
    className: "end-[-30px] top-[134px] w-[179px]",
  },
  {
    src: "/brand/swoosh-green.svg",
    w: 289,
    h: 38,
    className: "end-[-10px] top-[114px] w-[259px]",
  },
  {
    src: "/brand/swoosh-white.svg",
    w: 231,
    h: 26,
    className: "start-[-5px] top-[270px] w-[204px]",
  },
  {
    src: "/brand/swoosh-red-sm.svg",
    w: 145,
    h: 17,
    className: "start-[-18px] top-[308px] w-[129px]",
  },
];

export const SiteFooter = ({ content }: { content: FooterContent }) => {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Nav");
  const tLegal = useTranslations("Legal");
  const tSocial = useTranslations("Social");
  const tFooter = useTranslations("Footer");
  // The contact page's own words for the same things: one label for one
  // action, and one name for one frame, wherever they appear.
  const tContact = useTranslations("Contact");

  const channels = socialChannels(content.channels, content.icons, (key) =>
    tSocial(key),
  );
  const hasMap = content.latitude !== null && content.longitude !== null;

  return (
    <footer
      // The footer stands on the black register, and now says so in the kit's
      // vocabulary too. Without `data-surface` the accent bar below resolved
      // its middle step from the `:root` fallback — black, on a black footer —
      // so the bar was drawn and a third of it was invisible.
      data-surface={SURFACE_OF.black}
      className={`footer-first-screen relative flex w-full flex-col items-center overflow-hidden px-4 pt-[72px] sm:px-6 md:px-8 lg:px-12 xl:px-16 ${tone.surface}`}
      data-node-id="2374:2198"
    >
      {/*
        The footer stands on the black register, which is a near-black ground
        against a near-black page in dark theme — so it takes the same edge
        every ink-like ground takes (ADR-0098 §8.4). Here the bar is the top
        boundary of the section as well as the identity mark.
      */}
      <BrandAccentBar className="absolute inset-x-0 top-0" />
      {decorations.map((d) => (
        <span
          key={d.src}
          aria-hidden="true"
          data-decorative="true"
          className={`pointer-events-none absolute hidden -rotate-35 select-none xl:block ${d.className}`}
        >
          <Image
            src={d.src}
            alt=""
            width={d.w}
            height={d.h}
            className="h-auto w-full"
          />
        </span>
      ))}

      {/* Grid breakpoints derive from Design System Chapter 5 §5.2's breakpoint
          table (CLAUDE.md §1a — PENDING FIGMA BACK-SYNC, no Figma frame exists
          for the `md`/`lg` states):
            - ≤767px (§5.2 xs/sm): `grid-cols-1`, per §5.10 Stacking.
            - `md` (§5.2: 8 cols): `grid-cols-2` — 8÷4 sections.
            - `lg` (§5.2: 12 cols; §5.10 forbids stacking at lg+): `grid-cols-4`
              — 12÷4 = 3 tracks each.
            - `xl`: `grid-cols-4` with the approved 48px gap. At the 1312px
              content width of the 1440px root frame this is exactly the
              approved 292px columns: (1312−3×48)÷4.

          Fractional tracks, never `flex` + `basis-[292px]`: fixed widths need
          1240px at `lg` where only 1183px is offered, and at `xl` they overflow
          the footer's own `overflow-hidden` and clip the last column whenever a
          scrollbar shaves a few px off a ≥1280px viewport. `1fr` tracks shrink
          instead.

          From `lg` the grid takes the height the first-screen rule leaves
          after the legal strip, and its columns stretch to it; only the map
          grows into it, so the four columns still start on one line and the
          slack goes to the one thing more useful for being bigger. `lg:` only:
          `flex-1` below it would set a zero basis against a footer with no
          height to share (`PANEL_TALL` in `surface.ts`). */}
      <div
        data-testid="footer-columns"
        className="relative grid w-full max-w-[1312px] grid-cols-1 items-start gap-y-12 pb-12 md:grid-cols-2 md:gap-6 lg:flex-1 lg:grid-cols-4 lg:items-stretch lg:gap-x-6 xl:gap-12"
      >
        <section
          data-footer-column
          className="flex min-w-0 flex-col items-start gap-3.5"
        >
          {/* `variant="mono"` per guide §6.1: the full-colour mark belongs on a
              white or clearly contrasting ground, the monochrome mark
              everywhere else. `currentColor` picks up the register's text
              colour, so it stays correct when the register changes with the
              theme. §9.1 forbids an outline or a drop shadow on the mark, so
              it carries neither here. */}
          <UaeafLogo variant="mono" className="size-9" />
          <h2 className="text-label font-bold">{tFooter("brandName")}</h2>
          <p
            data-testid="footer-brand-description"
            className={`w-full max-w-[260px] text-start text-caption leading-[1.6] ${tone.muted}`}
          >
            {content.aboutBlurb ?? tFooter("brandDescription")}
          </p>
          {channels.length > 0 ? (
            <ul
              aria-label={tContact("social.title")}
              className="flex flex-wrap items-center gap-2"
            >
              {channels.map((channel) => (
                <li key={channel.href}>
                  {/* The footer's own shell — `radius.lg` and its nudge. The
                      44px target, the artwork and the external-link semantics
                      are the shared component's, identical to the contact
                      page's and the newsroom sidebar's. */}
                  <SocialChannelLink
                    channel={channel}
                    className="rounded-lg transition-transform duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] hover:-translate-y-0.5 hover:translate-x-0.5 active:translate-x-0 active:translate-y-0"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* Two sub-columns. Nineteen destinations in one column stand 3.5x
            the height of the other three, which is no longer the approved
            four-column footer; ADR-0063 D2 carries the measurements.

            CSS multi-column rather than a second `<nav>` or a nested grid, so
            the DOM stays one list in one landmark — reading order, tab order
            and `FOOTER_QUICK_LINKS` order remain one source, and the flow
            follows `dir` without a locale conditional.

            Three classes here are load-bearing, not cosmetic:
             - `w-full` — without it the list shrinks to its content (106px in
               Arabic, 142px in English) and `columns-2` splits that instead of
               the 288px column.
             - no `whitespace-nowrap` — the sub-columns are 136px at 1440 and
               "Organisational Structure" is 142px, so it must be allowed to
               wrap rather than cross the gutter.
             - `break-inside-avoid` — keeps a wrapped label's lines together
               instead of splitting them across the two sub-columns.

            PENDING FIGMA BACK-SYNC: the approved frame shows one nine-item
            column, and no frame exists for this one. */}
        <nav
          data-footer-column
          aria-label={tFooter("quickLinksNav")}
          className="flex min-w-0 flex-col items-start gap-3"
        >
          <h2 className="text-caption font-bold">
            {content.headings.quickLinks ?? tFooter("quickLinksTitle")}
          </h2>
          <ul className="block w-full columns-2 gap-x-4 text-start">
            {FOOTER_QUICK_LINKS.map((item) => (
              <li key={item.href} className="mb-3 break-inside-avoid last:mb-0">
                <Link
                  href={item.href}
                  prefetch={isBuilt(item.href) ? undefined : false}
                  className={FOOTER_LINK}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section
          data-footer-column
          className="flex min-w-0 flex-col items-start gap-3"
        >
          <h2 className="text-caption font-bold">
            {content.headings.location ?? tFooter("locationTitle")}
          </h2>
          {/* The contact page's own live map, not a second one: the same
              component at the same record's coordinates, drawn once its frame
              is on screen (`FooterMapFrame`). 220px is that page's own frame
              minimum; from `lg` the frame takes the rest of the column. With
              no coordinates stored, no frame is drawn. */}
          {hasMap ? (
            <FooterMapFrame
              className={`relative min-h-[220px] w-full overflow-hidden rounded-lg border ${tone.border} lg:flex-1`}
            >
              <LocationMap
                latitude={content.latitude!}
                longitude={content.longitude!}
                locale={locale}
                title={tContact("map.frameTitle")}
              />
            </FooterMapFrame>
          ) : null}
          {/* Under the map, never over it: a card over a live map covers
              Google's own marker and takes the pointer from the map. */}
          {content.place ? (
            <p
              data-testid="footer-place"
              className="flex flex-col gap-1 text-start"
            >
              {/* Figma specifies Alexandria SemiBold (600); Chapter 3 defines
                  exactly four weights (400/500/700/900), so 600 maps to `bold`
                  rather than minting an unapproved token (CLAUDE.md §16).
                  `text-caption` is the scale's smallest step; neither ADR-0041
                  exception covers this label. */}
              <span className="text-caption font-bold">{content.place}</span>
              {content.region ? (
                <span className={`text-caption ${tone.muted}`}>
                  {content.region}
                </span>
              ) : null}
            </p>
          ) : null}
          {/* The one thing the embedded map does not do well: routing
              (owner decision 2026-09-22, ADR-0092 D9). */}
          {content.directionsUrl ? (
            <a
              href={content.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={FOOTER_LINK}
            >
              {tContact("map.openDirections")}
            </a>
          ) : null}
        </section>

        {/* The address is under the map in the column beside this one, in the
            same words, so it is not repeated here. */}
        <section
          data-footer-column
          className="flex min-w-0 flex-col items-start gap-3.5"
        >
          <h2 className="text-caption font-bold">
            {content.headings.contact ?? tFooter("contactTitle")}
          </h2>
          {content.email ? (
            <a
              href={`mailto:${content.email}`}
              dir="ltr"
              className={FOOTER_LINK}
            >
              {content.email}
            </a>
          ) : null}
          {content.officeHours ? (
            <p className={`text-caption leading-[1.4] ${tone.muted}`}>
              {content.officeHours}
            </p>
          ) : null}
          <Link href="/help" prefetch={false} className={FOOTER_LINK}>
            {tFooter("helpCenter")}
          </Link>
        </section>
      </div>

      <div
        className={`relative flex w-full max-w-[1312px] flex-wrap items-center justify-between gap-4 border-t py-6 text-caption ${tone.muted} ${tone.border}`}
      >
        <p>{content.copyright ?? tFooter("copyright")}</p>
        <nav aria-label={tFooter("legalNav")}>
          <ul className="flex flex-wrap items-center gap-6">
            {LEGAL_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={isBuilt(item.href) ? undefined : false}
                  className={`${FOOTER_LINK} whitespace-nowrap`}
                >
                  {tLegal(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Last in reading order and in tab order, and no louder than the
            legal links: the credit is the least of what the footer says.
            `noopener` without `noreferrer`, so the studio can see the visit
            came from here. */}
        <p>
          {tFooter.rich("designedBy", {
            studio: () => (
              <a
                href={DESIGN_STUDIO.href}
                target="_blank"
                rel="noopener"
                lang="en"
                dir="ltr"
                className={FOOTER_LINK}
              >
                {DESIGN_STUDIO.name}
              </a>
            ),
          })}
        </p>
      </div>
    </footer>
  );
};

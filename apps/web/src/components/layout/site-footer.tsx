import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UaeafLogo } from "@/components/brand/uaeaf-logo";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { REGISTER_CLASSES } from "@/components/ui/section";
import { FOOTER_QUICK_LINKS, LEGAL_LINKS, SOCIAL_LINKS } from "@/lib/navigation";
import { isBuilt } from "@/lib/pages/built-routes";

/**
 * Global site footer.
 *
 * Visual source: Figma `Section / Footer`, node 2374:2198, inside
 * `Homepage - AR / RTL (APPROVED BASELINE v1)`. That node is clipped out of its
 * parent frame and renders blank there — read its geometry directly, and use
 * `720:834` (the same footer on a static page) for visual confirmation.
 *
 * The composition — four columns, their order, the swooshes, the map card, the
 * legal strip — is protected by CLAUDE.md §3. Colour comes from the black
 * register (ADR-0059 §D2), never from literal `text-white` or
 * `--color-brand-black`: that token is `#000000` in every theme and measures
 * 1.12:1 against the dark page.
 *
 * Alignment is `start`, not `end`. Both are logical, but `end` means "where
 * this language stops reading" and puts each language against its own
 * direction. Chapter 4 §4.11 requires the one logical property rather than a
 * locale conditional; ADR-0061 D1. Guarded by
 * `direction-and-logo-contract.spec.ts`.
 *
 * Column order is Brand → Quick Links → Location → Contact: the first child
 * lands on the reading start in either direction, so this order reproduces the
 * approved composition in both without `flex-row-reverse`, and keeps the
 * screen-reader order matching the visual one.
 *
 * `useTranslations`, not `getTranslations` — keeps this a non-async Server
 * Component so tests can render it directly under `<NextIntlClientProvider>`.
 */
const tone = REGISTER_CLASSES.black;

const FOOTER_LINK = `rounded-xs text-caption ${tone.muted} ${TRANSITION} hover:text-[color:var(--color-section-black-text)] active:text-[color:var(--color-section-black-text-muted)] ${FOCUS}`;

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
 */const decorations = [
  { src: "/brand/swoosh-red.svg", w: 202, h: 23, className: "end-[-30px] top-[134px] w-[179px]" },
  { src: "/brand/swoosh-green.svg", w: 289, h: 38, className: "end-[-10px] top-[114px] w-[259px]" },
  { src: "/brand/swoosh-white.svg", w: 231, h: 26, className: "start-[-5px] top-[270px] w-[204px]" },
  { src: "/brand/swoosh-red-sm.svg", w: 145, h: 17, className: "start-[-18px] top-[308px] w-[129px]" },
];

export function SiteFooter() {
  const t = useTranslations("Nav");
  const tLegal = useTranslations("Legal");
  const tSocial = useTranslations("Social");
  const tFooter = useTranslations("Footer");

  return (
    <footer
      className={`relative flex w-full flex-col items-center justify-center overflow-hidden px-4 pt-[72px] sm:px-6 md:px-8 lg:px-12 xl:px-16 ${tone.surface}`}
      data-node-id="2374:2198"
    >
      {decorations.map((d) => (
        <span
          key={d.src}
          aria-hidden="true"
          data-decorative="true"
          className={`pointer-events-none absolute hidden -rotate-35 select-none xl:block ${d.className}`}
        >
          <Image src={d.src} alt="" width={d.w} height={d.h} className="h-auto w-full" />
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
          instead. */}
      <div
        data-testid="footer-columns"
        className="relative grid w-full max-w-[1312px] grid-cols-1 items-start gap-y-12 pb-12 md:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-x-6 xl:gap-12"
      >
        <section className="flex min-w-0 flex-col items-start gap-3.5">
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
            {tFooter("brandDescription")}
          </p>
          <ul className="flex items-center gap-2">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.href}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={tSocial(social.key)}
                  className={`flex size-8 items-center justify-center overflow-hidden rounded-lg transition-transform duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] hover:-translate-y-0.5 hover:translate-x-0.5 active:translate-x-0 active:translate-y-0 ${FOCUS} ${social.className}`}
                >
                  {/* X and TikTok export as complete button artwork rather than a
                      glyph, so they fill the 32px button; the rest are 16px glyphs
                      on a brand-gradient background. */}
                  <Image
                    src={social.icon}
                    alt=""
                    width={social.fullBleed ? 32 : 16}
                    height={social.fullBleed ? 32 : 16}
                    aria-hidden="true"
                    className={social.fullBleed ? "size-8 object-cover" : "size-4 object-contain"}
                  />
                </a>
              </li>
            ))}
          </ul>
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
        <nav aria-label={tFooter("quickLinksNav")} className="flex min-w-0 flex-col items-start gap-3">
          <h2 className="text-caption font-bold">{tFooter("quickLinksTitle")}</h2>
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

        <section className="flex min-w-0 flex-col items-start gap-3">
          <h2 className="text-caption font-bold">{tFooter("locationTitle")}</h2>
          <div
            data-testid="footer-map-card"
            className={`flex h-[180px] w-full max-w-[250px] flex-col items-center justify-center gap-2.5 rounded-lg border bg-white/8 ${tone.border}`}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-white/8">
              <Image
                src="/icons/map-pin-lg.svg"
                alt=""
                width={18}
                height={18}
                aria-hidden="true"
                className="size-[18px]"
              />
            </span>
            <span className="flex flex-col items-center gap-1 text-center">
              {/* Figma specifies Alexandria SemiBold (600); Chapter 3 defines
                  exactly four weights (400/500/700/900), so 600 maps to `bold`
                  rather than minting an unapproved token (CLAUDE.md §16). */}
              <span className="text-caption font-bold">{tFooter("mapCardCity")}</span>
              {/* `text-caption` is the scale's smallest step. Nothing here may
                  go below Chapter 4's 13px floor — neither ADR-0041 exception
                  covers this label. */}
              <span className={`text-caption ${tone.muted}`}>{tFooter("mapCardRegion")}</span>
            </span>
          </div>
        </section>

        <section className="flex min-w-0 flex-col items-start gap-3.5">
          <h2 className="text-caption font-bold">{tFooter("contactTitle")}</h2>
          <p className="flex items-start gap-2 text-start">
            <Image
              src="/icons/map-pin.svg"
              alt=""
              width={14}
              height={14}
              aria-hidden="true"
              className="mt-1 size-3.5 shrink-0"
            />
            <span
              data-testid="footer-address"
              className={`w-full max-w-[200px] text-caption leading-[1.4] ${tone.muted}`}
            >
              {tFooter("address")}
            </span>
          </p>
          {/* Figma renders these as flat text; as real contact details they are
              actionable, so they ship as links. */}
          <a href="mailto:info@uaeaf.ae" dir="ltr" className={FOOTER_LINK}>
            info@uaeaf.ae
          </a>
          <p className={`text-caption leading-[1.4] ${tone.muted}`}>{tFooter("hours")}</p>
          <Link href="/help" prefetch={false} className={FOOTER_LINK}>
            {tFooter("helpCenter")}
          </Link>
        </section>
      </div>

      <div
        className={`relative flex w-full max-w-[1312px] flex-wrap items-center justify-between gap-4 border-t py-6 text-caption ${tone.muted} ${tone.border}`}
      >
        <p>{tFooter("copyright")}</p>
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
      </div>
    </footer>
  );
}

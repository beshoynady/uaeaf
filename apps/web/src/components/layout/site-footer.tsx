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
 * `Homepage - AR / RTL (APPROVED BASELINE v1)`. Unlike the header, this node's
 * exported values are already clean master integers (72/64/48/24/16/13) — no
 * R7 scaling to undo.
 *
 * Note: in the approved baseline this node sits at y=8896 inside a parent only
 * 8758px tall, so it is clipped out of the frame and renders blank there. Its
 * geometry and content are intact and were read directly; `720:834` (the same
 * footer on a static page) was used for visual confirmation.
 *
 * ── What changed when the registers landed ─────────────────────────────────
 *
 * The composition — four columns, their order, the swooshes, the map card,
 * the legal strip — is untouched; CLAUDE.md §3 protects it and nothing here
 * needed it changed. What changed is that the footer had been painting the
 * black register by hand: `--color-brand-black` for the ground and then
 * twenty-one literal `text-white` / `text-white/65` declarations, a raw
 * `#1a1a1a` card, `border-white/8` and `border-white/40`, and twelve
 * hardcoded pixel sizes. Three consequences, all now closed:
 *
 *  - `--color-brand-black` is `#000000` in every theme, so in dark theme the
 *    footer was pure black against a `#131210` page — 1.12:1, no boundary at
 *    all (ADR-0059 §D2). The register resolves to `#4A4942` there instead.
 *  - `white/65` on black measures 9.7:1; the register's own muted tier
 *    measures 11.9:1 and is the value the design system actually publishes.
 *  - one of the twelve sizes was `11px`, below Chapter 4's 13px floor, and it
 *    is not one of the two exceptions ADR-0041 documents. It is `text-caption`
 *    now, like every other small label here.
 *
 * The focus rings were drawn with `outline-offset`, which leaves the gap
 * transparent — so the ring was black-on-black wherever it mattered. They are
 * painted rings now, offset colour included.
 *
 * `useTranslations`, not `getTranslations` — same reasoning as `SiteHeader`
 * (kept a non-async Server Component so tests can render it directly under
 * `<NextIntlClientProvider>`).
 */

const tone = REGISTER_CLASSES.black;

const FOOTER_LINK = `rounded-xs text-caption ${tone.muted} ${TRANSITION} hover:text-[color:var(--color-section-black-text)] active:text-[color:var(--color-section-black-text-muted)] ${FOCUS}`;

/**
 * Decorative brand swooshes, Figma nodes 2737:38–41.
 *
 * Positioned with PHYSICAL left/right, deliberately not logical start/end,
 * and deliberately NOT locale-conditional: the approved footer composition is
 * itself a fixed piece of brand art (like the logo), not a text flow that
 * should mirror with reading direction — mirroring it under `dir="ltr"` would
 * flip brand artwork that was never designed to be flipped. Confirmed as the
 * intended behaviour during i18n planning (2026-09-07), and independently
 * required by ADR-0059 §D7.1, which forbids mirroring the ascent vector.
 */
const decorations = [
  { src: "/brand/swoosh-red.svg", w: 202, h: 23, className: "left-[-30px] top-[134px] w-[179px]" },
  { src: "/brand/swoosh-green.svg", w: 289, h: 38, className: "left-[-10px] top-[114px] w-[259px]" },
  { src: "/brand/swoosh-white.svg", w: 231, h: 26, className: "right-[-5px] top-[270px] w-[204px]" },
  { src: "/brand/swoosh-red-sm.svg", w: 145, h: 17, className: "right-[-18px] top-[308px] w-[129px]" },
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
          className={`pointer-events-none absolute -rotate-35 select-none ${d.className}`}
        >
          <Image src={d.src} alt="" width={d.w} height={d.h} className="h-auto w-full" />
        </span>
      ))}

      {/* Column order is Brand → Quick Links → Location → Contact, the reverse of
          the Figma export's order. The export is LTR-flattened (Contact first =
          leftmost); under `dir="rtl"` the first child lands on the right, so this
          order is what reproduces the approved right-to-left reading: Brand on the
          right, Contact on the left. Reordering the DOM rather than applying
          `flex-row-reverse` keeps the screen-reader order matching the visual one.

          Responsive breakpoints below are derived from Design System Chapter 5
          §5.2's breakpoint table (CLAUDE.md §1a — Pending Figma Back-Sync, no
          Figma frame exists yet for the `md`/`lg` states):
            - default (≤767px, §5.2 xs/sm): `grid-cols-1` — full stack, §5.10
              Stacking ("MUST stack vertically... most important first"); the DOM
              order above already is that order.
            - `md:` (768-1023px, §5.2: 8 cols/24px gutter): `grid-cols-2` — 8÷4
              sections = 2 columns each, an exact division of a documented number.
            - `lg:` (1024-1279px, §5.2: 12 cols/24px gutter; §5.10: "side-by-side
              at lg+ MUST NOT stack"): `grid-cols-4` — 12÷4 = 3 tracks each,
              fractional so it always fits (unlike a fixed px width, which cannot:
              4×292+3×24=1240px > the 1183px max content width `lg` ever offers).
            - `xl:` (≥1280px, §5.2 xl/2xl start): stays `grid-cols-4`, only the
              gap widens to 48px (the pre-existing, already-approved gap value —
              not a new number). At exactly 1312px of available content width
              (the 1440px root frame, CLAUDE.md §3) this computes to the original
              approved 292px columns exactly: (1312-3×48)÷4=292. Deliberately
              NOT `flex` + fixed `basis-[292px]`: that was tried first and, caught
              by real-browser pixel measurement (not assumed), overflowed the
              footer's own `overflow-hidden` and clipped the last column whenever
              a vertical scrollbar shaved a few px off an otherwise-≥1280px
              viewport — the exact same "no slack at 1312px" root cause as the
              original wrap-balloon bug (Part 9.2), just manifesting as a clip
              instead of a wrap. Grid's `1fr` tracks shrink proportionally instead
              of overflowing, so every width from 1280px up degrades gracefully
              while still hitting the exact approved 292px at 1440px. */}
      <div
        data-testid="footer-columns"
        className="relative grid w-full max-w-[1312px] grid-cols-1 items-start gap-y-12 pb-12 md:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-x-6 xl:gap-12"
      >
        <section className="flex min-w-0 flex-col items-end gap-3.5">
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
            className={`w-full max-w-[260px] text-end text-caption leading-[1.6] ${tone.muted}`}
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

        <nav aria-label={tFooter("quickLinksNav")} className="flex min-w-0 flex-col items-end gap-3">
          <h2 className="text-caption font-bold">{tFooter("quickLinksTitle")}</h2>
          <ul className="flex flex-col items-end gap-3 text-end">
            {FOOTER_QUICK_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={isBuilt(item.href) ? undefined : false}
                  className={`${FOOTER_LINK} whitespace-nowrap`}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="flex min-w-0 flex-col items-end gap-3">
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
              {/* Figma specifies Alexandria SemiBold (600) here. The design system
                  defines exactly four weights — 400/500/700/900 (Chapter 3) — so 600
                  is not an approved value. Mapped to `bold` rather than minting an
                  unapproved token (CLAUDE.md §16). */}
              <span className="text-caption font-bold">{tFooter("mapCardCity")}</span>
              {/* Was `text-[11px]`, below Chapter 4's 13px floor and outside both
                  ADR-0041 exceptions. `text-caption` is the scale's own smallest
                  step. */}
              <span className={`text-caption ${tone.muted}`}>{tFooter("mapCardRegion")}</span>
            </span>
          </div>
        </section>

        <section className="flex min-w-0 flex-col items-end gap-3.5">
          <h2 className="text-caption font-bold">{tFooter("contactTitle")}</h2>
          <p className="flex items-start gap-2 text-end">
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

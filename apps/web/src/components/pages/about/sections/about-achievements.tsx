"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useTranslations } from "next-intl";
import { CONTAINER, Section } from "@/components/ui/section";
import { FOCUS } from "@/components/ui/interactive";
import { SectionEyebrow } from "../parts/section-eyebrow";
import { ImageSlot } from "../parts/image-slot";
import type { AppLocale } from "@/i18n/routing";
import type { AboutAchievement, AboutPage } from "@/lib/about/types";
import { sectionAnchor } from "@/lib/about/types";

/**
 * Scene 05 — the golden moments, as a rail.
 *
 * ── When the rail is pinned, and when it is not ───────────────────────────
 *
 * Pinning reserves vertical scroll to spend on horizontal movement. That is
 * only honest when there is something to move: with two cards on a wide screen
 * the whole rail already fits, and a pinned section would hold the reader still
 * while nothing happened. So the track and the viewport are measured, and the
 * pin exists only while the track is genuinely wider. An editor hiding three of
 * five cards therefore turns the pin off by itself — which is the point, since
 * the cards that remain are the ones the API sent.
 *
 * Below `lg`, and under `prefers-reduced-motion`, it is always an ordinary
 * horizontal scroller with snap points. A pinned section on a phone fights the
 * reader's own scrolling, and under the preference there is no scroll-linked
 * movement at all.
 *
 * ── Why the buttons exist ────────────────────────────────────────────────
 *
 * A rail that only answers to a scroll wheel is a rail a keyboard cannot
 * reach. The buttons move the scroller by one card and are the same control in
 * every mode, pinned or not.
 */
export const AboutAchievements = ({
  achievements,
  locale,
}: {
  achievements: NonNullable<AboutPage["achievements"]>;
  locale: AppLocale;
}) => {
  const t = useTranslations("About");
  const reduced = useReducedMotion();

  const wrapper = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);

  /** How far the track overflows its viewport, in pixels. `0` means it fits,
   *  and a fitting rail is never pinned. */
  const [overflow, setOverflow] = useState(0);

  /**
   * Whether the viewport is wide enough for the pin at all.
   *
   * This is also what keeps the pin out of the server's HTML: it is `false`
   * until an effect says otherwise, so the first render — on the server and on
   * the client — is the ordinary scroller in both, and there is nothing for
   * hydration to disagree about.
   */
  const [wide, setWide] = useState(false);

  /**
   * A pin is a desktop device. Below `lg` the reader's vertical scroll is the
   * only way out of a section, and a pinned rail spends exactly that gesture
   * moving cards sideways — so leaving the section requires scrolling through
   * the whole rail first. Above `lg` there is a pointer, a wheel and the two
   * rail buttons, and the pin reads as the composition it was designed as.
   *
   * The width comes from `--breakpoint-lg` rather than a number written here:
   * §16 forbids a hardcoded breakpoint where the canonical token exists, and a
   * copy would drift the first time the scale moved. Unreadable, the answer is
   * "not wide" — the ordinary snap scroller, which works at every width.
   */
  useEffect(() => {
    const token = getComputedStyle(document.documentElement).getPropertyValue("--breakpoint-lg").trim();
    if (!token) {
      return;
    }
    const query = window.matchMedia(`(min-width: ${token})`);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Measured rather than assumed from the card count: the card width is a
  // clamp, so five cards fit a very wide screen and three do not fit a narrow
  // one. `ResizeObserver` keeps it true across a rotation or a zoom.
  useEffect(() => {
    const viewportNode = viewport.current;
    const trackNode = track.current;
    if (!viewportNode || !trackNode) {
      return;
    }
    const measure = () => setOverflow(Math.max(0, trackNode.scrollWidth - viewportNode.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewportNode);
    observer.observe(trackNode);
    return () => observer.disconnect();
  }, [achievements.items.length]);

  const pinned = wide && !reduced && overflow > 0;

  const { scrollYProgress } = useScroll({ target: wrapper, offset: ["start start", "end end"] });
  // Negative in both languages: the track always travels towards its own end,
  // and `direction: rtl` has already mirrored what "end" means.
  const x = useTransform(scrollYProgress, [0, 1], [0, -overflow]);
  const progress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const nudge = useCallback(
    (direction: 1 | -1) => {
      const viewportNode = viewport.current;
      const trackNode = track.current;
      if (!viewportNode || !trackNode) {
        return;
      }
      const card = trackNode.querySelector("li");
      const step = (card?.clientWidth ?? 320) + 24;
      // `scrollBy` is signed by the writing direction in RTL, and the browser
      // already accounts for it — passing the raw sign here would move the
      // rail the wrong way in Arabic.
      viewportNode.scrollBy({ left: direction * step * (locale === "ar" ? -1 : 1), behavior: "smooth" });
    },
    [locale],
  );

  return (
    <Section
      id={sectionAnchor("achievements")}
      register="black"
      labelledBy="about-achievements-title"
      enter={false}
      // The rail runs the band's whole width and keeps its own containers, so
      // the shared one would cut the track in half.
      bleed
    >
      <div ref={wrapper} style={pinned ? { height: `calc(100vh + ${overflow}px)` } : undefined}>
        <div className={pinned ? "sticky top-0 flex h-screen flex-col justify-center py-16" : "py-16 md:py-20 lg:py-24"}>
          <div className={`${CONTAINER} mb-10 flex flex-wrap items-end justify-between gap-6`}>
            <div className="flex max-w-[38rem] flex-col gap-3.5">
              <SectionEyebrow onDark>{achievements.eyebrow[locale]}</SectionEyebrow>
              <h2 id="about-achievements-title" className="text-balance text-heading-lg font-extrabold">
                {achievements.title[locale]}
              </h2>
              <p className="text-body-lg leading-relaxed text-[color:var(--color-section-black-text-muted)]">
                {achievements.description[locale]}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <RailButton label={t("achievements.previous")} onClick={() => nudge(-1)} back />
              <RailButton label={t("achievements.next")} onClick={() => nudge(1)} />
            </div>
          </div>

          <div
            ref={viewport}
            className={`${CONTAINER} ${
              pinned ? "overflow-hidden" : "snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
            }`}
          >
            <m.ul
              ref={track}
              className="flex list-none gap-6 pb-2"
              style={pinned ? { x } : undefined}
            >
              {achievements.items.map((item) => (
                <li
                  key={item._id}
                  className="w-[min(24rem,82vw)] shrink-0 snap-start"
                >
                  <AchievementCard item={item} locale={locale} />
                </li>
              ))}
            </m.ul>
          </div>

          <div className={`${CONTAINER} mt-8`}>
            <div className="h-1 overflow-hidden rounded-full bg-[color:var(--color-section-black-border)]">
              <m.span
                aria-hidden="true"
                className="block h-full w-full origin-[inline-start] rounded-full from-[var(--color-brand-primary)] via-[var(--color-section-black-text)] to-[var(--color-brand-secondary)] ltr:bg-linear-to-r rtl:bg-linear-to-l"
                style={pinned ? { width: progress } : { width: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

const RailButton = ({ label, onClick, back = false }: { label: string; onClick: () => void; back?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`inline-flex size-13 items-center justify-center rounded-full border-2 border-[color:var(--color-section-black-border)] text-[color:var(--color-section-black-text)] hover:bg-[color-mix(in_srgb,var(--color-section-black-text)_12%,transparent)] active:bg-[color-mix(in_srgb,var(--color-section-black-text)_20%,transparent)] ${FOCUS}`}
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={back ? "rtl:rotate-180" : "ltr:rotate-180 rtl:rotate-0"}
    >
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  </button>
);

/**
 * The badge behind the medal's name.
 *
 * One ground for all four kinds, and the kind is carried by the word. The
 * medal colours exist as tokens but are registered unpaired — declared and
 * never measured against anything — so painting a badge with one would assert
 * a contrast nobody has checked. Registering those pairings is a design-token
 * change, raised as a proposal rather than made here. Recorded as a deviation
 * from the approved canvas, which tints the three badges.
 */
const MEDAL_BADGE =
  "bg-[color-mix(in_srgb,var(--color-section-black-text)_16%,transparent)] text-[color:var(--color-section-black-text)]";

const AchievementCard = ({ item, locale }: { item: AboutAchievement; locale: AppLocale }) => {
  const t = useTranslations("About");
  const year = new Intl.NumberFormat(locale, { numberingSystem: "latn", useGrouping: false }).format(item.year);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border-2 border-[color:var(--color-section-black-border)] bg-[color:var(--color-section-black-surface)]">
      <div className="relative aspect-[16/9] overflow-hidden">
        <ImageSlot image={item.image} locale={locale} tone="ink" sizes="(min-width: 1024px) 24rem, 82vw" />
      </div>

      <div className="flex grow flex-col gap-2.5 p-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[2.75rem] font-black leading-none text-[color:var(--color-section-black-text)]">
            {year}
          </span>
          <span className={`rounded-full px-3 py-1 text-label font-bold ${MEDAL_BADGE}`}>
            {item.medalLabel?.[locale] ?? t(`achievements.medal.${item.medalKind}`)}
          </span>
        </div>

        <p className="text-label font-semibold text-[color:var(--color-section-black-text-muted)]">
          {item.place[locale]}
        </p>
        <h3 className="text-body-lg font-extrabold leading-snug">{item.title[locale]}</h3>
        <p className="text-body leading-relaxed text-[color:var(--color-section-black-text-muted)]">
          {item.description[locale]}
        </p>
      </div>
    </article>
  );
};

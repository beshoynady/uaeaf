"use client";

import { useRef } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Section } from "@/components/ui/section";
import { SectionEyebrow } from "../parts/section-eyebrow";
import { ImageSlot } from "../parts/image-slot";
import { revealStep } from "@/lib/motion/reveal";
import type { AppLocale } from "@/i18n/routing";
import type { AboutLeader, AboutPage } from "@/lib/about/types";
import { sectionAnchor } from "@/lib/about/types";

/**
 * Scene 07 — the leadership, on the identity's green ground.
 *
 * ── The motion ───────────────────────────────────────────────────────────
 *
 * The quote lights up word by word as the reader passes it: each word's
 * opacity is a step of this section's own scroll progress. Opacity only, so
 * nothing about the layout depends on where the reader is, and the words are
 * all present in the server HTML — a crawler, a printed page and a reader
 * under `prefers-reduced-motion` all get the finished quotation.
 *
 * Under the preference every word simply stands at full strength. That is
 * checked here rather than left to the provider, because `reducedMotion="user"`
 * stops transforms and not opacity, and a quote that is 40% legible is not an
 * accessible quote.
 *
 * ── Who appears ──────────────────────────────────────────────────────────
 *
 * Nobody is written here. The people are whoever the board module lists as
 * serving in the current cycle, and the API has already resolved that — which
 * is why this section has no visibility switch in the dashboard: it answers to
 * its source (ADR-0101 D2).
 */
export const AboutLeadership = ({
  leadership,
  locale,
}: {
  leadership: NonNullable<AboutPage["leadership"]>;
  locale: AppLocale;
}) => {
  const reduced = useReducedMotion();
  const quote = useRef<HTMLQuoteElement>(null);
  const { scrollYProgress } = useScroll({ target: quote, offset: ["start 85%", "end 55%"] });

  const words = leadership.quote[locale].split(" ");

  return (
    <Section
      id={sectionAnchor("leadership")}
      register="green"
      labelledBy="about-leadership-title"
      enter={false}
      className="py-16 md:py-20 lg:py-28"
    >
      <>
        <header className="mb-11 flex flex-col gap-3.5">
          <SectionEyebrow onDark>{leadership.eyebrow[locale]}</SectionEyebrow>
          <h2 id="about-leadership-title" className="text-balance text-heading-lg font-extrabold">
            {leadership.title[locale]}
          </h2>
        </header>

        <blockquote ref={quote} className="max-w-[54ch]">
          <p className="text-[clamp(1.35rem,2.6vw,1.75rem)] font-bold leading-[1.7]">
            {words.map((word, index) => (
              <QuoteWord
                key={`${word}-${index}`}
                word={word}
                index={index}
                total={words.length}
                progress={scrollYProgress}
                reduced={Boolean(reduced)}
              />
            ))}
          </p>
        </blockquote>

        <ul data-reveal="" className="mt-10 grid list-none gap-3 sm:grid-cols-2">
          {leadership.priorities.map((priority, index) => (
            <li
              key={index}
              data-reveal-part="rise"
              style={revealStep(index)}
              className="flex gap-2.5 text-body leading-relaxed text-[color:var(--color-section-green-text-muted)]"
            >
              <span
                aria-hidden="true"
                className="mt-2 size-2 shrink-0 rounded-[2px] bg-[color:var(--color-section-green-text)]"
              />
              {priority[locale]}
            </li>
          ))}
        </ul>

        {leadership.people.length > 0 ? (
          <ul data-reveal="" className="mt-12 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leadership.people.map((person, index) => (
              // `min-w-0`: a grid item's automatic minimum size is its
              // content's min-content width, and the card's name is
              // `truncate`d — `nowrap`. Left at `auto` the track sizes to the
              // longest name uncut, the one-column layout at 390 becomes
              // 423px wide, and the whole page scrolls sideways.
              <li
                key={`${person.roleType}-${index}`}
                data-reveal-part="rise"
                style={revealStep(index)}
                className="min-w-0"
              >
                <LeaderCard person={person} locale={locale} />
              </li>
            ))}
          </ul>
        ) : null}
      </>
    </Section>
  );
};

/**
 * One word of the quotation.
 *
 * Its own slice of the section's progress, so the sentence lights from its
 * beginning. The window is deliberately wider than the slice (the second stop
 * is past the first) so neighbouring words overlap and the effect reads as a
 * sweep rather than as words switching on one at a time.
 */
const QuoteWord = ({
  word,
  index,
  total,
  progress,
  reduced,
}: {
  word: string;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  reduced: boolean;
}) => {
  const start = index / total;
  const end = Math.min(1, start + 2 / total);
  const opacity = useTransform(progress, [start, end], [0.35, 1]);

  return (
    <m.span className="inline-block" style={reduced ? undefined : { opacity }}>
      {word}
      {index < total - 1 ? " " : null}
    </m.span>
  );
};

const LeaderCard = ({ person, locale }: { person: AboutLeader; locale: AppLocale }) => (
  <article className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)] p-4">
    {/* The portrait where the record has one. Where it does not, a plain disc
        rather than a placeholder face: an illustrated stand-in for a real
        person reads as a missing face, and the system has no illustration
        style to fill it with (Chapter 27 §31). */}
    {person.photo ? (
      <span className="relative size-16 shrink-0 overflow-hidden rounded-full">
        <ImageSlot image={person.photo} locale={locale} tone="green" sizes="4rem" />
      </span>
    ) : (
      <span aria-hidden="true" className="size-16 shrink-0 rounded-full bg-[color:var(--color-surface-sunken)]" />
    )}
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-body-lg font-extrabold text-[color:var(--color-text-primary)]">
        {person.fullName[locale]}
      </span>
      <span className="truncate text-label font-semibold text-[color:var(--color-text-link)]">
        {person.positionTitle[locale]}
      </span>
    </div>
  </article>
);

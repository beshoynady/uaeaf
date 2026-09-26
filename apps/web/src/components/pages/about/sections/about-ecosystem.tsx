"use client";

import { useRef } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useTranslations } from "next-intl";
import { CONTAINER } from "@/components/ui/section";
import { SectionEyebrow } from "../parts/section-eyebrow";
import { CountUp } from "../parts/count-up";
import { revealStep } from "@/lib/motion/reveal";
import type { AppLocale } from "@/i18n/routing";
import type { AboutPage, AboutStat } from "@/lib/about/types";
import { sectionAnchor } from "@/lib/about/types";

/**
 * Scene 09 — the federation's ecosystem, and its figures.
 *
 * ── The motion ───────────────────────────────────────────────────────────
 *
 * The three-colour ring turns with the reader's descent, and the figures count
 * to themselves once. The rotation is bound to this section's own scroll
 * progress and is a `transform`, so it cannot move anything around it.
 *
 * ── The figures ──────────────────────────────────────────────────────────
 *
 * Counted from the records, never written by an editor, and the API sends only
 * the ones it could actually count. So the row draws what arrived: three tiles
 * today, because this platform has no championships register yet, and four the
 * day it does — without this file changing. The grid is sized from the count
 * for that reason.
 *
 * If nothing could be counted the API omits the section altogether, so there
 * is no empty state to draw here.
 */
export const AboutEcosystem = ({
  ecosystem,
  locale,
}: {
  ecosystem: NonNullable<AboutPage["ecosystem"]>;
  locale: AppLocale;
}) => {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start end", "end start"] });
  const spin = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section
      ref={section}
      id={sectionAnchor("ecosystem")}
      aria-labelledby="about-ecosystem-title"
      data-register="neutral"
      data-surface="canvas"
      className="bg-[color:var(--color-surface-sunken)] py-16 md:py-20 lg:py-28"
    >
      <div className={CONTAINER}>
        <header className="mx-auto mb-12 flex max-w-[40rem] flex-col items-center gap-3.5 text-center">
          <SectionEyebrow>{ecosystem.eyebrow[locale]}</SectionEyebrow>
          <h2 id="about-ecosystem-title" className="text-balance text-heading-lg font-extrabold">
            {ecosystem.title[locale]}
          </h2>
        </header>

        <div className="mx-auto mb-12 flex justify-center">
          <m.span
            aria-hidden="true"
            className="grid size-[15rem] place-items-center rounded-full p-2.5 [background:conic-gradient(var(--color-brand-primary)_0_33%,var(--color-text-primary)_33%_66%,var(--color-brand-secondary)_66%_100%)]"
            style={reduced ? undefined : { rotate: spin }}
          >
            <span className="grid size-full place-items-center rounded-full bg-[color:var(--color-section-black-surface)]" />
          </m.span>
        </div>

        <ul
          data-reveal=""
          className="grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]"
        >
          {ecosystem.stats.map((stat, index) => (
            <li key={stat.key} data-reveal-part="rise" style={revealStep(index)}>
              <StatTile stat={stat} index={index} locale={locale} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

/** The identity colours in the guide's own order, cycled so a row of three and
 *  a row of four are both coherent. */
const TILE_TONES = [
  "bg-[color:var(--color-brand-primary)] text-[color:var(--color-text-on-brand)]",
  "bg-[color:var(--color-section-black-surface)] text-[color:var(--color-section-black-text)]",
  "bg-[color:var(--color-brand-secondary)] text-[color:var(--color-text-on-brand)]",
] as const;

const StatTile = ({ stat, index, locale }: { stat: AboutStat; index: number; locale: AppLocale }) => {
  const t = useTranslations("About");

  return (
    <article
      className={`flex h-full min-h-[9.5rem] flex-col justify-between gap-5 rounded-[var(--radius-lg)] p-6 ${
        TILE_TONES[index % TILE_TONES.length]
      }`}
    >
      <span className="text-body font-semibold">{t(`ecosystem.source.${stat.key}`)}</span>
      <div>
        <p className="text-[2.75rem] font-black leading-none">
          <CountUp value={stat.value} locale={locale} />
        </p>
        <p className="mt-2 text-label">{t(`ecosystem.unit.${stat.key}`)}</p>
      </div>
    </article>
  );
};

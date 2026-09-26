"use client";

import { useRef } from "react";
import { m, useReducedMotion, useScroll } from "motion/react";
import { useTranslations } from "next-intl";
import { CONTAINER } from "@/components/ui/section";
import { CARD } from "@/components/ui/surface";
import { SectionEyebrow } from "../parts/section-eyebrow";
import { RichText } from "@/lib/about/rich-text";
import type { AppLocale } from "@/i18n/routing";
import type { AboutMilestone, AboutPage } from "@/lib/about/types";
import { sectionAnchor } from "@/lib/about/types";

/**
 * Scene 04 — the founding years.
 *
 * ── The motion ───────────────────────────────────────────────────────────
 *
 * A grey track runs the height of the list, and the identity-coloured line is
 * drawn over it as the reader descends: `scaleY` bound to this section's own
 * scroll progress, which is a compositor-only property, so the page cannot
 * shift under it. Each card arrives from its own side.
 *
 * `useScroll` is bound to this section's element and reads nothing about any
 * other section, which is what lets a neighbour be missing without this scene
 * noticing (ADR-0101 D4).
 *
 * ── Which side a card is on ──────────────────────────────────────────────
 *
 * From the item's position in the list the API sent — that is, after every
 * hidden and undated milestone has already been removed. Taken from a stored
 * order instead, hiding the third of six would leave two cards on the same
 * side and a gap where the third had been. The line's height is the visible
 * list's height for the same reason.
 *
 * Below `lg` there is no alternation: one column, the track on the reading
 * edge, because two columns of prose at phone width is neither.
 */
export const AboutTimeline = ({
  timeline,
  locale,
}: {
  timeline: NonNullable<AboutPage["timeline"]>;
  locale: AppLocale;
}) => {
  const reduced = useReducedMotion();
  const list = useRef<HTMLOListElement>(null);

  const { scrollYProgress } = useScroll({ target: list, offset: ["start 80%", "end 60%"] });

  return (
    <section
      id={sectionAnchor("timeline")}
      aria-labelledby="about-timeline-title"
      data-register="neutral"
      data-surface="canvas"
      className="relative overflow-hidden bg-[color:var(--color-surface-sunken)] py-16 md:py-20 lg:py-28"
    >
      <div className={CONTAINER}>
        <header className="mx-auto mb-12 flex max-w-[44rem] flex-col items-center gap-3.5 text-center lg:mb-16">
          <SectionEyebrow>{timeline.eyebrow[locale]}</SectionEyebrow>
          <h2 id="about-timeline-title" className="text-balance text-heading-lg font-extrabold">
            {timeline.title[locale]}
          </h2>
          <p className="text-body-lg leading-relaxed text-[color:var(--color-text-secondary)]">
            {timeline.description[locale]}
          </p>
        </header>

        <ol ref={list} className="relative flex list-none flex-col gap-7">
          {/* The track and the line it carries. Both are decorative: the order
              is already in the list's own markup. */}
          <li
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-[0.9375rem] w-1 rounded-full bg-[color:var(--color-border-default)] lg:start-1/2 lg:-ms-0.5"
          />
          <m.li
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-[0.9375rem] w-1 origin-top rounded-full from-[var(--color-brand-primary)] via-[var(--color-text-primary)] to-[var(--color-brand-secondary)] bg-linear-to-b lg:start-1/2 lg:-ms-0.5"
            style={reduced ? { scaleY: 1 } : { scaleY: scrollYProgress }}
          />

          {timeline.items.map((item, index) => (
            <MilestoneRow key={item._id} item={item} index={index} locale={locale} reduced={Boolean(reduced)} />
          ))}
        </ol>
      </div>
    </section>
  );
};

const MilestoneRow = ({
  item,
  index,
  locale,
  reduced,
}: {
  item: AboutMilestone;
  index: number;
  locale: AppLocale;
  reduced: boolean;
}) => {
  // The filtered index, so alternation survives an editor hiding a milestone
  // in the middle of the list.
  const onStartSide = index % 2 === 0;

  return (
    <li className="relative ps-10 lg:grid lg:grid-cols-[1fr_7.5rem_1fr] lg:items-center lg:ps-0">
      <div className={onStartSide ? "lg:col-start-1" : "lg:col-start-3 lg:row-start-1"}>
        <m.div
          initial={reduced ? undefined : { opacity: 0, x: onStartSide ? "-1.5rem" : "1.5rem" }}
          whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-12%" }}
          transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <MilestoneCard item={item} locale={locale} />
        </m.div>
      </div>

      <span className="absolute top-8 flex size-8 items-center justify-center start-0 lg:static lg:col-start-2 lg:row-start-1 lg:justify-self-center">
        <span
          aria-hidden="true"
          className={`block rounded-full ${
            item.featured
              ? "size-8 [background:conic-gradient(var(--color-brand-primary)_0_33%,var(--color-text-primary)_33%_66%,var(--color-brand-secondary)_66%_100%)]"
              : "size-6 border-[5px] border-[color:var(--color-brand-primary)] bg-[color:var(--color-surface-raised)]"
          }`}
        />
      </span>
    </li>
  );
};

const MilestoneCard = ({ item, locale }: { item: AboutMilestone; locale: AppLocale }) => {
  const t = useTranslations("About");

  return (
    <article
      className={`flex flex-col gap-2.5 p-6 md:p-7 ${
        item.featured
          ? "rounded-[var(--radius-lg)] border-2 border-transparent bg-[color:var(--color-section-black-surface)] text-[color:var(--color-section-black-text)]"
          : `${CARD} border-2 border-[color:var(--color-brand-primary)]`
      }`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={`text-heading-sm font-black ${
            item.featured ? "text-[color:var(--color-section-black-text)]" : "text-[color:var(--color-text-link)]"
          }`}
        >
          {formatDate(item, locale)}
        </span>
        {/* 13px, not the canvas's 12px: the 13px floor holds and ADR-0041's
            exceptions are non-transferable (owner decision 2026-09-25). */}
        <span
          className={`rounded-full px-3 py-1 text-label font-bold ${
            item.featured
              ? "bg-[color:var(--color-brand-primary)] text-[color:var(--color-text-on-brand)]"
              : "bg-[color-mix(in_srgb,var(--color-semantic-success)_10%,transparent)] text-[color:var(--color-semantic-success-text)]"
          }`}
        >
          {t(`timeline.category.${item.category}`)}
        </span>
      </div>

      <h3 className="text-body-lg font-bold leading-snug">{item.title[locale]}</h3>
      <p
        className={`text-body leading-relaxed ${
          item.featured
            ? "text-[color:var(--color-section-black-text-muted)]"
            : "text-[color:var(--color-text-secondary)]"
        }`}
      >
        <RichText text={item.description[locale]} />
      </p>
    </article>
  );
};

/**
 * The date at exactly the precision the federation confirmed — never padded
 * out to a fuller one. An undated milestone never reaches this page at all,
 * so there is no case for "no date" here.
 */
const formatDate = (item: AboutMilestone, locale: AppLocale): string => {
  const year = new Intl.NumberFormat(locale, { numberingSystem: "latn", useGrouping: false }).format(item.year);

  if (item.datePrecision === "year" || item.month === null) {
    return year;
  }

  const month = new Intl.DateTimeFormat(locale, { month: "long", numberingSystem: "latn" }).format(
    new Date(Date.UTC(2000, item.month - 1, 1)),
  );

  if (item.datePrecision === "fullDate" && item.day !== null) {
    const day = new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(item.day);
    return `${day} ${month} ${year}`;
  }

  return `${month} ${year}`;
};

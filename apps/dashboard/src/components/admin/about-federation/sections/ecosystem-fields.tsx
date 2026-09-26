"use client";

import { useTranslations } from "next-intl";
import { SectionHeadings } from "./section-headings";
import type { SectionFieldsProps } from "./section-fields";

/** The four tiles, in the order the page draws them. */
const FIGURE_KEYS = ["clubs", "athletes", "officials", "championships"] as const;
type FigureKey = (typeof FIGURE_KEYS)[number];

/** One counted figure, as `/about-federation-page/sources` names it. */
export interface EcosystemFigure {
  key: FigureKey;
  value: number | null;
}

/** Whether the platform holds anything to count the figure from. The API types
 *  `championships` as `null` outright: there is no championships register, so
 *  that tile has no source rather than a missing number. */
const HAS_SOURCE: Record<FigureKey, boolean> = {
  clubs: true,
  athletes: true,
  officials: true,
  championships: false,
};

/**
 * The heading over the ring diagram and the counted tiles.
 *
 * Only the two headings are stored. The four numbers are counted from the
 * records every time the page is read, and the section follows them rather
 * than a switch (ADR-0101): a tile with no number is left out, and the whole
 * section is left out when none of them could be counted.
 *
 * ── Why the figures are shown here at all ─────────────────────────────────
 *
 * An editor who cannot see the numbers cannot tell that a tile is about to
 * vanish, or why. So they are listed with the record each is counted from,
 * and a missing one says which kind of missing it is: championships has no
 * register in this platform, while the other three are missing only when the
 * count could not be read. Zero is printed as zero — none is a fact the page
 * may state, unknown is not.
 *
 * Nothing in the panel is an input, disabled or otherwise. A disabled field
 * reads as a permission the editor lacks; these figures live in other
 * records, and the panel says so.
 */
export const EcosystemFields = ({
  value,
  patch,
  disabled,
  locale,
  stats,
}: SectionFieldsProps<"ecosystem"> & { stats: readonly EcosystemFigure[] }) => {
  const t = useTranslations("AboutFederation");
  // Latin digits throughout (Chapter 19 §5): `ar` alone would reach them only
  // by the locale's default rather than by a decision.
  const format = new Intl.NumberFormat(locale, { numberingSystem: "latn" });

  // Looked up per key rather than mapped from what arrived. The API sends an
  // empty list when nothing could be counted, and the screen falls back to one
  // when the read is refused; either way every tile still gets its row and
  // its reason.
  const figures = FIGURE_KEYS.map((key) => ({
    key,
    value: stats.find((stat) => stat.key === key)?.value ?? null,
  }));
  const noneCounted = figures.every((figure) => figure.value === null);

  return (
    <>
      <SectionHeadings
        idPrefix="about-ecosystem"
        value={value}
        patch={patch}
        disabled={disabled}
        withDescription={false}
      />

      <div
        role="group"
        aria-labelledby="about-ecosystem-figures-title"
        className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-sunken)] p-4"
      >
        <div className="flex items-start gap-2.5">
          <LockIcon />
          <div className="flex flex-col gap-1">
            <h4 id="about-ecosystem-figures-title" className="text-label font-bold">
              {t("ecosystem.figuresTitle")}
            </h4>
            <p className="text-caption leading-relaxed text-[color:var(--color-text-muted)]">
              {t("ecosystem.figuresBody")}
            </p>
          </div>
        </div>

        <dl className="flex flex-col divide-y divide-[color:var(--color-border-subtle)]">
          {figures.map((figure) => (
            <div
              key={figure.key}
              className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
            >
              <dt className="text-body font-semibold">{t(`ecosystem.figure.${figure.key}`)}</dt>
              {figure.value !== null ? (
                <dd className="text-end text-h4 font-bold tabular-nums">{format.format(figure.value)}</dd>
              ) : (
                // Stated in words as well as in tone, so the two kinds of
                // missing never rest on colour alone (WCAG 1.4.1).
                <dd
                  className={`text-end text-label font-semibold ${
                    HAS_SOURCE[figure.key]
                      ? "text-[color:var(--color-semantic-warning-text)]"
                      : "text-[color:var(--color-text-muted)]"
                  }`}
                >
                  {HAS_SOURCE[figure.key] ? t("ecosystem.unavailable") : t("ecosystem.noSource")}
                </dd>
              )}
              <dd className="col-span-2 text-caption leading-relaxed text-[color:var(--color-text-muted)]">
                {t(`ecosystem.from.${figure.key}`)}
                {figure.value === null ? ` ${t("ecosystem.notDrawn")}` : null}
              </dd>
            </div>
          ))}
        </dl>

        {noneCounted ? (
          <p className="text-caption leading-relaxed text-[color:var(--color-semantic-warning-text)]">
            {t("ecosystem.noneCounted")}
          </p>
        ) : null}
      </div>
    </>
  );
};

/* The padlock the section list draws on the hero's lock, at field size: the
   same mark for "not editable here" wherever the screen says it. */

const LockIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    className="mt-0.5 shrink-0 text-[color:var(--color-text-muted)]"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

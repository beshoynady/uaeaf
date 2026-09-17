/**
 * The homepage hero's presentation values that both the site and the
 * dashboard's preview draw with: the reading wash, the layout at a width, and
 * the type scale. The site applies them through its CSS at real breakpoints;
 * the preview applies them to a frame of a chosen width, where the dashboard
 * window's own media queries would give the wrong answer.
 */

const wash = (percent: number) => `color-mix(in srgb, var(--color-surface-overlay) ${percent}%, transparent)`;

/**
 * The hero's own reading ground (owner decisions 2026-09-16).
 *
 * - `narrow` (below `md`): the whole frame takes a floor from 64% to 74% by the
 *   middle, deepening to 86% at the foot, where the controls have no ground of
 *   their own.
 * - `wide` (from `md`): one layer across the frame from the side the line starts
 *   from, one up from the foot.
 *
 * Every text over it measured at 4.5:1 or more, in both languages and three
 * themes (ADR-0080 D3).
 */
export const heroScrim = (width: "narrow" | "wide", dir: "rtl" | "ltr"): string =>
  width === "narrow"
    ? `linear-gradient(to bottom, ${wash(64)} 0%, ${wash(74)} 50%, ${wash(86)} 100%)`
    : `linear-gradient(to ${dir === "rtl" ? "left" : "right"}, ${wash(74)} 0%, ${wash(60)} 35%, transparent 68%), linear-gradient(to bottom, transparent 40%, ${wash(80)} 100%)`;

export interface HeroFrameLayout {
  /** The container's inline padding at this width, in px (`CONTAINER`). */
  gutter: number;
  frameMax: number;
  measure: string;
  wash: "narrow" | "wide";
  type: "mobile" | "desktop";
  /** The text layer's bottom reserve (`.hero-stage-text`). */
  textPaddingBottom: (hasEvent: boolean) => string;
}

/** The site's `CONTAINER` gutters: px-4, sm:px-6, md:px-8, lg:px-12, xl:px-16. */
const gutterAt = (width: number): number =>
  width >= 1280 ? 64 : width >= 1024 ? 48 : width >= 768 ? 32 : width >= 640 ? 24 : 16;

export const heroFrameLayout = (width: number): HeroFrameLayout => {
  const wide = width >= 768;
  return {
    gutter: gutterAt(width),
    frameMax: 1440,
    measure: "62ch",
    wash: wide ? "wide" : "narrow",
    type: wide ? "desktop" : "mobile",
    // The next-event bar is two short lines' worth taller on a phone.
    textPaddingBottom: (hasEvent) =>
      `calc(${hasEvent ? (wide ? "var(--space-16)" : "var(--space-24)") : "0px"} + var(--space-4) + var(--space-12) + var(--space-8))`,
  };
};

interface TypeStyle {
  fontSize: string;
  lineHeight: number;
  fontWeight: string;
  letterSpacing?: string;
}

/** The site's `text-overline`, `text-h1`, `text-body` and `text-body-sm`, as
 *  values for a frame rather than utilities for a viewport. */
export const heroType = (device: "mobile" | "desktop"): Record<"eyebrow" | "title" | "subtitle" | "button" | "caption", TypeStyle> => ({
  eyebrow: {
    fontSize: "var(--typography-overline-desktop)",
    lineHeight: 1.3,
    fontWeight: "var(--font-weight-bold)",
    letterSpacing: "0.08em",
  },
  title:
    device === "mobile"
      ? { fontSize: "var(--typography-heading-page-mobile)", lineHeight: 1.25, fontWeight: "var(--font-weight-black)" }
      : { fontSize: "var(--typography-heading-page-desktop)", lineHeight: 1.2, fontWeight: "var(--font-weight-black)" },
  subtitle:
    device === "mobile"
      ? { fontSize: "var(--typography-body-mobile)", lineHeight: 1.55, fontWeight: "var(--font-weight-regular)" }
      : { fontSize: "var(--typography-body-desktop)", lineHeight: 1.6, fontWeight: "var(--font-weight-regular)" },
  button: {
    fontSize: device === "mobile" ? "var(--typography-body-sm-mobile)" : "var(--typography-body-sm-desktop)",
    lineHeight: 1.5,
    // The site's button is `font-semibold`, Tailwind's 600: the token set has no
    // semibold weight, so the value is the site's own, not a new one.
    fontWeight: "600",
  },
  caption: {
    fontSize: device === "mobile" ? "var(--typography-caption-mobile)" : "var(--typography-caption-desktop)",
    lineHeight: 1.4,
    fontWeight: "var(--font-weight-regular)",
  },
});

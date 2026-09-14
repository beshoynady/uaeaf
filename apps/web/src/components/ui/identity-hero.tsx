import type { CSSProperties, ReactNode } from "react";
import { CONTAINER, REGISTER_CLASSES } from "./section";
import { HERO_MEASURE, HERO_PARALLAX, HERO_SCRIM, HERO_TEXT, HERO_VIEWPORT } from "./surface";
import type { AppLocale } from "@/i18n/routing";
import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import type { PublicImage } from "@/lib/api/types";

/**
 * The identity-lines hero (ADR-0069 D10), for the pages the owner adopted the
 * lines on: the President's Message, and Vision & Mission (ADR-0070).
 *
 * The composition follows the record, as `PageHero`'s height does (ADR-0067
 * D2): with a background image the hero stands on it under `HERO_SCRIM`
 * (composition C); without one it stands on the green register (composition
 * B). An editor changes the composition by uploading or removing the picture,
 * never by a setting.
 *
 * - The portrait, where the page has one, on the right and the title block on
 *   the left, in both languages, never overlapping. Side by side from `lg`,
 *   where the portrait takes at most 5 of the 12 columns; below it the title
 *   comes first and the portrait follows (Chapter 5 §5.10). Without a portrait
 *   the title takes the whole row in either language.
 * - With a picture or a portrait, at least the screen minus the header; where
 *   the title, the lines and the portrait cannot all fit it grows instead.
 *   With neither, its content's height: ADR-0067 D2 gives the first screen to
 *   a hero that has something to fill it with, and `PageHero` does the same.
 * - From `lg` the title block follows group A's reserve directly, as it
 *   follows the breadcrumb in the Figma frames (`1219:2300`, `1268:2321`),
 *   rather than standing on the bottom edge 525px below the breadcrumb; the
 *   portrait stays on the bottom edge.
 * - The identity lines in place of the motif, under D10's distribution rule.
 */

/**
 * The identity lines (ADR-0069 D10).
 *
 * - Shape: the footer's four ribbons, `public/brand/swoosh-*.svg`.
 * - Order, lengths, spacing, angle: the logo's strokes as ADR-0059 §D7 measured
 *   them in `uaeaf-ribbon-motif.svg`, in ribbon units: red 40.8, green 81.2,
 *   black 56.0, red 23.4 from the left, tails on one baseline 32.66 apart, 45°.
 * - Two groups, split in the logo's order: A (red, green) at the top left, B
 *   (black, red) at the bottom right. B is A's arrangement translated along the
 *   hero's diagonal, at the same scale and angle (IL-2).
 * - Scale: one ribbon unit is the green stroke's length over 81.2 (IL-4).
 * - Safe distance: `--space-8`, measured along the perpendicular, from every
 *   stroke to every piece of content, at rest and throughout the entrance
 *   (IL-5). The portrait is inset by B's footprint and the path B rises along,
 *   and the title column reserves A's footprint and the path A slides along.
 *   Both reserves also carry the distance the text and the portrait themselves
 *   travel in their entrance, which the guard measured closing the gap to
 *   30.6px without it.
 * - Physical in both languages (IL-7). Black is drawn white on a photograph,
 *   as the footer draws it on a dark ground (IL-8).
 * - Arabic below `lg`: group A stands at the title's level instead of above it
 *   (D10, owner decision 2026-09-13). The Arabic title holds the right edge, so
 *   the frame's left edge beside it is free, and the hero fits a short phone's
 *   first screen. English keeps the reserve above the title.
 */
const RIBBONS = {
  red: {
    d: "M0 11.5C70.7 10.35 131.3 3.45 190.457 0C196.806 0 202 5.175 202 11.5C202 17.825 196.806 23 190.457 23C131.3 19.55 70.7 12.65 0 11.5Z",
    width: 202,
    height: 23,
  },
  green: {
    d: "M0 19C101.15 17.1 187.85 5.7 270.215 0C280.547 0 289 8.55 289 19C289 29.45 280.547 38 270.215 38C187.85 32.3 101.15 20.9 0 19Z",
    width: 289,
    height: 38,
  },
  ink: {
    d: "M0 13C80.85 11.7 150.15 3.9 218.006 0C225.153 0 231 5.85 231 13C231 20.15 225.153 26 218.006 26C150.15 22.1 80.85 14.3 0 13Z",
    width: 231,
    height: 26,
  },
  redSmall: {
    d: "M0 8.5C50.75 7.65 94.25 2.55 136.3 0C141.085 0 145 3.825 145 8.5C145 13.175 141.085 17 136.3 17C94.25 14.45 50.75 9.35 0 8.5Z",
    width: 145,
    height: 17,
  },
};

interface Stroke {
  ribbon: (typeof RIBBONS)[keyof typeof RIBBONS];
  tone: "red" | "green" | "ink";
  length: number;
  /** Tail position on the group's baseline, in ribbon units. */
  tail: number;
}

const SPACING = 32.66;

const GROUP_A: readonly Stroke[] = [
  { ribbon: RIBBONS.red, tone: "red", length: 40.8, tail: 0 },
  { ribbon: RIBBONS.green, tone: "green", length: 81.2, tail: SPACING },
];

const GROUP_B: readonly Stroke[] = [
  { ribbon: RIBBONS.ink, tone: "ink", length: 56.0, tail: 0 },
  { ribbon: RIBBONS.redSmall, tone: "red", length: 23.4, tail: SPACING },
];

const thickness = (s: Stroke): number => (s.ribbon.height * s.length) / s.ribbon.width;

/** How far a stroke reaches right of and above its tail at 45°, cap included. */
const reach = (s: Stroke): number => s.length * Math.SQRT1_2 + (thickness(s) * Math.SQRT1_2) / 2;

const groupWidth = (group: readonly Stroke[]): number => Math.max(...group.map((s) => s.tail + reach(s)));
const groupHeight = (group: readonly Stroke[]): number => Math.max(...group.map(reach));

const A_WIDTH = groupWidth(GROUP_A);
const A_HEIGHT = groupHeight(GROUP_A);
const B_WIDTH = groupWidth(GROUP_B);
const B_HEIGHT = groupHeight(GROUP_B);

/** A enters along its axis from the left edge, so below its tails the green
 *  stroke sweeps a band down to that edge. At the container margin the band
 *  reaches this far below A's baseline, less the margin itself. */
const A_ENTRY_DEPTH = SPACING + thickness(GROUP_A[1]) * Math.SQRT1_2;

/** B rises out of the seam along its axis, and while it does its thickest part
 *  passes over its own tail, spreading this far left of it. */
const B_ENTRY_SPREAD = thickness(GROUP_B[0]) * Math.SQRT1_2;

const unit = (n: number): string => `calc(var(--il-unit) * ${n.toFixed(3)})`;

/** The strokes cross at 45°, so a vertical or horizontal clearance of
 *  `--space-8` would leave only `--space-8 / √2` along the perpendicular. */
const DIAGONAL_SAFE = "var(--space-8) * 1.4142";

/**
 * The portrait's floor on a phone, in Arabic: its width at 375px with the lines
 * at their default size (owner decision 2026-09-13, "the portrait stays at
 * 249px or better"). Below that width the lines give way, not the portrait.
 */
const PORTRAIT_FLOOR = "249px";

/** The ribbon unit at which B's inset leaves the portrait exactly its floor:
 *  the inverse of `PORTRAIT_INSET` below, solved for the unit. */
const UNIT_TO_KEEP_PORTRAIT = `calc((100vw - var(--il-margin) - ${PORTRAIT_FLOOR} - ${DIAGONAL_SAFE} - var(--pm-rise)) / ${(B_WIDTH + B_ENTRY_SPREAD).toFixed(3)})`;

/** Arabic below `md` with a portrait: the lines shrink before the portrait
 *  goes under its floor. Without a portrait there is no floor to keep. */
const IL_UNIT_KEEP_PORTRAIT = "max-md:rtl:[--il-unit:min(calc(var(--space-24)/81.2),var(--il-unit-keep-portrait))]";

/** Per-breakpoint variables the lines, the portrait inset and the title
 *  reserve all read, so the three cannot disagree. */
const ilVariables = (portrait: boolean): string => [
  "[--il-unit:calc(var(--space-24)/81.2)]",
  ...(portrait ? [IL_UNIT_KEEP_PORTRAIT] : []),
  "md:[--il-unit:calc((var(--space-24)_+_var(--space-2))/81.2)]",
  "xl:[--il-unit:calc((var(--space-32)_+_var(--space-16))/81.2)]",
  "[--il-margin:var(--grid-margin-xs)]",
  "sm:[--il-margin:var(--grid-margin-sm)]",
  "md:[--il-margin:var(--grid-margin-md)]",
  "lg:[--il-margin:var(--grid-margin-lg)]",
  "xl:[--il-margin:var(--grid-margin-xl)]",
  "[--pm-rise:calc(var(--motion-ascent-offset)/2)]",
  "md:[--pm-rise:var(--motion-ascent-offset)]",
].join(" ");

/** The portrait stops short of group B, of the path B rises along, and of the
 *  distance the portrait itself rises. */
const PORTRAIT_INSET = `max(0px, calc(${unit(B_WIDTH + B_ENTRY_SPREAD)} + ${DIAGONAL_SAFE} + var(--pm-rise) - var(--il-margin)))`;

/** The title column starts below the trail's clearance, A, A's entry path, the
 *  diagonal clearance and the title's own settle; the grid's own top padding
 *  is already part of it. */
const TITLE_RESERVE = `calc(var(--space-8) + ${unit(A_HEIGHT)} + max(0px, calc(${unit(A_ENTRY_DEPTH)} - var(--il-margin))) + ${DIAGONAL_SAFE} + var(--pm-rise) - var(--space-6))`;

/**
 * Without a portrait the text column can end on the hero's bottom edge, where
 * group B stands: below `lg` the guard measured the subtitle 0px from B, and a
 * hero sized to its content ends there at every width. The column keeps B's
 * height clear under the text, plus the diagonal clearance and the text's own
 * settle — the title reserve's construction, mirrored (IL-5, IL-9; ADR-0070).
 * With a portrait, the portrait's inset already holds B off.
 */
const LINES_B_RESERVE = `calc(${unit(B_HEIGHT)} + ${DIAGONAL_SAFE} + var(--pm-rise))`;

/** Both groups start together at this step, once the subtitle has begun
 *  (breadcrumb 0, title 1, lead 2, subtitle 3); inside a group the strokes
 *  follow the reading order one stagger step apart. */
const LINES_STEP = 5;

const step = (n: number): CSSProperties => ({ "--pm-step": n }) as CSSProperties;

/** The ground a set of lines stands on, which decides only the black stroke:
 *  the green register draws it black, a photograph under the scrim white (IL-8),
 *  and the page's own ground in the logo's ink, black or the monochrome mark's
 *  `currentColor` on the dark theme (Chapter 1 ADR-0002; ADR-0071 D8). */
type Ink = "register" | "photo" | "page";

const strokeFill = (tone: Stroke["tone"], ink: Ink): string => {
  if (tone === "red") return "var(--color-brand-secondary)";
  if (tone === "green") return "var(--color-brand-primary)";
  if (ink === "photo") return "var(--color-text-on-brand)";
  if (ink === "page") return "var(--logo-ink)";
  return "var(--color-brand-black)";
};

/**
 * Each stroke is positioned on its own and is the element that moves. Nested
 * in a positioned group box, Chrome attributed the strokes' transform to that
 * box and counted a layout shift although the box never moved; the element
 * carrying the transform is the only one whose movement is not a shift.
 */
const LineStroke = ({
  group,
  stroke,
  index,
  order,
  ink,
  position,
  className = "",
  entrance = true,
}: {
  group: "a" | "b";
  stroke: Stroke;
  index: number;
  /** Place in its group's stagger, in each reading direction. */
  order: { ltr: number; rtl: number };
  ink: Ink;
  position: CSSProperties;
  className?: string;
  /** The hero's entrance (`.il-stroke`); a band between sections draws its
   *  strokes at rest. */
  entrance?: boolean;
}) => {
  const size = reach(stroke);
  return (
    <span
      className={`${entrance ? "il-stroke " : ""}absolute ${className}`}
      data-il-group={group}
      data-il-stroke={index}
      style={
        {
          ...position,
          width: unit(size),
          height: unit(size),
          "--il-order-ltr": order.ltr,
          "--il-order-rtl": order.rtl,
        } as CSSProperties
      }
    >
      <svg
        viewBox={`0 ${(-size).toFixed(3)} ${size.toFixed(3)} ${size.toFixed(3)}`}
        overflow="visible"
        focusable="false"
        className="block size-full"
      >
        <path
          d={stroke.ribbon.d}
          fill={strokeFill(stroke.tone, ink)}
          transform={`rotate(-45) scale(${(stroke.length / stroke.ribbon.width).toFixed(4)}) translate(0 ${-stroke.ribbon.height / 2})`}
        />
      </svg>
    </span>
  );
};

const LINES_TIMING = {
  "--il-travel": unit(A_WIDTH),
  "--pm-lines-step": LINES_STEP,
} as CSSProperties;

/** Group A's strokes, their tails on the frame's left edge and their highest
 *  point on the top of the box they are placed in. */
const GroupA = ({
  ink,
  className,
  top,
  entrance = true,
}: {
  ink: Ink;
  className: string;
  top: string;
  entrance?: boolean;
}) =>
  GROUP_A.map((stroke, i) => (
    <LineStroke
      key={`a${i}`}
      group="a"
      stroke={stroke}
      index={i}
      order={{ ltr: i, rtl: GROUP_A.length - 1 - i }}
      ink={ink}
      className={className}
      entrance={entrance}
      position={{ left: unit(stroke.tail), top: `calc(${top} + ${unit(A_HEIGHT - reach(stroke))})` }}
    />
  ));

/** Group B's strokes on the frame's right edge, their tails `bottom` above the
 *  bottom edge of the box they are placed in. */
const GroupB = ({ ink, entrance = true, bottom = "0px" }: { ink: Ink; entrance?: boolean; bottom?: string }) =>
  GROUP_B.map((stroke, i) => (
    <LineStroke
      key={`b${i}`}
      group="b"
      stroke={stroke}
      index={GROUP_A.length + i}
      order={{ ltr: i, rtl: GROUP_B.length - 1 - i }}
      ink={ink}
      className="block"
      entrance={entrance}
      position={{ right: unit(B_WIDTH - stroke.tail - reach(stroke)), bottom: `calc(${bottom})` }}
    />
  ));

/** Below the content in paint order: `--zIndex-base`, first in the DOM, inside
 *  the hero's own stacking context (IL-6). Clipped to the 1440 frame, so a
 *  stroke outside it is never painted and never widens the page. Group A is
 *  drawn here except, with a portrait, in Arabic below `lg`, where it stands
 *  beside the title.
 *
 *  That exception is D10's answer to the portrait's height on a short phone.
 *  Without a portrait the hero is short, and A entering beside the title
 *  crossed the subtitle (the guard measured 14.6px during the entrance), so
 *  both languages keep IL-3: A above the title, with its reserve (ADR-0070).
 *
 *  `overflow: clip`, here and on the hero, not `hidden`: `hidden` still makes a
 *  scroll container, and in Arabic a stroke entering from beyond the left edge
 *  overflows on that container's scrollable side. Under a slow CPU the hero
 *  took a scroll offset for the length of the entrance and gave it back at the
 *  end, which Chrome counted as the whole column shifting sideways. */
const IdentityLines = ({ onPhoto, besideTitle }: { onPhoto: boolean; besideTitle: boolean }) => (
  <div
    aria-hidden="true"
    data-identity-lines=""
    className="pointer-events-none absolute inset-0 mx-auto max-w-[1440px] overflow-clip"
    style={{ zIndex: "var(--zIndex-base)", ...LINES_TIMING }}
  >
    <GroupA
      ink={onPhoto ? "photo" : "register"}
      className={besideTitle ? "block max-lg:rtl:hidden" : "block"}
      top="var(--space-8)"
    />
    <GroupB ink={onPhoto ? "photo" : "register"} />
  </div>
);

/**
 * A band between sections that carries the identity lines (ADR-0071 D8), on
 * the page's own neutral ground.
 *
 * The hero's rule, applied to a band: A on the frame's left edge, B on the
 * frame's right edge, one scale (IL-1 to IL-4), below the content in paint
 * order (IL-6), physical in both languages (IL-7). The strokes do not enter: a
 * band further down the page is not a stage, and nothing on it moves but its
 * content's one-shot rise.
 *
 * IL-5 holds by construction, on both sides of each edge:
 * - A's highest point and B's tails stand the diagonal clearance inside the
 *   band's top and bottom edges, as A stands `--space-8` below the breadcrumb
 *   in the hero (IL-3). B's tails once sat on the bottom edge, and the guard
 *   measured the goals heading below it 0px away in Arabic, where that heading
 *   holds the right edge.
 * - The content starts below that clearance, A's height and the clearance
 *   again, and ends above B's height, the clearance twice and the content's
 *   own rise, which carries it downward while it waits to be revealed: the
 *   hero's reserves, without the breadcrumb and the entry path a static group
 *   does not travel.
 */
const BAND_EDGE = DIAGONAL_SAFE;
const BAND_A_RESERVE = `calc(${BAND_EDGE} + ${unit(A_HEIGHT)} + ${DIAGONAL_SAFE})`;
const BAND_B_RESERVE = `calc(${BAND_EDGE} + ${unit(B_HEIGHT)} + ${DIAGONAL_SAFE} + var(--pm-rise))`;

export const IdentityBand = ({ children }: { children: ReactNode }) => (
  <div
    data-identity-band=""
    data-register="neutral"
    className={`relative isolate w-full overflow-clip ${ilVariables(false)} ${REGISTER_CLASSES.neutral.surface}`}
  >
    <div
      aria-hidden="true"
      data-identity-lines=""
      className="pointer-events-none absolute inset-0 mx-auto max-w-[1440px] overflow-clip"
      style={{ zIndex: "var(--zIndex-base)" }}
    >
      <GroupA ink="page" className="block" top={BAND_EDGE} entrance={false} />
      <GroupB ink="page" entrance={false} bottom={BAND_EDGE} />
    </div>
    <div className={`relative ${CONTAINER}`} style={{ paddingTop: BAND_A_RESERVE, paddingBottom: BAND_B_RESERVE }}>
      {children}
    </div>
  </div>
);

/** A plain img element, not next/image: the CDN does the resizing, and a
 *  server component cannot hand next/image the loader function that would say
 *  so. */
const cdnSrc = (url: string, width: number): string =>
  isCloudinaryUrl(url) ? cloudinaryLoader({ src: url, width }) : url;

/**
 * The tallest the portrait may be: the screen less the header, and from `lg`
 * also less the breadcrumb row (its top padding, one caption line and the
 * trail's bottom margin) and the grid's top padding, so it never pushes the
 * hero past the first screen.
 */
const PORTRAIT_CAP =
  "[--pm-portrait-cap:calc(100svh_-_var(--space-24))] lg:[--pm-portrait-cap:calc(100svh_-_var(--space-24)_-_var(--space-8)_-_var(--typography-caption-desktop)_*_1.4_-_var(--space-4)_-_var(--space-8))]";

/**
 * The portrait's size, known before the picture arrives.
 *
 * Sized by the picture itself (`w-auto h-auto`), the portrait was an empty box
 * until it loaded, and on a slow connection the title above it then jumped by
 * the portrait's height: CLS 0.107 on a phone. Its width is now the smallest of
 * its column, its own width and its height cap times its ratio, and its height
 * follows from the ratio, so the box is final from the first frame.
 *
 * From `lg` the portrait's track takes the same width plus B's inset, capped at
 * 5 of the 12 columns, so the title column does not change width when the
 * picture lands either.
 */
const portraitSizing = (portrait: { width: number; height: number }) => {
  const ratio = (portrait.width / portrait.height).toFixed(4);
  return {
    track: `min(calc(100% * 5 / 12), calc(${portrait.width}px + ${PORTRAIT_INSET}), calc(var(--pm-portrait-cap) * ${ratio} + ${PORTRAIT_INSET}))`,
    image: {
      aspectRatio: `${portrait.width} / ${portrait.height}`,
      width: `min(100%, ${portrait.width}px, calc(var(--pm-portrait-cap) * ${ratio}))`,
    } as CSSProperties,
  };
};

export const IdentityHero = ({
  titleId,
  title,
  lead = null,
  subtitle,
  subtitleField,
  ground,
  portrait = null,
  locale,
  breadcrumb,
  height = "first-screen",
}: {
  titleId: string;
  title: string;
  /** A line between the title and the subtitle at the h2 size, without the
   *  h2 element: on the President's Message, the name that signs it. */
  lead?: string | null;
  subtitle: string;
  /** The stored field the subtitle prints, for pages whose text is compared
   *  against the stored record in a browser. */
  subtitleField?: string;
  ground: PublicImage | null;
  portrait?: PublicImage | null;
  locale: AppLocale;
  /** The trail, already built for this ground: a photograph under the scrim
   *  is a dark ground whatever the page's register says. */
  breadcrumb: ReactNode;
  /**
   * `first-screen`: with a picture or a portrait the hero fills the first
   * screen (ADR-0067 D2). `content`: it is a band its content's height whatever
   * it stands on, for a page whose ADR says so (Vision & Mission, ADR-0071 D6).
   */
  height?: "first-screen" | "content";
}) => {
  const onPhoto = Boolean(ground);
  const green = REGISTER_CLASSES.green;
  const sizing = portrait ? portraitSizing(portrait) : null;
  const fillsFirstScreen = height === "first-screen" && Boolean(ground || portrait);

  return (
    <section
      aria-labelledby={titleId}
      data-composition={onPhoto ? "c" : "b"}
      data-register="green"
      className={`relative isolate flex ${fillsFirstScreen ? HERO_VIEWPORT : ""} w-full flex-col overflow-clip ${ilVariables(Boolean(portrait))} ${
        onPhoto ? "text-[color:var(--color-text-on-brand)]" : green.surface
      }`}
      style={{ "--il-unit-keep-portrait": UNIT_TO_KEEP_PORTRAIT } as CSSProperties}
    >
      {ground ? (
        <>
          <div aria-hidden={ground.altText[locale] ? undefined : "true"} className={HERO_PARALLAX}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ground.url}
              srcSet={isCloudinaryUrl(ground.url) ? cloudinarySrcSet(ground.url, ground.width) : undefined}
              sizes="100vw"
              alt={ground.altText[locale]}
              fetchPriority="high"
              className="pm-ground size-full object-cover"
            />
          </div>
          <div aria-hidden="true" className={HERO_SCRIM} />
        </>
      ) : null}

      {/* The trail opens the hero on a row of its own, on the reading edge of
          the language. The title and the portrait below keep their fixed sides. */}
      <div className={`relative ${CONTAINER} pt-6 lg:pt-8`}>
        {breadcrumb ? (
          <div className="pm-settle" style={step(0)}>
            {breadcrumb}
          </div>
        ) : null}
      </div>

      <div className="relative flex flex-1 flex-col">
        <IdentityLines onPhoto={onPhoto} besideTitle={Boolean(portrait)} />

        <div
          className={`relative ${CONTAINER} ${PORTRAIT_CAP} flex flex-1 flex-col gap-8 pt-6 lg:grid lg:grid-rows-[minmax(auto,1fr)] lg:items-end lg:pt-8 ${
            portrait
              ? "lg:grid-cols-[minmax(0,1fr)_var(--pm-portrait-track)] lg:rtl:grid-cols-[var(--pm-portrait-track)_minmax(0,1fr)]"
              : "lg:grid-cols-1"
          }`}
          style={sizing ? ({ "--pm-portrait-track": sizing.track } as CSSProperties) : undefined}
        >
          <div className={`${HERO_TEXT} flex flex-1 shrink-0 flex-col lg:self-stretch lg:pb-8`}>
            <div
              aria-hidden="true"
              data-il-reserve=""
              className={portrait ? "h-[var(--il-reserve)] shrink-0 max-lg:rtl:h-0" : "h-[var(--il-reserve)] shrink-0"}
              style={{ "--il-reserve": TITLE_RESERVE } as CSSProperties}
            />
            <div className="relative mt-auto lg:mt-0">
              {/* Group A beside the title, with a portrait, in Arabic below `lg` only. */}
              {portrait ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 hidden max-lg:rtl:block"
                  style={{ left: "calc(-1 * var(--il-margin))", zIndex: "var(--zIndex-base)", ...LINES_TIMING }}
                >
                  <GroupA ink={onPhoto ? "photo" : "register"} className="block" top="0px" />
                </div>
              ) : null}
              <h1 id={titleId} className="pm-settle relative text-h1 text-balance" style={step(1)}>
                {title}
              </h1>
              {lead ? (
                <p className="pm-settle relative mt-6 text-h2 text-balance" style={step(2)}>
                  {lead}
                </p>
              ) : null}
              {/* `mt-4` straight after the title, as `PageHero` sets it; `mt-2`
                  after a lead line, which already carries the step. */}
              <p
                data-field={subtitleField}
                className={`pm-settle relative ${lead ? "mt-2" : "mt-4"} ${HERO_MEASURE} text-body-lg ${onPhoto ? "opacity-85" : green.muted}`}
                style={step(3)}
              >
                {subtitle}
              </p>
            </div>
            {portrait ? null : (
              <div
                aria-hidden="true"
                data-il-reserve-b=""
                className="shrink-0"
                style={{ height: LINES_B_RESERVE }}
              />
            )}
          </div>

          {portrait && sizing ? (
            // Physical right in both languages, so `justify-end` flips to
            // `justify-start` under RTL. The margin is physical too: it is the
            // room group B needs, and B does not mirror.
            <div
              className="relative flex items-end justify-end rtl:justify-start lg:rtl:order-first"
              style={{ marginRight: PORTRAIT_INSET }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cdnSrc(portrait.url, portrait.width)}
                width={portrait.width}
                height={portrait.height}
                alt={portrait.altText[locale]}
                fetchPriority="high"
                className="pm-portrait relative block h-auto max-w-full"
                style={sizing.image}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

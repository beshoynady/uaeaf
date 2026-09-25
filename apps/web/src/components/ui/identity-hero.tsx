import type { CSSProperties, ReactNode } from "react";
import { AccentRule } from "./accent-rule";
import { IDENTITY_RIBBONS } from "./identity-ribbons";
import { ScrollCue } from "./scroll-cue";
import { CONTAINER, REGISTER_CLASSES } from "./section";
import { HERO_MEASURE, HERO_PARALLAX, HERO_SCRIM, HERO_TEXT, HERO_VIEWPORT } from "./surface";
import type { AppLocale } from "@/i18n/routing";
import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import type { PublicImage } from "@/lib/api/types";

/**
 * The identity-lines hero (ADR-0069 D10), for the pages the owner adopted the
 * lines on: the President's Message, Vision & Mission (ADR-0070) and the
 * Strategic Plan (ADR-0075).
 *
 * **This is the institutional photographic hero. `@uaeaf/brand-ui`'s `PageHero`
 * is the listing pages'.** Two components for one idea, and ADR-0100 D2 is
 * where that is recorded, along with the plan to merge them and what the merge
 * costs — the measured geometry below is the part that cannot simply move,
 * and three guards name this file by path.
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
 * - A trail row only where the page passes one. The institutional pages pass
 *   none (owner decision 2026-09-15, ADR-0072 D7) and keep the trail in their
 *   structured data.
 * - From `lg` the title block follows group A's reserve directly rather than
 *   standing on the bottom edge; the portrait stays on the bottom edge.
 * - The identity lines in place of the motif, under D10's distribution rule.
 */

/**
 * The identity lines (ADR-0069 D10, as amended by ADR-0072 D2).
 *
 * - Shape: the footer's four ribbons, `public/brand/swoosh-*.svg`, at the light
 *   weight: a third of the ribbon's own thickness for its length.
 * - Order, lengths, spacing, angle: the logo's strokes as ADR-0059 §D7 measured
 *   them in `uaeaf-ribbon-motif.svg`, in ribbon units: red 40.8, green 81.2,
 *   black 56.0, red 23.4 from the left, tails on one baseline 32.66 apart, 45°.
 * - Two groups, split in the logo's order: A (red, green) at the top left, B
 *   (black, red) at the bottom right. B is A's arrangement translated along the
 *   hero's diagonal, at the same scale and angle (IL-2).
 * - Scale: one ribbon unit is the green stroke's length over 81.2 (IL-4).
 * - Safe distance: `--space-8`, measured along the perpendicular, from every
 *   stroke to every text run, at rest and throughout the entrance (IL-5). The
 *   hero still keeps the portrait clear by construction: it is inset by B's
 *   footprint and the path B rises along, and the title column reserves A's
 *   footprint and the path A slides along. Both reserves also carry the
 *   distance the text and the portrait themselves travel in their entrance.
 * - Physical in both languages (IL-7). Black is drawn white on a photograph,
 *   as the footer draws it on a dark ground (IL-8).
 * - Arabic below `lg`: group A stands at the title's level instead of above it
 *   (D10, owner decision 2026-09-13). The Arabic title holds the right edge, so
 *   the frame's left edge beside it is free, and the hero fits a short phone's
 *   first screen. English keeps the reserve above the title.
 */
const RIBBONS = IDENTITY_RIBBONS;

interface Stroke {
  ribbon: (typeof RIBBONS)[keyof typeof RIBBONS];
  tone: "red" | "green" | "ink";
  length: number;
  /** Tail position on the group's baseline, in ribbon units. */
  tail: number;
}

const SPACING = 32.66;

/** IL-1's light weight (ADR-0072 D2): the stroke keeps the ribbon's shape and
 *  its length, at a third of the ribbon's thickness for that length. */
const WEIGHT = 1 / 3;

const GROUP_A: readonly Stroke[] = [
  { ribbon: RIBBONS.red, tone: "red", length: 40.8, tail: 0 },
  { ribbon: RIBBONS.green, tone: "green", length: 81.2, tail: SPACING },
];

/** B's red stroke takes A's red length (owner decision 2026-09-15, ADR-0075
 *  M0-C): at the light weight the logo's 23.4 units drew a 1.08px sliver at
 *  390 that faded to 3.18:1 in dark. The group keeps the logo's order and
 *  spacing (IL-2); only this one length departs from the mark's proportions. */
const GROUP_B: readonly Stroke[] = [
  { ribbon: RIBBONS.ink, tone: "ink", length: 56.0, tail: 0 },
  { ribbon: RIBBONS.redSmall, tone: "red", length: 40.8, tail: SPACING },
];

const thickness = (s: Stroke): number => (s.ribbon.height * s.length * WEIGHT) / s.ribbon.width;

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
 *  reserve all read, so the three cannot disagree. `capAtLg` leaves out the xl
 *  step, so the lines keep their lg size on wider screens. */
const ilVariables = (portrait: boolean, capAtLg = false): string => [
  "[--il-unit:calc(var(--space-24)/81.2)]",
  ...(portrait ? [IL_UNIT_KEEP_PORTRAIT] : []),
  "md:[--il-unit:calc((var(--space-24)_+_var(--space-2))/81.2)]",
  ...(capAtLg ? [] : ["xl:[--il-unit:calc((var(--space-32)_+_var(--space-16))/81.2)]"]),
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
  reveal = false,
}: {
  group: "a" | "b";
  stroke: Stroke;
  index: number;
  /** Place in its group's stagger, in each reading direction. */
  order: { ltr: number; rtl: number };
  ink: Ink;
  position: CSSProperties;
  className?: string;
  /** The hero's entrance on load (`.il-stroke`). */
  entrance?: boolean;
  /** Drawn from its tail when its block is revealed further down the page. */
  reveal?: boolean;
}) => {
  const size = reach(stroke);
  const scale = stroke.length / stroke.ribbon.width;
  return (
    <span
      className={`${entrance ? "il-stroke " : ""}absolute ${className}`}
      data-il-group={group}
      data-il-stroke={index}
      data-il-weight="light"
      data-reveal-part={reveal ? "draw" : undefined}
      style={
        {
          ...position,
          width: unit(size),
          height: unit(size),
          "--il-order-ltr": order.ltr,
          "--il-order-rtl": order.rtl,
          "--reveal-step": reveal ? order.ltr + 2 : undefined,
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
          transform={`rotate(-45) scale(${scale.toFixed(4)} ${(scale * WEIGHT).toFixed(4)}) translate(0 ${-stroke.ribbon.height / 2})`}
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
  reveal = false,
}: {
  ink: Ink;
  className: string;
  top: string;
  entrance?: boolean;
  reveal?: boolean;
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
      reveal={reveal}
      position={{ left: unit(stroke.tail), top: `calc(${top} + ${unit(A_HEIGHT - reach(stroke))})` }}
    />
  ));

/** Group B's strokes on the frame's right edge, their tails `bottom` above the
 *  bottom edge of the box they are placed in. */
const GroupB = ({
  ink,
  entrance = true,
  reveal = false,
  bottom = "0px",
}: {
  ink: Ink;
  entrance?: boolean;
  reveal?: boolean;
  bottom?: string;
}) =>
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
      reveal={reveal}
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
 * The lines on a photograph beside a statement or a call (ADR-0072 D2).
 *
 * Group A at twice its length, in the logo's red and green, order and spacing:
 * set on the corner of the photograph's cut edge so its tails stand on the
 * picture and its heads cross the cut into the page. The corner is physical
 * (IL-7): the bottom of that edge for a photograph on the left, its top for one
 * on the right, so each reading direction names its own. IL-5 as amended holds
 * the strokes 32px from text only; the set stays inside the photograph's own
 * box, which stands `--space-8` and the column gap away from the words.
 *
 * Drawn at rest; where its block waits to be revealed, each stroke grows from
 * its tail (`motion.css`).
 */
const PHOTO_GROUP: readonly Stroke[] = GROUP_A.map((stroke) => ({ ...stroke, length: stroke.length * 2, tail: stroke.tail * 2 }));
const PHOTO_WIDTH = groupWidth(PHOTO_GROUP);
const PHOTO_HEIGHT = groupHeight(PHOTO_GROUP);

const PHOTO_CORNER: Record<"start" | "end", string> = {
  start: "ltr:right-0 ltr:bottom-0 rtl:left-0 rtl:top-0",
  end: "ltr:left-0 ltr:top-0 rtl:right-0 rtl:bottom-0",
};

export const PhotoLines = ({ side }: { side: "start" | "end" }) => (
  <div
    aria-hidden="true"
    data-identity-lines=""
    // Marked where the set is drawn rather than at each call site, so a guard
    // that measures IL-5 finds every one of them. `SlantedPhoto` wraps this in
    // `data-slanted-photo`; the homepage's sponsor banner does not wrap it at
    // all, and that set went unmeasured until this attribute existed.
    data-photo-lines=""
    className={`pointer-events-none absolute ${PHOTO_CORNER[side]} ${ilVariables(false)}`}
    style={{ width: unit(PHOTO_WIDTH), height: unit(PHOTO_HEIGHT) }}
  >
    {PHOTO_GROUP.map((stroke, i) => (
      <LineStroke
        key={`p${i}`}
        group="a"
        stroke={stroke}
        index={i}
        order={{ ltr: i, rtl: PHOTO_GROUP.length - 1 - i }}
        ink="register"
        className="block"
        entrance={false}
        reveal
        position={{ left: unit(stroke.tail), top: unit(PHOTO_HEIGHT - reach(stroke)) }}
      />
    ))}
  </div>
);

/** The section rhythm's vertical padding (`py-12 md:py-16 lg:py-24`,
 *  `page-building-guide.md` §2), which every section on either side of a seam
 *  shares. */
const SEAM_PAD = "[--seam-pad:var(--space-12)] md:[--seam-pad:var(--space-16)] lg:[--seam-pad:var(--space-24)]";

/**
 * The lines on the seam between a section and the one before it (ADR-0073 D2).
 *
 * Two neutral sections do not show where one ends by their grounds: base and
 * sunken measure ΔE 2.13 apart in light, and high contrast paints both white.
 * The strokes mark the seam, and give the later section a section-scale
 * identity element, in the corner a section leaves empty: the reading end of
 * the seam, away from the heading at its start.
 *
 * - Physical, as every set of lines is (IL-7). The reading end is the frame's
 *   left in Arabic, where group A stands, and its right in English, where group
 *   B stands (IL-3); each direction draws its own group and hides the other.
 * - IL-4's scale, centred on the seam where the previous section's padding
 *   allows: a group never rises nearer than `--space-8` to that section's
 *   content. Below the seam the strokes run into this section's top padding
 *   beside the heading, which the guard measures (IL-5).
 * - Out of the flow and clipped to the 1440 frame: no room reserved, nothing
 *   pushed aside, no sideways scroll. Its section must be positioned.
 * - Drawn at rest; each stroke grows from its tail when the seam enters the view.
 * - `placement` (ADR-0075 M0-B). `centered` is the drawing above. `below`
 *   stands the whole group under the seam, its top edge on the seam, for a
 *   section that follows a coloured band: centred, half the group would stand
 *   on that band, where the green stroke measures 1.95:1 and the red 1.60:1.
 *   On the page's own ground every stroke clears 3:1 in the three lists
 *   (light 4.60 and 5.63, dark 3.89 and 3.18, high contrast 4.81 and 5.88).
 */
const seamTop = (height: number): string => `max(calc(var(--space-8) - var(--seam-pad)), calc(${unit(height)} / -2))`;

export type SeamPlacement = "centered" | "below";

/**
 * `from`: drawn from that breakpoint only, for a section whose first line
 * spans the frame below it, so the far corner is not empty there and the
 * strokes would stand within IL-5's 32px of the words.
 * - `lg`: the President's message opens on its body text, and a call without
 *   a photograph on a centred heading (measured 0–16.5px at 360 and 768).
 * - `md`: the Strategic Plan's pillars, whose heading spans a phone's line
 *   (measured 3.7–11px at 360); from 768 the heading leaves the corner free.
 * The section then has no identity element below that width, which
 * `page-rules.spec.ts` records as pending below it rather than hiding it.
 */
export const SeamLines = ({
  placement = "centered",
  from = null,
  capUnit = null,
}: {
  placement?: SeamPlacement;
  from?: "md" | "lg" | null;
  /**
   * `lg`: the lines keep their lg size on xl screens instead of growing, for a
   * section whose first words sit too close to the grown group. The President's
   * message in English measured group B 31.63px from its first paragraph at 1280
   * and 1366 with the xl unit, under IL-5's 32px.
   */
  capUnit?: "lg" | null;
}) => {
  const top = (height: number): string => (placement === "below" ? "0px" : seamTop(height));
  return (
    <div
      aria-hidden="true"
      data-identity-lines=""
      data-seam-lines=""
      data-placement={placement}
      data-from={from ?? undefined}
      data-cap-unit={capUnit ?? undefined}
      data-reveal=""
      className={`pointer-events-none absolute inset-x-0 top-0 mx-auto max-w-[1440px] ${
        from === "lg" ? "max-lg:hidden " : from === "md" ? "max-md:hidden " : ""
      }${SEAM_PAD} ${ilVariables(false, capUnit === "lg")}`}
    >
      <div className="absolute inset-x-0 overflow-clip ltr:hidden" style={{ top: top(A_HEIGHT), height: unit(A_HEIGHT) }}>
        <GroupA ink="page" className="block" top="0px" entrance={false} reveal />
      </div>
      <div className="absolute inset-x-0 overflow-clip rtl:hidden" style={{ top: top(B_HEIGHT), height: unit(B_HEIGHT) }}>
        <GroupB ink="page" entrance={false} reveal />
      </div>
    </div>
  );
};

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
  "[--pm-portrait-cap:calc(100svh_-_var(--header-height))] lg:[--pm-portrait-cap:calc(100svh_-_var(--header-height)_-_var(--space-8)_-_var(--typography-caption-desktop)_*_1.4_-_var(--space-4)_-_var(--space-8))]";

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
  eyebrow = null,
  lead = null,
  subtitle,
  subtitleField,
  ground,
  portrait = null,
  locale,
  breadcrumb = null,
}: {
  titleId: string;
  title: string;
  /** A short label above the title, marked by the accent rule: the section of
   *  the site the page belongs to, as the Strategic Plan prints «الحوكمة
   *  والاستراتيجية» (Figma `756:211`; an IA §8.1 label, so it is a message
   *  rather than a stored field). Takes the trail's step in the entrance. */
  eyebrow?: string | null;
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
  /** The trail, already built for this ground, where the page shows one: a
   *  photograph under the scrim is a dark ground whatever the page's register
   *  says. */
  breadcrumb?: ReactNode;
}) => {
  const onPhoto = Boolean(ground);
  const green = REGISTER_CLASSES.green;
  const sizing = portrait ? portraitSizing(portrait) : null;
  // Every hero fills the first screen: header plus hero is the screen's
  // height (owner decision 2026-09-16, ADR-0078), which retires the per-page
  // `height="content"` band ADR-0071 D6 gave Vision & Mission and the Strategic
  // Plan. The condition that remains is ADR-0067 D2's own: without a picture or
  // a portrait there is no composition to fill a screen with.
  const fillsFirstScreen = Boolean(ground || portrait);

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

      {/* The trail, where there is one, opens the hero on a row of its own, on
          the reading edge of the language. The title and the portrait below
          keep their fixed sides. */}
      {breadcrumb ? (
        <div data-hero-trail="" className={`relative ${CONTAINER} pt-6 lg:pt-8`}>
          <div className="pm-settle" style={step(0)}>
            {breadcrumb}
          </div>
        </div>
      ) : null}

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
              {eyebrow ? (
                <p
                  data-hero-eyebrow=""
                  className={`pm-settle relative mb-3 flex items-center gap-3 text-body-sm font-bold ${onPhoto ? "opacity-85" : green.muted}`}
                  style={step(0)}
                >
                  <AccentRule onRegister />
                  {eyebrow}
                </p>
              ) : null}
              {/* Display XL from `md`, Chapter 4 §4.4's role for a large
                  heading: the title is the message and outranks every ordinal
                  on the page (owner decision 2026-09-15, ADR-0075). On a phone
                  it keeps H1: Display XL's 40px reached 16.8px from group A
                  beside the President's Arabic title at 360, and the ordinals
                  take H1 there too, so the title is never outranked. */}
              <h1 id={titleId} className="pm-settle relative text-h1 text-balance md:text-display-xl" style={step(1)}>
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

      {/* The first screen is the whole screen here, so say there is more below
          (ADR-0079). Below `lg` a portrait stands on the bottom edge where the
          cue would go (measured: no free 56px at 768, 390 or 360), so there
          the cue is not drawn rather than drawn over the portrait. */}
      {fillsFirstScreen ? <ScrollCue className={portrait ? "max-lg:hidden" : ""} /> : null}
    </section>
  );
};

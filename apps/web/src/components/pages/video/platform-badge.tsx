import type { CSSProperties } from "react";
import type { VideoPlatform } from "@/lib/video/types";

/**
 * The mark of the platform a video lives on.
 *
 * -- Why the colours are literals ------------------------------------------
 *
 * These five colours belong to other organisations. A design token is a
 * promise about this federation's palette, and putting YouTube red in one
 * would invite it into places that have nothing to do with a platform mark.
 * ADR-0068 reached the same conclusion about inline brand SVG, and this
 * follows it: the paths are copied in, no icon dependency is added.
 *
 * -- Why the name is read but not shown ------------------------------------
 *
 * On a public card the mark is the whole message: a reader recognises the
 * shape, and the word beside it would be noise on a card already carrying a
 * title, a category and a date. A screen reader gets the name instead, because
 * "link, watch on" with no platform is not a choice anyone can make. The
 * dashboard's tables show the name beside the mark, which is the opposite
 * decision for the opposite reason -- an editor is scanning a column.
 */

/**
 * ── The one place in this system that carries a literal colour ─────────────
 *
 * ADR-0098 governs every other colour in the video system, and this file is
 * its single named exception. The values below are not a palette: each one is
 * another organisation's registered identity, published in that platform's own
 * brand guidelines, and a platform mark drawn in UAEAF green is not that
 * platform's mark. Tokenising them would also imply this system may change
 * them, and it may not.
 *
 * They are therefore literals on purpose, and they are the ONLY literals
 * permitted here. Everything drawn around them — the badge's ground, its ring,
 * its ink when a mark has none — comes from the surface, like the rest of the
 * system.
 */
interface Mark {
  /** The brand's own colour, as the platform publishes it. */
  fill: string;
  /** The ink drawn on top of that fill. */
  ink: string;
  /** A hairline, for the two marks that are black on a dark ground and would
   *  otherwise disappear into it. */
  outlined?: boolean;
  path: string;
  /** The gradient Instagram's guidelines require instead of a flat fill. */
  gradient?: boolean;
}

const MARKS: Record<VideoPlatform, Mark> = {
  youtube: {
    fill: "#FF0000",
    ink: "#FFFFFF",
    path: "M9.5 8.8v6.4l5.6-3.2-5.6-3.2Z",
  },
  facebook: {
    fill: "#1877F2",
    ink: "#FFFFFF",
    path: "M13.2 19v-6.2h2.1l.31-2.4h-2.41V8.85c0-.7.2-1.17 1.2-1.17h1.28V5.53A17 17 0 0 0 13.8 5.4c-1.85 0-3.12 1.13-3.12 3.2v1.79H8.57v2.4h2.11V19h2.52Z",
  },
  instagram: {
    fill: "#E1306C",
    ink: "#FFFFFF",
    gradient: true,
    path: "M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm0 5.6a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Zm4.35-5.74a.79.79 0 1 1-1.58 0 .79.79 0 0 1 1.58 0ZM9.2 5.6h5.6A3.6 3.6 0 0 1 18.4 9.2v5.6a3.6 3.6 0 0 1-3.6 3.6H9.2a3.6 3.6 0 0 1-3.6-3.6V9.2A3.6 3.6 0 0 1 9.2 5.6Zm0 1.3A2.3 2.3 0 0 0 6.9 9.2v5.6a2.3 2.3 0 0 0 2.3 2.3h5.6a2.3 2.3 0 0 0 2.3-2.3V9.2a2.3 2.3 0 0 0-2.3-2.3H9.2Z",
  },
  tiktok: {
    fill: "#000000",
    ink: "#FFFFFF",
    outlined: true,
    path: "M15.1 5.4c.3 1.6 1.2 2.6 2.8 2.7v1.85c-.93.09-1.75-.21-2.7-.79v3.49c0 4.43-4.83 5.81-6.77 2.63-1.25-2.05-.48-5.64 3.53-5.78v1.95c-.31.05-.64.13-.94.23-.9.31-1.41.88-1.27 1.88.27 1.93 3.81 2.5 3.51-1.27V5.4h1.84Z",
  },
  x: {
    fill: "#000000",
    ink: "#FFFFFF",
    outlined: true,
    path: "M15.9 5.9h1.86l-4.07 4.65 4.79 6.33h-3.75l-2.94-3.84-3.36 3.84H6.56l4.35-4.97L6.32 5.9h3.84l2.66 3.51L15.9 5.9Zm-.65 9.87h1.03l-6.65-8.79H8.52l6.73 8.79Z",
  },
};

/** The disc both marks below sit in: the brand's ground at the asked size.
 *
 *  TikTok and X are black. On a #0A0C0B ground a black circle is not a mark,
 *  it is a hole -- the hairline is what makes it read as an object sitting on
 *  the surface. */
const discStyle = (mark: Mark, size: number): CSSProperties => ({
  inlineSize: size,
  blockSize: size,
  background: mark.gradient
    ? "radial-gradient(circle at 30% 107%, #FDF497 0%, #FD5949 45%, #D6249F 60%, #285AEB 90%)"
    : mark.fill,
  boxShadow: mark.outlined ? "inset 0 0 0 1px color-mix(in srgb, var(--surface-text) 22%, transparent)" : undefined,
});

/**
 * The platform's mark, with its name available to assistive technology only.
 *
 * `label` is the translated platform name. It is required rather than optional
 * because a mark with no accessible name is a picture a screen reader cannot
 * describe, and making it optional is how that happens.
 */
export const PlatformBadge = ({
  platform,
  label,
  size = 28,
}: {
  platform: VideoPlatform;
  label: string;
  size?: number;
}) => {
  const mark = MARKS[platform];

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={discStyle(mark, size)}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        style={{ inlineSize: size * 0.75, blockSize: size * 0.75 }}
      >
        {/* Instagram's gradient is the BADGE's ground, painted by the
            wrapper's `background` above. The glyph itself is flat white on
            top of it, as the brand guidelines draw it — so there is no
            gradient definition here to go unused. */}
        <path d={mark.path} fill={mark.ink} />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
};

/** The same mark with the name shown beside it, for the library's platform
 *  filter -- there the reader is choosing between platforms rather than
 *  recognising one, and a row of unlabelled circles is a guessing game. */
export const PlatformChipMark = ({ platform, size = 20 }: { platform: VideoPlatform; size?: number }) => {
  const mark = MARKS[platform];

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={discStyle(mark, size)}
    >
      <svg viewBox="0 0 24 24" focusable="false" style={{ inlineSize: size * 0.75, blockSize: size * 0.75 }}>
        <path d={mark.path} fill={mark.ink} />
      </svg>
    </span>
  );
};

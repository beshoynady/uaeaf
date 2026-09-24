import { useTranslations } from "next-intl";
import type { VideoPlatform } from "@/lib/admin/videos/types";

/**
 * Where a video came from.
 *
 * ── Why these colours are not tokens ───────────────────────────────────────
 *
 * They belong to other organisations. YouTube red is YouTube's, not a shade of
 * this design system, and putting it in `colors.*.json` would invite it into
 * places that have nothing to do with a platform mark. They are literals here,
 * in the one file that draws them, which is the same reasoning ADR-0068
 * applied to inline brand SVG.
 *
 * ── Why the name shows here and not on the public cards ────────────────────
 *
 * An editor scanning a table of mixed sources reads "TikTok" faster than they
 * recognise a monochrome note at 16px. A visitor looking at one card does not
 * need telling. So the dashboard shows the word and the public card hides it
 * behind `sr-only` — the mark is `aria-hidden` in both, because the word is
 * what carries the meaning.
 */
const MARKS: Record<VideoPlatform, { colour: string; path: string; viewBox?: string }> = {
  youtube: {
    colour: "#FF0000",
    path: "M21.58 7.19a2.76 2.76 0 0 0-1.94-1.96C17.9 4.75 12 4.75 12 4.75s-5.9 0-7.64.48A2.76 2.76 0 0 0 2.42 7.2 28.9 28.9 0 0 0 1.94 12c0 1.62.16 3.23.48 4.81a2.76 2.76 0 0 0 1.94 1.96c1.74.48 7.64.48 7.64.48s5.9 0 7.64-.48a2.76 2.76 0 0 0 1.94-1.96c.32-1.58.48-3.19.48-4.81a28.9 28.9 0 0 0-.48-4.81ZM10.1 15.3V8.7l5.7 3.3-5.7 3.3Z",
  },
  facebook: {
    colour: "#1877F2",
    path: "M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z",
  },
  instagram: {
    // Instagram's mark is a gradient, not a flat colour. Drawn as the outline
    // over a gradient fill defined per instance below.
    colour: "url(#uaeaf-instagram-gradient)",
    path: "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.89 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16Zm0 5.68a4.16 4.16 0 1 0 0 8.32 4.16 4.16 0 0 0 0-8.32Zm0 6.86a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Zm4.33-7.03a.97.97 0 1 0 0-1.95.97.97 0 0 0 0 1.95Z",
  },
  tiktok: {
    // Black with a hairline: the mark is monochrome and would vanish on a
    // dark surface without an edge of its own.
    colour: "#000000",
    path: "M16.6 5.82a4.28 4.28 0 0 1-1.1-2.82h-3.1v12.4a2.53 2.53 0 1 1-1.8-2.42V9.8a5.62 5.62 0 1 0 4.9 5.57V9.01a7.3 7.3 0 0 0 4.27 1.37V7.28a4.28 4.28 0 0 1-3.17-1.46Z",
  },
  x: {
    colour: "#000000",
    path: "M17.53 3h3.04l-6.64 7.59L21.75 21h-6.11l-4.79-6.26L5.37 21H2.33l7.1-8.12L2 3h6.27l4.33 5.72L17.53 3Zm-1.07 16.17h1.69L7.62 4.73H5.81l10.65 14.44Z",
  },
};

export const PlatformMark = ({ platform, className }: { platform: VideoPlatform; className?: string }) => {
  const t = useTranslations("Videos");
  const mark = MARKS[platform];
  const needsEdge = platform === "tiktok" || platform === "x";

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg
        viewBox="0 0 24 24"
        // Hidden: the name beside it says the same thing in words, and a
        // screen reader announcing both would say the platform twice.
        aria-hidden="true"
        className={`size-4 shrink-0 ${needsEdge ? "rounded-[2px] ring-1 ring-[color:var(--color-border-default)]" : ""}`}
      >
        {platform === "instagram" ? (
          <defs>
            <linearGradient id="uaeaf-instagram-gradient" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#FDCB5C" />
              <stop offset="0.5" stopColor="#E1306C" />
              <stop offset="1" stopColor="#833AB4" />
            </linearGradient>
          </defs>
        ) : null}
        <path d={mark.path} fill={mark.colour} />
      </svg>
      <span className="text-body-sm">{t(`platform_${platform}`)}</span>
    </span>
  );
};

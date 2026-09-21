import { ImageResponse } from "next/og";
import { fetchArticle } from "@/lib/api/articles";
import { fetchPublicMedia } from "@/lib/api/media";
import { coverPlaceholder } from "@/lib/news/cover-placeholder";

/**
 * The picture a platform shows when this article is shared.
 *
 * ── Why a route and not the cover's own URL ────────────────────────────────
 *
 * Two reasons, and the second is the one that made it necessary. Platforms
 * want 1200×630 and a cover is stored at whatever ratio it was uploaded at,
 * so a raw cover URL is cropped differently by every one of them. And an
 * article published without a cover had no share picture at all — the owner's
 * rule for this batch is that no public surface shows a hole, and a share card
 * is a public surface.
 *
 * So one address answers for every article: the cover if there is one, the
 * generated placeholder if there is not, always at the right size.
 *
 * ── Why there is no text in it ─────────────────────────────────────────────
 *
 * The headline reaches the platform through `og:title`, which is text the
 * platform renders in its own face beside this picture. Drawing it here too
 * would print it twice, and would need an Arabic webfont loaded into the image
 * runtime — a font file this app does not ship and a failure that would show
 * as tofu on every share.
 *
 * ── Why `next/og` ──────────────────────────────────────────────────────────
 *
 * It is part of Next, already installed. Generating the image in the API would
 * have meant an image library there, which is a new dependency and needs
 * approval (owner constraint 2026-09-21 §9).
 */

export const alt = "";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The two registers a placeholder may use, as literals.
 *
 *  The token files are CSS custom properties and this runtime has no
 *  stylesheet — `var(--color-section-green-surface)` would render as nothing.
 *  The values are the built tokens' own, copied with their source named so a
 *  token change has one place to look. */
const REGISTER_HEX = {
  // packages/design-tokens/build/css/light.css — --color-section-green-surface
  // and --color-section-green-divider, the pair the card's gradient runs
  // between. Light theme, because a share card has no theme of its own: it is
  // rendered once and shown inside whatever the platform's own chrome is.
  green: { from: "#005226", to: "#00843D" },
  // …/light.css — --color-section-black-surface / --color-section-black-divider
  black: { from: "#000000", to: "#33322D" },
} as const;

const OgImage = async ({ params }: { params: Promise<{ locale: string; slug: string }> }) => {
  const { slug } = await params;
  const article = await fetchArticle(slug);

  // An address that names nothing still answers with a picture rather than a
  // broken image in someone's timeline.
  if (!article) {
    return new ImageResponse(<div style={{ width: "100%", height: "100%", background: REGISTER_HEX.green.from }} />, size);
  }

  const covers = await fetchPublicMedia([article.coverMediaId]);
  const cover = article.coverMediaId ? covers.get(article.coverMediaId) : undefined;

  if (cover) {
    return new ImageResponse(
      (
        <img
          src={cover.file.url}
          alt=""
          width={size.width}
          height={size.height}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ),
      size,
    );
  }

  const { register, motif } = coverPlaceholder(article);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundImage: `linear-gradient(135deg, ${REGISTER_HEX[register].from}, ${REGISTER_HEX[register].to})`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* The ascent motif, as four strokes — the same geometry
            `components/brand/uaeaf-motif.tsx` draws, at the same strength the
            card uses, so the preview a reader confirms is the card they
            publish. Inline because this runtime resolves no imports of JSX
            components into SVG. */}
        <svg
          viewBox="505 183 170 168"
          width={`${motif.scale}%`}
          style={{
            position: "absolute",
            left: `${motif.x}%`,
            top: `${motif.y}%`,
            transform: "translate(-50%, -50%)",
            opacity: 0.6,
          }}
        >
          <path
            transform="matrix(1,0,0,-1,640.7651,249.89511)"
            d="M0 0C1.298 .932 1.623 2.778 .724 4.125-.174 5.471-1.955 5.807-3.253 4.876-3.445 4.738-3.62 4.577-3.774 4.395L-17.814-15.131Z"
            fill="#FFFFFF"
          />
          <path
            transform="matrix(1,0,0,-1,554.2734,236.6341)"
            d="M0 0C1.171 1.069 1.285 2.919 .255 4.134-.775 5.349-2.56 5.467-3.732 4.398-3.83 4.308-3.923 4.211-4.009 4.108L-29.304-28.392Z"
            fill="#FFFFFF"
          />
          <path
            transform="matrix(1,0,0,-1,614.8727,207.50089)"
            d="M0 0C1.658 1.668 1.699 4.413 .091 6.133-1.517 7.852-4.165 7.895-5.823 6.227-5.928 6.122-6.027 6.011-6.121 5.894L-57.243-57.525Z"
            fill="#FFFFFF"
          />
          <path
            transform="matrix(1,0,0,-1,630.439,226.05332)"
            d="M0 0C1.558 1.502 1.648 4.03 .2 5.646-1.249 7.262-3.686 7.355-5.245 5.853-5.376 5.726-5.499 5.59-5.612 5.446L-40.148-38.972Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    ),
    size,
  );
};

export default OgImage;

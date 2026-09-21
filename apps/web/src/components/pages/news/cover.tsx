import Image from "next/image";
import { UaeafMotif } from "@/components/brand/uaeaf-motif";
import { altOf, isExternalMedia } from "@/lib/api/media";
import { coverPlaceholder } from "@/lib/news/cover-placeholder";
import type { ArticlePublic, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * An article's picture, with no way for it to be missing.
 *
 * Every public surface that draws a cover draws it through here, so "the
 * newsroom published without a picture" is answered once instead of at each
 * call site — and so no future card can forget and leave a hole.
 *
 * The placeholder is the federation's own ascent motif on one of the approved
 * section registers, chosen from the article itself. See
 * `lib/news/cover-placeholder.ts` for why those colours and not others.
 *
 * `aria-hidden` on the placeholder, deliberately. A real cover carries the
 * photographer's alt text and says something; the placeholder says only that
 * there is no photograph, which is not information a screen-reader user needs
 * read to them once per card down a grid of twelve.
 *
 * ── Why a gradient under the motif ─────────────────────────────────────────
 *
 * A flat register block with a faint watermark reads as an empty box rather
 * than as a graphic — measured on a live page, where four of them in a related
 * row looked like four failed images. The gradient runs between the register's
 * own surface and its divider at 45°, which is the brand's system angle
 * (ADR-0059 §D7) and the same angle the motif's own strokes are cut at. Two
 * tokens from one register, no invented colour, and the block now has a
 * direction to it.
 */
export const ArticleCover = ({
  article,
  cover,
  locale,
  sizes,
  priority = false,
  className = "",
}: {
  article: Pick<ArticlePublic, "slug" | "category" | "title">;
  /** Absent when the newsroom uploaded none, or when the reference is dead. */
  cover?: MediaAssetPublic;
  locale: AppLocale;
  sizes: string;
  priority?: boolean;
  className?: string;
}) => {
  if (cover) {
    return (
      <Image
        src={cover.file.url}
        alt={altOf(cover, locale)}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`}
        unoptimized={isExternalMedia(cover.file.url)}
      />
    );
  }

  const { register, motif } = coverPlaceholder(article);

  return (
    <div
      aria-hidden
      className={`absolute inset-0 overflow-hidden ${
        register === "green"
          ? "bg-[color:var(--color-section-green-surface)] bg-[image:linear-gradient(135deg,var(--color-section-green-surface),var(--color-section-green-divider))] text-[color:var(--color-section-green-text)]"
          : "bg-[color:var(--color-section-black-surface)] bg-[image:linear-gradient(135deg,var(--color-section-black-surface),var(--color-section-black-divider))] text-[color:var(--color-section-black-text)]"
      } ${className}`}
    >
      {/* `tone="inherit"` because the brand green and red are invisible on
          these grounds — 1.15:1 against each other, ADR-0059 §D2. Still short
          of full strength: it is the federation's mark standing in for a
          photograph, not a logo lockup on a coloured plate. */}
      <UaeafMotif
        tone="inherit"
        className="absolute opacity-60"
        style={{
          insetInlineStart: `${motif.x}%`,
          top: `${motif.y}%`,
          width: `${motif.scale}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
};

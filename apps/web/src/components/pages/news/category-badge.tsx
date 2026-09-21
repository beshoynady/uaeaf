import { useTranslations } from "next-intl";
import { BADGE } from "@/components/ui/surface";
import type { ArticleCategory } from "@/lib/api/types";

/**
 * Which shelf of the newsroom a story sits on (Figma `1739:2343` on the
 * article, `2775:119` on a card).
 *
 * ── Why this exists now ────────────────────────────────────────────────────
 *
 * The design has always drawn this badge; `news-card.tsx` recorded its absence
 * as a scope conflict because `articles` had no category to draw it from. The
 * field shipped on 2026-09-20 and the exclusion is lifted, so the badge is now
 * drawn from real data rather than invented.
 *
 * ── Why two treatments and not one ─────────────────────────────────────────
 *
 * Figma draws the category four different ways across the two pages: solid
 * green with a 4px radius on the article header and on the news hero (at two
 * different paddings), a light-tint full pill on the grid cards, and bare
 * green overline text on the related row. Unifying them would be a design
 * decision nobody has taken, and inventing a fifth would be worse — so the two
 * that carry weight are built as drawn and the inconsistency is reported as
 * debt rather than resolved here.
 *
 * `solid` is the article header and the list hero: one badge on the page,
 * leading the title. `tint` is a card in a grid of twelve, where twelve solid
 * green blocks would read as the page's subject rather than as its filing.
 *
 * `text-overline` is 12px, which is the approved size for this role — the
 * utility is already used on the hero and the 404. The 13px floor governs body
 * and caption text, not the overline role.
 *
 * ── Where this departs from Figma, and why ─────────────────────────────────
 *
 * The design sets the tinted badge's text in `#00843d`. The identity colours
 * are declared once for every theme (ADR-0003, guide §5.1) and so cannot
 * answer to the ground behind them, which is why `token-contract.spec.ts`
 * keeps them out of text entirely (ADR-0063 D1). The green stays as the fill,
 * which is the identity used as identity, and the label takes a semantic role
 * that follows the theme. PENDING FIGMA BACK-SYNC.
 */
export const CategoryBadge = ({
  category,
  tone = "tint",
}: {
  category: ArticleCategory;
  tone?: "solid" | "tint";
}) => {
  const t = useTranslations("News");
  const label = category === "General" ? t("categoryGeneral") : t("categoryFederationInMedia");

  return (
    <span
      // `rounded-xs` on the solid form and a full pill on the tint one, as
      // drawn. `relative` so a badge inside a card sits above the headline's
      // whole-card overlay rather than under it.
      className={
        tone === "solid"
          ? `${BADGE} relative rounded-[var(--radius-xs)] border-transparent bg-[color:var(--color-brand-primary)] px-3 py-1.5 text-overline font-bold text-[color:var(--color-text-on-brand)]`
          : `${BADGE} relative border-transparent bg-[color:var(--color-brand-primary)]/10 px-3 py-1 text-overline font-bold text-[color:var(--color-text-primary)]`
      }
    >
      {label}
    </span>
  );
};

import type { ArticleCategory } from "@/lib/api/types";

/**
 * What an article shows when the newsroom published it without a picture.
 *
 * ── Why filler at all ──────────────────────────────────────────────────────
 *
 * A cover is optional upstream, and a card that omits it leaves a hole in the
 * grid beside cards that have one. The owner's rule for this batch is blunt:
 * no empty picture slot on any public surface, ever.
 *
 * ── Why it is drawn rather than fetched ────────────────────────────────────
 *
 * Generated here, from the article itself, with no external call and no new
 * dependency (owner constraint 2026-09-21 §9). A stock image would be a claim
 * about a story nobody checked; a generated AI image is out of scope for this
 * batch and is offered separately as a proposal. What is left is the
 * federation's own identity, which is honest filler: it says "the UAE
 * Athletics Federation published this" and nothing else.
 *
 * ── Why these colours ──────────────────────────────────────────────────────
 *
 * The section registers, which are the approved grounds the rest of the site
 * already stands on — not an invented grey. Red is deliberately absent:
 * ADR-0050 budgets it at 5% or less of a page, and a grid of twelve pictureless
 * cards would spend the whole budget on filler.
 *
 * The register comes from the category, so the two homepage shelves read
 * differently at a glance. The motif's placement comes from the slug, so
 * twelve cards on one shelf do not look like one tile repeated.
 */

/** The grounds a placeholder may stand on. Red is not among them, by budget. */
export const PLACEHOLDER_REGISTERS = ["green", "black"] as const;
export type PlaceholderRegister = (typeof PLACEHOLDER_REGISTERS)[number];

export interface CoverPlaceholder {
  register: PlaceholderRegister;
  /** Where the ascent motif sits and how large, as percentages of the box. */
  motif: { x: number; y: number; scale: number };
}

/**
 * A small, stable number from a string.
 *
 * FNV-1a, written out rather than imported: it is eight lines, it must give
 * the same answer in the browser, on the server and inside the image route,
 * and a dependency for eight lines is a dependency to keep updated forever.
 * Not a security hash and not used as one — this picks a colour.
 */
const hash = (value: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    // The FNV prime, as shifts, so the arithmetic stays inside 32 bits.
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h;
};

/** The two shelves, on two grounds, so a mixed list reads without its badges. */
const REGISTER_FOR: Record<ArticleCategory, PlaceholderRegister> = {
  General: "green",
  FederationInMedia: "black",
};

export const coverPlaceholder = ({
  slug,
  category,
}: {
  slug: string;
  category: ArticleCategory;
}): CoverPlaceholder => {
  const seed = hash(slug);

  return {
    // A category the enum gains later falls to green rather than to nothing:
    // a missing register would render a transparent box, which is the hole
    // this whole module exists to prevent.
    register: REGISTER_FOR[category] ?? "green",
    motif: {
      // Kept off the exact centre and away from the edges: the motif is a
      // watermark behind a headline, not a logo lockup.
      x: 55 + (seed % 30),
      y: 20 + ((seed >>> 8) % 30),
      scale: 70 + ((seed >>> 16) % 60),
    },
  };
};

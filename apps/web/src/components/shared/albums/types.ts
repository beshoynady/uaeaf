import type { ReactNode } from "react";
import type { AppLocale } from "@/i18n/routing";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AlbumAffiliation } from "@/lib/albums/affiliations";
import type { AlbumListItem, AlbumFacetNames, AlbumFacets } from "@/lib/albums/album-types";
import type { AlbumQuery } from "@/lib/albums/album-query";

/**
 * The contract between these shared components and the pages built on them.
 *
 * Every component here takes data as props and fetches nothing: which album
 * is featured, which page of the archive is showing, and what the facets say
 * are the page's questions, answered once on the server.
 */

/**
 * Where a row of affiliation chips stands, which decides its paint.
 *
 * - `media` — over a photograph inside a card. Opaque plates (white or ink),
 *   because the photograph behind is uncontrolled; only the narrowest
 *   affiliation is drawn, since a card has room for one.
 * - `hero` — on an album's hero. The occasion (championship or public event)
 *   takes the green plate, the rest are translucent, and a chip with an
 *   `href` becomes a link.
 */
export type AssociationChipsPlacement = "media" | "hero";

export interface AssociationChipsProps {
  /** Broadest first, as `albumAffiliations` returns them. Empty renders nothing. */
  items: readonly AlbumAffiliation[];
  placement: AssociationChipsPlacement;
  className?: string;
}

export interface PhotoStackProps {
  /** The album's preview photos in display order. Only the first three are drawn. */
  photos: readonly MediaAssetPublic[];
  locale: AppLocale;
  /** `next/image` sizes for one layer. */
  sizes?: string;
  /** Laid over the photograph at the stack's top edge — the affiliation chip. */
  overlay?: ReactNode;
  className?: string;
}

export interface AlbumCardProps {
  album: AlbumListItem;
  locale: AppLocale;
  /** Already resolved with `albumAffiliations`; the card draws the narrowest. */
  affiliations?: readonly AlbumAffiliation[];
  /** Overrides `/media/albums/<slug>`, e.g. for a preview route. */
  href?: string;
  /** `h2`/`h3`/`h4`: the level under the section that lists the cards. */
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}

/** One cover in the featured deck. */
export interface DeckCover {
  id: string;
  photo: MediaAssetPublic;
}

export interface FeaturedAlbumDeckProps {
  /** Up to five covers, front first. Fewer than five are drawn as they are. */
  covers: readonly DeckCover[];
  locale: AppLocale;
  className?: string;
}

export interface AlbumFilterBarProps {
  /** The query the page was rendered with, read by `readAlbumQuery`. */
  query: AlbumQuery;
  /** `GET /albums/public/facets`. A facet that is empty removes its control. */
  facets: AlbumFacets;
  /** Names for the facet ids — athletes and clubs from their public lists. */
  names: AlbumFacetNames;
  /** Albums matching the query, across every page. */
  total: number;
  /** Albums currently on screen. */
  shown: number;
  /**
   * What happens when the reader changes a filter. Omitted, the bar writes the
   * address itself (`router.push`, no scroll), which is what the archive page
   * wants; a test or a preview passes its own.
   */
  onQueryChange?: (next: AlbumQuery) => void;
  className?: string;
}

import { fetchPublic } from "@/lib/api/public-client";
import type { AlbumListItem } from "@/lib/albums/album-types";
import type { LocalizedText } from "@/lib/api/types";

/**
 * `GET /photo-gallery-section/public` as this application reads it
 * (`PhotoGallerySectionPayload` in the API).
 *
 * One payload rather than a featured read plus a list read, because the lead
 * must never reappear among the cards: the API removes it before answering,
 * and two reads could each answer from a different moment and show it twice.
 */
export interface PhotoGallerySectionPublic {
  /** `false` when the row is missing or either of its switches is off. */
  enabled: boolean;
  title: LocalizedText | null;
  subtitle: LocalizedText | null;
  eyebrow: LocalizedText | null;
  /** `null` only when nothing is published or a manual selection resolved to none. */
  lead: AlbumListItem | null;
  /** Never includes `lead`, and already at the editor's count. */
  items: AlbumListItem[];
}

/** Tagged with the album pages' own label, so one invalidation reaches all three. */
const ALBUM_TAGS = ["albums"] as const;

/** `null` when the API is unreachable, which the section treats as off. */
export const loadAlbumsSection = async (): Promise<PhotoGallerySectionPublic | null> =>
  fetchPublic<PhotoGallerySectionPublic>("/photo-gallery-section/public", ALBUM_TAGS);

import { Injectable } from '@nestjs/common';
import { PageSectionsRepository } from '../../cms-page-composition/page-sections/page-sections.repository.js';
import { AlbumsService } from '../albums/albums.service.js';
import { ALBUM_DECK_PHOTOS } from '../albums/albums.repository.js';
import { readPhotoGallerySettings } from './photo-gallery-settings.js';
import type { PhotoGallerySettings } from './photo-gallery-settings.js';
import type { AlbumListItemDto } from '../albums/dto/album-list-response.dto.js';
import type { LocalizedText } from '../../../common/schemas/localized-text.schema.js';

/**
 * Everything the homepage's albums section needs, in one request.
 *
 * One payload rather than three, because the section's parts have to agree:
 * the album that leads it must not also appear among the cards beside it, and
 * separate fetches could each answer from a different moment and show it
 * twice.
 */
export interface PhotoGallerySectionPayload {
  enabled: boolean;
  title: LocalizedText | null;
  subtitle: LocalizedText | null;
  eyebrow: LocalizedText | null;
  /** The album the section leads with — the featured one, or the newest when
   *  nobody has marked one. `null` only when nothing is published. */
  lead: AlbumListItemDto | null;
  /** The cards beside it, never including `lead`. */
  items: AlbumListItemDto[];
}

const OFF: PhotoGallerySectionPayload = {
  enabled: false,
  title: null,
  subtitle: null,
  eyebrow: null,
  lead: null,
  items: [],
};

@Injectable()
export class PhotoGallerySectionService {
  constructor(
    private readonly sections: PageSectionsRepository,
    private readonly albums: AlbumsService,
  ) {}

  async findPublic(): Promise<PhotoGallerySectionPayload> {
    const section = await this.sections.findOne({ sectionType: 'PHOTO_GALLERY', archivedAt: null });
    // No row, or switched off: no section at all.
    if (!section || section.enabled !== true) {
      return OFF;
    }

    const settings = readPhotoGallerySettings(section.configuration);
    if (!settings.enabled) {
      return OFF;
    }

    const { lead, items } = await this.albumsFor(settings);

    return {
      enabled: true,
      title: section.sectionTitle,
      subtitle: section.sectionSubtitle,
      eyebrow: readEyebrow(section.configuration),
      lead,
      items,
    };
  }

  /**
   * The lead album and the cards beside it.
   *
   * One request over-fetches by one, then removes the lead from the cards.
   * Asking for exactly `count` and filtering afterwards would return one card
   * short whenever the lead is among them, which is the common case.
   */
  private async albumsFor(
    settings: PhotoGallerySettings,
  ): Promise<{ lead: AlbumListItemDto | null; items: AlbumListItemDto[] }> {
    if (settings.mode === 'manual') {
      return this.manual(settings);
    }

    // Five preview photos, not the list's usual three: the lead album's deck
    // has five slots and only turns when all five are filled. The cards beside
    // it draw three and ignore the rest, which is cheaper than a second
    // request for the lead alone.
    const page = await this.albums.listPublic({}, 1, settings.count + 1, ALBUM_DECK_PHOTOS);
    if (page.items.length === 0) {
      return { lead: null, items: [] };
    }

    // The album an editor marked leads the section; the newest leads only when
    // nobody has marked one. Taking the first of a date-ordered page instead
    // would silently ignore the star the editor pressed — the list is ordered
    // by `eventDate`, which has nothing to do with being featured.
    const featuredIndex = page.items.findIndex((album) => album.isFeatured);
    const leadIndex = featuredIndex >= 0 ? featuredIndex : 0;
    const lead = page.items[leadIndex];
    const rest = page.items.filter((_, index) => index !== leadIndex);

    return { lead, items: rest.slice(0, settings.count) };
  }

  /**
   * The albums an editor chose, in the order they chose them.
   *
   * Asked for by id, not found inside a page of recent albums. The picker
   * offers every published album, so a selection is not bounded by recency —
   * fetching the newest N and intersecting would make an older choice vanish
   * from the homepage silently, and more often as the archive grows.
   *
   * One query for all of them rather than one each: nine round trips on a
   * homepage is nine times the latency before first paint. An id that no
   * longer resolves — unpublished, archived, deleted — simply drops out,
   * because a homepage must not fail over a stale reference in a setting.
   */
  private async manual(
    settings: PhotoGallerySettings,
  ): Promise<{ lead: AlbumListItemDto | null; items: AlbumListItemDto[] }> {
    if (settings.albumIds.length === 0) {
      return { lead: null, items: [] };
    }

    const wanted = settings.albumIds.slice(0, settings.count + 1);
    const page = await this.albums.listPublicByIds(wanted, ALBUM_DECK_PHOTOS);
    const byId = new Map(page.map((album) => [album.id, album]));

    const resolved = wanted.map((id) => byId.get(id)).filter((album): album is AlbumListItemDto => Boolean(album));
    const [lead, ...rest] = resolved;
    return { lead: lead ?? null, items: rest.slice(0, settings.count) };
  }
}

/** The section's small label above its heading. Optional, and not worth its
 *  own reader: absent or malformed is simply no eyebrow. */
const readEyebrow = (configuration: unknown): LocalizedText | null => {
  const config = configuration as { eyebrow?: unknown } | null;
  const eyebrow = config?.eyebrow;
  if (typeof eyebrow !== 'object' || eyebrow === null) {
    return null;
  }
  const { ar, en } = eyebrow as { ar?: unknown; en?: unknown };
  return typeof ar === 'string' && typeof en === 'string' ? { ar, en } : null;
};

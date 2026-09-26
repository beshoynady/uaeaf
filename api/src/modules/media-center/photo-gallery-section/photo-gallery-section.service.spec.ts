import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { PhotoGallerySectionService } from './photo-gallery-section.service.js';
import { PageSectionsRepository } from '../../cms-page-composition/page-sections/page-sections.repository.js';
import { AlbumsService } from '../albums/albums.service.js';

/**
 * The homepage's albums section.
 *
 * Two behaviours carry the weight: a section nobody switched on draws nothing
 * at all — a heading over an empty row is worse than an absent section — and
 * the album that leads it never also appears among the cards beside it.
 */
describe('PhotoGallerySectionService', () => {
  const album = (id: string) => ({ id, title: { ar: id, en: id } }) as never;

  const makeSections = (section: unknown) =>
    ({ findOne: jest.fn(async () => section) }) as unknown as jest.Mocked<PageSectionsRepository>;

  const makeAlbums = (items: unknown[]) =>
    ({
      listPublic: jest.fn(async () => ({ items, total: items.length, page: 1, limit: items.length })),
      // Answers only for the ids it is asked for, the way the real read does.
      listPublicByIds: jest.fn(async (ids: readonly string[]) =>
        items.filter((item) => ids.includes((item as { id: string }).id)),
      ),
    }) as unknown as jest.Mocked<AlbumsService>;

  const enabledSection = (configuration: Record<string, unknown> = {}) => ({
    enabled: true,
    sectionTitle: { ar: 'ألبومات الصور', en: 'Photo albums' },
    sectionSubtitle: { ar: 'وصف', en: 'Subtitle' },
    configuration,
  });

  it('draws nothing when the row does not exist', async () => {
    const service = new PhotoGallerySectionService(makeSections(null), makeAlbums([]));

    expect((await service.findPublic()).enabled).toBe(false);
  });

  it('draws nothing when the row is switched off', async () => {
    const service = new PhotoGallerySectionService(
      makeSections({ ...enabledSection(), enabled: false }),
      makeAlbums([album('a')]),
    );

    const payload = await service.findPublic();

    expect(payload.enabled).toBe(false);
    expect(payload.lead).toBeNull();
    expect(payload.items).toEqual([]);
  });

  it('draws nothing when the configuration switch is off, even if the row is on', async () => {
    const service = new PhotoGallerySectionService(
      makeSections(enabledSection({ enabled: false })),
      makeAlbums([album('a')]),
    );

    expect((await service.findPublic()).enabled).toBe(false);
  });

  it('leads with the first album and never repeats it among the cards', async () => {
    const albums = makeAlbums([album('lead'), album('b'), album('c'), album('d'), album('e')]);
    const service = new PhotoGallerySectionService(makeSections(enabledSection({ count: 4 })), albums);

    const payload = await service.findPublic();

    expect(payload.lead?.id).toBe('lead');
    expect(payload.items.map((item) => item.id)).toEqual(['b', 'c', 'd', 'e']);
    expect(payload.items.map((item) => item.id)).not.toContain('lead');
  });

  it('asks for five preview photos, so the lead album’s deck can turn', async () => {
    const albums = makeAlbums([album('lead')]);
    const service = new PhotoGallerySectionService(makeSections(enabledSection({ count: 3 })), albums);

    await service.findPublic();

    // The fourth argument is the preview-photo count. Three — the list's
    // default — would leave the deck permanently at rest.
    expect(albums.listPublic).toHaveBeenCalledWith({}, 1, 4, 5);
  });

  it('leads with the album an editor marked, not simply the newest', async () => {
    const plain = { id: 'newest', title: { ar: 'n', en: 'n' }, isFeatured: false } as never;
    const starred = { id: 'starred', title: { ar: 's', en: 's' }, isFeatured: true } as never;
    const service = new PhotoGallerySectionService(
      makeSections(enabledSection({ count: 3 })),
      makeAlbums([plain, starred]),
    );

    const payload = await service.findPublic();

    expect(payload.lead?.id).toBe('starred');
    expect(payload.items.map((item) => item.id)).toEqual(['newest']);
  });

  it('over-fetches by one so a full row of cards survives removing the lead', async () => {
    const albums = makeAlbums([album('lead')]);
    const service = new PhotoGallerySectionService(makeSections(enabledSection({ count: 4 })), albums);

    await service.findPublic();

    expect(albums.listPublic).toHaveBeenCalledWith({}, 1, 5, 5);
  });

  it('carries the row’s own heading and subtitle', async () => {
    const service = new PhotoGallerySectionService(makeSections(enabledSection()), makeAlbums([album('a')]));

    const payload = await service.findPublic();

    expect(payload.title).toEqual({ ar: 'ألبومات الصور', en: 'Photo albums' });
    expect(payload.subtitle).toEqual({ ar: 'وصف', en: 'Subtitle' });
  });

  it('reads a bilingual eyebrow, and ignores a malformed one', async () => {
    const good = new PhotoGallerySectionService(
      makeSections(enabledSection({ eyebrow: { ar: 'المركز الإعلامي', en: 'Media Centre' } })),
      makeAlbums([album('a')]),
    );
    const bad = new PhotoGallerySectionService(
      makeSections(enabledSection({ eyebrow: 'Media Centre' })),
      makeAlbums([album('a')]),
    );

    expect((await good.findPublic()).eyebrow).toEqual({ ar: 'المركز الإعلامي', en: 'Media Centre' });
    expect((await bad.findPublic()).eyebrow).toBeNull();
  });

  it('reports no lead when nothing is published', async () => {
    const service = new PhotoGallerySectionService(makeSections(enabledSection()), makeAlbums([]));

    const payload = await service.findPublic();

    expect(payload.enabled).toBe(true);
    expect(payload.lead).toBeNull();
    expect(payload.items).toEqual([]);
  });

  describe('manual mode', () => {
    // Real ObjectId strings: the settings reader drops anything that is not
    // one, so a readable placeholder would be filtered out before it arrives.
    const a = new Types.ObjectId().toString();
    const b = new Types.ObjectId().toString();
    const c = new Types.ObjectId().toString();

    it('asks for the chosen albums by id, so an older pick cannot fall out of range', async () => {
      const albums = makeAlbums([album(a), album(b)]);
      const service = new PhotoGallerySectionService(
        makeSections(enabledSection({ mode: 'manual', count: 3, albumIds: [b, a] })),
        albums,
      );

      await service.findPublic();

      // Never a page of recent albums: the picker offers every published one,
      // so a selection is not bounded by recency.
      expect(albums.listPublic).not.toHaveBeenCalled();
      expect(albums.listPublicByIds).toHaveBeenCalledWith([b, a], 5);
    });

    it('keeps the order the editor arranged', async () => {
      const albums = makeAlbums([album(a), album(b), album(c)]);
      const service = new PhotoGallerySectionService(
        makeSections(enabledSection({ mode: 'manual', count: 3, albumIds: [c, a, b] })),
        albums,
      );

      const payload = await service.findPublic();

      expect(payload.lead?.id).toBe(c);
      expect(payload.items.map((item) => item.id)).toEqual([a, b]);
    });

    it('drops an id that no longer resolves rather than failing the homepage', async () => {
      const gone = new Types.ObjectId().toString();
      const albums = makeAlbums([album(a)]);
      const service = new PhotoGallerySectionService(
        makeSections(enabledSection({ mode: 'manual', count: 3, albumIds: [gone, a] })),
        albums,
      );

      const payload = await service.findPublic();

      expect(payload.lead?.id).toBe(a);
      expect(payload.items).toEqual([]);
    });

    it('draws nothing when the editor chose nothing', async () => {
      const service = new PhotoGallerySectionService(
        makeSections(enabledSection({ mode: 'manual', albumIds: [] })),
        makeAlbums([album('a')]),
      );

      const payload = await service.findPublic();

      expect(payload.lead).toBeNull();
      expect(payload.items).toEqual([]);
    });
  });
});

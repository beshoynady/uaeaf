import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { PagesService } from './pages.service.js';
import { PagesRepository } from './pages.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import type { PageDocument } from './schemas/pages.schema.js';

describe('PagesService', () => {
  const makeRepository = () =>
    ({ create: jest.fn(), find: jest.fn(), findOne: jest.fn() }) as unknown as jest.Mocked<PagesRepository>;
  const makeMediaAssets = () =>
    ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>;

  /** A `pages` row carrying the audit-trail fields every `BaseSchema`
   *  document has, so the mapping test can prove they are stripped. */
  const makeDocument = (overrides: Partial<PageDocument> = {}) =>
    ({
      _id: new Types.ObjectId(),
      slug: 'home',
      title: { en: 'Home', ar: 'الرئيسية' },
      status: 'Published',
      seo: null,
      createdBy: new Types.ObjectId(),
      updatedBy: new Types.ObjectId(),
      archivedAt: null,
      archivedBy: null,
      ...overrides,
    }) as unknown as PageDocument;

  describe('toPublicResponse', () => {
    it('exposes only public-safe routing/SEO fields', () => {
      const service = new PagesService(makeRepository(), makeMediaAssets());
      const document = makeDocument();

      const result = service.toPublicResponse(document);

      expect(result).toEqual({
        id: document._id.toString(),
        slug: 'home',
        title: { en: 'Home', ar: 'الرئيسية' },
        seo: null,
      });
    });

    it('never leaks BaseSchema audit fields or the internal status flag to a public reader', () => {
      const service = new PagesService(makeRepository(), makeMediaAssets());

      const result = service.toPublicResponse(makeDocument()) as Record<string, unknown>;

      // `status` is the server-side routing gate (only `Published` resolves),
      // not display data — same reasoning as heroSlides' `active` field.
      for (const leaked of ['status', 'createdBy', 'updatedBy', 'archivedAt', 'archivedBy', '_id']) {
        expect(result).not.toHaveProperty(leaked);
      }
    });

    it('serialises the SEO block, converting ogImageId to a string', () => {
      const service = new PagesService(makeRepository(), makeMediaAssets());
      const ogImageId = new Types.ObjectId();
      const document = makeDocument({
        seo: {
          metaTitle: { en: 'Meta', ar: 'وصف' },
          metaDescription: { en: 'Desc', ar: 'شرح' },
          ogImageId,
        },
      } as unknown as Partial<PageDocument>);

      const result = service.toPublicResponse(document);

      expect(result.seo).toEqual({
        metaTitle: { en: 'Meta', ar: 'وصف' },
        metaDescription: { en: 'Desc', ar: 'شرح' },
        ogImageId: ogImageId.toString(),
      });
    });
  });

  describe('findPublishedBySlug', () => {
    it('returns the public shape, not the raw document', async () => {
      const repository = makeRepository();
      const document = makeDocument();
      repository.findOne.mockResolvedValue(document);
      const service = new PagesService(repository, makeMediaAssets());

      const result = await service.findPublishedBySlug('home');

      expect(repository.findOne).toHaveBeenCalledWith({ slug: 'home', status: 'Published' });
      expect(result).toEqual(service.toPublicResponse(document));
    });

    it('returns null for an unknown or still-Draft slug', async () => {
      const repository = makeRepository();
      repository.findOne.mockResolvedValue(null);
      const service = new PagesService(repository, makeMediaAssets());

      await expect(service.findPublishedBySlug('nope')).resolves.toBeNull();
    });
  });
});

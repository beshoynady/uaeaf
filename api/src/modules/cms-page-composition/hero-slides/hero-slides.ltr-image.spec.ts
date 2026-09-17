import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HeroSlidesService } from './hero-slides.service.js';
import { HeroSlidesRepository } from './hero-slides.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { CreateHeroSlideDto } from './dto/create-hero-slides.dto.js';
import type { HeroSlideDocument } from './schemas/hero-slides.schema.js';

/**
 * What an English reader sees in place of the Arabic composition
 * (owner decision 2026-09-16, `ltrImageMode`).
 *
 * The picture is composed for Arabic: a quiet third on the right, where an
 * Arabic reader starts. English text starts on the left, so the picture has to
 * follow. Three ways, chosen per slide:
 *
 * - `mirror` (default): the same picture flipped horizontally; the point the
 *   crop keeps flips with it.
 * - `same`: the picture unchanged, for images that must never flip.
 * - `separate`: a second picture with its own focal point, for anything a flip
 *   would falsify: a flag, writing, a known landmark.
 *
 * The portrait phone picture never flips: it is composed with its quiet part at
 * the bottom, which a horizontal flip does not move.
 */
describe('HeroSlidesService — the English picture (ltrImageMode)', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(),
      find: jest.fn(async () => []),
      findById: jest.fn(),
      updateById: jest.fn(),
    }) as unknown as jest.Mocked<HeroSlidesRepository>;

  const makeMediaAssets = () =>
    ({
      assertUsableImage: jest.fn(),
      resolvePublicImages: jest.fn(async () => new Map()),
    }) as unknown as jest.Mocked<MediaAssetsService>;

  const ready = () => {
    const repository = makeRepository();
    const media = makeMediaAssets();
    media.assertUsableImage.mockResolvedValue(undefined);
    repository.create.mockResolvedValue({} as never);
    repository.updateById.mockResolvedValue({} as never);
    return { repository, media, service: new HeroSlidesService(repository, media) };
  };

  const base = () => ({
    pageSectionId: new Types.ObjectId().toString(),
    mediaType: 'IMAGE' as const,
    imageAssetId: new Types.ObjectId().toString(),
    title: { en: 'T', ar: 'ع' },
    subtitle: { en: 'S', ar: 'ع' },
    displayOrder: 1,
  });

  const image = (id: string) => ({ url: `https://cdn/${id}.jpg`, width: 3840, height: 2160, altText: { ar: 'ع', en: 'E' } });

  const stored = (overrides: Record<string, unknown> = {}) =>
    ({
      _id: new Types.ObjectId(),
      mediaType: 'IMAGE',
      imageAssetId: new Types.ObjectId(),
      desktopFocalPoint: { x: 30, y: 62 },
      useMobileImage: false,
      mobileImageAssetId: null,
      mobileFocalPoint: { x: 50, y: 50 },
      ltrImageMode: 'mirror',
      ltrImageAssetId: null,
      ltrFocalPoint: null,
      videoId: null,
      eyebrow: null,
      title: { en: 'T', ar: 'ع' },
      subtitle: { en: 'S', ar: 'ع' },
      primaryCta: { isVisible: false, label: null, url: null },
      secondaryCta: { isVisible: false, label: null, url: null },
      displayOrder: 0,
      ...overrides,
    }) as unknown as HeroSlideDocument;

  describe('storing the choice', () => {
    it('mirrors by default, because the library is composed for Arabic', async () => {
      const { repository, service } = ready();

      await service.create(base());

      const written = repository.create.mock.calls[0][0] as Record<string, unknown>;
      expect(written.ltrImageMode).toBe('mirror');
      expect(written.ltrImageAssetId).toBeNull();
    });

    it('refuses an unknown mode at the boundary', async () => {
      const dto = plainToInstance(CreateHeroSlideDto, { ...base(), ltrImageMode: 'flip' });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain('ltrImageMode');
    });

    it.each([
      ['no English picture', { ltrFocalPoint: { x: 40, y: 50 } }, 'ltrImageAssetId'],
      ['no focal point for it', { ltrImageAssetId: new Types.ObjectId().toString() }, 'ltrFocalPoint'],
    ])('refuses "separate" with %s, naming the missing field', async (_why, extra, field) => {
      const { service } = ready();

      await expect(service.create({ ...base(), ltrImageMode: 'separate', ...extra })).rejects.toMatchObject({
        response: { code: 'incompleteLtrImage', field },
      });
    });

    it('stores "separate" with both, and checks the English picture like any other', async () => {
      const { repository, media, service } = ready();
      const ltrImageAssetId = new Types.ObjectId().toString();

      await service.create({ ...base(), ltrImageMode: 'separate', ltrImageAssetId, ltrFocalPoint: { x: 70, y: 40 } });

      expect(media.assertUsableImage).toHaveBeenCalledWith(ltrImageAssetId);
      const written = repository.create.mock.calls[0][0] as Record<string, unknown>;
      expect(written.ltrImageMode).toBe('separate');
      expect(String(written.ltrImageAssetId)).toBe(ltrImageAssetId);
      expect(written.ltrFocalPoint).toEqual({ x: 70, y: 40 });
    });

    it('refuses an edit that switches to "separate" when the stored slide has no English picture', async () => {
      const { repository, service } = ready();
      repository.findById.mockResolvedValue(stored());

      await expect(service.update('id', { ltrImageMode: 'separate' })).rejects.toMatchObject({
        response: { code: 'incompleteLtrImage', field: 'ltrImageAssetId' },
      });
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('keeps the English picture when an edit switches back to mirror', async () => {
      const { repository, service } = ready();
      repository.findById.mockResolvedValue(
        stored({ ltrImageMode: 'separate', ltrImageAssetId: new Types.ObjectId(), ltrFocalPoint: { x: 60, y: 50 } }),
      );

      await service.update('id', { ltrImageMode: 'mirror' });

      const update = repository.updateById.mock.calls[0][1] as Record<string, unknown>;
      expect(update).toEqual({ ltrImageMode: 'mirror' });
    });
  });

  describe('what an English visitor receives', () => {
    const withImages = (...ids: Types.ObjectId[]) => new Map(ids.map((id) => [id.toString(), image(id.toString())]));

    it('mirror: the same picture, flagged to flip, with the focal point flipped (x → 100 − x)', () => {
      const { service } = ready();
      const slide = stored({ desktopFocalPoint: { x: 30, y: 62 } });

      const pub = service.toPublicResponse(slide, withImages(slide.imageAssetId!));

      expect(pub.desktopLtr).toEqual({
        image: image(slide.imageAssetId!.toString()),
        focalPoint: { x: 70, y: 62 },
        mirrored: true,
      });
      expect(pub.desktop).toEqual({ image: image(slide.imageAssetId!.toString()), focalPoint: { x: 30, y: 62 } });
    });

    it('same: the same picture and focal point, not flipped', () => {
      const { service } = ready();
      const slide = stored({ ltrImageMode: 'same' });

      const pub = service.toPublicResponse(slide, withImages(slide.imageAssetId!));

      expect(pub.desktopLtr).toEqual({ image: image(slide.imageAssetId!.toString()), focalPoint: { x: 30, y: 62 }, mirrored: false });
    });

    it('separate: the English picture with its own focal point, not flipped', () => {
      const { service } = ready();
      const ltrImageAssetId = new Types.ObjectId();
      const slide = stored({ ltrImageMode: 'separate', ltrImageAssetId, ltrFocalPoint: { x: 64, y: 45 } });

      const pub = service.toPublicResponse(slide, withImages(slide.imageAssetId!, ltrImageAssetId));

      expect(pub.desktopLtr).toEqual({ image: image(ltrImageAssetId.toString()), focalPoint: { x: 64, y: 45 }, mirrored: false });
    });

    it('never flips the portrait phone picture', () => {
      const { service } = ready();
      const mobileImageAssetId = new Types.ObjectId();
      const slide = stored({ useMobileImage: true, mobileImageAssetId, mobileFocalPoint: { x: 20, y: 80 } });

      const pub = service.toPublicResponse(slide, withImages(slide.imageAssetId!, mobileImageAssetId));

      expect(pub.mobile).toEqual({ image: image(mobileImageAssetId.toString()), focalPoint: { x: 20, y: 80 } });
      expect(pub.mobile).not.toHaveProperty('mirrored');
    });

    it('resolves the English picture together with the others, in one lookup', async () => {
      const { repository, media, service } = ready();
      const ltrImageAssetId = new Types.ObjectId();
      repository.find.mockResolvedValue([
        stored({ active: true, scheduledFrom: null, scheduledTo: null, ltrImageMode: 'separate', ltrImageAssetId, ltrFocalPoint: { x: 50, y: 50 } }),
      ]);

      await service.findPublicBySection(new Types.ObjectId().toString());

      expect(media.resolvePublicImages).toHaveBeenCalledTimes(1);
      const refs = (media.resolvePublicImages.mock.calls[0][0] as unknown[]).map(String);
      expect(refs).toContain(ltrImageAssetId.toString());
    });
  });
});

import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { HeroSlidesService } from './hero-slides.service.js';
import { HeroSlidesRepository } from './hero-slides.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';

describe('HeroSlidesService', () => {
  const makeRepository = () =>
    ({ create: jest.fn(), find: jest.fn() }) as unknown as jest.Mocked<HeroSlidesRepository>;
  const makeMediaAssets = () =>
    ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>;

  const base = {
    pageSectionId: new Types.ObjectId().toString(),
    title: { en: 'T', ar: 'ع' },
    subtitle: { en: 'S', ar: 'ع' },
    ctaText: { en: 'Go', ar: 'اذهب' },
    ctaUrl: '/somewhere',
    displayOrder: 1,
  };

  it('accepts an IMAGE slide with a valid imageAssetId', async () => {
    const repository = makeRepository();
    const media = makeMediaAssets();
    const imageAssetId = new Types.ObjectId().toString();
    media.assertUsableImage.mockResolvedValue(undefined);
    repository.create.mockResolvedValue({} as never);
    const service = new HeroSlidesService(repository, media);

    await service.create({ ...base, mediaType: 'IMAGE', imageAssetId });

    expect(media.assertUsableImage).toHaveBeenCalledWith(imageAssetId);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an IMAGE slide with no imageAssetId', async () => {
    const service = new HeroSlidesService(makeRepository(), makeMediaAssets());

    await expect(service.create({ ...base, mediaType: 'IMAGE' })).rejects.toThrow(BadRequestException);
  });

  it('rejects an IMAGE slide that also carries a videoId', async () => {
    const media = makeMediaAssets();
    media.assertUsableImage.mockResolvedValue(undefined);
    const service = new HeroSlidesService(makeRepository(), media);

    await expect(
      service.create({
        ...base,
        mediaType: 'IMAGE',
        imageAssetId: new Types.ObjectId().toString(),
        videoId: new Types.ObjectId().toString(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a VIDEO slide with a videoId and never touches MediaAssets', async () => {
    const repository = makeRepository();
    const media = makeMediaAssets();
    repository.create.mockResolvedValue({} as never);
    const service = new HeroSlidesService(repository, media);

    await service.create({ ...base, mediaType: 'VIDEO', videoId: new Types.ObjectId().toString() });

    expect(media.assertUsableImage).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a VIDEO slide with no videoId', async () => {
    const service = new HeroSlidesService(makeRepository(), makeMediaAssets());

    await expect(service.create({ ...base, mediaType: 'VIDEO' })).rejects.toThrow(BadRequestException);
  });

  it('rejects a VIDEO slide that also carries an imageAssetId', async () => {
    const service = new HeroSlidesService(makeRepository(), makeMediaAssets());

    await expect(
      service.create({
        ...base,
        mediaType: 'VIDEO',
        videoId: new Types.ObjectId().toString(),
        imageAssetId: new Types.ObjectId().toString(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('findPublicBySection', () => {
    const pageSectionId = new Types.ObjectId().toString();

    function makeSlide(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        _id: new Types.ObjectId(),
        mediaType: 'IMAGE',
        imageAssetId: new Types.ObjectId(),
        videoId: null,
        title: { en: 'T', ar: 'ع' },
        subtitle: { en: 'S', ar: 'ع' },
        ctaText: { en: 'Go', ar: 'اذهب' },
        ctaUrl: '/somewhere',
        displayOrder: 1,
        active: true,
        scheduledFrom: null,
        scheduledTo: null,
        ...overrides,
      };
    }

    it('excludes the visibility-gate fields from the mapped shape', async () => {
      const repository = makeRepository();
      const slide = makeSlide();
      repository.find.mockResolvedValue([slide] as never);
      const service = new HeroSlidesService(repository, makeMediaAssets());

      const result = await service.findPublicBySection(pageSectionId);

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('active');
      expect(result[0]).not.toHaveProperty('scheduledFrom');
      expect(result[0]).not.toHaveProperty('scheduledTo');
      expect(result[0]).not.toHaveProperty('pageSectionId');
      expect(result[0].id).toBe(slide._id.toString());
    });

    it('excludes a slide outside its scheduled window', async () => {
      const repository = makeRepository();
      const future = new Date(Date.now() + 86_400_000);
      repository.find.mockResolvedValue([makeSlide({ scheduledFrom: future })] as never);
      const service = new HeroSlidesService(repository, makeMediaAssets());

      const result = await service.findPublicBySection(pageSectionId);

      expect(result).toEqual([]);
    });

    it('orders slides by displayOrder', async () => {
      const repository = makeRepository();
      const second = makeSlide({ displayOrder: 2 });
      const first = makeSlide({ displayOrder: 1 });
      repository.find.mockResolvedValue([second, first] as never);
      const service = new HeroSlidesService(repository, makeMediaAssets());

      const result = await service.findPublicBySection(pageSectionId);

      expect(result.map((slide) => slide.id)).toEqual([first._id.toString(), second._id.toString()]);
    });
  });
});

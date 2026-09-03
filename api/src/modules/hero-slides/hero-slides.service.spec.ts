import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { HeroSlidesService } from './hero-slides.service.js';
import { HeroSlidesRepository } from './hero-slides.repository.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';

describe('HeroSlidesService', () => {
  const makeRepository = () =>
    ({ create: jest.fn() }) as unknown as jest.Mocked<HeroSlidesRepository>;
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
});

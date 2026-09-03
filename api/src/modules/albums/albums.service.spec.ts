import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AlbumsService } from './albums.service.js';
import { AlbumsRepository } from './albums.repository.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';

describe('AlbumsService', () => {
  const makeRepository = () =>
    ({ create: jest.fn(), updateById: jest.fn() }) as unknown as jest.Mocked<AlbumsRepository>;
  const makeMediaAssetsService = () =>
    ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>;

  const baseDto = {
    title: { en: 'Gallery', ar: 'معرض' },
    slug: 'gallery',
    contentCategoryId: new Types.ObjectId().toString(),
    displayOrder: 1,
    publicationState: 'Draft' as const,
  };

  describe('create', () => {
    it('creates the album directly when coverImageId is omitted', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, mediaAssetsService);

      await service.create(baseDto);

      expect(mediaAssetsService.assertUsableImage).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ publishedAt: null, publishedBy: null, tags: [] }),
      );
    });

    it('accepts coverImageId when MediaAssetsService confirms it is usable', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      const coverImageId = new Types.ObjectId().toString();
      mediaAssetsService.assertUsableImage.mockResolvedValue(undefined);
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, mediaAssetsService);

      await service.create({ ...baseDto, coverImageId });

      expect(mediaAssetsService.assertUsableImage).toHaveBeenCalledWith(coverImageId);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ coverImageId: expect.any(Types.ObjectId) }),
      );
    });

    it('propagates NotFoundException from MediaAssetsService without creating the album', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      mediaAssetsService.assertUsableImage.mockRejectedValue(new NotFoundException());
      const service = new AlbumsService(repository, mediaAssetsService);

      await expect(
        service.create({ ...baseDto, coverImageId: new Types.ObjectId().toString() }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('propagates ConflictException from MediaAssetsService without creating the album', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      mediaAssetsService.assertUsableImage.mockRejectedValue(new ConflictException());
      const service = new AlbumsService(repository, mediaAssetsService);

      await expect(
        service.create({ ...baseDto, coverImageId: new Types.ObjectId().toString() }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the repository reports a duplicate slug', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      repository.create.mockRejectedValue(Object.assign(new Error('E11000'), { code: 11000, keyValue: { slug: 'gallery' } }));
      const service = new AlbumsService(repository, mediaAssetsService);

      await expect(service.create(baseDto)).rejects.toThrow(ConflictException);
    });

    it('trims, drops empty strings, and dedupes tags', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, mediaAssetsService);

      await service.create({ ...baseDto, tags: ['  Track  ', 'Track', '', '   ', 'Field'] });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['Track', 'Field'] }),
      );
    });

    it('caps the number of tags', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, mediaAssetsService);
      const manyTags = Array.from({ length: 30 }, (_, i) => `tag-${i}`);

      await service.create({ ...baseDto, tags: manyTags });

      const call = repository.create.mock.calls[0][0] as { tags: string[] };
      expect(call.tags.length).toBeLessThanOrEqual(20);
    });
  });

  describe('publish', () => {
    it('sets publicationState to Published and stamps publishedAt/publishedBy', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      const albumId = new Types.ObjectId().toString();
      const publishedBy = new Types.ObjectId();
      repository.updateById.mockResolvedValue({ publicationState: 'Published' } as never);
      const service = new AlbumsService(repository, mediaAssetsService);

      await service.publish(albumId, publishedBy);

      expect(repository.updateById).toHaveBeenCalledWith(albumId, {
        publicationState: 'Published',
        publishedAt: expect.any(Date),
        publishedBy,
      });
    });
  });
});

import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { MediaAssetsService } from './media-assets.service.js';
import { MediaAssetsRepository } from './media-assets.repository.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import type { AlbumDocument } from '../albums/schemas/album.schema.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';

describe('MediaAssetsService', () => {
  const makeRepository = () =>
    ({ create: jest.fn(), softDelete: jest.fn() }) as unknown as jest.Mocked<MediaAssetsRepository>;

  const makeAlbumModel = () => {
    const exec = jest.fn().mockResolvedValue({ acknowledged: true });
    const updateOne = jest.fn().mockReturnValue({ exec });
    return { updateOne, exec } as unknown as jest.Mocked<Model<AlbumDocument>> & { exec: jest.Mock };
  };

  const baseDto: CreateMediaAssetDto = {
    file: {
      url: 'https://example.com/a.jpg',
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      size: 12345,
      originalName: 'a.jpg',
      storageKey: 'media/a.jpg',
    },
    caption: { en: 'Caption', ar: 'تعليق' },
    altText: { en: 'Alt', ar: 'بديل' },
    displayOrder: 1,
  };

  describe('create', () => {
    it('increments the parent album assetCount when albumId is set', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      const albumId = new Types.ObjectId();
      repository.create.mockResolvedValue({ albumId } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel);

      await service.create({ ...baseDto, albumId: albumId.toString() });

      expect(albumModel.updateOne).toHaveBeenCalledWith({ _id: albumId }, { $inc: { assetCount: 1 } });
    });

    it('does not touch any album when albumId is omitted', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel);

      await service.create(baseDto);

      expect(albumModel.updateOne).not.toHaveBeenCalled();
    });

    it('defaults isVisible/isFeatured and stores checksum as null', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel);

      await service.create(baseDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isVisible: true,
          isFeatured: false,
          file: expect.objectContaining({ checksum: null }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('decrements the parent album assetCount when the removed asset had one', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      const albumId = new Types.ObjectId();
      repository.softDelete.mockResolvedValue({ albumId } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel);

      await service.remove(new Types.ObjectId().toString(), new Types.ObjectId());

      expect(albumModel.updateOne).toHaveBeenCalledWith({ _id: albumId }, { $inc: { assetCount: -1 } });
    });

    it('does not touch any album when the removed asset had no albumId', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.softDelete.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel);

      await service.remove(new Types.ObjectId().toString(), new Types.ObjectId());

      expect(albumModel.updateOne).not.toHaveBeenCalled();
    });

    it('does not throw when the asset no longer exists', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.softDelete.mockResolvedValue(null);
      const service = new MediaAssetsService(repository, albumModel);

      await expect(
        service.remove(new Types.ObjectId().toString(), new Types.ObjectId()),
      ).resolves.toBeNull();
      expect(albumModel.updateOne).not.toHaveBeenCalled();
    });
  });
});

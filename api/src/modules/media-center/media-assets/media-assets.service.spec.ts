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

    it('defaults file.photographer/captureDate to null when omitted', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel);

      await service.create(baseDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file: expect.objectContaining({ photographer: null, captureDate: null }),
        }),
      );
    });

    it('stores the supplied file.photographer and parses captureDate to a Date', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel);

      await service.create({
        ...baseDto,
        file: { ...baseDto.file, photographer: 'Ahmed Al Obaidli', captureDate: '2026-03-15' },
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file: expect.objectContaining({
            photographer: 'Ahmed Al Obaidli',
            captureDate: new Date('2026-03-15'),
          }),
        }),
      );
    });
  });

  describe('toPublicResponse', () => {
    it('includes photographer and captureDate in the public file shape', () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      const service = new MediaAssetsService(repository, albumModel);
      const captureDate = new Date('2026-03-15');
      const asset = {
        _id: new Types.ObjectId(),
        file: { ...baseDto.file, checksum: null, photographer: 'Ahmed Al Obaidli', captureDate },
        caption: baseDto.caption,
        altText: baseDto.altText,
        displayOrder: baseDto.displayOrder,
        isFeatured: false,
      } as unknown as MediaAssetDocument;

      const result = service.toPublicResponse(asset);

      expect(result.file.photographer).toBe('Ahmed Al Obaidli');
      expect(result.file.captureDate).toBe(captureDate);
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

/**
 * Public read by id — the gap that blocked every image on the public site.
 *
 * Twelve public pages carry a `heroImageId`, the admin panel offers a picker
 * for it, and the public site had no way to turn that id into a URL: every
 * route on `media-assets` required `mediaAssets:Read`, so an anonymous request
 * got a 401. Recorded as an API gap in ADR-0060 §7 and approved for
 * implementation by the Product Owner on 2026-09-09.
 */
describe('MediaAssetsService.findPublicByIds', () => {
  const makeRepository = () =>
    ({ findVisibleByIds: jest.fn() }) as unknown as jest.Mocked<MediaAssetsRepository>;
  const albumModel = {} as never;

  const doc = (id: Types.ObjectId, url: string) =>
    ({
      _id: id,
      file: {
        url,
        mimeType: 'image/jpeg',
        width: 1600,
        height: 900,
        size: 1,
        photographer: null,
        captureDate: null,
      },
      caption: { en: 'c', ar: 'ت' },
      altText: { en: 'a', ar: 'ب' },
      displayOrder: 0,
      isFeatured: false,
    }) as unknown as MediaAssetDocument;

  it('returns the public-safe shape for each requested id', async () => {
    const repository = makeRepository();
    const id = new Types.ObjectId();
    repository.findVisibleByIds.mockResolvedValue([doc(id, 'https://cdn/a.jpg')]);
    const service = new MediaAssetsService(repository, albumModel);

    const result = await service.findPublicByIds([id.toString()]);

    expect(result).toEqual([
      expect.objectContaining({
        id: id.toString(),
        file: expect.objectContaining({ url: 'https://cdn/a.jpg' }),
      }),
    ]);
    // The internal file fields must not leak to an anonymous caller.
    expect(result[0].file).not.toHaveProperty('storageKey');
    expect(result[0].file).not.toHaveProperty('checksum');
  });

  it('ignores ids that are not valid ObjectIds instead of throwing', async () => {
    // A public endpoint is reachable by anyone, so a malformed id is an
    // ordinary event, not an exceptional one. Throwing would turn a typo in a
    // CMS field into a 500 on a visitor's page.
    const repository = makeRepository();
    repository.findVisibleByIds.mockResolvedValue([]);
    const service = new MediaAssetsService(repository, albumModel);

    await expect(service.findPublicByIds(['not-an-id', ''])).resolves.toEqual([]);
    // …and it does not reach the database to learn that nothing valid was
    // asked for. A query for an empty `$in` is a round trip whose answer is
    // already known.
    expect(repository.findVisibleByIds).not.toHaveBeenCalled();
  });

  it('caps how many ids one anonymous request may resolve', async () => {
    const repository = makeRepository();
    repository.findVisibleByIds.mockResolvedValue([]);
    const service = new MediaAssetsService(repository, albumModel);

    const many = Array.from({ length: 80 }, () => new Types.ObjectId().toString());
    await service.findPublicByIds(many);

    const passed = repository.findVisibleByIds.mock.calls[0][0];
    expect(passed).toHaveLength(50);
  });

  it('returns an empty list when asked for nothing', async () => {
    const repository = makeRepository();
    const service = new MediaAssetsService(repository, albumModel);

    await expect(service.findPublicByIds([])).resolves.toEqual([]);
    expect(repository.findVisibleByIds).not.toHaveBeenCalled();
  });
});

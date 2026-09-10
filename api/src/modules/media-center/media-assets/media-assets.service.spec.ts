import { jest } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { MediaAssetsService } from './media-assets.service.js';
import { MediaAssetsRepository } from './media-assets.repository.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import type { AlbumDocument } from '../albums/schemas/album.schema.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import type { StorageProvider } from '../storage/storage-provider.js';
import { STORAGE_FOLDERS } from '../storage/storage-provider.js';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto.js';
import type { UploadCandidate } from './upload/upload-constraints.js';

describe('MediaAssetsService', () => {
  /** The image store, faked. Nothing in these tests may reach a network:
   *  what is under test is what the service does with a stored object, not
   *  whether the provider stores one. */
  const makeStorage = () =>
    ({
      upload: jest.fn<StorageProvider['upload']>().mockResolvedValue({
        url: 'https://res.cloudinary.com/demo/image/upload/v1/uaeaf/pages/hero-ab12.png',
        storageKey: 'uaeaf/pages/hero-ab12',
        width: 1536,
        height: 672,
        bytes: 1_639_225,
        mimeType: 'image/png',
      }),
      destroy: jest.fn<StorageProvider['destroy']>().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<StorageProvider>;

  const makeRepository = () =>
    ({
      create: jest.fn(),
      softDelete: jest.fn(),
      findIncludingArchived: jest.fn(),
      hardDelete: jest.fn(),
    }) as unknown as jest.Mocked<MediaAssetsRepository>;

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
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

      await service.create({ ...baseDto, albumId: albumId.toString() });

      expect(albumModel.updateOne).toHaveBeenCalledWith({ _id: albumId }, { $inc: { assetCount: 1 } });
    });

    it('does not touch any album when albumId is omitted', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

      await service.create(baseDto);

      expect(albumModel.updateOne).not.toHaveBeenCalled();
    });

    it('defaults isVisible/isFeatured and stores checksum as null', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

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
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

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
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

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
      const service = new MediaAssetsService(repository, albumModel, makeStorage());
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
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

      await service.remove(new Types.ObjectId().toString(), new Types.ObjectId());

      expect(albumModel.updateOne).toHaveBeenCalledWith({ _id: albumId }, { $inc: { assetCount: -1 } });
    });

    it('does not touch any album when the removed asset had no albumId', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.softDelete.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

      await service.remove(new Types.ObjectId().toString(), new Types.ObjectId());

      expect(albumModel.updateOne).not.toHaveBeenCalled();
    });

    it('does not throw when the asset no longer exists', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.softDelete.mockResolvedValue(null);
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

      await expect(
        service.remove(new Types.ObjectId().toString(), new Types.ObjectId()),
      ).resolves.toBeNull();
      expect(albumModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('uploadAndCreate', () => {
    /** A fresh album model per test: several of these assert on it after
     *  handing the same instance to the service. */
    let albumModel: ReturnType<typeof makeAlbumModel>;
    beforeEach(() => {
      albumModel = makeAlbumModel();
    });

    const hero = readFileSync(
      join(process.cwd(), '..', 'apps', 'web', 'public', 'design-assets', 'contact', 'contact-hero-2616-1382.png'),
    );

    const upload = (): UploadCandidate =>
      ({ buffer: hero, size: hero.length, originalname: 'contact-hero.png' }) as UploadCandidate;

    const meta: UploadMediaAssetDto = {
      caption: { en: 'Contact hero', ar: 'صورة الغلاف' },
      altText: { en: 'Runners on a track', ar: 'عدّاؤون على المضمار' },
    };

    it('records the provider’s measurements, never the browser’s claims', async () => {
      // The whole reason the upload path exists: `width`, `height`, `size`
      // and `mimeType` describe the object that is actually stored.
      const repository = makeRepository();
      const storage = makeStorage();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);

      await new MediaAssetsService(repository, albumModel, storage).uploadAndCreate(
        upload(),
        meta,
        STORAGE_FOLDERS.pages,
      );

      const created = repository.create.mock.calls[0][0] as { file: Record<string, unknown> };
      expect(created.file).toMatchObject({
        url: 'https://res.cloudinary.com/demo/image/upload/v1/uaeaf/pages/hero-ab12.png',
        storageKey: 'uaeaf/pages/hero-ab12',
        width: 1536,
        height: 672,
        size: 1_639_225,
        mimeType: 'image/png',
        originalName: 'contact-hero.png',
      });
    });

    it('refuses a file that is not an image before reaching the store', async () => {
      // The point of ordering it this way: a rejected upload must not have
      // cost bandwidth or quota.
      const repository = makeRepository();
      const storage = makeStorage();
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
      const service = new MediaAssetsService(repository, albumModel, storage);

      await expect(
        service.uploadAndCreate(
          { buffer: svg, size: svg.length, originalname: 'x.png' } as UploadCandidate,
          meta,
          STORAGE_FOLDERS.pages,
        ),
      ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);

      expect(storage.upload).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('destroys the stored object when the record cannot be written', async () => {
      // Measured against the running API: a request that fails after the
      // upload left a file on the provider that no row pointed at -- the
      // orphan the whole delete policy exists to prevent. Storing the bytes
      // and writing the row are one operation or neither.
      const repository = makeRepository();
      const storage = makeStorage();
      repository.create.mockRejectedValue(new Error('validation failed at the schema'));

      await expect(
        new MediaAssetsService(repository, albumModel, storage).uploadAndCreate(
          upload(),
          meta,
          STORAGE_FOLDERS.pages,
        ),
      ).rejects.toThrow('validation failed at the schema');

      expect(storage.destroy).toHaveBeenCalledWith('uaeaf/pages/hero-ab12');
    });

    it('reports the original failure, not one from the cleanup', async () => {
      // If the compensating destroy also fails there is nothing more to be
      // done about the orphan, and replacing the real cause with a second
      // provider error would hide why the request failed at all.
      const repository = makeRepository();
      const storage = makeStorage();
      repository.create.mockRejectedValue(new Error('schema said no'));
      storage.destroy.mockRejectedValue(new Error('provider also down'));

      await expect(
        new MediaAssetsService(repository, albumModel, storage).uploadAndCreate(
          upload(),
          meta,
          STORAGE_FOLDERS.pages,
        ),
      ).rejects.toThrow('schema said no');
    });

    it('places a page upload outside any album, at the head of the order', async () => {
      // `displayOrder` is required by the schema but means nothing for an
      // image that belongs to a page rather than to an album's grid.
      const repository = makeRepository();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);

      await new MediaAssetsService(repository, albumModel, makeStorage()).uploadAndCreate(
        upload(),
        meta,
        STORAGE_FOLDERS.pages,
      );

      expect(repository.create.mock.calls[0][0]).toMatchObject({ albumId: null, displayOrder: 0 });
      expect(albumModel.updateOne).not.toHaveBeenCalled();
    });

    it('keeps the album’s count correct when the upload joins one', async () => {
      const repository = makeRepository();
      const albumId = new Types.ObjectId();
      repository.create.mockResolvedValue({ albumId } as unknown as MediaAssetDocument);

      await new MediaAssetsService(repository, albumModel, makeStorage()).uploadAndCreate(
        upload(),
        { ...meta, albumId: albumId.toString(), displayOrder: 3 },
        STORAGE_FOLDERS.library,
      );

      expect(repository.create.mock.calls[0][0]).toMatchObject({ displayOrder: 3 });
      expect(albumModel.updateOne).toHaveBeenCalledWith({ _id: albumId }, { $inc: { assetCount: 1 } });
    });

    it('carries the photographer and capture date an editor supplied', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);

      await new MediaAssetsService(repository, albumModel, makeStorage()).uploadAndCreate(
        upload(),
        { ...meta, photographer: 'A. Al Mansoori', captureDate: '2026-03-14' },
        STORAGE_FOLDERS.pages,
      );

      const created = repository.create.mock.calls[0][0] as { file: Record<string, unknown> };
      expect(created.file.photographer).toBe('A. Al Mansoori');
      expect(created.file.captureDate).toEqual(new Date('2026-03-14'));
    });
  });

  describe('purge', () => {
    /** A fresh album model per test: several of these assert on it after
     *  handing the same instance to the service. */
    let albumModel: ReturnType<typeof makeAlbumModel>;
    beforeEach(() => {
      albumModel = makeAlbumModel();
    });

    const archived = (storageKey: string) =>
      ({
        _id: new Types.ObjectId(),
        albumId: null,
        archivedAt: new Date(),
        file: { storageKey },
      }) as unknown as MediaAssetDocument;

    it('destroys the stored object before removing the record', async () => {
      // This order is the guarantee. Deleting the row first and failing at
      // the store leaves an object nothing points at — the orphan the purge
      // path exists to prevent.
      const repository = makeRepository();
      const storage = makeStorage();
      repository.findIncludingArchived.mockResolvedValue(archived('uaeaf/pages/hero-ab12'));
      repository.hardDelete.mockResolvedValue(true);

      await new MediaAssetsService(repository, albumModel, storage).purge('abc');

      expect(storage.destroy).toHaveBeenCalledWith('uaeaf/pages/hero-ab12');
      expect(repository.hardDelete).toHaveBeenCalled();
      const destroyOrder = storage.destroy.mock.invocationCallOrder[0];
      const deleteOrder = repository.hardDelete.mock.invocationCallOrder[0];
      expect(destroyOrder).toBeLessThan(deleteOrder);
    });

    it('keeps the record when the store refuses to destroy the object', async () => {
      const repository = makeRepository();
      const storage = makeStorage();
      storage.destroy.mockRejectedValue(new ServiceUnavailableException('down'));
      repository.findIncludingArchived.mockResolvedValue(archived('uaeaf/pages/hero-ab12'));

      await expect(
        new MediaAssetsService(repository, albumModel, storage).purge('abc'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(repository.hardDelete).not.toHaveBeenCalled();
    });

    it('refuses to purge an asset that is still live', async () => {
      // Purging is the second half of a two-step: archive first, then
      // destroy. Without this, one request could delete the picture a
      // published page is rendering, and nothing would name what broke.
      const repository = makeRepository();
      const storage = makeStorage();
      repository.findIncludingArchived.mockResolvedValue({
        _id: new Types.ObjectId(),
        albumId: null,
        archivedAt: null,
        file: { storageKey: 'uaeaf/pages/live' },
      } as unknown as MediaAssetDocument);

      await expect(
        new MediaAssetsService(repository, albumModel, storage).purge('abc'),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(storage.destroy).not.toHaveBeenCalled();
    });

    it('refuses to purge an id that references nothing', async () => {
      const repository = makeRepository();
      const storage = makeStorage();
      repository.findIncludingArchived.mockResolvedValue(null);

      await expect(
        new MediaAssetsService(repository, albumModel, storage).purge('abc'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(storage.destroy).not.toHaveBeenCalled();
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
  // This suite is a pure read path: it neither uploads nor purges, so the
  // store is never reached and a stand-in that would throw is the honest
  // stub -- if a read ever calls it, that is the defect, not this line.
  const storage = {} as never;

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
    const service = new MediaAssetsService(repository, albumModel, storage);

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
    const service = new MediaAssetsService(repository, albumModel, storage);

    await expect(service.findPublicByIds(['not-an-id', ''])).resolves.toEqual([]);
    // …and it does not reach the database to learn that nothing valid was
    // asked for. A query for an empty `$in` is a round trip whose answer is
    // already known.
    expect(repository.findVisibleByIds).not.toHaveBeenCalled();
  });

  it('caps how many ids one anonymous request may resolve', async () => {
    const repository = makeRepository();
    repository.findVisibleByIds.mockResolvedValue([]);
    const service = new MediaAssetsService(repository, albumModel, storage);

    const many = Array.from({ length: 80 }, () => new Types.ObjectId().toString());
    await service.findPublicByIds(many);

    const passed = repository.findVisibleByIds.mock.calls[0][0];
    expect(passed).toHaveLength(50);
  });

  it('returns an empty list when asked for nothing', async () => {
    const repository = makeRepository();
    const service = new MediaAssetsService(repository, albumModel, storage);

    await expect(service.findPublicByIds([])).resolves.toEqual([]);
    expect(repository.findVisibleByIds).not.toHaveBeenCalled();
  });
});

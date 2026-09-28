import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, UnsupportedMediaTypeException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { MediaAssetsService } from './media-assets.service.js';
import type { MediaAssetLiveReferrerScan } from './media-assets.service.js';
import { MediaAssetsRepository } from './media-assets.repository.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import type { AlbumDocument } from '../albums/schemas/album.schema.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import type { StorageProvider } from '../storage/storage-provider.js';
import { STORAGE_FOLDERS } from '../storage/storage-provider.js';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto.js';
import type { UploadCandidate } from './upload/upload-constraints.js';
import type { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import type { MediaAssetReferrer } from '../../../common/authz/media-references.js';

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
      archiveIfLive: jest.fn(),
      restoreIfArchived: jest.fn(),
      findIncludingArchived: jest.fn(),
      hardDelete: jest.fn(),
    }) as unknown as jest.Mocked<MediaAssetsRepository>;

  const makeAlbumModel = () => {
    const exec = jest.fn<() => Promise<{ acknowledged: boolean }>>().mockResolvedValue({ acknowledged: true });
    const updateOne = jest.fn().mockReturnValue({ exec });
    return { updateOne, exec } as unknown as Model<AlbumDocument> & { updateOne: jest.Mock; exec: jest.Mock };
  };

  /** Resolves to no live referrers by default — the ordinary case an archive
   *  needs no confirmation for. Individual tests override it. */
  const makeReferrerScan = () =>
    jest.fn<MediaAssetLiveReferrerScan>().mockResolvedValue([]) as jest.MockedFunction<MediaAssetLiveReferrerScan>;

  const makeAuditLogsService = () =>
    ({ write: jest.fn<AuditLogsService['write']>().mockResolvedValue({} as never) }) as unknown as jest.Mocked<AuditLogsService>;

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
      repository.archiveIfLive.mockResolvedValue({ albumId } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(
        repository,
        albumModel,
        makeStorage(),
        undefined,
        makeReferrerScan(),
        makeAuditLogsService(),
      );

      await service.remove(new Types.ObjectId().toString(), new Types.ObjectId());

      expect(albumModel.updateOne).toHaveBeenCalledWith({ _id: albumId }, { $inc: { assetCount: -1 } });
    });

    it('does not touch any album when the removed asset had no albumId', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.archiveIfLive.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(
        repository,
        albumModel,
        makeStorage(),
        undefined,
        makeReferrerScan(),
        makeAuditLogsService(),
      );

      await service.remove(new Types.ObjectId().toString(), new Types.ObjectId());

      expect(albumModel.updateOne).not.toHaveBeenCalled();
    });

    it('does not throw when the asset no longer exists', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.archiveIfLive.mockResolvedValue(null);
      repository.findIncludingArchived.mockResolvedValue(null);
      const service = new MediaAssetsService(
        repository,
        albumModel,
        makeStorage(),
        undefined,
        makeReferrerScan(),
        makeAuditLogsService(),
      );

      await expect(
        service.remove(new Types.ObjectId().toString(), new Types.ObjectId()),
      ).resolves.toBeNull();
      expect(albumModel.updateOne).not.toHaveBeenCalled();
    });

    /** A count that moves twice for one archive is a grid that says it holds
     *  fewer photographs than it does, and nothing restores it. */
    it('leaves the album count alone when the asset was already archived', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      const albumId = new Types.ObjectId();
      repository.archiveIfLive.mockResolvedValue(null);
      repository.findIncludingArchived.mockResolvedValue({
        albumId,
        archivedAt: new Date('2026-02-01'),
      } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(
        repository,
        albumModel,
        makeStorage(),
        undefined,
        makeReferrerScan(),
        makeAuditLogsService(),
      );

      const answered = await service.remove(new Types.ObjectId().toString(), new Types.ObjectId());

      expect(albumModel.updateOne).not.toHaveBeenCalled();
      expect(answered?.albumId).toBe(albumId);
    });
  });

  /**
   * Archiving a referenced image used to check nothing and blank it on the
   * live site with no warning (owner decision 2026-09-27, Batch 2 §C). These
   * prove the warning: informed consent, not prevention.
   */
  describe('remove — the in-use warning', () => {
    const referrer = (collection: string): MediaAssetReferrer => ({
      collection,
      path: 'coverMediaId',
      documentId: new Types.ObjectId().toString(),
      kind: 'ref',
    });

    it('refuses an archive while the image is still referenced, naming where', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      const referrerScan = makeReferrerScan();
      referrerScan.mockResolvedValue([referrer('articles'), referrer('heroSlides')]);
      const auditLogsService = makeAuditLogsService();
      const service = new MediaAssetsService(
        repository,
        albumModel,
        makeStorage(),
        undefined,
        referrerScan,
        auditLogsService,
      );

      await expect(
        service.remove(new Types.ObjectId().toString(), new Types.ObjectId()),
      ).rejects.toMatchObject({
        response: {
          code: 'mediaInUse',
          referrers: [
            expect.objectContaining({ collection: 'articles' }),
            expect.objectContaining({ collection: 'heroSlides' }),
          ],
        },
      });
      expect(repository.archiveIfLive).not.toHaveBeenCalled();
      expect(auditLogsService.write).not.toHaveBeenCalled();
    });

    it('archives on acknowledgement, and records the count and the list in the audit row', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      const assetId = new Types.ObjectId();
      repository.archiveIfLive.mockResolvedValue({ _id: assetId, albumId: null } as unknown as MediaAssetDocument);
      const referrerScan = makeReferrerScan();
      const oneReferrer = referrer('articles');
      referrerScan.mockResolvedValue([oneReferrer]);
      const auditLogsService = makeAuditLogsService();
      const service = new MediaAssetsService(
        repository,
        albumModel,
        makeStorage(),
        undefined,
        referrerScan,
        auditLogsService,
      );

      await service.remove(assetId.toString(), new Types.ObjectId(), { acknowledgeReferences: true });

      expect(repository.archiveIfLive).toHaveBeenCalled();
      expect(auditLogsService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: expect.objectContaining({
            referrersCount: 1,
            referrers: [expect.objectContaining({ collection: 'articles' })],
          }),
        }),
      );
    });

    /**
     * Neither fail-closed nor fail-open: the operator is told the check could
     * not run and confirms anyway, so an outage cannot block a takedown and
     * cannot hide a live reference either.
     */
    it('asks for the same confirmation when the scan itself fails', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      const assetId = new Types.ObjectId();
      repository.archiveIfLive.mockResolvedValue({ _id: assetId, albumId: null } as unknown as MediaAssetDocument);
      const referrerScan = makeReferrerScan();
      referrerScan.mockRejectedValue(new Error('down'));
      const auditLogsService = makeAuditLogsService();
      const service = new MediaAssetsService(
        repository,
        albumModel,
        makeStorage(),
        undefined,
        referrerScan,
        auditLogsService,
      );

      await expect(
        service.remove(assetId.toString(), new Types.ObjectId()),
      ).rejects.toMatchObject({ response: { code: 'mediaInUse', scanIncomplete: true } });
      expect(repository.archiveIfLive).not.toHaveBeenCalled();

      await service.remove(assetId.toString(), new Types.ObjectId(), { acknowledgeReferences: true });
      expect(repository.archiveIfLive).toHaveBeenCalled();
    });

    it('archives an unreferenced image with no confirmation at all', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      const assetId = new Types.ObjectId();
      repository.archiveIfLive.mockResolvedValue({ _id: assetId, albumId: null } as unknown as MediaAssetDocument);
      const referrerScan = makeReferrerScan();
      const auditLogsService = makeAuditLogsService();
      const service = new MediaAssetsService(
        repository,
        albumModel,
        makeStorage(),
        undefined,
        referrerScan,
        auditLogsService,
      );

      await service.remove(assetId.toString(), new Types.ObjectId());

      expect(repository.archiveIfLive).toHaveBeenCalled();
      expect(auditLogsService.write).toHaveBeenCalledWith(
        expect.objectContaining({ newValue: expect.objectContaining({ referrersCount: 0, referrers: [] }) }),
      );
    });

    /** Revisions hold every image ever published, so counting them would make
     *  every archive need a confirmation and train the operator to click
     *  through it — which is how a warning stops being read. */
    it('ignores revisions, counting only what the live site still shows', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      const assetId = new Types.ObjectId();
      repository.archiveIfLive.mockResolvedValue({ _id: assetId, albumId: null } as unknown as MediaAssetDocument);
      const referrerScan = makeReferrerScan();
      const auditLogsService = makeAuditLogsService();
      const service = new MediaAssetsService(
        repository,
        albumModel,
        makeStorage(),
        undefined,
        referrerScan,
        auditLogsService,
      );

      await service.remove(assetId.toString(), new Types.ObjectId());

      expect(referrerScan).toHaveBeenCalledWith(assetId.toString(), { includeRevisions: false });
    });
  });

  describe('unarchive', () => {
    it('puts the photo back into its album count', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      const albumId = new Types.ObjectId();
      repository.restoreIfArchived.mockResolvedValue({ albumId } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

      await service.unarchive(new Types.ObjectId().toString());

      expect(albumModel.updateOne).toHaveBeenCalledWith({ _id: albumId }, { $inc: { assetCount: 1 } });
    });

    it('leaves the album count alone when the asset was already live', async () => {
      const repository = makeRepository();
      const albumModel = makeAlbumModel();
      repository.restoreIfArchived.mockResolvedValue(null);
      repository.findIncludingArchived.mockResolvedValue({
        albumId: new Types.ObjectId(),
        archivedAt: null,
      } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

      await service.unarchive(new Types.ObjectId().toString());

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

      const created = repository.create.mock.calls[0][0] as { file: MediaAssetDocument['file'] };
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

    it('marks an uploaded picture as generated when the editor says so, and as not generated otherwise', async () => {
      // The dashboard's "temporary" chip reads this mark; an upload that could
      // not set it would put every generated picture in the library unmarked.
      const repository = makeRepository();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const service = new MediaAssetsService(repository, albumModel, makeStorage());

      await service.uploadAndCreate(upload(), { ...meta, isAiGenerated: true }, STORAGE_FOLDERS.pages);
      await service.uploadAndCreate(upload(), meta, STORAGE_FOLDERS.pages);

      expect((repository.create.mock.calls[0][0] as { isAiGenerated: boolean }).isAiGenerated).toBe(true);
      expect((repository.create.mock.calls[1][0] as { isAiGenerated: boolean }).isAiGenerated).toBe(false);
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

      const created = repository.create.mock.calls[0][0] as { file: MediaAssetDocument['file'] };
      expect(created.file.photographer).toBe('A. Al Mansoori');
      expect(created.file.captureDate).toEqual(new Date('2026-03-14'));
    });

    it('lets an icon through at its own floor and holds a page image to the page floor', async () => {
      // The same 128px square is a social channel's icon when the editor
      // says so and a blurred page image when nobody does.
      const bytes = Buffer.from(hero);
      bytes.writeUInt32BE(128, 16); // IHDR width
      bytes.writeUInt32BE(128, 20); // IHDR height
      const icon = { buffer: bytes, size: bytes.length, originalname: 'instagram.png' } as UploadCandidate;
      const repository = makeRepository();
      repository.create.mockResolvedValue({ albumId: null } as unknown as MediaAssetDocument);
      const storage = makeStorage();
      const service = new MediaAssetsService(repository, albumModel, storage);

      await expect(service.uploadAndCreate(icon, meta, STORAGE_FOLDERS.pages)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(storage.upload).not.toHaveBeenCalled();

      await service.uploadAndCreate(icon, meta, STORAGE_FOLDERS.pages, 'icon');
      expect(storage.upload).toHaveBeenCalledTimes(1);
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

/**
 * The page projections' image lookup (ADR-0070 D3): every image a page record
 * points at, resolved in one query and keyed by id, so each page asks once and
 * reads its fields from the map.
 */
describe('MediaAssetsService.resolvePublicImages', () => {
  const makeRepository = () =>
    ({ findVisibleByIds: jest.fn() }) as unknown as jest.Mocked<MediaAssetsRepository>;
  const albumModel = {} as never;
  const storage = {} as never;

  const asset = (id: Types.ObjectId) =>
    ({
      _id: id,
      file: {
        url: `https://cdn/${id.toString()}.jpg`,
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

  it('keys each image by its id, in the shape a public page draws', async () => {
    const repository = makeRepository();
    const hero = new Types.ObjectId();
    repository.findVisibleByIds.mockResolvedValue([asset(hero)]);
    const service = new MediaAssetsService(repository, albumModel, storage);

    const images = await service.resolvePublicImages([hero]);

    expect(images.get(hero.toString())).toEqual({
      url: `https://cdn/${hero.toString()}.jpg`,
      altText: { en: 'a', ar: 'ب' },
      width: 1600,
      height: 900,
    });
  });

  it('skips empty refs and asks once for an image two fields share', async () => {
    const repository = makeRepository();
    repository.findVisibleByIds.mockResolvedValue([]);
    const service = new MediaAssetsService(repository, albumModel, storage);
    const id = new Types.ObjectId();

    await service.resolvePublicImages([id, null, undefined, '', id.toString()]);

    expect(repository.findVisibleByIds).toHaveBeenCalledTimes(1);
    expect(repository.findVisibleByIds.mock.calls[0][0]).toHaveLength(1);
  });

  it('does not reach the database when the record points at no image', async () => {
    const repository = makeRepository();
    const service = new MediaAssetsService(repository, albumModel, storage);

    await expect(service.resolvePublicImages([null, undefined])).resolves.toEqual(new Map());
    expect(repository.findVisibleByIds).not.toHaveBeenCalled();
  });
});

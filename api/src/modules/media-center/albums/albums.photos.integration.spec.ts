import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AlbumSchema } from './schemas/album.schema.js';
import type { AlbumDocument } from './schemas/album.schema.js';
import { MediaAssetSchema } from '../media-assets/schemas/media-asset.schema.js';
import type { MediaAssetDocument } from '../media-assets/schemas/media-asset.schema.js';
import { AlbumsRepository } from './albums.repository.js';
import { AlbumsService } from './albums.service.js';
import { MediaAssetsRepository } from '../media-assets/media-assets.repository.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../../../test/utils/mongo-memory-server.js';

/**
 * Photo management, against a real database.
 *
 * These behaviours are all about two records agreeing with each other — the
 * album's `coverImageId` and `assetCount` against the assets that actually
 * exist — so mocking the repository would test the mock's idea of agreement
 * rather than the database's.
 */
describe('AlbumsService photo management', () => {
  let server: MongoMemoryServer;
  let albumModel: Model<AlbumDocument>;
  let assetModel: Model<MediaAssetDocument>;
  let service: AlbumsService;
  let mediaAssetsService: MediaAssetsService;

  const actor = new Types.ObjectId();

  beforeAll(async () => {
    server = await connectTestDatabase();
    albumModel = registerTestModel<AlbumDocument>('Album', AlbumSchema);
    assetModel = registerTestModel<MediaAssetDocument>('MediaAsset', MediaAssetSchema);

    const storage = { upload: async () => ({}) as never, destroy: async () => undefined };
    mediaAssetsService = new MediaAssetsService(
      new MediaAssetsRepository(assetModel),
      albumModel,
      storage as never,
    );
    service = new AlbumsService(new AlbumsRepository(albumModel), mediaAssetsService);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const makeAlbum = () =>
    albumModel.create({
      title: { en: 'Gallery', ar: 'معرض' },
      slug: 'gallery',
      displayOrder: 1,
      publicationState: 'Published',
    });

  const makePhoto = (albumId: Types.ObjectId, displayOrder: number) =>
    assetModel.create({
      albumId,
      file: {
        url: 'https://example.com/a.jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        size: 1234,
        originalName: 'a.jpg',
        storageKey: `media/${displayOrder}.jpg`,
        checksum: null,
      },
      caption: { en: 'Caption', ar: 'تعليق' },
      altText: { en: 'Alt', ar: 'بديل' },
      displayOrder,
      isVisible: true,
      isFeatured: false,
    });

  /** An album with three photos in order, the first set as its cover. */
  const albumWithPhotos = async () => {
    const album = await makeAlbum();
    const photos = [await makePhoto(album._id, 0), await makePhoto(album._id, 1), await makePhoto(album._id, 2)];
    await albumModel.updateOne({ _id: album._id }, { coverImageId: photos[0]._id, assetCount: 3 });
    return { album, photos };
  };

  describe('removePhoto', () => {
    it('promotes the next photo when the cover is removed', async () => {
      const { album, photos } = await albumWithPhotos();

      await service.removePhoto(album._id.toString(), photos[0]._id.toString(), actor);

      const updated = await albumModel.findById(album._id);
      expect(updated!.coverImageId!.toString()).toBe(photos[1]._id.toString());
      expect(updated!.assetCount).toBe(2);
    });

    it('leaves the cover alone when a different photo is removed', async () => {
      const { album, photos } = await albumWithPhotos();

      await service.removePhoto(album._id.toString(), photos[2]._id.toString(), actor);

      const updated = await albumModel.findById(album._id);
      expect(updated!.coverImageId!.toString()).toBe(photos[0]._id.toString());
      expect(updated!.assetCount).toBe(2);
    });

    it('clears the cover when the last photo is removed', async () => {
      const album = await makeAlbum();
      const only = await makePhoto(album._id, 0);
      await albumModel.updateOne({ _id: album._id }, { coverImageId: only._id, assetCount: 1 });

      await service.removePhoto(album._id.toString(), only._id.toString(), actor);

      const updated = await albumModel.findById(album._id);
      expect(updated!.coverImageId).toBeNull();
      expect(updated!.assetCount).toBe(0);
    });

    it('refuses a photo that belongs to another album', async () => {
      const { album } = await albumWithPhotos();
      const other = await albumModel.create({
        title: { en: 'Other', ar: 'آخر' }, slug: 'other', displayOrder: 2, publicationState: 'Draft',
      });
      const stranger = await makePhoto(other._id, 0);

      await expect(
        service.removePhoto(album._id.toString(), stranger._id.toString(), actor),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setCover', () => {
    it('sets the cover to a photo of this album', async () => {
      const { album, photos } = await albumWithPhotos();

      await service.setCover(album._id.toString(), photos[2]._id.toString());

      const updated = await albumModel.findById(album._id);
      expect(updated!.coverImageId!.toString()).toBe(photos[2]._id.toString());
    });

    it('refuses a photo that belongs to another album', async () => {
      const { album } = await albumWithPhotos();
      const other = await albumModel.create({
        title: { en: 'Other', ar: 'آخر' }, slug: 'other', displayOrder: 2, publicationState: 'Draft',
      });
      const stranger = await makePhoto(other._id, 0);

      await expect(service.setCover(album._id.toString(), stranger._id.toString())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorderPhotos', () => {
    it('writes the given order', async () => {
      const { album, photos } = await albumWithPhotos();
      const reversed = [photos[2]._id.toString(), photos[1]._id.toString(), photos[0]._id.toString()];

      await service.reorderPhotos(album._id.toString(), reversed);

      const stored = await assetModel.find({ albumId: album._id }).sort({ displayOrder: 1 });
      expect(stored.map((p) => p._id.toString())).toEqual(reversed);
    });

    it('refuses an order that omits a photo, rather than leaving gaps', async () => {
      const { album, photos } = await albumWithPhotos();

      await expect(
        service.reorderPhotos(album._id.toString(), [photos[0]._id.toString()]),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses an order naming a photo from another album', async () => {
      const { album, photos } = await albumWithPhotos();
      const stranger = new Types.ObjectId().toString();

      await expect(
        service.reorderPhotos(album._id.toString(), [
          photos[0]._id.toString(), photos[1]._id.toString(), stranger,
        ]),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('setFeatured', () => {
    it('clears the previous holder in the same operation', async () => {
      const first = await makeAlbum();
      const second = await albumModel.create({
        title: { en: 'Second', ar: 'ثاني' }, slug: 'second', displayOrder: 2, publicationState: 'Published',
      });
      await service.setFeatured(first._id.toString());

      await service.setFeatured(second._id.toString());

      expect((await albumModel.findById(first._id))!.isFeatured).toBe(false);
      expect((await albumModel.findById(second._id))!.isFeatured).toBe(true);
      expect(await albumModel.countDocuments({ isFeatured: true })).toBe(1);
    });
  });
});

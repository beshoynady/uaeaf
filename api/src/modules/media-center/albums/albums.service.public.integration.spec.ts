import { Model } from 'mongoose';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AlbumSchema } from './schemas/album.schema.js';
import type { AlbumDocument } from './schemas/album.schema.js';
import { AlbumsRepository } from './albums.repository.js';
import { AlbumsService } from './albums.service.js';
import { MediaAssetSchema } from '../media-assets/schemas/media-asset.schema.js';
import type { MediaAssetDocument } from '../media-assets/schemas/media-asset.schema.js';
import { MediaAssetsRepository } from '../media-assets/media-assets.repository.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';

/** Real-Mongo coverage for the individual public album page
 *  (`AlbumsService.getPublicBySlug()`, 2026-09-04 follow-on to ADR-0054):
 *  Draft-album exclusion, non-visible-asset exclusion, display ordering,
 *  and the related-albums shared-association-target lookup. */
describe('AlbumsService.getPublicBySlug (integration)', () => {
  let server: MongoMemoryServer;
  let albumModel: Model<AlbumDocument>;
  let mediaAssetModel: Model<MediaAssetDocument>;
  let albumsService: AlbumsService;

  beforeAll(async () => {
    server = await connectTestDatabase();
    albumModel = mongoose.model<AlbumDocument>('Album', AlbumSchema);
    mediaAssetModel = mongoose.model<MediaAssetDocument>('MediaAsset', MediaAssetSchema);
    const albumsRepository = new AlbumsRepository(albumModel);
    const mediaAssetsRepository = new MediaAssetsRepository(mediaAssetModel);
    const mediaAssetsService = new MediaAssetsService(mediaAssetsRepository, albumModel);
    albumsService = new AlbumsService(albumsRepository, mediaAssetsService);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const baseAlbum = {
    title: { en: 'Gallery', ar: 'معرض' },
    slug: 'gallery',
    contentCategoryId: new Types.ObjectId(),
    displayOrder: 1,
  };

  function makeAsset(albumId: Types.ObjectId, displayOrder: number, isVisible = true) {
    return {
      albumId,
      file: {
        url: 'https://example.com/a.jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        size: 1234,
        originalName: 'a.jpg',
        storageKey: 'media/a.jpg',
        checksum: null,
      },
      caption: { en: 'Caption', ar: 'تعليق' },
      altText: { en: 'Alt', ar: 'بديل' },
      displayOrder,
      isVisible,
      isFeatured: false,
    };
  }

  it('returns null for a Draft album, even with a matching slug', async () => {
    const album = await albumModel.create({ ...baseAlbum, publicationState: 'Draft' });

    await expect(albumsService.getPublicBySlug(album.slug)).resolves.toBeNull();
  });

  it('returns null for an unknown slug', async () => {
    await expect(albumsService.getPublicBySlug('does-not-exist')).resolves.toBeNull();
  });

  it('excludes non-visible media assets from the photo grid', async () => {
    const album = await albumModel.create({ ...baseAlbum, publicationState: 'Published' });
    const visible = await mediaAssetModel.create(makeAsset(album._id, 1, true));
    await mediaAssetModel.create(makeAsset(album._id, 2, false));

    const result = await albumsService.getPublicBySlug(album.slug);

    expect(result).not.toBeNull();
    expect(result!.mediaAssets).toHaveLength(1);
    expect(result!.mediaAssets[0].id).toBe(visible._id.toString());
  });

  it('orders visible media assets by displayOrder', async () => {
    const album = await albumModel.create({ ...baseAlbum, publicationState: 'Published' });
    const second = await mediaAssetModel.create(makeAsset(album._id, 2));
    const first = await mediaAssetModel.create(makeAsset(album._id, 1));

    const result = await albumsService.getPublicBySlug(album.slug);

    expect(result!.mediaAssets.map((asset) => asset.id)).toEqual([
      first._id.toString(),
      second._id.toString(),
    ]);
  });

  it('includes other Published albums sharing an association target, excluding itself', async () => {
    const championshipId = new Types.ObjectId();
    const association = { ownerType: 'championships' as const, ownerId: championshipId, role: 'Related' as const, displayOrder: 0 };
    const current = await albumModel.create({
      ...baseAlbum,
      publicationState: 'Published',
      associations: [association],
    });
    const sharing = await albumModel.create({
      ...baseAlbum,
      slug: 'sharing',
      publicationState: 'Published',
      associations: [association],
    });

    const result = await albumsService.getPublicBySlug(current.slug);

    expect(result!.relatedAlbums.map((related) => related.id)).toEqual([sharing._id.toString()]);
  });

  it('returns an empty related-albums list, without error, when the album has no associations', async () => {
    const album = await albumModel.create({ ...baseAlbum, publicationState: 'Published' });

    const result = await albumsService.getPublicBySlug(album.slug);

    expect(result!.relatedAlbums).toEqual([]);
  });

  it('excludes a Draft album from another album’s related list even when it shares a target', async () => {
    const championshipId = new Types.ObjectId();
    const association = { ownerType: 'championships' as const, ownerId: championshipId, role: 'Related' as const, displayOrder: 0 };
    const current = await albumModel.create({
      ...baseAlbum,
      publicationState: 'Published',
      associations: [association],
    });
    await albumModel.create({
      ...baseAlbum,
      slug: 'draft-sharing',
      publicationState: 'Draft',
      associations: [association],
    });

    const result = await albumsService.getPublicBySlug(current.slug);

    expect(result!.relatedAlbums).toEqual([]);
  });
});

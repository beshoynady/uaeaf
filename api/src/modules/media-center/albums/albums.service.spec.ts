import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ALBUM_PAGE_SIZE, AlbumsService } from './albums.service.js';
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

    it('stores championshipName as null when omitted', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, mediaAssetsService);

      await service.create(baseDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ championshipName: null }),
      );
    });

    it('stores the supplied championshipName', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, mediaAssetsService);
      const championshipName = { en: 'UAE Athletics Championship 2026', ar: 'بطولة الإمارات لألعاب القوى 2026' };

      await service.create({ ...baseDto, championshipName });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ championshipName }),
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

  describe('affiliation', () => {
    const id = () => new Types.ObjectId().toString();

    it('stores an unaffiliated album with every affiliation field empty', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, makeMediaAssetsService());

      await service.create(baseDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          championshipId: null, competitionId: null, publicEventId: null,
          athleteIds: [], clubIds: [], eventDate: null, location: null, isFeatured: false,
        }),
      );
    });

    it('stores the full competitive chain', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, makeMediaAssetsService());
      const championshipId = id(); const competitionId = id();

      await service.create({ ...baseDto, championshipId, competitionId });

      const written = repository.create.mock.calls[0][0] as Record<string, Types.ObjectId>;
      expect(written.championshipId.toString()).toBe(championshipId);
      expect(written.competitionId.toString()).toBe(competitionId);
    });

    it('stores athletes and clubs on an album with no occasion', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, makeMediaAssetsService());
      const athleteId = id(); const clubId = id();

      await service.create({ ...baseDto, athleteIds: [athleteId], clubIds: [clubId] });

      const written = repository.create.mock.calls[0][0] as Record<string, Types.ObjectId[]>;
      expect(written.athleteIds.map(String)).toEqual([athleteId]);
      expect(written.clubIds.map(String)).toEqual([clubId]);
    });

    it('accepts a championship on its own, because the season comes from the date', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, makeMediaAssetsService());

      await service.create({ ...baseDto, championshipId: id() });

      expect(repository.create).toHaveBeenCalled();
    });

    it('refuses an incoherent affiliation before writing anything', async () => {
      const repository = makeRepository();
      const service = new AlbumsService(repository, makeMediaAssetsService());

      await expect(
        service.create({ ...baseDto, championshipId: id(), publicEventId: id() }),
      ).rejects.toThrow(/both/i);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses an incoherent affiliation before the cover image is even checked', async () => {
      const repository = makeRepository();
      const mediaAssetsService = makeMediaAssetsService();
      const service = new AlbumsService(repository, mediaAssetsService);

      await expect(
        service.create({ ...baseDto, competitionId: id(), coverImageId: id() }),
      ).rejects.toThrow(/championship/i);

      expect(mediaAssetsService.assertUsableImage).not.toHaveBeenCalled();
    });

    it('stores eventDate and location when supplied', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new AlbumsService(repository, makeMediaAssetsService());
      const location = { en: 'Dubai', ar: 'دبي' };

      await service.create({ ...baseDto, eventDate: '2026-03-14', location });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventDate: new Date('2026-03-14'), location }),
      );
    });
  });

  describe('update', () => {
    const id = () => new Types.ObjectId().toString();

    const makeRepositoryWith = (stored: Record<string, unknown>) =>
      ({
        create: jest.fn(),
        updateById: jest.fn(async () => stored as never),
        findById: jest.fn(async () => stored as never),
      }) as unknown as jest.Mocked<AlbumsRepository>;

    it('checks coherence against the merged album, not the patch alone', async () => {
      // Stored: a full competitive chain. The patch clears the championship
      // and says nothing about the competition — which would leave a
      // competition with no championship above it.
      const stored = { championshipId: new Types.ObjectId(), competitionId: new Types.ObjectId() };
      const repository = makeRepositoryWith(stored);
      const service = new AlbumsService(repository, makeMediaAssetsService());

      await expect(service.update(id(), { championshipId: null })).rejects.toThrow(/championship/i);

      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('accepts clearing a whole branch at once', async () => {
      const stored = { championshipId: new Types.ObjectId(), competitionId: new Types.ObjectId() };
      const repository = makeRepositoryWith(stored);
      const service = new AlbumsService(repository, makeMediaAssetsService());

      await service.update(id(), { championshipId: null, competitionId: null });

      expect(repository.updateById).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ championshipId: null, competitionId: null }),
      );
    });

    it('leaves a field alone when the patch omits it', async () => {
      const championshipId = new Types.ObjectId();
      const repository = makeRepositoryWith({ championshipId, competitionId: null });
      const service = new AlbumsService(repository, makeMediaAssetsService());

      await service.update(id(), { title: { en: 'New', ar: 'جديد' } });

      const patch = repository.updateById.mock.calls[0][1] as Record<string, unknown>;
      expect(patch).not.toHaveProperty('championshipId');
    });

    it('refuses to change the publication state through this route', async () => {
      const repository = makeRepositoryWith({ championshipId: null, competitionId: null });
      const service = new AlbumsService(repository, makeMediaAssetsService());

      await service.update(id(), { title: { en: 'New', ar: 'جديد' } } as never);

      const patch = repository.updateById.mock.calls[0][1] as Record<string, unknown>;
      expect(patch).not.toHaveProperty('publicationState');
      expect(patch).not.toHaveProperty('slug');
    });

    it('throws NotFoundException when the album does not exist', async () => {
      const repository = ({
        create: jest.fn(), updateById: jest.fn(), findById: jest.fn(async () => null),
      }) as unknown as jest.Mocked<AlbumsRepository>;
      const service = new AlbumsService(repository, makeMediaAssetsService());

      await expect(service.update(id(), {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('page size', () => {
    it('defaults to eight, the two rows of four the canvas lays out', () => {
      expect(ALBUM_PAGE_SIZE).toBe(8);
    });

    it('asks the repository for that page size when the caller names none', async () => {
      const repository = ({
        create: jest.fn(), updateById: jest.fn(), findById: jest.fn(),
        findPublicPage: jest.fn(async () => ({ items: [], total: 0 })),
      }) as unknown as jest.Mocked<AlbumsRepository>;
      const service = new AlbumsService(repository, makeMediaAssetsService());

      const result = await service.listPublic({});

      expect(repository.findPublicPage).toHaveBeenCalledWith(expect.anything(), 0, 8, undefined);
      expect(result.limit).toBe(8);
    });

    it('skips a whole page at a time', async () => {
      const repository = ({
        create: jest.fn(), updateById: jest.fn(), findById: jest.fn(),
        findPublicPage: jest.fn(async () => ({ items: [], total: 0 })),
      }) as unknown as jest.Mocked<AlbumsRepository>;
      const service = new AlbumsService(repository, makeMediaAssetsService());

      await service.listPublic({}, 3);

      expect(repository.findPublicPage).toHaveBeenCalledWith(expect.anything(), 16, 8, undefined);
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

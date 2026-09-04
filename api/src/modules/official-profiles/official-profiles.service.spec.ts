import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OfficialProfilesService } from './official-profiles.service.js';
import { OfficialProfilesRepository } from './official-profiles.repository.js';
import { OfficialsService } from '../officials/officials.service.js';
import { MediaAssetsService } from '../media-center/media-assets/media-assets.service.js';

describe('OfficialProfilesService', () => {
  const officialId = new Types.ObjectId().toString();
  const dto = {
    officialId,
    slug: 'john-referee',
    registrationNumber: 'REG-1',
    gender: 'Male' as const,
    status: 'Active' as const,
  };

  const makeRepository = () =>
    ({
      create: jest.fn(),
      findByOfficial: jest.fn(),
      findBySlug: jest.fn(),
    }) as unknown as jest.Mocked<OfficialProfilesRepository>;

  const makeOfficialsService = () =>
    ({ findById: jest.fn(), toPublicResponse: jest.fn() }) as unknown as jest.Mocked<OfficialsService>;

  const makeMediaAssetsService = () =>
    ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>;

  describe('create', () => {
    it('creates a profile for a Local-residency official with no existing profile', async () => {
      const repository = makeRepository();
      const officialsService = makeOfficialsService();
      const mediaAssetsService = makeMediaAssetsService();
      officialsService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByOfficial.mockResolvedValue(null);
      repository.create.mockResolvedValue({ officialId } as never);
      const service = new OfficialProfilesService(repository, officialsService, mediaAssetsService);

      await service.create(dto);

      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('rejects creating a profile for a Guest-residency official', async () => {
      const repository = makeRepository();
      const officialsService = makeOfficialsService();
      const mediaAssetsService = makeMediaAssetsService();
      officialsService.findById.mockResolvedValue({ residencyType: 'Guest' } as never);
      const service = new OfficialProfilesService(repository, officialsService, mediaAssetsService);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects creating a second profile for the same official', async () => {
      const repository = makeRepository();
      const officialsService = makeOfficialsService();
      const mediaAssetsService = makeMediaAssetsService();
      officialsService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByOfficial.mockResolvedValue({ _id: new Types.ObjectId() } as never);
      const service = new OfficialProfilesService(repository, officialsService, mediaAssetsService);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects creating a profile for a non-existent official', async () => {
      const repository = makeRepository();
      const officialsService = makeOfficialsService();
      const mediaAssetsService = makeMediaAssetsService();
      officialsService.findById.mockResolvedValue(null);
      const service = new OfficialProfilesService(repository, officialsService, mediaAssetsService);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates photoId via MediaAssetsService.assertUsableImage before creating', async () => {
      const repository = makeRepository();
      const officialsService = makeOfficialsService();
      const mediaAssetsService = makeMediaAssetsService();
      officialsService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByOfficial.mockResolvedValue(null);
      mediaAssetsService.assertUsableImage.mockRejectedValue(new ConflictException());
      const service = new OfficialProfilesService(repository, officialsService, mediaAssetsService);
      const photoId = new Types.ObjectId().toString();

      await expect(service.create({ ...dto, photoId })).rejects.toThrow(ConflictException);
      expect(mediaAssetsService.assertUsableImage).toHaveBeenCalledWith(photoId);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the repository reports a duplicate slug', async () => {
      const repository = makeRepository();
      const officialsService = makeOfficialsService();
      const mediaAssetsService = makeMediaAssetsService();
      officialsService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByOfficial.mockResolvedValue(null);
      repository.create.mockRejectedValue(Object.assign(new Error('E11000'), { code: 11000, keyValue: { slug: 'john-referee' } }));
      const service = new OfficialProfilesService(repository, officialsService, mediaAssetsService);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when the repository reports a duplicate registrationNumber, via the shared E11000 handler', async () => {
      const repository = makeRepository();
      const officialsService = makeOfficialsService();
      const mediaAssetsService = makeMediaAssetsService();
      officialsService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByOfficial.mockResolvedValue(null);
      repository.create.mockRejectedValue(
        Object.assign(new Error('E11000'), { code: 11000, keyValue: { registrationNumber: 'REG-1' } }),
      );
      const service = new OfficialProfilesService(repository, officialsService, mediaAssetsService);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getPublicBySlug', () => {
    it('resolves slug -> profile -> officialId -> official and returns both public-safe shapes', async () => {
      const repository = makeRepository();
      const officialsService = makeOfficialsService();
      const mediaAssetsService = makeMediaAssetsService();
      const profile = { officialId: new Types.ObjectId(officialId), slug: 'john-referee' };
      repository.findBySlug.mockResolvedValue(profile as never);
      officialsService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      officialsService.toPublicResponse.mockReturnValue({ id: officialId } as never);
      const service = new OfficialProfilesService(repository, officialsService, mediaAssetsService);
      jest.spyOn(service, 'toPublicResponse').mockReturnValue({ slug: 'john-referee' } as never);

      const result = await service.getPublicBySlug('john-referee');

      expect(repository.findBySlug).toHaveBeenCalledWith('john-referee');
      expect(officialsService.findById).toHaveBeenCalledWith(officialId);
      expect(result).toEqual({ profile: { slug: 'john-referee' }, official: { id: officialId } });
    });

    it('returns null when no profile matches the slug', async () => {
      const repository = makeRepository();
      const officialsService = makeOfficialsService();
      const mediaAssetsService = makeMediaAssetsService();
      repository.findBySlug.mockResolvedValue(null);
      const service = new OfficialProfilesService(repository, officialsService, mediaAssetsService);

      await expect(service.getPublicBySlug('unknown')).resolves.toBeNull();
      expect(officialsService.findById).not.toHaveBeenCalled();
    });
  });
});

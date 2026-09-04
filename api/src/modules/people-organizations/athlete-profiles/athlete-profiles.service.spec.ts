import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AthleteProfilesService } from './athlete-profiles.service.js';
import { AthleteProfilesRepository } from './athlete-profiles.repository.js';
import { AthletesService } from '../athletes/athletes.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';

describe('AthleteProfilesService', () => {
  const athleteId = new Types.ObjectId().toString();
  const dto = {
    athleteId,
    slug: 'jane-doe',
    registrationNumber: 'REG-1',
    restricted: {},
    status: 'Active' as const,
  };

  const makeRepository = () =>
    ({
      create: jest.fn(),
      findByAthlete: jest.fn(),
      findBySlug: jest.fn(),
    }) as unknown as jest.Mocked<AthleteProfilesRepository>;

  const makeAthletesService = () =>
    ({ findById: jest.fn(), toPublicResponse: jest.fn() }) as unknown as jest.Mocked<AthletesService>;

  const makeMediaAssetsService = () =>
    ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>;

  describe('create', () => {
    it('creates a profile for a Local-residency athlete with no existing profile', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      athletesService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByAthlete.mockResolvedValue(null);
      repository.create.mockResolvedValue({ athleteId } as never);
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);

      await service.create(dto);

      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('rejects creating a profile for a Guest-residency athlete', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      athletesService.findById.mockResolvedValue({ residencyType: 'Guest' } as never);
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects creating a second profile for the same athlete', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      athletesService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByAthlete.mockResolvedValue({ _id: new Types.ObjectId() } as never);
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects creating a profile for a non-existent athlete', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      athletesService.findById.mockResolvedValue(null);
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates photoId via MediaAssetsService.assertUsableImage before creating', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      athletesService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByAthlete.mockResolvedValue(null);
      mediaAssetsService.assertUsableImage.mockRejectedValue(new NotFoundException());
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);
      const photoId = new Types.ObjectId().toString();

      await expect(service.create({ ...dto, photoId })).rejects.toThrow(NotFoundException);
      expect(mediaAssetsService.assertUsableImage).toHaveBeenCalledWith(photoId);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a socialLinks entry with an unsupported platform', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      athletesService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByAthlete.mockResolvedValue(null);
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);

      await expect(
        service.create({ ...dto, socialLinks: [{ platform: 'Snapchat', url: 'https://snapchat.com/x' }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-https socialLinks URL', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      athletesService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByAthlete.mockResolvedValue(null);
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);

      await expect(
        service.create({ ...dto, socialLinks: [{ platform: 'Instagram', url: 'javascript:alert(1)' }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dedupes socialLinks by platform, keeping the first occurrence', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      athletesService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByAthlete.mockResolvedValue(null);
      repository.create.mockResolvedValue({} as never);
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);

      await service.create({
        ...dto,
        socialLinks: [
          { platform: 'Instagram', url: 'https://instagram.com/first' },
          { platform: 'Instagram', url: 'https://instagram.com/second' },
        ],
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ socialLinks: [{ platform: 'Instagram', url: 'https://instagram.com/first' }] }),
      );
    });

    it('throws ConflictException when the repository reports a duplicate key', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      athletesService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      repository.findByAthlete.mockResolvedValue(null);
      repository.create.mockRejectedValue(
        Object.assign(new Error('E11000'), { code: 11000, keyValue: { registrationNumber: 'REG-1' } }),
      );
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getPublicBySlug', () => {
    it('resolves slug -> profile -> athleteId -> athlete and returns both public-safe shapes', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      const profile = { athleteId: new Types.ObjectId(athleteId), slug: 'jane-doe' };
      repository.findBySlug.mockResolvedValue(profile as never);
      athletesService.findById.mockResolvedValue({ residencyType: 'Local' } as never);
      athletesService.toPublicResponse.mockReturnValue({ id: athleteId } as never);
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);
      jest.spyOn(service, 'toPublicResponse').mockReturnValue({ slug: 'jane-doe' } as never);

      const result = await service.getPublicBySlug('jane-doe');

      expect(repository.findBySlug).toHaveBeenCalledWith('jane-doe');
      expect(athletesService.findById).toHaveBeenCalledWith(athleteId);
      expect(result).toEqual({ profile: { slug: 'jane-doe' }, athlete: { id: athleteId } });
    });

    it('returns null when no profile matches the slug', async () => {
      const repository = makeRepository();
      const athletesService = makeAthletesService();
      const mediaAssetsService = makeMediaAssetsService();
      repository.findBySlug.mockResolvedValue(null);
      const service = new AthleteProfilesService(repository, athletesService, mediaAssetsService);

      await expect(service.getPublicBySlug('unknown')).resolves.toBeNull();
      expect(athletesService.findById).not.toHaveBeenCalled();
    });
  });
});

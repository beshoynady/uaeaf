import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RevisionsService } from './revisions.service.js';
import { RevisionsRepository } from './revisions.repository.js';

describe('RevisionsService', () => {
  const entityType = 'articles' as const;
  const entityId = new Types.ObjectId();
  const createdBy = new Types.ObjectId();

  const makeRepository = () =>
    ({
      create: jest.fn(),
      findById: jest.fn(),
      findLatest: jest.fn(),
      countForEntity: jest.fn(),
    }) as unknown as jest.Mocked<RevisionsRepository>;

  describe('create', () => {
    it('starts versionNumber at 1 when no prior revision exists for the entity', async () => {
      const repository = makeRepository();
      repository.findLatest.mockResolvedValue(null);
      repository.create.mockResolvedValue({ _id: new Types.ObjectId(), versionNumber: 1 } as never);
      const service = new RevisionsService(repository);

      await service.create({ entityType, entityId, snapshotData: { title: 'v1' }, createdBy });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ versionNumber: 1, snapshotData: { title: 'v1' } }),
      );
    });

    it('increments versionNumber from the latest existing revision', async () => {
      const repository = makeRepository();
      repository.findLatest.mockResolvedValue({ versionNumber: 3 } as never);
      repository.create.mockResolvedValue({ _id: new Types.ObjectId(), versionNumber: 4 } as never);
      const service = new RevisionsService(repository);

      await service.create({ entityType, entityId, snapshotData: { title: 'v4' }, createdBy });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ versionNumber: 4 }));
    });
  });

  describe('assertHardDeletable', () => {
    it('passes when the entity has zero revisions', async () => {
      const repository = makeRepository();
      repository.countForEntity.mockResolvedValue(0);
      const service = new RevisionsService(repository);

      await expect(service.assertHardDeletable(entityType, entityId)).resolves.toBeUndefined();
    });

    it('throws when the entity has at least one revision, even just one', async () => {
      const repository = makeRepository();
      repository.countForEntity.mockResolvedValue(1);
      const service = new RevisionsService(repository);

      await expect(service.assertHardDeletable(entityType, entityId)).rejects.toThrow(ForbiddenException);
    });
  });
});

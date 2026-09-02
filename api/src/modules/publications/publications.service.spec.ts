import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PublicationsService } from './publications.service.js';
import { PublicationsRepository } from './publications.repository.js';
import { RevisionsService } from '../revisions/revisions.service.js';

describe('PublicationsService', () => {
  const entityType = 'articles' as const;
  const entityId = new Types.ObjectId();
  const revisionId = new Types.ObjectId();
  const publishedBy = new Types.ObjectId();
  const publicationId = new Types.ObjectId().toString();

  const makeRepository = () =>
    ({
      create: jest.fn(),
      findById: jest.fn(),
      updateStatusIf: jest.fn(),
      findLive: jest.fn(),
      createLive: jest.fn(),
    }) as unknown as jest.Mocked<PublicationsRepository>;

  const makeRevisionsService = () =>
    ({ findById: jest.fn() }) as unknown as jest.Mocked<RevisionsService>;

  describe('publish', () => {
    it('creates a Live publications row via createLive(), which retires any prior Live row', async () => {
      const repository = makeRepository();
      repository.createLive.mockResolvedValue({ _id: new Types.ObjectId() } as never);
      const service = new PublicationsService(repository, makeRevisionsService());

      await service.publish({ entityType, entityId, revisionId, workflowInstanceId: null, publishedBy });

      expect(repository.createLive).toHaveBeenCalledWith(
        expect.objectContaining({ entityType, entityId, revisionId, publishedBy }),
      );
    });
  });

  describe('unpublish', () => {
    it('flips a Live publication to Unpublished — a simple, reversible status change', async () => {
      const repository = makeRepository();
      repository.updateStatusIf.mockResolvedValue({ status: 'Unpublished' } as never);
      const service = new PublicationsService(repository, makeRevisionsService());

      await service.unpublish(publicationId);

      expect(repository.updateStatusIf).toHaveBeenCalledWith(publicationId, 'Live', 'Unpublished');
    });

    it('rejects unpublishing a publication that is not currently Live (including a missing one)', async () => {
      const repository = makeRepository();
      repository.updateStatusIf.mockResolvedValue(null);
      const service = new PublicationsService(repository, makeRevisionsService());

      await expect(service.unpublish(publicationId)).rejects.toThrow(ConflictException);
    });
  });

  describe('archive', () => {
    it('archives a Live publication — permanent, distinct from unpublish', async () => {
      const repository = makeRepository();
      repository.updateStatusIf.mockResolvedValue({ status: 'Archived' } as never);
      const service = new PublicationsService(repository, makeRevisionsService());

      await service.archive(publicationId);

      expect(repository.updateStatusIf).toHaveBeenCalledWith(publicationId, { $ne: 'Archived' }, 'Archived');
    });

    it('archives an Unpublished publication too', async () => {
      const repository = makeRepository();
      repository.updateStatusIf.mockResolvedValue({ status: 'Archived' } as never);
      const service = new PublicationsService(repository, makeRevisionsService());

      await service.archive(publicationId);

      expect(repository.updateStatusIf).toHaveBeenCalledWith(publicationId, { $ne: 'Archived' }, 'Archived');
    });

    it('rejects archiving a publication that is already Archived', async () => {
      const repository = makeRepository();
      repository.updateStatusIf.mockResolvedValue(null);
      repository.findById.mockResolvedValue({ _id: publicationId, status: 'Archived' } as never);
      const service = new PublicationsService(repository, makeRevisionsService());

      await expect(service.archive(publicationId)).rejects.toThrow(ConflictException);
    });

    it('returns null (no throw) when archiving a publication that does not exist', async () => {
      const repository = makeRepository();
      repository.updateStatusIf.mockResolvedValue(null);
      repository.findById.mockResolvedValue(null);
      const service = new PublicationsService(repository, makeRevisionsService());

      await expect(service.archive(publicationId)).resolves.toBeNull();
    });
  });

  describe('getPublicSnapshot', () => {
    it('resolves the Live publication\'s linked revision snapshotData — the sole public read path', async () => {
      const repository = makeRepository();
      repository.findLive.mockResolvedValue({ revisionId } as never);
      const revisionsService = makeRevisionsService();
      revisionsService.findById.mockResolvedValue({ snapshotData: { title: 'Live title' } } as never);
      const service = new PublicationsService(repository, revisionsService);

      const result = await service.getPublicSnapshot(entityType, entityId);

      expect(result).toEqual({ title: 'Live title' });
    });

    it('returns null when the entity has no Live publication', async () => {
      const repository = makeRepository();
      repository.findLive.mockResolvedValue(null);
      const service = new PublicationsService(repository, makeRevisionsService());

      await expect(service.getPublicSnapshot(entityType, entityId)).resolves.toBeNull();
    });
  });
});

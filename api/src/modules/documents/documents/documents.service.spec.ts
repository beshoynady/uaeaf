import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { DocumentsService } from './documents.service.js';
import { DocumentsRepository } from './documents.repository.js';
import { PublicationsService } from '../publications/publications.service.js';
import { RevisionsService } from '../revisions/revisions.service.js';

describe('DocumentsService', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      softDelete: jest.fn(),
    }) as unknown as jest.Mocked<DocumentsRepository>;

  const makePublicationsService = () =>
    ({ getPublicSnapshot: jest.fn() }) as unknown as jest.Mocked<PublicationsService>;

  const makeRevisionsService = () =>
    ({ assertHardDeletable: jest.fn() }) as unknown as jest.Mocked<RevisionsService>;

  describe('mode (b): generic attachment', () => {
    it('findByOwner() queries the repository scoped to the given owner, not the Workflow engine', async () => {
      const repository = makeRepository();
      const publicationsService = makePublicationsService();
      const revisionsService = makeRevisionsService();
      const ownerId = new Types.ObjectId().toString();
      repository.findByOwner.mockResolvedValue([{ ownerType: 'Club' }] as never);
      const service = new DocumentsService(repository, publicationsService, revisionsService);

      const result = await service.findByOwner('Club', ownerId);

      expect(repository.findByOwner).toHaveBeenCalledWith('Club', expect.any(Types.ObjectId));
      expect(publicationsService.getPublicSnapshot).not.toHaveBeenCalled();
      expect(result).toEqual([{ ownerType: 'Club' }]);
    });
  });

  describe('mode (a): standalone Workflow-tracked lifecycle', () => {
    it('getPublicSnapshot() delegates to PublicationsService with entityType="documents"', async () => {
      const repository = makeRepository();
      const publicationsService = makePublicationsService();
      const revisionsService = makeRevisionsService();
      const id = new Types.ObjectId().toString();
      publicationsService.getPublicSnapshot.mockResolvedValue({ title: 'Live doc' });
      const service = new DocumentsService(repository, publicationsService, revisionsService);

      const result = await service.getPublicSnapshot(id);

      expect(publicationsService.getPublicSnapshot).toHaveBeenCalledWith('documents', expect.any(Types.ObjectId));
      expect(repository.findByOwner).not.toHaveBeenCalled();
      expect(result).toEqual({ title: 'Live doc' });
    });

    it('assertHardDeletable() delegates to RevisionsService with entityType="documents"', async () => {
      const repository = makeRepository();
      const publicationsService = makePublicationsService();
      const revisionsService = makeRevisionsService();
      const id = new Types.ObjectId().toString();
      revisionsService.assertHardDeletable.mockResolvedValue(undefined);
      const service = new DocumentsService(repository, publicationsService, revisionsService);

      await service.assertHardDeletable(id);

      expect(revisionsService.assertHardDeletable).toHaveBeenCalledWith('documents', expect.any(Types.ObjectId));
    });
  });
});

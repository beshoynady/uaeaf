import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { CommitteesService } from './committees.service.js';
import { CommitteesRepository } from './committees.repository.js';
import { PublicationsService } from '../publications/publications.service.js';
import { RevisionsService } from '../revisions/revisions.service.js';

describe('CommitteesService (workflow wiring)', () => {
  const makeRepository = () =>
    ({ create: jest.fn(), find: jest.fn() }) as unknown as jest.Mocked<CommitteesRepository>;
  const makePublications = () =>
    ({ getPublicSnapshot: jest.fn() }) as unknown as jest.Mocked<PublicationsService>;
  const makeRevisions = () =>
    ({ assertHardDeletable: jest.fn() }) as unknown as jest.Mocked<RevisionsService>;

  it('reads the public view through publications under its own entityType, not the raw row', async () => {
    const repository = makeRepository();
    const publications = makePublications();
    const revisions = makeRevisions();
    publications.getPublicSnapshot.mockResolvedValue({ name: 'snapshot' } as never);
    const service = new CommitteesService(repository, publications, revisions);
    const id = new Types.ObjectId().toString();

    const result = await service.getPublicSnapshot(id);

    expect(publications.getPublicSnapshot).toHaveBeenCalledWith('committees', expect.any(Types.ObjectId));
    expect(result).toEqual({ name: 'snapshot' });
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('delegates the HardDelete gate to RevisionsService under its own entityType', async () => {
    const publications = makePublications();
    const revisions = makeRevisions();
    const service = new CommitteesService(makeRepository(), publications, revisions);

    await service.assertHardDeletable(new Types.ObjectId().toString());

    expect(revisions.assertHardDeletable).toHaveBeenCalledWith('committees', expect.any(Types.ObjectId));
  });

  it('stores isActive as given and never derives it from publicationState', async () => {
    const repository = makeRepository();
    repository.create.mockResolvedValue({} as never);
    const service = new CommitteesService(repository, makePublications(), makeRevisions());

    // Archived publicationState with isActive left true — the board's FIELD
    // PRECEDENCE RULE says the two are independent and never auto-synced.
    await service.create({
      name: { en: 'Technical Committee', ar: 'اللجنة الفنية' },
      description: { en: 'desc', ar: 'وصف' },
      displayOrder: 1,
      isActive: true,
      committeeType: 'Technical',
      committeeGroup: 'Leadership',
      publicationState: 'Archived',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true, publicationState: 'Archived' }),
    );
  });
});

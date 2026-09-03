import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrganizationalStructureNodesService } from './organizational-structure.service.js';
import { OrganizationalStructureNodesRepository } from './organizational-structure.repository.js';
import { PublicationsService } from '../publications/publications.service.js';
import { RevisionsService } from '../revisions/revisions.service.js';

describe('OrganizationalStructureNodesService', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
    }) as unknown as jest.Mocked<OrganizationalStructureNodesRepository>;
  const makePublications = () =>
    ({ getPublicSnapshot: jest.fn() }) as unknown as jest.Mocked<PublicationsService>;
  const makeRevisions = () =>
    ({ assertHardDeletable: jest.fn() }) as unknown as jest.Mocked<RevisionsService>;

  const build = (repository: jest.Mocked<OrganizationalStructureNodesRepository>) =>
    new OrganizationalStructureNodesService(repository, makePublications(), makeRevisions());

  /** a -> b -> c (c is the deepest child). */
  const a = new Types.ObjectId();
  const b = new Types.ObjectId();
  const c = new Types.ObjectId();
  const tree: Record<string, { _id: Types.ObjectId; parentNodeId: Types.ObjectId | null }> = {
    [a.toString()]: { _id: a, parentNodeId: null },
    [b.toString()]: { _id: b, parentNodeId: a },
    [c.toString()]: { _id: c, parentNodeId: b },
  };

  describe('setParent', () => {
    it('rejects making a node its own parent', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(tree[a.toString()] as never);
      const service = build(repository);

      await expect(
        service.setParent(a.toString(), { parentNodeId: a.toString() }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('rejects a move that would create a cycle (parent under its own descendant)', async () => {
      const repository = makeRepository();
      repository.findById.mockImplementation(async (id: string) => (tree[id] ?? null) as never);
      const service = build(repository);

      // Moving `a` under `c` would close the loop a -> b -> c -> a.
      await expect(
        service.setParent(a.toString(), { parentNodeId: c.toString() }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('allows a legitimate re-parent that does not close a loop', async () => {
      const repository = makeRepository();
      repository.findById.mockImplementation(async (id: string) => (tree[id] ?? null) as never);
      repository.updateById.mockResolvedValue({} as never);
      const service = build(repository);

      // Moving `c` under `a` is a normal promotion, not a cycle.
      await service.setParent(c.toString(), { parentNodeId: a.toString() });

      expect(repository.updateById).toHaveBeenCalledWith(c.toString(), {
        parentNodeId: expect.any(Types.ObjectId),
      });
    });

    it('detaches to root when no parent is given', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(tree[c.toString()] as never);
      repository.updateById.mockResolvedValue({} as never);
      const service = build(repository);

      await service.setParent(c.toString(), {});

      expect(repository.updateById).toHaveBeenCalledWith(c.toString(), { parentNodeId: null });
    });

    it('throws NotFoundException when the node does not exist', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(null);
      const service = build(repository);

      await expect(service.setParent(a.toString(), {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('rejects a parentNodeId that does not exist', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(null);
      const service = build(repository);

      await expect(
        service.create({
          title: { en: 'Node', ar: 'عقدة' },
          parentNodeId: new Types.ObjectId().toString(),
          displayOrder: 1,
          nodeType: 'Department',
          publicationState: 'Draft',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });
});

import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommitteeHierarchyService } from './committee-hierarchy.service.js';
import { CommitteesRepository } from './committees.repository.js';

const id = () => new Types.ObjectId().toString();
const makeRepository = () => ({ findById: jest.fn() }) as unknown as jest.Mocked<CommitteesRepository>;

describe('CommitteeHierarchyService.assertPlacementAllowed', () => {
  it('refuses a standing committee that carries a parent', async () => {
    const parent = id();
    const repository = makeRepository();
    // A real, walkable parent record — so a deleted standing-check branch
    // would fall through to a resolve, not coincidentally fail for the
    // unrelated reason "parent missing".
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(parent),
      kind: 'standing',
      parentCommitteeId: null,
      archivedAt: null,
    } as never);
    const service = new CommitteeHierarchyService(repository);
    const attempt = () => service.assertPlacementAllowed({ id: id(), kind: 'standing', parentCommitteeId: parent });

    await expect(attempt()).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt()).rejects.toThrow('A standing committee cannot follow another committee.');
  });

  it('accepts a standing committee with no parent', async () => {
    const service = new CommitteeHierarchyService(makeRepository());

    await expect(
      service.assertPlacementAllowed({ id: id(), kind: 'standing', parentCommitteeId: null }),
    ).resolves.toBeUndefined();
  });

  it('refuses a committee that is its own parent', async () => {
    const self = id();
    const repository = makeRepository();
    // A real record under `self` — so a deleted direct self-parent check
    // would fall through to the cycle branch (a different message) rather
    // than coincidentally failing on "parent missing" for lack of a stub.
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(self),
      kind: 'sub',
      parentCommitteeId: null,
      archivedAt: null,
    } as never);
    const service = new CommitteeHierarchyService(repository);
    const attempt = () => service.assertPlacementAllowed({ id: self, kind: 'sub', parentCommitteeId: self });

    await expect(attempt()).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt()).rejects.toThrow('A committee cannot follow itself.');
  });

  it('refuses a cycle formed at depth, not just one level up', async () => {
    // C is being pointed at A, while A already descends through B to C.
    const [a, b, c] = [id(), id(), id()];
    const repository = makeRepository();
    // Every id the walk visits — including `c`, the one the earlier version
    // of this test left unstubbed — gets a real record, so the walk reaches
    // the cycle check instead of failing one step early on "parent missing".
    repository.findById.mockImplementation(async (lookup: string) => {
      if (lookup === a) return { _id: new Types.ObjectId(a), kind: 'sub', parentCommitteeId: new Types.ObjectId(b), archivedAt: null } as never;
      if (lookup === b) return { _id: new Types.ObjectId(b), kind: 'sub', parentCommitteeId: new Types.ObjectId(c), archivedAt: null } as never;
      if (lookup === c) return { _id: new Types.ObjectId(c), kind: 'sub', parentCommitteeId: null, archivedAt: null } as never;
      return null;
    });
    const service = new CommitteeHierarchyService(repository);
    const attempt = () => service.assertPlacementAllowed({ id: c, kind: 'sub', parentCommitteeId: a });

    await expect(attempt()).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt()).rejects.toThrow('That parent already follows this committee.');
  });

  it('refuses a parent archived between form load and save', async () => {
    const repository = makeRepository();
    // `findById` scopes to archivedAt: null, so an archived parent reads as absent
    // at the moment of the write — which is the moment that decides (CLAUDE.md §31).
    repository.findById.mockResolvedValue(null as never);
    const service = new CommitteeHierarchyService(repository);
    const attempt = () => service.assertPlacementAllowed({ id: id(), kind: 'sub', parentCommitteeId: id() });

    await expect(attempt()).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt()).rejects.toThrow('That parent committee no longer exists.');
  });

  it('accepts a sub-committee with no parent, which follows the board directly', async () => {
    const service = new CommitteeHierarchyService(makeRepository());

    await expect(
      service.assertPlacementAllowed({ id: id(), kind: 'sub', parentCommitteeId: null }),
    ).resolves.toBeUndefined();
  });

  it('stops walking after the depth limit rather than looping forever on corrupt data', async () => {
    const repository = makeRepository();
    const loop = new Types.ObjectId();
    repository.findById.mockResolvedValue({ _id: loop, kind: 'sub', parentCommitteeId: loop, archivedAt: null } as never);
    const service = new CommitteeHierarchyService(repository);

    await expect(
      service.assertPlacementAllowed({ id: id(), kind: 'sub', parentCommitteeId: loop.toString() }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CommitteesRepository } from './committees.repository.js';
import type { CommitteeKind } from './schemas/committees.schema.js';

/** Depth beyond which the parent chain is treated as corrupt rather than
 *  walked further. Higher than any real committee tree. */
const MAX_DEPTH = 32;

/** The one place a committee's classification and parent are judged. Every
 *  write goes through it, so a bad shape cannot reach the collection even
 *  when the dashboard's own checks are bypassed. */
@Injectable()
export class CommitteeHierarchyService {
  constructor(private readonly repository: CommitteesRepository) {}

  /**
   * @throws BadRequestException standing-with-parent, self-parent, a cycle,
   * or a missing/archived parent.
   * @throws ConflictException the chain exceeds MAX_DEPTH.
   */
  assertPlacementAllowed = async (input: {
    id: string | null;
    kind: CommitteeKind | null;
    parentCommitteeId: string | null;
  }): Promise<void> => {
    const { id, kind, parentCommitteeId } = input;

    if (kind === 'standing' && parentCommitteeId) {
      throw new BadRequestException('A standing committee cannot follow another committee.');
    }
    if (!parentCommitteeId) return;
    if (id && parentCommitteeId === id) {
      throw new BadRequestException('A committee cannot follow itself.');
    }

    // Walked at the write, not at form load: the parent can be archived in
    // between, and `findById` scopes to live rows (CLAUDE.md §31).
    let cursor: string | null = parentCommitteeId;
    for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
      if (!cursor) return;
      const parent = await this.repository.findById(cursor);
      if (!parent) {
        throw new BadRequestException('That parent committee no longer exists.');
      }
      if (id && parent._id.toString() === id) {
        throw new BadRequestException('That parent already follows this committee.');
      }
      cursor = parent.parentCommitteeId ? parent.parentCommitteeId.toString() : null;
    }
    throw new ConflictException('The committee hierarchy is too deep to verify.');
  };
}

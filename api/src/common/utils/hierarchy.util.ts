import { BadRequestException } from '@nestjs/common';

/** Depth guard for the ancestor walk. Real federation org charts and
 *  navigation menus are a handful of levels deep; this exists only so a
 *  pre-existing corrupt cycle in stored data can never spin forever. */
export const MAX_HIERARCHY_DEPTH = 100;

/**
 * Rejects a re-parent that would close a loop in a self-referencing tree.
 *
 * Mongoose enforces nothing about cycles on a self-reference, so every
 * collection with a `parent*Id` must check this in its service layer
 * (confirmed decision #2 for `organizationalStructure`; the same hazard
 * applies to `navigationItems.parentItemId`). Shared here rather than
 * written twice.
 *
 * Walks up from `candidateParentId` via `parentOf`; if `nodeId` appears
 * anywhere in that ancestor chain, the move is a cycle.
 *
 * @param parentOf resolves a node id to its parent id, or `null` for a root
 * node / a node that no longer exists.
 * @throws BadRequestException when the move would create a cycle.
 */
export async function assertNotDescendant(
  nodeId: string,
  candidateParentId: string,
  parentOf: (id: string) => Promise<string | null>,
  entityLabel: string,
): Promise<void> {
  let cursor: string | null = candidateParentId;

  for (let depth = 0; cursor && depth < MAX_HIERARCHY_DEPTH; depth += 1) {
    const parentId: string | null = await parentOf(cursor);
    if (parentId === null) {
      return;
    }
    if (parentId === nodeId) {
      throw new BadRequestException(
        `${entityLabel} ${nodeId} cannot be moved under ${candidateParentId}: that would create a cycle.`,
      );
    }
    cursor = parentId;
  }
}

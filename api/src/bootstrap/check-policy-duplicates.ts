import type { Connection } from 'mongoose';
import { openDatabase } from './dev-database.js';

/**
 * The read-only check that must pass before `workflowPolicies` gains its
 * unique `{entityType, operation}` index (ADR-0069 D4, audit finding H4).
 *
 * The index is partial on `archivedAt: null`, so only live rows can collide.
 * Building it while two live rows share a pair fails the build and leaves
 * the collection without the guarantee — which is the good outcome, but an
 * opaque one to discover during a deploy. This finds it first, and names the
 * rows so a human decides which one is the policy.
 *
 * Writes nothing, ever. Which of two contradictory policies is the real one
 * is not a question a script can answer.
 */
export interface PolicyDuplicateGroup {
  entityType: string;
  operation: string;
  count: number;
  ids: string[];
  /** Enough of each row to tell them apart without a second query. */
  rows: {
    id: string;
    workflowRequired: boolean;
    workflowDefinitionId: string | null;
    updatedAt: Date | null;
  }[];
}

/** The aggregation this check runs, as the deployment checklist prints it. */
export const POLICY_DUPLICATE_PIPELINE = [
  { $match: { archivedAt: null } },
  {
    $group: {
      _id: { entityType: '$entityType', operation: '$operation' },
      count: { $sum: 1 },
      ids: { $push: '$_id' },
      rows: {
        $push: {
          id: '$_id',
          workflowRequired: '$workflowRequired',
          workflowDefinitionId: '$workflowDefinitionId',
          updatedAt: '$updatedAt',
        },
      },
    },
  },
  { $match: { count: { $gt: 1 } } },
  { $sort: { '_id.entityType': 1, '_id.operation': 1 } },
] as const;

interface RawGroup {
  _id: { entityType: string; operation: string };
  count: number;
  ids: unknown[];
  rows: {
    id: unknown;
    workflowRequired: boolean;
    workflowDefinitionId: unknown;
    updatedAt: Date | null;
  }[];
}

/** Every (entityType, operation) pair carried by more than one live policy. */
export async function findPolicyDuplicates(
  connection: Connection,
): Promise<PolicyDuplicateGroup[]> {
  const db = await openDatabase(connection);
  const groups = await db
    .collection('workflowPolicies')
    .aggregate<RawGroup>([...POLICY_DUPLICATE_PIPELINE])
    .toArray();

  return groups.map((group) => ({
    entityType: group._id.entityType,
    operation: group._id.operation,
    count: group.count,
    ids: group.ids.map(String),
    rows: group.rows.map((row) => ({
      id: String(row.id),
      workflowRequired: row.workflowRequired,
      workflowDefinitionId: row.workflowDefinitionId ? String(row.workflowDefinitionId) : null,
      updatedAt: row.updatedAt ?? null,
    })),
  }));
}

/**
 * The indexes currently on the collection, so the report can say whether the
 * superseded non-unique one is still there.
 *
 * Mongoose does not drop a redefined index: adding `unique` to an existing
 * `index()` call creates a second index beside the first and leaves the
 * original enforcing nothing. The old one has to go explicitly.
 */
export async function findPolicyIndexes(
  connection: Connection,
): Promise<{ name: string; key: Record<string, unknown>; unique: boolean; partial: boolean }[]> {
  const db = await openDatabase(connection);
  const indexes = await db.collection('workflowPolicies').indexes();

  return indexes.map((index) => ({
    name: String(index.name),
    key: index.key as Record<string, unknown>,
    unique: index.unique === true,
    partial: index.partialFilterExpression !== undefined,
  }));
}

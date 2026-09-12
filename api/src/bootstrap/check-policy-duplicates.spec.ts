import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectTestDatabase, disconnectTestDatabase } from '../../test/utils/mongo-memory-server.js';
import { findPolicyDuplicates, findPolicyIndexes } from './check-policy-duplicates.js';

/**
 * The gate in front of the unique `{entityType, operation}` index
 * (ADR-0069 D4, audit finding H4).
 *
 * The index is partial on `archivedAt: null`, so the check must agree with
 * it about what a collision is: two LIVE rows. An archived row beside a live
 * one is not a duplicate, and reporting it as one would send someone hunting
 * a problem the index does not have.
 */
describe('workflowPolicies duplicate check', () => {
  let server: MongoMemoryServer;

  const raw = () => mongoose.connection.db!.collection('workflowPolicies');

  const policy = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(),
    entityType: 'presidentMessagePage',
    operation: 'Edit',
    workflowRequired: true,
    workflowDefinitionId: new Types.ObjectId(),
    allowHardDelete: false,
    archivedAt: null,
    updatedAt: new Date('2026-09-12T00:00:00Z'),
    ...overrides,
  });

  beforeAll(async () => {
    server = await connectTestDatabase();
  });

  // Dropped rather than emptied: this spec writes through the raw driver and
  // registers no model, so `clearTestDatabase` does not see the collection at
  // all — and the index test leaves an index behind that must go with it.
  beforeEach(async () => {
    await mongoose.connection.db!.dropCollection('workflowPolicies').catch(() => undefined);
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('reports nothing when every live pair is unique', async () => {
    await raw().insertMany([
      policy({ operation: 'Edit' }),
      policy({ operation: 'Add' }),
      policy({ entityType: 'articles', operation: 'Edit' }),
    ]);

    expect(await findPolicyDuplicates(mongoose.connection)).toEqual([]);
  });

  it('reports a pair carried by two live rows, with enough of each to tell them apart', async () => {
    const keep = policy({ workflowRequired: true });
    const other = policy({ workflowRequired: false, workflowDefinitionId: null });
    await raw().insertMany([keep, other]);

    const duplicates = await findPolicyDuplicates(mongoose.connection);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].entityType).toBe('presidentMessagePage');
    expect(duplicates[0].operation).toBe('Edit');
    expect(duplicates[0].count).toBe(2);
    expect(duplicates[0].ids.sort()).toEqual([keep._id.toString(), other._id.toString()].sort());
    expect(duplicates[0].rows.map((row) => row.workflowRequired).sort()).toEqual([false, true]);
  });

  it('does not count an archived row against a live one — the index is partial', async () => {
    await raw().insertMany([
      policy(),
      policy({ archivedAt: new Date('2026-09-01T00:00:00Z') }),
    ]);

    expect(await findPolicyDuplicates(mongoose.connection)).toEqual([]);
  });

  it('counts three live rows for one pair as one group of three', async () => {
    await raw().insertMany([policy(), policy(), policy()]);

    const duplicates = await findPolicyDuplicates(mongoose.connection);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].count).toBe(3);
  });

  it('reports whether the superseded non-unique index is still present', async () => {
    await raw().insertOne(policy());
    await raw().createIndex({ entityType: 1, operation: 1 }, { name: 'entityType_1_operation_1' });

    const indexes = await findPolicyIndexes(mongoose.connection);
    const pair = indexes.find((index) => index.name === 'entityType_1_operation_1');

    expect(pair).toBeDefined();
    expect(pair!.unique).toBe(false);
    expect(pair!.partial).toBe(false);
  });

  it('writes nothing', async () => {
    await raw().insertMany([policy(), policy()]);
    const before = await raw().find({}).toArray();

    await findPolicyDuplicates(mongoose.connection);

    expect(await raw().find({}).toArray()).toEqual(before);
  });
});

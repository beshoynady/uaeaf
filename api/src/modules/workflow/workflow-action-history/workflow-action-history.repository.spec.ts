import { Model, Types } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { WorkflowActionHistorySchema } from './schemas/workflow-action-history.schema.js';
import type { WorkflowAction, WorkflowActionHistoryDocument } from './schemas/workflow-action-history.schema.js';
import { WorkflowActionHistoryRepository } from './workflow-action-history.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';

/**
 * A step's threshold counts approvals of the text now under review. Each
 * submission or resubmission starts a new cycle: an approval given before a
 * rejection or a return approved a text the author has since replaced or been
 * told to change, so it does not count toward the one that followed.
 */
describe('WorkflowActionHistoryRepository.countDistinctApprovers', () => {
  let server: MongoMemoryServer;
  let model: Model<WorkflowActionHistoryDocument>;
  let repository: WorkflowActionHistoryRepository;

  const instanceId = new Types.ObjectId();
  const stepA = new Types.ObjectId();
  const stepB = new Types.ObjectId();
  const [a, b, c] = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
  const firstRevision = new Types.ObjectId();
  const secondRevision = new Types.ObjectId();

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<WorkflowActionHistoryDocument>('WorkflowActionHistory', WorkflowActionHistorySchema);
    await model.ensureIndexes();
    repository = new WorkflowActionHistoryRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  /** Writes the actions in order, one second apart, so their order never
   *  depends on two writes landing in the same millisecond. */
  const history = async (
    rows: Array<{ action: WorkflowAction; actor: Types.ObjectId; step: Types.ObjectId; revision: Types.ObjectId }>,
  ) => {
    const start = Date.UTC(2026, 8, 11, 9, 0, 0);
    for (const [index, row] of rows.entries()) {
      await model.create({
        workflowInstanceId: instanceId,
        workflowStepId: row.step,
        actorId: row.actor,
        action: row.action,
        revisionId: row.revision,
        actionDate: new Date(start + index * 1000),
      });
    }
  };

  it('counts each approver of the step once, and nothing but approvals', async () => {
    await history([
      { action: 'Submitted', actor: c, step: stepA, revision: firstRevision },
      { action: 'Approved', actor: a, step: stepA, revision: firstRevision },
      { action: 'Approved', actor: a, step: stepA, revision: firstRevision },
      { action: 'Approved', actor: b, step: stepA, revision: firstRevision },
      { action: 'Delegated', actor: c, step: stepA, revision: firstRevision },
    ]);

    expect(await repository.countDistinctApprovers(instanceId, stepA)).toBe(2);
  });

  it('does not count an approval given before a rejection', async () => {
    await history([
      { action: 'Submitted', actor: c, step: stepA, revision: firstRevision },
      { action: 'Approved', actor: a, step: stepA, revision: firstRevision },
      { action: 'Rejected', actor: b, step: stepA, revision: firstRevision },
      { action: 'Resubmitted', actor: c, step: stepA, revision: secondRevision },
      { action: 'Approved', actor: c, step: stepA, revision: secondRevision },
    ]);

    expect(await repository.countDistinctApprovers(instanceId, stepA)).toBe(1);
  });

  it('does not count approvals given before a return', async () => {
    await history([
      { action: 'Submitted', actor: c, step: stepA, revision: firstRevision },
      { action: 'Approved', actor: a, step: stepA, revision: firstRevision },
      { action: 'Approved', actor: b, step: stepA, revision: firstRevision },
      { action: 'Returned', actor: c, step: stepB, revision: firstRevision },
      { action: 'Resubmitted', actor: c, step: stepA, revision: secondRevision },
      { action: 'Approved', actor: c, step: stepA, revision: secondRevision },
    ]);

    expect(await repository.countDistinctApprovers(instanceId, stepA)).toBe(1);
  });

  it('does not count approvals given before a resubmission of the same revision', async () => {
    await history([
      { action: 'Submitted', actor: c, step: stepA, revision: firstRevision },
      { action: 'Approved', actor: a, step: stepA, revision: firstRevision },
      { action: 'Rejected', actor: b, step: stepA, revision: firstRevision },
      { action: 'Resubmitted', actor: c, step: stepA, revision: firstRevision },
    ]);

    expect(await repository.countDistinctApprovers(instanceId, stepA)).toBe(0);
  });
});

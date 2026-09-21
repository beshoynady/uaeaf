import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { WorkflowInstancesService } from './workflow-instances.service.js';
import { WorkflowInstancesRepository } from './workflow-instances.repository.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import { WorkflowActionHistoryService } from '../workflow-action-history/workflow-action-history.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { RevisionsService } from '../revisions/revisions.service.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';

/**
 * "What is waiting for ME" — the question the review screen is built around.
 *
 * It is not "what is under review": a reviewer who opens a queue expecting
 * their own decisions and finds everyone's has been given a worklist they
 * cannot act on. Two rules make it theirs, and the second is the one that is
 * easy to miss — an approval already given does not disappear from a parallel
 * step that still needs more, so without it the reviewer is invited back to
 * press a button that does nothing.
 */
describe('WorkflowInstancesService.findPendingFor', () => {
  const me = new Types.ObjectId();
  const someoneElse = new Types.ObjectId();
  const stepId = new Types.ObjectId();
  const definitionId = new Types.ObjectId();

  const instance = (id: Types.ObjectId) => ({
    _id: id,
    workflowDefinitionId: definitionId,
    entityType: 'articles',
    entityId: new Types.ObjectId(),
    revisionId: new Types.ObjectId(),
    currentStepId: stepId,
    status: 'InProgress',
  });

  const makeDeps = (
    inProgress: ReturnType<typeof instance>[],
    assignees: Types.ObjectId[],
    alreadyApproved: string[] = [],
  ) => {
    const repository = {
      findInProgress: jest.fn(async () => inProgress),
    } as unknown as jest.Mocked<WorkflowInstancesRepository>;
    const stepsService = {
      findById: jest.fn(async () => ({ _id: stepId, workflowDefinitionId: definitionId, assigneeIds: assignees })),
    } as unknown as jest.Mocked<WorkflowStepsService>;
    const actionHistoryService = {
      hasApprovedInCurrentCycle: jest.fn(async (instanceId: Types.ObjectId) =>
        alreadyApproved.includes(instanceId.toString()),
      ),
    } as unknown as jest.Mocked<WorkflowActionHistoryService>;

    return {
      repository,
      stepsService,
      actionHistoryService,
      auditLogsService: { write: jest.fn() } as unknown as jest.Mocked<AuditLogsService>,
      revisionsService: {} as unknown as jest.Mocked<RevisionsService>,
      definitionsService: {} as unknown as jest.Mocked<WorkflowDefinitionsService>,
    };
  };

  const makeService = (deps: ReturnType<typeof makeDeps>) =>
    new WorkflowInstancesService(
      deps.repository,
      deps.stepsService,
      deps.actionHistoryService,
      deps.auditLogsService,
      deps.revisionsService,
      deps.definitionsService,
    );

  it('returns a review this person is assigned to decide', async () => {
    const mine = new Types.ObjectId();
    const deps = makeDeps([instance(mine)], [me]);

    const pending = await makeService(deps).findPendingFor(me.toString());

    expect(pending.map((row) => row._id.toString())).toEqual([mine.toString()]);
  });

  it('returns nothing to someone the current step does not name', async () => {
    const deps = makeDeps([instance(new Types.ObjectId())], [someoneElse]);

    expect(await makeService(deps).findPendingFor(me.toString())).toEqual([]);
  });

  it('drops a review this person has already decided in the current cycle', async () => {
    // A parallel step needing three approvals stays InProgress after mine. It
    // is still waiting — but not on me, and offering it again invites a press
    // that does nothing.
    const decided = new Types.ObjectId();
    const deps = makeDeps([instance(decided)], [me, someoneElse], [decided.toString()]);

    expect(await makeService(deps).findPendingFor(me.toString())).toEqual([]);
  });

  it('keeps a review whose step has no current step to speak of out of the queue', async () => {
    const orphan = { ...instance(new Types.ObjectId()), currentStepId: null };
    const deps = makeDeps([orphan as never], [me]);

    // An instance with no current step cannot be acted on by anyone; showing
    // it would be showing a decision with nowhere to land.
    expect(await makeService(deps).findPendingFor(me.toString())).toEqual([]);
    expect(deps.stepsService.findById).not.toHaveBeenCalled();
  });

  it('asks the database only for reviews that are actually running', async () => {
    const deps = makeDeps([], [me]);

    await makeService(deps).findPendingFor(me.toString());

    // Filtering `InProgress` in memory would read every instance the
    // federation has ever run to answer a question about the open ones.
    expect(deps.repository.findInProgress).toHaveBeenCalled();
  });
});

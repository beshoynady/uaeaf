import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PublishingService } from './publishing.service.js';
import { WorkflowPoliciesService } from '../workflow-policies/workflow-policies.service.js';
import { WorkflowInstancesService } from '../workflow-instances/workflow-instances.service.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { WorkflowActionHistoryService } from '../workflow-action-history/workflow-action-history.service.js';
import { RevisionsService } from '../revisions/revisions.service.js';
import { PublicationsService } from '../publications/publications.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { UsersService } from '../../platform-administration/users/users.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * Publishing what a review approved.
 *
 * The method under test exists because approving and publishing were one
 * event until the owner's 2026-09-20 decision. These cases pin the three
 * things that separation has to be worth: the published text is the approved
 * text and not the current draft, publishing is refused to someone who may
 * only edit, and a record nobody approved cannot be published through this
 * path at all.
 */
describe('PublishingService.publishApproved', () => {
  const entityType = 'articles' as const;
  const entityId = new Types.ObjectId();
  const revisionId = new Types.ObjectId();
  const instanceId = new Types.ObjectId();
  const publicationId = new Types.ObjectId();
  const definitionId = new Types.ObjectId();
  const publishedAt = new Date('2026-09-20T10:00:00.000Z');

  const userWith = (permissions: { resourceType: string; action: string }[]): AuthenticatedUser =>
    ({ userId: new Types.ObjectId().toString(), permissions }) as unknown as AuthenticatedUser;

  const publisher = userWith([
    { resourceType: 'articles', action: 'Publish' },
    { resourceType: 'articles', action: 'Read' },
  ]);
  const editorOnly = userWith([{ resourceType: 'articles', action: 'Update' }]);

  const makeDeps = () => {
    const policiesService = { resolve: jest.fn() } as unknown as jest.Mocked<WorkflowPoliciesService>;
    const instancesService = {
      findActive: jest.fn(),
      findByEntity: jest.fn(async () => []),
      findLatestApproved: jest.fn(),
    } as unknown as jest.Mocked<WorkflowInstancesService>;
    const stepsService = { findById: jest.fn(), findByDefinition: jest.fn(async () => []) } as unknown as jest.Mocked<WorkflowStepsService>;
    const definitionsService = { findById: jest.fn() } as unknown as jest.Mocked<WorkflowDefinitionsService>;
    const actionHistoryService = {
      findByInstances: jest.fn(async () => []),
      countDistinctApprovers: jest.fn(async () => 0),
    } as unknown as jest.Mocked<WorkflowActionHistoryService>;
    const revisionsService = { create: jest.fn(), findById: jest.fn(), findForEntity: jest.fn() } as unknown as jest.Mocked<RevisionsService>;
    const publicationsService = {
      publish: jest.fn(async () => ({ _id: publicationId, publishedAt })),
      findLive: jest.fn(async () => null),
      findByRevisionIds: jest.fn(async () => []),
      findByRevisionId: jest.fn(async () => null),
    } as unknown as jest.Mocked<PublicationsService>;
    const auditLogsService = { write: jest.fn() } as unknown as jest.Mocked<AuditLogsService>;
    const usersService = { findNamesByIds: jest.fn(async () => new Map()) } as unknown as jest.Mocked<UsersService>;

    // `modelFor` finds the model whose collection is named after the entity
    // type, so the fake connection has to look like that — a bare object would
    // make the method throw before reaching anything worth testing.
    const updateOne = jest.fn((_filter: unknown, _update: { $set: Record<string, unknown> }) => ({
      exec: jest.fn(async () => undefined),
    }));
    const schemaPaths = new Set(['publishDate', 'publicationState']);
    const articleModel = {
      collection: { collectionName: 'articles' },
      schema: { path: (name: string) => (schemaPaths.has(name) ? {} : undefined) },
      updateOne,
      findOne: jest.fn(() => ({ lean: () => ({ exec: jest.fn(async () => ({ _id: entityId, updatedAt: new Date(), publicationState: 'Draft' })) }) })),
    };
    const connection = { models: { Article: articleModel } };

    return {
      policiesService,
      instancesService,
      stepsService,
      definitionsService,
      actionHistoryService,
      revisionsService,
      publicationsService,
      auditLogsService,
      usersService,
      connection,
      articleModel,
      updateOne,
      schemaPaths,
    };
  };

  const makeService = (deps: ReturnType<typeof makeDeps>) =>
    new PublishingService(
      deps.policiesService,
      deps.instancesService,
      deps.stepsService,
      deps.definitionsService,
      deps.actionHistoryService,
      deps.revisionsService,
      deps.publicationsService,
      deps.auditLogsService,
      deps.usersService,
      deps.connection as never,
    );

  const underWorkflow = (deps: ReturnType<typeof makeDeps>) => {
    deps.policiesService.resolve.mockResolvedValue({
      mode: 'workflow',
      policy: {} as never,
      workflowDefinitionId: definitionId,
      reason: null,
    });
  };

  const approvalWaiting = (deps: ReturnType<typeof makeDeps>) => {
    deps.instancesService.findLatestApproved.mockResolvedValue({
      _id: instanceId,
      revisionId,
      status: 'Approved',
    } as never);
  };

  it('publishes the revision the approvers actually approved', async () => {
    const deps = makeDeps();
    underWorkflow(deps);
    approvalWaiting(deps);
    const service = makeService(deps);

    const result = await service.publishApproved({ entityType, entityId, actor: publisher });

    // The frozen revision, never a fresh snapshot: a new snapshot would
    // publish whatever the draft says now, which is not what anyone approved.
    expect(deps.revisionsService.create).not.toHaveBeenCalled();
    expect(deps.publicationsService.publish).toHaveBeenCalledWith(
      expect.objectContaining({ entityType, entityId, revisionId, workflowInstanceId: instanceId }),
    );
    expect(result).toEqual({
      revisionId: revisionId.toString(),
      publicationId: publicationId.toString(),
      publishedAt: publishedAt.toISOString(),
    });
  });

  it('brings the record itself to Live, and stamps the date from the publication', async () => {
    const deps = makeDeps();
    underWorkflow(deps);
    approvalWaiting(deps);
    const service = makeService(deps);

    await service.publishApproved({ entityType, entityId, actor: publisher });

    expect(deps.updateOne).toHaveBeenCalledWith(
      { _id: entityId, archivedAt: null },
      { $set: expect.objectContaining({ publicationState: 'Live', publishDate: publishedAt }) },
    );
  });

  it('leaves the publish date alone for a type that has no such field', async () => {
    const deps = makeDeps();
    // A singleton page carries no publish date; its date is its publication's.
    deps.schemaPaths.delete('publishDate');
    underWorkflow(deps);
    approvalWaiting(deps);
    const service = makeService(deps);

    await service.publishApproved({ entityType, entityId, actor: publisher });

    const [, update] = deps.updateOne.mock.calls[0];
    expect(update.$set).not.toHaveProperty('publishDate');
    expect(update.$set).toHaveProperty('publicationState', 'Live');
  });

  it('refuses when no approval is waiting', async () => {
    const deps = makeDeps();
    underWorkflow(deps);
    deps.instancesService.findLatestApproved.mockResolvedValue(null);
    const service = makeService(deps);

    await expect(service.publishApproved({ entityType, entityId, actor: publisher })).rejects.toMatchObject({
      response: { code: 'notApproved' },
    });
    expect(deps.publicationsService.publish).not.toHaveBeenCalled();
  });

  it('refuses someone who may edit but not publish', async () => {
    const deps = makeDeps();
    underWorkflow(deps);
    approvalWaiting(deps);
    const service = makeService(deps);

    // Checked before the policy is even read: whether this person may publish
    // does not depend on how the federation configured its reviews.
    await expect(service.publishApproved({ entityType, entityId, actor: editorOnly })).rejects.toThrow(
      ForbiddenException,
    );
    expect(deps.policiesService.resolve).not.toHaveBeenCalled();
  });

  it('sends a policy that needs no approval down the direct path instead', async () => {
    const deps = makeDeps();
    deps.policiesService.resolve.mockResolvedValue({ mode: 'direct', policy: {} as never, workflowDefinitionId: null, reason: null });
    const service = makeService(deps);

    await expect(service.publishApproved({ entityType, entityId, actor: publisher })).rejects.toThrow(ConflictException);
    expect(deps.publicationsService.publish).not.toHaveBeenCalled();
  });

  it('refuses while the publishing policy is unconfigured', async () => {
    const deps = makeDeps();
    deps.policiesService.resolve.mockResolvedValue({ mode: 'blocked', policy: null, workflowDefinitionId: null, reason: 'noPolicy' });
    const service = makeService(deps);

    await expect(service.publishApproved({ entityType, entityId, actor: publisher })).rejects.toMatchObject({
      response: { code: 'publishingPolicyMissing' },
    });
  });

  it('records the publication in the trail without carrying any content into it', async () => {
    const deps = makeDeps();
    underWorkflow(deps);
    approvalWaiting(deps);
    const service = makeService(deps);

    await service.publishApproved({ entityType, entityId, actor: publisher });

    const [entry] = deps.auditLogsService.write.mock.calls[0];
    expect(entry).toMatchObject({
      action: 'StatusChange',
      entityType,
      entityId,
      newValue: { publicationState: 'Live', revisionId: revisionId.toString() },
    });
  });

  /**
   * What the dashboard is allowed to draw.
   *
   * The panel never derives these rules itself — it renders the list the
   * server computed. So "publish is offered once a review has been approved"
   * has to be true here, or the button does not exist anywhere.
   */
  describe('the actions offered after a review finishes', () => {
    const reviewer = userWith([
      { resourceType: 'articles', action: 'Read' },
      { resourceType: 'articles', action: 'Update' },
      { resourceType: 'articles', action: 'Publish' },
      { resourceType: 'workflowInstances', action: 'Approve' },
    ]);

    it('offers publishing once a review has been approved', async () => {
      const deps = makeDeps();
      underWorkflow(deps);
      // `findActive` hides Approved instances, so the panel sees no review
      // running — which is exactly the state a finished approval leaves.
      deps.instancesService.findActive.mockResolvedValue(null);
      approvalWaiting(deps);
      const service = makeService(deps);

      const state = await service.editorialState(entityType, entityId, reviewer);

      expect(state.availableActions).toContain('publish');
      // And not submit: resubmitting a record that is already approved would
      // throw away the approval it is holding.
      expect(state.availableActions).not.toContain('submit');
    });

    it('offers submitting, not publishing, while nothing is approved', async () => {
      const deps = makeDeps();
      underWorkflow(deps);
      deps.instancesService.findActive.mockResolvedValue(null);
      deps.instancesService.findLatestApproved.mockResolvedValue(null);
      const service = makeService(deps);

      const state = await service.editorialState(entityType, entityId, reviewer);

      expect(state.availableActions).toContain('submit');
      expect(state.availableActions).not.toContain('publish');
    });

    /**
     * The grant that opens a review decision is `workflowInstances:Approve`.
     *
     * This read asked for `<entityType>:Approve` instead — a pair that exists
     * nowhere: no route guards it, and `permission-catalogue.spec.ts` refuses
     * to seed a pair no route guards, so it could not be granted to anyone
     * even deliberately. `canApprove` was therefore false for every reader of
     * every type, `availableActions` never contained approve, reject or
     * return, and the panel — which renders that list verbatim — has never
     * drawn a review button. The decisions were reachable only by calling the
     * API directly.
     */
    it('reads the approve right from the grant the API actually enforces', async () => {
      const deps = makeDeps();
      underWorkflow(deps);
      deps.instancesService.findActive.mockResolvedValue({
        _id: instanceId,
        status: 'InProgress',
        currentStepId: null,
        workflowDefinitionId: definitionId,
      } as never);
      deps.instancesService.findLatestApproved.mockResolvedValue(null);
      const service = makeService(deps);

      const state = await service.editorialState(
        entityType,
        entityId,
        userWith([
          { resourceType: 'articles', action: 'Read' },
          { resourceType: 'workflowInstances', action: 'Approve' },
        ]),
      );

      expect(state.availableActions).toEqual(expect.arrayContaining(['approve', 'reject', 'return']));
    });

    it('offers no review decision to someone holding no approve grant', async () => {
      const deps = makeDeps();
      underWorkflow(deps);
      deps.instancesService.findActive.mockResolvedValue({
        _id: instanceId,
        status: 'InProgress',
        currentStepId: null,
        workflowDefinitionId: definitionId,
      } as never);
      deps.instancesService.findLatestApproved.mockResolvedValue(null);
      const service = makeService(deps);

      const state = await service.editorialState(
        entityType,
        entityId,
        userWith([
          { resourceType: 'articles', action: 'Read' },
          { resourceType: 'articles', action: 'Update' },
        ]),
      );

      expect(state.availableActions).not.toContain('approve');
      expect(state.availableActions).not.toContain('reject');
      expect(state.availableActions).not.toContain('return');
    });

    it('offers neither publish nor submit while the review is still running', async () => {
      const deps = makeDeps();
      underWorkflow(deps);
      deps.instancesService.findActive.mockResolvedValue({
        _id: instanceId,
        status: 'InProgress',
        currentStepId: null,
        workflowDefinitionId: definitionId,
      } as never);
      deps.instancesService.findLatestApproved.mockResolvedValue(null);
      const service = makeService(deps);

      const state = await service.editorialState(entityType, entityId, reviewer);

      expect(state.availableActions).not.toContain('publish');
      expect(state.availableActions).not.toContain('submit');
    });

    it('does not offer publishing to someone who may only edit', async () => {
      const deps = makeDeps();
      underWorkflow(deps);
      deps.instancesService.findActive.mockResolvedValue(null);
      approvalWaiting(deps);
      const service = makeService(deps);

      const state = await service.editorialState(
        entityType,
        entityId,
        userWith([
          { resourceType: 'articles', action: 'Read' },
          { resourceType: 'articles', action: 'Update' },
        ]),
      );

      expect(state.availableActions).not.toContain('publish');
    });
  });
});

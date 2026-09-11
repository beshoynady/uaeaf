import { MongoMemoryServer } from 'mongodb-memory-server';
import { apiPath } from './support/api-path.js';
import { configureTestApp } from './support/test-app.js';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

/**
 * Behaviour of the workflow engine across whole lifecycles, against a real
 * ephemeral MongoDB — the evidence behind
 * `docs/engineering/reviews/workflow-integrity-review.md`.
 *
 * Two kinds of test live here:
 * - A plain `it` records behaviour that is correct today, so a fix elsewhere
 *   cannot break it unnoticed.
 * - An `it.failing` proves a confirmed defect. It passes while the defect is
 *   present; the day the defect is fixed, Jest reports it as failing, which
 *   is the signal to turn it into a plain `it`. Each one names the review's
 *   hypothesis or finding number and the rule it breaks.
 *
 * Every test builds its own record and its own workflow definition, so no
 * test depends on what another one left behind.
 */

type Who = 'author' | 'a' | 'b' | 'c' | 'd' | 'revisionsOnly';
type StepSpec = { stepType: 'Sequential' | 'Parallel'; assignees: Who[]; requiredApprovals: number };

let mongoServer: MongoMemoryServer;
// Assigned in beforeAll: the application, its HTTP server, and the models
// the assertions read directly.
let app: { close(): Promise<void>; getHttpServer(): unknown };
let request: typeof import('supertest').default;
let Types: typeof import('mongoose').Types;
let pageModel: import('mongoose').Model<{ _id: unknown }>;
let instanceModel: import('mongoose').Model<unknown>;
let publicationModel: import('mongoose').Model<unknown>;
const tokens = {} as Record<Who, string>;
const ids = {} as Record<Who, string>;

const server = () => app.getHttpServer() as Parameters<typeof request>[0];
const post = (who: Who, path: string, body: object) =>
  request(server()).post(apiPath(path)).set({ Authorization: `Bearer ${tokens[who]}` }).send(body);
const get = (who: Who, path: string) =>
  request(server()).get(apiPath(path)).set({ Authorization: `Bearer ${tokens[who]}` });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-workflow-integrity');

  const { Test } = await import('@nestjs/testing');
  const { getModelToken } = await import('@nestjs/mongoose');
  request = (await import('supertest')).default;
  Types = (await import('mongoose')).Types;
  const { AppModule } = await import('../../src/app.module.js');
  const { Role } = await import('../../src/modules/platform-administration/roles/schemas/role.schema.js');
  const { Permission } = await import('../../src/modules/platform-administration/permissions/schemas/permission.schema.js');
  const { User } = await import('../../src/modules/platform-administration/users/schemas/user.schema.js');
  const { Publication } = await import('../../src/modules/workflow/publications/schemas/publication.schema.js');
  const { WorkflowInstance } = await import(
    '../../src/modules/workflow/workflow-instances/schemas/workflow-instance.schema.js'
  );
  const { VisionMissionPage } = await import(
    '../../src/modules/federation-governance/vision-mission-page/schemas/vision-mission-page.schema.js'
  );
  const bcrypt = (await import('bcryptjs')).default;

  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const nestApp = moduleFixture.createNestApplication();
  configureTestApp(nestApp);
  await nestApp.init();
  app = nestApp;

  pageModel = moduleFixture.get(getModelToken(VisionMissionPage.name));
  instanceModel = moduleFixture.get(getModelToken(WorkflowInstance.name));
  publicationModel = moduleFixture.get(getModelToken(Publication.name));
  const permissionModel = moduleFixture.get(getModelToken(Permission.name));
  const roleModel = moduleFixture.get(getModelToken(Role.name));
  const userModel = moduleFixture.get(getModelToken(User.name));

  const grant = async (pairs: Array<[string, string]>) =>
    Promise.all(
      pairs.map(async ([resourceType, action]) => {
        const existing = await permissionModel.findOne({ resourceType, action });
        if (existing) return existing._id;
        const created = await permissionModel.create({
          name: { en: `${action} ${resourceType}`, ar: `${action} ${resourceType}` },
          resourceType,
          action,
        });
        return created._id;
      }),
    );

  // Every workflow user holds every workflow permission, so what these tests
  // exercise is the engine's own rules (assignees, steps, states) rather than
  // the flat RBAC gate in front of them.
  const fullRole = await roleModel.create({
    name: { en: 'Workflow Participant', ar: 'مشارك في سير العمل' },
    permissionIds: await grant([
      ['workflowDefinitions', 'Create'],
      ['workflowDefinitions', 'Read'],
      ['workflowSteps', 'Create'],
      ['workflowSteps', 'Read'],
      ['workflowPolicies', 'Create'],
      ['workflowPolicies', 'Read'],
      ['revisions', 'Create'],
      ['revisions', 'Read'],
      ['workflowInstances', 'Create'],
      ['workflowInstances', 'Read'],
      ['workflowInstances', 'Approve'],
      ['workflowInstances', 'Update'],
      ['publications', 'Read'],
    ]),
    isSystemRole: false,
  });
  // Holds the flat revisions permission and nothing over visionMissionPage.
  const revisionsOnlyRole = await roleModel.create({
    name: { en: 'Revisions Only', ar: 'المراجعات فقط' },
    permissionIds: await grant([
      ['revisions', 'Create'],
      ['revisions', 'Read'],
    ]),
    isSystemRole: false,
  });

  const password = 'correct horse battery staple';
  const passwordHash = await bcrypt.hash(password, 10);
  const people: Array<[Who, unknown]> = [
    ['author', fullRole._id],
    ['a', fullRole._id],
    ['b', fullRole._id],
    ['c', fullRole._id],
    ['d', fullRole._id],
    ['revisionsOnly', revisionsOnlyRole._id],
  ];
  for (const [who, roleId] of people) {
    const email = `${who.toLowerCase()}@uaeaf.ae`;
    const user = await userModel.create({
      name: { en: who, ar: who },
      email,
      accountStatus: 'Active',
      roleIds: [roleId],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });
    ids[who] = user._id.toString();
    const login = await request(server()).post(apiPath('/auth/login')).send({ email, password }).expect(200);
    tokens[who] = login.body.accessToken as string;
  }
}, 120000);

afterAll(async () => {
  await app?.close();
  await mongoServer?.stop();
});

// --- Building blocks -------------------------------------------------------

async function storePage(visionEn: string): Promise<string> {
  const page = await pageModel.create({
    federationId: new Types.ObjectId(),
    heroTitle: { ar: 'الرؤية والرسالة', en: 'Vision and Mission' },
    heroSubtitle: { ar: 'ما نعمل من أجله', en: 'What we work towards' },
    visionText: { ar: 'الرؤية', en: visionEn },
    missionText: { ar: 'الرسالة', en: 'Mission' },
    publicationState: 'Draft',
    createdBy: new Types.ObjectId(ids.author),
  });
  return String(page._id);
}

async function editPage(entityId: string, visionEn: string): Promise<void> {
  await pageModel.updateOne({ _id: entityId }, { $set: { 'visionText.en': visionEn } });
}

async function defineWorkflow(
  steps: StepSpec[],
  options: { entityType?: string; isActive?: boolean } = {},
): Promise<{ definitionId: string; stepIds: string[] }> {
  const definition = await post('author', '/workflow-definitions', {
    name: { en: 'Integrity review', ar: 'مراجعة السلامة' },
    entityType: options.entityType ?? 'visionMissionPage',
    ...(options.isActive === undefined ? {} : { isActive: options.isActive }),
  }).expect(201);
  const stepIds: string[] = [];
  for (const [sequenceOrder, step] of steps.entries()) {
    const created = await post('author', '/workflow-steps', {
      workflowDefinitionId: definition.body._id,
      sequenceOrder,
      stepType: step.stepType,
      assigneeIds: step.assignees.map((who) => ids[who]),
      requiredApprovals: step.requiredApprovals,
    }).expect(201);
    stepIds.push(created.body._id as string);
  }
  return { definitionId: definition.body._id as string, stepIds };
}

async function revise(entityId: string): Promise<string> {
  const revision = await post('author', '/revisions', { entityType: 'visionMissionPage', entityId }).expect(201);
  return revision.body._id as string;
}

const submitRequest = (definitionId: string, entityId: string, revisionId: string) =>
  post('author', '/workflow-instances', {
    workflowDefinitionId: definitionId,
    entityType: 'visionMissionPage',
    entityId,
    revisionId,
  });

async function submit(definitionId: string, entityId: string, revisionId: string): Promise<string> {
  const instance = await submitRequest(definitionId, entityId, revisionId).expect(201);
  return instance.body._id as string;
}

const approve = (who: Who, instanceId: string) => post(who, `/workflow-instances/${instanceId}/approve`, {});
const reject = (who: Who, instanceId: string, reason: string) =>
  post(who, `/workflow-instances/${instanceId}/reject`, { reason });
const returnTo = (who: Who, instanceId: string, stepId: string, reason: string) =>
  post(who, `/workflow-instances/${instanceId}/return`, { returnedToStepId: stepId, reason });
const resubmit = (instanceId: string, revisionId: string) =>
  post('author', `/workflow-instances/${instanceId}/resubmit`, { revisionId });
const delegate = (who: Who, instanceId: string, to: Who) =>
  post(who, `/workflow-instances/${instanceId}/delegate`, { delegatedToUserId: ids[to] });

async function stateOf(instanceId: string): Promise<{ status: string; currentStepId: string | null }> {
  const instance = await get('author', `/workflow-instances/${instanceId}`).expect(200);
  return { status: instance.body.status, currentStepId: instance.body.currentStepId };
}

/** What a visitor reads for the record's vision, or null when nothing is live. */
async function publicVision(entityId: string): Promise<string | null> {
  const page = await request(server()).get(apiPath(`/vision-mission-page/${entityId}/public`)).expect(200);
  return (page.body.visionText?.en as string | undefined) ?? null;
}

async function livePublications(entityId: string): Promise<number> {
  return publicationModel.countDocuments({
    entityType: 'visionMissionPage',
    entityId: new Types.ObjectId(entityId),
    status: 'Live',
    archivedAt: null,
  });
}

// --- The eight lifecycle scenarios ------------------------------------------

describe('Workflow integrity (e2e)', () => {
  it('[S1] publishes a sequential chain only after A, then B, then C approve', async () => {
    const entityId = await storePage('Chain text');
    const { definitionId } = await defineWorkflow([
      { stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 },
      { stepType: 'Sequential', assignees: ['b'], requiredApprovals: 1 },
      { stepType: 'Sequential', assignees: ['c'], requiredApprovals: 1 },
    ]);
    const instanceId = await submit(definitionId, entityId, await revise(entityId));

    // B is not assigned to the step the chain is waiting on.
    await approve('b', instanceId).expect(403);
    await approve('a', instanceId).expect(201);
    expect(await publicVision(entityId)).toBeNull();
    await approve('b', instanceId).expect(201);
    expect(await publicVision(entityId)).toBeNull();
    await approve('c', instanceId).expect(201);

    expect((await stateOf(instanceId)).status).toBe('Approved');
    expect(await publicVision(entityId)).toBe('Chain text');
  }, 30000);

  it('[S2] holds a 2-of-3 parallel step after one approval and publishes after the second', async () => {
    const entityId = await storePage('Parallel text');
    const { definitionId } = await defineWorkflow([
      { stepType: 'Parallel', assignees: ['a', 'b', 'c'], requiredApprovals: 2 },
    ]);
    const instanceId = await submit(definitionId, entityId, await revise(entityId));

    await approve('a', instanceId).expect(201);
    expect((await stateOf(instanceId)).status).toBe('InProgress');
    expect(await publicVision(entityId)).toBeNull();

    await approve('c', instanceId).expect(201);
    expect((await stateOf(instanceId)).status).toBe('Approved');
    expect(await publicVision(entityId)).toBe('Parallel text');
  }, 30000);

  it('[S3] counts one approver once, however many times they approve', async () => {
    const entityId = await storePage('Twice text');
    const { definitionId } = await defineWorkflow([
      { stepType: 'Parallel', assignees: ['a', 'b', 'c'], requiredApprovals: 2 },
    ]);
    const instanceId = await submit(definitionId, entityId, await revise(entityId));

    await approve('a', instanceId).expect(201);
    await approve('a', instanceId).expect(201);

    expect((await stateOf(instanceId)).status).toBe('InProgress');
    expect(await publicVision(entityId)).toBeNull();
  }, 30000);

  // H1 — an approval counts only in the cycle it was given in. A's and B's
  // approvals of revision 1 do not carry over once D returns it and the
  // author resubmits revision 2, so C's single approval leaves the "2 of 3"
  // step waiting for a second reviewer of the new text.
  it('[H1] does not count approvals of the returned revision toward the resubmitted one', async () => {
    const entityId = await storePage('Returned, first draft');
    const { definitionId, stepIds } = await defineWorkflow([
      { stepType: 'Parallel', assignees: ['a', 'b', 'c'], requiredApprovals: 2 },
      { stepType: 'Sequential', assignees: ['d'], requiredApprovals: 1 },
    ]);
    const instanceId = await submit(definitionId, entityId, await revise(entityId));
    await approve('a', instanceId).expect(201);
    await approve('b', instanceId).expect(201);
    await returnTo('d', instanceId, stepIds[0], 'Rewrite the second paragraph').expect(201);

    await editPage(entityId, 'Returned, second draft');
    await resubmit(instanceId, await revise(entityId)).expect(201);
    await approve('c', instanceId).expect(201);

    expect((await stateOf(instanceId)).currentStepId).toBe(stepIds[0]);
  }, 30000);

  // H1, the rejection path — A approved revision 1 and B rejected it. After
  // the author resubmits revision 2, C's one approval does not publish it:
  // A's approval was of the rejected text.
  it('[H1] does not count an approval given before a rejection toward the resubmitted revision', async () => {
    const entityId = await storePage('Rejected, first draft');
    const { definitionId } = await defineWorkflow([
      { stepType: 'Parallel', assignees: ['a', 'b', 'c'], requiredApprovals: 2 },
    ]);
    const instanceId = await submit(definitionId, entityId, await revise(entityId));
    await approve('a', instanceId).expect(201);
    await reject('b', instanceId, 'The figures are wrong').expect(201);

    await editPage(entityId, 'Rejected, second draft');
    await resubmit(instanceId, await revise(entityId)).expect(201);
    await approve('c', instanceId).expect(201);

    expect(await publicVision(entityId)).toBeNull();
  }, 30000);

  it('[S6] keeps the published version when a later revision is rejected', async () => {
    const entityId = await storePage('Published version');
    const { definitionId } = await defineWorkflow([{ stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 }]);
    const first = await submit(definitionId, entityId, await revise(entityId));
    await approve('a', first).expect(201);
    expect(await publicVision(entityId)).toBe('Published version');

    await editPage(entityId, 'Rejected version');
    const second = await submit(definitionId, entityId, await revise(entityId));
    await reject('a', second, 'Not this wording').expect(201);

    expect(await publicVision(entityId)).toBe('Published version');
    expect(await livePublications(entityId)).toBe(1);
  }, 30000);

  // H2 — CONFIRMED DEFECT (P1). "At most one active instance per record"
  // (BE-PLAN-010 Week 2 §4) is a read-then-write in the service
  // (`findActive`, then `create`) with no database constraint behind it, so
  // two submissions arriving together both pass the read.
  it.failing('[H2] creates one instance when the same record is submitted twice at once', async () => {
    const entityId = await storePage('Double submit');
    const { definitionId } = await defineWorkflow([{ stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 }]);
    const revisionId = await revise(entityId);

    await Promise.all([
      submitRequest(definitionId, entityId, revisionId),
      submitRequest(definitionId, entityId, revisionId),
    ]);

    const active = await instanceModel.countDocuments({
      entityType: 'visionMissionPage',
      entityId: new Types.ObjectId(entityId),
      status: { $ne: 'Approved' },
      archivedAt: null,
    });
    expect(active).toBe(1);
  }, 30000);

  // H11 — CONFIRMED DEFECT (P1). A definition is scoped to exactly one
  // entity type (08-Workflow-Scenario-Review §2.A), but a policy is stored
  // without the definition it names ever being read.
  it.failing('[H11/S8] refuses a policy whose definition governs another entity type', async () => {
    const { definitionId } = await defineWorkflow([{ stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 }], {
      entityType: 'committees',
    });

    const policy = await post('author', '/workflow-policies', {
      entityType: 'visionMissionPage',
      operation: 'Edit',
      workflowRequired: true,
      workflowDefinitionId: definitionId,
      allowHardDelete: false,
    });

    expect([400, 409]).toContain(policy.status);
  }, 30000);

  // H11 — CONFIRMED DEFECT (P1). `isActive` is "whether this definition is
  // usable" (CreateWorkflowDefinitionDto), yet a policy may route to an
  // unusable one.
  it.failing('[H11/S8] refuses a policy whose definition is inactive', async () => {
    const { definitionId } = await defineWorkflow([{ stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 }], {
      isActive: false,
    });

    const policy = await post('author', '/workflow-policies', {
      entityType: 'visionMissionPage',
      operation: 'Edit',
      workflowRequired: true,
      workflowDefinitionId: definitionId,
      allowHardDelete: false,
    });

    expect([400, 409]).toContain(policy.status);
  }, 30000);

  // H11 — a record is approved only through a definition written for its
  // entity type; another type's definition, even one whose only assignee is
  // the submitter, names people this record's workflow does not.
  it('[H11/S8] refuses a submission through a definition of another entity type', async () => {
    const entityId = await storePage('Wrong definition');
    const { definitionId } = await defineWorkflow([{ stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 }], {
      entityType: 'committees',
    });

    const submission = await submitRequest(definitionId, entityId, await revise(entityId));

    expect([400, 409]).toContain(submission.status);
  }, 30000);

  // H11 — an inactive definition starts no new instance.
  it('[H11/S8] refuses a submission through an inactive definition', async () => {
    const entityId = await storePage('Inactive definition');
    const { definitionId } = await defineWorkflow([{ stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 }], {
      isActive: false,
    });

    const submission = await submitRequest(definitionId, entityId, await revise(entityId));

    expect([400, 409]).toContain(submission.status);
  }, 30000);

  // --- Admin configuration (H4, H5, H6) ------------------------------------

  // H4 — CONFIRMED DEFECT (P2 today, P1 once policies are read). Policy
  // selection is one pointer per (entityType, operation)
  // (08-Workflow-Scenario-Review §6.5); a second row makes the choice
  // arbitrary, and nothing refuses it.
  it.failing('[H4] refuses a second policy for the same entity type and operation', async () => {
    const { definitionId } = await defineWorkflow([{ stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 }]);
    const policy = {
      entityType: 'visionMissionPage',
      operation: 'Add',
      workflowRequired: true,
      workflowDefinitionId: definitionId,
      allowHardDelete: false,
    };
    await post('author', '/workflow-policies', policy).expect(201);

    const duplicate = await post('author', '/workflow-policies', policy);

    expect([400, 409]).toContain(duplicate.status);
  }, 30000);

  // H5 — CONFIRMED DEFECT (P1). Two steps sharing an order: `findNext` asks
  // for the first step with a strictly greater order, so whichever of the two
  // runs second is skipped and its assignees never review the content.
  it.failing('[H5] refuses a second step with the same order in one definition', async () => {
    const { definitionId } = await defineWorkflow([{ stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 }]);

    const duplicate = await post('author', '/workflow-steps', {
      workflowDefinitionId: definitionId,
      sequenceOrder: 0,
      stepType: 'Sequential',
      assigneeIds: [ids.b],
      requiredApprovals: 1,
    });

    expect([400, 409]).toContain(duplicate.status);
  }, 30000);

  // H6 — CONFIRMED DEFECT (P1). A step that needs more approvals than it has
  // people can never be satisfied; every instance that reaches it is stuck.
  it.failing('[H6] refuses a step that needs more approvals than it has assignees', async () => {
    const { definitionId } = await defineWorkflow([]);

    const step = await post('author', '/workflow-steps', {
      workflowDefinitionId: definitionId,
      sequenceOrder: 0,
      stepType: 'Parallel',
      assigneeIds: [ids.a, ids.b],
      requiredApprovals: 3,
    });

    expect(step.status).toBe(400);
  }, 30000);

  // H6 — CONFIRMED DEFECT (P1). The same person listed twice is one
  // approver, so "2 of [A, A]" is as unsatisfiable as "3 of 2".
  it.failing('[H6] refuses a step that lists the same assignee twice to reach its threshold', async () => {
    const { definitionId } = await defineWorkflow([]);

    const step = await post('author', '/workflow-steps', {
      workflowDefinitionId: definitionId,
      sequenceOrder: 0,
      stepType: 'Parallel',
      assigneeIds: [ids.a, ids.a],
      requiredApprovals: 2,
    });

    expect(step.status).toBe(400);
  }, 30000);

  // --- Found outside the list ----------------------------------------------

  // OUT-01 (H11) — an instance returns only to an earlier step of its own
  // definition; a foreign step's assignees would decide this content.
  it('[OUT-01] refuses to return an instance to a step of another definition', async () => {
    const entityId = await storePage('Foreign return');
    const own = await defineWorkflow([
      { stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 },
      { stepType: 'Sequential', assignees: ['b'], requiredApprovals: 1 },
    ]);
    const foreign = await defineWorkflow([{ stepType: 'Sequential', assignees: ['c'], requiredApprovals: 1 }]);
    const instanceId = await submit(own.definitionId, entityId, await revise(entityId));
    await approve('a', instanceId).expect(201);

    const returned = await returnTo('b', instanceId, foreign.stepIds[0], 'Send it elsewhere');

    expect([400, 409]).toContain(returned.status);
  }, 30000);

  // OUT-02 — delegation is switched off. It added the delegate to the step's
  // assigneeIds, and a step belongs to the definition, so one delegation let
  // the delegate approve every instance of that definition (Operating Model
  // §8). Refusing it must leave the step exactly as it was.
  //
  // TODO(workflow-integrity-review F7, before 6 November): delegation returns
  // scoped to one instance. Replace this with tests that a delegate acts on
  // that instance only, and of who counts toward the threshold (D-04).
  it('[OUT-02] refuses delegation while it is disabled, and leaves the step as it was', async () => {
    const entityId = await storePage('Delegation off');
    const { definitionId, stepIds } = await defineWorkflow([
      { stepType: 'Sequential', assignees: ['a'], requiredApprovals: 1 },
    ]);
    const instanceId = await submit(definitionId, entityId, await revise(entityId));

    const delegation = await delegate('a', instanceId, 'd');

    expect(delegation.status).toBe(403);
    expect(delegation.body.message).toMatch(/temporarily disabled/);
    const step = await get('author', `/workflow-steps/${stepIds[0]}`).expect(200);
    expect(step.body.assigneeIds).toEqual([ids.a]);
    await approve('d', instanceId).expect(403);
  }, 30000);

  // OUT-03 — CONFIRMED DEFECT (P2 now: both rows carry the same revision, so
  // visitors see the same text). A revision is published once
  // (`publications.revisionId` is 1:1 — 08-Workflow-Scenario-Review §2.M,
  // 07-Mongoose-Schema-Specification `publications`). `approve()` reads the
  // instance's state and writes it back without a condition, so two final
  // approvals arriving together both publish it.
  it.failing('[OUT-03] publishes a revision once when two final approvals arrive at once', async () => {
    const entityId = await storePage('Two clicks');
    const { definitionId } = await defineWorkflow([
      { stepType: 'Parallel', assignees: ['a', 'b'], requiredApprovals: 1 },
    ]);
    const revisionId = await revise(entityId);
    const instanceId = await submit(definitionId, entityId, revisionId);

    await Promise.all([approve('a', instanceId), approve('b', instanceId)]);

    expect(await publicationModel.countDocuments({ revisionId: new Types.ObjectId(revisionId) })).toBe(1);
    expect(await livePublications(entityId)).toBe(1);
  }, 30000);

  // OUT-04 — CONFIRMED GAP against an approved decision (P1).
  // content-authorization-architecture-approval.md §2.2, listed under
  // REQUIRED CHANGES and security test (f): POST /revisions must also require
  // `<entityType>:Update`. Only the flat `revisions:Create` is checked.
  it.failing('[OUT-04] refuses a revision from an actor with no Update permission on that entity type', async () => {
    const entityId = await storePage('Flat permission');

    const revision = await post('revisionsOnly', '/revisions', { entityType: 'visionMissionPage', entityId });

    expect(revision.status).toBe(403);
  }, 30000);
});

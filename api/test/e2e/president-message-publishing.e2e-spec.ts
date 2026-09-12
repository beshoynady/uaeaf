import { MongoMemoryServer } from 'mongodb-memory-server';
import { apiPath } from './support/api-path.js';
import { configureTestApp } from './support/test-app.js';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

/**
 * The promises ADR-0069 D4/D5 makes, against a real ephemeral MongoDB.
 *
 * Three people, deliberately different:
 * - `publisher` may edit AND publish.
 * - `editor` may edit only — the ordinary case, and the one that proves
 *   editing does not imply publishing.
 * - `approver` reviews.
 * - `outsider` holds `revisions:Read` and nothing about this page — the
 *   person who proves that reading history in general is not reading this
 *   record's history.
 *
 * Each test configures the policy it needs and builds its own record, so no
 * test depends on what another left behind.
 */

type Who = 'publisher' | 'editor' | 'approver' | 'outsider';

let mongoServer: MongoMemoryServer;
let app: { close(): Promise<void>; getHttpServer(): unknown };
let request: typeof import('supertest').default;
let Types: typeof import('mongoose').Types;
let messageModel: import('mongoose').Model<{ _id: unknown }>;
let policyModel: import('mongoose').Model<unknown>;
let appointmentModel: import('mongoose').Model<{ _id: unknown }>;
let auditModel: import('mongoose').Model<unknown>;
let publicationModel: import('mongoose').Model<unknown>;
let revisionModel: import('mongoose').Model<{ _id: unknown }>;

const tokens = {} as Record<Who, string>;
const ids = {} as Record<Who, string>;

const server = () => app.getHttpServer() as Parameters<typeof request>[0];
const post = (who: Who, path: string, body: object = {}) =>
  request(server()).post(apiPath(path)).set({ Authorization: `Bearer ${tokens[who]}` }).send(body);
const patch = (who: Who, path: string, body: object) =>
  request(server()).patch(apiPath(path)).set({ Authorization: `Bearer ${tokens[who]}` }).send(body);
const get = (who: Who, path: string) =>
  request(server()).get(apiPath(path)).set({ Authorization: `Bearer ${tokens[who]}` });
const put = (who: Who, path: string, body: object) =>
  request(server()).put(apiPath(path)).set({ Authorization: `Bearer ${tokens[who]}` }).send(body);

const richText = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-president-publishing');

  const { Test } = await import('@nestjs/testing');
  const { getModelToken } = await import('@nestjs/mongoose');
  request = (await import('supertest')).default;
  Types = (await import('mongoose')).Types;
  const { AppModule } = await import('../../src/app.module.js');
  const { Role } = await import('../../src/modules/platform-administration/roles/schemas/role.schema.js');
  const { Permission } = await import(
    '../../src/modules/platform-administration/permissions/schemas/permission.schema.js'
  );
  const { User } = await import('../../src/modules/platform-administration/users/schemas/user.schema.js');
  const { PresidentMessagePage } = await import(
    '../../src/modules/federation-governance/president-message-page/schemas/president-message-page.schema.js'
  );
  const { WorkflowPolicy } = await import(
    '../../src/modules/workflow/workflow-policies/schemas/workflow-policy.schema.js'
  );
  const { FederationAppointment } = await import(
    '../../src/modules/federation-governance/federation-appointments/schemas/federation-appointments.schema.js'
  );
  const { AuditLog } = await import('../../src/modules/workflow/audit-logs/schemas/audit-log.schema.js');
  const { Publication } = await import('../../src/modules/workflow/publications/schemas/publication.schema.js');
  const { Revision } = await import('../../src/modules/workflow/revisions/schemas/revision.schema.js');
  const bcrypt = (await import('bcryptjs')).default;

  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const nestApp = moduleFixture.createNestApplication();
  configureTestApp(nestApp);
  await nestApp.init();
  app = nestApp;

  messageModel = moduleFixture.get(getModelToken(PresidentMessagePage.name));
  policyModel = moduleFixture.get(getModelToken(WorkflowPolicy.name));
  appointmentModel = moduleFixture.get(getModelToken(FederationAppointment.name));
  auditModel = moduleFixture.get(getModelToken(AuditLog.name));
  publicationModel = moduleFixture.get(getModelToken(Publication.name));
  revisionModel = moduleFixture.get(getModelToken(Revision.name));
  const permissionModel = moduleFixture.get(getModelToken(Permission.name));
  const roleModel = moduleFixture.get(getModelToken(User.name)) && moduleFixture.get(getModelToken(Role.name));
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

  const shared: Array<[string, string]> = [
    ['presidentMessagePage', 'Create'],
    ['presidentMessagePage', 'Read'],
    ['presidentMessagePage', 'Update'],
    ['workflowDefinitions', 'Create'],
    ['workflowDefinitions', 'Read'],
    ['workflowSteps', 'Create'],
    ['workflowSteps', 'Read'],
    ['workflowPolicies', 'Create'],
    ['workflowPolicies', 'Read'],
    ['workflowPolicies', 'Update'],
    ['revisions', 'Read'],
    ['publications', 'Read'],
  ];

  const publisherRole = await roleModel.create({
    name: { en: 'Publisher', ar: 'ناشر' },
    permissionIds: await grant([...shared, ['presidentMessagePage', 'Publish']]),
    isSystemRole: false,
  });
  // Edits, cannot publish — ADR-0069 D5's whole point.
  const editorRole = await roleModel.create({
    name: { en: 'Editor', ar: 'محرر' },
    permissionIds: await grant(shared),
    isSystemRole: false,
  });
  // Holds the generic history permission and nothing else. `revisions:Read`
  // alone must not open this page's past text (owner decision 2026-09-12).
  const outsiderRole = await roleModel.create({
    name: { en: 'Outsider', ar: 'غريب' },
    permissionIds: await grant([['revisions', 'Read']]),
    isSystemRole: false,
  });
  const approverRole = await roleModel.create({
    name: { en: 'Approver', ar: 'معتمد' },
    permissionIds: await grant([...shared, ['workflowInstances', 'Approve'], ['workflowInstances', 'Read']]),
    isSystemRole: false,
  });

  const password = 'correct horse battery staple';
  const passwordHash = await bcrypt.hash(password, 10);
  const people: Array<[Who, unknown]> = [
    ['publisher', publisherRole._id],
    ['editor', editorRole._id],
    ['approver', approverRole._id],
    ['outsider', outsiderRole._id],
  ];
  for (const [who, roleId] of people) {
    const email = `${who}@uaeaf.ae`;
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

beforeEach(async () => {
  await policyModel.deleteMany({});
});

// --- Building blocks -------------------------------------------------------

async function storeMessage(
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; appointmentId: string }> {
  const appointment = await appointmentModel.create({
    personId: new Types.ObjectId(),
    roleType: 'President',
    positionTitle: { ar: 'رئيس الاتحاد', en: 'President' },
    termStart: new Date('2025-01-01'),
    status: 'Active',
    displayOrder: 1,
  });

  const message = await messageModel.create({
    federationAppointmentId: appointment._id,
    // The portrait is required before publishing (ADR-0069 D5). A publish
    // test that did not set one would be testing the missing-portrait
    // refusal by accident; the tests that DO test it pass null explicitly.
    // A bare id is enough here: the usable-image check runs on the write
    // route, which this helper deliberately bypasses.
    featuredImageId: new Types.ObjectId(),
    heroTitle: { ar: 'كلمة الرئيس', en: "President's Message" },
    heroSubtitle: { ar: 'رئيس الاتحاد', en: 'President' },
    messageBody: { ar: richText('نص عربي'), en: richText('English body') },
    signatoryName: { ar: 'الاسم', en: 'The Name' },
    signatoryTitle: { ar: 'رئيس الاتحاد', en: 'President' },
    values: [],
    publicationState: 'Draft',
    ...overrides,
  });

  return { id: String(message._id), appointmentId: String(appointment._id) };
}

/** `updatedAt` as the editor would have read it, for the concurrency check. */
async function currentUpdatedAt(id: string): Promise<string> {
  const record = (await messageModel.findById(id).lean()) as unknown as { updatedAt: Date };
  return record.updatedAt.toISOString();
}

/** Not `async`: the supertest chain must be returned as-is so callers can
 *  `.expect()` on it. Wrapping it in a promise silently detaches the request
 *  from the test, and it then lands during whichever test is running next. */
function setPolicy(input: { workflowRequired: boolean; workflowDefinitionId?: string }) {
  return put('publisher', '/workflow-policies/presidentMessagePage/Edit', {
    workflowRequired: input.workflowRequired,
    workflowDefinitionId: input.workflowDefinitionId ?? null,
  });
}

async function defineOneStepWorkflow(): Promise<string> {
  const definition = await post('publisher', '/workflow-definitions', {
    name: { en: 'President message review', ar: 'مراجعة كلمة الرئيس' },
    entityType: 'presidentMessagePage',
  }).expect(201);
  await post('publisher', '/workflow-steps', {
    workflowDefinitionId: definition.body._id,
    sequenceOrder: 0,
    stepType: 'Sequential',
    assigneeIds: [ids.approver],
    requiredApprovals: 1,
  }).expect(201);
  return definition.body._id as string;
}

// --- The update route ------------------------------------------------------

/** Fields the request never mentioned, before and after the save. */
async function storedFields(id: string): Promise<Record<string, unknown>> {
  return (await messageModel.findById(id).lean()) as unknown as Record<string, unknown>;
}

describe('PATCH /president-message-page/:id', () => {
  it('saves only the fields the request carried', async () => {
    const { id } = await storeMessage();

    await patch('editor', `/president-message-page/${id}`, {
      pullQuote: { ar: 'اقتباس', en: 'A quote' },
    }).expect(200);

    const record = (await messageModel.findById(id).lean()) as unknown as Record<string, unknown>;
    expect(record.pullQuote).toEqual({ ar: 'اقتباس', en: 'A quote' });
    // Untouched by a request that never mentioned them.
    expect(record.heroTitle).toEqual({ ar: 'كلمة الرئيس', en: "President's Message" });
    expect(record.signatoryName).toEqual({ ar: 'الاسم', en: 'The Name' });
  });

  // `useDefineForClassFields` is on at ES2023, so every declared DTO field
  // exists on the instance as `undefined` whether or not the request carried
  // it. A key-presence test therefore reports every field as sent, and the
  // image branch turned that into an explicit null — a save of the title
  // silently deleted the president's portrait.
  it('leaves a field the request never mentioned exactly as it was', async () => {
    const portrait = new Types.ObjectId();
    const { id } = await storeMessage({
      featuredImageId: portrait,
      heroImageId: portrait,
      pullQuote: { ar: 'اقتباس', en: 'A quote' },
    });

    await patch('editor', `/president-message-page/${id}`, {
      heroTitle: { ar: 'عنوان جديد', en: 'A new title' },
    }).expect(200);

    const record = await storedFields(id);
    expect(String(record.featuredImageId)).toBe(String(portrait));
    expect(String(record.heroImageId)).toBe(String(portrait));
    expect(record.pullQuote).toEqual({ ar: 'اقتباس', en: 'A quote' });
    expect(record.heroTitle).toEqual({ ar: 'عنوان جديد', en: 'A new title' });
  });

  it('clears a field the request explicitly sent as null', async () => {
    const { id } = await storeMessage({ pullQuote: { ar: 'اقتباس', en: 'A quote' } });

    await patch('editor', `/president-message-page/${id}`, { pullQuote: null }).expect(200);

    expect((await storedFields(id)).pullQuote).toBeNull();
  });

  it('refuses italic in the Arabic body and accepts it in English', async () => {
    const { id } = await storeMessage();
    const italic = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'italic' }] }] },
      ],
    };

    await patch('editor', `/president-message-page/${id}`, {
      messageBody: { ar: italic, en: richText('fine') },
    }).expect(400);

    await patch('editor', `/president-message-page/${id}`, {
      messageBody: { ar: richText('نص'), en: italic },
    }).expect(200);
  });

  it('refuses a textAlign attribute, which is how justify is refused', async () => {
    const { id } = await storeMessage();
    const justified = {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textAlign: 'justify' }, content: [{ type: 'text', text: 'x' }] },
      ],
    };

    await patch('editor', `/president-message-page/${id}`, {
      messageBody: { ar: justified, en: richText('fine') },
    }).expect(400);
  });

  it('refuses an iconKey outside the approved twelve', async () => {
    const { id } = await storeMessage();

    await patch('editor', `/president-message-page/${id}`, {
      values: [
        {
          title: { ar: 'الرؤية', en: 'Vision' },
          description: { ar: 'وصف', en: 'Description' },
          iconKey: 'rocket',
          displayOrder: 1,
        },
      ],
    }).expect(400);

    await patch('editor', `/president-message-page/${id}`, {
      values: [
        {
          title: { ar: 'الرؤية', en: 'Vision' },
          description: { ar: 'وصف', en: 'Description' },
          iconKey: 'eye',
          displayOrder: 1,
        },
      ],
    }).expect(200);
  });

  it('never lets a client set publicationState', async () => {
    const { id } = await storeMessage();

    // `forbidNonWhitelisted` refuses a key the DTO does not declare — and
    // the update DTO declares neither publicationState nor the appointment
    // link on purpose (ADR-0069 D5).
    await patch('editor', `/president-message-page/${id}`, { publicationState: 'Live' }).expect(400);
    await patch('editor', `/president-message-page/${id}`, {
      federationAppointmentId: new Types.ObjectId().toString(),
    }).expect(400);
  });
});

// --- Direct publish --------------------------------------------------------

describe('POST /president-message-page/:id/publish', () => {
  it('creates a revision, a Live publication and an audit entry, together', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage();

    const response = await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(201);

    expect(response.body.revisionId).toBeDefined();
    expect(response.body.publishedAt).toBeDefined();

    const publication = (await publicationModel.findById(response.body.publicationId).lean()) as unknown as {
      status: string;
      workflowInstanceId: unknown;
    };
    expect(publication.status).toBe('Live');
    // Authorised by a permission, not by an approval — the null link records that.
    expect(publication.workflowInstanceId).toBeNull();

    const audit = await auditModel.countDocuments({
      entityType: 'presidentMessagePage',
      entityId: new Types.ObjectId(id),
      action: 'StatusChange',
    });
    expect(audit).toBeGreaterThan(0);
  });

  it('refuses an editor who may edit but not publish', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage();

    await patch('editor', `/president-message-page/${id}`, { pullQuote: { ar: 'ا', en: 'a' } }).expect(200);

    await post('editor', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(403);
  });

  it('refuses with workflowRequired when the policy demands approvals', async () => {
    await setPolicy({ workflowRequired: true, workflowDefinitionId: await defineOneStepWorkflow() }).expect(200);
    const { id } = await storeMessage();

    const response = await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(409);

    expect(response.body.code).toBe('workflowRequired');
  });

  it('refuses with publishingPolicyMissing when no policy exists — it never falls back to publishing', async () => {
    const { id } = await storeMessage();

    const response = await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(409);

    expect(response.body.code).toBe('publishingPolicyMissing');
  });

  it('refuses a stale expectedUpdatedAt', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage();
    const asRead = await currentUpdatedAt(id);

    // Someone else edits between the read and the publish.
    await patch('editor', `/president-message-page/${id}`, {
      heroTitle: { ar: 'عنوان آخر', en: 'Another title' },
    }).expect(200);

    const response = await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: asRead,
    }).expect(409);

    expect(response.body.code).toBe('staleRecord');
  });

  it('refuses while content still carries the pending-content marker', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage({
      pullQuote: { ar: 'اقتباس', en: '[[pending-content]] awaiting the canonical translation' },
    });

    const response = await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(409);

    expect(response.body.code).toBe('pendingContent');
    expect(response.body.message).toContain('pullQuote.en');
  });

  // The marker is a string, so the portrait cannot carry one. Without this
  // rule the page publishes with an empty hero frame (owner decision
  // 2026-09-12).
  it('refuses while the president portrait is missing', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage({ featuredImageId: null });

    const response = await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(409);

    expect(response.body.code).toBe('missingRequiredField');
    expect(response.body.message).toContain('featuredImageId');
  });

  it('names both gaps in one refusal rather than sending the editor back twice', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage({
      featuredImageId: null,
      pullQuote: { ar: 'اقتباس', en: '[[pending-content]]' },
    });

    const response = await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(409);

    expect(response.body.message).toContain('pullQuote.en');
    expect(response.body.message).toContain('featuredImageId');
  });
});

// --- Submission ------------------------------------------------------------

describe('POST /president-message-page/:id/submit', () => {
  it('opens a review through the definition the policy names, not one from the client', async () => {
    const definitionId = await defineOneStepWorkflow();
    await setPolicy({ workflowRequired: true, workflowDefinitionId: definitionId }).expect(200);
    const { id } = await storeMessage();

    const response = await post('editor', `/president-message-page/${id}/submit`).expect(201);

    expect(response.body.workflowInstanceId).toBeDefined();
    // The request body carried no definition at all — there is nowhere for a
    // client to name a softer workflow than the configured one (OUT-04).
    const state = await get('editor', `/president-message-page/${id}/editorial-state`).expect(200);
    expect(state.body.workflowStatus).toBe('InProgress');
  });

  it('refuses to submit when the policy does not require approvals', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage();

    await post('editor', `/president-message-page/${id}/submit`).expect(409);
  });

  // An approved review publishes. Content that may not be published may not
  // be sent for approval either, or the reviewer approves a page the server
  // will then refuse to put on the site.
  it('refuses to open a review while the portrait is missing', async () => {
    await setPolicy({ workflowRequired: true, workflowDefinitionId: await defineOneStepWorkflow() }).expect(200);
    const { id } = await storeMessage({ featuredImageId: null });

    const response = await post('editor', `/president-message-page/${id}/submit`).expect(409);

    expect(response.body.code).toBe('missingRequiredField');
  });

  it('stops a non-assignee editing the draft while a review is in progress', async () => {
    await setPolicy({ workflowRequired: true, workflowDefinitionId: await defineOneStepWorkflow() }).expect(200);
    const { id } = await storeMessage();
    await post('editor', `/president-message-page/${id}/submit`).expect(201);

    const refused = await patch('editor', `/president-message-page/${id}`, {
      heroTitle: { ar: 'تعديل', en: 'Edited' },
    }).expect(403);
    expect(refused.body.code).toBe('underReview');

    // The reviewer handling the step may still correct it.
    await patch('approver', `/president-message-page/${id}`, {
      heroTitle: { ar: 'تصحيح', en: 'Corrected' },
    }).expect(200);
  });
});

// --- Editorial state -------------------------------------------------------

describe('GET /president-message-page/:id/editorial-state', () => {
  it('offers publish to a publisher and submit to an editor, under the same policy', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage();

    const asPublisher = await get('publisher', `/president-message-page/${id}/editorial-state`).expect(200);
    expect(asPublisher.body.mode).toBe('direct');
    expect(asPublisher.body.availableActions).toContain('publish');

    const asEditor = await get('editor', `/president-message-page/${id}/editorial-state`).expect(200);
    expect(asEditor.body.availableActions).not.toContain('publish');
    // Direct-publish policy: an editor without Publish has no submit path
    // either — they save the draft and stop there (ADR-0069 D5's table).
    expect(asEditor.body.availableActions).not.toContain('submit');
    expect(asEditor.body.availableActions).toContain('save');
  });

  it('reports blocked, and offers no way to publish, when no policy exists', async () => {
    const { id } = await storeMessage();

    const state = await get('publisher', `/president-message-page/${id}/editorial-state`).expect(200);

    expect(state.body.mode).toBe('blocked');
    expect(state.body.blockedReason).toBe('noPolicy');
    expect(state.body.availableActions).not.toContain('publish');
    expect(state.body.availableActions).not.toContain('submit');
    // A draft can still be saved — being unable to publish is not being
    // unable to work.
    expect(state.body.canEdit).toBe(true);
  });

  it('names the fields still awaiting client content and withholds publish', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage({
      pullQuote: { ar: '[[pending-content]]', en: '[[pending-content]]' },
    });

    const state = await get('publisher', `/president-message-page/${id}/editorial-state`).expect(200);

    // Sorted for the assertion only: the walk reports in document order,
    // which follows `LocalizedTextSchema`'s own `en`-before-`ar` declaration.
    expect([...state.body.publishBlockers].sort((a, b) => a.field.localeCompare(b.field))).toEqual([
      { kind: 'pendingContent', field: 'pullQuote.ar' },
      { kind: 'pendingContent', field: 'pullQuote.en' },
    ]);
    expect(state.body.availableActions).not.toContain('publish');
  });

  // The readiness list is what the dashboard draws above the publish button,
  // so a missing portrait must appear there rather than only as a refusal
  // when the button is pressed (owner decision 2026-09-12).
  it('lists the missing portrait alongside the missing copy', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage({
      featuredImageId: null,
      pullQuote: { ar: '[[pending-content]]', en: 'A quote' },
    });

    const state = await get('publisher', `/president-message-page/${id}/editorial-state`).expect(200);

    expect(state.body.publishBlockers).toEqual([
      { kind: 'pendingContent', field: 'pullQuote.ar' },
      { kind: 'missingRequired', field: 'featuredImageId' },
    ]);
    expect(state.body.availableActions).not.toContain('publish');
  });
});

// --- The public projection -------------------------------------------------

describe('GET /president-message-page/current/public', () => {
  it('returns the published message of the sitting president, with its publication date', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage();
    await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(201);

    const response = await request(server()).get(apiPath('/president-message-page/current/public')).expect(200);

    expect(response.body.heroTitle).toEqual({ ar: 'كلمة الرئيس', en: "President's Message" });
    expect(response.body.publishedAt).toBeDefined();
    expect(response.body.messageBody.ar.type).toBe('doc');
  });

  it('exposes only the allowlisted fields — never the appointment link or the audit trail', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage();
    await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(201);

    const response = await request(server()).get(apiPath('/president-message-page/current/public')).expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [
        'featuredImage',
        'heroImage',
        'heroSubtitle',
        'heroTitle',
        'messageBody',
        'publishedAt',
        'pullQuote',
        'seo',
        'signatoryName',
        'signatoryTitle',
        'values',
        'valuesTitle',
      ].sort(),
    );
  });

  it('returns null when nothing is published for the sitting president', async () => {
    await messageModel.deleteMany({});
    await appointmentModel.deleteMany({});
    await storeMessage();

    const response = await request(server()).get(apiPath('/president-message-page/current/public')).expect(200);

    expect(response.body).toEqual({});
  });
});

// --- Version history -------------------------------------------------------

/** History without going through the publish path: this block is about how
 *  a long history is *read*, not how it comes to exist. */
async function seedRevisions(entityId: string, count: number): Promise<void> {
  await revisionModel.insertMany(
    Array.from({ length: count }, (_, index) => ({
      entityType: 'presidentMessagePage',
      entityId: new Types.ObjectId(entityId),
      versionNumber: index + 1,
      createdBy: new Types.ObjectId(ids.publisher),
      snapshotData: { heroTitle: { ar: `ع${index}`, en: `e${index}` } },
    })),
  );
}

describe('GET /revisions', () => {
  it('lists a record\'s versions newest first, with who saved each and what became of it', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage();

    await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(201);
    await patch('publisher', `/president-message-page/${id}`, {
      heroTitle: { ar: 'كلمة الرئيس ٢', en: "President's Message 2" },
    }).expect(200);
    await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(201);

    const response = await get(
      'publisher',
      `/revisions?entityType=presidentMessagePage&entityId=${id}`,
    ).expect(200);

    expect(response.body.items).toHaveLength(2);
    const [newest, oldest] = response.body.items;
    expect(newest.versionNumber).toBe(2);
    expect(oldest.versionNumber).toBe(1);
    expect(newest.state).toBe('Live');
    // Publishing version 2 retired version 1 — the history says so rather
    // than showing it as never published.
    expect(oldest.state).toBe('Archived');
    expect(newest.createdBy.name).toEqual({ en: 'publisher', ar: 'publisher' });
    expect(newest.publishedAt).toEqual(expect.any(String));
    // The list draws dates and names; it never carries the content.
    expect(newest).not.toHaveProperty('content');
    expect(newest).not.toHaveProperty('snapshotData');
  });

  it('reports a saved-but-never-published version as a draft', async () => {
    await setPolicy({ workflowRequired: true, workflowDefinitionId: await defineOneStepWorkflow() }).expect(200);
    const { id } = await storeMessage();
    await post('editor', `/president-message-page/${id}/submit`).expect(201);

    const response = await get(
      'editor',
      `/revisions?entityType=presidentMessagePage&entityId=${id}`,
    ).expect(200);

    expect(response.body.items[0].state).toBe('Draft');
    expect(response.body.items[0].publishedAt).toBeNull();
  });

  // `revisions:Read` says the caller may read history; it does not say whose
  // (owner decision 2026-09-12).
  it('refuses a caller holding revisions:Read but no Read on this entity type', async () => {
    await setPolicy({ workflowRequired: false }).expect(200);
    const { id } = await storeMessage();
    await post('publisher', `/president-message-page/${id}/publish`, {
      expectedUpdatedAt: await currentUpdatedAt(id),
    }).expect(201);

    await get('outsider', `/revisions?entityType=presidentMessagePage&entityId=${id}`).expect(403);
  });

  it('refuses an entity type outside the twelve rather than listing nothing', async () => {
    const { id } = await storeMessage();

    await get('publisher', `/revisions?entityType=contactMessages&entityId=${id}`).expect(400);
  });

  /**
   * The route is generic. This page will carry a handful of versions, but
   * `governanceDocuments` and `articles` reach hundreds — and an unbounded
   * list is a contract that cannot be narrowed later without breaking every
   * caller already reading it (owner decision 2026-09-12).
   */
  it('returns one page of twenty by default, and says how many there are in all', async () => {
    const { id } = await storeMessage();
    await seedRevisions(id, 25);

    const response = await get(
      'publisher',
      `/revisions?entityType=presidentMessagePage&entityId=${id}`,
    ).expect(200);

    expect(response.body.items).toHaveLength(20);
    expect(response.body.total).toBe(25);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(20);
  });

  it('pages through the history without repeating or skipping a version', async () => {
    const { id } = await storeMessage();
    await seedRevisions(id, 5);

    const first = await get(
      'publisher',
      `/revisions?entityType=presidentMessagePage&entityId=${id}&limit=2`,
    ).expect(200);
    const second = await get(
      'publisher',
      `/revisions?entityType=presidentMessagePage&entityId=${id}&limit=2&page=2`,
    ).expect(200);
    const third = await get(
      'publisher',
      `/revisions?entityType=presidentMessagePage&entityId=${id}&limit=2&page=3`,
    ).expect(200);

    // Newest first, and the ordering holds across the page boundary rather
    // than restarting per page.
    expect(first.body.items.map((row: { versionNumber: number }) => row.versionNumber)).toEqual([5, 4]);
    expect(second.body.items.map((row: { versionNumber: number }) => row.versionNumber)).toEqual([3, 2]);
    expect(third.body.items.map((row: { versionNumber: number }) => row.versionNumber)).toEqual([1]);
    expect(third.body.total).toBe(5);
  });

  it('returns an empty page rather than an error past the end of the history', async () => {
    const { id } = await storeMessage();
    await seedRevisions(id, 2);

    const response = await get(
      'publisher',
      `/revisions?entityType=presidentMessagePage&entityId=${id}&page=9`,
    ).expect(200);

    expect(response.body.items).toEqual([]);
    expect(response.body.total).toBe(2);
  });

  it('refuses a limit past the cap rather than scanning the whole collection', async () => {
    const { id } = await storeMessage();

    await get('publisher', `/revisions?entityType=presidentMessagePage&entityId=${id}&limit=500`).expect(400);
  });

  it('refuses a page below the first', async () => {
    const { id } = await storeMessage();

    await get('publisher', `/revisions?entityType=presidentMessagePage&entityId=${id}&page=0`).expect(400);
  });
});


describe('GET /revisions/:id', () => {
  it('returns only the fields the entity type allows a reader to see', async () => {
    const { id } = await storeMessage();
    // A version frozen before ADR-0069 D2 retired `goals`. Snapshots are
    // immutable, so filtering only on the way in would leave this row — and
    // every row already in the database — unfiltered.
    const revision = await revisionModel.create({
      entityType: 'presidentMessagePage',
      entityId: new Types.ObjectId(id),
      versionNumber: 1,
      createdBy: new Types.ObjectId(ids.publisher),
      snapshotData: {
        heroTitle: { ar: 'كلمة الرئيس', en: "President's Message" },
        goals: [{ title: 'a retired field' }],
        federationAppointmentId: new Types.ObjectId(),
        updatedBy: new Types.ObjectId(),
      },
    });

    const response = await get('publisher', `/revisions/${String(revision._id)}`).expect(200);

    expect(response.body.content).toEqual({
      heroTitle: { ar: 'كلمة الرئيس', en: "President's Message" },
    });
    expect(response.body).not.toHaveProperty('snapshotData');
    expect(response.body.versionNumber).toBe(1);
    expect(response.body.state).toBe('Draft');
  });

  it('refuses a caller holding revisions:Read but no Read on this entity type', async () => {
    const { id } = await storeMessage();
    const revision = await revisionModel.create({
      entityType: 'presidentMessagePage',
      entityId: new Types.ObjectId(id),
      versionNumber: 1,
      createdBy: new Types.ObjectId(ids.publisher),
      snapshotData: { heroTitle: { ar: 'ع', en: 'e' } },
    });

    await get('outsider', `/revisions/${String(revision._id)}`).expect(403);
  });
});

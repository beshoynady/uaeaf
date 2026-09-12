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
 *
 * Each test configures the policy it needs and builds its own record, so no
 * test depends on what another left behind.
 */

type Who = 'publisher' | 'editor' | 'approver';

let mongoServer: MongoMemoryServer;
let app: { close(): Promise<void>; getHttpServer(): unknown };
let request: typeof import('supertest').default;
let Types: typeof import('mongoose').Types;
let messageModel: import('mongoose').Model<{ _id: unknown }>;
let policyModel: import('mongoose').Model<unknown>;
let appointmentModel: import('mongoose').Model<{ _id: unknown }>;
let auditModel: import('mongoose').Model<unknown>;
let publicationModel: import('mongoose').Model<unknown>;

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
    expect([...state.body.pendingContent].sort()).toEqual(['pullQuote.ar', 'pullQuote.en']);
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

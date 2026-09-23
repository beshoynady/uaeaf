// Type-only, so erased: they load nothing before MONGODB_URI is set.
import type { ArticleDocument } from '../../src/modules/public-communication/articles/schemas/article.schema.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { apiPath } from './support/api-path.js';
import { configureTestApp } from './support/test-app.js';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

/**
 * A news item from a blank page to the public site, against a real ephemeral
 * MongoDB.
 *
 * This is the batch's most important guarantee, proved before any screen
 * exists to prove it through. Four people, deliberately separated, because the
 * separation is the thing being tested:
 *
 * - `editor` writes and submits, and can do neither of the other two.
 * - `approver` decides, and cannot publish what they approved.
 * - `publisher` publishes, and cannot approve.
 * - `visitor` is unauthenticated, and sees only what is actually live.
 */

type Who = 'editor' | 'approver' | 'publisher';

let mongoServer: MongoMemoryServer;
let app: { close(): Promise<void>; getHttpServer(): unknown };
let request: typeof import('supertest');
let Types: typeof import('mongoose').Types;
let articleModel: import('mongoose').Model<ArticleDocument>;
let auditModel: import('mongoose').Model<Record<string, unknown>>;
let publicationModel: import('mongoose').Model<Record<string, unknown>>;
let policyModel: import('mongoose').Model<Record<string, unknown>>;
let stepModel: import('mongoose').Model<Record<string, unknown>>;
let definitionModel: import('mongoose').Model<Record<string, unknown>>;
let instanceModel: import('mongoose').Model<Record<string, unknown>>;

const tokens = {} as Record<Who, string>;
const ids = {} as Record<Who, string>;

const server = () => app.getHttpServer() as Parameters<typeof request>[0];
const post = (who: Who, path: string, body: object = {}) =>
  request(server()).post(apiPath(path)).set({ Authorization: `Bearer ${tokens[who]}` }).send(body);
const patch = (who: Who, path: string, body: object) =>
  request(server()).patch(apiPath(path)).set({ Authorization: `Bearer ${tokens[who]}` }).send(body);
const authedGet = (who: Who, path: string) =>
  request(server()).get(apiPath(path)).set({ Authorization: `Bearer ${tokens[who]}` });
/** No credentials at all — the public site's own view. */
const visit = (path: string) => request(server()).get(apiPath(path));

const richText = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const draftFor = (slug: string, headline = 'Championship results') => ({
  title: { ar: 'نتائج البطولة', en: headline },
  slug,
  body: { ar: richText('فاز المنتخب بالمركز الأول.'), en: richText('The national team took first place.') },
  authorDisplayName: { ar: 'القسم الإعلامي', en: 'Media office' },
  topic: 'nationalTeam',
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-articles-publishing');

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
  const { Article } = await import('../../src/modules/public-communication/articles/schemas/article.schema.js');
  const { AuditLog } = await import('../../src/modules/workflow/audit-logs/schemas/audit-log.schema.js');
  const { Publication } = await import('../../src/modules/workflow/publications/schemas/publication.schema.js');
  const { WorkflowPolicy } = await import(
    '../../src/modules/workflow/workflow-policies/schemas/workflow-policy.schema.js'
  );
  const { WorkflowStep } = await import('../../src/modules/workflow/workflow-steps/schemas/workflow-step.schema.js');
  const { WorkflowDefinition } = await import(
    '../../src/modules/workflow/workflow-definitions/schemas/workflow-definition.schema.js'
  );
  const { WorkflowInstance } = await import(
    '../../src/modules/workflow/workflow-instances/schemas/workflow-instance.schema.js'
  );
  const bcrypt = (await import('bcryptjs')).default;

  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const nestApp = moduleFixture.createNestApplication();
  configureTestApp(nestApp);
  await nestApp.init();
  app = nestApp;

  articleModel = moduleFixture.get(getModelToken(Article.name));
  auditModel = moduleFixture.get(getModelToken(AuditLog.name));
  publicationModel = moduleFixture.get(getModelToken(Publication.name));
  policyModel = moduleFixture.get(getModelToken(WorkflowPolicy.name));
  stepModel = moduleFixture.get(getModelToken(WorkflowStep.name));
  definitionModel = moduleFixture.get(getModelToken(WorkflowDefinition.name));
  instanceModel = moduleFixture.get(getModelToken(WorkflowInstance.name));
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

  const reads: Array<[string, string]> = [
    ['articles', 'Read'],
    ['revisions', 'Read'],
    ['publications', 'Read'],
    ['workflowInstances', 'Read'],
  ];

  const roles: Array<[Who, Array<[string, string]>]> = [
    // Writes and submits. Holds neither Publish nor Approve — which is what
    // makes "editing does not imply publishing" a fact rather than a claim.
    ['editor', [...reads, ['articles', 'Create'], ['articles', 'Update'], ['articles', 'Delete']]],
    // Decides. Cannot publish what they approved.
    ['approver', [...reads, ['workflowInstances', 'Approve']]],
    // Publishes an approved revision, and nothing else.
    ['publisher', [...reads, ['articles', 'Publish']]],
  ];

  const password = 'correct horse battery staple';
  const passwordHash = await bcrypt.hash(password, 10);

  for (const [who, pairs] of roles) {
    const role = await roleModel.create({
      name: { en: who, ar: who },
      permissionIds: await grant(pairs),
      isSystemRole: false,
    });
    const email = `${who}@uaeaf.ae`;
    const user = await userModel.create({
      name: { en: who, ar: who },
      email,
      accountStatus: 'Active',
      roleIds: [role._id],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });
    ids[who] = user._id.toString();
    const login = await request(server()).post(apiPath('/auth/login')).send({ email, password }).expect(200);
    tokens[who] = login.body.accessToken as string;
  }
}, 180000);

afterAll(async () => {
  await app?.close();
  await mongoServer?.stop();
});

beforeEach(async () => {
  // Each test builds the world it needs, so none depends on what another left.
  await Promise.all([
    articleModel.deleteMany({}),
    auditModel.deleteMany({}),
    publicationModel.deleteMany({}),
    policyModel.deleteMany({}),
    stepModel.deleteMany({}),
    definitionModel.deleteMany({}),
    instanceModel.deleteMany({}),
  ]);
});

// --- Building blocks -------------------------------------------------------

/** The approval configuration an administrator would set through the policy
 *  screen: one definition, one step, the approver on it. */
const requireApproval = async (approvers: Who[] = ['approver'], requiredApprovals = 1): Promise<void> => {
  const definition = await definitionModel.create({
    name: { ar: 'اعتماد الأخبار', en: 'News approval' },
    entityType: 'articles',
    isActive: true,
  });
  await stepModel.create({
    workflowDefinitionId: definition._id,
    sequenceOrder: 1,
    stepType: 'Parallel',
    assigneeType: 'User',
    assigneeIds: approvers.map((who) => new Types.ObjectId(ids[who])),
    requiredApprovals,
  });
  await policyModel.create({
    entityType: 'articles',
    operation: 'Edit',
    workflowRequired: true,
    workflowDefinitionId: definition._id,
    allowHardDelete: false,
  });
};

/** Writes a draft and returns its id. */
const writeDraft = async (slug: string, headline?: string): Promise<string> => {
  const created = await post('editor', '/articles', draftFor(slug, headline)).expect(201);
  return created.body._id as string;
};

/** Walks a draft all the way to the public site and returns its id. */
const publishThroughReview = async (slug: string, headline?: string): Promise<string> => {
  const id = await writeDraft(slug, headline);
  const submitted = await post('editor', `/articles/${id}/submit`).expect(201);
  await post('approver', `/workflow-instances/${submitted.body.workflowInstanceId}/approve`).expect(201);
  await post('publisher', `/articles/${id}/publish-approved`).expect(201);
  return id;
};

// --- The path itself -------------------------------------------------------

describe('an article from draft to the public site', () => {
  it('travels the whole path, and appears only at the end of it', async () => {
    await requireApproval();

    const id = await writeDraft('championship-results-2026');

    // Written, and invisible. A draft is not a quiet publication.
    await visit('/articles/public').expect(200).expect((response) => {
      expect(response.body.items).toHaveLength(0);
    });
    await visit('/articles/public/championship-results-2026').expect(200).expect((response) => {
      expect(response.body).toEqual({});
    });

    const submitted = await post('editor', `/articles/${id}/submit`).expect(201);
    const instanceId = submitted.body.workflowInstanceId as string;

    // Under review, the draft belongs to the review: the author cannot edit
    // the text out from under the person reading it.
    await patch('editor', `/articles/${id}`, { slug: 'changed-mid-review' }).expect(403);
    await visit('/articles/public').expect(200).expect((response) => {
      expect(response.body.items).toHaveLength(0);
    });

    await post('approver', `/workflow-instances/${instanceId}/approve`).expect(201);

    // Approved is not published. This is the moment the batch exists to create.
    expect(await publicationModel.countDocuments({ entityType: 'articles' })).toBe(0);
    await visit('/articles/public').expect(200).expect((response) => {
      expect(response.body.items).toHaveLength(0);
    });

    const published = await post('publisher', `/articles/${id}/publish-approved`).expect(201);
    expect(published.body.publishedAt).toEqual(expect.any(String));

    const feed = await visit('/articles/public').expect(200);
    expect(feed.body.items).toHaveLength(1);
    expect(feed.body.items[0]).toMatchObject({
      slug: 'championship-results-2026',
      title: { en: 'Championship results', ar: 'نتائج البطولة' },
      topic: 'nationalTeam',
    });
    expect(feed.body.items[0].publishDate).toEqual(expect.any(String));
    // Derived from the body rather than stored, so the card and the meta
    // description cannot disagree with the article.
    expect(feed.body.items[0].excerpt.en).toBe('The national team took first place.');

    const one = await visit('/articles/public/championship-results-2026').expect(200);
    expect(one.body.body.ar).toEqual(draftFor('x').body.ar);
  }, 60000);

  it('publishes the text that was approved, not the draft as it stands now', async () => {
    await requireApproval();
    const id = await writeDraft('approved-text');
    const submitted = await post('editor', `/articles/${id}/submit`).expect(201);
    await post('approver', `/workflow-instances/${submitted.body.workflowInstanceId}/approve`).expect(201);

    // The review is over, so the draft is the editor's again — and they change
    // it before anyone publishes.
    await patch('editor', `/articles/${id}`, {
      title: { ar: 'عنوان لم يوافق عليه أحد', en: 'A headline nobody approved' },
    }).expect(200);

    await post('publisher', `/articles/${id}/publish-approved`).expect(201);

    const one = await visit('/articles/public/approved-text').expect(200);
    // The frozen revision wins. Publishing the current draft would put text on
    // the site that no approver ever read.
    expect(one.body.title.en).toBe('Championship results');
  }, 60000);
});

describe('who may do what', () => {
  it('refuses to publish for someone who may only edit', async () => {
    await requireApproval();
    const id = await writeDraft('editor-cannot-publish');
    const submitted = await post('editor', `/articles/${id}/submit`).expect(201);
    await post('approver', `/workflow-instances/${submitted.body.workflowInstanceId}/approve`).expect(201);

    await post('editor', `/articles/${id}/publish-approved`).expect(403);
    expect(await publicationModel.countDocuments({ entityType: 'articles' })).toBe(0);
  }, 60000);

  it('refuses to approve for someone who may only publish', async () => {
    await requireApproval();
    const id = await writeDraft('publisher-cannot-approve');
    const submitted = await post('editor', `/articles/${id}/submit`).expect(201);

    await post('publisher', `/workflow-instances/${submitted.body.workflowInstanceId}/approve`).expect(403);
  }, 60000);

  it('refuses a publish nobody approved', async () => {
    await requireApproval();
    const id = await writeDraft('never-reviewed');

    await post('publisher', `/articles/${id}/publish-approved`)
      .expect(409)
      .expect((response) => {
        expect(response.body.code).toBe('notApproved');
      });
  }, 60000);

  it('offers publishing to the publisher only once the approval is in', async () => {
    await requireApproval();
    const id = await writeDraft('actions-follow-state');

    const before = await authedGet('publisher', `/articles/${id}/editorial-state`).expect(200);
    expect(before.body.availableActions).not.toContain('publish');

    const submitted = await post('editor', `/articles/${id}/submit`).expect(201);
    await post('approver', `/workflow-instances/${submitted.body.workflowInstanceId}/approve`).expect(201);

    const after = await authedGet('publisher', `/articles/${id}/editorial-state`).expect(200);
    // The dashboard renders this list verbatim, so the publish button exists
    // exactly when the API would accept the publish.
    //
    // `publishApproved`, not `publish`. Under a policy that requires review
    // the two are different routes with different meanings: `publish` is
    // `publishDirect` and is REFUSED outright here, while `publish-approved`
    // publishes the revision the approvers actually saw. Offering `publish`
    // would be a button the API then rejects. This test asserted the older,
    // undivided action and was the last place still naming it.
    expect(after.body.availableActions).toContain('publishApproved');
    expect(after.body.availableActions).not.toContain('publish');
  }, 60000);
});

describe('the audit trail', () => {
  it('holds no word of any article', async () => {
    await requireApproval();
    await publishThroughReview('audited-article', 'A headline with distinctive words');
    await patch('editor', `/articles/${(await articleModel.findOne({ slug: 'audited-article' }))!._id}`, {
      title: { ar: 'عنوان معدَّل', en: 'An edited headline' },
    }).expect(200);

    const rows = await auditModel.find({ entityType: 'articles' }).lean<Record<string, unknown>[]>();
    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      const serialised = JSON.stringify({ previousValue: row.previousValue, newValue: row.newValue });
      // No body, no headline, in either language — the trail records the
      // decision, and `auditLogs` is readable over HTTP.
      expect(serialised).not.toContain('paragraph');
      expect(serialised).not.toContain('distinctive');
      expect(serialised).not.toContain('edited headline');
      expect(serialised).not.toContain('نتائج');
      expect(serialised).not.toContain('المنتخب');
    }
  }, 60000);

  it('still records who did what, and when', async () => {
    await requireApproval();
    await publishThroughReview('audited-actors');

    const rows = await auditModel.find({ entityType: 'articles' }).lean<Record<string, unknown>[]>();
    const actors = new Set(rows.map((row) => String(row.actorId)));

    expect(actors).toContain(ids.editor);
    expect(actors).toContain(ids.publisher);
    expect(rows.every((row) => row.timestamp instanceof Date)).toBe(true);
  }, 60000);
});

describe('hiding and deleting', () => {
  it('hides an archived article from the feed while its address keeps working', async () => {
    await requireApproval();
    const id = await publishThroughReview('archived-but-addressable');

    await patch('editor', `/articles/${id}/archived`, { archived: true }).expect(200);

    await visit('/articles/public').expect(200).expect((response) => {
      expect(response.body.items).toHaveLength(0);
    });
    // Still published. A link already shared, printed or indexed must not
    // start answering nothing because an editor tidied the listing.
    const one = await visit('/articles/public/archived-but-addressable').expect(200);
    expect(one.body.slug).toBe('archived-but-addressable');

    await patch('editor', `/articles/${id}/archived`, { archived: false }).expect(200);
    await visit('/articles/public').expect(200).expect((response) => {
      expect(response.body.items).toHaveLength(1);
    });
  }, 60000);

  it('frees a deleted article to have its address reused', async () => {
    const id = await writeDraft('reusable-address');

    // Refused while it is still there — the index and the check agree.
    await post('editor', '/articles', draftFor('reusable-address'))
      .expect(409)
      .expect((response) => {
        expect(response.body.code).toBe('slugTaken');
      });

    await request(server())
      .delete(apiPath(`/articles/${id}`))
      .set({ Authorization: `Bearer ${tokens.editor}` })
      .expect(200);

    // The unique index is partial on `archivedAt: null`, so a deleted article
    // does not hold its address hostage against a corrected replacement.
    await post('editor', '/articles', draftFor('reusable-address')).expect(201);
  }, 60000);
});

describe('narrowing the public feed by topic', () => {
  // The topic lives on the article row rather than in the publication's
  // revision, so re-filing a live story is a plain edit and takes effect on
  // the public feed at once — which is also why the filter reads the row.
  it('answers only the articles filed under the topic asked for', async () => {
    await requireApproval();

    const records = await publishThroughReview('a-new-national-record');
    await patch('editor', `/articles/${records}`, { topic: 'records' }).expect(200);
    const youth = await publishThroughReview('schools-programme-opens');
    await patch('editor', `/articles/${youth}`, { topic: 'youth' }).expect(200);

    await visit('/articles/public').expect(200).expect((response) => {
      expect(response.body.items).toHaveLength(2);
    });

    await visit('/articles/public?topic=records').expect(200).expect((response) => {
      expect(response.body.items.map((item: { slug: string }) => item.slug)).toEqual(['a-new-national-record']);
      // The count describes the narrowed feed, not the newsroom: a pager
      // built from it would otherwise offer pages that answer nothing.
      expect(response.body.total).toBe(1);
    });

    await visit('/articles/public?topic=youth').expect(200).expect((response) => {
      expect(response.body.items.map((item: { slug: string }) => item.slug)).toEqual(['schools-programme-opens']);
    });

    // A real topic nothing is filed under answers an empty feed, not a 404 —
    // the same shape `?tag=` already has for a label nobody used.
    await visit('/articles/public?topic=community').expect(200).expect((response) => {
      expect(response.body.items).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  }, 60000);

  it('refuses a topic outside the closed list rather than answering nothing', async () => {
    // Silently ignored, an invented topic would answer the whole feed and a
    // reader would believe every story was filed under it.
    await visit('/articles/public?topic=sport').expect(400);
  }, 60000);
});

describe('the source of a media round-up', () => {
  const coverage = (slug: string, extra: object = {}) => ({
    ...draftFor(slug),
    category: 'FederationInMedia',
    ...extra,
  });

  it('refuses a new round-up that does not say where it came from', async () => {
    await post('editor', '/articles', coverage('coverage-without-a-source'))
      .expect(400)
      .expect((response) => {
        const message = JSON.stringify(response.body.message);
        expect(message).toContain('sourceOutlet');
        expect(message).toContain('sourceUrl');
      });

    // Refused at the door, so nothing half-written is left behind.
    expect(await articleModel.findOne({ slug: 'coverage-without-a-source' })).toBeNull();
  }, 60000);

  it('refuses an address that is not an http(s) one', async () => {
    // `javascript:` in an href is a script the page runs on click, and the
    // public site prints this value as a link.
    await post(
      'editor',
      '/articles',
      coverage('coverage-with-a-script-link', {
        sourceOutlet: 'Gulf News',
        sourceUrl: 'javascript:alert(1)',
      }),
    ).expect(400);
  }, 60000);

  it('accepts a round-up that names its outlet, and publishes both fields', async () => {
    await requireApproval();

    const created = await post(
      'editor',
      '/articles',
      coverage('federation-covered-by-gulf-news', {
        sourceOutlet: '  Gulf News  ',
        sourceUrl: 'https://gulfnews.com/sport/athletics/uae-team-named',
      }),
    ).expect(201);

    const id = created.body._id as string;
    const submitted = await post('editor', `/articles/${id}/submit`).expect(201);
    await post('approver', `/workflow-instances/${submitted.body.workflowInstanceId}/approve`).expect(201);
    await post('publisher', `/articles/${id}/publish-approved`).expect(201);

    await visit('/articles/public/federation-covered-by-gulf-news').expect(200).expect((response) => {
      // Trimmed on the way in, so the attribution a reader sees is the name
      // and not the whitespace around it.
      expect(response.body.sourceOutlet).toBe('Gulf News');
      expect(response.body.sourceUrl).toBe('https://gulfnews.com/sport/athletics/uae-team-named');
    });
  }, 60000);

  it('asks an ordinary article for neither, and never shows an attribution on one', async () => {
    await requireApproval();
    await publishThroughReview('an-ordinary-general-article');

    await visit('/articles/public/an-ordinary-general-article').expect(200).expect((response) => {
      expect(response.body.category).toBe('General');
      expect(response.body.sourceOutlet).toBeNull();
      expect(response.body.sourceUrl).toBeNull();
    });
  }, 60000);

  it('keeps a round-up written before the fields existed publishable', async () => {
    await requireApproval();

    // The shape a backfill leaves behind: filed under the category, with no
    // attribution, because none was recorded when it was written.
    const id = await publishThroughReview('legacy-round-up');
    await articleModel.updateOne(
      { _id: id },
      { $set: { category: 'FederationInMedia', sourceOutlet: null, sourceUrl: null } },
    );

    // Still editable — the rule lives at creation, so a partial edit that
    // touches neither field is not held up by them.
    await patch('editor', `/articles/${id}`, { slug: 'legacy-round-up-renamed' }).expect(200);

    await visit('/articles/public/legacy-round-up-renamed').expect(200).expect((response) => {
      expect(response.body.category).toBe('FederationInMedia');
      expect(response.body.sourceOutlet).toBeNull();
    });
  }, 60000);
});

describe('the sanitiser, at the HTTP boundary', () => {
  it('refuses a body carrying a script node or an event handler', async () => {
    const hostile = {
      type: 'doc',
      content: [
        { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
        { type: 'paragraph', attrs: { onerror: 'alert(1)' }, content: [{ type: 'text', text: 'x' }] },
      ],
    };

    await post('editor', '/articles', {
      ...draftFor('hostile-body'),
      body: { ar: hostile, en: hostile },
    }).expect(400);

    // Nothing was stored, so there is nothing for a later step to have to
    // strip: refusal at the door rather than cleaning after entry.
    expect(await articleModel.countDocuments({})).toBe(0);
  }, 60000);

  it('refuses a javascript: link inside an otherwise ordinary body', async () => {
    const body = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'click', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] },
          ],
        },
      ],
    };

    await post('editor', '/articles', { ...draftFor('hostile-link'), body: { ar: body, en: body } }).expect(400);
    expect(await articleModel.countDocuments({})).toBe(0);
  }, 60000);
});

describe('the sitemap feed', () => {
  it('lists live addresses and nothing else', async () => {
    await requireApproval();
    await publishThroughReview('listed-in-sitemap');
    await writeDraft('draft-not-in-sitemap');

    const sitemap = await visit('/articles/public-sitemap').expect(200);

    // Chapter 14 §13: content in any state other than published must not
    // appear in any sitemap.
    expect(sitemap.body.map((entry: { slug: string }) => entry.slug)).toEqual(['listed-in-sitemap']);
    expect(sitemap.body[0].publishDate).toEqual(expect.any(String));
  }, 60000);
});

import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-workflow');
});

afterAll(async () => {
  await mongoServer.stop();
});

describe('Workflow engine (e2e)', () => {
  it('runs the golden path, a reject/resubmit/approve cycle, concurrency rejection, and the HardDelete gate against a real, ephemeral MongoDB', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const request = (await import('supertest')).default;
    const { Types } = await import('mongoose');

    const { AppModule } = await import('../../src/app.module.js');
    const { Role } = await import('../../src/modules/platform-administration/roles/schemas/role.schema.js');
    const { Permission } = await import('../../src/modules/platform-administration/permissions/schemas/permission.schema.js');
    const { User } = await import('../../src/modules/platform-administration/users/schemas/user.schema.js');
    const { Publication } = await import('../../src/modules/workflow/publications/schemas/publication.schema.js');
    const { WorkflowActionHistory } = await import(
      '../../src/modules/workflow/workflow-action-history/schemas/workflow-action-history.schema.js'
    );
    const { AuditLog } = await import('../../src/modules/workflow/audit-logs/schemas/audit-log.schema.js');
    const { RevisionsService } = await import('../../src/modules/workflow/revisions/revisions.service.js');
    const bcrypt = (await import('bcryptjs')).default;

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const roleModel = moduleFixture.get(getModelToken(Role.name));
    const permissionModel = moduleFixture.get(getModelToken(Permission.name));
    const userModel = moduleFixture.get(getModelToken(User.name));
    const publicationModel = moduleFixture.get(getModelToken(Publication.name));
    const actionHistoryModel = moduleFixture.get(getModelToken(WorkflowActionHistory.name));
    const auditLogModel = moduleFixture.get(getModelToken(AuditLog.name));
    const revisionsService = moduleFixture.get(RevisionsService);

    // --- Seed an operator with every permission this flow needs ---
    const resourceActions: Array<[string, string]> = [
      ['workflowDefinitions', 'Create'],
      ['workflowDefinitions', 'Read'],
      ['workflowSteps', 'Create'],
      ['revisions', 'Create'],
      ['revisions', 'Read'],
      ['workflowInstances', 'Create'],
      ['workflowInstances', 'Read'],
      ['workflowInstances', 'Approve'],
      ['workflowInstances', 'Update'],
      ['publications', 'Read'],
    ];
    const permissionIds = await Promise.all(
      resourceActions.map(async ([resourceType, action]) => {
        const permission = await permissionModel.create({
          name: { en: `${action} ${resourceType}`, ar: `${action} ${resourceType}` },
          resourceType,
          action,
        });
        return permission._id;
      }),
    );
    const operatorRole = await roleModel.create({
      name: { en: 'Workflow Operator', ar: 'مشغل سير العمل' },
      permissionIds,
      isSystemRole: false,
    });
    const passwordHash = await bcrypt.hash('correct horse battery staple', 10);
    const operator = await userModel.create({
      name: { en: 'Workflow Operator', ar: 'مشغل سير العمل' },
      email: 'operator@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [operatorRole._id],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'operator@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const token = login.body.accessToken as string;
    const auth = () => ({ Authorization: `Bearer ${token}` });

    // --- One-step Sequential definition; the operator is their own
    // assignee, directly exercising the confirmed self-approval-via-
    // assigneeIds rule (BE-PLAN-010 Week 2 §9) ---
    const definitionResponse = await request(app.getHttpServer())
      .post('/workflow-definitions')
      .set(auth())
      .send({ name: { en: 'Article Approval', ar: 'اعتماد المقالة' }, entityType: 'articles' })
      .expect(201);
    const workflowDefinitionId = definitionResponse.body._id as string;

    await request(app.getHttpServer())
      .post('/workflow-steps')
      .set(auth())
      .send({
        workflowDefinitionId,
        sequenceOrder: 0,
        stepType: 'Sequential',
        assigneeIds: [operator._id.toString()],
        requiredApprovals: 1,
      })
      .expect(201);

    // ============================================================
    // Scenario 1: golden path — Draft (implicit) -> Submit -> Approve
    // -> auto-publish, for entity A.
    // ============================================================
    const entityIdA = new Types.ObjectId().toString();

    const revisionAResponse = await request(app.getHttpServer())
      .post('/revisions')
      .set(auth())
      .send({ entityType: 'articles', entityId: entityIdA, snapshotData: { title: 'Draft title A' } })
      .expect(201);
    const revisionAId = revisionAResponse.body._id as string;
    expect(revisionAResponse.body.versionNumber).toBe(1);

    const instanceAResponse = await request(app.getHttpServer())
      .post('/workflow-instances')
      .set(auth())
      .send({ workflowDefinitionId, entityType: 'articles', entityId: entityIdA, revisionId: revisionAId })
      .expect(201);
    const instanceAId = instanceAResponse.body._id as string;
    expect(instanceAResponse.body.status).toBe('InProgress');

    const approveAResponse = await request(app.getHttpServer())
      .post(`/workflow-instances/${instanceAId}/approve`)
      .set(auth())
      .send({})
      .expect(201);
    expect(approveAResponse.body.status).toBe('Approved');
    expect(approveAResponse.body.currentStepId).toBeNull();

    const publicationsForA = await publicationModel.find({
      entityType: 'articles',
      entityId: new Types.ObjectId(entityIdA),
    });
    expect(publicationsForA).toHaveLength(1);
    expect(publicationsForA[0].status).toBe('Live');
    expect(publicationsForA[0].revisionId.toString()).toBe(revisionAId);

    const historyForA = await actionHistoryModel.find({ workflowInstanceId: new Types.ObjectId(instanceAId) });
    expect(historyForA.map((h: { action: string }) => h.action).sort()).toEqual(['Approved', 'Submitted']);

    // Dual audit logging (§11): a StatusChange row targets the CONTENT
    // entity (articles/entityIdA), not workflowInstances itself.
    const statusChangesForA = await auditLogModel.find({
      action: 'StatusChange',
      entityType: 'articles',
      entityId: new Types.ObjectId(entityIdA),
    });
    expect(statusChangesForA.length).toBeGreaterThanOrEqual(2); // submit + final approval

    // ============================================================
    // Scenario 2: concurrency rejection, then reject -> resubmit ->
    // approve, for entity B.
    // ============================================================
    const entityIdB = new Types.ObjectId().toString();
    const revisionB1Response = await request(app.getHttpServer())
      .post('/revisions')
      .set(auth())
      .send({ entityType: 'articles', entityId: entityIdB, snapshotData: { title: 'Draft title B v1' } })
      .expect(201);
    const revisionB1Id = revisionB1Response.body._id as string;

    const instanceBResponse = await request(app.getHttpServer())
      .post('/workflow-instances')
      .set(auth())
      .send({ workflowDefinitionId, entityType: 'articles', entityId: entityIdB, revisionId: revisionB1Id })
      .expect(201);
    const instanceBId = instanceBResponse.body._id as string;

    // A second submission for the SAME entity while one is still active
    // must be rejected (BE-PLAN-010 Week 2 §4).
    await request(app.getHttpServer())
      .post('/workflow-instances')
      .set(auth())
      .send({ workflowDefinitionId, entityType: 'articles', entityId: entityIdB, revisionId: revisionB1Id })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/workflow-instances/${instanceBId}/reject`)
      .set(auth())
      .send({ reason: 'Needs a stronger lede' })
      .expect(201);

    const revisionB2Response = await request(app.getHttpServer())
      .post('/revisions')
      .set(auth())
      .send({ entityType: 'articles', entityId: entityIdB, snapshotData: { title: 'Draft title B v2' } })
      .expect(201);
    const revisionB2Id = revisionB2Response.body._id as string;
    expect(revisionB2Response.body.versionNumber).toBe(2);

    const resubmitResponse = await request(app.getHttpServer())
      .post(`/workflow-instances/${instanceBId}/resubmit`)
      .set(auth())
      .send({ revisionId: revisionB2Id })
      .expect(201);
    expect(resubmitResponse.body.status).toBe('InProgress');
    // Rejected keeps the SAME instance — it does not spawn a new one.
    expect(resubmitResponse.body._id).toBe(instanceBId);

    await request(app.getHttpServer())
      .post(`/workflow-instances/${instanceBId}/approve`)
      .set(auth())
      .send({})
      .expect(201);

    const publicationsForB = await publicationModel.find({
      entityType: 'articles',
      entityId: new Types.ObjectId(entityIdB),
    });
    expect(publicationsForB).toHaveLength(1);
    expect(publicationsForB[0].revisionId.toString()).toBe(revisionB2Id);

    const rejectedHistoryForB = await actionHistoryModel.find({
      workflowInstanceId: new Types.ObjectId(instanceBId),
      action: 'Rejected',
    });
    expect(rejectedHistoryForB).toHaveLength(1);
    expect(rejectedHistoryForB[0].reason).toBe('Needs a stronger lede');

    // ============================================================
    // Scenario 3: HardDelete gate (§10) — blocked once ANY revision
    // exists, called the way a future entity module will call it:
    // through RevisionsService directly (no dedicated HTTP route this
    // week — see the Week 2 completion report).
    // ============================================================
    await expect(
      revisionsService.assertHardDeletable('articles', new Types.ObjectId(entityIdA)),
    ).rejects.toThrow();

    const untouchedEntityId = new Types.ObjectId();
    await expect(
      revisionsService.assertHardDeletable('articles', untouchedEntityId),
    ).resolves.toBeUndefined();

    await app.close();
  }, 60000);
});

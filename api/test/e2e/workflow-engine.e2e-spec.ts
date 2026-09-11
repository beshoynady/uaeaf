import { MongoMemoryServer } from 'mongodb-memory-server';
import { apiPath } from './support/api-path.js';
import { configureTestApp } from './support/test-app.js';

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
  it('runs the golden path, a reject/resubmit/approve cycle, concurrency rejection, revision ownership, simultaneous revision numbering, and the HardDelete gate against a real, ephemeral MongoDB', async () => {
    const { Test } = await import('@nestjs/testing');
    const { INestApplication } = await import('@nestjs/common');
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
    const { VisionMissionPage } = await import(
      '../../src/modules/federation-governance/vision-mission-page/schemas/vision-mission-page.schema.js'
    );
    const bcrypt = (await import('bcryptjs')).default;

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    configureTestApp(app);
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
      .post(apiPath('/auth/login'))
      .send({ email: 'operator@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const token = login.body.accessToken as string;
    const auth = () => ({ Authorization: `Bearer ${token}` });

    // A revision freezes a record that exists, so every scenario starts
    // from a stored page rather than an invented id.
    const pageModel = moduleFixture.get(getModelToken(VisionMissionPage.name));
    const storePage = async (visionEn: string): Promise<string> => {
      const page = await pageModel.create({
        federationId: new Types.ObjectId(),
        heroTitle: { ar: 'الرؤية والرسالة', en: 'Vision and Mission' },
        heroSubtitle: { ar: 'ما نعمل من أجله', en: 'What we work towards' },
        visionText: { ar: 'الرؤية', en: visionEn },
        missionText: { ar: 'الرسالة', en: 'Mission' },
        publicationState: 'Draft',
        createdBy: operator._id,
      });
      return page._id.toString();
    };

    // --- One-step Sequential definition; the operator is their own
    // assignee, directly exercising the confirmed self-approval-via-
    // assigneeIds rule (BE-PLAN-010 Week 2 §9) ---
    const definitionResponse = await request(app.getHttpServer())
      .post(apiPath('/workflow-definitions'))
      .set(auth())
      .send({ name: { en: 'Vision and Mission Approval', ar: 'اعتماد الرؤية والرسالة' }, entityType: 'visionMissionPage' })
      .expect(201);
    const workflowDefinitionId = definitionResponse.body._id as string;

    await request(app.getHttpServer())
      .post(apiPath('/workflow-steps'))
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
    // Scenario 0: the snapshot is the server's to take. What is published
    // is what visitors read, so the caller names the record and the
    // server freezes what is stored.
    // ============================================================
    const entityIdA = await storePage('Vision A');

    await request(app.getHttpServer())
      .post(apiPath('/revisions'))
      .set(auth())
      .send({
        entityType: 'visionMissionPage',
        entityId: entityIdA,
        snapshotData: { visionText: { ar: 'نص لم يراجعه أحد', en: 'Text nobody reviewed' } },
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(apiPath('/revisions'))
      .set(auth())
      .send({ entityType: 'visionMissionPage', entityId: new Types.ObjectId().toString() })
      .expect(404);

    // An archived record is off the site, so there is nothing of it to review.
    const archivedEntityId = await storePage('Archived vision');
    await pageModel.updateOne(
      { _id: archivedEntityId },
      { $set: { archivedAt: new Date(), archivedBy: operator._id } },
    );
    await request(app.getHttpServer())
      .post(apiPath('/revisions'))
      .set(auth())
      .send({ entityType: 'visionMissionPage', entityId: archivedEntityId })
      .expect(404);

    // A type with no collection yet has nothing to freeze.
    await request(app.getHttpServer())
      .post(apiPath('/revisions'))
      .set(auth())
      .send({ entityType: 'articles', entityId: new Types.ObjectId().toString() })
      .expect(400);

    // ============================================================
    // Scenario 1: golden path — Draft (implicit) -> Submit -> Approve
    // -> auto-publish, for entity A.
    // ============================================================
    const revisionAResponse = await request(app.getHttpServer())
      .post(apiPath('/revisions'))
      .set(auth())
      .send({ entityType: 'visionMissionPage', entityId: entityIdA })
      .expect(201);
    const revisionAId = revisionAResponse.body._id as string;
    expect(revisionAResponse.body.versionNumber).toBe(1);
    expect(revisionAResponse.body.snapshotData.visionText.en).toBe('Vision A');
    expect(revisionAResponse.body.snapshotData).not.toHaveProperty('createdBy');

    const instanceAResponse = await request(app.getHttpServer())
      .post(apiPath('/workflow-instances'))
      .set(auth())
      .send({ workflowDefinitionId, entityType: 'visionMissionPage', entityId: entityIdA, revisionId: revisionAId })
      .expect(201);
    const instanceAId = instanceAResponse.body._id as string;
    expect(instanceAResponse.body.status).toBe('InProgress');

    const approveAResponse = await request(app.getHttpServer())
      .post(apiPath(`/workflow-instances/${instanceAId}/approve`))
      .set(auth())
      .send({})
      .expect(201);
    expect(approveAResponse.body.status).toBe('Approved');
    expect(approveAResponse.body.currentStepId).toBeNull();

    const publicationsForA = await publicationModel.find({
      entityType: 'visionMissionPage',
      entityId: new Types.ObjectId(entityIdA),
    });
    expect(publicationsForA).toHaveLength(1);
    expect(publicationsForA[0].status).toBe('Live');
    expect(publicationsForA[0].revisionId.toString()).toBe(revisionAId);

    const historyForA = await actionHistoryModel.find({ workflowInstanceId: new Types.ObjectId(instanceAId) });
    expect(historyForA.map((h: { action: string }) => h.action).sort()).toEqual(['Approved', 'Submitted']);

    // Dual audit logging (§11): a StatusChange row targets the CONTENT
    // entity (visionMissionPage/entityIdA), not workflowInstances itself.
    const statusChangesForA = await auditLogModel.find({
      action: 'StatusChange',
      entityType: 'visionMissionPage',
      entityId: new Types.ObjectId(entityIdA),
    });
    expect(statusChangesForA.length).toBeGreaterThanOrEqual(2); // submit + final approval

    // What visitors are served is exactly what was reviewed.
    const publicA = await request(app.getHttpServer())
      .get(apiPath(`/vision-mission-page/${entityIdA}/public`))
      .expect(200);
    expect(publicA.body.visionText.en).toBe('Vision A');
    expect(publicA.body).not.toHaveProperty('createdBy');

    // ============================================================
    // Scenario 2: concurrency rejection, then reject -> resubmit ->
    // approve, for entity B.
    // ============================================================
    const entityIdB = await storePage('Vision B, first draft');
    const revisionB1Response = await request(app.getHttpServer())
      .post(apiPath('/revisions'))
      .set(auth())
      .send({ entityType: 'visionMissionPage', entityId: entityIdB })
      .expect(201);
    const revisionB1Id = revisionB1Response.body._id as string;

    // Approval publishes the instance's revision as the record's public
    // content, so a revision of A submitted for B would put A's text on B's
    // page.
    await request(app.getHttpServer())
      .post(apiPath('/workflow-instances'))
      .set(auth())
      .send({ workflowDefinitionId, entityType: 'visionMissionPage', entityId: entityIdB, revisionId: revisionAId })
      .expect(400);

    await request(app.getHttpServer())
      .post(apiPath('/workflow-instances'))
      .set(auth())
      .send({
        workflowDefinitionId,
        entityType: 'visionMissionPage',
        entityId: entityIdB,
        revisionId: new Types.ObjectId().toString(),
      })
      .expect(404);

    const instanceBResponse = await request(app.getHttpServer())
      .post(apiPath('/workflow-instances'))
      .set(auth())
      .send({ workflowDefinitionId, entityType: 'visionMissionPage', entityId: entityIdB, revisionId: revisionB1Id })
      .expect(201);
    const instanceBId = instanceBResponse.body._id as string;

    // A second submission for the SAME entity while one is still active
    // must be rejected (BE-PLAN-010 Week 2 §4).
    await request(app.getHttpServer())
      .post(apiPath('/workflow-instances'))
      .set(auth())
      .send({ workflowDefinitionId, entityType: 'visionMissionPage', entityId: entityIdB, revisionId: revisionB1Id })
      .expect(409);

    await request(app.getHttpServer())
      .post(apiPath(`/workflow-instances/${instanceBId}/reject`))
      .set(auth())
      .send({ reason: 'Needs a stronger lede' })
      .expect(201);

    // The editor answers the rejection in the record; the next revision
    // freezes the record as it now stands.
    await pageModel.updateOne({ _id: entityIdB }, { $set: { 'visionText.en': 'Vision B, second draft' } });
    const revisionB2Response = await request(app.getHttpServer())
      .post(apiPath('/revisions'))
      .set(auth())
      .send({ entityType: 'visionMissionPage', entityId: entityIdB })
      .expect(201);
    const revisionB2Id = revisionB2Response.body._id as string;
    expect(revisionB2Response.body.versionNumber).toBe(2);
    expect(revisionB2Response.body.snapshotData.visionText.en).toBe('Vision B, second draft');

    // The rejected version is still exactly what was rejected.
    const revisionB1Again = await request(app.getHttpServer())
      .get(apiPath(`/revisions/${revisionB1Id}`))
      .set(auth())
      .expect(200);
    expect(revisionB1Again.body.snapshotData.visionText.en).toBe('Vision B, first draft');

    // Resubmission is held to the same rule as the first submission.
    await request(app.getHttpServer())
      .post(apiPath(`/workflow-instances/${instanceBId}/resubmit`))
      .set(auth())
      .send({ revisionId: revisionAId })
      .expect(400);

    const resubmitResponse = await request(app.getHttpServer())
      .post(apiPath(`/workflow-instances/${instanceBId}/resubmit`))
      .set(auth())
      .send({ revisionId: revisionB2Id })
      .expect(201);
    expect(resubmitResponse.body.status).toBe('InProgress');
    // Rejected keeps the SAME instance — it does not spawn a new one.
    expect(resubmitResponse.body._id).toBe(instanceBId);

    await request(app.getHttpServer())
      .post(apiPath(`/workflow-instances/${instanceBId}/approve`))
      .set(auth())
      .send({})
      .expect(201);

    const publicationsForB = await publicationModel.find({
      entityType: 'visionMissionPage',
      entityId: new Types.ObjectId(entityIdB),
    });
    expect(publicationsForB).toHaveLength(1);
    expect(publicationsForB[0].revisionId.toString()).toBe(revisionB2Id);

    const publicB = await request(app.getHttpServer())
      .get(apiPath(`/vision-mission-page/${entityIdB}/public`))
      .expect(200);
    expect(publicB.body.visionText.en).toBe('Vision B, second draft');

    const rejectedHistoryForB = await actionHistoryModel.find({
      workflowInstanceId: new Types.ObjectId(instanceBId),
      action: 'Rejected',
    });
    expect(rejectedHistoryForB).toHaveLength(1);
    expect(rejectedHistoryForB[0].reason).toBe('Needs a stronger lede');

    // ============================================================
    // Scenario 3: three submissions of one record at the same moment each
    // keep their own version number — a number names one exact text.
    // ============================================================
    const entityIdC = await storePage('Vision C');
    const simultaneous = await Promise.all(
      [1, 2, 3].map(() =>
        request(app.getHttpServer())
          .post(apiPath('/revisions'))
          .set(auth())
          .send({ entityType: 'visionMissionPage', entityId: entityIdC }),
      ),
    );
    expect(simultaneous.map((response) => response.status)).toEqual([201, 201, 201]);
    expect(simultaneous.map((response) => response.body.versionNumber as number).sort((a, b) => a - b)).toEqual([
      1, 2, 3,
    ]);

    // ============================================================
    // Scenario 4: HardDelete gate (§10) — blocked once ANY revision
    // exists, called the way a future entity module will call it:
    // through RevisionsService directly (no dedicated HTTP route this
    // week — see the Week 2 completion report).
    // ============================================================
    await expect(
      revisionsService.assertHardDeletable('visionMissionPage', new Types.ObjectId(entityIdA)),
    ).rejects.toThrow();

    const untouchedEntityId = new Types.ObjectId();
    await expect(
      revisionsService.assertHardDeletable('visionMissionPage', untouchedEntityId),
    ).resolves.toBeUndefined();

    await app.close();
  }, 60000);
});

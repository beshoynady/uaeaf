# خطة تنفيذ — نظام الأخبار والموافقات (UAEAF)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** مسار كامل يعمل من طرف لطرف — كتابة خبر، إرساله للمراجعة، الموافقة عليه حسب سياسة عامة قابلة للضبط، نشره بفعل صريح منفصل، ثم ظهوره على صفحتي الموقع العام.

**Architecture:** لا محرّك موافقات جديد. محرّك `workflow/*` القائم يُعاد توجيهه بتغييرين فقط: فصل النشر عن الاعتماد على مستوى المحرّك العام، وعلم يميّز «طلب تعديل» عن «رفض نهائي» على فعل المراجعة. فوقه يُبنى كيان `articles` كأي كيان محكوم بالـworkflow، بنفس قالب `governanceDocuments`. الداشبورد يستعمل بنية التحرير العامة القائمة (`EDITORIAL_ENTITIES` + المسارات العامة) بإضافة سطر واحد للسجل، ثم خمس شاشات جديدة. الموقع العام يقرأ عبر `publications → revisions.snapshotData` حصرًا.

**Tech Stack:** NestJS 11 · Mongoose · Jest (ESM) · Next.js (App Router) · next-intl · TipTap 3.31.3 · Tailwind + tokens المشروع

**Spec:** طلب المالك في محادثة 2026-09-20 + تقرير المرحلة ٠ + قرارات المالك الخمسة النهائية في الرسالة نفسها.

---

## Global Constraints

هذه القيود تسري على **كل** مهمة أدناه بلا استثناء. لا تُكرَّر داخل المهام.

- **Git ممنوع تمامًا.** لا `git add`، ولا `commit`، ولا أي أمر يبدأ بـ`git`. كل التعديلات تبقى غير ملتزَمة. أوامر `git add` تُكتب نصًّا في §«أوامر الالتزام» آخر هذا الملف ليشغّلها المالك بنفسه. هذا يلغي خطوة «Commit» التي يفترضها قالب المهام عادةً.
- **تشغيل الاختبارات:** `npx jest` يفشل كليًا في هذا المستودع (ESM). الاستدعاء الوحيد الصحيح من داخل `api/` هو:
  `npm test -- --runInBand <path>`
  الخيار `--runInBand` إلزامي: بالإعداد الافتراضي `maxWorkers: 2` تتزاحم المجموعات المعتمدة على قاعدة بيانات وتسقط أربع منها لأسباب لا علاقة لها بالكود.
  الـe2e: `npm run test:e2e -- --runInBand <name>`.
- **فحص الأنواع:** `npx tsc --noEmit` من داخل `api/`. **ممنوع** تشغيل `nest build` بينما خادم `--watch` يعمل — يترك الـAPI مربوطًا بلا شيء (حدث مرتين: 09-15 و09-16).
- **دوال السهم:** كل دالة جديدة دالة سهم. كل ملف يُلمس تُحوَّل دواله إلى أسهم، عدا: توابع الأصناف (NestJS خصوصًا)، الدوال المعتمدة على `this` ديناميكي، المولّدات، التحميل الزائد، ما يستعمل `arguments`، وما يُستدعى قبل تعريفه أثناء تحميل الوحدة.
- **التعليقات بالإنجليزية وتشرح الـWHY** لا الـWHAT، ولا تسرد تاريخ التغييرات.
- **TDD إلزامي لكل منطق backend:** اختبار أحمر أولًا، يُشغَّل ويُرى فاشلًا، ثم أقل تنفيذ يُنجحه.
- **لا قيم تصميمية مخترعة.** كل لون/مسافة/حجم/نصف قطر من tokens النظام القائم. شاشات الداشبورد تتبع نمط شاشات الرعاة (`components/admin/sponsor-relations/`).
- **`auditLogs` يُستهلك فقط.** لا يُكتب فيه متن Tiptap أبدًا. كل مسار كتابة للخبر يحمل `@SkipAuditLog()` ويكتب صفه بنفسه.
- **ممنوع:** أي كيان لاعب/موسم/بطولة/تسجيل/نتيجة · أي ربط بين الخبر ولوحة نتائج · قسم النتائج اليدوي على الصفحة الرئيسية · دفعة الحركات ADR-0087 بأي صورة · تصنيفات الأخبار والوسوم والتعليقات والمشاركة الاجتماعية المتقدمة.
- **مواضع محمية لا تُلمس:** دفعات الرعاة والشركاء والعضويات والشريط والهيرو · منطق الصلاحيات القائم ونمطه · `LocalizedText` ومسار رفع الوسائط ومنع SVG.
- **لا Figma إلا في المرحلة ٣**، وبعد استدعاء مهارة `figma:figma-design-to-code` **قبل** أي `get_design_context`. ممنوع `figma:figma-use` وأي كتابة على Figma.

---

## قرارات مثبتة تسري على الخطة كلها

| # | القرار | المصدر |
|---|---|---|
| D1 | النشر فعل مستقل عن الاعتماد، على مستوى المحرّك العام لكل الأنواع الاثني عشر. بوابة الاعتماد تبقى اختيارية عبر `workflowPolicies.workflowRequired` | قرار المالك ١ |
| D2 | حالة الخبر ثنائية فقط. الأرشفة علم منفصل. الحالات الانتقالية تُشتقّ من آخر `workflowInstance` بلا حقل جديد | قرار المالك ٢ |
| D3 | `slug` حقل جديد على `articles` بفهرس فريد جزئي | قرار المالك ٣ |
| D4 | سياسة الموافقة = صف واحد `workflowPolicies(articles, Edit)` + تعريف واحد + خطوات مشتقة من اختيار الأدمن. لا schema سياسة جديد | قرار المالك ٤ |
| D5 | `@SkipAuditLog()` على كل مسارات كتابة الخبر + صف تدقيق مختصر تكتبه الخدمة يدويًا | قرار المالك ٥ |
| D6 | «طلب تعديل» و«رفض نهائي» كلاهما يمرّ عبر `reject`، ويفرّق بينهما علم منطقي واحد إضافي على `workflowActionHistory`. لا قيمة enum جديدة | تأكيد فني 2026-09-20، ونصّ قرار المالك ٢ نفسه («بعلم منفصل على فعل المراجعة نفسه») |

### D2 — كيف تُنفَّذ الحالة الثنائية فعليًا

المحرّك العام يقرأ `record.publicationState` في ثلاثة مواضع داخل `PublishingService`. لو حمل الخبر حقلًا باسم آخر، تعطّلت لوحة الحالة المشتركة له وحده.

لذلك يحمل `articles` الحقل المتعارف عليه `publicationState`، **مقيَّدًا بقيمتين اثنتين فقط** — وهذا هو عين ما نصّ عليه القرار ٢:

| قرار المالك | الحقل الفعلي | العرض في الواجهة |
|---|---|---|
| `draft` | `publicationState: 'Draft'` | مسودة |
| `published` | `publicationState: 'Live'` | منشور |
| `archived: boolean` | `archived: boolean` (حقل مستقل) | مؤرشف |

`Unpublished` و`Archived` من `PUBLICATION_STATES` **غير مسموح بهما على الخبر**، ويُمنعان بـtype-level subset لا بتعليق. لا حالات إضافية مخزَّنة على الكيان — تمامًا كما نصّ القرار.

---

## بنية الملفات

### API — جديد

| الملف | مسؤوليته |
|---|---|
| `api/src/modules/public-communication/articles/schemas/article.schema.ts` | الـschema وفهارسه وثوابت حالته |
| `api/src/modules/public-communication/articles/dto/create-article.dto.ts` | جسم الإنشاء، ومعه تحقق النص الغني |
| `api/src/modules/public-communication/articles/dto/update-article.dto.ts` | جسم التعديل الجزئي |
| `api/src/modules/public-communication/articles/dto/query-articles.dto.ts` | مرشّحات القائمة الإدارية |
| `api/src/modules/public-communication/articles/dto/article-actions.dto.ts` | `PublishArticleDto` و`SetArchivedDto` |
| `api/src/modules/public-communication/articles/dto/article-public-response.dto.ts` | إسقاط القراءة العامة و`toPublicDto` |
| `api/src/modules/public-communication/articles/articles.repository.ts` | استعلامات المجموعة |
| `api/src/modules/public-communication/articles/articles.service.ts` | قواعد العمل + صفوف التدقيق المختصرة |
| `api/src/modules/public-communication/articles/articles.controller.ts` | المسارات والصلاحيات |
| `api/src/modules/public-communication/articles/articles.module.ts` | الربط |

### API — تعديل

| الملف | التعديل |
|---|---|
| `workflow/workflow-instances/workflow-instances.service.ts` | نزع النشر من `approve` · قبول علم «طلب تعديل» في `reject` |
| `workflow/workflow-instances/workflow-instances.repository.ts` | `findLatestApproved` |
| `workflow/workflow-action-history/schemas/workflow-action-history.schema.ts` | حقل `revisionRequested` |
| `workflow/workflow-action-history/workflow-action-history.service.ts` | تمرير العلم |
| `workflow/workflow-instances/dto/action-reason.dto.ts` | `revisionRequested` في جسم الرفض |
| `workflow/publishing/publishing.service.ts` | `publishApproved` · تحديث `publicationState` بعد النشر · توسيع `allowedActions` |
| `workflow/workflow-steps/schemas/workflow-step.schema.ts` | فهرس فريد جزئي على الترتيب |
| `workflow/workflow-steps/workflow-steps.service.ts` | رفض `requiredApprovals` > عدد المعيَّنين المتمايزين |
| `common/constants/entity-content.ts` | صفّا `articles` |
| `common/constants/permission-resources.ts` | `articles` |
| `common/constants/permission-catalogue.ts` | صفوف `articles` |
| `app.module.ts` | `ArticlesModule` |
| `bootstrap/seed-dev.ts` | بذرة السياسة والتعريف والخطوات |

### Dashboard — جديد

`app/[locale]/(app)/news/page.tsx` · `news/[id]/page.tsx` · `news/approvals/page.tsx` · `news/policy/page.tsx` · `components/admin/news/{list,editor,approvals-inbox,policy-editor,article-fields}.tsx` · `lib/admin/articles.ts` · `lib/admin/approval-policy.ts`

### Dashboard — تعديل

`lib/admin/editorial-entities.ts` (سطر السجل) · `lib/navigation.ts` (الروابط والعدّاد) · `messages/{ar,en}.json`

### Web — جديد

`app/[locale]/news/[slug]/page.tsx` · `components/pages/news/{news-list,article-screen}.tsx` · `lib/api/articles.ts` · `app/sitemap-news.ts`

### Web — تعديل

`app/[locale]/news/page.tsx` (من هيرو فقط إلى قائمة) · `lib/pages/public-pages.ts` (`listEndpoint`) · `lib/pages/indexability.ts` (حالة `news`) · `lib/seo/json-ld.tsx` (`NewsArticleJsonLd`)

---

# المرحلة ١ — المحرّك

## Task 1: فصل النشر عن الاعتماد

**Files:**
- Modify: `api/src/modules/workflow/workflow-instances/workflow-instances.service.ts` (دالة `approve`)
- Test: `api/src/modules/workflow/workflow-instances/workflow-instances.service.spec.ts`

**Interfaces:**
- Consumes: `PublicationsService.publish` (يبقى كما هو، ولا يُستدعى من `approve` بعد الآن)
- Produces: `approve()` تُرجع instance بحالة `Approved` و`currentStepId: null` **بلا** صف `publications`

- [ ] **Step 1: اكتب الاختبار الأحمر**

في `workflow-instances.service.spec.ts`، بجوار اختبارات `approve` القائمة:

```ts
it('final approval no longer publishes — publishing is a separate act (D1)', async () => {
  // A record whose last step is being approved. Before ADR-0086 this call
  // created the publications row itself, which made "approved" and
  // "published" the same event and left no moment for a human to choose.
  const instance = await approveThroughFinalStep();

  expect(instance?.status).toBe('Approved');
  expect(publicationsService.publish).not.toHaveBeenCalled();
});
```

مع مساعد يبني الحالة عبر نفس المهيّئات المستعملة في الملف:

```ts
const approveThroughFinalStep = async () => {
  stepsService.findNext.mockResolvedValue(null);
  actionHistoryService.countDistinctApprovers.mockResolvedValue(1);
  return service.approve(instanceId, assigneeId);
};
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd api && npm test -- --runInBand src/modules/workflow/workflow-instances
```
المتوقع: FAIL — `publish` استُدعيت مرة واحدة.

- [ ] **Step 3: انزع النشر من `approve`**

في `workflow-instances.service.ts` استبدل كتلة الاعتماد النهائي:

```ts
    // Final step approved. The instance is Approved and STOPS there.
    //
    // Until ADR-0086 this call published, which made approval and publication
    // one event: nobody could approve a text and then choose the hour it went
    // live, and no policy could require approval without also surrendering the
    // publish decision. Publishing now reads the Approved instance back —
    // `PublishingService.publishApproved` — so the two are separately
    // permissioned and separately audited.
    const updated = await this.repository.updateById(id, { status: 'Approved', currentStepId: null });

    await this.writeStatusChangeAudit({
      entityType: instance.entityType,
      entityId: instance.entityId,
      actorId: actorObjectId,
      previousValue: { workflowStatus: 'InProgress' },
      newValue: { workflowStatus: 'Approved' },
      reason: reason ?? 'Final step approved',
      context,
    });
    return updated;
```

واحذف `isPublicationEligible` من هذه الدالة ومتغيّر `published`. أبقِ الاستيراد إن بقي مستعملًا في `assertRevisionOf`، وإلا احذفه.

- [ ] **Step 4: شغّل الاختبارات وتأكد من نجاحها**

```
cd api && npm test -- --runInBand src/modules/workflow
```
المتوقع: PASS. اختبارات e2e ستسقط في هذه اللحظة وهذا متوقّع — تُصلَح في Task 4.

---

## Task 2: فعل النشر الجديد `publishApproved`

**Files:**
- Modify: `api/src/modules/workflow/workflow-instances/workflow-instances.repository.ts`
- Modify: `api/src/modules/workflow/publishing/publishing.service.ts`
- Test: `api/src/modules/workflow/publishing/publishing.service.spec.ts` (ملف جديد)

**Interfaces:**
- Consumes: `WorkflowInstancesRepository.findLatestApproved`
- Produces: `PublishingService.publishApproved(input): Promise<{ revisionId, publicationId, publishedAt }>` — نفس شكل مُخرَج `publishDirect` بالضبط، حتى يتعامل الداشبورد مع الاثنين بلا تفريع

- [ ] **Step 1: اكتب الاختبار الأحمر**

ملف جديد `publishing.service.spec.ts`:

```ts
describe('PublishingService.publishApproved', () => {
  it('publishes the revision the approvers actually approved', async () => {
    policiesService.resolve.mockResolvedValue({ mode: 'workflow', policy: {}, workflowDefinitionId: defId, reason: null });
    instancesRepository.findLatestApproved.mockResolvedValue({ _id: instanceId, revisionId, status: 'Approved' });

    const result = await service.publishApproved({ entityType: 'articles', entityId, actor: publisher });

    // The revision is the one frozen at submission — never a fresh snapshot.
    // A new snapshot would publish whatever the draft says now, which is not
    // what anybody approved.
    expect(publicationsService.publish).toHaveBeenCalledWith(
      expect.objectContaining({ revisionId, workflowInstanceId: instanceId }),
    );
    expect(result.publishedAt).toEqual(expect.any(String));
  });

  it('refuses when no approval is waiting', async () => {
    policiesService.resolve.mockResolvedValue({ mode: 'workflow', policy: {}, workflowDefinitionId: defId, reason: null });
    instancesRepository.findLatestApproved.mockResolvedValue(null);

    await expect(service.publishApproved({ entityType: 'articles', entityId, actor: publisher }))
      .rejects.toMatchObject({ response: { code: 'notApproved' } });
  });

  it('refuses a publisher without the Publish permission', async () => {
    await expect(service.publishApproved({ entityType: 'articles', entityId, actor: editorOnly }))
      .rejects.toMatchObject({ response: { code: 'forbidden' } });
  });
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd api && npm test -- --runInBand src/modules/workflow/publishing
```
المتوقع: FAIL — `publishApproved is not a function`.

- [ ] **Step 3: أضف `findLatestApproved` إلى المستودع**

```ts
  /**
   * The most recent finished review of this record, if it ended in approval.
   *
   * `findActive` deliberately excludes `Approved`, so it cannot answer this —
   * and publishing needs exactly the instance `findActive` hides: the one
   * whose approvers are done and whose revision is waiting for someone to put
   * it on the site.
   */
  async findLatestApproved(
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<WorkflowInstanceDocument | null> {
    return this.model
      .findOne({ entityType, entityId, status: 'Approved', archivedAt: null })
      .sort({ updatedAt: -1 })
      .exec();
  }
```

ثم مرّره في `WorkflowInstancesService`:

```ts
  /** The approval waiting to be published, if there is one. Exposed for
   *  `PublishingService`, which is the only caller allowed to act on it. */
  async findLatestApproved(
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<WorkflowInstanceDocument | null> {
    return this.repository.findLatestApproved(entityType, entityId);
  }
```

- [ ] **Step 4: أضف `publishApproved` إلى `PublishingService`**

```ts
  /**
   * Publishes what a completed review approved.
   *
   * The counterpart to `publishDirect`, and the reason the two are separate
   * methods rather than one with a branch: they take their content from
   * different places. A direct publish freezes the draft as it stands now; an
   * approved publish republishes the revision the approvers read. Merging them
   * would put one `if` between "the text three people signed off" and "the text
   * currently in the box".
   *
   * @throws ForbiddenException without `<entityType>:Publish`.
   * @throws ConflictException when the policy requires no approvals (use
   *   `publishDirect`), when nothing is approved, or when the policy is
   *   unconfigured.
   */
  async publishApproved(input: {
    entityType: PublicationEntityType;
    entityId: Types.ObjectId;
    actor: AuthenticatedUser;
    context?: RequestContext;
  }): Promise<{ revisionId: string; publicationId: string; publishedAt: string }> {
    const { entityType, entityId, actor } = input;

    this.assertPermission(actor, entityType, 'Publish');

    const resolved = await this.policiesService.resolve(entityType, 'Edit');

    if (resolved.mode === 'blocked') {
      throw new ConflictException({
        code: 'publishingPolicyMissing',
        message: this.blockedMessage(entityType, resolved.reason),
      });
    }

    if (resolved.mode === 'direct') {
      throw new ConflictException({
        code: 'conflict',
        message: `${entityType} needs no approval. Publish it directly instead.`,
      });
    }

    const approved = await this.instancesService.findLatestApproved(entityType, entityId);
    if (!approved) {
      throw new ConflictException({
        code: 'notApproved',
        message: 'Nothing has been approved for this record yet. Submit it for review first.',
      });
    }

    const actorId = new Types.ObjectId(actor.userId);
    const revisionId = approved.revisionId as Types.ObjectId;

    const publication = await this.publicationsService.publish({
      entityType,
      entityId,
      revisionId,
      workflowInstanceId: approved._id as Types.ObjectId,
      publishedBy: actorId,
    });

    await this.markLive(entityType, entityId, actorId);

    await this.auditLogsService.write({
      actorId,
      action: 'StatusChange',
      entityType,
      entityId,
      previousValue: { publicationState: 'Draft' },
      newValue: { publicationState: 'Live', revisionId: revisionId.toString() },
      reason: 'Published an approved revision',
      ipAddress: input.context?.ipAddress ?? '',
      userAgent: input.context?.userAgent ?? '',
    });

    return {
      revisionId: revisionId.toString(),
      publicationId: (publication._id as Types.ObjectId).toString(),
      publishedAt: publication.publishedAt.toISOString(),
    };
  }

  /**
   * Brings the record's own `publicationState` in line with the publication
   * just created (ADR-0020's denormalisation).
   *
   * It was never maintained: `publications` carried the truth and every
   * entity's own column stayed at whatever it was seeded with, so the status
   * panel read `Draft` on a record that had been live for a week. Written here
   * — after the publication, never before — so a failed publish cannot leave a
   * record claiming to be live.
   */
  private async markLive(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
    actorId: Types.ObjectId,
    publishedAt: Date,
  ): Promise<void> {
    const model = this.modelFor(entityType);
    const update: Record<string, unknown> = { publicationState: 'Live', updatedBy: actorId };

    // A type that carries its own publish date gets it from the publication
    // rather than from an author-chosen field, so the date a reader sees and
    // the date the publication records cannot disagree. Types without the path
    // are untouched — the check is the schema's own, so no list of which types
    // have one has to be kept in step.
    if (model.schema.path('publishDate')) {
      update.publishDate = publishedAt;
    }

    await model.updateOne({ _id: entityId, archivedAt: null }, { $set: update }).exec();
  }
```

استدعِ `markLive` أيضًا في نهاية `publishDirect`، بعد `publicationsService.publish` مباشرة وقبل كتابة صف التدقيق، ومرّر `publication.publishedAt` في الموضعين.

واكتب له اختباره:

```ts
it('stamps the publish date from the publication, for a type that has one', async () => {
  await service.publishApproved({ entityType: 'articles', entityId, actor: publisher });

  expect(articleModel.updateOne).toHaveBeenCalledWith(
    { _id: entityId, archivedAt: null },
    { $set: expect.objectContaining({ publicationState: 'Live', publishDate: publication.publishedAt }) },
  );
});
```

- [ ] **Step 5: شغّل الاختبارات**

```
cd api && npm test -- --runInBand src/modules/workflow && npx tsc --noEmit
```
المتوقع: PASS، و`tsc` يخرج بصفر.

---

## Task 3: `publish` يظهر كفعل متاح بعد الاعتماد

**Files:**
- Modify: `api/src/modules/workflow/publishing/publishing.service.ts` (`allowedActions` و`editorialState`)
- Test: `api/src/modules/workflow/publishing/publishing.service.spec.ts`

**Interfaces:**
- Consumes: `publishApproved` من Task 2
- Produces: `EditorialStateDto.availableActions` يحوي `'publish'` حين توجد موافقة منتظرة وللقارئ صلاحية النشر. **لا قيمة جديدة في `EDITORIAL_ACTIONS`** — سجل الداشبورد يبقى بلا تعديل.

- [ ] **Step 1: اكتب الاختبار الأحمر**

```ts
it('offers publish once a review has been approved', async () => {
  policiesService.resolve.mockResolvedValue({ mode: 'workflow', workflowDefinitionId: defId, policy: {}, reason: null });
  // findActive hides Approved instances, so the panel sees no running review.
  instancesService.findActive.mockResolvedValue(null);
  instancesService.findLatestApproved.mockResolvedValue({ _id: instanceId, revisionId, status: 'Approved' });

  const state = await service.editorialState('articles', entityId, publisher);

  expect(state.availableActions).toContain('publish');
});

it('does not offer publish while the review is still running', async () => {
  instancesService.findActive.mockResolvedValue({ status: 'InProgress', currentStepId: stepId, workflowDefinitionId: defId, _id: instanceId });
  instancesService.findLatestApproved.mockResolvedValue(null);

  const state = await service.editorialState('articles', entityId, publisher);

  expect(state.availableActions).not.toContain('publish');
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd api && npm test -- --runInBand src/modules/workflow/publishing
```
المتوقع: FAIL — `publish` غير موجود في القائمة.

- [ ] **Step 3: وسّع `allowedActions`**

أضف `approvedWaiting` إلى توقيعها، ومرّره من `editorialState`:

```ts
  private allowedActions(
    mode: PublishingMode,
    active: WorkflowInstanceDocument | null,
    permits: { canEdit: boolean; canUpdate: boolean; canPublish: boolean; canApprove: boolean },
    publishable: boolean,
    /** An approval finished and nobody has put it on the site yet. */
    approvedWaiting: boolean,
  ): Set<EditorialAction> {
```

وداخلها، في فرع `!active`:

```ts
    if (!active) {
      if (mode === 'direct' && permits.canPublish) {
        actions.add('publish');
      }
      // A finished approval is the other way a publish becomes available —
      // and the only one under a policy that requires review.
      if (mode === 'workflow' && approvedWaiting && permits.canPublish) {
        actions.add('publish');
      }
      if (mode === 'workflow' && !approvedWaiting && permits.canUpdate) {
        actions.add('submit');
      }
      return actions;
    }
```

وفي `editorialState` أضف القراءة إلى `Promise.all` القائم ومرّرها للنداءين (`actions` و`ifReady`):

```ts
    const [record, resolved, active, live, instances, approvedWaiting] = await Promise.all([
      this.loadRecord(entityType, entityId),
      this.policiesService.resolve(entityType, 'Edit'),
      this.instancesService.findActive(entityType, entityId),
      this.publicationsService.findLive(entityType, entityId),
      this.instancesService.findByEntity(entityType, entityId),
      this.instancesService.findLatestApproved(entityType, entityId),
    ]);
```

ثم:

```ts
    const hasApproval = approvedWaiting !== null;
    const actions = this.allowedActions(resolved.mode, active, permits, publishBlockers.length === 0, hasApproval);
    const ifReady = this.allowedActions(resolved.mode, active, permits, true, hasApproval);
```

- [ ] **Step 4: شغّل الاختبارات**

```
cd api && npm test -- --runInBand src/modules/workflow && npx tsc --noEmit
```
المتوقع: PASS.

---

## Task 4: علم «طلب تعديل» على فعل المراجعة

**Files:**
- Modify: `api/src/modules/workflow/workflow-action-history/schemas/workflow-action-history.schema.ts`
- Modify: `api/src/modules/workflow/workflow-action-history/workflow-action-history.service.ts`
- Modify: `api/src/modules/workflow/workflow-instances/workflow-instances.service.ts` (`reject`)
- Modify: `api/src/modules/workflow/workflow-instances/dto/action-reason.dto.ts`
- Modify: `api/src/modules/workflow/workflow-instances/workflow-instances.controller.ts`
- Modify: `api/src/modules/workflow/publishing/editorial-state.dto.ts` (`EditorialHistoryEntryDto`)
- Modify: `api/src/modules/workflow/publishing/publishing.service.ts` (`toHistoryEntry`)
- Test: `api/src/modules/workflow/workflow-instances/workflow-instances.service.spec.ts`

**Interfaces:**
- Produces: `RejectWorkflowInstanceDto.revisionRequested?: boolean` · `WorkflowActionHistory.revisionRequested: boolean` · `EditorialHistoryEntryDto.revisionRequested: boolean`

- [ ] **Step 1: اكتب الاختبار الأحمر**

```ts
it('records a rejection that asks for changes distinctly from a final refusal', async () => {
  await service.reject(instanceId, assigneeId, 'Needs a second source.', {}, true);

  expect(actionHistoryService.record).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'Rejected', revisionRequested: true }),
  );
});

it('defaults to a final refusal when the flag is absent', async () => {
  await service.reject(instanceId, assigneeId, 'Not publishable.');

  expect(actionHistoryService.record).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'Rejected', revisionRequested: false }),
  );
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd api && npm test -- --runInBand src/modules/workflow/workflow-instances
```
المتوقع: FAIL — الحقل غير مُمرَّر.

- [ ] **Step 3: أضف الحقل إلى الـschema**

في `workflow-action-history.schema.ts` بعد `returnedToStepId`:

```ts
  /**
   * Whether this rejection asks for a revision rather than ending the matter.
   *
   * Both outcomes leave the record in draft and both restart the review from
   * its first step when resubmitted, so they are one engine behaviour and this
   * is the only thing that tells them apart. It is a flag rather than a new
   * `action` value because adding one would change the shape of a closed enum
   * the live board defines, for a difference the engine does not act on.
   *
   * Meaningless unless `action === 'Rejected'`.
   */
  @Prop({ type: Boolean, required: true, default: false })
  revisionRequested: boolean;
```

- [ ] **Step 4: مرّره عبر الخدمة والـDTO والمسار**

في `workflow-action-history.service.ts` أضف `revisionRequested?: boolean` إلى مدخلات `record` ومرّره إلى `create` بقيمة `?? false`.

في `action-reason.dto.ts`:

```ts
export class RejectWorkflowInstanceDto {
  @ApiProperty({ description: 'Why this submission was rejected.' })
  @IsString()
  @MinLength(1)
  reason: string;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'True when the reviewer is asking for changes rather than refusing the item. The engine ' +
      'treats both identically — the record returns to draft and a resubmission restarts the ' +
      'review — and this only records which of the two the reviewer meant.',
  })
  @IsOptional()
  @IsBoolean()
  revisionRequested?: boolean;
}
```

في `workflow-instances.service.ts` وسّع توقيع `reject` بمعامل أخير `revisionRequested = false` ومرّره إلى `actionHistoryService.record`، وأضفه إلى `newValue` في صف التدقيق:

```ts
      newValue: { workflowStatus: 'Rejected', revisionRequested },
```

في الـcontroller مرّر `dto.revisionRequested ?? false`.

في `editorial-state.dto.ts` أضف `revisionRequested: boolean` إلى `EditorialHistoryEntryDto`، وفي `toHistoryEntry` أضف `revisionRequested: entry.revisionRequested ?? false`.

- [ ] **Step 5: شغّل الاختبارات**

```
cd api && npm test -- --runInBand src/modules/workflow && npx tsc --noEmit
```
المتوقع: PASS.

---

## Task 5: إغلاق H5 و H6 — إعداد سياسة لا يمكن أن يعلّق خبرًا

هاتان الثغرتان في طريق «الأدمن يضبط السياسة» مباشرة: اليوم تُقبل خطوتان بنفس الترتيب فتُتخطّى إحداهما بصمت، ويُقبل عدد موافقات أكبر من عدد المعيَّنين فتعلق الـinstance إلى الأبد.

**Files:**
- Modify: `api/src/modules/workflow/workflow-steps/schemas/workflow-step.schema.ts`
- Modify: `api/src/modules/workflow/workflow-steps/workflow-steps.service.ts`
- Test: `api/src/modules/workflow/workflow-steps/workflow-steps.service.spec.ts` (ملف جديد)

**Interfaces:**
- Produces: `WorkflowStepsService.create` ترمي `ConflictException` بالرمزين `duplicateOrder` و`unsatisfiableStep`

- [ ] **Step 1: اكتب الاختبار الأحمر**

```ts
it('refuses a step nobody could ever satisfy', async () => {
  // Two named approvers and a threshold of three. The instance would sit at
  // this step forever: every assignee can approve and the count still never
  // reaches the requirement.
  await expect(
    service.create({ workflowDefinitionId: defId, sequenceOrder: 1, stepType: 'Parallel', assigneeIds: [a, b], requiredApprovals: 3 }),
  ).rejects.toMatchObject({ response: { code: 'unsatisfiableStep' } });
});

it('counts a repeated assignee once when checking that', async () => {
  // countDistinctApprovers counts distinct actors, so listing the same person
  // twice raises the apparent headcount without raising the real one.
  await expect(
    service.create({ workflowDefinitionId: defId, sequenceOrder: 1, stepType: 'Parallel', assigneeIds: [a, a], requiredApprovals: 2 }),
  ).rejects.toMatchObject({ response: { code: 'unsatisfiableStep' } });
});

it('refuses a second step at the same position in the chain', async () => {
  await expect(
    service.create({ workflowDefinitionId: defId, sequenceOrder: 1, stepType: 'Sequential', assigneeIds: [b], requiredApprovals: 1 }),
  ).rejects.toMatchObject({ response: { code: 'duplicateOrder' } });
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd api && npm test -- --runInBand src/modules/workflow/workflow-steps
```
المتوقع: FAIL — الثلاثة تُقبل.

- [ ] **Step 3: أضف الفهرس والتحقق**

في `workflow-step.schema.ts` في آخر الملف:

```ts
// A position in the chain names one step. Two steps sharing it is a state
// where `findNext` — which asks for a strictly greater `sequenceOrder` —
// silently skips whichever it did not return first, so that step's assignees
// never review anything. Partial on `archivedAt: null` so an archived step
// does not permanently block a corrected replacement (the `pages.slug`
// precedent).
WorkflowStepSchema.index(
  { workflowDefinitionId: 1, sequenceOrder: 1 },
  { unique: true, partialFilterExpression: { archivedAt: null } },
);
```

في `workflow-steps.service.ts` داخل `create`، قبل الكتابة:

```ts
    // `countDistinctApprovers` counts distinct actors, so a threshold above the
    // number of distinct assignees can never be met and the instance stops at
    // this step permanently. Refused at the keystroke that creates it rather
    // than discovered by an editor whose article will not move.
    const distinctAssignees = new Set(dto.assigneeIds).size;
    if (dto.requiredApprovals > distinctAssignees) {
      throw new ConflictException({
        code: 'unsatisfiableStep',
        message: `This step needs ${dto.requiredApprovals} approvals but names only ${distinctAssignees} distinct approvers.`,
      });
    }
```

وحوّل خطأ المفتاح المكرر إلى رسالة مقروءة بنفس نمط `WorkflowPoliciesService.asConflict`:

```ts
    try {
      return await this.repository.create({ ...
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      throw new ConflictException({
        code: 'duplicateOrder',
        message: `This workflow already has a step at position ${dto.sequenceOrder}.`,
      });
    }
```

- [ ] **Step 4: شغّل الاختبارات**

```
cd api && npm test -- --runInBand src/modules/workflow && npx tsc --noEmit
```
المتوقع: PASS.

> **ملاحظة نشر:** الفهرس الجديد يحتاج نفس ترتيب الطرح الموثّق لفهرس `workflowPolicies`: فحص المكررات أولًا، ثم البناء. القاعدة المحلية فيها صفر خطوات، فلا مكررات. يُضاف بند إلى `docs/engineering/deployment-checklist.md` في Task 18.

---

## Task 6: مسار المراجعة العامة يحترم الفصل — e2e

**Files:**
- Modify: `api/test/e2e/workflow-engine.e2e-spec.ts`
- Modify: `api/test/e2e/president-message-publishing.e2e-spec.ts`

**Interfaces:**
- Consumes: `publishApproved` و`findLatestApproved` من Task 2

- [ ] **Step 1: صحّح التوقعات القائمة**

كل موضع في الـe2e يتوقع صف `publications` مباشرة بعد آخر موافقة صار يتوقع الآن:

```ts
// Approval no longer publishes (ADR-0086 D1). The record waits for someone
// holding Publish to put it on the site.
expect(await publications.countDocuments({ entityType, entityId })).toBe(0);

await request(app.getHttpServer())
  .post(`/api/v1/articles/${articleId}/publish-approved`)
  .set('Authorization', `Bearer ${publisherToken}`)
  .expect(201);

expect(await publications.countDocuments({ entityType, entityId, status: 'Live' })).toBe(1);
```

- [ ] **Step 2: شغّل الـe2e**

```
cd api && npm run test:e2e -- --runInBand workflow-engine president-message-publishing workflow-integrity
```
المتوقع: PASS، ٦٥ اختبارًا.

**⏸ بوابة المرحلة ١ — قف هنا.** اعرض: الملفات المعدَّلة، أرقام الاختبارات، الوقت مقابل التقدير (يوم ونصف)، وأمر `git add` من §أوامر الالتزام.

---

# المرحلة ٢ — كيان الخبر

## Task 7: schema الخبر

**Files:**
- Create: `api/src/modules/public-communication/articles/schemas/article.schema.ts`
- Create: `api/src/modules/public-communication/articles/articles.repository.ts`
- Test: `api/src/modules/public-communication/articles/schemas/article.schema.spec.ts`

**Interfaces:**
- Produces: `Article` · `ArticleDocument` · `ArticleSchema` · `ARTICLE_PUBLICATION_STATES`

- [ ] **Step 1: اكتب الاختبار الأحمر**

```ts
describe('ArticleSchema', () => {
  it('admits only the two states a news item can be in', () => {
    const path = ArticleSchema.path('publicationState') as { enumValues: string[] };
    // D2: Unpublished and Archived are not states of an article. Archiving is
    // a separate flag over a published item, not a fourth position in a state
    // machine — so the enum must not quietly accept them.
    expect(path.enumValues).toEqual(['Draft', 'Live']);
  });

  it('keeps one live slug per article', () => {
    const [keys, options] = ArticleSchema.indexes().find(([k]) => 'slug' in k)!;
    expect(keys).toEqual({ slug: 1 });
    expect(options).toMatchObject({ unique: true, partialFilterExpression: { archivedAt: null } });
  });

  it('orders the public feed without a collection scan', () => {
    const indexes = ArticleSchema.indexes().map(([keys]) => keys);
    expect(indexes).toContainEqual({ publicationState: 1, archived: 1, publishDate: -1 });
  });
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd api && npm test -- --runInBand src/modules/public-communication/articles
```
المتوقع: FAIL — الوحدة غير موجودة.

- [ ] **Step 3: اكتب الـschema**

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { LocalizedRichText, LocalizedRichTextSchema } from '../../../../common/schemas/localized-rich-text.schema.js';
import { PageSeo, PageSeoSchema } from '../../../../common/schemas/page-seo.schema.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

export type ArticleDocument = HydratedDocument<Article>;

/**
 * The only two states a news item has (owner decision 2026-09-20, D2).
 *
 * Declared as a provable subset of `PUBLICATION_STATES` rather than as a free
 * list: `articles` shares `PublishingService` with eleven other types, which
 * reads this column, so the vocabulary has to be theirs — and `Unpublished`
 * and `Archived` have to be excluded by the type system rather than by a
 * comment somebody will not read.
 */
export const ARTICLE_PUBLICATION_STATES = ['Draft', 'Live'] as const satisfies readonly PublicationState[];
export type ArticlePublicationState = (typeof ARTICLE_PUBLICATION_STATES)[number];

/**
 * Implements: articles collection, Domain 4 — News & Editorial
 * (`07-Mongoose-Schema-Specification.md` §articles, `CT-ARTICLE-001`).
 *
 * Workflow-governed (List A + List B): public reads go through
 * `publications → revisions.snapshotData`, never this row.
 *
 * Deliberately absent, and each for a stated reason:
 *  - `contentCategoryId` and tags — out of scope for this batch.
 *  - `references` (athletes/clubs/championships) — those collections' public
 *    surfaces do not exist, and a link to nothing is worse than no link.
 *  - any result-table link — the tournament result is published as an
 *    ordinary article, by owner decision. There is no results schema to point
 *    at and none is coming in this batch.
 */
@Schema({ collection: 'articles', timestamps: true })
export class Article extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  /**
   * The URL segment, one per article across both languages.
   *
   * The approved schema specification records that `articles` has no slug and
   * flags its absence as an open structural item; ADR-0086 D3 closes it, because
   * Chapter 14 §5 requires a clean stable URL and `/news/<objectid>` is neither.
   * One slug, not one per language: the two editions are the same story at the
   * same address, which is what the `hreflang` pair in `buildMetadata` asserts.
   */
  @Prop({ type: String, required: true, trim: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  coverMediaId: Types.ObjectId | null;

  /** One ProseMirror document per language, checked against the per-language
   *  allowlist on every write (ADR-0069 D1) — including a write that never
   *  passed through the dashboard. */
  @Prop({ type: LocalizedRichTextSchema, required: true })
  body: LocalizedRichText;

  /** The editorial byline, which may differ from the account that typed it.
   *  `createdBy` on BaseSchema is the account; this is the name readers see. */
  @Prop({ type: LocalizedTextSchema, required: true })
  authorDisplayName: LocalizedText;

  /** Stamped by the server when the item is published, not chosen by an
   *  author. Null until then, which is also how "never published" is read. */
  @Prop({ type: Date, default: null })
  publishDate: Date | null;

  @Prop({ type: PageSeoSchema, default: null })
  seo: PageSeo | null;

  /** Denormalized ← `publications` (ADR-0020), narrowed to two values. */
  @Prop({ type: String, enum: ARTICLE_PUBLICATION_STATES, required: true, default: 'Draft' })
  publicationState: ArticlePublicationState;

  /**
   * Hidden from the public listing without being deleted or unpublished.
   *
   * A flag over a published item rather than a state beside `Live` (D2): the
   * item stays published, keeps its URL and its publication row, and simply
   * stops appearing in the feed. `archivedAt` on BaseSchema is a different
   * thing entirely — that is soft deletion, and an archived-in-this-sense
   * article is still a record the newsroom works with.
   */
  @Prop({ type: Boolean, required: true, default: false })
  archived: boolean;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);

// One live article per slug. Partial on `archivedAt: null` so a soft-deleted
// article does not hold its slug hostage against a corrected replacement.
ArticleSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });

// The public feed's exact filter and ordering: live, not hidden, newest first.
ArticleSchema.index({ publicationState: 1, archived: 1, publishDate: -1 });
```

والمستودع بنفس قالب `GovernanceDocumentsRepository`، مع إضافة واحدة:

```ts
  /** One article by its public URL segment. Soft-delete aware through
   *  `findOne`, which is what makes a deleted article's slug reusable. */
  async findBySlug(slug: string): Promise<ArticleDocument | null> {
    return this.findOne({ slug } as QueryFilter<ArticleDocument>);
  }
```

- [ ] **Step 4: شغّل الاختبارات**

```
cd api && npm test -- --runInBand src/modules/public-communication/articles
```
المتوقع: PASS.

---

## Task 8: DTOs واختبار الحقن الإلزامي

هذه المهمة تحمل بندًا لا يُؤجَّل: إثبات أن `<script>` و`onerror=` لا يصلان إلى التخزين.

**Files:**
- Create: `api/src/modules/public-communication/articles/dto/create-article.dto.ts`
- Create: `api/src/modules/public-communication/articles/dto/update-article.dto.ts`
- Create: `api/src/modules/public-communication/articles/dto/query-articles.dto.ts`
- Test: `api/src/modules/public-communication/articles/dto/create-article.dto.spec.ts`

**Interfaces:**
- Consumes: `LocalizedRichTextDto` · `LocalizedTextDto` · `PageSeoDto` · `PaginationQueryDto`
- Produces: `CreateArticleDto` · `UpdateArticleDto` · `QueryArticlesDto`

- [ ] **Step 1: اكتب اختبار الحقن الأحمر**

```ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateArticleDto } from './create-article.dto.js';

/** A body that carries exactly what the brief names: a script node and an
 *  event-handler attribute. Neither is in the allowlist, so neither should
 *  survive validation — and nothing downstream has to strip them, because the
 *  document never becomes storable in the first place. */
const injected = {
  type: 'doc',
  content: [
    { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
    {
      type: 'paragraph',
      attrs: { onerror: 'alert(1)' },
      content: [
        { type: 'text', text: 'hello', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] },
      ],
    },
  ],
};

it('refuses a body carrying a script node, an event handler, or a javascript: link', async () => {
  const dto = plainToInstance(CreateArticleDto, { ...valid, body: { ar: injected, en: injected } });

  const errors = await validate(dto);
  const body = errors.find((error) => error.property === 'body');

  expect(body).toBeDefined();
  const message = JSON.stringify(body);
  expect(message).toContain('nodeNotAllowed');
  expect(message).toContain('attributeNotAllowed');
  expect(message).toContain('linkSchemeNotAllowed');
});

it('accepts an ordinary bilingual body', async () => {
  const ok = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'خبر' }] }] };
  const dto = plainToInstance(CreateArticleDto, { ...valid, body: { ar: ok, en: ok } });

  expect(await validate(dto)).toHaveLength(0);
});

it('refuses a slug that is not a clean URL segment', async () => {
  const dto = plainToInstance(CreateArticleDto, { ...valid, slug: 'Not A Slug!' });
  const errors = await validate(dto);
  expect(errors.some((error) => error.property === 'slug')).toBe(true);
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd api && npm test -- --runInBand src/modules/public-communication/articles/dto
```
المتوقع: FAIL — `CreateArticleDto` غير موجود.

- [ ] **Step 3: اكتب الـDTOs**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { LocalizedRichTextDto } from '../../../../common/dto/localized-rich-text.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';

/**
 * Lowercase letters, digits and single hyphens.
 *
 * Latin-only deliberately, for both languages: the slug is one shared URL and
 * a percent-encoded Arabic segment is unreadable wherever a link is pasted,
 * which is most of the places a news item travels.
 */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateArticleDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ description: 'URL segment, e.g. "national-championship-results-2026".' })
  @IsString()
  @MaxLength(120)
  @Matches(SLUG, { message: 'slug must be lowercase letters, digits and single hyphens' })
  slug: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsMongoId()
  coverMediaId?: string | null;

  @ApiProperty({ type: LocalizedRichTextDto })
  @ValidateNested()
  @Type(() => LocalizedRichTextDto)
  body: LocalizedRichTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  authorDisplayName: LocalizedTextDto;

  @ApiProperty({ type: PageSeoDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto | null;
}
```

`UpdateArticleDto` يكرّر الحقول نفسها كلها اختيارية — لا `PartialType`، اتباعًا لنمط `UpdatePresidentMessagePageDto` القائم في المستودع.

`QueryArticlesDto` يمتدّ `PaginationQueryDto` ويضيف:

```ts
  @ApiProperty({ required: false, enum: ARTICLE_PUBLICATION_STATES })
  @IsOptional()
  @IsIn(ARTICLE_PUBLICATION_STATES)
  publicationState?: ArticlePublicationState;

  /** Free text matched against both titles. Escaped before it reaches Mongo —
   *  an unescaped `.*` from a search box is a collection scan a visitor can
   *  trigger at will. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiProperty({ required: false, description: 'Include items hidden from the public feed.' })
  @IsOptional()
  @IsBooleanString()
  includeArchived?: string;
```

- [ ] **Step 4: اكتب أجسام الأفعال وإسقاط القراءة العامة**

`article-actions.dto.ts` — جسمان صغيران يحتاجهما الـcontroller في Task 9:

```ts
export class PublishArticleDto {
  @ApiProperty({
    description:
      'The `updatedAt` the editor was looking at. Publishing a record someone else edited in the ' +
      'meantime publishes an edit nobody chose to publish, so the server compares before freezing.',
  })
  @IsDateString()
  expectedUpdatedAt: string;
}

export class SetArchivedDto {
  @ApiProperty({ description: 'True hides a published article from the feed; false returns it.' })
  @IsBoolean()
  archived: boolean;
}
```

`article-public-response.dto.ts` — الإسقاط الذي يقرأه الموقع العام:

```ts
/**
 * One article as a visitor receives it.
 *
 * Built from the frozen revision, never from the article row: the row says
 * WHICH articles are live and in what order, and every word shown comes from
 * the snapshot the approvers approved. `_id`, `createdBy` and the rest of the
 * bookkeeping are absent because this is an allowlist, not a redaction —
 * a field added to the schema later does not leak by default.
 */
export class ArticlePublicDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) authorDisplayName: LocalizedTextDto;
  @ApiProperty({ nullable: true }) publishDate: string | null;
  @ApiProperty({ nullable: true }) coverMediaId: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true }) body: { ar: unknown; en: unknown };
  /** First paragraph of each language, plain. Derived rather than stored: a
   *  second field for the summary is a second thing to keep true, and the
   *  card and the meta description both want exactly this. */
  @ApiProperty({ type: LocalizedTextDto }) excerpt: LocalizedTextDto;
  @ApiProperty({ type: PageSeoDto, nullable: true }) seo: PageSeoDto | null;
}

const EXCERPT_MAX = 160;

/** One paragraph of plain text per language, clipped on a word boundary so a
 *  card never ends mid-word and a meta description never exceeds what search
 *  results show. */
const excerptOf = (body: unknown): string => {
  const [first = ''] = richTextParagraphs(body);
  if (first.length <= EXCERPT_MAX) return first;
  const clipped = first.slice(0, EXCERPT_MAX);
  return `${clipped.slice(0, clipped.lastIndexOf(' '))}…`;
};

export const toPublicDto = (
  article: ArticleDocument,
  snapshot: Record<string, unknown>,
): ArticlePublicDto => {
  const body = snapshot.body as { ar: unknown; en: unknown };
  return {
    id: article._id.toString(),
    slug: String(snapshot.slug ?? article.slug),
    title: snapshot.title as LocalizedTextDto,
    authorDisplayName: snapshot.authorDisplayName as LocalizedTextDto,
    // The date is the publication's, not a stored column — two dates could
    // disagree and the published one is the true one (the ADR-0069 D2 rule,
    // applied here for the same reason).
    publishDate: article.publishDate ? article.publishDate.toISOString() : null,
    coverMediaId: snapshot.coverMediaId ? String(snapshot.coverMediaId) : null,
    body,
    excerpt: { ar: excerptOf(body.ar), en: excerptOf(body.en) },
    seo: (snapshot.seo as PageSeoDto | null) ?? null,
  };
};
```

`richTextParagraphs` موجود بالفعل في `common/rich-text/rich-text-plain-text.ts` — لا تكتب ثانيًا.

- [ ] **Step 5: شغّل الاختبارات**

```
cd api && npm test -- --runInBand src/modules/public-communication/articles
```
المتوقع: PASS، واختبار الحقن أخضر.

**⏸ نقطة توقف من §٩:** إن نجا أي محتوى من التعقيم في هذا الاختبار — توقّف وأبلغ قبل أي خطوة أخرى.

---

## Task 9: الخدمة والمسارات وصفوف التدقيق المختصرة

**Files:**
- Create: `api/src/modules/public-communication/articles/articles.service.ts`
- Create: `api/src/modules/public-communication/articles/articles.controller.ts`
- Create: `api/src/modules/public-communication/articles/articles.module.ts`
- Modify: `api/src/common/constants/permission-resources.ts`
- Modify: `api/src/common/constants/permission-catalogue.ts`
- Modify: `api/src/common/constants/entity-content.ts`
- Modify: `api/src/app.module.ts`
- Test: `api/src/modules/public-communication/articles/articles.service.spec.ts`

**Interfaces:**
- Consumes: `PublishingService` (`assertCanEdit`, `submit`, `publishDirect`, `publishApproved`, `editorialState`, `restore`) · `PublicationsService.getPublicSnapshot` · `MediaAssetsService.assertUsableImage` · `AuditLogsService.write`
- Produces: `ArticlesService.{create,update,findPage,findById,findPublicBySlug,findPublicPage,setArchived,remove}`

- [ ] **Step 1: اكتب الاختبار الأحمر — التدقيق بلا متن**

```ts
it('records who changed an article and to what state, and never the text', async () => {
  await service.update(articleId, { body: { ar: doc, en: doc }, title }, actor, context);

  const [entry] = auditLogsService.write.mock.calls[0];
  // The brief's hard rule: auditLogs is consumed, never a second copy of the
  // newsroom. A snapshot here would put every draft of every article into the
  // one collection administrators can read over HTTP.
  expect(entry.newValue).toEqual({ publicationState: 'Draft', archived: false });
  expect(JSON.stringify(entry)).not.toContain('doc');
  expect(entry.entityType).toBe('articles');
  expect(entry.actorId.toString()).toBe(actor.userId);
});

it('refuses to edit an article while its review is running', async () => {
  publishingService.assertCanEdit.mockRejectedValue(new ForbiddenException({ code: 'underReview' }));

  await expect(service.update(articleId, patch, actor, context)).rejects.toMatchObject({
    response: { code: 'underReview' },
  });
});

it('hides an archived article from the public feed without unpublishing it', async () => {
  await service.setArchived(articleId, true, actor, context);

  expect(repository.updateById).toHaveBeenCalledWith(articleId, expect.objectContaining({ $set: expect.objectContaining({ archived: true }) }));
  // Still Live: archiving is a visibility flag over a published item, not a
  // retraction (D2).
  expect(repository.updateById.mock.calls[0][1].$set.publicationState).toBeUndefined();
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd api && npm test -- --runInBand src/modules/public-communication/articles
```
المتوقع: FAIL.

- [ ] **Step 3: اكتب الخدمة**

جوهرها — صف التدقيق المختصر، وهو بند القرار ٥:

```ts
  /**
   * One audit row per article change, carrying the decision and nothing else.
   *
   * `AuditLogInterceptor` is global and writes the pre-image and the whole
   * response body for every mutating request. For an article that means the
   * complete TipTap tree, in both languages, on every keystroke-sized save —
   * into the one collection that is readable over HTTP. So every write route
   * on this controller carries `@SkipAuditLog()` and lands here instead
   * (owner decision 2026-09-20, D5).
   *
   * What is recorded is who, when, which article, and the state either side.
   * What is not recorded is a single word of the article.
   */
  private writeArticleAudit = async (input: {
    entityId: Types.ObjectId;
    actorId: Types.ObjectId;
    previous: { publicationState: string; archived: boolean } | null;
    next: { publicationState: string; archived: boolean };
    reason: string;
    context: RequestContext;
  }): Promise<void> => {
    await this.auditLogsService.write({
      actorId: input.actorId,
      action: 'StatusChange',
      entityType: 'articles',
      entityId: input.entityId,
      previousValue: input.previous,
      newValue: input.next,
      reason: input.reason,
      ipAddress: input.context.ipAddress ?? '',
      userAgent: input.context.userAgent ?? '',
    });
  };
```

والقراءة العامة:

```ts
  /**
   * The public feed: live, not hidden, newest first.
   *
   * Each row's content comes from its Live publication's revision, never from
   * the article row — the "Approved ≠ Published" rule. The row is read only to
   * find WHICH articles are live and in what order; every word shown comes from
   * the frozen revision.
   */
  findPublicPage = async (skip: number, limit: number): Promise<{ items: ArticlePublicDto[]; total: number }> => {
    const { items, total } = await this.repository.findPaginated(skip, limit, {
      publicationState: 'Live',
      archived: false,
    });

    const snapshots = await Promise.all(
      items.map((article) => this.publicationsService.getPublicSnapshot('articles', article._id as Types.ObjectId)),
    );

    return {
      items: items.flatMap((article, index) => {
        const snapshot = snapshots[index];
        // A live row whose publication cannot be read is a broken pair, not a
        // half-article to render: it is dropped rather than shown with holes.
        return snapshot ? [toPublicDto(article, snapshot)] : [];
      }),
      total,
    };
  };
```

- [ ] **Step 4: اكتب الـcontroller**

```ts
@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly service: ArticlesService,
    private readonly publishingService: PublishingService,
  ) {}

  /** The public feed. Declared before `:id` so `public` is never read as an id. */
  @Get('public')
  @Public()
  findPublic(@Query() query: PaginationQueryDto) {
    return this.service.findPublicPage(query.skip ?? 0, query.limit ?? 12);
  }

  /** One article by its URL segment — what `/news/<slug>` renders. */
  @Get('public/:slug')
  @Public()
  findPublicBySlug(@Param('slug') slug: string) {
    return this.service.findPublicBySlug(slug);
  }

  @Post()
  @SkipAuditLog()
  @RequirePermission('articles', 'Create')
  create(@Body() dto: CreateArticleDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.create(dto, user, extractRequestContext(req));
  }

  @Get()
  @RequirePermission('articles', 'Read')
  findAll(@Query() query: QueryArticlesDto) {
    return this.service.findPage(query);
  }

  @Get(':id')
  @RequirePermission('articles', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/editorial-state')
  @RequirePermission('articles', 'Read')
  @ApiOkResponse({ type: EditorialStateDto })
  editorialState(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.publishingService.editorialState('articles', new Types.ObjectId(id), user);
  }

  @Patch(':id')
  @SkipAuditLog()
  @RequirePermission('articles', 'Update')
  async update(@Param('id') id: string, @Body() dto: UpdateArticleDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    // While a review is running the draft belongs to it — otherwise the
    // approval would attach to text the approver never saw.
    await this.publishingService.assertCanEdit('articles', new Types.ObjectId(id), user);
    return this.service.update(id, dto, user, extractRequestContext(req));
  }

  @Post(':id/submit')
  @SkipAuditLog()
  @RequirePermission('articles', 'Update')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.submit({
      entityType: 'articles',
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Publishes with no review — allowed only while the policy requires none. */
  @Post(':id/publish')
  @SkipAuditLog()
  @RequirePermission('articles', 'Publish')
  publish(@Param('id') id: string, @Body() dto: PublishArticleDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.publishDirect({
      entityType: 'articles',
      entityId: new Types.ObjectId(id),
      actor: user,
      expectedUpdatedAt: new Date(dto.expectedUpdatedAt),
      context: extractRequestContext(req),
    });
  }

  /** Publishes what the approvers approved. A separate act from approving it
   *  (D1), and a separate permission from editing it. */
  @Post(':id/publish-approved')
  @SkipAuditLog()
  @RequirePermission('articles', 'Publish')
  publishApproved(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.publishApproved({
      entityType: 'articles',
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Hides a published article from the feed, or returns it. Never deletes. */
  @Patch(':id/archived')
  @SkipAuditLog()
  @RequirePermission('articles', 'Update')
  setArchived(@Param('id') id: string, @Body() dto: SetArchivedDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.setArchived(id, dto.archived, user, extractRequestContext(req));
  }

  @Delete(':id')
  @SkipAuditLog()
  @RequirePermission('articles', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.remove(id, user, extractRequestContext(req));
  }
}
```

- [ ] **Step 5: سجّل المورد والصلاحيات والمحتوى**

في `permission-resources.ts` أضف `'articles',` بترتيبها الأبجدي (بعد `'albumsPage'`).

في `permission-catalogue.ts` أضف بنفس الترتيب:

```ts
  { resourceType: 'articles', action: 'Create' },
  { resourceType: 'articles', action: 'Read' },
  { resourceType: 'articles', action: 'Update' },
  { resourceType: 'articles', action: 'Delete' },
  { resourceType: 'articles', action: 'Publish' },
```

في `entity-content.ts` املأ الصفّين الفارغين:

```ts
  articles: [],   // PUBLISH_REQUIREMENTS — title and body are required by the
                  // schema itself, so nothing can reach publication missing
                  // them; a cover image is genuinely optional.
```

```ts
  articles: ['title', 'slug', 'coverMediaId', 'body', 'authorDisplayName', 'publishDate', 'seo'],
```

في `app.module.ts` أضف `ArticlesModule` تحت تعليق Domain 10.

- [ ] **Step 6: شغّل كل شيء**

```
cd api && npm test -- --runInBand src/modules/public-communication src/common/constants && npx tsc --noEmit
```
المتوقع: PASS، و`permission-catalogue.spec.ts` أخضر (يشتقّ القائمة من المصدر ويفشل عند أي تفاوت).

---

## Task 10: بذرة السياسة والتعريف والخطوات

**Files:**
- Modify: `api/src/bootstrap/seed-dev.ts`
- Test: `api/src/bootstrap/seed-dev.spec.ts`

**Interfaces:**
- Produces: قاعدة تطوير فيها `workflowPolicies(articles, Edit)` + تعريف نشط + خطوة واحدة، وخبر تجريبي واحد بحالة `Draft`

- [ ] **Step 1: اكتب الاختبار الأحمر**

```ts
it('seeds articles with a policy, an active definition and a satisfiable step', async () => {
  await seedDev(connection);

  const policy = await connection.collection('workflowPolicies').findOne({ entityType: 'articles', operation: 'Edit' });
  expect(policy).toMatchObject({ workflowRequired: true });

  const step = await connection.collection('workflowSteps').findOne({ workflowDefinitionId: policy!.workflowDefinitionId });
  // A step demanding more approvals than it names approvers would park every
  // article forever — the exact failure Task 5 made impossible to create.
  expect(step!.requiredApprovals).toBeLessThanOrEqual(new Set(step!.assigneeIds.map(String)).size);
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd api && npm test -- --runInBand src/bootstrap/seed-dev.spec.ts
```

- [ ] **Step 3: أضف البذرة**

اتبع بنية `seed-dev.ts` القائمة. البذرة تنشئ: تعريفًا واحدًا `{ name: { ar: 'اعتماد الأخبار', en: 'News approval' }, entityType: 'articles', isActive: true }`، وخطوة واحدة `Parallel` بـ`requiredApprovals: 1` معيَّنها `admin@uaeaf.ae`، وسياسة `{ entityType: 'articles', operation: 'Edit', workflowRequired: true, workflowDefinitionId }`.

- [ ] **Step 4: شغّل الاختبار**

```
cd api && npm test -- --runInBand src/bootstrap
```
المتوقع: PASS.

---

## Task 11: إثبات المسار كاملًا عبر الـAPI — بوابة المخرج الأهم

هذه المهمة هي أهم مخرج في الدفعة كلها، وتأتي قبل أي واجهة عمدًا.

**Files:**
- Create: `api/test/e2e/articles-publishing.e2e-spec.ts`

**Interfaces:**
- Consumes: كل ما سبق

- [ ] **Step 1: اكتب اختبار المسار الكامل**

```ts
describe('an article from draft to the public site', () => {
  it('travels the whole path and appears only at the end of it', async () => {
    const created = await post('/articles', draft, editorToken).expect(201);
    const id = created.body._id;

    // Nothing is public yet, and the feed says so rather than showing a draft.
    await get('/articles/public').expect(200).expect((r) => expect(r.body.items).toHaveLength(0));

    await post(`/articles/${id}/submit`, {}, editorToken).expect(201);

    // The editor cannot edit their own submission out from under the reviewer.
    await patch(`/articles/${id}`, { slug: 'changed' }, editorToken).expect(403);

    const state = await get(`/articles/${id}/editorial-state`, approverToken).expect(200);
    const instanceId = state.body.workflowInstanceId;

    await post(`/workflow-instances/${instanceId}/approve`, {}, approverToken).expect(201);

    // Approved is not published (D1). The feed is still empty.
    await get('/articles/public').expect(200).expect((r) => expect(r.body.items).toHaveLength(0));

    await post(`/articles/${id}/publish-approved`, {}, publisherToken).expect(201);

    const feed = await get('/articles/public').expect(200);
    expect(feed.body.items).toHaveLength(1);
    expect(feed.body.items[0].slug).toBe(draft.slug);

    const one = await get(`/articles/public/${draft.slug}`).expect(200);
    expect(one.body.body.ar).toEqual(draft.body.ar);
  });

  it('keeps the article text out of the audit trail', async () => {
    const rows = await auditLogs.find({ entityType: 'articles' }).toArray();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const serialised = JSON.stringify({ previousValue: row.previousValue, newValue: row.newValue });
      expect(serialised).not.toContain('paragraph');
      expect(serialised).not.toContain(draft.title.ar);
    }
  });

  it('refuses a publish nobody approved', async () => {
    const created = await post('/articles', { ...draft, slug: 'second' }, editorToken).expect(201);
    await post(`/articles/${created.body._id}/publish-approved`, {}, publisherToken)
      .expect(409)
      .expect((r) => expect(r.body.code).toBe('notApproved'));
  });

  it('hides an archived article from the feed without retracting it', async () => {
    await patch(`/articles/${id}/archived`, { archived: true }, editorToken).expect(200);
    await get('/articles/public').expect(200).expect((r) => expect(r.body.items).toHaveLength(0));
    // Still published: its URL keeps working, which is what distinguishes
    // archiving from unpublishing.
    await get(`/articles/public/${draft.slug}`).expect(200);
  });
});
```

- [ ] **Step 2: شغّله**

```
cd api && npm run test:e2e -- --runInBand articles-publishing
```
المتوقع: PASS.

**⏸ بوابة المرحلة ٢ — قف هنا.** المسار الأساسي صار مُثبَتًا آليًا. اعرض التقرير واطلب مراجعة الكود عبر `superpowers:requesting-code-review` قبل الانتقال — الباك اند الحرج انتهى هنا.

---

# المرحلة ٣ — الموقع العام

## Task 12: قراءة تصميم Figma

**⚠️ الخطوة الأولى إلزامية ولا تُتخطّى:** استدعِ مهارة `figma:figma-design-to-code` **قبل** أي نداء `get_design_context`.

- [ ] **Step 1: استدعِ المهارة**

```
Skill(skill="figma:figma-design-to-code")
```

- [ ] **Step 2: اقرأ العقدتين**

- القائمة: `https://www.figma.com/design/hpO727vjwl18g3s3LTICAY/uaeaf-desgin?node-id=2616-1380`
- المفرد: `https://www.figma.com/design/hpO727vjwl18g3s3LTICAY/uaeaf-desgin?node-id=2616-1381`

اقرأ `get_design_context` ثم `get_screenshot` لكل عقدة. **`get_metadata` يقرأ أسماء الطبقات لا النص المعروض** — لا تسجّل أي عيب نصّي أو لوني قبل التصيير بـ`get_screenshot`.

- [ ] **Step 3: سجّل الفجوات قبل الكتابة**

اكتب في تقرير المرحلة: كل قيمة في التصميم لا يقابلها token قائم. لا تخترع قيمة — صنّفها `DESIGN SYSTEM GAP` واستعمل أقرب token موثّق، وسجّل ذلك.

إن تعذّر تطبيق التصميم حرفيًا لسبب تقني: اعرض البديل الأقرب واستمر (§٩)، ولا تتوقف طويلًا.

---

## Task 13: صفحة قائمة الأخبار

**Files:**
- Modify: `apps/web/src/app/[locale]/news/page.tsx`
- Create: `apps/web/src/components/pages/news/news-list.tsx`
- Create: `apps/web/src/lib/api/articles.ts`
- Modify: `apps/web/src/lib/pages/public-pages.ts`
- Modify: `apps/web/src/lib/pages/indexability.ts`
- Modify: `apps/web/src/lib/api/types.ts`
- Test: `apps/web/src/components/pages/news/news-list.spec.tsx`

**Interfaces:**
- Consumes: `GET /articles/public` و`GET /articles/public/:slug` عبر `fetchPublic`
- Produces — هذه الأسماء بعينها تستعملها Tasks 14 و15:
  - `ArticlePublic` في `lib/api/types.ts`، مطابق حقلًا بحقل لـ`ArticlePublicDto` من Task 8، ومتنه `RichTextNode` لا `unknown`:
    ```ts
    export interface ArticlePublic {
      id: string;
      slug: string;
      title: LocalizedText;
      authorDisplayName: LocalizedText;
      publishDate: string | null;
      coverMediaId: string | null;
      body: { ar: RichTextNode; en: RichTextNode };
      excerpt: LocalizedText;
      seo: { metaTitle: LocalizedText | null; metaDescription: LocalizedText | null; ogImageId: string | null } | null;
    }
    ```
  - `fetchArticles(skip: number, limit: number): Promise<Paginated<ArticlePublic> | null>`
  - `fetchArticle(slug: string): Promise<ArticlePublic | null>`
  - `<NewsList items={ArticlePublic[]} locale={AppLocale} />`

- [ ] **Step 1: اكتب الاختبار الأحمر**

```tsx
it('renders nothing at all when no article is live', () => {
  // "No empty shelf": a section with nothing in it is absent, not a heading
  // over a blank strip.
  const { container } = render(<NewsList items={[]} locale="ar" />);
  expect(container).toBeEmptyDOMElement();
});

it('reads right to left in Arabic and left to right in English', () => {
  const { rerender } = render(<NewsList items={[article]} locale="ar" />);
  expect(screen.getByRole('list')).toHaveAttribute('dir', 'rtl');
  rerender(<NewsList items={[article]} locale="en" />);
  expect(screen.getByRole('list')).toHaveAttribute('dir', 'ltr');
});

it('links each item by its slug, not its id', () => {
  render(<NewsList items={[article]} locale="ar" />);
  expect(screen.getByRole('link', { name: article.title.ar })).toHaveAttribute('href', `/ar/news/${article.slug}`);
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd apps/web && npx vitest run --pool=threads src/components/pages/news
```

- [ ] **Step 3: نفّذ القائمة بقيم التصميم من Task 12**

استعمل tokens النظام حصرًا. الشبكة والفواصل والأحجام من العقدة `2616-1380`. صنف اللون: `neutral` — كما هو مسجَّل في `public-pages.ts` نقلًا عن §3.34.2 («خلفية محايدة، لمسات خضراء في الطباعة»). لا تغيّره.

- [ ] **Step 4: افتح القناة للفهرسة**

في `public-pages.ts` غيّر صف `news`:

```ts
    // Live since the articles module: the listing has something to list, so
    // Chapter 14 §11's noindex hold no longer applies.
    listEndpoint: "/articles/public",
```

وفي `indexability.ts` أضف حالة قبل `default`:

```ts
    case "news": {
      const response = await fetchPublic<Paginated<ArticlePublic>>("/articles/public");
      return Array.isArray(response?.items) && response.items.length > 0;
    }
```

- [ ] **Step 5: شغّل الاختبارات**

```
cd apps/web && npx vitest run --pool=threads src/components/pages/news src/lib/pages
```
المتوقع: PASS.

---

## Task 14: صفحة الخبر المفردة

**Files:**
- Create: `apps/web/src/app/[locale]/news/[slug]/page.tsx`
- Create: `apps/web/src/components/pages/news/article-screen.tsx`
- Modify: `apps/web/src/lib/seo/json-ld.tsx`
- Test: `apps/web/src/components/pages/news/article-screen.spec.tsx`

**Interfaces:**
- Consumes: `GET /articles/public/:slug` · `RichText` من `@/components/rich-text/rich-text`
- Produces: `<ArticleScreen article locale />` · `NewsArticleJsonLd`

- [ ] **Step 1: اكتب الاختبار الأحمر**

```tsx
it('draws the body as elements and never as markup', () => {
  const hostile = { type: 'doc', content: [{ type: 'script', content: [{ type: 'text', text: 'alert(1)' }] }] };
  const { container } = render(<ArticleScreen article={{ ...article, body: { ar: hostile, en: hostile } }} locale="ar" />);

  // The renderer is an allowlist that fails closed: a node it does not name is
  // not drawn. Nothing reaches the page as HTML, so a document that somehow
  // skipped server validation still cannot execute.
  expect(container.querySelector('script')).toBeNull();
  expect(container.innerHTML).not.toContain('alert(1)');
});

it('gives the page exactly one h1', () => {
  render(<ArticleScreen article={article} locale="ar" />);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

- [ ] **Step 3: نفّذ الشاشة بقيم العقدة `2616-1381`**

المتن يمرّ عبر `<RichText doc={article.body[locale]} locale={locale} />` — لا `dangerouslySetInnerHTML` تحت أي ظرف.

- [ ] **Step 4: أضف `generateMetadata` و`generateStaticParams`**

```tsx
export const generateMetadata = async ({ params }: { params: Promise<{ locale: AppLocale; slug: string }> }): Promise<Metadata> => {
  const { locale, slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return { robots: { index: false, follow: true } };

  return buildMetadata({
    locale,
    route: `/news/${slug}`,
    // The editor's override wins; the headline is the honest fallback rather
    // than a truncation of the body.
    title: article.seo?.metaTitle?.[locale] ?? article.title[locale],
    description: article.seo?.metaDescription?.[locale] ?? article.excerpt[locale],
    indexable: true,
    ogType: 'article',
  });
};
```

- [ ] **Step 5: أضف `NewsArticleJsonLd`**

في `json-ld.tsx`، بنفس انضباط الملف: لا تصف إلا ما تعرضه الصفحة فعلًا.

```tsx
/**
 * Chapter 14 §4 maps Article → `NewsArticle`.
 *
 * Every value below is on the page: the headline in the h1, the byline and the
 * date under it, the cover image above it. `datePublished` is the publication's
 * own timestamp, not an author-chosen field — two dates could disagree and the
 * published one is the true one.
 */
export const NewsArticleJsonLd = ({
  locale,
  article,
  /** Resolved by the page through `fetchPublicMedia`, because the article
   *  carries an id and §4 forbids describing an image the page does not show —
   *  an unresolvable id is exactly that case. */
  coverUrl,
}: {
  locale: AppLocale;
  article: ArticlePublic;
  coverUrl?: string;
}) => (
  <JsonLd
    data={{
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title[locale],
      datePublished: article.publishDate,
      author: { '@type': 'Person', name: article.authorDisplayName[locale] },
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
      mainEntityOfPage: absoluteUrl(locale, `/news/${article.slug}`),
      ...(coverUrl ? { image: coverUrl } : {}),
    }}
  />
);
```

واختبره بأن غياب الصورة لا يُنتج مفتاحًا فارغًا:

```tsx
it('omits the image entirely when the cover cannot be resolved', () => {
  const { container } = render(<NewsArticleJsonLd locale="ar" article={article} />);
  expect(JSON.parse(container.querySelector('script')!.innerHTML)).not.toHaveProperty('image');
});
```

- [ ] **Step 6: شغّل الاختبارات**

```
cd apps/web && npx vitest run --pool=threads src/components/pages/news src/lib/seo
```

---

## Task 15: خريطة موقع الأخبار

**Files:**
- Create: `apps/web/src/app/sitemap-news.ts`
- Modify: `apps/web/src/app/sitemap.ts`
- Test: `apps/web/src/app/sitemap-news.spec.ts`

**Interfaces:**
- Produces: ملف خريطة منفصل للأخبار، كما يفرض §١٣ من Chapter 14 («خرائط منفصلة بحسب نوع المحتوى»)

- [ ] **Step 1: اكتب الاختبار الأحمر**

```ts
it('lists live articles and drops the ones hidden from the feed', async () => {
  const entries = await sitemapNews();
  expect(entries.map((entry) => entry.url)).toEqual([
    'http://localhost:3001/ar/news/live-one',
    'http://localhost:3001/en/news/live-one',
  ]);
});

it('lists nothing when nothing is published', async () => {
  // §13: "Content in any state other than Published MUST NOT appear in any
  // Sitemap." An empty file is the correct answer, not a missing one.
  expect(await sitemapNews()).toEqual([]);
});
```

- [ ] **Step 2: شغّله، نفّذ، شغّل ثانية**

`sitemap-news.ts` يقرأ `/articles/public` بـ`revalidate = 3600` (نفس قيمة `sitemap.ts`)، ويبني مدخلة لكل لغة مع `alternates.languages` بنفس نمط الملف القائم.

في `sitemap.ts` لا تُضف الأخبار — أضف تعليقًا يوجّه إلى الملف الجديد، ليبقى «خريطة واحدة لكل نوع» صحيحًا في الكود كما في الوثيقة.

**⏸ بوابة المرحلة ٣ — قف هنا.** التقرير + لقطات AR/EN عند 1440 و390 في الوضعين، والمقارنة بلقطة Figma.

---

# المرحلة ٤ — تبويب الداشبورد

> كل شاشة هنا تتبع نمط شاشات الرعاة (`components/admin/sponsor-relations/`) وtokens النظام. لا تصميم جديد يُخترع (§٨). ولا Figma لهذه الشاشات — وهذا مسجَّل ومقبول.

## Task 16: تسجيل الخبر في بنية التحرير + شاشة القائمة

**Files:**
- Modify: `apps/dashboard/src/lib/admin/editorial-entities.ts`
- Create: `apps/dashboard/src/lib/admin/articles.ts`
- Create: `apps/dashboard/src/app/[locale]/(app)/news/page.tsx`
- Create: `apps/dashboard/src/components/admin/news/list.tsx`
- Modify: `apps/dashboard/src/lib/navigation.ts`
- Modify: `apps/dashboard/messages/ar.json`, `en.json`
- Test: `apps/dashboard/src/components/admin/news/list.spec.tsx`

**Interfaces:**
- Produces: مدخلة `articles` في `EDITORIAL_ENTITIES` — وبها تعمل كل المسارات العامة القائمة بلا معالج جديد

- [ ] **Step 1: اكتب الاختبار الأحمر**

```tsx
it('shows every state and filters by it', async () => {
  render(<ArticleList articles={[draft, live, hidden]} locale="ar" />);

  await userEvent.selectOptions(screen.getByLabelText('الحالة'), 'Live');
  expect(screen.queryByText(draft.title.ar)).not.toBeInTheDocument();
  expect(screen.getByText(live.title.ar)).toBeInTheDocument();
});

it('derives the transitional state from the review, not from a column', () => {
  // D2: the article row stores two states. "Under review" is a fact about the
  // latest workflow instance and is read from there.
  render(<ArticleList articles={[{ ...draft, editorial: { workflowStatus: 'InProgress' } }]} locale="ar" />);
  expect(screen.getByText('قيد المراجعة')).toBeInTheDocument();
});

it('marks a rejected draft distinctly from one asking for changes', () => {
  render(<ArticleList articles={[rejected, needsRevision]} locale="ar" />);
  expect(screen.getByText('مرفوض')).toBeInTheDocument();
  expect(screen.getByText('مطلوب تعديل')).toBeInTheDocument();
});
```

- [ ] **Step 2: شغّله وتأكد أنه يفشل**

```
cd apps/dashboard && npx vitest run --pool=threads src/components/admin/news
```

- [ ] **Step 3: سجّل الكيان**

في `editorial-entities.ts` أضف إلى `EDITORIAL_ENTITIES`:

```ts
  {
    entityType: "articles",
    apiPath: "/articles",
    readPermission: "articles:Read",
    updatePermission: "articles:Update",
    publishPermission: "articles:Publish",
  },
```

وحدّث تعليق الملف: صارت أربعة أنواع لا ثلاثة، والرابع أول **مجموعة** لا صفحة مفردة.

- [ ] **Step 4: نفّذ القائمة والرابط والنصوص**

في `navigation.ts` أضف بعد `strategicPlan`:

```ts
  /**
   * The newsroom. Three jobs open it, not two: writing, reviewing, and
   * publishing what a review approved — the third is a permission of its own
   * since publishing stopped being a side effect of approval (D1).
   */
  {
    key: "news",
    href: "/news",
    requires: [
      { resourceType: "articles", action: "Update" },
      { resourceType: "articles", action: "Publish" },
      { resourceType: "workflowInstances", action: "Approve" },
    ],
    children: NEWS_SCREENS,
  },
```

مع `NEWS_SCREENS` تحوي `news` و`newsApprovals` و`newsPolicy`. أضف مفاتيح `Nav` المقابلة إلى ملفي الرسائل بالعربية والإنجليزية.

- [ ] **Step 5: شغّل الاختبارات**

```
cd apps/dashboard && npx vitest run --pool=threads src/components/admin/news src/lib
```

---

## Task 17: شاشة إضافة/تعديل خبر

**Files:**
- Create: `apps/dashboard/src/app/[locale]/(app)/news/[id]/page.tsx`
- Create: `apps/dashboard/src/components/admin/news/editor.tsx`
- Create: `apps/dashboard/src/components/admin/news/article-fields.tsx`
- Test: `apps/dashboard/src/components/admin/news/editor.spec.tsx`

**Interfaces:**
- Consumes: `LazyBilingualRichText` · `SeoFields` · `MediaPicker` · `EditorShell` · `StatusPanel` — كلها قائمة
- Produces: `<ArticleEditor record images canEdit editorial locale />`

- [ ] **Step 1: اكتب الاختبار الأحمر**

```tsx
it('loads the editor through the lazy entry point, never directly', () => {
  // TipTap and ProseMirror are the largest thing the dashboard ships and
  // exactly two screens need them. Importing the editor directly would put
  // them into the shared bundle for everyone who opens the users list.
  const source = readFileSync('src/components/admin/news/editor.tsx', 'utf8');
  expect(source).toContain('LazyBilingualRichText');
  expect(source).not.toMatch(/from "@tiptap/);
});

it('goes read-only for a reviewer who cannot write', () => {
  render(<ArticleEditor {...props} canEdit={false} />);
  expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
});

it('warns before leaving with unsaved changes', async () => {
  render(<ArticleEditor {...props} />);
  await userEvent.type(screen.getByLabelText('الرابط'), 'x');
  expect(screen.getByText(/تغييرات غير محفوظة/)).toBeInTheDocument();
});
```

- [ ] **Step 2: شغّله، نفّذ، شغّل ثانية**

الحقول بالترتيب: العنوان (ثنائي اللغة)، الرابط `slug`، صورة الغلاف، المتن (`LazyBilingualRichText`)، اسم الكاتب الظاهر، ثم مجموعة SEO عبر `SeoFields` القائم. زر «إرسال للمراجعة» يُستدعى عبر المسار العام `/api/admin/editorial/articles/<id>/submit` — لا معالج جديد.

**بديهية المحرّر تحديدًا** (`frontend-design` + `ui-ux-pro-max`): الحفظ لا يُعطَّل بسبب عدم جاهزية النشر — «العجز عن النشر ليس عجزًا عن العمل»، وهي القاعدة التي يطبّقها `allowedActions` على الخادم بالفعل.

---

## Task 18: شاشة الموافقات والعدّاد

**Files:**
- Create: `apps/dashboard/src/app/[locale]/(app)/news/approvals/page.tsx`
- Create: `apps/dashboard/src/components/admin/news/approvals-inbox.tsx`
- Modify: `apps/dashboard/src/lib/navigation.ts`
- Test: `apps/dashboard/src/components/admin/news/approvals-inbox.spec.tsx`

**Interfaces:**
- Consumes: `GET /articles?publicationState=Draft` + `editorial-state` لكل صف
- Produces: `<ApprovalsInbox items locale />` · `pendingForMe(items, userId): number`

- [ ] **Step 1: اكتب الاختبار الأحمر**

```tsx
it('lists only what this reader is actually assigned to decide', () => {
  // The server already computes this: `availableActions` contains 'approve'
  // exactly when the caller is an assignee of the current step. Re-deriving it
  // in the browser would be a second rule to disagree with the first.
  render(<ApprovalsInbox items={[assignedToMe, assignedToSomeoneElse]} locale="ar" />);

  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByText(assignedToMe.title.ar)).toBeInTheDocument();
});

it('offers refusal and change-request as two distinct decisions', async () => {
  render(<ApprovalsInbox items={[assignedToMe]} locale="ar" />);
  expect(screen.getByRole('button', { name: 'رفض' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'طلب تعديل' })).toBeInTheDocument();
});

it('asks for a reason before either refusal', async () => {
  render(<ApprovalsInbox items={[assignedToMe]} locale="ar" />);
  await userEvent.click(screen.getByRole('button', { name: 'طلب تعديل' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('سبب');
});
```

- [ ] **Step 2: شغّله، نفّذ، شغّل ثانية**

الزران يستدعيان المسار نفسه `/api/admin/editorial/articles/<instanceId>/reject`، ويختلفان في `revisionRequested` فقط — وهو عين قرار D6.

العدّاد في التنقّل يقرأ الطول نفسه الذي ترسمه الشاشة، من دالة واحدة `pendingForMe`، حتى لا يقول الرقم شيئًا وتقول القائمة غيره.

---

## Task 19: شاشة النشر

**Files:**
- Create: `apps/dashboard/src/components/admin/news/publish-panel.tsx`
- Test: `apps/dashboard/src/components/admin/news/publish-panel.spec.tsx`

- [ ] **Step 1: اكتب الاختبار الأحمر**

```tsx
it('offers publishing only for what has been approved', () => {
  render(<PublishPanel items={[approved, stillInReview, draftOnly]} locale="ar" />);
  expect(screen.getAllByRole('button', { name: 'نشر' })).toHaveLength(1);
});

it('confirms before publishing, and re-reads the state at the confirming press', async () => {
  // CLAUDE.md §31: the guard runs where the action runs. Between opening the
  // dialog and pressing it, the approval can be superseded by a resubmission.
  render(<PublishPanel items={[approved]} locale="ar" onPublish={onPublish} />);
  await userEvent.click(screen.getByRole('button', { name: 'نشر' }));
  await userEvent.click(screen.getByRole('button', { name: 'تأكيد' }));

  expect(onPublish).toHaveBeenCalledWith(approved.id, { recheckedAt: expect.any(Number) });
});
```

- [ ] **Step 2: شغّله، نفّذ، شغّل ثانية**

الزر ظاهر فقط حين تحوي `availableActions` القيمة `'publish'` — يُقرأ من الخادم، لا يُعاد اشتقاقه.

---

## Task 20: شاشة إعداد سياسة الموافقة

**Files:**
- Create: `apps/dashboard/src/app/[locale]/(app)/news/policy/page.tsx`
- Create: `apps/dashboard/src/components/admin/news/policy-editor.tsx`
- Create: `apps/dashboard/src/lib/admin/approval-policy.ts`
- Create: `apps/dashboard/src/app/api/admin/approval-policy/route.ts`
- Test: `apps/dashboard/src/components/admin/news/policy-editor.spec.tsx`

**Interfaces:**
- Consumes: `PUT /workflow-policies/articles/Edit` · `POST /workflow-definitions` · `POST /workflow-steps` · `GET /users`
- Produces — الدالة التي تترجم اختيار الأدمن إلى خطوات، وهي جوهر D4:

  ```ts
  export type ApprovalMode = "ALL" | "THRESHOLD" | "SEQUENTIAL";

  /** One step as `POST /workflow-steps` takes it, minus the definition id —
   *  the caller adds that after creating the definition, so this function
   *  stays a pure translation of the administrator's choice. */
  export interface StepInput {
    sequenceOrder: number;
    stepType: "Sequential" | "Parallel";
    assigneeIds: string[];
    requiredApprovals: number;
  }

  export const buildSteps = (
    mode: ApprovalMode,
    approverIds: readonly string[],
    threshold?: number,
  ): StepInput[] => { /* … */ };
  ```

- [ ] **Step 1: اكتب الاختبار الأحمر**

```ts
describe('buildSteps', () => {
  it('ALL becomes one parallel step needing every approver', () => {
    expect(buildSteps('ALL', [a, b, c])).toEqual([
      { sequenceOrder: 1, stepType: 'Parallel', assigneeIds: [a, b, c], requiredApprovals: 3 },
    ]);
  });

  it('THRESHOLD becomes one parallel step needing the chosen number', () => {
    expect(buildSteps('THRESHOLD', [a, b, c], 2)).toEqual([
      { sequenceOrder: 1, stepType: 'Parallel', assigneeIds: [a, b, c], requiredApprovals: 2 },
    ]);
  });

  it('SEQUENTIAL becomes one step per approver, in the order chosen', () => {
    expect(buildSteps('SEQUENTIAL', [a, b])).toEqual([
      { sequenceOrder: 1, stepType: 'Sequential', assigneeIds: [a], requiredApprovals: 1 },
      { sequenceOrder: 2, stepType: 'Sequential', assigneeIds: [b], requiredApprovals: 1 },
    ]);
  });

  it('refuses a threshold above the number of approvers', () => {
    // The API refuses this too (Task 5). Refusing it here as well means the
    // administrator is told at the control they just moved, not after a save.
    expect(() => buildSteps('THRESHOLD', [a, b], 3)).toThrow(/approvers/);
  });
});
```

- [ ] **Step 2: شغّله، نفّذ، شغّل ثانية**

الشاشة: مفتاح «تتطلب الأخبار موافقة؟» (`workflowRequired`)، ثم النمط من ثلاثة، ثم اختيار الموافقين من قائمة المستخدمين، ثم العدد إن كان النمط `THRESHOLD`. الحفظ يستبدل خطوات التعريف بالكامل ثم يحدّث السياسة.

**⏸ بوابة المرحلة ٤ — قف هنا.** التقرير + `axe` على الشاشات الخمس.

---

# المرحلة ٥ — التحقق والتسليم

## Task 21: المسار الحيّ باللقطات

**⚠️ قبل التشغيل:** طبّق إجراءَي §٣٢ من CLAUDE.md. وبعد أي إيقاف، تأكد ألا تبقى عملية `node` يتيمة تحجز منفذًا. واستعمل `localhost` لا `127.0.0.1` — الأخير لا يُميّه في Next 16 إطلاقًا.

- [ ] **Step 1: شغّل الخوادم وتحقق من المنافذ**

```
netstat -ano | findstr ":3000 :3001 :3002"
```
تأكد أن `:3000` يستمع فعلًا قبل اتهام أي عميل.

- [ ] **Step 2: التقط المسار بـPlaywright**

اللقطات في مجلد الـscratchpad حصرًا، **لا داخل المستودع** — ومرّر مسارًا مطلقًا.

التسلسل المطلوب إثباته بلقطة لكل خطوة:
1. إنشاء خبر في الداشبورد
2. إرسال للمراجعة
3. شاشة الموافقات تُظهره للموافِق
4. الموافقة، والانتقال التلقائي إلى «معتمد»
5. شاشة النشر تعرض زر النشر الآن ولم تكن تعرضه قبل
6. النشر
7. ظهوره على `/ar/news` و`/ar/news/<slug>`

- [ ] **Step 3: اختبر نمطًا واحدًا من الأنماط الثلاثة حيًّا على الأقل**

النمط `THRESHOLD` هو الأجدر: `ALL` و`SEQUENTIAL` حالتان طرفيتان منه، والثلاثة مغطّاة بالوحدة في Task 20.

- [ ] **Step 4: أثبت خلو `auditLogs` من المحتوى**

```
mongosh --quiet --eval 'db.getSiblingDB("uaeaf").auditLogs.find({entityType:"articles"}).forEach(r=>printjson({previousValue:r.previousValue,newValue:r.newValue}))'
```
المتوقع: حقول حالة فقط، ولا أثر لـ`paragraph` ولا لأي نص من الخبر.

- [ ] **Step 5: axe على الشاشات الجديدة كلها**

خمس شاشات داشبورد + صفحتان عامتان، بالعربية والإنجليزية، في الوضعين. المطلوب: صفر مخالفات.

- [ ] **Step 6: تشغيل نظيف أخير**

```
cd api && npm test -- --runInBand && npm run test:e2e -- --runInBand && npx tsc --noEmit
cd apps/web && npx vitest run --pool=threads
cd apps/dashboard && npx vitest run --pool=threads
```

- [ ] **Step 7: مزامنة التوثيق**

- ADR-0086 يوثّق D1 و D2 و D3 و D6 (فصل النشر، الحالة الثنائية، الـslug، علم طلب التعديل)
- `docs/engineering/deployment-checklist.md`: بند فهرس `workflowSteps` الجديد
- `api/docs/api/public-api-contract.md`: مسارا القراءة العامة الجديدان
- `openapi.json` يُعاد توليده

---

## أوامر الالتزام — نصًّا، يشغّلها المالك

Git ممنوع على الوكيل (§٣٣). هذه للنسخ واللصق، مرحلة مرحلة. كلها من جذر المستودع.

**المرحلة ١ — المحرّك.** تمرّ الاختبارات وحدها؛ لا تكسر البناء.

```
git add api/src/modules/workflow api/test/e2e/workflow-engine.e2e-spec.ts api/test/e2e/president-message-publishing.e2e-spec.ts
git commit -m "feat(workflow): separate publishing from approval, and tell a change request from a refusal"
```

**المرحلة ٢ — كيان الخبر.** لا تلتزم بها وحدها قبل المرحلة ١: `ArticlesModule` يستدعي `publishApproved`، والبناء يفشل بدونها.

```
git add api/src/modules/public-communication/articles api/src/common/constants api/src/app.module.ts api/src/bootstrap/seed-dev.ts api/test/e2e/articles-publishing.e2e-spec.ts
git commit -m "feat(articles): the news entity, its sanitised bilingual body, and its audit trail without the text"
```

**المرحلة ٣ — الموقع العام.** تمرّ وحدها.

```
git add apps/web/src
git commit -m "feat(web): the news listing and article pages, with NewsArticle data and their own sitemap"
```

**المرحلة ٤ — الداشبورد.** تمرّ وحدها.

```
git add apps/dashboard/src apps/dashboard/messages
git commit -m "feat(dashboard): the newsroom — list, editor, approvals, publishing and the approval policy"
```

**المرحلة ٥ — التوثيق.**

```
git add docs api/docs api/openapi.json
git commit -m "docs: ADR-0086 and the contract, index and checklist updates it implies"
```

**تأكيد الأسرار:** لا شيء في هذه المسارات يحمل سرًّا. `api/.env` غير مُدرَج ولا يُدرَج. اللقطات كلها في مجلد الـscratchpad خارج المستودع.

---

## التقدير مقابل الواقع

| المرحلة | التقدير | المهام |
|---|---|---|
| ١ — المحرّك | يوم ونصف | 1–6 |
| ٢ — كيان الخبر | يومان | 7–11 |
| ٣ — الموقع العام | يوم ونصف | 12–15 |
| ٤ — الداشبورد | ثلاثة أيام | 16–20 |
| ٥ — التحقق | نصف يوم | 21 |

**المسار الأساسي الكامل مُثبَت آليًا عند نهاية Task 11** — أي بعد ثلاثة أيام ونصف، قبل اكتمال أي واجهة. هذا هو الترتيب الذي يفرضه §١١ من الطلب.

نقطة توقف من §٩: تجاوز أي مرحلة نصف يوم إضافي عن تقديرها يوجب التوقف والإبلاغ.

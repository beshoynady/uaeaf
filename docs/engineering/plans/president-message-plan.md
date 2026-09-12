# خطة تنفيذ صفحة "كلمة الرئيس" (President's Message)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** صفحة عامة `/about/president` بموشن مضبوط، وشاشة إدارة في `apps/dashboard` تحرّر الكلمة بـ TipTap وتنشرها عبر مسار موافقات أو نشر مباشر تحكمه سياسة النشر، مع نظام toasts عام للداش بورد.

**Architecture:** الـ API يبقى المصدر الوحيد للحقيقة: السجل (مسودة) ← revision (لقطة يبنيها السيرفر) ← publication (العلني). خدمة `PublishingService` جديدة في وحدة workflow تقرأ `WorkflowPolicy` وتقرر: مسار موافقات، أو نشر مباشر لحامل `<entityType>:Publish`، أو منع. الموقع العام يقرأ اللقطة المنشورة فقط، ويعرض نص الكلمة من TipTap JSON بمُعرِض (renderer) بلا مكتبة وبلا `dangerouslySetInnerHTML`.

**Tech Stack:** NestJS 11 + Mongoose 9 (`api/`)، وNext.js 16 App Router + next-intl 4 + Tailwind v4 (`apps/web`، `apps/dashboard`)، و`@uaeaf/design-tokens`، وTipTap 3.31.3 في الداش بورد فقط (بعد الموافقة، س٦).

**Spec:** هذا الملف (الجزء الأول) + `docs/design-specs/page-president-message.md` §7 + `docs/design-system/reviews/figma-vs-code-audit.md` §8 + `docs/engineering/reviews/workflow-integrity-review.md`.

---

## الحالة

| البند | الحالة |
|---|---|
| المرحلة أ (تصميم، قراءة فقط) | **مكتملة 2026-09-12.** بانتظار موافقة المالك على أ١–أ٦ وعلى الأسئلة س١–س١٧ (الجزء الثالث) |
| المراحل ب–هـ | لم تبدأ. لم يُكتب أي كود ولم يُعدَّل أي ملف غير هذا الملف |
| كود الخطوات | يُكتب بتفصيل TDD خطوة بخطوة عند بدء كل مرحلة، بعد الموافقة. كتابته الآن تعني كتابة كود لتصميم لم يُعتمد، وسيتغير مع إجابات الأسئلة |

**لاستئناف العمل في جلسة جديدة:** اقرأ هذا الملف كاملًا، ثم §7 من `page-president-message.md`، ثم افتح المرحلة الأولى غير المكتملة في الجزء الثاني. كل مهمة تذكر ملفاتها واختباراتها ومعيار انتهائها.

## Global Constraints

- ممنوع أي أمر Git. المالك يعمل commit بعد تقرير كل مرحلة.
- أي تغيير schema أو dependency جديدة يحتاج موافقة صريحة قبل التنفيذ.
- الهيدر والفوتر مكونات مشتركة موجودة، ولا تُعدَّل.
- كل قيمة لون أو مسافة أو مدة أو easing من الـ tokens. لا قيم hardcoded (CLAUDE.md §16).
- الأزرار 44px من ثوابت `apps/dashboard/src/components/ui/interactive.ts` (فيها `min-h-11` أصلًا). ADR-0068 D2.
- أيقونات الواجهة من Lucide (ADR-0068 D6).
- تخزين نص الكلمة TipTap JSON لكل لغة، يتحقق منه السيرفر بـ allowlist. العربي بلا italic، وبلا justify، وبلا محاذاة يدوية (Ch.4 §4.6)، ويرفض السيرفر هذه العناصر حتى من طلب API مباشر.
- النشر المباشر يحتاج `presidentMessagePage:Publish`. لا أحد يتجاوز الموافقات لأنه يستطيع التحرير.
- التفويض مخفي من الواجهة (يرجع `403` على السيرفر).
- TDD لكل كود: اختبار يفشل أولًا. ولا ادعاء نجاح بلا تشغيل (verification-before-completion).
- السيرفرات: api + dashboard للمرحلة ج، وapi + web للمرحلة د، لا الثلاثة معًا. الـ suite الكاملة مرة في نهاية كل مرحلة والسيرفرات متوقفة (جهاز 7.9 GB).
- الـ pre-push hook يفحص أن `api/openapi.json` مُعاد توليده.
- لا حركة: loop، أو scroll-jacking، أو parallax على نص القراءة، أو شريط تقدم قراءة. `transform` و`opacity` فقط، وclip مسموح لعنصر الـ LCP فقط بشرط أن يبدأ مرئيًا.

---

# الجزء الأول — التصميم

## أ١. الـ schema: تحليل الفجوة

**المصدر:** `api/src/modules/federation-governance/president-message-page/schemas/president-message-page.schema.ts` (يرث `HeroPageSchema`).

**ما هو موجود اليوم:** `heroImageId`، و`heroTitle`، و`heroSubtitle`، و`federationAppointmentId` (إلزامي)، و`goals: ContentBlock[]`، و`messageBody: {ar,en}` كنص عادي، و`signatoryName`، و`signatoryTitle`، و`publicationState`.

**مسارات الـ API الموجودة:** create، وlist، وget، و`GET /:id/public`، وdelete فقط. **لا مسار تحديث إطلاقًا.**

### جدول التتبّع

| العنصر في الصفحة | الحقل | الحالة | الملاحظة |
|---|---|---|---|
| hero: صورة الخلفية | `heroImageId` → `mediaAssets` | موجود | |
| hero: alt الخلفية {ar,en} | `mediaAssets.altText` | موجود | الـ alt ملك الأصل نفسه، فلا حقل alt على الصفحة (لا تكرار) |
| hero: صورة الرئيس | **`featuredImageId`** → `mediaAssets` | **ناقص** | الاسم من ADR-0044 (`featured_image`، الذي أُضيف أصلًا لصورة الرئيس). وليس `federationPersonnel.photoId`: كلمة مؤرشفة يجب أن تبقى بصورتها حتى لو تغيّرت صورة الدليل |
| hero: alt صورة الرئيس {ar,en} | `mediaAssets.altText` | موجود | |
| hero: العنوان H1 | `heroTitle` | موجود | القيمة الأولى من IA: "كلمة الرئيس" / "President's Message" (§7.4) |
| hero: الاسم | `signatoryName` | موجود | الحقل نفسه يغذي الخاتمة: عنصران من حقل واحد، لا تكرار |
| hero: المنصب | `heroSubtitle` | موجود | توصيتي في **س٢**. البديل `signatoryTitle` يترك `heroSubtitle` بلا عنصر |
| breadcrumb | رسائل IA (`Nav.presidentMessage`) | موجود | ليس حقلًا |
| الاقتباس (نص عادي) | **`pullQuote: {ar,en}`** | **ناقص** | |
| نص الكلمة | `messageBody` | **يتغير نوعه** | من `{ar:string,en:string}` إلى `{ar: TipTapDoc, en: TipTapDoc}` |
| الخاتمة: الاسم | `signatoryName` | موجود | |
| الخاتمة: المنصب | `signatoryTitle` | موجود | |
| الخاتمة: التاريخ | `publications.publishedAt` | موجود (مشتق) | القرار ٣. يحتاج أن يعيده المسار العام مع اللقطة |
| القيم: عنوان القسم | **`valuesTitle: {ar,en}`** | **ناقص** | |
| القيم: العناصر مرتبة | **`values: IconKeyedContentBlock[]`** | **ناقص** | `{title, description, iconKey (enum), displayOrder}`، بلا حقل لون. يحل محل `goals` |
| القيم: مفتاح الأيقونة | `values[].iconKey` ∈ `VALUE_ICON_KEYS` | **ناقص** | enum لا نص حر (القرار ٤، س١٤) |
| SEO: عنوان، ووصف، وصورة مشاركة | **`seo: PageSeo`** | **ناقص** | يعيد استخدام `PageSeoSchema` من `pages.schema.ts` (نفس الـ class، لا نوع جديد). الاحتياطي: `heroTitle`، ثم `pullQuote`، ثم `featuredImageId` (ADR-0044)، ثم `siteSettings.defaultSeo` |
| (هيكلي) الولاية | `federationAppointmentId` | موجود | مفتاح الأرشيف. لا عنصر عرض الآن |
| (هيكلي) حالة النشر | `publicationState` | موجود | لوحة الحالة في الداش بورد |
| — | `goals: ContentBlock[]` | **يُحذف** | حقل بلا عنصر. يُستبدل بـ `values` (س١) |

### قبل التخزين: هل القيم موجودة في نموذج آخر؟

- **نعم، يوجد مالك محتمل.** `visionMissionPage.coreValues: IconedContentBlock[]` (`{title, description, iconKey, displayOrder}`) هو نموذج "قيم الاتحاد"، و`iconKey` فيه نص حر.
- **لكن** `presidentMessagePage.goals` موجود في نموذج FigJam نفسه، أي أن مصمم النموذج توقّع قائمة خاصة بالكلمة.
- **القرار في س١.** توصيتي أن تكون قائمة الكلمة نفسها، والسبب سلامة الأرشيف: كلمة 2022 المؤرشفة يجب أن تعرض توجهات ولايتها، لا قيم اليوم.
- **إن كانت القائمة هي قيم الاتحاد الرسمية حرفيًا:** تُقرأ من `visionMission`، ولا تُخزَّن هنا.

### سنوات الولاية (القرار ٥)

نعم، الـ schema يحويها:
- `federationAppointmentId` → `federationAppointments.termStart` و`termEnd` (قيمة `termEnd` هي `null` ما دامت الولاية قائمة).
- `electionCycleId` → `electionCycles.startDate` و`endDate` و`cycleName` (مثل "الدورة 2024-2028").
- لا حاجة لحقل جديد للأرشيف.

### اللقطة العامة وما يتسرّب

- **ما تستبعده اللقطة:** `RevisionsService.snapshotOf` يستبعد `__v`، و`createdBy`، و`updatedBy`، و`archivedAt`، و`archivedBy`، و`publicationState`، و`revisionId`.
- **ما يبقى:** كل الحقول أعلاه، ومعها `_id`، و`federationAppointmentId`، و`createdAt`، و`updatedAt`.
- **لا حقل داخلي حساس اليوم.**
- **المقترح:** المسار العام يعيد **DTO علنيًا بقائمة سماح صريحة** (`PresidentMessagePublicDto`)، لا `snapshotData` كما هو. هذا نفس نمط `FederationPersonnelPublicResponseDto`، ويمنع تسريب أي حقل داخلي يُضاف لاحقًا.

### تحديد "الكلمة الحالية" (س١٥)

- **المسار:** `GET /president-message-page/current/public`.
- **القاعدة:** الكلمة ذات الـ publication `Live` المرتبطة بتعيين `President` حالته `Active`. إن تعددت، الأحدث `publishedAt`.
- **الاحتياطي:** إن لم يوجد تعيين نشط، الأحدث `publishedAt` بين كل الكلمات الـ Live.
- **سبب رفض "الأحدث نشرًا" وحده:** إعادة نشر كلمة قديمة لتصحيح خطأ إملائي كانت ستجعلها "الحالية".

### أثر التعديل المقترح

| الأثر | التفصيل |
|---|---|
| migration | `api/src/bootstrap/migrate-president-message-v2.ts` بوضع dry-run: يحوّل أي `messageBody` نصي إلى doc فقرات (بالفصل على السطر الفارغ)، ويرفض بتقرير أي سجل فيه `goals` غير فارغة (لا يمكن استنتاج الأيقونة). محليًا: المجموعة غير مزروعة، فالمتوقع no-op. Atlas: لم يُفحص (لا رابط على هذا الجهاز)، ويُضاف بند لـ `deployment-checklist.md` |
| الـ seed | fixtures جديدة في `api/seed/dev/`: `federationPersonnel` (الرئيس)، و`federationAppointments` (President)، و`presidentMessagePage`، و`workflowPolicies` (س٣)، و`workflowDefinitions`/`workflowSteps` إن كان هناك workflow، وأصول media placeholder. وتحديث `DEV_FIXTURE_SETS` في `seed-dev.ts` بترتيب المراجع أولًا |
| الـ DTOs | `CreatePresidentMessagePageDto` (تعديل)، و`UpdatePresidentMessagePageDto` (جديد، partial)، و`PresidentMessagePublicDto`، و`PublishingActionDto { expectedUpdatedAt }`، و`EditorialStateDto` |
| openapi | إعادة توليد `api/openapi.json`. الـ hook يفرضها |
| التوثيق | `docs/product/07-Mongoose-Schema-Specification.md` (قسم presidentMessagePage)، وملاحظة FigJam back-sync (`goals` → `values`)، وADR-0069 (الجزء الثاني، ب٧) |

## أ٢. الموافقات والنشر المباشر

### ربط الـ policies (F10/F11، ويغلق OUT-07 لهذا النوع)

`WorkflowPoliciesService.resolve(entityType, operation)` جديد، يعيد:

```ts
type PublishingRoute =
  | { mode: 'workflow'; definitionId: Types.ObjectId }
  | { mode: 'direct'; definitionId: Types.ObjectId | null } // حامل Publish ينشر مباشرة، والباقي يُرسل عبر definition إن وُجدت
  | { mode: 'blocked'; reason: 'noPolicy' | 'definitionInvalid' };
```

- **`operation`:** `Add` إن لم يُنشر السجل من قبل (لا صف `publications` له)، وإلا `Edit`.
- **تحقق F11 عند إنشاء policy أو تعديلها:**
  - الـ definition موجودة، ونشطة، ولنفس `entityType`.
  - `workflowRequired ⇒ workflowDefinitionId`.
- **الفهرس (H4):** يُستبدل الفهرس غير الفريد `{entityType:1, operation:1}` بفهرس **فريد جزئي** بشرط `{archivedAt: null}`. خطوات التنفيذ:
  1. `check-policy-duplicates.ts` يطبع المكررات من الملحق ب في مراجعة الـ workflow، ويرفض المتابعة إن وُجدت.
  2. حذف الفهرس القديم `entityType_1_operation_1` صراحةً، لأن Mongoose لا يحذف فهرسًا غير معلَن، والمفتاح نفسه قد يتعارض.
  3. بناء الفهرس الجديد.
  4. تحويل `E11000` إلى `409`.
  5. محليًا 0 policy اليوم. أما Atlas فيحتاج فحصًا أولًا، ويُضاف بند لـ `deployment-checklist.md`.
- **غياب policy للنوع: fail-closed (س٤).**
  - حفظ المسودة مسموح. النشر والإرسال مرفوضان بـ `409 publishingPolicyMissing` ورسالة واضحة للمسؤول.
  - **السبب:** النشر فعل خارجي. الافتراض "مباشر" يسمح بتجاوز موافقات لم يقررها أحد. والافتراض "موافقات" بلا definition يمنع أيضًا، لكن برسالة مضلِّلة.

### منطق من يرى ماذا (القرار ٧)

| الـ policy | حامل `presidentMessagePage:Publish` | محرر بلا Publish |
|---|---|---|
| `workflowRequired: true` | "إرسال للمراجعة" فقط (لا تجاوز) | "إرسال للمراجعة" |
| `workflowRequired: false` + definition | "نشر" (مباشر) | "إرسال للمراجعة" |
| `workflowRequired: false` بلا definition | "نشر" (مباشر) | ممنوع: "حفظ المسودة" فقط، مع سبب ظاهر |
| لا policy | ممنوع | ممنوع |

### المسارات (entity-specific، لأن `permission-catalogue.spec` يشتق الكتالوج من `@RequirePermission`)

| المسار | الصلاحية | جديد؟ | العقد |
|---|---|---|---|
| `PATCH /president-message-page/:id` | `presidentMessagePage:Update` (جديد) | جديد | partial update. الـ allowlist على `messageBody`. آلية 2 من `content-authorization-architecture-approval.md` §2.2: أثناء `InProgress` لا يعدّل إلا معيَّنو الخطوة الحالية، وإلا `409 underReview` |
| `POST /president-message-page/:id/publish` | `presidentMessagePage:Publish` (جديد) | جديد | body `{expectedUpdatedAt}`. يرد `201 {publicationId, revisionId, versionNumber, publishedAt, publishedBy:{id,name}}`. أخطاؤه: `403`، و`409 workflowRequired`، و`409 publishingPolicyMissing`، و`409 activeWorkflowExists`، و`409 staleRecord`، و`409 pendingContent` |
| `POST /president-message-page/:id/submit` | `presidentMessagePage:Update` | جديد | الخادم يختار الـ definition من الـ policy (D-01 (أ)). ينشئ revision ثم instance. يرد `201 {instanceId, revisionId}` |
| `POST /president-message-page/:id/resubmit` | `presidentMessagePage:Update` | جديد | revision جديدة ثم `WorkflowInstancesService.resubmit` كما هو |
| `POST /president-message-page/:id/restore` | `presidentMessagePage:Update` | جديد | body `{revisionId}`. يكتب محتوى اللقطة في المسودة، **ولا ينشر**. يسجّل في التدقيق |
| `GET /president-message-page/:id/editorial-state` | `presidentMessagePage:Read` | جديد | انظر أدناه |
| `GET /president-message-page/:id/revisions` و`/revisions/:revisionId` | `presidentMessagePage:Read` | جديد | للمقارنة |
| `GET /president-message-page/current/public` | `@Public()` | جديد | `PresidentMessagePublicDto & {publishedAt}` |
| `POST /workflow-instances/:id/(approve\|reject\|return\|cancel)` | كما هي | موجود | بلا تغيير. السبب إلزامي في الرفض والإرجاع |
| `POST /workflow-instances/:id/delegate` | — | موجود | **مخفي من الواجهة** |
| `PUT /workflow-policies/:entityType/:operation` | `workflowPolicies:Update` (جديد) | جديد | upsert مع تحقق F11. للواجهة الصغرى (س١٧) |

### مسار النشر المباشر (`workflowRequired = false`)

`PublishingService.publishDirect` يمر بالخطوات التالية بالترتيب:
1. التحقق من الـ policy.
2. التأكد من غياب instance نشطة.
3. مقارنة `expectedUpdatedAt`.
4. حارس الـ placeholder (س١٦).
5. `RevisionsService.create` (لقطة يبنيها السيرفر).
6. `PublicationsService.publish({workflowInstanceId: null})`، الذي يعيد الـ Live السابقة إلى `Archived`.
7. تحديث `publicationState = 'Live'` على السجل.
8. كتابة `auditLogs` بصيغة `StatusChange {publicationState: prev → 'Live', mode: 'direct'}`، مع الفاعل والوقت والـ IP والـ user agent.

### مسار الموافقات (`workflowRequired = true`)

- submit / approve / reject / return / resubmit كما هي في `WorkflowInstancesService`.
- الجديد فقط نقطة الدخول: الخادم يختار الـ definition. ويُفحص `presidentMessagePage:Update` على الإرسال، وهذا يغلق OUT-04 لهذا المسار.
- `POST /workflow-instances` العام يبقى كما هو للأنواع الأخرى حتى F10 (نوفمبر).

### `GET /:id/editorial-state` (نموذج عرض واحد، والسيرفر هو من يحسب الإجراءات)

```ts
interface EditorialStateDto {
  record: PresidentMessageAdminDto;            // المسودة + updatedAt + publicationState
  publication: { status: 'Live'|'Unpublished'|'Archived'; publishedAt: string; publishedBy: UserRef; revisionId: string; versionNumber: number } | null;
  policy: { operation: 'Add'|'Edit'; mode: 'workflow'|'direct'|'blocked'; blockedReason?: 'noPolicy'|'definitionInvalid';
            definition?: { id: string; name: LocalizedText; steps: Array<{ id: string; sequenceOrder: number; stepType: 'Sequential'|'Parallel'; requiredApprovals: number; assignees: UserRef[] }> } };
  instance: { id: string; status: 'InProgress'|'Approved'|'Rejected'|'Returned'; currentStepId: string|null; approvalsInCurrentCycle: Array<{ stepId: string; approverIds: string[] }> } | null;
  timeline: Array<{ at: string; actor: UserRef; action: 'Submitted'|'Approved'|'Rejected'|'Returned'|'Resubmitted'|'Cancelled'|'PublishedDirect'|'Restored'; reason?: string; stepId?: string }>;
  revisions: Array<{ id: string; versionNumber: number; createdAt: string; createdBy: UserRef; isLive: boolean }>;
  actions: Record<'save'|'publish'|'submit'|'approve'|'reject'|'return'|'resubmit'|'cancel'|'restore'|'configurePolicy', boolean>;
}
type UserRef = { id: string; name: LocalizedText }; // الاسم فقط، بلا بريد
```

- **مصدر الـ timeline:** `workflowActionHistory` لأفعال الـ workflow، و`auditLogs` للنشر المباشر والاسترجاع. لا تكرار: أفعال الـ workflow تكتب في الاثنين، فتُؤخذ من الأول فقط.
- **عدّ الموافقات:** "1 من 2" يأتي من `approvalsInCurrentCycle`، بنفس حدّ الدورة الذي أصلحه F3/H1.

### واجهة الـ policies في الداش بورد

- **غير موجودة.** مسارات الداش بورد: الرئيسية، والصفحات، والأدوار، والمستخدمون، وشاشات الدخول.
- لا شاشة للـ definitions ولا للخطوات ولا للـ policies. الـ API فيه POST/GET فقط، بلا تحديث.
- **أصغر واجهة مقترحة (س١٧، لا تُبنى بلا موافقة):**
  - قسم "إعداد النشر" داخل لوحة الحالة في صفحة الكلمة، لحامل `workflowPolicies:Update` فقط.
  - فيه مفتاح "يتطلب موافقات"، وقائمة اختيار definition من الـ definitions النشطة لهذا النوع.
  - يطبَّق على Add وEdit معًا.
- **إنشاء definition وخطواتها ومعتمديها يبقى seed أو API** (س٣ تحدد المعتمدين).

## أ٣. صفحة الإدارة في الداش بورد

**المسار:** `/[locale]/president-message`، ببند تنقل يظهر لحامل `presidentMessagePage:Read`. يحرّر "الكلمة الحالية". قائمة الكلمات والأرشيف مؤجلة (القرار ٥).

```
┌──────────────────────────────── ≥1280px ─────────────────────────────────────┐
│ كلمة الرئيس                        [حفظ المسودة]  ● تغييرات غير محفوظة        │
├──────────────── التحرير (بترتيب الصفحة) ───────────┬── لوحة الحالة (sticky) ──┤
│ ▸ ١ الـ Hero                                        │ الحالة: [منشور]           │
│   صورة الخلفية [اختيار]   صورة الرئيس [اختيار]      │ آخر نشر: ١٢/٩ — فلان     │
│   (alt يُقرأ من الأصل: ع/En)                         │ ─────────────────────────│
│   العنوان  [ع][En]   المنصب في الـ hero [ع][En]      │ النشر يمر بموافقات:       │
│   الاسم (يظهر في الـ hero والخاتمة) [ع][En]         │ "مراجعة كلمة الرئيس"      │
│ ▸ ٢ الاقتباس        [ع textarea] [En textarea] ٠/٢٤٠│ ١ متسلسل · ١ من ١ ✓ فلان │
│ ▸ ٣ نص الكلمة                                        │ ٢ متوازٍ · ٠ من ٢ ← الآن │
│   ┌─ العربي (rtl) ─────────┐ ┌─ English (ltr) ─────┐ │    فلان، فلان            │
│   │ B  🔗 H2 H3 • 1. ❝ ― ↶↷│ │ B I 🔗 H2 H3 • 1. ❝ ―│ │ [اعتماد] [رفض…] [إرجاع…]│
│   │ …                      │ │ …                   │ │ ─────────────────────────│
│   └────────────────────────┘ └─────────────────────┘ │ السجل                    │
│   ⚠ ٥ فقرات عربية مقابل ٤ إنجليزية                  │ • أُرسل — فلان — ١١/٩    │
│   ⓘ حُذف من النص الملصوق: ألوان وخطوط (١٢)، مائل (٣)│ • اعتُمد — فلان — ١١/٩   │
│ ▸ ٤ الخاتمة  المنصب [ع][En]   التاريخ: يُشتق عند النشر│ ─────────────────────────│
│ ▸ ٥ القيم    العنوان [ع][En]                          │ الإصدارات                │
│   [◇ eye ▾] العنوان [ع][En] الوصف [ع][En]  [↑][↓][×] │ ☐ v3 منشور ١١/٩ فلان     │
│   … [+ قيمة]                                          │ ☐ v2 ١٠/٩ فلان           │
│ ▸ ٦ SEO  العنوان [ع][En] ٠/٦٠  الوصف [ع][En] ٠/١٦٠   │ [قارن المحدَّدين] [استرجاع]│
│         صورة المشاركة [اختيار]   معاينة نتيجة البحث  │ ▸ إعداد النشر (للمسؤول)  │
└────────────────────────────────────────────────────┴──────────────────────────┘
أقل من 1024px: اللوحة تصبح شريطًا علويًا قابلًا للطي (الحالة + الإجراء الرئيسي)، والمحرران فوق بعض (العربي أولًا).
```

- **الحقول ثنائية اللغة:** من `admin/bilingual-field.tsx`. الصور من `admin/pages/media-picker.tsx`. الأزرار من ثوابت `interactive.ts` (44px)، ومعها غلاف `Button` بحالة loading (عرض ثابت، و`aria-busy`، وspinner).
- **محرر TipTap:**
  - محرران جنبًا إلى جنب، `dir` ثابت لكل منهما، وشريط أدوات لكل لغة من الـ allowlist.
  - شريط العربي بلا italic.
  - لا أدوات محاذاة في اللغتين: المحاذاة تتبع `dir` (§4.6 يقول "Always left-aligned" للإنجليزي أيضًا).
- **تحذير عدم التطابق:**
  - عدد الفقرات مختلف ← تحذير.
  - أو فقرة طولها بالأحرف أقل من 50% أو أكثر من 200% من مقابلتها ← تحذير.
  - الحدود قابلة للتعديل وموثقة في الكود. تحذير فقط، ولا يمنع الحفظ.
- **اللصق من Word:**
  - `transformPastedHTML` يزيل `mso-*` و`<o:p>` والـ styles والخطوط والألوان والجداول والصور.
  - يزيل أيضًا الـ italic والمحاذاة في العربي.
  - ثم يعرض بيانًا polite بما حُذف وعدده. والـ schema يرفض الباقي تلقائيًا.
- **لوحة الحالة:**
  - كلها من `editorial-state`.
  - السبب إلزامي في الرفض والإرجاع (dialog بحقل نص؛ الإرجاع يختار الخطوة الأقدم).
  - "النشر مباشر بدون موافقات" حين `mode=direct`. زر "نشر" بـ confirm dialog نصه: "سيظهر المحتوى للزوار فورًا".
- **الإصدارات:**
  - اختيار إصدارين ← مقارنة جنبًا إلى جنب لكل حقل. نص الكلمة يُقارن فقرة بفقرة، مع تظليل الكلمات (diff كلمات داخلي بلا مكتبة).
  - "استرجاع كمسودة" بـ confirm، ثم مسار النشر العادي.
- **الضغط المزدوج (تخفيف H2 في الواجهة):** كل زر إجراء يُعطَّل من لحظة الضغط حتى الرد، ويعرض loading.
- **الخروج بتغييرات غير محفوظة:** تحذير عبر `beforeunload` وعند التنقل داخل التطبيق.

## أ٤. نظام الـ toasts في `apps/dashboard`

**الموجود:** لا مكتبة toasts (`dependencies`: design-tokens، وnext، وnext-intl، وreact، وreact-dom)، ولا مكوّن. الموجود `aria-live` محلي في 7 مواضع.

**القرار:** مكوّن داخلي بلا مكتبة. ADR-0065 D6 لا يبرر dependency إلا لنمط WAI-ARIA فيه إدارة focus، والـ toast منطقة live لا تأخذ focus (Ch.8 L4 FB.20).

| الجانب | التصميم | المصدر |
|---|---|---|
| الملفات | `components/ui/toast/{toast-provider.tsx, toast-regions.tsx, use-toast.ts, toast-queue.ts}` في الـ shell `(app)/layout.tsx` | الطلب |
| الـ API | `toast.success(key, values?)`، و`.info`، و`.warning`، و`.error`، و`.promise(p, {loading, success, error})`، مع `dedupeKey` | الطلب |
| النصوص | next-intl فقط، namespace `Toasts`. رموز الأخطاء عبر `WRITE_ERROR_CODES` مع رموز النشر الجديدة، ورسالة عامة لغير المعروف | `admin-write.ts` |
| المناطق | منطقتان في الـ DOM من أول render: `role="status" aria-live="polite"` للنجاح والمعلومة والتحذير والتحميل، و`role="alert" aria-live="assertive"` للخطأ | L4 FB.7 |
| الموضع | أسفل جهة نهاية السطر (`inset-inline-end`)، أي أسفل اليسار في RTL وأسفل اليمين في LTR. الأيقونات لا تنعكس (غير اتجاهية) | protocol §8 |
| العدد | 3 ظاهرة كحد أقصى، والباقي في طابور. الحدث المكرر بنفس `dedupeKey` يُدمج مع عدّاد "(×n)" | L4 FB.6 وFB.16 |
| promise | loading ثم نجاح في **نفس المكان** | L4 FB.17 |
| المدد | النجاح والمعلومة 5 ث (نطاق L4 4–6 ث)، والتحذير 6 ث، والخطأ **لا يختفي تلقائيًا**، والتحميل حتى الحسم. المؤقت يتوقف مع hover أو focus-within، ويتوقف أثناء فتح dialog | L4 FB.11 وFB.21 |
| الحركة | دخول `--motion-transition-enter` (220ms، decelerate) من جهة نهاية السطر، وخروج `--motion-transition-exit` (150ms). مع تقليل الحركة: ظهور فوري | L4 FB.8 |
| الشكل | `surface.raised`، و`border.default`، و`elevation.dropdown`، و`radius.md`. شريط جانبي 4px بلون الحالة، وهو زخرفي لأن الأيقونة والنص يحملان المعنى. أيقونة Lucide مختلفة لكل نوع، والنص `text.primary`. فاتح وغامق من الـ tokens | WCAG 1.4.1 |
| الكيبورد | زر إغلاق 44×44 (`aria-label` مترجم) يُبلغ بـ Tab. Esc يغلق الأحدث إن كان الـ focus داخل المنطقة. **لا autofocus أبدًا** | L4 FB.20 |
| الخط | يرث Alexandria/IBM Plex من `lang` | §4.3 |

**الاستخدام:**
- الـ toast لنتيجة إجراء: حُفظ، أُرسل، اعتُمد، رُفض، أُرجع، نُشر، استُرجع.
- أخطاء الحقول تبقى inline بجوار الحقل.
- **"فشل":** انظر س٧. ADR-0016 يقول "MUST NOT use Toast for an error that prevents task completion". توصيتي أن يظهر فشل الإجراء كتنبيه inline في لوحة الإجراءات، وأن يبقى نوع `error` في الـ toasts للأخطاء غير المانعة.

## أ٥. الصفحة العامة

**البنية:** الهيدر الحالي ← `PortraitHero` ← قسم الكلمة (سجل neutral) ← نطاق القيم (سجل حسب س٨) ← الفوتر الحالي.

### أ٥.١ جدول الاختلاف عن Figma

| العنصر | Figma | المقترح | السبب |
|---|---|---|---|
| تركيب الـ hero | في العربي الصورة على جهة القراءة والنص في الجهة الأخرى. الصورة تنزف 140px فوق الـ hero. نص فوق الصورة بلا scrim | كتلة العنوان على جهة القراءة، والصورة في العمود البعيد، بلا تداخل ولا نزيف، مع `HERO_SCRIM` | PM-D07، وD19، وD25، وADR-0066 D5، وADR-0067 D2 |
| المنصب على الموبايل العربي | `rgba(255,255,255,.75)` على خلفية بيضاء، فهو غير مرئي | ضمن الـ hero فوق الـ scrim، والنص أبيض | PM-D20 |
| الموبايل الإنجليزي | الصورة تغطي الـ breadcrumb والعنوان | تكديس: العنوان أولًا ثم الصورة، بلا تداخل | PM-D21، وCh.5 §5.10 |
| نص العنوان | "رئيس الاتحاد" / "Chairman's Message" | "كلمة الرئيس" / "President's Message" | IA §8.1 (§7.4) |
| أحجام الـ hero | 40 Bold / 32 Black / 24، ونفسها على الموبايل | `h1`، و`h2` للاسم، و`body-lg` للمنصب، و`caption` للـ breadcrumb | §4.4 و§4.7 (§7.4) |
| الـ swooshes | فوق الاقتباس، والفقرة الأخيرة، وبطاقة الابتكار | الـ motif في العمود البعيد للـ hero فقط، ولا شيء في المحتوى | PM-D18، وADR-0066 D5، وprotocol §18 |
| عرض سطر القراءة | 1344px، أي نحو 150–170 حرفًا | عمود `max-w` بين 65 و75 حرفًا للعربي، و75 إلى 85 للإنجليزي | PM-D26، و§4.6 |
| نص الكلمة | `#374151`، وارتفاع السطر 1.9، وفاصل 20px. في الإنجليزي (تابلت وموبايل) كله Bold | `text-body` (16/15، 1.6)، و`text-secondary`، والفاصل `space-4` | §4.6، وADR-0059، وPM-D13/D24/D28 |
| الكلمات الافتتاحية bold (العربي) | موجودة | mark `bold` في TipTap، بلون `text-primary` | أمانة المحتوى (§7.4) |
| حجم الاقتباس | 22px Bold | `text-h3` (24/20 Bold) على `<blockquote>`، بلا دلالة عنوان | س٩ (PB-GAP §7.5-1) |
| الاقتباس في التابلت الإنجليزي | غائب | يظهر في كل الـ breakpoints | PM-D03 |
| الفاصل بين الاقتباس والنص | 32 / 0 / 0 | 32 / 24 / 16 | PM-D22 |
| ترجمتا الاقتباس الإنجليزي | نصان مختلفان | حقل واحد، وplaceholder حتى تصل الترجمة المعتمدة | PM-D04، والقرار ٦ |
| الجملة الناقصة في الفقرة ٥ (EN) | محذوفة | placeholder ظاهر مكانها | PM-D10، والقرار ٦ |
| نطاق القيم | `#0d1f12` | سجل `green` (س٨)، وبطاقات `Card register` | §7.5-2، وADR-0059 |
| ألوان الأيقونات | خمس درجات (Tailwind) | معالجة خضراء واحدة، وLucide من enum | PM-D23، وADR-0068 D6، والقرار ٤ |
| محاذاة البطاقة | مركزية في العربي، ومختلطة في الإنجليزي | كلها على جهة القراءة | §4.6، وADR-0066 D5، وPM-D27 |
| ارتفاع البطاقات | غير متساوٍ في الإنجليزي | ارتفاع واحد في الصف | ADR-0066 D4، وPM-D12 |
| خط البطاقة | 17 Bold / 13 | `h4` / `body-sm` | سابقة board-members |
| الخاتمة والتاريخ | غير موجودة في أي frame | كتلة توقيع على جهة القراءة: الاسم `h4`، والمنصب `body`، والتاريخ `caption` في `<time>` | القراران ٣ و٤ من §7.5 |
| الهيدر والفوتر | frames الصفحة | المكونات الحالية بلا تعديل | خارج النطاق |

### أ٥.٢ تحسينات (impeccable critique + ui-ux-pro-max)، داخل الـ tokens والـ ADRs

| # | التحسين | السبب |
|---|---|---|
| I1 | الاقتباس `<figure><blockquote><p>`، والنص `<article>`، والتوقيع `<footer>` داخل الـ article، والتاريخ `<time dateTime>` | دلالات يقرؤها القارئ الشاشي والمحركات. Ch.6 §6.4 |
| I2 | JSON-LD بصيغة `AboutPage`، مع `author` (Person: الاسم والمنصب) و`datePublished`، وBreadcrumbList. كلها ظاهرة في الصفحة | Ch.14 §4: لا وصف لما لا يظهر |
| I3 | صورة مشاركة فعلية. `buildMetadata` اليوم لا يُخرج `og:image` لأي صفحة | Ch.14 §3 يفرضها |
| I4 | `text-wrap: pretty` على الفقرات لتجنب الكلمة اليتيمة | مقروئية بلا token جديد |
| I5 | بطاقات القيم غير تفاعلية (لا lift)، لأنها ليست روابط | Ch.11، affordance كاذبة |
| I6 | صورة الخلفية `fetchPriority="high"` مع srcset من Cloudinary (موجود في `PageHero`) | LCP |
| I7 | لا drop cap للفقرة الأولى في العربي | الحروف المتصلة، §4.6 |

### أ٥.٣ خطة الموشن

**الـ tokens الموجودة:**

| النوع | القيم |
|---|---|
| المدد | instant 100، وfast 150، وbase 220، وslow 320، وslower 480 |
| الـ easing | standard، وdecelerate، وaccelerate، وspring (spring للاحتفالي فقط) |
| ascent | offset 16px، وstagger 60ms، وsteps 10، وزاوية 45° لا تنعكس (ADR-0059 §D7.1) |
| lift | scale 1.01 |

**الأدوات الموجودة:**
- `.rise-in`: دخول عند التحميل.
- `.rise-scroll`: CSS scroll-driven بلا opacity، ونطاقه `entry 0 → space-32`.
- `.rise-ground`، و`.hero-parallax`، و`HERO_STAGE`.

**لا مكتبة:** لا framer-motion ولا GSAP. كل الحركة CSS، ولا JavaScript. التحسين التدريجي مضمون: المحتوى في HTML السيرفر، وكل حركة داخل `prefers-reduced-motion: no-preference` و`@supports`.

**token جديد (س١١):** `motion.duration.ambient = 1200ms`، لحركة ground-plane تحدث مرة واحدة فقط، ولا ينتظرها أي نص. إن رُفض، يُستخدم `slower` (480ms).

| العنصر | المُحفِّز | الحركة | المدة | التأخير | الـ easing | مع تقليل الحركة | RTL |
|---|---|---|---|---|---|---|---|
| خلفية الـ hero (LCP) | تحميل | `scale(1.04)` → `1`، و`translateY(16px)` → `0`، **ويبدأ مرئيًا (opacity 1)** | ambient 1200 | 0 | decelerate | ثابتة | لا اتجاه |
| parallax الخلفية (موجود) | scroll | `translateY` حتى 48px | خطي | — | — | لا شيء | لا اتجاه |
| الـ scrim | — | ثابت منذ أول frame، فالنص مقروء فورًا | — | — | — | — | — |
| الـ breadcrumb | تحميل | `rise-in` (ascent 45° + opacity) | base 220 | 60 | decelerate | ظاهر فورًا | الـ ascent لا ينعكس (§D7.1)، والترتيب بترتيب القراءة |
| H1 (مرشح LCP إن غابت الصورة) | تحميل | **`rise-settle`: ascent بـ transform فقط، بلا opacity** | base 220 | 120 | decelerate | ظاهر | كما سبق |
| الاسم | تحميل | `rise-in` | base 220 | 180 | decelerate | ظاهر | كما سبق |
| المنصب | تحميل | `rise-in` | base 220 | 240 | decelerate | ظاهر | كما سبق |
| صورة الرئيس | تحميل | clip `inset(0 0 14% 0)` → `inset(0)` + `translateY(16px)` → `0`. **تبدأ 86% مرئية** | slower 480 | 120 | decelerate | كاملة | لا اتجاه |
| الـ motif (4 خطوط) | تحميل | "رسم" بالنمو على محور كل خط من ذيله: `scaleX(0.2)` → `1` مع opacity، والـ transform-origin عند الذيل. `stroke-dashoffset` ليس transform | slow 320 | 300 + 60 لكل خط | decelerate | مرسوم | الهندسة لا تنعكس، وموضعه في العمود البعيد يتبع `dir` |
| الاقتباس | scroll (entry) | `rise-scroll` (بلا opacity) | 128px scroll | — | — | ثابت | — |
| خط الاقتباس الرفيع (2px، جهة البداية) | scroll (entry) | `scaleY(0)` → `1` من الأعلى | 128px scroll | — | — | ظاهر كاملًا | الموضع `inset-inline-start`، فينعكس |
| الفقرات (كل كتلة، لا كل سطر) | scroll (entry) | `rise-scroll` | 128px scroll | — | — | ثابتة | — |
| التوقيع | scroll (entry) | `rise-scroll` (ظهور خفيف) | 128px scroll | — | — | ثابت | — |
| عنوان القيم وبطاقاتها | scroll (entry) | `rise-scroll` مع stagger مربوط بالتمرير: `animation-range-start` = `entry calc(var(--rise-index) * var(--space-3))` | — | 12px scroll لكل بطاقة | — | ثابتة | ترتيب البطاقات يتبع DOM |

**قيود الشكل:**
- **الإنجاز:** الـ hero يكتمل خلال 1200ms. آخر نص (المنصب) مقروء عند 460ms (240 + 220)، أي أقل من 600ms.
- **الموبايل (أقل من `md`):** مسافة الـ ascent `calc(var(--motion-ascent-offset) / 2)`، أي 8px (نفس منطق `/4` في `.lift`، ADR-0067). والتكبير `1.02` بدل `1.04`.
- **LCP:** الخلفية تتحرك بـ transform فقط، والـ H1 بـ transform فقط، والصورة بـ clip يبدأ مرئيًا.
- **CLS:** transform وclip لا يغيّران الـ layout. الصور بأبعاد ثابتة.
- **ما لا يوجد:** loop، وscroll-jacking، وparallax على نص القراءة (الـ parallax على الخلفية وحدها، وهي موجودة منذ ADR-0067)، وشريط تقدم.

**تعارضات مرفوعة:** س١١ (المستوى "سينمائي" لصفحة Institutional)، وس١٢ (الدخول من جانب القراءة مقابل الـ ascent الثابت)، وس١٣ (الظهور "مرة واحدة" مقابل scroll-driven).

---

# الجزء الثاني — المراحل

كل مرحلة تنتهي بتقرير قصير، ثم يعمل المالك commit قبل التالية. عند بدء أي مرحلة: أعد تطبيق superpowers:writing-plans على مهامها لتفصيل خطوات TDD بالكود، بعد أن تكون الأسئلة المؤثرة فيها قد أُجيبت.

## المرحلة ب — الـ backend (السيرفر: api فقط عند الحاجة، والاختبارات unit + e2e في الذاكرة)

### ب١: الـ allowlist والتحقق من TipTap JSON

**Files:**
- Create: `api/src/common/rich-text/rich-text-allowlist.ts`، و`validate-rich-text.ts`، و`rich-text-plain-text.ts`، و`is-rich-text-doc.decorator.ts`
- Create: `api/src/common/schemas/localized-rich-text.schema.ts`، و`api/src/common/dto/localized-rich-text.dto.ts`
- Test: `api/src/common/rich-text/validate-rich-text.spec.ts`، و`rich-text-plain-text.spec.ts`

**Interfaces:**
- Produces: `type RichTextLang = 'ar'|'en'`، و`validateRichText(doc: unknown, lang: RichTextLang): RichTextViolation[]` (`{path: string; rule: string}`)، و`richTextParagraphs(doc): string[]`، و`@IsRichTextDoc(lang)`، و`LocalizedRichTextSchema`.

**الـ allowlist المقترح (س٥):**
- **nodes:** `doc`، و`paragraph`، و`text`، و`heading{level∈[2,3]}`، و`bulletList`، و`orderedList{start:int≥1}`، و`listItem`، و`blockquote`، و`horizontalRule`، و`hardBreak`.
- **marks:** `bold`، و`link{href: ^https?:|^mailto: فقط، target: '_blank'|null}`، و`italic` **في en فقط**.
- **مرفوض:**
  - أي `textAlign`، أو `style`، أو `class`، أو `dir`.
  - `underline`، و`strike`، و`code`، و`codeBlock`، و`image`، و`table`.
  - أي node أو mark غير مذكور.
- **حدود:** عمق حتى 6، ونص حتى 20,000 حرف لكل لغة.

**Tests (تفشل أولًا):**

| الاختبار | ما يؤكده |
|---|---|
| `rejects italic in the Arabic body` | مسار الـ mark + القاعدة |
| `accepts italic in the English body` | |
| `rejects a textAlign attribute in either language` | يشمل justify |
| `rejects heading level 1` | |
| `rejects an unknown node` | |
| `rejects javascript: and data: link hrefs` | |
| `rejects a document deeper than 6` | |
| `rejects text over 20000 characters` | |
| `extracts paragraphs in order` | |

**Done:** الاختبارات خضراء، و`nest build` يخرج بـ 0.

### ب٢: الـ schema والـ DTOs (بعد موافقة الـ schema change)

**Files:**
- Modify: `president-message-page.schema.ts`: `messageBody` بنوع `LocalizedRichTextSchema`، و`+featuredImageId`، و`+pullQuote`، و`+valuesTitle`، و`+values`، و`+seo`، و`-goals`.
- Create: `api/src/common/constants/value-icon-keys.ts` (`VALUE_ICON_KEYS`، س١٤).
- Create: `IconKeyedContentBlock` في `common/schemas/content-block.schema.ts` (enum). `IconedContentBlock` لا يُمس.
- Modify: `create-president-message-page.dto.ts`.
- Create: `update-president-message-page.dto.ts`، و`president-message-public.dto.ts`، و`publishing-action.dto.ts`.
- Create: `api/src/bootstrap/migrate-president-message-v2.ts` (dry-run افتراضيًا) + spec.
- Test: `president-message-page.schema.spec.ts`، و`*.dto.spec.ts`.

**Tests:**
- `every schema declares timestamps` (قاعدة المشروع).
- `rejects an iconKey outside VALUE_ICON_KEYS`.
- `rejects an Arabic body with italic at the DTO layer`.
- `public DTO exposes only the allowlisted fields`.
- `migration converts a string body into paragraphs and refuses non-empty goals`.

**Done:** build 0، والاختبارات المتأثرة خضراء.

### ب٣: ربط الـ policies (F10/F11 لهذا النوع) + فهرس H4

**Files:**
- Modify: `workflow-policies.service.ts` (`resolve`، و`validateAgainstDefinition`، و`upsert`)، و`workflow-policies.controller.ts` (`PUT /:entityType/:operation`)، و`workflow-policy.schema.ts` (فهرس فريد جزئي).
- Create: `api/src/bootstrap/check-policy-duplicates.ts`.
- Modify: `permission-catalogue.ts`: إضافة `workflowPolicies:Update`.
- Tests: `workflow-policies.service.spec.ts`، والاختبار `[H4]` في `workflow-integrity.e2e-spec.ts` (يتحول من `it.failing` إلى `it`).

**Tests:**
- `resolves workflow when required with an active definition of the same type`.
- `resolves direct when not required`.
- `blocks when no policy exists`.
- `blocks when the definition is inactive or of another type`.
- `refuses workflowRequired without a definition`.
- `refuses a second active policy for the same type and operation with 409`.

**Done:** `[H4]` و`[H11(ب)]` صارا `it`. `deployment-checklist.md` فيه بند فحص المكررات على Atlas وحذف الفهرس القديم.

### ب٤: `PublishingService` + آلية 2 (canEdit) + رموز الأخطاء

**Files:**
- Create: `api/src/modules/workflow/publishing/{publishing.module.ts, publishing.service.ts, content-state-authorizer.ts, editorial-state.dto.ts}` + specs.
- Modify: `api/src/common/errors/api-error-code.ts`: `publishingPolicyMissing`، و`workflowRequired`، و`activeWorkflowExists`، و`staleRecord`، و`pendingContent`، و`underReview`، و`richTextNotAllowed`.

**Interfaces:**
- `publishDirect(entityType, entityId, actor, expectedUpdatedAt)`
- `submit(...)`
- `resubmit(...)`
- `restore(entityType, entityId, revisionId, actor)`
- `editorialState(entityType, entityId, actor)`
- `canEdit(entityType, entityId, actor)`

**Tests:**

| الاختبار | ما يؤكده |
|---|---|
| `direct publish creates a revision, a Live publication and an audit entry` | الثلاثة معًا |
| `direct publish is refused without the Publish permission` | |
| `direct publish is refused with 409 workflowRequired when the policy requires approvals` | |
| `submit uses the definition named by the policy, never one from the client` | |
| `an editor without Publish gets submit, not publish, in actions` | |
| `a non-assignee cannot edit while a review is in progress` | |
| `restore writes the snapshot into the draft and publishes nothing` | |
| `publish is refused while content carries the pending-content marker` | س١٦ |
| `a stale expectedUpdatedAt is refused with 409` | |

**Done:** e2e جديد `api/test/e2e/president-message-publishing.e2e-spec.ts` أخضر.

### ب٥: مسارات الكيان + الكتالوج + openapi

**Files:**
- Modify: `president-message-page.controller.ts` و`.service.ts` بالمسارات في أ٢.
- Modify: `permission-catalogue.ts`: `presidentMessagePage:Update` و`presidentMessagePage:Publish`.
- Regenerate: `api/openapi.json`.

**Tests:**
- `permission-catalogue.spec` يمر (يشتق من الـ decorators).
- `current public returns the Live message of the active President appointment with publishedAt`.
- `current public never returns federationAppointmentId or updatedAt`.

**Done:** `npm run generate:openapi` ثم `git diff --quiet -- api/openapi.json` يمر عند المالك في الـ hook.

### ب٦: استيراد المحتوى لأول سجل

**Files:**
- Create: `api/seed/dev/federationAppointments.json`، و`presidentMessagePage.json`، و`workflowPolicies.json` (وdefinitions وsteps إن لزم، س٣).
- Modify: `api/seed/dev/federationPersonnel.json` (الرئيس، بيانات عيّنة موسومة)، و`mediaAssets.json` (placeholders)، و`seed-dev.ts`.
- Test: `api/src/bootstrap/president-message-content.spec.ts`.

**Tests:**
- `the ten paragraphs match docs/design-specs/page-president-message.md §3 character for character`: 5 عربية و5 إنجليزية، والمقارنة بعد استخراج النص من TipTap.
- `the Arabic body keeps exactly five bold marks, each on the first word of its paragraph`: يتبنّى، ونسعى، ولطالما، وندرك، وفخورون.
- `the English body has no bold marks`.
- `the English pull-quote and the missing ¶5 clause are pending-content placeholders`.
- `hero, quote and five values carry the Figma copy`: الرؤية/Vision … الابتكار/Innovation، مع eye، وusers، وstar، وaward، وzap.

**Done:** `npm run seed:dev` على قاعدة محلية يُدرج السجلات، والاختبار أخضر.

### ب٧: التوثيق (نفس المرحلة، ليس لاحقًا)

- ADR-0069 "President's Message: rich text storage, publishing policy binding, direct publish". document-first بحسب ADR-0056، **ويُكتب قبل كود ب٢**.
- `docs/product/07-Mongoose-Schema-Specification.md`، ووثيقة عقد الـ API العامة، و`deployment-checklist.md`.

**Done المرحلة ب:**
- الـ suite الكاملة (api unit + e2e) والسيرفرات متوقفة.
- lint 0.
- build 0.
- تقرير قصير.

## المرحلة ج — الداش بورد (السيرفرات: api + dashboard)

> **نُقِّحت 2026-09-12 بقرارات المالك.** ما يلي يلغي الصياغة السابقة لهذه المرحلة.
> القرارات الحاكمة: (١) كل ما يتكرر في الصفحات الإحدى عشرة القادمة يُبنى **عامًّا**
> يأخذ `entityType` و`entityId` — الـ toasts، ولوحة الحالة، وقائمة الإصدارات
> والاسترجاع. (٢) المقارنة كلمة بكلمة **خارج النطاق** ولا بنية تحتية لها.
> (٣) الاسترجاع والإصدارات **داخل النطاق**. (٤) صفحة مستقلة `/president-message`
> برابط تنقّل بصلاحية. (٥) التحديث عند الإجراء + زر يدوي، ورسالة صريحة لـ
> `staleRecord`. (٦) حارس النشر يشمل غياب `featuredImageId`، ومؤشر جاهزية يعرض
> ما ينقص بدل رسالة خطأ عند الضغط.

### ج٠: الـ backend الذي تحتاجه المرحلة ج — **تم**
- `common/constants/entity-content.ts`: `PUBLISH_REQUIREMENTS` و`REVISION_READ_FIELDS` للأنواع الاثني عشر، و`projectRevisionContent`.
- `publishing/publish-blockers.ts`: `findPublishBlockers` و`describePublishBlockers`؛ رمز `missingRequiredField`.
- `editorialState.pendingContent` → `publishBlockers[{kind, field}]`.
- `GET /revisions?entityType=&entityId=` (جديد) و`GET /revisions/:id` (يعيد `content` مُسقَطًا لا `snapshotData` خامًا)، وكلاهما يتحقق من `<entityType>:Read` داخل الخدمة.
- `RevisionsController` انتقل إلى `PublishingModule` (الدورة: `PublicationsModule` يستورد `RevisionsModule`).
- **خلل أُصلح:** `PATCH` كان يمسح الصور لأن `key in dto` يصدق على كل حقل تحت `useDefineForClassFields`.

### ج١: الـ toasts العام — **تم**
- **Files:** `components/ui/toast/{toast-store.ts, toast-provider.tsx, toast-region.tsx, index.ts}`، و`(app)/layout.tsx`، و`messages/{ar,en}.json` (`Toasts`).
- ينفّذ FB.6 وFB.11 وFB.16 وFB.17 وFB.21 وFB.22 (`source` إلزامي) وFB.25 (`eventId`).
- **غير منفَّذ بقرار موثّق في رأس الملف:** FB.23 (لا تدفّق أحداث في الداش بورد؛ الطابور مقيَّد بدلًا منه) وFB.24 (أحداث الجلسة ليست من حمولة المنطقة).

### ج٢: `Button` بحالة loading + `ConfirmDialog` — **تم**
- **Files:** `components/ui/{button.tsx, confirm-dialog.tsx}`، و`BUTTON_ICON` جديد في `interactive.ts`.
- الاسم الميسّر يبقى أثناء التحميل (`opacity-0` لا `invisible`)، والعرض والارتفاع ثابتان.
- **jsdom 29 لا ينفّذ أيًّا من دوال `<dialog>`** — وسيط موثّق في `vitest.setup.ts`. الطبقة العليا وفخّ التركيز وتعطيل ما خلفها **غير مغطّاة باختبار**؛ تحقق يدوي.
- `ConfirmDialog` بلا مستدعٍ في هذه المرحلة بعد قرار الاسترجاع في ج٧ — قرار إبقائه أو حذفه معلّق على المالك.

### ج٣: الـ BFF العام
- **Files:** `app/api/admin/editorial/[entityType]/[id]/[action]/route.ts` مع سجلّ يربط `entityType` بمساره الأعلى — **السجلّ هو الحد الأمني**، بلا سجلّ يكون المتصل هو من يختار وجهة جسمه.
- الإجراءات قائمة مغلقة: `publish`، و`submit`، و`resubmit`، و`restore`، و`approve`، و`reject`، و`return`. **`delegate` غير موجود فيها فلا يمكن توجيهه.**
- **Files:** كذلك `lib/api/admin-write.ts` (الرموز الجديدة: `missingRequiredField`).
- **Tests:** `forwards each action and maps every new API code`؛ `an unregistered entityType is refused`؛ `delegate is not routable`.

### ج٤: محرر TipTap (الاعتماديات معتمَدة، س٦)
- **Files:** `components/admin/rich-text/{rich-text-editor.tsx, toolbar.tsx, paste-cleanup.ts, allowlist.ts, paragraph-mismatch.ts}`. تحميل كسول في مسار المحرر وحده.
- **Tests:** الشريط العربي بلا مائل ولا محاذاة (الامتداد **لا يُسجَّل** أصلًا، فلا اختصار لوحة مفاتيح يصل إليه)؛ تنظيف اللصق يبلّغ بالأعداد؛ تحذير عند اختلاف عدد الفقرات؛ **اختبار تطابق يقرأ ملف الـ API نفسه** (`api/src/common/rich-text/rich-text-allowlist.ts`).

### ج٥: أقسام التحرير الستة والصفحة والتنقل
- **Files:** `components/admin/president-message/{editor.tsx, hero-section.tsx, quote-section.tsx, body-section.tsx, closing-section.tsx, values-section.tsx, seo-section.tsx}`، و`lib/icons/value-icons.tsx` (SVG مضمَّن)، و`app/[locale]/(app)/president-message/page.tsx`، و`lib/navigation.ts`.
- الرابط يظهر فقط لمن يملك صلاحية التحرير أو المراجعة، **والسيرفر يرفض الوصول المباشر للمسار**.
- **Tests:** إعادة الترتيب بلوحة المفاتيح؛ قائمة الأيقونات = `VALUE_ICON_KEYS` بالضبط؛ التاريخ المشتق للقراءة فقط؛ عدّادات SEO؛ حارس المغادرة.

### ج٦: لوحة الحالة والموافقات العامة
- **Files:** `components/admin/editorial/{status-panel.tsx, timeline.tsx, readiness-list.tsx, policy-settings.tsx}` — تأخذ `{entityType, entityId, state, onAction}` ولا تعرف شيئًا عن صفحة الرئيس.
- **مؤشر الجاهزية** فوق أزرار النشر دائمًا يسرد `publishBlockers`؛ زر النشر معطَّل و`aria-describedby` يشير إلى القائمة.
- **`staleRecord`:** «عدّل شخص آخر هذا السجل بعد أن فتحتَه» مع زر إعادة تحميل — لا رمز خطأ خام.
- **Tests:** مجموعة الإجراءات لكل حالة policy × permission؛ الرفض والإرجاع يستلزمان سببًا؛ لا عنصر `delegate`؛ التقدّم «١ من ٢».

### ج٧: الإصدارات والاسترجاع العامان (بلا مقارنة كلمة بكلمة)
- **Files:** `components/admin/editorial/{revisions-panel.tsx, revision-reader.tsx}` — تأخذ `{entityType, entityId}` فقط.
- تعرض لكل نسخة: الرقم، والتاريخ، والفاعل، والحالة (منشورة / مؤرشفة / مسحوبة / مسودة)، مع فتحها للقراءة.
- **الاسترجاع (قرار المالك 2026-09-12):** الخطر في التعديلات غير المحفوظة لا في الاسترجاع نفسه، فيُزال الخطر بدل رفع التحذير:
  1. عند وجود تعديلات غير محفوظة **يُمنع الاسترجاع** وتظهر رسالة صريحة بخيارين: احفظ المسودة أولًا، أو تجاهل التعديلات.
  2. بعد أن تصبح الصفحة نظيفة، الاسترجاع يمر **بلوحة تأكيد داخل الصفحة** (سابقة أرشفة الدور، وADR-0016 «أدنى مستوى كافٍ») توضح: رقم النسخة وتاريخها، وأن المحتوى الحالي سيُستبدل، وأن المسترجع يعود كمسودة فيمر بالنشر العادي.
  3. بعد الاسترجاع، toast نجاح يذكر رقم النسخة.
- **Tests:** `restore is refused while there are unsaved changes`؛ لوحة التأكيد تذكر رقم النسخة وأن العودة كمسودة؛ toast النجاح يذكر الرقم.
- **خارج النطاق بقرار المالك:** المقارنة كلمة بكلمة — مسجَّلة في `docs/engineering/post-delivery-backlog.md` بسببها.

### ج٨: ترحيل الشاشات الثلاث إلى الـ toasts — **في نهاية المرحلة فقط**
- يشمل **رسائل نتيجة الإجراء فقط** (حُفظ، نُشر، فشل). أخطاء الحقول تبقى inline (س٧).
- لكل شاشة: شغّل اختباراتها **قبل** التعديل وبعده واذكر الأرقام. أي اختبار يتحقق من الرسالة داخل الصفحة **يُحدَّث لا يُحذف**.
- لو اتضح أن الترحيل أكبر مما يبدو: **توقف وأخبر المالك** قبل إكماله.

### ج٩: الوثيقتان
- `docs/engineering/post-delivery-backlog.md` — بند واحد فقط (المقارنة كلمة بكلمة) بسببه، وفي رأسه «وثيقة داخلية — لا تُسلَّم للعميل بصيغتها هذه». **لا يُضاف إليه بند آخر بلا قرار صريح.**
- `docs/DOCUMENTATION-INDEX.md` — تصنيف ثلاثي (تُسلَّم للعميل / داخلية / مؤقتة). **تصنيف فقط: لا حذف ولا نقل.**

**Done المرحلة ج:**
- suite الداش بورد كاملة مرة واحدة والسيرفرات متوقفة.
- lint 0، و`tsc` 0.
- تحقق يدوي بـ api + dashboard.
- تقرير.

## المرحلة د — الصفحة العامة (السيرفرات: api + web)

### د١: البيانات
- **Files:** `apps/web/src/lib/api/types.ts` (`PresidentMessagePublic`)، ومحمّل في `app/[locale]/about/president/page.tsx` يجلب `current/public` مع الـ media في طلب واحد.
- **Tests:** `renders nothing indexable when there is no Live message` (Ch.14 §11 noindex).

### د٢: معرض TipTap بلا مكتبة
- **Files:** `apps/web/src/components/rich-text/render-rich-text.tsx` + نسخة allowlist.
- **Tests:**
  - `renders each allowlisted node to its element`.
  - `drops unknown nodes and unsafe hrefs`.
  - `never uses dangerouslySetInnerHTML`: الـ guard موجود في `token-contract`، ويُمدَّد.
  - `body h2/h3 render as text-h3/text-h4`.
  - `Arabic italic never renders`.

### د٣: الصفحة
- **Files:** `components/pages/president/{portrait-hero.tsx, pull-quote.tsx, message-body.tsx, closing.tsx, values-band.tsx}` (تعيد استخدام ثوابت `HERO_*` و`Section` و`Card`)، و`lib/icons/value-icons.tsx`، و`lib/seo/metadata.ts` (`image`)، و`lib/seo/json-ld.tsx`، و`lib/pages/built-routes.ts`.
- **Tests:**
  - `hero title block precedes the portrait in DOM order`.
  - `portrait never overlaps the title at 390 / 768 / 1440`: قياس حي في هـ.
  - `reading column is capped at the §4.6 measure`.
  - `closing date comes from publishedAt`.
  - `values cards share one row height`.
  - `og:image is emitted`.

### د٤: الموشن
- **Files:** `apps/web/src/styles/motion.css` (`rise-settle`، و`hero-ground-zoom`، و`portrait-reveal`، و`motif-draw`، و`quote-rule`، ونطاق stagger، وتصغير الموبايل)، و`packages/design-tokens/tokens/primitive/motion.json` (`duration.ambient`، إن وُفق على س١١).
- **Tests:**
  - `motion-contract.spec` يُمدَّد: transform/opacity/clip-path فقط، وكل حركة داخل `no-preference`، ولا `infinite` خارج `.spin`.
  - `the LCP candidates never start at opacity 0`.

### د٥: تمريرة impeccable
- الأمر: `/impeccable polish apps/web/src/app/[locale]/about/president`. نتائجها تُطبق داخل الـ tokens والـ ADRs فقط.

**Done المرحلة د:**
- suite الموقع كاملة.
- lint 0.
- `tsc` 0.
- تقرير.

## المرحلة هـ — التحقق (chrome-devtools أو playwright)

**تنبيه:** كلا الـ MCP لم يتصل في جلسة 2026-09-12. إن بقي كذلك، فالبديل Playwright كسكربت محلي في scratchpad بموافقة.

| المجال | الفحص |
|---|---|
| الصفحة العامة | العربي والإنجليزي × 390 و768 و1440 × فاتح وغامق. التباين، والتداخل، والـ overflow، وعرض السطر |
| الأداء | performance trace لـ LCP وCLS مرتين: قبل الموشن (د٣) وبعده (د٤). المعيار: CLS < 0.1، وLCP لا يسوء بأكثر من هامش القياس |
| تقليل الحركة | محاكاة `prefers-reduced-motion`: كل المحتوى ظاهر فورًا، بلا transform |
| المقارنة | مع معيار "تواصل معنا" ومع Figma. لا يُنسخ أي عيب من §7 |
| الداش بورد | سيناريو بموافقات (إرسال ← اعتماد ← نشر)، وسيناريو نشر مباشر. الـ toasts بالعربي والإنجليزي |
| theme-toggle | لا وميض، ولا hydration warning |

---

# الجزء الثالث — الأسئلة المعلّقة (بتوصياتي)

| # | السؤال | توصيتي |
|---|---|---|
| س١ | مصدر القيم: قائمة خاصة بالكلمة (`values`)، أم `visionMission.coreValues`؟ | خاصة بالكلمة، إلا إن كانت هذه قيم الاتحاد الرسمية حرفيًا |
| س٢ | المنصب في الـ hero: `heroSubtitle` أم `signatoryTitle`؟ | `heroSubtitle` |
| س٣ | السياسة الأولى لـ presidentMessagePage (Add وEdit)، ومن المعتمدون؟ | `workflowRequired: true`، بخطوة واحدة متسلسلة وموافقة واحدة. المعتمدون بأسمائهم منك |
| س٤ | غياب policy | fail-closed |
| س٥ | الـ allowlist النهائي | كما في ب١: بلا underline، ولا strike، ولا code |
| س٦ | dependencies الداش بورد | `@tiptap/react` 3.31.3 (~8.3 KB gzip)، و`@tiptap/starter-kit` 3.31.3 (~105 KB gzip، يشمل ProseMirror)، و`@tiptap/pm` (peer). لا شيء في api أو web |
| س٧ | فشل الإجراءات: toast أم تنبيه inline؟ (ADR-0016) | تنبيه inline في لوحة الإجراءات، وtoast للأخطاء غير المانعة |
| س٨ | سجل نطاق القيم | `green` |
| س٩ | حجم الاقتباس | `text-h3` (24/20 Bold) |
| س١٠ | تخطيط القراءة على سطح المكتب | عمود واحد |
| س١١ | موشن "سينمائي" لصفحة Institutional، وtoken `motion.duration.ambient` 1200ms | اعتماده كنوع hero (portrait) في ADR، مع الـ token |
| س١٢ | الدخول من جانب القراءة (ينعكس) أم الـ ascent 45° الثابت؟ | الـ ascent |
| س١٣ | ظهور الفقرات: `rise-scroll` (scroll-driven، بلا JS) أم مرة واحدة بـ IntersectionObserver؟ | `rise-scroll` |
| س١٤ | قائمة `VALUE_ICON_KEYS` | eye، وusers، وstar، وaward، وzap، وtarget، وhandshake، وtrophy، وmedal، وflag، وlightbulb، وshield-check |
| س١٥ | قاعدة "الكلمة الحالية" | تعيين President النشط، ثم الأحدث نشرًا |
| س١٦ | منع نشر محتوى فيه علامة placeholder | نعم |
| س١٧ | (أ) Lucide: SVG مضمَّن أم `lucide-react`؟ (ب) واجهة إعداد النشر الصغرى + `PUT /workflow-policies` | (أ) مضمَّن. (ب) نعم |

---

# الملحق — ما قُرئ في المرحلة أ

- **Figma:** بالعين، أربعة frames مُرسمة في scratchpad (`pm-2026-09-12/`): `698:66`، و`1268:2258`، و`1252:2298`، و`1282:2258`. بلا `get_metadata`.
- **API:**
  - `president-message-page/*`، و`hero-page.schema.ts`، و`content-block.schema.ts`.
  - `vision-mission-page.schema.ts`، و`federation-appointments.schema.ts`، و`federation-personnel.schema.ts`، و`election-cycles.schema.ts`، و`media-asset.schema.ts`، و`pages.schema.ts`.
  - `workflow-*`: الـ schemas والـ services والـ controllers، و`publications.*`، و`revisions.service.ts`.
  - `permission-catalogue.ts`، و`permission.schema.ts`، و`api-error-code.ts`، و`seed-dev.ts`.
- **الداش بورد:** `package.json`، و`(app)/layout.tsx`، و`interactive.ts`، و`admin-write.ts`، و`upstream.ts`، ومسارات الـ app، ومواضع `aria-live`.
- **الموقع:** `package.json`، و`motion.css`، و`page-hero.tsx`، و`surface.ts` (`HERO_*`)، و`card.tsx`، و`static-page-screen.tsx`، و`board-members/page.tsx`، و`media.ts`، و`metadata.ts`، و`navigation.ts`.
- **الوثائق:**
  - `page-president-message.md` (كاملًا)، و`figma-vs-code-audit.md` §8، و`workflow-integrity-review.md` (الحالة، والفرضيات، والقرارات)، و`content-authorization-architecture-approval.md` §2.2.
  - Ch.4 §4.4–4.6، وCh.5 §5.6–5.9، وCh.6 §6.7، وCh.8 L4 (ADR-0016 وFB.*)، وCh.13 ADR-0044، وCh.14 §3–4.
  - ADR-0059، و0060، و0065 D6، و0066 D5، و0067 D3/D4.
  - Visual Protocol §4 و§13.
- **أحجام TipTap:** bundlephobia API، 3.31.3، بتاريخ 2026-09-12.

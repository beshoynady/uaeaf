# خطة تنفيذ — المرحلة ٤: تبويب الأخبار في الداشبورد + التصنيف + السياسات العامة

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Steps use `- [ ]` for tracking.

**Goal:** محرر يكتب خبرًا مصنَّفًا من الداشبورد، ومعتمِد يرى ما ينتظره وحده ويقرر بسبب إلزامي، وأدمن يفعّل الموافقات على أي كيان من شاشة واحدة — وكل ذلك ظاهر ببيانات تجريبية حقيقية.

**Architecture:** لا محرّك جديد. حقل `category` على `articles` بنمط `GOVERNANCE_DOCUMENT_TYPES`. تعميم تعيين السياسة عبر endpoint واحد يعيد استعمال `buildSteps`. ثلاث شاشات داشبورد فوق `EDITORIAL_ENTITIES` والمسارات العامة القائمة.

**Spec:** رسالة المالك 2026-09-21 + إضافتها أثناء التنفيذ (بيانات تجريبية وقائمة موافقات).

---

## Global Constraints

- **Git ممنوع تمامًا.** أوامر `git add` تُكتب نصًّا في نهاية الملف فقط.
- **المنافذ المُقاسة:** API `3000`، ويب `3001`، داشبورد `3002`. لا تعديل على `api/.env`.
- **الاختبارات:** `npm test -- --runInBand` في `api/` · `npx vitest run --pool=threads` في `apps/web` و`apps/dashboard` · `npx tsc --noEmit` لكل حزمة.
- **دوال سهم، تعليقات إنجليزية تشرح الـWHY، TDD لكل منطق backend.**
- **مواضع محمية لا تُلمس:** `app/[locale]/layout.tsx` · rich-text allowlist والتعقيم · عارض `RichText` المشترك · `AuditLogInterceptor` العام (كل مسار كتابة جديد يحمل `@SkipAuditLog()` + سجل يدوي).
- **خارج النطاق:** `externalMediaCoverage` · Figma بالكتابة · المشاركة/الوسوم/شريط الصور/زمن القراءة/ترقيم الصفحات · بند السلّم النصّي (٢٢/١٥).
- **للموافقة لا للتنفيذ:** أي توسعة على الـallowlist · أي تعديل schema غير إضافة حقل بنمط موثَّق.

---

## قرارات تنفيذية اتُّخذت هنا (لا تُسأل، تُوثَّق)

| # | القرار | السبب |
|---|---|---|
| D1 | `ARTICLE_CATEGORIES = ['General','FederationInMedia']` | نمط `GOVERNANCE_DOCUMENT_TYPES`: معرّفات إنجليزية مغلقة، والعرض العربي من ملفات الرسائل. `FederationInMedia` تسمّي «الاتحاد في الإعلام» بلا لبس مع وحدة `externalMediaCoverage` |
| D2 | `category` مطلوب بقيمة افتراضية `'General'` | خبر بلا تصنيف ليس حالة يريدها أحد؛ والافتراضي يجعل الحقل غير كاسر لأي خبر قائم |
| D3 | `buildSteps` يُستورد من `bootstrap/seed-news-approval.ts` كما هو | دالة خالصة بلا أثر جانبي عند الاستيراد، والمالك نصّ على إعادة استعمالها من هناك |
| D4 | «بانتظار موافقتي» يستثني ما وافقتُ عليه في الدورة الحالية | خطوة Parallel بعتبة ٣ تبقى منتظِرة بعد موافقتي؛ إظهارها لي ثانيةً يدعوني لفعل لا أثر له |
| D5 | شاشة المراجعة تقارن بآخر نسخة **منشورة** لا بآخر نسخة محفوظة | المراجع يقرر على ما سيتغيّر أمام القارئ، لا على ما تغيّر في المسودة |

---

## بنية الملفات

### API — جديد
`modules/workflow/workflow-policies/dto/configure-approval.dto.ts` · `modules/workflow/workflow-policies/approval-configuration.service.ts` · `bootstrap/seed-newsroom-demo.ts` · `seed-newsroom-demo.ts`

### API — تعديل
`articles/schemas/article.schema.ts` (الحقل + الفهرس) · `articles/dto/*.dto.ts` · `articles/articles.service.ts` (الفلترة) · `articles/articles.controller.ts` · `workflow-policies/workflow-policies.controller.ts` (endpoint التعميم) · `workflow-instances/workflow-instances.{repository,service,controller}.ts` (pending-mine) · `common/constants/entity-content.ts` (`category` في الإسقاط)

### Dashboard — جديد
`app/[locale]/(app)/news/page.tsx` · `news/[id]/page.tsx` · `news/review/page.tsx` · `news/policies/page.tsx` (نُقلت إلى `approval-policies/page.tsx` في 2026-09-21، G3؛ المسار القديم يحوّل) · `components/admin/news/{list,editor,review-queue,policy-manager}.tsx` · `lib/admin/{articles,approval-policies}.ts` · `app/api/admin/articles/**` · `app/api/admin/approval-policies/route.ts`

### Dashboard — تعديل
`lib/admin/editorial-entities.ts` · `lib/navigation.ts` · `messages/{ar,en}.json`

### Web — تعديل
`components/pages/news/news-list.tsx` · `app/[locale]/news/page.tsx` · `lib/api/articles.ts` · `lib/api/types.ts`

---

## Task 1 — حقل التصنيف

**Interfaces:** `ARTICLE_CATEGORIES` · `ArticleCategory` · `Article.category`

- [ ] **الاختبار الأحمر** في `article.schema.spec.ts`: الـenum قيمتان بالضبط، الافتراضي `General`، وفهرس مركّب `{category,publicationState,archived,publishDate}` يخدم الخلاصة المصنَّفة.
- [ ] شغّله، تأكد أنه يفشل.
- [ ] أضف إلى الـschema:

```ts
/**
 * What kind of item this is, inside the newsroom's own taxonomy.
 *
 * Deliberately NOT `externalMediaCoverage`, which is a separate collection for
 * links to press coverage published elsewhere. This is a label on the
 * federation's OWN article saying which shelf it belongs on, and the two must
 * not be conflated: one is a record the federation wrote, the other a pointer
 * at something a newspaper wrote.
 *
 * Two values to start, and the list is open to grow — the pattern
 * `GOVERNANCE_DOCUMENT_TYPES` set, where the identifiers are English and the
 * reader's label comes from the message catalogues.
 */
export const ARTICLE_CATEGORIES = ['General', 'FederationInMedia'] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];
```

والحقل `@Prop({ type: String, enum: ARTICLE_CATEGORIES, required: true, default: 'General' })`، وفهرس الخلاصة المصنَّفة.

- [ ] أضف `category` إلى `CreateArticleDto` (اختياري، افتراضي `General`) و`UpdateArticleDto` و`QueryArticlesDto` و`ArticlePublicDto` و`toPublicDto` و`REVISION_READ_FIELDS.articles`.
- [ ] شغّل `npm test -- --runInBand src/modules/public-communication src/common/constants` و`tsc`.

---

## Task 2 — فلترة القائمة العامة

**Interfaces:** `GET /articles/public?category=&from=&to=&search=&page=&limit=` · `PublicArticleQueryDto`

- [ ] **الاختبار الأحمر** في `articles.service.spec.ts`: التصنيف يضيّق، ونطاق التاريخ يُترجم إلى `$gte/$lte` على `publishDate`، والبحث يُهرَّب قبل بلوغ Mongo، والغياب لا يضيف مفتاحًا.
- [ ] شغّله، نفّذ، شغّل ثانيةً.
- [ ] الفلتر يُبنى فوق `repository.findPage` القائم — لا استعلام جديد.

---

## Task 3 — «بانتظار موافقتي»

**Interfaces:** `WorkflowInstancesRepository.findPendingFor(userId)` · `GET /workflow-instances/pending-mine`

- [ ] **الاختبار الأحمر**: تُرجع فقط `InProgress` التي يكون المستخدم معيَّنًا على خطوتها الحالية، **وتستثني** ما وافق عليه في الدورة الحالية (D4)، ولا تُرجع شيئًا لمن ليس معيَّنًا.
- [ ] شغّله، نفّذ، شغّل ثانيةً. المسار يحمل `@RequirePermission('workflowInstances','Read')`.

---

## Task 4 — تعميم تعيين سياسة الموافقة

**Interfaces:** `PUT /workflow-policies/:entityType/approval` بجسم `{ enabled, mode, approverIds, threshold }` · `ApprovalConfigurationService.configure()`

- [ ] **الاختبار الأحمر**: نوع خارج `PERMISSION_RESOURCES` يُرفض · `enabled:false` يضبط `workflowRequired:false` بلا حذف التعريف · نمط بعتبة أكبر من عدد المعتمِدين يُرفض بـ`unsatisfiableStep` · الخطوات تُستبدل لا تُدمج.
- [ ] شغّله، نفّذ، شغّل ثانيةً. الخدمة تستورد `buildSteps` من `bootstrap/seed-news-approval.js` (D3) وتغلّفه بتحويل النصوص إلى `ObjectId`.
- [ ] `GET /workflow-policies/governable` يُرجع الأنواع القابلة للحوكمة وحالة كل منها — ما تعرضه شاشة السياسات.

---

## Task 5 — البيانات التجريبية (إضافة المالك)

**Interfaces:** `seedNewsroomDemo()` · `npm run seed:newsroom`

- [ ] **الاختبار الأحمر**: إعادة التشغيل لا تضاعف شيئًا · كل مستخدم تجريبي يحمل `isDemo` ويقول عن نفسه ذلك في اسمه · تُنتج أخبارًا في الحالات الأربع بما فيها **منتظِرة موافقة فعليًا**.
- [ ] ينشئ: ثلاثة مستخدمين بأدوار مفصولة (محرر/معتمِد/ناشر)، وثمانية أخبار موزّعة على التصنيفين وعلى الحالات، منها اثنان `InProgress` على خطوة المعتمِد — فتظهر شاشة المراجعة بمحتوى حقيقي.
- [ ] النصوص عربية/إنجليزية واقعية الطول لاختبار الالتفاف، ومعلَّمة «تجريبي/Demo» في العنوان.

---

## Task 6 — شاشة قائمة الأخبار وتسجيل الكيان

- [ ] سطر `articles` في `EDITORIAL_ENTITIES` · روابط التنقّل الأربعة · مفاتيح الرسائل بلغتين.
- [ ] **الاختبار الأحمر**: القائمة تُظهر كل الحالات وتفلتر بالحالة وبالتصنيف، وتشتقّ «قيد المراجعة» و«مرفوض» و«مطلوب تعديل» من آخر `workflowInstance` لا من عمود.
- [ ] نفّذ بنمط شاشات الرعاة، وtokens النظام حصرًا.

---

## Task 7 — شاشة إضافة/تعديل خبر

- [ ] **الاختبار الأحمر**: المحرر يُحمَّل عبر `LazyBilingualRichText` لا استيرادًا مباشرًا · يصير للقراءة فقط لمن لا يملك التحرير · التصنيف حقل مطلوب · **رابط خارج الـallowlist يُرفض في الواجهة قبل الحفظ**.
- [ ] الحقول: العنوان، الرابط، التصنيف، صورة الغلاف، المتن، اسم الكاتب، مجموعة SEO. «إرسال للمراجعة» عبر المسار العام القائم.

---

## Task 8 — شاشة المراجعة

- [ ] **الاختبار الأحمر**: تعرض فقط ما ينتظر المستخدم الحالي · «رفض» و«طلب تعديل» زران متمايزان يستدعيان المسار نفسه بـ`revisionRequested` مختلف · **السبب إلزامي في كليهما** · المقارنة بآخر نسخة منشورة (D5).
- [ ] نفّذ. لا اشتقاق للصلاحية في المتصفح — `availableActions` من الخادم.

---

## Task 9 — شاشة سياسات الموافقة

- [ ] **الاختبار الأحمر**: تسرد الأنواع القابلة للحوكمة · التفعيل يستدعي الـendpoint بالنمط والمعتمِدين · عتبة أكبر من العدد تُرفض في الواجهة · **تُنشئ سياسة لنوع خارج الأربعة الأصلية بنجاح**.
- [ ] نفّذ.

---

## Task 10 — ربط التصنيف بالموقع العام

- [ ] **الاختبار الأحمر**: القائمة تقسم إلى قسمين بحسب التصنيف، وقسم «الاتحاد في الإعلام» يختفي كليًا حين لا خبر فيه («لا رفّ فارغ»).
- [ ] نفّذ فوق `NewsList` القائم بلا مكوّن جديد.

---

## Task 11 — التحقق النهائي

- [ ] `tsc --noEmit` للحزم الثلاث · وحدات API + e2e · vitest للويب والداشبورد.
- [ ] لقطات حيّة: الشاشات الثلاث + القائمة العامة المقسّمة، عربي/إنجليزي.
- [ ] `axe` على الشاشات الجديدة.
- [ ] تأكيد أن `app/[locale]/layout.tsx` لم يُلمس (`git status` قراءةً فقط).

---

## أوامر الالتزام — نصًّا، للمالك

**المرحلة ٣ (لم تُنفَّذ بعد):**
```
git add apps/web/src/components/pages/news apps/web/src/app/[locale]/news apps/web/src/app/sitemap-news.ts apps/web/src/lib/api/articles.ts apps/web/src/lib/api/types.ts apps/web/src/lib/pages/public-pages.ts apps/web/src/lib/pages/indexability.ts apps/web/src/lib/seo/json-ld.tsx apps/web/src/lib/design-system/seo-contract.spec.ts apps/web/messages/ar.json apps/web/messages/en.json .impeccable/config.json
git commit -m "feat(web): the news listing and article pages, with NewsArticle data and their own sitemap"
```

**المرحلة ٤:** تُكتب في التقرير النهائي بعد اكتمال التنفيذ.

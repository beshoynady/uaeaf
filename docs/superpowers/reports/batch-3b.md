# الدفعة 3b — الالتفاف حول الاعتماد، ونمط المراجع، وتدقيق حذف الدور، وقياس الأرشفة

**النتيجة: PASS WITH DEBT.**

ثلاثة بنود من أربعة منفَّذة ومقيسة. البند 1 **موقوف عند قرارك**، وهذا أثر قياسه لا عجزًا عنه: القياس كشف مسارًا أخطر من الذي سُمّي في التعليمات، وفرضيتين في التعليمات غير صحيحتين في الكود.

---

## 1. الأرقام

| | النتيجة |
|---|---|
| `npx tsc --noEmit` (api) | **exit 0، نظيف** |
| `test:guards:core` | **11 من 12 حزمة · 117 من 120 اختبارًا** |
| — الفشل الباقي | 3 اختبارات في `raw-dto-cast-scan`، **كلها من جلسة موازية**، انظر §6 |
| الحارس الجديد `reference-path-typing` | **4/4 أخضر** |
| roles + audit-logs (البند 3) | 14 حزمة · 103 اختبارًا · أخضر |
| البند 2 — الحُرّاس الأساسيون وقت تسليمه | 12 حزمة · 120 اختبارًا · exit 0 |
| الطفرات المنفَّذة فعليًا | **11** — 7 في البند 2، و4 في البند 3، كل واحدة احمرّت، وكل ملف رجع بـsha256 مؤكَّد |

**`test:guards` الكامل لم يُشغَّل**، ولن يكون قياسه صادقًا بينما `api/src` تُكتب من جلسة أخرى. يُشغَّل بعد استقرارها.

---

## 2. الملفات التي لُمست

### `api/`

**البند 2 — نمط المراجع (ADR-0123)**
- 57 ملف `*.schema.ts` — 146 تصريحًا، وسطر استيراد واحد لكل ملف. **43 CRLF و14 LF محفوظة كما هي.**
- `common/authz/media-references.ts` · `modules/platform-administration/roles/role-assignments.repository.ts` · `package.json` · `scripts/test-guards.mjs` · `docs/engineering/guard-tests.md`
- **جديدة:** `common/authz/reference-path-typing.spec.ts` (الحارس) · `bootstrap/convert-reference-ids.ts` + `.spec.ts` · `convert-reference-ids.ts` · `roles/role-assignments.repository.spec.ts`
- `bootstrap/reset-roles.ts` — **مطابق لـ`HEAD` بايتًا ببايت.** أتلفه المنفّذ بعكس بديل في أداة الطفرات واسترجعه؛ مؤكَّد بـ`git diff --quiet`.

**البند 3 — تدقيق `DELETE /roles/:id` ومعاملته (B27 · B28)**
- `common/repositories/base.repository.ts` — `session` اختياري على `archiveIfLive` و`softDelete`، إضافي بلا تغيير سلوك
- `roles/roles.repository.ts` · `roles/role-assignments.repository.ts` · `roles/roles.service.ts` · `roles/roles.controller.ts` · `roles/roles.module.ts`
- **جديدة:** `roles/roles.remove.transaction.spec.ts` · `test/utils/fake-session.ts`
- **مُحدَّثة (mocks فقط):** 12 ملف اختبار

**استرجاع المتحكّم:** `cms-page-composition/hero-slides/schemas/hero-slides.schema.ts` — 5 تصريحات من عمل هذه الدفعة أعادتها الجلسة الموازية، فأعدتُ تطبيقها. النهايات محفوظة.

### `docs/`

- **جديدة:** `ADR-0123` (نمط المراجع) · `ADR-0124` (`createdBy`/`updatedBy` وتعريف المؤلف) · `ADR-0125` (النشر والسياسة) · `ADR-0126` (نسبة المحتوى)
- `specs/2026-09-26-authz-authn-design.md` — §4.1 (تعريف المؤلف، وقاعدة الخطوة الواحدة، والمقارنة بالنص) · §9.2 (ثلاثة صفوف) · §12 (7c مُعاد كتابته، و7d جديد)
- `plans/2026-09-26-authz-authn.md` — قسم الدفعة 4 الجديد · تصحيح فقرة `$in` · نطاق البند 1
- `reports/batch-3b.md` — هذا الملف

**لم يُلمس ولا ملف في `apps/`. لم يُشغَّل أي سكريبت على قاعدة بيانات. لا dependency جديدة. لم يُولَّد `openapi.json`.**

---

## 3. البند 4 — جدول ما يسجّله كل مسار أرشفة فعلًا

**العدّ من الصفر كما أمرت. 49 مسار أرشفة. وصفر منها يسجّل `Delete`.**

ملاحظة الدفعة 2 («48 مسارًا لسه بيسجّلوا `Delete`») **لم تعد صحيحة على أي مسار** — آلية `@AuditEntity({ action })` غطّتها كلها، والـinterceptor يجعل القيمة المعلنة تغلب.

| الفئة | العدد | التفصيل |
|---|--:|---|
| مسارات أرشفة تسجّل `Archive` | **48** | كل مسار يحمل `@RequirePermission(<resource>, 'Archive')` |
| مسارات أرشفة تسجّل `Delete` | **0** | — |
| مسار أرشفة يسجّل `Update` | 1 | `DELETE /albums/:id/photos/:photoId` — معلَن، وصحيح لكيانه هو: الألبوم يُعدَّل، لا يُؤرشف |
| مسارات `PermanentDelete` (فئة منفصلة) | 2 | `DELETE /media-assets/:id/object` · `DELETE /contact-messages/:id/record` |

العدّ مصالَح مع الـ51 معالجًا يحمل `@Delete()`؛ لا مسار مفقود.

### فجوتان كشفهما القياس — لم تُصلَّحا، وهما بنفس شكل B27

| # | الفجوة | الخطورة | المالك |
|--:|---|---|---|
| **B30** | `DELETE /albums/:id/photos/:photoId` يؤرشف سجل `mediaAssets` **بلا أي صف تدقيق لذلك الكيان**. `MediaAssetsService.remove()` لا يكتب صفًّا لنفسه، والـinterceptor يكتب مرة واحدة لكل طلب، على كيان المسار الخارجي (`albums`) | Important | قرارك |
| **B31** | `PUT /workflow-policies/:entityType/approval` يضبط `archivedAt` جملةً على خطوات workflow مستبدَلة **بلا أي صف تدقيق إطلاقًا** | Important | قرارك |

ومُستبعد عمدًا ومسمّى حتى لا يُظنّ سهوًا: `POST /workflow-instances/:id/cancel` يستعمل `archivedAt` بديلًا عن حالة «ملغاة» لا يوفّرها enum الحالة، ويدقّق نفسه بـ`StatusChange`.

---

## 4. البند 1 — القياس، والوقوف

### تصحيحان لفرضيتين في التعليمات

**1. المسار لا يلتفّ حول فصل المهام، لأن فصل المهام غير موجود.** `selfApproval` صفر مرات في `api/src` خارج الـspec، ولا مقارنة بمؤلف في أي مكان — وتعليق الكود نفسه يقولها: *«البوابة الوحيدة لمنع الاعتماد الذاتي؛ لا مقارنة بحقل مؤلف موجودة ولا تُجرى.»* ADR-0106 والـspec كلاهما يجدول فصل المهام في الدفعة 4. فالذي يلتفّ حوله المسار هو فحص العضوية في `assigneeIds`، وهو الفحص الوحيد القائم.

**2. قاعدة «اعتمد خطوة قبلها في نفس المسار» ليست في أي وثيقة معتمدة.** قاعدة جديدة، سُجّلت الآن في ADR-0124 D1.

### القياس: 25 مسار كتابة

كل زوج صلاحيات يخصّها **قابل للمنح** (`superAdminOnly: []` على `workflowSteps` و`workflowInstances` و`workflowPolicies` و`workflowDefinitions`).

**الأخطر، ولم يكن في التعليمات — P12.** `POST /workflow-instances` يأخذ `workflowDefinitionId` من جسم الطلب، و`assertCanSubmitThrough` يتحقق فقط أنه موجود ونشط ويحكم النوع نفسه — **لا أنه التعريف الذي تسمّيه السياسة**. ثم `publishApproved` يقرأ `findLatestApproved` المفتاح على `(النوع، السجل، Approved)` **بلا أي إشارة لتعريف السياسة**. فحامل أزواج عادية يبني تعريفًا يسمّي نفسه وحده، يقدّم، يعتمد، ينشر — **بلا لمس أي خطوة، فلا قفل يُشتبك أصلًا**، وقاعدة المؤلف لا تغلقه لأن الفاعل لا يلزم أن يكون المؤلف.

**فخاخ مسجَّلة لمن يبني:**
- `workflowInstances.createdBy` **موجود و`null` على كل صف كُتب** — لا `create` يكتبه ولا أيٌّ من تحديثاته الستة. فحص يقرأه **يفشل مفتوحًا**. وهو الحقل الذي يمدّ إليه أي منفّذ يده أولًا.
- `contactMessages` بلا revision إطلاقًا؛ سؤال المؤلف لا جواب له عليها.
- كل حقل مرجعي في الموديول كان `Mixed` غير مصنَّف (أصلحه البند 2). مقارنة كـfilter **تفشل مفتوحة**؛ مقارنة بـ`.equals()` ترمي 500. فحص العضوية القائم نصّي، وهو بذلك المقارنة الوحيدة التي لم يكن العيب ليهزمها.

### قراراتك التي فتحت البند

| السؤال | قرارك |
|---|---|
| النطاق | **P1 + P12 معًا** |
| المؤلف | **الثلاثة معًا**؛ `null` يُتخطّى حقلًا حقلًا، و`revision.createdBy` إلزامي دائمًا؛ `workflowInstances.createdBy` لا يُقرأ، وعليه اختبار سلبي |
| إعادة الاعتماد | **تُحتسب**، وSuper Admin يتجاوز بسبب مكتوب |

مسجّلة في ADR-0124 وADR-0125 وفي الـspec §4.1. **ولم يُبنَ منها شيء** — انظر §7.

---

## 5. القرارات التي أخذتها وحدي

| القرار | السبب | لو غلط |
|---|---|---|
| المقارنة في البند 1 تكون بـ`String(...)` في JS لا كـfilter | حتى يصلح البند 2 النمط، الـfilter لا يطابق قيمة مخزَّنة نصًّا، و**يفشل مفتوحًا** — أسوأ اتجاه لقاعدة أمنية | قراءة مستند إضافية لكل اعتماد |
| البند 2 يملك فلتر `detachRole`، والبند 3 يضيف الـsession فقط | بندان يعيدان كتابة استعلام واحد هو كيف يُلغي أحدهما الآخر بصمت | البند 3 يُبنى فوق نسخة البند 2 |
| قياس البند 4 يُؤخذ **قبل** أن يعدّل البند 3 مسار الأدوار | جدول يقيس تغيير هذه الجلسة نفسها يجيب سؤالًا آخر | يُعاد القياس |
| لا worktree؛ العمل على `main` | CLAUDE.md §33 يمنع أوامر Git الكاتبة، فلا يمكن إنشاء worktree | لا شيء؛ كل commit بيدك |
| استرجعتُ `hero-slides.schema.ts` بنفسي بدل تكليف وكيل | استرجاع ميكانيكي لعمل مُراجَع أعادته جلسة أخرى مرتين؛ تكليف لخمسة أسطر غير متناسب | خمسة أسطر ظاهرة في الـdiff |
| فقرة «الإصلاح الدائم هو `$in: [oid, hex]`» في الخطة صُحّحت | البند 2 نفسه أبطلها بالقياس؛ خطة تصف إصلاحًا توقّف بسبب المهمة التي تصفها | فقرة تُعاد صياغتها |
| ADR-0123 إلى 0126، لا 0122 | جلسة الهيدر أخذت 0122 في اليوم نفسه | إعادة ترقيم |

---

## 6. الديون الجديدة، بمالكها

| # | البند | الخطورة | المالك |
|--:|---|---|---|
| **B32** | 🔴 **P12 — النشر لا يسأل تحت أي تعريف جرى الاعتماد.** مسار كامل من أزواج قابلة للمنح إلى نشر محتوى اعتمده الفاعل لنفسه | **Critical** | **البند 1، مفتوح بقرارك** |
| **B33** | `albums` له مسار `albums:Publish` خاص **لا يستشير السياسة إطلاقًا** — باب ثانٍ حول قرار 2 | **Important** | قرار 2 |
| **B34** | `committees` · `documents` · `governanceDocuments` · `organizationalStructure` تعلن زوج `Publish` **لا يحرسه أي مسار**، ولا يمكن نشرها اليوم إطلاقًا — قراءتها العامة عبر `publications` ولا أحد يكتب صفًّا لها. **فجوة وظيفية** | **Important** | قرارك |
| **B30** · **B31** | فجوتا تدقيق الأرشفة في §3 | Important | قرارك |
| **B35** | `findMediaAssetReferrers` فقد إملاءه الثاني: على مسار مصنَّف Mongoose يحوّل كل عضو في `$in`، فمرجع مخزَّن نصًّا صار غير مرئي لرفض `mediaInUse` — الفحص الواقف بين الحذف الدائم وصفحة منشورة. **كامن**؛ كل كتابة إنتاجية تحوّل | **Important** | قرارك — ADR-0123 D1 |
| **B36** | 29 مسار id بلا `ref` خارج مسح سكريبت التحويل؛ يسمّيها في كل تشغيلة | Minor | قرارك — ADR-0123 D3 |
| **B37** | `DELETE /roles/:id` صار يفتح معاملة دائمًا، فيلزمه replica set. لم يُضَف بديل صامت بلا معاملة **عمدًا** | Important | تشغيلي، بعينك |
| **B38** | `mediaAssets.file.photographer` بلغة واحدة بينما كل حقل اسم شخص ثنائي اللغة، **وغير قابل للتعديل بعد الرفع** — خطأ إملائي في نسبة دائم | Important | قرار 3 |
| **B39** | أربعة أنواع صفحات تكتب **صفّي تدقيق** لكل نشر مباشر (`StatusChange` من الخدمة و`Create` من الـinterceptor) لغياب `@SkipAuditLog()`. الفاعل نفسه في الصفين | Minor | الدفعة 9 |
| **B40** | `workflow-integrity.e2e-spec.ts` — اختبارا `[H6]` أحمران على شجرة نظيفة: الـhelper ينادي `defineWorkflow([])` فيصطدم بـ`unsatisfiablePolicy`. **الحارس صحيح والـhelper قديم**، والتأكيدات التي وُجد الاختباران لأجلها لا تُبلَغ أصلًا | Important | الدفعة 9 — أصلح الـhelper لا الحارس |
| **B41** | `migrate-delete-to-archive.spec.ts` أحمر سابقًا لهذه الدفعة (`scope: null` ناقص من التوقّع). سطر واحد | Minor | الدفعة 9 |
| **B42** | حزمة `api` الكاملة لا تعمل في عملية واحدة: 2 GB heap تنفد عند ~700 ثانية على 223 ملفًا، exit 134 بلا فشل اختبار واحد. تُشغَّل مقسَّمة بالمسار | Minor | الدفعة 9 — يُوثَّق الاستدعاء |

---

## 6أ. جلسة موازية تكتب في `api/src` — وهذا سبب عدم تسليم الدفعة خضراء

الجلسة الموازية تبني موديول `seasons` (غير متتبَّع: `?? api/src/modules/media-center/seasons/`) وتعدّل schemas في `media-center`.

**أثرها المقيس على هذه الدفعة:**
1. أعادت **20 تحويلًا من 146** أثناء عمل البند 2. أعاد المنفّذ تطبيقها.
2. أعادت `hero-slides.schema.ts` مرة ثانية بعد تسليمه. أعدتُ تطبيقها بنفسي، والحارس رجع أخضر.
3. `app.module.ts` اكتسب استيراد `SearchModule` ليس منّا.

**الفشل الباقي الوحيد** — 3 اختبارات في `raw-dto-cast-scan` — يسمّي `modules/media-center/seasons/seasons.service.ts` وDTO رقم 33. **هذه الدفعة لم تنشئ شيئًا هناك.**

**⚠️ تحذير لمن يلمس الملفات تاليًا:** عند `HEAD` لا يزال `role-assignments.repository.ts` يحمل الفلتر القديم بإملاء واحد. **استرجاع `HEAD` فوقه يتلفه.**

**أعد تشغيل `test-guards.mjs core` مباشرة قبل أي commit.** الحارس الجديد هو ما يمسك هذا.

---

## 7. الأسئلة المفتوحة

**1. صلاحية النشر ليست قاعدة واحدة، ولا يمكن كتابتها كذلك (قرار 2).** القاعدة المقصودة تصحّ على 5 من 12 نوعًا. ثلاثة قرارات:
- هل يفقد `albums` مساره المنفصل الذي لا يستشير السياسة؟
- هل يبقى `videos` استثناءً معلنًا (`Update` هو النشر)؟
- هل الأربعة غير القابلة للنشر (B34) داخل النطاق؟

**2. `own` غير صالح للاستعمال في أي مكان اليوم.** الحارس يرفض أي منحة أضيق من `all`. فعبارة «بنطاقها own أو all» مدعومة نصفها، وقرار 2 **يعتمد على** عمل `own` في الدفعة 4 ولا يسبقه.

**3. كاتب الخبر: نص حر أم ربط بسجل في «الأشخاص»؟** الخياران بتكلفتيهما في `task-5-measure-report.md` §B4، وبلا اختيار.

**4. B35 — `findMediaAssetReferrers`:** ينتقل للـdriver collection كما فعل `detachRole`، أم يُشغَّل المحوِّل أولًا ثم يُحذف النصف الميت؟

**5. B36 — الـ29 مسارًا بلا `ref`:** هل يغطّيها سكريبت التحويل؟

**6. B30 وB31** — فجوتا تدقيق الأرشفة.

---

## 8. أوامر الـcommit — لك، ولم تُشغَّل

**⚠️ قبل أي شيء: `node scripts/test-guards.mjs core`.** الجلسة الموازية أعادت عمل هذه الدفعة مرتين.

**⛔ لا تُشغَّل:** `npm run reset:roles` · `npm run seed:role-templates` · `npm run convert:reference-ids`.

الأمر التالي يستبعد ملفات الجلسة الموازية (`seasons/` وموديولات `media-center` وschemasها و`app.module.ts`) عمدًا:

```
git add api/src/common/authz/reference-path-typing.spec.ts api/src/common/authz/media-references.ts api/src/common/repositories/base.repository.ts api/src/common/schemas api/src/bootstrap/convert-reference-ids.ts api/src/bootstrap/convert-reference-ids.spec.ts api/src/convert-reference-ids.ts api/src/modules/platform-administration/roles api/src/modules/athletics api/src/modules/cms-page-composition api/src/modules/documents api/src/modules/federation-governance api/src/modules/people-organizations api/src/modules/public-communication api/src/modules/sponsorship-relations api/src/modules/workflow api/src/modules/platform-administration/users api/src/modules/platform-administration/auth-sessions api/test/utils/fake-session.ts api/package.json scripts/test-guards.mjs docs/design-system/ADR-0123-Reference-Paths-Are-Declared-Mongoose-ObjectId.md docs/design-system/ADR-0124-Authorship-Fields-And-The-Author-Check.md docs/design-system/ADR-0125-Publishing-Is-Governed-By-The-Types-Approval-Policy.md docs/design-system/ADR-0126-Content-Credit-Is-Not-Authorship.md docs/engineering/guard-tests.md docs/superpowers
git commit -m "fix(api): type every reference path as ObjectId with a guard, and make DELETE /roles/:id audit and transact its detach"
```

**راجع `git status` قبل تشغيله**: ملفات `media-center` تحمل تحويل هذه الدفعة **وتعديلات الجلسة الموازية معًا**، فلا ينفع commit لها هنا. `api/openapi.json` متروك عمدًا — يُولَّد على الشجرة الكاملة في commit مستقل بعد استقرار الجلسة الموازية.

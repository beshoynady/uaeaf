# الدفعة 3 — إدارة الأدوار، ومسح الأدوار، والقوالب، و`GET /me/permissions`

**الحالة: متوقفة عند قرار المالك، والمنفَّذ منها كامل ومتراجَع.**

ستة من تسع مهام خلصوا ومتراجعين بمراجعتين مستقلتين وجولتي إصلاح. المهمتان الباقيتان — E1 و E2 — متوقفتان على أربعة قرارات، ومش متبنيتين على تخمين.

الخطة: `docs/superpowers/plans/2026-09-28-batch-3-role-management.md` (نسخة 2، بعد مراجعة مستقلة طلّعت 11 تصحيحًا في الخطة نفسها).

---

## 1. الخلاصة

### اللي خلص

| # | المهمة | جولات الإصلاح | الحالة |
|--:|---|:--:|---|
| 1 | قياس الـids بإملاءين — قراءة بحتة | — | ✅ معروض، صفر تغيير |
| 2 | الدور الأساسي غير قابل للكتابة من أي مسار | 1 | ✅ |
| 3 | محدش يغيّر أدوار حسابه هو — في الـservice كمان | — | ✅ |
| 4 | `GET /me/permissions` | 1 | ✅ |
| 5 | علامة «بدون دور» في `GET /users` | 1 | ✅ |
| 7 | القوالب الستة كبيانات + حارس | 1 | ✅ |
| 6 | E1 `reset-roles` | — | ⏸ **س1 · س2** |
| 8 | E2 `seed-role-templates` | — | ⏸ **س3 · س4** |
| 9 | التوثيق والتقرير | — | 🔄 جزئي (تحت) |

### أخطر حاجة اتكشفت، وهي مكسورة على `main` دلوقتي

**مصفوفة صلاحيات الأدوار في الداشبورد مش شغالة.** `GET /permissions` بقى يرجّع `id` (`permissions.service.ts:91-100`، object literal صريح بلا `_id`)، والداشبورد معلن `PermissionResponse._id` (`apps/dashboard/src/lib/api/types.ts:68-73`) وبيقراه في أربعة مواضع، والجلب مباشر بلا أي إعادة تعيين (`roles/page.tsx:39`).

وقت التشغيل `permission._id === undefined`، فـ`permission-matrix.ts:138-140` بيطلّع `permissionId: undefined` لكل خانة و`selected.has(undefined)` دايمًا `false`. النتيجة: **مفيش خانة واحدة بتبان ممنوحة**، وعدّادات الـlens و`directory-stats` غلط. **واختبارات الداشبورد مش هتكشفه** لأن الـfixtures فيها `_id`.

الاتنين معمولهم commit في `f9a309b` — يعني العطل على `main` مش في شغل الدفعة دي غير المعمول commit. **متصلحش**: `apps/dashboard` برا نطاق الدفعة (البرومبت §2 و§6)، وجلسة تانية شغالة هناك.

### أخطر تلات حاجات كانت في شغلي أنا

المراجعة المستقلة للخطة، والمراجعتان للكود، مسكوا تلاتة كانوا هيعدّوا:

1. **كنت هرجّع ثغرة أمنية مقفولة.** خطتي كتبت فحص الذات في الـservice بـ`id === actor.userId`. الدالة `isSelf` موجودة في `users.controller.ts:19-35` **عشان** ثغرة الحروف الكبيرة: `ObjectId.isValid` بيقبل الحالتين وMongoose بيعمل cast لنفس المستند، بينما `toString()` بيوحّد على الحروف الصغيرة — فـid بحروف كبيرة كان بيعدّي مقارنة النصوص. اتقفلت بمراجعة مستقلة 2026-09-27، وخطتي كانت هتفتحها طبقة تحت.
2. **مصفوفة القوالب اللي كتبتها كانت بتفشل اختبارها هي نفسها.** حطيت `scope: 'all'` على موارد `scopes: []` — والاختبار السادس في نفس المهمة بيرفض ده، والـspec §2.4 بيقول «Administrative resources carry no scopes».
3. **أربع اختبارات في خطتي كانت مستحيل تفشل**: مقارنة قايمة ثابتة بمصفاة فوق نفس القايمة (`A ⊆ A`)، وحارس N+1 بمستخدم واحد، واختبار «مايقراش حساب تاني» بيأكد على عدد معاملات الدالة، وإدمبوتنسي بـmocks مش stateful. نفس الفصيلة اللي الدفعة 2 شحنت منها خمسة.

وكمان: `report-reserved-pair-holders.ts` بينادي `main()` في مستوى الموديول، فاستيراده في اختبار كان هيفتح اتصال قاعدة بيانات — والخطة كانت بتقول «انسخ شكله».

### اللي الاختبارات مسكته بعد ما المهام كانت «خضرا»

**تلات طفرات فضلت خضرا** في المراجعة، وكل واحدة كشفت فراغ تغطية حقيقي:

| الطفرة | النتيجة قبل الإصلاح |
|---|---|
| `toResponseFor` ترجّع `hasNoRole: false` دايمًا | **122/122 أخضر** — الحقل على كل مسارات الحساب الواحد، وأهمها `GET /users/me`، مكانش محمي |
| `reviewer-approver` ياخد `Update` (مكتوب في غياباته) | **أخضر** — `deliberatelyAbsent` كان متحقَّق منه في 10 إدخالات من ~34 |
| `editor` ياخد `commsReports:ViewReports` | **أخضر** — نفس السبب |

الأول اتقفل باختبارين على `controller.me()`، والتانيان باختبار عام بيمشي على القوالب الستة، و`deliberatelyAbsent` بقى نوعه `PermissionAction[]` فغلطة إملائية بتتمسك وقت الترجمة (متأكَّد: `'PermanentDelte'` رمت `TS2820`).

---

## 2. قايمة الملفات اللي اتغيّرت

### جديدة

| الملف | دوره |
|---|---|
| `api/src/common/authz/role-templates.ts` | القوالب الستة كبيانات. إضافة مورد = سطر واحد. بيانات بحتة، ومفيش Mongoose وقت التشغيل (كل الاستيرادات `import type`) |
| `api/src/common/authz/role-template-matrix.spec.ts` | **حارس أساسي جديد.** 19 اختبارًا: الأزواج موجودة في الكتالوج، ومفيش `superAdminOnly`، ومفيش `PermanentDelete`، والنطاق بس حيث الخريطة بتدّيه، والاتساق عبر `missingImpliedReads`، وكل فعل في `deliberatelyAbsent` فعلًا مش ممنوح |
| `api/src/modules/platform-administration/me/me.controller.ts` | `GET /me/permissions` |
| `api/src/modules/platform-administration/me/me.module.ts` | يستورد `RolesModule` بس |
| `api/src/modules/platform-administration/me/account-class.ts` | الاشتقاق الوحيد لـ`standard \| sensitive \| superAdmin` |
| `api/src/modules/platform-administration/me/dto/me-permissions-response.dto.ts` | `ScopedGrantDto` (وفيه `scope`، بخلاف `GrantDto`) و`MePermissionsResponseDto` |
| `api/src/modules/platform-administration/me/me.controller.spec.ts` | 9 اختبارات |
| `api/src/modules/platform-administration/me/account-class.spec.ts` | 9 اختبارات |
| `api/src/modules/platform-administration/users/is-self.ts` | `isSelf` منقولة من الـcontroller **متطابقة حرفيًا** (متأكَّد بـ`diff` مع `HEAD`)، عشان الطبقتان يقارنوا بنفس الدالة |
| `api/src/modules/platform-administration/users/users.service.self-assignment.spec.ts` | 4 اختبارات، منهم اختبار الحروف الكبيرة |
| `api/src/modules/platform-administration/users/users.no-role.spec.ts` | 6 اختبارات، منهم حارس N+1 واتنين على `controller.me()` |
| `api/src/modules/platform-administration/roles/roles.service.system-role.spec.ts` | **حارس** مشتق من `PATH_METADATA`/`METHOD_METADATA` بتوع Nest. 7 اختبارات |

### معدَّلة

| الملف | التغيير |
|---|---|
| `api/src/app.module.ts` | سطران: استيراد `MeModule` وتسجيله |
| `api/src/modules/platform-administration/users/users.controller.ts` | `isSelf` بقت مستوردة بدل معرَّفة؛ `findAll` بينادي `toResponses`، والمسارات المفردة بتنادي `toResponseFor` |
| `api/src/modules/platform-administration/users/users.service.ts` | رفض `selfAssignment` أول سطر في `assignRoles`؛ و`toResponse(user, liveRoleIds)` + `toResponses` + `toResponseFor` + `liveRoleIds` الـprivate |
| `api/src/modules/platform-administration/users/dto/user-response.dto.ts` | `hasNoRole: boolean` مشتق |
| `users.service.spec.ts` · `users.service.lifecycle.spec.ts` · `users.service.last-super-admin.spec.ts` | سطر mock واحد لكل ملف: `findAll: jest.fn(async () => [])` |
| `users.controller.spec.ts` | سطر واحد: `toResponse` → `toResponseFor` في الـmock |
| `scripts/test-guards.mjs` | `'role-template-matrix'` انضم للطبقة الأساسية |
| `docs/engineering/guard-tests.md` | الحارس الجديد في الكتالوج؛ والمجاميع اتصلحت (17+10+27=54، و11 أساسية) |
| `api/openapi.json` | مولَّد — **محتاج توليدة أخيرة، شوف §8** |

**ولا assertion واحدة اتغيرت في الأربع ملفات اختبار الموجودة** — متأكَّد بمراجعة مستقلة. التعديل mocks بس.

**مفيش ولا ملف اتلمس برا `api/` و`docs/` و`scripts/test-guards.mjs`.** التغييرات في `apps/web/` و`docs/design-specs/header/` كلها شغل جلسة الهيدر، ومتأكَّد إنها مش مننا.

**مفيش أمر Git بيغيّر حاجة اتشغّل. مفيش سكريبت اتشغّل على قاعدة البيانات. مفيش dependency جديدة. مفيش تغيير schema.**

---

## 3. الاختبارات

| الحزمة | النتيجة |
|---|---|
| `roles.service.system-role` | 7/7 |
| `roles.service` (كلها) | 61/61 في 6 حزم |
| `me.controller` · `account-class` | 18/18 في حزمتين |
| `users.service.self-assignment` | 4/4 |
| `users.no-role` | 6/6 |
| `platform-administration/users` (كلها) | 115/115 في 13 حزمة |
| `role-template-matrix` | 19/19 |
| `npx tsc --noEmit` | نضيف |
| **`test:guards:core`** | **11 حزمة · 109 اختبار · exit 0** |
| **`test:guards` — API** | **17 حزمة · 257 اختبار · كلهم ناجحين** |
| **`test:guards` — الداشبورد** | **10 ملفات · 103 اختبار · كلهم ناجحين** |
| **`test:guards` — الموقع** | 25 من 27 · 395 من 397 — **فشلان، الاتنين من جلسة الهيدر** (تحت) |

### 3أ — الحُرّاس الكاملين: الفشلان مش من الدفعة دي

اتشغّلوا والخدمات مقفولة (البورتات 3000/3001/3002 فاضية، وعمليات `node` الوحيدة هي أدوات الجلسة). المدة 143 ثانية، وكود الخروج 1.

| الحارس | المخالف | صاحبه |
|---|---|---|
| `interaction-state-contract` — «عنصر بيستجيب للـhover ياخد حالة ضغط كمان» | `apps/web/src/components/layout/mega/mega-link.tsx:34` | جلسة الهيدر — `mega/` مجلد untracked بتاعهم |
| `surface-standard` — «مابيحرّكش حاجة بتفرض layout» | `apps/web/src/styles/motion.css:686` — `transition: inset-inline-start …` | جلسة الهيدر — الملف معدَّل عندهم من قبل ما الدفعة دي تبدأ |

الدفعة دي **ماتلمستش ولا ملف في `apps/`**. والتاني منهم عيب أداء حقيقي مش مخالفة شكلية: تحريك `inset-inline-start` بيفرض تخطيطًا في كل إطار.

**وملاحظة على خط الأساس:** الدفعة 2 سجّلت فشلًا واحدًا سابقًا في الموقع (خمس routes تنقّل بلا صفحات) — الفشل ده **مابقاش موجود**. الفشلان الحاليان جديدان ومن جلسة الهيدر.

**وملاحظة على طريقة القياس:** أول تشغيلة رجعت `exit 0` وهي فاشلة، لأن الأمر كان خلف `| tail` فكود الخروج بقى بتاع `tail`. اتقروا الناتج بدل الاعتماد على كود الخروج، واتعاد التشغيل بناتج كامل. نفس فصيلة العيب اللي الدفعة 2 سجّلتها عن حُرّاس بتعدّي وهي مابتأكّدش على حاجة.

**خط الأساس المقيس كان 10 حزم · 90 اختبار** — مش 88 زي ما خطتي كتبت. أثبتّ إن 88 قديم وإن الفرق مش من شغل الجلسة: **ولا واحد من الحُرّاس العشرة بيولّد حالات اختبار من ملفات على القرص** (الـ`.each` الوحيد في `super-admin-only.spec.ts` وبيمرّ على أزواج من `CAPABILITY_MAP` في الذاكرة)، وكل ملفات الحُرّاس غير معدَّلة عن `HEAD`. فالعدد ثابت بملفات الاختبار نفسها. تفسيران رجعوا لي من المنفّذين — «جلسة تانية زوّدت اختبارات» و«الـcontroller الجديد ولّد حالات» — **الاتنين غلط**.

الحساب النهائي: 90 (الأساس) + 18 (الحارس الجديد) + 1 (اختبار الغيابات العام) = **109**.

### الاختبارات السلبية

- تعيين أدوار لنفسك يترفض **بإملاء بحروف كبيرة** لنفس الـid — ودي اللي بتفشل قدام `===` وتنجح قدام `isSelf`.
- Super Admin شايل الكتالوج كله يترفض على حسابه هو.
- الرفض بيحصل **قبل أي قراءة** (`assertAssignable` و`updateById` مااتنادوش).
- `GET /me/permissions` **مابيناديش** `resolvePermissions` ولا `resolvePermissionsForRoles` — بيقرا المجموعة اللي الحارس حلّها للطلب ده.
- المسار **مابيقراش عن أي حساب تاني** (`usersService.findById` و`usersRepository.findById` مااتنادوش).
- كل route كتابة في `roles.controller.ts` بيرفض دور أساسي، ونفس الـroutes بتنجح على دور عادي حيّ.
- مفيش قالب فيه زوج `superAdminOnly`، ولا `PermanentDelete`، ولا فعل مكتوب في غياباته.
- مفيش قالب يقدر يغيّر موردًا مايقدرش يقراه.

### الطفرات اللي اتنفّذت فعليًا (مش تحليل)

13 طفرة، وكل ملف رجع بالظبط (متأكَّد بـsha256 قبل وبعد):

| الطفرة | النتيجة |
|---|---|
| `id === actor.userId` بدل `isSelf` | **احمرّت** |
| فحص الذات بعد `assertAssignable` بدل قبله | **احمرّت** |
| `hasNoRole = roleIds.length === 0` | **احمرّت** |
| mapper بلوكاب لكل صف | **احمرّت** (1 → 3 نداءات) |
| `accountClassFor(perms, false)` ثابت | **احمرّت** |
| `accountClassFor([], holdsSystemRole)` | **احمرّت** |
| `.every` بدل `.some` | **احمرّت** (اختباران) |
| زوج `superAdminOnly` في قالب | **احمرّت** |
| `PermanentDelete` في قالب | **احمرّت** |
| قالب بمنحة فاضية | **احمرّت** |
| `scope: 'all'` على مورد بلا نطاقات | **احمرّت** |
| قالب غير متماسك (بلا `Read`) | **احمرّت** |
| `editor` ياخد `Publish` | **احمرّت** |

**قيد معروف على TDD، مسجَّل بأمانة:** اختبار المساواة في حارس الأدوار الأساسية **مايقدرش يبقى أحمر جوّا المستودع** على الـcontroller الحالي، لأنه مفيهوش decorator بأقواس متداخلة. الأحمر اتثبت في مجلد مؤقت بس — على controller فيه `@UseInterceptors(FileInterceptor('x'))` و`@SetMetadata(...)`، الاشتقاق القديم طلّع handler واحد من أربعة والجديد طلّع الأربعة.

---

## 4. الـendpoints

| Method | المسار | الصلاحية | عام؟ | الحالة |
|---|---|---|---|---|
| GET | `/me/permissions` | **بلا صلاحية**، موثّق الهوية بس | لا | **جديد** |
| GET | `/users` | `users:Read` (محفوظة) | لا | الرد كسب `hasNoRole` |
| GET | `/users/me` | بلا صلاحية، موثّق الهوية | لا | الرد كسب `hasNoRole` (`MeResponseDto extends UserResponseDto`) |
| GET | `/users/:id` · POST `/users` · PATCH `/users/:id/roles` · PATCH `/users/:id/status` · PATCH `/users/me/preferences` | كما هي | لا | الرد كسب `hasNoRole` |

**`GET /me/permissions` مابيلغيش `GET /users/me`.** الأخير بيرجّع `permissions` خلاص، بس عن طريق `GrantDto` اللي **مافيهوش `scope`** (`me-response.dto.ts:8-11`). الجديد بيضيف النطاقات ونوع الحساب. التداخل مسجَّل، والمسارين الاتنين فضلوا — شيل مسار شغال مكانش مطلوبًا.

---

## 5. مصفوفة القوالب، وترتيب السكريبتات

### المصفوفة كما بُنيت

`R`=Read · `C`=Create · `U`=Update · `A`=Archive · `Rs`=Restore · `Pb`=Publish · `Ap`=Approve · `VR`=ViewReports · `E`=Export · `P`=Print

| # | المفتاح | القالب | المنح | النطاق | الغيابات المتحقَّق منها |
|---|---|---|---|---|---|
| 1 | `content-manager` | مسؤول المحتوى | `R C U A Rs` على `articles`/`albums`/`videos`/`heroSlides` (بنطاق `all`) وعلى `mediaAssets`/`pages`/`pageSections`/`navigationItems`/`navigationMenus`؛ `VR E P` على `commsReports`/`mediaReports`/`cmsReports` | `all` حيث تُقدَّم | `Pb` · `Ap` · `ViewSensitive` · `PermanentDelete` |
| 2 | `editor` | محرر | `R C U A` على `articles` و`albums` — **`videos` مستبعد** | **`own`** | `Pb` · `Rs` · `Ap` · `VR` · `E` · `P` · `ViewSensitive` |
| 3 | `reviewer-approver` | مراجع ومعتمد | `R` على التسعة أنواع القابلة للنشر؛ `workflowInstances:Approve`؛ `R` على `workflowInstances`/`revisions`/`workflowActionHistory` | — | كل `C`/`U`/`A` على المحتوى · `Pb` · كل منح المجموعات |
| 4 | `sports-data-officer` | مسؤول البيانات الرياضية | `R C U A Rs` على `athletes`/`athleteProfiles`/`coaches`/`officials`/`officialProfiles`/`clubs`/`clubTeams`/`disciplines`/`ageCategories`/`venues`/`countries` وموارد التاريخ الخمسة؛ `VR E P` على `peopleReports`/`athleticsReports` | — | `Pb` · `Ap` · `PermanentDelete` · **`ViewSensitive`** |
| 5 | `governance-officer` | مسؤول الحوكمة | `R C U A Rs` على `committees`/`federationPersonnel`/`federationAppointments`/`electionCycles`/`governanceDocuments`/`documents`/`organizationalStructure`/`presidentMessagePage`/`strategicPlansPage`/`visionMissionPage`، و`R U A Rs` على `aboutFederationPage`؛ `Pb` على التمن موارد اللي بتقدّمه؛ `VR E P` على `governanceReports`/`documentsReports` | — | **`PermanentDelete`** · `Ap` |
| 6 | `executive-viewer` | مشاهد الإدارة العليا | `VR` على التسع موارد تقارير | — | كل كتابة · `E` · `P` · `ViewSensitive` |

**تسعة موارد تقارير، مش عشرة** — مفيش مورد تقارير لـ`platform-administration`، وده مطابق حرفيًا لـ«كل المجموعات ماعدا المستخدمون والوصول». الـspec §5 بيقول «عشرة» وهو متعفّن (الدفعة 2، D8).

**`aboutFederationPage` مالهاش `Create`** في الخريطة — الحارس مسك ده وأنا كنت كاتبها غلط.

**`federationPersonnel` و`federationAppointments` و`electionCycles` مالهمش `Publish`** في الخريطة، فاتسابوا منه.

**النطاقات معلنة على أربعة موارد بس** — `articles` و`albums` و`videos` و`heroSlides` — وكل منحة تانية `scope: null`.

### ترتيب السكريبتات

المطلوب: **7b `report-reserved-pair-holders` ← E1 `reset-roles` ← E2 `seed-role-templates`**.

**الـspec §12 مرتَّب بالفعل كده** (`7b` ثم `8 reset-roles` ثم `9 seed-role-templates`) — خطتي كانت بتقول إنه محتاج إصلاح وده كان غلط. اللي ناقص هو الأسماء: `(E1)` و`(E2)` جنب الخطوتين وسطر سبب لكل واحدة. **متعملش لسه**، لأن السكريبتين نفسهم مش متبنيين.

---

## 6. نتيجة قياس الـids — للعرض، ومفيش تغيير

**تصحيح لفرضية في البرومبت:** المستند الخام من Mongoose **مابيرجّعش `id` أصلًا** — مفيش `virtuals: true` ولا `toJSON` متضبطين في أي schema، ولا serializer عام.

**491 endpoint في 74 controller:**

| الفصيلة | العدد |
|---|--:|
| `_id` بس | 370 |
| `id` بس (DTO أو mapper) | 47 |
| **الاتنين** | **1** — `GET /revisions/:id` |
| بلا معرّف | 73 |

القاعدة: العام بـ`id`، والإدارة بـ`_id`. والاستثناء: `users` و`permissions` بقوا `id` في الإدارة كمان.

**الاستهلاك:** الداشبورد بيقرا `._id` في 118 موضع (41 ملف)، والموقع في 5 (كلهم عناصر About المتداخلة، وكلهم صح). 8 مواضع فيها fallback بين الإملاءين، واحد منهم فرعه ميت. باقي قراءات `_id` على endpoints بترجّع `_id` فعلًا.

**التعارض الوحيد المكسور** هو `permissions` — مشروح في §1.

### التخزين: `Mixed` هي القاعدة مش الاستثناء

**364 من 365 مسار `ObjectId` بيطلعوا `Mixed`** وقت التشغيل (مقيس offline، بلا قاعدة بيانات). الوحيد السليم `LiveStream.thumbnailId`، وهو الوحيد المعلن `MongooseSchema.Types.ObjectId` بدل `Types.ObjectId`.

**السبب الجذري، محدَّد لأول مرة:** في `@nestjs/mongoose` 12.0.0، `inspectTypeDefinition` بيعامل كلاس `ObjectId` بتاع bson كأنه nested class، فبيبني له schema فاضي `{}` والنتيجة `Mixed`. Mongoose 9.9.4 لوحده بيدّي `ObjectId` صح.

**الأثر مقيس:** `athletes.service.ts:37` بيعمل cast يدوي وقت الإنشاء فبيتخزّن `ObjectId`؛ و`:113` بيمرّر `partialUpdate(dto)` خام فـ`nationalityId` بيتخزّن **String**. نفس النمط في `club-teams` و`athlete-coach-history`، و**16 موضع** إجمالًا (3 اتأكدوا واحدًا واحدًا). والفلاتر مابيحصلهاش cast كمان.

ده بيقفل سؤال الدفعة 2 رقم 2 بالكامل. الإصلاح المقترح — `Types.ObjectId` → `MongooseSchema.Types.ObjectId` في الـ146 موضع + سكريبت idempotent يحوّل المراجع المخزّنة كنص — **تغيير schema، محتاج قرار، وبرا الدفعة دي**.

**حدود القياس:** الـschemas اتقيست من `dist` المبني 2026-09-28 الساعة 14:05، مش من `src` مباشرة؛ الـroutes من `src`.

---

## 7. القرارات اللي أخدتها لوحدي

| القرار | السبب | لو غلط |
|---|---|---|
| `GET /me/permissions` في controller منفصل | `users.controller.ts` فيه `@Get(':id')`، وأي مسار شقيق هناك على بُعد إعادة ترتيب واحدة من إنه يتبلع | نقل ملف |
| المسار يقرا `actor.permissions` مش استعلام تاني | القرار متسجّل في `users.controller.ts:76-78`: «no chance of disagreeing with the answer the guards will give on the very next call» | — |
| `GET /users/me` فضل بـ`permissions` بلا نطاق | شيل مسار شغال مكانش مطلوبًا؛ التداخل متسجَّل | سطر واحد |
| «الحساب الحساس» اتنفّذ من §7.2 **حرفيًا** بالخمسة أفعال | تضييق تعريف أمني لأن فعل منه غير قابل للوصول دلوقتي = تضييق صامت | — |
| اسم النوع `standard` مش `ordinary` | برومبتك §3.د بيسمّيه `standard` صراحةً، والـspec بيوصفه `ordinary`. البرومبت أعلى (§1 بند 1) | سطر واحد + الـDTO |
| `hasNoRole` مشتق، بلا حقل مخزَّن | علامة مخزّنة بتبقى قديمة أول ما دور يتأرشف | — |
| `toResponse` فضلت synchronous، ومعاها `toResponses`/`toResponseFor` | بتتنادى من 5 مواضع، وتحويلها `async` بيتسلسل عليهم بلا فايدة | — |
| `isSelf` اتنقلت لملف بدل ما تتكرر | مقارنة واحدة للطبقتين | — |
| حارس الأدوار الأساسية من metadata بتاع Nest مش من نص الملف | مصدر مستقل، ومابيتأثرش بشكل الـdecorators | — |
| اسم `role-template-matrix.spec.ts` | `role-templates` كان هيلقط `seed-role-templates.spec.ts` (محتاج قاعدة بيانات) في الطبقة الأساسية | إعادة تسمية |
| مرجع `See ADR-0108 D1` بدل `ADR-0104` لتعريف الحساسية | متأكَّد: ADR-0108 §D1 بيعرّف الخمسة أفعال بالحرف؛ ADR-0104 بيحجز اتنين منهم بس | سطر واحد |
| «الأنواع القابلة للمراجعة» = `PUBLICATION_ENTITY_TYPES` ناقص `staticPages` و`externalMediaCoverage` و`publicEvents` | التلاتة مالهمش موارد صلاحيات؛ الباقي تسعة، ومتسق مع «9 publication-eligible» في ADR-0106 والـspec §4.1 | سطور في المصفوفة |
| `deliberatelyAbsent` نوعه `PermissionAction[]` | غلطة إملائية بتتمسك وقت الترجمة (متأكَّد: `TS2820`) بدل ما تعدّي بصمت | — |

---

## 8. عيوب لقيتها ومتصلحتش

| # | العيب | الخطورة | المالك |
|--:|---|---|---|
| B1 | **مصفوفة صلاحيات الأدوار في الداشبورد مكسورة على `main`** — §1 | **Critical** | جلسة الداشبورد / قرارك |
| B2 | **364 مسار `ObjectId` بيطلعوا `Mixed`**، والمراجع بتتخزّن String من PATCH وObjectId من create | **Important** | قرارك — تغيير schema |
| B3 | `RolesService.isSystemRole` بيقرا الأدوار المؤرشفة (`findByIdIncludingArchived`)، فدور نظام مؤرشف في التوكن بيخلّي الحساب `superAdmin` وصلاحياته فاضية. الاتجاه آمن (الجهاز مايتوثقش أبدًا)، ومفيش مسار بيأرشف دور نظام | Minor | الدفعة 5 (الجلسات) |
| B4 | تعليقات في `users.controller.ts` و`users.service.ts` و`roles.controller.ts` بتحكي تاريخ وبتشاور على مراجعات («independent review, round 4, I6» · «auth-security-audit-2026-09-05.md P0 #2»). سابقة للدفعة | Minor | الدفعة 9 |
| B5 | `runApiGuards` في `scripts/test-guards.mjs` بيشغّل Jest **بدون `--runInBand`** — وده هنا بيخلي حزم قاعدة البيانات تفشل عشوائيًا | Important | الدفعة 9 |
| B6 | الحارس `super-admin-only` موصوف بـ«تمانية» أزواج في `test-guards.mjs` وفي `guard-tests.md`، وهم **عشرة** | Minor | الدفعة 9 |
| B7 | رأس `test-guards.mjs` بيشاور على `docs/engineering/GUARD-TESTS.md` والملف اسمه `guard-tests.md` — على filesystem حسّاس لحالة الحروف المرجع مكسور | Minor | الدفعة 9 |
| B8 | `refusal-codes.spec.ts:127` لسه بيعمل mock لـ`toResponse` اللي الـcontroller مابقاش بيناديه. mock ميت، بلا أثر على أي اختبار | Minor | الدفعة 9 |
| B9 | `toResponseFor` بيقرا **كل** الأدوار الحية بمستنداتها الكاملة عشان حساب واحد، مع كل `GET /users/me`. `findByIds` أو projection كان يكفي | Minor | الدفعة 9 |
| B10 | `api/openapi.json` اتولّد وملفات `me/` كانت في نص التعديل. **محتاج توليدة أخيرة على الشجرة الكاملة قبل الـcommit** — نفس درس الدفعة 2 (312 → 339 → 340) | — | **قبل الـcommit** |
| B11 | معلومة اتشالت من تعليق: إن نطاق `own` معلَن ومفيش service بتطبّقه على مستوى الصف. اتشالت مع تعليقات «Pending owner decision» الممنوعة. **محفوظة هنا وفي س3** | — | س3 |
| B12 | تعليق قالب الحوكمة (`// Governance records and the pages that present them.`) صياغة المنفّذ، مش سبب فني موثَّق — قائمة الموارد مش مطابقة لمجموعة `federation-governance` في الخريطة | Minor | س7 |
| B13 | جدول الزمن في `guard-tests.md` لسه بيقول 11.2 و32.1 ثانية، وهي قياسات من أيام 9 حُرّاس. القياس الحالي 12.6 ثانية ماتسجّلش | Minor | الدفعة 9 |

### تعارضان بين وثائق معتمدة — للتبليغ، مش للحل هنا

**T1 — `workflowInstances:Approve`.**
- ADR-0106 (Consequences): «The four review routes **keep** `workflowInstances:Approve` as the coarse gate and gain the per-type check beneath it.»
- الـspec سطر 536: «`workflowInstances:Approve` **leaves the catalogue**».

دول متناقضين حرفيًا. برومبتك (§3.ج، الأولوية الأولى) بيقول «هيتبدل»، فكتبت المصفوفة على كده — **بس التعليق في الكود اتصيغ بحيث مايدّعيش على الـADR حاجة مش فيه**: `// The current approval gate; its per-type scoping (See ADR-0106) is not built.` التعارض بيحدد هل القالب التالت هيفضل ماسك الزوج ده بعد الدفعة 4.

**T2 — `ViewSensitive` في قالب البيانات الرياضية.**
- ADR-0113 (Decision): «Sports Data Officer (with `ViewSensitive` on athletes)».
- برومبتك §3.ج: «بدون `ViewSensitive`، لأن أزواجها مش في الـcapability map لحد الدفعة 6a».

برومبتك أعلى، فاتكتب بدونها والسبب الفني في تعليق. **ADR-0113 متعفّن في النقطة دي ومحتاج تعديل مؤرَّخ.**

---

## 9. أسئلة محتاجة قرارك

كل واحدة ليها قيمة افتراضية آمنة وقابلة للرجوع. **مفيش حاجة اتبنت على تخمين.**

### س1 — نقل خطوات الموافقة في E1 بيتعارض مع قرار معتمد

`assigneeIds` بتخص **التعريف** مش النسخة (`workflow-step.schema.ts:20,32`)، فتعديلها بيغيّر **كل نسخ التعريف، دلوقتي وفي المستقبل**. وده سبب إيقاف التفويض (`workflow-instances.service.ts:14-21`)، وسبب تصنيفه OUT-02 بدرجة P1 في مراجعة سلامة الـworkflow، وسبب رفض ADR-0106 للبديل (E).

وفيه أثر تاني: لو اتنين معيَّنين اتبدّلوا بنفس الـSuper Admin وحصل dedupe، عدد المعيَّنين يقل عن `requiredApprovals` (`workflow-step.schema.ts:35`) والخطوة تقف للأبد.

1. **ننقل** وننبّه بمدى التأثير، ونعدّل ADR-0106 بسطر مؤرَّخ. التكلفة: الـSuper Admin بيبقى معيَّنًا دائمًا لكل نسخ التعريف الجاية.
2. **نبلّغ عن الخطوات المتأثرة ومنغيّرش حاجة.** التكلفة: المالك بينقل بإيده من التقرير.
3. **نأجّل** لحد ما يبقى فيه حقل على مستوى النسخة. التكلفة: schema change، دفعة تانية.

**توصيتي: 2.** بتدّي المعلومة كاملة، مفيش حاجة ماتتراجعش، ومابتحطّش سكريبت فوق ملاحظة P1 وADR بيقولوا العكس. **الافتراضي: 2**، ومثبَّت باختبار سلبي بيقول «مفيش workflow step اتغيّر».

### س2 — هل E1 يفصل الأدوار المؤرشفة عن الحسابات؟

`RolesService.remove` بيفصل على كل أرشفة (`roles.service.ts:201` → `role-assignments.repository.ts:37`)، و`report-reserved-pair-holders.ts:67-69` مكتوب فيه بنصه إن الدور بيفضل مسمّي حامليه «**لحد ما `reset-roles` يمسحهم**».

1. **يفصل**، مطابقة للـAPI وللتعليق ده.
2. **يسيب `roleIds`**. التكلفة: بتشاور على أدوار مؤرشفة، واسترجاع الحساب بيرجّع دورًا ميتًا — نفس الخطر اللي تعليق `detachRole` بيسمّيه.

**توصيتي: 1.** التباين في (2) معنى تاني لـ«دور مؤرشف» مفيش حاجة تانية في الكود بتعرفه. **الافتراضي: 1**، والتقرير بيسمّي كل حساب ودور عشان الربط يفضل قابل لإعادة البناء.

### س3 — صف النطاق `own` (سؤال الدفعة 2، لسه مفتوح) وبيمنع زرع قالب «محرر»

`PERMISSION_CATALOGUE` بيطلّع صفًا واحدًا لكل `(مورد، فعل)` **ومافيهوش حقل `scope` أصلًا** (`permission-catalogue.ts:23-30`)؛ القيمة `null` جاية من الـdefault في الـschema. وفلتر `seedPermissions` مافيهوش `scope` (`seed-admin.ts:130`)، فصف تاني هيطابق صفّين عشوائيًا.

**وأخطر من كده، ولقيته في الدفعة دي: `own` مش مطبَّق في ولا service.** مفيش أي فحص ملكية على مستوى الصف، و`publishing.service.ts` بيتجاهل النطاق (سؤال الدفعة 2 رقم 2، لسه مفتوح). فقالب `own` هيتقرا ضيّقًا **ويتصرّف كـ`all`**.

1. **نضيف الصفوف والفلتر** في الدفعة دي.
2. **نزرع الخمسة ونرفض «محرر»** ونسمّي السبب في تقرير السكريبت.
3. **نزرعه بـ`all`** — **مرفوض**: ده التوسيع الصامت اللي ADR-0113 رفض البديل (أ) عشانه.

**توصيتي: 2 دلوقتي، و1 في الدفعة اللي هتبني الفحص على مستوى الصف** — صف بنطاق ومفيش service بتقراه هو منحة بتكدب. **الافتراضي: 2 — يعني 5 قوالب من 6.**

### س4 — إزاي القالب يتطابق عند إعادة التشغيل؟

`Role` مافيهوش حقل مفتاح، و`BaseSchema` فيه حقول التدقيق والأرشفة بس، وMongoose في وضع strict بيسقّط أي حقل غير معرَّف بصمت. يعني «نخزّن مفتاحًا ثابتًا» **هو نفسه تغيير schema** — وده §7 عندك: يُعرض ولا يُنفَّذ.

1. **نضيف `templateKey`** للـschema. محتاج موافقتك.
2. **نطابق على `name.en`**، زي ما `seedSuperAdminRole` بيعمل. التكلفة: أدمن بيعيد تسمية قالب بيخلي التشغيلة الجاية تزرع نسخة تانية، وقالب ممسوح بيرجع.

**توصيتي: 2**، مقصورًا على `isSystemRole: false`، والرجوع بعد الحذف موثَّق كسلوك سكريبت **زرع**. **الافتراضي: 2**، ومثبَّت باختبار: دور قديم مؤرشف اسمه `Editor` مايتحسبش القالب.

### س6 — `videos:Update` هو كمان طريقة نشر الفيديو

`capability-map.ts:634-636`: «`Update` is also how a video is PUBLISHED, since the API creates every one as a draft». والقالب التاني معرَّف «بدون نشر».

1. **نستبعد `videos`** من القالب التاني. 2. **نقبله** ونسجّل الاستثناء.
**توصيتي: 1** — الغياب المعلن على القالب لازم يبقى صحيح. **الافتراضي: 1**، والسبب في تعليق سطر واحد.

### س7 — قائمة موارد قالب الحوكمة

الـspec §5 بيقول «the governance pages»، ودي مش قائمة. اللي اتكتب في §5 فوق هو الافتراضي. الموارد اللي في المجموعة ومش مذكورة: `boardMembersPage` و`committeesPage` و`contactUsPage` (عندهم `Update`/`Publish` بس) و`federation`. **محتاج قائمة صريحة منك.**

### س8 — «ماعدا المستخدمون والوصول» بتستبعد إيه بالظبط للقالب السادس؟

تسع موارد تقارير ومفيش واحد لـ`platform-administration` — مطابق للعبارة بقراءة **مجموعة المنتج**. بس مجموعة «المستخدمون والوصول» في الداشبورد فيها كمان سياسات الموافقة (`apps/dashboard/src/lib/navigation.ts:188-199`، قراءة فقط)، وتقاريرها `workflowReports`. **الافتراضي: التسعة كلها.**

### س9 (جديد) — تعارضان بين وثائق معتمدة

T1 و T2 في §8. الاتنين محسومين للتنفيذ ببرومبتك، **بس الوثيقتين لسه متناقضتين وهيتقرأوا في دفعات جاية.** ADR-0106 و ADR-0113 محتاجين تعديلات مؤرَّخة.

---

## 9أ. قرارات المالك — الرسالة الأولى (2026-09-28)

أربعة قرارات وصلت واتنفّذوا. **Task 6 و Task 8 لسه واقفين** لحد الرسالة التانية.

| السؤال | القرار | الحالة |
|---|---|---|
| **س2** | E1 يفصل الأدوار المؤرشفة عن الحسابات، زي `RolesService.remove`. صف تدقيق لكل حساب اتفصل عنه دور (الحساب، الدور، السبب `reset-roles`)، والتقرير بيسمّي كل حساب ودوره، واختبار سلبي إن دور Super Admin وحامليه مابيتلمسوش | **مسجَّل، مش منفَّذ** — Task 6 واقفة على س1 |
| **س5** | التعريف يفضل بالخمسة أفعال **ومعاهم `ViewAuditLog`** — سجل التدقيق فيه الأحداث الأمنية وبيانات الفاعلين | ✅ منفَّذ |
| **س6** | `videos` تطلع من قالب «محرر»، وكل مورد فيه `Update` بينشر أو `Archive` بيوصل لمنشور يطلع | ✅ منفَّذ — بقراءة موضّحة تحت |
| **س8** | قالب «مشاهد الإدارة العليا» ياخد `ViewReports` على **تمنية** بس، و`workflowReports` برا | ✅ منفَّذ |

### الأزواج النهائية اللي بتخلي الحساب `sensitive`

حساب مش شايل دور نظام بيبقى `sensitive` لو شايل أي زوج فعله واحد من **الستة** دول، على أي مورد وبأي نطاق:

`ManageRoles` · `AssignRoles` · `ViewSensitive` · `Export` · `PermanentDelete` · **`ViewAuditLog`**

والدور النظامي بيطلّع `superAdmin` قبل أي فحص. الستة مكتوبين **كقيم حرفية** في `account-class.spec.ts`، فتضييق التعريف بيبقى اختبارًا أحمر.

**الأحمر قبل التنفيذ مقيس:** `2 failed, 10 passed` — الاختباران اللي وقعوا هما اللي على `ViewAuditLog`، والاتنين `Expected: "sensitive" / Received: "standard"`.

### س6 — اللي اتشال من قالب «محرر»، وسببه

| اللي اتشال | السبب المقيس |
|---|---|
| `videos` (المورد) | `capability-map.ts:634-636`: «`Update` is also how a video is PUBLISHED» — المورد مالوش `Publish` منفصل، فالتعديل نفسه هو النشر |
| **`Archive`** (الفعل، على `articles` و`albums`) | `articles.service.ts:340` و`albums.service.ts:406` بيأرشفوا بـ`softDelete` **بلا أي فحص لحالة النشر**، ومفيش فحص زيه في أي service في المشروع. فصاحب `Archive` بيقدر يسحب محتوى منشورًا وحيًّا من الموقع العام |

القالب بقى: `Read Create Update` على `articles` و`albums` بنطاق `own`.

**⚠️ قراءة موضّحة، ومحتاجة تأكيدك.** نص القرار «أي مورد … يطلع من القالب». القراءة الحرفية بتشيل `articles` و`albums` الاتنين — فالقالب يبقى **فاضي**، والاختبار «كل قالب فيه منحة واحدة على الأقل» يفشل. فشلت **الفعل** `Archive` بدل الموردين: نفس الخاصية الأمنية (محرر مايقدرش يسحب منشورًا)، وقالب لسه صالح. **سطر واحد يرجّعه للقراءة الحرفية.**

**وفيه ربط بـس3:** الـspec §2.4 كان مصمِّم إن `own` نفسه يمنع الوصول للمنشور («never been published»). المشكلة قايمة **لأن `own` بلا تطبيق** — فإجابتك على س3 ممكن تغيّر الحساب ده.

### التعديلات المؤرَّخة على الوثائق

| الوثيقة | التعديل |
|---|---|
| `ADR-0108` §D1 | `ViewAuditLog` انضمت للتعريف، فبقوا ستة، مع السبب |
| `ADR-0113` | صف مؤرَّخ 2026-09-28: قالب البيانات الرياضية بلا `ViewSensitive` (وسببه الفني: الزوج مش في الكتالوج فالزرع كان هيرفض التشغيلة كلها) وبتنضم في 6a؛ وقالب مشاهد الإدارة العليا **تمنية** مش «everywhere». **سطر «Open workflow steps … routed to the admin» ماتلمسش** — مفتوح ضد البديل (E) المرفوض في ADR-0106، ومستني س1 |
| `ADR-0106` | صف مؤرَّخ 2026-09-28: `workflowInstances:Approve` **بيخرج** من الكتالوج في الدفعة 4 (بيعكس صف Consequences ويطابق الـspec)، بالشرطين: مايتشالش إلا بعد ما كل مسار مراجعة ياخد فحص النوع ومعاه اختبار سلبي؛ وحارس بيفشل لو أي route لسه بيستخدمه |
| الـspec §4.1 | عدد مسارات المراجعة اتصحّح |

**عدّ مسارات المراجعة — وفرضية «وثيقة رقمها غلط» مش دقيقة.** **أربعة** routes بتحمل الزوج (`workflow-instances.controller.ts:73-130`): `approve` · `reject` · `return` · `delegate`. و`delegate` **بيرفض كل طلب** لأن `DELEGATION_ENABLED = false` (`workflow-instances.service.ts:21,391`).

فالوثيقتان بيعدّوا حاجتين مختلفتين: ADR-0106 بيعدّ الـdecorators (أربعة، **وده صح**)، والـspec بيعدّ الأفعال القابلة للوصول (تلاتة). اللي كان غلط هو **صياغة الـspec**، لأنه قال «التلات مسارات بتحرسه **بديكوريتور**» وأربعة بيحرسوه. الـspec بقى يقول الرقمين مع بعض.

### ملفات الرسالة دي

| الملف | التغيير |
|---|---|
| `api/src/modules/platform-administration/me/account-class.ts` | `ViewAuditLog` انضمت لـ`SENSITIVE_ACTIONS` |
| `api/src/modules/platform-administration/me/account-class.spec.ts` | `ViewAuditLog` في القائمة الحرفية + اختباران؛ واسم اختبار «spec §7.2, verbatim» اتصحّح لأن الفعل السادس قرار مالك مش نص §7.2 |
| `api/src/common/authz/role-templates.ts` | `workflowReports` طلعت من القالب السادس؛ `Archive` طلعت من قالب المحرر وانضمت لـ`deliberatelyAbsent`؛ ووصف القالب السادس اتصحّح لأنه بقى بيدّعي «كل المجموعات» وهو تمنية |
| `api/src/common/authz/role-template-matrix.spec.ts` | 4 اختبارات: `editor`×`Archive` في قائمة الغيابات؛ التمن موارد بالاسم؛ المشاهد مالوش زوج على `workflowReports`؛ منح المحرر بالظبط |
| `docs/design-system/ADR-0108-...md` · `ADR-0113-...md` · `ADR-0106-...md` | تعديلات مؤرَّخة |
| `docs/superpowers/specs/2026-09-26-authz-authn-design.md` | عدد مسارات المراجعة |
| `docs/engineering/guard-tests.md` | صف الحارس كسب الحراستين الجديدتين |

### الأرقام

| الحزمة | قبل | بعد |
|---|---|---|
| `role-template-matrix` | 19 | **23** |
| `account-class` | 9 | **12** |
| `npx tsc --noEmit` | — | exit 0 |
| **`test:guards:core`** | 11 حزمة · 109 | **11 حزمة · 113 · exit 0** |

### عيوب اتسجّلت في الرسالة دي ومتصلحتش

| # | العيب | الخطورة | المالك |
|--:|---|---|---|
| B14 | `capability-map.ts` فيه تعليقات بتحكي تاريخ الكود وبتشاور على مراجعات («Independent review, round 4 (I5)» متكررة 9 مرات من سطر 730 تقريبًا) | Minor | الدفعة 9 |
| B15 | الاختبار اللي كان المفروض موجود في قرار س8 **مكانش موجود** — مفيش اختبار كان بيتأكد إن القالب السادس بياخد كل موارد التقارير. اتكتب جديد | — | مقفول |

---

## 9ب. قرارات المالك — الرسالة التانية (2026-09-28)

كل الأسئلة اتقفلت. **Tasks 6 و7 و8 اكتملوا.**

| السؤال | القرار | الحالة |
|---|---|---|
| **س1** | E1 **مايعدّلش أي خطوة موافقة**. بيبلّغ عنها بس: التعريف، والخطوة، والمعيّنين، وعدد النسخ المفتوحة، ويعلّم المستحيل إكمالها | ✅ |
| **س2** | E1 يفصل الأدوار المؤرشفة، صف تدقيق لكل حساب، والـSuper Admin مايتلمسش | ✅ |
| **س3** | خمس قوالب دلوقتي · «محرر» مرفوض · **الـguard يرفض أي نطاق غير `all`/`null`** · `own` يتبني كامل في الدفعة 4 | ✅ |
| **س4** | حقل `templateKey` بفهرس unique sparse — **تغيير schema معتمد** | ✅ |
| **س7** | `boardMembersPage` و`committeesPage` يدخلوا قالب الحوكمة؛ `contactUsPage` و`federation` برا | ✅ |
| كسر الداشبورد | يتصلّح، باستثناء محدود لأربع ملفات | 🔄 |
| سياسة الـids | ADR جديد + قايمة سماح + حارس | ADR ✅ · الحارس 🔄 |
| bug الـObjectId | دفعة 3b، متنفَّذش دلوقتي، والسكريبت قبل E1 | ✅ موثَّق |

### القياسات الأربعة

**1. تخطّي خطوة موافقة واقفة — مفيش مسار بالشكل ده.** الموافقة بتشترط عضوية `assigneeIds` بلا أي استثناء لأي دور (`workflow-instances.service.ts:672-685`, الرفض عند 680-682)، والـguard مفيهوش تمرير خاص للـSuper Admin. أقرب حاجتين: **الإلغاء** (`:139-144` / `:442-465`) بلا سبب مطلوب وبنص تدقيق ثابت، و**قفل السياسة** على النوع كله (`approval-configuration.service.ts:198-231`) اللي بيرفض طول ما فيه مراجعة قايمة.

**🔴 والقياس كشف ثغرة تصعيد — انظر B16.**

**2. `Update` على محتوى منشور**

| | النتيجة |
|---|---|
| **`albums`** | **بيظهر فورًا.** مفيش نظام مراجعات (`albums` مش في `WORKFLOW_ENTITY_TYPES`)، والمسار العام بيقرا **نفس الصف** اللي `Update` بيكتب فيه (`albums.repository.ts:80-82`, `albums.service.ts:420-440`) |
| **`articles`** | **هجين.** من اللقطة (بتستنى `Publish`): `title`, `body`, `excerpt`, `seo`, `coverMediaId`, `slug` المعروض. **من الصف، وبتظهر فورًا:** `category`, `topic`, `tags`, `sourceOutlet`, `sourceUrl`, `publishDate` (`article-public-response.dto.ts:117-152`) |

**وحاجتان أخطر في `articles`:** البحث العام بيدوّر في `title` **بتاع الصف** (`articles.service.ts:507-509`)، والفتح بالرابط بيدوّر بـ`slug` **بتاع الصف** (`articles.repository.ts:18-19`) — فتعديل الـslug في مسودة **بيكسر رابط النسخة المنشورة فورًا**، والرابط الجديد بيفتح ويعرض النسخة القديمة.

**3. المورد `federation`** (`federation-governance/federation/schemas/federation.schema.ts:33-67`): الاتحاد كمنظمة — `name`, `shortName`, `acronym`, `logoId` (إجباري), `address`, `latitude`, `longitude`, `registrationNumber`, `registrationAuthority`, `status`. **مش خاضع لسير الموافقات** (مفيهوش `publicationState`). **مفيش مسار عام**، ومفيش مستهلك في الموقع ولا الداشبورد؛ تلات schemas بتشاور عليه بـ`federationId`. متوقع صف واحد **ومفيش قيد بيفرض ده** (`federation.service.ts:12-16`).

**4. المراجع المخزّنة بالنوعين**

| المسار | بيلاقي النوعين؟ |
|---|---|
| `findMediaAssetReferrers` + نسخة الـbatch | **أيوه** — `options.ref` لسه مقروء على مسار `Mixed` (متأكَّد بالتشغيل)، والاستعلام فيه `$in: [...ids, ...ids.map(String)]` (`media-references.ts:754`) |
| تحذير `mediaInUse` | **أيوه** — نفس الـscan |
| حل الصلاحيات من `role.permissionIds` | **أيوه** — `.toString()` ثم `_id: { $in }`، و`_id` مسار `ObjectId` حقيقي |
| **`detachRole`** (`role-assignments.repository.ts:39`) | **لأ** — الفلتر بيبعت `ObjectId` بس، وMongoDB بيقارن نوع الـBSON الأول، فصف متخزّن نص عمره ما هيتطابق |

`referencePathsIn` لقى **60 مسار** مرجعي، 59 منهم `Mixed` وواحد `ObjectId` حقيقي (`liveStreams.thumbnailId`). التعليق في `media-references.ts:17-18` بيقول «41 fields» وهو قديم.

**الأثر على E1:** بيرفض يكمل لو لقى أي ربط أدوار متخزّن كنص، بدل ما يفصل بعضهم ويفوّت الباقي بصمت.

### قرارات أخدتها لوحدي في الرسالة دي

| القرار | السبب |
|---|---|
| قراءة س6: شيل **الفعل** `Archive` مش المورد | القراءة الحرفية بتفضّي القالب ويفشل اختبار «كل قالب فيه منحة واحدة». نفس الخاصية الأمنية، وقالب صالح. **أكّدها المالك بعدين** |
| `boardMembersPage` و`committeesPage` بـ`Update` و`Publish` بس | دول **كل** اللي الخريطة بتقدّمه ليهم، فمفيش زيادة عن أفعال القالب |
| وصف القالب السادس اتصحّح | بقى بيدّعي «كل المجموعات» وهي تمنية |
| اسم اختبار «spec §7.2 حرفيًا» اتشال | `ViewAuditLog` قرار مالك مش نص §7.2 |
| `unresolvedPairs` مش `missingPairs` في E2 | `missingPairs` اسم دالة المقارنة الوحيدة؛ حاجة تانية بنفس الاسم هي إزاي مقارنتان يبقى شكلهم واحدة |
| E1: «قادر» = `Active` ومش مؤرشف وشايل دور شغّال | معنى واحد متسق للتقرير |
| E1: `archivedAt: null` على النسخ المفتوحة | النسخة الملغية بتتعلّم بـ`archivedAt`؛ نفس شرط `countOpenForDefinition` |
| E1: `rolelessAccounts` = غير المؤرشفة بس | التقرير عن حسابات محتاجة أدوار |
| E1: فاعل التدقيق = أول Super Admin نشط بترتيب `_id` | نتيجة ثابتة بين التشغيلات |
| E2: `timestamps: false` على كل عملية | من غيره Mongoose بيعمل `$set` لـ`updatedAt` على كل دور في كل تشغيلة، فالإدمبوتنسي بتتكسر |

### ملفات الرسالة التانية

**`api/` — جديدة:** `common/guards/permissions.guard.spec.ts` (موسَّع) · `modules/platform-administration/roles/role-template-key.spec.ts` · `bootstrap/reset-roles.ts` · `bootstrap/reset-roles.spec.ts` · `reset-roles.ts` · `bootstrap/seed-role-templates.ts` · `bootstrap/seed-role-templates.spec.ts` · `seed-role-templates.ts`

**`api/` — معدَّلة:** `common/guards/permissions.guard.ts` (رفض النطاق) · `common/errors/api-error-code.ts` (`scopedGrantUnsupported`) · `modules/platform-administration/roles/schemas/role.schema.ts` (`templateKey` + الفهرس) · `common/authz/role-templates.ts` (قالب الحوكمة) · `package.json` (سكريبتان)

**`docs/` — جديدة:** `design-system/ADR-0121-Identifier-Spelling-In-API-Responses.md`

**`docs/` — معدَّلة:** `ADR-0106` · `ADR-0108` · `ADR-0113` (أربعة صفوف مؤرَّخة) · `specs/2026-09-26-authz-authn-design.md` (§12 وعدد المسارات) · `plans/2026-09-26-authz-authn.md` (الدفعة 3b · الدفعة 4 · الدفعة 8 · 6a) · `plans/2026-09-28-batch-3-role-management.md` (تصحيح Q4)

### الأرقام

| الحزمة | النتيجة |
|---|---|
| `permissions.guard` | **13/13** — الأحمر قبل التنفيذ: 3/13 |
| `roles` (كلها) | **72/72** في 7 حزم |
| `bootstrap/reset-roles` | **15/15** |
| `bootstrap/seed-role-templates` | **9/9** |
| `role-template-matrix` | **23/23** |
| `npx tsc --noEmit` | exit 0 |
| **`test:guards:core`** | **11 حزمة · 113 اختبار · exit 0** |

**الطفرات المنفَّذة فعليًا في الرسالة دي: 11** — خمسة على E1، وستة على E2، وكل واحدة حمّرت الاختبار المسؤول عنها، وكل ملف رجع متأكَّدًا بالمقارنة.

### عيوب جديدة

| # | العيب | الخطورة | المالك |
|--:|---|---|---|
| **B16** | 🔴 **`PATCH /workflow-steps/:id` بيسمح بتغيير `assigneeIds` و`requiredApprovals` على خطوة عليها مراجعة حيّة، بلا أي فحص** (`workflow-steps.service.ts:112-133`) — عكس `approval-configuration` اللي فيه `assertNothingRunning`. والزوج `workflowSteps:Update` **قابل للمنح**. فصاحبه يقدر يضيف نفسه لخطوة حيّة أو يقلّل العدد المطلوب وبعدين يوافق، وده بيلتف حول فصل المهام بتاع ADR-0106 | **Critical** | محرك الـworkflow — برا نطاق الدفعة |
| B17 | أي دور فيه منحة `own` بقى **معطّلًا بالكامل**، حتى `Read`. متسق مع رفض E2 للقالب، بس الأثر أوسع من القالب | مقصود | الدفعة 4 |
| B18 | الداشبورد مش فاهم `scopedGrantUnsupported`، فهيعرض رسالة رفض عامة | Important | الدفعة 8 |
| B19 | فهرس `templateKey` مش هيتعمل لوحده على قاعدة موجودة لو الـautoIndex مقفول؛ E2 معتمد على إنه فريد | Important | قبل تشغيل E2 |
| B20 | `media-references.ts:17-18` بيقول «41 fields» والمقيس **60** | Minor | الدفعة 9 |
| B21 | TSDoc كلاس `Role` و`description` بيحكوا تاريخ («added 2026-09-07») | Minor | الدفعة 9 |

---

## 10. اللي فاضل

1. **قرارك على س1–س4 و س6–س8** — بعدها Task 6 و Task 8 يتبنوا.
2. **Task 9 الباقي:** تسمية `(E1)`/`(E2)` في الـspec §12، وتصحيح §5 بثلاث نقاط مؤرَّخة، وتعديل مؤرَّخ على ADR-0113 (T2).
3. **توليدة أخيرة لـ`api/openapi.json`** على الشجرة الكاملة (B10).
4. **تبليغ جلسة الهيدر** بالفشلين في §3أ.

---

## 11. أوامر الـcommit — للمالك، ومتشغّلتش

ملفات الدفعة دي متشابكة مع تعديلات سابقة غير معمول لها commit في نفس الملفات (`users.service.ts` و`guard-tests.md`)، فماينفعش commit «الدفعة 3 لوحدها» للملفات دي — نفس نتيجة قاعدة الـGit اللي الدفعة 2 سجّلتها.

**الأمر الواحد ده بيغطي كل شغل الدفعة، وبيبني لوحده:**

```
git add api/src/app.module.ts api/src/common/authz/role-templates.ts api/src/common/authz/role-template-matrix.spec.ts api/src/modules/platform-administration/me api/src/modules/platform-administration/roles/roles.service.system-role.spec.ts api/src/modules/platform-administration/users/is-self.ts api/src/modules/platform-administration/users/users.no-role.spec.ts api/src/modules/platform-administration/users/users.service.self-assignment.spec.ts api/src/modules/platform-administration/users/users.service.ts api/src/modules/platform-administration/users/users.controller.ts api/src/modules/platform-administration/users/users.controller.spec.ts api/src/modules/platform-administration/users/users.service.spec.ts api/src/modules/platform-administration/users/users.service.lifecycle.spec.ts api/src/modules/platform-administration/users/users.service.last-super-admin.spec.ts api/src/modules/platform-administration/users/dto/user-response.dto.ts scripts/test-guards.mjs docs/engineering/guard-tests.md docs/superpowers/plans/2026-09-28-batch-3-role-management.md docs/superpowers/reports/batch-3.md
git commit -m "feat(authz): system-role guard, service-level self-assignment refusal, GET /me/permissions, no-role marker, six role templates"
```

**`api/openapi.json` مقصود إنه برا الأمر ده** — ولّده تاني الأول (B10)، وبعدين `git add api/openapi.json` في commit لوحده.

**ممنوع تشغيل `npm run reset:roles` ولا `npm run seed:role-templates`** — السكريبتين مش متبنيين أصلًا.


---

# الإغلاق النهائي — الدفعة 3

**الحالة: PASS WITH DEBT، وخمسة قرارات مفتوحة.**

كل المهام المخطَّطة اتنفّذت ومتراجعة. اللي وقف، وقف بقرار معلن مش بعجز، وكل واحد منهم مكتوب تحت بخياراته وتكلفته.

## 1. المهام

| # | المهمة | مراجعات | الحالة |
|--:|---|:--:|---|
| 1 | قياس الـids | — | ✅ معروض، صفر تغيير |
| 2 | الدور الأساسي غير قابل للكتابة | 1 + إصلاح | ✅ |
| 3 | رفض تغيير أدوار النفس في الـservice | 1 | ✅ |
| 4 | `GET /me/permissions` | 1 + إصلاح | ✅ |
| 5 | علامة «بدون دور» | 1 + إصلاح | ✅ |
| 6 | **E1 `reset-roles`** | 2 | ✅ بشرط |
| 7 | مصفوفة القوالب + حارس | 1 + إصلاح | ✅ |
| 8 | **E2 `seed-role-templates`** | 2 | ✅ |
| — | **حماية النطاق في الـguard** | 2 | ✅ بشرط |
| — | **`templateKey` + الفهرس** | 2 | ✅ |
| — | **إصلاح مصفوفة الداشبورد** | 1 | ✅ |
| — | **حارس سياسة الـids** | — | ⏸ **تصميم، مش كود** |
| 9 | التوثيق والتقرير | — | ✅ |

## 2. التحقق النهائي

| | النتيجة |
|---|---|
| **`test:guards` كامل، والخدمات مقفولة** | **exit 0 — كله أخضر** |
| — API | 17 حزمة · **261** اختبار |
| — الداشبورد | 10 ملفات · **103** اختبار |
| — الموقع | 27 ملفًا · **399** اختبار |
| `test:guards:core` | 11 حزمة · 113 اختبار · exit 0 |
| `npx tsc --noEmit` (api) | نضيف |
| `permissions.guard` | 13/13 |
| `bootstrap/reset-roles` | 15/15 |
| `bootstrap/seed-role-templates` | 9/9 |
| `role-template-key` | 11/11 |
| `role-template-matrix` | 23/23 |
| `roles` (كلها) | 72/72 في 7 حزم |
| `platform-administration/users` | 115/115 في 13 حزمة |
| الداشبورد — `permission-matrix` | 41/41 |
| الداشبورد — `directory-stats` | 10/10 |
| الداشبورد — `permission-catalogue-lens` | 7/7 |
| الداشبورد — `role-workbench` | 14/14 |

**الطفرات المنفَّذة فعليًا على قواعد الأمان: 26** — 11 في التنفيذ و15 في المراجعة المستقلة، كل واحدة بـsha256 قبل وبعد. **واحدة بس فضلت خضرا** (`E1-M2`: شيل استثناء الـSuper Admin من الـloop) وهي شبه مكافئة، لأن `$nin` في الفلتر بيحمي لوحده — والمراجعة أثبتت ده بطفرة تالتة شالت الحمايتين مع بعض فاحمرّت.

## 3. الدين الباقي، بمالكه

| # | البند | الخطورة | المالك |
|--:|---|---|---|
| **B1** | **مصفوفة صلاحيات الأدوار في الداشبورد** | ~~Critical~~ | **مقفول في الدفعة دي** |
| **B16** | **`PATCH /workflow-steps/:id` بيغيّر `assigneeIds` و`requiredApprovals` على خطوة عليها مراجعة حيّة بلا أي فحص**؛ والزوج قابل للمنح، فصاحبه يضيف نفسه ويوافق — التفاف كامل حول فصل المهام | **Critical** | محرك الـworkflow |
| **B22** | **تشغيل E1 تاني بعد E2 بيمسح كل القوالب والتعيينات**، وE2 مش هيعيد زرعها (بيطابق المؤرشف) | **Critical تشغيليًا** | **قرار 1 تحت** |
| **B23** | **حساب ممكن يتفصل بلا صف تدقيق** — الـ`$pull` قبل التدقيق بلا transaction، والتشغيلة التانية مش هتعوّضه | **Important** | **قرار 3 تحت** |
| **B24** | **ترتيبان متعارضان للنطاق**: الـguard `null ≡ all`، و`width` `null(0) < own(1) < all(2)` | **Important** | قبل مهمة `own` |
| B2 | 364 مسار `ObjectId` بيطلعوا `Mixed` | Important | الدفعة 3b (موثَّقة) |
| B18 | الداشبورد مش فاهم `scopedGrantUnsupported` | Important | الدفعة 8 |
| B19 | فهرس `templateKey` مش هيتعمل لوحده لو الـautoIndex مقفول | Important | قبل تشغيل E2 |
| B25 | `publishing.service.ts:853-861` فحص صلاحيات تاني بيتجاهل النطاق | Important | مهمة `own` |
| B3 · B4 · B5 · B6 · B7 · B8 · B9 · B13 · B17 · B20 · B21 | كما هي | Minor/مقصود | الدفعة 9 |
| B26 | `scripts/test-guards.mjs:8` بيشاور على `GUARD-TESTS.md` والملف `guard-tests.md` — مكسور على CI بـLinux | Minor | الدفعة 9 |

## 4. اللي المراجعة مسكته بعد ما المهام كانت «خضرا»

خمس حاجات، وكلهن بره حدود المهمة الواحدة:

1. **حارس الـids اللي مااتبناش كشف غلطة في ADR-0121** — جسّ الجدوى وحده أثبت إن «الاستثناءات هي `users` و`permissions` بس» غلط، وإن فيه عشرة غيرهم. لا مراجعة قراءة ولا اختبار كان هيوصل لده.
2. **`role-workbench.spec.tsx`** اتكسر من تعديل مصرَّح به في ملف تاني — العطل الجانبي اللي مفيش اختبار في نطاق المهمة كان هيشوفه.
3. **E1 بعد E2** — كل مهمة صح في نفسها، والخطر في التتابع بينهم.
4. **`$pull` قبل التدقيق** — الاختبارات كلها خضرا، والفجوة في الترتيب مش في المنطق.
5. **`null ≡ all` مقابل `width`** — ملفان صح كل واحد لوحده، ومتعارضان مع بعض.

**والمشترك، زي الدفعة 2:** العيب في السَّيْم بين القطع، مش جوّه القطعة.

## 5. أوامر الـcommit — للمالك، ومتشغّلتش

**`api/` و`docs/` و`scripts/`** (الأمر ده بيبني لوحده):

```
git add api/package.json api/src/app.module.ts api/src/common/errors/api-error-code.ts api/src/common/guards/permissions.guard.ts api/src/common/guards/permissions.guard.spec.ts api/src/common/authz/role-templates.ts api/src/common/authz/role-template-matrix.spec.ts api/src/bootstrap/reset-roles.ts api/src/bootstrap/reset-roles.spec.ts api/src/bootstrap/seed-role-templates.ts api/src/bootstrap/seed-role-templates.spec.ts api/src/reset-roles.ts api/src/seed-role-templates.ts api/src/modules/platform-administration/me api/src/modules/platform-administration/roles/schemas/role.schema.ts api/src/modules/platform-administration/roles/role-template-key.spec.ts api/src/modules/platform-administration/roles/roles.service.system-role.spec.ts api/src/modules/platform-administration/users scripts/test-guards.mjs docs/design-system docs/engineering/guard-tests.md docs/superpowers
git commit -m "feat(authz): role management, reset and template scripts, GET /me/permissions, scoped-grant refusal"
```

**الداشبورد لوحده**، زي ما طلبت:

```
git add apps/dashboard/src/lib/api/types.ts apps/dashboard/src/lib/admin/permission-matrix.ts apps/dashboard/src/lib/admin/permission-matrix.spec.ts apps/dashboard/src/lib/admin/directory-stats.ts apps/dashboard/src/lib/admin/directory-stats.spec.ts apps/dashboard/src/components/admin/roles/permission-catalogue-lens.tsx apps/dashboard/src/components/admin/roles/permission-catalogue-lens.spec.tsx apps/dashboard/src/components/admin/roles/role-workbench.spec.tsx
git commit -m "fix(dashboard): read permission id from the GET /permissions DTO shape"
```

**`api/openapi.json` مقصود إنه برا الأمرين** — ولّده تاني على الشجرة الكاملة، وبعدين `git add` له في commit لوحده. اتولّد وسط الدفعة وملفات `me/` كانت في نص التعديل.

**⛔ `npm run reset:roles` و`npm run seed:role-templates` ماتشغّلوش. السكريبتان اتكتبوا ومااتشغّلوش، وفيه قرارات مفتوحة عليهم.**


**الحُرّاس الكاملين، 2026-09-29 الساعة 00:19، والبورتات 3000/3001/3002 فاضية:** 763 اختبارًا في 54 ملفًا، **صفر فشل**، في 135.7 ثانية. والفشلان اللي كانوا في الموقع (`mega-link.tsx` و`motion.css`) **اتصلحوا من جلسة الهيدر** بين التشغيلتين — الدفعة دي ماتلمستش `apps/web` خالص.


---

# قرارات المالك — الرسالة التالتة (2026-09-29)، والإغلاق

كل القرارات المفتوحة اتقفلت واتنفّذت. **الملفات اللي اتلمست في الجولة دي بس:**

| الملف | التغيير |
|---|---|
| `api/src/modules/workflow/audit-logs/audit-logs.repository.ts` | `create(data, session?)` — من غير session بتفضل زي ما كانت |
| `api/src/modules/workflow/audit-logs/audit-logs.service.ts` | `write(entry, session?)` |
| `api/src/modules/workflow/audit-logs/audit-logs.repository.spec.ts` | حارس السطح العام على الـprototype كله |
| `api/src/modules/workflow/audit-logs/audit-logs.transaction.spec.ts` | **جديد** — 4 اختبارات على replica set |
| `api/src/common/interceptors/audit-log.interceptor.spec.ts` | عنصران في cast استوعبوا الـparameter الاختياري |
| `api/src/common/authz/administrative-id-endpoints.ts` | **جديد** — 22 مدخلًا، بيانات بس |
| `api/src/common/authz/administrative-id-endpoints.spec.ts` | **جديد** — 5 فحوصات على البيانات |
| `api/src/bootstrap/reset-roles.ts` · `reset-roles.spec.ts` · `api/src/reset-roles.ts` | القرارات الأربعة |
| `docs/design-system/ADR-0121-...md` | صف «Resolved»، وتصحيح §D1 |
| `docs/superpowers/plans/2026-09-26-authz-authn.md` | ترتيب 3b، وسؤالا الدفعة 4 |
| `docs/superpowers/specs/2026-09-26-authz-authn-design.md` | ترتيب السكريبتات: 7b-i، وشروط E1 |

## القرارات كما نُفِّذت

| # | القرار | التنفيذ |
|--:|---|---|
| 1 | E1 يرفض لو أي دور — ومنه المؤرشف — معاه `templateKey` | الفحص **أول حاجة**، قبل فحص الـObjectId وقبل تحديد الفاعل، بقراءة `roles.collection` مباشرة بـ`{ templateKey: { $ne: null } }`. **مفيش flag يتخطّاه.** الرسالة بتسمّي المفاتيح وبتقول إن E2 مش هيعيد الزرع |
| 2 | الـSuper Admin اللي معاه دور تاني: بند منفصل | `superAdminsHoldingOtherRoles` في التقرير وفي طباعة السكريبت. **السلوك ماتغيّرش** |
| 3 | `session?` اختياري، بلا إعداد mongoose عام | الـ`$pull` وصف التدقيق في transaction واحدة، والـsession بتتمرر صراحةً |
| 4 | صف `Archive` لكل دور بيتأرشف | مطابق لـ`DELETE /roles/:id` |
| 5 | العشر مسارات تنضم لقايمة السماح | 22 مدخلًا. المحرّك للدفعة 8 |

## تصحيحان لفرضيتين كانتا في التعليمات

**1. `DELETE /roles/:id` مابيسجّلش `Delete`.** الـcontroller معلن `@AuditEntity({ action: 'Archive' })`، والـinterceptor بيخلّي القيمة المعلنة تغلب ([audit-log.interceptor.ts:94](../../../api/src/common/interceptors/audit-log.interceptor.ts)). فالشكل اللي E1 طابقه هو `Archive`. ملاحظة الدفعة 2 («48 مسار أرشفة لسه بيسجّلوا `Delete`») مابقتش صحيحة على المسار ده.

**2. `typescript` devDependency مش dependency** (`^6.0.2`). شرط المالك كان وجودها في `dependencies`؛ وهي في `devDependencies`، **وده المكان الصح** لحارس اختبارات مابيتشحنش. **مفيش dependency جديدة مطلوبة.**

## اختباران حدَّدتهما أنا وطلعا لا يمكن أن يفشلا

الاتنين اتكشفوا بالتنفيذ مش بالمراجعة:

1. **«رمي كتابة التدقيق بيرجّع الكتابة الأولى»** كان **أخضر قبل الإصلاح**: `actorId` الناقص بيترفض في validation على جهة الـclient قبل أي كتابة، والرمية بتعمل abort للـtransaction سواء اتمرّرت الـsession أو لأ. البديل اللي احمرّ فعلًا: **abort يدوي بعد كتابة تدقيق سليمة**.
2. **حارس append-only القديم** كان بيتأكد من أسماء بعينها على الـinstance. الجديد بيمشي على الـprototype كله ويرفض `/update|delete|remove|replace|findOneAnd|bulkWrite/i`، ومعاه أرضية عدم خلو.

## قرارات أخدها المنفّذون وأقررتها

- **transaction لكل وحدة** (دور واحد + صف `Archive` بتاعه؛ حساب واحد + صفوف الفصل بتاعته) مش transaction واحدة للتشغيلة كلها. الفشل في النص بيسيب اللي قبله متسجّلًا، وتشغيلة تانية بتكمّل لأن السكريبت idempotent.
- **حسابات الـSuper Admin المؤرشفة** بتدخل `superAdminsHoldingOtherRoles` لو لسه شايلة أدوارًا تانية، لأن السكريبت بيسيبها هي كمان.
- **فروق صف `Archive` عن المسار الحقيقي:** `ipAddress`/`userAgent` فاضيين (مفيش request context)، و`reason: 'reset-roles'`، و`previousValue` من القراءة الأولى مش من جوه الـtransaction — وأمانه من إن فلتر الأرشفة `archivedAt: null`.

## ثبات مقيس

| الحزمة | الثبات |
|---|---|
| `audit-logs.transaction` | أول نسخة فشلت **مرة من ~29**؛ بعد `Promise.all([model.init(), …])` **25 تشغيلة ورا بعض خضرا** |
| `bootstrap/reset-roles` | **30 تشغيلة ورا بعض، 23/23 كل مرة** |

السبب المرجَّح للـflake: بناء الـindexes بتاع autoIndex كان لسه شغالًا وقت أول كتابة داخل transaction.

## دين جديد

| # | العيب | الخطورة | المالك |
|--:|---|---|---|
| B27 | **`DELETE /roles/:id` بيفصل الدور عن حامليه بلا أي صف تدقيق لكل حساب** — الصف الوحيد هو `Archive` بتاع الدور. يعني المسار الحقيقي بيسجّل **أقل** من السكريبت | Important | **الدفعة 3b، البند 3** (قرار المالك 2026-09-29) |
| B28 | نفس المسار: الأرشفة والفصل وصف التدقيق **مش في transaction واحدة** | Important | **الدفعة 3b، البند 3** |
| B29 | اختبار السطح القديم في `audit-logs.repository.spec.ts` بيتأكد من أسماء بعينها على الـinstance؛ الجديد بيغطي أوسع، والقديم فضل | Minor | الدفعة 9 |


## التحقق النهائي — الجولة التالتة

| | النتيجة |
|---|---|
| **`test:guards` كامل** | **exit 0 — 764 اختبارًا في 54 ملفًا، صفر فشل، 89.1 ثانية** |
| — API | 17 حزمة · 261 |
| — الداشبورد | 10 ملفات · 103 |
| — الموقع | 27 ملفًا · 400 |
| `bootstrap/reset-roles` | **23/23** (كانت 15) |
| `audit-logs` | **5 حزم · 20** (كانت 4 · 15) |
| `administrative-id-endpoints` | 47 |
| `npx tsc --noEmit` | **exit 0** |

**flake اتمسك ومااتبلّغش كفشل.** التشغيلة قبل الأخيرة رجعت فشلين في حُرّاس الداشبورد، والاتنين **timeouts مش assertions** («Test timed out in 5000ms») على حارسين بيمسحوا نظام الملفات. تشغيلهم لوحدهم: **3.69 ثانية، أخضر**. التشغيلة الكاملة بعدها: **exit 0**. القاعدة («شغّل الحُرّاس أكتر من مرة قبل ما تقول إن فيه فشل») منعت بلاغًا كاذبًا هنا فعلًا.


---

## الجلسة الجاية — الترتيب المعتمد (قرار المالك 2026-09-29)

**الدفعة 3b، بالترتيب ده:**

1. **`PATCH /workflow-steps/:id`** — الالتفاف حول فصل المهام (**Critical**، B16)، باختبار سلبي على **كل** مسار.
2. **تصحيح الـObjectId** — 146 موضعًا + سكريبت التحويل + حارس بيفشل لو أي مسار مرجعي طلع `Mixed` (B2).
3. **`DELETE /roles/:id`** — صف تدقيق لكل حساب اتفصل، وtransaction واحدة، واختبار الرجوع بطريقة الـabort بعد كتابة سليمة (B27 · B28). **اتنقل من الدفعة 9.**
4. **قياس قراءة بس** — كل مسار أرشفة بيسجّل `action` إيه فعلًا. الجدول يُعرض، **ولو فيه مسار بيأرشف ويسجّل `Delete`: يُسأل ولا يُصلَّح.**

**بعدها الدفعة 4**، وأول سؤال في خطتها هو تعارض `null ≡ all` مقابل `width` (B24) — **يُعرض بخياراته وتكلفته ولا يُنفَّذ** — ومعاها تحويل `PublishingService.hasPermission` لـ`holdsPair` باختبار سلبي بنطاق `own` (B25).

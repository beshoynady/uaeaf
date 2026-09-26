# مراجعة: نظام الأدوار والصلاحيات — كامل

**النوع:** مراجعة أمان قراءة فقط. **التاريخ:** 2026-09-26. **الفرع:** main.
**لم يُعدّل أي ملف كود، ولم يُنفّذ أي أمر Git، ولم تُكتب قاعدة البيانات.**

**سابقتها:** [`accounts-profiles-review.md`](./accounts-profiles-review.md) — الحسابات
والبروفايلات. ما فيها لا يُعاد هنا، ويُشار إليه فقط.

**دليل تشغيل الاختبارات:** تشغيل واحد للملفات المرتبطة —
`npm test -- --runInBand --testPathPatterns="(roles\.service|permissions|permission-catalogue|permission-resources|access-control|publishing\.service|workflow-policies|refusal-codes)"`
→ **11 suites / 109 tests، كلها ناجحة.**

**قياس آلي:** مسح كل الـcontrollers الـ74 (سكربت قراءة في مجلد الجلسة المؤقت، خارج
المستودع) بعد تجريد التعليقات — **388 route**: 326 محمي بـ`@RequirePermission`،
و56 `@Public()`، و6 موثّقة كـ"نطاق المستخدم نفسه". و**215 زوج صلاحية على 69 موردًا**.

---

## 1. الخلاصة

**بشروط، وشرط واحد منها حاجز.** الهيكل أقوى مما توقعت المراجعة: الكتالوج مربوط
بالـdecorators آليًا في الاتجاهين، ولا يوجد **أي** route كتابة بلا حماية وبلا
`@Public()`، وحق النشر المباشر صلاحية منفصلة فعلًا ومفحوصة داخل الـservice لا في
الـcontroller وحده، والاعتماد والنشر مفصولان بقرار مالك موثّق، وتغيير الصلاحيات
يسري فورًا بلا cache وعليه اختبارات تكامل. **لكن فيه ثغرة ترقية صلاحيات كاملة:**
`users:Create` وحدها تكفي ليصبح حاملها Super Admin في نداءين — قاعدة "لا تمنح ما
لا تملك" مطبّقة على *بناء* الدور ولا على *توزيعه*. وفوق ذلك **تغيير سياسات
الموافقة لا يُسجَّل في سجل التدقيق إطلاقًا**، وهو أخطر إعداد في المنصة. ونموذج
التشغيل نفسه غير قابل للتطبيق كما وُصف في نقطة واحدة: **"مراجع لنوع محتوى معين"
لا يمكن التعبير عنه كصلاحية** — `Approve` صلاحية واحدة على مستوى المنصة كلها.

---

## 2. P0

### P0-1 — `users:Create` تعني Super Admin

سلسلة مكتملة، كل خطوة عليها دليل:

| # | الخطوة | الدليل |
|---|---|---|
| 1 | أي دور يحمل `users:Create` **مُلزَم** بحمل `users:Read` معه | قاعدة التماسك `permission-implications.ts:42-64`، مفروضة في `roles.service.ts:263-277` (`assertCoherent`) — فالدور لا يُنشأ بدون القراءة |
| 2 | `GET /users` يكشف `roleIds` لكل حساب، فمعرّف دور Super Admin مقروء | `users.controller.ts:35-40` ← `toResponse` في `users.service.ts:196-209` (`roleIds` سطر 201) |
| 3 | `POST /users` يقبل `roleIds` **و**`password` يختارهما النداء | `users.controller.ts:28-33`؛ `create-user.dto.ts:32-35` (password) و`:37-46` (roleIds) |
| 4 | الخدمة تتحقق فقط أن الدور **موجود وغير مؤرشف** — ولا شيء يقارن صلاحيات الدور بصلاحيات الفاعل | `users.service.ts:72-97` ← `rolesService.assertAssignable` في `roles.service.ts:160-188`. و`grep -rn "assertGrantable\|actorPermissions" api/src/modules/platform-administration/users/` → **صفر نتائج** |
| 5 | الفاعل يسجّل الدخول بالحساب الجديد ← كل صلاحيات الكتالوج | — |

**الأثر:** نداءان. `GET /users` لقراءة معرّف الدور، ثم `POST /users` بـ
`roleIds: [<superAdminRoleId>]` وكلمة مرور من اختيار الفاعل. لا موافقة، ولا خطوة
وسيطة، ولا شيء في السجل يسمّيها ترقية.

**لماذا لا توقفها الحمايات القائمة — وكلها موجودة وتعمل:**

- `assertGrantable` (`roles.service.ts:229-256`) تمنع منح صلاحية لا تملكها، لكنها
  تعمل على مسارَي **بناء** الدور فقط (`create` سطر 35، و`updatePermissions`
  سطر 131-136). توزيع دور قائم لا يمرّ عليها.
- منع الإسناد الذاتي (`users.controller.ts:118-123`) يرفض `id === actor.userId`
  فقط. الفاعل لا يسند لنفسه — يسند لحساب أنشأه هو. والتعليق في الكود يسمّي
  السلسلة التي أُغلقت: "create a role with every permission, then self-assign it"
  — والنسخة التي تستخدم حسابًا **آخر** لم تُغلق.
- `isSystemRole` (`roles.service.ts:196-207`) يمنع تعديل دور Super Admin أو حذفه
  أو إعادة تسميته. لا يمنع **إسناده**.

**نفس الثغرة من الباب الثاني:** `PATCH /users/:id/roles`
(`users.controller.ts:102-129`) لأي حساب يستطيع الفاعل الدخول به أصلًا.

**ما يخفّف الحدّة (ذُكر للإنصاف لا للتهوين):** لا يوجد **أي** مسار لإعادة تعيين
كلمة المرور في المنصة (`grep -rn "passwordReset\|reset-password\|forgot" api/src
--include="*.controller.ts"` → صفر). فـ`users:Update` وحدها لا تكفي للاستيلاء على
حساب قائم؛ الصلاحية اللازمة هي `users:Create` تحديدًا.

**لماذا P0 لا P1:** نموذج التشغيل المطلوب يقول إن الأدمن يبني 10-20 دورًا حسب
الحاجة. دور باسم "مسؤول المستخدمين" أو "إدارة الحسابات" هو بالضبط ما سيُبنى، وهو
يمنح الـSuper Admin كاملًا بلا أن يظهر ذلك في أي شاشة.

**التوصية:** تطبيق قاعدة القابلية للمنح على **الإسناد** كما هي مطبّقة على البناء —
في `UsersService.create` و`assignRoles`: حلّ صلاحيات كل دور مطلوب، ورفض أي زوج لا
يحمله الفاعل، بنفس مقارنة `RolesService.assertGrantable`. **التكلفة: 0.5-1 يوم**
بالاختبارات.
**بديل أرخص وأضعف:** صلاحية `roles:Assign` منفصلة عن `users:Update`، ورفض إسناد أي
دور `isSystemRole`. **~3 ساعات.** يرفع الحاجز ولا يغلق الثغرة: دور مخصّص يحمل كل
شيء يظل قابلًا للإسناد.

> **لا P0 ثانٍ.** لم يُوجد أي route كتابة بلا حماية وبلا `@Public()` — القائمة في
> §3 وهي ليست فاضية لكنها كلها "نطاق المستخدم نفسه". والترقية الذاتية المباشرة
> (`PATCH /roles/:id/permissions` على دور يحمله الفاعل) مغلقة بـ`assertGrantable`.

---

## 3. المصفوفة

### 3.1 التغطية الكلية (قياس آلي على 74 controller)

| الفئة | العدد | الحكم |
|---|---|---|
| إجمالي الـroutes | 388 (204 كتابة · 184 قراءة) | — |
| محمي بـ`@RequirePermission` | **326** | ✔ |
| `@Public()` صريح | **56** | ✔ مقصود |
| كتابة غير مصدَّق عليها (unauthenticated) | **3** | ✔ login · refresh · نموذج اتصال عام |
| بلا صلاحية وبلا `@Public()` | **6** | ✔ كلها "نطاق المستخدم نفسه" — تحليل أدناه |
| **كتابة بلا حماية وبلا `@Public()`** | **0 بعد الفحص** | ✔ لا يوجد |

الحُرّاس الثلاثة مسجّلون globally بالترتيب الصحيح:
`RateLimitGuard` → `JwtAuthGuard` → `PermissionsGuard` (`app.module.ts:184-186`)،
والتعليق `:181-183` يشرح أن الترتيب هو ترتيب التنفيذ. فـroute بلا
`@RequirePermission` يمرّ من `PermissionsGuard` (`permissions.guard.ts:51-53`:
`if (!required) return true`) لكنه **يبقى** محميًا بـ`JwtAuthGuard`.

### 3.2 الستة "بلا صلاحية وبلا `@Public()`" — كل واحد بالدليل

| الـroute | الملف:السطر | الهوية من | الحكم |
|---|---|---|---|
| `POST /auth/logout` | `auth.controller.ts:45` | التوكن | ✔ جلسة صاحبها |
| `POST /auth/logout-all` | `auth.controller.ts:53` | التوكن | ✔ جلسات صاحبها |
| `GET /users/me` | `users.controller.ts:51` | `user.userId` من التوكن | ✔ موثّق `:42-50` |
| `PATCH /users/me/preferences` | `users.controller.ts:67` | `user.userId`، **لا الـbody** | ✔ موثّق `:64-66`: "The id comes from the JWT, never from the request body" |
| `GET /notifications/me` | `notifications.controller.ts:24` | `user.userId` | ✔ |
| `PATCH /notifications/:id/read` | `notifications.controller.ts:29` | `:id` **+** `recipientId` من التوكن | ✔ **لا IDOR** — النطاق في الـrepository لا في الـservice: `notifications.service.ts:40-44` → `markReadForRecipient` |

### 3.3 مفردات العمليات — ما يُستعمل وما هو ميت

| العملية | عدد الموارد | ملاحظة |
|---|---|---|
| `Read` | 56 | — |
| `Create` | 51 | — |
| `Delete` | 47 | — |
| `Update` | **36** | 30 موردًا يملك Create/Delete بلا Update — §5 P1-8 |
| `Publish` | **19** | منفصلة عن الإنشاء والتعديل ✔ |
| `Export` | 5 | مفصولة عن `Read` بقرار مالك 2026-09-08 |
| `Approve` | **1** | `workflowInstances` فقط — §5 P1-3 |
| `HardDelete` | **0** | مفردة ميتة |
| `EditProtectedData` | **0** | مفردة ميتة |

### 3.4 تماسك الكتالوج — مفروض آليًا

69 موردًا في `PERMISSION_RESOURCES`، و69 موردًا في الكتالوج، **وصفر يتيم في أي
اتجاه** (قياس آلي). وهذا ليس مصادفة: `permission-catalogue.spec.ts:34-45` يعيد
استخراج كل أزواج `@RequirePermission` من الشيفرة في كل تشغيل، ويفشل إن اختلفا في
أي اتجاه — اختبار أن "كل زوج يحرسه decorator" واختبار أن "لا زوج يحرسه شيء".
و`permission-resources.ts:1-16` يوثّق السبب: `resourceType` كان `String` حرًا،
فصلاحية لـ`"albumss"` كانت تُحفظ وتحرس لا شيء للأبد.

**سؤال البند 4-أ "الموارد اللي في الكتالوج ومالهاش routes، والعكس" → القائمتان
فاضيتان، وهذا مضمون بالاختبار لا بالمراجعة.**

التفاصيل الكاملة (المورد × العمليات) في **الملحق أ**.

---

## 4. نموذج التشغيل — نقطة بنقطة

| النقطة المطلوبة | الحالة | الدليل |
|---|---|---|
| **فريق NoTime = Super Admin يدير المنصة كلها** | **مطابق** | دور مزروع بـ`isSystemRole: true` يحمل الكتالوج كاملًا: `seed-admin.ts:81-89` و`:156-180`. `seedSuperAdminRole` **يعيد كتابة** `permissionIds` للكتالوج الحالي في كل تشغيل، فإصدار يضيف صلاحيات لا يترك الـSuper Admin ناقصًا (`:156-159`). لا `isSuperAdmin` bypass — `permissions.guard.ts:57-60` يقارن الزوج بلا أي فرع خاص |
| **حسابات الاتحاد، كل واحد حسب دوره** | **مطابق** | 215 زوجًا على 69 موردًا، والحلّ per-request عبر `jwt.strategy.ts:62` ← `roles.service.ts:61-92` |
| **حق النشر المباشر لمسؤول محدد** | **مطابق، وأقوى من المطلوب** | `Publish` صلاحية منفصلة على 19 موردًا، و`publishDirect` يفحصها **داخل الـservice** (`publishing.service.ts:100` ← `assertPermission` `:560-570`) لا في الـcontroller وحده. والتعليق `:558-560` يشرح السبب: "checked here rather than in the controller so no future route can mount this without it". وعليها قفل تزامن متفائل (`expectedUpdatedAt`, `:128-137`) وقائمة موانع نشر (`publish-blockers.ts:44-58`) |
| **الأدمن يحدد أنواع المحتوى ذات قائمة الموافقات** | **مطابق وظيفيًا، غير مُسجَّل** | `PUT /workflow-policies/:entityType/approval` تحت `workflowPolicies:Update` (`workflow-policies.controller.ts:67-68`)، ونداء واحد يضبط التشغيل والنمط والمراجعين والعتبة معًا — والتعليق `:60-66` يشرح لماذا معًا. **لكن التغيير لا يُسجَّل إطلاقًا: P1-1** |
| **مراجعون ومعتمدون لأنواع محتوى معينة** | **غير قابل للتطبيق كصلاحية** | `Approve` على مورد واحد فقط (`workflowInstances`)، والأربع routes كلها تستعمله (`workflow-instances.controller.ts:73, 85, 97, 121`). التحجيم الوحيد هو `assigneeIds` على الخطوة، مفروضًا في `loadAssignedStep` (`workflow-instances.service.ts:652-665`). **P1-3** |
| **البساطة مقدَّمة (30-50 حساب، 10-20 دور)** | **مطابق** | لا نطاقات ولا تسلسل ولا شروط — زوج (مورد، عملية) مسطّح. و`resolvePermissions` قراءتان مفهرستان أيًا كان ما يحمله المستخدم (`roles.service.ts:43-60`، والتعليق يذكر أن النسخة السابقة كانت 165 دورة للـSuper Admin) |

### 4.1 أسئلة البند 4-ب، بالإجابة والدليل

**هل الاعتماد يكفيه التعيين، أم يلزم كذلك صلاحية على نوع المحتوى؟**
يلزم **الاثنان**: `workflowInstances:Approve` من الـguard، **و** العضوية في
`assigneeIds` من `loadAssignedStep` (`workflow-instances.service.ts:652-665` →
`ForbiddenException`). لكن الصلاحية غير مرتبطة بنوع المحتوى إطلاقًا، فهي شرط
عام واحد لكل الأنواع.

**وما يحصل لو سُحبت صلاحيته وهو معيّن على خطوة مفتوحة؟**
يُرفض فورًا من `PermissionsGuard` — الحلّ per-request، فلا انتظار 15 دقيقة
(`access-control.integration.spec.ts:143`: "withdraws a permission removed from
the role without re-issuing the token"). **لكنه يبقى في `assigneeIds`**: لا شيء
يُنظّف الخطوة. فالمراجعة تظل معلّقة عليه، وتُحسب في `requiredApprovals`، بلا مؤشر
يقول إن أحد المعيّنين لم يعد قادرًا. وإن كان `requiredApprovals` يساوي عدد
المعيّنين، فالمراجعة **متوقفة** حتى يعدّل الأدمن الترتيب — و`assertNothingRunning`
(`approval-configuration.service.ts:109-111`) يرفض تعديل الترتيب أثناء مراجعة
جارية. المخرج الوحيد: إلغاء المراجعة. **P1-9.**

**هل يقدر نفس الشخص ينشئ محتوى ويعتمده بنفسه؟**
**نعم، إن كان في `assigneeIds`.** موثّق صراحةً في `workflow-instances.service.ts:130-132`:
"the only self-approval gate (BE-PLAN-010 Week 2 §9); **no author-field
comparison exists or is performed**". مع `requiredApprovals: 1` ومراجع واحد، تصبح
المراجعة إجراءً لشخص واحد. **P1-4.**

**ولمّا الأدمن يغيّر سياسة نوع محتوى من "يتطلب موافقة" لـ"نشر مباشر"، المحتوى
اللي في منتصف المراجعة بيحصله إيه؟**
يعتمد على حالة المراجعة، وأحد الفرعين عطل:

- **`InProgress` → مشلول.** `publishDirect` يرفض لأن `findActive` يعيدها
  (`publishing.service.ts:117-124`؛ و`findActive` = "غير مؤرشف ولم يصل Approved"،
  `workflow-instances.service.ts:471-480`). و`publishApproved` يرفض لأن السياسة
  صارت `direct` (`publishing.service.ts:224-228`: "needs no approval. Publish it
  directly instead"). المخرج: إلغاء المراجعة (`workflowInstances:Update`).
- **`Approved` → يُنشر مباشرة بلا مشكلة**، لأن `Approved` ليست "active".

و`disable()` لا يفحص المراجعات الجارية أصلًا (`approval-configuration.service.ts:131-143`
— لا `assertNothingRunning` فيه، بخلاف مسار تغيير الترتيب). **P1-2**، وبلا أثر في
سجل التدقيق (**P1-1**).

### 4.2 أسئلة البند 4-ج

**إنشاء دور وتعديله ومسحه — مين يقدر؟** `roles:Create` / `roles:Update` /
`roles:Delete` (`roles.controller.ts:24, 50, 56, 72`).

**وقاعدة "ماتدّيش صلاحية انت مش عندك" — في كل المسارات ولا مسار واحد؟**
في **مسارَي بناء الدور معًا**: `create` (`roles.service.ts:35`) و`updatePermissions`
(`:131-136`). والتعليق `:120-124` يذكر أن التدقيق وجد `updatePermissions` هو
الموضع الوحيد الذي كانت القاعدة ناقصة فيه (P0 #3 سابقًا) وأنه أُغلق.
**وليست في مسار الإسناد** — وهذه هي P0-1.

**حماية الأدوار الأساسية؟** `assertEditable` (`roles.service.ts:196-207`) يرفض
إعادة التسمية والحذف **وإعادة كتابة الصلاحيات** لأي دور `isSystemRole`. ويقرأ عبر
`findByIdIncludingArchived` — والتعليق `:188-195` يشرح أن النسخة السابقة قرأت عبر
`findById` الذي يصفّي المؤرشف، فكان الدور المؤرشف يعيد `null` ويمرّ الفحص فراغًا.

**حماية آخر Super Admin؟** **لا توجد. P1-5.**

**ينفع حد يغيّر دوره بنفسه أو يرقّي نفسه؟** لا مباشرةً: الإسناد الذاتي مرفوض
(`users.controller.ts:118-123`)، وتعديل صلاحيات دور يحمله محدود بما يحمله
(`assertGrantable`). **لكن غير مباشرةً نعم — P0-1.**

**مسح دور مستخدم فعلًا — الحسابات اللي عليه بيحصلها إيه؟** يُؤرشف الدور ثم يُفصل
عن كل حامليه (`roles.service.ts:141-157`)، والفصل **بعد** الأرشفة لا قبلها،
والتعليق `:124-131` يشرح: لو الفصل أولًا وفشلت الأرشفة، لبقي الدور حيًا وقد
سُلب من الجميع. الأرشفة وحدها تكفي لإيقاف المنح لأن الحلّ يصفّي المؤرشف.

### 4.3 أسئلة البند 4-د — الجلسات والتوقيت

| السؤال | الإجابة | الدليل |
|---|---|---|
| تغيير دور أو صلاحيات دور: فوري أم مُؤخَّر بـcache؟ | **فوري، بلا cache** | القرار موثّق: التوكن يحمل `roleIds` فقط، والصلاحيات تُحلّ في كل request (`jwt.strategy.ts:8-26`). ومحروس بـ6 اختبارات تكامل: `access-control.integration.spec.ts:121-173` — إضافة، وسحب، وأرشفة الدور، وأرشفة الصلاحية، وتبديل الأدوار بعد توقيع التوكن |
| قفل حساب: الجلسات تُلغى فورًا؟ | **نعم** | `users.service.ts:187-189` يستدعي `revokeAllForUser`. والتعليق `:171-178` يشرح: الدخول والتحديث يرفضان الحساب غير النشط أصلًا، لكن توكن وصول صدر قبل دقيقة يبقى صالحًا 15 دقيقة، و"suspension that waits for that is not a suspension". والاستعادة لا تُلغي شيئًا — لا شيء لتُلغيه، وليست حادثة أمنية |
| تكلفة الحل per-request | **قراءتان دفعتان**، أيًا كان عدد الأدوار | `roles.service.ts:61-92`: `findByIds` للأدوار ثم `findByIds` للصلاحيات، مع short-circuit عند صفر أدوار أو صفر صلاحيات (`:65-76`) |
| فهرس على المقروء؟ | **نعم، ضمنيًا** | القراءتان على `_id` (`base.repository.ts:27-34`, `$in` على `_id`) — الفهرس الافتراضي. ولا حاجة لفهرس مُصرَّح |

### 4.4 أسئلة البند 4-هـ — الداشبورد

**منين الداشبورد بيجيب الصلاحيات؟** من `GET /users/me`، الذي يضيف `permissions`
فوق شكل البروفايل (`users.controller.ts:53-62`)، مأخوذة من `user` الذي حلّه
`JwtStrategy` لهذا الـrequest — فلا استعلام ثانٍ ولا احتمال أن تخالف ما ستقوله
الحُرّاس في النداء التالي (التعليق `:44-50`). والـDTO مقصور على `me` عمدًا
(`me-response.dto.ts:22-25`: "a list of users is not the place to publish
everyone's authority").

**هل السايد بار والأزرار بتستخبّى حسب الصلاحية؟** نعم، ومنهجيًا:
`navigation.ts:1` و`:386` (`hasPermission` / `canAccessResource`)، وعلى مستوى كل
شاشة — `messages-screen.ts:18, 30`، `newsroom-screen.ts:50-52, 97, 139, 219-220`،
`editorial-screen.ts:55-56`، `page-activation-state.ts:52`.

**أي مكان الـUI بيعتمد عليه لوحده في الحماية؟** **لم أجد واحدًا.** كل عنصر مخفي
في الداشبورد يقابله route محمي بنفس الزوج على الـAPI. والحالة الأقرب —
`canPublish: hasPermission(grants, entity, "Publish")` في
`page-activation-state.ts:52` — يقابلها فحص داخل الـservice نفسه
(`publishing.service.ts:560-570`) لا في الـcontroller وحده.

**الصفحات اللي الـUI بيعرضها لحد مالوش الصلاحية فيلاقي 403؟** حالة واحدة حقيقية،
وهي نتيجة P1-3: `canReview = hasPermission(grants, "workflowInstances", "Approve")`
(`editorial-screen.ts:56`, `newsroom-screen.ts:52`) منح **عام**، فالواجهة تُظهر
أدوات المراجعة لكل أنواع المحتوى لمن يحمله، بينما الخادم يرفض غير المعيَّن بـ403
من `loadAssignedStep`. طابور "المعلّق عليّ" نفسه محجوز بالتعيين
(`workflow-instances.controller.ts:63-66` → `findPendingFor`)، فالخلل في أزرار
الشاشة لا في الطابور.

### 4.5 أسئلة البند 4-و — سجل التدقيق

| العملية | مُسجَّلة؟ | القيمة القديمة؟ | الدليل |
|---|---|---|---|
| `POST /roles` | ✔ Create | — (إنشاء) | الرد مستند فيه `_id` → `audit-log.interceptor.ts` يجده |
| `PATCH /roles/:id/name` | ✔ Update | ✔ | `params.id` موجود → `snapshotBefore` يعمل (`:88-99`) |
| `PATCH /roles/:id/permissions` | ✔ Update | ✔ | نفس السبب — **قائمة الصلاحيات قبل وبعد محفوظة** |
| `DELETE /roles/:id` | ✔ Delete | ✔ | — |
| `PATCH /users/:id/roles` | ✔ Update | ✔ | `entityType` = `users`، والأدوار قبل وبعد محفوظة |
| `PUT /workflow-policies/:entityType/:operation` | ✔ Update | **✘ null** | `upsert` يعيد المستند (`workflow-policies.service.ts:210-218`) فيُوجد `_id`؛ لكن `snapshotBefore` يلزمه `params.id` وهو غائب |
| **`PUT /workflow-policies/:entityType/approval`** | **✘ لا صف إطلاقًا** | ✘ | **P1-1** |
| محاولات الوصول المرفوضة | ✔ | — | `permissions.guard.ts:72-94` — `AccessDenied` مع الفاعل والمورد والعملية وIP/UA؛ و`entityId: null` للمسارات الجماعية، والتعليق `:26-33` يذكر أن الحقل جُعل optional في اللوحة لهذه الحالة تحديدًا. والحالة الدفاعية الوحيدة (لا فاعل) تذهب للـLogger لأن لا أحد تُنسب إليه |

### 4.6 أسئلة البند 4-ز — الـBootstrap والـSeeds

| السؤال | الإجابة | الدليل |
|---|---|---|
| أي أدوار تُزرع؟ | **دور واحد: Super Admin.** لا قوالب أدوار أخرى | `seed-admin.ts:81-89`, `:156-180`. ومن هنا §6 |
| هل الصلاحيات الجديدة تُضاف للـSuper Admin فقط؟ | **نعم، فقط** | `seedSuperAdminRole` يكتب `$set: { permissionIds }` بالكتالوج كاملًا (`:164-172`). لا شيء يمسّ أي دور آخر — وهذا صحيح: إضافة صلاحية جديدة تلقائيًا لدور مخصّص هي ترقية تُنفّذها الأتمتة |
| ولو صلاحية شيلت من الكتالوج، تتشال من الأدوار؟ | **من Super Admin نعم، ومن الأدوار المخصّصة لا** | `$set` يعيد كتابة قائمة Super Admin فتسقط منها. و`seedPermissions` (`:126-147`) **upsert فقط** — لا يحذف صف صلاحية غاب عن الكتالوج، فيبقى الصف في القاعدة ويبقى في أي دور مخصّص يحمله. أثره العملي صفر (الـroute الذي كان يحرسه اختفى) لكنه يُبقي صفوفًا ميتة في قائمة الاختيار. **P2-3** |
| هل التشغيل الثاني آمن (idempotent)؟ | **نعم، وبعناية** | `seedPermissions` يفعل upsert على الزوج (resourceType, action) لا على الاسم — "the pair, not the label, is the identity" (`:118-125`)، و`$setOnInsert` للاسم حتى لا يمحو إصدارٌ تاليًا تسميةً عدّلها أدمن. و`seedAdminUser` (`:181-196`) **يترك الحساب القائم كما هو تمامًا — كلمة المرور والأدوار والحالة** — والتعليق يشرح أن إعادة منح Super Admin لحساب خفّضه أدمن عمدًا ستكون ترقية صلاحيات تُنفّذها الأتمتة، وهو ما وُجد الـRBAC لمنعه. **صحيح أمنيًا، وهو نفسه سبب انعدام مسار الاستعادة في P1-5** |

---

## 5. المخاطر

### P0

| # | الوصف | الدليل | الأثر | التوصية | التكلفة |
|---|---|---|---|---|---|
| **P0-1** | `users:Create` تساوي Super Admin — قاعدة "لا تمنح ما لا تملك" مطبّقة على بناء الدور لا على إسناده | التفصيل الكامل في §2 | ترقية كاملة في نداءين، بلا أثر يسمّيها ترقية | تطبيق `assertGrantable` على الإسناد في `create` و`assignRoles` | **0.5-1 يوم** |

### P1

| # | الوصف | الدليل | الأثر | التوصية | التكلفة |
|---|---|---|---|---|---|
| **P1-1** | **تغيير سياسات الموافقة لا يُسجَّل إطلاقًا** | `configure` يعيد `GovernableEntity` (`approval-configuration.service.ts:22-36`) وليس فيه `_id` ولا `id`؛ ومعامِلات المسار `entityType` لا `id`. فمصدرا `rawEntityId` في `audit-log.interceptor.ts` كلاهما `undefined` → `if (!entityType \|\| !rawEntityId) return;` (`:152-156`) يتخطّى الصف بصمت | تشغيل الموافقات وإيقافها وتغيير من يعتمد — أخطر إعداد في المنصة — بلا أي أثر: لا فاعل ولا وقت ولا قيمة قديمة. وحتى المسار الشقيق `PUT /:entityType/:operation` يُسجَّل بلا `previousValue`، فـ"تحوّلت من موافقة إلى نشر مباشر" غير قابلة للاستخراج من السجل | أبسط إصلاح موضعي: إعادة `_id` السياسة في حِمل الرد. الأصحّ: كتابة صفّ `StatusChange` صريح داخل `configure` بنفس نمط `WorkflowInstancesService.writeStatusChangeAudit` (`workflow-instances.service.ts:667-686`) مع `@SkipAuditLog()`، فلا يعتمد على شكل الرد | **3-4 ساعات** |
| **P1-2** | إيقاف الموافقات أثناء مراجعة جارية يشلّ المحتوى | `disable()` (`approval-configuration.service.ts:131-143`) بلا `assertNothingRunning`، بخلاف مسار تغيير الترتيب (`:109-111`). ثم `publishDirect` يرفض (`publishing.service.ts:117-124`) و`publishApproved` يرفض (`:224-228`) | محتوى `InProgress` غير قابل للنشر بأي طريق، والمخرج الوحيد إلغاء المراجعة — والأدمن لا يُحذَّر قبل الحفظ، ولا أثر في السجل (P1-1) | استدعاء `assertNothingRunning` في `disable` أيضًا، أو السماح مع تحذير صريح يسمّي عدد المراجعات التي ستُلغى (`inFlightReviews` محسوب أصلًا في `GovernableEntity:35`) | **2-3 ساعات** |
| **P1-3** | `Approve` صلاحية واحدة على مستوى المنصة، لا لكل نوع محتوى | `Approve` على مورد واحد من 69 (قياس آلي)؛ الأربع routes كلها `workflowInstances:Approve` (`workflow-instances.controller.ts:73, 85, 97, 121`). التحجيم الوحيد `assigneeIds` (`workflow-instances.service.ts:652-665`) | **"مراجع للأخبار لا لوثائق الحوكمة" غير قابل للتعبير عنه كصلاحية** — وهو نصّ نموذج التشغيل. والداشبورد يُظهر أدوات المراجعة لكل الأنواع لمن يحمل المنح العام (§4.4) | خيارات في §8 سؤال 2 | حسب الخيار |
| **P1-4** | لا فصل للمهام: المؤلف يعتمد محتواه | موثّق صراحةً: `workflow-instances.service.ts:130-132` — "no author-field comparison exists or is performed" | مع `requiredApprovals: 1` تصبح "قائمة الموافقات" إجراءً لشخص واحد. لا يُرصد في أي شاشة | مقارنة `revision.createdBy` بالمعتمِد ورفض التطابق — أو على الأقل تحذير الأدمن حين يكون المعتمِد الوحيد هو المحرر الوحيد | **0.5 يوم** |
| **P1-5** | لا حماية لآخر Super Admin، ولا مسار استعادة | `assignRoles` و`updateAccountStatus` يرفضان الذات فقط (`users.controller.ts:118, 151`). و`seedAdminUser` يترك الحساب القائم كما هو (`seed-admin.ts:181-196`) | حاملٌ ثانٍ لـ`users:Update` يقدر يقفل حساب الـSuper Admin الوحيد أو يسلبه دوره. إعادة تشغيل الـbootstrap **لا** تستعيده. الاستعادة تحتاج وصولًا مباشرًا لقاعدة البيانات | رفض سلب دور `isSystemRole` من آخر حامل نشط، ورفض قفل حسابه. فحص واحد في كل من المسارين | **3-4 ساعات** |
| **P1-6** | دورة التحرير موجودة لـ5 أنواع من 10 قابلة للحكم | `editorialState`/`submit`/`publishApproved`/`publishDirect`/`restore` موصولة في `articles` و`aboutFederationPage` و`presidentMessagePage` و`strategicPlansPage` و`visionMissionPage` فقط (قياس آلي على الـcontrollers). و`governanceDocuments` و`organizationalStructure` و`committees` و`documents` **بلا `Publish` في الكتالوج أصلًا**، فلا دور يقدر يحملها يومًا | الأدمن يقدر يشغّل الموافقات لخمسة أنواع لا يوجد لها مسار تقديم ولا مسار نشر. السياسة تُضبط وتبقى خاملة، بلا رسالة تقول لماذا | إما وصل الأنواع الخمسة بدورة التحرير، أو حجب ما ليس موصولًا من شاشة السياسات حتى يُوصَل | **يوم لكل نوع**، أو **2-3 ساعات** للحجب |
| **P1-7** | شاشة السياسات تعرض 13 نوعًا، ثلاثة منها ترفض أي حفظ | `listGovernable()` يمرّ على `WORKFLOW_ENTITY_TYPES` الـ13 بلا تصفية (`approval-configuration.service.ts:72-74`)، بينما `configure()` يرفض أي نوع غائب عن `PERMISSION_RESOURCES` (`:216-222`). و`staticPages` و`externalMediaCoverage` و`publicEvents` بلا مورد صلاحيات (قياس آلي) | الأدمن يرى ثلاثة أنواع، يضبطها، ويأخذ 400 عند الحفظ | تصفية `listGovernable` بنفس شرطَي `assertGovernable` — الشرط مكتوب أصلًا، الناقص استدعاؤه | **1 ساعة** |
| **P1-8** | 30 موردًا يملك Create/Delete بلا Update | قياس آلي. القائمة في **الملحق ب** | امتداد على مستوى المنصة لـP1-1 في المراجعة السابقة (التي سمّت 4). تصحيح أي سجل من الثلاثين = حذف وإنشاء، فتُكسر المراجع إليه | قرار واحد في §8 سؤال 1 بدل 30 قرارًا | حسب الخيار |
| **P1-9** | معيَّن سُحبت صلاحيته يبقى في `assigneeIds` | الحلّ per-request يرفضه فورًا (`access-control.integration.spec.ts:143`)، ولا شيء ينزعه من الخطوة | المراجعة تبقى معلّقة عليه وتُحسب في `requiredApprovals`؛ وإن كان العدد يساوي عدد المعيّنين فهي متوقفة. وتعديل الترتيب مرفوض أثناء مراجعة جارية (`approval-configuration.service.ts:109-111`)، فالمخرج الوحيد الإلغاء | إظهار "معيَّن لم يعد قادرًا" في `GovernableEntity` وفي شاشة المراجعة، قبل أن تتوقف | **0.5 يوم** |

### P2

| # | الوصف | الدليل | التوصية | التكلفة |
|---|---|---|---|---|
| P2-1 | `HardDelete` و`EditProtectedData`: صفر مورد لكل منهما | قياس آلي؛ الـenum في `permission.schema.ts:10-18`، وتسميات عربية مزروعة لهما في `seed-admin.ts:105-115` | حذفهما من المفردات، أو تعليق يقول إنهما محجوزان. و`allowHardDelete` على السياسات (`workflow-policy.schema.ts:36-37`) لا يحرس شيئًا كذلك | 1 ساعة |
| P2-2 | حذف دور يفصله عن كل حامليه في نداء واحد | `roles.service.ts:141-157` | مُسجَّل وقابل للعكس بإعادة الإسناد؛ يكفي تأكيد في الواجهة يذكر عدد الحسابات المتأثرة | 1-2 ساعة |
| P2-3 | صلاحية تُرفع من الكتالوج تبقى في القاعدة وفي الأدوار المخصّصة | `seedPermissions` upsert بلا حذف (`seed-admin.ts:126-147`) | فحص يُبلّغ عن الصفوف اليتيمة بدل حذفها تلقائيًا | 2-3 ساعات |
| P2-4 | `passwordResetToken` و`passwordResetExpiresAt` بلا أي مسار | `user.schema.ts:87-91`؛ `grep` على الـcontrollers → صفر | حقلان ميتان: إما بناء المسار أو إزالتهما. (وغيابهما هو ما يقصر P0-1 على `users:Create`) | حسب القرار |
| P2-5 | `GET /users` يكشف `roleIds` لكل حامل `users:Read` | `users.service.ts:201` | تضييقه يرفع حاجز P0-1 ولا يغلقه — لا يُغني عن إصلاح P0-1 | 1 ساعة |

### تحقّق / ليست مشكلة

- **تماسك الكتالوج مفروض آليًا في الاتجاهين** — `permission-catalogue.spec.ts:34-45`. صفر مورد يتيم في أي اتجاه.
- **لا route كتابة بلا حماية وبلا `@Public()`.** والستة "بلا صلاحية" كلها نطاق صاحبها، والهوية من التوكن لا من الـbody، و`markRead` منطاقة في الـrepository → لا IDOR.
- **الكتابات غير المصدَّق عليها ثلاث فقط:** login، refresh، نموذج الاتصال العام.
- **الاعتماد والنشر مفصولان بقرار مالك 2026-09-20.** الاعتماد يترك المراجعة على `Approved` ويتوقف، والصنف لا يعتمد على `PublicationsService` إطلاقًا — "the absence is the guarantee" (`workflow-instances.service.ts:47-58`).
- **`Publish` مفحوصة داخل الـservice** لا في الـcontroller وحده (`publishing.service.ts:560-570`)، فلا يقدر route مستقبلي يركّبها بلا الفحص.
- **قفل تزامن متفائل على النشر المباشر** (`expectedUpdatedAt`, `publishing.service.ts:128-137`) + موانع نشر (`publish-blockers.ts`).
- **تغيير الصلاحيات فوري بلا cache**، وعليه 6 اختبارات تكامل (`access-control.integration.spec.ts:121-173`).
- **القفل يُبطل الجلسات فورًا** (`users.service.ts:187-189`)، والتحديث يعيد فحص حالة الحساب (`auth.service.ts:99-101`).
- **الأدوار الأساسية محمية** من التسمية والحذف وإعادة كتابة الصلاحيات، حتى وهي مؤرشفة (`roles.service.ts:196-207`).
- **"لا تمنح ما لا تملك" مطبّقة على مسارَي بناء الدور معًا** (`roles.service.ts:35`, `:131-136`).
- **قاعدة التماسك**: كل منح كتابة يستلزم قراءة المورد حيث توجد قراءة محروسة، و13 موردًا مستثنى بوعي وبتوثيق (`permission-implications.ts:13-26`).
- **التفويض مُطفأ ويجيب 403** (`workflow-instances.service.ts:21`, `:384-392`)، وسببه موثّق: خطوة تنتمي للتعريف لا للمراجعة، فتفويض واحد يفتح كل مراجعات ذلك التعريف.
- **الـseeds idempotent**، وتسميات الأدمن تنجو من الإصدارات (`$setOnInsert`).
- **الرفض مُسجَّل** بالفاعل والمورد والعملية وIP/UA (`permissions.guard.ts:72-94`).
- **الداشبورد يخفي بالصلاحية** في التنقّل وفي كل شاشة، ولم أجد حماية تعتمد على الواجهة وحدها.
- **الأنواع الثلاثة غير المبنية مرفوضة عند الحفظ** (`assertGovernable`) — الخلل في العرض لا في التصريح (P1-7).

---

## 6. قوالب الأدوار المقترحة

المنصة تزرع دورًا واحدًا (Super Admin)، فكل دور آخر يُبنى من الصفر أمام 215 خيارًا.
هذه ستة قوالب لاتحاد بـ30-50 حسابًا. **مقترحة للموافقة، غير مزروعة.**

قاعدة التماسك تضيف `Read` المورد تلقائيًا لكل منح كتابة، فأعمدة القراءة مذكورة
ضمنًا. والأعداد بعد إصلاح P0-1، وإلا فكل دور يحمل `users:Create` يساوي Super Admin.

| الاسم | الغرض | الصلاحيات |
|---|---|---|
| **محرر محتوى**<br>Content Editor | يكتب ويعدّل، ولا يقرّر متى يظهر شيء | `articles:Create/Update`، `mediaAssets:Create`، `albums:Create/Update`، `videos:Create/Update`، `heroSlides:Create/Update`، `revisions:Create`، `<الصفحات المفردة>:Update` للصفحات المسؤول عنها. **بلا `Publish` وبلا `Delete` وبلا `workflowInstances:Approve`** |
| **مراجع**<br>Reviewer | يقرأ المعروض عليه ويعتمد أو يردّ | `workflowInstances:Read/Approve`، `revisions:Read`، `workflowActionHistory:Read`، و`Read` أنواع المحتوى التي يراجعها. **بلا `Publish` وبلا أي `Create`/`Update` على المحتوى** — وهذا ما يجعله مراجعًا لا محررًا. ⚠️ `Approve` عامة اليوم (P1-3): التحجيم الفعلي من `assigneeIds`، فالدور يُقيَّد بمن يُعيَّن لا بما يحمل |
| **ناشر**<br>Publisher | يقرّر لحظة الظهور | `<كل نوع>:Publish`، `publications:Read/Publish`، `revisions:Read`، و`Read` ما ينشره. **بلا `Create`/`Update`** — الفصل هو الغرض: من يكتب لا يقرّر النشر |
| **مسؤول الحوكمة**<br>Governance Officer | المجلس واللجان والهيكل والوثائق | `committees:*`، `federationPersonnel:*`، `federationAppointments:*`، `electionCycles:*`، `organizationalStructure:*`، `governanceDocuments:*`. ⚠️ الأربعة الأولى بلا `Update` اليوم (P1-8)، والأربعة الحاكمية بلا `Publish` (P1-6) |
| **مسؤول رياضي**<br>Sports Registrar | الرياضيون والمدربون والأندية والنتائج | `athletes:*`، `athleteProfiles:*`، `coaches:*`، `clubs:*`، `clubTeams:*`، `officials:*`، `disciplines:*`، `ageCategories:*`، وسجلات التاريخ. `Export` حيث يلزم تقرير |
| **مشاهد تقارير**<br>Reports Viewer | يقرأ ويصدّر، ولا يكتب شيئًا | `Read` على ما يخصّه، و`athletes:Export`، `clubs:Export`، `contactMessages:Export`، `users:Export`، و`auditLogs:Read/Export`. **صفر عمليات كتابة** |

**غير مقترح كقالب: "مسؤول المستخدمين".** الدور الذي يبدو أوضح الستة هو الأخطر:
`users:Create` تساوي Super Admin اليوم (P0-1). حتى يُصلَح، إدارة الحسابات تبقى مع
فريق NoTime. وبعد الإصلاح يصبح قالبًا مشروعًا:
`users:Create/Update/Read/Export` + `roles:Read`.

---

## 7. التعارض مع برومبت التنفيذ الجاي

البرومبت القادم ينوي شيئين: إضافة `Update` لأربعة موارد، وإضافة
`federationPersonnel` للـworkflow. لا تعارض في أيٍّ منهما، لكن كلًّا منهما **أصغر
مما يلزم**، وكلاهما مؤخَّر عن P0-1.

**1. `Update` للأربعة — صحيح لكنه جزء من 30.**
المراجعة السابقة سمّت 4 موارد؛ القياس الآلي هنا يقول **30** (الملحق ب). تنفيذ
الأربعة وحدها يترك نفس العيب على 26 موردًا ويُخفيه، لأن الأربعة كانت هي المرئية.
**القرار الأنفع: حكم واحد على الثلاثين** (§8 سؤال 1). وكل `Update` جديد يلزمه
احترام فخّ الدمج الموثّق في `users.service.ts:229-240` — تحت `ES2023` كل خاصية
معلنة موجودة على الـDTO كـ`undefined`، فالدمج الساذج يمحو ما لم يُرسَل.

**2. `federationPersonnel` في الـworkflow — لن يعمل بإضافته للقائمة وحدها.**
P1-6 هو الدليل: `committees` داخل القائمة **اليوم** ولا يُنشر ولا يُقدَّم — لا
`Publish` في الكتالوج ولا مسار تقديم ولا مسار نشر. إضافة `federationPersonnel`
بنفس الطريقة تضعه في نفس الحالة الخاملة بالضبط. يلزم معه:

1. `federationPersonnel` في **`PUBLICATION_ENTITY_TYPES`** (القائمة ب) لا في
   القائمة أ وحدها — وإلا لا نشر ولا `publicationState`.
2. `federationPersonnel:Publish` في الكتالوج، **و**route يحرسه — وإلا فالصلاحية
   غير موجودة، فلا دور يقدر يحملها، فـ`publishApproved` يرفض الجميع دائمًا
   (`publishing.service.ts:210` → `assertPermission`).
3. صفّ في **`PUBLISH_REQUIREMENTS`** (`entity-content.ts:34-52`). وهذا **مضمون
   مكانيًا**: النوع `Record<PublicationEntityType, readonly string[]>` سيُنتج خطأ
   ترجمة حتى يُضاف الصف — بوابة مفيدة، ودليل أن الإضافة ليست سطرًا واحدًا.
4. المسارات الخمسة لدورة التحرير:
   `editorialState` / `submit` / `publishApproved` / `publishDirect` / `restore`.
5. `publicationState` على الـschema، وتحويل القراءة العامة لتمرّ بـ
   `publications → revisions.snapshotData` بدل الصف نفسه — وهو ما يعني أن P0-1 في
   المراجعة السابقة (صفحة المجلس) يجب أن يُصلَح **قبل** هذا لا بعده، وإلا فالصفحة
   ستقرأ مسارًا يتغيّر تحتها.
6. توسيع قائمة مغلقة بقرار FigJam `100:7435` ← يلزمه ADR (المراجعة السابقة، سؤال 2).

**الترتيب الذي أوصي به:** P0-1 أولًا (نصف يوم، يغلق ترقية صلاحيات كاملة) ← P1-1
(ثلاث ساعات، يستعيد الأثر على أخطر إعداد) ← ثم قرار الثلاثين ← ثم
`federationPersonnel` كاملًا بالبنود الستة.

---

## 8. أسئلة تحتاج قرارك

**سؤال 1 — الـ30 موردًا بلا `Update` (P1-8).**

1. **`Update` للثلاثين، دفعة واحدة**: ~4-5 أيام. المقايضة: 30 route و30 DTO جزئيًا و30 مجموعة اختبارات؛ الأعلى تكلفة والأقل مفاجآت لاحقًا.
2. **الأربعة في البرومبت القادم فقط**: ~1.5-2 يوم. المقايضة: يُصلح المرئي ويترك 26 عيبًا بنفس الشكل، ويُخفي القاعدة.
3. **`Update` لما يحرّره بشر، وترك سجلات النظام بلا تعديل**: ~2-3 أيام. المقايضة: تحتاج تصنيف كل مورد مرة واحدة، والتصنيف نفسه هو القيمة — ويكتب القاعدة صراحةً بدل تركها للحالة.

**توصيتي: (3).** الثلاثون ليست فئة واحدة. `federationPersonnel` و`committees`
و`athletes` سجلات يحرّرها بشر ويخطئ فيها، فغياب `Update` عيب. أما `revisions`
و`permissions` فسجلات غير قابلة للتغيير بحكم طبيعتها، وإضافة `Update` لها تفتح ما
يجب أن يبقى مقفولًا. و(1) تصرف أربعة أيام لتفتح ما لا يجب أن يُفتح.

**سؤال 2 — تحجيم `Approve` لكل نوع محتوى (P1-3)؟**

1. **يبقى منحًا عامًا، والتحجيم من `assigneeIds`**: صفر تكلفة. المقايضة: "مراجع للأخبار لا لوثائق الحوكمة" لا يُعبَّر عنه كصلاحية ولا يظهر في شاشة الأدوار؛ ويظل الداشبورد يُظهر أدوات مراجعة يرفضها الخادم بـ403.
2. **`<entityType>:Approve` لكل نوع قابل للحكم** (10 أزواج)، مع فحصه في `WorkflowInstancesService.approve` بجانب التعيين: ~1.5-2 يوم. المقايضة: يطابق نمط `Publish` القائم تمامًا (19 موردًا، مفحوصة داخل الـservice)، ويصبح الدور مقروءًا من شاشة الأدوار وحدها. يلزمه توسيع الكتالوج وتحديث الداشبورد.
3. **إبقاء المنح عامًا وتصحيح الواجهة فقط** — إظهار أدوات المراجعة فقط لما يكون الشخص مُعيَّنًا عليه فعلًا: ~4 ساعات. المقايضة: يغلق الـ403 المزعج ولا يعطي الأدمن أي تحكم؛ من يعتمد يبقى قرار تعيين لا قرار دور.

**توصيتي: (2).** نموذج التشغيل يقول "مراجعين ومعتمدين **لأنواع محتوى معينة**"،
وهذه الجملة لا تُنفَّذ بالخيار 1 ولا بالخيار 3. والنمط موجود ومُجرَّب في المنصة
نفسها: `Publish` لكل نوع، مفحوصة داخل الـservice. و(3) يُجمَّل العرض ويترك القرار
حيث لا يراه الأدمن.

**سؤال 3 — فصل المهام: هل يُمنع المؤلف من اعتماد نصّه (P1-4)؟**

1. **منع صريح**: رفض الاعتماد حين يكون المعتمِد هو `revision.createdBy`. ~0.5 يوم. المقايضة: في اتحاد صغير قد يكون المحرر الوحيد هو المراجع الوحيد لنوع ما، فيتوقف النشر تمامًا حتى يُعيَّن ثانٍ.
2. **تحذير بلا منع**: إظهار "المعتمِد الوحيد لهذا النوع هو محرره" في شاشة السياسات. ~3 ساعات. المقايضة: لا يمنع شيئًا، ويجعل الاختيار واعيًا ومرئيًا.
3. **منع قابل للإيقاف لكل نوع** (`allowSelfApproval` على السياسة): ~1 يوم. المقايضة: يجمع الاثنين ويضيف مفتاحًا إلى شاشة صرّح التوثيق أن بساطتها مقصودة.

**توصيتي: (2) الآن، و(1) عند وجود مراجعين كفاية.** بـ30-50 حسابًا قد لا يكون هناك
شخصان مؤهلان لكل نوع، والمنع الصلب يوقف النشر بلا بديل. والتحذير يجعل المخاطرة
مرئية بدون أن يشلّ العمل — وهو ما يسمح باعتماد (1) لاحقًا بأمان.

**سؤال 4 — حماية آخر Super Admin (P1-5).**

1. **رفض سلب دور `isSystemRole` من آخر حامل نشط، ورفض قفل حسابه**: ~3-4 ساعات. **توصيتي.** يُغلق القفل الكامل بفحصين، ولا يضيف أي مفهوم جديد.
2. **مسار استعادة في الـbootstrap** (متغيّر بيئة صريح يعيد تنشيط حساب ويعيد منح الدور): ~0.5 يوم. المقايضة: يخلق بابًا خلفيًا لمن يملك الوصول للسيرفر — وهو بالضبط ما رفضه التعليق في `seed-admin.ts:181-189` بوعي.
3. **الإبقاء على الحال**: صفر تكلفة. المقايضة: خطأ واحد من حامل `users:Update` يُخرج المنصة من سيطرة أصحابها، والاستعادة تحتاج وصولًا مباشرًا لقاعدة البيانات.

---

## 9. الاختبارات الناقصة (أسماء فقط)

**`users.service.role-assignment.spec.ts`** (حرس P0-1 — الأهم)
- `refuses to assign a role carrying a permission the actor does not hold`
- `refuses to create an account with a role carrying a permission the actor does not hold`
- `refuses to assign a system role to any account`
- `users:Create alone cannot produce an account more privileged than its creator`
- `allows assigning a role whose permissions are a subset of the actor's`

**`workflow-policies.audit.spec.ts`** (حرس P1-1)
- `configuring approval for an entity type writes an auditLogs row`
- `the row names the actor, the entity type, and the previous arrangement`
- `turning approvals off records what it was before it was off`

**`approval-configuration.lifecycle.spec.ts`** (حرس P1-2 و P1-9)
- `refuses to disable approvals while reviews are running, naming how many`
- `an InProgress review is never left unpublishable by both paths at once`
- `an already-Approved review still publishes after its policy becomes direct`
- `reports an assignee who no longer holds the Approve permission`

**`workflow-instances.separation-of-duties.spec.ts`** (حرس P1-4)
- `records that the approver is the author of the revision`
- `a single-approver step whose approver is the author is reported as such`

**`roles.service.last-super-admin.spec.ts`** (حرس P1-5)
- `refuses to remove the last system role from its last active holder`
- `refuses to suspend the last active Super Admin`
- `allows both while a second active holder exists`

**`permission-catalogue.coverage.spec.ts`** (حرس P1-6 و P1-7)
- `every PUBLICATION_ENTITY_TYPES member has a Publish permission in the catalogue`
- `every entity type listed as governable accepts a configuration`
- `every governable entity type has a submit and a publish route`

**`route-guard-coverage.spec.ts`** (يحوّل قياس §3 إلى حرس دائم)
- `every mutating route carries either @RequirePermission or @Public`
- `every route with neither derives its subject from the token, not the body`
- `no @Public route writes anything but a session or a public submission`

**`navigation.permissions.spec.ts`** (حرس §4.4)
- `hides a review control for an entity type the user is not assigned to`
- `no navigation entry appears without the grant its route requires`

---

## 10. تحقّق من القيود

| القيد | الحالة |
|---|---|
| لم يُعدّل أي ملف كود | ✔ الملف الوحيد المُنشأ في المستودع هو هذا التقرير. سكربتات القياس الثلاثة في مجلد الجلسة المؤقت، خارج المستودع |
| لم يُنفّذ أي أمر Git | ✔ ولا أمر واحد |
| لا dependencies ولا seeders ولا كتابة DB | ✔ |
| تشغيل واحد للاختبارات المرتبطة | ✔ 11 suites / 109 tests ناجحة |
| المواضع المحمية لم تُمسّ | ✔ الحلّ per-request و`permissions.guard.ts` ومحرك الـworkflow وسياساته و`AuditLogsRepository`: قراءة فقط |
| لا تنفيذ لأي اقتراح | ✔ توسيع الكتالوج وقوالب الأدوار وتغييرات الـguard: كلها معروضة كخيارات بتكلفة وتوصية |
| ما غطّته المراجعة السابقة لم يُكرَّر | ✔ مُشار إليه في §7 فقط |

---

## الملحق أ — المصفوفة الكاملة (69 موردًا × العمليات)

`C`=Create · `R`=Read · `U`=Update · `D`=Delete · `P`=Publish · `A`=Approve · `X`=Export

| المورد | العمليات | | المورد | العمليات |
|---|---|---|---|---|
| aboutFederationPage | R U P D | | mediaAssets | C R D |
| ageCategories | C R D | | memberships | C R U D |
| albums | C R U D P | | navigationItems | C R U D |
| albumsPage | U P | | navigationMenus | C R D |
| articles | C R U D P | | newsPage | U P |
| athleteClubHistory | C R U D | | notifications | C |
| athleteCoachHistory | C R D | | officialAssignments | C R D |
| athleteGuardianRelationships | C R D | | officialClubHistory | C R U D |
| athleteNationalTeamHistory | C R D | | officialProfiles | C R D |
| athleteProfiles | C R D | | officials | C R D |
| athletes | C R D X | | organizationalStructure | C R U D |
| athletesPage | U P | | pageSections | C R U D |
| auditLogs | R X | | pages | C R D |
| boardMembersPage | U P | | partnerships | C R U D |
| clubTeams | C R D | | permissions | C R |
| clubs | C R D X | | presidentMessagePage | C R U P D |
| clubsPage | U P | | publications | R P |
| coachClubHistory | C R U D | | recordsPage | U P |
| coaches | C R D | | resultsRankingsPage | U P |
| coachesPage | U P | | revisions | C R |
| committees | C R D | | roles | C R U D |
| committeesPage | U P | | siteSettings | R U |
| contactMessages | R U D X | | sponsors | C R U D |
| contactUsPage | U P | | sponsorships | C R U D |
| countries | C R D | | strategicPlansPage | C R U P D |
| disciplines | C R D | | users | C R U X |
| disciplinesPage | U P | | venues | C R D |
| documents | C R D | | videos | C R U D |
| electionCycles | C R D | | videosPage | U P |
| federation | C R D | | visionMissionPage | C R U P D |
| federationAppointments | C R D | | workflowActionHistory | R |
| federationPersonnel | C R D | | workflowDefinitions | C R D |
| governanceDocuments | C R D | | workflowInstances | C R U **A** |
| heroSlides | C R U D | | workflowPolicies | C R U |
| | | | workflowSteps | C R D |

## الملحق ب — الـ30 موردًا بلا `Update` (P1-8)

`ageCategories` · `athleteCoachHistory` · `athleteGuardianRelationships` ·
`athleteNationalTeamHistory` · `athleteProfiles` · `athletes` · `clubs` ·
`clubTeams` · `coaches` · `committees` · `countries` · `disciplines` ·
`documents` · `electionCycles` · `federation` · `federationAppointments` ·
`federationPersonnel` · `governanceDocuments` · `mediaAssets` ·
`navigationMenus` · `notifications` · `officialAssignments` ·
`officialProfiles` · `officials` · `pages` · `permissions` · `revisions` ·
`venues` · `workflowDefinitions` · `workflowSteps`

الأربعة التي سمّتها المراجعة السابقة (`federationPersonnel`،
`federationAppointments`، `committees`، `electionCycles`) هي أول أربعة صادفها
بناء صفحات المجلس واللجان — لا فئة قائمة بذاتها.

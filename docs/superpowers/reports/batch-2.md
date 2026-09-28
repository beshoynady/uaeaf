# الدفعة 2 — خريطة القدرات والقاموس والمقارنة الواحدة

**الحالة: قيد التنفيذ.** Tasks 1–6 و13 خلصوا ومتراجعين. Tasks 7–12 فاضلين.

هذا تقرير مرحلي يُحدَّث حتى نهاية الدفعة. كُتب مبكرًا بقرار: الجلسة طويلة، والسجل في المستودع أوثق من السجل في سياق محادثة.

الخطة: `docs/superpowers/plans/2026-09-27-batch-2-capability-map.md` (2338 سطر، 12 مهمة، وجولتا تعديلات بعد مراجعة مستقلة).

---

## 1. الخلاصة

### اللي خلص

| المهمة | النتيجة | المراجعة |
|---|---|---|
| **Task 1** — خريطة القدرات، والكتالوج مشتق منها | 78 موردًا، 321 زوجًا، `POST /permissions` اتشال بالكامل | `capability-map.spec.ts` **17/17** |
| **Task 2** — القاموس وترحيل الصفوف المخزنة | `migrate-delete-to-archive` مكتوب **وماتشغّلش** | المطابقة ✅، الجودة معتمدة، 3 Minor |
| **Task 3** — مقارنة واحدة (F7) | `holdsPair` بقى المقارنة الوحيدة منحة-مقابل-منحة | المطابقة ✅، الجودة معتمدة، 2 Minor |
| **Task 4** — الـ`scope` يعيش لحد المقارنة | حقل `scope` + الـresolver بيحمله + collapse لـ`all` | ❌ ثم ✅ بعد جولة إصلاح واحدة |

### أخطر حاجة اتكشفت، وكانت في شغلي أنا

الاختبار اللي أضفته في Task 1 باسم «الاتجاه التالت» كان **tautology**: `A ⊆ A`. `PERMISSION_CATALOGUE` مشتق بنفس الـ`flatMap` اللي الاختبار بيعيد حسابه، فكان **مستحيل يفشل** — وكنت حاططه في معايير الخروج كأنه تغطية جديدة.

اتشال، واتحل محله اختبار **يقدر يفشل**: «مفيش verb في القاموس مامعلنه أي مورد». والاختبار الجديد **مسك فورًا** حاجة تانية: `ViewAuditLog` كان في القاموس ومفيش مورد بيعلنه، والسجل نفسه محروس بـ`auditLogs:Read` عام — اسمين لفعل واحد، واحد منهم مافيش حاجة بتقراه.

### التعارض بين الشرطين، والحكم عليه

`GET /users/names` جاله ستة شروط، واتنين منهم متعارضين حرفيًا: الشرط 3 بيقول الـids «مش الصالحة» تتشال بهدوء، والشرط 4 بيقول id مش ObjectId يرجع 400. الحكم: **الشكل المعطوب يترفض على الحدود، والوجود يُسكت عنه** — لأن رد بيفرّق بين «مش موجود» و«متأرشف» على route مفتوح لكل مستخدم موثّق هو أداة استكشاف حسابات.

---

## 2. الملفات اللي اتغيرت

### Task 1

| الملف | دوره |
|---|---|
| `api/src/common/authz/capability-map.ts` | **جديد.** الإعلان الوحيد: 78 موردًا (69 حقيقي + 9 مجموعة)، و`purgeable`/`superAdminOnly`/`sensitiveFields`/`scopes` |
| `api/src/common/authz/capability-map.spec.ts` | **جديد.** 17 اختبارًا، فيهم أرضية عدم-الخلو وتثبيت الموردين القابلين للتفريغ بالاسم |
| `api/src/common/constants/permission-catalogue.ts` | 258 سطرًا مكتوبين بالإيد بقوا `flatMap` واحد فوق الخريطة |
| `api/src/common/constants/permission-catalogue.spec.ts` | الأرضية العددية؛ والـtautology اتشال |
| `api/src/modules/platform-administration/permissions/schemas/permission.schema.ts` | `PERMISSION_ACTIONS` بقى 16 فعلًا |
| `api/src/common/constants/permission-resources.ts` | +9 موارد مجموعة |
| `api/src/common/decorators/permissions.decorator.ts` | بقى **يستورد** `PermissionAction` بدل ما يكرره — **والنسختين كانوا اختلفوا فعلًا** |
| 48 ملف controller + الكتالوج | `Delete` → `Archive`: 48 decorator و47 صف |
| `api/src/modules/platform-administration/permissions/permissions.controller.ts` | `POST` اتشال |
| `api/src/modules/platform-administration/permissions/permissions.service.ts` | `create` اتشال |
| `api/src/modules/platform-administration/permissions/dto/create-permission.dto.ts` | **اتحذف** |
| `api/src/modules/workflow/audit-logs/audit-logs.controller.ts` | `auditLogs:Read` → `auditLogs:ViewAuditLog` |

### Task 2

| الملف | دوره |
|---|---|
| `api/src/migrate-delete-to-archive.ts` | **جديد.** الترحيل، idempotent، **وماتشغّلش** |
| `api/src/migrate-delete-to-archive.spec.ts` | **جديد.** 5 اختبارات، فيهم اختبار Q-E على الـresolver الحقيقي |

### Task 3

| الملف | دوره |
|---|---|
| `api/src/modules/platform-administration/roles/roles.service.ts` | `assertGrantable` بقى بينادي `holdsPair`؛ المقارنة المكرّرة اتشالت |
| `api/src/modules/platform-administration/users/user-authority.ts` | تعليق بيسمّي كل مواضع الاستخدام والاستثناءات |
| `api/src/modules/platform-administration/roles/roles.service.one-comparison.spec.ts` | **جديد** |

### Task 4

| الملف | دوره |
|---|---|
| `api/src/modules/platform-administration/permissions/schemas/permission.schema.ts` | `scope: 'own' \| 'all' \| null` |
| `api/src/modules/platform-administration/roles/roles.service.ts` | الـresolver بيحمل الـ`scope` ويجمع الزوج على أوسع نطاق |
| `api/src/modules/platform-administration/users/user-authority.ts` | `width` بقى مُصدَّرًا عشان مايتكررش |
| `api/src/modules/platform-administration/roles/roles.service.scope.spec.ts` | **جديد.** فيه `it.failing` واحد **أحمر بقصد** |

### إصلاحات المتحكّم (مخلّفات مسح Task 1)

11 موضعًا كان بيسمّي أزواجًا الكتالوج مابقاش فيه: `roles.service.spec.ts` (4)، `permissions.guard.spec.ts` (4)، `permission-implications.spec.ts` (5)، `permission-implications.ts` (تعليق)، `seed-newsroom-demo.ts` (منحة حقيقية).

**وأهمهم كان اختبارًا أحمر قاعدًا:** `permissions.guard.spec.ts`، اختبار اسمه «allows the request when the resolved permission set contains a match» — الزوج المطلوب `Delete` والمملوك `Archive`، فكان بيأكد تطابقًا **مش موجود**، وبعدين مسار الرفض رمى `BSONError` على `userId` مش ObjectId فغطّى السبب. عدّى لأن الدفعة بتشغّل اختبارات الملفات المتأثرة بس، ومحدش سمّى الملف ده.

**ومامسحتش أعمى:** `'Delete'` فضل في 7 ملفات عن قصد، لأنها في `AUDIT_ACTIONS` (مشتق من method الـHTTP) و`WORKFLOW_POLICY_OPERATIONS` — قواميس منفصلة، والتاني فيه `Delete` **و**`Archive` مع بعض، وده اللي يحسمها.

---

## 3. الاختبارات

| الحزمة | النتيجة |
|---|---|
| `capability-map` | 17/17 |
| `migrate-delete-to-archive` | 5/5، والأحمر-ثم-الأخضر متأكّد منه بنقل ملف التنفيذ جنبًا |
| `permissions.guard` · `permission-implications` · `roles.service` · `one-comparison` · `capability-map` | **78/78 في 7 حزم** |
| `roles.` · `user-authority` · `access-control` (بعد إصلاح Task 4) | 69/69 في 7 حزم |
| `npx tsc --noEmit` | نضيف |

**الاختبارات السلبية:** نطاق أوسع بيترفض في الاتجاه الغلط (والمراجع أكّد إنه كان هيفشل على كود ما-قبل-Task-3)؛ ودور بيشاور على صف صلاحية مش موجود بيمنح **صفر** ومابيرميش؛ والترحيل بيرفض لو مورد شايل الصفّين؛ وزوج مُجمَّع من نطاقين بيتجمع لـ`all` **في ترتيبي الإدخال الاتنين**.

**اختبار أحمر بقصد:** `roles.service.scope.spec.ts` فيه `it.failing` بيوثّق إن مسار النشر بيتجاهل النطاق. أحمر لسبب محدد: `expect(state.availableActions).not.toContain('save')` بيفشل لأن `availableActions` **بيحتوي** `save` فعلًا.

---

## 4. الـendpoints

| Method | المسار | الصلاحية | الحالة |
|---|---|---|---|
| ~~POST~~ | ~~`/permissions`~~ | — | **اتشال بالكامل** (المسار والدالة والـDTO) |
| GET | `/audit-logs` | `auditLogs:ViewAuditLog` (كانت `Read`) | معدّلة |
| GET | `/users/names?ids=` | **بلا صلاحية**، موثّق الهوية بس | قيد التنفيذ في Task 5 |

---

## 5. الـschema والسكريبتات

**التغيير الوحيد:** `permissions.scope: 'own' | 'all' | null` (افتراضي `null`) — معتمد في الـspec §9.2. مفيش index جديد.

**ترتيب السكريبتات:** الـspec §12 بقى فيه خطوة **7a** — `migrate-delete-to-archive` — ومعاها إثبات إنها آمنة في أي ترتيب نسبةً لـ`sync:permissions`. وكمان اتصلّحت غلطة في الـspec: الخطوة 9 كانت بتقول «القوالب السبعة» وبقت **الستة**.

**مفيش سكريبت اتشغّل. مفيش dependency. مفيش أمر Git بيغيّر حاجة.**

---

## 6. المراجعات المستقلة

**مراجعة الخطة** رجعت 8 فجوات و8 تعارضات و7 عيوب ترتيب و10 مواضع الخطة بتفرض فيها حاجة هي نفسها عيب. وأكّدت 11 من قياسات الخطة بالظبط، وصحّحت اتنين:

- «16 مستهلك في الموقع» — **الشكل صح والرقم مش قابل للتكرار** (11 موضع نداء، 17 موضع حلّ). الاستنتاج باقي، والرقم يتشال.
- «تعليق `purge` بيشرح سبب ترتيب التخزين-قبل-السجل» — **نصه غلط**: الترتيب صح و**التعليق مش موجود**. فـTask 7 لازم يكتبه، وإلا السبب يضيع.

**مراجعات المهام:** Task 2 ✅/معتمد، Task 3 ✅/معتمد، Task 4 ❌ ثم ✅ بعد جولة واحدة.

---

## 7. القرارات اللي أخدتها لوحدي

| القرار | السبب | لو غلط |
|---|---|---|
| تغيير القاموس اندمج في Task 1 | الخريطة بتسمّي أفعالًا القاموس مافيهوش، فمكانت هتترجم لوحدها | صفر — نفس الحالة النهائية |
| الـ3 أزواج `roles` المفقودة تتصلّح في Task 5 مش الدفعة 3 | 3 routes محروسة **دلوقتي** بأزواج مفيش دور يقدر يشيلها = endpoint محدش يقدر يناديه | diff أكبر شوية في Task 5 |
| شيل `Approve` لكل نوع من الخريطة | الكود نفسه سجّل إن الزوج ده اتجرّب وكان صامتًا وغير قابل للمنح | سطر لكل مورد في الدفعة 4 |
| `Publish` ×4 متطبّقة في كود الخدمة، والفحص هو الأعمى | `publishing.service.ts` بيتحقق منها لكل الـ12 نوع | قايمة من 4 بنود، وبتفحص نفسها |
| `ViewSensitive` يتشال (الهدف 1) | منحة مابتعملش حاجة هي العيب اللي الملف موجود عشانه | تُعلَن تاني في الدفعة 6a مع تطبيقها |
| شكل حلّ الأسماء: route لا إثراء | البديل يوزّع قراءة المستخدمين على اتناشر خدمة | route واحد يتغيّر اسمه |
| `displayName` زوج لغوي `{ar, en}` | `user.name` هو `LocalizedText` والاتنين required؛ والنص الثابت نفسه اتكتب كزوج | القيمة تبقى نصًا واحدًا |
| الشكل المعطوب 400، والوجود سكوت | رد بيفرّق على route مفتوح = أداة استكشاف حسابات | — |
| الاختبار الأحمر بقصد بدل تعديل ملف §8 بيحميه | التخمين في موضع محمي أسوأ من ثغرة موثّقة | الاختبار يتشال لما القرار ييجي |

---

## 8. الانحرافات عن البرومبت

**Task 1 نفّذه المتحكّم مش subagent**، لأنه كان نصّه متعمول وقت ما اتفق على المسار. فمالوش مراجعة مستقلة لكل مهمة — وبتغطّيه مراجعة آخر الدفعة، وهي نفس المقعد.

**مفيش worktree ولا commits لكل مهمة**، لأن §33 بيمنع أي أمر Git بيغيّر حاجة. النتيجة: حِزم المراجعة `git diff` على شجرة العمل، ومفيش حدود لكل مهمة — وده ليه تكلفة حقيقية مذكورة في §9.

---

## 9. أسئلة محتاجة قرارك

### س1 — إزاي صف بنطاق `own` يتزرع؟

Task 4 ضاف الحقل. **ومفيش حاجة بتزرع صفًا له نطاق:** الكتالوج بيطلع صفًا واحدًا لكل `(مورد، فعل)`، وكله `scope: null`.

**والـspec نفسه هو الدليل إن ده ناقص:** §2.4 بيقول «دور شايل `own` **و**`all` للزوج الواحد يُحل لـ`all`» — وده مالوش معنى غير لو فيه صفّان. وقالب «محرر (`own` بس)» محتاج صف `own` عشان يتمنح.

**والوضع الحالي آمن، وعشان كده ده سؤال مش عيب:** كل صف `null` (عرض 0)، والـdecorators مابتطلبش نطاقًا، فالمقارنة شغالة زي الأول و`null` عمره ما يُقرأ أوسع من `own`. الميزة **ساكنة**، مش مكسورة.

1. **صفّان لكل زوج قابل للنطاق.** التكلفة: مفتاح الكتالوج لازم يشيل النطاق وإلا الصفّان يتصادموا.
2. **`null` معناه `all`.** التكلفة: بيقلب ترتيب `width()` — والمقارنة كلها معتمدة على إن الغايب هو الأضيق. **خطر حقيقي.**
3. **تفضل ساكنة للدفعة 8.**

**توصيتي: 1، في Task 9 من نفس الدفعة**، لأن Task 9 هو اللي بيقفل شكل الكتالوج. ولو الصفّان اتضافوا بعد ما الفحص يبقى أخضر، الفحص هو اللي هيتعدّل عشان يستوعبهم بدل ما يمسكهم.

**وسؤال جوه السؤال:** الأفعال اللي تاخد نطاقًا — `Update` و`Archive` و`Restore` و`Publish` بس، ولا `Read` كمان؟ `Read` بنطاق `own` معناه محرر مايشوفش غير مسوّداته، وده قرار محتوى.

### س2 — `publishing.service.ts` و`hasPermission`

بيقارن `resourceType` و`action` **بس**. وأول ما الـ`scope` بقى حقيقي، **صاحب `articles:Update` بنطاق `own` بيعدّي الفحص على مقال أي حد**. فيه `it.failing` بيوثّقها.

سيبتها من غير تنفيذ لأن الملف في محرك الـWorkflow اللي §8 بيحميه، والمسموح فيه: تسجيل الأنواع، وإكمال دورة التحرير، وA6، وA7.

1. **يُستثنى رسميًا.** التكلفة: قاعدة النطاق مابتنطبقش على مسار النشر، وهي بقت قاعدة حقيقية.
2. **يمرّ على `holdsPair`.** التكلفة: تعديل في موضع محمي، وصياغة اختبار في التعديل A2.

**توصيتي: 2.** §8 بيسمح بالتعديل «في حدود الـcapability map والنطاقات»، وده بالظبط اللي التعديل بيعمله.

---

## 10. مطلوب في الدفعة 2 بالتحديد

### الأزواج التمانية غير القابلة للمنح

| # | الزوج |
|--:|---|
| 1 | `users:Create` |
| 2 | `users:Update` |
| 3 | `users:AssignRoles` |
| 4 | `users:Read` |
| 5 | `users:Export` |
| 6 | `roles:ManageRoles` |
| 7 | `roles:Read` |
| 8 | `permissions:Read` |

**تمانية مش تسعة.** التاسع `securitySettings:ManageSecuritySettings`، ومجموعته بتيجي في الدفعة 5 — والخطة كانت بتفرض اختبارًا بيعدّ تسعة ويدور على مورد **مش موجود في `PERMISSION_RESOURCES`** خالص، يعني اختبار مستحيل يعدّي.

### الموارد القابلة للتفريغ

| المورد | الشروط |
|---|---|
| `mediaAssets` | الأربعة كاملة: متأرشف، ومفيش مرجع، وstep-up، وصف تدقيق |
| `contactMessages` | نفسها ماعدا فحص المراجع |

مثبّتين **بالاسم** في الاختبار مش بالعدد: تالت مورد قرارك انت مش تعديل.

### حقول الروابط والـrich text (الفحص بيدوّر فيها) — قيد التنفيذ في Task 7

12 حقلًا. ولسه مفيش حقل جديد اتكشف بعد جدول الـ12؛ **و`aboutSections.href` كان اكتشافًا حقيقيًا** للقياس وقت التخطيط، مكانش في القايمة الأصلية.

---

## 11. اللي فاضل

Task 5 (شغال) · Tasks 6–12 · مراجعة آخر الدفعة المستقلة · التحقق النهائي.

**قبل أي تشغيل تقيل:** الخدمات التلاتة تتقفل، ويتأكد مفيش `node` مهجور ماسك بورت (CLAUDE.md §32). الـRAM الحرّة كانت **370 MB** والتلاتة فاتحين.

---

## ملحق — تسجيل الأرشفة والاسترجاع والحذف النهائي في سجل التدقيق (قياس بطلب المالك)

**السؤال:** بعد تحويل `Delete` لـ`Archive` في قاموس الصلاحيات، الأفعال التلاتة بتتسجل في `auditLogs` تحت أنهي قيمة؟

**القياس:** `audit-log.interceptor.ts` بيشتق قيمة السجل من **method الـHTTP وبس**، ومن جدول واحد:

```
POST → Create     PATCH → Update     PUT → Update     DELETE → Delete
```

مفيش أي علاقة بين قيمة السجل وفعل الصلاحية. فالنتيجة:

| الفعل | الـroute | القيمة المسجّلة |
|---|---|---|
| أرشفة (48 مسارًا) | `@Delete(':id')` | **`Delete`** |
| الحذف النهائي (المسار الوحيد اللي بيدمّر فعلًا) | `@Delete(':id/object')` | **`Delete`** — **نفس قيمة الأرشفة** |
| استرجاع | `@Post(':id/restore')` | **`Create`** |

**تلات نتائج، والتانية والتالتة أخطر من السؤال نفسه:**

1. **48 مسار أرشفة لسه بيسجّلوا `Delete`.** الصلاحية بقت `Archive` والسجل لسه بيقول `Delete` — اختلاف اسم بس، ومش مضلّل بذاته.
2. **الأرشفة والتدمير بيتسجلوا بنفس القيمة.** يعني **السجل مايقدرش يفرّق بين فعل يرجع وفعل مايرجعش** — وده أخطر سطر في القياس ده، لأن الحذف النهائي بالتحديد هو اللي محتاج أثرًا لا لبس فيه.
3. **الاسترجاع بيتسجل كـ`Create`.** استرجاع سجل بيُقرأ في السجل كأن سجلًا **جديدًا** اتعمل. مش ناقص — **غلط**.

**وحاجة رابعة لقيتها وأنا بقيس:** `HardDelete` موجودة في الـenum **ومفيش حاجة بتكتبها أبدًا**. الموضع الوحيد بره الـschema والـDTO هو تعليق في `revisions.service.ts` بيتكلم عن فعل RBAC مستقبلي. يعني الـenum فيه قيمة تدمير ميتة، والتدمير الحقيقي بيكتب `Delete`.

### المعروض للموافقة — ومش منفَّذ

**التوسيع:** `Archive` و`Restore` و`PermanentDelete` تنضاف للـenum. و`Delete` و`HardDelete` **ماتتغيّرش ولا تتشال** زي ما قلت، لأن الصفوف القديمة لازم تفضل مقروءة.

**بس التوسيع لوحده مش كفاية، وده الجزء المهم:** القيمة مشتقة من method الـHTTP، فإضافة قيم للـenum **مش هتغيّر ولا صف**. `DELETE /articles/:id` و`DELETE /media-assets/:id/object` نفس الـmethod. فلازم الـroute نفسه يعلن قيمته. وفيه آلية موجودة خلاص من الدفعة 1: `@AuditEntity({ type, idFrom })` — فتاخد حقلًا اختياريًا `action`، والافتراضي يفضل الجدول الحالي عشان 300+ مسار مايتغيروش.

**نقطة محتاجة قرارك جواها:** الحذف النهائي يتسجل `PermanentDelete` ولا `HardDelete` (الموجودة والميتة)?

- **`PermanentDelete`** — نفس اسم الصلاحية، فالمسؤول اللي بيقرا شاشة السجل وشاشة الأدوار يشوف نفس الكلمة لنفس الفعل. التكلفة: `HardDelete` تفضل قيمة مفيش حاجة بتكتبها.
- **`HardDelete`** — مفيش قيمة ميتة. التكلفة: قاموسان بيسمّوا فعلًا واحدًا باسمين — وده بالظبط العيب اللي اتشال في الدفعة دي لما `auditLogs:Read` بقى `ViewAuditLog`.

**توصيتي: `PermanentDelete`**، وتتحمّل قيمة ميتة واحدة. قاعدتك إن القيم القديمة ماتتشالش سببها إن الصفوف القديمة تفضل مقروءة — و`HardDelete` **مالهاش ولا صف**، فهي مش بتحمي تاريخًا، هي بس موجودة. وقيمة ميتة واحدة في enum أرخص من اسمين لفعل واحد قصاد عين المسؤول.

**مستني موافقتك قبل أي تنفيذ.**

---

## ملحق 2 — Tasks 5 و6 و13 (مقفولين)

### Task 5 — الأزواج المحفوظة، وحلّ الأسماء، وقاموس السجل

خلص بعد **أربع جولات إصلاح**. المراجعة المستقلة رجعت 8 Important، و**Critical واحد لقيته أنا بقراية الـdiff قبل المراجعة**.

**الـCritical:** الرفض الشامل على مسار الإسناد كان **بيقفل إدارة الحسابات بره الـAPI** — و«الدليل القاطع كان في نفس الملف، فقرتين فوق الكود الجديد»: تعليق بيقول إن نسخة أقدم كسرت نفس الحاجة، وإن «الحارس بقى مسمار قلاووظ ونصيحته نفسها مش قابلة للتنفيذ». ورسالة `lastSuperAdmin` الحيّة لسه بتطلب الفعل اللي الـAPI بقى يرفضه.

**الحكم:** الرفض مكانه مسار **البناء** بس. القرار 4 بيقول «الـAPI يرفض أي **دور** بيحاول ياخد زوج منهم» — ودي عملية بناء. وبما إن مفيش دور مخصّص يقدر يشيل زوجًا محفوظًا، فالدور الوحيد اللي شايلهم هو المزروع، والقاعدة 1 بتكفي.

**وفخ كان هيضرب في نفس الدفعة:** `auditActionFor` كان بيرجّع فعل الصلاحية **قبل ما يبص على method الـHTTP**. فـ`GET /media-assets/unused` بتاع Task 10 (محروس بـ`mediaAssets:PermanentDelete`) كان **هيكتب صف تدقيق بحذف نهائي، مجرد إن حد فتح التقرير**.

**وتالت اختبار مابيقدرش يفشل:** حارس الانحراف كان بيفلتر على أفعال الـoverride وبعدين يأكّد **أول فرع في نفس الدالة**. اتكتب من جديد، والمراجع حدّد الإدخال اللي بيخلّيه يفشل.

### Task 6 — `Update` للـ27، وفصيلة عيوب أكبر منها

27 route، واختبار جدولي على الـ27 (المراجع كسر خدمة عن قصد وأكّد إنه بيحمر)، والـhelper المشترك اتعاد استخدامه. **والأزواج الميتة نزلت من 108 لـ81، وصفر زوج `Update` فيهم.**

**والـCritical كان في فصيلة كاملة، مؤكدة بالقياس على mongoose المثبّتة:**

```
new Types.ObjectId(null)   -> معرّف عشوائي جديد كل نداء
new Date(null)             -> 1970-01-01
```

فـ`PATCH /disciplines/:id` بـ`{"coverImage": null}` — **فعل «شيل الصورة» العادي** — كان **بيخترع معرّفًا** والسجل يشاور على ملف عمره ما وُجد. و`create()` في نفس الملف بيحرسها؛ `update()` الجديد هو اللي اتنازل.

**واتصلّحت كفصيلة:** تلات setters مشتركة (غايب / null صريح / قيمة = تلات نتايج متمايزة)، وكل الـ27 اتهجّروا **حتى الآمنين**، وحارس بيمسح المصدر. وإحدى عشر حارس null بالإيد كانت **نفس المقامرة اللي خسرت**: إن كل واحد يفتكر كل مرة للأبد.

**وبناء قايمة استثناءات الحارس كشف أربع عيوب حيّة بره النطاق**، أوحشهم `new Date(dto.startDate!)` على حقل `required: true` في تلات موارد — **الـ`!` تأكيد وقت ترجمة وبس**، فـ`{startDate: null}` بيخزّن 1970. **وده أوحش من المعرّف المخترع:** المعرّف بيشاور على العدم وبيتلاحظ، و1970 **قيمة معقولة بتترتّب وبتتعرض وبتدخل التقارير**. اتصلّحوا، وقايمة الاستثناءات صغرت من 13 لـ9.

**ودرس في تصميم الاختبارات:** مبرّر الاختبار الجدولي («حالة الـnull بتُجاب مرة واحدة») **بيتوقف عن الصحة عند العشرة موارد اللي بتعالج حقولًا بعد الـhelper**، والحمولات المختارة بتتحايدهم. النقطة العمياء مكانتش عشوائية — كانت **بالظبط فين المنطق المشترك بطّل يكون مشتركًا**.

### Task 13 — مستويا الحُرّاس (جديدة، بقرار المالك)

`test:guards:core` **16 ثانية** (حد الدقيقتين بعيد، مفيش حاجة اتشالت)، و`test:guards` **47 حارس** في تلات حزم. والكتالوج في `docs/engineering/guard-tests.md`.

**واكتشاف في القياس:** المشروع عنده **~50 اختبار حارس** أصلًا — مش الستة اللي في الأمثلة — ومحدش بيشغّلهم كمجموعة. وعشان كده **اختباران كانوا أحمر وقاعدين** (`permissions.guard.spec.ts` و`write-error-copy.spec.ts`، والتاني **متعمول له tracking من 21 سبتمبر** وبيحرس عيبًا المستخدم بيشوفه).

**وخط أساس ثبّتُه:** `core` أحمر بفشلين بالظبط لحد Task 9. والشرط على كل مهمة **مش «أخضر»** — لأن أمر بيرجع أحمر دايمًا بيتحوّل لضجيج والناس بتتعلّم تتخطّاه — الشرط: **الفشلان دول بالظبط ومفيش تالت، وعدد الأزواج الميتة مايزيدش.**

**وفجوة مسجّلة:** مفيش حارس وسائط، لأن مفيش اختبار في `api/` بيحقّق المعيار ويلمس الوسائط. حارس مراجع الوسائط بيتكتب في Task 7 وبينضم ساعتها. معيار بيتمطّط عشان يطلّع حارسًا مش موجود أوحش من فجوة مكتوبة.

---

## تقسيم الملفات

مراجعة **بنيوية** لملفات الدفعة: تقسيم المسؤوليات وحدود الوحدات، لا صحة الكود. **مفيش تعديل على أي ملف** غير القسم
ده. مفيش تشغيل اختبارات (السوَيتس شغالة في مكان تاني).

الأدوات: `nestjs-best-practices` (فئات `arch-*` و`di-*` و`api-use-dto-serialization`)، و`code-simplifier` **قراءةً
بالإيد** لا كـagent (متاحة كـsubagent بس، وقواعد الـsubagent بتمنع إرسال subagents)، و`graphify`.
**`improve-codebase-architecture` مقفولة على الـagent** (`disable-model-invocation`) — لازم المالك يشغّلها بنفسه
بـ`/improve-codebase-architecture`؛ فماقريتش ملفها ولا قلّدت خطواتها. `archify` ماتستدعتش (ممنوعة).

**خريطة الاعتماد.** `graphify-out/` في المشروع مفيهاش `graph.json` — آخر تشغيل (2026-09-11) وقف بعد الـdetect. فشغّلت
استخراج الـAST وحده (deterministic، بلا LLM ولا subagents) مقصورًا على `api/src`، **والمخرَج في الـscratchpad لا في
`graphify-out/`** عشان ماتتغيّرش حالة المشروع: **915 ملف TS ← 6552 node و23449 ضلعًا**. عمود «مين بيستخدمه» تحت مقروء
من الجراف ده لا مُستنتَجًا. وثلاث نتايج بنيوية من الجراف نفسه:

- **صفر دورة (cycle) على مستوى الملف** في `api/src` كله، و**صفر `forwardRef`** في المشروع. فمافيش تجاوز حدود من
  المذكورين تحت بيفرض lazy import دلوقتي.
- **9 أضلاع `common/ → modules/`** (اتجاه مقلوب)، الدفعة ضافت **3** منها. كلها بتشاور فعليًا على شيئين:
  `PermissionAction` و`AuditAction` — اتحادان نوعيان ساكنان جوه وحدتي ميزة، وهما المفردات المشتركة الحقيقية. مش دورة،
  فمفيش كسر؛ التكلفة إن `common/` مابقتش تتفصل من غير الوحدتين.
- الـ27 `update-*.dto.ts` وتحويل `Delete → Archive` ماعملوش أي ضلع جديد بين وحدات.

**الاستثناء من الجدول:** `docs/design-specs/header/2026-09-28-header-redesign-design.md`
و`docs/design-specs/header/prompt-header-plan.md` ملفان جديدان بس مش من الدفعة 2 — الأول بيقول بالنص «إعادة هندسة
هيدر الموقع العام (المشروع الفرعي 1 من 4)… النطاق `apps/web` فقط».

**الإجمالي: 89 ملفًا.** (وملف محذوف مش في الجدول لأنه مش «مُنشأ»:
`permissions/dto/create-permission.dto.ts`.)

### أ — بنية مشتركة (`api/src/common/`)

| الملف | دوره في سطر | مين بيستخدمه |
|---|---|---|
| `api/src/common/authz/capability-map.ts` | الإعلان الوحيد: 78 موردًا + `purgeable`/`superAdminOnly`/`sensitiveFields`/`scopes`، ومنه يُشتق الكتالوج | `permission-catalogue.ts`، `permission-implications.ts`، `product-group.ts`، `permissions.service.ts`، `roles.service.ts` |
| `api/src/common/authz/product-group.ts` | الـ9 موارد `*Reports` مشتقة من `CAPABILITY_MAP` بـ`filter`+`map`، ومعاها segment المسار | `reports.controller.ts`، `reports.service.ts` |
| `api/src/common/authz/archive-restore.ts` | قاعدتا الحذف النهائي (`assertArchivedFirst`، `refuseWithoutStepUp`) + port `StepUpVerifier` وتنفيذه الرافض | `step-up.module.ts`، `media-asset-purge.service.ts`، `contact-messages.service.ts` |
| `api/src/common/authz/step-up.module.ts` | مكان الربط الوحيد لـ`STEP_UP_VERIFIER` | `media-assets.module.ts`، `contact-messages.module.ts` |
| `api/src/common/authz/media-references.ts` | فحص مراجع الوسائط fail-closed (840 س): قراءة metadata الـschemas + جرد الحقول النصية + الاستعلام | `orphaned-media.ts`، `albums.module.ts`، `albums.service.ts`، `media-assets.module.ts`، `media-assets.service.ts`، `media-asset-purge.service.ts` |
| `api/src/common/authz/orphaned-media.ts` | اتجاها «المحرّر بدّل صورة»: اقتراح المهجور عند الحفظ (fail-open)، وإرجاع المُشار إليه عند الاستعادة (fail-closed) | 4 صفحات في `federation-governance`، `articles.service.ts`، `media-assets.service.ts`، `publishing.service.ts` |
| `api/src/common/decorators/audit-entity.decorator.ts` | `@AuditEntity({type, idFrom, action})` — يُعلن موضوع التدقيق لـroute مش بـ`:id` | `audit-log.interceptor.ts`، `albums.controller.ts`، `roles.controller.ts` |

### ب — التدقيق (`workflow/audit-logs`)

| الملف | دوره في سطر | مين بيستخدمه |
|---|---|---|
| `api/src/modules/workflow/audit-logs/audit-action.util.ts` | `auditActionFor(method, permissionAction)` — المكان الوحيد اللي يُقرَّر فيه فعل التدقيق | `audit-log.interceptor.ts`، `media-assets.service.ts`، `media-asset-purge.service.ts`، `articles.service.ts`، `contact-messages.service.ts`، `publishing.service.ts` |

### ج — الوسائط (`media-center/media-assets`)

| الملف | دوره في سطر | مين بيستخدمه |
|---|---|---|
| `api/src/modules/media-center/media-assets/media-asset-purge.service.ts` | التدمير الوحيد غير القابل للرد: الشروط الأربعة + الـstorage + صفوف التدقيق | `media-assets.controller.ts`، `media-assets.module.ts`، `unused-media.service.ts` |
| `api/src/modules/media-center/media-assets/unused-media.service.ts` | تقرير الوسائط غير المستخدمة + إجراء الصف الوحيد (تفويض للـpurge) | `media-assets.controller.ts`، `media-assets.module.ts` |
| `api/src/modules/media-center/media-assets/dto/archive-media-asset.dto.ts` | جسم طلب الأرشفة | `media-assets.controller.ts`، `media-assets.service.ts` |
| `api/src/modules/media-center/media-assets/dto/unused-media-response.dto.ts` | شكل رد التقرير (`items`/`total`/`totalSize`) | `media-assets.controller.ts`، `unused-media.service.ts` |
| `api/src/modules/media-center/media-assets/dto/update-media-asset.dto.ts` | التحديث الجزئي للأصل | `media-assets.controller.ts`، `media-assets.service.ts` |

### د — الصلاحيات والحسابات والتقارير (`platform-administration`)

| الملف | دوره في سطر | مين بيستخدمه |
|---|---|---|
| `api/src/modules/platform-administration/reports/reports.module.ts` | يوصّل التقارير بالتطبيق | `app.module.ts` |
| `api/src/modules/platform-administration/reports/reports.controller.ts` | 27 route (`view`/`export`/`print` × 9 مجموعات)، كل واحد بوسيطة `@RequirePermission` حرفية | `reports.module.ts` |
| `api/src/modules/platform-administration/reports/reports.service.ts` | مظروف التقرير بصفوف فاضية بأمانة (التجميع في دفعة 6a) | `reports.controller.ts`، `reports.module.ts` |
| `api/src/modules/platform-administration/permissions/dto/permission-response.dto.ts` | شكل رد الصلاحية بعد شيل `POST /permissions` | `permissions.controller.ts`، `permissions.service.ts` |
| `api/src/modules/platform-administration/users/dto/user-name.dto.ts` | صف `GET /users/names`: `id` + `displayName` ثنائي اللغة وبس | `users.controller.ts` |
| `api/src/modules/platform-administration/users/dto/user-ref.dto.ts` | رد الأرشفة/إلغاء الأرشفة: المعرّف وبس | `users.controller.ts` |

### هـ — الـ`update-*.dto.ts` الجديدة (كلها `PartialType` فوق الـcreate المجاور)

مسؤوليتها واحدة، ومستخدمها في كل حالة هو **الـcontroller والـservice بتاعي نفس الوحدة**.

| الملف | دوره في سطر | مين بيستخدمه |
|---|---|---|
| `api/src/modules/athletics/age-categories/dto/update-age-category.dto.ts` | تحديث جزئي للفئة العمرية | `age-categories.controller.ts` + `.service.ts` |
| `api/src/modules/athletics/disciplines/dto/update-discipline.dto.ts` | تحديث جزئي للمسابقة | `disciplines.controller.ts` + `.service.ts` |
| `api/src/modules/cms-page-composition/navigation-menus/dto/update-navigation-menus.dto.ts` | تحديث جزئي لقائمة التنقل | `navigation-menus.controller.ts` + `.service.ts` |
| `api/src/modules/cms-page-composition/pages/dto/update-pages.dto.ts` | تحديث جزئي للصفحة | `pages.controller.ts` + `.service.ts` |
| `api/src/modules/documents/documents/dto/update-document.dto.ts` | تحديث جزئي للمستند | `documents.controller.ts` + `.service.ts` |
| `api/src/modules/federation-governance/committees/dto/update-committees.dto.ts` | تحديث جزئي للجنة | `committees.controller.ts` + `.service.ts` |
| `api/src/modules/federation-governance/election-cycles/dto/update-election-cycles.dto.ts` | تحديث جزئي لدورة الانتخاب | `election-cycles.controller.ts` + `.service.ts` |
| `api/src/modules/federation-governance/federation-appointments/dto/update-federation-appointments.dto.ts` | تحديث جزئي للتعيين | `federation-appointments.controller.ts` + `.service.ts` |
| `api/src/modules/federation-governance/federation-personnel/dto/update-federation-personnel.dto.ts` | تحديث جزئي للكادر | `federation-personnel.controller.ts` + `.service.ts` |
| `api/src/modules/federation-governance/federation/dto/update-federation.dto.ts` | تحديث جزئي لبيانات الاتحاد | `federation.controller.ts` + `.service.ts` |
| `api/src/modules/federation-governance/governance-documents/dto/update-governance-documents.dto.ts` | تحديث جزئي لوثيقة الحكومة | `governance-documents.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/athlete-coach-history/dto/update-athlete-coach-history.dto.ts` | تحديث جزئي لسجل لاعب-مدرب | `athlete-coach-history.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/athlete-guardian-relationships/dto/update-athlete-guardian-relationship.dto.ts` | تحديث جزئي لعلاقة وليّ الأمر | `athlete-guardian-relationships.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/athlete-national-team-history/dto/update-athlete-national-team-history.dto.ts` | تحديث جزئي لسجل المنتخب | `athlete-national-team-history.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/athlete-profiles/dto/update-athlete-profile.dto.ts` | تحديث جزئي لملف اللاعب | `athlete-profiles.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/athletes/dto/update-athlete.dto.ts` | تحديث جزئي للاعب | `athletes.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/club-teams/dto/update-club-team.dto.ts` | تحديث جزئي لفريق النادي | `club-teams.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/clubs/dto/update-club.dto.ts` | تحديث جزئي للنادي | `clubs.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/coaches/dto/update-coach.dto.ts` | تحديث جزئي للمدرب | `coaches.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/countries/dto/update-country.dto.ts` | تحديث جزئي للدولة | `countries.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/official-assignments/dto/update-official-assignment.dto.ts` | تحديث جزئي لتكليف الحكم | `official-assignments.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/official-profiles/dto/update-official-profile.dto.ts` | تحديث جزئي لملف الحكم | `official-profiles.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/officials/dto/update-official.dto.ts` | تحديث جزئي للحكم | `officials.controller.ts` + `.service.ts` |
| `api/src/modules/people-organizations/venues/dto/update-venue.dto.ts` | تحديث جزئي للمنشأة | `venues.controller.ts` + `.service.ts` |
| `api/src/modules/workflow/workflow-definitions/dto/update-workflow-definition.dto.ts` | تحديث جزئي لتعريف سير العمل | `workflow-definitions.controller.ts` + `.service.ts` |
| `api/src/modules/workflow/workflow-steps/dto/update-workflow-step.dto.ts` | تحديث جزئي لخطوة سير العمل | `workflow-steps.controller.ts` + `.service.ts` |

(الـ27 مورد بتوع Task 6 ناقصهم واحد في القايمة دي: `page-sections/dto/update-page-sections.dto.ts` كان موجودًا
قبل الدفعة واتعدّل بس، فهو مش من الملفات المُنشأة. و`update-media-asset.dto.ts` مذكور في قسم «ج».)

### و — الترحيل والسكريبتات

| الملف | دوره في سطر | مين بيستخدمه |
|---|---|---|
| `api/src/migrate-delete-to-archive.ts` | ترحيل `Delete → Archive` على الصفوف المخزنة، idempotent، **وماتشغّلش** | لا شيء (يُستدعى بالإيد؛ بيستورد `app.module.ts` و`bootstrap/dev-database.ts`) |
| `scripts/test-guards.mjs` | مشغّل الحُرّاس بمستويين (`core`/`all`) على `api`/`dashboard`/`web` | `package.json` → `test:guards:core` و`test:guards` |
| `api/_scan.mjs` | ماسح استكشافي بيطبع جرد حقول الـschemas على الـconsole | **لا شيء** — غير مُتعقَّب، مش في `scripts/`، ومفيش حاجة بتشغّله |

### ز — الاختبارات الجديدة

**7 منها مسجَّلة في `API_CORE_GUARD_NAMES`** (أول 7 صفوف)، والباقي بيتشغّل لما حد يسمّيه.

| الملف | دوره في سطر | مين بيستخدمه |
|---|---|---|
| `api/src/common/authz/capability-map.spec.ts` | 17 اختبارًا على الخريطة، فيهم تثبيت الموردين القابلين للتفريغ بالاسم | `test:guards:core` |
| `api/src/common/authz/archive-restore.spec.ts` | routes التدمير مقابل الموارد اللي الخريطة بتسمح بتدميرها، في الاتجاهين | `test:guards:core` |
| `api/src/common/authz/media-reference-coverage.spec.ts` | تغطية فحص المراجع: يفشل لما يظهر حقل الفحص ماينفعش يمشي وراه (بلا قاعدة بيانات) | `test:guards:core` |
| `api/src/common/interceptors/audit-route-coverage.spec.ts` | مفيش route بيخرج من التدقيق من غير ما يقول صفّه بيتكتب فين | `test:guards:core` |
| `api/src/common/utils/raw-dto-cast-scan.spec.ts` | صفر `new Types.ObjectId(`/`new Date(` خام جوه أي `update()`، + meta-check على القايمتين | `test:guards:core` |
| `api/src/modules/workflow/audit-logs/audit-action-literal-scan.spec.ts` | مفيش فعل تدقيق مكتوب بالإيد بره `auditActionFor` | `test:guards:core` |
| `api/src/modules/workflow/audit-logs/schemas/audit-log.schema.spec.ts` | مفردات `AuditAction` مقابل مستخدميها | `test:guards:core` |
| `api/src/common/authz/partial-update.spec.ts` | 27 service كل واحد بيثبّت إنه بيستدعي `partialUpdate` فعلًا لا بيعيد استنتاج الدمج | **لا شيء** (القايمة 1، بند 3) |
| `api/src/common/authz/super-admin-only.spec.ts` | 8 أزواج للـSuper Admin وبس — على مستوى الرفض لا الخريطة | **لا شيء** (القايمة 1، بند 3) |
| `api/src/common/authz/media-references.spec.ts` | سلوك الفحص على قاعدة بيانات حقيقية (mongodb-memory-server) | `npx jest` بالاسم |
| `api/src/common/authz/orphaned-media.spec.ts` | الاتجاهان: اقتراح المهجور، وإرجاع المُشار إليه | `npx jest` بالاسم |
| `api/src/migrate-delete-to-archive.spec.ts` | 5 اختبارات، فيهم Q-E على الـresolver الحقيقي | `npx jest` بالاسم |
| `api/src/modules/media-center/media-assets/media-asset-purge.service.spec.ts` | الشروط الأربعة، وترتيب الـstorage-قبل-السجل، وصفوف الفشل | `npx jest` بالاسم |
| `api/src/modules/media-center/media-assets/unused-media.service.spec.ts` | نافذة الـ90 يومًا، والترتيب بالحجم، وعدم الثقة في صف التقرير | `npx jest` بالاسم |
| `api/src/modules/media-center/media-assets/media-assets.controller.spec.ts` | طبقة الـroutes للأرشفة والتفريغ والتقرير | `npx jest` بالاسم |
| `api/src/modules/platform-administration/reports/reports.spec.ts` | الـ27 زوجًا محروسة فعلًا، والمظروف فاضي بأمانة | `npx jest` بالاسم |
| `api/src/modules/platform-administration/permissions/permissions.controller.spec.ts` | `POST /permissions` اتشال، والرد بقى `PermissionResponseDto` | `npx jest` بالاسم |
| `api/src/modules/platform-administration/roles/roles.service.one-comparison.spec.ts` | `holdsPair` هي المقارنة الوحيدة منحة-مقابل-منحة (F7) | `npx jest` بالاسم |
| `api/src/modules/platform-administration/roles/roles.service.scope.spec.ts` | الـ`scope` بيعيش لحد المقارنة و`all` بيجمع | `npx jest` بالاسم |
| `api/src/modules/platform-administration/roles/roles.service.symmetry.spec.ts` | تناظر المنح والسحب | `npx jest` بالاسم |
| `api/src/modules/platform-administration/users/users.names.spec.ts` | `GET /users/names`: الشكل المعطوب يُرفَض، والوجود يُسكت عنه | `npx jest` بالاسم |
| `api/src/modules/platform-administration/users/users.service.last-super-admin.spec.ts` | رفض تجريد آخر Super Admin — **وفيه اختبار فاشل مُثبَّت** على عدم الذرّية | `npx jest` بالاسم |
| `api/src/modules/platform-administration/users/users.service.stronger-user.spec.ts` | قاعدة «الأقوى» (ADR-0104) | `npx jest` بالاسم |
| `api/src/modules/platform-administration/users/users.service.super-admin-events.spec.ts` | صفّا `SuperAdminGranted`/`SuperAdminRevoked` | `npx jest` بالاسم |
| `api/src/modules/public-communication/contact-messages/contact-messages.controller.spec.ts` | routes الأرشفة والحذف النهائي للرسائل | `npx jest` بالاسم |
| `api/src/modules/workflow/audit-logs/audit-logs.service.spec.ts` | كتابة الصف والاستعلام عليه | `npx jest` بالاسم |
| `api/src/modules/workflow/workflow-policies/approval-configuration.audit.spec.ts` | كتابات سياسة الموافقة بتتدقّق | `npx jest` بالاسم |
| `api/src/modules/workflow/workflow-policies/approval-configuration.lock.spec.ts` | قفل تغيير سياسة الموافقة (ADR-0107) | `npx jest` بالاسم |
| `api/src/modules/workflow/workflow-policies/workflow-policies.lock.spec.ts` | نفس القفل على `workflowPolicies` | `npx jest` بالاسم |
| `api/src/modules/workflow/workflow-steps/workflow-steps.service.spec.ts` | رفع `requiredApprovals` مع مُكلَّفين كفاية | `npx jest` بالاسم |
| `api/src/modules/federation-governance/federation/federation.service.spec.ts` | تحديث جزئي وحقول الوسائط | `npx jest` بالاسم |
| `api/src/modules/federation-governance/federation-personnel/federation-personnel.service.spec.ts` | تحديث جزئي وحقول الوسائط | `npx jest` بالاسم |
| `api/src/modules/federation-governance/president-message-page/president-message-page.service.spec.ts` | تحديث جزئي واقتراح المهجور | `npx jest` بالاسم |
| `api/src/modules/federation-governance/governance-documents/dto/update-governance-documents.dto.spec.ts` | فاليديشن الـDTO | `npx jest` بالاسم |
| `api/src/modules/people-organizations/athlete-profiles/dto/update-athlete-profile.dto.spec.ts` | فاليديشن الـDTO | `npx jest` بالاسم |
| `api/src/modules/people-organizations/official-profiles/dto/update-official-profile.dto.spec.ts` | فاليديشن الـDTO | `npx jest` بالاسم |
| `apps/web/src/components/pages/board-members/board-members-screen.spec.tsx` | صفحة المجلس بتعرض شاغلي المناصب بس، لا كل `Active` | `npx vitest` بالاسم |

### ح — وثائق

| الملف | دوره في سطر | مين بيستخدمه |
|---|---|---|
| `docs/design-system/ADR-0120-Media-Permanent-Delete.md` | قرار الحذف النهائي للوسائط: الشروط الأربعة وما رفضه المالك | `archive-restore.ts`، `media-asset-purge.service.ts`، `user-ref.dto.ts` بيشاوروا عليه |
| `docs/engineering/guard-tests.md` | كتالوج الحُرّاس: كل حارس وبيحرس إيه ومستواه | `scripts/test-guards.mjs` (مرجعًا)، وقواعد الدفعة |
| `docs/superpowers/plans/2026-09-27-batch-2-capability-map.md` | خطة الدفعة، 12 مهمة | مهام الدفعة |
| `docs/superpowers/reports/batch-2.md` | تقرير الدفعة المرحلي (الملف ده) | الجلسات اللاحقة |

---

### القايمة 1 — ملفات بتحمل أكتر من مسؤولية

**1. `api/src/common/authz/media-references.ts` — تلات طبقات، والملف نفسه حاطط فواصلها.**
الملف 840 سطرًا وفيه banners بيده: س 173–408 «Reading Mongoose's metadata» (`referencePathsIn`،
`dynamicReferencePathsIn`، `schemaRootsOf`، `referencePathsFor` — **عام تمامًا**، بياخد أي `modelName`
ومابيلمسش قاعدة بيانات)، وس 409–533 جرد الحقول النصية والاستثناءات، وس 534–840 الاستعلامات fail-closed.

**تكلفتها النهاردة:** `orphaned-media.spec.ts` بيعمل `beforeAll → connectTestDatabase()`
(mongodb-memory-server) عشان **تلات اختبارات لدالة نقية** — `describe('removedMediaAssetIds')` على object
قبل وobject بعد — لأن الطريقة الوحيدة توصل لـ`Schema` جوه الـspec ده هي `connection().models.articles.schema`.
والدليل إن الفصل ممكن موجود جوه الدفعة نفسها: `media-reference-coverage.spec.ts`، اللي بيختبر طبقة الـmetadata
بالظبط، **مالوش أي db-hook**. فالانفصال حاصل على مستوى الـspec وناقص بس على مستوى الملف. على جهاز فيه 7.9 GB RAM
وتلات خدمات dev شغالة دي تكلفة حقيقية لا نظرية.

**اللي يتفصل:** طبقة الـmetadata (هي وحدها) في `common/mongoose/schema-references.ts` بلا أي معرفة بالوسائط،
ويبقى `media-references.ts` هو الماسح اللي بيستوردها.

**2. `api/src/common/authz/orphaned-media.ts` — نصفان بسياستي فشل متعاكستين، وملف واحد.**
الـheader بيقولها بنفسه: «saving suggests an old, unused image for archiving and **never fails the save over
it**؛ restoring brings a pointed-at archived image back and **never best-effort**». فـ`orphanedMediaCandidates`
فيه `catch { return [] }` مقصود، و`restoreReferencedMediaAssets` بيرمي عن قصد — والتاني هو **الكتابة الوحيدة في
الملف**، وهو نفسه بند القايمة 3.

**تكلفتها النهاردة:** موقع الاستيراد مابيقولش للقارئ وصل على أي سياسة. `publishing.service.ts` بيستورد الدالة
الكاتبة الوحيدة من موديول تصديراته التانية عمرها ما بتكتب، والقارئ لازم يفتح الملف عشان يعرف إن واحدة بتصمت
على الفشل والتانية بترمي. وأربع خدمات صفحات + `articles.service.ts` بيستوردوا من نفس المسار ومش بيلمسوا
الكاتبة خالص.

**اللي يتفصل:** الاقتراح (`removedMediaAssetIds`، `orphanedMediaCandidates`، `asPlainObject`) في ملف،
والاستعادة الكاتبة في ملف تاني — والتاني مكانه الطبيعي `media-center` لا `common/` (شوف القايمة 3).

**3. `api/src/common/authz/` كمجلد — بقى صندوقًا مختلطًا، والتكلفة إن حارسًا جوّاه مش بيتشغّل.**
المجلد فيه authorization حقيقي (`capability-map.ts`، `product-group.ts`، `step-up.module.ts`،
و`archive-restore.ts` بتحفّظ) **و** مادة مالهاش علاقة بالـauthorization: `media-references.ts`
و`orphaned-media.ts` (سلامة بيانات وسائط) و`partial-update.spec.ts` (دمج DTO).

**تكلفتها النهاردة، وهي أخطر ملاحظة في المراجعة دي:**
`api/src/common/authz/partial-update.spec.ts` — **609 سطرًا**، بيثبّت لكل واحدة من الـ27 service إنها بتستدعي
`partialUpdate` فعلًا بدل ما تعيد استنتاج الدمج (وده الـ«ES2023 trap» اللي التقرير فوق بيقول إنه العيب اللي
Task 6 موجودة عشانه) — **مش بيتشغّل من أي مكان:**

- `scripts/test-guards.mjs` بيطابق **بالاسم الأساسي**: `API_ALL_GUARD_NAMES` فيها `partial-update\.util`،
  والنمط الناتج `(…|partial-update\.util|…)\.spec\.ts$` **مابيطابقش** `partial-update.spec.ts`. فلا `core`
  ولا `all` بيشوفوه.
- `docs/engineering/guard-tests.md` — الكتالوج — **مافيهوش**. المذكور فيه `partial-update.util.spec.ts` (س 102)
  وهو حارس تاني بسؤال تاني.
- وقاعدة الدفعة «شغّل اختبارات الملفات اللي لمستها بس» مابتوصّلش له أبدًا، لأن اسمه ومجلده مايشتركوا في حاجة مع
  أي واحد من الـ27 ملف اللي بيحرسهم.

فالنتيجة إن صحة التحديث الجزئي في 27 service **مش محروسة عمليًا** بينما التقرير بيوصفها كمحروسة.
و`api/src/common/authz/super-admin-only.spec.ts` (123 س، 8 أزواج للـSuper Admin على مستوى **الرفض**) فيه
**نفس الحالة بالظبط**: مش في المشغّل ولا في الكتالوج.

وده **المرة التالتة** لنفس العطل: `guard-tests.md` نفسها (س 14) بتسجّل «حارسان بقيا أحمرين دون أن يلاحظهما أحد»،
وقواعد الـsubagent بتحذّر منه بالنص. المرة دي العطل مش «حارس أحمر مش منتبَه له» — العطل **حارس مش بيتشغّل خالص**،
وهو أصعب في الملاحظة لأنه عمره ما بيطلّع سطر أحمر.

**اللي يتعمل** (مش في المراجعة دي، بس مستحق قبل قفل الدفعة لا في الدفعة 9): الملفان ينضموا للمشغّل والكتالوج،
وينتقلوا لمجلد يوصف اللي بيحرسوه (`partial-update.spec.ts` جنب `common/utils/partial-update.util.ts`،
و`super-admin-only.spec.ts` تحت `platform-administration/roles/`) عشان قاعدة «الملفات اللي لمستها» تشوفهم.

### القايمة 2 — كود مكرَّر بين ملفات ومكانه مكان واحد

**1. `registerEveryCollection` — نسخة حرفية بين specين، والتعليق بيعلن الرفض.**
`common/authz/orphaned-media.spec.ts` (س 22–46) و`common/authz/media-references.spec.ts` فيهم نفس الـfixture
اللي بتقرا كل `*.schema.ts` تحت `api/src` وبتسجّلها على الـconnection باسم الـcollection. تعليق الأول بالنص:
«Copied from `media-references.spec.ts` rather than shared, because both are self-contained test-only fixtures,
not production code.»

**تكلفتها النهاردة:** `media-references.spec.ts:448` فيه التوكيد
`expect(SCANNED_COLLECTIONS.filter((c) => !connection().models[c])).toEqual([])` — يعني «كل collection الماسح
بيمسحه له model على الـconnection». التوكيد ده **بيحرس نسخته بس**. لو ظهر schema بشكل الـloader مايشوفوش (مش
مُصدَّر كقيمة `mongoose.Schema`، مثلًا)، نسخة `orphaned-media.spec.ts` بتسجّل مجموعة **مختلفة** بصمت
و`restoreReferencedMediaAssets` بيتختبر على connection ناقص، ومفيش توكيد جنبها بيمسك ده.

**مكانها:** `api/test/utils/` — **المكان المشترك موجود أصلًا والملفان الاتنين بيستوردوا منه** فعلًا
(`mongo-memory-server.js`).

**2. المشي على شجرة المصدر وشطب التعليقات — 11 نسخة خاصة للأول، وتلاتة للتاني.**
المشي بـ`readdirSync`/`statSync` معمول من جديد في 11 ملف spec تحت `api/src` — 8 منهم من الدفعة دي —
و`archive-restore.spec.ts` لوحده فيه **نسختان جوه نفس الملف** (س 64 وس 119). وشطب التعليقات فيه تلات تنفيذات،
**اتنين منهم متطابقان حرفًا بحرف** (`audit-route-coverage.spec.ts:152–156` و
`audit-action-literal-scan.spec.ts:53–57`، وتعليق التاني بيقول بالنص إنه «the same … `audit-route-coverage.spec.ts`
uses»)، والتالت `stripNonCode` (`raw-dto-cast-scan.spec.ts:187`) ماسح أحرف بيخفي محتوى الـstrings كمان.

**تكلفتها النهاردة:** شطب التعليقات هو بالظبط الأوّلية اللي صحة أي حارس ماسح للمصدر بتعتمد عليها،
و`guard-tests.md` نفسها مسجّلة إن مراجعة ADR-0112 طلّعت **عدد routes منفوخًا** من ماسح طابق نصًّا جوه تعليق.
النهاردة تلات ماسحين بتلات نسخ خاصة: تصليح واحدة مابيوصلش للتانيتين، ومفيش اختبار على الأوّلية نفسها في أي
منهم. والـmemory بتسجّل الشكل ده بالاسم (`reference_regex_through_heredocs`): escape معطوب لسه بيترجم ولسه
بيشتغل — بس مابيطابقش حاجة، فالحارس بيرجع أخضر على لا شيء.

**تنويه إنصاف مهم:** التالت **مش ترقية للاتنين**. شغل `audit-action-literal-scan` إنه **يلاقي** نصوصًا حرفية
زي `action: 'Delete'`، فإخفاء محتوى الـstrings كان هيعمّيه عن الحاجة اللي هو موجود عشانها. فالمركزة الصح
**متغيّران مُسمَّيان بما يشطبه كل واحد** (`stripComments` و`stripCommentsAndStrings`)، لا واحد موحَّد.

**مكانها:** ملف مساعد **للاختبارات وحدها** تحت `api/test/utils/source-scan.ts` فيه
`sourceFilesUnder(dir, suffix)` والمتغيّران المسمّيان، يستورده كل حارس ماسح.

**3. `api/_scan.mjs` — نسخة تالتة، غير مُتعقَّبة، من قواعد حارس موجود.**
84 سطرًا في جذر `api/` ببادئة `_` وبلا header. بيعيد تنفيذ — أرخى وبلا اختبار — الـregex
`/photo|image|logo|cover|thumbnail|media|asset/i` و«ObjectId props without ref» و«rich-text props»
و«MediaAsset refs»، وهي بالظبط شروط (أ) و(ب) و(ج) في `common/authz/media-reference-coverage.spec.ts`،
ومعاها نسخه الخاصة من `walk`/`strip`/`balanced`.

**تكلفتها النهاردة:** مفيش حاجة بتشغّله ومفيش حاجة بتخلّيه متماشيًا مع الحارس. فأول واحد يشغّله بعد تغيير
قواعد الحارس بياخد إجابة بتخالف الاختبار — ومايعرفش إنها بتخالفه. وكمان مكانه بره `scripts/`، اللي الدفعة دي
نفسها أنشأتها للسكريبتات.

**مكانها:** يُحذف (الحارس بيغطّي الأسئلة دي وبيفشل لما تتغيّر)، أو يتنقل تحت `scripts/` بـheader بيقول لمين
وليه، ويستورد الأوّليات المشتركة من البند 2.

**4. `export { auditActionFor }` في `common/interceptors/audit-log.interceptor.ts:29` — اسم عام تاني لنفس
الدالة الواحدة.** مسح كامل على `api/src`: **كل** مستدعي إنتاجي بيستورد من المسار الأصلي
`audit-logs/audit-action.util.js`. المستورد الوحيد الباقي من الـshim هو
`common/interceptors/audit-route-coverage.spec.ts:3` — **ملف اتكتب في نفس الدفعة**، وكان ينفع يستورد من المسار
الأصلي من أول سطر.

**تكلفتها النهاردة:** الاسم القديم بيسيب أثره في التوثيق أصلًا: `audit-log.schema.ts:40`
و`articles.service.spec.ts:139` الاتنين بيسمّوه `AuditLogInterceptor.auditActionFor` — وده بالظبط الانحراف
اللي `audit-action-literal-scan.spec.ts` موجود عشان يمنعه.

**ملحوظة لازمة:** ده **مش** طلب تفكيك دالة مشتركة ولا إرجاعها inline. الدالة تفضل مكانها بالظبط؛ اللي يتشال هو
**الـalias** بعد تحويل الـspec الوحيد المتبقي للمسار الأصلي.

### القايمة 3 — وحدة بتقرا من وحدة تانية من غير ما تمر على service بتاعتها

**1. `PublishingService` (workflow) بيكتب في `mediaAssets` مباشرة — وده أخطر بند في القايمة.**
`common/authz/orphaned-media.ts:73–98` بيلاقي الـmodel بـ`modelForCollection(connection, MEDIA_ASSETS_COLLECTION)`
— بحث خام بالاسم على الـconnection — وبينفّذ
`updateMany({_id:{$in:archivedIds}}, {archivedAt: null, archivedBy: null})`. المستدعي الوحيد
`modules/workflow/publishing/publishing.service.ts:465`، والمسار الرسمي للفعل ده هو
`MediaAssetsService.unarchive` (`media-assets.service.ts:376–381`).

**تكلفتها النهاردة:** `MediaAssetsService.unarchive` بيعمل
`albumModel.updateOne({_id: restored.albumId}, {$inc: {assetCount: 1}})`.
`restoreReferencedMediaAssets` **مابيعملوش**. فأصل مرتبط بألبوم بيرجّعه استعادة نسخة بيرجع live
و`Album.assetCount` ناقص واحد، **ومفيش حاجة في المشروع بتصلّح الفرق بعدين**. للوصول لازم أصل فيه `albumId`
ومُشار إليه من `ref` في schema صفحة/مقال مؤرشفة نسخته — مش المسار الشائع، فالخطورة **Medium**؛ بس مافيش حاجة
في الـschema ولا في الكود بتمنع الشكل ده.

**وللإنصاف:** الـpublishing **بيكتب** صفوف audit لكل أصل رجّعه (س 470–481)، فالمسار مش صامت في السجل — اللي
بيفوته `assetCount` تحديدًا.

**والتناظر مكسور جوه ملف واحد:** نصف **القراءة** من نفس الملف عامل الصح —
`orphanedMediaCandidates` بيمر على `MediaAssetsService.orphanedMediaCandidates` من كل مستدعييه الستة. نصف
**الكتابة** هو الوحيد اللي بيتخطّى الـservice. فالقاعدة موجودة ومتّبعة، والاستثناء الوحيد هو بالظبط النصف
اللي بيكتب.

**2. `UsersRepository.countActiveSuperAdmins` بيقرا collection الـ`roles` بالسائق الخام.**
`users.repository.ts` — `this.model.db.collection('roles').find({isSystemRole: true, archivedAt: null})`.
الملف موثِّق القرار («this repository is the one place the two collections are joined for a count, and
injecting a service into a repository to read one field would invert the dependency the rest of the module
keeps») والقرار مقبول.

**اللي بيحمل التكلفة هو `archivedAt: null` المكتوب بالإيد:** كل قارئ تاني للـcollection دي بيوصل نطاق الحذف
الناعم من `BaseRepository` تلقائيًا. فلو اتغيّرت طريقة نطق النطاق ده (علم أرشفة تانٍ، أو `isSystemRole` اتسمّى
غير كده) الاستعلام ده مايوصلوش التغيير ويعدّ المجموعة الغلط بصمت — والاستعلام ده هو **رفض تجريد آخر Super
Admin**.

**وللإنصاف:** نفس التعليق بيسجّل بنفسه إن الحارس **مش atomic** ومابيدّعيش إنه، ومشاور على الاختبار الفاشل
المُثبَّت `users.service.last-super-admin.spec.ts`. ده الشكل الصح لتسجيل دَين، لا عيب.

**3. `MediaAssetsService` بيكتب في collection الـ`albums` مباشرة — قايم من قبل الدفعة، ومسجّل لأنه سبب تكلفة
البند 1.** `media-assets.service.ts:70` بيعمل `@InjectModel(Album.name)`، وأربع مواضع (س 127، 209، 312، 379)
بيعملوا `$inc` على `assetCount`. التعليق في س 48–57 مؤرَّخ **2026-09-04** ومعلِّل: `AlbumsModule` بيستورد
`MediaAssetsModule` أصلًا، فاستيراد العكس كان هيعمل دورة. **الدفعة دي مضافتش الشكل ده** — بس هو اللي بيخلّي
تخطّي `MediaAssetsService` في البند 1 يكلّف انحراف بيانات بدل ما يكلّف بس أسلوبًا.

**4. `findMediaAssetReferrers` بيستعلم كل collection على الـconnection — VERIFIED / NOT AN ISSUE.**
فحص المراجع بطبيعته عابر للوحدات: سؤاله «فيه أي حاجة في المشروع لسه بتشاور على الملف ده». تمريره على 25 service
كان هيبقى أسوأ — 25 نقطة فشل قبل حذف لا يُرَد، ومافيش واحدة فيهم عندها الصورة الكاملة. مُسجَّل هنا عشان يبان إنه
اتفُحص واتقرّر، لا إنه اتفوّت.

### ملحوظتان من القراءة (لا من التشغيل)

**تعليمات الـsubagent بقت متعفّنة بالظبط زي ما حذّرت.** `subagent-rules.md` (س 23–31) بيقول `test:guards:core`
**أحمر عن قصد** لحد ما الدفعة 2 تخلص، والشرط «نفس الفشل المذكور بالاسم في آخر قياس مؤرَّخ في
`docs/engineering/guard-tests.md`». الوثيقة نفسها (س 233–238) بتقول إن الشرط ده **اتشال**: Task 9 قفلت الفشل
الوحيد المتبقي، وآخر قياس مؤرَّخ **أخضر بالكامل: صفر فشل**، وأي فشل بعد كده فشل حقيقي. القاعدة نفسها بتقول
«اقرا الرقم من الوثيقة مش من هنا» — فمفيش تعارض، فيه تعليمات قديمة تستحق تحديث قبل الـdispatch الجاي.

**`scripts/test-guards.mjs:8` بيشاور على `docs/engineering/GUARD-TESTS.md` والملف `guard-tests.md`.** تعليق لا
قراءة مسار، فمفيش كسر وقت التشغيل، وعلى Windows الاتنين نفس الحاجة — بس على filesystem حسّاس لحالة الحروف
(CI/Linux) القارئ اللي بيتبع المرجع مش هيلاقي حاجة. **Minor، لـ`/simplify` في الدفعة 9.**

---

# الإغلاق النهائي — الدفعة 2

**الحالة: PASS WITH DEBT.** الـ13 مهمة خلصوا ومتراجعين، والأزواج الميتة صفر، والحُرّاس خُضر، والدين مكتوب بمالكه.

**القسم ده مكتوب لجلسة تانية مش شايفة الشغل.** الدفعة 3 هتبدأ في جلسة جديدة، فأي حاجة موجودة في سياق المحادثة بس ومش هنا هتتفقد.

## 1. المهام

| # | المهمة | جولات الإصلاح | الحالة |
|--:|---|:--:|---|
| 1 | خريطة القدرات، والكتالوج مشتق منها | — | ✅ |
| 2 | القاموس، وترحيل الصفوف المخزّنة | — | ✅ |
| 3 | مقارنة صلاحيات واحدة (F7) | — | ✅ |
| 4 | الـscope يعيش لحد المقارنة | 1 | ✅ |
| 5 | الأزواج المحفوظة · حلّ الأسماء · قاموس السجل | 4 | ✅ |
| 6 | Update للـ27 موردًا | 4 | ✅ |
| 7a | فحص مراجع الوسائط | 2 | ✅ |
| 7b | مسارات الأرشفة والاسترجاع والحذف النهائي | 2 | ✅ |
| 8 | التسع موارد للتقارير | — | ✅ |
| 9 | إغلاق الكتالوج | — | ✅ |
| 10 | تقرير الوسائط غير المستخدمة | — | ✅ |
| 11 | اقتراح الأرشفة وقت الاستبدال | — | ✅ |
| 12 | تحذير أرشفة صورة مستخدمة | — | ✅ |
| 13 | مستويا الحُرّاس والكتالوج (جديدة، بقرار المالك) | — | ✅ |

## 2. التحقق النهائي — مقيس، والخدمات مقفولة

| | النتيجة |
|---|---|
| test:guards:core | **10 حزم · 88 اختبار · exit 0** |
| test:guards — API | **16 حزمة · 236 اختبار** ✅ |
| test:guards — الداشبورد | **10 ملفات · 103 اختبار** ✅ |
| test:guards — الموقع | 26 من 27 · 394 من 396 — **فشل واحد سابق للدفعة** (خمس routes تنقّل مالهاش صفحات) |
| npx tsc --noEmit (api) | نضيف |
| الأزواج الميتة | **صفر** (من 111) |

**المسار:** 111 → 108 → 81 → 31 → 4 → **صفر**.

## 3. الدين الباقي، بمالكه

| # | البند | الخطورة | المالك |
|--:|---|---|---|
| D1 | **الـstep-up مش موجود** — مساري الحذف النهائي بيرفضوا كل طلب. مختبَر وموثَّق، مش stub | مقصود | الدفعة 5 |
| D2 | **حساب مؤرشف بيحتفظ بتوكن الوصول 15 دقيقة** — نص التحديث مقفول، نص الوصول مفتوح. اختبار it.failing بيوضّحه | Important | الدفعة 5 (الجلسات) |
| D3 | `base.repository.ts` مفيهوش `runValidators` — الطبقة التانية تحت إصلاح C1 | Important | الدفعة 9 |
| D4 | `sensitiveFields` في خريطة القدرات **مخالف لعلامات الـschema في الاتجاهين**، وبلا حارس وبلا مستهلك | Important | الدفعة 6a (قبل ما تبني عليه) |
| D5 | `permissions.guard.ts:90` بيعمل cast لمعرّف خام → BSONError، فالرفض بيرجع **500 مش 403** وصف AccessDenied مابيتكتبش | Important | الدفعة 9 |
| D6 | حذف صورة من ألبوم بيتسجل `albums:Update` ومعرّف الصورة مش في الصف؛ وفرع الفصل مابيكتبش صف mediaAssets | Important | media-center |
| D7 | `ACTION_ORDER` **قايمة مثبَّتة** مش استنتاج — استيرادها وقت التشغيل بيحط mongoose في حزمة المتصفّح | Minor (محروس في الاتجاهين) | خطوة صغيرة: استخراج PERMISSION_ACTIONS لملف بلا تبعيات |
| D8 | **الـspec متعفّن في مواضع** — قسم 6.1 لسه بيوصّف شيل الحقول «إلا لو الفاعل شايل ViewSensitive» وهو **مابقاش قابلًا للمنح**، فلو نُفّذ حرفيًا **الشيل بيحصل دايمًا**؛ وقسم الموارد لسه بيقول purgeable: 10، و69 موردًا، وUpdate +30، و5 أزواج محفوظة؛ والقوالب 3 و4 و5 و6 متعفّنة | **Important** | قبل الدفعة 6 |
| D9 | `RevisionsService.assertHardDeletable` **مفيش controller بيناديه** — فالمسطرة اللي ADR-0120 والملحق بيقارنوا بيها ساكنة هي كمان | Minor | الدفعة 9 |
| D10 | خمس routes تنقّل في الموقع مالهاش صفحات — سابقة للدفعة | Minor | شغل الموقع |
| D11 | `api/_scan.mjs` **ملف مؤقت مهجور في جذر api/** — هيتعمله commit لو محدش شاله | — | **يتشال قبل الـcommit** |
| D12 | اقتراح الأرشفة على **5 خدمات** بس (اللي في دورة النشر)، و**17 خدمة** فيها مرجع وسائط برا النطاق | تضييق معروض | الدفعة 6 |
| D13 | تعليقات الدفعة 2 لسه مش متوافقة مع قاعدة التعليقات الجديدة؛ **واللي بيحكي تاريخ محتواه ينتقل للـADR الأول مش يتحذف** | Minor | الدفعة 9 |

## 4. الأسئلة المفتوحة

1. **`users:Archive` و`users:Restore`: يدخلوا المجموعة المحفوظة؟** المراجعة أثبتت استغلالًا: الـroutes كانت بترجّع بيانات الحساب كاملة تحت زوج قابل للمنح، فدور يأرشف كان بيقرا كل اللي `users:Read` بيحميه. **الـleak اتقفل** (الرد بقى معرّف بس)، **والسؤال الأصلي لسه قايم**.
2. **الـids المخزّنة بإملاءين** — نتيجة إن كل `@Prop({ type: Types.ObjectId })` بيتحوّل لمسار Mixed، فمفيش cast وقت الكتابة. فحص المراجع بيطابق الإملاءين، **والباقي في المشروع مش مقيس**.
3. **فترة سماح حذف رسائل التواصل** — `hardDeleteEligibleAt` اتشال، والدفعة 6c بتجيب `messagesPurgeEnabled`. لسه محتاج: هل فيه فترة احتفاظ، وإيه اللي يبدأها.
4. **`Approve` لكل نوع** — مؤجّل للدفعة 4 بقرار، و`workflowInstances:Approve` مؤقت.

## 5. القرارات اللي أخدتها، وأنهي واحد طلع غلط

| القرار | النتيجة |
|---|---|
| القاموس اندمج في Task 1 | صح — الخريطة مكانتش تترجم لوحدها |
| الـ3 أزواج roles تتصلّح في الدفعة 2 | صح — كانت routes محدش يقدر يناديها |
| شيل Approve لكل نوع من الخريطة | صح — الكود سجّل إنها كانت صامتة |
| Publish ×4 متطبّقة في الخدمة، والفحص هو الأعمى | صح |
| شيل ViewSensitive (هدف 0) | صح |
| حلّ الأسماء route مش إثراء | صح — Task 10 أثبتته: الإثراء كان هيعمل دورة modules |
| displayName زوج لغوي | صح |
| الرفض المحفوظ على مسار البناء بس | **المنطق صح، والمقدّمة مش مُثبَتة** — تحت |
| **«اتصلّح كفصيلة» عند الـcast** | **غلط — الفصيلة كانت `@IsOptional()`، والفاتورة C1** |
| «مراجعة Task 1 الغايبة يغطّيها آخر الدفعة» | **غلط — البديل حارس مش قارئ تاني** |
| ACTION_ORDER تفضل مثبَّتة | معقول — محروسة في الاتجاهين ومُثبَت إنها بتعض |

**أخطر غلطة مني:** حدّدت فصيلة عيوب الـnull عند **الـcast** بدل **`@IsOptional()`**. `PartialType` بيحط `@IsOptional()` اللي **بيتخطّى كل الـvalidators على null**، و`updateById` مفيهوش `runValidators`. فـ**31 endpoint** كانوا بيكتبوا null في حقول required — مقيس حيًّا: PATCH على countries بـ`{"type": null}` = صفر خطأ والقيمة اتخزّنت. الحارس اللي كتبته **بيسمّي `@IsOptional()` في ترويسته** وبرضه حدّدت النطاق عند الـcast. **اتصلّح: 32 DTO + حارس على الفصيلة الصح.**

**والمقدّمة غير المُثبَتة:** `isSuperAdminOnly` بيتنادى في `assertGrantable` بس، **اللي عمره ما بيراجع الأدوار المخزّنة**، والمجموعة المحفوظة كبرت من 5 لـ8 **في الدفعة دي**. فدور مخصّص موجود **من قبل** وشايل `users:Read` لسه بيمنحه، وصاحبه بيعدّي القاعدة 1، **ويمرّر قراية إيميلات الموظفين لحساب تاني بلا Super Admin**. المطلوب: **خطوة تقرير قراءة-فقط (تتكتب، ماتتشغّلش)** بتسرد الأدوار غير النظامية اللي شايلة زوجًا محفوظًا.

## 6. اللي الإغلاق مسكه بعد ما الـ13 مهمة كانت «خضراء»

أربع حاجات **مالحقتهاش أي مراجعة مهمة**، وكلهم بره حدود المهمة الواحدة:

1. **76 اختبار مش بيجروا** — `partial-update.spec.ts` (609 سطر، 27 خدمة) و`super-admin-only.spec.ts` (الأزواج التمانية). نمط الـrunner كان `partial-update\.util` **مابيطابقش** الملف. الدليل على الإصلاح إن العدد طلع من 157 لـ233، **مش إنهم اتكتبوا في قايمة**.
2. **بنود واجهة مخفية عن الكل** — 5 منح تنقّل + 4 شاشات بتتحقق من Delete، وهو فعل مفيش دور يقدر يشيله. **زرار الحذف كان مخفيًا نهائيًا.**
3. **عدّاد ألبوم بينحرف للأبد** — الاسترجاع كان بيعمل updateMany خام، فيتخطّى المكان الوحيد اللي بيعمل `$inc`. **نفس فصيلة العيب اللي 7b صلّحها من الاتجاه المعاكس.**
4. **130 زوج مستحيل يُمنح من الواجهة** — `ACTION_ORDER` هو النوع اللي محرّر الأدوار مبني عليه، وكان لسه شايل التسعة القديمة.

**والمشترك:** كل مهمة كانت صح في نفسها، والعيب في **السَّيْم** بينها وبين حزمة أو ملف تالت. مراجعة المهمة بتشوف الـdiff؛ **الحُرّاس الكاملين والمراجعة الهيكلية شافوا الفراغ بين الـdiffs.**

**وخمس اختبارات في الدفعة كانت مابتأكّدش على حاجة**، واحد منهم بتاعي (A ⊆ A): الاتجاه التالت في الكتالوج، وحارس الانحراف، و«أقل من 20 استعلام»، وحالتَي «بترجّع فاضي»، و`permission-matrix.spec.ts`. **الخامس بيثبّت الجهة القديمة.**

## 7. المسارات اللي الجلسة الجاية محتاجاها

| الملف | ليه |
|---|---|
| `docs/superpowers/plans/2026-09-27-batch-2-capability-map.md` | الخطة، **وجولتا التعديلات في آخرها بتغلب النص اللي فوقها** |
| `docs/superpowers/plans/2026-09-26-authz-authn.md` | خريطة الدفعات 3–9، وفيها **الدفعة 6c** الجديدة وقسم تمديد الـrate limit |
| `docs/superpowers/specs/2026-09-26-authz-authn-design.md` | الـspec — **ومتعفّن، شوف D8 قبل ما تبني عليه** |
| `docs/engineering/guard-tests.md` | كتالوج الحُرّاس، والأمرين، وخط الأساس المؤرَّخ |
| `docs/design-system/ADR-0103 · ADR-0104 · ADR-0120` | قاموس الأفعال · المنح والإسناد · الحذف النهائي للوسائط |
| `docs/audits/schema-audit-2026-09-04.md` | **ملحق مؤرَّخ في آخره** بسبب شيل `hardDeleteEligibleAt` |
| `api/src/common/authz/` | `capability-map.ts` · `media-references.ts` · `orphaned-media.ts` + حُرّاسهم |
| `api/src/common/utils/partial-update.util.ts` | الـsetters المعتمدة، وحارسها |
| `api/src/modules/platform-administration/users/user-authority.ts` | **المقارنة الوحيدة** |
| `api/src/modules/workflow/audit-logs/audit-action.util.ts` | الاشتقاق الوحيد لفعل السجل |
| `scripts/test-guards.mjs` | الـrunner — **أي حارس جديد يتسجّل فيه وفي الكتالوج في نفس المهمة** |

## 8. قبل الـcommit

1. **شيل `api/_scan.mjs`** — ملف مؤقت مهجور في جذر api/.
2. **أعِد توليد `api/openapi.json` مرة واحدة** — اتولّد أكتر من مرة وسط الدفعة (312 → 339 → 340 مسارًا)، فالأفضل توليدة أخيرة على الشجرة الكاملة.
3. **`roles.service.ts` وملفات تانية بتخلط شغل الدفعة 2 بمتابعة الدفعة 1 غير المعمولة commit** — فماينفعش commit «الدفعة 2 لوحدها» للملفات دي. ده نتيجة قاعدة الـGit، ومذكور من وقت ما ظهر مش وقت الـcommit.
4. أوامر الـcommit مكتوبة كنص في تقارير المهام في الـscratchpad.

# G1 — تقرير توقّف جزئي

التاريخ: 2026-09-29 · **توقّف بقرار المالك** · لم يُرجَّع أي تعديل · لم يُنفَّذ أي أمر Git يغيّر حالة

نقطة التوقّف نضيفة: المهمة 4 رجعت DONE وكل الاختبارات خضرا قبل أمر التوقّف بدقايق، فمااحتاجش أوقف حاجة في نصها.

---

## 1. قياس الحالة الآن

كل الأرقام دي شغّلتها بنفسي بعد التوقّف، مش منقولة من تقرير وكيل.

| الفحص | النتيجة |
|---|---|
| `npx tsc --noEmit` | **exit 0، مفيش أي خرج** |
| `npm test -- --runInBand src/modules/federation-governance/` | **33 suite / 322 اختبار — كلهم نجحوا** |
| `npm test -- --runInBand src/common/utils/ src/common/authz/ src/common/constants/` | **21 suite / 342 اختبار — كلهم نجحوا** |
| `npm test -- --runInBand src/bootstrap/` | **2 suite فشلوا / 18 نجحوا · 10 اختبارات فشلت / 195 نجحوا** |

### فشل الـbootstrap العشرة — ليست من G1

كلهم سبب واحد، أكّدته بنفسي:

```
contactMessages 6a99ad3038a2eaf20a1dd816: hardDeleteEligibleAt is not in the schema
```

حقل قديم في seed fixture محفوظ في الـcommit، لحقل اتشال من الـschema في commit سابق. المدقّق بيرمي عند أول حقل مجهول، فبيوقف حلقة التحقق كلها ويخفي باقي الفحوص. **مش من شغل G1**، ومالمستهوش.

مهم: لما المهمة 4 خلّت `slug` مطلوب، ظهرت 9 حالات فشل جديدة في نفس أسماء الاختبارات (`federationPersonnel ... Path 'slug' is required`)، وده كان بيغطّي على السبب الأصلي. المنفّذ أضاف `slug` للـ8 سجلات في fixture التطوير، والفحص اللي عملته دلوقتي بيأكد إن السبب الوحيد الباقي هو `contactMessages` — مفيش أي أثر لـ`federationPersonnel`.

---

## 2. اللي خلص

| المهمة | الحالة | المراجعة |
|---|---|---|
| **1 — `federationPositions`** | مكتملة | مراجعة مستقلة ✅ + جولة إصلاح واحدة |
| **2 — تصنيف اللجان وقواعد التبعية** | مكتملة | مراجعة مستقلة ✅ + جولتا إصلاح |
| **3a — قواعد المناصب والإغلاق وتغيير الرئيس** | مكتملة | مراجعة مستقلة ✅ + جولتا إصلاح (فيهم عيب Critical) |
| **3b — إزالة `roleType`** | مكتملة | مراجعة مستقلة ✅ + جولتا إصلاح |
| **4 — حقول الأشخاص** | **الكود خلص، المراجعة لأ** | ⚠️ **لم تُراجَع** |

### المهمة 1 — `federationPositions`
collection جديدة: `title`, `body` (board/committee), `rank`, `displayOrder`, `maxHolders`, `isVisible`، وحارس أرشفة بيرفض أرشفة وظيفة عليها منصب مفتوح. مسجّلة في الكتالوج بنفس نمط الموارد الموجودة. 6 اختبارات.

### المهمة 2 — تصنيف اللجان
الحقول المعتمدة كلها (`slug`, `summary`, `about`, `duties[]`, `formationDecision`, `documentIds[]`, `isVisible`, `kind`, `parentCommitteeId`)، و`CommitteeHierarchyService` بالأربع رفضات: دائمة معاها أم، تابعة لنفسها، دايرة على أي عمق، وأم مش موجودة أو مؤرشفة. الحقول القديمة كلها زي ما هي، وقاعدة المجلس 2026-09-01 عن `isActive` سليمة.

### المهمة 3a — المناصب
`positionId` و`endReason` و`isVisible`، و`AppointmentRulesService`، وإغلاق بتاريخ وسبب من غير حذف، وتغيير الرئيس في transaction واحدة.

### المهمة 3b — إزالة `roleType`
`roleType` و`positionTitle` اتشالوا، و`positionId` بقى مطلوب، وعشرة مستهلكين اتنقلوا (تلاتة منهم مااكتشفهمش التخطيط: خدمة صفحة كلمة الرئيس، و`governance-page-activation.spec`، وe2e spec برا `api/src` ماظهرش غير من `tsc`).

**فحص القبول** — `grep` على `'President'` و`'BoardMember'` و`LEADERSHIP_ROLES` و`APPOINTMENT_ROLE_TYPES`: كل النتائج الباقية **نصوص محتوى** (اسم شخص في fixture، أو `title`/`signatoryTitle`)، **ومفيش ولا enum ولا نوع ولا شرط تفرّع**. قرار المالك رقم 2 متحقق.

### المهمة 4 — حقول الأشخاص (⚠️ غير مُراجَعة)
`slug` (ثابت بعد الإنشاء) و`honorific` و`cv` (خمس مصفوفات، كل عنصر بـ`isVisible` و`order`) و`showPublicContact` (مقفول افتراضيًا). `internalContact` مالمستهوش نهائيًا. الاختبارات خضرا (12 في الوحدة، 322 في النطاق) و`tsc` نضيف — **لكن مامرّتش على مراجع مستقل**. ده الفرق الوحيد بينها وبين اللي فوقها.

---

## 3. اللي مابدأش

| المهمة | الحالة |
|---|---|
| **5 — المسارات العامة للقراءة** | مابدأتش. لا ملفات ولا اختبارات |
| **6 — سكريبت الترحيل** | مابدأتش. **السكريبت مااتكتبش أصلاً** |

المهمة 5 هي: صفحة المجلس مع بيانات الهيكل التنظيمي، وقايمة اللجان مجمّعة بالنوع، وصفحة اللجنة بالـslug، والملف الشخصي بالـslug — كلهم بقايمة سماح.

---

## 4. السكريبتات

**مفيش سكريبت اتكتب ومااتشغلش، ومفيش سكريبت اتشغّل.**

سكريبت الترحيل بتاع المهمة 6 (`migrate-appointments-to-positions.ts`) **مااتكتبش** لأن المهمة مابدأتش.

**تنبيه مهم عن الـseed:** ملفات fixture التطوير اتعدّلت (`federationAppointments.json`، `federationPersonnel.json`، و`federationPositions.json` جديد) عشان تفضل صالحة بعد تغيير الـschema. **مافيش أي seed اتشغّل على أي قاعدة بيانات.** والتعديلات دي ترحيل لقيم كانت موجودة في الـcommit بالفعل — أكّدته بـ`git show HEAD:api/seed/dev/federationAppointments.json`، واللي فيه `roleType: "President"` ونفس النص العربي/الإنجليزي. **مفيش اسم شخص ولا لجنة جديدة اتزرعت.**

---

## 5. كل ملفات G1

مهم: الشجرة فيها كمان شغل **جلسة موازية** (`uaeaf-project-8d`) على المواسم والفعاليات والداشبورد والموقع. القايمة دي **ملفات G1 بس** — استخدمها للـcommit، مش `git add -A`.

### آمنة للـcommit (كلها مُراجَعة ومُختبَرة)

**معدّلة**
```
api/src/app.module.ts
api/src/common/authz/capability-map.ts
api/src/common/authz/media-references.ts
api/src/common/authz/partial-update.spec.ts
api/src/common/constants/permission-resources.ts
api/src/common/utils/raw-dto-cast-scan.spec.ts
api/src/modules/federation-governance/about-federation-page/about-public-projection.ts
api/src/modules/federation-governance/about-federation-page/about-public-projection.spec.ts
api/src/modules/federation-governance/committees/committees.module.ts
api/src/modules/federation-governance/committees/committees.service.ts
api/src/modules/federation-governance/committees/committees.service.spec.ts
api/src/modules/federation-governance/committees/dto/create-committees.dto.ts
api/src/modules/federation-governance/committees/dto/update-committees.dto.ts
api/src/modules/federation-governance/committees/schemas/committees.schema.ts
api/src/modules/federation-governance/election-cycles/schemas/election-cycles.schema.ts
api/src/modules/federation-governance/federation-appointments/dto/appointment-public-response.dto.ts
api/src/modules/federation-governance/federation-appointments/dto/create-federation-appointments.dto.ts
api/src/modules/federation-governance/federation-appointments/federation-appointments.controller.ts
api/src/modules/federation-governance/federation-appointments/federation-appointments.module.ts
api/src/modules/federation-governance/federation-appointments/federation-appointments.repository.ts
api/src/modules/federation-governance/federation-appointments/federation-appointments.service.ts
api/src/modules/federation-governance/federation-appointments/federation-appointments.service.spec.ts
api/src/modules/federation-governance/federation-appointments/federation-appointments.public.spec.ts
api/src/modules/federation-governance/federation-appointments/schemas/federation-appointments.schema.ts
api/src/modules/federation-governance/governance-page-activation.spec.ts
api/src/modules/federation-governance/president-message-page/president-message-page.service.ts
api/src/modules/federation-governance/president-message-page/president-message-page.service.spec.ts
api/src/bootstrap/president-message-fixture.spec.ts
api/src/bootstrap/seed-dev.ts
api/src/bootstrap/seed-dev.spec.ts
api/seed/dev/federationAppointments.json
api/test/e2e/president-message-publishing.e2e-spec.ts
```

**جديدة**
```
api/src/modules/federation-governance/federation-positions/            (المجلد كله — 8 ملفات)
api/src/modules/federation-governance/committees/committee-hierarchy.service.ts
api/src/modules/federation-governance/committees/committee-hierarchy.service.spec.ts
api/src/modules/federation-governance/committees/schemas/committee-duty.schema.ts
api/src/modules/federation-governance/committees/schemas/formation-decision.schema.ts
api/src/modules/federation-governance/committees/dto/committee-duty.dto.ts
api/src/modules/federation-governance/committees/dto/formation-decision.dto.ts
api/src/modules/federation-governance/committees/dto/update-committees.dto.spec.ts
api/src/modules/federation-governance/federation-appointments/appointment-rules.service.ts
api/src/modules/federation-governance/federation-appointments/appointment-rules.service.spec.ts
api/src/modules/federation-governance/federation-appointments/federation-appointments.replace-chair.transaction.spec.ts
api/src/modules/federation-governance/federation-appointments/dto/close-appointment.dto.ts
api/src/modules/federation-governance/federation-appointments/dto/replace-chair.dto.ts
api/src/modules/federation-governance/federation-appointments/dto/create-federation-appointments.dto.spec.ts
api/seed/dev/federationPositions.json
docs/superpowers/plans/2026-09-29-governance-g1.md
docs/superpowers/reports/governance-G0.md
```

### ⚠️ حالتها ناقصة — من المهمة 4، غير مُراجَعة

الكود بيعمل compile والاختبارات بتعدّي، بس **مامرّش على مراجع مستقل**. كل مهمة قبلها المراجعة لقت فيها حاجة، واتنين منهم كانوا خطيرين — فاحتمال إن دي نضيفة تمامًا مش عالي.

```
api/src/modules/federation-governance/federation-personnel/schemas/federation-personnel.schema.ts      [معدّل]
api/src/modules/federation-governance/federation-personnel/federation-personnel.service.ts             [معدّل]
api/src/modules/federation-governance/federation-personnel/federation-personnel.service.spec.ts        [معدّل]
api/src/modules/federation-governance/federation-personnel/dto/create-federation-personnel.dto.ts      [معدّل]
api/src/modules/federation-governance/federation-personnel/dto/update-federation-personnel.dto.ts      [معدّل]
api/src/modules/federation-governance/federation-personnel/schemas/personnel-cv.schema.ts              [جديد]
api/src/modules/federation-governance/federation-personnel/dto/personnel-cv.dto.ts                     [جديد]
api/src/modules/federation-governance/federation-personnel/dto/update-federation-personnel.dto.spec.ts [جديد]
api/seed/dev/federationPersonnel.json                                                                  [معدّل]
```

**تقدر تعمل commit للاتنين مع بعض** (الشجرة خضرا بالكامل)، **أو تفصل المهمة 4 في commit تاني** عشان تستنى مراجعتها. لو فصلتها: ملفات المهمة 4 **مالهاش تبعية** من المهام 1–3b، لكن `api/seed/dev/federationPersonnel.json` لازم يروح معاها — من غيره `src/bootstrap/seed-dev.spec.ts` هيفشل بـ`Path 'slug' is required`.

---

## 6. عيوب معروفة لم تُصلَّح (بأمر التوقّف)

1. **تعليقان بيخالفوا قاعدة التعليقات** — بيذكروا رقم مهمة، وده ممنوع صراحة في القسم 9:
   - `federation-personnel/schemas/federation-personnel.schema.ts:36` — «same reasoning as `committees.slug` (Task 2)»
   - `federation-personnel/federation-personnel.service.spec.ts:69` — «Task 4: `slug` backs the public profile page»

   الاتنين من المهمة 4، ودي بالظبط نوع الحاجة اللي المراجعة كانت هتمسكها.

2. **المهمة 4 من غير مراجعة مستقلة** (فوق).

---

## 7. قرارات أخدتها لوحدي

| القرار | السبب | لو غلط |
|---|---|---|
| مفيش worktree ولا فرع ولا commit؛ الـdiffs من الشجرة | §33 و§9 يمنعوا أي أمر Git بيغيّر حالة، وتعليمات المالك أعلى من الـskill | الـcommit بيتعمل من قايمة الملفات مش من نطاق commits |
| أسماء الحقول الموجودة تفضل زي ما هي: `fullName`≡`name`، `displayOrder`≡`order`، `electionCycleId`≡`cycleId`، `cycleName`≡`label`؛ و`isCurrent` تتشتق من `status === 'Active'` | إعادة التسمية بتلخبط snapshots الموافقات والـDTOs العامة والشاشات المبنية من غير أي مكسب، والمالك مطلبهاش | القسم 2 كان قاصد تسمية حرفية، والتصحيح رخيص |
| `isVisible` على اللجنة **أُضيف بجانب** `isActive` مش بدلاً منه | `isActive` عليه قرار مجلس موثّق (2026-09-01) إنه وصفي ومالوش أثر على الظهور | حقلان بدل واحد على اللجنة |
| كسر دورة الاعتماد: `FederationPositionsModule` بيسجّل schema المناصب بنفسه بدل ما يستورد موديولها | `forwardRef` بيخفي المشكلة مش بيحلها | خطأ DI بيظهر فورًا في الاختبارات |
| `BaseRepository` اتراجع؛ تمرير الـsession اتنقل لمستودع المجال | المشروع فيه النمط ده مرتين (`role-assignments.repository.ts`، `seasons.repository.ts`) ومحدش منهم بيوسّع الأساس | تكرار بسيط لو موديول تاني احتاج sessions |
| المهمة 3 اتقسمت 3a/3b، والإضافة قبل الحذف | حذف `roleType` الأول كان هيكسر إسقاط صفحة «عن الاتحاد» والـDTO العام وfixture الـbootstrap مرة واحدة | الـschema فيه طريقتين لتسمية منصب على مدى مهمة واحدة |
| `isVisible` اتشال من حساب الرتبة في `findActiveTopOfBoard()` | `isVisible` في كل المشروع فلتر عرض على حدود القراءة؛ ده كان المكان الوحيد اللي بيقرّر فيه **هوية**. إخفاء صف من قايمة ماينفعش يغيّر مين الرئيس | وظيفة مخفية لسه بتحسب في الهوية — الاتجاه المحافظ |
| `currentLeadership()` **مااتغيّرش** عشان يطابقها | ده سؤال سياسة عرض مالوش إجابة موثّقة → §24 يخلّيه قرار المالك | الطريقتان يفضلوا غير متماثلين على الصفوف المخفية لحد قرارك |
| فلتر كلمة الرئيس رجع كـ«صاحب أعلى وظيفة مجلس بالرتبة» مش برقم ثابت | نفس اشتقاق `currentLeadership()` وقاعدة رئيس اللجنة؛ الرتب بيانات أدمن فالأعلى مش مضمون إنها 1 | اتحاد يدّي وظيفتين نفس أعلى رتبة هيطلّع الاتنين |
| فجوة `null` عبر `@IsOptional()` اتقفلت **للحقول الجديدة بس** | المشكلة موجودة في المشروع كله من قبل الشغل ده؛ §7 بيحط تغيير عُرف عام برا الدفعة | الحقول الجديدة أصرم من جيرانها — الاتجاه الآمن |

---

## 8. أسئلة محتاجة قرارك

### س1 — صفحتا المجلس واللجان مش مسجّلتين في محرك الموافقات (قرارك رقم 1)
`boardMembersPage` و`committeesPage` **مش** في `WORKFLOW_ENTITY_TYPES`، بينما `visionMissionPage` و`presidentMessagePage` و`strategicPlansPage` و`aboutFederationPage` كلهم فيها. الصفحتان موصوفتان صراحة في كودهما كـ«page furniture غير محكومة بالـworkflow». **توصيتي: سيبهم على `isActive` لحد الدفعة 4 تسجّلهم مع الباقي** — البدائل الكاملة في §9 من `governance-G0.md`.

### س2 — `isVisible` على وظيفة مجلس: عرض بس، ولا يخفي الشخص كمان؟
دلوقتي: إخفاء وظيفة مابيغيّرش مين الرئيس (اتصلّح)، لكن `currentLeadership()` مابيبصّش على `isVisible` خالص، فصاحبها لسه بيظهر في لوحة القيادة في صفحة «عن الاتحاد». الإجابتان مقبولتان ومفيش وثيقة بتحسم. **DESIGN DECISION REQUIRED.**

### س3 — index على الـslug (§7 بيطلب موافقة)
`committees.slug` و`federationPersonnel.slug` دلوقتي محميين بـ`assertSlugFree` في الخدمة **بس**، ودي فيها سباق: طلبان متوازيان بنفس الـslug ممكن الاتنين يعدّوا. عُرف المشروع في كل schema تانية فيها slug:
```ts
Schema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } })
```
**توصيتي: اعتمد الاتنين** — نفس النمط الموجود بالظبط، وهو اللي بيخلّي التفرّد مضمون فعلاً.

### س4 — دَين خارج G1: `contactMessages.hardDeleteEligibleAt`
حقل قديم في seed fixture بيوقف **حلقة التحقق من الـseed كلها** للمشروع كله (10 اختبارات). سطر واحد في JSON واحد. برا نطاق G1 فمالمستهوش. **محتاج قرارك مين يصلّحه.**

---

## 9. الخطوة الأولى في الجلسة الجاية

بالترتيب:

1. **اقرا:** `docs/superpowers/reports/governance-G0.md` (القياس)، والتقرير ده، و`docs/superpowers/plans/2026-09-29-governance-g1.md` (الخطة).
2. **أكّد الشجرة:** `npx tsc --noEmit` لازم يطلع 0، و`npm test -- --runInBand src/modules/federation-governance/` لازم 322/322. لو لأ، الجلسة الموازية غيّرت حاجة — قيس قبل ما تبني.
3. **المراجعة المستقلة للمهمة 4** — دي أول حاجة، قبل أي كود جديد. الملفات في §5 فوق، وتقرير المنفّذ في:
   `scratchpad/sdd-g1/task-4-report.md`
   وفيها عيبان معروفان مسبقًا (التعليقان في §6). ركّز المراجعة على: قايمة سماح `toPublicResponse` ما اتوسّعتش، و`internalContact` مالمستهوش، و`cv` فعلاً بيرفض `null`، وثبات الـslug بعد الإنشاء متختبَر باختبار بيفشل لو الحارس اتشال.
4. **بعدها المهمة 5** (المسارات العامة) — الوصف في §Task 5 من الخطة. تعتمد على 1 و2 و3a و3b و4 كلهم.
5. **وبعدها المهمة 6** (سكريبت الترحيل، يتكتب ومايتشغّلش).
6. **آخر حاجة:** `/simplify` على ملفات الدفعة بس، ومراجعة الفرع كامل، و`docs/engineering/governance.md` بالبنود التسعة.

**سجل التقدّم الكامل** (كل قرار وكل جولة إصلاح) في:
`C:\Users\pc\AppData\Local\Temp\claude\e--uaeaf-uaeaf-project\585fcb8d-006f-4860-bc03-2419e2ea6ea8\scratchpad\sdd-g1\progress.md`
وده في مجلد مؤقت للجلسة — **انسخه لو عايزه يعيش بعدها.**

---

## 10. أوامر الـcommit (تشغّلها إنت — §33)

**خيار أ — كل G1 في commit واحد** (الشجرة خضرا بالكامل):

```
git add api/src/app.module.ts api/src/common/authz/capability-map.ts api/src/common/authz/media-references.ts api/src/common/authz/partial-update.spec.ts api/src/common/constants/permission-resources.ts api/src/common/utils/raw-dto-cast-scan.spec.ts api/src/modules/federation-governance/ api/src/bootstrap/president-message-fixture.spec.ts api/src/bootstrap/seed-dev.ts api/src/bootstrap/seed-dev.spec.ts api/seed/dev/federationAppointments.json api/seed/dev/federationPersonnel.json api/seed/dev/federationPositions.json api/test/e2e/president-message-publishing.e2e-spec.ts docs/superpowers/plans/2026-09-29-governance-g1.md docs/superpowers/reports/governance-G0.md docs/superpowers/reports/governance-G1-partial.md

git commit -m "Governance G1 (API): admin-defined positions, committee hierarchy, appointment lifecycle"
```

**خيار ب — المهام 1–3b دلوقتي، والمهمة 4 بعد مراجعتها:**

```
git add api/src/app.module.ts api/src/common/authz/capability-map.ts api/src/common/authz/media-references.ts api/src/common/authz/partial-update.spec.ts api/src/common/constants/permission-resources.ts api/src/common/utils/raw-dto-cast-scan.spec.ts api/src/modules/federation-governance/about-federation-page/ api/src/modules/federation-governance/committees/ api/src/modules/federation-governance/election-cycles/ api/src/modules/federation-governance/federation-appointments/ api/src/modules/federation-governance/federation-positions/ api/src/modules/federation-governance/governance-page-activation.spec.ts api/src/modules/federation-governance/president-message-page/ api/src/bootstrap/president-message-fixture.spec.ts api/seed/dev/federationAppointments.json api/seed/dev/federationPositions.json api/test/e2e/president-message-publishing.e2e-spec.ts docs/superpowers/plans/2026-09-29-governance-g1.md docs/superpowers/reports/governance-G0.md docs/superpowers/reports/governance-G1-partial.md

git commit -m "Governance G1 tasks 1-3b (API): admin-defined positions, committee hierarchy, appointment lifecycle"
```

⚠️ **خيار ب بيكسر الـbuild لوحده؟ لأ** — `tsc` والاختبارات بتعدّي، **لكن** `src/bootstrap/seed-dev.spec.ts` هيفشل بـ`Path 'slug' is required` لأن `federationPersonnel.json` (فيه الـslug) هيكون لسه برا الـcommit، بينما `seed-dev.ts` و`seed-dev.spec.ts` كمان برا. يعني الـcommit ده **متماسك**، بس `api/src/modules/federation-governance/federation-personnel/` بيفضل uncommitted ومعاه fixture الأشخاص. لو عايز خيار ب فعلاً، سيب `seed-dev.ts` و`seed-dev.spec.ts` مع المهمة 4.

**مفيش أمر Git بيغيّر حالة اتنفّذ في الجلسة دي.**

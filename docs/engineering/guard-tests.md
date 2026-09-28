# اختبارات الحراسة (Guard Tests): الكتالوج والأمران

## لماذا هذه الوثيقة

المستودع فيه نحو خمسين اختبارًا لا يفحص كل منها وحدة واحدة، بل **يمسح مصدر
المشروع نفسه** (عبر `readdirSync`/`readFileSync`، أو عبر استيراد كامل
لكتالوج محتوى مثل `ar.json`/`en.json`) ويقارنه بثابت أو قاعدة مُعلَنة. هذه
هي "الحُرّاس" (guards): `permission-catalogue.spec.ts` يتأكد أن كل
`@RequirePermission` في الكود له مقابل في الكتالوج وبالعكس،
`audit-route-coverage.spec.ts` يتأكد أن كل مسار كاتب يمر عبر السجل أو يُعلن
صراحةً لماذا لا يمر، وهكذا.

المشكلة أن لا أمر كان يجمعها. العمل اليومي يشغّل اختبارات الملفات التي
لمسها، وحارسان بقيا أحمرين دون أن يلاحظهما أحد:

- `apps/dashboard/src/lib/api/write-error-copy.spec.ts` — مؤرَّخ 21 سبتمبر،
  أحمر لأن ثلاثة رموز رفض لم يكن لها نص في أي من اللغتين. `next-intl` يعرض
  مسار المفتاح نفسه عند غيابه، فالعطل كان يظهر للمستخدم فعلاً.
- `api/src/common/guards/permissions.guard.spec.ts` — كان أحمر لأن الزوج
  المطلوب يقول فعلاً بينما الزوج الممنوح يقول فعلاً آخر. **ملاحظة:** هذا
  الملف لا يطابق معيار "الحارس" أدناه (لا قراءة لمصدر المشروع؛ يفحص وحدة
  `PermissionsGuard` عبر mocks فقط) فهو غير مُدرَج في الكتالوج، وذُكر هنا
  كدافع تاريخي فقط. عند فحصه في هذه المهمة كان **أخضر**.

الحل: أمران مُسمَّيان، وكتالوج يُحدَّث في نفس المهمة التي تضيف حارسًا جديدًا.
**حارس غير مُدرَج في هذه القائمة = حارس لا يعمل.**

## معيار الإدراج

حارس هو اختبار **يقرأ أو يمسح مصدر المشروع نفسه** (أو محتواه المُترجَم بالكامل
كملفات `ar.json`/`en.json`) ليقارنه بقاعدة أو كتالوج، لا اختبار يحمّل ملفًا
حقيقيًا كـ fixture ليغذّي به حالة اختبار وحدة واحدة. `readdirSync`/
`readFileSync` في `*.spec.ts` مؤشّر أولي، ثم يُحكَم بما يؤكّده الاختبار
فعليًا. مثال على التوسعة: `apps/web/src/lib/design-system/cover-scrim.spec.ts`
و`register-contrast.spec.ts` لا يستدعيان `fs` مباشرة، لكنهما يشتقّان القيم من
`@uaeaf/design-tokens/testing` (`themeTokens`) عبر كل ثيم/سجلّ فعليًا — نفس
روح `token-contrast.spec.ts` — فأُدرِجا.

## الأمران

| الأمر | ماذا يشغّل | متى | يحتاج خوادم التطوير؟ |
|---|---|---|---|
| `npm run test:guards:core` | 10 حُرّاس API (تخويل + تدقيق + وسائط) فقط | آخر **كل مهمة** | لا |
| `npm run test:guards` | كل الحُرّاس الـ53 في الحزم الثلاث | آخر **الدفعة (batch)**، والخوادم مُوقَفة | لا (لكنه لا يُشغَّل والخوادم شغّالة لضغط الذاكرة) |

الآلية: `scripts/test-guards.mjs` في جذر المستودع (Node عادي، بلا تبعية
جديدة). يبني نمط `--testPathPatterns` لـ Jest في `api/` بأسماء الملفات
الفريدة (تم التحقق أنها فريدة تحت `api/src` وقت كتابة هذه القائمة)، ويشغّل
`vitest run <مسارات صريحة>` في كل من `apps/dashboard` و`apps/web`. اخترتُ
سكربتًا واحدًا بدل سكربتات `test:guards` منفصلة في كل `package.json` لأن
قائمة الحراس الكاملة (27 مسارًا في `web` وحدها) تصبح سطرًا واحدًا هشًّا يصعب
مراجعته داخل نص JSON؛ في السكربت هي مصفوفات تُقرأ وتُراجَع بسهولة، وتبقى
**هذه الوثيقة والسكربت** هما نفس المرجع (يُحدَّثان معًا).

## الزمن المقيس

قِيس أول مرة 2026-09-27، وأُعيد قياسه 2026-09-28 (نفس جهاز التطوير) بعد إضافة
الحارس السادس (`audit-action-literal-scan`، الجولة الرابعة من المراجعة
المستقلة، I4)، ثم أُعيد قياسه مرة أخرى 2026-09-28 بعد إضافة الحارس السابع
(`raw-dto-cast-scan`، Task 6 الجولة الثانية):

| الطبقة | العدد | الزمن |
|---|---|---|
| `test:guards:core` (Jest، API فقط) | 9 | مُشغَّل فعليًا عبر `node scripts/test-guards.mjs core`: **11.2 و32.1 ثانية في تشغيلتين مقيستين** بعد إضافة الحارس التاسع (18.9 ثانية قبله؛ الفارق حِمل الجهاز لا الحارس — الحارس التاسع بيمسح الـcontrollers بلا قاعدة بيانات، وتلات خدمات dev شغّالة في الجلسة) (`archive-restore`، بيمسح الـcontrollers بلا قاعدة بيانات — أقل من ثانية). لا يزال بعيدًا جدًا عن حدّ الدقيقتين. الحارس الثامن (`media-reference-coverage`) بيقرا كل `*.schema.ts` من غير قاعدة بيانات: 3.5 ثانية لوحده. |
| `test:guards` (الحزم الثلاث) | 51 | **غير مقيس عمدًا** — ثلاثة خوادم تطوير شغّالة في هذه الجلسة وذاكرة القرص الحرّة ضيقة؛ المهمة نصّت صراحة على عدم تشغيل هذه الطبقة. يُقاس آخر الدفعة والخوادم مُوقَفة. |

`test:guards:core` بعيد جدًا عن حدّ الدقيقتين حتى بعد إضافة الحارس التاسع، فلم
يُحذف منه شيء. **عدد الطبقة الثالثة كان مكتوبًا 49 وهو 51:** الحارس الثامن
(`media-reference-coverage`) اتضاف للطبقة الأساسية ولهذا الجدول من غير ما يُزاد
إجمالي الحزم الثلاث. الرقم دلوقتي محسوب من `scripts/test-guards.mjs` نفسه
(9 أساسية + 5 باقي API + 10 dashboard + 27 web).

## الكتالوج

### الطبقة الأساسية (Core) — `api/`، تخويل وتدقيق

| المسار | ماذا يحرس |
|---|---|
| `api/src/common/authz/capability-map.spec.ts` | لا مسار في `permissions.controller.ts` يتيح إنشاء صلاحية عبر الـ API. |
| `api/src/common/constants/permission-catalogue.spec.ts` | كل `@RequirePermission(resource, action)` في `api/src` له مقابل في `PERMISSION_CATALOGUE`، وبالعكس — زوج مُعلَن لا يحرسه أحد. |
| `api/src/common/constants/permission-resources.spec.ts` | نفس الفحص على مستوى المورد (resource) وحده مقابل `PERMISSION_RESOURCES`. |
| `api/src/common/interceptors/audit-route-coverage.spec.ts` | كل مسار `POST/PATCH/PUT/DELETE` يمر عبر `AuditLogInterceptor` أو مُعلَن صراحة في `WRITES_ITS_OWN_ROW` مع سبب؛ وقيم `Archive/Restore/PermanentDelete` المُشتقة تطابق صلاحية المسار (ADR-0112). **أضافه عامل آخر يعمل بالتوازي في هذه الجلسة.** |
| `api/src/modules/workflow/audit-logs/schemas/audit-log.schema.spec.ts` | `SECURITY_AUDIT_ACTIONS` مجموعة فرعية من `AUDIT_ACTIONS`؛ والقيمة المهجورة `'HardDelete'` غير مكتوبة في أي مصدر إنتاجي عدا استثناء موثّق في `revisions.service.ts`. |
| `api/src/modules/workflow/audit-logs/audit-action-literal-scan.spec.ts` | لا ملف خارج `audit-action.util.ts` يكتب قيمة `action` حرفية (`Create`/`Update`/`Archive`/`Restore`/`PermanentDelete`/`Delete`/`HardDelete`) داخل استدعاء `auditLogsService.write(...)` — القيمة لازم تُشتَق عبر `auditActionFor`، لا تُكتب يدويًا. **مُضاف 2026-09-27 (الجولة الرابعة من المراجعة المستقلة) — كان موجودًا كملف اختبار منذ الجولة الثالثة، لكنه لم يكن مُدرَجًا هنا ولا في السكربت، فلم يكن يعمل ضمن `test:guards:core` إطلاقًا.** |
| `api/src/common/utils/raw-dto-cast-scan.spec.ts` | صفر استدعاء خام `new Types.ObjectId(`/`new Date(` جوه جسم `update()` نفسه (بميزان أقواس حقيقي، بعد شطب التعليقات وإخفاء محتوى الـstrings) — القاعدة عامة من غير شرط ذكر `dto.` في الوسيطة، فالاستثناء الوحيد المسموح هو `setObjectIdField`/`setDateField`/`setObjectIdArrayField` (`partial-update.util.ts`). مُقيَّد بجسم دالة `update()` نفسها لا الملف كله (`create()` آمن بحكم غياب `@IsOptional()` على حقوله المطلوبة). **حارس تاني ذاتي (meta-check) بيتأكد إن كل `*.service.ts` تحت `api/src/modules` فيه دالة `update(` إما مُدرَج في `UPDATE_METHODS_USING_SHARED_SETTERS` (31 ملفًا) أو في `UPDATE_METHODS_NOT_USING_SHARED_SETTERS` (9 ملفات، كل واحد بسببه) — فمورد جديد من Task 7 فصاعدًا يفشل الحارس لحد ما حد يقرر له مكانه، بدل ما يفوت من غير حد يلاحظ (نفس عطل «كتبت الحارس ونسيت تسجّله» اللي التوثيق ده بيسجّله مرتين قبل كده، درجة تانية تحت). الفحص بالاتجاهين: ملف مش مُدرَج يفشّل الحارس، وملف مُدرَج باقي مالوش `update()` تاني (استثناء بايت) يفشّله برضو.** **مُضاف 2026-09-28 (Task 6، الجولة الثانية) بعد اكتشاف أن `new Types.ObjectId(null)`/`new Date(null)` تبني قيمة عشوائية/تاريخ 1970 بدل الرفض أو المسح؛ اتصلّح (الجولة التالتة) بعد لقاء ثغرتين في الحارس نفسه — قلب القاعدة (تجاهل اسم البارامتر) وإضافة الـmeta-check، اللي بناء قايمته كشف 4 حالات حية من نفس العلّة في ملفات كانت وقتها برّا القايمة (`pageSections.items`، و`startDate` في `sponsorships`/`memberships`/`partnerships`)؛ اتصلّحت الأربعة كمان (الجولة الرابعة، وهي اللي قفلت Task 6) وانتقلت لقايمة `UPDATE_METHODS_USING_SHARED_SETTERS`، فقايمة الاستثناء نزلت من 13 لـ9. القايمتان اتسمّوا في نفس الجولة (كانت `TASK_6_UPDATE_METHODS`/`PRE_EXISTING_UPDATE_METHODS_NOT_MIGRATED`) عشان الاسم يوصف المحتوى لا المهمة اللي كتبته.** **وفحص تالت مُضاف 2026-09-28 (موجة الإصلاح بعد مراجعة آخر الدفعة 2، البند C1): كل `export class *Dto extends PartialType(` تحت `api/src/modules` لازم يمرّر `{ skipNullProperties: false }`.** بدون الخيار ده `PartialType` بيحطّ `@IsOptional()`، و`@IsOptional()` بيلغي كل المدقّقات التانية لما القيمة `null` — فـ`{"type": null}` على enum مطلوب كان بيعدّي بصفر أخطاء، و`partialUpdate` بيمرّره، و`updateById` مابيمرّرش `runValidators`، فالسجل بيتخزّن وفيه `null` على مسار `required`. المجموعات التلاتة للحارس بقت: صفر cast خام، وكل `update()` مُدرَج، وكل `Update*Dto` بيرفض الـnull. **الفحص بالاشتقاق لا بقايمة ملفات** (القاعدة خاصية في التصريح نفسه)، وفيه عدّ صريح (32 صنفًا) عشان المسح مايعديش على مجموعة فاضية، ومعاه اختبار عيب مزروع. |

| `api/src/common/authz/media-reference-coverage.spec.ts` | تغطية فحص مراجع الوسائط (`findMediaAssetReferrers`) — آخر حاجة واقفة بين الحذف النهائي وصفحة منشورة. بيقرا **كل** `*.schema.ts` تحت `api/src` (استيراد ديناميكي، بلا قاعدة بيانات) ويفشل لما يظهر حقل جديد الفحص ماينفعش يمشي وراه: (أ) حقل نصّي اسمه فيه `photo`/`image`/`logo`/`cover`/`thumbnail`/`media`/`asset`، (ب) **أي** حقل على شكل مُعرِّف من غير `ref` — بلا شرط الاسم، لأن شرط الاسم بيفوّت بالظبط المرجع المخفي اللي المسح ده موجود عشانه، (ج) حقل rich-text أو URL حر مش في قايمة المفحوص. الاتجاهان: مدخل مُعلَن ماله حقل حي بيفشّل الحارس كمان، فالقايمة ماتتحوّلش لصندوق أعذار. كل استثناء معاه سببه، ومعرِّفات الـpolymorphic مصنَّفة **من الـenum بتاعها** لا من اسمها (قرار المالك 2026-09-28). **مُضاف 2026-09-28 (Task 7a من الدفعة 2) — بيقفل «فجوة الوسائط» المسجّلة تحت.** |
| `api/src/common/authz/archive-restore.spec.ts` | المسارات اللي بتدمّر شيئًا = بالظبط الموارد اللي خريطة القدرات بتسمح بتدميرها، بالاتجاهين، مقروءة من مصدر المشروع (كل `*.controller.ts`، بلا قاعدة بيانات). `capability-map.spec.ts` بيثبّت مجموعة `purgeable` بالاسم و`permission-catalogue.spec.ts` بيرفض decorator لزوج غير مُعلَن — لكن ولا واحد منهم بيلاحظ **مورد purgeable ضاع مساره** (صلاحية `PermanentDelete` محدش بيحملها بتدمّر ولا حاجة) ولا **مسار تالت ظهر جنب مدخل خريطة اتعدّل في نفس التغيير**. وفيه فحص إن المسح لقى حاجة أصلًا، عشان مسح فاضي مايعديش كأخضر. ومعاه اختبارات وحدة للقاعدتين المشتركتين (`assertArchivedFirst`، `refuseWithoutStepUp`). **مُضاف 2026-09-28 (ADR-0120).** |
| `api/src/common/authz/super-admin-only.spec.ts` | الثمانية أزواج `resource:action` المحجوزة اللي مايبنيش role حامل واحد منها غير الدور المزروع Super Admin (ADR-0104/ADR-0105): يثبّت أن `CAPABILITY_MAP`'s `superAdminOnly` هي بالظبط الثمانية دي ولا غيرها، وأن الكتالوج لسه مديها لدور Super Admin المزروع (المرفوض هو المنح، لا الحمل)، ويشغّل `RolesService.create` بمستودعات مموَّهة والفاعل حامل الكتالوج كله عشان الرفض يبقى قاعدة "المحجوز" نفسها لا "الفاعل ناقصه صلاحية". بلا قاعدة بيانات. **كان مكتوبًا (609+123 سطر مع `partial-update.spec.ts` تحت) من غير ما يتسجّل هنا ولا في `scripts/test-guards.mjs`، فكان لا يعمل إطلاقًا — اكتُشف واتصلّح 2026-09-28 (مهمة الإصلاحات البنيوية).** |

> **قاعدة الحُرّاس الثلاثة المتزامنين — حُسمت.** الملاحظة السابقة هنا قالت
> إن حارسًا ثالثًا (لسلاسل تدقيق مكتوبة يدويًا) "لم يظهر بعد". ظهر بالفعل في
> الجولة الثالثة (`audit-action-literal-scan.spec.ts`) لكنه أُضيف كملف فقط،
> لا إلى هذا الجدول ولا إلى `scripts/test-guards.mjs` — وهو بالضبط العطل
> الذي هذه الوثيقة كُتبت لمنعه (انظر "لماذا هذه الوثيقة" أعلاه). صُحِّح في
> الجولة الرابعة: الحارس مُدرَج الآن في الاثنين معًا.

### بقية حُرّاس API (ضمن `test:guards` فقط)

| المسار | ماذا يحرس |
|---|---|
| `api/src/common/services/page-activation-routes.spec.ts` | كود المتحكمات المرتبطة بـ `ACTIVATABLE_COLLECTIONS` متّسق مع مسارات تفعيل/تعطيل الصفحة. |
| `api/src/common/utils/partial-update.util.spec.ts` | لا خدمة في `modules/**` تعيد تنفيذ نمط تحديث جزئي يدوي بديل عن `partial-update.util`. |
| `api/src/common/authz/partial-update.spec.ts` | نفس قاعدة السطر فوق، لكن ممتدة لتغطي كل الـ27 service اللي بتستخدم `partial-update.util` فعليًا، واحدًا واحدًا، لا مطابقة عامة على النمط فقط. بلا قاعدة بيانات (مستودعات مموَّهة). يعيش تحت `common/authz/` رغم إنه مالوش علاقة بالـauthz، وده سبب ضياعه: محدّش سمّى ملفه هنا ولا في `scripts/test-guards.mjs` رغم كونه حارس 609 سطر على 27 service — اكتُشف واتصلّح 2026-09-28 (مهمة الإصلاحات البنيوية)، وحُطّ في نفس طبقة شقيقه فوق (`all` فقط) اتساقًا معه. |
| `api/src/common/utils/sponsorship-window.util.spec.ts` | جسم قاعدة نافذة الرعاية في `api/src` مطابق حرفيًا لنسخته في `packages/content/sponsors/window.ts`. |
| `api/src/modules/cms-page-composition/page-sections/hero-settings.spec.ts` | `HERO_PLAYBACK_INTERVALS` مطابقة لنفس القيمة في `packages/content/hero/limits.ts`. |
| `api/src/modules/cms-page-composition/hero-slides/hero-slides.visible.spec.ts` | `HERO_TEXT_LIMITS` مطابقة لنفس القيمة في `packages/content/hero/limits.ts`. |

### `apps/dashboard/src/lib/`

| المسار | ماذا يحرس |
|---|---|
| `api/write-error-copy.spec.ts` | كل رمز فشل كتابة (`WRITE_ERROR_CODES` وأخواتها) له نص في `ar.json` و`en.json` تحت كل سطح استخدام؛ ومفاتيح اللغتين متطابقتان. **ومن 2026-09-28 (موجة الإصلاح بعد مراجعة آخر الدفعة 2، البند C2) بيغطي كمان مساحة `PermissionAction`:** رؤوس أعمدة محرّر الأدوار هي `t(permission.action)`، ففعل معلَن في `PERMISSION_ACTIONS` ومالوش نص هنا بيتعرض كـ`PermissionAction.Archive` أمام من بيقرّر الدور يعمل إيه — وده اللي حصل فعلًا بعد ADR-0103 (اتغيّرت أسماء تلات أفعال واتضاف سبعة، ومحدش لاحظ). |
| `admin/albums/album-copy.spec.ts` | كل مفتاح `t("...")` مُستخدَم فعليًا في `.tsx` موجود في ملفي الترجمة. |
| `navigation.spec.ts` | التنقّل لا يطلب صلاحية (grant) غير موجودة في `permission-catalogue.ts` الفعلي للـ API. |
| `legacy-redirects.spec.ts` | `next.config.mjs` يستورد ويستخدم `LEGACY_REDIRECTS` فعليًا في التوجيه الحقيقي، لا قائمة معرَّفة وغير مُفعَّلة. |
| `security/credential-forms.spec.ts` | كل نموذج بيانات اعتماد في مصادر التطبيق يلتزم بقواعد أمان مُعلَنة (attributes/behaviour) على حقوله. |
| `design-system/class-conflict-contract.spec.ts` | لا تعارض بين فئتي وزن خط (`font-weight`) على نفس العنصر في أي `.tsx`. |
| `design-system/sticky-focus-contract.spec.ts` | كل عنصر مثبَّت أعلى الشاشة له مساحة محجوزة في `globals.css` أثناء التمرير. |
| `design-system/token-contract.spec.ts` | رموز التصميم (`--tokens`) المُعلَنة مطابقة للمُستخدَمة فعليًا في كل `TS/TSX/CSS`. |
| `design-system/token-contrast.spec.ts` | ألوان الثيمات (مُستخرَجة من CSS فعليًا) تحقق حدّ WCAG AA للتباين. |
| `design-system/interaction-state-contract.spec.ts` | كل عنصر تفاعلي يستخدم فئات حالة (`hover`/`focus`) المُعرَّفة مركزيًا في `components/ui/interactive.ts`. |

### `apps/web/src/lib/pages/`

| المسار | ماذا يحرس |
|---|---|
| `internal-links-contract.spec.ts` | كل رابط داخلي (من بيانات التنقّل، ومن كل `href`/`route` حرفي في الصفحات والمكوّنات) يشير إلى صفحة فعلية، لا 404. |
| `contact-rendering-contract.spec.ts` | محتوى صفحة التواصل يُشحَن فعلاً في المخرجات المبنيّة، لا يختفي خلف `{record ? … : null}` عند فشل القراءة من الـ API. |
| `page-message-keys.spec.ts` | كل صفحة في `PUBLIC_PAGES` و`PREPARING_PAGES` لها اسم مكتوب في `ar.json` و`en.json`. |

### `apps/web/src/lib/design-system/`

| المسار | ماذا يحرس |
|---|---|
| `brand-asset-contract.spec.ts` | ألوان شعار الاتحاد في `public/brand` بكلا التطبيقين تطابق الهكس المعتمد حرفيًا. |
| `brand-surface-contract.spec.ts` | ثلاث قواعد على أسطح Brand UI Kit الخمسة (ADR-0098 §8.2, §8.4)، بالتباين الفعلي لكل ثيم. |
| `colour-role-contract.spec.ts` | لا تدرّج لوني (`gradient`) يستخدم درجتين من نفس الرامب اللوني. |
| `contact-card-contrast.spec.ts` | تباين نص بطاقة التواصل فوق طبقتي التغطية والسطح كما هما معرَّفتان فعليًا في الكود. |
| `cover-scrim.spec.ts` | تباين نص الغلاف فوق أسوأ حالة صورة ممكنة (أبيض خالص)، بنِسَب مُشتقّة من `coverScrim()` نفسها. |
| `css-property-syntax.spec.ts` | كل تسجيل `@property` يستخدم `syntax` مقبولاً فعلاً من المتصفح. |
| `direction-and-logo-contract.spec.ts` | أربعة عيوب اتجاه/شعار اكتُشفت بالعين على الموقع الحي، بقراءة المصدر كنص. |
| `hero-stage-shift.spec.ts` | انتقال بطل الصفحة الرئيسية من مسار "بلا JavaScript" لا يسبب layout shift (CLS). |
| `identity-palette-contract.spec.ts` | لا لون hex حرفي في المكوّنات لم يمرّ عبر رموز اللوحة اللونية في `pairings.json`. |
| `interaction-state-contract.spec.ts` | (مثل الداشبورد) العناصر التفاعلية تستخدم حالات `hover`/`focus` مركزية. |
| `locale-aware-link-contract.spec.ts` | كل رابط داخلي يمر عبر `next/link` الواعي باللغة، لا الافتراضي الذي يفقد بادئة اللغة. |
| `motion-budget.spec.ts` | مكتبة الحركة تستورد `LazyMotion + m` (~4.6KB) لا `motion` الكاملة (~34KB). |
| `motion-contract.spec.ts` | كل رمز حركة مُستهلَك فعليًا؛ والحركات تقتصر على `transform`/`opacity` (ADR-0009). |
| `page-hero-photo-contract.spec.ts` | التركيب التصويري لمكوّن `PageHero` ودخوله، بما فيها `COVER_SCRIM_MIN`. |
| `press-contract.spec.ts` | أربع قواعد على تأثير الضغط في `motion.css` (تقليل الحركة، قابلية التعطيل، تجاهل المعطَّل، رموز فقط). |
| `register-contrast.spec.ts` | تباين السجلّات اللونية الثلاثة (أخضر/أحمر/أسود) في كل ثيم مقابل WCAG AA. |
| `scroll-cue-guard-cost.spec.ts` | إشارة التمرير تغادر حركات الصفحة بعد التمرير، ضمن حدّ زمني للفحص. |
| `seo-contract.spec.ts` | كل `page.tsx` فعلي يحمل عناصر SEO الأساسية. |
| `surface-adjacency-contract.spec.ts` | سجلّ "أخضر" لا يلامس مباشرة سجلّ "أحمر" في أي تركيب أسطح. |
| `surface-paint-contract.spec.ts` | سطح بحبر (ink) فاتح يرسم أرضيته الخاصة، لا يرث أرضية قد تكون فاتحة أيضًا. |
| `surface-standard.spec.ts` | مجموعة قواعد "المعيار": توقيت hover، تساوي ارتفاع الألواح، أول شاشة للبطل والتذييل، البارالاكس. |
| `token-contract.spec.ts` | (مثل الداشبورد) رموز مُعلَنة مقابل مستخدَمة؛ ويمنع أيضًا `text-[color:var(--color-brand-*)]` الحرفي. |
| `token-lists-contract.spec.ts` | قوائم الألوان (`pairings.json` وغيرها) مطابقة للاستخدام الفعلي في المصدر. |
| `video-register-contrast.spec.ts` | تباين نص الفيديو فوق كل سجلّ وثيم، بقراءة `surfaces.css` من `@uaeaf/design-tokens` مباشرة. |

**المجموع: 16 (API) + 10 (dashboard) + 27 (web) = 53 حارسًا.** (10 أساسية + 6 ضمن `all` فقط. ملحوظة: الرقم القديم هنا كان "13"، لكن `scripts/test-guards.mjs` وقتها فعليًا كان فيه 9 أساسية + 5 `all` = 14 — تباين موجود قبل هذه المهمة، اتكشف أثناءها بالقراءة لا بالتشغيل. الرقم هنا الآن محسوب من السكربت الحالي بعد إضافة `super-admin-only` و`partial-update`.)

## استُبعِد من الكتالوج، ولماذا

اختبارات تستخدم `readFileSync`/`readdirSync` لكنها **تحمّل fixture لتغذية
اختبار وحدة واحدة**، لا لمسح المشروع ومقارنته بقاعدة:

- `api/src/modules/media-center/media-assets/media-assets.service.spec.ts`،
  `.../upload/upload-constraints.spec.ts`،
  `.../upload/image-probe.spec.ts` — الثلاثة تقرأ ملفات PNG حقيقية من
  `apps/web/public/design-assets/contact/` لتغذية اختبار دالة واحدة
  (`probeImage`/`assertUploadable`/رفع ملف)، لا لمسح المشروع.
- `api/src/bootstrap/seed-sponsor-relations.spec.ts` — اختبار تكامل يشغّل
  `mongodb-memory-server` كاملاً لفحص سكربت البذر؛ فحص أبعاد شعار واحد
  بداخله (`readFileSync` + `probeImage`) متداخل ضمن اختبار تكامل ثقيل، لا
  حارس مصدر خفيف.
- `api/src/modules/workflow/workflow-instances/workflow-instances.service.spec.ts`
  — ملف اختبار وحدة (500+ سطر، mocks) لخدمة واحدة؛ اختبار واحد بداخله يقرأ
  الملف **نفسه** (لا مصدر المشروع) للتأكد أن الخدمة لا تستورد
  `PublicationsService`. خاصية معمارية محلية على ملف واحد، لا قاعدة على
  مستوى المشروع. لو أراد المالك حراسة هذا تحديدًا لاحقًا، الأنسب فصل ذلك
  الاختبار بملف حارس مستقل بدل تشغيل اختبار الخدمة الثقيل كاملاً كل مهمة.
- `api/src/modules/media-center/media-assets/media-asset-provenance.spec.ts`
  — يفحص صفًا واحدًا (`MediaAssetSchema`/DTO) عبر `.toString()`، لا مسحًا
  للمصدر.
- `apps/web/src/lib/pages/about-indexability.spec.ts`،
  `activation-seo.spec.ts`، `activation.spec.ts`، `footer-content.spec.ts`،
  `governance-documents.spec.ts`، `homepage-news.spec.ts`، `homepage.spec.ts`،
  `media-coverage.spec.ts` — اختبارات وحدة لمنطق صفحة واحدة (قراءة/اشتقاق
  بيانات)، عميل الـ API مُموَّه (`vi.mock`)، بلا مسح لمصدر المشروع.
- `api/src/common/guards/permissions.guard.spec.ts` — انظر "لماذا هذه
  الوثيقة" أعلاه: اختبار وحدة على صفّ واحد (mocks)، لا حارس.

**فجوة الوسائط — أُقفِلت 2026-09-28 (Task 7a).** كانت مسجّلة هنا كالتالي: لا
حارس في `api/` يطابق معيار "الحراسة" لموضوع "الوسائط" (media) تحديدًا، رغم أن
الفئة مذكورة في نطاق `test:guards:core` المطلوب — أقرب المرشحين
(`upload-constraints.spec.ts`، `image-probe.spec.ts`،
`media-assets.service.spec.ts`) اختبارات وحدة تحمّل fixture، وأُبعِدت بنفس
المعيار المطبَّق على البقية بدل استثنائها لتبرير الفئة. الفجوة أُغلقت
بـ`media-reference-coverage.spec.ts` (مُدرَج في الطبقة الأساسية فوق): بيمسح
مصدر المشروع نفسه — كل `*.schema.ts` — فبيحقّق المعيار، والفئة بقى ليها حارس
حقيقي مش استثناء في المعيار. الطبقة الأساسية = تخويل (3) + تدقيق (3) + تحديث
جزئي (1) + وسائط (1).

## قاعدة الإضافة

**أي اختبار حارس جديد يُضاف إلى هذا الجدول (بمسمّى ماذا يحرس) وإلى
`scripts/test-guards.mjs` في نفس المهمة التي تكتبه.** حارس في السكربت بلا
سطر هنا وثيقة ناقصة؛ سطر هنا بلا إدخال في السكربت حارس لا يعمل فعلاً.

## حُرّاس حُمر لوحظت أثناء بناء هذا الكتالوج (لم تُصلَح)

عند تشغيل `test:guards:core` القياسي:

- `api/src/common/constants/permission-catalogue.spec.ts` —
  **أحمر**: `PERMISSION_CATALOGUE` يعلن نحو 111 زوجًا
  (`resource:action`، مثل `athletes:Update`، `users:AssignRoles`،
  `*Reports:Export/Print/ViewReports`) لا يحرسها أي `@RequirePermission`
  في الكود حاليًا.
- `api/src/common/constants/permission-resources.spec.ts` —
  **أحمر**: 11 موردًا في `PERMISSION_RESOURCES` (كل موارد `*Reports`) لا
  يحرسها أي مسار حاليًا.

الاثنان من نفس الشكل: الكتالوج تقدَّم على التطبيق (على الأرجح بسبب دفعة
كبيرة من تعديلات المتحكمات الظاهرة في `git status` وقت هذه المهمة). لا علاقة
مباشرة ظاهرة بعمل التخويل/التدقيق/الوسائط الذي تتناوله هذه المهمة تحديدًا،
لكنهما يقعان ضمن نفس ملفَي الحُرّاس اللذين تضيفهما — القرار للمالك: إما إضافة
`@RequirePermission` الناقصة، أو حذف الأزواج/الموارد غير المستخدَمة من
الكتالوج.

---

## خط الأساس — أخضر بالكامل من Task 9 (الدفعة 2)

**السطر ده كان بيقول إن `test:guards:core` أحمر عن قصد لحد ما الدفعة 2 تخلص،
والشرط كان «نفس الفشل المذكور بالاسم في آخر قياس، ومفيش غيره». الشرط ده
اتشال:** Task 9 قفلت الفشل الوحيد المتبقي (الأربعة أزواج `Publish`)
بقائمة استثناء مُسمَّاة ذاتية الفحص، فمفيش فشل يتغطّى بعد كده — آخر قياس
مؤرَّخ تحت (Task 9) هو **أخضر بالكامل: صفر فشل**، وهو الشرط الحالي: أي فشل
جديد بعد النقطة دي فشل حقيقي يتصلّح قبل «خلص»، مش فشل متوقَّع يتحقق منه.

القياسات المؤرَّخة تحت هي السجل، وبتفضل زي ما هي — الوثيقة بتتراكم بالإضافة لا
بإعادة الكتابة.

**المقيس في 2026-09-28 (بعد إضافة الحارس السادس، الجولة الرابعة من المراجعة
المستقلة): 11.9 ثانية، 6 حزم، 41 اختبارًا، 39 عدّوا، اتنين فشلوا — نفس
الفشلين المذكورين تحت بالاسم، وعدد الأزواج الميتة في `permission-catalogue`
نزل من 111 إلى 108 (بند F/I6 من نفس الجولة أخرج `users:AssignRoles` من
القايمة الميتة بإسناده لمساره)، وهو انخفاض مسموح به صراحة (الشرط 2 تحت).**

**أُعيد قياسه 2026-09-28 بعد Task 6 (27 مسار Update + الحارس السابع
`raw-dto-cast-scan`): 7 حزم، 45 اختبارًا، 43 عدّوا، اتنين فشلوا — نفس
الفشلين بالاسم وبس، وعدد الأزواج الميتة في `permission-catalogue` **81**
(78 موردًا × مجموع أطوال `actions` = 321 زوجًا معلَنًا، 240 منها محروسة
فعليًا بـ`@RequirePermission`، صفر زوج محروس وغير معلَن، فالباقي الميت
321 − 240 = 81 بالضبط — محسوبة ثلاث طرق مستقلة ومتطابقة). صفر من أزواج
`:Update` ظاهر في قائمة الميتين، فالسبعة وعشرين مسارًا اللي أضافتها المهمة
كلها محسوبة صح.**

**أُعيد قياسه 2026-09-28 بعد Task 8 (تسعة موارد التقارير الجماعية × 3 مسارات
لكل واحد = 27 مسار `view`/`export`/`print` جديد في `ReportsController`):
9 حزم حُرّاس، 69 اختبارًا، 68 عدّوا، **فشل واحد بس** — `permission-resources.spec.ts`
بقى **أخضر بالكامل** (صفر مورد ميت؛ التسعة موارد `*Reports` كلها بقى ليها مسار
حقيقي)، وعدد الأزواج الميتة في `permission-catalogue.spec.ts` نزل من 31 إلى
**4 بالظبط** — الأربعة أزواج `Publish` (`committees`، `documents`،
`governanceDocuments`، `organizationalStructure`) اللي `PublishingService`
بيتحقق منها في كود الخدمة لا بـ`@RequirePermission`، وهي بالضبط اللي Task 9
هيضيف لها قائمة استثناء مُسمَّاة بدل ما يتوقع الحارس مسارًا لن يُكتب. فشل تالت
صفر.**

**أُعيد قياسه 2026-09-28 بعد Task 9 (إضافة `ENFORCED_IN_SERVICE_CODE` — الأربعة
أزواج `Publish` المحروسة في `publishing.service.ts` — و`AWAITING_ITS_BATCH` فاضية
بقرار المالك D1، وبوابة `dead === ENFORCED_IN_SERVICE_CODE` بالاتجاهين):
9 حزم حُرّاس، **74 اختبارًا، كلها عدّت، صفر فشل.** `test:guards:core` **أخضر
بالكامل لأول مرة في هذه الدفعة.** عدد الأزواج الميتة في `permission-catalogue`
لسه 4، لكن الأربعة دلوقتي مُستثناة بالاسم بدل ما تكون فشلًا. القسم اللي تحت،
اللي كان بيوثّق «الفشل المسموح به»، اتشال هنا زي ما بند 3 فوق قال، لأنه مفيش
فشل يتغطّى بعد كده.**

**وفجوة الوسائط أُقفِلت 2026-09-28 (Task 7a من الدفعة 2):** الحارس اللي كان مكتوب هنا إنه «بيتكتب في Task 7» بقى موجود — `api/src/common/authz/media-reference-coverage.spec.ts` — وانضم للطبقة الأساسية في نفس المهمة بحكم «قاعدة الإضافة» فوق، فعدد حُرّاس الطبقة الأساسية بقى 8. الفشلان المسموح بهما فوق ماتغيروش.

**أُعيد قياسه 2026-09-28 (مهمة الإصلاحات البنيوية، بعد إضافة `super-admin-only` و`partial-update`):**
كان الاثنان مكتوبَين (609 + 123 سطر) من غير أي تسجيل هنا ولا في `scripts/test-guards.mjs`، فكانا لا يعملان إطلاقًا رغم وصفهما بأنهما "حُرّاس" — بالضبط العطل اللي هذه الوثيقة اتكتبت عشان تمنعه. سُجِّلا في الاثنين في نفس المهمة:

- `test:guards:core`: **10 حزم، 84 اختبارًا، صفر فشل** (كان 9 حزم / 74 اختبارًا آخر قياس مؤرَّخ فوق — الزيادة العشرة اختبارات كلها من `super-admin-only.spec.ts`).
- `test:guards` (الحزم الثلاث، والخوادم مُوقَفة): **API 16 حزمة / 233 اختبارًا** (كان 14 حزمة / 157 اختبارًا)، **dashboard 10/101** و**web 27/396** بلا تغيير، **صفر فشل في الحزم الثلاث**. الفرق كله (76 اختبارًا) من `partial-update.spec.ts` (تغطية الـ27 service واحدًا واحدًا) و`super-admin-only.spec.ts` مجتمعين — وهو الدليل المطلوب إن الملفين بقيا يعملان فعليًا، لا مجرد مذكورين.

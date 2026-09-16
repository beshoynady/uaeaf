# كيف تعمل صفحة الخطة الاستراتيجية

**لمن:** من يعدّل الصفحة أو شاشتها أو يبني الصفحة التالية على نمطها.
**المصدر:** `docs/design-system/ADR-0075-Strategic-Plan-Page-Domain-Seams-In-Every-Mode-And-Seam-Lines-Below-A-Band.md`، والخطة `docs/engineering/plans/strategic-plan-page-plan.md`، والدليل `docs/engineering/page-building-guide.md`.

---

## ١. لماذا وُجدت

### المشكلة

- Figma (`720:624`) يعطي المحتوى والبنية لا الجماليات: فيه breadcrumb ظاهر، وأشرطة سوداء، وألوان باستيل وبرتقالي وأزرق خارج اللوحة الرباعية، وثلاث شبكات بطاقات متتالية، وستة فواصل 1px، وقسم بنصوص إنجليزية على صفحة عربية، وصورتان فقط في 3955px.
- الصفحة السابقة كانت «قيد الإعداد»، وزر «استكشف الخطة الاستراتيجية» في صفحة الرؤية والرسالة يقود إليها (P1 في نقد ADR-0074 D9).
- المالك قرر أن المحتوى كله يُحرَّر من الداشبورد (نصوص وأرقام وصور وقوائم ديناميكية) بينما تبقى بنية الصفحة مقفولة في الكود.

### البدائل التي رُفضت

| البديل | لماذا رُفض |
| --- | --- |
| domain جديد بجانب `strategic-plans-page` القائم | تمثيلان لمفهوم واحد (نموذج التشغيل §5)، وcollection ثانية لصفحة واحدة |
| ثوابت محتوى في الكود | المالك ألغى القيد وطلب backend كاملًا |
| Framer Motion للحركة | نظام حركة ثانٍ بجانب `motion.css`، وحالته الابتدائية في SSR تخفي المحتوى عن الزاحف (الدليل §٣) |
| ترتيب الأقسام من الداشبورد | القواعد ١ و٣ و٥ تحرس تسلسل المطوّر؛ العميل قد يجاور تكوينين فيكسر القاعدة ٥ دون أن يدري |
| `sortOrder` بدل `displayOrder` | نمط ثالث لمفهوم له اسم في المشروع |
| قسم الوثائق | حذفه المالك كاملًا (الصفحة والـschema والداشبورد) |

## ٢. خريطة الملفات — بترتيب سلسلة العمل

### الـAPI (`api/src/`)

| الملف | دوره |
| --- | --- |
| `common/constants/plan-phase-icon-keys.ts` | القائمة المغلقة لأيقونات المراحل: `layers · trending-up · trophy · sparkles` |
| `modules/federation-governance/strategic-plans-page/schemas/plan-list-items.schema.ts` | عناصر القوائم الأربعة، كلٌّ بمعرّف `_id` مستقر و`displayOrder` و`isVisible` |
| `…/schemas/strategic-plans-page.schema.ts` | السجل: الأقسام الثمانية، الصور بمعرّفات، `seo`، `publicationState` |
| `…/dto/plan-list-items.dto.ts` · `create-…dto.ts` · `update-…dto.ts` · `reorder-plan-list.dto.ts` | التحقق: نص ثنائي اللغة إلزامي، `_id` اختياري صالح، `iconKey` من القائمة، ترتيب بمعرّفات |
| `…/dto/strategic-plan-public-response.dto.ts` | الإسقاط العام حقلًا بحقل: المخفي محذوف، القوائم مرتّبة، كل عنصر بـ`id` |
| `…/strategic-plans-page.service.ts` | `update` (يحفظ `_id` القائم ويولّد للجديد)، `reorderList` (تبديل كامل أو رفض)، `getCurrentPublic` (أحدث Live)، `toPublicResponse` |
| `…/strategic-plans-page.controller.ts` | 12 مسارًا على نمط الرؤية والرسالة، منها `PATCH :id/lists/:list/order` |
| `common/constants/entity-content.ts` · `permission-catalogue.ts` | حقول النسخ المقروءة، وصلاحيتا `Update`/`Publish` للمورد |
| `seed/dev/strategicPlansPage.json` · `bootstrap/seed-dev.ts` | البذرة من محتوى Figma حرفيًا باللغتين |

### الصفحة العامة (`apps/web/src/`)

| الملف | دوره |
| --- | --- |
| `lib/api/types.ts` (`StrategicPlanPublic`) | شكل الاستجابة العامة |
| `lib/pages/public-pages.ts` · `lib/pages/indexability.ts` | التسجيل (خرجت من `PREPARING_PAGES`)، والفهرسة حين توجد نشرة Live |
| `lib/icons/plan-phase-icons.tsx` | الأيقونات الأربع SVG مضمّنة، واختبار مطابقة لثابت الـAPI |
| `app/[locale]/about/governance/strategic-plan/page.tsx` | القراءة، الـmetadata، JSON-LD (`AboutPage` + `BreadcrumbList`)، ترتيب الأقسام، و`sizes` لكل صورة من القصّ |
| `components/pages/strategic-plan/overview.tsx` | بيان بصورة في البداية |
| `…/phases-band.tsx` | السكة على الشريط الأخضر؛ شكلها من `row-capacity.ts` |
| `…/row-capacity.ts` | أضيق عمود مقاس لكل قائمة، وسعة الصف عند كل breakpoint، والشكل الذي يستحقّه العدد |
| `…/pillars.tsx` | بطاقات مرقّمة + `SeamLines placement="below" from="md"` |
| `…/objectives.tsx` | صفوف مرقّمة بجانب صورة + `SeamLines` |
| `…/metrics.tsx` · `count-up.tsx` | أرقام تُعدّ مرة واحدة بجانب صورة |
| `…/execution-path.tsx` | الدرج الصاعد على الشريط الأخضر؛ شكله من `row-capacity.ts` |
| `…/plan-cta.tsx` · `plan-buttons.ts` | الدعوة بصورة وزرّين |
| `components/ui/identity-hero.tsx` | `SeamLines placement/from`، الـeyebrow، المجموعة B، عنوان Display XL |
| `styles/motion.css` | حدّ التباين العالي، و`--plan-step`/`--plan-steps` |

### شاشة الإدارة (`apps/dashboard/src/`)

| الملف | دوره |
| --- | --- |
| `lib/admin/editorial-entities.ts` | تسجيل `strategicPlansPage` (المسار الوسيط الجاهز يخدم الحفظ والنشر) |
| `lib/admin/strategic-plan.ts` · `lib/admin/plan-lists.ts` | المسودة، وما تغيّر، وجسم الحفظ؛ وعمليات القوائم (تحريك، حذف، إضافة، إظهار/إخفاء، ترقيم) |
| `components/admin/strategic-plan/plan-list-field.tsx` | قائمة عامة بالـprops: سحب بالمؤشر + أزرار كيبورد + إظهار/إخفاء |
| `components/admin/strategic-plan/editor.tsx` · `app/[locale]/(app)/strategic-plan/page.tsx` | الأقسام التسعة بترتيب الصفحة، والمسار |
| `lib/icons/plan-phase-icons.tsx` | الأيقونات نفسها للمعاينة في القائمة |

## ٣. تتبّع مثال حقيقي: إضافة محور سابع من الداشبورد حتى ظهوره في الصفحة

المحرر يفتح شاشة «الخطة الاستراتيجية»، وفي قسم «المحاور» ستة محاور. يضيف سابعًا ويحفظ وينشر. هذا ما يحدث، سطرًا سطرًا:

**١. الشاشة تُحمَّل.** `apps/dashboard/src/lib/admin/editorial-screen.ts:62-65` يقرأ `GET /strategic-plans-page` (السجلات) و`GET /media-assets` معًا بصلاحيات المستخدم. `lib/admin/strategic-plan.ts:130-137` (`toDraft`) يحوّل كل قائمة عبر `fromStoredList` (`lib/admin/plan-lists.ts:150-160`): ترتيب بـ`displayOrder`، و`isVisible` افتراضيًا `true`. المسودة تُبنى من السجل (`components/admin/strategic-plan/editor.tsx:71`) وهي خط الأساس لكل مقارنة.

**٢. «إضافة محور».** الزر في `plan-list-field.tsx:416`. الدالة `add` (من `:221`) تبني قالبًا بلا `_id` (`{ title, description, isVisible: true }`)، و`appendItem` (`plan-lists.ts:140-141`) تُلحقه وتعيد الترقيم من 1، فيأخذ `displayOrder: 7`. الصف الجديد يظهر بحقلي العنوان والوصف متجاورين AR/EN (`:298`).

**٣. الكتابة.** كل حرف يمر بـ`patch` (`plan-list-field.tsx:218`) ثم `onChange` ثم `change` في المحرر (`editor.tsx:150`). `changedFrom` (`strategic-plan.ts:147-150`) يقارن كل قائمة بخط الأساس بصيغة JSON، فتصير المسودة «غير محفوظة» ويتفعّل زر الحفظ. **لا يُرسل شيء بعد**: الحفظ صريح.

**٤. «حفظ المسودة».** `EditorShell` (`components/admin/editorial-editor/editor-shell.tsx:86-118`) يستدعي `body()` (`editor.tsx:140-143`)، فيحفظ المحرر المسودة كما أُرسلت في `sent` ثم يعيد `toPatchBody(original, draft)` (`strategic-plan.ts:154-159`): الحقول المتغيّرة فقط، و`pillars` كاملة عبر `toStoredList` (`plan-lists.ts:169-176`) — المحاور الستة بـ`_id` كلٌّ منها، والسابع بلا `_id`، مرقّمة 1..7. الطلب `PATCH /api/admin/editorial/strategicPlansPage/<id>`.

**٥. الوسيط (BFF).** `app/api/admin/editorial/[entityType]/[id]/route.ts:22-41` يحلّ `strategicPlansPage` من `EDITORIAL_ENTITIES` (`lib/admin/editorial-entities.ts`، المدخل المضاف) ويمرّر الجسم كما هو إلى `PATCH /strategic-plans-page/<id>`. نوع غير مسجَّل يُرفض 404.

**٦. الـAPI يتحقق.** `ValidationPipe` بـ`forbidNonWhitelisted` يطبّق `UpdateStrategicPlansPageDto` و`PlanListItemDto` (`api/…/dto/plan-list-items.dto.ts:30-55`): عنوان ووصف ثنائيا اللغة إلزاميان، `_id` اختياري وصالح (`:34`)، `isVisible` اختياري (`:55`). ثم `strategic-plans-page.controller.ts:74-83`: `@RequirePermission('strategicPlansPage','Update')`، و`publishingService.assertCanEdit` (`:82`) يرفض إن كانت مراجعة جارية.

**٧. الـAPI يحفظ.** `strategic-plans-page.service.ts:187` (`update`): أولًا `assertEverySectionShows` (`:192`، التعريف `:110`) يرفض 400 أي قائمة وصلت بلا عنصر ظاهر، قبل أي قراءة أو كتابة. ثم يقرأ السجل (`:195`)، ولكل قائمة وصلت يستدعي `normaliseList` (`:87`، الاستدعاء `:217`): المحاور الستة تحمل معرّفات موجودة في القائمة المخزّنة فتحتفظ بها، والسابع بلا `_id` فيأخذ `new Types.ObjectId()` (`:94`)؛ `isVisible ?? true` (`:95`)؛ و`displayOrder` يُعاد من موضع العنصر في المصفوفة (`:96`) لا مما أرسله العميل. يُكتب بـ`$set` (`:225`). المعرّف المزوّر أو القديم لا يُتبنّى أبدًا.

**٧-أ. الشاشة تعتمد السجل المحفوظ.** بعد نجاح الحفظ يستدعي الإطار `router.refresh()`، فيصل السجل الجديد والمحور السابع بمعرّفه. `editor.tsx:97` يوفّق المسودة معه: الحقل الذي لم يُلمس منذ خط الأساس، أو منذ لحظة الإرسال حين هبطت كتابة (`updatedAt` مختلف)، يأخذ قيمة السجل، فيأخذ المحور السابع `_id` ويصير الشريط «كل التغييرات محفوظة». وأي تعديل كُتب بعد الإرسال يبقى.

**٨. «نشر الآن».** لوحة الحالة ترسل `POST …/publish` مع `expectedUpdatedAt`؛ `controller.ts:110` ← `PublishingService.publishDirect` (`api/src/modules/workflow/publishing/publishing.service.ts:90-176`): يتحقق من الصلاحية والسياسة (`workflowRequired: false`) وأن السجل لم يتغيّر منذ قُرئ (`staleRecord`)، ثم يجمّد revision من السجل المخزّن نفسه (لا من جسم الطلب) وينشرها.

**٩. الإسقاط العام.** `GET /strategic-plans-page/current/public` ← `service.ts:318` يختار أحدث نشرة Live، و`toPublicResponse` (`:348`) يُسقط المخفي (`shown`، `:358`) ويرتّب ويحوّل `_id` إلى `id` (`:360`). المحور السابع يصل بـ`id` نصي و`displayOrder: 7`. `GET :id/public` (`service.ts:305`) يمر بالإسقاط نفسه، فلا يصل منه عنصر مخفي ولا `federationId`.

**١٠. الصفحة العامة.** `apps/web/…/strategic-plan/page.tsx:112` (`loadRecord` ← `fetchPublic`، `lib/api/public-client.ts:45`، كاش 60 ثانية) ثم `:150` يمرّر `record.pillars` إلى `PlanPillars`. `components/pages/strategic-plan/pillars.tsx:43` يرتّب بـ`displayOrder`، و`:73-82` يرسم بطاقة سابعة `key={pillar.id}` برقم «07» ولون `itemTone(6)` = اللون ٣ (الأزرق الفولاذي). الشبكة (1 ← 2 ← 3 أعمدة) تستوعبه بلا تعديل؛ القاعدة ٤ تبقى صحيحة لأن ترتيب DOM هو ترتيب الأرقام.

**مُقاس على الخوادم المحلية (2026-09-15):** أُضيف «محور سابع تجريبي» من الشاشة وحُفظ («كل التغييرات محفوظة») ونُشر؛ الإسقاط العام أعاد 7 فورًا، والصفحة العامة أظهرت البطاقة بعد 25 ثانية (كاش `fetchPublic`) برقم `07` واللون `3`، ثم أُعيد السجل إلى ستة محاور. لا عنصر في الشاشة يغيّر ترتيب الأقسام أو يخفي قسمًا (0 عناصر).

**ما لا يستطيعه المحرر في هذا المسار:** تغيير موضع قسم المحاور أو إخفاؤه — لا حقل له في المسودة ولا في الـDTO (`forbidNonWhitelisted` يرفض أي مفتاح كهذا 400).

> **التحقق الحي من البداية إلى النشر** (سكربت متصفح حقيقي `scratchpad/dash-e2e.mjs`: دخول، إضافة، حفظ، نشر، قراءة الصفحة، ثم حذف ونشر للاستعادة) مكتوب وينتظر تشغيل خادم الـAPI محليًا.

## ٤. القرارات غير البديهية

- **`_id` على عناصر القوائم** (Mongoose subdocument بمعرّف) لا `_id: false` كما في `ContentBlock`: المالك اشترط معرّفًا مستقرًا لا يتغير مع إعادة الترتيب، والصفحة تستعمله مفتاحًا ثابتًا.
- **الترتيب يُرسل كاملًا في `PATCH`** (القائمة كلها بـ`displayOrder` مرقّمًا)، و`PATCH :id/lists/:list/order` مسار مستقل للعميل البرمجي: الحفظ الصريح من الداشبورد حفظ واحد لا حفظان.
- **المخفي لا يصل الإسقاط العام** بدل أن تُخفيه الصفحة: الإسقاط «يفشل مغلقًا» (ADR-0069 D3).
- **`value` نص حرّ** في المؤشر: «+30%» ليس رقمًا؛ `count-up.tsx` يعدّ أول سلسلة أرقام فيه ويطبع ما حولها كما هو.
- **الخادم يطبع الرقم النهائي**؛ العدّ إضافة تعمل مرة عند الدخول: بلا JavaScript أو مع reduced-motion يبقى الرقم كما طُبع. ثلاثة spans (نص مخفي لقارئ الشاشة، نسخة غير مرئية تثبّت العرض، نسخة العدّ فوقها) فلا يتحرك شيء.
- **الدرج الصاعد** بـ`padding-top` تصاعديًا لا بـtransform: الحركة الوحيدة هي رسم المقاطع (`scale` من ركن البداية)، والهندسة ثابتة. الخط مقاطع لا خط واحد: كل خطوة (ما عدا الأخيرة) ترسم صندوقًا من مركز رقاقتها إلى مركز رقاقة التالية — يبدأ `start-6` (نصف الرقاقة)، وعرضه `calc(100% + var(--plan-gap))` (عمود وفجوة)، وارتفاعه `--space-12` (صعود) — وقُطره SVG من الركن إلى الركن، ويُعكس في RTL بـ`rtl:-scale-x-100`. خط واحد عبر القائمة يفترض أين تقف الرقاقات، وكان يبتعد عنها نحو 90px عند 1440 (مراجعة الكود، ADR-0075)؛ المقطع يقيس نفسه من عموده.
- **الـeyebrow وزرّا الدعوة من رسائل التنقّل** لا من السجل: تسميات IA §8.1، كما في دعوة الرؤية والرسالة.
- **الصورة الحقيقية الوحيدة** (McKenzie، CC BY 4.0) مرفوعة بترخيصها ومصدرها في `caption` الأصل؛ الأربع الأخرى من المكتبة تحت بند التعليق في ADR-0073.

## ٥. كيف أعدّله بنفسي

- **نص أو رقم أو صورة أو عنصر قائمة:** من الداشبورد، شاشة «الخطة الاستراتيجية»، ثم «حفظ المسودة» ثم «نشر الآن». الصفحة تقرأ أحدث نشرة Live خلال 60 ثانية (`PUBLIC_REVALIDATE_SECONDS`).
- **إعادة البذر محليًا:** `npm run seed:dev` من `api/` (يكتب السجل إن كانت الـcollection فارغة)، ثم نشر من الداشبورد.
- **ترتيب قسم أو تكوينه:** في `app/[locale]/about/governance/strategic-plan/page.tsx` وحده، ثم `page-rules.spec.ts` على المسار قبل أي شيء آخر.
- **أيقونة مرحلة جديدة:** أضفها إلى `plan-phase-icon-keys.ts` وارسمها في ملفي `plan-phase-icons.tsx` (الويب والداشبورد)؛ اختبار المطابقة يفشل إن نسيت أحدهما.
- **`sizes` صورة:** الأرقام في `SECTION_HEIGHT` في `page.tsx` هي ارتفاعات الأقسام المقيسة عند 1440؛ إن تغيّر ارتفاع قسم فقِسه من جديد.

## ٦. أين ينكسر — وأخطاء شائعة

- **`Missing permission: Update on strategicPlansPage`** بعد إضافة صفوف الكتالوج: دور السوبر أدمن يأخذ الكتالوج عبر `bootstrap-admin` لا عند إقلاع الخادم. شغّله (`BOOTSTRAP_ADMIN_EMAIL/PASSWORD` للحساب القائم؛ يُترك كما هو).
- **`publishingPolicyMissing` (409)** عند أول نشر: يلزم `POST /workflow-policies { entityType: "strategicPlansPage", operation: "Edit", workflowRequired: false, allowHardDelete: false }` كما للصفحتين الأخريين.
- **`ECONNRESET` في سكربت يكتب عبر الـAPI** بين طلبين تفصلهما ثوانٍ: الخادم يغلق keep-alive بعد 5 ثوانٍ؛ أرسل `connection: close`.
- **قسم بلا عنصر هوية بعد شريط ملوّن:** `SeamLines placement="centered"` يقف نصفه على الشريط تحت 3:1؛ استعمل `below`، وأبقِ الفقرة تحت العنوان على `MEASURE[locale]` وإلا لامست الخطوطُ النص (IL-5).
- **عنوان قسم طويل على الهاتف مع `below`:** الخطوط تصل 69px تحت الحدّ في حشو 48px؛ عنوان يتجاوز ~283px عند 390 يلامسها. إن تعذّر تقصيره فـ`from="md"` أو `from="lg"` (أصغر عرض يترك الزاوية خالية 32px) مع تسجيل ما دونه في `PENDING` مقيّدًا بالعرض. المحاور هنا من `md` (11px عربي و3.7px إنجليزي عند 360 قبل التعديل).
- **عنصر حادي عشر في المراحل أو خطوات التنفيذ:** الـAPI يرفض بـ400 ورمز `listTooLong` قبل أي كتابة (المخفي يُحسب)، وزر «إضافة» في الداشبورد معطّل عند 10 مع سطر يشرح السبب. القوائم الثلاث الأخرى تلتفّ وحدها فلا حدّ لها.
- **مرحلة خامسة أو خطوة سادسة من الداشبورد:** الشكل يُحسب من العدد وقت الرسم (`row-capacity.ts`): الصف يُرسم من أول عرض يتسع لعمود لا يقلّ عن الحدّ المقاس (214px للمراحل، 128px للخطوات)، وما دونه تأخذ القائمة شكل الهاتف العمودي. خمس مراحل تصير صفًّا من `2xl` فقط، وستّ لا تقف في صف أبدًا. عدد أعمدة ثابت (`lg:grid-cols-4` سابقًا) كان يُسقط الخامسة تحت الخط وشارتها خارجه.
- **رقم بفاصلة عشرية أو فاصل آلاف («1.5M»، «1,200»):** `countable` يعيد `null` فيُطبع كما خُزّن بلا عدّ؛ عدُّ أول سلسلة أرقام وحدها أظهر «0.5M».
- **قائمة مرقّمة بـ`order` أو `flex-row-reverse`:** القاعدة ٤ تفشل؛ ترتيب DOM هو ترتيب الأرقام والشبكة ترث الاتجاه.
- **صورة بلا نص بديل بلغة الصفحة:** القاعدة ٦ تفشل؛ النص ملك الأصل ويُكتب عند الرفع من الصورة نفسها.

## ٧. ما يحرسه من اختبارات

| الاختبار | ما يحرسه |
| --- | --- |
| `api/…/strategic-plans-page/**/*.spec.ts` | الـschema والـDTO والخدمة (المخفي، الترتيب، `_id`، الصور) |
| `apps/web/src/components/pages/strategic-plan/strategic-plan.spec.tsx` | بنية كل قسم من السجل، الألوان بالموضع، القوائم بترتيب `displayOrder`، الدرج تنازليًا، الروابط |
| `apps/web/src/components/ui/identity-hero.spec.tsx` | `SeamLines placement/from`، أحمر B، عنوان الـhero، حدّ التباين العالي في `motion.css` |
| `apps/web/src/lib/icons/plan-phase-icons.spec.tsx` | مطابقة الأيقونات لثابت الـAPI |
| `apps/web/e2e/page-rules.spec.ts` | القواعد ١ و٣ و٤ و٥ و٦ على المسار عند 1440/768/390 باللغتين، والقاعدة ٣ في الأوضاع الثلاثة، وخطوط الحدّ تحت الشريط (على القسم، ≥ 3:1) |
| `apps/web/e2e/identity-lines.spec.ts` | IL-5 (32px) للـhero والخطوط على الصور والحدود |
| `apps/web/src/components/pages/strategic-plan/row-capacity.spec.ts` | حساب السعة وقاعدة عدم الرجوع، بجدول متوقع لكل عدد من 1 إلى 10 |
| `apps/web/e2e/strategic-plan-geometry.spec.ts` | كل قطعة من الخط تصل شارتها، وأعمدة الصف عند السعة لا تقلّ عن الحدّ المقاس وعنصر زيادة يقلّ |
| `apps/web/e2e/strategic-plan-text.spec.ts` | النص المخزّن حرفيًا باللغتين بلا JavaScript |
| `apps/web/e2e/vitals.spec.ts` مع `VITALS_ROUTE` | CLS < 0.1 مع الحركة وبدونها |
| `token-contract` · `token-lists-contract` · `seo-contract` · `internal-links-contract` | الـtokens، اللوحة، الـmetadata، الروابط الداخلية |
| `apps/dashboard/src/components/admin/strategic-plan/*.spec.tsx` · `lib/admin/plan-lists.spec.ts` | القوائم والحفظ الصريح وغياب أي تحكم في ترتيب الأقسام |

## ٨. ما تعمّدنا عدم بنائه

- **سحب بالمكتبة (dnd-kit):** سحب أصلي HTML5 + أزرار كيبورد؛ صفر dependencies.
- **تعميم أي عنصر جديد** (السكة، الصفوف، الدرج، العدّاد، وصفة الزر): محصورة في نطاق الصفحة حتى الموافقة (§١٢-٦-أ)؛ مكتوبة بالـprops لتُنقل نقل ملف.
- **حقول ترتيب الأقسام أو إخفائها في الداشبورد:** غير موجودة أصلًا.
- **نص أو صورة مخترعة:** المحتوى من Figma حرفيًا؛ الخطوات الخمس تُرجمت لأن الأصل إنجليزي على صفحة عربية.
- **تحسين LCP كمشروع:** خارج النطاق؛ الصفحة لا تُدخل عيبًا جديدًا (`priority` على صورة الـhero وحدها، الباقي lazy).

## ٩. المصطلحات

| المصطلح | معناه هنا |
| --- | --- |
| بيان بصورة | قسم نصه في 7/12 وصورته المائلة في 5/12 على أحد الطرفين (`SlantedPhoto`) |
| شريط | قسم على سجل ملوّن (`register="green"`) |
| خطوط الحدّ | المجموعة A/B على الحدّ بين قسمين (`SeamLines`): مركّزة أو تحت الحدّ |
| زوج مرآوي | بيانان متتاليان صورتاهما على طرفين متقابلين؛ الاستثناء الوحيد للقاعدة ٥ |
| الدرج الصاعد | تكوين مسار التنفيذ: كل خطوة أعلى من سابقتها في اتجاه القراءة |
| `displayOrder` · `isVisible` · `_id` | ترتيب العنصر، ظهوره، وهويته الثابتة |

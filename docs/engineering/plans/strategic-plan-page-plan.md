# خطة تنفيذ صفحة «الخطة الاستراتيجية» — `/about/governance/strategic-plan`

**التاريخ:** 2026-09-15 · **الموجز:** «بناء صفحة الخطة الاستراتيجية كاملة» + تصحيح المالك أثناء التنفيذ (بنية البيانات والتحكم من الداشبورد).
**المصدر البصري:** Figma `hpO727vjwl18g3s3LTICAY` نود `720:624` (النسخة العربية عند 1440 هي الأصل). الهيدر والفوتر من الكود كما هما.
**الحدود:** صفر أوامر Git (من كل الوكلاء) · لا تعديل RBAC · لا لمس domains أخرى · collection واحدة · dependency واحدة كحد أقصى (المخطط: صفر).

---

## ٠. القرارات المعمارية التي تُنفَّذ بلا سؤال (مع سببها)

| # | القرار | السبب |
| --- | --- | --- |
| A1 | **الـdomain هو `strategic-plans-page` القائم، يُكمَّل لا يُكرَّر.** الوحدة `api/src/modules/federation-governance/strategic-plans-page` موجودة كهيكل (Create/Read/Delete، بلا PATCH ولا `current/public` ولا اختبارات) وتحمل `entityType = strategicPlansPage` المسجَّل في `workflow-entity-types` و`permission-catalogue` و`entity-content`. إنشاء وحدة ثانية للصفحة نفسها يخالف نموذج التشغيل §5 (لا تمثيلين لمفهوم واحد) وقاعدة «collection واحدة». لا صفوف مخزّنة ولا fixture لهذه الـcollection، فلا هجرة. | تصحيح المالك: «موافقة صريحة ممنوحة لإنشاء domain كامل لهذه الصفحة» — الهيكل القائم هو domain هذه الصفحة بعينه. |
| A2 | **النص ثنائي اللغة = `LocalizedText` / `LocalizedTextDto` `{ar,en}`** كما في كل الـdomains. | نمط المشروع؛ لا نمط ثالث. |
| A3 | **ترتيب عناصر القوائم بحقل `displayOrder` صريح** (اسم المشروع لهذا المفهوم في كل القوائم) + `isVisible` + `_id` مستقر للعنصر (subdocument بمعرّف). | «sortOrder صريح» = `displayOrder` في مفردات المشروع؛ استحداث `sortOrder` نمط ثالث. |
| A4 | **الصور بـ`mediaAssetId`** (`*ImageId: ObjectId ref MediaAsset`) وتُحلّ في الإسقاط العام عبر `MediaAssetsService.resolvePublicImages`. | نمط `vision-mission-page`. |
| A5 | **أيقونات المراحل من قائمة مغلقة** `PLAN_PHASE_ICON_KEYS = ['layers','trending-up','trophy','sparkles']` (ثابت جديد في `api/src/common/constants/plan-phase-icon-keys.ts`)، والرسم SVG مُضمَّن (vendored من lucide، ISC) في `apps/web` و`apps/dashboard` مع اختبار مطابقة للثابت كما في `value-icons.spec.tsx`. | ADR-0065 D6: لا dependency أيقونات. |
| A6 | **الحركة بنظام الموقع القائم** (`motion.css` + `RevealOnce`، tokens الحركة، transform فقط تحت `<main>`) — **لا Framer Motion**. | إدخال Framer Motion يجعل نظامي حركة متوازيين (ما حذّر منه الموجز نفسه)، وحالته الابتدائية في SSR (`opacity:0`) تخفي المحتوى عن الزاحف والطباعة وتخالف الدليل §٣ («transform وحده، بلا opacity في main») وحارس «the largest paint». كل مطالب م٤-أ (تدرّج الشدّة، مرة واحدة، الاتجاه يتبع اللغة، سقف الـstagger، العدّ التصاعدي، إلغاء reduced-motion) تتحقق بالنظام القائم. **انحراف عن حرف الموجز، مسجَّل.** |
| A7 | **شاشة الإدارة تنشئ قائمة جديدة `PlanListField`** (سحب بالمؤشر + أزرار كيبورد + إظهار/إخفاء + `_id` مستقر) داخل نطاق الشاشة، ولا تعدّل `BlockListField` المشترك. | §١٢-٦-أ: لا لمس مكوّن مشترك. |
| A8 | **نصان من رسائل الموقع لا من السجل:** تسمية «الحوكمة والاستراتيجية» فوق عنوان الـhero (تسمية IA §8.1، كما تُطبع في الهيدر) وتسميتا زرّي الدعوة («الرؤية والرسالة» / «السياسات واللوائح» = أسماء التنقّل). | مصطلحات IA يحكمها الـIA لا التحرير (CLAUDE.md §11)؛ السابقة: دعوة الرؤية والرسالة (ADR-0070). يُذكر في الداشبورد كما يُذكر هناك. |
| A9 | **قسم الوثائق محذوف كليًا** (الصفحة، الـschema، الداشبورد). الحقول القديمة `documentId/documentVersion/periodStart/periodEnd/foundationPillars/strategicAxes` تُحذف من الـschema (لا صفوف لها). | تصحيح المالك §١. |

---

## ١. الـSchema — `strategicPlansPage` (collection كما هي)

```
extends HeroPageSchema (heroImageId · heroTitle · heroSubtitle) + BaseSchema
federationId        ObjectId ref Federation, required
introHeading        LocalizedText, required        «خارطة طريق نحو المستقبل»
introText           LocalizedText, required
introImageId        ObjectId|null                  صورة بجانب النظرة العامة
phasesTitle         LocalizedText|null             لا عنوان في Figma؛ اختياري للعميل
phases              PlanPhase[]      { _id, title, description, iconKey∈PLAN_PHASE_ICON_KEYS, displayOrder, isVisible }
pillarsTitle        LocalizedText, required        «محاورنا الاستراتيجية»
pillarsText         LocalizedText|null             الفقرة تحت العنوان
pillars             PlanListItem[]   { _id, title, description, displayOrder, isVisible }
objectivesTitle     LocalizedText, required        «من المحاور إلى أهداف ملموسة»
objectivesImageId   ObjectId|null
objectives          PlanListItem[]
metricsTitle        LocalizedText, required        «نقيس التقدم، ونصنع الأثر»
metricsImageId      ObjectId|null
metrics             PlanMetric[]     { _id, value: string, label: LocalizedText, displayOrder, isVisible }
executionTitle      LocalizedText, required        «نحوّل الاستراتيجية إلى واقع»
executionText       LocalizedText|null
executionSteps      PlanStep[]       { _id, title: LocalizedText, description: LocalizedText|null, displayOrder, isVisible }
ctaTitle            LocalizedText, required        «نبني اليوم مستقبل ألعاب القوى الإماراتية»
ctaText             LocalizedText|null
ctaImageId          ObjectId|null
seo                 PageSeo|null
revisionId          ObjectId|null
publicationState    enum PUBLICATION_STATES, required
```

- كل عنصر قائمة `@Schema()` بمعرّف تلقائي (`_id: true`)؛ الـDTO يقبل `_id` اختياريًا: عنصر يحمل `_id` قائمًا يحتفظ به، وعنصر بلا `_id` يأخذ معرّفًا جديدًا.
- `value` في المؤشر نص حرّ («2030» · «15» · «+30%») كما في هيكل الـboard؛ الصفحة تحلّله للعدّ التصاعدي (رقم + سابقة/لاحقة).
- **ما لا يوجد في الـschema عمدًا:** ترتيب الأقسام، إخفاء قسم. القواعد ١ و٣ و٥ تحرس ترتيب الأقسام وتكوينها؛ لو حُرِّر من الداشبورد لكسر العميل القاعدة ٥ دون أن يدري، وحارسنا يفحص بناء المطوّر لا تحرير العميل. الحرية في المحتوى والانضباط في البنية (يُكتب في الـADR).

### المسارات (على نمط `vision-mission-page.controller.ts`)

| المسار | الصلاحية |
| --- | --- |
| `POST /strategic-plans-page` | `strategicPlansPage:Create` |
| `GET /strategic-plans-page` · `GET :id` · `GET :id/editorial-state` | `Read` |
| `GET /strategic-plans-page/current/public` | عام — أحدث نشرة Live، `null` إن لم توجد |
| `GET :id/public` | عام |
| `PATCH :id` | `Update` (+ `assertCanEdit`) |
| `PATCH :id/lists/:list/order` body `{ ids: string[] }` — `list ∈ phases|pillars|objectives|metrics|executionSteps`؛ يرفض أي مجموعة ليست تبديلًا كاملًا لمعرّفات القائمة الحالية | `Update` |
| `POST :id/publish` · `:id/submit` · `:id/restore` | `Publish` / `Update` |
| `DELETE :id` | `Delete` |

- إضافة `strategicPlansPage: Update` و`Publish` إلى `permission-catalogue.ts` (سطران بيانات لهذا المورد، لا تعديل في نظام RBAC؛ `seed-admin` يمنح الكتالوج كله للسوبر أدمن).
- `entity-content.ts`: `REVISION_READ_FIELDS.strategicPlansPage` بالحقول الجديدة؛ `PUBLISH_REQUIREMENTS.strategicPlansPage = []`.
- الإسقاط العام `StrategicPlanPublicResponseDto`: حقل بحقل، القوائم مرتّبة بـ`displayOrder` **والمخفي محذوف**، كل عنصر يحمل `id` (نص) لثبات المفاتيح.

### الـseed

- `api/seed/dev/strategicPlansPage.json` (Extended JSON، `_id` ثابت `6aa5001000000000000000d1`، `federationId` `6aa5001000000000000000c0` كما في الرؤية والرسالة) + إضافته إلى `DEV_FIXTURE_SETS` (singleton).
- المحتوى العربي حرفيًا من Figma (§٤ أدناه)، والإنجليزية ترجمة احترافية منه.
- الصور: معرّفات أصول المكتبة القائمة + أصل جديد واحد (McKenzie، CC BY 4.0) يُرفع عبر الـAPI بحساب الأدمن المحلي ويُسجَّل مصدره وترخيصه في `caption`.
- بعد البذر: نشر مباشر (`publishDirect`) بالحساب نفسه لتصير نشرة Live تقرأها الصفحة.

### TDD في `api/`

اختبارات وحدة (`*.spec.ts` بجانب الملفات، jest ESM، mocks كما في `vision-mission-page.service.spec.ts`) تُكتب حمراء أولًا:
1. `strategic-plans-page.schema.spec.ts`: كل حقل بنوعه، عناصر القوائم بمعرّف، `iconKey` خارج القائمة يُرفض، `isVisible` افتراضيًا `true`.
2. `dto/*.spec.ts`: `PATCH` يرفض مفتاحًا مجهولًا (`forbidNonWhitelisted`)، `_id` اختياري وصالح، `iconKey` من القائمة المغلقة.
3. `strategic-plans-page.service.spec.ts`: الإسقاط العام يُسقط المخفي ويرتّب؛ الصور تُحلّ مرة واحدة؛ `update` يطبّق ما أُرسل فقط ويحفظ `_id` القائم ويولّد للجديد؛ `reorderList` يرفض مجموعة ناقصة/زائدة/مكرّرة ويعيد الترقيم من 1؛ `getCurrentPublic` يختار أحدث Live.
4. `entity-content.spec.ts` القائم يمرّ (أسماء الحقول متطابقة).
5. `nest build` = 0 أخطاء (ts-jest لا يفحص الأنواع — ذاكرة المشروع).
6. `npm run generate:openapi` يحدّث `api/openapi.json`.

---

## ٢. المهمة صفر (بوابة، قبل الصفحة)

| | المشكلة المقيسة | العلاج | القياس |
| --- | --- | --- | --- |
| م٠-أ | تغيّر السجل لا يُرى في التباين العالي (كل السجلات بيضاء) | قاعدة CSS واحدة في `styles/motion.css` (طبقة الصفحة): `[data-theme="high-contrast"] section[data-register]:not([data-register="neutral"])` ترسم حدّين علويًا وسفليًا بـ`box-shadow: inset` (لا تغيّر ارتفاعًا) بلون `--color-border-strong` (أسود في التباين العالي) وسماكة `--border-width-default` (2px هناك). تعمل على كل شريط ملوّن في الموقع بلا استثناء. | `page-rules.spec.ts` القاعدة ٣ توسَّع لتُقاس في الأوضاع الثلاثة: لكل حدّ، إمّا خطوط حدّ ظاهرة، أو صورتان متقابلتان، أو الـhero، أو تباين أرضيتي القسمين ≥ 1.4، أو (في التباين العالي) حدّ مرسوم بتباين ≥ 3:1 مع الأرضيتين. **قراءة القاعدة ٣ المعدّلة تُسجَّل في ADR-0075 قبل التنفيذ.** |
| م٠-ب | خطوط الحدّ فوق شريط ملوّن: أخضر 1.95 وأحمر 1.60 على الأخضر | `SeamLines placement="below"`: المجموعة كلها تحت الحدّ (أعلى الصندوق = الحدّ)، فلا يقف أي بكسل منها على الشريط؛ تقف على أرضية الصفحة حيث الأحمر ≥ 3.18 والأخضر ≥ 3.89 في الأوضاع الثلاثة (محسوبة من الـtokens؛ وتُقاس في المتصفح). الألوان الأربعة للوحة تُقاس أيضًا وتُبلَّغ (الداكن يسقط تحت 3 على ثلاثة منها — وهذا سبب رفض «العبور المُلوَّن»). | اختبار Playwright: كل نقطة من مسار الخط ≥ حدّ القسم، وتباين حبر كل خط مع أرضية القسم المحسوبة ≥ 3 في الأوضاع الثلاثة. ثم `identity-lines.spec.ts` (IL-5 = 32px). |
| م٠-ج | المجموعة B: الأحمر القصير 1.08px عند 390 | الخيار (أ): `GROUP_B` الأحمر بطول A الأحمر (40.8 وحدة). | قياس الطول والسماكة عند 390 باللغتين (نمط ADR-0074 D3). |
| تراتب الـhero | الأرقام 128px مقابل عنوان 40px | عنوان الـhero `text-display-xl` (Display XL «Large Headings»، الفصل الرابع §4.4) وأرقام البيانات `text-display-l`. يُطبَّق على الصفحات المبنية. | `identity-lines` على المسارين المبنيين؛ لقطات. |
| حدود بطاقات الأهداف في الفاتح (1.25–1.52) | بقيت بعد علاج الداكن | **مقصودة:** ADR-0072 D1 «Light draws no edge»؛ الحافة في الفاتح هي أرضية البطاقة (ΔE بين الأرضيات الأربع 9.00؛ البطاقة تُميَّز بلونها ورقمها وعنوانها، وليست أداة تحكم فتخضع لـ1.4.11). تُذكر في التقرير ولا تُغيَّر. | — |
| المخالفات الثلاث المفتوحة | كلمة الرئيس (الرسالة، الدعوة) · المجلس (القائمة) | `SeamLines placement="below"` في الثلاثة؛ تفريغ `PENDING`. | `page-rules.spec.ts` كاملًا. |

---

## ٣. الصفحة العامة — ثمانية أقسام، تسلسل التكوينات

| # | القسم | التكوين (تصنيف الحارس) | الأرضية | عنصر الهوية (١) | الفاصل مع ما قبله (٣) |
| --- | --- | --- | --- | --- | --- |
| 1 | Hero | hero — `IdentityHero height="content"` بصورة | صورة تحت الغطاء | خطوط الـhero | — |
| 2 | النظرة العامة «خارطة طريق نحو المستقبل» | statement — نص 7/12 + `SlantedPhoto side="start"` | base | الصورة | بعد الـhero |
| 3 | الجدول الزمني (4 مراحل) | band — سكة أفقية: أيقونة + رقم `text-display-l` + عنوان + وصف، على خط سكة | **أخضر** | السجل | تغيّر السجل (+ حدّ التباين العالي) |
| 4 | المحاور (6) | cards — `ol` من `ItemCard` مرقّمة 01–06 بلون الموضع | base | `SeamLines placement="below"` | تغيّر السجل |
| 5 | الأهداف (5) | statement — صفوف مرقّمة (رقم `display-l` بحبر الموضع، عنوان h3، وصف) في 7/12 + `SlantedPhoto side="start"` | sunken | الصورة + `SeamLines` (مركزة، الركن النهائي) | خطوط الحدّ |
| 6 | المؤشرات (4) | statement — عدّادات `Type/Statistic Display`... انظر الملاحظة + `SlantedPhoto side="end"` | base | الصورة | صورتان متقابلتان (زوج مرآوي مع 5) |
| 7 | مسار التنفيذ (5 خطوات) | band — درج صاعد في اتجاه اللغة (`ol` بخمسة أعمدة، كل خطوة أعلى من سابقتها، خط صاعد يُرسم عند الكشف) | **أخضر** | السجل | تغيّر السجل |
| 8 | الدعوة | statement — `StrategyCta`-like خاص بالصفحة بصورة `end` وزرّين | base | الصورة | تغيّر السجل |

- **رقم المؤشر:** `Type/Statistic Display` (32px Black، الفصل الرابع §4.15a addendum) هو الدور المعتمد للأرقام المستقلة؛ لكن مرجع الصفحة يطلب رقمًا بطوليًا. القرار: `text-display-l` (56/36) للرقم — دور موجود في السلّم لعنوان كبير مستقل، وفي V&M أرقام الأهداف `display-l` (سابقة ADR-0072 D1). يُسجَّل.
- **الخط الأخضر:** مجموعتان من ثمانية أقسام. نسبة الأخضر تُقاس (ارتفاع الشريطين / ارتفاع الصفحة) وتُبلَّغ مقابل توجيه 15–20%.
- **القاعدة ٤:** الشبكات المرقّمة الثلاث (المراحل 01–04، المحاور 01–06، الأهداف 01–05) `ol` بـ`data-item-number`، ترتيب DOM = الأرقام، بلا `order`/`direction`.
- **القاعدة ٥ بعد حذف الوثائق:** hero → statement → band → cards → statement → statement(زوج مرآوي) → band → statement ✔ (لا تكوينان متطابقان متجاوران إلا الزوج، ولا ثالث له).
- **الصور (5 مواضع):** hero = `vision-mission-values` (ملعب ليلي بمضمار أحمر) · النظرة العامة = `contact-hero` (جوي، حلقة المضمار) · الأهداف = `vision-mission-cta` (عدّاؤون بعيدون على المضمار، بلا وجوه) · المؤشرات = **McKenzie Community Track** (Rick Obst، CC BY 4.0، Wikimedia Commons، 4976×2627، أرقام الحارات 1–8، أشخاص بعيدون غير مميَّزين) · الدعوة = `vision-mission-mission` (عدّاؤون؛ الوجوه مولَّدة لا لأشخاص حقيقيين — تحت بند التعليق). كل نص بديل يُكتب بعد النظر إلى الصورة.
- **`sizes` على القصّ الفعلي:** الصورة المائلة من `lg` تأخذ `calc(100%*5/12 − 32px)` من عرض القسم وتُقصّ `cover` إلى ارتفاعه؛ عند 1440 القصّ ~930px من ملف 1536 (ADR-0074 D10). القيمة: `(min-width:1024px) 62vw, 100vw` مشتقة من القياس (العرض المطلوب ÷ عرض الشاشة) وتُقاس بعد البناء.

---

## ٤. المحتوى العربي كما استُخرج من Figma (حرفيًا)

- Hero: «الحوكمة والاستراتيجية» · «الخطة الاستراتيجية» · «خارطة طريق واضحة لتطوير ألعاب القوى الإماراتية، وتعزيز الأداء الرياضي، وبناء منظومة مستدامة تضع الرياضي في قلب المستقبل.»
- النظرة العامة: «خارطة طريق نحو المستقبل» · «تمثل الخطة الاستراتيجية إطارًا متكاملًا لتوجيه أعمال الاتحاد وتحديد أولوياته، وتحويل الطموحات إلى أهداف قابلة للتنفيذ والقياس.»
- المراحل: 01 الأساس (layers) «بناء منظومة مؤسسية قوية ترتكز على الحوكمة والكفاءة.» · 02 التطوير (trending-up) «الاستثمار في الرياضيين والمواهب والكفاءات الفنية.» · 03 التنافسية (trophy) «رفع مستوى الأداء وتعزيز حضور ألعاب القوى الإماراتية.» · 04 الأثر (sparkles) «تحقيق نتائج مستدامة وصناعة إرث رياضي للأجيال القادمة.»
- المحاور: «محاورنا الاستراتيجية» · «نركز جهودنا على مجموعة من الأولويات التي تشكل الأساس لتحقيق رؤيتنا وتطوير منظومة ألعاب القوى.» · 01 تطوير الرياضيين «توفير منظومة متكاملة لدعم الرياضيين ورفع مستويات الأداء والتنافسية.» · 02 اكتشاف المواهب «توسيع نطاق اكتشاف المواهب وتطوير مسارات واضحة للانتقال من الموهبة إلى الإنجاز.» · 03 التميز الرياضي «تعزيز جودة التدريب والمنافسات والبرامج الفنية بما يواكب المعايير الدولية.» · 04 تطوير الكفاءات «تمكين المدربين والحكام والإداريين من خلال برامج تطوير وتأهيل مستمرة.» · 05 الحوكمة المؤسسية «تطوير منظومة إدارية فعالة تقوم على الشفافية والمساءلة وجودة اتخاذ القرار.» · 06 الشراكة والاستدامة «بناء شراكات فاعلة مع الأندية والمؤسسات والقطاع الخاص لدعم مستقبل ألعاب القوى.»
- الأهداف: «من المحاور إلى أهداف ملموسة» · 01 رفع مستوى الأداء الرياضي «تطوير بيئة التدريب والإعداد بما يساعد الرياضيين على الوصول إلى مستويات تنافسية أعلى.» · 02 توسيع قاعدة المواهب «إنشاء مسارات أكثر فعالية لاكتشاف المواهب وتطويرها في مختلف مراحلها.» · 03 تعزيز المشاركة «زيادة انتشار ألعاب القوى وتشجيع المشاركة في مختلف الفئات والمجتمعات.» · 04 تطوير منظومة المنافسات «الارتقاء بجودة البطولات والفعاليات وتنظيمها وفق أفضل الممارسات.» · 05 تعزيز الحوكمة «بناء منظومة مؤسسية أكثر كفاءة وشفافية واستدامة.»
- المؤشرات: «نقيس التقدم، ونصنع الأثر» · 2030 «أفق الخطة الاستراتيجية» · 15 «برنامجًا للتطوير والتأهيل» · +30% «زيادة المشاركة في المنافسات» · +25% «نمو قاعدة المواهب»
- مسار التنفيذ: «نحوّل الاستراتيجية إلى واقع» · «لا تقاس الاستراتيجية بما نكتبه، بل بما ننجزه. لذلك نربط كل هدف بمبادرات واضحة ومؤشرات أداء تساعدنا على متابعة التقدم وتحقيق الأثر.» · الخطوات (تعريب STRATEGIC PILLAR → OBJECTIVE → INITIATIVE → MEASUREMENT → IMPACT): «المحور الاستراتيجي» · «الهدف» · «المبادرة» · «القياس» · «الأثر»
- الدعوة: «نبني اليوم مستقبل ألعاب القوى الإماراتية» · «مع رؤية واضحة، واستراتيجية طموحة، وعمل مستمر نحو صناعة أبطال وإنجازات تستمر للأجيال القادمة.» · زرّان: «الرؤية والرسالة» → `/about/governance/vision-mission` · «السياسات واللوائح» → `/about/governance/policies`
- **محذوف:** الوثائق الاستراتيجية (`758:232`) كاملًا.

---

## ٥. شاشة الإدارة `apps/dashboard`

- مسار `(app)/strategic-plan/page.tsx` على نمط `vision-mission/page.tsx` (`loadEditorialScreen("strategicPlansPage", …)`).
- تسجيل الكيان في `EDITORIAL_ENTITIES` (`apiPath: "/strategic-plans-page"`) + رابط في `navigation.ts` بنفس شرطي الرؤية والرسالة.
- `lib/admin/strategic-plan.ts`: `StrategicPlanResponse` / `StrategicPlanDraft` عبر `editorialDraft` بنوع جديد `"list"` للقوائم ذات `_id`/`isVisible` (يُضاف إلى `editorial-draft.ts` نوع kind جديد؟ — **لا**: تُبنى دوال `toDraft/changedFrom/toPatchBody` محليًا للقوائم في `lib/admin/strategic-plan-lists.ts` لتجنّب تعديل الملف المشترك).
- `components/admin/strategic-plan/editor.tsx`: أقسام مرقّمة بترتيب الصفحة (1 الواجهة · 2 النظرة العامة · 3 المراحل · 4 المحاور · 5 الأهداف · 6 المؤشرات · 7 مسار التنفيذ · 8 الدعوة · 9 البحث والمشاركة)، `BilingualField` للنصوص، `MediaPicker` للصور، `PlanListField` للقوائم.
- `components/admin/strategic-plan/plan-list-field.tsx`: عام بالـprops (نوع العنصر، الحقول، أيقونة اختيارية، قيمة نصية اختيارية)، سحب بالمؤشر (HTML5 drag) + أزرار أعلى/أسفل للكيبورد + مفتاح إظهار/إخفاء + حذف + إضافة؛ إعادة الترتيب تُرقّم `displayOrder` من 1 وتحفظ `_id`؛ الحفظ صريح عبر زر الهيكل.
- رسائل `StrategicPlan` في `messages/ar.json` و`en.json`.
- اختبارات vitest: الشاشة تعرض القوائم من السجل، الإضافة تولّد عنصرًا بلا `_id`، السحب/الأزرار تعيد الترقيم وتحفظ `_id`، الحفظ يرسل الحقول المتغيّرة فقط، لا حقل لترتيب الأقسام أو إخفائها.

---

## ٦. الاختبارات والتوثيق

- `apps/web`: `strategic-plan.spec.tsx` (بنية القسم من السجل، الأرضيات، الألوان بالموضع، القوائم المرقّمة، المخفي لا يُطبع، الأيقونات)، `page-rules.spec.ts` (المسار في `ALL_ROUTES` + مصنِّف موسَّع إن لزم + القاعدة ٣ في الأوضاع الثلاثة + قياس خطوط الحدّ تحت الشريط)، `identity-lines.spec.ts` (المسار في `ALL_ROUTES`)، `strategic-plan-text.spec.ts` (النص المخزّن حرفيًا)، `vitals` بـ`VITALS_ROUTE`، `token-contract` و`token-lists-contract`، `internal-links-contract` (المدخل الجديد).
- التوثيق: ADR-0075 (الـdomain، الـschema، جدول التحكم، القاعدة ٣ في التباين العالي، `SeamLines below`، المجموعة B، تراتب الـhero، نطاق القاعدة ٢، الانحرافات عن Figma، PENDING FIGMA BACK-SYNC) · `docs/engineering/how-strategic-plan-page-works.md` بالبنود التسعة · تحديث `page-building-guide.md` §٤/§٦/§٨ · ADR-0073 (نطاق القاعدة ٢ + جدول التعليق) · `DOCUMENTATION-INDEX.md` · `PREPARING_PAGES` → `PUBLIC_PAGES`.

## ٧. الترتيب والتوزيع

1. المهمة صفر (الواجهة) ‖ الـschema والـbackend بالـTDD (وكيل فرعي، `api/` فقط).
2. seed + نشر محلي.
3. الصفحة العامة (أنا) ‖ شاشة الإدارة (وكيل فرعي، `apps/dashboard` فقط) بعد استقرار الـschema.
4. الحركة والتفاعل · الاختبارات · التوثيق · التحقق البصري · impeccable · التقرير.

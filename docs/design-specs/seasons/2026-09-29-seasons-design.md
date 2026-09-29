# Spec — نظام المواسم (Seasons) — المشروع الفرعي 2 من 4

- **التاريخ:** 2026-09-29
- **الحالة:** مسودة جاهزة لـ writing-plans (لم يعتمدها المالك بعد)
- **النطاق:** `api/` (collection جديدة `seasons` + صلاحيات + ربط)، `apps/dashboard` (إدارة المواسم)، `apps/web` (صفحة الموسم، الأرشيف، الـredirect، لوحة الهيدر، فلاتر الوسائط).
- **الترتيب في السلسلة:** 1 الهيدر ← **2 المواسم** ← 3 الفعاليات العامة ← 4 ألعاب القوى. هذا الـspec يعتمد على المشروع 1 (الهيدر بنى `/seasons` و`/seasons/current` كصفحات PREPARING ووضع مكان لوحة اختيار الموسم)، ولا يعتمد على المشروع 3: قسم «فعاليات الموسم» يُبنى هنا بحالة فارغة (empty state) لأن collection الفعاليات العامة لم تُبنَ بعد — تحقّق مباشر: لا يوجد أي مجلد `api/src/modules/**/public-events` أو ما شابه في الكود.
- **مصدر المحتوى الحاكم:** `appendix-A-seasons.md` (نص المالك حرفيًا، انظر أ.1–أ.4 وقيود §المطابقة).
- **المرجع البصري:** `docs/design-specs/seasons/png/*.png` و`docs/design-specs/seasons/html/*.dc.html` و`docs/design-specs/seasons/README.md`. الصور مرجع للشكل فقط؛ القيم (hex, px) تُترجم إلى توكنات الـdesign system، ولا hex ولا px حر في الكود. عند الاختلاف، الـspec هو الصحيح.
- **الأزرق ليس هوية:** أي درجة أزرق في الصور (بانر الهيرو، بطاقات المواسم السابقة في الأرشيف) اختيار رسم للتمييز البصري بين اللوحات فقط. الهوية أخضر وأسود وأحمر، وتُستعمل surfaces موجودة مثل `section-black` (انظر §5.3 لقرار الألوان الصريح بخصوص بطاقات الأرشيف).
- **Figma:** لا تعديل (الاشتراك متوقف حسب CLAUDE.md §18). كل قرار بصري يُعلَّم `Pending Figma Back-Sync` في الـADR الذي يصدر عن هذا الـspec.

---

## 1. المشكلة ولماذا نبنيها الآن

الموسم اليوم **ليس سجلًا**، بل تسمية مُشتقّة من تاريخ: `api/src/modules/media-center/videos/season.ts` يحسب `seasonLabel(date)`/`seasonRange(label)` بافتراض أن كل موسم يبدأ 1 سبتمبر، ولا توجد أي collection باسم `seasons`. هذا الملف تستهلكه أربع نقاط في الكود اليوم (تحقّق مباشر):

| المستهلك | الملف | كيف |
|---|---|---|
| فلتر الألبومات العام | `api/src/modules/media-center/albums/albums.public-filter.ts:78` | `seasonRange(query.season)` على `eventDate` |
| facets الألبومات | `api/src/modules/media-center/albums/albums.repository.ts:255,308-309` | يبني تسمية الموسم من تجميع `eventDate` بالشهر/السنة |
| فلتر الفيديوهات العام | `api/src/modules/media-center/videos/videos.public-filter.ts:116-119` | `seasonRange(query.season)` على `publishedAt` (وليس `eventDate` — فرق متعمد لأن الفيديو لا يملك تاريخ مناسبة) |
| استجابة الفيديو العامة | `api/src/modules/media-center/videos/dto/video-public-response.dto.ts:67` | `seasonLabel(video.publishedAt)` يُعرض كحقل `season` |

المشكلة: لا يوجد مكان لإدارة موسم كمحتوى — اسم، شعار نصي، بانر، شعار، مراحل، تواريخ مهمة، وثائق، راعٍ — ولا صفحة عامة تجمع هذا. هذا المشروع يبني الـcollection والصفحات، **ويُبقي** `season.ts` كمرجع احتياطي فقط لتوافق الروابط القديمة (انظر §5.4).

## 2. النتائج المطلوبة (Definition of Done)

1. Collection `seasons` كاملة بالحقول والفهارس في §3، بلا تعديل أي حقل في أي schema قائم.
2. `/seasons/[slug]` (صفحة الموسم)، `/seasons` (الأرشيف)، `/seasons/current` (تحويل 302) — الثلاثة مبنية وفق §4.
3. لوحة «انتقل إلى موسم» في قائمة الهيدر «الفعاليات والمواسم» تعمل من نفس طلب الـserver المخزَّن 60 ثانية (§6).
4. الداشبورد: قائمة المواسم، نموذج الموسم بأقسامه السبعة، وتعيين الموسم الحالي بتأكيد وتدقيق (§7).
5. فلاتر `season` في الألبومات والفيديوهات تقرأ من `seasons` أولًا، والروابط القديمة `?season=2025–2026` تستمر تعمل (§8.1).
6. `seasons` مسجَّلة في `PERMISSION_RESOURCES`/`CAPABILITY_MAP` وسكريبت مزامنة الصلاحيات، و`Season` مضافة إلى `sponsorships.targetType`، و`seasons` مضافة إلى `SCANNED_COLLECTIONS` (مرجع الوسائط) (§9).
7. بطاقة «ملخص الموسم الحالي» في لوحة البطولات تبقى مخفية — قرار موثّق، ليست عيبًا (§8.2).
8. كل الاختبارات في §11 خضراء، بلا تغيير على `internal-links-contract.spec.ts` سوى ما يذكره §4.3.

## 3. نموذج البيانات: collection `seasons`

Domain: Media Center (نفس مجموعة `albums`/`videos`، §9). النمط العام: `BaseSchema` (createdBy/updatedBy/archivedAt/archivedBy) + `LocalizedTextSchema` لكل حقل ثنائي اللغة — نفس نمط `album.schema.ts`.

| الحقل | النوع | ملاحظات |
|---|---|---|
| `name` | `LocalizedTextSchema` (`{en, ar}`, required) | «Season 2026–2027» / «موسم 2026–2027» |
| `shortName` | `string` (required) | «26/27» — للكروت والأرشيف |
| `slug` | `string` (required, unique جزئي) | `2026-2027` — نفس نمط `AlbumSchema.index({slug:1},{unique:true, partialFilterExpression:{archivedAt:null}})` في `album.schema.ts:191` |
| `tagline` | `LocalizedTextSchema \| null` (default null) | الشعار النصي |
| `logoId` | `ObjectId \| null`, `ref: 'MediaAsset'` (default null) | بلا `ref` منقوص — نفس نمط `coverImageId` في الألبوم |
| `bannerId` | `ObjectId \| null`, `ref: 'MediaAsset'` (default null) | |
| `shareImageId` | `ObjectId \| null`, `ref: 'MediaAsset'` (default null) | يُستعمل بدل تكرار حقل SEO — انظر ملاحظة `seo` أدناه |
| `about` | `LocalizedTextSchema` (required) | نبذة الموسم |
| `closingSummary` | `LocalizedTextSchema \| null` (default null) | تظهر بعد `endDate` فقط (منطق عرض، ليس حذفًا شرطيًا للحقل) |
| `startDate` / `endDate` | `Date` (required) | UTC مخزَّنة، Asia/Dubai عند الإدخال والعرض (§10) |
| `phases` | `Phase[]` (subdocument، `_id:false`، نفس نمط `ContentAssociation`) | `{ name: LocalizedTextSchema, type: enum('preparation'\|'domestic'\|'international'\|'rest'), from: Date, to: Date }` — التسميات المعروضة: إعداد/داخلي/خارجي/راحة |
| `keyDates` | `KeyDate[]` (subdocument) | `{ title: LocalizedTextSchema, date: Date }` |
| `calendarDocumentId` | `ObjectId \| null`, `ref: 'Document'` (default null) | روزنامة PDF — `ref: 'Document'` يطابق `document.schema.ts:66` |
| `documentIds` | `ObjectId[]`, بلا `ref` (default []) | وثائق الموسم، متعددة — نفس نمط `athleteIds`/`clubIds` في الألبوم (مصفوفة IDs بلا ref مُعلن عند عدم وجود سبب لمنع القراءة المتعددة؛ **قرار**: تُعلن `ref: 'Document'` هنا لأن `Document` model مسجَّل فعلًا (على عكس `championshipId` في الألبوم الذي لا سبب لتركه بلا ref سوى غياب الموديل) |
| `isCurrent` | `boolean` (default false) | فهرس **partial unique** (`{isCurrent:true}` كفلتر جزئي) — نمط جديد في هذا الكود (لا يوجد سابقة لـboolean partial-unique index؛ الأقرب هو `isFeatured` في الألبوم الذي يُدار بالتطبيق فقط عبر `setFeatured()`، بلا قيد قاعدة بيانات). **القرار هنا:** فهرس DB + تفريغ الحامل السابق في نفس العملية (كلاهما، دفاعًا مزدوجًا) — انظر §7.3 |
| `publicationState` | `enum('Draft'\|'Published'\|'Archived')` (required) | نفس تسميات `ALBUM_PUBLICATION_STATES` — **وليس** `'draft'\|'published'` بحروف صغيرة كما في `video.schema.ts` — القرار: الموسم أقرب لنمط الألبوم (عنصر يديره الداشبورد مباشرة بصلاحية `Publish` مخصّصة) لا لنمط الفيديو |
| `publishedAt` / `publishedBy` | `Date \| null` / `ObjectId \| null` | يُكتبان من السيرفر فقط عبر `PATCH /seasons/:id/publish`، نفس نمط `AlbumsService.publish()` |
| `isVisible` | `boolean` (default false) | سجلّ جديد مخفي افتراضيًا — نفس نمط `sponsorships.isVisible` |
| `seo` | `PageSeoSchema` (embedded، `_id:false`) | **إعادة استخدام** `api/src/common/schemas/page-seo.schema.ts` (`metaTitle`, `metaDescription`, `ogImageId`) بدل اختراع `seoTitle{ar,en}`/`seoDescription{ar,en}` كما كتب الملحق حرفيًا — نفس الحقول الثلاثة بالضبط، وموجودة بالفعل كـschema مشترك لهذا الغرض تحديدًا (تعليقها: «Shared rather than module-local since ADR-0069 D2»). **هذا يُفضَّل حرفيًا على نص الملحق** بحكم §16 (توكن/schema قياسي موجود يُفضَّل على تكرار الحقول) |
| `displayOrder` | — | **غير مطلوب**: الترتيب الزمني (`startDate` تنازليًا) هو ترتيب الأرشيف الطبيعي، ولا شبكة يدوية الترتيب في التصميم |

**الرعاة:** لا حقل على `Season` — عبر `sponsorships.targetType = 'Season'` (§9.2)، تمامًا كما يكتب الملحق.

### 3.1 القواعد

- **لا حذف لو مرتبط.** موسم عليه فعاليات أو ألبومات (عبر `eventDate` ضمن نطاقه) أو فيديوهات (عبر `publishedAt` ضمن نطاقه) → `DELETE` يرد `409` برسالة، والداشبورد يقترح الإخفاء (`isVisible:false`) بدلًا من الحذف. **ملاحظة تنفيذية:** الفحص هنا لا يشبه `findMediaAssetReferrers` (ذاك للوسائط)؛ هو استعلام مباشر على `albums`/`videos` بنطاق تاريخ الموسم — لأن لا `seasonId` على أي منهما (§3.2، القيد #6).
- **لا تداخل بين المواسم.** يُتحقق في `SeasonsService` قبل الحفظ: `startDate < endDate`، وأن مدى `[startDate, endDate)` لا يتقاطع مع أي موسم آخر غير مؤرشف. **لا فهرس DB يفرض هذا** (Mongo لا يدعم قيد نطاقات native) — تحقق تطبيقي فقط، مثل تحقق `SponsorshipsService` لتداخل الرعاية (نمط مشابه موجود في `sponsorships.service.ts`، يُراجَع عند التنفيذ).
- **الموسم المقترح لأي تاريخ** = الموسم الذي يقع التاريخ داخل `[startDate, endDate)` — نصف مفتوح، نفس عقد `seasonRange` الحالي في `season.ts:49-63`، وليس عقدًا جديدًا.
- **مراحل الموسم تتداخل مع بعضها؟** الملحق يقول «جوه نطاق الموسم» فقط، ولا يمنع صراحة تداخل مرحلتين. **DESIGN DECISION REQUIRED (مؤجل، ليس حاجزًا):** هل تتحقق `SeasonsService` من عدم تداخل `phases[]` فيما بينها؟ التصميم (`dash-02-season-form.png`) يعرضها متتالية بلا فجوة، لكن النص لا يفرض ذلك. يُنفَّذ في هذا المشروع تحقق «كل مرحلة داخل نطاق الموسم» فقط (وهو ما يكتبه الملحق فعلًا)، ولا يُضاف تحقق عدم-تداخل بين المراحل بلا قرار مالك صريح.

### 3.2 الفهارس

```
{ slug: 1 } unique, partialFilterExpression: { archivedAt: null }   // نفس نمط الألبوم
{ isCurrent: 1 } unique, partialFilterExpression: { isCurrent: true }
{ publicationState: 1, startDate: -1 }                              // ترتيب الأرشيف والقائمة
{ startDate: 1, endDate: 1 }                                        // اقتراح الموسم بالتاريخ + فحص التداخل
```

### 3.3 لماذا لا تدخل `seasons` ضمن `WORKFLOW_ENTITY_TYPES`

الملحق يكتب: «تُضاف `seasons` لـ`WORKFLOW_ENTITY_TYPES` **لو مرّ بالموافقات**» — شرط، لا قرار. الكود الحالي (`api/src/common/constants/workflow-entity-types.ts:14-28`) يضم 13 نوعًا فقط، وكلها محتوى تحريري/حوكمي (مقالات، صفحات ثابتة، وثائق حوكمة، سيرة الرئيس...)، بينما `albums` و`videos` — أقرب نظيرين لـ`seasons` بنيويًا (محتوى يديره فريق الميديا مباشرة، لا مراجعة تحريرية) — **مستبعدان صراحةً وبالتعليق نفسه** في `album.schema.ts:24-26`:

> «`publicationState` is self-owned: an album is a media-organization construct, not editorial narrative content, so it is published directly by Media Center staff without a Domain 7 review pipeline — `albums` is deliberately absent from both `WORKFLOW_ENTITY_TYPES` and `PUBLICATION_ENTITY_TYPES`.»

**القرار (يُوثَّق في الـADR الناتج):** `seasons` تتبع نفس نمط `albums`/`videos` — صلاحية `Publish` مخصّصة على المورد نفسه (§9.1)، بلا دخول في `WORKFLOW_ENTITY_TYPES`/`revisions`/`publications`. هذا يُلغي الشرط الوارد في الملحق بناءً على السابقة الكودية الصريحة، لا تخمينًا.

## 4. سطح الموقع العام

| المسار | الحالة اليوم | الحالة بعد هذا المشروع | السجلّ (register) |
|---|---|---|---|
| `/seasons/[slug]` | غير موجود | صفحة جديدة، `PUBLIC_PAGES` | هيرو أسود (`black`)، أرضية محايدة (`neutral`) — نفس نمط `/about/governance/policies` الموثَّق في `public-pages.ts:230` («The page ground stays neutral and the hero is the black register») |
| `/seasons` | `PREPARING_PAGES` (`apps/web/src/app/[locale]/seasons/page.tsx`) | صفحة جديدة، تنتقل إلى `PUBLIC_PAGES` | نفس نمط أعلاه |
| `/seasons/current` | `PREPARING_PAGES` (`apps/web/src/app/[locale]/seasons/current/page.tsx`) | **يبقى بلا محتوى خاص به** — تحويل 302 فقط، يبقى خارج `PUBLIC_PAGES` (§4.3) | — |
| لوحة الهيدر «انتقل إلى موسم» | مكانها محجوز كرابط «تصفّح أرشيف المواسم» (§3.4 من ADR-0122) | بحث فعلي + آخر 3 مواسم | — |

### 4.1 صفحة الموسم `/seasons/[slug]`

وفق `site-01-season-page.png` و`html/Season.dc.html`، من الأعلى للأسفل:

1. **الهيرو (هيرو أسود):** البانر (`bannerId`)، الشعار (`logoId`، بديل نصي عند الغياب: مربع بحدود متقطعة كما في التصميم لا صورة placeholder مفبركة)، الاسم (`name`)، الشعار النصي (`tagline`، لو موجود)، شارة «الموسم الحالي» (لو `isCurrent`)، شارة المرحلة الحالية (محسوبة من `phases[]` مقارنة بتاريخ اليوم — Asia/Dubai)، مدى التاريخ، وزرّا: «روزنامة الموسم (PDF)» (`calendarDocumentId`) و«أجندة الموسم» (يربط لاحقًا بـ`/events?view=calendar` من المشروع 3 — اليوم يربط لأرشيف المواسم أو يُخفى لو لا وجهة، **DESIGN DECISION REQUIRED صغير**: أي من الاثنين، يُترك مخفيًا حتى يبني المشروع 3 الوجهة، بدل رابط ميت).
2. **صف الإحصاءات:** عدد الفعاليات (من مصدر المشروع 3، `null`/0 حتى ذلك الحين)، عدد الألبومات، عدد الفيديوهات — الأخيران مُحتسبان حيًّا من `AlbumsRepository`/`VideosRepository` بفلتر نطاق تاريخ الموسم (نفس فلتر §8.1)، لا حقل مخزَّن.
3. **مراحل الموسم على خط زمني:** محور 12 شهرًا من `startDate` إلى `endDate`، كل `phase` تُرسم بعرض نسبي لمداها، ونقطة «اليوم» لو داخل نطاق الموسم، والتواريخ المهمة (`keyDates[]`) أسفل الخط بعلامات معينية (كما في `Season.dc.html:107-113`، مُترجمة لتوكنات الألوان: كل نوع مرحلة يأخذ لون **دلالي** ثابت من نظام الحالة الموجود، لا لونًا حرًّا — انظر §5.1 لتفصيل الألوان).
4. **فعاليات الموسم:** أول 3، ورابط «كل فعاليات الموسم (N)». **يعتمد على المشروع 3** — يُبنى هنا بحالة فارغة موثَّقة (empty state: نص + لا كسر تخطيط) حتى يوصل المشروع 3 مصدره الحقيقي، تمامًا كما يشترط الملحق («ولو فاضية يظهر empty state»).
5. **الوسائط:** ألبومات الموسم وفيديوهاته، بفلتر `season` الجديد (§8.1)، بنفس مكوّنات شبكة الألبومات/الفيديوهات الموجودة — لا مكوّن جديد.
6. **عن الموسم + الختام:** `about` دائمًا، و`closingSummary` يظهر فقط بعد `endDate` (شرط عرض، ليس شرط تخزين).
7. **الوثائق:** `calendarDocumentId` + `documentIds[]`، بنفس مكوّن بطاقة المستند المستعمل في صفحات الوثائق الأخرى.
8. **الراعي:** عبر `sponsorships` حيث `targetType='Season'` و`targetId=season._id` — لا استعلام جديد، نفس مسار قراءة الرعاة الموجود بفلتر مختلف.
9. **التنقل بين المواسم:** السابق/التالي (بالترتيب الزمني)، وزر «أرشيف المواسم».

### 4.2 أرشيف المواسم `/seasons`

وفق `site-02-seasons-archive.png` و`html/SeasonsArchive.dc.html`: بطاقة كبيرة للموسم الحالي (هيرو أسود مصغَّر بنفس الهوية)، ثم شبكة 3 أعمدة للمواسم السابقة (الأحدث أولًا). كل بطاقة: الاسم، المدى، الإحصاءات المختصرة. حقل بحث بالسنة، **يقبل أرقامًا عربية وأرقامًا لاتينية** (تحويل الأرقام العربية-الهندية إلى لاتينية قبل المطابقة، مثل أي حقل رقمي آخر في الموقع يعرض بالتنسيق اللاتيني حسب §10).

**لا صفحة `seasonsPage` (hero wrapper) في هذا المشروع.** الاثنا عشر صفحة القائمة الأخرى (`clubs`, `albums`, `videos`...) لكل منها collection مستقلة من نوع `HeroPageSchema` (`heroImageId`/`heroTitle`/`heroSubtitle`/`isActive`) يديرها الداشبورد بصلاحية `<name>Page:Update/Publish` — نمط موثَّق في `api/src/common/schemas/hero-page.schema.ts:6-18` ومطبّق في `albums-page`/`videos-page` (`api/src/modules/media-center/albums-page/`). الملحق **لا يذكر** شاشة إدارة مماثلة لعنوان/وصف صفحة `/seasons` نفسها (`dash-01`/`dash-02` يديران المواسم كعناصر، لا يديران غلاف الأرشيف). **القرار لهذا المشروع:** عنوان ووصف `/seasons` نصّ i18n ثابت (`Pages.seasons.title`/`description`)، بلا collection جديدة — تمامًا كما تفعل `PreparingPageScreen` اليوم لكل صفحة `PREPARING`. إضافة `seasonsPage` لاحقًا (لو أراد المالك غلافًا قابلًا للتحرير) إضافة صِرفة لا تكسر شيئًا. **مصنَّف: DESIGN DECISION REQUIRED (مؤجَّل، غير حاجز).**

### 4.3 `/seasons/current`: تحويل 302

**تنفيذ:** `apps/web/src/app/[locale]/seasons/current/page.tsx` يبقى ملف `page.tsx` (وليس Route Handler `route.ts`) لكنه يستدعي `redirect()` من `next/navigation` مباشرة بدل رسم `PreparingPageScreen` — يقرأ الموسم الحالي (`isCurrent:true`) من الـAPI، ويحوّل إلى `/seasons/[slug]` الخاص به، أو إلى `/seasons` لو لا يوجد موسم حالٍ.

**لماذا `page.tsx` لا `route.ts`:** `apps/web/src/lib/pages/internal-links-contract.spec.ts:83-84,136-142` يتحقق أن لكل رابط داخلي (بما فيها روابط الهيدر من `navDestinations()`، والتي تحمل فعلًا `/seasons/current` — `apps/web/src/lib/navigation.ts:141`) ملف `app/[locale]/.../page.tsx` موجود — **وليس** `route.ts`. لو صار المسار Route Handler فقط، يفشل الاختبار فورًا لأي رابط يشير إليه. استعمال `page.tsx` بـ`redirect()` يحقق الـ302 المطلوب **ويحافظ** على مرور هذا الاختبار بلا أي تعديل عليه.

**الحالة في `PUBLIC_PAGES`/`PREPARING_PAGES`:** يبقى في `PREPARING_PAGES` (لا محتوى خاص به لِـ`isIndexable`/`listEndpoint`/`schemaType` — هذه الحقول لصفحة محتوى، لا لتحويل). هذا **لا يغيّر** حالته الحالية في `apps/web/src/lib/pages/public-pages.ts:393-399`، فقط يُستبدل جسم الصفحة. السطر `registerBasis` الحالي («صفحة مؤقتة؛ التصنيف النهائي يتحدد في spec المشروع الذي يبني الصفحة الحقيقية») يُحدَّث ليقول إنها تحويل دائم لا صفحة محتوى مؤجَّلة.

### 4.4 SEO

`metadata`/`canonical`/`hreflang` لكل `/seasons/[slug]` من حقل `seo` المُعاد استخدامه (§3)، بنفس آلية أي صفحة `PUBLIC_PAGES` أخرى (`isIndexable`، بديل الصورة `ogImageId` أو `shareImageId` لو مختلفًا — **قرار**: `shareImageId` يُستعمل تحديدًا لبطاقة المشاركة الاجتماعية لو أُدخل، وإلا `seo.ogImageId`، وإلا `bannerId`).

## 5. لوحة اختيار الموسم في الهيدر

كما في `header/png/01-desktop-1440-panel-4-events-seasons.png` وكما وثَّقه `docs/design-specs/header/2026-09-28-header-redesign-design.md` §3.4 و§15 قرار #1: آخر 3 مواسم + بحث بالسنة، ضمن **نفس** استدعاء `getHeaderFeatures(locale)` المخزَّن 60 ثانية — لا طلب إضافي من العميل. هذا يعني: `getHeaderFeatures` تكتسب حقلًا جديدًا (مثل `recentSeasons: {slug, shortName, isCurrent}[]`)، يُملأ من `SeasonsService` عبر `Promise.allSettled` مثل بقية حقولها، ويعيد `[]` عند الفشل لا يكسر الهيدر — نفس نمط بقية الحقول الموثَّق في `docs/design-specs/header/2026-09-28-header-redesign-plan.md:1966-2045`.

### 5.1 ألوان مراحل الخط الزمني

كل `phase.type` (`preparation`/`domestic`/`international`/`rest`) يأخذ لونًا **دلاليًا ثابتًا واحدًا** من نظام الألوان الموجود (ليس تدرجًا حرًّا لكل مرحلة كما رسمه العرض التوضيحي بـhex مباشر). **DESIGN DECISION REQUIRED:** لا يوجد اليوم في هذا الاستكشاف Mapping موثَّق بين أنواع المراحل الأربعة وأي توكن لون بعينه (لم يُعثر على تصنيف مماثل في الكود المفحوص). يُترك هذا لفريق نظام التصميم عند التنفيذ، بشرط واحد غير قابل للتفاوض: أربعة توكنات ثابتة معروفة مسبقًا، لا hex يُختار وقت الكتابة.

### 5.2 الأرقام

نفس §10 أدناه — البحث بالسنة والإحصاءات كلها بأرقام لاتينية، مهما كانت لغة الواجهة.

### 5.3 ألوان بطاقات الأرشيف — قرار صريح

`html/SeasonsArchive.dc.html:108-110` يلوّن كل بطاقة موسم سابق بتدرج مختلف (أزرق/أحمر/رمادي داكن) لمجرد التمييز البصري بين البطاقات المتجاورة. **هذا لا يوافق قاعدة "لا ألوان اعتباطية" (CLAUDE.md §2):** لا يوجد قاعدة نظام تصميم توزّع لونًا معينًا على كل موسم بالتناوب. **القرار لهذا المشروع:** كل بطاقات المواسم غير الحالي تُرسم بنفس السطح المحايد/الأسود الموحَّد (نفس عائلة `section-black` المستعملة لهيرو الموسم نفسه)، والتمييز بينها بالمحتوى (الاسم، المدى، الإحصاءات) لا باللون. لو أراد المالك تلوينًا مميَّزًا فعليًا لكل موسم، ذلك `DESIGN DECISION REQUIRED` منفصل يحتاج قاعدة موثَّقة أولًا (كأن يُشتق اللون من شعار الموسم `logoId` بمنطق محدد)، وليس بديلًا اعتباطيًا بالتناوب.

## 6. الداشبورد

### 6.1 قائمة المواسم (`dash-01-seasons-list.png`)

جدول: الموسم (الاسم + المدى)، الحالة (`publicationState` + `isCurrent` كشارة منفصلة)، المحتوى (ملخص: عدد الفعاليات/الألبومات/الفيديوهات — نفس الاستعلام الحي في §4.1)، الإجراءات (تعديل، حذف — معطّل لو مرتبط بمحتوى وفق §3.1، «اجعله الموسم الحالي» بتأكيد لو ليس هو الحالي بالفعل).

### 6.2 نموذج الموسم (`dash-02-season-form.png`)

سبعة أقسام مرقَّمة، مطابقة لحقول §3 حرفيًا:

1. **هوية الموسم:** `name` (ar/en)، `slug` (مُقترَح من `name.en` قابل للتعديل، تحقق فريد)، `shortName`، `tagline` (ar/en).
2. **البصريات:** `bannerId`، `logoId`، `shareImageId` (اختياري، معنون في التصميم «صورة المشاركة على السوشيال»).
3. **الزمان والمراحل:** `startDate`/`endDate`، محرر `phases[]` (إضافة/حذف صف، كل صف: الاسم + النوع + من/إلى)، مع تحقق «كل مرحلة داخل نطاق الموسم» وقت الحفظ (لا وقت الكتابة الحرفية في كل حقل — نفس نمط التحقق عند الإرسال المستعمل في نماذج الداشبورد الأخرى).
4. **المواعيد المهمة:** محرر `keyDates[]` (عنوان + تاريخ)، مع ملاحظة أنها تظهر على الخط الزمني بعلامة.
5. **التعريف:** `about` (ar/en)، `closingSummary` (ar/en، حقل واحد يظهر دائمًا في النموذج بصرف النظر عن حالة الموسم — شرط العرض في الموقع فقط، لا شرط في الإدخال).
6. **الوثائق والرعاة:** `calendarDocumentId`، `documentIds[]` (رفع/اختيار متعدد)، وحقل ربط راعٍ — **توضيح مهم:** هذا الحقل في النموذج هو اختصار لإنشاء/ربط سجلّ `sponsorships` بـ`targetType='Season'`، **ليس** حقلًا على `Season` نفسها (يطابق تعليق التصميم «من الرعاة المسجَّلين (sponsorships)»).
7. **محركات البحث:** `seo.metaTitle`/`seo.metaDescription` (ar/en) مع عدّاد أحرف ومعاينة نتيجة بحث — نفس مكوّن SEO المستعمل في صفحات أخرى تتبنى `PageSeoSchema`.

الحفظ والنشر والمعاينة بنفس أزرار/حالات نمط `album-form.tsx` (`apps/dashboard/src/components/admin/albums/album-form.tsx`): زر حفظ عام، تبديل الظهور، وزر نشر منفصل مرتبط بصلاحية `Publish`.

### 6.3 عنصر «المواسم» في السايد بار

`apps/dashboard/src/lib/navigation.ts` نمط مسطَّح اليوم (`albums`, `videos` كعناصر مستقلة، السطر 320-323) — لا مجموعة معنونة «الفعاليات والمواسم» موجودة فعليًا رغم ظهورها في التصميم (لأن عنصر «الفعاليات» نفسه غير مبني، لا يوجد backend لفعاليات عامة بعد). **القرار:** يُضاف `seasons` كعنصر مستقل مسطَّح، بنفس نمط `{key:"seasons", href:"/seasons", requires:[{resourceType:"seasons", action:"Read"}]}` — لا مجموعة جديدة تُبنى الآن. عندما يبني المشروع 3 «الفعاليات»، يُعاد تجميع الاثنين تحت عنصر أب واحد بأبناء (نمط `NavItem.children` الموجود فعليًا في `apps/dashboard/src/components/shell/sidebar-nav.tsx:184-243`، يدعم هذا التجميع بلا أي تعديل بنيوي) — هذا يُذكر هنا كتوجيه للمشروع 3، لا كعمل في هذا المشروع.

## 7. تعيين الموسم الحالي

زر «اجعله الموسم الحالي» في `dash-01` → `PATCH /seasons/:id/set-current`، صلاحية `seasons:Update` (لا فعل جديد — نفس نمط `PATCH /albums/:id/featured` الذي يستعمل `albums:Update` لا فعلًا مخصّصًا). العملية: تفريغ الحامل السابق (`isCurrent:false`) وتعيين الجديد داخل معاملة واحدة، **بالإضافة** إلى الفهرس الجزئي الفريد في §3.2 كخط دفاع ثانٍ على مستوى القاعدة. تُسجَّل في سجل التدقيق تلقائيًا (الـ`AuditLogInterceptor` العام يغطي أي `PATCH` بصلاحية معروفة، بلا حاجة لتكوين خاص — نفس ما يحدث اليوم لـ`setFeatured`).

## 8. الربط

### 8.1 فلاتر `season` في الألبومات والفيديوهات + توافق الروابط القديمة

**الوضع الحالي:** `buildAlbumFilter`/`buildPublicVideoFilter` دالتان **نقيّتان** (بلا أي استعلام قاعدة بيانات) تستدعيان `seasonRange(label)` مباشرة (`albums.public-filter.ts:78`, `videos.public-filter.ts:116`). لا يمكن الإبقاء عليهما نقيّتين تمامًا وإضافة قراءة من `seasons` في آن، لأن ترجمة `label → range` تحتاج الآن استعلامًا حقيقيًا.

**الحل (يُنفَّذ في `AlbumsService`/`VideosService`، قبل استدعاء الفلتر النقي):**

1. الخدمة تستقبل `query.season` (تسمية مثل `2025–2026`).
2. تحاول أولًا مطابقتها بسجلّ حقيقي في `seasons`: تحويل الشرطة الفاصلة الطويلة (–) إلى شرطة عادية (`slug` بصيغة `2025-2026`) والبحث بـ`slug`. لو وُجد: يُستعمل `startDate`/`endDate` الحقيقيان للسجلّ (يعكسان أي تعديل يدوي أدخله المحرِّر، حتى لو خرج عن اصطلاح 1 سبتمبر).
3. لو لم يوجد سجلّ مطابق (موسم قديم لم يُدخَل بعد كسجلّ، أو تسمية لا تطابق أي `slug`): تسقط تلقائيًا إلى `seasonRange(label)` الحالية في `season.ts` — **بلا أي تغيير على تلك الدالة**، بالضبط كما يشترط الملحق («season.ts يفضل مرجع احتياطي بس»).
4. الناتج (`{from, to} | null`) يُمرَّر إلى `buildAlbumFilter`/`buildPublicVideoFilter` كحقل جاهز (مثلًا `resolvedSeasonRange`) بدل أن تستدعي الدالتان `seasonRange` بأنفسهما — فتبقيان نقيتين وقابلتين للاختبار كما هما اليوم، ويصبح استدعاء `seasonRange` من مسؤولية الخدمة فقط.

بهذا، الرابط القديم `?season=2025–2026` يستمر يعمل حرفيًا كما هو، وبمجرد إدخال موسم 2025–2026 كسجلّ حقيقي بتواريخ مطابقة (وهو الحالة المتوقعة)، يتحوّل تلقائيًا لاستعمال البيانات الحقيقية دون أي تغيير في الرابط نفسه.

### 8.2 بطاقة «ملخص الموسم الحالي» — تبقى مخفية

لا تغيير مطلوب هنا فعليًا: `getHeaderFeatures` تعيد `currentSeasonSummary: null` دائمًا اليوم (موثَّق في خطة الهيدر، الأسطر 2042-2045: «Project 2 (seasons) and project 3 (public events) own these readers»)، والعمود يختفي عند `null` (fallback موثَّق في نفس الخطة). **قرار هذا المشروع:** لا تُملأ `currentSeasonSummary` رغم توفر الموسم الحالي الآن، لأن الحقل يحتاج عدد بطولات وأرقام قياسية، ولا collection لأي منهما بعد. البقاء على `null` قرار موثَّق لا نقص تنفيذ.

### 8.3 مصدر البحث (`buildSearchSources`)

**تحقّق:** السجل موجود فعلًا، لكن باسم آخر: `buildSearchSources(models)` في `api/src/modules/platform-administration/search/search-sources.ts:105`، ويعيد ستة مصادر مسجَّلة (`articles` و`albums` و`videos` و`clubs` و`athletes` و`coaches`)، ويُستدعى مرة واحدة في باني `SearchService`. إضافة مصدر = إدخال واحد في المصفوفة + `search_text` index على الـcollection، **بلا أي تعديل في الـservice أو الـcontroller** — وهذا شرط تصميمه. فتسجيل `seasons` داخل النطاق.

## 9. الصلاحيات (RBAC)

### 9.1 `seasons` كمورد جديد

- `PERMISSION_RESOURCES` (`api/src/common/constants/permission-resources.ts:17-107`): إضافة `'seasons'` إلى المصفوفة (بترتيب أبجدي مع الجوار — تُدرَج بعد `roles` وقبل `siteSettings` أبجديًا، أو بعد `resultsRankingsPage` — الترتيب الأبجدي داخل الملف ليس صارمًا 100% لكنه الاصطلاح السائد).
- `CAPABILITY_MAP` (`api/src/common/authz/capability-map.ts`): إدخال جديد على نمط `albums` بالضبط (`api/src/common/authz/capability-map.ts:91-99`):
  ```ts
  {
    resourceType: 'seasons',
    group: 'media-center',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  ```
  `PERMISSION_CATALOGUE` (`permission-catalogue.ts`) يشتق تلقائيًا من هذا — لا تعديل يدوي إضافي هناك.
- `resource-domains.ts` (لوحة الأدوار في الداشبورد، `apps/dashboard/src/lib/admin/resource-domains.ts:68-138`): إضافة `seasons: "media-center"` إلى `RESOURCE_TO_DOMAIN`.
- **بعد الإضافة:** تشغيل `npm run sync:permissions` (سكريبت `api/src/sync-permission-catalogue.ts`) لمزامنة صفوف `permissions` الحقيقية في القاعدة ومنح دور Super Admin إياها — خطوة تشغيلية بعد الدمج، لا كتابة يدوية للسجلات.
- لا يُعاد استعمال فعل `Publish` لتعيين `isCurrent` — ذاك يبقى تحت `Update` (§7).

### 9.2 `sponsorships.targetType`

تعديل قيمة واحدة في `api/src/modules/sponsorship-relations/sponsorships/schemas/sponsorship.schema.ts:10`:

```ts
export const SPONSORSHIP_TARGET_TYPES = ['Federation', 'Championship', 'Event', 'Season'] as const;
```

هذا **ليس** تعديل حقل موجود (القيد العام يمنع تعديل/حذف حقل — هذا توسيع لمجموعة قيم enum على حقل قائم، وهو ما يطلبه الملحق حرفيًا في §المطابقة). `targetId` يبقى بلا `ref:` (نمط poly-ref قائم، السطر 41-42 من نفس الملف)، بلا أي تغيير عليه.

### 9.3 `seasons` في `SCANNED_COLLECTIONS` (مرجع الوسائط)

**اكتشاف غير مذكور في الملحق إطلاقًا:** `Season` تحمل ثلاث مراجع لـ`MediaAsset` (`logoId`/`bannerId`/`shareImageId`) ومرجعًا لـ`Document` (`calendarDocumentId`/`documentIds`). الفحص الحي لمرجعية الوسائط (`findMediaAssetReferrers`) يمسح كل الـschemas المسجَّلة تلقائيًا (`api/src/common/authz/media-references.ts`، الحلقة `for (const root of roots)` تمر على كل نموذج مسجَّل بلا شرط قائمة)، **لكن** الاختبار الحارس `media-reference-coverage.spec.ts:370-374` يقارن `SCANNED_COLLECTIONS` (قائمة صريحة، الأسطر 49-121) حرفيًا مع كل الـcollections المسجَّلة ويفشل عند أي اختلاف. **إلزامي:** إضافة `'seasons'` إلى `SCANNED_COLLECTIONS` في نفس الالتزام الذي يسجّل `SeasonSchema`، وإلا فشل هذا الاختبار الحارس فور تسجيل الموديل — بصرف النظر عن أي شيء آخر في هذا الـspec.

## 10. i18n والتنسيق

- التواريخ (`startDate`, `endDate`, `phases[].from/to`, `keyDates[].date`, `publishedAt`) تُخزَّن UTC، وتُدخَل وتُعرض بتوقيت Asia/Dubai — نفس اصطلاح بقية المنصة.
- كل الأرقام (الإحصاءات، مدى السنوات، حقل بحث الأرشيف) بأرقام **لاتينية** دائمًا، بصرف النظر عن لغة الواجهة — نفس اصطلاح بقية الموقع الموثَّق في تقارير سابقة (Live Measurement / digits Latin).
- `slug` بصيغة `YYYY-YYYY` بشرطة عادية (لتوافق الروابط)، بينما العرض النصي للتسمية (`name`, واجهة الأرشيف) يستعمل الشرطة الفاصلة الطويلة (–) — نفس التمييز القائم بالفعل بين `slug` الألبوم وتسمية موسمه.

## 11. الاختبارات (مركّزة)

1. **Unit — `season.schema.spec.ts`:** الفهرس الجزئي الفريد على `isCurrent`، فهرس `slug` الجزئي، تحقق عدم تداخل المواسم عند الحفظ.
2. **Unit — دمج فلتر الموسم:** حل `?season=2025–2026` إلى سجلّ حقيقي عند وجوده، والسقوط إلى `seasonRange` عند غيابه — لكل من الألبومات والفيديوهات.
3. **Integration — `SeasonsService`:** لا حذف لموسم مرتبط بألبوم/فيديو ضمن نطاقه (409)؛ `set-current` يفرّغ الحامل السابق ذريًّا.
4. **`media-reference-coverage.spec.ts`:** يبقى أخضر بعد إضافة `seasons` إلى `SCANNED_COLLECTIONS` (اختبار موجود، يُتحقق أنه لا يزال يمر، لا اختبار جديد).
5. **`internal-links-contract.spec.ts`:** يبقى أخضر بعد تحويل `/seasons/current` إلى `redirect()` داخل `page.tsx` (اختبار موجود، §4.3).
6. **E2E:** أرشيف المواسم (البطاقة الحالية + الشبكة + البحث بالسنة بأرقام عربية ولاتينية)، صفحة الموسم (الخط الزمني + الفعاليات فارغة + الوسائط مفلترة)، `/seasons/current` يحوّل 302 فعليًا لموسم حقيقي مُعلَّم `isCurrent`.
7. **Dashboard:** نموذج الموسم يمنع الحفظ عند تداخل التواريخ، «اجعله الحالي» يتطلب تأكيدًا ويظهر في سجل التدقيق.

## 12. خارج النطاق (قرارات صريحة، لا تأجيل)

- **`SeasonThemeDemo.dc.html`** (انتقال الوضع شروق/غروب): **مؤجَّل بقرار مالك صريح**، ولا يُنفَّذ في هذا المشروع ولا أي مشروع لاحق بلا قرار جديد وADR توكنات وضع داكن مخصّص (نفس القرار المسجَّل في خطة الهيدر §13).
- **فعاليات الموسم كبيانات حقيقية:** تعتمد على المشروع 3 (الفعاليات العامة) — هنا تُبنى بحالة فارغة فقط.
- **بطاقة ملخص الموسم الحالي في لوحة البطولات:** تبقى `null`/مخفية — لا بطولات ولا أرقام قياسية بعد (§8.2).
- **`seasonsPage` (غلاف hero قابل للتحرير لصفحة `/seasons`):** غير مطلوب في الملحق، ولا شاشة داشبورد له في التصميم — نص i18n ثابت بدلًا منه (§4.2).
- **تلوين بطاقات الأرشيف بالتناوب:** لا قاعدة نظام تصميم تبرره — سطح موحَّد بدلًا منه (§5.3).
- **مجموعة سايد بار «الفعاليات والمواسم» المعنونة:** تُبنى عند وصول المشروع 3 (§6.3)، ليس الآن.
- أي تعديل على حقل موجود في أي schema قائم، أو migration يعدّل بيانات موجودة، أو خدمة خارجية.

## 13. الحجم

قرابة 4 إلى 5 أيام عمل: الـbackend (schema + service + controller + module + تحقق التداخل) ← الصلاحيات (catalogue + مزامنة) ← الداشبورد (قائمة + نموذج بأقسامه السبعة + set-current) ← الموقع العام (صفحة الموسم + الأرشيف + الـredirect) ← الربط (فلاتر الوسائط + لوحة الهيدر) ← تبديل الصفحات من PREPARING إلى PUBLIC + الاختبارات + ADR + مزامنة التوثيق. تفصيل المهام والتقدير لكل مرحلة في خطة التنفيذ المرافقة.

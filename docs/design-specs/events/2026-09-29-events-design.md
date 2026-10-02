# Spec — الفعاليات العامة (Public Events) — المشروع الفرعي 3 من 4

- **التاريخ:** 2026-09-29
- **الحالة:** مسودة جاهزة لـ writing-plans (لم يعتمدها المالك بعد). فيها 24 بندًا `UNKNOWN / REQUIRES DECISION` (§17)؛ ستة منها حاجزة لأجزاء محددة من الخطة ومعلَّمة بذلك.
- **النطاق:** `api/` (collection جديدة `publicEvents` + صلاحياتها + `nextEventId` + الفهارس + مصدر بحث)، `apps/dashboard` (قائمة الفعاليات، نموذج الفعالية، إعداد سكشن الرئيسية، اختيار فعالية شريط الهيرو)، `apps/web` (`/events` بعرضَي الكروت والتقويم، `/events/[slug]`، سكشن الرئيسية، شريط الهيرو، بطاقة لوحة الهيدر، البحث، فعاليات الموسم في صفحة الموسم).
- **الترتيب في السلسلة:** 1 الهيدر ← 2 المواسم ← **3 الفعاليات العامة** ← 4 ألعاب القوى. يعتمد على المشروع 2: كل فعالية تنتمي لموسم (`seasonId`، §3)، والتقويم يرسم مراحل الموسم ومواعيده المهمة (§6.3). المشروع 2 **يُبنى الآن بالتوازي** بثلاثة وكلاء؛ كل ما يمسّ ملفاته معلَّم «تنسيق» في §16 وفي الخطة.
- **المرجع البصري:** `docs/design-specs/events/README.md` (الفهرس والمرجع لما يعرضه كل تصميم)، و`png/` (11 صورة)، و`html/*.dc.html` (11 تركيبة، مصدر كل قياس في هذا الملف — قُرئت نصًّا لا بالعين). الصور مرجع للشكل فقط؛ القيم (hex, px) تُترجم إلى توكنات، ولا hex ولا px حر في الكود. عند الاختلاف، الـspec هو الصحيح.
- **الأزرق ليس هوية.** كل درجة أزرق في التصاميم (هيرو «ملتقى مدربي ألعاب القوى» في `EventDetail.dc.html:4` بتدرّج `#061527→#1D4F86`، بنر سكشن الرئيسية `HomeSection.dc.html:12` بخلفية `#061527`، شريط الهيرو `HomeHeroBar.dc.html:2`، ومجموعة «مؤتمرات ومعرفة» `#1D5FA8`) اختيار رسم للتمييز بين اللوحات فقط. الهوية أخضر وأسود وأحمر، والتنفيذ يستعمل surfaces موجودة: `section-black` (`apps/web/src/components/ui/section.tsx:53`) للهيرو المظلم، و`section-green` حيث التصميم نفسه أخضر. هذا تطبيق لسابقة مقرَّرة لا اختيار جديد: قرار السجل #7 («بطاقتا ألعاب القوى والفعاليات `section-black` … الأزرق اختيار رسم لا لون هوية») وتعليق `EventFallbackCard` في `apps/web/src/components/layout/cards/index.tsx:43-48`.
- **Figma:** لا تعديل (CLAUDE.md §18 و§1a.4). كل حالة بصرية جديدة بلا إطار Figma معلَّمة `PENDING FIGMA BACK-SYNC` في §15.
- **الفعاليات والمواسم مفهومان مختلفان.** الموسم يحتوي فعاليات؛ لا أحدهما الآخر. والفعاليات والبطولات مفهومان مختلفان كذلك (CLAUDE.md §11، وملاحظة FigJam `289:4554`: «Public events (conferences, celebrations, ceremonies) — distinct from championshipEvents (Domain 3)»). كل موضع في التصاميم يقترب من دمجهما مرفوع كتعارض في §14، ولا يُحلّ هنا.

---

## 1. المشكلة ولماذا نبنيها الآن

لا توجد اليوم أي collection للفعاليات العامة. لكن الكود **يحجز لها مكانًا في سبعة مواضع** (تحقّق مباشر):

| الموضع | الملف | ما يوجد |
|---|---|---|
| قائمتا الـworkflow | `api/src/common/constants/workflow-entity-types.ts:34` | `'publicEvents'` عضو فعلًا في `WORKFLOW_ENTITY_TYPES` و`PUBLICATION_ENTITY_TYPES` |
| محتوى الكيان | `api/src/common/constants/entity-content.ts:51,173` | صفّان فارغان `publicEvents: []` في `PUBLISH_REQUIREMENTS` و`REVISION_READ_FIELDS` |
| الألبومات | `api/src/modules/media-center/albums/schemas/album.schema.ts:113,209` | `publicEventId` (بلا `ref`) + فهرس، وفلتر عام `?publicEvent=` (`albums.public-filter.ts:92-93`) |
| الفيديوهات | `api/src/modules/media-center/videos/videos.public-filter.ts:38` | `associations` بنوع مالك `publicEvents` وفلتر `?association=publicEvents:<id>` |
| سكاشن الصفحات | `api/src/modules/cms-page-composition/page-sections/schemas/page-sections.schema.ts:61` | `publicEvents` في `PAGE_SECTION_ITEM_TARGETS` |
| الهيدر | `apps/web/src/lib/header/features.ts:15,131` | `nextEvent: {title, href, startsAt} \| null`، يُعاد `null` صراحة |
| شريط الهيرو | `api/src/modules/cms-page-composition/page-sections/hero-settings.ts:8-10` | «There is no events entity … so the bar carries no link» |

و`/events` صفحة `PREPARING_PAGES` (`apps/web/src/lib/pages/public-pages.ts:379-385`) بجسم `PreparingPageScreen` (`apps/web/src/app/[locale]/events/page.tsx`)، والهيدر يربط فعلًا `/events` و`/events?view=calendar` (`apps/web/src/lib/navigation.ts:139-140`).

**النتيجة المهمة:** ربط الألبوم والفيديو بالفعالية **موجود كاملًا** في الكود — التصميم يقول «الألبوم أو الفيديو هو اللي بيشاور على الفعالية» (`DashEventForm.dc.html:279`)، وهذا بالضبط ما يفعله `publicEventId` و`associations`. فصفحة الفعالية المنتهية (الصور والفيديو) لا تحتاج **أي** تعديل على schema الألبوم أو الفيديو.

## 2. النتائج المطلوبة (Definition of Done)

1. Collection `publicEvents` بالحقول والفهارس في §3، بلا تعديل أو حذف أي حقل في أي schema قائم، وبلا migration.
2. النشر عبر `PublishingService` من اليوم الأول: `submit` و`publish` و`publish-approved` و`editorial-state` — لا باب نشر مباشر خاص بالفعاليات (§4.2).
3. `publicEvents` في `PERMISSION_RESOURCES` و`CAPABILITY_MAP` و`RESOURCE_TO_DOMAIN` و`SCANNED_COLLECTIONS`، وصفّاها في `entity-content.ts` مملوءان (§11).
4. `/events` (كروت + تقويم عبر `?view=calendar`)، و`/events/[slug]` (قادمة/جارية/منتهية)، مبنية وفق §6؛ `/events` تنتقل من `PREPARING_PAGES` إلى `PUBLIC_PAGES`.
5. سكشن فعاليات الرئيسية بقاعدة الاختيار «مميزة ← جارية ← أقرب قادمة» (§7) — **مشروط بالقرار D-13**.
6. شريط الهيرو يقبل `nextEventId` ويربط بصفحة الفعالية، والوضع اليدوي الحالي (ADR-0081 D4) يبقى احتياطيًا (§8).
7. بطاقة لوحة «الفعاليات والمواسم» في الهيدر تُملأ من الفعالية القادمة (§8.3).
8. الداشبورد: قائمة الفعاليات، النموذج بأقسامه الثمانية، إعداد السكشن، ومجموعة السايد بار «الفعاليات والمواسم» (قرار السجل #57) (§9).
9. الفعاليات مصدر بحث سابع (§12).
10. صفحة الموسم تعرض فعالياتها بدل الحالة الفارغة التي بناها المشروع 2 (§10).
11. كل الاختبارات في §13 خضراء؛ ولا شيء مما في §14–§17 مُنفَّذ بلا قرار.

## 3. نموذج البيانات: collection `publicEvents`

**المكان:** `api/src/modules/public-communication/public-events/` — مجموعة `public-communication`. السبب: جدول FigJam `289:4555` يقع داخل «DOMAIN 4 — Content» في الـPhysical Model (`77:5543`؛ عنوان الدومين عند y=12990، والجدول عند y=14020، والدومين التالي عند y=15890)، و`articles` — الكيان الآخر من الدومين نفسه — مبني في `modules/public-communication/articles` ومجموعته في `CAPABILITY_MAP` هي `'public-communication'` (`capability-map.ts:113-114`). اسم الـcollection **يجب** أن يكون `publicEvents` حرفيًا: `PublishingService.modelFor` يبحث عن النموذج باسم الـcollection (`publishing.service.ts:887-896`، «each entity type is also its collection's name»).

**النمط العام:** `BaseSchema` (createdBy/updatedBy/archivedAt/archivedBy) + `timestamps: true` صريحة على الـ`@Schema` (الخيار لا يُورَّث) + `LocalizedTextSchema` لكل نص ثنائي اللغة + `MongooseSchema.Types.ObjectId` لكل مرجع (ADR-0123).

### 3.1 الحقول

`?` في عمود القيمة الفارغة = يقبل `null`. «FigJam» = الحقل موجود في `289:4555` باسمه أو باسم معدَّل.

| الحقل | النوع | فارغ؟ | افتراضي | ملاحظات |
|---|---|---|---|---|
| `title` | `LocalizedText` | لا | — | FigJam `title`. العنوان (`DashEventForm.dc.html:38-42`) |
| `slug` | `string` | لا | — | FigJam `slug` (unique). يُقترح من `title.en` (`DashEventForm.dc.html:48` «يتولّد من العنوان الإنجليزي، ولازم يكون فريد»). غير قابل للتعديل بعد الإنشاء — نفس قاعدة `UpdateSeasonDto` (`update-season.dto.ts:10,22`) |
| `summary` | `LocalizedText` | لا | — | **ليس في FigJam.** «يظهر في الكروت والهيرو ونتائج البحث · 128 / 200» (`DashEventForm.dc.html:64`) → حد 200 حرف لكل لغة |
| `description` | `LocalizedRichText` | نعم | `null` | FigJam `description`. «نبذة الفعالية» بمحرر B/I/H/قائمة/رابط (`DashEventForm.dc.html:70-81`) = نفس `LocalizedRichTextSchema` و`rich-text-allowlist` المستعملين في `article.schema.ts:173` |
| `coverImageId` | `ObjectId → MediaAsset` | نعم | `null` | FigJam `coverImage` (أُضيفت لاحقة `Id` اتباعًا لاصطلاح كل مرجع في الكود: `coverImageId` في الألبوم) |
| `eventType` | enum (§3.2) | لا | — | FigJam `eventType` لكن **بقيم مختلفة** — تعارض D-1 |
| `seasonId` | `ObjectId → Season` | لا | — | FigJam `seasonId` («every public event belongs to a season»). يُقترح في النموذج من يوم البداية ويبقى قابلًا للتغيير (`DashEventForm.dc.html:127` «مثلًا معسكر تحضيري للموسم الجاي») — **فلا تحقق** أن التاريخ داخل الموسم |
| `championshipId` | `ObjectId` بلا `ref` | نعم | `null` | FigJam `championshipId`. لا collection للبطولات؛ نمط الـpoly-ref القائم (`album.schema.ts:101-103`). **لا يقبله أي DTO** حتى يُبنى نظام البطولات — القرار D-6 |
| `championshipRelation` | enum `preparation\|announcement\|sideline\|honouring` | نعم | `null` | **ليس في FigJam.** الأزرار المعطّلة «تحضير لها / إعلان عنها / على هامشها / تكريم بعدها» (`DashEventForm.dc.html:134-137`). نفس حكم `championshipId` — D-6 |
| `startDate` | `Date` | لا | — | FigJam `startDate`. §3.4 |
| `endDate` | `Date` | لا | — | FigJam `endDate` **optional**؛ هنا مطلوب — فعالية اليوم الواحد يساوي يوم نهايتها يوم بدايتها. تعارض مُبلَّغ (M-5) |
| `isAllDay` | `boolean` | لا | `false` | «طوال اليوم (بدون وقت محدد)» (`DashEventForm.dc.html:102`) |
| `status` | enum `Scheduled\|Postponed\|Cancelled` | لا | `'Scheduled'` | اسم FigJam لكن **بمعنى مختلف** — D-2. «الجدولة: في موعدها / مؤجلة / ملغاة» (`DashEventForm.dc.html:221-224`) |
| `statusNote` | `LocalizedText` | نعم | `null` | «ملاحظة للجمهور» تظهر عند التأجيل أو الإلغاء (`DashEventForm.dc.html:227-231`) |
| `attendanceMode` | enum `InPerson\|Online\|Hybrid` | لا | `'InPerson'` | «حضوري / أونلاين / حضوري + أونلاين» (`DashEventForm.dc.html:107-109`) |
| `venueId` | `ObjectId → Venue` | نعم | `null` | FigJam `venueId`. §3.5 |
| `place` | `LocalizedText` | نعم | `null` | **ليس في FigJam.** المدينة/المكان كما يُعرض («[اسم القاعة]، دبي»، «أونلاين»). §3.5 |
| `onlineUrl` | `string` (https) | نعم | `null` | «رابط الحضور أونلاين … يظهر للزوار بعد بداية الفعالية بس» (`DashEventForm.dc.html:116-118`) — **لا يُرسَل في أي استجابة عامة قبل لحظة البداية** (§5.4) |
| `registration` | subdoc | لا | `{required:false,url:null,deadline:null}` | `{ required: boolean, url: string\|null (https), deadline: Date\|null }` — القسم 7 (`DashEventForm.dc.html:207-216`). §3.6 |
| `audience` | `LocalizedText` | نعم | `null` | «الجمهور المستهدف» (`EventDetail.dc.html:68`) |
| `organizerUnit` | `LocalizedText` | نعم | `null` | «الجهة المنظمة» — القرار D-9 |
| `programme` | `ProgrammeSession[]` (`_id:false`) | لا | `[]` | §3.7 |
| `guests` | `EventGuest[]` (`_id:false`) | لا | `[]` | §3.8 |
| `documentIds` | `ObjectId[] → Document` | لا | `[]` | نفس نمط `Season.documentIds` (`season.schema.ts` حقل `documentIds`). **خدمتها للجمهور غير ممكنة ضمن النطاق** — القرار D-7 |
| `isFeatured` | `boolean` | لا | `false` | حامل واحد على الأكثر. «فعالية مميزة أختارها» لبنر سكشن الرئيسية — القرار D-12 |
| `isVisible` | `boolean` | لا | `false` | سجل جديد مخفي، كالموسم |
| `visibleFrom` | `Date` | نعم | `null` | «مجدولة من تاريخ ووقت» (`DashEventForm.dc.html:255-256`). §4.3 |
| `publicationState` | enum `PUBLICATION_STATES` | لا | `'Draft'` | FigJam: `Draft \| Live \| Unpublished \| Archived` (denorm ← publications). **`'Live'` لا `'Published'`** — انظر M-2 |
| `publishDate` | `Date` | نعم | `null` | يكتبه `PublishingService.markLive` من تاريخ الـpublication لأنه يكتشف المسار `publishDate` تلقائيًا (`publishing.service.ts:303-307`). يُستعمل لـ`lastModified` في الـsitemap |
| `seo` | `PageSeo` | لا | `{}` | إعادة استعمال `api/src/common/schemas/page-seo.schema.ts`، كالموسم |

الحقول المحسوبة (**لا تُخزَّن أبدًا**): `group` (من `eventType`، §3.2)، `timing` (§5.1)، `dayIndex/dayCount` (§5.2)، `registrationOpen` (§3.6)، ظهور `onlineUrl` (§5.4). و`status` بمعناه في FigJam (Upcoming/Ongoing/Completed) محسوب هنا تحت اسم `timing` — تفصيله في D-2.

### 3.2 أنواع الفعاليات ومجموعاتها

التصاميم تعرض ست مجموعات، والنوع يحدد المجموعة («المجموعة: مؤتمرات ومعرفة — تتحدد تلقائيًا من النوع»، `DashEventForm.dc.html:53`). **القائمة الكاملة للأنواع غير موجودة في أي تصميم** — القائمة المنسدلة تعرض مجموعتين فقط (`DashEventForm.dc.html:52`)، والباقي مستنتج من بيانات العيّنة في `Events.dc.html` و`EventsMobile.dc.html`:

| المجموعة (id التصميم) | الأنواع كما ظهرت في العيّنات |
|---|---|
| مؤسسية (`inst`) | مؤتمر صحفي · اجتماع الجمعية العمومية |
| مؤتمرات ومعرفة (`conf`) | مؤتمر · ندوة · ملتقى أو منتدى · محاضرة أو جلسة حوارية |
| تأهيل وتطوير (`dev`) | دورة حكام · ورشة عمل |
| إعداد فني (`prep`) | معسكر تدريبي · يوم انتقاء واكتشاف مواهب |
| احتفاليات (`cel`) | حفل تكريم · استقبال بعثة أو منتخب |
| مجتمعية (`com`) | فعالية جري للجمهور · يوم رياضي |

وFigJam `289:4555` يحدد `eventType: Conference | Celebration | Ceremony | Other` — أربع قيم. **هذا تعارض بين مصدرين، يُرفع ولا يُحلّ: D-1.** الخطة تكتب القائمة كثابت واحد `PUBLIC_EVENT_TYPES` + خريطة `EVENT_TYPE_GROUP` في ملف واحد، فيكون قرار المالك تعديل سطرين لا إعادة بناء.

### 3.3 القواعد

- `title` و`summary` مطلوبان باللغتين في الـschema (`LocalizedText` يشترط `en` و`ar`، `localized-text.schema.ts:10-14`). المسودة التي ينقصها الإنجليزي («مطلوب قبل الإرسال للموافقة (اللغتين كاملتين)»، `DashEventForm.dc.html:67`) تُحفظ بعلامة `PENDING_CONTENT_MARKER` (`[[pending-content]]`، `api/src/modules/workflow/publishing/pending-content.ts`) في اللغة الناقصة، و`findPendingContent` يمنع الإرسال والنشر تلقائيًا. **لا تُعدَّل** `publish-blockers.ts`: `PUBLISH_REQUIREMENTS` يقرأ الحقول العليا فقط (`record[field]`، `publish-blockers.ts:55-57`) فلا يستطيع التعبير عن `summary.en`. استعمال العلامة لنقص تحريري لا «محتوى لم يورّده العميل» توسيع لمعناها — D-19.
- `endDate` يقع في يوم `startDate` أو بعده (مقارنة أيام دبي عبر `dubaiDayRange`)؛ وإن كانت الفعالية في يوم واحد وليست `isAllDay` فوقت النهاية بعد وقت البداية.
- `registration.required === true` ⇒ `url` و`deadline` مطلوبان، و`deadline` قبل `startDate` («لازم يكون قبل بداية الفعالية»، `DashEventForm.dc.html:216`).
- `attendanceMode === 'InPerson'` ⇒ `onlineUrl` يُمسَح (null) عند الحفظ.
- `status === 'Scheduled'` ⇒ `statusNote` يُمسَح.
- `isFeatured`: حامل واحد، بفهرس جزئي فريد + تفريغ الحامل السابق في معاملة واحدة — نفس دفاع `isCurrent` المزدوج في `SeasonsRepository.setCurrent` (`seasons.repository.ts:103`).
- **لا حذف لو مرتبط.** فعالية يشير إليها ألبوم حي (`publicEventId`) أو فيديو حي (`associations` بنوع `publicEvents`) أو شريط الهيرو (`nextEventId`) → `409 stillReferenced` بأسماء المراجع، والداشبورد يقترح الإخفاء. نفس شكل `SeasonsService.remove`/`referrersOf` (`seasons.service.ts:268-296`).
- أكواد الأخطاء الجديدة تدخل المفردات الثلاث معًا (`API_ERROR_CODES` في `api/src/common/errors/api-error-code.ts`، ومجموعة `admin-write` + `FROM_API_CODE`، وكتالوجا الرسائل) وإلا انهارت إلى `conflict` بلا أي اختبار يفشل. المقترح: `eventEndsBeforeStart`، `registrationAfterStart`، `registrationIncomplete`.

### 3.4 التواريخ والأوقات

**القاعدة المقرَّرة:** أيام الفعالية أيام تقويمية **شاملة** بتوقيت `Asia/Dubai`، والنطاق الداخلي نصف مفتوح `[بداية يوم البداية، بداية اليوم التالي ليوم النهاية)`. التخزين UTC، والإدخال والعرض بتوقيت دبي، والأرقام لاتينية.

**الدالة المساعدة موجودة، وتُستعمل كما هي — لا نسخة ثانية في الـAPI:** `api/src/common/utils/dubai-day-range.util.ts`، وصادراتها: `PLATFORM_TIME_ZONE`، `DayRange`، `dubaiDayStart(at)`، `dubaiNextDayStart(at)`، `dubaiDayRange(firstDay, lastDay)`، `isWithinDayRange(at, range)`، `dayRangesOverlap(a, b)`، `dayRangeContains(outer, inner)`. تعليقها نفسه يسمّي الفعاليات («a season's first and last day, a phase's, an event's»)، ويقرأ الإزاحة من المنطقة الزمنية عبر `Intl` لا من رقم ثابت (قرار السجل #58).

- **ما يُخزَّن:** `startDate` لحظة بداية الفعالية؛ `endDate` لحظة نهايتها. عند `isAllDay` تُخزَّن منتصف ليل دبي للّيومين (الاصطلاح الذي يرسله الداشبورد للمواسم، `apps/dashboard/src/lib/admin/seasons/season-dates.ts:6-9`). وفي غير ذلك تحمل وقت اليوم. `dubaiDayRange` يقرأ اليومين «whatever time of day they carry»، فالنطاق واحد في الحالتين.
- **الساعات المعروضة** («09:00 – 16:00 بتوقيت الإمارات»، `EventDetail.dc.html:41-42`) هي وقت `startDate` ووقت `endDate` بتوقيت دبي، وتُقرأ ساعاتٍ يومية للفعالية متعددة الأيام. تُخفى عند `isAllDay`.
- **الويب والداشبورد لا يستطيعان استيراد ملف من `api/`** (جذر الـAPI المترجَم هو `src`، والسابقة `sponsorship-window.util.ts:1-8` تكرر القاعدة لهذا السبب). الخطة تضيف `packages/content/events/` (تصدير `@uaeaf/content/events`) يحمل حساب التوقيت والعدّاد وشبكة التقويم، مبنيًا على نفس خوارزمية `dubai-day-range.util.ts` (قراءة المنطقة عبر `Intl`)، مع اختبار تكافؤ بمتجهات مشتركة يفشل يوم يختلف الاثنان. ملاحظة: الداشبورد يحمل اليوم نسخة ثالثة خاصة بالمواسم (`season-dates.ts`)، مخالفة لنص القرار #58 («دالة مساعدة **واحدة**»). لا تُمسّ هنا — M-21.
- **لا يُعاد استعمال** `presetRange` من `@uaeaf/content/time-range` لفلتر «هذا الشهر / الشهر القادم»: حدوده UTC (`packages/content/time-range/range.spec.ts:12-15`)، وحدود الفعاليات أيام دبي.

### 3.5 المكان

`Venue` (`api/src/modules/people-organizations/venues/schemas/venue.schema.ts:15-31`) يحمل `name`، `countryId`، `ownerClubId`، `latitude`، `longitude` — **لا مدينة، ولا مسار عام** (كل `GET` خلف `venues:Read`، `venues.controller.ts:23-33`). لذلك:

- `venueId` يُختار من قائمة الأماكن في النموذج («من قائمة الأماكن (venues) عشان الخريطة والعنوان يتجابوا تلقائيًا»، `DashEventForm.dc.html:114`). والاستجابة العامة تحمل `venue: { name, latitude, longitude } | null` يقرؤها `PublicEventsService` من الخادم — القارئ العام لا يحتاج `venues:Read`.
- `place` نص المكان/المدينة الظاهر. «مكان آخر (مدينة + موقع على الخريطة)…» (`DashEventForm.dc.html:113`) = `venueId: null` + `place` فقط. **إنشاء `Venue` جديد من نموذج الفعالية خارج النطاق** (كتابة على collection أخرى) — D-10.
- «عرض على الخريطة» (`EventDetail.dc.html:44`) رابط يُبنى من `latitude`/`longitude` فقط، ويُخفى بدونهما. أي خدمة خرائط هي وجهته قرار (D-10)؛ لا تضمين خريطة ولا مكتبة.
- محرر الفعالية يحتاج `venues:Read` ليملأ القائمة. قالب «مسؤول المحتوى» لا يحمله اليوم (`api/src/common/authz/role-templates.ts:44-58`) — داخل D-16.

### 3.6 التسجيل

`registrationOpen = registration.required && url != null && now < deadline`. زر «سجّل الآن» وبطاقة التسجيل السوداء (`EventDetail.dc.html:65-71`) وشريط الموبايل السفلي (`EventDetailMobile.dc.html`، الكتلة الثابتة أسفل الصفحة) تُرسم فقط عند `registrationOpen` («الزر يختفي تلقائيًا بعد آخر موعد للتسجيل»، `EventDetail.dc.html:71`). الرابط خارجي: `target="_blank"` و`rel="noopener noreferrer"` ونص مرئي «يفتح في صفحة خارجية». الموعد يُحسب في الخادم عند كل طلب، والصفحة مخزَّنة 60 ثانية (`PUBLIC_REVALIDATE_SECONDS`، `apps/web/src/lib/api/public-client.ts:37`) — أقصى تأخر لاختفاء الزر دقيقة، مقبول ومذكور.

### 3.7 البرنامج (`programme[]`)

| الحقل | النوع | ملاحظات |
|---|---|---|
| `dayIndex` | `number` ≥ 0 | اليوم داخل الفعالية (0 = اليوم الأول). **فهرس لا تاريخ** — تأجيل فعالية أسبوعًا يُبقي برنامجها مرتبطًا بأيامه. يُرفض ≥ `dayCount` عند الحفظ |
| `from` | `string` `HH:mm` | أرقام لاتينية، 24 ساعة |
| `to` | `string` `HH:mm` \| null | |
| `title` | `LocalizedText` | |
| `kind` | enum `talk\|workshop\|panel\|break\|ceremony` | «جلسة / ورشة عملية / حلقة نقاش / استراحة / افتتاح وختام» (`EventDetail.dc.html` السكربت، الثابت `K`) |
| `speakers` | `LocalizedText` \| null | نص حر («[اسم المتحدث] — رئيس اللجنة الفنية»، «بمشاركة مدربي الأندية»). الرقاقة في النموذج (`DashEventForm.dc.html:161-163`) توحي بربط بالضيوف؛ لا تصميم يحدد ذلك — داخل D-8 |

الترتيب داخل اليوم = ترتيب المصفوفة (مقبض السحب «اسحب لإعادة الترتيب»، `DashEventForm.dc.html:156`). «الأيام بتتولد من تواريخ الفعالية» (`DashEventForm.dc.html:142`) = تبويبات النموذج تُحسب من `dayCount`.

### 3.8 الضيوف (`guests[]`)

`{ name: LocalizedText, role: LocalizedText, personType: 'athletes'|'coaches'|'officials'|'federationPersonnel'|null, personId: ObjectId|null, photoId: ObjectId→MediaAsset|null }`.

مصدران في التصميم: «اختيار من سجل الأشخاص» و«إضافة اسم وصفة فقط» (`DashEventForm.dc.html:179-180`). **لا يوجد «سجل أشخاص» واحد في الكود** — `athletes` و`coaches` و`officials` و`federation-personnel` مجموعات منفصلة (`api/src/modules/people-organizations/*`، `federation-governance/federation-personnel`). ورابط «الملف الشخصي» (`EventDetail.dc.html:95`) له وجهة عامة لنوع واحد فقط اليوم: `/athletes#slug` (قرار السجل #19). أيّ السجلات يُختار منها، وأين يذهب الرابط لكل نوع: D-8. حتى القرار، `personType/personId` يُخزَّنان ولا يُرسم رابط إلا للرياضيين.

### 3.9 الفهارس

```
{ slug: 1 } unique, partialFilterExpression: { archivedAt: null }      // نمط الألبوم والموسم
{ isFeatured: 1 } unique, partialFilterExpression: { isFeatured: true } // نمط isCurrent
{ publicationState: 1, isVisible: 1, startDate: 1 }                    // القوائم العامة والسكشن
{ startDate: 1, endDate: 1 }                                           // نطاقات الأيام (الشهر، "الآن")
{ seasonId: 1, startDate: 1 }                                          // فلتر الموسم وفعاليات الموسم
{ venueId: 1 }                                                         // فحص يتامى حذف المكان (09-Audit §284)
{ 'title.ar': 'text', 'title.en': 'text' },
  { default_language: 'none', name: 'search_text' }                    // البحث — نفس club.schema.ts:100
```

استعلام «يشارك يومًا مع نطاق» يبقى على الحقلين المفهرسين بنفس حجة `SeasonsRepository.findOverlapping` (`seasons.repository.ts:62-77`): `startDate < range.to && endDate >= range.from`، لأن طرفي `range` حدود أيام.

## 4. الحالات

### 4.1 ثلاثة محاور مستقلة

| المحور | الحقل | من يغيّره | القيم |
|---|---|---|---|
| النشر | `publicationState` | `PublishingService` وحده | `Draft → Live` (+ `Unpublished`/`Archived` في المفردات، بلا مسار في v1) |
| الجدولة | `status` | المحرر | `Scheduled` · `Postponed` · `Cancelled` |
| الظهور | `isVisible` + `visibleFrom` | صاحب `Publish` (D-14) | مخفية · تظهر فور الاعتماد · مجدولة |

والتوقيت (`timing`) رابع **محسوب** من التاريخ والجدولة (§5.1). هذا يطابق قاعدة FigJam في `289:4555` حرفيًا («FIELD PRECEDENCE RULE (2026-09-01 decision): this field is descriptive/informational ONLY — it has NO effect on public visibility and is never auto-synced with publicationState or archivedAt»)، ويجيب على سؤال `docs/product/08-Workflow-Scenario-Review.md` §3.13 Scenario 5 (المحاور مستقلة، ولا انتقال آلي بينها).

### 4.2 النشر

قاعدة المالك (قرار السجل #44، وتنفيذها #45): سياسة موافقة مفعّلة ← مسار الموافقات؛ لا سياسة ← ينشر حامل `Publish` وحده ويحفظ الباقون مسودات؛ لا صلاحية ← 403. هذا ما يفعله الكود فعلًا: `publishDirect` يؤكد `Publish` أولًا (`publishing.service.ts:104`)، ويرفض `workflowRequired` حين تشترط السياسة موافقة (`:108-113`)، ويسمح بـ`noPolicy` (`:115-126`).

**الفعاليات تتبع هذا من اليوم الأول — لا باب نشر خاص بها.** المسارات:

| الطريقة | المسار | الحارس | المنفِّذ |
|---|---|---|---|
| `POST` | `/public-events/:id/submit` | `publicEvents:Update` | `PublishingService.submit` |
| `PATCH` | `/public-events/:id/publish` | `publicEvents:Publish` | `PublishingService.publishDirect` (جسم `{expectedUpdatedAt}`) |
| `POST` | `/public-events/:id/publish-approved` | `publicEvents:Publish` | `PublishingService.publishApproved` |
| `GET` | `/public-events/:id/editorial-state` | `publicEvents:Read` | لوحة «الظهور والنشر» |

`publish-approved` **ليس اختياريًا**: المواسم أضافت `submit` ولا تملك `publish-approved` (`seasons.controller.ts` — المسارات 28-141 كلها، لا يوجد)، فالموسم الذي تشترط سياسته موافقة **يُعتمد ولا يُنشر أبدًا** — M-3. النمط الصحيح هو `articles.controller.ts:152-198` (submit + publish + publish-approved).

الداشبورد يختار الزر من `GET /workflow-policies/publicEvents/Edit` بنفس `publishModeOf` الذي بنته المواسم (`apps/dashboard/src/lib/admin/seasons/publish-mode.ts`): «إرسال للموافقة» (`DashEventForm.dc.html:29`) أو «نشر». الـAPI هو الحَكَم في الحالتين.

`PUBLISH_REQUIREMENTS.publicEvents = ['coverImageId']`؟ — **لا.** التصميم يرسم فعاليات بلا صورة غلاف (خلفية بديلة)، فلا دليل على أن الصورة شرط. يبقى `[]`. `REVISION_READ_FIELDS.publicEvents` = كل حقول المحتوى في §3.1 عدا `publicationState` و`publishDate` و`isFeatured` و`isVisible` و`visibleFrom` (تصف أين تقف الفعالية الآن، بنفس حجة `articles` في `entity-content.ts:70-73`).

### 4.3 الظهور

**قاعدة واحدة، في مكان واحد (`PublicEventsRepository.PUBLIC_FILTER(now)`):**

```
publicationState === 'Live'  &&  isVisible === true  &&  (visibleFrom === null || visibleFrom <= now)  &&  archivedAt === null
```

«تظهر لو: معتمدة + ظاهرة + جه وقتها» (`DashEventForm.dc.html:268`). و«معاد الظهور عدّى، والفعالية هتظهر على الموقع أول ما تتعتمد» (`:258`) نتيجة مباشرة لهذه القاعدة، لا منطق إضافي. تُطبَّق على كل مسار عام، وعلى البحث (§12)، والسكشن، والهيدر، وشريط الهيرو، والـsitemap.

### 4.4 الجدولة

- **مؤجلة بلا موعد جديد:** شارة «مؤجلة»، التاريخ الأصلي مشطوب («كان مقررًا 5 نوفمبر 2026»، `Events.dc.html` السكربت)، **بلا عدّاد**، وملاحظة `statusNote` في صندوق. تبقى في تبويب «قادمة» مهما مرّ تاريخها الأصلي، ولا تدخل البنر ولا شريط الهيرو ولا الهيدر. عند تحديد موعد جديد يُعدِّل المحرر التاريخين ويعيد `status` إلى `Scheduled` (لا حقل «التاريخ الأصلي» — التصميم لا يعرض الأصلي بعد إعادة الجدولة).
- **ملغاة:** «تفضل في تاريخها بشارة «ملغاة» ومابتدخلش البنر ولا شريط الهيرو» (`DashEventForm.dc.html:232`). في التبويب الذي يحدده تاريخها (قادمة أو سابقة)، بلا عدّاد. استبعادها من **كروت** السكشن غير منصوص — D-13.

## 5. التوقيت، اليوم X من N، والعدّاد

### 5.1 `timing` (محسوب)

بـ`range = dubaiDayRange(startDate, endDate)`:

| `timing` | الشرط |
|---|---|
| `upcoming` | `status === 'Postponed'`، أو `now < range.from` |
| `running` | `status !== 'Postponed'` و`isWithinDayRange(now, range)` |
| `past` | `status !== 'Postponed'` و`now >= range.to` |

**نتيجة يجب أن يراها المالك:** لأن الأيام أيام تقويمية، فالمؤتمر الصحفي في 5 أكتوبر 11:00 «جارٍ الآن» منذ منتصف ليل 5 أكتوبر، لا منذ 11:00. شريط الهيرو اليدوي الحالي يعمل باللحظة لا باليوم (`packages/content/hero/event-bar.ts:48-50`: `at >= starts` ⇒ live). الفرق مقصود بحكم القاعدة المقرَّرة، ومذكور لأن الموضعين سيعيشان جنبًا إلى جنب — D-3.

### 5.2 اليوم X من N

`dayCount` = عدد أيام دبي في `range`. أثناء `running`: `dayIndex = عدد الأيام بين dubaiDayStart(startDate) وdubaiDayStart(now)`، ويُعرض «اليوم {dayIndex+1} من {dayCount}» (`Events.dc.html:66`، `HomeSection.dc.html:37`، «المدة: يومان · تظهر في الموقع «اليوم 1 من 2» أثناءها»، `DashEventForm.dc.html:103`). شريط التقدم: `role="progressbar"` بـ`aria-valuemin=1` و`aria-valuemax=dayCount` و`aria-valuenow=dayIndex+1` كما في `Events.dc.html:68`، و«تنتهي {اسم اليوم} {التاريخ}» من يوم `endDate` في دبي. لا يُرسم لفعالية يوم واحد (N=1 لا تقدّم فيه) — **قرار صغير مسجَّل هنا لأن التصميم لا يرسم يومًا واحدًا جاريًا**.

### 5.3 العدّاد

- **يظهر فقط** عند `timing === 'upcoming'` و`status === 'Scheduled'`. الهدف: `startDate` (لحظة البداية؛ ومنتصف ليل يوم البداية عند `isAllDay`).
- الوحدات: أيام · ساعات · دقائق — لا ثوانٍ. يُرسم من الخادم أولًا ويُعاد حسابه في المتصفح عند كل حد دقيقة. هذا بالضبط سلوك `Countdown` المشترك (`apps/web/src/components/shared/countdown.tsx`، قاعدة المكوّنات المشتركة 2026-09-22) — **لكن** `Countdown` مربوط بشكل `NextEventLike` ويخفي نفسه عند نقص `label`/`name`/`venue` في أي لغة (`event-bar.ts:43-44`). الخطة تعمّمه ليأخذ دالة حالة بدل `NextEventLike` مباشرة، ويبقى استدعاء شريط الهيرو اليدوي كما هو (§8.1).
- **إمكانية الوصول:** `role="timer"`، `aria-live="off"`، واسم وصول واحد كامل («يبدأ خلال 25 يومًا و14 ساعة و32 دقيقة»، `EventDetail.dc.html:24`) — نفس ما يفعله `Countdown` اليوم.
- **ثلاثة أشكال مرسومة:** صناديق كبيرة (هيرو الفعالية `EventDetail.dc.html:25-33`، والبنر `HomeSection.dc.html:26-34`، وشريط الهيرو `HomeHeroBar.dc.html:13-21`)، شبكة 3 أعمدة على الموبايل (`EventDetailMobile.dc.html`)، وكبسولة مضغوطة «06 يوم : 14 س : 32 د» على الكرت (`HomeSection.dc.html:54-59`). أحجام أرقامها (36/38/26/28/16px) ليست على سلم الطباعة (Chapter 4 §4 السطور 95-108) — نفس فجوة PB-GAP المفتوحة (CLAUDE.md §7): **DESIGN SYSTEM GAP** لدور «عرض رقمي». لا يُختار أقرب رقم؛ القرار D-18.
- **النص النسبي** على الكروت («بعد 6 أيام»، «بعد 13 يومًا») عدد أيام دبي حتى يوم البداية، بصيغ الجمع العربية عبر ICU في next-intl — لا تجميع نصوص يدوي.

### 5.4 رابط الحضور أونلاين

`onlineUrl` يُضمَّن في الاستجابة العامة فقط حين `now >= startDate` و`timing === 'running'`. قبل ذلك وبعده: الحقل غائب من الاستجابة (لا `null` يكشف وجوده). يُفرض في المُسلسِل العام في الخادم، لا في الواجهة.

## 6. سطح الموقع العام

| المسار | اليوم | بعد المشروع | السجلّ (register) |
|---|---|---|---|
| `/events` | `PREPARING_PAGES` | `PUBLIC_PAGES`، `listEndpoint: '/public-events/public'` | هيرو أخضر، أرضية محايدة — §6.1 |
| `/events?view=calendar` | نفس الصفحة | نفس الصفحة (نفس `page.tsx`)، عرض ثانٍ | نفسه |
| `/events/[slug]` | غير موجود | صفحة جديدة | هيرو `section-black` لكل الفعاليات — §6.4 |

**لماذا `?view=calendar` لا مسار مستقل:** الهيدر يربطه هكذا فعلًا (`apps/web/src/lib/navigation.ts:140`)، و`internal-links-contract.spec.ts` يفحص وجود `page.tsx` للمسار بلا الاستعلام — فمسار واحد يكفي ويُبقي الاختبار أخضر بلا تعديل.

### 6.1 `/events` — الهيرو ولوحة التحكم (`Events.dc.html`، `site-01-events-page.png`)

1. **الهيرو** (ارتفاع 460 في الرسم): تدرّج `#04140B → #00502A → #0B0B0B` — أخضر يغلب ثم أسود. التنفيذ: سجل `green` (`section-green`)، لأن التصميم نفسه أخضر وADR-0098 D2/D4 يجعل «سجلات الهوية الخضراء» أرضية محكومة. **تصنيف `/events` في `PUBLIC_PAGES` (register + registerBasis) قرار** — D-15. المحتوى: فتات الخبز، H1 «الفعاليات» مع شرطة ثلاثية الألوان، الوصف، رقم الموسم المختصر (`shortName`، «26/27») بحدٍّ خارجي زخرفي `aria-hidden`، وبطاقة الموسم الحالي (شعار الموسم أو المربع المتقطع البديل، «تعرض الآن فعاليات»، اسم الموسم، «المرحلة الحالية: …»، «عن الموسم» ← `/seasons/[slug]`). بيانات البطاقة من `GET /seasons/public/current` القائم. تختفي البطاقة كليًا إن لم يوجد موسم حالٍ.
2. **لوحة التحكم** (تتداخل مع الهيرو بـ−72): 
   - تبويبات «جارية الآن / قادمة / سابقة» بعدّاداتها (`role="tablist"`، `Events.dc.html:27-29`)؛
   - مبدّل العرض «كروت / تقويم» (`role="group"`؛ الكروت زر `aria-pressed`، والتقويم رابط `?view=calendar` — كما في الرسم `:30-32`)؛
   - الفلاتر: الموسم (افتراضيًا الحالي، + «كل المواسم»)، الفترة (كل الفترات / هذا الشهر / الشهر القادم / مخصص…)، طريقة الحضور، «مسح الفلاتر»؛
   - رقاقات المجموعة («كل الأنواع» + ست مجموعات، `aria-pressed`).
   - «مخصص…» لا يرسم التصميم ما يفتحه — D-17.
3. **حالة الفلتر في العنوان:** `?tab=` `?season=<slug>` `?period=` `?attendance=` `?group=` `?view=` — مشاركة الرابط تعيد نفس العرض، ونفس نمط `apps/web/src/lib/albums/album-query.ts`. **التبويب الافتراضي** حين لا يوجد `?tab=`: التصميم يفتح على «جارية الآن» ويرسم حالة فارغة لها (`Events.dc.html` السكربت: `tab || 'current'`، و`isEmpty` عندما لا جارية). فتح الصفحة على تبويب فارغ والقادمة موجودة قرار — D-17.
4. **تبويب «جارية الآن»:** كرت كبير أفقي لكل فعالية جارية (نص + صورة الغلاف بعرض 600 في الرسم): شارة «جارية الآن»، رقاقة النوع، H2 العنوان، الملخص، التاريخ والمكان، شريط التقدم (§5.2)، «تفاصيل الفعالية». ثم «بعدها في الأجندة» (أول 3 قادمة) + زر «كل الفعاليات القادمة» ينقل للتبويب.
5. **تبويبا «قادمة» و«سابقة»:** شبكة 3 أعمدة. الكرت: منطقة الصورة (196) وعليها مربع التاريخ (اليوم + الشهر)، وشارة الحالة («بعد 6 أيام» / «مؤجلة» / «انتهت» / «ملغاة»)، وعلى السابقة عدّاد الوسائط («18 صورة · فيديو»)؛ ثم رقاقة النوع، H3، التاريخ (مشطوب للمؤجلة)، «المكان · طريقة الحضور»، وصندوق `statusNote` عند وجوده. الكرت كله قابل للنقر عبر رابط العنوان الممتد (`.ev-link::after`) — نمط موجود.
   - الترتيب: القادمة تصاعديًا بـ`startDate`، والسابقة تنازليًا.
   - **الترقيم/التحميل الإضافي غير مرسوم** — السابقة ستكبر كل موسم. D-17.
6. **الحالة الفارغة:** «لا توجد فعاليات تطابق اختيارك» + «جرّب نوعًا آخر أو موسمًا مختلفًا.» + «عرض كل الأنواع» (`Events.dc.html:47-50`).
7. **شريط الاشتراك** (أسود، حافة ثلاثية عمودية): «أضف أجندة الاتحاد إلى تقويمك» + Google · Apple · Outlook · «نسخ رابط .ics». **خارج النطاق المعتمد كما هو مرسوم** — D-11.

### 6.2 كرت الفعالية — قواعد مشتركة

- **الصورة:** `coverImageId` عبر المكوّن القائم للصور (Cloudinary loader). بلا صورة: **سطح محايد واحد لكل الكروت**، لا تدرّج بلون المجموعة. الرسم يملأ منطقة الصورة بتدرّج المجموعة (`Events.dc.html` السكربت، `G[k].m`) — مخالف لـADR-0065 D3c («On a badge, chip, or a thin edge — never as the card's fill»). نفس قرار كروت المواسم (#31).
- **لون المجموعة:** على الرقاقة فقط، ونصها ظاهر دائمًا (WCAG 1.4.1). المجموعات ست؛ السلم التصنيفي خمس درجات («Scales longer than five require an amendment; do not interpolate a sixth value»، ADR-0065 D3b)، و`colour-role-contract.spec.ts:97` يثبت غياب `--color-category-6`. **DESIGN SYSTEM GAP** — D-4.
- **شارة «جارية الآن»:** أحمر مع نقطة نابضة في الرسم. النبض ممنوع بلا توكن (قرار السجل #16: «نقطة البث المباشر ساكنة بلا نبض»، والنبض PENDING-OWNER). والأحمر محجوز للتنبيه والبث الحي (قرار #60 يستبعده من ألوان المراحل لهذا السبب). «فعالية جارية» ليست بثًّا. D-5. حتى القرار: النقطة ساكنة.
- **الحركة:** `.ev` ترتفع −4 وتظهر حافة ثلاثية عند المرور، والصورة تكبر وتدور (`Events.dc.html` style: `scale(1.08) rotate(-4deg)`). المرور والارتفاع مسموحان بـADR-0065 D5 من توكنات `--motion-*`؛ **الدوران** غير مغطّى — ADR-0098 D5 يسمح بدوران الحد وحده (`motion.duration.orbit`) لا دوران الصورة. يُسقط الدوران، ويبقى التكبير إن كان توكنًا قائمًا؛ وكل ذلك تحت `prefers-reduced-motion: no-preference` فقط (كما في الرسم نفسه).

### 6.3 أجندة الموسم `?view=calendar` (`EventsCalendar.dc.html`، `site-02-events-calendar.png`)

1. **هيرو أقصر** (300): فتات الخبز «الرئيسية / الفعاليات / أجندة الموسم»، H1 «أجندة الموسم»، ورابط «موسم 2026–2027 · المرحلة الحالية: الإعداد».
2. **شريط الأدوات:** اختيار الموسم، مصدر الأجندة («الفعاليات» مضغوط، و«البطولات · قريبًا» معطّل — **تعارض §11، لا يُرسم**: §14 C-1)، اختيار النوع، ومبدّل العرض.
3. **شبكة الشهر:**
   - **الأسبوع يبدأ الإثنين** — مؤكَّد من السكربت: `wd: ['الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد']` (`EventsCalendar.dc.html`، `renderVals`). وبيانات الرسم متسقة: الصف الأول 28–30 سبتمبر ثم 1 أكتوبر في عمود الخميس، و1 أكتوبر 2026 خميس فعلًا (تحقّق حسابي). ويطابق `packages/content/time-range` الذي يبدأ «هذا الأسبوع» يوم الإثنين («the working week the federation's calendar is published on»، `range.spec.ts:27-31`).
   - رأس الشهر: سابق/تالٍ (`aria-label` يسمّي الشهر الوجهة: «الشهر السابق: سبتمبر»)، اسم الشهر H2، «اليوم».
   - أيام الشهرين المجاورين مُعتمة. اليوم الحالي دائرة `brand-primary`.
   - **الفعاليات كقضبان** تمتد عبر أعمدة أيامها، تُقسَّم عند حد الأسبوع، وأطرافها مدوّرة فقط عند البداية والنهاية الحقيقيتين (`b.rs`/`b.re`؛ القضيب المستمر من الأسبوع السابق يحمل «← بدأ 25 سبتمبر»). كل قضيب رابط لصفحة الفعالية.
   - **حارات القضبان:** شبكة الصف `38px 32px 32px 1fr` — حارتان. ماذا يحدث للفعالية الثالثة المتزامنة غير مرسوم — D-17.
   - **المواعيد المهمة** للموسم (`keyDates`) معين أسود صغير مع نصها داخل خلية اليوم.
   - **مرحلة الموسم:** تظليل خلفية الأسابيع الواقعة في المرحلة + رقاقة «مرحلة الإعداد · 1 سبتمبر – 30 نوفمبر». ألوان المراحل مقرَّرة بقرار السجل #60 (إعداد = `neutral-warm-200`/`900`، داخلي = `green-700`/أبيض، خارجي = `brand-black`/أبيض، راحة = `neutral-warm-50` بحافة متقطعة) — تُستعمل كما هي، وليس الأخضر الفاتح المرسوم.
   - **إمكانية الوصول:** الرسم يستعمل `role="row"` و`role="columnheader"` على `div`. التقويم إما `<table>` حقيقي بـ`<th scope="col">` أو grid ARIA كامل (`grid`/`row`/`gridcell`) — لا نصف دور. المطلوب: `<table>` دلالي، وكل يوم يحمل تاريخه كاملًا في اسم الوصول، والقضبان روابط عادية بترتيب Tab زمني. لا تنقّل بالأسهم (ليس widget).
4. **العمود الجانبي «في أكتوبر»:** قائمة زمنية بكل فعاليات الشهر ومواعيده المهمة (مربع اليوم + اسم اليوم، النوع/الحالة، العنوان، سطر وصفي). هذه **هي** البديل النصي الكامل للشبكة — من يصل بقارئ الشاشة يقرأ الشهر كاملًا منها.
5. **دليل الألوان:** المجموعات + «موعد مهم» + «مرحلة الموسم»، و«تحميل روزنامة الموسم (PDF)» ← `Season.calendarDocumentId` — خاضع لـD-7 (لا قراءة عامة للوثائق).
6. **الموبايل:** لا تصميم للتقويم على الموبايل، ورابط «التقويم» في `EventsMobile.dc.html` يشير إليه. `docs/product/01-Information-Architecture.md` §12 يصنّف «Calendar» ضمن **Mobile First** — **RESPONSIVE DESIGN NOT VERIFIABLE**، وتعارض مسجَّل (M-24). حتى القرار: تحت `lg` يُعرض العمود الجانبي (القائمة الزمنية) وحده بدل الشبكة — اشتقاق من §5.2 (4/8 أعمدة لا تحمل 7 أيام بأهداف لمس ≥44px: 390−2×16=358px ÷ 7 = 51px للعمود قبل أي هامش)، معلَّم `PENDING FIGMA BACK-SYNC` وليس قرارًا نهائيًا.

### 6.4 صفحة الفعالية `/events/[slug]` — قادمة أو جارية (`EventDetail.dc.html`، `site-04`)

1. **الهيرو** (640): صورة الغلاف (بديل: السطح نفسه بلا صورة)، فتات الخبز، رقاقة «المجموعة · النوع»، شارة التوقيت («فعالية قادمة» / «جارية الآن»)، H1، الملخص، العدّاد (§5.3) أو «اليوم X من N» عند الجريان، ثم: «سجّل الآن» (عند `registrationOpen`)، «أضف لتقويمي» (D-11)، زر المشاركة (أيقونة، `aria-label="مشاركة الفعالية"`)، و«التسجيل متاح حتى 17 أكتوبر».
   - **السطح:** `section-black` لكل الفعاليات. الرسم يلوّن الهيرو بلون مجموعة الفعالية (أزرق للمؤتمرات هنا، وأخضر للإعداد الفني في `EventDetailPast.dc.html:4`) — لون تصنيفي كتعبئة (مخالف لـD3c) وأزرق ليس هوية. سابقة القرار #7 تحسم الأزرق؛ وتوحيد الهيرو لكل الأنواع اشتقاق من D3c. `PENDING FIGMA BACK-SYNC`.
2. **شريط المعلومات** (`<dl>` بستة أعمدة، يتداخل مع الهيرو): التاريخ (أيام الأسبوع + التواريخ)، الوقت + «بتوقيت الإمارات» (يُخفى عند `isAllDay`)، المكان + «عرض على الخريطة»، طريقة الحضور، الموسم (رابط `/seasons/[slug]`)، و«مرتبطة بـ [اسم البطولة]» — **العمود الأخير لا يُرسم** حتى D-6.
3. **تنقّل الأقسام** (`<nav aria-label="أقسام الصفحة">`): «عن الفعالية / البرنامج / الضيوف والمتحدثون / الوثائق / المنظمون والشركاء» — روابط مرساة؛ كل قسم فارغ يُحذف من الصفحة **ومن هذا الشريط معًا**. الرسم يستعمل `aria-current="true"` للقسم النشط؛ التحديد التلقائي أثناء التمرير غير مطلوب في v1 (لا وصف تفاعلي في التصميم).
4. **عن الفعالية + بطاقة التسجيل:** `description` (rich text عبر المكوّن القائم `apps/web/src/components/rich-text/rich-text.tsx`)، وبطاقة سوداء: آخر موعد، الجمهور المستهدف، المنظّم، زر التسجيل الخارجي، والتنويه.
5. **البرنامج:** «كل المواعيد بتوقيت الإمارات»، تبويبات الأيام (`role="tablist"`؛ «اليوم الأول / السبت 24 أكتوبر»)، ثم `<ol>` بالجلسات: الوقت (`dir="ltr"`، `tabular-nums`)، العنوان، المتحدثون، رقاقة النوع. الاستراحة بسطح أخفض. تبويبات بنمط WAI-ARIA Tabs كاملًا (أسهم، Home/End، `aria-controls`، `tabpanel`)، والتبويب الافتراضي: يوم اليوم إن كانت جارية، وإلا الأول. ألوان أنواع الجلسات الخمسة: خمسة أنواع = خمس درجات D3a بالضبط بترتيب الـenum (D3b) — لا فجوة هنا، بشرط ألا تظهر في نفس العرض مع ألوان مجموعات الفعاليات (ADR-0072 D1 يمنع دورين لونيين في عنصر/عرض واحد) — وهي تظهر: رقاقة المجموعة في الهيرو. **تعارض أدوار لون** داخل D-4.
6. **الضيوف والمتحدثون:** شبكة 4 أعمدة: الصورة (حلقة ثلاثية الألوان — حافة هوية، ADR-0098 R3)، الاسم، الصفة، «الملف الشخصي» (§3.8).
7. **الوثائق:** 3 أعمدة (أيقونة النوع PDF/PPT، الاسم، النوع · الحجم). خاضع لـD-7؛ القسم لا يُرسم ما دامت لا وثيقة قابلة للخدمة.
8. **المنظمون والشركاء:** المنظّم (شعار الاتحاد + `organizerUnit`) والشركاء (4 أعمدة شعارات) من `sponsorships` حيث `targetType === 'Event'` و`targetId === event._id` (§11.4). الشعارات لا تُعكس أبدًا (البروتوكول §9).
9. **«فعاليات أخرى من الموسم»:** 3 فعاليات قادمة من نفس `seasonId` عدا الحالية + «كل الفعاليات» ← `/events?season=<slug>`.

### 6.5 صفحة الفعالية — منتهية (`EventDetailPast.dc.html`، `site-05`)

1. **الهيرو** (500): شارة «انتهت في 6 سبتمبر 2026»، H1، الملخص، زرّا «الصور (24)» و«الفيديو (2)» (مرساتان، تُخفى كل واحدة عند الصفر).
2. **شريط معلومات** بأربعة أعمدة (التاريخ، الوقت، المكان، الموسم).
3. **الصور:** من الألبوم المنشور الذي `publicEventId` = الفعالية: «من ألبوم «…» · 24 صورة»، فسيفساء 4×2 (الأولى 2×2، الأخيرة «+19 صورة»)، «فتح الألبوم كاملًا» ← `/media/albums/[slug]`. **أكثر من ألبوم لنفس الفعالية** مسموح في البيانات (الألبوم هو الذي يشير) — أيها يُعرض: الأحدث نشرًا، والباقي عبر رابط `/media/albums?event=<id>` القائم (`album-query.ts:55,185`). قرار صغير مسجَّل.
4. **الفيديو:** «من مكتبة الفيديوهات · يفتح في نافذة التشغيل»، أول فيديوين من `GET /videos/public?association=publicEvents:<id>`، بأيقونة المنصة (YouTube/Instagram — شعارات منصات لا تُعكس) والمدة. الفتح بنافذة التشغيل القائمة في مكتبة الفيديو.
5. **عن الفعالية** + «أخبار مرتبطة» — التصميم نفسه يقول «يظهر هنا لاحقًا لما نضيف ربط الأخبار بالفعاليات (خارج النسخة الأولى)» (`EventDetailPast.dc.html:62`). **لا يُرسم الصندوق** (PR-010: «Coming Soon» نمط مرفوض على الصفحات العامة).
6. **السطح:** `section-black` كالقادمة (§6.4)، لا الأخضر المرسوم.
7. **الموبايل:** غير مرسوم — RESPONSIVE DESIGN NOT VERIFIABLE (§15).

### 6.6 SEO

- **الـmetadata:** من `seo.metaTitle`/`metaDescription` بديلًا عن `title`/`summary`، والصورة `seo.ogImageId` ثم `coverImageId` — نفس آلية صفحات `PUBLIC_PAGES` (`apps/web/src/lib/seo/metadata`). canonical وhreflang بين `/ar/events/[slug]` و`/en/events/[slug]`.
- **البيانات المنظَّمة:** `Event` من Schema.org: `name`، `startDate`/`endDate` بإزاحة `+04:00`، `eventStatus` (`EventScheduled` / `EventPostponed` / `EventCancelled` من `status`)، `eventAttendanceMode` (`OfflineEventAttendanceMode` / `OnlineEventAttendanceMode` / `MixedEventAttendanceMode`)، `location` (`Place` بالاسم، و`VirtualLocation` **بلا رابط** قبل البداية — §5.4)، `organizer` (الاتحاد)، `image`. وChapter 14 §4 يمنع وصف ما لا تعرضه الصفحة: لا `offers` (لا تذاكر)، ولا `performer`.
- **الفهرسة:** `/events` تُفهرس حين يعيد `listEndpoint` عناصر (`isIndexable`). صفحات الفعاليات: كل فعالية ظاهرة (§4.3) قابلة للفهرسة؛ غير الظاهرة 404 لا `noindex`.
- **الـsitemap:** `apps/web/src/app/sitemap.ts` هو الملف الوحيد الذي يخدمه Next فعلًا. `sitemap-news.ts` ليس اسم ملف يعرفه Next ولا يشير إليه شيء غير اختبار (`seo-contract.spec.ts`)، و`media/albums/_data/sitemap.ts` مكتوب «and not yet mounted» — M-15. الخطة تضيف دالة إدخالات الفعاليات **وتركّبها في `sitemap.ts`** (بـ`lastModified = updatedAt ?? publishDate`، لا `now`)، ومعها سؤال D-15 عن ضمّ الألبومات والأخبار في نفس الخطوة.

## 7. سكشن الرئيسية (`HomeSection.dc.html`، `site-07`، `DashHomeSection.dc.html`، `dash-03`)

**الشكل:** شارة الموسم الحالي (رابط)، H2 من `sectionTitle` («فعاليات الاتحاد»)، الوصف، «كل الفعاليات»؛ ثم بنر (440، نص + صورة 620) ثم شبكة كروت 3.

**قاعدة البنر — «مميزة ← جارية ← أقرب قادمة»:** مرشَّحو البنر هم الظاهرون (§4.3) و`status !== 'Cancelled'` و`timing !== 'past'`، مع استبعاد `Postponed` (لا تاريخ يُعدّ منه). بالترتيب:

1. الفعالية التي `isFeatured === true` إن كانت مرشَّحة. «لما المميزة تخلص (أو تتلغى أو تتخفي)، البنر يرجع تلقائي من غير ما حد يدخل» (`DashHomeSection.dc.html:62`) — نتيجة مباشرة لشرط الترشيح، بلا مؤقّت ولا كتابة.
2. وإلا: جارية — **أيها إن تعددت؟** غير منصوص. المقترح: الأقرب انتهاءً (`endDate` تصاعديًا) ثم `startDate` — D-13.
3. وإلا: أقرب قادمة بـ`startDate`.

البنر يعرض: «جارية الآن» + التقدم، أو «فعالية مميزة» + العدّاد. «فعالية مميزة» تظهر فقط للبند 1 (الرسم يضعها في وضع `featured`).

**الكروت:** `itemLimit` (3–6، «من 3 إلى 6»، `DashHomeSection.dc.html:72`) من: الجارية (إن كان «تشمل الفعاليات الجارية الآن» مفعّلًا) ثم الأقرب موعدًا — عدا فعالية البنر («الفعالية اللي في البنر مابتتكررش في الكروت»). **«لو مفيش فعاليات ظاهرة جارية أو قادمة، السكشن كله بيختفي»** (`:76`) — لا حالة فارغة.

**أين يُخزَّن إعداد السكشن:** كل ما يحتاجه موجود في `pageSections` بلا أي حقل جديد: `enabled` (عرض السكشن)، `sectionTitle` (العنوان باللغتين)، `itemLimit` (عدد الكروت)، و`configuration.includeRunning` (حقل حر — `configuration` حر لكل الأنواع غير HERO، `page-sections.schema.ts` تعليق الـclass). المميزة: `publicEvents.isFeatured` (D-12). **أيّ `sectionType` يحمل هذا السكشن هو السؤال الحاجز** — D-13 / §14 C-3.

**الموضع في الصفحة:** الداشبورد يضعه بعد «الاتحاد في الإعلام» وقبل «الفيديو» (`DashHomeSection.dc.html` السكربت، المصفوفة `S`). `apps/web/src/app/[locale]/page.tsx` يرسم مجموعات مكتوبة بيد، و`HOMEPAGE_RAIL_ORDER` (`apps/dashboard/src/lib/admin/homepage/sections.ts:128-138`) ينسخ ذلك الترتيب. إضافة سكشن = تغيير في ترتيب سكاشن الرئيسية المعتمد، وCLAUDE.md §3 يحميه — داخل D-13.

## 8. شريط الهيرو والهيدر

### 8.1 `nextEventId` — الإضافة الوحيدة المعتمدة على الهيرو

يعيش الشريط في `configuration.nextEvent` لسكشن HERO، ويتحقق منه `assertHeroSettings` (`hero-settings.ts:95-101`). الإضافة:

```ts
configuration.nextEvent = {
  // الموجود كما هو (ADR-0081 D4): isVisible, label{ar,en}, name{ar,en}, venue{ar,en}, startsAt, endsAt
  nextEventId: string | null,   // جديد
}
```

- **لا تعديل على أي schema:** `configuration` حر (`page-sections.schema.ts`، تعليق الـclass: «stored as-is and not schema-constrained here»). التعديل في المُتحقِّق فقط.
- **التحقق:** `nextEventId` إما `null` أو ObjectId صالح الشكل (`invalidNextEventId`). **لا تحقق وجود** في الكتابة — نفس سياسة الـpoly-ref في الكود؛ والقراءة العامة هي التي تجيب «غير ظاهر».
- **الوضع:** `nextEventId !== null` ⇒ «فعالية من القائمة»: الاسم والمكان والمواعيد تُجلب من الفعالية («الاسم والمكان والمواعيد بتتجاب لوحدها، والشريط يفتح صفحة الفعالية»، `DashHomeSection.dc.html:87`)، والحقول اليدوية تُتجاهل وتُحفظ كما هي. `null` ⇒ الشريط اليدوي الحالي بلا تغيير («نص حر (احتياطي) … بدون رابط»، `:92-94`).
- **الحالات:** «الفعالية القادمة» + العدّاد، أو «جارية الآن» + «المكان · اليوم X من N» (`HomeHeroBar.dc.html` السكربت)، و«التفاصيل» ← `/events/[slug]`. الشريط كله رابط واحد (`<a class="bar">`) — اسم وصوله يجب أن يحمل الاسم والحالة، لا «التفاصيل» وحدها.
- **الإخفاء:** الفعالية غير ظاهرة، أو ملغاة، أو مؤجلة، أو `past` ⇒ لا شريط. **هل يسقط إلى الوضع اليدوي بدل الإخفاء؟** غير منصوص — D-3.
- **القراءة:** `GET /public-events/public/brief/:id` — شكل مصغّر `{ slug, title, place, venueName, startDate, endDate, isAllDay, status, timing, dayIndex, dayCount }` أو `null` (200). يقرؤه `readNextEvent` في `apps/web/src/lib/pages/homepage.ts:70`.
- **ADR-0081 يُحدَّث:** D2 مقترح بقي «Proposed» بكيان `events` فيه `kind: championship | event` — **دمج للفعاليات والبطولات في كيان واحد** (§14 C-4). هذا الـspec يحل محل D2 بـ`publicEvents` وحدها، ولا يبني D3 (`nextEventOverride` بثلاثة أوضاع) لأن التصميم لا يرسمه.

### 8.2 التسمية على الشريط

الشريط اليدوي اليوم يحمل `label` حرًّا، ونسخ ADR-0081 D1 تذكر «البطولة القادمة / Next championship». الشريط المربوط يقول «الفعالية القادمة» (`HomeHeroBar.dc.html:8`)، والنص الحر «لحدث مالوش صفحة، زي بطولة خارجية» (`DashHomeSection.dc.html:93`)، و«البطولات هتنضاف للاختيار الأول لما تتبني» (`:94`). خانة واحدة تعرض بطولة مرة وفعالية مرة — §14 C-5.

### 8.3 بطاقة لوحة «الفعاليات والمواسم» في الهيدر

`HeaderFeatures.nextEvent` (`apps/web/src/lib/header/features.ts:15`) يُملأ بدل `null` (`:131`). الاختيار: **أقرب قادمة** ظاهرة بـ`status === 'Scheduled'` (لا جارية — البطاقة تقول «الفعالية القادمة» وتحمل عدّادًا، `docs/design-specs/header/2026-09-28-header-redesign-design.md:86`). هل تتبع المميزة أو فعالية الهيرو بدلًا منها؟ غير منصوص — D-13. الشكل الحالي `{title, href, startsAt}` لا يكفي للعدّاد (تعليق `EventCard`، `cards/index.tsx:125-129`)؛ الخطة توسّعه إلى `{ title, href, startsAt, endsAt, isAllDay }` — إضافة داخل الويب. السطح يبقى `section-black` (قرار #7). عند الفشل: `null` ⇒ `EventFallbackCard` القائمة، عبر `Promise.allSettled` كبقية الحقول.

## 9. الداشبورد

### 9.1 السايد بار

قرار السجل #57 (المالك): مجموعة «الفعاليات والمواسم» فيها «الفعاليات» و«المواسم»، كل رابط بـ`Read` على مورده، والمجموعة تختفي بلا روابط. الكود ما زال مسطَّحًا (`apps/dashboard/src/lib/navigation.ts:325-333`، وتعليقه: «The entry moves under a shared parent when the events project builds its screen») — **هذا المشروع هو الذي ينقله**، عبر `NavItem.children` القائم (`sidebar-nav.tsx`). ملف يعدّله وكيل المواسم الآن — تنسيق (§16).

### 9.2 قائمة الفعاليات (`DashEvents.dc.html`، `dash-01`)

- رأس: فتات الخبز «الفعاليات والمواسم / الفعاليات»، H1، «تصدير» (D-11)، «إضافة فعالية».
- أربع بلاطات: جارية الآن · قادمة · بانتظار الموافقة (رابط) · مسودات — عبر `stat-tiles.tsx` القائم.
- تبويبات: جارية · قادمة · سابقة · مسودات. **«المسودات» تبويب نشر لا توقيت** — الفعالية المسودة القادمة تظهر في «قادمة» و«مسودات» معًا؟ الرسم لا يجيب؛ المقترح: التبويبات الثلاثة الأولى للحيّ (`Live`) فقط و«مسودات» لكل ما سواه — D-17.
- فلاتر: بحث بالعنوان، الموسم، المجموعة، حالة الموافقة (معتمدة / بانتظار / مرفوضة)، الظهور (ظاهرة / مجدولة / مخفية).
- الجدول: الفعالية (مصغّرة + العنوان + رقاقة النوع)، الموعد، التوقيت (في موعدها / مؤجلة)، الموافقة (شارة بنقطة)، الظهور (مفتاح `role="switch"` + ملاحظة: «منذ 20 سبتمبر» / «تظهر الخميس 1 أكتوبر · 09:00» / «معاد الظهور عدّى — تظهر بعد الموافقة» / «لا تظهر على الموقع»)، إجراءات (معاينة، نسخ، المزيد). تذييل: «6 فعاليات قادمة في موسم 2026–2027 · الأوقات بتوقيت الإمارات».
- **حالة الموافقة لكل صف** من استعلام واحد: `WorkflowInstancesService.findUnapprovedForEntityType('publicEvents')` (`workflow-instances.service.ts:555`) لـ«بانتظار/مرفوضة»، و`publicationState === 'Live'` لـ«معتمدة» — لا استعلام لكل صف.
- **«نسخ الفعالية»:** يفتح نموذج إنشاء مملوءًا (بلا `slug` ولا تواريخ نشر) — بلا مسار API جديد.
- **«معاينة»:** رابط الصفحة العامة، كما يفعل محرر الأخبار (`previewHref`، `article-editor.tsx:637`) — فلا يعمل لمسودة. لا آلية معاينة للمسودات في المنصة؛ لا تُبنى هنا.
- **مفتاح الظهور في الصف** = `PATCH /public-events/:id/visibility` — D-14.

### 9.3 نموذج الفعالية (`DashEventForm.dc.html`، `dash-02`) — ثمانية أقسام

1. **الأساسيات:** العنوان (ar/en)، الرابط (بادئة `uaeaf.ae/ar/events/` + `slug`)، النوع (قائمة بمجموعات `optgroup` + «المجموعة: … تتحدد تلقائيًا»)، صورة الغلاف («يُفضَّل 1920×1080»)، الملخص (ar/en بعدّاد /200)، النبذة (محرر rich text ثنائي عبر `bilingual-rich-text.tsx` القائم).
2. **الزمان والمكان** («بتوقيت الإمارات (GMT+4)»): تاريخ ووقت البداية، تاريخ ووقت النهاية، «طوال اليوم»، «المدة: يومان …»، طريقة الحضور، المكان (§3.5)، رابط الحضور أونلاين.
3. **الموسم والربط:** الموسم (مقترح من يوم البداية بقاعدة §3.4 في الداشبورد من قائمة المواسم المحمّلة، مع التنويه)، البطولة المرتبطة ونوع العلاقة — **معطَّلان كما في الرسم** («متاح بعد بناء نظام البطولات») — D-6.
4. **البرنامج:** تبويبات الأيام من التواريخ، صفوف الجلسات (سحب، من، إلى، العنوان، النوع، المتحدثون، حذف)، «إضافة جلسة».
5. **الضيوف والمتحدثون:** صفوف (صورة، الاسم، الصفة، مصدرها: «من سجل الأشخاص» / «اسم وصفة فقط»، إزالة)، والزرّان (§3.8).
6. **الوثائق والمنظمون والشركاء:** الوثائق (رقاقات + «إضافة من الوثائق أو رفع ملف» — D-7)، الجهة المنظمة (D-9)، الشركاء («+ من الرعاة والشركاء المسجلين» — اختصار لإنشاء/ربط `sponsorships` بـ`targetType:'Event'`، **ليس** حقلًا على الفعالية، بنفس توضيح نموذج الموسم).
7. **التسجيل:** «الفعالية تحتاج تسجيل» (switch)، الرابط، آخر موعد + التنويه.
8. **الجدولة:** في موعدها / مؤجلة / ملغاة، وملاحظة للجمهور (ar/en، معطّلة في «في موعدها»)، والتنويه.

**العمود الجانبي:** «الظهور والنشر» (شارة الحالة، ثلاثة خيارات راديو، التنبيه، سياسة الموافقة، وقت الإرسال، القاعدة) من `editorial-state`؛ «المحتوى المرتبط» (عدد الألبومات والفيديوهات، «ألبوم جديد لهذه الفعالية» ← نموذج الألبوم مع `publicEventId` مسبق، «ربط فيديو من المكتبة»، والتنويه)؛ «أقسام النموذج» (قائمة تحقق بعلامة ✓ أو «!» + السبب، روابط لأقسامها).

**الرأس:** «معاينة» · «حفظ كمسودة» · «إرسال للموافقة» أو «نشر» (§4.2) — الحفظ لا يُشترط فيه الاكتمال («Saving is never gated on readiness»، `publishing.service.ts:789`).

**الحراسة وقت التنفيذ (CLAUDE.md §31):** الإرسال والنشر يقرآن حالة «محفوظ؟» عند الضغط لا عند فتح الحوار — نفس ما يفعله `season-form.tsx:134-165` («Read at the press»).

### 9.4 إعداد سكشن الرئيسية وفعالية الهيرو (`DashHomeSection.dc.html`، `dash-03`)

- الشاشة الجديدة `/homepage/events` في مسار الرئيسية القائم؛ `HOMEPAGE_SECTIONS` يكتسب `href` لها (اليوم `href: null` لـ`UPCOMING_HIGHLIGHTS`، `sections.ts:93`) — مشروط بـD-13.
- البطاقات: العنوان (ar/en + «شارة الموسم بتتحدث لوحدها»)، البنر (تلقائي / فعالية مميزة + «تغيير» + التنويه)، الكروت (عدّاد 3–6 + «تشمل الجارية»)، و«شريط الفعالية القادمة في الهيرو» بحد متقطع و«يتدار من سكشن الهيرو» — **يُعرض للقراءة فقط هنا مع رابط لشاشة الهيرو**؛ الكتابة الفعلية في محرر الهيرو القائم (`apps/dashboard/src/components/admin/homepage-hero/hero-settings-editor.tsx`) لأن `configuration` سكشن HERO لا سكشن الفعاليات، ولأن كتابتين لنفس القيمة من شاشتين حالة سباق.
- اختيار «فعالية مميزة» = `PATCH /public-events/:id/featured` (حامل واحد)، بنفس صلاحية مفتاح الظهور (D-14).

## 10. صفحة الموسم (المشروع 2)

المشروع 2 يبني قسم «فعاليات الموسم» بحالة فارغة (spec المواسم §4.1 البند 4) وعدد الفعاليات `null` في صف الإحصاءات. هنا يُملآن من `GET /public-events/public?season=<slug>&limit=3` و`total`. **تنسيق:** الملفات من إنشاء وكيل المواسم وقد لا تكون موجودة عند التنفيذ؛ المهمة في الخطة مشروطة بوجودها. وحارس حذف الموسم `referrersOf` (`seasons.service.ts:284-296`) يكتسب «فعاليات حيّة بهذا `seasonId`» — تعليقه نفسه يقول «`publicEvents` does not exist yet; the list below is where a future referrer joins».

## 11. الصلاحيات والتسجيل

### 11.1 المورد

- `PERMISSION_RESOURCES` (`api/src/common/constants/permission-resources.ts`): `'publicEvents'`.
- `CAPABILITY_MAP` (`api/src/common/authz/capability-map.ts`) — على نمط `seasons` (`:580-587`):
  ```ts
  { resourceType: 'publicEvents', group: 'public-communication',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false, superAdminOnly: [], sensitiveFields: [], scopes: [] },
  ```
  `scopes: []` لأن `own` غير قابل للاستعمال اليوم (ADR-0125 D1؛ قرار السجل #42). `PERMISSION_CATALOGUE` مشتق تلقائيًا.
- `RESOURCE_TO_DOMAIN` (`apps/dashboard/src/lib/admin/resource-domains.ts`): `publicEvents: "public-communication"` (نفس حجة قرار #54: الخريطة تعكس مكان الوحدة في الـAPI).
- بعد الدمج: `npm run sync:permissions` (`api/package.json:43`). **خطوة يشغّلها المالك** — تكتب على القاعدة.
- القوالب (`role-templates.ts`، ADR-0113): أي قالب يأخذ `publicEvents` — D-16. لا يُضاف شيء بلا قرار.

### 11.2 `SCANNED_COLLECTIONS`

`'publicEvents'` في `api/src/common/authz/media-references.ts` (القائمة حيث `'seasons'` عند السطر 107) في نفس خطوة تسجيل النموذج، وإلا فشل `media-reference-coverage.spec.ts` فور التسجيل (الفخ نفسه الذي وثّقته خطة المواسم، مصالحتها §6). الفعالية تحمل `coverImageId` و`guests[].photoId` و`seo.ogImageId` (MediaAsset) و`documentIds` (Document).

### 11.3 تسجيلات أخرى مطلوبة

- `entity-content.ts`: الصفّان (§4.2).
- `audit-route-coverage.spec.ts`: صفوف `POST /public-events/:id/submit`، `PATCH /public-events/:id/publish`، `POST /public-events/:id/publish-approved` في `WRITES_ITS_OWN_ROW` (كما للمواسم عند `:63-68`).
- `raw-dto-cast-scan.spec.ts`: `public-events.service.ts` في `UPDATE_METHODS_USING_SHARED_SETTERS` (كما المواسم عند `:122`).
- `ApiTags` + Swagger: كل DTO موثَّق (سياسة مزامنة التوثيق).

### 11.4 الرعاة والشركاء

`SPONSORSHIP_TARGET_TYPES` فيه `'Event'` أصلًا (`sponsorship.schema.ts:10`) — **لا تعديل**. وFigJam `107:8002` يحسم المعنى: «Federation | Championship | PublicEvent — corrected: previously ambiguous "Event" now explicitly refers to publicEvents». لكن `GET /sponsorships/public` يعيد الرعايات الجارية فقط ويُخفي `targetId` («and the target id stay on the server»، DTO السطر 10). لذلك يقرأ `PublicEventsService` الرعايات بنفسه (نموذج `Sponsorship` مسجَّل في `PublicEventsModule` للقراءة، و`SponsorsService` المُصدَّر للشعارات) بقاعدة نافذة الرعاية نفسها (`isInWindow`، `sponsorship-window.util.ts`) — **بلا أي تعديل على وحدة الرعاة**.

## 12. البحث

مصدر سابع في `buildSearchSources` (`api/src/modules/platform-administration/search/search-sources.ts:105`):

```ts
{ key: 'publicEvents', model, titlePath: 'title', subtitlePath: null, thumbnailPath: 'coverImageId',
  publicFilter: /* §4.3 */, hrefOf: (row) => `/events/${row.slug}` }
```

**ثلاثة أشياء لا يذكرها تعليق السجل** («a new one (seasons, public events) is an entry here plus a text index»، `:94-97`):

1. **`publicFilter` ثابت يُبنى مرة واحدة في باني `SearchService`** (`search.service.ts:77-95`، ويُنشر في الاستعلام عند `:136`). قاعدة الظهور فيها `visibleFrom <= now` — لا تُكتب ككائن ثابت. الحل الأصغر: `SearchSource` يكتسب `publicFilterAt?: (now: Date) => QueryFilter`، و`search.service.ts:136` يستعمله إن وُجد. تعديل على خدمة البحث (سطران)؛ داخل «تسجيل الفعاليات مصدرًا للبحث».
2. **حقن النموذج:** `SearchSourceModels` و`SearchService` (`@InjectModel(PublicEvent.name)`) و`SearchModule.forFeature` — ثلاثة ملفات لا واحد.
3. **الويب:** `SEARCH_SOURCE_KEYS` في `apps/web/src/lib/search/client.ts:11`، وخرائط التسمية في `search-dialog.tsx:23` و`search-results.tsx:18,30`، ومفاتيح الرسائل.

والتطبيع العربي والحد 5/10 وكل شيء آخر كما هو (قرارات السجل #21–#24).

## 13. الاختبارات (مركّزة)

1. **Schema:** الفهارس الجزئية (`slug`، `isFeatured`)، رفض النهاية قبل البداية، `registration` ناقص، `dayIndex` خارج الأيام.
2. **التوقيت (`@uaeaf/content/events`):** حدود أيام دبي (23:59:59 و00:00 من اليوم التالي)، يوم واحد، `isAllDay`، `Postponed` دائمًا `upcoming`، «اليوم X من N»، العدّاد، شبكة الشهر تبدأ الإثنين، تقسيم القضيب عند حد الأسبوع. **واختبار تكافؤ** بمتجهات مشتركة مع `dubai-day-range.util.ts`.
3. **الظهور:** كل مسار عام يستبعد: مسودة، `isVisible:false`، `visibleFrom` في المستقبل، مؤرشفة؛ و`onlineUrl` غائب قبل البداية.
4. **النشر (red أولًا):** بلا `Publish` ⇒ 403؛ سياسة تشترط موافقة ⇒ `publish` يرفض بـ`workflowRequired`؛ `submit` بلا سياسة ⇒ `conflict`؛ `publish-approved` ينشر المعتمَد؛ `publicationState` بعد النشر `'Live'` والفعالية تظهر في `GET /public-events/public` (الاختبار الذي كان سيكشف M-2 في المواسم).
5. **الاختيار:** البنر (مميزة ← جارية ← قادمة، ومميزة ملغاة/مخفية/منتهية تسقط)، الكروت (بلا تكرار البنر، الحد، إخفاء السكشن)، الهيدر.
6. **الهيرو:** `nextEventId` صالح/فاسد الشكل، الوضع المربوط يتجاهل اليدوي، فعالية غير ظاهرة ⇒ لا شريط.
7. **الحذف:** 409 مع ألبوم/فيديو/شريط هيرو يشير.
8. **الحراس القائمة تبقى خضراء:** `media-reference-coverage`، `audit-route-coverage`، `raw-dto-cast-scan`، `permission-catalogue`، `capability-map`، `entity-content.spec`، `internal-links-contract`، `page-message-keys`، `message-parity`، `colour-role-contract`.
9. **E2E:** `/events` بالتبويبات والفلاتر في العنوان، التقويم (أكتوبر 2026: الخميس 1)، صفحة قادمة (عدّاد، برنامج بالتبويبات بلوحة المفاتيح)، صفحة منتهية (ألبوم وفيديو مرتبطان)، الرئيسية، الهيرو، الهيدر — عند 1440 و390، بالعربية والإنجليزية (قرار السجل #37).
10. **الداشبورد:** «حفظ» لا يُشترط فيه الاكتمال؛ الإرسال يقرأ حالة الحفظ عند الضغط؛ الزر المعروض حسب السياسة؛ مفتاح الظهور.

## 14. تعارضات مع CLAUDE.md §11 (تُرفع ولا تُحلّ)

- **C-1 — مصدر «البطولات» في أجندة الفعاليات.** `EventsCalendar.dc.html:24-26`: مجموعة «مصدر الأجندة» بزرين «الفعاليات» و«البطولات · قريبًا» (`title="تُضاف بعد بناء نظام البطولات"`). عرض الفعاليات والبطولات في تقويم واحد تحت «أجندة الموسم» دمج لمفهومين تفصلهما §11، والـIA يضع «Championship Calendar» تحت أب آخر (`01-Information-Architecture.md:264-265,813`). **هذا الـspec لا يرسم الزر** (لا وجهة، وPR-010 يرفض «قريبًا»)، ولا يقرر إن كانت الأجندة ستضم البطولات لاحقًا.
- **C-2 — ربط الفعالية ببطولة.** «مرتبطة بـ [اسم البطولة] · تحضيرًا لها» (`EventDetail.dc.html:49-50`) والحقلان في النموذج. **علاقة لا دمج**، وFigJam يحملها (`championshipId`)؛ لا تعارض في المبدأ. مرفوع لأن `championshipRelation` غير موجود في FigJam ولا جهة تحكم قيمه — D-6.
- **C-3 — سكشن الرئيسية.** `UPCOMING_HIGHLIGHTS` صُمم في FigJam لفعاليات **و**بطولات («added publicEvents + championshipEvents (needed for UPCOMING_HIGHLIGHTS)»، ملاحظة `page-sections` على اللوحة)، ونص الداشبورد له «أقرب الفعاليات والبطولات القادمة» (`apps/dashboard/messages/ar.json:2145-2148`)، والـIA المبني يذكر «Results & Rankings + Upcoming Events» سكشنًا مدمجًا (`01-Information-Architecture.md:684`). والتصميم يرسم سكشنًا مستقلًا للفعاليات العامة وحدها. D-13.
- **C-4 — ADR-0081 D2** (Proposed) يقترح كيان `events` بـ`kind: championship | event`. هذا الـspec لا يتبعه، ويطلب تحديثه ليشير إلى `publicEvents` (§8.1).
- **C-5 — خانة «الحدث القادم» في الهيرو** تحمل فعالية مربوطة أو نصًّا حرًّا «زي بطولة خارجية»، و«البطولات هتنضاف للاختيار الأول» (`DashHomeSection.dc.html:93-94`). خانة واحدة لمفهومين، بتسمية تتبدّل. D-3.
- **C-6 — كلمة «Events» في الـIA.** `CLAUDE.md` §11 والـIA (`01-Information-Architecture.md:264,813`) يستعملان «Events» أبًا لـ«Championship Calendar · Results & Rankings · National Records» — أي للمنافسات. و«الفعاليات» في هذه التصاميم وفي `navigation.ts` المبني (مجموعة `eventsSeasons` منفصلة عن `championshipsResults`، ADR-0122) هي الفعاليات العامة. تعارض مصطلحات بين وثيقة الحوكمة والتنقل المبني؛ لا يُعاد تسمية شيء هنا.

## 15. الاستجابة (Responsive)

`docs/product/` لا يسجّل أي سلوك مبني للفعاليات (§12 من الـIA يصنّف «Calendar» Mobile First بلا تفاصيل)، فالمرجع التصاميم ثم Chapter 5 §5.2 (`05-Grid-Layout-Motion.md:65-74`: xs ≤639 · sm 640–767 · md 768–1023 · lg 1024–1279 · xl 1280–1535 · 2xl ≥1536).

| الشاشة | 1440 (xl) | 390 (xs) | sm / md / lg |
|---|---|---|---|
| `/events` كروت | `Events.dc.html` | `EventsMobile.dc.html` | **NOT VERIFIABLE** |
| `/events` تقويم | `EventsCalendar.dc.html` | **NOT VERIFIABLE** | **NOT VERIFIABLE** |
| صفحة قادمة/جارية | `EventDetail.dc.html` | `EventDetailMobile.dc.html` | **NOT VERIFIABLE** |
| صفحة منتهية | `EventDetailPast.dc.html` | **NOT VERIFIABLE** | **NOT VERIFIABLE** |
| سكشن الرئيسية | `HomeSection.dc.html` | **NOT VERIFIABLE** | **NOT VERIFIABLE** |
| شريط الهيرو | `HomeHeroBar.dc.html` | الشريط القائم (ADR-0081 D1: «Phone: two lines») | القائم |
| الداشبورد (3 شاشات) | مرسومة | غير مطلوبة (Desktop First، IA §12) | — |

**ما ترسمه شاشة 390 (يُبنى كما هو):** `/events` — هيرو 290 بنص 40، رابط الموسم رقاقة، لوحة: تبويبات مقسَّمة بعرض كامل، زر «الفلاتر» بعدّاد + رابط «التقويم»، رقاقات المجموعات صفّ منزلق أفقيًا، كرت الجارية عموديًا (صورة 210 فوق النص)، «بعدها في الأجندة» صفوف مجمّعة بالشهر (مربع 60×68 + النوع + العنوان + سطر)، «كل الفعاليات القادمة»، وكتلة اشتراك بزر واحد. الصفحة — شريط علوي بـ«الفعاليات» رجوعًا + مشاركة + القائمة، الصورة فوق، العدّاد 3 أعمدة، المعلومات قائمة رأسية، أقسام الصفحة شريط منزلق، البرنامج خط زمني رأسي بنقاط ملونة، الضيوف صفّ منزلق، الوثائق قائمة، الشركاء عمودان، وشريط سفلي ثابت «سجّل الآن / حتى 17 أكتوبر» + أيقونة التقويم.

**ما لا ترسمه ويُحتاج قرار:** «الفلاتر» تفتح ماذا (ورقة؟ حوار؟) — D-17. **الشريط العلوي في صفحة الموبايل يستبدل الهيدر العام** (الرجوع بدل الشعار) — الهيدر منطقة محمية (CLAUDE.md §3)؛ لا يُبنى بلا قرار: D-17. الشريط السفلي الثابت يجب ألا يغطي آخر المحتوى ولا أداة التواصل العائمة (IA §12: الشريط السفلي للمنصات الاجتماعية تحت 1620px).

**الاشتقاق للفجوات (CLAUDE.md §1a، `PENDING FIGMA BACK-SYNC`):** شبكة الكروت 3 أعمدة من `lg` (12 عمودًا ÷ 4 = 3 كروت؛ §5.2 صف lg)، عمودان في `md` (8 ÷ 4)، عمود واحد في `xs`/`sm` (4 أعمدة فعّالة). شريط معلومات الصفحة 6 أعمدة من `xl`، 3×2 في `md`–`lg`، قائمة في `xs`/`sm` كما في 390. هذه أرقام أعمدة مشتقة من جدول §5.2 لا من الذوق، وكل حالة منها بلا إطار Figma.

**قائمة الحالات البصرية الجديدة بلا إطار Figma:** كرت بلا صورة على السطح المحايد؛ هيرو `section-black` للفعالية (بدل الأزرق/الأخضر)؛ هيرو `/events` على `section-green`؛ شارة «جارية الآن» بنقطة ساكنة؛ كرت مؤجل/ملغى؛ التقويم تحت `lg`؛ كل نقاط `sm`/`md`/`lg` أعلاه؛ الصفحة المنتهية والسكشن على الموبايل؛ الشريط المربوط في الهيرو بنقاطه.

## 16. التنسيق مع المشروع 2 (يعمل الآن)

الملفات التالية يعدّلها وكلاء المواسم أيضًا؛ كل مهمة تمسّها في الخطة تبدأ بقراءة الملف كما هو لحظة التنفيذ ولا تفترض محتواه: `capability-map.ts`، `permission-resources.ts`، `media-references.ts`، `entity-content.ts`، `audit-route-coverage.spec.ts`، `raw-dto-cast-scan.spec.ts`، `resource-domains.ts`، `apps/dashboard/src/lib/navigation.ts`، `apps/web/src/lib/pages/public-pages.ts`، `apps/web/src/i18n/messages.ts`، `search-sources.ts`، `seasons.service.ts`، `apps/web/src/lib/header/features.ts`، `api/src/app.module.ts`.

**عيوب في المواسم اكتُشفت هنا، تُبلَّغ لوكيلهم ولا تُصلح في هذا المشروع:** M-2 (`'Live'` مقابل `'Published'`) وM-3 (لا `publish-approved`) — كلاهما يجعل مسار النشر المحكوم للمواسم لا يعمل للجمهور.

## 17. UNKNOWN / REQUIRES DECISION

الصيغة: ما هو معروف · ما هو غير معروف · الخيارات · التوصية (حين تُبرَّر) · القرار المطلوب بالضبط. **[حاجز]** = يوقف مهمة محددة في الخطة.

**D-1 [حاجز: المهمة 1] — قائمة أنواع الفعاليات.** معروف: FigJam `289:4555` يقول `Conference | Celebration | Ceremony | Other`؛ التصاميم ست مجموعات و14 نوعًا مستنتجًا من بيانات عيّنة (§3.2)، والقائمة المنسدلة الكاملة غير مرسومة. غير معروف: القائمة الرسمية وتسمياتها الإنجليزية. الخيارات: (أ) قائمة التصميم المستنتجة كما في §3.2؛ (ب) أربع قيم FigJam؛ (ج) قائمة يسلّمها الاتحاد. التوصية: (أ) بعد مراجعة الاتحاد لها، وتحديث FigJam. **القرار:** اعتماد قائمة الأنواع المغلقة، وخريطة كل نوع إلى مجموعته، والاسمين العربي والإنجليزي لكل منهما.

**D-2 — `status` في FigJam مقابل الجدولة في التصميم.** معروف: FigJam `status: Upcoming | Ongoing | Completed` يُدخله المحرر بيده «to avoid silent state drift»؛ التصميم يحسب التوقيت من التاريخ ويجعل المحرر يختار «في موعدها / مؤجلة / ملغاة». الخيارات: (أ) `status` = الجدولة، والتوقيت محسوب (هذا الـspec)؛ (ب) حقلان مخزَّنان؛ (ج) FigJam حرفيًا (توقيت يدوي). التوصية: (أ) — التوقيت اليدوي يكذب في اللحظة التي ينسى فيها أحد تحديثه، والتصميم يعتمد على الحساب («اليوم 4 من 8»). **القرار:** إقرار (أ) وتحديث FigJam `289:4555`.

**D-3 — شريط الهيرو المربوط.** معروف: القاعدة اليومية تجعل الفعالية «جارية» من منتصف الليل (§5.1) بينما الشريط اليدوي لحظي؛ والتصميم لا يقول ماذا يحدث حين تنتهي الفعالية المربوطة. الخيارات: (أ) لا شريط؛ (ب) يسقط إلى النص الحر المحفوظ؛ (ج) يسقط إلى «أقرب قادمة». وخانة واحدة تحمل بطولة مرة وفعالية مرة (C-5). التوصية: (أ) — لا يُعرض شيء لم يختره أحد. **القرار:** سلوك الانتهاء، وهل يُسمح بالنص الحر لبطولات بتسمية «الفعالية القادمة».

**D-4 — ألوان المجموعات (DESIGN SYSTEM GAP).** معروف: ست مجموعات، السلم التصنيفي خمس (ADR-0065 D3a/D3b)، والمرسوم يشمل أزرق وبنفسجي وتعبئة كروت (D3c)؛ وأنواع الجلسات خمسة تدخل D3a لكنها تجاور رقاقة المجموعة في نفس العرض (ADR-0072 D1). الخيارات: (أ) «مؤسسية» محايدة + خمس مجموعات على `category.1–5` بترتيب الـenum؛ (ب) مجموعة أدوار منفصلة `color.eventGroup.*` بقرار مالك كما فعل ADR-0094 للمواضيع؛ (ج) بلا لون، النص وحده. التوصية: (أ) — الرسم نفسه يجعل «مؤسسية» رمادية. **القرار:** الخيار، وما إذا كانت ألوان الجلسات تبقى في صفحة فيها رقاقة مجموعة. أيٌّ منها يحتاج ADR.

**D-5 — شارة «جارية الآن».** معروف: الرسم أحمر بنبض؛ النبض بلا توكن (#16)؛ الأحمر محجوز للتنبيه والبث (#60، ADR-0050). غير معروف: هل «فعالية جارية» تستحق الأحمر. **القرار:** لون الشارة (أحمر `brand-red` مع نقطة ساكنة، أم `section-black`/أخضر)، والنبض (يبقى ضمن PENDING-OWNER #16).

**D-6 — البطولة المرتبطة.** معروف: FigJam يحمل `championshipId`؛ لا collection للبطولات؛ `championshipRelation` غير موجود في FigJam. الخيارات: (أ) الحقلان في الـschema بلا DTO حتى تُبنى البطولات (هذا الـspec)؛ (ب) لا حقول الآن؛ (ج) نص حر مؤقت («[اسم البطولة]»). التوصية: (أ). **القرار:** إقرار (أ)، واعتماد قيم `championshipRelation` الأربع، وإضافة الحقل إلى FigJam.

**D-7 [حاجز: قسم الوثائق وزر روزنامة الموسم] — الوثائق.** معروف: `GET /documents/:id/public` خلف `documents:Read` (`documents.controller.ts:39-43`)؛ لا وثيقة تصل `Live` اليوم (ADR-0125 D1)؛ `DOCUMENT_OWNER_TYPES` بلا `Event` (`document.schema.ts:22-30`) وتوسيعه تعديل حقل قائم (ممنوع). وقاعدة FigJam «WORKFLOW COORDINATION RULE» تجعل الوثيقة ملفًا مرفقًا يُنشر مع الكيان الحاوي — لكنها مكتوبة لـ`strategicPlansPage`/`governanceDocuments` («in this context»). الخيارات: (أ) `documentIds` يُخزَّن ولا يُعرض حتى تُبنى قراءة عامة للوثائق؛ (ب) تطبيق قاعدة FigJam على الفعاليات: الخادم يخدم ملفات الوثائق المرتبطة بفعالية ظاهرة (قراءة Document داخل وحدة الفعاليات)؛ (ج) مرفقات كـ`MediaAsset` (يحتاج دعم PDF). التوصية: (أ) الآن، و(ب) بقرار. نفس المشكلة تصيب وثائق المواسم وروزنامتها. **القرار:** مسار خدمة وثائق الفعاليات والمواسم للجمهور.

**D-8 — الضيوف.** معروف: لا سجل أشخاص موحّد؛ وجهة عامة للرياضيين فقط. **القرار:** السجلات التي يُختار منها الضيف، ووجهة «الملف الشخصي» لكل نوع، وهل «المتحدثون» في الجلسة نص حر أم إشارة لضيف.

**D-9 — الجهة المنظمة.** معروف: قائمة منسدلة بقيمة واحدة «اتحاد الإمارات لألعاب القوى — اللجنة الفنية». غير معروف: مصدرها (اللجان؟ الهيكل التنظيمي؟ نص حر؟) وهل ينظّم غيرُ الاتحاد فعاليات. **القرار:** مصدر `organizerUnit` وإمكانية منظّم خارجي.

**D-10 — المكان والخريطة.** معروف: `Venue` بلا مدينة ولا مسار عام. **القرار:** هل يُنشئ نموذج الفعالية أماكن جديدة (كتابة على `venues`، خارج النطاق)، ووجهة «عرض على الخريطة».

**D-11 [يتجاوز النطاق كما رُسم] — التقويم والتصدير.** معروف: «أضف لتقويمي» لكل فعالية، واشتراك بالأجندة عبر Google/Apple/Outlook و«نسخ رابط .ics»، و«تصدير» في قائمة الداشبورد. ملف `.ics` لفعالية واحدة و«خلاصة» `.ics` لكل الفعاليات يمكن توليدهما كـRoute Handlers في `apps/web` من القراءة العامة، بلا API ولا مكتبة (RFC 5545 نص). أزرار Google/Outlook روابط اشتراك لخدمات خارجية. التصدير يحتاج endpoint أو توليدًا في المتصفح. الخيارات: (أ) `.ics` للفعالية فقط في v1؛ (ب) + الخلاصة؛ (ج) + أزرار الخدمات؛ التصدير مؤجل. **القرار:** ما يُبنى من هذه، وهل روابط الاشتراك لخدمات خارجية «خدمة خارجية جديدة».

**D-12 — مكان «المميزة».** معروف: الاختيار في شاشة السكشن. الخيارات: (أ) `publicEvents.isFeatured` (داخل النطاق، حامل واحد)؛ (ب) `configuration.featuredEventId` في `pageSections` (يحتاج تحققًا جديدًا في `page-sections` — خارج «nextEventId» المعتمد). التوصية: (أ). **القرار:** إقرار (أ).

**D-13 [حاجز: المرحلة 5، السكشن] — سكشن الرئيسية.** معروف: C-3؛ إضافة سكشن تغيّر الترتيب المحمي (CLAUDE.md §3)؛ `sectionType` جديد تعديل enum قائم (ممنوع). الخيارات: (أ) سكشن الفعاليات العامة = صف `UPCOMING_HIGHLIGHTS`، ويُعاد تعريف نصه ليخص الفعاليات؛ (ب) تأجيل السكشن حتى البطولات فيُبنى مختلطًا كما صممه FigJam؛ (ج) enum جديد (خارج النطاق). غير منصوص أيضًا: أي جارية تعلو البنر عند التعدد، واستبعاد الملغاة من الكروت، وهل بطاقة الهيدر تتبع المميزة. **القرار:** الخيار، والموضع بعد «الاتحاد في الإعلام»، والقواعد الثلاث الصغيرة.

**D-14 — صلاحية مفتاح الظهور والمميزة.** معروف: المواسم تغيّر `isVisible` بـ`Update`؛ و`CAPABILITY_MAP` لصفحة «عن الاتحاد» يقرر أن `Publish` «gates the switch that takes the page on and off the site … deciding what the public sees is a publishing decision». **القرار:** `Update` أم `Publish` لـ`/visibility` و`/featured`. التوصية: `Publish` بحكم تلك السابقة.

**D-15 — تصنيف `/events` والـsitemap.** **القرار:** register `/events` (`green` كما رُسم أم `neutral` كبقية القوائم) مع `registerBasis`؛ وهل تُركَّب إدخالات الأخبار والألبومات في `sitemap.ts` مع الفعاليات أم الفعاليات وحدها.

**D-16 — القوالب والصلاحيات المجاورة.** **القرار:** أي قوالب الأدوار (ADR-0113) تأخذ `publicEvents` وبأي أفعال، وهل يأخذ من يحرر الفعاليات `venues:Read`.

**D-17 — سلوك غير مرسوم في الواجهة.** بنود صغيرة، كل منها بلا تصميم: ما يفتحه «مخصص…» و«الفلاتر» (موبايل)؛ التبويب الافتراضي حين لا جارية؛ ترقيم السابقة؛ الفعالية الثالثة المتزامنة في التقويم؛ التبويبات في قائمة الداشبورد مقابل «مسودات»؛ الشريط العلوي البديل للهيدر في صفحة الموبايل. **القرار:** لكل بند، أو إذن بتطبيق الاقتراحات المكتوبة في مواضعها (§6.1، §6.3، §9.2، §15) كـ`PENDING FIGMA BACK-SYNC`.

**D-18 — الأرقام الكبيرة (DESIGN SYSTEM GAP).** العدّادات 36/38/26/28px، والعناوين 54/52/44/38/34/30/26/22px ليست على سلم Chapter 4. هذه فجوة PB-GAP نفسها (CLAUDE.md §7). **القرار:** دور «Statistic/Numeric Display»، وتعيين أحجام العناوين غير القياسية لأدوار قائمة.

**D-19 — علامة المحتوى المعلّق لنقص الترجمة.** معروف: الآلية الوحيدة لحفظ مسودة بلغة ناقصة هي `[[pending-content]]` المعرَّفة لنص لم يورّده العميل. **القرار:** إقرار استعمالها لنقص تحريري، أو بديل (حقل `summary` قابل لـ`null` بالكامل مع شرط في `PUBLISH_REQUIREMENTS`).

**D-20 — ترقيم الـADR.** قرار #43: المواسم والفعاليات والترجمة من 0127. **القرار:** رقم ADR الفعاليات (يُتحقق من `docs/design-system/` لحظة الكتابة؛ 0127 غير مأخوذ اليوم).

**D-21 — `endDate` اختياري في FigJam.** هذا الـspec يجعله مطلوبًا. **القرار:** إقرار وتحديث FigJam.

**D-22 — ملف رسائل الويب.** `MESSAGE_FILES` ثمانية ملفات بقرار #27. **القرار:** ملف تاسع `events.json` (والمواسم؟) أم إلحاق بملف قائم.

**D-23 — محتوى المسودة للبذرة.** `api/src/bootstrap/seed-seasons-events-dev.ts:200-245` يبذر شكلًا مخمَّنًا (`name`، `location`، `status: 'Scheduled'|'Postponed'`، `publicationState: 'Published'` مكتوبًا مباشرة) لا يطابق هذا الـspec، ويكتب حالة النشر مباشرة بعكس تحذير `api/src/bootstrap/seed-newsroom-demo.ts:327`. **القرار:** تحديث البذرة لتمر بـ`PublishingService` أم الاكتفاء بمسودات. (تشغيلها يكتب على القاعدة — للمالك.)

**D-24 — `Unpublished` و`Archived`.** المفردات تحملهما، ولا مسار في v1 يكتبهما (الإخفاء عبر `isVisible`، والحذف أرشفة `archivedAt`). **القرار:** هل يحتاج v1 «إلغاء النشر».

## 18. تعارضات بين التصميم/الافتراضات والكود (المصالحة)

مرقّمة `M-n`؛ كل منها مقروء من الملف لا مفترض.

- **M-1** `publicEvents` عضو في قائمتي الـworkflow منذ ما قبل هذا المشروع (`workflow-entity-types.ts:34`)، بصفّين فارغين في `entity-content.ts:51,173` — لا «إضافة للقائمة»، بل ملء الصفّين. ونص `media-reference-coverage.spec.ts:305` يقول «thirteen members» والقائمة اليوم 14 (بعد المواسم) — وصف قديم.
- **M-2** `PublishingService.markLive` يكتب `publicationState: 'Live'` (`publishing.service.ts:303`)، وschema الموسم لا يقبل إلا `Draft|Published|Archived` وقراءته العامة تطلب `'Published'` (`seasons.repository.ts:16`). موسم يُنشر بالمسار المحكوم يختفي من الموقع (و`updateOne` بلا `runValidators` يكتب قيمة خارج الـenum). الفعاليات تستعمل `PUBLICATION_STATES` (`publication-states.ts:17`). **يُبلَّغ للمواسم.**
- **M-3** المواسم بلا `publish-approved` — الموافقة لا تنتهي بنشر. الفعاليات تتبع `articles.controller.ts:152-198`. **يُبلَّغ للمواسم.**
- **M-4** ADR-0125 نصًّا: «A policy that is absent or unreadable refuses publication»؛ الكود والقرار #44/#45: `noPolicy` = نشر بصلاحية. الفعاليات تتبع الكود والقرار؛ الـADR ينتظر تعديلًا (قرار السجل #48، PENDING).
- **M-5** FigJam `289:4555` مقابل التصميم: أسماء (`coverImage`)، `eventType` بأربع قيم (D-1)، `status` بمعنى آخر (D-2)، `endDate` اختياري (D-21)؛ وغياب `summary`، البرنامج، الضيوف، التسجيل، طريقة الحضور، رابط الحضور، الظهور المجدول، الوثائق، `seo`، المنظّم، الجمهور، `isAllDay`، `isFeatured` عن FigJam — كلها تحتاج back-sync للوحة.
- **M-6** البذرة `seed-seasons-events-dev.ts` بشكل مخمَّن وتكتب النشر مباشرة (D-23)، وتقول صراحة «treat every field on it as provisional».
- **M-7** `publicFilter` في البحث ثابت يُبنى في الباني (§12)؛ وإضافة مصدر تمس ثلاثة ملفات API وثلاثة في الويب، لا «entry here plus a text index».
- **M-8** لا قراءة عامة للوثائق ولا مالك `Event` (D-7).
- **M-9** `GET /sponsorships/public` يُخفي `targetId` ويعيد الجارية فقط؛ شركاء الفعالية يُقرؤون من الخادم (§11.4). و`docs/product/07-Mongoose-Schema-Specification.md:891` يقول `targetId` «poly → federation | championships | events» بمعنى الفعاليات الرياضية، بينما FigJam `107:8002` صحّحه إلى `publicEvents` — الوثيقة 07 قديمة.
- **M-10** `Venue` بلا مدينة ولا مسار عام (§3.5).
- **M-11** ADR-0081 D2 يدمج البطولات والفعاليات (C-4)، و`hero-settings.ts:8-10` يقول لا كيان فعاليات.
- **M-12** `Countdown` مربوط بـ`NextEventLike` ويخفي نفسه بلا `label`/`venue` باللغتين؛ والشريط اليدوي لحظي والفعاليات يومية (§5.1، §5.3)؛ و`HeaderFeatures.nextEvent` لا يحمل ما يكفي للعدّاد (§8.3).
- **M-13** لا سكشن فعاليات يُرسم في الرئيسية؛ `UPCOMING_HIGHLIGHTS` بلا مستهلك ومعرَّف للفعاليات والبطولات معًا (C-3).
- **M-14** قرار السايد بار #57 مقرَّر والكود مسطَّح (§9.1).
- **M-15** `sitemap-news.ts` لا يُخدَم، وإدخالات الألبومات «not yet mounted» (§6.6).
- **M-16** سلم التصنيف خمس درجات والمجموعات ست، والتعبئة ممنوعة (D-4).
- **M-17** الأزرق في التصاميم (مقدمة هذا الملف).
- **M-18** شارة البث القائمة `LiveBadge` (`apps/web/src/components/pages/video/live-badge.tsx`) تنبض بـ1.8 ثانية، والقرار #16 يجعل نقطة الهيدر ساكنة — تناقض قائم في المنصة؛ الفعاليات لا تستعمل `LiveBadge` («مباشر الآن» بثّ لا فعالية).
- **M-19** `PUBLISH_REQUIREMENTS` حقول عليا فقط، و`LocalizedText` يشترط اللغتين (§3.3، D-19).
- **M-20** ربط الألبوم والفيديو بالفعالية موجود كاملًا (§1) — **تطابق**، لا تعارض؛ لكن تعليق `album.schema.ts:92-99` («There is no `seasonId`… adds no season entity») صار غير صحيح بعد المشروع 2.
- **M-21** القرار #58 يقول دالة **واحدة**؛ في الكود: `dubai-day-range.util.ts` (API) و`season-dates.ts` (الداشبورد) و`sponsors/window.ts` (`+4` ثابت، `packages/content`) و`sponsorship-window.util.ts` — أربع قواعد يوم. هذا المشروع يضيف `@uaeaf/content/events` مع اختبار تكافؤ، ولا يوحّد الموجود (خارج النطاق).
- **M-22** خطة المواسم تشغّل `npx jest …` — تحت ESM هذا يشغّل صفر اختبارات؛ الأمر الصحيح `npm test -- <path> --runInBand` من `api/`. خطة الفعاليات تستعمله.
- **M-23** `/events` في `PREPARING_PAGES` بـ`registerBasis` مؤقت (`public-pages.ts:384`)؛ و`/events/[slug]` غير موجود؛ و`?view=calendar` في الهيدر فعلًا.
- **M-24** الـIA §12 يصنّف Calendar «Mobile First» ولا تصميم موبايل للتقويم.
- **M-25** `internal-links-contract.spec.ts` يفحص وجود `page.tsx` — `/events/[slug]` لن يظهر فيه إلا كرابط ديناميكي؛ الروابط الثابتة الجديدة الوحيدة: لا شيء (كلها `/events` أو ديناميكية).
- **M-26** الأبعاد المرسومة للنص تحت 13px (وحدات العدّاد 11px، «موعد مهم» في التقويم 11px، شارة «جديد» 10px في الداشبورد) أسفل الحد العام (CLAUDE.md §14) وليست من استثناءات ADR-0041 — لا تُنقل كما هي؛ تُرفع إلى Caption (12/13px حسب نقطة الانكسار) أو تُصنَّف ضمن D-18.

## 19. خارج النطاق (قرارات صريحة)

- أي تعديل أو حذف لحقل في schema قائم، أي migration، أي خدمة خارجية، أي اعتماد npm جديد.
- «أخبار مرتبطة» (التصميم نفسه يؤجلها)، و«البطولات · قريبًا» في التقويم، وربط البطولة فعليًا.
- خلاصة التقويم وأزرار الخدمات والتصدير — حتى D-11.
- خدمة الوثائق للجمهور — حتى D-7.
- إنشاء أماكن من نموذج الفعالية — حتى D-10.
- `nextEventOverride` (ADR-0081 D3).
- معاينة المسودات.
- توحيد قواعد يوم دبي الأربع (M-21).
- إصلاح M-2 وM-3 في المواسم (يُبلَّغ).

## 20. الحجم

قرابة 6 إلى 7 أيام عمل بعد حسم الحواجز: الـbackend (schema + service + controller + قراءات عامة + نشر + فحوص) ~2 · التسجيلات والصلاحيات والبحث ~0.5 · `@uaeaf/content/events` ~0.5 · الداشبورد (قائمة + نموذج بثمانية أقسام + السكشن + السايد بار) ~1.5 · الموقع (القائمة + التقويم + الصفحتان + الرئيسية + الهيرو + الهيدر + SEO) ~2 · التحقق الحي + ADR + التوثيق ~0.5. تفصيل المهام في الخطة المرافقة.

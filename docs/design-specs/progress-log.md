# سجل التقدم — UAEAF (الهيدر · الترجمة · المواسم · الفعاليات)

سطر لكل مهمة مكتملة. هذا السجل هو المرجع الأول عند ضغط السياق.

| التاريخ | المرحلة | المهمة | الملفات | الحالة |
|---|---|---|---|---|
| 2026-09-28 | 1 — الهيدر | الدفعة A (التنقل والمسارات والـi18n) | `navigation.ts` · `public-pages.ts` · `messages/*` · 5 صفحات PREPARING · 3 مجلدات محذوفة | ✅ |
| 2026-09-28 | 1 — الهيدر | الدفعة B (الصف واللوحات) | `header-shell.tsx` · `primary-nav.tsx` · `mega/*` · `cards/*` · الكبسولة وأدواتها · `motion.css` | ✅ |
| 2026-09-29 | 1 — الهيدر | قرار الأندية (`clubsDescription` رجع) + §15 بند 9 | `navigation.ts` · `messages/*` · الـspec | ✅ |
| 2026-09-29 | 1 — الهيدر | قرار المرور (الخط الثلاثي للنشط فقط) | `motion.css` · `primary-nav.tsx` · حارس 13 | ✅ |
| 2026-09-29 | 1 — الهيدر | C1 — أكورديون الدرج | `mega-panel.tsx` (`keepsCardInDrawer`) · `primary-nav.tsx` | ✅ |
| 2026-09-29 | 1 — الهيدر | C2-C4 — الدرج modal + قفل التمرير + المقاس | `use-focus-trap.ts` · `use-focus-trap.spec.tsx` · `header-shell.tsx` · `navigation.ts` · `messages/*` | ✅ 545 اختبارًا |
| 2026-09-29 | 1 — الهيدر | C5 — صف الأدوات في الدرج · **الدفعة C اكتملت** | `primary-nav.tsx` (`toolsRow`) · `header-shell.tsx` | ✅ 536 اختبارًا |
| 2026-09-29 | 1 — الهيدر | **بوابة بناء الدفعة C** — `next build` خرج بـ0 | — | ✅ |
| 2026-09-29 | 1 — الهيدر | D1-D5 — بيانات البطاقات وفصل server/client | `lib/header/features.ts` · `site-header.tsx` (server) · `header-shell.tsx` · `shared/countdown.tsx` · `library-screen.tsx` (`id="live"`) | ✅ 707 · خانة `middle` ونقطة البث الساكنة |
| 2026-09-29 | 1 — الهيدر | E1-E3 — backend البحث | `api/.../search/*` · 6 text indexes | ✅ 29 اختبارًا · 6 نتائج أمنية أُصلحت · diff الـschemas صار index فقط |
| 2026-09-29 | 1 — الهيدر | **بوابة بناء الدفعة D** — `next build` خرج بـ0 | — | ✅ |
| 2026-09-29 | 1 — الهيدر | E4-E5 — نافذة البحث و`Ctrl/⌘+K` · **الدفعة E اكتملت** | `search-dialog.tsx` · `search-results.tsx` · `lib/search/client.ts` · `app/api/search/route.ts` · `messages/*` | ✅ 569 اختبارًا |
| 2026-09-29 | 1 — الهيدر | **بوابة بناء الدفعة E** — `next build` خرج بـ0 | — | ✅ |
| 2026-09-29 | 1 — الهيدر | F — ADR-0122 (15 قرارًا) و`how-it-works.md` | `docs/design-system/ADR-0122-*.md` · `docs/design-specs/header/how-it-works.md` | ✅ |
| 2026-09-29 | T — الترجمة | تقسيم الرسائل إلى 8 ملفات لكل لغة + `loadMessages` | `messages/{ar,en}/*.json` · `i18n/messages.ts` · `request.ts` · `message-parity.spec.ts` | ✅ deepEqual نجح للغتين قبل الحذف · 1399 اختبارًا |
| 2026-09-29 | 2 — المواسم | الـspec والخطة (26 مهمة / 6 مراحل) + مطابقة الكود (9 فروق) | `seasons/2026-09-29-seasons-design.md` · `…-plan.md` | ✅ |
| 2026-09-29 | 1 — الهيدر | **تصليح عاجل:** اللوحات كانت بعرض البند لا الحاوية | `primary-nav.tsx` · `motion.css` · `cards/feature-card.tsx` | ✅ 31 لقطة في `header/verification/` |
| 2026-09-29 | 2 — المواسم | **موقوفة مؤقتًا** عند: الـspec والخطة مكتوبان، صفر كود | — | ⏸ تُستأنف من Task 1 (backend) |
| 2026-09-29 | — | السيرفرات الثلاثة أُعيد تشغيلها (API 3000 · web 3001 · dash 3002) | — | ✅ |
| 2026-09-29 | 2 — المواسم | `'Season'` في enum الرعاة + `update()` على الـshared setters | `sponsorship.schema.ts` · `seasons.service.ts` · `raw-dto-cast-scan.spec.ts` (سجل+تعداد) | ✅ حُرّاس 120/120 · مواسم 38/38 |
| 2026-09-29 | 2 — المواسم | قاعدة النشر الموحّدة + إزالة الباب المباشر + فحص المؤلف | `publishing.service.ts` · `workflow-instances.service.ts` · `workflow-entity-types.ts` · `entity-content.ts` · `seasons.controller.ts` | ✅ مواسم 39 · نشر 43 · instances 48 · حُرّاس 120/120 |
| 2026-09-29 | 1 — الهيدر | **تصليح عاجل:** خيط 18.2px بين الزرار واللوحة كان يقفلها في المرور | `primary-nav.tsx` (`topLevelClass`) · `motion.css` · `tricolor-indicator.tsx` · `e2e/header-mega-hover.spec.ts` | ✅ 6 e2e · red proof يفشل في اللغتين · 31 لقطة أُعيد تصويرها |
| 2026-09-29 | 2 — المواسم | 8 (باقيه) و11-16 — الداشبورد: proxy · `lib/admin/seasons` · القائمة · النموذج (7 أقسام) · السايد بار | `app/api/admin/seasons/*` · `lib/admin/seasons/*` · `components/admin/seasons/*` · `resource-domains.ts` · `components/ui/inline-confirm.tsx` · `navigation.ts` | ✅ 1760 اختبارًا · حُرّاس التصميم 67 · 34 red proof |
| 2026-09-29 | 2 — المواسم | **فجوة أُغلقت:** `POST /seasons/:id/submit` — «إرسال للاعتماد» كان طريقًا مسدودًا | `seasons.controller.ts` · `seasons.controller.spec.ts` · `audit-route-coverage.spec.ts` (سجل) · الداشبورد: proxy + `season-aside` + `season-form` | ✅ API 921/921 · red proof 2→4 |
| 2026-09-29 | 2 — المواسم | **فحص حيّ للشاشتين:** محجوب فعليًا — «غير مصرَّح» لكل الأدوار حتى Super Admin | — | ⏸ يتطلب `sync:permissions` من المالك |
| 2026-09-29 | — | **قرارات المالك ق1-ق4** استُلمت وسُجّلت (57-61) · `seasonRange` تقرّر عدم مسّها بدليل المستدعين | `decision-log.md` | ✅ |
| 2026-09-29 | 2 — المواسم | أُطلقت ثلاث مسارات متوازية: API (ق2/ق3/الأكواد) · الداشبورد (ق1/الألوان/الفجوات) · الموقع (17-22) | — | ⏳ |
| 2026-09-29 | 3 — الفعاليات | كتابة الـspec والخطة من 11 مرجع HTML و11 تصميمًا | `events/2026-09-29-events-*.md` | ⏳ |
| 2026-09-29 | — | **حادث تشغيل:** `nest start --watch` انهار أثناء تحرير الـAPI (حاول قتل ابن منتهٍ)، والذاكرة الحرة وصلت 0.48 GB من 7.91 | — | ✅ أُوقف وأُزيلت العمليات اليتيمة → 1.35 GB · MongoDB سليم · يُعاد تشغيله بعد انتهاء وكيل الـAPI |
| 2026-09-29 | 2 — المواسم | ق2 وق3 — دالة أيام دبي المشتركة · رمزا الخطأ · تداخل المراحل · حارس الحذف | `common/utils/dubai-day-range.util.ts` · `api-error-code.ts` · `seasons.{service,repository}.ts` + specs | ✅ مواسم 58/58 · workflow 194/194 · common 696/696 · 13 إثبات أحمر |
| 2026-09-29 | 3 — الفعاليات | الـspec (20 قسمًا) والخطة (40 مهمة / 9 مراحل) + **26 تعارضًا بين التصميم والكود** و24 قرارًا مطلوبًا | `events/2026-09-29-events-{design,plan}.md` | ✅ |
| 2026-09-29 | ⚠ | **HEAD فيه سطر مكسور** التُقط في `84cef80` أثناء إثبات أحمر · الـworking tree سليم | — | يحتاج commit من المالك |
| 2026-09-29 | 2 — المواسم | **إصلاح مسار النشر** (بإذن المالك، نُفِّذ في الجلسة الرئيسية): مفردات `PUBLICATION_STATES` · `publishDate` · `publishedBy` يكتبه مسار النشر · `publish-approved` · `editorial-state` · `assertCanEdit` على PATCH · موسم اليوم الواحد · `seasonPhaseOutOfRange` | `season.schema.ts` · `create-season.dto.ts` · `update-season.dto.ts` · `seasons.{repository,service,controller}.ts` + specs · `publishing.service.ts` (markLive) · `api-error-code.ts` · `audit-route-coverage.spec.ts` (صف) · `entity-content.ts` (تعليق) · `seed-seasons-events-dev.ts` (نصف المواسم) | ✅ |
| 2026-09-29 | 2 — المواسم | التحقق الفعلي: **مواسم 71/71 · workflow 194/194 · common 694/698** · `tsc` API صفر · `tsc` داشبورد صفر خارج `api/` | — | ⚠ الأربع سقطات في `common` من جلسة أخرى (`federation-positions` و`committees`) لا من هذا العمل |
| 2026-09-29 | 2 — المواسم | **8 إثباتات حمراء** لمسار النشر، كلها رجعت خضراء بالإرجاع من نسخة في الذاكرة لا من git | — | ✅ |
| 2026-09-29 | 2 — المواسم | المهام 17-22 (الموقع): `/seasons` و`/seasons/[slug]` و`/seasons/current` والخط الزمني والأرشيف والتسجيل في `PUBLIC_PAGES` | `apps/web/src/lib/seasons/*` · `components/pages/seasons/*` · `app/[locale]/seasons/*` · `public-pages.ts` · `messages/{ar,en}/seasons.json` | ✅ 17 إثباتًا أحمر · `tsc` صفر · 12 لقطة (حالات فارغة — لا بيانات مزروعة) |
| 2026-09-29 | 2 — المواسم | ق1 (المجموعة) · ق2 في الداشبورد · ألوان المراحل وشريطها · تداخل المراحل في الفورم · الرفض المترجم بالمفردات الثلاث | `navigation.ts` · `season-dates.ts` · `phase-type-chip.tsx` · `phase-strip.{ts,tsx}` · `route-support.ts` · `admin-write.ts` · الكتالوجان | ✅ 24 إثباتًا أحمر · حُرّاس التصميم 7 ملفات · `tsc` صفر خارج `api/` |
| 2026-09-29 | 2 — المواسم | إعادة التسمية للمفردات المنصّية · `publish-approved` + الـproxy · `editorial-state` (الخادم يقرّر الإجراء المتاح) · `publishedBy` معروضًا · `seasonPhaseOutOfRange` بالمفردات الثلاث | `types.ts` · `to-admin-season.ts` · `list-filters.ts` · `editor-screen.ts` · `season-aside.tsx` · `season-form.tsx` · `admin-write.ts` · الكتالوجان | ✅ **1802 اختبارًا / 144 ملفًا، صفر سقوط وصفر timeout** · 16 إثباتًا أحمر |
| 2026-09-29 | 2 — المواسم | المهام 23-24-26: حلّ الـslug بجانب `seasonRange` (بلا مساس بها) · منتقي المواسم في الهيدر · ADR-0127 · مزامنة التوثيق وopenapi.json | `seasons/season-range-resolver.ts` · `albums`/`videos` (الفلتر والخدمة والوحدة) · `lib/video/library-query.ts` · `lib/seasons/season-stats.ts` · `lib/header/features.ts` · `cards/season-picker.tsx` · `ADR-0127` · `public-api-contract.md` · `06`/`07` | ✅ |
| 2026-09-29 | 2 — المواسم | المهام 23-24 (حلّ الـslug بجوار التسمية · منتقي الهيدر) و26 (**ADR-0127** + مزامنة التوثيق) | `season-range-resolver.ts` · فلترا الألبومات والفيديو · `library-query.ts` · `season-picker.tsx` · `features.ts` · ADR-0127 · `openapi.json` · `how-it-works.md` | ✅ API 361/361 · الموقع 11 جناحًا خضراء · **`seasonRange` صفر تغيير (تُحقّق بـ`git diff HEAD`)** |
| 2026-09-29 | V | مراجعة النص العربي (`ux-copy`): 16 نصًّا في `dashboard/messages/ar.json`، بلا مسّ مفتاح ولا نص إنجليزي | `ar.json` | ✅ 111/111 لوحة · 25/25 موقع · ملفات الموقع العربية كانت سليمة فلم تُمَس |
| 2026-09-29 | الصلاحيات | **إصلاح عاجل:** الـAPI كان يموت عند `listen()` بعد `sync:permissions` — موارد التقارير التسعة بلا collection | `permission-resources.ts` (`REPORT_GROUP_RESOURCES`) · `permissions.service.ts` (استثناء معلَن) · `permissions.service.spec.ts` (اختباران) | ✅ 5/5 · إثبات أحمر 2→0 · الـAPI يسمع على 3000 والدخول من المتصفح ناجح |
| 2026-09-29 | — | **عطل تشغيل:** خادم الويب سقط بـexit 127 (انهيار Turbopack أثناء كتابة جلسة أخرى لملف committees). الملف مكتمل الآن | حُذف `apps/web/.next/dev` (788MB) وأُعيد التشغيل | ✅ 3000 و3001 و3002 كلها ترد |
| 2026-09-29 | — | خادم الويب سقط مرة ثانية (exit 1): تلف `prerender-manifest` ثم حذف `.next/dev` من جلسة أخرى أثناء التشغيل، فـ`EADDRINUSE` على 3001 | — | ✅ جلسة أخرى تملك 3001 الآن وتردّ 200 في خمس طلبات متتالية — تُرك لها |

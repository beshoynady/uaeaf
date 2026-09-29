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

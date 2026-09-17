# خطة تنفيذ: الرعاة وشريط الرعاة والشركاء والعضويات

> **للمنفّذ:** هذه خطة مراحل للموافقة (المرحلة 0). **لا كود فيها بقرار المالك** («المرحلة 0 مختصرة ومركّزة على القرارات، لا تكتب كودًا فيها»)، وقراره مقدَّم على قالب `writing-plans` الذي يطلب كودًا في كل خطوة. تُكتب خطوات الاختبار والكود التفصيلية في بداية كل مرحلة بعد الاعتماد، وتُنفَّذ بـTDD.

**الهدف:** بناء الكيانات الأربعة في الطبقات الأربع: الـAPI، ثم الصفحة الرئيسية، ثم الداشبورد، ثم التدقيق.

**البنية:**
- أربع collections من مواصفة Domain 9 بتعديلات ADR-0077 و ADR-0085.
- قواعد مشتركة بين الموقع والداشبورد في `packages/content/sponsors`، على نمط ADR-0083: الانتهاء بتوقيت دبي، واختيار الاسم ولغته، وسعة الشريط.
- الحفظ نشر (ADR-0084).

**التقنيات:** NestJS و Mongoose و Jest (api)، و Next.js 16 و next-intl و Tailwind و Vitest و Playwright (web)، و Next.js و Vitest (dashboard).

**المواصفة:**
- `docs/design-system/ADR-0085-…md` (مسودة).
- `docs/design-system/ADR-0077-…md`.
- `docs/product/07-Mongoose-Schema-Specification.md:858-910`.

## القيود العامة

- لا أوامر Git إطلاقًا. كل التعديلات تبقى uncommitted.
- لا dependency جديدة بلا موافقة.
- لا كتابة على Figma.
- `entityType` بـcamelCase لأسماء الـcollections.
- التواريخ تُخزَّن UTC، وتُفسَّر وتُعرض بتوقيت `Asia/Dubai`.
- CSS logical properties فقط، والألوان والمسافات والخطوط من الـtokens فقط.
- لا نص تحت 13px على الهاتف (`text-body-sm`).
- اللوجوهات بـ`object-fit: contain`، ولا يُقبل alt بقيمة `img`.
- الاسم بغير لغة الصفحة: `<bdi lang="…">`، والـalt بنفس القاعدة.
- arrow functions (CLAUDE.md §30)، وتعليقات إنجليزية تشرح السبب.
- نظام التفاعل ثماني الحالات على كل عنصر تفاعلي (`interaction-state-contract.spec.ts`).
- الهيرو و`packages/content/hero` و`AuditLogsRepository` لا تُمس.
- **خوادم مشتركة مع جلسة أخرى:**
  - لا `nest build` والـ`--watch` يعمل. `seed:dev` يبني بـ`nest build`، فيُشغَّل بعد التنسيق أو بـ`tsc` لمجلد منفصل.
  - لا تُشغَّل suites متزامنة (7.9 GB RAM).

---

## خريطة الملفات

### API — `api/src/modules/sponsorship-relations/` (domain جديد: «Sponsorship / Institutional Relationships»)

| الملف | المسؤولية |
| --- | --- |
| `common/schemas/organization-name.schema.ts` | `OrganizationName { ar?, en? }` مع قاعدة (ز) |
| `sponsors/{schemas,dto}/…`، `sponsors.{module,repository,service,controller}.ts` | الراعي الدائم. الحقل `restricted` لا يخرج في أي رد عام |
| `sponsorships/…` | الرعاية ونافذتها، و`targetType` و`targetId`، و`tier` و`isFeatured` و`isVisible` و`displayOrder` و`scopeLabel` |
| `sponsorships/sponsorship-window.ts` | «نشطة الآن» عند القراءة بتوقيت دبي (يستورد من `packages/content/sponsors`) |
| `partnerships/…`، `memberships/…` | لوجو واسم، و`isVisible` و`displayOrder` |
| `public/sponsor-relations-public.controller.ts` | `GET /…/public/homepage`: الرعايات النشطة الظاهرة مع رعاتها، والشركاء، والعضويات، والإحصاءات. `isDemo` يُصفّى حسب (ب) |
| `common/constants/permission-resources.ts` و `permission-catalogue.ts` | `sponsors` و `sponsorships` و `partnerships` و `memberships` × Create/Read/Update/Delete |
| `common/errors/api-error-code.ts` | رموز الرفض الجديدة (اسم فارغ، نافذة معكوسة، ظاهر ناقص، هدف غير صالح) |
| `cms-page-composition/site-settings/schemas/sponsor-strip.schema.ts` | `siteSettings.sponsorStrip` (ADR-0077 D5، البنود العشرة) |
| `cms-page-composition/page-sections/sponsors-settings.ts` | `assertSponsorsSettings`: `bannerSponsorshipId` و `ctaUrl`، على نمط `hero-settings.ts` |
| `page-sections.schema.ts` | إضافة `MEMBERSHIPS` |
| `bootstrap/seed-sponsor-relations.ts` و `api/seed/dev/sponsor-relations/*.svg` | الـseed: الراعي الحقيقي، والوهميون `isDemo`، ورفع اللوجوهات عبر `MediaAssetsService` |
| `openapi.json` | يُعاد توليده |

### المشترك — `packages/content/sponsors/`

| الملف | المسؤولية |
| --- | --- |
| `window.ts` | `isInWindow(start, end, now)`: من بداية يوم البداية حتى نهاية يوم النهاية بتوقيت دبي، والنهاية الفارغة مفتوحة |
| `name.ts` | `displayName(name, locale) → { text, lang }` |
| `strip.ts` | سعة الشريط لكل breakpoint وحدود النص (قرار أ)، على نمط `row-capacity.ts` |
| `stats.ts` | الإحصاءات الثلاث وشرط ظهور كل منها (ADR-0077 D6) |
| `limits.ts` | حدود الأطوال، مكررة في الـschema مع اختبار انحراف (نمط ADR-0083) |

### الموقع — `apps/web/src/components/pages/home/sponsors/`

- `sponsor-strip.tsx` و `sponsor-strip-controls.tsx` (client): الشريط وزر الإيقاف.
- `sponsors-section.tsx` و `sponsor-banner.tsx` و `sponsor-card.tsx` و `sponsor-stats.tsx`.
- `partners-section.tsx` و `memberships-section.tsx` و `organization-card.tsx` (مشترك بين القسمين).
- `organization-logo.tsx`: plate و contain، و alt/lang حسب (ك).
- `lib/pages/homepage.ts`: قراءة المسار العام.
- `app/[locale]/page.tsx`: تركيب الأقسام بعد `<HomeHero>` **دون تعديل الهيرو**.
- `styles/motion.css`: حلقة الشريط، و `animation-play-state`، و reduced-motion.
- `messages/{ar,en}.json`.

### الداشبورد — `apps/dashboard/src/`

- `app/[locale]/(app)/homepage/{sponsors,partners,memberships,sponsor-strip}/page.tsx`.
- `lib/admin/{sponsors,partnerships,memberships,sponsor-strip}.ts`: النموذج الصافي، و validate، و planSave (نمط `homepage-hero.ts`).
- `components/admin/homepage-sponsors/…`: قائمة بالترتيب، ومحرر عنصر، و `MediaPicker` القائم، ومعاينة من `packages/content/sponsors`.
- `app/api/admin/{sponsors,sponsorships,partnerships,memberships}/…`: route handlers تمرر الحقول المسموحة فقط.
- `lib/navigation.ts`: أربعة روابط تحت «الصفحة الرئيسية»، لكل منها `requiresAll`.
- `messages/{ar,en}.json`.

### التوثيق

- `docs/engineering/how-sponsors-work.md`: ملف الشرح بالبنود التسعة، على نمط `how-hero-dashboard-works.md`.
- تحديث ADR-0077 و ADR-0043 و `07-Mongoose-Schema-Specification.md` و `page-building-guide.md` و `02-Homepage-Specification.md` §15 و `homepage-client-content.md` و `DOCUMENTATION-INDEX.md`.

---

## المرحلة 1 — الـAPI (تقدير: يومان)

كل مهمة تبدأ باختبار أحمر، ثم تنفيذ، ثم الاختبار أخضر، ثم `npx tsc --noEmit`. **لا `nest build`.**

| # | المهمة | الاختبار الذي يُكتب أولًا |
| --- | --- | --- |
| 1.1 | `OrganizationName` وقاعدته | يُقبل اسم إنجليزي فقط، ويُقبل عربي فقط أو الاثنان حسب (ز)، ويُرفض الفارغان والمسافات، وحد 150 |
| 1.2 | `packages/content/sponsors/window.ts` | يظهر 2026-09-01 00:00 دبي (= 08-31 20:00 UTC) ولا يظهر قبله بدقيقة، ويظهر 2027-08-31 23:59 دبي، ويختفي 2027-09-01 00:00 دبي، والنهاية الفارغة مفتوحة، و `Cancelled` لا يظهر أبدًا |
| 1.3 | `sponsors` | الإنشاء، وعدم تسرّب `restricted` في أي رد عام، والموقع `https?` |
| 1.4 | `sponsorships` | الجديد مخفي، والظاهر ناقص مرفوض، والنافذة المعكوسة مرفوضة، و `targetType`/`targetId` حسب (ج)، و `endDate` مطلوب لغير Federation، و `Expired` لا يكتبه النظام |
| 1.5 | `partnerships` و `memberships` | الجديد مخفي، والترتيب، واللوجو اختياري |
| 1.6 | الصلاحيات | الأربعة في `PERMISSION_RESOURCES` والكتالوج، و 403 بلا صلاحية، و `permission-catalogue.spec` |
| 1.7 | `siteSettings.sponsorStrip` و `assertSponsorsSettings` و `MEMBERSHIPS` | القيم الافتراضية، والحدود، و`bannerSponsorshipId` معرّف صالح أو فارغ |
| 1.7ب | البانر الديناميكي (ADR-0085 D5.1) | Official وحده في البانر، وإضافة Strategic تنقل البانر إليه وتعيد Official إلى الشبكة، وانتهاء نافذة Strategic يعيد البانر إلى Official، و`bannerSponsorshipId` يرجّح بين رعايات المستوى الأعلى فقط |
| 1.8 | المسار العام للصفحة الرئيسية | خارج النافذة لا يظهر (بتوقيت دبي، بـ`now` محقون)، والمخفي لا يظهر، و `isDemo` حسب (ب)، والإحصاءات لا تطبع الصفر، والترتيب |
| 1.9 | الـseed | يرفض الإنتاج والقاعدة غير المحلية (`assertSafeDevTarget` القائم)، والراعي الحقيقي الوحيد `isDemo: false`، وكل ما عداه `isDemo: true`، وكل اسم وهمي غير موجود في قائمة منع مكتوبة (أسماء Figma وأمثلة الموقع القديم) |
| 1.10 | `openapi.json` | `generate:openapi` واختبار الانحراف القائم |

**نهايتها:** تقرير، وحزمة API كاملة خضراء (بلا تزامن مع suites أخرى)، و `tsc` نظيف.

## المرحلة 2 — الموقع (تقدير: يومان ونصف إلى ثلاثة)

| # | المهمة | التحقق |
| --- | --- | --- |
| 2.1 | `displayName` و `strip.ts` و `stats.ts` في المشترك | Vitest: الاسم ولغته والسقوط، والسعة لكل breakpoint، والإحصاء المخفي |
| 2.2 | `OrganizationLogo` و `OrganizationCard` | Vitest DOM: `lang` و `bdi`، و contain، و alt حسب (ك)، والاسم مكان اللوجو الغائب |
| 2.3 | الشريط | بلا JS: صف ساكن كامل. مع JS: حلقة وزر 44×44. Reduced motion: لا حلقة ولا زر. المكرر `aria-hidden` و `inert`. قرار (أ) مع راعٍ واحد |
| 2.4 | قسم الرعاة: بانر وإحصاءات وبطاقات و CTA مشروطة | قاعدة «لا رفّ فارغ» بإخفاء كل عنصر |
| 2.5 | الشركاء والعضويات | حسب (ي)، وصف `row-capacity`، وبلا نقاط |
| 2.6 | التركيب في `page.tsx` | الهيرو كما هو: `home-hero.spec.ts` يبقى أخضر |
| 2.7 | الحراس | `page-rules` (القواعد ١ و ٣ و ٥، و ٦ بتعديل D3.4)، و `identity-lines`، و `vitals` (CLS و LCP)، و geometry للحاوية 1312 وللصف × AR/EN × 1440/1024/768/390/360 × light/dark/HC |

**نهايتها:** تقرير ولقطات في الـscratchpad.

## المرحلة 3 — الداشبورد (تقدير: يومان ونصف إلى ثلاثة)

| # | المهمة | التحقق |
| --- | --- | --- |
| 3.1 | الشركاء والعضويات: شاشة قائمة ومحرر | Vitest للنموذج: validate و planSave والترتيب والإخفاء واللوجو واسم بلغة واحدة |
| 3.2 | الرعاة ورعاياتهم: شاشة واحدة (الراعي ثم رعاياته) | النافذة بتوقيت دبي (`datetime-local`، مثل الهيرو)، و `scopeLabel` بجانب `targetType` (ADR-0077 Risk 1)، و VIP مقابل البانر بتسميتين مختلفتين |
| 3.3 | إعدادات الشريط وقسم الرعاة | البنود العشرة، وعدّاد النص، وسطر نزول الموبايل، واختيار البانر |
| 3.4 | القائمة والصلاحيات | `navigation.ts` و `requiresAll`، والرابط يختفي بلا صلاحية |
| 3.5 | شارة «بيانات تجريبية» على السجل `isDemo` | Vitest للمكوّن |

## المرحلة 4 — التدقيق والشرح (تقدير: يوم ونصف)

- `wcag-audit-patterns` و axe: الشريط، وزر الإيقاف، ونطق الأسماء الإنجليزية في الصفحة العربية بشجرة الوصول (`lang` لكل اسم).
- `impeccable` (critique ثم audit ثم polish) على الأقسام الأربعة فقط.
- `nextjs-seo`: عنوان واحد لكل قسم، وبنية العناوين، وعدم كسر الـmetadata.
- contrast محسوب لكل نص على أرضيته في الأوضاع الثلاثة، ولحدّ plate اللوجو.
- لقطات على متصفح حقيقي.
- `docs/engineering/how-sponsors-work.md`، وتحديثات التوثيق المذكورة أعلاه.
- قائمة القيم المؤقتة: تواريخ الراعي، والتهجئة إن بقيت، وكل سجل `isDemo`.

## التقدير الكلي والموعد

- **المجموع:** تسعة إلى عشرة أيام عمل.
- **المتاح حتى 2 أكتوبر:** عشرة أيام عمل تقريبًا (18 سبتمبر – 1 أكتوبر).
- **الهامش ضيق:** أي قرار يُعاد فتحه، أو تعارض مع جلسة الحراس على الخوادم، يدفع المرحلة 4 إلى ما بعد الموعد.
- **لو اضطررنا للتأجيل:** المرحلة 3.3 (إعدادات الشريط الكاملة) أول ما يُؤجَّل، والشريط يعمل بقيمه الافتراضية المخزّنة.

## نقاط توقف أثناء التنفيذ

- أي حاجة لتعديل الهيرو أو `packages/content/hero`.
- فشل contrast أو geometry بلا حل من الـdesign system.
- مرحلة تتجاوز تقديرها بوضوح.
- تعارض بين المواصفة و ADR-0077 أو ADR-0085 لم يُذكر.

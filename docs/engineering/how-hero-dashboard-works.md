# كيف تعمل شاشة إدارة هيرو الصفحة الرئيسية

**لمن:** من يعدّل شاشة `/homepage/hero` في الداشبورد، أو قواعد الهيرو المشتركة، أو يبني شاشة تحرير تالية على نمطها.
**المصدر:** برومبت المالك «بناء شاشة إدارة هيرو الصفحة الرئيسية» (2026-09-17)، والخطة `docs/plans/homepage-hero-dashboard-plan.md`، وسجل التقدم `docs/plans/homepage-hero-design.md` §٢٧، وADR-0078 وADR-0080 وADR-0081 وADR-0083 وADR-0084.

---

## ١. لماذا وُجدت

### المشكلة

- الهيرو أول ما يراه الزائر، وكان يُحرَّر بالـseed وقاعدة البيانات مباشرةً: لا شاشة، ولا معاينة، ولا حماية من شريحة ظاهرة ناقصة.
- الصورة في الهيرو تُقصّ حسب الجهاز واللغة، وتُقلب للإنجليزية (ADR-0080 D1). المحرر لا يستطيع أن يتخيل القص من صورة كاملة.
- شريط الحدث القادم يدوي بقرار المالك (ADR-0081 D4)، وله ثلاث حالات زمنية لا يراها المحرر إلا حين تحدث.

### البدائل التي رُفضت

| البديل | لماذا رُفض |
| --- | --- |
| معاينة بـ`iframe` للموقع | ترسم المحفوظ فقط، والمعاينة وُجدت للمسودة غير المحفوظة |
| حسابات القص والارتفاع منسوخة في الداشبورد | نسختان تنحرفان؛ الحل وحدة مشتركة (ADR-0083) |
| مسودة ونشر منفصلان | قرار المالك: الحفظ نشر، والمسودة دين مسجّل (ADR-0084) |
| حفظ كل حقل عند تغييره | نصف تعديل يصل للزائر؛ الحفظ صريح بزر واحد |
| مكتبة سحب أو اختيار تاريخ | ممنوعة (لا dependency جديدة)؛ HTML الأصلي يكفي (`draggable`، `datetime-local`) |

---

## ٢. خريطة الملفات — بترتيب سلسلة العمل

**القواعد المشتركة** — `packages/content/hero/` (`@uaeaf/content/hero`):
- `image.ts`: `resolveImage` و`objectPosition` و`heroDevice` — أي صورة، وأين تُقص، وهل تُقلب.
- `height.ts`: `heroHeight` — الهيدر + الهيرو = الشاشة (ADR-0078).
- `event-bar.ts`: `eventBarState` وتحويل وقت دبي.
- `limits.ts`: حدود النص المقاسة عند 390، ومدد التشغيل، وقاعدة الروابط.
- `draft.ts`: `resolveLtrPicture` لشريحة غير محفوظة، و`isSmallImage`.
- `presentation.ts`: `heroScrim` و`heroFrameLayout` و`heroType`.

**الداشبورد** — `apps/dashboard/src/`:
- `app/[locale]/(app)/homepage/hero/page.tsx`: يتحقق من كل صلاحية تستعملها الشاشة (`HOMEPAGE_HERO_GRANTS` في `lib/navigation.ts`: قراءة وإنشاء وتحديث وحذف الشرائح، وقراءة وتحديث القسم)، ثم يقرأ. الرابط في القائمة يفحص القائمة نفسها.
- `lib/admin/homepage-hero-load.ts`: الصفحة `home` → قسم `HERO` → شرائحه (المخفية معها) → `fromApi`.
- `lib/admin/homepage-hero.ts`: النموذج الصافي — المسودة، والتعديل، و`validateDraft` بقواعد الـAPI نفسها، و`planSave` (أقل الكتابات بترتيب يقبله الـAPI).
- `lib/admin/hero-save.ts`: `runSave` ينفذ الخطة خطوة خطوة ويضع الرفض بجانب حقله.
- `lib/admin/hero-error-targets.ts`: من مسار الخطأ إلى الحقل والشريحة وكلمات الملخص.
- `app/api/admin/hero-slides/…` و`app/api/admin/page-sections/[id]`: route handlers تمرر الحقول المسموحة فقط.
- `components/admin/homepage-hero/`: `homepage-hero-editor.tsx` (الجذر)، و`slide-strip.tsx`، و`slide-editor.tsx`، و`hero-image-field.tsx`، و`focal-point-picker.tsx`، و`cta-card.tsx`، و`localized-text-pair.tsx`، و`hero-settings-editor.tsx`، و`hero-preview.tsx`.

**الـAPI** — `api/src/modules/cms-page-composition/`:
- `hero-slides/hero-slides.service.ts`: الإنشاء مخفي افتراضيًا، والظاهرة كاملة، والحدود، وحل `desktopLtr`.
- `page-sections/hero-settings.ts`: `assertHeroSettings` لشريط الحدث والتشغيل.

**الموقع** — `apps/web/src/components/pages/home/`: `hero.tsx` و`hero-picture.tsx` و`hero-event-bar.tsx`، وكلها تقرأ من الوحدة المشتركة.

---

## ٣. تتبّع مثال حقيقي: الأدمن يحرك نقطة التركيز ويختار «اقلب» ويحفظ، والزائر الإنجليزي على الموبايل يرى القص المقلوب

**١. تحريك النقطة.** الأدمن يضغط Shift+→ مرتين على علامة نقطة التركيز.
- `focal-point-picker.tsx:62` `onKey`: الخطوة 10، و`clamp` يحصرها بين 0 و100، ثم `onChange({ x: 70, y: 55 })` (السطر 73).
- `slide-editor.tsx:84`: `set.desktopFocalPoint` مُنشأ مرة لكل شريحة، فيستدعي `onChange(key, { desktopFocalPoint })`.
- `homepage-hero-editor.tsx:241` `onSlideChange`: `update((current) => updateSlide(current, key, patch))`.

**٢. المعاينة تتبع.** نسخة المسودة المؤجلة (`useDeferredValue`) تصل `HeroPreview`.
- `toPreviewSlide` يبني الشريحة بشكل ما يستلمه الموقع، ثم `resolveImage` من الوحدة المشتركة.
- `object-position` يصبح `70% 55%`، وسطر الشرح يقول ما يحدث للصورة.

**٣. «اقلب الصورة».** `slide-editor.tsx:217`: `onChange(key, { ltrImageMode: "mirror" })`.
- في معاينة EN: `resolveLtrPicture` (`draft.ts`) يعطي النقطة `100 − 70 = 30` مع `mirrored: true`.
- `objectPosition(… , true)` يعيدها إلى `70%` بإحداثيات الصورة (يُقص نفس البكسلات)، ثم `scaleX(-1)` يقلب الإطار كله، فيظهر الموضوع عند 30%.

**٤. الحفظ.** `homepage-hero-editor.tsx:256` `save`:
- `validateDraft` أولًا: لا يُرسل شيء إن كان الـAPI سيرفض.
- `planSave` (`homepage-hero.ts:460`) يقارن حقول الشريحة بالمخزّن عبر `slideBody` (السطر 415)، فيخرج بخطوة واحدة: `{ kind: "update", body: { desktopFocalPoint, ltrImageMode } }` (السطر 484).
- `runSave` (`hero-save.ts:63`) يرسل `PATCH /api/admin/hero-slides/:id` (السطر 54)، والـroute (`[id]/route.ts:12`) يمرر الحقلين فقط.

**٥. الـAPI.** `hero-slides.service.ts` `update`:
- `has()` في السطر 183 هو «ليس `undefined`»: الـDTO بعد `ValidationPipe` يعلن كل حقوله مفاتيح ذاتية، فالسؤال «هل هو مفتاح ذاتي؟» كان يمسح كل ما لم يُرسل (أُصلح 2026-09-17، §٦).
- الدمج مع المخزّن ثم التحقق من اكتمال الشريحة الظاهرة، ثم الكتابة.

**٦. الشاشة تعود «محفوظة».** المحفوظ يتقدم فورًا إلى ما خُزّن، ثم `router.refresh()` (السطر 280) يعيد قراءة الصفحة، فيصل `initial` جديد وتتبناه المسودة فقط إن لم يُكتب شيء بعد الحفظ. الشاشة `inert` أثناء الطلبات، فلا يضيع حرف كُتب في منتصفها.

**٧. الموقع.** الزائر يفتح `/en` بعرض 390، والشريحة بلا صورة موبايل:
- الـAPI يحل `desktopLtr` (`hero-slides.service.ts:381`): نفس الصورة، والنقطة `x = 100 − 70 = 30`، و`mirrored: true`.
- `hero-picture.tsx:54`: `resolveImage(slide, "en", "mobile")`. لا `slide.mobile` (`image.ts:89`)، فتُعاد `desktopLtr` المقلوبة، و`objectPosition` يعطي `70% 55%` في `--hero-focus-mobile`.
- `hero-picture.tsx:70` يضع `.hero-mirror`، و`motion.css:1036` لا يلغي القلب إلا إذا وُجدت صورة موبايل (`data-has-mobile`). فتبقى مقلوبة على الموبايل، والقص نفسه الذي رآه الأدمن في معاينة «Phone / English».

**الدليل:** سيناريوهات e2e الحية ٣ و٤ قاست موضع الموضوع داخل الإطار في المعاينة وفي الموقع: الفرق `0.0000` بالعربية وبالإنجليزية المقلوبة.

---

## ٤. القرارات غير البديهية

- **الحفظ نشر.** لا مسودة مخزنة؛ المسودة في الذاكرة فقط، ومؤشر «تغييرات غير محفوظة»، وتحذيرا مغادرة: `beforeunload` لإغلاق الصفحة، وحوار قبل أي رابط داخلي يغادرها (الـrouter لا يمر بـ`beforeunload`). زر الرجوع في المتصفح غير محروس (دين، ADR-0084).
- **الشريحة الجديدة مخفية**، والمخفية تُحفظ ناقصة، والظاهرة لا تُحفظ إلا كاملة. التحقق في الـAPI، ونسخته في `validateDraft` لتظهر الأخطاء قبل الإرسال.
- **أقل كتابات بترتيب محسوب:** حذف ثم إنشاء (حد الخمس يعد المخزّن)، ثم تحديث الحقول المتغيرة فقط، ثم إعادة الترتيب كاملًا بعد أي حذف أو إنشاء، ثم الإعدادات.
- **الرفض في منتصف الحفظ لا يُخفى:** ما وصل يُعاد قراءته، ويبقى غير المحفوظ فقط، مع عنوان ملخص مختلف («حُفظ جزء…»).
- **المعاينة بعرض الجهاز الحقيقي مصغّرة** (`transform: scale`): عرض نافذة الداشبورد لا يغير أي سطر. قيم الـbreakpoint تُحسب من عرض الإطار (`heroFrameLayout`) لا من الـmedia queries.
- **الإطار يُثبّت بـ`left-0` لا `start-0`:** الإطار يحمل اتجاه اللغة المعاينة، و`start` كان يثبّت الإطار العربي بحافته اليمنى، فيرسمه التصغير من أعلى اليسار خارج الصندوق (عيب وُجد حيًا ومُصلح).
- **الأداء:** الشريط والمعاينة يأخذان نسخة مؤجلة (`useDeferredValue`) وكل الأجزاء الثقيلة `memo` بـcallbacks ثابتة. قبلها كان كل حرف يعيد رسم الشاشة كلها (696ms عند CPU ×4)، وبعدها ≤ 176ms.
- **شريط الحدث يدوي بلا رابط**، وحالاته من `eventBarState`، ومعاينته بأزرار الحالة الثلاث بتوقيت مصطنع (`previewNow`) حتى لحدث مضى.
- **الوقت يُكتب بتوقيت دبي** (`datetime-local` ← `dubaiLocalToIso`) ويُخزَّن لحظة ISO.

---

## ٥. كيف أعدّله بنفسي

- **حقل جديد في الشريحة:** schema وDTO في الـAPI (مع اختبار)، ثم `SlideDraft` و`fromSlide` و`slideBody` و`validateDraft` في النموذج (مع اختبار)، ثم `SLIDE_FIELDS` في `hero-requests.ts`، ثم الحقل في `slide-editor.tsx` بمُعدِّل من `set`، ثم `errorTarget` إن كان له خطأ.
- **تغيير قاعدة قص أو ارتفاع:** في `packages/content/hero` فقط، مع اختبارها هناك؛ الموقع والمعاينة يتبعان. شغّل اختبار مطابقة المعاينة (سيناريو ٣).
- **حد طول جديد:** `limits.ts`، ثم انسخه في `api/.../hero-text.schema.ts`؛ اختبار الانحراف يفشل إن نُسي أحدهما.
- **رسالة خطأ جديدة:** `api-error-code.ts` ← `HERO_ERROR_CODES` و`FROM_API_CODE` ← `WriteErrors` بالعربية والإنجليزية ← `field-errors.ts`.

---

## ٦. أين ينكسر — وأخطاء شائعة

- **«غير مسموح» للأدمن:** أحد صفوف `HOMEPAGE_HERO_GRANTS` غائب عن جدول `permissions` (كان `heroSlides:Update` و`pageSections:Update`). شغّل `bootstrap-admin` (يضيف صفوف الكتالوج للـSuper Admin ولا يمس الحسابات). لا تشغّل `nest build` والـ`--watch` يعمل: `node dist/bootstrap-admin.js` مع `BOOTSTRAP_ADMIN_EMAIL` و`BOOTSTRAP_ADMIN_PASSWORD`.
- **تحديث جزئي يمسح حقولًا:** أي `Object.hasOwn(dto, key)` على DTO بعد `ValidationPipe({ transform: true })` صحيح لكل الحقول (مُثبت: 19 مفتاحًا لجسم فيه حقل واحد). «مُرسَل» = `!== undefined`. الاختبار `hero-slides.partial-update.spec.ts` يمر عبر `plainToInstance` لهذا السبب.
- **المعاينة فارغة:** راجع `left-0` والصندوق `box-content` وقياس العرض داخل الحد. سيناريو `preview-fit` يقيس 18 حالة.
- **الموقع يعرض القديم بعد الحفظ:** بيانات الموقع تُعاد تحققها (`PUBLIC_REVALIDATE_SECONDS`)؛ أول إعادة تحميل قد تكون قديمة. الـe2e ينتظر القيمة لا العنوان.
- **ملف رسائل بعلامات اقتباس عكسية داخل `node -e`:** Bash يأكلها بصمت. اكتب السكربت بملف.

---

## ٧. ما يحرسه من اختبارات

| الطبقة | الملف | ما يحرسه |
| --- | --- | --- |
| الوحدة المشتركة | `packages/content/hero/*.spec.ts` | القص والقلب والارتفاع والحالات والحدود |
| API | `hero-slides.visible.spec.ts`، `hero-slides.ltr-image.spec.ts`، `hero-slides.partial-update.spec.ts`، `page-sections/hero-settings.spec.ts` | الإخفاء الافتراضي، الاكتمال، الحدود، التحديث الجزئي، إعدادات HERO، انحراف الحدود |
| نموذج الداشبورد | `lib/admin/homepage-hero.spec.ts` | المسودة، الترتيب، التحقق، خطة الحفظ، الحالة، الصور المؤقتة |
| الحفظ والتحميل | `hero-save.spec.ts`، `homepage-hero-load.spec.ts`، `hero-error-targets.spec.ts` | ترتيب الكتابات، الرفض بجانب حقله، حالات التحميل |
| المكوّنات | `homepage-hero-components.spec.tsx`، `homepage-hero-editor.spec.tsx` | لوحة المفاتيح، الشريط، بطاقة الزر، المعاينة، الحفظ والملخص |
| العقود | `interaction-state-contract.spec.ts` | حلقة التركيز وحالة الضغط لكل عنصر تفاعلي |
| حي | سكربت e2e المرحلة ٤ (خارج المستودع، نتائجه في §٢٧ من سجل التقدم) | السيناريوهات الثمانية، مطابقة المعاينة، axe، لوحة المفاتيح، INP |

---

## ٨. ما تعمّدنا عدم بنائه

- نظام مسودة ونشر ومراجعة للهيرو (دين في ADR-0084).
- ربط شريط الحدث بـcollection أحداث أو صفحة بطولة (ADR-0081 D2 مقترح).
- حركة الانتقال في المعاينة، واختيار الانتقال نفسه (قرار المالك بعد قياس fps).
- ترتيب أقسام الصفحة الرئيسية، وشرائح الفيديو (ADR-0082 مقترح).
- إدارة مكتبة الوسائط (الشاشة تختار وترفع بـ`MediaPicker` القائم).
- ملف e2e دائم للداشبورد: لا إعداد Playwright في `apps/dashboard`، وإضافته قرار بنية.

---

## ٩. المصطلحات

| المصطلح | المعنى |
| --- | --- |
| المسودة | حالة الشاشة غير المحفوظة، في الذاكرة فقط |
| الشريحة الظاهرة | `active: true` وداخل نافذة الجدولة (الحدّان شاملان) |
| نقطة التركيز | النقطة التي يُبقيها القص ظاهرة، نسبة مئوية من الصورة |
| `desktopLtr` | صورة النسخة الإنجليزية كما يحلها الـAPI من `ltrImageMode` |
| القلب | `ltrImageMode: mirror`: نفس الصورة معكوسة أفقيًا ونقطتها `100 − x` |
| صورة مؤقتة | `isAiGenerated: true` في مكتبة الوسائط، تحتاج استبدالًا |
| الإطار | معاينة الجهاز بعرضه الحقيقي داخل الشاشة، مصغّرة |
| الحالة المؤجلة | نسخة المسودة التي تتبعها المعاينة والشريط بعد الحقل بلحظة |

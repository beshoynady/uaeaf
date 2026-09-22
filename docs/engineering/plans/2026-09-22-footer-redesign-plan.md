# خطة تنفيذ — الفوتر: خريطة حيّة، ارتفاع الشاشة من `lg`، ومحرر في الداشبورد

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Steps use `- [ ]` for tracking.

**Goal:**
- خريطة Google حيّة داخل الفوتر، بنفس مكوّن `LocationMap`.
- شبكة 4 / 2 / 1.
- الفوتر بارتفاع الشاشة ناقص الهيدر من `lg` وأكبر فقط.
- محرر للفوتر تحت «الصفحة الرئيسية» في الداشبورد.
- إشارة للشركة المصمّمة NOTIME.

**Architecture:**
- **الـAPI:** الفوتر لا يملك إلا ما لا مصدر آخر له: الوصف، ونص الحقوق، وعناوين الأعمدة الثلاثة. هذه على `siteSettings`، الـsingleton الخاص بإطار الموقع العام (ADR-0077)، عبر مسار خاص `PUT /site-settings/footer`، بنفس نمط شريط الرعاة.
- **الويب:** كل ما يخص التواصل يُقرأ من `contactUsPage`، المصدر الواحد: المكان، والإحداثيات، والبريد، وساعات العمل، والقنوات وأيقوناتها.

**Tech Stack:** NestJS + Mongoose + Jest · Next.js 16 + next-intl + Tailwind v4 + Vitest · Playwright (المكتبة في الريبو؛ خادما chrome-devtools وplaywright MCP فشلا في الاتصال في هذه الجلسة).

**Spec:**
- رسالة المالك 2026-09-22 («إعادة تصميم الفوتر»).
- إضافته في نفس اليوم: «الشركة المصممة هي شركة NOTIME — https://notimehub.com/».

## Global Constraints

- شغل مباشر على `main`. Git للقراءة فقط (CLAUDE.md §33). الأوامر تُكتب نصًّا في التقرير.
- **TDD إلزامي:**
  - API: `npm test -- --runInBand <path>`.
  - الويب والداشبورد: `npx vitest run --pool=threads <files>`.
- **كتابة الكود:**
  - Arrow functions، وتحويل دوال كل ملف يُلمس (§30، مع الاستثناءات المذكورة هناك).
  - CSS logical properties إلزامية.
  - توكنز فقط.
  - الحل الأبسط.
- **خارج النطاق:**
  - تغيير عدد الأعمدة أو نظام الشبكة من الأدمن.
  - منطق رفع أيقونات السوشيال نفسه.
  - أي تعديل على صفحة اتصل بنا غير المرتبط بلينك الخريطة.
- **نقاط التوقف:**
  - تعارض حقيقي بين مبدأ موثّق والارتفاع الكامل على `lg`.
  - محرر يحتاج نمط تخزين مختلفًا جوهريًا.
  - أي ADR يغيّر مبدأً موثّقًا.

---

## ما وجده الفحص

| البند | النتيجة | المصدر |
|---|---|---|
| مواصفة فوتر في الـDesign System | **لا توجد.** لا `CMP-FOOTER` في أي فصل. الموجود: ADR-0061 (الاتجاه والزخارف من `xl`)، وADR-0063 D2 (عمودان فرعيان للروابط)، وADR-0064 (بطاقة الموقع رابط) | `docs/design-system/**` |
| التكوين المعتمد | Brand → Quick Links → Location → Contact، ثم شريط قانوني. تكوين Figma المعتمد (نسخة المالك اليدوية) | IA §8.3 [B]، ذاكرة `project_footer_new_approved_design` |
| الخريطة في الفوتر | IA §8.3 يسجّل عمود «Federation Location» بأنه **«Embedded map»** مبنيّ [B]. بطاقة الرابط كانت قرارًا مؤقتًا لأن العنوان لم يكن رسميًا (خطة الخريطة D8) | IA §8.3، خطة 2026-09-22 D8 |
| الشبكة | موجودة بالفعل: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`، مشتقة من Chapter 5 §5.2 ومحروسة باختبار | `site-footer.tsx:117`، `site-footer.test.tsx:127` |
| ارتفاع الشاشة | IA §12 [B]: «every public section is at least `calc(100svh - header)`». Chapter 5 لا يحدّد ارتفاعًا للفوتر، وقيده الوحيد هو 90vh للهيرو على الموبايل. القاعدة موجودة مرة واحدة: `.hero-first-screen` و`--header-height` (ADR-0078) | IA §12، Ch5 §5.10، `globals.css:98-122` |
| عتبة `lg` | `--breakpoint-lg: 1024px` في `packages/design-tokens`، وهي نفسها التي يستخدمها السايدبار (`lg:w-[264px]`) | `base.css:15`، `app-shell.tsx:102` |
| مصدر بيانات التواصل | `contactUsPage` هو «the single source of truth for site-wide contact display (footer, floating icons)»، ويشمل البريد والعنوان وساعات العمل والقنوات | `contact-us-page.schema.ts:153-164` |
| ما يعرضه الفوتر اليوم من غير مصدره | البريد `info@uaeaf.ae` ثابت في الكود. الساعات من الكتالوج «الأحد-الخميس، 08:00-15:00» والسجل يقول «الأحد – الخميس، ٨:٠٠ – ١٥:٠٠»، أي مصدران انجرفا فعلًا. القنوات من ثابت `SOCIAL_LINKS` والسجل فيه خمس قنوات | `site-footer.tsx:261,264,137`، API المحلي |
| محتوى الفوتر في النموذج المعتمد | `siteSettings.footerAboutBlurb` («Short 1-2 sentence federation description shown in the footer») و`copyrightText` موجودان في الـschema والـDTO والرد العام، **ولا يقرأهما الموقع** | `site-settings.schema.ts:58-64`، Mongoose Spec Domain 11 |
| نمط محرر إعداد عام تحت الصفحة الرئيسية | شريط الرعاة: sub-document على `siteSettings` + `PUT /site-settings/sponsor-strip` + DTO + method في الـservice + شاشة `/homepage/sponsor-strip` بـ`useRelationEditor` و`EditorFrame` | ADR-0077 D5، ADR-0085 D7 |
| أهداف اللمس | أزرار السوشيال في الفوتر 32px. سُجّلت كـ«its own finding» في `contact-social.tsx:115`. البروتوكول §14 وIA يطلبان ≥44px | البروتوكول §14، IA §12 cross-cutting |
| NOTIME | الموقع يسمّي نفسه **«No Time Hub»**، في `<title>` و`og:site_name` و16 موضعًا، وشعاره «Marketing made easy and fun». المالك كتب «NOTIME» | `notimehub.com`، جُلب 2026-09-22 |

**لا تعارض يوقف العمل:**
- الارتفاع الكامل من `lg` يطبّق نمطًا مسجّلًا في IA §12 على عرض أضيق.
- تحت `lg` يُستثنى الفوتر بأمر المالك الصريح، وهو الأولوية الأولى في §1.
- لا فصل في الـDesign System يقول غير ذلك.
- الاستثناء يُسجَّل في ADR-0092 وفي IA §12.

## تقييم لجنة التحكيم (Jury Protocol) لما طلبه المالك

| المقترح | الحكم | لماذا |
|---|---|---|
| خريطة حيّة في الفوتر | **RECOMMENDED WITH MODIFICATIONS** | IA §8.3 يسجّلها أصلًا، والعنوان صار رسميًا. الشروط: <br>• `loading="lazy"` يُقاس فعليًا لا يُفترض. <br>• لا بطاقة فوق الخريطة (تغطي دبوس Google، قرار D4 للخريطة). <br>• **مخاطر تُذكر ولا تمنع:** إطار Google في كل صفحة يوسّع ملفات تعريف الطرف الثالث من صفحة واحدة إلى الموقع كله، وبند Cookie Notice ما زال P0 مفتوحًا (IA §15.2). وعناصر التحكم داخل الإطار تضيف محطات Tab لقارئ لوحة المفاتيح لا نتحكم فيها. <br>• في `/contact` تظهر الخريطة مرتين (الصفحة + الفوتر)، وهذا مقبول لفوتر. |
| ارتفاع الشاشة من `lg` | **RECOMMENDED WITH MODIFICATIONS** | يضع الفوتر على إيقاع «شاشة لكل قسم» (IA §12). الشرط أن يذهب الفراغ إلى عنصر يزداد نفعًا بالحجم، أي الخريطة (مبدأ `PANEL_FILL` في `surface.ts`)، لا إلى padding ميت. وأن يكون `min-height` لا `height`. |
| إشارة NOTIME | **RECOMMENDED** | ممارسة معتادة، بشرط أن تكون أقل عنصر وزنًا في الفوتر: آخره في القراءة والـTab، بحجم caption وبلون muted. |

## Governance Check (البروتوكول §22)

- **الشخصية:** Institutional / Service. ختام هادئ للموقع.
- **اللون:** الـblack register (ADR-0059 §D2) كما هو.
- **الصورة:** لا صور؛ الخريطة محتوى.
- **الحركة:** Quiet. لا حركة جديدة؛ المتاح هو ما عند الروابط اليوم.
- **المكوّنات المُعاد استخدامها:** `LocationMap`، و`REGISTER_CLASSES.black`، و`FOCUS`/`TRANSITION`، ومنطق القنوات في `ContactSocial`، و`useRelationEditor`/`EditorFrame`، و`BilingualField`.

---

## القرارات

| # | القرار | السبب والمرجع |
|---|---|---|
| D1 | الأعمدة الأربعة المعتمدة بترتيبها: **الهوية + القنوات → روابط سريعة → الموقع (خريطة حيّة) → التواصل**، ثم الشريط السفلي: الحقوق · الروابط القانونية · NOTIME | التكوين المعتمد (IA §8.3، Figma، CLAUDE.md §3). ADR-0061 D1 يثبت الترتيب في الاتجاهين. «إعادة التنظيم في 4 أعمدة منطقية» تحققها هذه الأربعة من غير اختراع تكوين |
| D2 | الشبكة كما هي: 1 / `md:2` / `lg:4`، `xl:gap-12` | Chapter 5 §5.2، والاختبار الحالي |
| D3 | `LocationMap` كما هو، داخل إطار بحدّ الـregister و`radius-lg` و`min-h-[220px]`. من `lg` وأكبر يأخذ `flex-1`. المكان (`pinTitle`/`pinSubtitle`) تحت الخريطة لا فوقها. بلا إحداثيات: لا خريطة ولا إطار فارغ | 220px هي قيمة إطار خريطة صفحة اتصل بنا نفسها (`contact-map.tsx:141`). D4 لخطة الخريطة |
| D4 | `.footer-first-screen` في `globals.css` داخل `@variant lg`: `min-height: calc(100vh - var(--header-height))` ثم `calc(100svh - …)`. تحت `lg` لا قاعدة إطلاقًا | ADR-0078 (نفس الوحدات ونفس `--header-height`). `@variant lg` = توكن `--breakpoint-lg` نفسه الذي يستخدمه السايدبار. `min-height` لا `height`، فلا قصّ أبدًا |
| D5 | **التوازن داخل الـmin-height:** <br>• الفوتر `flex-col`. <br>• شبكة الأعمدة `lg:flex-1`، والصف يمتد. <br>• **إطار الخريطة يمتص الفراغ** (`lg:flex-1`). <br>• بقية الأعمدة تبدأ من أعلى، فتبدأ الأعمدة الأربعة من سطر واحد (عمود الهوية يبدأ باللوجو فوق الاسم). <br>• الشريط السفلي في القاع | مطابق للتوصية («flex/grid مع alignment مناسب من غير فراغ ميت»)، فلا يحتاج موافقة. مبدأ `PANEL_FILL`/`PANEL_ROW` في `surface.ts:66-94`: «The slack has to go somewhere deliberate… the map grows». محاذاة العناوين على خط واحد قياس ADR-0061 §3 |
| D6 | **مصادر المحتوى:** <br>• **`contactUsPage`:** المكان، والإحداثيات، و`map.directionsUrl`، و`googleMapsUrl`، والبريد، و`officeHours`، و`socialLinks` + أيقوناتها. <br>• **`siteSettings`:** `footerAboutBlurb`، و`copyrightText`، و`footerHeadings` (جديد)، ويرجع كلٌّ منها إلى نص الكتالوج الحالي إن كان فارغًا. <br>• **ثابت في الكود:** اسم الاتحاد، والروابط السريعة (مرآة التنقل، قرار 2026-09-07)، والروابط القانونية، ومركز المساعدة، وإشارة NOTIME | مصدر واحد لكل حقيقة (قرار المالك 2026-09-22، الخيار ب). الرجوع للكتالوج هو نمط `text(record.map?.title) ?? t("map.title")` |
| D7 | **إزالة التكرار:** <br>• عمود التواصل لم يعد يكرّر سطر العنوان، فهو تحت الخريطة في العمود المجاور وبنفس النص حرفيًا. <br>• البريد والساعات من السجل، ويُحذف `Footer.hours` والبريد الثابت. <br>• لا هواتف جديدة | لا يُفقد محتوى: العنوان باقٍ في الفوتر، والتكرار بجوار بعضه ضجيج. الهواتف لم تكن في الفوتر، وبياناتها غير محسومة (post-delivery-backlog §٤) |
| D8 | **القنوات:** <br>• من `contactUsPage.socialLinks`. <br>• منطق التحويل (رابط آمن، مفتاح المنصة، الأيقونة المرفوعة، الرسم المدمج) يُستخرج إلى وحدة مشتركة تستخدمها `ContactSocial` بلا أي تغيير في سلوكها. <br>• الأزرار 44px. <br>• الأيقونة المرفوعة تُرسم كاملة على أرضية محايدة داخل حدّ الـregister، وإلا يُرسم الرسم المدمج. <br>• رابط غير `https`/`http` يُسقط. <br>• بلا قنوات في السجل: لا صف | «استخدمه زي ما هو» (رفع الأيقونة). البروتوكول §14 (44×44). منع XSS عبر `javascript:` مطبّق أصلًا في `contact-social.tsx:45`. إعادة الاستخدام بدل نسخة ثانية |
| **D9** ✅ | **لينك «عرض الموقع على الخريطة» — وافق المالك 2026-09-22 على التوصية:** يصبح **«فتح الاتجاهات»** إلى `map.directionsUrl`، في تبويب جديد، ويظهر فقط إن كان الحقل مملوءًا | الخريطة صارت ظاهرة، فالرابط لنفس الخريطة في صفحة أخرى تكرار. الاتجاهات هي الفعل الذي لا تؤديه الخريطة المضمّنة جيدًا: رابطها داخل بطاقة Google صغير وغير مريح للوحة المفاتيح. وهو نفس فعل صفحة اتصل بنا (`Contact.map.openDirections`)، من الحقل نفسه |
| **D10** ✅ | **NOTIME:** <br>• آخر عنصر في الشريط السفلي. <br>• `text-caption` بلون muted. <br>• «تصميم: NOTIME» / «Designed by NOTIME». <br>• الاسم رابط إلى `https://notimehub.com/` (تبويب جديد، `rel="noopener"`، و`lang="en"` داخل العربي). <br>• ثابت في الكود لا يُعدَّل من الداشبورد. <br>• **الاسم «NOTIME»** كما كتبه المالك (موافقة 2026-09-22)، رغم أن الموقع يسمّي نفسه «No Time Hub» | أقل عنصر وزنًا: آخره في القراءة والـTab. 13px هو الحدّ الأدنى (Ch4). الاسم التجاري لا يُترجم، مثل أسماء اللغات في ADR-0061 D5. `noopener` يمنع tabnabbing ويُبقي الـreferrer. الإشارة التعاقدية ليست محتوى للاتحاد |
| D11 | **التخزين على `siteSettings`:** <br>• sub-document جديد `footerHeadings { quickLinks, location, contact }`، كلها LocalizedText أو null. <br>• مسار `PUT /site-settings/footer` بصلاحية `siteSettings:Update`. <br>• `FooterSettingsDto`، و`upsertFooter()` يكتب حقوله الثلاثة فقط، والرد العام يضيف `footerHeadings`. <br>• لا نوع مورد جديد، ولا تغيير في كتالوج الصلاحيات | نفس نمط شريط الرعاة حرفيًا، فلا نقطة توقف. الحقلان الموجودان يُستخدمان بدل إنشاء نسخة ثانية منهما |
| D12 | **محرر الداشبورد `/homepage/footer`:** <br>• آخر شاشات مجموعة «الصفحة الرئيسية»، بترتيب الصفحة: الفوتر آخرها. <br>• صلاحياته `siteSettings` Read وUpdate. <br>• أربع لوحات بترتيب أعمدة الفوتر في شبكة 1 / `xl:2`، ثم لوحة الشريط السفلي بعرض كامل. <br>• **يُعدَّل:** الوصف، والعناوين الثلاثة، والحقوق. <br>• **للقراءة فقط مع رابط لمصدرها:** القنوات، والمكان والإحداثيات، والبريد والساعات (إلى `/pages`، صفحة اتصل بنا). <br>• ملاحظة الروابط السريعة: «تتبع قائمة التنقل تلقائيًا» | «يعكس بنية الفوتر الفعلية» من غير كسر المصدر الواحد. الكتابة على `contactUsPage` من شاشة ثانية مستبعدة: `PUT` يستبدل المستند كاملًا، فشاشتان تكتبانه تمسح إحداهما عمل الأخرى. لم تُختر أربع لوحات متجاورة لأن `BilingualField` يضع العربي والإنجليزي جنبًا إلى جنب من `sm`، وداخل ربع عرض المحتوى (~260px) يضيق الحقلان. 2×2 هو تخطيط الفوتر نفسه على `md` |
| D13 | ADR-0092 جديد: <br>• يضيف قواعد، ولا يغيّر مبدأً موثّقًا. <br>• يُلغي جزئيًا D8 لخطة الخريطة (بطاقة الرابط) بأمر المالك. <br>• يسجّل استثناء الفوتر من IA §12 تحت `lg`. <br>• يضع قائمة PENDING FIGMA BACK-SYNC. <br>• ويُحدَّث IA §8.3 و§12 | بروتوكول §19 Phase 5، وسياسة المزامنة |
| **D14** ✅ | **الفحص الحي للـAPI:** إعادة بناء الـAPI على `:3000` وإعادة تشغيله — **أذن المالك 2026-09-22**. الخادم مشترك مع جلستين خاملتين (`uaeaf-project-a1`، `a8`) | ذاكرة `reference_shared_local_servers_sessions`: لا إيقاف لخادم مشترك بلا سؤال |

✅ = عُرض للموافقة ووافق المالك (2026-09-22). كل ما عداه يُنفَّذ بلا موافقة لأنه داخل التفويض.

---

## خريطة الملفات

**API**
- Modify: `api/src/modules/cms-page-composition/site-settings/schemas/site-settings.schema.ts` — `FooterHeadings` + `footerHeadings`
- Create: `api/src/modules/cms-page-composition/site-settings/dto/footer-settings.dto.ts` — `FooterHeadingsDto`, `FooterSettingsDto`
- Modify: `…/site-settings.service.ts` — `upsertFooter()`، `footerHeadings` في `getPublic()`
- Modify: `…/site-settings.controller.ts` — `PUT footer`
- Modify: `…/dto/site-settings-public-response.dto.ts` — `footerHeadings`
- Create: `…/site-settings/footer-settings.spec.ts`، `…/dto/footer-settings.dto.spec.ts`
- Modify: `api/openapi.json` (مولَّد)، `api/docs/api/public-api-contract.md`

**الويب**
- Create: `apps/web/src/lib/social-channels.ts` + `.spec.ts` — `socialChannels(links, icons)`
- Modify: `apps/web/src/components/pages/contact/contact-social.tsx` — يستخدم `socialChannels` (سلوك مطابق)
- Create: `apps/web/src/lib/pages/footer-content.ts` + `.spec.ts` — `loadFooterContent(locale)`، ويحلّ محل `footer-place.ts` و`footer-place.spec.ts` (يُحذفان)
- Modify: `apps/web/src/lib/api/types.ts` — `FooterHeadingsPublic`، `SiteSettingsFooterPublic`
- Modify: `apps/web/src/app/[locale]/globals.css` — `.footer-first-screen`
- Modify: `apps/web/src/lib/design-system/surface-standard.spec.ts` — حارس القاعدة
- Modify: `apps/web/src/components/layout/site-footer.tsx` + `site-footer.test.tsx` — إعادة البناء
- Modify: `apps/web/src/app/[locale]/layout.tsx` — `loadFooterContent`
- Modify: `apps/web/messages/ar.json`, `en.json` — `Footer`
- Create: `apps/web/e2e/footer.spec.ts` — الارتفاع والشبكة والفيض والتحميل الكسول عبر العروض

**الداشبورد**
- Modify: `apps/dashboard/src/lib/navigation.ts` + `navigation.spec.ts` — `HOMEPAGE_FOOTER_GRANTS`، `homepageFooter`
- Modify: `apps/dashboard/src/lib/icons/ui-icons.tsx` — أيقونة `homepageFooter`
- Create: `apps/dashboard/src/lib/admin/footer-settings.ts` + `.spec.ts` — `FooterDraft`، `fromFooterRecord`، `validateFooter`، `isFooterDirty`، `footerRequests`، `readFooterBody`، `loadFooter`
- Create: `apps/dashboard/src/app/api/admin/site-settings/footer/route.ts` + `footer-route.spec.ts`
- Create: `apps/dashboard/src/app/[locale]/(app)/homepage/footer/page.tsx`، `loading.tsx`
- Create: `apps/dashboard/src/components/admin/footer/footer-editor.tsx` + `.spec.tsx`
- Modify: `apps/dashboard/messages/ar.json`, `en.json` — `Nav.homepageFooter`، `FooterSettings`

**الوثائق**
- Create: `docs/design-system/ADR-0092-Footer-Live-Map-First-Screen-From-Lg-One-Source-Content-And-Footer-Settings.md`
- Modify: `docs/design-system/ADR-0064-…md` (سطر supersession)، `docs/product/01-Information-Architecture.md` §8.3 §12، `docs/product/07-Mongoose-Schema-Specification.md` (صف `footerHeadings`)

---

## المهام

### Task 1: API — إعدادات الفوتر على `siteSettings`

**Interfaces — Produces:**
- `PUT /api/v1/site-settings/footer`، بجسم:
  ```ts
  { footerAboutBlurb?: {ar,en} | null; copyrightText?: {ar,en} | null;
    footerHeadings?: { quickLinks?: {ar,en} | null; location?: {ar,en} | null; contact?: {ar,en} | null } | null }
  ```
- `GET /api/v1/site-settings/public` يضيف `footerHeadings: {quickLinks, location, contact} | null`.

- [x] **RED** `footer-settings.spec.ts`:
  - (1) يكتب `footerAboutBlurb`، و`copyrightText`، و`footerHeadings` وحدها، ومفاتيح الكتابة = هذه الثلاثة بالضبط.
  - (2) الغائب يُكتب `null`، لأن الشاشة ترسل الفوتر كاملًا.
  - (3) `upsert()` العام لا يسمّي `footerHeadings`، فلا يمسحها.
  - (4) `getPublic()` يعيد `footerHeadings`، و`null` حين لا شيء مخزَّن.

  `footer-settings.dto.spec.ts`:
  - (5) نصف زوج مرفوض.
  - (6) مفتاح غير معروف داخل `footerHeadings` مرفوض (`whitelist + forbidNonWhitelisted`).
  - (7) جسم فارغ مقبول.
- [x] تشغيل: `cd api && npm test -- --runInBand src/modules/cms-page-composition/site-settings` → FAIL
- [x] **GREEN**:
  - `FooterHeadings` schema (`_id: false`) + prop `footerHeadings` (default null).
  - الـDTOs بـ`@ValidateNested` و`@Type`.
  - `upsertFooter`.
  - `@Put('footer') @RequirePermission('siteSettings','Update')`.
  - الرد العام.
- [x] تشغيل حتى PASS. ثم:
  - `npx tsc --noEmit -p tsconfig.json`، لأن ts-jest لا يفحص الأنواع (ذاكرة).
  - `npm test -- --runInBand src/common src/modules/platform-administration`، لأن كتالوج الصلاحيات يُشتق من المصدر.
- [x] `npm run generate:openapi` وتحديث `public-api-contract.md`.

### Task 2: الويب — منطق القنوات المشترك

**Interfaces — Produces:**
```ts
export interface SocialChannel { href: string; name: string; known?: SocialLink; icon?: MediaAssetPublic }
export const socialChannels = (links: readonly ContactSocialLink[], icons: ReadonlyMap<string, MediaAssetPublic> | undefined, nameOf: (key: string) => string): SocialChannel[]
```

- [x] **RED** `social-channels.spec.ts`:
  - يسقط `javascript:`.
  - يطابق «Insta gram» مع `instagram`.
  - يرسم الأيقونة المرفوعة حين تُحلّ.
  - يسمّي المنصة غير المعروفة بكلمة المحرر.
- [x] **GREEN** بنقل الكود من `contact-social.tsx:41-85` كما هو، ثم استخدامه هناك.
- [x] `contact-social.spec.tsx` أخضر بلا تعديل، وهو دليل تطابق السلوك.

### Task 3: الويب — تحميل محتوى الفوتر

**Interfaces — Produces:**
```ts
export interface FooterContent {
  place: string | null; region: string | null;
  latitude: number | null; longitude: number | null;
  directionsUrl: string | null; googleMapsUrl: string | null;
  email: string | null; officeHours: string | null;
  channels: readonly ContactSocialLink[]; icons: ReadonlyMap<string, MediaAssetPublic>;
  aboutBlurb: string | null; copyright: string | null;
  headings: { quickLinks: string | null; location: string | null; contact: string | null };
}
export const loadFooterContent = async (locale: AppLocale): Promise<FooterContent>
export const EMPTY_FOOTER: FooterContent
```

- [x] **RED** `footer-content.spec.ts`:
  - يقرأ `/contact-us-page` و`/site-settings/public` بلغة الصفحة.
  - يطلب الأيقونات فقط حين يوجد `iconId`.
  - يعيد `EMPTY_FOOTER`-shaped nulls حين لا يُقرأ أيٌّ منهما.
- [x] **GREEN**، وحذف `footer-place.ts` و`.spec.ts`، وتحديث `layout.tsx`.

### Task 4: الويب — الفوتر نفسه

- [x] **RED** `surface-standard.spec.ts`، قاعدة `.footer-first-screen`:
  - موجودة.
  - كل تصريحاتها داخل `@variant lg`.
  - كلها `min-height`.
  - الأخير `100svh - var(--header-height)`.
  - لا تصريح خارج الـvariant.
- [x] **RED** `site-footer.test.tsx`، يُعاد كتابته. يغطي في اللغتين:
  - **الخريطة:**
    - iframe بعنوان `Contact.map.frameTitle`، على إحداثيات السجل، `loading="lazy"`، داخل عمود الموقع.
    - لا إطار بلا إحداثيات.
    - المكان تحت الخريطة.
    - لا رابط إلى `/contact#contact-map-heading`.
  - **التواصل:**
    - البريد من السجل `mailto:`.
    - الساعات من السجل.
    - لا سطر عنوان مكرر.
    - الكتالوج بلا `hours` ولا عنوان.
  - **القنوات:**
    - من السجل، 44px (`size-11`)، اسم متاح لكل قناة، `rel` فيه `noopener`.
    - الأيقونة المرفوعة تُرسم.
    - `javascript:` يسقط.
    - لا صف بلا قنوات.
  - **النصوص:**
    - الوصف والحقوق والعناوين من الإعدادات.
    - وإلا فمن الكتالوج.
  - **البنية:**
    - `contentinfo`.
    - `nav` الروابط السريعة بكل `FOOTER_QUICK_LINKS`.
    - `nav` القانونية.
    - أربعة أعمدة بترتيب D1.
    - الشبكة 1/`md:2`/`lg:4`/`xl:gap-12`، والفوتر يحمل `footer-first-screen`.
    - `lg:flex-1` على الشبكة وإطار الخريطة.
    - الزخارف الأربع `aria-hidden`.
  - **NOTIME:**
    - آخر رابط في الفوتر.
    - `href` و`target="_blank"` و`rel="noopener"` و`lang="en"`.
  - **D9:** حسب الموافقة.
- [x] تشغيل: `cd apps/web && npx vitest run --pool=threads src/components/layout/site-footer.test.tsx src/lib/design-system/surface-standard.spec.ts` → FAIL
- [x] **GREEN:**
  - القاعدة في `globals.css`.
  - `SiteFooter({ content }: { content?: FooterContent })`: non-async، بـ`useTranslations` و`useLocale`.
  - الرسائل ar/en.
- [x] كل مجموعة الويب + `npx tsc --noEmit` + `npx eslint .`

### Task 5: الداشبورد — محرر الفوتر

**Interfaces:**
- `HOMEPAGE_FOOTER_GRANTS = [{siteSettings, Read}, {siteSettings, Update}]`.
- `PUT /api/admin/site-settings/footer` → upstream `PUT /site-settings/footer`.
- `FooterDraft`:
  ```ts
  { footerAboutBlurb: {ar,en}; copyrightText: {ar,en};
    headings: { quickLinks: {ar,en}; location: {ar,en}; contact: {ar,en} } }
  ```
  كل النصوص strings، والفارغ = ''.
- `footerRequests(saved, draft)` يعيد `RelationRequest[]`.

- [x] **RED:**
  - `navigation.spec.ts`:
    - الفوتر آخر شاشات المجموعة.
    - مخفي بلا `siteSettings:Update`.
    - كل صلاحياته في كتالوج الـAPI.
  - `footer-settings.spec.ts`:
    - `fromFooterRecord` (null → فراغ).
    - `validateFooter`: نصف زوج → `pairIncomplete` على مساره.
    - `footerRequests`: لا طلب بلا تغيير، وطلب PUT واحد كامل مع تغيير، والفارغ يُرسل `null`.
    - `readFooterBody`: يأخذ الحقول الثلاثة فقط، ويرفض غير الكائن.
  - `footer-route.spec.ts`: يوجّه إلى المسار الصحيح، و400 لجسم غير صالح.
  - `footer-editor.spec.tsx`:
    - أربع لوحات بترتيب الفوتر + لوحة الشريط.
    - تعديل عنوان ثم حفظ يرسل الجسم الكامل.
    - المحتوى المصدّر للقراءة فقط، مع رابط `/pages`.
    - نصف زوج يمنع الحفظ ويُعلن في الملخّص.
- [x] **GREEN:**
  - navigation + icon + messages.
  - المكتبة، والـroute، والـpage (`holdsAll` → `RelationAccessDenied`، والتحميل → `RelationLoadFailed`)، والمكوّن بـ`useRelationEditor` + `EditorFrame` + `BilingualField`.
- [x] كل مجموعة الداشبورد + `tsc` + `eslint`

### Task 6: الوثائق

- [x] ADR-0092:
  - السياق، وD1–D14، والقياسات بعد الفحص الحي.
  - PENDING FIGMA BACK-SYNC: الخريطة الحيّة، والارتفاع من `lg`، وأزرار 44px، وسطر NOTIME، وعمود التواصل بلا العنوان.
- [x] ADR-0064: سطر «Superseded in part by ADR-0092 (footer card)».
- [x] IA §8.3 (المحتوى الجديد ومصادره) و§12 (الفوتر من `lg` فقط).
- [x] Mongoose Spec: صف `footerHeadings`.

### Task 7: الفحص الحي

- [x] `e2e/footer.spec.ts` (Playwright، على `:3001`): لكل عرض من 390 / 768 / 1024 / 1440 × ar/en × light/dark:
  - ارتفاع الفوتر ≥ `innerHeight − 96` على 1024 و1440، وأقل منه (طبيعي) على 390 و768.
  - `scrollWidth == clientWidth`.
  - عدد الأعمدة الفعلي 1 / 2 / 4 / 4.
  - العناوين على خط واحد من `lg`.
  - لا عنصر نص خارج صندوقه.
- [x] الشبكة:
  - الصفحة الرئيسية عند التحميل: صفر طلبات إلى `google.com/maps`.
  - بعد التمرير للفوتر: الطلب يحدث. تُسجَّل المسافة التي بدأ عندها.
- [x] الوصول:
  - تباين النصوص الجديدة على الـregister في الثيمات الثلاثة (من التوكنز المقاسة: `pairings.json`).
  - التركيز ظاهر بالـTab على كل رابط.
  - أسماء متاحة.
  - ترتيب القراءة.
- [x] لقطات في الـscratchpad فقط (ذاكرة `feedback_review_screenshots_scratchpad`)، ومراجعتها بالعين.
- [x] الداشبورد (بعد D14): حفظ عنوان من المحرر، ثم ظهوره في الفوتر بعد 65s (كاش 60s).

### Task 8: الإغلاق

- [x] المجموعات الثلاث كاملة: الأرقام الفعلية.
- [x] `tsc` و`eslint` للثلاثة.
- [x] إيقاف أي خادم شغّلته والتأكد من المنافذ (§32).
- [x] التقرير بالتسعة بنود + أوامر git.

---

## بعد التنفيذ (2026-09-22)

| البند | ما حدث |
|---|---|
| D3 | القياس الحي أثبت أن `loading="lazy"` وحده لا يحقق شرط المالك: Chromium طلب الخريطة عند التحميل والفوتر على بُعد 3741px تحت الشاشة. أُضيف `FooterMapFrame`، وهو يرسم `LocationMap` كما هو عندما يدخل إطاره الشاشة. بعدها: صفر طلبات عند التحميل، وأول طلب والإطار داخل الشاشة |
| D5 | الصياغة صُحّحت: الأعمدة الأربعة تبدأ من سطر واحد، لا العناوين. عمود الهوية يبدأ باللوجو |
| جديد | **DESIGN DECISION REQUIRED:** بالإنجليزية بين 1280 و1439 تمرّ الضربة الخضراء فوق نهاية سطر ساعات العمل. التفاصيل والخيارات في ADR-0092 |
| جديد | حارس `bareVh` في `surface-standard.spec.ts` كان يحمل بايتات تحكّم (0x08) لا تطابق شيئًا. صُحّح، وثبت أنه يفرّق بين `100vh` و`100svh` |

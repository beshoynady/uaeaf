# خطة تنفيذ — حارس أيقونات السوشيال، وصفحة الرسائل

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Steps use `- [x]` for tracking.

**Goal:**
- يرفع الأدمن أيقونة صغيرة لرابط سوشيال من غير ما يرفضها حارس صور الصفحات.
- صفحة «الرسائل» في الداشبورد تعرض رسائل فورم «أرسل لنا رسالة» وتدير حالتها.
- عداد جرس في الهيدر يعكس الرسائل الجديدة.

**Architecture:** لا collection جديد ولا محرك حالة جديد.
- **الرسائل:** `contactMessages` موجود بكل حقول الفورم، ومعه `status` (New / InProgress / Resolved / Closed). وثيقة الـschema المعتمدة تصف `status` بأنه «primary/owned field … deliberately outside the workflow list».
- **الأيقونات:** نفس خط رفع الوسائط، بغرض رفع اسمه `icon` حدّه الأدنى للأبعاد أصغر فقط.

**Tech Stack:** NestJS + Mongoose + Jest (ESM) · Next.js 16 + next-intl + Vitest · Playwright (المكتبة في الريبو) للفحص الحي.

**Spec:** رسالتا المالك 2026-09-21/22 (مهمة صفحة اتصل بنا + مهمة الحارس والرسائل، مدموجتان بطلبه).

---

## Global Constraints

- **Git للقراءة فقط.** أوامر `git add`/`git commit` نصًّا في التقرير.
- **TDD إلزامي على الـbackend**؛ `npm test -- --runInBand <path>` في `api/` (لا `npx jest`).
- **الحارس الأمني لا يُمس:** الأنواع المقبولة (PNG/JPEG/WebP من البايتات)، و`MAX_UPLOAD_BYTES`، و`MAX_PIXELS` كما هي. لا SVG.
- **Arrow functions**، logical properties فقط، توكنز فقط.
- **لا إرسال ردود** (خارج النطاق)؛ حقول الرد الموجودة لا تُعرض ولا تُكتب من الشاشة.

---

## القرارات (تُوثَّق ولا تُسأل — تفويض المالك 2026-09-22)

| # | القرار | السبب |
|---|---|---|
| G1 | الحارس الذي يمنع الأيقونة هو `MIN_EDGE = 200` (نوع أ: جودة/تصميم) | تعليقه نفسه: «The shortest edge … still be a **page image**. Below this it is an icon». النوع والحجم يقبلان PNG/WebP أصلًا |
| G2 | غرض رفع `purpose=icon` بحدّ أدنى `ICON_MIN_EDGE = 88` | أكبر رسم للأيقونة 44px (`size-11`) × كثافة 2، وقاعدة ADR-0086 D4: المصدر ضعف الحجم المرسوم |
| G3 | لا SVG | كان يستلزم فتح الحارس الأمني العام على كل رفع (نقطة توقف)؛ PNG/WebP تدعم الشفافية |
| M1 | حالة الرسالة = `status` الموجود، لا `workflowInstances` | المحرك محرك موافقات (approve/reject بمعتمِدين وسياسات)؛ المواصفة المعتمدة تجعل `status` حقلًا مملوكًا خارج قائمة الـworkflow عن قصد، و`workflowInstanceId` للتصعيد الرسمي فقط. لا بديل يُبنى |
| M2 | الحالات: جديدة (New) · قيد المعالجة (InProgress) · تم الحل (Resolved) · مؤرشفة (Closed) | الـenum الموجود كما هو؛ نوع الرسالة (شكوى/اقتراح/استفسار/عام) تصنيف مستقل عن الحالة |
| M3 | فتح رسالة «جديدة» يجعلها «قيد المعالجة» + Toast «عُلّمت كمقروءة» | «غير مقروءة» = New، فلا حالة قراءة ثانية تنحرف عنها |
| M4 | لا اختيار افتراضي عند فتح الصفحة | الاختيار التلقائي كان سيعلّم أحدث رسالة كمقروءة دون أن يفتحها أحد |
| M5 | تغيير الحالة فوري (لا مسودة ولا زر حفظ) + Toast | أزرار حالة لا نموذج؛ الخطأ Toast بنبرة error |
| M6 | الجرس جديد في الهيدر، عداده = عدد رسائل New، يظهر لمن يملك `contactMessages:Read` | لم يكن في الهيدر جرس. مجموعة `notifications` بلا توزيع حسب الصلاحية، وحالة قراءة ثانية فيها كانت ستنحرف عن `status`؛ العدّ من المصدر نفسه |
| M7 | PT-LISTDETAIL-001 يُمدَّد لصندوق وارد (ADR-0089 D2، ملاحظة) | طلب المالك؛ الاختلاف: سجلات مفتوحة العدد، الأحدث أولًا، لا مسودة ولا فعل جماعي |
| M8 | «الرسائل» عنصر في المستوى الأول بعد «الخطة الاستراتيجية»، مسار `/messages` | ملاحظة في IA §4.8 |
| M9 | شارة العداد = CMP-BADGE-001 `Numeric`، سقف «99+»، بلون `semantic-info` محدّدة لا معبّأة | الرسالة الجديدة ليست عاجلة (danger للعاجل). الرقم بـ`semantic-info-text` على السطح يقيس 5.30 فاتح / 5.17 داكن؛ الأبيض على info المعبّأ 4.30 تحت 4.5 |
| M10 | العداد يُقرأ في كل رسم للـlayout على الخادم، ويُحدَّث بعد كل تغيير حالة (`router.refresh`) — بلا polling | أبسط حل؛ الإشعار اللحظي (realtime) غير مبني في المنصة. رسالة تصل أثناء التنقّل تظهر في العداد عند أول إعادة تحميل أو تغيير حالة |
| M11 | قراءة العداد إن فشلت تُسقط الجرس لا الصفحة، وتُمرّر redirect الجلسة | الهيدر على كل شاشة؛ `unstable_rethrow` + اختبار mutation |

---

## المرحلة G — الحارس

### Task G1: API
**Files:** `media-assets/upload/upload-constraints.ts` (+spec) · `media-assets.service.ts` · `media-assets.controller.ts`
- [x] أحمر: `assertUploadable(file, { purpose: 'icon' })` يقبل 128×128 ويرفض 64×64 · صورة الصفحة ما زالت ترفض 150×150 · الغرض `icon` لا يفتح نوعًا غير مقبول.
- [x] تنفيذ: `ICON_MIN_EDGE`، معامل الغرض، `@Query('purpose')`.

### Task G2: الداشبورد
**Files:** `app/api/admin/media-assets/upload/route.ts` · `components/admin/pages/media-picker.tsx` (+spec) · `page-editor.tsx`
- [x] أحمر: منتقي بغرض `icon` يرفع إلى `…/upload?purpose=icon` · الـBFF يمرّر `icon` فقط.
- [x] تنفيذ؛ منتقي الأيقونة بـ`purpose="icon"` و`minSourcePx={88}`.

## المرحلة M — الرسائل

### Task M1: API
**Files:** `contact-messages.{service,controller,repository}.ts` · `dto/update-contact-message-status.dto.ts` (+specs)
- [x] أحمر: القائمة الأحدث أولًا · `updateStatus` يغيّر ويرفض المجهول (404) · `countNew` · DTO يرفض حالة خارج الـenum.
- [x] تنفيذ: `GET /contact-messages/summary` (قبل `:id`)، `PATCH /contact-messages/:id/status`.

### Task M2: منطق الداشبورد
**Files:** `lib/admin/contact-messages.ts` (+spec)
- [x] أحمر: الفلاتر والعدّ · `statusOnOpening` · تسميات الأنواع والحالات.

### Task M3: الشاشة
**Files:** `app/[locale]/(app)/messages/page.tsx` · `components/admin/messages/{message-inbox,message-board}.tsx` (+spec) · `app/api/admin/contact-messages/[id]/status/route.ts` · `lib/navigation.ts` (+spec) · `lib/icons/ui-icons.tsx` · الرسائل ar/en
- [x] أحمر: قائمة + تفاصيل · فلاتر بعددها · فتح رسالة جديدة يغيّرها + Toast · تغيير الحالة + Toast · خطأ + Toast · عنصر التنقل بصلاحية `contactMessages:Read`.

### Task M4: الجرس
**Files:** `components/shell/messages-bell.tsx` (+spec) · `app/[locale]/(app)/layout.tsx`
- [x] أحمر: العداد يظهر ويُقرأ اسمه («٣ رسائل جديدة») · لا عداد عند الصفر · لا جرس بلا صلاحية.

## التحقق الحي
- رفع أيقونة 128×128 لإنستغرام من المحرر، ظهورها في `/ar/contact`، ثم إزالتها.
- إرسال رسالة حقيقية من فورم `/ar/contact` ← زيادة عداد الجرس ← فتحها من `/ar/messages` ← تحوّلها «قيد المعالجة» مع Toast ← تغيير الحالة مع Toast ← نقص العداد.
- لقطات في الـscratchpad.

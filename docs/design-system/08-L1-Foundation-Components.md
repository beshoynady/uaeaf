# Chapter 8 — Component Inventory
## Level 1: Foundation Components

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L1 of 8) | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 2 (كل PR-XXX) · Chapter 3 (`DT-*`) · Chapter 4 (Typography) · Chapter 5 (Grid/Motion) · Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens — المصدر الوحيد المسموح للاستهلاك) | كل مستوى لاحق (L2-L8) · Chapter 11/12 (Patterns) · Chapter 20 (Templates) |

## Scope
**يغطي:** مكونات L1 Foundation فقط (Button, Icon Button, Link, Typography Components, Icon, Divider, Avatar, Badge, Chip, Spinner, Skeleton) — أبسط وحدات البناء التي لا تعتمد على أي مكوّن آخر.
**لا يغطي:** L2-L8 (تُوثَّق في ملفات/أقسام منفصلة لاحقة تحت نفس رقم الفصل).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Anatomy** | التشريح البصري لمكوّن — الأجزاء الفرعية التي يتكوّن منها (مثال: Button = Container + Label + Icon اختياري) |
| **Variant** | نسخة بديلة من نفس المكوّن بغرض مختلف (Primary/Secondary/Ghost) |
| **State** | حالة تفاعلية مؤقتة لنفس المكوّن (Hover/Disabled/Loading) — لا تُعتبر Variant |

## Purpose
هذا القسم أول تطبيق فعلي لكل قواعد الفصول 1-7 — كل قرار هنا (لون، حركة، تباعد) مُستهلَك من توكن موجود مسبقًا، لا قرار جديد.

---

## ADR-0012: Component Architecture Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision |
| **Context** | المشروع يستخدم React + Tailwind + shadcn/ui (Chapter 0 التقني)؛ يحتاج قرارًا معماريًا لبنية المكوّن نفسه قبل توثيق كل مكوّن فرديًا |
| **Decision** | كل مكوّن **MUST** يفصل بين **Behavior Layer** (المنطق والوصول) و**Presentation Layer** (المظهر). عند توفر Radix Primitive مناسب (Dialog, Popover, Dropdown Menu, Tabs...) **MUST** يُستخدم كأساس لطبقة السلوك. عند عدم وجود Primitive رسمي (مثل Button وTypography وDivider)، **MUST** يعتمد المكوّن على عناصر HTML الدلالية الأصلية أو Radix `Slot` (`asChild`)، مع الالتزام الكامل بمعايير الوصول في Chapter 6. جميع الأنماط البصرية **MUST** تُستهلك من Semantic Tokens (Chapter 7) فقط — لا مكوّن يحتوي قيمًا بصرية مكتوبة داخل منطقه |
| **Alternatives Considered** | بناء كل مكوّن من الصفر بدون أي مكتبة Behavior — رُفض (يكرر حل مشاكل الوصول المحلولة أصلاً في Radix حيثما توفّر، يخالف PR-008 Built to Scale) |
| **Why This Decision** | يفصل طبقة السلوك (Behavior Layer) عن طبقة التصميم (Presentation Layer)، ويستفيد من Radix Primitives حيثما توفرت، ويستخدم عناصر HTML الدلالية الأصلية عند عدم توفر Primitive رسمي — يضمن توافقًا مع WCAG (Chapter 6) دون ربط التصميم بمكتبة واحدة بشكل مطلق |
| **Risks** | Radix لا يغطي كل مكوّن مطلوب (مثل مكونات L8 الرياضية) — Mitigation: المكونات المخصصة تُبنى يدويًا لكن **MUST** تتبع نفس معايير الوصول الموثّقة في Chapter 6 يدويًا |
| **Consequences** | كل قسم "Related Components" أدناه يشير لأصل Radix المستخدم عند وجوده |

**قاعدة تسمية:** كل مكوّن معرَّف بـ`CMP-{NAME}-{NUMBER}` (Chapter 3/7 معيار التسمية) — مثال `CMP-BUTTON-001`.

---

## CMP-BUTTON-001 — Button

| القسم | التفاصيل |
|---|---|
| **Purpose** | الإجراء الأساسي القابل للنقر في أي واجهة — العنصر التفاعلي الأكثر استخدامًا في النظام كله |
| **Anatomy** | Container (خلفية + حدود اختيارية) ← Label (نص، يستهلك `typography.label` Chapter 7) ← Icon اختياري (يمين أو يسار حسب RTL/LTR) |
| **Variants** | `Primary` (خلفية `color.semantic.success`) · `Secondary` (حدود بلا خلفية) · `Ghost` (بلا خلفية ولا حدود) · `Danger` (`color.semantic.danger` — للحذف/الإلغاء فقط، Chapter 1 ADR-0004) · `Icon-only` |
| **Sizes** | `sm` (32px ارتفاع) · `md` (40px، افتراضي) · `lg` (48px) |
| **States** | Default · Hover (تغميق اللون عبر توكن `color.semantic.success.hover`) · Focus (`a11y.focus.ring`) · Active · Disabled (`opacity.disabled` من Chapter 3) · Loading (Spinner يستبدل Label، العرض ثابت لا يتغير) |
| **Content Rules** | نص الزر فعل واضح ("نشر"، لا "موافق") — يتبع Chapter 9 (سيُشار له عند كتابته) |
| **Behavior** | زر واحد `Primary` كحد أقصى لكل قسم شاشة (Chapter 2 §PR-001 Anti-Pattern) |
| **Keyboard Interaction** | `Enter`/`Space` يُفعِّل الزر · `Tab` للوصول إليه بالترتيب المنطقي (Chapter 6 §6.3) |
| **Accessibility** | عنصر `<button>` حقيقي دائمًا (Chapter 6 §6.13 Anti-Pattern: لا `<div onClick>`) · `aria-busy` أثناء Loading · `aria-disabled` عند الحاجة لتركيز توضيحي |
| **Responsive Behavior** | على الموبايل، أزرار الإجراء الأساسي في النماذج **SHOULD** تمتد لعرض كامل (`w-full`) لتحسين هدف اللمس (Chapter 6 §6.7: 44px) |
| **Design Tokens Used** | `color.semantic.success/danger` · `typography.label` · `motion.transition.default` (Chapter 5) · `a11y.focus.ring` · `radius.sm` (Chapter 3) |
| **Do & Don't** | Do: استخدم فعلًا واضحًا · Don't: لا تستخدم Danger كزر عادي (Chapter 1 ADR-0004) |
| **QA Checklist** | ☐ عنصر `<button>` حقيقي؟ ☐ حلقة Focus مرئية؟ ☐ حالة Loading لا تغيّر العرض؟ ☐ لا أكثر من Primary واحد في القسم؟ |
| **Related Components** | Implementation Reference: Native `<button>` + Radix `Slot` (`asChild`) + shadcn/ui Button Pattern (لا يوجد Radix Primitive رسمي باسم Button كما هو الحال في Dialog/Popover/Dropdown — تصحيح فني) · Icon Button (CMP-ICONBUTTON-001) · Link (CMP-LINK-001) |

**Component API Contract** *(مرجع نمطي لكل مكونات L1 التفاعلية — يُتبع بنفس الصيغة لأي مكوّن لاحق)*

| Property | Type | Required | Default |
|---|---|---|---|
| `variant` | `'primary'\|'secondary'\|'ghost'\|'danger'` | Yes | `'primary'` |
| `size` | `'sm'\|'md'\|'lg'` | No | `'md'` |
| `disabled` | `boolean` | No | `false` |
| `loading` | `boolean` | No | `false` |
| `iconLeft` / `iconRight` | `ReactNode` | No | `undefined` |

**Composition Rules:** يُسمح: `Icon + Text` · `Text` فقط · `Icon Only` (مع `aria-label` إجباري). **MUST NOT**: `Icon Left + Icon Right + Text` معًا في نفس الزر (تعقيد بصري بلا مبرر وظيفي — PR-001).

**State Priority (عند تعارض حالات متعددة):** `Loading` يُلغي `Hover` و`Active` (المستخدم لا يتفاعل مع عملية جارية) لكن **MUST** تبقى `Focus Ring` ظاهرة إن كان الزر لا يزال هو العنصر النشط بالكيبورد. `Disabled` يُلغي كل الحالات التفاعلية الأخرى بلا استثناء.

**Disabled Behavior (محدَّد بدقة):** `disabled` **MUST** يُطبِّق الثلاثة معًا وليس `opacity` فقط: `cursor: not-allowed` + `pointer-events: none` + `opacity: var(--opacity-disabled)` (Chapter 3).

**Loading Behavior (تفصيل CLS):** Width **MUST** يبقى ثابتًا · Height **MUST** يبقى ثابتًا · Label **MUST NOT** يقفز أو يختفي فجأة (Spinner يحل محل موضع النص بنفس المساحة المحجوزة مسبقًا).

**RTL Behavior:** `iconLeft` في LTR يصبح تلقائيًا على يمين النص في RTL (لا "Left" حرفيًا — الاسم دلالي على الترتيب المنطقي البصري `inset-inline-start`، Chapter 6 §CSS Logical Properties)، والعكس لـ`iconRight`.

**Animation Reference:** Hover/Focus transitions **MUST** تستخدم `motion.transition.default` (=`DT-MOTION-DURATION-BASE` + `DT-MOTION-EASING-STANDARD`، Chapter 5 §5.6) — **MUST NOT** `transition: all` العام (يخالف ADR-0009 GPU-only).

**Error Prevention (قواعد Product):** `Danger` variant **MUST NOT** يُستخدم داخل قسم Hero احتفالي · `Ghost` **MUST NOT** يُستخدم للإجراء الأساسي الوحيد في الشاشة · `Secondary` **MUST NOT** يُستخدم لإجراء حذف (فقط `Danger`).

**Component Maturity:** `Stable` (v1.0)

## CMP-ICONBUTTON-001 — Icon Button

| القسم | التفاصيل |
|---|---|
| **Purpose** | إجراء ثانوي مضغوط بلا نص مرئي (مثال: إغلاق Modal، قائمة خيارات) |
| **Anatomy** | Container دائري/مربع ← Icon فقط (بلا Label) |
| **Variants** | Ghost (افتراضي) · Filled (للتأكيد البصري) |
| **Sizes** | `sm` (32×32) · `md` (40×40) · `lg` (48×48) — يطابق أهداف اللمس Chapter 6 §6.7 كحد أدنى |
| **States** | نفس Button (Default/Hover/Focus/Active/Disabled) |
| **Content Rules** | لا نص مرئي؛ **MUST** `aria-label` وصفي دائمًا |
| **Behavior** | يُستخدم فقط عند وضوح الأيقونة دلاليًا (أيقونة "X" للإغلاق مفهومة عالميًا)؛ إن لم تكن الأيقونة واضحة، **MUST** إضافة Tooltip (CMP لاحق) |
| **Keyboard Interaction** | مطابق لـButton |
| **Accessibility** | `aria-label` إلزامي (Chapter 6 §6.4 Accessible Names) — بدونه Anti-Pattern مباشر |
| **Responsive Behavior** | لا يتغير الحجم بين الشاشات — الحد الأدنى 44×44px ثابت |
| **Design Tokens Used** | نفس Button + `icon.size.md` (Chapter 3) |
| **Do & Don't** | Do: أضف `aria-label` دائمًا · Don't: لا تستخدمه لإجراء أساسي مهم (استخدم Button مع Label) |
| **QA Checklist** | ☐ `aria-label` موجود؟ ☐ الحجم ≥44×44px؟ |
| **Related Components** | Button (CMP-BUTTON-001) · Tooltip (يُوثَّق في L4 Feedback) |

## CMP-LINK-001 — Link

| القسم | التفاصيل |
|---|---|
| **Purpose** | تنقل بين صفحات/موارد — ليس إجراءً (الفرق الجوهري عن Button) |
| **Anatomy** | نص فقط ← تسطير عند Hover (لا افتراضيًا، للحفاظ على PR-001 Clarity) |
| **Variants** | `Inline` (داخل فقرة نصية) · `Standalone` (رابط مستقل، "اقرأ المزيد") |
| **Sizes** | يرث حجم النص المحيط (لا حجم مستقل) |
| **States** | Default · Hover (تسطير + تغيير لون خفيف) · Focus · Visited (اختياري، `SHOULD NOT` يُستخدم لروابط الأخبار المتكررة الزيارة) |
| **Content Rules** | نص الرابط يصف الوجهة، لا "اضغط هنا" |
| **Behavior** | **MUST** عنصر `<a href>` حقيقي دائمًا، لا `<span onClick>` (يخالف Semantic HTML) |
| **Keyboard Interaction** | `Enter` للتفعيل، `Tab` للوصول |
| **Accessibility** | رابط لفتح تبويب جديد **MUST** يُعلن ذلك (`aria-label` يتضمن "يفتح في نافذة جديدة") |
| **Responsive Behavior** | لا تغيير — النص يتدفق طبيعيًا |
| **Design Tokens Used** | `color.text.link` (Semantic — Chapter 7 §7.2 Inheritance من `color.text.primary`) |
| **Do & Don't** | Do: استخدم `<a>` حقيقي · Don't: لا تصمم Link ليبدو كـButton أو العكس (يربك المستخدم عن نوع الإجراء) |
| **QA Checklist** | ☐ عنصر `<a>` حقيقي مع `href` صالح؟ ☐ واضح بصريًا أنه رابط لا زر؟ |
| **Related Components** | Button (CMP-BUTTON-001) — التمييز البصري بينهما إلزامي |

## CMP-TYPOGRAPHY-001 — Heading / Text Components

| القسم | التفاصيل |
|---|---|
| **Purpose** | تطبيق مقياس Chapter 4 كمكونات React قابلة لإعادة الاستخدام بدل كتابة CSS يدويًا في كل مكان |
| **Anatomy** | `<Heading level={1-6}>` يُصيّر `<h1>-<h6>` تلقائيًا · `<Text variant="body|caption|label">` يُصيّر `<p>` أو `<span>` |
| **Variants** | يطابق حرفيًا مستويات Chapter 4 §4.4 (Display XL → Overline) |
| **Sizes** | لا حجم مستقل — الحجم محدَّد بالـvariant فقط |
| **States** | لا حالات تفاعلية (عنصر عرض ثابت) |
| **Content Rules** | يتبع Chapter 4 §4.6 Reading Rules وChapter 9 (لاحقًا) |
| **Behavior** | `<Heading>` **MUST** يحافظ على التسلسل الهرمي الدلالي الصحيح (لا `<h1>` بعده `<h3>` مباشرة بدون `<h2>`) — Chapter 6 §6.4 |
| **Keyboard Interaction** | لا ينطبق (غير تفاعلي) |
| **Accessibility** | التسلسل الهرمي الصحيح **MUST** — أساس تنقل قارئ الشاشة بين العناوين (Landmark Navigation) |
| **Responsive Behavior** | يتبع القيم المزدوجة (Desktop/Mobile) من Chapter 4 §4.4 تلقائيًا عبر `clamp()` أو Breakpoint |
| **Design Tokens Used** | كل `typography.*` Semantic Tokens (Chapter 7 §7.5) |
| **Do & Don't** | Do: حافظ على التسلسل الهرمي · Don't: لا تستخدم `<Heading>` لمجرد الحصول على حجم خط كبير بصريًا فقط (استخدم `<Text size="lg">` بدلاً) |
| **QA Checklist** | ☐ التسلسل الهرمي منطقي؟ ☐ لا حجم خط حر خارج Chapter 4 §4.4؟ |
| **Related Components** | كل مكوّن آخر تقريبًا يستهلك هذا المكوّن داخليًا |

## CMP-ICON-001 — Icon

| القسم | التفاصيل |
|---|---|
| **Purpose** | تمثيل بصري مضغوط لمفهوم أو إجراء (Chapter 1 §8 Icons مرجع مبدئي — يُفصَّل هنا) |
| **Anatomy** | SVG بسُمك خط ثابت 1.5px (مكتبة Lucide Icons) |
| **Variants** | `Outline` (افتراضي، متوافق مع الطابع الحديث) — لا `Filled` إلا لحالة "مُحدَّد/نشط" استثنائية |
| **Sizes** | 16 / 20 / 24 / 32px فقط — لا مقاسات حرة (نفس منطق §4.4 Type Scale) |
| **States** | يرث لون النص المحيط (`currentColor`) — لا لون مستقل خاص به |
| **Content Rules** | لا نص داخل الأيقونة أبدًا |
| **Behavior** | أيقونات اتجاهية (سهم التالي/رجوع) تنعكس تلقائيًا في RTL؛ أيقونات غير اتجاهية (ميدالية، ساعة) لا تنعكس (Chapter 6 §6.9 مبدأ عام) |
| **Keyboard Interaction** | غير تفاعلي بمفرده (يُستخدم داخل Button/Icon Button) |
| **Accessibility** | أيقونة وظيفية مستقلة **MUST** `aria-label` (Chapter 6 §6.8) · أيقونة زخرفية **MUST** `aria-hidden="true"` |
| **Responsive Behavior** | لا تغيير |
| **Design Tokens Used** | `icon.size.*` (Chapter 3 `DT-ICON-SIZE-*`) |
| **Do & Don't** | Do: استخدم Lucide حصريًا لضمان اتساق سُمك الخط · Don't: لا تخلط أيقونات من مكتبات مختلفة (يكسر PR-009 Consistency) |
| **QA Checklist** | ☐ من Lucide حصريًا؟ ☐ `aria-hidden` أو `aria-label` حسب السياق؟ |
| **Related Components** | مكونات الرياضة المخصصة (L8) تبني فوق نفس نظام الأيقونات |

## CMP-DIVIDER-001 — Divider

| القسم | التفاصيل |
|---|---|
| **Purpose** | فصل بصري خفيف بين مجموعات محتوى دون استخدام مساحة بيضاء وحدها |
| **Anatomy** | خط أفقي/عمودي بسُمك `DT-BORDER-WIDTH-DEFAULT` |
| **Variants** | `Horizontal` (افتراضي) · `Vertical` (داخل Toolbar مثلاً) |
| **Sizes** | لا يوجد (يمتد بعرض/ارتفاع الحاوية) |
| **States** | لا حالات (عنصر ثابت) |
| **Content Rules** | لا محتوى |
| **Behavior** | زخرفي بحت — لا وظيفة تفاعلية |
| **Keyboard Interaction** | لا ينطبق |
| **Accessibility** | `role="separator"` أو `aria-hidden="true"` حسب كونه دلاليًا (يفصل أقسامًا منطقية) أو زخرفيًا بحتًا |
| **Responsive Behavior** | لا تغيير |
| **Design Tokens Used** | `border.default` (Chapter 7) |
| **Do & Don't** | Do: استخدمه لفصل منطقي واضح · Don't: لا تستخدمه بدل Spacing (Chapter 3 §Spacing) لمجرد "الفراغ يبدو قليلاً" |
| **QA Checklist** | ☐ `aria-hidden` أو `role="separator"` مناسب للسياق؟ |
| **Related Components** | يُستخدم داخل Card، List، Menu (لاحقًا) |

## CMP-AVATAR-001 — Avatar

| القسم | التفاصيل |
|---|---|
| **Purpose** | تمثيل بصري لشخص (لاعب، مدرب، موظف) — صورة أو أحرف أولى بديلة |
| **Anatomy** | Container دائري (`radius.full`) ← صورة أو Fallback (أحرف أولى + خلفية لونية) |
| **Variants** | `Photo` · `Initials Fallback` (عند غياب الصورة) · `Icon Fallback` (لحالات عامة بلا هوية محددة) |
| **Sizes** | `xs`(24px) · `sm`(32px) · `md`(40px) · `lg`(56px) · `xl`(96px، لصفحات ملف اللاعب التفصيلية) |
| **States** | لا حالات تفاعلية بمفرده (قد يكون داخل زر قابل للنقر) |
| **Content Rules** | Fallback الأحرف الأولى: أول حرفين من الاسم الكامل |
| **Behavior** | عند فشل تحميل الصورة، **MUST** التحول لـFallback تلقائيًا وبسلاسة (لا أيقونة "صورة مكسورة"). **Fallback Chain الرسمية:** `Photo` → (فشل التحميل/404) → `Initials Fallback` → (لا اسم متاح) → `Icon Fallback` (أيقونة شخص عامة) |
| **Keyboard Interaction** | لا ينطبق (ما لم يكن داخل عنصر تفاعلي) |
| **Accessibility** | `alt` وصفي لصورة اللاعب الحقيقية (اسم اللاعب) — Chapter 6 §6.8 |
| **Responsive Behavior** | لا تغيير في النسبة، فقط الحجم حسب السياق |
| **Design Tokens Used** | `radius.full` · ألوان خلفية Fallback من مجموعة `color.avatar.*` (Semantic، مشتقة من Brand — يُحسم نطاقها في Chapter 7 لاحقًا لو احتجنا تنويعًا) |
| **Do & Don't** | Do: وفّر Fallback دائمًا · Don't: لا صورة مكسورة ظاهرة أبدًا |
| **QA Checklist** | ☐ Fallback يعمل فعليًا عند غياب الصورة؟ ☐ `alt` وصفي؟ |
| **Related Components** | Athlete Card (L8) يستهلك هذا المكوّن مباشرة |

## CMP-BADGE-001 — Badge

| القسم | التفاصيل |
|---|---|
| **Purpose** | مؤشر حالة صغير ملحق بعنصر آخر (رقم إشعارات، حالة "جديد") |
| **Anatomy** | Container صغير مستدير الحواف ← رقم أو نقطة أو نص قصير جدًا |
| **Variants** | `Dot` (نقطة فقط، بلا رقم) · `Numeric` (رقم، يُقصَّر لـ"99+" فوق 99) · `Status` (نص قصير كـ"جديد") |
| **Sizes** | `sm` فقط عمومًا — Badge بطبيعته صغير دائمًا |
| **States** | لا حالات تفاعلية |
| **Content Rules** | نص قصير جدًا (كلمة واحدة أو رقم) |
| **Behavior** | يلتصق بزاوية العنصر الأب (Icon Button مثلاً) دون كسر تخطيطه |
| **Keyboard Interaction** | لا ينطبق |
| **Accessibility** | **MUST** يُعلن ضمن `aria-label` للعنصر الأب ("إشعارات، 5 جديدة") لا كعنصر منفصل بمعزل عن السياق |
| **Responsive Behavior** | لا تغيير |
| **Design Tokens Used** | `color.semantic.danger` (للإشعارات العاجلة) أو `color.semantic.info` |
| **Do & Don't** | Do: اربطه دلاليًا بالعنصر الأب دائمًا · Don't: لا يكون مصدر معلومة وحيدًا (Chapter 6 §6.2 — لا اعتماد على اللون/الشكل وحده) |
| **QA Checklist** | ☐ مرتبط بـ`aria-label` للعنصر الأب؟ |
| **Related Components** | Icon Button، Tab (L3)، Chip |

## CMP-CHIP-001 — Chip

| القسم | التفاصيل |
|---|---|
| **Purpose** | وسم مضغوط قابل للعرض أو الإزالة (فلتر نشط، تصنيف لعبة فرعية للاعب) |
| **Anatomy** | Container مستدير الحواف كاملاً (`radius.full`) ← نص ← أيقونة إزالة اختيارية |
| **Variants** | `Static` (عرض فقط) · `Removable` (بزر X) · `Selectable` (قابل للتفعيل/الإلغاء كفلتر) |
| **Sizes** | `sm` · `md` |
| **States** | Default · Selected (خلفية ممتلئة) · Disabled |
| **Content Rules** | نص قصير (كلمة أو كلمتين) |
| **Behavior** | `Removable` **MUST** يُصدر حدث إزالة واضح، مع تأكيد بصري فوري (لا تأخير) |
| **Keyboard Interaction** | `Selectable`: `Enter`/`Space` للتبديل؛ `Removable`: `Backspace` عند التركيز (نمط شائع لحقول الوسوم) |
| **Accessibility** | `Selectable` **MUST** `aria-pressed` يعكس الحالة؛ زر الإزالة **MUST** `aria-label="إزالة {اسم الوسم}"` |
| **Responsive Behavior** | مجموعة Chips **SHOULD** تلتف (`flex-wrap`) لا تفيض أفقيًا بدون Scroll مخفي |
| **Design Tokens Used** | `color.semantic.*` حسب الحالة · `radius.full` |
| **Do & Don't** | Do: وفّر `aria-label` واضح لكل زر إزالة · Don't: لا تستخدمه كبديل لـButton لإجراء أساسي |
| **QA Checklist** | ☐ `aria-pressed`/`aria-label` صحيحة؟ ☐ الالتفاف يعمل بدل Overflow؟ |
| **Related Components** | Filter Bar (L7) يستهلك Chip بكثافة |

## CMP-SPINNER-001 — Spinner / Loader

| القسم | التفاصيل |
|---|---|
| **Purpose** | إشارة تحميل قصيرة المدى (أقل من ~2 ثانية متوقعة) — راجع Chapter 5 §Skeleton لتفضيل الحالات الأطول |
| **Anatomy** | دائرة دوّارة بحركة مستمرة |
| **Variants** | `Inline` (داخل زر) · `Standalone` (وسط منطقة تحميل) |
| **Sizes** | `sm`(16px، داخل زر) · `md`(24px) · `lg`(40px) |
| **States** | حركة مستمرة واحدة فقط — لا حالات أخرى |
| **Content Rules** | لا نص عادة؛ **MAY** نص مرافق لعمليات أطول ("جاري التحميل...") |
| **Behavior** | حركة `Infinite Loop` مستمرة — الاستثناء الوحيد المسموح به لقاعدة "لا حركة بلا نهاية" (Chapter 5 §Anti-Patterns) لأنها تشرح حالة انتظار فعلية مستمرة |
| **Keyboard Interaction** | لا ينطبق |
| **Accessibility** | `role="status"` + `aria-live="polite"` (Chapter 6 §6.4 Live Regions) — **MUST** يُلغى دورانه بصريًا مع `prefers-reduced-motion` لكن يبقى ظاهرًا ثابتًا (لا يختفي، الوظيفة تبقى مفهومة) |
| **Responsive Behavior** | لا تغيير |
| **Design Tokens Used** | `motion.duration.*` (دوران مستمر) · `color.semantic.info` |
| **Do & Don't** | Do: استخدمه للعمليات القصيرة فقط · Don't: لا تستخدمه لتحميل صفحة كاملة أو جدول (استخدم Skeleton) |
| **QA Checklist** | ☐ `role="status"` موجود؟ ☐ يبقى ثابتًا (لا دوران) مع Reduced Motion؟ |
| **Related Components** | Skeleton (CMP-SKELETON-001) — البديل المفضّل للتحميل الأطول |

## CMP-SKELETON-001 — Skeleton

| القسم | التفاصيل |
|---|---|
| **Purpose** | معاينة تقريبية لشكل المحتوى أثناء التحميل — يقلل الإحساس بالانتظار مقارنة بـSpinner فارغ (Chapter 0 Discovery: مفضَّل للمحتوى متوقع الشكل) |
| **Anatomy** | مستطيلات/دوائر رمادية بنبضة خفيفة (Pulse) تحاكي شكل المحتوى الفعلي القادم (نص، صورة، بطاقة) |
| **Variants** | `Text Line` · `Avatar Circle` · `Card Block` · `Table Row` |
| **Sizes** | تطابق أبعاد المحتوى الحقيقي المتوقع تمامًا (لا حجم عشوائي) |
| **States** | نبضة مستمرة واحدة فقط |
| **Content Rules** | لا محتوى فعلي |
| **Behavior** | **MUST** يُستبدل فورًا بالمحتوى الفعلي دون قفزة تخطيط (CLS، Chapter 0) — الأبعاد **MUST** مطابقة تمامًا لمساحة المحتوى القادم |
| **Keyboard Interaction** | لا ينطبق |
| **Accessibility** | `aria-busy="true"` على الحاوية الأم أثناء ظهوره؛ النبضة **MUST** تُلغى مع Reduced Motion (تبقى رمادية ثابتة) |
| **Responsive Behavior** | يطابق تخطيط المحتوى الحقيقي على كل Breakpoint |
| **Design Tokens Used** | `color.surface.skeleton` (Semantic) · `motion.duration.slow` للنبضة |
| **Do & Don't** | Do: طابق الأبعاد تمامًا لمنع CLS · Don't: لا تستخدم Skeleton لعملية أقل من ثانية واحدة (استخدم Spinner أو لا شيء) |
| **QA Checklist** | ☐ الأبعاد مطابقة للمحتوى الحقيقي؟ ☐ صفر CLS عند الاستبدال؟ ☐ `aria-busy` موجود؟ |
| **Related Components** | Spinner (للتحميل القصير) · Table، Card (تستهلكه لاحقًا في L5) |

---

## Component Relationship Graph (L1 → المستويات اللاحقة)

```
Button
  ├── Icon Button (يشارك Anatomy/States)
  ├── Split Button (L4، مستقبلي)
  └── Menu Button (L5، مستقبلي)

Typography Components
  ├── Card (L5)
  ├── Table (L5)
  ├── Dialog (L4)
  └── Hero (Chapter 20)

Avatar
  ├── Athlete Card (L8)
  ├── Coach Card (L8)
  └── Comment/Activity Feed (L7)

Icon
  └── يُستهلك داخل كل مكوّن تفاعلي تقريبًا (Button, Chip, Badge, Alert...)
```

## Visual Density (حسب طبقة التجربة — Chapter 0 ADR-0001)

| المكوّن | Public Experience | Operational Experience (Dashboard) |
|---|---|---|
| Badge | `Normal` (مساحة مريحة) | `Compact` (كثافة معلومات أعلى) |
| Chip | `md` افتراضي | `sm` افتراضي |
| Button | `md`/`lg` (بروز بصري) | `sm`/`md` (كفاءة مساحة) |

## Component Maturity States
كل مكوّن يحمل حالة نضج: **Stable** (جاهز إنتاج، هذا المستوى بالكامل) · **Experimental** (قيد الاختبار، غير موصى به للإنتاج) · **Deprecated** (له بديل، فترة سماح — يتبع منطق Chapter 3 §Token Deprecation Policy لكن للمكونات). كل مكوّنات L1 حاليًا: **Stable v1.0**.

## Design ↔ Code Mapping (يمهّد لـChapter 21)

```
Figma Component ("Button / Primary")
    ↓
Storybook ID ("button/primary", "button/loading", "button/danger")
    ↓
React Component (<Button variant="primary" />)
    ↓
npm Package (@uaeaf/ui)
```
كل مكوّن L1 **SHOULD** يحمل Storybook ID مطابق لاسمه بصيغة `{component}/{variant}` لضمان قابلية التتبع بين التصميم والتنفيذ.


## Do & Don't (مستوى L1 عام)
**Do:** ابدأ أي مكوّن جديد بمراجعة هل L1 يحتوي بالفعل ما تحتاجه · التزم بالقالب الـ14 قسمًا حرفيًا لكل مكوّن جديد
**Don't:** لا تنشئ مكوّنًا مكررًا لوظيفة موجودة (PR-011 Backlog Note — Chapter 2) · لا تكسر ADR-0012 (كل مكوّن Headless + Tokens منفصلة)

## Success Metrics
- 11/11 مكونات L1 مكتملة بالقالب الكامل
- 0 استخدام لقيم CSS Hardcoded داخل أي Component
- 100% من Components تستخدم Semantic Tokens فقط (لا Primitive/Brand مباشرة — Chapter 7 §7.7)
- 100% من المكونات التفاعلية تجتاز Chapter 6 §6.12 QA Checklist

## References
Native HTML Elements · Radix UI Primitives · Radix `Slot` · shadcn/ui · Lucide Icons · WAI-ARIA Authoring Practices · WCAG 2.2 · Chapter 1-7 (كل الأساس)

## Related Chapters
كل الفصول 1-7 (الاستهلاك المباشر) · L2 Forms (يعتمد على Button/Icon هنا) · Chapter 9 (Content Rules التفصيلية لاحقًا)

---

*نهاية L1 Foundation Components (11/11). التالي: L2 Forms Components.*

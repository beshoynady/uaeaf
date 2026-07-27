# Chapter 8 — Component Inventory
## Level 2: Forms Components (Form Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L2 of 8) | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق — **MUST NOT** تعديل مباشر على محتوى هذا الفصل خارج هاتين الآليتين.

> **قاعدة تجميد (Baseline Freeze):** Chapter 8 Framework (L1 + Global Component Governance + ADR-0001→0013) مجمَّد كـBaseline v1.0. أي حاجة جديدة أثناء كتابة L2–L8 **MUST** تُسجَّل في Backlog أو تُحل عبر ADR جديد لاحقًا — **MUST NOT** تعديل الـBaseline مباشرة أثناء التنفيذ (يمنع Moving Target).

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Button, Icon, Typography) · Chapter 8 Global Governance (G.1-G.12، ADR-0012/0013) | L3-L8 (أنماط إدخال مشابهة) · Chapter 11 (UX Patterns: Wizard, CRUD Forms) · Chapter 13 (CMS Forms) |

## Scope
**يغطي:** L2 كـ**Form Foundation** كاملة — لا عناصر إدخال فقط، بل العقود العامة لكل نموذج في النظام (تركيب الحقل، دورة حياة التحقق، عرض الأخطاء، التحكم/عدم التحكم) + 23 مكوّن إدخال فردي كتطبيقات لهذه العقود.
**لا يغطي:** أنماط النماذج المركّبة (Wizard متعدد الخطوات → Chapter 11)، فورمات CMS المتخصصة (→ Chapter 13).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Field** | الوحدة الكاملة: Label + Input + Help Text + Error Message معًا — لا الـInput وحده |
| **Validation Lifecycle** | التسلسل الزمني الذي تُفحص فيه صحة القيمة (وقت الكتابة/عند الخروج/عند الإرسال) |
| **Read-only** | القيمة مرئية وغير قابلة للتعديل لكن **قابلة للتحديد والنسخ** |
| **Disabled** | العنصر غير تفاعلي بالكامل، عادة قيمة غير ذات صلة بالسياق الحالي |

## Purpose
هذا القسم "Form Foundation" هو **العقد الوحيد** لسلوك النماذج في كل المنصة — كل مكوّن إدخال فردي أدناه **MUST** يشير له، لا يعيد تعريف Label أو Error أو Required بطريقته الخاصة.

---

## ADR-0014: Forms Architecture & Validation Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision |
| **Context** | 23 مكوّن إدخال قادمة، تحتاج استراتيجية تحقق (Validation) وإدارة حالة موحّدة قبل توثيق أي مكوّن فردي، وإلا كل مكوّن سيبتكر نمطه الخاص |
| **Decision** | كل حقل **MUST** يدعم **Controlled Mode** كخيار أساسي (يتوافق مع G.9، Chapter 8 Governance)، مع توافق مباشر (لا Wrapper إضافي) مع مكتبات إدارة نماذج شائعة (React Hook Form كمرجع تنفيذي). التحقق (Validation) **MUST** يحدث بصريًا عند `blur` افتراضيًا (لا أثناء الكتابة — Chapter 6 §6.5)، مع إمكانية `onChange` اختياريًا لحالات خاصة (تأكيد كلمة مرور فورًا مثلاً). **قاعدة API موحّدة (MUST):** كل مكوّن Controlled **MUST** يعرض قيمته الأساسية عبر `onChange(value)` مباشرة (القيمة نفسها، لا الحدث الخام) — أحداث DOM الخام **MAY** تُعرض إضافيًا عبر `onChangeEvent` منفصل فقط عند الحاجة الفعلية، لا كسلوك افتراضي يُعاد اختراعه في كل مكوّن |
| **Alternatives Considered** | فرض مكتبة Form State واحدة (مثل Formik) داخل الـDesign System نفسه — رُفض لأنه يقيّد اختيار التطبيق المستهلك للنظام؛ الأفضل توفير Contract (Props/Callbacks) متوافق مع أي مكتبة |
| **Why This Decision** | يفصل "شكل الحقل" (هذا الفصل) عن "منطق إدارة حالة النموذج بالكامل" (مسؤولية التطبيق) — يحافظ على PR-008 Built to Scale |
| **Risks** | حقول معقدة (Date Range، File Upload) قد تحتاج حالة داخلية أكثر من حقل بسيط. Mitigation: §Form Foundation §Validation Lifecycle يوثّح الاستثناءات المسموحة لكل نوع حقل |
| **Consequences** | كل مكوّن إدخال أدناه **MUST** يلتزم بنفس الصيغة (`value`/`onChange` أو `defaultValue`، `error`، `required`) |

---

## Form Foundation — الأقسام المشتركة (يرثها كل مكوّن أدناه)

### F.1 Field Composition
كل حقل = `<Field>` Compound Component (Chapter 8 G.11): `<Field.Label>` + `<Field.Control>` (الـInput الفعلي) + `<Field.HelperText>` + `<Field.Error>`. **MUST** ترتيب DOM هذا ثابت عبر كل الحقول — لا حقل يعرض الخطأ فوق الـLabel مثلاً.

### F.2 Validation Philosophy
`blur` هو نقطة التحقق الافتراضية (Chapter 6 §6.5: لا إزعاج قارئ الشاشة أثناء الكتابة). **الاستثناء الوحيد المسموح:** حقول تأكيد فورية (تطابق كلمة مرور، توفر اسم مستخدم) **MAY** تتحقق أثناء الكتابة (`onChange`) بشرط تأخير (`debounce`) ≥300ms.

#### F.2.1 Field State Model
كل حقل **MUST** يمر منطقيًا عبر نفس التسلسل، بصرف النظر عن نوعه — هذا الأساس الذي تُبنى عليه Error Message وSuccess Message وCharacter Counter وWizard (Chapter 11) لاحقًا دون كل منها يخترع حالته الخاصة:
```
Pristine (لم يُلمَس بعد) → Dirty (تغيّرت قيمته) → Touched (فقد التركيز مرة واحدة على الأقل) → Validated (اجتاز/فشل التحقق) → Submitted (جزء من إرسال ناجح)
```
**تعريف دقيق لـDirty (MUST):** `Dirty` يمثّل **الفرق عن القيمة الأولية (`defaultValue`)** في أي لحظة، لا مجرد "هل كتب المستخدم شيئًا من قبل". لو المستخدم عدّل الحقل ثم أعاده يدويًا لنفس القيمة الأصلية، الحقل **MUST** يعود `Dirty=false` تلقائيًا — المقارنة حيّة ومستمرة، لا Flag ثابت يُفعَّل مرة واحدة.

**Field Identity (MUST):** هوية الحقل (المرتبطة بحالته الداخلية Dirty/Touched/Value) **MUST** تبقى ثابتة عبر إعادة العرض (Re-renders) طالما لم يتغيّر الحقل منطقيًا — تغيير `key` في React **MUST NOT** يُستخدم كوسيلة لإعادة تعيين حالة الحقل ضمنيًا (يُسبب فقدان حالة غير متوقع)؛ استخدم `reset()` الصريح من §F.11 بدلاً من ذلك.

#### F.2.2 Async Validation Contract
للتحقق غير المتزامن (توفر اسم مستخدم، وجود بريد إلكتروني، البحث عن رقم قيد اتحادي) — حالات موحّدة **MUST** تُستخدم بدل كل مكوّن يخترع Loading خاصًا به:
```
Idle → Loading (Spinner صغير داخل الحقل، Chapter 8 L1) → Success | Error | Cancelled
```
**MUST** أي طلب تحقق جديد يُلغي (Cancel) الطلب السابق غير المكتمل لنفس الحقل — يمنع سباق النتائج (Race Condition) حيث تصل نتيجة قديمة بعد نتيجة أحدث.

### F.3 Error Handling & Presentation
رسالة الخطأ **MUST** وصفية كاملة (Chapter 9 لاحقًا يوسّع الصياغة) ومرتبطة بالحقل عبر `aria-describedby` (Chapter 6 §6.5). **MUST NOT** الاعتماد على اللون الأحمر وحده — أيقونة تحذير **MUST** ترافق النص دائمًا (Chapter 6 §6.2).

### F.4 Required Field Indicator
علامة `*` بعد الـLabel + `aria-required="true"` معًا دائمًا (لا أحدهما بمعزل عن الآخر). **SHOULD** نص توضيحي عام أعلى النموذج ("الحقول المعلّمة بـ* إلزامية") لمرة واحدة بدل تكراره.

### F.5 Help Text Rules
نص مساعد **MUST** يظهر أسفل الحقل دائمًا (لا Tooltip كبديل وحيد — Tooltip لا يظهر لمستخدمي اللمس بسهولة). **SHOULD** جملة واحدة قصيرة، لا فقرة.

### F.6 Disabled vs Read-only (تمييز حاسم)
| | Disabled | Read-only |
|---|---|---|
| قابل للتركيز بالكيبورد | لا | نعم |
| قابل للتحديد/النسخ | لا | **نعم** |
| السبب النموذجي | غير متاح في السياق الحالي (مثال: حقل يعتمد على اختيار سابق لم يُحدَّد بعد) | قيمة معروضة للعلم فقط (مثال: رقم قيد اللاعب بعد الاعتماد) |
| الحالة البصرية | معتم (`opacity.disabled`) | خلفية محايدة مميزة، بلا تعتيم |

### F.7 Controlled vs Uncontrolled Forms
راجع ADR-0014 وChapter 8 Governance §G.9 — كل حقل يدعم كلا النمطين حيثما كان منطقيًا؛ حقول عديمة القيمة الداخلية (نادرة في L2) معفاة.

### F.8 Keyboard Model (عام لكل الحقول)
`Tab`/`Shift+Tab` للتنقل بين الحقول · `Enter` **MUST NOT** يُرسل النموذج تلقائيًا من داخل `Textarea` (فقط من حقول نصية بسيطة أو زر الإرسال الصريح) · جميع الحقول تتبع Chapter 6 §6.3 Tab Order المنطقي.

### F.9 Form Accessibility Rules
كل ما سبق يطبّق Chapter 6 §6.5 Forms Accessibility حرفيًا؛ هذا القسم لا يكرره، بل هو التطبيق العملي المباشر له على مستوى النموذج الكامل (لا الحقل الواحد فقط) — مثال: ترتيب التنقل بالكيبورد يجب أن يعكس الترتيب المنطقي للنموذج ككل لا كل حقل بمعزل.

### F.10 Form Submission Contract
المرجع الوحيد لدورة حياة إرسال أي نموذج في المنصة — يُستهلك لاحقًا من Wizard (Chapter 11)، CMS (Chapter 13)، تسجيل الدخول، وأي Workflow Form مستقبلي:
```
Client Validation → Async Validation (إن وُجدت، §F.2.2) → Submit → Pending → Success | Failure
```
**MUST** زر الإرسال يدخل حالة `Loading` (Chapter 8 L1 Button) فور الضغط، **MUST NOT** يُسمح بالضغط المتكرر أثناء `Pending`. عند `Failure`، **MUST** رسالة خطأ عامة على مستوى النموذج (لا فقط أخطاء الحقول الفردية) توضّح سبب الفشل إن كان غير مرتبط بحقل معيّن (خطأ شبكة مثلاً).

**إدارة التركيز بعد فشل الإرسال (MUST، WAI-ARIA Best Practice):** التسلسل الإلزامي هو `Focus → Error Summary → أول حقل غير صالح` — لا يبقى التركيز على زر الإرسال، ولا يُنقل مباشرة لأول حقل بدون ملخّص أخطاء يوضّح العدد الكلي أولاً.

### F.14 Server-side Validation Mapping
أخطاء التحقق القادمة من الخادم (مثال: `422 email already exists`) **MUST** تُربط تلقائيًا بحقلها المقابل كلما أمكن (عبر اسم الحقل في استجابة الـAPI). الأخطاء غير المرتبطة بحقل معيّن (تفويض، شبكة، فشل خادم عام) **MUST** تظهر في Error Summary على مستوى النموذج (§Form Submission Contract أعلاه)، لا تُفقَد أو تُهمَل.

### F.11 Form Reset Contract
عند إعادة تعيين النموذج (Reset):
- كل الحقول **MUST** تعود للقيمة الأولية (`defaultValue`)
- أخطاء التحقق **MUST** تُمسح بالكامل
- طلبات التحقق غير المتزامن المعلّقة (§F.2.2) **MUST** تُلغى
- حالتا Dirty وTouched (§F.2.1) **MUST** تعودان لـPristine
- التركيز **SHOULD** يعود لأول حقل تفاعلي، إلا إذا حدّد الـWorkflow خلاف ذلك صراحة (مثال: إبقاء التركيز على زر الإجراء في بعض حالات Wizard)

### F.12 Autofill Contract
**MUST** قيم التعبئة التلقائية من المتصفح (كلمة مرور، بريد، عنوان) تُطلق نفس دورة حياة التحقق (§F.2) كما لو كتبها المستخدم يدويًا — لا استثناء للـAutofill. **MUST** يبقى التصميم متسقًا بصريًا تحت أنماط Autofill الافتراضية للمتصفح (لا تعارض ألوان صارخ مع خلفية Autofill الصفراء الشائعة في Chrome مثلاً).

### F.13 IME Composition Rule
**MUST NOT** تنفيذ أي تحقق (Validation) أثناء جلسة تركيب حروف نشطة (IME Composition Session) — مهم لإدخال العربية بالـKeyboards المركّبة وأي لغة تعتمد IME (صيني، ياباني، كوري). يُكتشف عبر أحداث `compositionstart`/`compositionend` القياسية، لا حل مخصص لكل حقل.

---

## القالب الموحّد لكل مكوّن L2 (ثابت من الآن حتى L8)
Purpose · Anatomy · Variants · Sizes · States · Content Rules · Behavior · Keyboard Interaction · Accessibility · Responsive Behavior · Design Tokens Used · API Contract · Composition Rules · **Validation Rules** (خاص بـL2) · **Related Governance** (إشارة لـForm Foundation + Chapter 8 Governance بدل التكرار) · QA Checklist · Related Components

**صيغة "Related Governance" الموحّدة (إلزامية من L3 فصاعدًا):**
```
Related Governance:
• Form/Level Foundation (§X.1–X.N ذات الصلة تحديدًا)
• Chapter 8 Global Governance (§G.1–G.12 ذات الصلة تحديدًا)
```
*(في L2 أدناه استُخدمت صيغة نصية مختصرة مكافئة للمعنى نفسه؛ الصيغة النقطية أعلاه تصبح المعيار الحرفي الملزم بدءًا من L3 لضمان اتساق بصري كامل عبر الوثيقة)*

---

# Core Inputs

## CMP-INPUT-001 — Input (Text)
**Purpose:** إدخال نص من سطر واحد — الحقل الأكثر استخدامًا في كل النظام. **Anatomy:** `<Field>` كامل (§F.1) + `<input type="text">`. **Variants:** `Default` · `With Icon` (بادئة/لاحقة) · `Clearable` (زر مسح). **Sizes:** `sm`/`md`/`lg` (يطابق Button، Chapter 8 L1). **States:** Default/Focus/Filled/Error/Disabled/Read-only (§F.6). **Behavior:** التحقق عند `blur` (§F.2). **API Contract:** `id`, `name`, `value`/`defaultValue`, `onChange`, `error: string`, `required: boolean`, `disabled`, `readOnly`, `placeholder`, `autoComplete` (جزء من عقد الوصول أيضًا — Chapter 6 §6.5، لا Props تجميلية فقط). **Validation Rules:** `error` prop يُفعِّل `<Field.Error>` تلقائيًا ويربطه بـ`aria-describedby`. **Related Governance:** Form Foundation كاملة + G.9/G.10/G.12. **QA Checklist:** ☐ Label مرتبط؟ ☐ Error مرتبط بـaria-describedby؟

## CMP-TEXTAREA-001 — Textarea
**Purpose:** إدخال نص متعدد الأسطر (وصف نادٍ، ملاحظات إدارية). **Anatomy:** مطابق لـInput + قابلية تغيير الارتفاع (`resize: vertical` فقط، لا أفقي يكسر الشبكة Chapter 5). **Variants:** `Fixed Height` · `Auto-grow` (يتمدد مع المحتوى حتى حد أقصى). **Sizes:** يُحدَّد بعدد الأسطر (`rows={3|5|8}`) لا بـsm/md/lg. **States:** مطابقة لـInput. **Behavior:** `Enter` **MUST NOT** يُرسل النموذج (§F.8). **API Contract:** مطابق لـInput + `rows`, `autoGrow: boolean`, `maxLength`. **Related Governance:** Form Foundation. **QA Checklist:** ☐ لا Resize أفقي؟

## CMP-LABEL-001 — Label
**Purpose:** عنصر مستقل قابل لإعادة الاستخدام (رغم أنه جزء من `<Field>` عادة، قد يُستخدم منفردًا). **Anatomy:** `<label>` نصي + علامة إلزامي اختيارية (§F.4). **Behavior:** **MUST** `for`/`htmlFor` يطابق `id` الحقل دائمًا — الرابط الدلالي هو أساس Chapter 6 §6.5. **Related Governance:** §F.4.

## CMP-FIELD-001 — Field (Wrapper)
**Purpose:** المكوّن المركّب (Compound) الذي يجمع Label+Control+HelperText+Error في ترتيب DOM ثابت (§F.1) — الأساس الذي تُبنى عليه كل الحقول أعلاه وأدناه. **Composition Rules:** `<Field>` **MUST** يعرض `children` بترتيب حر داخليًا لكن الترتيب المرئي النهائي (Label→Control→Help→Error) **MUST** ثابتًا بصريًا (Chapter 8 G.11). **MUST** يولّد `id` فريدًا وثابتًا تلقائيًا عند عدم توفيره صراحة، لضمان صحة علاقات `aria-*` (Label↔Control↔Error) في كل الحالات دون اعتماد على تذكّر المطوّر. **Related Governance:** Form Foundation بالكامل مُطبَّقة هنا مركزيًا.

## CMP-HELPERTEXT-001 — Helper Text
**Purpose:** تطبيق §F.5 كمكوّن مستقل قابل لإعادة الاستخدام. **Anatomy:** نص صغير (`typography.caption`، Chapter 4) أسفل الحقل. **Related Governance:** §F.5.

---

# Selection

## CMP-CHECKBOX-001 — Checkbox
**Purpose:** اختيار ثنائي أو متعدد (اختيار أكثر من فئة عمرية لفلتر مثلاً). **Anatomy:** مربع + علامة صح عند التحديد + Label بجانبه (يمين في RTL). **Variants:** `Default` · `Indeterminate` (تحديد جزئي لمجموعة فرعية). **Sizes:** `md` فقط عادة (لا تنويع كبير مطلوب). **States:** Unchecked/Checked/Indeterminate/Disabled. **Keyboard Interaction:** `Space` للتبديل. **API Contract:** `checked`/`defaultChecked`, `onCheckedChange`, `indeterminate: boolean`. **Related Governance:** G.9 (Controlled/Uncontrolled)، G.12.

## CMP-RADIOGROUP-001 — Radio Group
**Purpose:** اختيار واحد من مجموعة متعددة الخيارات المتنافية (مثال: نوع البطولة). **Anatomy:** `<RadioGroup>` أب يحتوي عدة `<Radio>`. **Behavior:** اختيار واحد **MUST** يُلغي الباقي تلقائيًا داخل نفس المجموعة (`name` مشترك). **Keyboard Interaction:** أسهم الاتجاه (`↑↓`) للتنقل بين الخيارات داخل المجموعة، لا `Tab` بين كل خيار فرديًا (نمط WAI-ARIA القياسي لـRadio Group). **API Contract:** `value`/`defaultValue` على مستوى المجموعة لا كل Radio فرديًا. **Related Governance:** G.9، G.11 (Compound Component).

## CMP-SWITCH-001 — Switch
**Purpose:** تبديل حالة فورية (تفعيل/تعطيل نادٍ، تبديل Dark Mode). **الفرق عن Checkbox:** Switch يُطبِّق الأثر **فورًا** بلا زر "حفظ" منفصل عادة؛ Checkbox جزء من نموذج يُرسَل لاحقًا — تمييز سلوكي مهم للمطور. **Anatomy:** مسار أفقي + مقبض دائري متحرك. **Behavior:** الحركة تتبع Chapter 5 §5.6 (`motion.transition.fast`). **Keyboard Interaction:** `Space`/`Enter`. **API Contract:** مطابق لـCheckbox (`checked`, `onCheckedChange`). **Related Governance:** G.9، G.12، Chapter 5 (Motion).

---

# Choice

## CMP-SELECT-001 — Select
**Purpose:** اختيار واحد من قائمة معروفة مسبقًا (نادٍ من قائمة الأندية المسجّلة). **Anatomy:** حقل مغلق يعرض القيمة المختارة ← يفتح قائمة عند التفعيل. **Variants:** `Native` (لأبسط الحالات، أداء أعلى) · `Custom` (مصمَّم بالكامل، لدعم أيقونات/تنسيق داخل الخيارات). **Behavior:** القائمة **MUST** تُغلق بـ`Esc` أو النقر خارجها (Chapter 6 §6.3). **Keyboard Interaction:** أسهم الاتجاه للتنقل، `Enter` للاختيار، الكتابة السريعة (Type-ahead) للقفز لخيار يبدأ بحرف معيّن. **API Contract:** `value`/`defaultValue`, `onChange`, `options: {label, value}[]`. **Related Governance:** G.9، G.12.

## CMP-COMBOBOX-001 — Combobox
**Purpose:** اختيار من قائمة طويلة مع إمكانية الكتابة للتصفية (اختيار لاعب من مئات اللاعبين). **الفرق عن Select:** Combobox قابل للكتابة، Select للاختيار المباشر فقط. **Anatomy:** حقل نصي + قائمة منسدلة تُصفّى أثناء الكتابة. **Behavior:** التصفية **SHOULD** تكون Client-side لقوائم <500 عنصر، Server-side (بحث فعلي) لما هو أكبر (يتكامل مع Chapter 16 AI Search مستقبلاً). **Keyboard Interaction:** مطابق لـSelect + الكتابة الحرة. **Related Governance:** G.9، G.12، Chapter 3 §Performance (Debounce للبحث).

## CMP-AUTOCOMPLETE-001 — Autocomplete
**Purpose:** حالة خاصة من Combobox تقترح نتائج من مصدر بيانات خارجي (بحث عن نادٍ بالاسم). **الفرق عن Combobox:** Autocomplete المصدر ديناميكي/بعيد دائمًا (API)؛ Combobox قد يكون قائمة ثابتة محليًا. **Behavior:** **MUST** حالة Loading أثناء انتظار النتائج (Chapter 8 L1: Spinner). **Related Governance:** يبني فوق CMP-COMBOBOX-001 مباشرة (لا يعيد تعريف نفس السلوك).

---

# Numeric & Date

## CMP-NUMBERINPUT-001 — Number Input
**Purpose:** إدخال قيم رقمية فقط (وزن اللاعب، الرقم القياسي). **Anatomy:** Input + أزرار زيادة/نقصان اختيارية (Stepper). **Variants:** `With Stepper` · `Plain`. **Behavior:** **MUST** رفض الإدخال غير الرقمي فوريًا (لا انتظار حتى `blur`) — استثناء وحيد عن §F.2 لأنه تحقق نوع بيانات لا تحقق قاعدة عمل. **ملاحظة:** سلوك قبول/رفض الرموز الخاصة (`-`, `.`, `,`, `e`) وقواعد الفصل العشري/الآلاف **يعتمد على استراتيجية التحليل (Parsing Strategy) الموثّقة في Chapter 19 (Calendar & Localization)** — غير مُعرَّف حرفيًا هنا لتفادي تعارض سلوك بين المتصفحات. **API Contract:** `min`, `max`, `step` بالإضافة لعقد Input القياسي. **Related Governance:** Form Foundation + استثناء §F.2 موثَّق هنا صراحة.

## CMP-SLIDER-001 — Slider
**Purpose:** اختيار قيمة (أو مدى) من نطاق مرئي (فلتر نطاق عمري بصري بديل للحقول الرقمية). **Anatomy:** مسار أفقي + مقبض (أو مقبضين لمدى). **Keyboard Interaction:** أسهم الاتجاه لتغيير القيمة بخطوات `step`. **Accessibility:** **MUST** `role="slider"` مع `aria-valuenow/min/max` محدَّثة حيًا. **Related Governance:** G.12.

## CMP-DATEPICKER-001 — Date Picker
**Purpose:** اختيار تاريخ واحد (تاريخ ميلاد لاعب، تاريخ فعالية) — يستهلك نظام التقويم من Discovery Phase (ميلادي أساسي، هجري اختياري بجانبه). **Anatomy:** Input + تقويم منبثق عند التفعيل. **Behavior:** **MUST** قابل للتوسع لدعم تقويم هجري بجانب الميلادي مستقبلاً دون إعادة تصميم (قرار Discovery الأصلي). **ملاحظة Timezone:** كل تاريخ **MUST** يُخزَّن ويُرسَل للخادم بصيغة UTC/Local موحّدة (التفاصيل الكاملة في Chapter 19) — المكوّن نفسه يعرض التاريخ بتوقيت المستخدم المحلي دائمًا. **قاعدة حاسمة:** القيم من نوع "تاريخ فقط" (Date-only، بلا وقت — مثل تاريخ ميلاد لاعب) **MUST** تبقى مستقلة عن المنطقة الزمنية بالكامل (لا تحويل UTC/Local عليها إطلاقًا)؛ تحويل المنطقة الزمنية **MUST** يُطبَّق فقط على قيم Date-Time الكاملة (وقت بداية فعالية). **Keyboard Interaction:** أسهم الاتجاه للتنقل بين الأيام داخل التقويم المنبثق، `PageUp/PageDown` للشهر التالي/السابق (نمط WAI-ARIA القياسي لـDate Picker). **Related Governance:** G.12، Chapter 19 (Calendar & Localization — لاحقًا).

## CMP-TIMEPICKER-001 — Time Picker
**Purpose:** اختيار وقت (وقت بداية فعالية). **Anatomy:** مشابه لـDate Picker لكن بعجلات/قوائم ساعة-دقيقة. **Related Governance:** يبني فوق نفس أساس CMP-DATEPICKER-001.

## CMP-DATERANGEPICKER-001 — Date Range Picker
**Purpose:** اختيار نطاق تاريخين (فترة بطولة من-إلى). **Anatomy:** تقويمان جنبًا لجنب أو تقويم واحد بتحديد بداية/نهاية. **Behavior:** **MUST** منع اختيار تاريخ نهاية قبل تاريخ البداية (تحقق منطقي فوري، لا عند `blur`). **سياسة رسمية:** عند اختيار المستخدم تاريخًا أقدم من البداية الحالية كـ"نهاية"، النظام **MUST** يعيد تعيين الاختيار كبداية جديدة (يبدأ نطاقًا جديدًا) — **MUST NOT** التبديل التلقائي الصامت بين البداية والنهاية (يربك توقع المستخدم). **Related Governance:** يبني فوق CMP-DATEPICKER-001.

---

# Upload

## CMP-FILEUPLOAD-001 — File Upload
**Purpose:** رفع ملفات عامة (مستندات، شهادات طبية للاعبين). **Anatomy:** منطقة Drag & Drop + زر تصفح تقليدي كبديل دائمًا (لا Drag & Drop وحده — لا يعمل بالكيبورد). **States:** Idle/Dragging/Uploading (Progress Bar)/Success/Error/**Retry** (حالة قابلة للاستعادة بعد Error — إعادة محاولة نفس الملف دون إجبار المستخدم على اختياره من جديد). **Accessibility:** **MUST** زر `<input type="file">` حقيقي مخفي بصريًا يبقى قابلاً للوصول بالكيبورد وقارئ الشاشة خلف منطقة الـDrag & Drop المصممة. **ملاحظة أمان:** فحص الفيروسات، التحقق من نوع الملف الفعلي (MIME) لا الامتداد فقط، الحد الأقصى لعدد الملفات، ومنع التكرار — **Security validation delegated to Chapter 17 (Data Privacy & Identity Architecture)**، لا تُنفَّذ هذه الفحوصات في طبقة العرض. **Related Governance:** G.3 (Performance — حجم الملف الأقصى يُحدَّد ويُعرض للمستخدم قبل الرفع)، G.12.

## CMP-IMAGEUPLOAD-001 — Image Upload
**Purpose:** حالة خاصة من File Upload بمعاينة الصورة فورًا. **الفرق:** يعرض Thumbnail بعد الاختيار مباشرة قبل اكتمال الرفع. **Behavior:** **MUST** ضغط/تغيير حجم الصورة من جهة العميل قبل الرفع حيثما أمكن (يخدم Chapter 5 Performance). **Related Governance:** يبني فوق CMP-FILEUPLOAD-001.

## CMP-SIGNATUREPAD-001 — Signature Pad
**Purpose:** توقيع رقمي (موافقات أولياء الأمور على بيانات القاصرين — Chapter 0 Discovery: قانون سلامة الطفل الرقمي). **Anatomy:** لوحة رسم باللمس/الماوس + أزرار مسح/تأكيد. **Accessibility:** **MUST** بديل نصي/طريقة موافقة بديلة للمستخدمين غير القادرين على الرسم يدويًا (Chapter 6 §POUR Operable). **Related Governance:** G.12، Chapter 17 (Data Privacy — لاحقًا، يرتبط مباشرة بموافقات القاصرين).

---

# Validation Components

## CMP-ERRORMESSAGE-001 — Error Message
**Purpose:** تطبيق §F.3 كمكوّن مستقل. **Anatomy:** أيقونة تحذير + نص (Chapter 6 §6.2 — لا لون وحده). **Related Governance:** §F.3 بالكامل.

## CMP-SUCCESSMESSAGE-001 — Success Message (Inline)
**Purpose:** تأكيد نجاح عملية على مستوى الحقل (تفريق عن Toast العام في L4 — هذا مضمّن داخل الحقل نفسه، مثال: "اسم المستخدم متاح ✓"). **Related Governance:** نفس بنية Error Message لكن بلون `color.semantic.success`. **ملاحظة نطاق:** التغذية الراجعة من نوع Warning وInfo (تحذير/معلومة عامة غير مرتبطة بخطأ إدخال) **مغطاة في L4 Feedback Components (Alert/Toast)**، لا تُكرَّر هنا لأن L2 يخص حالات الحقل الفردي (صحيح/خاطئ) فقط.

## CMP-CHARCOUNTER-001 — Character Counter
**Purpose:** عداد أحرف مرئي لحقول محدودة الطول (نبذة نادٍ محدودة بـ200 حرف). **Anatomy:** نص صغير أسفل الحقل ("45/200"). **Behavior:** **SHOULD** يتحول للون تحذيري عند الاقتراب من الحد (آخر 10%)، وللون خطر عند التجاوز. **MUST** العد يعتمد على وحدات Unicode Grapheme Cluster حيثما أمكن تقنيًا، لا طول UTF-16 الخام — إيموجي مركّب (مثل رمز عائلة متعددة الأجزاء) **MUST** يُحسب كحرف واحد كما يراه المستخدم، لا كعدة وحدات تقنية. **Accessibility:** قارئ الشاشة **MUST NOT** يُعلن العدد المتبقي عند كل ضغطة مفتاح (مزعج) — **MUST** الإعلان فقط عند عبور عتبات محدَّدة (مثال: 50%، 90%، 100%) عبر `aria-live="polite"` مُحدَّث بحذر. **Related Governance:** §F.5 (يظهر بجانب Helper Text).

---

# Advanced

## CMP-OTP-001 — OTP Input
**Purpose:** إدخال رمز تحقق مُجزَّأ (تأكيد هاتف/بريد عند تسجيل الدخول). **Anatomy:** صناديق منفصلة (عادة 4-6) كل صندوق رقم واحد. **Behavior:** **MUST** الانتقال التلقائي للصندوق التالي عند إدخال رقم، والرجوع للسابق عند `Backspace` على صندوق فارغ. **MUST** دعم اللصق (Paste) لرمز كامل يوزَّع تلقائيًا على كل الصناديق. **Accessibility:** **MUST** يبقى مفهومًا لقارئ الشاشة كحقل رمز واحد منطقيًا رغم التجزئة البصرية. **MUST** دعم التعبئة التلقائية من المتصفح للرمز المستلم عبر SMS حيثما توفّرت (`autocomplete="one-time-code"`). **Related Governance:** G.12.

## CMP-SEARCHINPUT-001 — Search Input
**Purpose:** بحث نصي عام (البحث عن لاعب/خبر في الموقع العام). **الفرق عن Input العادي:** أيقونة بحث ثابتة + سلوك Debounce إلزامي + زر مسح سريع. **Behavior:** **MUST** `debounce` ≥300ms قبل إطلاق أي طلب بحث (Chapter 3 Performance). **MUST** أي طلب بحث جديد يُلغي (عبر `AbortController` أو ما يعادله من آلية إلغاء) الطلب السابق غير المكتمل — نفس مبدأ §F.2.2 Async Validation Contract مطبَّقًا هنا لمنع وصول نتائج قديمة بعد نتائج أحدث. **MUST** إفراغ حقل البحث بالكامل يُلغي أي طلب معلّق ويمسح النتائج المعروضة فورًا (لا تبقى نتائج قديمة ظاهرة بعد حذف النص). **Related Governance:** يبني فوق CMP-INPUT-001 + Chapter 11 (Search Pattern — لاحقًا يوسّعه على مستوى الصفحة كاملة).

## CMP-PASSWORDFIELD-001 — Password Field
**Purpose:** إدخال كلمة مرور (لوحة التحكم فقط — لا تسجيل عام للجمهور، Chapter 0 Discovery). **Anatomy:** Input `type="password"` + زر إظهار/إخفاء (Icon Button، Chapter 8 L1). **Accessibility:** **MUST** `aria-label` لزر الإظهار يتغيّر ديناميكيًا ("إظهار كلمة المرور" / "إخفاء كلمة المرور"). **MUST** `autoComplete="current-password"` (تسجيل دخول) أو `autoComplete="new-password"` (تسجيل/تغيير) — إلزامي للتوافق مع مديري كلمات المرور، جزء من عقد الوصول لا تفصيلاً تقنيًا اختياريًا. **Related Governance:** يبني فوق CMP-INPUT-001 + CMP-ICONBUTTON-001 (Chapter 8 L1).

## CMP-COLORPICKER-001 — Color Picker *(اختياري — استخدام محدود جدًا في هذا المشروع)*
**Purpose:** اختيار لون (استخدام نادر جدًا في سياق UAEAF — ربما لتخصيص شعار نادٍ مستقبلاً). **الحالة:** `Experimental` (Chapter 8 Governance §G.2) — غير مطلوب فعليًا في أي Workflow حالي موثَّق، يُوثَّق للاكتمال فقط. **Related Governance:** G.2 (Lifecycle Status).

---

## Do & Don't (L2 عام)
**Do:** ابدأ أي حقل جديد من `<Field>` (CMP-FIELD-001) دائمًا · التزم بـ§F.2 (تحقق عند `blur`) إلا لاستثناء موثَّق صراحة
**Don't:** لا تنشئ حقلاً جديدًا بدون المرور عبر Form Foundation · لا تكرر شرح Label/Error/Required داخل توثيق مكوّن فردي (أشِر لـ§F.1-F.14 فقط)

## Success Metrics
- 23/23 مكونات L2 موثَّقة ومرتبطة بـForm Foundation
- 100% من الحقول تدعم Controlled Mode (ADR-0014)
- 0 تكرار لقواعد §F.1-F.14 داخل توثيق مكوّن فردي
- 100% قابلية تنقل بالكيبورد عبر كل الحقول
- 100% توافق مع قارئ الشاشة (Screen Reader)
- 0 قواعد تحقق مكرّرة (Duplicated Validation Rules) بين مكونات مختلفة
- 100% تكافؤ Controlled/Uncontrolled عبر كل المكونات القابلة له

## References
**Normative:** Chapter 6 (§6.5 Forms Accessibility) · Chapter 8 Global Governance (G.1-G.12) · Chapter 7 (Semantic Tokens)
**Implementation:** React Hook Form (مرجع توافق لا اعتماد إلزامي) · Radix UI (Select, Checkbox, RadioGroup primitives) · WAI-ARIA APG (Combobox, Date Picker patterns)

## Related Chapters
Chapter 6 §6.5 · Chapter 8 L1 (Button, Icon, Spinner مُستهلَكة هنا) · Chapter 8 Global Governance · Chapter 11 (UX Patterns يوسّع Wizard/CRUD Forms) · Chapter 13 (CMS Forms) · Chapter 19 (Calendar & Localization)

---

*نهاية L2 Forms/Form Foundation (23/23 مكوّن + 9 أقسام مشتركة). التالي: L3 Navigation Components.*

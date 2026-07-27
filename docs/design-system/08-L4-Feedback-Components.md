# Chapter 8 — Component Inventory
## Level 4: Feedback Components (Feedback Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L4 of 8) | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 5 (Motion) · Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Button, Icon, Spinner) · Chapter 8 L2 (§F.3 Error Handling, §F.10 Submission) · Chapter 8 Global Governance | L5-L8 · Chapter 11 (UX Patterns) · Chapter 13 (CMS Workflow) |

## Scope
**يغطي:** L4 كـ**Feedback Foundation** (تعريف، تصنيف، شدة، دورة حياة، أولوية، طابور، وصول، حركة، تركيز، استمرارية، إغلاق تلقائي، حجب، تحقق غير متزامن، حدود Analytics، تركيب) + 17 مكوّن تغذية راجعة.
**لا يغطي:** رسائل الحقل الفردي (Error/Success Message → L2 §F.3)، محتوى النصوص الفعلي لكل رسالة (→ Chapter 9).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Feedback** | أي تواصل من النظام للمستخدم عن نتيجة إجراء أو حالة — يشمل النجاح والفشل والانتظار والتحذير |
| **Blocking Feedback** | تغذية راجعة تمنع أي تفاعل آخر حتى يُستجاب لها (Dialog حرج) |
| **Escalation Level** | درجة "قوة المقاطعة" لنوع تغذية راجعة، من الأخف (Tooltip) للأقوى (Blocking Dialog) |

## Purpose
"Feedback Foundation" هو العقد الوحيد لكل رسالة نظام في المنصة — كل مكوّن أدناه **MUST** يشير له، ويُختار حسب مستوى التصعيد المناسب لا الذوق الشخصي.

---

## ADR-0016: Feedback Escalation Model

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Product Decision (مبني على PR-001 Clarity Over Decoration) |
| **Context** | 17 مكوّن تغذية راجعة قادمة عبر مستويات إلحاح مختلفة جذريًا؛ بدون تسلسل واضح، كل مطوّر يختار مكوّنًا حسب تفضيله الشخصي فيتضارب الاتساق (Toast لخطأ حرج، Dialog لتأكيد بسيط) |
| **Decision** | تسلسل تصعيد صارم بترتيب القوة، **MUST** يُختار أقل مستوى يكفي للموقف: `Tooltip → Inline Validation (L2 §F.3) → Alert → Toast → Banner → Dialog → Blocking Dialog`. قواعد صريحة: **MUST NOT** استخدام Dialog لو Alert يكفي · **MUST NOT** استخدام Toast لخطأ يمنع إكمال العمل · **MUST NOT** استخدام Tooltip لعرض خطأ (غير مستقر بصريًا، لا يظهر باللمس بسهولة) · **MUST NOT** استخدام Banner لتأكيد عملية بسيطة (بروز مفرط) |
| **Alternatives Considered** | ترك اختيار المكوّن لتقدير كل فريق حسب الموقف — رُفض لأنه المصدر الأول لعدم الاتساق في تجارب المستخدم عبر أنظمة كبيرة (ملاحظة مباشرة من مراجعة الوثيقة) |
| **Why This Decision** | تطبيق مباشر لـPR-001 (Clarity Over Decoration، Chapter 2) — التصعيد الزائد يشتت، والناقص يُفوّت معلومة حرجة؛ قاعدة واحدة تحسم لكل موقف |
| **Risks** | حالات حدّية قد لا تتطابق بوضوح مع مستوى واحد (تحذير مهم لكن غير حاجب). Mitigation: §FB.3 Severity مستقل عن §Escalation — الشدة (خطورة المحتوى) والتصعيد (قوة العرض) بُعدان مختلفان يمكن دمجهما بمرونة |
| **Consequences** | كل مكوّن أدناه **MUST** يُعلن مستواه على سلّم التصعيد صراحة في توثيقه |

---

## Feedback Foundation — الأقسام المشتركة

### FB.1 Feedback Definition
**Feedback MUST** يقتصر على تواصل حالة/نتيجة للمستخدم — **MUST NOT** يُستخدم لطلب إدخال بيانات جديدة (ذلك L2) أو للتنقل (ذلك L3).

### FB.2 Feedback Taxonomy
| النوع | الوصف | أمثلة |
|---|---|---|
| **Passive** | معلومة متاحة عند الطلب فقط، لا تقاطع | Tooltip |
| **Informational** | تظهر تلقائيًا لكن لا تحجب التفاعل | Toast، Banner، Inline Message |
| **Blocking** | تحجب التفاعل حتى الاستجابة | Dialog، Blocking Dialog |
| **System** | حالة عامة للتطبيق لا لإجراء محدد | Loading State، Empty State، Error State (على مستوى الصفحة) |
| **Async** | ترافق عملية جارية غير فورية | Progress Bar، Circular Progress |

### FB.3 Feedback Severity (مستقل عن التصعيد §ADR-0016)
`Info` · `Success` · `Warning` · `Error` · `Neutral` — كل شدة **MUST** ترتبط بتوكن `color.semantic.*` محدَّد (Chapter 7)، لا لون حر.

### FB.4 Feedback Lifecycle
```
Triggered → Displayed → (Interacted | Auto-dismissed | Timed-out) → Removed
```

### FB.5 Feedback Priority
عند تزاحم عدة رسائل تغذية راجعة في نفس اللحظة: **الترتيب الإلزامي** هو `Blocking > System > Informational > Passive` — رسالة أعلى أولوية **MUST** تظهر قبل أو فوق أي رسالة أدنى، لا بترتيب وصولها الزمني فقط.

### FB.6 Feedback Queueing
تغذيات راجعة من نفس النوع (عدة Toasts) **MUST** تُصطف (Queue) لا تتراكم فوق بعضها بصريًا — **SHOULD** حد أقصى 3 Toasts ظاهرة في نفس اللحظة، الباقي ينتظر دوره.

### FB.7 Accessibility
تطبيق مباشر لـChapter 6: **MUST** `role="alert"` (Blocking/Error) أو `role="status"` (Informational) + `aria-live` مناسب (`assertive` للحرج، `polite` للعادي) · Dialog/Blocking Dialog **MUST** Focus Trap كامل (Chapter 6 §6.3) · كل تغذية راجعة **MUST NOT** تعتمد على اللون وحده (Chapter 6 §6.2 — أيقونة ترافق كل Severity).

### FB.8 Motion
مشتقة من Chapter 5 §5.6 حصرًا: Toast/Banner دخول-خروج ≈150-220ms · Dialog/Modal فتح-إغلاق ≈220ms (`DT-MOTION-DURATION-BASE`) · Tooltip/Popover ≈100ms.

### FB.9 Focus Management
Blocking Feedback (Dialog) **MUST** ينقل التركيز داخله فور الظهور، ويعيده للعنصر المحفّز عند الإغلاق (نمط مطابق لـChapter 8 L3 §N.12 لكن على مستوى Overlay لا Route).

### FB.10 Persistence
Toast/Snackbar **MUST NOT** تُحفظ عبر إعادة تحميل الصفحة (حالة مؤقتة بطبيعتها) · Banner **MAY** يبقى حتى إغلاقه يدويًا حتى عبر جلسات (تحذيرات نظام مستمرة).

### FB.11 Auto-dismiss Contract
Toast/Snackbar **SHOULD** إغلاق تلقائي بعد 4-6 ثوانٍ افتراضيًا، **MUST** يتوقف العدّ التنازلي عند تمرير الفأرة/التركيز فوقه (Chapter 6: لا يُفوَّت محتوى بسبب توقيت جامد) · Error/Blocking **MUST NOT** إغلاق تلقائي أبدًا — يحتاج تفاعل صريح دائمًا.

### FB.12 Blocking Contract
Blocking Dialog **MUST** يمنع أي تفاعل مع بقية الواجهة (Backdrop + Focus Trap + `MUST NOT` إغلاق بالنقر خارجه لو كان إجراءً حرجًا لا رجعة فيه) — يختلف عن Dialog العادي القابل للإغلاق بالنقر خارجه أو `Esc`.

### FB.13 Async Feedback Contract
لعمليات تستغرق وقتًا (Progress Bar، رفع ملف L2): **MUST** تحديد ما إذا كانت `Determinate` (نسبة مئوية معروفة) أو `Indeterminate` (مدة غير معروفة) صراحة — Indeterminate **MUST NOT** يُعرض كنسبة وهمية.

### FB.14 Feedback Analytics Boundary
نفس مبدأ Chapter 8 L3 §N.16: أي مكوّن تغذية راجعة **MUST NOT** يرسل Analytics مباشرة — يُصدر حدث (`onShow`/`onDismiss`/`onAction`) فقط؛ التطبيق يقرر.

### FB.15 Composition
```
<Feedback>
  ├── Icon (يعكس Severity، §FB.3)
  ├── Title (اختياري حسب النوع)
  ├── Message
  ├── Actions (زر/أزرار اختيارية)
  └── Dismiss Control (اختياري حسب §FB.11/§FB.12)
```

### FB.16 Feedback Deduplication Contract
تغذية راجعة مكرّرة (نفس الرسالة تحدث عدة مرات متتالية، مثال: "خطأ شبكة" ×8) **MUST** تُدمَج لا تتكرر بصريًا — **SHOULD** عدّاد يزيد بجانب نفس العنصر ("خطأ شبكة (×8)") بدل إنشاء 8 عناصر Toast منفصلة (يتكامل مباشرة مع §FB.6 Queueing).

### FB.17 Feedback Replacement Policy
تغذية راجعة تمثّل حالتين متتاليتين لنفس العملية (`Uploading...` ثم `Upload Complete`) **MUST** تستبدل نفس الموضع (Slot) لا تُنشئ عنصرًا جديدًا بجانب القديم:
```
Pending Feedback → Resolved Feedback → Replace Same Slot (لا Feedback إضافي منفصل)
```

### FB.18 Feedback Ownership (من يزيل الرسالة؟)
| المكوّن | المسؤول عن الإزالة |
|---|---|
| Toast | تلقائي (النظام، §FB.11) |
| Banner | المستخدم (إغلاق يدوي) |
| Dialog | المستخدم (إجراء صريح) |
| Progress | العملية نفسها (اكتمال/فشل) |
| Loading State | مُحمِّل البيانات (Data Loader) عند وصول الاستجابة |

### FB.19 Retry Contract
لأي فشل قابل لإعادة المحاولة (Offline، Timeout، خطأ خادم 500، Chunk Load Error — يتكامل مع Chapter 8 L3 §N.18): **MUST** تحديد صراحة هل إعادة المحاولة تُعيد **نفس العملية بالضبط** أم تبدأ **عملية جديدة مستقلة** — لا افتراض ضمني يختلف بين مطوّر وآخر لكل حالة فشل.

### FB.20 Feedback Stacking & Z-Order Contract
توكنز `DT-ZINDEX-*` (Chapter 3) تحدد **القيم**؛ هذا القسم يحدد **سياسة التفاعل** بين أنواع التغذية الراجعة عند التزامن، وهو الأهم من مجرد الترتيب الرقمي:
```
Blocking Dialog (الأعلى مطلقًا) ↑ Dialog/Modal ↑ Command Palette/Drawer ↑ Popover ↑ Tooltip ↑ Toast ↑ Banner (خارج المكدّس، جزء من تدفق الصفحة)
```
**قواعد تفاعل صريحة (MUST):** `Toast` **MUST NOT** يستقبل التركيز أبدًا · `Tooltip` **MUST NOT** يُعرَض فوق `Dialog` مفتوح (يُخفى تلقائيًا) · `Popover` **MUST** يُغلَق تلقائيًا عند إغلاق `Dialog` الأب الذي يحتويه.

### FB.21 Feedback Interruptibility Contract
عند ظهور تغذية راجعة عالية الأولوية أثناء وجود أخرى أقل نشطة (Toast يعمل ثم يظهر Blocking Dialog): **MUST** المؤقتات التلقائية (§FB.11) للتغذية الأدنى **تتوقف مؤقتًا (Suspend)** لا تستمر بصمت — مثال حرج: Snackbar بزر "تراجع" **MUST NOT** ينتهي مؤقته بينما Dialog يحجب رؤيته، وإلا فقد المستخدم فرصة التراجع دون علمه.

### FB.22 Feedback Source Boundary
كل حدث تغذية راجعة **MUST** يحمل بيانات وصفية داخلية لمصدره (`source`) — ليست للعرض للمستخدم، بل للنظام (تسجيل، تحليلات، توجيه §FB.19، تشخيص):
```
source: 'validation' | 'api' | 'navigation' | 'permission' | 'realtime' | 'background-job' | 'offline' | 'system'
```
**MUST** متاح لكل حدث يُصدَر عبر §FB.14 Analytics Boundary.

### FB.23 Feedback Rate Limiting
مختلف عن §FB.16 Deduplication (رسائل متطابقة) — هذا يعالج **حجم** الأحداث المختلفة في فترة قصيرة (بث مباشر لتحديثات نتائج بطولة مثلاً، عشرات الأحداث في ثوانٍ). **MUST** يفرض مدير التغذية الراجعة حدًا أقصى لمعدل إنشاء تغذية راجعة غير حاجبة؛ الأحداث الزائدة **MAY** تُدمَج في رسالة ملخّصة واحدة ("12 تحديثًا جديدًا") بدل عرض كل حدث فرديًا.

### FB.24 Cross-Tab Synchronization
تغذية راجعة **حرجة على مستوى الجلسة كاملة** (لا صفحة واحدة) **MUST** تتزامن عبر كل التبويبات المفتوحة لنفس الجلسة الموثَّقة: انتهاء الجلسة (Session Expired)، تسجيل خروج إجباري، وضع الصيانة، سحب صلاحية. **MUST NOT** يظهر التحذير في تبويب واحد بينما البقية تعمل بصمت وكأن شيئًا لم يحدث.

### FB.25 Feedback Idempotency
لمنع رسائل مكررة ناتجة عن أحداث خادم مكررة فعليًا (WebSocket يرسل نفس الحدث مرتين) — أدق من مقارنة النصوص (§FB.16، التي قد تفشل مع اختلاف طفيف في الصياغة): كل حدث تغذية راجعة **SHOULD** يحمل `eventId` فريدًا، ومدير التغذية الراجعة **MUST** يتجاهل أي `eventId` سبق معالجته.

---

## Passive / Overlay Feedback

## CMP-TOOLTIP-001 — Tooltip
**Escalation Level:** الأدنى. **Purpose:** توضيح إضافي عند التمرير/التركيز على عنصر (شرح أيقونة مبهمة). **MUST NOT** يحتوي معلومة ضرورية لإكمال المهمة (غير مضمون الظهور باللمس). **Delay Contract (يمنع Flicker):** `Hover Delay` ≈500ms قبل الظهور (لا ظهور فوري مزعج عند مرور الفأرة عرضًا) · `Focus Delay` = 0ms (يظهر فورًا مع التركيز بالكيبورد — انتظار هنا يضر تجربة الوصول) · `Dismiss Delay` ≈0-100ms (اختفاء سريع عند مغادرة المؤشر). **Related Governance:** FB.2 (Passive)، FB.8 (100ms حركة الظهور نفسها)، Chapter 6 (بديل كيبورد عبر Focus لا Hover فقط).

## CMP-POPOVER-001 — Popover
**Purpose:** محتوى تفاعلي إضافي مرتبط بعنصر (شبيه Tooltip لكن يحتوي عناصر تفاعلية داخله، لا نص فقط). **Related Governance:** يبني فوق نفس أساس Menu (Chapter 8 L3).

---

## Informational Feedback

## CMP-ALERT-001 — Alert
**Escalation Level:** بعد Inline Validation. **Purpose:** رسالة مضمّنة داخل تدفق الصفحة (لا عائمة) — تحذير أعلى نموذج أو قسم. **Variants:** حسب FB.3 (Info/Success/Warning/Error/Neutral). **Scope (MUST يُعلَن صراحة لكل استخدام):** `Field Group` (أعلى مجموعة حقول) · `Section` (أعلى قسم صفحة) · `Page` (أعلى الصفحة كاملة) · `Panel` (داخل لوحة/Card فرعية) — تحديد النطاق يمنع اختلاف الحجم والتموضع بين تطبيقات مختلفة لنفس المكوّن. **Related Governance:** FB.7 (`role="alert"` للأنواع الحرجة).

## CMP-BANNER-001 — Banner
**Escalation Level:** بعد Toast. **Purpose:** رسالة عريضة أعلى الصفحة تخص حالة عامة مستمرة (صيانة مجدولة، انقطاع اتصال). **الفرق عن Alert:** Banner على مستوى الصفحة/التطبيق كامل، Alert مضمّن بقسم محدد. **Related Governance:** FB.10 (قد يبقى عبر الجلسات).

## CMP-TOAST-001 — Toast
**Escalation Level:** بعد Alert. **Purpose:** إشعار عابر غير حاجب (تم الحفظ بنجاح). **MUST NOT** يُستخدم لخطأ يمنع إكمال العمل (ADR-0016). **Related Governance:** FB.6 (Queueing)، FB.11 (Auto-dismiss)، FB.14.

## CMP-SNACKBAR-001 — Snackbar
**Purpose:** حالة خاصة من Toast تحتوي إجراء تراجع (Undo) — "تم حذف اللاعب، تراجع؟". **الفرق عن Toast:** يحتوي زر إجراء دائمًا؛ Toast قد يكون نصًا فقط. **Related Governance:** يبني فوق CMP-TOAST-001، FB.11 (المؤقت يتوقف عند التمرير فوق زر Undo).

---

## Blocking Feedback

## CMP-DIALOG-001 — Dialog
**Escalation Level:** بعد Banner. **Purpose:** حوار عام يتطلب انتباهًا مركّزًا لكن قابل للإغلاق (بالنقر خارجه أو `Esc`). **Related Governance:** FB.9 (Focus Management)، Chapter 6 §6.3.

## CMP-CONFIRMATIONDIALOG-001 — Confirmation Dialog
**Purpose:** حالة خاصة من Dialog لتأكيد إجراء له أثر (حذف نادٍ). **Anatomy:** رسالة + زر تأكيد (Chapter 8 L1: قد يكون `Danger` variant حسب الخطورة، ADR-0004) + زر إلغاء. **Behavior:** **MUST** الإجراء المدمّر (حذف) لا يُنفَّذ إلا بتأكيد صريح، لا افتراضي مُفعَّل بالخطأ (`Enter` **MUST NOT** يؤكد تلقائيًا لإجراءات لا رجعة فيها). **Related Governance:** يبني فوق CMP-DIALOG-001.

## CMP-MODAL-001 — Modal
**Escalation Level:** أعلى من Dialog البسيط. **Purpose:** نافذة تحتوي محتوى أكبر أو نموذجًا كاملاً (تسجيل لاعب من داخل لوحة التحكم دون مغادرة الصفحة). **الفرق عن Dialog:** Modal يحتوي عادة تفاعلاً معقدًا (نموذج L2 كامل)؛ Dialog رسالة/قرار بسيط. **Related Governance:** FB.9، Chapter 8 L2 §F.10 (Form Submission Contract عند احتواء نموذج).

## CMP-BLOCKINGDIALOG-001 — Blocking Dialog
**Escalation Level:** الأعلى مطلقًا. **Purpose:** حالة نادرة تمنع أي تفاعل حتى الاستجابة الإلزامية (انتهاء صلاحية الجلسة، خطأ نظام حرج). **MUST NOT** إغلاق بالنقر خارجه أو `Esc` (FB.12). **Related Governance:** FB.12 الكامل، يُستخدم بأقصى تحفّظ (آخر درجة في ADR-0016).

## CMP-DRAWER-001 — Drawer (كتغذية راجعة/محتوى تفصيلي)
**Purpose:** لوحة جانبية لعرض تفاصيل إضافية دون مغادرة السياق (تفاصيل سريعة للاعب من قائمة). **ملاحظة:** Drawer التنقلي مُوثَّق في Chapter 8 L3 (CMP-NAVDRAWER-001)؛ هذا استخدام مختلف (محتوى/تفاصيل لا تنقل). **Related Governance:** FB.9، Chapter 5 §5.10.1 (Safe Area).

---

## Async Feedback

## CMP-PROGRESSBAR-001 — Progress Bar
**Purpose:** تمثيل بصري خطي لعملية جارية (رفع ملف، Chapter 8 L2). **Variants:** `Determinate` (نسبة معروفة) · `Indeterminate` (حركة مستمرة، FB.13). **Cancellation Contract:** لعمليات طويلة قابلة للإلغاء (رفع ملف كبير): `Uploading → Cancel (إجراء مستخدم صريح) → Cancelled → Dismiss`. **MUST** زر الإلغاء ظاهرًا طوال مدة العملية لا مخفيًا، و**MUST** الحالة `Cancelled` تختلف بصريًا عن `Failed` (الأول اختيار المستخدم، الثاني خطأ نظام — FB.19 Retry لا ينطبق على Cancelled بنفس منطق Failed). **Related Governance:** FB.13، FB.18 (العملية نفسها مسؤولة عن الإزالة)، Chapter 5 (GPU-only animation لـIndeterminate).

## CMP-CIRCULARPROGRESS-001 — Circular Progress
**Purpose:** نسخة دائرية من Progress Bar، تُستخدم داخل مساحات مضغوطة (زر Loading، Chapter 8 L1). **Related Governance:** يبني فوق نفس منطق CMP-PROGRESSBAR-001.

---

## System Feedback (مستوى الصفحة)

## CMP-EMPTYSTATE-001 — Empty State
**Purpose:** حالة "لا يوجد محتوى بعد" (قائمة أندية فارغة قبل إضافة أي نادٍ). **Anatomy:** رسم/أيقونة + رسالة + إجراء مقترح (زر "أضف أول نادٍ"). **Related Governance:** FB.15، Chapter 9 (صياغة الرسالة).

## CMP-ERRORSTATE-001 — Error State
**Purpose:** حالة فشل تحميل على مستوى الصفحة كاملة (لا حقل فردي — ذلك L2 §F.3). **الفرق عن Alert:** Error State يستبدل المحتوى بالكامل؛ Alert يُضاف فوقه. **Related Governance:** يتكامل مع Chapter 8 L3 §N.18 (Navigation Failure Contract) عند كون السبب فشل تنقل.

## CMP-SUCCESSSTATE-001 — Success State
**Purpose:** حالة نجاح على مستوى صفحة كاملة (تأكيد إتمام عملية تسجيل كبرى). **Related Governance:** FB.15.

## CMP-LOADINGSTATE-001 — Loading State (مستوى الصفحة)
**Purpose:** حالة تحميل أولي لصفحة كاملة قبل توفر أي بيانات — يستخدم Skeleton (Chapter 8 L1) لا Spinner لتوقعات المحتوى (Chapter 0 Discovery: مفضَّل للمحتوى متوقع الشكل). **Related Governance:** يبني فوق CMP-SKELETON-001 (Chapter 8 L1)، Chapter 8 L3 §N.13 (Loading Navigation) عند كونها ناتجة عن تنقل.

---

## Do & Don't (L4 عام)
**Do:** اختر أقل مستوى تصعيد يكفي الموقف (ADR-0016) قبل أي تصميم · اربط كل Severity بتوكن Semantic محدَّد (FB.3)
**Don't:** لا تستخدم Dialog لو Alert يكفي · لا تستخدم Toast لخطأ حاجب · لا تستخدم Tooltip لعرض خطأ

## Success Metrics
- 17/17 مكوّن L4 مصنَّف على سلّم التصعيد (ADR-0016) صراحة
- 0 حالة Toast تُستخدم لخطأ يمنع إكمال العمل (يُفحص في Chapter 23.7)
- 100% من Blocking Feedback يطبّق Focus Trap كامل (FB.9)
- 0 تغذية راجعة تعتمد على اللون وحده للتمييز (FB.7)
- 0 رسائل مكررة معروضة بصريًا دون دمج (FB.16)
- 100% من العمليات الطويلة القابلة للإلغاء تعرض زر Cancel ظاهرًا (Progress Cancellation)
- 0 Toast يستقبل التركيز (FB.20)
- 100% من مؤقتات Auto-dismiss تُعلَّق فعليًا عند ظهور تغذية راجعة أعلى أولوية (FB.21)
- 100% من أحداث التغذية الراجعة المُصدَرة تحمل حقل `source` (FB.22)
- 0 تجاوز لحد معدل الإنشاء الأقصى دون دمج (FB.23)
- 100% من التغذية الراجعة الحرجة على مستوى الجلسة تتزامن عبر كل التبويبات (FB.24)
- 0 رسالة مكررة ناتجة عن eventId مُعالَج مسبقًا (FB.25)

## References
**Normative:** Chapter 2 (PR-001) · Chapter 6 · Chapter 8 Global Governance
**Implementation:** Radix UI (Dialog, Toast, Tooltip, Popover primitives) · WAI-ARIA APG (Alert, Dialog patterns)
**Informative:** WCAG 2.2

## Related Chapters
Chapter 8 L1 (Button, Icon, Spinner, Skeleton) · Chapter 8 L2 (§F.3, §F.10) · Chapter 8 L3 (§N.12 Focus، §N.18 Failure) · Chapter 9 (صياغة الرسائل) · Chapter 11 (UX Patterns)

---

*نهاية L4 Feedback (Feedback Foundation FB.1-FB.25 + 17 مكوّن). التالي: L5 Data Display Components.*

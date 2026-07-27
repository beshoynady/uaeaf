# Chapter 8 — Component Inventory
## Level 3: Navigation Components (Navigation Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L3 of 8) | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 5 (Motion Tokens) · Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Icon, Button) · Chapter 8 Global Governance | L4-L8 · Chapter 11 (UX Patterns) · Chapter 12 (Dashboard Navigation) · Chapter 20 (Page Templates) |

## Scope
**يغطي:** L3 كـ**Navigation Foundation** كاملة (تعريف التنقل، تصنيفه، حالاته، عقد التوجيه، الكيبورد، الاستجابة، الوصول، الحركة، الاستمرارية، التركيب) + 14 مكوّن تنقل فردي.
**لا يغطي:** محتوى الصفحات نفسها (→ L5 Data Display)، أنماط التنقل متعددة الخطوات المركّبة على مستوى التطبيق (→ Chapter 11).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Navigation** | أي عنصر واجهة وظيفته الانتقال بين حالات/صفحات/أقسام مختلفة من التطبيق — **وليس** تنفيذ إجراء على البيانات الحالية |
| **Current Route** | التمثيل المجرّد للموقع الحالي في التطبيق (مسار منطقي، لا رابط متصفح بالضرورة) |
| **Roving Tabindex** | نمط WAI-ARIA حيث عنصر واحد فقط من مجموعة (قائمة، تبويبات) له `tabindex="0"` في كل لحظة، والباقي `-1`، وتتغيّر بأسهم الاتجاه لا `Tab` |

## Purpose
"Navigation Foundation" هو العقد الوحيد لسلوك التنقل في كل المنصة — كل مكوّن أدناه **MUST** يشير له، لا يعيد تعريف State أو Keyboard أو A11y بطريقته الخاصة.

---

## ADR-0015: Navigation Architecture & Routing Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision |
| **Context** | 14 مكوّن تنقل قادمة عبر موقع عام ولوحة تحكم (Chapter 0: Dual Experience)، تحتاج فلسفة موحّدة قبل توثيق أي مكوّن فردي، خصوصًا مع تعدد الوحدات (Modules) في UAEAF (لاعبين/أندية/بطولات) |
| **Decision** | (1) التنقل ينقسم لثلاث طبقات مستقلة دلاليًا (§N.2): **Application / Context / Workflow**. (2) الـDesign System مسؤول عن **واجهة التنقل وسلوكها** فقط، وليس عن مكتبة التوجيه (Routing Library) نفسها — لا اعتماد على React Router أو Next.js Router تحديدًا. (3) كل مكوّنات L3 تتعامل مع مفهوم مجرّد **Current Route / Navigation State**، لا مع Router معيّن. (4) Deep Linking وHistory Integration (Back/Forward) جزء من العقد السلوكي هنا، لكن **تنفيذها الفعلي مسؤولية طبقة التطبيق** لا هذا الفصل |
| **Alternatives Considered** | ربط توثيق التنقل مباشرة بـNext.js Router (المستخدم فعليًا في المشروع، Chapter 0) — رُفض لأنه يكسر مبدأ الإطار العام القابل لإعادة الاستخدام (Chapter 0: Enterprise Design System Framework)؛ التوثيق يبقى محايدًا تقنيًا، والتطبيق الفعلي (Chapter 21) يربطه بـNext.js |
| **Why This Decision** | يفصل "شكل وسلوك التنقل" (هذا الفصل) عن "آلية التوجيه الفعلية" (مسؤولية التطبيق) — نفس منطق ADR-0014 (فصل Design System عن Form State Library) مطبَّقًا هنا على التنقل |
| **Risks** | غموض محتمل حول "أين ينتهي عقد Design System وأين يبدأ منطق التطبيق" في حالات معقدة (Deep Linking مع صلاحيات). Mitigation: §N.4 Routing Contract يحدد الحدود بدقة لكل حالة |
| **Consequences** | كل مكوّن تنقل أدناه **MUST** يستهلك `currentRoute`/`activeItem` كـProp مجرّد، لا يستورد Router SDK مباشرة داخل طبقة العرض |

---

## Navigation Foundation — الأقسام المشتركة (يرثها كل مكوّن أدناه)

### N.1 Navigation Foundation (التعريف)
**Navigation MUST** يقتصر على عناصر وظيفتها الانتقال بين حالات/صفحات. **Navigation MUST NOT** يشمل: إجراءات على البيانات (حفظ، حذف — تلك Form Actions/Dialog Actions من L2/L4)، حتى لو ظهرت بصريًا كأزرار داخل شريط علوي. الحد الفاصل: هل الضغط "يغيّر أين أنا؟" (Navigation) أم "يغيّر شيئًا في البيانات؟" (Action).

### N.2 Navigation Taxonomy (القرار المعماري المركزي)
كل مكوّن L3 أدناه **MUST** يُصنَّف تحت واحدة من ثلاث طبقات، ويُعلن ذلك صراحة في توثيقه:

| الطبقة | الوصف | أمثلة مكونات |
|---|---|---|
| **Application Navigation** | التنقل الرئيسي بين وحدات (Modules) مستقلة كليًا (لاعبين، أندية، بطولات، أخبار) | Sidebar، Navigation Rail، Top Navigation Bar، Mega Menu |
| **Context Navigation** | التنقل داخل وحدة واحدة (تبويبات ملف لاعب، أقسام صفحة بطولة) | Tabs، Breadcrumb، Tree View، Accordion (كتنقل محتوى) |
| **Workflow Navigation** | خطوات متسلسلة إلزامية الترتيب (تسجيل لاعب، اعتماد نتيجة، مراجعة متعددة الخطوات) | Stepper |

**قاعدة (MUST NOT):** لا يجوز استخدام مكوّن من طبقة لتنفيذ وظيفة طبقة أخرى (مثال: Tabs **MUST NOT** يُستخدم لتمثيل خطوات Workflow متسلسلة إلزامية — هذا دور Stepper حصرًا).

### N.3 Navigation State Model
كل مكوّن تنقل تفاعلي يرث نفس النموذج (بدل تعريفه فرديًا):
```
Inactive → Hover → Focused → Active → Expanded (إن وُجد تفرّع) → Collapsed → Disabled
```

### N.4 Routing Contract
| المفهوم | القاعدة |
|---|---|
| **Active Route** | كل مكوّن تنقل **MUST** يستقبل `currentRoute`/`activeItem` كـProp مجرّد (لا استيراد Router SDK داخل المكوّن — ADR-0015) |
| **Nested Route** | المكونات الهرمية (Sidebar، Tree View) **MUST** تدعم تفعيل مسار متداخل (عنصر أب يظهر "نشطًا جزئيًا" إن كان أحد أبنائه هو الحالي) |
| **Deep Link** | كل حالة تنقل **SHOULD** تكون قابلة للوصول المباشر عبر رابط (لا حالة تنقل "مخفية" لا يمكن الوصول لها إلا بالتصفح التدريجي) — التنفيذ الفعلي في Chapter 21 |
| **External Link** | **MUST** تمييز بصري واضح (أيقونة) + `target="_blank"` + `rel="noopener noreferrer"` لأي رابط خارجي |
| **Unsaved Changes** | الانتقال بعيدًا عن نموذج به تغييرات غير محفوظة (Chapter 8 L2 §F.2.1 Dirty=true) **MUST** يُحذّر المستخدم قبل المتابعة — تكامل مباشر بين L2 وL3 |
| **Route Restore / Back-Forward** | التنقل **SHOULD** يحترم سلوك المتصفح القياسي للرجوع/التقدم دون كسره بمنطق مخصص إلا لضرورة موثَّقة |

### N.5 Keyboard Navigation (يعادل F.8 في L2)
| المفتاح | السلوك |
|---|---|
| `Arrow Keys` | التنقل بين عناصر مجموعة تنقل واحدة (Roving Tabindex) |
| `Home` / `End` | القفز لأول/آخر عنصر في المجموعة |
| `Esc` | إغلاق أي تنقل منبثق (Dropdown، Menu، Command Palette) |
| `Tab` | الانتقال بين مجموعات التنقل المختلفة (لا داخل المجموعة الواحدة — ذلك للأسهم) |
| `Type-ahead` | القفز لعنصر يبدأ بحرف مكتوب (قوائم طويلة: Menu، Command Palette) |

### N.6 Responsive Navigation
| الطبقة | Desktop | Tablet | Mobile |
|---|---|---|---|
| Application Navigation | Sidebar ثابت موسّع | Sidebar قابل للطي (Rail) | Drawer مخفي خلف زر Menu |
| Context Navigation | Tabs أفقية كاملة | Tabs أفقية مع Scroll | Tabs قابلة للتمرير أو Dropdown مكثّف |

يُحدَّد هنا مرة واحدة؛ لا يُعاد تعريفه داخل توثيق كل مكوّن فردي أدناه.

### N.7 Navigation Accessibility
تطبيق مباشر لـChapter 6 على مستوى التنقل تحديدًا: **MUST** `<nav>` مع `aria-label` وصفي لكل منطقة تنقل مستقلة · `aria-current="page"` للعنصر النشط · `aria-expanded` للعناصر القابلة للطي · `aria-controls` يربط المُشغِّل بالمحتوى الذي يتحكم به · `aria-haspopup` لأي عنصر يفتح قائمة/قائمة فرعية.

### N.8 Navigation Motion Rules
كل القيم التالية **MUST** تُشتق من Chapter 5 §5.6 (لا قيم حرة جديدة):
| المكوّن | المدة | Token |
|---|---|---|
| Drawer (فتح/إغلاق) | 220ms | `DT-MOTION-DURATION-BASE` |
| Sidebar Collapse/Expand | 150ms | `DT-MOTION-DURATION-FAST` |
| Accordion | 150ms | `DT-MOTION-DURATION-FAST` |
| Menu/Dropdown (فتح) | 100ms | `DT-MOTION-DURATION-INSTANT` |

**قاعدة وصول لا حركة فقط (MUST):** كل حركة تنقل أعلاه (Drawer، Sidebar، Accordion، Menu) **MUST** تُلغى بالكامل مع `prefers-reduced-motion` — الانتقال يحدث فوريًا بلا حركة مع بقاء الوظيفة كاملة (نفس قاعدة Chapter 5 §5.8، مُطبَّقة هنا صراحة على كل مكوّن تنقل بدل افتراض ضمني).

### N.9 Navigation Persistence
| السؤال | القرار الافتراضي |
|---|---|
| هل Sidebar يبقى مطويًا بعد Refresh؟ | **SHOULD** نعم — يُحفظ محليًا (يشبه حفظ تفضيلات الوصول، Chapter 6 §6.9) |
| هل آخر Tab نشط يعود عند العودة للصفحة؟ | **MAY** حسب السياق — Context Navigation دون حالة عامة إلزامية |
| هل آخر Module يُتذكَّر عند الدخول التالي؟ | **MAY** لتحسين تجربة الاستخدام المتكرر (لوحة التحكم تحديدًا) |
| هل Tree View يبقى Expanded؟ | **SHOULD** نعم لنفس الجلسة، **MAY** عبر الجلسات |

### N.10 Navigation Composition (يعادل `<Field>` في L2)
```
<Navigation>
  ├── Header (شعار/عنوان القسم)
  ├── Section (تجميع منطقي)
  ├── Group (مجموعة عناصر مرتبطة)
  ├── Item (عنصر تنقل فردي)
  ├── Submenu (تفرّع)
  └── Footer (إجراءات ثانوية، مثال: تسجيل خروج)
```
كل مكوّن تنقل هرمي (Sidebar، Menu، Mega Menu) **MUST** يُبنى من هذا الهيكل المركّب (Compound Component، Chapter 8 G.11) بدل تكرار بنية مخصصة.

### N.11 Navigation Event Lifecycle
المرجع الوحيد لدورة حياة أي عملية تنقل — يُستهلك من Sidebar، Tabs، Drawer، Breadcrumb، Command Palette بدل أن يشرح كل مكوّن دورة حياته الخاصة:
```
Idle → Navigation Requested → Guard Check (§N.14) → Allowed | Blocked → Loading (إن وُجد، §N.13) → Route Changed → Focus Restoration (§N.12) → Completed
```

### N.12 Focus Restoration
بعد اكتمال أي تنقل (Route Changed)، التركيز **MUST** ينتقل إلى **العنوان الرئيسي (Main Heading) أو Main Landmark** للصفحة الجديدة — **MUST NOT** يبقى عالقًا على عنصر التنقل القديم (رابط Sidebar الذي ضُغط عليه مثلاً). هذا تطبيق مباشر لـWAI-ARIA Best Practice، ويمنع فقدان قارئ الشاشة للسياق عند كل تنقل.

### N.13 Loading Navigation Contract
```
Pending Route → Visual Loading State → Completed
```
**حالة العرض المرئي أثناء الانتظار MUST تُحدَّد صراحة لكل سياق** — لا تُترك افتراضية: تغيير صفحة كامل **SHOULD** يستخدم Skeleton (Chapter 8 L1) للمحتوى الرئيسي؛ إجراء تنقل ثانوي سريع **MAY** يكتفي بمؤشر Progress خفيف على شريط التنقل نفسه دون تجميد الصفحة بالكامل. **قاعدة إلغاء (MUST):** التنقل **MUST** يبقى قابلاً للإلغاء (Cancellable) حتى لحظة `Route Changed` فعليًا — لو ضغط المستخدم "لاعبين" ثم فورًا "فعاليات"، **آخر نية للمستخدم هي التي تُنفَّذ**، لا أول طلب وصل. يمنع Race Conditions في التنقل خصوصًا مع تحميل بيانات مرتبط بتغيير المسار.

### N.14 Route Guard Contract
طلب التنقل **MUST** يمر عبر تسلسل تحقق موحّد قبل التنفيذ الفعلي — لا كل Module يبني منطق حراسة خاصًا به:
```
Navigation Request → Permission Guard → Unsaved Changes Guard (§N.4) → Feature Flag Guard → Maintenance Guard → Navigate
```
أي Guard يرفض الطلب **MUST** يُنتج حالة `Blocked` واضحة (§N.11) مع سبب مفهوم للمستخدم — لا فشل صامت.

### N.15 Scroll Restoration Policy
عند تغيير المسار (Route): الانتقال لصفحة جديدة تمامًا **SHOULD** يعيد التمرير لأعلى الصفحة افتراضيًا؛ الرجوع (`Back`) لصفحة سابقة **SHOULD** يستعيد موضع التمرير الذي كان عليه المستخدم قبل مغادرتها. سياسة موحّدة واحدة تُطبَّق عبر كل الصفحات — لا كل صفحة تقرر سلوكها بمعزل.

### N.16 Navigation Analytics Boundary
نفس مبدأ ADR-0015 مطبَّقًا على القياس: أي مكوّن تنقل **MUST NOT** يرسل بيانات Analytics مباشرة من داخله — **يُصدر حدث `onNavigate` فقط** (يتوافق مع Chapter 8 Governance §G.5)، والتطبيق هو من يقرر ماذا يفعل بهذا الحدث (تتبع، تحليل، لا شيء). **قاعدة دقة (MUST):** المكوّن **MUST NOT** يفترض نجاح التنقل ضمنيًا — `onNavigateRequested` ≠ `onNavigateCompleted`؛ الأحداث المُصدَرة **MUST** تكون متعددة ومحدَّدة (`Requested` / `Blocked` / `Completed`) لا حدثًا عامًا واحدًا يُخفي أي منها حدث فعليًا.

### N.17 Active Route Matching Rules
تحديد "هل هذا العنصر نشط؟" **MUST** يتبع سياسة واحدة معلنة صراحة لكل مكوّن، من ثلاث استراتيجيات ممكنة:
| النوع | مثال | الاستخدام النموذجي |
|---|---|---|
| **Exact Match** | `/players` نشط فقط لو المسار الحالي `/players` بالضبط | عناصر Sidebar عليا مستقلة |
| **Partial/Prefix Match** | `/players` يُعتبر نشطًا أيضًا عند `/players/123` | عناصر تحتوي صفحات فرعية |
| **Nested Match** | عنصر أب يظهر "نشطًا جزئيًا" (تمييز بصري أخف) إن كان أحد أبنائه هو الحالي فقط | Tree View، Sidebar متعدد المستويات |

**قاعدة (MUST):** كل مكوّن تنقل هرمي **MUST** يُعلن أي استراتيجية يستخدم صراحة في توثيقه — لا افتراض ضمني يختلف بين المطورين.

### N.18 Navigation Failure Contract
آخر فجوة في دورة حياة التنقل (§N.11): ماذا يحدث عند فشل التحميل نفسه (لا الحراسة §N.14)؟
```
Loading → Succeeded | Failed (Server Error / Timeout / Chunk Load Error / Offline)
                         ↓
              Retry | Return to Previous Route | Offline Message
```
**MUST** أي فشل تحميل مسار **MUST NOT** يترك المستخدم أمام شاشة معلّقة (Spinner بلا نهاية) — **MUST** إما رسالة خطأ مع خيار إعادة المحاولة، أو العودة التلقائية للمسار السابق الصالح، حسب طبيعة الفشل.

### N.19 Navigation Authorization Boundary (Visibility Contract)
مختلف عن Route Guard (§N.14 — يمنع **الدخول**)؛ هذا القسم يحسم **هل يظهر عنصر التنقل من الأساس**:

| الحالة | السلوك |
|---|---|
| المستخدم لا يملك صلاحية رؤية الوحدة (Module) | **MUST NOT** يظهر عنصر التنقل أصلاً |
| المستخدم يرى العنصر لكن لا يملك صلاحية التنفيذ | **MAY** يظهر Disabled مع سبب واضح، حسب سياسة المنتج |
| Feature Flag مغلق | **MUST** يختفي من التنقل تمامًا |
| وضع الصيانة (Maintenance Mode) | **MAY** يظهر مع شارة "غير متاح حاليًا" إن أراد المنتج ذلك |

**قاعدة (MUST):** كل مكوّن تنقل هرمي (Sidebar، Menu) **MUST** يفحص Visibility Contract هذا **قبل** الفحص الوظيفي (Route Guard) — لا معنى لحراسة مسار لعنصر ما كان يجب أن يظهر من الأساس. هذا يوحّد سلوك "الظهور/الإخفاء" عبر كل المنصة بدل اختلافه بين مطور وآخر (Module يظهر لمستخدم ويختفي لآخر بمنطق غير متسق).

---

## Application Navigation

## CMP-SIDEBAR-001 — Sidebar
**Purpose:** التنقل الرئيسي بين وحدات لوحة التحكم (Operational Experience، Chapter 0). **Taxonomy:** Application Navigation. **Anatomy:** يتبع N.10 حرفيًا. **Variants:** `Expanded` · `Collapsed` (أيقونات فقط) · `Overlay` (فوق المحتوى على الشاشات الصغيرة). **Behavior:** حالة الطي **MUST** تُحفظ (N.9). **Related Governance:** Navigation Foundation كاملة (N.1-N.10) + Chapter 8 Governance G.9/G.12.

## CMP-NAVRAIL-001 — Navigation Rail
**Purpose:** نسخة مضغوطة من Sidebar لشاشات متوسطة (Tablet) — أيقونات فقط بلا نص دائم. **Taxonomy:** Application Navigation. **الفرق عن Sidebar Collapsed:** Rail حالة تصميم مستقلة مقصودة لا حالة "مطوية" مؤقتة. **Related Governance:** يبني فوق نفس N.3/N.5/N.7.

## CMP-TOPNAV-001 — Top Navigation Bar
**Purpose:** شريط تنقل أفقي علوي (الموقع العام، Public Experience). **Taxonomy:** Application Navigation. **Anatomy:** شعار + روابط رئيسية + مبدّل لغة (Chapter 4) + زر إعدادات الوصول (Chapter 6). **Behavior:** **MUST** يبقى Sticky عند التمرير لأسفل (Chapter 5 §5.10.2 Z-Index Layering) مع سلوك الإخفاء/الظهور اللطيف الموصوف في الأصل (Chapter 5). **Related Governance:** N.6 (نسخة Mobile تتحول لزر Hamburger يفتح Drawer).

## CMP-MEGAMENU-001 — Mega Menu *(اختياري حسب حاجة المشروع)*
**Purpose:** قائمة موسّعة متعددة الأعمدة لموقع عام بمحتوى غني (لو احتاجه لاحقًا لتصنيفات الألعاب الفرعية مثلاً). **الحالة:** `Experimental` (Chapter 8 G.2) — غير مطلوب فعليًا في أي Workflow موثَّق حاليًا. **Taxonomy:** Application Navigation.

---

## Context Navigation

## CMP-BREADCRUMB-001 — Breadcrumb
**Purpose:** إظهار الموقع الهرمي الحالي (الرئيسية > الأندية > نادي كذا). **Taxonomy:** Context Navigation. **Anatomy:** سلسلة روابط مفصولة بفاصل اتجاهي (يعكس تلقائيًا في RTL). **Accessibility:** **MUST** `<nav aria-label="Breadcrumb">` + آخر عنصر (الصفحة الحالية) **MUST NOT** يكون رابطًا فعليًا، بل نص عادي بـ`aria-current="page"`. **Related Governance:** N.7.

## CMP-TABS-001 — Tabs
**Purpose:** التنقل بين أقسام محتوى بديلة داخل نفس السياق (تبويبات ملف لاعب: نظرة عامة/النتائج/الإحصائيات). **Taxonomy:** Context Navigation (**MUST NOT** يُستخدم كـWorkflow، راجع N.2). **Keyboard Interaction:** أسهم الاتجاه (Roving Tabindex) للتنقل بين التبويبات، `Enter`/`Space` للتفعيل إن لم يكن التفعيل فوريًا بالسهم. **Related Governance:** N.2 (تصنيف)، N.5.

## CMP-ACCORDION-001 — Accordion
**Purpose:** طي/عرض أقسام محتوى طويلة (الأسئلة الشائعة، تفاصيل لائحة). **Taxonomy:** Context Navigation. **Behavior:** **MAY** يسمح بفتح أكثر من قسم في نفس الوقت أو قسم واحد فقط (يُحدَّد لكل استخدام). **Accessibility:** **MUST** `aria-expanded` على كل رأس قسم. **Related Governance:** N.3، N.7، N.8 (150ms).

## CMP-TREEVIEW-001 — Tree View
**Purpose:** عرض بيانات هرمية قابلة للتصفح (تصنيفات الألعاب الفرعية، هيكل اللجان). **Taxonomy:** Context Navigation. **Keyboard Interaction:** أسهم `→`/`←` لفتح/طي عقدة، `↑`/`↓` للتنقل بين العقد الظاهرة. **Related Governance:** N.9 (حالة Expanded تُحفظ)، N.10.

---

## Workflow Navigation

## CMP-STEPPER-001 — Stepper
**Purpose:** خطوات متسلسلة إلزامية الترتيب (تسجيل لاعب جديد، اعتماد نتيجة عبر مراحل). **Taxonomy:** Workflow Navigation **حصريًا** (N.2 — لا يُستبدل بـTabs أبدًا). **Anatomy:** سلسلة دوائر مرقّمة متصلة بخط، كل دائرة تمثّل خطوة. **States:** لكل خطوة: `Upcoming` (لم تُصل بعد) · `Current` · `Completed` · `Error`. **Behavior:** **MUST** منع القفز لخطوة لاحقة قبل إكمال الحالية إلا إذا سمح الـWorkflow صراحة بالتنقل الحر. **Related Governance:** N.2، Chapter 8 L2 §F.10 (Form Submission Contract لكل خطوة تحتوي نموذجًا).

---

## Overlay Navigation

## CMP-MENU-001 — Menu
**Purpose:** قائمة إجراءات/روابط تظهر عند تفعيل عنصر محفّز (زر "المزيد"). **Taxonomy:** يخدم أي طبقة حسب السياق (أداة عامة). **Keyboard Interaction:** N.5 كاملة (أسهم، Type-ahead، Esc). **Accessibility:** **MUST** `aria-haspopup="menu"` على المحفّز، `role="menu"` على القائمة. **Related Governance:** N.8 (100ms فتح).

## CMP-DROPDOWNMENU-001 — Dropdown Menu
**Purpose:** حالة خاصة من Menu مرتبطة دائمًا بموضع عنصر محدد (لا قائمة عامة عائمة). **الفرق عن Menu:** الموضع مُقيَّد بعنصر المحفّز دائمًا (Popover positioning). **Related Governance:** يبني فوق CMP-MENU-001.

## CMP-CONTEXTMENU-001 — Context Menu
**Purpose:** قائمة تظهر عند النقر بزر الفأرة الأيمن أو الضغط المطوّل (لمس). **الفرق عن Menu:** التفعيل بحدث سياقي (Right-click/Long-press) لا نقر مباشر على زر محفّز. **Accessibility:** **MUST** بديل كيبورد كامل (زر "خيارات" مرئي دائمًا) — Context Menu **MUST NOT** يكون الطريقة الوحيدة للوصول لإجراء ما (Chapter 6 §POUR Operable). **Related Governance:** يبني فوق CMP-MENU-001.

## CMP-NAVDRAWER-001 — Navigation Drawer
**Purpose:** نسخة Overlay من Sidebar للموبايل (N.6). **Taxonomy:** Application Navigation. **Behavior:** **MUST** يُغلق بالنقر خارجه أو `Esc` (Chapter 6 §6.3) + Focus Trap كامل أثناء الفتح. **Related Governance:** N.8 (220ms)، Chapter 5 §5.10.1 Safe Area.

## CMP-COMMANDPALETTE-001 — Command Palette
**Purpose:** بحث سريع بالكيبورد للتنقل/تنفيذ إجراءات (اختصار عام، مثال `Cmd/Ctrl+K`) — أداة إنتاجية للمستخدمين التشغيليين (Chapter 0: Operational Experience). **Taxonomy:** أداة عامة تخدم Application وContext Navigation معًا. **Behavior:** يبني فوق CMP-COMBOBOX-001 (Chapter 8 L2) + N.5 Type-ahead. **Related Governance:** Chapter 8 L2 (Combobox)، N.5، Chapter 16 (AI Search — نقطة تكامل مستقبلية طبيعية).

---

## CMP-PAGINATION-001 — Pagination
**Purpose:** التنقل بين صفحات نتائج مقسّمة (قوائم الأندية، النتائج، الأخبار). **Taxonomy:** Context Navigation. **Variants:** `Numbered` (أرقام صفحات) · `Load More` (زر تحميل إضافي) · `Infinite Scroll` (تحميل تلقائي عند التمرير — يُستخدم بحذر، Chapter 8 Governance G.3 Performance). **Accessibility:** **MUST** `aria-label="التالي"`/`"السابق"` وصفية، الصفحة الحالية `aria-current="page"`. **Related Governance:** N.5، N.7.

---

## Do & Don't (L3 عام)
**Do:** صنّف أي مكوّن تنقل جديد ضمن N.2 أولاً قبل التصميم · استخدم Roving Tabindex لأي مجموعة تنقل أفقية/عمودية
**Don't:** لا تستخدم Tabs لتمثيل خطوات إلزامية (استخدم Stepper) · لا تُنشئ حالة تنقل "مخفية" لا يمكن الوصول لها بـDeep Link

## Success Metrics
- 14/14 مكوّن L3 مصنَّف ضمن N.2 Taxonomy بوضوح
- 100% من مكونات التنقل تدعم Roving Tabindex (N.5) حيث ينطبق
- 0 استخدام لـTabs في سياق Workflow إلزامي (يُفحص في مراجعات Chapter 23.7)
- 100% تكامل مع Chapter 8 L2 §Unsaved Changes عند وجود نماذج
- 100% من التنقلات تُعيد التركيز لـMain Landmark (N.12)، صفر حالات تركيز عالق
- 0 مكوّن تنقل يرسل Analytics مباشرة (N.16 — يُصدر onNavigate فقط)
- 100% من الحركات (N.8) تُلغى مع prefers-reduced-motion

## References
**Normative:** Chapter 5 (§5.6 Motion) · Chapter 6 (§6.3, §6.4) · Chapter 8 Global Governance
**Implementation:** WAI-ARIA APG (Menu, Tabs, Tree View patterns) · Radix UI (NavigationMenu, Tabs, DropdownMenu primitives)
**Informative:** WCAG 2.2

## Related Chapters
Chapter 5 · Chapter 6 · Chapter 8 L1/L2/Global Governance · Chapter 11 (UX Patterns) · Chapter 12 (Dashboard Navigation) · Chapter 20 (Page Templates)

---

*نهاية L3 Navigation (Navigation Foundation N.1-N.10 + 14 مكوّن). التالي: L4 Feedback Components.*

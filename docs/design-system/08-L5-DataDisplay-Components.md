# Chapter 8 — Component Inventory
## Level 5: Data Display Components (Data Display Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L5 of 8) | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 5 (Motion, Grid) · Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Skeleton, Badge, Avatar) · Chapter 8 L3 (Pagination موثَّق هناك، Tree View/Accordion موثَّقان هناك) · Chapter 8 L4 (Empty/Error/Loading State) | L7 (Enterprise Components: Data Toolbar, Filters) · L8 (Sports Components: Results Table, Medal Table) · Chapter 12 (Dashboard Patterns) · Chapter 13 (CMS Listings) |

## Scope
**يغطي:** L5 كـ**Data Display Foundation** (تعريف، تصنيف، كثافة، استجابة، فرز، فلترة، بحث، اختيار، تكامل حالات، تحديث حي، Virtualization، وصول، Analytics، تركيب) + **Data State Contract** المركزي + مكونات عرض البيانات الفعلية.
**لا يغطي:** Pagination الكاملة (موثَّقة في L3 §CMP-PAGINATION-001)، Tree View وAccordion (موثَّقان في L3 كـContext Navigation)، أدوات الفلترة المتقدمة كواجهة مستقلة (→ L7 Filter Bar).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Stale Data** | بيانات معروضة صحيحة سابقًا لكن يُحتمل أنها لم تعد محدَّثة (نتيجة Cache قديم) |
| **Partial Data** | استجابة وصلت لكنها غير مكتملة (بعض الحقول فشلت في التحميل بينما نجحت أخرى) |
| **Offline Snapshot** | آخر بيانات معروفة محليًا تُعرض أثناء انقطاع الاتصال |
| **Density** | مقدار التباعد الرأسي/الأفقي داخل عنصر عرض بيانات — يؤثر على عدد الصفوف/العناصر الظاهرة دفعة واحدة |

## Purpose
"Data Display Foundation" هو العقد الوحيد لكيفية عرض أي مجموعة بيانات في المنصة — وعلى عكس L2/L3/L4، محوره المركزي ليس تفاعلًا واحدًا، بل **Data State Contract**: كيف يتصرف أي مكوّن عرض عند كل حالة ممكنة للبيانات نفسها.

---

## ADR-0017: Data Display Architecture & Data State Contract

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision |
| **Context** | L5 يخدم أكبر عدد من الشاشات (كل قوائم الأندية، اللاعبين، النتائج، لوحات CMS) — يحتاج عقدًا موحّدًا لحالات البيانات قبل أي مكوّن فردي، وإلا كل شاشة تتعامل مع "لا بيانات بعد" أو "بيانات قديمة" بمنطق مختلف |
| **Decision** | كل مكوّن عرض بيانات **MUST** يُعرِّف صراحة سلوكه لكل حالة من **Data State Contract** الموحّد: `Loading → Empty | Populated → Partial | Stale | Live-Updating → Error → Offline Snapshot`. لا مكوّن **MUST NOT** يفترض أن البيانات "دائمًا كاملة وحديثة" كحالة افتراضية وحيدة |
| **Alternatives Considered** | ترك كل مكوّن (Table، Card، Timeline) يعرّف حالاته بمعزل — رُفض لأنه يُنتج تجربة غير متسقة (بعض الجداول تُظهر Skeleton، أخرى Spinner، لنفس حالة التحميل) |
| **Why This Decision** | يوحّد التجربة عبر كل مكونات L5، ويجعل التكامل مع L4 (Empty/Error/Loading State) تلقائيًا لا قرارًا متكررًا |
| **Risks** | تعقيد إضافي لمكونات بسيطة لا تحتاج كل الحالات (مثال: Description List الثابت). Mitigation: الحالات غير المنطبقة **MAY** تُهمَل صراحة بدل تطبيقها قسرًا — التوثيق يذكر أيها ينطبق لكل مكوّن |
| **Consequences** | كل قسم مكوّن أدناه **MUST** يحتوي جدول "Data State Behavior" صريحًا |

---

## Data Display Foundation — الأقسام المشتركة

### DD.1 Data Display Definition
**Data Display MUST** يقتصر على عرض بيانات موجودة — **MUST NOT** يشمل إدخال بيانات جديدة (ذلك L2) أو تنقلًا بين صفحات مستقلة (ذلك L3)، حتى لو احتوى عناصر قابلة للنقر داخله (نقر صف جدول للانتقال لتفاصيل = تكامل مع L3، لا وظيفة L5 نفسها).

### DD.2 Display Taxonomy
| النوع | الوصف | أمثلة |
|---|---|---|
| **Tabular** | صفوف/أعمدة منظّمة | Table، Data Grid |
| **Collection** | عناصر متكررة الشكل | List، Card Grid |
| **Hierarchical** | بيانات متداخلة | (Tree View → L3) |
| **Temporal** | بيانات مرتبطة بالزمن | Timeline |
| **Summary** | رقم/مؤشر مكثّف | Statistic Card، Metric |
| **Structured Pair** | مفتاح-قيمة | Description List |

### DD.3 Density Model
`Comfortable` (تباعد مريح، الموقع العام) · `Compact` (كثافة أعلى، لوحة التحكم — Chapter 0 ADR-0001 Dual Experience) — يُطبَّق نفس مبدأ Chapter 8 L1 §Visual Density، هنا مُلزَم لكل مكوّن L5 تحديدًا.

### DD.4 Responsive Display Strategy
جدول معقّد (أعمدة كثيرة) **SHOULD** يتحول لعرض بطاقات (Card List) تحت `md` (Chapter 5 §5.10 Reflow) — لا Scroll أفقي مخفي كحل افتراضي وحيد.

### DD.5 Sorting Contract
**MUST** مؤشر بصري واضح لعمود الفرز النشط واتجاهه (تصاعدي/تنازلي) · **MUST** الفرز يُعلَن لقارئ الشاشة (`aria-sort`) · فرز متعدد الأعمدة **MAY** بترتيب أولوية معلن (رقم صغير بجانب كل عمود مفروز).

### DD.6 Filtering Contract
الفلاتر النشطة **MUST** تكون مرئية ومُلخَّصة فوق البيانات (يتكامل مع L1 Chip) — لا فلتر "خفي" غيّر النتائج دون أثر مرئي. مسح الفلاتر **MUST** إجراء واحد واضح ("مسح الكل").

### DD.7 Searching Contract
البحث داخل عرض بيانات (لا صفحة بحث كاملة) **MUST** يستهلك CMP-SEARCHINPUT-001 (Chapter 8 L2) مباشرة — لا إعادة تعريف سلوك بحث مختلف.

### DD.8 Pagination Contract
يُستهلَك من Chapter 8 L3 §CMP-PAGINATION-001 مباشرة — **MUST NOT** يُعاد تعريفه هنا. القرار الوحيد المحلي لكل مكوّن: أي Variant (Numbered/Load More/Infinite Scroll) يناسب سياقه.

### DD.9 Selection Model
| النمط | الاستخدام |
|---|---|
| `None` | عرض فقط، بلا اختيار |
| `Single` | اختيار عنصر واحد (فتح تفاصيل) |
| `Multiple` | اختيار متعدد (Bulk Actions، يُعِد لـL7) |

**MUST** حالة الاختيار مرئية بوضوح (خلفية مميزة + Checkbox عند Multiple) لا اعتمادًا على لون خفيف فقط (Chapter 6 §6.2).

**Selection Persistence Policy (MUST):** الاختيار (خصوصًا `Multiple`) **MUST** يبقى محفوظًا عبر عمليات الفرز (§DD.5) والفلترة (§DD.6) وتغيير الصفحة (§DD.8) طالما العناصر المختارة لا تزال موجودة منطقيًا — لا يُفقَد الاختيار لمجرد أن العرض تغيّر. الاعتماد إلزاميًا على §DD.17 Display Identity (لا فهرس الصف/الصفحة) لتحقيق هذا.

### DD.10 Data State Contract (المحور المركزي — راجع ADR-0017)
```
Loading → Empty | Populated → (Partial | Stale | Live-Updating يطرأ على Populated) → Error → Offline Snapshot
```
| الحالة | السلوك الموحّد الافتراضي |
|---|---|
| **Loading** | Skeleton (Chapter 8 L1) مطابق لشكل المحتوى المتوقع تمامًا — لا Spinner لعرض بيانات جدولي/تجميعي |
| **Empty** | يستهلك CMP-EMPTYSTATE-001 (Chapter 8 L4) |
| **Populated** | العرض الطبيعي الكامل |
| **Partial** | **MUST** إشارة بصرية واضحة على الحقول/الصفوف الناقصة (لا فراغ صامت يبدو كخطأ في التصميم) |
| **Stale** | راجع §DD.11 Data Freshness Contract التفصيلي |
| **Live-Updating** | **MUST** تغيير سلس (لا قفزة تخطيط، Chapter 5 CLS) عند وصول بيانات جديدة |
| **Error** | يستهلك CMP-ERRORSTATE-001 (Chapter 8 L4) + Retry Contract (Chapter 8 L4 §FB.19) |
| **Offline Snapshot** | **MUST** إشارة صريحة "بيانات محفوظة محليًا، قد لا تكون محدَّثة" — لا عرضها كأنها حية |

**Independent Component Lifecycle (Partial Rendering، MUST):** في صفحة تحتوي عدة مكونات عرض بيانات مستقلة (مثال: Statistic Cards + Table في نفس الشاشة)، كل مكوّن **MUST** يملك دورة حياة Data State خاصة به لا مشتركة قسرًا — إحصائيات جاهزة (`Populated`) **MUST** تظهر فور اكتمالها حتى لو كان الجدول المجاور لا يزال `Loading`. **MUST NOT** انتظار أبطأ مكوّن في الصفحة لعرض أي شيء (يخالف PR-002 Performance First).

### DD.11 Refresh & Live Update Contract (Data Freshness)
تحديث يدوي (زر Refresh) **MUST** يحافظ على موضع التمرير والاختيار الحالي (§DD.9) ما أمكن. تحديث حي (WebSocket/Polling) **MUST** يتبع Chapter 8 L4 §FB.25 Idempotency لمنع تكرار الصفوف عند وصول نفس الحدث مرتين.

**عقد الطزاجة الكامل (MUST يُعرَض صراحة، لا Stale فقط):**
| العنصر | القاعدة |
|---|---|
| `Last Updated` | طابع زمني نسبي ("قبل 5 دقائق") **MUST** ظاهر لأي بيانات قابلة للتقادم |
| `Refreshing` | حالة انتقالية أثناء إعادة الجلب — **MUST NOT** إخفاء البيانات القديمة أثناءها (يُعرض مؤشر خفيف فوقها لا استبدال بـSkeleton) |
| `Auto Refresh` | **MAY** للوحات النتائج المباشرة، بفاصل زمني معلن للمستخدم (مثال: "يتحدّث كل 30 ثانية") |
| `Manual Refresh` | **MUST** متاح دائمًا كخيار صريح حتى مع تفعيل Auto Refresh |

### DD.12 Huge Dataset Strategy
مجموعات بيانات كبيرة **MUST** تُعالَج بأحد الأساليب التالية، لا Pagination وحدها كحل افتراضي شامل:
| الأسلوب | متى يُستخدم |
|---|---|
| **Pagination** (§DD.8) | الحالة الافتراضية لمعظم القوائم — تقسيم واضح للمستخدم |
| **Virtualization / Windowing** | جداول/قوائم كثيفة تحتاج Scroll مستمر (>500 عنصر — يتوافق مع Chapter 8 L2 §Combobox threshold) — عرض العناصر المرئية فقط في DOM |
| **Progressive Rendering** | تحميل أولي سريع لجزء من البيانات، ثم إكمال الباقي في الخلفية دون حجب التفاعل الأولي |

تطبيق مباشر لـChapter 2 PR-008 Built to Scale — الاختيار بين الثلاثة **MUST** يُعلَن صراحة لكل مكوّن حسب طبيعة بياناته، لا افتراضًا واحدًا للجميع.

### DD.13 Accessibility
**MUST** بنية جدول دلالية صحيحة (`<table>`, `<th scope="col">`) لا `<div>` مقلَّدة بصريًا لجدول · Data Grid المعقّد **MUST** دعم تنقل بالأسهم بين الخلايا (نمط WAI-ARIA Grid) · كل مؤشر حالة (Live/Stale) **MUST** له نص بديل لا اعتماد على أيقونة/لون فقط.

### DD.14 Data Display Analytics Boundary
نفس مبدأ L3 §N.16 وL4 §FB.14: أي مكوّن عرض **MUST NOT** يرسل Analytics مباشرة — يُصدر أحداثًا (`onSort`, `onFilter`, `onSelect`) فقط.

### DD.15 Composition
```
<DataDisplay>
  ├── Toolbar (اختياري — بحث/فلترة/إجراءات، يُعِد لـL7)
  ├── Header (رؤوس أعمدة/تسميات)
  ├── Body (المحتوى الفعلي — يتبع Data State Contract §DD.10)
  ├── Footer (Pagination، ملخّص عدد النتائج)
  └── Overlay States (Loading/Empty/Error يُركَّبون فوق Body، لا يستبدلون البنية الكاملة إلا عند Empty/Error التامّين)
```

### DD.16 Display Identity
كل عنصر معروض (صف جدول، بطاقة، حدث Timeline) **MUST** يحمل معرّفًا مستقرًا وفريدًا (`rowId`, `cardId`, `timelineEventId`) مُشتقًا من هوية البيانات الفعلية (معرّف قاعدة البيانات) — **MUST NOT** الاعتماد على الفهرس (Index) في المصفوفة المعروضة كمعرّف. هذا أساس §DD.9 Selection Persistence وDD.11 Idempotency، ويمنع أخطاء React الشهيرة الناتجة عن تغيّر ترتيب العناصر بعد فرز/فلترة (إعادة تصيير خاطئة أو فقدان حالة داخلية لعنصر).

---

## Tabular

## CMP-TABLE-001 — Table
**Purpose:** عرض بيانات منظّمة صفوف/أعمدة بسيطة نسبيًا (قائمة أندية). **Data State Behavior:** يطبّق §DD.10 كاملاً؛ Loading = صفوف Skeleton بعدد مطابق للصفحة الحالية. **Related Governance:** DD.5 (Sort)، DD.13 (`<table>` دلالي).

## CMP-DATAGRID-001 — Data Grid
**Purpose:** جدول متقدم (لوحة التحكم) بفرز/فلترة/تحديد متعدد/تجميد أعمدة (نتائج بطولة كاملة بمئات الصفوف). **الفرق عن Table:** Data Grid يدعم DD.9 Multiple Selection وDD.12 Virtualization دائمًا تقريبًا؛ Table البسيط غالبًا لا يحتاجهما. **Related Governance:** DD.9، DD.12، DD.13 (WAI-ARIA Grid Pattern كامل)، يُعِد لـL7 (Data Toolbar).

## CMP-LIST-001 — List
**Purpose:** عرض عناصر متكررة الشكل بلا أعمدة صريحة (قائمة إشعارات، قائمة مبسّطة للاعبين على الموبايل). **Data State Behavior:** Loading = عناصر Skeleton مكرَّرة. **Related Governance:** DD.4 (البديل الطبيعي لـTable على الموبايل).

## CMP-DESCRIPTIONLIST-001 — Description List
**Purpose:** عرض أزواج مفتاح-قيمة ثابتة (تفاصيل ملف لاعب: الاسم، النادي، الفئة العمرية). **Data State Behavior:** Partial ينطبق هنا تحديدًا (بعض الحقول متاحة، أخرى "—" أو "غير متوفر" بدل فراغ صامت). **Related Governance:** DD.10 §Partial.

---

## Collection & Summary

## CMP-CARD-001 — Card (عرض بيانات)
**Purpose:** وحدة عرض مركّبة لعنصر واحد (نادٍ، خبر، فعالية) ضمن شبكة. **Anatomy:** صورة/أيقونة + عنوان + وصف مختصر + Metadata + إجراء اختياري. **Related Governance:** DD.15، Chapter 8 L1 (Avatar/Badge/Chip كأجزاء داخلية شائعة).

## CMP-STATCARD-001 — Statistic Card
**Purpose:** عرض رقم إحصائي بارز مع سياق (عدد اللاعبين، عدد الميداليات). **Anatomy:** رقم كبير + تسمية + مؤشر اتجاه اختياري (▲/▼ مقارنة بفترة سابقة). **Data State Behavior:** Loading = Skeleton بحجم الرقم نفسه لمنع CLS. **Related Governance:** DD.10، Chapter 4 (Numeric Typography — Backlog Ch4 v1.1).

## CMP-METRIC-001 — Metric
**Purpose:** نسخة مصغّرة من Statistic Card لعرض مضغوط داخل مساحات أصغر (شريط ملخّص). **Related Governance:** يبني فوق CMP-STATCARD-001.

## CMP-KEYVALUE-001 — Key-Value Display
**Purpose:** عرض زوج مفتاح-قيمة منفرد (خارج سياق قائمة كاملة كـDescription List) — يُستخدم كوحدة بناء أصغر. **Related Governance:** يُستهلك داخل CMP-DESCRIPTIONLIST-001 وCMP-CARD-001.

## CMP-AVATARGROUP-001 — Avatar Group
**Purpose:** عرض مجموعة صور مصغّرة متراكبة (المدربون المرتبطون بنادٍ). **Anatomy:** يبني فوق CMP-AVATAR-001 (Chapter 8 L1) + عداد "+N" عند تجاوز حد العرض. **Related Governance:** DD.12 (لا Virtualization غالبًا، العدد محدود طبيعيًا).

## CMP-EMPTYCOLLECTION-001 — Empty Collection
**Purpose:** حالة خاصة من CMP-EMPTYSTATE-001 (Chapter 8 L4) مخصصة لسياق "مجموعة بيانات فارغة" تحديدًا (لا فشل تحميل) — الفرق دلالي: Empty Collection = لا يوجد محتوى بعد بشكل طبيعي؛ Error State = فشل تقني. **Related Governance:** يبني فوق CMP-EMPTYSTATE-001.

---

## Temporal & Feed

## CMP-TIMELINE-001 — Timeline
**Purpose:** عرض تسلسل زمني لأحداث (مراحل تسجيل لاعب، تاريخ إنجازات). **Data State Behavior:** Live-Updating شائع هنا (سجل تدقيق حي). **Related Governance:** DD.10 §Live-Updating، DD.11.

## CMP-ACTIVITYFEED-001 — Activity Feed
**Purpose:** قائمة زمنية من الأحداث الأحدث أولاً (نشاط لوحة التحكم: "أحمد عدّل بيانات نادٍ"). **الفرق عن Timeline:** Feed يُركّز على الترتيب الزمني للأحداث المتغيرة باستمرار؛ Timeline غالبًا لمسار ثابت محدود (مراحل عملية واحدة). **Related Governance:** DD.11 (Live)، Chapter 8 L4 §FB.25 (Idempotency لمنع أحداث مكررة).

---

## Do & Don't (L5 عام)
**Do:** طبّق Data State Contract (§DD.10) كاملاً على أي مكوّن جديد قبل التصميم البصري · استخدم Skeleton لا Spinner لأي تحميل جدولي/تجميعي
**Don't:** لا تُعِد تعريف Pagination أو Search (استهلكهما من L2/L3) · لا تترك حالة Partial/Stale صامتة بصريًا

## Success Metrics
- 100% من مكونات L5 توثّق سلوكها لكل حالة من Data State Contract صراحة
- 0 إعادة تعريف لمنطق Pagination/Search خارج L2/L3
- 100% من الجداول المعقّدة (>500 صف) تستخدم Virtualization أو Progressive Rendering (DD.12)
- 0 حالة Stale/Offline معروضة كأنها بيانات حية دون إشارة صريحة
- 100% من الاختيارات المتعددة تبقى محفوظة عبر الفرز/الفلترة/تغيير الصفحة (DD.9)
- 100% من العناصر المعروضة تستخدم معرّف مستقر لا فهرس مصفوفة (DD.16)
- 0 مكوّن ينتظر أبطأ مكوّن مجاور في نفس الصفحة لعرض بياناته الجاهزة (Partial Rendering، DD.10)

## References
**Normative:** Chapter 2 (PR-008) · Chapter 6 (§DD.13) · Chapter 8 L1/L3/L4 Governance
**Implementation:** WAI-ARIA APG (Grid, Table patterns) · TanStack Table/Virtual (مرجع تنفيذي محايد)
**Informative:** WCAG 2.2

## Related Chapters
Chapter 8 L1 (Skeleton/Badge/Avatar) · Chapter 8 L3 (§Pagination، §Tree View/Accordion) · Chapter 8 L4 (§Empty/Error State، §FB.25) · Chapter 7 · L7 (Enterprise: Data Toolbar/Bulk Actions) · L8 (Sports: Results/Medal Table)

---

*نهاية L5 Data Display (Data Display Foundation DD.1-DD.16 + 12 مكوّن، بالإضافة لـ4 مكونات مُستهلَكة من L1/L3/L4). التالي: L6 Media Components.*

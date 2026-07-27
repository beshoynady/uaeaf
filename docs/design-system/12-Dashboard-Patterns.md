# Chapter 12 — Dashboard Patterns (Dashboard Composition Layer)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 8 (كل المستويات) · Chapter 11 (كل الأنماط، خصوصًا PT-CRUD-001, PT-PERMISSION-001, PT-EMPTYLOADINGERROR-001) | Chapter 13 (CMS يخصّص هذه التخطيطات) · Chapter 20 (Page Templates يُركِّب الشاشات النهائية) |

## Scope
**يغطي:** كيف تُبنى شاشة لوحة تحكم كاملة من مكونات Chapter 8 وأنماط Chapter 11 معًا — أنواع التخطيط، المناطق الثابتة، قواعد ترتيب العناصر، الاستجابة، دورة حياة الشاشة الكاملة، التخصيص، والأداء.
**لا يغطي:** أي مكوّن أو نمط تفاعل جديد (Chapter 8/11 وحدهما المصدر) — هذا فصل **تركيب (Composition)** بحت.

## Definitions
| المصطلح | التعريف |
|---|---|
| **Dashboard Zone** | منطقة ثابتة الموضع داخل أي شاشة لوحة تحكم (رأس، تنقل، مساحة عمل رئيسية) |
| **Widget** | أي مكوّن Chapter 8 (Card، Table، Chart) عند استهلاكه داخل منطقة لوحة تحكم محددة |

## Purpose
Chapter 11 عرّف "كيف تتصرف المكونات معًا في مهمة"؛ هذا الفصل يعرّف "كيف تُرتَّب في شاشة لوحة تحكم كاملة" — طبقة تركيب أعلى، لا تفاعل جديد.

---

## ADR-0023: Dashboard Composition Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision |
| **Context** | لوحة التحكم تخدم أدوارًا مختلفة جذريًا (Chapter 0: Operational Experience) بمهام مختلفة (إدارة كيانات، متابعة إحصائيات، مراقبة حية) — شاشة واحدة بتخطيط واحد لا تناسب الكل |
| **Decision** | لوحة التحكم **MUST** تُبنى من **أنواع تخطيط محدودة معروفة** (§12.1) لا تخطيط حر لكل شاشة، وكل نوع **MUST** يُركِّب حصريًا من مناطق ثابتة (§12.2) ومكونات Chapter 8 — **لا مكوّن أو نمط جديد يُبتكَر في هذا الفصل** (يطابق Chapter 8 ADR-0013 وChapter 11 ADR-0022 بنفس الروح، مطبَّقًا على مستوى الشاشة الكاملة) |
| **Alternatives Considered** | ترك كل Module (لاعبين، إحصائيات، بطولات) يصمم تخطيطه الخاص — رُفض لأنه يُنتج لوحة تحكم غير متسقة يصعب التنقل فيها بثقة |
| **Why This Decision** | مستخدم تعلّم تخطيط "إدارة كيانات" مرة (لاعبين) يفهم فورًا تخطيط أي كيان آخر (أندية، حكام) بلا تعلّم جديد |
| **Risks** | تخطيط ثابت قد لا يناسب حالة استثنائية نادرة. Mitigation: أي انحراف **MUST** ADR منفصل موثَّق |
| **Consequences** | كل شاشة لوحة تحكم جديدة **MUST** تبدأ باختيار نوع من §12.1 قبل أي تصميم تفصيلي |

---

## 12.1 Dashboard Layout Types
| النوع | الاستخدام | المكونات النموذجية |
|---|---|---|
| **Entity Management Dashboard** | إدارة قائمة كيانات (لاعبين، أندية، حكام) | يستهلك Chapter 11 §PT-CRUD-001 مباشرة: Toolbar (L7) + DataGrid (L5) |
| **Analytics Dashboard** | متابعة إحصائيات ومؤشرات | KPI Cards (L5 §CMP-STATCARD-001) + Charts |
| **Monitoring Dashboard** | متابعة حية أثناء بطولة | Live indicators (Chapter 8 L5 §DD.10 Live-Updating) + EventSchedule (L8) |
| **Workspace Dashboard** | مهمة تحريرية مركّزة (محرر خبر، CMS) | يُفصَّل في Chapter 13 |

## 12.2 Dashboard Zones (مناطق ثابتة، لا مكونات جديدة)
```
┌─────────────────────────────────────────┐
│ Global Header (شعار، بحث عام، حساب المستخدم)│
├──────────┬──────────────────────────────┤
│ Module   │ Context Toolbar (فلاتر/بحث/إجراءات)│
│ Nav      ├──────────────────────────────┤
│ (Sidebar,│ KPI Area (اختياري)              │
│  Ch8 L3) ├──────────────────────────────┤
│          │ Main Workspace (المحتوى الأساسي) │
│          ├──────────────────────────────┤
│          │ Side Panel (اختياري، تفاصيل سريعة)│
└──────────┴──────────────────────────────┘
Notification Area: عائمة فوق كل شيء (Chapter 8 L4 Z-Order)
```
كل منطقة **MUST** تُملأ بمكونات Chapter 8 القائمة فقط — Global Header يستهلك Chapter 8 L3 §CMP-TOPNAV-001، Module Nav يستهلك §CMP-SIDEBAR-001، إلخ.

## 12.3 Widget Placement Rules
**MUST** ترتيب ثابت لا يتغيّر بين الشاشات:
1. KPI Area **MUST** أعلى Main Workspace دائمًا (لا أسفله ولا بينه وبين Charts)
2. Filters (Chapter 11 §PT-FILTER-001) **MUST** تسبق DataGrid/Table مباشرة
3. Charts **MUST NOT** تسبق مؤشرات KPI الرقمية المباشرة — الرقم أولاً، الرسم التوضيحي بعده
4. Action Bar (Chapter 8 L7 §CMP-ACTIONBAR-001) **MUST** يظهر فقط بعد وجود Selection فعلي (Chapter 11 §PT-BULKACTION-001) — لا يحجز مساحة دائمة فارغة

## 12.4 Responsive Dashboard Behavior (مستوى الشاشة الكاملة)
| الحجم | السلوك |
|---|---|
| Desktop/Laptop (Chapter 5 `lg`+) | كل المناطق (§12.2) ظاهرة معًا، Sidebar موسّع |
| Tablet (`md`) | Sidebar يتحول لـNavigation Rail (Chapter 8 L3 §CMP-NAVRAIL-001)، Side Panel يصبح Drawer عند الطلب |
| Mobile (`xs`/`sm`) | إدارة لوحة التحكم **MAY** محدودة الدعم (Chapter 0: أولوية الموبايل للموقع العام لا لوحة التحكم) — إن دُعمت، Module Nav يتحول لـNavigation Drawer (Chapter 8 L3) كامل الشاشة عند الفتح |

## 12.5 Dashboard State Flow (مستوى الصفحة الكاملة)
يوسّع Chapter 11 §PT-EMPTYLOADINGERROR-001 وChapter 11 §PT-PERMISSION-001 معًا في تسلسل واحد لمستوى لوحة التحكم الكاملة:
```
Loading → Permission Check (§PT-PERMISSION-001) → Empty | Populated → Realtime Updates (إن انطبق، L5 §DD.11) → Error (§FB.19 Retry)
```
**MUST** فحص الصلاحية **قبل** حالة التحميل الظاهرة للمستخدم — لا وميض محتوى ثم اختفاؤه لعدم امتلاك صلاحية (Race Condition بين Loading وPermission).

## 12.6 Dashboard Personalization
ضمن نطاق المشروع الحالي (Chapter 0):
- **MAY** ترتيب بطاقات KPI قابل لإعادة الترتيب من المستخدم
- **MAY** إظهار/إخفاء Widgets اختيارية داخل Analytics Dashboard
- **SHOULD** حفظ تفضيل التخطيط لكل مستخدم (يتوافق مع Chapter 8 L3 §N.9 Navigation Persistence بنفس الروح، مطبَّقًا على تخطيط الشاشة لا التنقل)
هذه القدرات **MAY** غير مُفعَّلة في الإصدار الأول — البنية تحتملها دون إعادة تصميم لاحقًا (PR-008 Built to Scale).

## 12.7 Dashboard Performance Rules
تطبيق مباشر لـPR-002 على مستوى الشاشة الكاملة لا المكوّن المفرد:
- **MUST** Lazy Loading لأي منطقة (§12.2) غير ظاهرة فوق الطية عند التحميل الأول (Side Panel، أقسام مطوية)
- **MUST** Virtualization لأي DataGrid كبير (Chapter 8 L5 §DD.12)
- **MUST** Skeleton قبل أي رسم بياني (لا وميض فارغ ثم ظهور مفاجئ)
- **MUST NOT** إعادة تحميل الصفحة كاملة عند تحديث Widget واحد (تحديث حي جزئي فقط، Chapter 8 L5 §DD.10 Independent Component Lifecycle)

## 12.8 Dashboard Refresh Strategy
يوسّع §12.7 — لا كل Widget بنفس معدل التحديث:

| Widget | معدل التحديث النموذجي |
|---|---|
| KPI Cards | 30-60 ثانية |
| Live Competition (Chapter 8 L5 §DD.10 Live-Updating) | فوري (WebSocket/Push) |
| Analytics Charts | يدوي أو كل 5 دقائق |
| Tables | عند الفلترة/التحديث اليدوي فقط |

**قاعدة (MUST):** كل Widget **MUST** يُعلن سياسة تحديثه الخاصة صراحة — **MUST NOT** تحديث اللوحة بالكامل لمجرد أن Widget واحد يحتاج بيانات أحدث (يطابق §12.7 Independent Lifecycle حرفيًا، هذا القسم يفصّل المعدلات الفعلية).

## 12.9 Widget Failure Isolation
فشل Widget واحد (خطأ تحميل رسم بياني مثلاً) **MUST NOT** ينتشر لبقية اللوحة:
```
Dashboard
├─ KPI ✔ (يعمل بشكل طبيعي)
├─ Table ✔
├─ Chart ✘ (Chapter 8 L4 §CMP-ERRORSTATE-001 محلي لهذا الـWidget فقط)
└─ News ✔
```
**MUST** كل منطقة (§12.2) تُعامَل كوحدة عزل مستقلة (Error Boundary) — فشل واحدة **MUST NOT** يُسقط اللوحة كاملة إلى حالة خطأ عامة.

## 12.10 Dashboard Context Boundary
كل لوحة تحكم **MUST** تُعلن سياقًا أساسيًا واحدًا (لاعبون، بطولات، إحصائيات عامة) — **MUST NOT** تتحول لمجموعة معلومات عشوائية غير مترابطة:
```
Players Dashboard → Widgets MUST تخدم سياق اللاعبين (إحصائيات لاعبين، قائمة لاعبين، تنبيهات لاعبين)
```
عرض Widget من سياق مختلف تمامًا (مؤشرات بطولة داخل لوحة اللاعبين) **MUST** مبررًا موثَّقًا صراحة (لماذا هذا الاستثناء) — لا إضافة حرة بدون سبب معلن.

## 12.11 Widget Loading Priority
ترتيب تحميل ثابت **MUST** يُحترَم لكل شاشة، يمنع ظهور المحتوى بترتيب عشوائي مربك:
```
1. Global Header (§12.2)
2. Module Navigation
3. KPI Area
4. Main Workspace
5. Side Panel
6. Optional/Secondary Widgets
```
**MUST NOT** ظهور رسم بياني أو محتوى ثانوي قبل اكتمال الهيكل الأساسي (Header/Navigation) — يخالف توقع المستخدم البصري الطبيعي لتحميل الصفحة.

## 12.12 Dashboard Data Dependency
كل شاشة لوحة تحكم **MUST** تُعلن صراحة طبيعة اعتمادية البيانات بين Widgets المكوّنة لها — لا تبعية ضمنية تُكتشف بالصدفة لاحقًا:
```
MUST يُعلن كل Widget هل:
- يشارك مصدر بيانات مع Widgets أخرى (Shared Dataset)
- يستقل بنقطة استدعاء خاصة به (Independent Endpoint)
- يعتمد على نتيجة Widget آخر (Dependent — يتطلب توثيقًا خاصًا لسبب الاعتماد)

MUST NOT تبعيات تشغيلية خفية (Hidden Runtime Dependencies) غير معلنة في تصميم الشاشة.
```
**السبب:** بدون هذا الإعلان الصريح، قد تتحول شاشة متوازية التحميل (§12.7) تدريجيًا إلى سلسلة تحميل متتالية (Chart ينتظر KPI ينتظر Table) دون أن ينتبه أحد للانحدار التدريجي في الأداء.

## 12.13 Cross-Widget Communication
تفاعل شائع في لوحات التحكم الحديثة (الضغط على KPI يُصفّي الجدول أدناه، نقطة في رسم بياني تُصفّي النتائج) — هذا **سلوك لوحة تحكم (Dashboard Behavior)**، لا مكوّن (Chapter 8) ولا نمط تفاعل عام (Chapter 11):
```
Widget MAY ينشر سياقًا (Publish Context) عند تفاعل المستخدم معه.
Widgets أخرى MAY تشترك (Subscribe) في هذا السياق وتتفاعل معه.
هذا التفاعل MUST يبقى اختياريًا (Optional) دائمًا — أي Widget MUST يعمل بشكل صحيح ومستقل حتى لو لم يستهلك أي سياق منشور من غيره.
```
**قاعدة (MUST NOT):** Widgets **MUST NOT** تصبح مرتبطة ارتباطًا وثيقًا إلزاميًا (Tightly Coupled) — لا Widget يتطلب وجود Widget آخر ليعمل أصلاً (يخالف §12.9 Widget Failure Isolation ضمنيًا لو حدث).

## 12.14 Dashboard Context Provider (مبدأ لا تنفيذ)
قيم سياقية مشتركة عبر كل Widgets في نفس الشاشة (الموسم المختار، البطولة المختارة، النادي المختار) **MUST** مصدرًا واحدًا مشتركًا على مستوى الصفحة — **MUST NOT** كل Widget يجلب نفس القيمة بشكل مستقل (يُنتج طلبات API مكررة لنفس البيانات بلا داعٍ، يخالف §12.7 الأداء). **التوثيق هنا مبدأ معماري فقط** — آلية التنفيذ الدقيقة (React Context، Global Store، إلخ) **MUST NOT** تُحسَم في هذا الفصل، بل في Chapter 21 (Technical Architecture).

---

## Dashboard Template Registry
مرجع مركزي سريع (نفس منطق Chapter 11 §Pattern Registry) — يُستهلَك من Chapter 20 بالمعرّف لا الاسم النصي:

| ID | Layout | الحالة |
|---|---|---|
| DB-ENTITY-001 | Entity Management Dashboard | Stable v1.0 |
| DB-ANALYTICS-001 | Analytics Dashboard | Stable v1.0 |
| DB-MONITORING-001 | Monitoring Dashboard | Stable v1.0 |
| DB-WORKSPACE-001 | Workspace Dashboard | Stable v1.0 (يُفصَّل في Chapter 13) |

## Widget Registry (بنية مرجعية، غير مُفعَّلة الآن)
لكل Widget جديد يُضاف مستقبلاً، **SHOULD** يُسجَّل بالحقول التالية (يُستهلَك من Chapter 20 لاحقًا لتركيب الشاشات آليًا):

| الحقل | الوصف |
|---|---|
| Widget ID | معرّف فريد (يتبع نمط `WG-{NAME}-001`) |
| Supported Dashboard Types | أي من §Dashboard Template Registry يقبل هذا الـWidget |
| Zone | أي منطقة من §12.2 ينتمي لها |
| Priority | ترتيبه ضمن §12.11 Widget Loading Priority |
| Refresh Policy | من §12.8 |

**غير مُفعَّل إلزاميًا في هذا الإصدار** — البنية موثَّقة الآن لتفادي إعادة تصميم لاحقة (PR-008 Built to Scale)، والتفعيل الفعلي حين يحتاجه Chapter 20.

## Do & Don't
**Do:** اختر نوع تخطيط من §12.1 أولاً قبل أي تصميم تفصيلي · طبّق §12.3 ترتيب العناصر حرفيًا في كل شاشة جديدة
**Don't:** لا تصمم تخطيطًا حرًا خارج §12.1 · لا تعرض محتوى محميًا للحظة قبل فحص الصلاحية (§12.5)

## Success Metrics
- 100% من شاشات لوحة التحكم الجديدة تختار نوعًا من §12.1 صراحة
- 0 شاشة تعرض محتوى محظورًا للحظة قبل فحص الصلاحية
- 100% من الجداول الكبيرة تستخدم Virtualization
- 0 إعادة تحميل صفحة كاملة لتحديث Widget واحد
- 100% من الـWidgets تُعلن سياسة تحديثها الخاصة (§12.8)
- 0 فشل Widget ينتشر لبقية اللوحة (§12.9)
- 100% من اللوحات تُعلن سياقًا أساسيًا واحدًا (§12.10)
- 100% من الشاشات تُعلن طبيعة اعتمادية بيانات Widgets صراحة (§12.12)
- 0 Widget يتطلب وجود Widget آخر ليعمل أصلاً (§12.13)
- 0 طلب API مكرر لنفس القيمة السياقية عبر Widgets مختلفة (§12.14)

## References
**Normative:** Chapter 8 (كل المستويات) · Chapter 11 (كل الأنماط)
**Informative:** Common Enterprise Dashboard Patterns (Grafana، Power BI — مرجع مفاهيمي عام، ليس مصدر قواعد)

## Related Chapters
Chapter 8 · Chapter 11 · Chapter 13 (CMS يخصّص Workspace Dashboard) · Chapter 20 (التجميع النهائي)

---

*نهاية Chapter 12. الفصل التالي: Chapter 13 — CMS System.*

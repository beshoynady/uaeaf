# Chapter 11 — UX Patterns

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 8 (كل المستويات L1-L8) · Chapter 9 (Content Rules) | Chapter 12 (Dashboard Patterns يُخصِّص هذه الأنماط) · Chapter 13 (CMS) · Chapter 20 (Page Templates يُركِّب Patterns لصفحات كاملة) |

## Scope
**يغطي:** تسلسلات تفاعل كاملة (End-to-End Flows) تُركِّب مكونات متعددة من Chapter 8 معًا لإنجاز مهمة مستخدم كاملة.
**لا يغطي:** أي مكوّن UI جديد (Chapter 8 وحده مصدر المكونات، ADR-0013) — Pattern **MUST NOT** يحتوي منطقًا لا يوجد له مكوّن مصدر بالفعل.

## Definitions
| المصطلح | التعريف |
|---|---|
| **UX Pattern (PT)** | تسلسل تفاعل موثَّق يُركِّب عدة مكونات Chapter 8 بترتيب وقواعد انتقال محدَّدة لإنجاز مهمة كاملة (لا مكوّن مفرد) |
| **Flow** | مسار مستخدم عبر عدة حالات شاشة متتابعة لنفس الهدف |

## Purpose
Chapter 8 عرّف "قطع الليغو"؛ هذا الفصل يعرّف "كيف تُركَّب معًا" لمهام حقيقية متكررة عبر المنصة (إضافة نادٍ، البحث عن لاعب، حذف جماعي) — بحيث لا يُعاد تصميم نفس التسلسل بشكل مختلف في كل شاشة.

---

## ADR-0022: UX Pattern Composition Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision (تطبيق مباشر لـChapter 8 ADR-0013 على مستوى الأنماط لا المكونات) |
| **Context** | مهام متكررة (إنشاء/تعديل/حذف سجل، بحث، استيراد جماعي) تتكرر عبر عشرات الشاشات (لاعبين، أندية، حكام، مدربين، بطولات) — بدون نمط موحّد، كل شاشة تُعيد اختراع تسلسلها الخاص |
| **Decision** | كل Pattern **MUST** يُعرَّف كتركيب صريح من مكونات Chapter 8 القائمة فقط (لا مكوّن جديد يُبتكَر هنا) + قواعد انتقال بين حالاته. أي Pattern **MUST** قابل للتطبيق على أي كيان (لاعب/نادٍ/حكم) دون تعديل بنيته — الاختلاف فقط في البيانات المُستهلَكة (نفس منطق Chapter 8 L8 ADR-0020: تجريد عن الكيان المحدد) |
| **Alternatives Considered** | ترك كل Module (لاعبين، أندية) يصمم تدفقه الخاص بمعزل — رُفض لأنه يُنتج تجربة مستخدم غير متسقة بين أقسام لوحة التحكم المختلفة |
| **Why This Decision** | يضمن أن تعلّم المستخدم نمط "إضافة سجل" مرة واحدة (لاعب) يُطبَّق حرفيًا على أي كيان آخر (نادٍ، حكم) — يقلل العبء المعرفي |
| **Risks** | قيد صارم قد لا يناسب حالة نادرة استثنائية. Mitigation: أي استثناء **MUST** موثَّق صراحة كـADR منفصل لا انحراف صامت عن النمط |
| **Consequences** | كل Pattern أدناه **MUST** يُعلن بوضوح أي مكونات Chapter 8 يستهلكها بمعرّفاتها |

---

## PT-CRUD-001 — CRUD Pattern
**Purpose:** التسلسل الموحّد لإدارة أي كيان (نادٍ، لاعب، حكم، مدرب، مسابقة) عبر دورة حياته الكاملة.
```
List (Chapter 8 L5 §CMP-TABLE-001/DataGrid + L7 §CMP-DATATOOLBAR-001)
  → Create (L2 Form Foundation، Modal أو صفحة كاملة حسب التعقيد — L4 §CMP-MODAL-001)
  → Read (صفحة تفاصيل، L5 §CMP-DESCRIPTIONLIST-001 + Domain Card من L8 إن انطبق)
  → Update (نفس نموذج Create مع قيم مبدئية مُعبَّأة، L2 §F.7 Controlled)
  → Delete (L4 §CMP-CONFIRMATIONDIALOG-001 إلزاميًا، Chapter 8 L7 §EC.3 Destructive)
```
**Related Governance:** Chapter 8 L2 §F.10 (Submission)، L4 (Confirmation)، L7 §EC.4 (Audit تلقائي لكل عملية).

## PT-SEARCH-001 — Search Pattern
**Purpose:** تدفق البحث الموحّد داخل أي سياق (بحث عام في الموقع، بحث لاعب في لوحة التحكم).
```
Idle → Typing (Debounce، Chapter 8 L2 §CMP-SEARCHINPUT-001) → Loading → Results | Empty (L4 §CMP-EMPTYSTATE-001 بصياغة "لا نتائج لـ{query}" — Chapter 9 §CR-2.5)
```
**Related Governance:** Chapter 8 L5 §DD.7 (Searching Contract)، L7 §CMP-SEARCHBAR-001.

## PT-FILTER-001 — Filter Pattern
**Purpose:** تدفق تطبيق فلاتر على أي عرض بيانات.
```
Filter Bar (L7 §CMP-FILTERBAR-001) أو Advanced Filters Drawer (L7 §CMP-ADVANCEDFILTERS-001)
  → Apply → Data Display يُحدَّث (L5 §DD.6) → Active Filter Chips مرئية (L1 §Chip)
  → Clear All (زر واحد واضح، Chapter 8 L5 §DD.6)
```
**Related Governance:** Chapter 8 L5 §DD.6 مباشرة، لا إعادة تعريف.

## PT-WIZARD-001 — Wizard Pattern
**Purpose:** تدفق متعدد الخطوات لمهمة معقدة (تسجيل لاعب جديد بكامل بياناته، استيراد جماعي).
```
Step 1 → Step 2 → ... → Review → Submit (Chapter 8 L3 §CMP-STEPPER-001 حصريًا — لا Tabs، Chapter 8 L3 §N.2)
```
كل خطوة **MUST** نموذج L2 مستقل يخضع لـ§F.10 الخاص به قبل الانتقال للخطوة التالية. **Related Governance:** Chapter 8 L3 (Stepper)، L7 §CMP-IMPORTWIZARD-001 (تطبيق مباشر لهذا النمط).

## PT-EMPTYLOADINGERROR-001 — Page Load State Flow
**Purpose:** التسلسل الموحّد لأي صفحة/قسم عند تحميله أول مرة — يوسّع Chapter 8 L5 §DD.10 من "حالة مكوّن" إلى "تسلسل تجربة صفحة كاملة".
```
Loading (Skeleton، L1) → Empty (L4 §EmptyState) | Populated | Error (L4 §ErrorState + Retry Contract L4 §FB.19)
```
**MUST** الانتقال بين هذه الحالات سلسًا (Chapter 5 Motion) لا قفزة مفاجئة. **Related Governance:** Chapter 8 L5 §DD.10 هو مصدر الحقيقة؛ هذا النمط يطبّقه على مستوى الصفحة لا المكوّن المفرد فقط.

## PT-CONFIRMATION-001 — Confirmation Decision Pattern
**Purpose:** متى يُطلَب تأكيد قبل تنفيذ إجراء — يستهلك Chapter 8 L4 ADR-0016 (Escalation) وL7 §EC.3 (Safety Levels) معًا كقرار واحد موحّد:
```
هل الإجراء Destructive (L7 §EC.3)؟ → نعم → Confirmation Dialog إلزامي (L4)
هل الإجراء Reversible؟ → Toast + Undo (L4 §Snackbar) كافٍ، لا Dialog
هل الإجراء Safe؟ → بلا تأكيد إضافي
```
**Related Governance:** Chapter 8 L7 §EC.3 حرفيًا — هذا النمط تطبيقه العملي فقط، لا تكرار للتعريف.

## PT-BULKACTION-001 — Bulk Action Pattern
**Purpose:** التدفق الكامل من الاختيار حتى تنفيذ إجراء جماعي.
```
Select (L5 §DD.9 Multiple) → Action Bar يظهر (L7 §CMP-ACTIONBAR-001) → اختيار إجراء (L7 §CMP-BULKACTIONS-001)
  → PT-CONFIRMATION-001 (حسب مستوى الخطورة) → Execution (L7 §EC.2/EC.11 Idempotent)
  → Feedback (L4، يعكس النجاح الجزئي إن وُجد، L7 §EC.6 نمط النجاح الجزئي)
```
**Related Governance:** يربط L4، L5 §DD.9، وL7 بالكامل في تسلسل واحد.

---

## Do & Don't
**Do:** ابدأ أي مهمة متكررة جديدة بمراجعة هل يوجد Pattern هنا يطابقها أولاً · طبّق نفس Pattern بحرفية عبر كل الكيانات (لاعب/نادٍ/حكم)
**Don't:** لا تبتكر تسلسلاً جديدًا لمهمة CRUD/Search/Filter موجودة بالفعل هنا · لا تستخدم Tabs بدل Stepper في PT-WIZARD-001 (يخالف Chapter 8 L3 §N.2)

## Success Metrics
- 100% من شاشات CRUD في لوحة التحكم تتبع PT-CRUD-001 حرفيًا
- 0 تسلسل بحث/فلترة مُعاد اختراعه خارج PT-SEARCH-001/PT-FILTER-001
- 100% من التدفقات متعددة الخطوات تستخدم Stepper لا Tabs

## References
**Normative:** Chapter 8 (كل المستويات) · Chapter 9
**Informative:** Nielsen Norman Group (مبادئ UX عامة، ليست مصدر قواعد مباشر)

## Related Chapters
Chapter 8 (المصدر الكامل للمكونات) · Chapter 12 (Dashboard يُخصِّص هذه الأنماط لسياقه) · Chapter 13 (CMS) · Chapter 20 (Page Templates)

---

*نهاية Chapter 11. الفصل التالي: Chapter 12 — Dashboard Patterns.*

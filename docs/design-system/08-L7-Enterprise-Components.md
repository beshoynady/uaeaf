# Chapter 8 — Component Inventory
## Level 7: Enterprise Components (Enterprise Action Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L7 of 8) | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Button/Chip/Badge) · Chapter 8 L2 (SearchInput/FileUpload) · Chapter 8 L3 (Stepper/§N.19 Authorization Boundary) · Chapter 8 L4 (ConfirmationDialog/Progress) · Chapter 8 L5 (Selection Model/Filtering/Data State) | Chapter 12 (Dashboard Patterns) · Chapter 13 (CMS Workflow) · L8 (Sports: اعتماد نتائج، تسجيل جماعي للاعبين) |

## Scope
**يغطي:** L7 كطبقة تُميّز هذا النظام عن أي Design System عام — أدوات إدارية تعمل فوق L5 (Filter Bar, Search Bar, Data Toolbar, Action Bar, Bulk Actions, Advanced Filters, Export Menu, Import Wizard, Approval Status, Audit Timeline).
**لا يغطي:** Activity Feed (موثَّق بالفعل في Chapter 8 L5 §CMP-ACTIVITYFEED-001 — **MUST NOT** إعادة تعريفه هنا، تطبيقًا لـADR-0013 منع التكرار عبر المستويات).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Bulk Action** | إجراء يُطبَّق على أكثر من عنصر مُختار في وقت واحد (حذف 40 لاعبًا، اعتماد 5 نتائج) |
| **Destructive Action** | إجراء ذو أثر لا رجعة فيه أو يصعب التراجع عنه (حذف نهائي) |
| **Audit Record** | سجل غير قابل للتعديل يوثّق من فعل ماذا ومتى |

## Purpose
"Enterprise Action Foundation" هو العقد المركزي لأي إجراء إداري يتجاوز نطاق سجل واحد — الخطر هنا أعلى من أي مستوى سابق (بيانات حقيقية لعشرات/مئات اللاعبين والأندية)، لذلك هذا الفصل محوره **السلامة قبل الكفاءة**.

---

## ADR-0019: Enterprise Action Architecture

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Product Decision (يبني مباشرة على PR-003 Accessibility وChapter 8 L4 ADR-0016) |
| **Context** | مكونات L7 تُنفِّذ إجراءات بأثر واسع (Bulk Delete، Import مئات السجلات) بواسطة عدد محدود من المستخدمين المخوَّلين (Chapter 0: Operational Experience) — الخطر عالٍ، الفريق البشري صغير، والحاجة لسلامة أعلى من أي مستوى سابق |
| **Decision** | كل إجراء Enterprise **MUST** يُصنَّف على مستوى خطورة (§EC.3) يحدد مستوى التأكيد المطلوب (Chapter 8 L4 Escalation Model، ADR-0016) · كل إجراء **MUST** ينتج سجل تدقيق (§EC.4) تلقائيًا بلا استثناء · ظهور أي إجراء **MUST** يخضع لـAuthorization Boundary (نفس مبدأ Chapter 8 L3 §N.19 — لا يظهر الزر أصلاً لمن لا يملك صلاحيته) |
| **Alternatives Considered** | معاملة إجراءات L7 بنفس عقد Button العادي (Chapter 8 L1) بلا طبقة سلامة إضافية — رُفض لأن أثر الخطأ هنا (حذف بيانات جماعي) أكبر بكثير من زر عادي |
| **Why This Decision** | تطبيق مباشر لمبدأ "السلامة قبل الكفاءة" — فريق تشغيلي صغير (Chapter 0 Discovery: مالك المشروع الوحيد حاليًا، وحتى فريق مستقبلي محدود العدد) يعني أن كل خطأ إداري مكلف نسبيًا |
| **Risks** | طبقات تأكيد إضافية قد تبدو "بطيئة" لمستخدم متمرّس. Mitigation: §EC.3 يفرّق بين مستويات الخطورة — إجراءات آمنة (تصدير Export) لا تحتاج نفس تأكيد إجراءات مدمّرة |
| **Consequences** | كل مكوّن أدناه **MUST** يعلن مستوى خطورته ومسار تأكيده صراحة |

---

## Enterprise Action Foundation — الأقسام المشتركة

### EC.1 Enterprise Component Definition
مكوّن L7 **MUST** يعمل فوق مجموعة بيانات (نتيجة Selection من L5 أو نطاق مُعرَّف) لا سجل واحد — **MUST NOT** استبدال إجراء فردي بسيط (ذلك زر عادي، Chapter 8 L1).

### EC.2 Bulk Action Contract
**MUST** يعتمد على Chapter 8 L5 §DD.9 Selection Model (`Multiple`) و§DD.16 Display Identity — لا إجراء جماعي بدون اختيار واضح ومعرّفات مستقرة. **MUST** عداد واضح للعناصر المختارة ظاهر أثناء تفعيل أي Bulk Action ("سيتم تطبيق الإجراء على 40 عنصرًا").

### EC.3 Action Safety Levels
| المستوى | مثال | مسار التأكيد المطلوب |
|---|---|---|
| **Safe** | تصدير، تحديث عرض | بلا تأكيد إضافي |
| **Reversible** | تعطيل مؤقت، إلغاء اعتماد | Toast مع Undo (Chapter 8 L4 §CMP-SNACKBAR-001) |
| **Destructive** | حذف جماعي نهائي | Confirmation Dialog إلزامي (Chapter 8 L4) — **MUST** كتابة عدد العناصر أو كلمة تأكيد للإجراءات الأخطر |

### EC.4 Audit Logging Contract
كل إجراء L7 **MUST** ينتج سجل تدقيق تلقائيًا (من فعل، ماذا، متى، على أي عناصر) — **MUST NOT** إجراء إداري صامت بلا أثر قابل للمراجعة. السجل نفسه **MUST** غير قابل للتعديل بعد إنشائه (Append-only).

### EC.5 Export Contract
| البُعد | القاعدة |
|---|---|
| النطاق | **MUST** واضح صراحة: `Selected` (المختار فقط) / `Filtered` (نتائج الفلتر الحالي) / `All` (كل البيانات) — لا افتراض ضمني |
| الحجم | تصدير كبير (>1000 صف) **SHOULD** غير متزامن (Async، يستهلك Chapter 8 L4 §CMP-PROGRESSBAR-001 + إشعار عند الاكتمال — راجع §EC.12) لا حجب الواجهة |
| الصيغة | **MUST** واضحة قبل التنفيذ (CSV/Excel/PDF) عبر Export Menu |
| حساسية البيانات | تصدير يحتوي بيانات شخصية حساسة (بيانات قاصرين، Chapter 0 Discovery) **MUST** يخضع لنفس قيود Chapter 17 (Data Privacy)؛ **SHOULD** توثيق من صدَّر الملف ومتى ضمن §EC.4 Audit Logging (لا يكفي تسجيل "تم التصدير" فقط) |

### EC.6 Import Contract
```
File Selected → Validation Preview → Confirm → Processing → Partial Success | Full Success | Full Failure
```
**MUST** معاينة (Preview) البيانات وعرض الأخطاء **قبل** الالتزام الفعلي (Commit) — لا استيراد مباشر بلا فرصة مراجعة. **MUST** نجاح جزئي (بعض الصفوف صحيحة، أخرى لا) يُعرَض بوضوح صف بصف — لا رفض كامل الملف لخطأ في صف واحد إلا لضرورة موثَّقة. **Rollback Policy (MUST يُعلَن صراحة):** بعد Commit فعلي، **SHOULD** إتاحة تراجع كامل عن دفعة الاستيراد بأكملها (`operationId` واحد، §EC.11) خلال نافذة زمنية محدودة — لا يُفترض ضمنيًا أن كل استيراد نهائي وبلا رجعة بمجرد نجاحه.

### EC.7 Approval Workflow Contract
حالات موحّدة لكل عملية اعتماد في المنصة (اعتماد نتيجة بطولة، تسجيل نادٍ جديد): `Pending → Approved | Rejected | Escalated`. **MUST** كل انتقال حالة يُسجَّل عبر §EC.4 Audit Logging مع اسم المُعتمِد.

### EC.8 Permission Visibility (تطبيق Chapter 8 L3 §N.19 على مستوى الإجراء)
أي إجراء L7 **MUST** يختفي بالكامل (لا Disabled فقط) لمستخدم لا يملك صلاحيته الأساسية — نفس منطق Visibility Contract في L3، مُطبَّقًا هنا على الأزرار/القوائم لا عناصر التنقل.

### EC.9 Accessibility
تطبيق Chapter 6 الكامل: Bulk Actions Toolbar **MUST** `aria-live="polite"` لإعلان تغيّر عدد العناصر المختارة · Import Wizard **MUST** يتبع Chapter 8 L3 §Stepper A11y الكامل.

### EC.10 Composition
```
<EnterpriseAction>
  ├── Trigger (زر/رابط يظهر حسب §EC.8)
  ├── Safety Gate (§EC.3 — حسب المستوى)
  ├── Execution (§EC.2/EC.5/EC.6)
  └── Audit Emission (§EC.4، تلقائي دائمًا)
```

### EC.11 Idempotent Retry Contract
تنفيذ Bulk Action **MUST** يكون آمنًا عند إعادة المحاولة (نفس منطق Chapter 8 L4 §FB.25 لكن على مستوى العملية الجماعية كاملة، لا حدث تغذية راجعة فردي): لو فشل تنفيذ جزئي (نجحت 30 من 40 عملية حذف) ثم أعاد المستخدم المحاولة، **MUST NOT** إعادة تنفيذ العناصر الـ30 الناجحة بالفعل — العملية **MUST** تحمل معرّفًا (`operationId`) يتتبّع أي عناصر أُنجزت فعليًا.

### EC.12 Long-Running Operation Contract
عمليات تتجاوز الاستجابة الفورية (Import ضخم، Export كبير — §EC.5/§EC.6) **MUST** تستمر في الخلفية حتى لو أغلق المستخدم الصفحة أو انتقل بعيدًا (Chapter 8 L3 §N.4)؛ الحالة **MUST** قابلة للاستعلام لاحقًا (لا تُفقَد العملية بمجرد مغادرة الشاشة)، مع إشعار عند الاكتمال (Chapter 18 Notifications — نقطة تكامل مستقبلية موثَّقة هنا).

### EC.13 Conflict Resolution Contract
عند تعارض بيانات أثناء Bulk Action (عنصران من المُختارين عُدِّلا من مستخدم آخر أثناء المعالجة): **MUST** إستراتيجية معلنة صراحة لكل سياق — إما `Last-Write-Wins` (الأحدث يفوز) أو `Reject-on-Conflict` (تخطي العنصر المتعارض مع إعلامه في نتيجة العملية، §EC.6 نمط النجاح الجزئي) — **MUST NOT** فشل صامت أو الكتابة فوق تغيير الآخر دون علمه.

### EC.14 Cross-Entity Impact Preview
لإجراءات Destructive (§EC.3) ذات أثر متسلسل على كيانات مرتبطة (حذف نادٍ له لاعبون مسجَّلون): **MUST** معاينة الأثر الكامل قبل التنفيذ ("هذا الإجراء سيؤثر أيضًا على 15 لاعبًا مرتبطًا بهذا النادي") — لا تنفيذ يكتشف المستخدم أثره الجانبي بعد فوات الأوان.

---

## Discovery & Filtering

## CMP-SEARCHBAR-001 — Search Bar
**Purpose:** بحث على مستوى صفحة/قسم كامل (لا حقل مفرد كـL2 SearchInput). **Related Governance:** يبني فوق Chapter 8 L2 §CMP-SEARCHINPUT-001 مباشرة + Chapter 8 L5 §DD.7 Searching Contract.

## CMP-FILTERBAR-001 — Filter Bar
**Purpose:** شريط فلاتر سريعة فوق عرض بيانات (فلترة أندية حسب الحالة). **Anatomy:** مجموعة Chips (Chapter 8 L1) + زر "مسح الكل". **Related Governance:** Chapter 8 L5 §DD.6 Filtering Contract مباشرة — لا إعادة تعريف.

## CMP-ADVANCEDFILTERS-001 — Advanced Filters
**Purpose:** بانل/Drawer لبناء فلاتر معقدة متعددة الشروط (لاعبون: الفئة العمرية + النادي + الحالة معًا). **Anatomy:** يبني فوق Chapter 8 L4 §CMP-DRAWER-001 + مكونات L2 (Select، Checkbox) لكل شرط. **Related Governance:** ينتج نتيجته النهائية كـFilter Bar Chips (تكامل مباشر).

## CMP-DATATOOLBAR-001 — Data Toolbar
**Purpose:** الشريط المركّب الذي يجمع فوق أي Data Display (L5): بحث + فلاتر سريعة + عداد نتائج + زر تصدير + مشغّل Bulk Actions عند وجود اختيار. **Composition:** يستهلك CMP-SEARCHBAR-001 + CMP-FILTERBAR-001 + CMP-EXPORTMENU-001 معًا في مكوّن واحد مركّب — لا تكرار منطقها الفردي. **Related Governance:** EC.10، Chapter 8 L5 §DD.15 (يجلس في منطقة Toolbar من Data Display Composition).

---

## Bulk Operations

## CMP-ACTIONBAR-001 — Action Bar (Contextual)
**Purpose:** شريط سياقي يظهر **فقط** عند وجود اختيار نشط (Chapter 8 L5 §DD.9) — "3 عناصر مُختارة: حذف، تصدير، اعتماد". **Behavior:** **MUST** يظهر/يختفي بانسيابية مع تغيّر حالة الاختيار من فارغة لغير فارغة والعكس (Chapter 5 Motion). **Related Governance:** EC.2، EC.9 (`aria-live`).

## CMP-BULKACTIONS-001 — Bulk Actions
**Purpose:** مجموعة الإجراءات الفعلية القابلة للتطبيق الجماعي، مُستهلَكة داخل Action Bar. **Related Governance:** EC.2، EC.3 (كل إجراء يُصنَّف صراحة)، EC.4 (كل تنفيذ يُسجَّل).

## CMP-EXPORTMENU-001 — Export Menu
**Purpose:** قائمة اختيار صيغة وتنفيذ التصدير. **Anatomy:** يبني فوق Chapter 8 L3 §CMP-DROPDOWNMENU-001. **Related Governance:** EC.5 كاملة.

## CMP-IMPORTWIZARD-001 — Import Wizard
**Purpose:** تدفق استيراد بيانات جماعي (استيراد قائمة لاعبين من ملف Excel). **Anatomy:** يبني فوق Chapter 8 L3 §CMP-STEPPER-001 (خطوات: رفع → معاينة → تأكيد → نتيجة) + Chapter 8 L2 §CMP-FILEUPLOAD-001. **Related Governance:** EC.6 كاملة، Chapter 8 L2 §F.10 Form Submission Contract (للخطوة النهائية).

---

## Governance & Workflow

## CMP-APPROVALSTATUS-001 — Approval Status
**Purpose:** مؤشر بصري لحالة اعتماد عنصر (Badge، Chapter 8 L1، متخصص). **Variants:** `Pending` (Info) · `Approved` (Success) · `Rejected` (Danger) · `Escalated` (Warning) — يعكس §EC.7 حرفيًا. **Related Governance:** EC.7، Chapter 1 ADR-0004 (الأحمر لـRejected فقط، لا استخدام عام).

## CMP-AUDITTIMELINE-001 — Audit Timeline
**Purpose:** عرض متخصص لسجلات التدقيق (§EC.4) لعنصر معيّن (تاريخ كامل التغييرات على ملف لاعب). **Anatomy:** يبني فوق Chapter 8 L5 §CMP-TIMELINE-001 مباشرة، بحقول ثابتة إضافية (المستخدم، الإجراء، الوقت، القيمة قبل/بعد). **Related Governance:** EC.4 (مصدر البيانات)، Chapter 8 L5 §DD.10 (Live-Updating شائع هنا لعناصر نشطة).

---

## Do & Don't (L7 عام)
**Do:** صنّف كل إجراء جديد على §EC.3 Safety Level أولاً · تأكد من إنتاج Audit Record لأي إجراء جديد (EC.4 بلا استثناء)
**Don't:** لا تُعِد توثيق Activity Feed هنا (موجود في L5) · لا تسمح بإجراء Destructive بدون Confirmation Dialog مهما كانت السرعة المطلوبة

## Success Metrics
- 100% من إجراءات L7 مصنَّفة على §EC.3 صراحة
- 100% من الإجراءات تُنتج Audit Record (EC.4) — صفر إجراء صامت
- 0 إجراء Destructive بلا Confirmation Dialog
- 100% من أزرار L7 تختفي (لا Disabled فقط) لمن لا يملك الصلاحية (EC.8)
- 0 إعادة تنفيذ لعناصر أُنجزت بالفعل عند Retry (EC.11)
- 100% من عمليات Destructive ذات الأثر المتسلسل تعرض معاينة تأثير كاملة (EC.14)
- 100% من عمليات التصدير الحساسة موثَّقة بمن صدَّرها ومتى (EC.5)

## References
**Normative:** Chapter 2 (PR-003) · Chapter 8 L3 (§N.19) · Chapter 8 L4 (ADR-0016) · Chapter 8 L5 (§DD.9, §DD.16) · Chapter 8 Global Governance
**Implementation:** WAI-ARIA APG · Chapter 21 (سيوثّق تكامل Audit Log التقني الفعلي)
**Informative:** WCAG 2.2

## Related Chapters
Chapter 8 L1/L2/L3/L4/L5 (كل الاعتماديات) · Chapter 12 (Dashboard Patterns يستهلك هذا المستوى بكثافة) · Chapter 13 (CMS Workflow) · Chapter 17 (تفاصيل أمان الاستيراد)

---

*نهاية L7 Enterprise (Enterprise Action Foundation EC.1-EC.14 + 9 مكونات). التالي: L8 UAEAF Sports/Domain Components — المستوى الأخير.*

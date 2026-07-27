# Chapter 13 — CMS System (CMS Business Domain)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 8 L2 (Form Foundation) · Chapter 8 L7 (Approval Workflow §EC.7) · Chapter 9 (Content Rules) · Chapter 11 (PT-CRUD-001, PT-WIZARD-001) · Chapter 12 (DB-WORKSPACE-001) | Chapter 14 (SEO يستهلك Metadata من هنا) · Chapter 20 (صفحات الموقع العام تستهلك محتوى CMS) |

## 1. Purpose & Scope
**يغطي:** الـCMS كنظام أعمال (Business Domain) — نموذج المحتوى، دورة حياة النشر، الصلاحيات التحريرية، الجدولة، تعدد اللغات، حدود التكامل مع بقية المنصة.
**لا يغطي:** أي مكوّن UI جديد (Chapter 8 وحده المصدر) — واجهات المحرر نفسها **MUST** تُبنى من Chapter 8 L2 (Forms) وChapter 12 §DB-WORKSPACE-001 حصريًا.

## Definitions
| المصطلح | التعريف |
|---|---|
| **Content Type** | نموذج بيانات محتوى محدَّد (خبر، صفحة ثابتة، سيرة لاعب) بحقول ثابتة |
| **Block** | وحدة محتوى مرنة قابلة للتركيب داخل محرر غني (نص، صورة، اقتباس) |
| **Headless CMS** | نمط معماري يفصل إدارة المحتوى (الكتابة، الاعتماد) عن طريقة عرضه النهائية (الموقع العام، تطبيق مستقبلي) |

---

## 2. ADR-0024: CMS as a Headless Business Platform

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Product Decision (يؤسس لكل قرارات هذا الفصل) |
| **Context** | المنصة تحتوي وحدات عمل متعددة (أخبار، فعاليات، بطولات، أندية، لاعبين، صفحات ثابتة) — بدون حدود واضحة، كل وحدة قد تبني منطق نشر/جدولة/اعتماد خاصًا بها، فتتحول المنصة إلى "عدة أنظمة CMS صغيرة" غير متسقة |
| **Decision** | الـCMS **MUST NOT** يُعامَل كمحرر أخبار بسيط — هو **مصدر الحقيقة الوحيد (Single Source of Truth)** لكل محتوى منشور علنًا. أي Module (أخبار/فعاليات/بطولات/أندية/لاعبين/صفحات/وسائط) **MUST NOT** ينشر محتواه مباشرة بمعزل — **MUST** يمر عبر الـCMS عند الحاجة للنشر العام. الـCMS **MUST** مسؤولاً حصريًا عن: Editorial Workflow، Publishing، Scheduling، Versioning، Localization، SEO. الوحدات التشغيلية (Business Modules) **MUST** تبقى مسؤولة فقط عن بياناتها التشغيلية الخام (بيانات اللاعب نفسها، نتيجة المباراة) لا عن كيفية نشرها |
| **Alternatives Considered** | كل Module يدير نشره الخاص (محرر أخبار منفصل، محرر فعاليات منفصل) — رُفض لأنه يُنتج تجربة تحريرية غير متسقة (Chapter 0 Discovery: CMS هو الأكثر استخدامًا يوميًا، فريق الإعلام يحتاج تجربة واحدة موحّدة لا عدة أدوات) |
| **Why This Decision** | يطابق نمط Headless CMS القياسي، ويحافظ على Chapter 9 ADR-0021 (اتساق المحتوى) على مستوى معماري لا صياغي فقط |
| **Risks** | ربط كل نشر بالـCMS قد يُبطئ نشر محتوى تشغيلي بسيط (تحديث نتيجة فورية لا يحتاج مراجعة تحريرية كاملة). Mitigation: §5 Editorial Workflow **MAY** مسارًا مختصرًا (Fast-track) لمحتوى تشغيلي منخفض الخطورة، موثَّقًا صراحة كاستثناء لا كسرًا للمبدأ |
| **Consequences** | كل قسم لاحق في هذا الفصل (§3-§14) **MUST** يُبنى فوق هذا المبدأ المركزي |

### Hybrid Entity Boundary (توضيح حاسم لـADR-0024)
كيانات مثل اللاعب والنادي (Chapter 8 L8) لها **جزءان منفصلان بوضوح**:
```
Operational Data (اسم، نادٍ، فئة عمرية، نتائج) → مملوكة للـModule التشغيلي (Business Module)، لا تمر بـEditorial Workflow
Editorial Content (نبذة تعريفية، مقال تعريفي، صور مختارة للعرض) → مملوكة للـCMS بالكامل، تخضع لـ§5 و§6 حرفيًا
```
**MUST** الفصل بين الجزءين واضحًا في تصميم قاعدة البيانات (Chapter 21 لاحقًا) — **MUST NOT** حقل "نبذة اللاعب" يُعدَّل مباشرة من شاشة إدارة اللاعب التشغيلية بمعزل عن دورة اعتماد CMS، حتى لو بدا ذلك أسرع للمستخدم الإداري.

---

## 3. CMS Architecture
الـCMS **MUST** يُبنى كطبقة منفصلة (Headless) يستهلكها الموقع العام (Chapter 20) عبر واجهة بيانات لا اقتران مباشر بالعرض — يتوافق مع Chapter 8 L8 ADR-0020 (نفس منطق تجريد مصدر البيانات، مطبَّقًا هنا على المحتوى التحريري).

## 4. Content Model
| Content Type | الوصف |
|---|---|
| **Page** | صفحة ثابتة (عن الاتحاد، سياسة الخصوصية) |
| **Article** | خبر/مقال (Chapter 0 Discovery: الأكثر استخدامًا يوميًا) |
| **Media Asset** | صورة/فيديو مُدار (يستهلك Chapter 8 L6 Media Foundation) |
| **Category / Tag** | تصنيف محتوى (يتكامل مع Chapter 9 §CR-8.1 Terminology Registry لمنع تصنيفات مكررة الاسم) |
| **Block** | وحدة محتوى مرنة داخل محرر غني (Rich Text، Chapter 0 Discovery: WYSIWYG) |

## 5. Editorial Workflow
يستهلك Chapter 8 L7 §EC.7 Approval Workflow Contract مباشرة — لا إعادة تعريف:
```
Draft → In Review → Approved | Rejected
```
**MAY** مسار Fast-track لمحتوى تشغيلي منخفض الخطورة (راجع ADR-0024 §Risks) — **MUST** موثَّقًا كاستثناء صريح لكل نوع محتوى يُسمح له بذلك، لا قاعدة عامة ضمنية.

## 6. Publishing Lifecycle
قسم مستقل (لا جزء فرعي من §5) لأن Chapter 0 Discovery وChapter 8 L8 وChapter 20 لاحقًا يعتمدون عليه مباشرة:
```
Draft → In Review → Approved → Scheduled → Published → Archived
```
**MUST** كل انتقال بين هذه الحالات يُسجَّل عبر Chapter 8 L7 §EC.4 Audit Logging. `Published` **MUST** هي الحالة الوحيدة المرئية للجمهور العام (Chapter 20) — أي حالة أخرى **MUST NOT** تظهر خارج لوحة التحكم مهما كانت الظروف.

### 6a. Content Preview Contract
قبل أي انتقال لـ`Published`، المحرر/المُعتمِد **MUST** إمكانية معاينة المحتوى **كما سيظهر فعليًا** للجمهور (لا نص خام في نموذج التحرير فقط) — يستهلك Chapter 8 L4 §CMP-DRAWER-001 أو نافذة معاينة مخصصة تُصيِّر نفس قوالب Chapter 20 الفعلية. **MUST NOT** اعتماد محتوى (`Approved`) بدون معاينة بصرية واحدة على الأقل.

### 6b. Draft Autosave Contract
مسودة قيد الكتابة **SHOULD** حفظ تلقائي دوري (يستهلك مبدأ Chapter 8 L2 §F.10 Form Submission Contract بصيغة صامتة لا تتطلب ضغط زر) — **MUST NOT** فقدان محتوى غير محفوظ عند انقطاع الاتصال أو إغلاق غير مقصود للمتصفح.

### 6c. Archival vs. Deletion (تمييز حاسم)
`Archived` **MUST NOT** تُعامَل كمرادف لـ"محذوف": المحتوى المؤرشف **MUST** يبقى موجودًا بالكامل (قابلاً للاسترجاع، Chapter 8 L7 §EC.11 مبدأ مشابه) لكن غير ظاهر للجمهور العام — الحذف الفعلي النهائي **MUST** إجراء منفصل تمامًا يخضع لـChapter 8 L7 §EC.3 Destructive Action وConfirmation Dialog، لا نتيجة تلقائية للأرشفة.

## 7. Content Relationships
محتوى CMS (خاصة `Article`) غالبًا **MUST** قابلاً للربط بكيانات تشغيلية (Chapter 8 L8): خبر عن فوز لاعب **MUST** يدعم ربطًا صريحًا بسجل ذلك اللاعب (`Athlete Reference`) — **MUST NOT** ذكر اسم اللاعب كنص حر فقط دون رابط بيانات فعلي، لضمان ظهور الخبر تلقائيًا في صفحة ملف اللاعب (تكامل مباشر يخدم Chapter 14 SEO وتجربة المستخدم دون عمل يدوي مضاعف).

## 8. Scheduling & Publishing
Chapter 0 Discovery قرّر عدم الحاجة لجدولة نشر معقدة (اكتفاء بمسودة/انتظار موافقة/نشر) — لكن Chapter 8 L7 §EC.12 Long-Running Operation Contract يوفّر الأساس التقني لو احتيج لاحقًا (`Scheduled` في §6 محجوزة بنيويًا، غير مُفعَّلة بالضرورة في الإصدار الأول).

## 9. Localization / Multi-language Content
يطابق Chapter 0 Discovery وChapter 9 §CR-1.6 حرفيًا: **MUST NOT** ترجمة آلية — كل Content Type **MUST** حقلي محتوى منفصلين (عربي/إنجليزي) بمحتوى احترافي مستقل لكل لغة، لا نسخة واحدة مترجمة تلقائيًا.

## 10. Media Management
يستهلك Chapter 8 L6 Media Foundation بالكامل + Chapter 8 L2 §CMP-FILEUPLOAD-001/ImageUpload — **MUST NOT** منطق رفع أو معالجة صور موازٍ يُبتكَر هنا.

## 11. Permissions & Editorial Roles
يبني فوق نظام الأدوار والصلاحيات العام (Chapter 0 Discovery: الأدوار الوظيفية داخل لوحة التحكم — سؤال كان مفتوحًا، يُحسم في Chapter 22 لاحقًا) — أدوار تحريرية نموذجية: `Editor` (يكتب، يُرسل للمراجعة) · `Reviewer/Approver` (يعتمد، Chapter 8 L7 §EC.7) · `Publisher` (صلاحية النشر النهائي، قد تتطابق مع Approver أو تنفصل حسب هيكل الاتحاد). **MUST** يطبّق Chapter 8 L3 §N.19 Authorization Boundary — عنصر تحرير لا يملكه المستخدم صلاحيته **MUST NOT** يظهر أصلاً.

## 12. SEO & Metadata
كل `Article`/`Page` **MUST** حقول Metadata مخصصة (Meta Title، Meta Description، صورة مشاركة) منفصلة عن العنوان/المحتوى الظاهر — يُفصَّل التطبيق التقني الكامل في Chapter 14 (SEO)، هذا القسم يوثّق فقط أن الحقول **MUST** موجودة في Content Model (§4).

## 13. Integration Boundaries
الموقع العام (Chapter 20) **MUST** يستهلك محتوى CMS عبر واجهة بيانات محدَّدة (API محايد، Chapter 8 L8 ADR-0020 بنفس المنطق) — **MUST NOT** اقتران مباشر بين طبقة عرض الموقع العام وقاعدة بيانات CMS الداخلية. يضمن قابلية تغيير تنفيذ الـCMS مستقبلاً دون كسر الموقع العام.

## 14. CMS Registry
مرجع مركزي لأنواع المحتوى (نفس منطق Chapter 11/12 Registries):

| Content Type ID | الاسم | حالة النشر المدعومة |
|---|---|---|
| CT-ARTICLE-001 | Article/News | Full Lifecycle (§6) |
| CT-PAGE-001 | Static Page | Full Lifecycle |
| CT-MEDIA-001 | Media Asset | Simplified (لا Editorial Workflow كامل، يخضع لـChapter 8 L6 فقط) |

---

## Do & Don't
**Do:** مرّر أي نشر جديد عبر ADR-0024 (هل يجب أن يمر بالـCMS؟) · استهلك Chapter 8 L7 §EC.7 لأي حالة اعتماد بدل ابتكار Workflow جديد
**Don't:** لا تُنشئ نظام نشر مستقل لأي Module (أخبار، فعاليات) بمعزل عن CMS · لا تُظهر حالة غير `Published` للجمهور العام مهما كان السبب

## Success Metrics
- 100% من المحتوى المنشور علنًا يمر عبر Editorial Workflow (§5) أو Fast-track موثَّق صراحة
- 0 حالة محتوى غير `Published` مرئية للجمهور العام
- 100% من أنواع المحتوى تحمل حقول SEO Metadata منفصلة (§12)
- 0 اقتران مباشر بين الموقع العام وقاعدة بيانات CMS الداخلية (§13)
- 0 اعتماد محتوى (`Approved`) بدون معاينة بصرية مسبقة (§6a)
- 0 فقدان محتوى بسبب انقطاع اتصال دون Autosave (§6b)
- 0 محتوى مؤرشف يُعامَل أو يُحذَف تلقائيًا كأنه Deletion فعلي (§6c)
- 100% من الأخبار المرتبطة بلاعب/نادٍ تحمل Content Relationship صريح لا نصًا حرًا فقط (§7)

## References
**Normative:** Chapter 0 (Discovery) · Chapter 8 L2/L6/L7 · Chapter 9
**Informative:** Headless CMS Architecture Patterns (مرجع مفاهيمي عام)

## Related Chapters
Chapter 8 (كل الاعتماديات) · Chapter 9 · Chapter 11/12 (التركيب) · Chapter 14 (SEO) · Chapter 20 (الاستهلاك النهائي) · Chapter 22 (الأدوار والصلاحيات الكاملة)

---

*نهاية Chapter 13. الفصل التالي: Chapter 14 — SEO & AI Search Guidelines.*

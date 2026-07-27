# Chapter 26 — Glossary

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Scope
**يغطي:** كل مصطلح عُرِّف عبر الفصول 0-25، مجمَّعًا أبجديًا بمرجعه الأصلي — لا تعريف جديد، استشهاد فقط (نفس منطق Chapter 23 ADR-0035).
**لا يغطي:** أي مصطلح لم يُعرَّف رسميًا في فصله — الغياب هنا يعني الحاجة لتعريفه أولاً في فصله المناسب، لا إضافته هنا مباشرة.

## Purpose
هذا الفصل **المرجع الأبجدي الوحيد** لكل مصطلح تقني في الوثيقة — نقطة بحث سريعة واحدة بدل تصفح 25 فصلاً.

---

## A
- **Accessible Name** — النص الذي يقرأه قارئ الشاشة لعنصر تفاعلي (Chapter 6)
- **AI-Assisted** — AI يقترح، الإنسان يقرر ويعتمد (Chapter 16)
- **AI Extraction** — استخراج نموذج AI لحقيقة محددة من صفحة لعرضها كإجابة (Chapter 15)
- **Alias Token** — اسم مستعار مختصر بين Primitive وتوكن نهائي، لأغراض البناء الداخلي فقط (Chapter 3)
- **Anatomy** — التشريح البصري لمكوّن، الأجزاء الفرعية المكوِّنة له (Chapter 8)
- **Answer-First Content** — أسلوب كتابة يضع الإجابة الجوهرية في أول الفقرة (Chapter 15)
- **Anti-Pattern** — تطبيق شائع وخاطئ لمبدأ، يُذكر لمنع تكراره (Chapter 2)
- **Audit Record** — سجل غير قابل للتعديل يوثّق من فعل ماذا ومتى (Chapter 8 L7)

## B
- **Baseline Freeze** — حالة فصل مُعتمَد نهائيًا لا يُعدَّل إلا عبر ADR جديد (Chapter 22)
- **Behavior Layer** — طبقة منطق المكوّن والوصول، منفصلة عن المظهر (Chapter 8 ADR-0012)
- **Blocking Feedback** — تغذية راجعة تمنع أي تفاعل آخر حتى الاستجابة (Chapter 8 L4)
- **Block** — وحدة محتوى مرنة قابلة للتركيب داخل محرر غني (Chapter 13)
- **Brand Token** — Primitive معاد تسميته بمعنى العلامة التجارية (Chapter 1، Chapter 3)
- **Breakpoint** — عرض شاشة يتغيّر عنده عدد أعمدة الشبكة/التخطيط (Chapter 5)
- **Bulk Action** — إجراء يُطبَّق على أكثر من عنصر مُختار في وقت واحد (Chapter 8 L7)

## C
- **Canonical URL** — الرابط المرجعي الرسمي الوحيد لمحتوى قد يكون متاحًا بأكثر من مسار (Chapter 14)
- **Channel** — وسيلة توصيل إشعار (Chapter 18)
- **Choreography** — تسلسل زمني منسّق لحركة عناصر متعددة (Chapter 5)
- **Clear Space** — مساحة الأمان الإجبارية حول الشعار (Chapter 1)
- **Component (CMP)** — وحدة واجهة قابلة لإعادة الاستخدام، موثَّقة في Chapter 8
- **Component Token** — توكن خاص بمكوّن واحد فقط (Chapter 3)
- **Confidence Indicator** — إشارة بصرية لمستوى يقين اقتراح AI (Chapter 16)
- **Content Rule (CR)** — قاعدة صياغة ملزمة لنوع محتوى معيّن (Chapter 9)
- **Content Type** — نموذج بيانات محتوى محدَّد بحقول ثابتة (Chapter 13)
- **Current Route** — التمثيل المجرّد للموقع الحالي في التطبيق (Chapter 8 L3)

## D
- **Dashboard Zone** — منطقة ثابتة الموضع داخل شاشة لوحة تحكم (Chapter 12)
- **Data Subject** — الشخص الذي تخصّه البيانات الشخصية (Chapter 17)
- **Date-only Value** — قيمة تاريخ بلا وقت، مستقلة عن المنطقة الزمنية (Chapter 19)
- **Dead Token** — توكن مُعرَّف لكنه غير مستخدم في أي مكان بالكود (Chapter 3)
- **Delivery Guarantee** — مستوى الضمان بأن إشعارًا وصل فعليًا (Chapter 18)
- **Density** — مقدار التباعد داخل عنصر عرض بيانات (Chapter 8 L5)
- **Destructive Action** — إجراء ذو أثر لا رجعة فيه أو يصعب التراجع عنه (Chapter 8 L7)
- **Discipline Group** — تصنيف لعبة فرعية حسب طبيعة قياس نتيجتها (Chapter 10)
- **Documented Consent** — موافقة مسجَّلة رسميًا بتاريخ ومصدر واضحين (Chapter 17)
- **Domain Component** — مكوّن يجمع عدة مكونات أساسية بتركيبة خاصة بمجال معيّن (Chapter 8 L8)

## E
- **Easing Curve** — منحنى رياضي يصف تسارع/تباطؤ الحركة (Chapter 5)
- **Escalation Level** — درجة "قوة المقاطعة" لنوع تغذية راجعة (Chapter 8 L4)
- **Experience Layer** — طبقة سلوك UX مستقلة مبنية فوق نفس التوكنز (Chapter 0)

## F
- **Field** — الوحدة الكاملة: Label + Input + Help Text + Error معًا (Chapter 8 L2)
- **Field Event** — فعالية قياسها مسافة أو ارتفاع (Chapter 10)
- **First Reference Implementation** — أول تطبيق فعلي حقيقي للإطار (UAEAF، Chapter 0)
- **Flow** — مسار مستخدم عبر عدة حالات شاشة متتابعة (Chapter 11)
- **Fluid Typography** — تغيّر حجم الخط تدريجيًا مع عرض الشاشة (Chapter 4)

## H
- **Headless CMS** — نمط يفصل إدارة المحتوى عن طريقة عرضه النهائية (Chapter 13)

## I
- **Identity Provider (IdP)** — الجهة/النظام المسؤول عن التحقق من هوية المستخدم (Chapter 17)

## L
- **Live Region** — منطقة HTML تُعلن تحديثاتها تلقائيًا لقارئ الشاشة (Chapter 6)
- **Locale** — مجموعة إعدادات لغة+منطقة تحدد التنسيق والاتجاه معًا (Chapter 19)

## M
- **Monorepo** — مستودع كود واحد يحوي حزمًا متعددة بإدارة تبعيات مشتركة (Chapter 21)

## N
- **Navigation** — أي عنصر واجهة وظيفته الانتقال بين حالات/صفحات، لا تنفيذ إجراء (Chapter 8 L3)
- **Notification Engine** — خدمة مركزية مستقلة تستقبل أحداثًا وتوزّعها عبر القنوات (Chapter 18)

## O
- **Object Fit** — كيفية ملء صورة/فيديو لحاوية بأبعاد مختلفة (Chapter 8 L6)
- **Offline Snapshot** — آخر بيانات معروفة محليًا تُعرض أثناء انقطاع الاتصال (Chapter 8 L5)
- **Optical Size** — تعديل تفاصيل رسم الحرف تلقائيًا حسب حجم العرض (Chapter 4)

## P
- **Page Template (TMP)** — تركيب موثَّق نهائي لصفحة كاملة قابلة للتنفيذ (Chapter 20)
- **Partial Data** — استجابة وصلت لكنها غير مكتملة (Chapter 8 L5)
- **Plain Language** — كتابة بمستوى قراءة بسيط يفهمه أوسع جمهور (Chapter 9)
- **POUR** — إطار WCAG: Perceivable, Operable, Understandable, Robust (Chapter 6)
- **Presentation Layer** — طبقة المظهر المنفصلة عن منطق المكوّن (Chapter 8 ADR-0012)
- **Primitive Token** — القيمة الخام المطلقة، بلا معنى وظيفي (Chapter 3)
- **Principle (PR)** — قاعدة توجيهية عليا غير قابلة للتفاوض (Chapter 2)

## R
- **Read-only** — القيمة مرئية وغير قابلة للتعديل لكن قابلة للتحديد والنسخ (Chapter 8 L2)
- **Reference Implementation Color** — القيمة الرقمية (500) الملزمة بمطابقة Pantone حرفيًا (Chapter 1)
- **Roving Tabindex** — نمط WAI-ARIA حيث عنصر واحد فقط من مجموعة له `tabindex="0"` (Chapter 8 L3)
- **Runtime Token** — القيمة الفعلية في المتصفح (CSS Custom Property) (Chapter 3)

## S
- **Semantic Token** — توكن بمعنى وظيفي، لا يُستخدم من Primitive مباشرة (Chapter 3، Chapter 7)
- **Stale Data** — بيانات معروضة صحيحة سابقًا لكن يُحتمل عدم تحديثها (Chapter 8 L5)
- **State** — حالة تفاعلية مؤقتة لنفس المكوّن (Chapter 8)
- **Structured Data** — بيانات مُرمَّزة (Schema.org/JSON-LD) تصف محتوى الصفحة بدقة (Chapter 14)

## T
- **Terminology Governance** — قائمة مركزية معتمدة للمصطلحات المتكررة (Chapter 9)
- **Theme** — مجموعة كاملة من قيم Runtime لكل Semantic Token (Chapter 7)
- **Theme Resolution** — العملية التي يحدد بها المتصفح القيمة الفعلية بناءً على الثيم النشط (Chapter 7)
- **Type Scale** — سلّم أحجام خط ثابت ومترابط رياضيًا (Chapter 4)

## U
- **Unattached Athlete** — رياضي مسجَّل مباشرة لدى الاتحاد دون انتساب لنادٍ (Chapter 8 L8)
- **UX Pattern (PT)** — تسلسل تفاعل موثَّق يُركِّب عدة مكونات لإنجاز مهمة كاملة (Chapter 11)

## V
- **Variant** — نسخة بديلة من نفس المكوّن بغرض مختلف (Chapter 8)
- **Variable Font** — ملف خط واحد يحتوي كل الأوزان بدل ملفات منفصلة (Chapter 4)
- **Verified Badge** — إشارة ثقة تدل أن بيانات لاعب/نادٍ معتمدة رسميًا (Chapter 8 L8)

## W
- **Widget** — أي مكوّن Chapter 8 عند استهلاكه داخل منطقة لوحة تحكم محددة (Chapter 12)

---

## Do & Don't
**Do:** ابحث هنا أولاً عند مواجهة مصطلح غير مألوف · أضف أي مصطلح جديد لفصله المصدر أولاً، ثم استشهد به هنا
**Don't:** لا تُعرِّف مصطلحًا جديدًا هنا مباشرة دون فصل مصدر

## Success Metrics
- 100% من المصطلحات المُعرَّفة عبر الفصول 0-25 موجودة هنا
- 0 تعريف مصطلح يظهر هنا أولاً دون مصدر

## References
**Normative:** كل الفصول 0-25 (كل مصطلح هنا استشهاد لا تعريف أصلي)

## Related Chapters
كل الفصول

---

*نهاية Chapter 26 — الفصل الأخير.*

## 🏁 نهاية الوثيقة
**UAEAF Enterprise Design System Framework v1.0.0** — 27 فصلاً (0-26) مكتملة ومُجمَّدة بالكامل كـBaseline v1.0. أي تطوير لاحق يمر عبر Chapter 22 (Governance) حصريًا.

**الخطوة التالية المقترحة (خارج نطاق الفصول 0-26):** "Design System Review & Consolidation" — مراجعة شاملة نهائية لاتساق كل المعرّفات (ADR/PR/DT/CMP/CR/PT/DB/CT/TMP) والإحالات المتبادلة عبر الوثيقة كاملة قبل التسليم النهائي للتنفيذ.

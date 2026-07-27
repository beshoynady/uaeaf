# Chapter 2 — Design Principles

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع (راجع Chapter 22: Governance)

> **لغة معيارية:** MUST (إلزامي) · MUST NOT (ممنوع قطعيًا) · SHOULD (موصى به بقوة) · SHOULD NOT (يُتجنَّب إلا لسبب موثّق) · MAY (اختياري).

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 0 (Design Goals, Dual Experience) | Chapter 3 (Design Tokens) |
| Chapter 1 (Brand Identity) | Chapter 6, 8, 10 وكل فصل لاحق (حقل "Based on PR-XXX") |

## Scope
**يغطي:** المبادئ العشرة (PR-001→PR-010) بأدواتها العملية الكاملة، إطار حسم التعارض، مصفوفة القرار السريعة.
**لا يغطي:** التطبيق التقني التفصيلي (يُوثَّق في الفصل المختص عبر الإشارة لمعرّف المبدأ).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Principle (PR)** | قاعدة توجيهية عليا تحكم القرار عند غياب قاعدة تفصيلية أدق |
| **Anti-Pattern** | تطبيق شائع وخاطئ للمبدأ، يُذكر صراحة لمنع تكراره |
| **Decision Matrix** | جدول مرجعي سريع يربط موقفًا تصميميًا شائعًا بالمبدأ الحاكم له مباشرة |

## Purpose
Chapter 1 يجيب "من نحن؟"؛ هذا الفصل يجيب "كيف نتخذ أي قرار تصميمي؟" — وبعد هذا التحديث، أصبح **أداة عمل يومية** للمصمم والمطور، لا مجرد مرجع نظري.

---

## PR-001 — Clarity Over Decoration

| الحقل | القيمة |
|---|---|
| **Authority** | Product Decision |
| **Tags** | `UX` `Visual Design` `Content` |
| **Cost** | Low (انضباط تصميمي، لا تكلفة هندسية) |
| **Definition** | الوضوح الوظيفي MUST يسبق أي عنصر جمالي زخرفي |
| **Rationale** | الجمهور يحتاج فهم المعلومة قبل الانبهار البصري (Chapter 0/9) |
| **Measurement (KPI)** | Time-to-First-Meaningful-Content < 1.5s على شاشة عادية؛ صفر عناصر بصرية بلا وظيفة موثّقة في مراجعة التصميم |
| **❌ Anti-Patterns** | Carousel لمجرد أنه "جميل" · Glassmorphism فوق نص الأخبار (يضر القراءة) · أكثر من CTA Primary واحد في نفس القسم · أكثر من 4 ألوان في Hero واحد |
| **✅ Good Example** | تصميم واجهات World Athletics — بيانات ونتائج واضحة، زخرفة محدودة الوظيفة |
| **❌ Bad Example** | صفحة مليئة بـWidgets متحركة تتنافس على الانتباه في نفس الوقت |
| **Checklist قبل الاعتماد** | ☐ هل كل عنصر بصري له وظيفة واضحة؟ ☐ هل المعلومة الأهم هي الأبرز بصريًا فعلاً؟ ☐ هل يوجد أكثر من CTA أساسي واحد؟ |
| **Conflicts With** | PR-005 |
| **Resolution** | PR-001 يفوز في أي تعارض مباشر مع PR-005 |
| **Version History** | v1.0 (الحالي) |

## PR-002 — Performance First

| الحقل | القيمة |
|---|---|
| **Authority** | Product Decision (Chapter 5) |
| **Tags** | `Performance` `Engineering` `Testing` |
| **Cost** | Medium (يتطلب انضباط هندسي مستمر: Lazy Loading، Code Splitting) |
| **Definition** | كل قرار MUST يُقيَّم بأثره على Core Web Vitals قبل اعتماده |
| **Rationale** | الأداء جزء من الهوية العالمية المستهدفة (Chapter 0) |
| **Measurement (KPI)** | LCP<2.5s · INP<200ms · CLS<0.1 · Animation FPS>55 · Lighthouse Performance≥90 |
| **❌ Anti-Patterns** | فيديو Hero بحجم 20MB بلا Poster Image · تحميل كل الخطوط دفعة واحدة (بدون `font-display: swap`) · Bundle JS واحد ضخم بدون Code Splitting |
| **✅ Good Example** | محركات بحث بسيطة وسريعة الاستجابة (Google Search كمرجع للسرعة الوظيفية، لا التصميم البصري) |
| **❌ Bad Example** | مواقع فيها فيديو خلفية ثقيل بلا ضغط ولا صورة بديلة |
| **Checklist قبل الاعتماد** | ☐ هل تم قياس LCP فعليًا لا افتراضًا؟ ☐ هل كل صورة WebP/AVIF مضغوطة؟ ☐ هل يوجد Lazy Loading للمحتوى تحت الطية؟ |
| **Decision Tree** | هل العنصر يؤثر على LCP؟ → نعم → هل يمكن تأجيل تحميله؟ → نعم → أجّله (Lazy) → لا → حسّنه لأقصى درجة قبل القبول |
| **Conflicts With** | PR-005، PR-010 |
| **Resolution** | يفوز دائمًا |
| **Version History** | v1.0 |

## PR-003 — Accessibility by Default

| الحقل | القيمة |
|---|---|
| **Authority** | International Standard (WCAG 2.2 AA) |
| **Tags** | `Accessibility` `Compliance` `Development` `Testing` |
| **Cost** | Medium (أرخص كثيرًا لو طُبِّق من التصميم، لا كإصلاح لاحق) |
| **Definition** | كل مكوّن MUST يُبنى قابلاً للوصول من التصميم الأول |
| **Rationale** | معيار إلزامي متفق عليه (Chapter 6)؛ الإصلاح اللاحق أغلى بأضعاف |
| **Measurement (KPI)** | 0 أخطاء Critical/Serious في Axe DevTools · تباين لوني ≥4.5:1 نص عادي · 100% تنقل بالكيبورد |
| **❌ Anti-Patterns** | `outline: none` بدون بديل Focus مرئي · صور بلا Alt Text · نموذج بدون `<label>` مرتبط |
| **✅ Good Example** | نماذج حكومية إماراتية حديثة (TDRA) بحلقات Focus واضحة |
| **❌ Bad Example** | موقع يعتمد على اللون وحده للتمييز بين "نجاح" و"خطأ" دون أيقونة أو نص |
| **Checklist قبل الاعتماد** | ☐ هل تم اختبار Tab بالكامل؟ ☐ هل كل صورة محتوى لها Alt؟ ☐ هل التباين محسوب فعليًا لا تقديريًا؟ |
| **Conflicts With** | PR-001 أحيانًا |
| **Resolution** | **لا يُهزَم أبدًا — الأولوية المطلقة في الوثيقة كلها** |
| **Version History** | v1.0 |

## PR-004 — Content First

| الحقل | القيمة |
|---|---|
| **Authority** | Engineering Decision |
| **Tags** | `Content` `UX` `CMS` `SEO` |
| **Cost** | Low |
| **Definition** | التصميم MUST يبدأ من المحتوى الحقيقي، لا نص وهمي |
| **Rationale** | العربي/الإنجليزي يختلفان طولاً جوهريًا؛ تصميم على نص مثالي ينكسر واقعيًا |
| **Measurement (KPI)** | 0 حالات Text Overflow/Truncation غير مقصودة في مراجعة QA على محتوى حقيقي |
| **❌ Anti-Patterns** | اختبار التصميم بعنوان "خبر تجريبي" قصير بدل عنوان عربي حقيقي طويل · تجاهل حالة "بدون صورة" للمحتوى |
| **✅ Good Example** | تصميم بطاقة أخبار يتحمل عنوانًا من 3 أسطر دون كسر التخطيط |
| **❌ Bad Example** | Card مصممة لعنوان من كلمتين فقط تنكسر بمجرد نص حقيقي |
| **Checklist قبل الاعتماد** | ☐ هل اختُبر بأطول عنوان حقيقي من الأرشيف؟ ☐ هل حالة "بدون صورة/بدون بيانات" مصمَّمة؟ |
| **Conflicts With** | PR-001 |
| **Resolution** | PR-004 يفوز — يجب أن يتحمل أسوأ حالة واقعية |
| **Version History** | v1.0 |

## PR-005 — Motion with Purpose

| الحقل | القيمة |
|---|---|
| **Authority** | Product Decision |
| **Tags** | `Motion` `UX` `Accessibility` `Performance` |
| **Cost** | Medium |
| **Definition** | كل حركة MUST تشرح تغيير حالة وتحترم `prefers-reduced-motion` |
| **Rationale** | Chapter 5 — "الوظيفة قبل الزخرفة" |
| **Measurement (KPI)** | Animation FPS>55 · صفر حركة تلقائية مستمرة (Infinite Loop) بلا زر إيقاف |
| **❌ Anti-Patterns** | اهتزاز عشوائي بلا سبب وظيفي · حركة لا تُلغى مع Reduce Motion · Parallax ثقيل الأداء |
| **✅ Good Example** | تكبير رقم إحصائية عند ظهوره على الشاشة (يشرح "رقم مهم وصل") |
| **❌ Bad Example** | كل عنصر في الصفحة يتحرك بشكل مختلف عند التحميل بلا تنسيق |
| **Principle Checklist** | ☐ هل تشرح تغيير حالة؟ ☐ هل يمكن حذفها دون فقدان وظيفة؟ ☐ هل تحترم `prefers-reduced-motion`؟ ☐ هل تؤثر على FPS؟ |
| **Decision Tree** | هل تحسّن الفهم؟ → لا → ارفض · → نعم → هل تضر الأداء؟ → نعم → ارفض/بسّط · → لا → اقبل |
| **Conflicts With** | PR-001، PR-002 |
| **Resolution** | يخسر أمام كليهما دائمًا |
| **Version History** | v1.0 |

## PR-006 — Context-Aware Responsiveness

| الحقل | القيمة |
|---|---|
| **Authority** | Product Decision |
| **Tags** | `Responsive` `UX` `Dashboard` |
| **Cost** | Medium |
| **Definition** | التصميم MUST يتكيف حسب سياق الاستخدام الفعلي: موقع عام = أولوية موبايل، لوحة تحكم = أولوية Desktop |
| **Rationale** | تسوية مسجّلة بين "Mobile First" العام وقرار Responsive السابق (Chapter 0 ADR-0001) |
| **Measurement (KPI)** | 0 Horizontal Scroll غير مقصود على 320px · Touch Targets≥44px على كل الشاشات الصغيرة |
| **❌ Anti-Patterns** | تصميم Data Grid معقد أولاً للموبايل ثم "تكبيره" للديسكتوب | تصميم Hero الموقع العام أولاً لشاشة 1440px |
| **✅ Good Example** | جدول نتائج بلوحة التحكم مصمَّم أولاً لشاشة 1440px بأعمدة كاملة، مع نسخة مبسّطة للموبايل لاحقًا |
| **❌ Bad Example** | نفس تخطيط الجدول المعقد يُفرض على شاشة 375px فيتكسر |
| **Checklist قبل الاعتماد** | ☐ هل حُدِّد الجمهور الأساسي لهذه الشاشة أولاً؟ ☐ هل صُمِّمت لسياق الاستخدام الحقيقي (مكتب/تنقل)؟ |
| **Conflicts With** | لا تعارض مباشر مع مبادئ أخرى |
| **Resolution** | يُراجع Chapter 0 لتحديد الطبقة أولاً |
| **Version History** | v1.0 |

## PR-007 — AI-Ready by Design

| الحقل | القيمة |
|---|---|
| **Authority** | Product Decision |
| **Tags** | `AI` `Scalability` `CMS` `Future` |
| **Cost** | Low حاليًا (حجز مساحة UI فقط)، High لاحقًا عند التفعيل الفعلي |
| **Definition** | كل مكوّن MUST يحتمل إضافة AI لاحقًا دون إعادة تصميم؛ كل مخرج AI MUST يبقى قابلاً للمراجعة البشرية |
| **Rationale** | رؤية 10 سنوات + Chapter 16 |
| **Measurement (KPI)** | 100% من مكونات CMS الأساسية تحتوي نقطة تمديد AI محجوزة في الـ Component API (حتى لو غير مفعّلة) |
| **❌ Anti-Patterns** | إضافة زر "AI" ظاهر دائمًا حتى لو غير مفعّل (يخالف PR-001) · نشر تلقائي لمخرج AI بلا مراجعة بشرية |
| **✅ Good Example** | زر "اقتراح AI" يظهر فقط عند تفعيل الميزة (Progressive Disclosure) |
| **❌ Bad Example** | واجهة مليئة بشارات "AI" في كل مكان قبل تفعيل أي ميزة فعلية |
| **Checklist قبل الاعتماد** | ☐ هل نقطة التمديد محجوزة في الكود لا فقط في التصميم؟ ☐ هل هناك مسار مراجعة بشرية إلزامي؟ |
| **Conflicts With** | PR-001 |
| **Resolution** | العناصر المحجوزة تبقى غير مرئية حتى التفعيل — لا تكسر PR-001 |
| **Version History** | v1.0 — AI-Ready (Assisted) → **مخطط v2.0 — AI-Native** (تكامل أعمق، خارج نطاق النسخة الحالية) |

## PR-008 — Built to Scale

| الحقل | القيمة |
|---|---|
| **Authority** | Engineering Decision |
| **Tags** | `Scalability` `Engineering` `Data` |
| **Cost** | High (Pagination/Virtualization من اليوم الأول أغلى هندسيًا من حل بسيط أولي) |
| **Definition** | كل توكن/مكوّن MUST يُصمَّم بافتراض نمو 10x في البيانات |
| **Rationale** | رؤية 10 سنوات + Chapter 12 |
| **Measurement (KPI)** | زمن استجابة قائمة بها 10,000 سجل ≈ زمن استجابة قائمة بها 100 سجل (بفضل Pagination/Virtualization) |
| **❌ Anti-Patterns** | جلب كل السجلات دفعة واحدة من الـ API بدون Pagination · قائمة منسدلة (Select) تحتوي كل الأندية بلا بحث |
| **✅ Good Example** | Data Grid بلوحة التحكم مع تحميل تدريجي (Infinite Scroll أو Pagination) من أول نسخة |
| **❌ Bad Example** | قائمة أخبار تُحمَّل بالكامل (500+ خبر) في طلب واحد |
| **Checklist قبل الاعتماد** | ☐ هل تم اختبار المكوّن افتراضيًا بـ10x البيانات الحالية؟ |
| **Conflicts With** | لا تعارض مباشر (قد يتعارض مع سرعة التسليم الأولى، خارج نطاق الوثيقة) |
| **Resolution** | — |
| **Version History** | v1.0 |

## PR-009 — Consistency Through Tokens

| الحقل | القيمة |
|---|---|
| **Authority** | Engineering Decision |
| **Tags** | `Tokens` `Engineering` `Theming` |
| **Cost** | Medium (انضباط أثناء التطوير، يوفر تكلفة صيانة ضخمة لاحقًا) |
| **Definition** | أي قيمة بصرية MUST تأتي من توكن معرّف؛ القيم الحرة MUST NOT تُستخدم في كود الإنتاج |
| **Rationale** | الضامن الوحيد لاتساق 27 فصلاً عبر سنوات وفرق مختلفة |
| **Measurement (KPI)** | 0 Hardcoded Hex Colors في الكود (يُفحص آليًا عبر ESLint Rule/Stylelint) |
| **❌ Anti-Patterns** | `color: #00843D` مباشرة في الكود · `margin: 13px` قيمة عشوائية خارج سلّم Chapter 3 |
| **✅ Good Example** | `color: var(--brand-green-500)` |
| **❌ Bad Example** | كل مطوّر يكتب قيم الألوان يدويًا بأرقامه الخاصة |
| **Checklist قبل الاعتماد** | ☐ هل القيمة موجودة في Chapter 3/7 بالفعل؟ ☐ لو لا، هل تحتاج توكن جديد رسمي بدل استثناء؟ |
| **Conflicts With** | لا تعارض مباشر |
| **Resolution** | — |
| **Version History** | v1.0 |

## PR-010 — Government-Grade Quality

| الحقل | القيمة |
|---|---|
| **Authority** | Product Decision |
| **Tags** | `Quality` `Trust` `Reliability` |
| **Cost** | High (يتطلب اختبارًا ومراجعة أعلى من متوسط SaaS) |
| **Definition** | كل جزء من المنصة MUST يفي بمعيار جودة يليق بمؤسسة وطنية رسمية |
| **Rationale** | Chapter 0 §Design Goals #1، موقف الاتحاد الدولي |
| **Note on Naming** | من الناحية الهندسية البحتة، هذا المبدأ أقرب لـ**نتيجة (Vision)** منه لـ**طريقة (Principle)**؛ المرادف الهندسي الأعم هو **"Reliability by Design"**. الاسم الحالي يُبقى لأنه يعبّر عن هوية المشروع تحديدًا، لكن أي تطبيق مستقبلي لهذا الإطار (Chapter 0) خارج UAEAF SHOULD يستخدم "Reliability by Design" كاسم عام |
| **Measurement (KPI)** | 0 "Beta Labels" ظاهرة للجمهور العام · كل رقم منشور (نتيجة/إحصائية) موثّق بمصدره |
| **❌ Anti-Patterns** | عرض "قيد التطوير" أو "Coming Soon" في صفحات جمهور عام · نشر رقم/نتيجة بدون مصدر موثّق |
| **✅ Good Example** | صفحات نتائج World Athletics — لا رسائل تجريبية، كل رقم نهائي وموثوق |
| **❌ Bad Example** | لوحة إحصائيات تعرض "Beta" على الصفحة الرئيسية العامة |
| **Checklist قبل الاعتماد** | ☐ هل هذا جاهز فعليًا للجمهور الرسمي، أم لسه تجريبي؟ ☐ هل الرقم المعروض له مصدر موثّق؟ |
| **Conflicts With** | PR-002 |
| **Resolution** | PR-002 يفوز — "Government-Grade" يعني استقرار ودقة، لا رفاهية بصرية مكلفة |
| **Version History** | v1.0 |

---

## Backlog — Future Principle (v2.0، لم يُضَف الآن)

**PR-011 — Simplicity Over Complexity** *(مسجَّل للمستقبل فقط، لا يُرقَّم رسميًا الآن حفاظًا على استقرار الترقيم الحالي)*
يخص تبسيط الحلول الهندسية وتجربة المستخدم (بعكس PR-001 اللي يخص الوضوح البصري فقط): لا Component جديد لو موجود بديل قابل لإعادة الاستخدام، لا Workflow معقد لو خطوة واحدة تكفي، لا تقسيم شاشة لـ10 بطاقات لو 4 بطاقات واضحة تكفي.

---

## Conflict Resolution Framework

```
1. PR-003 Accessibility by Default        ← لا يُهزَم أبدًا
2. PR-002 Performance First
3. PR-004 Content First
4. PR-001 Clarity Over Decoration
5. PR-009 Consistency Through Tokens
6. PR-006 Context-Aware Responsiveness
7. PR-010 Government-Grade Quality
8. PR-007 AI-Ready by Design
9. PR-008 Built to Scale
10. PR-005 Motion with Purpose            ← يخسر أولاً عند أي تعارض
```

---

## Principle Decision Matrix

جدول الاستخدام السريع أثناء التطوير — أول مكان يُراجعه أي مصمم/مطوّر عند التردد:

| الموقف التصميمي | المبدأ الحاكم |
|---|---|
| اختيار لون | PR-009 |
| إضافة Animation | PR-005 + PR-002 |
| كتابة محتوى/نص | PR-004 |
| تصميم Hero Section | PR-001 + PR-005 |
| تصميم شاشة Dashboard | PR-006 |
| تصميم CMS/محرر محتوى | PR-004 |
| إضافة ميزة AI | PR-007 |
| أي قرار يمس الوصول | PR-003 (يفوز دائمًا) |
| قرار متعلق بـSEO | PR-004 |
| تصميم Dark Mode | PR-009 |
| قرار يمس حجم البيانات/القوائم الطويلة | PR-008 |
| قرار بين تصميم "جميل" وتصميم "مستقر" | PR-010 → لكن PR-002 يفوز إن تعارضا |

## Do & Don't
**Do:** استخدم Principle Decision Matrix كأول محطة عند التردد · طبّق Checklist كل مبدأ فعليًا قبل التسليم
**Don't:** لا تتجاوز Checklist بحجة ضيق الوقت · لا تكسر PR-003 مهما كان المبرر

## Success Metrics
- كل ADR لاحق يذكر PR-XXX صراحة
- Principle Decision Matrix تُستخدم فعليًا في مراجعات التصميم (Chapter 23.7)
- صفر Anti-Patterns مسجّلة تتكرر في مراجعتين متتاليتين

## References
Chapter 0 · Chapter 1 · WCAG 2.2 · RFC 2119

## Related Chapters
كل فصل من 3 إلى 26 يستهلك هذا الفصل مباشرة.

---

*نهاية Chapter 2 — النسخة الكاملة بالأدوات العملية. الفصل التالي: Chapter 3 — Design Tokens.*

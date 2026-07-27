# Chapter 6 — UAE Digital Accessibility & Government Compliance

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 1 (§1.9 تباين الألوان) · Chapter 2 (PR-003) · Chapter 4 (§4.10) · Chapter 5 (§5.8, §5.10.1) | Chapter 7 (Semantic A11y Tokens) · Chapter 8/10 (Components) · Chapter 23.3 (Accessibility Checklist) |

## Scope
**يغطي:** استراتيجية الوصول الكاملة (WCAG 2.2 AA + التوافق الوطني الإماراتي)، مبادئ POUR، قواعد اللون/الكيبورد/قارئ الشاشة/النماذج/الوسائط، خط أنابيب الاختبار، ميزانية الجودة، مصفوفة الامتثال.
**لا يغطي:** تطبيق كل قاعدة داخل مكوّن محدد بالتفصيل (→ Chapter 8)، تصميم لوحة إعدادات الوصول التفصيلي (يُوثَّق هنا كقرار، يُنفَّذ في Chapter 8).

## Definitions
| المصطلح | التعريف |
|---|---|
| **POUR** | إطار WCAG الأساسي: Perceivable (قابل للإدراك)، Operable (قابل للتشغيل)، Understandable (قابل للفهم)، Robust (متين تقنيًا) |
| **Focus Trap** | حصر التنقل بالـTab داخل عنصر تراكبي (Modal) لمنع الهروب لمحتوى خلفه |
| **Live Region** | منطقة HTML تُعلن تحديثاتها تلقائيًا لقارئ الشاشة دون تحريك تركيز المستخدم |
| **Accessible Name** | النص الذي يقرأه قارئ الشاشة لعنصر تفاعلي (قد يختلف عن النص المرئي) |

## Purpose
هذا الفصل يحوّل PR-003 (Chapter 2) من مبدأ عام إلى **التزامات قانونية وهندسية قابلة للاختبار**. هو المرجع الوحيد لكل قاعدة وصول — الفصول اللاحقة تشير إليه ولا تكرره.

---

## ADR-0010: Accessibility Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | International Standard + Product Decision |
| **Context** | المنصة رسمية وطنية (Chapter 0)، تخدم جمهورًا عامًا واسعًا يشمل كبار السن وأصحاب الهمم، وتخضع لتوجهات TDRA (Discovery Phase) |
| **Decision** | **Accessibility by Default** (PR-003) كمبدأ غير قابل للتفاوض. الامتثال لـ**WCAG 2.2 Level AA** كحد أدنى إلزامي على كل المنصة. التوافق مع توجهات **UAE Design System/TDRA** حيث مناسب (Chapter 0 Discovery — نموذج 3 مستويات: دولي إلزامي / وطني / تدريجي اختياري). أي استثناء عن أي قاعدة هنا **MUST** يُوثَّق كـADR منفصل يشرح السبب والتعويض البديل |
| **Alternatives Considered** | استهداف WCAG AAA بالكامل — رُفض (Chapter 0 Discovery) لأنه يقيّد الهوية البصرية في حالات معينة دون مبرر كافٍ لمنصة عامة. الاكتفاء بـLighthouse Score فقط — رُفض لأنه يغطي ~30-40% فقط من معايير الوصول الحقيقية |
| **Why This Decision** | AA هو المعيار الذي تعتمده أغلب الحكومات والمؤسسات الرياضية الدولية (World Athletics، IOC)، ومتوافق مع توجه TDRA الحالي (WCAG 2.1/2.2 AA) |
| **Risks** | فريق تطوير مستقبلي قد "يوفّر وقتًا" بتجاهل قاعدة هنا تحت ضغط تسليم. Mitigation: §6.10 Testing Pipeline يرفض أي Build يخالف §6.11 Accessibility Budget آليًا، لا يعتمد على انضباط بشري فقط |
| **Consequences** | كل مكوّن (Chapter 8) **MUST** يجتاز §6.12 QA Checklist قبل الدمج في الإنتاج |

---

## 6.1 Accessibility Principles (POUR) ↔ Chapter 2 Principles

| مبدأ WCAG | المعنى | مرتبط بـ |
|---|---|---|
| **Perceivable** | المحتوى قابل للإدراك بأي حاسة (بصر/سمع/لمس) | PR-001 (Clarity)، PR-004 (Content First) |
| **Operable** | كل وظيفة قابلة للتشغيل بالكيبورد وحده | PR-003 |
| **Understandable** | السلوك واللغة متوقعان وواضحان | PR-004، Chapter 9 (Content Design) |
| **Robust** | متوافق مع تقنيات مساعدة حالية ومستقبلية (Semantic HTML) | PR-008 (Built to Scale) |

## 6.2 Color & Contrast
- نص عادي: **MUST** تباين ≥4.5:1 (WCAG 1.4.3)
- نص كبير (≥24px أو ≥19px Bold): **MUST** تباين ≥3:1
- عناصر غير نصية (حدود Input، أيقونات وظيفية): **MUST** تباين ≥3:1 (Non-text Contrast، WCAG 1.4.11)
- Focus Indicators: **MUST** تباين ≥3:1 مع الخلفية المجاورة
- **MUST NOT** الاعتماد على اللون وحده للتمييز (حالة خطأ/نجاح **MUST** تُرفق بأيقونة أو نص، لا لون فقط — يخدم أيضًا Chapter 1 §1.9)

## 6.3 Keyboard Accessibility
| القاعدة | التفصيل |
|---|---|
| Tab Order | **MUST** يتبع الترتيب البصري المنطقي (يمين→يسار في RTL) دون `tabindex` موجب يدوي |
| Focus Trap | **MUST** في كل Modal/Drawer (Chapter 8) — Tab لا يهرب خارج العنصر التراكبي حتى الإغلاق |
| Skip Links | **MUST** رابط "تخطي إلى المحتوى الرئيسي" أول عنصر قابل للتركيز في كل صفحة |
| Escape Behavior | **MUST** مفتاح `Esc` يُغلق أي Modal/Drawer/Dropdown مفتوح |
| Logical Navigation | **MUST** لا عنصر تفاعلي "مخفي" عن الكيبورد بينما ظاهر بصريًا |

## 6.4 Screen Reader Rules
- Semantic HTML: **MUST** استخدام العناصر الصحيحة (`<button>` لا `<div onClick>`، `<nav>`, `<main>`, `<article>`) قبل أي حل بـARIA
- ARIA: **MUST NOT** يُستخدم إلا عند غياب بديل HTML دلالي (قاعدة W3C الذهبية: "No ARIA is better than Bad ARIA")
- Landmark Regions: **MUST** كل صفحة تحتوي `<header>`, `<nav>`, `<main>`, `<footer>` بوضوح
- Live Regions: **MUST** لتحديثات ديناميكية مهمة (نتيجة مباشرة، رسالة Toast) عبر `aria-live="polite"` (أو `assertive` للأخطاء الحرجة فقط)
- Accessible Names: **MUST** لكل عنصر تفاعلي بلا نص مرئي كافٍ (أيقونة زر) عبر `aria-label` واضح

## 6.5 Forms Accessibility
| القاعدة | التفصيل |
|---|---|
| Labels | **MUST** كل حقل له `<label>` مرتبط فعليًا (لا Placeholder كبديل للـLabel) |
| Required Fields | **MUST** تُعلَّم بصريًا ونصيًا وبـ`aria-required` معًا |
| Error Messages | **MUST** وصفية وقابلة للربط بالحقل عبر `aria-describedby` (يتوافق مع Chapter 9 Microcopy) |
| Validation | **SHOULD** تحدث عند `blur` لا أثناء الكتابة (يمنع إزعاج مستخدم قارئ الشاشة) |
| Autocomplete | **SHOULD** سمة `autocomplete` معيارية للحقول الشائعة (الاسم، البريد، الهاتف) |
| Input Purpose | **SHOULD** توضيح الغرض من الحقل ببيانات وصفية حيثما أمكن (WCAG 1.3.5) |

## 6.6 Motion Accessibility (يرتبط بـChapter 5)
راجع Chapter 5 §5.8 (Reduced Motion) للتفاصيل التقنية الكاملة. هنا إضافة قانونية: **MUST NOT** أي حركة تومض أكثر من 3 مرات في الثانية (WCAG 2.3.1 — يمنع نوبات الصرع الضوئية) — قيد مطلق لا استثناء له حتى بموافقة تصميمية.

## 6.7 Responsive Accessibility
- Zoom 200%: **MUST** يبقى المحتوى كاملاً وقابلاً للاستخدام دون فقدان وظيفة أو تراكب نص (WCAG 1.4.4)
- Reflow: **MUST** لا Horizontal Scroll عند عرض 320px (WCAG 1.4.10)
- Touch Targets: **MUST** ≥44×44px (يتوافق مع Chapter 0 Discovery)
- Orientation: **MUST NOT** تقييد الاستخدام باتجاه واحد فقط (عمودي/أفقي) إلا لضرورة وظيفية موثّقة

## 6.8 Media Accessibility
| القاعدة | التفصيل |
|---|---|
| Alt Text | **MUST** لكل صورة محتوى (لاعب، فعالية، نادي) — وصفي بالعربي والإنجليزي |
| Decorative Images | **MUST** `alt=""` فارغ صراحة (لا حذف السمة) للصور الزخرفية البحتة |
| Captions | **SHOULD** لكل فيديو يحتوي حوارًا/تعليقًا صوتيًا مهمًا |
| Transcripts | **MAY** لمحتوى فيديو طويل (مقابلات، مؤتمرات صحفية) |
| Icons | **MUST** أيقونة وظيفية (لا زخرفية) لها `aria-label` أو نص مرافق دائمًا |

## 6.9 Government Compliance (UAE)

**المعايير المرجعية:** WCAG 2.2 AA (Chapter 0 Discovery) · WAI-ARIA 1.2 · HTML Living Standard · توجهات TDRA National Digital Accessibility Policy وUAE Design System (راجع Chapter 0 لنتائج البحث الكاملة حول القانون الاتحادي والسياسة الوطنية).

**نقطة الدخول الوحيدة (من Discovery Phase — القرار النهائي):** Floating Accessibility Button أنيق (زاوية سفلية، متوافق Light/Dark وRTL/LTR) يفتح Drawer منظم بأقسام: **Vision** (تباين، حجم خط، تباعد نص، ارتفاع سطر) · **Reading** (استمع — Text-to-Speech عبر واجهة متصفح قياسية أو أي مزود يحقق نفس الهدف، لا تقنية مفروضة) · **Motion** (تقليل الحركة، إيقاف الحركات الزخرفية) · **Theme** (نظام/فاتح/داكن) · **Language**. التفضيلات تُحفظ محليًا للزوار، وبالحساب للمسجَّلين. سلوك الزر أثناء التمرير: يبقى ظاهرًا دائمًا، قد يصغر أو تقل شفافيته، يعود لحالته الطبيعية عند التوقف — يُلغى هذا السلوك بالكامل مع Reduce Motion (Chapter 5 §5.8).

**تصنيف الميزات (من Discovery):** *Recommended:* Text-to-Speech، Contrast Toggle، Font Size Controls، Text Spacing Controls. *Optional:* Text Alignment Controls (فقط لو أضافت قيمة فعلية دون كسر اتساق Chapter 5).

## 6.10 Accessibility Testing Pipeline

```
Commit → axe-core (فحص آلي أثناء التطوير) → Lighthouse Accessibility (CI) → Playwright (اختبارات كيبورد آلية) → Manual Keyboard Testing (قبل كل Release) → Screen Reader Testing (NVDA على Windows / VoiceOver على macOS/iOS) → Merge
```
أي فحص آلي (axe-core/Lighthouse) يكتشف مشكلة **Critical** أو **Serious** **MUST** يوقف الـBuild (يتكامل مع Chapter 3 §3.13 CI Pipeline).

## 6.11 Accessibility Budget (قابل للقياس، لا توصية)

| المقياس | الحد المطلوب |
|---|---|
| Critical Accessibility Issues | 0 |
| Serious Accessibility Issues | 0 |
| Lighthouse Accessibility Score | ≥95 |
| axe-core Critical Violations | 0 |
| Keyboard Coverage (كل وظيفة قابلة للتشغيل بالكيبورد) | 100% |
| Focus Visibility (كل عنصر تفاعلي له حلقة تركيز مرئية) | 100% |

## 6.12 Accessibility QA Checklist
☐ تباين كل نص ≥4.5:1 (أو ≥3:1 للنص الكبير)؟
☐ كل وظيفة تعمل بالكيبورد وحده بدون فأرة؟
☐ Focus Trap يعمل في كل Modal/Drawer؟
☐ Skip Link موجود وفعّال؟
☐ كل صورة محتوى لها Alt Text وصفي؟
☐ كل حقل نموذج له Label مرتبط؟
☐ الصفحة تعمل كاملة عند Zoom 200%؟
☐ لا Horizontal Scroll عند 320px؟
☐ تم اختبار الصفحة فعليًا بقارئ شاشة واحد على الأقل؟

## 6.13 Accessibility Anti-Patterns
❌ `outline: none` بدون بديل Focus مرئي (يخالف §6.3 مباشرة)
❌ استخدام اللون وحده للتمييز بين حالتين (§6.2)
❌ `<div onClick>` بدل `<button>` (§6.4)
❌ Placeholder كبديل كامل عن Label (§6.5)
❌ فيديو تلقائي التشغيل بصوت بلا تحكم مستخدم
❌ حركة وامضة أكثر من 3 مرات/ثانية (§6.6 — قيد مطلق)

## 6.14 Accessibility Registry
كل قاعدة وصول مسجَّلة بمعرّف مرجعي (يُستخدم في Chapter 8 عند تطبيقها على مكوّن محدد): مثال `A11Y-CONTRAST-001 · Text Contrast ≥4.5:1 · WCAG 1.4.3 · Related Components: [كل مكوّن نصي]`.

## 6.15 Future Accessibility Roadmap (Backlog)
دعم تدريجي لميزات Progressive الإضافية من Discovery (Text Alignment Controls) · تحسين تجربة Screen Reader للـData Grid المعقد (لوحة التحكم) · استكشاف WCAG 2.2 AAA لصفحات مختارة عالية الحساسية (مثل نتائج البطولات الرسمية) دون فرضها على كامل المنصة.

## 6.16 Compliance Matrix

| Rule | WCAG | WAI-ARIA | UAE Policy | Related Chapter |
|---|---|---|---|---|
| Contrast | 1.4.3, 1.4.11 | — | ✓ | Ch1, Ch6 |
| Focus Visible | 2.4.7 | ✓ | ✓ | Ch6, Ch8 |
| Keyboard Access | 2.1.1, 2.1.2 | ✓ | ✓ | Ch6, Ch8 |
| Motion/Flashing | 2.3.1, 2.3.3 | — | ✓ | Ch5, Ch6 |
| Reflow/Zoom | 1.4.4, 1.4.10 | — | ✓ | Ch5, Ch6 |
| Forms/Labels | 1.3.1, 3.3.2 | ✓ | ✓ | Ch6, Ch8 |
| Alt Text | 1.1.1 | — | ✓ | Ch6, Ch9 |
| Live Regions | 4.1.3 | ✓ | — | Ch6, Ch8 |

## Do & Don't
**Do:** طبّق §6.12 Checklist على كل شاشة قبل التسليم · استخدم Semantic HTML أولاً دائمًا
**Don't:** لا تكسر §6.6 (Flashing) مهما كان المبرر الإبداعي · لا "تؤجل" الوصول لمرحلة لاحقة (PR-003)

## Success Metrics
راجع §6.11 Accessibility Budget حرفيًا — هذه هي مقاييس نجاح الفصل.

## References
WCAG 2.2 (W3C) · WAI-ARIA 1.2 · TDRA National Digital Accessibility Policy · UAE Design System (dgov.tdra.gov.ae) · Federal Law No. 29/2006 (People of Determination)

## Related Chapters
Chapter 1 (§1.9) · Chapter 2 (PR-003) · Chapter 4 (§4.10) · Chapter 5 (§5.8, §5.10.1) · Chapter 8 (تطبيق تفصيلي لكل مكوّن) · Chapter 23.3 (Accessibility Checklist النهائي)

---

*نهاية Chapter 6 — Foundation Layer (الفصول 0-6) مكتملة بالكامل. الفصل التالي: Chapter 7 — Semantic Tokens & Theming.*

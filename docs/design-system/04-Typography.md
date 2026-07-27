# Chapter 4 — Typography System

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 1 (مرجع الخط الرسمي) · Chapter 2 (PR-001, PR-003, PR-009) · Chapter 3 (DT-FONT-*) | Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8/10 (Components) · كل فصل يحتوي نصًا (عمليًا كل الفصول 8-20) |

## Scope
**يغطي:** الخطوط الرسمية النهائية، طبقات الخط، المقياس النوعي الكامل، قواعد القراءة RTL/LTR، الاستجابة، التحميل، الوصول، والتدويل.
**لا يغطي:** تطبيق النص داخل مكوّن محدد (→ Chapter 8)، نبرة الكتابة الفعلية ومحتوى Microcopy (→ Chapter 9).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Type Scale** | سلّم أحجام خط ثابت ومترابط رياضيًا، من Display الأكبر إلى Overline الأصغر |
| **Variable Font** | ملف خط واحد يحتوي كل الأوزان (Thin→Black) بدل ملفات منفصلة لكل وزن |
| **Fluid Typography** | تغيّر حجم الخط تدريجيًا مع عرض الشاشة (بدل قفزات ثابتة عند Breakpoints) |
| **Optical Size** | تعديل تفاصيل رسم الحرف تلقائيًا حسب حجم العرض (خط العناوين الكبيرة يبدو مختلفًا هندسيًا عن نفس الخط بحجم صغير) |

## Purpose
هذا الفصل هو **المرجع الوحيد** لكل قاعدة طباعية في النظام. أي فصل لاحق **MUST NOT** يكرر قاعدة طباعية، بل يشير لمعرّف من هنا (`DT-FONT-*`, `ADR-0007`).

## Background
Chapter 1 حدّد أن الخط الرسمي المطبوع للاتحاد هو The Sans Arabic، لكنه غير صالح كـWeb Font لأسباب الترخيص (Chapter 1 §1.6). هذا الفصل يحسم البديل الرقمي النهائي.

---

## ADR-0007: Official Typeface Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Product Decision (مفوَّض لفريق التصميم — Chapter 0 Discovery) |
| **Context** | The Sans Arabic (الخط الرسمي المطبوع) غير قابل للاستخدام كـWeb Font دون ترخيص مدفوع مستمر (Chapter 1). المطلوب بديل مجاني SIL OFL، احترافي، يدعم العربي والإنجليزي بجودة عالية |
| **Decision** | **Arabic (UI + Content):** Alexandria — طابع هندسي حاد قريب الروح من خطوط الشعار الأربعة (Chapter 1 §1.7). **Latin (UI + Content):** IBM Plex Sans — مصمَّم أصلاً لأنظمة Enterprise ثنائية اللغة، مقروئية ممتازة في الواجهات والجداول. **Monospace:** IBM Plex Mono (للأكواد/الأرقام التقنية إن لزم، مثل معرّفات اللاعبين). **Fallback:** `system-ui` |
| **Alternatives Considered** | (أ) Noto Sans Arabic — رُفض: طابع عام بلا شخصية مميزة. (ب) Cairo — رُفض: طابعه الدائري أقرب لمواقع تجارية لا مؤسسة رياضية رسمية. (ج) إبقاء IBM Plex Sans Arabic (التوصية الأولية المؤقتة من مرحلة الاكتشاف) للنص العربي بدل Alexandria — استُبدلت بقرار المستخدم النهائي: **Alexandria لكل الاستخدامات العربية** (UI وContent معًا) لتبسيط عدد الخطوط المُحمَّلة وتوحيد الشخصية البصرية العربية بالكامل |
| **Risks** | Alexandria أقل استخدامًا تاريخيًا من IBM Plex Sans Arabic في نصوص طويلة جدًا (مقالات إخبارية كبيرة) — قد تحتاج مراجعة قراءة ميدانية. **Mitigation:** اختبار §4.14 يشمل صفحة خبر كاملة حقيقية قبل الاعتماد النهائي على مستوى الإنتاج |
| **Consequences** | كل توكن `DT-FONT-FAMILY-*` (Chapter 3) يُقفل على هاتين العائلتين؛ أي تغيير مستقبلي يتطلب ADR جديد يُلغي (Supersede) هذا القرار |

---

## 4.1 Typography Philosophy

**لماذا Alexandria + IBM Plex Sans:** Alexandria تحمل حدة هندسية تعكس زوايا خطوط الشعار الأربعة (Chapter 1)، بينما IBM Plex Sans مصمَّمة أصلاً لواجهات Enterprise معقدة (جداول، لوحات تحكم) — نفس سياق استخدام هذا النظام بالضبط.

**العلاقة بمبادئ Chapter 2:**
- **PR-001 (Clarity Over Decoration):** الخط أداة قراءة أولاً، شخصية بصرية ثانيًا — أي وزن أو حجم لا يخدم الوضوح **MUST NOT** يُستخدم
- **PR-003 (Accessibility by Default):** كل حجم في §4.4 Type Scale مُختبر لتباين وقابلية تكبير (§4.10)
- **PR-009 (Consistency Through Tokens):** لا حجم خط حر خارج §4.4 — كل نص **MUST** يستهلك توكن من `DT-FONT-SIZE-*`

**مبادئ القراءة:** العربي يُقرأ بكثافة معلومات أعلى تقليديًا (كلمات أطول، تراكيب جمل أطول) — المسافات بين الأسطر (§4.6) أوسع نسبيًا للعربي عن الإنجليزي للحفاظ على نفس سهولة المسح البصري.

## 4.2 Font Architecture

```
Brand Font (The Sans Arabic — الشعار والمطبوعات فقط، Chapter 1)
    ↓ (غير مستخدم رقميًا)
Display Font (Alexandria Black/Bold — العناوين الكبيرة)
    ↓
UI Font (Alexandria/IBM Plex Sans Regular/Medium — أزرار، تسميات، تنقل)
    ↓
Content Font (Alexandria/IBM Plex Sans Regular — أخبار، فقرات طويلة)
    ↓
System Fallback (system-ui — عند فشل تحميل الخط المخصص)
```

## 4.3 Font Families

| الاستخدام | الخط |
|---|---|
| Arabic UI | Alexandria |
| English UI | IBM Plex Sans |
| Arabic Content | Alexandria |
| English Content | IBM Plex Sans |
| Monospace (أكواد/أرقام تقنية) | IBM Plex Mono |
| Fallback | system-ui |

## 4.4 Type Scale

مقياس نوعي 1.25 (Major Third)، كل مستوى مرتبط مباشرة بتوكن `DT-FONT-SIZE-*` (Chapter 3):

| المستوى | Desktop | Mobile | الوزن | DT Token |
|---|---|---|---|---|
| Display XL | 64px/1.05 | 40px/1.1 | Black | `DT-FONT-SIZE-DISPLAY-XL` |
| Display L | 56px/1.1 | 36px/1.15 | Black | `DT-FONT-SIZE-DISPLAY-L` |
| H1 | 40px/1.2 | 28px/1.25 | Black | `DT-FONT-SIZE-H1` |
| H2 | 32px/1.25 | 24px/1.3 | Bold | `DT-FONT-SIZE-H2` |
| H3 | 24px/1.3 | 20px/1.35 | Bold | `DT-FONT-SIZE-H3` |
| H4 | 20px/1.35 | 18px/1.4 | Medium | `DT-FONT-SIZE-H4` |
| Title | 18px/1.4 | 16px/1.4 | Medium | `DT-FONT-SIZE-TITLE` |
| Subtitle | 16px/1.5 | 15px/1.5 | Medium | `DT-FONT-SIZE-SUBTITLE` |
| Body Large | 18px/1.6 | 16px/1.6 | Regular | `DT-FONT-SIZE-BODY-LG` |
| Body | 16px/1.6 | 15px/1.55 | Regular | `DT-FONT-SIZE-BODY` |
| Body Small | 14px/1.5 | 13px/1.5 | Regular | `DT-FONT-SIZE-BODY-SM` |
| Caption | 13px/1.4 | 12px/1.4 | Regular | `DT-FONT-SIZE-CAPTION` |
| Label | 13px/1.3 | 12px/1.3 | Medium | `DT-FONT-SIZE-LABEL` |
| Overline | 12px/1.3 · letterspacing 0.08em | نفسه | Bold | `DT-FONT-SIZE-OVERLINE` |

## 4.5 Font Tokens Mapping

```
DT-FONT-SIZE-H1 (Primitive/Component Token — Chapter 3)
    ↓
typography.h1 (Semantic Token — Chapter 7)
    ↓
<Heading level={1}> Component (Chapter 8) — يستهلك typography.h1 فقط، لا القيمة الخام
```

## 4.6 Reading Rules

| القاعدة | العربي | الإنجليزي |
|---|---|---|
| أقصى طول سطر | 65-75 حرفًا | 75-85 حرفًا |
| Line Height (Body) | 1.6 (أوسع نسبيًا) | 1.6 |
| Paragraph Spacing | `space.4` (16px) بين الفقرات | نفسه |
| Text Alignment | يمين دائمًا، **MUST NOT** Justify | يسار دائمًا |
| الخط المائل (Italic) | **MUST NOT** يُستخدم (يكسر اتصال الحروف) | MAY للتأكيد الخفيف فقط |
| Mixed Arabic/English | الأرقام والمصطلحات الإنجليزية داخل جملة عربية تبقى LTR داخليًا (مهم للتواريخ/الأزمنة الرياضية) | — |

## 4.7 Responsive Typography

الانتقال بين الأحجام يتبع Breakpoints من Chapter 3 (`DT-BREAKPOINT-*`)، بخطوتين فقط لكل مستوى (Desktop/Mobile) كما في §4.4 — **لا** قفزات إضافية على Tablet (يستخدم قيمة أقرب Breakpoint) لتفادي تعقيد الصيانة. لوحة التحكم (Chapter 12) **SHOULD** تستخدم أحجام Desktop كافتراضي دائمًا حتى على شاشات متوسطة (PR-006).

## 4.8 Variable Fonts

**القرار:** استخدام **Variable Fonts** (ملف واحد لكل عائلة يحتوي كل الأوزان) بدل ملفات Static منفصلة.
**السبب:** كل من Alexandria وIBM Plex Sans متوفرتان كـVariable Fonts على Google Fonts؛ هذا يقلل عدد طلبات الشبكة (Network Requests) من ~8 ملفات (4 أوزان × عائلتين) إلى 2 ملف فقط — تطبيق مباشر لـPR-002 (Performance First).

## 4.9 Font Loading Strategy

| التقنية | التطبيق |
|---|---|
| `preload` | الوزن الأكثر استخدامًا (Regular) لكل عائلة **MUST** يُحمَّل بـ`<link rel="preload">` في `<head>` |
| `font-display` | `swap` إلزاميًا — نص بخط النظام فورًا، استبدال سلس عند اكتمال تحميل الخط المخصص (يمنع FOIT) |
| `unicode-range` | تقسيم الخط لنطاقات (عربي/لاتيني) لتحميل النطاق المطلوب فقط حسب لغة الصفحة |
| `subset` | **SHOULD** استخدام نسخة مُقسَّمة (Subset) تحتوي فقط الحروف والأرقام الفعلية المستخدمة، لا الخط الكامل |
| Local Fallback | Self-hosting (استضافة ذاتية للخطوط) **SHOULD** تُفضَّل على Google Fonts CDN لتقليل طلب DNS خارجي إضافي (Chapter 5: LCP) |

## 4.10 Accessibility (يرتبط بـChapter 6)

| القاعدة | القيمة |
|---|---|
| الحد الأدنى لحجم الخط | 13px (Caption/Label) — لا نص أصغر من ذلك في أي مكان |
| التباين | يتبع Chapter 1 §1.9 وChapter 6 (WCAG 2.2 AA) |
| التكبير (Zoom) | النظام **MUST** يبقى قابلاً للاستخدام الكامل عند تكبير المتصفح حتى 200% دون كسر التخطيط |
| نص داخل صور | **MUST NOT** — أي نص مهم (عناوين، تسميات) **MUST** يكون HTML حقيقي قابل للتحديد وقراءة الشاشة |
| طول السطر | يتبع §4.6 لتفادي إجهاد القراءة |

## 4.11 Internationalization (I18n)

هذا الفصل جزء من **Enterprise Design System Framework** العام (Chapter 0) — القواعد هنا **MUST NOT** تُقيَّد بلغتين فقط بنيويًا:
- **العربية:** RTL، خط Alexandria (§4.3)
- **الإنجليزية:** LTR، خط IBM Plex Sans
- **لغات لاتينية أخرى مستقبلية** (فرنسي، إسباني...): تستهلك نفس عائلة IBM Plex Sans (تغطية Latin Extended موجودة أصلاً في الخط) دون تغيير بنيوي
- **لغات مستقبلية بأنظمة كتابة مختلفة** (صيني، تايلاندي...): تتطلب إضافة عائلة خط جديدة عبر §ADR جديد يُسجَّل هنا، مع بقاء §4.2 Font Architecture وaحية دون تغيير

**قاعدة معمارية (MUST):** أي نص في الكود **MUST NOT** يفترض لغة ثابتة (Hardcoded) — كل Direction وFont Family يُشتقان من توكن اللغة الفعلي (Chapter 7).

## 4.12 Typography QA Checklist

☐ هل كل نص يستخدم توكن من §4.4، لا حجمًا حرًا؟
☐ هل الحجم موجود فعليًا في Type Scale؟
☐ هل Line Height مطابق للقيمة المحددة في §4.4/4.6؟
☐ هل تم اختبار الشاشة بالعربي RTL كاملاً؟
☐ هل تم اختبار الشاشة على Mobile (375px)؟
☐ هل يوجد أكثر من 3 أوزان خط في نفس الشاشة؟ (يجب ألا يوجد — راجع §4.13)

## 4.13 Typography Anti-Patterns

❌ أكثر من 3 أوزان خط ظاهرة في نفس الشاشة (يخالف PR-001)
❌ استخدام ALL CAPS للنص العربي (لا مفهوم "حالة أحرف" في العربية، يُنتج نصًا غير مقروء)
❌ Line Height أقل من 1.4 لأي نص فقرة
❌ نص فوق صورة بدون طبقة تباين (Gradient Overlay) كافية
❌ حجم خط غير موجود في §4.4 (قيمة حرة مثل `17px`)

## 4.14 Typography Testing

| النوع | الأداة/الطريقة |
|---|---|
| Visual Regression | مقارنة لقطات شاشة قبل/بعد أي تغيير توكن خط (يرتبط بـChapter 3 §3.29) |
| Screenshot Testing | تغطية صفحة خبر عربية كاملة طويلة (اختبار حقيقي لقرار ADR-0007 §Risks) |
| Accessibility Tests | فحص Zoom 200%، فحص حجم أدنى 13px آليًا |
| Responsive Tests | فحص كل مستوى من §4.4 على Desktop/Mobile فعليًا |

## 4.15 Typography Registry

كل نمط طباعي مسجَّل بنفس منطق Chapter 3 §3.24: `TY-H1 · Heading Level 1 · Token: DT-FONT-SIZE-H1 · Usage: عناوين الصفحات الرئيسية · Components: [PageHeader, ArticleTitle] · Introduced: v1.0`.

## 4.16 Future — Typography 2.0 (Backlog، لا يُنفَّذ الآن)
**Fluid Typography** (تدرج حجم الخط مع عرض الشاشة عبر `clamp()` بدل قفزات Breakpoint) · **Optical Size** (استغلال محاور Variable Font الإضافية لتفاصيل حرفية تلقائية) · **AI Typography Assistant** (اقتراح تسلسل هرمي طباعي تلقائي عند لصق محتوى خام — Chapter 16) · **Dynamic Reading Modes** (وضع قراءة مخصص لضعاف الرؤية، توسيع لـChapter 6).

## Do & Don't
**Do:** استخدم فقط أحجام/أوزان §4.4 · اتبع §4.9 لكل خط جديد يُضاف
**Don't:** لا تحمّل أكثر من عائلتين خط (Arabic + Latin) في أي صفحة · لا تكسر §4.6 حتى لتصميم "خاص"

## Success Metrics
- 100% من النصوص تستهلك توكن من §4.4 (مفحوص في Chapter 3 §3.13 CI)
- صفر ملفات خط إضافية غير Alexandria/IBM Plex Sans/IBM Plex Mono في الحزمة النهائية
- LCP للنص الأساسي غير متأثر بتحميل الخط (بفضل §4.9 `font-display: swap`)

## References
Alexandria (Google Fonts, SIL OFL) · IBM Plex Sans/Mono (IBM, SIL OFL) · WCAG 2.2 (§1.4 Text Spacing/Resize) · Chapter 1 §1.6

## Related Chapters
Chapter 1 (§1.6 مرجع الخط الأصلي) · Chapter 3 (DT-FONT-* Tokens) · Chapter 6 (Accessibility الكاملة) · Chapter 7 (Semantic Typography Tokens) · Chapter 8 (تطبيق فعلي في Heading/Text Components)

---

*نهاية Chapter 4. هذا الفصل هو المرجع الوحيد للطباعة — الفصول اللاحقة تشير إليه ولا تكرره. الفصل التالي: Chapter 5 — Grid, Layout & Motion.*

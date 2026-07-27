# Chapter 8 — Component Inventory
## Level 6: Media Components (Media Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L6 of 8) | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 5 (Motion, Performance) · Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Avatar, Skeleton) · Chapter 8 L4 (Error State) | L8 (Sports: صور اللاعبين/الأندية، فيديوهات البطولات) · Chapter 13 (CMS Media Library) · Chapter 9 (Alt Text writing rules) |

## Scope
**يغطي:** L6 كـ**Media Foundation** (تحميل، نسبة أبعاد، صور متجاوبة، بدائل، تحميل كسول، معالجة أخطاء، وصول، سياسة قص، Object Fit، أمان) + 5 مكونات وسائط.
**لا يغطي:** رفع الملفات نفسه (→ Chapter 8 L2 §CMP-FILEUPLOAD-001/CMP-IMAGEUPLOAD-001)، إدارة مكتبة الوسائط الكاملة كنظام (→ Chapter 13 CMS).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Aspect Ratio** | نسبة العرض للارتفاع الثابتة لعنصر وسائط (مثال 16:9)، تُحجز مساحتها قبل تحميل المحتوى الفعلي لمنع CLS |
| **Object Fit** | كيفية ملء صورة/فيديو لحاوية بأبعاد مختلفة عن أبعادها الأصلية (`cover`, `contain`, `fill`) |
| **Responsive Image** | صورة تُحمَّل بدقة/حجم مختلف حسب حجم الشاشة وكثافة البكسل عبر `srcset`/`sizes` |

## Purpose
"Media Foundation" هو العقد الوحيد لكل صورة وفيديو في المنصة — الأداء (Chapter 0 §Design Goals) يتأثر بالوسائط أكثر من أي فئة مكونات أخرى تقريبًا، فهذا الفصل يحمي ذلك بقواعد صارمة قبل أي مكوّن فردي.

---

## ADR-0018: Media Loading & Performance Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision (تطبيق مباشر لـPR-002 Performance First) |
| **Context** | صور اللاعبين والأندية والفعاليات ستشكّل الجزء الأكبر من وزن الصفحة عبر المنصة (Chapter 0: هوية بصرية عالمية تعتمد على صور احترافية) — بدون عقد صارم، الأداء (LCP<2.5s) ينهار بسرعة |
| **Decision** | كل وسائط **MUST** تحجز مساحتها (Aspect Ratio) قبل التحميل (منع CLS) · **MUST** Lazy Loading لكل صورة/فيديو تحت الطية (`loading="lazy"` أو مكافئ) باستثناء أول عنصر Hero فوق الطية (`priority`/`eager`) · **MUST** صيغ حديثة مضغوطة (WebP/AVIF) مع Fallback لصيغ أقدم · **MUST** `srcset`/`sizes` لكل صورة محتوى (لا حجم واحد يُرسَل لكل الشاشات) |
| **Alternatives Considered** | ترك تحسين الصور لكل مطوّر حسب تقديره — رُفض لأنه أول مصدر لتدهور الأداء تاريخيًا في مشاريع مشابهة |
| **Why This Decision** | يضمن أن كل صورة جديدة تُضاف للمنصة (وستكون كثيرة عبر سنوات) تخضع لنفس معايير الأداء تلقائيًا |
| **Risks** | صور مرفوعة من مستخدمين (لوحة التحكم) قد لا تُحسَّن من المصدر. Mitigation: §M.9 Media Security يوجب معالجة/ضغط من جهة الخادم لكل رفع، لا الاعتماد على جودة الملف الأصلي |
| **Consequences** | كل مكوّن أدناه **MUST** يستهلك هذا العقد، لا إعادة تنفيذه فرديًا |

---

## Media Foundation — الأقسام المشتركة

### M.1 Media Loading Contract
راجع ADR-0018 — Lazy Loading افتراضي، Eager فقط لأول عنصر فوق الطية، صيغ حديثة مع Fallback.

### M.2 Aspect Ratio Contract
كل حاوية وسائط **MUST** تُعرِّف نسبة أبعاد ثابتة (`DT-ASPECT-*`، Chapter 3) **قبل** وصول الوسائط الفعلية — عبر CSS (`aspect-ratio`) لا انتظار تحميل الصورة لمعرفة أبعادها. نسب قياسية: `1:1` (Avatar/Square Card) · `4:3` (صور عامة) · `16:9` (فيديو/Hero) · `3:4` (بطاقات لاعب عمودية).

### M.3 Responsive Images Contract
**MUST** `srcset` بعدة دقات (1x/2x/3x لكثافة البكسل) + `sizes` يعكس التخطيط الفعلي (Chapter 5 Breakpoints) — **MUST NOT** إرسال صورة بحجم Desktop الكامل لعرض MoBile مصغّر.

### M.4 Fallback Contract
| الحالة | البديل |
|---|---|
| فشل تحميل الصورة | صورة بديلة عامة (Placeholder) بنفس Aspect Ratio — **MUST NOT** فراغ أو أيقونة "صورة مكسورة" افتراضية للمتصفح |
| فشل تحميل الفيديو | رسالة نصية + إمكانية إعادة المحاولة (يستهلك Chapter 8 L4 §FB.19 Retry Contract) |
| عدم توفر صورة لاعب/نادٍ من الأساس | نفس منطق Avatar Fallback Chain (Chapter 8 L1: Photo→Initials→Icon) |

### M.5 Lazy Loading Contract
كل وسائط تحت الطية **MUST** `loading="lazy"` (أو `IntersectionObserver` مكافئ) — **يُستثنى** فقط: أول صورة/فيديو Hero ظاهر فور تحميل الصفحة (يُحمَّل بأولوية `eager`/`priority` لتحسين LCP، Chapter 0).

### M.6 Error Handling
فشل تحميل الوسائط **MUST NOT** يكسر تخطيط الصفحة (Aspect Ratio §M.2 يحافظ على المساحة المحجوزة حتى عند الفشل) — يتكامل مع §M.4 Fallback مباشرة، لا حالة خطأ منفصلة تُعاد اختراعها.

### M.7 Accessibility
تطبيق مباشر لـChapter 6 §6.8: **MUST** `alt` وصفي لكل صورة محتوى (بالعربي والإنجليزي حسب لغة الصفحة) · **MUST** `alt=""` فارغ صراحة للصور الزخرفية · فيديو **SHOULD** ترجمة نصية (Captions) لأي محتوى صوتي مهم · **MUST NOT** نص مهم مضمَّن داخل صورة (غير قابل للقراءة الآلية أو التكبير).

### M.8 Cropping Policy
صور مرفوعة بأبعاد غير مطابقة لـAspect Ratio المطلوب (§M.2): **MUST** سياسة قص معلنة صراحة لكل سياق — إما قص تلقائي مركزي (`object-fit: cover` + `object-position: center`) أو طلب اقتصاص يدوي من المستخدم عند الرفع (Chapter 8 L2 §CMP-IMAGEUPLOAD-001) لصور الهوية الحساسة (صورة لاعب شخصية) حيث القص المركزي التلقائي قد يقصّ الوجه خطأً.

### M.9 Object Fit Contract
| القيمة | الاستخدام |
|---|---|
| `cover` | الافتراضي لمعظم السياقات (Avatar، Card، Hero) — يملأ الحاوية، قد يقصّ الأطراف |
| `contain` | شعارات الرعاة/الأندية (§M.8 لا يجوز قصّها) — الصورة كاملة دائمًا حتى لو ترك مساحة فارغة |
| `fill` | نادرًا، فقط عند تشوّه الصورة مقبولًا بصريًا (خلفيات زخرفية) |

### M.10 Media Security
| السياق | القاعدة |
|---|---|
| روابط خارجية (Embed يوتيوب لمقابلة) | **MUST** `sandbox`/`allow` محدودة الصلاحيات، **MUST** فحص أن المصدر من نطاق موثوق معلن (Whitelist) |
| ملفات مرفوعة (Chapter 8 L2) | **MUST** معالجة/ضغط من جهة الخادم دائمًا (لا الاعتماد على الملف الأصلي كما هو) — فحوصات الأمان الكاملة (فيروسات، MIME الفعلي) مفوَّضة لـChapter 17 (تطابق قرار Chapter 8 L2 §FileUpload) |
| حقوق الاستخدام | صور الرعاة/الشركاء **MUST** تُستخدم وفق اتفاقيات الترخيص الموثَّقة خارج نطاق هذه الوثيقة تقنيًا، لكن الحقل الوصفي (Attribution/License) **SHOULD** يكون جزءًا من بيانات الوسائط الوصفية في مكتبة الوسائط (Chapter 13) |

### M.11 Composition
```
<Media>
  ├── Container (يحجز Aspect Ratio، §M.2)
  ├── Content (الصورة/الفيديو الفعلي)
  ├── Loading Overlay (Skeleton، Chapter 8 L1، أثناء §M.1)
  └── Fallback Overlay (§M.4، عند الفشل)
```

---

## CMP-IMAGE-001 — Image
**Purpose:** عنصر الصورة الأساسي المستهلَك في كل مكان (Card، Avatar الداخلي، محتوى الأخبار). **Related Governance:** M.1-M.9 كاملة، Chapter 8 L1 (Skeleton أثناء التحميل).

## CMP-GALLERY-001 — Gallery
**Purpose:** شبكة صور متعددة قابلة للتصفح (معرض صور فعالية). **Behavior:** **MUST** أول 6-8 صور فقط `eager` إن ظهرت فوق الطية، الباقي `lazy` (§M.5). **Related Governance:** يبني فوق CMP-IMAGE-001، Chapter 5 Grid.

## CMP-VIDEO-001 — Video
**Purpose:** مشغّل فيديو (تسجيلات بطولات، مقابلات). **Behavior:** **MUST NOT** تشغيل تلقائي بصوت (Autoplay with sound) — يخالف تجربة مستخدم قياسية ويضر الأداء؛ Autoplay بصوت مكتوم **MAY** فقط لخلفيات Hero زخرفية قصيرة. **Related Governance:** M.4 (فشل التحميل)، M.7 (Captions)، Chapter 6 §6.6 (لا وميض).

## CMP-CAROUSEL-001 — Carousel
**Purpose:** عرض دوّار لعناصر متعددة (صور Hero متعاقبة، بطاقات فعاليات مميزة). **Behavior:** **MUST** إيقاف تلقائي عند `prefers-reduced-motion` (Chapter 5 §5.8) · **MUST** أزرار تنقل يدوي واضحة (لا اعتماد على السحب باللمس فقط) · **MUST NOT** دوران تلقائي مستمر بلا زر إيقاف يدوي متاح دائمًا (Chapter 6 §2.2.2 WCAG — المحتوى المتحرك تلقائيًا يحتاج تحكمًا). **Related Governance:** Chapter 5 §Motion Anti-Patterns، M.5.

## CMP-LIGHTBOX-001 — Lightbox
**Purpose:** عرض صورة/فيديو مكبّرًا فوق طبقة (من نقر صورة في Gallery). **Behavior:** يبني فوق Chapter 8 L4 §CMP-DIALOG-001 (Overlay + Focus Trap + Esc للإغلاق). **MUST** تنقل بالكيبورد بين عناصر المعرض (أسهم يمين/يسار) أثناء الفتح. **Related Governance:** Chapter 8 L4 (FB.9 Focus Management)، Chapter 6 §6.3.

---

## Do & Don't (L6 عام)
**Do:** احجز Aspect Ratio قبل أي تحميل وسائط · استخدم `object-fit: contain` لشعارات الرعاة دائمًا
**Don't:** لا تشغّل فيديو تلقائيًا بصوت · لا ترسل صورة Desktop الكاملة لعرض موبايل مصغّر

## Success Metrics
- 0 صورة/فيديو يسبب CLS قابل للقياس (Aspect Ratio محجوز دائمًا)
- 100% من الصور تحت الطية تستخدم Lazy Loading باستثناء أول عنصر Hero
- 0 فيديو Autoplay بصوت
- 100% من صور المحتوى تحمل `alt` وصفي بلغتي الموقع

## References
**Normative:** Chapter 2 (PR-002) · Chapter 5 (Performance) · Chapter 6 (§6.8) · Chapter 8 Global Governance
**Implementation:** Next.js Image Component (مرجع تنفيذي محايد للتحسين التلقائي) · WCAG 2.2

## Related Chapters
Chapter 8 L1 (Avatar/Skeleton) · Chapter 8 L2 (§FileUpload/ImageUpload) · Chapter 8 L4 (§Dialog، §Retry) · Chapter 13 (Media Library) · Chapter 17 (أمان الرفع)

---

*نهاية L6 Media (Media Foundation M.1-M.11 + 5 مكونات). التالي: L7 Enterprise Components.*

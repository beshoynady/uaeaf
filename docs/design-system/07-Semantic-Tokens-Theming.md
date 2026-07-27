# Chapter 7 — Semantic Tokens & Theming

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 1 (القيم الخام) · Chapter 2 (PR-009) · Chapter 3 (بنية الطبقات، `DT-*`) · Chapter 4 (`DT-FONT-*`) · Chapter 5 (`DT-MOTION-*`, `DT-GRID-*`) · Chapter 6 (متطلبات الوصول) | Chapter 8/10 (Components — الاستهلاك الوحيد المسموح) · Chapter 12 (Dashboard) · Chapter 21 (Tailwind Mapping) |

## Scope
**يغطي:** الطبقة الدلالية الكاملة (Semantic Tokens)، نظام الثيمات (Light/Dark/High Contrast)، آلية التبديل بين الثيمات، قواعد التحقق والاعتماديات.
**لا يغطي:** القيم الخام نفسها (→ Chapter 3)، استهلاك التوكن داخل مكوّن فعلي (→ Chapter 8).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Semantic Token** | توكن يحمل معنى وظيفيًا (`color.text.primary`) بدل قيمة أو علامة (`green.500`) — هذا الفصل هو مصنعها الوحيد |
| **Theme** | مجموعة كاملة من قيم Runtime لكل Semantic Token، تُفعَّل عبر سمة واحدة (`data-theme`) |
| **Theme Resolution** | العملية التي يحدد بها المتصفح أي قيمة Runtime تُستخدم فعليًا بناءً على الثيم النشط |
| **Fallback Chain** | تسلسل القيم الاحتياطية إذا لم يُعرَّف توكن في ثيم معين |

## Purpose
هذا الفصل هو **الجسر المعماري** بين طبقة الأساس (Chapters 1-6) وطبقة المكونات (Chapter 8+). كل قيمة تصميمية بعد هذا الفصل **MUST** تمر من هنا — لا مكوّن يتحدث مع Chapter 1 أو Chapter 3 مباشرة.

---

## ADR-0011: Semantic Token Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision (تطبيق مباشر لـADR-0006، Chapter 3) |
| **Context** | Chapter 3 أسس بنية 5 طبقات نظريًا؛ هذا الفصل ينفّذ الطبقة الثالثة (Semantic) فعليًا بكل قواعدها وقيمها لأول مرة |
| **Decision** | كل Semantic Token **MUST** يُشتق من Brand Token واحد فقط (لا مزج مباشر من Primitive)، ويُعرَّف بثلاث نسخ متوازية إلزامية: **Light**، **Dark**، **High Contrast** — لا نسختين فقط |
| **Alternatives Considered** | ثيمان فقط (Light/Dark) مع Contrast Toggle كطبقة CSS filter فوقهما — رُفض (Chapter 6 Backlog Note) لأن الفلترة الآلية للتباين تُنتج نتائج لونية غير متوقعة وتخالف Chapter 1 (دقة الهوية) |
| **Why This Decision** | ثلاثة ثيمات مستقلة (لا Inversion آلي) تضمن أن كل ثيم "مُصمَّم" لا "محسوب"، متوافق مع قرار Discovery الأصلي (Chapter 0: "لا تحويل ألوان تلقائي، بل تصميم Theme مستقل لكل وضع") |
| **Risks** | ثلاثة ثيمات = 3x حجم تعريفات الألوان. Mitigation: §7.5 يوضح أن أغلب التوكنز غير اللونية (تباعد، حركة) لا تتغير بين الثيمات، فقط توكنز اللون والظل تحتاج 3 نسخ فعليًا |
| **Consequences** | كل Semantic Token في §7.5 **MUST** يحمل 3 قيم Runtime؛ غياب أي منها **MUST** يُوقف Build (§7.6) |

---

## 7.1 Semantic Token Creation Rules

| القاعدة | النوع |
|---|---|
| Semantic Token **MUST** يُشتق من Brand Token واحد (`color.semantic.success = color.brand.primary`) | MUST |
| Semantic Token **MUST NOT** يشير لـPrimitive مباشرة (`color.semantic.success = green.500` ممنوع) | MUST NOT |
| كل Semantic Token جديد **MUST** يمر بدورة Chapter 3 §3.5 (Proposal→Review→Approved) | MUST |
| اسم Semantic Token **MUST** يصف **الوظيفة** لا **المظهر** (`color.text.primary` صحيح، `color.dark-gray` خطأ) | MUST |

## 7.2 Alias, Inheritance, Fallback

**Alias:** اسم بديل مختصر يُستخدم داخليًا في أدوات البناء فقط (Chapter 3 §3.20) — لا يظهر في كود الإنتاج.
**Inheritance:** توكن Semantic فرعي **MAY** يرث من توكن Semantic أعلى إن لم يُعرَّف صراحة (مثال: `color.text.link` يرث من `color.text.primary` إن لم يُحدَّد لون رابط خاص).
**Fallback Chain:** إذا غاب توكن في ثيم معين، **MUST** الرجوع للتسلسل: `Theme-Specific Value → Semantic Default (Light) → Brand Token → Build Error` — لا قيمة صامتة غير معرَّفة أبدًا (يمنع أخطاء بصرية صامتة).

## 7.3 Theme System: Light / Dark / High Contrast

### Light Theme (الافتراضي)
```css
:root {
  --color-text-primary: var(--color-brand-black-900);      /* #000000 مباشرة */
  --color-surface-base: var(--color-white);
  --color-border-default: var(--color-gray-200);
}
```

### Dark Theme
```css
[data-theme="dark"] {
  --color-text-primary: var(--color-gray-25);
  --color-surface-base: var(--color-gray-950);
  --color-border-default: var(--color-gray-800);
  /* الشعار: أحادي أبيض فقط — Chapter 1 ADR-0002 */
}
```

### High Contrast Theme (يقفل Chapter 6 Backlog Item)
```css
[data-theme="high-contrast"] {
  --color-text-primary: #000000;         /* تباين أقصى، لا تدرج */
  --color-surface-base: #FFFFFF;
  --color-border-default: #000000;       /* حدود أوضح من الافتراضي (2px بدل 1px عبر DT-BORDER-WIDTH) */
  --a11y-focus-ring-width: 3px;          /* أعرض من الوضع العادي (2px) */
}
```
**قرار:** High Contrast ثيم **مستقل مصمَّم يدويًا**، لا نتيجة فلتر تباين آلي فوق Light/Dark — يُفعَّل من Floating Accessibility Panel (Chapter 6 §6.9) كخيار Theme ثالث، لا مجرد "Toggle".

## 7.4 Theme Resolution & Switching

```
User Preference (محفوظة محليًا/بالحساب — Chapter 6 §6.9)
    ↓
data-theme attribute على <html>
    ↓
CSS Cascade يحل القيم تلقائيًا (Runtime Tokens من §7.3)
    ↓
لا إعادة Render لشجرة React (Chapter 3 §3.11 — CSS-only Switching)
```
**قاعدة (MUST):** التبديل بين الثيمات الثلاثة **MUST** يتم حصريًا عبر تغيير سمة `data-theme`؛ **MUST NOT** أي منطق JavaScript يعيد حساب قيم الألوان وقت التشغيل.

## 7.5 DT-* → Semantic Mapping (أمثلة عبر كل الفئات)

| الفئة | Primitive/Brand (Chapter 3) | Semantic Token (هنا) | الاستخدام |
|---|---|---|---|
| **Color** | `brand.primary` (green.500) | `color.semantic.success` | حالات النجاح، أزرار أساسية |
| **Color** | `brand.secondary` (red.500) | `color.semantic.danger` | حذف، خطأ، تحذير حرج |
| **Typography** | `DT-FONT-SIZE-H1` (Chapter 4) | `typography.heading.page` | عناوين الصفحات |
| **Motion** | `DT-MOTION-DURATION-BASE` (Chapter 5) | `motion.transition.overlay` | فتح/إغلاق Modal وDrawer |
| **Elevation** | `DT-SHADOW-MD` (Chapter 3) | `elevation.card.hover` | حالة Hover للبطاقات |
| **Border** | `DT-BORDER-WIDTH-DEFAULT` | `border.input.default` | حدود حقول الإدخال |
| **State** | `color.semantic.danger` | `state.error.background` | خلفية رسالة خطأ |
| **Accessibility** *(يقفل Chapter 6 Backlog)* | `DT-BORDER-WIDTH-*` | `a11y.focus.ring` | حلقة التركيز المرئية لكل عنصر تفاعلي |
| **Accessibility** | — | `a11y.motion.reduced` | Boolean دلالي يعكس `prefers-reduced-motion` للمكونات (Chapter 5 §5.8) |

## 7.6 Token Validation & Dependency Rules

| القاعدة | التحقق الآلي (يتكامل مع Chapter 3 §3.13 CI) |
|---|---|
| كل Semantic Token له 3 قيم (Light/Dark/High Contrast) | Build **MUST** يفشل إن غابت إحداها |
| لا Circular Reference (Semantic A يشير لـSemantic B يشير لـSemantic A) | يُفحص آليًا قبل Build |
| كل Semantic Token له مرجع Brand واحد فقط لا أكثر | Lint Rule |
| لا Semantic Token بلا استخدام في أي Component لمدة إصدارين | يُبلَّغ في Chapter 3 §3.15 Quarterly Audit |

## 7.7 Component Consumption Rule (القاعدة الأهم في الفصل)

```
Component (Chapter 8) → Semantic Token (هنا) فقط
Component MUST NOT → Brand Token (Chapter 1) مباشرة
Component MUST NOT → Primitive Token (Chapter 3) مباشرة أبدًا
```
**مثال مخالف (ممنوع):**
```jsx
<Button style={{ background: 'var(--color-green-500)' }}>  {/* ❌ Primitive مباشر */}
```
**مثال صحيح:**
```jsx
<Button className="bg-semantic-success">  {/* ✅ Semantic فقط */}
```

## 7.8 Implementation Mapping (Tailwind / CSS Variables / React)

```
tokens/semantic/colors.json (Chapter 3 §3.4.1 File Structure)
    ↓ Style Dictionary Build (لكل ثيم: light.css / dark.css / high-contrast.css)
CSS: [data-theme="X"] { --color-semantic-success: ...; }
    ↓ tailwind.config.js
theme.colors.semantic.success = 'var(--color-semantic-success)'
    ↓
Tailwind Utility: bg-semantic-success, text-semantic-success
    ↓
React Component (Chapter 8) يستهلك الكلاس فقط
```

## Do & Don't
**Do:** أنشئ أي قيمة جديدة كـSemantic Token أولاً حتى لو بدت مؤقتة · اختبر كل توكن جديد في الثيمات الثلاثة معًا
**Don't:** لا تستهلك Brand/Primitive من أي Component مهما كان السبب (§7.7) · لا تنسَ نسخة High Contrast عند إضافة توكن لوني جديد

## Accessibility Considerations
High Contrast Theme (§7.3) هو التطبيق الفعلي لالتزام Chapter 6؛ توكنز `a11y.*` (§7.5) تضمن أن كل مكوّن لاحق (Chapter 8) يرث قواعد الوصول تلقائيًا دون إعادة تعريفها في كل مكوّن.

## Performance Considerations
3 ثيمات = 3 ملفات CSS مبنية مسبقًا (لا Runtime computation) — التكلفة صفرية عند التبديل (Chapter 3 §3.11)، فقط حجم بناء أكبر قليلاً (مقبول، خارج نطاق Critical Path).

## AI Considerations
عند اقتراح AI (Chapter 16) لتوكن Semantic جديد، **MUST** يقترح القيم الثلاث معًا (Light/Dark/High Contrast) لا واحدة فقط — يُرفض أي اقتراح ناقص آليًا في §7.6.

## Success Metrics
- 100% من Semantic Tokens لها 3 قيم ثيم كاملة (مفحوص آليًا)
- 0 حالة استهلاك مباشر لـPrimitive/Brand داخل أي Component
- 0 Circular Reference في شجرة التوكنز

## References
Chapter 1, 2, 3, 4, 5, 6 (كل الأساس الذي يُبنى عليه هذا الفصل) · Material Design Theming · IBM Carbon Theming

## Related Chapters
هذا الفصل يُستهلك من كل فصل مكوّنات لاحق (8, 10, 12) — هو نقطة العبور الإلزامية الوحيدة.

---

*نهاية Chapter 7 — العمود الفقري (Foundation + Semantic Bridge، فصول 0-7) مكتمل بالكامل. الفصل التالي: Chapter 8 — Component Inventory.*

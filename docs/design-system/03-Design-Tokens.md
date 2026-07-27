# Chapter 3 — Design Tokens (Token Architecture Specification)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **ملاحظة ترقيم:** القرار الرئيسي هنا مُرقَّم **ADR-0006** (لا ADR-0005 كما اقتُرح) لتجنّب تعارضه مع ADR-0005 الموجود في Chapter 1.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 1 (القيم الخام) · Chapter 2 (PR-009) | Chapter 4, 5, 6, 7, 8, 10, 12, 20, 21 |

## Scope
**يغطي:** بنية التوكنز الكاملة، التسمية، دورة الحياة، الحوكمة، الاختبار، القيود، خط أنابيب التصدير.
**لا يغطي:** القيم الدلالية النهائية الكاملة (→ Chapter 7)، التطبيق داخل مكوّن فعلي (→ Chapter 8).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Primitive Token** | القيمة الخام المطلقة، بلا معنى وظيفي |
| **Brand Token** | Primitive معاد تسميته بمعنى العلامة |
| **Semantic Token** | توكن بمعنى وظيفي — لا يُستخدم من Primitive مباشرة |
| **Component Token** | توكن خاص بمكوّن واحد |
| **Runtime Token** | القيمة الفعلية في المتصفح (CSS Custom Property) |
| **Dead Token** | توكن مُعرَّف لكنه غير مستخدم في أي مكان بالكود فعليًا |

## Purpose
هذا الفصل يجيب: كيف يُبنى النظام بالكامل من خلال Design Tokens؟ أي خطأ هنا يتكرر في كل فصل لاحق.

---

## ADR-0006: Multi-Layer Token Architecture

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision (مبني على PR-009) |
| **Context** | النظام يحتاج مصدرًا واحدًا للحقيقة البصرية يخدم Figma وReact وTailwind معًا |
| **Decision** | بنية 5 طبقات: Primitive → Brand → Semantic → Component → Runtime، كل طبقة تستهلك السابقة فقط |
| **Alternatives Considered** | طبقتان فقط — رُفضت (تربط المكونات بالعلامة مباشرة). طبقة واحدة مسطّحة — رُفضت (تفقد المرجعية للقيمة الرسمية) |
| **Why This Decision** | معيار صناعي (Material Design 3، IBM Carbon، Atlassian) يفصل "المعنى" عن "القيمة" |
| **Risks** | تعقيد زائد على مشروع صغير؛ مبرر برؤية الـ10 سنوات. Mitigation: §Token Rules بأمثلة كود واضحة |
| **Consequences** | Chapter 7 وChapter 8 يتبعان هذه الطبقات حرفيًا |

---

## 3.1 Token Philosophy
نستخدم Tokens لا قيمًا حرة لأربعة أسباب: مصدر حقيقة واحد، قابلية الثيمنة، قابلية التدقيق، لغة مشتركة تصميم/كود.

## 3.2 Token Hierarchy

```
Primitive          Brand               Semantic                Component            Runtime (CSS)
green.500     →     brand.primary  →    color.success      →    button.primary.bg  → --button-primary-bg
(#00843D)           (=green.500)        (=brand.primary)        (=color.success)      (#00843D)
```

## 3.3 Naming Convention

الصيغة: `{category}.{property}.{variant?}.{state?}` — أمثلة: `color.brand.primary`، `space.4`، `radius.md`، `motion.duration.fast`.

**مطابقة Figma↔Kod (MUST):** اسم Variable في Figma `color/brand/primary` MUST يقابله حرفيًا `color.brand.primary` في الكود (استبدال `/` بـ`.` فقط، لا تغيير آخر) — يمنع أي انحراف بين التصميم والتنفيذ.

## 3.4 Token Categories (القائمة الكاملة)

| الفئة | مثال | المعرّف |
|---|---|---|
| Color | `color.brand.primary` | DT-COLOR-* |
| Typography Family | `font.family.arabic` | DT-FONT-FAMILY-* |
| Font Weight | `font.weight.bold` | DT-FONT-WEIGHT-* |
| Font Size | `font.size.h1` | DT-FONT-SIZE-* |
| Line Height | `font.lineHeight.body` | DT-LINE-HEIGHT-* |
| Letter Spacing | `font.letterSpacing.display` | DT-LETTER-SPACING-* |
| Radius | `radius.md` | DT-RADIUS-* |
| Border Width/Style | `border.width.default` | DT-BORDER-* |
| Elevation / Shadow | `elevation.2` / `shadow.lg` | DT-ELEVATION-* / DT-SHADOW-* |
| Blur / Opacity | `blur.glass` / `opacity.hover` | DT-BLUR-* / DT-OPACITY-* |
| Breakpoints / Grid | `breakpoint.lg` | DT-BREAKPOINT-* / DT-GRID-* |
| Motion (Duration/Easing) | `motion.duration.base` | DT-MOTION-* |
| Z-index | `zIndex.modal` | DT-ZINDEX-* |
| Icon / Avatar Size | `icon.size.md` | DT-ICON-SIZE-* / DT-AVATAR-SIZE-* |
| Container Width / Aspect Ratio | `container.maxWidth` | DT-CONTAINER-* / DT-ASPECT-* |

### 3.4.1 Token File Structure

```
tokens/
├── primitive/
│   ├── colors.json
│   ├── spacing.json
│   └── radius.json
├── brand/
│   └── brand.json
├── semantic/
│   ├── colors.json
│   └── typography.json
├── component/
│   ├── button.json
│   └── card.json
└── build/
    └── tokens.json          ← الناتج النهائي المُصدَّر (Style Dictionary output)
```

### 3.4.2 JSON Specification (أمثلة حقيقية)

**Primitive:**
```json
{ "color": { "green": { "500": { "value": "#00843D" } } } }
```
**Brand (يشير للـPrimitive بصيغة مرجعية):**
```json
{ "color": { "brand": { "primary": { "value": "{color.green.500}" } } } }
```
**Semantic:**
```json
{ "color": { "semantic": { "success": { "value": "{color.brand.primary}" } } } }
```
**Component:**
```json
{ "button": { "primary": { "background": { "value": "{color.semantic.success}" } } } }
```

## 3.5 Token Lifecycle

```
Proposal → Review → Approved → Deprecated → Removed
```

| المرحلة | من يفعلها | ماذا يحدث |
|---|---|---|
| Proposal | أي مطوّر/مصمم | يقترح توكنًا بمبرر واضح |
| Review | مالك المشروع | يتحقق من §Token Rules وعدم وجود بديل مطابق (راجع §3.5.1 Decision Tree) |
| Approved | مالك المشروع | يُضاف لـtokens.json، يظهر في Figma Variables |
| Deprecated | مالك المشروع | يُعلَّم بـ`@deprecated` مع بديل، يبقى يعمل لفترة سماح |
| Removed | مالك المشروع | يُحذف بعد انتهاء فترة السماح وتأكيد صفر استخدام |

### 3.5.1 Token Decision Tree (لمطوّر يحتاج قيمة جديدة)

```
هل يوجد توكن يفي بالحاجة؟
 ├─ نعم → استخدمه مباشرة
 └─ لا → هل يمكن توسيع توكن Semantic موجود ليشمل الحالة الجديدة؟
          ├─ نعم → عدّله (Review إلزامية)
          └─ لا → افتح Proposal جديد (§3.5)
```
هذا يمنع تضخم عدد التوكنز (راجع §3.14 Token Constraints).

### 3.5.2 Deprecated Example (تطبيقي)

```
Deprecated:    color.success.old         (v1.2.0)
Replacement:   color.semantic.success    (استخدم هذا بدلاً منه)
Removal:       مخطط لها في v2.0.0
```

## 3.6 Token Versioning

Patch (`1.0.x`): إضافة لا تكسر شيئًا. Minor (`1.x.0`): Deprecation مع تحذير. Major (`x.0.0`): Removal فعلي (Breaking Change، يتطلب Migration Guide بأمر بحث/استبدال جاهز).

### Token Deprecation Policy

| المرحلة | المدة |
|---|---|
| Deprecated (يعمل + تحذير) | إصداران Minor كاملان |
| Warning مكثّف (Build يُصدر تحذيرًا صريحًا) | إصدار واحد قبل الحذف |
| Removal | الإصدار Major التالي |

## 3.7 Token Ownership
مالك المشروع (حاليًا الشخص الوحيد — Chapter 22) يوافق نهائيًا على أي Proposal/Deprecation/Removal. **توكنات الطبقة Primitive/Brand (مرتبطة بالهوية الرسمية) لا تُعدَّل إلا بموافقة الاتحاد نفسه.**

## 3.8 Token Dependency Graph
```
Brand Token (Ch.1) → Semantic Token (Ch.7) → Component Token (Ch.8) → Tailwind Theme (Ch.21) → React Component
```

## 3.9 Token Export Pipeline

```
Figma Variables → Style Dictionary → tokens.json → CSS Custom Properties → Tailwind Theme → shadcn/ui → React Components
```
`tokens.json` هو مصدر الحقيقة الآلي الوحيد — Figma وTailwind كلاهما "يقرأ" منه.

## 3.10 Token Rules

| القاعدة | النوع |
|---|---|
| لا لون/قيمة Hardcoded مباشرة في الكود | MUST NOT |
| لا Component يستهلك Primitive مباشرة | MUST NOT |
| كل Component يستهلك Semantic أو Component tokens فقط | MUST |
| أي توكن جديد يمر بدورة §3.5 الكاملة | MUST |
| توكنات Primitive/Brand لا تُعدَّل إلا بمراجعة مزدوجة (مالك المشروع + الاتحاد) | MUST |
| توكنات جديدة قد تُقترح من أي مساهم | MAY |

### 3.10.1 Token Priority Resolution (عند تعدد الخيارات لنفس المكوّن)

```
هل يوجد Component Token خاص (مثال: button.primary.bg)؟
 ├─ نعم → استخدمه (الأولوية القصوى)
 └─ لا → هل يوجد Semantic Token مناسب (مثال: color.semantic.success)؟
          ├─ نعم → استخدمه
          └─ لا → استخدام Brand Token مباشرة من مكوّن = ممنوع (MUST NOT) → افتح Proposal
```

## 3.11 Token Performance
~150-200 CSS Custom Property جذرية متوقعة. تبديل الثيم (Light/Dark) MUST يتم عبر `data-theme` على `<html>` فقط (CSS-only)، **MUST NOT** بـJavaScript وقت التشغيل — يضمن صفر FOUC.

### 3.11.1 Runtime Theme Flow

```
Light Mode:  Semantic Tokens → Runtime Mapping A → CSS Variables (:root)
Dark Mode:   Semantic Tokens → Runtime Mapping B → CSS Variables ([data-theme="dark"])
```
نفس أسماء Semantic Tokens في الحالتين — فقط القيمة الفعلية (Runtime) تختلف حسب `data-theme`؛ لا Component يعرف الفرق.

## 3.12 AI Considerations
AI Assistant (Chapter 16) يقترح توكنات جديدة عند اكتشاف قيم Hardcoded متكررة، ويفحص التشابه مع توكنات موجودة لمنع التكرار قبل أي Proposal. **Human-in-the-Loop إلزامي** — لا توكن يُعتمد آليًا بدون Review بشرية (§3.5).

## 3.13 Token Testing (CI Pipeline)

```
Commit → Stylelint (يمنع Hardcoded Colors) → ESLint (قواعد استيراد التوكنز) → Build (Style Dictionary) → Visual Regression Test → Contrast Test (WCAG، Chapter 6) → Merge
```
أي Commit يخالف §3.10 (قيمة Hardcoded) **MUST** يُرفض آليًا في الـCI قبل المراجعة البشرية.

## 3.14 Token Constraints (حدود قصوى تمنع الفوضى)

| الفئة | الحد الأقصى |
|---|---|
| Elevation Levels | 5 مستويات فقط (Chapter 6) |
| Spacing Scale | القيم المعرّفة في سلّم 8pt فقط — لا قيمة حرة مثل `13px` |
| Radius Scale | 6 قيم فقط (none/xs/sm/md/lg/xl/full) |
| Color Shades لكل لون أساسي | 10 درجات (50→900) كحد أقصى |
| Motion Durations | 5 قيم فقط (instant/fast/base/slow/slower) |

## 3.15 Token Audit (Quarterly)
كل ثلاثة أشهر، مراجعة إلزامية تشمل: Unused Tokens (معرّفة وغير مستخدمة) · Duplicate Tokens (قيم متطابقة بأسماء مختلفة) · Dead Tokens · Semantic Tokens غير مستخدمة في أي Component. تُوثَّق النتائج كـTicket في نظام تتبع المشروع (خارج نطاق هذه الوثيقة).

## 3.16 Security
Design Tokens **MUST NOT** تحتوي أي معلومات خاصة بالعملاء، أسرار، روابط خارجية حساسة، أو مفاتيح API. محتواها يقتصر حصريًا على القيم البصرية (ألوان، مقاسات، توقيتات).

## Implementation Mapping — من التصميم للكود

```
[Figma: Variable "color/brand/primary" = #00843D]
        ↓ Style Dictionary (يقرأ عبر Tokens Studio Plugin/API)
[tokens.json: { "color": { "brand": { "primary": { "value": "#00843D" } } } } ]
        ↓ Style Dictionary Build
[CSS: :root { --color-brand-primary: #00843D; }]
        ↓ tailwind.config.js
[Tailwind Utility: bg-brand-primary]
        ↓ shadcn/ui Button variant="primary"
[React: <Button variant="primary">نشر</Button>]
```

## 3.17 Future (v2.0) — Platform Tokens
غير مُنفَّذ الآن، مسجَّل للمستقبل فقط: توسيع `tokens.json` ليصدّر أيضًا لمنصات أصلية (iOS/SwiftUI، Android/Jetpack Compose، Flutter، React Native) عبر نفس Style Dictionary Pipeline — بنية §3.9 مصمَّمة أصلاً لتحتمل هذا التوسع دون إعادة هيكلة.

## 3.18 Token Status (منفصل عن Lifecycle)
Lifecycle (§3.5) يصف مسار التوكن؛ Status يصف حالته الحالية — توكن يمكن أن يكون Approved لكن Status = Experimental:
`Active` · `Experimental` · `Deprecated` · `Legacy` · `Removed`

## 3.19 Token Metadata (Machine-Readable)
كل توكن MUST يحمل هذا الشكل:
```json
{
  "name": "color.brand.primary",
  "value": "#00843D",
  "type": "color",
  "status": "active",
  "owner": "Design System",
  "created": "2026-07-28",
  "references": ["PR-009", "ADR-0006"],
  "relatedComponents": ["button", "navbar", "badge"]
}
```

## 3.20 Alias Tokens
طبقة اختصار اختيارية بين Primitive واسم مستعار قصير: `primary` (Alias) → `brand.primary` (Brand) → `green.500` (Primitive). المستعارات MAY تُستخدم داخل ملفات البناء فقط؛ الكود النهائي MUST يستهلك الاسم الدلالي الكامل دائمًا.

## 3.21 Token Documentation Template
قالب ثابت لكل توكن في Registry (§3.24): ID · Name · Description · Value · Usage · Do · Don't · Related Components · Introduced Version · Deprecated Version.

## 3.22 Token Decision Record (TDR)
مثل ADR لكن للتوكنات الفردية — يجيب "ليه القيمة دي؟" بعد سنين:
```
TDR-001
Token: radius.xl (24px)
Decision: إضافة قيمة 24px للسلّم
Reason: بطاقات Hero الاحتفالية (Chapter 8) تحتاج انحناء أوضح من radius.lg دون الوصول لـradius.full
Alternative Rejected: radius.lg + padding إضافي — لا يعطي نفس الإحساس البصري
```

## 3.23 Token Migration Examples
```
قبل:      bg-green-500
بعد:      bg-brand-primary
النهائي:  bg-success
```
كل خطوة توثَّق كـTDR منفصل.

## 3.24 Token Registry
سجل رسمي مركزي: `DT-COLOR-001 · Primary Green · Status: Active · v1.0 · Owner: Design System · References: [PR-009, ADR-0006] · Related Components: [Button, Badge]`.

## 3.25 Token Coverage

| عائلة المكونات | نسبة التوكنز (بدل Hardcoded) |
|---|---|
| Buttons / Cards / Tables / Forms / Dialogs | 100% |
| Charts | ≥90% (مكتبات خارجية قد تحتاج جسر توكنز مخصص) |

## 3.26 Token Lint Rules

| Rule | Description | Severity |
|---|---|---|
| No Hardcoded Colors | يمنع قيمة Hex/RGB مباشرة | Error |
| No Direct Primitive Usage | يمنع استهلاك Component لـPrimitive مباشرة | Error |
| No Magic Radius/Spacing | يمنع قيم خارج سلّم §3.14 | Warning |
| Unused Token | توكن معرَّف بلا استخدام | Warning |

## 3.27 Token Consumers Map

| Layer | Used By |
|---|---|
| Primitive | Brand |
| Brand | Semantic |
| Semantic | Component |
| Component | React (عبر Tailwind) |
| Runtime (CSS) | المتصفح مباشرة |

## 3.28 Token Change Impact
قبل تعديل توكن من طبقة Brand/Semantic، MUST تحديد كل المكونات المتأثرة أولاً (مثال: `brand.primary` يؤثر على Buttons، Cards، Navbar، Links، Badges، Hero، Charts دفعة واحدة) عبر بحث نصي لاستخدامات التوكن قبل أي Approval.

## 3.29 Token Visual Review
بعد أي Build جديد، SHOULD تُقارن لقطات الشاشة (Visual Regression) لكل مكوّن رئيسي قبل/بعد، حتى لو لم يتغيّر كود Component، لأن تغيير توكن وحده قد يُحدث فرقًا بصريًا غير متوقع.

## 3.30 Token Deprecation Dashboard
لوحة تتبع MUST تُبنى قبل أول Deprecation فعلي، تعرض: التوكنات المهجورة، الاستخدامات المتبقية، المكونات المتأثرة، تاريخ الحذف المخطط.

## 3.31 Token Analytics (مستقبلي)
ضمن Chapter 16، استخراج: الأكثر/الأقل استخدامًا، المكرر، المتعارض — يغذّي §3.15 Quarterly Audit ببيانات فعلية.

## 3.32 Machine-Readable Specification
`tokens.json` SHOULD يلتزم ببنية W3C Design Tokens Community Group Format، ويُصادَق عليه بـ`tokens.schema.json` كخطوة في §3.13 CI Pipeline قبل Build — ملف لا يجتاز التحقق البنيوي MUST NOT يدخل خط الأنابيب.

## Do & Don't
**Do:** استخدم §3.5.1 Decision Tree قبل أي طلب توكن جديد · اتبع §3.3 حرفيًا
**Don't:** لا تكسر §3.10 حتى مؤقتًا · لا تتجاوز حدود §3.14

## Success Metrics
- 0 Hardcoded Hex Colors (مفحوصة آليًا في §3.13)
- Duplicate Tokens < 2% · Unused Tokens < 5% (مقاسة في §3.15)
- Build Time < 5s · Theme Switch < 16ms (إطار واحد @60fps)
- 100% من التوكنات الجديدة تمر بدورة §3.5 كاملة

## References
Style Dictionary (Amazon) · Material Design 3 Token System · IBM Carbon Design Tokens · W3C Design Tokens Community Group Format (tokens.schema.json validation)

## Related Chapters
Chapter 1 · Chapter 2 (PR-009) · Chapter 6 (Runtime Theme) · Chapter 7 (Semantic الكاملة) · Chapter 21 (Tailwind التفصيلي)

---

*نهاية Chapter 3 — النسخة الكاملة بمستوى Enterprise. الفصل التالي: Chapter 4 — Typography System.*

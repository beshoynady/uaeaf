# Chapter 5 — Grid, Layout & Motion

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 2 (PR-002 Performance, PR-005 Motion, PR-006 Responsiveness) · Chapter 3 (`DT-BREAKPOINT-*`, `DT-GRID-*`, `DT-MOTION-*`) | Chapter 7 (Semantic Motion Tokens) · Chapter 8/10 (Components) · Chapter 20 (Page Templates) |

## Scope
**يغطي:** نظام الشبكة (Grid)، الحاويات (Containers)، نقاط الكسر (Breakpoints)، مبادئ الحركة (Motion)، التوقيتات ومنحنيات التسارع، إعادة التدفق الاستجابي (Responsive Reflow).
**لا يغطي:** تخطيط مكوّن محدد (→ Chapter 8)، تخطيط صفحة كاملة (→ Chapter 20).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Breakpoint** | عرض شاشة يتغيّر عنده عدد الأعمدة/التخطيط |
| **Gutter** | المسافة الأفقية بين أعمدة الشبكة |
| **Container** | العنصر الحاوي الذي يحدد أقصى عرض للمحتوى |
| **Easing Curve** | منحنى رياضي يصف تسارع/تباطؤ الحركة عبر الزمن |
| **Choreography** | تسلسل زمني منسّق لحركة عناصر متعددة (لا حركة كل عنصر بمعزل عشوائي) |

## Purpose
هذا الفصل هو المرجع الوحيد لكيفية توزيع المحتوى مكانيًا (Grid) وزمنيًا (Motion) — كل تخطيط أو حركة لاحقة (Chapter 8+) تشير له ولا تكرره.

---

## ADR-0008: Grid System Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision (مبني على PR-006) |
| **Context** | النظام يخدم طبقتي تجربة مختلفتين (Chapter 0 ADR-0001) بأعباء محتوى مختلفة جذريًا (Hero بصري مقابل Data Grid كثيف) |
| **Decision** | شبكة 12 عمودًا موحّدة عبر النظام كله، بعدد أعمدة فعّال يتغيّر حسب Breakpoint (4/8/12)، بدل شبكتين منفصلتين للطبقتين |
| **Alternatives Considered** | شبكة منفصلة لكل طبقة تجربة — رُفضت لأنها تكسر PR-009 (Consistency Through Tokens) وتضاعف تعقيد Chapter 21 (Tailwind Mapping) |
| **Why This Decision** | 12 عمودًا هو المعيار الأكثر مرونة رياضيًا (يقبل القسمة على 2، 3، 4، 6) ويكفي لأعقد Data Grid في لوحة التحكم وأبسط Hero في الموقع العام على حدٍ سواء |
| **Risks** | شبكة موحّدة قد تُغري بتصميم متطابق للطبقتين رغم اختلاف الجمهور. Mitigation: §5.4 يوثّق قواعد استخدام مختلفة صراحة لكل طبقة فوق نفس الشبكة |
| **Consequences** | كل توكن `DT-GRID-*` وChapter 20 (Templates) يلتزمان بـ12 عمودًا كحد أقصى بلا استثناء |

## ADR-0009: Motion System Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Product Decision (مبني على PR-005 وPR-002) |
| **Context** | الحركة مطلوبة كجزء من الهوية (Chapter 0) لكن يجب ألا تضر Core Web Vitals (Chapter 0 §Design Goals) |
| **Decision** | نظام حركة مبني على خاصيتي CSS فقط: `transform` و`opacity` (GPU-accelerated حصريًا) لأي حركة متكررة أو تفاعلية؛ خصائص أخرى (`width`, `top`, `margin`) **MUST NOT** تُحرَّك مباشرة |
| **Alternatives Considered** | استخدام مكتبات حركة ثقيلة (مثل GSAP الكاملة) لكل تفاعل — رُفض لتكلفته على Bundle Size (PR-002)؛ يُسمح بها فقط لحركات Hero معقدة نادرة ومُحمَّلة بـLazy Loading |
| **Why This Decision** | `transform`/`opacity` هما الخاصيتان الوحيدتان اللتان لا تُجبران المتصفح على إعادة حساب التخطيط (Layout/Reflow) — يضمن 60fps مستقر |
| **Risks** | فريق تصميم غير ملتزم قد يطلب حركة على خصائص أخرى (`height` مثلاً) لأنها "أسهل". Mitigation: §5.11 Anti-Patterns يوثّح البديل الصحيح (`scaleY` بدل `height`) |
| **Consequences** | كل Component (Chapter 8) وMotion Token (Chapter 3 §3.4) يلتزمان بهذا القيد بلا استثناء |

---

## 5.1 Grid Philosophy
الشبكة أداة انضباط لا زخرفة — أي عنصر خارج خطوط الشبكة **MUST** يكون قرارًا واعيًا موثّقًا (مثال: صورة Hero بملء العرض)، لا إهمالاً.

## 5.2 Breakpoint System

| Breakpoint | العرض | الأعمدة الفعّالة | Gutter | Margin | DT Token |
|---|---|---|---|---|---|
| `xs` | ≤639px | 4 | 16px | 16px | `DT-BREAKPOINT-XS` |
| `sm` | 640–767px | 4 | 16px | 24px | `DT-BREAKPOINT-SM` |
| `md` | 768–1023px | 8 | 24px | 32px | `DT-BREAKPOINT-MD` |
| `lg` | 1024–1279px | 12 | 24px | 48px | `DT-BREAKPOINT-LG` |
| `xl` | 1280–1535px | 12 | 32px | 64px | `DT-BREAKPOINT-XL` |
| `2xl` | ≥1536px | 12 | 32px | Auto (Container محدود) | `DT-BREAKPOINT-2XL` |

## 5.3 Container & Columns
**Container الأقصى:** 1440px للموقع العام (Public Experience) — يمنع تمدد النص لعرض غير مقروء على شاشات كبيرة جدًا. **Fluid (100%)** للوحة التحكم مع Sidebar ثابت (Operational Experience) — يستغل المساحة الكاملة لعرض بيانات كثيفة (PR-006).

## 5.4 Grid Usage Rules (حسب طبقة التجربة)

| السياق | القاعدة |
|---|---|
| Public Experience (Hero، صفحات تحريرية) | Container محدود 1440px، تركيز على القراءة المريحة، أعمدة أقل استخدامًا فعليًا (2-3 أعمدة محتوى داخل الـ12) |
| Operational Experience (Dashboard، Data Grid) | Fluid Width كامل، استغلال أقصى عدد أعمدة ممكن لعرض بيانات متعددة جنبًا لجنب |

## 5.5 Motion Philosophy
مرتبطة مباشرة بـPR-005 (Chapter 2): كل حركة **MUST** تشرح تغيير حالة. راجع Chapter 2 §Conflict Resolution Framework — الحركة تخسر أول أي تعارض مع الوضوح أو الأداء.

## 5.6 Motion Tokens Mapping

```
DT-MOTION-DURATION-BASE (220ms) + DT-MOTION-EASING-STANDARD
    ↓
motion.transition.default (Semantic Token — Chapter 7)
    ↓
Modal Component Enter/Exit Animation (Chapter 8)
```

| Token | القيمة | الاستخدام |
|---|---|---|
| `DT-MOTION-DURATION-INSTANT` | 100ms | Hover بسيط |
| `DT-MOTION-DURATION-FAST` | 150ms | Focus، Toggle |
| `DT-MOTION-DURATION-BASE` | 220ms | فتح/إغلاق Modal، Drawer |
| `DT-MOTION-DURATION-SLOW` | 320ms | انتقال صفحة كامل |
| `DT-MOTION-DURATION-SLOWER` | 480ms | حركات Hero الاحتفالية فقط |
| `DT-MOTION-EASING-STANDARD` | `cubic-bezier(0.4,0,0.2,1)` | الحالة الافتراضية لكل حركة |
| `DT-MOTION-EASING-DECELERATE` | `cubic-bezier(0,0,0.2,1)` | عناصر داخلة (Enter) |
| `DT-MOTION-EASING-ACCELERATE` | `cubic-bezier(0.4,0,1,1)` | عناصر خارجة (Exit) |
| `DT-MOTION-EASING-SPRING` | `cubic-bezier(0.34,1.56,0.64,1)` | لحظات احتفالية فقط (ميدالية، رقم قياسي) |

## 5.7 Motion Choreography
عند تحريك عناصر متعددة معًا (مثال: بطاقات إحصائيات تظهر عند التمرير)، **SHOULD** يُستخدم تأخير متتابع صغير (Stagger) بين 40-80ms بين كل عنصر والتالي — يخلق إحساسًا منظمًا لا فوضويًا. **MUST NOT** يتجاوز إجمالي وقت التتابع 600ms (يبطئ إدراك المستخدم للمحتوى — PR-002).

## 5.8 Reduced Motion Strategy
كل حركة **MUST** تلتف بـ:
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```
الوظيفة (ظهور/إخفاء العنصر) **MUST** تبقى تعمل فورًا بلا حركة، لا أن تُعطَّل بالكامل.

## 5.9 Performance Budget for Motion
راجع ADR-0009 — `transform`/`opacity` فقط للحركات المتكررة. أي حركة تُنتج **Layout Shift** مقاسة (Chapter 0: CLS<0.1) **MUST NOT** تُعتمد.

## 5.10 Responsive Layout Patterns
| النمط | القاعدة |
|---|---|
| Stacking | عناصر جنبًا لجنب على `lg`+ **MUST** تتكدس عموديًا على `xs`/`sm` بترتيب منطقي (الأهم أولاً) |
| Reflow | جداول معقدة (Chapter 8) **SHOULD** تتحول لبطاقات (Card List) تحت `md`، لا جدول أفقي بـScroll مخفي |
| Hero | ارتفاع Hero **MUST NOT** يتجاوز 90vh على الموبايل لتفادي إخفاء المحتوى تحته بالكامل عند أول تحميل |

## 5.10.1 Safe Area Support (PWA)
الصفحات **MUST** تحترم مناطق الأمان في الأجهزة الحديثة (Dynamic Island، Home Indicator) عبر:
```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```
يُطبَّق إلزاميًا على أي عنصر ثابت (Sticky Header/Footer، Floating Accessibility Button — Chapter 6).

## 5.10.2 Layout Layering (Z-Index Strategy)
القيم الرقمية معرَّفة في Chapter 3 (`DT-ZINDEX-*`)؛ هذا القسم يوثّق **ترتيب الاستخدام** فقط:

```
Content (z-base)
   ↓
Sticky Header (z-sticky)
   ↓
Dropdown (z-dropdown)
   ↓
Drawer (z-drawer)
   ↓
Modal Backdrop → Modal (z-modal-backdrop / z-modal)
   ↓
Popover (z-popover)
   ↓
Toast (z-toast)
   ↓
Tooltip (z-tooltip) ← أعلى طبقة دائمًا
```
**قاعدة (MUST):** لا مكوّن جديد (Chapter 8) يُنشئ قيمة z-index خاصة به خارج هذا التسلسل — يمنع مشاكل التراكب (Stacking Context Bugs) المستقبلية.

## 5.10.3 Layout QA Checklist
☐ لا يوجد Overflow أفقي غير مقصود على أي Breakpoint
☐ لا يوجد Horizontal Scroll خارج مكوّنات مصمَّمة له عمدًا (Carousel)
☐ الشبكة (§5.2) لا تنكسر عند أي عرض شاشة
☐ Hero لا يتجاوز 90vh على الموبايل (§5.10)
☐ CLS تحت 0.1 (Chapter 0)
☐ Safe Area (§5.10.1) مُطبَّقة على كل عنصر ثابت
☐ ترتيب الطبقات يتبع §5.10.2 دون قيم z-index مخصصة



**Do:** استخدم `transform: scale()` بدل تغيير `width`/`height` مباشرة · استخدم Stagger معتدل (§5.7)
**Don't / ❌ Anti-Patterns:**
- تحريك `height` مباشرة لفتح Accordion — البديل الصحيح: `transform: scaleY()` مع `transform-origin: top`
- تحريك `top`/`left` لعنصر متحرك — البديل: `transform: translate()`
- أكثر من 3 حركات متزامنة غير مرتبطة في نفس اللحظة (يشتت، يخالف PR-001)
- Grid يتجاوز 12 عمودًا في أي سياق

## 5.12 Layout & Motion Checklist
☐ هل التخطيط يلتزم بأعمدة §5.2 دون كسر؟
☐ هل كل حركة تستخدم `transform`/`opacity` فقط؟
☐ هل تم اختبار `prefers-reduced-motion`؟
☐ هل Stagger (إن وُجد) أقل من 600ms إجمالاً؟
☐ هل الجدول المعقد له بديل بطاقات تحت `md`؟

## 5.13 Testing
Visual Regression لكل Breakpoint (§5.2) · قياس FPS فعلي لأي حركة جديدة (يستهدف ≥55fps، Chapter 2 §PR-005 KPI) · فحص CLS آليًا بعد أي حركة جديدة تُضاف للإنتاج.

## Accessibility Considerations
راجع Chapter 6 للتفاصيل الكاملة؛ هنا: كل حركة تفاعلية **MUST** يكون لها بديل ثابت (Static State) يعمل بلا حركة بنفس الوظيفة الكاملة.

## AI Considerations
مستقبلاً (Chapter 16)، يمكن لـAI اقتراح تسلسل Choreography (§5.7) تلقائيًا بناءً على ترتيب أهمية المحتوى — يبقى قابلاً للمراجعة والتعديل البشري دائمًا.

## Success Metrics
- 0 حركة على خصائص غير `transform`/`opacity` في الكود (مفحوص عبر Stylelint Rule)
- Animation FPS ≥ 55 في كل اختبار
- CLS < 0.1 محافظ عليه بعد أي إضافة حركة جديدة
- 100% من الحركات تُلغى فعليًا مع `prefers-reduced-motion`

## References
Material Design Motion System · Chapter 2 (PR-002, PR-005) · Chapter 0 (Core Web Vitals Targets)

## Related Chapters
Chapter 2 (PR-002/PR-005/PR-006) · Chapter 3 (`DT-BREAKPOINT-*`, `DT-MOTION-*`) · Chapter 7 (Semantic Motion Tokens) · Chapter 8 (تطبيق فعلي) · Chapter 20 (تخطيطات الصفحات الكاملة)

---

*نهاية Chapter 5. الفصل التالي: Chapter 6 — UAE Digital Accessibility & Government Compliance.*

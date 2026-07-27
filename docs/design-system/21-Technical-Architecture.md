# Chapter 21 — Technical Architecture

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| كل الفصول 1-20 (يُنفِّذها تقنيًا) | فريق التطوير مباشرة؛ لا فصل توثيقي لاحق يعتمد عليه معماريًا |

## Scope
**يغطي:** التقنيات المحدَّدة المستخدمة لتنفيذ كل قرار سابق — الإطار الأمامي، خط أنابيب التوكنز، Tailwind، بنية المكونات، التسمية، هيكل المجلدات، ميزانيات الأداء الدقيقة.
**لا يغطي:** أي قرار تصميمي أو معماري جديد — هذا الفصل **تنفيذ** لقرارات موثَّقة بالفعل في الفصول 1-20، لا اجتهاد جديد.

## Definitions
| المصطلح | التعريف |
|---|---|
| **Monorepo** | مستودع كود واحد يحوي حزمًا متعددة (Design System، الموقع، لوحة التحكم) بإدارة تبعيات مشتركة |

## Purpose
يُثبِّت الاختيارات التقنية النهائية (Chapter 0 Discovery: Next.js + Express/Nest) كمرجع تنفيذي واحد، بدل تناثرها كإشارات عابرة عبر الفصول السابقة.

---

## ADR-0033: Technical Stack Confirmation

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision (يُثبِّت اختيار Chapter 0 Discovery) |
| **Context** | الفصول 1-20 أشارت مرارًا لتقنيات مرجعية (React، Tailwind، Radix UI، shadcn/ui، Next.js) دون تجميعها رسميًا في قرار واحد موثَّق |
| **Decision** | **Frontend:** Next.js (App Router) + React + TypeScript. **Styling:** Tailwind CSS مبني على Design Tokens (Chapter 3). **Component Primitives:** Radix UI حيثما توفّر (Chapter 8 ADR-0012)، shadcn/ui كطبقة أنماط مرجعية. **Icons:** Lucide (Chapter 8 L1). **Backend:** Express.js أو Nest.js (Chapter 0 Discovery، القرار النهائي بينهما خارج نطاق التصميم). **Token Pipeline:** Style Dictionary (Chapter 3 §3.9) |
| **Alternatives Considered** | لا بديل يُناقَش هنا — هذا تثبيت لقرار Discovery الأصلي لا مقارنة جديدة |
| **Why This Decision** | يطابق كل الإشارات التقنية المتراكمة عبر 20 فصلاً، ويوفّر مرجعًا واحدًا نهائيًا للتطوير الفعلي |
| **Risks** | تغيّر تقني مستقبلي (إصدار جديد من React/Next.js) قد يتطلب مراجعة. Mitigation: هذا الفصل وحده (لا الفصول 1-20) يُعدَّل عند أي تغيّر تقني — الفصول التصميمية تبقى محايدة تقنيًا كما صُمِّمت عمدًا (Chapter 8 ADR-0012، Chapter 8 L3 ADR-0015) |
| **Consequences** | كل قسم أدناه (21.1-21.7) ينفّذ قرارًا موثَّقًا سابقًا بمرجع صريح |

---

## 21.1 Frontend Architecture
Next.js App Router: **MUST** SSR/SSG لكل صفحة عامة (Chapter 20 §20.1) لتحقيق Core Web Vitals (Chapter 0 §Design Goals) — **MUST NOT** CSR بحت لصفحات يُتوقَّع فهرستها (Chapter 14/15). لوحة التحكم (Chapter 20 §20.2) **MAY** CSR حيث لا حاجة فهرسة.

## 21.2 Design Tokens Mapping
ينفّذ Chapter 3 §3.9 Export Pipeline حرفيًا: Figma Variables → Style Dictionary → `tokens.json` → CSS Custom Properties → `tailwind.config.js`. **MUST NOT** أي انحراف عن هذا المسار (Chapter 3 §3.10 Token Rules).

## 21.3 Tailwind Strategy
`tailwind.config.js` **MUST** يستورد كل الألوان/المسافات/الخطوط من CSS Variables المُولَّدة (§21.2) — **MUST NOT** قيم Tailwind افتراضية (`gray-500` القياسي مثلاً) تُستخدم بدل توكنز Chapter 3 المخصصة.

## 21.4 Component Structure
كل مكوّن (Chapter 8) **MUST** ملف مستقل يتبع: منطق (Behavior Layer، Chapter 8 ADR-0012) منفصل عن العرض (Presentation Layer) حيث ممكن، اختبار مصاحب (Chapter 8 Governance §G.4)، قصة Storybook (§G.7).

## 21.5 Naming Convention
| النوع | الصيغة | مثال |
|---|---|---|
| ملف مكوّن React | PascalCase | `Button.tsx` |
| CSS Class (Tailwind Utility) | kebab-case (توليد تلقائي) | `bg-brand-primary` |
| توكن (Chapter 3 §3.3) | dot-notation | `color.brand.primary` |
| معرّف وثائقي (ADR/PR/CMP/PT/DB/CT/TMP) | يطابق نظام الفصول 1-20 حرفيًا | `CMP-BUTTON-001` |

## 21.6 Folder Structure (مرجعي، Monorepo مقترح)
```
/packages
  /design-tokens      (Chapter 3 tokens.json + build output)
  /ui                 (Chapter 8 L1-L8 components)
  /content            (Chapter 9 Content Rules، i18n)
/apps
  /web                (Chapter 20 §20.1 الموقع العام)
  /dashboard          (Chapter 20 §20.2 لوحة التحكم)
/api                  (Backend، خارج نطاق التصميم التفصيلي)
```

## 21.7 Performance Guidelines (تنفيذ دقيق لـChapter 0/5)
| المقياس | الميزانية |
|---|---|
| LCP | <2.5s (Chapter 0) |
| INP | <200ms |
| CLS | <0.1 |
| Bundle Size لكل صفحة (JS) | <200KB مضغوط (هدف توجيهي، يُراجَع دوريًا) |
| صورة Hero الأولى | `priority`/`eager` (Chapter 8 L6 §M.5)، الباقي `lazy` |

---

## Do & Don't
**Do:** نفّذ أي قرار تصميمي بالضبط كما وُثِّق في فصله المصدر · راجع هذا الفصل وحده عند أي تغيّر تقني مستقبلي
**Don't:** لا تتخذ قرارًا تصميميًا جديدًا هنا (يعود لفصله المصدر) · لا تنحرف عن Tailwind Config المبني على التوكنز

## Success Metrics
- 100% من المكونات المنفَّذة تطابق توثيق Chapter 8 حرفيًا
- 0 قيمة Tailwind افتراضية مستخدمة بدل توكنز مخصصة
- ميزانيات الأداء (§21.7) محقَّقة في كل قياس CI

## References
**Normative:** Chapter 0، Chapter 3، Chapter 8 (كل المستويات)
**Implementation:** Next.js، Tailwind CSS، Radix UI، shadcn/ui، Style Dictionary Documentation

## Related Chapters
كل الفصول 1-20 (التنفيذ المباشر لها) · Chapter 22 (الحوكمة تُطبَّق على هذا التنفيذ)

---

*نهاية Chapter 21. الفصل التالي: Chapter 22 — Governance.*

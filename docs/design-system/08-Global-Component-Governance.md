# Chapter 8 — Global Component Governance
### (يُطبَّق على كل مكوّن في L1–L8 دون استثناء — مرجع واحد بدل التكرار)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Section Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 3 (§Lifecycle، §Versioning — نفس المنطق مطبَّق هنا على المكونات بدل التوكنز) · Chapter 22 (Governance العام) | كل مكوّن في L1 (رجعيًا) وL2–L8 (فور كتابتها) — بالإشارة لا التكرار |

## Purpose
بدل تكرار Versioning/Testing/Performance/Analytics داخل كل مكوّن من عشرات المكونات القادمة (L2–L8)، هذا القسم مرجع مركزي واحد. **كل قسم "Related Governance" في أي مكوّن لاحق MUST يشير لهذا القسم فقط**, لا يعيد شرحه.

---

## G.1 Component Versioning Policy
يتبع نفس منطق Chapter 3 §3.6 لكن للمكونات بدل التوكنز:

| النوع | مثال | التأثير |
|---|---|---|
| **Patch** | إصلاح خطأ بصري في `Button` دون تغيير API | لا Breaking Change |
| **Minor** | إضافة `variant` جديد لـ`Button` | Backward Compatible — المكونات القديمة تعمل كما هي |
| **Major** | حذف `variant` أو تغيير اسم Property | **Breaking Change** — يتطلب Migration Guide (§G.6) |

## G.2 Component Lifecycle
```
Experimental → Stable → Deprecated → Removed
```
مطابق تمامًا لـChapter 3 §3.5 (Proposal→Review→Approved→Deprecated→Removed) مع تسمية مكيّفة للمكونات. **Experimental**: قابل للاستخدام الداخلي فقط، API قد يتغيّر دون إشعار. **Stable**: API مُقفل، تغييره يتطلب Major Version. **Deprecated**: يعمل بتحذير، فترة سماح إصدارين (Chapter 3 نفس الجدول الزمني).

## G.3 Performance Budget (لكل مكوّن، عام)

| القيد | القيمة |
|---|---|
| أقصى عدد DOM Nodes للمكوّن الواحد | لا رقم ثابت — **SHOULD** يبقى Root Structure أدنى ما يمكن، **MUST NOT** عناصر Wrapper غير ضرورية. **تعقيد الـDOM MUST يكون متناسبًا مع مسؤولية المكوّن** (Button بسيط ≈3 عناصر، لكن Dialog/Table/Tree View/Calendar/Combobox معقدة بطبيعتها ولا تخضع لنفس السقف) |
| الصور داخل أي مكوّن (Avatar، Card، Gallery) | Lazy Loading **MUST** إلزاميًا (باستثناء أول صورة فوق الطية) |
| أي Animation داخل مكوّن | GPU-only حصريًا (`transform`/`opacity` — Chapter 5 ADR-0009) بلا استثناء |
| Bundle Size الإضافي لكل مكوّن جديد | مكونات بسيطة (Button، Badge، Icon) **SHOULD** <5KB مضغوط. مكونات معقدة بطبيعتها (Table، Calendar، Rich Text Editor) **MUST** تبرر أي حجم أكبر صراحة في توثيقها (لا سقف ثابت واحد يناسب الكل) — يُراجع في Chapter 3 §3.13 CI |

**ملاحظة:** Performance Budgets في هذا الجدول **SHOULD** تُراجع دوريًا مع نمو النظام (يتكامل مع Chapter 3 §3.15 Quarterly Audit) — لا تُعتبر قيمًا ثابتة للأبد.

## G.4 Testing Contract (لكل مكوّن، عام)

| نوع الاختبار | الأداة | إلزامي؟ |
|---|---|---|
| Unit Test | Jest / Vitest | MUST |
| Interaction Test | Storybook Play Function | MUST للمكونات التفاعلية |
| Visual Regression | Chromatic (أو مكافئ) | MUST |
| Accessibility Test | axe-core (Chapter 6 §6.10) | MUST |
| RTL Test | لقطة شاشة عربية مخصصة | MUST |

## G.5 Analytics & Telemetry Contract
كل مكوّن تفاعلي **MUST** يوفّر نقاط ربط قياسية (لا منطق تتبع داخل طبقة العرض نفسها — يحافظ على ADR-0012):
- سمات DOM: `data-component`, `data-variant`, `data-testid` **MUST** حاضرة دائمًا لأي مكوّن تفاعلي
- Callbacks موحّدة (`onInteraction` اختياري) بدل استدعاء خدمة Analytics مباشرة من داخل المكوّن — الطبقة الأعلى (Application) هي من تقرر ماذا تفعل بالحدث
- **Components MUST NOT** يعتمد على أي مزود Analytics بعينه (لا Google Analytics، لا Mixpanel، لا PostHog داخل كود المكوّن) — المكوّن **يُصدر أحداثًا (Emit Events) فقط**، ومن يستهلكها ويربطها بمزود خارجي هو طبقة التطبيق
- **Public Events MUST** تبقى مستقرة عبر إصدارات Minor — أي تغيير في اسم Event أو بنية الـPayload **يُعتبر Breaking Change** (يخضع لـ§G.1)، تمامًا مثل أي تغيير في الـAPI المرئي للمكوّن. *(الأحداث الداخلية Internal Events غير المُصدَّرة كجزء من العقد العام ليست مقيَّدة بنفس الصرامة)*

## G.6 Migration Rules
عند أي Breaking Change (§G.1)، **MUST** توثيق:
```
Deprecated:    GhostButton (مكوّن منفصل قديم)
Replacement:   <Button variant="ghost" />
Removal:       v3.0.0
```
يتبع نفس جدول Chapter 3 §Token Deprecation Policy زمنيًا (إصداران Deprecated، إصدار تحذير، ثم Removal).

## G.7 Storybook Requirements
كل مكوّن **SHOULD** يحمل معرّف Storybook بصيغة `{component}/{variant}` (مثال: `button/primary`, `button/loading`) — Chapter 8 L1 §Design↔Code Mapping.

## G.8 Documentation Requirements
كل مكوّن جديد (L2–L8) **MUST** يلتزم بنفس القالب الـ14 قسمًا (Chapter 8 مقدمة) + **MUST** يشير لهذا القسم (G.1–G.12) بدل تكرار أي بند منه.

## G.9 State Management Contract
كل مكوّن تفاعلي **SHOULD** يدعم كلا النمطين حيثما كان منطقيًا:
- **Controlled Mode:** الحالة (`value`, `checked`, `open`, `selected`) تُدار من الأب
- **Uncontrolled Mode:** الحالة داخلية (`defaultValue`, `defaultChecked`) للاستخدام السريع

**قاعدة (MUST):** أي Prop مُتحكَّم به (`value`, `checked`, `open`, `selected`) **MUST** يُرافقه Callback مقابل دائمًا (`onChange`, `onCheckedChange`, `onOpenChange`) — لا Prop تحكم بلا Callback إعلام، يمنع اختلاف الـAPI بين المكونات. *(مكونات لا تعرض حالة قابلة للتغيير — مثل Divider أو Skeleton — معفاة من هذا المتطلب بطبيعتها، لا كاستثناء يُطلب تبريره)*.

## G.10 Ref Contract
كل مكوّن تفاعلي **MUST** يعرض مرجع عنصر الـDOM الأساسي عبر آلية الـRef المدعومة رسميًا في React — إلزامي بلا استثناء، يسمح بالتكامل مع مكتبات خارجية (Focus Management يدوي، قياسات، Animation Libraries). *(التنفيذ الحالي: `React.forwardRef` — Chapter 21 يوثّق التفاصيل التقنية؛ هذا القسم يبقى صالحًا حتى لو تغيّرت آلية الـRef في إصدارات React مستقبلية)*.

## G.11 Composition Contract
كل مكوّن **MUST** يعرض `children` كلما كان التركيب (Composition) ذا معنى وظيفي. **Compound Components** (مثال: `<Tabs><Tabs.List><Tabs.Trigger/></Tabs.List></Tabs>`) **SHOULD** تُفضَّل على تكديس Props عميق التداخل. كل مكوّن فردي (L2-L8) يضيف فقط قواعد التركيب الخاصة به فوق هذا العقد العام، لا يعيد شرحه.

## G.12 Accessibility Contract
كل مكوّن تفاعلي **MUST**:
- يدعم التنقل الكامل بالكيبورد
- يعرض اسمًا قابلاً للوصول (Accessible Name)
- يعرض دلالات ARIA صحيحة عند غياب البديل الدلالي HTML
- يحافظ على حلقة تركيز (Focus Indicator) مرئية دائمًا
- يدعم RTL بالكامل
- يحترم `prefers-reduced-motion`
- يستوفي متطلبات WCAG 2.2 AA المحدَّدة في Chapter 6

**قاعدة (MUST NOT):** متطلبات الوصول هنا **MUST NOT** تُستثنى أو تُتجاوز من أي تطبيق فردي لمكوّن مهما كان السبب التصميمي — هذا العقد ملزم بلا استثناءات محلية، وأي مكوّن لاحق يشير لهذا القسم بدل إعادة كتابة نفس القواعد (يوحّد Chapter 6 مع طبقة المكونات بدل بقائهما منفصلين).

**مبدأ حاسم:** عيوب الوصول (Accessibility Defects) **MUST** تُعامَل كعيوب وظيفية (Functional Defects) في المنتج — لا كتحسينات UX اختيارية قابلة للتأجيل. زر بلا Focus مرئي هو زر معطوب، بنفس درجة زر لا يستجيب للنقر.

---

## Governance Change Policy
أي تعديل على هذا القسم (G.1–G.12 أو أي ADR في Chapter 8) **MUST** يمر عبر ADR جديد أو تعديل موثَّق على ADR قائم. مؤلفو المكونات (من يكتب توثيق L2–L8) **MUST NOT** يُعدِّلوا قواعد الحوكمة هنا مباشرة أثناء توثيق مكوّن — الحوكمة تتطور فقط عبر Architecture Decision Records رسمية، لا تعديلات عرضية أثناء العمل اليومي.

---

## ADR-0013: Component Layering Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision |
| **Context** | Chapter 8 يحتوي عشرات المكونات عبر 8 مستويات (Chapter 0 Discovery: Taxonomy معتمدة)؛ يحتاج القارئ فهم *لماذا* هذا الترتيب تحديدًا قبل الغوص في التفاصيل |
| **Decision** | المستويات مرتبة حسب **اتجاه الاعتمادية (Dependency Direction)** لا السهولة أو الأولوية الإنتاجية: كل مستوى لاحق **MAY** يستهلك أي مكوّن من مستوى سابق، و**MUST NOT** يُستهلك من مستوى سابق له (اعتمادية أحادية الاتجاه فقط). **Cross-level dependencies MUST تبقى Acyclic — التبعيات الدائرية بين مستويات المكونات ممنوعة قطعيًا**. **Shared logic MUST تنتقل للأسفل، لا للأعلى أبدًا** — لو احتاج مكوّن في L7 منطقًا يحتاجه أيضًا مكوّن في L3، هذا المنطق **MUST NOT** يُنسخ في L7 ولا يُستورد منه، بل **MUST** ينتقل لمستوى أدنى (L1 أو L2) ليستهلكه كلاهما |
| **الخريطة الكاملة** | `L1 Foundation` (Button, Icon, Typography, Badge, Avatar...) → `L2 Forms` (Input, Select, Checkbox...) → `L3 Navigation` (Tabs, Breadcrumb, Pagination...) → `L4 Feedback` (Alert, Toast, Dialog, Tooltip...) → `L5 Data Display` (Card, Table, List, Accordion...) → `L6 Media/Overlay` → `L7 Enterprise/Composite` → `L8 UAEAF Domain Components` |
| **Alternatives Considered** | ترتيب حسب أولوية الإنتاج (الأكثر استخدامًا أولاً) — رُفض لأنه لا يضمن جهوزية الاعتماديات (مثال: توثيق Data Table في L1 قبل Button يعني توثيق مكوّن يعتمد على مكوّن غير موثَّق بعد) |
| **Why This Decision** | يضمن أن أي مكوّن، وقت كتابته، **كل ما يعتمد عليه موثَّق ومُستقر بالفعل** — لا Forward References غير محلولة |
| **Risks** | مكوّن L8 (Sports) قد يحتاج ميزة غير موجودة في L1-L7 — Mitigation: يُضاف كمكوّن L1-L7 جديد **بعد مراجعة Architecture Review** (لا قرار مطوّر فردي)، ثم يُستهلك في L8، لا يُبنى داخل L8 مباشرة |
| **Consequences** | ترتيب كتابة الوثيقة **MUST** يلتزم L1→L8 بلا تخطي؛ لا يجوز توثيق L5 قبل L2 حتى لو كان أسهل. لا يجوز إنشاء Shared Logic داخل مستوى أعلى إذا كان يمكن إعادة استخدامها في مستوى أدنى — أي حاجة لإعادة استخدام مشتركة عبر مستويات **MUST** تؤدي لاستخراج المكوّن/المنطق للمستوى الأدنى المناسب، لا نسخه أو استيراده عكسيًا |


## Do & Don't
**Do:** أشر لهذا القسم من أي مكوّن جديد بدل النسخ · طبّق §G.3 Performance Budget من أول تصميم · التزم بترتيب L1→L8 (ADR-0013) عند كتابة أي مستوى جديد
**Don't:** لا تكرر شرح Versioning/Testing/Analytics داخل توثيق مكوّن فردي

## Success Metrics
- 100% من مكونات L2 فصاعدًا تشير لهذا القسم بدل تكراره
- 0 مكوّن بلا `data-testid`
- 100% من المكونات التفاعلية تدعم التنقل بالكيبورد بالكامل
- 0 تبعية دائرية (Circular Dependency) بين مستويات المكونات (ADR-0013)
- 0 تكرار لبنود Governance (G.1–G.12) داخل توثيق أي مكوّن فردي في L2–L8

## References

**Normative References** *(تفرض القواعد)*: Chapter 3 (§3.5, §3.6) · Chapter 6 (Accessibility) · Chapter 22 (Governance العام)

**Implementation References** *(تشرح التنفيذ الحالي)*: React · Radix UI Primitives · shadcn/ui · Storybook

**Informative References** *(خلفية معيارية، ليست مصدرًا مباشرًا للقواعد هنا)*: WAI-ARIA Authoring Practices · WCAG 2.2 (المصدر الأصلي الذي يلخّصه Chapter 6)

## Related Chapters
كل قسم مكوّنات لاحق (L2–L8) يعتمد على هذا القسم مباشرة.

---

*هذا القسم يُختم به الإطار العام لـChapter 8 قبل الانتقال لتوثيق L2 Forms Components.*

# Chapter 23 — Checklists

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| كل الفصول 1-21 (مصدر كل بند) | فريق التطوير/المراجعة مباشرة قبل أي إصدار |

## Scope
**يغطي:** 8 قوائم مراجعة عملية جاهزة للاستخدام المباشر (UX، UI، Accessibility، SEO، Performance، Responsive، Design Review، Dev Handoff).
**لا يغطي:** أي قاعدة جديدة — كل بند هنا **استشهاد** ببند موجود بالفعل في فصله المصدر.

## Purpose
الفصول 1-22 وثّقت القواعد؛ هذا الفصل يجمعها في قوائم عملية قابلة للاستخدام مباشرة أثناء المراجعة، دون الحاجة لتصفح 22 فصلاً منفصلاً وقت الحاجة الفعلية.

---

## ADR-0035: Checklist Consolidation Exception

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Product Decision |
| **Context** | ADR-0013 (Chapter 8) يمنع تكرار القواعد عبر الفصول — لكن قائمة مراجعة عملية تحتاج كل بنودها في مكان واحد وقت الاستخدام الفعلي، لا تنقّلاً بين 22 فصلاً أثناء مراجعة عاجلة قبل إصدار |
| **Decision** | هذا الفصل وحده **استثناء موثَّق** من منع التكرار العام: **MUST** كل بند هنا يحمل استشهادًا صريحًا بمصدره (رقم الفصل والقسم) — إعادة الصياغة هنا **MUST NOT** تُعتبر تعريفًا جديدًا للقاعدة، فقط تذكيرًا عمليًا بها. عند أي تعارض بين نص هنا ونص الفصل المصدر، **المصدر هو المرجع الملزم دائمًا**، لا هذه القائمة |
| **Alternatives Considered** | الاكتفاء بروابط لكل فصل بلا نص فعلي هنا — رُفض لأنه يفقد الفصل قيمته العملية كأداة مراجعة سريعة |
| **Why This Decision** | يوازن بين الحاجة العملية (سرعة المراجعة) والانضباط المعماري (مصدر حقيقة واحد) عبر الاستشهاد الصريح |
| **Risks** | نسخة هنا قد "تتقادم" لو تغيّر الفصل المصدر ولم يُحدَّث هذا الفصل بالتوازي. Mitigation: Chapter 22 §5 Review Cadence يشمل هذا الفصل تحديدًا كأولوية مراجعة |
| **Consequences** | كل بند أدناه **MUST** مرجعه مذكورًا |

---

## 23.1 UX Checklist
☐ هل الشاشة تتبع Pattern موثَّق (Chapter 11) بدل تصميم حر؟
☐ هل أقل مستوى تصعيد تغذية راجعة كافٍ استُخدم (Chapter 8 L4 ADR-0016)؟
☐ هل فحص الصلاحية سبق ظهور المحتوى (Chapter 11 §PT-PERMISSION-001)؟
☐ هل حالة Empty/Loading/Error موثَّقة لكل عنصر بيانات (Chapter 8 L5 §DD.10)؟

## 23.2 UI Checklist
☐ هل كل قيمة بصرية من توكن معرَّف، لا قيمة حرة (Chapter 3 §3.10)؟
☐ هل الكثافة (Comfortable/Compact) مطابقة لطبقة التجربة الصحيحة (Chapter 8 L1 §Visual Density)؟
☐ هل زر Danger محجوز حصريًا للحذف/الإلغاء (Chapter 1 ADR-0004)؟
☐ هل الشعار مستخدَم بصيغته الصحيحة حسب الخلفية (Chapter 1 §1.5)؟

## 23.3 Accessibility Checklist (مرجعي من Chapter 6 §6.12)
☐ تباين كل نص ≥4.5:1 (أو ≥3:1 للنص الكبير)؟
☐ كل وظيفة تعمل بالكيبورد وحده؟
☐ Focus Trap يعمل في كل Modal/Drawer؟
☐ كل صورة محتوى لها Alt Text وصفي؟
☐ تم اختبار الصفحة فعليًا بقارئ شاشة واحد على الأقل؟

## 23.4 SEO Checklist (مرجعي من Chapter 14/15)
☐ Structured Data مطابقة تمامًا للمحتوى المرئي (Chapter 14 §4، Chapter 15 §3)؟
☐ Metadata كاملة (Chapter 13 §12)؟
☐ الصفحة تبدأ بحقيقة جوهرية واضحة (Chapter 15 §1)؟
☐ hreflang صحيح للنسختين اللغويتين (Chapter 14 §10)؟

## 23.5 Performance Checklist (مرجعي من Chapter 21 §21.7)
☐ LCP < 2.5s، INP < 200ms، CLS < 0.1؟
☐ Lazy Loading مطبَّق لكل وسائط تحت الطية (Chapter 8 L6 §M.5)؟
☐ Virtualization مطبَّقة للجداول الكبيرة (Chapter 8 L5 §DD.12)؟

## 23.6 Responsive Checklist (مرجعي من Chapter 5 §5.10.3)
☐ لا Overflow أفقي غير مقصود على أي Breakpoint؟
☐ الشبكة لا تنكسر عند أي عرض شاشة؟
☐ أهداف اللمس ≥44px على الشاشات الصغيرة؟
☐ Safe Area مطبَّقة على العناصر الثابتة؟

## 23.7 Design Review Checklist
☐ هل التصميم يطابق المكوّن الموثَّق في Chapter 8 حرفيًا (لا انحراف غير موثَّق)؟
☐ هل أي مكوّن/نمط/محتوى جديد مرّ بـArchitecture Review (Chapter 8 ADR-0013)؟
☐ هل صفر حالات Logo Misuse (Chapter 1 §1.4)؟

## 23.8 Development Handoff Checklist
☐ هل كل توكن مستهلك من Semantic Layer لا Primitive مباشرة (Chapter 7 §7.7)؟
☐ هل المكوّن يحمل Storybook ID مطابق (Chapter 8 §G.7)؟
☐ هل `data-testid`/`data-component` موجودان (Chapter 8 §G.5)؟
☐ هل التوثيق (Component API Contract) مكتمل قبل التسليم (Chapter 8 L1 §Button نموذجًا)؟

---

## Do & Don't
**Do:** ارجع للفصل المصدر عند أي شك في تفسير بند هنا (ADR-0035) · استخدم هذه القوائم قبل كل إصدار
**Don't:** لا تعتبر نص هذا الفصل تعريفًا نهائيًا للقاعدة عند التعارض مع المصدر

## Success Metrics
- 100% من البنود هنا تحمل استشهادًا صريحًا بمصدرها
- استخدام فعلي لكل قائمة قبل كل إصدار (Chapter 22 §5 Review Cadence)

## References
**Normative:** كل الفصول 1-21 (المصدر الفعلي لكل بند)

## Related Chapters
كل الفصول 1-21

---

*نهاية Chapter 23. الفصل التالي: Chapter 24 — Known Constraints.*

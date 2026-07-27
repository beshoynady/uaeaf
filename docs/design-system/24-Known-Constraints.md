# Chapter 24 — Known Constraints

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| كل الفصول 1-23 (مصدر كل قيد موثَّق هنا) | Chapter 25 (Future Roadmap يبني على هذه القيود) |

## Scope
**يغطي:** حدود النظام الحالية بصراحة — دعم المتصفحات، مخاطر أطراف ثالثة، ترخيص الخطوط، قيود الأداء، حدود AI، وأسئلة عمل لا تزال مفتوحة من Discovery.
**لا يغطي:** حلولاً لهذه القيود (→ Chapter 25 Future Roadmap لو كانت خطة مستقبلية موثَّقة).

## Purpose
أي مرجع Enterprise حقيقي **MUST** يوثّق حدوده بنفس صرامة توثيقه لقدراته — هذا الفصل يمنع أي قارئ مستقبلي من افتراض اكتمال لا وجود له فعليًا.

---

## 1. Browser Support
**MUST** يُدعم رسميًا: آخر إصدارين من Chrome، Safari، Edge، Firefox. **MAY** يعمل جزئيًا على متصفحات أقدم بلا ضمان كامل (خصوصًا `aspect-ratio` CSS الحديث المستخدَم في Chapter 8 L6 §M.2، و`:has()` إن استُخدِم مستقبلاً). Internet Explorer **MUST NOT** مدعومًا (خارج نطاق أي التزام).

## 2. Third-Party Risks (أسئلة عمل مفتوحة من Discovery)
| السؤال | الحالة |
|---|---|
| مصدر بيانات النتائج (مزود توقيت خارجي أم إدخال يدوي؟) | **مفتوح** — Chapter 8 L8 ADR-0020 صُمِّم ليعمل بأي إجابة دون تعديل مكوّن العرض |
| نظام رقم القيد الاتحادي | **مفتوح** — لم يُحسَم بعد من الاتحاد |
| منهجية حساب "أفضل نادٍ/رياضي للموسم" | **مفتوح** — قرار عمل، خارج نطاق التصميم (Chapter 8 L8 §SP.5) |

## 3. Font Licensing
الخط الرسمي المطبوع (The Sans Arabic، Chapter 1 §1.6) **MUST NOT** يُستخدَم كـWeb Font (تكلفة ترخيص مستمرة). البديل المعتمد (Alexandria + IBM Plex Sans، Chapter 4 ADR-0007) مجاني (SIL OFL) لكن **غير الخط الرسمي الحرفي للاتحاد** — قرار واعٍ موثَّق، لا نسيان.

## 4. Performance Constraints
Virtualization (Chapter 8 L5 §DD.12) تحسّن الأداء لكنها تُضيف تعقيدًا تقنيًا حقيقيًا (فقدان `Ctrl+F` المتصفح الطبيعي داخل الجدول، مثال معروف لكل أنظمة الـVirtualization) — قيد معماري مقبول، لا خطأ.

## 5. AI Limitations
- **Hallucination:** نماذج AI الخارجية (محركات بحث AI، Chapter 15) قد "تهلوس" رغم كل جهد Chapter 15 — **خارج السيطرة الكاملة للمنصة**
- **AI Translation:** أي ترجمة AI (Chapter 16 §2 الأولوية 7) بمراجعة بشرية إلزامية — ليست بديلاً فوريًا موثوقًا 100% بلا مراجعة
- **Confidence Indicator:** مكوّن موثَّق مرجعيًا (Chapter 16 §4) لكن **غير مُنفَّذ فعليًا بعد** — Backlog

## 6. Consolidated Backlog Reference (v1.1)
كل الفصول 3-14 تقريبًا سجَّلت عناصر Backlog v1.1 فردية أثناء المراجعات (تحسينات لم تُدرَج في v1.0 عمدًا) — أبرزها: Font Weight Policy التفصيلية (Chapter 4)، Input Mask وMobile Keyboard Hints (Chapter 8 L2)، Accessible Components Matrix وColor Blind Validation (Chapter 8 L1/L6 مرتبط بـChapter 6)، Multi-window Sync وAI Navigation (Chapter 8 L3)، Select/Combobox Empty States التفصيلية (Chapter 8 L2). **MUST** أي عمل تنفيذي فعلي يراجع الفصل المصدر مباشرة لتفاصيل كل بند Backlog، لا يُعاد سردها هنا بالكامل (يطابق ADR-0013 — هذا الفصل يُشير فقط، لا يكرر).

## 7. Scope Boundaries (تذكير صريح)
هذه الوثيقة **MUST NOT** تُفهَم كبديل لـ: عقد قانوني مع الاتحاد، مواصفة Backend كاملة (Chapter 21 يوثّق الواجهة الأمامية بعمق أكبر من الخلفية)، أو خطة مشروع بجداول زمنية (خارج نطاق Design System تمامًا).

---

## Do & Don't
**Do:** راجع هذا الفصل قبل أي التزام لجهة خارجية حول "قدرات النظام الكاملة" · حدِّث هذا الفصل عند حسم أي سؤال مفتوح (§2)
**Don't:** لا تفترض حل تلقائي لأي قيد هنا دون توثيق قرار جديد

## Success Metrics
- 0 قيد معروف غير موثَّق هنا
- كل سؤال Discovery مفتوح (§2) محدَّث الحالة عند أي تطور فعلي

## References
**Normative:** كل الفصول 1-23

## Related Chapters
Chapter 25 (Future Roadmap يبني فوق هذه القيود)

---

*نهاية Chapter 24. الفصل التالي: Chapter 25 — Future Roadmap.*

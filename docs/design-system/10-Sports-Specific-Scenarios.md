# Chapter 10 — Sports-Specific Scenarios & Discipline Specifications

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 8 L8 (المكونات الأساسية — هذا الفصل لا يُنشئ مكوّنًا جديدًا) · Chapter 9 (Content Terminology §CR-8.1) | Chapter 12 (Dashboard) · Chapter 20 (Page Templates) |

## Scope
**يغطي:** سيناريوهات وحالات حدّية خاصة بطبيعة رياضة ألعاب القوى تحديدًا — صيغ نتائج مختلفة حسب نوع اللعبة الفرعية، سيناريوهات النتائج الحية، عرض حفل التتويج، ملف اللاعب متعدد الألعاب.
**لا يغطي:** أي مكوّن UI جديد (كل المكونات في Chapter 8 L8 — هذا الفصل **MUST NOT** يُعرِّف مكوّنًا موازيًا).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Discipline Group** | تصنيف اللعبة الفرعية حسب طبيعة قياس نتيجتها (زمن/مسافة/ارتفاع/نقاط) |
| **Field Event** | فعالية قياسها مسافة أو ارتفاع (قفز، رمي) بعكس فعاليات الجري (زمن) |

## Purpose
Chapter 8 L8 عرّف **المكونات**؛ هذا الفصل يعرّف **كيف تتصرف هذه المكونات في سيناريوهات ألعاب القوى الفعلية** المتنوعة — لا مكوّن جديد، بل تهيئة (Configuration) وسيناريوهات لما هو موجود بالفعل.

---

## 10.1 Discipline Groups & Result Format Mapping

كل فعالية (Chapter 8 L8 §SP.2) **MUST** تُصنَّف ضمن مجموعة تحدد صيغة عرض `Result.value/unit` (Chapter 8 L8 §ADR-0020):

| Discipline Group | أمثلة | صيغة القيمة | اتجاه الأفضلية |
|---|---|---|---|
| **Track (Time-based)** | 100م، 400م، 1500م | `00:12.45` (Chapter 9 §CR-1.10) | الأقل زمنًا يفوز |
| **Field — Distance** | القفز الطويل، رمي الرمح | `6.20 م` | الأكبر مسافة يفوز |
| **Field — Height** | القفز العالي، القفز بالزانة | `2.15 م` | الأعلى ارتفاعًا يفوز |
| **Combined Events** | السباعي، العشاري | نقاط إجمالية (`Score`، Chapter 8 L8 §CMP-RANKINGCARD-001) | الأعلى نقاطًا يفوز |
| **Race Walking** | المشي 20كم | `01:32:45` (ساعات:دقائق:ثوانٍ) | الأقل زمنًا يفوز |

**قاعدة (MUST):** Chapter 8 L8 §CMP-RESULTSTABLE-001 **MUST** يستهلك `sortDirection` مشتقًا من Discipline Group (تصاعدي للزمن، تنازلي للمسافة/النقاط) — لا فرز ثابت واحد لكل الجداول.

## 10.2 Live Scoring Scenario
أثناء بطولة جارية فعليًا، Chapter 8 L8 §CMP-EVENTSCHEDULE-001 وCMP-RESULTSTABLE-001 يعملان معًا وفق Chapter 8 L5 §DD.10 (Live-Updating):
```
Event: Upcoming → In Progress → Results Pending Verification (Chapter 8 L8 §SP.6) → Results Verified/Official
```
**MUST** تمييز بصري واضح بين نتيجة "غير رسمية" (لحظية، قد تتغيّر) و"رسمية معتمدة" (بعد §Chapter 8 L7 EC.7 Approval Workflow) — لا عرضهما بنفس الوزن البصري.

## 10.3 Medal Ceremony Display
عند اكتمال فعالية وتحديد الميداليات الثلاث: Chapter 8 L8 §CMP-MEDALBADGE-001 **SHOULD** عرض احتفالي مجمَّع (منصة تتويج مصغّرة: ذهبي في المنتصف، فضي يمين، برونزي يسار أو الترتيب البصري المعتاد) بدل قائمة نصية بسيطة — يستهلك حركة `DT-MOTION-EASING-SPRING` المحجوزة (Chapter 8 L8 §SP.7) مرة واحدة عند أول عرض.

## 10.4 Multi-Discipline Athlete Profile
لاعب يمارس أكثر من لعبة فرعية (Chapter 0 Discovery — سؤال مفتوح "هل يمكن للرياضي ممارسة أكثر من لعبة؟"): Chapter 8 L8 §CMP-ATHLETECARD-001 وملف اللاعب الكامل (Chapter 20 لاحقًا) **MUST** يدعم عرض نتائج مصنَّفة حسب Discipline Group (§10.1) منفصلة — لا قائمة نتائج مختلطة الوحدات بلا تصنيف (زمن ومسافة في نفس الجدول بلا تمييز يربك المقارنة).

## 10.5 Team/Relay Result Edge Case
سباقات التتابع (Relay) نتيجتها **جماعية** (نادٍ/فريق) لا فردية بحتة: `Result.athlete` (Chapter 8 L8 §CMP-RESULTSTABLE-001) **MAY** يُستبدَل بـ`Result.team: AthleteRef[]` لهذه الحالة تحديدًا — **MUST** توثيق هذا الاستثناء صراحة أينما استُهلِك، لا كسر الشكل القياسي بصمت.

## 10.6 Disqualification & Non-Result States
نتيجة قد لا تكون رقمًا صالحًا: `DNS` (لم يبدأ) · `DNF` (لم يكمل) · `DQ` (استبعاد). **MUST** Chapter 8 L8 §CMP-RESULTSTABLE-001 يعرض هذه الحالات كنص بديل واضح (Chapter 9 §CR-2.8 Null Policy مُطبَّقًا هنا بمصطلحات رياضية محدَّدة) بدل قيمة رقمية فارغة أو صفر مضلِّل.

## 10.7 Attempt-based Events
فعاليات الرمي والقفز (§10.1 Field Events) نتيجتها **ليست رقمًا نهائيًا واحدًا مباشرة** بل سلسلة محاولات:
```
Attempt 1 → Attempt 2 → Attempt 3 → (Final Attempts للمتأهلين فقط) → Best Attempt
```
**قواعد إلزامية:**
- محاولة فردية **MUST NOT** تُعامَل كسجل `Result` مستقل (§10.1) — هي عنصر فرعي داخل نتيجة اللاعب الواحدة
- **MUST** فقط `Best Attempt` هو القيمة التي تغذّي الترتيب (Chapter 8 L8 §CMP-RANKINGCARD-001) وResultsTable الرئيسي
- **MUST** كل المحاولات تبقى قابلة للعرض (تفصيل عند التوسيع/النقر — Chapter 8 L4 §CMP-ACCORDION-001 مثال مناسب) لا تُخفى بعد تحديد الأفضل
- رموز محاولة غير ناجحة **MUST NOT** تُعامَل كـNull (§10.6) بل قيم محاولة صالحة بذاتها: `X` (محاولة باطلة/فاشلة) · `Pass` (تخطّي طوعي للمحاولة) · `NM` (لم يسجّل قياسًا في كل المحاولات — No Mark)

## 10.8 Wind Reading (قاعدة عرض لا حساب)
لفعاliات معيّنة (العدو القصير، القفز الطويل/الثلاثي): قراءة سرعة الرياح جزء أصيل من عرض النتيجة، لا بيانات إضافية اختيارية:
- **MUST** Chapter 8 L8 §CMP-RESULTSTABLE-001 يعرض قراءة الرياح ملحقة بالنتيجة حين تكون منطبقة (`10.21 (+3.1)`) — تنسيق ثابت: القيمة بين قوسين بعد النتيجة مباشرة
- **MUST NOT** ظهور Chapter 8 L8 §CMP-RECORDBADGE-001 إذا تجاوزت قراءة الرياح الحد القانوني المسموح — **هذا الفصل لا يحسب الحد القانوني نفسه** (قرار عمل/رياضي خارج نطاق التصميم)، فقط يوثّق أن شارة الرقم القياسي **MUST** تحترم علم صالح/غير صالح جاهزًا من البيانات (يطابق ADR-0020: العرض يستهلك قرارًا جاهزًا، لا يحسبه)

## 10.9 Tie Handling
تساوي لاعبين أو أكثر في نفس النتيجة بالضبط (مثال: قفزتان بارتفاع 2.20م) **MUST NOT** يُعرَض بترقيم تسلسلي عادي (1، 2، 3):
```
Rank 1 — Athlete A — 2.20
Rank 1 — Athlete B — 2.20
Rank 3 — Athlete C — 2.15   ← يتخطى الرقم 2 (Standard Competition Ranking)
```
**MUST** Chapter 8 L8 §CMP-RESULTSTABLE-001 وCMP-RANKINGCARD-001 كلاهما يدعمان قيمة `rank` مكرَّرة لأكثر من صف، مع تخطّي الرقم التالي تلقائيًا في العرض — **MUST** إشارة بصرية خفيفة (لا لون فقط، Chapter 6 §6.2) توضّح وجود تعادل حين يحدث.

## 10.10 Record Category (توسيع بدل "Record" العام)
بدل تصنيف ثنائي بسيط (وطني/شخصي فقط، Chapter 8 L8 §SP.7)، `Record.category` **MUST** يكون قابلاً للتوسع من القائمة التالية (حتى لو لم تُستخدم كلها في الإصدار الأول — التصميم يحتملها دون إعادة هيكلة):
```
Personal Best · Season Best · Meeting Record · Championship Record · National Record
```
**MUST** Chapter 8 L8 §CMP-RECORDBADGE-001 يستهلك `category` كـProp لا نوعين ثابتين مكتوبين في منطق المكوّن — إضافة تصنيف جديد مستقبلاً **MUST NOT** يتطلب تعديل كود المكوّن، فقط توسيع قائمة القيم المسموحة في طبقة البيانات (يطابق Chapter 3 §Token Lifecycle بنفس الروح، مطبَّقًا هنا على تصنيفات لا توكنز بصرية).

---

## Do & Don't
**Do:** صنّف كل فعالية جديدة ضمن Discipline Group (§10.1) قبل عرض نتائجها · ميّز النتيجة غير الرسمية عن المعتمدة بصريًا دائمًا
**Don't:** لا تعرض DNS/DNF/DQ كخانة فارغة أو صفر · لا تخلط وحدات قياس مختلفة في نفس عمود جدول بلا تصنيف

## Success Metrics
- 100% من الفعاليات مصنَّفة ضمن Discipline Group صراحة
- 0 نتيجة DNS/DNF/DQ معروضة كقيمة رقمية مضلِّلة
- 100% من النتائج غير الرسمية مميّزة بصريًا عن المعتمدة
- 100% من فعاليات الرمي/القفز تعرض كل المحاولات لا أفضل نتيجة فقط (§10.7)
- 0 شارة رقم قياسي تظهر مع رياح غير قانونية (§10.8)
- 100% من حالات التعادل تستخدم ترقيم Standard Competition Ranking لا تسلسلي (§10.9)

## References
**Normative:** Chapter 8 L8 · Chapter 9 §CR-8.1
**Informative:** World Athletics Competition Rules (مرجع مجالي عام لتصنيف الفعاليات، ليس مصدر قواعد تصميم)

## Related Chapters
Chapter 8 L8 (الأساس الكامل) · Chapter 9 (المصطلحات) · Chapter 12/20 (الاستهلاك الفعلي)

---

*نهاية Chapter 10 (§10.1-§10.10). الفصل التالي: Chapter 11 — UX Patterns.*

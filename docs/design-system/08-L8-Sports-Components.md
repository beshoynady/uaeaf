# Chapter 8 — Component Inventory
## Level 8: UAEAF Sports / Domain Components (Sports Domain Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L8 of 8 — المستوى الأخير) | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| كل المستويات L1-L7 (هذا المستوى تركيبي بالكامل — لا يُنشئ مكوّنات أساسية جديدة، فقط يركّبها لسياق رياضي) · Chapter 0 Discovery (الكيانات: مسابقات/فعاليات/أندية/رياضيين/مدربين/حكام) | Chapter 10 (سيوسّع هذا المستوى بتفاصيل إضافية) · Chapter 12 (Dashboard) · Chapter 20 (Page Templates) |

## Scope
**يغطي:** L8 كـ**Sports Domain Foundation** (نموذج العلاقات، الفئات العمرية، شارات الثقة، عرض الميداليات/التصنيف، تجريد مصدر النتائج، الأرقام القياسية، اللاعب المستقل، حساسية بيانات القاصرين، التركيب) + 12 مكوّن مجالي.
**لا يغطي:** منطق الأعمال (كيف تُحسَب نقاط "أفضل نادٍ للموسم" فعليًا — سؤال مفتوح من Discovery، قرار عمل لا قرار تصميم)، مصدر بيانات النتائج الفعلي (سؤال مفتوح من Discovery — هذا الفصل يفترض أيًا كان المصدر).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Domain Component** | مكوّن يجمع عدة مكونات أساسية (L1-L7) في تركيبة ذات معنى خاص بمجال ألعاب القوى — لا يُضيف سلوكًا جديدًا جذريًا |
| **Verified Badge** | إشارة ثقة تدل أن بيانات اللاعب/النادي معتمدة رسميًا من الاتحاد |
| **Unattached Athlete** | رياضي مسجَّل مباشرة لدى الاتحاد دون انتساب لنادٍ (Chapter 0 Discovery: `club_id` قابل لأن يكون فارغًا) |

## Purpose
هذا الفصل هو **واجهة العرض** لكل الكيانات الرياضية التي حُسمت بنيتها في مرحلة Discovery (Chapter 0) — لا يعيد فتح أي قرار بيانات مفتوح، بل يبني عرضًا متسقًا فوقه أيًا كانت الإجابة النهائية.

---

## ADR-0020: Sports Domain Data Abstraction Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision |
| **Context** | Discovery Phase (Chapter 0) ترك عدة أسئلة عمل مفتوحة: مصدر بيانات النتائج (مزود خارجي/يدوي)، منهجية حساب "أفضل نادٍ/رياضي للموسم"، نظام رقم القيد الاتحادي. مكونات L8 **MUST** تُبنى دون انتظار إجابات هذه الأسئلة |
| **Decision** | كل مكوّن L8 **MUST** يستهلك **شكل بيانات مجرّد وموحّد (Normalized Domain Shape)** بصرف النظر عن مصدرها الفعلي — مثال: `<ResultsTable results={Result[]}>` حيث `Result` بنية ثابتة سواء جاءت من إدخال يدوي أو API مزود توقيت خارجي. منطق **الحساب** (نقاط الموسم، التصنيف) **MUST NOT** يعيش داخل مكوّنات العرض — يُمرَّر كبيانات جاهزة (Props) من طبقة أعلى (Backend/Business Logic، خارج هذا الفصل تمامًا) |
| **Alternatives Considered** | تأجيل توثيق L8 لحين حسم كل الأسئلة المفتوحة من Discovery — رُفض لأنه يوقف تقدم الوثيقة دون داعٍ؛ فصل العرض عن مصدر البيانات (نمط قياسي في هندسة الواجهات) يحل المشكلة بالكامل |
| **Why This Decision** | يطابق مبدأ الفصل بين الطبقات المطبَّق في كل الوثيقة (Chapter 3 Token Layers، Chapter 8 L3 Router-agnostic، Chapter 8 L7 مستقل عن التنفيذ) |
| **Risks** | إن اختلف الشكل الفعلي لبيانات مزود التوقيت الخارجي (إذا اختير لاحقًا) عن `Result` المفترض هنا، يحتاج طبقة تحويل (Adapter) — لا تعديل على مكونات العرض. Mitigation: هذا بالضبط هو الفصل الصحيح؛ Adapter يعيش في طبقة البيانات (Chapter 21) |
| **Consequences** | كل مكوّن L8 **MUST** يوثّق شكل بياناته المتوقع (Props Shape) صراحة، لا يفترض مصدرًا محددًا |

---

## Sports Domain Foundation — الأقسام المشتركة

### SP.1 Sports Domain Definition
مكوّنات L8 **MUST** تكون تركيبية (Composite) فوق L1-L7 — أي حاجة جديدة جذريًا (تفاعل، حالة، نمط وصول) **MUST NOT** تُبتكَر هنا؛ **MUST** تُضاف أولاً للمستوى الأساسي المناسب (L1-L7) عبر Architecture Review (يطابق Chapter 8 §ADR-0013 Consequences).

### SP.2 Entity Relationship Model (مرجعي من Discovery)
```
Competition (اختياري) ←→ Event ←→ Result ←→ Athlete (Club اختياري) / Referee / Coach
                                              ↓
                                            Club
```
كل مكوّن L8 أدناه **MUST** يُعلن أي كيان من هذا النموذج يمثّله ويعرض علاقاته الفعلية، لا علاقات مفترضة.

### SP.3 Age Category System
**MUST** نظام الفئات العمرية (تحت 14/16/18/20/23/كبار — القائمة النهائية سؤال مفتوح من Discovery) **MUST NOT** يكون Hardcoded داخل أي مكوّن؛ **MUST** يُمرَّر كبيانات تصنيف (Enum/Config قابل للتعديل من لوحة التحكم مستقبلاً) — يضمن أن أي تغيير لاحق في الفئات الرسمية لا يتطلب تعديل كود العرض.

### SP.4 Verification & Trust Badges
`Verified Badge` (لاعب/نادٍ معتمد رسميًا) **MUST** تمييز بصري ثابت عبر كل مكونات L8 (يستهلك Chapter 8 L1 §CMP-BADGE-001) — **MUST NOT** تصميم مختلف لكل سياق يظهر فيه.

### SP.5 Medal & Ranking Display Contract
هذا الفصل **يعرض فقط** — منهجية الحساب (نقاط، ترتيب) قرار عمل مفتوح (Chapter 0 Discovery §9). **MUST** كل مكوّن عرض ترتيب/ميدالية يستهلك رقمًا/ترتيبًا **جاهزًا** من الخارج، ولا يحسبه داخليًا. **MUST** تمييز بصري ثابت للميداليات الثلاث (ذهبي/فضي/برونزي) عبر توكنز مخصصة لا ألوان Semantic العامة (لتفادي تعارض مع Chapter 1 ADR-0004 — الذهبي/الفضي/البرونزي ليست حالات Success/Warning/Danger، بل ألوان احتفالية مستقلة تُضاف كتوكنز Brand إضافية).

### SP.6 Results Data Source Abstraction
راجع ADR-0020 — كل مكوّن نتائج **MUST** يستهلك `Result` بشكل ثابت بصرف النظر عن المصدر (Chapter 0 Discovery §سؤال مفتوح). حالة "نتيجة معلّقة تحقق" (بانتظار اعتماد حكم/مسؤول) **MUST** تُعرض بصريًا مميّزة عن نتيجة معتمدة نهائيًا (يتكامل مع Chapter 8 L7 §EC.7 Approval Workflow Contract).

### SP.7 National & Personal Records
سجل تحقيق رقم قياسي جديد (وطني/شخصي) **MUST** إشارة احتفالية مميّزة (Chapter 5 §Motion — حركة `DT-MOTION-EASING-SPRING` المحجوزة لهذه اللحظات تحديدًا، Chapter 3 §3.4) — **MUST NOT** استخدامها لأي حدث عادي (يحافظ على قيمتها الخاصة، PR-001 Clarity).

### SP.8 Unattached Athlete Display Rules
لاعب بلا نادٍ (`club_id` فارغ، Chapter 0 Discovery) **MUST** يُعرض بوضوح كـ"منتسب مباشرة للاتحاد" (نص صريح) — **MUST NOT** حقل نادٍ فارغ بصمت يبدو كخطأ بيانات ناقصة.

### SP.9 Bilingual Sports Terminology
أسماء الفعاليات/الألعاب الفرعية (400م، القفز الطويل) **MUST** تُعرض بصيغة اللغة النشطة دائمًا (Chapter 4) — **MUST NOT** أسماء لعبة فرعية Hardcoded بلغة واحدة داخل أي مكوّن.

### SP.10 Data Sensitivity for Minors (يستهلك Chapter 0 Discovery §PDPL)
أي مكوّن L8 يعرض بيانات/صورة لاعب **MUST** يحترم حالة الموافقة المسجَّلة لبيانات القاصرين (Chapter 17 لاحقًا) — لاعب قاصر بلا موافقة نشر مسجَّلة **MUST NOT** تُعرض صورته الشخصية أو بياناته الكاملة علنًا؛ **MUST** بديل (Initials Avatar، Chapter 8 L1) بدل الصورة الحقيقية في هذه الحالة تحديدًا.

### SP.11 Accessibility
جداول النتائج الرقمية **MUST** تتبع Chapter 8 L5 §DD.13 (بنية جدول دلالية) + محاذاة أرقام ثابتة (Tabular Numbers — Chapter 4 Backlog v1.1، يُطبَّق هنا كأول استخدام فعلي حرج).

### SP.12 Composition
كل مكوّن L8 **MUST** يلتزم بنمط: بيانات مجرّدة (Props) → تركيب مكونات L1-L7 → لا حالة داخلية معقدة خاصة به.

---

## Athlete & Club

## CMP-ATHLETECARD-001 — Athlete Card
**Purpose:** تمثيل مصغّر للاعب (قوائم، شبكات نتائج بحث). **Anatomy:** يبني فوق Chapter 8 L1 §Avatar (+SP.10 قاعدة القاصرين) + §Badge (SP.4 Verified) + Chapter 8 L5 §CMP-CARD-001. **Data Shape:** `{ id, name, photo?, club?, ageCategory, verified, isMinor }`. **Related Governance:** SP.2، SP.3، SP.4، SP.8، SP.10.

## CMP-CLUBCARD-001 — Club Card
**Purpose:** تمثيل مصغّر لنادٍ (قوائم الأندية، تصنيف). **Anatomy:** يبني فوق Chapter 8 L5 §CMP-CARD-001 + شعار (§Object Fit `contain`، Chapter 8 L6 §M.9). **Data Shape:** `{ id, name, logo?, memberCount, medalCount?, verified }`. **Related Governance:** SP.4، SP.5.

## CMP-REFEREECARD-001 — Referee Card
**Purpose:** تمثيل مصغّر لحكم (قوائم الحكام، تعيين حكام لفعالية — Chapter 8 L3 §CMP-DROPDOWNMENU-001 عند الاختيار). **Anatomy:** يبني فوق Chapter 8 L1 §Avatar + §Badge (لمستوى الرخصة: محلي/عربي/آسيوي/دولي، Chapter 0 Discovery). **Data Shape:** `{ id, name, photo?, licenseLevel, discipline?, verified }` *(`discipline` — Track/Field/Combined Events/Race Walking — أدق مصطلحًا في ألعاب القوى من "specialty" العام)*. **Related Governance:** SP.2، SP.4.

## CMP-COACHCARD-001 — Coach Card
**Purpose:** تمثيل مصغّر لمدرب (قوائم المدربين، ملف نادٍ يعرض مدربيه). **Anatomy:** يبني فوق Chapter 8 L1 §Avatar + §Badge. **Data Shape:** `{ id, name, photo?, qualifications?, clubs: ClubRef[], verified }` — علاقة بأكثر من نادٍ ممكنة (Chapter 0 Discovery: سؤال مفتوح "هل مدرب مرتبط بنادٍ واحد فقط؟" — الشكل هنا يدعم الحالتين دون قرار مسبق، تطبيقًا لـADR-0020). **Related Governance:** SP.2، SP.4، ADR-0020.

---

## Competition & Event

## CMP-COMPETITIONCARD-001 — Competition Card
**Purpose:** تمثيل مصغّر لمسابقة/بطولة. **Data Shape:** `{ id, name, type, season, status }`. **Related Governance:** SP.2.

## CMP-EVENTSCHEDULE-001 — Event Schedule
**Purpose:** جدول زمني لفعاليات (يوم بطولة كامل). **Anatomy:** يبني فوق Chapter 8 L5 §CMP-TIMELINE-001 أو §CMP-TABLE-001 حسب الكثافة. **Data State Behavior:** يطبّق Chapter 8 L5 §DD.10 كاملاً (فعاليات مباشرة = Live-Updating). **Related Governance:** SP.2، SP.6، Chapter 8 L5 §DD.10.

## CMP-QUALIFICATIONSTATUS-001 — Qualification Status
**Purpose:** مؤشر تأهّل لاعب لمرحلة/بطولة لاحقة. **Anatomy:** يبني فوق Chapter 8 L1 §Badge. **Variants:** `Qualified` (Success) · `Not Qualified` (Neutral) · `Pending` (Info، يتكامل مع SP.6). **Related Governance:** SP.6.

---

## Results & Rankings

## CMP-RESULTSTABLE-001 — Results Table
**Purpose:** جدول نتائج فعالية (الترتيب، اللاعب، الزمن/المسافة، الميدالية). **Anatomy:** يبني فوق Chapter 8 L5 §CMP-DATAGRID-001 أو §CMP-TABLE-001. **Data Shape:** `{ resultId, rank, athlete: AthleteRef, value, unit, medal?, isNewRecord?, verified: boolean }` (يعكس ADR-0020 مباشرة؛ `resultId` مطابقًا لـChapter 8 L5 §DD.16 Display Identity — معرّف مستقر لا Index). **Related Governance:** SP.5 (عرض الميدالية)، SP.6 (حالة التحقق)، SP.7 (إشارة رقم قياسي)، SP.11 (Tabular Numbers)، Chapter 8 L5 §DD.16 (Display Identity — `resultId` لا Index).

## CMP-MEDALBADGE-001 — Medal Badge
**Purpose:** أيقونة/شارة ميدالية مفردة (ذهبي/فضي/برونزي) قابلة لإعادة الاستخدام عبر أي مكوّن. **Anatomy:** يبني فوق Chapter 8 L1 §Badge بتوكنز الميدالية الخاصة (SP.5). **Related Governance:** SP.5 حرفيًا.

## CMP-RECORDBADGE-001 — Record Badge
**Purpose:** شارة "رقم قياسي جديد" (وطني/شخصي) مصاحبة لنتيجة استثنائية. **Behavior:** يستهلك حركة SP.7 الاحتفالية عند أول ظهور فقط (لا تتكرر الحركة عند كل إعادة عرض للصفحة). **Related Governance:** SP.7.

## CMP-RANKINGCARD-001 — Ranking Card
**Purpose:** عرض ترتيب لاعب/نادٍ ضمن تصنيف (أفضل 10 لاعبين للموسم). **Data Shape:** `{ rank, entity: AthleteRef | ClubRef, score }` — `score` جاهز من الخارج (ADR-0020، لا حساب داخلي). **Related Governance:** SP.5، ADR-0020.

## CMP-PERFORMANCEINDICATOR-001 — Performance Indicator
**Purpose:** مؤشر بصري لتطور أداء لاعب عبر الزمن (رسم بياني مصغّر: تحسّن/تراجع الزمن عبر مواسم). **Anatomy:** رسم بياني بسيط (Sparkline) + اتجاه (▲/▼). **Related Governance:** Chapter 8 L5 §DD.10 (Data State للبيانات التاريخية)، يُعِد لتكامل AI Analytics مستقبلي (Chapter 16 — توصيات لا قرارات، Chapter 0 Discovery).

---

## Do & Don't (L8 عام)
**Do:** استهلك شكل بيانات مجرّد (ADR-0020) لكل مكوّن جديد · اعرض حالة "منتسب مباشرة للاتحاد" صراحة (SP.8)
**Don't:** لا تحسب نقاط/ترتيب داخل مكوّن عرض (تلك مسؤولية طبقة البيانات) · لا تعرض صورة لاعب قاصر بلا موافقة مسجَّلة (SP.10)

## Success Metrics
- 100% من مكونات L8 توثّق شكل بياناتها (Data Shape) صراحة
- 0 منطق حساب (نقاط/ترتيب) داخل أي مكوّن عرض (ADR-0020)
- 100% من اللاعبين المستقلين معروضين بنص صريح "منتسب مباشرة للاتحاد" (SP.8)
- 0 صورة حقيقية لقاصر بلا موافقة مسجَّلة (SP.10)
- 100% من جداول النتائج تستخدم Display Identity ثابت (`resultId`) لا Index

## References
**Normative:** Chapter 0 (Discovery — نموذج البيانات والأسئلة المفتوحة) · Chapter 8 L1-L7 (كل الاعتماديات) · Chapter 17 (لاحقًا — تفاصيل موافقات القاصرين)
**Implementation:** —
**Informative:** World Athletics Digital Platform (مرجع مجالي عام، لا مصدر قواعد)

## Related Chapters
كل فصول L1-L7 · Chapter 10 (سيوسّع هذا المستوى) · Chapter 17 (Data Privacy) · Chapter 12/20 (استهلاك فعلي في لوحة التحكم والصفحات)

---

*نهاية L8 — آخر مستوى في Chapter 8 (Sports Domain Foundation SP.1-SP.12 + 12 مكوّن). **Chapter 8 Component Inventory مكتمل بكل مستوياته الثمانية (L1-L8).** الفصل التالي في الوثيقة: Chapter 9 — Content Design System.*

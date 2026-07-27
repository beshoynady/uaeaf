# Chapter 20 — Page Templates

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| **كل الفصول 1-19 بلا استثناء** — هذا فصل التجميع النهائي | لا فصل تالٍ يعتمد على هذا (فصول 21+ تقنية/حوكمة/مرجعية) |

## Scope
**يغطي:** كل قالب صفحة فعلي في المنصة — الموقع العام (§20.1) ولوحة التحكم (§20.2) — كتركيب موثَّق من مكونات ومحتوى وأنماط الفصول السابقة بمعرّفاتها.
**لا يغطي:** أي مكوّن/نمط/محتوى جديد — هذا الفصل **تجميع بحت (Pure Assembly)**، القاعدة الأخيرة والأكثر صرامة في الوثيقة كلها.

## Definitions
| المصطلح | التعريف |
|---|---|
| **Page Template (TMP)** | تركيب موثَّق نهائي من مكونات (CMP)، أنماط (PT)، ومحتوى (CT) لصفحة كاملة قابلة للتنفيذ مباشرة |

## Purpose
هذا الفصل هو **البرهان العملي** على أن كل الفصول 1-19 كافية لبناء أي صفحة في المنصة دون قرار جديد واحد — لو احتاج قالب هنا شيئًا غير موجود في الفصول السابقة، فتلك **فجوة يجب سدّها هناك رجعيًا لا هنا**.

---

## ADR-0032: Page Template Assembly Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision (يطبّق ADR-0013/0022/0023 مجتمعة على المستوى الأعلى) |
| **Context** | 27 فصلاً بنت مكتبة كاملة (توكنز، مكونات، أنماط، محتوى، معمارية) — الفصل الأخير قبل الطبقات التقنية/الحوكمية **MUST** يثبت أن هذه المكتبة تُنتج صفحات حقيقية فعلاً، لا نظرية معزولة |
| **Decision** | كل قالب صفحة **MUST** يُوثَّق بصيغة تركيب صريح: قائمة مكونات (`CMP-*`)، أنماط (`PT-*`)، أنواع محتوى (`CT-*`)، ونوع لوحة تحكم (`DB-*`) إن انطبق — **MUST NOT** أي وصف حر لصفحة بلا ربط بمعرّفات الفصول السابقة. أي حاجة غير موجودة تُكتشف أثناء توثيق قالب هنا **MUST** تُعاد للفصل المصدر المناسب (Chapter 8-19) كـADR/Backlog جديد، **MUST NOT** تُحَل بارتجال محلي داخل هذا الفصل |
| **Alternatives Considered** | ترك تصميم كل صفحة فعلية لمرحلة التنفيذ بمعزل عن التوثيق — رُفض لأنه يفقد الوثيقة قيمتها كمرجع تنفيذي شامل |
| **Why This Decision** | يضمن أن أي مطوّر يبني صفحة جديدة يبدأ من هنا كمرجع مباشر، لا يعيد تفسير الفصول 1-19 من الصفر |
| **Risks** | اكتشاف فجوة حقيقية أثناء كتابة هذا الفصل يعني عودة لفصل "مُجمَّد" سابق. Mitigation: هذا متوقَّع ومقبول — يُعالَج عبر ADR جديد يُضاف للفصل المصدر (يطابق سياسة Baseline Freeze في كل مكان بالوثيقة) |
| **Consequences** | كل قالب أدناه مرجع تنفيذي مباشر لـChapter 21 لاحقًا |

---

## 20.1 Public Website Templates

| Template ID | الصفحة | يستهلك |
|---|---|---|
| TMP-HOME-001 | الرئيسية | Chapter 8 L1/L5/L6/L8، Chapter 5 (Hero)، Chapter 9 (المحتوى) |
| TMP-NEWSLIST-001 | قائمة الأخبار | Chapter 8 L5 §CMP-CARD-001، Chapter 11 §PT-SEARCH-001/PT-FILTER-001، Chapter 13 §CT-ARTICLE-001 |
| TMP-NEWSDETAIL-001 | تفاصيل خبر | Chapter 13 (محتوى)، Chapter 14 (SEO/Schema `NewsArticle`)، Chapter 15 (Answer-First) |
| TMP-ATHLETELIST-001 | قائمة اللاعبين | Chapter 8 L8 §CMP-ATHLETECARD-001، Chapter 11 §PT-SEARCH-001/PT-FILTER-001 |
| TMP-ATHLETEDETAIL-001 | ملف لاعب | Chapter 8 L8 (كامل)، Chapter 10 (سيناريوهات النتائج)، Chapter 13 (Hybrid Entity Boundary — نبذة تحريرية)، Chapter 17 §SP.10 (حساسية القاصرين) |
| TMP-CLUBLIST-001 / TMP-CLUBDETAIL-001 | الأندية | Chapter 8 L8 §CMP-CLUBCARD-001، نفس نمط اللاعبين |
| TMP-EVENTLIST-001 / TMP-EVENTDETAIL-001 | الفعاليات | Chapter 8 L8 §CMP-EVENTSCHEDULE-001، Chapter 10 §10.2 Live Scoring |
| TMP-RESULTS-001 | النتائج/المسابقات | Chapter 8 L8 §CMP-RESULTSTABLE-001، Chapter 10 (كل السيناريوهات: Attempt-based، Wind، Tie) |
| TMP-COACHLIST-001 / TMP-REFEREELIST-001 | المدربون/الحكام | Chapter 8 L8 §CMP-COACHCARD-001/§CMP-REFEREECARD-001 |
| TMP-GALLERY-001 | معرض الصور والفيديو | Chapter 8 L6 §CMP-GALLERY-001 |
| TMP-STATICPAGE-001 | صفحات ثابتة (عن الاتحاد، سياسة الخصوصية، اللوائح) | Chapter 13 §CT-PAGE-001 |
| TMP-CONTACT-001 | اتصل بنا | Chapter 8 L2 (نموذج تواصل)، خريطة (Chapter 0 Discovery) |

**قاعدة مشتركة (MUST):** كل قالب أعلاه **MUST** يطبّق Chapter 14 (SEO) وChapter 15 (AI Readability) كاملَين — لا استثناء لأي صفحة عامة.

## 20.2 Dashboard Templates
يستهلك Chapter 12 §Dashboard Template Registry مباشرة بمعرّفاته (`DB-*`) — هذا القسم يربطها بوحدات العمل الفعلية:

| الوحدة | Dashboard Template | يستهلك |
|---|---|---|
| إدارة اللاعبين/الأندية/الحكام/المدربين | `DB-ENTITY-001` | Chapter 11 §PT-CRUD-001، Chapter 8 L8 (Domain Cards) |
| لوحة الإحصائيات العامة | `DB-ANALYTICS-001` | Chapter 8 L5 §CMP-STATCARD-001 |
| متابعة بطولة حية | `DB-MONITORING-001` | Chapter 8 L5 §DD.10 Live-Updating، Chapter 10 §10.2 |
| محرر الأخبار (CMS) | `DB-WORKSPACE-001` | Chapter 13 (كامل)، Chapter 8 L2 (محرر Rich Text) |
| استيراد جماعي (لاعبين، نتائج) | `DB-WORKSPACE-001` (متغيّر) | Chapter 8 L7 §CMP-IMPORTWIZARD-001، Chapter 11 §PT-WIZARD-001 |

---

## Do & Don't
**Do:** ابدأ أي صفحة جديدة من قالب مطابق هنا أولاً · أعد أي فجوة مكتشفة لفصلها المصدر لا حل محلي (ADR-0032)
**Don't:** لا تُنشئ قالبًا بمكونات غير موثَّقة في الفصول 1-19 · لا تتجاوز Chapter 14/15 لأي صفحة عامة جديدة

## Success Metrics
- 100% من صفحات المنصة الفعلية مطابقة لقالب موثَّق هنا
- 0 مكوّن/نمط/محتوى يُستخدَم في أي قالب دون معرّف من فصل سابق
- 100% من القوالب العامة تطبّق Chapter 14 وChapter 15 كاملَين

## References
**Normative:** كل الفصول 1-19

## Related Chapters
كل الفصول 1-19 (الاعتماديات الكاملة) · Chapter 21 (التنفيذ التقني الفعلي لهذه القوالب)

---

*نهاية Chapter 20 — نهاية طبقة التصميم والمحتوى والتركيب الكاملة (Chapters 1-20). الفصول التالية (21-26) طبقة تقنية/حوكمية/مرجعية: Technical Architecture، Governance، Checklists، Known Constraints، Future Roadmap، Glossary.*

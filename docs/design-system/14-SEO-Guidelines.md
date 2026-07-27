# Chapter 14 — SEO Guidelines

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 8 L8 (الكيانات: لاعب/نادٍ/بطولة/فعالية/حكم/مدرب) · Chapter 13 §12 (SEO Metadata في Content Model) · Chapter 5 (Performance) | Chapter 15 (AI Readability يبني فوق نفس البنية) · Chapter 20 (Page Templates ينفّذ هذا الفصل فعليًا) |

## Scope
**يغطي:** بنية المعلومات، التسلسل الهرمي للعناوين، Metadata، البيانات المنظّمة (Schema.org)، استراتيجية الروابط، الربط الداخلي، SEO للصور/الفيديو، علاقة الأداء بالـSEO، متطلبات Google News.
**لا يغطي:** تهيئة محركات بحث الذكاء الاصطناعي تحديدًا (→ Chapter 15، فصل منفصل عمدًا).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Structured Data** | بيانات مُرمَّزة بصيغة قياسية (Schema.org/JSON-LD) تصف محتوى الصفحة لمحركات البحث بدقة تفوق النص العادي |
| **Canonical URL** | الرابط المرجعي الرسمي الوحيد لمحتوى قد يكون متاحًا بأكثر من مسار |

## Purpose
هذا الفصل يحوّل هدف Chapter 0 §Design Goals #1 (هوية رقمية عالمية) وأهداف Discovery الأصلية (Official Brand Authority، أرشفة كل كيان) إلى قواعد تقنية قابلة للتنفيذ.

---

## ADR-0025: SEO Architecture Strategy

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Product Decision (يطبّق قرارات Chapter 0 Discovery مباشرة) |
| **Context** | Chapter 0 Discovery حدّد أولويات SEO واضحة: سلطة العلامة الرسمية، أرشفة كل كيان، تأهل لـGoogle News، صفحة مستقلة لكل بطولة، محتوى دائم — بحاجة لبنية تقنية موحّدة تُطبّق هذه الأولويات عبر كل الكيانات بدل حل مخصص لكل صفحة |
| **Decision** | كل كيان قابل للأرشفة (Chapter 8 L8: لاعب/نادٍ/حكم/مدرب/بطولة/فعالية) **MUST** صفحة مستقلة بمسار نظيف قابل للقراءة (`/athletes/{slug}` لا `/page?id=123`) + Structured Data مطابقة (Schema.org) + Metadata كاملة (Chapter 13 §12). **MUST NOT** صفحة فارغة أو جدول بيانات مجرد بلا محتوى نصي وصفي (Chapter 0 Discovery — قرار صريح) |
| **Alternatives Considered** | الاعتماد على Popups/Modals لعرض تفاصيل الكيانات (كما كان في النظام القديم) — رُفض صراحة في Discovery لأنه غير قابل للأرشفة إطلاقًا |
| **Why This Decision** | صفحة مستقلة قابلة للفهرسة هي الشرط الأساسي لتحقيق هدف "سلطة العلامة الرسمية" — محتوى غير مؤرشف لا وجود له لمحركات البحث بغض النظر عن جودته |
| **Risks** | عدد كبير من الصفحات (آلاف اللاعبين عبر السنوات) قد يُنتج محتوى رقيق (Thin Content) لو لم تُدار الجودة. Mitigation: §5 Internal Linking وMinimum Content Threshold يضمنان قيمة كل صفحة |
| **Consequences** | كل قالب صفحة كيان (Chapter 20 لاحقًا) **MUST** يلتزم بهذا الفصل حرفيًا |

---

## 1. Information Architecture
تسلسل المسارات **MUST** يعكس Chapter 8 L8 §SP.2 Entity Relationship Model (`/clubs/{slug}/athletes/{slug}` منطقيًا لا مسطّح عشوائي) — يخدم Chapter 11 §PT-NAVIGATION-001 Breadcrumb تلقائيًا بنفس البنية.

## 2. Page Templates & Heading Hierarchy
كل قالب صفحة (Chapter 20) **MUST** `<h1>` واحد فقط يطابق اسم الكيان بدقة، وتسلسل هرمي صحيح `<h2>-<h6>` بلا تخطي مستوى (يطابق Chapter 8 L1 §CMP-TYPOGRAPHY-001 حرفيًا، Chapter 6 §6.4).

## 3. Metadata Standards
يستهلك Chapter 13 §12 SEO Metadata مباشرة (Meta Title، Meta Description، صورة مشاركة) — **MUST** لكل صفحة بلا استثناء، بما فيها الصفحات المُولَّدة من بيانات تشغيلية (ملف لاعب) لا مقالات CMS فقط.

## 4. Structured Data (Schema.org)
| الكيان | نوع Schema المناسب |
|---|---|
| لاعب (Chapter 8 L8) | `Person` + خصائص رياضية مخصصة |
| نادٍ | `SportsOrganization` |
| بطولة/فعالية | `SportsEvent` |
| خبر (Chapter 13) | `NewsArticle` |

**MUST** JSON-LD مضمَّن في كل صفحة كيان يطابق البيانات الفعلية المعروضة تمامًا (لا Structured Data منفصلة عن المحتوى المرئي — يخالف إرشادات محركات البحث ويُعرِّض الصفحة لعقوبة).

## 5. URL Strategy & Internal Linking
مسارات نظيفة دائمًا (§ADR-0025) + Canonical URL **MUST** لكل صفحة (يمنع محتوى مكرر عند وجود أكثر من مسار وصول). **MUST** ربط داخلي غني: صفحة لاعب **MUST** روابط لناديه، بطولاته، أخباره المرتبطة (Chapter 13 §7 Content Relationships يغذّي هذا مباشرة تلقائيًا).

## 6. Image/Video SEO
يستهلك Chapter 8 L6 Media Foundation §M.7 (Alt Text) مباشرة + `sitemap` منفصل للصور/الفيديو **SHOULD** حيثما دعمته البنية التقنية (Chapter 21).

## 7. Performance & SEO Relationship
Core Web Vitals (Chapter 0 §Design Goals، Chapter 5) **MUST** تُعامَل كمعيار SEO مباشر لا مجرد تجربة مستخدم — محرك البحث يُرتِّب الصفحات البطيئة أدنى بغض النظر عن جودة المحتوى.

## 8. Google News & Discover Eligibility
أخبار CMS (Chapter 13 §CT-ARTICLE-001) المؤهلة **MUST** طابع زمني دقيق (تاريخ نشر/تعديل)، `NewsArticle` Schema (§4)، وصورة عالية الجودة (Chapter 8 L6) — متطلبات تقنية إلزامية لأهلية الظهور في Google News (Chapter 0 Discovery: أولوية معلنة).

## 9. Evergreen Content Strategy
محتوى دائم (تاريخ الاتحاد، اللوائح، السجلات) **SHOULD** صفحات `Page` مستقلة (Chapter 13 §CT-PAGE-001) لا مدفونة داخل صفحة "عن الاتحاد" واحدة — يبني سلطة الموقع طويلة المدى (Chapter 0 Discovery).

## 10. hreflang & Bilingual SEO
كل صفحة بنسختيها (عربي/إنجليزي، Chapter 0 Discovery: لا ترجمة آلية) **MUST** علامات `hreflang` متبادلة تربط النسختين — يمنع محركات البحث من معاملتهما كمحتوى مكرر أو متنافس.

## 11. Minimum Content Threshold (يقفل Risk في ADR-0025)
لمنع "Thin Content" مع نمو عدد صفحات الكيانات (آلاف اللاعبين عبر السنوات): كل صفحة كيان **MUST** حد أدنى من المحتوى الوصفي الفعلي (لا حقول فارغة أو "—" فقط، Chapter 9 §CR-2.8) قبل نشرها/فهرستها — **SHOULD** على الأقل: نبذة نصية (Chapter 13 Hybrid Entity Boundary)، صورة واحدة، وربط داخلي واحد فعّال (§5) كحد أدنى مطلق. صفحة كيان بلا هذا الحد الأدنى **MAY** تبقى موجودة داخليًا لكن **SHOULD** `noindex` مؤقتًا حتى اكتمالها.

## 12. Redirect & URL Change Policy
عند تغيير مسار كيان (تغيير slug، دمج ناديين، حذف حساب لاعب) **MUST** إعادة توجيه 301 دائمة من المسار القديم للجديد — **MUST NOT** رابط قديم مفهرَس يتحول لصفحة 404 صامتة (يفقد قيمة SEO مكتسبة ويكسر تجربة المستخدم القادم من نتيجة بحث). يتكامل مع Chapter 8 L7 §EC.13 (Conflict Resolution) عند دمج كيانين لهما مسارات مستقلة سابقًا.

## 13. XML Sitemap Contract
**MUST** Sitemap مقسّم حسب نوع الكيان (لا ملف واحد ضخم لكل الموقع) — `sitemap-athletes.xml`, `sitemap-news.xml`, `sitemap-clubs.xml` إلخ، مُحدَّثة تلقائيًا عند أي نشر جديد (Chapter 13 §6 `Published`). **MUST NOT** صفحات بحالة غير `Published` (Chapter 13 §6) تظهر في أي Sitemap.

## 14. Duplicate Content Prevention (يوسّع §5 Canonical)
عروض متعددة لنفس البيانات (صفحة نتائج مفلترة بعدة طرق، صفحات مُرقَّمة Pagination) **MUST** Canonical تشير جميعها للنسخة غير المفلترة/الأساسية — **MUST NOT** كل تركيبة فلتر تُفهرَس كصفحة منفصلة (يُنتج آلاف الصفحات شبه المكررة تُضعف سلطة الموقع بدل تقويتها).

---

## Do & Don't
**Do:** تحقق من وجود Structured Data صحيحة قبل نشر أي قالب صفحة جديد · اربط كل كيان بكياناته المرتبطة داخليًا (§5)
**Don't:** لا تنشر صفحة كيان فارغة أو جدول بيانات مجرد (ADR-0025) · لا تنسَ `hreflang` عند إضافة نسخة لغة جديدة

## Success Metrics
- 100% من صفحات الكيانات (Chapter 8 L8) لها Structured Data مطابقة
- 0 صفحة فارغة أو جدول بيانات مجرد بلا محتوى وصفي
- 100% من أخبار CMS المؤهلة لـGoogle News تحمل NewsArticle Schema
- 100% من الصفحات ثنائية اللغة تحمل hreflang متبادل صحيح
- 0 صفحة كيان مفهرَسة دون الحد الأدنى من المحتوى (§11)
- 0 رابط قديم مفهرَس يؤدي لـ404 بدل 301 Redirect (§12)
- 0 صفحة بحالة غير Published تظهر في أي Sitemap (§13)
- 0 تضخم صفحات مفهرَسة بسبب تركيبات الفلاتر (§14)

## References
**Normative:** Chapter 0 (Discovery) · Chapter 8 L8 · Chapter 13 §12
**Implementation:** Schema.org · Google Search Central Documentation
**Informative:** Google News Publisher Guidelines

## Related Chapters
Chapter 8 L8 · Chapter 13 · Chapter 15 (AI Readability) · Chapter 20 (التنفيذ الفعلي)

---

*نهاية Chapter 14. الفصل التالي: Chapter 15 — AI Readability.*

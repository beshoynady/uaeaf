# فهرس وثائق UAEAF — التصنيف

هذا الملف **يصنّف** ولا ينقل ولا يحذف. كل وثيقة تبقى حيث هي؛ ما يضيفه الفهرس هو
جواب واحد عن كل ملف: **هل يخرج هذا إلى العميل، أم يبقى داخل الفريق، أم يزول؟**

السؤال ليس شكليًّا. تقرير مراجعة داخلي يسمّي عيوبًا بصراحة لازمة للفريق، وتسليمه
كما هو للعميل يقرأ اعترافًا بالفشل لا انضباطًا هندسيًّا. وبالمقابل، فصلٌ من نظام
التصميم حُبس داخليًّا يحرم العميل من المرجع الذي دفع ثمنه.

**الفئات الثلاث:**

| الفئة | المعنى |
|---|---|
| **تُسلَّم** | مرجع دائم للعميل: قرار معماري (ADR)، أو فصل من نظام التصميم، أو توثيق الواجهة البرمجية، أو دليل تشغيل ونشر. |
| **داخلية** | عمل الفريق: تقارير المراجعة، وخطط البناء، وقوائم الدين التقني والمتأخرات. تُشارَك عند الطلب بصياغة أخرى، لا بهذه. |
| **مؤقتة** | نقطة زمنية استُهلكت: تقرير حالة بتاريخ، أو قائمة قرارات مفتوحة أُغلقت. لا تُحذف الآن (قرار المالك) لكنها ليست مرجعًا. |

---

## تُسلَّم للعميل

### نظام التصميم — الفصول (`docs/design-system/`)

المرجع البصري الكامل. كل فصل مرجع دائم، والملف المجمِّع أوّلها.

| الملف | ماذا يحمل |
|---|---|
| `00-MASTER-INDEX.md` | فهرس الفصول ونقطة الدخول |
| `00-01-Introduction-BrandIdentity.md` | الهوية والمقدمة |
| `02-Design-Principles.md` | مبادئ التصميم |
| `03-Design-Tokens.md` | الرموز التصميمية |
| `04-Typography.md` | الطباعة (وفيه §4.15b استثناءات ADR-0041) |
| `05-Grid-Layout-Motion.md` | الشبكة والتخطيط ونقاط الكسر والحركة |
| `06-Accessibility-Government-Compliance.md` | الوصولية والامتثال الحكومي |
| `07-Semantic-Tokens-Theming.md` | الرموز الدلالية والسمات |
| `08-Global-Component-Governance.md` | حوكمة المكوّنات |
| `08-L1` … `08-L8` (٨ ملفات) | مكتبات المكوّنات: الأساس، النماذج، التنقل، التغذية الراجعة، عرض البيانات، الوسائط، المؤسسية، الرياضية |
| `09-Content-Design-System.md` | نظام المحتوى |
| `10-Sports-Specific-Scenarios.md` | السيناريوهات الرياضية |
| `11-UX-Patterns.md` | أنماط تجربة الاستخدام |
| `12-Dashboard-Patterns.md` | أنماط لوحة التحكم |
| `13-CMS-System.md` | نظام إدارة المحتوى |
| `14-SEO-Guidelines.md` | تحسين محركات البحث |
| `15-AI-Readability.md` · `16-AI-Platform-Strategy.md` | القراءة الآلية واستراتيجية المنصة |
| `17-Data-Privacy-Identity.md` | الخصوصية والهوية |
| `18-Notifications-Architecture.md` | معمارية الإشعارات |
| `19-Calendar-Localization.md` | التقويم والتوطين |
| `20-Page-Templates.md` | قوالب الصفحات |
| `21-Technical-Architecture.md` | المعمارية التقنية |
| `22-Governance.md` | الحوكمة |
| `23-Checklists.md` | قوائم الفحص |
| `24-Known-Constraints.md` | القيود المعروفة |
| `25-Future-Roadmap.md` | خارطة الطريق |
| `26-Glossary.md` | المسرد |
| `27-Brand-Visual-Language.md` | اللغة البصرية للعلامة |

### قرارات معمارية (ADRs)

`ADR-0054` … `ADR-0085` — اثنان وثلاثون ملفًا في `docs/design-system/`. كل واحد يوثّق
قرارًا واحدًا وسببه والبديل المرفوض. **هذه أهم ما يُسلَّم**: هي الجواب على «لماذا
بُني هكذا» بعد أن ينسى الجميع.

`ADR-0069-President-Message-Rich-Text-Publishing-Policy-Binding-And-Portrait-Hero.md`
— يحكم المرحلة ج كاملة.

`ADR-0070-Vision-Mission-Page-Schema-Editorial-Routes-Shared-Editor-And-Identity-Hero.md`
— صفحة الرؤية والرسالة: الـ schema، ومسارات التحرير، وأجزاء المحرر المشتركة، وhero خطوط الهوية.

**الرعاة والشركاء والعضويات** (أحدثها):
- `ADR-0085-Sponsors-Partners-Memberships-Build-The-Real-Sponsor-Exception-And-Figma-Corrections.md` — بناء الكيانات الأربعة: استثناء الراعي الحقيقي من قاعدة الـseed ومنع البيانات التجريبية من الإنتاج، والأسماء أحادية اللغة، وتصحيحات Figma، والبانر بأعلى مستوى سارٍ، و`--color-logo-plate`، وحركة الشريط، وما استقر عند البناء (D8، بعض بنوده بانتظار تأكيد المالك).
- `ADR-0077-Sponsorship-Model-Evolution-And-The-Global-Sponsor-Strip-Settings.md` — نموذج الرعاية وإعدادات الشريط العام، مقبول بتعديلات ADR-0085.

**هيرو الصفحة الرئيسية**:
- `ADR-0084-Homepage-Hero-Dashboard-Save-Is-Publish.md` — شاشة إدارة الهيرو: الحفظ نشر ودين المسودة، والشريحة الجديدة مخفية، والانحرافات عن الوصف، وما كشفه التحقق الحي وأُصلح، وفجوة تباين زر الحذف في الداكن.
- `ADR-0083-The-Hero-Rules-Shared-By-The-Site-And-The-Dashboard.md` — الوحدة المشتركة `@uaeaf/content/hero` ومكانها: القص والقلب والارتفاع وحالات شريط الحدث والحدود، للموقع والمعاينة معًا.
- `ADR-0082-Video-Slides-In-The-Homepage-Hero.md` — شرائح الفيديو، مقترح.
- `ADR-0081-The-Next-Event-Bar-And-Its-Data-Source.md` — شريط الحدث القادم: D4 الشريط اليدوي بلا رابط، وD2 مصدر البيانات مقترح.
- `ADR-0080-Homepage-Hero-Identity-In-The-Picture-English-Picture-And-Editorial-Controls.md` — الهوية في الصورة، وصورة النسخة الإنجليزية (`ltrImageMode`)، وأدوات التحكم التحريرية.
- `ADR-0079-The-Scroll-Cue-On-First-Screen-Heroes.md` — علامة التمرير على heroes الشاشة الأولى.
- `ADR-0078-The-First-Screen-Is-Header-Plus-Hero.md` — الهيدر + الهيرو = الشاشة.
- `ADR-0076-Site-Motion-Library-And-The-Hero-That-Needs-No-JavaScript.md` — مكتبة الحركة والهيرو بلا JavaScript.

وقبلها: `ADR-0075-Strategic-Plan-Page-Domain-Seams-In-Every-Mode-And-Seam-Lines-Below-A-Band.md`
— صفحة الخطة الاستراتيجية: إكمال domain `strategic-plans-page` بـschema الأقسام الثمانية وشاشة إدارة، وحدّ الأشرطة الملوّنة في التباين العالي (القاعدة ٣ في الأوضاع الثلاثة)، وخطوط الحدّ تحت الشريط الملوّن (`SeamLines placement="below"`)، والمجموعة B بالخيار (أ)، وتراتب الـhero، ونطاق القاعدة ٢.

وقبله: `ADR-0074-Closing-Vision-Mission-Pre-Handover-Images-Green-Values-Publishing-Gate-And-Rule-Calibration.md`
— إغلاق دفعة الرؤية والرسالة: صور ما قبل التسليم (سبعة من ثمانية أصول مولَّدة بدليل C2PA)، والقيم على السجل الأخضر بحافة البطاقة في الداكن، والقاعدة ٦ بوابة نشر، ومبدأ الكثافة، ومعايرة القواعد على كلمة الرئيس وأعضاء المجلس.

وقبله: `ADR-0073-Vision-Mission-Model-Page-Athletics-Photographs-Seam-Lines-And-Page-Rules.md`
— صفحة الرؤية والرسالة نموذجًا: صور ألعاب القوى، وخطوط الحدّ بين الأقسام، وقواعد الصفحة الخمس الأولى وفحوصها.

`ADR-0072-Item-Palette-Rule-Evolutions-And-The-Two-Institutional-Pages.md`
— لوحة ألوان البنود، وتطوير قواعد الخطوط والحركة، وبناء صفحتي كلمة الرئيس والرؤية والرسالة.

### حوكمة بصرية

| الملف | ملاحظة |
|---|---|
| `design-system/UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` | البروتوكول البصري العام |
| `design-system/UAEAF-VISUAL-GOVERNANCE-INDEX.md` | فهرس الحوكمة: يربط كل موضوع بالفصل/الـADR المرجعي |

### توثيق الواجهة البرمجية

| المصدر | ملاحظة |
|---|---|
| `api/openapi.json` | مولَّد من الكود (`npm run generate:openapi`)، لا يُحرَّر يدويًا. ٢٠١ مسارًا (قيس 2026-09-17). |
| Swagger UI على `/api/docs` | الواجهة التفاعلية لنفس الملف |
| `docs/design-system/ADR-0058-Machine-Readable-API-Error-Codes.md` | عقد رموز الأخطاء الذي تعتمد عليه كل الواجهات |

**ليس ملفًا في `docs/`** — مسجَّل هنا لأن تسليمًا بلا توثيق واجهة ناقص، ولأن
البحث عنه في `docs/` سيفشل.

### التشغيل والنشر

| الملف | ملاحظة |
|---|---|
| `engineering/deployment-checklist.md` | قائمة ما قبل النشر. **فيها حاليًا مانع إصدار مفتوح** (ترقية Next.js 16.3.5) — يُحسم قبل التسليم. |

---

## داخلية

### تقارير المراجعة والتدقيق

| الملف | ماذا يحمل |
|---|---|
| `audits/auth-security-audit-2026-09-05.md` | تدقيق أمن المصادقة |
| `audits/full-backend-verification-2026-09-06.md` | تحقق شامل من الطرف الخلفي |
| `audits/schema-audit-2026-09-04.md` | تدقيق المخطّطات |
| `audits/album-detail-figma-evidence-2026-09-07.md` | أدلة Figma لصفحة الألبوم |
| `audits/p0-p1-implementation-notes.md` | ملاحظات تنفيذ P0/P1 |
| `design-system/reviews/figma-vs-code-audit.md` | مطابقة Figma بالكود |
| `engineering/reviews/workflow-integrity-review.md` | مراجعة سلامة مسار الاعتماد — **تحمل نتيجة FAIL أصلية وفرضيات `it.failing` مفتوحة** |
| `product/08-Workflow-Scenario-Review.md` | مراجعة سيناريوهات المسار |
| `product/09-Integrity-Completeness-Security-Audit.md` | تدقيق التكامل والأمن |

### الموافقات الأمنية

| الملف | ملاحظة |
|---|---|
| `security/auth-authorization-architecture-approval.md` | معمارية المصادقة والتفويض المعتمدة |
| `security/content-authorization-architecture-approval.md` | تفويض المحتوى المعتمد |

داخلية لأنها تصف الدفاعات بتفصيل يفيد من يهاجمها بقدر ما يفيد من يبنيها.

### الخطط وقوائم المتأخرات

| الملف | ملاحظة |
|---|---|
| `engineering/plans/president-message-plan.md` | خطة المرحلة ج وسجلّ قراراتها |
| `engineering/plans/colour-modes-proposal.md` | اقتراح قائمتي الألوان وقياساته؛ §9.3 يسجّل ما حُسم وما سقط |
| `plans/homepage-hero-design.md` | تصميم هيرو الصفحة الرئيسية وسجل تقدمه (§٢٧ شاشة الإدارة: جدول المطابقة، والحدود المقاسة، والمراحل، وما كشفه التحقق الحي) |
| `plans/homepage-hero-dashboard-plan.md` | خطة شاشة إدارة الهيرو: المهام مرتبة بالاعتماديات، وملفاتها وواجهاتها |
| `content/hero-image-prompts.md` | توجيه صور الهيرو الفني: الأوصاف لكل تخصص، ونسختا Midjourney وGPT Image، والنص السلبي |
| `engineering/plans/strategic-plan-page-plan.md` | خطة صفحة الخطة الاستراتيجية: القرارات المعمارية، والـschema، والمهمة صفر، وتسلسل الأقسام الثمانية، والمحتوى المستخرج من Figma، وشاشة الإدارة، والاختبارات |
| `engineering/post-delivery-backlog.md` | متأخرات ما بعد التسليم — **بند واحد فقط، ولا يُضاف إليه دون قرار المالك** |
| `engineering/UAEAF-PHASE-1-BUILD-PLAN-2026-09-07.md` | خطة بناء المرحلة ١ |
| `engineering/UAEAF-FRONTEND-BUILDOUT-PLAN-2026-09-07.md` | خطة بناء الواجهة |
| `product/10-Backend-Build-Test-Plan.md` | خطة بناء واختبار الطرف الخلفي |

### أدلة عمل الفريق

| الملف | ملاحظة |
|---|---|
| `engineering/UAEAF-ENGINEERING-OPERATING-MODEL.md` | نموذج التشغيل الهندسي |
| `engineering/quality-gates.md` | بوابات الجودة (hook + CI) |
| `engineering/how-colour-system-works.md` | كيف يعمل نظام الألوان: من JSON إلى الشاشة، ومواضع الكسر، والحراس |
| `engineering/page-building-guide.md` | دليل بناء الصفحات المؤسسية القادمة: اللوحة، وبنية الصفحة، والحركة، والخطوط القطرية، والأنماط الجاهزة، وجدول القواعد المطوَّرة (ADR-0072 وADR-0074)، وقواعد الصفحة الست بفحوصها وبوابة النشر ومبدأ الكثافة (§٨، ADR-0073 وADR-0074) |
| `engineering/how-vision-mission-direction-works.md` | ما بُني في دفعة الاتجاه البصري: الحارس، و`color-scheme`، والـ hero الشريط، والخطوط بين الأقسام |
| `engineering/how-green-values-work.md` | القيم على السجل الأخضر في صفحة الرؤية والرسالة، وحافة البطاقة في الداكن: لماذا، والملفات بترتيبها، وتتبّع بطاقة حقيقية، ومواضع الكسر، والحراس |
| `content/strategic-plan-federation-questions.md` | ما نحتاجه من الاتحاد لصفحة الخطة: ربط الأهداف بالمحاور، وخطوط أساس المؤشرات وسنواتها، وفترة الخطة، وتواريخ المراحل، ووصف خطوات التنفيذ، ووثيقة الخطة، والصور الحقيقية، ومراجعة النص الإنجليزي |
| `engineering/how-strategic-plan-page-works.md` | صفحة الخطة الاستراتيجية: الـdomain وشاشة الإدارة والصفحة العامة بالبنود التسعة — لماذا، والملفات بترتيب سلسلة العمل، وتتبّع إضافة محور سابع من الداشبورد حتى الصفحة، ومواضع الكسر، والحراس (ADR-0075) |
| `engineering/how-hero-dashboard-works.md` | شاشة إدارة هيرو الصفحة الرئيسية بالبنود التسعة — لماذا، والملفات بترتيب سلسلة العمل، وتتبّع «الأدمن يحرك نقطة التركيز ويقلب ويحفظ، والزائر الإنجليزي على الموبايل يرى القص المقلوب»، ومواضع الكسر، والحراس (ADR-0083 وADR-0084) |
| `engineering/how-sponsors-work.md` | الرعاة والشركاء والعضويات والشريط بالبنود التسعة — لماذا، والملفات بترتيب سلسلة العمل من الـseed إلى الداشبورد، وتتبّع «المحرر يرفع راعيًا إلى المستوى الاستراتيجي فينتقل البانر إليه»، ومواضع الكسر، والحراس، وما يُستبدل قبل الإطلاق (ADR-0085) |
| `design-system/UAEAF-DESIGN-CRITIQUE-JURY-PROTOCOL.md` | بروتوكول تقييم المقترحات — أداة عمل داخلية لا مرجع تصميم |
| `design-system/figma-reference/README.md` | دليل لقطات Figma المرجعية |

### مواصفات المنتج والبيانات

| الملف | ملاحظة |
|---|---|
| `product/00-MASTER-SPECIFICATION.md` | المواصفة الجامعة |
| `product/01-Information-Architecture.md` | معمارية المعلومات (§12 يسجّل السلوك المتجاوب كما بُني) |
| `product/02-Homepage-Specification.md` | مواصفة الصفحة الرئيسية |
| `product/03-Content-Data-Structuring-Document.md` | هيكلة المحتوى والبيانات |
| `product/06-Database-Architecture.md` | معمارية قاعدة البيانات |
| `product/07-Mongoose-Schema-Specification.md` | مواصفة مخطّطات Mongoose |

### مواصفات الصفحات (`design-specs/`)

| الملف | ملاحظة |
|---|---|
| `page-president-message.md` | مواصفة كلمة الرئيس — **§7.5-6 تسجّل المحتوى الناقص من العميل** |
| `page-contact-us.md` · `page-policies-regulations.md` · `page-strategic-plan.md` | مواصفات الصفحات الأخرى |
| `homepage-ar-desktop-1440.md` · `homepage-en-desktop-1440.md` · `homepage-ar-mobile-390.md` | قياسات الصفحة الرئيسية |
| `mobile-nav-drawer-390.md` | درج التنقل على الجوال |
| `ASSET-MANIFEST.md` | بيان الأصول |

داخلية لأنها **تعليمات بناء** بقياسات بالبكسل وعلامات محتوى ناقص، لا مرجع تصميم.
مرجع التصميم هو فصول `design-system/`.

---

## مؤقتة

| الملف | لماذا |
|---|---|
| `audits/project-status-and-frontend-kickoff-2026-09-07.md` | تقرير حالة بتاريخ — استُهلك بانطلاق العمل الذي يصفه |
| `audits/media-gallery-open-decisions.md` | قائمة قرارات مفتوحة، أُغلقت بـADR-0054 وADR-0055 |
| `product/04-Executive-Workflow-Summary-Arabic.md` | ملخّص تنفيذي لمرحلة سابقة من الفهم |
| `product/05-Client-Requirements-Register-2026-08.md` | سجلّ متطلبات بتاريخ، حلّت محلّه المواصفات والـADRs |
| `UAEAF_VISUAL_REDESIGN_CHECKPOINT.md` (جذر المستودع) | نقطة تفتيش في إعادة التصميم البصري |

**لا يُحذف ولا يُنقل أيٌّ منها الآن** (قرار المالك). التصنيف يقول إنها ليست مرجعًا،
لا أنها بلا قيمة: بعضها يشرح كيف وصل المشروع إلى ما هو عليه.

---

## ما صُنِّف باجتهاد — واعتمده المالك

القاعدة تحسم أغلب الملفات. أربعة لم تحسمها، فصُنِّفت باجتهاد مسجَّل، **واعتمدها
المالك كما هي في 2026-09-13**. تبقى «البدائل» تحت كل بند مكتوبة، لأنها تقول متى
يُعاد النظر:

1. **`design-specs/` → داخلية.** قاعدتك تسمّي «فصول الـ design system» لا مواصفات
   الصفحات. صنّفتها داخلية لأنها تعليمات بناء بقياسات وعلامات نقص. **البديل:** لو
   أراد العميل مرجعًا لكل صفحة على حدة، تُسلَّم بعد تنظيفها من علامات `[[pending-content]]`.
2. **`security/*-approval.md` → داخلية.** موافقات معمارية، لكنها تصف الدفاعات
   بتفصيل تشغيلي. **البديل:** تُسلَّم لو طلب العميل مراجعة أمنية مستقلة.
3. **`UAEAF-DESIGN-CRITIQUE-JURY-PROTOCOL.md` → داخلية**، بينما أخواه في نفس
   المجلد (`GLOBAL-VISUAL-DESIGN-PROTOCOL`, `VISUAL-GOVERNANCE-INDEX`) تُسلَّم.
   الفرق: الأولان يحكمان التصميم، والثالث يحكم **كيف يقيّم الوكيل المقترحات** — أداة
   عمل لا مرجع منتج.
4. **`product/04` و`05` → مؤقتة لا داخلية.** كلاهما يصف فهمًا سبقته المواصفات
   والـADRs. لو كنت تعتبرهما سجلًّا تعاقديًّا مع العميل، فمكانهما «داخلية».

---

*التصنيف فقط. لم يُنقل ملف ولم يُحذف ملف.*

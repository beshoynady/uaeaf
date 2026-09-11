# مراجعة: Figma Design System مقابل الـ Design System المطبَّق في الكود

- **النوع:** مراجعة تدقيقية، قراءة فقط. لم يُعدَّل أي token أو مكوّن أو ملف في الكود، ولم يُلمس Figma.
- **الملف:** `hpO727vjwl18g3s3LTICAY` ("uaeaf-desgin"). قراءة عبر Figma MCP بتاريخ 2026-09-11.
- **الكود:** `packages/design-tokens` (المصدر في `tokens/`، والناتج في `build/`)، ومكونات `apps/web` و`apps/dashboard`، والفصول والـ ADRs في `docs/design-system/`.
- **حالة التقرير:** مكتمل. الصفحات الموجودة في الملف رُوجعت كلها، بالترتيب الذي حدده الموجز.

---

## ١. الملخص التنفيذي

### الحكم العام: انجراف كبير، لكن في اتجاه واحد

**الأساس متطابق.** كل الـ Primitives متساوية حرفيًا في الطرفين:
- 134 قيمة لون.
- 14 قيمة مسافة.
- 4 مستويات ظل.
- 6 breakpoints بأعمدتها وفواصلها وهوامشها.
- أحجام الخط الـ 14 وارتفاعات السطر (Desktop).

**فوق الأساس، الكود سبق Figma بتسعة قرارات موثقة،** وFigma لم يُحدَّث بعد أي منها لأن الملف مقفول: ADR-0051، و0052، و0059، و0061، و0062، و0063، و0065، و0066، و0067.

لذلك حُسم معظم الاختلافات لصالح الكود: الكود يطبق القرار، وFigma يحمل القيمة التي ألغاها القرار.

**حيث Figma أفضل أو يستحق الدمج:**
- مصفوفة أنواع Button وارتفاعها 44px.
- حجم Social Button (44px).
- هوية بطاقة عضو المجلس.
- مكونات المحتوى والبيانات التي لم تُبنَ بعد في الكود.

### نسبة التطابق التقريبية لكل صفحة

| الصفحة في الموجز | في الملف | التطابق | ملخص |
|---|---|---|---|
| 02 Design Tokens | موزعة على Sections الـ Foundations | Primitives **100%**. Semantic **~58%** | 15 من 26 token دلاليًا في Figma متطابقة في الأوضاع الثلاثة، والباقي متأخر عن ADR-0051/0059/0063. ~28 token في الكود غير موجودة في Figma |
| 01 Foundations | `0:1` | **~75%** | أوزان الإنجليزية مختلفة. شرائح التوثيق معطوبة. frame الـ V2 يناقض |
| 03 Core Components | `2531:1120` | **~35%** | لا Button مشترك في الكود. ثلاث مجموعات Button في Figma. الحقل بنمطين |
| 06 Content Components | `2531:1123` | **~15%** | أغلبها لم يُبنَ في الكود |
| 05 Data Components | `2531:1122` | **~10%** | لم يُبنَ في الموقع العام. مكونات الداش بورد بلا مقابل |
| 04 Navigation | `2531:1121` | **~50%** | الشكل متطابق. البنية تغيرت بـ ADR-0062 |
| 07 Patterns | **غير موجودة** | — | الأنماط في الكود فقط |
| 08 Website Patterns | `2531:1125` | **~40%** للـ Header/Footer | 10 من 12 قسمًا لم تُبنَ (الرئيسية placeholder بقرار) |
| 09 Dashboard Patterns | **غير موجودة** | **0%** | التطبيق كله في الكود فقط |
| 10 CMS Patterns | **غير موجودة** | **0%** | نفسه |
| 11 Templates | Section داخل 01 | **~20%** | wireframe رمادي مقابل قالبين مطبقين |

### أهم 5 اختلافات بالأثر

1. **الطبقة الدلالية في Figma متأخرة عن أربعة ADRs، ومضلِّلة عمليًا** (§٢.٢).
   - قيمتان من قيمه تفشلان AA: `text.muted` = **4.48:1** على sunken، و`text.link` الغامق = **4.17:1**.
   - أسماء الـ Variables (`gray-*`، و`semantic-danger`) تجعل Dev Mode يعطي متغيرات **غير موجودة** في `build/css`.
   - أي صفحة جديدة تُصمَّم أو تُنقل من Figma اليوم ستعيد عيوبًا أُصلحت.
2. **أربعة frames "V2" تعلن نفسها مرجعًا** ("SOURCE OF TRUTH" و"V2 / CANONICAL") (§٢.٤ و§٣.٢).
   - بلا أي Variable، وبخط Inter حتى للعربية.
   - تناقض ADR-0051 في ثلاثة مواضع: Destructive بالأحمر المؤسسي `#C8102E`، وfocus أخضر، وإطار خطأ بالأحمر المؤسسي.
3. **الأزرار** (§٣.٢):
   - لا مكوّن مشترك في الكود.
   - **16 زرًا في الداش بورد بارتفاع 40px** تحت إلزام الفصل 6 §6.7 (44px).
   - التوثيق نفسه متعارض: CMP-BUTTON-001 يجعل 40px الافتراضي.
   - مجموعة Figma القانونية بـ 44px لكن بلا حالة Loading، وهي إلزامية في الفصل 8 L2.
4. **الداش بورد والـ CMS بلا أي تغطية في Figma** (§٣.٨): تطبيق كامل، أكثر من 30 مكوّنًا، مرجعه الوحيد الكود.
5. **عيوب إمكانية وصول في masters تنتقل إلى كل instance** (§٤.١):
   - أيقونة Social Button غير مرئية (1.02:1).
   - إطار الحقل 1.30:1.
   - الشعار الملوّن على الأسود في الـ footer.
   - نص عربي بخطوط لا تحوي العربية في أربعة masters (Button القديم، وCard، ولوحة التنقل، وStat Card)، وفي كل frames الـ V2.

**على الكود ملاحظتا إمكانية وصول فقط:** أزرار الداش بورد 40px، وروابط التواصل في الـ footer 32px (§٤.٢).

---

## ١أ. بنية ملف Figma الفعلية مقابل الموجز

الموجز يسرد 12 صفحة. الملف فيه **8 صفحات** فقط (قائمة `get_metadata` بلا `nodeId`):

| الصفحة في الملف | المعرّف | ما تحويه |
|---|---|---|
| ✅ 00 - Homepage (APPROVED - Start Here) | `146:5` | الصفحة الرئيسية المعتمدة. خارج قائمة الموجز، ولها تقارير امتثال خاصة (CLAUDE.md §27) |
| 01 — Foundations | `0:1` | Sections: 00 Cover، 01 Brand Guidelines، 03 Color System، 04 Typography، 05 Spacing، 06 Elevation، 07 Grid System، 08 Icons، 11 Layout Templates، وframe جديد `FOUNDATION / UAEAF V2` (`2628:423`)، وأيقونات مفردة |
| 03 — Core Components | `2531:1120` | Button (نسختان)، Card، Image Placeholder، Social Button، Form (Text Field/Textarea/Select)، Category Label، Load More، Share Icon Button، وframe `UAEAF CORE COMPONENTS / V2` (`2625:339`) |
| 04 — Navigation | `2531:1121` | NavItem، وDropdown Row، ولوحتا dropdown |
| 05 — Data Components | `2531:1122` | Stat Card، وResult Row، وView Switcher، وFilter Chip، وframe `UAEAF DOMAIN COMPONENTS / V2` (`2625:484`) |
| 06 — Content Components | `2531:1123` | Board Member، وCommittee، وClub، وEditorial Story، وDocument، وAthlete Card، وframe `CONTENT COMPONENTS / V2` (`2626:223`) |
| 08 — Website Patterns | `2531:1125` | 12 قسمًا للصفحة الرئيسية × 3 breakpoints |
| 🎨 Visual Assets & Brand Files | `97:1116` | أصول بصرية. خارج قائمة الموجز |

**ما لا يوجد في الملف كصفحة:**

| اسم الصفحة في الموجز | الحالة الفعلية |
|---|---|
| 00 Cover | Section داخل 01 Foundations (`19:6`) |
| 02 Design Tokens | **غير موجود.** لا صفحة ولا Section بهذا الاسم. الـ tokens موزعة على Sections الـ Foundations (03 Color … 07 Grid) وعلى الـ Variables |
| 07 Patterns | **غير موجود.** يوجد Section باسم "07 Grid System" فقط |
| 09 Dashboard Patterns | **غير موجود** بأي شكل |
| 10 CMS Patterns | **غير موجود** بأي شكل. الـ frame `10 Component Variants` (`47:2`) نُقل إلى صفحة 03 وهو شرح لحالات Button |
| 11 Templates | Section باسم "11 Layout Templates" داخل 01 Foundations (`19:17`) |

المراجعة تتبع ترتيب الموجز على ما هو موجود فعلًا، وتسجّل الصفحات الغائبة كنتيجة بحد ذاتها.

### ١أ.١ طريقة القراءة وحدودها

- **القيم:** كل قيمة لون أو مسافة أو ظل مأخوذة من `get_variable_defs` أو `get_design_context` على الـ node نفسه، لا من الصورة.
- **مشكلة الأوضاع الثلاثة:** الـ Variables في Figma موزعة على ثلاث collections منفصلة (Light/Dark/High Contrast) بأسماء متطابقة. لذلك `get_variable_defs` يعيد قيمة واحدة لكل اسم. قيم Dark وHigh Contrast قُرئت من `get_design_context` على جدول Semantic (`38:3`)، حيث يحمل كل عمود القيمة المحلولة لوضعه.
- **الصور:** كل screenshot نُزِّل وقُرئ بالعين. الأخطاء البصرية المسجلة هنا (عناوين hex خاطئة، نص مقصوص) رُئيت في الصورة ثم تأكدت من `get_design_context`.
- **التباين:** محسوب بصيغة WCAG 2.1 بسكربت مؤقت في مجلد scratchpad خارج المستودع، وحُذف السكربت والصور بعد الانتهاء.
- **الاستخدام الفعلي:** عدد المواضع من `grep` على `apps/web/src` و`apps/dashboard/src`.

---

## ٢. جدول الـ tokens

المصدر في Figma: Sections `03 Color System` (`19:9`)، و`04 Typography` (`19:10`)، و`05 Spacing` (`19:11`)، و`06 Elevation` (`19:12`)، و`07 Grid System` (`19:13`)، وframe `FOUNDATION / UAEAF V2` (`2628:423`). المصدر في الكود: `packages/design-tokens/tokens/**`.

**اختصارات:** F = Figma، C = الكود، nw = `neutral-warm`، g = `green`.

### ٢.١ الـ Primitives

| الـ token | Figma | الكود | الحالة | الحكم | السبب | التكلفة |
|---|---|---|---|---|---|---|
| `color.green.50–900` | 10 قيم | 10 قيم | متطابق | — | القيم متساوية حرفيًا، و`.500` = `#00843D` (Pantone 348 C) | — |
| `color.red.50–900` | 10 قيم | 10 قيم | متطابق | — | `.500` = `#C8102E` (Pantone 186 C) | — |
| الرمادي الدافئ | `color/gray/{0,50,100,200…950,1000}` و`color/neutral-warm/150`. الـ code syntax: `--color-gray-*` | `color.neutral-warm.{50…950}` (12 درجة) و`color.black` و`color.white` | موثَّق (ADR-0051 §3.35.2) | الكود أفضل | القيم الـ 14 متساوية. الفرق في التسمية فقط: ADR-0051 فصل black/white عن سلّم الرمادي وسمّاه `neutral-warm`، وFigma لم يُحدَّث. **أثر عملي:** Dev Mode في Figma يعطي `var(--color-gray-500)`، وهذا المتغير غير موجود في `build/css`. أي مطوّر ينسخ منه يحصل على قيمة فارغة | S (Figma) |
| `color.gold/silver/bronze.50–900` | 30 قيمة | 30 قيمة | متطابق | — | ألوان الميداليات (TDR-002) متساوية | — |
| `color.steel-blue/teal/desert-sand.50–900` | 30 قيمة | 30 قيمة | متطابق | — | — | — |
| `color.success/error/warning/info.50–900` | 40 قيمة | 40 قيمة | متطابق | — | خمسة متغيرات في Figma بلا code syntax: `color/info/300`، و`info/500`، و`warning/500`، و`warning/700`، و`text/muted`. يظهر لها في Dev Mode مسار داخلي بدل اسم CSS | S (Figma) |
| `space.0–32` | 14 قيمة (0 إلى 128px) | 14 قيمة | متطابق | — | لا توجد Variables مسافات مربوطة في الـ Section. القيم مكتوبة كأرقام | — |
| `radius.*` | لا Section له في الـ Foundations. frame الـ V2 يعرض 4/8/12/16/24/full | 7 قيم: none/xs/sm/md/lg/xl/full | متطابق (القيم) | — | frame الـ V2 نفسه يستخدم radius غير موجود في السلّم: 20px للبطاقات و15px للشارة | — |
| `elevation.0–4` | Effect Styles `Elevation/1–4`، والـ alpha 0.06/0.08/0.10/0.12 | نفس القيم | متطابق | — | — | — |
| `breakpoint.*` و`grid.columns/gutter/margin` | جدول 6 breakpoints | 6 breakpoints | متطابق | — | تطابق كامل في الأعمدة والـ gutter والـ margin. الرسم التوضيحي تحت الجدول مكتوب عليه "24px gutter" ومرسوم بفجوة 8px | — |
| `grid.dashboard.columns` | غير موجود | 12 (ADR-0052) | في الكود فقط | الكود أفضل | قرار موثَّق | S (Figma) |
| `motion.*` و`zIndex.*` و`opacity.*` و`blur.*` و`aspect.*` و`container.*` | غير ممثلة في الـ Foundations | موجودة | في الكود فقط | الكود أفضل | موثقة في الفصل 5، وADR-0059 D7 (`motion.ascent`)، وADR-0067 (`motion.lift.scale`). Figma لا ينفذ الحركة أصلًا (البروتوكول §13) | — |

### ٢.٢ الـ Semantic tokens: الأوضاع الثلاثة

| الـ token | Figma (Light / Dark / HC) | الكود (Light / Dark / HC) | الحالة | الحكم | السبب | التكلفة |
|---|---|---|---|---|---|---|
| `color.text.primary` | `#000` / **`#FDFCFB`** / `#000` | `#000` / nw.50 `#FAFAF8` / `#000` | مختلف (Dark فقط) | الكود أفضل | `#FDFCFB` ليس درجة في أي سلّم. الفصل 3 §3.4.1 يمنع القيم المخترعة، والكود يلتزم بالسلّم. فرق التباين مهمل (18.27 مقابل 17.9 تقريبًا) | S (Figma) |
| `color.text.secondary` | nw.600 / nw.400 / `#000` | nw.700 / nw.300 / `#000` | موثَّق (ADR-0059) | الكود أفضل | الكود يعطي 8.22 على sunken، مقابل 6.05 لقيمة Figma. في Figma الوضع الغامق يجعل secondary وmuted نفس اللون (nw.400)، فيضيع الفرق بين المستويين | S (Figma) |
| `color.text.muted` | nw.500 / nw.400 / nw.700 | nw.600 / nw.400 / nw.700 | موثَّق (ADR-0059) | الكود أفضل | **قيمة Figma تفشل AA:** nw.500 على sunken الخاص بـ Figma (`#FAFAF8`) = **4.48:1**. هذا بالضبط العيب الذي أصلحه ADR-0059. قيمة الكود: 6.05 على base و5.75 على sunken. الاستخدام: 55 موضعًا | S (Figma) |
| `color.text.disabled` | nw.400 / nw.700 / nw.700 | nw.400 / nw.600 / nw.700 | موثَّق (ADR-0059) | الكود أفضل | الاثنان تحت 4.5 عمدًا، وWCAG 1.4.3 يستثني المكونات غير النشطة. الكود يُبقي disabled تحت muted بدرجة واحدة | S |
| `color.text.inverse` | `#FFF` / `#000` / `#FFF` | نفسه | متطابق | — | — | — |
| `color.text.link` | g.500 / **g.400** / `#000` | g.600 / g.300 / `#000` | موثَّق (ADR-0063) | الكود أفضل | **قيمتا Figma تفشلان:** g.500 على sunken في الكود = 4.37، وg.400 على raised الغامق = **4.17**. ADR-0063 يمنع g.400 صراحةً. الكود: 6.38 و6.07 و5.72 و6.56 | S (Figma) |
| `color.text.on-brand` | غير موجود | `#FFF` في الأوضاع الثلاثة | في الكود فقط | الكود أفضل | ADR-0059. الاستخدام: 20 موضعًا | S (Figma) |
| `color.surface.base` | **`#FDFCFB`** / nw.950 / `#FFF` | nw.50 / nw.950 / `#FFF` | موثَّق (ADR-0059) | الكود أفضل | ADR-0059 نقل base من الأبيض إلى nw.50 ليصنع درجة ارتفاع بين الصفحة والبطاقة. Figma فيه قيمة ثالثة ليست في أي سلّم. الاستخدام: 31 | S (Figma) |
| `color.surface.raised` | `#FFF` / nw.900 / `#FFF` | نفسه | متطابق | — | — | — |
| `color.surface.sunken` | nw.50 / `#000` / `#FFF` | nw.100 / `#000` / `#FFF` | موثَّق (ADR-0059) | الكود أفضل | بعد نقل base إلى nw.50 لا يمكن أن يبقى sunken عليه. الاستخدام: 24 | S (Figma) |
| `color.surface.skeleton` | nw.100 / nw.800 / nw.300 | **nw.150** / nw.800 / nw.300 | مختلف (Light فقط)، **غير موثَّق** | الكود أفضل | لا ADR يذكر هذا التغيير، ولا الفصل 7، والتعليق في الكود فارغ. لكنه نتيجة لازمة لـ ADR-0059: sunken صار nw.100، فلو بقي skeleton على nw.100 لاختفى على الأسطح الغائرة. الاستخدام: 42 موضعًا في الداش بورد. **فجوة توثيق** | S (توثيق + Figma) |
| `color.surface.overlay` | غير موجود | `#000` في الأوضاع الثلاثة | في الكود فقط | الكود أفضل | يُستخدم مع `opacity.overlay` | S |
| `color.border.default` | nw.200 / nw.800 / `#000` | نفسه | متطابق | — | — | — |
| `color.border.strong` | nw.500 / nw.500 / `#000` | نفسه | متطابق | — | 4.25 على sunken في الكود، و3.48 على raised الغامق. الاثنان يتجاوزان 3:1 (WCAG 1.4.11) | — |
| `color.border.subtle` | غير موجود | nw.150 / nw.800 / `#000` | في الكود فقط | الكود أفضل | ADR-0059. الاستخدام: 5 | S |
| `color.focus.default/offset` | أسود/أبيض، ومعكوس في Dark | نفسه | متطابق | — | ADR-0051 §3.35.3 | — |
| `color.semantic.success` | success.500 / .400 / .800 | نفسه | متطابق | — | — | — |
| `color.semantic.success-hover` | **g.600 / g.300 / g.800** | success.600 / .300 / .900 | موثَّق (ADR-0051) | الكود أفضل | Figma ما زال يربط hover النجاح بسلّم الأخضر المؤسسي. ADR-0051 §1 يمنع صراحةً أن يتشارك لون الهوية ولون حالة النظام في token واحد. الاستخدام: 0 | S (Figma) |
| `color.semantic.error` و`error-hover` | الاسم في الـ Variables: `semantic-danger` و`danger-hover`. التسمية المكتوبة في الجدول: "error". القيم متطابقة | `semantic.error` و`error-hover` | موثَّق (ADR-0051: إعادة التسمية) | الكود أفضل | الجدول المرسوم يقول "error" والمتغير تحته اسمه "danger"، فالملف يناقض نفسه. Dev Mode يعطي `--color-semantic-danger`، وهذا غير موجود في الكود. الاستخدام: 25 | S (Figma) |
| `color.semantic.info/warning/neutral` | متطابق في الأوضاع الثلاثة | — | متطابق | — | — | — |
| `color.semantic.medal-*` | .500 / .400 / .800 | نفسه | متطابق | — | — | — |
| `color.avatar.fallback-*` | متطابق في الأوضاع الثلاثة | — | متطابق | — | — | — |
| `color.section.*` (green/red/black، وكل منها: surface، وtext، وtext-muted، وborder، وdivider) و`adjacent-separator` | غير موجود | 16 token × 3 أوضاع | في الكود فقط | الكود أفضل | ADR-0059 (السجلات الأربعة للخلفيات). الاستخدام: 21 موضعًا في web | M (Figma) |
| `color.accent.information` | `#0C5C8F` | steel-blue.500 | متطابق | — | الاستخدام: 0 | — |
| `color.accent.classification/featured` | لم يظهر في الـ Sections المقروءة | teal.500 / desert-sand.500 | في الكود فقط (بحسب ما قُرئ) | — | الاستخدام: 0 | — |
| `accent.category.championship/news/media` | موجود كـ Variables في collection الـ Brand (ADR-0053) | غير موجود | في Figma فقط، موثَّق | **قرار مطلوب** | ADR-0065 سطر 222 يسجّل الفجوة: هذه ألوان مؤقتة لصور المحتوى، وليست السلّم التصنيفي D3a، **"ولا تُدمج بلا قرار"** | S |
| `color.category.1–5` | غير موجود | 5 قيم (ADR-0065 D3a) | في الكود فقط | الكود أفضل | الاستخدام: 6 مواضع في web | S (Figma) |
| `elevation.card/card-hover/dropdown/modal` | Effect Styles Light فقط | Light، وDark بـ alpha أعلى (ADR-0052)، وHC = none | في الكود فقط (Dark وHC) | الكود أفضل | ظل Light على سطح غامق لا يُرى. ADR-0052 | S (Figma) |
| `elevation.panel/panel-hover` | غير موجود | ADR-0066 | في الكود فقط | الكود أفضل | الاستخدام: 2 | S |
| `border.width.default` في HC | لم يُقرأ | 2px (الفصل 7 §7.3) | غير محسوم | — | — | — |

### ٢.٣ الطباعة

| العنصر | Figma (`2579:5`) | الكود | الحالة | الحكم | السبب | التكلفة |
|---|---|---|---|---|---|---|
| الأحجام وارتفاع السطر: 14 مستوى (Desktop) | من display-xl 64/1.05 إلى overline 12/1.3 | نفسها | متطابق | — | الفصل 4 §4.4 | — |
| أحجام Mobile | غير معروضة. الـ Section مكتوب عليه "Desktop sizes shown" | 14 قيمة mobile | في الكود فقط | الكود أفضل | موثقة في §4.4 | S |
| أوزان العربية (Alexandria) | Black/Black/Black/Bold/Bold/Medium… | نفسها | متطابق | — | — | — |
| **أوزان الإنجليزية (IBM Plex Sans)** | **درجة أخف في كل مستوى:** display وh1 وh2 وh3 = Medium (500)، وh4 وtitle وsubtitle وlabel = Regular، وoverline = Medium | وزن واحد لكل مستوى، مهما كانت اللغة: black 900، وbold 700، وmedium 500 | مختلف، **غير موثَّق** | الكود أفضل، مع ملاحظة | §4.4 يحدد وزنًا واحدًا لكل مستوى، ولا يذكر أي تخفيف للاتينية. **لكن** IBM Plex Sans المتغير يقف عند 700، فطلب الكود 900 يُرسم فعليًا 700. التوثيق يقول "Black" لمستويات لا يمكن للخط الإنجليزي أن يصلها | S (توثيق §4.4 + Figma) |
| `letter-spacing` للـ overline | لا تباعد في الـ specimen | 0.08em | مختلف | الكود أفضل | §4.4 ينص على 0.08em | S (Figma) |
| محاذاة العينة العربية | يسار، في frame LTR | — | خلل في التوثيق | — | §4.6 يقول "Always right-aligned" | S (Figma) |
| العائلات | Alexandria وIBM Plex Sans وIBM Plex Mono | نفسها | متطابق | — | **ما عدا frame الـ V2، المرسوم كله بـ Inter** | — |

### ٢.٤ frame `FOUNDATION / UAEAF V2` (`2628:423`)

**الحالة: في Figma فقط، ويناقض النظام. الحكم: الكود أفضل. وقرار مطلوب بشأن مصير الـ frame.**

frame جديد لم يكن في البناء الأصلي. يحمل شارة **"SOURCE OF TRUTH"**، لكن:

1. **لا يرتبط بأي Variable:** `get_variable_defs` أعاد `{}`. كل لون مكتوب hex.
2. **الخط Inter في كل نص،** بما فيه السطر العربي "الاتحاد الإماراتي لألعاب القوى". هذا يخالف الفصل 4 §4.3 (Alexandria وIBM Plex Sans). وInter لا يحوي حروفًا عربية، فالسطر العربي يُرسم بخط بديل.
3. **13 لونًا خارج اللوحة، رماديات باردة مائلة للأخضر:** `#f6f8f6`، و`#0b1511`، و`#66736d`، و`#39443f`، و`#e5f4eb`، و`#f0f3f1`، و`#8ea198`، و`#c7d2cd`، و`#25362e`، و`#1c2a24`، و`#171c19`، و`#f7f8f7`، و`#c79a3b`.
   - الشرائح تنسب نفسها إلى الـ tokens وقيمها مختلفة: "Warm 950" = `#171c19`، والحقيقي `#131210`. "Warm 50" = `#f7f8f7`، والحقيقي `#FAFAF8`. "Gold" = `#c79a3b`، والحقيقي `gold.500` `#D4A017`.
   - ADR-0051 جعل الرمادي **دافئًا**، وهذه الألوان باردة.
4. **قيم تناقض النظام:**
   - "Tablet 8 cols / **20px** gutters"، والـ token (md) = 24px، وجدول Grid في نفس الصفحة = 24px.
   - "Display / XL" مرسوم بـ **42px**، والـ token = 64px.
   - "Heading / H2" بـ **28px**، والـ token = 32px.
   - radius البطاقات 20px، وليس في السلّم.
5. **نص عربي مقصوص:** السطر العربي يمتد إلى x=957 داخل بطاقة عرضها 730 مع `overflow-clip`، فتظهر "القوى" فقط. رُئي في الصورة وتأكد من الـ node `2628:451`.
6. **تباين فاشل:** نص أبيض على شريحة "Gold" = **2.59:1**.

**الأثر:** الـ frame يعلن أنه مرجع وهو أبعد ما في الملف عن المرجع. بروتوكول التصميم §11 ينص: *"Figma AI is NOT the design authority… If Figma Agent generates something visually attractive but inconsistent with governance: reject it."* بنية الـ frame (مواقع مطلقة، وهيكل بلا Auto Layout ولا Variables) تشبه مخرجات التوليد الآلي. هذا استنتاج من البنية، لا دليل قاطع على المصدر.

---

## ٣. جدول المكونات والأنماط (لكل صفحة Figma)

### ٣.١ صفحة 01 — Foundations (`0:1`): ما عدا الـ tokens

**نسبة التطابق التقريبية للصفحة: ~75%.** القيم الأولية شبه كاملة التطابق، والانجراف كله في الطبقة الدلالية وفي frames التوثيق.

| العنصر | Figma (صفحة/frame) | الكود (ملف) | الحالة | الحكم | السبب | التكلفة |
|---|---|---|---|---|---|---|
| Cover | `19:6` "UAEAF Design System — v1.0.0"، مكتوب فيه "Source of Truth: docs/design-system/ · Generated from tokens.json" | `docs/design-system/00-MASTER-INDEX.md` | متطابق في المعنى | — | الـ Cover يسمي التوثيق مرجعًا، فيناقض شارة "SOURCE OF TRUTH" على frame الـ V2 في نفس الصفحة | — |
| Brand Guidelines: الألوان الرسمية | `19:7`: الأخضر `#00843D`، والأحمر `#C8102E`، والأسود `#000000`، مع أرقام Pantone | `tokens/primitive/colors.json` (DO NOT MODIFY) | متطابق | — | الأبيض (Brand Neutral، ADR-0051) غير معروض | S |
| Brand Guidelines: قواعد استخدام اللون | "Green = primary action / positive state"، و"Red = danger / delete / cancel ONLY — never used as a generic accent" | الأخضر لـ CTA فقط، والنجاح `success.*` مستقل (ADR-0051). الأحمر هوية لها سجل خلفية `section.red` (ADR-0059)، والخطأ `error.*` مستقل | موثَّق (ADR-0051 وADR-0059) | الكود أفضل | القاعدتان المكتوبتان في Figma أُلغيتا جزئيًا بقرار. من يقرأ Figma اليوم سيستنتج أن الأحمر للحذف فقط، وأن الأخضر يعني النجاح. هذا عكس ما قرره ADR-0051 | S (Figma) |
| Color System: شرائح التوثيق | `37:2`: 9 سلالم (neutral-warm، وblack/white، وinfo، وwarning، وerror، وsuccess، وdesert-sand، وteal، وsteel-blue) | — | خلل في Figma | — | **الشرائح نُسخت من شريحة bronze-50 ولم تُصحَّح:** كل شريحة فيها مستطيل علوي بلون `#F8F0EA` أو `#FFFFFF`، وتحتها عنوان hex خاطئ ("#F8F0EA" أو "#FFFFFF" لكل الدرجات). الـ Variables نفسها صحيحة، والخطأ في الرسم فقط. عناوين الدرجات الغامقة (gold.700/800 وnw.500–800) غير مقروءة: رمادي على رمادي | S (Figma) |
| Typography: specimen | `2579:5` | `apps/web/src/app/[locale]/globals.css` (`@utility text-*`) | انظر §٢.٣ | — | النصوص غير مربوطة بـ Text Styles بحسب ما يظهر في `get_design_context`: أسماء خطوط خام لا أسماء أنماط | — |
| Elevation | `19:12`: أربع بطاقات، و"elevation.2 · Card hover / Dropdown" | `semantic/elevation` | متطابق | — | `panel` (ADR-0066) غير معروض | S |
| Grid | `19:13` | `primitive/grid.json` | متطابق | — | انظر §٢.١ | — |
| **Icons** | `19:14`: أربع دوائر placeholder، ونص صريح: "actual Lucide SVG set import… not yet performed". وعلى canvas الصفحة أيقونات منفردة: social ×4، وGrid/List، وChevron، وLink، وWhatsApp، و14 أيقونة رياضية `2536:1131–1144` | لا مكتبة أيقونات في `apps/*/package.json`. SVG مضمَّن في 8 ملفات، والـ `strokeWidth`: 2 (8 مواضع، منها أيقونات `contact-icon.tsx` المنقولة من Figma)، و1.8، و1.6 (موضعان)، و1.5 (موضعان) | مختلف | **دمج** | CMP-ICON-001 (الفصل 8 L1) يقول "Lucide exclusively، 1.5px stroke". لا Figma ولا الكود يلتزم به: Figma لم يستورد الأيقونات، والكود بأربعة سماكات مختلفة. **الدمج المقترح:** مصدر واحد للأيقونات (Lucide أو المجموعة المرسومة في Figma)، وسماكة واحدة موثقة | M |
| Layout Templates | `19:17`: انظر §٣.٨ (القوالب) | — | — | — | — | — |
| FOUNDATION / UAEAF V2 | `2628:423` | — | في Figma فقط، ويناقض | الكود أفضل، و**قرار مطلوب** | انظر §٢.٤ | S |

### ٣.٢ صفحة 03 — Core Components (`2531:1120`)

**نسبة التطابق التقريبية: ~35%.** الكود لا يملك مكوّن Button مشتركًا، والحقول في الطرفين مبنية بنمطين مختلفين (قرار موثَّق). وفي الصفحة ثلاث نسخ من الزر تتنافس على صفة المرجع.

**ما في الكود:** لا يوجد `Button` مشترك في أي من التطبيقين. الأزرار مكتوبة داخل كل ميزة:

| الارتفاع | العدد | المواضع |
|---|---|---|
| **40px** (`h-10`) | **14 زرًا** | الداش بورد: `page-editor` ×2، و`role-editor` ×2، و`create-user-form` ×2، و`role-assignment` ×2، و`media-picker`، و`role-workbench`، و`status-control`، و`auth-utilities`، و`language-toggle`، و`sign-out-button` |
| 40px (`size-10`) | 2 | `theme-toggle` و`auth-utilities` في الداش بورد |
| 36px (`h-9`) | 1 على الأقل | زر الأرشفة في `role-workbench.tsx:296` |
| 48px (`h-12`) | 1 | `submit-button.tsx` في الداش بورد |
| 52px (`min-h-13`) | 1 | زر الإرسال في `contact-form.tsx:441` (web) |
| ≥44px (`min-h-11`/`size-11`) | 3 | عناصر الـ header في web |

- الألوان من `button.*` (component tokens) في 9 ملفات بالداش بورد.
- الـ radius من `--button-radius` (8px).
- حالة التحميل (`aria-busy`) موجودة في 3 ملفات فقط.

| العنصر | Figma (صفحة/frame) | الكود (ملف) | الحالة | الحكم | السبب | التكلفة |
|---|---|---|---|---|---|---|
| **Button: المجموعة القانونية** | `2512:1144`: 5 أنواع (Primary، وSecondary Accent، وSecondary، وTertiary، وDestructive) × 5 حالات (Default، وHover، وActive، وFocus، وDisabled). ارتفاع 44px، وradius 8، وpadding 24/12، وAlexandria Medium 16px. الـ focus حلقة سوداء 2px مع إزاحة بيضاء 4px | لا مكوّن. تنفيذات منفصلة، انظر الجدول أعلاه | مختلف | **دمج** | **Figma أفضل في:** مصفوفة variants كاملة، و44px (الفصل 6 §6.7: MUST ≥44×44)، و16px للنص. **الكود أفضل في:** حالة Loading موجودة (الفصل 8 L2 سطر 168 يجعلها MUST لأزرار الإرسال، والفصل 9 CR-4.5)، ولا توجد في أي Button في Figma. وأيضًا `.lift` (ADR-0066/0067) وربط الألوان بـ component tokens. **الدمج:** مكوّن Button مشترك في الكود، بأنواع Figma الخمسة وارتفاع 44px، مع حالة Loading والـ lift من الكود | M |
| Button: الأحجام | القانونية: حجم واحد (44). القديمة `45:14`: sm/md/lg | الداش بورد 40، وweb 44–52 | **قرار مطلوب** | — | **تعارض داخل التوثيق نفسه:** CMP-BUTTON-001 (الفصل 8 L1) يحدد sm 32 / md 40 (الافتراضي) / lg 48 مع نص `typography.label` (13px). الداش بورد ينفّذه حرفيًا. لكن الفصل 6 §6.7 يقول "Touch Targets: MUST be ≥44×44px"، فالافتراضي في L1 مخالف للفصل 6 | S (توثيق) + M (كود) |
| Button: الأنواع | Primary، وSecondary Accent (أحمر مملوء)، وSecondary (إطار محايد)، وTertiary (نص أخضر)، وDestructive (`semantic.error`) | Primary، وDestructive (بإطار فقط في `role-workbench`). لا Secondary Accent (0 استخدام لـ `bg-brand-secondary`) | مختلف | **قرار مطلوب** | الأنواع الخمسة **غير موثقة في أي فصل.** CMP-BUTTON-001 يسرد Primary/Secondary/Ghost/Danger/Icon-only، ويقول إن Primary = `color.semantic.success`، وهذا نفسه ألغاه ADR-0051. "Secondary Accent" (زر CTA أحمر) يمس ADR-0050/0051 (الأحمر ≤5%، ولا يُستخدم للـ CTA العام). يحتاج قرارًا وADR قبل أن يُبنى | S (قرار) |
| Button: المجموعة القديمة | `45:14`: 45 variant بارتفاع 17–21px (بلا padding عمودي)، والنص العربي "نشر" بخط IBM Plex Sans فيُرسم بخط بديل. Hover الـ Secondary تعبئة `#757470` مع نص أسود (4.49:1، تحت 4.5) | — | في Figma فقط، **معطوب** | يُهمل | مجموعة سابقة، مربوطة بـ component tokens (`--button-primary-background`) لكن هندستها منهارة. وجودها بجانب القانونية يربك المصمم. توصية Back-Sync: وسمها deprecated | S (Figma) |
| Button: frame الـ V2 | `2625:345`: Primary، وSecondary (نص أخضر)، وTertiary (خلفية خضراء فاتحة)، و**Destructive = `#C8102E`**. radius 10، وأحجام pill (18/22/26)، وInter Bold 13px | — | في Figma فقط، **يناقض** | الكود أفضل | **Destructive بلون الهوية الأحمر يخالف ADR-0051 مباشرة** (Brand Guide §11.3: "do not use Brand Red as Error"، و`button.danger.background = semantic.error`). يعكس ترتيب Secondary/Tertiary عن المجموعة القانونية `2512:1144` في نفس الصفحة. لا Variables | S (Figma) |
| **حقل الإدخال (Text Field/Textarea/Select)** | `856:439`/`483`/`524`، 5 حالات. label **فوق** الحقل، وradius 12، والخلفية `surface.base`، والإطار `border.default`. **Focus:** إطار أسود 2px مع توهج أخضر `rgba(0,84,41,0.18)` (ليس token). **Disabled:** opacity 0.55 (الـ token 0.5). نص المساعدة والخطأ **12px** | `packages/design-tokens/css/forms.css` (`.field`): label مطبوع على حافة الحقل (notched)، و48px، و`sunken` في الراحة ثم `raised` مع `elevation.card` عند الـ focus، والإطار `border-strong`. الـ label لا يحمرّ في الخطأ | موثَّق (ADR-0066 D6 وD1، وADR-0067 D5) | الكود أفضل | **إطار Figma يفشل WCAG 1.4.11:** `#E0DFDB` على `#FDFCFB` = **1.30:1**. إطار الكود = 4.25:1. **نص 12px في Figma يخالف الفصل 4 §4.10** (13px حد أدنى). التوهج الأخضر لون غير موجود في السلّم. نمط الكود مشترك بين التطبيقين بقرار (ADR-0067 D5)، ومحمي باختبارات (`field-standard.spec.tsx` و`surface-standard.spec.ts`) | M (Figma) |
| حقل الإدخال: frame الـ V2 | `2625:365`: إطار `#cbd3ce` 1.5px، **وFocus بإطار أخضر**، وError بإطار `#C8102E` | — | في Figma فقط، يناقض | الكود أفضل | إطار الراحة 1.53:1 (يفشل 1.4.11). الـ focus بلون الهوية يخالف ADR-0051 §3.35.3 (`focus.default` مستقل عن `brand.*`). الخطأ بلون الهوية يخالف ADR-0051 | S (Figma) |
| Card | `46:2`: `card-background`/`card-border`/`card-radius` (12)، وpadding 16، والنص العربي بخط IBM Plex Sans. بلا hover | `apps/web/src/components/ui/card.tsx`: سجلات ألوان (neutral/green/red/black)، والإطار `border-strong` عبر `ui/surface`، و`elevation.card`، وpadding 24، و`interactive` مع `.lift` | موثَّق (ADR-0059، وADR-0065 D5، وADR-0066) | الكود أفضل | إطار Figma 1.33:1 على الأبيض، وإطار الكود 4.68:1. النص العربي في Figma بخط لاتيني. الكود يضيف سجلات الخلفية والـ hover | S (Figma) |
| Social Button | `668:422`: 44×44، دائري، 4 حالات | `site-footer.tsx:129`: روابط **32×32** (`size-8`) بخلفية gradient للمنصة | مختلف | **دمج** | **Figma:** حالة Default أيقونتها **بيضاء على `#FDFCFB` = 1.02:1، غير مرئية** (تأكد من ملف الـ SVG: `fill="white"`)، وحالة Focus مثلها. **الكود:** الحجم 32px يخالف §6.7 (44). **الدمج:** رسم 32px كما في الفوتر المعتمد، مع منطقة لمس 44px (padding مع هامش سالب أو pseudo-element)، وأيقونة مرئية في كل حالة | S |
| Category Label | `973:649`: Alexandria Bold 13px، و`brand-primary`، و`tracking 0.52px` | لا مقابل | في Figma فقط | — | لا صفحة مبنية تحتاجه بعد. 4.81:1 على الأبيض | — |
| CMP-LOAD-MORE | `2591:43`: pill، و14px bold، وأيقونة chevron | لا مقابل | في Figma فقط | — | الوصف في Figma يحدد **"Focus (2px brand-primary ring)"**، وهذا يخالف ADR-0051 (focus أسود/أبيض مستقل). يُصحَّح قبل التنفيذ | S |
| CMP-SHARE-ICON-BUTTON | `2591:1925`: 44×44 مع 4 منصات، وحالتا Default وHover | لا مقابل | في Figma فقط | — | نفس ملاحظة الـ focus بلون الهوية. الوصف يذكر toast "تم نسخ الرابط"، فهو يعتمد على نظام toasts غير موجود بعد (§٧) | S |
| Image Placeholder | `96:1046` | لا مقابل مباشر | في Figma فقط | — | — | — |
| 10 Component Variants | `47:2`: شرح "Disabled MUST combine cursor + pointer-events + opacity" | `interaction.css` (cursor) و`button.disabled.*` | متطابق في القاعدة | — | الكود يطبق `cursor: not-allowed` عامًا في `@layer base` | — |
| frame `UAEAF CORE COMPONENTS / V2` كاملًا | `2625:339`: Button، وInput، وBadge، وCard، وTable، وNavigation، وHero. شارة "V2 / CANONICAL". Inter، وبلا Variables، وإنجليزي فقط (لا عينة RTL) | — | في Figma فقط | الكود أفضل، و**قرار مطلوب** | يعلن نفسه "CANONICAL" ويناقض المجموعة القانونية الفعلية (`2512:1144`) في نفس الصفحة. شريط تنقل داكن بزر أخضر نشط لا يطابق الـ header المعتمد (ADR-0061/0062) | S |

### ٣.٣ صفحة 06 — Content Components (`2531:1123`)

**نسبة التطابق التقريبية: ~15%.** Figma يملك ست بطاقات محتوى غنية. الكود يستخدم `Card` عامًا واحدًا في صفحتين فقط: أعضاء المجلس والرياضيين، واسم وسطر نصي. باقي الصفحات المقابلة (الأندية، واللجان، والأخبار، والوثائق) ما زالت `StaticPageScreen` بلا بطاقات. الفجوة هنا "لم يُبنَ بعد" أكثر منها "بُني مختلفًا".

**ما يتطابق فعلًا:** سلوك الـ hover في بطاقات Figma (الإطار يصير أخضر) هو الإشارة الثانية من ثلاث في ADR-0066 D3، و`.lift` في الكود يطبقها مع الإشارتين الأخريين: الارتفاع 4px، وتبدّل الظل. Figma لا يستطيع رسم الحركة (البروتوكول §13).

| العنصر | Figma (صفحة/frame) | الكود (ملف) | الحالة | الحكم | السبب | التكلفة |
|---|---|---|---|---|---|---|
| CMP-BOARDMEMBERCARD-001 | `728:94`: صورة رمزية بالحروف الأولى، والاسم، والمنصب. حالتا Default وHover (إطار أخضر) | `app/[locale]/about/board-members/page.tsx`: `Card` عام فيه الاسم (`text-h4`)، و`shortBio`، ورابط البريد (`min-h-11`) | مختلف | **دمج** | **Figma أفضل في:** هوية العضو، أي الحروف الأولى والمنصب. tokens `avatar.fallback-*` معرّفة في الكود ولها **0 استخدام**. **الكود أفضل في:** رابط تواصل بمنطقة لمس 44px، وسطح ADR-0066. الدمج يعتمد على وجود حقل المنصب في الـ API | M |
| CMP-COMMITTEECARD-001 | `739:148`: رقم ترتيبي، وأيقونة، واسم عربي وإنجليزي، ورئيس اللجنة، ورابط "عرض التفاصيل" | `about/committees/page.tsx`: `StaticPageScreen` بلا بطاقة | في Figma فقط | — | لم يُبنَ | M |
| CMP-CLUBCARD-001 | `785:352`: 4 حالات (Default، وHover، وFocus، وPressed)، وشعار دائري بحرف، واسم عربي وإنجليزي، والإمارة، والنوع، ورابط. الـ Focus إطار أسود 2px **بلا إزاحة** | `clubs/page.tsx`: `StaticPageScreen` | في Figma فقط | — | استثناء ADR-0041 (تسمية المدينة 8.944px) خاص بهذا المكوّن وحده. Focus Figma يطابق لون `focus.default`، لكنه بلا `focus.offset` الأبيض (ADR-0051). يُكمَّل عند البناء | M |
| CMP-DOCUMENTCARD-001 | `2591:20`: شارة نوع ("لائحة")، وPDF، والعنوان، والوصف، والتاريخ والإصدار، ورابطا "عرض الوثيقة" و"تحميل PDF". Hover بظل | لا صفحة وثائق | في Figma فقط | — | ADR-0065 D3a يمنع تلوين البطاقة بموقعها في الصف (وجده في frame `720:765`). اللون، إن وُجد، يتبع **نوع** الوثيقة من `color.category.*` | M |
| Athlete Card | `2591:39`: مساحة صورة داكنة، وشارة ترتيب، والاسم فوق تدرّج، و**PB "49.32 ث"**، ومؤشر أخضر، والتخصص والنادي | `athletes/page.tsx`: `Card` عام فيه الاسم والاتحاد | مختلف (Figma أغنى) | **قرار مطلوب** (جزئيًا) | رقم PB هو **PB-GAP** المفتوح (CLAUDE.md §7: 22px و26px خارج السلّم، DESIGN SYSTEM GAP). لا يُبنى رقم الأداء قبل قرار دور Statistic/Numeric Display | M |
| Editorial Story Card | `973:679`: 5 variants: Lead، وSecondary، وCompact، وListRow، وListRowLTR. التصنيف بلون `desert-sand` | `news/page.tsx`: `StaticPageScreen` | في Figma فقط | — | **لون التصنيف متسق مع ADR-0051:** `accent.featured` = desert-sand، ومخصص للمحتوى التحريري. **لكنه يناقض** Category Label في صفحة 03، وهو أخضر (`brand-primary`). **variant الـ Compact معطوب:** صورة placeholder بعرض 64 ونص يفيض ("G-PLACEHOLDER-0("). ListRowLTR نسخة LTR منفصلة، كما يطلب البروتوكول §8 | M |
| frame `CONTENT COMPONENTS / V2` | `2626:223`: Inter، وبلا Variables، وإنجليزي فقط | — | في Figma فقط، يناقض | الكود أفضل | **عناوين مقصوصة:** "…ahead of the new sea" و"…competition, athle". محتوى يفيض عن حافة الـ frame اليمنى في ثلاثة أقسام. **"FEATURED" و"Actions" بالأحمر:** ADR-0051 يجعل featured = desert-sand، والأحمر ليس للإجراءات العامة. قسم "States & Feedback" (Published / Review scheduled / Needs attention / Publishing failed) مادة مفيدة لنظام الـ toasts (§٧)، لكن بألوان خارج الـ tokens | S |

### ٣.٤ صفحة 05 — Data Components (`2531:1122`)

**نسبة التطابق التقريبية: ~10%.** لا مقابل مبنيًا في الموقع العام لأي من هذه المكونات: صفحة النتائج والتصنيفات `StaticPageScreen`، وقسم الإحصاءات في الرئيسية غير مبني. أما في الداش بورد فمكوّناته (`StatTiles`، و`DataTable`) لا مقابل لها في Figma أصلًا (§٣.٧).

**ما يتطابق فعلًا مع القرارات:**
- Stat Card يستخدم `accent.information` (steel-blue) للأرقام.
- Filter Chip النشط يستخدم `accent.classification` (teal) للتصنيف.
- الاثنان كما يحدد ADR-0065 D2 حرفيًا.

| العنصر | Figma (صفحة/frame) | الكود (ملف) | الحالة | الحكم | السبب | التكلفة |
|---|---|---|---|---|---|---|
| Stat Card | `197:50` (master)، ويُستخدم 4 مرات في "الاتحاد بالأرقام": الرقم Alexandria Black 40px، وشارة delta، وأيقونة، و5 أعمدة اتجاه، ورابط تذييل. مربوط بـ `space.*` و`radius.lg` | لا مقابل عام. `apps/dashboard/src/components/admin/stat-tiles.tsx` مكوّن مختلف الغرض (مؤشرات الإدارة) | في Figma فقط | — | **خلل في الـ master:** التسميات العربية ("ميدالية دولية"، و"منذ تأسيس الاتحاد"، و"التطور خلال 5 سنوات"، و"سجل الإنجازات") **بخط Inter** فتُرسم بخط بديل، خلافًا لـ §4.3. نصان بـ **12px** تحت الحد. **4 من 5 أعمدة الاتجاه** بلون steel-blue-50 على base = **1.13:1**، والرسم البياني عنصر معلوماتي يخضع لـ WCAG 1.4.11 (3:1). عيوب R7 في الـ instances (24 node) مستقلة، وتبقى TOOLING BLOCKED | S (Figma) |
| CMP-RESULTROW-001 | `2001:1010`: ميدالية (gold/silver/bronze) × حالة (default/hover)، 64px. أحجام النص **15 و12 و13 و18 و11px** | لا مقابل (`results-rankings/page.tsx` = `StaticPageScreen`) | في Figma فقط | — | **15px ليس في سلّم Desktop، و12 و11 تحت الحد الأدنى** (§4.4 و§4.10). **الميدالية مُعبَّر عنها بنقطة لون فقط:** لا رقم مركز ولا نص. نقطة الذهبي 2.32:1، والفضي 2.49:1، أي تحت 3:1، ويخالف WCAG 1.4.1 (اللون وحده) والفصل 6 §6.2. يُصحَّح قبل البناء | M |
| CMP-NEWS-VIEW-SWITCHER | `997:814`: Grid/List، والقطعة 40×40، والنشطة بخلفية steel-blue-50 | لا مقابل (`news/page.tsx` = `StaticPageScreen`) | في Figma فقط | — | **40px تحت 44** (§6.7). **steel-blue لحالة control نشطة يخالف ADR-0065 D2:** `accent.information` "never actions or system states". وصف المكوّن نفسه يقول "brand-tinted"، والرسم steel-blue، فيناقض نفسه | S |
| CMP-FILTERCHIP-001 | `1997:963`: default/hover/active، و**32px** ارتفاعًا، والنشط `accent.classification` مع نص أبيض (6.37:1) | لا مقابل | في Figma فقط | — | اللون متسق مع ADR-0065 D2. **الارتفاع 32px تحت 44** (§6.7). في default بلا حدود ولا خلفية مميزة، فالعنصر لا يُقرأ كعنصر قابل للضغط إلا من النص | S |
| frame `UAEAF DOMAIN COMPONENTS / V2` | `2625:484`: Athlete، وCompetition، وDiscipline/Category، وResult، وRanking، وDomain Model. Inter، وبلا Variables، وإنجليزي فقط | — | في Figma فقط | الكود أفضل، و**قرار مطلوب** | **مسألة IA:** نموذجه "Athlete → Competition → Discipline → Category → Result" يسمي الكيان "Competition"، والتسمية تحته "Event". CLAUDE.md §11: Events وTournaments مفهومان منفصلان عمدًا ولا يُدمجان. هذا الـ frame يدمجهما في مفهوم ثالث. نص "Category→" متراكب مع السهم | S |

### ٣.٥ صفحة 04 — Navigation (`2531:1121`)

**نسبة التطابق التقريبية: ~50%.** شكل عنصر التنقل (مؤشر أخضر سفلي، والنشط بوزن أثقل) متطابق. البنية تغيرت بقرار ADR-0062، وFigma لم يُحدَّث.

| العنصر | Figma (صفحة/frame) | الكود (ملف) | الحالة | الحكم | السبب | التكلفة |
|---|---|---|---|---|---|---|
| CMP-NAVITEM-001 | `1931:818`: default (`text.secondary`)، وhover (`text.primary` + خط أخضر)، وactive (Medium + خط أخضر 2px). حجم النص **15.9px** | `apps/web/src/components/layout/primary-nav.tsx`: `nav-item`، و`text-body`، و`min-h-11`، و`nav-indicator` (`h-0.5` أخضر)، و`aria-current="page"` | متطابق في الشكل | — | 15.9px في الـ master قيمة كسرية ليست في السلّم، من نفس نوع عيوب R7. الكود يستخدم 16px (`text-body`) وهدف لمس 44px. النشط لا يعتمد على اللون وحده: خط ووزن | S (Figma) |
| البنية: لوحة "عن الاتحاد" | `169:1479`: 4 بنود (نبذة، ومجلس الإدارة، واللوائح والتقارير، واللجان الفنية) مع وصف تحت كل بند | 6 بنود: نبذة، و**كلمة الرئيس**، ومجلس الإدارة، واللجان، والهيكل التنظيمي، و**الحوكمة والاستراتيجية** (مجموعة متداخلة: الرؤية والرسالة، والخطة الاستراتيجية، والسياسات واللوائح) | موثَّق (ADR-0062 D1، وIA §8.1 معدّل) | الكود أفضل | قرار المالك بتاريخ 2026-09-09 | M (Figma) |
| البنية: لوحة "البطولات" | `169:1492`: لوحة dropdown ("reassigned — content is tournament/competition data") | "البطولات" رابط بلا لوحة. لوحتا "الأعضاء" و"المركز الإعلامي" موجودتان في الكود وغائبتان عن Figma | موثَّق (ADR-0062 D1 وD2.4) | الكود أفضل | D2.4 حسم "Championships" مقابل "Tournaments" | M (Figma) |
| لوحة الـ dropdown: الشكل | radius 16، وpadding 12، وظل **`0 8 12 rgba(0,0,0,0.12)`**، والبنود **بخط IBM Plex Sans للنص العربي**، و14px للعنوان و**12px** للوصف. رمز "‹" على سطر مستقل **فوق** العنوان | `rounded-lg` (16)، و`border-default`، و`surface-raised`، و`p-2`، و`shadow-dropdown`، والبنود `min-h-11`، والوصف `text-caption` (13px) | مختلف | الكود أفضل | ظل Figma ليس أيًا من المستويات الخمسة (§3.14). الخط اللاتيني للعربية يخالف §4.3، و12px تحت الحد. الـ chevron المنفصل خلل في الـ layout | S (Figma) |
| Dropdown Row (Flyout/Link) | `584:398` و`2591:46`: الصف **240×20** | بنود `min-h-11` (44px) | مختلف | الكود أفضل | 20px ارتفاع العنصر نفسه، والـ padding ليس جزءًا من المكوّن. أي instance بلا غلاف يعطي منطقة لمس 20px | S (Figma) |
| نمط التفاعل | لا يمثَّل | Disclosure Navigation (`<button aria-expanded>` + قائمة روابط، لا `role="menu"`)، محمي باختبار | في الكود فقط، موثَّق (ADR-0062 D3) | الكود أفضل | — | — |
| درج التنقل 1024–1279px | لا frame | تركيب الموبايل على عرض سطح المكتب | في الكود فقط | — | ADR-0062 البند المفتوح 4 يسجّله: **PENDING FIGMA BACK-SYNC** | M (Figma) |
| تنقل الداش بورد (`shell/sidebar-nav.tsx`) | لا شيء | موجود | في الكود فقط | — | انظر §٣.٧ | — |

### ٣.٦ صفحة 07 — Patterns

**غير موجودة في الملف.** يوجد Section باسم "07 Grid System" فقط (§٢.١). الأنماط الموثقة في الفصل 11 (UX Patterns)، والمنفذة في الكود، لا frame لها في Figma:
- حالات Loading/Empty/Error.
- البحث.
- النماذج (Service/Trust).
- الحقل الموحد.

**الحالة: في الكود فقط.**

### ٣.٧ صفحة 08 — Website Patterns (`2531:1125`)

**نسبة التطابق التقريبية: غير قابلة للقياس لـ 10 من 12 قسمًا (لم تُبنَ)، و~40% للقسمين المبنيين.**

**الحقيقة الأولى:** الصفحة الرئيسية في الكود placeholder (`apps/web/src/app/[locale]/page.tsx`). عنوان وسطر، مع `INDEXABLE = false`. أقسامها الـ 13 مؤجلة بقرار المالك (تعليق الملف). المبني من الصفحة هو **الـ Header والـ Footer** فقط.

**الحقيقة الثانية:** masters هذه الصفحة (`74:*`) **أقدم** من صفحة Homepage المعتمدة (`146:5`):
- الكود يستشهد بعُقد من الصفحة المعتمدة وصفحات الـ static، لا من هذه الصفحة: `2544:2595` (مؤشر التنقل)، و`2374:2243`، و`2374:2257`، و`2737:38`، و`2616:1382`، و`1192:2272`، و`1192:2304`.
- الذاكرة الموثقة للمشروع تسجل أن تصميم الـ Footer اليدوي الجديد حلّ محل الـ master `74:996`.
- CLAUDE.md §27 يمنع إعادة تدقيق الرئيسية بلا دليل جديد. لذلك المقارنة هنا مقصورة على ما بُني.

| العنصر | Figma (صفحة/frame) | الكود (ملف) | الحالة | الحكم | السبب | التكلفة |
|---|---|---|---|---|---|---|
| Section / Header | `74:71`: Desktop/Tablet/Mobile. Desktop 1440×96: 7 بنود ("الرئيسية" نشطة **بخلفية خضراء فاتحة + خط**)، و"AR \| EN"، وبحث، وقمر | `site-header.tsx` و`primary-nav.tsx`: 8 بنود (ADR-0062 D1)، والنشط خط 2px ووزن Medium فقط (عقدة `2544:2595`)، وصف التنقل من `2xl` (ADR-0061 D6)، ومبدّل لغة يسمّي وجهته (ADR-0061 D5) | موثَّق (ADR-0061 وADR-0062) | الكود أفضل | الخلفية الخضراء للنشط في هذا الـ master تناقض `CMP-NAVITEM-001` في صفحة 04، ومؤشر `2544:2595` المعتمد، في الملف نفسه. "AR \| EN" يسمي اللغتين لا الوجهة (ADR-0061 D5) | M (Figma) |
| Section / Footer | `74:999`، Desktop `74:996`: خلفية سوداء، و**شعار ملوّن على الأسود**، و4 أزرار تواصل **أيقوناتها بيضاء على دوائر بيضاء** (لا يظهر إلا X)، ورابط "الاتحاد في الإعلام" | `site-footer.tsx`: سجل black، والشعار `variant="mono"` (ADR-0002، وADR-0061 D4)، و5 منصات منها TikTok (`lib/navigation.ts`)، وروابط سريعة موازنة (ADR-0063)، وبطاقة موقع بخريطة (`footer-map-card`) | موثَّق، ومستبدَل بتصميم معتمد أحدث | الكود أفضل | **ثلاثة عيوب في الـ master:** (1) الشعار الملوّن على الأسود: حبر الكلمة `#000` على `#000` = 1:1، ويخالف ADR-0002. (2) 3 من 4 أيقونات غير مرئية، وهو عيب Social Button (§٣.٢). (3) "الاتحاد في الإعلام" أُلغي كوجهة (ADR-0062 D2.1: صار قسمًا في `/news`). **الكود فيه عيب واحد:** روابط التواصل 32×32 (§٣.٢) | M (Figma) |
| Hero، وStats، وFeatured Athletes، وResults & Rankings، وClubs Network، وUpcoming Championships، وNews، وMedia Gallery، وSponsors & Partners، وNewsletter | `74:135`، و`73:7`، و`74:217`، و`74:388`، و`74:519`، و`74:622`، و`74:755`، و`74:864`، و`74:922`، و`74:971`: كل منها بثلاثة breakpoints | لم تُبنَ | في Figma فقط | — | هذه الصفحة **المصدر الوحيد في الملف لسلوك Tablet وMobile** لهذه الأقسام. عند البناء تُقرأ مقابل الصفحة المعتمدة `146:5` أولًا (CLAUDE.md §1a.1). البنود المفتوحة R7 وPB-GAP تبقى كما هي في §27 | L (بناء) |

### ٣.٨ صفحتا 09 — Dashboard Patterns و10 — CMS Patterns

**غير موجودتين في الملف بأي شكل.** لا صفحة، ولا Section، ولا frame للداش بورد أو الـ CMS. الـ frame `10 Component Variants` (`47:2`) شرح لحالات Button، لا أنماط CMS.

**الحالة: في الكود فقط، بالكامل. نسبة التطابق: 0%، بلا مقابل أصلًا.**

ما هو مبني في `apps/dashboard` بلا أي frame في Figma:

| المجال | المكونات (`apps/dashboard/src/components/…`) | المرجع الموثَّق |
|---|---|---|
| الدخول | `auth/auth-shell`، و`login-form`، و`forgot-password-form`، و`reset-password-form`، و`password-input`، و`password-strength-meter`، و`lockout-notice`، و`status-message`، و`sso-buttons`، و`submit-button` | الفصل 17، وADR-0067 D5 (الحقل الموحد) |
| الإطار | `shell/sidebar-nav`، و`theme-toggle`، و`language-toggle`، و`sign-out-button` | الفصل 12 |
| المستخدمون | `admin/users/user-directory`، و`create-user-form`، و`status-control`، و`role-assignment` | الفصل 12، وADR-0057 |
| الأدوار والصلاحيات | `admin/roles/role-workbench`، و`role-list`، و`role-editor`، و`permission-matrix-table`، و`permission-catalogue-lens` | الفصل 12 |
| الصفحات (CMS) | `admin/pages/page-workbench`، و`page-editor`، و`media-picker`، و`admin/bilingual-field` | الفصل 13 |
| مشترك | `ui/data-table`، و`page-header`، و`search-field`، و`select-field`، و`required-field`، و`access-denied`، و`admin/stat-tiles` | الفصل 8 L2/L5 |

**الحكم: الكود هو المرجع الوحيد. يُسجَّل كله للـ Figma Back-Sync (التكلفة L).** الملاحظة الوحيدة على الكود هنا (مسألة إمكانية وصول، لا انجراف) هي أزرار 40px (§٣.٢).

### ٣.٩ صفحة 11 — Templates (Section `11 Layout Templates`، `19:17`)

**نسبة التطابق التقريبية: ~20%.** Figma فيه wireframe رمادي بلا محتوى على ثلاثة عروض. الكود فيه قالبان مطبقان وموثقان.

| العنصر | Figma (صفحة/frame) | الكود (ملف) | الحالة | الحكم | السبب | التكلفة |
|---|---|---|---|---|---|---|
| قالب الصفحة العامة | `48:5`: كتل رمادية لـ Desktop 1440، وTablet 768، وMobile **375**. بلا header ولا footer. الـ frame (1900) يفيض عن حدود الـ Section (1600) | `apps/web/src/components/pages/static-page-screen.tsx` (يخدم 10 مسارات)، و`ui/page-hero.tsx` (سجلات ADR-0059، والتركيب ADR-0066 D5)، و`ui/section.tsx` | في الكود فقط (فعليًا) | الكود أفضل | Figma "Reusable structure only… no final UI" بنص الـ Section نفسه. العرض 375 للموبايل، بينما التحقق في المشروع على 390 (ADR-0066) | M (Figma) |
| قالب "تواصل معنا" (المعتمد في الموجز) | لا frame في صفحات الـ design system. الصفحة بُنيت من Figma Section 9 (ADR-0064) | `app/[locale]/contact/page.tsx` و`components/pages/contact/*` | في الكود فقط (بالنسبة لهذا الملف) | الكود أفضل | القالب المعتمد يستحق أن يُرفع إلى صفحة Templates كمرجع: hero يملأ الشاشة الأولى، وصف لوحتين متساويتين (ADR-0066 D4)، والحقل الموحد، وسجل black (ADR-0065) | M (Figma) |
| قوالب الداش بورد (list/detail/editor) | لا شيء | `page-workbench`، و`role-workbench`، و`user-directory` | في الكود فقط | — | انظر §٣.٨ | L |

---

## ٤. نتائج إمكانية الوصول

كل رقم هنا محسوب بصيغة WCAG 2.1 من القيم الفعلية (الـ hex من الـ Variables أو من `get_design_context`)، لا بالنظر. "النص العادي" يحتاج 4.5:1، و"النص الكبير وحدود العناصر والرسوم" تحتاج 3:1.

### ٤.١ في Figma

| # | المشكلة | الموضع | القيمة المحسوبة | المعيار | الأولوية |
|---|---|---|---|---|---|
| F1 | أيقونة زر التواصل **غير مرئية** في Default وFocus | `668:192` و`668:198`، وكل instance في footer `74:996` | أبيض على `#FDFCFB` = **1.02:1**. تأكد من ملف الـ SVG: `fill="white"` | 1.1.1، و1.4.11 | P1 |
| F2 | الشعار الملوّن على خلفية سوداء | footer `74:996` | حبر الكلمة `#000` على `#000` = **1.00:1** | ADR-0002، و1.4.11 | P1 |
| F3 | `text.muted` (Light) | Variable | nw.500 على sunken `#FAFAF8` = **4.48:1** | 1.4.3 | P1، لأن كل تصميم جديد يرثه |
| F4 | `text.link` (Dark) | Variable | g.400 على raised `#21201C` = **4.17:1** | 1.4.3 | P1 |
| F5 | إطار الحقل | `856:439`/`483`/`524` | `#E0DFDB` على `#FDFCFB` = **1.30:1** | 1.4.11 | P1 |
| F6 | إطار حقل الـ V2 | `2625:369` | `#CBD3CE` على الأبيض = **1.53:1** | 1.4.11 | P3 (frame غير معتمد) |
| F7 | الميدالية باللون وحده | `CMP-RESULTROW-001` | نقطة الذهبي 2.32، والفضي 2.49، والبرونزي 3.92، بلا نص ولا مركز | 1.4.1، و1.4.11، والفصل 6 §6.2 | P2 |
| F8 | أعمدة الاتجاه في Stat Card | `210:133–136` | steel-blue-50 على base = **1.13:1** | 1.4.11 | P2 |
| F9 | نص أبيض على شريحة "Gold" | V2 `2628:439` | **2.59:1** | 1.4.3 | P3 |
| F10 | نص تحت الحد الأدنى 13px (الفصل 4 §4.10) | مساعدة الحقل وخطؤه (12)، وStat Card (12 ×2)، وResult Row (12 و**11**)، ووصف لوحة التنقل (12)، وspecimens التوثيق (11) | — | الفصل 4 §4.10 | P2 |
| F11 | أهداف لمس تحت 44px (الفصل 6 §6.7) | Filter Chip **32**، وView Switcher **40**، وDropdown Row **20**، وButton القديم **17–21** | — | الفصل 6 §6.7 | P2 |
| F12 | حلقة الـ focus بلون الهوية | أوصاف Load More وShare ("2px brand-primary ring")، وfocus حقل الـ V2 (أخضر) | — | ADR-0051 §3.35.3 (`focus.default` مستقل) | P2 |
| F13 | حلقة focus بلا إزاحة | `CMP-CLUBCARD-001` State=Focus | — | ADR-0051 (`focus.offset`) | P3 |
| F14 | نص عربي بخط لا يحوي العربية | Button القديم، وCard، ولوحة التنقل (IBM Plex Sans). وStat Card وكل frames الـ V2 (Inter) | يُرسم بخط بديل | الفصل 4 §4.3 | P2 |
| F15 | نص عربي مقصوص | V2 `2628:451` | يظهر "القوى" فقط | 1.4.10 | P3 |

### ٤.٢ في الكود

| # | المشكلة | الموضع | القيمة | المعيار | الأولوية |
|---|---|---|---|---|---|
| C1 | **أزرار 40px في الداش بورد** | 14 × `h-10`، و2 × `size-10`، و`h-9` في `role-workbench.tsx:296` (القائمة في §٣.٢) | 36–40px | **الفصل 6 §6.7: MUST ≥44×44**. تنجح WCAG 2.5.8 (AA، 24px) وتفشل 2.5.5 (AAA، 44px) | P1، مشروط بالقرار D2 |
| C2 | روابط التواصل في الـ footer | `site-footer.tsx:134` (`size-8`)، في كل صفحة | 32×32، والفجوة 8px | الفصل 6 §6.7 | P1 |
| C3 | دقة التوثيق في التعليقات | `packages/design-tokens/css/forms.css:231` و`:286` تنسب حد 44px إلى "WCAG 2.5.8" | 2.5.8 حدها 24px. الـ 44 هي 2.5.5 (AAA) والفصل 6 §6.7 | صحة المرجع، لا عيب وظيفي | P3 |

**ما تحقق وهو سليم في الكود** (قيم محسوبة):
- `text.muted` Light: 6.05 على base، و5.75 على sunken.
- `text.link` Light: 6.38 و6.07. وDark: 5.72 و6.56.
- `border.strong`: 4.68 على الأبيض، و4.25 على sunken، و3.48 على raised الغامق.
- إطار الحقل والبطاقة `border-strong`: 4.68 و4.25.
- زر Primary: أبيض على g.500 = 4.81.
- Destructive: 4.98.

`text.disabled` تحت 4.5 في الطرفين عمدًا، واستثناء WCAG 1.4.3 للعناصر غير النشطة يغطيه.

**خارج ما يمكن التحقق منه في هذه الجولة:** السلوك الحي (focus بالكيبورد، والقارئ الشاشي، والتكبير). الجولة قراءة فقط، بلا تشغيل سيرفرات بحسب الموجز. والـ MCP الخاص بالمتصفح غير متصل في هذه الجلسة.

---

## ٥. قائمة Figma Back-Sync

كل ما يجب تحديثه في Figma عند فتح الملف، مرتبًا بالأولوية. **لا شيء منها نُفّذ:** الملف مقفول، والتعديل يحتاج موافقة صريحة لكل مهمة.

### P1: ما يُضلّل من يصمم أو يبرمج من Figma اليوم

1. **frames الـ V2 الأربعة** (`2628:423`، و`2625:339`، و`2625:484`، و`2626:223`): إزالة شارتي "SOURCE OF TRUTH" و"V2 / CANONICAL"، ووسمها "استكشاف غير معتمد" أو حذفها. **القرار D1.**
2. **قيم الـ Semantic Variables** لتطابق الكود:
   - `text.muted`، و`text.secondary`، و`text.disabled` (Dark)، و`text.link` (Light وDark): ADR-0059 وADR-0063.
   - `surface.base` (`#FDFCFB` ← nw.50)، و`text.primary` (Dark، `#FDFCFB` ← nw.50)، و`surface.sunken` ← nw.100: ADR-0059.
   - `surface.skeleton` ← nw.150.
   - `success-hover` ← `success.600`/`.300`/`.900`: ADR-0051.
3. **أسماء الـ Variables وcode syntax الخاص بها:**
   - `color/gray/*` ← `color/neutral-warm/*`، مع `color/black` و`color/white` مستقلين.
   - `semantic-danger*` ← `semantic-error*`.
   - إضافة WEB code syntax لـ `info/300`، و`info/500`، و`warning/500`، و`warning/700`، و`text/muted`.
   
   **بدون هذا يعطي Dev Mode أسماء متغيرات غير موجودة في `build/css`.**
4. **نص قواعد الاستخدام في Brand Guidelines** (`22:19`): "Red = danger / delete / cancel ONLY" و"Green = … positive state" أُلغيتا جزئيًا بـ ADR-0051 وADR-0059.
5. **Social Button** (`668:192`/`198`): أيقونة مرئية في كل حالة.
6. **Footer master `74:996`:** الشعار mono على الأسود، والأيقونات، وإزالة "الاتحاد في الإعلام". أو وسم الـ master "مستبدَل بالتصميم المعتمد".
7. **مجموعة Button القديمة `45:14`:** وسمها deprecated.

### P2: ما يلزم لأن يطابق Figma القرارات الموثقة

8. إضافة الـ tokens الموجودة في الكود فقط:
   - `text.on-brand`، و`surface.overlay`، و`border.subtle`.
   - `section.*` (16 token × 3 أوضاع).
   - `category.1–5`.
   - `elevation` في Dark/HC، و`elevation.panel`/`panel-hover`.
   - `grid.dashboard.columns`.
9. **الحقل:** نمط الـ label على الحافة، و`border-strong`، و48px، و13px حدًا أدنى (ADR-0066 D6 وD1، وADR-0067 D5).
10. **Card:** `border-strong`، والسجلات الأربعة، وpadding 24 (ADR-0059، وADR-0066 D1).
11. **Nav:**
    - بنية اللوحات بحسب ADR-0062 D1.
    - إزالة خلفية النشط في `74:68`.
    - "AR \| EN" ← اسم الوجهة (ADR-0061 D5).
    - ظل اللوحة ← `elevation.dropdown`.
    - الخط العربي ← Alexandria.
12. **شرائح Color System:** تصحيح المستطيلات والعناوين الـ hex في 9 سلالم.
13. **Typography:**
    - أوزان اللاتينية بحسب §4.4 (القرار D5).
    - `letter-spacing` للـ overline.
    - محاذاة العينة العربية لليمين.
    - إضافة أحجام Mobile.
14. **Button القانونية `2512:1144`:** إضافة حالة Loading، وحسم النوع "Secondary Accent" (القرار D3).
15. **أوصاف Load More وShare:** الـ focus = `focus.default`/`offset`، لا `brand-primary`.
16. **مكونات Data:** دليل غير لوني للميدالية، وأهداف 44px للـ chip والـ switcher، وأحجام نص ≥13px، والخط العربي في Stat Card.

### P3: توسيع التغطية

17. **الداش بورد والـ CMS:** frames لإطار التطبيق وثلاث شاشات مرجعية على الأقل (قائمة، ومحرر، وصلاحيات). **القرار D8.**
18. **Templates:** قالب `StaticPageScreen`، وقالب "تواصل معنا" المعتمد.
19. **درج التنقل عند 1024–1279px** (ADR-0062 البند المفتوح 4).
20. **استيراد مجموعة الأيقونات** (القرار D6).

---

## ٦. قائمة تحديثات الكود المقترحة

**مقترحة فقط، ولم يُنفَّذ منها شيء.** كل بند يحتاج موافقة ودورة TDD خاصة به.

### قبل ٢ أكتوبر: يمس صفحات مُسلَّمة أو الصفحات القادمة

| # | التحديث | السبب | الملفات | التكلفة |
|---|---|---|---|---|
| K1 | **مكوّن `Button` مشترك** بارتفاع 44px، وحالة Loading (`aria-busy`)، والـ lift، والألوان من `button.*` | شاشات النشر في الداش بورد (المرحلة 5 من صفحة الرئيس) ستضيف أزرارًا جديدة. بناؤها على 14 تنفيذًا منفصلًا يضاعف الانجراف. الفصل 6 §6.7 | ملف جديد في `apps/dashboard/src/components/ui/`، ثم استبدال الـ 16 موضعًا | M. **مشروط بالقرارين D2 وD3** |
| K2 | **منطقة لمس 44px لروابط التواصل في الـ footer** مع بقاء الرسم 32px | الـ footer في كل صفحة مُسلَّمة. الفصل 6 §6.7 | `apps/web/src/components/layout/site-footer.tsx:134` | S. **مشروط بالقرار D7** |
| K3 | **مكوّن Toast** بحسب الفصل 8 L4 (طابور حده 3، وإخفاء بعد 4–6 ثوانٍ، ودخول وخروج 150–220ms، و`aria-live`) | مطلوب لتغذية النشر والمراجعة في الداش بورد (§٧) | جديد في `apps/dashboard` | M |
| K4 | **عارض النص المنسق للموقع العام** بقواعد §4.6: سطر 65–75 حرفًا للعربية، ولا تبرير، ولا italic للعربية | صفحة الرئيس (PM-D26: السطر في Figma 150–170 حرفًا) | جديد في `apps/web` | M |
| K5 | **توثيق `surface.skeleton` = nw.150** في الفصل 7، وتعليق في `colors.light.json` | فجوة توثيق حقيقية: 42 موضعًا يعتمد على قيمة بلا مرجع | `docs/design-system/07-Semantic-Tokens-Theming.md`، و`tokens/semantic/colors.light.json` | S |
| K6 | **ملاحظة في الفصل 4 §4.4:** "Black" للاتينية يُرسم 700، لأن IBM Plex Sans المتغير يقف عند 700 | التوثيق يَعِد بما لا يمكن رسمه | `docs/design-system/04-Typography.md` | S. **مشروط بالقرار D5** |

### قبل ٦ نوفمبر

| # | التحديث | السبب | التكلفة |
|---|---|---|---|
| K7 | **توحيد مصدر الأيقونات وسماكتها:** 8 ملفات بسماكات 1.5 و1.6 و1.8 و2 | CMP-ICON-001. **مشروط بالقرار D6** | M |
| K8 | **تحديث CMP-BUTTON-001 في الفصل 8 L1:** Primary = `brand.primary` (ADR-0051)، والأحجام بحسب القرار D2، والأنواع بحسب D3 | التوثيق يناقض ADR-0051 والفصل 6 | S |
| K9 | **تصحيح مرجع WCAG في تعليقات `forms.css`:** 2.5.8 ← 2.5.5 والفصل 6 §6.7 (C3) | دقة المرجع | S |
| K10 | **الصورة الرمزية والمنصب في بطاقة عضو المجلس،** إن وفّر الـ API المنصب | `avatar.fallback-*` معرّفة وبلا استخدام | S |

### لاحقًا: مع بناء صفحاتها

| # | التحديث | ملاحظة |
|---|---|---|
| K11 | بطاقات النادي، واللجنة، والوثيقة، والرياضي، والتحريرية، وResult Row، وView Switcher، وFilter Chip | تُبنى من Figma **بعد** تصحيحات Back-Sync P2 (البند 16)، لا منه كما هو |
| K12 | أقسام الرئيسية الـ 13 | مؤجلة بقرار المالك. R7 وPB-GAP مفتوحان |
| K13 | `accent.category.*` | بحسب القرار D4 |

---

## ٧. أثر النتائج على الصفحات القادمة

### ٧.١ صفحة "كلمة الرئيس" (`/about/president`)

المواصفات الكاملة وقراراتها المفتوحة في `docs/design-specs/page-president-message.md` §7. هنا فقط ما يخص الـ design system.

| الجزء | الجاهز | الناقص |
|---|---|---|
| **Hero** | `apps/web/src/components/ui/page-hero.tsx`: سجلات ADR-0059، والـ motif في عمود مستقل (ADR-0066 D5)، وصورة hero، و`fillsFirstScreen` | لا نمط لصورة شخصية مقطوعة (portrait cut-out) فوق الـ hero. عيوب Figma PM-D19 (نص على صورة بلا scrim) وPM-D21 (الصورة تغطي العنوان على الموبايل) تعني أن التصميم نفسه لا يُنقل كما هو |
| **الاقتباس (pull-quote)** | الألوان موجودة: `color.green.50` للخلفية و`color.green.500` للإطار (PM-D13 أثبت أن `#e8f5ed` = green-50) | **لا مكوّن اقتباس** في Figma الـ design system ولا في الكود. **حجم الخط 22px خارج السلّم،** وهو قرار مفتوح في المواصفات §7.5.1 (نمط PB-GAP). وطبقة الزينة تغطي النص (PM-D18) |
| **النص المنسق** | الأحجام وارتفاع السطر (`text-body` 1.6) والعائلات صحيحة ومتطابقة بين Figma والكود | **لا عارض rich text في `apps/web`، ولا محرر في `apps/dashboard`، ولا Tiptap في الـ dependencies.** قرار شريط الأدوات مقابل §4.6 (لا تبرير ولا italic للعربية) مفتوح. قياس السطر (PM-D26) يحتاج قرار المواصفات §7.5.3 |
| **قسم القيم** | `ui/card.tsx` بسجلاته، و`.lift`، وسابقة صفحة أعضاء المجلس | **مصدر الأيقونات غير محسوم** (§٣.١، والقرار D6)، وPM-D23 وجد خمسة ألوان أيقونات من لوحة Tailwind الافتراضية. **سجل الخلفية** (`#0d1f12` في Figma لا يطابق أي سجل) قرار مفتوح في المواصفات §7.5.2. **بطاقة على سجل ملوّن** مدعومة في `Card` (`register`) |

**الخلاصة:** الـ hero والبطاقة جاهزان. الاقتباس والنص المنسق يحتاجان مكوّنين جديدين وقرارين. الأيقونات تنتظر القرار D6.

### ٧.٢ نظام الـ toasts في الداش بورد

- **الجاهز:**
  - السلوك موثق بالكامل في الفصل 8 L4: التصعيد، والطابور حده 3، و4–6 ثوانٍ، و150–220ms، ولا يبقى بعد إعادة التحميل.
  - `zIndex.toast = 600`.
  - `motion.transition.enter/exit`.
  - `aria-live="polite"` مستخدم في 7 مواضع، و`role="status"` أو `role="alert"` في 4 (نمط موجود).
- **الناقص:**
  - **لا مكوّن Toast في الكود،** ولا في Figma (0 نتائج لكلمة toast في `apps/`).
  - الإشارة الوحيدة في Figma: وصف Share ("تم نسخ الرابط")، وقسم "States & Feedback" في frame الـ V2 غير المعتمد، بألوان خارج الـ tokens.
  - **فجوة tokens:**
    - `semantic.warning` (`#D09E07`) لا يصلح نصًا: 2.45:1، كما يسجل `auth/status-message.tsx:24` و`admin/stat-tiles.tsx`.
    - الـ token المقترح `semantic.error-text` (ADR-0067 §D8، بحسب تعليق `forms.css`) لم يُنشأ: 0 نتائج في `tokens/`.
    - toast بأربع حالات يحتاج أزواج "خلفية + نص" مقاسة لكل حالة، مثل `success.50` مع `success.700`. **هذه إضافة tokens تحتاج ADR** (الفصل 3 §3.5.1).

### ٧.٣ محرر النصوص في الـ CMS

- **الجاهز:**
  - الحقل الموحد (`forms.css`، وADR-0067 D5).
  - `admin/bilingual-field.tsx`.
  - `admin/pages/page-editor.tsx` و`media-picker.tsx`.
  - الأزرار عبر `button.*` tokens.
- **الناقص:**
  - محرر rich text بالكامل: لا مكتبة، ولا frame في Figma (صفحتا 09 و10 غير موجودتين).
  - أيقونات شريط الأدوات تعتمد على القرار D6.
  - أزرار الشريط يجب ألا ترث مشكلة 40px (القرار D2).
  - قرار الأدوات (Tiptap الكامل مقابل §4.6) مفتوح.
  - نظام الـ toasts لتغذية الحفظ والنشر (§٧.٢).

---

## ٨. قرارات مطلوبة منك

القرارات المفتوحة سابقًا لا تُكرَّر هنا: PB-GAP، وحجم الاقتباس 22px، وTiptap مقابل §4.6، وبنود المواصفات §7.5. هذه القرارات الجديدة التي كشفتها المراجعة:

| # | القرار | الخيارات | توصيتي | السبب |
|---|---|---|---|---|
| **D1** | مصير frames الـ V2 الأربعة | (أ) حذفها. (ب) إبقاؤها موسومة "استكشاف غير معتمد". (ج) اعتماد أجزاء منها بـ ADR | **(ب)** عند فتح الملف، وإزالة شارتي "SOURCE OF TRUTH" و"CANONICAL" | لا Variables فيها، وخطها Inter، وتناقض ADR-0051 في ثلاثة مواضع (Destructive بالأحمر المؤسسي، وfocus أخضر، وإطار خطأ أحمر مؤسسي)، ونصها العربي مقصوص. فيها أفكار صالحة للنقاش: قائمة الحالات (loading/readonly/warning/success)، ومصفوفة Domain. الحذف يُضيّع هذه الأفكار، والإبقاء بلا وسم يُضلّل |
| **D2** | الارتفاع الافتراضي للأزرار | (أ) 40px كما في CMP-BUTTON-001 (الوضع الحالي للداش بورد). (ب) 44px كما في الفصل 6 §6.7 وButton القانونية في Figma. (ج) 44px افتراضيًا مع حجم أصغر مسموح في الجداول الكثيفة فقط، باستثناء موثَّق | **(ب)**، وتعديل L1 بـ ADR | §6.7 نص إلزامي (MUST) في فصل إمكانية الوصول، وهو أعلى في معايير الحكم من التناسق. Figma القانونية وweb يطبقان 44 أصلًا. (ج) لا يُعتمد إلا إذا ظهرت حاجة فعلية في جدول، لا تحسبًا |
| **D3** | أنواع الأزرار | (أ) أنواع Figma الخمسة كما هي. (ب) الأربعة: Primary، وSecondary، وTertiary، وDestructive، **بلا** Secondary Accent. (ج) الخمسة مع حصر Secondary Accent في استخدام حملات موثق | **(ب)** | الأنواع الأربعة تغطي كل ما في الكود اليوم. زر CTA أحمر يمس ADR-0050/0051 (الأحمر محدود، وليس للـ CTA العام). إن ظهرت حاجة لحملة، يُفتح ADR حينها |
| **D4** | `accent.category.championship/news/media` (ADR-0053، في Figma فقط) | (أ) إضافتها إلى `brand.json` الآن. (ب) تأجيلها حتى تُبنى أقسام الرئيسية التي تستخدمها. (ج) إلغاؤها لصالح `category.1–5` | **(ب)** | ADR-0065 يمنع دمجها مع السلّم التصنيفي بلا قرار. استخدامها الوحيد صور placeholder في أقسام لم تُبنَ. إضافتها الآن token بلا مستهلك (الفصل 3: الـ tokens غير المستخدمة أقل من 5%) |
| **D5** | أوزان الخط الإنجليزي | (أ) كما في الكود: وزن واحد لكل مستوى، و"Black" يُرسم 700. (ب) كما في Figma: اللاتينية أخف بدرجة | **(أ)**، مع ملاحظة في §4.4 (K6) | §4.4 لا يعرف وزنين. خيار Figma غير موثق في أي مكان، ويجعل العناوين الإنجليزية Medium بجوار عربية Black، وهذا فرق هرمي ظاهر في الصفحات ثنائية اللغة |
| **D6** | مصدر الأيقونات | (أ) Lucide بسماكة 1.5 (نص CMP-ICON-001). (ب) الأيقونات المرسومة في Figma (social، وعناصر الواجهة، و14 أيقونة رياضية). (ج) Lucide لعناصر الواجهة، والمرسومة للرياضة والمنصات | **(ج)** | Lucide لا يحوي أيقونات تخصصات ألعاب القوى ولا شعارات المنصات، ومجموعة Figma الرياضية مصممة لهذا الغرض. عناصر الواجهة (chevron، وبحث، وعين) تستفيد من مكتبة مصانة. **مطلوب قبل** قسم القيم في صفحة الرئيس ومحرر الـ CMS |
| **D7** | روابط التواصل في الـ footer (32px في التصميم المعتمد) | (أ) إبقاء 32px. (ب) رسم 44px. (ج) رسم 32px مع منطقة لمس 44px | **(ج)** | يحفظ التصميم المعتمد ويحقق §6.7. تكلفته S ولا يغير المظهر |
| **D8** | نطاق الداش بورد والـ CMS في Figma | (أ) رسم كامل عند فتح الملف. (ب) الكود هو المرجع للداش بورد، وFigma يأخذ الإطار وثلاث شاشات مرجعية فقط. (ج) لا شيء | **(ب)** | الداش بورد مبني ومحمي باختبارات. رسمه كاملًا في ملف لا يُحرَّر اليوم عمل كبير (L) بلا مستهلك. الشاشات المرجعية تكفي لتصميم الشاشات الجديدة (النشر، ومحرر الرئيس) بلغة واحدة |
| **D9** | تأكيد `surface.skeleton` = nw.150 (Light) | (أ) تأكيده وتوثيقه. (ب) إعادته إلى nw.100 كما في Figma | **(أ)** | nw.100 صار قيمة `sunken` بعد ADR-0059، فيختفي الـ skeleton على الأسطح الغائرة. هذا تأكيد لنتيجة لازمة، لا قرار تصميم جديد |

---

## ملحق: ما لم تشمله الجولة

- **صفحة `✅ 00 - Homepage` (`146:5`)** و**`🎨 Visual Assets & Brand Files` (`97:1116`):** خارج قائمة الموجز. الرئيسية لها تقارير امتثال خاصة (CLAUDE.md §27).
- **البنود المفتوحة R7 (TOOLING BLOCKED) وPB-GAP (DESIGN SYSTEM GAP):** لم يُعَد تدقيقها، بحسب §27.
- **الـ collection المسماة Brand في Figma** (المذكورة في ADR-0053): لم تُقرأ مباشرة. `get_variable_defs` يعيد ما هو مربوط داخل الـ node المطلوب فقط، ولم يظهر منها في الـ Sections المقروءة إلا `accent-information`.
- **الوضعان الغامق والتباين العالي للمكونات:** مكونات Figma كلها مرسومة بالوضع الفاتح فقط. المقارنة في الوضعين اقتصرت على الـ tokens.
- **السلوك الحي في المتصفح:** غير متاح في هذه الجولة (قراءة فقط، والـ MCP الخاص بالمتصفح غير متصل).

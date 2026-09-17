# برومبتات صور الهيرو — الصفحة الرئيسية

**التاريخ:** 2026-09-16 (إعادة كتابة كاملة بالاتجاه الفني الجديد)
**لمن:** محرر المحتوى الذي يولّد صور الهيرو في Midjourney أو ChatGPT ويرفعها إلى المكتبة
**الحالة:** مسودة عمل. النصوص كلها **مقترحة**، والصور لم تُولَّد بعد
**المصدر:** توجيه المالك الفني بتاريخ 2026-09-16، وقرار المالك §١٨ بند ٤ و٨ في `docs/plans/homepage-hero-design.md`

خمس شرائح، خمس تخصصات لا تتكرر: **السرعة · الحواجز · الوثب الطويل · رمي الرمح ·
المسافات الطويلة**. لكل شريحة أربعة برومبتات جاهزة للنسخ (عريضة وطولية، بنسختي
Midjourney وGPT Image)، وسطر سلبي، ووضع القلب المقترح، وقائمة فحص.

الملف لا يولّد صورًا ولا يعتمد نصوصًا. كل ما عليه وسم «مقترح» ينتظر الاتحاد.

---

## ١. ما تغيّر، وما يحكم هذا الملف

### ١.١ الاتجاه الملغى

**أُلغي** الاتجاه السابق: «خطوط الشعار طبقة كود فوق الصورة، والصورة تُكوَّن لقطر
45° يكمّلها» (قرار المالك §١٨ بند ٥ بقدر ما يخص الصور). **الهوية الآن داخل الصورة
نفسها.** فلا تطلب في أي برومبت قطرًا بـ45°، ولا خطوط مضمار صاعدة، ولا «زاوية
ارتقاء». أثر هذا الإلغاء على الكود القائم مسألة مفتوحة، انظر م-٣ في §٩.

### ١.٢ الاتجاه المعتمد (المالك، 2026-09-16، ملزم)

| البند | التوجيه |
| --- | --- |
| الهوية | **مسحوق/غبار ناعم بألوان علم الإمارات** (أحمر، أخضر، أبيض، أسود) ينفجر أو يمتد خلف الرياضي مع حركته |
| الطقم | طقم بطابع المنتخب الوطني: **أساس أبيض مع لمسات حمراء وخضراء**. **بلا كتابة، بلا أرقام، بلا شعارات، بلا أعلام** على الطقم |
| الأشخاص | **ليسوا أشخاصًا حقيقيين** ولا يمكن التعرف عليهم |
| الرياضيات | طقم محتشم: **أكمام طويلة، وبنطال ضيق بطول الساق كاملًا** |
| المكان | طابع إماراتي: **ملعب حديث عند الغروب بضوء ذهبي**، أو **أفق مدينة بعيد**. **لا أشجار غابات، لا سيارات، لا أعلام دول أخرى، لا جمهور مزدحم** |
| الأسلوب | حملة رياضية فاخرة: **زاوية كاميرا منخفضة، إضاءة حافّة (rim light)، عمق ميدان، رياضي حاد الوضوح** |
| الثلث الهادئ | العريضة (العربية هي الأصل): **الثلث الأيمن** مظلم، ناعم، بلا أشخاص، بلا تفاصيل. الطولية: **الثلث السفلي** هادئ |
| الكتابة | **لا نص في أي مكان من الصورة** |
| القلب | آمنة للقلب (`ltrImageMode = mirror`) ما لم يُذكر غير ذلك في الشريحة |
| المقاسات | عريضة 16:9 ≥ 3840×2160 · طولية 9:16 ≥ 1080×1920 |

### ١.٣ قواعد قائمة ما زالت سارية

| القاعدة | مصدرها |
| --- | --- |
| الأحمر الرسمي `#C8102E` والأخضر الرسمي `#00843D`، ولا يُستعمل لون «قريب» منهما | ADR-0059 §D7.2. الرمزان: `--color-brand-secondary` / `--color-red-500`، و`--color-brand-primary` / `--color-green-500` |
| كل صورة تُثبت أنها ألعاب قوى، ولا وجوه يمكن التعرف عليها، ولا شعارات جهات أخرى | `docs/engineering/page-building-guide.md` §٨، القاعدة ٢ |
| النص البديل يُكتب من الصورة نفسها بعد توليدها، باللغتين | `page-building-guide.md` §٨، القاعدة ٦ |
| يجوز قلب الصورة الفوتوغرافية، ولا يُقلب أبدًا شعار أو علم أو علامة هوية | `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §٩ |
| تباين كل نص فوق الصورة ≥ 4.5:1 | قرار المالك §١٨ بند ٧ |
| القلب بثلاثة أوضاع `same · mirror · separate`، والافتراضي `mirror`. `separate` يتطلب `ltrImageAssetId` و`ltrFocalPoint` | قرار المالك §١٨ بند ٤، و`LTR_IMAGE_MODES` في `hero-slides.schema.ts` |

---

## ٢. القلب: متى تكون الصورة آمنة له

**ما يفعله الموقع:** في الإنجليزية تُقلب **الصورة العريضة** أفقيًا (`.hero-mirror`
في `apps/web/src/styles/motion.css`، يطبّقها `hero-picture.tsx`). **الصورة الطولية
لا تُقلب أبدًا** تحت عرض 640px، وتخدم اللغتين كما هي.

**تعريف «آمنة للقلب»:** لا شيء في الصورة يصير **مزوَّرًا** إذا انعكس: علم، أو
كتابة، أو أرقام، أو مَعلم معروف، أو شعار.

**لماذا المسحوق والطقم آمنان للقلب:**

- **المسحوق** سحابة عضوية بلا ترتيب. انعكاسها سحابة أخرى صحيحة. **الشرط الوحيد:**
  ألا تنتظم الألوان في **أشرطة تشبه العلم** (شريط أحمر عمودي بجانب أشرطة أفقية
  أخضر/أبيض/أسود). علم ضمني منتظم يصير علمًا مقلوبًا بعد القلب. لذلك تقول كل
  البرومبتات: *loose organic cloud, colours mixed, not arranged in stripes or bands*.
- **الطقم** أبيض بلمسات حمراء وخضراء، بلا كتابة ولا رقم ولا شعار. انعكاسه طقم صحيح.
  **الشرط:** ألا تتحول اللمسات إلى **لوحة علم** على الصدر أو الكتف.
- **الملعب** بلا لوحات ولا لافتات ولا أرقام حارات. انعكاسه ملعب صحيح.
- **أفق المدينة** آمن **فقط** إن كان عامًّا ضبابيًا بلا برج يمكن التعرف عليه. برج
  معروف مقلوب مَعلم مزوَّر: **أعد التوليد** بدل تغيير الوضع.

**اتجاه الحركة:** في النسخة العربية يتجه الرياضي **نحو اليمين** (نحو الثلث الهادئ
حيث يبدأ النص)، والمسحوق يمتد **خلفه نحو اليسار**، أي بعيدًا عن النص. بعد القلب في
الإنجليزية يتجه يسارًا نحو النص الإنجليزي، والمسحوق يمتد يمينًا بعيدًا عنه. هذا ما
يجيزه البروتوكول §٩ («visual movement → text»)، ويُبقي الثلث الهادئ نظيفًا من الغبار
في اللغتين.

---

## ٣. الإطار — ASCII

### ٣.١ العريضة 16:9 (النسخة العربية هي الأصل)

```text
 x: 0%              30%                    65% 67%            100%
    +----------------+----------------------+-+-----------------+  y: 0%
    |                |                      | |                 |
    |  POWDER TRAIL  |    ATHLETE           | |   CALM THIRD    |  y: 20%
    |  red / green / |    sharp, low angle, | |   dark, soft    |
    |  white / black |    rim light         | |   no people     |
    |  <<< behind    |    moving  --->      | |   no detail     |
    |  the athlete   |                      | |   no powder     |
    |  (may crop)    |                      | |   no sun disc   |
    |                |                      | |   [AR text]     |  y: 80%
    |                |                      | |   (text sits    |
    |                |                      | |    at bottom)   |
    +----------------+----------------------+-+-----------------+  y: 100%
                     |<-- centre safe band 30%-65% -->|
```

- **الثلث الأيمن (67%–100%)** مظلم هادئ بلا أشخاص ولا مسحوق ولا تفاصيل. النص العربي
  مثبّت في **أسفل** جهة البداية (`items-end` في `hero.tsx`)، فالنصف السفلي من هذا
  الثلث أهم ما يكون هادئًا.
- **الثلث الهادئ ليس أسطع جزء في الصورة:** الشمس الغاربة خلف الرياضي في الثلثين
  الأيسرين (فتصنع إضاءة الحافّة)، لا خلف النص.
- **جسد الرياضي بين 30% و65% من العرض، وبين 20% و80% من الارتفاع.** المسحوق يجوز أن
  يمتد إلى 0%–30%، فهو يتحمل القص.

**لماذا الحزام المركزي:** الهيرو يملأ الشاشة الأولى ناقص الهيدر، والصورة تُقصّ
بـ`object-fit: cover` حول نقطة التركيز (`hero-picture.tsx`). من ارتفاعات الهيرو
المقيسة في §٢٤ من خطة الهيرو، مع نقطة تركيز في المنتصف:

| الشاشة | إطار الهيرو | ما يبقى ظاهرًا من الصورة |
| --- | --- | --- |
| 1920×1080 | 1920×984 | العرض كاملًا · **91%** من الارتفاع |
| 1440×900 | 1440×804 | تقريبًا كاملة |
| 1366×650 | 1366×554 | العرض كاملًا · **72%** من الارتفاع فقط |
| 1024×768 | 1024×672 | **86%** من العرض · الارتفاع كاملًا |
| 768×1024 | 768×928 | **47%** من العرض فقط · الارتفاع كاملًا |

الأرقام **محسوبة لا مقيسة** (م-٧)، والهوامش أعلاه أوسع من الحساب عمدًا.

### ٣.٢ الطولية 9:16 (الموبايل، لا تُقلب)

```text
    x: 0%    10%                    90%  100%
       +------+----------------------+----+  y: 0%
       |   powder trail  <<<              |
       |        ATHLETE  --->             |  y: 10%
       |        sharp, low angle,         |
       |        rim light, sunset         |
       |                                  |
       |                                  |  y: 62%
       +----------------------------------+  y: 67%
       |      CALM BOTTOM THIRD           |
       |      dark ground in shadow,      |
       |      no people, no powder,       |
       |      no detail                   |
       |      [text + event card +        |
       |       controls]                  |
       +----------------------------------+  y: 100%
```

- الموقع يأخذ الطولية تحت عرض 640px (`<source media>` في `hero-picture.tsx`).
- **الرياضي والمسحوق بين 10% و62% من الارتفاع، وبين 10% و90% من العرض.**
- **الثلث السفلي هادئ مظلم**: فيه النص وبطاقة الحدث والأدوات (قرار §٢٤).
- **لا تُقلب**، فكل ما فيها يجب أن يكون صحيحًا كما هو في اللغتين.

---

## ٤. المواصفات الفنية

| البند | العريضة | الطولية |
| --- | --- | --- |
| النسبة | 16:9 | 9:16 |
| الحد الأدنى | **3840×2160** (8.3 ميغابكسل) | **1080×1920** (2.1 ميغابكسل) |
| ملف الرفع | **JPEG** بجودة 90–92، sRGB | **JPEG** بجودة 90–92، sRGB |
| سقف الرفع | 10 MB · 25 ميغابكسل · PNG أو JPEG أو WebP فقط | نفسه |
| ما يطلبه الموقع | `f_auto,q_auto,w_…` بعروض 384 · 640 · 768 · 1024 · 1280 · 1536 · 1920 · **2560** | العروض ≤ 1080، أي حتى **1024** |
| الهدف بعد التحسين (مقترح) | ≤ 300 KB عند `w_1920` · ≤ 550 KB عند `w_2560` | ≤ 280 KB عند `w_1024` |

**مصدر السقف:** `MAX_UPLOAD_BYTES = 10 MB` و`MAX_PIXELS = 25,000,000` و`ACCEPTED_TYPES`
في `api/src/modules/media-center/media-assets/upload/upload-constraints.ts`.

**لماذا JPEG لا PNG:** PNG فوتوغرافي بمقاس 3840×2160 يتجاوز 10 MB في الغالب. **هذا
تقدير، لم يُقَس.** احتفظ بملف المولّد الأصلي خارج الموقع.

**ما يصل إلى الزائر:** الموقع لا يرسل الملف المرفوع. `cloudinary-loader.ts` يكتب
`f_auto,q_auto,w_<العرض>` في الرابط، فتختار Cloudinary الصيغة والجودة.
و`cloudinary-srcset.ts` يعرض عروض `CDN_WIDTHS` مع `sizes="100vw"`، ويحذف كل عرض
يتجاوز عرض الأصل. **أكبر ما يُطلب 2560px.** الأصل بـ3840 هامش لإعادة القص ونقل
نقطة التركيز دون تكبير.

**من أين جاء الهدف:** المثال الوحيد المقيس في الكود أن `contact-hero` (1536×672، PNG
بحجم 1,639,225 بايت) يصل WebP بحجم **150,658 بايت** بـ`f_auto,q_auto`، أي نحو 0.15
بايت لكل بكسل. **الهدف مشتق من هذا المثال، وليس ميزانية معتمدة.**
- **التحقق:** اطلب رابط الأصل بـ`f_auto,q_auto,w_1920` واقرأ `Content-Length`.
- **تنبيه خاص بهذا الاتجاه:** المسحوق الناعم تفاصيل دقيقة كثيرة، وهو أثقل ما يكون
  على الضغط. الثلث الهادئ النظيف يعوّض بعض الوزن. إن تجاوزت الهدف، فالسبب غالبًا
  حبيبات المسحوق أو ضجيج الخلفية.

### ٤.١ مقاس ما يُخرجه المولّد

المولّدان لا يُخرجان في الغالب 3840×2160 مباشرة، **ولم يُتحقق من مقاساتهما في هذه
المهمة** (انظر م-١١):

- **Midjourney:** ولّد بـ`--ar 16:9`، ثم استعمل الـUpscale داخل Midjourney، ثم
  افحص المقاس الفعلي للملف.
- **ChatGPT / GPT Image:** قد لا يتيح نسبة 16:9 أو 9:16 بالضبط. لذلك تطلب
  برومبتات GPT في هذا الملف تكوينًا **يتحمل القص إلى 16:9**: لا شيء مهم عند الحافتين
  العليا والسفلى.
- **إن كان المقاس أصغر من المطلوب:** قصّ إلى النسبة أولًا، ثم كبّر بمكبّر **أمين**
  (لا «إبداعي»)، ثم أعد الفحص بحثًا عن حروف أو أطراف أو تفاصيل اختُرعت أثناء
  التكبير. المسحوق تحديدًا قد يتحول عند التكبير الإبداعي إلى أشكال أو «كتابة».

### ٤.٢ قاعدة الرفع: كل صورة مولَّدة «مؤقتة»

**كل صورة من هذا الملف تُرفع بـ`isAiGenerated = true`.** لا يصل الوسم إلى الزائر: لا
نص ولا شارة ولا سمة في HTML العام، ويحرس ذلك `media-asset-provenance.spec.ts` (قرار
المالك §١١).

**ما صار ممكنًا (2026-09-16):** `UploadMediaAssetDto.isAiGenerated` يقبل الكلمتين
`true` و`false` كنص في طلب multipart على `POST /media-assets/upload`، و`uploadAndCreate`
يحفظه (`dto.isAiGenerated ?? false`). أي قيمة غير الكلمتين يرفضها `@IsBoolean()`.

**ما زال ناقصًا — اقرأه قبل الرفع:**

- **الافتراضي `false`.** إن لم تُرسل `isAiGenerated=true` صراحةً، دخلت الصورة
  المكتبة بلا وسم.
- **لا مسار تعديل** لأصل مرفوع (لا `PATCH` ولا `PUT` في `media-assets.controller.ts`).
  صورة رُفعت بلا وسم لا يُصلح وسمها إلا بحذفها ورفعها من جديد.
- **شارة «مؤقتة» والفلتر غير مبنيين** في `apps/dashboard/src`، ولا يظهر الحقل فيه
  أصلًا. فالوسم اليوم لا يُضبط من نموذج رفع الداشبورد، ولا يُرى فيه بعد الرفع.

---

## ٥. كيف تستعمل البرومبتات

### ٥.١ Midjourney

- الصق سطر Midjourney **كما هو**، سطرًا واحدًا، فالمعاملات في آخره: `--ar` للنسبة،
  و`--style raw` لتقليل «تجميل» Midjourney، و`--v 7` للإصدار، و`--no` لقائمة
  الممنوعات.
- Midjourney لا يفهم النسب المئوية جيدًا، لذلك يصف السطر الثلث الهادئ بالكلمات.
- ولّد عدة نسخ، واختر التي يكون ثلثها الأيمن **أنظف**، لا التي يكون رياضيها أجمل.
- **لم يُتحقق** من أن كل المعاملات تعمل كما هي في حسابك وإصدارك الحالي (م-١١).

### ٥.٢ ChatGPT / GPT Image

- الصق نص GPT كاملًا. هو مكتوب بلغة طبيعية مفصّلة، لأن هذا النوع من المولّدات يتبع
  التعليمات الصريحة عن التكوين والممنوعات أكثر من الكلمات المفتاحية.
- ليس فيه خانة سلبية منفصلة، فالممنوعات مكتوبة داخل النص في فقرة `Avoid:`.
- إن خرجت الصورة بكتابة أو شعار، اطلب في المحادثة نفسها تعديلًا محددًا («remove all
  text from the kit»)، ثم أعد الفحص كاملًا: التعديل قد يغيّر غير ما طلبت.

### ٥.٣ تحذير: أسماء العلامات التجارية داخل البرومبت

مثالا المالك يذكران «Nike/Olympics campaign look». **في البرومبتات النهائية كتبنا
بدلًا منها `premium global sports-brand campaign look`.** السبب في سطر: اسم علامة
تجارية داخل البرومبت يدفع المولّد نحو شعارها أو تصميمها المحمي (مثل الـswoosh أو
الحلقات الأولمبية) فيظهر على الطقم أو الخلفية. **هذا تحذير مسجّل، لا قرار محسوم**
(م-٨).

### ٥.٤ السطر السلبي الأساسي

كل شريحة أدناه لها سطر سلبي كامل جاهز. هذا أساسها المشترك، للرجوع إليه فقط:

```text
text, letters, words, numbers, typography, race bib, lane numbers, scoreboard, signage, banners, advertising boards, watermark, signature, logo, brand logo, swoosh, emblem, crest, flag, national flag, flag pattern, flag-like stripes, powder arranged in bands, Olympic rings, real person, celebrity, recognisable face, close-up portrait, revealing clothing, bare midriff, crop top, trees, forest, cars, vehicles, crowd, spectators, audience, people in the background, holi festival, colour run event, smoke grenade, sun in the text area, illustration, CGI, 3D render, cartoon, painting, anime, plastic skin, oversaturated, HDR halo, extra limbs, deformed hands, distorted anatomy, duplicated athlete, blurry athlete, low resolution, compression artefacts, frame border
```

**لماذا `holi festival, colour run event, smoke grenade`:** مسحوق ملوّن حول شخص يُحيل
المولّدات في الغالب إلى مهرجان الألوان أو سباقات «Color Run» أو قنابل الدخان، وكلها
تُفسد طابع الحملة الرياضية.

**لماذا `flag-like stripes, powder arranged in bands`:** انظر §٢؛ علم ضمني يُزوَّر بالقلب.

---

## ٦. قائمة القلب المشتركة (تُطبَّق على كل شريحة `mirror`)

قبل ضبط `mirror` على أي شريحة:

- [ ] لا كتابة ولا حرف ولا رقم في أي مكان، ولا حتى في الخلفية المموّهة.
- [ ] لا شعار على الطقم أو الحذاء أو الأداة.
- [ ] لا علم، ولا لوحة ألوان على الطقم تشبه العلم.
- [ ] المسحوق مختلط الألوان، لا أشرطة منتظمة.
- [ ] لا مَعلم أو برج يمكن التعرف عليه.
- [ ] **اقلب الصورة بنفسك في أي عارض** وانظر: الثلث **الأيسر** بعد القلب مظلم هادئ،
  والرياضي يتجه يسارًا نحو النص الإنجليزي.

---

## ٧. الشرائح الخمس

### ٧.١ السرعة — انطلاقة عدّاء

#### النص — «مقترح — بانتظار اعتماد الاتحاد»

| الحقل | العربية | English |
| --- | --- | --- |
| سطر تمهيدي | اتحاد الإمارات لألعاب القوى | UAE Athletics Federation |
| العنوان | السرعة تبدأ من خط الانطلاق | Speed starts at the line |
| النص | من الانطلاقة الأولى حتى خط النهاية، تابع نتائج سباقات السرعة في منافسات الدولة. | From the first stride to the finish line, follow sprint results from competitions across the Emirates. |
| الزر | النتائج والتصنيفات (18 حرفًا) | Results & rankings (18) |
| وجهته | `/results-rankings` | `/results-rankings` |

السطر التمهيدي على هذه الشريحة وحدها، كما في شريحة Figma الأولى (`2374:1203`).
الوجهة صفحة مبنية (`PUBLIC_PAGES`).

#### العريضة 16:9 — Midjourney

```text
cinematic sports photograph, explosive sprint start, a fictional male Emirati athlete, not a real or identifiable person, head down in the drive phase, pushing out of starting blocks on a red running track, modern open-air athletics stadium in the UAE at golden hour, athlete moving toward the right of the frame, a dramatic burst of fine powder dust in red, green, white and black trailing behind him to the left, loose organic cloud with colours mixed, not stripes, sleek national-team-style kit in white with red and green accents, plain fabric with no print, low camera angle at track level, telephoto lens, shallow depth of field, sharp athlete, golden rim light from the low sun behind him on the left, warm desert light, premium global sports-brand campaign look, athlete and powder in the left two-thirds, right third of the frame dark calm soft-focus empty stadium background, negative space, ultra detailed --ar 16:9 --style raw --v 7 --no text, letters, numbers, race bib, lane numbers, scoreboard, signage, advertising boards, watermark, logo, swoosh, emblem, flag, flag-like stripes, real person, recognisable face, other runners, trees, cars, crowd, spectators, holi festival, smoke grenade, illustration, CGI, 3D render, cartoon, extra limbs, deformed hands
```

#### العريضة 16:9 — GPT Image

```text
Create a cinematic, photorealistic sports photograph in a wide 16:9 landscape format, ultra high resolution.

Subject: an explosive sprint start. A single male athlete with an Emirati appearance — fictional, not a real or identifiable person — drives out of the starting blocks on a red running track. His head is down in the drive phase, so his face is turned toward the track, partly shadowed and not recognisable. He moves toward the right side of the frame.

Identity: behind him, a dramatic burst of fine powder dust in the colours of the UAE flag — red, green, white and black — trails from his movement toward the left of the frame. The powder is a loose, organic cloud with the colours mixed together; it must not form stripes, bands or any flag-like pattern.

Kit: a sleek national-team-style kit, white base with red (#C8102E) and green (#00843D) accents. Plain fabric: no text, no numbers, no logos, no flags, no brand marks on the kit, shoes or blocks.

Setting: a modern open-air athletics stadium in the United Arab Emirates at golden hour, warm desert light. The low sun is behind the athlete in the left part of the frame and creates a golden rim light around him. No trees, no cars, no flags of any country, no spectators.

Camera and style: low camera angle at track level, telephoto lens, shallow depth of field, the athlete tack sharp with motion energy, premium global sports-brand campaign look.

Composition (this is for a website hero with text over the image): the athlete and the powder occupy the left two-thirds of the frame; the athlete's body sits between 30% and 65% of the width and between 20% and 80% of the height. The RIGHT third of the frame is calm, dark, soft-focus stadium background with no people, no powder, no bright light and no detail — it is reserved for text. Keep all important content away from the top and bottom edges so the image can be cropped.

No text anywhere in the image.

Avoid: text, letters, numbers, race bib, lane numbers, scoreboard, signage, advertising boards, watermark, logos, emblems, flags, flag-like stripes, real or recognisable people, other runners, trees, cars, crowd, colour-festival look, smoke grenades, illustration, CGI, 3D render, extra limbs, deformed hands.
```

#### الطولية 9:16 — Midjourney

```text
cinematic sports photograph, vertical, explosive sprint start, a fictional male Emirati athlete, not a real or identifiable person, head down in the drive phase out of starting blocks on a red running track, modern athletics stadium in the UAE at golden hour, a burst of fine powder dust in red, green, white and black trailing behind him, loose organic cloud with colours mixed, not stripes, sleek national-team-style kit in white with red and green accents, plain fabric with no print, low camera angle, telephoto lens, shallow depth of field, sharp athlete, golden rim light, premium global sports-brand campaign look, athlete and powder in the upper two-thirds, bottom third of the frame dark calm empty track in shadow, soft focus, no detail --ar 9:16 --style raw --v 7 --no text, letters, numbers, race bib, lane numbers, scoreboard, signage, watermark, logo, swoosh, emblem, flag, flag-like stripes, real person, recognisable face, other runners, trees, cars, crowd, holi festival, smoke grenade, illustration, CGI, 3D render, extra limbs, deformed hands
```

#### الطولية 9:16 — GPT Image

```text
Create a cinematic, photorealistic sports photograph in a tall 9:16 portrait format for a mobile screen, high resolution.

Subject: a single male athlete with an Emirati appearance — fictional, not a real or identifiable person — drives out of the starting blocks on a red running track, head down so his face is not recognisable.

Identity: a burst of fine powder dust in red, green, white and black trails behind him from his movement, as a loose organic cloud with mixed colours — never stripes, bands or a flag-like pattern.

Kit: sleek national-team-style kit, white with red (#C8102E) and green (#00843D) accents, plain fabric with no text, numbers, logos or flags.

Setting: a modern open-air athletics stadium in the UAE at golden hour, low sun behind him creating a golden rim light. No trees, no cars, no flags, no spectators.

Camera and style: low angle, telephoto lens, shallow depth of field, sharp athlete, premium global sports-brand campaign look.

Composition (mobile website hero with text at the bottom): the athlete and the powder sit in the upper two-thirds, between 10% and 62% of the height and between 10% and 90% of the width. The BOTTOM third is calm, dark, empty track surface in shadow and soft focus, with no people, no powder and no detail. This image will never be mirrored.

No text anywhere in the image.

Avoid: text, letters, numbers, race bib, lane numbers, scoreboard, signage, watermark, logos, flags, flag-like stripes, real or recognisable people, other runners, trees, cars, crowd, colour-festival look, smoke grenades, illustration, CGI, extra limbs, deformed hands.
```

#### السطر السلبي

```text
text, letters, words, numbers, typography, race bib, lane numbers, lane number plates, starting block markings, scoreboard, signage, banners, advertising boards, watermark, signature, logo, brand logo, swoosh, emblem, crest, flag, national flag, flag pattern, flag-like stripes, powder arranged in bands, Olympic rings, real person, celebrity, recognisable face, close-up portrait, other runners, crowd, spectators, audience, trees, forest, cars, vehicles, holi festival, colour run event, smoke grenade, sun in the right third, illustration, CGI, 3D render, cartoon, painting, anime, plastic skin, oversaturated, HDR halo, extra limbs, deformed hands, distorted anatomy, duplicated athlete, blurry athlete, low resolution, compression artefacts, frame border
```

#### `ltrImageMode`: **`mirror`**

العدّاء يتجه يمينًا نحو النص العربي، وبالقلب يسارًا نحو النص الإنجليزي، والمسحوق
خلفه بعيدًا عن النص في اللغتين. لا شيء في الصورة يُزوَّر بالقلب إن خلت من أرقام
الحارات ومن كل كتابة.

#### قائمة فحص القلب

- [ ] القائمة المشتركة في §٦.
- [ ] لا أرقام على مكعبات الانطلاق ولا لوحات أرقام الحارات.
- [ ] لا عدّاء ثانٍ في الحارات المجاورة.
- [ ] الشمس خلف الرياضي في الثلثين الأيسرين، لا في الثلث الأيمن.

---

### ٧.٢ الحواجز — عدّاءة فوق الحاجز

#### النص — «مقترح — بانتظار اعتماد الاتحاد»

| الحقل | العربية | English |
| --- | --- | --- |
| سطر تمهيدي | — | — |
| العنوان | كل حاجز خطوة أعلى | Every hurdle, one step higher |
| النص | سرعة وإيقاع وجرأة في سباق واحد. تعرّف على تخصصات ألعاب القوى. | Speed, rhythm and nerve in a single race. Discover the disciplines of athletics. |
| الزر | استكشف التخصصات (15 حرفًا) | Explore disciplines (19) |
| وجهته | `/disciplines` | `/disciplines` |

الوجهة صفحة مبنية (`PUBLIC_PAGES`).

#### العريضة 16:9 — Midjourney

```text
cinematic sports photograph, a fictional female athlete, not a real or identifiable person, mid-stride over a hurdle, lead leg extended, athlete moving toward the right of the frame, modern athletics stadium in the UAE at dusk after sunset, modest national-team-style kit, long-sleeve fitted top and full-length leggings, white with red and green accents, plain fabric with no print, a soft swirling cloud of fine powder dust in red, green, white and black trailing behind her trailing leg to the left, loose organic cloud with colours mixed, not stripes, dramatic golden rim light, deep shadows, low camera angle, shallow depth of field, sharp athlete, premium global sports-brand campaign look, athlete and powder in the left two-thirds, right third of the frame dark calm soft-focus empty stadium background, negative space, ultra detailed --ar 16:9 --style raw --v 7 --no text, letters, numbers, race bib, lane numbers, scoreboard, signage, advertising boards, printed hurdle, watermark, logo, swoosh, emblem, flag, flag-like stripes, real person, recognisable face, short sleeves, bare arms, shorts, bare legs, other runners, trees, cars, crowd, holi festival, smoke grenade, illustration, CGI, 3D render, extra limbs, deformed hands
```

#### العريضة 16:9 — GPT Image

```text
Create a cinematic, photorealistic sports photograph in a wide 16:9 landscape format, ultra high resolution.

Subject: a single female athlete — fictional, not a real or identifiable person — mid-stride over a hurdle, lead leg extended, moving toward the right side of the frame. Her face is in profile and partly in shadow, not recognisable.

Kit: a modest national-team-style kit — long-sleeve fitted top and full-length leggings — white base with red (#C8102E) and green (#00843D) accents. Plain fabric: no text, no numbers, no logos, no flags, no brand marks on the kit or shoes. The hurdle is plain white and black with nothing printed on it.

Identity: a soft, swirling cloud of fine powder dust in the colours of the UAE flag — red, green, white and black — trails behind her trailing leg toward the left of the frame. The colours are mixed in a loose organic cloud; they must not form stripes, bands or a flag-like pattern.

Setting: a modern athletics stadium in the United Arab Emirates at dusk, the last golden light low behind her on the left. No trees, no cars, no flags of any country, no spectators.

Camera and style: low camera angle, dramatic rim light, deep shadows, shallow depth of field, the athlete tack sharp, premium global sports-brand campaign look.

Composition (website hero with text over the image): the athlete and the powder occupy the left two-thirds; her body sits between 30% and 65% of the width and between 20% and 80% of the height. The RIGHT third of the frame is calm, dark and empty — soft-focus stadium background with no people, no powder, no hurdles, no bright light and no detail — reserved for text. Keep important content away from the top and bottom edges so the image can be cropped.

No text anywhere in the image.

Avoid: text, letters, numbers, race bib, lane numbers, scoreboard, signage, printed hurdles, watermark, logos, flags, flag-like stripes, real or recognisable people, short sleeves, bare arms, shorts, bare legs, other runners, trees, cars, crowd, colour-festival look, smoke grenades, illustration, CGI, extra limbs, deformed hands.
```

#### الطولية 9:16 — Midjourney

```text
cinematic sports photograph, vertical, a fictional female athlete, not a real or identifiable person, mid-stride over a hurdle, modest national-team-style kit, long-sleeve fitted top and full-length leggings, white with red and green accents, plain fabric with no print, a soft swirling cloud of fine powder dust in red, green, white and black trailing behind her, loose organic cloud with colours mixed, not stripes, modern athletics stadium in the UAE at dusk, dramatic rim light, deep shadows, low camera angle, shallow depth of field, sharp athlete, premium global sports-brand campaign look, athlete and powder in the upper two-thirds, bottom third of the frame dark calm empty track in shadow, soft focus, no detail --ar 9:16 --style raw --v 7 --no text, letters, numbers, race bib, lane numbers, signage, printed hurdle, watermark, logo, swoosh, emblem, flag, flag-like stripes, real person, recognisable face, short sleeves, bare arms, shorts, bare legs, other runners, trees, cars, crowd, holi festival, smoke grenade, illustration, CGI, extra limbs, deformed hands
```

#### الطولية 9:16 — GPT Image

```text
Create a cinematic, photorealistic sports photograph in a tall 9:16 portrait format for a mobile screen, high resolution.

Subject: a single female athlete — fictional, not a real or identifiable person — mid-stride over a plain white hurdle, face in profile and shadow, not recognisable.

Kit: modest national-team-style kit — long-sleeve fitted top and full-length leggings — white with red (#C8102E) and green (#00843D) accents, plain fabric with no text, numbers, logos or flags.

Identity: a soft swirling cloud of fine powder dust in red, green, white and black trails behind her trailing leg, colours mixed in a loose organic cloud, never stripes, bands or a flag-like pattern.

Setting: a modern athletics stadium in the UAE at dusk, dramatic rim light, deep shadows. No trees, no cars, no flags, no spectators.

Camera and style: low angle, shallow depth of field, sharp athlete, premium global sports-brand campaign look.

Composition (mobile website hero with text at the bottom): the athlete, the hurdle and the powder sit in the upper two-thirds, between 10% and 62% of the height and between 10% and 90% of the width. The BOTTOM third is calm, dark, empty track in shadow and soft focus, with no people, no powder, no hurdles and no detail. This image will never be mirrored.

No text anywhere in the image.

Avoid: text, letters, numbers, race bib, lane numbers, signage, printed hurdles, watermark, logos, flags, flag-like stripes, real or recognisable people, short sleeves, bare arms, shorts, bare legs, other runners, trees, cars, crowd, colour-festival look, smoke grenades, illustration, CGI, extra limbs, deformed hands.
```

#### السطر السلبي

```text
text, letters, words, numbers, typography, race bib, lane numbers, printed hurdle, hurdle with text or logo, scoreboard, signage, banners, advertising boards, watermark, signature, logo, brand logo, swoosh, emblem, crest, flag, national flag, flag pattern, flag-like stripes, powder arranged in bands, Olympic rings, real person, celebrity, recognisable face, close-up portrait, short sleeves, sleeveless top, bare arms, shorts, bare legs, bare midriff, crop top, revealing clothing, other runners, fallen hurdles, crowd, spectators, audience, trees, forest, cars, vehicles, holi festival, colour run event, smoke grenade, sun in the right third, illustration, CGI, 3D render, cartoon, painting, anime, plastic skin, oversaturated, HDR halo, extra limbs, deformed hands, distorted anatomy, duplicated athlete, blurry athlete, low resolution, compression artefacts, frame border
```

#### `ltrImageMode`: **`mirror`**

العدّاءة والحاجز والمسحوق كلها بلا كتابة، فانعكاسها صحيح. الحركة نحو النص محفوظة
في اللغتين.

#### قائمة فحص القلب

- [ ] القائمة المشتركة في §٦.
- [ ] الحاجز بلا كتابة ولا شعار مطبوع.
- [ ] **الطقم محتشم فعلًا:** أكمام طويلة حتى المعصم، وبنطال حتى الكاحل. المولّدات
  تقصّرهما كثيرًا.
- [ ] لا حواجز ولا مسحوق في الثلث الأيمن.

---

### ٧.٣ الوثب الطويل — لحظة الطيران

#### النص — «مقترح — بانتظار اعتماد الاتحاد»

| الحقل | العربية | English |
| --- | --- | --- |
| سطر تمهيدي | — | — |
| العنوان | الارتقاء لحظة تصنعها سنوات | One leap, years in the making |
| النص | خلف كل قفزة سنوات من التدريب. اطّلع على الأرقام القياسية الوطنية في ألعاب القوى. | Behind every leap are years of training. See the national records in athletics. |
| الزر | الأرقام القياسية الوطنية (23 حرفًا) | National records (16) |
| وجهته | `/records` | `/records` |

الوجهة صفحة مبنية (`PUBLIC_PAGES`).

#### العريضة 16:9 — Midjourney

```text
cinematic sports photograph, a fictional male Emirati athlete, not a real or identifiable person, long jump in full flight just after take-off, legs driving forward, arms reaching, flying toward the right of the frame above the sand pit, face in profile and shadow, modern open-air athletics stadium in the UAE at sunset, golden light, a dramatic explosion of fine powder dust in red, green, white and black bursting from his take-off and trailing behind him to the left, mixed with a light spray of sand, loose organic cloud with colours mixed, not stripes, sleek national-team-style kit in white with red and green accents, plain fabric with no print, low camera angle from pit level, telephoto lens, frozen motion, shallow depth of field, sharp athlete, strong golden rim light from the low sun behind him, premium global sports-brand campaign look, athlete and powder in the left two-thirds, right third of the frame dark calm soft-focus empty stadium background, negative space, ultra detailed --ar 16:9 --style raw --v 7 --no text, letters, numbers, distance markers, measuring tape, race bib, scoreboard, signage, advertising boards, watermark, logo, swoosh, emblem, flag, flag-like stripes, real person, recognisable face, officials, trees, cars, crowd, holi festival, smoke grenade, illustration, CGI, 3D render, extra limbs, deformed hands
```

#### العريضة 16:9 — GPT Image

```text
Create a cinematic, photorealistic sports photograph in a wide 16:9 landscape format, ultra high resolution.

Subject: a single male athlete with an Emirati appearance — fictional, not a real or identifiable person — in full flight in the long jump, just after take-off, legs driving forward and arms reaching, flying toward the right side of the frame above the sand pit. His face is in profile and shadow, not recognisable.

Identity: a dramatic explosion of fine powder dust in the colours of the UAE flag — red, green, white and black — bursts from his take-off and trails behind him toward the left of the frame, mixed with a light spray of sand. The colours are mixed in a loose organic cloud; they must not form stripes, bands or a flag-like pattern.

Kit: sleek national-team-style kit, white base with red (#C8102E) and green (#00843D) accents. Plain fabric: no text, no numbers, no logos, no flags, no brand marks on the kit or shoes.

Setting: a modern open-air athletics stadium in the United Arab Emirates at sunset, golden light. The low sun is behind him in the left part of the frame, giving a strong golden rim light. No distance markers, no officials, no trees, no cars, no flags of any country, no spectators.

Camera and style: low camera angle from pit level, telephoto lens, frozen motion, shallow depth of field, the athlete tack sharp, premium global sports-brand campaign look.

Composition (website hero with text over the image): the athlete and the powder occupy the left two-thirds; his body sits between 30% and 65% of the width and between 20% and 80% of the height. The RIGHT third of the frame is calm, dark, soft-focus stadium background beyond the pit, with no people, no powder, no sand spray, no bright light and no detail — reserved for text. Keep important content away from the top and bottom edges so the image can be cropped.

No text anywhere in the image.

Avoid: text, letters, numbers, distance markers, measuring tape, race bib, scoreboard, signage, advertising boards, watermark, logos, flags, flag-like stripes, real or recognisable people, officials, trees, cars, crowd, colour-festival look, smoke grenades, illustration, CGI, extra limbs, deformed hands.
```

#### الطولية 9:16 — Midjourney

```text
cinematic sports photograph, vertical, a fictional male Emirati athlete, not a real or identifiable person, long jump in full flight above the sand pit, face in profile and shadow, modern athletics stadium in the UAE at sunset, golden light, an explosion of fine powder dust in red, green, white and black trailing behind him with a light spray of sand, loose organic cloud with colours mixed, not stripes, sleek national-team-style kit in white with red and green accents, plain fabric with no print, low camera angle, telephoto lens, frozen motion, shallow depth of field, sharp athlete, golden rim light, premium global sports-brand campaign look, athlete and powder in the upper two-thirds, bottom third of the frame dark calm smooth sand in shadow, soft focus, no detail --ar 9:16 --style raw --v 7 --no text, letters, numbers, distance markers, measuring tape, race bib, signage, watermark, logo, swoosh, emblem, flag, flag-like stripes, real person, recognisable face, officials, footprints in foreground, trees, cars, crowd, holi festival, smoke grenade, illustration, CGI, extra limbs, deformed hands
```

#### الطولية 9:16 — GPT Image

```text
Create a cinematic, photorealistic sports photograph in a tall 9:16 portrait format for a mobile screen, high resolution.

Subject: a single male athlete with an Emirati appearance — fictional, not a real or identifiable person — in full flight in the long jump above the sand pit, face in profile and shadow, not recognisable.

Identity: an explosion of fine powder dust in red, green, white and black trails behind him with a light spray of sand, colours mixed in a loose organic cloud, never stripes, bands or a flag-like pattern.

Kit: sleek national-team-style kit, white with red (#C8102E) and green (#00843D) accents, plain fabric with no text, numbers, logos or flags.

Setting: a modern athletics stadium in the UAE at sunset, golden rim light from the low sun behind him. No distance markers, no officials, no trees, no cars, no flags, no spectators.

Camera and style: low angle, telephoto lens, frozen motion, shallow depth of field, sharp athlete, premium global sports-brand campaign look.

Composition (mobile website hero with text at the bottom): the athlete and the powder sit in the upper two-thirds, between 10% and 62% of the height and between 10% and 90% of the width. The BOTTOM third is calm, dark, smooth sand in shadow and soft focus, with no people, no powder, no footprints and no detail. This image will never be mirrored.

No text anywhere in the image.

Avoid: text, letters, numbers, distance markers, measuring tape, race bib, signage, watermark, logos, flags, flag-like stripes, real or recognisable people, officials, trees, cars, crowd, colour-festival look, smoke grenades, illustration, CGI, extra limbs, deformed hands.
```

#### السطر السلبي

```text
text, letters, words, numbers, typography, distance markers, measuring tape, take-off board markings, race bib, scoreboard, signage, banners, advertising boards, watermark, signature, logo, brand logo, swoosh, emblem, crest, flag, national flag, flag pattern, flag-like stripes, powder arranged in bands, Olympic rings, real person, celebrity, recognisable face, close-up portrait, officials, judges, rake, crowd, spectators, audience, trees, forest, cars, vehicles, holi festival, colour run event, smoke grenade, sand explosion covering the athlete, sun in the right third, illustration, CGI, 3D render, cartoon, painting, anime, plastic skin, oversaturated, HDR halo, extra limbs, deformed hands, distorted anatomy, duplicated athlete, blurry athlete, low resolution, compression artefacts, frame border
```

#### `ltrImageMode`: **`mirror`**

القفزة تتجه يمينًا نحو النص العربي، وبالقلب يسارًا نحو الإنجليزي. الحفرة والمدرجات
بلا علامات مسافة مرقّمة ولا لوحات، فانعكاسها صحيح.

#### قائمة فحص القلب

- [ ] القائمة المشتركة في §٦.
- [ ] لا علامات مسافة مرقّمة ولا شريط قياس بجانب الحفرة.
- [ ] لا حكّام ولا مسؤولون في الخلفية.
- [ ] رذاذ الرمل لا يمتد إلى الثلث الأيمن.

---

### ٧.٤ رمي الرمح — لحظة ما قبل الإطلاق

#### النص — «مقترح — بانتظار اعتماد الاتحاد»

| الحقل | العربية | English |
| --- | --- | --- |
| سطر تمهيدي | — | — |
| العنوان | قوة ودقة في رمية واحدة | Power and precision in one throw |
| النص | القوة وحدها لا تكفي، فالدقة والتوقيت يصنعان الفارق. تعرّف على رياضيي ألعاب القوى في الدولة. | Power alone is not enough; precision and timing make the difference. Meet the athletes of Emirati athletics. |
| الزر | تعرّف على الرياضيين (19 حرفًا) | Meet the athletes (17) |
| وجهته | `/athletes` | `/athletes` |

**لماذا الرمح لا الجلة ولا القرص:** الرمح يُقرأ ألعاب قوى من أول نظرة حتى بعد القص،
وجسد الرامية ممتد أفقيًا فيبقى في الحزام المركزي. الوجهة صفحة مبنية (`PUBLIC_PAGES`).

#### العريضة 16:9 — Midjourney

```text
cinematic sports photograph, a fictional female javelin thrower, not a real or identifiable person, final stride before release, throwing arm drawn back, javelin held high and pointing forward toward the right of the frame, body leaning back, face in profile and shadow, modern open-air athletics stadium in the UAE at sunset, golden light, a powerful burst of fine powder dust in red, green, white and black exploding from her planted foot and trailing behind her to the left, loose organic cloud with colours mixed, not stripes, modest national-team-style kit, long-sleeve fitted top and full-length leggings, white with red and green accents, plain fabric with no print, low camera angle, telephoto lens, shallow depth of field, sharp athlete and javelin, strong golden rim light from the low sun behind her, premium global sports-brand campaign look, athlete, javelin tip and powder in the left two-thirds, right third of the frame dark calm soft-focus empty stadium background, negative space, ultra detailed --ar 16:9 --style raw --v 7 --no text, letters, numbers, distance markers, printed javelin, race bib, scoreboard, signage, advertising boards, watermark, logo, swoosh, emblem, flag, flag-like stripes, real person, recognisable face, short sleeves, bare arms, shorts, bare legs, second javelin, broken javelin, officials, trees, cars, crowd, holi festival, smoke grenade, illustration, CGI, 3D render, extra limbs, deformed hands
```

#### العريضة 16:9 — GPT Image

```text
Create a cinematic, photorealistic sports photograph in a wide 16:9 landscape format, ultra high resolution.

Subject: a single female javelin thrower — fictional, not a real or identifiable person — in the final stride before release. Her throwing arm is drawn back, the javelin held high and pointing forward toward the right side of the frame, her body leaning back with tension. Her face is in profile and partly in shadow, not recognisable. There is exactly one javelin, straight and plain, with nothing printed on it.

Kit: a modest national-team-style kit — long-sleeve fitted top and full-length leggings — white base with red (#C8102E) and green (#00843D) accents. Plain fabric: no text, no numbers, no logos, no flags, no brand marks on the kit or shoes.

Identity: a powerful burst of fine powder dust in the colours of the UAE flag — red, green, white and black — explodes from her planted foot and trails behind her toward the left of the frame. The colours are mixed in a loose organic cloud; they must not form stripes, bands or a flag-like pattern.

Setting: a modern open-air athletics stadium in the United Arab Emirates at sunset, golden light, the low sun behind her on the left creating a strong rim light. No distance markers, no officials, no trees, no cars, no flags of any country, no spectators.

Camera and style: low camera angle, telephoto lens, shallow depth of field, the athlete and the javelin tack sharp, premium global sports-brand campaign look.

Composition (website hero with text over the image): the athlete, the whole javelin including its tip, and the powder stay within the left two-thirds; her body sits between 30% and 65% of the width and between 20% and 80% of the height. The RIGHT third of the frame is calm, dark, soft-focus stadium background with no people, no javelin, no powder, no bright light and no detail — reserved for text. Keep important content away from the top and bottom edges so the image can be cropped.

No text anywhere in the image.

Avoid: text, letters, numbers, distance markers, printed javelin, race bib, scoreboard, signage, advertising boards, watermark, logos, flags, flag-like stripes, real or recognisable people, short sleeves, bare arms, shorts, bare legs, a second or broken javelin, officials, trees, cars, crowd, colour-festival look, smoke grenades, illustration, CGI, extra limbs, deformed hands.
```

#### الطولية 9:16 — Midjourney

```text
cinematic sports photograph, vertical, a fictional female javelin thrower, not a real or identifiable person, final stride before release, javelin held high above her shoulder, face in profile and shadow, modest national-team-style kit, long-sleeve fitted top and full-length leggings, white with red and green accents, plain fabric with no print, a powerful burst of fine powder dust in red, green, white and black trailing behind her, loose organic cloud with colours mixed, not stripes, modern athletics stadium in the UAE at sunset, golden rim light, low camera angle, shallow depth of field, sharp athlete and javelin, premium global sports-brand campaign look, athlete, javelin and powder in the upper two-thirds, bottom third of the frame dark calm empty ground in shadow, soft focus, no detail --ar 9:16 --style raw --v 7 --no text, letters, numbers, distance markers, printed javelin, race bib, signage, watermark, logo, swoosh, emblem, flag, flag-like stripes, real person, recognisable face, short sleeves, bare arms, shorts, bare legs, second javelin, broken javelin, officials, trees, cars, crowd, holi festival, smoke grenade, illustration, CGI, extra limbs, deformed hands
```

#### الطولية 9:16 — GPT Image

```text
Create a cinematic, photorealistic sports photograph in a tall 9:16 portrait format for a mobile screen, high resolution.

Subject: a single female javelin thrower — fictional, not a real or identifiable person — in the final stride before release, javelin held high above her shoulder, face in profile and shadow, not recognisable. Exactly one plain javelin, fully inside the frame.

Kit: modest national-team-style kit — long-sleeve fitted top and full-length leggings — white with red (#C8102E) and green (#00843D) accents, plain fabric with no text, numbers, logos or flags.

Identity: a powerful burst of fine powder dust in red, green, white and black trails behind her from her movement, colours mixed in a loose organic cloud, never stripes, bands or a flag-like pattern.

Setting: a modern athletics stadium in the UAE at sunset, golden rim light from the low sun behind her. No distance markers, no officials, no trees, no cars, no flags, no spectators.

Camera and style: low angle, telephoto lens, shallow depth of field, sharp athlete and javelin, premium global sports-brand campaign look.

Composition (mobile website hero with text at the bottom): the athlete, the javelin and the powder sit in the upper two-thirds, between 10% and 62% of the height and between 10% and 90% of the width. The BOTTOM third is calm, dark, empty ground in shadow and soft focus, with no people, no powder and no detail. This image will never be mirrored.

No text anywhere in the image.

Avoid: text, letters, numbers, distance markers, printed javelin, race bib, signage, watermark, logos, flags, flag-like stripes, real or recognisable people, short sleeves, bare arms, shorts, bare legs, a second or broken javelin, officials, trees, cars, crowd, colour-festival look, smoke grenades, illustration, CGI, extra limbs, deformed hands.
```

#### السطر السلبي

```text
text, letters, words, numbers, typography, distance markers, sector lines with numbers, printed javelin, javelin with text or logo, second javelin, broken javelin, bent javelin, race bib, scoreboard, signage, banners, advertising boards, watermark, signature, logo, brand logo, swoosh, emblem, crest, flag, national flag, flag pattern, flag-like stripes, powder arranged in bands, Olympic rings, real person, celebrity, recognisable face, close-up portrait, short sleeves, sleeveless top, bare arms, shorts, bare legs, bare midriff, crop top, revealing clothing, officials, judges, crowd, spectators, audience, trees, forest, cars, vehicles, holi festival, colour run event, smoke grenade, javelin tip in the right third, sun in the right third, illustration, CGI, 3D render, cartoon, painting, anime, plastic skin, oversaturated, HDR halo, extra limbs, deformed hands, distorted anatomy, duplicated athlete, blurry athlete, low resolution, compression artefacts, frame border
```

#### `ltrImageMode`: **`mirror`**

الرامية والرمح والمسحوق بلا كتابة. بعد القلب تصير الرامية «أعسر»، وهذا لا يزوّر
شيئًا، فالرماة العُسر موجودون. اتجاه الرمح نحو النص محفوظ في اللغتين.

#### قائمة فحص القلب

- [ ] القائمة المشتركة في §٦.
- [ ] رمح واحد مستقيم، بلا كتابة، **ورأسه لا يدخل الثلث الأيمن**.
- [ ] **الطقم محتشم فعلًا:** أكمام حتى المعصم، وبنطال حتى الكاحل.
- [ ] لا خطوط قطاع مرقّمة ولا علامات مسافة.
- [ ] اليد والأصابع على الرمح سليمة التشريح (أكثر ما يفشل فيه المولّد هنا).

---

### ٧.٥ المسافات الطويلة — عدّاء أمام أفق بعيد

#### النص — «مقترح — بانتظار اعتماد الاتحاد»

| الحقل | العربية | English |
| --- | --- | --- |
| سطر تمهيدي | — | — |
| العنوان | التحمّل يُبنى خطوةً بخطوة | Endurance is built step by step |
| النص | سباقات المسافات الطويلة تختبر الصبر قبل السرعة. تابع مواعيد البطولات القادمة. | Distance races test patience before pace. Follow the upcoming championships. |
| الزر | استعرض البطولات (15 حرفًا) | Browse championships (20) |
| وجهته | `/championships` | `/championships` |

`/championships` اليوم صفحة «قيد الإعداد» (`PREPARING_PAGES` في
`apps/web/src/lib/pages/public-pages.ts`)، فهي موجودة ولا تعطي 404، لكن محتواها لم
يُبنَ بعد. إن أراد الاتحاد وجهة مبنية، فالبديل `/results-rankings`.

#### العريضة 16:9 — Midjourney

```text
cinematic sports photograph, a fictional male distance runner, not a real or identifiable person, steady powerful stride on the outer lane of a red running track, running toward the right of the frame, face in profile and shadow, modern open-air athletics stadium in the UAE at sunset, beyond the open end of the stadium a distant generic city skyline softened by golden haze, no recognisable tower, skyline only behind the runner in the left and centre of the frame, a long thin trail of fine powder dust in red, green, white and black flowing behind him to the left with each stride, loose organic cloud with colours mixed, not stripes, sleek national-team-style kit in white with red and green accents, plain fabric with no print, low camera angle, telephoto lens compression, shallow depth of field, sharp athlete, warm golden rim light from the low sun behind him, calm disciplined mood, premium global sports-brand campaign look, athlete and powder in the left two-thirds, right third of the frame dark calm soft-focus empty background with no buildings, negative space, ultra detailed --ar 16:9 --style raw --v 7 --no text, letters, numbers, race bib, lane numbers, scoreboard, signage, advertising boards, watermark, logo, swoosh, emblem, flag, flag-like stripes, real person, recognisable face, famous landmark, recognisable tower, other runners, trees, cars, road, highway, crowd, holi festival, smoke grenade, illustration, CGI, 3D render, extra limbs, deformed hands
```

#### العريضة 16:9 — GPT Image

```text
Create a cinematic, photorealistic sports photograph in a wide 16:9 landscape format, ultra high resolution.

Subject: a single male distance runner — fictional, not a real or identifiable person — in a steady, powerful stride on the outer lane of a red running track, running toward the right side of the frame. His face is in profile and shadow, not recognisable.

Identity: a long, thin trail of fine powder dust in the colours of the UAE flag — red, green, white and black — flows behind him toward the left of the frame with each stride, softer and longer than an explosion, suggesting endurance. The colours are mixed in a loose organic trail; they must not form stripes, bands or a flag-like pattern.

Kit: sleek national-team-style kit, white base with red (#C8102E) and green (#00843D) accents. Plain fabric: no text, no numbers, no race bib, no logos, no flags, no brand marks on the kit or shoes.

Setting: a modern open-air athletics stadium in the United Arab Emirates at sunset. Beyond the open end of the stadium, a distant, generic city skyline softened by golden haze — no recognisable tower or landmark. The skyline appears only behind the runner, in the left and centre of the frame, and fades into darkness before the right third. The low sun behind him gives a warm golden rim light. No trees, no cars, no roads, no flags of any country, no spectators, no other runners.

Camera and style: low camera angle, telephoto lens compression, shallow depth of field, the athlete tack sharp, calm and disciplined mood, premium global sports-brand campaign look.

Composition (website hero with text over the image): the runner and the powder trail occupy the left two-thirds; his body sits between 30% and 65% of the width and between 20% and 80% of the height. The RIGHT third of the frame is calm, dark, soft-focus background with no people, no buildings, no powder, no bright light and no detail — reserved for text. Keep important content away from the top and bottom edges so the image can be cropped.

No text anywhere in the image.

Avoid: text, letters, numbers, race bib, lane numbers, scoreboard, signage, advertising boards, watermark, logos, flags, flag-like stripes, real or recognisable people, famous landmarks or recognisable towers, other runners, trees, cars, roads, crowd, colour-festival look, smoke grenades, illustration, CGI, extra limbs, deformed hands.
```

#### الطولية 9:16 — Midjourney

```text
cinematic sports photograph, vertical, a fictional male distance runner, not a real or identifiable person, steady powerful stride on a red running track, face in profile and shadow, modern athletics stadium in the UAE at sunset, a distant generic city skyline softened by golden haze behind him, no recognisable tower, a long thin trail of fine powder dust in red, green, white and black flowing behind him, loose organic cloud with colours mixed, not stripes, sleek national-team-style kit in white with red and green accents, plain fabric with no print, low camera angle, telephoto lens, shallow depth of field, sharp athlete, golden rim light, calm disciplined mood, premium global sports-brand campaign look, athlete, skyline and powder in the upper two-thirds, bottom third of the frame dark calm empty track in shadow, soft focus, no detail --ar 9:16 --style raw --v 7 --no text, letters, numbers, race bib, lane numbers, signage, watermark, logo, swoosh, emblem, flag, flag-like stripes, real person, recognisable face, famous landmark, recognisable tower, other runners, trees, cars, road, crowd, holi festival, smoke grenade, illustration, CGI, extra limbs, deformed hands
```

#### الطولية 9:16 — GPT Image

```text
Create a cinematic, photorealistic sports photograph in a tall 9:16 portrait format for a mobile screen, high resolution.

Subject: a single male distance runner — fictional, not a real or identifiable person — in a steady, powerful stride on a red running track, face in profile and shadow, not recognisable.

Identity: a long, thin trail of fine powder dust in red, green, white and black flows behind him with each stride, colours mixed in a loose organic trail, never stripes, bands or a flag-like pattern.

Kit: sleek national-team-style kit, white with red (#C8102E) and green (#00843D) accents, plain fabric with no text, numbers, race bib, logos or flags.

Setting: a modern athletics stadium in the UAE at sunset, a distant generic city skyline softened by golden haze behind him — no recognisable tower or landmark. Golden rim light from the low sun. No trees, no cars, no roads, no flags, no spectators, no other runners.

Camera and style: low angle, telephoto lens, shallow depth of field, sharp athlete, calm and disciplined mood, premium global sports-brand campaign look.

Composition (mobile website hero with text at the bottom): the runner, the skyline and the powder sit in the upper two-thirds, between 10% and 62% of the height and between 10% and 90% of the width. The BOTTOM third is calm, dark, empty track in shadow and soft focus, with no people, no powder and no detail. This image will never be mirrored, so the skyline must still contain no recognisable landmark.

No text anywhere in the image.

Avoid: text, letters, numbers, race bib, lane numbers, signage, watermark, logos, flags, flag-like stripes, real or recognisable people, famous landmarks or recognisable towers, other runners, trees, cars, roads, crowd, colour-festival look, smoke grenades, illustration, CGI, extra limbs, deformed hands.
```

#### السطر السلبي

```text
text, letters, words, numbers, typography, race bib, lane numbers, scoreboard, signage, banners, advertising boards, illuminated signs on buildings, watermark, signature, logo, brand logo, swoosh, emblem, crest, flag, national flag, flag pattern, flag-like stripes, powder arranged in bands, Olympic rings, real person, celebrity, recognisable face, close-up portrait, famous landmark, recognisable tower, detailed skyline, skyline in the right third, other runners, crowd, spectators, audience, trees, forest, cars, vehicles, road, highway, holi festival, colour run event, smoke grenade, sun in the right third, illustration, CGI, 3D render, cartoon, painting, anime, plastic skin, oversaturated, HDR halo, extra limbs, deformed hands, distorted anatomy, duplicated athlete, blurry athlete, low resolution, compression artefacts, frame border
```

**ملاحظة على السطر السلبي:** لا تكتب اسم برج بعينه (مثل «Burj Khalifa») في
الممنوعات. ذكر الاسم، حتى في النفي، قد يستدعيه المولّد. `famous landmark, recognisable
tower` تكفي.

#### `ltrImageMode`: **`mirror`** — **بشرط**

آمنة للقلب **فقط** إن بقي الأفق عامًّا ضبابيًا بلا برج يمكن التعرف عليه. أفق عام
مقلوب أفق عام صحيح. **إن ظهر برج معروف:** لا تحوّل الوضع إلى `separate`، بل **أعد
التوليد**، لأن الطولية لا تُقلب ولا بديل إنجليزي لها، والمَعلم المعروف يخالف أصلًا
شرط «المكان بطابع إماراتي بلا مَعلم».

#### قائمة فحص القلب

- [ ] القائمة المشتركة في §٦.
- [ ] **لا برج ولا مبنى يمكن تسميته** في الأفق، في النسختين العريضة والطولية.
- [ ] لا لافتات مضيئة ولا كتابة على المباني البعيدة.
- [ ] الأفق لا يدخل الثلث الأيمن، والثلث الأيمن مظلم.
- [ ] لا طريق ولا سيارات خلف الملعب.
- [ ] لا رقم صدر على العدّاء (المولّدات تضيفه تلقائيًا لسباقات المسافات).

---

## ٨. بعد التوليد

1. **افتح الصورة نفسها** وسمِّ دليل ألعاب القوى فيها (القاعدة ٢). تأكد أن جسد الرياضي
   في الحزام المركزي 30%–65%.
2. **مرّ على قائمة الفحص** تحت الشريحة، ثم على السطر السلبي كاملًا، **مكبّرًا
   الصورة إلى 100%**: الكتابة المخفية تظهر عادةً في المدرجات، وعلى الحذاء، وداخل
   المسحوق نفسه.
3. **افحص المسحوق:** مختلط الألوان، لا أشرطة، لا شكل علم، ولا يدخل الثلث الهادئ.
4. **افحص الطقم:** أبيض بلمسات حمراء وخضراء، بلا كتابة ولا شعار، ومحتشم للرياضيات.
5. **اكتب النص البديل وأنت تنظر إلى الصورة** (القاعدة ٦)، بالعربية والإنجليزية.
   القالب: **المكان + الفعل + الرياضي كما يظهر**. لا تنسخ البرومبت، ولا تذكر أن
   الشخص «إماراتي» ما لم يكن ذلك ظاهرًا من الصورة وحدها.
6. **ارفعها JPEG** دون 10 MB، **مع `isAiGenerated=true` صراحةً** (§٤.٢).
7. **اضبط نقطة التركيز** على الشريحة لا على الأصل، ثم عاين الإطارات الخمسة في §٣.١
   باللغتين.

---

## ٩. تعارضات ومسائل مفتوحة

| # | المسألة | ما هو معروف | القرار المطلوب |
| --- | --- | --- | --- |
| م-١ | **وسم «مؤقتة» عند الرفع — سُدّ جزئيًا** | منذ 2026-09-16 يقبل `UploadMediaAssetDto.isAiGenerated` القيمتين `true`/`false` نصًّا في multipart، و`uploadAndCreate` يحفظه. **الافتراضي `false`**. لا مسار تعديل لأصل مرفوع (لا `PATCH`/`PUT` في الـcontroller). **شارة «مؤقتة» والفلتر غير مبنيين**، والحقل غير موجود في `apps/dashboard/src` أصلًا | عمل واجهة: الحقل في نموذج رفع الداشبورد، والشارة، والفلتر. حتى ذلك الحين يُرسل الحقل صراحةً مع كل رفع |
| م-٢ | **الصور المولَّدة مقابل نص القاعدة ٢** | `page-building-guide.md` §٨ ما زال يقول «ممنوع دائمًا: صورة مولَّدة بالذكاء الاصطناعي تُضاف». التعليق المؤقت (ADR-0073) يغطي **الأصول القائمة** وينتهي في **2 أكتوبر 2026**. قرار المالك §١٨ بند ٤ وتوجيه 2026-09-16 يطلبان صورًا مولَّدة | قرار المالك أعلى، لكن نص القاعدة لم يُحدَّث، ولا وثيقة تغطي الصور الجديدة بعد 2 أكتوبر. يلزم تحديث النص أو ADR |
| م-٣ | **إلغاء «خطوط الشعار طبقة كود» مقابل الكود القائم** (يحل محل م-١ القديمة) | التوجيه الجديد يضع الهوية داخل الصورة ويلغي الاتجاه السابق. لكن `apps/web/src/components/pages/home/hero-lines.tsx` ما زال يرسم خطَّي الشعار الأحمر والأخضر فوق كل شريحة (ADR-0080)، ويستدعيه `hero.tsx`. مسحوق بالأحمر والأخضر تحت خطين بالأحمر والأخضر قد يتزاحمان بصريًا. **م-١ القديمة** (القلب يعكس قطر الصورة) **سقطت**: الصور لم تعد تُكوَّن لقطر | **قرار مالك:** هل يُزال `HeroLines` من الهيرو، أم يبقى فوق الصور الجديدة؟ هذا الملف لا يمس الكود |
| م-٤ | **مقاسات ملف محتوى الاتحاد قديمة** | `homepage-client-content.md` §١.١ يطلب ≥ 2400×1300، وطولية «قريبة من 3:4». المعتمد هنا: 3840×2160، و9:16 بحد 1080×1920 | تحديث ملف الاتحاد، ولم يُعدَّل ضمن هذه المهمة |
| م-٥ | **`ltrImageMode` — بُني في الموقع العام** | في الـAPI: `LTR_IMAGE_MODES` والافتراضي `mirror`، و`ltrImageAssetId` و`ltrFocalPoint` مع `separate`. في `apps/web`: القلب بـ`.hero-mirror` في `motion.css`، والطولية لا تُقلب تحت 640px. **لا حقل طولية إنجليزية**. واجهة الداشبورد لهذه الحقول **لم يُتحقق منها** في هذه المهمة | لا شيء. الأوضاع هنا تطابق الـschema |
| م-٦ | **الوجوه** | القاعدة ٢ تمنع **كل** وجه قابل للتعرف، وهي أوسع من «شخص حقيقي». البرومبتات تطبّق الأوسع: وجه جانبي أو في الظل | — |
| م-٧ | **هوامش الأمان محسوبة لا مقيسة** | من ارتفاعات §٢٤ ونقطة تركيز 50%. ارتفاع شريط الحدث لم يُقَس | قياس في معاينة الداشبورد |
| م-٨ | **أسماء العلامات التجارية في البرومبت** | مثالا المالك يذكران «Nike/Olympics». استبدلناهما بـ`premium global sports-brand campaign look` (§٥.٣) | تأكيد المالك للاستبدال. **لم يُحسم هنا** |
| م-٩ | **الألوان الرسمية داخل صورة فوتوغرافية** | ADR-0059 §D7.2 يمنع الألوان «القريبة» من الرسمية. البرومبتات تذكر `#C8102E` و`#00843D`، لكن **لا مولّد يضمن مطابقة الـhex**، والإضاءة الذهبية تغيّر اللون الظاهر | **قرار مالك:** هل تنطبق D7.2 على ألوان الطقم والمسحوق في صورة فوتوغرافية، أم على علامات الهوية وحدها؟ |
| م-١٠ | **تفاصيل طقم لم يحددها التوجيه** | التوجيه يحدد طقم الرياضيات (أكمام طويلة، بنطال كامل) ولا يحدد طقم الرياضيين ولا غطاء الرأس الرياضي. البرومبتات تكتفي بـ«sleek national-team-style kit» للرجال، ولا تضيف غطاء رأس | قرار مالك إن أراد تحديدًا أكثر |
| م-١١ | **مقاسات المولّدات ومعاملات Midjourney غير متحقق منها** | لم يُولَّد شيء ولم تُفحص مخرجات Midjourney أو GPT Image. قد يلزم قصّ وتكبير للوصول إلى 3840×2160 (§٤.١) | فحص أول صورة مولَّدة فعليًا، وتحديث §٤.١ بالأرقام المقيسة |
| م-١٢ | **الأسود في المسحوق فوق خلفية مظلمة** | الثلث الهادئ مظلم، والأسود فيه يُقرأ دخانًا أو اتساخًا. البرومبتات تُبقي المسحوق خارج الثلث الهادئ، لكن الأسود قد يضيع في ظلال الغروب | ملاحظة عند المراجعة البصرية، لا قرار |

---

## المراجع

`docs/plans/homepage-hero-design.md` §١٨ §٢٤ ·
`docs/content/homepage-client-content.md` §١.١ §١.٢ ·
`docs/design-system/ADR-0059-Brand-Guide-Conformance-And-Colour-Registers.md` §D7.2 ·
`docs/design-system/ADR-0073-Vision-Mission-Model-Page-Athletics-Photographs-Seam-Lines-And-Page-Rules.md` ·
`docs/design-system/UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §٩ ·
`docs/engineering/page-building-guide.md` §٨ القاعدتان ٢ و٦ ·
`apps/web/src/lib/pages/public-pages.ts` (`PUBLIC_PAGES`، `PREPARING_PAGES`) ·
`apps/web/src/lib/api/cloudinary-loader.ts` · `apps/web/src/lib/api/cloudinary-srcset.ts` (`CDN_WIDTHS`) ·
`apps/web/src/components/pages/home/hero-picture.tsx` · `hero.tsx` · `hero-lines.tsx` ·
`apps/web/src/styles/motion.css` (`.hero-mirror`) ·
`api/src/modules/media-center/media-assets/upload/upload-constraints.ts` ·
`api/src/modules/media-center/media-assets/dto/upload-media-asset.dto.ts` (`isAiGenerated`) ·
`api/src/modules/media-center/media-assets/media-assets.service.ts` (`uploadAndCreate`) ·
`api/src/modules/cms-page-composition/hero-slides/schemas/hero-cta.schema.ts` (`HERO_CTA_LABEL_MAX = 32`) ·
`api/src/modules/cms-page-composition/hero-slides/schemas/hero-slides.schema.ts` (`LTR_IMAGE_MODES`)

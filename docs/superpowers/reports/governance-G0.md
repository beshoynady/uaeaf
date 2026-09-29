# تقرير القياس — مجلس الإدارة واللجان والأشخاص (قبل G1)

التاريخ: 2026-09-29 · المرحلة: §5.0 قياس فقط · **لم يُعدَّل أي ملف.**

---

## 1. الخلاصة

القياس خلص. **وقفت عند نقطتين من §10** قبل أي كود:

1. `git status` **مش نضيف**: 190 مدخل (138 معدّل، 48 غير متتبَّع، 4 محذوف).
2. **الموجود في `api` بيتعارض ماديًا مع النموذج المعتمد في §2** — في الأربع collections كلها، وأخطرها إن `committees` **مورد محكوم بمحرك الموافقات** (List A + List B) وقراءته العامة بتمر على `publications → revisions.snapshotData`، مش على الصف نفسه. ده بيتصادم مع قرار §6 إن «النشر بيبقى بـ`isVisible`».

الخبر الكويس: الأربع collections والصفحتين وكتالوج الصلاحيات **كلهم موجودين ومسجّلين**، والمسارات الجديدة **مافيهاش تعارض**. الشغل ترحيل وتوسعة، مش بناء من الصفر.

---

## 2. حالة شجرة العمل (§5.0 بند 1)

| الحالة | العدد |
|---|---|
| معدّل (M) | 138 |
| غير متتبَّع (??) | 48 |
| محذوف (D) | 4 |
| **الإجمالي** | **190** |

`142 files changed, 2478 insertions(+), 2074 deletions(-)`

المحتوى **متماسك ومفهوم**، مش ملفات شاردة. أربع كتل:

| الكتلة | الدليل |
|---|---|
| **جلسة الهيدر** (المفروض كانت اتعملها commit) | `ADR-0122-Header-V2`، `apps/web/src/components/layout/mega/*`، `primary-nav.tsx`، `tricolor-indicator.tsx`، `e2e/header-mega-hover.spec.ts`، `docs/design-specs/header/` |
| **جلسة المواسم والفعاليات** | `api/src/modules/media-center/seasons/`، `apps/dashboard/.../seasons/`، `docs/design-specs/seasons/` |
| **الدفعة 3b (الصلاحيات)** | `roles.service.ts` وspecs بتاعتها، `capability-map.ts`، `docs/superpowers/reports/batch-3b.md` |
| **كنس ADR-0123** | ~80 ملف schema، تغيير واحد متكرر: `Types.ObjectId` ← `MongooseSchema.Types.ObjectId` في `@Prop({ type: ... })` |
| **إضافات تانية** | البحث (`search/`)، تقسيم ملفات الترجمة (`messages/ar/*.json`)، `countdown`، `inline-confirm` المنقول |

**نتيجة:** مفيش شغل تايه، بس الدفعة اللي جاية هتتخلط بيهم في نفس الشجرة لو مشينا.

---

## 3. قياس الـAPI (§5.0 بند 2)

### الموجود — كله موجود بالفعل

| المورد | المسار | الحالة |
|---|---|---|
| `federationPersonnel` | `api/src/modules/federation-governance/federation-personnel/` | module كامل |
| `electionCycles` | `.../election-cycles/` | module كامل |
| `federationAppointments` | `.../federation-appointments/` | module كامل |
| `committees` | `.../committees/` | module كامل + مسار عام |
| `boardMembersPage` | `.../board-members-page/` | موجود |
| `committeesPage` | `.../committees-page/` | موجود |
| `organizationalStructure` | `.../organizational-structure/` | **موجود كـcollection** — والنموذج المعتمد بيقول ده مش collection |

### كتالوج الصلاحيات — مسجّل بالفعل

الستة كلهم في `permission-resources.ts` وفي `capability-map.ts` تحت المجموعة `federation-governance`:

| المورد | العمليات المسجّلة |
|---|---|
| `committees` | Read, Create, Update, Archive, Restore, **Publish** |
| `federationAppointments` | Read, Create, Update, Archive, Restore |
| `federationPersonnel` | Read, Create, Update, Archive, Restore (+ `internalContact` = Restricted) |
| `committeesPage` | Update, Publish |
| `electionCycles` · `boardMembersPage` | مسجّلين |

**يعني §5.1 «سجّل الموارد الجديدة في الكتالوج» شبه خالص.** مفيش مورد جديد يتسجّل، ومفيش سبب نقرب من الـguard.

---

## 4. ⚠ التعارضات مع النموذج المعتمد (§5.0 بند 3)

### 4.1 `committees` — الأخطر

| §2 المعتمد | الموجود | الحكم |
|---|---|---|
| `slug` | — | **ناقص** (لازم لـ`/about/committees/[slug]`) |
| `summary{ar,en}` | `description{ar,en}` | إعادة تسمية |
| `about{ar,en}` | — | ناقص |
| `duties[{title,desc,order}]` | — | ناقص |
| `formationDecision{number,date,documentId?}` | — | ناقص |
| `documentIds[]` | — | ناقص |
| `order` | `displayOrder` | إعادة تسمية |
| `isVisible` | `isActive` + `publicationState` | **تعارض — تحت** |
| `kind: standing / sub` | `committeeType` (5 قيم، **مطلوب**) + `committeeGroup` (Leadership / Specialized، **مطلوب**) | **محور مختلف** + حقلان مطلوبان مش في النموذج |
| `parentCommitteeId?` | — | ناقص |

**تعارض الظهور — جوهري:**

`committees.schema.ts` فيه قاعدة موثّقة (**قرار المجلس 2026-09-01**) نصها إن `isActive` **وصفي بحت ومالوش أي أثر على الظهور العام**، وإن الظهور بيتحدد حصريًا بـ`publicationState`. وفوق ده:

- `committees` في `WORKFLOW_ENTITY_TYPES` (List A) وفي `PUBLICATION_ENTITY_TYPES` (List B).
- المسار العام الوحيد: `GET /committees/:id/public` ← `publicationsService.getPublicSnapshot('committees', id)` ← بيقرا `revisions.snapshotData` من آخر publication حالته Live. **بالـ`_id` مش بالـslug، ومفيش قايمة عامة.**
- ADR-0020 و ADR-0125 بيحكموا ده، و§8 بيقول **Workflow Engine ماتلمسوش**.

بينما §6 من البرومبت بيقول: «لحد وقتها، النشر بيبقى بـ`isVisible`». ده ينفع للموارد اللي لسه مش مسجّلة في المحرك — **`committees` مسجّل فيه من زمان.**

### 4.2 `federationAppointments`

| §2 المعتمد | الموجود | الحكم |
|---|---|---|
| `roleType`: chair, vice, secretaryGeneral, treasurer, member, committeeChair, committeeMember | President, BoardMember, CommitteeChair, CommitteeMember, ExecutiveDirector, Manager, Other | **تعارض:** مفيش `vice` ولا `secretaryGeneral` ولا `treasurer` — والهيكل التنظيمي في `Main.dc.html` بيقسّم بالظبط على الأدوار دي |
| `body: board / committee` | — | ناقص (ضمنيًا من `roleType`) |
| `endReason?` منفصل عن الحالة | `status` واحد (Active + 5 أسباب) مطلوب | حقل واحد بيعمل دورين |
| `positionTitle?` (override اختياري) | `positionTitle` **مطلوب** | تعارض |
| `order` | `displayOrder` | إعادة تسمية |
| `isVisible` | — | ناقص |
| `cycleId` | `electionCycleId` | إعادة تسمية |
| — | `supersedesAppointmentId` | موجود، **محمي (§8)** |

### 4.3 `federationPersonnel`

| §2 المعتمد | الموجود | الحكم |
|---|---|---|
| `slug` (ثابت بعد الإنشاء) | — | **ناقص** (لازم لـ`/about/people/[slug]`) |
| `name{ar,en}` | `fullName{ar,en}` | إعادة تسمية |
| `honorific{ar,en}?` | — | ناقص (NOTES: «د.» مقابل «اللواء الدكتور») |
| `bio{ar,en}?` | `shortBio` + `biography` | حقلان بدل واحد |
| `cv{qualifications, certifications, previousPositions, experience, achievements}` كل عنصر بـ`isVisible`+`order` | — | **ناقص بالكامل** — ومشهد 05 في `Profile.dc.html` مبني عليه |
| `showPublicContact` | — | ناقص |
| `internal{...}` (خارج النطاق §6) | `internalContact` **موجود** + مصنّف Restricted | موجود قبل الأوان؛ **مش هلمسه** |
| `linkedUserId?` (خارج النطاق §6) | — | ✔ غير موجود |
| — | `socialLinks[]` | زيادة |

### 4.4 `electionCycles`

| §2 المعتمد | الموجود |
|---|---|
| `label{ar,en}` | `cycleName{ar,en}` |
| `isCurrent` | `status`: Planned / Active / Completed / Cancelled |
| — | `federationId` (مطلوب)، `cycleNumber` (مطلوب) |

---

## 5. قياس الداشبورد

شاشات `app/[locale]/(app)/`: about-federation, albums, approval-policies, homepage, news, pages, president-message, roles, seasons, strategic-plan, users, videos, vision-mission.

**مفيش شاشة للأشخاص ولا للمجلس ولا للجان.** التلاتة تتبنى من الصفر في G2.

---

## 6. قياس الموقع والمسارات

| المسار | الحالة |
|---|---|
| `/about/board-members` | **مبني** — `page.tsx` (36 سطر) + `board-members-screen.tsx` (166 سطر) + spec |
| `/about/committees` | **مبني** — `page.tsx` (37 سطر) + `committees-screen.tsx` (77 سطر، **من غير spec**) |
| `/about/organisational-structure` | اتشال ✔ (مطابق لـspec الهيدر) |
| `/about/committees/[slug]` | **غير موجود — ومفيش تعارض** |
| `/about/people/[slug]` | **غير موجود — ومفيش تعارض** |

الصفحتين مسجّلتين في `public-pages.ts` (`board-members` ← `/about/board-members`، `committees` ← `/about/committees` ← `apiPath: /committees-page`). التعليق عند السطر 206 بيقول صراحة: «`GET /committees/:id/public` resolves one committee; **no public list**».

**مفتاح `isActive` موجود بالفعل** كآلية: `withheldPage(KEY, locale)` (ADR-0102 §D2) — الصفحة المؤقتة اللي §2 بيطلبها جاهزة ومستعملة في الصفحتين.

**نتيجة:** الاقتراحين الجداد مافيهمش تعارض مع `public-pages.ts` ولا مع الهيدر. **مش محتاج أوقف على المسارات.**

---

## 7. نظام الحركة والترجمة

| البند | الموجود |
|---|---|
| الحركة | `motion@13.3.0` — مطابق لملاحظة `scroll` («MotionProvider + RevealOnce»). **مفيش dependency جديدة مطلوبة.** |
| الترجمة | **اتقسمت لملف لكل صفحة** (جلسة الهيدر، لسه غير متتبَّعة): `messages/{ar,en}/{chrome,shell,home,news,video,albums,governance,contact}.json` + `src/i18n/messages.ts` باستيراد صريح لكل ملف |

حسب §9، الصفحات الجديدة تاخد ملفاتها الخاصة وتتضاف لـ`MESSAGE_FILES` وللخريطة الصريحة.

---

## 8. القرارات اللي أخدتها لوحدي

لا شيء — القياس فقط، ومفيش ملف اتعدّل (غير التقرير ده).

---

## 9. أسئلة محتاجة قرارك

### س1 — شجرة العمل مش نضيفة

190 مدخل من تلات جلسات سابقة (الهيدر، المواسم، 3b) + كنس ADR-0123. لو مشيت في G1 دلوقتي، ملفات الدفعة هتتخلط بيهم ومش هتقدر تعمل commit للدفعة لوحدها (§14 بند 2).

| # | الخيار | التكلفة | المقايضة |
|---|---|---|---|
| 1 | تعمل commit للشغل الموجود قبل ما أبدأ (الأوامر تحت) | دقايق | الأنضف — commit الدفعة يبقى معزول |
| 2 | أمشي فوق الشجرة الحالية وأديك في التقرير قايمة ملفاتي بالظبط | صفر | الـcommit هيبقى يدوي ومعرّض للخطأ؛ تراجع الدفعة لوحدها صعب |
| 3 | توقف وتراجع الـ190 الأول | ساعة+ | أأمن لو فيه شك في حاجة من التلات جلسات |

**توصيتي: 1.** الشغل متماسك ومنتهي حسب سجلات الجلسات، والسبب الوحيد إنه uncommitted إنه اتنسي. §14 بيطلب صراحة commit للدفعة لوحدها، وده مستحيل من غير خط أساس نضيف.

### س2 — `committees` محكوم بمحرك الموافقات، والنموذج المعتمد بيقول `isVisible`

§2 بيحط `isVisible` على اللجنة، و§6 بيقول النشر بـ`isVisible` لحد الدفعة 4. لكن `committees` **مسجّل في List A وList B من زمان**، وقراءته العامة بتمر على `publications → revisions.snapshotData` بقرار مجلس موثّق (2026-09-01) وADR-0020 وADR-0125، و§8 بيقول المحرك ماتلمسوش.

| # | الخيار | التكلفة | المقايضة |
|---|---|---|---|
| 1 | **أسيب `committees` على مساره الحالي** (`publicationState` + publications)، وأضيف الحقول الجديدة جوه الـsnapshot. مفيش `isVisible` على اللجنة | متوسطة — صفحات الموقع تقرا من publications، ومحتاج قايمة عامة جديدة مبنية على publications | بيحترم §8 و ADR-0020/0125. بس النشر بيبقى محتاج موافقة معتمدة، والأدمن مش هيشوف اللجنة على الموقع بمجرد الحفظ |
| 2 | أضيف `isVisible` كـ**طبقة تانية فوق** `publicationState` (الاتنين لازم يعدّوا) | صغيرة | مفيش تعارض مع المحرك، بس بوابتين للظهور — والأدمن ممكن يحتار ليه اللجنة مش ظاهرة |
| 3 | أشيل `committees` من List A/B وأخليه `isVisible` بس | صغيرة في الكود، **كبيرة في الحوكمة** | بيخالف §8 صراحة وبيلغي قرار مجلس وADR. **مانصحش بيه** |

**توصيتي: 2.** بيخلّي البرومبت والمحرك يشتغلوا مع بعض من غير ما ألمس حاجة محمية: `publicationState` بيفضل بوابة المحرك زي ما هي، و`isVisible` بيبقى مفتاح الأدمن السريع اللي §2 و§6 بيطلبوه. والشاشة بتوضّح السببين لما اللجنة مش ظاهرة. لو اخترت 1، قول لي، وهبني القايمة العامة على publications.

### س3 — `roleType` الموجود مافيهوش أدوار الهيكل التنظيمي

الـenum الحالي فيه `President` و`BoardMember` بس، والنموذج المعتمد و`Main.dc.html` محتاجين `vice` و`secretaryGeneral` و`treasurer` عشان الهيكل يتقسم صح. والـenum الموجود عليه بيانات تجريبية.

| # | الخيار | التكلفة | المقايضة |
|---|---|---|---|
| 1 | أستبدل الـenum بالمعتمد في §2 (7 قيم) وأسيب البيانات التجريبية تتصلّح من الداشبورد | صغيرة | الأنضف. البيانات تجريبية أصلاً (§2) فمفيش خسارة حقيقية |
| 2 | أوسّع الـenum الحالي بالقيم الناقصة وأسيب القديمة | صغيرة | مفيش كسر، بس قيمتين لنفس المعنى (`President` و`chair`) ودي بتتسرب للواجهة وللـSEO |
| 3 | ترحيل كامل بسكريبت | متوسطة | **ممنوع** — §9 بيمنع تشغيل أي سكريبت على قاعدة البيانات |

**توصيتي: 1.** §2 بيقول الحقول دي «معتمدة كتغيير schema»، والبيانات تجريبية. الخيار 2 بيسيب غموض دائم في `roleType` عشان بيانات هترمى.

---

## 10. ⏸ موقوف

مستني الرد على س1 وس2 وس3 قبل بداية G1.

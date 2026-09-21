# خطة تنفيذ — سياسات الموافقة (قائمة + تفاصيل) وقشرة الداشبورد القابلة للطي

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Steps use `- [ ]` for tracking.

**Goal:** سايد بار يُطوى في كل صفحات الداشبورد وتُحفظ حالته، وهيدر فيه زر الطي وبحث
في الشاشات بـCtrl/⌘+K، وشاشة سياسات موافقة بتخطيط قائمة + تفاصيل ظاهرين معًا،
بمخطط مسار ديناميكي وفصل واضح بين حفظ سياسة وتطبيقها على مجموعتها.

**Architecture:** لا backend جديد ولا مكتبة جديدة. الشاشة تبقى على
`GET /workflow-policies/governable` و`PUT /workflow-policies/:entityType/approval`
كما هما؛ «التطبيق على المجموعة» يعيد استعمال نفس `onSave` نوعًا نوعًا. القشرة تُبنى
من `NAV_ITEMS`/`visibleNavItems` القائمة، وحالة الطي في cookie تقرؤها الـlayout على
السيرفر (سابقة `THEME_COOKIE`).

**Tech Stack:** Next.js 16 App Router · React 19 · next-intl · Tailwind v4 على
`@uaeaf/design-tokens` · Vitest + Testing Library (jsdom).

**Spec:** رسالة المالك 2026-09-21 (البريف + قرارات S1–S6 وP1–P12 معتمدة كما هي) ·
مرجع التفاعل: Claude Design canvas `1Rv81Q18AbXuXbTgMC1gzL` (بنية التفاعل فقط؛
ألوانه وبياناته غير معتمدة).

---

## Global Constraints

- **Git للقراءة فقط (CLAUDE.md §33).** أوامر `git add`/`git commit` تُكتب نصًّا في
  التقرير النهائي، لا تُنفَّذ.
- **لا تعديل في `api/`** ولا في `app/api/admin/approval-policies/route.ts`. ثغرة سجل
  التدقيق مسجّلة منفصلة في `post-delivery-backlog.md` §٢.
- **الدوال الموجودة في `lib/admin/approval-policies.ts` لا تُعدَّل** — إضافات خالصة فقط.
- **Arrow functions** في كل كود جديد وفي كل ملف يُلمس (CLAUDE.md §30، باستثناءاته).
- **Logical properties فقط:** `ps-/pe-/ms-/me-/start-/end-/text-start/border-e`؛ لا
  `left/right/pl/pr/ml/mr` ولا `translate-x` اتجاهي.
- **لا قيم عشوائية:** ألوان/مسافات/أنصاف أقطار/حركة من التوكنز فقط. العرض الوحيد
  المشتق: الشريط المطوي `w-19` = 76px = هدف لمس 44px (§6.7، ADR-0068 D2.2) + حشوة
  الـaside الحالية `p-4` على الجانبين.
- **أيقونات:** Lucide (ISC) منسوخة مسارات داخل `lib/icons/ui-icons.tsx`
  (ADR-0068 D6.1، سابقة `plan-phase-icons.tsx`)، `currentColor`، `aria-hidden`،
  ومقلوبة في RTL متى كانت اتجاهية.
- **الاختبارات:** فقط الملفات المتأثرة: `npx vitest run --pool=threads <files>` في
  `apps/dashboard` + `npx tsc --noEmit` + `npx eslint <files>`. لا تشغيل للمجموعة كلها.
- **الهيدر غير ثابت (S5):** محررات بها شريط حفظ `sticky top-0` و`-mx-6` مقابل حشوة
  `main` — لا تُغيَّر حشوة `main` ولا يُثبَّت الهيدر.

---

## القرارات المعتمدة (من المالك، 2026-09-21)

| # | القرار |
|---|---|
| S1 | `lg`+: توسيع/طي محفوظ · `md`: شريط أيقونات دائم + زر يفتح درجًا بالأسماء · أقل من `md`: درج فقط |
| S2 | cookie `uaeaf_admin_sidebar` يقرؤها الـlayout (لا وميض)؛ لا حفظ على الحساب |
| S3 | لوحة أوامر تبحث في الشاشات المتاحة فقط؛ النص «ابحث عن شاشة…» |
| S4 | أيقونة لكل شاشة — الجدول أدناه |
| S5 | الهيدر غير ثابت؛ السايد بار وحده `sticky` بطول الشاشة |
| S6 | لا جرس إشعارات ولا صورة/دور ولا قائمة لغة ولا «نسخة 1.0» |
| P1 | الفلاتر: الكل / تتطلب موافقة / نشر مباشر / تحتاج ضبط |
| P2 | ثلاث بطاقات: تتطلب موافقة X من N · مراجعات جارية · تحتاج ضبط |
| P3 | لا سجل نشاط ولا «آخر تحديث» |
| P4 | لا زر «إضافة سياسة جديدة» |
| P5 | التطبيق على المجموعة ينسخ **المحفوظ** كاملًا؛ مقفل مع تعديل غير محفوظ أو مجموعة من عنصر واحد؛ تأكيد؛ PUT لكل نوع؛ نتيجة جزئية لكل نوع؛ القفل يُفحص عند التنفيذ |
| P6 | المعتمِدون عناصر قابلة للإزالة + «إضافة معتمِد» (select)؛ في «بالترتيب» القائمة المرقّمة هي القائمة |
| P7 | عدد الموافقات بزري − و+ بمقاس 44×44 حول الحقل، محصور 1..عدد المعتمدين |
| P8 | المخطط يعرض المسودة («المسار الحالي» / «المسار بعد الحفظ»)؛ جملة القائمة من المحفوظ |
| P9 | التنقل بين السياسات لا يُضيّع التعديل؛ علامة «غير محفوظ» على الصف |
| P10 | أقل من `lg`: القائمة تصبح select فوق التفاصيل |
| P11 | ~~المسار يبقى `/news/policies`~~ — **استُبدل بـG3**: `/approval-policies` |
| P12 | لا زر «؟» |
| G1 | مجموعة «المستخدمون والوصول» (اسم مؤقت حتى تتوحّد الصياغة العربية للـdomains) تضم المستخدمين والأدوار وسياسات الموافقة |
| G2 | المجموعة آخر السايد بار، بترتيب وثيقة الـIA (§4.8 والشجرة في §6)؛ «الأخبار» تبقى بشاشتين |
| G3 | مسار الشاشة `/approval-policies`، و`/news/policies` يحوّل إليه (308) بلغة وبلا لغة — `legacy-redirects.mjs` |

### جدول الأيقونات (S4)

| مفتاح `Nav` | أيقونة Lucide |
|---|---|
| overview | layout-dashboard |
| users | users |
| roles | key-round |
| pages | files |
| presidentMessage | message-square-quote |
| visionMission | target |
| strategicPlan | map |
| newsList | newspaper |
| newsReview | clipboard-check |
| approvalPolicies (كان `newsPolicies`) | list-checks |
| homepageHero | image |
| homepageSponsorStrip | gallery-horizontal |
| homepageSponsors | handshake |
| homepagePartners | building-2 |
| homepageMemberships | badge-check |

مفاتيح المجموعات (`news`, `homepage`, `usersAccess`) بلا أيقونة: المجموعة في الوضع المطوي تُرسم
أيقونات شاشاتها مفصولة بخط، لا أيقونة للمجموعة نفسها.

---

## بنية الملفات

### جديد
- `src/lib/icons/ui-icons.tsx` — `UiIcon` ومسارات كل الأيقونات (شاشات + أفعال).
- `src/lib/icons/ui-icons.spec.tsx`
- `src/lib/shell/sidebar-preference.ts` (+ `.spec.ts`) — قراءة وكتابة الـcookie.
- `src/components/shell/app-shell.tsx` (+ `.spec.tsx`) — الهيدر + الـaside + الدرج.
- `src/components/shell/command-palette.tsx` (+ `.spec.tsx`)
- `src/components/admin/approval-flow.tsx` (+ `.spec.tsx`) — المخطط القابل لإعادة الاستخدام.
- `src/components/admin/news/policy-list.tsx` — القائمة المجمّعة + select للشاشات الضيقة.
- `src/components/admin/news/policy-detail.tsx` — لوحة التفاصيل.

### معدَّل
- `src/app/[locale]/(app)/layout.tsx` — يقرأ الـcookie ويسلّم كل شيء لـ`AppShell`.
- `src/components/shell/sidebar-nav.tsx` — أيقونات، وضع مطوي، tooltip.
- `src/lib/auth/cookies.ts` — `SIDEBAR_COOKIE`.
- `src/lib/navigation.ts` (+ spec) — `navScreens`.
- `src/lib/admin/approval-policies.ts` (+ spec) — إضافات خالصة.
- `src/components/admin/news/policy-manager.tsx` (+ spec) — يصبح المنسّق.
- `messages/ar.json`, `messages/en.json` — مفاتيح `Shell` و`Newsroom` الجديدة.

---

## المرحلة أ — القشرة

### Task A1: أيقونات الواجهة

**Files:** Create `lib/icons/ui-icons.tsx`, `lib/icons/ui-icons.spec.tsx`

**Interfaces — Produces:**
- `UI_ICON_NAMES` (tuple), `type UiIconName`
- `UiIcon = ({ name, className }: { name: UiIconName; className?: string }) => JSX.Element` —
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
  strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">`
  (1.5px حسب CMP-ICON-001 D6.3).
- `NAV_ICON: Record<string, UiIconName>` — مفتاح `Nav` → اسم الأيقونة (الجدول أعلاه).

- [ ] **الاختبار الأحمر:** كل شاشة في `NAV_ITEMS` (بما فيها الأبناء، ما عدا المجموعات)
  لها مدخل في `NAV_ICON` · `UiIcon` مخفية عن قارئ الشاشة (`aria-hidden="true"`) و
  `stroke="currentColor"`.
- [ ] تشغيل: `npx vitest run --pool=threads src/lib/icons/ui-icons.spec.tsx` → FAIL (الملف غير موجود).
- [ ] التنفيذ بالمسارات المأخوذة من `lucide-static@0.469.0`.
- [ ] تشغيل الاختبار → PASS.

### Task A2: تفضيل الطي والشاشات القابلة للبحث

**Files:** Create `lib/shell/sidebar-preference.ts` (+spec); Modify `lib/auth/cookies.ts`,
`lib/navigation.ts` (+spec)

**Interfaces — Produces:**
- `SIDEBAR_COOKIE = "uaeaf_admin_sidebar"`
- `isSidebarCollapsed(value: string | undefined): boolean` — `true` فقط لـ`"collapsed"`.
- `sidebarCookie(collapsed: boolean): string` —
  `uaeaf_admin_sidebar=<collapsed|expanded>; path=/; max-age=31536000; samesite=lax`.
- `interface NavScreen { key: string; href: string; groupKey: string | null }`
- `navScreens(items: readonly NavItem[]): NavScreen[]` — يسطّح المجموعات؛ لا يُرجع
  المجموعة نفسها.

- [ ] **الاختبار الأحمر:** `isSidebarCollapsed("collapsed")` true، و`undefined`/`"expanded"`/
  `"junk"` false · الـcookie تحمل `path=/` و`samesite=lax` و`max-age` · `navScreens` يعطي
  شاشة لكل ابن بمفتاح مجموعته، ولا يعطي مدخلًا للمجموعة، ويحفظ ترتيب القائمة.
- [ ] تشغيل → FAIL. التنفيذ. تشغيل → PASS.

### Task A3: السايد بار بأيقونات ووضع مطوي

**Files:** Modify `components/shell/sidebar-nav.tsx`

**Interfaces:**
- `SidebarNav = ({ items, onNavigate }: { items: readonly NavItem[]; onNavigate?: () => void })`
- الوضع المطوي **CSS فقط**: يقرأ `data-collapsed` من أقرب `group/sidebar`، و`md:max-lg`
  يُرسم مطويًا دائمًا (الشريط). النص يصبح `sr-only` فيبقى اسم الرابط المُتاح كما هو.
- Tooltip واحد `fixed` بإحداثيات الرابط (هندسة وقت التشغيل، لا قيم تصميم) يظهر عند
  hover/focus **فقط إذا كان نص الرابط مخفيًا فعلًا** (عرضه ≤ 1px)، `aria-hidden` لأن الاسم
  مُتاح أصلًا، ويُغلق بـ`Esc` (WCAG 1.4.13).

- [ ] **الاختبار الأحمر** (في `app-shell.spec.tsx`، مهمة A4): اسم كل رابط يبقى نصّه حتى
  مطويًا · الأيقونة `aria-hidden` · `aria-current="page"` للصفحة الحالية.
- [ ] التنفيذ.

### Task A4: القشرة (هيدر + aside + درج)

**Files:** Create `components/shell/app-shell.tsx` (+spec); Modify `app/[locale]/(app)/layout.tsx`

**Interfaces:**
- `AppShell = ({ items, initialCollapsed, brand, identity, controls, children })`
  - `items: readonly NavItem[]`, `initialCollapsed: boolean`, `brand/identity/controls/children: ReactNode`.
- زرّان في موضع واحد، التبديل بالـCSS لا بـJS:
  - `hidden lg:inline-flex` — يطوي/يوسّع، `aria-expanded={!collapsed}`، `aria-controls` = الـaside،
    ويكتب `document.cookie = sidebarCookie(next)`.
  - `lg:hidden` — يفتح الدرج، `aria-haspopup="dialog"`، `aria-expanded={drawerOpen}`.
- الدرج: `<dialog>` أصلي بـ`showModal()` (حبس التركيز وEsc من المتصفح)، ينغلق بالنقر
  خارجه أو بزر إغلاق أو عند اختيار رابط.
- حركة الطي: `transition-[width] duration-[var(--motion-duration-fast)]
  ease-[var(--motion-easing-standard)] motion-reduce:transition-none` (N.8).

- [ ] **الاختبار الأحمر:** `initialCollapsed` يُرسم من أول render (`data-collapsed="true"`) ·
  زر الطي يقلب `aria-expanded` و`data-collapsed` ويكتب الـcookie · زر القائمة يفتح
  dialog فيه التنقل، وEsc يغلقه، واختيار رابط يغلقه · الروابط تبقى مسمّاة وهي مطوية.
- [ ] تشغيل → FAIL. التنفيذ + تحويل `AppLayout` إلى arrow. تشغيل → PASS.

### Task A5: لوحة الأوامر

**Files:** Create `components/shell/command-palette.tsx` (+spec)

**Interfaces:**
- `CommandPalette = ({ items }: { items: readonly NavItem[] })` — زر بشكل حقل بحث +
  `<kbd>` + dialog.
- `normalizeForSearch(text: string): string` — lowercase، حذف التشكيل، توحيد الألف
  (أ/إ/آ→ا)، ى→ي، ة→ه.
- اختصار `(ctrlKey || metaKey) && key === "k"` على `document`، `aria-keyshortcuts="Control+K Meta+K"`.
- Enter في الحقل يفتح أول نتيجة؛ ↓ ينقل التركيز لأول نتيجة؛ ↑/↓ بين النتائج؛ Esc يغلق.
- لا نتائج: «لا توجد شاشة باسم «{query}»» (PT-SEARCH-001).

- [ ] **الاختبار الأحمر:** Ctrl+K وMeta+K يفتحان ويركّزان الحقل · الكتابة تصفّي بالاسم ·
  «اعتماد» تطابق «إعتماد» · حالة لا نتائج بالنص · ↓ ينقل التركيز لأول نتيجة · تُعرض
  فقط الشاشات الممرّرة في `items`.
- [ ] تشغيل → FAIL. التنفيذ. تشغيل → PASS.

---

## المرحلة ب — الشاشة

### Task B1: المنطق الخالص

**Files:** Modify `lib/admin/approval-policies.ts`, `lib/admin/approval-policies.spec.ts`

**Interfaces — Produces:**
- `POLICY_FILTERS = ["all", "required", "direct", "attention"] as const`, `type PolicyFilter`
- `savedChoice(entity: GovernableEntity): ApprovalChoice` — نفس مُهيّئ المسودة الحالي
  (`mode ?? "THRESHOLD"`).
- `needsAttention(entity, approvers): boolean` — `enabled` و(لا معتمد، أو معتمد بلا حساب).
- `matchesFilter(entity, filter, approvers): boolean`
- `policyStats(entities, approvers): { required: number; total: number; inReview: number; attention: number }`

- [ ] **الاختبار الأحمر:** سياسة مطفأة بلا معتمدين لا تحتاج ضبطًا · مفعّلة بلا معتمدين
  تحتاج · مفعّلة بمعرّف بلا حساب تحتاج · الفلاتر الأربعة · الإحصاء يجمع `inFlightReviews` ·
  `savedChoice` لسياسة بلا نمط يعطي `THRESHOLD`.
- [ ] تشغيل → FAIL. التنفيذ. تشغيل → PASS.

### Task B2: مخطط المسار

**Files:** Create `components/admin/approval-flow.tsx` (+spec)

**Interfaces:**
- `ApprovalFlow = ({ caption, start, stages, end }: { caption: string; start: string; stages: readonly string[]; end: string })`
- `<figure>` + `<figcaption>` + `<ol>`: البداية، ثم المراحل، ثم النهاية؛ الأسهم
  `aria-hidden` ومقلوبة في RTL؛ `flex-wrap` على الشاشات الضيقة.

- [ ] **الاختبار الأحمر:** العناصر بالترتيب start → stages → end كعناصر قائمة · الـcaption
  هو اسم الـfigure · لا مراحل = عنصران فقط · الأسهم خارج شجرة الإتاحة.
- [ ] تشغيل → FAIL. التنفيذ. تشغيل → PASS.

### Task B3: الشاشة (قائمة + تفاصيل + تطبيق على المجموعة)

**Files:** Modify `policy-manager.tsx` (+spec); Create `policy-list.tsx`, `policy-detail.tsx`;
Modify `messages/ar.json`, `messages/en.json`

**Interfaces:**
- `PolicyManager` يبقى بنفس الـprops (`entities, approvers, locale, onSave`) — `PolicyBoard`
  لا يتغيّر.
- التخطيط: `lg:grid-cols-12` — القائمة `lg:col-span-4 xl:col-span-3`، التفاصيل
  `lg:col-span-8 xl:col-span-9`، `gap-6 xl:gap-8` (Chapter 5 §5.2: 12 عمودًا، gutter
  24/32).
- التطبيق على المجموعة: يستدعي `onSave(sibling, savedChoice(selected))` لكل شقيق بالتتابع؛
  يتخطى المقفل (`inFlightReviews > 0 && changesArrangement`) وغير المتغيّر؛ يعيد مسودة
  كل شقيق نجح إلى النسخة المطبّقة؛ النتيجة لكل نوع في `role="status"`.

- [ ] **الاختبار الأحمر (سلوك قديم يبقى محروسًا):** كل نوع أرسله السيرفر يظهر في القائمة ·
  التفاصيل تخفي الإعدادات لنوع لا يحتاج مراجعة · تفعيل «تتطلب موافقة» يكشفها · حفظ نوع
  بلا سياسة سابقة · رفض عتبة أكبر من عدد المعتمدين · رفض سياسة بلا معتمد (تنبيه واحد) ·
  طباعة «يحتاج X من N» · مسودة كل نوع مستقلة عبر التنقل · الإطفاء بلا معتمدين · كل حالات
  القفل السبع · رفض السيرفر وتمييزه عن العطل ومسحه عند إعادة المحاولة وعزله لكل نوع ·
  التجميع بالمجال · جملة المحفوظ لا المسودة · معتمد بلا حساب يبقى باسمه · لا حفظ بلا
  تغيير · الترتيب التسلسلي (ترقيم، تحريك، حدود، الإرسال بالترتيب، غيابه في النمطين
  الآخرين) · حالات الـdeadlock الأربع.
- [ ] **الاختبار الأحمر (سلوك جديد):** اختيار سياسة من القائمة يبدّل التفاصيل فورًا ·
  الفلاتر تصفّي والعدد في اسم كل فلتر · البطاقات الثلاث · النمط `aria-pressed` ·
  رسالة الإجماع في «الجميع» فقط · زرا − و+ محدودان · إضافة معتمد وإزالته · «تراجع عن
  التغييرات» يعيد المحفوظ · علامة «غير محفوظ» على الصف · المخطط يتبع المسودة وعنوانه يتغيّر ·
  التطبيق على المجموعة: مقفل مع تعديل غير محفوظ، مقفل في مجموعة من عنصر، يطلب تأكيدًا،
  يرسل المحفوظ لا المسودة، يتخطى المقفل، ويعرض نجاحًا جزئيًا.
- [ ] تشغيل → FAIL. التنفيذ. تشغيل → PASS.

---

## التحقق النهائي

- [ ] `npx vitest run --pool=threads` على الملفات المتأثرة فقط.
- [ ] `npx tsc --noEmit` في `apps/dashboard`.
- [ ] `npx eslint` على الملفات المعدّلة.
- [ ] فحص حي على `http://localhost:3002` (لا `127.0.0.1`): 1440 / 1280 / 1024 / 768 / 390،
  عربي وإنجليزي، فاتح وداكن، لوحة المفاتيح، reduced-motion، وصفحة محرر فيها شريط حفظ
  `sticky` للتأكد أن القشرة لم تكسرها.
- [ ] التقرير بالبنود التسعة + أوامر git نصًّا.

## انحرافات عن الخطة أثناء التنفيذ (موثَّقة)

| # | ما تغيّر | السبب |
|---|---|---|
| X1 | `SIDEBAR_COOKIE` في `lib/shell/sidebar-preference.ts` لا في `lib/auth/cookies.ts` | الوحدة التي تقرأ الـcookie وتكتبها تملك اسمها؛ ولمس `cookies.ts` كان سيفرض تحويل دواله كلها (§30) لسبب لا علاقة له بالمهمة |
| X2 | زر الحفظ ظاهر دائمًا ومعطّل بلا تغيير، بدل أن يختفي | سبب الإخفاء القديم كان ١٢ زرًا أوليًا في صفوف متراصّة؛ في تخطيط القائمة + التفاصيل زر واحد، والمرجع يعرضه دائمًا بحالة خاملة |
| X3 | حقل البحث في لوحة الأوامر هو `SearchField` المشترك، ومفاتيح الأسهم تُقرأ على الـdialog | حارس `field-standard.spec.tsx`: لا `<input>` نصّي خارج المكوّنات المعرِّفة للنمط |
| X4 | إصلاح: شاشتان «حاليتان» معًا في السايد بار (`/news` و`/news/policies`) | عيب قائم قبل المهمة ظهر في الفحص الحي؛ `currentScreenHref` يختار أطول مسار مطابق (N.3) |
| X5 | إصلاح: الدرج ولوحة الأوامر يسمعان `close` من المتصفح، وEscape في حقل البحث يغلق من أول ضغطة | ظهر في الفحص الحي على Chromium: الحقل `type=search` يستهلك أول Escape، والـdialog بقي مفتوحًا يحجب الصفحة |
| X6 | «تتطلب موافقة» يُرسم بـ`SwitchField` الموجود بدل مفتاح بُني يدويًا | كان نسخة ثانية من مكوّن قائم (CLAUDE.md §17). والمفتاح داخل نموذج يُحفظ لاحقًا كان يخالف `CMP-SWITCH-001` كما عشرة مفاتيح أخرى؛ ADR-0091 (Accepted) عدّل القاعدة بثلاثة شروط يستوفيها |

**الـADRs (2026-09-21):** ADR-0089 (مخطط المسار + القائمة والتفاصيل، Accepted، سُجّل بعد البناء) ·
ADR-0090 (S7، Accepted، سُجّل قبل البناء) · ADR-0091 (المفتاح في نموذج يُحفظ لاحقًا، **Accepted — الخيار أ**؛ مراجعة المفاتيح الأحد عشر: عشرة مستوفية، و«الاتفاقية سارية» في الشركاء لا تستوفي الشرط الأول ← backlog §٣).

---

## S7 — مجموعات السايد بار القابلة للطي: **الخيار أ — مُنفَّذ (ADR-0090)**

**القرار (2026-09-21):** الخيار أ. الـaccordion على «الأخبار» و«الصفحة الرئيسية» فقط، بلا
أي تغيير في `NAV_ITEMS`. رُفض الخيار ب («مجموعة الأعضاء الفاضية مؤشر أن التصميم يتقدّم على
منطق التنقل الحقيقي»).

**المُنفَّذ:** `SidebarNav` بـ`foldGroups` و`initialGroups` (السايد بار يمرّرهما، الدرج لا) ·
`parseNavGroups` / `navGroupsCookie` في `sidebar-preference.ts` · الـlayout يقرأ
`uaeaf_admin_nav_groups` · مفتاح `Shell.groupHasCurrent` · أيقونة `chevron-down`.
**الحراس:** `sidebar-nav.spec.tsx` (٩) · `sidebar-preference.spec.ts` (٩) · حالة في
`app-shell.spec.tsx`. **الفحص الحي:** أول رسم على `/news/policies` — الأخبار مفتوحة والصفحة
الرئيسية مقفولة، ارتفاع التنقل 572px بدل 812px · الاختيار محفوظ من أول رسم في صفحة أخرى ·
Enter يطوي · المؤشر يُقرأ «الأخبار فيها الصفحة الحالية» · مسطّح في الوضع المطوي والشريط
والدرج · الإنجليزية LTR · صفر أخطاء.

### نص القرار كما عُرض قبل الاختيار

**الطلب (2026-09-21):** المجموعات «المحتوى / الأعضاء / الإدارة» تصبح accordion في وضع
الأسماء الكاملة (lg+ موسّعًا) فقط؛ مجموعة الصفحة الحالية مفتوحة افتراضيًا والباقي
مقفول؛ الحالة في cookie بنمط S2؛ في وضع الأيقونات تبقى مسطّحة؛ مجموعة مقفولة فيها
الصفحة الحالية تُظهر مؤشرًا على عنوانها. امتداد موثَّق لـCMP-SIDEBAR-001 +
PENDING FIGMA BACK-SYNC.

**التعارض (CLAUDE.md §1، §11):** هذه المجموعات الثلاث من المرجع التجريبي، لا من
التنقل الحقيقي. `NAV_ITEMS` فيها سبعة عناصر مباشرة ومجموعتان فقط: **الأخبار** (٣
شاشات) و**الصفحة الرئيسية** (٥ شاشات). «سياسات الموافقة» داخل **الأخبار** لا
«الإدارة»، ولا شاشة واحدة في الداشبورد تنتمي إلى «الأعضاء».

**الخياران:**

| | الخيار | ما يعنيه |
|---|---|---|
| **أ (موصى به)** | الـaccordion على المجموعتين الموجودتين (الأخبار، الصفحة الرئيسية) | لا تغيير في IA. على `/news/policies` تفتح «الأخبار» وتُطوى «الصفحة الرئيسية» (٥ صفوف أقل) |
| ب | إعادة تجميع التنقل في المحتوى / الأعضاء / الإدارة ثم الـaccordion | تغيير IA (§11) يحتاج قرارًا بأي شاشة تذهب إلى أي مجموعة، و«الأعضاء» فارغة اليوم |

**ما سيتغيّر بنيويًا في `sidebar-nav.tsx` (أيًّا كان الخيار):**

- اسم المجموعة يصبح `<button aria-expanded aria-controls>` مع chevron، والقائمة تحته
  `hidden` حين تُطوى — في وضع الأسماء الكاملة فقط. في الشريط (md) وفي الوضع المطوي
  (lg + `data-collapsed`) يبقى اسم المجموعة `sr-only` والقائمة ظاهرة مسطّحة كما هي الآن.
- داخل الدرج (أقل من lg) لا accordion — الطلب حصره في lg+.
- حالة كل مجموعة في cookie ثانية (`uaeaf_admin_nav_groups`) تقرؤها الـlayout، فيُرسم
  الطيّ من أول paint بلا قفزة. غياب قيمة لمجموعة = مفتوحة إن كانت فيها الصفحة الحالية،
  مقفولة غير ذلك.
- مؤشر على عنوان المجموعة المقفولة التي فيها الصفحة الحالية: نقطة + نص مخفي بصريًا
  («فيها الصفحة الحالية»)، لا لون وحده.

(اختير أ؛ انظر أعلى القسم.)

---

## PENDING FIGMA BACK-SYNC

لا إطار Figma لأي من: السايد بار المطوي، الشريط على `md`، الدرج، لوحة الأوامر، شاشة
السياسات بتخطيط القائمة والتفاصيل وحالاتها، وشاشاتها الضيقة
(**RESPONSIVE DESIGN NOT VERIFIABLE**).

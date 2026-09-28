# خطة تنفيذ — إعادة هندسة هيدر الموقع العام

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** استبدال هيدر ADR-0062 (ثمانية بنود، لوحات عمود واحد) بهيدر من ستة بنود وخمس لوحات mega، ومعه بحث موقع وبحث في الدرج، بلا رابط مكسور واحد.

**Architecture:** شجرة واحدة في `navigation.ts` تُغذّي الصف والدرج والفوتر. `SiteHeader` يصير server component يجلب بيانات البطاقات بطلب واحد مخزَّن 60 ثانية ويمرّرها إلى `HeaderShell` (client) الذي يملك الحالة. اللوحات مكوّنات مشتركة يستعملها الصف والدرج بالتركيب نفسه. البحث module مستقل في `api/` بمصادر مسجَّلة، وواجهته dialog بنمط combobox.

**Tech Stack:** Next.js App Router · next-intl · Tailwind v4 (CSS-first، بلا `tailwind.config`) · Vitest + Testing Library · Playwright · NestJS + Mongoose (دفعة E فقط).

**Spec:** [`2026-09-28-header-redesign-design.md`](./2026-09-28-header-redesign-design.md) — بما فيه §15 «قرارات ما بعد المطابقة».

---

## Global Constraints

هذه القيود تسري على **كل** مهمة في الخطة، ولا تُعاد كتابتها داخل المهام.

### حوكمة المشروع
- **Git للقراءة فقط بالنسبة للمنفّذ** (CLAUDE.md §33). `status` و`diff` و`log` و`show` و`ls-files` مسموحة؛ `add` و`commit` و`push` و`branch` و`checkout` و`stash` و`reset` و`restore` و`merge` و`pull` ممنوعة. خطوات الـcommit في هذه الخطة **نصّ يُسلَّم للمالك لينفّذه**، لا أمر ينفّذه المنفّذ. القاعدة تسري على أي subagent يُستدعى.
- **لا قيمة حرة.** كل لون ومسافة وحجم خط ونصف قطر وظل وحركة من توكن. ما لا يُشتق من توكن يُعلَّم `DESIGN DECISION REQUIRED` ويُرفع، ولا يُخترع (CLAUDE.md §2 و§16).
- **لا hex في الكود** من صور التصميم (README الخاص بالتصميمات).
- **backend:** في حدود دفعة E فقط، و**ممنوع تغيير أي حقل في أي schema**. الـindexes مسموحة ومعروضة في §E.
- **مواضع محمية، لا تُلمس:** `activation.ts` (ADR-0102) · استثناء `/brand-kit` في `seo-contract.spec.ts` · موديول `organizationalStructure` (بالـ**z**) في `api/` و`apps/dashboard/` — لا علاقة له بالمسار العام. `direction-and-logo-contract.spec.ts` يُحدَّث ولا يُحذف منه حارس.

### أسلوب الكود
- **arrow functions** في كل ما يُكتب جديدًا، وتحويل دوال الملفات التي تُلمس (CLAUDE.md §30). الاستثناءات: class/decorated methods (كل NestJS)، و`this` الديناميكي، والـgenerators، والـoverloads، و`arguments`، وما يُستدعى قبل تعريفه أثناء تحميل الموديول.
- **TSDoc قصير على الـexports العامة** فقط.
- `//` للسبب غير الظاهر فقط. لا سرد تاريخي ولا إشارة إلى plan أو task أو reviewer داخل الكود (CLAUDE.md §30، وسياسة التعليقات).
- **لا صفحة كاملة ولا هيدر كامل في ملف واحد.** أي جزء يتكرر بين الصف والدرج = component مشترك واحد (قاعدة الـshared components، 2026-09-22).
- `try/catch` أداة عادية تُستعمل حيث تلزم؛ لا تُلتف ولا تُستبدل بـwrapper.

### القيم المعتمدة (§15 من الـspec)
| البند | القيمة | التوكن |
|---|---|---|
| ارتفاع الهيدر | 96px | `--header-height` (= `--space-24`) |
| حواف 1440 | 64px | `--grid-margin-xl` |
| مسافة البنود 1440 | 32px | `--grid-gutter-xl` |
| حواف 1280 | 40px | `--space-10` |
| مسافة البنود 1280 | 24px | `--space-6` |
| دخول اللوحة | 220ms decelerate | `--motion-transition-enter` |
| خروج اللوحة | 150ms accelerate | `--motion-transition-exit` |
| طبقة التعتيم | 220ms standard · 0.6 | `--motion-transition-overlay` · `--opacity-overlay` |
| وصف الرابط | 12/13px | `text-caption` |
| حشو اللوحة | 24px | `--space-6` |
| نص البند | 15/16px | `text-body` |
| عنوان رابط اللوحة | 15/16px وزن 700 | `text-body font-bold` |
| هدف اللمس الأدنى | 44px | `min-h-11` / `size-11` (`interactive.ts:54`) |
| عتبة الصف | 1280 | `NAV_ROW_BREAKPOINT` = `--breakpoint-xl` |

**لا توكن لـ:** 88px، 56px، 30px، 22px، 38px، 52px، 12.5px، 300ms، 380px. أيٌّ منها يظهر في الـspec أو في صورة تصميم **يُترجَم** إلى الجدول أعلاه، ولا يُنقل حرفيًا.

### التحقق بعد كل دفعة
```
cd apps/web && npx tsc --noEmit
cd apps/web && npx vitest run <الملفات المتأثرة>
```
`npx tsc --noEmit` وليس `next build` للتحقق النوعي أثناء العمل؛ و`nest build` ممنوع تحت `--watch` لأنه يترك الـAPI غير مرتبط (سابقة موثّقة مرتين). في `api/` الاختبار `npx jest --runInBand` — `--runInBand` إلزامي وإلا فشلت مجموعات الـDB بلا سبب حقيقي.

---

## Review Focus

خمسة مدخلات يفترضها الـspec ضمنًا ولا يختبرها أي بند فيه. كل سطر له اختبار مثبَّت في المهمة المالكة للكود.

1. **رابط `#anchor` يصل إلى `isWithin` و`containsPath` و`navDestinations`.** `/athletics#disciplines` ليس مسارًا؛ `isWithin` تقارن نصًّا فتفشل بصمت، و`navDestinations` تضعه في الفوتر كوجهة. المتوقع: الـanchor يُقطع قبل المطابقة، ويُستبعد من الفوتر. → **A3**.
2. **البث المباشر يختفي بين طلبين.** `loadActiveLiveStream()` يعيد `null` فجأة حين ينتهي البث. المتوقع: البند لا يُعرض، ولا يُترك عمود فارغ ولا فاصل معلّق، ولا يسقط الهيدر. → **D3**.
3. **مصدر بطاقة يفشل بينما الباقي ينجح.** المتوقع: `null` لحقله وحده، والهيدر يُرسم كاملًا. اختبار يرفض مصدرًا واحدًا ويؤكد بقية الحقول. → **D2**.
4. **استعلام بحث بمحارف regex أو `$`.** مدخل المستخدم يصل إلى Mongo. المتوقع: لا حقن، ولا 500، ونتيجة فارغة مهذّبة. → **E2**.
5. **الدرج المفتوح وقت تغيّر المقاس إلى ≥1280.** الدرج modal بـscroll lock؛ لو بقي القفل بعد ظهور الصف، بقيت الصفحة غير قابلة للتمرير بلا سبب مرئي. المتوقع: فتح الصف يفكّ القفل ويعيد البؤرة. → **C4**.

---

## File Structure

| الملف | المسؤولية |
|---|---|
| `apps/web/src/lib/navigation.ts` | الشجرة والأنواع والمشتقات (`navDestinations`، `isWithin`، `containsPath`). لا JSX. |
| `apps/web/src/lib/navigation.spec.ts` | **جديد** — حارس الشجرة مقابل §3 من الـspec. |
| `apps/web/src/lib/header/features.ts` | **جديد** — `getHeaderFeatures(locale)`: مصادر البطاقات السبعة، كل مصدر معزول. |
| `apps/web/src/components/layout/site-header.tsx` | **server** — يجلب ويمرّر. بلا حالة. |
| `apps/web/src/components/layout/header-shell.tsx` | **جديد، client** — حالة اللوحات والدرج والـscroll. |
| `apps/web/src/components/layout/primary-nav.tsx` | الصف والدرج: بنية وسلوك لوحة المفاتيح فقط. |
| `apps/web/src/components/layout/header-tools-capsule.tsx` | **جديد** — كبسولة الأدوات، تركيب واحد لصفّين مختلفين. |
| `apps/web/src/components/layout/mega/` | **جديد** — `mega-panel.tsx`، `mega-column.tsx`، `mega-link.tsx`، `tricolor-indicator.tsx`. |
| `apps/web/src/components/layout/cards/` | **جديد** — بطاقة لكل نوع، وبطاقة fallback لكل منها. |
| `apps/web/src/components/shared/countdown.tsx` | **منقول** من `components/pages/home/hero-countdown.tsx`. |
| `apps/web/src/components/search/` | **جديد** — `search-trigger.tsx`، `search-dialog.tsx`، `search-results.tsx`. |
| `apps/web/src/app/[locale]/search/page.tsx` | **جديد** — `/search?q=`، `noindex, follow`. |
| `api/src/modules/platform-administration/search/` | **جديد** — module البحث: controller، service، sources، normalization. |

---

# الدفعة A — التنقل والمسارات والـi18n

**الهدف:** الشجرة الجديدة حيّة، والمسارات المحذوفة مختفية، والموقع أخضر — بالهيدر القديم. لا بصريات في هذه الدفعة.

**نقطة توقف للمراجعة في نهايتها.**

### Task A1: حقل `badge` في `NavItem`

**Files:**
- Modify: `apps/web/src/lib/navigation.ts:60-87`
- Test: `apps/web/src/lib/navigation.spec.ts` (create)

**Interfaces:**
- Produces: `NavItem` يكتسب `badge?: "soon"`. `NavLeaf` و`navDestinations` بلا تغيير هنا.

- [x] **Step 1: اكتب الاختبار الفاشل**

```ts
// apps/web/src/lib/navigation.spec.ts
import { describe, expect, it } from "vitest";
import { PRIMARY_NAV, navDestinations, type NavItem } from "./navigation";

const flatten = (items: readonly NavItem[]): NavItem[] =>
  items.flatMap((item) => [item, ...flatten(item.children ?? [])]);

describe("badge", () => {
  it("يضع شارة قريبا على national-teams وحده", () => {
    const badged = flatten(PRIMARY_NAV).filter((item) => item.badge);
    expect(badged.map((item) => item.href)).toEqual(["/national-teams"]);
    expect(badged[0]?.badge).toBe("soon");
  });
});
```

- [x] **Step 2: شغّل الاختبار وتأكد أنه يفشل**

Run: `cd apps/web && npx vitest run src/lib/navigation.spec.ts`
Expected: FAIL — `Property 'badge' does not exist on type 'NavItem'`.

- [x] **Step 3: أضف الحقل**

```ts
export interface NavItem {
  /** Key into the `Nav` message namespace (see `messages/*.json`). */
  key: string;
  href?: string;
  children?: readonly NavItem[];
  descriptionKey?: string;
  /**
   * A standing label on the destination itself, not a state of the link.
   * Only `/national-teams` carries one: every other unbuilt page in this tree
   * is built by a later project in the same series, and its own page says so.
   */
  badge?: "soon";
}
```

- [x] **Step 4: تحقق نوعيًا**

Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS. الاختبار نفسه يبقى أحمر على القيمة (لا يوجد `/national-teams` بعد) ويخضرّ في A2 — تأكد أن الفشل صار على القيمة لا على النوع.

---

### Task A2: الشجرة الجديدة — ستة بنود وخمس لوحات

**Files:**
- Modify: `apps/web/src/lib/navigation.ts:92-132` (استبدال `PRIMARY_NAV` كاملًا) و`:1-58` (التعليق الرأسي يصف الشجرة الجديدة)
- Test: `apps/web/src/lib/navigation.spec.ts`

**Interfaces:**
- Consumes: `NavItem.badge` من A1.
- Produces: `PRIMARY_NAV` بستة بنود جذرية، مفاتيحها بالترتيب `about`, `athletics`, `championshipsResults`, `eventsSeasons`, `media`, `contact`. أبناء كل لوحة **أعمدة** (`NavItem` بلا `href` وله `children`)، وأبناء العمود روابط.

- [x] **Step 1: اكتب الاختبار الفاشل**

```ts
describe("الشجرة تطابق المواصفة", () => {
  it("ستة بنود جذرية بالترتيب", () => {
    expect(PRIMARY_NAV.map((item) => item.key)).toEqual([
      "about",
      "athletics",
      "championshipsResults",
      "eventsSeasons",
      "media",
      "contact",
    ]);
  });

  it("خمسة منها لوحات وتواصل معنا رابط مباشر", () => {
    expect(PRIMARY_NAV.filter((item) => item.children)).toHaveLength(5);
    expect(PRIMARY_NAV.at(-1)).toEqual({ key: "contact", href: "/contact" });
  });

  it("الرئيسية ليست في القائمة", () => {
    expect(PRIMARY_NAV.some((item) => item.href === "/")).toBe(false);
  });

  it("كل لوحة أبناؤها أعمدة وكل عمود أبناؤه روابط", () => {
    for (const panel of PRIMARY_NAV.filter((item) => item.children)) {
      for (const column of panel.children!) {
        expect(column.href, `${column.key} عمود ولا ينقل`).toBeUndefined();
        expect(column.children?.length ?? 0).toBeGreaterThan(0);
        for (const link of column.children!) {
          expect(link.href, `${link.key} رابط ويحمل وجهة`).toBeTruthy();
          expect(link.children).toBeUndefined();
        }
      }
    }
  });
});
```

- [x] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/lib/navigation.spec.ts`
Expected: FAIL — الترتيب الحالي `home, about, members, championships, events, news, media, contact`.

- [x] **Step 3: استبدل `PRIMARY_NAV`**

```ts
/**
 * Header primary navigation — 6 top-level items, 5 of them panels.
 *
 * A panel's children are COLUMNS, never links: the column is what the mega
 * panel lays out and what a screen reader announces as a heading, so it exists
 * in the tree rather than being inferred from position.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  {
    key: "about",
    children: [
      {
        key: "aboutFederationColumn",
        children: [
          { key: "aboutOverview", href: "/about", descriptionKey: "aboutOverviewDescription" },
          { key: "presidentMessage", href: "/about/president" },
          { key: "boardMembers", href: "/about/board-members" },
          { key: "committees", href: "/about/committees" },
        ],
      },
      {
        key: "governance",
        children: [
          { key: "visionMission", href: "/about/governance/vision-mission" },
          { key: "strategicPlan", href: "/about/governance/strategic-plan" },
          { key: "policies", href: "/about/governance/policies", descriptionKey: "policiesDescription" },
        ],
      },
    ],
  },
  {
    key: "athletics",
    children: [
      {
        key: "discoverSport",
        children: [
          { key: "discoverAthletics", href: "/athletics", descriptionKey: "discoverAthleticsDescription" },
          { key: "disciplinesEvents", href: "/athletics#disciplines" },
          { key: "ageCategories", href: "/athletics#ages", descriptionKey: "ageCategoriesDescription" },
          { key: "startTraining", href: "/athletics#start" },
        ],
      },
      {
        key: "athleticsCommunity",
        children: [
          { key: "clubs", href: "/clubs", descriptionKey: "clubsDescription" },
          { key: "athletes", href: "/athletes" },
          {
            key: "nationalTeams",
            href: "/national-teams",
            descriptionKey: "nationalTeamsDescription",
            badge: "soon",
          },
          { key: "coaches", href: "/coaches" },
          { key: "officials", href: "/officials" },
        ],
      },
    ],
  },
  {
    key: "championshipsResults",
    children: [
      {
        key: "competitions",
        children: [
          { key: "championships", href: "/championships", descriptionKey: "championshipsDescription" },
          { key: "resultsRankings", href: "/results-rankings" },
          { key: "records", href: "/records", descriptionKey: "recordsDescription" },
        ],
      },
    ],
  },
  {
    key: "eventsSeasons",
    children: [
      {
        key: "eventsColumn",
        children: [
          { key: "allEvents", href: "/events", descriptionKey: "allEventsDescription" },
          { key: "seasonAgenda", href: "/events?view=calendar" },
          { key: "currentSeason", href: "/seasons/current" },
          { key: "seasonsArchive", href: "/seasons" },
        ],
      },
    ],
  },
  {
    key: "media",
    children: [
      {
        key: "contentColumn",
        children: [
          { key: "news", href: "/news", descriptionKey: "newsDescription" },
          { key: "photoAlbums", href: "/media/albums" },
          { key: "videos", href: "/media/videos" },
          { key: "liveStream", href: "/media/videos#live" },
        ],
      },
    ],
  },
  { key: "contact", href: "/contact" },
];
```

- [x] **Step 4: شغّل الاختبارات**

Run: `cd apps/web && npx vitest run src/lib/navigation.spec.ts`
Expected: اختبارات A2 وA1 تمرّ. اختبارات أخرى في المستودع تُكسر الآن — تُصلَح في A6.

---

### Task A3: `#anchor` و`?query` لا يكسران المطابقة ولا يدخلان الفوتر

**Files:**
- Modify: `apps/web/src/lib/navigation.ts:134-175`
- Test: `apps/web/src/lib/navigation.spec.ts`

**Interfaces:**
- Produces: `pagePart(href)` داخلية؛ `isWithin(href, path)` تتجاهل ما بعد `#` و`?`؛ `navDestinations()` تعيد وجهات على مستوى الصفحة فقط بلا تكرار.

**Review Focus #1 مثبَّت هنا.**

- [x] **Step 1: اكتب الاختبار الفاشل**

```ts
import { FOOTER_QUICK_LINKS, isWithin } from "./navigation";

describe("الـanchor والـquery", () => {
  it("تقطع قبل مطابقة المسار", () => {
    expect(isWithin("/athletics#disciplines", "/athletics")).toBe(true);
    expect(isWithin("/events?view=calendar", "/events")).toBe(true);
    expect(isWithin("/athletics#ages", "/athletes")).toBe(false);
  });

  it("navDestinations تستبعد الـanchors والبث المباشر", () => {
    const hrefs = navDestinations().map((item) => item.href);
    expect(hrefs.some((href) => href.includes("#"))).toBe(false);
    expect(hrefs).not.toContain("/media/videos#live");
    expect(hrefs).toContain("/athletics");
    expect(hrefs).toContain("/events");
  });

  it("الفوتر لا يكرر وجهة", () => {
    const hrefs = FOOTER_QUICK_LINKS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
```

- [x] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/lib/navigation.spec.ts -t anchor`
Expected: FAIL — `isWithin("/athletics#disciplines", "/athletics")` تعيد `false`، والفوتر يحوي `/events?view=calendar` و`/media/videos#live`.

- [x] **Step 3: نفّذ**

```ts
/** The page part of a destination: everything before `#` or `?`. */
const pagePart = (href: string): string => href.split(/[#?]/, 1)[0]!;

export const isWithin = (href: string, path: string): boolean => {
  const page = pagePart(href);
  return page === "/" ? path === "/" : path === page || path.startsWith(`${page}/`);
};

/**
 * Every leaf destination in the tree, in reading order.
 *
 * A destination is a page. An in-page anchor, and a pre-filtered view of a page
 * the list already carries, are the same address twice over — the footer would
 * print both.
 */
export const navDestinations = (items: readonly NavItem[] = PRIMARY_NAV): NavLeaf[] => {
  const seen = new Set<string>();
  const walk = (nodes: readonly NavItem[]): NavLeaf[] =>
    nodes.flatMap((item) => {
      if (item.children) return walk(item.children);
      const page = pagePart(item.href!);
      // An anchor is a position inside a page, not a page. The live-stream item
      // is conditional too, and a footer cannot express "only while a broadcast
      // is running".
      if (page !== item.href || seen.has(page)) return [];
      seen.add(page);
      return [item as NavLeaf];
    });
  return walk(items);
};
```

- [x] **Step 4: شغّل**

Run: `cd apps/web && npx vitest run src/lib/navigation.spec.ts`
Expected: PASS.

> `containsPath` لا تُعدَّل: هي تستدعي `isWithin`، وقد صارت تقطع بنفسها.

---

### Task A4: حذف المسارين، وإضافة الخمسة قيد الإعداد

**Files:**
- Delete: `apps/web/src/app/[locale]/about/organisational-structure/` (المجلد كاملًا)
- Delete: `apps/web/src/app/[locale]/events/` (الشجرة كلها — ابنها الوحيد `federation-events/page.tsx`)
- Delete: `apps/web/src/components/pages/federation-events/` (المجلد كاملًا)
- Modify: `apps/web/src/lib/pages/public-pages.ts` — حذف الكائنين عند `:348-355` و`:371-378`، وإضافة خمسة
- Create: خمس صفحات تحت `apps/web/src/app/[locale]/`
- Test: `apps/web/src/lib/navigation.spec.ts`

**Interfaces:**
- Consumes: `PreparingPage` كما هو — لا تغيير في النوع.
- Produces: خمسة إدخالات بمفاتيح `athletics`, `national-teams`, `events`, `seasons`, `current-season`.

- [x] **Step 1: اكتب الاختبار الفاشل — صفر روابط مكسورة**

```ts
import { PREPARING_PAGES, PUBLIC_PAGES } from "./pages/public-pages";

describe("كل وجهة تصل إلى صفحة", () => {
  const known = new Set([
    ...PUBLIC_PAGES.map((page) => page.route),
    ...PREPARING_PAGES.map((page) => page.route),
  ]);

  it("كل href في الشجرة مسجل", () => {
    const missing = navDestinations()
      .map((item) => item.href)
      .filter((href) => !known.has(href));
    expect(missing).toEqual([]);
  });

  it("المسارات المحذوفة اختفت من كل سجل", () => {
    expect(known.has("/about/organisational-structure")).toBe(false);
    expect(known.has("/events/federation-events")).toBe(false);
  });
});
```

- [x] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/lib/navigation.spec.ts -t وجهة`
Expected: FAIL — خمسة مسارات غير مسجّلة.

- [x] **Step 3: احذف المجلدات الثلاثة**

```bash
rm -r "apps/web/src/app/[locale]/about/organisational-structure"
rm -r "apps/web/src/app/[locale]/events"
rm -r "apps/web/src/components/pages/federation-events"
```

- [x] **Step 4: احذف إدخالَي `PREPARING_PAGES`**

احذف الكائن الكامل `key: "organisational-structure"` والكائن الكامل `key: "federation-events"`. لا redirect ولا middleware: `app/[locale]/[...rest]/page.tsx` يعطي 404 محلّيًا بالفعل، وهو المطلوب.

- [x] **Step 5: أضف الخمسة**

```ts
  {
    key: "athletics",
    route: "/athletics",
    titleKey: "Nav.discoverAthletics",
    register: "neutral",
    registerBasis:
      "Precedent: /disciplines carries the same basis — reference content explaining the sport, nearest documented personality is Chapter 3 §3.34.2 Quiet/Institutional, 'Typography-led, minimal color'.",
  },
  {
    key: "national-teams",
    route: "/national-teams",
    titleKey: "Nav.nationalTeams",
    register: "neutral",
    registerBasis:
      "Chapter 3 §3.34.2 Clubs row — 'White + Green; club identity marks', a directory of teams; and guide §1.3, athletes in international context wear white, which is the national-team context itself.",
  },
  {
    key: "events",
    route: "/events",
    titleKey: "Nav.allEvents",
    register: "neutral",
    registerBasis:
      "صفحة مؤقتة؛ التصنيف النهائي يتحدد في spec المشروع الذي يبني الصفحة الحقيقية.",
  },
  {
    key: "seasons",
    route: "/seasons",
    titleKey: "Nav.seasonsArchive",
    register: "neutral",
    registerBasis:
      "صفحة مؤقتة؛ التصنيف النهائي يتحدد في spec المشروع الذي يبني الصفحة الحقيقية.",
  },
  {
    key: "current-season",
    route: "/seasons/current",
    titleKey: "Nav.currentSeason",
    register: "neutral",
    registerBasis: "صفحة مؤقتة؛ التصنيف النهائي يتحدد في spec المشروع الذي يبني الصفحة الحقيقية.",
  },
```

- [x] **Step 6: أنشئ صفحات الخمسة قيد الإعداد**

**اقرأ `apps/web/src/app/[locale]/officials/page.tsx` أولًا وطابق توقيعه الفعلي.** الشكل أدناه هو النمط؛ توقيع `buildMetadata` و`PreparingPageScreen` هو ما في ذلك الملف، لا ما هنا. خمسة ملفات: `athletics/page.tsx`، `national-teams/page.tsx`، `events/page.tsx`، `seasons/page.tsx`، `seasons/current/page.tsx` — كلٌّ بـ`KEY` الخاص به من Step 5.

```tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

const KEY = "athletics";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  // ... نفس جسم generateMetadata في officials/page.tsx، بـ KEY أعلاه
};

const AthleticsPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  // ... نفس جسم الصفحة في officials/page.tsx، بـ KEY أعلاه
};

export default AthleticsPage;
```

- [x] **Step 7: شغّل**

Run: `cd apps/web && npx vitest run src/lib/navigation.spec.ts src/lib/design-system/seo-contract.spec.ts && npx tsc --noEmit`
Expected: PASS. `seo-contract` يبقى أخضر: الصفحات الخمس `PREPARING` أي `noindex, follow` وخارج الـsitemap بالبناء، والمحذوفتان كانتا كذلك فتسقطان بلا أثر.

---

### Task A5: مفاتيح i18n — إضافة وحذف، واختبار parity

**Files:**
- Modify: `apps/web/messages/ar.json` و`apps/web/messages/en.json` (namespace `Nav`)
- Create: `apps/web/src/lib/i18n/message-parity.spec.ts`

**Interfaces:**
- Produces: كل `key` و`descriptionKey` في الشجرة له مفتاح في اللغتين. تُحذف: `organisationalStructure`, `members`, `events`.
> **(تعديل ما قبل التنفيذ)** `clubsDescription` **يبقى** ومعه `descriptionKey` على `/clubs`: «الأندية هي أعضاء الجمعية العمومية» قرار IA موثّق في ADR-0062، وشيله كان أثرًا جانبيًا لإعادة الهيكلة لا قرارًا (قرار المالك 2026-09-28).
> **(تعديل ما قبل التنفيذ)** `Nav.home` **يبقى**: 23 ملفًا تستعمله كأول درجة في الـbreadcrumb (`nav("home")` / `t("Nav.home")`). قرار الـspec §3 كان حذف «الرئيسية» من **القائمة** لا حذف مفتاحها. اختبار المفاتيح اليتيمة يستثنيه بالاسم عبر `NAV_KEYS_USED_ELSEWHERE`.

> هذا يغلق M3: الـspec §10 افترض وجود اختبار parity، ولا وجود له — `page-message-keys.spec.ts` يتحقق من عناوين الصفحات فقط.

- [x] **Step 1: اكتب الاختبار الفاشل**

```ts
// apps/web/src/lib/i18n/message-parity.spec.ts
import { describe, expect, it } from "vitest";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import { PRIMARY_NAV, type NavItem } from "../navigation";

/** Every leaf path in a messages object, dotted as next-intl reads it. */
const paths = (node: unknown, prefix = ""): string[] => {
  if (typeof node !== "object" || node === null) return [prefix];
  return Object.entries(node).flatMap(([key, value]) =>
    paths(value, prefix ? `${prefix}.${key}` : key),
  );
};

const flatten = (items: readonly NavItem[]): NavItem[] =>
  items.flatMap((item) => [item, ...flatten(item.children ?? [])]);

const navKeys = () =>
  flatten(PRIMARY_NAV).flatMap((item) =>
    [item.key, item.descriptionKey].filter((key): key is string => Boolean(key)),
  );

// `home` names the breadcrumb's first crumb on every page; `badgeSoon` is the badge text.
const NAV_KEYS_USED_ELSEWHERE = ["home", "badgeSoon"];

describe("تطابق المفاتيح بين اللغتين", () => {
  it("لا مفتاح في لغة دون الأخرى", () => {
    const inAr = new Set(paths(ar));
    const inEn = new Set(paths(en));
    expect([...inAr].filter((key) => !inEn.has(key)), "في العربي فقط").toEqual([]);
    expect([...inEn].filter((key) => !inAr.has(key)), "في الإنجليزي فقط").toEqual([]);
  });

  it("كل بند في الشجرة له اسم في اللغتين", () => {
    const inAr = new Set(paths(ar));
    expect(navKeys().filter((key) => !inAr.has(`Nav.${key}`))).toEqual([]);
  });

  it("لا مفتاح يتيم تحت Nav", () => {
    const used = new Set([...navKeys(), ...NAV_KEYS_USED_ELSEWHERE]);
    const orphans = paths((en as Record<string, unknown>).Nav).filter((key) => !used.has(key));
    expect(orphans).toEqual([]);
  });
});
```

- [x] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/lib/i18n/message-parity.spec.ts`
Expected: FAIL — مفاتيح ناقصة (`athletics`, `discoverSport`, …) ومفاتيح يتيمة (`members`, `organisationalStructure`, `events`). `home` ليس يتيمًا — انظر الملاحظة أعلاه.

- [x] **Step 3: استبدل `Nav` في `en.json`**

```json
{
  "about": "About",
  "aboutFederationColumn": "The Federation",
  "aboutOverview": "About the Federation",
  "aboutOverviewDescription": "History and achievements since 1974",
  "presidentMessage": "President's Message",
  "boardMembers": "Board of Directors",
  "committees": "Committees",
  "governance": "Governance",
  "visionMission": "Vision & Mission",
  "strategicPlan": "Strategic Plan",
  "policies": "Regulations & Policies",
  "policiesDescription": "Official regulations and circulars",
  "athletics": "Athletics",
  "discoverSport": "Discover the Sport",
  "discoverAthletics": "Discover Athletics",
  "discoverAthleticsDescription": "Disciplines, categories and how to start",
  "disciplinesEvents": "Disciplines & Events",
  "ageCategories": "Age Categories",
  "ageCategoriesDescription": "Find your category in the current season",
  "startTraining": "Start Training",
  "athleticsCommunity": "Athletics Community",
  "clubs": "Clubs",
  "clubsDescription": "General Assembly members",
  "athletes": "Athletes",
  "nationalTeams": "National Teams & Talent",
  "nationalTeamsDescription": "National teams and the talent-discovery programme",
  "coaches": "Coaches",
  "officials": "Officials",
  "championshipsResults": "Championships & Results",
  "competitions": "Competitions",
  "championships": "Championships",
  "championshipsDescription": "The local and international championship calendar",
  "resultsRankings": "Results & Rankings",
  "records": "Records",
  "recordsDescription": "National records for every event",
  "eventsSeasons": "Events & Seasons",
  "eventsColumn": "Events",
  "allEvents": "All Events",
  "allEventsDescription": "Conferences, ceremonies, camps and courses",
  "seasonAgenda": "Season Agenda",
  "currentSeason": "Current Season",
  "seasonsArchive": "Seasons Archive",
  "media": "Media Center",
  "contentColumn": "Content",
  "news": "News & Articles",
  "newsDescription": "Including UAEAF in the Media",
  "photoAlbums": "Photo Albums",
  "videos": "Videos",
  "liveStream": "Live Stream",
  "contact": "Contact Us",
  "badgeSoon": "Soon"
}
```

- [x] **Step 4: استبدل `Nav` في `ar.json` — نفس المفاتيح بالترتيب نفسه**

```json
{
  "about": "عن الاتحاد",
  "aboutFederationColumn": "الاتحاد",
  "aboutOverview": "نبذة عن الاتحاد",
  "aboutOverviewDescription": "التاريخ والإنجازات منذ 1974",
  "presidentMessage": "كلمة الرئيس",
  "boardMembers": "مجلس الإدارة",
  "committees": "اللجان",
  "governance": "الحوكمة",
  "visionMission": "الرؤية والرسالة",
  "strategicPlan": "الخطة الاستراتيجية",
  "policies": "اللوائح والسياسات",
  "policiesDescription": "الأنظمة والتعاميم الرسمية",
  "athletics": "ألعاب القوى",
  "discoverSport": "تعرّف على اللعبة",
  "discoverAthletics": "تعرّف على ألعاب القوى",
  "discoverAthleticsDescription": "التخصصات والفئات وكيف تبدأ",
  "disciplinesEvents": "التخصصات والمسابقات",
  "ageCategories": "الفئات العمرية",
  "ageCategoriesDescription": "اعرف فئتك في الموسم الحالي",
  "startTraining": "ابدأ ممارسة اللعبة",
  "athleticsCommunity": "مجتمع ألعاب القوى",
  "clubs": "الأندية",
  "clubsDescription": "أعضاء الجمعية العمومية",
  "athletes": "الرياضيون",
  "nationalTeams": "المنتخبات والمواهب",
  "nationalTeamsDescription": "المنتخبات وبرنامج اكتشاف المواهب",
  "coaches": "المدربون",
  "officials": "الحكام",
  "championshipsResults": "البطولات والنتائج",
  "competitions": "المنافسات",
  "championships": "البطولات",
  "championshipsDescription": "روزنامة البطولات المحلية والخارجية",
  "resultsRankings": "النتائج والترتيب",
  "records": "الأرقام القياسية",
  "recordsDescription": "الأرقام الوطنية لكل مسابقة",
  "eventsSeasons": "الفعاليات والمواسم",
  "eventsColumn": "الفعاليات",
  "allEvents": "جميع الفعاليات",
  "allEventsDescription": "المؤتمرات والاحتفاليات والمعسكرات والدورات",
  "seasonAgenda": "أجندة الموسم",
  "currentSeason": "الموسم الحالي",
  "seasonsArchive": "أرشيف المواسم",
  "media": "المركز الإعلامي",
  "contentColumn": "المحتوى",
  "news": "الأخبار والمقالات",
  "newsDescription": "ومعها الاتحاد في الإعلام",
  "photoAlbums": "ألبومات الصور",
  "videos": "الفيديوهات",
  "liveStream": "البث المباشر",
  "contact": "تواصل معنا",
  "badgeSoon": "قريبًا"
}
```

- [x] **Step 5: شغّل**

Run: `cd apps/web && npx vitest run src/lib/i18n/message-parity.spec.ts src/lib/pages/page-message-keys.spec.ts`
Expected: PASS في الملفين. `page-message-keys` كان يتحقق أن `titleKey` كل صفحة يُحَل — والخمسة الجدد صاروا يُحَلّون.

---

### Task A6: إصلاح الاختبارات التي كسرتها الشجرة

**Files:**
- Modify: `apps/web/src/components/layout/site-header.test.tsx:14,35,50,156-188`
- Modify: `apps/web/src/components/pages/preparing-page-screen.spec.tsx:120-138`

- [x] **Step 1: شغّل لترى ما كُسر بالضبط**

Run: `cd apps/web && npx vitest run src/components/layout/site-header.test.tsx src/components/pages/preparing-page-screen.spec.tsx`
Expected: FAIL — `toHaveLength(3)` (المجموعات صارت 5)، و`toHaveLength(5)` (الروابط الجذرية صارت 1)، ولوحة `Members` اختفت، و`/about` لم يعد تحته صفحة قيد إعداد.

- [x] **Step 2: صحّح العدّات**

```tsx
expect(groups).toHaveLength(5);
expect(topLevelLinks).toHaveLength(1);
```

- [x] **Step 3: استبدل لوحة `Members` بلوحة `Athletics`**

في السطور 156-188 بدّل كل `{ name: /^Members/ }` بـ `{ name: /^Athletics/ }`. السلوك المختبَر (الفتح، `aria-expanded`، غياب `aria-current` عن الزر) لم يتغيّر؛ البند الذي يحمله هو ما تغيّر.

- [x] **Step 4: أعِد توجيه اختبار العمق**

لم يبقَ تحت `/about` صفحة قيد إعداد، والاختبار كان يقيس «عمق اثنين فأكثر» عبر `/about/organisational-structure`. البديل الحقيقي في السجل الجديد هو `/seasons/current`.

```tsx
const nested = PREPARING_PAGES.filter((page) => page.route.split("/").length > 2);
expect(nested.length).toBeGreaterThan(0);
```
> غيّر اسم الاختبار ليصف ما يقيسه فعلًا: العمق، لا `/about`.

- [x] **Step 5: شغّل الحُرّاس كاملين**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit`
Expected: PASS بالكامل.

- [x] **Step 6: الـcommit — سلّم هذا النص للمالك**

```
git add apps/web/src/lib apps/web/messages apps/web/src/app apps/web/src/components
git commit -m "feat(web): header v2 navigation tree, routes and messages"
```
> يكسر البناء وحده: **لا**.

---

## ✅ نقطة توقف A

- `npx tsc --noEmit` أخضر · `npx vitest run` أخضر بالكامل.
- `/about/organisational-structure` و`/events/federation-events` يعطيان 404 محلّيًا، بلا redirect.
- الفوتر يعرض الوجهات الجديدة، بلا `#` وبلا تكرار.
- الهيدر ما زال بشكله القديم. هذا متوقع.

---

# الدفعة B — الصف واللوحات (Desktop ≥ 1280)

**الهدف:** الصف الجديد وكبسولة الأدوات واللوحات الخمس بثلاثة أعمدة وطبقة تعتيم. البطاقات تُرسم كـfallback فقط — بياناتها الحقيقية في الدفعة D.

**نقطة توقف للمراجعة في نهايتها.**

### Task B1: `TricolorIndicator` — الخط السفلي الثلاثي

**Files:**
- Create: `apps/web/src/components/layout/mega/tricolor-indicator.tsx`
- Modify: `apps/web/src/styles/motion.css:283-300` (يحل محل `.nav-indicator`)
- Test: `apps/web/src/lib/design-system/direction-and-logo-contract.spec.ts`

**Interfaces:**
- Produces: `<TricolorIndicator active={boolean} />` — عنصر `aria-hidden` بارتفاع `--border-width-ring` (3px) وخلفية `--brand-tricolor`.

- [ ] **Step 1: اكتب الاختبار الفاشل**

في `direction-and-logo-contract.spec.ts`، داخل `describe("primary navigation row (Chapter 5 §5.2)")`:

```ts
it("يرسم الخط النشط من تدرج الهوية لا من لون مفرد", () => {
  const source = read("src/components/layout/mega/tricolor-indicator.tsx");
  // The tricolour gradient resolves to an invalid value unless it is
  // redeclared on the element that paints it (surfaces.css §"[data-surface]").
  expect(source).toMatch(/data-surface/);
  expect(source).toMatch(/var\(--brand-tricolor\)/);
  expect(source).toMatch(/var\(--border-width-ring\)/);
  expect(source).not.toMatch(/--color-brand-primary/);
  expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/lib/design-system/direction-and-logo-contract.spec.ts -t تدرج`
Expected: FAIL — الملف غير موجود.

- [ ] **Step 3: اكتب المكوّن**

```tsx
/**
 * The active item's underline: the federation's three inks, 3px.
 *
 * `data-surface` is load-bearing, not decoration. `--brand-tricolor` is
 * declared on `:root, [data-surface]`, and an element without the attribute
 * resolves it to the guaranteed-invalid value — the bar then occupies its
 * height and paints nothing.
 */
export const TricolorIndicator = ({ active }: { active: boolean }) => (
  <span
    aria-hidden="true"
    data-surface="base"
    data-state={active ? "on" : "rest"}
    className="nav-indicator h-[var(--border-width-ring)] w-6 shrink-0 rounded-full bg-[image:var(--brand-tricolor)] xl:w-full"
  />
);
```

- [ ] **Step 4: بدّل حركة `.nav-indicator` من الإزاحة إلى `scaleX`**

في `motion.css`، استبدل القاعدة عند `:297-300`:

```css
.nav-indicator {
  transform-origin: inline-start;
  transition: opacity var(--motion-transition-exit), transform var(--motion-transition-exit);
}

.nav-indicator[data-state="rest"] {
  opacity: 0;
  transform: scaleX(0);
}
```
> `transform-origin: inline-start` منطقي لا فيزيائي: الخط يفتح من بداية البند في الاتجاهين. هذا الاستثناء الوحيد من ADR-0059 §D7.1 لأن الخط يتبع النص لا الهوية.

- [ ] **Step 5: شغّل**

Run: `cd apps/web && npx vitest run src/lib/design-system/direction-and-logo-contract.spec.ts && npx tsc --noEmit`
Expected: PASS.

---

### Task B2: `HeaderToolsCapsule` — البحث واللغة والوضع

**Files:**
- Create: `apps/web/src/components/layout/header-tools-capsule.tsx`
- Create: `apps/web/src/components/layout/theme-switch.tsx` (يحل محل `theme-toggle.tsx`)
- Create: `apps/web/src/components/layout/language-switch.tsx` (يحل محل `language-toggle.tsx`)
- Create: `apps/web/src/components/search/search-trigger.tsx`
- Modify: `apps/web/src/components/layout/site-header.tsx:122-145`
- Test: `apps/web/src/components/layout/header-tools-capsule.spec.tsx` (create)

**Interfaces:**
- Produces: `<HeaderToolsCapsule layout="row" | "drawer" onOpenSearch={() => void} />`. `layout` يبدّل الأحجام فقط، لا البنية ولا الترتيب.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
// apps/web/src/components/layout/header-tools-capsule.spec.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeaderToolsCapsule } from "./header-tools-capsule";

describe("كبسولة الأدوات", () => {
  it("ثلاثة عناصر بترتيب بحث ثم لغة ثم وضع", () => {
    render(<HeaderToolsCapsule layout="row" onOpenSearch={vi.fn()} />);
    const names = screen.getAllByRole("button").map((node) => node.getAttribute("data-tool"));
    expect(names).toEqual(["search", "language", "theme"]);
  });

  it("مفتاح الوضع switch باسم ثابت", () => {
    render(<HeaderToolsCapsule layout="row" onOpenSearch={vi.fn()} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked");
    expect(toggle).toHaveAccessibleName("Dark mode");
  });

  it("زر البحث يعلن اختصاره ويستدعي الفاتح", async () => {
    const onOpenSearch = vi.fn();
    render(<HeaderToolsCapsule layout="row" onOpenSearch={onOpenSearch} />);
    const search = screen.getByRole("button", { name: /search/i });
    expect(search).toHaveAttribute("aria-keyshortcuts", "Control+K Meta+K");
    await userEvent.click(search);
    expect(onOpenSearch).toHaveBeenCalledOnce();
  });

  it("مبدل اللغة يسمي الوجهة بحرفها ويحمل lang", () => {
    render(<HeaderToolsCapsule layout="row" onOpenSearch={vi.fn()} />);
    const language = screen.getByRole("link", { name: /English/ });
    expect(language).toHaveAttribute("lang", "en");
    expect(language).toHaveAttribute("hrefLang", "en");
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/header-tools-capsule.spec.tsx`
Expected: FAIL — الملف غير موجود.

- [ ] **Step 3: اكتب `ThemeSwitch`**

> **(تعديل ما قبل التنفيذ)** النسخة السابقة كتبت `const [theme, setTheme] = useTheme();` — **لا وجود لهذا الـhook.** الشكل الفعلي في `theme-toggle.tsx:63` هو `useSyncExternalStore(subscribe, readTheme, serverTheme)` بـ`MutationObserver` على `data-theme`. `ThemeSwitch` **ينقل `subscribe` و`readTheme` و`serverTheme` والكاتب كما هي**، والتغيير في الغلاف وحده. لا hook جديد يُستخرج.

انقل من `theme-toggle.tsx` بلا تعديل في المنطق: `subscribe` (سطور 23-32)، و`readTheme` (34)، و`serverTheme` (39)، وجسم الكاتب بما فيه `data-theme-switching`. `readTheme` وحدها تتغيّر — في Step 4b، ولسبب مستقل.

```tsx
/**
 * Light and dark. High contrast is not a third position here: it follows the
 * device (`prefers-contrast: more`, `forced-colors: active`) and outranks this
 * control, so a switch with a third state would offer a choice the platform
 * has already made (ADR-0121 D9).
 */
export const ThemeSwitch = () => {
  const t = useTranslations("Header");
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  // Body copied verbatim from `ThemeToggle.toggle` (theme-toggle.tsx:65-82),
  // including the DOUBLE requestAnimationFrame, the write order, and the
  // try/catch around localStorage. Do not re-derive it.
  const toggle = () => { /* … */ };

  return (
    <button
      type="button"
      role="switch"
      data-tool="theme"
      aria-checked={theme === "dark"}
      aria-label={t("darkMode")}
      onClick={toggle}
      className={`theme-switch relative flex h-11 w-[var(--space-16)] items-center rounded-full ${TRANSITION} ${FOCUS}`}
    >
      <SunIcon />
      <MoonIcon />
      <span aria-hidden="true" className="theme-switch-knob" />
    </button>
  );
};
```

- [ ] **Step 4: التباين العالي يتبع الجهاز — قبل أول رسم**

> **مُعدَّلة بقرار المالك 2026-09-28.** النسخة السابقة ضبطت `color-scheme` وحده وأجّلت الباقي. القرار: ثيم `high-contrast` يُشغَّل فعليًا من إعداد الجهاز، **بلا تكرار أي توكن تحت media query** — الثيم موجود كاملًا في `high-contrast.css` تحت `[data-theme="high-contrast"]`، فالمطلوب كتابة السمة لا إعادة تعريف القيم.

**Files:** `apps/web/src/app/[locale]/layout.tsx:49-60` (توسيع `themeBootstrapScript` القائم).

وسّع السكربت القائم — هو نفسه آلية تطبيق الثيم اليوم، ولا تُضاف آلية ثانية:

```js
const themeBootstrapScript = `
(function () {
  try {
    var hc = window.matchMedia('(prefers-contrast: more)');
    var apply = function () {
      var stored = localStorage.getItem('uaeaf-theme');
      var chosen = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', hc.matches ? 'high-contrast' : chosen);
    };
    apply();
    hc.addEventListener('change', apply);
  } catch (e) {}
})();
`;
```

- [ ] **Step 4b: المفتاح يعرض حالته المحفوظة تحت التباين العالي**

`readTheme()` في `ThemeSwitch` يقرأ السمة، وتحت التباين العالي تكون `high-contrast` — فيقرؤها المفتاح `light` ويكذب على قارئ حفظ `dark`. المفتاح يقرأ **التفضيل المحفوظ** حين لا تكون السمة أحد الوضعين:

```ts
/** The stored preference, which is what the switch reports while the device's
 *  high-contrast setting is overriding the attribute (ADR-0121 D9). */
const readTheme = (): Theme => {
  const applied = document.documentElement.getAttribute("data-theme");
  if (applied === "dark" || applied === "light") return applied;
  try {
    return localStorage.getItem("uaeaf-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};
```

الكتابة لا تتغيّر: المفتاح يكتب `localStorage` و`data-theme` كما اليوم، والسكربت يعيد فرض `high-contrast` عند تغيّر الإعداد. بينما التباين العالي شغّال، كتابة المفتاح تُخزَّن ولا تُرى — وهذا هو المقصود بأسبقيته.

- [ ] **Step 4c: اختبار الأسبقية**

```tsx
it("المفتاح يعرض المحفوظ لا المطبَّق تحت التباين العالي", () => {
  localStorage.setItem("uaeaf-theme", "dark");
  document.documentElement.setAttribute("data-theme", "high-contrast");
  render(<HeaderToolsCapsule layout="row" onOpenSearch={vi.fn()} />);
  expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
});
```

> `forced-colors: active` يتكفّل به المتصفح بلا عمل من جانبنا، ويُتحقَّق منه في F5. **ولا توكن واحد يُكرَّر تحت media query** — `high-contrast.css` هو المصدر الوحيد لقيم هذا الثيم.

- [ ] **Step 5: اكتب `LanguageSwitch`**

```tsx
/**
 * Names only the destination, in that destination's own script: the one
 * convention a reader who cannot read the current page can still follow.
 * The full name moved to the accessible name and the tooltip (amends
 * ADR-0061 D5, which had the button spell the language out).
 */
export const LanguageSwitch = () => {
  const t = useTranslations("Header");
  const other = useLocale() === "ar" ? "en" : "ar";

  return (
    <Link
      href={usePathname()}
      locale={other}
      lang={other}
      hrefLang={other}
      data-tool="language"
      title={t("switchLanguageFull", { language: t(`language.${other}`) })}
      aria-label={t("switchLanguageFull", { language: t(`language.${other}`) })}
      className={`flex size-11 items-center justify-center rounded-full text-label font-medium ${TRANSITION} ${FOCUS}`}
    >
      {other === "en" ? "EN" : "ع"}
    </Link>
  );
};
```

- [ ] **Step 6: اكتب `SearchTrigger` و`HeaderToolsCapsule`**

```tsx
export const SearchTrigger = ({ onOpen }: { onOpen: () => void }) => {
  const t = useTranslations("Header");
  return (
    <button
      type="button"
      data-tool="search"
      aria-keyshortcuts="Control+K Meta+K"
      title={t("searchShortcut")}
      aria-label={t("search")}
      onClick={onOpen}
      className={`flex size-11 items-center justify-center rounded-full ${TRANSITION} ${FOCUS}`}
    >
      <SearchIcon />
    </button>
  );
};

/**
 * The header's three controls, in one order for both layouts.
 *
 * `layout` changes sizes, never structure: a second arrangement for the drawer
 * would be a second tab order and a second set of accessible names to keep
 * in step.
 */
export const HeaderToolsCapsule = ({
  layout,
  onOpenSearch,
}: {
  layout: "row" | "drawer";
  onOpenSearch: () => void;
}) => (
  <div
    data-layout={layout}
    className="flex items-center gap-1 rounded-full border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-1"
  >
    <SearchTrigger onOpen={onOpenSearch} />
    <span aria-hidden="true" className="h-6 w-px bg-[color:var(--color-border-default)]" />
    <LanguageSwitch />
    <span aria-hidden="true" className="h-6 w-px bg-[color:var(--color-border-default)]" />
    <ThemeSwitch />
  </div>
);
```

- [ ] **Step 7: أضف مفاتيح `Header` الجديدة في اللغتين**

`en`: `"darkMode": "Dark mode"`, `"searchShortcut": "Search — Ctrl+K"`, `"switchLanguageFull": "{language} — switch to {language}"`, `"language": { "ar": "العربية", "en": "English" }`.
`ar`: `"darkMode": "الوضع الداكن"`, `"searchShortcut": "البحث — Ctrl+K"`, `"switchLanguageFull": "{language} — التبديل إلى {language}"`, ونفس كائن `language`.
احذف `switchToDarkMode` و`switchToLightMode` و`switchLanguage` — يتيمة الآن، واختبار parity في A5 يكشفها.

- [ ] **Step 8: احذف الملفين القديمين واربط الجديد**

```bash
rm apps/web/src/components/layout/theme-toggle.tsx
rm apps/web/src/components/layout/language-toggle.tsx
```
في `site-header.tsx`، استبدل الكتلة `:122-145` بـ`<HeaderToolsCapsule layout="row" onOpenSearch={openSearch} />` ثم زر الدرج. `onOpenSearch` يمرَّر من `HeaderShell` في B6.

- [ ] **Step 9: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout src/lib/i18n && npx tsc --noEmit`
Expected: PASS. `direction-and-logo-contract.spec.ts` يشير إلى `TOGGLE` — حدّث المسار إلى `language-switch.tsx` فيه، **ولا تحذف الحارس**.

---

### Task B3: `MegaLink` و`MegaColumn`

**Files:**
- Create: `apps/web/src/components/layout/mega/mega-link.tsx`
- Create: `apps/web/src/components/layout/mega/mega-column.tsx`
- Test: `apps/web/src/components/layout/mega/mega-column.spec.tsx` (create)

**Interfaces:**
- Consumes: `NavItem` من `@/lib/navigation`.
- Produces: `<MegaLink item={NavItem} currentPath={string} />` و`<MegaColumn column={NavItem} currentPath={string} />`. يستعملهما الصف والدرج معًا.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MegaColumn } from "./mega-column";

const column = {
  key: "athleticsCommunity",
  children: [
    { key: "clubs", href: "/clubs" },
    { key: "nationalTeams", href: "/national-teams", badge: "soon" as const },
  ],
};

describe("عمود اللوحة", () => {
  it("عنوان العمود h2 مرئي", () => {
    render(<MegaColumn column={column} currentPath="/" />);
    expect(screen.getByRole("heading", { level: 2 })).toBeVisible();
  });

  it("aria-current على الرابط المطابق وحده", () => {
    render(<MegaColumn column={column} currentPath="/clubs" />);
    expect(screen.getByRole("link", { name: /Clubs/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /National Teams/ })).not.toHaveAttribute("aria-current");
  });

  it("الشارة تُنطق مع اسم الرابط", () => {
    render(<MegaColumn column={column} currentPath="/" />);
    expect(screen.getByRole("link", { name: /National Teams & Talent.*Soon/s })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/mega/mega-column.spec.tsx`
Expected: FAIL — الملف غير موجود.

- [ ] **Step 3: اكتب `MegaLink`**

```tsx
/**
 * One destination inside a panel: icon tile, title, optional description.
 *
 * `aria-current` sits on the link and never on the panel's button: the button
 * discloses, it does not navigate, and marking both would name two current
 * pages at once.
 */
export const MegaLink = ({ item, currentPath }: { item: NavItem; currentPath: string }) => {
  const t = useTranslations("Nav");

  return (
    <Link
      href={item.href!}
      prefetch={isBuilt(pagePart(item.href!)) ? undefined : false}
      aria-current={item.href === currentPath ? "page" : undefined}
      data-nav-focusable=""
      className={`mega-link flex min-h-11 items-start gap-3 rounded-sm p-3 ${TRANSITION} ${FOCUS}`}
    >
      <span aria-hidden="true" className="mega-link-tile shrink-0">
        <NavIcon name={item.key} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-2 text-body font-bold">
          {t(item.key)}
          {item.badge ? <Badge>{t("badgeSoon")}</Badge> : null}
        </span>
        {item.descriptionKey ? (
          <span className="text-caption text-[color:var(--color-text-muted)]">
            {t(item.descriptionKey)}
          </span>
        ) : null}
      </span>
    </Link>
  );
};
```
> الشارة **داخل** `<Link>` لا بجانبه، فتدخل اسمه المنطوق: «National Teams & Talent, Soon». خارجَه تصير نصًّا يتيمًا لا يعرف قارئ الشاشة إلى أي رابط ينتمي.
> `NavIcon` خريطة `key → <svg>` في `mega/nav-icon.tsx`، بمربع `--space-10` (40px) وأيقونة `--icon-size-sm` (20px). التصميم يُظهر 38px ولا توكن له؛ 40px هو الأقرب و`--space-10` يحمله.

- [ ] **Step 4: اكتب `MegaColumn`**

```tsx
/**
 * A column of destinations under a visible heading.
 *
 * The heading is `h2` and visible rather than `sr-only`: a panel of eight
 * links with no headings is eight peers to a screen reader, and the grouping
 * the design draws is exactly the information that navigation needs.
 */
export const MegaColumn = ({ column, currentPath }: { column: NavItem; currentPath: string }) => {
  const t = useTranslations("Nav");

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h2 className="text-overline text-[color:var(--color-text-muted)]">{t(column.key)}</h2>
      <ul className="flex flex-col">
        {column.children!.map((item) => (
          <li key={item.key}>
            <MegaLink item={item} currentPath={currentPath} />
          </li>
        ))}
      </ul>
    </div>
  );
};
```

- [ ] **Step 5: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout/mega && npx tsc --noEmit`
Expected: PASS.

---

### Task B4: `MegaPanel` وطبقة التعتيم

**Files:**
- Create: `apps/web/src/components/layout/mega/mega-panel.tsx`
- Modify: `apps/web/src/styles/motion.css:256-273` (`nav-float` يكتسب حالة اللوحة الواسعة)
- Test: `apps/web/src/components/layout/mega/mega-panel.spec.tsx` (create)

**Interfaces:**
- Consumes: `MegaColumn` من B3.
- Produces: `<MegaPanel id item open columns feature currentPath />` — `region` باسم البند، بعرض الحاوية، وشبكة `columns + feature`.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
describe("لوحة mega", () => {
  it("region باسم البند", () => {
    render(<MegaPanel id="p" item={aboutItem} open columns={aboutItem.children!} feature={null} currentPath="/" />);
    expect(screen.getByRole("region", { name: /About/ })).toBeInTheDocument();
  });

  it("العمود الغائب لا يترك فجوة — الشبكة تعدّ الأعمدة الموجودة", () => {
    const { container } = render(
      <MegaPanel id="p" item={mediaItem} open columns={mediaItem.children!} feature={null} currentPath="/" />,
    );
    expect(container.querySelector("[data-columns]")).toHaveAttribute("data-columns", "1");
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/mega/mega-panel.spec.tsx`
Expected: FAIL — الملف غير موجود.

- [ ] **Step 3: اكتب المكوّن**

```tsx
/**
 * One panel: its columns, then the feature card at the end.
 *
 * `data-columns` carries the count to CSS rather than a class per number: a
 * panel whose data source returned nothing has fewer columns, and the grid has
 * to close up rather than leave the gap where the missing one would have been.
 */
export const MegaPanel = ({ id, item, open, columns, feature, currentPath }: MegaPanelProps) => {
  const t = useTranslations("Nav");

  return (
    <div
      id={id}
      role="region"
      aria-label={t(item.key)}
      data-open={open}
      data-columns={columns.length}
      className="mega-panel xl:nav-float"
    >
      <div className="grid gap-[var(--grid-gutter-xl)] p-[var(--space-6)]">
        {columns.map((column) => (
          <MegaColumn key={column.key} column={column} currentPath={currentPath} />
        ))}
        {feature}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: اكتب CSS اللوحة**

في `motion.css`، بجوار `nav-float`:

```css
@utility mega-panel {
  position: absolute;
  inset-inline: 0;
  top: 100%;
  z-index: 40;
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
  background: var(--color-surface-raised);
  box-shadow: var(--elevation-dropdown);
}

.mega-panel > div {
  grid-template-columns: repeat(var(--mega-columns, 2), minmax(0, 1fr)) minmax(0, 1.2fr);
}

.mega-panel[data-columns="1"] > div {
  --mega-columns: 1;
}
```
> عرض البطاقة كسر `1.2fr` لا 380px: القيمة الثابتة لا توكن لها، والكسر يعطي النسبة نفسها عند 1440 ويضيق بأمان عند 1280.

- [ ] **Step 5: أضف طبقة التعتيم**

في `header-shell.tsx` (تُنشأ في B6)، بجوار الـscrim الموجود للدرج:

```tsx
{/* Covers the page under the header while a panel is open. `aria-hidden` and
    not focusable: it duplicates Escape rather than adding a control. */}
<div
  aria-hidden="true"
  data-open={openKey !== null}
  onClick={closePanel}
  className={`nav-scrim fixed inset-0 top-[var(--header-height)] z-30 hidden bg-[color:var(--color-brand-black)] xl:block ${
    openKey ? "" : "pointer-events-none"
  }`}
/>
```

- [ ] **Step 6: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout && npx tsc --noEmit`
Expected: PASS.

---

### Task B5: `FeatureCard` وبطاقات الـfallback

**Files:**
- Create: `apps/web/src/components/layout/cards/feature-card.tsx`
- Create: `apps/web/src/components/layout/cards/index.tsx` (بطاقة لكل لوحة)
- Test: `apps/web/src/components/layout/cards/feature-card.spec.tsx` (create)

**Interfaces:**
- Produces: `<FeatureCard eyebrow title meta href cta tone />`. `tone` من `"green" | "red" | "blue" | "ink"` — يُختار لكل لوحة ويُثبَّت، لا يتغيّر بالمحتوى.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
describe("البطاقة المميزة", () => {
  it("رابط واحد يغطي البطاقة كلها", () => {
    render(<FeatureCard eyebrow="e" title="t" href="/about/president" cta="c" tone="green" />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("بلا عنوان لا تُرسم بطاقة", () => {
    const { container } = render(<FeatureCard eyebrow="e" title={null} href="/x" cta="c" tone="green" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/cards/feature-card.spec.tsx`
Expected: FAIL — الملف غير موجود.

- [ ] **Step 3: اكتب البطاقة**

```tsx
/**
 * The panel's one promoted destination.
 *
 * One link around the whole card, not a link per line: two links to the same
 * address inside one card read as two destinations to a screen reader and
 * double the tab stops for a single choice.
 */
export const FeatureCard = ({ eyebrow, title, meta, href, cta, tone, children }: FeatureCardProps) => {
  if (!title) return null;

  return (
    <Link
      href={href}
      data-nav-focusable=""
      data-surface={tone}
      className={`feature-card group flex min-h-11 flex-col justify-end gap-2 rounded-md p-[var(--space-6)] ${TRANSITION} ${FOCUS}`}
    >
      {children}
      <span className="text-overline opacity-85">{eyebrow}</span>
      <span className="text-title font-bold">{title}</span>
      {meta ? <span className="text-caption opacity-85">{meta}</span> : null}
      <span className="text-body-sm font-medium">{cta}</span>
    </Link>
  );
};
```
> `data-surface={tone}` هو ما يجعل التدرّج والحبر يُحلّان على البطاقة (سابقة `surfaces.css`)، وهو أيضًا ما يمنع hex. الألوان الأربع في صور التصميم (أخضر لعن الاتحاد، أزرق داكن لألعاب القوى، أحمر للبطولات، أزرق للفعاليات، حبر للإعلام) تُترجم إلى `data-surface` القائم؛ أي لون لا يقابله register مسجَّل يُعلَّم `DESIGN DECISION REQUIRED` ولا يُخترع.

- [ ] **Step 4: اكتب بطاقات الـfallback الخمس**

كل واحدة تُرسم بلا أي بيانات، فتصلح كحالة أولى ثم كـfallback في D:

```tsx
export const PresidentFallbackCard = () => {
  const t = useTranslations("HeaderCards");
  return (
    <FeatureCard
      tone="green"
      eyebrow={t("presidentEyebrow")}
      title={t("presidentFallbackTitle")}
      href="/about/president"
      cta={t("presidentCta")}
    />
  );
};
```
بنفس الشكل: `ChampionshipFallbackCard` ← `/championships`، `EventFallbackCard` ← `/events?view=calendar`، `ClubFinderCard` ← `/athletics#clubs`، وبطاقة الإعلام لا fallback لها (تختفي).

- [ ] **Step 5: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout/cards && npx tsc --noEmit`
Expected: PASS.

---

### Task B6: `HeaderShell` — الحالة والصف

**Files:**
- Create: `apps/web/src/components/layout/header-shell.tsx`
- Modify: `apps/web/src/components/layout/primary-nav.tsx` — إزالة `openChain` متعدد المستويات، والانتقال إلى مفتاح واحد مفتوح
- Modify: `apps/web/src/components/layout/site-header.tsx`
- Test: `apps/web/src/components/layout/site-header.test.tsx`

**Interfaces:**
- Consumes: `MegaPanel` و`HeaderToolsCapsule` والبطاقات.
- Produces: `<HeaderShell features={HeaderFeatures | null} activePath?={string} isRow?={boolean} />` — client، يملك `openKey` و`drawerOpen` و`searchOpen`. `isRow` اختياري ومثبَّت من الاختبارات فقط؛ القيمة الحيّة من `useRowLayout()` كما اليوم، تمامًا كما يفعل `activePath` مع `usePathname()`.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
it("لوحة واحدة مفتوحة في أي وقت", async () => {
  render(<HeaderShell features={null} activePath="/" />);
  const about = screen.getByRole("button", { name: /^About/ });
  const athletics = screen.getByRole("button", { name: /^Athletics/ });

  await userEvent.click(about);
  expect(about).toHaveAttribute("aria-expanded", "true");

  await userEvent.click(athletics);
  expect(athletics).toHaveAttribute("aria-expanded", "true");
  expect(about).toHaveAttribute("aria-expanded", "false");
});

it("Escape يغلق ويعيد البؤرة للزر", async () => {
  render(<HeaderShell features={null} activePath="/" />);
  const about = screen.getByRole("button", { name: /^About/ });
  await userEvent.click(about);
  await userEvent.keyboard("{Escape}");
  expect(about).toHaveAttribute("aria-expanded", "false");
  expect(about).toHaveFocus();
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/site-header.test.tsx`
Expected: FAIL — `HeaderShell` غير موجود.

- [ ] **Step 3: بسّط حالة اللوحات إلى مفتاح واحد**

```tsx
/** The open panel's key, or null. One panel at a time is what keeps Escape
 *  and focus return unambiguous — the tree has one disclosure level now. */
const [openKey, setOpenKey] = useState<string | null>(null);

const togglePanel = useCallback(
  (key: string) => setOpenKey((current) => (current === key ? null : key)),
  [],
);

const closePanel = useCallback(() => setOpenKey(null), []);
```
احذف `openChain` و`toggle(key, level)` و`open(key, level)`، و`level` من `onKeyDown` و`onPanelKeyDown` و`renderLeaf` و`renderGroup`. المستوى الثاني لم يعد لوحة عائمة — صار عمودًا داخل `MegaPanel`.

- [ ] **Step 4: أضف الأسهم الأفقية بين أزرار الصف**

```tsx
// Left and right follow the reading direction: in RTL the visual "next" button
// is the one ArrowLeft reaches, and a physical mapping would walk backwards.
if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
  const buttons = [...navRef.current!.querySelectorAll<HTMLElement>("[data-nav-trigger]")];
  const index = buttons.indexOf(event.currentTarget as HTMLElement);
  if (index === -1) return;
  event.preventDefault();
  const rtl = getComputedStyle(navRef.current!).direction === "rtl";
  const forward = rtl ? event.key === "ArrowLeft" : event.key === "ArrowRight";
  buttons[(index + (forward ? 1 : -1) + buttons.length) % buttons.length]?.focus();
}
```

- [ ] **Step 5: طبّق الحواف والمسافات من التوكنات**

في `site-header.tsx`، استبدل `px-4 sm:px-6`:

```tsx
// أبقِ بقية الـclasses كما هي، وبدّل الحواف وحدها:
className={`site-header sticky top-0 px-4 sm:px-6 xl:px-[var(--space-10)] 2xl:px-[var(--grid-margin-xl)]`}
```
وفي `primary-nav.tsx`، المسافة بين البنود:

```tsx
<ul className="flex flex-col xl:flex-row xl:items-center xl:gap-[var(--space-6)] 2xl:gap-[var(--grid-gutter-xl)]">
```
> 40/24 من 1280، و64/32 من 1536. **القياس في F4 هو ما يحسم** ما إذا كان الإنجليزي يتسع لـ64/32 عند 1280؛ إن اتسع، توحَّد القيمتان على توكنات الـgrid ويُحذف الـbreakpoint الثاني. النتيجة تُسجَّل في ADR-0121 بمنهج ADR-0062 D5: المطلوب مقابل المتاح لكل لغة.

- [ ] **Step 6: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: الـcommit — سلّم هذا النص للمالك**

```
git add apps/web/src/components/layout apps/web/src/components/search apps/web/src/styles/motion.css apps/web/src/app/[locale]/globals.css apps/web/messages apps/web/src/lib/design-system
git commit -m "feat(web): header v2 row, tools capsule and mega panels"
```
> يكسر البناء وحده: **لا**.

---

## ✅ نقطة توقف B

- `npx tsc --noEmit` و`npx vitest run` أخضران.
- اللوحات الخمس تفتح وتغلق بالفأرة والكيبورد عند ≥1280، لوحة واحدة في أي وقت.
- طبقة التعتيم تغطي الصفحة وتُغلق بالنقر.
- البطاقات تعرض الـfallback — البيانات في D.
- **مراجعة بصرية مطلوبة من المالك** مقابل `png/01-desktop-1440-*` قبل C.

---

# الدفعة C — الدرج (< 1280)

**الهدف:** درج modal بنفس الشجرة كأكورديون، وصف أدوات في أسفله.

**نقطة توقف للمراجعة في نهايتها.**

### Task C1: الأكورديون داخل الدرج

**Files:**
- Modify: `apps/web/src/components/layout/primary-nav.tsx`
- Test: `apps/web/src/components/layout/site-header.test.tsx`

**Interfaces:**
- Consumes: `MegaColumn` من B3 — الدرج يعرض العمود نفسه، بعنوانه الصغير وروابطه.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
it("الدرج يعرض عناوين الأعمدة والروابط، ولا يعرض البطاقة", async () => {
  render(<HeaderShell features={null} activePath="/" />);
  await userEvent.click(screen.getByRole("button", { name: /Navigation menu/ }));
  await userEvent.click(screen.getByRole("button", { name: /^Athletics/ }));

  expect(screen.getByRole("heading", { name: /Athletics Community/ })).toBeVisible();
  expect(screen.getByRole("link", { name: /^Clubs/ })).toBeVisible();
  // The one exception the design keeps in the drawer.
  expect(screen.getByRole("link", { name: /nearest club/i })).toBeVisible();
  expect(screen.queryByRole("link", { name: /President/ })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/site-header.test.tsx -t الدرج`
Expected: FAIL.

- [ ] **Step 3: نفّذ — نفس التركيب، عرض مختلف**

`MegaPanel` يقبل `layout`: في `"row"` يرسم البطاقة، وفي `"drawer"` يتخطاها إلا `ClubFinderCard` داخل لوحة ألعاب القوى.

```tsx
// The drawer drops the feature cards: a promoted destination below eight
// links on a phone is a second screen of scrolling before the list ends. The
// club finder stays because it is the panel's own call to action, not a
// promoted article.
const showFeature = layout === "row" || item.key === "athletics";
```

- [ ] **Step 4: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout && npx tsc --noEmit`
Expected: PASS.

---

### Task C2: الدرج يصير modal — حبس البؤرة و`aria-modal`

**Files:**
- Create: `apps/web/src/components/layout/use-focus-trap.ts`
- Modify: `apps/web/src/components/layout/header-shell.tsx`
- Test: `apps/web/src/components/layout/site-header.test.tsx`

**Interfaces:**
- Produces: `useFocusTrap(ref, active)` — hook، يدوّر Tab داخل العنصر ويعيد البؤرة إلى ما كانت عليه عند الإغلاق.

> هذا يعدّل سلوك ADR-0062 D4 («disclosure, not a modal»). القرار مالكي، ويُسجَّل في ADR-0121 كتعديل لا كإصلاح عيب.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
it("Tab يدور داخل الدرج ولا يخرج منه", async () => {
  render(<HeaderShell features={null} activePath="/" />);
  const trigger = screen.getByRole("button", { name: /Navigation menu/ });
  await userEvent.click(trigger);

  const drawer = screen.getByRole("dialog");
  expect(drawer).toHaveAttribute("aria-modal", "true");

  const focusable = within(drawer).getAllByRole("button");
  focusable.at(-1)!.focus();
  await userEvent.tab();
  expect(drawer).toContainElement(document.activeElement as HTMLElement);
});

it("Escape يغلق الدرج ويعيد البؤرة لزر القائمة", async () => {
  render(<HeaderShell features={null} activePath="/" />);
  const trigger = screen.getByRole("button", { name: /Navigation menu/ });
  await userEvent.click(trigger);
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/site-header.test.tsx -t Tab`
Expected: FAIL — لا `role="dialog"` ولا حبس.

- [ ] **Step 3: اكتب الـhook**

```ts
/**
 * Keeps Tab inside `ref` while `active`, and restores focus on close.
 *
 * The element list is read on each keypress, not captured when the trap was
 * set up: an accordion row opened inside the drawer adds links that a captured
 * list would skip.
 */
export const useFocusTrap = (ref: RefObject<HTMLElement | null>, active: boolean) => {
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    restoreTo.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items.at(-1)!;
      const at = document.activeElement;
      if (event.shiftKey && at === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && at === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreTo.current?.focus();
    };
  }, [ref, active]);
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
```

- [ ] **Step 4: اربطه بالدرج**

في `header-shell.tsx`، غلّف الدرج بـ`role="dialog" aria-modal="true" aria-label={t("menu")}` واستدعِ `useFocusTrap(drawerRef, drawerOpen)`.

- [ ] **Step 5: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout && npx tsc --noEmit`
Expected: PASS.

---

### Task C3: وقف تمرير الصفحة

**Files:**
- Modify: `apps/web/src/components/layout/header-shell.tsx`
- Test: `apps/web/src/components/layout/site-header.test.tsx`

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
it("فتح الدرج يوقف تمرير الصفحة، وإغلاقه يعيده", async () => {
  render(<HeaderShell features={null} activePath="/" />);
  const trigger = screen.getByRole("button", { name: /Navigation menu/ });

  await userEvent.click(trigger);
  expect(document.body).toHaveStyle({ overflow: "hidden" });

  await userEvent.click(trigger);
  expect(document.body.style.overflow).toBe("");
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/site-header.test.tsx -t تمرير`
Expected: FAIL.

- [ ] **Step 3: نفّذ**

```tsx
useEffect(() => {
  if (!drawerOpen) return;
  // Restored from what was there, not set to "": another lock (the search
  // dialog) may have been holding it, and blanking it would release theirs.
  const previous = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = previous;
  };
}, [drawerOpen]);
```

- [ ] **Step 4: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout`
Expected: PASS.

---

### Task C4: المقاس يتغير والدرج مفتوح

**Files:**
- Modify: `apps/web/src/components/layout/header-shell.tsx`
- Test: `apps/web/src/components/layout/site-header.test.tsx`

**Review Focus #5 مثبَّت هنا.**

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
it("ظهور الصف يغلق الدرج ويفك قفل التمرير", async () => {
  const { rerender } = render(<HeaderShell features={null} activePath="/" isRow={false} />);
  await userEvent.click(screen.getByRole("button", { name: /Navigation menu/ }));
  expect(document.body).toHaveStyle({ overflow: "hidden" });

  rerender(<HeaderShell features={null} activePath="/" isRow />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/site-header.test.tsx -t الصف`
Expected: FAIL — الدرج يبقى مفتوحًا والقفل قائمًا، فتصير الصفحة غير قابلة للتمرير بلا سبب مرئي.

- [ ] **Step 3: نفّذ — أثناء الـrender لا في effect**

```tsx
// Adjusted during render, React's documented "state derived from a prop"
// pattern: an effect would paint one frame with the row visible and the page
// still locked.
const [wasRow, setWasRow] = useState(isRow);
if (isRow !== wasRow) {
  setWasRow(isRow);
  if (isRow && drawerOpen) setDrawerOpen(false);
}
```

- [ ] **Step 4: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout && npx tsc --noEmit`
Expected: PASS.

---

### Task C5: صف الأدوات في أسفل الدرج

**Files:**
- Modify: `apps/web/src/components/layout/header-shell.tsx`
- Test: `apps/web/src/components/layout/site-header.test.tsx`

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
it("الكبسولة نفسها في أسفل الدرج، بلا ازدواج في ترتيب الـTab", async () => {
  render(<HeaderShell features={null} activePath="/" isRow={false} />);
  await userEvent.click(screen.getByRole("button", { name: /Navigation menu/ }));
  const drawer = screen.getByRole("dialog");
  expect(within(drawer).getAllByRole("switch")).toHaveLength(1);
  expect(within(drawer).getByRole("button", { name: /search/i })).toBeVisible();
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/site-header.test.tsx -t الكبسولة`
Expected: FAIL.

- [ ] **Step 3: نفّذ**

`<HeaderToolsCapsule layout="drawer" onOpenSearch={openSearch} />` في أسفل الدرج. الكبسولة في الصف مخفية تحت 1280 بـ`hidden xl:flex`، وفي الدرج ظاهرة فقط وهو مفتوح — فلا يوجد نسختان في ترتيب الـTab في أي لحظة.

- [ ] **Step 4: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: الـcommit — سلّم هذا النص للمالك**

```
git add apps/web/src/components/layout
git commit -m "feat(web): header v2 modal drawer with focus trap and tools row"
```
> يكسر البناء وحده: **لا**.

---

## ✅ نقطة توقف C

- `npx tsc --noEmit` و`npx vitest run` أخضران.
- الدرج `role="dialog" aria-modal="true"`، يحبس البؤرة، يوقف التمرير، ويعيد البؤرة لزر القائمة.
- صفر تمرير أفقي عند 320px — يُقاس في F4.
- **مراجعة بصرية مطلوبة** مقابل `png/03-mobile-390-drawer.png`.

---

# الدفعة D — البطاقات وتقسيم server/client

**الهدف:** `getHeaderFeatures(locale)` بطلب واحد مخزَّن 60 ثانية، و`SiteHeader` يصير server، وكل بطاقة تعرض بياناتها أو fallback‌ها.

**نقطة توقف للمراجعة في نهايتها.**

### Task D1: نقل العدّاد إلى `components/shared/`

**Files:**
- Create: `apps/web/src/components/shared/countdown.tsx` (منقول من `components/pages/home/hero-countdown.tsx`)
- Delete: `apps/web/src/components/pages/home/hero-countdown.tsx`
- Modify: `apps/web/src/components/pages/home/hero-event-bar.tsx` (الاستيراد)
- Test: `apps/web/src/components/shared/countdown.spec.tsx` (create)

**Interfaces:**
- Produces: `<Countdown event={NextEventLike} initial={EventBarState} labels={CountdownLabels} />` — التوقيع نفسه، الاسم والمكان تغيّرا.

> قاعدة الـshared components: الجزء يُستعمل في مكانين (الهيرو، وبطاقة الفعالية في الهيدر) فيصير مكوّنًا واحدًا. المنطق لا يتغيّر — `eventBarState` من `@uaeaf/content/hero` كما هو، بتوقيت Asia/Dubai، وتحديث على حدّ الدقيقة لا كل ثانية.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Countdown } from "./countdown";

const labels = { days: "يوم", hours: "ساعة", minutes: "دقيقة", live: "الآن", countdown: "تبدأ بعد {days} يوم" };

describe("العداد", () => {
  it("الأرقام مخفية عن القارئ، والاسم نص ثابت", () => {
    render(
      <Countdown
        event={event}
        initial={{ state: "before", days: 6, hours: 14, minutes: 32 }}
        labels={labels}
      />,
    );
    const timer = screen.getByRole("timer");
    expect(timer).toHaveAccessibleName("تبدأ بعد 6 يوم");
    expect(timer).toHaveAttribute("aria-live", "off");
    for (const unit of screen.getAllByText(/^\d{2}$/)) {
      expect(unit.closest("[aria-hidden]")).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/shared/countdown.spec.tsx`
Expected: FAIL — الملف غير موجود.

- [ ] **Step 3: انقل الملف وأعد تسمية الـexport**

النقل يدوي — `git mv` ممنوع (CLAUDE.md §33). أنشئ `components/shared/countdown.tsx` بمحتوى `components/pages/home/hero-countdown.tsx` حرفيًا، ثم:

```bash
rm apps/web/src/components/pages/home/hero-countdown.tsx
```

غيّر `export const HeroCountdown` إلى `export const Countdown`، وحدّث الاستيراد في `hero-event-bar.tsx` من `./hero-countdown` إلى `@/components/shared/countdown`. **لا تغيير في جسم المكوّن** — لا في `useEffect`، ولا في حدّ الدقيقة، ولا في `aria-live="off"`.

- [ ] **Step 4: شغّل**

Run: `cd apps/web && npx vitest run src/components/shared src/components/pages/home && npx tsc --noEmit`
Expected: PASS — اختبارات الهيرو القائمة تبقى خضراء.

---

### Task D2: `getHeaderFeatures` — سبعة حقول، كل منها معزول

**Files:**
- Create: `apps/web/src/lib/header/features.ts`
- Test: `apps/web/src/lib/header/features.spec.ts` (create)

**Interfaces:**
- Consumes: `fetchPublic` من `@/lib/api/public-client` (مخزَّن `PUBLIC_REVALIDATE_SECONDS = 60` بالفعل)، و`fetchArticles`، و`loadVideoPage`، و`loadActiveLiveStream`.
- Produces:
```ts
export interface HeaderFeatures {
  presidentExcerpt: { quote: string; href: string } | null;
  nextChampionship: { title: string; date: string; venue: string; href: string } | null;
  nextEvent: { title: string; href: string; startsAt: string } | null;
  currentSeasonSummary: { label: string; championships: number; records: number; href: string } | null;
  latestArticle: { title: string; date: string; category: string; href: string; coverId: string | null } | null;
  latestVideo: { title: string; href: string; thumbnailId: string | null } | null;
  activeLiveStream: { title: string; href: string } | null;
}

export const getHeaderFeatures = (locale: AppLocale): Promise<HeaderFeatures>;
```

**Review Focus #3 مثبَّت هنا.**

- [ ] **Step 1: اكتب الاختبار الفاشل**

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/articles", () => ({
  fetchArticles: vi.fn(async () => {
    throw new Error("upstream down");
  }),
}));
vi.mock("@/lib/video/load", () => ({
  loadVideoPage: vi.fn(async () => ({ items: [videoRow], total: 1, page: 1, limit: 1 })),
  loadActiveLiveStream: vi.fn(async () => null),
}));

describe("getHeaderFeatures", () => {
  it("مصدر فاشل يعيد null لحقله وحده", async () => {
    const features = await getHeaderFeatures("ar");
    expect(features.latestArticle).toBeNull();
    expect(features.latestVideo).not.toBeNull();
  });

  it("لا يرمي أبدًا مهما فشل المصدر", async () => {
    await expect(getHeaderFeatures("ar")).resolves.toBeTruthy();
  });

  it("المصادر غير الموجودة بعد تعيد null صراحة", async () => {
    const features = await getHeaderFeatures("ar");
    expect(features.nextChampionship).toBeNull();
    expect(features.nextEvent).toBeNull();
    expect(features.currentSeasonSummary).toBeNull();
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/lib/header/features.spec.ts`
Expected: FAIL — الملف غير موجود.

- [ ] **Step 3: نفّذ**

```ts
/**
 * Everything the header's cards show, in one pass.
 *
 * Each source is settled on its own. A header is on every page, so a single
 * upstream failure must cost its own card and nothing else — never the
 * navigation the reader came for. Sources that do not exist yet return null
 * explicitly rather than being omitted, so a later project wires one up by
 * filling in its reader and changes nothing here.
 */
export const getHeaderFeatures = async (locale: AppLocale): Promise<HeaderFeatures> => {
  const [president, article, video, live] = await Promise.allSettled([
    readPresidentExcerpt(locale),
    readLatestArticle(locale),
    readLatestVideo(locale),
    readActiveLiveStream(locale),
  ]);

  return {
    presidentExcerpt: settled(president),
    latestArticle: settled(article),
    latestVideo: settled(video),
    activeLiveStream: settled(live),
    // Project 2 (seasons) and project 3 (public events) own these readers.
    nextChampionship: null,
    nextEvent: null,
    currentSeasonSummary: null,
  };
};

const settled = <T,>(result: PromiseSettledResult<T | null>): T | null =>
  result.status === "fulfilled" ? result.value : null;
```
وكل قارئ يلفّ نفسه:
```ts
const readLatestArticle = async (locale: AppLocale) => {
  try {
    const page = await fetchArticles({ page: 1, limit: 1 });
    const first = page?.items[0];
    if (!first) return null;
    return {
      title: first.title[locale] || first.title.ar,
      date: first.publishDate ?? "",
      category: first.category,
      href: `/news/${first.slug}`,
      coverId: first.coverImageId ?? null,
    };
  } catch {
    // A card the reader never asked for is not worth a page-level failure.
    return null;
  }
};
```
> `try/catch` **و**`allSettled` معًا عن قصد: الأول يحوّل الفشل إلى `null` داخل القارئ، والثاني يلتقط ما يرمي خارجه (خطأ برمجي في التحويل نفسه). أحدهما وحده يترك ثغرة.

- [ ] **Step 4: شغّل**

Run: `cd apps/web && npx vitest run src/lib/header/features.spec.ts`
Expected: PASS.

---

### Task D3: البث المباشر — يظهر ويختفي بلا أثر

**Files:**
- Modify: `apps/web/src/components/layout/mega/mega-column.tsx`
- Modify: `apps/web/src/components/pages/video/library-screen.tsx` (إضافة `id="live"`)
- Test: `apps/web/src/components/layout/mega/mega-column.spec.tsx`

**Interfaces:**
- Consumes: `HeaderFeatures["activeLiveStream"]` من D2.
- Produces: `MegaColumn` يكتسب معاملًا ثالثًا — التوقيع يصير `<MegaColumn column currentPath live={{ title, href } | null} />`. `MegaPanel` (B4) يمرّره من `features.activeLiveStream`، و`HeaderShell` (B6/D4) يمرّره إلى `MegaPanel`. القيمة `null` هي الافتراضي في كل موضع لا يعرفه.

**Review Focus #2 مثبَّت هنا.**

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
it("بند البث يظهر أثناء البث فقط", () => {
  const { rerender } = render(<MegaColumn column={contentColumn} currentPath="/" live={null} />);
  expect(screen.queryByRole("link", { name: /Live Stream/ })).not.toBeInTheDocument();

  rerender(<MegaColumn column={contentColumn} currentPath="/" live={{ title: "t", href: "/media/videos#live" }} />);
  const link = screen.getByRole("link", { name: /Live Stream/ });
  expect(link).toHaveAttribute("href", expect.stringContaining("/media/videos#live"));
});

it("غياب البث لا يترك فاصلًا معلقًا ولا يغير عدد الأعمدة", () => {
  const { container } = render(<MegaColumn column={contentColumn} currentPath="/" live={null} />);
  expect(container.querySelectorAll("li")).toHaveLength(contentColumn.children!.length - 1);
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/mega/mega-column.spec.tsx -t البث`
Expected: FAIL — البند يُرسم دائمًا.

- [ ] **Step 3: نفّذ**

```tsx
// The one conditional destination in the tree. It is filtered here rather than
// being removed from `navigation.ts`, because the tree is also what the footer
// and the sitemap read and neither can express "only while broadcasting".
const visible = column.children!.filter((item) => item.key !== "liveStream" || live !== null);
```
والنقطة النابضة:
```tsx
{item.key === "liveStream" ? (
  <span aria-hidden="true" className="live-dot" />
) : (
  <NavIcon name={item.key} />
)}
```
```css
.live-dot {
  background: var(--color-brand-secondary);
  animation: live-pulse var(--motion-duration-ambient) ease-in-out infinite;
}
```
> `--motion-duration-ambient` (1200ms) هو التوكن الوحيد لنبض مستمر. الحركة تتوقف تحت `prefers-reduced-motion` بالإعادة العامة في `base.css`، وتبقى النقطة ظاهرة ساكنة.

- [ ] **Step 4: أضف `id="live"` على مسرح البث**

في `library-screen.tsx` عند `:194`، على العنصر الذي يحوي مسرح البث:
```tsx
<section id="live">  {/* أضف السمة على عنصر القسم القائم؛ لا تضف عنصرًا جديدًا */}
```
> هذا ما يجعل `/media/videos#live` يهبط على البث لا على أعلى الصفحة. القسم موجود فقط حين `live` موجود، وهو نفس شرط ظهور البند في الهيدر — فلا يوجد anchor يقود إلى لا شيء.

- [ ] **Step 5: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout/mega src/components/pages/video && npx tsc --noEmit`
Expected: PASS.

---

### Task D4: شطر `SiteHeader` إلى server + client

**Files:**
- Modify: `apps/web/src/components/layout/site-header.tsx` (يفقد `"use client"`)
- Modify: `apps/web/src/components/layout/header-shell.tsx` (يقبل `features`)
- Test: `apps/web/src/components/layout/site-header.test.tsx`

**Interfaces:**
- Consumes: `getHeaderFeatures` من D2.
- Produces: `SiteHeader` بلا props، server. `HeaderShell` يقبل `features: HeaderFeatures`.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
it("اللوحات في الـHTML من الخادم — لا جلب عند الفتح", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  render(<HeaderShell features={features} activePath="/" />);
  await userEvent.click(screen.getByRole("button", { name: /^Media/ }));
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(screen.getByText(features.latestArticle!.title)).toBeInTheDocument();
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/site-header.test.tsx -t الخادم`
Expected: FAIL — `HeaderShell` لا يقبل `features` بعد.

- [ ] **Step 3: اكتب `SiteHeader` الجديد**

```tsx
/**
 * Global site header.
 *
 * A server component: the panels' cards are read here, once per request and
 * cached for `PUBLIC_REVALIDATE_SECONDS`, so a panel is already in the HTML
 * when it opens. `HeaderShell` below it owns everything that needs a browser.
 */
export const SiteHeader = async ({ activePath }: { activePath?: string }) => {
  const locale = await getLocale();
  const features = await getHeaderFeatures(locale as AppLocale);
  return <HeaderShell features={features} activePath={activePath} />;
};
```
انقل إلى `header-shell.tsx`: `"use client"`، وحالة `scrolled`، و`onHeaderKeyDown`، والـscrim، وكل JSX الهيدر. `site-header.tsx` لا يبقى فيه إلا ما فوق.

- [ ] **Step 4: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout && npx tsc --noEmit`
Expected: PASS.

---

### Task D5: ربط البطاقات ببياناتها

**Files:**
- Modify: `apps/web/src/components/layout/cards/index.tsx`
- Modify: `apps/web/src/components/layout/header-shell.tsx`
- Test: `apps/web/src/components/layout/cards/feature-card.spec.tsx`

- [ ] **Step 1: اكتب الاختبار الفاشل — جدول الـfallbacks من §8**

```tsx
describe("جدول الـfallbacks", () => {
  it.each([
    ["presidentExcerpt", "about", /President's Message/],
    ["nextChampionship", "championshipsResults", /Championship calendar/],
    ["nextEvent", "eventsSeasons", /Season agenda/],
  ])("%s غائب يعطي بطاقة ثابتة في لوحة %s", (field, panel, fallback) => {
    render(<HeaderShell features={{ ...features, [field]: null }} activePath="/" />);
    expect(within(screen.getByRole("region", { name: new RegExp(panel, "i") })).getByText(fallback)).toBeVisible();
  });

  it("آخر خبر غائب يخفي عموده ولا يترك فجوة", () => {
    render(<HeaderShell features={{ ...features, latestArticle: null }} activePath="/" />);
    const panel = screen.getByRole("region", { name: /Media/ });
    expect(within(panel).queryByTestId("latest-article")).not.toBeInTheDocument();
  });

  it("ملخص الموسم غائب يمدد عمود الروابط", () => {
    render(<HeaderShell features={{ ...features, currentSeasonSummary: null }} activePath="/" />);
    const panel = screen.getByRole("region", { name: /Championships/ });
    expect(panel.querySelector("[data-columns]")).toHaveAttribute("data-columns", "1");
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/cards`
Expected: FAIL.

- [ ] **Step 3: نفّذ — البطاقة أو بديلها، لكل لوحة**

```tsx
/** The panel's card, or the standing card that stands in for it. */
export const panelFeature = (key: string, features: HeaderFeatures) => {
  switch (key) {
    case "about":
      return features.presidentExcerpt ? (
        <FeatureCard
          tone="green"
          eyebrow={t("presidentEyebrow")}
          title={features.presidentExcerpt.quote}
          href={features.presidentExcerpt.href}
          cta={t("presidentCta")}
        />
      ) : (
        <PresidentFallbackCard />
      );
    case "athletics":
      return <ClubFinderCard />;
    case "championshipsResults":
      return features.nextChampionship ? <ChampionshipCard {...features.nextChampionship} /> : <ChampionshipFallbackCard />;
    case "eventsSeasons":
      return features.nextEvent ? <EventCard {...features.nextEvent} /> : <EventFallbackCard />;
    case "media":
      // No standing card: a media panel with nothing to promote is a shorter
      // panel, not a panel with a placeholder in it.
      return features.latestVideo ? <VideoCard {...features.latestVideo} /> : null;
    default:
      return null;
  }
};
```

- [ ] **Step 4: بطاقة الفعالية تحمل العدّاد**

```tsx
<EventCard
  tone="blue"
  eyebrow={t("nextEventEyebrow")}
  title={features.nextEvent.title}
  href={features.nextEvent.href}
  cta={t("nextEventCta")}
>
  <Countdown event={event} initial={eventBarState(event, new Date())} labels={labels} />
</EventCard>
```
> الحالة الأولى تُحسب على الخادم فيرى القارئ رقمًا حقيقيًا في أول إطار وبلا JavaScript؛ العميل يتابع من القيمة نفسها. هذا سلوك `Countdown` القائم، لا جديد.

- [ ] **Step 5: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: الـcommit — سلّم هذا النص للمالك**

```
git add apps/web/src/lib/header apps/web/src/components/layout apps/web/src/components/shared apps/web/src/components/pages
git commit -m "feat(web): header feature cards from one cached server read"
```
> يكسر البناء وحده: **لا**.

---

## ✅ نقطة توقف D

- `npx tsc --noEmit` و`npx vitest run` أخضران.
- اللوحات في الـHTML من الخادم؛ صفر `fetch` عند الفتح.
- كل مصدر مستقل: فشله يكلّف بطاقته وحدها.
- **هذه أول نقطة يكون فيها الهيدر كاملًا وظيفيًا** بلا البحث.

---

# الدفعة E — البحث

**الهدف:** بحث موقع يعمل من الكبسولة ومن الدرج ومن `Ctrl/⌘ + K`، ومن صفحة `/search?q=`.

**هذه الدفعة الوحيدة التي تلمس `api/`. ممنوع تغيير أي حقل في أي schema.**

**نقطة توقف للمراجعة بعد E3 (نهاية الـbackend) وبعد E6.**

---

## E.0 تصميم الـmodule — يُقرأ قبل أي مهمة

### الـendpoint

```
GET /search/public?q=<string>&locale=<ar|en>&types=<csv>&limit=<1..10>
```

| المعامل | النوع | الافتراضي | التحقق |
|---|---|---|---|
| `q` | string | — | إلزامي، 2–80 محرفًا بعد `trim`. أقصر من حرفين ⟵ `{ groups: [] }` بحالة 200، لا 400: حقل بحث يكتب فيه القارئ حرفًا أول ليس خطأً. |
| `locale` | `ar` \| `en` | `ar` | enum. |
| `types` | csv | كل الأنواع | كل قيمة من `SEARCH_SOURCE_KEYS`؛ المجهول يُتجاهَل بصمت. |
| `limit` | int | 5 | لكل نوع لا للإجمالي. يُقصَر (clamp) عند 10 ولا يُرفض — سابقة `videos.service.ts`. |

**الرد:**
```ts
interface SearchResponse {
  groups: { type: SearchSourceKey; total: number; items: SearchHit[] }[];
}
interface SearchHit {
  id: string;
  title: string;      // اللغة المطلوبة، وإلا الأخرى — نصف نتيجة خير من لا شيء
  subtitle: string | null;
  href: string;       // مسار الموقع العام، لا مسار API
  thumbnailId: string | null;
}
```

الحارس: `@Public()` و`@RateLimit(...)` من `common/guards/rate-limit.guard.ts` القائم. الـendpoint عام ويستقبل مدخل مستخدم يصل إلى Mongo، فالحد ليس زينة.

### المصادر المسجَّلة

```ts
export interface SearchSource {
  key: SearchSourceKey;
  /** The public route a hit lands on, built from the row, never from the id. */
  hrefOf: (row: Record<string, unknown>) => string | null;
  model: Model<unknown>;
  /** Localized fields the text index covers, most significant first. */
  titlePath: string;
  subtitlePath: string | null;
  /** Rows a visitor is allowed to see. */
  publicFilter: FilterQuery<unknown>;
}
export const SEARCH_SOURCES: readonly SearchSource[] = [...];
```

| المصدر | الـcollection | العنوان | الفلتر العام | الوجهة |
|---|---|---|---|---|
| `articles` | `articles` | `title.{ar,en}` | `publicationState: 'Published'`, `archived: false` | `/news/{slug}` |
| `albums` | `albums` | `title.{ar,en}` | `publicationState: 'Published'`, `archivedAt: null` | `/media/albums/{slug}` |
| `videos` | `videos` | `title.{ar,en}` | نفس فلتر `buildPublicVideoFilter` القائم | `/media/videos?video={_id}` |
| `clubs` | `clubs` | `name.{ar,en}` | `archivedAt: null` | `/clubs#{slug}` |
| `athletes` | `athleteProfiles` | `name.{ar,en}` عبر `athleteId` | `archivedAt: null` وللملف slug | `/athletes/{profile.slug}` |
| `coaches` | `coaches` | `fullName.{ar,en}` | `archivedAt: null` | `/coaches#{slug}` |

> **`athletes` يُقرأ من `athleteProfiles` لا من `athletes`.** المجموعة `athletes` لا تحمل `slug` (أُزيل 2026-09-03)؛ المعرّف العام هو `athleteProfiles.slug` وحده، ورياضي بلا ملف لا وجهة له فلا يظهر في النتائج.
> **`clubs` و`coaches` بـ`#slug`** لأن الصفحتين دليلان بلا صفحة تفصيل. إن بُنيت صفحة تفصيل لاحقًا، يتغيّر `hrefOf` وحده.

**إضافة مصدر لاحقًا** (المواسم، الفعاليات) = إدخال في `SEARCH_SOURCES` + index، بلا تعديل في الـservice ولا في الـcontroller. هذا شرط القرار 1.

### الـindexes المطلوبة

| الـcollection | الـindex | لماذا |
|---|---|---|
| `articles` | `{ 'searchText': 'text' }` — **لا**، انظر أدناه | — |
| `articles` | `{ 'title.ar': 'text', 'title.en': 'text', 'summary.ar': 'text', 'summary.en': 'text' }` وزن 10 للعنوان | بحث نصّي، والعنوان أهم من الملخّص |
| `albums` | `{ 'title.ar': 'text', 'title.en': 'text' }` | — |
| `videos` | `{ 'title.ar': 'text', 'title.en': 'text' }` | — |
| `clubs` | `{ 'name.ar': 'text', 'name.en': 'text' }` | — |
| `athleteProfiles` | `{ 'displayName.ar': 'text', 'displayName.en': 'text' }` | تأكيد اسم الحقل من الـschema قبل الكتابة |
| `coaches` | `{ 'fullName.ar': 'text', 'fullName.en': 'text' }` | — |

> **قيد MongoDB:** **index نصّي واحد لكل collection**. أيٌّ من المجموعات أعلاه يحمل index نصّيًا سابقًا ⟵ توسيعه لا إضافة ثانٍ. تحقّق بـ`db.<coll>.getIndexes()` قبل كل إضافة.
> لا حقل جديد في أي schema: الـindexes تُضاف بـ`Schema.index(...)` على الحقول القائمة فقط.

---

### Task E1: تطبيع النص العربي

**Files:**
- Create: `api/src/modules/platform-administration/search/arabic-normalize.ts`
- Test: `api/src/modules/platform-administration/search/arabic-normalize.spec.ts`

**Interfaces:**
- Produces: `normalizeArabic(text: string): string` — نقية، بلا I/O.

> **قرار مطلوب من المالك (أ/ب)** — انظر §القرارات في التقرير. الخطة مكتوبة لـ**(أ)**، لأن `MONGODB_URI=mongodb://127.0.0.1:27017/uaeaf` أي لا يوجد Atlas cluster أصلًا، فـ`lucene.arabic` ليس خيارًا متاحًا اليوم.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```ts
import { normalizeArabic } from './arabic-normalize.js';

describe('normalizeArabic', () => {
  it.each([
    ['أحمد', 'احمد'],
    ['إبراهيم', 'ابراهيم'],
    ['آمنة', 'امنة'],
    ['رياضة', 'رياضه'],
    ['مصطفى', 'مصطفي'],
    ['الْعَدْوُ', 'العدو'],
    ['الشــــارقة', 'الشارقه'],
  ])('%s يصير %s', (input, expected) => {
    expect(normalizeArabic(input)).toBe(expected);
  });

  it('يترك اللاتيني والأرقام كما هي', () => {
    expect(normalizeArabic('UAEAF 2026')).toBe('UAEAF 2026');
  });

  it('متكافئ مع نفسه — تطبيع المُطبَّع لا يغيّره', () => {
    const once = normalizeArabic('أحمد الشــارقة');
    expect(normalizeArabic(once)).toBe(once);
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd api && npx jest --runInBand arabic-normalize`
Expected: FAIL — الملف غير موجود.

- [ ] **Step 3: نفّذ**

```ts
/**
 * One spelling for text that a reader types many ways.
 *
 * Arabic has several characters a reader treats as the same letter — the four
 * alifs, ta marbuta against ha, alif maqsura against ya — plus diacritics and
 * tatweel, which are typed inconsistently or not at all. Without this, a
 * search for "احمد" finds nothing written "أحمد", which is most of the corpus.
 *
 * Applied to BOTH the stored value and the query, so the two meet in the same
 * spelling. It must therefore be idempotent.
 */
export const normalizeArabic = (text: string): string =>
  text
    .normalize('NFKD')
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
```

- [ ] **Step 4: شغّل**

Run: `cd api && npx jest --runInBand arabic-normalize`
Expected: PASS.

> **حدّ معروف ومقبول:** `$text` مع `default_language: 'none'` لا يجذّع العربية. «الأندية» لا تجد «نادي». التطبيع يغطي اختلاف الإملاء لا الاشتقاق. هذا فرق (أ) عن (ب) الأساسي، ومسجَّل في التقرير.

---

### Task E2: الـservice — بحث آمن على مصادر مسجَّلة

**Files:**
- Create: `api/src/modules/platform-administration/search/search.service.ts`
- Create: `api/src/modules/platform-administration/search/search-sources.ts`
- Test: `api/src/modules/platform-administration/search/search.service.spec.ts`

**Interfaces:**
- Consumes: `normalizeArabic` من E1.
- Produces: `SearchService.search(q, locale, types, limit): Promise<SearchResponse>`.

**Review Focus #4 مثبَّت هنا.**

- [ ] **Step 1: اكتب الاختبار الفاشل**

```ts
describe('SearchService', () => {
  it('محارف regex لا تصل إلى الاستعلام', async () => {
    const result = await service.search('.*', 'ar', undefined, 5);
    expect(result.groups.every((group) => group.items.length === 0)).toBe(true);
  });

  it('عامل Mongo في المدخل لا يُنفَّذ', async () => {
    await expect(service.search('{"$ne": null}', 'ar', undefined, 5)).resolves.toBeTruthy();
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ $text: expect.objectContaining({ $search: expect.any(String) }) }),
    );
  });

  it('استعلام أقصر من حرفين يعيد فراغًا لا خطأ', async () => {
    await expect(service.search('a', 'ar', undefined, 5)).resolves.toEqual({ groups: [] });
  });

  it('limit يُقصَر ولا يُرفض', async () => {
    await service.search('نادي', 'ar', undefined, 999);
    expect(model.limit).toHaveBeenCalledWith(10);
  });

  it('مصدر فاشل يسقط مجموعته وحدها', async () => {
    jest.spyOn(clubModel, 'find').mockRejectedValueOnce(new Error('down'));
    const result = await service.search('نادي', 'ar', undefined, 5);
    expect(result.groups.some((group) => group.type === 'articles')).toBe(true);
    expect(result.groups.some((group) => group.type === 'clubs')).toBe(false);
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd api && npx jest --runInBand search.service`
Expected: FAIL — الملف غير موجود.

- [ ] **Step 3: نفّذ**

```ts
const MIN_QUERY = 2;
const MAX_QUERY = 80;
const MAX_LIMIT = 10;

@Injectable()
export class SearchService {
  /**
   * One query across every registered source.
   *
   * The term reaches Mongo only inside `$text.$search`, never as a `$regex`
   * and never spread into a filter object: the operator takes a string and
   * treats it as words, so a caller-supplied `$ne` or `.*` is a word that
   * matches nothing rather than an operator that runs.
   */
  async search(q: string, locale: 'ar' | 'en', types: string[] | undefined, limit: number) {
    const term = normalizeArabic(q).slice(0, MAX_QUERY);
    if (term.length < MIN_QUERY) return { groups: [] };

    const perType = Math.min(Math.max(Math.floor(limit) || 1, 1), MAX_LIMIT);
    const wanted = SEARCH_SOURCES.filter((source) => !types?.length || types.includes(source.key));

    const settled = await Promise.allSettled(
      wanted.map((source) => this.readSource(source, term, locale, perType)),
    );

    // A source that failed drops its group. A search box that returns five
    // groups instead of six is still a working search box; one that returns a
    // 500 because an unrelated collection was slow is not.
    return {
      groups: settled
        .filter((result) => result.status === 'fulfilled' && result.value.items.length > 0)
        .map((result) => (result as PromiseFulfilledResult<SearchGroup>).value),
    };
  }
}
```

- [ ] **Step 4: شغّل**

Run: `cd api && npx jest --runInBand search`
Expected: PASS.

---

### Task E3: الـcontroller والـmodule والـindexes

**Files:**
- Create: `api/src/modules/platform-administration/search/search.controller.ts`
- Create: `api/src/modules/platform-administration/search/search.module.ts`
- Create: `api/src/modules/platform-administration/search/dto/query-search.dto.ts`
- Modify: `api/src/app.module.ts` (تسجيل الـmodule)
- Modify: ستة ملفات `*.schema.ts` — **سطر `Schema.index(...)` فقط، ولا حقل**
- Test: `api/src/modules/platform-administration/search/search.controller.spec.ts`

- [ ] **Step 1: تحقّق من الـindexes النصّية القائمة قبل أي إضافة**

```bash
mongosh "mongodb://127.0.0.1:27017/uaeaf" --quiet --eval '
  ["articles","albums","videos","clubs","athleteProfiles","coaches"].forEach((name) => {
    const text = db[name].getIndexes().filter((index) => Object.values(index.key).includes("text"));
    print(name + ": " + (text.length ? JSON.stringify(text.map((index) => index.name)) : "none"));
  });
'
```
> مجموعة تعيد غير `none` ⟵ **وسّع الـindex الموجود، لا تضف ثانيًا.** MongoDB يسمح بواحد لكل collection ويرفض الثاني بخطأ عند الإقلاع.

- [ ] **Step 2: اكتب الاختبار الفاشل**

```ts
describe('GET /search/public', () => {
  it('عام بلا مصادقة', async () => {
    await request(app.getHttpServer()).get('/search/public?q=نادي').expect(200);
  });

  it('locale مجهول يُرفض', async () => {
    await request(app.getHttpServer()).get('/search/public?q=نادي&locale=fr').expect(400);
  });

  it('q غائب يُرفض', async () => {
    await request(app.getHttpServer()).get('/search/public').expect(400);
  });
});
```

- [ ] **Step 3: شغّل وتأكد من الفشل**

Run: `cd api && npx jest --runInBand search.controller`
Expected: FAIL — لا مسار.

- [ ] **Step 4: اكتب الـcontroller**

```ts
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  /** Site-wide public search across the registered sources. */
  @Get('public')
  @Public()
  @RateLimit({ windowMs: 60_000, max: 60 })
  @ApiOkResponse({ type: SearchResponseDto })
  findPublic(@Query() query: QuerySearchDto) {
    return this.service.search(query.q, query.locale ?? 'ar', query.types, query.limit ?? 5);
  }
}
```
> `@RateLimit` — راجع توقيع `rate-limit.decorator.ts` القائم واستعمله كما هو؛ القيم أعلاه اقتراح يُثبَّت بعد قراءته.

- [ ] **Step 5: أضف الـindexes — سطر واحد لكل schema**

في نهاية كل ملف schema، بجوار الـindexes القائمة:
```ts
// Site search. Weighted so a title match outranks a body match; the two
// languages share one index because one collection may carry only one.
ArticleSchema.index(
  { 'title.ar': 'text', 'title.en': 'text', 'summary.ar': 'text', 'summary.en': 'text' },
  { weights: { 'title.ar': 10, 'title.en': 10 }, default_language: 'none', name: 'search_text' },
);
```
> `default_language: 'none'` مقصود: مجذّع MongoDB لا يدعم العربية، و`'english'` كان سيجذّع اللاتيني فقط ويترك العربي كما هو مع كلمات وقف إنجليزية تُحذف من نصّ عربي بلا سبب.
> **ولا حقل واحد يُضاف أو يُعدَّل في أي schema.**

- [ ] **Step 6: سجّل الـmodule وشغّل**

Run: `cd api && npx tsc --noEmit && npx jest --runInBand search`
Expected: PASS.
> **لا تشغّل `nest build` والـAPI يعمل تحت `--watch`** — يترك الخادم مرتبطًا بلا شيء (سابقة موثّقة مرتين). `npx tsc --noEmit` للتحقق النوعي.

- [ ] **Step 7: الـcommit — سلّم هذا النص للمالك**

```
git add api/src/modules/platform-administration/search api/src/app.module.ts api/src/modules
git commit -m "feat(api): public site search over registered sources"
```
> يكسر البناء وحده: **لا**. الـOpenAPI يُعاد توليده في F3.

---

## ⏸ نقطة توقف E-backend

- `npx jest --runInBand` في `api/` أخضر، و`npx tsc --noEmit` أخضر.
- `GET /search/public?q=نادي` يعيد مجموعات حقيقية من قاعدة محلّية.
- **راجع قائمة الـindexes الفعلية المضافة قبل المتابعة.**

---

### Task E4: `SearchDialog` — dialog بنمط combobox

**Files:**
- Create: `apps/web/src/components/search/search-dialog.tsx`
- Create: `apps/web/src/components/search/search-results.tsx`
- Create: `apps/web/src/lib/search/client.ts`
- Test: `apps/web/src/components/search/search-dialog.spec.tsx`

**Interfaces:**
- Consumes: `GET /search/public` من E3.
- Produces: `<SearchDialog open onClose />`.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
describe('نافذة البحث', () => {
  it('combobox موصول بقائمته', async () => {
    render(<SearchDialog open onClose={vi.fn()} />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-controls');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('الأسهم تحرك النشط، وaria-activedescendant يتبعه', async () => {
    render(<SearchDialog open onClose={vi.fn()} />);
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'نادي');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{ArrowDown}');
    const active = input.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toHaveAttribute('aria-selected', 'true');
  });

  it('Escape يغلق من داخل الحقل — لا يكتفي بمسحه', async () => {
    const onClose = vi.fn();
    render(<SearchDialog open onClose={onClose} />);
    await userEvent.type(screen.getByRole('combobox'), 'نادي');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('حالات فارغ وتحميل وخطأ', async () => {
    render(<SearchDialog open onClose={vi.fn()} />);
    await userEvent.type(screen.getByRole('combobox'), 'zzzz');
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(await screen.findByText(/No results/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/search`
Expected: FAIL — الملف غير موجود.

- [ ] **Step 3: نفّذ — Escape أولًا**

```tsx
/**
 * Site search.
 *
 * `dialog` + combobox, not a `menu`: the results are links to pages, and a
 * combobox is the pattern that lets the field keep focus while the arrows walk
 * a list it owns — `aria-activedescendant`, never a real focus move.
 */
export const SearchDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useFocusTrap(dialogRef, open);

  // Chromium clears a `type="search"` input on the first Escape and emits no
  // `cancel`, so the dialog would stay open with an empty field. Handled on
  // the dialog itself, and the input is `type="text"` for the same reason.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const [term, setTerm] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const { groups, state } = useSearch(term);
  const listId = useId();

  if (!open) return null;

  return (
    <dialog ref={dialogRef} open aria-modal="true" aria-label={t('searchDialog')} onKeyDown={onKeyDown}>
      <input
        type="text"
        role="combobox"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        aria-expanded={groups.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId ?? undefined}
        aria-label={t('search')}
      />
      <SearchResults
        listId={listId}
        groups={groups}
        state={state}
        term={term}
        activeId={activeId}
        onActiveChange={setActiveId}
      />
    </dialog>
  );
};
```
> `useSearch(term)` في `lib/search/client.ts`: يؤخّر الطلب 200ms بعد آخر ضغطة، ويُلغي الطلب السابق بـ`AbortController`، ويعيد `state: 'idle' | 'loading' | 'ready' | 'error'`. الإلغاء ليس تحسينًا: بدونه يصل ردّ استعلام قديم بعد الجديد ويكتب فوقه.
> الحقل `type="text"` لا `type="search"`، للسبب أعلاه.

- [ ] **Step 4: النتائج مجمّعة بالنوع**

```tsx
<ul role="listbox" id={listId} aria-label={t('resultsLabel')}>
  {groups.map((group) => (
    <li key={group.type} role="group" aria-labelledby={`${listId}-${group.type}`}>
      <span id={`${listId}-${group.type}`} className="text-overline">{t(`type.${group.type}`)}</span>
      <ul>
        {group.items.map((hit) => (
          <li key={hit.id} id={`${listId}-${hit.id}`} role="option" aria-selected={hit.id === activeId}>
            <Link href={hit.href}>{hit.title}</Link>
          </li>
        ))}
      </ul>
    </li>
  ))}
</ul>
```
وحالة التحميل `role="status"` بنص «جارٍ البحث»، وحالة الفراغ والخطأ نصّان مختلفان: «لا نتائج لـ…» ليست «تعذّر البحث».

- [ ] **Step 5: شغّل**

Run: `cd apps/web && npx vitest run src/components/search && npx tsc --noEmit`
Expected: PASS.

---

### Task E5: `Ctrl/⌘ + K` والربط بالكبسولة والدرج

**Files:**
- Modify: `apps/web/src/components/layout/header-shell.tsx`
- Test: `apps/web/src/components/layout/site-header.test.tsx`

- [ ] **Step 1: اكتب الاختبار الفاشل**

```tsx
it('Ctrl+K و Meta+K يفتحان البحث', async () => {
  render(<HeaderShell features={null} activePath="/" />);
  await userEvent.keyboard('{Control>}k{/Control}');
  expect(screen.getByRole('dialog', { name: /search/i })).toBeInTheDocument();
});

it('الاختصار لا يسرق المفتاح من حقل كتابة', async () => {
  render(<><input aria-label="note" /><HeaderShell features={null} activePath="/" /></>);
  await userEvent.click(screen.getByLabelText('note'));
  await userEvent.keyboard('{Control>}k{/Control}');
  expect(screen.queryByRole('dialog', { name: /search/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/components/layout/site-header.test.tsx -t Ctrl`
Expected: FAIL.

- [ ] **Step 3: نفّذ**

```tsx
useEffect(() => {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey)) return;
    // Ctrl+K is "delete to end of line" inside a text field on several
    // platforms. Taking it there would break editing to open a search box the
    // reader can still reach from the header.
    const at = document.activeElement;
    if (at instanceof HTMLInputElement || at instanceof HTMLTextAreaElement || (at as HTMLElement)?.isContentEditable) {
      return;
    }
    event.preventDefault();
    setSearchOpen(true);
  };
  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}, []);
```
> حقل البحث في أسفل الدرج ليس حقلًا ثانيًا: هو `SearchTrigger` بمظهر حقل، يفتح النافذة نفسها. حقلان حقيقيان = قيمتان يمكن أن تختلفا.

- [ ] **Step 4: شغّل**

Run: `cd apps/web && npx vitest run src/components/layout src/components/search && npx tsc --noEmit`
Expected: PASS.

---

### Task E6: صفحة `/search?q=`

**Files:**
- Create: `apps/web/src/app/[locale]/search/page.tsx`
- Create: `apps/web/src/components/search/search-screen.tsx`
- Modify: `apps/web/src/lib/pages/public-pages.ts` (إدخال في `PUBLIC_PAGES` بـ`indexable: false`)
- Test: `apps/web/src/lib/design-system/seo-contract.spec.ts`

- [ ] **Step 1: اكتب الاختبار الفاشل**

```ts
it('صفحة البحث noindex, follow وخارج الـsitemap', async () => {
  const page = findPublicPage('search')!;
  expect(await isIndexable(page)).toBe(false);
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `cd apps/web && npx vitest run src/lib/design-system/seo-contract.spec.ts -t البحث`
Expected: FAIL — لا إدخال.

- [ ] **Step 3: نفّذ**

الصفحة تقرأ `q` من `searchParams`، وتستدعي الـendpoint نفسه بـ`limit=10`، وترسم `SearchScreen` — نفس `search-results.tsx` بتخطيط صفحة لا نافذة. `noindex, follow` عبر `buildMetadata({ indexable: false })`.
> صفحة نتائج مفهرسة تُنتج صفحة لكل استعلام كتبه أي زائر. `follow` يُبقي الروابط الخارجة نافعة.
> `seo-contract.spec.ts` يستثني `/brand-kit` بالاسم — **لا تلمس ذلك الاستثناء**؛ أضف `/search` كإدخال عادي بـ`indexable: false`، وهو ما يعالجه الحارس أصلًا.

- [ ] **Step 4: شغّل**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit`
Expected: PASS بالكامل.

- [ ] **Step 5: الـcommit — سلّم هذا النص للمالك**

```
git add apps/web/src/components/search apps/web/src/lib/search apps/web/src/app apps/web/src/lib/pages apps/web/src/components/layout apps/web/messages
git commit -m "feat(web): site search dialog, shortcut and results page"
```
> يكسر البناء وحده: **لا**.

---

## ✅ نقطة توقف E

- `api/`: `npx jest --runInBand` أخضر. `apps/web`: `npx vitest run` و`npx tsc --noEmit` أخضران.
- البحث يفتح من الكبسولة ومن الدرج ومن `Ctrl/⌘ + K`، ويعطي نتائج حقيقية من القاعدة المحلّية.
- `/search?q=` تعمل و`noindex`.

---

# الدفعة F — الـADR والوثائق والاختبارات والتحقق النهائي

**الهدف:** الحوكمة مكتوبة، والحُرّاس محدَّثون، والقياس مسجَّل، والموقع أخضر ومُتحقَّق منه في متصفح حقيقي.

### Task F1: ADR-0121

**Files:**
- Create: `docs/design-system/ADR-0121-Header-V2-Six-Items-And-Mega-Panels.md`
- Modify: `docs/design-system/ADR-0062-Primary-Navigation-Regrouping-And-Header-Interaction.md` (رأس «مُعدَّل بـADR-0121»، والسطور 63 و66 و67)
- Modify: `docs/design-system/ADR-0061-*.md` (D5 مُعدَّل)
- Modify: `docs/design-system/ADR-0072-*.md:224-225` (المسارات المحذوفة)
- Modify: `docs/design-system/08-L3-Navigation-Components.md` (`CMP-MEGAMENU-001` من Experimental إلى Stable)
- Modify: `docs/engineering/plans/2026-09-23-video-system.md:43,72` (ذكر `/events/federation-events`)

**الرقم 0121 مؤكَّد: أعلى ADR قائم هو 0120، ولا يوجد 0121.**

- [ ] **Step 1: اكتب الـADR بالقرارات التالية**

| # | القرار |
|---|---|
| D1 | البنية: ستة بنود، خمس لوحات، «الرئيسية» من الشعار. **يعدّل ADR-0062 D1.** |
| D2 | العتبة تبقى 1280؛ الحواف تُعاد قياسها للغتين بمنهج ADR-0062 D5، والنتيجة في §V. **يعدّل ADR-0062 D5.** |
| D3 | D3 و D4 و D6 و D7 من ADR-0062 **تبقى**، عدا أن D4 يكتسب سلوك modal (D6 أدناه). |
| D4 | مبدّل اللغة المختصر: `EN` / `ع`، والاسم الكامل في `aria-label` والـtooltip. **يعدّل ADR-0061 D5.** |
| D5 | الخط الثلاثي 3px بـ`scaleX`، ولونه الأوسط `--color-tricolor-mid` — أسود في الفاتح، **أبيض في الداكن**. ليس «أخضر/أسود/أحمر» في الوضعين. |
| D6 | الدرج modal: focus trap، ووقف تمرير، و`aria-modal`. **يعدّل سلوك ADR-0062 D4** — قرار مالك، لا إصلاح عيب. ADR-0062 كان قد قرّر العكس صراحة («a disclosure, not a modal») بمبرّر أن الدرج ليس حاجزًا؛ الشجرة الجديدة أطول ويغطي الدرج الصفحة كاملة، فصار حاجزًا فعلًا. |
| D7 | شارة «قريبًا» حقل صريح `badge: 'soon'` على بند التنقل، على `/national-teams` وحده. |
| D8 | حذف `/about/organisational-structure` و`/events/federation-events` **بلا redirect**: الأولى صارت سكشنًا في صفحة مجلس الإدارة، والثانية `noindex` ولم تُفهرس قط، فلا رابط خارجي يُكسر. `[...rest]` يعطي 404 محلّيًا. |
| D9 | المفتاح فاتح/داكن فقط. **التباين العالي يتبع إعداد الجهاز ويتقدّم على المفتاح**: سكربت ما قبل الرسم يقرأ `prefers-contrast: more` ويكتب `data-theme="high-contrast"` ويتابع تغيّر الإعداد؛ والمفتاح يعرض حالته المحفوظة طوال ذلك. **ولا توكن يُكرّر تحت media query** — `high-contrast.css` هو المصدر الوحيد. |
| D10 | البحث: module بمصادر مسجَّلة، وطريقة التطبيع العربي، وحدّها المعروف (لا تجذيع). |
| D11 | الأصول بلا مقابل في التوكنات (88px، 56/30، 12.5px، 380px، 0.3s) **تُرجمت** ولم تُنقل. الجدول في Global Constraints من الخطة يُنسخ هنا. |

- [ ] **Step 2: علّم الـADR `Pending Figma Back-Sync`**

اسرد كل حالة بصرية جديدة بلا frame في Figma: اللوحات الخمس، الكبسولة، مفتاح الوضع الجديد، الخط الثلاثي، الدرج modal، نافذة البحث، `/search`.
> الاشتراك متوقف — **لا تفتح Figma ولا تحاول التعديل** حتى يؤكّد المالك عودة الوصول.

- [ ] **Step 3: معيار «تم»**

الـADR يذكر كل قرار في الجدول، ولكل واحد سببه ومصدره. `grep -c "ADR-0121" docs/design-system/ADR-0062-*.md` ≥ 1.

---

### Task F2: `01-Information-Architecture.md`

**Files:**
- Modify: `docs/product/01-Information-Architecture.md` §8.1 و§8.3 و§12 (سطر 1016) و(سطر 779)

- [ ] **Step 1: §8.1 — جدول جديد يحلّ محل الثماني**

الجدول القديم **يبقى** موسومًا `> سجل تاريخي — لا تبنِ عليه (ADR-0121)`. لا يُحذف: ADRs سابقة تحيل إليه.

- [ ] **Step 2: §8.3 — الفوتر مشتق**

`FOOTER_QUICK_LINKS = navDestinations()`، والوجهات على مستوى الصفحة فقط: تُستبعد الـanchors وبند البث الشرطي.

- [ ] **Step 3: §12 سطر 1016 — العتبة 1280** (كان تعارض #1)، **وسطر 779** (تعارض #2)، **وتوحيد «اللوائح والسياسات»** (تعارض #8).

- [ ] **Step 4: معيار «تم»**

`grep -n "1280" docs/product/01-Information-Architecture.md` يُظهر العتبة الصحيحة، و`grep -c "السياسات واللوائح"` = 0.

---

### Task F3: تحديث OpenAPI والوثائق التقنية

**Files:**
- Modify: `api/openapi.json` (مُولَّد)
- Modify: `api/docs/api/public-api-contract.md`

- [ ] **Step 1: أعد توليد الـOpenAPI بالسكربت المعتاد في المستودع**

> لا تكتبه بيدك. السكربت هو المصدر، والملف ناتج.

- [ ] **Step 2: أضف `GET /search/public` إلى عقد الـAPI العام** بمعاملاته وشكل رده وحدّ المعدّل.

- [ ] **Step 3: معيار «تم»**

`grep -c "search/public" api/openapi.json` ≥ 1، و`npx tsc --noEmit` في `api/` أخضر.

---

### Task F4: القياس الحيّ — الحواف والعتبة و320px

**Files:**
- Modify: `apps/web/src/lib/design-system/direction-and-logo-contract.spec.ts`

> **`direction-and-logo-contract.spec.ts` يُحدَّث ولا يُحذف منه حارس.** الحارسان القائمان (العتبة الواحدة، والصف والدرج يتبادلان عند نفس العرض) يبقيان كما هما — العتبة 1280 بالفعل ولم تتغيّر.

- [ ] **Step 1: قِس على بناء إنتاج**

```
cd apps/web && npx next build && npx next start
```
ثم على `http://localhost:3000` (**لا `127.0.0.1`** — Next 16 لا يُرطِّب عبره في التطوير، و`localhost` هو الأصل الذي يعمل): سبعة عروض (320 + بنود §5.2 الستة) × لغتين × ثيمين = 28 تركيبة.

| المقياس | الهدف |
|---|---|
| تداخل بند مع الشعار أو الكبسولة | 0 / 28 |
| `scrollWidth == clientWidth` | 28 / 28 |
| الصف وزر الدرج متنافيان | 28 / 28 |
| عرض الصف الإنجليزي المطلوب عند 1280 بحواف 64 ومسافة 32 | يُسجَّل بالرقم |

- [ ] **Step 2: احسم توحيد الحواف**

الإنجليزي يتسع عند 1280 بـ64/32 ⟵ احذف تدرّج `xl:`/`2xl:` من B6 ووحّد على توكنات الـgrid. لا يتسع ⟵ أبقِ 40/24 دون 1536. **القياس يحسم، لا التفضيل.**

- [ ] **Step 3: أضف حارس الحواف**

```ts
it("يأخذ الحواف والمسافة من توكنات القياس لا من أرقام", () => {
  const header = read("src/components/layout/site-header.tsx");
  const nav = read("src/components/layout/primary-nav.tsx");
  expect(header).toMatch(/var\(--(?:space-10|grid-margin-xl)\)/);
  expect(nav).toMatch(/var\(--(?:space-6|grid-gutter-xl)\)/);
  // 56 and 30 have no token; the spec's numbers were translated, not copied.
  expect(header + nav).not.toMatch(/\b(?:56|30|88)px\b/);
});
```

- [ ] **Step 4: سجّل الأرقام في ADR-0121 §V** بمنهج ADR-0062 D5: المطلوب مقابل المتاح، لكل لغة.

- [ ] **Step 5: معيار «تم»**

`npx vitest run src/lib/design-system` أخضر، و28/28 في الجدول، ولا حارس محذوف.

---

### Task F5: e2e — لوحة المفاتيح والدرج والبحث

**Files:**
- Create: `apps/web/e2e/header-keyboard.spec.ts` (**ملف واحد**)

> ملف واحد لا ثلاثة: الـspec §12.4 يطلب ملفًا واحدًا، والثلاثة ستتقاسم الإعداد نفسه وتكرّر الأكلاف.

- [ ] **Step 1: اكتب السيناريوهات**

```ts
import { expect, test } from "@playwright/test";

const ROW = { width: 1440, height: 900 };
const DRAWER = { width: 390, height: 844 };

const trigger = (page: Page, name: string) => page.getByRole("button", { name });

test.describe("الصف عند 1440", () => {
  test.use({ viewport: ROW });

  test("Enter يفتح اللوحة، وواحدة فقط تبقى مفتوحة", async ({ page }) => {
    await page.goto("/ar");
    const about = trigger(page, /^عن الاتحاد/);
    const athletics = trigger(page, /^ألعاب القوى/);

    await about.focus();
    await page.keyboard.press("Enter");
    await expect(about).toHaveAttribute("aria-expanded", "true");

    await athletics.focus();
    await page.keyboard.press("Enter");
    await expect(athletics).toHaveAttribute("aria-expanded", "true");
    await expect(about).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("region")).toHaveCount(1);
  });

  test("Escape يغلق ويعيد البؤرة إلى الزر", async ({ page }) => {
    await page.goto("/ar");
    const about = trigger(page, /^عن الاتحاد/);
    await about.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(about).toHaveAttribute("aria-expanded", "false");
    await expect(about).toBeFocused();
  });

  test("الأسهم تتبع اتجاه اللغة", async ({ page }) => {
    await page.goto("/ar");
    await trigger(page, /^عن الاتحاد/).focus();
    // RTL: the visually next button is the one ArrowLeft reaches.
    await page.keyboard.press("ArrowLeft");
    await expect(trigger(page, /^ألعاب القوى/)).toBeFocused();

    await page.goto("/en");
    await trigger(page, /^About/).focus();
    await page.keyboard.press("ArrowRight");
    await expect(trigger(page, /^Athletics/)).toBeFocused();
  });

  test("aria-current على الرابط لا على الزر", async ({ page }) => {
    await page.goto("/ar/about/president");
    const about = trigger(page, /^عن الاتحاد/);
    await expect(about).not.toHaveAttribute("aria-current", /.*/);
    await about.click();
    await expect(page.getByRole("link", { name: /كلمة الرئيس/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
  });

  test("Ctrl+K يفتح البحث، والأسهم تمشي النتائج، وEnter ينتقل", async ({ page }) => {
    await page.goto("/ar");
    await page.keyboard.press("Control+k");
    const box = page.getByRole("combobox");
    await expect(box).toBeFocused();

    await box.fill("نادي");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowDown");

    const activeId = await box.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    await expect(page.locator(`#${activeId}`)).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Enter");
    await expect(page).not.toHaveURL(/\/ar$/);
  });
});

test.describe("الدرج عند 390", () => {
  test.use({ viewport: DRAWER });

  test("يحبس البؤرة ويوقف التمرير، وEscape يعيدها لزر القائمة", async ({ page }) => {
    await page.goto("/ar");
    const menu = trigger(page, /قائمة التنقل/);
    await menu.click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toHaveAttribute("aria-modal", "true");
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

    // Twenty tabs is more stops than the drawer has: if the trap leaks, focus
    // lands outside and the assertion below fails.
    for (let press = 0; press < 20; press += 1) await page.keyboard.press("Tab");
    await expect(drawer.locator(":focus")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(menu).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });

  test("صفر تمرير أفقي عند 320", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/ar");
    await trigger(page, /قائمة التنقل/).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});

test.describe("تفضيل تقليل الحركة", () => {
  test.use({ viewport: ROW, reducedMotion: "reduce" });

  test("يلغي الظهور والخط والسهم والنقطة", async ({ page }) => {
    await page.goto("/ar");
    await trigger(page, /^عن الاتحاد/).click();

    const animated = await page.evaluate(() =>
      document.getAnimations().filter((animation) => {
        const timing = animation.effect?.getComputedTiming();
        return (Number(timing?.duration) || 0) > 1;
      }).length,
    );
    expect(animated).toBe(0);
  });
});
```

- [ ] **Step 2: مفاتيح حقيقية لا `.focus()`**

`.focus()` لا يحقّق `:focus-visible`، فحلقة البؤرة التي تختبرها لن تظهر. استعمل `page.keyboard` — نفس منهج تحقّق ADR-0062.

- [ ] **Step 3: احذر الشرك المعروف**

الحارس الذي يعدّ إطارات حركة يمرّ بالخطأ إن صارت الحركة صفرًا: `frames = 0` يُقرأ نجاحًا. اقرأ العدّ المقيس صراحةً وأكّد أنه > 0 قبل أي تأكيد على الحركة، وأبطئ الساعة عبر CDP بدل الاعتماد على `getAnimations()` — الحركة بـ`fill: backwards` لا تظهر فيها.

- [ ] **Step 4: معيار «تم»**

الملف أخضر في `chromium` بلغتين.

---

### Task F6: `/simplify` ثم التحقق النهائي

- [ ] **Step 1: شغّل `/simplify` على الملفات المتغيّرة**

```
git status --porcelain
```
مرّر القائمة على `/simplify`. **قيود §30 من CLAUDE.md تتقدّم على أي اقتراح منه:** arrow functions مفضّلة، و`try/catch` أداة عادية لا تُلتف. أي نمط أسلوبي لا تسميه §30 صراحةً = اقتراح يُرفع، لا تغيير يُطبَّق.

- [ ] **Step 2: التحقق النهائي**

```
cd apps/web && npx tsc --noEmit
cd apps/web && npx vitest run
cd apps/web && npx playwright test e2e/header-keyboard.spec.ts
cd api && npx tsc --noEmit
cd api && npx jest --runInBand
cd apps/web && npx next build
```
> `next build` هنا وحده، بعد أن يتوقف كل خادم — `--watch` لا يحتمله.
> بعد إيقاف أي خادم، تحقّق من عدم بقاء عملية `node` يتيمة تمسك منفذًا أو ذاكرة؛ إيقاف المهمة يُنهي الغلاف لا الأبناء.

- [ ] **Step 3: المراجعة البصرية**

1440 و1280 و390 × عربي/إنجليزي، ولوحة مفتوحة عند 1440، والوضع الداكن مرة واحدة. اللقطات في مجلد الـscratchpad **لا في المستودع**.

- [ ] **Step 4: تقرير §26**

`PASS` / `PASS WITH DEBT` / `BLOCKED` / `FAIL`، وما أُصلح، والدين المتبقّي مصنَّفًا، والأدلة، والتحقق من الانحدار، والخطوات التالية. الدين المعروف سلفًا: ألوان البطاقات التي لا يقابلها register، و`Pending Figma Back-Sync`. (registers الصفحات الخمس وثيم `high-contrast` أُغلقا بقراري المالك 2026-09-28.)

- [ ] **Step 5: الـcommit — سلّم هذا النص للمالك**

```
git add docs api apps
git commit -m "docs: ADR-0121 header v2, IA update and header e2e guard"
```
> يكسر البناء وحده: **لا**.

---

## ✅ نقطة توقف F — نهاية المشروع

---

# جدول الـcomponents المشتركة

| المكوّن | المسار | الصف | الدرج | ملاحظة |
|---|---|---|---|---|
| `HeaderShell` | `components/layout/header-shell.tsx` | ✅ | ✅ | client؛ يملك `openKey` و`drawerOpen` و`searchOpen` |
| `HeaderToolsCapsule` | `components/layout/header-tools-capsule.tsx` | ✅ | ✅ | `layout` يغيّر الأحجام لا البنية |
| `SearchTrigger` | `components/search/search-trigger.tsx` | ✅ | ✅ | في الدرج بمظهر حقل، والقيمة واحدة |
| `LanguageSwitch` | `components/layout/language-switch.tsx` | ✅ | ✅ | يحلّ محل `language-toggle.tsx` |
| `ThemeSwitch` | `components/layout/theme-switch.tsx` | ✅ | ✅ | يحلّ محل `theme-toggle.tsx`؛ `role="switch"` |
| `SearchDialog` | `components/search/search-dialog.tsx` | ✅ | ✅ | نافذة واحدة لكل المداخل |
| `SearchResults` | `components/search/search-results.tsx` | ✅ | ✅ | تستعملها النافذة و`/search` |
| `MegaPanel` | `components/layout/mega/mega-panel.tsx` | ✅ | ✅ | `layout="drawer"` يُسقط البطاقة |
| `MegaColumn` | `components/layout/mega/mega-column.tsx` | ✅ | ✅ | نفس العمود في العرضين |
| `MegaLink` | `components/layout/mega/mega-link.tsx` | ✅ | ✅ | الشارة داخل الرابط |
| `NavIcon` | `components/layout/mega/nav-icon.tsx` | ✅ | ✅ | خريطة `key → svg` |
| `TricolorIndicator` | `components/layout/mega/tricolor-indicator.tsx` | ✅ | — | الصف وحده |
| `FeatureCard` | `components/layout/cards/feature-card.tsx` | ✅ | جزئي | الدرج يُبقي `ClubFinderCard` وحدها |
| `Countdown` | `components/shared/countdown.tsx` | ✅ | — | منقول من `pages/home/hero-countdown.tsx`؛ يستعمله الهيرو أيضًا |
| `useFocusTrap` | `components/layout/use-focus-trap.ts` | — | ✅ | يستعمله الدرج ونافذة البحث |

---

# جدول الاختبارات

| الملف | جديد / تحديث | يحرس |
|---|---|---|
| `src/lib/navigation.spec.ts` | **جديد** | الشجرة مقابل §3؛ الشارة على `/national-teams` وحده؛ كل `href` مسجَّل؛ الـanchors خارج الفوتر؛ لا تكرار |
| `src/lib/i18n/message-parity.spec.ts` | **جديد** | تطابق ar/en؛ كل بند له اسم؛ لا مفتاح يتيم تحت `Nav` — يغلق M3 |
| `src/lib/header/features.spec.ts` | **جديد** | مصدر فاشل ⟵ `null` لحقله وحده؛ لا يرمي أبدًا؛ المصادر المؤجَّلة `null` صراحةً |
| `src/components/layout/header-tools-capsule.spec.tsx` | **جديد** | ترتيب الأدوات؛ `role="switch"`؛ `aria-keyshortcuts`؛ `lang`/`hrefLang` |
| `src/components/layout/mega/mega-column.spec.tsx` | **جديد** | عنوان `h2` مرئي؛ `aria-current` على الرابط وحده؛ الشارة داخل الاسم؛ البث الشرطي |
| `src/components/layout/mega/mega-panel.spec.tsx` | **جديد** | `region` باسم البند؛ العمود الغائب لا يترك فجوة |
| `src/components/layout/cards/feature-card.spec.tsx` | **جديد** | رابط واحد للبطاقة؛ جدول الـfallbacks من §8 |
| `src/components/shared/countdown.spec.tsx` | **جديد** | الأرقام `aria-hidden`؛ اسم ثابت؛ لا `aria-live` |
| `src/components/search/search-dialog.spec.tsx` | **جديد** | combobox؛ `aria-activedescendant`؛ Escape من داخل الحقل؛ فارغ/تحميل/خطأ |
| `src/components/layout/site-header.test.tsx` | **تحديث** | العدّات؛ لوحة واحدة؛ Escape؛ حبس البؤرة؛ قفل التمرير؛ تغيّر المقاس؛ `Ctrl+K` |
| `src/lib/design-system/direction-and-logo-contract.spec.ts` | **تحديث** | العتبة (قائم، يبقى) + الخط الثلاثي + الحواف من التوكنات. **لا حارس يُحذف** |
| `src/lib/design-system/seo-contract.spec.ts` | **تحديث** | `/search` غير مفهرسة. استثناء `/brand-kit` لا يُلمس |
| `src/components/pages/preparing-page-screen.spec.tsx` | **تحديث** | اختبار العمق بدل `/about` |
| `e2e/header-keyboard.spec.ts` | **جديد** | كل سيناريوهات §12.4 + البحث + `prefers-reduced-motion`، في ملف واحد |
| `api/.../arabic-normalize.spec.ts` | **جديد** | الألف والتاء المربوطة والمقصورة والتشكيل والتطويل؛ التكافؤ الذاتي |
| `api/.../search.service.spec.ts` | **جديد** | regex و`$ne` لا يُنفَّذان؛ استعلام قصير ⟵ فراغ؛ `limit` يُقصَر؛ مصدر فاشل يسقط مجموعته |
| `api/.../search.controller.spec.ts` | **جديد** | عام بلا مصادقة؛ التحقق من المعاملات |

**لا يُضاف:** اختبار يعيد ما يغطيه حارس قائم. `page-message-keys.spec.ts` يبقى كما هو — `message-parity` يغطي بُعدًا آخر (المفاتيح اليتيمة والتطابق) ولا يكرّره.

---

# المسار الحرج والتقديرات

| الدفعة | المهام | التقدير | تعتمد على |
|---|---|---|---|
| A — التنقل والمسارات والـi18n | 6 | 3.5 س | — |
| B — الصف واللوحات | 6 | 4.0 س | A |
| C — الدرج | 5 | 2.5 س | B |
| D — البطاقات وserver/client | 5 | 3.0 س | B |
| E — البحث (backend ثم frontend) | 6 | 8.0 س | B (للكبسولة) |
| F — الحوكمة والاختبارات والتحقق | 6 | 3.5 س | الكل |
| **الإجمالي** | **34** | **24.5 س** | |

**المسار الحرج:** A → B → C → F (13.5 س). **D وE يتوازيان مع C** بعد انتهاء B: لا يتشاركان ملفًا إلا `header-shell.tsx`، الذي تلمسه C (الدرج) وD (تمرير `features`) وE (الاختصار) — يُنفَّذ بالترتيب C ثم D ثم E على ذلك الملف وحده.

**24.5 س ≈ 3 أيام عمل** بثماني ساعات. هذا **يتجاوز «يومين ونصف»** المسجَّلين في §15، ونقطة التوقف §10 مفعَّلة — ما كبّره وخيارات التقليص في التقرير.

---

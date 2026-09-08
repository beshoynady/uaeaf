# UAEAF — Frontend Build-Out Plan (Homepage Sections + Independent Pages)

**Status:** APPROVED 2026-09-07, with amendments below. Implementation of the First Session Scope (§10) is underway.
**Date:** 2026-09-07
**Governs:** the phase after the Header/Footer/i18n foundation — 13 homepage sections and the independent pages.
**Operates under:** `CLAUDE.md` §1 (Source of Truth Hierarchy), §1a + §1a.1 (Design Decisions Under Figma Unavailability), §2, §13, §16, §24 · `docs/engineering/UAEAF-ENGINEERING-OPERATING-MODEL.md` §2, §14, §17, §18, §21.

## OWNER DECISIONS (2026-09-07, recorded verbatim in effect)

| # | Decision | Owner's ruling |
|---|---|---|
| 1 | Footer `sm` band (640–767px) | **Two-column**, matching the documented as-built spec. `site-footer.tsx`'s `md:grid-cols-2` becomes `sm:grid-cols-2`. |
| 2 | Canonical breakpoint system | **Chapter 5 §5.2 is the reference.** The `≥1620px` side-rail promotion is **dropped** — no breakpoint is added without a backing token. |
| 3 | DTO typing | **Approved: generated client from `api/openapi.json`.** |
| 4 | Theme toggle scope | **Two states (light/dark) now.** High-contrast stays open — confirmed below (§7.2) as pre-existing gap **S12**, still unresolved, tracked separately as a Chapter 6 compliance question. |

**Album Detail reclassified Bucket 1** (§1.2), on evidence recovered from a prior conversation and now committed to the repo at `docs/audits/album-detail-figma-evidence-2026-09-07.md`: node `1431:2507` (file `hpO727vjwl18g3s3LTICAY`), live lightbox content node `2271:1696` (a superseded variant `1431:2707` explicitly marked do-not-use), and a field-by-field mapping against the backend already confirmed in the same session that added `championshipName`/`photographer`/`captureDate`.

**Standing workflow rule for this build-out phase (owner-delegated, 2026-09-07):** open design decisions that arise *within* this approved plan (e.g. PB-GAP for a new numeral display, RTL motion direction for a carousel) are decided and implemented directly, using the same §1a-derivation-with-citation discipline demonstrated in §6 below — not held for pre-approval. They are documented in full (decision, citation, alternatives where relevant) for the owner's post-hoc visual review, the same posture as every other verification in this project. This delegation does **not** extend to: touching Figma itself, backend/schema changes, or edits to `CLAUDE.md`/the engineering operating model — those still require explicit pre-approval as before.

---

## 0. THREE FINDINGS THAT CHANGE THE PREMISES

These came out of the research pass and must be settled before the plan below is acted on.

### 0.1 CONFLICT — the footer's responsive behavior *was* already documented, and the shipped build diverges

`01-Information-Architecture.md` §12 (line 939) and `02-Homepage-Specification.md` §20 both record, as **built**:

| Documented | Shipped today (Part 11) |
|---|---|
| `<640px` — single column | ≤767px — single column |
| **`640–1023px` — two-column footer** | **640–767px — single column** ❌ |
| `≥1024px` — 4-column footer | ≥1024px — 4-column ✅ |

The mismatch is exactly the `sm` band (640–767px). It happened because §1a directs derivation from the *Design System Framework*, and these documents live in `docs/product/`. Chapter 5 §5.10 ("stack vertically at xs/sm") genuinely conflicts with IA §12 ("two-column footer at 640–1023px").

Per `CLAUDE.md` §1, Design System (level 2) outranks Page Specifications (level 4), so the shipped build is defensible — but §1 also requires reporting a conflict rather than resolving it silently.

**DECIDED (owner, 2026-09-07): match the documented spec.** `site-footer.tsx`'s `md:grid-cols-2` → `sm:grid-cols-2`. Implemented in §10.

### 0.2 AMENDMENT to §1a — APPLIED

Inserted as `CLAUDE.md` §1a.1, verbatim as proposed:

> 1a.1 Before deriving anything from the Design System chapters, first check `docs/product/` — specifically `01-Information-Architecture.md` §12 and the relevant page specification's "Responsive Behavior" section — for behavior already recorded as **built**. A recorded as-built behavior is evidence of the approved Figma composition and must be reported (and reconciled per §1) rather than re-derived from first principles. Derivation from the Design System chapters applies only where `docs/product/` records nothing.

### 0.3 CONFLICT — the `≥1620px` breakpoint has no Design System basis — DROPPED

IA §12 and Homepage Spec §20 define a fourth breakpoint, `≥1620px`, promoting the floating social rail to a side rail. Chapter 5 §5.2's table ends at `2xl ≥1536px`. There is no `1620px` token anywhere in `packages/design-tokens`.

More broadly, the two breakpoint systems do not align at all:

| `docs/product` (IA §12) | Chapter 5 §5.2 |
|---|---|
| `<640px` | `xs ≤639` |
| `640–1023px` | `sm 640–767` **+** `md 768–1023` |
| `≥1024px` | `lg 1024–1279` **+** `xl 1280–1535` **+** `2xl ≥1536` |
| `≥1620px` | *(no equivalent)* |

**DECIDED (owner, 2026-09-07):** Chapter 5 §5.2 is canonical; IA §12's bands are behavioral requirements expressed within it. The `1620px` side-rail promotion is **dropped** — no breakpoint is added without a backing token. The floating social rail therefore has one documented state only: the bottom-capsule presentation at every width; the side-rail promotion is out of scope for this build-out unless a future ADR adds a `1620px`/`3xl` token.

---

## 1. BUCKET SORT — evidence-based, not from memory

Evidence classes: **STRONG** = node ID + measured geometry written down · **MEDIUM** = real inspection recorded, no node ID or no measurements · **WEAK** = prose/marker only · **NONE**.

### 1.1 Homepage sections (spec order, `02-Homepage-Specification.md` §5)

| # | Section | Bucket | Evidence |
|---|---|---|---|
| — | Global Header *(built)* | **1** | STRONG — node `2374:1175`, nav `2374:1180`, flyouts `169:1479`/`169:1492`, drawer `2159:1128` @390px; exported→master px pairs recorded |
| — | Global Footer *(built)* | **1** | STRONG — node `2374:2198`, quick links `2374:2218`, social `2374:2243`, legal `2374:2257`, swooshes `2737:38–41` |
| 1 | Hero | **2** | WEAK — `[B]` marker + "5-slide carousel"; slides 2–5 are hidden placeholders |
| 2 | Federation by the Numbers | **2** | WEAK — "4-up ≥1024px" only. (R7 records Stat Card instance drift — a defect note, not a layout capture) |
| 3 | Clubs Network | **2** (borderline) | WEAK-MEDIUM — one real node ID `151:25` (`Club Marquee`) but cited as precedent for another section, with essentially no detail attached |
| 4 | Featured Athletes | **2** | WEAK |
| 5 | Results & Rankings + Upcoming Events | **2** | WEAK — behavioral notes only (compact rows, countdown, `.ics`, show-more after 3) |
| 6 | Live Stream & Videos | **2** | WEAK — must hide entirely if zero published videos |
| 7 | News | **2** | WEAK — "1.35fr/1fr ≥1024px" only |
| 8 | UAEAF in the Media | **2** | NONE — spec states explicitly *"not yet built in Figma"* |
| 9 | Sponsors & Partners | **2** | MEDIUM — layer names (`strategic-sponsor-card`, `Tier Badge`), 3-part structure, 5 tiered cards; no node ID, no pixels, responsive marked NOT VERIFIABLE |
| 10 | Media Centre | **2** | MEDIUM — token colors from a real Figma pass (`gray/950`, `gray/900`, `text/inverse`, `green/300`), 4-col ≥1024px; no node ID, no geometry |
| 11 | Memberships / Affiliations | **2** | WEAK — must not be merged with Sponsors |
| 12 | Newsletter | **2** | WEAK |
| — | Floating social rail | **2** | WEAK — plus the unresolved `1620px` question (§0.3) |

**Only the Header and Footer are Bucket 1.** Everything on the homepage is Bucket 2 and must follow §1a with per-decision citations.

### 1.2 Independent pages

`20-Page-Templates.md` defines 12 templates but contains **no structural detail at all** — its table is `Template ID / Page / Consumes`, listing only component identifiers. No regions, no column counts, no grid references, no responsive content. **Every independent page is Bucket 2 for layout, with one exception: Album Detail (below), reclassified Bucket 1.**

Partial exception: `UAEAF_VISUAL_REDESIGN_CHECKPOINT.md` (repo root, 2026-08-05) carries real node IDs for **President's Message** (AR `698:66`, `1238:2298`, `1252:2298`; EN `1268:2258`, `1273:2258`, `1282:2258`) and **Clubs Directory** (`787:286`, `1182:2128`, `1206:2188`). These record Figma *authoring* work, not measured values for code — MEDIUM at best.

**Reclassified — Album Detail is Bucket 1.** A repo-wide search found no visual evidence because the evidence lived only in a prior conversation, not yet in a file — now corrected: it is committed at `docs/audits/album-detail-figma-evidence-2026-09-07.md`. Node `1431:2507` (file `hpO727vjwl18g3s3LTICAY`), live lightbox `Main-Lightbox-Content` (`2271:1696`) — a superseded `Main-Lightbox-Content-OLD` (`1431:2707`, `hidden="true"`) explicitly marked do-not-use — and a field-by-field mapping against the backend (title, championship name, photographer, capture date, photo count, per-photo caption all verified against real schema fields; current-index and the "صورة رقم N" chip confirmed as client-side computed, not stored; three OLD-node-only fields — location/venue, photo ID, a separate Competition field — explicitly excluded as not current requirements). **STRONG evidence, now on the same footing as Header/Footer.**

### 1.3 Corroborating physical evidence for the Header/Footer Bucket 1 claim

`apps/web/public/` contains exactly **14 real UAEAF assets** — `brand/` (logo, logo-white, 4 swooshes) and `icons/` (chevron-down, map-pin, map-pin-lg, 5 social icons) — matching the kickoff doc's record that 14 Figma-exported assets were downloaded before the MCP URLs expired. This is physical evidence that a real Figma export happened for these two components, independent of the prose claims. (The other 5 files are untouched `create-next-app` stock.)

Also confirmed: **no hidden Figma cache exists anywhere** — `.claude/`, `.agents/`, `.impeccable/` hold only skill definitions, settings, and a hook cache. There is no unexamined store of captured design data to mine. What is written down is all there is.

---

## 2. PLACEHOLDER-CONTENT ARCHITECTURE

### 2.1 The real constraint: which sections have a shape to match

Exactly **10 public response DTOs** exist in the API today:

`HeroSlidePublicResponseDto` · `NavigationMenuPublicResponseDto` · `SiteSettingsPublicResponseDto` · `FederationPersonnelPublicResponseDto` · `AlbumPublicResponseDto` · `MediaAssetPublicResponseDto` · `AthleteProfilePublicResponseDto` · `AthletePublicResponseDto` · `OfficialProfilePublicResponseDto` · `OfficialPublicResponseDto`

Mapping those to the 13 sections:

| Section | Real shape available today | Notes |
|---|---|---|
| Hero | ✅ `HeroSlidePublicResponseDto` | Complete: mediaType, image/video id, title/subtitle/ctaText (localized), ctaUrl, displayOrder |
| Featured Athletes | ✅ `AthleteProfilePublicResponseDto` / `AthletePublicResponseDto` | |
| Media Centre | ✅ `AlbumPublicResponseDto` + `MediaAssetPublicResponseDto` | Incl. today's `championshipName`/`photographer`/`captureDate` |
| Global Header/Footer nav | ✅ `NavigationMenuPublicResponseDto` + `SiteSettingsPublicResponseDto` | **Currently hardcoded in `src/lib/navigation.ts`** — a real future swap, see §2.4 |
| Memberships / Affiliations | ⚠️ partial | `FederationPersonnelPublicResponseDto` covers people, not affiliate organizations |
| **News** | ❌ **none** | `news-page` is a *hero wrapper only* (`heroImageId`/`heroTitle`/`heroSubtitle`). **No news-article collection exists anywhere.** |
| **Results & Rankings + Events** | ❌ **none** | `results-rankings-page` is likewise a hero wrapper. The `athletics` domain contains only `age-categories` and `disciplines` — no competitions, events, results, or rankings collections. |
| Federation by the Numbers | ❌ none | No statistics domain |
| Clubs Network | ❌ none | `clubs` module exists but exposes no public DTO |
| Sponsors & Partners | ❌ none | No sponsors domain |
| Live Stream & Videos | ⚠️ check | `videos`/`videos-page` modules exist; no public DTO among the 10 |
| Newsletter | ❌ none | No subscription domain |

This confirms your premise for News and Results/Events, with a precision worth stating: they are not simply "missing" — a *page-level hero wrapper* exists for each, which could mislead a future reader into thinking the domain exists.

### 2.2 Proposed pattern

Three layers, so that swapping to real data is a data-source change and never a component change:

```
apps/web/src/
  content/
    types.ts                 # re-exports/mirrors API DTO shapes (§2.3)
    placeholder/
      hero.ts                # HeroSlidePublicResponseDto[]  ← matches real DTO
      athletes.ts            # AthletePublicResponseDto[]
      media.ts               # AlbumPublicResponseDto[]
      news.ts                # LocalShape — no API DTO exists (§2.1)
      results-events.ts      # LocalShape — no API DTO exists
      ...
    sources/
      hero.ts                # getHeroSlides(): Promise<HeroSlidePublicResponseDto[]>
      ...                    # today: returns placeholder. later: fetch(). Component untouched.
  components/sections/
    hero/hero-section.tsx    # props: { slides: HeroSlidePublicResponseDto[] }
```

Rules:
1. **Section components are pure presentational** — they receive content via props and never fetch, never import placeholder modules directly. This is what makes the swap free.
2. **The `sources/` module is the only seam.** Today each function returns a placeholder constant; later its body becomes a `fetch` against the real endpoint. Signature and return type do not change.
3. **Where a DTO exists, the placeholder is typed as that DTO** — a compile error is then the guarantee that placeholder and reality agree.
4. **Where no DTO exists** (News, Results/Events, Stats, Clubs, Sponsors, Newsletter), the local shape lives in `content/types.ts` with an explicit `// NO BACKEND DOMAIN — shape is provisional` marker, so the eventual backend work has a written record of what the frontend assumed.

### 2.3 DTO typing — DECIDED

**DECIDED (owner, 2026-09-07): generated client from `api/openapi.json`** (via `openapi-typescript`), added as a build step. Both request and response are typed from one source, and drift is caught by the existing pre-push hook — the natural payoff of Part 8/10's work.

### 2.4 Header/Footer are already candidates for the swap

Worth flagging now: `NavigationMenuPublicResponseDto` and `SiteSettingsPublicResponseDto` already exist, while the header and footer read from a hardcoded `src/lib/navigation.ts`. This phase should either (i) move them onto the `sources/` seam now so they swap for free later, or (ii) consciously defer. *Recommendation:* (i) — it is cheap now and demonstrates the pattern on already-tested components.

---

## 3. SEQUENCING

### 3.1 Homepage — spec order, top of page first (already agreed)

Hero → Federation by the Numbers → Clubs Network → Featured Athletes → Results & Rankings + Events → Live Stream & Videos → News → UAEAF in the Media → Sponsors & Partners → Media Centre → Memberships → Newsletter.

Two deviations proposed, with reasons:
- **Media Centre earlier than position 10.** It is one of only two MEDIUM-evidence sections *and* has real DTOs behind it — the only section where both design evidence and data shape exist. Building it early validates the whole `sources/` seam against real types.
- **UAEAF in the Media (8) last or deferred.** It does not exist in Figma at all, by the spec's own words. Building it means inventing a section wholesale.

### 3.2 Independent pages

Proposed order, justified by component reuse rather than importance:
1. **Static-page template instances** (`TMP-STATICPAGE-001`: About, Privacy, Regulations) — mostly typography and existing primitives, no new patterns; proves the page shell.
2. **President's Message** — MEDIUM Figma evidence exists (node IDs above), and it is a static-page variant.
3. **Album/Gallery pages** (`TMP-GALLERY-001`) — real DTOs exist; reuses the Media Centre work from §3.1.
4. **Clubs Directory** — MEDIUM Figma evidence, but no public DTO; list/detail pattern introduced here.
5. Everything else (news list/detail, athlete list/detail, events, results) — these need *both* new patterns and absent backend domains.

---

## 4. COMPONENT / FILE ARCHITECTURE

Extending the existing `site-header.tsx`/`site-footer.tsx` conventions rather than inventing new ones:

```
apps/web/src/components/
  layout/           # existing: site-header, site-footer, language-toggle (+ theme-toggle, §7)
  sections/         # one folder per homepage section
    hero/
      hero-section.tsx
      hero-section.test.tsx
  ui/               # shared primitives extracted only when a 2nd consumer appears (YAGNI)
```

- **Naming:** `<thing>-section.tsx` exporting `<ThingSection>`, matching the existing `site-footer.tsx` → `SiteFooter` convention. Co-located `.test.tsx`, as today.
- **No barrel files.** None exist today; adding them creates import cycles and defeats tree-shaking.
- **i18n namespaces:** current file is flat with 7 namespaces (`Metadata`, `Nav`, `Legal`, `Social`, `Header`, `Footer`, `HomePage`). Extend with **one namespace per section**, PascalCase, matching the component: `HeroSection`, `StatsSection`, `NewsSection`… This keeps `useTranslations("HeroSection")` local to its component and prevents one giant shared namespace.
- **Server vs client:** sections default to Server Components using `getTranslations`; only genuinely interactive ones (carousel, filters, newsletter form, tabs) become `'use client'`. Note the existing header/footer deliberately use `useTranslations` in non-async components so tests can render them directly — that trade-off should be re-examined per section rather than copied blindly.

---

## 5. TESTING AT SCALE

The bar stays where Header/Footer set it; the *boilerplate* is what gets shared.

1. **Extend `src/test/render-with-intl.tsx`** into a small kit:
   - `renderWithIntl(ui, locale)` — exists today.
   - `describeBothLocales(name, fn)` — wraps the `describe.each<AppLocale>(["ar","en"])` pattern both current suites hand-roll.
   - `expectNoPhysicalClasses(container)` — shared assertion for the §8 discipline.
2. **Per-section required tests** (the floor, not the ceiling): renders its landmark/heading · renders all content items from props · every link resolves to a locale-prefixed href · every interactive control has an accessible name · decorative imagery is `aria-hidden` · renders correctly with **empty/zero items** (critical — §6 Live Stream *must hide entirely* when empty).
3. **Props-driven sections are far easier to test** than fetch-driven ones — another reason for §2.2's seam. Tests pass fixtures directly; no network mocking anywhere.
4. **What jsdom cannot do:** it has no layout engine. Part 11 proved this — the class-contract tests passed while the real layout was clipping. Responsive correctness is verified in a real browser (§8), never asserted in jsdom.

---

## 6. §1a APPLIED — three worked examples

### 6.1 Federation by the Numbers (§2) — a 4-up stat row

Known: IA §12 "4-up ≥1024px". Nothing else — no mobile, no tablet, no spacing.

| Band | Decision | Citation |
|---|---|---|
| `≥1024px` (lg+) | 4 across | IA §12 (as-built) — an as-built record, not a derivation |
| `768–1023px` (md) | 2×2 | §5.2 md = **8 columns**; 8÷4 = 2 per stat — exact division, same reasoning as the footer fix |
| `≤767px` (xs/sm) | 1 column stacked | §5.10 Stacking: "MUST stack vertically at xs/sm in a logical order" |
| Gutter | 24px at md/lg, 32px at xl | §5.2 gutter column, verbatim |
| Numeral typography | **RESOLVED, 2026-09-07** — `Type/Statistic Display` (H2 primitive/32px + Black weight) | New role registered in `04-Typography.md` §4.15a addendum, passing ADR-0040's 4-part evidence test. Does **not** touch the 5 pre-existing Athlete PB nodes (CLAUDE.md §27), which remain unresolved exactly as before — this only covers new numeral displays with no prior Figma pixels |

### 6.2 News (§7) — lead article + list

Known: "1.35fr/1fr split ≥1024px", category filter.

| Band | Decision | Citation |
|---|---|---|
| `≥1024px` | `grid-cols-[1.35fr_1fr]` | IA §12 / spec §11, verbatim — the one hard value given |
| `768–1023px` | Lead full-width above a 2-column list | §5.2 md = 8 cols; lead spans 8, list items span 4 each. §5.10 Reflow permits list→card behavior below md |
| `≤767px` | Single column, lead first | §5.10 Stacking, "most important first" — the lead article is the most important |
| Category filter | Horizontal scroll chip row below md | §5.10.3 QA allows horizontal scroll only in components "intentionally designed for it" — **borderline; flag rather than assume** |

### 6.3 Media Centre (§10) — 4-column mosaic

Known (MEDIUM evidence, from a real Figma pass): `gray/950` background, `gray/900` cards, `text/inverse`, `green/300` links, 4-col auto-rows ≥1024px. Spec explicitly marks tablet/mobile as NOT VERIFIED.

| Band | Decision | Citation |
|---|---|---|
| `≥1024px` | 4 columns, auto-rows | Spec §16 (captured from Figma) |
| `768–1023px` | 2 columns | §5.2 md = 8 cols; 8÷4 = 2 — same divisor logic |
| `≤767px` | 1 column | §5.10 Stacking |
| Colors | the four tokens above, verbatim | Captured token names — **not** re-derived. `#1a1a1a` (the footer's un-tokenized outlier) must not be copied here |

The pattern each time: **as-built records first (§0.2), then Chapter 5 for what they don't cover, then escalate what neither covers.** Note that 6.1 produced a genuine escalation rather than an answer — that is the pattern working, not failing.

---

## 7. THE TWO TOGGLES

### 7.1 Language toggle — verified working, no action

`language-toggle.tsx` uses `useLocale()`/`usePathname()`/`Link` from `@/i18n/navigation` with `locale={otherLocale[locale]}` — a real next-intl locale switch, and it **is** rendered in `site-header.tsx` (line 120, imported line 5). Confirmed present and functional, not merely a file.

### 7.2 Theme toggle — does not exist; must be built

Confirmed by behavioral search, not filename search:
- `app/[locale]/layout.tsx` (lines 46–57, injected line 97) has a **bootstrap script only**: reads `localStorage['uaeaf-theme']`, falls back to `prefers-color-scheme`, sets `data-theme` on `<html>`. It is a *reader*. Nothing anywhere is a *writer*.
- `site-header.tsx` lines 107–113 render a `☾` `<button>` with a translated `aria-label` and **no `onClick`, no state, no handler** — inert by design (deviation D12).

So the work is small and well-defined: a client component that writes `localStorage['uaeaf-theme']` and flips `data-theme`, replacing the inert button. Tokens already ship `light`/`dark`/`high-contrast` themes from `packages/design-tokens`, so **no new colors or styles are needed or permitted**.

**DECIDED (owner, 2026-09-07): two states (light/dark) now.** Before implementing, confirmed the status of pre-existing suggestion **S12** (kickoff doc): *"the high-contrast theme has full token coverage in `packages/design-tokens` but is not wired into the bootstrap script."* Re-verified 2026-09-07 — still true: `colors.high-contrast.json` exists with full coverage, `layout.tsx`'s `themeBootstrapScript` resolves only `'dark'`/`'light'`. **S12 is unresolved**, and stays that way: high-contrast wiring is explicitly out of scope for this toggle, tracked as a separate Chapter 6 accessibility-compliance question, not silently bundled in.

---

## 8. VERIFICATION STRATEGY — split by category, deliberately asymmetric

### 8.1 "Consumes global systems correctly" → automated, cheap, every section

These are invariants, so they get a lint-style check rather than a manual matrix. Proposed as an `npm run check:design-discipline` script (and a Husky pre-push addition, matching the openapi precedent):

| Check | Mechanism |
|---|---|
| No physical direction classes | grep for `text-left\|text-right\|[pm][lr]-\|border-[lr]-\|left-\|right-` in `src/components` |
| No hardcoded colors | grep for `#[0-9a-fA-F]{3,8}` outside `lib/navigation.ts` |
| No raw px typography | grep for `text-[NNpx]` not routed through a token |
| Every namespace key used | cross-check `messages/ar.json` keys against `useTranslations` calls |
| AR/EN key parity | assert `ar.json` and `en.json` have identical key trees |

**Baseline measured today** (so the check starts from a known state, not a green lie):
- Physical classes: 4 hits, all in `site-footer.tsx` — the decorative swoosh `left-[…]`/`right-[…]` offsets, which are **deliberately physical** and documented as brand artwork that must not mirror. These need an explicit allowlist comment, not a fix.
- Hardcoded colors: `#1a1a1a` in `site-footer.tsx:165` (map card — a genuine un-tokenized outlier, **FOLLOW-UP**), plus brand hexes in `lib/navigation.ts` for external social platforms (Facebook `#1877f2` etc. — legitimately not UAEAF tokens; allowlist).

Then **one** real-browser spot-check per section for language/theme/direction — not a full matrix, since the global systems are proven once.

### 8.2 Responsive layout → real browser, every breakpoint, every section

This is where the footer bug lived, and it is genuinely per-section, so it does **not** get economized. Per section: `chrome-devtools-mcp` at **4 widths × 2 locales**, each with `getBoundingClientRect()` measurements — not screenshots alone.

Part 11 is the justification: the class-contract tests were green and the screenshots looked fine while the real layout was clipping at `left: -27px`. **Only the measurements caught it.** Mandatory assertions per section: no element's `right` exceeds `innerWidth`; no element's `left` is negative; `document.documentElement.scrollWidth <= innerWidth`.

**Trade-off, stated explicitly:** §8.1 is cheap and automatable because those properties are global invariants — proven once, then only spot-checked. §8.2 is expensive and manual because responsiveness is a genuine per-section design decision with no global guarantee. Treating them identically would either waste effort on §8.1 or under-test §8.2. The footer bug is the evidence for that asymmetry.

---

## 9. DIRECTION HANDLING — inherited, and where it may not hold

**Confirmed inherited.** Part 9.1 measured the header at both locales: identical DOM, exact mirror, `dir` alone doing the work. Part 11 confirmed the same for the rebuilt footer at all four breakpoints. **No section should write direction logic.** Correctness comes from using logical properties (`text-start`/`ps-*`/`me-*`) and letting `layout.tsx`'s `dir` do the rest.

Sections where this is suspected **not** to hold automatically — flagged before building, per your instruction:

1. **Hero carousel (§1)** — auto-advance direction and next/prev affordances are semantically directional. CSS mirrors; *animation direction and swipe gestures do not.* A carousel advancing left-to-right in RTL is a real bug that `dir` will not catch.
2. **Floating social rail (§ persistent)** — physically pinned to a viewport edge. Like the footer swooshes, this needs an explicit decision: does it mirror, or is it fixed brand furniture? The footer precedent says such choices must be deliberate and documented.
3. **Clubs Network marquee (§3)** — a horizontally-scrolling card row with edge fades. Scroll direction, the fade gradient's start/end, and animation vector are all directional and none is handled by `dir` alone.
4. **UAEAF in the Media (§8)** — same class of problem: an animated horizontal carousel.
5. **Results countdown / `.ics` rows (§5)** — numerals and dates. Arabic-Indic vs Latin numeral choice is a **content** decision (Chapter 19 Calendar-Localization territory), not a direction one, and is not automatic.

Items 1, 3, 4 share one root cause: **CSS mirrors, motion does not.** One shared decision, not three.

**DECIDED, 2026-09-07 — shared RTL motion-direction mechanism.** A CSS custom property, `--motion-direction: 1` (default) / `-1` (set by `[dir="rtl"]` in `globals.css`), consumed by every horizontal-motion transform (`translateX(calc(var(--motion-direction) * <distance>))`) and by any JS reading gesture/swipe input (`Number(getComputedStyle(el).getPropertyValue('--motion-direction'))` to flip the sign of a drag-delta calculation). No component computes `dir === 'rtl'` itself.

*Citation:* this is not a new pattern — it is the same "`dir` alone drives it" principle already proven twice in this codebase (Part 9.1's header measurement, Part 11's footer grid), extended from CSS layout to motion vectors. CLAUDE.md §1's Source of Truth Hierarchy ranks "Existing project implementation" (level 8) above inventing a new mechanism, so reusing the established pattern rather than introducing a second RTL-detection approach is itself the correct derivation, not merely a convenience.

*Scope:* governs items 1, 3, and 4 above (Hero carousel, Clubs Network marquee, UAEAF in the Media). Item 2 (floating social rail) is a separate decision — physical-vs-mirrored placement, the same class of choice as the footer swooshes — deferred to when that component is actually built, per the plan's own sequencing (§3.1 lists it last, outside session 1). Item 5 (numeral choice) is a content decision, not a motion one, and stays with Chapter 19 territory when Results/Events is built.

---

## 10. RECOMMENDED FIRST SESSION SCOPE

Not the whole phase. Proposed first session — deliberately small, chosen to prove the architecture before it is repeated 12 times:

1. ~~Resolve OPEN DECISIONS 1–4~~ — **done above**, all four decided by the owner before implementation started.
2. **Timing note on §6/§9's two dependent decisions:** both PB-GAP (needed by Stats) and the RTL motion-direction mechanism (needed by Hero) are resolved *above* (§6.1's table row, §9's decision), before any component code is written — not deferred into the build and not left for Hero/Stats to hit as a blocker mid-implementation. This is the delegated-decision workflow (see header) applied for the first time: decided with citations, implemented next, owner reviews the result rather than the proposal.
3. Build the **theme toggle** (§7.2) — small, self-contained, completes the "two toggles" baseline, touches no section work.
4. Build the `content/` + `sources/` seam (§2.2) and the test kit (§5.1) — the shared foundation.
5. Build **exactly two sections: Hero (§1) and Federation by the Numbers (§2)** — the first two in spec order, now unblocked by steps 1–2.
6. Full verification per §8 on both, plus the §8.1 automation with its allowlist baseline.

Then stop and review before continuing — because if the seam, namespace convention, or verification cadence is wrong, it is far cheaper to learn it at 2 sections than at 12.

**Rough sequencing after that:** ~2–3 sections per session in spec order, with Media Centre pulled earlier (§3.1) and UAEAF in the Media deferred; independent pages begin only after the homepage's shared primitives have stabilized.

---

## 11. RISKS

| Risk | Impact | Mitigation |
|---|---|---|
| 11 of 13 sections are Bucket 2 | Most of the homepage is §1a-derived, so back-sync debt accumulates fast | Every derived state logged under Pending Figma Back-Sync at the moment it is written, never retrospectively |
| News + Results/Events have no backend domain at all | Placeholder shapes are guesses that later constrain backend design | Mark provisional shapes explicitly in `content/types.ts`; treat them as frontend requirements input to that backend work, not as decided contracts |
| Section-height rule (`≥ calc(100svh - header)`, spec §20) | Applies to all 13 sections and interacts with every responsive decision | Fold into the shared section wrapper once, not per section |
| PB-GAP unresolved (CLAUDE.md §7) | Blocks correct numeral typography in Stats, Results, Records | Escalated in §6.1; needs a decision before Stats ships |
| `packages/design-tokens/build/` is git-ignored | `apps/web` will not compile on a clean clone without a token build first | Verify the build step is wired into the frontend build, not assumed |
| Mobile-first is the governing principle (PR-006) | Anti-pattern is designing at 1440px first — which is exactly what the Header/Footer did | Design each section's small-width behavior first, then widen |

---

## 12. WHAT I NEED FROM YOU

**Open decisions:** 1 (footer `sm` band) · 2 (canonical breakpoint system + the `1620px` question) · 3 (generated API client vs hand-mirrored types) · 4 (theme toggle 2-state vs 3-state).
**Approve or amend:** the §0.2 §1a amendment · the §2.2 content architecture · the §4 file/namespace conventions · the §8 asymmetric verification strategy · the §10 first-session scope.
**Note:** §9's shared RTL-motion decision and §6.1's PB-GAP escalation both need answers before the sections that depend on them are built, but not before session 1 starts.

Nothing here has been implemented. Awaiting go-ahead.

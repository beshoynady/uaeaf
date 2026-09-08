# President's Message (كلمة رئيس الاتحاد / Chairman's Message) — Implementation Spec

> **⚠️ THIS FILE IS NOW THE SOURCE OF TRUTH.**
> The UAEAF Figma subscription has lapsed. **Editing is permanently locked**; read access was available only
> during this extraction window and may disappear at any moment. Do not assume the Figma file can be
> re-consulted, re-measured, or corrected. Every value below was read directly from the live file on the
> extraction date and supersedes any earlier derived documentation.
> Where a value could not be read, this file says `NOT EXTRACTED — <reason>` rather than guessing.

| Field | Value |
|---|---|
| Figma file key | `hpO727vjwl18g3s3LTICAY` |
| Extraction date | 2026-09-07 |
| Extraction method | `get_metadata` (structure), `get_design_context` (real values/tokens/copy), `get_variable_defs` (bindings), `get_screenshot` (candidate-node verification) |
| Figma editability | **LOCKED — permanent** |
| Governing rules | CLAUDE.md §1, §2, §12, §13, §16 |

## Node index

> ### ✅ Resolved: tablet and mobile frames **do exist** for this page
>
> The brief flagged the tablet/mobile ids as UNCONFIRMED, sourced from a stale document. **All four
> candidates were verified to exist and to be the correct frames for this page.** Verification was done
> with `get_screenshot` (which returned real renders and natural canvas dimensions) and then confirmed by
> `get_metadata` (which returned the frame names below).
>
> **This page has complete responsive coverage in both languages — 6 frames, no gaps.**

| Language | Breakpoint | Node id | Verified frame name | Frame size (W × H) | Status |
|---|---|---|---|---|---|
| AR | Desktop 1440 | `698:66` | Page - رئيس الاتحاد (Editorial) | 1440 × 2085.41 | given |
| AR | Tablet 768 | `1238:2298` | Page - Static (AR) - رئيس الاتحاد - **Tablet (768)** | 768 × 3156 | ✅ **confirmed** |
| AR | Mobile 375 | `1252:2298` | Page - Static (AR) - رئيس الاتحاد - **Mobile (375)** | 375 × 4509 | ✅ **confirmed** |
| EN | Desktop 1440 | `1268:2258` | Page - Static (EN) - Chairman's Message - Desktop | 1440 × 2268.43 | given |
| EN | Tablet 768 | `1273:2258` | Page - Chairman's Message - **Tablet EN** | 768 × 3501.41 | ✅ **confirmed** |
| EN | Mobile 375 | `1282:2258` | Page - Chairman's Message - **Mobile EN (375)** | 375 × 5087 | ✅ **confirmed** |

---

## 1. Responsive comparison table — the reusable responsive system

The page is short and consistent: **Header → Hero → Speech Card → Values → Footer**. That makes its
responsive ramp the cleanest of the three pages and the best template for future editorial pages.

### 1.1 AR responsive system (`698:66` → `1238:2298` → `1252:2298`)

| Section | Desktop 1440 | Tablet 768 | Mobile 375 |
|---|---|---|---|
| **Page gutter** | 64px (content 1312) | 24px (content 720) | 16px (content 343) |
| **Header** | 1440 × 95.41, full 9-item RTL nav, ☾/بحث/AR\|EN, logo 120 wide | 768 × 100, **nav present but `hidden`**, utilities + logo 120 wide only | 375 × 100, **≡ menu icon 44 × 24** + logo, **no utilities at all** |
| **Hero** | 1440 × 480, **2-column overlay**: text 840 left / photo 560 at x 880, y −140 (bleeds 140px above the section) | 768 × 745, **stacked**: photo 768 × 440 at y 32, text 768 × 273 at y 472 | 375 × 619, **stacked**: photo 375 × 300 at y 24, text 375 × 295 at y 324 |
| **Hero photo treatment** | `photo-glow` ellipse 520 × 520 behind a 580 × 760 portrait | Flat "Photo (Tablet crop)" 768 × 440, no glow | Flat "Photo (Mobile crop)" 375 × 300, no glow |
| **Breadcrumb** | 207 × 16 at (316.5,135.5), 3 levels | 207 × 16 at (537,32) | 207 × 16 at (152,24) |
| **H1** | 242 × 49 at (299,175.5) | 720 × 49 at (24,72) | 343 × 49 at (16,64) |
| **Name line** | 680 × 38 at (80,248.5) | 720 × 38 at (24,145) | 343 × **76** at (16,137) — wraps to 2 lines |
| **Role line** | 680 × 34 at (80,310.5) | 720 × 34 at (24,207) | 343 × 34 at (16,237) |
| **Speech Card** | 1440 × 632, p **48**, gap **32**, radius 16 | 768 × 899, p **24**, gap NOT EXTRACTED | 375 × 1547, p **16** |
| **Pull-quote** | 1344 × 94, px 20 / py 16, radius 16, 22px Bold | 720 × 125 | 343 × 249 |
| **Speech body** | 1344 × 410, 16px lh 1.9, 5 paragraphs | 720 × 710 | 343 × 1250 |
| **Values grid** | **5 columns**, card 246.4 × 236, gap 20 | **2 columns**: rows 1–2 hold 2 cards each (350 × 215, gap 20); **row 3 holds a single full-width 720 × 194 card** | **1 column**, 5 cards 343 × 215, gap 16 |
| **Values title** | 210 × 34 at y 64, centred | 210 × 34 at (279,40) | 210 × 34 at (82.5,32) |
| **Icon container** | 56 × 56, radius 28, icon 26px | 56 × 56 | 56 × 56 |
| **Footer** | **4 columns** 292 wide (Contact / Map / Quick Links ×11 / Brand+Social), 1440 × 440, links in a vertical list | **2 columns** 296 wide (Left: Contact + Map · Right: Brand + Social + Quick Links), 768 × 594, quick links become a **horizontal wrapped row** | **1 column stack** (Brand+Social / Quick Links row / Contact / Map), 375 × 966 |
| **Footer legal** | 4 links left, copyright right, 1312 × 64 | links row then copyright below, 640 × 80 | links wrap to 2 rows, copyright below, 343 × 118 |

### 1.2 EN responsive system (`1268:2258` → `1273:2258` → `1282:2258`)

| Section | Desktop 1440 | Tablet 768 | Mobile 375 |
|---|---|---|---|
| **Page gutter** | 64px (content 1312) | 24px (content 720) | 16px (content 343) |
| **Header** | 1440 × **64**, 9-item nav (LTR order), EN\|AR / Search / ☾, logo 120 × 64 | 768 × 95.41, **nav `hidden` AND logo `hidden`** → utilities only | 375 × 92, logo + ≡ menu 44 × 44 |
| **Hero** | 1440 × 480, **2-column overlay**, text left (breadcrumb at x 80) | 768 × 745, **stacked**, photo 768 × 440 at y 32 | 375 × 668 — photo is a **220 × 320 portrait at (155,174)** over a 375 × 300 background, with 3 swoosh decorations at x 18 |
| **Breadcrumb** | 343 × 16 at (80,135.5) | 343 × 16 at (24,32) | 343 × 16 at (16,24) |
| **H1** | 420 × 49 at (80,175.5) | 720 × 49 at (24,72) | 343 × **98** at (16,64) — wraps to 2 lines |
| **Name line** | 680 × 38 | 720 × 38 | 343 × 76 |
| **Speech Card** | 1440 × 764.43, p 48, pull-quote 1344 × 125, body 1344 × 420 | 768 × 954 — **body only, 720 × 890; NO pull-quote** | 375 × 2059, pull-quote 343 × 311, body 343 × 1700 |
| **Values grid** | **5 columns**, card 246.4 × 236, gap 20 | **2 columns + full-width 5th** (identical geometry to AR tablet) | **1 column**, cards 343; heights 215/215/**236**/215/**236** |
| **Footer** | **4 columns** (Brand+Social / Quick Links / Location / Contact), 1440 × 522 | 768 × 889 — two 640-wide blocks **stacked vertically** despite being named "2x2" | 375 × 949, 1-column stack |

### 1.3 Derived breakpoint rules (safe to reuse)

1. **Gutters:** 64 / 24 / 16. Content widths 1312 / 720 / 343 — identical in both languages.
2. **Hero pattern:** overlay 2-column at 1440 → **stack photo-above-text** at 768 and 375.
   Photo height ramp 480 (bleed) → 440 → 300.
3. **Card padding ramp:** 48 → 24 → 16 (Speech Card); 24/32 → 24/32 → 24/32 (Values card, unchanged).
4. **Grid collapse:** 5-up → **2-up with the 5th spanning full width** → 1-up.
   The "odd card spans the row" rule is the reusable part.
5. **Card gap ramp:** 20 → 20 → 16.
6. **Header height ramp (AR):** 95.41 → 100 → 100. (EN is inconsistent: 64 → 95.41 → 92 — see PM-D02.)
7. **Footer collapse:** 4-col → 2-col → 1-col; vertical link lists become **horizontal wrapped rows**
   below 1440.

---

## 2. Per-section specification

Font: **Alexandria** throughout.

### 2.1 Design tokens observed

Bound on `698:66` (AR desktop) and `1268:2258` (EN desktop) — **identical sets**, the best token
coverage of the three pages:

| Token | Value |
|---|---|
| `--color-text-primary` | `#000000` |
| `--color-text-secondary` | `#616058` |
| `--color-text-inverse` | `#ffffff` |
| `--color-surface-base` | `#fdfcfb` |
| `--color-border-default` | `#e0dfdb` |
| `--color-brand-black` | `#000000` |
| `--color-green-400` | `#1a9448` |
| `--color-green-500` | `#00843d` |
| `--color-green-600` | `#006b31` |
| `--typography-caption-desktop` | `13` |
| `Type/Caption` | Alexandria Regular, size `--typography-caption-desktop`, weight 400, lh 1.4, ls 0 |

### 2.2 AR Desktop `698:66`

| Section | Node | Position / size | Values |
|---|---|---|---|
| Header | `698:67` | 0,0 · 1440 × 95.41 | Identical master and geometry to `720:625` / `720:766`. Utilities at x 23.85; Nav 1037.85 wide, 9 RTL items; Logo 120 × 95.41. |
| Hero | `1219:2300` | 0,95.41 · 1440 × 480 | `hero-bg-image` `2705:4` full-bleed 1440 × 480. |
| — Text Side | `1219:2303` | 0,0 · 840 × 480 | Breadcrumb `1262:2298` 207 × 16 at (316.5,135.5): رئيس الاتحاد ‹ عن الاتحاد ‹ الرئيسية. H1 `1228:2298` 242 × 49 at (299,175.5). Name `1219:2306` 680 × 38 at (80,248.5). Role `1219:2307` 680 × 34 at (80,310.5). |
| — Photo Side | `1219:2301` | 880,**−140** · 560 × 760 | `photo-glow` ellipse `2705:5` 520 × 520 at (20,120). Portrait frame `1219:2302` **580 × 760 at x −10** — 20px wider than its 560 parent. Bleeds 140px above the hero. |
| **Speech Card** | `1224:2300` | 0,575.41 · 1440 × 632 | bg `--color-surface-base`; border 1px `--color-border-default`; radius **16**; p **48**; flex-col; gap **32**; drop-shadow `0 1 2 rgba(0,0,0,0.04), 0 4 8 rgba(0,0,0,0.06)`. |
| — Pull-quote | `2705:6` | 48,48 · 1344 × 94 | bg **`#e8f5ed`** (= `--color-green-50`, hardcoded here); border 1px `--color-green-500`; radius **16**; px **20** / py **16**. Text `2705:7` 1304 × 62 — **22px Alexandria Bold, lh 1.4, `--color-green-600`**, right-aligned. |
| — Speech body | `700:73` | 48,174 · 1344 × 410 | **16px Alexandria Regular, lh 1.9, `#374151`** (hardcoded), right-aligned. 5 paragraphs, `mb 20px` between. Each paragraph opens with a **bold `#374151`→`#111` lead-in word** in Alexandria Bold at lh 1.9. |
| Values Section | `1219:2309` | 0,1207.41 · 1440 × 438 | H2 `1219:2310` "قيمنا وتوجهاتنا" 210 × 34 at (615,64). Row `1219:2311` at (64,138) 1312 × 236 — **5 cards 246.4 × 236** at x 0 / 266.4 / 532.8 / 799.2 / 1065.6 (gap 20). |
| — Value card | `1219:2312` | 246.4 × 236 | bg **`#0d1f12`**; border 1px `rgba(255,255,255,0.08)`; radius **16**; px **24** / py **32**; flex-col; `items-center`; gap **16**. Icon container 56 × 56, radius **28**, bg `rgba(0,132,61,0.13)`, border 1px `rgba(0,132,61,0.33)`, glyph **26 × 26**. Title **17px Bold white**, centred. Body **13px Regular, lh 1.6, `rgba(255,255,255,0.65)`**, centred. Icons: `eye` · `users` · `star` · `award` · `zap`. |
| Footer | `698:128` | 0,1645.41 · 1440 × 440 | Grid `698:129` at (64,42) 1312 × 364 — 4 columns 292 at x 0 / 340 / 680 / 1020. Contact 162 · Map 208 (placeholder 250 × 180) · Quick Links 316 (**11 items**, 30px pitch) · Brand 211 (logo 36.43 × 36, blurb 260 × 84, social row 192 × 32). Legal `698:186` at (64,406) 1312 × 64. |

Decorative vectors: 4 `swoosh-decor` + the four named brand swooshes per section, as on the other pages.

### 2.3 AR Tablet `1238:2298`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `1238:2468` | 0,0 · 768 × 100 | Named "Header - Compact (Tablet)". Utilities `2748:4` at (24,41.06) 122.71 × 17.89 (☾ / بحث / AR\|EN). Logo `2748:8` at (624,16) 120 × 68. **Nav `2748:19` is present but `hidden="true"`** — it still carries the full 9-item RTL list at its desktop width of 1037.84, overflowing the 768 frame. **No hamburger replaces it.** |
| Hero | `1240:2298` | 0,100 · 768 × 745 | "Hero Section (Tablet, stacked)". Photo `1240:2299` 768 × 440 at y 32 (no glow ellipse). Text Side `1238:2362` 768 × 273 at y 472: breadcrumb `1263:2298` 207 × 16 at (537,32); H1 720 × 49 at (24,72); name 720 × 38 at (24,145); role 720 × 34 at (24,207). |
| Speech Card | `1238:2368` | 0,845 · 768 × 899 | Pull-quote `2748:64` 720 × 125 at (24,32), inner text 680 × 93 at (20,16). Body `1238:2369` 720 × 710 at (24,157). |
| Values | `1238:2370` | 0,1744 · 768 × 818 | H2 210 × 34 at (279,40). Grid `1247:2298` at (24,114) 720 × 664 — **2-column**: Row 1 `1247:2299` (y 0, h 215) = cards 350 at x 0 / 370; Row 2 `1247:2300` (y 235, h 215) = same; Row 3 `1247:2301` (y 470, h 194) = **one card 720 wide** (الابتكار), body 672 × 21. Row gap 20, column gap 20. |
| Footer | `1238:2482` | 0,2562 · 768 × 594 | "Section / Footer (Tablet, 2x2 stack)". Grid `1238:2483` at (64,72) 640 × 442 — **2 columns 296** at x 0 / 344. Left `1238:2484` = Contact 162 + Map 208 (y 186). Right `1238:2503` = Brand 190 (logo **91 × 36**, social row 192 × 32) + Quick Links 214 (y 214) whose links are a **horizontal wrapped row** `1238:2532` 296 × 74, 3 rows of 28px pitch, 10 items. Legal `1238:2543` at (64,514) 640 × 80. |

### 2.4 AR Mobile `1252:2298`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `1252:2468` | 0,0 · 375 × 100 | Menu Icon `1252:2469` at (16,38) 44 × 24, glyph "≡". Logo `1252:2471` at (269,14) 90 × 72 — **inner mark `1252:2472` is 120 × 64, i.e. 30px wider than its 90-wide parent**. **No search, no AR\|EN switch.** |
| Content wrapper | `1252:2360` | 0,100 · 375 × 3443 | |
| Hero | `1253:2298` | 0,0 · 375 × 619 | Photo `1253:2299` 375 × 300 at y 24. Text Side `1252:2362` 375 × 295 at y 324: breadcrumb 207 × 16 at (152,24); H1 343 × 49 at (16,64); name 343 × **76** at (16,137); role 343 × 34 at (16,237). |
| Speech Card | `1252:2368` | 0,619 · 375 × 1547 | Pull-quote `2748:1994` 343 × 249 at (16,24), inner text 303 × 217. Body `1252:2369` 343 × 1250 at (16,273). |
| Values | `1252:2370` | 0,2166 · 375 × 1277 | H2 210 × 34 at (82.5,32). Stack `1255:2298` at (16,106) 343 × 1139 — 5 cards 343 × 215 at y 0 / 231 / 462 / 693 / 924 (gap 16). Card internals identical to desktop (icon 56 at x 143.5, title y 104, body 295 wide at (24,141)). |
| Footer | `1252:2482` | 0,3543 · 375 × 966 | Grid `1252:2483` at (16,32) 343 × 792 — 1-column: Brand 190 (logo 91 × 36, social row) · "روابط سريعة" heading at y 218 · Quick Links Row `1252:2511` at y 262, 343 × 74, **horizontal wrapped, 10 items in 3 rows** · Contact 144 at y 364 · Map 208 at y 536. Legal `1252:2540` at (16,824) 343 × 118, links wrap to 2 rows. |

### 2.5 EN Desktop `1268:2258`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `1268:2434` | 0,0 · 1440 × **64** | Utilities `1268:2491` at (23.85,23.06) 141.7 wide — "EN \| AR" · "Search" · ☾. Nav `1268:2446` at (165.56,3.28) 1172.85 × 57.44, **9 items in LTR order** (Home first). Logo `1268:2435` at (1338.4,0) 120 × 64. **Layer names inside the nav are still Arabic** ("Nav Item / الرئيسية" …) though the rendered labels are English. |
| Hero | `1268:2321` | 0,64 · 1440 × 480 | `hero-bg-image` `1268:2322` 1440 × 480. Text Side `1268:2323` 840 wide: breadcrumb `2748:1998` 343 × 16 at (80,135.5) — Home › About the Federation › Chairman's Message; H1 420 × 49 at (80,175.5); name 680 × 38 at (80,248.5); role 680 × 34 at (80,310.5). Photo Side `1268:2332` 560 × 760 at (880,−140), glow `2748:2000` 520 × 520, portrait `1268:2334` 580 × 760 at x −10 — **still named "صورة رئيس الاتحاد"**. |
| Speech Card | `2748:2008` | 0,544 · 1440 × 764.43 | Pull-quote `2748:2009` 1344 × 125 at (48,48), text `1268:2344` 1304 × 93. Body `2748:2010` 1344 × 420 at (48,205) — **16px Alexandria Regular, lh 1.9, `#374151`**, 5 paragraphs, **no bold lead-in words** (unlike AR). Layer still named "نص كلمة رئيس الاتحاد". |
| Values | `2748:2018` | 0,1308.43 · 1440 × 438 | H2 "Our Values & Direction" 323 × 34 at (558.5,64). Row `2748:2019` at (64,138) 1312 × 236 — 5 cards 246.4 × 236, gap 20. **Card layer names are still Arabic** ("Card - الرؤية" …). Bodies for Cooperation and Innovation are 84 tall (4 lines) vs 63 for the rest. |
| Footer | `1268:2495` | 0,1746.43 · 1440 × 522 | Grid `1268:2496` at (64,86) 1312 × 358 — 4 columns 292 at x 0 / 340 / 680 / 1020: Brand 191 (logo 36.43 × 36, social row 192 × 32 **including an `x` glyph the AR footer lacks**) · Quick Links 310 (**11 items, all in Arabic**) · Location 208 (map placeholder 250 × 180, labels in English) · Contact 154 (**heading and rows in Arabic**). Legal `1268:2555` at (64,444) 1312 × 64 — **copyright and all 4 links in Arabic**. |

### 2.6 EN Tablet `1273:2258`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `1273:2392` | 0,0 · 768 × 95.41 | Utilities `1273:2393` at (24,38.76) 141.71 wide — ☾ / Search / EN\|AR. Nav `2748:2048` **`hidden="true"`** (9 items, 1196.84 wide). Logo `2748:2093` **also `hidden="true"`**. → **The rendered header contains utilities and nothing else: no logo, no nav, no menu affordance.** |
| Content wrapper | `1273:2273` | 0,95.41 · 768 × 2517 | |
| Hero | `1273:2274` | 0,0 · 768 × 745 | Photo `1273:2275` 768 × 440 at y 32. Text Side `1273:2276` 768 × 273 at y 472: breadcrumb 343 × 16 at (24,32); H1 720 × 49 at (24,72); name 720 × 38 at (24,145); role 720 × 34 at (24,207). |
| Speech Card | `1273:2286` | 0,745 · 768 × 954 | **Contains only a single text node** `1273:2287` (720 × 890 at (24,32)). **No pull-quote frame** — the only one of the six frames missing it. |
| Values | `1273:2288` | 0,1699 · 768 × 818 | H2 323 × 34 at (222.5,40). Grid `1273:2290` at (24,114) 720 × 664 — identical 2 + 2 + full-width-5th geometry to AR tablet. |
| Footer | `1273:2406` | 0,2612.41 · 768 × 889 | Named "2x2 stack" but is a **single column**: Grid `1273:2407` at (64,72) 640 × 737 — Left block `1273:2408` (y 0, 640 wide) = Brand 159 + Quick Links 72 (horizontal wrapped row, 10 EN items); Right block `1273:2450` (y **303**, 640 wide) = Contact 154 + Location 208. Both blocks are 640 wide at x 0, stacked vertically. Legal at (64,809) 640 × 80. |

### 2.7 EN Mobile `1282:2258`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `1282:2386` | 0,0 · 375 × 92 | Logo `1282:2387` at (16,14) 90 × 64 — **inner mark `1282:2388` is 120 × 64, 30px wider than its parent** (same defect as AR mobile). Menu Icon `1282:2398` at (315,24) 44 × 44, glyph "≡" 44 × 24 at y 10. |
| Content wrapper | `1282:2273` | 0,92 · 375 × 4046 | |
| Hero | `1282:2274` | 0,0 · 375 × 668 | **Different construction from AR mobile.** Hero Background `1282:2275` 375 × 300 at y 24. Three `swoosh-decor` vectors `2748:2106/2107/2108` all at **x 18**, y 120 / 156 / 192. Chairman Photo `2748:2109` **220 × 320 at (155,174)** — a distinct portrait frame, where AR mobile uses a full-width 375 × 300 crop. Text Side `1282:2276` 375 × 344 at y 324: breadcrumb 343 × 16 at (16,24); H1 343 × **98** at (16,64); name 343 × 76 at (16,186); role 343 × 34 at (16,286). |
| Speech Card | `1282:2286` | 0,668 · 375 × 2059 | Pull-quote `2748:2110` 343 × 311 at (16,24), text `2748:2111` 303 × 279. Body `1282:2287` 343 × **1700** at (16,335). Two `swoosh-decor` vectors at (16,24) and (219,2019). |
| Values | `1282:2288` | 0,2727 · 375 × 1319 | H2 323 × 34 at (26,32). Stack `1282:2290` at (16,106) 343 × 1181 — 5 cards 343 at y 0 / 231 / 462 / 714 / 945; heights **215 / 215 / 236 / 215 / 236** (Leadership and Innovation bodies wrap to 63). Gap 16. |
| Footer | `1511:2480` | 0,4138 · 375 × 949 | Grid `1511:2481` at (16,32) 343 × 791 — Brand 175 (logo 88 × 36, social row with `x`) · **`Quick Links Heading` `1511:2510` is an empty text node (343 × 20) with no visible label** · Quick Links Row at y 251, 343 × 74, horizontal wrapped, 10 EN items · Contact 154 at y 353 · Location 208 at y 535. Legal `1511:2540` at (16,823) 343 × 102. |

---

## 3. Real copy

### 3.1 Arabic

- **Breadcrumb:** الرئيسية ‹ عن الاتحاد ‹ رئيس الاتحاد
- **H1:** رئيس الاتحاد
- **Name:** سعادة اللواء الدكتور محمد عبدالله المر
- **Role:** كلمة رئيس اتحاد الإمارات لألعاب القوى
- **Pull-quote** (identical at all three AR breakpoints):
  > «نعمل على بناء منظومة متكاملة لرفع مستوى ألعاب القوى في الإمارات، من خلال برامج استكشاف المواهب وتطوير الكوادر التدريبية والرياضية، لرفع راية دولتنا عالياً في المحافل العالمية.»

**Speech body** (`700:73`) — 5 paragraphs, each opening with a bold lead-in word:

1. **يتبنّى** اتحاد الإمارات لألعاب القوى منظومة متكاملة ترسخ تمكين جميع لاعبي ولاعبات منتخباتنا الوطنية المختلفة بأفضل الممارسات لاكتشاف مواهبهم وتطوير قدراتهم وصقل تجاربهم، لإثراء الواقع الخاص بهذه اللعبة، لتحقيق نتائج واعدة تستشرف مستقبلها لرفع رايات دولتنا الغالية في منصات التتويج العالمية.
2. **نسعى** لترسيخ البرامج الاستراتيجية الداعمة لاستدامة التطور وجودة البرامج، لتحقيق المنجزات الوطنية في المنافسات الخارجية، بما يتماشى مع رؤية مجلس الإدارة التطويرية، لبلوغ الأهداف المرجوة و الغايات المنشودة حتى تستعيد "أم الألعاب" موقعها الذي يمكنها من العبور إلى آفاق المستقبل بالإرادة والمثابرة والتحدي.
3. **لطالما** حرصنا على تشارك الرؤى مع الأندية انطلاقاً من رغبتنا في إرساء القيم الداعمة لنهضة اللعبة، والعمل على تصميم برامج طموحة حتى نمضي قدماً في العمل معاً على تعزيز الجهود المرتبطة بالتطور الذي يكرّس ريادة البرامج وبناء خطط مستدامة وفق منظومة متكاملة، وبرامج متنوعة وتعاون بناء وإيجابي بين الجميع.
4. **ندرك** جيداً أن التحديات التي تواجهنا للوصول إلى المنجزات الوطنية يجب أن تمثل دافعاً لنا جميعاً حتى نرتقي بأهدافنا إلى مستوى تطلعاتنا، ونعمل معاً على رسم خريطة نستشعر من خلالها قدرتنا على الوفاء بكل المتطلبات التي نعول عليها للوصول إلى المخرجات التي تجسد الصورة المشرفة عن هذه اللعبة.
5. **فخورون** بالتفاعل الكبير والتجاوب اللافت من الأندية والفئات المجتمعية والمؤسسات الوطنية مع البرامج التي تم الإعلان عنها في الفترة الماضية، لاسيما على مستوى المسابقات المختلفة، ونؤكد أن أبوابنا مفتوحة لإثراء اللعبة بكل ما يمكن أن يعزز تطورها ورفعتها، انطلاقاً من مسؤوليتنا الوطنية التي ننطلق عبرها بثقة كبيرة في قدرة "أم الألعاب" على عكس الصورة المشرفة عن دولة الإمارات في المحافل الخارجية.

**Values** — H2: قيمنا وتوجهاتنا

| # | Icon | Title | Body |
|---|---|---|---|
| 1 | `eye` | الرؤية | استشراف مستقبل ألعاب القوى ورفع راية الإمارات عالياً |
| 2 | `users` | التعاون | الشراكة البناءة مع الأندية والمؤسسات الوطنية لتحقيق الأهداف |
| 3 | `star` | القيادة | قيادة فاعلة وملهمة تدفع نحو الريادة والتميز الرياضي |
| 4 | `award` | التميز | السعي نحو الإنجاز وتحقيق أعلى المستويات في المنافسات |
| 5 | `zap` | الابتكار | تبني الأساليب الحديثة لتطوير قدرات الرياضيين وبرامج الاتحاد |

### 3.2 English

- **Breadcrumb:** Home › About the Federation › Chairman's Message
- **H1:** Chairman's Message
- **Name:** Dr. Muhammad Abdullah Al-Murr *(the AR "سعادة اللواء" honorific/rank is dropped)*
- **Role:** President of the UAE Athletics Federation

**Pull-quote — two different translations exist:**

| Frame | Node | Text |
|---|---|---|
| EN desktop | `1268:2344` | "We are working to build an integrated system to raise the level of athletics in the UAE, through talent discovery programs, training cadre development, and athletic development, to raise our country's flag high in international forums." |
| EN mobile | `2748:2111` | "We are building an integrated system to elevate athletics in the UAE through talent discovery, coaching development, and athlete refinement, to raise our country's flag high on the world stage." |
| EN tablet | — | **absent** |

**Speech body** (`2748:2010`) — 5 paragraphs, **no bold lead-ins**:

1. The UAE Athletics Federation adopts an integrated system that consolidates the empowerment of all male and female players of our various national teams with the best practices to discover their talents, develop their capabilities and refine their experiences, to enrich the reality of this game, to achieve promising results that look forward to its future, to raise the flags of our dear country on the international podiums.
2. We seek to consolidate strategic programs that support the sustainability of development and the quality of programs, to achieve national achievements in external competitions, in line with the developmental vision of the Board of Directors, to achieve the desired goals and objectives so that the "mother of games" can regain its position that enables it to cross into future horizons with will, perseverance and challenge.
3. We have always been keen to share visions with clubs based on our desire to establish values that support the renaissance of the game, and to work on designing ambitious programs in order to move forward in working together to enhance efforts related to development that devote leadership to programs and build sustainable plans according to an integrated system, diverse programs and constructive and positive cooperation between everyone.
4. We are well aware that the challenges we face in order to reach the national achievements must be a motive for all of us in order to raise our goals to the level of our aspirations, and we work together to draw a map through which we feel our ability to fulfill all the requirements that we count on to reach the outputs that embody the honorable image of this game.
5. We are proud of the great interaction and remarkable response of clubs, community groups and national institutions to the programs that were announced in the last period, especially at the level of various competitions, and of the ability of the "Mother of Games" to reflect the honorable image of the UAE in foreign forums.

> **Note on ¶5:** the Arabic original contains a clause the English omits — "ونؤكد أن أبوابنا مفتوحة
> لإثراء اللعبة بكل ما يمكن أن يعزز تطورها ورفعتها، انطلاقاً من مسؤوليتنا الوطنية" ("we affirm that our
> doors are open… arising from our national responsibility"). The English jumps from "various
> competitions" straight to "and of the ability of…", making the sentence read as a non-sequitur.

**Values** — H2: Our Values & Direction

| # | Icon | Title | Body |
|---|---|---|---|
| 1 | `eye` | Vision | Envisioning the future of athletics and raising the UAE flag high |
| 2 | `users` | Cooperation | Building constructive partnerships with clubs and national institutions to achieve our goals |
| 3 | `star` | Leadership | Effective, inspiring leadership driving sporting excellence and pioneering achievement |
| 4 | `award` | Excellence | Striving for achievement and reaching the highest levels of competition |
| 5 | `zap` | Innovation | Embracing modern methods to develop athletes' capabilities and federation programs |

---

## 4. Structural AR-vs-EN differences

| # | Aspect | AR | EN |
|---|---|---|---|
| 1 | **Desktop header height** | 95.41px, `Header (Approved Master Component)` | **64px**, a different instance — 31px shorter, shifting every subsequent Y offset on the page |
| 2 | **Nav order** | RTL: تواصل معنا → … → الرئيسية | LTR: Home → … → Contact Us. Same 9 items, reversed |
| 3 | **Nav chevron placement** | `chevron-down` at x 0 (leading, RTL) | `chevron-down` after the label (trailing, LTR) |
| 4 | **Tablet header contents** | Utilities **+ logo** (nav hidden) | Utilities **only** — logo is also hidden (PM-D02) |
| 5 | **Mobile hero photo** | Full-width 375 × 300 crop, no decoration | **220 × 320 portrait** at (155,174) over a 375 × 300 background, **plus 3 swoosh vectors** |
| 6 | **Tablet speech card** | Pull-quote + body | **Body only — pull-quote missing** |
| 7 | **Speech body typography** | Bold lead-in word opening each paragraph (`#111`) | **No bold lead-ins** — uniform Regular |
| 8 | **Speech body length** | 410 (desktop) / 710 / 1250 | 420 / 890 / **1700** — English runs ~36% taller on mobile |
| 9 | **Values body wrapping** | All 5 bodies wrap to 42–63px | Cooperation and Innovation wrap to **84px** on desktop; Leadership and Innovation to 63px on mobile, giving **uneven card heights (215/215/236/215/236)** |
| 10 | **Footer columns** | Contact / Map / Quick Links / Brand | **Brand / Quick Links / Location / Contact** — reordered, and "Map" is renamed "Location" |
| 11 | **Social icons** | 4 glyphs + an empty `X Icon Button` frame | 5 glyphs including a real `x` glyph |
| 12 | **Footer language** | Arabic throughout | **Quick Links, التواصل, الموقع, the legal links and the copyright are all still in Arabic** (PM-D01) |
| 13 | **Footer logo width** | 36.43 (desktop) / 91 (tablet) / 91 (mobile) | 36.43 / 80 / 88 |
| 14 | **Layer naming** | Arabic, matching content | **Arabic layer names retained on English frames** — "Card - الرؤية", "نص كلمة رئيس الاتحاد", "صورة رئيس الاتحاد", "Nav Item / الرئيسية" |

---

## 5. Defects

| ID | Sev | Node(s) | Defect | Evidence |
|---|---|---|---|---|
| PM-D01 | **P1** | `1268:2525`–`1268:2561`, `1273:2451`, `1273:2461`, `1273:2471`, `1511:2523`, `1511:2532`, `1511:2542` | **The English footer is largely untranslated.** On EN desktop the entire Quick Links column (11 items), the "التواصل" heading and its address/hours rows, the "الموقع" heading, all 4 legal links and the copyright line are **in Arabic**. EN tablet and EN mobile keep "التواصل", "الموقع", the Arabic hours string and all 4 Arabic legal links. EN mobile also mixes an English address row with an Arabic hours row inside the same block. | metadata |
| PM-D02 | **P1** | `2748:2093` | **The EN tablet header has no logo.** Both `Nav` (`2748:2048`) and `Logo` (`2748:2093`) are `hidden="true"`, leaving a 95.41px header containing only the ☾/Search/EN\|AR utilities. There is no brand mark and no navigation affordance on the entire EN tablet page. | metadata `hidden="true"` |
| PM-D03 | **P1** | `1273:2286` | **EN tablet is missing the pull-quote.** The Speech Card contains a single text node and no `pull-quote` frame, while AR desktop/tablet/mobile and EN desktop/mobile all have one. The page's most prominent editorial device disappears at exactly one breakpoint. | metadata |
| PM-D04 | **P1** | `1268:2344` vs `2748:2111` | **Two different English translations of the same pull-quote.** Desktop and mobile carry materially different wordings ("raise the level of athletics" / "training cadre development" / "international forums" vs "elevate athletics" / "coaching development" / "on the world stage"). Neither is marked canonical. | §3.2 |
| PM-D05 | **P2** | `2748:19`, `2748:2048` | **Hidden desktop nav left inside tablet headers with no replacement.** Both AR and EN tablet frames retain the full 9-item nav at its desktop width (1037.84 / 1196.84) inside a 768 frame, merely hidden. Neither tablet frame provides a hamburger — AR tablet has no menu control at all. | metadata |
| PM-D06 | **P2** | `1252:2472`, `1282:2388` | **Logo mark overflows its container on both mobile frames.** The inner `UAEAF Logo (Vector)` is 120 × 64 inside a 90-wide `Logo` frame — a 30px horizontal overflow, in AR (`1252:2471`) and EN (`1282:2387`) alike. | metadata |
| PM-D07 | **P2** | `1219:2302`, `1268:2334` | **Hero portrait overflows its column and bleeds above the section.** The 580 × 760 portrait sits at x −10 inside a 560-wide `Photo Side`, and that column is positioned at **y −140**, extending 140px above the hero into the header band. Present in both languages. | metadata |
| PM-D08 | **P2** | `1273:2406` | **EN tablet footer is mislabelled and mis-built.** Named "2x2 stack" but both child blocks are 640 wide at x 0, stacked vertically at y 0 and y 303 — a single column, not a 2 × 2. The AR tablet equivalent (`1238:2482`) *is* correctly 2-column at x 0 / 344. | metadata |
| PM-D09 | **P2** | `1511:2510` | **Empty heading node.** `Quick Links Heading` on EN mobile is a 343 × 20 text node with no label, where every other frame renders "Quick Links" / "روابط سريعة". | metadata |
| PM-D10 | **P2** | `2748:2010` ¶5 | **Translation drops a clause.** The English ¶5 omits "we affirm that our doors are open to enriching the game… arising from our national responsibility", which makes the surviving sentence read as a non-sequitur ("…various competitions, and of the ability of the Mother of Games to reflect…"). | §3.2 |
| PM-D11 | **P2** | `1268:2434` vs `698:67` | **Desktop header heights differ by language** — 64px (EN) vs 95.41px (AR) — using two different header instances for the same page. Every downstream Y offset differs as a result, and the AR page is 2085.41 tall vs EN 2268.43. | metadata |
| PM-D12 | **P2** | `1268:2363`, `2748:2032`, `1282:2303`, `1282:2315` | **Uneven Values card heights in EN.** Longer English bodies wrap to 84px (desktop Cooperation, Innovation) and 63px (mobile Leadership, Innovation), producing card heights of 215/215/236/215/236 on mobile. The AR cards are uniform. | metadata |
| PM-D13 | **P3** | `700:73`, `2748:2010`, `2705:7` | **Hardcoded colours where tokens exist:** body `#374151`, bold lead-ins `#111`, pull-quote background `#e8f5ed` (= `--color-green-50`, bound elsewhere in the file but not here), value-card background `#0d1f12`, value-card body `rgba(255,255,255,0.65)`. Violates CLAUDE.md §16. | `get_design_context` |
| PM-D14 | **P3** | `2705:7` | **22px type is used but is not in the approved scale** (H4 = 20, H3 = 24) — the open **PB-GAP** DESIGN SYSTEM GAP from CLAUDE.md §7 recurring here in the pull-quote. | CLAUDE.md §7 |
| PM-D15 | **P3** | `1268:2258`, `1273:2258`, `1282:2258` | **Arabic layer names retained throughout the English frames:** "Card - الرؤية / التعاون / القيادة / التميز / الابتكار", "نص كلمة رئيس الاتحاد", "صورة رئيس الاتحاد", and every "Nav Item / <arabic>". Makes EN handoff and Code Connect mapping error-prone. | metadata |
| PM-D16 | **P3** | `698:177`, `720:742` | **Empty `X Icon Button`** in the AR footers (a 32 × 32 frame with no glyph child), while the EN footers have a real `x` glyph. The X/Twitter icon is missing in Arabic. | metadata |
| PM-D17 | **P3** | `1252:2298` vs `1282:2258` | **Mobile hero art direction diverges by language.** AR uses a full-width 375 × 300 photographic crop; EN uses a 220 × 320 cut-out portrait over a background plus three swoosh vectors. These are different designs, not a localisation. | §2.4, §2.7 |

---

## 6. Assets to export before access is lost

- Value icons: `eye`, `users`, `star`, `award`, `zap` — 26 × 26 glyph inside a 56 × 56 container
- Footer icons: `map-pin`, `map-pin-icon`, `instagram`, `x`, `youtube`, `facebook`, `tiktok`
- `UAEAF Logo (Vector)`, `UAEAF Logo (Vector - White)`
- `swoosh-decor` ×2–4 per section; named brand swooshes `خط أحمر`, `خط أخضر`, `خط أبيض`, `خط أسود`,
  `خط أحمر صغير` (−35°). EN uses hyphenated variants of the same names (`خط أحمر - Red Swoosh`).
- `photo-glow` — a 520 × 520 ellipse, reproducible in CSS; no export needed

**NOT EXTRACTED — chairman photography.** `1219:2302` / `1268:2334` (580 × 760), `1240:2299` /
`1273:2275` (768 × 440), `1253:2299` (375 × 300) and `2748:2109` (220 × 320) are image-fill frames.
The master portrait must be recovered from the design team — five distinct crops are required.

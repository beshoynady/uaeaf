# Policies & Regulations (السياسات واللوائح) — Implementation Spec

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
| Extraction method | `get_metadata` (structure), `get_design_context` (real values/tokens/copy), `get_variable_defs` (bindings) |
| Figma editability | **LOCKED — permanent** |
| Governing rules | CLAUDE.md §1, §2, §12 (Content/Copy), §13 (Responsive), §16 (Tokens) |

## Node index

| Language | Breakpoint | Root node id | Root frame name | Frame size (W × H) |
|---|---|---|---|---|
| AR | Desktop 1440 | `720:765` | Page - Static (AR) - السياسات واللوائح | 1440 × 2886 |
| AR | Tablet 768 | `2757:1931` | Page - Static (AR) - Tablet - السياسات واللوائح | 768 × 2684 |
| AR | Mobile 375 | `2757:2117` | Page - Static (AR) - Mobile - السياسات واللوائح | 375 × 4632 |
| EN | Desktop 1440 | `2757:2308` | Page - Static (EN) - Desktop - Policies & Regulations | 1440 × 3158 |
| EN | Tablet 768 | `2757:2561` | Page - Static (EN) - Tablet - Policies & Regulations | 768 × 3013 |
| EN | Mobile 375 | `2757:2715` | Page - Static (EN) - Mobile - Policies & Regulations | 375 × 3213 |

> ### 🔴 Headline finding — the reported empty-hero defect is confirmed and is **worse than reported**
>
> | Frame | Node | Size | Children |
> |---|---|---|---|
> | AR desktop hero | `762:208` | 1440 × 420 | **0 — confirmed empty** |
> | EN desktop hero | `2757:2345` | 1440 × 420 | **0 — confirmed empty** |
> | EN **tablet** hero | `2757:2578` | 768 × 320 | **0 — also empty (not previously reported)** |
> | EN **mobile** hero | `2757:2732` | 375 × 139 | **0 — also empty (not previously reported)** |
> | AR tablet hero | `2757:1948` | 768 × 380 | ✅ full content |
> | AR mobile hero | `2757:2133` | 375 × 473 | ✅ full content |
>
> **The English page has no hero content at any breakpoint.** The only place hero copy for this page
> exists anywhere in the file is the Arabic tablet and Arabic mobile frames. Those two frames are
> therefore the sole surviving source for this page's hero. See defect PR-D01.

---

## 1. Responsive comparison table — the reusable responsive system

### 1.1 AR responsive system (`720:765` → `2757:1931` → `2757:2117`)

| Section | Desktop 1440 | Tablet 768 | Mobile 375 |
|---|---|---|---|
| **Page gutter** | 64px (content 1312) | 48px (content 672) | 16px (content 343) |
| **Header** | 1440 × 95.41, full 9-item RTL nav + ☾/بحث/AR\|EN + logo | 768 × 80, **hamburger + AR\|EN** left, logo right — nav removed | 375 × 80, **hamburger only** + logo — no language switch |
| **Hero** | 1440 × 420 — **EMPTY** | 768 × 380 — **side-by-side**: editorial image 304 × 284 at (48,48), text 344 × 284 at (376,48) | 375 × 473 — **stacked**: image 343 × 240 at y 0, text 343 × 233 at y 240 |
| **Hero breadcrumb** | absent (empty frame) | 4 levels, 460 wide, x −116 (overflows its parent) | **3 levels** — "الحوكمة والاستراتيجية" dropped, 249 wide |
| **Hero H1** | absent | 344 × 44 | 259 × 34 |
| **Intro** | 800 wide, right-offset at x=576, 93 tall | 672 full-width, 181 tall, rule at y 157 | 343 full-width, 200 tall, rule at y 184 |
| **Document Center** | 1312 × 148 — search bar 1312 × 46, filters row 527 wide | 768 × 177 — search 672 × 41, filter row 672 × 27 | 375 × 207 — search 343 × 41, filter row 343 × **62 (wraps to 2 rows)** |
| **Filter chips** | 6 chips, h 33, px 18, gap 10 | 6 chips, h 27, px 16, gap 8 | 6 chips, h 27, **wrapped 4 + 2** |
| **Regulations grid** | **3 columns**, card 424 × 215, gap 20 | **2 + 1**: two cards 328 wide (gap 16) then one **full-width 672** card | **1 column**, card 343 × 209, gap 16 |
| **Policies grid** | **3 columns**, card 424 × 215, gap 20 | **2 + 1**, same as regulations | **1 column**, card 343 (209/209/227), gap 16 |
| **Doc card style** | **Green-filled** (`--color-green-500` bg, white text), radius `--radius-lg` 16, p 24, gap 14, dual shadow | **White card** with a 4px green accent bar inset at (20,20), radius NOT EXTRACTED, p 20 | **White card** with a **full-width 4px green accent** at the top edge (y 0), p 20 |
| **Doc card actions** | "تحميل PDF ↓" + "عرض الوثيقة ←" | "الإصدار: -" + "عرض اللائحة ←" / "عرض السياسة ←" | "عرض اللائحة ←" + "تحميل PDF ↓" (**order reversed vs desktop**) |
| **Doc card meta** | Meta Row 135 wide: الإصدار / آخر تحديث | merged into the actions row | Meta Row 135 wide restored |
| **Governance links** | **2 links**, 644 × 91, gap 24 | **2 links**, 328 × 109, gap 16 | **3 links**, 343 × 110, gap 16 |
| **Governance link CTA** | none (title + body only) | "استكشف ←" text | "استكشف ←" **+ a 16px `arrow-left` icon** |
| **CTA** | 1312 × 135 | 768 × 222 (+ a 0-height "CTA Spacer") | 375 × 206 (+ a **160-tall** "CTA Spacer") |
| **Footer** | **4 columns** 292 wide (Contact / Map / Quick Links ×11 / Brand+Social ×5), 1440 × 500 | **4 columns 144 wide** (Contact / Map / Quick Links ×4 / Brand), 768 × 436 — **no social icons** | **1 column stack** (Contact / Map / Quick Links ×4 / Brand), 375 × 791 — **no social icons** |
| **Footer legal** | 4 links + copyright, 1312 × 64 | copyright + 2 links, 672 × 37 | **copyright only**, 343 × 37 |

### 1.2 EN responsive system (`2757:2308` → `2757:2561` → `2757:2715`)

| Section | Desktop 1440 | Tablet 768 | Mobile 375 |
|---|---|---|---|
| **Page gutter** | 64px (content 1312) | 32px (content 704) | 16px (content 343) |
| **Header** | 1440 × 96, logo 100 wide, **9-item LTR nav**, ☾ / Search 🔍 / EN\|AR | 768 × 80, logo 80 wide, **EN\|AR + ☰**, no nav | 375 × **64**, logo 70 wide, **EN + ☰** |
| **Hero** | 1440 × 420 — **EMPTY** | 768 × 320 — **EMPTY** | 375 × 139 — **EMPTY** |
| **Intro** | 800 × 159 boxed at (64,64), inner p 24 | 704 × 118 at (32,40), inner p 20 | 343 × 116 at (16,32), inner p 16 |
| **Divider style** | `line` nodes (0-height) at y 271 / 953 / 1376 / 1615 | none between sections | none between sections |
| **Document Center** | 1312 × 209 box — search 1248 × 46, filters 585 wide | 704 × 172 box — search 656 × 41, filters 656 × 27 | 343 × 146 box — search 311 × 36, filters 311 × 32 |
| **Filter chips** | **6**: All · Regulations · Policies · Guidelines · Forms · Decisions | **4**: All · Regulations · Policies · **Guides** | **5**: All · Regulations · Policies · Forms · **Guides** |
| **Regulations grid** | **3 columns**, card 424 × 236, gap 20 | **2 × 2**: row 1 two cards 344 wide (gap 16); row 2 one card **365** wide + a 323 spacer | **1 column**, card 343 (234/254/236), gap 12 |
| **Policies grid** | **3 columns**, card 424 × 234, gap 20 | **2 × 2** with the same 365 + spacer pattern | **1 column**, card 343 (216/216/236), gap 12 |
| **Doc card style** | White, radius NOT EXTRACTED, p 20, gap NOT EXTRACTED; **Regulations cards have a 4px `Green Accent` top bar, Policies cards do not** | White, 4px Green Accent on **all** cards, p 20 | White, 4px Green Accent on all cards, p 20 |
| **Doc card anatomy** | Top Row 384 × 21 (Type Badge + PDF Icon 32 × 20) · title y 55 · body y 89 · Meta Row y 139 · line y 166 · Actions y 180 | Top Row 304/325 × 21 (PDF Icon **36 × 11**) · title y 55 · body y 90 · Meta y 164 · **rounded-rect divider** y 191 · Actions y 206 | Top Row 303 × 21 · title y 55 · body y 89 · Meta y 139/157 · line y 166/186 · Actions y 180/200 |
| **Governance links** | **2 links** 646 × 92, gap 20, title row + "→" | **2 links** 344 × 114, gap 16 | **3 links** 343 (112/92/92), gap 12 |
| **CTA** | 1312 × 213 | 704 × 212 | 343 × 105 |
| **Footer** | **4 columns** (Brand / Quick Links ×5 / Contact / Map card 220 × 130), 1440 × 343, **+ a `FlagSwooshes` group at (0,0) 300 × 200** | 768 × 380 — **Brand + Contact only**; no quick links, no map | 375 × 333 — **Brand + Contact only** |
| **Footer contact style** | `map-pin` icon + text rows | **emoji prefixes** 📍 / 📧 | **emoji prefixes** 📍 / 📧 |
| **Footer legal** | 3 links + copyright, 1312 × 63 | **copyright only**, 704 × 45 | **copyright only, truncated** ("© 2026 UAE Athletics Federation." — no "All rights reserved.") |

### 1.3 Derived breakpoint rules

1. **Gutters:** AR 64 / 48 / 16 · EN 64 / 32 / 16. Content 1312 / 672 / 343 (AR), 1312 / 704 / 343 (EN).
2. **Document grid collapse:** 3-up → 2-up (with a full-width or spacer-padded third) → 1-up.
3. **Filter row:** single row at ≥768; **wraps** at 375 (AR) or reduces its chip count (EN).
4. **Chip height ramp:** 33 → 27 → 27 (AR) · 32 → 27 → 32 (EN).
5. **Card padding ramp:** 24 → 20 → 20.
6. **Governance links:** 2 at ≥768 → **3 at 375** in both languages (a third link is added, not revealed).
7. **Footer collapse:** 4-col → 4-col narrow (AR) / 1-col (EN) → 1-col stack.

---

## 2. Per-section specification

Font throughout: **Alexandria**. Token names are the bound Figma variables; a raw hex means no binding.

### 2.1 Design tokens observed

Bound on `720:765` (AR desktop):

| Token | Value |
|---|---|
| `--color-text-primary` | `#000000` |
| `--color-text-secondary` | `#616058` |
| `--color-text-inverse` | `#ffffff` |
| `--color-surface-base` | `#fdfcfb` |
| `--color-border-default` | `#e0dfdb` |
| `--color-brand-primary` | `#00843d` |
| `--color-brand-black` | `#000000` |
| `--color-green-50` | `#e8f5ed` |
| `--color-green-400` | `#1a9448` |
| `--color-green-500` | `#00843d` |
| `--color-green-600` | `#006b31` |
| `--radius-lg` | `16` |
| `--typography-caption-desktop` | `13` |
| `Type/Caption` | Alexandria Regular, size `--typography-caption-desktop`, weight 400, lh 1.4, ls 0 |

Bound on `2757:2308` (EN desktop): **`{}` — zero variables bound.** Every colour, radius and spacing
value on the entire English desktop page is hardcoded. See defect PR-D09.

### 2.2 AR Desktop `720:765`

| Section | Node | Position / size | Values |
|---|---|---|---|
| Hero Image Overlay | `2704:1932` | 0,0 · 1440 × 420 | **Empty frame sitting at y=0, overlapping the header.** Purpose unclear. |
| Header | `720:766` | 0,0 · 1440 × 95.41 | Identical master and geometry to the Strategic Plan AR header (`720:625`). Utilities at x 23.85; Nav 1037.85 wide, 9 RTL items; Logo 120 × 95.41 at x 1296.15. |
| **Hero** | `762:208` | 0,95.41 · 1440 × 420 | **EMPTY — 0 children. NOT EXTRACTED — no content exists in Figma.** Use the AR tablet/mobile hero copy (§3.1) as the only surviving source. |
| Content wrapper | `720:827` | 0,515.41 · 1440 × 1608 | |
| Intro | `762:209` | 576,64 · 800 × 93 | H2 `762:210` "الحوكمة والتنظيم" 210 × 29 at x 590. Body `762:211` 800 × 52 at y 41. |
| Divider | `762:212` | 64,189 · 1312 × 1 | |
| Document Center | `762:213` | 64,222 · 1312 × 148 | H2 `762:214` "مركز الوثائق" 140 × 29, right-aligned. Search bar `762:215` 1312 × 46 at y 49 — placeholder 1246 × 18 at (20,14), 🔍 14 × 14 at x 1278. Filters `762:218` at (785,115) 527 × 33 — 6 chips h 33, label 17px-tall at (18,8), gap 10: القرارات (83) · النماذج (84) · الأدلة (72) · السياسات (97) · اللوائح (77) · الكل (64). |
| اللوائح | `765:202` | 64,402 · 1312 × 318 | H2 `765:203` 76 × 29. Lede `765:204` 1312 × 26 at y 53. Row `765:250` at y 103 — 3 cards 424 × 215 at x 0 / 444 / 888 (gap 20). |
| — Document card | `2544:1209` | 424 × 215 | bg **`--color-green-500`**; border 1px `--color-green-500`; radius **`--radius-lg` (16)**; p **24**; gap **14**; flex-col; `overflow-clip`; shadow `0 0 18 0 rgba(0,132,61,0.2), 0 10 28 -10 rgba(0,0,0,0.25)`. **Top Row** 376 × 23 at (24,24), `justify-between`: Type Badge — bg `#064e3b`, border `#064e3b`, radius **999**, px 12 / py 4, label **12px Medium `--color-text-inverse`**; PDF Icon — bg `#064e3b`, radius **8**, w 36, label **9px Bold `--color-text-inverse`** centred. **Title** 17px SemiBold `--color-text-inverse`, right-aligned. **Body** 13px Regular lh 1.5 **`#e5e7eb`**. **Meta Row** gap 24, 12px Regular **`#d1d5db`**. **Divider** 1px `rgba(255,255,255,0.1)`. **Actions Row** `justify-between`: "تحميل PDF ↓" 13px Medium `#d1d5db`; "عرض الوثيقة ←" 14px SemiBold `--color-brand-primary`. |
| Divider | `765:251` | 64,752 · 1312 × 1 | |
| السياسات | `765:252` | 64,785 · 1312 × 318 | Same structure; Type Badge is 62 wide ("سياسة"). Cards `2544:1254` / `2544:1269` / `2544:1284`. |
| Divider | `765:301` | 64,1135 · 1312 × 1 | |
| Governance Links | `765:302` | 64,1168 · 1312 × 144 | H2 `765:303` 260 × 29. Row `765:304` at y 53, 1312 × 91 — 2 links 644 × 91 at x 0 / 668 (gap 24). Each: title 22px-tall at (466/503, 20), body 604 × 21 at (20,50). |
| Divider | `765:311` | 64,1344 · 1312 × 1 | |
| CTA | `765:312` | 64,1377 · 1312 × 135 | **NOT EXTRACTED — no child nodes.** |
| Footer | `720:834` | 0,2123.41 · 1440 × 500 | Grid `720:835` at (64,72) 1312 × 364 — 4 columns 292 at x 0/340/680/1020. Identical content to the Strategic Plan AR footer. Legal `720:892` at (64,436) 1312 × 64. |

Decorative vectors: `swoosh-decor` ×4 plus the four named brand swooshes per section, as on the
Strategic Plan page.

### 2.3 AR Tablet `2757:1931`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `2757:1932` | 0,0 · 768 × 80 | Left Actions `2757:1933` at (32,22) 93 × 36 — Hamburger 36 × 36 (glyph `menu` 20px at inset 8) + "AR \| EN" 45 × 15 at x 48. Logo `2757:1937` at (646,0) 90 × 80, mark 90 × 48 at y 16. |
| **Hero** | `2757:1948` | 0,80 · 768 × 380 | ✅ **Full content — the primary surviving source for this page's hero.** Editorial Image `2757:3016` 304 × 284 at (48,48). Hero Text `2757:3023` 344 × 284 at (376,48): Breadcrumb `2757:3024` 460 × 33 at x **−116** (overflows parent); eyebrow `2757:3032` 140 × 17 at (204,49); H1 `2757:3033` 344 × 44 at y 82; lede `2757:3034` 344 × 72 at y 142. |
| Intro | `2757:1962` | 0,460 · 768 × 181 | H2 210 × 29 at (510,48); body 672 × 48 at (48,93); Line `2757:1965` at (48,157) 672 × **0** (a `line` node). |
| Document Center | `2757:1966` | 0,641 · 768 × 177 | H2 140 × 29 at (580,24). Search `2757:1968` 672 × 41 at (48,69) — placeholder 612 × 17 at (16,12), 🔍 16 × 16 at x 640. Filters `2757:1971` 672 × 27 at (48,126) — 6 chips h 27, label at (16,6), gap 8: القرارات (72) · النماذج (73) · **الأنظمة** (77) · السياسات (85) · اللوائح (67) · الكل (56). |
| اللوائح | `2757:1984` | 0,818 · 768 × 506 | H2 76 × 29 at (644,24); lede 672 × 21 at (48,69). Grid `2757:1987` at (48,106) 672 × 376: row `2772:1930` (y 0) = 2 cards **328 wide** at x 0 / 344; then `2757:2012` at y 196 = **1 card full-width 672**. |
| — Document card | `2757:1988` | 328 × 180 | **White card.** Accent Bar `2757:3035` 288 × **4**, radius rounded, inset at (20,20). Top Row 288 × 25 at (20,36): badge 48 × 21 (label 13px-tall at (10,4)) + PDF chip 35 × 25 at x 253. Title 288 × 18 at y 73. Body 288 × 18 (or 36) at y 103. Line 288 × 0 at y 133. Actions 288 × 15 at y 145: "الإصدار: -" left + "عرض اللائحة ←" (85 wide) right. |
| السياسات | `2757:2024` | 0,1324 · 768 × 506 | Same 2 + 1 structure. Badge 57 wide ("سياسة"); action "عرض السياسة ←" 96 wide. |
| Governance | `2757:2064` | 0,1830 · 768 × 218 | H2 260 × 29 at (460,32). Row `2757:2066` at (48,77) 672 × 109 — 2 cards 328 × 109 at x 0 / 344. Each: title 20px-tall at (195/161,20); body 288 × 18 at (20,48); "استكشف ←" 65 × 15 at (243,74). |
| CTA Spacer | `2757:2079` | 0,2048 · 768 × **0.0001** | Zero-height artefact. |
| CTA | `2757:2080` | 0,2048 · 768 × 222 | **NOT EXTRACTED — no child nodes.** |
| Footer | `2757:2085` | 0,2270 · 768 × 436 | Grid `2757:2086` at (48,180) 672 × 147 — **4 columns 144 wide** at x 0 / 176 / 352 / 528 (gap 32). Contact 143 · Map 89 (placeholder 144 × 60) · Quick Links 125 (**4 items**, 27px pitch: الرئيسية / عن الاتحاد / السياسات واللوائح / تواصل معنا) · Brand 147 (logo 40 × 40, **no social row**). Legal `2757:2111` at (48,367) 672 × 37. |

### 2.4 AR Mobile `2757:2117`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `2757:2118` | 0,0 · 375 × 80 | Left Actions `2757:2119` at (16,22) — **hamburger only, 36 × 36**. Logo at (269,0) 90 × 80. **No AR\|EN switch.** |
| **Hero** | `2757:2133` | 0,80 · 375 × 473 | ✅ **Full content.** Editorial Image `2757:2968` 343 × 240 at (16,0). Hero Text `2757:2974` 343 × 233 at (16,240): Breadcrumbs `2757:2137` 249 × 25 at (78,24) — **3 levels only**; inner frame `2757:2143` 311 × 136 at (16,65) = eyebrow 130 × 15, H1 259 × 34 at y 27, lede 311 × 63 at y 73. |
| Intro | `2757:2147` | 0,553 · 375 × 200 | H2 175 × 24 at (184,32); body 343 × 96 at (16,72); Line at (16,184) 343 × 0. |
| Document Center | `2757:2151` | 0,753 · 375 × 207 | H2 117 × 24 at (242,24). Search `2757:2153` 343 × 41 at (16,64) — placeholder 283 × 17, 🔍 at x 311. Filters `2757:2156` 343 × **62** at (16,121) — **2 rows**: row 1 القرارات (72) / النماذج (73) / **الأدلة** (63) / السياسات (85); row 2 at y 35 اللوائح (67) / الكل (56). |
| اللوائح | `2757:2169` | 0,960 · 375 × 805 | H2 64 × 24 at (295,24); lede 343 × 42 at (16,64). Grid `2757:2172` at (16,122) 343 × 659 — 3 cards 343 × 209 at y 0 / 225 / 450 (gap 16). |
| — Document card | `2757:2173` | 343 × 209 | **White card.** Green Accent `2757:2975` **343 × 4 at (0,0)** — full-width top bar, not an inset side bar. Top Row 303 × 25 at (20,20). Title 303 × 18 at y 57. Body 303 × 36 at y 87. Meta Row 135 × 15 at (20,135). Line 303 × 0 at y 162. Actions 303 × 15 at y 174: **"عرض اللائحة ←" left (82) + "تحميل PDF ↓" right (76)** — reversed vs desktop. |
| السياسات | `2757:2209` | 0,1765 · 375 × 823 | 3 cards 343 at y 0 / 225 / 450; heights 209 / 209 / **227** (third card's title wraps to 36). |
| Governance | `2757:2249` | 0,2588 · 375 × 466 | H2 217 × 24 at (142,32). Stack `2757:2251` at (16,72) 343 × 362 — **3** links 343 × 110 at y 0 / 126 / 252 (gap 16). Each: title 20px-tall at y 20; body 18px-tall at y 48; Arrow frame 87 × 16 at (236,74) = "استكشف ←" 65 × 15 + `arrow-left` icon 16 × 16 at x 71. |
| CTA Spacer | `2757:2264` | 0,3054 · 375 × **160** | A 160px empty spacer — inconsistent with the tablet's 0-height spacer. |
| CTA | `2757:2265` | 0,3214 · 375 × 206 | **NOT EXTRACTED — no child nodes.** |
| Footer | `2757:2270` | 0,3420 · 375 × 791 | Grid `2757:2271` at (16,160) 343 × 522 — 1-column stack: Contact 98 (y 0) · Map 89 (y 130) · Quick Links 125 (y 251, **4 items**) · Brand 114 (y 408, logo 40 × 40, **no social row**). Legal `2757:2296` at (16,722) 343 × 37 — **copyright only, no legal links**. |

### 2.5 EN Desktop `2757:2308`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `2757:2309` | 0,0 · 1440 × 96 | Logo `2757:2310` at (64,0) 100 × 96. Nav `2757:2321` at (252,25) 884 × 46 — **9 LTR items**: Home · About the Federation (active, 2px indicator) · Clubs · Athletes · Championships · Events · News & Articles · Media Center · Contact Us. Item h 40 (active 46), label at (4,12) 16px-tall. Utilities `2757:2341` at (1224,39.5) 152 wide: ☾ · "Search 🔍" · "EN \| AR". |
| **Hero** | `2757:2345` | 0,96 · 1440 × 420 | **EMPTY — 0 children. NOT EXTRACTED.** |
| Content wrapper | `2757:2363` | 0,516 · 1440 × 1972 | |
| Intro | `2757:2364` | 64,64 · 800 × 159 | Boxed. H2 "Governance & Regulation" 284 × 27 at (24,24). Body 752 × 72 at (24,63). |
| Line | `2757:2367` | 64,271 · 1312 × 0 | |
| Document Center Box | `2757:2368` | 64,319 · 1312 × 209 | H2 "Document Center" 200 × 27 at (32,32). Search `2757:2370` 1248 × 46 at (32,79) — 🔍 15 × 15 at (20,15.5), placeholder 1181 × 18 at x 47. Filters `2757:2373` 585 × 32 at (32,145) — **6 chips** h 32, label at (18,8), gap 10: All (54) · Regulations (114) · Policies (86) · Guidelines (105) · Forms (77) · Decisions (99). |
| Regulations | `2757:2386` | 64,576 · 1312 × 329 | H2 136 × 27; lede 1312 × 18 at y 51. Grid at y 93 — 3 cards 424 × 236 at x 0 / 444 / 888 (gap 20). |
| — Document card | `2757:2390` | 424 × 236 | **White.** Green Accent `2757:2391` **424 × 4 at (0,0)**. Top Row 384 × 21 at (20,20): Type Badge 85 × 21 (label "Regulation" 13px-tall at (12,4)) + PDF Icon 32 × 20 at x 352 (label 11px-tall). Title 384 × 20 at y 55. Body 384 × 36 at y 89. Meta Row 384 × 13 at y 139 — "Version: 2026.1" (80) + "Updated: Jan 2026" (104) at x 96. Line 384 × 0 at y 166. Actions 384 × 16 at y 180 — "Download PDF ↓" (109) left + "View Regulation →" (120) right. |
| Line | `2757:2438` | 64,953 · 1312 × 0 | |
| Policies | `2757:2439` | 64,1001 · 1312 × 327 | H2 87 × 27; lede at y 51. Grid at y 93 — 3 cards 424 × 234. **These cards have NO `Green Accent` child** (see PR-D05). Action label "View Policy →" (88). |
| Line | `2757:2491` | 64,1376 · 1312 × 0 | |
| Governance Links | `2757:2492` | 64,1424 · 1312 × 143 | H2 "Governance & Strategy Linkages" 362 × 27. Row at y 51 — 2 links 646 × 92 at x 0 / 666 (gap 20). Each: Title Row 606 × 24 at (20,20) = title 586 × 22 + "→" 20 × 24; body 606 × 20 at (20,52). |
| Line | `2757:2510` | 64,1615 · 1312 × 0 | |
| CTA Box | `2757:2511` | 64,1663 · 1312 × 213 | **NOT EXTRACTED — no child nodes.** |
| Footer | `2757:2516` | 0,2488 · 1440 × 343 | Grid at (64,72) 1312 × 160 — **4 columns**: Brand 260 wide (x 0, logo 45 × 44) · Quick Links 302.67 (x 308, **5 items**, 27px pitch) · Contact 302.67 (x 658.67, `map-pin` icon row) · Map 302.67 (x 1009.33, Map card 220 × 130). Legal at (64,280) 1312 × 63 — 3 links left, copyright right. **`FlagSwooshes` `2757:2849` at (0,0) 300 × 200** containing Red / Green / White swoosh vectors. |

### 2.6 EN Tablet `2757:2561`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `2757:2562` | 0,0 · 768 × 80 | Logo at (32,0) 80 × 80. Right block `2757:2574` at (641,21) 95 × 38 — "EN \| AR" 46 × 15 + Hamburger 33 × 38 ("☰" 17 × 22 at (8,8)). No nav. |
| **Hero** | `2757:2578` | 0,80 · 768 × 320 | **EMPTY — 0 children. NOT EXTRACTED.** |
| Content wrapper | `2757:2588` | 0,400 · 768 × 2067 | |
| Intro | `2757:2589` | 32,40 · 704 × 118 | H2 259 × 24 at (20,20); body 664 × 42 at (20,56). |
| Document Center Box | `2757:2592` | 32,190 · 704 × 172 | H2 182 × 24 at (24,24). Search 656 × 41 at (24,64). Filters `2757:2597` 656 × 27 at (24,121) — **4 chips**: All (45) · Regulations (100) · Policies (74) · **Guides** (70), gap 8. |
| Regulations | `2757:2606` | 32,394 · 704 × 584 | H2 123 × 24. Grid at y 40, 704 × 544: row `2757:2855` (y 0, h 264) = cards 344 × 243 and 344 × 264 at x 0 / 360; row `2757:2856` (y 280, h 264) = card **365 × 264** at x 0 + `regulations-spacer` 323 × 1 at x 381. |
| — Document card | `2757:2609` | 344 × 243 | **White.** Green Accent 344 × 4 at (0,0). Top Row 304 × 21 at (20,20): badge 85 × 21 + PDF Icon **36 × 11** at (268,5). Title 304 × 21 at y 55. Body 304 × 60 at y 90. Meta 304 × 13 at y 164 (gap to second item = 104). **Divider is a `rounded-rectangle` 304 × 1** at y 191 (desktop/mobile use a 0-height `line`). Actions 304 × 17 at y 206. |
| Policies | `2757:2641` | 32,1010 · 704 × 563 | Grid at y 40, 704 × 523: row `2757:2874` (y 0, h 243) = 2 cards 344 × 243; row `2757:2891` (y 259, h 264) = card 365 × 264 + `policies-spacer` 323 × 1. **All cards here DO have a Green Accent.** |
| Governance | `2757:2676` | 32,1605 · 704 × 154 | H2 "Governance & Strategy" 233 × 24. Row at y 40 — 2 links 344 × 114 at x 0 / 360. |
| CTA Box | `2757:2689` | 32,1791 · 704 × 212 | **NOT EXTRACTED — no child nodes.** |
| Footer | `2757:2693` | 0,2467 · 768 × 380 | Brand `2757:2694` at (32,48) 260 × 160. Footer Grid Mobile `2757:2707` at (32,240) 704 × 63 — **Contact Column only**, with emoji rows "📍 Zayed Sports City, Abu Dhabi, UAE" and "📧 info@uaeaf.ae". Legal at (32,335) 704 × 45 — **copyright only**. **No quick links, no map, no social.** |

### 2.7 EN Mobile `2757:2715`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `2757:2716` | 0,0 · 375 × 64 | Logo at (16,0) 70 × 64. Right block `2757:2728` at (306,16.5) 53 × 31 — "EN" 17 × 13 + Hamburger 28 × 31. |
| **Hero** | `2757:2732` | 0,64 · 375 × 139 | **EMPTY — 0 children. NOT EXTRACTED.** |
| Content wrapper | `2757:2736` | 0,203 · 375 × 2429 | |
| Intro | `2757:2737` | 16,32 · 343 × 116 | H2 233 × 22 at (16,16); body 311 × 54 at (16,46). |
| Document Center Box | `2757:2740` | 16,172 · 343 × 146 | H2 164 × 22 at (16,16). Search 311 × 36 at (16,50). Filters `2772:1952` 311 × 32 at (16,98) — **5 chips**: All (42) · Regulations (102) · Policies (74) · Forms (65) · **Guides** (69) at x 0/50/160/242/**315**. The last chip starts at x 315 inside a 311-wide frame → **overflows by 73px**. |
| Regulations | `2757:2745` | 16,342 · 343 × 782 | H2 111 × 22. 3 cards 343 at y 34 / 280 / 546; heights 234 / 254 / 236 (gap 12). |
| — Document card | `2757:2747` | 343 × 234 | **White.** Green Accent 343 × 4 at (0,0). Top Row 303 × 21 at (20,20): badge 85 × 21 + PDF Icon 32 × 20 at x 271. Title 303 × 20 at y 55. Body 303 × 54 at y 89. Meta 303 × 13 at y 157. Line at y 184. Actions 303 × 16 at y 198. |
| Policies | `2757:2779` | 16,1148 · 343 × 726 | 3 cards 343 at y 34 / 262 / 490; heights 216 / 216 / 236. |
| Governance | `2757:2949` | 16,1898 · 343 × 354 | H2 210 × 22. **3 links** 343 at y 34 / 158 / 262; heights 112 / 92 / 92. **The first link is "Policies & Regulations" — a self-link on the Policies page.** Others: Strategic Plan, Vision & Mission. |
| CTA Box | `2757:2825` | 16,2276 · 343 × 105 | **NOT EXTRACTED — no child nodes.** |
| Footer | `2757:2829` | 0,2632 · 375 × 333 | Brand at (16,40) 260 × 160. Contact Column at (16,224) 343 × 40 — emoji rows only. Legal at (16,288) 343 × 45 — "© 2026 UAE Athletics Federation." (**truncated**). |

---

## 3. Real copy

### 3.1 Arabic

**Hero** *(exists only on tablet `2757:1931` / mobile `2757:2117`)*
- Breadcrumb (tablet, 4 levels): الرئيسية ‹ عن الاتحاد ‹ الحوكمة والاستراتيجية ‹ السياسات واللوائح
  *(mobile drops "الحوكمة والاستراتيجية")*
- Eyebrow: الحوكمة والاستراتيجية
- H1: **السياسات واللوائح**
- Lede: إطار تنظيمي واضح يدعم الحوكمة الرشيدة، وينظم العمل الإداري والفني للاتحاد، ويعزز الالتزام بالأنظمة والمعايير المعتمدة في رياضة ألعاب القوى.

**Intro** — H2: الحوكمة والتنظيم
Body: يلتزم اتحاد الإمارات لألعاب القوى بتطوير إطار تنظيمي واضح يدعم النزاهة والشفافية والكفاءة في إدارة أعمال الاتحاد، وينظم العلاقة بين مختلف الأطراف والجهات المرتبطة بمنظومة ألعاب القوى في دولة الإمارات.

**Document Center** — H2: مركز الوثائق · placeholder: البحث في السياسات واللوائح...
Filters (desktop): القرارات · النماذج · **الأدلة** · السياسات · اللوائح · الكل
Filters (tablet): القرارات · النماذج · **الأنظمة** · السياسات · اللوائح · الكل
Filters (mobile): القرارات · النماذج · **الأدلة** · السياسات · اللوائح · الكل

**اللوائح** — lede: اللوائح المنظمة للعمل الرياضي والإداري والفني في اتحاد الإمارات لألعاب القوى.

| Breakpoint | Cards |
|---|---|
| Desktop | 1. لائحة تسجيل وانتقال الرياضيين — إجراءات تسجيل الرياضيين وانتقالهم بين الأندية. · 2. **اللائحة الفنية لمسابقات ألعاب القوى** — القواعد الفنية المنظمة لإقامة المسابقات والبطولات. · 3. اللائحة الأساسية للاتحاد — الإطار التأسيسي والتنظيمي العام لعمل الاتحاد. |
| Tablet | 1. اللائحة الأساسية للاتحاد — الإطار التأسيسي والتنظيمي العام لعمل الاتحاد. · 2. **اللائحة المالية لمسابقات ألعاب القوى** — القواعد والضوابط المالية المنظمة لإقامة البطولة والمسابقة المحلية. · 3. لائحة تسجيل وانتقال الرياضيين — إجراءات تسجيل اللاعبين والعدائين وانتقالهم بين الأندية والاتحاد. |
| Mobile | 1. **اللائحة الأساسية لاتحاد الرياضيين** — الإطار التأسيسي والتنظيمي العام لعمل اتحاد رياضة ألعاب القوى. · 2. اللائحة المالية لمسابقات ألعاب القوى · 3. لائحة تسجيل وانتقال الرياضيين |

**السياسات** — lede (desktop): مجموعة السياسات المعتمدة التي تؤطر الممارسات الإدارية والتنظيمية وتعزز معايير الحوكمة داخل الاتحاد. *(tablet/mobile drop "داخل الاتحاد")*

| Breakpoint | Cards |
|---|---|
| Desktop | سياسة الخصوصية وحماية البيانات · سياسة حماية الرياضيين · سياسة تضارب المصالح |
| Tablet | سياسة تضارب المصالح · سياسة حماية الرياضيين · سياسة الخصوصية وحماية البيانات |
| Mobile | **سياسة حقوق الرياضيين** · سياسة الخصوصية وحماية البيانات · **سياسة المسؤولية المجتمعية ومكافحة الفساد** |

**Governance links** — H2: الحوكمة والاستراتيجية
Desktop/tablet (2): الخطة الاستراتيجية — استكشاف الأولويات الاستراتيجية للاتحاد وبرامج التطوير. · الرؤية والرسالة — التعرف على رؤية الاتحاد ورسالته وأهدافه.
Mobile adds a third: السياسات واللوائح — إطار تنظيمي يدعم الحوكمة الرشيدة.

### 3.2 English

**Hero** — **NOT EXTRACTED — no hero content exists at any EN breakpoint.**

**Intro** — H2: Governance & Regulation
Desktop: The UAE Athletics Federation is dedicated to nurturing a clear regulatory environment built upon transparency, integrity, and organizational efficacy, serving athletes, clubs, and state actors across the Emirates.
Tablet: …built upon transparency, integrity, and organizational efficacy. *(sentence truncated)*
Mobile: **Promoting absolute clarity, compliance, and procedural alignment in administrative and technical fields of athletics.** *(entirely different sentence)*

**Document Center** — H2: Document Center · placeholder: "Search in policies and regulations..." *(mobile: "Search documents...")*
Filters — desktop 6: All · Regulations · Policies · Guidelines · Forms · Decisions
Filters — tablet 4: All · Regulations · Policies · Guides
Filters — mobile 5: All · Regulations · Policies · Forms · Guides

**Regulations** — desktop lede: Technical, administrative, and sporting regulations governing UAE Athletics.

| Card | Desktop title / body |
|---|---|
| 1 | **UAEAF Athletics Federation Bylaws** — The fundamental bylaws managing administrative governance, meetings, and standard voting procedures of the UAEAF. |
| 2 | **Financial Regulations for Athletics Competitions** — Regulations for financial management of athletics events, including sponsorship, budgeting, and reporting requirements. |
| 3 | **Athletes Registration & Transfer Regulations** — Rules governing athlete registration, transfer eligibility, and club affiliation procedures within UAE athletics. |

*(Tablet and mobile use the title "UAEAF **Athletes** Federation Bylaws" and carry different body copy for all three cards.)*

**Policies** — desktop lede: Governance frameworks and ethical codes operational within the federation.

| Card | Desktop title | Desktop body | ⚠️ |
|---|---|---|---|
| 1 | Conflict of Interest Policy | "…ensuring athlete safety, ethical representation, and safeguarding protocols." | **body belongs to Athletes Protection** |
| 2 | Athletes Protection Policy | "…personal details, records protection, and user data privacy standards." | **body belongs to Privacy & Data Protection** |
| 3 | Privacy & Data Protection Policy | "…responsible community engagement, ethical partnerships, and anti-corruption practices…" | **body belongs to CSR & Anti-Corruption** |

Tablet/mobile policy titles: **Athletes Rights Policy** · Privacy & Data Protection Policy · **Corporate Social Responsibility & Anti-Corruption Policy** — and on those breakpoints the bodies match their titles correctly.

**Governance links** — H2 desktop: "Governance & Strategy Linkages" · tablet/mobile: "Governance & Strategy"
Desktop/tablet (2): Vision & Mission · Strategic Plan
Mobile (3): **Policies & Regulations** (self-link) · Strategic Plan · Vision & Mission

---

## 4. Structural AR-vs-EN differences

| # | Aspect | AR | EN |
|---|---|---|---|
| 1 | **Header master** | `Header (Approved Master Component)` 1440 × **95.41**, 9 RTL items, ☾/بحث/AR\|EN, logo 120 wide | Bespoke `Header` 1440 × **96**, 9 LTR items **with an active-state indicator**, ☾/Search 🔍/EN\|AR, logo 100 wide |
| 2 | **Hero availability** | Empty at desktop; **full content at tablet and mobile** | **Empty at all three breakpoints** |
| 3 | **Hero layout (where it exists)** | Tablet: image + text **side by side**. Mobile: image **stacked above** text | n/a |
| 4 | **Intro treatment** | Plain text block, right-offset at x 576 on desktop | **Boxed** container with 24px inner padding at x 64 |
| 5 | **Section dividers** | Real 1px `rounded-rectangle` dividers at desktop; `line` nodes at tablet/mobile | 0-height `line` nodes at desktop only; **no dividers** at tablet/mobile |
| 6 | **Desktop document card** | **Green-filled** card, white text, `--radius-lg`, dual shadow, badge on `#064e3b` | **White** card with a 4px green top accent, dark text, meta row with real version data |
| 7 | **Card meta content** | "الإصدار: -" / "آخر تحديث: -" — **placeholder dashes at every breakpoint** | "Version: 2026.1" / "Updated: Jan 2026" — real values |
| 8 | **Tablet grid strategy** | **2 + 1**: two half-width cards then one genuinely full-width card | **2 × 2** with a 365-wide card plus a 323-wide **invisible spacer** to fake the grid |
| 9 | **Card divider primitive** | `line` (0-height) at all breakpoints | `line` at desktop/mobile but a `rounded-rectangle` at tablet |
| 10 | **Governance link CTA** | "استكشف ←" text; mobile adds an `arrow-left` icon | "→" glyph inside the title row at all breakpoints |
| 11 | **Footer columns** | 4 / 4 (narrow) / 1 — always includes Contact, Map, Quick Links, Brand | 4 / **2** / **2** — tablet and mobile drop Quick Links **and** the Map entirely |
| 12 | **Footer contact rows** | `map-pin` vector icon | `map-pin` at desktop, **emoji 📍/📧** at tablet and mobile |
| 13 | **Footer decoration** | Four named brand swooshes per section | A single `FlagSwooshes` group, and only in the desktop footer |
| 14 | **Token binding** | 14 variables bound | **`{}` — zero variables bound** |

---

## 5. Defects

| ID | Sev | Node(s) | Defect | Evidence |
|---|---|---|---|---|
| PR-D01 | **P1** | `762:208`, `2757:2345`, `2757:2578`, `2757:2732` | **Empty hero frames — confirmed and broader than reported.** AR desktop (1440 × 420) and EN desktop (1440 × 420) are empty **as reported**; additionally **EN tablet (768 × 320) and EN mobile (375 × 139) are also empty**. The English page therefore has **no page title, breadcrumb or lede at any breakpoint**. Only AR tablet `2757:1948` and AR mobile `2757:2133` contain hero content. | `get_metadata` returns self-closing frames |
| PR-D02 | **P1** | `2757:2450`–`2757:2483` | **EN desktop policy card titles and bodies are off by one.** "Conflict of Interest Policy" carries the athlete-safeguarding body; "Athletes Protection Policy" carries the data-privacy body; "Privacy & Data Protection Policy" carries the CSR/anti-corruption body. The tablet and mobile frames pair them correctly, confirming desktop is the defective frame. | §3.2 |
| PR-D03 | **P1** | AR اللوائح / السياسات across breakpoints | **The document set itself changes by breakpoint.** Desktop lists "اللائحة الفنية"; tablet and mobile list "اللائحة المالية" instead. Mobile introduces "سياسة حقوق الرياضيين" and "سياسة المسؤولية المجتمعية ومكافحة الفساد", neither of which exists on desktop. Mobile also renames the bylaws to "اللائحة الأساسية **لاتحاد الرياضيين**". These are different documents, not different layouts. | §3.1 |
| PR-D04 | **P1** | `765:312`, `2757:2080`, `2757:2265`, `2757:2511`, `2757:2689`, `2757:2825` | **Every CTA frame is empty** at all six frames. CTA copy and button hierarchy are undefined. | self-closing frames |
| PR-D05 | **P2** | `2757:2443`, `2757:2459`, `2757:2475` | **EN desktop Policies cards are missing the `Green Accent` bar** that every Regulations card on the same page — and every card at tablet and mobile — carries. Visual inconsistency within one viewport. | metadata |
| PR-D06 | **P2** | `2704:1932` | **Orphan empty frame `Hero Image Overlay` (1440 × 420) sits at y = 0** on the AR desktop page, overlapping the 95.41px header. Purpose undefined; likely the intended hero image layer that was never populated or repositioned. | metadata |
| PR-D07 | **P2** | `2757:1971` vs `762:218` / `2757:2156` | **Filter taxonomy is inconsistent across AR breakpoints:** tablet offers **الأنظمة**, desktop and mobile offer **الأدلة**. In EN the count itself differs: 6 (desktop) / 4 (tablet) / 5 (mobile), and "Guidelines" becomes "Guides" below 1440. | metadata |
| PR-D08 | **P2** | `2772:1952` | **Filter row overflows its container on EN mobile.** The `Filters` frame is 311 wide but its last chip ("Guides", 69 wide) starts at x 315 — 73px outside the frame and 57px outside the 343 content column. | metadata |
| PR-D09 | **P2** | `2757:2308` | **EN desktop binds zero design tokens.** `get_variable_defs` returns `{}`. Every colour, radius and spacing value on the page is hardcoded. Direct violation of CLAUDE.md §16. | `get_variable_defs` |
| PR-D10 | **P2** | `2544:1217`, `2757:1997`, `2757:2976` | **Placeholder metadata shipped in the AR composition.** Every AR document card shows "الإصدار: -" and "آخر تحديث: -" at every breakpoint, while the EN cards carry real values ("Version: 2026.1", "Updated: Jan 2026"). | metadata |
| PR-D11 | **P2** | `2757:2173` vs `2544:1209` vs `2757:1988` | **Three different document-card masters for one component.** AR desktop = green-filled with an inset badge; AR tablet = white with a 288-wide inset accent bar; AR mobile = white with a full-bleed 343 × 4 top accent. Action labels also differ ("عرض الوثيقة" vs "عرض اللائحة" / "عرض السياسة") and the mobile actions row **reverses** the download/view order. | `get_design_context` |
| PR-D12 | **P2** | `2757:3024` | **Breadcrumb overflows its parent** on AR tablet: the 460-wide breadcrumb sits at x = −116 inside a 344-wide `Hero Text` frame. | metadata |
| PR-D13 | **P2** | `2757:2693`, `2757:2829` | **EN tablet and mobile footers drop Quick Links and the Map entirely**, keeping only Brand + Contact, while the AR footers retain all four blocks at every breakpoint. Legal strips also lose all links, and EN mobile truncates the copyright to "© 2026 UAE Athletics Federation." | metadata |
| PR-D14 | **P2** | `2757:2949` | **Self-referencing navigation.** The EN mobile Governance section links to "Policies & Regulations" — the page the user is already on. | metadata |
| PR-D15 | **P3** | `2757:2264` vs `2757:2079` | **Inconsistent CTA spacer:** 160px tall on AR mobile, 0.0001px on AR tablet. One of the two is unintentional. | metadata |
| PR-D16 | **P3** | `2757:2873`, `2757:2908` | **Invisible 323 × 1 spacer frames** used to pad the EN tablet grid rows instead of a real grid or gap rule. | metadata |
| PR-D17 | **P3** | `2757:2710`, `2757:2711`, `2757:2844` | **Emoji used as UI icons** (📍 📧) in EN tablet/mobile footers where the desktop uses a proper `map-pin` vector. Emoji are also used for the search glyph (🔍) at every breakpoint in both languages. | metadata |
| PR-D18 | **P3** | `2757:1984`, `2757:2024`, `2757:2169`, `2757:2209`, `2757:2249`, `2757:2064` | **Six top-level sections named only "Frame"** on the AR tablet and mobile pages, making the layer tree unreadable for handoff. | metadata |
| PR-D19 | **P3** | `2757:2617` etc. | **Body-copy line-height/size drift between EN breakpoints** for the same card: desktop bodies are 36 tall (2 lines), tablet 60 (3 lines), mobile 54. Combined with the differing sentences (§3.2) this is content drift, not reflow. | metadata |

---

## 6. Assets to export before access is lost

- `menu` (20px hamburger glyph, AR tablet/mobile), `map-pin`, `map-pin-icon`, `arrow-left` (16px)
- Social icons: `instagram`, `youtube`, `facebook`, `tiktok` (16px in a 32px button) — AR desktop only
- `UAEAF Logo (Vector)`, `UAEAF Logo (Vector - White)`
- `swoosh-decor` ×4 per section and the four named brand swooshes (rotations as on the Strategic Plan page)
- `FlagSwooshes` group `2757:2849` (Red / Green / White) — EN desktop footer only

**NOT EXTRACTED — hero photography.** `2757:3016` (AR tablet, 304 × 284) and `2757:2968` (AR mobile,
343 × 240) are image-fill frames. Source images must be recovered from the design team.

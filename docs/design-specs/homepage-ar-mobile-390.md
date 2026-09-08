# Homepage — AR / RTL — Mobile (390px) — Extracted Implementation Spec

| Field | Value |
|---|---|
| **Figma file key** | `hpO727vjwl18g3s3LTICAY` |
| **Node id** | `2374:2314` |
| **Frame name** | `Homepage - AR / RTL - Mobile (390px)` |
| **Frame size** | 390 × 6979 |
| **Extraction date** | 2026-09-07 |
| **Extraction method** | Figma MCP `get_metadata` (full tree) + `get_design_context` per section + `get_variable_defs` |

> ## ⚠️ THIS FILE IS NOW THE SOURCE OF TRUTH
> The UAEAF Figma subscription has lapsed. **Editing is permanently locked** and read access may stop at any moment.
> This document is the archival record of the **mobile design anchor (390px)**. It, together with
> `homepage-en-desktop-1440.md` and the approved AR desktop baseline (`2374:1174`, 1440px), is the only
> remaining basis for deriving the **tablet (768px) breakpoint in code**.
>
> Per project governance §1 (Source of Truth Hierarchy), this file records *observed Figma state*. Where an
> observed value conflicts with the Design System Framework, the conflict is flagged inline and **must be
> reported, not silently reconciled**. Nothing here has been rounded, normalised, or "corrected".
> Anything not obtainable is written as **NOT EXTRACTED — reason**.

---

## 0. Global facts

- **Viewport width:** 390px. **Total document height:** 6979px.
- **Direction:** RTL throughout. Every text node carries `dir="auto"`; text alignment is `right` unless
  explicitly `center` (noted per section).
- **Type family:** `Alexandria` for all Arabic and Latin product copy.
  Exceptions observed: `Inter` for the ☾ dark-mode glyph, the `›`/`‹` carousel arrows, the footer
  `IG / 𝕏 / YT / FB` social initials, the 📍 map pin, and the events "expand" link;
  `IBM Plex Mono Bold` for the `UAE ATHLETICS` broadcast wordmark.
- **Layout model:** the root frame is a **vertical stack of 15 absolutely-ordered full-bleed sections**, no
  gutters between sections. Section side padding is per-section (16px in most, 20px in Newsletter, 0 in the
  Results sub-section — see §7.1).

### 0.1 Variable / token bindings resolved on this frame

Returned by `get_variable_defs` on `2374:2314`. **Only these bindings exist on the mobile frame** — every
other value in this document is a raw literal in the Figma file, not a token reference.

| Token | Value |
|---|---|
| `--color-brand-primary` | `#00843d` |
| `--color-brand-black` | `#000000` |
| `--color-green-300` | `#3dad65` |
| `--color-green-400` | `#1a9448` |
| `--color-green-500` | `#00843d` |
| `--color-green-600` | `#006b31` |
| `--color-green-700` | `#005226` |
| `--color-gray-900` | `#21201c` |
| `--color-gray-950` | `#131210` |
| `--color-text-primary` | `#000000` |
| `--color-text-secondary` | `#616058` |
| `--color-text-inverse` | `#ffffff` |
| `--color-surface-base` | `#fdfcfb` |
| `--color-surface-sunken` | `#fafaf8` |
| `--color-surface-skeleton` | `#f5f4f1` |
| `--color-border-default` | `#e0dfdb` |
| `--color-border-strong` | `#757470` |
| `color/semantic/live` | `#c8102e` |
| `--color-semantic-medal-gold` | `#d4a017` |
| `--color-semantic-medal-silver` | `#9aa3ad` |
| `--color-semantic-medal-bronze` | `#b0703b` |
| `--space-2` | `8` |
| `--space-12` | `48` |
| `--typography-label-desktop` | `13` |
| `--typography-caption-desktop` | `13` |
| `--typography-subtitle-desktop` | `16` |
| `--typography-h2-desktop` | `32` |

**🔴 CRITICAL FINDING — no mobile typography tokens exist.**
The only typography variables bound anywhere on the 390px frame are the **`*-desktop`** ones above, and they
appear *only* inside the Results sub-section (§7.1) and the Events filter/category chips (§7.2). Every other
mobile font size (10–28px) is a **raw literal with no variable binding**. There is no
`--typography-*-mobile` scale in the file.
→ Classification: **DESIGN SYSTEM GAP** (per governance §16). A tablet scale cannot be interpolated
between "desktop token" and "mobile literal" without an owner decision on whether a mobile/tablet
typography scale is to be created. **Do not invent one.**

### 0.2 Colours used as raw literals (no token binding)

`#ffffff`, `#111`, `#595e69`, `#0f1115`, `#e5f5ec`, `#f6fcf9`, `#f5f5f5`, `#006b30`, `#9ca3af`, `#dee0e3`,
`#b0bec5`, `#262626`, `#1a1a1a`, `#070c08`, `#ffb800`, `#8a948d`, `#808080`, `#0b5fa5`, `#dc2626`, `#f97316`,
`rgba(0,0,0,0.55)`, `rgba(15,15,15,0.85)`, `rgba(255,255,255,0.9 / 0.85 / 0.65 / 0.5 / 0.14 / 0.12 / 0.1 / 0.08)`.
`#e5f5ec` (green tint) and `#f6fcf9` (table highlight row) recur across five sections and are strong
candidates for tokenisation — but creating them is **not authorised here**.

---

## 1. Section stacking order, offsets and heights

Absolute, in document order. `y` is the top offset within the 390 × 6979 root frame.

| # | Section | Node id | y | Height | Background |
|---|---|---|---|---|---|
| 1 | Mobile Header | `2374:2315` | 0 | 72 | `#ffffff` |
| 2 | Hero Section | `2374:2336` | 72 | 353 | photo + scrim |
| 3 | Sponsor Ticker Mobile | `2374:2375` | 425 | 75 | `#070c08` |
| 4 | Stats Section | `2374:2402` | 500 | 363 | `#ffffff` |
| 5 | Clubs Section | `2374:2438` | 863 | 225 | `#ffffff` |
| 6 | Athletes Section | `2374:2469` | 1088 | 537 | `#ffffff` |
| 7 | Results and Events Stack | `2374:2542` | 1625 | 1421 | (wrapper) |
| 7.1 | ├ Results Section | `2374:2543` | 1625 + 12 | 622 | transparent |
| 7.2 | └ Events Section | `2374:2602` | 1625 + 658 | 763 | `--color-surface-base` |
| 8 | News Section | `2374:2685` | 3046 | 729 | `#ffffff` |
| 9 | Media Section | `2374:2715` | 3775 | 421 | `#ffffff` |
| 10 | Sponsors Section | `2374:2740` | 4196 | 578 | `--color-surface-base` |
| 11 | Media Streams Section | `2374:2781` | 4774 | 515 | `#ffffff` |
| 12 | Media Centre Section | `2374:2807` | 5289 | 527 | `--color-gray-950` |
| 13 | Memberships Section | `2374:2833` | 5816 | 265 | `--color-surface-base` |
| 14 | Newsletter Section | `2374:2853` | 6081 | 195 | `--color-green-700` |
| 15 | Footer | `2374:2861` | 6276 | 703 | `--color-brand-black` |

Heights sum exactly to 6979 — **no gaps, no overlaps** between sections.

---

## 2. Mobile Header — `2374:2315`

**390 × 72.** Background `#ffffff`. Border: 1px solid `--color-border-default` (`#e0dfdb`).
Drop shadow `0 2px 4px rgba(0,0,0,0.08)`.
Layout: horizontal flex, `align-items:center`, `justify-content:space-between`, padding `12px 16px`.

Three groups, left → right in canvas coordinates:

| Element | Node | Position / size | Spec |
|---|---|---|---|
| **Left Actions** | `2374:2316` | x 16, y 24, 89 × 24 | horizontal flex, `gap: 12px` |
| ├ Mode Toggle ☾ | `2374:2317` / text `2374:2318` | 24 × 24 box; glyph 9 × 19 | `Inter Medium 16px`, colour `#1a1a1f`, centred, `overflow: clip` |
| ├ EN | `2374:2319` | x 36, 21 × 17 | `Alexandria Medium 14px`, `#1a1a1f` |
| └ search icon | `2374:2320` | x 69, 20 × 20 | exported SVG asset |
| **Centered Logo** | `2374:2322` | x 190, y 16, 75 × 40 | wrapper flex, centred |
| └ UAEAF Logo (Vector) | `2374:2323` | 75 × 40 | exported SVG — **do not redraw** |
| **Right Menu** | `2374:2333` | x 350, y 24, 24 × 24 | opens the drawer — see `mobile-nav-drawer-390.md` |
| └ menu icon | `2374:2334` | 24 × 24 | exported SVG (hamburger) |

**Δ vs desktop (`2374:1175`, 1440 × 95.407):** desktop is a three-part bar `Utilities · Nav (9 items) · Logo`
with the **full 9-item horizontal nav visible**. Mobile **drops the entire nav** into the hamburger drawer,
**centres the logo** (desktop logo is edge-aligned, 120 × 64), and collapses `AR | EN` + `بحث` + `☾` into
three 20–24px icon-scale controls. Desktop logo 120 × 64 → mobile 75 × 40.

---

## 3. Hero Section — `2374:2336`

**390 × 353**, y = 72. Root is a column flex, `items-end` (RTL). Contains four absolutely-placed layers.

### 3.1 Hero Image — `2374:2337`
Full-bleed 390 × 353 rounded-rectangle. Fill is a PNG placed with negative offsets
(`left: -31.69%`, `top: -0.1%`, `w: 131.66%`, `h: 87.55%`) inside an `overflow:hidden` box — i.e. the mobile
crop is a **zoomed, left-shifted crop of the desktop hero photo**, not a separate asset.
`pointer-events: none`.

### 3.2 Legibility Scrim — `2374:2338`
Vector, 390 × 411, `top: 9px` — **it is 58px taller than the hero and overflows the section bottom.**
Governed by Ch.4 §4.13 (text-legibility overlay). Flagged as an observed geometry state, not corrected.

### 3.3 Hero Overlaid Content — `2374:2339`
x 105, y 77, **276 × 214**; `bottom: 62px`, `left: 105px`, `right: 9px`.
Column flex, `items-end`, `gap: 12px`.

| Element | Node | Typography | Colour | Copy (verbatim AR) |
|---|---|---|---|---|
| Eyebrow | `2374:2340` | Alexandria **Bold 12px**, lh `normal`, nowrap | `--color-green-400` `#1a9448` | `الاتحاد الوطني الرسمي` |
| Headline | `2374:2341` | Alexandria **ExtraBold 24px**, lh `1.25` | `#111` (literal) | `حيث تلتقي الأمة بأبطالها` |
| Body | `2374:2342` | Alexandria **Regular 13px**, lh `1.4` | `#595e69` (literal) | `نطور ألعاب القوى من المواهب الناشئة إلى منصات التتويج الأولمبية والعالمية.` |

**Hero Actions** — `2374:2343`, 276 × 36, horizontal flex, `gap: 12px`, `justify-content: flex-end`:

| Element | Node | Spec | Copy |
|---|---|---|---|
| Secondary link | `2374:2344` | Alexandria SemiBold 13px, `#111`, text-right | `عن الاتحاد ←` |
| Primary Button | `2374:2345` | bg `--color-green-500` `#00843d`; padding `10px 16px`; **radius 6px**; 130 × 36 | — |
| └ Button label | `2374:2346` | Alexandria **Bold 13px**, `#ffffff`, centred | `جدول البطولات` |

**Carousel Dots** — `2374:2347`, 82 × 12, `top: 204px`, horizontally centred at `calc(50% - 36px)`.
Five dots at x = 0/16/32/58/74, all **8 × 8** except the **third which is 18 × 8** (active pill).
Flattened to a single SVG asset in the export.
→ **Mobile keeps all 5 hero slides** (dot count matches the desktop 5-slide carousel), but **only slide 1 is
composed**; there are no mobile slide 2–5 frames. Desktop `616:161` / `2374:1202` carries 5 slide frames with
slides 2–5 marked `HIDDEN` and `Media: PLACEHOLDER (no approved photography yet)`.

### 3.4 Social Media Sidebar (Fixed) — `2374:2353`
x **0** (flush to the **left** edge — correct RTL mirror; the desktop EN copy sits at x 1344, right edge),
y 85.5, **34 × 183**. Vertically centred (`top: calc(50% + 0.5px)`, `translateY(-50%)`).

- Background: linear gradient `rgba(0,0,0,0.8)` → `rgba(0,0,0,0.6)`, top→bottom.
- `backdrop-filter: blur(12px)`. Border 1px `rgba(0,132,61,0.2)`.
- Radius: **top-right 12px, bottom-right 12px only** (flat against the left screen edge).
- Drop shadow `0 10px 14px rgba(0,132,61,0.15)`. Padding `8px 5px`, `gap: 4px`, column, centred.

| Part | Node | Spec |
|---|---|---|
| Label Container | `2374:2354` | 11 × 27, `padding-bottom: 4px` |
| └ Arabic Label | `2374:2355` | rotated **−90°**, `Alexandria SemiBold 9px`, `--color-green-500`, centred. Copy: `تابعنا` |
| Icons Track | `2374:2356` | x 5, y 39, 24 × 136, column, `gap: 4px` |
| ├ Vertical Connector | `2374:2357` | 1.5 × 120 — **`hidden="true"` in Figma; do not render** |
| ├ Facebook | `2374:2358` | 24 × 24, radius 21, gradient `#1877f2 → #8b9bff (55%) → #1877f2`, shadow `0 6px 7px rgba(0,0,0,0.15)`; glyph 18 × 18 |
| ├ X | `2374:2361` | 24 × 24, radius 21, solid `#000000` + raster overlay, shadow `0 6px 14px -6px rgba(0,0,0,0.15)` |
| ├ Instagram (Active) | `2374:2362` | 24 × 24, radius 21, gradient `#405de6 → #c13584 (50%) → #fdaf31`, glow `0 0 5px rgba(0,205,95,0.2)`; glyph 18 × 18 |
| ├ TikTok | `2374:2365` | 24 × 24, flat SVG, no plate; vector 11.83 × 16 |
| └ YouTube | `2374:2367` | 24 × 24, radius 21, gradient `red → #ff3d00 (55%) → red`, shadow `0 6px 7px rgba(0,0,0,0.15)`; glyph 18 × 18 |

**Δ vs desktop:** desktop rail is **72 × 405** with **42 × 42** buttons, 58px pitch and a *visible* 2 × 228
vertical connector. Mobile is **34 × 183**, **24 × 24** buttons, 28px pitch, connector **hidden**.
Icon plate 42 → 24 is a **43% reduction**; this is the single most aggressive component down-scale on the page
and is the key data point for the tablet rail (an interpolation would land near 33px — **DESIGN DECISION
REQUIRED**, do not assume).

### 3.5 Next-Event Card — `2374:2370`
x 0, y 308, **390 × 45**, pinned to the hero bottom, full-bleed.
Background `rgba(15,15,15,0.85)`. `overflow: clip`, padding `12px 16px`, `justify-content: space-between`.

| Element | Node | Spec | Copy |
|---|---|---|---|
| Event Title + Location | `2374:2371` | Alexandria Medium **11px**, lh `1.5`, `rgba(255,255,255,0.9)`, `text-overflow: ellipsis`, `flex: 1` | `بطولة الإمارات الوطنية لألعاب القوى 2026 · مدينة زايد الرياضية، أبوظبي` |
| Countdown wrapper | `2374:2372` | horizontal flex, `gap: 6px`, `overflow: clip` | — |
| ├ Day Number | `2374:2373` | Alexandria **Bold 16px**, `#00843d` | `30` |
| └ Day Unit | `2374:2374` | Alexandria Regular 11px, lh `1.4`, `rgba(255,255,255,0.5)` | `يوماً` |

**Δ vs desktop:** desktop card is **1440 × 64**; mobile **390 × 45**. Desktop AR baseline contains **two
overlapping Next-Event Card instances** (`2374:1214`, `2374:1219`, both at y 705) — mobile correctly has one.

---

## 4. Sponsor Ticker Mobile — `2374:2375`

**390 × 75**, y = 425. Background `#070c08`. Border-top **and** border-bottom 1px `#ffb800`.
Column flex, centred.

- **Ambient Glow Overlay** `2374:2376`: **1440 × 112 at `top: -1px`** — the desktop-width overlay was
  **not resized for mobile**; it overflows the 390px viewport by 1050px.
  → Observed defect. Classification: **DESIGN DECISION REQUIRED** (clip to 390 or re-author the radial).
  The gradient is an inline SVG radial: `rgba(0,92,42,0.12157)` at centre → transparent at 80%,
  `gradientTransform: matrix(72 0 0 5.6 720 56)`.
- **Ticker Content Wrapper** `2374:2377`: 390 × 75, column, `gap: 8px`, centred, `padding-inline: 48px`.

### 4.1 Official Sponsor Centerpiece — `2374:2378`
x 25, 340 × 56. Background `rgba(255,184,0,0.1)`, border 1px `#ffb800`, **radius 8px**.
Padding `var(--space-2, 8px)` block / `var(--space-12, 48px)` inline — **the only place on the mobile frame
where spacing tokens are bound.** `gap: var(--space-2, 8px)`.

| Element | Node | Spec | Copy |
|---|---|---|---|
| Label row | `2374:2379` | flex, `gap: 4px`, 180 × 12 | — |
| ├ AR label | `2374:2380` | Alexandria **Bold 10px**, `#ffb800` | `الراعي الرسمي` |
| ├ Dot | `2374:2381` | 3 × 3 ellipse, `#ffb800` | — |
| └ EN label | `2374:2382` | Alexandria SemiBold 10px, `#ffb800`, `text-transform: uppercase` | `OFFICIAL SPONSOR` |
| Sponsor name | `2374:2383` | Alexandria **Black 16px**, `#ffffff`, uppercase, centred, 244 × 20 | `ULTIMATE POWER SOLUTION` |

### 4.2 All Sponsors Row — `2374:2384`
**x −64.5, width 519** inside a 390px frame — i.e. the row is **deliberately wider than the viewport and
horizontally overflowing on both sides**, clipped by `overflow: clip`. This is the marquee track.
Height 11. `gap: 8px`, centred. All items `Alexandria Medium 9px`.

- Sponsor names: `#8a948d`, `letter-spacing: 1px`.
- Separators `•`: `#808080`, no letter-spacing.
- Order (RTL reading, left→right in canvas): `ADNOC • Emirates NBD • Etisalat • Mubadala • Emirates • du • Nike • Adidas • Hublot` — **9 sponsors, 8 separators.**

**Δ vs desktop (`2374:1284`, 1440 × 112):** desktop splits the same 9 sponsors into `Sponsors Left` (5) and
`Sponsors Right` (4) **flanking** the centrepiece in one horizontal row, uses **11px uppercase** names with
**36 × 4 SVG divider bars** instead of `•` bullets, and no letter-spacing override. Mobile stacks
centrepiece-above-row, drops the divider bars for text bullets, and drops the type 11px → 9px.
**⚠️ 9px is below the 13px design-system minimum and is NOT covered by ADR-0041** (which is scoped only to
`CMP-CLUBCARD-001` crest labels and `CMP-AFFILIATIONS-001` captions). → **DESIGN DECISION REQUIRED.**

---

## 5. Stats Section — `2374:2402`

**390 × 363**, y = 500. Background `#ffffff`. Column flex, `items-end`, `gap: 16px`,
padding `32px top / 24px bottom`, no section-level side padding (children carry `px-16`).

### 5.1 Section Header — `2374:2403`
**201 × ~44**, `padding-inline: 16px`, `justify-content: space-between`, `items-end`.
Contains only `Titles` (`2374:2404`) — **there is no "view all" link in Stats on mobile.**

| Element | Node | Typography | Colour | Copy |
|---|---|---|---|---|
| Title | `2374:2405` | Alexandria **Bold 20px** | `--color-text-primary` | `الاتحاد بالأرقام` |
| Subtitle | `2374:2406` | Alexandria Regular **12px** | `--color-text-secondary` | `المصدر: سجل العضوية الرسمي` |

### 5.2 Stats Grid — `2374:2407` — **2 × 2, not 1 × 4**
Column flex, `gap: 12px`, `padding-inline: 16px`, full width.
`Row 1` (`2374:2408`) and `Row 2` (`2374:2423`), each horizontal flex `gap: 12px`, children `flex: 1 0 0`.

**Stat Card shared spec** (`2374:2409`, `2374:2416`, `2374:2424`, `2374:2431`):
- Background `--color-surface-base` `#fdfcfb`; border 1px `--color-border-default`; **radius 12px**.
- Padding **16px** all sides; column flex, `items-end`, `gap: 8px`.
- Row 1 `Badge + Icon` (`justify-content: space-between`, full width):
  - **Trend Indicator** pill — bg `#e5f5ec`, padding `2px 6px`, **radius 4px**,
    `Alexandria Bold 10px`, `--color-green-500`.
  - **Icon** — 20 × 20 exported SVG.
- **Value** — `Alexandria Black 28px`, `--color-text-primary`, nowrap.
- **Label** — `Alexandria SemiBold 13px`, `--color-text-primary`, text-right.

| Cell | Card node | Icon | Trend copy | Value | Label |
|---|---|---|---|---|---|
| R1-right | `2374:2409` | Award (`2374:2413`) | `+18 حاصد` | `186` | `ميدالية دولية` |
| R1-left | `2374:2416` | Trophy (`2374:2420`, inset `0 0 35% 0`) | `+4 بطولات` | `32` | `بطولة سنوية` |
| R2-right | `2374:2424` | User (`2374:2428`) | `+11% نمو` | `1,240+` | `رياضي مسجل` |
| R2-left | `2374:2431` | Users (`2374:2435`, inset `0 45% 55.56% 15%`) | `+3 أندية` | `48` | `نادي معتمد` |

**Δ vs desktop (`2374:1331`, 1440 × 569):** desktop is a **single row of 4 cards at 316 × 362 each** inside a
1312 × 362 grid, with a separate `Updated` timestamp frame (`2374:1333`, 198 × 34) in the head.
Mobile: **4 cards in 2 × 2**, card height collapses 362 → ~150, and the **`Updated` timestamp is dropped
entirely**; its information is folded into the 12px subtitle `المصدر: سجل العضوية الرسمي`.
Desktop also carries **4 decorative Swoosh vectors** (`2737:2`–`2737:5`) — **absent on mobile.**

---

## 6. Clubs Section — `2374:2438`

**390 × 225**, y = 863. Background `#ffffff`. Column flex, `items-end`, `gap: 16px`,
padding `12px top / 24px bottom`.

### 6.1 Section Header — `2374:2439`
Full width, `padding-inline: 16px`, `justify-content: space-between`, `items-end`.

| Element | Node | Spec | Copy |
|---|---|---|---|
| View-all link | `2374:2440` | Alexandria SemiBold **13px**, `--color-green-500` | `عرض الكل +` |
| Title | `2374:2442` | Alexandria Bold **20px**, `--color-text-primary` | `الأندية الأعضاء` |
| Subtitle | `2374:2443` | Alexandria Regular **12px**, `--color-text-secondary` | `الأندية الرياضية الوطنية الممثلة للاتحاد` |

### 6.2 Club Marquee Mobile — `2374:2444`
Horizontal flex, `gap: 12px`, **`padding-left: 16px` only** (no right padding — the track bleeds off the
right/RTL-trailing edge as the continuation cue). `overflow: clip`, full width.

**Club Card Mobile** — 3 cards rendered, **not 8**:

| Card | Node | Crest colour | Icon | City label | Club name | State |
|---|---|---|---|---|---|---|
| 1 | `2374:2445` | `#0b5fa5` | `activity` (`2374:2449`) | `دبي` | `نادي دبي لألعاب القوى` | full opacity |
| 2 | `2374:2453` | `#dc2626` | `landmark` (`2374:2457`) | `أبوظبي` | `نادي أبوظبي الرياضي` | full opacity |
| 3 | `2374:2461` | `#f97316` | `zap` (`2374:2465`) | `الشارقة` | `نادي الشارقة لألعاب القوى` | **`opacity: 0.65`** — "Partial", the peek/continuation card |

Shared card spec:
- **120 × 130**, border 1px `--color-brand-primary` `#00843d`, **radius 16px**, `overflow: clip`,
  shadow `0 6px 16px -6px rgba(0,0,0,0.07)`.
- Background: cover photo + overlay gradient `rgba(0,0,0,0)` → `rgba(0,0,0,0.8)` top→bottom.
- `content` (`2374:2446` etc.): padding **12px**, column, centred, `gap: 10px`, `flex: 1`.
- `club-crest`: **56 × 56**, bg `#ffffff`, border 1px `rgba(255,255,255,0.2)`, radius 28,
  shadow `0 6px 7px rgba(0,0,0,0.15)`.
- `shield`: **48 × 48**, entity colour fill, border 1px `rgba(255,255,255,0.15)`, radius 24.
  *(G.13 — entity badge colour is confined to the crest asset.)*
- Icon inside shield: **22 × 22**.
- **City label:** `Alexandria Bold 8px`, `#ffffff`, centred, absolutely positioned `bottom: 13px`,
  `left: 50%`, `translate(-50%, 100%)`.
- Club name: `Alexandria Bold 12px`, `#ffffff`, centred, wraps.

**🔴 R8 / ADR-0041 note:** the desktop crest city-name exception is documented at **8.944px**. The mobile
crest label is **8px** — a *different* value, and ADR-0041 (Ch.4 §4.15b) as written covers the
`CMP-CLUBCARD-001` crest-circle label without stating a mobile value.
→ Classification: **DESIGN DECISION REQUIRED** — confirm whether ADR-0041 extends to the 8px mobile
variant or whether a separate value must be recorded. Do not normalise to 13px (the crest cannot hold it).

**Δ vs desktop (`2374:1435`, 1440 × 329.1):** desktop marquee is **1312 wide with 8 club cards at
174.9 × 143.1**, plus `Fade Left` **and** `Fade Right` gradient masks (79.5 × 143.1 each), plus 4 Swoosh
vectors (`2737:6`–`2737:9`). Mobile: **3 cards at 120 × 130**, **no fade masks at all** (replaced by the
0.65-opacity third card), **no swooshes**. Crest 63.6 → 56; shield 55.65 → 48; icon 25.84 → 22.

---

## 7. Results and Events Stack — `2374:2542`

Wrapper, **390 × 1421**, y = 1625. Two stacked sub-sections. This is the tallest block on the page.

### 7.1 Results Section — `2374:2543` — **390 × 622**, y-offset 12 within the stack

Column flex, `items-end`, `gap: 16px`.
**⚠️ This sub-section has NO horizontal padding.** All children are `x = 0, width = 390`, so the tabs, badges
and table run edge-to-edge, unlike every other mobile section (16px). Recorded as observed;
**flagged as a probable spacing-rhythm defect — DESIGN DECISION REQUIRED**, not corrected here.

**Tabs** — `2374:2544`, 390 × 37, horizontal flex `gap: 8px`, `justify-content: flex-end`:

| Tab | Node | Spec | Copy |
|---|---|---|---|
| Inactive | `2374:2545` | bg `--color-surface-base`, border 1px `--color-border-default`, radius **9999px**, padding `10px 16px` | `الترتيب الوطني` |
| **Active** | `2374:2547` | same + border `--color-brand-primary`; underline bar `2374:2548`: 2px tall, `--color-brand-primary`, `bottom:-1px; left:-1px; right:-1px` | `أحدث النتائج` |

Both labels: **`Type/Label`** → `Alexandria Medium`, `var(--typography-label-desktop, 13px)`, lh `1.3`,
ls 0, `--color-text-primary`.

**Head Text** — `2374:2550`, column, `gap: 6px`, full width, text-right:

| Element | Node | Style token | Copy |
|---|---|---|---|
| H2 | `2374:2551` | **`Type/H2`** → Alexandria Bold, `var(--typography-h2-desktop, 32px)`, lh `1.25`, `--color-text-primary` | `النتائج والترتيب الوطني` |
| Caption | `2374:2552` | **`Type/Caption`** → Alexandria Regular, `var(--typography-caption-desktop, 13px)`, lh `1.4`, `--color-text-secondary` | `البطولة الوطنية للناشئين · دبي، 12 يوليو 2026` |

**🔴 CRITICAL — unscaled desktop H2 on a 390px viewport.** This heading is bound to
`--typography-h2-desktop = 32px` **with no mobile override**, while every other mobile section heading is a
raw **20px**. Either this section was not adapted, or a token-scaling mechanism is expected at build time.
→ **DESIGN DECISION REQUIRED / DESIGN SYSTEM GAP.** Do not silently render it at 20px, and do not silently
render 32px — report the conflict per governance §1 and §24.

**Badges** — `2374:2553`, full width, `justify-content: space-between`:
- `2374:2554` — `Type/Label`, `--color-brand-primary`. Copy: `عرض الكل +`
- `Official` pill `2374:2555` — bg `#e5f5ec`, radius 9999, padding `6px 12px`,
  `Type/Label`, `--color-brand-primary`. Copy: `✓ نتائج معتمدة رسميًا`

**Table** — `2374:2557`, 390 × 411. bg `--color-surface-base`, **radius 16px**, `overflow: clip`,
border-bottom 1px `--color-border-default`.

- **Header Row** `2374:2558` — bg `#f5f5f5`, padding `12px 16px`, `gap: 12px`,
  `Type/Label` in `--color-text-secondary`. **Two columns only:**
  `الزمن (ث)` (`2374:2559`, w 72) · `الرياضي` (`2374:2560`, w 196).
  → The rank column has **no header cell**; the rank badge sits in the row without a labelled column.
- **5 data rows**, each padding `14px 16px`, `gap: 12px`, border-top 1px `--color-border-default`:

| Row | Node | Row bg | Time (Alexandria **Black 18px**, w 72) | Athlete name (`Type/Subtitle`, 16px) | Meta (`Type/Caption`, 13px) | Rank badge 32 × 32, radius 9999 |
|---|---|---|---|---|---|---|
| 1 | `2374:2561` | `#f6fcf9` | `11.28` | `سارة الكعبي` | `عدو 100 م · نادي دبي لألعاب القوى` | gold `--color-semantic-medal-gold`, digit `1`, `Alexandria Bold 13px`, `--color-text-primary` |
| 2 | `2374:2573` | `--color-surface-base` | `11.41` | `مريم الشامسي` | `عدو 100 م · نادي الشارقة لألعاب القوى` | silver `--color-semantic-medal-silver`, `2` |
| 3 | `2374:2580` | `--color-surface-base` | `11.63` | `فاطمة الزعابي` | `عدو 100 م · نادي العين` | bronze `--color-semantic-medal-bronze`, `3` |
| 4 | `2374:2587` | `--color-surface-base` | `11.75` | `هند البلوشي` | `عدو 100 م · نادي أبوظبي الرياضي` | `--color-surface-skeleton`, `4`, text `--color-text-secondary` |
| 5 | `2374:2594` | `--color-surface-base` | `11.90` | `نورة المرزوقي` | `عدو 100 م · نادي عجمان الرياضي` | `--color-surface-skeleton`, `5`, text `--color-text-secondary` |

Row 1 carries two extra tags in its `NameRow` (`2374:2564`), `gap: 8px`:
- `Tag - رقم وطني` (`2374:2565`) — bg `--color-brand-primary`, radius **4px**, padding `2px 8px`,
  `Alexandria Bold 12px`, text `--color-surface-base`. Copy: `رقم وطني`
- `Tag - PB` (`2374:2567`) — bg `#e5f5ec`, radius **9999px**, padding `2px 8px`,
  `Alexandria Bold 12px`, `#006b30`. Copy: `PB`

**Download link** — `2374:2601`, x 224, y 605, 166 × 17. `Type/Label`, `--color-brand-primary`.
Copy: `⬇ تحميل ملف النتائج (PDF)`

### 7.2 Events Section — `2374:2602` — **390 × 763**, y-offset 658 within the stack

Background `--color-surface-base`. Column flex, `items-end`, `gap: 16px`, padding **`24px 16px`**.

**Section Header** `2374:2603` (358 × 44), column, `gap: 4px`:
- `2374:2604` — Alexandria **Bold 20px**, `--color-text-primary`. Copy: `جدول الفعاليات القادمة`
- `2374:2605` — Alexandria Regular **13px**, `--color-text-secondary`. Copy: `الجدول الرسمي المعتمد حتى نهاية 2026`

**Live Event Card** — `2374:2606`, 358 × **188**. bg `--color-surface-base`,
border **1.5px** `--color-green-500`, **radius 16px**, `overflow: clip`, column, `items-end`, `gap: 10px`.

- **Live Broadcast Frame** `2374:2607` — bg `--color-brand-black`, padding `10px 16px`, space-between:
  - **Live Stream Pill** `2374:2608` — bg `color/semantic/live` `#c8102e`, radius **4px**, padding `2px 8px`,
    `gap: 4px`; 6 × 6 dot ellipse + `Alexandria Bold 10px` white. Copy: `مباشر`
  - `2374:2611` — **`IBM Plex Mono Bold 11px`**, white. Copy: `UAE ATHLETICS`
- **Live Event Content** `2374:2612` — padding 12px, column, `items-end`, `gap: 10px`:
  - Title `2374:2613` — Alexandria **Bold 15px**, `--color-text-primary`. Copy: `بطولة الإمارات لألعاب القوى 2026`
  - **Location & Date row** `2374:2614`, `gap: 8px`:
    - **Badge Date** `2374:2615` — **48 × 48**, bg `--color-green-500`, **radius 8px**, column centred:
      `15` (Alexandria **ExtraBold 16px**, white) over `أغسطس` (Alexandria **Bold 10px**, white).
    - Two-line meta `2374:2618` — Alexandria Regular **11px**, `--color-text-secondary`, text-right:
      line 1 `📍 استاد حمدان بن محمد · دبي`, line 2 `≡ 22 مسابقة معتمدة`.
  - **Action Row** `2374:2619` → **Live Results Btn** `2374:2620` — **full width** (`flex: 1`),
    bg `--color-green-500`, **radius 8px**, padding `8px 16px`, centred,
    `Alexandria Bold 13px` white. Copy: `تابع النتائج المباشرة ←`

**Filters** — `2374:2622`, 358 × 44, horizontal flex `gap: 8px`, `justify-content: flex-end`,
`overflow: clip` (horizontally scrollable). Four chips, all radius **9999px**, padding **`11px 16px`**,
label `Type/Label` (`var(--typography-label-desktop, 13px)`, lh 1.3):

| Chip | Node | Style | Copy |
|---|---|---|---|
| `2374:2623` | inactive | bg `#ffffff`, border 1px `--color-border-default`, text `--color-text-primary` | `تصفيات` |
| `2374:2625` | inactive | — | `دولي` |
| `2374:2627` | inactive | — | `وطني` |
| `2374:2629` | **active** | bg `#e5f5ec`, border 1px `--color-brand-primary`, text `--color-brand-primary` | `الكل` |

**Events List** — `2374:2631`, 358 × **359**. bg `--color-surface-base`, border 1px
`--color-border-default`, **radius 16px**, `overflow: clip`. **5 Event Rows**, each padding `10px 16px`,
`gap: 12px`, border-bottom 1px `--color-border-default` (**last row `border-0`**).

Row anatomy:
- **Date block** — **44 × 44**, bg + border `--color-green-600` `#006b31`, **radius 8px**, column centred:
  day `Alexandria Black 14px` white, month `Alexandria Bold 11px` white.
- **Info** — column `gap: 2px`, `flex: 1`, `overflow: clip`:
  title `Alexandria Bold 13px` `--color-text-primary`; meta `Alexandria Regular 11px` lh `1.4`
  `--color-text-secondary`.
- **Cat pill** — bg `--color-green-600`, radius **9999px**, padding `4px 12px`,
  `Type/Label` (13px) white.

| # | Node | Date | Title | Meta | Cat |
|---|---|---|---|---|---|
| 1 | `2374:2632` | `15 أغسطس` | `البطولة الوطنية للناشئين` | `استاد دبي الرياضي · دبي · 16:00 · 18 مسابقة` | `وطني` |
| 2 | `2374:2642` | `20 سبتمبر` | `تصفيات البطولة الآسيوية` | `استاد هزاع بن زايد · العين · 15:00 · 12 مسابقة` | `تصفيات` |
| 3 | `2374:2652` | `05 نوفمبر` | `الماراثون الوطني السنوي` | `كورنيش الشارقة · الشارقة` | `وطني` |
| 4 | `2374:2662` | `10 أكتوبر` | `بطولة الخليج لألعاب القوى` | `استاد خليفة الدولي · الدوحة` | `دولي` |
| 5 | `2374:2672` | `02 سبتمبر` | `البطولة الوطنية المفتوحة` (preceded by a **`التالية` pill** `2374:2678`: bg `--color-green-600`, radius 9999, padding `2px 8px`, Alexandria Bold 11px white) | `مدينة زايد الرياضية · أبوظبي · 17:30 · 22 مسابقة` | `وطني` |

**Expand link** — `2374:2684`, 358 × 16, **`Inter SemiBold 13px`** (not Alexandria — observed inconsistency),
`--color-text-secondary`, **centred**. Copy: `عرض بقية الجدول (2) ⌄`

**Δ vs desktop (`2374:1614`, 1440 × 913):** desktop places Results (`2374:1615`, 614 wide) and Events
(`2374:1685`, 676 wide) **side by side** in a two-column split. Mobile **stacks them vertically, Results
first**. Desktop events `Filters` row is **57.6** tall vs mobile 44; desktop `Events List` is 676 × 377.6 vs
mobile 358 × 359 (same 5 rows). Desktop carries 2 Swooshes (`2737:14`, `2737:15`) — absent on mobile.
**IA note (governance §11): Events and Tournaments remain distinct; the mobile Events teaser links onward to
the deeper schedule. This is not an IA defect.**

---

## 8. News Section — `2374:2685`

**390 × 729**, y = 3046. Background `#ffffff`. Column, `items-end`, `gap: 16px`,
padding `12px top / 32px bottom`.

**Section Header** `2374:2686` — full width, `padding-inline: 16px`, space-between, `items-end`:
- Link `2374:2687` — Alexandria SemiBold **13px**, `--color-green-500`. Copy: `عرض كل الأخبار`
- Title `2374:2689` — Alexandria Bold **20px**, `--color-text-primary`. Copy: `آخر الأخبار والمقالات`
- Subtitle `2374:2690` — Alexandria Regular **12px**, `--color-text-secondary`. Copy: `التغطية الرسمية للاتحاد`

**News Grid Stack Mobile** `2374:2691` — column, `gap: 16px`, `padding-inline: 16px`.

### 8.1 Lead Article Card Mobile — `2374:2692`
Full width. bg `--color-surface-base`, border 1px `--color-border-default`, **radius 16px**, `overflow: clip`.
- **Lead Image** `2374:2693` — full width × **180**, `object-fit: cover`.
- **Lead Card Body** `2374:2694` — padding **16px**, column, `gap: 8px`, text-right:

| Element | Node | Typography | Colour | Copy |
|---|---|---|---|---|
| Kicker | `2374:2695` | Alexandria SemiBold **11px** | `--color-green-500` | `المنتخب الوطني` |
| Headline | `2374:2696` | Alexandria **Bold 16px**, lh `1.3` | `--color-text-primary` | `اتحاد الإمارات لألعاب القوى يعلن عن تشكيلة من 24 لاعبًا لبطولة آسيا` |
| Dek | `2374:2697` | Alexandria Regular **12px**, lh `1.5` | `--color-text-secondary` | `أكد الاتحاد أقوى تشكيلة له منذ عقد، بقيادة حاملي الأرقام القياسية الوطنية استعدادًا لبطولة آسيا لألعاب القوى المقبلة في بانكوك.` |
| Byline | `2374:2698` | Alexandria Regular **11px** | `--color-text-secondary` | `12 ديسمبر 2026 · قراءة 4 دقائق` |

### 8.2 News List Mobile — `2374:2699` — **3 items**
Column, `gap: 12px`. Each item: bg `--color-surface-base`, border 1px `--color-border-default`,
**radius 12px**, padding **8px**, horizontal flex `gap: 12px`, `items-center`.
- **Thumbnail** — **80 × 60**, radius 8px, `object-fit: cover`.
- **Info** — column `gap: 4px`, `flex: 1`, text-right:
  kicker `Alexandria SemiBold 10px` `--color-green-500`;
  headline `Alexandria Bold 12px` `--color-text-primary`, `text-overflow: ellipsis`.

| # | Node | Thumb | Kicker | Headline |
|---|---|---|---|---|
| 1 | `2374:2700` | `2374:2701` | `التدريب` | `انطلاق معسكر تدريبي وطني في المركز الجديد للأداء العالي بأبوظبي` |
| 2 | `2374:2705` | `2374:2706` | `الناشئين` | `أكثر من 1200 طالب يتنافسون في برنامج الاتحاد لألعاب القوى` |
| 3 | `2374:2710` | `2374:2711` | `دولي` | `النعيمي تحطم الرقم القياسي لـ100م في الدوري الماسي` |

**Δ vs desktop (`2374:1887`, 1440 × 857.6):** desktop `News Layout` is a **two-column 644 + 644 split** —
`News List` (5 items) beside `Lead Article` (533 tall). Mobile **stacks lead-above-list** and **drops the list
from 5 items to 3**. Mobile list items also drop the dek and byline that desktop list rows carry.
Desktop has 4 Swooshes (`2737:16`–`2737:19`) — absent on mobile.

---

## 9. Media Section ("UAEAF in the Media") — `2374:2715`

**390 × 421**, y = 3775. Background `#ffffff`. Column, `items-end`, `gap: 16px`,
padding **`32px top / 24px bottom / 16px sides`**.

**Section Header** `2374:2716` — space-between, `items-end`:
- Link `2374:2717` — Alexandria SemiBold **13px**, `--color-brand-primary`. Copy: `عرض الكل ←`
- Title `2374:2719` — Alexandria Bold **20px**, `--color-text-primary`. Copy: `الاتحاد في الإعلام`
- Subtitle `2374:2720` — Alexandria Regular **11px**, `--color-text-secondary`. Copy: `تغطية إعلامية مستقلة لمسيرة الاتحاد`

**Media Horizontal Track** `2374:2721` — despite the name, on mobile it is a **vertical column**,
`gap: 16px`, full width. **2 cards, not 4.**

Card spec (`2374:2722`, `2374:2731`): bg `--color-surface-base`, border 1px `--color-border-default`,
**radius 12px**, `overflow: clip`, **horizontal** flex (image beside body).
- **Article Image** — **120 × 120 square**, `object-fit: cover`.
- **Card Body** — padding **12px**, column, `gap: 8px`, `flex: 1`, text-right:
  - Publication — `Alexandria SemiBold 11px`, `--color-green-600`.
  - Headline — `Alexandria Bold 13px`, **line-height `18px` (absolute, not unitless)**,
    `--color-text-primary`, ellipsis.
  - Dek — `Alexandria Regular 11px`, **line-height `16px` (absolute)**, `--color-text-secondary`, ellipsis.
  - **Footer** — `padding-top: 4px`, space-between, both 11px:
    link `Alexandria SemiBold`, `--color-brand-primary`; date `Alexandria Regular`, `--color-text-secondary`.

| Card | Node | Publication | Headline | Dek | Link | Date | State |
|---|---|---|---|---|---|---|---|
| 1 | `2374:2722` | `سبورت 360 عربية` | `كيف تحول الجري إلى ظاهرة وطنية في الإمارات` | `نظرة على المبادرات التي غيّرت مشهد الرياضة المحلية.` | `↗ قراءة المقال` | `1 ديسمبر 2026` | full |
| 2 | `2374:2731` | `وكالة أنباء الإمارات (وام)` | `الإمارات تستعد لاستضافة بطولة آسيا لألعاب القوى` | `استعدادات متقدمة لاستقبال أبطال القارة في أبوظبي.` | `↗ قراءة المقال` | `6 ديسمبر 2026` | **`opacity: 0.70`** (continuation cue) |

**Δ vs desktop (`2374:1932`, 1440 × 614):** desktop is a **4-card horizontal carousel** of
**326 × 320 vertical** cards (image 326 × 140 on top), plus an **80 × 320 Edge Fade** (`2374:1966`) and a
**Carousel Controls** cluster (`2374:1967`: prev arrow 36 × 36, 68 × 8 pagination dots, next arrow 39 × 36).
Mobile: **2 cards, re-oriented to horizontal 120px-thumb rows, no edge fade, and no carousel controls at
all** — the second card's 0.70 opacity is the only affordance. Card count 4 → 2.
Desktop carries 4 Swooshes (`2737:20`–`2737:23`) — absent on mobile.

---

## 10. Sponsors Section — `2374:2740`

**390 × 578**, y = 4196. Background `--color-surface-base`. Column, `items-end`, `gap: 16px`,
padding **`24px 16px`**.

**Section Header** `2374:2741` — column, `gap: 4px`, full width:
- Title `2374:2742` — Alexandria Bold **20px**, `--color-text-primary`. Copy: `الرعاة والشركاء الرسميون`
- Subtitle `2374:2743` — Alexandria Regular **11px**, `--color-text-secondary`. Copy: `شراكات استراتيجية لبناء جيل الغد الرياضي`

**Stats Row** `2374:2744` — horizontal, `gap: 12px`, 3 equal items (`flex: 1 0 0`).
Each: bg `--color-surface-sunken` `#fafaf8`, **radius 8px**, padding **12px**, column, centred, `gap: 4px`.
- Value — `Alexandria Black 20px`, `--color-brand-primary`.
- Label — `Alexandria Regular 10px`, `--color-text-secondary`.

| Item | Node | Value | Label |
|---|---|---|---|
| 1 | `2374:2745` | `8` | `شركاء رسميين` |
| 2 | `2374:2748` | `10+` | `شراكة مستمرة` |
| 3 | `2374:2751` | `32` | `بطولة مدعومة` |

**Strategic Sponsor Card** `2374:2754` — **358 × 140** (explicit fixed width, not `w-full`).
Border 1px `--color-green-500`, **radius 12px**, `overflow: clip`, padding **16px**, `gap: 16px`,
`items-center`. Background: cover photo + **`rgba(0,0,0,0.75)`** scrim.
- **Sponsor Info** `2374:2755` — column, `items-end`, `gap: 8px`, `flex: 1`:
  - **VIP Badge** `2374:2756` — bg `--color-green-500`, **radius 100px**, padding `4px 10px`,
    `Alexandria Bold 10px`, text `--color-gray-950` `#131210`. Copy: `الشريك الاستراتيجي`
  - Name `2374:2759` — `Alexandria ExtraBold 18px`, `--color-text-inverse`. Copy: `Ultimate Power Solution`
  - Tagline `2374:2760` — `Alexandria Regular 11px`, `#b0bec5`. Copy: `Leaders in Power Generation & Logistics Solutions`
  - **Accent Line** `2374:2761` — 40 × 2, bg `--color-green-500`, radius 1px.
- **Logo Plate** `2374:2762` — **90 × 90**, bg `#ffffff`, **radius 12px**, padding 8px, centred;
  logo `2374:2763` 74 × 74, radius 8px, `object-fit: contain`.

**Sponsor Grid** `2374:2764` — `flex-wrap: wrap`, `gap: 8px`, full width. **6 placeholder tiles**
(`2374:2765`, `…2767`, `…2769`, `…2771`, `…2773`, `…2775`), each **114 × 80**, radius 8px, padding 8px,
centred, with a `contain`-fitted image plus caption `Alexandria SemiBold 10px`, `--color-text-secondary`.
Captions are literal placeholders: `راعٍ رسمي 1` … `راعٍ رسمي 6`.
→ **Content gap: these are un-filled placeholders, not real sponsor logos.**

**Partner CTA** `2374:2777` — border 1px `--color-border-default`, **radius 8px**, padding **12px**,
`gap: 12px`, `items-center`, full width:
- Button `2374:2778` — bg `--color-brand-primary`, **radius 6px**, padding `8px 12px`,
  `Alexandria SemiBold 11px`, text `--color-surface-base`. Copy: `انضم إلينا`
- Text `2374:2780` — `Alexandria SemiBold 11px`, `--color-text-primary`, `flex: 1`, text-right.
  Copy: `كن شريك النجاح لدعم ألعاب القوى الوطنية`

**Δ vs desktop (`2374:1977`, 1440 × 907):** desktop `Inner` is **1360 wide** (note: *not* the usual 1312
container — see the EN diff doc, where the EN equivalent is 1312). Desktop blocks:
`Head` 1360 × 66 → `Partner Stats` 1360 × 80 → `strategic-sponsor-card` 1360 × **208** →
`Sponsor Strip` 1360 × 212 → `Partner CTA` 1360 × 165. Mobile keeps all five blocks in the same order but
re-lays them: stats 3-across stays 3-across; strategic card 208 → 140 tall; the desktop `Sponsor Strip`
becomes a **wrapping 2-per-row 6-tile grid**; CTA 165 → ~60 tall (horizontal instead of stacked).
Desktop has 2 Swooshes (`2737:24`, `2737:25`) — absent on mobile.

---

## 11. Media Streams Section (Live Stream & Videos) — `2374:2781`

**390 × 515**, y = 4774. Background `#ffffff`. Column, `items-end`, `gap: **20px**`,
padding **`24px 16px`**.

### 11.1 Live Stream Column — `2374:2782` (column, `gap: 12px`)
**Live Header** `2374:2783` — space-between, `items-end`:
- **Live Badge** `2374:2784` — bg `color/semantic/live` `#c8102e`, **radius 4px**, padding `2px 8px`,
  `Alexandria Bold 10px` white. Copy: `مباشر`
- Heading `2374:2786` — `Alexandria Bold 18px`, `--color-text-primary`. Copy: `البث المباشر`

**Main Player Card** `2374:2787` — bg `--color-surface-base`, border 1px `--color-border-default`,
**radius 12px**, `overflow: clip`:
- **Video Frame** `2374:2788` — full width × **180**, cover photo + **`rgba(0,0,0,0.3)`** overlay.
  **No play button is present on the mobile player card.**
- **Stream Info** `2374:2789` — padding 12px, column, `gap: 4px`, text-right:
  - Title `2374:2790` — `Alexandria Bold 13px`, `--color-text-primary`. Copy: `بطولة الإمارات الوطنية لألعاب القوى 2026`
  - Meta `2374:2791` — `Alexandria Regular 11px`, `--color-text-secondary`. Copy: `مدينة زايد الرياضية، أبوظبي · مباشر الآن`

### 11.2 Video Library Subsection — `2374:2792` (column, `gap: 12px`)
**Library Header** `2374:2793` — space-between, `items-end`:
- Link `2374:2794` — `Alexandria SemiBold 12px`, `--color-brand-primary`. Copy: `عرض كل الفيديوهات ←`
- Heading `2374:2795` — `Alexandria Bold 18px`, `--color-text-primary`. Copy: `مكتبة الفيديو`

**Library Video Grid** `2374:2796` — column, `gap: 10px`. **2 rows.**
Each row: bg `--color-surface-base`, border 1px `--color-border-default`, **radius 8px**, padding **8px**,
horizontal, `gap: 10px`, `items-center`.
- **Text Block** — column `gap: 4px`, `flex: 1`, text-right:
  title `Alexandria Bold 12px` `--color-text-primary`; duration `Alexandria Regular 10px` `--color-text-secondary`.
- **Video Mini Thumbnail** — **80 × 50**, radius 4px, cover.

| # | Node | Title | Duration |
|---|---|---|---|
| 1 | `2374:2797` | `أبرز لقطات رمي الرمح - الحمادي` | `مدة: 2:45` |
| 2 | `2374:2802` | `نهائي 100م سيدات - الرقم القياسي` | `مدة: 1:30` |

**Δ vs desktop (`2374:2052`, 1440 × 710):** desktop is a **two-column 624 + 624 split**
(`Video Library Column` 624 × 551.9 beside `Live Streaming Column` 624 × 582). Mobile **stacks them,
live-stream first** — i.e. the mobile order is the *reverse* of the desktop RTL layer order.
Desktop has 2 Swooshes (`2737:26`, `2737:27`) — absent on mobile.

---

## 12. Media Centre Section (Photo Gallery) — `2374:2807`

**390 × 527**, y = 5289. Background **`--color-gray-950` `#131210`** (dark section).
Column, `items-end`, `gap: 16px`, padding **16px** all sides.

**Section Header** `2374:2808` — space-between, `items-end`:
- Link `2374:2809` — `Alexandria SemiBold 13px`, **`--color-green-300` `#3dad65`** (the on-dark green).
  Copy: `عرض كل الصور ←`
- Title `2374:2811` — `Alexandria Bold 20px`, `--color-text-inverse`. Copy: `معرض الصور`
- Subtitle `2374:2812` — `Alexandria Regular 11px`, `#b0bec5`. Copy: `توثيق لحظات المجد الرياضي`

**Gallery Grid Mobile** `2374:2813` — `flex-wrap: wrap`, `gap: 8px`, full width → **2 × 2 of 4 cards**.
Card spec (`2374:2814`, `…2818`, `…2822`, `…2826`): **175 × 180**, bg `--color-surface-base`,
border 1px `--color-border-default`, **radius 10px**, `overflow: clip`.
- **Image** — full width × **130**, cover.
- **Card Content** — full width × **50**, bg `--color-gray-900` `#21201c`, padding **10px**;
  caption `Alexandria SemiBold 12px`, `--color-text-inverse`, text-right.

| Card | Node | Caption |
|---|---|---|
| 1 | `2374:2814` | `حفل الافتتاح` |
| 2 | `2374:2818` | `المضمار والميدان` |
| 3 | `2374:2822` | `منصة التتويج` |
| 4 | `2374:2826` | `جلسة تدريبية` |

**⚠️ Mobile gallery cards have NO "View Photos →" link.** The desktop EN equivalent (`616:1028`) carries a
`View Link` in each card; the mobile card content is caption-only.

**Reel Shelf Row** `2374:2830` — full width, bg `rgba(255,255,255,0.12)`, border 1px
`rgba(255,255,255,0.14)`, **radius 10px**, padding **12px**, `gap: 10px`, `items-center`:
- Text `2374:2831` — `Alexandria Regular 12px`, `--color-text-inverse`, text-right, `flex: 1`.
  Copy: `مشاهدة: أبرز لحظات بطولة الإمارات الوطنية 2026 - 4:28`
- **Play Button** `2374:2832` — **28 × 28** SVG.

**Δ vs desktop:** the **AR desktop baseline does not have this section at all.** `2374:1174` carries a
completely different `Photo Albums Section` (`2374:2127`, 1440 × **1431**) with `Header + Actions`,
a `Featured Album` (600 × 400 image + 680 × 229 info) and an `Album Grid` (1312 × 603).
The **EN desktop** (`616:1017`, 1440 × 593) *does* carry a `Media Centre` section that matches this mobile
composition (4 gallery cards + reel shelf).
→ **🔴 STRUCTURAL CONFLICT: mobile follows the EN desktop composition, not the approved AR desktop
baseline.** Per governance §1 and §24 this must be resolved by the owner before the tablet breakpoint is
derived — the 768px design cannot be interpolated between two anchors that model *different sections*.
Classification: **DESIGN DECISION REQUIRED.** See `homepage-en-desktop-1440.md` §12.

---

## 13. Memberships Section — `2374:2833`

**390 × 265**, y = 5816. Background `--color-surface-base`. Column, `items-end`, `gap: 16px`,
padding **`24px 16px`**.

**Header** `2374:2834` — column, `gap: 6px`, full width, **`text-align: center`**:
- Title `2374:2835` — `Alexandria Bold 18px`, mixed-colour rich text:
  `نحن ` (`--color-text-primary`) + **`فخورون`** (`#00843d`) + ` بعضويتنا` (`--color-text-primary`).
- Subtitle `2374:2836` — `Alexandria Regular 11px`, `--color-text-secondary`.
  Copy: `تمثيل رسمي لدولة الإمارات في المحافل الدولية لألعاب القوى`

**Org Track** `2374:2837` — horizontal, `gap: 12px`, `overflow: clip`. **3 cards visible of 5.**
Card spec: **140 wide**, bg `--color-surface-base`, border 1px `--color-border-default`,
**radius 12px**, padding **12px**, column, centred, `gap: 8px`.
- **Org Emblem** — **64 × 64**, radius 8px, `object-fit: contain`.
- **AR name** — `Alexandria Bold 11px`, `--color-text-primary`, centred, ellipsis, nowrap.
- **EN name** — `Alexandria Regular 9px`, `--color-text-secondary`, centred, ellipsis, nowrap.

| Card | Node | AR name | EN name | State |
|---|---|---|---|---|
| 1 | `2374:2838` | `المجلس الأولمبي الآسيوي` | `Olympic Council of Asia` | full |
| 2 | `2374:2842` | `اللجنة الأولمبية الدولية` | `International Olympic` (**truncated — "Committee" is missing**) | full |
| 3 | `2374:2846` | `الاتحاد الآسيوي لألعاب القوى` | **NONE — no EN caption node exists on this card** | **`opacity: 0.50`** |

**Carousel Controls** `2374:2849` — 3 dots, `gap: 6px`, centred, height 16:
`2374:2850` **6 × 6**, `2374:2851` **8 × 8** (active), `2374:2852` **6 × 6**.
→ 3 dots for a 5-card desktop set: **dot count does not match item count.** Observed inconsistency.

**🔴 CAPTION-GAP / ADR-0041 note:** ADR-0041 (Ch.4 §4.15b) documents the `CMP-AFFILIATIONS-001` bilingual
caption exception at **12.5px (AR) / 10.5px (EN)**. The **mobile values are 11px (AR) / 9px (EN)** — both
*below* the ADR'd exception values, and the ADR text does not name a mobile variant.
→ Classification: **DESIGN DECISION REQUIRED** — ADR-0041 must be extended with mobile values or the mobile
captions re-set. Do not normalise autonomously (governance §6, §14).

**Δ vs desktop (`2374:2161`, 1440 × 459):** desktop `Organizations Row` shows **5 cards at 249.6 × 220**
(Olympic Council of Asia, International Olympic Committee, Asian Athletics Association *(Hover state)*,
World Athletics, UAE National Olympic Committee) with a 78 × 24 controls cluster of 5 dots.
Mobile shows **3 of the 5**, at 140 wide, and the "Hover" variant card is rendered as the 0.50-opacity peek.
**Cards 4 and 5 (World Athletics, UAE National Olympic Committee) are NOT COMPOSED on mobile** — they exist
only in the scroll track's implied content. Desktop has 2 Swooshes (`2737:32`, `2737:33`) — absent on mobile.

---

## 14. Newsletter Section — `2374:2853`

**390 × 195**, y = 6081. Background **`--color-green-700` `#005226`**.
Column, `items-center`, `justify-content: center`, `gap: **14px**`, padding **20px** all sides.
(**Note: 20px, the only section not on the 16px side-padding rhythm.**)

| Element | Node | Typography | Colour | Copy |
|---|---|---|---|---|
| Heading | `2374:2854` | `Alexandria Bold 18px`, centred, full width | `#ffffff` | `لا تفوّت أي بطولة وطنية` |
| Sub | `2374:2855` | `Alexandria Regular 12px`, centred, full width | `rgba(255,255,255,0.85)` | `اشترك لتصلك النتائج ومواعيد التسجيل وأخبار الاتحاد مباشرة.` |

**Form Row** `2374:2856` — **column** (stacked), `gap: 10px`, full width:
- **Email Input** `2374:2857` — bg `#ffffff`, **radius 8px**, padding **12px**, full width.
  Placeholder `2374:2858`: `Alexandria Regular 13px`, `--color-text-secondary`, text-right, `flex: 1`.
  Copy: `بريدك الإلكتروني`
- **Subscribe Button** `2374:2859` — bg **`--color-brand-black` `#000000`**, **radius 8px**, padding **12px**,
  full width, centred. Label `2374:2860`: `Alexandria SemiBold 13px`, `#ffffff`. Copy: `اشتراك`

**Δ vs desktop (`2387:1128`, 1440 × 223):** desktop `Form Row` is a **horizontal 445 × 45** pair
(Email Input 340 × 45 beside Subscribe Button 93 × 45). Mobile **stacks them full-width**.
Section height is identical (223 desktop / 195 mobile) but padding drops 64 → 20.
Desktop has 4 Swooshes (`2737:34`–`2737:37`) — absent on mobile.

---

## 15. Footer — `2374:2861`

**390 × 703**, y = 6276. Background **`--color-brand-black` `#000000`**.
Column, `items-end`, `gap: **24px**`, padding **`32px top / 24px bottom / 16px sides`**.
Five stacked blocks (desktop is a 4-column grid + legal strip).

### 15.1 Brand Column — `2374:2862` (column, `items-end`, `gap: 12px`)
- **UAEAF Logo** `2374:2863` — **75 × 40** SVG (same size as the header logo; desktop is 120 × 64).
- Name `2374:2873` — `Alexandria Bold 14px`, `#ffffff`. Copy: `اتحاد الإمارات لألعاب القوى`
- Blurb `2374:2874` — `Alexandria Regular 12px`, **line-height `18px` (absolute)**,
  `rgba(255,255,255,0.65)`, text-right.
  Copy: `الجهة الرسمية المشرفة على رياضة ألعاب القوى في دولة الإمارات العربية المتحدة، عضو في الاتحاد الدولي لألعاب القوى.`
- **Social Icons Row** `2374:2875` — `padding-top: 8px`, `gap: 12px`. **4 buttons, each 40 × 40**,
  bg `#262626`, radius **20px**, centred, label `Inter Bold 12px` `#ffffff`:
  `IG` (`2374:2876`) · `𝕏` (`2374:2878`) · `YT` (`2374:2880`) · `FB` (`2374:2882`).
  **⚠️ These are text initials, not icons** — and the set is **4**, whereas the hero social rail (§3.4) and the
  approved footer redesign both carry **5** channels including **TikTok**. TikTok is **missing from the
  mobile footer**. → **DESIGN DECISION REQUIRED** (conflicts with the approved footer design of record).

### 15.2 Quick Links Grid — `2374:2884`
Horizontal, **`gap: 32px`**, `justify-content: flex-end`, full width. **2 columns** (desktop has 1 column of
11 links in a 4-column footer grid). Column heading `Alexandria Bold 13px` `#ffffff`;
links `Alexandria Regular 12px` `rgba(255,255,255,0.65)`; `gap: 10px`.

| Col | Node | Heading | Links |
|---|---|---|---|
| 1 | `2374:2885` | `من نحن` | `عن الاتحاد` · `الأندية` · `الرياضيون` |
| 2 | `2374:2890` | `البطولات` | `الفعاليات` · `المركز الإعلامي` · `تواصل معنا` |

→ **6 links on mobile vs 11 on desktop** (`2374:2218`, 292 × 316, 11 text nodes). **5 links dropped.**
`NOT EXTRACTED — which 5` (the desktop link labels were not individually pulled; only the node count is
recorded from metadata).

### 15.3 Contact Column — `2374:2895` (column, `items-end`, `gap: 8px`)
- Heading `2374:2896` — `Alexandria Bold 13px`, `#ffffff`. Copy: `التواصل`
- Address `2374:2897` — `Alexandria Regular 12px`, `rgba(255,255,255,0.65)`.
  Copy: `مدينة زايد الرياضية، أبوظبي، الإمارات العربية المتحدة`
- Email `2374:2898` — same style, LTR string. Copy: `info@uaeaf.ae`
- Hours `2374:2899` — same style. Copy: `الأحد-الخميس، 08:00-15:00`

### 15.4 Map Column — `2374:2900` (column, `items-end`, `gap: 8px`)
- Heading `2374:2901` — `Alexandria Bold 13px`, `#ffffff`. Copy: `الموقع`
- **Map Placeholder Frame** `2374:2902` — full width × **120**, bg `#1a1a1a`,
  border 1px `rgba(255,255,255,0.08)`, **radius 12px**, column, centred, `gap: 10px`:
  - **Map Pin Container** `2374:2903` — 32 × 32, bg `rgba(255,255,255,0.08)`, radius 16, centred;
    glyph `2374:2904` `Inter Regular 14px` 📍 tinted `--color-brand-primary`.
  - Caption `2374:2905` — `Alexandria Regular 11px`, `rgba(255,255,255,0.65)`. Copy: `عرض على الخريطة`
  → This is a **placeholder, not a real map embed.** Desktop equivalent is `Map Column` `2374:2209`, 292 × 208.

### 15.5 Legal Strip — `2374:2906`
Border-top 1px `rgba(255,255,255,0.14)`, `padding-top: 16px`, column, `gap: 12px`, full width.
All text `Alexandria Regular 11px`, `rgba(255,255,255,0.65)`, text-right.
- **Legal Links** `2374:2907` — `flex-wrap: wrap`, `gap: 16px`, `justify-content: flex-end`:
  `سياسة الخصوصية` (`2374:2908`) · `شروط الاستخدام` (`2374:2909`) · `خريطة الموقع` (`2374:2910`).
  → **3 links; desktop `Legal Links` (`2374:2257`, 474 × 16) has 4.** One link dropped —
  `NOT EXTRACTED — which one` (desktop legal labels not individually pulled).
- Copyright `2374:2911` — full width. Copy: `© 2026 اتحاد الإمارات لألعاب القوى. جميع الحقوق محفوظة.`

**Δ vs desktop (`2374:2198`, 1440 × 514):** desktop is a **1312 × 364 four-column grid**
(`Contact` 292 × 162 · `Map Column` 292 × 208 · `Quick Links` 292 × 316 · `Brand` 292 × 211) above a
1312 × 64 legal strip. Mobile **stacks all four columns**, halves the quick-links to a 2-column sub-grid,
and shrinks the logo 120 × 64 → 75 × 40. Desktop has 4 Swooshes (`2737:38`–`2737:41`, incl. a
**White** Swoosh `2737:40`) — absent on mobile.

---

## 16. Mobile-vs-desktop content deltas — consolidated

| Section | Desktop (AR `2374:1174`) | Mobile (390) | Delta type |
|---|---|---|---|
| Header nav | 9 items inline | 0 inline → hamburger drawer | **structure** |
| Hero slides | 5 frames (4 hidden placeholders) | 1 composed + 5 dots | **content not composed** |
| Hero social rail | 72 × 405, 42px buttons, connector visible | 34 × 183, 24px buttons, connector hidden | **scale + state** |
| Next-Event Card | 2 overlapping instances, 1440 × 64 | 1 instance, 390 × 45 | mobile is the correct one |
| Sponsor marquee | 1440 × 112, 5+4 flanking, 11px, divider bars | 390 × 75, stacked, 9px, `•` bullets | **scale + type below minimum** |
| Stats | 1 × 4 cards, 316 × 362, + `Updated` frame | 2 × 2 cards, + `Updated` **dropped** | **layout + content drop** |
| Clubs | 8 cards 174.9 × 143.1, 2 fade masks | **3 cards** 120 × 130, no masks, 3rd @0.65 | **item count 8 → 3** |
| Results / Events | side-by-side 614 + 676 | stacked, Results first | **layout** |
| Results H2 | `--typography-h2-desktop` 32px | **still 32px — unscaled** | **🔴 token gap** |
| News | 2-col; list = 5 items | stacked; list = **3 items** | **item count 5 → 3** |
| Media | 4 vertical cards + fade + carousel controls | **2 horizontal cards**, no controls | **item count + affordance drop** |
| Sponsors | Inner 1360 wide, 5 blocks | same 5 blocks re-laid, 6 placeholder tiles | **layout** |
| Live / Videos | 2-col 624 + 624 | stacked, live first (**order reversed**) | **layout + order** |
| Media Centre | AR desktop has `Photo Albums` (1431) — **different section** | 4 gallery cards + reel shelf (matches **EN** desktop) | **🔴 structural conflict** |
| Memberships | 5 org cards 249.6 × 220 | **3 of 5**, 140 wide, 3rd @0.50 | **item count 5 → 3** |
| Newsletter | horizontal form 445 × 45 | stacked full-width form | **layout** |
| Footer | 4-col grid, 11 quick links, 4 legal links | stacked, **6 quick links**, **3 legal links**, 4 social (no TikTok) | **content drop** |
| Decorative Swooshes | **40 vectors across 10 sections** | **0 — none anywhere on mobile** | **🔴 art-direction gap** |

**🔴 The Swoosh finding is the most consequential for tablet derivation.** The approved AR desktop baseline
carries the flat-colour diagonal-motif graphic direction as 40 `خط`/Swoosh vectors; the mobile anchor carries
**none**. Interpolating 768px between "40 swooshes" and "0 swooshes" is not a mechanical operation.
→ Classification: **DESIGN DECISION REQUIRED** — the owner must state whether the motif appears at tablet,
and if so at what scale and in which sections. **Do not invent a rule.**

---

## 17. Explicit gaps in this extraction

| Item | Status |
|---|---|
| Mobile typography token scale | **NOT EXTRACTED — does not exist in the file.** Only `*-desktop` tokens are bound. |
| Breakpoint definitions / Figma variable modes | **NOT EXTRACTED — no breakpoint variables were returned by `get_variable_defs` on any target node.** |
| Interaction / prototype wiring (drawer open, carousel advance, tab switch) | **NOT EXTRACTED — `get_design_context` returns static composition only; no prototype links were read.** |
| Hover / focus / pressed / disabled states | **NOT EXTRACTED — the mobile frame composes default states only.** The Memberships "Hover" variant exists on desktop (`2374:2176`) but is rendered on mobile as a static 0.50-opacity card. |
| Dark-mode composition | **NOT EXTRACTED — a `☾` toggle exists in the header and drawer, but no dark-mode mobile frame was found.** |
| Motion / animation specs (marquee speed, carousel timing, reduced-motion) | **NOT EXTRACTED — `get_motion_context` was not run; desktop layer names reference "pause-on-hover/focus/touch, reduced-motion aware" per Ch.8 L6 but carry no numeric timing.** |
| Image assets | Referenced by expiring Figma MCP asset URLs (**~7-day TTL from 2026-09-07**). **Not downloaded.** → **URGENT: download and commit every hero photo, athlete photo, club photo, news thumbnail, sponsor logo, gallery image and icon SVG before the URLs expire.** |
| Desktop quick-links / legal-link labels | **NOT EXTRACTED — only node counts were read from metadata**, so the specific 5 quick links and 1 legal link dropped on mobile are unidentified. |
| Athlete carousel off-screen cards | Only 3 athlete cards are composed (§ below); any 4th/5th card is **NOT EXTRACTED — not present in the file.** |

---

## 18. Athletes Section — `2374:2469` *(placed here for completeness; document order is §6 → §7)*

**390 × 537**, y = 1088. Background `#ffffff`. Column, `items-end`, `gap: 12px`,
padding `12px top / 16px bottom`.

**Section Header** `2374:2470` — full width, `padding-inline: 16px`, space-between, `items-end`.
`Titles` `2374:2471` is **368 wide**, column, `gap: 4px`:
- Title `2374:2472` — `Alexandria Bold 20px`, `--color-text-primary`. Copy: `رياضيونا المميزون`
- Subtitle `2374:2473` — `Alexandria Regular 12px`, `--color-text-secondary`. Copy: `نخبة الرياضيين المعتمدين في سجل الاتحاد`

**Filter Scroll** `2374:2474` — 390 × **27**, horizontal, `gap: 8px`, `justify-content: flex-end`,
`padding-inline: 16px`, `overflow: clip`. **4 chips**, radius **999px**, padding **`6px 14px`**:

| Chip | Node | Style | Copy |
|---|---|---|---|
| `2374:2475` | inactive — bg `#ffffff`, border 1px `--color-border-default`, `Alexandria Regular 12px`, `--color-text-secondary` | | `طرق` |
| `2374:2477` | inactive | | `ميدان` |
| `2374:2479` | inactive | | `مضمار` |
| `2374:2481` | **active** — bg `#e5f5ec`, border 1px `--color-green-500`, `Alexandria Bold 12px`, `--color-green-500` | | `الكل` |

> Note: the Athletes chips (`6px 14px`, 12px type) and the Events chips (§7.2: `11px 16px`, 13px `Type/Label`)
> are **two different chip specs on the same page**. Observed inconsistency — **DESIGN DECISION REQUIRED**,
> not reconciled here.

**Athletes Carousel Mobile** `2374:2483` — full width × **355**, `overflow: clip`, children absolutely
positioned (a peek-left / centre / peek-right filmstrip):

| Card | Node | Position | Width | Role |
|---|---|---|---|---|
| Peek (trailing) | `2374:2484` | `left: -144px` | **205** | partially off-canvas |
| **Centre (active)** | `2374:2499` | `left: 77px` | **243** | full card |
| Peek (leading) | `2374:2516` | `left: 336px` | **237** | partially off-canvas |

Card spec: bg **`#0f1115`**, **radius 16px**, `overflow: clip`, column.
- **Photo Container** — full width × **280**:
  - Athlete Image, `object-fit: cover`, `pointer-events: none`.
  - **Scrim** — gradient `rgba(0,0,0,0)` **from 40%** → `rgba(0,0,0,0.8)`, full height.
  - **Rank chip** — `top: 12px; left: 12px`, bg `rgba(0,0,0,0.55)`, **radius 6px**, padding `4px 8px`,
    `Alexandria Bold 12px` white.
  - **National Badge** *(card 2 only, `2374:2505`)* — `top: 12px; right: 12px`,
    bg `color/semantic/live` `#c8102e`, **radius 6px**, padding `4px 8px`,
    `Alexandria Bold 10px` white. Copy: `بطل الإمارات`
  - **Name** — `top: 240px`, inset 12px both sides, `Alexandria ExtraBold 20px`, white, text-right.
- **Athlete Stats Area** — bg `#0f1115`, padding **12px**, column, `gap: 10px`:
  - **PB Value Line** — space-between: value `Alexandria ExtraBold **14px**`, `--color-green-400` `#1a9448`;
    label `Alexandria Regular 11px`, `--color-text-secondary`, text-right. Label copy: `الرقم القياسي الشخصي`
  - **Divider** — 1px, `rgba(255,255,255,0.1)`, full width.
  - **Athlete Foot** — space-between, both 11px: discipline `Alexandria SemiBold`, `--color-green-400`;
    rank `Alexandria Regular`, `#9ca3af`.

| Card | Rank chip | Name | PB | Discipline | Rank line |
|---|---|---|---|---|---|
| `2374:2484` | `#3` | `أحمد الهاشمي` | `2.18m` | `قفز عالي` | `المرتبة: 3` |
| `2374:2499` | `#1` | `خالد المنصوري` | `20.42s` | `عداء 200م` | `المرتبة: 1` |
| `2374:2516` | `#2` | `سارة الكعبي` | `11.28s` | `عداءة 100م` | `المرتبة: 2` |

**🟢 PB-GAP note (governance §7):** the open **PB-GAP** debt concerns desktop PB values at **22px × 4** and
**~26px × 1**, which the type scale does not define. The **mobile PB values are 14px** — a value the scale
also does not define, but *different* from the desktop ones. This is **additional evidence for the same
DESIGN SYSTEM GAP** (a Statistic/Numeric Display role is needed), now spanning 14 / 22 / 26px.
Recorded, not resolved. **Do not map 14px to a nearest existing role.**

**Carousel Controls** `2374:2531` — full width × **48**, horizontal, `gap: 16px`, centred, `overflow: clip`:
- **Nav Arrow Right** `2374:2532` — 36 × 36, border 1px `#dee0e3`, radius 18, centred;
  glyph `2374:2533` **`Inter Regular 18px`** `#595e69`, `›`.
- **Pagination Dots** `2374:2534` — 80 × 10, flattened SVG.
- **Nav Arrow Left** `2374:2540` — 36 × 36, same spec; glyph `2374:2541` `‹`.

**Δ vs desktop (`2374:1508`, 1440 × 944):** desktop `Athletes Row` (`2374:1525`) is **1373 × 505 with 5
cards**; controls cluster is 1373 × 134.2. Mobile shows **3 cards** in a 355-tall peek filmstrip, card
width 243 (centre) vs desktop ~262 each, and the photo block drops 505 → 280.
**Item count 5 → 3.** Desktop has 4 Swooshes (`2737:10`–`2737:13`) — absent on mobile.

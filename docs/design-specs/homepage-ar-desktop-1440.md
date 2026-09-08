# UAEAF Homepage — Arabic / RTL — Desktop 1440 — Durable Implementation Specification

> ## ⚠️ THIS FILE IS THE SOURCE OF TRUTH
>
> The UAEAF Figma subscription has lapsed. **Figma is no longer editable, and read access is expected to
> disappear.** This document is a full extraction of the approved Figma baseline frame, captured while read
> access still worked. From the extraction date forward, **this file — not Figma — is the implementation
> source of truth for the Arabic desktop homepage.**
>
> Do not assume "the design does not exist" because Figma cannot be opened. It exists, and it is written here.
>
> Per `CLAUDE.md` §1 (Source of Truth Hierarchy), this document occupies the position previously held by
> "Figma Variables, Styles, Components and documented component specifications" + "Existing approved Figma
> composition" (ranks 6 and 7). It does **not** override the Design System Framework, ADRs, or approved page
> specifications (ranks 2–4).

| Field | Value |
|---|---|
| Figma file key | `hpO727vjwl18g3s3LTICAY` |
| Frame node id | `2374:1174` |
| Frame name | `Homepage - AR / RTL (APPROVED BASELINE v1)` |
| Declared frame size | 1440 × 8758 px |
| Measured content height | **9410.13 px** (see discrepancy note below) |
| Canvas position of frame | x = 1128, y = 1529 |
| Direction | RTL (Arabic) |
| Extraction date | **2026-09-07** |
| Extraction method | Figma MCP `get_design_context`, `get_variable_defs`, `get_metadata` (read-only) |
| Editing status at extraction | **LOCKED — read-only** |

### Height discrepancy (must be resolved by the implementer)

The root frame declares `height="8758"`, but the fifteen top-level sections tile contiguously (no gaps, no
overlaps) from y=0 to **y=9410.13**. The overflow is 652.13 px. Section-by-section arithmetic confirms every
section's own internal geometry is self-consistent — including `Photo Albums Section` (1431 px, verified:
64 top pad + 204 header + 48 gap + 400 featured + 48 gap + 603 grid + 64 bottom pad).

**Conclusion:** the frame's declared height is stale — it was not re-fitted after the last section grew. Build
to the **section heights**, not to 8758. The page is 9410 px tall at 1440 px wide.

### Reading the numbers in this document

Many values carry sub-pixel fractions (e.g. `95.40682220458984`, `23.85px`, `15.9px`). This is the documented
R7 tooling artifact described in `CLAUDE.md` §4: the Figma Plugin API returned instance-level values scaled
by ≈0.9938 against correct master values. **Where a fractional value appears next to a clean master value in
this document, implement the clean master value.** The mapping recorded in `CLAUDE.md` §4 is:

| Rendered (instance) | Implement (master) |
|---|---|
| 12.92px | **13px** |
| 15.90px / 15.901px | **16px** |
| 39.75px | **40px** |
| 23.85px / 23.852px | **24px** |
| 13.91px | **14px** |
| 1.99px | **2px** |
| 11.926px | **12px** |
| 0.994px | **1px** |
| 95.40682px | **96px** |

Values without a fractional artifact (e.g. `64`, `48`, `32`, `20`, `16`, `8`) are already master values and
are correct as written.

---

## 1. Design tokens in use on this page

Captured via `get_variable_defs` on the root frame `2374:1174`. These are the **canonical token names**;
the hex/number is the resolved fallback only.

### Color tokens

| Token | Value | Notes |
|---|---|---|
| `--color-brand-primary` | `#00843d` | UAEAF federation green |
| `--color-green-500` | `#00843d` | same resolved value as brand primary |
| `--color-green-600` | `#006b31` | darker green |
| `--color-brand-black` | `#000000` | |
| `--color-text-primary` | `#000000` | |
| `--color-text-secondary` | `#616058` | |
| `--color-text-inverse` | `#ffffff` | |
| `--color-surface-base` | `#fdfcfb` | page/header background |
| `--color-surface-raised` | `#ffffff` | cards |
| `--color-surface-skeleton` | `#f5f4f1` | placeholder / image skeleton fill |
| `--color-border-default` | `#e0dfdb` | |
| `--color-border-strong` | `#757470` | |
| `--color-gray-500` | `#757470` | |
| `--color-gray-950` | `#131210` | |
| `color/semantic/achievement` | `#c8102e` | Federation Red |
| `color/semantic/live` | `#c8102e` | Federation Red, live indicator |
| `--color-semantic-medal-gold` | `#d4a017` | |
| `--color-semantic-medal-silver` | `#9aa3ad` | |
| `--color-semantic-medal-bronze` | `#b0703b` | |

> Note: `color/semantic/achievement` and `color/semantic/live` are recorded in Figma with slash-path names,
> not CSS-variable names. They had not been migrated to the `--color-*` naming convention at extraction time.

### Typography tokens (text styles)

All page typography is **Alexandria** (Arabic + Latin). The single exception found is the `☾` dark-mode
glyph in the header utilities, which renders in `IBM Plex Sans: Bold`.

| Style name | Family | Weight | Size token | Size | Line height | Letter spacing |
|---|---|---|---|---|---|---|
| `Type/H1` | Alexandria Black | 900 | `--typography-h1-desktop` | 40 | 1.2 | 0 |
| `Type/H2` | Alexandria Bold | 700 | `--typography-h2-desktop` | 32 | 1.25 | 0 |
| `Type/Eyebrow` | Alexandria Bold | 700 | — (literal) | 16 | 1.5 | 0 |
| `Type/CTA Label` | Alexandria Bold | 700 | — (literal) | 16 | 1.5 | 0 |
| `Type/Subtitle` | Alexandria Medium | 500 | `--typography-subtitle-desktop` | 16 | 1.5 | 0 |
| `Type/Body` | Alexandria Regular | 400 | `--typography-body-desktop` | 16 | 1.6 | 0 |
| `Type/Compact Metadata` | Alexandria Medium | 500 | — (literal) | 14 | 1.5 | 0 |
| `Type/Label` | Alexandria Medium | 500 | `--typography-label-desktop` | 13 | 1.3 | 0 |
| `Type/Caption` | Alexandria Regular | 400 | `--typography-caption-desktop` | 13 | 1.4 | 0 |

> `Type/Eyebrow` and `Type/CTA Label` use a hard-coded 16 rather than binding to
> `--typography-body-desktop`. Recorded as observed. Do not "fix" this without a design decision.
>
> **No H3 (24) or H4 (20) style was bound anywhere on this frame** — where 24px/20px headings appear they are
> applied as raw sizes. See the PB-GAP item in `CLAUDE.md` §7, still open.

### Spacing / radius / effect tokens

| Token | Value |
|---|---|
| `--space-2` | 8 |
| `--space-3` | 12 |
| `--space-4` | 16 |
| `--space-5` | 20 |
| `--space-12` | 48 |
| `--space-16` | 64 |
| `--radius-lg` | 16 |
| `Elevation/1` | `DROP_SHADOW` · color `#0000000F` · offset (0, 1) · radius 2 · spread 0 |

> Only these spacing steps are bound as variables on this frame. Other spacing values in the page
> (e.g. 24, 32, 40, 56, 100) appear as raw auto-layout numbers with **no variable binding**.
> Recorded as observed — this is a token-coverage gap, not a licence to invent new tokens.

---

## 2. Page-level layout

- **Root frame:** `2374:1174`, 1440 px wide.
- **Content container:** 1312 px wide, centered → **64 px left/right page gutter** on almost every section.
  (Exceptions: the header uses ~24 px horizontal padding; full-bleed marquees run edge to edge.)
- **Vertical rhythm:** sections are stacked contiguously with **no inter-section margin** — each section owns
  its own top/bottom padding (most commonly 64 px, `--space-16`).
- **Direction:** RTL throughout. Logo sits at the **left** edge of the header; nav reads right-to-left with
  `الرئيسية` (Home) as the rightmost/first item.

### Section vertical order, offsets and heights

y-offsets are relative to the top of frame `2374:1174`. All sections are 1440 px wide.

| # | Section | Node id | y (top) | Height | y (bottom) |
|---|---|---|---|---|---|
| 1 | Header (Approved Master Component) | `2374:1175` | 0 | 95.41 → **96** | 95.41 |
| 2 | Hero (layer named "Stats") | `2374:1201` | 95.41 | 732 | 827.41 |
| 3 | Sponsors marquee bar | `2374:1284` | 827.41 | 112 | 939.41 |
| 4 | Federation by the Numbers (layer named "Inner") | `2374:1331` | 939.41 | 569 | 1508.41 |
| 5 | Clubs Network | `2374:1435` | 1508.41 | 329.11 | 1837.52 |
| 6 | Featured Athletes (layer named "Inner") | `2374:1508` | 1837.52 | 944 | 2781.52 |
| 7 | Results & Rankings + Upcoming Events | `2374:1614` | 2781.52 | 913 | 3694.52 |
| 8 | Section / News | `2374:1887` | 3694.52 | 857.61 | 4552.13 |
| 9 | UAEAF in the Media | `2374:1932` | 4552.13 | 614 | 5166.13 |
| 10 | Sponsors & Partners | `2374:1977` | 5166.13 | 907 | 6073.13 |
| 11 | Live Stream & Videos | `2374:2052` | 6073.13 | 710 | 6783.13 |
| 12 | Photo Albums Section | `2374:2127` | 6783.13 | 1431 | 8214.13 |
| 13 | Memberships | `2374:2161` | 8214.13 | 459 | 8673.13 |
| 14 | Newsletter Section | `2387:1128` | 8673.13 | 223 | 8896.13 |
| 15 | Section / Footer | `2374:2198` | 8896.13 | 514 | **9410.13** |

> **Layer-naming warning for anyone re-reading an old Figma export:** section 2 (the Hero) is *named* "Stats"
> in the Figma layer tree, and sections 4 and 6 are both *named* "Inner". These are historical naming
> mistakes, not a content mismatch. The node ids in this table are authoritative; the layer names are not.

---

## 3. Sections

### 3.1 Header — `2374:1175`

| Property | Value |
|---|---|
| Node id | `2374:1175` |
| Name | `Header (Approved Master Component)` |
| Size | 1440 × 95.407 → **implement 1440 × 96** |
| Background | `--color-surface-base` `#fdfcfb` |
| Bottom border | 0.994px → **1px** solid `--color-border-default` `#e0dfdb` |
| Layout | Horizontal flex, `align-items: center`, `justify-content: space-between` |
| Horizontal padding | 23.852px → **24px** (both sides) |
| Vertical padding | 0 (children are centered in the 96px band) |

Three flex children, in DOM order (visually, RTL: Utilities at the right, Nav centre, Logo at the left):

#### 3.1.1 Utilities cluster — `2374:1176`

| Property | Value |
|---|---|
| Size | 122.703 × 17.889 |
| Position in header | x = 23.852, y = 38.759 |
| Layout | Horizontal flex, `align-items: center`, gap 11.926 → **12px** |
| Text color | `--color-text-secondary` `#616058` |
| Text align | right |

| Node id | Content | Font | Size | Notes |
|---|---|---|---|---|
| `2374:1177` | `☾` | IBM Plex Sans Bold 700 | 15.901 → **16px** | Dark-mode toggle glyph. **Only non-Alexandria text on the page.** 23.852 × 17.889 box. `fontVariationSettings: "wdth" 100` |
| `2374:1178` | `بحث` | Alexandria Medium 500 | 12.92 → **13px** (`Type/Label`) | Search. `dir="auto"`, `white-space: nowrap` |
| `2374:1179` | `AR \| EN` | Alexandria Medium 500 | 12.92 → **13px** (`Type/Label`) | Language switcher. Latin, no `dir="auto"` |

#### 3.1.2 Primary navigation — `2374:1180`

| Property | Value |
|---|---|
| Size | 1047 × 56.99 → **1047 × 57** |
| Position in header | x = 197.852, y = 19.208 |
| Layout | Horizontal flex, `align-items: center`, `justify-content: center`, gap **20px** (`--space-5`) |
| Item count | 9 |

Every item is an instance of the same componentized nav item. **Item structure (identical for all 9):**

- Outer: vertical flex, `align-items: center`, gap **8px** (`--space-2`), padding **6px horizontal / 14px vertical**.
- `Label Row`: horizontal flex, `align-items: center`, gap **6px**, `overflow: clip`.
  Contains an optional `chevron-down` icon (**10 × 10 px**) then the label.
- `Active Indicator`: full-width bar, height 1.99 → **2px**. Transparent when inactive;
  `--color-green-500` `#00843d` when active.
- Label typography: Alexandria **Regular 400**, 15.9 → **16px**, `--color-text-secondary` `#616058`,
  `white-space: nowrap`, `dir="auto"`.
- **Active state** (only `الرئيسية`): Alexandria **Medium 500**, 16px, `--color-text-primary` `#000000`,
  and the Active Indicator filled with `--color-green-500`.

Nav items in Figma child order (RTL reading order is the reverse — `الرئيسية` is visually rightmost/first):

| Order in tree | Node id | Arabic label | English meaning | Has chevron (dropdown) | State |
|---|---|---|---|---|---|
| 1 | `2544:2538` | `تواصل معنا` | Contact Us | no | default |
| 2 | `2544:2544` | `المركز الاعلامي` | Media Centre | **yes** (`2544:2546`) | default |
| 3 | `2544:2551` | `الاخبار و المقالات` | News & Articles | no | default |
| 4 | `2544:2558` | `فعاليات الاتحاد` | Federation Events | no | default |
| 5 | `2544:2564` | `البطولات` | Tournaments | **yes** (`2544:2566`) | default |
| 6 | `2544:2570` | `الاعضاء` | Members | **yes** (`2544:2572`) | default |
| 7 | `2544:2577` | `الاندية` | Clubs | no | default |
| 8 | `2544:2583` | `عن الاتحاد` | About the Federation | **yes** (`2544:2585`) | default |
| 9 | `2544:2590` | `الرئيسية` | Home | no | **ACTIVE** |

> **IA note (`CLAUDE.md` §11):** `فعاليات الاتحاد` (Federation Events, item 4) and `البطولات`
> (Tournaments, item 5) are **two separate top-level nav items**. This confirms the approved IA position that
> Events and Tournaments are intentionally distinct. Do not merge them.
>
> Note also that item 4's layer is named `Nav Item / الفاعليات (componentized)` but its rendered label text
> is `فعاليات الاتحاد`. The **rendered label is the copy**; the layer name is stale.

Per-item child node ids (chevron / label / indicator):

| Item | Label Row | chevron-down | Label text | Active Indicator |
|---|---|---|---|---|
| `2544:2538` تواصل معنا | `2544:2539` | `2544:2540` (hidden) | `2544:2542` | `2544:2543` |
| `2544:2544` المركز الاعلامي | `2544:2545` | `2544:2546` | `2544:2548` | `2544:2549` |
| `2544:2551` الاخبار و المقالات | `2544:2552` | — | `2544:2555` | `2544:2556` |
| `2544:2558` فعاليات الاتحاد | `2544:2559` | — | `2544:2562` | `2544:2563` |
| `2544:2564` البطولات | `2544:2565` | `2544:2566` | `2544:2568` | `2544:2569` |
| `2544:2570` الاعضاء | `2544:2571` | `2544:2572` | `2544:2574` | `2544:2575` |
| `2544:2577` الاندية | `2544:2578` | — | `2544:2581` | `2544:2582` |
| `2544:2583` عن الاتحاد | `2544:2584` | `2544:2585` | `2544:2587` | `2544:2588` |
| `2544:2590` الرئيسية | `2544:2591` | — | `2544:2594` | `2544:2595` (green) |

> The `chevron-down` icon is a **shared SVG asset**, identical across all four dropdown items
> (same exported asset hash). Export once, reuse.

#### 3.1.3 Logo — `2374:1190`

| Property | Value |
|---|---|
| Container node | `2374:1190` (`Logo`) — horizontal flex, full header height, `align-items: center`, `overflow: clip` |
| Logo node | `2374:1191` — `UAEAF Logo (Vector)` |
| Size | **120 × 64 px** |
| Format | SVG vector |
| Position | Left edge of header (RTL: end of the flex row) |

> Per the Global Visual Design Protocol, the UAEAF logo is protected: do not recolor, re-proportion, or
> substitute it. Reproduce from the exported vector.


---

### 3.2 Hero carousel — `2374:1201` (layer named "Stats")

| Property | Value |
|---|---|
| Section node id | `2374:1201` |
| Layer name in Figma | `Stats` — **stale/incorrect name, this is the Hero** |
| Size | 1440 × 732 |
| y-offset | 95.41 |
| Background | `#f9fafb` — **raw hex, NOT a bound token.** Closest canonical token is `--color-surface-base` `#fdfcfb`. Recorded as observed; reconciling these two near-identical off-whites is a **DESIGN DECISION REQUIRED**. |
| Layout | Vertical flex, `align-items: center` |
| Padding | top **24px**, bottom **64px** (`--space-16`), no horizontal padding (full bleed) |

> **Geometry discrepancy — flag for implementer.** The section frame declares height 732, but its content is
> 24 (top pad) + 837 (carousel) + 64 (bottom pad) = **925 px**. The carousel is `overflow: clip`, so the
> composition clips its own bottom by 193 px inside a fixed-height frame. The carousel in turn is 837 px tall
> while its slides are only 769.217 px tall, leaving a 67.78 px band below the slide in which the carousel
> controls sit (at y=659.22 they actually overlap the slide's lower area). **Do not blindly reproduce 732.**
> Build the hero at the height that lets the slide (769.217 → treat as **769**) plus the controls row render
> without clipping, and raise the conflict per `CLAUDE.md` §1. Classified: **DESIGN DECISION REQUIRED**.

#### 3.2.1 Carousel container — `2374:1202`

| Property | Value |
|---|---|
| Node id | `2374:1202` |
| Name | `Hero Carousel (CMP-CAROUSEL-001)` |
| Component ID | **`CMP-CAROUSEL-001`** |
| Size | 1440 × 837 |
| Position in section | x = 0, y = 24 |
| Overflow | clip |
| Slides | 5 (`2374:1203`, `2374:1241`, `2374:1249`, `2374:1257`, `2374:1265`) — all stacked absolutely at 0,0, each 1440 × 769.217 |
| Visible slide | **Slide 1 only.** Slides 2–5 carry `hidden="true"` in Figma |

The layer name records the approved behavior contract:
`CMP-CAROUSEL-001 — pause-on-hover/focus/touch per Ch.8 L6, reduced-motion aware`.
**Behavioral requirements (from the approved layer annotation, carry into implementation):**
- Autoplay must pause on hover, on keyboard focus, and on touch.
- Must respect `prefers-reduced-motion`.
- Governing reference: Design System Chapter 8, L6.

#### 3.2.2 Slide 1 (active) — `2374:1203`

Full layer name (contains an approved production note — preserve it):
`Slide 1 of 5 (active) — Media: legacy composite, needs re-shoot w/o baked text`

> **Known content debt recorded in the design itself:** the Slide 1 photograph is a *legacy composite with
> text baked into the image*. It requires a re-shoot with no baked text before production. This is a content
> action item, not a layout defect.

| Property | Value |
|---|---|
| Size | 1440 × 769.217 (**treat as 769**) |
| Position | absolute, left 0, top 0 |
| Overflow | clip |

**Children:**

| Layer | Node id | Geometry | Detail |
|---|---|---|---|
| Media (Photo) | `2374:1204` | 1440 × 769.217, abs 0,0 | Raster PNG, `object-fit: cover`, `pointer-events: none`. Asset: exported PNG (legacy composite — see note above) |
| Scrim | `2374:1205` | 700 × 769.217, abs left **731.1**, top 0 | Linear gradient, **left→right**: `rgba(255,255,255,0)` → `rgba(255,255,255,0.45)`. Layer name records the governing rule: `Scrim (text-legibility overlay per Ch.4 §4.13 anti-pattern rule)` |
| Content block | `2374:1206` | abs left **860**, top **330** | See below |
| Next-Event Card | `2374:1214` | 1440 × 64, abs left 0, top **705** | See §3.2.3 |
| Next-Event Card (duplicate) | `2374:1219` | 1440 × 64, abs left 0, top **705** | **DUPLICATE — see warning in §3.2.3** |
| Social Media Sidebar | `2374:1224` | 72 wide, abs left 0, top `calc(50% + 27.98px)`, `translateY(-50%)` | See §3.2.4 |

**Content block `2374:1206`** — `Content (Eyebrow + Headline + Body + CTA Row + Next-Event Card)`

- Layout: vertical flex, `align-items: flex-start`, **gap 16px** (`--space-4`), `overflow: clip`
- Absolute position: left **860**, top **330**
- Text column width: **520px** (all three text layers), `text-align: right`, `dir="auto"`

| Node id | Role | Copy (Arabic) | Style token | Font | Size | Weight | Line-height | Color token |
|---|---|---|---|---|---|---|---|---|
| `2374:1207` | Eyebrow | `الاتحاد الوطني الرسمي` | `Type/Eyebrow` | Alexandria Bold | 16 | 700 | 1.5 | `--color-brand-primary` `#00843d` |
| `2374:1208` | Headline (H1) | `حيث تلتقي الأمة بأبطالها` | `Type/H1` | Alexandria Black | `--typography-h1-desktop` = 40 | 900 | 1.2 | `--color-text-primary` `#000000` |
| `2374:1209` | Body | `يتولى اتحاد الإمارات لألعاب القوى تنظيم وتطوير والاحتفاء بألعاب القوى في جميع أنحاء الدولة، من المواهب الناشئة إلى منصات التتويج الأولمبية والعالمية.` | `Type/Body` | Alexandria Regular | `--typography-body-desktop` = 16 | 400 | 1.6 | `--color-text-secondary` `#616058` |

**CTA Row `2374:1210`** — horizontal flex, `align-items: center`, **gap 20px** (`--space-5`), width 520, `overflow: clip`

| Node id | Type | Copy | Style | Detail |
|---|---|---|---|---|
| `2374:1211` | Secondary / text link | `‹ عن الاتحاد` | `Type/Subtitle` — Alexandria Medium 500, `--typography-subtitle-desktop` = 16, LH 1.5, `--color-text-primary` `#000000` | `white-space: nowrap`, `text-align: right`. The `‹` chevron is a **literal text character**, not an icon node — and it points **left**, which in RTL is the "forward" direction |
| `2374:1212` | **Primary button** | — | — | Component: **`Button / Primary (CMP-BUTTON-001)`**. Background `--color-brand-primary` `#00843d`; padding **24px horizontal / 12px vertical**; `border-radius: 9999px` (full pill); `overflow: clip`. Rendered size 197 × 48 on slide 2's equivalent |
| `2374:1213` | Button label | `عرض جدول البطولات` | `Type/CTA Label` — Alexandria Bold 700, 16, LH 1.5 | `--color-text-inverse` `#ffffff`, `white-space: nowrap` |

> **CTA hierarchy (approved):** one filled pill primary (`عرض جدول البطولات` — "View the tournament
> schedule") plus one text-link secondary (`عن الاتحاد` — "About the Federation"). Do not add a third CTA.
>
> **IA note:** the hero primary CTA points at the **tournament schedule**, consistent with `CLAUDE.md` §11 —
> the homepage teaser may lead to the deeper tournament schedule. Not an IA defect.

#### 3.2.3 Next-Event Card — `2374:1214`

| Property | Value |
|---|---|
| Node id | `2374:1214` |
| Name | `Next-Event Card (real component, CMS-editable)` |
| Size | 1440 × **64**, absolute left 0, top **705** |
| Background | `rgba(15, 15, 15, 0.85)` — **raw rgba, no bound token** |
| Backdrop filter | `blur(8px)` |
| Border | 1px solid `#dee0e3` — **raw hex, no bound token.** Near-neighbour token is `--color-border-default` `#e0dfdb` |
| Layout | Horizontal flex, `align-items: center`, `justify-content: space-between` |
| Padding | **24px horizontal / 14px vertical** |
| Overflow | clip; `white-space: nowrap` |
| Radius | 0 (square — full-bleed band) |
| CMS | **CMS-editable** per the layer name |

| Node id | Role | Copy | Font | Size | Weight | LH | Color |
|---|---|---|---|---|---|---|---|
| `2374:1215` | Event line | `بطولة الإمارات الوطنية لألعاب القوى 2026 · مدينة زايد الرياضية، أبوظبي` | Alexandria Medium | 14 (`Type/Compact Metadata`) | 500 | 1.5 | `--color-text-inverse` `#ffffff` |
| `2374:1216` | Countdown group | — | horizontal flex, `align-items: flex-start`, **gap 8px** (`--space-2`), `overflow: clip` | | | | |
| `2374:1217` | Countdown number | `30` | Alexandria Bold | 16 | 700 | normal | `--color-text-inverse` `#ffffff` |
| `2374:1218` | Countdown unit | `يوماً` | Alexandria Regular | `--typography-caption-desktop` = 13 (`Type/Caption`) | 400 | 1.4 | `--color-text-secondary` `#616058` |

> **⚠️ ACCESSIBILITY DEFECT — record, do not silently fix.** The countdown unit `يوماً` uses
> `--color-text-secondary` `#616058` on an `rgba(15,15,15,0.85)` near-black background. That is a dark-on-dark
> pairing and will fail WCAG contrast. The design system's inverse-text token
> (`--color-text-inverse` `#ffffff`, already used by its sibling `2374:1217`) is the evident intended value.
> Classified: **DESIGN DECISION REQUIRED** — it is a token-binding error in the approved composition, and
> per `CLAUDE.md` §2 the correction must be authorized rather than assumed.

> **⚠️ DUPLICATE NODE.** `2374:1219` is a **second, fully overlapping copy** of the Next-Event Card at the
> identical position (1440 × 64, left 0, top 705), with the identical copy and styling. The only difference is
> child order: `2374:1219` places the Countdown first and the event line second, and sets `text-align: right`
> on the container. Its children are `2374:1220` (event line), `2374:1221` (countdown group),
> `2374:1222` (`30`), `2374:1223` (`يوماً`).
>
> This is almost certainly an **RTL/LTR ordering experiment left in the file** — one LTR-ordered and one
> RTL-ordered variant stacked on top of each other. **Implement ONE.** For an RTL page the correct reading is
> event line at the right, countdown at the left — verify against the rendered screenshot before choosing.
> Classified: **DESIGN DECISION REQUIRED**.

#### 3.2.4 Social Media Sidebar — `2374:1224`

| Property | Value |
|---|---|
| Node id | `2374:1224` |
| Name | `Social Media Sidebar (Fixed)` |
| Width | **72px** (height driven by content) |
| Position | absolute, left **0** (flush to the viewport's left edge), top `calc(50% + 27.98px)`, `transform: translateY(-50%)` |
| Background | linear gradient top→bottom `rgba(0,0,0,0.8)` → `rgba(0,0,0,0.6)` |
| Backdrop filter | `blur(12px)` |
| Border | 1px solid `rgba(0, 132, 61, 0.2)` — federation green at 20% |
| Border radius | **32px** |
| Shadow | `drop-shadow(0px 10px 14px rgba(0,132,61,0.15))` — green-tinted |
| Layout | Vertical flex, `align-items: center`, **gap 16px** (`--space-4`) |
| Padding | **12px horizontal / 24px vertical** |

**Label container `2374:1225`** — vertical flex, `align-items: center`, `padding-bottom: 12px`
- `2374:1226`: 13 × 28 box, contents rotated **−90°**
- Copy: `تابعنا` ("Follow us")
- Font: Alexandria **SemiBold 600**, **11px**, line-height normal, `text-align: center`, `white-space: nowrap`
- Color: `--color-green-500` `#00843d`

> **⚠️ 11px is below the 13px design-system minimum** (`CLAUDE.md` §5/§6 context). It is **not** covered by
> ADR-0041, whose two exceptions are narrowly scoped to `CMP-CLUBCARD-001`'s crest city-name label and
> `CMP-AFFILIATIONS-001`'s organization caption pair, and which is explicitly **non-transferable**.
> This vertical `تابعنا` label is therefore a **new, undocumented sub-minimum text instance**.
> Classified: **DESIGN DECISION REQUIRED** — either raise to 13px (the rotated 28px track has room), or open a
> new narrowly scoped ADR. Do not extend ADR-0041 to cover it.

**Icons Track `2374:1227`** — vertical flex, `align-items: center`, **gap 16px** (`--space-4`)

- `2374:1228` `Vertical Connector`: 2 × **228px** bar, `--color-green-500` `#00843d`, **opacity 0.55**,
  absolutely centered (`left: 50%`, `translateX(-50%)`), top **20px**. Sits behind the icon buttons.

All five icon buttons are **42 × 42 px**, `border-radius: 21px` (circular). Inner glyphs are **18 × 18 px** SVG.

| # | Node id | Name | Fill | Glyph node | Shadow |
|---|---|---|---|---|---|
| 1 | `2374:1229` | Facebook Icon Button | gradient top→bottom `#1877f2` → `#8b9bff` (55%) → `#1877f2` | `2374:1230` (SVG) | `drop-shadow(0px 6px 7px rgba(0,0,0,0.15))` |
| 2 | `2374:1232` | X Icon Button | solid `#000000` + raster PNG overlay (`object-fit: contain`) | — (glyph baked into the PNG) | `0px 6px 14px -6px rgba(0,0,0,0.15)` |
| 3 | `2374:1233` | **Instagram Icon Button Active** | gradient top→bottom `#405de6` → `#c13584` (50%) → `#fdaf31` | `2374:1234` (SVG) | `drop-shadow(0px 0px 5px rgba(0,205,95,0.2))` — green glow marks the **active** state |
| 4 | `2374:1236` | TikTok Icon Button | full-bleed SVG (no separate fill layer) | — (single SVG) | none |
| 5 | `2374:1238` | YouTube Icon Button | gradient top→bottom `red` → `#ff3d00` (55%) → `red` | `2374:1239` (SVG) | `drop-shadow(0px 6px 7px rgba(0,0,0,0.15))` |

> Order top→bottom: Facebook, X, Instagram, TikTok, YouTube. This matches the approved footer's five-icon set
> (including TikTok) recorded in the project's footer redesign.
>
> **Inconsistency to record:** buttons 2 and 4 are built differently from 1, 3 and 5 (raster/full-bleed SVG vs.
> gradient container + 18px glyph). Normalizing them is a component-hygiene task, classified
> **DESIGN DECISION REQUIRED** (do not restructure the approved composition unasked).

#### 3.2.5 Slides 2–5 (hidden placeholders)

All four are `hidden="true"` in Figma, 1440 × 769.217, absolutely stacked at 0,0. Each has the identical
structure and **no approved photography**:

- `Media (Placeholder — replace with approved photography)` — rounded-rectangle, 1440 × 769.217 at 0,0
- `Scrim (text-legibility overlay per Ch.4 anti-pattern rule)` — 700 × 769.217 at x = 731.102, y = 0
- `Content` — 520 wide, at x = **860**, y = **380**; vertical flex, `align-items: flex-start`, **gap 16px**
- Content children: Headline (`Type/H1`, Alexandria Black 900, 40, LH 1.2, `--color-text-primary`) →
  Body (`Type/Body`, Alexandria Regular 400, 16, LH 1.6, `--color-text-secondary`) →
  `Button / Primary (CMP-BUTTON-001)` (green pill, 24/12 padding, radius 9999, label
  `Type/CTA Label` Alexandria Bold 700 / 16 / `--color-text-inverse`)
- **Note:** slides 2–5 have **no Eyebrow** — only slide 1 carries one.

| Slide | Node id | Content node | Headline (Arabic) | Body (Arabic) | CTA label (Arabic) | Content h | Button size |
|---|---|---|---|---|---|---|---|
| 2 | `2374:1241` | `2374:1244` | `قصة كل بطولة تبدأ من هنا` | `تغطية شاملة لأحدث الفعاليات والبطولات الوطنية والدولية — محتوى نائب (Placeholder)، بانتظار الصورة والنص المعتمدين من الفريق التحريري.` | `استعرض الفعاليات` | 254 | 197 × 48 |
| 3 | `2374:1249` | `2374:1252` | `أبطال الإمارات على خارطة العالم` | `محتوى نائب (Placeholder) — سلايد جاهز هيكليًا لاستقبال تصوير وبيانات رياضي مميز فور اعتمادهما.` | `تعرف على رياضيينا` | 228 | 191 × 48 |
| 4 | `2374:1257` | `2374:1260` | `شبكة أندية تغطي كل إمارة` | `محتوى نائب (Placeholder) — بانتظار المحتوى المعتمد لهذا السلايد.` | `استعرض الأندية` | 202 | 175 × 48 |
| 5 | `2374:1265` | `2374:1268` | `نحو الأولمبياد والعالمية` | `محتوى نائب (Placeholder) — بانتظار المحتوى المعتمد لهذا السلايد.` | `قصص الإنجاز` | 154 | 154 × 48 |

Per-slide node ids (headline / body / button / label):

| Slide | Headline | Body | Button | Label |
|---|---|---|---|---|
| 2 | `2374:1245` | `2374:1246` | `2374:1247` | `2374:1248` |
| 3 | `2374:1253` | `2374:1254` | `2374:1255` | `2374:1256` |
| 4 | `2374:1261` | `2374:1262` | `2374:1263` | `2374:1264` |
| 5 | `2374:1269` | `2374:1270` | `2374:1271` | `2374:1272` |

> The Arabic body copy of slides 2–5 **literally says it is placeholder copy** (`محتوى نائب (Placeholder)`).
> It must NOT ship. Build the slide structure; source real copy and photography from the editorial team.
> All four slides are 100% structurally specified and 0% content-approved.

#### 3.2.6 Carousel controls — `2374:1273`

| Property | Value |
|---|---|
| Node id | `2374:1273` |
| Name | `Carousel Controls (CMP-CAROUSEL-001 — pause-on-hover/focus/touch per Ch.8 L6, reduced-motion aware)` |
| Size | 238 × 44 |
| Position | absolute, left **575.551**, top **659.217** (horizontally centred: (1440 − 238) / 2 = 601 — note the actual 575.551 is **25.45px left of true centre**; recorded as observed) |
| Layout | Horizontal flex, `align-items: center`, **gap 24px**, `overflow: clip` |

| Node id | Element | Detail |
|---|---|---|
| `2374:1274` | `Nav Arrow / Next (real component)` | **44 × 44 px**, `border-radius: 9999px`, background `--color-surface-raised` `#ffffff`, `overflow: clip` |
| `2374:1275` | Next glyph | `‹` — Alexandria Bold 700, **16px**, `--color-text-primary` `#000000`, centred in the 44px box. **Literal text character, not an icon asset** |
| `2374:1276` | `Pagination Dots (5)` | **102 × 10 px**, single exported **SVG** covering all 5 dots. **NOT EXTRACTED — per-dot active/inactive fills are baked into one flattened SVG and are not individually addressable via the MCP API.** Rebuild as 5 discrete dots; active-dot color must be confirmed from the exported SVG or reconstructed from `--color-green-500` per the nav Active Indicator precedent |
| `2374:1282` | `Nav Arrow / Prev (real component)` | **44 × 44 px**, `border-radius: 9999px`, background `--color-surface-raised` `#ffffff`, `overflow: clip` |
| `2374:1283` | Prev glyph | `›` — Alexandria Bold 700, **16px**, `--color-text-primary` `#000000`, centred |

> **RTL note:** the arrow named "Next" carries `‹` (pointing left) and sits first; "Prev" carries `›`
> (pointing right). This is **correct for RTL** — in RTL, "next" advances leftward. Do not "fix" the glyphs.
>
> **Accessibility:** 44 × 44 px meets the WCAG 2.2 target-size minimum. Both arrows need accessible names
> (`التالي` / `السابق`) — the design supplies only the glyph, so **the accessible name is
> NOT EXTRACTED — not present in the Figma composition** and must be authored in code.


---

### 3.3 Sponsors marquee bar — `2374:1284`

| Property | Value |
|---|---|
| Node id | `2374:1284` |
| Name | `sponsors-marquee-bar` |
| Size | 1440 × **112** |
| y-offset | 827.41 |
| Background | `#070c08` — near-black green-tinted. **Raw hex, no bound token.** Not `--color-gray-950` `#131210` |
| Border | **top and bottom** 1px solid `#ffb800` (amber/gold) — **raw hex, no bound token** |
| Layout | Vertical flex, `align-items: center`, `justify-content: center` |
| Radius | 0 |

> This section is a **full-bleed dark band** and the only place on the page using the amber `#ffb800`
> accent. None of its four colors (`#070c08`, `#ffb800`, `#8a948d`, `rgba(255,184,0,0.1)`) are bound to design
> tokens. Classified: **DESIGN SYSTEM GAP** — a sponsor/partner accent ramp is not defined in the token set.

**Ambient Glow Overlay `2374:1285`** — 1440 × 112, absolute at left 0, **top −1**.
Radial gradient painted as an inline SVG data-URI:
`radialGradient` in `userSpaceOnUse`, cx 0, cy 0, r 10, transform `matrix(72 0 0 5.6 720 56)`
(i.e. an ellipse centred at 720,56 with rx 720, ry 56), stops:
`rgba(0,92,42,0.12157)` at offset 0 → `rgba(0,0,0,0)` at offset 0.8. Green ambient bloom behind the ticker.

**Ticker Content Wrapper `2374:1286`** — horizontal flex, `flex: 1 0 0`, `align-items: center`,
`justify-content: space-between`, **padding 48px horizontal** (`--space-12`), full width.

Three children: `Sponsors Left` → `Official Sponsor Centerpiece` → `Sponsors Right`.

#### Sponsor name typography (all 9 wordmarks, identical)

Alexandria **Medium 500**, **11px**, line-height normal, `text-transform: uppercase`,
color `#8a948d`, `white-space: nowrap`.

> **⚠️ 11px is below the 13px design-system minimum**, and is **not** covered by ADR-0041 (whose two
> exceptions are non-transferable and scoped to `CMP-CLUBCARD-001` and `CMP-AFFILIATIONS-001`).
> The nine sponsor wordmarks plus the two 10px centerpiece labels below are additional undocumented
> sub-minimum text. Classified: **DESIGN DECISION REQUIRED**.
>
> Note also these are **text wordmarks, not sponsor logos**. Real sponsor logo assets are
> **NOT EXTRACTED — they do not exist in the composition**; the design uses typeset names as placeholders.

**Sponsors Left `2374:1287`** — horizontal flex, `align-items: center`, **gap 12px** (`--space-3`)

| Order | Wrapper | Text node | Wordmark | Trailing divider |
|---|---|---|---|---|
| 1 | `2374:1288` | `2374:1289` | `ADNOC` | `2374:1290` |
| 2 | `2374:1292` | `2374:1293` | `Emirates NBD` | `2374:1294` |
| 3 | `2374:1296` | `2374:1297` | `Etisalat` | — (divider `2374:1298` is a **sibling of the wrapper**, not a child — structural inconsistency, recorded as observed) |
| 4 | `2374:1300` | `2374:1301` | `Mubadala` | `2374:1302` |
| 5 | `2374:1304` | `2374:1305` | `Emirates` | `2374:1306` |

**Sponsors Right `2374:1314`** — horizontal flex, `align-items: center`, **gap 12px** (`--space-3`)

| Order | Wrapper | Text node | Wordmark | Divider |
|---|---|---|---|---|
| — | — | — | — | `2374:1315` (leading divider, direct child) |
| 1 | `2374:1317` | `2374:1318` | `du` | `2374:1319` |
| 2 | `2374:1321` | `2374:1322` | `Nike` | `2374:1323` |
| 3 | `2374:1325` | `2374:1326` | `Adidas` | — (none) |
| 4 | `2374:1327` | `2374:1328` | `Hublot` | `2374:1329` |

**Divider** — every divider is the **same exported SVG asset**, **36 × 4 px**. Export once, reuse.

#### Official Sponsor Centerpiece — `2374:1308`

| Property | Value |
|---|---|
| Background | `rgba(255, 184, 0, 0.1)` |
| Border | 1px solid `#ffb800` |
| Border radius | **8px** |
| Layout | Vertical flex, `align-items: center`, `justify-content: center`, gap `--space-2` (8px) |
| Padding | `--space-12` (**48px**) horizontal / `--space-2` (**8px**) vertical |

> Note: this is the one place in the marquee where spacing **is** token-bound (`--space-12`, `--space-2`).

**Eyebrow row `2374:1309`** — horizontal flex, `align-items: center`, **gap 4px**

| Node id | Content | Font | Size | Weight | Color |
|---|---|---|---|---|---|
| `2374:1310` | `الراعي الرسمي` | Alexandria Bold | **10px** | 700 | `#ffb800` |
| `2374:1311` | `Ellipse` separator dot | SVG asset, **3 × 3 px** | — | — | — |
| `2374:1312` | `OFFICIAL SPONSOR` | Alexandria SemiBold | **10px** | 600 | `#ffb800`, `text-transform: uppercase` |

**Sponsor name `2374:1313`**: `ULTIMATE POWER SOLUTION` — Alexandria **Black 900**, **16px**,
line-height normal, `text-transform: uppercase`, `#ffffff`, `text-align: center`, `white-space: nowrap`.

> **Bilingual pattern:** the centerpiece pairs the Arabic label with its English equivalent separated by a dot.
> This is the approved bilingual eyebrow pattern for this bar. Preserve both.

---

### 3.4 Federation by the Numbers — `2374:1331` (layer named "Inner")

| Property | Value |
|---|---|
| Node id | `2374:1331` |
| Layer name in Figma | `Inner` — **generic/stale name** |
| Size | 1440 × **569** |
| y-offset | 939.41 |
| Background | `--color-surface-base` `#fdfcfb` |
| Layout | Vertical flex, `align-items: flex-start`, **gap 32px** |
| Padding | **64px on all four sides** (`--space-16`) |
| Content width | 1440 − 128 = **1312px** |

#### 3.4.1 Section head — `2374:1332`

Horizontal flex, `align-items: flex-end`, `justify-content: space-between`, full width, `overflow: clip`,
background `--color-surface-base`.

**"Updated" pill `2374:1333`** (visually at the **left**, i.e. the RTL end of the row)

| Property | Value |
|---|---|
| Background | `--color-surface-base` `#fdfcfb` |
| Border | 0.994px → **1px** solid `--color-border-default` `#e0dfdb` |
| Radius | `9999px` (pill) |
| Padding | **16px horizontal / 8px vertical** (`--space-4` / `--space-2`) |
| Text `2374:1334` | `⏱ محدَّث في 20 يوليو 2026` |
| Style | `Type/Caption` — Alexandria Regular 400, `--typography-caption-desktop` = 13, LH 1.4, `--color-text-secondary` `#616058`, `text-align: right`, nowrap |

> The `⏱` is a **literal emoji character in the text run**, not an icon node. Date format observed:
> `20 يوليو 2026` — day, Arabic month name, Gregorian year.

**Head Text `2374:1335`** (visually at the **right** — the RTL start): vertical flex,
`align-items: flex-start`, **gap 8px** (`--space-2`), `text-align: right`, `white-space: nowrap`

| Node id | Role | Copy | Style token | Font | Size | Weight | LH | Color |
|---|---|---|---|---|---|---|---|---|
| `2374:1336` | Section title (H2) | `الاتحاد بالأرقام` | `Type/H2` | Alexandria Bold | `--typography-h2-desktop` = 32 | 700 | 1.25 | `--color-text-primary` `#000000` |
| `2374:1337` | Source line | `المصدر: سجل العضوية الرسمي` | `Type/Caption` | Alexandria Regular | `--typography-caption-desktop` = 13 | 400 | 1.4 | `--color-text-secondary` `#616058` |

> **Data-provenance pattern (approved, reusable):** this section states its data source (`المصدر: …`) and its
> last-updated date. Carry this pattern into any CMS-driven statistics surface.

#### 3.4.2 Stats Grid — `2374:1338`

Horizontal flex, `align-items: flex-start`, **gap 16px** (`--space-4`), full width (1312).
**4 equal columns**, each `flex: 1 0 0` with `min-width: 0`.
Computed card width: (1312 − 3 × 16) / 4 = **316px**.

#### 3.4.3 Stat Card — shared specification

All four cards are structurally identical instances of `Stat Card`.

| Property | Value |
|---|---|
| Background | `--color-surface-base` `#fdfcfb` |
| Border | 1px solid `--color-border-default` `#e0dfdb` |
| Border radius | **16px** (`--radius-lg`) |
| Padding | **24px** all sides |
| Layout | Vertical flex, `align-items: flex-start`, **gap 16px** (`--space-4`) |
| Overflow | clip |
| Sizing | `flex: 1 0 0`, `min-width: 0` |

Card internals, top to bottom:

1. **`Top` row** — horizontal flex, `align-items: center`, `justify-content: space-between`, full width.
   - **Delta pill** — background `#e5f5ec` (**raw hex, no bound token** — a green-050 tint that is
     missing from the token set; classified **DESIGN SYSTEM GAP**), radius `9999px`,
     padding **12px horizontal / 4px vertical**. Text: Alexandria Medium 500, **13px**, LH normal,
     `--color-brand-primary` `#00843d`, nowrap, `dir="auto"`.
   - **Stat Icon Box** — **48 × 48 px**, background `#e5f5ec`, `border-radius: 12px`,
     vertical flex centred. Contains a **24 × 24 px** SVG icon.
2. **Value** — Alexandria **Black 900**, **40px**, LH normal, `--color-text-primary` `#000000`,
   `text-align: right`, full width. *(Matches `Type/H1`'s size/weight but is applied as a raw 40px, not bound
   to `--typography-h1-desktop`. See the PB-GAP / numeric-display gap in `CLAUDE.md` §7.)*
3. **`Labels`** — vertical flex, `align-items: flex-start`, **gap 2px**, `text-align: right`, full width.
   - Primary label: Alexandria Medium 500, **16px**, LH normal, `--color-text-primary` `#000000`
   - Sub-label: Alexandria Regular 400, **13px**, LH normal, `--color-text-secondary` `#616058`
4. **`Trend`** — vertical flex, `align-items: flex-start`, **gap 8px** (`--space-2`), full width.
   - Trend caption: `التطور خلال 5 سنوات` — Alexandria Medium 500, **13px**, LH normal,
     `--color-text-secondary` `#616058`, `text-align: right`. **Identical in all four cards.**
   - **Trend Bars** — horizontal flex, `align-items: flex-end`, **gap 6px**, full width.
     Five bars, each `flex: 1 0 0`, `min-width: 0`, `border-radius: 3px 3px 0 0` (top corners only).
     **Heights: 10, 16, 20, 26, 34 px.** Bars 1–4 fill `#e5f5ec`; **bar 5 fills
     `--color-brand-primary` `#00843d`** (the current year).
     ⚠️ **The bar heights are identical in all four cards** — this is decorative sparkline
     scaffolding, not real data. Wire to real per-metric data before shipping.
   - **Trend Years** — horizontal flex, `justify-content: space-between`, full width.
     Two labels `2022` and `2026`, Alexandria Regular 400, **13px**, LH normal,
     `--color-text-secondary` `#616058`, nowrap. **Identical in all four cards.**
5. **Divider** — 1px full-width rule, `--color-border-default` `#e0dfdb`.
6. **Card link** — Alexandria **SemiBold 600**, **13px**, LH normal,
   `--color-brand-primary` `#00843d`, `text-align: right`, full width. The `›` is a **literal text character**.

> **Weight note:** `SemiBold 600` at 13px is used for the card link, but no `Type/*` style in the token set
> defines a SemiBold 13px role (`Type/Label` is Medium 500 / 13). Recorded as observed —
> **DESIGN SYSTEM GAP** (a "link / inline action" text role is undefined).

#### 3.4.4 The four Stat Cards — content

| # | Card node | Icon | Icon node | Delta pill | Value | Value node | Primary label | Sub-label | Link | Link node |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1339` | `award` | `2374:1344` | `↑ +18 في 2026` | **186** | `2374:1346` | `ميدالية دولية` | `منذ تأسيس الاتحاد` | `سجل الإنجازات ›` | `2374:1362` |
| 2 | `2374:1363` | `trophy` | `2374:1368` | `↑ +4 بطولات` | **32** | `2374:1370` | `بطولة سنوية` | `وطنية ودولية معتمدة` | `جدول البطولات ›` | `2374:1386` |
| 3 | `2374:1387` | `activity` | `2374:1392` | `↑ +11٪ عن 2025` | **1,240+** | `2374:1394` | `رياضي مسجّل` | `ذكور وإناث، كل الفئات` | `سجل الرياضيين ›` | `2374:1410` |
| 4 | `2374:1411` | `users` | `2374:1416` | `↑ +3 هذا العام` | **48** | `2374:1418` | `نادي معتمد` | `في سبع إمارات` | `سجل الأندية ›` | `2374:1434` |

Sub-node ids per card (Top / Delta / Delta text / Icon Box / Labels / primary / sub / Trend / Bars / Years / Divider):

| Card | Top | Delta | Delta txt | Icon Box | Labels | Primary | Sub | Trend | Bars | Bar1–5 | Years | Y1/Y2 | Divider |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1340` | `2374:1341` | `2374:1342` | `2374:1343` | `2374:1347` | `2374:1348` | `2374:1349` | `2374:1350` | `2374:1352` | `2374:1353`–`1357` | `2374:1358` | `2374:1359`/`1360` | `2374:1361` |
| 2 | `2374:1364` | `2374:1365` | `2374:1366` | `2374:1367` | `2374:1371` | `2374:1372` | `2374:1373` | `2374:1374` | `2374:1376` | `2374:1377`–`1381` | `2374:1382` | `2374:1383`/`1384` | `2374:1385` |
| 3 | `2374:1388` | `2374:1389` | `2374:1390` | `2374:1391` | `2374:1395` | `2374:1396` | `2374:1397` | `2374:1398` | `2374:1400` | `2374:1401`–`1405` | `2374:1406` | `2374:1407`/`1408` | `2374:1409` |
| 4 | `2374:1412` | `2374:1413` | `2374:1414` | `2374:1415` | `2374:1419` | `2374:1420` | `2374:1421` | `2374:1422` | `2374:1424` | `2374:1425`–`1429` | `2374:1430` | `2374:1431`/`1432` | `2374:1433` |

> **Trend caption node ids:** `2374:1351`, `2374:1375`, `2374:1399`, `2374:1423`.

> **Copy note:** card 3's delta uses the **Arabic percent sign `٪` (U+066A)**, not the Latin `%`.
> Preserve it — this is correct Arabic numeric typography. Card 1's value `1,240+` uses Latin digits with a
> Latin comma group separator; all values on this page use **Latin (Western Arabic) digits**, consistently.

#### 3.4.5 Decorative swoosh graphics (Brand motif)

Four rotated SVG "swoosh" strokes, absolutely positioned, escaping the section bounds. Each is wrapped in a
centring frame and the inner element is rotated **−35°**.

| Node id | Asset name (Arabic) | Meaning | Inner size | Wrapper box | Wrapper position |
|---|---|---|---|---|---|
| `2737:2` | `خط أحمر — Red Swoosh` | Red line | 202 × 23 | 178.661 × 134.703 | left **−30**, top **−120.86** |
| `2737:3` | `خط أخضر — Green Swoosh` | Green line | 289 × 38 | 258.531 × 196.891 | left **−10**, top **−140.76** |
| `2737:4` | `خط أسود — Black Swoosh` | Black line | 231 × 26 | 204.137 × 153.794 | left **1236**, top **445.59** |
| `2737:5` | `خط أحمر صغير — Red Swoosh Small` | Small red line | 145 × 17 | 128.528 × 97.094 | left **1297**, top **502.59** |

> This is the **diagonal brand motif** referenced in the project's flat-color + graphic direction. Two strokes
> (red + green) bleed off the **top-left**; two (black + small red) bleed off the **bottom-right** —
> a diagonal counterpoint across the section. All four are SVG; export and reuse rather than redrawing.
> Note the negative offsets mean the section must **not** be `overflow: hidden` at the section level, or the
> top-left pair will be clipped.


---

### 3.5 Clubs Network — `2374:1435`

| Property | Value |
|---|---|
| Node id | `2374:1435` |
| Name | `Clubs` |
| Size | 1440 × **329.11** |
| y-offset | 1508.41 |
| Background | `--color-surface-base` `#fdfcfb` |
| Layout | Vertical flex, `align-items: center`, **gap 24px** |
| Padding | **64px horizontal** (`--space-16`) / **48px vertical** (`--space-12`) |

#### 3.5.1 Section header — `2374:1436`

Horizontal flex, `align-items: center`, `justify-content: space-between`, full width (1312),
`overflow: clip`, `white-space: nowrap`, background `--color-surface-base`.

| Node id | Role | Copy | Font | Size | Weight | LH | Color | Align |
|---|---|---|---|---|---|---|---|---|
| `2374:1437` | "View all" link (visually **left** / RTL end) | `عرض الكل +` | Alexandria SemiBold | **13px** | 600 | normal | `--color-brand-primary` `#00843d` | — |
| `2374:1439` | Section title (H2) | `الأندية الأعضاء` | Alexandria Bold (`Type/H2`) | `--typography-h2-desktop` = 32 | 700 | 1.25 | `--color-text-primary` `#000000` | right |
| `2374:1440` | Subtitle | `8 أندية رياضية ممثلة في البطولة الوطنية` | Alexandria Regular (`Type/Caption`) | `--typography-caption-desktop` = 13 | 400 | 1.4 | `--color-text-secondary` `#616058` | right |

`Title` group `2374:1438`: vertical flex, `align-items: flex-end`, **gap 8px** (`--space-2`),
`text-align: right`, `overflow: clip`.

> **Section-header pattern differs from §3.4.** Here the title stack is `align-items: flex-end` and the
> action is a `عرض الكل +` link; in Federation-by-the-Numbers the title stack is `flex-start` and the
> right-hand slot is an "updated" pill. Two different header treatments coexist on the page. Recorded as
> observed — normalizing them is **DESIGN DECISION REQUIRED**, not a licence to unify unilaterally.
>
> **Copy note:** the `+` in `عرض الكل +` is a **literal text character**, and this section uses `+` where
> §3.4's cards use `›`. Inconsistent affordance glyph — recorded, not fixed.

#### 3.5.2 Club Marquee — `2374:1441`

| Property | Value |
|---|---|
| Node id | `2374:1441` |
| Name | `Club Marquee` |
| Layout | Horizontal flex, `align-items: flex-start`, **gap 16px** (`--space-4`), full width |
| Overflow | clip |
| Track height | **143.11 px** |
| Cards | 8, each **174.913 × 143.11** |

**Edge fades** (both 79.506 × 143.11, absolute, top 0):

| Node id | Name | Position | Gradient |
|---|---|---|---|
| `2374:1442` | `Fade Left` | left 0 | left→right: `rgba(255,255,255,0)` → `#ffffff` |
| `2374:1507` | `Fade Right` | right **−0.4** | left→right: `#ffffff` → `rgba(255,255,255,0)` |

> ⚠️ **The fade gradients terminate in pure `#ffffff`, but the section background is
> `--color-surface-base` `#fdfcfb`.** The fades will show as faint white blooms against the off-white
> section. Bind the fade endpoint to `--color-surface-base` to match. Classified:
> **DESIGN DECISION REQUIRED** (colour correction to an approved composition).
>
> ⚠️ `Fade Right` sits at `right: -0.4px` — a 0.4px sub-pixel misalignment. Implement at `right: 0`.
>
> **Motion:** this is a *marquee*, but the composition is a static row. **Scroll/animation behaviour is
> NOT EXTRACTED — no motion specification exists in the Figma frame.** Apply the same contract as
> `CMP-CAROUSEL-001` (pause on hover/focus/touch, `prefers-reduced-motion` aware) only after confirming with
> the design owner; do not fabricate a motion spec (`CLAUDE.md` §13).

#### 3.5.3 Club Card — shared specification (`CMP-CLUBCARD-001`)

Full layer name on every one of the 8 cards (an approved governance annotation — preserve it):
`Club Card [G.13-compliant: entity badge color confined to crest asset]`

> **Governing rule G.13 recorded in the design:** a club's own brand colour is permitted **only inside the
> crest asset**. It must not leak into the rest of the UI. Every card honours this: the card's own gradient
> and the shield fill both derive from the club colour, but the border, radius, typography and layout stay
> federation-standard. Do not introduce club colour anywhere else.

| Property | Value |
|---|---|
| Size | **174.913 × 143.11** |
| Border | 0.994px → **1px** solid `--color-brand-primary` `#00843d` (federation green on **every** card) |
| Border radius | **16px** (`--radius-lg`) |
| Background | vertical linear gradient, club colour → dark tone (per-card, see table) |
| Shadow | `0px 5.963px 15.901px -5.963px rgba(0,0,0,0.07)` → **implement `0px 6px 16px -6px rgba(0,0,0,0.07)`** |
| Overflow | clip |
| Layout | Vertical flex, `align-items: flex-start` |

**`content` sub-frame** — `flex: 1 0 0`, vertical flex, `align-items: center`, `justify-content: center`,
**gap 10px**, **padding 12px** (`--space-3`), full width, `min-height: 0`.

**`club-crest`** — **63.605 × 63.605** (→ **64 × 64**), background `#ffffff`,
border 0.994px → **1px** solid `rgba(255,255,255,0.2)`, `border-radius: 32px` (circle),
`drop-shadow(0px 5.963px 6.957px rgba(0,0,0,0.2))` → **`0px 6px 7px`**, vertical flex centred.

**`shield`** (inside the crest) — **55.654 × 55.654** (→ **56 × 56**), background = the club colour,
border 0.994px → **1px** solid `rgba(255,255,255,0.15)`, `border-radius: 28px` (circle), vertical flex centred.
Contains:
- **Sport icon** — **25.839 × 25.839** (→ **26 × 26**) SVG, white glyph.
- **City name** — absolutely positioned: `bottom: 15.9px`, `left: calc(50% + δ)`,
  `translate(-50%, 100%)`. Alexandria **Bold 700**, **8.944px**, LH normal, `text-align: center`,
  `#ffffff`, `white-space: nowrap`, `dir="auto"`.

> ### R8 — Club shield city-name micro-label: **RESOLVED — ADR-0041**
>
> The **8.944px** city-name label is exactly the R8 item in `CLAUDE.md` §5. It is below the 13px general
> minimum, and it is **formally permitted** by **ADR-0041 (Club Shield City-Name Exception)**, documented at
> Design System **Chapter 4 §4.15b**, cross-referenced from **Chapter 8 L8**
> (`08-L8-Sports-Components.md`).
>
> The exception is **narrowly scoped and non-transferable**: it applies **only** to
> `CMP-CLUBCARD-001`'s crest-circle city-name label. **Do not generalize it** to the 11px social-sidebar
> label, the 11px sponsor wordmarks, or the 10px sponsor-centerpiece labels. No further owner decision is
> required for this item — implement 8.944px here (**8.94px**), and do not re-audit it.

**Club name** — Alexandria **Bold 700**, **13px**, LH normal, `text-align: center`, `#ffffff`,
`min-width: 100%`, `width: min-content` (i.e. wraps within the card width), `dir="auto"`.

#### 3.5.4 The eight clubs — content

| # | Card node | Crest | Shield | Icon | Icon node | Club colour (gradient from) | Gradient to | City label | City node | Club name | Name node |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1443` | `2374:1445` | `2374:1446` | `activity` | `2374:1447` | `#0b5fa5` | `#0b1f3b` | `دبي` | `2374:1449` | `نادي دبي لألعاب القوى` | `2374:1450` |
| 2 | `2374:1451` | `2374:1453` | `2374:1454` | `landmark` | `2374:1455` | `#dc2626` | `#1a0f0a` | `أبوظبي` | `2374:1457` | `نادي أبوظبي الرياضي` | `2374:1458` |
| 3 | `2374:1459` | `2374:1461` | `2374:1462` | `zap` | `2374:1463` | `#f97316` | `#2a140b` | `الشارقة` | `2374:1465` | `نادي الشارقة لألعاب القوى` | `2374:1466` |
| 4 | `2374:1467` | `2374:1469` | `2374:1470` | `star` | `2374:1471` | `#7c3aed` | `#1a0f2a` | `العين` | `2374:1473` | `نادي العين` | `2374:1474` |
| 5 | `2374:1475` | `2374:1477` | `2374:1478` | `flame` | `2374:1479` | `#ea580c` | `#2a140b` | `عجمان` | `2374:1481` | `نادي عجمان الرياضي` | `2374:1482` |
| 6 | `2374:1483` | `2374:1485` | `2374:1486` | `mountain` | `2374:1487` | `#1e3a8a` | `#0b1f3b` | `الفجيرة` | `2374:1489` | `نادي الفجيرة` | `2374:1490` |
| 7 | `2374:1491` | `2374:1493` | `2374:1494` | `star` | `2374:1495` | `#dc2626` | `#1a0f0a` | `رأس الخيمة` | `2374:1497` | `نادي رأس الخيمة` | `2374:1498` |
| 8 | `2374:1499` | `2374:1501` | `2374:1502` | `bird` | `2374:1503` | `#38bdf8` | `#0b1f3b` | `بني ياس` | `2374:1505` | `نادي بني ياس` | `2374:1506` |

Per-card city-label horizontal nudge (`left: calc(50% + δ)`) — optical centring for each Arabic string:

| Card | 1 دبي | 2 أبوظبي | 3 الشارقة | 4 العين | 5 عجمان | 6 الفجيرة | 7 رأس الخيمة | 8 بني ياس |
|---|---|---|---|---|---|---|---|---|
| δ | +0.05 | +0.10 | +0.11 | +0.08 | **−0.40** | +0.10 | +0.16 | +0.12 |

> These sub-pixel nudges are Figma text-measurement artifacts, not design intent.
> **Implement all eight as `left: 50%; transform: translateX(-50%)`.**

> **Content notes.**
> - Cards 2 and 7 share the identical colour pair (`#dc2626` → `#1a0f0a`); cards 3 and 5 share
>   `→ #2a140b`; cards 1, 6, 8 share `→ #0b1f3b`. The dark end of the gradient is drawn from a small
>   set of tones rather than being unique per club.
> - Card 7 (`رأس الخيمة`) reuses the **same `star` icon** as card 4 (`العين`), but as a **separate exported
>   asset** with a different hash. Deduplicate on export.
> - The subtitle says **8 clubs**, and 8 cards are present — consistent. `عرض الكل +` implies a fuller
>   directory exists behind it.
> - Club **crest artwork is NOT EXTRACTED — it does not exist.** Every crest is a generic Lucide-style
>   sport glyph (`activity`, `landmark`, `zap`, `star`, `flame`, `mountain`, `bird`) standing in for the real
>   club crest. Real crest assets must be sourced before production.

#### 3.5.5 Decorative swoosh graphics

Same four-stroke diagonal brand motif as §3.4.5, scaled down. All rotated **−35°**.

| Node id | Asset | Inner size | Wrapper box | Wrapper position |
|---|---|---|---|---|
| `2737:6` | `خط أحمر — Red Swoosh` | 132.961 × 15.139 | 117.598 × 88.664 | left **−19.75**, top **−81.26** |
| `2737:7` | `خط أخضر — Green Swoosh` | 190.226 × 25.012 | 170.17 × 129.598 | left **−6.58**, top **−94.36** |
| `2737:8` | `خط أسود — Black Swoosh` | 152.049 × 17.114 | 134.367 × 101.23 | left **1308.36**, top **229.78** |
| `2737:9` | `خط أحمر صغير — Red Swoosh Small` | 95.442 × 11.19 | 84.6 × 63.909 | left **1366.94**, top **254.35** |

> Same top-left (red + green) / bottom-right (black + small red) diagonal arrangement as §3.4.5, at roughly
> 0.66× the scale. These are **separate exported assets** from the §3.4.5 set (different hashes) despite being
> the same artwork — deduplicate on export and scale in CSS.


---

### 3.6 Featured Athletes — `2374:1508` (layer named "Inner")

| Property | Value |
|---|---|
| Node id | `2374:1508` |
| Layer name in Figma | `Inner` — **generic/stale name** (same stale name as §3.4) |
| Size | 1440 × **944** |
| y-offset | 1837.52 |
| Background | `--color-surface-base` `#fdfcfb` |

Three stacked blocks plus four decorative swooshes:

| Block | Node id | y (within section) | Size |
|---|---|---|---|
| `Head` | `2374:1509` | 0 | 1440 × 118 |
| `filters-wrap` | `2374:1514` | 118 | 1407 × 52 |
| `carousel-and-controls` | `2374:1524` | 170 | 1440 × 774 |

> ⚠️ `filters-wrap` is **1407 px wide, not 1440** — a 33px shortfall. Recorded as observed; implement at
> full width with the 33.5px padding described below.

**Horizontal padding for this section is 33.5px**, not the page-standard 64px. Content width is therefore
1440 − 67 = **1373px**, not 1312px. This section breaks the page's container rhythm.
Classified: **DESIGN DECISION REQUIRED** — reconcile against the 64px gutter used by §3.4, §3.5 and others.

#### 3.6.1 Head — `2374:1509`

Horizontal flex, `align-items: flex-end`, `justify-content: space-between`,
padding **33.5px horizontal**, **24px top / 16px bottom**, background `--color-surface-base`.

`Head Text` `2374:1511` — `flex: 1 0 0`, vertical flex, `align-items: flex-end`, **gap 6px**,
`text-align: right`, `min-width: 0`.

| Node id | Role | Copy | Style token | Font | Size | Weight | LH | Color |
|---|---|---|---|---|---|---|---|---|
| `2374:1512` | Section title (H2) | `رياضيونا المميزون` | `Type/H2` | Alexandria Bold | `--typography-h2-desktop` = 32 | 700 | 1.25 | `--color-text-primary` `#000000` |
| `2374:1513` | Subtitle | `نخبة الرياضيين المعتمدين في سجل الاتحاد بأفضل أرقامهم الشخصية` | `Type/Caption` | Alexandria Regular | `--typography-caption-desktop` = 13 | 400 | 1.4 | `--color-text-secondary` `#616058` |

> The `Head` frame is a `space-between` row containing **only one child**. There is no action link on the
> right. Recorded as observed.

#### 3.6.2 Discipline filters — `2374:1514`

Wrapper `2374:1514`: horizontal flex, `align-items: flex-start`, `justify-content: flex-end`,
padding **33.5px horizontal**.
`Filters` `2374:1515`: horizontal flex, `align-items: center`, **gap 8px** (`--space-2`),
**322 × 52**, `overflow: clip`, background `--color-surface-base`.

**Filter chip — shared spec:** full height (52px), `border-radius: 9999px` (pill),
border 0.994px → **1px** solid, padding **20px horizontal / 11px vertical**, horizontal flex centred,
`overflow: clip`. Label: `Type/Label` — Alexandria Medium 500, `--typography-label-desktop` = **13px**,
LH 1.3, `text-align: right`, `dir="auto"`, fixed height 16px.

| # | Node id | Label node | Copy | Meaning | State | Background | Border | Text color | Label width |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1516` | `2374:1517` | `مضمار` | Track | default | `--color-surface-base` `#fdfcfb` | `--color-border-default` `#e0dfdb` | `--color-text-primary` `#000000` | 42 |
| 2 | `2374:1518` | `2374:1519` | `ميدان` | Field | default | `--color-surface-base` | `--color-border-default` | `--color-text-primary` | 37 |
| 3 | `2374:1520` | `2374:1521` | `طرق` | Road | default | `--color-surface-base` | `--color-border-default` | `--color-text-primary` | 28 |
| 4 | `2374:1522` | `2374:1523` | `الكل` | All | **SELECTED** | `#e5f5ec` (raw hex — same untokenized green tint as §3.4) | `--color-brand-primary` `#00843d` | `--color-brand-primary` `#00843d` | 26 |

> **Selected-chip pattern (approved, reusable):** tinted green background + green border + green text.
> Reuse this exact treatment for any filter/chip selection state elsewhere.
>
> RTL order: `الكل` (All) is the **rightmost / first** chip, then `طرق`, `ميدان`, `مضمار` leftward.

#### 3.6.3 Athletes carousel — `2374:1524` / `2374:1525`

`carousel-and-controls` `2374:1524`: 1440 × 774 at y 170.
`Athletes Row` `2374:1525`: **1373 × 505** at x 33.5, y 67.4 (relative to `2374:1524`).

> **This is a coverflow / focus carousel, not a uniform grid.** The five cards are absolutely positioned at
> different sizes and vertical offsets, producing a depth effect with the champion card largest and centred.
> **Card sizes and offsets are load-bearing** — reproduce them, or reproduce the equivalent scale ramp.

| Position | Card node | Athlete | x | y | Width | Height | Scale vs. centre |
|---|---|---|---|---|---|---|---|
| far right (RTL: first) | `2374:1526` | Maryam Al-Shamsi | 22.807 | 49.186 | **243.832** | **431.977** | 0.677 |
| right | `2374:1541` | Sarah Al-Kaabi | 266.638 | 34.109 | **245.808** | **443.141** | 0.683 |
| **centre (focused)** | `2374:1556` | Khaled Al-Mansoori | 512.446 | **−7.5** | **360** | **520** | **1.000** |
| left | `2374:1573` | Hamdan Al-Mazrouei | 872.446 | 32.657 | **240.574** | **440.313** | 0.668 |
| far left (RTL: last) | `2374:1588` | Abdullah Al-Nuaimi | 1130.381 | 38.133 | **237.173** | **428.735** | 0.659 |

> The centre card is ~1.5× the flanking cards and rises 7.5px above the row's top edge — so the row must not
> be `overflow: hidden` vertically. Side cards are **not** symmetrical (243.8 / 245.8 vs 240.6 / 237.2);
> these are hand-placed, not generated. Implement a clean symmetric ramp if the carousel is real
> (e.g. 1.0 centre, ~0.68 adjacent, ~0.66 outer) rather than reproducing the asymmetry —
> but confirm first: classified **DESIGN DECISION REQUIRED**.

#### 3.6.4 Athlete Card — shared specification

| Property | Standard card | Champion (centre) card |
|---|---|---|
| Background | `#0f1115` (**raw hex, no token** — near-black, distinct from `--color-gray-950` `#131210`) | same |
| Border | none | **3.975px → 4px solid `#ce1126`** |
| Border radius | **16px** (`--radius-lg`) | **16px** |
| Shadow | `0px 11.926px 23.852px -3.975px rgba(0,0,0,0.25)` → **`0px 12px 24px -4px`** | `0px 0px 19.876px rgba(206,17,38,0.2)` **+** `0px 19.876px 39.753px -9.938px rgba(0,0,0,0.38)` → **`0 0 20px rgba(206,17,38,.2), 0 20px 40px -10px rgba(0,0,0,.38)`** |
| Overflow | clip | clip |
| Layout | Vertical flex, `align-items: flex-start` | same |

> ⚠️ **Colour-token conflict.** The champion card's border and glow use **`#ce1126`**, but the Champion
> Badge inside it binds the token `color/semantic/achievement` = **`#c8102e`**. Two different Federation
> Reds, 3 units apart, on the same component. `#c8102e` is the tokenized value.
> Classified: **DESIGN DECISION REQUIRED** — almost certainly `#ce1126` should be re-bound to
> `color/semantic/achievement`, but per `CLAUDE.md` §2 the correction must be authorized.

**`Photo` block**

- Height: **320px** (cards 1, 5) / **340px** (cards 2, 4) / **420px** (centre card), full card width.
- Raster PNG, `object-fit: cover`, `pointer-events: none`.
- **Scrim overlay** on top of the photo (all cards, identical): vertical gradient
  `rgba(0,0,0,0)` from **40%** → `rgba(0,0,0,0.8)` at 100%.
- **Rank Badge** — absolute at **left 15.9px → 16px, top 15.9px → 16px**, **35.778 × 35.778 → 36 × 36**,
  background `rgba(0,0,0,0.55)`, `border-radius: 10px`, flex centred.
  Number: Alexandria **Bold 700**, **16px**, LH normal, `#ffffff`, nowrap.
- **Athlete name** — absolute, `left: <N>px`, `transform: translateX(-100%)`, `text-align: right`,
  Alexandria **ExtraBold 800**, `#ffffff`, LH normal, `dir="auto"`. Size and position vary per card (table below).
- **Champion Badge** (centre card only) — `2374:1561`: absolute **right 16px, top 16px**,
  background token **`color/semantic/achievement`** `#c8102e`, `border-radius: 999px`,
  padding **10px horizontal / 4px vertical**, flex centred.
  Text `2374:1562`: `بطل الإمارات` ("UAE Champion") — Alexandria **Bold 700**, **13px**, LH normal, `#ffffff`, nowrap.

**`Body` block** — background `#0f1115`, vertical flex, `align-items: flex-start`,
**gap 12px** (`--space-3`), **padding 16px** (`--space-4`), full width.

1. **`PB Row`** — horizontal flex, `align-items: center`, **gap 8px** (`--space-2`), full width.
   - **`PB Text`** — `flex: 1 0 0`, vertical flex, `align-items: flex-start`, **gap 2px**,
     `text-align: right`, `white-space: nowrap`, `min-width: 0`.
     - PB label: `أفضل رقم شخصي` ("Personal best") — Alexandria **SemiBold 600**, **13px**, LH normal,
       `#9ca3af` (**raw hex, no token** — a light grey for dark surfaces that the token set lacks;
       classified **DESIGN SYSTEM GAP**). **Identical on all five cards.**
     - PB value: Alexandria **Black 900**, **20px** (standard) / **26px** (centre), LH normal, `#ffffff`.
   - **`Discipline Accent`** — **8 × 8 px** SVG dot. A separate exported asset per card
     (colour-codes the discipline). Colours **NOT EXTRACTED — baked into each SVG**; recover from the
     exported assets.
2. **Divider** — 1px full-width rule, `rgba(255,255,255,0.1)`.
3. **`Footer Row`** — horizontal flex, `align-items: center`, `justify-content: space-between`, full width,
   Alexandria **SemiBold 600**, **14px**, LH normal, `text-align: right`, nowrap.
   - Discipline (right in DOM order): `--color-brand-primary` `#00843d`
   - Rank (left): `#9ca3af`

#### 3.6.5 The five athletes — content

| # | Card | Athlete name (Arabic) | Name node | Name size | Name `left` / `top` / `width` | Rank | Rank badge node | PB value | PB node | PB size | Discipline | Disc. node | Rank label | Rank label node | Photo h | Photo node |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1526` | `مريم الشامسي` | `2374:1530` | **22px** | 209.88 / 260 / 190 | 4 | `2374:1528` (`2374:1529`) | `6.85 م` | `2374:1535` | **20px** | `قفز طويل` (Long jump) | `2374:1539` | `المرتبة: 4` | `2374:1540` | 320 | `2374:1527` |
| 2 | `2374:1541` | `سارة الكعبي` | `2374:1545` | **24px** | 229.88 / 280 / 210 | 2 | `2374:1543` (`2374:1544`) | `52.34 ث` | `2374:1550` | **20px** | `عداءة 400م` (400 m runner, fem.) | `2374:1554` | `المرتبة: 2` | `2374:1555` | 340 | `2374:1542` |
| 3 | `2374:1556` | `خالد المنصوري` | `2374:1560` | **32px** | 339.88 / 340 / 320 | **1** | `2374:1558` (`2374:1559`) | `20.45 ث` | `2374:1567` | **26px** | `عداء 200م` (200 m runner) | `2374:1571` | `المرتبة: 1` | `2374:1572` | 420 | `2374:1557` |
| 4 | `2374:1573` | `حمدان المزروعي` | `2374:1577` | **24px** | 229.88 / 280 / 210 | 5 | `2374:1575` (`2374:1576`) | `10.12 ث` | `2374:1582` | **20px** | `عداء 100م` (100 m runner) | `2374:1586` | `المرتبة: 5` | `2374:1587` | 340 | `2374:1574` |
| 5 | `2374:1588` | `عبدالله النعيمي` | `2374:1592` | **22px** | 209.88 / 260 / 190 | 3 | `2374:1590` (`2374:1591`) | `58.20 م` | `2374:1597` | **20px** | `رمي القرص` (Discus throw) | `2374:1601` | `المرتبة: 3` | `2374:1602` | 320 | `2374:1589` |

Body / PB Row / PB Text / Divider node ids:

| # | Body | PB Row | PB Text | PB label | Accent | Divider | Footer Row |
|---|---|---|---|---|---|---|---|
| 1 | `2374:1531` | `2374:1532` | `2374:1533` | `2374:1534` | `2374:1536` | `2374:1537` | `2374:1538` |
| 2 | `2374:1546` | `2374:1547` | `2374:1548` | `2374:1549` | `2374:1551` | `2374:1552` | `2374:1553` |
| 3 | `2374:1563` | `2374:1564` | `2374:1565` | `2374:1566` | `2374:1568` | `2374:1569` | `2374:1570` |
| 4 | `2374:1578` | `2374:1579` | `2374:1580` | `2374:1581` | `2374:1583` | `2374:1584` | `2374:1585` |
| 5 | `2374:1593` | `2374:1594` | `2374:1595` | `2374:1596` | `2374:1598` | `2374:1599` | `2374:1600` |

> **⚠️ Card 4 (`حمدان المزروعي`) has an accidental rotation.** Its `Photo` sits inside an extra wrapper
> `2374:1574` (343.571px tall) whose contents are **rotated −0.86°**. No other card has this. The 3.571px
> height difference vs. the 340px photo is the rotation's bounding-box growth.
> **This is a defect — implement at 0° rotation, 340px photo height.** Classified: **VERIFIED DEFECT**,
> safe to correct (it is a geometry accident, not a design decision).

> **⚠️ Rank ordering is not display order.** Reading RTL the cards run 4, 2, **1**, 5, 3. The champion (1) is
> centred by design, but the flanking order (4, 2 | 5, 3) is not a sensible ranking sequence. Expected for a
> centred coverflow would be 5, 3, **1**, 2, 4 or similar. Classified: **DESIGN DECISION REQUIRED**.

> ### PB-GAP — refined evidence (supersedes the estimate in `CLAUDE.md` §7)
>
> `CLAUDE.md` §7 records the gap as "22px × 4, approximately 26px × 1". **Direct measurement of all five
> cards shows the actual distribution is different and the gap is wider than recorded:**
>
> | Undefined size | Count | Where |
> |---|---|---|
> | **20px** | 4 | PB values on cards 1, 2, 4, 5 |
> | **26px** | 1 | PB value on the champion card |
> | **22px** | 2 | Athlete names on cards 1 and 5 |
> | **24px** | 2 | Athlete names on cards 2 and 4 |
>
> The approved typography scale defines 40 (H1), 32 (H2), 16, 14, 13. **None of 20, 22, 24, 26 is a defined
> role.** So there are **two** distinct undefined roles here, not one:
> 1. a **numeric / statistic display** role (20 / 26 px, Alexandria Black 900), and
> 2. an **athlete-name display** role (22 / 24 / 32 px, Alexandria ExtraBold 800) — note ExtraBold 800 is
>    itself a weight no `Type/*` style defines.
>
> Both scale **with carousel focus state**, which suggests the sizes are a responsive/emphasis ramp rather
> than fixed roles. **Classified: DESIGN SYSTEM GAP — still open, and broader than previously recorded.**
> Do not map 20→16, 22→24, 24→24, or 26→24 autonomously. The Design System owner must decide whether to
> create the two roles above (each with a focus/unfocused ramp) or map them onto existing roles.

#### 3.6.6 Carousel controls — `2374:1603`

| Property | Value |
|---|---|
| Node id | `2374:1603` |
| Size | **1373 × 134.2**, at x 33.5, y 572.4 within `2374:1524` |
| Background | `#ffffff` — ⚠️ **raw white on an `--color-surface-base` `#fdfcfb` section.** Will read as a visible lighter band. Classified: **DESIGN DECISION REQUIRED** |
| Layout | Horizontal flex, `align-items: center`, `justify-content: center`, **gap 10px** |

| Node id | Element | Detail |
|---|---|---|
| `2374:1604` | `Nav Arrow` (prev) | **77.518 × 58.635** — a **pill, not a circle**; `border-radius: 9999px`, background `#ffffff`, border 0.994px → 1px solid `#dee0e3` (raw hex), `overflow: clip` |
| `2374:1605` | glyph | `‹` — **`Inter SemiBold 600`, 14px**, `#000000`, nowrap |
| `2374:1606` | `Pagination Dots` | **128.203 × 20.87**, single flattened **SVG**. **NOT EXTRACTED — per-dot states are baked into one SVG** |
| `2374:1612` | `Nav Arrow` (next) | same as `2374:1604` |
| `2374:1613` | glyph | `›` — **`Inter SemiBold 600`, 14px**, `#000000`, nowrap |

> **⚠️ Two defects here, both worth recording.**
> 1. **Wrong typeface.** These arrow glyphs use **Inter SemiBold**, while the hero's carousel arrows
>    (§3.2.6) use **Alexandria Bold 16px**. Inter appears nowhere else on this page and is not in the
>    approved type stack. Classified: **DESIGN DECISION REQUIRED** (almost certainly should be Alexandria).
> 2. **Inconsistent arrow component.** Hero arrows are 44 × 44 circles with no border on
>    `--color-surface-raised`; these are 77.5 × 58.6 bordered pills on raw white. Two different "Nav Arrow"
>    treatments on one page. Classified: **DESIGN DECISION REQUIRED** — consolidate to one approved
>    `Nav Arrow` component.

#### 3.6.7 Decorative swoosh graphics

Same four-stroke diagonal motif, here as **direct vector children** of the section (not wrapped in rotation
frames — the rotation is baked into the vector bounds).

| Node id | Asset | x | y | Width | Height |
|---|---|---|---|---|---|
| `2737:10` | `خط أحمر — Red Swoosh` | **−30** | 130 | 178.661 | 134.703 |
| `2737:11` | `خط أخضر — Green Swoosh` | **−10** | 160 | 258.531 | 196.891 |
| `2737:12` | `خط أسود — Black Swoosh` | 1240 | 923 | 204.137 | 153.794 |
| `2737:13` | `خط أحمر صغير — Red Swoosh Small` | 1329 | 911 | 128.528 | 97.094 |

> Same dimensions as the §3.4.5 set (178.661 / 258.531 / 204.137 / 128.528), positioned **inside** the
> section here rather than bleeding off the top. The bottom-right pair at y 923/911 does bleed past the
> section's 944px height.


---

### 3.7 Results & Rankings + Upcoming Events — `2374:1614`

| Property | Value |
|---|---|
| Node id | `2374:1614` |
| Name | `Results & Events` |
| Size | 1440 × **913** |
| y-offset | 2781.52 |

**Two-column section.** This is the only two-column section on the page.

| Column | Node id | x | y | Width | Height |
|---|---|---|---|---|---|
| Results (RTL: right / first) | `2374:1615` | **64** | 64 | **614** | 662 |
| Upcoming Events (RTL: left / second) | `2374:1685` | **710** | 64 | **676** | 835 |

- Left gutter 64, right gutter 1440 − (710 + 676) = **54** ⚠️ (asymmetric — should be 64; recorded as observed)
- Inter-column gap: 710 − (64 + 614) = **32px**
- ⚠️ The Events column is **835 px tall** but the section is 913 with a 64px top offset → it ends at 899,
  leaving only 14px bottom padding, vs. the Results column's 187px. Columns are **not** height-matched.

> **IA confirmation (`CLAUDE.md` §11).** This section pairs *Results & Rankings* with *Upcoming Events*
> exactly as the approved IA describes for the Homepage. The Events column's expand link leads to the deeper
> schedule. **This is not an IA defect.** Do not merge or rename.

Decorative swooshes (top-left pair only — no bottom-right pair in this section):

| Node id | Asset | x | y | Width | Height |
|---|---|---|---|---|---|
| `2737:14` | `خط أحمر — Red Swoosh` | **−30** | −5 | 178.661 | 134.703 |
| `2737:15` | `خط أخضر — Green Swoosh` | **−10** | 25 | 258.531 | 196.891 |

---

#### 3.7.1 Results column — `2374:1615`

Vertical flex, `align-items: flex-start`, **gap 24px**, background `--color-surface-base` `#fdfcfb`.

**`Head` `2374:1616`** — vertical flex, `align-items: flex-start`, **gap 12px** (`--space-3`), full width, `overflow: clip`.

**Tabs `2374:1617`** — horizontal flex, `align-items: flex-start`, `justify-content: flex-end`,
**gap 8px** (`--space-2`), full width.

Tab spec: `border-radius: 9999px`, border 0.994px → **1px** solid, padding **20px horizontal / 11px vertical**,
flex centred, `overflow: clip`. Label: `Type/Label` — Alexandria Medium 500, **13px**, LH 1.3,
`text-align: right`, nowrap.

| # | Node id | Label node | Copy | Meaning | State | Background | Border | Text |
|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1618` | `2374:1619` | `الترتيب الوطني` | National Rankings | default | `--color-surface-base` `#fdfcfb` | `--color-border-default` `#e0dfdb` | `--color-text-primary` `#000000` |
| 2 | `2374:1620` | `2374:1621` | `أحدث النتائج` | Latest Results | **SELECTED** | `--color-text-primary` `#000000` | `--color-text-primary` `#000000` | `--color-surface-base` `#fdfcfb` |

> ⚠️ **Two different selected-state treatments on one page.** These tabs use **solid black fill + inverse
> text**; the §3.6.2 discipline filters and §3.7.2 event filters use **green tint + green border + green
> text**. Both are pill chips of identical geometry. Classified: **DESIGN DECISION REQUIRED** — one
> component with one selected style, or two documented variants (`Tab` vs `Filter`).
>
> RTL order: `أحدث النتائج` is the **rightmost / first** tab and is selected.

**Head Text `2374:1622`** — vertical flex, `align-items: flex-start`, **gap 8px**, `text-align: right`, full width.

| Node id | Role | Copy | Style token | Size | Weight | LH | Color |
|---|---|---|---|---|---|---|---|
| `2374:1623` | Title (H2) | `النتائج والترتيب الوطني` | `Type/H2` Alexandria Bold | 32 | 700 | 1.25 | `--color-text-primary` |
| `2374:1624` | Context line | `البطولة الوطنية للناشئين - دبي، 12 يوليو 2026` | `Type/Caption` Alexandria Regular | 13 | 400 | 1.4 | `--color-text-secondary` |

**`Badges` row `2374:1625`** — horizontal flex, `align-items: center`, `justify-content: space-between`,
full width, `overflow: clip`. Three items:

| Node id | Copy | Font | Size | Weight | LH | Color | Container |
|---|---|---|---|---|---|---|---|
| `2374:1626` | `⬇ تحميل ملف النتائج (PDF)` | Alexandria Medium (`Type/Label`) | 13 | 500 | 1.3 | `--color-brand-primary` `#00843d` | none (bare text link) |
| `2374:1628` (in `2374:1627`) | `✓ نتائج معتمدة رسميًا` | Alexandria Medium (`Type/Label`) | 13 | 500 | 1.3 | `--color-brand-primary` `#00843d` | pill `2374:1627`: background `#e5f5ec`, `border-radius: 9999px`, padding **12px / 6px**, `overflow: clip` |
| `2374:1629` | `عرض الكل +` | Alexandria **SemiBold** | 13 | 600 | normal | `--color-brand-primary` `#00843d` | none |

> `⬇` and `✓` are **literal text characters**, not icons. The "officially certified results" pill
> (`نتائج معتمدة رسميًا`) is a **trust/authority marker** — an approved pattern for a federation surface.
> Note the two links here use **different weights** (Medium 500 vs SemiBold 600) at the same 13px — recorded
> as observed, inconsistent.

**`Table` `2374:1630`**

| Property | Value |
|---|---|
| Background | `--color-surface-base` `#fdfcfb` |
| Border | 0.994px → **1px** solid `--color-border-default` `#e0dfdb` |
| Border radius | **16px** (`--radius-lg`) |
| Layout | Vertical flex, `align-items: flex-start`, full width |
| Overflow | clip |
| Size | 614 × 468 |

**Header Row `2374:1631`** — background `#f5f5f5` (**raw hex, no token**; nearest is
`--color-surface-skeleton` `#f5f4f1`), padding **20px horizontal / 16px vertical**,
horizontal flex, `align-items: flex-start`, **gap 8px**, `overflow: clip`, full width.
All three headers: Alexandria **Bold 700**, **13px**, LH normal, `--color-text-secondary` `#616058`,
`text-align: right`.

| Node id | Copy | Meaning | Column width |
|---|---|---|---|
| `2374:1632` | `الزمن (ث)` | Time (seconds) | **69.57px** fixed |
| `2374:1634` | `الرياضي` | Athlete | `flex: 1 0 0`, `min-width: 0` |
| `2374:1635` | `المركز` | Position | **43.73px** fixed |

> RTL column order (first = rightmost): Time, Athlete, Position.
> ⚠️ Node id `2374:1633` is absent from the header row — a deleted or hidden node. Recorded.

**Data row — shared spec:** horizontal flex, `align-items: center`, **gap 8px**, **padding 20px** all sides,
`overflow: clip`, full width, `border-top: 0.994px → 1px solid --color-border-default`.

- **Time cell** — Alexandria **Black 900**, **20px**, LH normal, `--color-text-primary` `#000000`,
  `text-align: right`, fixed width 69.57px.
  ⚠️ **20px is another undefined typography size** — same numeric-display gap as §3.6.5. **DESIGN SYSTEM GAP.**
- **`Name` cell** — `flex: 1 0 0`, vertical flex, `align-items: flex-end`, **gap 2px**, `min-width: 0`,
  `overflow: clip`, background `--color-surface-base`.
  - `NameRow` — horizontal flex, `align-items: center`, `overflow: clip` (gap 8px only when tags present).
    - Athlete name: `Type/Subtitle` — Alexandria Medium 500, `--typography-subtitle-desktop` = 16, LH 1.5,
      `--color-text-primary` `#000000`, `text-align: right`, nowrap.
  - Meta line: `Type/Caption` — Alexandria Regular 400, 13, LH 1.4, `--color-text-secondary` `#616058`,
    `text-align: right`, nowrap.
- **`RankBadge`** — **43.73 × 31.8**, `border-radius: 9999px`, vertical flex centred, `overflow: clip`.
  Number: Alexandria **Bold 700**, **13px**, LH normal, `text-align: right`, nowrap.

**Medal colour system (approved, token-bound):**

| Rank | Badge background token | Hex | Number colour |
|---|---|---|---|
| 1 | `--color-semantic-medal-gold` | `#d4a017` | `--color-text-primary` `#000000` |
| 2 | `--color-semantic-medal-silver` | `#9aa3ad` | `--color-text-primary` `#000000` |
| 3 | `--color-semantic-medal-bronze` | `#b0703b` | `--color-text-primary` `#000000` |
| 4+ | `--color-surface-skeleton` | `#f5f4f1` | `--color-text-secondary` `#616058` |

**The five result rows — content**

| Rank | Row node | Row background | Time | Time node | Athlete | Name node | Meta line | Meta node | Badge node | Number node |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1636` | **`#f6fcf9`** (highlighted — raw hex, no token) | `11.28` | `2374:1637` | `سارة الكعبي` | `2374:1645` | `عدو 100 م · نادي دبي لألعاب القوى` | `2374:1646` | `2374:1647` | `2374:1648` |
| 2 | `2374:1649` | `--color-surface-base` `#fdfcfb` | `11.41` | `2374:1650` | `مريم الشامسي` | `2374:1654` | `عدو 100 م · نادي الشارقة لألعاب القوى` | `2374:1655` | `2374:1656` | `2374:1657` |
| 3 | `2374:1658` | `--color-surface-base` | `11.63` | `2374:1659` | `فاطمة الزعابي` | `2374:1663` | `عدو 100 م · نادي العين` | `2374:1664` | `2374:1665` | `2374:1666` |
| 4 | `2374:1667` | `--color-surface-base` | `11.75` | `2374:1668` | `هند البلوشي` | `2374:1672` | `عدو 100 م · نادي أبوظبي الرياضي` | `2374:1673` | `2374:1674` | `2374:1675` |
| 5 | `2374:1676` | `--color-surface-base` | `11.90` | `2374:1677` | `نورة المرزوقي` | `2374:1681` | `عدو 100 م · نادي عجمان الرياضي` | `2374:1682` | `2374:1683` | `2374:1684` |

`Name` / `NameRow` node ids: row 1 `2374:1639`/`2374:1640`; row 2 `2374:1652`/`2374:1653`;
row 3 `2374:1661`/`2374:1662`; row 4 `2374:1670`/`2374:1671`; row 5 `2374:1679`/`2374:1680`.
(Node ids `2374:1638`, `1651`, `1660`, `1669`, `1678` are absent — deleted/hidden nodes.)

**Row-1 achievement tags** (only row 1 has them; `NameRow` `2374:1640` gains **gap 8px**):

| Node id | Container | Copy | Font | Size | Colour | Background | Radius | Padding |
|---|---|---|---|---|---|---|---|---|
| `2374:1642` | `2374:1641` | `PB` | **`Inter SemiBold 600`** | 13 | `#006b30` | `#e5f5ec` | `9999px` | 8 / 3 |
| `2374:1644` | `2374:1643` | `رقم وطني` ("National record") | Alexandria Bold 700 | 13 | `--color-surface-base` `#fdfcfb` | `--color-brand-primary` `#00843d` | **`4px`** | 8 / 2 |

> **Tag hierarchy (approved):** a **national record** gets a solid green pill with a **4px radius**;
> a **personal best** gets a soft green tint with a **full pill radius**. The stronger achievement gets the
> stronger fill. Reuse this convention.
>
> ⚠️ Three defects here, all recorded not fixed:
> 1. `PB` uses **Inter SemiBold**, not Alexandria. Third Inter instance on the page (see §3.6.6, §3.7.2).
> 2. `#006b30` is 1 unit from the token `--color-green-600` `#006b31`. Almost certainly should be the token.
> 3. Row 1's highlight `#f6fcf9` is untokenized. Nearest relatives are `#e5f5ec` (green tint) and
>    `--color-surface-base`. **DESIGN SYSTEM GAP** — a "highlighted row" surface token is undefined.

> **Data-integrity note.** The results table lists `سارة الكعبي` (rank 1, 11.28) and `مريم الشامسي`
> (rank 2, 11.41) in the **100 m**, while §3.6.5's athlete cards give Sarah as a **400 m** runner
> (PB 52.34 s, rank 2) and Maryam as a **long jumper** (PB 6.85 m, rank 4). The two surfaces are internally
> inconsistent placeholder data. Not a layout defect — flag to the content owner before wiring to the CMS.

---

#### 3.7.2 Upcoming Events column — `2374:1685`

Vertical flex, `align-items: flex-start`, **gap 24px**, background `--color-surface-base`, width 676.

**`Section Header` `2374:1686`** — vertical flex, `align-items: flex-start`, **gap 8px**,
`text-align: right`, full width, `overflow: clip`.

| Node id | Role | Copy | Style | Size | Weight | LH | Color |
|---|---|---|---|---|---|---|---|
| `2374:1687` | Title (H2) | `جدول الفعاليات القادمة` | `Type/H2` Alexandria Bold | 32 | 700 | 1.25 | `--color-text-primary` |
| `2374:1688` | Subtitle | `الجدول الرسمي المعتمد حتى نهاية 2026` | `Type/Caption` Alexandria Regular | 13 | 400 | 1.4 | `--color-text-secondary` |

##### Live Event card — `2374:1689`

| Property | Value |
|---|---|
| Size | 676 × **193** |
| Background | `--color-surface-base` `#fdfcfb` |
| Border | **1.5px** solid `--color-brand-primary` `#00843d` |
| Border radius | **16px** (`--radius-lg`) |
| Shadow | `0px 3.98px 11.93px rgba(0,0,0,0.08)` → **`0px 4px 12px rgba(0,0,0,0.08)`** |
| Layout | Horizontal flex, `align-items: flex-start`, `overflow: clip` |

> The **1.5px** border is unique on this page (everything else is 1px or 4px). It signals "live". Recorded.

**`Broadcast Visual` `2374:1690`** — **220px** wide, full height, background `--color-brand-black` `#000000`,
vertical flex, `align-items: flex-start`, `overflow: clip`. A stylised broadcast-feed graphic:

| Node id | Element | Detail |
|---|---|---|
| `2374:1691` | `Gradient` | absolute, 220 × 112 |
| `2374:1692` | `Pulse 1` | absolute SVG, **120 × 120**, left −40, top −40 |
| `2374:1693` | `Pulse 2` | absolute SVG, **80 × 80**, left 140, top 60 |
| `2374:1694` | `Broadcast Elements` | absolute, 220 × 193, vertical flex, gap 4px, **padding 12px** |
| `2374:1695` | `Top Row` | absolute at left 12, top 16, **196 × 18**, horizontal flex `space-between`, **`IBM Plex Mono Bold`**, **13px**, `#ffffff` |
| `2374:1696` | — | `LIVE FEED` — **opacity 0.6** |
| `2374:1697` | — | `HD 1080p` |
| `2374:1698` | `Signal Bars` | absolute at left 12, top 70, **50 × 38**, horizontal flex `align-items: flex-end`, **gap 2px** |
| `2374:1699`–`2374:1703` | 5 bars | each **6px wide**, `border-radius: 2px`, fill **`#00cd5f`**. Heights **20, 32, 26, 38, 28**; tops 18, 6, 12, 0, 10; lefts 0, 10, 20, 30, 40 |
| `2374:1704` | `Bottom Row` | absolute at left 12, top 155, **196 × 20**, horizontal flex `space-between`, **`IBM Plex Mono Bold`**, **14px**, `#ffffff` |
| `2374:1705` | — | `UAE ATHLETICS` |
| `2374:1706` | — | `ON AIR` |

> ⚠️ **`IBM Plex Mono Bold`** appears only here — a fourth typeface on the page (Alexandria, IBM Plex Sans,
> Inter, IBM Plex Mono). It is a deliberate "broadcast telemetry" affectation and arguably justified, but it
> is **not in the approved type stack**. Classified: **DESIGN DECISION REQUIRED**.
>
> ⚠️ `#00cd5f` (signal bars) is a **bright green that is not `--color-brand-primary` `#00843d`**. Also
> untokenized. Classified: **DESIGN SYSTEM GAP / DECISION REQUIRED**.

**`Content Area` `2374:1707`** — **456 × 169**, vertical flex, `align-items: flex-start`, **gap 8px**,
**padding 16px**.

| Node id | Element | Detail |
|---|---|---|
| `2374:1708` | `Header` | horizontal flex, `align-items: center`, `justify-content: space-between` |
| `2374:1709` | `Live Badge` | background token **`color/semantic/live`** `#c8102e`, `border-radius: 9999px`, padding **10px / 4px**, horizontal flex, `align-items: center`, **gap 4px** |
| `2374:1710` | `Ellipse` | **6 × 6 px** SVG dot inside the badge |
| `2374:1711` | Badge text | `● مباشر` ("Live") — Alexandria **Bold 700**, **13px**, LH normal, `--color-surface-base` `#fdfcfb`, `text-align: right`. ⚠️ The `●` is a **literal character duplicating the adjacent SVG dot `2374:1710`** — remove one |
| `2374:1712` | Day counter | `اليوم 1 من 3` ("Day 1 of 3") — `Type/Caption` Alexandria Regular 400, 13, LH 1.4, `--color-text-secondary`, `text-align: right` |
| `2374:1713` | Event title | `بطولة الإمارات لألعاب القوى 2026` — Alexandria **Bold 700**, **18px**, LH normal, `--color-text-primary`, `text-align: right`, `width: min-content`. ⚠️ **18px is another undefined size** — DESIGN SYSTEM GAP |
| `2374:1714` | `Details` | horizontal flex, `align-items: center`, **gap 16px** |
| `2374:1715` | `Location Info` | horizontal flex, `align-items: center`, **gap 6px**, height 56 |
| `2374:1716` | `map-pin` | **14 × 14 px** SVG |
| `2374:1718` | Details text | `📍 استاد حمدان بن محمد · دبي ⏱ 18:00 ≡ 22 مسابقة` — `Type/Caption` Alexandria Regular 400, 13, LH 1.4, `--color-text-secondary` |
| `2374:1719` | `Date Badge` | **56 × 56**, background `--color-brand-primary` `#00843d`, `border-radius: 12px`, vertical flex centred, text `--color-surface-base` `#fdfcfb`, `text-align: right` |
| `2374:1720` | Day | `15` — Alexandria **Black 900**, **20px**, LH normal |
| `2374:1721` | Month | `أغسطس` — Alexandria **Bold 700**, **13px**, LH normal, absolutely positioned at **top 34px** |
| `2374:1722` | `Follow Button` | height **43.73px → 44px**, background `--color-brand-primary` `#00843d`, `border-radius: 8px`, padding **20px horizontal**, flex centred |
| `2374:1723` | Button label | `تابع النتائج المباشرة ←` — `Type/Label` Alexandria Medium 500, 13, LH 1.3, `--color-surface-base` `#fdfcfb`, `text-align: right` |

> ⚠️ **Icon/emoji duplication in `2374:1718`.** A real `map-pin` SVG (`2374:1716`) sits beside text that
> *also* begins with the `📍` emoji, and the same string packs `⏱` and `≡` as literal characters. Three
> pieces of metadata (venue, time, event count) are crammed into one text run with emoji separators.
> Classified: **DESIGN DECISION REQUIRED** — split into discrete labelled fields with real icons, and drop
> the duplicate pin. Note the emoji will not render consistently across platforms and is unreadable to
> screen readers.
>
> ⚠️ The `Follow Button` uses **8px radius**, while the hero's primary button (§3.2.2) is a **9999px pill**.
> Two button shapes. Classified: **DESIGN DECISION REQUIRED**.

##### Event filters — `2374:1724`

Horizontal flex, `align-items: flex-start`, `justify-content: flex-end`, **gap 8px**, height 57.64,
background `--color-surface-base`. Identical chip spec to §3.6.2 (pill, 1px border, 20/11 padding,
`Type/Label` 13px).

| # | Node id | Label node | Copy | Meaning | State | Background | Border | Text |
|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1725` | `2374:1726` | `تصفيات` | Qualifiers | default | — | `--color-border-default` | `--color-text-primary` |
| 2 | `2374:1727` | `2374:1728` | `وطني` | National | default | — | `--color-border-default` | `--color-text-primary` |
| 3 | `2374:1729` | `2374:1730` | `دولي` | International | default | — | `--color-border-default` | `--color-text-primary` |
| 4 | `2374:1731` | `2374:1732` | `الكل` | All | **SELECTED** | `#e5f5ec` | `--color-brand-primary` `#00843d` | `--color-brand-primary` `#00843d` |

##### Events List — `2374:1733`

| Property | Value |
|---|---|
| Size | 676 × **377.65** |
| Background | `--color-surface-base` `#fdfcfb` |
| Border | 0.994px → **1px** solid `--color-border-default` `#e0dfdb` |
| Border radius | **16px** (`--radius-lg`) |
| Layout | Vertical flex, `align-items: flex-start` |

**Event Row — shared spec:** height **75.53px**, horizontal flex, `align-items: center`, **gap 16px**,
padding **16px horizontal / 12px vertical**,
`border-bottom: 0.994px → 1px solid --color-border-default` (**the last row has `border: 0`**).

Row children, in DOM order (RTL: right → left):

1. **External-link glyph** — `↗`, `Type/Body` Alexandria Regular 400, `--typography-body-desktop` = 16,
   LH 1.6, `--color-text-secondary` `#616058`, `text-align: right`. **Literal character, not an icon.**
2. **`Calendar Icon`** — **11.93 × 11.93 → 12 × 12**, drawn from two primitives (not an exported SVG):
   - outer rect: 10 × 9 at left 0.99 / top 1.99, border 0.994px solid `#8c8c94`, `border-radius: 1.49px`
   - header bar: 10 × 2 at left 0.99 / top 1.99, fill `#8c8c94`
3. **`Countdown`** — background `#fafafa`, border 0.994px → 1px solid `#ebebed` (both **raw hex, no token**),
   `border-radius: 8px`, **padding 6px**, horizontal flex, `align-items: center`, **gap 3px**.
   Four `Unit` groups separated by three `:` glyphs.
   - `Unit`: vertical flex centred. Value = Alexandria **Bold 700**, **14px**, LH normal,
     `--color-text-primary`. Unit label = `Type/Caption` Alexandria Regular 400, 13, LH 1.4,
     `--color-text-secondary`.
   - `:` separator: `Type/Label` Alexandria Medium 500, 13, LH 1.3, `--color-gray-500` `#757470`.
   - Units, right→left: `يوم` (day), `ساعة` (hour), `دقيقة` (minute), `ثانية` (second).
   > ⚠️ The **unit label (13px) is larger than the value (14px) by only 1px** — the numeric value barely
   > out-ranks its own label. Weak hierarchy. Classified: **DESIGN DECISION REQUIRED**.
4. **`Cat`** (category pill) — background **`#1b7d3a`** (**raw hex, no token** — a third green, distinct from
   both `--color-brand-primary` `#00843d` and `--color-green-600` `#006b31`),
   `border-radius: 9999px`, padding **12px / 4px**, `align-items: flex-start`.
   Label: `Type/Label` Alexandria Medium 500, 13, LH 1.3, `#ffffff`, `text-align: right`.
   > ⚠️ **All five category pills are the same green regardless of category** (`وطني` / `تصفيات` / `دولي`).
   > The pill therefore carries no colour information. Classified: **DESIGN DECISION REQUIRED**.
5. **`Info`** — vertical flex, `align-items: flex-start`, **gap 2px**, background `--color-surface-base`.
   - `TitleRow` — horizontal flex, `align-items: center`. Title: Alexandria **Bold 700**, **16px**,
     LH normal, `--color-text-primary`, `text-align: right`.
   - Meta line: `Type/Caption` Alexandria Regular 400, 13, LH 1.4, `--color-text-secondary`, `text-align: right`.
6. **`Date`** — **51.68 × 51.68**, background `#1b7d3a`, border 0.994px solid `#1b7d3a`,
   `border-radius: 8px`, vertical flex centred, `#ffffff`, `text-align: right`.
   Day = Alexandria **Black 900**, **16px**; Month = Alexandria **Bold 700**, **13px**.
   > Note this differs from the Live Event's Date Badge (56 × 56, radius 12, brand green, day at 20px).
   > Two date-badge variants. Recorded.

**The five event rows — content**

| # | Row node | Countdown (d:h:m:s) | Category | Cat node | Title | Title node | Meta line | Meta node | Date | Date node | Bottom border |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1734` | 15 : 20 : 44 : 43 | `وطني` | `2374:1755` (`2374:1756`) | `البطولة الوطنية للناشئين` | `2374:1759` | `استاد دبي الرياضي · دبي · 16:00 · 18 مسابقة` | `2374:1760` | **15 أغسطس** | `2374:1761` (`1762`/`1763`) | yes |
| 2 | `2374:1764` | 51 : 19 : 44 : 43 | `تصفيات` | `2374:1785` (`2374:1786`) | `تصفيات البطولة الآسيوية` | `2374:1789` | `استاد هزاع بن زايد · العين · 15:00 · 12 مسابقة` | `2374:1790` | **20 سبتمبر** | `2374:1791` (`1792`/`1793`) | yes |
| 3 | `2374:1794` | **00 : 00 : 00 : 00** | `وطني` | `2374:1815` (`2374:1816`) | `الماراثون الوطني السنوي` | `2374:1819` | `كورنيش الشارقة · الشارقة` | `2374:1820` | **05 نوفمبر** | `2374:1821` (`1822`/`1823`) | yes |
| 4 | `2374:1824` | **00 : 00 : 00 : 00** | `دولي` | `2374:1845` (`2374:1846`) | `بطولة الخليج لألعاب القوى` | `2374:1849` | `استاد خليفة الدولي · الدوحة` | `2374:1850` | **10 أكتوبر** | `2374:1851` (`1852`/`1853`) | yes |
| 5 | `2374:1854` | 33 : 22 : 14 : 43 | `وطني` | `2374:1875` (`2374:1876`) | `البطولة الوطنية المفتوحة` | `2374:1881` | `مدينة زايد الرياضية · أبوظبي · 17:30 · 22 مسابقة` | `2374:1882` | **20 سبتمبر** | `2374:1883` (`1884`/`1885`) | **no (border: 0)** |

Per-row `Countdown` / `Info` / `TitleRow` / calendar-icon / `↗` node ids:

| # | `↗` | Calendar | Countdown | Info | TitleRow |
|---|---|---|---|---|---|
| 1 | `2374:1735` | `2374:1736` (`1737`/`1738`) | `2374:1739` | `2374:1757` | `2374:1758` |
| 2 | `2374:1765` | `2374:1766` (`1767`/`1768`) | `2374:1769` | `2374:1787` | `2374:1788` |
| 3 | `2374:1795` | `2374:1796` (`1797`/`1798`) | `2374:1799` | `2374:1817` | `2374:1818` |
| 4 | `2374:1825` | `2374:1826` (`1827`/`1828`) | `2374:1829` | `2374:1847` | `2374:1848` |
| 5 | `2374:1855` | `2374:1856` | `2374:1859` | `2374:1877` | `2374:1878` |

**Row 5 only — "Next" badge.** `TitleRow` `2374:1878` gains **gap 8px** and a leading badge
`2374:1879` containing `2374:1880`: `التالية` ("Next") — Alexandria **Bold 700**, **13px**, LH normal,
`#ffffff`, `text-align: right`. Badge background **NOT EXTRACTED — the badge container's fill was not
returned by the API**; from the sibling `Cat` pill pattern it is most likely `#1b7d3a` or
`--color-brand-primary`. Confirm before implementing.

> ⚠️ **Rows 3 and 4 have all-zero countdowns (`00:00:00:00`) while their dates (5 Nov, 10 Oct) are in the
> future** — and row 4 (10 Oct) sorts *before* row 3 (5 Nov) yet appears after it. The list is
> **not date-sorted** (15 Aug, 20 Sep, 5 Nov, 10 Oct, 20 Sep) and two countdowns are unpopulated
> placeholders. Also rows 2 and 5 are both **20 سبتمبر** with different countdowns (51 days vs 33 days),
> which is internally impossible. **Content/data defect, not a layout defect** — flag to the content owner.

**Expand link `2374:1886`** — full width (676), height 16, at y 790.29.
`عرض بقية الجدول (2) ⌄` ("Show the rest of the schedule (2)")
— **`Inter SemiBold 600`**, **13px**, LH normal, `--color-text-secondary` `#616058`, `text-align: center`.

> ⚠️ Fourth **Inter** instance on the page. Should almost certainly be Alexandria.
> ⚠️ The `(2)` implies 2 more events (7 total), but the section is titled "the official approved schedule
> through end of 2026" — a 7-event year is thin. Content note.
> ⚠️ This is the link that leads to the deeper tournament schedule referenced in `CLAUDE.md` §11.


---

### 3.8 News — `2374:1887`

| Property | Value |
|---|---|
| Node id | `2374:1887` |
| Name | `Section / News` |
| Size | 1440 × **857.61** |
| y-offset | 3694.52 |
| Background | inherits page surface (no explicit fill returned) |

> **⚠️ This is the "Section / News" instance named in `CLAUDE.md` §4 (R7 — Figma Plugin API limitation).**
> Its fractional values (`12.92`, `23.852`, `13.913`, `0.994`) are the R7 artifact.
> **Implement the master values: 13px, 24px, 14px, 1px.** Do not brute-force the Figma API for these.

Layout: absolutely positioned blocks (no section-level auto-layout).

| Block | Node id | x | y | Size |
|---|---|---|---|---|
| `Section Header` | `2374:1888` | 64 | **88** | 1312 × 66 |
| `News Layout` | `2374:1893` | 64 | **186** | 1312 × 583.61 |

> Top padding is **88px**, not the page-standard 64px. Header→content gap is 186 − (88 + 66) = **32px**.
> Bottom: 857.61 − (186 + 583.61) = **88px**. So this section uses an **88 / 88** vertical rhythm.
> Recorded as observed — differs from §3.4/§3.5's 64 and §3.6's 24. **DESIGN DECISION REQUIRED**
> (section-rhythm normalization).

Decorative swooshes — full four-stroke set:

| Node id | Asset | x | y | Width | Height |
|---|---|---|---|---|---|
| `2737:16` | `خط أحمر — Red Swoosh` | −30 | −5 | 178.661 | 134.703 |
| `2737:17` | `خط أخضر — Green Swoosh` | −10 | 25 | 258.531 | 196.891 |
| `2737:18` | `خط أسود — Black Swoosh` | 1240 | 836.61 | 204.137 | 153.794 |
| `2737:19` | `خط أحمر صغير — Red Swoosh Small` | 1329 | 824.61 | 128.528 | 97.094 |

#### 3.8.1 Section header — `2374:1888`

Horizontal flex, `align-items: flex-end`, `justify-content: space-between`, `text-align: right`, nowrap.

| Node id | Role | Copy | Font | Size | Weight | LH | Color |
|---|---|---|---|---|---|---|---|
| `2374:1889` | "View all" link (RTL end / left) | `← عرض كل الأخبار` | Alexandria SemiBold | **14px** | 600 | normal | `--color-brand-primary` `#00843d` |
| `2374:1891` | Title (H2) | `آخر الأخبار والمقالات` | Alexandria Bold | **32px** | 700 | 1.25 | `--color-text-primary` `#000000` |
| `2374:1892` | Subtitle | `البيانات الرسمية والتغطية الإخبارية الصادرة من الاتحاد` | Alexandria Regular | **13px** | 400 | 1.4 | `--color-text-secondary` `#616058` |

`Title` group `2374:1890`: vertical flex, `align-items: flex-end`, **gap 8px**, `overflow: clip`.

> **Third "view all" link variant on the page** — §3.5 used `عرض الكل +` at 13px SemiBold green;
> §3.7.1 used `عرض الكل +` at 13px SemiBold green; this uses `← عرض كل الأخبار` at **14px**.
> Note the arrow here is `←` (leading, pointing left = RTL forward), whereas §3.9 uses a **trailing** `←`.
> Classified: **DESIGN DECISION REQUIRED** — one "section action link" component.
>
> **IA note (`CLAUDE.md` §11):** this section is *News & Articles* (`الأخبار والمقالات`), matching the nav
> item `الاخبار و المقالات`. It is distinct from §3.9 *UAEAF in the Media* (third-party coverage). Do not
> merge them — they are editorially different: this is federation-authored, §3.9 is independent coverage.

#### 3.8.2 News Layout — `2374:1893`

Horizontal flex, `align-items: flex-start`, **gap 24px**. Two equal columns, each `flex: 1 0 0`,
`min-width: 0` → **644px each** ((1312 − 24) / 2 = 644).

| Column | Node id | Width | Height |
|---|---|---|---|
| `News List` (RTL: right / first) | `2374:1894` | 644 | 583.61 |
| `Lead Article` (RTL: left) | `2374:1925` | 644 | **533.02** |

> The two columns are **not height-matched** (583.61 vs 533.02, a 50.6px difference). The list column is
> `align-items: flex-start`, so the lead card's bottom sits ~50px above the list's. Recorded as observed.

#### 3.8.3 News List — `2374:1894`

Vertical flex, `align-items: flex-start`, **gap 16px** (`--space-4`), `flex: 1 0 0`, `min-width: 0`,
`overflow: clip`. **Five `News Item` rows.**

**News Item — shared spec:** horizontal flex, `align-items: center`, **gap 16px** (`--space-4`),
**padding 12px vertical** (no horizontal padding), full width, `overflow: clip`,
`border-bottom: 0.994px → 1px solid --color-border-default #e0dfdb`.

> ⚠️ **Every row including the last has a bottom border**, unlike §3.7.2's events list where the last row's
> border is removed. Recorded as observed — inconsistent list-terminator treatment.

- **`Thumbnail`** — **119.259 × 74.537 → 120 × 75** (≈ 16:10), `border-radius: 6px`,
  raster PNG, `object-fit: cover`, `pointer-events: none`.
- **`Text Content`** — `flex: 1 0 0`, vertical flex, `align-items: flex-start`, **gap 6px**,
  `min-width: 0`, `overflow: clip`, `text-align: right`, `dir="auto"`.
  - **Category (kicker):** Alexandria Regular 400, **12.92 → 13px**, LH 1.4,
    **`--color-green-600` `#006b31`**, full width.
  - **Headline:** Alexandria **SemiBold 600**, **16px**, LH normal,
    `--color-text-primary` `#000000`, full width.
  - **Date:** Alexandria Regular 400, **12.92 → 13px**, LH 1.4,
    `--color-text-secondary` `#616058`, full width.

> Note the kicker uses `--color-green-600` `#006b31` (the darker green), **not**
> `--color-brand-primary` `#00843d` used for links elsewhere. This is a deliberate, token-bound distinction:
> **green-600 = editorial category label; brand-primary = interactive link.** Preserve it.

**The five news items — content**

| # | Row node | Thumb node | Category | Cat node | Headline | Headline node | Date | Date node | Text Content node |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1895` | `2374:1896` | `التدريب` (Training) | `2374:1898` | `انطلاق معسكر تدريبي وطني في المركز الجديد للأداء العالي بأبوظبي` | `2374:1899` | `10 ديسمبر 2026` | `2374:1900` | `2374:1897` |
| 2 | `2374:1901` | `2374:1902` | `ألعاب القوى للناشئين` (Youth athletics) | `2374:1904` | `أكثر من 1200 طالب يتنافسون في برنامج الاتحاد لألعاب القوى المدرسية` | `2374:1905` | `8 ديسمبر 2026` | `2374:1906` | `2374:1903` |
| 3 | `2374:1907` | `2374:1908` | `دولي` (International) | `2374:1910` | `النعيمي تحطم الرقم القياسي الوطني لـ100م في بطولة الدوري الماسي` | `2374:1911` | `5 ديسمبر 2026` | `2374:1912` | `2374:1909` |
| 4 | `2374:1913` | `2374:1914` | `مجتمع` (Community) | `2374:1916` | `اتحاد الإمارات يطلق عيادات جري مجتمعية مجانية في خمس إمارات` | `2374:1917` | `2 ديسمبر 2026` | `2374:1918` | `2374:1915` |
| 5 | `2374:1919` | `2374:1920` | `الأرقام القياسية` (Records) | `2374:1922` | `اعتماد رقم الحمادي في رمي الرمح رقمًا قياسيًا وطنيًا جديدًا` | `2374:1923` | `28 نوفمبر 2026` | `2374:1924` | `2374:1921` |

> **Date format** is consistent across the section: `<day> <Arabic month> <Gregorian year>`, Latin digits,
> newest first. The list **is** correctly date-sorted (10 → 8 → 5 → 2 Dec → 28 Nov), unlike §3.7.2's events.
>
> **Category taxonomy observed:** `التدريب`, `ألعاب القوى للناشئين`, `دولي`, `مجتمع`, `الأرقام القياسية`,
> plus `المنتخب الوطني` on the lead article — six categories. Note `الأرقام القياسية` (Records) overlaps
> the nav's `National Records` IA node; confirm the relationship with the content owner.

#### 3.8.4 Lead Article — `2374:1925`

| Property | Value |
|---|---|
| Node id | `2374:1925` |
| Size | 644 × **533.02** |
| Background | `--color-surface-raised` `#ffffff` |
| Border | 0.994px → **1px** solid `--color-border-default` `#e0dfdb` |
| Border radius | **12px** |
| Layout | Vertical flex, `align-items: flex-start`, `flex: 1 0 0`, `min-width: 0` |
| Overflow | clip |

**Image `2544:2596`** — layer name **`IMG-NEWS-001`** (an asset-slot ID — CMS/DAM reference).

| Property | Value |
|---|---|
| Size | full width × **318.023 → 318px** |
| Border | 0.994px → **1px** **dashed** `--color-border-strong` `#757470` |
| Layout | Vertical flex, centred, **gap 6px**, `overflow: clip` |
| Content | Raster PNG, `object-fit: cover`, `pointer-events: none` |

> **⚠️ The dashed strong border is a placeholder-slot marker**, not a design treatment. Combined with the
> `IMG-NEWS-001` slot ID, this frame is an **image placeholder awaiting the approved asset**.
> **Do not ship the dashed border.** The image should fill the frame with no border.
> Classified: **VERIFIED — placeholder scaffolding, remove on implementation.**

**`Body` `2374:1927`** — vertical flex, `align-items: flex-end`, **gap 10px**, **padding 24px**,
full width, `text-align: right`, `overflow: clip`.

| Node id | Role | Copy | Font | Size | Weight | LH | Color | Width |
|---|---|---|---|---|---|---|---|---|
| `2374:1928` | Category kicker | `المنتخب الوطني` (National Team) | Alexandria Regular | **12.92 → 13px** | 400 | 1.4 | `--color-green-600` `#006b31` | nowrap |
| `2374:1929` | Headline | `اتحاد الإمارات لألعاب القوى يعلن عن تشكيلة من 24 لاعبًا لبطولة آسيا` | Alexandria **Bold** | **23.852 → 24px** | 700 | **1.3** | `--color-text-primary` `#000000` | **546.602 → 547px** |
| `2374:1930` | Standfirst | `أكد الاتحاد أقوى تشكيلة له منذ عقد، بقيادة حاملي الأرقام القياسية الوطنية في العدو والقفز والرمي، استعدادًا لبطولة آسيا لألعاب القوى المقبلة في بانكوك.` | Alexandria Regular | **13.913 → 14px** | 400 | **1.5** | `--color-text-secondary` `#616058` | **546.602 → 547px** |
| `2374:1931` | Byline / meta | `12 ديسمبر 2026 · قراءة 4 دقائق` | Alexandria Regular | **12px** | 400 | normal | `--color-text-secondary` `#616058` | nowrap |

> ⚠️ **Three undefined typography values in this one card:**
> - **24px** headline at LH 1.3 — no `Type/*` role defines 24px. (This is the "H3 = 24px" size referenced in
>   `CLAUDE.md` §7's scale discussion, but **no H3 style is bound anywhere on this frame**.)
>   **DESIGN SYSTEM GAP.**
> - **14px** standfirst at LH **1.5** — matches `Type/Compact Metadata`'s size and LH but that style is
>   **Medium 500**, and this is **Regular 400**. So it is a near-miss, not a match. **DESIGN SYSTEM GAP.**
> - **12px** byline — below the 13px minimum and **not covered by ADR-0041**
>   (non-transferable, scoped to `CMP-CLUBCARD-001` and `CMP-AFFILIATIONS-001`).
>   **DESIGN DECISION REQUIRED.**
>
> ⚠️ The body content width is **547px inside a 644px card with 24px padding** — 644 − 48 = 596 available,
> but the text is set to 547. A **49px unexplained inset.** Recorded as observed; implement at full
> content width (596) unless the owner confirms the inset is intentional.
>
> ⚠️ Card padding here is **24px** and radius **12px**, whereas §3.4's Stat Card is 24px padding / **16px**
> radius and §3.9's Media card is **12px** radius. Two card radii coexist (12 and 16). Recorded.


---

### 3.9 UAEAF in the Media — `2374:1932`

| Property | Value |
|---|---|
| Node id | `2374:1932` |
| Name | `UAEAF in the Media` |
| Size | 1440 × **614** |
| y-offset | 4552.13 |
| Background | `--color-surface-base` `#fdfcfb` |
| Layout | **Absolute positioning throughout** (no auto-layout) |

> **IA note:** this section carries **independent third-party press coverage**
> (`تغطية إعلامية مستقلة لمسيرة الاتحاد`), editorially distinct from §3.8's federation-authored News.
> Two separate concepts; do not merge (`CLAUDE.md` §11).

#### 3.9.1 Section header — `2374:1933`

Absolute at left **64**, top **64**, size 1312 × 66, `overflow: clip`.

| Node id | Role | Copy | Font | Size | Weight | Color | Position |
|---|---|---|---|---|---|---|---|
| `2374:1934` | "View all" link | `عرض كل التغطية الإعلامية ←` | Alexandria SemiBold | **14px** | 600 | `--color-brand-primary` `#00843d` | absolute left 0, top **49**, width 230 |
| `2374:1936` | Title (H2) | `الاتحاد في الإعلام` | Alexandria Bold | **32px** | 700 | `--color-text-primary` `#000000` | absolute left 312, `translateX(-100%)`, top 0, 312 × 40 |
| `2374:1937` | Subtitle | `تغطية إعلامية مستقلة لمسيرة الاتحاد` | Alexandria Regular | **13px** | 400 | `--color-text-secondary` `#616058` | absolute left 312, `translateX(-100%)`, top **48**, 312 × 18 |

`Title Group` `2374:1935`: absolute at left **1000**, top 0, 312 × 66, `text-align: right`, `overflow: clip`.

> The `←` here is **trailing** the Arabic text; in §3.8 the same arrow **leads** it. Inconsistent.

#### 3.9.2 Media Coverage Cards — 4 cards

All four are absolutely positioned at **top 162**, size **326 × 320**, laid out right-to-left with a
**350px horizontal pitch** (326 card + 24 gap):

| Card | Node id | `left` | Reading position (RTL) |
|---|---|---|---|
| 1 of 4 | `2374:1938` | **1050** | first (rightmost) |
| 2 of 4 | `2374:1945` | **700** | second |
| 3 of 4 | `2374:1952` | **350** | third |
| 4 of 4 | `2374:1959` | **0** | fourth (leftmost) |

> Cards span x 0 → 1376, i.e. they start at the **section's left edge (x=0)** and end 64px from the right —
> so the leftmost card **breaks the 64px page gutter** on the left. This is intentional: it is a
> horizontal carousel whose track bleeds off the left (RTL "continuation") edge. See the Edge Fade below.

**Media Coverage Card — shared specification**

| Property | Value |
|---|---|
| Size | **326 × 320** |
| Background | `--color-surface-base` `#fdfcfb` |
| Border | **1px** solid `--color-border-default` `#e0dfdb` |
| Border radius | **12px** |
| Overflow | clip |
| Layout | Absolute positioning of all children |

Card children (positions relative to the card):

| Element | Layer name | Geometry | Typography |
|---|---|---|---|
| **Article image** | `Article Image (rights-cleared) / Publication Logo Fallback` | absolute left **−1**, top **−1**, **326 × 140**, `border-radius: 12px 12px 0 0`, raster PNG `object-fit: cover`, `pointer-events: none` | — |
| **Publication name** | `Publication Name` | absolute left 309, `translateX(-100%)`, top **155**, 294 × 18 | Alexandria **Medium 500**, **13px**, LH normal, `--color-text-primary` `#000000`, `text-align: right` |
| **Title** | `Title (UAEAF-authored framing)` | absolute left 309, `translateX(-100%)`, top **181**, 294 × **44** (2 lines) | Alexandria **SemiBold 600**, **16px**, LH normal, `--color-text-primary` `#000000`, `text-align: right` |
| **Excerpt** | `Excerpt (UAEAF-authored)` | absolute left 309, `translateX(-100%)`, top **231**, 294 × **36** | Alexandria Regular 400, **13px**, LH normal, `--color-text-secondary` `#616058`, `text-align: right` |
| **Date** | `Publication Date` | absolute left 155, `translateX(-100%)`, top **283**, 140 × 18 | Alexandria Regular 400, **13px**, LH normal, `--color-text-secondary` `#616058`, `text-align: right` |
| **External CTA** | `External CTA (Chapter 8 L3 External Link rule: target=_blank, rel=noopener noreferrer)` | absolute left **159**, top **283**, 150 × 18 | Alexandria **SemiBold 600**, **13px**, LH normal, `--color-brand-primary` `#00843d` |

> ### Approved rules captured in the layer names — carry these into implementation
>
> 1. **`Chapter 8 L3 External Link rule`** — every "read full article" CTA MUST be
>    `target="_blank" rel="noopener noreferrer"`. This is an approved, documented requirement recorded
>    directly in the design. Implement it.
> 2. **`Article Image (rights-cleared) / Publication Logo Fallback`** — the article image must be
>    **rights-cleared**; where it is not, **fall back to the publication's logo**. Build the fallback path.
> 3. **`Title (UAEAF-authored framing)` / `Excerpt (UAEAF-authored)`** — the headline and excerpt shown here
>    are **written by UAEAF**, not lifted from the publication. This is a deliberate editorial/legal
>    position. Do not scrape publisher copy into these fields.
>
> ⚠️ **Overlap defect:** the Date occupies x 15→155 and the CTA starts at x **159** with width 150,
> ending at **309**. Card content width is 294 (inset 16 each side → 16…310). The CTA's right edge at 309
> is fine, but Date (`left:155` with `translateX(-100%)`, i.e. spanning 15→155) and CTA (159→309) leave only
> **4px** between them. At longer dates or CTA strings they will collide. Classified:
> **DESIGN DECISION REQUIRED** — convert this footer row to a flex `space-between`.

**The four media cards — content**

| # | Card | Image node | Publication | Pub node | Title | Title node | Excerpt | Excerpt node | Date | Date node | CTA node |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `2374:1938` | `2374:1939` | `الإمارات اليوم` | `2374:1940` | `احتفاء إعلامي بإنجازات ألعاب القوى الإماراتية في 2026` | `2374:1941` | `تغطية خاصة لمسيرة الاتحاد وأبرز محطاته خلال الموسم الحالي.` | `2374:1942` | `15 ديسمبر 2026` | `2374:1943` | `2374:1944` |
| 2 | `2374:1945` | `2374:1946` | `جريدة الخليج` | `2374:1947` | `اتحاد الإمارات لألعاب القوى يقود نهضة رياضية غير مسبوقة` | `2374:1948` | `قراءة تحليلية في استراتيجية الاتحاد لتطوير الرياضة الوطنية.` | `2374:1949` | `10 ديسمبر 2026` | `2374:1950` | `2374:1951` |
| 3 | `2374:1952` | `2374:1953` | `وكالة أنباء الإمارات (وام)` | `2374:1954` | `الإمارات تستعد لاستضافة بطولة آسيا لألعاب القوى` | `2374:1955` | `استعدادات متقدمة لاستقبال أبطال القارة الآسيوية في أبوظبي.` | `2374:1956` | `6 ديسمبر 2026` | `2374:1957` | `2374:1958` |
| 4 | `2374:1959` | `2374:1960` | `سبورت 360 عربية` | `2374:1961` | `قصة نجاح: كيف تحول الجري إلى ظاهرة وطنية في الإمارات` | `2374:1962` | `نظرة على الأرقام والمبادرات التي غيّرت مشهد الرياضة المحلية.` | `2374:1963` | `1 ديسمبر 2026` | `2374:1964` | `2374:1965` |

**External CTA copy is identical on all four cards:** `↗ قراءة المقال الكامل` ("Read the full article").
The `↗` is a **literal text character**, not an icon.

> Publications are real UAE outlets (Emarat Al Youm, Al Khaleej, WAM, Sport360 Arabia) and the dates are
> correctly descending (15 → 10 → 6 → 1 Dec). Sensible placeholder content.

#### 3.9.3 Edge Fade — `2374:1966`

| Property | Value |
|---|---|
| Layer name | `Edge Fade (RTL continuation cue, mirrors Club Marquee 151:25 technique)` |
| Geometry | absolute left **0**, top **162**, **80 × 320** |
| Gradient | left→right: `#ffffff` → `rgba(255,255,255,0)` |

> The layer name explicitly documents this as an **RTL continuation cue** and cross-references the
> Club Marquee technique (§3.5.2, node `151:25` in the source library). It signals "more cards off-screen
> to the left". Approved pattern — reuse it for any RTL horizontal carousel.
>
> ⚠️ Same defect as §3.5.2: the fade uses pure `#ffffff` against an `--color-surface-base` `#fdfcfb`
> section. Bind the fade to `--color-surface-base`. **DESIGN DECISION REQUIRED.**
> Note also there is **no matching fade on the right edge** here, unlike §3.5.2 which has both.

#### 3.9.4 Carousel controls — `2374:1967`

| Property | Value |
|---|---|
| Layer name | `Carousel Controls (CMP-CAROUSEL-001 — pause-on-hover/focus/touch, reduced-motion aware)` |
| Geometry | absolute left **620**, top **505.66**, **176 × 44** |
| Layout | Horizontal flex, `align-items: center`, `justify-content: center`, **gap 16px**, `overflow: clip` |

| Node id | Element | Geometry | Background | Border | Glyph node | Glyph | Font | Size | Colour |
|---|---|---|---|---|---|---|---|---|---|
| `2374:1968` | `Nav Arrow / Prev` | **36 × 36**, `border-radius: 18px` | `--color-brand-primary` `#00843d` | none | `2374:1969` | `‹` | **`Inter Bold`** | **18px** | `#ffffff` |
| `2374:1970` | `Pagination Dots` | **68 × 8** | — | — | — | — | — | — | flattened SVG |
| `2374:1975` | `Nav Arrow / Next` | **39 × 36**, `border-radius: 18px` | `#f2f2f2` (raw hex) | 1px solid `#d9d9d9` (raw hex) | `2374:1976` | `›` | **`Inter Bold`** | **18px** | `#4d4d4d` (raw hex) |

> **`Pagination Dots` `2374:1970` — NOT EXTRACTED:** per-dot fills and the active-dot indicator are baked
> into a single flattened SVG and are not individually addressable. Rebuild as 4 discrete dots (one per
> card) and take the active colour from `--color-brand-primary`, consistent with the Prev arrow.
>
> ### ⚠️ Third distinct Nav Arrow treatment on this page
>
> | Where | Size | Shape | Fill | Border | Glyph font/size |
> |---|---|---|---|---|---|
> | §3.2.6 Hero | 44 × 44 | circle | `--color-surface-raised` `#ffffff` | none | Alexandria Bold 16 |
> | §3.6.6 Athletes | 77.5 × 58.6 | pill | `#ffffff` | 1px `#dee0e3` | **Inter** SemiBold 14 |
> | §3.9.4 Media | 36 × 36 / **39 × 36** | circle-ish | green / `#f2f2f2` | none / 1px `#d9d9d9` | **Inter** Bold 18 |
>
> Three sizes, three fills, two typefaces, and here an **asymmetric pair** (Prev 36 wide, Next **39** wide)
> with **different visual states** — the green Prev reads as enabled and the grey Next as disabled, which
> is backwards for a carousel showing card 1 of 4 in RTL. Classified: **DESIGN DECISION REQUIRED** —
> consolidate to one `Nav Arrow` component with documented enabled/disabled variants.
>
> **Accessibility:** 36 × 36 is **below the WCAG 2.2 24×24 minimum for AA but below the 44×44 AAA target**;
> the hero's 44 × 44 meets it. Recorded.

#### 3.9.5 Decorative swoosh graphics

| Node id | Asset | Inner size | Wrapper box | Wrapper position |
|---|---|---|---|---|
| `2737:20` | `خط أحمر — Red Swoosh` | 202 × 23 | 178.661 × 134.703 | left **−30**, top **−120.86** |
| `2737:21` | `خط أخضر — Green Swoosh` | 289 × 38 | 258.531 × 196.891 | left **−10**, top **−140.76** |
| `2737:22` | `خط أسود — Black Swoosh` | 231 × 26 | 204.137 × 153.794 | left **1240**, top **460.5** |
| `2737:23` | `خط أحمر صغير — Red Swoosh Small` | 145 × 17 | 128.528 × 97.094 | left **1329**, top **497.83** |

All rotated **−35°** inside centring wrappers, same as §3.4.5.


---

### 3.10 Sponsors & Partners — `2374:1977`

| Property | Value |
|---|---|
| Node id | `2374:1977` |
| Name | `Sponsors & Partners` |
| Size | 1440 × **907** |
| y-offset | 5166.13 |
| Background | `--color-surface-base` `#fdfcfb` |
| Layout | Vertical flex, `align-items: center`, **gap 24px** |
| Padding | **40px** all sides |
| Content width | 1440 − 80 = **1360px** |

> ⚠️ **40px padding here vs. the page-standard 64px** (and 33.5px in §3.6, 88px in §3.8).
> Four different section gutters now recorded. **DESIGN DECISION REQUIRED** — section-rhythm normalization.

`Inner` `2374:1978` — vertical flex, `align-items: flex-start`, **gap 24px**, full width, `overflow: clip`,
background `--color-surface-base`. Contains five stacked blocks.

Decorative swooshes — **bottom-right pair only** (no top-left pair in this section):

| Node id | Asset | Inner size | Wrapper box | Wrapper position |
|---|---|---|---|---|
| `2737:24` | `خط أسود — Black Swoosh` | 231 × 26 | 204.137 × 153.794 | left 1240, top **753.5** |
| `2737:25` | `خط أحمر صغير — Red Swoosh Small` | 145 × 17 | 128.528 × 97.094 | left 1329, top **790.83** |

#### 3.10.1 Head — `2374:1979`

Vertical flex, `align-items: flex-start`, **gap 8px**, full width, `text-align: right`, `overflow: clip`.

| Node id | Role | Copy | Font | Size | Weight | LH | Color |
|---|---|---|---|---|---|---|---|
| `2374:1981` | Title (H2) | `الرعاة والشركاء` | Alexandria Bold | **32px** | 700 | 1.25 | `--color-text-primary` `#000000` |
| `2374:1982` | Subtitle | `الشريك الاستراتيجي والرعاة الرسميون والشركاء المساندون في دعم و تطوير ألعاب القوى في دولة الإمارات وتنظيم البطولات الوطنية والدولية.` | Alexandria Regular | **13px** | 400 | 1.4 | `--color-text-secondary` `#616058` |

> ⚠️ Node id `2374:1980` is absent — deleted/hidden node.
> ⚠️ Copy note: `دعم و تطوير` contains a **spaced conjunction** (`و ` with a following space).
> Standard Arabic attaches the waw: `ودعم وتطوير`. Copy defect — flag to the content owner.
> This section has **no "view all" link**, unlike §3.5 / §3.7 / §3.8 / §3.9.

#### 3.10.2 Partner Stats — `2374:1983`

Horizontal flex, `align-items: flex-start`, **gap 12px** (`--space-3`), full width, `overflow: clip`,
background `--color-surface-base`. **Three equal cards**, each `flex: 1 0 0`, `min-width: 0`.

**`PStat` card — shared spec:** background `--color-surface-base` `#fdfcfb`,
border 0.994px → **1px** solid `--color-border-default` `#e0dfdb`, `border-radius: 16px` (`--radius-lg`),
**padding 16px** (`--space-4`), vertical flex `align-items: center` + `justify-content: center`,
**gap 4px**, `overflow: clip`.

- Value: Alexandria **Black 900**, **24px**, LH normal, `--color-brand-primary` `#00843d`
- Label: Alexandria Regular 400, **11.926 → 12px**, LH normal, `--color-text-secondary` `#616058`

| # | Card node | Value | Value node | Label | Label node | Text align |
|---|---|---|---|---|---|---|
| 1 | `2374:1984` | **32** | `2374:1985` | `بطولة مدعومة سنويًا` (championships supported annually) | `2374:1986` | right, nowrap |
| 2 | `2374:1987` | **10** | `2374:1988` | `سنوات من أطول شراكة` (years — longest partnership) | `2374:1989` | right, nowrap |
| 3 | `2374:1990` | **8** | `2374:1991` | `شريك ورَاعٍ رسمي` (official partners & sponsors) | `2374:1992` | **center**, full width |

> ⚠️ **Card 3 is set `text-align: center` with full-width children; cards 1 and 2 are `text-align: right`
> with `nowrap`.** Inconsistent — implement all three the same way (centred is correct for a centred stat
> card). Recorded as observed.
>
> ⚠️ **12px labels are below the 13px minimum** and **not covered by ADR-0041** (non-transferable).
> **DESIGN DECISION REQUIRED.**
>
> ⚠️ **24px value** — undefined typography size (same gap as §3.6.5 / §3.8.4). **DESIGN SYSTEM GAP.**
>
> ⚠️ **Data conflict with §3.4:** this says **32 championships supported annually**; §3.4's stat card 2 says
> **32 annual championships** total. Consistent. But this says **8 official partners/sponsors** while
> §3.3's marquee lists **9 sponsor wordmarks + 1 centerpiece = 10**, and §3.10.4's strip shows **5**.
> Three different sponsor counts on one page. Content defect — flag to the content owner.

#### 3.10.3 Strategic Sponsor Card — `2374:1993`

| Property | Value |
|---|---|
| Node id | `2374:1993` |
| Name | `strategic-sponsor-card` |
| Border | **1.988px → 2px** solid `--color-green-500` `#00843d` |
| Border radius | **16px** (`--radius-lg`) |
| Shadow | `0px 7.951px 23.852px rgba(0,0,0,0.08)` → **`0px 8px 24px rgba(0,0,0,0.08)`** |
| Layout | Horizontal flex, `align-items: center`, **gap 24px**, **padding 24px**, full width |
| Overflow | clip |
| Background | **Raster PNG** (`object-fit: cover`, radius 16) **+ a `rgba(0,0,0,0.72)` scrim above it** |

> This is the page's **premium/VIP treatment**: a dark photographic card with a 2px green border, reserved
> for the single strategic sponsor. It is visually the loudest element on the page after the hero.

**Three flex children.** Note the DOM order is `left-content` → `right-content` (text) → `right-content`
(logo), and **two different children are both named `right-content`** — a naming collision. Node ids are
authoritative.

**(a) `left-content` `2374:2007`** — **260px** wide, vertical flex, `align-items: flex-end`.
`text-stack` `2374:2008`: vertical flex, `align-items: flex-end`, **gap 8px**, full width.

| Node id | Role | Copy | Font | Size | Weight | Colour | Extras |
|---|---|---|---|---|---|---|---|
| `2374:2010` | Eyebrow | `اتحاد الإمارات لألعاب القوى` | Alexandria Bold | **11.926 → 12px** | 700 | `--color-green-500` `#00843d` | `letter-spacing: 0.9541px`, `text-transform: uppercase`, nowrap |
| `2374:2011` | Diamond mark | — | — | 16.866 box containing an **11.926 → 12px** square **rotated 45°**, fill `--color-green-500` `#00843d` | — | — | pure CSS, no asset |
| `2374:2012` | Headline | `الراعي الرسمي الاستراتيجي` | Alexandria **Black 900** | **24px** | 900 | `--color-surface-base` `#fdfcfb` | `text-align: right`, `width: min-content`, `min-width: 100%` |
| `2374:2013` | Subline | `شريك النجاح والتميز في مسيرة الريادة الرياضية للدولة` | Alexandria Medium | **13.913 → 14px** | 500 | `rgba(255,255,255,0.8)` | `text-align: right` |

`Frame` `2374:2009` (eyebrow + diamond): horizontal flex, `align-items: center`, **gap 8px**.

**(b) `right-content` `2374:1998`** (the text block) — `flex: 1 0 0`, vertical flex,
`align-items: flex-start`, **gap 8px**, `min-width: 0`.

| Node id | Element | Detail |
|---|---|---|
| `2374:1999` | `vip-badge` | height **36.77 → 37px**, background `--color-green-500` `#00843d`, `border-radius: 100px`, padding **16px horizontal / 4px vertical**, horizontal flex `align-items: center`, **gap 6px** |
| `2374:2000` | `star` icon | **9.938 → 10 × 10 px** SVG |
| `2374:2002` | Badge text | `شريك استراتيجي ممتاز · VIP` — Alexandria **ExtraBold 800**, **10.932 → 11px**, LH normal, `--color-surface-base` `#fdfcfb`, nowrap |
| `2374:2003` | Tagline | `رؤية طموحة لمستقبل الرياضة الإماراتية` — Alexandria Medium 500, **11.926 → 12px**, LH normal, `--color-green-500` `#00843d`, `letter-spacing: 0.9938px` |
| `2374:2004` | Sponsor name | `Ultimate Power Solution` — Alexandria **ExtraBold 800**, **28px**, LH normal, `--color-surface-base` `#fdfcfb`, `letter-spacing: 0.9938px` |
| `2374:2005` | Descriptor | `Leaders in Power Generation & Logistics Solutions` — Alexandria Regular 400, **13px**, LH normal, **`#b0bec5`** (raw hex, no token), `letter-spacing: 0.4969px` |
| `2374:2006` | `accent-line` | **79.506 × 2.981 → 80 × 3**, `border-radius: 1.988 → 2px`, fill `--color-green-500` `#00843d` |

> ⚠️ Node id `2374:2001` is absent — deleted/hidden node.
> ⚠️ **28px** — another undefined typography size. **DESIGN SYSTEM GAP.**
> ⚠️ **11px badge text and 12px tagline are below the 13px minimum**, not covered by ADR-0041.
> **DESIGN DECISION REQUIRED.**
> ⚠️ **This card is the only place on the page using letter-spacing** (0.4969 / 0.9541 / 0.9938px).
> Every `Type/*` style defines `letterSpacing: 0`. Untokenized and undocumented.
> **DESIGN SYSTEM GAP.**
> ✅ **Bilingual consistency:** the sponsor's English name and English descriptor sit inside an Arabic page.
> The centerpiece in §3.3 uses the same `ULTIMATE POWER SOLUTION` name. Consistent.

**(c) `right-content` `2374:1994`** (the logo block) — **160px** wide, vertical flex centred.

| Node id | Element | Detail |
|---|---|---|
| `2374:1995` | `logo-plate` | **160 × 160**, background `rgba(255,255,255,0.06)`, border 0.994px → **1px** solid `--color-green-500` `#00843d`, `border-radius: 80px` (circle), vertical flex centred |
| `2374:1996` | `ups-logo` | **132 × 132**, `border-radius: 66px` (circle), `overflow: clip` |
| `2374:1997` | `logo-image` | **132 × 132** raster PNG, `object-fit: cover`, `pointer-events: none` |

#### 3.10.4 Sponsor Strip — `2374:2014`

Outer `2374:2014`: background `--color-surface-base` `#fdfcfb`, border 0.994px → **1px** solid
`--color-border-default` `#e0dfdb`, `border-radius: 16px`, **padding 16px**, vertical flex,
`align-items: flex-start`, full width, `overflow: clip`.

`Sponsor Cards` `2374:2015`: horizontal flex, `align-items: flex-start`, **gap 12px** (`--space-3`),
full width, `overflow: clip`. **Five equal cards**, each `flex: 1 0 0`, `min-width: 0`.

**`Sponsor Card` — shared spec**

| Property | Value |
|---|---|
| Height | **180px** |
| Background | `--color-surface-base` `#fdfcfb` |
| Border | 0.994px → **1px** solid `--color-border-default` `#e0dfdb` |
| Border radius | **12px** |
| Shadow | `0px 1.988px 9.938px rgba(0,0,0,0.05)` → **`0px 2px 10px rgba(0,0,0,0.05)`** |
| Layout | Vertical flex, `align-items: flex-start`, **gap 8px** |
| Overflow | clip |
| Padding | **none** (children sit flush — see defect note) |

Card children:

1. **`Tier Badge`** — background `#e5f5ec` (raw hex, untokenized green tint),
   `border-radius: 9937.217px` (i.e. a full pill — implement `9999px`),
   padding **10px horizontal / 2.981 → 3px vertical**, `align-items: flex-start`.
   Text: Alexandria **Bold 700**, **9.938 → 10px**, LH normal,
   `--color-brand-primary` `#00843d`, `text-align: right`, nowrap.
2. **`Logo Area`** — full width × **72px**, border 0.994px → **1px** solid `--color-border-default`,
   `border-radius: 12px`, raster PNG with **`object-fit: contain`** (correct for logos).
3. **Sponsor name** — Alexandria **Bold 700**, **13.913 → 14px**, LH normal,
   `--color-text-primary` `#000000`, `text-align: center`, `width: min-content`, `min-width: 100%`.
4. **Sector** — Alexandria Regular 400, **10.932 → 11px**, LH normal,
   `--color-text-secondary` `#616058`, `text-align: center`, `width: min-content`, `min-width: 100%`.

> ⚠️ **The Sponsor Card has no padding.** The tier badge, logo area and text run flush to the card's 1px
> border. Every other card on the page has 16 or 24px padding. Almost certainly a defect.
> Classified: **DESIGN DECISION REQUIRED** (likely 12px or 16px padding intended).
>
> ⚠️ **10px tier badge and 11px sector label are below the 13px minimum**, not covered by ADR-0041.
> **DESIGN DECISION REQUIRED.** This section alone contributes 10px, 11px and 12px sub-minimum text.

**The five sponsors — content**

| # | Card node | Tier badge | Badge node | Logo node | Sponsor name | Name node | Sector | Sector node |
|---|---|---|---|---|---|---|---|---|
| 1 | `2374:2016` | `الشريك الاستراتيجي` (Strategic Partner) | `2374:2017` (`2374:2018`) | `2374:2019` | `الهيئة العامة للرياضة` (General Sports Authority) | `2374:2020` | `جهة حكومية` (Government body) | `2374:2021` |
| 2 | `2374:2022` | `راعٍ رسمي` (Official Sponsor) | `2374:2023` (`2374:2024`) | `2374:2025` | `بنك أبوظبي الأول` (First Abu Dhabi Bank) | `2374:2026` | `خدمات مالية` (Financial services) | `2374:2027` |
| 3 | `2374:2028` | `راعٍ رسمي` | `2374:2029` (`2374:2030`) | `2374:2031` | `طيران الاتحاد` (Etihad Airways) | `2374:2032` | `نقل جوي` (Air transport) | `2374:2033` |
| 4 | `2374:2034` | `راعٍ رسمي` | `2374:2035` (`2374:2036`) | `2374:2037` | `اتصالات من e&` (Etisalat by e&) | `2374:2038` | `اتصالات وتقنية` (Telecoms & technology) | `2374:2039` |
| 5 | `2374:2040` | `شريك مساند` (Supporting Partner) | `2374:2041` (`2374:2042`) | `2374:2043` | `نايكي` (Nike) | `2374:2044` | `تجهيزات` (Equipment) | `2374:2045` |

> **Three-tier sponsor taxonomy (approved):**
> `الشريك الاستراتيجي` (Strategic Partner) → `راعٍ رسمي` (Official Sponsor) → `شريك مساند` (Supporting Partner).
> Matches the §3.10.1 subtitle exactly. **All three tiers currently render with the identical `#e5f5ec` /
> green badge** — the tier is stated in words but carries no visual differentiation.
> Classified: **DESIGN DECISION REQUIRED** — tier badges should be visually ranked.
>
> ⚠️ **Sponsor-list conflicts across the page.** §3.3's marquee lists ADNOC, Emirates NBD, Etisalat,
> Mubadala, Emirates, du, Nike, Adidas, Hublot + "Ultimate Power Solution" as official sponsor.
> This strip lists the General Sports Authority, FAB, Etihad, Etisalat/e& and Nike, and §3.10.3's strategic
> sponsor is Ultimate Power Solution — yet card 1 names the **General Sports Authority** as
> `الشريك الاستراتيجي`. **The page names two different strategic partners.** Content defect — flag to the
> content owner before CMS wiring.

#### 3.10.5 Partner CTA — `2374:2046`

| Property | Value |
|---|---|
| Background | `--color-surface-base` `#fdfcfb` |
| Border | 0.994px → **1px** solid `--color-border-default` `#e0dfdb` |
| Border radius | **16px** (`--radius-lg`) |
| Padding | **24px** |
| Layout | Horizontal flex, `align-items: center`, **gap 16px**, full width, `overflow: clip` |

**`CTA Text` `2374:2049`** — `flex: 1 0 0`, vertical flex, `align-items: flex-end`, **gap 8px**,
`min-width: 0`, `text-align: right`, `overflow: clip`.

| Node id | Role | Copy | Font | Size | Weight | LH | Colour |
|---|---|---|---|---|---|---|---|
| `2374:2050` | CTA heading | `كن شريك النجاح - انضم لمسيرتنا الرياضية` | Alexandria Bold | **18px** | 700 | **1.4** | `--color-text-primary` `#000000` |
| `2374:2051` | Benefit list | 4 lines (below) | Alexandria Regular | **13px** | 400 | **1.6** per line | `--color-text-secondary` `#616058` |

Benefit list `2374:2051` — four paragraphs, each `line-height: 1.6`, `dir="auto"`,
`width: min-content` with `min-width: 100%`:

1. `برنامج الشراكات يوفّر` ("The partnership programme provides")
2. `• حضور في البطولات الوطنية والدولية` ("Presence at national and international championships")
3. `• ظهور على المنصات الرقمية للاتحاد` ("Visibility on the federation's digital platforms")
4. `• برامج مشتركة لتطوير المواهب` ("Joint talent-development programmes")

> The `•` bullets are **literal text characters inside the text run**, not list markup.
> **Implement as a real `<ul>`** with the first line as its intro — the current form is inaccessible to
> screen readers. Note the heading uses a **hyphen `-`** where Arabic typography would normally take an
> em dash or a comma. Copy note.
> ⚠️ **18px heading** — undefined typography size (same as §3.7.2's live-event title). **DESIGN SYSTEM GAP.**

**Button `2374:2047`**

| Property | Value |
|---|---|
| Height | **44px** |
| Background | `--color-brand-primary` `#00843d` |
| Border radius | **8px** |
| Padding | **20px horizontal** |
| Layout | Horizontal flex, centred, `overflow: clip` |
| Label `2374:2048` | `تفاصيل برنامج الشراكة ←` — Alexandria Medium 500, **14px**, LH 1.4, `--color-surface-base` `#fdfcfb`, `text-align: right`, nowrap |

> ⚠️ **Third distinct button style on the page:**
> hero primary = green **pill** (`9999px`), 24/12 padding, Alexandria **Bold 16**;
> §3.7.2 Follow = green **8px radius**, 20px padding, height 43.73, Alexandria **Medium 13**;
> this = green **8px radius**, 20px padding, height 44, Alexandria **Medium 14**.
> Same colour, three geometries and three label styles. Classified: **DESIGN DECISION REQUIRED** —
> consolidate to `CMP-BUTTON-001` with documented size variants.
> ⚠️ Node ids `2374:2047`/`2374:2048` come **before** `2374:2049` in id order but **after** it in DOM order.
> Harmless, noted for anyone matching ids to layout.


---

### 3.11 Live Stream & Videos — `2374:2052`

| Property | Value |
|---|---|
| Node id | `2374:2052` |
| Name | `Live Stream & Videos` |
| Size | 1440 × **710** |
| y-offset | 6073.13 |
| Background | `--color-surface-base` `#fdfcfb` |
| Layout | Vertical flex, `align-items: flex-start`, **gap 32px** |
| Padding | **64px** all sides (`--space-16`) ✅ page-standard |
| Content width | **1312px** ✅ |

`Media Split Columns` `2374:2053` — horizontal flex, `align-items: flex-start`, **gap 64px**, full width.
Two equal columns, each `flex: 1 0 0`, `min-width: 0` → **(1312 − 64) / 2 = 624px each**.

| Column | Node id | RTL reading position |
|---|---|---|
| `Video Library Column` | `2374:2054` | first (rightmost) |
| `Live Streaming Column` | `2374:2099` | second (leftmost) |

Decorative swooshes — **bottom-right pair only**:

| Node id | Asset | Inner size | Wrapper box | Wrapper position |
|---|---|---|---|---|
| `2737:26` | `خط أسود — Black Swoosh` | 231 × 26 | 204.137 × 153.794 | left 1240, top **556.5** |
| `2737:27` | `خط أحمر صغير — Red Swoosh Small` | 145 × 17 | 128.528 × 97.094 | left 1329, top **593.83** |

#### 3.11.1 Video Library column — `2374:2054`

Vertical flex, `align-items: flex-start`, **gap 24px**, `flex: 1 0 0`, `min-width: 0`.

**`Library Header` `2374:2055`** — horizontal flex, `align-items: center`, `justify-content: space-between`,
full width, nowrap.

| Node id | Role | Copy | Font | Size | Weight | LH | Colour | Notes |
|---|---|---|---|---|---|---|---|---|
| `2374:2056` | "View all" **link** | `عرض جميع الفيديوهات ←` | Alexandria SemiBold | **14px** | 600 | normal | `--color-green-500` `#00843d` | **A real `<a>`: `href="https://youtube.com"`, `target="_blank"`.** The only node on the page with an actual hyperlink |
| `2374:2057` | Column title (H2) | `مكتبة الفيديو` | Alexandria Bold | **32px** | 700 | 1.25 | `--color-text-primary` `#000000` | `text-align: right` |

> ⚠️ The link's `href` is the **bare `https://youtube.com` root**, not the federation's channel.
> Placeholder URL — replace with the real UAEAF channel URL.
> ⚠️ It is missing `rel="noopener noreferrer"`, which §3.9.2's layer name records as the approved
> **Chapter 8 L3 External Link rule**. Apply the rule here too. Classified: **VERIFIED DEFECT** (a documented
> rule exists, so this is a compliance miss, not a design decision).
> ⚠️ Colour uses `--color-green-500` here but `--color-brand-primary` elsewhere for the same link role.
> Both resolve to `#00843d`, but the binding is inconsistent. Recorded.

**`Library Grid` `2374:2058`** — `display: flex`, **`flex-wrap: wrap`**, `align-items: flex-start`,
`align-content: flex-start`, **gap 16px** (`--space-4`), full width.
Four cards of fixed width **302.122 → 302px** → **2 × 2 grid** within the 624px column
(302 + 16 + 302 = 620 ≤ 624).

**`Compact Video Card` — shared spec**

| Property | Value |
|---|---|
| Width | **302.122 → 302px** (fixed, does not flex) |
| Background | `--color-surface-base` `#fdfcfb` |
| Border | 0.994px → **1px** solid `--color-border-default` `#e0dfdb` |
| Border radius | **12px** |
| Shadow | `0px 1px 2px rgba(0,0,0,0.06)` — ≈ the **`Elevation/1`** token (`#0000000F`, offset 0,1, radius 2). Bind to `Elevation/1` |
| Layout | Vertical flex, `align-items: flex-start`, **gap 12px** (`--space-3`) |
| Overflow | clip |
| Padding | **none** (same flush-content issue as §3.10.4's Sponsor Card) |

- **`Thumbnail Container`** — `aspect-ratio: 16/9`, full width, `border-radius: 8px`, `overflow: clip`.
  Raster PNG, `object-fit: cover`, `pointer-events: none`.
  - **`Play Button`** — absolutely centred (`left: 50%`, `top: calc(50% + 0.5px)`, `translate(-50%, -50%)`),
    **35.778 → 36 × 36**, `border-radius: 18px`, background `rgba(255,255,255,0.2)`,
    `backdrop-filter: blur(3.975px → 4px)`, border **1.988 → 2px** solid `#ffffff`, vertical flex centred.
    Inner `play` SVG: **12.92 → 13 × 13**.
  - **`Duration`** — absolute at `bottom: 7.95px`, `left: 7.95px` (→ **8px / 8px**),
    background `rgba(0,0,0,0.8)`, `border-radius: 4px`, padding **8px horizontal / 4px vertical**.
    Text: Alexandria **SemiBold 600**, **13px**, LH normal, `#ffffff`, nowrap.
- **`Info`** — vertical flex, `align-items: flex-end`, **gap 4px**, full width, `text-align: right`.
  - Title: Alexandria **SemiBold 600**, **13px**, LH normal, `--color-text-primary` `#000000`,
    `overflow: hidden`, `text-overflow: ellipsis`, `width: min-content`, `min-width: 100%`.
  - View count: `Type/Caption` — Alexandria Regular 400, `--typography-caption-desktop` = **13px**,
    LH 1.4, `--color-text-secondary` `#616058`, nowrap.

> ⚠️ **Title and view count are both 13px** — the title is only distinguished by weight (SemiBold vs
> Regular) and colour. Weak hierarchy for a card title. Recorded as observed.
> ⚠️ **`Duration` is bottom-**left**, which in an RTL layout is the *trailing* corner.** Verify against the
> rendered screenshot whether this should mirror to bottom-right. **DESIGN DECISION REQUIRED.**

**The four videos — content**

| # | Card node | Thumb node | Play btn (icon) | Duration node | Duration | Title | Title node | Views | Views node | Info node |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `2374:2059` | `2374:2060` | `2374:2061` (`2374:2062`) | `2374:2064` | `04:20` | `ملخص بطولة الدولة لاختراق الضاحية - الفئات العمرية` | `2374:2067` | `1.2K مشاهدة` | `2374:2068` | `2374:2066` |
| 2 | `2374:2069` | `2374:2070` | `2374:2071` (`2374:2072`) | `2374:2074` | `12:45` | `لقاء خاص مع بطلة الوثب العالي بعد تحطيم الرقم القياسي` | `2374:2077` | `850 مشاهدة` | `2374:2078` | `2374:2076` |
| 3 | `2374:2079` | `2374:2080` | `2374:2081` (`2374:2082`) | `2374:2084` | `08:15` | `خلف الكواليس: تدريبات المنتخب الوطني للأداء العالي` | `2374:2087` | `3.4K مشاهدة` | `2374:2088` | `2374:2086` |
| 4 | `2374:2089` | `2374:2090` | `2374:2091` (`2374:2092`) | `2374:2094` | `18:30` | `وثائقي قصير: مسيرة ألعاب القوى الإماراتية نحو العالمية` | `2374:2097` | `5.1K مشاهدة` | `2374:2098` | `2374:2096` |

> Node ids `2374:2063`, `2073`, `2083`, `2093` are absent — deleted/hidden nodes (one per card, the same
> slot each time).
> **View-count format:** `1.2K` / `850` / `3.4K` / `5.1K` + `مشاهدة`. Uses the **Latin `K` abbreviation**
> inside Arabic text. Confirm with the content owner whether Arabic `ألف` is preferred. Copy note.

#### 3.11.2 Live Streaming column — `2374:2099`

Vertical flex, `align-items: flex-start`, **gap 24px**, `flex: 1 0 0`, `min-width: 0`.

**`Live Header` `2374:2100`** — horizontal flex, `align-items: center`, `justify-content: flex-end`,
**gap 12px** (`--space-3`), full width.

| Node id | Element | Detail |
|---|---|---|
| `2374:2101` | `Live Badge` | background token **`color/semantic/live`** `#c8102e`, `border-radius: 100px`, padding **10px / 4px**, horizontal flex, `align-items: center`, **gap 6px** |
| `2374:2102` | `Ellipse` | **8 × 8 px** SVG dot |
| `2374:2103` | Badge text | `مباشر` ("Live") — Alexandria **Bold 700**, **13px**, LH normal, `#ffffff`, nowrap |
| `2374:2104` | Column title (H2) | `البث المباشر` — Alexandria Bold 700, **32px**, LH 1.25, `--color-text-primary` `#000000`, `text-align: right`, nowrap |

> ✅ **Better than §3.7.2's live badge:** here the dot is only the SVG `2374:2102` with **no duplicated `●`
> character** in the text. Use **this** version as the canonical Live Badge; fix §3.7.2 to match.
> Note the radius differs though: `100px` here vs `9999px` in §3.7.2. Both render as a pill.
> Also this badge's dot is **8px** vs §3.7.2's **6px**, and this text is `#ffffff` vs
> `--color-surface-base` `#fdfcfb` there. Two near-identical badges with three small divergences.
> Classified: **DESIGN DECISION REQUIRED** — consolidate into one `Live Badge` component.

**`Main Player Card` `2374:2105`**

| Property | Value |
|---|---|
| Background | `--color-surface-base` `#fdfcfb` |
| Border | 0.994px → **1px** solid `--color-border-default` `#e0dfdb` |
| Border radius | **12px** |
| Shadow | `0px 1px 2px rgba(0,0,0,0.06)` — bind to **`Elevation/1`** |
| Layout | Vertical flex, `align-items: flex-start`, full width |
| Overflow | clip |

**`Video Frame` `2374:2106`** — `aspect-ratio: 16/9`, full width, `overflow: clip`,
raster PNG `object-fit: cover`, `pointer-events: none`. **No border-radius of its own** (clipped by the card).

| Node id | Element | Detail |
|---|---|---|
| `2374:2107` | `Play Button` | absolutely centred (`left: calc(50% + 0.07px)`, `top: calc(50% + 0.92px)`, `translate(-50%,-50%)` → **implement exact centre**), **55.654 → 56 × 56**, `border-radius: 28px`, background `rgba(255,255,255,0.2)`, `backdrop-filter: blur(4px)`, border **2px** solid `#ffffff`, vertical flex centred |
| `2374:2108` | `play` icon | **19.876 → 20 × 20** SVG |
| `2374:2110` | `YouTube Brand` | absolute at `right: 11.78px`, `top: 11.93px` (→ **12 / 12**), background `rgba(0,0,0,0.7)`, `border-radius: 6px`, padding **12px / 6px**, horizontal flex, `align-items: center`, **gap 6px** |
| `2374:2111` | `youtube` icon | **15.901 → 16 × 16** SVG |
| `2374:2113` | Brand label | `YouTube Live` — Alexandria **SemiBold 600**, **13px**, LH normal, `#ffffff`, nowrap |

> Node id `2374:2109` / `2374:2112` are absent — deleted/hidden nodes.
> The Play Button is the **same component at two scales**: 36px (compact cards) and 56px (main player),
> with the icon scaling 13 → 20. Same fill, blur, and 2px white border. Good — one component, two sizes.

**`Stream Info Block` `2374:2114`** — vertical flex, `align-items: flex-end`, **gap 16px** (`--space-4`),
**padding 24px**, full width.

**`Titles` `2374:2115`** — vertical flex, `align-items: flex-end`, **gap 8px**, full width, `text-align: right`.

| Node id | Role | Copy | Font | Size | Weight | LH | Colour |
|---|---|---|---|---|---|---|---|
| `2374:2116` | Stream title | `ملتقى الإمارات الدولي لألعاب القوى 2026` | Alexandria Bold | **18px** | 700 | normal | `--color-text-primary` `#000000` |
| `2374:2117` | Description | `بث حي ومباشر لكافة مسابقات الجري والوثب والرمي بمشاركة نخبة من أبطال العالم والمنتخب الوطني الإماراتي من استاد آل نهيان بأبوظبي.` | Alexandria Regular (`Type/Caption`) | `--typography-caption-desktop` = **13px** | 400 | 1.4 | `--color-text-secondary` `#616058` |

> ⚠️ **18px** — third occurrence of this undefined size (also §3.7.2, §3.10.5). **DESIGN SYSTEM GAP.**

**`Actions` `2374:2118`** — horizontal flex, `align-items: flex-start`,
`justify-content: flex-end`, **gap 12px** (`--space-3`), full width.

| Node id | Button | Background | Border | Radius | Padding | Icon | Icon node | Label | Label node | Label style |
|---|---|---|---|---|---|---|---|---|---|---|
| `2374:2119` | `YouTube External Button` | **none (transparent)** | 0.994px → **1px** solid **`red`** (`#ff0000`) | **8px** | **18px / 10px** | `youtube` **15.901 → 16 × 16** SVG | `2374:2120` | `مشاهدة على يوتيوب` ("Watch on YouTube") | `2374:2122` | Alexandria **SemiBold 600**, **13px**, LH normal, `--color-text-primary` `#000000` |
| `2374:2123` | `Share Button` | `#ffffff` (raw white) | 0.994px → **1px** solid `--color-border-default` `#e0dfdb` | **8px** | **14px / 10px** | `share-2` **13.913 → 14 × 14** SVG | `2374:2124` | `مشاركة` ("Share") | `2374:2126` | `Type/Label` — Alexandria Medium 500, **13px**, LH 1.3, `--color-text-primary` `#000000` |

> Node ids `2374:2121` / `2374:2125` are absent — deleted/hidden nodes.
> Both buttons carry **gap 8px** (YouTube) / **gap 6px** (Share) between icon and label — inconsistent.
> ⚠️ The YouTube button's border is literal **`red` / `#ff0000`**, not the tokenized Federation Red
> `color/semantic/achievement` `#c8102e`. It is YouTube brand red, so arguably correct as a third-party
> brand cue (cf. the §3.2.4 social buttons which also use raw brand colours). **Recorded as intentional
> third-party branding**, consistent with the G.13 principle in §3.5.3 (entity colour confined to the
> entity's own asset/affordance).
> ⚠️ The Share button's `#ffffff` should be `--color-surface-raised`. Recorded.
> ⚠️ **This is a two-column section with no "view all" for the live column** and no pagination — the live
> stream is a single card. Correct for the content type.


---

### 3.12 Photo Albums — `2374:2127`

| Property | Value |
|---|---|
| Node id | `2374:2127` |
| Name | `Photo Albums Section` |
| Size | 1440 × **1431** — the tallest section on the page |
| y-offset | 6783.13 |
| Background | **`--color-gray-950` `#131210`** — the only *token-bound* dark section on the page |
| Layout | Vertical flex, `align-items: flex-start`, **gap 48px** (`--space-12`) |
| Padding | **64px** all sides (`--space-16`) ✅ page-standard |
| Content width | **1312px** ✅ |

> **Art direction:** a full dark section (near-black `#131210`) with white type, sitting between the light
> Live Stream section and the light Memberships section. It is the page's second dark block after the
> §3.3 sponsors bar and §3.14 newsletter. Note it uses a **token** (`--color-gray-950`) where §3.3 uses
> raw `#070c08` and §3.6.4's athlete cards use raw `#0f1115`. **Four different near-blacks on one page;
> only this one is tokenized.** Classified: **DESIGN DECISION REQUIRED** — consolidate to `--color-gray-950`.

Height arithmetic (verified — the section really is 1431 tall):
64 (top pad) + 204 (header) + 48 (gap) + 400 (featured) + 48 (gap) + 603 (grid) + 64 (bottom pad) = **1431**.

#### 3.12.1 Header — `2828:10`

Vertical flex, `align-items: flex-end`, **gap 24px**, full width. Total height 204.

**`Title Group` `2828:11`** — vertical flex, `align-items: flex-end`, **gap 8px**, full width,
`text-align: right`, nowrap, colour `--color-text-inverse` `#ffffff`.

| Node id | Role | Copy | Font | Size | Weight | LH | Notes |
|---|---|---|---|---|---|---|---|
| `2828:12` | Section title | `معرض الصور` ("Photo Gallery") | Alexandria **Bold** | **40px** | 700 | **1.2** | ⚠️ 40px at LH 1.2 matches `Type/H1`'s *metrics* but H1 is **Black 900**; this is **Bold 700**. Near-miss, unbound |
| `2828:13` | Subtitle | `استكشف لحظات المجد الرياضي` | Alexandria Regular | **16px** | 400 | **1.5** | `opacity: 0.8`. Matches `Type/Subtitle` metrics but that style is Medium 500 |

> ⚠️ **This is the only section whose title is 40px**; every other section title is 32px (`Type/H2`).
> Combined with the dark treatment, the Photo Gallery is being given hero-level weight.
> Classified: **DESIGN DECISION REQUIRED** — is this an intentional emphasis or a drift from `Type/H2`?

**`Actions` `2828:14` — EMPTY FRAME.**
Full width × **100px**, **no children, no fill**. It reserves 100px of vertical space and renders nothing.

> ⚠️ **NOT EXTRACTED — the frame is genuinely empty in Figma.** It is a reserved slot (most likely for
> filter chips or a "view all" action, matching the §3.6.2 / §3.7.2 filter pattern) that was never filled.
> **100px of dead space** will render. Classified: **DESIGN DECISION REQUIRED** — either populate the slot
> or remove it and reclaim the 100px (which would reduce the section to 1331px).

#### 3.12.2 Featured Album — `2828:15`

Horizontal flex, `align-items: center`, **gap 32px**, full width, height 400.

**`Featured Image` `2828:16`** — **600 × 400** fixed, `border-radius: 16px` (`--radius-lg`),
`overflow: clip`, **padding 24px**, vertical flex, `align-items: flex-start`, `justify-content: flex-end`.
Background: raster PNG, `object-fit: cover`, `pointer-events: none`.

**`Overlay` `2828:17`** — background `rgba(0,0,0,0.5)`, `border-radius: 12px`, **padding 16px**,
vertical flex, `align-items: flex-start`, **gap 8px**, full width, nowrap,
colour `--color-text-inverse` `#ffffff`.

| Node id | Role | Copy | Font | Size | Weight |
|---|---|---|---|---|---|
| `2828:18` | Album title | `حفل الافتتاح` ("Opening Ceremony") | Alexandria Bold | **24px** | 700 |
| `2828:19` | Photo count | `120+ صورة عالية الدقة` ("120+ high-resolution photos") | Alexandria Regular | **14px** | 400 |

**`Featured Info` `2828:20`** — `flex: 1 0 0`, `min-width: 0`, vertical flex,
`align-items: flex-end`, **gap 24px**. Computed width: 1312 − 600 − 32 = **680px**.

| Node id | Role | Copy | Font | Size | Weight | LH | Colour |
|---|---|---|---|---|---|---|---|
| `2828:21` | Heading | `البوم الأسبوع: لحظات الافتتاح` ("Album of the week: opening moments") | Alexandria **SemiBold** | **24px** | 600 | normal | `--color-text-inverse` `#ffffff` |
| `2828:22` | Description | `استمتع بتوثيق لحظات بداية البطولة، من الافتتاح إلى لحظات التتويج. مجموعة شاملة من الصور الفوتوغرافية عالية الجودة.` | Alexandria Regular | **16px** | 400 | **1.6** | `--color-text-inverse` `#ffffff`, `opacity: 0.8` |

> ⚠️ **Copy defect:** `البوم` should be **`ألبوم`** (with hamza/alif-lam). It appears misspelled in both
> `2828:21` and `2828:25`. Flag to the content owner.
> ⚠️ Two 24px headings in the same block (`2828:18` Bold, `2828:21` SemiBold) — different weights,
> same size, no defined role for either. **DESIGN SYSTEM GAP.**

**`Stats` `2828:23` — EMPTY FRAME.** **100 × 100**, no children, no fill.

> ⚠️ **Second empty reserved slot in this section** (see `2828:14`). **NOT EXTRACTED — empty in Figma.**
> Presumably intended for album statistics (photo count / date / photographer).
> Classified: **DESIGN DECISION REQUIRED**.

#### 3.12.3 Album Grid — `2828:24`

Vertical flex, `align-items: flex-end`, **gap 24px**, full width. Height 603.

**Grid heading `2828:25`** — `جميع البومات الصور` ("All photo albums") — Alexandria **Bold 700**,
**24px**, LH normal, `--color-text-inverse` `#ffffff`, `text-align: right`, nowrap. Size 237 × 29.

**`Grid Rows` `2828:26`** — vertical flex, `align-items: flex-start`, **gap 24px**, full width.
Two rows (`2828:27`, `2828:43`), each a horizontal flex with `align-items: flex-start`,
`justify-content: flex-end`, **gap 24px**, full width. **3 cards per row, 6 total.**

Card width **320px** fixed × 3 + 24 × 2 gaps = **1008px** in a **1312px** row.
`justify-content: flex-end` pushes them to the right (RTL start), leaving **304px empty on the left**.

> ⚠️ **The grid does not fill its container.** Either the cards should flex to fill 1312
> ((1312 − 48) / 3 = **421.3px** each), or a 4th column should be added
> ((1312 − 72) / 4 = **310px** each — close to the current 320). Classified:
> **DESIGN DECISION REQUIRED**. Do not silently rescale — this is a real layout decision.

**`Album Item` — shared specification**

| Property | Value |
|---|---|
| Width | **320px** fixed |
| Background | `--color-surface-base` `#fdfcfb` (**light cards on the dark section**) |
| Border | **1px** solid `--color-border-default` `#e0dfdb` |
| Border radius | **16px** (`--radius-lg`) |
| Shadow | `0px 1px 2px rgba(0,0,0,0.06)` — bind to **`Elevation/1`** |
| Padding | **16px** (`--space-4`) |
| Layout | Vertical flex, `align-items: flex-start`, **gap 12px** (`--space-3`) |
| Overflow | clip |

- **`Image`** — full width × **180px**, `border-radius: 8px`, raster PNG `object-fit: cover`,
  `pointer-events: none`. (Content box is 320 − 32 = 288px wide → **288 × 180**, a 1.6:1 ratio.)
- **`Content`** — vertical flex, `align-items: flex-start`, **gap 4px**, full width,
  `text-align: right`, nowrap.
  - Album name: Alexandria **Bold 700**, **16px**, LH normal, `--color-text-primary` `#000000`
  - Photo count: Alexandria Regular 400, **12px**, LH normal, `--color-text-secondary` `#616058`

> ⚠️ **12px photo count is below the 13px minimum**, not covered by ADR-0041. Six instances.
> **DESIGN DECISION REQUIRED.**

**The six albums — content**

| Row | # | Card node | Image node | Content node | Album name | Name node | Photo count | Count node |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 | `2828:28` | `2828:29` | `2828:30` | `حفل الافتتاح` (Opening Ceremony) | `2828:31` | `120+ صورة عالية الدقة` | `2828:32` |
| 1 | 2 | `2828:33` | `2828:34` | `2828:35` | `المضمار والميدان` (Track & Field) | `2828:36` | `85 صورة` | `2828:37` |
| 1 | 3 | `2828:38` | `2828:39` | `2828:40` | **`كرة القدم` (Football)** | `2828:41` | `210+ صورة` | `2828:42` |
| 2 | 4 | `2828:44` | `2828:45` | `2828:46` | **`كرة السلة` (Basketball)** | `2828:47` | `45 صورة` | `2828:48` |
| 2 | 5 | `2828:49` | `2828:50` | `2828:51` | **`كرة الطائرة` (Volleyball)** | `2828:52` | `60 صورة` | `2828:53` |
| 2 | 6 | `2828:54` | `2828:55` | `2828:56` | `حفل التتويج` (Awards Ceremony) | `2828:57` | `30 صورة` | `2828:58` |

> ### ⚠️ SERIOUS CONTENT/IA DEFECT — escalate before implementation
>
> **Three of the six albums are for sports the UAE Athletics Federation does not govern:**
> `كرة القدم` (Football), `كرة السلة` (Basketball), `كرة الطائرة` (Volleyball).
>
> This is an **athletics** federation. The page's own §3.6.2 filters define the discipline taxonomy as
> `مضمار` / `ميدان` / `طرق` (Track / Field / Road), and §3.4's stats speak only of athletics.
>
> These three albums are almost certainly **generic template placeholder content that survived into the
> approved baseline**. They must not ship. Classified: **CONTENT DEFECT — escalate to the content owner.**
> Note that album 1 (`حفل الافتتاح`, `120+ صورة عالية الدقة`) also **duplicates the Featured Album
> `2828:16`–`2828:19` exactly** — same title, same count.

#### 3.12.4 Decorative swooshes — `2828:59`, `2828:60`

⚠️ **This section's swooshes are a DIFFERENT asset set** from every other section — different layer names
(`swoosh-1` / `swoosh-2`, not the bilingual `خط أحمر — Red Swoosh` naming), a different count (2, not 4),
and `2828:59` uses a **−30° rotation** where every other swoosh on the page uses **−35°**.

| Node id | Name | Inner size | Rotation | Wrapper box | Wrapper position |
|---|---|---|---|---|---|
| `2828:59` | `swoosh-1` | 300 × 40 | **−30°** | 279.808 × 184.641 | left **−50**, top **−170** |
| `2828:60` | `swoosh-2` | 250 × 30 | −35° | 221.995 × 167.969 | left **1100**, top **306.61** |

> Colours are baked into the SVGs and were **NOT EXTRACTED** — recover from the exported assets.
> Classified: **DESIGN DECISION REQUIRED** — align this section's motif with the page-wide four-stroke
> −35° system, or document it as an intentional variant.

---

### 3.13 Memberships — `2374:2161`

| Property | Value |
|---|---|
| Node id | `2374:2161` |
| Name | `memberships-section` |
| Size | 1440 × **459** |
| y-offset | 8214.13 |
| Background | `--color-surface-base` `#fdfcfb` |
| Layout | Vertical flex, `align-items: center`, `justify-content: center`, **gap `--space-12` (48px)** |
| Padding | **64px horizontal** / **`--space-16` (64px) vertical** ✅ page-standard |

> ✅ **This is the best-tokenized section on the page.** Spacing, radius and colour are almost entirely
> bound to variables (`--space-12`, `--space-16`, `--space-5`, `--space-4`, `--space-3`, `--radius-lg`).
> Use it as the reference for how the rest of the page should be tokenized.

Decorative swooshes — bottom-right pair only, at a **slightly smaller scale** than the standard set:

| Node id | Asset | Inner size | Wrapper box | Wrapper position |
|---|---|---|---|---|
| `2737:32` | `خط أسود — Black Swoosh` | 212.058 × 23.868 | 187.398 × 141.183 | left 1256.4, top 318.5 |
| `2737:33` | `خط أحمر صغير — Red Swoosh Small` | 133.11 × 15.606 | 117.989 × 89.132 | left 1338.1, top 352.77 |

#### 3.13.1 Header — `2374:2162`

Vertical flex, `align-items: center`, **gap `--space-3` (12px)**, full width, `text-align: center`.

**Title `2374:2163`** — a **single text node with three styled spans** (mixed-style rich text).
Container: Alexandria Bold, `font-size: 0`, `line-height: 0`, `--color-text-primary` `#000000`, full width.

| Span | Text | Size | LH | Colour |
|---|---|---|---|---|
| 1 | `نحن ` | 32px | 1.25 | `--color-text-primary` `#000000` |
| 2 | **`فخورون`** | 32px | 1.25 | **`#00843d`** (federation green — highlighted word) |
| 3 | ` بعضويتنا في كبرى المنظمات` | 32px | 1.25 | `--color-text-primary` `#000000` |

Full string: `نحن فخورون بعضويتنا في كبرى المنظمات` ("We are **proud** of our membership in the major organizations")

> **Approved pattern:** a single word highlighted in federation green inside an otherwise black heading.
> This is the **only** mixed-colour heading on the page. Implement as a `<span>` inside the heading, not as
> three separate elements.
> ⚠️ The green here is the **raw hex `#00843d`, not the `--color-brand-primary` token**, even though the
> rest of this section is well tokenized. Bind it. Recorded.
> ⚠️ The container's `font-size: 0` / `line-height: 0` is a Figma mixed-style artifact — do not reproduce.

**Subtitle `2374:2164`** — `تمثيل رسمي فاعل ومستمر لدولة الإمارات العربية المتحدة في المحافل الإقليمية والدولية لألعاب القوى`
— `Type/Caption` Alexandria Regular 400, `--typography-caption-desktop` = **13px**, LH 1.4,
`--color-text-secondary` `#616058`, full width, centred.

#### 3.13.2 Organizations Row — `2374:2165`

Horizontal flex, `align-items: center`, `justify-content: center`, **gap `--space-4` (16px)**, full width.
**Five equal cards**, each `flex: 1 0 0`, `min-width: 0`.
Computed width: (1312 − 4 × 16) / 5 = **249.6px** each.

**Organization card — shared specification (`CMP-AFFILIATIONS-001`)**

| Property | Default | Hover / active variant |
|---|---|---|
| Height | **220px** | 220px |
| Background | `--color-surface-base` `#fdfcfb` | same |
| Border | **1px** solid `--color-border-default` `#e0dfdb` | **1px solid `--color-brand-primary` `#00843d`** |
| Border radius | **`--radius-lg` (16px)** | same |
| Padding | **`--space-5` (20px)** | same |
| Layout | Vertical flex, `align-items: center`, `justify-content: center`, **gap `--space-3` (12px)** | same |
| Shadow | `drop-shadow(0px 12px 12px rgba(0,0,0,0.07)) drop-shadow(0px 2px 3px rgba(0,0,0,0.04))` | `0px 0px 16px rgba(0,132,61,0.15)`, `0px 16px 32px rgba(0,0,0,0.08)`, `0px 2px 6px rgba(0,0,0,0.04)` — **green glow** |

- **`Organization Emblem`** — **96 × 96**, `border-radius: 8px`, raster PNG,
  `object-fit: cover`, `pointer-events: none`.
- **`Labels`** — vertical flex, `align-items: center`, **gap 4px**, full width, `text-align: center`.
  - **Arabic name:** Alexandria **Bold 700**, **14px**, LH normal, `--color-text-primary` `#000000`, full width
  - **English name:** Alexandria **Medium 500**, **10.5px**, LH normal, `--color-text-secondary` `#616058`,
    full width, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`

> ### CAPTION-GAP — refined evidence (corrects `CLAUDE.md` §6)
>
> This is the `CMP-AFFILIATIONS-001` bilingual organization caption pair named in `CLAUDE.md` §6, and it is
> **RESOLVED — ADR-0041 (Membership Caption Exception)**, documented at Design System **Chapter 4 §4.15b**
> and cross-referenced from **Chapter 8 L8**. No further owner decision is required for this item.
>
> **However, the measured values differ from what §6 records.** §6 states
> `Arabic: 12.5px / English: 10.5px` across 10 nodes. **Direct measurement of all five cards shows:**
>
> | Language | Measured size | Count |
> |---|---|---|
> | Arabic | **14px** (Alexandria Bold 700) | 5 |
> | English | **10.5px** (Alexandria Medium 500) | 5 |
>
> The 10 nodes are confirmed, and the English 10.5px matches. **But the Arabic captions measure 14px, not
> 12.5px** — i.e. they are **above** the 13px minimum and do not need the exception at all. Either the
> Arabic captions were corrected after §6 was written, or §6's Arabic figure was recorded from a different
> instance. **Only the 5 English captions at 10.5px actually rely on ADR-0041.**
> Recommend updating `CLAUDE.md` §6 to reflect this. Do not change the design.

**The five organizations — content**

| # | Card node | Emblem node | Labels node | Arabic name | AR node | English name | EN node | State |
|---|---|---|---|---|---|---|---|---|
| 1 | `2374:2166` | `2374:2167` | `2374:2168` | `المجلس الأولمبي الآسيوي` | `2374:2169` | `Olympic Council of Asia` | `2374:2170` | default |
| 2 | `2374:2171` | `2374:2172` | `2374:2173` | `اللجنة الأولمبية الدولية` | `2374:2174` | `International Olympic Committee` | `2374:2175` | default |
| 3 | `2374:2176` | `2374:2177` | `2374:2178` | `الاتحاد الآسيوي لألعاب القوى` | `2374:2179` | `Asian Athletics Association` | `2374:2180` | **HOVER** (layer name: `Card - Asian Athletics Association (Hover)`) |
| 4 | `2374:2181` | `2374:2182` | `2374:2183` | `الاتحاد الدولي لألعاب القوى` | `2374:2184` | `World Athletics` | `2374:2185` | default |
| 5 | `2374:2186` | `2374:2187` | `2374:2188` | `اللجنة الأولمبية الوطنية الإماراتية` | `2374:2189` | `UAE National Olympic Committee` | `2374:2190` | default |

> ✅ **The hover state is documented in the design** (card 3). Border → `--color-brand-primary`,
> shadow → green glow `0px 0px 16px rgba(0,132,61,0.15)` plus a deeper drop.
> **This is the only explicitly designed hover state on the entire page.** Implement it as the
> card-hover pattern; it is the one piece of interaction-state evidence available.
> Card 3 is shown *in* its hover state in the static composition — build it as the **default** card with
> the hover applied on `:hover`/`:focus-visible`, not as a permanently highlighted card.
>
> ⚠️ **Card 4's emblem breaks the shared spec:** `2374:2182` is **180 × 150**, not **96 × 96**.
> World Athletics' emblem is wider, but this makes card 4 visually inconsistent with the other four and
> may overflow the 249.6px card (180 fits within 249.6 − 40 padding = 209.6, so it fits, but it is
> 1.9× the others' area). Classified: **DESIGN DECISION REQUIRED** — normalize to a 96px box with
> `object-fit: contain`, or document the exception.
> ⚠️ All five emblems use **`object-fit: cover`**, which crops logos. **`contain` is correct for emblems**
> (§3.10.4's Sponsor Card logos correctly use `contain`). Classified: **VERIFIED DEFECT.**

#### 3.13.3 Carousel Controls — `2374:2191`

**78 × 24**, a single flattened **SVG**.

> **NOT EXTRACTED — the entire control (arrows and/or dots) is one flattened SVG with no child nodes.**
> No individual arrow, dot, size, colour or state is recoverable via the API. Rebuild from the pattern
> established elsewhere; note this is a **fifth** distinct carousel-control treatment
> (see §3.2.6, §3.6.6, §3.9.4, and this).
> There are only 5 cards and they already fit — the control's purpose is unclear. Classified:
> **DESIGN DECISION REQUIRED.**

---

### 3.14 Newsletter — `2387:1128`

| Property | Value |
|---|---|
| Node id | `2387:1128` |
| Name | `Newsletter Section` |
| Size | 1440 × **223** |
| y-offset | 8673.13 |
| Background | **linear gradient left→right `#111827` → `#1a1a2e`** (raw hex, untokenized — a fifth and sixth near-black) |
| Border | **bottom** 1px solid `rgba(255,255,255,0.1)` |
| Layout | Vertical flex, `align-items: center`, `justify-content: center`, **gap 20px** (`--space-5`) |
| Padding | **64px horizontal / 72px vertical** |

> Dark band immediately above the black footer — a deliberate "dark run-out" into the footer.
> ⚠️ The gradient's two stops are **not** `--color-gray-950` `#131210` (used by §3.12) nor
> `--color-brand-black` `#000000` (used by the footer). **DESIGN DECISION REQUIRED.**

**Ambient glows** (decorative radial SVGs, both escaping the 223px section bounds):

| Node id | Name | Size | Position | Inner inset |
|---|---|---|---|---|
| `2387:1129` | `Glow Top Left` | **400 × 400** | left **−150**, top **−150** | `inset: -25%` |
| `2387:1130` | `Glow Bottom Right` | **300 × 300** | left **1100**, top **450** | `inset: -26.67%` |

> ⚠️ `Glow Bottom Right` sits at **top 450 in a 223px-tall section** — entirely below the section,
> i.e. **invisible** (it would render over the footer if not clipped). Almost certainly a leftover from a
> taller earlier version. Classified: **DESIGN DECISION REQUIRED** — reposition or remove.
> Glow colours are baked into the SVGs — **NOT EXTRACTED**; recover from the exported assets.

**Content**

| Node id | Role | Copy | Font | Size | Weight | LH | Colour |
|---|---|---|---|---|---|---|---|
| `2387:1131` | Heading | `لا تفوّت أي بطولة وطنية` ("Don't miss any national championship") | Alexandria Bold | **28px** | 700 | normal | `#ffffff`, centred, nowrap |
| `2387:1132` | Subheading | `اشترك لتصلك النتائج ومواعيد التسجيل وأخبار الاتحاد مباشرة إلى بريدك الإلكتروني.` | Alexandria Regular | **14px** | 400 | normal | `rgba(255,255,255,0.85)`, centred, nowrap |

> ⚠️ **28px** — undefined size (also §3.10.3). **DESIGN SYSTEM GAP.**
> ⚠️ Both are `white-space: nowrap` at 1440. They **will overflow on any narrower viewport.**
> **VERIFIED DEFECT** — remove `nowrap` on implementation.

**`Form Row` `2387:1133`** — horizontal flex, `align-items: center`, **gap 12px** (`--space-3`), `overflow: clip`.

DOM order is **Button first, Input second** — correct for RTL (input on the right, button on the left).

| Node id | Element | Detail |
|---|---|---|
| `2387:1136` | `Email Input` | **340px** wide, background `#ffffff` (raw), border **1px** solid `#dee0e3` (raw hex — same untokenized border as §3.2.3 and §3.6.6), `border-radius: 10px`, padding **18px horizontal / 14px vertical**, `overflow: clip` |
| `2387:1137` | Placeholder | `بريدك الإلكتروني` ("Your email") — Alexandria Regular 400, **14px**, LH normal, `--color-text-secondary` `#616058`, `text-align: right` |
| `2387:1134` | `Subscribe Button` | background `--color-brand-primary` `#00843d`, `border-radius: **10px**`, padding **24px horizontal / 14px vertical**, `overflow: clip` |
| `2387:1135` | Button label | `اشتراك` ("Subscribe") — Alexandria **SemiBold 600**, **14px**, LH normal, `#ffffff`, centred, nowrap |

> ⚠️ **Fourth button geometry on the page**: `10px` radius here vs `9999px` (hero), `8px` (§3.7.2, §3.10.5).
> And a fourth label style: SemiBold 14 here vs Bold 16 / Medium 13 / Medium 14.
> Classified: **DESIGN DECISION REQUIRED** — consolidate `CMP-BUTTON-001`.
> ⚠️ **No form validation, error, success, or focus state exists in the composition.**
> **NOT EXTRACTED — these states do not exist in Figma.** They must be designed
> (`CLAUDE.md` §14 requires error states and focus states). Do not fabricate them silently — raise them.
> ⚠️ **No accessible label** is present, only a placeholder. A real `<label>` is required.

**Decorative swooshes** — full four-stroke set at the **smallest scale on the page** (~0.44×):

| Node id | Asset | Inner size | Wrapper box | Wrapper position |
|---|---|---|---|---|
| `2737:34` | `خط أحمر — Red Swoosh` | 90.092 × 10.258 | 79.683 × 60.078 | left −13.38, top −56.67 |
| `2737:35` | `خط أخضر — Green Swoosh` | 128.894 × 16.948 | 115.305 × 87.814 | left −4.46, top −65.55 |
| `2737:36` | `خط أسود — Black Swoosh` | 103.026 × 11.596 | 91.045 × 68.592 | left 1350.8, top 157.31 |
| `2737:37` | `خط أحمر صغير — Red Swoosh Small` | 64.67 × 7.582 | 57.323 × 43.304 | left 1390.49, top 173.96 |

> ⚠️ A **black** swoosh (`2737:36`) on a `#111827`→`#1a1a2e` dark gradient will be invisible.
> The footer (§3.15) correctly substitutes a **white** swoosh for its dark ground.
> Classified: **VERIFIED DEFECT** — use the white swoosh variant here, as the footer does.


---

### 3.15 Footer — `2374:2198`

| Property | Value |
|---|---|
| Node id | `2374:2198` |
| Name | `Section / Footer` |
| Size | 1440 × **514** |
| y-offset | 8896.13 (ends at 9410.13 — the page's true bottom) |
| Background | **`--color-brand-black` `#000000`** (token-bound ✅) |
| Layout | Vertical flex, `align-items: center`, `justify-content: center` |
| Padding | **72px top**, **64px horizontal**, **0 bottom** (the Legal Strip supplies its own 24px) |
| Content width | **1312px** ✅ |

> **This footer supersedes the older `74:996` master.** Per the project's approved footer redesign, the
> Location map column and the five-icon social set (including TikTok) are the current source of truth.
> The composition here matches that redesign.

#### 3.15.1 Footer Grid — `2374:2199`

Horizontal flex, `align-items: flex-start`, **gap 48px** (`--space-12`), **padding-bottom 48px**, full width.
**Four equal columns**, each `flex: 1 0 0`, `min-width: 0`.
Computed width: (1312 − 3 × 48) / 4 = **292px** each.

RTL reading order (right → left): **Contact → Map → Quick Links → Brand.**
So the **Brand column with the logo is leftmost**, matching the header's left-aligned logo (§3.1.3).

All four column headings share one style: Alexandria **Bold 700**, **13px**, LH normal,
`#ffffff`, `text-align: right`, nowrap.

##### (a) Contact — `2374:2200`

Vertical flex, `align-items: flex-end`, **gap 14px**, `flex: 1 0 0`, `min-width: 0`.

| Node id | Role | Copy | Style |
|---|---|---|---|
| `2374:2201` | Heading | `التواصل` ("Contact") | Alexandria Bold 700, **13px**, `#ffffff` |
| `2374:2202` | Address row | — | horizontal flex, `align-items: flex-start`, **gap 8px**, `overflow: clip` |
| `2374:2203` | `map-pin` icon | — | **14 × 14** SVG |
| `2374:2205` | Address | `مدينة زايد الرياضية، أبوظبي، الإمارات العربية المتحدة` | `Type/Caption` Alexandria Regular 400, **13px**, LH 1.4, `rgba(255,255,255,0.65)`, `text-align: right`, **width 200px** |
| `2374:2206` | Email | `info@uaeaf.ae` | `Type/Caption` 13px, LH 1.4, `rgba(255,255,255,0.65)`, right, nowrap. **No `dir="auto"`** (Latin) |
| `2374:2207` | Hours | `الأحد-الخميس، 08:00-15:00` ("Sun–Thu, 08:00–15:00") | `Type/Caption` 13px, LH 1.4, `rgba(255,255,255,0.65)`, right, nowrap |
| `2374:2208` | Help link | `مركز المساعدة` ("Help Centre") | `Type/Caption` 13px, LH 1.4, `rgba(255,255,255,0.65)`, right, nowrap |

> Node id `2374:2204` is absent — deleted/hidden node.
> ⚠️ `info@uaeaf.ae` is not marked up as a `mailto:` link and `مركز المساعدة` is not visually
> distinguished from the non-interactive lines around it. Both are links in intent but not in form.
> Classified: **DESIGN DECISION REQUIRED** (link affordance in the footer).
> ⚠️ `الأحد-الخميس` uses a hyphen where Arabic would take an en dash or `إلى`. Copy note.

##### (b) Map Column — `2374:2209`

Vertical flex, `align-items: flex-end`, **gap 12px** (`--space-3`), `flex: 1 0 0`, `min-width: 0`.

| Node id | Role | Detail |
|---|---|---|
| `2374:2210` | Heading | `الموقع` ("Location") — Alexandria Bold 700, **13px**, `#ffffff`, right, nowrap |
| `2374:2211` | `Map Placeholder` | **250 × 180**, background `#1a1a1a` (raw hex), border **1px** solid `rgba(255,255,255,0.08)`, `border-radius: 16px` (`--radius-lg`), vertical flex centred, **gap 10px** |
| `2374:2212` | `Map Pin Container` | **40 × 40**, background `rgba(255,255,255,0.08)`, `border-radius: 20px` (circle), vertical flex centred |
| `2374:2213` | `map-pin-icon` | **18 × 18** SVG |
| `2374:2215` | Label group | vertical flex, `align-items: center`, **gap 4px**, centred, nowrap |
| `2374:2216` | Place name | `مدينة زايد الرياضية` — Alexandria **SemiBold 600**, **12px**, LH normal, `#ffffff` |
| `2374:2217` | Place city | `أبوظبي، الإمارات` — Alexandria Regular 400, **11px**, LH normal, `rgba(255,255,255,0.65)` |

> Node id `2374:2214` is absent — deleted/hidden node.
> ⚠️ **This is explicitly a `Map Placeholder`, not a map.** No embedded map, no coordinates, no map tile
> asset. **NOT EXTRACTED — no map implementation exists in the design.** The engineer must choose a map
> provider and the design owner must approve the styled map treatment. Classified:
> **DESIGN DECISION REQUIRED.** The 250 × 180 / radius-16 / `#1a1a1a` frame is the approved container.
> ⚠️ **12px and 11px are below the 13px minimum**, not covered by ADR-0041. **DESIGN DECISION REQUIRED.**
> The map column is 292px wide but the placeholder is a fixed 250px — a 42px shortfall. Recorded.

##### (c) Quick Links — `2374:2218`

Vertical flex, `align-items: flex-end`, **gap 12px** (`--space-3`), `flex: 1 0 0`, `min-width: 0`,
`text-align: right`, nowrap.

Heading `2374:2219`: `روابط سريعة` ("Quick Links") — Alexandria Bold 700, **13px**, `#ffffff`.

All ten links share one style: `Type/Caption` — Alexandria Regular 400,
`--typography-caption-desktop` = **13px**, LH 1.4, `rgba(255,255,255,0.65)`.

| # | Node id | Copy | English |
|---|---|---|---|
| 1 | `2374:2220` | `الرئيسية` | Home |
| 2 | `2374:2221` | `عن الاتحاد` | About the Federation |
| 3 | `2374:2222` | `الأندية` | Clubs |
| 4 | `2374:2223` | `الرياضيون` | Athletes |
| 5 | `2374:2224` | `البطولات` | Tournaments |
| 6 | `2374:2225` | `الفعاليات` | Events |
| 7 | `2374:2226` | `الأخبار` | News |
| 8 | `2374:2227` | `الاتحاد في الإعلام` | UAEAF in the Media |
| 9 | `2374:2228` | `المركز الإعلامي` | Media Centre |
| 10 | `2374:2229` | `تواصل معنا` | Contact Us |

> ### IA cross-check against the header nav (`CLAUDE.md` §11) — important
>
> | Concept | Header nav (§3.1.2) | Footer quick links |
> |---|---|---|
> | Home | `الرئيسية` | `الرئيسية` ✅ |
> | About | `عن الاتحاد` | `عن الاتحاد` ✅ |
> | Clubs | `الاندية` (no hamza) | `الأندية` (**with hamza**) ⚠️ |
> | Members / Athletes | `الاعضاء` (Members) | `الرياضيون` (**Athletes**) ⚠️ |
> | Tournaments | `البطولات` | `البطولات` ✅ |
> | Events | `فعاليات الاتحاد` | `الفعاليات` ⚠️ |
> | News | `الاخبار و المقالات` | `الأخبار` ⚠️ |
> | Media Centre | `المركز الاعلامي` (no hamza) | `المركز الإعلامي` (**with hamza**) ⚠️ |
> | UAEAF in the Media | *(absent from nav)* | `الاتحاد في الإعلام` ⚠️ |
> | Contact | `تواصل معنا` | `تواصل معنا` ✅ |
>
> **Findings, all recorded not fixed:**
> 1. **Hamza inconsistency** — the header omits the hamza on `الاندية` / `الاعضاء` / `الاعلامي` /
>    `الاخبار`; the footer includes it. **The footer's spelling is orthographically correct.**
>    Classified: **CONTENT DEFECT — the header nav labels should be corrected**, subject to owner approval
>    per `CLAUDE.md` §12 (do not rewrite approved terminology unilaterally, but *do* report the conflict).
> 2. **`الاعضاء` (Members) vs `الرياضيون` (Athletes)** — these are **different IA concepts**, not spelling
>    variants. The nav's Members node has a dropdown; the footer link points at Athletes.
>    Classified: **REPORT THE CONFLICT** per `CLAUDE.md` §12. Do not merge them.
> 3. **`فعاليات الاتحاد` vs `الفعاليات`** — the same concept named two ways.
> 4. **`الاتحاد في الإعلام` appears in the footer but has no header nav entry**, despite being a
>    full homepage section (§3.9). Possible IA gap.
> 5. ✅ **Events and Tournaments remain distinct** in both nav and footer, consistent with the approved IA.

##### (d) Brand — `2374:2230`

Vertical flex, `align-items: flex-end`, **gap 14px**, `flex: 1 0 0`, `min-width: 0`.

| Node id | Role | Detail |
|---|---|---|
| `2374:2231` | `UAEAF Logo (Vector - White)` | **36.429 × 36 → 36 × 36** SVG, white variant |
| `2374:2241` | Federation name | `اتحاد الإمارات لألعاب القوى` — Alexandria **Bold 700**, **14px**, LH normal, `#ffffff`, right, nowrap |
| `2374:2242` | Description | `الجهة الرسمية المشرفة على رياضة ألعاب القوى في دولة الإمارات العربية المتحدة، عضو في الاتحاد الدولي لألعاب القوى واتحاد ألعاب القوى الآسيوي.` — Alexandria Regular 400, **13px**, LH **1.6**, `rgba(255,255,255,0.65)`, right, **width 260px** |
| `2374:2243` | `Social Icons Row` | horizontal flex, `align-items: center`, **gap 8px** (`--space-2`) |

> ⚠️ **Logo size conflict.** The header logo (`2374:1191`) is **120 × 64**; the footer logo is
> **36 × 36 (square)**. These are two different lockups — the header uses the full horizontal wordmark,
> the footer a square/monogram white variant. Both are legitimate logo variants, but confirm the footer
> asset is the approved monogram and not a squashed version of the header lockup.
> Per the Global Visual Design Protocol the logo is protected — do not re-proportion. Recorded.
> ⚠️ Node ids `2374:2232`–`2374:2240` are absent — a block of deleted/hidden nodes.

**Social Icon Buttons — five, all 32 × 32, `border-radius: 16px` (circular), inner glyph 16 × 16 SVG**

| # | Node id | Platform | Fill | Glyph node | Shadow |
|---|---|---|---|---|---|
| 1 | `2374:2244` | Instagram | gradient top→bottom `#405de6` → `#c13584` (50%) → `#fdaf31` | `2374:2245` | `drop-shadow(0px 4px 5px rgba(193,53,132,0.2))` |
| 2 | `2374:2247` | X | solid `#000000` + raster PNG overlay (`object-fit: contain`) | — (baked into PNG) | `0px 4px 10px -2px rgba(0,0,0,0.25)` |
| 3 | `2374:2248` | YouTube | gradient top→bottom `red` → `#ff3d00` (55%) → `red` | `2374:2249` | `drop-shadow(0px 4px 5px rgba(255,0,0,0.2))` |
| 4 | `2374:2251` | Facebook | gradient top→bottom `#1877f2` → `#8b9bff` (55%) → `#1877f2` | `2374:2252` | `drop-shadow(0px 4px 5px rgba(24,119,242,0.2))` |
| 5 | `2374:2254` | TikTok | full-bleed SVG, inner `inset: -12.5% -25% -37.5% -25%` | — (single SVG) | none |

> Node ids `2374:2246`, `2374:2250`, `2374:2253` are absent — deleted/hidden nodes.
>
> ### ⚠️ Social order differs between hero and footer
>
> | | Order |
> |---|---|
> | Hero sidebar (§3.2.4) | Facebook, X, **Instagram (active)**, TikTok, YouTube |
> | Footer | **Instagram**, X, YouTube, Facebook, TikTok |
>
> Same five platforms, **two different orders**. The hero is a 42px vertical rail with a green connector
> and a green-glow "active" state; the footer is a 32px horizontal row with per-brand coloured shadows and
> no active state. Classified: **DESIGN DECISION REQUIRED** — fix one canonical platform order and one
> `Social Icon Button` component with size variants (42 / 32).
> ✅ Both sets correctly include **TikTok**, per the approved footer redesign.
> ✅ Both apply the G.13 principle (§3.5.3): third-party brand colour confined to the platform's own icon.

#### 3.15.2 Legal Strip — `2374:2256`

| Property | Value |
|---|---|
| Layout | Horizontal flex, `align-items: center`, `justify-content: space-between`, full width, `overflow: clip` |
| Padding | **24px vertical** |
| Border | **top** 1px solid `rgba(255,255,255,0.4)` |
| Shared typography | Alexandria Regular 400, **13px**, LH normal, `rgba(255,255,255,0.65)`, `text-align: right`, nowrap |

**`Legal Links` `2374:2257`** — horizontal flex, `align-items: flex-start`, **gap 24px**, `overflow: clip`.

| # | Node id | Copy | English |
|---|---|---|---|
| 1 | `2374:2258` | `خريطة الموقع` | Sitemap |
| 2 | `2374:2259` | `شروط الاستخدام` | Terms of Use |
| 3 | `2374:2260` | `سياسة الخصوصية` | Privacy Policy |
| 4 | `2374:2261` | **`بيان إمكانية الوصول`** | **Accessibility Statement** |

**Copyright `2374:2262`** — `© 2026 اتحاد الإمارات لألعاب القوى. جميع الحقوق محفوظة.`
("© 2026 UAE Athletics Federation. All rights reserved.")

> ✅ **An Accessibility Statement link is present** — required for a government-affiliated federation and
> consistent with `CLAUDE.md` §14. Ensure the page it links to actually exists.
> ⚠️ The `rgba(255,255,255,0.4)` top border is **more opaque than the 0.65 body text is bright**, making a
> divider that competes with content. Recorded.
> ⚠️ Legal links are visually identical to the surrounding non-link text (same size, weight and colour).
> No underline, no hover state extracted. **NOT EXTRACTED — no link states exist in the composition.**

#### 3.15.3 Decorative swooshes

**The footer is the only section with a WHITE swoosh variant** — correctly substituted for the black one
because the ground is `#000000`. Use this as the precedent for §3.14's invisible black swoosh.

| Node id | Asset | Inner size | Wrapper box | Wrapper position |
|---|---|---|---|---|
| `2737:38` | `خط أحمر — Red Swoosh` | 202 × 23 | 178.661 × 134.703 | left **−30**, top 134.14 |
| `2737:39` | `خط أخضر — Green Swoosh` | 289 × 38 | 258.531 × 196.891 | left **−10**, top 114.24 |
| `2737:40` | **`خط أبيض — White Swoosh`** | 231 × 26 | 204.137 × 153.794 | left 1240, top 270.5 |
| `2737:41` | `خط أحمر صغير — Red Swoosh Small` | 145 × 17 | 128.528 × 97.094 | left 1329, top 307.83 |

All rotated **−35°** inside centring wrappers.

---

## 4. Appendix A — Component inventory

Every distinct reusable component instance found on the frame, with the master/layer name recorded in Figma.
Where the design carries an explicit `CMP-*` / `IMG-*` identifier, it is shown in bold — those are the
canonical component IDs.

### 4.1 Components with an explicit design-system ID

| Component ID | Master / layer name | Instances | Node ids | Section |
|---|---|---|---|---|
| **`CMP-CAROUSEL-001`** | `Hero Carousel (CMP-CAROUSEL-001)` | 1 | `2374:1202` | §3.2 |
| **`CMP-CAROUSEL-001`** | `Carousel Controls (CMP-CAROUSEL-001 — pause-on-hover/focus/touch per Ch.8 L6, reduced-motion aware)` | 2 | `2374:1273`, `2374:1967` | §3.2.6, §3.9.4 |
| **`CMP-BUTTON-001`** | `Button / Primary (CMP-BUTTON-001)` | 5 | `2374:1212`, `2374:1247`, `2374:1255`, `2374:1263`, `2374:1271` | §3.2.2, §3.2.5 |
| **`CMP-CLUBCARD-001`** | `Club Card [G.13-compliant: entity badge color confined to crest asset]` | 8 | `2374:1443`, `1451`, `1459`, `1467`, `1475`, `1483`, `1491`, `1499` | §3.5.3 |
| **`CMP-AFFILIATIONS-001`** | `Card - <Organization>` (+ `(Hover)` variant) | 5 | `2374:2166`, `2171`, `2176`, `2181`, `2186` | §3.13.2 |
| **`IMG-NEWS-001`** | `IMG-NEWS-001` (lead-article image slot) | 1 | `2544:2596` | §3.8.4 |

> `CMP-CLUBCARD-001` and `CMP-AFFILIATIONS-001` are the two components covered by **ADR-0041**'s
> narrowly scoped, non-transferable sub-13px exceptions (Chapter 4 §4.15b; Chapter 8 L8).

### 4.2 Componentized but un-IDed masters

| Master name | Instances | Node ids | Section |
|---|---|---|---|
| `Nav Item / <label> (componentized)` | 9 | `2544:2538`, `2544`, `2551`, `2558`, `2564`, `2570`, `2577`, `2583`, `2590` | §3.1.2 |
| `Header (Approved Master Component)` | 1 | `2374:1175` | §3.1 |
| `Nav Arrow / Next` · `Nav Arrow / Prev` (*"real component"*) | 6 | `2374:1274`, `1282`, `1604`, `1612`, `1968`, `1975` | §3.2.6, §3.6.6, §3.9.4 |
| `Next-Event Card (real component, CMS-editable)` | 2 (**one is a duplicate**) | `2374:1214`, `2374:1219` | §3.2.3 |

### 4.3 Repeated patterns without a component master

These are structurally identical repeats that are **not** componentized in Figma. Componentize them in code.

| Pattern | Count | Representative node | Section |
|---|---|---|---|
| `Stat Card` (metric + delta + sparkline + link) | 4 | `2374:1339` | §3.4.3 |
| `Athlete Card - <name>` (+ champion variant) | 5 | `2374:1526` / `2374:1556` | §3.6.4 |
| `Filter` chip (pill, default + selected) | 8 | `2374:1516`, `2374:1725` | §3.6.2, §3.7.2 |
| `Tab` chip (pill, default + selected-black) | 2 | `2374:1618`, `2374:1620` | §3.7.1 |
| `Row` (results table row) + `RankBadge` | 5 | `2374:1636` | §3.7.1 |
| `Event Row` (+ `Countdown`, `Cat`, `Date`) | 5 | `2374:1734` | §3.7.2 |
| `News Item` (thumb + kicker + headline + date) | 5 | `2374:1895` | §3.8.3 |
| `Media Coverage Card <n> of 4` | 4 | `2374:1938` | §3.9.2 |
| `PStat` (partner stat card) | 3 | `2374:1984` | §3.10.2 |
| `Sponsor Card` (+ `Tier Badge`, `Logo Area`) | 5 | `2374:2016` | §3.10.4 |
| `Compact Video Card` (+ `Play Button`, `Duration`) | 4 | `2374:2059` | §3.11.1 |
| `Album Item` | 6 | `2828:28` | §3.12.3 |
| `Play Button` (36px and 56px variants) | 5 | `2374:2061` / `2374:2107` | §3.11 |
| `Live Badge` (two divergent versions) | 2 | `2374:1709`, `2374:2101` | §3.7.2, §3.11.2 |
| Social Icon Button (42px rail / 32px row) | 10 | `2374:1229` / `2374:2244` | §3.2.4, §3.15.1 |
| `Edge Fade` / `Fade Left` / `Fade Right` | 3 | `2374:1442`, `2374:1507`, `2374:1966` | §3.5.2, §3.9.3 |
| `Pagination Dots` (all flattened SVGs) | 4 | `2374:1276`, `1606`, `1970`, `2191` | §3.2.6, §3.6.6, §3.9.4, §3.13.3 |
| `Divider` (36 × 4 SVG, sponsors bar) | 9 | `2374:1290` | §3.3 |
| Swoosh set (`خط أحمر` / `أخضر` / `أسود` / `أبيض` / `أحمر صغير`) | 33 | `2737:2`–`2737:41`, `2828:59`–`60` | 10 sections |

### 4.4 Icon inventory

All icons are exported SVG unless noted. Sizes are as-rendered.

| Icon | Size(s) | Node ids | Section |
|---|---|---|---|
| `chevron-down` | 10 × 10 | `2544:2540` (hidden), `2546`, `2566`, `2572`, `2585` | §3.1.2 |
| `UAEAF Logo (Vector)` | 120 × 64 | `2374:1191` | §3.1.3 |
| `UAEAF Logo (Vector - White)` | 36 × 36 | `2374:2231` | §3.15.1 |
| `facebook` | 18, 16 | `2374:1230`, `2374:2252` | §3.2.4, §3.15.1 |
| `instagram` | 18, 16 | `2374:1234`, `2374:2245` | §3.2.4, §3.15.1 |
| `youtube` | 18, 16, 16 | `2374:1239`, `2374:2249`, `2374:2111`, `2374:2120` | §3.2.4, §3.11.2, §3.15.1 |
| X (raster PNG) | 42, 32 | `2374:1232`, `2374:2247` | §3.2.4, §3.15.1 |
| TikTok (full-bleed SVG) | 42, 32 | `2374:1236`, `2374:2254` | §3.2.4, §3.15.1 |
| `award` | 24 × 24 | `2374:1344` | §3.4.4 |
| `trophy` | 24 × 24 | `2374:1368` | §3.4.4 |
| `activity` | 24 × 24, 26 × 26 | `2374:1392`, `2374:1447` | §3.4.4, §3.5.4 |
| `users` | 24 × 24 | `2374:1416` | §3.4.4 |
| `landmark` | 26 × 26 | `2374:1455` | §3.5.4 |
| `zap` | 26 × 26 | `2374:1463` | §3.5.4 |
| `star` | 26 × 26, 10 × 10 | `2374:1471`, `2374:1495`, `2374:2000` | §3.5.4, §3.10.3 |
| `flame` | 26 × 26 | `2374:1479` | §3.5.4 |
| `mountain` | 26 × 26 | `2374:1487` | §3.5.4 |
| `bird` | 26 × 26 | `2374:1503` | §3.5.4 |
| `map-pin` | 14 × 14 | `2374:1716`, `2374:2203` | §3.7.2, §3.15.1 |
| `map-pin-icon` | 18 × 18 | `2374:2213` | §3.15.1 |
| `play` | 13 × 13, 20 × 20 | `2374:2062`, `2072`, `2082`, `2092`, `2108` | §3.11 |
| `share-2` | 14 × 14 | `2374:2124` | §3.11.2 |
| `Ellipse` (dot) | 3, 6, 8 | `2374:1311`, `2374:1710`, `2374:2102` | §3.3, §3.7.2, §3.11.2 |
| `Discipline Accent` | 8 × 8 | `2374:1536`, `1551`, `1568`, `1583`, `1598` | §3.6.4 |
| `Calendar Icon` (2 CSS rects, not SVG) | 12 × 12 | `2374:1736`, `1766`, `1796`, `1826`, `1856` | §3.7.2 |
| `Divider` (sponsors) | 36 × 4 | `2374:1290` + 8 more | §3.3 |
| Diamond mark (rotated CSS square) | 12 × 12 @ 45° | `2374:2011` | §3.10.3 |

> **Glyphs rendered as literal text characters, not icons** — these need real icons or `aria-hidden`:
> `☾` (§3.1.1), `‹` `›` (§3.2.6, §3.6.6, §3.9.4), `⏱` `⬇` `✓` (§3.4.1, §3.7.1), `+` `←` `↗` `⌄` `●`
> `📍` `≡` (§3.5.1, §3.7.2, §3.8.1, §3.9.2), `•` (§3.10.5), `↑` (§3.4.4).

### 4.5 Typefaces in use

| Family | Where | Status |
|---|---|---|
| **Alexandria** (Regular 400, Medium 500, SemiBold 600, Bold 700, ExtraBold 800, Black 900) | Everywhere | ✅ Approved |
| **IBM Plex Sans** Bold | `☾` dark-mode glyph, `2374:1177` | ⚠️ 1 node — unapproved |
| **IBM Plex Mono** Bold | Broadcast telemetry, `2374:1695`–`1706` | ⚠️ 4 nodes — unapproved, arguably intentional |
| **Inter** SemiBold / Bold | `PB` tag `2374:1642`; athletes arrows `2374:1605`/`1613`; expand link `2374:1886`; media arrows `2374:1969`/`1976` | ⚠️ 6 nodes — **unapproved, almost certainly a defect**; should be Alexandria |

> ⚠️ Alexandria **ExtraBold 800** and **SemiBold 600** are used widely (athlete names, card links, kickers,
> CTA labels) but **no `Type/*` style defines either weight.** The nine defined styles cover only
> 400 / 500 / 700 / 900. Classified: **DESIGN SYSTEM GAP.**

---

## 5. Appendix B — Consolidated open items

Everything this extraction found, classified per `CLAUDE.md` §26. **Nothing here was modified** —
this was a read-only archival extraction.

### 5.1 Already resolved — do not re-audit

| Item | Status |
|---|---|
| **R8** — Club shield city-name at 8.944px (8 nodes, §3.5.3) | **RESOLVED — ADR-0041** (Ch.4 §4.15b, Ch.8 L8). Non-transferable. |
| **CAPTION-GAP** — Membership captions (10 nodes, §3.13.2) | **RESOLVED — ADR-0041**. See the measurement correction in §3.13.2: only the 5 English captions (10.5px) rely on it; the 5 Arabic captions measure **14px**, not the 12.5px recorded in `CLAUDE.md` §6. |
| **R7** — instance typography drift | **TOOLING BLOCKED**, confirmed present. Master-value mapping is in this document's header. Do not brute-force the Figma API. |

### 5.2 DESIGN SYSTEM GAP (owner must define a token/role)

| Gap | Evidence |
|---|---|
| **Numeric/statistic display role** | 20px (×5: 4 PB values + results-table times), 24px (×4), 26px (×1), 28px (×2), 40px (×5 stat values). All Alexandria Black 900. §3.4.3, §3.6.5, §3.7.1, §3.10.2, §3.10.3, §3.14 |
| **Athlete-name display role** | 22 / 24 / 32px, Alexandria **ExtraBold 800**, scaling with carousel focus. §3.6.5 |
| **H3 (24px) and H4 (20px) styles** | Referenced in `CLAUDE.md` §7 but **bound nowhere on this frame** |
| **SemiBold 600 and ExtraBold 800 weights** | Used in ~25 places; no `Type/*` style defines them |
| **18px sub-heading role** | §3.7.2, §3.10.5, §3.11.2 |
| **Green tint surface `#e5f5ec`** | Used 12+ times (delta pills, filter chips, tier badges, official badge). No token |
| **Highlighted-row surface `#f6fcf9`** | §3.7.1 row 1 |
| **Dark surfaces** | `#070c08`, `#0f1115`, `#111827`, `#1a1a2e`, `#1a1a1a` — five untokenized near-blacks alongside the two tokenized ones (`--color-gray-950`, `--color-brand-black`) |
| **Additional greens** | `#1b7d3a` (event pills), `#00cd5f` (signal bars), `#006b30` (PB tag, 1 off `--color-green-600`) |
| **Grey-on-dark text** | `#9ca3af` (athlete cards), `#b0bec5` (strategic sponsor), `#8a948d` (sponsors bar) |
| **Amber/sponsor accent** | `#ffb800` + `rgba(255,184,0,0.1)` — §3.3 only |
| **Borders** | `#dee0e3`, `#ebebed`, `#d9d9d9`, `#f2f2f2`, `#f5f5f5`, `#fafafa`, `#8c8c94` — all untokenized |
| **Letter-spacing** | 0.4969 / 0.9541 / 0.9938px in §3.10.3 only; every `Type/*` style declares `letterSpacing: 0` |
| **Spacing steps** | 6, 10, 14, 24, 32, 40, 56, 72, 100 used raw; only 8/12/16/20/48/64 are bound |

### 5.3 DESIGN DECISION REQUIRED

**Sub-13px text not covered by ADR-0041** (ADR-0041 is explicitly non-transferable):

| Size | Count | Location |
|---|---|---|
| 12px | 12 | §3.10.2 PStat labels (3), §3.8.4 byline (1), §3.12.3 photo counts (6), §3.15.1 map place name (1), §3.11 (—) |
| 11px | 12 | §3.2.4 `تابعنا` (1), §3.3 sponsor wordmarks (9), §3.10.4 sector labels (5 → 11px), §3.15.1 map city (1) |
| 10.932 → 11px | 6 | §3.10.3 VIP badge (1), §3.10.4 sector labels (5) |
| 10px | 2 | §3.3 centerpiece labels |
| 9.938 → 10px | 5 | §3.10.4 tier badges |

**Component consolidation:**

| Issue | Detail |
|---|---|
| **Nav Arrow ×3** | 44px circle (hero) / 77.5 × 58.6 pill (athletes) / 36 × 36 + 39 × 36 (media). Two typefaces |
| **Button ×4** | radius 9999 / 8 / 8 / 10; labels Bold 16 / Medium 13 / Medium 14 / SemiBold 14 |
| **Live Badge ×2** | 6px vs 8px dot; `#fdfcfb` vs `#ffffff` text; §3.7.2 has a **duplicate `●` character** |
| **Chip selected-state ×2** | green-tint (filters) vs solid-black (tabs) |
| **Section header ×5** | `flex-start` / `flex-end` title stacks; action link at 13 SemiBold / 14 SemiBold / pill / none; arrow `+` / `←` leading / `←` trailing / `›` |
| **Card radius ×2** | 12px and 16px both in use |
| **Section gutter ×4** | 24 / 33.5 / 40 / 64 / 88px |
| **Social order ×2** | hero vs footer orders differ |

**Geometry / layout:**

| Issue | Section |
|---|---|
| Root frame height 8758 vs measured 9410.13 | §2 |
| Hero section 732 vs 925 content (clips 193px) | §3.2 |
| Duplicate Next-Event Card at identical position | §3.2.3 |
| Results/Events columns not height-matched; right gutter 54 not 64 | §3.7 |
| Album grid 1008px in a 1312px row, 304px empty | §3.12.3 |
| Two empty reserved frames (`2828:14` 100px, `2828:23` 100 × 100) | §3.12 |
| `Glow Bottom Right` at top 450 in a 223px section — invisible | §3.14 |
| Newsletter heading/subheading `nowrap` — will overflow below 1440 | §3.14 |
| Media card date/CTA leave 4px clearance — will collide | §3.9.2 |
| Sponsor Card and Compact Video Card have **zero padding** | §3.10.4, §3.11.1 |
| `filters-wrap` is 1407 wide, not 1440 | §3.6.2 |

**Verified defects (safe to correct, but still require §20 authorization to apply):**

| Defect | Section |
|---|---|
| Athlete card 4 photo rotated **−0.86°** | §3.6.4 |
| Fade gradients end in `#ffffff` on an `#fdfcfb` ground | §3.5.2, §3.9.3 |
| `Fade Right` at `right: -0.4px` | §3.5.2 |
| Newsletter black swoosh invisible on dark ground (footer already solves this with a white variant) | §3.14 |
| Membership emblems use `object-fit: cover` (crops logos) — should be `contain` | §3.13.2 |
| YouTube library link missing `rel="noopener noreferrer"` (violates the Ch.8 L3 rule the design itself records) | §3.11.1 |
| YouTube link `href` is the bare `https://youtube.com` root | §3.11.1 |
| Inter used in 6 places instead of Alexandria | §4.5 |
| `IMG-NEWS-001` dashed placeholder border must not ship | §3.8.4 |
| Next-Event countdown unit is `--color-text-secondary` on a near-black ground (contrast failure) | §3.2.3 |

### 5.4 CONTENT DEFECTS — escalate to the content owner

| Defect | Section |
|---|---|
| **3 of 6 photo albums are Football / Basketball / Volleyball** — sports UAEAF does not govern | §3.12.3 |
| Album 1 duplicates the Featured Album exactly | §3.12.3 |
| Two different strategic partners named (General Sports Authority vs Ultimate Power Solution) | §3.3, §3.10.3, §3.10.4 |
| Three different sponsor counts (8 / 9+1 / 5) | §3.3, §3.10.2, §3.10.4 |
| Athlete disciplines/ranks contradict between the athlete cards and the results table | §3.6.5, §3.7.1 |
| Events list not date-sorted; 2 zero countdowns; 2 events share 20 سبتمبر with different countdowns | §3.7.2 |
| Hamza inconsistency between header nav and footer links (footer is correct) | §3.15.1 |
| `الاعضاء` (Members) vs `الرياضيون` (Athletes) — different IA concepts, one link | §3.15.1 |
| `الاتحاد في الإعلام` in footer but absent from header nav | §3.15.1 |
| `البوم` should be `ألبوم` (×2) | §3.12.2 |
| `دعم و تطوير` — spaced conjunction | §3.10.1 |
| Slides 2–5 body copy literally reads `محتوى نائب (Placeholder)` | §3.2.5 |
| Slide 1 photo is a legacy composite with baked-in text; needs a re-shoot | §3.2.2 |
| Trend sparkline bars are identical in all 4 stat cards (decorative, not data) | §3.4.3 |
| View counts use Latin `K` inside Arabic text | §3.11.1 |

### 5.5 NOT EXTRACTED — and why

| Item | Reason |
|---|---|
| Pagination-dot states (4 instances) | Flattened into single SVGs; per-dot fills not addressable |
| Memberships carousel control | Entire control is one flattened 78 × 24 SVG |
| Swoosh, glow, `Discipline Accent`, `Pulse` colours | Baked into exported SVGs |
| Row 5 "Next" badge background fill | Not returned by the API |
| `2828:14` `Actions` (100px) and `2828:23` `Stats` (100 × 100) | **Genuinely empty frames in Figma** |
| Map implementation | Only a styled `Map Placeholder` exists — no map, tiles, or coordinates |
| Newsletter form validation / error / success / focus states | Do not exist in the composition |
| Link hover / focus / active / visited states (whole page) | Do not exist — **the only designed interaction state on the entire frame is the `CMP-AFFILIATIONS-001` hover (`2374:2176`)** |
| Accessible names for icon-only controls (all nav arrows, social buttons, play buttons) | Not present in Figma; must be authored in code |
| Marquee scroll motion (§3.5.2) | No motion spec in the frame. **Do not fabricate one** (`CLAUDE.md` §13) |
| **Tablet and mobile breakpoints** | **This frame is desktop 1440 only.** See §6 |
| **LTR / English composition** | Not part of this frame |

---

## 6. Responsive status

**RESPONSIVE DESIGN NOT VERIFIABLE from this frame.**

Frame `2374:1174` is a **single fixed 1440px desktop Arabic composition**. It contains no tablet or mobile
variant, no breakpoint annotations, and no auto-layout constraints that would imply reflow behaviour beyond
the `flex: 1 0 0` column sizing recorded per section.

Per `CLAUDE.md` §13, **do not fabricate a mobile specification.** Before building responsive behaviour:

1. Check `docs/product/01-Information-Architecture.md` §12 and the relevant page specification's
   **"Responsive Behavior"** section for behaviour already recorded as **built** — per `CLAUDE.md` §1a.1,
   a recorded as-built behaviour is evidence of the approved composition and takes precedence over
   re-derivation.
2. Only where `docs/product/` records nothing may values be derived from the Design System Framework
   **Chapter 5 (Grid / Layout / Breakpoints)**, and every individual decision must cite the exact
   chapter/section/table row (`CLAUDE.md` §1a.2).
3. Anything not so citable is `DESIGN DECISION REQUIRED`, not a guess.

What this frame *does* fix, and which any responsive work must preserve:

- Container **1312px** at 1440 (64px gutters) — with the four documented exceptions (§3.6 at 33.5px,
  §3.10 at 40px, §3.8 at 88px vertical, §3.1 at 24px).
- Column counts: 4 (stat cards, footer), 5 (memberships, sponsor strip), 3 (album grid), 2 (results/events,
  news, media split).
- RTL is structural, not a mirror: logo left, nav right-to-left, `text-align: right`, `align-items: flex-end`
  on most text stacks, and carousel arrows deliberately inverted (`‹` = next).

---

## 7. Provenance

| | |
|---|---|
| Extracted by | Claude (Figma MCP, read-only) |
| Date | **2026-09-07** |
| File key | `hpO727vjwl18g3s3LTICAY` |
| Frame | `2374:1174` — `Homepage - AR / RTL (APPROVED BASELINE v1)` |
| Tools | `get_design_context` (per section), `get_variable_defs` (root frame), `get_metadata` (root frame) |
| Figma state | **Subscription lapsed — editing locked, read access expiring** |
| Sections covered | **15 of 15** |
| Modifications made | **None.** Read-only extraction, per `CLAUDE.md` §20 (Audit-First). |

> Asset URLs returned during extraction (`https://www.figma.com/api/mcp/asset/...`) **expire ~7 days after
> 2026-09-07** and were deliberately not recorded here — a list of dead links would be worse than useless.
> Every image, icon and vector is identified above by **node id, layer name and exact dimensions**, which is
> what survives. Export the assets from Figma **before read access ends**; if it has already ended, the
> node ids and dimensions here are sufficient to re-source or re-create each asset.

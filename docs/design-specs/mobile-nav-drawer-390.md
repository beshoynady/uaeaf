# Mobile Navigation Drawer (Open State) — 390 viewport — Extracted Implementation Spec

| Field | Value |
|---|---|
| **Figma file key** | `hpO727vjwl18g3s3LTICAY` |
| **Node id** | `2159:1128` |
| **Frame name** | `MOBILE-MENU-Drawer (Open State) — 390 viewport` |
| **Frame size** | 390 × 844 |
| **Extraction date** | 2026-09-07 |
| **Extraction method** | Figma MCP `get_metadata` (full tree) + `get_design_context` + `get_variable_defs` |

> ## ⚠️ THIS FILE IS NOW THE SOURCE OF TRUTH
> The UAEAF Figma subscription has lapsed. **Editing is permanently locked** and read access may stop at any
> moment. **There is no other record of the UAEAF mobile navigation anywhere in the repository or in Figma.**
> This document is the sole surviving specification for the mobile nav drawer.
>
> Per governance §1, this records *observed Figma state*. Conflicts with the Design System Framework are
> flagged inline and must be **reported, not silently reconciled**. Anything unobtainable is written as
> **NOT EXTRACTED — reason**.

---

## 1. Overview

The drawer is composed as a **complete 390 × 844 viewport frame**, not as a floating panel. It contains:

1. a **full-viewport scrim** (the frame background itself), and
2. a **320px-wide DrawerPanel** anchored to the **right (RTL leading) edge**.

```
390 viewport
├─ scrim            x 0   … 70   (70px of visible backdrop on the LEFT)
└─ DrawerPanel      x 70  … 390  (320 wide, full 844 height, flush right)
```

**RTL anchoring is explicit:** the panel occupies `left: 70px`, i.e. it is flush to the **right** screen edge
and the exposed scrim strip is on the **left**. For an LTR/EN build this mirrors to `left: 0`, scrim on the
right. **NOT EXTRACTED — an EN/LTR drawer frame does not exist in the file**; the mirror is stated here as a
structural consequence of RTL, not as an approved EN composition.

---

## 2. Scrim — `2159:1128` (frame background)

| Property | Value |
|---|---|
| Size | 390 × 844 (full viewport) |
| Fill | `rgba(11, 12, 12, 0.55)` — raw literal, **no token binding** |
| Blur | none |

**⚠️ `rgba(11,12,12,0.55)` is not `--color-brand-black` (`#000000`) at 55%; it is a distinct near-black
(`#0b0c0c`).** No overlay/scrim token exists in the file.
→ Classification: **DESIGN SYSTEM GAP** (governance §16). Do not silently substitute a black token, and do not
silently create a scrim token.

---

## 3. DrawerPanel — `2159:1129`

| Property | Value |
|---|---|
| Position | `left: 70px`, `top: 0` |
| Size | **320 × 844** (full viewport height) |
| Background | `#ffffff` — **raw literal, not `--color-surface-base`** |
| Overflow | `clip` |
| Layout | column flex, `align-items: flex-start` |
| Radius | **0 — the panel has no corner rounding on any edge** |
| Shadow / elevation | **none** — no drop shadow is applied to the panel |

Vertical composition (four blocks, in order):

| Block | Node | y | Height | Sizing |
|---|---|---|---|---|
| DrawerHeader | `2159:1147` | 0 | **84** | fixed (content-driven) |
| DrawerSearchWrap | `2159:1161` | 84 | **58** | fixed (content-driven) |
| DrawerNavList | `2159:1165` | 142 | **630** | **`flex: 1 0 0`** — absorbs remaining height |
| DrawerFooterUtilities | `2159:1190` | 772 | **72** | fixed (content-driven), pinned to the bottom |

84 + 58 + 630 + 72 = **844** ✔

---

## 4. DrawerHeader — `2159:1147`

**320 × 84.** Background `#ffffff`. Border-**bottom** 1px solid **`--color-border-default` (`#e0dfdb`)**.
Horizontal flex, `align-items: center`, `gap: 10px`, `overflow: clip`.
Padding: **`padding-top: 20px`, `padding-bottom: 16px`, `padding-inline: 20px`** (asymmetric vertical).

| Element | Node | Position / size | Spec |
|---|---|---|---|
| **UAEAF Logo (Vector)** | `2159:1148` | x 20, y 20, **90 × 48** | Exported SVG asset. **Do not redraw or substitute.** |
| **Spacer** | `2159:1158` | x 120, y 39, 138 × 10 | `flex: 1 0 0`, `min-width: 0` — pure layout spacer, renders nothing |
| **CloseButton** | `2159:1159` | x 268, y 28, **32 × 32** | bg **`--color-surface-sunken` (`#fafaf8`)**, **radius 999px**, centred, `overflow: clip` |
| └ glyph `✕` | `2159:1160` | 13 × 17 | `Alexandria Regular 14px`, **`--color-text-primary` (`#000000`)** |

**⚠️ Accessibility (governance §14): the CloseButton is 32 × 32.** This is below the WCAG 2.2 (2.5.8)
24 × 24 minimum? — no, it *passes* 24 × 24, but it is **below the common 44 × 44 comfortable-target
guidance** used elsewhere on this page (the Events Date blocks are 44 × 44, the footer social buttons 40 × 40).
Recorded as observed. Enlarging it is a composition change → **DESIGN DECISION REQUIRED**, not applied here.

**Logo size note:** the drawer logo is **90 × 48** — a third size, distinct from the mobile header
(**75 × 40**, `2374:2323`) and the desktop header (**120 × 64**, `2374:1191`). Three logo sizes exist.
Recorded, not reconciled.

---

## 5. DrawerSearchWrap — `2159:1161`

**320 × 58.** No background fill (transparent over the panel white). `overflow: clip`.
Column flex, `align-items: flex-start`.
Padding: **`padding-top: 12px`, `padding-bottom: 4px`, `padding-inline: 20px`**.

### DrawerSearchBar — `2159:1162`
x 20, y 12, **280 × 42** (full width inside the padding).

| Property | Value |
|---|---|
| Background | **`--color-surface-sunken` (`#fafaf8`)** |
| Radius | **10px** |
| Padding | **`12px 16px`** |
| Layout | horizontal flex, `align-items: center`, `gap: 10px`, `overflow: clip` |
| Border | **none** |
| Text colour (both children) | **`--color-text-secondary` (`#616058`)** |

| Element | Node | Size | Typography | Copy (verbatim AR) |
|---|---|---|---|---|
| Placeholder | `2159:1163` | 228 × 16, `flex: 1 0 0` | `Alexandria Regular` **13px**, lh `normal`, `dir="auto"` | `بحث في الموقع...` |
| Search glyph | `2159:1164` | 10 × 18 | `Alexandria Regular` **15px**, lh `normal`, nowrap | `⌕` |

**⚠️ The search affordance is the typographic character `⌕` (U+2315), not an exported icon asset.**
It sits at the **trailing (left/RTL-end)** side of the field. The mobile header search (`2374:2320`) uses a
**20 × 20 exported SVG** instead. Two different search affordances exist. Recorded, not reconciled.

---

## 6. DrawerNavList — `2159:1165`

**320 × 630**, y = 142. Background `#ffffff`. Column flex, `align-items: flex-start`, `overflow: clip`.
Padding: **`padding-block: 8px`, no inline padding** (each item carries its own 20px).
Sizing: **`flex: 1 0 0`, `min-height: 0`** — the list absorbs all height between search bar and footer, and
scrolls when content exceeds it.

### 6.1 Shared DrawerNavItem spec

Every item is **320 × 46**, full width, background `#ffffff`, `overflow: clip`,
horizontal flex, `align-items: center`, padding **`14px 20px`**, `gap: 8px` (only where a chevron is present).
**No dividers, no separators, no hairlines between items** — the list is separated by whitespace alone.
Items are **contiguous: 46px pitch, 0 gap** (item n at `y = 8 + 46n`).

Label typography: `Alexandria` **15px**, `line-height: normal`, `text-align: right`, `dir="auto"`,
`flex: 1 0 0`, `min-width: 0`.

| State | Font weight | Colour |
|---|---|---|
| **Active** (`الرئيسية` only) | **SemiBold** | **`--color-brand-primary` (`#00843d`)** |
| Default | **Medium** | **`--color-text-primary` (`#000000`)** |

**Expandable items** carry a leading chevron glyph at the **leading (right/RTL-start… rendered first in the
flex row, i.e. visually LEFT)** position:
- Node pattern: a text node immediately before the label.
- Spec: `Alexandria Regular` **14px**, **`--color-text-secondary` (`#616058`)**, nowrap, 8 × 17,
  glyph **`⌄`** (U+2304).
- **This is a typographic character, not an icon asset** — the desktop header uses a 10 × 10 exported
  `chevron-down` SVG (`616:141`). Recorded inconsistency.

**Active-state affordance is colour + weight only.** There is **no background tint, no left/right rail, no
underline** on the active drawer item — unlike the desktop header nav item, which uses a `#e8f5ed` background
plus a 2.485px `--color-green-500` `Active Indicator` bar (`616:145` / `616:148`).
→ Observed divergence between drawer-active and header-active treatments. **DESIGN DECISION REQUIRED**
if a single active-state rule is wanted; **not reconciled here**.

### 6.2 Full nav item list (document order, top → bottom)

| # | Node | y (within list) | Label node | Copy (verbatim AR) | Expandable | State |
|---|---|---|---|---|---|---|
| 1 | `2159:1166` | 8 | `2159:1167` | `الرئيسية` | no | **ACTIVE** — SemiBold, `#00843d` |
| 2 | `2159:1168` | 54 | `2159:1170` (chevron `2159:1169`) | `عن الاتحاد` | **yes `⌄`** | default |
| 3 | `2159:1171` | 100 | `2159:1172` | `الرياضيون` | no | default |
| 4 | `2159:1173` | 146 | `2159:1174` | `الاندية` | no | default |
| 5 | `2159:1175` | 192 | `2159:1177` (chevron `2159:1176`) | `الاعضاء` | **yes `⌄`** | default |
| 6 | `2159:1178` | 238 | `2159:1179` | `البطولات` | no | default |
| 7 | `2159:1180` | 284 | `2159:1181` | `الفاعليات` | no | default |
| 8 | `2159:1182` | 330 | `2159:1184` (chevron `2159:1183`) | `الاخبار و المقالات` | **yes `⌄`** | default |
| 9 | `2159:1185` | 376 | `2159:1187` (chevron `2159:1186`) | `المركز الاعلامي` | **yes `⌄`** | default |
| 10 | `2159:1188` | 422 | `2159:1189` | `تواصل معنا` | no | default |

**10 items. 4 expandable** (`عن الاتحاد`, `الاعضاء`, `الاخبار و المقالات`, `المركز الاعلامي`).
List content ends at y = 468 within a 630-tall container → **162px of empty space below the last item.**

### 6.3 Parity with the desktop header nav

The desktop header `Nav` (`2374:1180`, 1047 × 57) carries **9 items**; the drawer carries **10**.
The extra drawer item is **`الرياضيون` (Athletes)** — it exists in the drawer but **not** in the desktop
top-level nav.

| Desktop nav item (AR `2374:1180`) | EN label (from `616:99`) | In drawer? |
|---|---|---|
| `الرئيسية` (`2544:2590`) | `Home` | ✔ (item 1, active) |
| `عن الاتحاد` (`2544:2583`) | `About the Federation` | ✔ (item 2) |
| — | — | **`الرياضيون` — drawer only (item 3)** |
| `الاندية` (`2544:2577`) | `Clubs` | ✔ (item 4) |
| `الاعضاء` (`2544:2570`) | `Members` | ✔ (item 5) |
| `البطولات` (`2544:2564`) | `Championships` | ✔ (item 6) |
| `الفاعليات` (`2544:2558`) | `Events` | ✔ (item 7) |
| `الاخبار و المقالات` (`2544:2551`) | `News & Articles` | ✔ (item 8) |
| `المركز الاعلامي` (`2544:2544`) | `Media Centre` | ✔ (item 9) |
| `تواصل معنا` (`2544:2538`) | `Contact` | ✔ (item 10) |

**🔴 IA finding (governance §11):** the drawer exposes a top-level **`الرياضيون` / Athletes** entry that the
desktop header does not. Per §11 this must **not** be merged, renamed or silently dropped to force parity.
→ Classification: **DESIGN DECISION REQUIRED** — confirm whether Athletes is an approved top-level IA node
(in which case the desktop header is missing it) or a mobile-only shortcut.

**Expandable-item parity:** the desktop header shows a `chevron-down` on **4** items —
`عن الاتحاد` (`616:141`), `الاعضاء` (`616:131`), `الاخبار و المقالات` (`616:117`),
`المركز الاعلامي` (`616:111`). This **matches the drawer's 4 expandable items exactly.** ✔

**Expanded sub-menu content:** **NOT EXTRACTED — no expanded/open sub-menu state exists in the file.**
Only the collapsed drawer is composed. The child links behind each `⌄` are unrecorded.
→ Classification: **DESIGN DECISION REQUIRED / RESPONSIVE DESIGN NOT VERIFIABLE** for sub-navigation.
**Do not fabricate a sub-menu.**

---

## 7. DrawerFooterUtilities — `2159:1190`

**320 × 72**, y = 772 (bottom-pinned). Background `#ffffff`.
Border-**top** 1px solid **`--color-border-default` (`#e0dfdb`)**. `overflow: clip`.
Horizontal flex, `align-items: center`, `gap: 12px`.
Padding: **`padding-top: 16px`, `padding-bottom: 24px`, `padding-inline: 20px`** (asymmetric vertical —
the extra 8px bottom is home-indicator clearance).

| Element | Node | Position / size | Spec |
|---|---|---|---|
| **Spacer** | `2159:1195` | x 20, y 30, 111 × 4 | `flex: 1 0 0`, `min-width: 0` — pushes both chips to the trailing side |
| **Theme chip** | `2159:1191` | x 143, y 16, **68 × 32** | bg **`--color-surface-sunken` (`#fafaf8`)**, **radius 8px**, padding **`8px 14px`**, `overflow: clip` |
| └ label | `2159:1192` | 40 × 16 | `Alexandria Medium` **13px**, **`--color-text-primary`**, nowrap, `dir="auto"`. Copy: **`☾ داكن`** |
| **Language chip** | `2159:1193` | x 223, y 16, **77 × 32** | identical chip spec |
| └ label | `2159:1194` | 49 × 16 | `Alexandria Medium` **13px**, **`--color-text-primary`**, nowrap. Copy: **`AR \| EN`** |

Both chips are **32px tall** — again below the 44px comfortable-target guidance used elsewhere.
Recorded as observed; **DESIGN DECISION REQUIRED**, not applied.

**Parity with the mobile header utilities:** the header (`2374:2316`) exposes **☾ (24 × 24)**,
**`EN` (14px text)** and a **search icon (20 × 20)**. The drawer footer exposes **`☾ داكن`** and
**`AR | EN`** as labelled 32px chips, with search promoted into the dedicated search bar (§5).
Same three utilities, three different presentations across header / drawer. Recorded, not reconciled.

**Parity with the desktop header utilities** (`2374:1176`, 122.7 × 17.9): desktop is three inline text items —
`☾` (`IBM Plex Sans Bold` **15.901px**), `بحث` (`Alexandria Medium` **12.92px**), `AR | EN`
(`Alexandria Medium` **12.92px**), colour `--color-text-secondary`, `gap: 11.926px`.
Note the desktop fractional sizes are the known **R7 instance-scaling artifact** (governance §4) —
the drawer's clean 13px values are **not** affected by R7.

---

## 8. Token bindings resolved on this frame

`get_variable_defs` on `2159:1128` returns exactly five bindings — **the drawer is almost entirely
token-bound for colour**, which is notably cleaner than the mobile homepage frame:

| Token | Value | Used for |
|---|---|---|
| `--color-text-primary` | `#000000` | nav labels (default), `✕`, both footer chip labels |
| `--color-text-secondary` | `#616058` | search placeholder, `⌕`, all `⌄` chevrons |
| `--color-brand-primary` | `#00843d` | active nav label (`الرئيسية`) |
| `--color-surface-sunken` | `#fafaf8` | CloseButton plate, search bar, both footer chips |
| `--color-border-default` | `#e0dfdb` | header bottom border, footer top border |

**Unbound raw literals** (no token exists):
- Scrim `rgba(11,12,12,0.55)` — see §2.
- Panel and nav-item background `#ffffff` — note this is **`#ffffff`, not `--color-surface-base` (`#fdfcfb`)**.
  The mobile homepage header (`2374:2315`) is also `#ffffff`, so the two are consistent with each other but
  both diverge from the surface token.

**No typography tokens are bound anywhere in the drawer.** All sizes (13 / 14 / 15px) are raw literals.
This mirrors the mobile homepage finding (`homepage-ar-mobile-390.md` §0.1):
**there is no mobile typography scale in the file.** → **DESIGN SYSTEM GAP.**

**No spacing tokens are bound.** All padding/gap values (8 / 10 / 12 / 14 / 16 / 20 / 24px) are raw literals,
though every one of them lands on the 4px grid and matches existing `--space-*` steps
(`--space-2` = 8, `--space-3` = 12, `--space-4` = 16, `--space-5` = 20). Binding them is a token-hygiene
task, **not authorised here** (governance §16).

**No radius tokens are bound.** Observed radii: **999px** (CloseButton), **10px** (search bar),
**8px** (footer chips), **0** (panel). Note `--radius-lg` = 16 exists in the desktop set but **10px and 8px
have no matching radius token** in anything returned for these frames. → **DESIGN SYSTEM GAP.**

---

## 9. Behaviour and states

| Aspect | Status |
|---|---|
| Trigger | Mobile header `Right Menu` → `menu` icon, `2374:2333` / `2374:2334` (24 × 24), at x 350, y 24 of the 390 × 72 header |
| Dismiss affordances | `CloseButton` `2159:1159`; scrim tap is **implied** by the 70px exposed backdrop but **NOT EXTRACTED — no prototype wiring was read** |
| Open/close animation (direction, duration, easing) | **NOT EXTRACTED — `get_motion_context` was not run and no motion annotation exists on the frame** |
| Scrim fade timing | **NOT EXTRACTED — same reason** |
| Nav item hover / focus / pressed states | **NOT EXTRACTED — the frame composes default + one active state only** |
| Expanded sub-menu (behind each `⌄`) | **NOT EXTRACTED — no expanded state frame exists** |
| Scroll behaviour of `DrawerNavList` | Inferred from `flex: 1 0 0` + `overflow: clip` + `min-height: 0`; **no explicit scroll annotation exists** |
| Focus trap / Esc handling / `aria` roles | **NOT EXTRACTED — Figma carries no such annotation** |
| Dark-mode drawer | **NOT EXTRACTED — a `☾ داكن` toggle is present but no dark drawer frame exists in the file** |
| EN / LTR drawer | **NOT EXTRACTED — no LTR drawer frame exists in the file** |
| Tablet (768px) drawer | **Does not exist.** Per the owner decision, 768px is to be derived in code between 390 and 1440. At 1440 the nav is a **9-item inline header**, at 390 it is **this 10-item drawer**. The 768px navigation pattern is therefore **DESIGN DECISION REQUIRED** — there is no second anchor to interpolate a *navigation pattern* between; a pattern switch is a discrete choice, not a continuous interpolation. **Do not fabricate a tablet nav.** |

---

## 10. Assets referenced

| Asset | Node | Source |
|---|---|---|
| UAEAF Logo (Vector), 90 × 48 | `2159:1148` | Figma MCP export URL (SVG) |

**⚠️ The asset URL expires ~7 days from 2026-09-07.** It was **not downloaded** as part of this extraction.
→ **URGENT: export and commit the 90 × 48 drawer logo SVG before the URL expires.** Every other visual in the
drawer is a typographic glyph (`✕`, `⌕`, `⌄`, `☾`) and requires no asset.

---

## 11. Summary of items requiring an owner decision

| # | Item | Classification |
|---|---|---|
| 1 | Drawer exposes top-level `الرياضيون` / Athletes; desktop header does not | **DESIGN DECISION REQUIRED** (IA, §11) |
| 2 | Expanded sub-menu content behind the 4 `⌄` items is undesigned | **DESIGN DECISION REQUIRED** |
| 3 | Tablet (768px) navigation pattern — drawer vs inline vs hybrid | **DESIGN DECISION REQUIRED** |
| 4 | Scrim colour `rgba(11,12,12,0.55)` has no token | **DESIGN SYSTEM GAP** |
| 5 | Radii 10px / 8px have no matching radius token | **DESIGN SYSTEM GAP** |
| 6 | No mobile typography scale (all sizes are raw literals) | **DESIGN SYSTEM GAP** |
| 7 | 32px touch targets (CloseButton, both footer chips) vs 44px used elsewhere | **DESIGN DECISION REQUIRED** (§14) |
| 8 | Active-state treatment differs between drawer (colour+weight) and desktop header (tint + 2.485px bar) | **DESIGN DECISION REQUIRED** |
| 9 | Three logo sizes in play: 90 × 48 (drawer), 75 × 40 (mobile header), 120 × 64 (desktop header) | **VERIFIED / NOT AN ISSUE** unless a single responsive logo component is wanted |
| 10 | `⌕` and `⌄` are typographic glyphs here but exported SVG icons on desktop | **DESIGN DECISION REQUIRED** |
| 11 | Motion, focus-trap, hover/focus/pressed states, dark mode, LTR variant all undesigned | **NOT EXTRACTED — do not fabricate** |

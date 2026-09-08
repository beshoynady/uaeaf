# Homepage — EN / LTR — Desktop (1440px) — Structural Diff vs the AR Desktop Baseline

| Field | Value |
|---|---|
| **Figma file key** | `hpO727vjwl18g3s3LTICAY` |
| **Node id (subject)** | `616:98` — `Homepage - EN / LTR`, **1440 × 8758** |
| **Node id (reference)** | `2374:1174` — `Homepage - AR / RTL (APPROVED BASELINE v1)`, **1440 × 8758** |
| **Extraction date** | 2026-09-07 |
| **Extraction method** | Figma MCP `get_metadata` on both frames (full trees, diffed programmatically) + targeted `get_design_context` on genuinely-divergent nodes + `get_variable_defs` |

> ## ⚠️ THIS FILE IS NOW THE SOURCE OF TRUTH
> The UAEAF Figma subscription has lapsed. **Editing is permanently locked** and read access may stop at any
> moment.
>
> **This document is a DIFF, not a full specification.** Where the EN frame matches the AR desktop baseline,
> nothing is restated — read `2374:1174`'s recorded spec (and `homepage-ar-mobile-390.md` for the mobile
> anchor). Only genuine differences are captured: present/absent sections, component-master divergence, item
> counts, geometry drift, and copy-length effects.
>
> **The AR frame is the APPROVED BASELINE v1** (its own layer name says so). Per governance §1, where EN and
> AR disagree, **the AR baseline wins and the EN frame is the deviation** — every delta below is therefore a
> record of *EN drift*, not of an approved English design decision, unless explicitly noted otherwise.
> Anything unobtainable is written as **NOT EXTRACTED — reason**.

---

## 1. Headline verdict

**The EN frame is NOT a language swap of the approved AR baseline. It is an older composition.**

Three findings make this unambiguous:

1. **The EN frame has 14 top-level sections; AR has 15.** EN is **missing `sponsors-marquee-bar`** entirely.
   *(The task brief's "EN reportedly lacks the sponsor marquee bar" is **CONFIRMED**.)*
2. **The EN frame carries ZERO decorative Swoosh vectors. AR carries 40**, across 10 sections. The approved
   flat-colour diagonal-motif art direction is **completely absent from EN**.
3. **EN's `Media Centre` and AR's `Photo Albums Section` are different sections, not translations** —
   different node ids, different children, 593px vs 1431px tall.

Both frames declare `height = 8758`, but **neither one's children fit that box**: EN's sections sum to
**8838.27** and AR's to **9410.13**. Both overflow their declared frame height.
Recorded as observed; **not corrected** (governance §3 protects existing approved section geometry).

---

## 2. Top-level section map — side by side

`y` and `height` are as measured in each frame. `—` means the section does not exist in that frame.

| # | Section | EN node | EN y | EN h | AR node | AR y | AR h | Δ |
|---|---|---|---|---|---|---|---|---|
| 1 | Header (Approved Master Component) | `616:99` | 0 | 95.407 | `2374:1175` | 0 | 95.407 | **identical height**; internals differ → §4 |
| 2 | Stats *(hero wrapper)* | `616:160` | 95.407 | **857.217** | `2374:1201` | 95.407 | **732** | **−125.2 in AR** → §5 |
| 3 | `sponsors-marquee-bar` | **—** | — | — | `2374:1284` | 827.407 | 112 | **🔴 ABSENT IN EN** → §6 |
| 4 | Inner *(stats grid)* | `616:221` | 952.624 | **588** | `2374:1331` | 939.407 | **569** | −19 in AR → §7 |
| 5 | Clubs | `616:325` | 1540.624 | 329.110 | `2374:1435` | 1508.407 | 329.110 | same height; **EN cards are EMPTY** → §8 |
| 6 | Inner *(athletes)* | `616:398` | 1869.734 | 944 | `2374:1508` | 1837.517 | 944 | same height; head differs → §9 |
| 7 | Results & Events | `616:504` | 2813.734 | **867** | `2374:1614` | 2781.517 | **913** | **+46 in AR** → §10 |
| 8 | Section / News | `616:777` | 3680.734 | **884.537** | `2374:1887` | 3694.517 | **857.610** | −26.9 in AR → §11 |
| 9 | UAEAF in the Media | `616:822` | 4565.271 | **652** | `2374:1932` | 4552.127 | **614** | **−38 in AR** → §12 |
| 10 | Sponsors & Partners | `616:867` | 5217.271 | **1196** | `2374:1977` | 5166.127 | **907** | **−289 in AR** → §13 |
| 11 | Live Stream & Videos | `616:942` | 6413.271 | 710 | `2374:2052` | 6073.127 | 710 | **identical**; column order mirrored → §14 |
| 12 | Media Centre **/** Photo Albums | `616:1017` **Media Centre** | 7123.271 | **593** | `2374:2127` **Photo Albums Section** | 6783.127 | **1431** | **🔴 DIFFERENT SECTION** → §15 |
| 13 | memberships-section | `616:1051` | 7716.271 | 459 | `2374:2161` | 8214.127 | 459 | **structurally identical** → §16 |
| 14 | Newsletter | `2571:12` `Section / Newsletter` | 8175.271 | 223 | `2387:1128` `Newsletter Section` | 8673.127 | 223 | same height, different master + form geometry → §17 |
| 15 | Section / Footer | `675:203` | 8398.271 | **440** | `2374:2198` | 8896.127 | **514** | **+74 in AR** → §18 |

**Section ORDER is otherwise identical.** No section is reordered between the two frames; the only ordering
consequence is the AR marquee bar inserted at position 3, which shifts everything below it down by 112px.

---

## 3. The 40 missing Swoosh vectors — the single largest divergence

The AR baseline carries a decorative diagonal-stroke motif (`خط أحمر / أخضر / أسود / أبيض` — Red / Green /
Black / White Swoosh) as **40 vector nodes in the `2737:*` id range**, distributed across **10 of its 15
sections**. The EN frame contains **none** — a search for `Swoosh` across the entire EN tree returns an empty
set.

| AR section | Swoosh node ids | Count | Variants present |
|---|---|---|---|
| Inner *(stats)* `2374:1331` | `2737:2`–`2737:5` | 4 | Red, Green, Black, Red-small |
| Clubs `2374:1435` | `2737:6`–`2737:9` | 4 | Red, Green, Black, Red-small |
| Inner *(athletes)* `2374:1508` | `2737:10`–`2737:13` | 4 | Red, Green, Black, Red-small |
| Results & Events `2374:1614` | `2737:14`, `2737:15` | 2 | Red, Green |
| Section / News `2374:1887` | `2737:16`–`2737:19` | 4 | Red, Green, Black, Red-small |
| UAEAF in the Media `2374:1932` | `2737:20`–`2737:23` | 4 | Red, Green, Black, Red-small |
| Sponsors & Partners `2374:1977` | `2737:24`, `2737:25` | 2 | Black, Red-small |
| Live Stream & Videos `2374:2052` | `2737:26`, `2737:27` | 2 | Black, Red-small |
| memberships-section `2374:2161` | `2737:32`, `2737:33` | 2 | Black, Red-small |
| Newsletter `2387:1128` | `2737:34`–`2737:37` | 4 | Red, Green, Black, Red-small |
| Section / Footer `2374:2198` | `2737:38`–`2737:41` | 4 | Red, Green, **White**, Red-small |

Canonical sizes (repeated verbatim across sections):
`Red Swoosh` **178.661 × 134.703** · `Green Swoosh` **258.531 × 196.891** ·
`Black Swoosh` **204.137 × 153.794** · `Red Swoosh Small` **128.528 × 97.094**.
Two sections use a reduced set: memberships (`187.398 × 141.183` Black, `117.989 × 89.132` Red-small) and
Newsletter (`79.683 × 60.078` Red, `115.305 × 87.814` Green, `91.045 × 68.592` Black,
`57.323 × 43.304` Red-small).

Ids `2737:28`–`2737:31` are **absent from both frames** — they belong to the AR-only
`Photo Albums Section` neighbourhood but were not returned as children of any diffed node.
**NOT EXTRACTED — reason: not present in either metadata tree.**

> **🔴 Classification: this is the highest-priority conflict in this document.**
> The Swoosh motif is the approved flat-colour graphic direction recorded against the AR baseline.
> Its total absence from EN means the EN frame **predates that direction**. Per governance §1 the AR baseline
> wins, so EN is out of date — but retrofitting 40 vectors into EN is a **composition change**, not a
> translation, and Figma is locked.
> → **DESIGN DECISION REQUIRED**: does the EN build ship the motif (derived from the AR placements recorded
> above) or not? **Do not invent EN placements.** The AR sizes are recorded here so that, if approved, EN can
> reuse the exact same values rather than new ones.
>
> **Tablet impact:** this also blocks clean 768px derivation. The two designed anchors disagree about whether
> the motif exists at all — AR desktop has 40, the AR mobile anchor has **0** (see
> `homepage-ar-mobile-390.md` §16). There is no interpolable middle. **DESIGN DECISION REQUIRED.**

---

## 4. Header — `616:99` vs `2374:1175`

Identical frame geometry (**1440 × 95.407**), identical padding (`padding-inline: 23.852px`),
identical background (`--color-surface-base`) and identical `border-bottom: 0.994px solid
--color-border-default`. Logo identical at **120 × 64** (`616:150` / `2374:1191`).

### 4.1 🔴 Component-master divergence — the AR nav is componentised, the EN nav is not

| | EN | AR |
|---|---|---|
| Nav container | `616:104`, **1172.8 × 57.4** | `2374:1180`, **1047 × 57.0** |
| Nav item nodes | `616:105`…`616:145` — plain frames named `Nav Item / <arabic>` | `2544:2538`…`2544:2590` — frames named `Nav Item / <arabic> **(componentized)**` |
| Item id range | `616:*` (same range as the rest of the EN frame) | `2544:*` (a **separate component range**) |

The AR baseline's nav items were rebuilt as component instances in the `2544:*` range; **the EN header still
uses the pre-componentisation frames.** Per governance §17 (component rule) the componentised masters are the
thing to build against. → **The EN nav must be re-pointed at the `2544:*` masters.**
Classification: **TOOLING BLOCKED** — Figma is read-only, so this cannot be fixed in the file; it must be
handled at implementation time by building one nav component and feeding it both label sets.

### 4.2 Copy-length effect — EN nav is 125.8px wider

Per-item widths (EN vs AR), same 9 items, `gap: 24px`, `padding: 14px 6px`:

| Item | EN label (verbatim) | EN w | AR label | AR w | Δ |
|---|---|---|---|---|---|
| Home | `Home` | 61.0 | `الرئيسية` | 70.0 | **AR +9.0** |
| About | `About the Federation` | **198.0** | `عن الاتحاد` | 100.0 | **EN +98.0** |
| Clubs | `Clubs` | 57.0 | `الاندية` | 57.0 | 0 |
| Members | `Members` | 103.0 | `الاعضاء` | 84.0 | EN +19.0 |
| Championships | `Championships` | **137.0** | `البطولات` | 93.0 | **EN +44.0** |
| Events | `Events` | 65.0 | `الفاعليات` | 118.0 | **AR +53.0** |
| News & Articles | `News & Articles` | 150.0 | `الاخبار و المقالات` | 132.0 | EN +18.0 |
| Media Centre | `Media Centre` | 135.0 | `المركز الاعلامي` | 135.0 | **0 — exact match** |
| Contact | `Contact` | 75.0 | `تواصل معنا` | 98.0 | **AR +23.0** |
| | **total** | **1172.8** | | **1047.0** | **EN +125.8** |

**The nav does not scale symmetrically between languages.** `About the Federation` alone is +98px, while
`Events` runs +53px the other way. Any tablet nav that assumes a fixed per-item width, or that assumes AR and
EN collapse at the same viewport, is wrong. The EN nav at **1172.8 + logo 120 + utilities 141.7 + 2 × 23.852
padding = 1482.2px** — i.e. **the EN header nav already overflows the 1440 frame by ~42px**, while AR
(1047 + 120 + 122.7 + 47.7 = 1337.4) fits with 102.6px to spare.
→ **🔴 EN header overflow at 1440 is an evidenced defect.** Classification: **DESIGN DECISION REQUIRED**
(shorten `About the Federation`, reduce the 24px gap, or collapse EN to the drawer at a higher breakpoint
than AR). **Do not choose autonomously** (governance §2, §12 — approved terminology must not be rewritten to
"make it fit").

### 4.3 Utilities — same content, mirrored order, same R7 artifact

| | EN `616:100` (141.7 × 17.9) | AR `2374:1176` (122.7 × 17.9) |
|---|---|---|
| Order (canvas L→R) | `EN \| AR` → `Search` → `☾` | `☾` → `بحث` → `AR \| EN` |
| Language toggle | `616:103` — `EN \| AR` | `2374:1179` — `AR \| EN` |
| Search | `616:102` — `Search` | `2374:1178` — `بحث` |
| Dark toggle | `616:101` — `☾` | `2374:1177` — `☾` |
| Type | `Alexandria Medium` **12.92px** (toggle, search); `IBM Plex Sans Bold` **15.901px** (☾) | **identical** |
| Colour | `--color-text-secondary` | **identical** |
| `gap` | **11.926px** | **11.926px** |

**Order is correctly mirrored** (LTR reads toggle-first, RTL reads ☾-first). This is a proper mirror, not
drift.

**⚠️ R7 confirmation (governance §4):** the fractional sizes **12.92px** and **15.901px** — the documented
R7 instance-scaling artifact against masters of 13px and 16px — appear **identically in BOTH frames**.
R7 is therefore **not** an EN-vs-AR difference; it is a shared, already-classified **TOOLING BLOCKED** item.
The same artifact family is visible in the EN nav labels (**15.901px / 15.9px**), the active-indicator bars
(**2.485px / 1.988px / 1.99px**), the nav item `gap` (**7.951px / 7.95px**), the label-row `gap`
(**5.963px / 5.96px**), the header border (**0.994px**) and the header padding (**23.852px**).
**Do not brute-force these** (governance §4, §28). Build against the clean master values: **13, 16, 2, 8, 6,
1, 24**.

### 4.4 EN nav labels — verbatim, for the i18n string table

Captured because the EN layer names are Arabic and therefore misleading:

| Node | EN label | Chevron? |
|---|---|---|
| `616:147` | `Home` | no — **active state**: bg `#e8f5ed`, radius 7.951px, `Active Indicator` 2.485px `--color-green-500`, label `Alexandria Medium`, `--color-text-primary` |
| `616:143` | `About the Federation` | **yes** — `chevron-down` SVG, 10 × 10 (`616:141`) |
| `616:137` | `Clubs` | no |
| `616:133` | `Members` | **yes** (`616:131`) |
| `616:127` | `Championships` | no |
| `616:123` | `Events` | no |
| `616:119` | `News & Articles` | **yes** (`616:117`) |
| `616:113` | `Media Centre` | **yes** (`616:111`) |
| `616:107` | `Contact` | no |

Inactive items: `Alexandria Regular 15.9px`, `--color-text-secondary`, bg `--color-surface-base`,
`Active Indicator` present but **1.99px and unfilled**.
**IA note (§11): `Championships` and `Events` remain distinct top-level entries in EN, matching AR
(`البطولات` / `الفاعليات`). No merge has occurred. ✔**

---

## 5. Hero — `616:160` / `616:161` vs `2374:1201` / `2374:1202`

Both frames wrap the hero in a section confusingly named **`Stats`**, containing a single
`Hero Carousel (CMP-CAROUSEL-001)`.

| | EN | AR |
|---|---|---|
| Wrapper `Stats` | `616:160`, 1440 × **857.217** | `2374:1201`, 1440 × **732** |
| Carousel | `616:161`, 1440 × **769.217** @ y 24 | `2374:1202`, 1440 × **837** @ y 24 |
| Slides | 5 (`616:162`, `…178`, `…186`, `…194`, `…202`) | 5 (`2374:1203`, `…1241`, `…1249`, `…1257`, `…1265`) |
| Slides 2–5 | **HIDDEN**, named `Media: PLACEHOLDER (no approved photography yet)` | **HIDDEN**, identically named |
| Slide 1 children | **5** | **6** |
| Carousel Controls | `616:210`, 238 × 44 @ y 659.217 | `2374:1273`, 238 × 44 @ y 659.217 — **identical** |

**Two distinct geometry problems, one per frame:**
- **EN:** wrapper 857.217 > carousel 769.217 → **88px of dead space** below the carousel.
- **AR:** wrapper **732** < carousel **837** → **the carousel overflows its wrapper by 105px.**

Both are observed states in an approved-frozen area (governance §3). Recorded, **not corrected**.

### 5.1 Slide 1 — the one-child difference is a duplicate, not missing content

| EN `616:162` | AR `2374:1203` |
|---|---|
| `Media (Photo)` `616:163` 1440 × 769.217 | `Media (Photo)` `2374:1204` — same |
| `Scrim …Ch.4 §4.13` `616:164` **700 × 769.217** | `Scrim` `2374:1205` — same |
| `Content (…)` `616:165` **520 × 294 @ x 60** | `Content` `2374:1206` **520 × 294 @ x 860** |
| `Next-Event Card` `616:173` 1440 × 64 @ y 705 | `Next-Event Card` `2374:1214` 1440 × 64 @ y 705 |
| — | **`Next-Event Card` `2374:1219` 1440 × 64 @ y 705 — SECOND, IDENTICAL, OVERLAPPING** |
| `Social Media Sidebar (Fixed)` `660:152` **72 × 405 @ x 1344** | `Social Media Sidebar (Fixed)` `2374:1224` **72 × 378 @ x 0** |

**🔴 The AR baseline has a duplicated Next-Event Card** — two instances stacked at exactly `(0, 705)`,
1440 × 64, neither hidden. The **EN frame is correct here**; the mobile anchor is also correct (one card).
→ Classification: **TOOLING BLOCKED** (cannot delete — Figma is read-only). At implementation, render **one**.

**Content block x-position is a correct RTL mirror:** EN `x 60` (left-aligned) ↔ AR `x 860`
(860 + 520 = 1380 = 1440 − 60, right-aligned). ✔

**Social rail is correctly mirrored** (EN `x 1344` right edge ↔ AR `x 0` left edge) but the **heights differ:
EN 405 vs AR 378 (−27)**. Cause: the rotated vertical label. EN `English Label` `660:154` is **13 × 55**;
the AR label is shorter (`تابعنا` — 6 glyphs vs `FOLLOW US`). Rail internals are otherwise identical:
`Icons Track` 42 × 274, five **42 × 42** buttons at 58px pitch, a **visible** `Vertical Connector`
2 × 228 (`660:156`), 18 × 18 glyphs.
→ **Copy-length effect, benign.** But note: the **mobile rail hides the connector and uses 24 × 24 buttons**
(`homepage-ar-mobile-390.md` §3.4). 42 → 24 across the two anchors is the steepest component down-scale on
the page; **the 768px rail size is DESIGN DECISION REQUIRED**, not a linear interpolation.

### 5.2 EN hero copy — verbatim, with bound type styles

| Element | Node | Style | Value | Copy |
|---|---|---|---|---|
| Eyebrow | `616:166` | **`Type/Eyebrow`** | Alexandria Bold **16px**, lh 1.5, ls 0 | `The Official National Federation` |
| Headline | `616:167` | **`Type/H1`** | Alexandria Black, **`var(--typography-h1-desktop, 40px)`**, lh 1.2 | `Where the Nation Meets Its Champions` |
| Body | `616:168` | **`Type/Body`** | Alexandria Regular, **`var(--typography-body-desktop, 16px)`**, lh 1.6 | `The UAE Athletics Federation organizes, develops, and celebrates athletics across the nation — from emerging talent to Olympic and world podiums.` |
| Primary CTA | `616:171` / `616:172` | **`Type/CTA Label`** | Alexandria Bold 16px, lh 1.5; button bg `--color-brand-primary`, padding `12px 24px`, **radius 9999px** | `View Championship Schedule` |
| Secondary link | `616:170` | **`Type/Subtitle`** | Alexandria Medium, `var(--typography-subtitle-desktop, 16px)`, lh 1.5, `--color-text-primary` | `About the Federation ›` |

Content block: column, `gap: 16px`, `items-start`, all children `w: 520px`. CTA Row `gap: 20px`.

**🔴 CTA geometry conflict with the mobile anchor.** Desktop primary CTA radius is **9999px (pill)**;
the mobile primary CTA (`2374:2345`) is **radius 6px**. Governance §3 lists "Primary CTA geometry" as a frozen
area, so this is not a licence to change either. → **DESIGN DECISION REQUIRED** — the 768px button radius
cannot be interpolated between a pill and a 6px rect; that is a discrete shape change. **Do not guess.**

---

## 6. `sponsors-marquee-bar` — AR-only — `2374:1284`

**🔴 CONFIRMED ABSENT FROM EN.** The task brief's report is correct.

AR spec (recorded here so an EN equivalent can be built from approved values rather than invented ones):

- **1440 × 112**, background `#070c08`, **border-top and border-bottom 1px `#ffb800`**.
  Column flex, centred.
- **Ambient Glow Overlay** `2374:1285` — 1440 × 112 @ `top: -1px`; inline SVG radial gradient
  `rgba(0,92,42,0.12157)` centre → transparent at 80%, `gradientTransform: matrix(72 0 0 5.6 720 56)`.
- **Ticker Content Wrapper** `2374:1286` — `padding-inline: 48px`, `justify-content: space-between`,
  `flex: 1 0 0`, full width. Three groups:
  - **Sponsors Left** `2374:1287` — `gap: 12px`: `ADNOC` · `Emirates NBD` · `Etisalat` · `Mubadala` ·
    `Emirates` (5), each `Alexandria Medium` **11px**, `#8a948d`, `text-transform: uppercase`, each followed
    by a **36 × 4 SVG Divider**.
  - **Official Sponsor Centerpiece** `2374:1308` — bg `rgba(255,184,0,0.1)`, border 1px `#ffb800`,
    **radius 8px**, padding `var(--space-2, 8px)` block / `var(--space-12, 48px)` inline,
    `gap: var(--space-2, 8px)`:
    - label row `2374:1309` (`gap: 4px`): `الراعي الرسمي` (`Alexandria Bold 10px`, `#ffb800`) ·
      3 × 3 dot · `OFFICIAL SPONSOR` (`Alexandria SemiBold 10px`, `#ffb800`, uppercase).
      **⚠️ The Arabic string `الراعي الرسمي` is baked into this centrepiece and would need an EN counterpart.**
    - name `2374:1313`: `ULTIMATE POWER SOLUTION`, `Alexandria Black 16px`, `#ffffff`, uppercase, centred.
  - **Sponsors Right** `2374:1314` — `gap: 12px`: `du` · `Nike` · `Adidas` · `Hublot` (4), same 11px spec
    with 36 × 4 dividers.
- Total roster: **9 sponsors, flanking 5 + 4.**

**Consequences of the absence:**
1. Every EN section from `Inner` (stats) downward sits **112px higher** than its AR counterpart, which
   accounts for most of the running y-offset drift in §2.
2. An **approved commercial commitment is not represented in the English build.** Classification:
   **DESIGN DECISION REQUIRED** — this is a sponsorship-obligation question, not a design-taste one, and must
   be escalated. **Do not build an EN marquee from invented copy**; the values above are the approved AR ones
   and the only English strings that already exist are the Latin sponsor names plus `OFFICIAL SPONSOR`.
3. The mobile anchor **does** carry the marquee (`2374:2375`, 390 × 75). So AR has it at both 390 and 1440,
   EN has it at neither. The 768px marquee is derivable **for AR only**.

---

## 7. Stats grid — `616:221` vs `2374:1331`

| | EN | AR |
|---|---|---|
| `Inner` | 1440 × **588** | 1440 × **569** (−19) |
| Direct children | **2** | **6** (2 + **4 Swooshes** `2737:2`–`2737:5`) |
| `Head` | `616:222`, 1312 × 66 | `2374:1332`, 1312 × 66 — same |
| ├ `Head Text` | `616:225`, **455 × 66** | `2374:1335`, **223 × 66** — **EN +232** |
| └ `Updated` | `616:223`, **194 × 34** | `2374:1333`, **198 × 34** (+4) |
| Head child order | `Head Text` then `Updated` | `Updated` then `Head Text` — **correct RTL mirror ✔** |
| `Stats Grid` | `616:228`, **1312 × 362** | `2374:1338`, **1312 × 362** — identical |
| Stat Cards | 4 × **316 × 362**, 6 kids / 2 texts each | 4 × **316 × 362**, 6 kids / 2 texts each — **identical** |

**The stat cards themselves are byte-for-byte equivalent in structure.** The only real deltas are the
**232px-wider EN head text** (English headings run long — a pure copy-length effect) and the **4 missing
Swooshes**. The 19px section-height difference is a consequence of the head text reflowing.

**⚠️ R7 note:** the 24 R7-affected Stat Card instance nodes (governance §4) live in this grid in **both**
frames. Shared, already-classified **TOOLING BLOCKED**. Master values remain **13 / 16 / 40 / 24 / 14 px**.

---

## 8. Clubs — `616:325` vs `2374:1435`

**🔴 THE EN CLUB CARDS ARE EMPTY.**

| | EN | AR |
|---|---|---|
| Section | `616:325`, 1440 × 329.110 | `2374:1435`, 1440 × 329.110 — **identical** |
| Direct children | **2** | **6** (2 + Swooshes `2737:6`–`2737:9`) |
| `Header` | `616:326`, 1312 × 66 | `2374:1436`, 1312 × 66 |
| └ `Title` | `616:328`, **367 × 66** | `2374:1438`, **242 × 66** — EN +125 (copy length) |
| `Club Marquee` | `616:331`, 1312 × 143.110 | `2374:1441`, 1312 × 143.110 — identical |
| `Fade Left` / `Fade Right` | `616:332` / `616:397`, **79.5 × 143.110** each | `2374:1442` / `2374:1507` — same |
| Club Cards | **8 × 174.913 × 143.110 — ALL WITH ZERO CHILDREN** | **8 × 174.913 × 143.110 — all populated** |

EN card ids: `616:333`, `616:341`, `616:349`, `616:357`, `616:365`, `616:373`, `616:381`, `616:389`.
Each is a bare frame carrying only the layer name
`Club Card [G.13-compliant: entity badge color confined to crest asset]` — **no `content` frame, no
`club-crest`, no `shield`, no icon, no city label, no club name.**

The AR equivalent (`2374:1443`, verified in full) contains:
```
Club Card 174.913 × 143.110
└ content 174.913 × 143.110
  ├ club-crest 63.605 × 63.605  @ (55.654, 26.753)
  │ └ shield 55.654 × 55.654    @ (3.975, 3.975)
  │   ├ activity 25.839 × 25.839 @ (14.907, 14.907)
  │   └ text "دبي" 17 × 11       @ (19.380, 38.759)   ← the ADR-0041 8.944px city label
  └ text "نادي دبي لألعاب القوى" 150.913 × 16 @ (12, 100.357)
```

→ **Classification: TOOLING BLOCKED for the file, DESIGN DECISION REQUIRED for content.**
The EN club cards need eight English club names and eight crest bindings. **None of that exists anywhere in
the file** — `NOT EXTRACTED — the English club names do not exist in Figma`. They must come from the CMS /
club register, not be invented. The **geometry** is fully recoverable from the AR card above and is
identical, so only the strings and crest assets are missing.

**ADR-0041 note:** the EN frame having empty cards means the **8 club-shield micro-labels at 8.944px exist
only in AR.** ADR-0041 (Ch.4 §4.15b) therefore currently governs 8 nodes, not 16. If the EN cards are
populated, the exception's scope doubles. Flagged for the ADR owner; **not amended here.**

---

## 9. Athletes — `616:398` vs `2374:1508`

| | EN | AR |
|---|---|---|
| `Inner` | 1440 × **944** | 1440 × **944** — identical |
| Direct children | **3** | **7** (3 + Swooshes `2737:10`–`2737:13`) |
| `Head` | `616:399`, 1440 × 118 — **2 children, 1 loose text** | `2374:1509`, 1440 × 118 — **1 child, 0 loose text** |
| └ `Head Text` | `616:401`, **1253.7 × 64** | `2374:1511`, **1373 × 64** — **AR +119.3** |
| `filters-wrap` | `616:404`, 1407 × 52 | `2374:1514`, 1407 × 52 — identical |
| └ `Filters` | `616:405`, **322 × 52**, 4 chips | `2374:1515`, **322 × 52**, 4 chips — **identical** |
| `carousel-and-controls` | `616:414`, 1440 × 774 | `2374:1524`, 1440 × 774 — identical |
| ├ `Athletes Row` | `616:415`, **1373 × 505**, **5 cards** | `2374:1525`, **1373 × 505**, **5 cards** — identical |
| └ `Carousel Controls` | `616:493`, 1373 × 134.2 | `2374:1603`, 1373 × 134.2 — identical |

**One real structural difference: EN's `Head` carries an extra loose text node that AR's does not.**
AR folds everything into `Head Text` (which is consequently 119.3px wider, spanning the full 1373 container);
EN splits the head into `Head Text` (1253.7) **plus a separate ~119px text** — almost certainly a
"View All →" style link that AR renders differently.
`NOT EXTRACTED — the EN loose text node's content` (its id was read from the tree but
`get_design_context` was not run on `616:399` to preserve context budget).
→ Low-severity; recorded for completeness. Everything else in this section is **identical**, including all
5 athlete cards and the full controls cluster.

**PB-GAP note (governance §7):** the open **DESIGN SYSTEM GAP** for personal-best values (22px × 4,
~26px × 1) lives in these athlete cards, in **both** frames. Shared, already-classified. The mobile anchor
adds a **third** undefined value at **14px** (`homepage-ar-mobile-390.md` §18).
Evidence now spans **14 / 22 / 26px** across three viewports → strengthens the case for a
Statistic / Numeric Display role, but **the owner still decides** (§7). Do not map to nearest.

---

## 10. Results & Events — `616:504` vs `2374:1614`

| | EN | AR |
|---|---|---|
| Section | 1440 × **867** | 1440 × **913** (**AR +46**) |
| Direct children | **2** | **4** (2 + Swooshes `2737:14`, `2737:15`) |
| Column order (layer) | `Inner`(events) then `Inner`(results) | `Inner`(results) then `Inner`(events) — **RTL mirror ✔** |
| **Results `Inner`** | `616:505`, **614 × 662** | `2374:1615`, **614 × 662** — **identical** |
| ├ `Head` | `616:506`, 614 × 117 | `2374:1616` — same |
| ├ `Badges` | `616:515`, 614 × 29 | `2374:1625` — same |
| └ `Table` | `616:520`, 614 × 468, **6 children** | `2374:1630`, 614 × 468, **6 children** — same (header + 5 rows) |
| **Events `Inner`** | `616:575`, **675.8 × 794.7** | `2374:1685`, **676 × 835** (**AR +40.3**) |
| ├ `Section Header` | `616:576`, 675.8 × 66 | `2374:1686`, 676 × 66 |
| ├ `Live Event` | `616:579`, 675.8 × **193** @ y 90 | `2374:1689`, 676 × **193** @ y 90 — identical |
| ├ `Filters` | `616:614`, 676 × **46** @ y 307 | `2374:1724`, 676 × **57.6** @ y 307 — **AR +11.6** |
| └ `Events List` | `616:623`, 675.8 × **377.6** @ y **377** | `2374:1733`, 676 × **377.6** @ y **388.6** — same height, **pushed down 11.6** |

**The entire 46px section-height difference traces to one node: the Filters chip row.**
AR chips are **57.6** tall vs EN **46** — an **11.6px** delta that cascades into the Events List offset
(377 → 388.6) and then into the section box.

**Root cause — Arabic line-height, not a spacing decision.** The mobile equivalents confirm it: the Events
filter chips use `Type/Label` (`Alexandria Medium 13px, lh 1.3`) with `padding: 11px 16px`
(`homepage-ar-mobile-390.md` §7.2). Arabic glyphs at Alexandria's ascender/descender extents render taller
than Latin at the same nominal size and line-height.

> **🔴 This is the single most important measurement in this document for tablet derivation.**
> It is hard evidence that **AR and EN do not produce the same box heights from the same type tokens.**
> Any 768px layout derived by interpolating heights between 390 and 1440 must be validated **separately per
> language**, or Arabic will overflow every fixed-height chip, pill, badge and row.
> → Classification: **DESIGN DECISION REQUIRED** — the team must decide whether tablet components are
> min-height/content-driven (safe) or fixed-height (will break AR). **Do not assume the EN measurement.**

Note that the Results table (614 × 468, 5 rows) is **byte-identical** between languages — because it is
number-dominated. The divergence is confined to prose-bearing chips.

---

## 11. News — `616:777` vs `2374:1887`

| | EN | AR |
|---|---|---|
| Section | 1440 × **884.537** | 1440 × **857.610** (−26.9) |
| Direct children | **2** | **6** (2 + Swooshes `2737:16`–`2737:19`) |
| `Section Header` | `616:778`, 1312 × 66 | `2374:1888`, 1312 × 66 |
| └ `Title` | `616:780`, **383 × 66** | `2374:1890`, **312 × 66** — EN +71 (copy length) |
| `News Layout` | `616:783`, 1312 × **610.537** | `2374:1893`, 1312 × **583.610** (−26.9) |
| Child order | `Lead Article` then `News List` | `News List` then `Lead Article` — **RTL mirror ✔** |
| `Lead Article` | `616:815`, **644 × 554** | `2374:1925`, **644 × 533** (**AR −21**) |
| `News List` | `616:784`, **644 × 610.537**, **5 items** | `2374:1894`, **644 × 583.610**, **5 items** (**AR −26.9**) |

Same two-column 644 + 644 split, same 5 list items, same lead-article slot. **All deltas are copy-length
reflow**: English headlines and deks run longer, so the EN lead card is 21px taller and the EN list 26.9px
taller. No structural difference.

**⚠️ R7 note:** the 14 R7-affected `Section / News` instance nodes (governance §4) are in this section, in
both frames. Shared **TOOLING BLOCKED**.

---

## 12. UAEAF in the Media — `616:822` vs `2374:1932`

| | EN | AR |
|---|---|---|
| Section | 1440 × **652** | 1440 × **614** (**AR −38**) |
| Direct children | **7** | **11** (7 + Swooshes `2737:20`–`2737:23`) |
| `Section Header` | `616:823`, 1312 × **104** | `2374:1933`, 1312 × **66** (**AR −38**) |
| └ `Title Group` | `616:825`, **480 × 104** @ y −0.3 | `2374:1935`, **312 × 66** @ y 0 |
| Media Coverage Cards | 4 × **326 × 320** @ y **200** (`616:828`, `…835`, `…842`, `…849`) | 4 × **326 × 320** @ y **162** (`2374:1938`, `…1945`, `…1952`, `…1959`) |
| └ Article Image (each) | 326 × **140** | 326 × **140** — identical |
| `Edge Fade` | `616:856`, **80 × 320** @ y 200 | `2374:1966`, **80 × 320** @ y 162 — identical |
| `Carousel Controls` | `616:857`, **176 × 44** @ y 543.7 | `2374:1967`, **176 × 44** @ y 505.7 — identical |
| ├ Nav Arrow / Prev | `616:858`, 36 × 36 | `2374:1968` — same |
| ├ Pagination Dots | `616:860`, 68 × 8, 4 dots | `2374:1970` — same |
| └ Nav Arrow / Next | `616:865`, 39 × 36 | `2374:1975` — same |

**The entire 38px difference is one node: the section header.** EN's `Title Group` is **104 tall vs AR's 66**
— a 38px delta that shifts every subsequent child down by exactly 38 and grows the section box by exactly 38.
`Title Group` also runs **480 wide in EN vs 312 in AR**.

**This is a genuine wrap, not just width.** At 66px the title group holds two lines (title + subtitle,
matching AR); at 104px the EN version holds a **third line** — the English title or subtitle is wrapping.
The EN `Title Group` also sits at **`y: -0.3`**, a sub-pixel misalignment absent in AR.
→ Classification: **DESIGN DECISION REQUIRED** — either the EN copy shortens, or the header is allowed to be
3 lines in EN and the 38px is accepted. **Do not shorten approved copy autonomously** (governance §12).
`NOT EXTRACTED — the exact EN title/subtitle strings` (design context was not pulled for `616:825`).

Everything else — 4 cards, card geometry, image slot, edge fade, full carousel controls — is **identical**.

---

## 13. Sponsors & Partners — `616:867` vs `2374:1977`

**The largest geometric divergence on the page: EN is 289px taller and uses a different container width.**

| | EN | AR |
|---|---|---|
| Section | 1440 × **1196** | 1440 × **907** (**AR −289**) |
| Direct children | **1** | **3** (1 + Swooshes `2737:24`, `2737:25`) |
| `Inner` | `616:868`, **1312 × 1068** @ y **64** | `2374:1978`, **1360 × 827** @ y **40** |
| `Head` | `616:869`, 1312 × **68** @ y 0 — **1 child, 0 texts** | `2374:1979`, 1360 × **66** @ y 0 — **2 children, 2 texts** |
| `Partner Stats` | `616:873`, 1312 × **98** @ y **108** | `2374:1983`, 1360 × **80** @ y **90** |
| `strategic-sponsor-card` | `616:883`, 1312 × **306.8** @ y **246** | `2374:1993`, 1360 × **208** @ y **194** (**AR −98.8**) |
| `Sponsor Strip` | `616:904`, 1312 × **286.5** @ y **592.8** | `2374:2014`, 1360 × **212** @ y **426** (**AR −74.5**) |
| `Partner CTA` | `616:936`, 1312 × **200** @ y **919.3** | `2374:2046`, 1360 × **165** @ y **662** (**AR −35**) |

**Three independent divergences, none of them copy length:**

1. **🔴 Container width: 1312 (EN) vs 1360 (AR).** Every other section in **both** frames uses **1312** —
   Stats, Clubs, News, Media, Media Centre, Memberships and the Footer Grid are all 1312. **The AR sponsors
   section is the sole 1360 outlier in the entire document.** EN is the one that follows the site grid.
   → Classification: **DESIGN DECISION REQUIRED** — this is a grid conflict between the approved AR baseline
   (1360) and the site-wide container rule (1312). Per governance §1 the AR baseline nominally wins, but a
   48px container break in one section reads as an error, not a decision. **Report, do not pick.**
   Ch.5 (Grid/Layout) is the governing chapter; **it was not consulted as part of this extraction** —
   `NOT EXTRACTED — Design System Ch.5 was not read during this archival pass`.
2. **Vertical rhythm: EN `Inner` starts at y 64, AR at y 40.** Every block is correspondingly taller in EN
   (`strategic-sponsor-card` +98.8, `Sponsor Strip` +74.5, `Partner CTA` +35).
3. **`Head` composition differs:** AR's head has **2 children / 2 text nodes** (title + subtitle);
   EN's has **1 child / 0 loose texts**. The EN head appears to be **missing its subtitle**.
   `NOT EXTRACTED — the EN head's inner content` (design context not pulled for `616:869`).

**Block ORDER is identical in both** (Head → Partner Stats → strategic-sponsor-card → Sponsor Strip →
Partner CTA), and the mobile anchor keeps the same five-block order
(`homepage-ar-mobile-390.md` §10). So the section's **information architecture is stable across all three
viewports**; only its metrics diverge.

`strategic-sponsor-card` is a **0-children frame in both** (`616:883`, `2374:1993`) — a component instance
whose contents metadata does not expand. Its internals are recoverable from the mobile equivalent
(`2374:2754`) but **NOT EXTRACTED at desktop — reason: instance children not returned by `get_metadata`.**

---

## 14. Live Stream & Videos — `616:942` vs `2374:2052`

| | EN | AR |
|---|---|---|
| Section | 1440 × **710** | 1440 × **710** — **identical** |
| Direct children | **1** | **3** (1 + Swooshes `2737:26`, `2737:27`) |
| `Media Split Columns` | `616:943`, **1312 × 582** @ y 64 | `2374:2053`, **1312 × 582** @ y 64 — identical |
| Column order (layer) | `Live Streaming Column` then `Video Library Column` | `Video Library Column` then `Live Streaming Column` — **RTL mirror ✔** |
| `Live Streaming Column` | `616:989`, **624 × 582** | `2374:2099`, **624 × 582** — identical |
| `Video Library Column` | `616:944`, **624 × 551.9** | `2374:2054`, **624 × 551.9** — identical |

**Zero geometric divergence.** The only difference is the Swooshes and the mirrored layer order (which is
correct RTL behaviour, not drift). This is the **cleanest section in the comparison** and the best template
for what EN/AR parity should look like.

Note the mobile anchor **reverses the stacking order relative to the AR desktop layer order** — mobile puts
**Live Stream first**, then Video Library (`homepage-ar-mobile-390.md` §11). Recorded so the 768px stack
order is taken from the mobile precedent, not from the desktop layer order.

---

## 15. 🔴 Media Centre (EN) vs Photo Albums Section (AR) — DIFFERENT SECTIONS

**This is not a translation difference. These are two different sections occupying the same slot.**

| | EN `Media Centre` `616:1017` | AR `Photo Albums Section` `2374:2127` |
|---|---|---|
| Size | 1440 × **593** | 1440 × **1431** (**+838**) |
| Node id range | `616:*` | `2828:*` for all children — **a separate build** |
| Direct children | 3 | 5 |
| Structure | `Section Header` → `Gallery Grid` (4 cards) → `Reel / Video Shelf Row` | `Header` (+`Actions`) → `Featured Album` → `Album Grid` |

**EN composition** (`get_design_context` on `616:1017`, captured in full):
- Section: bg **`--color-gray-950` `#131210`**, padding **64px**, column, `gap: 32px`.
- `Section Header` `616:1018` — 1312 × 66, space-between, `items-end`:
  - `Title Group` `616:1020` (269 × 66), `gap: 8px`, `--color-text-inverse`:
    - `616:1021` — `Alexandria Bold **32px**`, lh 1.25. Copy: **`Photo Gallery`**
    - `616:1022` — `Alexandria Regular **13px**`, lh 1.4. Copy: **`Documenting Moments of Sporting Glory`**
  - `616:1019` — `Alexandria SemiBold **14px**`, **`--color-green-300` `#3dad65`**.
    Copy: **`View Full Gallery →`**
- `Gallery Grid` `616:1023` — 1312 × 314, `flex-wrap`, `gap: 16px`. **4 Gallery Cards** at **316 wide**:
  - Card: bg `--color-surface-base`, border **0.994px** `--color-border-default` *(R7 artifact of 1px)*,
    **radius 12px**, `overflow: clip`, shadow `0 4px 12px -2px rgba(0,0,0,0.05)`.
  - `Image` — full width × **240**, cover.
  - `Card Content` — bg **`--color-gray-900` `#21201c`**, padding **16px**, `gap: 8px`:
    - caption `Alexandria SemiBold **14px**`, `--color-text-inverse`;
    - **`View Link`** — `Type/Label` (`var(--typography-label-desktop, 13px)`, lh 1.3),
      `--color-green-300`. Copy: **`View Photos →`**
  - Captions: `Opening Ceremony` (`616:1027`) · `Moments from the Track and Field` (`616:1033`) ·
    `Podium Ceremony` (`616:1039`) · `Training Session` (`616:1045`).
- `Reel / Video Shelf Row` `616:1048` — **absolutely positioned**: `right: 64px`, `top: 500.17px`,
  **411 × 62**. bg `#f5f5f5`, border 0.994px `--color-border-default`, **radius 10px**,
  padding `14px 20px`, `gap: 12px`:
  - text `616:1049` — `Type/Label` 13px, **`#000000`**, w 333.
    Copy: **`Watch: Highlights from the UAE National Championship 2026 - 4:28`**
  - `Play Button` `616:1050` — **32 × 32** SVG.

**AR composition** (`2374:2127`, from metadata — design context **NOT EXTRACTED**, see below):
- `Header` `2828:10` — **1312 × 204**:
  - `Title Group` `2828:11` — 1312 × **80**, 2 texts
  - `Actions` `2828:14` — 1312 × **100**, **0 children** (an unexpanded instance)
- `Featured Album` `2828:15` — **1312 × 400**:
  - `Featured Image` `2828:16` — **600 × 400**, 0 children
  - `Featured Info` `2828:20` — **680 × 229** @ y 85.5, 3 children / 2 texts
- `Album Grid` `2828:24` — **1312 × 603** @ y 764, 2 children / 1 text:
  - `Grid Rows` `2828:26` — **1312 × 550** @ y 53, 2 children

**Implications:**

1. **The mobile anchor follows EN, not AR.** The mobile `Media Centre Section` (`2374:2807`, 390 × 527)
   is a 4-card gallery grid + reel shelf row — **the EN structure**, on a `--color-gray-950` ground, with the
   same `--color-green-300` on-dark link colour. It has **no** featured album, **no** album grid.
   *(See `homepage-ar-mobile-390.md` §12, which flags the same conflict from the other side.)*
2. **The two designed anchors model different sections in this slot.** Desktop-AR says "Photo Albums with a
   featured hero album"; mobile-AR and desktop-EN both say "4-up photo gallery + reel shelf".
   → **🔴 The 768px design for this slot CANNOT be derived.** There is no consistent pair of anchors to
   interpolate between. Classification: **DESIGN DECISION REQUIRED — blocking for tablet.**
   Per governance §13, the honest status is **RESPONSIVE DESIGN NOT VERIFIABLE** for this section.
   **Do not fabricate a tablet composition here.**
3. Which is current? The AR `Photo Albums Section` uses the **`2828:*`** id range — numerically the newest
   range in either frame (higher than the AR baseline's own `2374:*` and the Swooshes' `2737:*`), which
   suggests it is the **later** build and the EN `Media Centre` is the legacy one. **This is inference from
   id ordering, not evidence.** → Owner must confirm. **Do not act on the inference.**

`NOT EXTRACTED — the AR Photo Albums Section's real values (typography, colours, copy, spacing)`:
`get_design_context` was not run on `2374:2127`. Only its metadata skeleton above is recorded.
**⚠️ If Figma read access survives, extracting `2374:2127` is the highest-value remaining call.**

---

## 16. memberships-section — `616:1051` vs `2374:2161`

| | EN | AR |
|---|---|---|
| Section | 1440 × **459** | 1440 × **459** — identical |
| Direct children | **3** | **5** (3 + Swooshes `2737:32`, `2737:33`) |
| `Header` | `616:1052`, 1312 × 70 @ y 24.5, 2 texts | `2374:2162` — **identical** |
| `Organizations Row` | `616:1055`, 1312 × 220 @ y 142.5 | `2374:2165` — identical |
| Cards (5) | `616:1056`, `…1061`, `…1066`, `…1071`, `…1076` — **249.6 × 220** each, 2 children each | `2374:2166`, `…2171`, `…2176`, `…2181`, `…2186` — **identical** |
| `Carousel Controls` | `616:1081`, 78 × 24 @ y 410.5, 5 dots | `2374:2191` — identical |

**Structurally identical apart from the Swooshes.** Card names are **English in both frames**
(`Card - Olympic Council of Asia`, `Card - International Olympic Committee`,
`Card - Asian Athletics Association (Hover)`, `Card - World Athletics`,
`Card - UAE National Olympic Committee`) because they are organisation proper nouns.
Card 3 is a **Hover-state variant** in both.

**CAPTION-GAP / ADR-0041 note (governance §6):** the 10 bilingual caption nodes at
**12.5px (AR) / 10.5px (EN)** live in these 5 cards, in **both** frames. Shared, already **RESOLVED —
ADR-0041**. The mobile anchor uses **11px / 9px** instead (`homepage-ar-mobile-390.md` §13) — values ADR-0041
does not name. → **The ADR needs a mobile clause; DESIGN DECISION REQUIRED.** Not amended here.
The mobile anchor also composes only **3 of the 5** cards and omits card 3's English caption entirely.

---

## 17. Newsletter — `2571:12` vs `2387:1128`

| | EN `Section / Newsletter` | AR `Newsletter Section` |
|---|---|---|
| Node id | **`2571:12`** | **`2387:1128`** |
| Size | 1440 × **223** | 1440 × **223** — identical |
| Direct children | **3** (+2 loose texts) | **9** (+2 loose texts) — 3 + Swooshes `2737:34`–`2737:37` … +2 unaccounted |
| `Form Row` | `2571:15`, **471 × 49** @ y **137.5** | `2387:1133`, **445 × 45** @ y **134.5** |
| `Subscribe Button` | `2571:16`, **119 × 45** @ y **2** | `2387:1134`, **93 × 45** @ y **0** |
| `Email Input` | `2571:18`, **340 × 49** | `2387:1136`, **340 × 45** |
| Button/Input order | Button then Input | Button then Input — **same layer order in both** |

**Two real deltas:**
1. **🔴 EN `Email Input` is 49 tall while its `Subscribe Button` is 45** — and the button is nudged
   `y: +2` to fake vertical centring. In AR **both are 45 and both sit at y 0.** The EN field is 4px taller
   than its own button. → Classification: **DESIGN DECISION REQUIRED** (an evidenced EN alignment defect;
   AR is correct). **Build both at 45.**
2. **EN Subscribe Button is 119 wide vs AR 93** (+26) — pure copy length
   (`Subscribe` vs `اشتراك`). Benign.

**Different node ranges (`2571:*` vs `2387:*`) confirm these are two separate masters, not one component
with two language modes.** Governance §17 → build one component.

The mobile anchor stacks the form full-width (`2374:2856`, column, `gap: 10px`) rather than placing the two
inline — so the **768px form orientation is a discrete choice** (inline like desktop, or stacked like
mobile), **DESIGN DECISION REQUIRED**.

---

## 18. Footer — `675:203` vs `2374:2198`

| | EN | AR |
|---|---|---|
| Section | 1440 × **440** | 1440 × **514** (**AR +74**) |
| Direct children | **2** | **6** (2 + Swooshes `2737:38`–`2737:41`, incl. a **White Swoosh** `2737:40`) |
| `Footer Grid` | `675:204`, **1312 × 358** @ y **45** | `2374:2199`, **1312 × 364** @ y **79** (**+34 offset, +6 height**) |
| Column order (layer) | `Brand` → `Quick Links` → `Location` → `Contact` | `Contact` → `Map Column` → `Quick Links` → `Brand` — **RTL mirror ✔** |
| `Brand` | `675:240`, 292 × **191**, 4 kids / 2 texts | `2374:2230`, 292 × **211**, 4 kids / 2 texts (**AR +20**) |
| `Quick Links` | `675:228`, 292 × **310**, 11 kids / **11 texts** | `2374:2218`, 292 × **316**, 11 kids / **11 texts** (**AR +6**) |
| Location / Map | `675:205` **`Location`**, 292 × 208, 2 kids / 1 text | `2374:2209` **`Map Column`**, 292 × 208, 2 kids / 1 text — **same geometry, different layer name** |
| `Contact` | `677:486`, 292 × **154**, 5 kids / 4 texts | `2374:2200`, 292 × **162**, 5 kids / 4 texts (**AR +8**) |
| `Legal Strip` | `675:253`, 1312 × **64** @ y **403** | `2374:2256`, 1312 × **64** @ y **443** — same height |
| └ `Legal Links` | `675:254`, **451 × 16**, **4 links** | `2374:2257`, **474 × 16**, **4 links** (**AR +23**, copy length) |

**All four columns are structurally identical** — same child counts, same text counts, same 292px column
width, same 4-column grid. Every height delta (+20 / +6 / +8) is Arabic line-height reflow, consistent with
the §10 finding.

**The 74px section difference is mostly vertical placement, not content:** AR's `Footer Grid` starts at
**y 79** vs EN's **y 45** (+34), and AR's grid is 6px taller (+6) — 34 + 6 = 40; the remaining ~34px sits in
the strip offset (443 vs 403).

**Two naming/model notes:**
- `Location` (EN) vs `Map Column` (AR) — same 292 × 208 geometry, different layer name.
  The **approved footer redesign of record is the one with a Location map**, which both satisfy; the AR name
  matches the mobile anchor's `Map Column` (`2374:2900`). Low severity, but the two frames should not carry
  two names for one component. → **Build one `Map Column`.**
- **Mobile drops content the desktop keeps:** the mobile footer carries **6 quick links (vs 11)** and
  **3 legal links (vs 4)**, and its social row has **4 buttons with no TikTok**, whereas the hero social rail
  carries 5 including TikTok (`homepage-ar-mobile-390.md` §15).
  → **The 768px footer link set is DESIGN DECISION REQUIRED** — 11 and 6 are both designed, but which links
  are dropped is unrecorded. `NOT EXTRACTED — the desktop link labels`
  (`get_design_context` was not run on `675:228` / `2374:2218`), so the specific 5 dropped quick links and
  1 dropped legal link cannot be identified from this extraction.

---

## 19. Token bindings on the EN frame

`get_variable_defs` on `616:98`. **The EN frame resolves a notably richer token set than the mobile
frame** — it includes spacing, radius, elevation and the full desktop type scale:

**Colour:** `--color-brand-primary` `#00843d` · `--color-brand-black` `#000000` ·
`--color-green-300` `#3dad65` · `--color-green-500` `#00843d` · `--color-green-600` `#006b31` ·
`--color-green-700` `#005226` · `--color-gray-500` `#757470` · `--color-gray-900` `#21201c` ·
`--color-gray-950` `#131210` · `--color-text-primary` `#000000` · `--color-text-secondary` `#616058` ·
`--color-text-inverse` `#ffffff` · `--color-surface-base` `#fdfcfb` · `--color-surface-raised` `#ffffff` ·
`--color-border-default` `#e0dfdb` · `--color-border-strong` `#757470` ·
`color/semantic/live` `#c8102e` · `color/semantic/achievement` `#c8102e`

**Spacing:** `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 20 · `--space-12` 48 · `--space-16` 64
**Radius:** `--radius-lg` 16
**Elevation:** `Elevation/1` = `DROP_SHADOW, #0000000F, offset (0,1), radius 2, spread 0`

**Typography (all `*-desktop`):**

| Style | Definition |
|---|---|
| `Type/H1` | Alexandria Black, `var(--typography-h1-desktop)` = **40**, w 900, lh 1.2, ls 0 |
| `Type/H2` | Alexandria Bold, `var(--typography-h2-desktop)` = **32**, w 700, lh 1.25, ls 0 |
| `Type/Subtitle` | Alexandria Medium, `var(--typography-subtitle-desktop)` = **16**, w 500, lh 1.5, ls 0 |
| `Type/Body` | Alexandria Regular, `var(--typography-body-desktop)` = **16**, w 400, lh 1.6, ls 0 |
| `Type/Body Small` | Alexandria Regular, `var(--typography-body-sm-desktop)` = **14**, w 400, lh 1.5, ls 0 |
| `Type/Caption` | Alexandria Regular, `var(--typography-caption-desktop)` = **13**, w 400, lh 1.4, ls 0 |
| `Type/Label` | Alexandria Medium, `var(--typography-label-desktop)` = **13**, w 500, lh 1.3, ls 0 |
| `Type/Eyebrow` | Alexandria **Bold 16 (literal, unbound)**, w 700, lh 1.5, ls 0 |
| `Type/CTA Label` | Alexandria **Bold 16 (literal, unbound)**, w 700, lh 1.5, ls 0 |
| `Type/Compact Metadata` | Alexandria **Medium 14 (literal, unbound)**, w 500, lh 1.5, ls 0 |

**Comparison with the AR desktop set** (`2374:2314` mobile returned a subset; the AR desktop frame's own
`get_variable_defs` was **NOT EXTRACTED — reason: the call was spent on the metadata diff instead**).
From the sections sampled, the AR baseline binds the same `Type/*` styles.

> **🔴 The decisive tablet finding, restated from the token layer.**
> Three of the ten type styles (`Type/Eyebrow`, `Type/CTA Label`, `Type/Compact Metadata`) carry **literal
> sizes with no variable**, and every bound size is suffixed **`-desktop`**. There is **no `*-tablet` and no
> `*-mobile` variable in the file** — the mobile frame proves it by binding the *desktop* tokens for its H2
> and label styles (`homepage-ar-mobile-390.md` §0.1).
> → **A 768px type scale cannot be interpolated because there is nothing to interpolate *to*.** The
> `-desktop` suffix implies a mode-based system that was never built out.
> Classification: **DESIGN SYSTEM GAP** (governance §16). The owner must decide whether to add
> `--typography-*-tablet` / `-mobile` variables. **Do not silently create tokens** (§16), and do not derive
> a scale from taste.

---

## 20. Consolidated delta register

| # | Finding | Section | Classification |
|---|---|---|---|
| 1 | **40 Swoosh vectors in AR, 0 in EN** | 10 sections | **DESIGN DECISION REQUIRED** (§3) |
| 2 | **`sponsors-marquee-bar` absent from EN** | §6 | **DESIGN DECISION REQUIRED** — commercial obligation |
| 3 | **EN `Media Centre` ≠ AR `Photo Albums Section`** | §15 | **DESIGN DECISION REQUIRED — blocking for tablet** |
| 4 | **EN club cards are 8 empty frames** | §8 | **DESIGN DECISION REQUIRED** (content) + **TOOLING BLOCKED** (file) |
| 5 | **EN header nav overflows 1440 by ~42px** | §4.2 | **DESIGN DECISION REQUIRED** |
| 6 | **AR sponsors `Inner` is 1360 wide; every other section is 1312** | §13 | **DESIGN DECISION REQUIRED** (grid conflict) |
| 7 | **AR hero has a duplicated Next-Event Card** | §5.1 | **TOOLING BLOCKED** — render one |
| 8 | **EN newsletter input 49 tall vs its own 45 button** | §17 | **DESIGN DECISION REQUIRED** — AR (45/45) is correct |
| 9 | **AR chips 57.6 vs EN 46 — Arabic line-height inflation** | §10 | **DESIGN DECISION REQUIRED** — per-language validation |
| 10 | **EN media section header 104 vs AR 66 (3-line wrap)** | §12 | **DESIGN DECISION REQUIRED** |
| 11 | AR nav items componentised (`2544:*`); EN nav items are plain frames | §4.1 | **TOOLING BLOCKED** — unify at build |
| 12 | Newsletter is two masters (`2571:*` / `2387:*`) | §17 | **TOOLING BLOCKED** — unify at build |
| 13 | `Location` (EN) vs `Map Column` (AR) naming | §18 | **TOOLING BLOCKED** — unify at build |
| 14 | EN athletes `Head` has an extra loose text node | §9 | **OUT OF SCOPE** — low severity |
| 15 | Both frames overflow their declared 8758 height (8838.27 / 9410.13) | §1 | **VERIFIED / NOT AN ISSUE** — canvas artefact |
| 16 | R7 fractional sizes (12.92 / 15.901 / 0.994 / 2.485 …) | §4.3, §15 | **TOOLING BLOCKED** — shared, already classified (§4) |
| 17 | PB-GAP: 22 / 26px desktop, 14px mobile | §9 | **DESIGN SYSTEM GAP** — already open (§7) |
| 18 | ADR-0041 club labels exist only in AR (8 nodes, not 16) | §8 | **VERIFIED** — flagged to ADR owner |
| 19 | ADR-0041 captions are 12.5/10.5 desktop but 11/9 mobile | §16 | **DESIGN DECISION REQUIRED** — ADR needs a mobile clause |
| 20 | **No `*-tablet` or `*-mobile` typography variables exist** | §19 | **DESIGN SYSTEM GAP** — blocking for tablet |
| 21 | Primary CTA radius: 9999px desktop vs 6px mobile | §5.2 | **DESIGN DECISION REQUIRED** — discrete, not interpolable |
| 22 | Social rail 42px desktop vs 24px mobile buttons | §5.1 | **DESIGN DECISION REQUIRED** |
| 23 | Live Stream & Videos — **zero divergence** | §14 | **VERIFIED / NOT AN ISSUE** ✔ |
| 24 | memberships-section — **zero divergence** (bar Swooshes) | §16 | **VERIFIED / NOT AN ISSUE** ✔ |
| 25 | Results table (614 × 468, 5 rows) — **identical in both languages** | §10 | **VERIFIED / NOT AN ISSUE** ✔ |
| 26 | Section ORDER identical in both frames | §2 | **VERIFIED / NOT AN ISSUE** ✔ |
| 27 | RTL mirroring correct everywhere it was checked (nav, utilities, hero content x, social rail, news, results, live, footer, stats head) | throughout | **VERIFIED / NOT AN ISSUE** ✔ |

---

## 21. Explicitly NOT extracted

| Item | Reason |
|---|---|
| Full EN section-by-section values (typography, colour, copy) | **By design — this is a diff document.** Real values were pulled only for `616:99` (header), `616:165` (hero content) and `616:1017` (Media Centre), i.e. the genuinely divergent nodes. |
| **AR `Photo Albums Section` (`2374:2127`) real values** | `get_design_context` was not run. **Highest-value remaining call if read access survives.** |
| EN `616:869` (sponsors head), `616:399` (athletes head), `616:825` (media title group) inner content | Context budget; identified as divergent but not opened. |
| Desktop quick-links and legal-link labels (`675:228` / `2374:2218`, `675:254` / `2374:2257`) | Not opened — so the 5 quick links and 1 legal link dropped on mobile are unidentified. |
| `strategic-sponsor-card` internals at desktop (`616:883`, `2374:1993`) | Instance children not returned by `get_metadata`; recoverable from mobile `2374:2754`. |
| `Actions` internals in AR Photo Albums (`2828:14`) | 0 children returned — unexpanded instance. |
| AR desktop frame's own `get_variable_defs` | Call budget spent on the metadata diff. EN's set (§19) is recorded in full. |
| Swoosh vector ids `2737:28`–`2737:31` | Not present in either diffed tree. |
| Design System **Ch.5 (Grid/Layout/Breakpoints)** cross-check for the 1312/1360 conflict | Not read during this archival pass. **Must be consulted before resolving finding #6.** |
| Prototype wiring, motion, hover/focus/pressed states, dark mode, tablet frames | **Do not exist in the file** for either frame. Per governance §13: **RESPONSIVE DESIGN NOT VERIFIABLE** at 768px. |
| Image and icon assets | Referenced by Figma MCP URLs with a **~7-day TTL from 2026-09-07**. **Not downloaded.** → **URGENT: export and commit every asset before expiry.** |

---

## 22. What this means for the 768px derivation

The owner's plan is to derive tablet in code by interpolating between two designed anchors: **AR desktop
1440** and **AR mobile 390**. This extraction establishes that **the interpolation is valid for most of the
page and impossible for five specific things**:

**✅ Safely interpolable** (both anchors agree on structure; only metrics change):
Header shell · Stats grid (4 cards: 1×4 → 2×2) · Clubs marquee (8 → 3 cards) · Athletes carousel (5 → 3) ·
Results table · Events list · News (5 → 3 list items) · Media cards (4 → 2) · Sponsors five-block order ·
Live/Videos · Memberships (5 → 3) · Newsletter · Footer columns.

**🔴 NOT interpolable — DESIGN DECISION REQUIRED before any tablet work:**
1. **Media Centre / Photo Albums** — the anchors model *different sections* (§15).
2. **The Swoosh motif** — 40 at desktop, 0 at mobile; no continuous middle (§3).
3. **Navigation pattern** — 9-item inline bar vs 10-item drawer is a discrete switch, and the drawer adds a
   top-level `الرياضيون` the header lacks (see `mobile-nav-drawer-390.md` §6.3, §9).
4. **Typography scale** — no `*-tablet` variables exist, and the mobile frame binds *desktop* tokens for its
   H2; there is nothing to interpolate to (§19).
5. **Discrete shape changes** — primary CTA radius 9999px → 6px; social rail buttons 42 → 24;
   Results section side padding 0 (mobile) vs container-aligned (desktop) (§5.2, §5.1).

**⚠️ And one process rule, evidenced by §10 and §18:** Arabic and English produce **different box heights
from identical type tokens** (chips 57.6 vs 46; footer columns +8/+20). **Every tablet component must be
min-height / content-driven and validated in both languages.** A tablet built and measured in English will
overflow in Arabic.

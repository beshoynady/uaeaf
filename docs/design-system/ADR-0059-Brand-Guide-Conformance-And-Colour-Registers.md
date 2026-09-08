# ADR-0059 — Brand-Guide Conformance, Colour Registers, and the Text Ladder

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-09-08 |
| **Owner** | Design System |
| **Supersedes** | ADR-0050 §3.34.1 (the Functional Role table), the 70–80/15–20/≤5 ratio wherever it is still asserted |
| **Amends** | `00-01-Introduction-BrandIdentity.md` §Accessibility Considerations, §Standards — Prohibited Logo Misuse; `03-Design-Tokens.md` §3.34.1; `04-Typography.md` §4.4 |
| **Trigger** | The federation's own **UAEAF Visual Standard Guide** (`UAEAF_VSG2023(FinalR2)`) was supplied to the project for the first time on 2026-09-08 and designated a first-order source. |

---

## 1. Context

Until 2026-09-08 the project's colour governance was built from second-hand description of the federation's brand guide. The guide itself then arrived. Diffing it against the implementation produced three categories of finding:

1. **Rules in the design system with no basis in the guide**, one of which was the direct cause of two of the four defects the Product Owner had independently diagnosed.
2. **Rules in the guide never translated into the system.**
3. **Accessibility failures in the token layer** that no document had ever measured, found while verifying (1) and (2).

This ADR records the decisions that close all three. Every colour value below is measured, not asserted — the arithmetic lives in `apps/dashboard/src/lib/design-system/contrast.ts` and is enforced by `token-contrast.spec.ts`, so a claim here that stops being true fails a build.

### 1.1 The three identity colours are confirmed unchanged

| Name | Pantone | Guide §5.1 RGB | Token | Match |
| --- | --- | --- | --- | --- |
| Federation Green | 348 C | 0, 132, 61 | `color.brand.primary` `#00843D` | ✅ |
| Federation Red | 186 C | 200, 16, 46 | `color.brand.secondary` `#C8102E` | ✅ |
| Federation Black | Black C | 0, 0, 0 | `color.brand.black` `#000000` | ✅ |

Nothing in this ADR changes any of them. They are the fixed points everything below is derived from.

---

## 2. Decision D1 — Colour is assigned by **context**, not by proportion

### The rule being retired

`03-Design-Tokens.md` §3.34 clause 2 set a target of **"roughly 70–80% neutral, 15–20% Federation Green, ≤5% Federation Red."**

**This ratio appears nowhere in the federation's guide.** The guide states no proportion of any kind; §5.1 presents the three colours co-equally, at identical swatch size, each with the same two tints above it.

It is also the mechanism of two diagnosed defects, which is why retiring it is not a tidy-up:

* 70–80% neutral produced a product where **every screen of the admin dashboard is grounded in `#FFFFFF` or `#FAFAF8`**, and the public site is white plus a single black footer — one non-neutral region in two applications.
* 15–20% green against ≤5% red produced green as the sole operative identity colour, at a 3–4× advantage written into the rule.

It had already been superseded once, by ADR-0051, in favour of a qualitative target. That supersession did not propagate: `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §5 still states the numbers as a live guideline and `UAEAF-VISUAL-GOVERNANCE-INDEX.md` §1 still calls them "the binding rule." Three documents, three answers.

### The rule replacing it

The guide **does** contain a colour system — it assigns colour by *context*, and says so in its own page captions:

| Guide section | Artefact | Colour |
| --- | --- | --- |
| §1.3 | Athletes' apparel, international | White |
| §2.3 | **Referees'** apparel, international | **Red** |
| §3.3 | **Administrators'** apparel, international | **Green** |
| §4.3 · §5.3/§6.3 · §7.3/§8.3 · §9.3/§11.3 · §10.3/§12.3 · §13.3/§14.3 | Six garment pairs, each shown twice | **International = white/black · Local = red** |

Two axes, both explicit, both repeated across the document: colour distinguishes **role** (athlete / referee / administrator) and **context** (international / local). The same garment appears in a different identity colour depending on which context it belongs to.

**Decision:** colour in the UAEAF digital system is assigned the same way — by what a region *is*, never by how much of it there should be. §3.34.2's per-page personality table already worked this way and is unaffected; this decision removes the numeric budget above it and puts the guide's own logic in its place.

**Alternative rejected:** keeping a qualitative dominance statement only ("neutral dominant, brand subordinate"). Rejected because "subordinate" is what produced the all-white product; it describes an outcome without giving anyone a rule for deciding when a section is red.

---

## 3. Decision D2 — Section registers: full-bleed identity grounds are restored

### The rule being retired

§3.34.1's Functional Role table stated:

> | 🟢 Federation Green | … | Explicitly NOT: **A full-section background wash** |
> | 🔴 Federation Red | … | Explicitly NOT: … **or a section background** |

### The evidence against it

Guide **§6.1 Background Colors** shows the logo on **white, red, green and black grounds** as four official options, with one condition: *"use the full-colour logo where the background is white or clearly and largely contrasting; otherwise use the monochrome logo."* The condition governs which **logo variant** to use — it presupposes that coloured grounds exist.

The guide then uses them, on twelve pages: stationery (§2.1), point-of-sale (§2.2), flags (§2.3 — one full green, one full red), social template (§2.5), referee kit (§3.2), and every local-championship garment (§3.4, §3.6, §3.8, §3.11, §3.12, §3.14), plus black gear (§3.15) and a full-black back cover.

**Decision:** three section registers are added — green, red and black — each a complete, measured set: `surface`, `text`, `text-muted`, `border`, `divider`. Neutral remains the fourth register and the dominant one; it is the existing `surface.*`/`text.*` layer and is not renamed.

### Why the surface is the 600/700 step and not the 500

| Ground | White text | Verdict |
| --- | --- | --- |
| `green.500` `#00843D` | **4.81:1** | AA for normal text, with 0.31 of headroom and no room for a second tier |
| `green.700` `#005226` | **9.40:1** | Carries `text` at 9.40 and `text-muted` at 6.49 |
| `red.500` `#C8102E` | **5.88:1** | Passes; the muted tier does not fit under it |
| `red.600` `#A00D25` | **8.14:1** | Carries `text` at 8.14 and `text-muted` at 4.85 |

Chapter 1 already prescribes this escalation — *"when AAA is required, use 700 from the scale"* — and the identity value keeps its role unchanged: `500` remains the brand-mark reference per Chapter 1's *"use the official values literally as the 500 reference."* The boundary that the three identity values are fixed is not touched: no value is redefined, a different existing step of the same family is used for a different job.

**Alternative rejected:** using `500` as the section ground. Rejected on measurement — it leaves no second text tier, so every coloured section would be single-voiced.

### Why black is the only register that changes with the theme

| Register | vs light page `#FAFAF8` | vs dark page `#131210` |
| --- | --- | --- |
| green `#005226` | 8.99:1 | 1.99:1 — low, but carried by hue |
| red `#A00D25` | 7.79:1 | 2.30:1 — low, but carried by hue |
| black `#000000` | 20.09:1 | **1.12:1 — no boundary at all** |

A register exists to depart from the page. Pure black cannot depart from a near-black page, and has no hue to carry it. In dark theme the black register therefore resolves to `neutral-warm.700` `#4A4942`: 2.07:1 against the page, with `text` at 9.04 and `text-muted` at 4.75.

**Alternative rejected:** `neutral-warm.800`. Better muted contrast (6.75) but only 1.46:1 separation from the page — legible, and not a section.

### The adjacency rule (new, and load-bearing)

**Federation Green and Federation Red measure 1.15:1 against each other** at their register values (1.22:1 at their 500 values). Stacked as two full-bleed sections they have no visible boundary whatsoever — before considering that red/green is the classic confusion pair for roughly 8% of men.

The guide never abuts them either: in the four-stroke motif there is always white or black between.

**Decision:** `color.section.adjacent-separator` is **mandatory** between a green and a red section. It is a token, not a sentence in a document, so the rule is discoverable where the mistake would be made.

---

## 4. Decision D3 — Black is a primary identity colour, not ink

The project's accepted layer was internally contradictory, and the guide settles it.

| Source | Position |
| --- | --- |
| ADR-0004 (accepted) | *"Black = text and structural elements"* |
| §3.34.1 (accepted) | **No Black row at all** — the table's three rows are Green, White/Neutral, Red |
| `27-Brand-Visual-Language.md` §3.2 (Draft) | *"Black is the stage … the default canvas for anything meant to feel premium or dramatic"* |

The guide gives Black equal standing with Green and Red in §5.1 — same swatch, same tint treatment, same declaration — grants it a full-bleed ground in §6.1, and applies it to gear (§3.15), international leggings (§3.10), every trouser in the apparel system, and the entire back cover.

**Decision:** Black is a full identity colour with surface duty. §3.34.1's table is replaced by the register model above, in which Black is a first-class register. This resolves the H.3 contradiction in Chapter 27's favour on this specific point; the rest of Chapter 27 remains Draft.

**Alternative rejected:** keeping Black as ink and treating Chapter 27 as aspirational. Rejected because it requires the design system to disagree with the federation's own guide about how many identity colours the federation has.

---

## 5. Decision D4 — The text ladder is verified against every surface, in every theme

Found while implementing D2, not looked for.

`color.text.muted` carried the comment *"4.68:1 on white"* — accurate, and white was the only ground ever checked. Measured against every surface it may legally sit on:

| Theme | Surface | Old value `#757470` | Verdict |
| --- | --- | --- | --- |
| light | `surface.sunken` `#FAFAF8` | **4.48:1** | ✗ fails AA — and `sunken` is the most-used surface in the product, 15 call sites |
| dark | `surface.base` `#131210` | **4.00:1** | ✗ |
| dark | `surface.raised` `#21201C` | **3.48:1** | ✗ |
| dark | `surface.sunken` `#000000` | **4.49:1** | ✗ |

Four AA failures shipped, in both themes, invisible to every existing test.

**Decision:** both ladders shift one step, preserving four distinct tiers:

| Tier | Light: was → now | Dark: was → now |
| --- | --- | --- |
| primary | `black` (unchanged) | `neutral-warm.50` (unchanged) |
| secondary | `.600` → **`.700`** | `.400` → **`.300`** |
| muted | `.500` → **`.600`** | `.500` → **`.400`** |
| disabled | `.400` (unchanged) | `.700` → **`.600`** |

Every tier now clears 4.5:1 on every surface in its theme — light: 6.32/6.32/5.75 for muted; dark: 6.88/5.99/7.72. `disabled` remains deliberately below the threshold: WCAG 1.4.3 exempts inactive UI components, and the dimming is the affordance.

**Alternative rejected:** repointing `muted` to `.600` alone, leaving `secondary` at `.600`. Rejected — two names resolving to one value is a collapsed hierarchy that a later editor resolves by guessing.

**Enforcement:** `token-contrast.spec.ts` now checks the full cartesian product of text tiers × surfaces × themes, plus each register's ladder. A surface token exists precisely so that any of them may be used anywhere; checking a text colour only against the ground it happens to sit on today is not a contract.

---

## 6. Decision D5 — Two undefined tokens were rendering silently

CSS custom properties fail silently: `var(--does-not-exist)` does not throw, does not warn, and does not appear in any type check. Two names had reached production this way and survived a full green suite, a passing build, and a live browser pass:

| Token referenced | Where | Effect |
| --- | --- | --- |
| `--color-text-on-brand` | `role-workbench.tsx:373` | The **Archive role** button — a destructive action — took its label colour by inheritance over a `#D32F2F` fill. An unverified contrast pair on the one action that cannot be undone. |
| `--color-border-subtle` | `permission-catalogue-lens.tsx:121` | All 170 catalogue row separators fell back to `currentColor`. |

The second is mine, introduced in the merged Roles & Permissions screen and reported here rather than quietly fixed.

**Decision:** both tokens are defined — `text.on-brand` = white in all themes (4.98:1 on `semantic.error`, 4.81 on `brand.primary`, 5.88 on `brand.secondary`); `border.subtle` = `neutral-warm.150` in light. In dark it is deliberately **equal** to `border.default`, because the ramp has no step between `.800` (the default rule) and `.900` (which is `surface.raised` itself), so a genuinely fainter rule would be invisible against the card it divides.

**Enforcement:** `token-contract.spec.ts` extracts every `var(--x)` in the app and asserts the token package emits it. This class of defect is now a failing test rather than a silent one.

---

## 7. Decision D6 — The light theme gets a real elevation ramp

§3.33.1 recorded this as a Known Constraint and left it: *"`color/surface/base`, `color/surface/raised` … both currently identical, no elevation distinction yet."* The consequence measured in code: **1 of 22 card-like components carries any shadow**, and `--elevation-1` through `--elevation-4` have never been consumed by a single line of application code.

**Decision:** `surface.base` → `neutral-warm.50` (the page), `surface.raised` → `white` (cards), `surface.sunken` → `neutral-warm.100` (insets). Three distinct steps where there was one and a half.

This was only possible **after** D4. With `muted` at `#757470`, moving the page ground to `#FAFAF8` would have pushed it to 4.48:1 — an AA failure. The accessibility fix is what unlocked the visual one; attempted in the other order it would have had to be abandoned.

**Alternative rejected:** leaving the ramp collapsed and carrying depth on borders alone. Rejected because it makes elevation unusable in the theme most users see, and leaves a documented constraint permanently open.

---

## 8. Decision D7 — The ascent angle is measured, closing ADR-0005

ADR-0005 shipped with an open mitigation: *"Measure the angle and proportions from the original guide files before implementation."* No angle value exists anywhere in the design system; the only references are qualitative ("the take-off point angle", "the moment of ascent").

Measured from the four stroke geometries in `brand-assets/uaeaf-ribbon-motif.svg`:

| Stroke | Ascent angle | Length |
| --- | --- | --- |
| red, short | 40.34° | 23.4 |
| red, long | 44.09° | 40.8 |
| green, long | **45.14°** | 81.2 |
| black | 44.15° | 56.0 |

**Mean of the three full-length strokes: 44.46°.** The 40.34° outlier is the shortest stroke, where the rounded cap is a large fraction of the total geometry.

**Decision:** the system angle is **45°**, a 0.54° rounding from measurement, chosen because a 45° diagonal has an exact 1:1 slope on the pixel grid and renders without the stair-stepping shimmer a 44.46° repeating gradient produces at small sizes. The measurement is recorded here so the rounding is auditable rather than invisible.

### D7.1 — The ascent direction does not mirror in RTL

This follows from two existing rules and is stated because the default implementation would get it wrong. Guide §9.1 prohibits *"changing the direction of the emblem's lines"*, and `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §9 prohibits mirroring identity artwork without exception.

**The ascent vector is therefore a fixed brand property, not a reading-direction property.** Motion derived from The Rise runs lower-start → upper-end in both Arabic and English. An RTL layout mirrors its text and its grid; it must not mirror the ascent.

> **Note against ADR-0005:** its "Why This Decision" states the SVG *"supports automatic RTL mirroring."* For this motif that capability must be left unused. Flagged rather than edited — ADR-0005 is accepted and its correction is a separate amendment.

### D7.2 — The committed asset does not use the official colours

| | `uaeaf-ribbon-motif.svg` | Official §5.1 | Δ RGB |
| --- | --- | --- | --- |
| red | `#c8202f` | `#C8102E` | 0, **16**, 1 |
| green | `#008542` | `#00843D` | 0, 1, 5 |
| black | `#1b1718` | `#000000` | **27, 23, 24** |

Chapter 1 §Do & Don't: *"Do not invent colors that are merely 'close' to the official colors."* Guide §9.1: *"Do not change the emblem's colours."*

**Decision:** the root-cause fix is to bind the asset's fills to tokens rather than correct three literals — an SVG carrying hardcoded hex will drift again. Tracked as the first task of the component slice, alongside ADR-0005's still-unbuilt Brand Pattern component. *(Both copies — `docs/design-system/brand-assets/` and `apps/dashboard/public/brand/` — carry the same drift.)*

---

## 9. Decision D8 — Corrections to the documentation itself

Found by measurement while verifying the above. Each is a fact in an approved chapter that is wrong.

**D8.1 — Chapter 1 §Accessibility Considerations understates Federation Green.** It states *"Green 500 on white = 4.6:1."* The measured value for `#00843D` on `#FFFFFF` is **4.81:1**. The error is pessimistic — it under-reports headroom, so it has never caused a failure — but a decision derived from 4.6 would be derived from a number this codebase can disprove. Red's published 5.9:1 is confirmed correct. Pinned by `contrast.spec.ts`.

**D8.2 — Chapter 1's logo-misuse list omits three of the guide's eight prohibitions.** The guide's §9.1 lists: stretching, repositioning the emblem, rotation, repositioning the text mark, changing the emblem's colours, adding a drop shadow, **outlining**, and changing the direction of the lines. The project's list carries five of these plus "framing" (which comes from §4.1). Missing: **outline**, **reposition the emblem**, **reposition the text mark**.

> The outline prohibition has a direct implementation consequence: whatever elevation and border system the register model introduces, **no border, ring, outline or shadow may ever be applied to the logo**. The guide prohibits both the shadow and the outline explicitly.

**D8.3 — The typographic weight hierarchy is four tiers in the guide and three in the system.** Guide §8.1 assigns four weights to four roles: **Black** → main headings · **Extra Bold** → subheadings · **Plain** → body · **Light** → *secondary text*. The system's ladder is `regular / medium / bold / black`; it has no Light, and `04-Typography.md` §4.4 sets Body, Body Small and Caption all to **Regular** — so secondary text carries the same weight as body text and the guide's fourth tier is absent. `medium` (500) has no counterpart in the guide.

**Decision:** recorded as a gap, **not closed in this ADR.** Alexandria is a different typeface from The Sans Arabic by ADR-0007's accepted reasoning, and mapping a weight ladder across typefaces is a typographic judgement, not an arithmetic one — a 300 weight in Alexandria is not the same optical colour as Light in The Sans Arabic. It needs a rendered specimen at real sizes in both scripts before a value is chosen. Tracked as the typography slice.

---

## 10. Open item — logo clear space is unquantified upstream

Guide §4.1 defines the safe area **graphically**, with Safe Area boxes on all four sides of both lockups, and states one number: minimum width 20mm, below which the wordmark is dropped. It gives no ratio or x-height formula.

The design system reproduces exactly this: the concept is defined (`§Definitions`, `26-Glossary.md`), compliance is a stated success metric, and **no numeric value exists anywhere.**

This is the one item in this review that cannot be closed by measurement from the materials available: deriving the ratio needs the guide's vector source, not its rendered pages. **Classified `DESIGN DECISION REQUIRED` — Product Owner action:** supply the source artwork, or approve a derived module (e.g. the emblem's stroke width, or the wordmark's cap height) as the clear-space unit. Inventing a number would be exactly the guess §24 of the root `CLAUDE.md` forbids.

---

## 11. Consequences

* `03-Design-Tokens.md` §3.34.1 is replaced by the register model. §3.34.2 (per-page personality) and §3.34.3 (the binding qualitative rule) are unaffected and still apply — §3.34.3 already names *"depth, motion"* among the approved sources of visual variation, which is the warrant the register and elevation work runs on.
* `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §5 and `UAEAF-VISUAL-GOVERNANCE-INDEX.md` §1 must drop the numeric ratio; they are currently the last two places asserting a rule superseded twice.
* Every screen's page ground changes from `#FFFFFF` to `#FAFAF8`, and cards become genuinely lighter than the page. This is a visible change to every existing screen and is intended.
* Two live rendering defects are closed (§6), and two classes of defect become failing tests rather than silent ones.
* The registers are **available**, not yet applied. Applying them to existing screens is the next slice; nothing in this ADR licenses a coloured section without the per-page context that D1 requires.

## 12. Registry

```text
DT-COLOR-020 · Section Registers (green/red/black) · Status: Active · v1.0 · Owner: Design System · References: [ADR-0059, Guide §6.1, §1.3/§2.3/§3.3] · Supersedes: §3.34.1 Functional Role table
DT-COLOR-021 · Register Adjacency Separator (MUST) · Status: Active · v1.0 · Owner: Design System · References: [ADR-0059] · Measured: green↔red = 1.15:1
DT-COLOR-022 · Verified Text Ladder · Status: Active · v2.0 · Owner: Design System · References: [ADR-0059] · Supersedes: DT-COLOR text tiers as set by ADR-0051
DT-GOVERNANCE-004 · Contextual Colour Assignment (replaces the numeric ratio outright) · Status: Active · v1.0 · Owner: Design System · References: [ADR-0059] · Supersedes: DT-GOVERNANCE-001/002/003
DT-MOTIF-001 · Ascent Angle 45° (measured 44.46°), direction-invariant under RTL · Status: Active · v1.0 · Owner: Design System · References: [ADR-0059 §8, ADR-0005] · Closes: ADR-0005 open mitigation
```

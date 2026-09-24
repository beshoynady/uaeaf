# ADR-0098: Brand UI Kit — Surfaces & Accents

| Field | Details |
| --- | --- |
| **Status** | Accepted — documentation phase only (Phase A). The token and library phases it authorises (B–F) are **not built by this ADR**. |
| **Authority** | Product Owner Decision, 2026-09-24. Recorded under Chapter 22 §4 and ADR-0056 §2 (document-first: the amendment is written before the change is implemented). |
| **Supersedes** | Nothing outright. **Amends:** Chapter 1 ADR-0005 and ADR-0038 · Chapter 3 §3.14 and §3.34.2 · Chapter 12 (new §12.15) · Chapter 27 §13, §20, §21, §24, §25, §28, §39, §40 and its Do & Don't · ADR-0059 D2 (one clause, on owner instruction) · ADR-0060 D1 (one table row) · ADR-0065 R2 and D2 · `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §5, §13, §18. |
| **Does not amend** | Chapter 6 in any part · WCAG 2.1 AA as the acceptance floor · `focus-visible` and `color.focus.*` (WCAG 1.4.11, ≥ 3:1) · Chapter 5 §5.8 `prefers-reduced-motion` and §5.9 no-layout-shift · **Chapter 3 §3.14's `ambient` restriction and its single authorised use** · ADR-0051's structural separation of `color.brand.secondary` from `color.error.*` · CSS logical properties · Chapter 1's Logo Misuse rules and the mirroring prohibition (both sourced from the federation's own guide) · PR-001 including its four-colour hero cap · ADR-0063's `color.text.link` · ADR-0088's two accent roles and their guard. |
| **Context** | The public site and the dashboard read as neutral and quiet. The federation's own published social output does not: it is colour-forward, and it is built from the same three identity colours the design system already holds. A review of the *UAEAF Visual Standard Guide 2023* against fifteen published posts produced an expressive layer the Product Owner has approved for build in both applications, and asked to be built **once**, as a shared UI library, rather than twice. The governing question this ADR answers is not "may the brand colours appear" — ADR-0059 D2 already settled that, and ADR-0060 D1 already assigns a register to each of twelve pages. It is narrower and harder: **what may carry identity colour when it carries no information**, which is the one thing ADR-0065 R2 forbids in a single sentence. |
| **Decision** | Eight decisions, D1–D8 below. In summary: (D1) a third colour category — *identity* — is added beside R1's role colour and D3's categorical colour, defined by what it may never do rather than by where it may appear; (D2) the five surfaces of the kit are mapped onto the registers and neutral grounds that already exist, and the five places where the approved token values conflict with a measured existing value are listed as **open owner decisions**, not resolved here; (D3) the tricolour accent is defined, its middle step bound to the surface, and direct green→red blending prohibited; (D4) the diagonal motif discharges ADR-0005's undelivered Chapter 8 component, with its angle fixed and never mirrored; (D5) one duration token is added — `orbit`, the scale's first cycle period — carrying two bounded rotation roles, while `ambient`'s restriction is left untouched; (D6) the two doses are named: Expressive for the public site, Operational for the dashboard, with a prohibition list for the second; (D7) the library is one internal workspace read by both applications, and no component in it takes a background-aware prop; (D8) every visual state this ADR creates is listed as PENDING FIGMA BACK-SYNC. |
| **Alternatives Considered** | **(A) The tricolour gradient across large areas** — rejected on measurement, not taste: a tricolour wash puts `#00843D` and `#C8102E` in one plane at 1.22:1 from each other (ADR-0059 D2), which is the adjacency defect that ADR made a mandatory token to prevent. Confined to a 2–4px edge the two colours never share a boundary a reader must resolve. **(B) Waving flag ribbons and grunge brush strokes** — rejected: they are generic (nothing in them is UAEAF's), they arrive as raster PNG where the rest of the system is SVG and tokenised, and Chapter 27 §23 already prohibits applied digital texture in the UI layer. The diagonal motif is the federation's one ownable device and already exists. **(C) Black-and-white photography as the default** — rejected: it contradicts the federation's actual published output, which is the evidence this whole layer is derived from. Retained as an opt-in campaign variant. **(D) Duplicating the components in each application** — rejected: the tricolour rule is conditional on surface, theme and direction; two copies of a conditional rule diverge, and the divergence is invisible until a reader sees black tricolour on a black ground. **(E) Leaving Chapter 27 §28 alone and building the surfaces anyway** — rejected: that is the silent-override failure mode ADR-0056 §2 exists to prevent. Chapter 27 is Draft, so overriding it costs nothing procedurally, which is exactly why doing it without a record would set the worse precedent. |
| **Why This Decision** | The system's existing colour discipline was written against one failure mode: colour standing in for information it does not carry. ADR-0065 R2 states it in one line, and it is right. But R2 was derived from two pages where colour was *pretending* — a four-step ladder on a contact form, six positional fills on a policies page — and a rule derived from pretence over-reaches when applied to a mark that pretends nothing. A 4px tricolour edge above a header does not claim to encode a category; it claims the page belongs to this federation. D1 draws that line where it can be enforced: identity colour may never be placed where an encoding colour is expected. That keeps R2 intact for every case it was written for. |
| **Risks** | **The line in D1 is a judgement, and judgements drift.** A future reader may read "identity colour" as a licence for any colour anywhere. **Mitigation:** D1 is written as three prohibitions, not as a permission, and D6 carries an explicit dashboard prohibition list. **Two rotating borders in one view read as an error state.** **Mitigation:** D5 caps continuous rotation at one per view and binds it to a live broadcast only. **The gradient surfaces break the measured text ladder.** A gradient's contrast is its lightest point, and two of the three approved gradients start at a `500` step that carries white text with no room for a second tier. **Mitigation:** D2 lists this as an open owner decision with the measurement, rather than adopting the values and discovering it in Phase B. **`surface-ink` held fixed across themes reverses a measured ADR-0059 decision.** **Mitigation:** D2.4 states the measured consequence (≈1.1:1 against the dark page ground) and makes a non-surface boundary cue mandatory wherever it is used. |
| **Consequences** | Twenty-four amendments across nine files, registered in §9 below. The document moves to **v1.1.0** (Chapter 22 §1: Minor — new governing content, no prior decision invalidated except the two clauses named in §9 with their reasons). Five token values in the approved Phase B specification are **blocked on owner decision** and listed in §8. Chapter 8 gains the Brand Pattern component ADR-0005 promised in 2026-08 and never delivered. |

---

## 1. D1 — Identity colour is a third category, defined by what it may not do

ADR-0065 D1 states two rules. Both stand:

> **R1. Colour appears where its role appears.**
> **R2. No colour for decoration.** If removing the colour loses no information, the colour is removed.

R2 disqualified two real defects: a four-step green ladder on a contact form where the steps meant nothing, and six positional fills on a policies page where the positions meant nothing. In both, colour was **pretending to encode**. A reader had to ask what the step meant, and there was no answer.

A 4px tricolour edge above the header asks nothing of a reader. It is not a category, a state, a rank or a measure, and nothing in the interface is drawn in the same colours at the same scale that *does* encode. Removing it loses no information — and that is precisely the point: it was never carrying any.

**Decision.** A third category is added beside R1's role colour and ADR-0065 D3's categorical colour:

> **R3. Identity colour.** Colour that encodes nothing, exists to state that the surface belongs to this federation, and is admissible only where all three of the following hold:
> 1. **It is not placed where an encoding colour is expected.** Never inside a chart, a legend, a tag, a status field, a badge, a rank, a chip, a table cell, or beside an element of the same shape that does encode.
> 2. **It carries no colour a reader must resolve alone.** Wherever identity colour appears, either all three identity colours appear together (the tricolour), or the surface itself is the colour. A single green or red mark placed for identity alone is a role colour by any reader's reading, and falls back under R1.
> 3. **It is bounded.** Edges, rules, rings and full surfaces. Never the area behind body text (that is the surface's job), never an area a reader will mistake for a fill that means something.

R2 is unchanged for every case it was written against: colour that pretends to encode is still removed. R3 does not license a green card fill, a coloured section heading or a panel tint — those were R2's own examples and they remain prohibited, because each of them is the shape a reader has learned to read for meaning.

**Consequence for ADR-0065 D2's role table.** The table's `Never` column for Federation Green reads *"Card fills, section headings, panel tints — anywhere without an action."* That clause is preserved in full. The tricolour accent is not a card fill, a section heading or a panel tint, and green never appears alone in it.

---

## 2. D2 — The five surfaces, and the five values that are not settled here

The kit needs five grounds. Four of them already exist, measured, in the token layer. The mapping is therefore a reuse decision, not a creation decision — Chapter 3 §3.17's rule that an existing token is preferred to a new one applies before anything else.

| Kit surface | Maps onto | Existing value | Status |
| --- | --- | --- | --- |
| `surface-canvas` | Neutral register / page ground (ADR-0059 D4) | light `#FAFAF8`, dark `#131210` | **Open — §8.1** (the approved value `#F4F4F4` is a cool grey) |
| `surface-photo-light` | New composite: photograph + scrim | — | New; the scrim follows Chapter 27 §22's measured-at-the-text rule |
| `surface-brand-green` | Green section register (ADR-0059 D2) | `green.700` `#005226` — white text 9.40:1, muted 6.49:1 | **Open — §8.2** (the approved gradient starts at `green.500`, 4.81:1) |
| `surface-brand-red` | Red section register (ADR-0059 D2) | `red.600` `#A00D25` — white text 8.14:1, muted 4.85:1 | **Open — §8.3** (the approved gradient starts at `red.500`, 5.88:1) |
| `surface-ink` | Black section register (ADR-0059 D2, D3) | light `#000000`, dark `neutral-warm.700` `#4A4942` | **Open — §8.4** (the approved value `#0B0B0B` is theme-invariant) |

**On-surface tokens.** Each surface publishes the same set at the element level, so no component needs to know which surface it is on: primary text, muted text, link, icon, border, `focus-ring` (a solid colour, never the gradient — WCAG 1.4.11, unchanged), the button variables, and `gradient-brand-tricolor` resolved per D3. The registers already carry `surface`, `text`, `text-muted`, `border` and `divider`; this decision adds `link`, `focus-ring`, the button variables and the tricolour to each.

**Mechanism.** The set is declared as CSS custom properties on the surface element itself, so a descendant resolves them through the cascade. **No component in the kit accepts a prop describing its background.** A prop of that shape is a second source of truth for a fact the cascade already holds, and it is wrong the moment a component is moved.

**The mesh layer.** An optional tint field above any surface: two radial gradients, one green and one red, in opposite corners, at low alpha. This is **not** a pattern within the meaning of Chapter 27 §25 — it has no repeating motif, no edges and no figure; it is a tint gradient on a ground, which is why §25's prohibition on a second *pattern language* is not engaged and is amended only for clarity (§9, A16). Its alpha bands are bounded by D3's table.

**The adjacency rule is inherited unchanged.** ADR-0059 D2's mandatory `color.section.adjacent-separator` between a green and a red section, implemented by `SectionStack` per ADR-0060 D1.1, applies to every composition built from this kit. The rhythm rule ("no two consecutive sections on the same surface") does **not** license green beside red: at 1.15:1 they have no boundary, and the separator is not optional.

---

## 3. D3 — The tricolour accent, and the prohibition at its centre

The accent is three stops, and its middle stop is a function of the surface it sits on — resolved once at the surface, never per component.

| Surface | Stop 1 | Stop 2 (middle) | Stop 3 | Basis |
| --- | --- | --- | --- | --- |
| Light grounds (`surface-canvas`, `surface-photo-light` light) | green | **black** | red | Chapter 1: the three identity colours |
| Dark grounds (`surface-ink`, every surface in dark theme) | green | **white** | red | Black has no boundary on a dark ground (ADR-0059 D2 measured pure black at 1.12:1 against the dark page). White is an identity colour of the flag |
| `surface-brand-green`, `surface-brand-red` | white | white | white | Guide §6.1: on a coloured ground the mark is monochrome. A tricolour on a red ground would put red on red |

**Stop positions.** Green 0–26%, middle 44–56%, red 74–100%. The bands are short deliberately: the blend regions are where two adjacent identity colours mix into a third colour that is in no guide.

**Direct green→red blending is prohibited.** Without the middle stop the ramp passes through a muddy brown that belongs to no part of the identity, and it puts the two colours of the 1.15:1 pair into one continuous field. The middle stop is not an aesthetic preference; it is the same separation ADR-0059 D2 made mandatory between sections, applied inside a gradient. **The guide never abuts them either — in the four-stroke motif there is always white or black between** (ADR-0059 D2, quoted).

**Gradient direction and RTL.** Gradient angle and `transform-origin` are not logical properties and do not follow `dir`. They are resolved **once, at system level, from `[dir]`** — never per component. The angle derives from `--motion-ascent-angle` (`45deg`, ADR-0060 D2, from a measured mean of 44.46°), not from a written-in `135deg`.

**Where a gradient carries text, contrast is measured at the gradient's lightest point.** This is the existing rule for scrims (Chapter 27 §22) applied to surfaces, and it is why §8.2 and §8.3 are open rather than decided.

---

## 4. D4 — The diagonal motif, and a 2026-08 consequence finally discharged

ADR-0005's Consequences row states: *"Chapter 8 includes this as a core 'Brand Pattern' component."* **It never did.** No `CMP-BRANDPATTERN-*` exists in any of the eight component chapters; the string appears nowhere in Chapter 8. The obligation has been open since the chapter was frozen.

**Decision.** The kit's `BrandStreaks` is that component: inline SVG, `aria-hidden`, three placements (`corner`, `behind-photo`, `cross-headline`), colour resolved from the surface per D3. It is registered in Chapter 8 L1, discharging ADR-0005.

**The angle is fixed and is never mirrored.** ADR-0005's *Why This Decision* row lists *"supports automatic RTL mirroring"* among SVG's benefits. Read as a licence it contradicts the federation's own guide §9.1 and the absolute mirroring prohibition in Protocol §9: the motif is derived from the logo's take-off angle, and a mirrored take-off angle is a mirrored identity mark. **Amended (§9, A4): the ascent angle is invariant under direction.** Placement follows `dir` through logical properties; the angle does not.

**Opacity.** ADR-0005 sets 5–10% for general use and full fill for heroes; Chapter 27 §24 caps the motif at 5% *"in any content-bearing area."* Both are preserved for the motif as a repeating background. The kit's placements are neither: they are bounded figures in specific positions, at most three per page, and `cross-headline` is a single crossing stroke, not a field. §24 is amended for that distinction only (§9, A15).

---

## 5. D5 — Two motion roles, and the one restriction that must move

`BrandBorder` needs rotation in two bounded cases. Neither fits the existing scale, and the reason is recorded rather than worked around.

Chapter 3 §3.14 caps the scale at seven durations and restricts the seventh:

> `ambient` is for **non-interactive, one-shot, decorative** motion on a background or ground plane. It MUST NOT be used for any state change, transition, entrance, or exit, and MUST NOT be applied to text, to a control, or to any element carrying content. […] Its one authorised use is the portrait hero's background settle (ADR-0069 D8). **A second use requires a new ADR.**

A rotating border fits none of the seven, and `ambient` is the wrong place to put it: a rotation loops rather than playing once, and it sits on an element that carries content — two of the three things that restriction exists to forbid. **`ambient`'s restriction is therefore left completely unamended, and its single authorised use stays single.**

The reason nothing on the scale fits is worth stating, because §3.14 demands it of any eighth value: **all seven existing durations are one-way durations** — the time to get from state A to state B. A revolution has no state B. It has a *period*. Using `fast` as a period would tie the speed of a loop to the speed of a hover, which is not a relationship either value has any reason to hold.

**Decision — one new token, two bounded roles.**

`motion.duration.orbit` is added as the scale's **eighth** value and its first cycle period. §3.14's cap moves from seven to eight, with the reason above recorded in place (§9, A7). Both roles below use it; neither uses `ambient`.

1. **Hover rotation.** Bounded by the pointer or by `focus-within`: it starts on entry and stops on exit, leaving the border static. **Permitted on the public site only** (D6).
2. **Live rotation.** Bounded by a live broadcast: it runs while the broadcast is live and stops when it ends. This is the one continuous motion in the system. What makes it admissible is that the interface does not choose when it stops — the motion ending *is* the information, which is the opposite of decoration.

**Caps.**
- **At most one continuously rotating border in any view.** Two read as an error condition.
- Live rotation appears only where a broadcast is live. It is not a decoration that outlives its subject.
- Under `prefers-reduced-motion: reduce` every rotation stops and **the border remains visible, static, at full strength.** The border is the affordance; the rotation is emphasis. Removing the motion must not remove the mark. Chapter 5 §5.8 is unchanged and is the authority.
- Rotation animates `transform` and the registered `--angle` custom property only. ADR-0009's `transform`/`opacity` rule and §5.9's no-layout-shift rule are unchanged.

**On the live role and the two existing live colours.** `color.semantic.live` (Federation Red, ADR-0038) and `color.accent.live` (`night-blue.500`, ADR-0088 D1, declared and used by nothing) both exist. The live border **names neither**: its meaning is carried by the rotation and by the mandatory text label ("مباشر"/"Live") that ADR-0038 §Accessibility and Chapter 6 §6.2 already require. ADR-0088 D5's guard — *"the live accent used by no source"* — therefore stays green, and no third live colour is created.

---

## 6. D6 — Two doses, and what the Operational dose may not have

Chapter 1 ADR-0001 builds two experience layers on shared tokens and closes with a prohibition: *"Do not impose one layer's decoration on the other."* Read literally, the sentence forbids this ADR. Read against its own Risks row — *"Public-site decoration may leak into the dashboard and slow task completion"* — it forbids something narrower and correct: **decoration that costs an operator time.**

**Decision.** The prohibition is amended (§9, A1) to name the two doses rather than to bar identity from the dashboard entirely.

| | **Expressive** — public site | **Operational** — dashboard |
| --- | --- | --- |
| Accent edge | 4px | 3px |
| Tricolour | Header edge, section headings, featured items, sidebar active item | Screen edge, page headings, sidebar active item |
| `BrandBorder` | `static`, `hover`, `live` | `static` and `live` only |
| Coloured surfaces | Per ADR-0060 D1 register assignment | Login screen only |
| Mesh | Permitted | Not under working content |

**Prohibited in the Operational dose, without exception:**
- `BrandBorder variant="hover"`. An operator's pointer crosses dozens of rows; motion under it is noise, and PR-001 prevails over PR-005 in conflict (Chapter 2, §Resolution).
- **Any coloured or photographic surface beneath a table, a form or an input.** This is not a new rule. Chapter 27 §20 already states it — *"Utility sections (results, directories, forms): flat token-driven surface colors only […] no photographic backgrounds where the content is data"* — and it is **preserved unamended** as the basis of this prohibition. The login screen is not an exception to it: the form sits in a neutral card, and the coloured ground is behind the card, not under the fields.
- Colour as the only cue for a selected item. `BrandBorder static` marking a selection carries a non-colour indicator beside it (a check mark or a label) and clears ≥ 3:1 against its surface — Chapter 6 §6.2 (WCAG 1.4.1) and §6.2 non-text contrast, both unamended.

---

## 7. D7 — One library, read by both applications

**Location.** An internal workspace, `packages/brand-ui`, with no external dependency. Linked by npm workspaces, `transpilePackages`, and Tailwind `content` paths. Motion is CSS; graphics are inline SVG. No animation library is introduced — Chapter 5's motion system is two CSS properties (ADR-0009), and a library would be a third source of timing beside the tokens and the stylesheet.

**Binding rules for every component in it:**
1. Server Component by default. `'use client'` only where real state or a real event handler exists. Hover and rotation are CSS.
2. No prop describing the background, the theme or the direction. All three are read from the cascade (D2).
3. No colour, gradient, duration or border width written inside a component. Tokens only.
4. `className` for position. Never for colour.
5. One entry point; complete types; `variant` / `tone` / `size` carry the same meaning in every component.
6. Empty data is **absent**, not rendered as a dash. A dash is a value a reader must interpret.

**The Brand Kit page** is the verification instrument, not a deliverable page: every component, every variant, on all five surfaces, in both themes and both directions. Internal route, `notFound()` in production, `noindex`, absent from the sitemap.

---

## 8. Open owner decisions — blocking Phase B

Each is a conflict between a value approved for this build and a value already measured in the token layer. None is resolved here, per Chapter 22 §4 and root `CLAUDE.md` §24.

**8.1 `surface-canvas` — `#F4F4F4` or the existing page ground?**
`#F4F4F4` is a neutral-cool grey. ADR-0051 replaced the cool `color.gray.*` curve with `color.neutral-warm.*`, and ADR-0065's audit recorded cool greys imported from elsewhere (`#E5E7EB`, `#D1D5DB`) as a defect for that reason. The role `surface-canvas` describes is already held by the page ground `#FAFAF8` (ADR-0059 D4), against which the whole text ladder was measured.
*Recommendation:* bind `surface-canvas` to the existing ground. It costs nothing and keeps one measured ladder instead of two.

**8.2 `surface-brand-green` — the gradient's light end.**
The approved gradient is `#00843D → #00502A`. Its lightest point is `green.500`, which carries white text at **4.81:1** — AA for normal text with 0.31 of headroom, and, in ADR-0059 D2's words, *"no room for a second tier."* The kit requires a muted text tier on every surface. On this gradient it cannot exist.
*Recommendation:* run the gradient `green.700 → green.900`-equivalent (`#005226 → #00502A`, the dark end already matches), preserving `text` at 9.40:1 and `text-muted` at 6.49:1. The `500` value keeps its role unchanged as the brand-mark reference (Chapter 1).

**8.3 `surface-brand-red` — the same, at the same point.**
`#C8102E → #7A0A1C`: lightest point `red.500`, white text **5.88:1**, muted tier does not fit under it.
*Recommendation:* `red.600 → #7A0A1C` (`#A00D25 → #7A0A1C`), preserving `text` at 8.14:1 and `text-muted` at 4.85:1.

**8.4 `surface-ink` — theme-invariant, against a measured decision.**
The approved specification fixes `surface-ink` at `#0B0B0B` in every theme. ADR-0059 D2 measured pure black against the dark page ground at **1.12:1** — *"no boundary at all"* — and for that reason made the black register the only one that changes with the theme, resolving to `neutral-warm.700` `#4A4942` in dark. Chapter 27 §20 additionally requires a dark ground to carry *"the subtlest hint of green in the deep shadow tone"*, which `#0B0B0B` does not.
Per root `CLAUDE.md` §1 an explicit current-task instruction outranks an ADR, so the owner's instruction governs — but the consequence is not optional: **held fixed, `surface-ink` has no visible boundary against the dark page ground, so wherever it is used its edge must come from something that is not the surface value** — the accent edge, a border, or an adjacent register. Recorded as the amendment in §9 (A27), with that mitigation mandatory.
*Owner decision required:* (a) fix at `#0B0B0B` with the mandatory edge cue, (b) keep ADR-0059 D2's theme-variance, or (c) fix it at a near-black that carries §20's green whisper.

**8.5 The green text link — already decided, no new value needed.**
The specification proposes ≈`#006B32` for green link text, noting `#00843D` measures ≈4.4:1 on a light ground. ADR-0063 reached the same conclusion and repointed `color.text.link` to `green.600` `#006B31` (light) and `green.300` (dark), measured at **6.38:1** on the page ground. The estimate and the existing token differ by one hex digit.
*Resolution:* use `color.text.link`. No token is created and no value is changed. **This item is closed, not open.**

---

## 9. Amendment register

Every row is an edit made by this ADR in this phase. "Before" is the text as it stood at v1.0.0.

| # | File | Section | Before | After | Reason |
| --- | --- | --- | --- | --- | --- |
| A1 | `00-01-Introduction-BrandIdentity.md` | ADR-0001 Do & Don't | "Do not impose one layer's decoration on the other" | Same, plus the two named doses and a pointer to D6 | The Risks row names the real harm (operator time), which D6's prohibition list addresses directly |
| A2 | `00-01-Introduction-BrandIdentity.md` | ADR-0038 Evaluation Matrix, "General accent element" | ❌ Rejected — "Purely decorative use is exactly what §Do & Don't forbids […] not solid red fills" | Rejected for **red alone**; the tricolour accent under D1 R3 is a separate case | The row was written against red placed alone as an accent. Red never appears alone in the tricolour |
| A3 | `00-01-Introduction-BrandIdentity.md` | ADR-0038 Repetition & Fatigue Rule | "No more than one red element […] per component instance"; "No more than one visibly red state per initial viewport" | Same, scoped to **semantic** red (`live`/`achievement`) | The cap protects red's signal value. An identity edge carries no signal to dilute |
| A4 | `00-01-Introduction-BrandIdentity.md` | ADR-0005 Why / Consequences | "supports automatic RTL mirroring"; "Chapter 8 includes this as a core 'Brand Pattern' component" | Angle invariant under direction; component delivered as `BrandStreaks` (D4) | Guide §9.1 and Protocol §9; the Chapter 8 obligation was never discharged |
| A5 | `00-01-Introduction-BrandIdentity.md` | ADR-0005 Decision | "5–10% opacity background layer for general use, full fill for Hero sections only" | Same, plus the bounded-figure placements of D4 | A bounded figure in a fixed position is not a repeating background |
| A7 | `03-Design-Tokens.md` | §3.14 Token Constraints, Motion Durations row | "7 values only (`instant/fast/base/slow/slower/entrance/ambient`)" | "8 values only", adding `orbit` as the scale's first **cycle period** | §3.14 requires an ADR stating what the existing values could not express: all seven are one-way durations, and a revolution has a period, not an end state. **`ambient`'s restriction and its single authorised use are unamended** |
| A9 | `03-Design-Tokens.md` | §3.34.2, Policies row | "White + Green only; Red virtually absent" | Green for regulations, red for policies as a category mark, one red CTA band | The page carries two real document categories; the colour is per category, per ADR-0065 D3 |
| A11 | `12-Dashboard-Patterns.md` | new §12.15 | — | The Operational dose and its prohibition list (D6) | The dashboard had no recorded identity rule at all |
| A12 | `27-Brand-Visual-Language.md` | §13 Motion Philosophy | "No decorative parallax, no gratuitous hover-bounce" | Same, with D5's two bounded rotations named as not within "gratuitous" | A rotation bounded by a live broadcast reveals that the broadcast is live |
| A13 | `27-Brand-Visual-Language.md` | §20 Background Treatment, bullet 1 | "never a flat color or gradient standing in for a photograph" | Scoped to hero-tier **photographic** compositions; an identity register is not a stand-in for a photograph. **Bullet 2 unamended** | Bullet 2 is the basis of D6's prohibition and is strengthened, not weakened |
| A14 | `27-Brand-Visual-Language.md` | §21 Color Grading, bullet 3 | "Desaturate everything except skin tones and the single Federation Green accent point per image" | Colour photography is the default; desaturation is an opt-in campaign treatment | Documented deviation: the federation's published output is colour-forward |
| A15 | `27-Brand-Visual-Language.md` | §24 Graphic Accent System | "Never used as a repeating background pattern at more than 5% opacity in any content-bearing area" | Same for a repeating pattern; bounded figures per D4 are a distinct case | The cap governs a field, not a figure |
| A16 | `27-Brand-Visual-Language.md` | §25 Pattern Language | "Beyond the diagonal motif, UAEAF has no secondary pattern system" | Same; the mesh tint is named as a ground tint, not a pattern | No motif, no repeat, no figure |
| A17 | `27-Brand-Visual-Language.md` | §28 Gradient Philosophy | "Gradients exist for exactly one purpose […] scrims for text legibility over photography" | Two purposes: scrims, and identity register grounds per D2 | The headline blocker. The guide's own §6.1 presupposes coloured grounds |
| A18 | `27-Brand-Visual-Language.md` | §39.2 | "no gratuitous gradient meshes" | Same; a bounded, tokenised mesh within D3's alpha bands is not gratuitous | The word doing the work is "gratuitous" |
| A19 | `27-Brand-Visual-Language.md` | §40.4 | "Federation Green appearing exactly once per composition, small and precise, never as a wash" | Applies to green as a **role** colour; register grounds are governed by ADR-0059 D2 and ADR-0060 D1 | Already partly resolved by ADR-0059 D2, which retired §3.34.1's wash prohibition |
| A20 | `27-Brand-Visual-Language.md` | Do & Don't | "use green as a background wash"; "introduce a second decorative pattern language" | Both retained, both scoped per A19 and A16 | Consistency with the sections above |
| A21 | `22-Governance.md` | §1 and ADR-0034 | `v1.0.0` | `v1.1.0` | Chapter 22 §1: Minor — added content, no prior decision invalidated except A27's named clause |
| A22 | `00-MASTER-INDEX.md` | Release statement + ADR pointer list | `v1.0.0` | `v1.1.0`; ADR-0098 registered | Chapter 22 §1 |
| A23 | `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` | §5, §13, §18 | 70–80/15–20/≤5 ratio; motion levels; "do NOT automatically default to a generic gradient" | Ratio marked superseded by ADR-0051 §3.35.1; D5's roles added; the governed mesh distinguished from a generic gradient | §5's ratio was already superseded and the protocol had not been updated — a pre-existing inconsistency, corrected here |
| A24 | `UAEAF-VISUAL-GOVERNANCE-INDEX.md` | §1, §7 | — | ADR-0098 rows | The index must point at the new authority |
| A25 | `ADR-0065` | D1 | R1 and R2 | R3 added (D1 above); R1 and R2 unchanged | Recorded at the source so a reader of R2 finds R3 |
| A26 | `ADR-0065` | D2 role table | Green "Never: Card fills, section headings, panel tints"; Red "Never: CTA buttons" | Both preserved verbatim; a footnote points to R3 | The prohibitions are correct and are not being relaxed |
| A27 | `ADR-0059` | D2, "Why black is the only register that changes with the theme" | Black register resolves to `neutral-warm.700` in dark | Owner instruction of 2026-09-24 fixes `surface-ink` across themes; the measurement and the mandatory mitigation are recorded beside it | Root `CLAUDE.md` §1: an explicit current-task instruction outranks an ADR. The measurement is not deleted |
| A28 | `ADR-0060` | D1 register table | Policies not listed among the twelve | Regulations & Policies added, green register, red per category | The page is being rebuilt in Phase F and had no register |

A6, A8 and A10 were investigated and are **not** amendments — see §10.

---

## 10. Examined and deliberately not amended

| Rule | Why it stands |
| --- | --- |
| **PR-001 anti-pattern: "More than four colours in a single Hero"** (Chapter 2) | `PageHero` uses exactly four: ink, green, red, white. The cap is binding and is met. It is also the ceiling on any future hero in this kit |
| **PR-001 prevails over PR-005** (Chapter 2 §Resolution) | This is the authority for D6's prohibition on hover rotation in the dashboard |
| **Chapter 3 §3.34.1's wash prohibition** | **Already retired** by ADR-0059 D2, which replaced the table with the register model. No amendment needed; the cross-reference is added |
| **Chapter 3 §3.34.3's binding qualitative rule** | Unchanged and cited: the identity must not be applied in the same way or proportion on every page. It is the authority for the rhythm rule, not an obstacle to it |
| **Chapter 27 §20 bullet 2** (flat token surfaces under data) | Preserved and promoted: it is the source of D6's strongest prohibition |
| **Chapter 27 §22** (text over image measured at 4.5:1 inside a cinematic composition) | Preserved; extended by analogy to gradients in D3 |
| **Chapter 27 §23** (no grunge, noise or paper texture in the UI layer) | Preserved. It is the recorded basis for rejecting alternative (B) |
| **Chapter 5 §5.8, §5.9, ADR-0009** | Untouched. D5 operates inside them |
| **Chapter 6 in every part** | Untouched |
| **ADR-0051's separation of `brand.secondary` from `error.*`** | Untouched and structural |
| **ADR-0063's `color.text.link`** | Untouched, and it closes §8.5 |
| **ADR-0088 D1, D2, D5** | Untouched. D5 explains why the guard stays green |
| **Chapter 1 Logo Misuse and the mirroring prohibition** | Untouched — sourced from the federation's own guide, not from this project |
| **Chapter 8 L3 §Active Route / `aria-current="page"`** | Untouched. The tricolour sidebar indicator replaces a solid colour, not the ARIA state |

---

## 11. PENDING FIGMA BACK-SYNC

Figma is read-only for this project at present (subscription lapsed). Every visual state below is created by this ADR and has **no corresponding Figma frame**. None is to be drawn until the owner confirms write access is restored.

1. The five surfaces as frame styles, in both themes.
2. The tricolour accent in its three surface resolutions (black middle / white middle / mono-white).
3. `BrandStreaks` in three placements, in both directions, with the angle held.
4. `BrandBorder` — 3 variants × 3 tones × 2 shapes, at rest and in motion (Figma cannot execute the rotation; the still frames are the deliverable).
5. `Button` secondary at rest and filled; `FilterChip` selected and unselected; `SearchField` with and without text.
6. `SectionHeading`, `PageHero`, `DocumentCard` (standard and featured), `LinkTile`, `CtaBand`, `EmptyState`, `StatHighlight`, `AthleteResultBadge`.
7. The sidebar active item as a tricolour edge, expanded and collapsed.
8. The dashboard login screen.
9. The Regulations & Policies page, desktop and mobile, AR and EN.

**Figma cannot execute live motion.** Every rotation, draw and fill in this ADR exists as a specification and as CSS, never as a Figma prototype — Protocol §13 requires that limitation be stated every time, and it is stated here.

---

## Related Governance

- `22-Governance.md` §1, §4 (ADR-0034) — the versioning and change process this ADR follows; §1 is amended by A21 for the version number only.
- `ADR-0056-Design-System-Compliance-And-Document-First-Amendment-Process.md` §2 — the document-first rule this ADR exists to satisfy: the amendment is recorded before Phase B touches a token.
- `ADR-0059-Brand-Guide-Conformance-And-Colour-Registers.md` D2, D3, D4 — the registers, the adjacency rule, the measured text ladder, and the black-register theme decision amended by A27.
- `ADR-0060-Public-Site-Registers-Motion-And-SEO.md` D1, D1.1, D2 — register assignment, the separator component, and `--motion-ascent-angle`.
- `ADR-0065-Colour-Roles-Categorical-Encoding-And-Interaction.md` D1, D2, D3 — R1/R2, the role table, and categorical encoding. R3 is added to D1 by A25.
- `ADR-0088-Two-Accent-Roles-The-Live-Accent-And-The-Track-Mark.md` D1, D5 — the two live-adjacent colours this ADR does not use, and the guard that stays green.
- `ADR-0063-Semantic-Link-Colour-And-Footer-Quick-Links-Balance.md` — `color.text.link`, which closes §8.5.
- `ADR-0051` (Chapter 3 §3.35) — the five-layer architecture, `neutral-warm`, and the supersession of the numeric ratio that A23 finally propagates into the protocol.
- `ADR-0005` (Chapter 1) — the motif, amended by A4/A5 and discharged by D4.
- `ADR-0038` (Chapter 1) — Federation Red's functional roles, amended by A2/A3.
- `02-Design-Principles.md` PR-001, PR-005 — the clarity cap and the conflict resolution D6 relies on.
- `27-Brand-Visual-Language.md` — Draft chapter; amended by A12–A20 so that it does not contradict this ADR if and when it is approved. Its Draft status is unchanged by those amendments.
- `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md`, `UAEAF-DESIGN-CRITIQUE-JURY-PROTOCOL.md` — both read before this ADR was written, per root `CLAUDE.md` §22.

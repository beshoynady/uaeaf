# ADR-0098: Brand UI Kit — Surfaces & Accents

| Field | Details |
| --- | --- |
| **Status** | Accepted. Phase A (this record and its amendments) landed 2026-09-24. **§8 settled the same day by Product Owner decision**, unblocking Phases B–F, which are built against this ADR rather than by it. |
| **Authority** | Product Owner Decision, 2026-09-24. Recorded under Chapter 22 §4 and ADR-0056 §2 (document-first: the amendment is written before the change is implemented). |
| **Supersedes** | Nothing outright. **Amends:** Chapter 1 ADR-0005 and ADR-0038 · Chapter 3 §3.14 and §3.34.2 · Chapter 12 (new §12.15) · Chapter 27 §13, §20, §21, §24, §25, §28, §39, §40 and its Do & Don't · ADR-0059 D2 (one clause, on owner instruction) · ADR-0060 D1 (one table row) · ADR-0065 R2 and D2 · `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §5, §13, §18. |
| **Does not amend** | Chapter 6 in any part · WCAG 2.1 AA as the acceptance floor · `focus-visible` and `color.focus.*` (WCAG 1.4.11, ≥ 3:1) · Chapter 5 §5.8 `prefers-reduced-motion` and §5.9 no-layout-shift · **Chapter 3 §3.14's `ambient` restriction and its single authorised use** · ADR-0051's structural separation of `color.brand.secondary` from `color.error.*` · CSS logical properties · Chapter 1's Logo Misuse rules and the mirroring prohibition (both sourced from the federation's own guide) · PR-001 including its four-colour hero cap · ADR-0063's `color.text.link` · ADR-0088's two accent roles and their guard. |
| **Context** | The public site and the dashboard read as neutral and quiet. The federation's own published social output does not: it is colour-forward, and it is built from the same three identity colours the design system already holds. A review of the *UAEAF Visual Standard Guide 2023* against fifteen published posts produced an expressive layer the Product Owner has approved for build in both applications, and asked to be built **once**, as a shared UI library, rather than twice. The governing question this ADR answers is not "may the brand colours appear" — ADR-0059 D2 already settled that, and ADR-0060 D1 already assigns a register to each of twelve pages. It is narrower and harder: **what may carry identity colour when it carries no information**, which is the one thing ADR-0065 R2 forbids in a single sentence. |
| **Decision** | Eight decisions, D1–D8 below. In summary: (D1) a third colour category — *identity* — is added beside R1's role colour and D3's categorical colour, defined by what it may never do rather than by where it may appear; (D2) the five surfaces of the kit are mapped onto the registers and neutral grounds that already exist, and the five places where the approved token values conflicted with a measured existing value are settled in §8, three of them enforced by a test rather than by prose; (D3) the tricolour accent is defined, its middle step bound to the surface, and direct green→red blending prohibited; (D4) the diagonal motif discharges ADR-0005's undelivered Chapter 8 component, with its angle fixed and never mirrored; (D5) one duration token is added — `orbit`, the scale's first cycle period — carrying two bounded rotation roles, while `ambient`'s restriction is left untouched; (D6) the two doses are named: Expressive for the public site, Operational for the dashboard, with a prohibition list for the second; (D7) the library is one internal workspace read by both applications, and no component in it takes a background-aware prop; (D8) every visual state this ADR creates is listed as PENDING FIGMA BACK-SYNC. |
| **Alternatives Considered** | **(A) The tricolour gradient across large areas** — rejected on measurement, not taste: a tricolour wash puts `#00843D` and `#C8102E` in one plane at 1.22:1 from each other (ADR-0059 D2), which is the adjacency defect that ADR made a mandatory token to prevent. Confined to a 2–4px edge the two colours never share a boundary a reader must resolve. **(B) Waving flag ribbons and grunge brush strokes** — rejected: they are generic (nothing in them is UAEAF's), they arrive as raster PNG where the rest of the system is SVG and tokenised, and Chapter 27 §23 already prohibits applied digital texture in the UI layer. The diagonal motif is the federation's one ownable device and already exists. **(C) Black-and-white photography as the default** — rejected: it contradicts the federation's actual published output, which is the evidence this whole layer is derived from. Retained as an opt-in campaign variant. **(D) Duplicating the components in each application** — rejected: the tricolour rule is conditional on surface, theme and direction; two copies of a conditional rule diverge, and the divergence is invisible until a reader sees black tricolour on a black ground. **(E) Leaving Chapter 27 §28 alone and building the surfaces anyway** — rejected: that is the silent-override failure mode ADR-0056 §2 exists to prevent. Chapter 27 is Draft, so overriding it costs nothing procedurally, which is exactly why doing it without a record would set the worse precedent. |
| **Why This Decision** | The system's existing colour discipline was written against one failure mode: colour standing in for information it does not carry. ADR-0065 R2 states it in one line, and it is right. But R2 was derived from two pages where colour was *pretending* — a four-step ladder on a contact form, six positional fills on a policies page — and a rule derived from pretence over-reaches when applied to a mark that pretends nothing. A 4px tricolour edge above a header does not claim to encode a category; it claims the page belongs to this federation. D1 draws that line where it can be enforced: identity colour may never be placed where an encoding colour is expected. That keeps R2 intact for every case it was written for. |
| **Risks** | **The line in D1 is a judgement, and judgements drift.** A future reader may read "identity colour" as a licence for any colour anywhere. **Mitigation:** D1 is written as three prohibitions, not as a permission, and D6 carries an explicit dashboard prohibition list. **Two rotating borders in one view read as an error state.** **Mitigation:** D5 caps continuous rotation at one per view and binds it to a live broadcast only. **The gradient surfaces break the measured text ladder.** A gradient's contrast is its lightest point, and two of the three approved gradients start at a `500` step that carries white text with no room for a second tier. **Mitigation:** §8.2 keeps the official colours and gives up the second tier instead — one text tier, pure white, hierarchy by size and weight — with a guard that fails if a muted tier or an alpha channel appears on either surface. **`surface-ink` held fixed across themes reverses a measured ADR-0059 decision.** **Mitigation:** §8.4 states the measured consequence (**1.05:1** against the dark page ground) and makes a non-surface boundary cue — an accent bar or a mesh — mandatory, enforced by a guard rather than by this sentence. |
| **Consequences** | Twenty-four amendments across nine files, registered in §9 below. The document moves to **v1.1.0** (Chapter 22 §1: Minor — new governing content, no prior decision invalidated except the two clauses named in §9 with their reasons). The five token conflicts §8 opened are settled there, and **no new colour value enters the green or red ramp** — the dark ends the specification named resolve to steps that already exist. One new primitive is added (`color.ink.500` `#0B0B0B`) and one new duration (`motion.duration.orbit`). Chapter 8 gains the Brand Pattern component ADR-0005 promised in 2026-08 and never delivered. |

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

## 4. D4 — The diagonal motif and its placements

ADR-0005's Consequences row states: *"Chapter 8 includes this as a core 'Brand Pattern' component."* No `CMP-BRANDPATTERN-*` exists in any of the eight component chapters, so the **documentation** obligation is still open.

> **Corrected 2026-09-24, after review.** An earlier draft of this section said the component "never existed" and claimed `BrandStreaks` discharged ADR-0005. **That was wrong**, and the error is recorded rather than quietly edited out: `apps/web/src/components/brand/uaeaf-motif.tsx` — `UaeafMotif` — already exists, already describes itself as "ADR-0005's Brand Pattern component, built at last", already carries a `tone="inherit"` mode for coloured grounds, and already states the never-mirror rule this ADR "discovered". It was built before this work began.
>
> So there are now **two** artworks claiming to be the brand pattern: `UaeafMotif`'s real four strokes with token-bound fills, and `BrandStreaks`'s stretched lines. That is one more than the system may have, and it is a defect this ADR introduced.
>
> **Resolution, recorded as the next action rather than done here:** move `UaeafMotif` into `packages/brand-ui`, and reduce `BrandStreaks` to what it actually adds — placement (`corner`, `behind-photo`, `cross-headline`) and surface-resolved colour — rendering `UaeafMotif`'s geometry inside it. One artwork, one angle, one component. Deferred because `UaeafMotif` is consumed by built pages and moving it is a change to working code that belongs in its own pass.

**Decision.** `BrandStreaks` provides the **placement layer**: inline SVG, `aria-hidden`, three placements, colour resolved from the surface per D3. Its geometry is to be replaced by `UaeafMotif`'s per the note above.

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

## 8. Settled owner decisions (2026-09-24)

These five were opened by the documentation phase as conflicts between a value approved for this build and a value already measured in the token layer. **All five are now SETTLED by Product Owner decision of 2026-09-24** and are recorded here as final. Three of them are enforced by a test rather than by this paragraph, because a rule that lives only in a document is a rule a future reader can miss.

### 8.1 `surface-canvas` — SETTLED: bind to the existing page ground

**Decision.** `surface-canvas` resolves to the page ground that already exists — `color.surface.base`, which is `neutral-warm.50` `#FAFAF8` in light and `neutral-warm.950` `#131210` in dark. **No cool grey is introduced**, and `#F4F4F4` is not adopted.

**If cards do not separate from the ground.** Step to the next warm step on the same ramp (`neutral-warm.100` `#F5F4F1`, which is already `color.surface.sunken`) — never to `#F4F4F4`. The ramp is warm by ADR-0051's architecture, and a cool grey imported into it is the defect ADR-0065's audit recorded twice (`#E5E7EB`, `#D1D5DB`).

**Why this is the right outcome.** The whole text ladder was measured against `#FAFAF8` (ADR-0059 D4). Binding to it keeps one measured ladder instead of creating a second one that nobody has checked.

### 8.2 `surface-brand-green` and `surface-brand-red` — SETTLED: start at the official colours, white text only

**Decision.** The gradients start at the identity values exactly as the guide publishes them:

| Surface | Light end | Dark end | Lightest-point contrast, white text |
| --- | --- | --- | --- |
| `surface-brand-green` | `green.500` `#00843D` — Pantone 348C | `green.700` `#005226` | **4.81:1** — AA for normal text |
| `surface-brand-red` | `red.500` `#C8102E` — Pantone 186C | `red.700` `#7A0A1A` | **5.88:1** — AA for normal text |

**No new colour value is added to either ramp.** The dark ends the original specification named (`#00502A`, `#7A0A1C`) sit within four and two units respectively of existing scale steps, so both resolve to steps that already exist and are already measured.

**One text tier, and it is pure white.** On these two surfaces `text` and `text-muted` both resolve to `color.white`. Hierarchy is carried by size and weight, never by colour or opacity. **Translucent text and light-grey text are prohibited on them.**

**Why.** A gradient's contrast is its lightest point. At `green.500` white text measures 4.81:1 — 0.31 above the AA floor, which is one tier's worth of headroom and no more. ADR-0059 D2 chose `green.700` for the flat register for exactly this reason. The owner's decision keeps the official colour and gives up the second tier instead, which is the trade the guide's own §5.1 favours: the identity value is the identity value.

**Guard:** `brand-surface-contract.spec.ts` fails if `text-muted` on either surface resolves to anything but pure white, or if any `text-*` token on them carries an alpha channel.

**Relationship to the flat registers.** `color.section.green.*` and `color.section.red.*` (ADR-0059 D2, flat, two tiers) are **unchanged and remain in use** for the page-level register bands ADR-0060 D1 assigns. The kit's two gradient surfaces are the expressive variant, used for component grounds — a CTA band, a link-tile section, the login screen. Both are governed, both obey the adjacency rule, and neither replaces the other.

### 8.3 — folded into 8.2 above

Recorded separately when the two were open; they were settled by one decision and are documented together.

### 8.4 `surface-ink` — SETTLED: `#0B0B0B`, fixed in every theme, never without an edge

**Decision.** `surface-ink` is `#0B0B0B` in light, dark and high-contrast alike. It is a **new primitive** (`color.ink.500`) — the ramp holds `color.black` `#000000` and `neutral-warm.950` `#131210`, and neither is this value.

**The mandatory edge.** ADR-0059 D2's measurement stands: a near-black ground has effectively no boundary against a near-black page. `#0B0B0B` against the dark page ground `#131210` measures **1.05:1**. Therefore **every `Surface kind="ink"` MUST carry one of two non-surface boundary cues**, and neither is optional:

1. a `BrandAccentBar` — whose middle step is white on this ground, so the edge is visible in every theme; or
2. a mesh tint, whose green and red radial fields give the ground a perceivable extent.

**Guard:** `brand-surface-contract.spec.ts` fails if any source renders `<Surface kind="ink">` without `mesh` and without an accent bar as its first child.

**Chapter 27 §20's green whisper does not apply to `surface-ink`.** §20 asks a dark *photographic* section to carry a hint of green in its shadow tone, which is a grading instruction for a photograph. `surface-ink` is a flat identity ground with no photograph in it, and the colour that gives it its extent is the accent edge and the mesh, not a tint inside the black. Recorded so a future reader does not read the two as contradicting.

### 8.5 Green link text — SETTLED: closed, use the existing token

Links use `color.text.link`, which ADR-0063 already repointed to `green.600` `#006B31` in light and `green.300` in dark, measured at 6.38:1 on the page ground. **No token is created and no value changes.** The estimate the specification carried (`#006B32`) and the token differ by one hex digit.

### 8.6 The adjacency correction on the policies page — SETTLED

The original page composition put the green "Governance & Strategy" section directly above the red "Didn't find it?" band. Those two grounds measure **1.15:1** from each other (ADR-0059 D2): stacked full-bleed they are one band with no boundary anywhere in it.

**Decision.** On that page the `CtaBand` is a **red card inside `surface-canvas`**, inset on all four sides, not a full-bleed section. The canvas gutter is the separator, and it is wider than the `--space-2` minimum `SectionStack` would insert.

**Recorded as an approved deviation from the reference design**, and generalised: **green and red never abut anywhere, in either application, without a separator.** Where both are full-bleed sections, `color.section.adjacent-separator` is mandatory (ADR-0059 D2, unchanged). Where one can be inset instead, insetting is preferred, because a gutter is a boundary a reader sees rather than a hairline they must find.

**Guard:** `surface-adjacency-contract.spec.ts` reads page sources for a green surface immediately followed by a red one, and fails on the pair. Where a composition is assembled at runtime and the guard cannot see it, the rule is a review item recorded here — the guard's own coverage note says which pages it can and cannot see.

## 8b. Amended during the build (2026-09-24)

Three things this record got wrong, found by building the Brand Kit page and measuring it in a browser rather than by review. All three were silent: the page rendered, nothing threw, and the defect was visible only on some surfaces.

### 8b.1 A sixth ground — `raised`

D2 named five surfaces. A card body inside a coloured section is a **sixth**: it paints its own neutral plate, and everything inside it reads the on-surface variables. Without a ground of its own, a `DocumentCard` on `brand-red` painted its body white while `--surface-text` still resolved to the section's white — so the card's title, links and secondary button were white ink on a white plate. Measured on the Brand Kit page: the "View document" button was an empty outline on three surfaces and correct on two.

`raised` is added to the set, bound to `color.surface.raised`. It is **not an expressive ground**: no section chooses it, it does not appear in the §5-D usage matrix, and the rhythm and adjacency rules do not apply to it. Components use it internally — `DocumentCard`'s body and `SearchField`'s control both declare it, which is also how Chapter 27 §20's "a field never sits on a coloured ground" is satisfied structurally rather than by remembering.

The alternative — re-declaring eleven variables in every component that paints a plate — is the duplication the surface mechanism exists to remove, and it would have been wrong in a different place each time someone forgot one.

### 8b.2 The border technique is a masked band, not `padding-box`/`border-box`

The specification named `padding-box` + `border-box` and excluded `border-image`. The exclusion stands and its reason is unchanged: `border-image` ignores `border-radius` entirely.

**The named technique does not work here.** It paints two background layers and therefore needs an *opaque interior*, which it takes from the surface. That is fine on `canvas`, `raised` and `ink`, where the ground is a colour — and it fails on the two brand surfaces, where the ground is itself a gradient: `linear-gradient(<gradient>, <gradient>)` is invalid, the whole `background-image` is dropped, and the border vanishes. It also cannot ring a photograph, which is the one job `shape="circle"` exists for.

**Adopted instead:** one shared `.brand-ring` utility — a pseudo-element painted with the gradient and masked with `mask-composite: exclude` so only the band survives. It keeps `border-radius`, leaves the interior transparent, and needs to know nothing about the ground. `BrandBorder`, the secondary `Button`, `FilterChip` and `SearchField` all consume it, so there is one implementation of the band rather than four.

### 8b.3 A build-tool constraint worth recording

**Lightning CSS deletes `--x: conic-gradient(...)`.** Not a warning, not a mangled value — the declaration is absent from the served stylesheet, `var(--x)` resolves to nothing, and the property that used it becomes invalid. A `linear-gradient` in the same position survives, which is what makes it easy to walk past.

Measured against the running dev server: three `conic-gradient` declarations in source, zero in the CSS the browser received. The same gradient written directly into a real property survives untouched, `from var(--brand-border-angle)` included. So conic gradients go in a real property, never in a custom property, and `brand-surface-contract.spec.ts` fails if one reappears in a custom property.

A related scoping rule found the same way: a custom property containing `var()` is substituted **on the element that declares it**, and descendants inherit the result. `--brand-tricolor` declared only on `:root` resolved `var(--surface-tricolor-mid)` where no surface had set it, became guaranteed-invalid, and inherited as invalid into every surface — so every accent bar, divider and border rendered at the right size, in the right place, painted with nothing. It is now declared on `:root` **and** on `[data-surface]`, so each ground re-substitutes it with its own middle step.

---

## 8c. The video exemption is cancelled (owner decision, 2026-09-24)

### What is cancelled

`apps/web/src/styles/video-system.css` opens by recording that **"the owner took this section and its pages out of the design system's colour rules by decision on 2026-09-23, without an ADR."** That grant is **withdrawn**, one day later, by the same authority.

**Scope of the cancellation:** the homepage video section, the public video pages, and the dashboard's video and broadcast screens. All of them come under this ADR in full — the same surfaces, the same tokens, the same components, the same usage matrix. The §5-D matrix row stands as written: `surface-ink` with its mandatory edge cue, `BrandBorder variant="hover"` on the video cards, and `BrandBorder variant="live"` on the broadcast card **while the broadcast is live and only then**.

**Everything the video system holds privately is removed, not aliased permanently:** the `--vs-*` palette, its three bespoke surfaces, its bespoke radii, and any other rule that exists for this one section. The conversion runs in three steps — central aliasing, component application, then deletion of the private layer — so that the section changes once and visibly rather than drifting across a dozen files.

**Why.** A design system with one exempt region is not a design system; it is a default. The exemption was granted under build pressure and lasted a day, and the cost of keeping it is permanent: every future reader has to learn which parts of the site the rules apply to. The federation's own guide does not have a video chapter with different colours in it.

### The green that may sit on ink

The official green is not a text colour on this ground, and the measurement is the reason rather than the decoration:

| Step | Value | On `surface-ink` `#0B0B0B` | Verdict |
| --- | --- | --- | --- |
| `green.500` — the identity value | `#00843D` | **4.09:1** | **Fails text.** Passes WCAG 1.4.11 for a non-text mark |
| `green.400` | `#1A9448` | 5.04:1 | Passes, with little headroom |
| **`green.300`** | **`#3DAD65`** | **6.90:1** | **Adopted** |

**Decision.** Text, links, figures and emphasis on `surface-ink` take **`green.300`**. That is not a new value and not a new decision either: ADR-0063 already repointed `color.text.link` to `green.300` in dark theme for the same reason, so the ink ground inherits an answer the system had already reached. **No new colour enters the ramp.**

`#2BD46E` — the value `--vs-green` holds today — is **rejected**. It measures 10.07:1 and would pass; it is out of the identity ramp entirely, which is the whole objection. A colour that is not in the palette is not made acceptable by being legible.

The identity green keeps its non-text roles on this ground: button fills, borders, rules and marks, all at ≥ 3:1.

### The live red

`--vs-live` `#D11A27` is replaced by **`color.semantic.live`** — the token ADR-0038 created for exactly this state, and which ADR-0051 §3.35.1 confirmed still resolves through `color.brand.secondary`.

It is **not** `color.brand.secondary` directly (that is the identity colour, not the state) and **not** `color.error.*` (ADR-0051 made that separation structural and this ADR does not touch it).

Measured on ink, `color.semantic.live` is `#C8102E` at **3.35:1** — which clears WCAG 1.4.11 for the dot and the edge, and does not clear 4.5:1 for text. That is not a gap: ADR-0038's own accessibility clause already requires the live state to carry the word "مباشر"/"Live" beside the mark, never colour alone (Chapter 6 §6.2, WCAG 1.4.1). **The mark is red; the word is white.**

### Why the four failing guards are left failing

`motion-contract` (two rules), `seo-contract` (the page-heading rule) and `token-contract` (one rule) fail today on `video-system.css` and `video/library-screen.tsx`. **They are correct.** They are catching colours, durations and a heading that sit outside the system, and the conversion above is what fixes them.

Neither guard is weakened, and no allowlist is added. A guard that is taught to ignore the thing it was written to catch has been deleted with extra steps. They stay red, and they go green by the code changing.

---

---

## 8d. Phase H: the ink surface's missing tiers, and one conflict

Phase H re-skinned every route against this kit. Doing so exercised the ink
surface far harder than Phases B–F had, and three things it did not publish
turned out to be things the design needed. All three are recorded here as
decisions, each with the measurement that settled it.

### D8d.1 — `color.brand-surface.ink.accent` (the green ink tier)

**Decision.** The ink surface publishes `--surface-accent`, bound to
`green.300` in the light and dark lists and to white in high contrast, which
carries no hue on this ground.

**Why.** `video-card.tsx` carried this comment before Phase H:

> The kit's green is a button plate, not an ink: on this ground it measures
> 4.09:1, which is a fine boundary and not readable text. … DESIGN SYSTEM GAP,
> in the backlog: ink publishes no accent ink.

Measured against `#0B0B0B`: `green.500` is 4.09:1 — the comment was right —
and `green.300` is **6.90:1**, clear of the 4.5 floor with a tier to spare.
The owner's Phase H instruction named `green.300`, and the measurement agrees
with it.

**How it is read.** Always as `var(--surface-accent, var(--surface-text))`.
No other surface publishes one, so the fallback is each surface's own measured
ink. `green.300` is measured against `#0B0B0B` and against nothing else, and a
variable that resolved to an unmeasured green on a light ground would be worse
than one that resolves to nothing.

### D8d.2 — `raised` and `raised-strong` on ink

**Decision.** The ink surface publishes `--surface-raised` (`#1A1A1A`) and
`--surface-raised-strong` (`#232323`).

**Why.** `video-system.css` mixed those two values inline in five places, under
a comment recording that the kit had no raised-on-ink token. It has one now.
The values are unchanged — white at 6% and 10% over `#0B0B0B`, resolved once.

All three ink tiers clear AA on both steps: 17.40 / 11.60 / 6.10 on `raised`,
and 15.72 / 10.47 / 5.51 on `raised-strong`.

**The constraint that travels with them.** Both measure ~1.2:1 against the ink
ground itself (1.13 and 1.25). **Neither is ever a boundary.** A card that uses
one takes its edge from `--surface-border` (6.44:1) — in practice a kit control
or a `BrandBorder`. This is why D6's two-dose rule and the ink edge cue are not
separable on this surface: without an edge, an ink card has no shape at all.

### D8d.3 — the broadcast colour: CONFLICT, not resolved

**The instruction.** Phase H requires broadcast red to stop consuming
Federation Red and bind to the live token instead. The reasoning is right:
ADR-0038 reserves red, and ADR-0088 D1 created `accent.live` naming "a live
mark" as its first example.

**Why it is not implemented.** `pairings.json` already records, and this phase
re-measured, that `accent.live` cannot be drawn on this ground:

| | on ink `#0B0B0B` | white on it |
|---|---|---|
| `accent.live` light / high contrast `#333CE0` | **2.68:1** | 7.33:1 |
| `accent.live` dark `#6783FE` | 5.86:1 | **3.36:1** |
| Federation Red `#E4002B` (current) | 4.06:1 | 4.85:1 |

`pairings.json` states it plainly: *"It is not a partner of the coloured
registers: on the green, red and black bands it measures 1.11 to 2.86:1 and is
not drawn there."* The video system paints on ink.

So the swap fails in two of three themes for the live frame (2.68:1, below even
the 3:1 non-text floor) and in the dark theme for the live badge's caption text
(3.36:1, below 4.5). The colour it would replace passes in all three.

**Status: BLOCKED — owner decision required.** Nothing was changed; the live
frame and badge still carry Federation Red, and the frame is now drawn by
`BrandBorder variant="live"` rather than a red `box-shadow` glow, so the
*mechanism* is the kit's even while the colour question is open.

The options, none of which may be chosen here:

* **A.** Keep Federation Red for broadcast and record it as a named exception
  to ADR-0038, on the grounds that a live mark is a reserved-status use.
* **B.** Add a measured live pair for dark grounds — a lighter `night-blue`
  step as ink on ink, and a plate whose white text clears 4.5 in every list.
  This is a new token with new measurements, i.e. system evolution.
* **C.** Carry "live" on this surface without colour: the badge's word, the
  pulsing dot and the rotating edge already carry it, and the edge could take
  the tricolour instead of any single colour.

### D8d.4 — defects this phase found in the kit itself

Each was measured, not reasoned about, and each is fixed:

1. **`TableHeader` drew nothing, ever.** `border-image` does not apply to an
   internal table element: 0 of 300 sampled pixels painted at *both*
   `border-collapse` values. Now a background band, which painted the full
   width in both. (The further claim that the transparent band erased a `<tr>`'s
   own rule did **not** reproduce: that rule painted 300/300 with the band and
   without it.)
2. **`PageHero` had no inline padding**, so every page that adopted it put its
   title against the viewport edge. `.brand-container` now reproduces the site's
   own measure exactly — 1440px, and 16/24/32/48/64 at the same five steps.
3. **`PageHero` required a breadcrumb**, which silently reversed ADR-0072 D7
   for every /about page that adopted it. Now optional.
4. **`.brand-border__inner` had no rule at all**, while the component's comment
   said it "rounds and clips the content inside it". It now does.
5. **The focus ring promised a sandwich it did not paint.** `outline-offset`
   leaves its gap transparent, so on ink the white ring had only ink behind it.
   A `box-shadow` band now paints `--a11y-focus-offset` in that gap.
6. **`Button` and `LinkTile` linked through `next/link`**, which drops the
   locale prefix under `localePrefix: "always"` — a reader on the English page
   could be sent to Arabic. Both now take `linkComponent`, and
   `locale-aware-link-contract.spec.ts` fails on a literal internal path that
   passes neither that prop nor a locale in its href.
7. **`Tabs` arrows ignored reading direction**, had no Home/End, did not move
   focus with selection, and derived fixed ids that collided when two tab rows
   shared a screen. All four fixed; the dashboard's `LanguageTabs` dropped the
   three workarounds it had built around them.
8. **`.vs-edge` drew a control boundary at 2.94:1** (`--surface-divider` on
   ink), below WCAG 1.4.11's 3:1 floor. It is gone; the controls that used it
   are kit controls, whose edge is `--surface-border` at 6.44:1.

### D8d.5 — still open, deliberately

* **`StatCard` has no critical tone.** The dashboard has two tiles that mean
  "critical" and they currently show the `attention` edge. Red is reserved by
  ADR-0038, so which colour carries "critical" is a design decision and is not
  taken here. **DESIGN DECISION REQUIRED.**
* **The kit publishes no select control**, so the video library's filter keeps
  a hand-written one. **DESIGN SYSTEM GAP.**
* **`CtaBand` and `PageHero` cannot show a CMS photograph** other than through
  `PageHero`'s new `media` slot; `SplitFeature` still takes project images only,
  and the stored photographs are on a remote host `next.config` does not allow.
  **DESIGN SYSTEM GAP.**
* **Visible breadcrumbs on /about pages.** The recipe put them there; ADR-0072
  D7 says structured data only. The prop is now optional, so this is a content
  decision per page rather than a component constraint. **DESIGN DECISION
  REQUIRED.**

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

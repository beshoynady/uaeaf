# ADR-0065 — Colour Roles, Categorical Encoding, and the Interaction Layer

**Status:** Accepted
**Date:** 2026-09-09
**Authority:** Product Owner decision, on a measured audit presented before any code was written.
**Supersedes in part:** §3.34.1's element-scale colour guidance (already replaced at region scale by ADR-0059 D2; this ADR replaces what remained at element scale). Widens the usage scope recorded on `color.accent.*` by ADR-0051.
**Companions:** ADR-0059 (registers), ADR-0063 (link colour), ADR-0064 (contact page).

---

## 1. Context — what was measured

The public site reads as monochrome. The measurement says something more precise than "too much green".

**Contact page, Arabic, 1440 wide, 20 400 sample points over the full scroll height:**

| Band | Share of page |
| --- | --- |
| Neutral | 90.8 % |
| Federation Green | 8.3 % |
| Federation Red | 0.0 % |
| Everything else | 0.1 % |

8.3 % is *below* the 15–20 % green that ADR-0050 targeted before ADR-0051 retired the numeric budget. Quantity was never the defect. The defect is this:

> **Green is 98.8 % of every chromatic pixel on the page.**

Enumerating every element inside `<main>`: the page carries **six chromatic colours, five of which sit on one hue** (147°–149°, the green ramp at five lightness steps). The sixth is the required-field asterisk. That is monochromy, not overuse.

Across `apps/web/src` the token families actually referenced are `green` and `red` (two references). Nine families are generated as CSS custom properties. **`--color-accent-*` is referenced zero times.**

### Why the system produced this

Three mechanisms exist and none was reachable for an ordinary page:

1. **The Role/Accent layer** (ADR-0051, `DT-COLOR-015`) is registered *Active, Semantic-pending*, and each token carries a usage restriction transcribed from Brand Guide v1.0 §3:
   - `accent.information` — "restricted to **content-statistics** use only"
   - `accent.classification` — "restricted to **tags/sport-specialty** use only"
   - `accent.featured` — "restricted to **editorial/heritage** content only — never CTAs, forms, or generic cards/badges"

   A contact page has no statistics, no sport tags and no heritage content. The system grants it three colours and then forbids all three. Green remains the only legitimate hue **by rule**. This repeats on every service and utility page.

2. **The section registers** (ADR-0059 D2) are built, and `public-pages.ts` carries a per-page assignment with a written basis for all twelve pages — seven neutral, two red, two green, one black. ADR-0059 §11 states plainly: *"The registers are available, not yet applied."* Three pages apply them.

3. **The medal tokens** (`semantic.medal-gold/silver/bronze`) exist and are referenced zero times.

### The contact page's own share of the blame

`contact-us` is assigned the **black** register, with the basis recorded in `public-pages.ts`. When the page was rebuilt from Figma (ADR-0064) it was taken out of the register path entirely and painted with a hand-rolled four-step green gradient ladder. That ladder was compliant with the tokens and wrong about the system. It is withdrawn here.

### The policies design, measured

Figma `720:765` ("Page - Static (AR) - السياسات واللوائح") renders six document cards in two sections. **All three cards in the "اللوائح" section carry the type badge «لائحة»; all three in "السياسات" carry «سياسة».** Each of the six has a different card colour. Colour therefore tracks *position in the row*, not type — and actively misinforms, since a reader may reasonably infer six kinds where there are two.

Colours sampled from the rendered frame, and text contrast measured against each card's own ground:

| Card | Ground | In palette? | Subtitle | Meta row | "عرض الوثيقة" |
| --- | --- | --- | --- | --- | --- |
| اللوائح 1 | `#00843D` | green.500 | 3.88 ✗ | 3.26 ✗ | **1.00 ✗** |
| اللوائح 2 | `#14B8A6` | **no** — Tailwind `teal-500` | **2.01 ✗** | 1.69 ✗ | 1.93 ✗ |
| اللوائح 3 | `#0369A1` | **no** — Tailwind `sky-700` | 4.79 ✓ | 4.03 ✗ | 1.23 ✗ |
| السياسات 1 | `#D97706` | **no** — Tailwind `amber-600` | 2.57 ✗ | 2.16 ✗ | 1.54 ✗ |
| السياسات 2 | `#B45309` | **no** — Tailwind `amber-700` | 4.06 ✗ | 3.41 ✗ | 1.18 ✗ |
| السياسات 3 | `#C4A962` | **no** | **1.84 ✗** | 1.55 ✗ | 2.11 ✗ |

Five of six grounds are outside the UAEAF palette. The body greys are `#E5E7EB` / `#D1D5DB` — Tailwind's cool greys, not `neutral-warm`. **Seventeen of eighteen text measurements fail WCAG 1.4.3 AA.** The worst is the document link at **1.00:1** — Federation Green painted on Federation Green, invisible. That is ADR-0063's defect again: a link taking the identity colour regardless of its ground.

---

## 2. Decision D1 — the two governing rules

> **R1. Colour appears where its role appears.**
> A page with no action, no competition and no editorial content is a neutral page. That is correct, not a deficiency.

> **R2. No colour for decoration.**
> If removing the colour loses no information, the colour is removed.

R1 is ADR-0059 D1 carried down from region scale to element scale: colour is assigned by *what a thing is*, never by how much of it a page should have. R2 is what disqualifies the contact page's four-step ladder and the policies page's six positional fills in one sentence each.

---

## 3. Decision D2 — the role table

Ten roles. **No new colour value is introduced.** Every value below already exists, is already generated, and is measured here rather than assumed.

| Colour | Token | Role | Never | Basis |
| --- | --- | --- | --- | --- |
| Federation Green | `brand.primary` | **Action** — primary buttons, links, active/selected state, governance regions | Card fills, section headings, panel tints — anywhere without an action | §3.34.1; Guide §3.3 (administrators wear green); ADR-0059 D1 |
| Federation Red | `brand.secondary` / register `red.600` | **Competition and record** — live state, results, ratified records, competitive emphasis | Form errors (that is `semantic.error`); CTA buttons | Guide §2.3 (referee kit, flags), every local-championship garment; ADR-0038's surviving `live`/`achievement` clause; freed from warning duty by ADR-0051 |
| Federation Black | `brand.black` | **Institutional statement** — hero grounds, premium frames | Dark theme, where it resolves to `neutral-warm.700` | Guide §5.1, §6.1, §3.15; ADR-0059 D3 |
| Warm neutral | `neutral-warm.*` | **Dominant surface** — grounds, cards, text, whitespace | — | ADR-0051; ADR-0059 D2 (the fourth and dominant register) |
| Steel blue | `accent.information` | **Data and figures** — statistics, tables, charts, quantitative emphasis | Actions; system states | ADR-0051, scope widened by D3 below |
| Teal | `accent.classification` | **Taxonomy** — discipline tags, categories, filters | Actions; system states | ADR-0051, scope widened by D3 below |
| Desert sand | `accent.featured` | **Editorial and heritage** — features, archive, history | CTAs, forms, generic cards — as its own token comment already states | ADR-0051, unchanged |
| Gold / Silver / Bronze | `semantic.medal-*` | **Ranking** — podium, standings, medal tallies | Any non-sporting ordering | ADR-0051 |

Measured contrast for every role colour, on the two grounds each is actually used on:

| Token | White text on it | Its `700` on its `50` tint | Its `300` on the dark page |
| --- | --- | --- | --- |
| `brand.primary` | 4.81 | 8.37 | 6.56 |
| `brand.secondary` (`red.600` register) | 8.14 | 9.50 | 4.81 |
| `accent.information` | 7.14 | 10.45 | 5.29 |
| `accent.classification` | 6.37 | 9.92 | 6.76 |
| `accent.featured` | 5.84 | 9.18 | 8.74 |
| medal gold / silver / bronze | — | 4.94 / 5.42 / 7.12 | 11.88 / 10.90 / 8.70 |

Every pairing clears AA; the lowest is medal gold at 4.94. The three unused accents each carry white text **better than Federation Green does**, so adopting them is an accessibility gain, not a risk.

### D2a — the accent scope is widened

`accent.information` and `accent.classification` move from a *content-type* restriction ("content statistics", "tags/sport-specialty") to the *functional role* stated above. `accent.featured` is unchanged; its recorded scope was already the widest of the three and its "never CTAs, forms, or generic cards/badges" prohibition stands.

This is an amendment to a scope transcribed from Brand Guide v1.0 §3, an external document. It was put to the Product Owner explicitly and approved: three built, measured, generated colours that no page may ever use is not a state the system can stay in. **Recorded as PENDING BRAND-GUIDE BACK-SYNC.**

### D2b — equality of the three identity colours is site-wide, not per page

The instruction was that Green, Red and Black carry real presence rather than theoretical presence. Applied per page it would reintroduce exactly the decoration R2 removes — there is no competition on a contact form, and red placed there would mean nothing. Equality is therefore satisfied across the site, through the register assignments that already exist (two red pages, two green, one black, seven neutral) plus the element-scale roles above. **This differs from the literal instruction and was accepted by the Product Owner on that reasoning.**

---

## 4. Decision D3 — categorical encoding

> **Where the data carries a real classification, colour is assigned per category and fixed — never per item.** The category is then recognisable by colour before its label is read, and the colour does not move when the order or the count changes.

Scope, stated explicitly: statistics, charts, maps, tags, filters, and any multi-category display. **A chart drawing distinct categories in one colour is a functional defect, not an aesthetic choice.**

### D3a — the categorical scale

Five steps, derived by measurement rather than selection. The search maximised the minimum perceptual distance (CIE L\*a\*b\* ΔE) across the whole primitive palette, evaluated three times per pair — normal vision, deuteranopia and protanopia (Viénot 1999 dichromat simulation) — and admitted only steps carrying white text at ≥ 4.5:1.

| Index | Token | Value | L\* | White on it |
| --- | --- | --- | --- | --- |
| 1 | `color.category.1` → `steel-blue.500` | `#0C5C8F` | 37.3 | 7.14 |
| 2 | `color.category.2` → `teal.700` | `#104338` | 25.0 | 11.16 |
| 3 | `color.category.3` → `desert-sand.600` | `#724A23` | 35.2 | 7.72 |
| 4 | `color.category.4` → `gold.700` | `#87660F` | 45.2 | 5.33 |
| 5 | `color.category.5` → `silver.700` | `#5A646F` | 41.9 | 6.02 |

Worst pair, worst vision type: **ΔE 19.6** (teal ↔ silver under deuteranopia). Second worst: 21.1 (sand ↔ gold under deuteranopia).

Two properties of this result are worth recording because they were not designed in:

- **The optimiser excluded Federation Green and Federation Red on its own.** The identity colours keep their roles from D2 and are not spent on categories.
- A higher-scoring set exists (ΔE 27.2) containing `neutral-warm.950`. **Rejected**: near-black collides with both the dominant surface role and Federation Black's institutional role. Perceptual separation does not outrank the role table.

### D3b — how a category gets its index

**Index = the value's position in its schema enum.** `GOVERNANCE_DOCUMENT_TYPES = ['Regulation', 'Policy', 'Form', 'Guide', 'Decision']` therefore yields:

| Category | Index | Token |
| --- | --- | --- |
| Regulation — لائحة | 1 | `category.1` steel blue |
| Policy — سياسة | 2 | `category.2` teal |
| Form — نموذج | 3 | `category.3` desert sand |
| Guide — دليل | 4 | `category.4` gold |
| Decision — قرار | 5 | `category.5` silver |

The enum is already canonical, already closed, already validated server-side, and already ordered. Deriving the index from it means the mapping cannot drift between the API, the admin panel and the site, and no one has to decide which colour "suits" a document type. Any other closed vocabulary in the schema is mapped the same way, and the resulting map is recorded in this ADR when it is first used.

Scales longer than five require an amendment; do not interpolate a sixth value.

### D3c — how a category colour may be drawn

- **On a badge, chip, or a thin edge — never as the card's fill.** A filled card forces every word on it to contend with a saturated ground, which is precisely how seventeen of eighteen measurements failed above. The card stays on a neutral surface.
- **Colour is never the only carrier.** WCAG 1.4.1: the category badge always shows its label as text. The colour makes the label findable; it does not replace it.
- Filled badge → white text (all five clear 5.33:1). Tinted badge → the family's `700` on its `50` (all five clear 4.94:1); dark theme → the family's `300` on the page (all five clear 5.29:1).

---

## 5. Decision D4 — the registers are applied

Every page renders the register `public-pages.ts` assigns it, including `contact-us`, which returns to **black**. This needs no new system — only execution, which ADR-0059 §11 already scheduled as "the next slice".

---

## 6. Decision D5 — the interaction and motion layer

Required on every page, built entirely from the existing `--motion-*` tokens and the ascent-derived utilities (`.rise-in`, `.rise-scroll`), with no new animation vocabulary:

- **Cards** — a distinct resting, hover, focus-visible and active state: elevation and a small rise, derived from the ascent metaphor. Hover and active are never the only signal; focus-visible is always drawn.
- **Form fields** — transitions on focus, error and success; a submit button with a legible pending state; a confirmation that does not depend on colour alone.
- **Section entry** — a staggered reveal on scroll via `--motion-ascent-stagger`.
- **Constraints** — `transform` and `opacity` only; `prefers-reduced-motion: reduce` removes movement and keeps every state distinguishable without it. A state that exists only as motion is a failed state.

---

## 7. Decision D6 — when a UI dependency is justified

The web app currently carries **no UI library**: React, Next, next-intl and Tailwind only.

> A third-party dependency is justified when it implements a **WAI-ARIA pattern with focus management and keyboard interaction** that would otherwise be hand-written and hand-tested — dialog, combobox, listbox, menu, tabs, tooltip. It is not justified for styling, animation, layout, or components the platform already provides natively.

Applying it:

- **Adopt nothing for this slice.** Every interaction in D5 is CSS plus tokens the project already ships. A dependency here would fail the test.
- **Radix primitives, per component, when such a pattern actually arrives.** Unstyled, individually installable, no visual opinions to fight.
- **shadcn/ui as a reading source, not a dependency.** Its ARIA structure and focus handling are worth copying; installing it drags `class-variance-authority`, `tailwind-merge` and a parallel token vocabulary (`--primary`, `bg-primary`) that would compete with ours. Take the pattern, write it against our tokens.
- **Tailwind UI — no.** It is a visual product, and the visual layer is ours.
- **Framer Motion — still no.** The motion in D5 is CSS transitions plus `animation-timeline: view()`, already in use. ~34 KB gzipped for that fails the same test it failed before.
- **Charts** — deferred. When needed, prefer plain SVG or a modular library over a monolithic one, and bind every series to D3a.

Native platform features are preferred wherever they are complete: `<select>` (the best mobile experience and free accessibility), `<dialog>`, `<details>`.

---

## 8. Consequences

- `packages/design-tokens/tokens/brand/brand.json` gains `color.category.1–5` as aliases. No primitive changes value.
- The comments on `accent.information` and `accent.classification` are rewritten to the D2a scope.
- The contact page's green ladder is withdrawn; the page returns to its black register with green confined to action.
- The policies page is **not built by this ADR**. When it is, its six positional fills are replaced by neutral cards with `category.*` badges, and the `#00843D`-on-`#00843D` link is a defect that must not reach code.
- Guard tests enforce D2 and D3a: no text painted with `--color-brand-*` (ADR-0063, already in place), no category value outside the five, and the measured floors above.

### PENDING BRAND-GUIDE BACK-SYNC

- The widened scope of `accent.information` / `accent.classification` (D2a).

### PENDING FIGMA BACK-SYNC

- Figma `720:765`: six positional card fills, five of them outside the palette; seventeen failing text measurements; the invisible document link.
- ADR-0053's `accent.category.championship/news/media` exist as Figma variables but were never added to `tokens/brand/brand.json`. They are content-placeholder tints and are **not** the D3a scale; the two must not be merged without a decision.

## 9. Registry

```text
DT-GOVERNANCE-005 · Colour Role Table (element scale) · Status: Active · v1.0 · Owner: Design System · References: [ADR-0065] · Supersedes: §3.34.1 at element scale
DT-COLOR-023 · accent.information/classification scope widened to functional role · Status: Active · v2.0 · Owner: Design System · References: [ADR-0065 D2a] · PENDING BRAND-GUIDE BACK-SYNC
DT-COLOR-024 · color.category.1–5 categorical scale · Status: Active · v1.0 · Owner: Design System · References: [ADR-0065 D3a] · Measured: min ΔE 19.6 across normal/deuteranopia/protanopia
DT-GOVERNANCE-006 · Categorical encoding rule (per category, never per item) · Status: Active · v1.0 · Owner: Design System · References: [ADR-0065 D3]
DT-GOVERNANCE-007 · UI dependency threshold (WAI-ARIA pattern with focus management) · Status: Active · v1.0 · Owner: Design System · References: [ADR-0065 D6]
```

# ADR-0088 — Two accent roles: the live accent and the track mark

| | |
| --- | --- |
| **Status** | Accepted (owner batch, 2026-09-18). Both are declared, measured and guarded. **Neither is drawn anywhere yet**: D1 by the owner's decision, D2 because of the conflict in D4. |
| **Builds on** | ADR-0051 (the Role/Accent layer) · ADR-0065 (colour appears where its role appears; no colour for decoration) · ADR-0072 D1 (the method every distance below is measured with) |
| **Does not amend** | Gold for achievement, red for attention, green for action · the three existing accents · ADR-0080 D4 (the hero's progress line) |
| **Authority** | Owner decision. Neither colour was chosen: each is a hue with a stated relation to the identity, and its step in each list is the most chromatic one that a search found passing every bar. |

---

## Context

The owner asked for a wider, livelier palette. The identity's two colours cannot stretch to it: red is held under about 5% of a page and means attention, gold means a medal and nothing else (ADR-0086 D3 refused it for a sponsor on that ground). Liveliness therefore needs roles of its own rather than a wider use of colours that already mean something.

In OKLCH the identity sits at green **150.6°** and red **22.3°**. Green plus 240° is 31°: the identity already spans two legs of a triad, and the third — green plus 120°, **271°** — is occupied by no ramp in the system.

**Method** (ADR-0072 D1's, unchanged): CIE76 on CIELAB (D65), the smallest distance under normal vision, deuteranopia and protanopia (Viénot, Brettel and Mollon 1999), thresholds compared unrounded; WCAG contrast at 4.5 for text and grounds, 3 for shapes. For each hue the lightness axis was walked and the most chromatic in-gamut step that cleared every bar was kept. A hue with no passing step in a list fails that list; nothing was nudged past a bar.

---

## D1 — `color.accent.live`: what is happening now or next

**Role.** Time. A live mark, a countdown, a results feed. **Never** an action (green), a state or an alert (the semantic colours, red), an achievement (gold), a link, a category, or decoration. Held to the budget red is held to.

**Relation to the identity.** Hue 271°, the open leg of the triad.

| List | Value | Lowest on the page grounds | Nearest state | Nearest meaning or role |
| --- | --- | --- | --- | --- |
| light | `night-blue.500` `#333CE0` | **6.67:1** (sunken); 7.33 on white | info 57.7 | silver 97 · steel blue, category 1: 59.2 |
| dark | `night-blue.400` `#6783FE` | **4.86:1** (raised) | info 24.4 | steel blue 41.3 · silver 67 |
| high contrast | `night-blue.500` `#333CE0` | **7.33:1** on white | 74.4 from that list's states | — |

It keeps its hue in high contrast, which the item colours could not (ADR-0072 D1).

**Where it is not drawn.** On the green, red and black bands it measures 1.11 to 2.86:1. They are not its partners.

**Under `forced-colors`** the user's scheme replaces it, so the role always carries a word, a figure or an edge beside it (WCAG 1.4.1).

**A risk, named.** A blue-violet in the identity of a flag that has no blue. The derivation is arithmetic, but Chapter 27 §40 asks that the federation be recognisable without its logo. What keeps it in hand is how narrow the role is, and the budget.

**Owner decision 2026-09-18:** declared and guarded now, **used by nothing until the results pages exist**. The guard fails if any source names it.

## D2 — `color.accent.track`: a mark on a dark ground

**Role.** A line, a fill or a figure on a ground that is dark in all three lists: the black register, a photograph under the hero's wash. **Never** text on a light ground (1.09 to 1.20:1 there), never a state.

**Relation to the identity.** Hue 121°, green's warm neighbour (−30°), at the most chroma sRGB holds there.

| List | Value | On the black register | Nearest state | Nearest meaning |
| --- | --- | --- | --- | --- |
| light | `track-lime.200` `#D3FA08` | **17.45:1** | warning 41.7 | gold 27.6 |
| dark | `track-lime.200` `#D3FA08` | **7.51:1** (the warm black that list uses) | warning **17.9** — the closest anything comes, and it clears 15 | gold 22.6 |
| high contrast | `white` | **21:1** | — | — |

No hue in high contrast: no step clears 7:1 on white and 15 from that list's states together, so it is drawn as the register's ink, as the item colours are.

**The green and red bands are not partners yet.** It measures 7.81 and 6.77:1 on them in light and dark, but in high contrast those bands are white and so is this. A use there has to draw its high-contrast mark in the band's own ink first.

## D3 — Measured and refused

| Candidate | Why |
| --- | --- |
| Cyan, 196° (green plus 45°) | Light ink `#007A7B` clears 4.5 by 0.19, stands 17.8 from the teal item ink and 15.2 from silver as a shape. It passes by a hair and lives inside teal's family, which is classification: not a new family at all |
| Coral, 47° (red plus 25°, the colour of a track surface) | **No step passes as ink in dark.** The most vivid text-safe one, `#F9700B`, stands 3.1 from `warning-text` and 11.6 from gold |
| `night-blue` at L 0.78, `#9DB3FE` | 11.9 from `info` in dark |

## D4 — Where the track mark is used today: nowhere, and why that is a decision for the owner

The owner's instruction is to use it wherever there is an active tab or a progress indicator today. The site has exactly one: the hero's progress line, which is both. That line is drawn in `--color-brand-primary`, and **ADR-0080 D4 (owner, 2026-09-17) names it, with the picture, as the hero's identity element**; `e2e/home-hero.spec.ts` asserts the colour, and the hero is a protected area of this batch. The header's current-page indicator stands on a light ground, where this colour measures 1.15:1. Nothing else on the site is a tab or a progress indicator.

Two owner decisions a day apart point opposite ways, so the line is left as it is. If the owner rules for the track mark, the change is one class in `hero-controls.tsx` and one assertion in that spec, and it must be measured in place first. Computed only, against `HERO_SCRIM` over a pure white photograph — `#5C5C5C` at its 64% and `#424242` at its 74% — the mark is 5.56:1 and 8.35:1 where today's green is 1.39:1 and 2.09:1. The homepage hero draws its own wash at the foot, so those are an indication and not a measurement of that line.

## D5 — The guard

`token-lists-contract.spec.ts` gains a part: both names in all three lists · at least 15 from every state, every medal and the pinned edge, and at least 10 from every role colour and from each other, in light and dark · the live accent's distance from the high-contrast states · the track mark without hue there · the live accent used by no source. The part was seen red before the tokens existed, and red again when the dark track value was pointed at `warning.300`, where it named gold, the pinned edge and warning at once.

Contrast is not restated there: `pairings.json` records both and the existing floor test holds them in every list.

---

## Consequences

- `primitive/colors.json` gains `night-blue` (two steps) and `track-lime` (one). A step is added when a role needs it and is measured then.
- The three semantic lists gain `color.accent.live` and `color.accent.track`; `pairings.json` records both.
- Neither is in `base.css`: unlike the three accents of ADR-0051 they differ by list.
- PENDING BRAND-GUIDE BACK-SYNC: two roles the Digital UI Brand Guide v1.0 does not have.

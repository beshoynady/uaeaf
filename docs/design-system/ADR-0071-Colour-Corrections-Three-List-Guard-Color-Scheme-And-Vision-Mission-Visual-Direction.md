# ADR-0071 — Colour Corrections, the Three-List Guard, `color-scheme`, and the Vision & Mission Visual Direction

**Status:** Accepted in part.
- **Accepted and built:** D1–D5, D7, D8.
- **Accepted and built for Vision & Mission:** D6. Its scope beyond this page is an **open decision**.
- **Blocked by measurement, nothing built:** D9 (the item colours).
- **Recorded, not built:** D10 (what the reference shows that was not built, and why).
- **Amended by ADR-0072 (2026-09-15):** D7 (the ordinals: `display-2xl`, the item ink, beside the text), D8 (the band is removed: the lines stand on the photographs, without reserves), D9 (built, with the owner's thresholds of 2026-09-15) and D10 (every item resolved there). D6 is unchanged.

**Date:** 2026-09-15
**Authority:** Owner batch brief of 2026-09-14, «دفعة: اللوحة النهائية + تطبيق الاتجاه البصري على صفحة الرؤية والرسالة». It approves: the palette decisions (§3–§6); the delete button's option A, `color-scheme`, the two corrections, the four state-text names, the four-part guard, form A and three lists (§7); and the visual direction on this page (§8).
**Amends:**
- ADR-0067 D2, for Vision & Mission (D6).
- ADR-0070 D4 and D6.4 (D6, D7).
- ADR-0069 D10: the lines outside a hero, and the black stroke on the page's own ground (D8).
- The light value of `semantic.warning` recorded by ADR-0051 (D1).
- `button.json` bindings (D1, D2).
- Chapter 7 §7.7's enforcement (D4, D5).

**Does not amend:** ADR-0065 (D9 is blocked); the brand guide; ADR-0059's four registers.
**Companions:** `docs/engineering/plans/colour-modes-proposal.md` (the proposal and its measurements), `docs/engineering/how-vision-mission-direction-works.md` (what was built, explained).

---

## D1 — Two corrections and the four state-text names

Every value is an existing ramp step. Measured on the page grounds of each theme (base / raised / sunken), unrounded against the floor.

| Token | Light | Dark | High contrast | Was |
| --- | --- | --- | --- | --- |
| `--button-primary-text` | `{color.text.on-brand}` #FFFFFF: 4.81 / 6.67 / 9.40 on rest / hover / pressed | same, same | same, same | `{color.text.inverse}`: black in dark, **4.37 / 3.15 / 2.23** |
| `--color-semantic-warning` | `warning.600` #B08506: 3.24 / 3.39 / 3.08 | unchanged #EAB308 | unchanged | `warning.500` #D09E07: **2.34 / 2.45 / 2.23** as a shape |
| `--color-semantic-success-text` | `success.600`: 5.87 / 6.14 / 5.58 | `success.400`: 6.23 / 5.42 / 6.98 | `success.800`: 9.97 | new |
| `--color-semantic-error-text` | `error.500`: 4.77 / 4.98 / 4.53 | `error.300`: 6.09 / 5.30 / 6.83 | `error.800`: 10.39 | new; closes ADR-0067's DESIGN SYSTEM GAP |
| `--color-semantic-warning-text` | `warning.700`: 5.15 / 5.38 / 4.90 | `warning.500`: 7.65 / 6.66 / 8.58 | `warning.800`: 8.30 | new |
| `--color-semantic-info-text` | `info.600`: 5.07 / 5.30 / 4.81 | `info.400`: 5.94 / 5.17 / 6.66 | `info.800`: 10.92 | new |

**The binding is the fix, not a value.** `text.inverse` flips with the theme and the three grounds do not. `text.on-brand` is defined for "filled brand/semantic grounds [that] carry their own colour in both themes". After the rebinding nothing uses `text.inverse`; its record in D4 says so.

## D2 — The delete button: fixed grounds, `on-brand` text (option A)

| | Rest | Hover | Pressed | Text |
| --- | --- | --- | --- | --- |
| Before | `{color.semantic.error}`: follows the theme (#E53E3E in dark) | `error.600` fixed | `error.700` fixed | `{color.text.inverse}` |
| After | `{color.error.500}` fixed | `error.600` | `error.700` | `{color.text.on-brand}` |
| Measured, every theme | 4.98 | 6.57 | 8.15 | — |

- **Before, in dark:** 5.09 at rest, **3.20** on hover, **2.58** pressed. `on-brand` on the old dark rest ground measured 4.13, which is why both sides move together.
- **Consumers:** none today in either application.

## D3 — `color-scheme` follows the stamped theme

`apps/web/src/app/[locale]/globals.css`: `html { color-scheme: light }` and `html[data-theme="dark"] { color-scheme: dark }`, the dashboard's line of 2026-09-08.

- **Before:** `light dark` handed scrollbars, system colours and native controls to the operating system.
- **High contrast** keeps `light`: it paints a white page.
- **Measured in a browser** (`e2e/color-scheme.spec.ts`), system light and dark × site light, dark and high contrast:
  - Before: 6 of 6 red, `light dark` in every case.
  - After: 6 of 6 green. `Canvas` is `rgb(255, 255, 255)` for the light and high-contrast sites and `rgb(18, 18, 18)` for the dark site, whatever the system says.
- **One guard read the file by position.** `direction-and-logo-contract.spec.ts` took the first `[data-theme="dark"]` block. It now takes the block that declares `--logo-ink`, as it already did for `:root`.

## D4 — The three-list guard

`apps/web/src/lib/design-system/token-lists-contract.spec.ts`, with its data in `packages/design-tokens/tokens/semantic/pairings.json`.

| Part | Rule | Seen red |
| --- | --- | --- |
| 1. Symmetry | The colour names in `light.css`, `dark.css` and `high-contrast.css` are one set | The four state-text names added to light alone: "dark lacks …", "high-contrast lacks …" ×4 |
| 2. Pairings | Every colour in every list has a record naming its partners and floor. Text and grounds 4.5, shapes 3, unrounded. Every pair clears it in every theme | No file: 61 unrecorded. Then 14 failing pairs: warning light 2.23; primary button dark 4.37 / 3.15 / 2.23; delete button dark 3.20 / 2.58; `on-brand` on the delete ground dark 4.13 |
| 2a. Exemptions | A record may skip its floor only with a written reason (`exempt`) | Mutation: a text floor recorded as 3 |
| 2b. Partners | A partner must resolve to a colour in each theme | Mutation: `--color-does-not-exist` |
| 2c. Unpaired | A record may name no partner (`unpaired`) only while neither application uses the colour | Mutation: `text.secondary` unpaired, 14 uses listed |
| 3. Consumption | No `var(--color-<ramp>-<step>)` in `apps/web/src` outside a recorded ledger (file, count, reason) that must shrink | 12 uses in 4 files |
| 4. Item distinction | ΔE between the item colours | **Not built**: D9 |

**What the records surfaced** (all pre-existing, none changed here):
- `semantic.neutral` measures 2.47 as a shape on light `surface.sunken`. Unpaired, because nothing uses it.
- The medal tokens' flat values: unpaired, no use. ADR-0065 D2 measures the medal families as tints.
- `card.border` is `border.default`, 1.28 on the page. Exempt: a card is not a control. It has five uses in the dashboard (FOLLOW-UP).

## D5 — The 39 direct uses: 8 moved, 31 not

**Moved.** Identical value in all three themes, so there is no visual change:

| File | From | To |
| --- | --- | --- |
| `contact-form.tsx`, `strategy-cta.tsx` | `brand-primary`, `green-600`, `green-700`, `text-on-brand` | `--button-primary-background`, `-hover`, `-pressed`, `--button-primary-text` |
| `ui/surface.ts` `HERO_SCRIM` (×2) | `--color-brand-black` | `--color-surface-overlay` |

**Primitives with no role to move to: 8, recorded in the guard's ledger.**
- `contact-map.tsx` ×4 and `strategy-cta.tsx` ×3: the outlined link's edge and its two tints (`green-500`), and the map marker (`red-500`). ADR-0068 D3 records Secondary and Tertiary as a DESIGN SYSTEM GAP with no `button.secondary.*`. Those two links are also not D3.1's Secondary (a neutral outline): FOLLOW-UP.
- `ui/surface.ts` ×1: the card icon's glyph (`green-500`).

**Identity colours used directly: 23 stay. Moving them is bigger than the brief assumed.**

| Uses | Where | Why not moved |
| --- | --- | --- |
| 3 | `globals.css` logo inks | Identity artwork. ADR-0002 and guide §9.1 forbid its colour following the theme. Already indirected through `--logo-*` |
| 4 | `brand/uaeaf-motif.tsx` | Identity artwork |
| 3 | `ui/identity-hero.tsx` | ADR-0069 D10 IL-8 names these tokens |
| 9 | `ui/surface.ts` (6: card and field hover edges), `styles/motion.css` (3: card-icon fill) | The Action role. ADR-0065 D2 names `brand.primary` as its token, and no semantic `border`/`fill` action role exists. **DESIGN SYSTEM GAP** |
| 3 | `layout/site-header.tsx` (2: skip link, drawer scrim), `layout/primary-nav.tsx` (1: active indicator) | The header is protected (brief §12). Twins exist for two of them: `--button-primary-background`, `--color-surface-overlay` |
| 1 | `president/president-message.tsx` pull-quote rule | ADR-0069 D11; the President's page is the next batch |

## D6 — The hero is a band on Vision & Mission (amends ADR-0067 D2)

**Rule:** `IdentityHero` takes `height`.
- `first-screen` is the default, and keeps ADR-0067 D2: with a picture or a portrait, the hero fills the screen less the header.
- `content` makes the hero its content's height whatever it stands on. Vision & Mission passes it.

**Why** (owner, brief §8.3): the start of the content is in view at once, and the short-phone problem disappears at its source.

**Measured, with the five photographs** (1440×900 and 390×844, light and dark, both languages):

| | Before (ADR-0067 D2) | After |
| --- | --- | --- |
| 1440×900 | 804 / 900 | **628** / 900 |
| 390×844 | 748 / 844 | **425** (Arabic) and **446** (English) / 844 |

**IL-5 in the hero** (32px floor), at 360×640, 768×1024 and 1440×900:
- Arabic: 58.4 / 68.4 / 105.3px.
- English: 37.4 / 41.9 / 48.2px.

**What falls away on this page:**
- Chapter 5 §5.10's 90vh cap needs no exception.
- IL-9's growth "only where an approved exception allows it" is not reached: landscape phones and 200% zoom get a hero as tall as its content, which is what they received as an exception before.
- English below `lg` still keeps the reserve above the title (ADR-0069 D10, deferred). Without a portrait that reserve costs no overflow.

**Scope: OPEN DECISION.**

| Option | Covers | Consequence |
| --- | --- | --- |
| A. This page only (**as built**) | Vision & Mission | Two hero behaviours with a photograph on the site |
| B. Every content page on `IdentityHero` or `PageHero` except the Homepage | The governance, institutional, service and editorial personalities (Protocol §4) | One rule for content pages. The Homepage keeps the Cinematic first screen. ADR-0067 D2 is rewritten, not amended |
| C. Every hero | Including the Homepage | The Cinematic personality loses its first screen |

Recommendation: **B**, decided with the next page built (the strategic plan), because its reason, "the content starts in view", holds for every page whose job is reading. The recommendation is not applied.

## D7 — The statements (amends ADR-0070 D4)

- **Ordinals** 01 and 02, owner's direction (brief §8.1.1), which reverses ADR-0070 D4's "no numbered badge":
  - `text-display-xl`: 64px, 40px on a phone.
  - `aria-hidden`: the heading already names the statement, and the ordinal encodes no sequence.
  - Colour `text.muted`: 6.05 light, 6.88 dark, on `surface.base`. The palette colour waits on D9, and low opacity was excluded by the brief.
- **Alternating rows** from `lg`:
  - The photograph takes 5 of the 12 columns, the cap the portrait takes beside a title (ADR-0069 D10).
  - The vision's photograph sits at the end of the reading line, the mission's at its start. The alternation is logical, so it mirrors in English (Protocol §9 allows a photograph to mirror; a logo never).
  - The photograph's height is the statement's, cropped to cover (Protocol §7). At its own 2.29:1 ratio it measured 528×231 beside a taller text, and no other ratio is chosen.
  - Below `lg` the statement comes first and its photograph follows at its own ratio (Chapter 5 §5.10).
- **No scrim.** The photograph stands beside the words, not under them. This replaces ADR-0070 D4's photograph panel for the statements. The values and the call to action keep theirs.
- Without a photograph, a statement is one centred column, as before.

## D8 — The identity lines between sections (extends ADR-0069 D10)

`IdentityBand` (`ui/identity-hero.tsx`) wraps the statements.

| Rule | Band |
| --- | --- |
| IL-1, IL-2, IL-4 | The hero's groups, lengths, spacing, angle and scales |
| IL-3 Anchor | The 1440 frame. A on its left edge, B on its right. Each group's nearest point stands the diagonal clearance (`--space-8 × √2`) inside the band's edge, as A stands `--space-8` below the breadcrumb in the hero |
| IL-5 | By construction: the content keeps A's height and the clearance below it, and B's height, the clearance and the content's rise above it |
| IL-6, IL-7 | Unchanged |
| IL-8 Colour | Red and green as in the hero. **Black is `--logo-ink`** on the page's own ground: black in light and high contrast, the monochrome mark's `currentColor` in dark (Chapter 1 ADR-0002) |
| Motion | None. The strokes are drawn at rest; only the content's one-shot rise moves (ADR-0069 D10 Q13) |

**The guard** (`e2e/identity-lines.spec.ts`, "strokes between sections") measures each band on its route before and after its reveal, against every text run and photograph in `<main>` outside the hero, not only the band's own.
- The first version measured the band alone and passed.
- Widened, it measured group B's tail **0px** (390×844) and **2.5px** (1440×900) from the goals heading in Arabic, where that heading holds the right edge.
- After the edge clearance, with photographs:
  - Arabic: 45.3px at both sizes.
  - English: 41.3px (390×844) and 36.3px (1440×900), from the "01" ordinal.

A second defect was in the test itself: on a 640px screen the band is taller than the view, and a block below it never revealed. The guard now scrolls every block into view.

## D9 — The item colours: blocked by measurement

**The brief's condition** (§4–§5):
- Four existing ramps (green, not `brand.primary`; teal; steel blue; desert sand).
- Separated by ΔE among themselves under colour blindness: 19.6 if possible, 15 at least.
- The same against the four states under colour blindness.
- The same against categories, medals and identity sections in normal vision.

**Method:** the previous batch's (Viénot 1999, CIE76, unrounded), over every step combination.

**Contrast gates:**
- Surface: the three text tiers ≥ 4.5.
- Identifier (edge and icon): ≥ 3 on its surface and on the page grounds.
- Label: ≥ 4.5.

**Scripts:** scratch `palette4/measure4–6.mjs`. The state set includes the corrected warning and the four text names.

| Reading of the condition | Light | Dark |
| --- | --- | --- |
| **As written**, identifier steps 200–700 (the approved method, which keeps the hue) | **no set exists** | **10.11** ✗ |
| As written, any step, including the near-black 800–900 | **10.75** ✗ (`green.900` ↔ `desert-sand.800`, protanopia) | 15.40 (≥ 15, < 19.6) |
| States in normal vision only | 10.75 ✗ | 22.54 ✓ |
| Among themselves only (no states) | 29.89 ✓ | 32.44 ✓ |
| Without green, any step | 23.34 ✓ | 18.47 |
| Without desert sand, any step | 23.50 ✓ | 18.69 |
| Previous proposal's series 1–4, as measured under this scope | among 9.82 · states **2.65** · category 1 **0.00** | among 14.74 · states **2.25** |

**Why the light theme fails: two independent blockers, then the collapse.**
1. **Green against the success colours.** Only `green.800` (22.25) and `.900` reach 15 under all three visions. `.700` stops at 11.94, and `.400` at 4.89.
2. **Desert sand against category 3.** Category 3 is `desert-sand.600`. Only `.800` (19.18) and `.900` reach 15 in normal vision; `.500` and `.700` stop at 9.41 and 9.24.
3. **Steel blue** needs `.700` or darker as well (category 1: 18.19; info: 24.99).
4. Once all three are near-black, protanopia folds them together: `green.900` ↔ `desert-sand.800` = **10.75**.

No step of the same ramps passes, so the brief's stop point applies ("إن سقط لون…"): nothing is lowered, and no token, ADR clause or card colour is built.

### The conflict record the brief asked for (§6), assessed but not written

The rule "the two roles never meet in one place" **would stand**, with three clauses:
1. never in one element;
2. never an item colour where a category legend is on screen;
3. an item's identifier at a step at least 15 from its family's category step in normal vision. Without this clause the previous series-3 label was category 1 itself.

It is not written because there is no palette to govern.

**Two further conflicts, not named in the brief, found while translating the reference:**
- **Four colours cycled over six goals and six values** gives goal 1 and goal 5 one colour, and goal 1 and value 1 one colour. Colour then tracks position, which ADR-0065 §1 recorded as misinforming on the policies frame, and D3 ("per category, never per item") and R2 do not allow. The previous batch's case for series colours was one fixed colour per permanent item, and cycling removes it.
- **Arrows on the cards:** D10.

### DECISION REQUIRED

1. **Scope of the states condition:** (a) as written, which is infeasible in light; (b) states only where they share a view with item colours (Vision & Mission has none), which gives 29.89 / 32.44; (c) other.
2. **The set:** four as briefed, which is infeasible in light at hue-keeping steps under any scope that includes categories; or three.
3. **Cycling** over six, given ADR-0065 D3 and R2.

## D10 — What the reference shows and was not built

| Reference | Not built because | Needs |
| --- | --- | --- |
| An arrow at the end of every card | The goal and value cards are not links. An arrow is the conventional sign of "go", and a signal on something that does nothing is a false affordance (Chapter 11 §UX, recorded in `ui/surface.ts`; ADR-0067 D10: the pointer says what is clickable) | Owner decision: a destination for each card (an IA decision), or no arrow |
| Tinted cards in six colours | D9 | D9 |
| An icon on each goal card | Goals carry no icon field (ADR-0070 D1: "no icon, as the board defines") | A schema change, with approval |
| Photographs cropped to a parallelogram | Not in the brief's §8.1. A new shape language beside the identity lines (Protocol §18 prefers the approved device) | Owner decision |
| Pale green ordinals | Low opacity or tint lowers contrast (brief §8.1.1) | D9 for the colour |
| Strokes around the call to action | The brief asks for the lines in the hero and between sections. The call to action is a photograph panel inside the container | Owner decision, and the band rule of D8 if wanted |

## Translation of the reference (brief §8)

| In the reference | As built | What changed, and why |
| --- | --- | --- |
| A short photographic hero | `IdentityHero height="content"`: 628px at 1440×900, 425px on an Arabic phone | D6. The D10 lines and reserves stay |
| Huge 01 and 02 | `display-xl`, `text.muted`, 6.05 / 6.88, hidden from assistive technology | D7. Neutral until D9 |
| Image and text alternating | 5/12 photograph at the reading end, then the start; height of the statement; stacked below `lg` | D7. No scrim; mirrors with the language |
| 45° strokes in the hero and between sections | Hero unchanged. The statements band carries A and B, static, 36.3–45.3px from any content | D8 |
| Large card numbers | `display-l` (56px, 36px on a phone), `text.muted`, 6.32 light / 5.99 dark on the card | Neutral until D9 |
| Arrow at the end of each card | Not built | D10 |
| Varied rhythm | Hero band → tall statements band with lines → dense goals grid → values on a photograph → call to action on a photograph | No new ground: the registers and surfaces that exist |
| Six colours on goals and values | Neutral cards | D9 |
| Its fonts, icons and photographs | The approved typeface, Lucide from the closed list, the uploaded photographs | Brief §8.2 |

## Tests

| Test | What it proves | Red first |
| --- | --- | --- |
| `token-lists-contract.spec.ts` | D4 parts 1–3 | ✓ (and mutations) |
| `e2e/color-scheme.spec.ts` | D3 | ✓ 6/6 |
| `vision-mission.spec.tsx` (6 new) | Band hero; ordinals; photograph beside the words and taking the statement's height; four static strokes; card numbers at display size | ✓ |
| `e2e/identity-lines.spec.ts` "strokes between sections" | D8 | ✓ (no band; then 0px and 2.5px) |
| `direction-and-logo-contract.spec.ts` | Unchanged rule, no longer order-dependent | Failed on the second dark block |

## Pending Figma back-sync

1. The Vision & Mission hero as a band with a photograph (D6).
2. The statements: ordinals, alternating photographs at 5/12 taking the statement's height, no scrim; stacked below `lg` (D7).
3. The identity lines in the statements band, black in the logo's ink on the dark theme (D8).
4. The goal cards' numbers at `display-l`.
5. The corrected light `semantic.warning` and the four `*-text` variables; the button bindings.

## Follow-ups

- **Dashboard** (outside this batch's `api + web` budget):
  - Six state colours used as text (`toast-region.tsx` ×4, `media-picker.tsx`, `status-control.tsx`) should move to the `*-text` names. The light warning correction lowers none of them further, but `semantic.warning` as text still measures 3.08.
  - `card.border` in five files (D4).
- The outlined link on the contact map and the call to action is not ADR-0068 D3.1's Secondary (D5).
- `semantic.neutral` and the medal tokens need a pairing at their first use (D4).
- The review page (`app/api/colour-review/proposal.css`) still carries the D1 corrections as `--proposed-*`; they are now tokens.

## Registry

```text
DT-COLOR-025 · button.primary.text / button.danger.* bound to text.on-brand, danger grounds fixed · Active · v1.0 · [ADR-0071 D1, D2]
DT-COLOR-026 · semantic.{success,error,warning,info}-text · Active · v1.0 · [ADR-0071 D1]
DT-GOVERNANCE-008 · Three-list guard and pairings record · Active · v1.0 · [ADR-0071 D4]
DT-LAYOUT-011 · IdentityHero height: first-screen | content · Active (content: Vision & Mission only; scope OPEN) · [ADR-0071 D6]
DT-BRAND-012 · Identity lines in a band between sections · Active · v1.0 · [ADR-0071 D8]
DT-COLOR-027 · Item colours from existing ramps · BLOCKED · [ADR-0071 D9]
```

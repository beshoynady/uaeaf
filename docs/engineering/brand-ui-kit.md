# The Brand UI Kit

The identity layer, built once and read by both applications. Governing decision: [`ADR-0098`](../design-system/ADR-0098-Brand-UI-Kit-Surfaces-And-Accents.md).

---

## 1. Why it exists, and what was rejected

The public site and the dashboard read as neutral and quiet. The federation's own published output does not: it is colour-forward, and it is built from the same three identity colours the design system already holds. The gap was not missing colours — it was that nothing in the codebase knew **how** to carry them.

The hard question was never "may the brand colours appear". ADR-0059 D2 settled that in September, and ADR-0060 D1 already assigns a colour register to each of twelve pages. The question was narrower: **what may carry identity colour when it carries no information at all**, which is the one thing ADR-0065 R2 forbids in a single sentence.

The answer is R3 (ADR-0098 D1): a third category of colour, *identity*, defined by three prohibitions rather than by a permission. It may not sit where an encoding colour is expected, it may not present a colour a reader must resolve alone, and it must be bounded.

**Rejected, with reasons:**

| Rejected | Why |
| --- | --- |
| A tricolour gradient across large areas | Puts `#00843D` and `#C8102E` in one plane at 1.22:1 from each other — the adjacency defect ADR-0059 D2 made a mandatory token to prevent |
| Waving flag ribbons, grunge brush strokes | Generic (nothing in them is UAEAF's), raster PNG where the rest of the system is SVG, and Chapter 27 §23 already prohibits applied digital texture |
| Black-and-white photography as the default | Contradicts the federation's actual published output, which is the evidence this layer was derived from |
| Duplicating the components in each app | The tricolour rule is conditional on surface, theme and direction. Two copies of a conditional rule diverge, and the divergence is invisible until a reader sees black tricolour on a black ground |
| `padding-box`/`border-box` for the gradient border | Needs an opaque interior taken from the surface, so it vanishes on the two gradient grounds and cannot ring a photograph. See §6 |

---

## 2. File map, in the order the work flows

```
packages/design-tokens/
  tokens/primitive/colors.json        color.ink.500 — the one new colour value
  tokens/primitive/motion.json        motion.duration.orbit — the first cycle period
  tokens/primitive/border.json        border.width.ring
  tokens/primitive/opacity.json       mesh, scrim and tile alphas
  tokens/semantic/colors.{light,dark,high-contrast}.json
                                      color.brand-surface.*, color.tricolor.mid
  tokens/semantic/pairings.json       what each new colour is measured against
  css/surfaces.css                    THE MECHANISM — read this first

packages/brand-ui/
  index.ts                            one entry point, and the API contract
  surface/     Surface, PhotoSurface
  accent/      BrandAccentBar, TricolorDivider, BrandStreaks, BrandBorder, .brand-ring
  controls/    Button, IconButton, FilterChip, SearchField, Tabs
  content/     SectionHeading, PageHero, DocumentCard, LinkTile, CtaBand,
               EmptyState, StatHighlight, AthleteResultBadge,
               StatCard, FeatureCard, InfoCard, SplitFeature,
               StepBadge, TableHeader, GlassTile

apps/web/src/lib/design-system/
  brand-surface-contract.spec.ts      decisions 8.2 and 8.4, and the build constraint
  surface-adjacency-contract.spec.ts  green never abuts red; ink always has an edge
  source-files.ts                     the shared walker both guards use

apps/web/src/app/[locale]/brand-kit/  the reference page — every component, every surface
apps/web/src/components/pages/policies/  the first page built entirely from the kit
```

---

## 3. Traced: how `DocumentCard` knows it is on a dark ground

It doesn't. That is the design.

**1.** A page writes a surface:

```tsx
// apps/web/src/components/pages/policies/policies-browser.tsx
<Surface kind="canvas" as="div" className="policies-results">
```

**2.** `Surface` puts one attribute on the element and nothing else:

```tsx
// packages/brand-ui/surface/surface.tsx
<Element data-surface={kind} id={id} className={className}>
```

**3.** That attribute is matched by a block that publishes a fixed set of custom properties:

```css
/* packages/design-tokens/css/surfaces.css */
[data-surface="ink"] {
  --surface-bg: var(--color-brand-surface-ink-surface);
  --surface-text: var(--color-brand-surface-ink-text);
  --surface-tricolor-mid: var(--color-white);
  ...
}
```

**4.** `DocumentCard` never reads any of them directly. It renders a `BrandBorder`, whose band takes its paint from a variable:

```css
/* packages/brand-ui/accent/accent.css */
.brand-ring::after {
  background: var(--brand-ring-paint, var(--brand-tricolor));
}
```

**5.** And `--brand-tricolor` is re-substituted **per surface**, which is the load-bearing part:

```css
:root,
[data-surface] {
  --brand-tricolor: linear-gradient(
    var(--brand-tricolor-angle),
    var(--color-brand-primary) 0%, ...
    var(--surface-tricolor-mid) 44%, ...
  );
}
```

Move that card from the canvas onto ink and **nothing about the card changes**. Its middle step turns from black to white because the surface it now sits in says so.

The card's *body* then does the same trick in reverse: it declares `data-surface="raised"`, so the white plate it paints re-establishes the neutral ink for everything inside it (§6.3).

---

## 4. Decisions that are not obvious

**The `from` stop of each brand gradient is the Pantone value, and that costs a text tier.** White on `green.500` is 4.81:1 — 0.31 above the AA floor. One tier fits, and no more. So `--surface-text-muted` on the two brand grounds is the *same white* as `--surface-text`, and hierarchy there is size and weight. A guard fails if a muted tier or an alpha channel reappears (ADR-0098 §8.2).

**`surface-ink` is fixed across themes, and therefore needs an edge.** It measures 1.05:1 against the dark page ground — no boundary at all. Every ink surface carries a `BrandAccentBar` or a mesh, and a guard fails on one that carries neither (§8.4).

**The tricolour's middle step is a variable, not a constant.** Black on light grounds, white on dark. Without it the ramp is green-to-red: a field with no boundary anywhere in it, blending through a brown that is in no part of the identity.

**On the two identity grounds everything tricolour collapses to white.** Guide §6.1 says the mark goes monochrome on a coloured ground; the same logic decides it for every accent built from the same three colours. One override in `surfaces.css` and the bar, the divider, every border tone and the secondary button all follow.

**The diagonal motif does not mirror in RTL.** It is derived from the logo's take-off angle, so a mirrored angle is a mirrored identity mark. Placement follows reading order through logical properties; the angle does not. This reverses what `auth-shell.tsx` did before, on the owner's explicit instruction.

**`raised` is a surface.** A card body inside a coloured section has its own ground, and everything in it reads the on-surface variables. Without a ground of its own it paints white ink on its own white plate.

---

## 5. Adding a component to the kit

1. Put the file in the group it belongs to (`surface/`, `accent/`, `controls/`, `content/`).
2. Write it as a **Server Component**. Add `'use client'` only for real state or a real event handler — hover and motion are CSS.
3. Take **no** prop describing the background, the theme or the direction. Read `--surface-*` instead.
4. Put no colour, gradient, duration or border width in the file. Tokens only.
5. Accept `className` for position, never for colour.
6. Style it in the group's stylesheet. Need an edge? Add `brand-ring` and set `--brand-ring-paint` — do not hand-roll a border.
7. Export the component **and its props type** from `index.ts`.
8. Add a specimen to `apps/web/src/components/brand-kit/specimens.tsx` and look at it on all six surfaces, in three themes and both directions. This is where mistakes show up; three real ones were caught there on the first day.

---

## 6. Where it breaks

**Lightning CSS deletes `--x: conic-gradient(...)`.** Silently — the declaration is absent from the served stylesheet, `var(--x)` resolves to nothing, and the element renders at the right size painted with nothing. A `linear-gradient` in the same position survives. **Conic gradients go in a real property, never in a custom property.** Guarded.

**A custom property containing `var()` is substituted on the element that declares it.** `--brand-tricolor` declared only on `:root` resolved `var(--surface-tricolor-mid)` where no surface had set it, became guaranteed-invalid, and inherited as invalid everywhere. Every accent rendered in the right place with no colour. It is now declared on `:root` **and** on `[data-surface]`.

**A `:not()` chain carries the specificity of its arguments.** `[data-surface] > *:not(.a):not(.b):not(.c)` is (0,4,0) and beat `.brand-streaks`'s own `position: absolute`, dropping the motif into the flow — where an SVG with `preserveAspectRatio="none"` took **580px** of real height at the top of every `PageHero`. The rule was deleted; content already paints above a sibling with a negative `z-index`.

**The `padding-box`/`border-box` border recipe needs an opaque interior.** It takes it from `--surface-bg`, which on the two brand grounds is itself a gradient — `linear-gradient(<gradient>, <gradient>)` is invalid and the whole `background-image` is dropped. The border was correct on three surfaces and absent on two. Replaced by `.brand-ring`, a masked pseudo-element with a transparent interior.

**A Server Component cannot hand a function to a Client Component.** The policies page passed three message formatters and the page 500'd. They travel as raw templates now and are filled client-side.

**NFKD splits `أ` into `ا` + U+0654.** A mark range ending at U+0652 leaves the hamza attached, so searching "الاساسي" found nothing. The range is now the full set of Arabic combining marks, pinned by a test.

---

## 7. What the tests guard

| Guard | Holds |
| --- | --- |
| `brand-surface-contract.spec.ts` | Every surface publishes the whole on-surface set · white-only text on the two gradient grounds, with no alpha · the ink ground is theme-invariant and measures under the section floor · the tricolour's middle step is perceivable against both neighbours and against its own ground · no conic gradient inside a custom property |
| `surface-adjacency-contract.spec.ts` | No unseparated green/red pair in any source · no `Surface kind="ink"` without a mesh or an accent bar · **and a coverage assertion that fails if it found nothing to check** |
| `governance-documents.spec.ts` | Arabic search folds hamza, diacritics and ta-marbuta — and still says no to a word that is not there · absent metadata returns `undefined`, never a dash · exactly one featured document · one group left empty so the empty state is reachable |
| `register-contrast.spec.ts` (existing) | The flat registers, unchanged |

All three new guards were verified by **mutation**: each defect was introduced deliberately, the guard was seen red, and the defect reverted.

---

## 8. Deliberately not built

- **Video.** The section was exempted from the colour rules by owner decision on 2026-09-23; that exemption was cancelled on 2026-09-24 (ADR-0098 §8c) and the conversion is Phase G, gated on a parallel session finishing.
- **`event-accent`.** Structure only, scoped to `[data-event-accent]` with identity defaults. No page uses it. Declaring a colour nothing uses is what ADR-0088 D4 already cost this project once.
- **A public documents endpoint.** `governanceDocuments` has a per-id public read but no public list, so the policies page serves marked seed records and stays `noindex`. Adding the route is a backend change.
- **Illustration.** Chapter 27 §31: this system has no illustration style, and inventing one for an empty state is how a second visual language gets in through the least-reviewed door.

---

## 9. Terms

| Term | Meaning |
| --- | --- |
| **Surface** | A ground that publishes a fixed set of on-surface custom properties. Six: `canvas`, `raised`, `photo-light`, `brand-green`, `brand-red`, `ink` |
| **Register** | The older, flat page-level grounds of ADR-0059 D2 (green/red/black/neutral). Still in use for register-assigned page bands; the kit's brand surfaces are the expressive variant |
| **Tricolour** | Green → a surface-dependent middle step → red. The identity accent |
| **Identity colour** | ADR-0098 D1 R3 — colour that encodes nothing. Beside *role* colour (ADR-0065 R1) and *categorical* colour (D3) |
| **Band / ring** | `.brand-ring`, the masked pseudo-element that draws every gradient edge in the kit |
| **Dose** | Expressive (public site, 4px edge, hover motion) vs Operational (dashboard, 3px edge, no hover motion) |
| **Mesh** | Two radial tint fields, green and red, in opposite corners. Not a pattern: no motif, no repeat, no edge |
| **Orbit** | `motion.duration.orbit`, the scale's first *cycle period* as opposed to a one-way duration |

---

## 10. Phase H — one mechanism, and the shapes the product actually repeats

### `Section` and `Surface` are now one thing

Two systems painted the same grounds: `Section` (ADR-0059's register bands) through Tailwind classes, `Surface` through `data-surface`. The cost was not tidiness. A `BrandAccentBar` inside the black-register footer resolved its middle step from the `:root` fallback — **black, on the black footer** — so the bar rendered with a third of it invisible.

`Section` now emits `data-surface` alongside its classes, and three register surfaces were added (`section-green`, `section-red`, `section-black`) publishing the registers' **own measured values** — `green.700` with `green.100` under it, not the kit's gradient. Mapping the registers onto `brand-green`/`brand-red` would have moved every register band's second text tier below AA.

Declaring a surface and *painting* one are now different: `[data-surface]` publishes the variables, `.brand-surface` (added by the `Surface` component and nothing else) paints. That is what lets a register band borrow the variables without having its ground repainted.

**The register surfaces' tricolour is the register's own ink, not a literal white.** In high contrast a register flattens to a white ground with black text, so a hard-coded white accent is white on white — which is what this file's own guard caught the moment the register surfaces were measured.

### Seven components for seven repeated shapes

Each exists because the inventory found it written out in two or more places. Nothing was added for a shape that appeared once.

| Component | The shape it replaces |
| --- | --- |
| `StatCard` | A figure with a label. Six on the dashboard's news screen alone; every overview and list screen wants a row. **The tone is an edge, never a fill** — a wall of filled colour tiles is the "everywhere faintly" failure, and a fill puts the figure on a ground only white ink would clear |
| `FeatureCard` | A goal or axis card that *is* an identity colour, cycling green → ink → red. Replaces the pastel `color.item.*` cards on institutional pages. Green and red are never adjacent in the cycle |
| `InfoCard` | An icon, a label and a value on the neutral plate — the contact page's information row |
| `SplitFeature` | A photograph beside a statement, the institutional body shape. `media` is logical (`start`/`end`) so the composition mirrors while the motif keeps its angle |
| `Tabs` | The WAI-ARIA tab pattern with a tricolour rule on the selected tab — plus `aria-selected` and a weight change, so the state is never colour alone |
| `StepBadge` | A step number in a green disc, for a long editor form |
| `TableHeader` | A `<thead>` with the tricolour rule under it |
| `GlassTile` | A translucent tile for a coloured ground — no `backdrop-filter`, which buys nothing over a flat ground and costs a repaint on scroll |

### Two more things that only worked on dark grounds

`LinkTile` and `AthleteResultBadge` hard-coded a translucent white fill, so they were invisible on canvas — a limitation the Brand Kit hid by only ever showing them on brand grounds. Both now read `--surface-tile-fill` and `--surface-tile-edge`, which each surface publishes: translucent white on a dark or identity ground, a raised plate with a real border on a light one.

The kit's neutral-ground button also now binds to `--button-primary-*`, the component tokens the rest of the product already paints its buttons with, so a kit button and a page button are the same button.

### Adding a page with a recipe

Each page type has a recipe (ADR-0098 §5-4 of the Phase H brief). To add a page:

1. Decide its type — Landing, Institutional, Directory, Editorial list, Detail, Events, Documents, Form, Static/Legal, or a dashboard Overview / List / Editor / Section manager / Settings.
2. Start from `PageHero`, and give the page at least one full-width section on an identity ground besides the hero and footer.
3. Every section heading is a `SectionHeading`; every card, control and filter comes from the kit.
4. Canvas sections carry `mesh`.
5. Check the two rules a guard enforces: no green surface adjacent to a red one, and no `Surface kind="ink"` without a mesh or an accent bar.

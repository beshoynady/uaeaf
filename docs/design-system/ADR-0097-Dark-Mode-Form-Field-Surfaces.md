# ADR-0097 — Dark-Mode Form Field Surfaces

| | |
| --- | --- |
| **Status** | **Accepted and implemented, 2026-09-23.** Option 3. Every number below was re-measured in a live browser after implementation; see Verification. |
| **Raised by** | The article-editor redesign, 2026-09-23. The defect is not the editor's; it is the token pairing underneath every form in the platform. |
| **Scope** | Three new semantic tokens per theme, `forms.css`, and the field edge in both apps' interaction constants. Touches **both** applications: `apps/web` imports the same `forms.css` (`globals.css:4`). |

---

## Context

A form field in the dashboard takes its background from `forms.css`, not from a
Tailwind class:

```
forms.css:45-51   .field              { --field-surface: var(--color-surface-sunken); }
forms.css:52-55   .field:focus-within { --field-surface: var(--color-surface-raised); }
forms.css:250-254 .field-control      { background-color: var(--field-surface); }
```

The card those fields sit in (`FormSection`) uses `--color-surface-raised`.

### Measured, dark theme

| Pair | Value | Ratio |
| --- | --- | ---: |
| Field at rest `#000000` vs card `#21201C` | pure black inside warm dark grey | **1.29:1** |
| Field **on focus** `#21201C` vs card `#21201C` | identical | **1.00:1** |
| Primary text on the resting field | `#FAFAF8` on `#000000` | 20.09:1 |
| Muted text on the resting field | `#9E9D96` on `#000000` | 7.72:1 |
| `border-strong` `#757470` vs card | the field's only remaining edge | 3.48:1 |

### Measured, light theme — for comparison

| Pair | Value | Ratio |
| --- | --- | ---: |
| Field at rest `#F5F4F1` vs card `#FFFFFF` | recessed, as intended | 1.10:1 |
| Primary text on the resting field | `#000000` on `#F5F4F1` | 19.09:1 |

**Text contrast is not the problem, in either theme.** Every text pair passes AA
comfortably. Two separate things are wrong, and only in dark:

1. **The direction is inverted.** The field is *darker* than the card it sits
   in, where the light theme makes it lighter-recessed against white. Pure
   black inside a warm dark grey does not read as a recessed field; it reads
   as a hole.
2. **Focus erases the field.** On focus the field becomes `#21201C` — exactly
   the card's own colour, 1.00:1 against it. The boundary at the moment of
   interaction rests entirely on the border. The focus **ring** is still drawn
   and still passes, so this is not a WCAG 2.4.7 failure; it is the field
   losing its shape precisely when it matters.

---

## Options

### Option 1 — Remap `--field-surface` to `--color-surface-skeleton` in dark, and invert the focus step

Rest: `#33322D` (skeleton). Focus: `#000000` (sunken), or `#21201C`.

| Pair | Ratio | Note |
| --- | ---: | --- |
| Field `#33322D` vs card `#21201C` | **1.27:1** | same separation, correct direction |
| Primary text on field | **12.29:1** | passes with room |
| Muted text on field | **4.72:1** | passes AA (4.5) — but only just |
| `border-strong` `#757470` vs field | **2.75:1** | below 3:1 for a non-text boundary |

- **Cost:** one line per theme in `forms.css`, plus a guard pinning the pairs.
  No component changes, no new token.
- **Trade:** muted hint text on a field drops from 7.72:1 to **4.72:1** — still
  AA, but the margin is thin enough that any future nudge to either token
  breaks it. And the field's border falls to 2.75:1 against its own fill,
  under the 3:1 a non-text boundary wants, so the edge gets weaker exactly as
  the fill gets more visible.
- **Uses an existing token**, which is what the owner asked for.

### Option 1b — Option 1, plus an existing border token reaching 3:1 — **NOT AVAILABLE**

The owner asked (2026-09-23) whether an **existing** border token clears 3:1
against `#33322D`, so that Option 1 could keep its edge as well as its fill.
Every border/edge/divider token in the dark theme was measured against the
proposed field:

| Token | Value | vs field `#33322D` |
| --- | --- | ---: |
| `--color-border-strong` | `#757470` | 2.75 |
| `--color-section-black-divider` | `#757470` | 2.75 |
| `--color-section-green-divider` | `#00843D` | 2.67 |
| `--color-border-default` / `--color-border-subtle` / `--card-border` | `#33322D` | 1.00 |

**No neutral token reaches 3:1.** Ten tokens do clear it — `--color-border-accent`
(3.29), `--color-section-green-border` (5.72), `--color-section-red-divider`
(3.30), the four `--color-item-*-edge` values, `--color-logo-pinned-edge`, and
the near-white section borders — but every one of them is a **coloured,
meaning-carrying** token. Federation Green on every resting field would say
"active" on a field that is not; the red would say "error". Borrowing a
semantic colour to solve a contrast shortfall is exactly the substitution
ADR-0065 R2 forbids, so this route is closed rather than merely unattractive.

**Conclusion: the conditional resolves to Option 3.**

### Option 2 — Leave the rest state, fix only the focus collapse

Rest stays `#000000`; focus becomes `#33322D` instead of `#21201C`.

- **Cost:** one line. The smallest possible change.
- **Trade:** the inverted direction (complaint 1) stays. Fixes the 1.00:1
  collapse, which is the half that actually costs an author something.

### Option 3 — Option 1 plus the field's own tokens *(ACCEPTED AND BUILT)*

> **Owner decision, 2026-09-23 — FINAL.** `neutral-warm.400` (`#9E9D96`) is
> approved as `--color-field-border`'s dark value, confirmed after reviewing the
> rendered dark form. This supersedes the provisional acceptance below and
> closes the substitution raised against the earlier `#83827E` proposal.

**Correction to this ADR's own earlier draft.** The draft proposed `#83827E`,
described as "the first warm neutral on the system's ramp" clearing 3.3:1. It
was not on the ramp: it was derived by walking RGB values, and the neutral-warm
ramp has no step between `.500` (`#757470`) and `.400` (`#9E9D96`). Reading the
ramp itself gives the answer the instruction actually asked for — **the first
ramp step clearing the floor is `neutral-warm.400`**, and it clears it with far
more room than the invented value would have.

**Nothing here is a new colour.** All three values are existing steps of the
neutral-warm ramp; what is new is three *semantic* tokens naming the field's own
ground and edge, so the field stops borrowing from the surface ramp.

| Token | Light | Dark | High contrast |
| --- | --- | --- | --- |
| `--color-field-surface` | `neutral-warm.100` `#F5F4F1` | `neutral-warm.900` `#21201C` | `#FFFFFF` |
| `--color-field-surface-focus` | `#FFFFFF` | `neutral-warm.950` `#131210` | `#FFFFFF` |
| `--color-field-border` | `neutral-warm.500` `#757470` | `neutral-warm.400` `#9E9D96` | `neutral-warm.900` |

**Light keeps exactly the values it had** — the pairing already worked there,
and the tokens exist so the two themes can differ without a component knowing
which theme it is in.

#### Dark, first implementation — SUPERSEDED by the correction below

These are the numbers as first built (`neutral-warm.800` / `.700`). They are
kept because the correction is only legible beside them: every figure here
passes, and the build was still wrong.

| Pair | Before | After | Floor | |
| --- | ---: | ---: | ---: | --- |
| Field vs card | 1.29 *(and darker)* | **1.27** *(and lighter)* | — | direction now matches light |
| **Focus** vs card | **1.00** | **1.80** | — | the field keeps its shape |
| Focus vs resting field | — | 1.42 | — | it lifts on focus, as light does |
| Border vs field | 2.75 | **4.72** | 3.0 | ✓ |
| Border vs card | 3.48 | **5.99** | 3.0 | ✓ |
| Primary text on field | 20.09 | **12.29** | 4.5 | ✓ |
| Muted text on field | 7.72 | **4.72** | 4.5 | ✓ |

Rejected: `#83827E` (3.34 — off-ramp, an invented colour) and keeping
`border.strong` `#757470` (2.75 against the new ground — the shortfall that
opened this ADR).

The muted-text figure is the one that got worse: 7.72 → 4.72. It still clears
AA, and it is a property of the fill rather than of the edge — see the open
question at the end.

### Option 4 — Do nothing

Recorded for completeness. The focus state stays at 1.00:1 against its card,
and every form in both applications keeps a pure-black field inside a warm
grey panel.

---

## Correction, 2026-09-23 — the state edges

The table above measures the field against its **card**, and the **text** on
the field. It never measures the edges the field draws in its own states.
Those edges are what WCAG 1.4.11 is about, and on `neutral-warm.800` / `.700`
five of them were under 3:1 — worse, in three cases, than the black field this
ADR replaced:

| Pair (dark) | Before this ADR | As first built | Floor |
| --- | ---: | ---: | ---: |
| Field surface × hover/focus edge (`action.default` `#00843D`) | 4.37 | **2.67** | 3 |
| Field surface × invalid edge (`semantic.error` `#E53E3E`) | 5.09 | **3.11** | 3 |
| Focus surface × hover/focus edge | 3.39 | **1.88** | 3 |
| Focus surface × invalid edge | 3.95 | **2.19** | 3 |
| Focus surface × field border | 5.99 | **3.32** | 3 |

The dark Action green `#00843D` is a *dark* colour. It can only be read
against a ground darker still, and `#33322D` is not. Lightening the field to
fix its relationship with the card broke its relationship with every edge it
draws.

### The two rules this forces

1. **In dark, `--color-field-surface-focus` is not lighter than
   `--color-field-surface`.** There is no ramp step above the resting ground on
   which the green edge clears 3:1, so the focused field cannot lift. The focus
   state is carried by the ring (18.72:1) and by the edge changing colour —
   both stronger signals than a 1.4:1 change of fill, and both available to a
   reader who does not perceive the fill change at all.
2. **The field ground may equal the card ground.** Since ADR-0097 the field has
   an edge at 5.99:1, and WCAG 1.4.11 asks for the *boundary* of a control to
   be perceivable, not for its fill to differ from what is behind it. The
   original complaint — a field that vanishes on focus — was never about the
   fill on its own; it was about a field with neither a fill difference nor an
   edge that could be read.

### The chosen values, and why these and not others

Every existing `neutral-warm` step, measured as a dark field ground against
all seven things drawn on or beside it:

| Step | Hex | field-border | error edge | action edge | text-primary | text-secondary | focus ring | |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `.500` | `#757470` | 1.72 | 1.13 | 1.03 | 4.48 | 2.46 | 4.68 | fails 6 |
| `.600` | `#616058` | 2.32 | 1.53 | 1.31 | 6.05 | 3.32 | 6.32 | fails 4 |
| `.700` | `#4A4942` | 3.32 | 2.19 | 1.88 | 8.65 | 4.75 | 9.04 | fails 2 |
| `.800` | `#33322D` | 4.72 | 3.11 | 2.67 | 12.29 | 6.75 | 12.84 | fails 1 |
| **`.900`** | **`#21201C`** | 5.99 | 3.95 | 3.39 | 15.60 | 8.57 | 16.30 | **first step that passes** |
| `.950` | `#131210` | 6.88 | 4.54 | 3.89 | 17.91 | 9.84 | 18.72 | passes |
| `black` | `#000000` | 7.72 | 5.09 | 4.37 | 20.09 | 11.03 | 21.00 | passes |

Floors: 3 for the three edges and the ring (WCAG 1.4.11), 4.5 for the two text
tiers (WCAG 1.4.3). Steps `.50`–`.400` are omitted: they are light colours and
fail the text tiers outright.

- **Resting ground = `neutral-warm.900` `#21201C`** — the **lightest** step on
  which every pair clears its floor. Lighter is the direction this ADR wanted
  (complaint 1); `.900` is as far as the green edge allows.
- **Focus ground = `neutral-warm.950` `#131210`** — under rule 1 the focus
  ground cannot be lighter than `.900`, and `.950` is the lightest step that is
  strictly darker, so the focused field keeps a ground of its own instead of
  being identical to its resting state.

`--color-field-border` is unchanged at `neutral-warm.400` `#9E9D96` (owner
decision above).

### Every field pair, all three themes

Measured from the built CSS (`packages/design-tokens/build/css/*.css`) with the
WCAG 2.x relative-luminance formula, compared unrounded.

| Pair | Floor | Light | Dark | High contrast |
| --- | ---: | ---: | ---: | ---: |
| `field-border` × `field-surface` | 3 | 4.25 | 5.99 | 16.30 |
| `field-border` × `field-surface-focus` | 3 | 4.68 | 6.88 | 16.30 |
| `field-border` × `surface-raised` (the card) | 3 | 4.68 | 5.99 | 16.30 |
| `semantic-error` × `field-surface` | 3 | 4.53 | 3.95 | 10.39 |
| `semantic-error` × `field-surface-focus` | 3 | 4.98 | 4.54 | 10.39 |
| `action-default` × `field-surface` | 3 | 4.37 | 3.39 | 4.81 |
| `action-default` × `field-surface-focus` | 3 | 4.81 | 3.89 | 4.81 |
| `brand-primary` × `field-surface` | 3 | 4.37 | 3.39 | 4.81 |
| `brand-primary` × `field-surface-focus` | 3 | 4.81 | 3.89 | 4.81 |
| `a11y-focus-ring` × `field-surface` | 3 | 19.09 | 16.30 | 21.00 |
| `a11y-focus-ring` × `field-surface-focus` | 3 | 21.00 | 18.72 | 21.00 |
| `text-primary` × `field-surface` | 4.5 | 19.09 | 15.60 | 21.00 |
| `text-primary` × `field-surface-focus` | 4.5 | 21.00 | 17.91 | 21.00 |
| `text-secondary` × `field-surface` | 4.5 | 8.22 | 8.57 | 21.00 |
| `text-secondary` × `field-surface-focus` | 4.5 | 9.04 | 9.84 | 21.00 |
| `text-disabled` × `field-surface` | exempt | 2.47 | 2.58 | 9.04 |
| `text-disabled` × `field-surface-focus` | exempt | 2.72 | 2.96 | 9.04 |

`--color-brand-primary` is declared once in `base.css` and never per theme, so
the contract holds no record for it; it is `#00843D` in all three themes, the
same value as `--color-action-default`, so those two rows are one measurement.

`--color-text-disabled` is exempt under WCAG 1.4.3, which exempts the text of
an inactive component. `--color-text-muted` is absent because nothing paints it
inside a field — the label, the placeholder and the select chevron are all
`--color-text-secondary`.

### The lesson

The first pass measured a **surface against the surfaces near it**. A field is
not a surface: it is a control, and a control's ground is also the backdrop for
every edge it draws in every one of its states. The question to ask of a
ground is not *what is this next to* but *what is drawn on this, in each
state*.

What caught it was not a second reading. It was
`apps/web/src/lib/design-system/token-lists-contract.spec.ts`, which fails when
a colour enters a theme list with no record in `tokens/semantic/pairings.json`
naming what it is measured against. The three new tokens shipped without those
records, so `main` went red — and writing the records is what forced every
partner to be named and every pair to be measured. **The guard did not check
the arithmetic; it refused to let the arithmetic go unwritten.** That is the
whole of its value here.

---

## What this ADR does NOT cover

`--color-surface-sunken` is `#000000` in dark, and that is also why the public
article page's `blockquote` is a pure-black box
(`article-screen.tsx:129`). **That is a separate decision** with a much wider
blast radius — the token is used directly across both apps for chips, hover
states, media wells and the source-attribution panel. Changing
`--field-surface` does not touch it; changing `--color-surface-sunken` would
touch everything.

Flagged here so the two are not confused. It needs its own ADR.

---

## What was built

| File | Change |
| --- | --- |
| `packages/design-tokens/tokens/semantic/colors.{light,dark,high-contrast}.json` | a `field` group: `surface`, `surface-focus`, `border` |
| `packages/design-tokens/build/css/*.css` | regenerated (`node scripts/build.mjs`) |
| `packages/design-tokens/css/forms.css` | `.field` and `.field:focus-within` read `--color-field-surface` / `--color-field-surface-focus` instead of the surface ramp |
| `apps/dashboard/src/components/ui/interactive.ts` | `FIELD_EDGE` → `--color-field-border` |
| `apps/web/src/components/ui/surface.ts` | `FIELD_EDGE` → `--color-field-border` |
| `packages/design-tokens/tokens/semantic/pairings.json` | records for the three tokens, and the two field grounds added to the partners of `action.default`, `semantic.error` and the focus ring |

## Verification

- **Every pair in the three tables above**, computed from the built CSS rather
  than from the token sources, so the number measured is the one the cascade
  resolves. Zero failures.
- `apps/web/src/lib/design-system/token-lists-contract.spec.ts` — the guard
  that went red on `main` when these tokens shipped without pairings records.
  Green, 37/37, with the records written.
- **Light and high contrast are untouched by the correction.** Only the two
  dark fills moved; every light and high-contrast figure in this ADR is the
  one it carried before.
- Both application suites, default configuration — see the session report.

## Consequences

- Every form in **both** applications changes in dark mode. Light does not.
- A field is now told apart from its card by its ground as well as its border,
  and keeps that distinction while focused.
- The field no longer borrows from the surface ramp, so a future change to
  `surface.sunken` — which is `#000000` in dark and used for chips, hover
  states and panels — can no longer silently restyle every input on the
  platform.

## Open question for the owner — CLOSED by the correction

The question was whether the 4.72:1 muted-hint margin on the `#33322D` fill was
too thin. The correction moved the fill to `#21201C`, where muted text measures
**5.99:1** at rest and **6.88:1** on focus. No fourth fill candidate is needed.

Remaining, and deliberate: in dark the resting field is the same colour as the
card it sits in, and its 5.99:1 border is what gives it a shape. That is rule 2
above, not an oversight — but it is the one thing in this ADR a reviewer should
look at on a rendered screen rather than in a table.

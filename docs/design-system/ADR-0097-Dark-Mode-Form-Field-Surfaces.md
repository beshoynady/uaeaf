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
| `--color-field-surface` | `neutral-warm.100` `#F5F4F1` | `neutral-warm.800` `#33322D` | `#FFFFFF` |
| `--color-field-surface-focus` | `#FFFFFF` | `neutral-warm.700` `#4A4942` | `#FFFFFF` |
| `--color-field-border` | `neutral-warm.500` `#757470` | `neutral-warm.400` `#9E9D96` | `neutral-warm.900` |

**Light keeps exactly the values it had** — the pairing already worked there,
and the tokens exist so the two themes can differ without a component knowing
which theme it is in.

#### Dark, measured in a live browser after implementation

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

## Verification

Measured in Chromium on the running dashboard, reading `getComputedStyle` and
computing WCAG ratios from the rendered colours — not from the token files:

- **Dark, `/ar/news/new`:** field `#33322D`, card `#21201C`, border `#9E9D96`,
  text `#FAFAF8` → 1.27 / 4.72 / 5.99 / 12.29, muted 4.72. Focus `#4A4942` →
  **1.80** against the card and 1.42 against rest.
- **Light, same screen:** field `#F5F4F1`, card `#FFFFFF`, border `#757470` →
  1.10 / 4.25 / 19.09 — **identical to before the change**.
- **Public site** (`apps/web` shares `forms.css`): the contact form measures
  light `#F5F4F1`/`#757470` (19.09 / 4.25, unchanged) and dark `#33322D`/
  `#9E9D96` (12.29 / 4.72). `/news` date inputs use a different recipe and are
  untouched.
- Dashboard suite: **1370/1370**.

## Consequences

- Every form in **both** applications changes in dark mode. Light does not.
- A field is now told apart from its card by its ground as well as its border,
  and keeps that distinction while focused.
- The field no longer borrows from the surface ramp, so a future change to
  `surface.sunken` — which is `#000000` in dark and used for chips, hover
  states and panels — can no longer silently restyle every input on the
  platform.

## Open question for the owner

The 4.72:1 muted-hint margin is a property of the `#33322D` fill, not the edge.
It clears AA, but with less room than the 7.72:1 it had on black. If that is too
thin, the fill has to change and this ADR should be reopened with a fourth fill
candidate rather than amended.

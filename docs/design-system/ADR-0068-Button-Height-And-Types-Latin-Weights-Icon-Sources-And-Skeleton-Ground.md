# ADR-0068 — One Button Height, Four Button Types, Latin Weights, Two Icon Sources, and the Skeleton Ground

**Status:** Accepted
**Date:** 2026-09-11
**Owner approval:** explicit, on D2, D3, D5, D6 and D9 of `reviews/figma-vs-code-audit.md` §8, before this record was written.
**Amends:** Chapter 8 L1 `CMP-BUTTON-001`, `CMP-ICONBUTTON-001`, `CMP-ICON-001` and `CMP-SKELETON-001`; Chapter 4 §4.4 (a note); Chapter 6 §6.7 (a note); Chapter 7 §7.9 (new §7.9.4); Chapter 21 ADR-0033 (a note on its Icons clause); Chapter 8 L8 (notes on two open icon items).
**Changes no token and no code.** Every value named here already ships in `packages/design-tokens`. The work this record makes necessary is listed under *Implementation*; what it leaves open is listed under *Pending*.

---

## Context

The Figma-vs-code audit (`docs/design-system/reviews/figma-vs-code-audit.md`, 2026-09-11) found five places where a chapter disagreed with another chapter, with the approved Figma component, or with what ships. The owner decided all five. They are recorded in one ADR because they came from one review and one decision round, the same shape as ADR-0059, ADR-0065 and ADR-0067.

Four decisions from the same round change no chapter and are not repeated here:

- **D1:** the four V2 frames stay, labelled as unapproved exploration. A Figma back-sync item.
- **D4:** `accent.category.*` stays deferred until the sections that use it are built. ADR-0065 already records the gap.
- **D7:** the footer's social links keep their 32px drawing with a 44px target. An implementation item.
- **D8:** the code is the reference for the dashboard and the CMS. Figma later receives the shell and three reference screens.

The audit's §8 records all four with their status.

---

## Decision D2 — Every button is 44px

### Context

- Chapter 6 §6.7: "Touch Targets: **MUST** be ≥44×44px". IA §12 records the same floor.
- `CMP-BUTTON-001` offered `sm` 32 / `md` 40 (default) / `lg` 48.
- `CMP-ICONBUTTON-001` offered 32×32 / 40×40 / 48×48, while its own QA row asked "Is the size ≥44×44px?". So both components contradicted §6.7, and one also contradicted itself.
- Figma's canonical Button set `2512:1144` is 44px.
- The dashboard implemented L1 literally. Recounted for this record from the class names in `apps/dashboard/src`, specs excluded:

  | Height | `<button>`s | Files |
  |---|---|---|
  | 40px (`h-10`) | 21 | `media-picker` ×3, `page-editor` ×3, `role-workbench` ×4, `role-editor` ×2, `create-user-form` ×2, `role-assignment` ×2, `status-control`, `user-directory`, `auth-utilities`, `language-toggle`, `sign-out-button` |
  | 40×40 (`size-10`) | 2 | `theme-toggle`, `auth-utilities` |
  | 36px (`h-9`) | 6 | `page-editor.tsx:517`, `role-workbench.tsx:220/289/296/339`, `user-directory.tsx:224` |

- One more target is a 40px `<label>` wrapping a checkbox (`permission-matrix-table.tsx:202`).
- The audit counted 16 buttons plus one. The recount above supersedes it. The files whose counts differ were not modified after the audit ran, so the audit undercounted; the code did not change.
- `apps/web` has no button below 44px. Its only target below 44px is the footer's social links, 32×32 (`site-footer.tsx:134`), which D7 covers.

### Decision

- **D2.1** A button is **44px** tall, in both applications and for every type in D3.
  - `CMP-BUTTON-001` has one size. `sm`, `md` and `lg` retire, and `size` leaves the component's API contract.
  - The owner declined a smaller size for dense tables (audit §8 D2, option c), so there is no exception below 44px.
  - The height is a `min-height`: a label that wraps at 200% zoom grows the button instead of being clipped (§6.7's zoom rule, WCAG 1.4.4).
- **D2.2** `CMP-ICONBUTTON-001` is **44×44**, one size.
- **D2.3** Every button built from 2026-09-11 is 44px.
  - Two existing buttons are taller and already meet §6.7: the dashboard's `auth/submit-button.tsx` (48px, `h-12`) and the public contact form's submit (52px, `min-h-13`, `contact-form.tsx:455`).
  - D2 does not order them resized. Whether they converge on 44px is open (*Pending*).
- **D2.4** The 29 dashboard buttons and the one label above are corrected in the November batch, before 6 November. This record resizes nothing.

### The WCAG reference

44×44 is this project's floor.
- It is stricter than WCAG 2.2 SC 2.5.8 *Target Size (Minimum)*: Level AA, 24×24.
- It equals SC 2.5.5 *Target Size (Enhanced)*: Level AAA.

Two places attribute the 44px floor to 2.5.8: the comments at `packages/design-tokens/css/forms.css:231` and `:286`, and the *Pending* list of ADR-0067. They are recorded here (audit C3), not edited.

---

## Decision D3 — Four button types

### Context

- `CMP-BUTTON-001` listed `Primary` on `color.semantic.success`, `Secondary`, `Ghost`, `Danger` on `color.semantic.danger`, and `Icon-only`.
- ADR-0051 withdrew two of those bindings, but the chapter was never updated. `tokens/component/button.json` has `button.primary.background` = `{color.brand.primary}` and `button.danger.background` = `{color.semantic.error}`.
- Figma's canonical set `2512:1144` draws five types: Primary, **Secondary Accent** (filled brand red), Secondary, Tertiary and Destructive. No chapter documents them.
- The dashboard ships four constants in `components/ui/interactive.ts`: `BUTTON_PRIMARY`, `BUTTON_SECONDARY`, `BUTTON_GHOST` and `BUTTON_DESTRUCTIVE`. No code draws a filled brand-red button.

### Decision

**D3.1** There are four types.

| Type | Role | Binding | Was |
|---|---|---|---|
| **Primary** | The main action of a section. At most one per section (Chapter 2 PR-001) | `button.primary.*` → `color.brand.primary` (ADR-0051) | `Primary` |
| **Secondary** | A companion action | Neutral outline: `surface.raised` fill, `border.default` edge, `text.primary` label, as the dashboard's `BUTTON_SECONDARY` ships today | `Secondary` |
| **Tertiary** | The lowest emphasis | No fill and no border. The label colour is open (below) | `Ghost` |
| **Destructive** | Deletion and irreversible actions only (Chapter 1 ADR-0004) | `button.danger.*` → `color.semantic.error` (ADR-0051). Brand Guide §8.1 names this variant *Destructive* | `Danger` |

- **D3.2** **Secondary Accent is not a type.** A filled brand-red call to action conflicts with ADR-0050 and ADR-0051: "Green remains the only Primary Brand Action / CTA color" (Chapter 3 §3.35.1). A campaign that needs one opens its own ADR.
- **D3.3** Icon-only is a composition, not a type. The Button's composition rules already allow it, with a mandatory `aria-label`. A standalone icon-only control is `CMP-ICONBUTTON-001`.
- **D3.4** Only the documented names change. The component tokens keep theirs (`button.danger.*`). The dashboard's constants keep theirs until the shared Button (audit K1) replaces them.

### What D3 does not decide

- **Tertiary's label colour.**
  - Figma draws it in the identity green.
  - ADR-0063 D1 rules that green out as a text colour: 4.37:1 on `surface.sunken`.
  - The dashboard's `BUTTON_GHOST` uses `text.secondary`.
  - ADR-0063's Consequences already left the right role for button labels as a separate decision. It stays open.
- **Component tokens for Secondary and Tertiary.** Neither has one; the binding above is the semantic set the shipped constant uses. Creating `button.secondary.*` is a token change under CLAUDE.md §16. This is recorded as a **DESIGN SYSTEM GAP** and nothing is created.

---

## Decision D5 — One weight per level, in both scripts

### Context

- §4.4 pairs exactly one weight with each level.
- Figma's specimen (`2579:5`) draws Latin one step lighter at every level: Display and H1–H3 at Medium; H4, Title, Subtitle and Label at Regular. No chapter records this pairing.
- The code applies §4.4 to both scripts, through the `@utility text-*` rules in both apps' `globals.css`.
- IBM Plex Sans's variable weight axis runs from 100 to 700. Alexandria's runs from 100 to 900. The source is the `next/font` metadata, `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`.
- Both apps load the variable files (`weight: "variable"` in both `layout.tsx` files).

### Decision

§4.4 stands as written for both scripts, and Figma's lighter Latin pairing is not adopted.

§4.4 gains a note. In Latin text, **`Black` renders at 700**, IBM Plex Sans's heaviest instance. So in English, Display XL, Display L and H1 render at the same weight as H2 and H3, and only size separates them. `DT-FONT-WEIGHT-BLACK` stays 900, because Alexandria draws it.

---

## Decision D6 — Two icon sources

### Context

- `CMP-ICON-001` says "Lucide exclusively" with a fixed 1.5px stroke. Chapter 21 ADR-0033 also names Lucide in the stack.
- Neither side complies:
  - No icon package is installed in either app. Their `dependencies` are `@uaeaf/design-tokens`, `next`, `next-intl`, `react` and `react-dom`.
  - Inline SVG appears in 8 files, at four stroke widths: 1.5, 1.6, 1.8 and 2.
- Figma's 01 Foundations page holds a drawn set. It was read for this record, and the SVG exports are in `figma-reference/icons/`:

  | Group | Nodes | Drawing |
  |---|---|---|
  | Sport disciplines: sprint, hurdles, distance, jump, throw | `2536:1138–1142` | 22px frame, strokes of 1.2–1.8, some filled, colour fixed at `#00843D`. **Sprint and jump draw past their frame and are clipped by it** |
  | Event types: meeting, press, camp, workshop, ceremony, conference ×2 | `2536:1131–1137` | 24px, stroke 2, `#00843D` |
  | UI: home, newspaper | `2536:1143–1144` | 15px |
  | Platforms: Facebook, Instagram, YouTube, X, WhatsApp | `667:199–202`, `996:747` | 18–20px |
  | UI: grid, list, chevron down/left, link | `995:750–768` | 20px |

- Lucide has no athletics-discipline glyphs and no platform marks.
- Chapter 8 L8 has two items waiting for "a governed icon system":
  - the committee card's domain icon (ADR-0047, Risks 3);
  - the pending-content card's mark (the ADR headed "ADR-0051" inside L8, Risks 2).

### Decision

- **D6.1 UI icons come from Lucide.** This covers actions, navigation, state and form affordances: chevrons, search, close, show/hide, grid/list, link, home.
- **D6.2 Sport-discipline icons and platform marks come from a drawn set, not from Lucide.**
  - Platform marks are third-party brand artwork: they are reproduced from the platform's source, never redrawn.
  - D6 decides the *source*, not the drawings. The discipline drawings in Figma today (`2536:1138–1142`) are a reference for which disciplines need an icon. Whether their look is kept or redrawn is the owner's visual decision, pending in `docs/design-system/figma-only-backlog.md`.
- **D6.3 Every other rule of `CMP-ICON-001` holds for both sources.** That means sizes 16/20/24/32, `currentColor`, `aria-label`/`aria-hidden`, directional mirroring in RTL, and the 1.5px stroke for stroke icons.
  - Platform marks are filled artwork and take no stroke rule.
  - Whichever discipline drawings the owner approves must therefore have one stroke width, use `currentColor` instead of a fixed colour, and sit in a frame that contains the whole drawing. The drawings in Figma today meet none of the three.
- **D6.4 The pending-content mark is a UI icon, from Lucide.** It is a state indicator.

### What D6 does not decide

- **The seven event-type icons.** They are drawn on Lucide's own grid (24px, stroke 2), but they show content categories, not UI actions. Which source governs them is open.
- **The committee-domain icons** (ADR-0047 Risks 3).
  - They are neither UI, nor discipline, nor platform icons.
  - ADR-0047 also allows dropping them in favour of the number badge.
  - Open.
- **How Lucide reaches the code.**
  - ADR-0065 D6 justifies a third-party UI dependency only for a WAI-ARIA pattern with focus management. An icon package does not meet that test as written.
  - The alternatives are the package with a recorded exception to ADR-0065 D6, or the individual Lucide SVGs vendored into the repository.
  - This is decided when the first Lucide icon is implemented.

---

## Decision D9 — `surface.skeleton` is `neutral-warm.150` in the light theme

### Context

- **What ships:** `neutral-warm.150` / `.800` / `.300` (light / dark / high contrast). Figma's light value is `neutral-warm.100`; dark and high contrast match.
- **What is recorded:**
  - No ADR, no chapter and no token comment records the light value (`tokens/semantic/colors.light.json:16`).
  - Chapter 7 never lists the token.
  - `CMP-SKELETON-001` names it without a value.
- `surface.sunken` moved to `neutral-warm.100` in ADR-0059.
- **Usage, measured for this record:** 41 references in `apps/dashboard/src` and none in `apps/web`. **No Skeleton loader exists in either app.**
  - 38 are `active:` backgrounds: the pressed state of secondary and ghost buttons, segmented controls, selectable rows and toggles (`interactive.ts:45/55/120/123` and 34 call sites).
  - 1 is a `hover:` background (`permission-matrix-table.tsx:203`).
  - 1 is the file-picker button (`media-picker.tsx:325`).
  - 1 is the empty segments of the password meter (`password-strength-meter.tsx:44`).

### Decision

`neutral-warm.150` is confirmed for the light theme. Dark `.800` and high contrast `.300` are confirmed as they ship.

There are two reasons, one per use:

1. **As the ground of a loading shape,** it has to separate from `surface.sunken`.
   - At Figma's `neutral-warm.100` it *is* `surface.sunken` (1.00:1), and a skeleton on a sunken surface disappears.
   - At `.150` it separates from sunken (1.06:1), base (1.12:1) and raised (1.17:1).
2. **As the dashboard's pressed fill,** it is the step after a hover of `surface.sunken`. At `.100`, pressing a control would change nothing on screen.

Text on this ground while a control is pressed, measured (light / dark / high contrast). All values clear 4.5:1:

| Text | Light | Dark | High contrast |
|---|---|---|---|
| `text.primary` | 17.94 | 12.29 | 11.03 |
| `text.secondary` | 7.72 | 6.75 | 11.03 |
| `text.muted` | 5.40 | 4.72 | 4.75 |

### What D9 does not decide

- The token's main use (38 of 41) is a pressed-state fill, a role its name does not describe.
- ADR-0066 made the same kind of finding about `elevation.panel` borrowing `elevation.dropdown`.
- Renaming the token or splitting out a `surface.pressed` token is a token change under CLAUDE.md §16. This is recorded as a **DESIGN SYSTEM GAP**.

---

## Implementation (none of it done by this record)

| Item | When | Source |
|---|---|---|
| Correct the 29 dashboard buttons and the one label below 44px | November batch, before 6 November | D2.4, audit C1 |
| Shared `Button` component: four types, 44px, Loading state, lift, `button.*` tokens | Before 2 October | D2, D3, audit K1 |
| Footer social links: 32px drawing, 44px target | Audit K2 | Audit D7 |
| UI icons from Lucide in the 8 files with inline SVG. The drawn discipline icons normalised per D6.3 | Before 6 November | D6, audit K7 |
| `forms.css:231/286`: change 2.5.8 to 2.5.5 and cite §6.7 | Audit K9 | D2 |
| A comment on `surface.skeleton` in `colors.light.json` | With the next token edit | D9, the code half of audit K5 |

## Pending (open, not decided here)

- **Tertiary's label colour** (D3).
- **Button label typography.** Three sources disagree, and none is decided:
  - `CMP-BUTTON-001` says `typography.label` (13px Medium).
  - Chapter 4 §4.15a (ADR-0040) registers `Type/CTA Label` (16px Bold) and cites `CMP-BUTTON-001` as its evidence.
  - Figma's canonical set draws 16px Medium.
- **The two buttons taller than 44px** (48px and 52px): converge on 44px or stay (D2.3).
- **The event-type and committee-domain icons, and how Lucide reaches the code** (D6).
- **`surface.skeleton` as a pressed fill** (D9). A DESIGN SYSTEM GAP.
- **Button text in the dark theme.** This extends ADR-0067's open decision. Measured values:

  | Pair | Default | Hover | Pressed |
  |---|---|---|---|
  | `button.primary.text` (black) on the primary ramp | 4.37 | 3.15 | 2.23 |
  | `button.danger.text` (black) on the danger ramp | 5.09 | 3.20 | 2.58 |
  | `BUTTON_DESTRUCTIVE` (white on `semantic.error`) | 4.13 | 3.08 | — |

  - The dashboard's `BUTTON_DESTRUCTIVE` binds `semantic.error` with `text.on-brand` instead of `button.danger.*`, which is why it has its own row.
  - ADR-0067's proposed one-line fix (white on primary: 4.81 / 6.67 / 9.40) closes the primary ramp only. Destructive needs its own decision.

## PENDING FIGMA BACK-SYNC

- `2512:1144`: remove the Secondary Accent row and add a Loading state.
- `45:14`, the older Button set (17–21px tall): mark it deprecated.
- `2579:5`: Latin weights per §4.4.
- `surface.skeleton` → `neutral-warm.150` in the `Semantic/Light` collection.
- Discipline icons `2536:1138` (sprint) and `2536:1141` (jump): frames that contain their drawings, if the owner keeps these drawings.

## Consequences

- **Button height:** it is no longer a choice at any call site. A reviewer can reject anything below 44px against one rule, where there used to be three that disagreed.
- **Button types:** the types in Figma, in L1 and in the dashboard now have one set of names. The shared Button (audit K1) no longer waits on its size or on its list of types. It still waits on Tertiary's label colour and on the label typography (*Pending*).
- **Icon sources:** each icon has one source. The one icon category that has none yet is named rather than left to whoever draws the next icon.
- **`surface.skeleton`:** its value now has a written reason. The next reader who compares it with Figma will find the answer here instead of "correcting" it back to `neutral-warm.100`.

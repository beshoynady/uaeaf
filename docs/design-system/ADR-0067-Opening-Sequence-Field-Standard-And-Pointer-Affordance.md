# ADR-0067 — The Opening Sequence, the Shared Field, and the Pointer

**Status:** Accepted
**Date:** 2026-09-10
**Extends:** ADR-0066 (D3 the lift, D5 the first screen, D6 the notched label, D7 glass)
**Depends on:** ADR-0009, ADR-0058, ADR-0059 §D7, Chapter 3 §3.14, Chapter 4 §4.9, Chapter 5 §5.6/§5.7/§5.8/§5.10/§5.11, Chapter 6, Chapter 8 L2 §F.1/§F.3/§F.4, Chapter 11 §UX, Chapter 14 §11

---

## Context

ADR-0066 settled what a raised object looks like and how it answers a pointer. Four things it left open have now been decided, and one it decided by a flag has been decided properly instead.

1. The lift's `scale` was declared a **DESIGN SYSTEM GAP** rather than invented. Chapter 5 §5.11 authorises `transform: scale()` and fixes no magnitude.
2. `PageHero` took a `fillsFirstScreen` boolean an author had to remember. The condition it encoded — *does this page have something to fill a screen with* — is one the component can see for itself.
3. The field mechanism lived under `apps/web`, so the dashboard could not use it. Two surfaces, two answers to what a form control is.
4. Tailwind v4 returned `button` to the browser's default cursor, so every button on both applications looked, to the pointer, exactly like a paragraph.

---

## Decision D1 — `motion.lift.scale`, bounded rather than chosen

`1.01`, added to `tokens/primitive/motion.json` beside `motion.ascent`.

A raised card's hover is **one** physical event: it comes toward the reader. The rise and the growth therefore describe the same movement, and the scale is bounded by the lift it accompanies — `{motion.ascent.offset} ÷ 4` = **4px** (ADR-0066 D3).

| Bound | Rule | Why |
| --- | --- | --- |
| Lower | edge displacement **>** `{border.width.default}` (1px) | Below the width of the border the card is drawn with, the growth cannot be resolved as depth at all. |
| Upper | edge displacement **<** 4px (the rise) | A card whose edges travel further sideways than it rises reads as the *row* jittering rather than the card coming forward — the exact failure ADR-0066 D3 removed by taking the horizontal half off the hover. |

Edge displacement is `width × (scale − 1) ÷ 2`. Across the full width range the standard produces a lifting surface at:

| Surface | Width | Displacement |
| --- | --- | --- |
| Card stacked on a 390px phone | 358px | 1.79px |
| Contact hero card at `xl` — (1248 − 3×24) ÷ 4 | 294px | 1.47px |
| Half of the 1248px panel row (the widest `.lift` reaches) | 600px | 3.00px |

All three sit inside 1px … 4px. Both bounds are asserted per width by `surface-standard.spec.ts`; raising the token to 1.2 turns three of those assertions red.

Measured on the live page, all four locale/theme combinations: rest `transform: none` → lit `matrix(1.01, 0, 0, 1.01, 0, -4)`, border `rgb(0, 132, 61)`, `::after` opacity 0 → 1, icon chip filled Federation Green with a white glyph.

## Decision D2 — The first screen follows the picture, not a flag

`PageHero` no longer takes `fillsFirstScreen`. It takes `heroImage`, resolved from the page record's `heroImageId` in `loadStaticPage`, and derives everything from whether one is present:

| With a hero image | Without |
| --- | --- |
| `min-h-[calc(100svh − var(--space-24))]` | height from content |
| photograph on its own plane + `HERO_SCRIM` | the page's own register surface |
| text in `--color-text-on-brand`, breadcrumb on the `black` register | the register's own text and muted tokens |

This closes the conflict reported against ADR-0066 D5. The owner asked in one message for the header and hero to fill the screen exactly **and** for no dead space; on eleven typography-led pages (§3.34.2 names them) those two could not both hold, and the flag was a manual answer to a question the data already answers. Upload a picture in the admin panel and the page composes itself onto the first screen; remove it and the hero shrinks back to its content rather than leaving ~550px of empty register behind.

Chapter 5 §5.10 caps a mobile hero at 90vh. Satisfied by construction and confirmed by measurement: at 390×844 the hero is **748px** against a 759.6px cap.

## Decision D3 — The opening sequence

`HERO_STAGE` in `ui/surface.ts` is the order every hero on the site arrives in. Each step is `--motion-ascent-stagger` (60ms — Chapter 5 §5.7's 40–80ms band) after the last.

| Stage | Index | Delay |
| --- | --- | --- |
| ground | 0 | 0ms |
| title | 1 | 60ms |
| subtitle | 2 | 120ms |
| motif | 3 | 180ms |
| cards | 4 + n | 240–420ms |

420ms of total stagger, inside §5.7's 600ms ceiling.

**The ground takes no delay, and it never fades.** A hero photograph is the largest contentful paint on its page, and an element at `opacity: 0` is not counted as painted — fading it in would push LCP out by the length of the fade for a decorative gain. It *settles* instead: `.rise-ground` travels `--motion-ascent-offset` vertically over `--motion-duration-slower`, which is `transform` only and costs the metric nothing.

**Layers move at different speeds, which is the depth cue.** The ground settles over 480ms while the type arrives over 220ms, and once the reader scrolls, `.hero-parallax` trails the page by `--space-12` (48px) over the first `100svh`. Vertical, not diagonal: `.rise-in`'s 45° is the identity's ascent (ADR-0059 §D7) and belongs to objects arriving *on* the page; this is the stage they arrive on.

Two rules make the parallax safe above the fold:

* **At progress 0 the layer is at `translateY(0)`**, which is its designed resting position. The owner's rule — no scroll-driven motion above the fold — is about an *entrance* stranded near zero progress. A stranded parallax is a correct parallax.
* **`scroll(root block)`, never the default `nearest`.** The hero band carries `overflow: hidden`, which makes it a scroll container; a container that never scrolls holds the timeline at 0 forever and the layer simply would not move, silently.

The travel budget is a token sum, not a guess: the layer is `-inset-y-20`, overhanging the band by `--space-20` (80px) at each edge, against 48px of parallax plus 16px of settle. Asserted by `surface-standard.spec.ts`.

## Decision D4 — Section entrances, bounded inside `entry`

`Section` gives its *contents* — never the band — a `.rise-scroll` entrance, on by default and skipped for `bleed` bands. On the band itself a 16px travel uncovers a sliver of the page along its own edge, which on a coloured register reads as a flicker in the band.

`.rise-scroll`'s range changed from `entry 10% cover 30%` to **`entry 0% entry var(--space-32)`**. `cover` spans the entire time any part of an element is visible, so for anything tall — or anything already on screen at first paint — 30% of cover sits far ahead of the current scroll offset and the animation parks near zero progress and stays there. That is the measured cause of the contact hero's fourth card holding 10px low and being clipped by the fold while every box reported the correct size. An element already in view has, by definition, finished its `entry` phase, so an `entry`-bounded range resolves to the end keyframe under `fill: both` and cannot strand anything.

A **length** rather than a percentage for the end, because a percentage of `entry` is a percentage of the element's own height: a tall section would reveal slowly and a short one instantly, from one declaration. `--space-32` fixes the reveal at 128px of scroll for every section on the site, which is what makes the rhythm shared.

The reveal remains **opacity-free**. A scroll-driven animation is the one kind whose end state a crawler or a print is not guaranteed to reach, and Chapter 14 §11 makes indexability a hard requirement. Nothing here can hide text; the worst case is text sitting 16px from where it belongs.

## Decision D5 — One field, both applications

`forms.css` and `interaction.css` moved to `packages/design-tokens/css/`, imported by `apps/web` and `apps/dashboard` alike. Neither file contains a Tailwind utility — they are plain CSS reading tokens both apps already import — so they can be one file rather than two that drift. The *class strings* stay per-app in each `ui/interactive.ts`, because Tailwind v4 finds utilities by scanning source text under the app that owns the stylesheet.

The dashboard's `TextField` and `BilingualField` now use the mechanism, and `FIELD_BOX` gives them `--color-border-strong` — the same WCAG 2.1 §1.4.11 fix ADR-0066 D1 made on the public site, where `--color-border-default` at **1.15:1** had every dashboard field failing the 3:1 boundary rule. `FIELD_SHELL` (the search control) took the same edge.

Two corrections to the mechanism itself, both found by measurement:

* **The label anchors to the control's centre, not the field's.** `top: 50%` of `.field` is the middle of the control only while nothing sits below it. Add an error message and the field grows, and the label drifts down on the one field a reader needs to read. It is now `top: calc(var(--space-12) / 2)` — half the control's own `min-height`, so the two cannot come apart.
* **Emptiness is tested by element type.** `:not(:placeholder-shown)` is *vacuously true* for a `<select>`, which can never show a placeholder — so a clause written against `.field-control` floated every select's label on first paint and the select-specific clause never got a chance to answer. The clause is now `:is(input, textarea)`.

Every control must carry a `placeholder`, even an empty one, or `:placeholder-shown` cannot match and the label floats forever. The components default to `" "`.

## Decision D6 — A select is not a visual exception

`<select>` rests with its label in the middle of the field like every other control, and floats it the moment a real answer is chosen. Its empty state is *"the empty option is the checked one"*, read live:

```css
.field:has(select.field-control):not(:has(option[data-placeholder]:checked)) .field-label { … }
```

Two `:has()` as siblings on one compound, never nested — `:has()` inside `:has()` is invalid and the whole rule is dropped silently.

### D6a — The placeholder is marked, not disabled (supersedes the first two attempts)

The placeholder option carries no text, because the label now occupies that position and two strings saying the same thing in the same place is one too many. It is **plain**: neither `hidden` nor `disabled`.

Both of those were tried, in that order, and both are wrong for the same reason. The HTML Standard's *"ask for a reset"* step selects **the first option in tree order that is not disabled**, and an option at `display: none` cannot be shown either — so under either marker the browser skips the placeholder and lands on a real answer. A required question answers itself.

This survived the first fix because it hides where nobody looks. React's `defaultValue=""` selects the option explicitly on mount, so first paint was always correct; `form.reset()` after a successful send restores selectedness from the `selected` **attribute** — which none has — and hands the field to the reset rule. The visitor's *second* message carried a message type they never chose.

Left plain, the placeholder is simply the first option and the reset rule lands on it in every path. `data-placeholder` is what tells `forms.css` the field is unanswered, and no browser behaviour reads it, so nothing can be skipped on account of it. It also does the job `:disabled` was doing badly: **an empty value is not always an empty answer.** "All statuses" and "no linked person" are both `value=""` and both are real choices; only a marked placeholder counts as unanswered.

Measured in Chrome — the only place this is answerable, since jsdom implements neither skip and stays green under both markers: `beforeAnyInteraction: ""`, `afterChoosing: "General"`, **`afterFormReset: ""`**.

Measured, all four locale/theme combinations and three widths: every field rests with its label on the control's centre line (24px of a 48px control) and floats to the top edge (0px) on focus or once answered. A select that arrives already answered starts floated; a file input floats permanently, because a file input is never visually empty.

## Decision D7 — Required is marked once, and the glyph is not part of the name

Chapter 8 L2 §F.4 requires the `*` and `aria-required` **together, never one without the other** — the glyph is the visual half and the attribute is the programmatic one. The glyph is therefore `aria-hidden="true"`.

§F.4 also prefers the explanation **once at the top of the form** over an invisible repetition on every field. `Contact.form.requiredHint` and `Common.requiredHint` carry that sentence, in the same words on both surfaces.

### D7a — The marker goes after the label element, not inside it

`<label>` holds the field's **name**, and a marker saying something *about* the field is not part of what the field is called. §F.4's own wording is *an `*` **after** the Label*, and it means the element.

Put inside, the glyph joined `label.textContent`: the field's name became "الاسم بالعربية \*", and forty-two dashboard tests that asked for a field by its name stopped finding it. Those tests were right — the markup had made a true statement false. The structure is now `<span class="field-label"><label>name</label><span aria-hidden> *</span></span>`, and every one of the forty-two passes untouched.

`aria-hidden` stays on the glyph even though nothing in the accessibility tree can now reach it from outside the label. Two mechanisms saying the same thing cost nothing here, and the one that survives a future refactor is whichever one the refactor did not touch.

### D7b — Correction: the dashboard's §F.4 debt, and what it actually was

ADR-0067's first draft recorded this as *"the dashboard deliberately shows no `*`; it never has, on any form."* **That was wrong**, and the error mattered: `media-picker.tsx` had been showing the glyph on three labels — `aria-hidden`, correctly — and carried `aria-required` on none of them. So the dashboard was not missing half of §F.4 uniformly; it was breaking the rule in **both** directions at once, in different files, which is precisely what happens when a rule with two halves is implemented at each call site.

It is implemented once now. `FieldLabel` draws the glyph and the same `required` prop sets `aria-required`, so no call site is in a position to supply one and forget the other. `RequiredHint` is a component rather than a paragraph, so a form that omits it is a missing import rather than a missing sentence nobody notices.

Two things were found while doing it:

* **`BilingualField` dropped `required` on its multiline half entirely.** It threaded the prop to its single-line inputs and not to `TextArea`, so a required bilingual *description* carried no glyph, no `aria-required` and no native `required` — §F.4 broken by omission, on the one field kind where nobody had looked.
* **The page editor was marking optionality twice**, in two notations: a `*` on required fields and an "optional" caption under every other one. §F.4's SHOULD exists to prevent exactly that repetition, so the per-field caption is gone and the sentence at the top of the form is the whole convention. The `optional` string stays in the catalogue; nothing has been decided about where else it may belong.

Guarded by `field-standard.spec.tsx`, which renders the components rather than reading them: required ⇒ exactly one glyph and one `aria-required`; optional ⇒ neither; the glyph never inside a `<label>`; and every file containing a `<form>` and a `required` renders `RequiredHint`. Each of those was proven to fail before it was trusted.

## Decision D8 — The error message is not red

**DESIGN SYSTEM GAP.** `--color-semantic-error` is `#E53E3E` on the dark theme, which measures **3.95:1** against `--color-surface-raised` (`#21201C`) — measured on the live page, under WCAG 1.4.3's 4.5:1 for text at this size, on the one sentence a reader has to act on. The light theme's `#D32F2F` measures 4.98:1 and passes. There is no error colour in the palette that clears 4.5:1 as text on a dark surface.

Until there is, the message is drawn in `--color-text-primary` — **21:1** light, **15.6:1** dark — on both applications.

**Correction (measured, twelve combinations).** This decision originally recorded the *label* of an invalid field as safe at "4.53:1 light / 5.09:1 dark" and left it red. The dark figure was wrong: the invalid label draws the same `#E53E3E` on the same ground and measures **3.95:1**, the identical failure the message was recoloured for. So the label is now `--color-text-primary` as well — **19.09:1** light, **15.6:1** dark. Light did pass at 4.53:1, but one rule beats two when a single token will revert both.

The state is still carried in colour by the field's **edge**, which clears the 3:1 non-text floor on both themes (4.98:1 light, 3.95:1 dark), so Chapter 8 L2 §F.3 and WCAG 1.4.1 hold without either the sentence or the label being red. Guarded by `surface-standard.spec.ts`.

**Proposal for the owner:** add `semantic.error-text` per theme — light `#D32F2F` (4.98:1), dark `#E96C6C` (5.30:1, the value `error-hover` already carries), High Contrast `#7F1515`. Not added here: it is a new colour value, and ADR-0059's rule is that those are declared and proposed, never introduced quietly.

## Decision D8a — And an error border needs a width, not only a colour

Found by measuring the error state at 390px rather than by reading the class string. Every invalid field reported **`border-top-width: 0px`**: `CONTROL_INVALID` *replaces* `FIELD_EDGE` rather than extending it, and Tailwind's `border-[color:…]` sets a colour and no width — so the field lost its outline entirely at the moment WCAG 2.1 §1.4.11 most needs it. The geometry said so too: an invalid field stood 48px tall where a valid one stood 49.

Latent since the form was written, and D8 made it consequential: with the message no longer red, the border was carrying more of the state than before and was not being drawn at all.

`surface-standard.spec.ts` now fails any complete control recipe that declares a border colour without a width; removing the word `border` again turns it red. Measured after: `1px solid rgb(229, 62, 62)` on every invalid field, and one uniform 49px height across valid and invalid alike.

## Decision D9 — Glass: the translucency stays, the blur goes

The owner's condition was categorical — *"performance does not drop: `backdrop-filter` is expensive, measure its effect, and do not spread it over wide areas without reason."* Measured, it does drop.

On the contact page the four hero cards put `backdrop-filter` over **16.4%** of a 1440×900 viewport. Three independent runs, 150 scrolled frames each under a 4× CPU throttle:

| radius | mean frame | p50 | p95 | frames over 16.7ms |
| --- | --- | --- | --- | --- |
| 12px (as shipped) | 30.6ms | 22.5ms | 68.8ms | 103 / 150 |
| 8px | 28.9ms | 23.2ms | 67.4ms | 104 / 150 |
| 4px | 24.9ms | 21.7ms | 55.7ms | 106 / 150 |
| none | **19.5ms** | **16.6ms** | **31.6ms** | **74 / 150** |

**The radius is not the cost.** Even 4px costs +5.4ms mean and +24ms at p95, because the expense is *having* a backdrop layer the compositor must re-snapshot every frame. Only `none` returns the median frame to the 16.7ms budget. Verified after the change: mean 19.0ms, p50 **16.3ms**, 69/150 frames over budget — the `none` row, on the real page.

So the disciplined amount the owner asked for is the two ingredients that cost nothing: the **translucency** (unchanged at 12% white, so every contrast figure solved against the worst admissible photograph still holds exactly) and the **light-catching edge** — a hairline of the surface's own light along the top, which is how a physical panel with a bevel reads.

And the blur had little to soften here in any case: what sits behind these cards is a photograph under a 0.64–0.74 black scrim, which has already crushed the detail a blur would smooth.

**Reversible in one line** if the owner accepts the cost: restoring `backdrop-blur-[12px]` to `GLASS_OVER_ART`/`GLASS_OVER_ART_MD` buys back the blur at +11ms mean and +37ms p95.

### The elevation the blur was hiding

Removing it exposed a second defect. `motion.css` is unlayered, so `.lift { box-shadow: var(--elevation-card) }` beat every Tailwind utility — including the `md:shadow-none` the pinned card carried, which had therefore never applied. The card had been drawing a drop shadow over a photograph for as long as the rule existed, with nothing reporting it.

`.lift` now owns only the *response*; the resting elevation belongs to the recipe that draws the surface (`CARD`, `PANEL`), where it can be overridden per breakpoint. The submit button, which had been relying on `.lift` for its elevation, states it explicitly. Measured after: the pinned card's only shadow is `color(srgb 1 1 1 / 0.55) 0 1px 0 inset` — the lit edge, and nothing else.

## Decision D10 — The pointer says what is clickable

`interaction.css`, shared by both applications, restores `cursor: pointer` to every control and `cursor: not-allowed` to every disabled one. Tailwind v4 changed `button` back to the browser default, which is the same arrow shown over a paragraph — no affordance on the one signal a mouse user gets before committing to a click (Chapter 11 §UX).

Declared in **`@layer base`**, not unlayered. Unlayered CSS beats every layer, which would make this default win over a `cursor-*` utility a component deliberately set — `disabled:cursor-progress` on a submitting button, `cursor-not-allowed` on a locked permission cell. In `base` it lands after Tailwind's own preflight (same layer, later source order) and still loses to `utilities`, which is the precedence a default wants. Measured: zero controls on the contact page report anything but `pointer`, in all twelve size × locale × theme combinations.

## Decision D11 — Required contact fields, and the schema that follows

The public form now requires **name, telephone, message type and body**; the email address is optional. Owner's decision, and it matches how a reply happens: `contactMessages.replyChannel` is `Email | Phone` and a citizen reachable on neither is a record nobody can close.

Enforced in `CreateContactMessageDto` as well as in the form. Validating in one place only means either a form that accepts what the API rejects, or an API that accepts what no form can produce.

Two consequences worth stating plainly:

* **`senderEmail` had to become nullable in the Mongoose schema.** `required: true` would turn every phone-only submission into a ValidationError — a 500 the citizen reads as *"the message could not be sent"*. Widening a stored field is safe for rows that already have one.
* **`senderPhone` deliberately did NOT become `required` in the schema.** Every message stored before today was accepted without a telephone, and a schema-level requirement would fail the next time a staff member saved a reply onto one of them. The DTO is the only public write path, so enforcing it there enforces it everywhere it can be enforced without breaking rows that were legitimate when they were written.

These two fields carry bilingual `message` strings, which nothing else in the API does. ADR-0058 makes `code` the thing a client branches on and leaves `message` for a human reading a log; these two changed meaning, so an integrator built against the old contract is told what happened in a language they read rather than by a bare English default from class-validator.

---

## Decision D12 — The control's height is the token, and the label lands on the floor

Two numbers this ADR asserted turned out to be true only where they had been measured.

**The control is 48px, and now actually is.** `min-height` is a floor, not a height: `--space-3` above and below a 25.6px line box plus two 1px borders came to **51.59px** in Chrome at every width above 390, while the label travelled `--space-12 ÷ 2` = 24px and therefore sat 1.8px above the centre line this file says it is on. The padding is now computed from what is left — `calc((var(--space-12) - 1lh - 2 * var(--border-width-default)) / 2)` — so the type keeps the role Chapter 4 gives it and the box comes out at the height the travel is derived from. Measured after: **48.00px**, label at 24 resting and 0 floated, on every field and every width.

**The floated label lands on 13px, at both body sizes.** `--field-label-scale` was a single `0.8125`, which is 13 ÷ 16 and correct for `--font-size-body-desktop` alone. `--font-size-body-mobile` is 15px, so every field on every phone floated its label at **12.19px** — under Chapter 4 §4.10's *"13px, no text smaller than this anywhere"*, whose only exceptions (ADR-0041) are a club crest and a membership caption. On both applications, since the notched label shipped. There is now one scale per body size, each landing on 13, and the arithmetic is done by the guard rather than asserted by a comment — a comment asserting exactly this is what let it ship. Measured at 1440, 768 and 390: **13px** at all three.

**Conflict to report (§1, §24):** the token package ships `--font-size-label-mobile: 12px` and `--font-size-caption-mobile: 12px`, both below §4.10's floor and neither among ADR-0041's two named exceptions. Chapter 4 outranks the tokens. Not resolved here — the field no longer depends on those two tokens, and whether the *roles* change is a design-system decision, not a field decision.

## Decision D13 — A control's box is its hit area

`.field-shell` centred its input, so a 26px input sat inside a 48px box and the top and bottom 11px of a control that plainly looks 48px tall accepted no tap. Measured on the login form: `input 356x26`. The entry controls now `align-self: stretch`; nothing about the painted result changes, because an input centres its own text in whatever box it is given.

It went unnoticed because the public site has no shell — there the input *is* the `.field-control`, so the question never arose. One mechanism, two compositions, and only one of them had the defect: the argument for measuring both surfaces rather than reasoning from one.

## Consequences

* One field mechanism, one pointer default and one hero composition now span both applications. A change to any of them is one edit.
* `PageHero` gained a data dependency: `loadStaticPage` resolves `heroImageId` through `fetchPublicMedia`, which makes no request when the id is absent.
* Eleven route files pass `heroImage` through. Explicit rather than a second fetch inside the shared screen — the data flow is readable, and Next's fetch memoisation is not load-bearing.
* `motion-contract.spec.ts` now walks `packages/design-tokens/css` as well as `apps/web/src`, and names the three stylesheets it must find. A guard that stops covering the file it was written for still reports green, which is worse than no guard.

## Pending

* **DESIGN SYSTEM GAP — `semantic.error-text`.** D8. Until it exists, error messages are primary ink on both surfaces.
* **PENDING FIGMA BACK-SYNC.** The hero-with-photograph state of `PageHero`, the opening sequence's stagger table, and the notched select have no Figma frame. Contact hero frame `2616:1382` is still pending from ADR-0066.
* **CLOSED — the dashboard's ad-hoc controls.** `page-editor`, `media-picker`, `create-user-form`, `user-directory` and `status-control` now go through `TextField` and the new `SelectField`. `role-workbench` was named with them and turned out to hold no raw control at all: its editor delegates to `BilingualField`, and its remaining interactive parts are a segmented control and selectable rows, neither of which is a field. Five selects were replaced — three of them 40px tall against WCAG 2.5.8's 44px floor, two hiding their label from sighted readers behind `sr-only`, and all five drawing `--color-border-default`, which measures 1.15:1 on the raised surface where §1.4.11 requires 3:1. `field-standard.spec.tsx` now fails any `<select>`, any text `<input>` and any hand-set control height outside the components that define the pattern.
* **CLOSED — §F.4 on the dashboard.** D7a, D7b.
* **DECISION REQUIRED — `--button-primary-text` on the dark theme.** `#000000` on `#00843D` measures **4.37:1**, under WCAG 1.4.3's 4.5:1, on every primary button and primary-styled link in the dark theme. The background is byte-identical across all three themes and the other two already ship `#FFFFFF`, which measures **4.81:1**. Measured on twelve dark-theme combinations of the dashboard's three auth screens. Not changed here: it is a token value under §16, and reporting it is what §1 and §24 require. One-line fix if the owner accepts: `--button-primary-text: #FFFFFF` in `dark.css`.
* **Fixed in passing — the password reveal button.** It measured 40x40, under WCAG 2.5.5 and IA §12's 44px floor. The field's shell dropping its own vertical padding (D5) left room for the 44px it should always have been: 44 + the shell's 4px end padding is exactly the control's 48px height.
* **Pre-existing — touch targets in the header and footer.** Measured on every combination: the footer's link rows are 16px tall and its five social icons 32×32, and the header's search button is 42×44. Chapter 3 §3 lists both as areas not to redesign without evidence; this is that evidence, recorded for a slice of its own. Zero targets in any page **body** are under 44px.
* `--color-semantic-success` `#238A48` at 4.37:1 on white — open since ADR-0066.

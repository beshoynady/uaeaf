# ADR-0064 — The Contact Page, and the Five Conflicts in Figma Section 9

**Status:** Accepted
**Date:** 2026-09-09
**Owner approval:** explicit, on C2 and C1/C3, before any code was written.
**Source:** Figma `hpO727vjwl18g3s3LTICAY`, section `2616:1382` ("Section 9"), six frames.
**Companion:** `docs/design-specs/page-contact-us.md` — the extracted measurements.

---

## Context

The six frames for this page — AR and EN at 1440 / 768 / 390 — do not agree with
each other. Five conflicts had to be settled before "match the design" meant
anything. Two of them changed what the page is; the other three were defects in
one frame that every other frame contradicts.

---

## C1 — The hero heading was invisible, and is not any more

The AR desktop frame centres its title block at y≈365 inside a 411px box while
the card row begins at y 341.6 and stands ~176px tall. Rendering `862:445`
confirms it: no heading appears, and only a fragment of the subtitle shows
between two cards.

EN desktop places the same block at `top 0`; AR tablet puts it at y 40; AR
mobile at y 32. Four frames agree and one does not.

**Decision.** The heading sits above the cards at every width. An `<h1>` covered
by four opaque cards fails WCAG 2.4.6 and leaves the page's own name out of
what a crawler renders — it is a stacking error, not a composition.

---

## C2 — Four cards, four schemes, two colours that are not ours

| Frame | Phone | Email | Location | Working Hours |
|---|---|---|---|---|
| AR desktop | white surface | `#00843d → #005c2e` | `#14b8a6 → #0f766e` | `#2563eb → #1e40af` |
| AR tablet / mobile | green | green | teal | blue |
| EN desktop | `green-500 → green-600` (token-bound) | same | same | same |
| EN tablet | green | teal | blue | green |

`#14b8a6` / `#0f766e` and `#2563eb` / `#1e40af` are Tailwind's default
`teal-500/700` and `blue-600/800`. They are not in the UAEAF palette. `#005c2e`
is not a step of the published green ramp either (600 is `#006b31`, 700 is
`#005226`). Chapter 1 ADR-0003 fixes the identity as green, red and black, and
ADR-0050 budgets colour at ~70–80 % neutral / 15–20 % green / ≤5 % red.

**Decision — the owner chose a gradation inside the published green ramp.** Each
card is a two-stop gradient one step apart:

| Card | Gradient | White text on the lightest stop |
|---|---|---|
| Phone | `green-500 → green-600` | **4.81** |
| Email | `green-600 → green-700` | **6.67** |
| Location | `green-700 → green-800` | **9.40** |
| Working Hours | `green-800 → green-900` | **12.95** |

`green-500` is the lightest step that can carry white text at all — `green-400`
measures 3.91 and fails. First card against fourth measures 2.69:1, so the
gradation is visible rather than nominal. Guarded by
`contact-card-contrast.spec.ts`, which also fails if the component starts
painting from outside the ramp.

The text on these cards is `--color-text-on-brand`, not `--color-text-inverse`.
The second flips to black in the dark theme while the green ground — declared
once in `base.css` — does not; the guard caught that before it shipped.

---

## C3 — Two languages, two design iterations

The AR desktop frame is materially richer than the EN one: a gradient section
ground, a glass form card with a green-tinted border and accent bars, icons
inside every input, an inner shadow on the controls, a gradient submit button,
and a tinted panel behind the map. The EN frame has none of these.

**Decision — the AR treatment is the reference and English mirrors it.** It is
the frame the owner sent as "the design", and CLAUDE.md §12 does not allow the
two languages to ship as different products. English therefore gains the accent
bar, the input icons, the gradient submit and the map panel, none of which its
own frame shows. Recorded as **PENDING FIGMA BACK-SYNC**.

The column composition already mirrored correctly and was left alone: both
frames put the map at the reading start — right in Arabic, left in English —
which one `flex-row-reverse` reproduces without a locale conditional.

---

## C4 — The map pin subtitle was 11px

Chapter 4 sets a 13px floor and ADR-0041 documents two exceptions, neither of
which is this component. Rendered at `text-caption`. No decision was needed:
WCAG and Chapter 4 outrank a frame value.

---

## C5 — Two dead artefacts, recorded so they are not mistaken for intent

`Contact Cards Row Hidden` (`1192:2590`) sits inside AR desktop's
`Contact Content` at height ≈ 0, holding a second white-card copy of all four
cards. And that `Contact Content` declares `h 763` while its only real child is
`h 888` — a 125px overflow. The EN frame is internally consistent
(1088 = 120 + 888 + 80) and is the arithmetic the page was built to.

---

## Consequences

### Deviations from the frames, and why

- **Hero title size.** The design ramps 28 / 28 / 56. The approved scale has no
  28 step at `md`; `text-display-l` is the Text Style whose desktop value is the
  designed 56, so it is the binding, and tablet renders at 56 rather than 28.
  §8 forbids choosing a size by nearest numeric value.
- **EN typeface.** The EN frames are set in Inter. The approved Latin face is
  IBM Plex Sans (Chapter 3); Inter is a Figma-side placeholder and was not
  introduced.
- **Section gutter.** The design's 96px margin is reproduced by capping content
  at 1248px inside the project's own gutters: at the 1440 root frame that is
  exactly 96px a side, and narrower viewports keep the gutters every other page
  uses rather than a value only this page knows.
- **Map panel and section ground.** Built with `color-mix` over a theme surface
  rather than flat `green-50` / `green-100`. Those steps are one value for all
  three themes — right on the cards, which sit on their own saturated ground,
  and wrong on a panel, which stayed a bright patch on a near-black page while
  its `green-700` button text landed at 1.99:1. Caught on a live browser in the
  dark theme, not in review.

### Schema

`contactUsPage` gained `locationSummary`, `cardLabels`, `form` and `map`.
`form.messageTypeLabels[].value` is constrained to `CONTACT_MESSAGE_TYPES`, the
vocabulary `contactMessages` already validates submissions against — an editor
may relabel and reorder the options but cannot introduce one the submission
endpoint would reject.

`contactMessages` gained an optional `subject`, because the designed form has a
Subject input and the endpoint had nowhere to put it — a citizen's text would
have been accepted and silently dropped. **This is a divergence from the live
FigJam physical model and needs back-sync.**

### Still open

- **`mediaAssets` has no admin screen.** The dashboard reads the library to
  populate the picker and cannot create an entry, so `heroImageId` and
  `map.imageId` cannot be filled by an editor at all. The page renders without
  either — a black hero ground and an empty map frame — which is correct
  behaviour for an unset reference, not a substitute for the screen.
- **PENDING FIGMA BACK-SYNC.** The English treatment decided in C3, the green
  ladder in C2, the heading placement in C1 and the 13px pin subtitle in C4 all
  differ from what the file currently shows.

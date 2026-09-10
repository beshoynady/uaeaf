# ADR-0066 — The Raised Surface, Its Interaction, and the First Screen

**Status:** Accepted
**Date:** 2026-09-10
**Supersedes in part:** ADR-0065 D5 (the lift's direction and timing)
**Depends on:** ADR-0009, ADR-0052, ADR-0059 §D2/§D7, Chapter 3 §3.14, Chapter 5 §5.6/§5.11, Chapter 6, Chapter 7 §7.3, Chapter 8 L2 §F.1/§F.3/§F.4, Chapter 11 §UX

---

## Context

The public application had four different answers to one question — what does a raised object look like here?

| Surface | Edge | Elevation | Hover |
| --- | --- | --- | --- |
| `ui/Card` | `--color-border-default` | `card → card-hover` | a hand-written 2px diagonal translate |
| Contact hero card | `--color-border-strong` | `--elevation-card` | `.lift` (4px diagonal) |
| Contact form panel | `--color-border-default` | `--elevation-dropdown` | none |
| Contact map panel | `--color-border-default` | `--elevation-dropdown` | none |

Each was defensible where it was written. Together they meant a reader moving between two pages could not learn what a card is on this site, which is the definition of an inconsistent system.

One of the four differences was not a matter of taste. `--color-border-default` (`#E0DFDB`) measures **1.15:1** against `--color-surface-raised` (`#FFFFFF`). WCAG 2.1 §1.4.11 Non-text Contrast requires **3:1** for the visual boundary of a user-interface component. Every form control resting on that token was failing — not looking weak, failing.

---

## Decision D1 — One raised-surface recipe, in one module

`apps/web/src/components/ui/surface.ts` is the single place where a raised object's edge, ground and elevation are decided. A page component may use a recipe, extend it, or override one property; it may not restate the whole thing. Enforced by `surface-standard.spec.ts`, which also fails if any literal colour, radius or duration appears in that module.

* **Edge** — `--color-border-strong`. Measured live: **4.68:1** on the light theme, **3.48:1** on the dark, and High Contrast overrides it to `#000000` at 2px (Chapter 7 §7.3). `strong` is the edge of an object; `default` and `subtle` remain the rules *between* things that are not objects.
* **Ground** — `--color-surface-raised`, with `--color-surface-sunken` for a recess cut into a panel.
* **Elevation** — the *semantic* names only. The primitives `--elevation-1..4` are theme-invariant, so a card drawn with one keeps a 6 %-opacity black shadow on the dark theme (ADR-0052 raises it to 40 % for a reason) and grows a shadow under High Contrast, which carries elevation on solid borders alone.

## Decision D2 — `elevation.panel` and `elevation.panel-hover`

The theme-aware ladder had `card`, `card-hover`, `dropdown` and `modal`, and none of them named a large container standing *in* the flow. The form and map panels therefore borrowed `--elevation-dropdown`: the right value under a name that described a different object, which is how a form ends up documented as a menu.

Added to `tokens/semantic/colors.{light,dark,high-contrast}.json`:

| Token | Light | Dark | High Contrast |
| --- | --- | --- | --- |
| `elevation.panel` | `{elevation.2}` | `0 2px 8px rgba(0,0,0,0.45)` | `none` |
| `elevation.panel-hover` | `{elevation.3}` | `0 4px 16px rgba(0,0,0,0.55)` | `none` |

No new primitive. Chapter 3 §3.14's five-level cap is untouched; the dark values follow ADR-0052's rule that a dark surface needs a far higher opacity to register at all; High Contrast follows Chapter 7 §7.3.

## Decision D3 — The hover is vertical, and answers on three signals

**Direction.** ADR-0059 §D7 fixes the identity's angle at 45° and §D7.1 forbids mirroring *motion derived from The Rise*. Neither requires every interaction to travel that vector, and on a grid the horizontal half is actively wrong: cards in a row share left and right edges, so a card sliding sideways breaks the row's alignment and the eye reads the **row** as jittering rather than the **card** as raised. Under RTL, where §D7.1 correctly forbids mirroring, the card drifts toward the *end* of the line — away from the reading edge, which is the opposite of coming forward.

The rise is therefore `translateY(calc(-1 * var(--motion-ascent-offset) / 4))` — the same 4px magnitude, vertical. The diagonal keeps `.rise-in` and `.rise-scroll`, which are the motions genuinely derived from The Rise and where §D7 bites.

**Timing.** `--motion-duration-instant` (100ms). Chapter 5 §5.6's table maps INSTANT to "Simple Hover" and FAST (150ms) to "Focus, Toggle"; the lift had shipped on FAST — the wrong rung, and invisible as a defect because both are tokens.

**Signals.** Depth alone is the weakest signal available: a shadow is what a low-vision reader is least likely to see, and on the dark theme ADR-0052 has to raise its opacity sevenfold to make it register at all. So three things change together:

1. the card rises 4px and its elevation cross-fades `card → card-hover`, through an `opacity` transition on a pseudo-element so ADR-0009's transform/opacity restriction holds literally rather than approximately;
2. the edge takes `--color-brand-primary` — Federation Green at the point of interaction, the approved role (ADR-0065);
3. the icon inverts: the glyph is `--color-green-500` on `--color-surface-sunken` at rest (**4.37:1**, above the 3:1 non-text floor in both themes) and becomes `--color-text-on-brand` on `--color-brand-primary` when the card is live (**4.81:1**). One green, two arrangements — a larger visual event than any hue swap, inside one approved role.

`--color-green-500` is `#00843D`, the same value as `--color-brand-primary` under a name that is not the identity token: `token-contract.spec.ts` keeps the identity out of text utilities, and the codebase already takes this route for the red map marker.

A disabled control answers nothing: `:hover` still matches a disabled button in every engine, so `.lift` explicitly returns a disabled element to rest.

## Decision D4 — Two panels in a row end at the same height

A row whose panels stop at different heights reads as one of them being unfinished, and no amount of care inside either fixes the impression.

`PANEL_ROW` stretches; `PANEL_TALL` lets a panel share the row; `PANEL_FILL` marks the one child that absorbs the slack — the map frame, the message box. Empty padding at the bottom of the shorter panel would make them equal and say nothing; a bigger map and a roomier message box are the only readings of that space a visitor would welcome.

Two constraints learned by measurement rather than reasoning:

* `PANEL_ROW` sets **no direction at any breakpoint**. It briefly set `xl:flex-row` while its one caller set `xl:flex-row-reverse` — two utilities for one property, where the winner is decided by the order Tailwind happens to emit them in rather than by either author.
* `PANEL_FILL` pairs with `min-h-*`, never a fixed `h-*`: `flex-1` resolves the basis to zero and a fixed height cannot stop it, which collapsed the map frame to a sliver.

Symmetry applies **only where there is a row**. Below `xl` the panels are stacked, and forcing a stacked map to match the form's height would be symmetry applied where no row exists.

## Decision D5 — One hero composition, and the first screen

**Composition.** The title block holds the reading edge and the motif answers it from the far side, both anchored to the same baseline. The motif has a column of its own rather than sitting behind the text: artwork behind text changes the measured ratio of every character it passes under, and Chapter 6 puts WCAG AA above composition. Two columns cannot overlap at any width, so the published register ratio holds at every breakpoint without being re-measured per viewport. The contact page's centred stack is retired — it made that page the only one of twelve that did not look like the others.

**Height.** A hero that owns the first screen is `min-h-[calc(100svh - var(--space-24))]`.

* `svh`, never bare `vh`: on a phone `vh` measures the viewport with the browser chrome *hidden*, so a `100vh` hero is taller than the screen the reader is looking at until they scroll, and the content that was supposed to fit is pushed off by exactly the height of the URL bar.
* `var(--space-24)` is the header's own `h-24` — a fixed 96px that never shrinks — so the height is derived from a token rather than a literal.
* Chapter 5 §5 caps a mobile hero at 90vh "to avoid completely hiding the content below it on initial load". Satisfied by construction and confirmed by measurement: at 390×844 the hero is **748px** and 90vh is **760px**.

**And it is opt-in, which is the part worth recording.** A hero that owns the screen must have something to fill it. The contact page's does — a photograph and four contact cards — and reads as one composed opening, measured at exactly 0px of gap on all three breakpoints. Applied to the eleven typography-led heroes (§3.34.2 names the Quiet/Institutional pages exactly that), the same rule turned an 804px band into a flat register field holding a title and one line of subtitle above roughly 550px of nothing — the dead space the height rule exists to remove, arriving through the rule itself. `PageHero` therefore takes `fillsFirstScreen`, default off, and the flag is one edit away for each page that gains hero imagery.

## Decision D6 — The field label sits on the edge of its control

Chapter 8 L2 §F.1 fixes the DOM order `Label → Control → HelperText → Error` as a MUST. Only the painted position moves: the label starts vertically centred inside the control and travels to the top border, where the outline opens a gap for it, and it **never disappears**.

This is deliberately not the floating-label pattern that replaces a label with a placeholder — that one fails at the moment it is needed, when the reader returns to check the third of six fields and finds their own answer where the question used to be. Here the label is readable while typing, while correcting, and while reading the finished form back. The placeholder, hidden at rest, appears only once the label has moved out of its way.

Every movement is a `transform`: the obvious implementation animates `top` from 50 % to 0, and `top` is a layout property that ADR-0009 and Chapter 5 §5.6 exclude. The label sits at a fixed centre and travels half the control's height, which is why the control's height is `--space-12` (48px — also above WCAG 2.5.8's 44px floor) rather than whatever its content happens to need. The floated size is the resting size scaled by 13⁄16, the ratio between `--typography-label-*` and `--typography-body-*`, written as a number only because `calc()` cannot divide one length by another.

Measured, both themes, both states:

| | Light rest | Light focus | Dark rest | Dark focus |
| --- | --- | --- | --- | --- |
| Label | 8.22:1 | 21:1 | 11.03:1 | 15.6:1 |
| Value | 19.09:1 | 21:1 | 20.09:1 | 15.6:1 |
| Placeholder | hidden | 9.04:1 | hidden | 8.57:1 |
| Edge | 4.25:1 | 4.81:1 | 4.49:1 | 3.39:1 |

**The required asterisk is drawn in `--color-text-primary`, not the error red.** Red at 13px bold measures **3.95:1** on the dark theme's panel and fails 1.4.3; the glyph carries the meaning without the colour in any case (1.4.1), and §F.4's pairing of `*` with `aria-required` is unchanged. The error red stays for actual errors, where it means something.

## Decision D7 — Glass is governed, not banned

`UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §138 lists *excessive* glassmorphism among the things to avoid. Two rules follow from that and from physics:

1. **Blur only where there is something to see through.** A translucent panel over a flat colour returns that same flat colour: the reader gets no depth and the compositor gets a layer it has to keep. `GLASS_OVER_ART` is for a surface standing on a photograph — the contact hero's pinned cards — where the effect is real.
2. **Contrast under a translucent surface is measured over what is actually behind it.** The hero card's 12 % white and the band's 0.64/0.74 overlay remain one decision, solved against the worst admissible input (a pure-white photograph) and guarded by `contact-card-contrast.spec.ts`.

On a flat ground the three-dimensional feel comes from the light-catching edge — a hairline of the surface's own light along the top — which costs no layer. Both alphas are expressed as `color-mix(in srgb, var(--color-text-on-brand) N%, transparent)` so the colour comes from a token and only the composition parameter is a number.

---

## Consequences

* `ui/Card`, `ui/PageHero`, and all four contact components consume one module; the site-wide edge and elevation are one edit away from changing everywhere.
* `surface-standard.spec.ts` adds thirteen rules covering the recipe's token purity, the readable edge per class string, a single definition of the hover, the hover's timing rung, the ascent vector's placement, panel symmetry, and the `svh` unit.
* `contact-card-contrast.spec.ts` now resolves imported recipes and `color-mix()`, so the probe measures what the browser composites wherever the value is written. Proved by reintroducing the weak edge and watching it go red.
* Verified live at 390 / 768 / 1440 × Arabic / English × light / dark: zero contrast failures, zero touch targets under 44px, zero horizontal overflow, header + hero exactly the screen height on the contact page, and the four contact cards fully inside the first screen.

## Pending

* **PENDING FIGMA BACK-SYNC** — the contact hero's centred title block (frame `2616:1382`) is now start-aligned to match `PageHero`, and the hero is the first screen. Both were directed by the owner and derive from an approved in-repo precedent; neither has a Figma frame yet.
* **`fillsFirstScreen`** is off for the eleven typography-led heroes pending a decision on hero imagery for them (D5).
* **`--color-semantic-success`** at `#238A48` measures 4.37:1 on white — an open item predating this ADR.

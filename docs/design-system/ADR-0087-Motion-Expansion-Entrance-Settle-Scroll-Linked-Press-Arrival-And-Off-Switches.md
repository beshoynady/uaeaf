# ADR-0087 — Motion, widened where it was narrow for no reason and left alone where it was right

| | |
| --- | --- |
| **Status** | Accepted (owner batch, 2026-09-18). Each decision says whether it is built. |
| **Amends** | Chapter 5 §5.6, §5.7 and a new §5.15 · Chapter 3 §3.14 · Chapter 8 L3 (pending navigation) · ADR-0066 (the pressed state of a raised card) · adopts Chapter 27 §34 within limits |
| **Does not amend** | ADR-0009 (`transform` and `opacity` only) · Chapter 5 §5.8 (reduced motion) and §5.9 (no layout shift) · ADR-0076 D4 (no hidden start state in the server's HTML) · Chapter 5 §5.6's 100–220ms for interactions · the reservation of `motion.transition.celebratory` · ADR-0069 D9 (`ambient` and its one authorised use) |
| **Authority** | Owner decision on the diagnosis of 2026-09-18. No rule is deleted. Each is widened with the reason it was written still in view. |

---

## Context — what was measured

Nine pages and one real navigation were walked on 2026-09-18.

| What a visitor meets | Measured | Its cause |
| --- | --- | --- |
| Moving between two pages | A hard cut at +261 to +455ms, no frame blank, no animation across it | §5.6 names `SLOW` "Full-page transition" and nothing consumes it. A capability nobody used, not a rule |
| The homepage hero | Its words arrive with no opening; the three built heroes' words settle in `HERO_STAGE`'s order. Its picture already moves (see D9) | `HERO_STAGE` was never applied to it |
| Sections | Every block rises 16px over 220ms, 41 times on one page; nothing crosses a seam | §5.6 lists 220ms as "Modal, Drawer", and it was the nearest number |
| Controls | 52 to 70 per page change colour only; no control has a pressed geometry | §5.6 has no row for a press |
| A settle with overshoot | Appears on no page | §5.6 reserves the curve for a medal |

Three of the five are an absence of use. Two are rules, and both are about *kind*: §5.6 times every motion as a transition that interrupts a reader who is waiting, and an entrance does not.

What cost nothing, and therefore stays exactly as it is: `transform` and `opacity` only, no layout shift, the complete static alternative under reduced motion, no hidden start state from the server, and 100–220ms for anything a reader is waiting on.

---

## D1 — A duration for entrances (ADR-A)

**Rule as it was.** §5.6 has six durations, 100ms to 1200ms, and Chapter 3 §3.14 caps them at six to stop tokens multiplying.

**What it stopped.** A row arriving below the fold in a time that reads as arriving. At 220ms a lateral arrival is a twitch.

**Widened.** `DT-MOTION-DURATION-ENTRANCE` = **720ms**. §3.14 goes from six values to seven, as ADR-0069 D9 took it from five to six.

**Still protected.** It times the arrival of a row of content below the fold and nothing else: never above the fold, never an interaction, never a change of state. The content is visible before it moves. Under reduced motion it is 0ms, by the same build step as every other duration.

**Built:** the token. First consumer arrives with D4's replacement for `.rise-scroll`.

## D2 — The spring curve, conditionally (ADR-B)

**Rule as it was.** `DT-MOTION-EASING-SPRING`: "Celebratory moments only (medal, record)". It was written so that a medal keeps its distinction.

**What it stopped.** Describing a body that settles after moving, in a federation whose subject is bodies that do.

**Widened.** The *curve* and the *composite* are separated. `motion.easing.spring` may be used for the settle of athletic content entering (athlete cards, result rows, events) when all four hold: six elements or fewer · no running text · no tabular data · not a Level 1 (Quiet) page. `motion.transition.celebratory` — the curve, the 480ms and the 0.94→1 scale together — stays for the medal and the record alone.

**Still protected.** The celebration is told apart by its composite, not by the curve, so widening the curve does not make it ordinary. An earlier proposal to lift the reservation outright was wrong for exactly that reason and is withdrawn.

**Built:** no. It has no consumer until the owner rules on the cinematic partners row.

## D3 — Scroll-linked motion has a door (ADR-C, new §5.15)

**Rule as it was.** None. Chapter 5 was silent, and ADR-0076 D4 put "scroll reveal" in the library's column with no limits written.

**What the silence cost.** Every use was a deviation by omission rather than by rule.

**Widened.** §5.15: `transform` and `opacity` only · progress from `useScroll` where Firefox must see it (scroll-driven CSS is not Baseline and Firefox has none), from `view()` otherwise · never as an entrance above the fold (the owner's standing rule) · the static alternative is the end state · content is never hidden by it: a translate for content, and an opacity only on something the server did not send hidden.

**Still protected.** ADR-0009, §5.9, Chapter 14's indexability.

## D4 — The stagger ceiling below the fold (ADR-D)

**Rule as it was.** §5.7: 40–80ms a step, 600ms in total, because a slow sequence delays content a reader is waiting for (PR-002).

**What it stopped.** A row already in view taking a stagger and an entrance, which together pass 600ms.

**Widened.** The ceiling still bounds the *stagger*: 600ms, eight elements, 40–80ms a step. Below the fold the entrance's own duration is counted separately from it. Above the fold and on load nothing changes.

## D5 — An entrance is not a response (ADR-E)

**Rule as it was.** A card that does nothing when clicked answers nothing (`organization-card.tsx`; `LIFT`'s own comment; Chapter 11): feedback without an action is a false affordance. Right, and it stays.

**What it stopped.** Read widely, every motion on such a card, including an arrival that promises nothing.

**Widened.** *Response* — hover, focus, press — stays forbidden on an inert surface. *Entrance* is permitted on it.

**Still protected.** No lift, no arrow and no pointer on anything that is not a control.

## D6 — The press

**Rule as it was.** §5.6 has no row for it. ADR-0066 gave a raised card `.lift:active`, which brings it back to rest: "a second, deeper hover state reads as a different component".

**What that left out.** Under a finger the card never rose, so coming back to rest is no movement at all, and a plain button had no pressed geometry of any kind. The layer is mobile-priority (PR-006).

**Decided.** A control goes down by **`--border-width-default`** under the finger, over **`instant`** (100ms), and comes back when it is let go. One rule in `motion.css`, on `button`, `[role="button"]`, a link drawn with `--button-radius`, and `.lift`; never on a disabled control.

**Why a distance and not a scale.** A scale grows with the control: at 0.98 the 600px panel's edge moves 6px, where ADR-0067 D1 holds a card's edge under 4px, and a 44px icon button moves 0.44px, which is nothing. One edge width is the same answer at every size, it is an existing token, and it is 2px in high contrast, where everything is drawn heavier. ADR-0066's objection was to a second *hover* state; a press past rest is contact, and it is the only thing a touch receives.

**Measured 2026-09-18**, a real mouse button held on every target on six pages in both languages: **59 of 59** moved exactly one edge width down, 0px sideways, 0px in size. With `prefers-reduced-motion: reduce`: 0. With the switch off: 0.

**Built:** yes. `press-contract.spec.ts` holds the rule to its switch, its reduced-motion guard, its exclusion of disabled controls and its tokens.

## D7 — Arriving on a page (ADR-F)

**Rule as it was.** §5.6 names `SLOW` for a full-page transition; Chapter 8 L3 says the state shown while navigation is pending MUST be defined and SHOULD be a skeleton. Both right, and neither named a mechanism.

**Decided by the owner.** Stable tools only. `experimental.viewTransition` and `document.startViewTransition` are out of scope, for no defect in them. A layer sits *above* Next's navigation and never replaces it: out over 150ms (`accelerate`), in over 320ms (`decelerate`) along the ascent by 16px. No horizontal slide, in either direction: the ascent is physical and does not mirror (ADR-0059 D7.1), and a lateral slide is a trap under RTL. The header and the footer do not move.

**What this cannot do.** A shared element travelling between two pages needs the platform API. It is recorded as a limit, not attempted.

**The condition above all the others.** If the layer fails for any reason the navigation happens as it does today and no content is left hidden.

**Built:** no (item 5, one route first).

## D8 — The handover at a seam (ADR-G; adopts Chapter 27 §34)

**Rule as it was.** Chapter 27 §34 describes the signature device — the ascent's diagonal sweeping a seam — and is a draft; ADR-0075's seam strokes stand still.

**Widened.** §34 is adopted as a **masked layer moved by translation only**, never an animated `clip-path` (ADR-0009), tied to scroll over 128px (`--space-32`, the length ADR-0067 D4 fixed) under D3, at seams, never above the fold.

**Decided by the owner at the same time.** Chapter 27 §20 stands as drafted: dark sections are black with a whisper of green. No blue-violet ground.

**Still protected.** The 45° edge (ADR-0059 D7), no mirroring under RTL, the seam's edge in high contrast (ADR-0075 M0-A).

**The mechanism.** What moves is a *cover* in the colour of the ground above, lying over the band's own top padding and leaving along the reading direction behind a 45° cut; what it uncovers is the band's colour. Not a strip of the band's colour sliding in, which would leave a painted layer on the band for good. At rest the cover is laid out beside the strip, off its end (`start-full`), clipped away by the strip: rest needs no transform, so every way of not running the handover (no script, reduced motion, a hydration that has not happened) is the band as it always was, and the server never writes a transform.

Rest is the value `0%`, on purpose. The library writes no transform for a value that is its default, so a rest expressed as any other number fell back to the stylesheet's at exactly the moment the cover should have covered: the first build read as *gone* at the one position where it should have covered, measured live. The cover is pulled back over the strip by a share of its own width, `∓100%` while the seam is at the foot of the screen and `0%` once it has come in `--space-32` (128px).

The cut is a static `clip-path` polygon whose run equals its rise (`--seam-h`, the band's own top padding: 48px, 64px from `md`, 96px from `lg`, declared once in `motion.css`), so it is 45° and leans lower-left to upper-right in both languages: physical, not mirrored (ADR-0059 D7.1). Never an animated `clip-path` (ADR-0009). Progress is `useScroll` on the strip's own top, so a reader who arrives past the seam by a jump gets a cover already gone. Not drawn in high contrast or under forced colours, where a band draws its own top edge as a line (ADR-0075 M0-A).

**Where.** One seam: the top of the partners' green band on the homepage. Nowhere else until the owner has seen this one.

**Measured 2026-09-20 on Chromium, Firefox and WebKit**, the cut read from the pixels of real screenshots and compared with the geometry:

| | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| Cover position against the formula, 40, 64 and 90px in, both languages | exact | exact | within one pixel of scroll (it rounds scroll to its own grid) |
| Edge at 45°: a rise of 28, 52 and 54px moves it 28, 52 and 54px | yes | yes | yes |
| Gone: the strip is the band's colour, all 1440 pixels | yes | yes | yes |
| Reduced motion · no script · before hydration: the band's colour | yes | yes | yes |
| High contrast and forced colours: not drawn | yes | yes (no forced-colours emulation) | yes |
| Arrival by a jump: cover already gone | yes | yes | yes |
| Strip height equals the band's top padding at 1440, 800 and 390px (96, 64, 48) | yes | yes | yes |
| Layout shift through the seam | 0 | 0 | 0 |
| Console errors and hydration warnings | 0 | 0 | 0 |
| Cover has landed after a scroll | 18–202ms | 17–228ms | 66–298ms |

The last row is a lag, not a defect. A slow renderer applies a scroll several frames late (this Windows WebKit draws a frame in about 150ms), and the state the cover sits in meanwhile is rest, the band as it always was. Polled over time on WebKit it stayed at rest for 360 to 610ms and then landed within 0.4px of scroll of the formula; on every engine the measurement waited for the cover to land, up to four seconds, and it always did.

**Frame cost: none measurable.** Alternating A/B, the handover as built against `UAEAF_MOTION_OFF=seam` (the server renders nothing, so no scroll tracker exists), 3 loads a side, twice, through the seam and elsewhere on the page, median step:

| | through the seam | elsewhere |
| --- | --- | --- |
| Chromium | 33.4, 33.3ms against 33.3, 33.3ms | 33.6, 34.3ms against 37.3, 35.1ms |
| Firefox | 33, 33ms against 33, 33ms | 94, 92ms against 94, 94ms |
| WebKit | 155, 150ms against 158, 157ms | 171, 162ms against 181, 164ms |

Three things this section had to be corrected on, in order. A first comparison removed the element from the DOM to make its baseline; the tracker stays subscribed to a detached node, so both sides paid for it and the comparison could not have shown a cost. A fixed 4ms bar failed both non-native engines, on runs whose baseline moved from 33 to 39ms between two runs of the same code. And a cached read of `--space-32` was first credited with a saving that a controlled comparison does not support. What is left is the alternating A/B above. WebKit here runs about 160ms a step with no handover at all, so its figures can say *no difference* and nothing about smoothness.

**Found by running it, not by the tests: the homepage answered 500.** The library runs a transform's callback while the component renders, on the server too, and the callback read `window`. Every unit test ran under jsdom, which always has one. The spec now renders with `window` and `document` removed, and was seen failing for exactly that reason before the guard went in.

**Built:** yes, on one seam, behind `UAEAF_MOTION_OFF=seam`. Not generalised: that is the gate.

## D9 — The still hero's drift: already built, and the diagnosis that said otherwise was wrong (ADR-I)

**Corrected 2026-09-18.** The diagnosis behind this batch reported that the homepage's slides had no ambient motion and proposed a drift of `scale` 1→1.04 over the slide's dwell. **It was already there.** `hero-controls.tsx` runs `startKenBurns`: `scale(1)` to `1.06` (1.03 at and below 640px, where the frame is already a tight crop), linear, over `playback.intervalMs` — the editor's dwell, so a duration that is derived and not authored — frozen by the stop button and not played under reduced motion. The two script animations logged on that page (5000ms and 3800ms) were this and the dwell line, and were misread as the slide rhythm. Measured live: scale 1.0286 at 2.5s of a 5000ms dwell; nothing under reduced motion.

So nothing was built, and nothing needed widening: that move never used `motion.duration.ambient`, whose one authorised use (ADR-0069 D9) stands exactly as it was, guard included.

**What is kept from ADR-I** is the principle, for the next case: a slow move on a ground or a picture takes its time from the thing it accompanies, never from `ambient`.

## D10 — Every kind of motion added here can be put out without a build

`UAEAF_MOTION_OFF` is read by the server when it renders and reaches the page as words on `<html data-motion-off>`: `press`, `hero`, `seam`, `rise`, `route`, or `all`. The stylesheet matches a word; a server component that renders a motion's own element asks `motionIsOff(key)` and, when it is off, does not render the element at all. With nothing set the attribute is absent and the HTML is what it was.

**What it cost, stated.** Eleven pages read nothing from the API and were rendered once, at build time, so a value read while rendering would have been theirs for good. `app/[locale]/layout.tsx` therefore sets `revalidate = 60`: every page is rendered again at most once a minute, and the switch takes effect after the process restarts, one stale response a page later. Pages that read the API already revalidated at that interval. This assumes the site is run with `next start`; on a host that binds the environment at deploy time a change of variable is a deploy.

**What a switch does not cover.** Tokens and documents are not behaviour and have no switch.

**A trap in development, found the hard way.** Next's dev server reloads `.env*` when a file changes, but deleting the file does not unset what it had set. A check that ended by deleting the file reported the switch gone when the last value had simply been an unknown word. To clear it in a running dev server, write the variable empty or restart.

**Built:** yes. `lib/motion/switches.spec.ts`.

## D11 — A change of theme is not a transition

**Measured.** A toggle started 39 to 59 colour transitions that ran for about 400ms while every ground cut at once: half the page fading, half of it already changed. The toggle now marks the root for two frames and `motion.css` stops transitions under the mark. After: **0**, and a control hovered afterwards still transitions.

**Built:** yes.

## D12 — Tried, measured, and not shipped: `loading.tsx` at the locale

Chapter 8 L3 asks for a skeleton during a full-page transition, and one was built (the first-screen band, wordless, `aria-busy`, a token-timed pulse). With it in place **every unknown URL answered 200 instead of 404** — three of three, two rounds. This is Next's documented behaviour: a `loading` boundary streams, the headers are sent before `notFound()` runs, and the status cannot change afterwards. The page carries `noindex`, but Chapter 14 asks for the status, and this batch may not trade indexability for motion.

It was removed and the 404s measured back. The pending state the site has is the one measured in the Context: the page being left stays complete and in place until the next is ready, with no blank frame. L3 also permits "a lightweight progress indicator on the navigation bar"; that belongs with D7, which needs a pending signal of its own.

---

## D13 — The homepage hero opens as the other heroes do

**Decided.** On the first slide only, the eyebrow and title (step 1), the line (step 2) and the buttons (step 4) settle in `HERO_STAGE`'s order, 60ms a step, by the keyframe the portrait heroes already play: 16px along the ascent, 220ms, `decelerate`, `transform` only. A class and a number on elements that were already there. No element is added, nothing of the slideshow, the scroll-snap track or the controller changes, and the server sends nothing hidden.

**The blocks open, never the words.** The lanes move the words (ADR-0076 D8.3), and two animations on one `transform` leave only the last. A later slide opens nothing: its words arrive on the lanes, and an opening there would run again each time the slide became current. The picture has no step: its opening is D9's move, which starts as the page arrives.

**Measured 2026-09-18.**

| | With the opening | With `UAEAF_MOTION_OFF=hero` |
| --- | --- | --- |
| What opens | 4 blocks, delays 60/60/120/240ms, from `(-16, 16)` in both languages | 0 animations, `transform: none` |
| `e2e/home-hero.spec.ts` (the hero's own definition) | 14 of 14 | 14 of 14 |
| LCP, median of 5, dev mode | 2140ms | 2544ms |
| LCP element | the hero `<img>`, inside the camera layer, outside every opening block | the same |
| Layout shifts, 6 loads | 1 load, 0.040 | 2 loads, 0.078 and 0.009 |
| Reduced motion | 0 animations, all four blocks visible | — |

**About those shifts.** They land at or before first contentful paint and move the whole page, header included, with the opening off as readily as on. `e2e/vitals.spec.ts` pointed at `/` therefore fails intermittently in both states (2 of 3 runs on, 1 of 3 off, then 2 of 5 off). It is the page's own first-paint reflow in dev mode, it predates this, and it is not fixed here.

**One thing a camera cannot show in dev mode.** The first paint there arrives about 700ms after the blocks exist, by which time a 460ms opening has played. The frame series was taken by playing the same rule again after load.

**Built:** yes. `hero-opening.spec.tsx`.

## Consequences

- Chapter 5 §5.6 gains `ENTRANCE`, a press under `INSTANT`, and D2's wording for the spring; §5.7 gains D4; §5.15 is new.
- Chapter 3 §3.14 reads seven durations.
- Chapter 8 L3 records D12 beside its skeleton rule.
- Chapter 27 §34 is marked adopted within D8; §20 is unchanged.
- `motion.css` gains the press, the theme rule and `.hero-open`; `hero.tsx` gains a class and a step on four elements of its first slide. `.lift:active` is unchanged, and is what a raised card does when the press is switched off.

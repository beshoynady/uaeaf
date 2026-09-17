# ADR-0079 — The Scroll Cue on First-Screen Heroes

**Status:** **Accepted and built** — 2026-09-16, owner decision answering the debt recorded in ADR-0078 (*Consequences* 2).
**Date:** 2026-09-16
**Authority:** The owner, verbatim: «الرؤية والرسالة والخطة الاستراتيجية: القاعدة تبقى لكل هيرو. أضف علامة تمرير في أسفل كل هيرو بارتفاع الشاشة: مستوحاة من خطوط الشعار ومن الـtokens، تختفي عند أول تمرير، ثابتة بلا حركة في reduced-motion، غير قابلة للتركيز، و aria-hidden، لأنها تلميح بصري فقط، تباين ≥ 3:1 مقاس، ADR جديد + PENDING FIGMA BACK-SYNC، تحقق أنها لا تتعارض مع أدوات التحكم أو بطاقة الحدث على الموبايل.»
**Amends:** nothing. **Relies on:** ADR-0078 (first screen), ADR-0059 D7.1 (the ascent never mirrors), ADR-0069 D10 (the ribbons), ADR-0009 (transform only), Chapter 5 §5.8 (reduced motion).

---

## Context

ADR-0078 made every hero with a picture as tall as the screen less the header. On Vision & Mission and the Strategic Plan the hero grew from a band (628px at 1440×900) to 804px, so the start of the content is no longer in view on arrival.

## D1 — The mark

`components/ui/scroll-cue.tsx`: a 44px disc in `--color-surface-overlay` (black in every theme) carrying the logo's first two strokes, red then green, in the logo's order and spacing and at its 45° ascent (never mirrored), above a white chevron.

- **Contrast by construction, on any photograph:** the strokes and the chevron are measured against their own black disc, not against the picture. Red `#C8102E` on black 3.57:1, green `#00843D` 4.37:1, white 21:1.
- **One departure from the mark:** at 22px long, a stroke at the logo's own proportions is under 2px thick, so both strokes are drawn 3px thick.
- **A hint only:** `aria-hidden="true"`, a `span` with no tab stop and `pointer-events: none`. Scrolling is already every reader's own gesture.

## D2 — Behaviour

- **Hidden at the first scroll, and never shown again.** `visibility: hidden`, not a fade: nothing inside `<main>` may animate opacity (identity-lines guard). A restored scroll position hides it on arrival. Its animation goes with it (`animation: none`), so it leaves the page's animations.
- **Three nudges of `--space-2` along the block axis**, `--motion-duration-slower` each after one `--motion-duration-slower` wait: 1.92s in all, then still. This is under WCAG 2.2.2's five seconds. It was first built at 4.08s and shortened to lighten the identity-lines guard, which scrubs every animation on the page, 10ms at a time, to the end of the longest.
- **Correction (2026-09-17): the cue does lengthen that guard.** On the Strategic Plan the longest animation had been the hero ground at 1.2s, so the cue took the guard's photo measurement from about 122 frames to 194. Hidden with `visibility` alone, it also kept its finished animation through the measurement after the reveal (82 animations). The full run timed out at 180s in Arabic at 360×640, 375×667 and 1440×900. Dropping the animation once scrolled brings the post-reveal measurement back to 122 frames (`scroll-cue-guard-cost.spec.ts`). The measurement as loaded still runs through the cue's 1.92s.
- **Measured alone** (no suite running, Strategic Plan, Arabic 1440×900, the test's measurement copied into a script):

  | | As loaded | After the reveal | Whole test |
  | --- | --- | --- | --- |
  | Cue as built | 156.2s, 194 frames | 106.9s, 122 frames | **274.2s** |
  | Cue animation off | 88.7s, 122 frames | 71.2s, 122 frames | 168.6s |

  The test itself, alone, took 1.9–3.2 minutes across the five sizes that had failed, and all five passed. Nearest stroke: 84.3px (the rule is 32).
- **Decision (owner, 2026-09-17), taken in advance:** since the cue alone takes the test past 180s, this one test's timeout is the worst measured time plus 30%: `test.setTimeout(357_000)` in `identity-lines.spec.ts`. The cue's timing, the guard's logic and the 32px threshold are unchanged.
- **Pressure on the machine:** during the full run, free memory was down to 443MB of 8.1GB. The sixth timeout, a plain DOM read in `page-rules.spec.ts` on the Board Members page, was that and not the cue: rerun alone, it passed in 5.2s.
- **Rerun with 357s (2026-09-17):** Arabic 360, 375 and 1440 and English 1366 passed. English 1440 passed the 357s limit again, although the same test took 148.3s alone less than an hour earlier: three runs gave 148s, about 192s, and more than 357s. At that point the machine's browser used 3.4GB and 2.8GB sat in the page file. **Open, not fixed:** the timing depends on the machine's memory as much as on the page. CI runs on a runner with nothing else open, and is the reference for this test.
- **Reduced motion:** still.
- **Without JavaScript:** it stays. That is harmless, because it points at content that is there.

## D3 — Where it is drawn, measured

Free zone measured before placing (the bottom 72px of each hero, excluding text +32px, strokes +16px and the portrait):

| Hero | Placement | Why |
| --- | --- | --- |
| Vision & Mission, Strategic Plan | centred on the bottom edge, every width | centre free at 360–1440 in both languages |
| President's Message | centred on the bottom edge **from `lg` only** | below `lg` the portrait stands on the bottom edge: no free 56px at 768, 390 or 360 |
| Contact | **not drawn — documented exception** (owner decision 2026-09-17) | its cards fill the bottom of the hero at most widths (centre blocked at 1440, 390 and 360); the cards themselves say there is content |
| Homepage | at the far end of the controls row, above the next-event bar | the controls hold the start of the text column; the bar holds the foot |

Geometry check after building: 0 failures in 80 cases. The cue is clear of text, controls, portrait and strokes everywhere it is drawn, and hidden where stated.

## D4 — The two exceptions (owner decision 2026-09-17)

Contact at every width, and the President's Message below `lg`, carry no cue. The alternatives were rejected:

- **A reserve under the content** would make Contact's hero taller and lift the President's portrait off the bottom edge, an approved property of a built page, for the sake of a hint.
- **A place over the content** would cover the portrait or the cards' text.

The cue exists because Vision & Mission and the Strategic Plan lost the start of their content under ADR-0078. The President and Contact were first-screen heroes before ADR-0078 without a cue, so nothing regressed there; and every element over a picture has to earn its place (owner review 2026-09-16).

## PENDING FIGMA BACK-SYNC

The cue on the four heroes above at 1440 and 390, both languages, has no Figma frame.

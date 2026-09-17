# ADR-0076 — One Motion Library for the Site, and a Hero That Needs No JavaScript

**Status:** **Accepted** — 2026-09-16, by the owner, in the session that commissioned the hero: «Motion بشروطه». Proposed and accepted the same day; the analysis below is what he accepted, unedited, including the frank statement in D3 that the hero alone does not justify a library.
**Date:** 2026-09-16
**Authority:** The owner's brainstorm brief of 2026-09-16, §٣.٨: «الحركة: المالك يريد تجديدًا حقيقيًا، وأفكارًا جديدة، واستخدام مكتبات حركة — هذا يعني مراجعة قرار «نظام الحركة الواحد» في ADR-0075 بـADR جديد مقترح، لا تجاهله.»

**Reviews:** ADR-0075 «Motion, as built» — its "one motion system, no Framer Motion and no GSAP" ruling. This ADR does not delete that ruling; it re-opens it on the owner's instruction and on evidence ADR-0075 did not have.

**Amends, on acceptance:** nothing yet. Adoption is staged in D6 so that no built page changes in the batch that introduces the library.

**Does not amend:** ADR-0009 (Motion System Strategy — `transform`/`opacity` only) · Chapter 5 §5.7 (stagger budget) · §5.8 (reduced motion) · the owner's standing rule that no scroll-driven motion runs above the fold.

---

## Context

The site's motion is `apps/web/src/styles/motion.css` plus the `RevealOnce`
client component. ADR-0075 chose that deliberately and gave two reasons for
refusing Framer Motion: it would be a second motion system beside the three
built pages, and its server-rendered start state hides content from crawlers.

Both reasons were sound. One of them is about a **usage**, not a library, and
the distinction matters now that the owner has asked for a library.

Since ADR-0075 was written, one fact changed and one fact was measured that
nobody had checked.

---

## D1 — Measured: the current scroll system does nothing in Firefox

`motion.css`'s `.rise-scroll` is built on `animation-timeline: view()`, guarded
by `@supports`. Per `api.webstatus.dev` on 2026-09-16, scroll-driven animations
are Baseline **`limited`**:

| Chrome / Edge | Safari | Firefox |
| --- | --- | --- |
| 115 — 2023-07-18 | 26 — 2025-09-15 | **not available**; WPT stable score **0.09** |

Chapter 24 §1 requires the platform to support the latest two versions of
Chrome, Safari, Edge **and Firefox**.

The `@supports` guard fails open, so Firefox visitors see complete, correct,
motionless content. Nothing is broken and nothing is hidden. But a documented
browser-support requirement is not met, and the reveal rhythm that the built
pages were designed around is absent for a whole engine.

This is the objective half of the owner's request. The rest is taste, which is
the owner's to exercise.

---

## D2 — Measured: the three candidates

Sizes measured on 2026-09-16 by fetching each `dist` file from jsDelivr and
piping it through `gzip -9`. Licences read from the npm registry's `license`
field. Nothing here is recalled from memory.

| | CSS today | GSAP 3.15.0 | Motion 13.3.0 |
| --- | --- | --- | --- |
| gzip | **0** | core **28.3 KB** · ScrollTrigger **18.0 KB** · SplitText **3.6 KB** | full React bundle ~34 KB · **`m` + `LazyMotion` ~4.6 KB** · `motion/mini` 2.5 KB |
| Licence | — | **not MIT** — `"Standard 'no charge' license: https://gsap.com/standard-license"`. Free for commercial use since the Webflow acquisition; every plugin, SplitText included, is now free | **MIT** |
| Reduced motion | `@media`, by hand | by hand (`gsap.matchMedia()`) | `<MotionConfig reducedMotion="user">` — one root-level setting |
| Server Components | needs no JS | `"use client"` per animated section | `"use client"` per animated section |
| RTL | physical transforms, never mirrored | same | same |

---

## D3 — Decision: Motion 13, via `m` + `LazyMotion`

**Why not GSAP, even though SplitText is now free.** SplitText's decisive
capability is per-**character** splitting. That is forbidden in Arabic: splitting
a word into characters breaks joining and diacritic shaping, and Arabic is this
site's first language. What remains is per-**word** splitting, which is one
`<span>` per word emitted by the server and needs no library at all. So GSAP's
strongest card cannot be played here, and 49.9 KB plus a non-OSI licence buys a
capability the site may not use.

**Why Motion.** MIT. Seven times lighter at the entry point. `whileInView` works
in Firefox, which closes D1. And `<MotionConfig reducedMotion="user">` makes
Chapter 5 §5.8 compliance **structural rather than disciplinary** — a developer
cannot forget it in one component, because it is set once at the root.

**Stated plainly:** the hero alone does not justify a library. Every movement it
needs is expressible in CSS. What justifies the library is the owner's §٣.٨
decision for the site's motion system as a whole, and D1's measured gap.

---

## D4 — The two conditions, and how each is met

The owner's brief sets two non-negotiable conditions and requires the proposal
to prove them rather than assert them.

### Condition 1 — content fully visible without JavaScript; no hidden start state on the server

This is exactly ADR-0075's second objection, and **it remains correct**. But it
describes a usage: `<motion.div initial={{ opacity: 0 }}>` prints
`style="opacity:0"` into the server's HTML. Two written limits remove it:

1. **A hidden `initial` is forbidden on anything rendered by the server.**
   Permitted: `initial={false}` with `whileInView`, or imperative `useAnimate`
   after mount.
2. The hero of this batch **does not depend on the library for its structure at
   all** (D5). The library enhances; it never constructs.

### Condition 2 — exactly one library, with written limits

| Stays CSS (`motion.css`) | Goes to the library |
| --- | --- |
| Every interaction state: hover · focus · pressed · menus · the accent rule · the header | Sequenced entrances (stagger) |
| The 45° ascent vector and its tokens | The hero's timeline, and pausing and resuming it |
| Seams, registers and edges | Scroll reveal — the replacement for `.rise-scroll`, which is blind in Firefox |

No second library. GSAP is refused by this ADR, not merely unused.

---

## D5 — The hero is a scroll-snap track, not a JavaScript carousel

A conventional carousel violates Condition 1 by definition: it hides four slides
out of five.

Instead, one layer, not two. The track is a horizontal scroller with
`scroll-snap-type: x mandatory`; each slide carries `scroll-snap-align`.

| | Without JavaScript | With JavaScript |
| --- | --- | --- |
| Content | **every slide present, visible and reachable** by scroll, drag and keyboard | the same |
| Advance | manual | automatic via `scrollTo`, plus arrows, dots and a **visible stop button** |
| Layout | final, from the server | **identical** — therefore zero CLS |

No `opacity: 0` and no `hidden` on any slide in the server's HTML, and no
layout difference across hydration.

**Controls.** Autoplay pauses on hover, on focus, on touch and when the tab is
hidden. The play/pause control is always visible, at least 44×44 (WCAG 2.2.2 and
2.5.8). `prefers-reduced-motion: reduce` disables autoplay entirely; manual
scrolling remains.

**RTL.** The arrows as drawn in Figma are correct — `‹` means "next" in Arabic —
and are not "fixed". Horizontal travel follows the language, exactly as
ADR-0075 already set for the strategic plan's sliding picture; the 45° ascent
vector still never mirrors.

---

## D6 — `motion.css` and `RevealOnce`: replaced gradually, and no built page moves in this batch

- `motion.css` **stays**. Its role narrows to interaction, identity and tokens.
  It is not deleted and not emptied.
- The `.rise-scroll` block stays working until each page is migrated.
- `RevealOnce` does literally what `whileInView={{ once: true }}` does. It is
  deleted **with the page that migrates**, never globally.
- **The four built pages — Vision & Mission, the President's Message, the Board,
  the Strategic Plan — are not touched in the batch that introduces the
  library.** Their migration is its own batch, and each page re-runs its own
  guards (`page-rules`, `identity-lines`, `vitals`) before it is accepted.

Changing four approved, guarded pages in the same batch that introduces a
dependency would make a regression impossible to attribute.

---

## D7 — Page transitions: not now

Same-document View Transitions are Baseline `newly` (Firefox 144, 2025-10-14).
**Cross-document** View Transitions — the ones a page-to-page transition needs —
are Baseline `limited`: Chrome/Edge 126, Safari 18.2, **no Firefox**.

They would also buy nothing today: one page is published. Revisit when enough
pages exist for the transition to describe a relationship.

---

## D8 — The hero's transition: the signature wipe superseded, two prototypes compared, the lanes chosen

### D8.1 — The signature wipe — **Superseded** (2026-09-16, the same day it was built)

**What was built:** the current words left by word; a red band and then a green one crossed the frame at the logo's 45° in the reading direction; the next slide was uncovered by a diagonal `clip-path` along the green band's trailing edge; Ken Burns towards the focal point; the new words arrived by word. Timing tokens `textOut` 0–0.30s, `wipe` 0.22–0.90s (green 80ms behind), `reveal` 0.30–0.90s, `textIn` 0.78–1.20s. A code layer of the logo's lines stood over every slide at the top of the photographed side, on a corner wash so its red stroke reached 3:1 (measured 3.02–3.55 red, 3.73–4.34 green, 144 cases).

**Why superseded (owner review on the live page, 2026-09-16):** «انتقال الخطين العريضين الأحمر والأخضر: فكرة تقليدية جدًا، شكلها غير احترافي»; the small identity lines over the picture were not what was meant: the identity belongs **inside the photograph** (flag-colour powder behind the athlete, national-team kit). The wipe, the reveal geometry, their timing tokens and the lines layer (`hero-lines.tsx`, its corner wash and CSS) are removed from the code. Their tests went with them; the tests of what stayed (focal point, `ltrImageMode`, navigation) were kept.

### D8.2 — Two prototypes under comparison — **Superseded by D8.3** (the owner chose the lanes, 2026-09-17)

Both behind a development switch, `?heroTransition=camera|lanes` (`hero-stage.ts` `resolveTransition`); a production build runs **neither** and swaps slides plainly (`cut`) until one is chosen.

| | `camera` (camera push) | `lanes` (track lanes) |
| --- | --- | --- |
| Picture | the current one scales 1 → 1.04 and fades 1 → 0 over 0.85s; the next waits beneath at 1.08 and settles to 1 | the next picture runs in on 6 horizontal lanes, each a clipped clone moving `translateX(±100%)` → 0 over 0.6s, 50ms apart top to bottom, from the side the line starts (right in Arabic, left in English) |
| Words | out 0.60–0.85s by word; in 0.90–1.20s by word | the same |
| Total | 1.20s | 1.20s |
| Properties | `transform`, `opacity` (the leaving picture and its wash only) | `transform`, `clip-path` |

Shared rules, asserted in `hero-stage.spec.ts`: total ≤ 1.2s; the frame is never without words for more than 200ms (50ms by the tokens); the new words start only once the picture has settled; a manual step runs at 0.6×; the next picture is decoded first (`img.decode()`, 3s cap; an automatic step is put off, a manual one proceeds); the dwell is 7s including the transition; stop freezes everything mid-transition; reduced motion swaps at once.

**Conflict recorded for the choice:** `camera` animates `opacity` inside `<main>`. The identity-lines guard forbids that on the pages it covers (the President, Vision & Mission, the Strategic Plan) so their Largest Contentful Paint lands in its first frame. The homepage is not among its routes, and the fade never touches the first slide (the LCP), but choosing `camera` means that rule is scoped to those pages by name rather than to every hero. `lanes` needs no such scoping.

Videos (three full cycles each): `hero-camera-ar-1440x900.webm`, `hero-camera-ar-390x844.webm`, `hero-camera-en-1440x900.webm`, `hero-lanes-ar-1440x900.webm`, `hero-lanes-ar-390x844.webm`, `hero-lanes-en-1440x900.webm` (session evidence folder; recorded headless on the development server, so frame pacing in them is not a performance measurement).

### D8.3 — The lanes, chosen and built — **Accepted 2026-09-17**

The owner chose the lanes, on one condition: measure them on the production build with a GPU, and simplify them if 1440 averaged under 50fps.

**Removed:** the camera push, its timing tokens, and the development switch (`resolveTransition`, `?heroTransition`). Every build runs the lanes; reduced motion swaps at once. `hero-stage.spec.ts` asserts that neither the camera nor the switch is exported.

**Simplified, after the first measurement** (production, Microsoft Edge headed, Intel HD Graphics 5500 over Direct3D 11, CPU ×4):
- Each lane is a **still band** that clips (`overflow: hidden`, `laneBand` in pixels), with the copy of the picture moving inside it by `transform` only. Before, each lane was a copy clipped by `clip-path` on the moving element, which repaints every frame.
- **Only the picture is copied.** The reading wash is the same on every slide, so the arriving slide's wash stays on above the lanes and the leaving slide's is hidden for the transition: one wash over the frame throughout, drawn once instead of six times.
- `will-change: transform` only on the moving copies, which exist only while a transition runs.

**Measured, 5 runs each:**

| | Before: rAF mean | After: frames drawn by the compositor, mean / worst | After: rAF mean / worst | Longest main-thread task |
| --- | --- | --- | --- | --- |
| 1440×900 | 41.3 | **58.5 / 56.7** | 49.8 / 41.7 | 108ms |
| 390×844 | 45.4 | **60.2 / 60.0** | 44.8 / 42.5 | 110ms |

The movement runs on the compositor, at 56.7fps or more in every run. `requestAnimationFrame` counts the main thread, which a single setup task at the start of the transition (about 100ms: style, script, and hit-testing under a pointer resting on the stage) holds back; the earlier prototype figures (41.3, and D8.2's table) were counted that way. Not simplified further: fewer lanes or a shorter run would change the look the owner chose, for a number the reader does not see.

**A defect the new guard found and that is fixed:** with the hero stopped, a step the reader asked for froze its lanes at the start, so the slide became active while its picture never arrived. The stop button holds the automatic advance and freezes a transition already running when it is pressed; it no longer freezes a manual step.

**Guarded by** `e2e/home-hero.spec.ts` (ADR-0080 D4): a picture described in the page's language on every slide, no identity stroke over it, the progress line in `--color-brand-primary`, no opacity animation on the first slide, lanes that never scroll the stage, and an instant swap with reduced motion. 14 cases, both languages, 1440 and 390.

**Recorded debt, not built (owner, 2026-09-17):** on the production build the homepage's CLS is 0 at 390 in both languages and at 1440 in English. At 1440 in Arabic one run in five measured 0.078, under Chapter 5 §5.9's 0.1. The sources are the web font replacing its fallback in the header navigation and the hero words, and the hero foot growing once. It belongs to the shared-fonts batch.

## Risks

1. **A dependency on the most important page.** Mitigated by D5: the hero works
   without it, and the library is loaded after paint.
2. **`"use client"` spreads.** Each animated section becomes a client component.
   Mitigated by keeping every interaction state in CSS (D4), so only sections
   with a real entrance sequence opt in.
3. **Two systems coexist during migration.** Accepted deliberately (D6). The
   alternative — migrating four approved pages at once — is worse.
4. **Bundle growth over time.** `m` + `LazyMotion` is ~4.6 KB only while the
   full `motion` component is never imported. This must be guarded by a test,
   not by discipline.

---

## Consequences on acceptance

- `apps/web` gains one dependency: `motion`.
- A root `<MotionConfig reducedMotion="user">` is added to the public layout.
- A test asserts that `motion/react`'s full `motion` export is never imported in
  `apps/web`.
- ADR-0075's "Motion, as built" section gains a pointer to this ADR. Its text is
  **not** rewritten: it was correct for what it decided, on what it knew.
- Chapter 24 §1's Firefox requirement becomes satisfiable for scroll reveal.

---

## Open, and not decided here

- Chapter 27 states «the hero is never a carousel — a carousel signals "we
  couldn't decide"». The owner's §٣.٥ and Homepage Specification §5/§6 both
  require a multi-slide hero. The owner's instruction ranks higher
  (`CLAUDE.md` §1), so it is implemented — but Chapter 27's sentence remains
  textually contradicted and needs its own ADR to narrow or retire it. Recorded,
  not resolved.

# ADR-0099: Ambient Motion Policy

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-25 ahead of the components it governs (ADR-0056 §2 — document-first). **Widened the same day, by Product Owner decision, from media showcase components to the whole site.** |
| **Authority** | Product Owner Decision, 2026-09-25. Raised as a blocking conflict by the Photo Albums Phase 0 audit and answered by the Product Owner in the same exchange. |
| **Amends** | **Chapter 3 §3.14** — a component-local exception to the closed duration scale, for cycle periods only (D3), **site-wide** rather than for one component family. **ADR-0098 D5** — continuous rotation is no longer confined to `orbit`'s two bounded places; any component may animate unprompted while D1's six conditions hold together, and the per-view cap of one survives. **Chapter 8 L6** — two components are registered, discharging ADR-0032's Pure Assembly requirement for the homepage Photo Gallery section (D5). |
| **Does not amend** | **Chapter 3's `ambient` restriction and its single authorised use** — untouched; neither component here uses `ambient`, and D1 does not relax "MUST NOT be applied to … any element carrying content" for it. · **Chapter 5 §5.8** `prefers-reduced-motion` — reinforced, not relaxed (D1.4). · **Chapter 5 §5.9** no-layout-shift — reinforced (D1.5). · **WCAG 2.2.2** — reinforced (D1.1). · **CMP-CAROUSEL-001** — every one of its three MUSTs is satisfied, none is waived. · **ADR-0065 R2** (colour may not stand in for information it does not carry) · **ADR-0050** (green, never gold) · **ADR-0098 D1–D4, D6–D8** · the `focus-visible` solid ring · WCAG 2.1 AA as the acceptance floor. |
| **Context** | The approved Photo Albums canvas (v13) composes two motion patterns the design system has no record of. The first, `FeaturedAlbumDeck`, is a five-slot 3D coverflow that rotates **continuously and without user initiation** on a 15-second cycle. The second, `PhotoStack`, is a three-layer fanned card stack that animates on hover across a 4.5-second cycle. Three governing rules stood in the way, and the Phase 0 audit stopped rather than guessing. (1) **Chapter 3 §3.14** closes the duration scale; neither 15s nor 4.5s is in it, and the two values that could arguably cover a loop are each fenced: `ambient` (1200ms) is restricted to one authorised use and forbidden on "any element carrying content" — album covers are content — and `orbit` (6000ms) is admissible, per ADR-0098 D5, "in exactly two bounded places (hover, live)", neither of which is an auto-rotating showcase. (2) **ADR-0032** (Pure Assembly) forbids a homepage section that traces to no source-chapter component, and neither of these two exists in Chapter 8. (3) **CMP-CAROUSEL-001** already permits rotating presentations — but only with a pause control and a reduced-motion stop, which the canvas provides and which therefore was never the obstacle. The real question is narrower than "may this move": it is **what a continuously moving showcase must guarantee before it is allowed to move at all**. |
| **Decision** | Five decisions, D1–D5 below. In summary: (D1) `FeaturedAlbumDeck` may rotate continuously and unprompted, but only while **six conditions hold together** — a visible pause control, a stop on hover and on `:focus-within`, a stop when off-screen, a stop when the tab is hidden, full cancellation under `prefers-reduced-motion`, and compositor-only properties; (D2) `PhotoStack` never self-animates — it moves on hover and on `:focus-within` only, and the keyboard path is the same path, not a lesser one; (D3) the two cycle periods are **component-local CSS variables, not tokens**, each carrying a comment stating why, with easing taken from the motion tokens; (D4) a guard test enforces D1 and D2 mechanically, and is proven by mutation rather than trusted; (D5) both components are registered in Chapter 8 L6, built on `CMP-CAROUSEL-001` and `CMP-GALLERY-001` respectively, which discharges ADR-0032 for the homepage Photo Gallery section. |
| **Alternatives Considered** | **(A) Bind the deck to `orbit` (6000ms) and change nothing.** Rejected: 6s across five slots is a 1.2s dwell per cover, which reads as a flicker rather than a showcase, and it would silently widen `orbit`'s two bounded roles into a general licence — the exact drift ADR-0098 D5 fenced against. **(B) Add 15s and 4.5s as new duration tokens.** Rejected, and this is the load-bearing rejection: a cycle period derived from one composition's five-slot geometry is **not a system value**. Promoting it to a token invites reuse in compositions whose geometry does not produce that timing, and a token nobody may reuse is a token that should not exist. The scale stays at eight values. **(C) Reduce the deck to a manual carousel with no auto-rotation.** Rejected by the Product Owner: the sequential reveal of album covers *is* the product intent of the section, and a static deck communicates "one featured album" where the design communicates "a body of work". This was the cheapest option and it was declined knowingly. **(D) A site-wide motion exception.** Rejected: the Motion-layer decision is still open, and pre-empting it from inside a feature ADR is precisely the silent-override ADR-0056 §2 exists to prevent. D1's scope is therefore drawn around media showcase components and nothing else. **(E) Treat both components as local to the albums feature and skip Chapter 8 registration.** Rejected: it breaks ADR-0013's layering and leaves ADR-0032 undischarged, which would block the homepage section on a governance defect rather than on a design one. |
| **Why This Decision** | Chapter 3 §3.14's cap and `ambient`'s content prohibition were written against one failure mode: **motion that a reader cannot escape**. A decorative background settle is bounded because it ends; a transition is bounded because it has a destination. A continuous loop has neither, which is why the existing rules have no room for one. D1 does not argue that the loop is harmless — it makes the loop **escapable six ways**, so that the property the original rules were protecting is preserved by construction rather than by permission. The reader can stop it (D1.1), it stops itself when they engage (D1.2), it stops when they are not looking (D1.3), it never runs at all for a reader who has asked for less motion (D1.4), and it cannot move the page under them (D1.5). That is a stricter contract than any currently-permitted motion in the system carries, which is the trade for being the only continuous one. |
| **Risks** | **"Showcase" is a judgement, and judgements widen.** A future reader may read D1 as a licence for any looping carousel. **Mitigation:** D1 is written as six cumulative conditions and an explicit scope fence, and D4's guard fails on the component, not on the category — a new showcase must pass the same test to exist. **Six conditions is five chances to lose one silently.** A missing `IntersectionObserver` teardown or a dropped pause button is invisible in review and invisible in a passing test suite that does not look for it. **Mitigation:** D4 requires the guard to be proven by mutation — each condition removed individually must turn the test red — because a guard that has never been seen to fail is a guard nobody has verified. This is the `scroll-timeline` fail-open failure in this codebase's own history: a loop guard that reported green while measuring nothing. **Two showcase components in one view compound into visual noise.** **Mitigation:** D1 caps continuous rotation at one per view, matching ADR-0098 D5's existing cap for `orbit`. **The 15s period is untestable by eye at review time.** **Mitigation:** D3 requires the value to carry its derivation in a comment beside it, so the next reader can check the arithmetic against the slot count rather than re-deriving intent. |
| **Consequences** | The duration scale is **unchanged at eight values** — this ADR adds no token, which is the point of D3. Chapter 8 L6 gains two component records. `orbit` gains a third bounded role but keeps its cap of one continuous rotation per view. Both components enter the register as **PENDING FIGMA BACK-SYNC**: the canvas is the approved source, but no Figma frame exists for either, and Figma is not to be touched until access is confirmed restored. The guard test added under D4 is a new permanent contract in `apps/web/src/lib/design-system/`. |

---

## D1 — `FeaturedAlbumDeck` may rotate continuously, under six cumulative conditions

Continuous, non-user-initiated rotation is permitted **only while all six hold**. Any one absent makes the rotation a defect, not a degraded feature.

1. **A visible pause control** (WCAG 2.2.2). Not hover-only, not keyboard-only — a control a reader can see and reach. Its accessible name states which action it performs, and it reflects the current state.
2. **Rotation stops on `:hover` and on `:focus-within`.** Both, not either. A reader tabbing into a card is engaging with it exactly as much as a reader pointing at it, and a deck that keeps moving under a focused card moves the thing the reader is trying to read.
3. **Rotation stops when the deck leaves the viewport** (`IntersectionObserver`) **and when the tab is hidden** (`visibilitychange`). Motion nobody is watching is cost with no benefit — battery on a phone, and a compositor thread that the page's own Largest Contentful Paint is competing for.
4. **Under `prefers-reduced-motion: reduce` the rotation does not exist.** Not slowed, not shortened — absent, with the front card shown as a static state. Chapter 5 §5.8, unrelaxed.
5. **`transform`, `opacity` and `filter` only.** No property that triggers layout. Chapter 5 §5.9, and the reason the deck cannot shift the page while a reader scrolls past it.
6. **One continuous rotation per view.** Matching ADR-0098 D5's existing cap.

**Scope.** D1 applies **site-wide**: any component on the public site may animate unprompted while all six hold. The conditions are the permission — there is no second list of blessed components, because a rule that names components has to be edited every time one is added, and the editing is where such a rule decays.

Two limits survive untouched. The dashboard is excluded in full (ADR-0098 D6's Operational dose prohibition stands): an administrative interface has no unprompted motion at all. And `ambient`'s own restriction is not relaxed — D1 permits a component to animate, it does not permit `ambient` to be applied to content.

## D1a — Interaction-bound motion needs no pause control

Motion that runs only while a reader hovers or keeps focus inside a component
is exempt from D1.1, and from D1.3. Nothing is running unprompted, so there is
nothing to pause: the reader stops it by looking away, which is the most
direct control there is. D1.4 and D1.5 still apply in full — reduced motion
still cancels it, and it still may not move the page.

`PhotoStack` is the first component under this clause.

## D2 — `PhotoStack` never self-animates

`PhotoStack` animates on `:hover` and on `:focus-within`, and at no other time. There is no auto-play state, so D1.1's pause control does not apply — there is nothing running to pause.

The keyboard path is the same path. A card reached by <kbd>Tab</kbd> shows the same fan a pointer produces; it is not a reduced state, and the stack is not a pointer-only affordance. Under `prefers-reduced-motion: reduce` the hover animation does not play and the resting composition stands.

## D3 — The two cycle periods are component-local variables, not tokens

The deck's 15s revolution and the stack's 4.5s fan are declared as CSS custom properties **inside their own components**, each with a comment stating what the number is derived from — the slot count and the per-slot dwell it produces — so the next reader checks arithmetic rather than guessing intent.

They are deliberately not tokens. A token is a system value offered for reuse; these two are consequences of one composition's geometry, and offering them for reuse in a composition with a different slot count would produce a timing nobody chose. **The scale stays at eight durations.**

Easing comes from the motion tokens (`--motion-easing-standard` and its siblings) with no local exception. `--motion-easing-spring` stays reserved for record and medal celebratory moments (L8 §SP.7) and is not used here.

**The motion library is not decided here.** Whether the site adopts Motion or GSAP is its own ADR; everything this record governs is implemented in CSS, and a library arriving later changes how the conditions are met, not whether they must be.

Horizontal motion is multiplied by `--dirx`, so the deck and the stack reverse in LTR without a second rule.

## D3a — The conditions live in one helper

D1's six conditions are implemented once, as `useAmbientMotion` in
`apps/web/src/lib/motion/`, and every component that animates unprompted reads
its answer. Five of the six are state — reduced motion, intersection, tab
visibility, hover, focus — and a condition written out by hand at each call
site is a condition the next component forgets. The sixth, a visible pause
control, is markup and cannot live in a hook; D4's guard checks for it in the
components themselves.

`FeaturedAlbumDeck` is its first consumer.

## D4 — A guard test, proven by mutation

A contract test asserts, for both components:

- the pause control exists and is reachable (D1.1);
- rotation is suppressed on hover and on `:focus-within` (D1.2);
- the off-screen and hidden-tab stops are wired (D1.3);
- `prefers-reduced-motion: reduce` yields the static state (D1.4, D2);
- no animated property outside `transform`/`opacity`/`filter` appears (D1.5).

**The test is proven by mutation, not by passing.** Each condition is removed individually and the suite must turn red for that condition specifically. A guard nobody has watched fail has not been verified — this codebase has a recorded instance of a loop guard reporting green while measuring zero frames, and that is the failure this clause exists to prevent.

## D5 — Both components are registered in Chapter 8 L6

This discharges ADR-0032's Pure Assembly requirement for the homepage Photo Gallery section, per ADR-0032's own instruction that a missing component is raised against its source chapter rather than solved locally.

- **`CMP-ALBUMDECK-001` — Featured Album Deck.** Built on `CMP-CAROUSEL-001`, whose three behavioural MUSTs it inherits unchanged, plus D1's six conditions. A 3D coverflow presentation of album covers; one per view.
- **`CMP-PHOTOSTACK-001` — Photo Stack.** Built on `CMP-GALLERY-001` and `CMP-IMAGE-001`, inheriting §M.5's lazy-loading rule. A fanned preview of an album's first images, shown inside an album card; hover and focus only, per D2.

Both are **PENDING FIGMA BACK-SYNC**: the approved canvas (v13) is their source of truth, and no Figma frame exists for either. No Figma edit is made until the Product Owner confirms access is restored.

---

## Related Governance

- `ADR-0098-Brand-UI-Kit-Surfaces-And-Accents.md` — D5 defines `orbit` and its two bounded roles; this ADR adds the third and keeps the per-view cap. D6's Operational prohibition for the dashboard is untouched.
- `ADR-0055-Albums-Videos-Page-Wrappers-And-Individual-Album-View.md` — the album data these components present.
- `ADR-0054-Media-Gallery-Hardening.md` — `Album.assetCount` and `MediaAsset.displayOrder`/`isVisible`, which is what lets a deck and a stack select a stable, ordered subset of an album's photos.
- `08-L6-Media-Components.md` — `CMP-CAROUSEL-001`, `CMP-GALLERY-001`, `CMP-LIGHTBOX-001`, `CMP-IMAGE-001`; D5 adds two records here.
- `03-Design-Tokens.md` §3.14 — the duration scale this ADR bounds an exception to without extending.
- `05-Grid-Layout-Motion.md` §5.8, §5.9 — reduced motion and no-layout-shift, both reinforced.
- `06-Accessibility-Government-Compliance.md` — WCAG 2.2.2, reinforced by D1.1.

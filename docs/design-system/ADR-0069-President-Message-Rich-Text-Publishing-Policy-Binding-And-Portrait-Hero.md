# ADR-0069 — The President's Message: Structured Rich Text, Publishing-Policy Binding, Direct Publish, and the Portrait Hero

**Status:** Accepted
**Date:** 2026-09-12
**Owner approval:** explicit, on Q1–Q17 of `docs/engineering/plans/president-message-plan.md` §Part 3, before this record was written. Q3 was answered as an **interim** decision (D7 below).
**Amended:** 2026-09-13 — Decision D10 (the identity lines in the portrait hero, the entrance, the one-shot reveal), which amends D8. Owner approval for D10 is recorded in D10. 2026-09-14 — Decision D11 (the pull-quote stays in the neutral text colour until the colour-system batch), owner decision recorded in D11.
**Extends:** ADR-0057 (audit capture), ADR-0058 (machine-readable error codes), ADR-0059 §D7 (the ascent), ADR-0066 D5 (hero composition, artwork never behind text), ADR-0067 D2/D3/D4 (first screen, opening sequence, section entrances)
**Amends:** Chapter 3 §3.14 (Motion Durations, 5 → 6); `docs/design-specs/page-president-message.md` §7.4 (Personality row) and §7.5 (owner decisions 1, 2, 3, 4); by D10, §7.4's Hero composition and Decorative swooshes rows
**Depends on:** Chapter 4 §4.6, Chapter 5 §5.6/§5.7, Chapter 6, Chapter 8 L4 (FB.6/FB.11/FB.16/FB.17/FB.20/FB.21, ADR-0016), Chapter 14 §3/§4, Visual Protocol §4/§13

This record decides **four** things the page cannot be built without: how the message body is stored, how this entity's publishing is authorised, how its hero is composed, and the one motion token that composition needs. It changes no code by itself; Phase B of the plan implements it.

---

## Context

`presidentMessagePage` has existed as a schema since Week 1 and has never been editable. The API exposes `Create`, `Read`, `Delete` and `GET /:id/public` — **there is no update route at all**, so no editor can be built against it.

Three further gaps were found while designing the page:

1. `messageBody` is `LocalizedText` — two plain strings. The page's content is a ten-paragraph bilingual message with bold lead-ins, a pull-quote and headings. Plain strings cannot carry that, and the schema's own comment defers the question to "a Domain 4 concern not built this week." It is being built now.
2. `workflowPolicies` rows are **read by nothing** (audit finding OUT-07). Every entity therefore publishes by whatever path its own module happened to implement, and the policy collection is decoration. Its `{entityType, operation}` index is also non-unique (finding H4), so two contradictory policies can coexist.
3. The page's Figma frames carry eleven defects recorded in `page-president-message.md` §7.3, four of them P1, and four owner decisions in §7.5 were still open. The owner has now answered all four.

The page is the federation president's signed, dated statement. It is the highest-visibility governance page on the site, and the one where an accidental publication is least recoverable. That is why publishing authority is decided here rather than inherited.

---

## Decision D1 — The message body is structured rich text, stored as ProseMirror/TipTap JSON, validated per language

`messageBody` becomes `LocalizedRichText`: one ProseMirror document per language, stored as JSON, not as an HTML string.

**Why JSON rather than sanitised HTML.** Four properties follow from the document being a tree rather than a string:

| Property | With JSON | With an HTML string |
| --- | --- | --- |
| Server validation | Walk the tree; reject any node, mark or attribute not on the allowlist | Parse, sanitise, hope the sanitiser and the renderer agree |
| Rendering | Map nodes to React elements — `dangerouslySetInnerHTML` is never reached | The string must be injected, so XSS is a sanitiser bug away |
| Chapter 4 §4.6 | "No italic in Arabic" is a structural predicate, mechanically checkable | A style question hidden in markup |
| Version diff | Compare stored paragraph arrays directly | Diff markup, then explain the markup to the reader |

The cost is a coupling to the editor's document model. It is bounded by versioning the allowlist: the allowlist is the contract, not TipTap.

**The allowlist (Q5).** Per language, and rejected server-side even when the request bypasses the dashboard:

- **Nodes:** `doc`, `paragraph`, `text`, `heading` (level 2 or 3 only — the page's single H1 is the hero's), `bulletList`, `orderedList`, `listItem`, `blockquote`, `horizontalRule`, `hardBreak`.
- **Marks:** `bold`; `link` with an `href` matching `https:`, `http:` or `mailto:` only; `italic` **in English only**.
- **Refused everywhere:** any `textAlign` (this is how justify and manual alignment are refused), `style`, `class`, `dir`; `underline` (indistinguishable from a link), `strike`, `code`, `codeBlock`, `image`, `table`; and any node or mark not named above.
- **Refused in Arabic specifically:** `italic`. Chapter 4 §4.6 — synthetic obliquing breaks Arabic letter joins.
- **Bounds:** nesting depth ≤ 6; extracted text ≤ 20,000 characters per language.

Arabic alignment is not stored at all. It follows `dir` at render time, which is why removing `textAlign` is sufficient rather than merely advisable.

## Decision D2 — Five fields added, one removed, one retyped

| Field | Change | Reason |
| --- | --- | --- |
| `messageBody` | `LocalizedText` → `LocalizedRichText` | D1 |
| `featuredImageId` | **new**, `ref: MediaAsset`, nullable | The president's portrait. `heroImageId` is the background; ADR-0044 already names `featured_image` for this role. Alt text stays on `mediaAssets.altText` and is **not** duplicated here |
| `pullQuote` | **new**, `LocalizedText`, nullable | The quote is a distinct editorial element rendered at every breakpoint (PM-D03), not the body's first sentence |
| `valuesTitle` | **new**, `LocalizedText`, nullable | The values band's heading |
| `values` | **new**, `IconKeyedContentBlock[]`, default `[]` | Replaces `goals`. Carries `iconKey` constrained to a closed enum |
| `seo` | **new**, reuses the existing `PageSeoSchema` | Chapter 14 §3 requires a share image; `buildMetadata` emits none today. Reused, not redefined |
| `goals` | **removed** | `ContentBlock[]`, carried since Week 1, rendered by nothing, and its own shared type is documented as explicitly icon-free — which the values band is not |

**`iconKey` is a closed enum (Q14).** `IconedContentBlock.iconKey` is a free string, and free strings are how the Figma frames ended up with five icon hues outside the identity (PM-D23). A new `IconKeyedContentBlock` constrains it to twelve keys, leaving `IconedContentBlock` untouched for its existing two consumers:

`eye`, `users`, `star`, `award`, `zap`, `target`, `handshake`, `trophy`, `medal`, `flag`, `lightbulb`, `shield-check`

The first five are the values currently in the Figma frames. The other seven are the plausible neighbours for a governance page, chosen so a later message does not need a schema change to say something ordinary. There is no colour field: the icon takes one green treatment (ADR-0066 D3 icon chip), per §7.4.

**Values belong to the message, not to the federation (Q1).** `visionMissionPage.coreValues` already exists and was the obvious place to point at. It is the wrong place: an archived message must keep the values of its own term, and a future edit to the federation's current values would silently rewrite a past president's statement. The duplication is deliberate and is the point.

**Term years need no new field (Q5 of the brief).** They are already available through `federationAppointments.termStart` / `termEnd` and `electionCycles`. The archive is not being built now; the schema does not block it.

**The closing date is derived, not stored.** It is the Live publication's `publishedAt`. A message's date is the date it was published; storing it separately creates two dates that can disagree.

## Decision D3 — The public projection is an explicit allowlist

`GET /president-message-page/current/public` returns a named list of fields, never the stored row and never the raw snapshot.

Nothing in the schema is secret **today**. That is exactly why the rule is written now: the row carries `federationAppointmentId`, `createdBy`/`updatedBy`, `archivedAt` and both timestamps, and the next field added to this collection would otherwise reach the public site by default. A projection that must be edited to expose a field fails closed; one that must be edited to hide a field fails open.

The public shape is: `heroTitle`, `heroSubtitle`, `signatoryName`, `signatoryTitle`, `pullQuote`, `messageBody`, `valuesTitle`, `values`, `featuredImage` and `heroImage` (each as `{url, altText}`), `seo`, and `publishedAt`.

**Which message is "current" (Q15):** the message whose `federationAppointmentId` names the appointment that is currently active; if more than one qualifies, the one with the latest `publishedAt`. Not simply "the newest row" — that would let a draft for an incoming president replace the sitting one's message.

## Decision D4 — `workflowPolicies` becomes the authority for this entity's publishing path, and fails closed

A new `WorkflowPoliciesService.resolve(entityType, operation)` returns exactly one of three modes:

| Policy state | Mode |
| --- | --- |
| `workflowRequired: true` with an **active** definition of the **same** `entityType` | `workflow` |
| `workflowRequired: false` | `direct` |
| `workflowRequired: true` with no, inactive, or foreign-typed definition | `blocked` — a misconfiguration, never a silent downgrade |
| **no policy row at all** | `blocked` |

**No policy means blocked (Q4).** Drafts may still be saved; submit and publish are refused with an error naming the missing configuration. The alternative — defaulting to direct publish — would mean that forgetting to configure a workflow grants everyone the authority the workflow was meant to withhold. A system whose least-configured state is its most permissive state is not a permission system.

The definition is chosen **by the server from the policy**, never accepted from the client. This closes audit finding OUT-04 for this entity type.

**The index becomes unique (H4).** `{entityType: 1, operation: 1}`, `unique`, partial on `archivedAt: null` — partial so an archived policy does not permanently block a corrected replacement, matching the `pages.slug` precedent. Two contradictory active policies for one operation is not a state worth representing.

Because Mongoose does not drop a superseded index on its own, the rollout is ordered: **check for duplicates → drop the old index explicitly → build the new one.** The duplicate check must be run against every environment before the index is built, and is a deployment-checklist item, not an implicit migration.

## Decision D5 — Direct publish is a distinct permission and a distinct route

`POST /president-message-page/:id/publish`, gated by `presidentMessagePage:Publish` — a permission that does not exist today and is not implied by `Update` (the `albums:Publish` precedent).

**Editing is not publishing.** An editor with `Update` can always save a draft. Whether that draft reaches the public depends on the policy and on whether they hold `Publish`:

| Policy | Holds `Publish` | Holds `Update` only |
| --- | --- | --- |
| `workflow` | submit for review | submit for review |
| `direct` | publish immediately | **save draft only** — no submit path exists, and they may not publish |
| `blocked` | save draft only | save draft only |

The route performs, in order: verify the permission, resolve the policy, refuse if a review is already in progress, refuse on a stale record, refuse on placeholder content, then create a server-built revision, create the Live publication, and write an audit entry.

**Concurrency is explicit.** The request carries `expectedUpdatedAt` — the `updatedAt` the editor was looking at. If the row has moved on, the publish is refused rather than silently publishing an edit the publisher never read. `PublicationsService.createLive` retires the previous Live row and is **not atomic** (finding H1's neighbourhood); that is a known constraint, unchanged by this ADR and recorded again here so it is not mistaken for something this decision fixed.

**Placeholder content blocks publication (Q16).** Content the client has not yet supplied — the canonical English pull-quote, the clause English ¶5 drops, the master portrait (§7.5-6) — is marked as a placeholder rather than invented. Publishing content still carrying a placeholder marker is refused. A placeholder that can reach production is not a placeholder; it is a typo with a deadline.

**Failures are reported inline, not as a toast (Q7).** Chapter 8 L4 ADR-0016: a Toast MUST NOT carry an error that prevents task completion. Every refusal above prevents the task, so each is rendered as a persistent alert in the action panel where the action was taken. Toasts stay for outcomes that do not block — "draft saved", "submitted for review".

New error codes (ADR-0058 vocabulary): `publishingPolicyMissing`, `workflowRequired`, `activeWorkflowExists`, `staleRecord`, `pendingContent`, `underReview`, `richTextNotAllowed`.

## Decision D6 — A minimal publishing-policy UI, on this page

No dashboard screen exists for `workflowPolicies`, `workflowDefinitions` or `workflowSteps`. Building a full workflow administration area to make one page publishable is disproportionate; leaving the policy editable only by re-seeding makes D4's fail-closed default a trap.

The minimum: a **Publishing setup** panel inside the president's message screen, visible only to a platform administrator, carrying the `workflowRequired` switch and the definition selector, backed by `PUT /workflow-policies/:entityType/:operation` and a new `workflowPolicies:Update` permission. Creating definitions and naming approvers stays with the seed and the API.

## Decision D7 — Interim: approvals required, one step, Super Admin approves

The owner has not settled the approver list with the client. Rather than block, the seeded starting policy is: `workflowRequired: true`, one step, one approval, approver = Super Admin.

This is **interim and recorded as such.** It is the safe end of the range — it cannot publish anything without a human approval — and because both the policy and the step's approver are seed data read at runtime, changing either later is a data change, not a code change. D6's panel is what makes that true for `workflowRequired`; the approver list needs the API until a workflow administration screen exists.

## Decision D8 — The portrait hero is a documented composition, and the page's motion level rises with it

`docs/design-specs/page-president-message.md` §7.4 recorded: *"Institutional. Motion is the site's standard … nothing page-specific."* The owner has asked for cinematic motion on this page. Those conflict, and the conflict is settled here rather than by quietly overriding one of them.

**The page stays Institutional.** Visual Protocol §4 assigns About/governance pages that personality, and nothing about this page's content argues otherwise. What changes is narrower: a hero built around **one human portrait** is a composition the system has not described, and it is the composition — not the page — that earns the extra motion.

**What the portrait hero adds, and only in the hero:**

- A slow ambient settle on the background plane (D9).
- A short rise of the portrait out of the hero's bottom edge: the ascent offset over `slower`, transform only. *(Amended by D10.)*
- The identity lines, which replace the motif in this hero, each entering along its own 45° axis at the same moment as the text, and never across it (D10, ADR-0066 D5). *(Amended by D10.)*

**What it does not change.** Below the hero the page keeps the site's limits: no opacity animation on reading text, no parallax on the reading column, no repeated motion, no scroll hijack, no progress bar. Blocks below the hero reveal once, and body paragraphs do not move at all (D10). *(Amended by D10.)*

**Three further motion rules follow from existing decisions, not from taste:**

- **The ascent keeps its 45° (Q12).** The owner asked for text to enter from the reading side; ADR-0059 §D7.1 fixes the ascent as brand geometry that MUST NOT mirror under RTL. Reading order is expressed through **sequence** — breadcrumb, name, role — not through direction.
- **Reveal is one-shot, and the page is complete without script (Q13).** A scroll-linked reveal replays each time a block re-enters the view, and the owner excluded that repetition. The conditions are D10's. *(Amended by D10.)*
- **The LCP element never starts invisible.** `PageHero`'s H1 currently uses `.rise-in`, which animates opacity. On this page the H1 becomes the LCP element whenever the background image is absent, so it gets a transform-only variant. An entrance animation that delays the largest paint is a measured regression, not a flourish. That the lines begin after the LCP rests on a CSS delay: measured, not guaranteed (D10).

## Decision D9 — `motion.duration.ambient` = 1200ms, and the Chapter 3 §3.14 amendment it requires

The hero's background settle runs 1200ms. Nothing on the existing scale fits: `slower` (480ms) is the ceiling and is already spoken for by "hero celebratory animations."

**This collides with a hard limit.** Chapter 3 §3.14 *Token Constraints* states: **Motion Durations — 5 values only (`instant`/`fast`/`base`/`slow`/`slower`)**. Adding a sixth is not a gap in the system; it is a rule in the system. Three ways out were considered:

| Option | Verdict |
| --- | --- |
| Use `slower` (480ms) | Rejected. 480ms is a transition, not a settle; it produces a lurch, which is worse than no motion |
| Name it outside `motion.duration.*` so the scale still reads "five" | Rejected. It would satisfy the letter of §3.14 and defeat its purpose, which is that durations are countable |
| **Amend §3.14 to six, with the sixth narrowly bound** | **Adopted** |

`motion.duration.ambient` = **1200ms**, added to `tokens/primitive/motion.json`, and §3.14's row becomes *6 values*. The sixth is bound by rule, and the rule is what keeps the scale from growing again:

> `ambient` is for **non-interactive, one-shot, decorative** motion on a background or ground plane. It MUST NOT be used for any state change, transition, entrance, or exit, and MUST NOT be applied to text, to a control, or to any element carrying content. Under `prefers-reduced-motion: reduce` an `ambient` animation is not shortened — it is not played.

Its single authorised use today is D8's hero background settle. A second use needs a new ADR, and the restriction is machine-checkable: no `ambient` on any selector that also carries a `:hover`, `:focus` or `[data-state]` condition.

## Decision D10 — The identity lines replace the motif in the portrait hero: their distribution rule, the entrance, and a one-shot reveal

**Added 2026-09-13.** Owner approval explicit on the distribution rule and the motion scenario as presented, and on the decisions that followed them: the portrait's cost on phones, the one-shot reveal, the CSS-only LCP delay, a guard run in a real browser, the entry direction, and the portrait's column cap at `lg`. D10 amends D8; the wording it replaces is kept in *Amendments this record makes*.

### Why the motif is replaced in this hero

The owner asked for this hero to carry the four identity lines of the approved footer instead of the logo motif, which read as a second logo under the header's. The lines are the identity's own artwork: the emblem's four strokes, in its order, proportions and angle. They are not a second decorative language (Visual Protocol §18). Three rules are bounded around them, and only around them:

- **ADR-0065 R2, no colour for decoration.** Excepted for the identity lines. They are identity artwork, whose colours Guide §9.1 forbids changing. R2 governs everything else on the page.
- **The monochrome rule on coloured registers** (Guide §6.1, applied by `UaeafMotif`). Excepted. On the green register the strokes keep their colours: measured 1.60:1 red, 1.95:1 green and 2.23:1 black against `#005226`. They are `aria-hidden` and carry no information, so WCAG 1.4.11 does not apply.
- **§3.34.2 Institutional, red virtually absent.** Measured at 0.10% of the hero at 1440, on a larger scale than the one adopted.

The motif is not drawn anywhere on this page. The other eleven heroes keep it.

### The distribution rule

Written so it can apply to any hero. Adopting the lines on another page is a separate owner decision.

| Rule | |
| --- | --- |
| **IL-1 Groups** | The four strokes in logo order, left to right, in two groups. **A**: red 40.8 and green 81.2, top left. **B**: black 56.0 and red 23.4, bottom right. Lengths are ADR-0059 §D7's. Within a group the tails share one baseline 32.66 units apart, heads towards the top right, at 45°. Each stroke keeps the committed footer ribbon's thickness-to-length ratio. |
| **IL-2 Symmetry** | **Translation, at one scale.** B continues A's grid down the hero's diagonal. Rejected: a mirror, which reverses one group's ascent (Guide §9.1, ADR-0059 §D7.1); a 180° rotation, which points the heads down, a descent; a different scale per group, which loses the shared spacing that makes four strokes 1,200px apart read as one set. |
| **IL-3 Anchor** | The container frame (the 1440px maximum container, Chapter 5 §5.2), not the content edge and not the screen. A sits on the frame's left edge, its highest point `--space-8` below the breadcrumb row. B sits on the frame's right edge with its tails on the hero's bottom edge. The frame clips. |
| **IL-4 Scale** | The green stroke is `--space-24` long below `md`, `--space-24` + `--space-2` from `md`, and `--space-32` + `--space-16` from `xl`. Every other length follows from IL-1. Below `lg` the lines are smaller, never removed. |
| **IL-5 Safe distance** | **`--space-8` (32px)** between any painted point of a stroke and any text or image in the hero, at rest **and in every frame of the entrance**. Measured from the stroke's painted outline to the content-area rectangles of each text run and to each image's box. It holds by construction, not by tuning positions: the title column reserves A's height plus the part of A's entry path that falls inside the frame, and the portrait is inset by B's width plus B's entry spread, less the frame margin. Each reserve adds `--space-8 × √2`, because a clearance *s* measured along an axis leaves only *s/√2* perpendicular to a 45° stroke. |
| **IL-6 Layer** | `--zIndex-base`, first child of the hero, inside the hero's own stacking context (`isolation: isolate`). Content follows it in the DOM and paints above it. No new z-index value (Chapter 5 §5.10.2). |
| **IL-7 Direction** | Positions, angle and order are physical and identical in Arabic and English. Only the text mirrors (ADR-0059 §D7.1). |
| **IL-8 Colour** | `--color-brand-secondary` for red, `--color-brand-primary` for green, `--color-brand-black` for black. On a background photograph under the scrim, black is drawn in `--color-text-on-brand`, as the footer draws it. |
| **IL-9 When space runs out** | Clearance wins over compactness. The portrait yields first. The hero grows only where an approved exception allows it: landscape phones and 200% zoom. |

**Composition decided with the rule:**

- The portrait stands on the **right in both languages**, the title block on the left (owner decision, Phase D1). The president faces the left of the frame, so on the right he faces the text in either language, and a photograph of a real person is never mirrored. The breadcrumb is a row of its own on the reading side. Below `lg` the title block comes first, then the portrait (Chapter 5 §5.10).
- On phones B's inset narrows the portrait, to 264px at 390×844, and places it on the left of the free width. The owner accepted this as the only arrangement that keeps both the lines below `lg` and IL-5.
- At `lg` the portrait takes at most 5 of the 12 columns, so the title column keeps a usable width at 1024. It measured 323px without the cap.
- **From `lg` the title block follows group A's reserve directly**, not the portrait's baseline (amended 2026-09-13). On the baseline, a hero that fills the first screen left 525px of empty green between the breadcrumb and the H1 at 1440×900. The Figma frames (`1219:2300`, `1268:2321`) place the title right below the breadcrumb, in the hero's upper half. The portrait still stands on the hero's bottom edge, and the reserve above the title is unchanged, so IL-5 still holds by construction.
- **Without a portrait** the title takes the whole row in both languages. The two-column grid under RTL had held it in the right half.
- **The portrait's height from `lg`** is the screen less the header, the breadcrumb row (its top padding, one caption line and the trail's bottom margin) and the grid's top padding. With a second `--space-24` in its place, the hero ran 2px past the first screen at 1366×657.

### The entrance

t = 0 is the hero's first style resolution. *Settle* is `translate(−r, r) → 0`, the 45° ascent. *Rise* is `translateY(r) → 0`. r is `--motion-ascent-offset` (16px), halved below `md`. Easing is `--motion-easing-decelerate` throughout, with no overshoot.

Nothing animates `opacity`: every element is painted in its first frame. Every rule sits inside `prefers-reduced-motion: no-preference`, so under `reduce` everything is drawn at rest, lines included.

**The hero: on load, once, CSS only**

| Element | Motion | Duration | Delay | Reduced motion | RTL |
| --- | --- | --- | --- | --- | --- |
| Background plane, only when `heroImage` exists | `scale(1.04) → 1`, opaque from the first frame | `ambient` 1200 (D9) | 0 | not played | none |
| Breadcrumb | settle | `base` 220 | 0 | at rest | angle fixed; sequence follows reading |
| H1 | settle | `base` | 60 | at rest | same |
| Name | settle | `base` | 120 | at rest | same |
| Role | settle | `base` | 180 | at rest | same |
| Portrait | rise out of the hero's bottom edge | `slower` 480: §5.6 reserves it for hero celebratory animation, and this is that moment | 0 | at rest | none |
| Lines, group A | each stroke slides along its own 45° axis from beyond the frame's left edge; one travel (A's width) for all four strokes, so they move at one speed | `slow` 320; `base` below `md` | 300 and 360, in reading order: Arabic green then red, English red then green | at rest | positions physical; sequence follows reading |
| Lines, group B | the same, rising from beyond the hero's bottom edge, at the same moment as A | same | 300 and 360: Arabic small red then black, English black then small red | at rest | same |

The hero is done by 680ms: text at 400, portrait at 480, lines at 680, or 580 below `md`. Each step is 60ms, inside §5.7's 40–80ms.

**Why these entry edges.** Moving along a stroke's axis in the direction of the ascent brings A in from the left edge and B up from the bottom edge. Entering literally from the top-left corner would be a descent (§D7.1) or a slide across the axis.

**Below the hero: once per block, by the reveal in *Q13, amended* below**

| Element | Trigger | Motion | Duration and delay | Reduced motion | RTL |
| --- | --- | --- | --- | --- | --- |
| Pull-quote rule | the quote enters the view | `scaleY(0) → 1` from its top | `slow`, 0 | drawn | on `inline-start`, so it mirrors; it grows vertically |
| Pull-quote text | same | rise | `base`, 60 | at rest | none |
| Body paragraphs | none | **none**: the start of a line never moves while it is read | none | none | none |
| Closing: name, title, `<time>` | the closing enters the view | rise, in that sequence | `base`, at 0, 60 and 120 | at rest | sequence follows reading |
| Values heading | the band enters the view | rise | `base`, 0 | at rest | none |
| Value cards | each visual row enters the view | the icon chip rises from `scale(0.92)`; the card's title and text rise 120ms after it; 60ms per card in reading order | `base`; a five-card row ends by 580ms | at rest | sequence follows reading; motion is vertical |

Content below the hero rises vertically, not at 45°. A diagonal would move the edge the eye returns to on every line, and a diagonal wave along a right-to-left row would run against the ascent. The 45° belongs to the hero's brand moment. Card surfaces, borders and layout never animate.

**Limits that hold for the whole page:**

- Transform only, and no layout shift. Every animated element is itself the positioned element: a child moving inside an unmoving positioned box was reported as that box shifting.
- No horizontal overflow in either language at any breakpoint.
- No scroll hijack, no parallax on reading text, no loop, no replay, and no reading-progress bar.
- Durations and easing come from tokens only.
- Phones get half the distance and shorter lines.

### Q13, amended: the reveal is one-shot

D8 kept the reveal scroll-linked because a one-shot reveal needs script. The owner reversed that. A CSS scroll-driven reveal replays whenever a block re-enters the view, and repetition is what the site's motion rules exclude, for accessibility (WCAG 2.2.2, 2.3.3) and for distraction. An observer of about thirty lines, with no library, is an acceptable cost.

Its conditions are part of the decision, not implementation detail:

1. **The server HTML is complete and at rest.** Without JavaScript nothing is hidden and nothing is offset. There is no exception.
2. The script offsets only blocks that are not yet in the viewport, never one already visible, and never touches `opacity` or `visibility`.
3. Each block is revealed once, and its observation ends there.
4. Under `prefers-reduced-motion: reduce` the script does nothing.

**Implemented 2026-09-13** in `apps/web/src/components/pages/president/reveal-once.tsx`, with the offsets in `apps/web/src/styles/motion.css`. The server marks each block `data-reveal` and each moving part `data-reveal-part`; only the script sets `data-reveal-state`, and only on a block whose top is below the viewport when the page loads. So a page with no script, a crawler, a print and a reader who asked for reduced motion all get the page with nothing marked, at rest. Measured on the live page with JavaScript disabled: all five paragraphs, the quote, the date and the five values present, and no element offset. Blocks that enter together are staggered in document order, capped at §5.7's ten steps.

### The LCP constraint, and what it is not

The lines start at 300ms by a CSS delay. In 13 of 13 lab runs that was after the LCP, whose element was the portrait each time; without a portrait the H1 is the LCP candidate. **This is a measurement, not a guarantee.** CSS cannot observe the LCP, and on a slow network the portrait can paint after 300ms. A strict guarantee needs script in the shared layout, which is protected, and the owner accepted the CSS delay on that basis. The LCP element itself never starts invisible (D8).

**Measured on the built page (2026-09-14)** by `apps/web/e2e/vitals.spec.ts`: a real mobile context at 390×844 and a desktop at 1440×900, Arabic and English, entrance on and off, CPU throttled 4× and every image request held back 1.5s. Two runs each.

| | Entrance on | Reduced motion |
| --- | --- | --- |
| LCP element | the portrait, every run | the portrait, every run |
| LCP, ms | 2644–3100 (one cold first compile: 5164) | 2500–2880 |
| Layout shift of the page's own content | 0 | 0 |

The only shift recorded anywhere was 0.0017, once: the web font replacing its fallback in the shared header and breadcrumb.

Two defects were found and fixed on the way:

- **The portrait had no box before it loaded.** `w-auto h-auto` overrode its `width` and `height` attributes, so on a slow connection the title above it jumped by the portrait's height when the picture arrived (CLS 0.107). The portrait now takes its `aspect-ratio` and width from the asset before loading: the smallest of its column, its own width, and its height cap times its ratio. From `lg` the portrait's track is sized from the same values.
- **The hero was a scroll container.** With `overflow: hidden`, group A entering from beyond the left edge overflowed on the hero's scrollable side in Arabic, and under a slow CPU the hero took a scroll offset for the length of the entrance (0.0084). The hero and the lines' layer use `overflow: clip`, which clips the same way without creating a scroll container.

### The guard

IL-5 is enforced by a test that renders the page in a real browser, not by this text. A calculation checks the rule, not the page, and would not catch a line moved by an unrelated change.

- **What it measures:** IL-5 as defined above, at rest and every 10ms through the entrance, in Arabic and English, together with the absence of horizontal overflow.
- **Where:** at the lower bound of each §5.2 breakpoint (360, 640, 768, 1024, 1280), at the 1440 frame, and at 390×844, 844×390 and 1366×657.
- **Emulation:** phone and tablet widths are emulated as mobile devices. A desktop scrollbar turns a 390px viewport into a 375px layout.
- **Order:** the guard is written before the page and fails first.
- **Runner:** `@playwright/test`, as a devDependency of `apps/web`.

### Tokens

No new token. `ambient` (D9) is added to `tokens/primitive/motion.json` before its first use. √2 is geometry, not a token.

### Below `lg`: the lines at the title's level in Arabic (owner decision, 2026-09-13)

Short portrait phones broke Chapter 5 §5.10's 90vh cap: at 375×667 the hero measured 683px against 571px of screen and a 600px cap. Shrinking the lines alone could not close it. Even with lines of zero size the hero stayed at 579px, because the reserve above the title carries 53px of clearance that does not scale with the lines. The cost sat in the reserve, not in the lines' size.

**Arabic, below `lg`.** The reserve above the title is removed and group A's highest point sits on the H1's top edge. The Arabic title block holds the reading-start edge on the right, so the frame's left edge, where A stands, is free at the title's level. This amends IL-3 and the title reserve of IL-5 for Arabic below `lg`; positions, angle, order and the 32px clearance are unchanged. Measured with true phone emulation, portrait capped at 249px:

| Viewport | Hero / screen | Portrait | Clearance at rest / during the entrance |
| --- | --- | --- | --- |
| 375×667 | 571 / 571 | 249 | 46.8 / 32.9 |
| 360×640, green 72px | 544 / 544 | 249 | 49.2 / 32.0 |
| 390×844 | 748 / 748 | 249 | 50.5 / 32.9 |
| 768×1024 | 928 / 928 | 249 | 51 / 32.2 |

- **IL-4 on a 360px screen:** the green stroke is 72px, so the portrait keeps 249px. At the default size B's inset narrowed it to 234px.
- **The §5.10 exception falls away in Arabic.** The hero fits the first screen, so no height breakpoint and no documented exception are needed.
- **Desktop is unchanged.**

**English, below `lg`: deferred (owner decision, 2026-09-13).** English keeps the reserve above the title and, with it, the §5.10 exception on short phones. English text starts at the left edge, where A stands, so the Arabic arrangement collides there (0px). The three alternatives measured and why each was not taken are recorded in `docs/engineering/plans/president-message-plan.md`, *الـ hero الإنجليزي على الهواتف القصيرة*: mirroring A breaks IL-5 during the entrance (23.3px), and narrowing the title column leaves the hero taller than the screen (+15px and +58px). Arabic and English therefore differ on phones, a temporary cost the owner accepted.

**The clearance reserves need correcting.** `TITLE_RESERVE` and `PORTRAIT_INSET` hold IL-5 at the lines' default size only. With smaller lines the entrance clearance drops to 26–30px. The guard fails on it first, and the formula is corrected against the guard.

### What D10 does not decide

- **The lines on any other page.** A separate decision. Taken for Vision & Mission's hero by ADR-0070, and for a band between sections by ADR-0071 D8, which also draws the black stroke in the logo's ink on the page's own ground.

## Decision D11 — The pull-quote stays in the neutral text colour until the colour-system batch (owner decision 2026-09-14)

The frames set the quote in `--color-green-600` on a `--color-green-50` card with a `--color-green-500` border (`2705:6`), and `page-president-message.md` §7.4, *Pull-quote colours*, still names those three tokens (5.95:1 on the green-50 ground). The page sets it in `--color-text-primary` on the page's own ground, beside a `--color-brand-primary` rule on its reading-start edge. Why the green was not used was never recorded.

**Measured** (WCAG 2.x contrast, 2026-09-14), against the page ground in each theme:

| Shade | Light ground `#FAFAF8` | Dark ground `#131210` |
| --- | --- | --- |
| `green-600` `#006B31` | **6.38:1** | 2.81:1 |
| `green-500` `#00843D` | 4.60:1 | 3.89:1 |
| `green-400` `#1A9448` | 3.74:1 | 4.79:1 |
| `green-300` `#3DAD65` | 2.73:1 | **6.56:1** |

No shade clears 4.5:1 in both themes. A shade per theme does: `green-600` in light and `green-300` in dark, the widest margin in each. They are the pair `--color-text-link` already switches between (`light.css` `#006B31`, `dark.css` `#3DAD65`), which is the precedent. ADR-0063 does not stand in the way: its rule is that a text colour follows its ground, and a per-theme pair does.

**Why it stops.** ADR-0065 D2 gives Federation Green the role **Action** (primary buttons, links, active and selected state, governance regions) and names where it never goes: "Card fills, section headings, panel tints — anywhere without an action". R2 allows no colour for decoration. A quote is not an action, so a green quote needs ADR-0065 amended. That amendment belongs to the colour-system batch the owner is opening, so the rule changes once rather than twice. **This record does not amend ADR-0065.**

**Three sources disagree. Recorded here, not resolved:**

1. `page-president-message.md` §7.4, *Pull-quote colours*: green-50, green-500, green-600.
2. ADR-0065 D2 and R2: green only where there is an action.
3. The implementation: neutral text, with the choice recorded nowhere until this decision.

Until the colour-system batch, the implementation stands and the spec row is left as written; this decision is the pointer between them.

---

## Amendments this record makes

| Document | Was | Becomes |
| --- | --- | --- |
| Chapter 3 §3.14, Motion Durations row | `5 values only (instant/fast/base/slow/slower)` | `6 values only (instant/fast/base/slow/slower/ambient)`, with D9's restriction quoted |
| Chapter 5 §5.6 mapping table | five duration rows | a sixth row, `DT-MOTION-DURATION-AMBIENT` — 1200ms — *Ambient background motion only (ADR-0069 D9)* |
| `page-president-message.md` §7.4, Personality row | "nothing page-specific" | Institutional, with the portrait-hero exception of D8 named and bounded |
| `page-president-message.md` §7.5-1 | open — pull-quote size | **`h3`** (24/20 Bold) |
| `page-president-message.md` §7.5-2 | open — values band register | **`green`**, the page's own register |
| `page-president-message.md` §7.5-3 | open — the width §4.6 frees | **a single centred reading column** |
| `page-president-message.md` §7.5-4 | open — sign-off and date | name and title from `signatoryName`/`signatoryTitle`; date derived from the publication, in a `<time>` element |
| D8, second bullet *(by D10, 2026-09-13)* | "A clip-reveal on the portrait, beginning at 86% height rather than at zero opacity." | the portrait rises by the ascent offset over `slower`, transform only |
| D8, third bullet *(by D10)* | "The identity motif drawn in along each stroke's own axis, after the text, never across it (ADR-0066 D5)." | the identity lines replace the motif, each entering along its own axis at the same moment as the text, never across it |
| D8, *What it does not change* *(by D10)* | "Below the hero the page is the site standard: `rise-scroll`, …" | the same limits, with blocks revealed once and body paragraphs never moving |
| D8, Q13 *(by D10)* | "Reveal is scroll-linked, not one-shot (Q13). … The standard holds." | one-shot, with the server HTML complete and at rest without script |
| D8, LCP rule *(by D10)* | — | adds that the lines' start after the LCP is a CSS delay, measured and not guaranteed |
| `page-president-message.md` §7.4, Personality row *(by D10)* | D8's portrait-hero behaviours: clip-reveal, the motif after the text, `rise-scroll` below | D10's entrance, and the one-shot reveal below the hero |
| `page-president-message.md` §7.4, Hero composition row *(by D10)* | title block on the reading edge, portrait in the far column; stacks below `md` | portrait right and title left in both languages; breadcrumb on the reading side; portrait capped at 5 of 12 columns at `lg`; D10's reserves; stacks below `lg` |
| `page-president-message.md` §7.4, Decorative swooshes row *(by D10)* | "The motif appears only where `PageHero` places it." | no motif on this page; the hero carries the identity lines |

§7.5-5 (the archive's IA) and §7.5-6 (client content) stay open. Neither blocks this build.

## Pending Figma back-sync

The file is view-only; every item below is a new visual state with no Figma frame, for review when write access returns. Per the owner's standing instruction, **no visual treatment in this record is taken from Figma** — Figma is the reference for content and structure only.

1. The portrait hero: title block on the reading edge, portrait in the far column, no overlap, no bleed above the hero, scrim over any background image.
2. The values band on the `green` register, cards on the reading edge at one shared height.
3. The pull-quote at `h3` in the neutral text colour, with its `brand.primary` rule on the reading-start edge (D11).
4. The closing block: name, title, and the derived date.
5. The single-column reading measure at every breakpoint.
6. The dashboard editor screen in full — no Figma frame exists for any dashboard surface (ADR-0068 D8).
7. The identity lines in the portrait hero at every breakpoint: A top left and B bottom right, IL-4's three scales, and the reserves IL-5 creates *(D10)*.
8. The portrait on the right and the title block on the left in both languages, with the breadcrumb on the reading side *(D10)*.

## What this record does not decide

- **The archive.** No route, no IA entry, no UI. The schema does not block it (D2).
- **Delegation.** Disabled on the server (`DELEGATION_ENABLED=false`, 403) and hidden in this page's UI. Unchanged here.
- **`createLive` atomicity.** Named in D5 as a known constraint; not fixed by this record.
- **The approver list.** Interim by D7 until the client settles it.
- **How Lucide reaches the code.** Q17 settled it for this page — the twelve keys ship as vendored SVGs, no runtime dependency, per ADR-0065 D6's threshold. A general icon-delivery decision remains ADR-0068 D6's open item.
- **The pull-quote's colour.** Neutral until the colour-system batch (D11).

## Implementation

Phase B of `docs/engineering/plans/president-message-plan.md`. In order: this record → the rich-text allowlist → the schema and DTOs → policy binding and the unique index → the publishing service and the update/publish routes → the permission catalogue and OpenAPI → content import.

The schema change and the migration that carries it are **gated on explicit owner approval before either runs against any database**, local or Atlas.

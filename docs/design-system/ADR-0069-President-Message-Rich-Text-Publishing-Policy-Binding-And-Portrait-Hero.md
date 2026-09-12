# ADR-0069 — The President's Message: Structured Rich Text, Publishing-Policy Binding, Direct Publish, and the Portrait Hero

**Status:** Accepted
**Date:** 2026-09-12
**Owner approval:** explicit, on Q1–Q17 of `docs/engineering/plans/president-message-plan.md` §Part 3, before this record was written. Q3 was answered as an **interim** decision (D7 below).
**Extends:** ADR-0057 (audit capture), ADR-0058 (machine-readable error codes), ADR-0059 §D7 (the ascent), ADR-0066 D5 (hero composition, artwork never behind text), ADR-0067 D2/D3/D4 (first screen, opening sequence, section entrances)
**Amends:** Chapter 3 §3.14 (Motion Durations, 5 → 6); `docs/design-specs/page-president-message.md` §7.4 (Personality row) and §7.5 (owner decisions 1, 2, 3, 4)
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
- A clip-reveal on the portrait, beginning at 86% height rather than at zero opacity.
- The identity motif drawn in along each stroke's own axis, after the text, never across it (ADR-0066 D5).

**What it does not change.** Below the hero the page is the site standard: `rise-scroll`, no opacity animation on reading text, no parallax on the reading column, no repeated motion, no scroll hijack, no progress bar.

**Three further motion rules follow from existing decisions, not from taste:**

- **The ascent keeps its 45° (Q12).** The owner asked for text to enter from the reading side; ADR-0059 §D7.1 fixes the ascent as brand geometry that MUST NOT mirror under RTL. Reading order is expressed through **sequence** — breadcrumb, name, role — not through direction.
- **Reveal is scroll-linked, not one-shot (Q13).** A once-only reveal needs JavaScript and an observer; the site's built standard is CSS scroll-driven animation with no script. The standard holds.
- **The LCP element never starts invisible.** `PageHero`'s H1 currently uses `.rise-in`, which animates opacity. On this page the H1 becomes the LCP element whenever the background image is absent, so it gets a transform-only variant. An entrance animation that delays the largest paint is a measured regression, not a flourish.

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

§7.5-5 (the archive's IA) and §7.5-6 (client content) stay open. Neither blocks this build.

## Pending Figma back-sync

The file is view-only; every item below is a new visual state with no Figma frame, for review when write access returns. Per the owner's standing instruction, **no visual treatment in this record is taken from Figma** — Figma is the reference for content and structure only.

1. The portrait hero: title block on the reading edge, portrait in the far column, no overlap, no bleed above the hero, scrim over any background image.
2. The values band on the `green` register, cards on the reading edge at one shared height.
3. The pull-quote at `h3` with its rule on the reading-start edge.
4. The closing block: name, title, and the derived date.
5. The single-column reading measure at every breakpoint.
6. The dashboard editor screen in full — no Figma frame exists for any dashboard surface (ADR-0068 D8).

## What this record does not decide

- **The archive.** No route, no IA entry, no UI. The schema does not block it (D2).
- **Delegation.** Disabled on the server (`DELEGATION_ENABLED=false`, 403) and hidden in this page's UI. Unchanged here.
- **`createLive` atomicity.** Named in D5 as a known constraint; not fixed by this record.
- **The approver list.** Interim by D7 until the client settles it.
- **How Lucide reaches the code.** Q17 settled it for this page — the twelve keys ship as vendored SVGs, no runtime dependency, per ADR-0065 D6's threshold. A general icon-delivery decision remains ADR-0068 D6's open item.

## Implementation

Phase B of `docs/engineering/plans/president-message-plan.md`. In order: this record → the rich-text allowlist → the schema and DTOs → policy binding and the unique index → the publishing service and the update/publish routes → the permission catalogue and OpenAPI → content import.

The schema change and the migration that carries it are **gated on explicit owner approval before either runs against any database**, local or Atlas.

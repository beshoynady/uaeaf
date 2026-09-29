# ADR-0125 — Publishing without approval is an administrator's setting, and the type's policy decides which door is open

| Field | Details |
| --- | --- |
| **Status** | Accepted in principle. Recorded 2026-09-29. **Nothing is built.** The gating measurement was taken the same day and answered one of its two questions cleanly and the other only partly — see D1. Batch 4. |
| **Authority** | Product Owner decision 2, 2026-09-29. |
| **Numbering note** | ADR-0122 was taken by the header session the same day; ADR-0123 records reference-path typing; ADR-0124 records the authorship fields. This record is ADR-0125. |
| **Amends** | `PublishingService`'s publish paths gain the policy as the thing that decides which check applies. Closes the P12 escalation described below. |
| **Does not amend** | ADR-0106's approval model where approval applies. · ADR-0124's author check, which by this record applies **only** to types that require approval. |
| **Context** | Measured 2026-09-29. `POST /workflow-instances` takes `workflowDefinitionId` **from the request body**, and `assertCanSubmitThrough` checks only that the definition exists, is active, and governs the same entity type — **never that it is the definition the policy names**. `publishApproved` then reads `findLatestApproved`, keyed on `(entityType, entityId, status: 'Approved')` with **no reference to the policy's definition at all**. So a holder of ordinary, grantable pairs can create a second definition for a type naming only themselves, submit through it, approve, and publish. No step is edited, so no in-flight lock is even conceptually engaged. Recorded as **P12**, and it is cleaner than the route the work originally set out to close. Crucially, the author check of ADR-0124 does **not** close it: the actor need not be the author of what they publish. |
| **Decision** | **The type's approval policy decides.** A type that **requires approval** publishes **only** through the policy's own definition — even when the actor holds the publish capability. A type set to **direct publish** needs the publish capability on that type, at scope `own` or `all`, and carries **no author check**, because there is no approval to separate anyone from. A policy that is **absent or unreadable** refuses publication. **Every direct publish writes an audit row naming the publisher.** An administrator turning a type's approval off and giving an editor the publish capability is a **legitimate configuration**, not a hole — the hole was that the approval path could be bypassed while the policy still said approval was required. |
| **Alternatives Considered** | **(A) Refuse any second definition for a type.** Rejected: it forbids a legitimate administrative act (replacing an arrangement) to stop an illegitimate one, and it does not fix `findLatestApproved`, which is where the bypass actually lands. **(B) Check the definition only at submission.** Rejected: the check must hold at the moment of the write it guards (CLAUDE.md §31) — a definition can change between submitting and publishing. **(C) Make `Publish` Super-Admin-only.** Rejected: it contradicts the owner's stated model, in which delegating publication to an editor is the point. **(D) Treat every direct publish as a hole and forbid it.** Rejected explicitly by the owner: a federation that publishes news without a review board is making a choice, and the product should carry it. |
| **Why This Decision** | The policy is already the one place that answers "does this type need a review". Making it also answer "which door is open" puts both halves of one question in one place, instead of leaving the publish gate to infer an answer from a status field that cannot distinguish the federation's review from one the actor built for themselves. |
| **Risks** | **A type with no policy becomes unpublishable.** That is the decided behaviour, and it is the safe direction — but it will surface as a refusal on content somebody expected to publish. **Mitigation:** the refusal must name the cause (no policy) distinctly from a capability refusal, so the administrator is sent to the right screen. **`own` scope is not enforced anywhere today**, so "publish at scope `own`" is not yet a thing the system can do. **Mitigation:** this record depends on Batch 4's `own` work and says so; it is not implementable before it. **Two refusals that read alike.** **Mitigation:** "the policy requires approval" and "you lack the capability" are separate codes, required by this record. |
| **Consequences** | `publishApproved` must establish that the approved instance ran under the policy's definition. `publishDirect` becomes conditional on the policy saying so. `PublishingService.hasPermission` — which checks resource and action only and ignores scope — is replaced by the shared comparison, with a negative test at `own` scope. Negative tests required: a holder of the publish capability on a type that **requires approval** cannot publish directly; a non-holder cannot publish a **direct** type; an `own`-scoped holder cannot publish another person's content. |

---

## D1 — The measurement that gated this record, and what it found

Taken 2026-09-29, before anything was built.

**Question 1 — does the policy already carry a "direct publish" option? YES, in
full. No new field is needed.** A policy row with `workflowRequired: false` makes
`resolve()` answer `mode: 'direct'`, and `publishDirect` then publishes with no
review. The administrator sets it with one call, and the dashboard already draws
that switch and labels the result. One boundary matters and matches this record's
decision exactly: the **absence** of a policy row is `blocked/noPolicy`, not
direct — direct publishing requires an affirmative row, so a type nobody has
configured refuses publication rather than falling open.

**Question 2 — what capability permits publication, per type? Not uniform, and
worse than "not uniform".** The intended rule — `<entityType>:Publish`, checked
inside `PublishingService` — actually holds for **5 of the 12** publication entity
types: `articles`, `aboutFederationPage`, `presidentMessagePage`,
`strategicPlansPage`, `visionMissionPage`. The rest:

| Type(s) | What is actually true |
|---|---|
| `videos` | Published by `videos:Update`. The resource has no separate `Publish` pair, because the API creates every video as a draft and editing it *is* publishing it. Already recorded in the capability map. |
| `albums` | Has its **own `albums:Publish` route that never consults the policy at all**. A second door, and this record closes it. |
| `committees` · `documents` · `governanceDocuments` · `organizationalStructure` | Declare a `Publish` pair that **no route guards**. They cannot be published at all today — their public read goes through `publications`, and nothing ever writes a `publications` row for them. **A functional gap, not a naming one**, and outside this record's scope. |
| `staticPages` · `externalMediaCoverage` · `publicEvents` | No module exists. |

**Consequence for this record:** "the publish capability" is not a single rule and
cannot be written as one. Three of the four groups above need the owner's
decision before this record is implementable — whether `albums` loses its separate
route, whether `videos`' `Update`-is-publish stays an explicit exception, and
whether the four unpublishable types are in scope at all.

**A third finding, not asked for but load-bearing.** `own` scope is **unusable
anywhere today**: `PermissionsGuard` refuses any grant narrower than `all`
outright, and the template seeder consequently refuses to seed the editor role at
all. So this record's "at scope `own` or `all`" is half-supported — `all` works,
`own` does not exist yet. This record therefore **depends on** Batch 4's `own`
work and cannot land before it.

## D2 — Why the fix is at the publish gate and not only at submission

`findLatestApproved` is keyed on the record and the status. That is what makes
an approval produced under any definition indistinguishable from one produced
under the federation's. Closing the submission door alone would leave every
instance already created under a foreign definition publishable, and would put
the guarantee in the wrong place: the question "was this approved by the people
the federation chose" is asked at the moment of publication, so it is answered
there.

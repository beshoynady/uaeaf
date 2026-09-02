# UAEAF — Workflow Scenario Review

**Audit type:** Read-only. No FigJam, schema, or code was modified in the course of this review.
**Date:** 2026-09-01

---

## 1. Scope and Source of Truth

**Primary and only schema source of truth:** live FigJam file `2ZC01ZbUx3rL7czDXWi34c`, section "03 — Physical Model (Phase 1.1)" (node `77:5543`), read fresh via the Figma MCP FigJam reader for this audit. `docs/product/07-Mongoose-Schema-Specification.md` was explicitly **not** used as evidence per the task instructions (stale). No field, enum, or reference cited below was taken from that file or from memory of prior sessions — every claim below traces to a specific table-cell in the live board, and node/table IDs are cited inline where precision matters.

**Collections read field-by-field:**

- Domain 7 (Workflow): `workflowDefinitions` (table `100:7436`), `workflowSteps` (`100:7468`), `workflowInstances` (`100:7512`), `workflowActionHistory` (`100:7563`), `revisions` (`100:7620`), `publications` (`100:7671`), `workflowPolicies` (`277:4402`)
- Also read in full because Scenarios 8–9 require them directly: `notifications` (`100:7722`), `auditLogs` (`100:7778`)
- Also read for RBAC context behind `allowHardDelete`: `permissions` (`103:7901`), `roles` (`103:7869`)
- The 13 closed-list entity types: `articles` (`88:7009`), `staticPages` (`88:7191`), `externalMediaCoverage` (`88:7103`), `governanceDocuments` (`77:5912`), `strategicPlansPage` (`77:5862`), `visionMissionPage` (`77:5818`), `aboutFederationPage` (`122:8210`), `presidentMessagePage` (`122:8260`), `organizationalStructure` (`77:5774`), `committees` (`77:5730`), `documents` (`94:7376`), `contactMessages` (`108:8150`), `publicEvents` (`289:4555`)

The closed 13-type list is declared once, authoritatively, in a domain note attached to `workflowDefinitions` (node `100:7435`): *"★ Closed entity-type list (13 workflow-participating types, fully reconciled after the Page-model renames): articles | staticPages | externalMediaCoverage | governanceDocuments | strategicPlansPage | visionMissionPage | aboutFederationPage | presidentMessagePage | organizationalStructure | committees | documents | contactMessages | publicEvents ... This is the single source of truth referenced by workflowDefinitions.entityType, workflowInstances.entityType, revisions.entityType, publications.entityType, and workflowPolicies.entityType — all five MUST use this exact list, verified consistent as of this pass."* This was independently re-verified against the actual `entityType`/`entityId` Notes cells of all five collections during this audit — the poly reference lists match verbatim in each case. **PASS.**

Per the mandatory No-Guessing Rule, every scenario finding below is grounded in an actual field/reference read from the board. Where the board is silent, the finding says so explicitly and is classified `NEEDS-DECISION` or `GAP` rather than assumed.

---

## 2. Workflow Engine Model

### A. How a workflow definition identifies an entity type
`workflowDefinitions.entityType` — String enum, closed list (see §1). One row = one named, possibly-inactive definition scoped to exactly one entity type.

### B. Cardinality of definitions per entityType
Nothing in `workflowDefinitions` enforces uniqueness on `entityType` (no "unique" note on that field, unlike e.g. `articles.slug` which is explicitly marked `unique`). So the schema **permits** multiple rows sharing the same `entityType`. `isActive` (Boolean) exists per row, but no field or note enforces "only one `isActive=true` per entityType." Versioning: **no version field exists on `workflowDefinitions` at all.** Selection of "the" definition to use for a given entity+operation is not a lookup against `workflowDefinitions.entityType` — it happens one layer up, via `workflowPolicies.workflowDefinitionId` (see F below and §6). **NEEDS-DECISION** — see §6 for full analysis.

### C. How workflowSteps reference workflowDefinitions
`workflowSteps.workflowDefinitionId` — ObjectId, `ref → workflowDefinitions (N:1)`. Direct, non-polymorphic, straightforward. **PASS.**

### D. Step ordering
`workflowSteps.sequenceOrder` — Number. Simple integer ordering, no gaps/priority scheme documented but sufficient to sort steps for a definition. **PASS.**

### E. Current step
`workflowInstances.currentStepId` — ObjectId, `ref → workflowSteps (0..1:1)`. **PASS.**

### F. How assignees are represented — the fixed User-only rule
`workflowSteps.assigneeType` — String enum, and its Notes cell states explicitly: *"User — simplified from the earlier User|Role|Committee options. Per explicit decision: approval routing is always to a specific named individual, never to an abstract group (role or committee), so this field is now effectively constant but kept for schema clarity/future extension."* `workflowSteps.assigneeIds` is `[ObjectId] ref[] → users (N:N)`. **Confirmed: the schema supports ONLY named-User assignment today.** Role/Department/Committee assignment is **not** implemented, even though the enum field is architecturally left in place for a possible future extension. This is load-bearing for Scenario 3 below.

`workflowSteps.stepType` (Sequential | Parallel) combined with `requiredApprovals` (Number) covers three approval shapes without a fourth enum: Sequential = ordered chain; Parallel + requiredApprovals=1 = "ANY one approver"; Parallel + requiredApprovals=N = "N of M." **PASS**, well-designed.

### G. How workflowInstances reference the target entity
`workflowInstances.entityType` (closed enum) + `workflowInstances.entityId` (ObjectId, polymorphic across the 13 types). **PASS.** No uniqueness constraint on the `(entityType, entityId)` pair — see Scenario 6.

### H. How workflowActionHistory references workflowInstances
`workflowActionHistory.workflowInstanceId` — ObjectId, `ref → workflowInstances (N:1)`. **PASS.**

### I/J. How rejection is represented, and whether a reason is stored
`workflowActionHistory.action` — String enum: `Submitted | Resubmitted | Approved | Rejected | Returned | Delegated`. `workflowActionHistory.reason` — String, present on every action row (not action-specific). **PASS** for "is rejection represented" and "is a reason stored."

Important nuance, carried into every entity's Scenario 2 below: **`Rejected` and `Returned` are two distinct, separately-enumerated actions**, not one. Only `Returned` carries `returnedToStepId`, whose Notes cell says explicitly: *"populated only when action=Returned; the step the instance was sent back to."* `Rejected` has no analogous field. This means the schema can represent "send back to step X for changes" (`Returned` + `returnedToStepId`) but cannot represent *where* a `Rejected` instance goes next — nor whether resubmission after `Rejected` reopens the same `workflowInstance` or spawns a new one. **NEEDS-DECISION** — flagged per-entity in §3 and again in §7.

### K. Whether the return-to step is stored
See I/J — yes, but only for the `Returned` action, via `returnedToStepId`.

### L. How revisions reference the target entity
`revisions.entityType` + `revisions.entityId` — same closed 13-type poly pattern. `revisions` has **no** `updatedAt`/`updatedBy`/`archivedAt`/`archivedBy` fields — unique among all ~20 collections read in this audit. This is a deliberate immutability signal (the board's own note at `100:7619` calls it *"Snapshot pattern — freezes entity content at a point in time; Approved ≠ Published"*), confirmed structurally: a `revisions` row, once created, has no field through which it could be edited. **PASS** on immutability.

### M. How publications reference revisions/entities
`publications.entityType` + `publications.entityId` (poly, 13 types) + `publications.revisionId` (`ref → revisions (1:1)`) + `publications.workflowInstanceId` (`ref → workflowInstances (0..1:1)`, Notes: *"the specific approval that authorized this publication"*). **PASS**, and well-linked — a `publications` row can be traced back to the exact revision and the exact approval instance that produced it.

### N/O. How workflowPolicies gate operations
`workflowPolicies.entityType` (closed enum) + `workflowPolicies.operation` — String enum: **`Add | Edit | Delete` only.** `workflowPolicies.workflowRequired` (Boolean) toggles whether that specific entityType+operation pair needs approval at all. `workflowPolicies.workflowDefinitionId` (`ref → workflowDefinitions, 0..1:1`, "only set when workflowRequired=true") lets **different operations on the same entityType point to different workflow definitions** — e.g., Article+Add could use one definition, Article+Edit another. **PASS** for "does workflowPolicies support different behavior per operation."

Critically, **`operation` does not include `Publish`, `Unpublish`, or `Archive`.** Only Create/Update/Delete-shaped operations are policy-governable. See Scenario 5 for the consequence.

### P. Concurrency control
No field on `workflowInstances`, `revisions`, or `publications` implements optimistic locking (no version/`__v`-equivalent field is documented on the board), no unique index is noted on `workflowInstances(entityType, entityId)`, and no "is this the active instance for this entity" boolean exists. **GAP** — see Scenario 6.

### Supporting collections read for Scenarios 8–9

**`notifications`** (`100:7722`): `recipientId` (`ref → users`), `triggerType` (enum: `WorkflowInstance | RecordCandidate | ContactMessage`), `triggerId` (poly ref matching `triggerType`), `channel`, `readState`, `deliveryState`, `type` (enum of notification events). **There is no `workflowStepId` field and no direct `entityType`/`entityId` field** — the target entity is only reachable by following `triggerId → workflowInstances.entityId`, a second hop.

**`auditLogs`** (`100:7778`): `actorId`, `action` (enum: `Create | Update | Delete | HardDelete | StatusChange`), `entityType` (Notes: **not** the closed 13-type list — explicitly *"intentionally unrestricted; generic audit trail covers all business entities"*), `entityId`, `previousValue`/`newValue` (Object, diff snapshot), `reason`, `ipAddress`, `userAgent`. Distinct action vocabulary from `workflowActionHistory.action` (`Submitted|Resubmitted|Approved|Rejected|Returned|Delegated`), and distinct scope (all entities vs. the 13 workflow types only). Whether an `Approved`/`Rejected` workflow action is *also* separately logged as an `auditLogs` `StatusChange` row is **not stated anywhere on the board** — genuinely undetermined. See Scenario 9.

**`permissions`/`roles`** (`103:7901`/`103:7869`): `permissions.action` enum includes `Create | Read | Update | Delete | HardDelete | Approve | Publish | EditProtectedData`. This is the RBAC layer that gates *who may act*; it is a separate mechanism from `workflowStepChain` routing (*who is assigned this specific step*) and from `workflowPolicies.allowHardDelete` (*whether this entity type permits hard-delete at all*). Three independent gates, confirmed distinct by field evidence.

---

## 3. Entity-by-Entity Findings

For all 13 entities, the following engine-level facts are **entity-agnostic** and therefore repeat identically in Scenarios 6, 8, and 9 below (cited once here to avoid restating the same evidence 13 times, but still scored per-entity as required):

- **Scenario 6** (concurrent edit) is governed purely by `workflowInstances` schema, which carries no per-entity behavior — the finding is identical for all 13.
- **Scenario 8** (notifications) is governed purely by `notifications` schema, likewise entity-agnostic.
- **Scenario 9** (auditLogs vs workflowActionHistory) is an engine-boundary question, likewise entity-agnostic.

### 3.1 articles

Relevant fields (table `88:7009`): `title`, `slug` (unique), `coverMediaId`, `excerpt`, `body` (rich text), `contentCategoryId`, `publishDate`, `authorDisplayName`, `references` (poly → athletes|clubs|championships), `publicationState` (String enum, Draft|Live|Archived, denorm ← publications), `authorUserId` (`ref → users`), `tags[]`. No direct `revisionId` field on the entity itself.

#### Scenario 1 — Draft → submit → single-step approval → publish
Status: **PASS**
Evidence: `articles` row is created directly with `publicationState=Draft`; `workflowInstances.entityType='articles'` + `entityId` targets it; `workflowSteps.assigneeIds` assigns a reviewer; `workflowActionHistory.action='Approved'`; `publications.entityType='articles'`+`revisionId` records the publish, `publications.workflowInstanceId` links back to the approval.
Finding: All links needed for the golden path exist and are traceable end-to-end.

#### Scenario 2 — Draft → submit → reject → return to Draft
Status: **NEEDS-DECISION**
Evidence: `workflowActionHistory.action` distinguishes `Rejected` from `Returned`; only `Returned` populates `returnedToStepId`. `articles` has no "locked while under review" field, so the live row stays editable and the previous state is never overwritten (revisions are immutable). `reason` is stored regardless of which action fires.
Finding: Mechanically representable, but it is unresolved whether a `Rejected` `articles` submission reuses its existing `workflowInstance` (looping back) or requires the author to trigger a brand-new instance — no field distinguishes reopened-vs-new.

#### Scenario 3 — Multi-step sequential approval
Status: **PASS**
Evidence: multiple `workflowSteps` rows per `workflowDefinitionId`, each with its own `sequenceOrder` and `assigneeIds`; `workflowInstances.currentStepId` advances; each transition is a new `workflowActionHistory` row.
Finding: No inherent product signal that `articles` (news content) requires Role/Committee-level sign-off beyond named editorial reviewers — the fixed `assigneeType=User` rule is a reasonable fit here. **PASS**, not flagged for role/committee escalation.

#### Scenario 4 — Edit an already-published article
Status: **GAP**
Evidence: `revisions` can hold a new `versionNumber` row for the same `entityId` without disturbing the immutable Revision A row; `publications.revisionId` need not be repointed until B is approved. But `articles` has **no separate staging/draft-copy field** — the same `articles` document that is presumably read by the public site is also the one an editor directly mutates while preparing Revision B (there is no field on `articles` distinguishing "the live-published fields" from "the fields currently being edited for the next revision").
Finding: The schema does not state whether public rendering reads `articles` directly (risking exposure of an in-progress, unapproved edit) or exclusively through `publications → revisions.snapshotData` (which would make `snapshotData` a near-duplicate of the whole article body). This is the most significant modeling ambiguity found in this audit and recurs identically for every Group-A entity (see §7).

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION**
Evidence: `publications.status` enum = `Live | Archived` only; `articles.publicationState` enum = `Draft | Live | Archived` only. Separately, `articles.archivedAt`/`archivedBy` exist as the universal soft-delete tracking fields present on every collection. `workflowPolicies.operation` enum (`Add|Edit|Delete`) has no `Publish`/`Unpublish`/`Archive` member.
Finding: The model does not distinguish "temporarily unpublish" from "permanently archive" — both would use the same `Archived` value, and that word is separately overloaded by the unrelated `archivedAt` record-soft-delete field. Whether taking an article off the live site requires workflow approval is unspecified (not policy-governable via `workflowPolicies.operation`).

#### Scenario 6 — Concurrent edit
Status: **GAP**
Evidence: no unique index/note on `workflowInstances(entityType, entityId)`; no `isActive`/`isCurrent` flag on `workflowInstances`; no optimistic-lock field on `articles` or `revisions`.
Finding: Nothing in the schema prevents two simultaneous `workflowInstances` targeting the same `articles._id`, nor detects or resolves the resulting conflict.

#### Scenario 7 — HardDelete exception
Status: **NEEDS-DECISION**
Evidence: `workflowPolicies.allowHardDelete` (Boolean, per entityType+Delete row) + `permissions.action='HardDelete'` + `auditLogs.action='HardDelete'` (explicitly distinguished from routine `Delete`).
Finding: The permission/policy/audit gating is well represented (PASS on that narrow point), but nothing states whether an authorized HardDelete on `articles` still requires an active `workflowInstance` approval first, nor what happens to that article's `revisions`/`publications`/`workflowActionHistory` rows on deletion (no cascade or preservation rule documented).

#### Scenario 8 — Notifications
Status: **GAP**
Evidence: `notifications.recipientId`, `.triggerType`, `.triggerId` identify the recipient and (via a second hop through `workflowInstances`) the target entity; `notifications.type` identifies the event class. No `workflowStepId` field exists on `notifications`.
Finding: The specific step that triggered a notification cannot be recorded directly; it must be re-derived from `workflowInstances.currentStepId`, which may have already advanced by the time the notification is processed.

#### Scenario 9 — auditLogs vs workflowActionHistory
Status: **NEEDS-DECISION**
Evidence: distinct action vocabularies and distinct entity scopes (see §2), but no field or note confirms or excludes double-logging of `articles` workflow actions into `auditLogs`.
Finding: The two collections are evidently meant for different purposes, but their overlap boundary for `articles` (and every other entity) is unconfirmed by the schema.

---

### 3.2 staticPages

Relevant fields (table `88:7191`): `title`, `slug` (unique), `body` (rich text), `featuredImageId`, `publicationState` (denorm), `modifiedBy` (`ref → users`). No `authorUserId`, no `revisionId` field.

#### Scenario 1 — Draft → submit → approve → publish
Status: **PASS**
Evidence: identical mechanism to §3.1 — `publicationState=Draft` on creation, `workflowInstances`/`workflowActionHistory`/`publications` poly chain all include `staticPages`.
Finding: End-to-end path exists.

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION**
Evidence: same `Rejected`/`Returned` split as §3.1. `staticPages.modifiedBy` tracks the last editor but is a single scalar (not a history), so it cannot itself distinguish "editor before rejection" from "editor after."
Finding: Same reopened-vs-new-instance ambiguity as articles.

#### Scenario 3 — Multi-step sequential
Status: **PASS**
Evidence: entity-agnostic step-chain mechanism.
Finding: Static pages (About-type informational pages, not `aboutFederationPage` itself but generic ones) show no obvious need for Role/Committee routing; User-only assignment is a reasonable fit. Not flagged.

#### Scenario 4 — Edit published static page
Status: **GAP**
Evidence: same as §3.1 — no field separates the live-served copy from the being-edited-toward-next-revision copy.
Finding: Same in-place-mutation ambiguity as articles.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION**
Evidence: `staticPages.publicationState` enum = `Draft | Live | Archived` only; same `archivedAt` collision as articles.
Finding: Same unresolved distinction as articles.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level, see §2.P.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION**
Evidence: same `workflowPolicies.allowHardDelete` + `permissions.action` + `auditLogs.action` triad.
Finding: Same cascade-on-delete ambiguity as articles; `staticPages` is not one of the four flagged-sensitive entities but the gap is structurally identical.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level, see §2.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level, see §2.

---

### 3.3 externalMediaCoverage

Relevant fields (table `88:7103`): `title`, `slug` (unique), `publisherId` (`ref → externalPublishers`), `originalUrl`, `publishDate`, `summary`, `addedBy` (`ref → users`), `publicationState` (denorm), `featured` (Boolean), `tags[]`.

#### Scenario 1 — Draft → submit → approve → publish
Status: **PASS**
Evidence: same poly chain; `addedBy` plays the author-equivalent role here (field name differs from `articles.authorUserId`, same purpose).
Finding: End-to-end path exists. Note for §7 findings: the author-identifying field name is inconsistent across entities (`authorUserId` vs `addedBy` vs `modifiedBy` vs `uploadedBy` vs nothing at all) — relevant to the self-approval business rule discussed in Scenario 3.

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION** — same reasoning as §3.1/3.2.

#### Scenario 3 — Multi-step sequential + self-approval rule
Status: **NEEDS-DECISION** (narrower than a role/committee concern)
Evidence: `workflowInstances` carries a non-DB business-rule note (row `100:7512` "⚠ business rule"): *"a user must not approve their own submission ... enforce server-side by comparing the acting user against the content's submittedBy / authorUserId."* `externalMediaCoverage` has no field literally named `submittedBy` or `authorUserId` — the closest is `addedBy`.
Finding: The self-approval rule as documented references field names that do not exist on this entity. Whether `addedBy` is the intended substitute is not stated. This is a real enforceability gap, not just a naming quirk — flagged strongly in §7.

#### Scenario 4 — Edit published coverage entry
Status: **GAP** — same in-place-mutation ambiguity as §3.1.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION** — same as §3.1.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION** — same triad as §3.1; not one of the four explicitly flagged-sensitive entities, gap is structurally identical.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level.

---

### 3.4 governanceDocuments

Relevant fields (table `77:5912`): `title`, `type` (enum: Regulation|Policy|Form|Guide|Decision), `fileId` (`ref → documents, 1:1`), `publicationState` (denorm), `description`, `documentVersion`. **No `revisionId` field, no author/creator content field beyond generic `createdBy`.**

#### Scenario 1 — Draft → submit → approve → publish
Status: **NEEDS-DECISION**
Evidence: `governanceDocuments` participates in the same poly chain as every other entity. But `governanceDocuments.fileId` points 1:1 to a `documents` row, and `documents` is *itself* one of the 13 workflow-participating entity types, with its own `publicationState`/`uploadedBy`.
Finding: The schema does not state whether approving a `governanceDocuments` record's own workflow is sufficient to make it live, or whether the underlying `documents` row it references must *independently* pass through its own Draft→Approve→Publish cycle too. Two workflow-governed collections point at each other with no coordination field. This is a genuine cross-entity architectural question, not a missing-field problem per se.

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION** — same `Rejected`/`Returned` ambiguity as §3.1, compounded by the two-collection coordination question from Scenario 1 above (does rejecting the `governanceDocuments` wrapper also need to roll back the referenced `documents` file, or are they independent?).

#### Scenario 3 — Multi-step sequential + Role/Committee need
Status: **NEEDS-DECISION**
Evidence: `governanceDocuments.type` includes `Regulation | Policy | Decision` — instruments that, in most federation governance practice, are signed off by a standing body (e.g., a Legal or Executive committee) rather than by whichever individual currently holds a named user account. `workflowSteps.assigneeType` is fixed to `User` (§2.F).
Finding: This is a strong, concrete candidate for the "inherently requires Role/Department/Committee-level assignment" case the audit was asked to surface. Hard-coding named `assigneeIds` for regulation/policy approval creates a maintenance burden every time board/committee membership changes — flagged for owner decision, not for schema modification.

#### Scenario 4 — Edit a published governance document
Status: **GAP** — same in-place-mutation ambiguity as §3.1, plus the `documents.fileId` coordination question from Scenario 1: a new file upload on the referenced `documents` row would not automatically create a new `governanceDocuments` revision.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION** — same as §3.1. Notably more consequential here: since `governanceDocuments` covers Regulation/Policy/Decision instruments, the distinction between "temporarily unpublished" and "formally rescinded/archived" carries real governance weight, and the schema draws no line between them.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION** — explicitly flagged for special attention by the audit brief.
Evidence: same triad (`workflowPolicies.allowHardDelete`, `permissions.action`, `auditLogs.action`) as every entity, plus the two-collection linkage to `documents` (Scenario 1).
Finding: If `governanceDocuments` is hard-deleted, it is unspecified whether the `documents` row it points to via `fileId` is also removed, orphaned, or left untouched — a real data-integrity question the schema does not answer, made sharper because both are independently workflow-governed content types.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level.

---

### 3.5 strategicPlansPage

Relevant fields (table `77:5862`): `heroTitle`, `federationId`, `periodStart`/`periodEnd`, `documentId` (`ref → documents, 0..1:1`), `publicationState` (denorm), `heroSubtitle`, `introHeading`/`introText`, `foundationPillars[]`, `strategicAxes[]`, `objectives[]`, `impactMetrics[]`, `documentVersion`, **`revisionId`** (`ref → revisions, 0..1:1` — explicitly present here, unlike most other entities; Notes: *"was missing despite publicationState usage; added for consistency with visionMission's pattern"*), `heroImageId`.

#### Scenario 1 — Draft → submit → approve → publish
Status: **NEEDS-DECISION**
Evidence: same `documentId → documents` two-collection coordination question as `governanceDocuments` (Scenario 1, §3.4) applies identically here — `strategicPlansPage.documentId` is a forward reference to an independently-workflow-governed `documents` row holding the actual PDF.
Finding: Same unresolved question as governanceDocuments — does the PDF's own `documents.publicationState` need to independently reach Live, or is it irrelevant once `strategicPlansPage` itself is approved?

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION** — same `Rejected`/`Returned` ambiguity as §3.1.

#### Scenario 3 — Multi-step sequential + Role/Committee need
Status: **NEEDS-DECISION**
Evidence: a federation's strategic plan (`foundationPillars`, `strategicAxes`, `objectives`, `impactMetrics`) is a board-level artifact by nature.
Finding: Same reasoning as `governanceDocuments` — a strong candidate for inherent committee/board-level sign-off that the current User-only `assigneeType` cannot express natively.

#### Scenario 4 — Edit published strategic plan
Status: **GAP** — same in-place-mutation ambiguity as §3.1. Slightly mitigated here in that the explicit `revisionId` field exists, but it is a single scalar pointer (0..1:1), so it can only ever reference *one* revision at a time from the entity side — consistent with, not a resolution of, the underlying ambiguity about what the public site actually reads.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION** — same as §3.1.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION** — same triad; same `documents`-linkage ambiguity as governanceDocuments.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level.

---

### 3.6 visionMissionPage

Relevant fields (table `77:5818`): `federationId`, `visionText`, `missionText`, **`revisionId`** (`ref → revisions, 0..1:1`), `publicationState` (denorm), `strategicGoals[]` (embed, Notes: *"no independent revision/publication lifecycle... same reasoning as aboutFederation.achievements[]"*), `coreValues[]` (same note), `heroImageId`, `heroTitle`, `heroSubtitle`.

#### Scenario 1 — Draft → submit → approve → publish
Status: **PASS**
Evidence: standard poly chain; `revisionId` present directly on the entity, unlike most others.
Finding: No secondary `documents` linkage complicating this one (unlike governanceDocuments/strategicPlansPage) — cleanest Scenario-1 case among the "governance-flavored" entities.

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION** — same `Rejected`/`Returned` ambiguity as §3.1.

#### Scenario 3 — Multi-step sequential + Role/Committee need
Status: **PASS**
Evidence: Vision/Mission statements are typically edited rarely and approved once at leadership level; no field evidence of a *recurring, high-frequency* multi-approver need beyond what named-user routing already supports. Not flagged for escalation — noted as a softer case than `governanceDocuments`/`strategicPlansPage`, but a reasonable owner could disagree; recorded as PASS rather than NEEDS-DECISION because no field-level signal (unlike the `type` enum on governanceDocuments) forces the question.

#### Scenario 4 — Edit published vision/mission content
Status: **GAP** — same in-place-mutation ambiguity as §3.1. The explicit embedded arrays `strategicGoals[]`/`coreValues[]` are documented as sharing the page's single lifecycle (no independent revisioning), which is internally consistent but does not resolve the broader question.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION** — same as §3.1.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION** — same triad.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level.

---

### 3.7 aboutFederationPage

Relevant fields (table `122:8210`): `heroImageId`, `heroTitle`, `heroSubtitle`, `foundingDate`, `achievements[]` (embed, same "no independent lifecycle" note as visionMission), `publicationState` (denorm), `historicalIntro`, `foundingDecreeCaption`, `roleHeading`/`roleText`, `globalMembershipYear`/`Heading`/`Text`, `firstPresidentPhoto`/`Name`/`Title`/`Bio`. **No `revisionId` field.**

#### Scenario 1 — Draft → submit → approve → publish
Status: **PASS** — standard poly chain, no secondary-collection complication.

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION** — same ambiguity as §3.1.

#### Scenario 3 — Multi-step sequential + Role/Committee need
Status: **PASS** — informational/historical content, no strong signal for committee-level routing beyond what User assignment covers.

#### Scenario 4 — Edit published About page
Status: **GAP** — same in-place-mutation ambiguity as §3.1.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION** — same as §3.1.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION** — same triad.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level.

---

### 3.8 presidentMessagePage

Relevant fields (table `122:8260`): `heroImageId`, `heroTitle`, `messageBody` (rich text), `signatoryName`/`signatoryTitle` (both explicitly denormalized display snapshots, Notes: *"canonical identity comes from federationAppointmentId → federationAppointments → federationPersonnel"*), `publicationState` (denorm), `federationAppointmentId` (`ref → federationAppointments, 1:1`), `heroSubtitle`, `goals[]`. **No `revisionId` field.**

#### Scenario 1 — Draft → submit → approve → publish
Status: **PASS** — standard poly chain.

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION** — same ambiguity as §3.1.

#### Scenario 3 — Multi-step sequential + Role/Committee need
Status: **NEEDS-DECISION**
Evidence: this is the President's own public message — by its nature it plausibly needs sign-off *from the President's own office* specifically (i.e., a designated role tied to `federationAppointmentId`), not an arbitrary named editor.
Finding: A real candidate where routing "to whoever currently holds the President-appointment" (a role/appointment-scoped concept the schema already models elsewhere via `federationAppointmentId`) would be more robust than a hardcoded `assigneeIds` list, since `federationAppointments.status` already tracks term changes (`Active|Completed|Resigned|Removed|Transitioned|Deceased` per `204:8885`). Flagged for owner decision.

#### Scenario 4 — Edit published President's message
Status: **GAP** — same in-place-mutation ambiguity as §3.1.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION** — same as §3.1.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION** — same triad.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level.

---

### 3.9 organizationalStructure

Relevant fields (table `77:5774`): `title`, `parentNodeId` (`ref → organizationalStructure`, self, 0..1:1), `departmentId` (`ref → departments`, 0..1:1), `displayOrder`, `nodeType` (enum: General Assembly|Board|Committee|Executive|Department, Notes: *"nodes do not link directly to a person by default"*), `publicationState` (denorm), `federationAppointmentId` (0..1:1, optional). No `revisionId` field.

#### Scenario 1 — Draft → submit → approve → publish
Status: **PASS** — standard poly chain, self-referencing `parentNodeId` does not interfere with workflow mechanics.

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION** — same ambiguity as §3.1.

#### Scenario 3 — Multi-step sequential + Role/Committee need
Status: **NEEDS-DECISION**
Evidence: `nodeType` includes `Board` and `Committee` values — changing the organizational chart itself (adding/removing/re-parenting a Board or Committee node) is structurally exactly the kind of change that federation governance rules typically require board-level approval for, not a single named editor.
Finding: Flagged as a real candidate for the Role/Committee-assignment gap, same class of reasoning as `governanceDocuments`.

#### Scenario 4 — Edit a published org-chart node
Status: **GAP** — same in-place-mutation ambiguity as §3.1. Compounded slightly: because `parentNodeId` is a live self-reference, an in-progress edit to a node's parent would also visibly change the *tree structure* for any other node computing its position relative to it, not just that node's own fields — a sharper version of the general Scenario-4 concern.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION** — same as §3.1.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION** — same triad. Removing a `Board`/`Committee` node also has knock-on effects on any `organizationalStructure` rows whose `parentNodeId` points to it, and on `federationAppointments`/`committees` rows that may reference it — none of these cascades are defined.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level.

---

### 3.10 committees

Relevant fields (table `77:5730`): `name`, `description`, `displayOrder`, `isActive` (Boolean), `publicationState` (denorm), `committeeType` (enum: Technical|Administrative|Disciplinary|Judging|Other), `committeeGroup` (enum: Leadership|Specialized, Notes: *"manually set by admin ... not auto-derived"*). No `revisionId` field.

The domain-note at `134:8648` is directly relevant here: *"committees was added to the workflow list instead [of being exempted like sponsors/partnerships/memberships], since committee descriptions are genuinely editorial narrative content."* This confirms `committees` is treated as ordinary editorial content for workflow purposes, not as a governance-structural type the way `organizationalStructure` is — despite the two being closely related conceptually.

#### Scenario 1 — Draft → submit → approve → publish
Status: **PASS** — standard poly chain.

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION** — same ambiguity as §3.1.

#### Scenario 3 — Multi-step sequential + Role/Committee need
Status: **NEEDS-DECISION**
Evidence: `committeeType` includes `Disciplinary | Judging` — editing the *description* of a Disciplinary or Judging committee is lower-stakes than an organizational-structure change, but per the domain note above this collection stores only narrative description content, not the committee's membership/authority (that lives in `organizationalStructure`/`federationAppointments`). Given that scoping, the case for mandatory committee-level sign-off is weaker than for `organizationalStructure` or `governanceDocuments`.
Finding: Flagged NEEDS-DECISION out of caution (Disciplinary/Judging committee descriptions can carry real weight) but with lower confidence than the organizationalStructure finding — an owner call either way is reasonable.

#### Scenario 4 — Edit a published committee description
Status: **GAP** — same in-place-mutation ambiguity as §3.1.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION**
Evidence: same `publicationState`/`archivedAt` overlap as §3.1, compounded by `committees.isActive` — a **third**, separately-tracked Boolean that also expresses an on/off state, distinct from both `publicationState` and `archivedAt`.
Finding: `committees` has three different fields that can each independently signal "this committee is not currently in effect" (`isActive=false`, `publicationState=Archived`, `archivedAt` set) with no documented rule for how they relate or which is authoritative.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION** — explicitly flagged for special attention by the audit brief.
Evidence: same triad as every entity; `committees` is additionally referenced by `federationAppointments.committeeId` (0..1:1, populated for CommitteeChair/CommitteeMember roleTypes, per `204:8885`).
Finding: Hard-deleting a committee would orphan any `federationAppointments` rows pointing to it via `committeeId` — no cascade rule is defined.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level.

---

### 3.11 documents

Relevant fields (table `94:7376`): `file` (embed, bilingual `{en:{...}, ar:{...}}`), `documentType` (enum: GovernancePolicy|Regulation|ConsentForm|Contract|Certificate|MeetingMinutes|Other), `ownerType` (enum: Club|Athlete|Coach|Official|Championship|Membership|Sponsorship), `ownerId` (poly, "attachment use only"), `effectiveDate`/`expiryDate`, `publicationState` (denorm), `uploadedBy` (`ref → users`).

A domain note at `95:7430` is directly load-bearing here: *"Two distinct patterns, not redundant: (1) documents.ownerId (above) = generic attachment to an entity where the file is secondary ... (2) governanceDocuments.fileId / strategicPlans.documentId = a one-way forward reference where the document IS the primary content of its own governed, workflow-tracked entity — that entity does NOT also appear in this ownerId list."* This confirms `documents.ownerId` is a **completely separate relationship** from the `governanceDocuments.fileId`/`strategicPlansPage.documentId` forward-references — `documents` plays two structurally different roles depending on how it is reached.

#### Scenario 1 — Draft → submit → approve → publish
Status: **NEEDS-DECISION**
Evidence: `documents` itself carries `publicationState`, so a `documents` row created *directly* (e.g., a standalone policy PDF, `ownerType`/`ownerId` unset) follows the same golden path as any other entity — **PASS** for that usage mode. But when a `documents` row is the *target* of `governanceDocuments.fileId` or `strategicPlansPage.documentId`, its own workflow lifecycle runs in parallel with, and uncoordinated against, the referencing entity's workflow (see §3.4/§3.5 Scenario 1).
Finding: `documents` has two usage modes with different workflow implications, and the schema does not state which applies when, nor whether the referencing entity's approval should short-circuit or trigger the referenced document's own approval. `ownerType`/`ownerId` (Club|Athlete|...) is a third, unrelated attachment mode that plays no role in workflow at all.

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION** — same `Rejected`/`Returned` ambiguity as §3.1, plus the dual-usage-mode question above.

#### Scenario 3 — Multi-step sequential + Role/Committee need
Status: **NEEDS-DECISION**
Evidence: `documentType` includes `GovernancePolicy | Regulation | Contract` — the same governance-weight reasoning as §3.4 applies when `documents` is used as a standalone governed record rather than a referenced attachment.
Finding: Same committee/role-routing candidate as `governanceDocuments`, narrower in scope (only applies to the standalone-document usage mode).

#### Scenario 4 — Edit a published document (re-upload)
Status: **GAP** — same in-place-mutation ambiguity as §3.1, sharpened: `file` is a single embedded object (bilingual URL/mimeType/size/filename), so a re-upload literally overwrites the field that (per the same ambiguity) may or may not be what the public site currently serves.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION** — same as §3.1. `expiryDate` adds a further wrinkle: a document past its `expiryDate` is conceptually "expired," a **fourth** state-like concept alongside `publicationState`, `archivedAt`, with no field or note relating `expiryDate` to either.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION** — explicitly flagged for special attention by the audit brief.
Evidence: same triad; plus the two-usage-mode complication — hard-deleting a `documents` row that is the target of a `governanceDocuments.fileId` reference would break that reference with no cascade rule defined, exactly the same integrity question raised in §3.4 Scenario 7 but from the other direction.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level.

---

### 3.12 contactMessages — special lifecycle (see also §5)

Relevant fields (table `108:8150`): `messageType` (enum), `senderName`/`senderEmail`/`senderPhone`, `messageBody`, **`status`** (String enum: `New | InProgress | Resolved | Closed` — Notes explicitly: *"primary field — ... (own lifecycle, not denorm)"*), `assignedToId`/`assignedToType` (poly: User|Role), `workflowInstanceId` (`ref → workflowInstances, 0..1:1`, Notes: *"only if formal workflow triggered"*). **No `publicationState` field. No `revisionId` field.**

The domain note at `108:8149` states this outright: *"Ninth and final workflow-list type. status is PRIMARY/owned here (not a denorm mirror) — workflow participation is conditional per Phase 1.1 §13, unlike the other 8 which always publish through one lifecycle."* This is the clearest, most explicit signal on the entire board that `contactMessages` does **not** fit the generic Draft→Review→Approve→Publish model, and the schema authors already knew it.

#### Scenario 1 — Draft → submit → single-step approval → publish
Status: **GAP**
Evidence: `contactMessages` has no `publicationState` field, yet `revisions.entityId` and `publications.entityId`'s poly lists both include `contactMessages` as a valid target type (the closed 13-type list is applied uniformly across all five collections per §1).
Finding: The schema *technically permits* a `revisions`/`publications` row to be created for a `contactMessages._id`, but there is no field on `contactMessages` for a `publications` sync to write into (every other entity's `publicationState` Notes cell says "denorm ← publications"; `contactMessages` has no such field). "Publishing" an inbound citizen message is also product-nonsensical. This is a genuine schema inconsistency: the poly reference list does not carve out the one entity that structurally cannot participate in the publish half of the pattern.

#### Scenario 2 — Draft → submit → reject → return to Draft
Status: **GAP**
Evidence: `contactMessages.status` has no `Draft` value at all (`New|InProgress|Resolved|Closed`).
Finding: "Return to Draft" is not representable because there is no Draft-equivalent state for a citizen-submitted message, and there is no "author" who could revise and resubmit it the way a staff editor would — the sender is an external, unauthenticated citizen.

#### Scenario 3 — Multi-step sequential approval
Status: **PASS** (conditionally)
Evidence: when `workflowInstanceId` is populated ("only if formal workflow triggered"), the same `workflowSteps`/`workflowActionHistory` machinery applies identically to any other entity.
Finding: Mechanically sound *if and only if* workflow is triggered at all; `assignedToId`/`assignedToType` (User|Role) is worth noting — **this is the only one of the 13 entities whose own collection carries a Role-capable assignment field**, even though it is for message routing/ownership, not `workflowSteps` approval routing. Not a Scenario-3 role/committee flag in the workflow-engine sense, but worth cross-referencing against §2.F's User-only constraint.

#### Scenario 4 — Edit an already-published item
Status: **GAP**
Evidence: no `publicationState`, no `revisionId`.
Finding: Not representable — and not applicable — by design; a contact message is never "published," so this scenario has no analog for this entity.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION**
Evidence: `contactMessages.archivedAt`/`archivedBy` exist (universal tracking fields) but there is no `publicationState` to "unpublish."
Finding: Record-level archive (soft-delete) is representable via the generic `archivedAt` mechanism; "unpublish" has no meaning here and the schema correctly does not attempt to represent it — but this should be an explicit, documented exemption rather than an implicit one.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level (§2.P), applies if/when a `workflowInstance` exists for a message.

#### Scenario 7 — HardDelete exception
Status: **NEEDS-DECISION** — explicitly flagged for special attention by the audit brief.
Evidence: same triad. `contactMessages` additionally carries citizen PII (`senderName`, `senderEmail`, `senderPhone`, `messageBody`, all marked `[RESTRICTED]`, one Notes cell explicitly: *"part of a private citizen submission record — not public data"*).
Finding: This is the entity where HardDelete-vs-archive policy has the clearest real-world driver (data-subject deletion requests under PDPL-type regimes), yet the schema's HardDelete gating (`workflowPolicies.allowHardDelete`) is identical, undifferentiated machinery shared with every other entity type — no PII-specific consideration is encoded.

#### Scenario 8 — Notifications
Status: **PASS/GAP mixed**
Evidence: `notifications.triggerType` enum explicitly includes `ContactMessage` as a first-class value (not just `WorkflowInstance`), and `notifications.type` includes `ContactMessageAssigned`.
Finding: Better represented here than for the other 12 entities — `contactMessages` gets its own direct notification trigger path, not only the two-hop `workflowInstance` path. Still no `workflowStepId` (same engine-level gap), but the entity itself is more directly reachable. Marked mixed rather than a clean PASS because the step-level gap from §2 still applies whenever a formal workflow *is* triggered for a message.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level, same as all other entities.

---

### 3.13 publicEvents

Relevant fields (table `289:4555`): `title`, `description`, `coverImage`, `eventType` (enum: Conference|Celebration|Ceremony|Other), `startDate`/`endDate`, `venueId`, `publicationState` (denorm), `seasonId` (`ref → seasons`), `championshipId` (0..1:1, optional), `status` (enum: Upcoming|Ongoing|Completed — a *second*, calendar-facing status distinct from `publicationState`), `slug` (unique).

#### Scenario 1 — Draft → submit → approve → publish
Status: **PASS** — standard poly chain, no secondary-collection complication.

#### Scenario 2 — Reject → return to Draft
Status: **NEEDS-DECISION** — same ambiguity as §3.1.

#### Scenario 3 — Multi-step sequential + Role/Committee need
Status: **PASS** — event listings (conferences/ceremonies) show no strong signal for committee-level sign-off beyond named-editor review.

#### Scenario 4 — Edit a published event listing
Status: **GAP** — same in-place-mutation ambiguity as §3.1.

#### Scenario 5 — Unpublish / Archive
Status: **NEEDS-DECISION**
Evidence: same `publicationState`/`archivedAt` overlap as §3.1, further complicated by the *separate* `status` enum (Upcoming|Ongoing|Completed) — a public event that has finished (`status=Completed`) is a different concept from one that has been unpublished/archived from the site, and the schema keeps these as two independent fields with no stated relationship (e.g., does `status=Completed` auto-trigger anything on `publicationState`? No.).
Finding: A third example (after `committees` and `documents`) of an entity where multiple independently-tracked state-like fields coexist without a documented reconciliation rule.

#### Scenario 6 — Concurrent edit
Status: **GAP** — engine-level.

#### Scenario 7 — HardDelete
Status: **NEEDS-DECISION** — same triad; `publicEvents.championshipId` link means hard-deleting an event tied to a championship could affect championship-side listings, no cascade defined.

#### Scenario 8 — Notifications
Status: **GAP** — engine-level.

#### Scenario 9 — auditLogs boundary
Status: **NEEDS-DECISION** — engine-level.

---

## 4. Cross-Entity Scenario Matrix

| Entity | S1 Create | S2 Reject | S3 Multi-Step | S4 Published Revision | S5 Unpublish/Archive | S6 Concurrent Edit | S7 HardDelete | S8 Notifications | S9 Audit Boundary |
|---|---|---|---|---|---|---|---|---|---|
| articles | PASS | NEEDS-DECISION | PASS | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| staticPages | PASS | NEEDS-DECISION | PASS | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| externalMediaCoverage | PASS | NEEDS-DECISION | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| governanceDocuments | NEEDS-DECISION | NEEDS-DECISION | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| strategicPlansPage | NEEDS-DECISION | NEEDS-DECISION | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| visionMissionPage | PASS | NEEDS-DECISION | PASS | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| aboutFederationPage | PASS | NEEDS-DECISION | PASS | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| presidentMessagePage | PASS | NEEDS-DECISION | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| organizationalStructure | PASS | NEEDS-DECISION | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| committees | PASS | NEEDS-DECISION | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| documents | NEEDS-DECISION | NEEDS-DECISION | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |
| contactMessages | GAP | GAP | PASS | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | PASS/GAP | NEEDS-DECISION |
| publicEvents | PASS | NEEDS-DECISION | PASS | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION | GAP | NEEDS-DECISION |

---

## 5. Special Entity Lifecycle Findings

**`contactMessages`** is the only entity of the 13 that does not fit the generic lifecycle, and the schema authors documented this themselves (`108:8149`). It has no Draft-equivalent state, no revision/publication concept that makes product sense despite being technically poly-reachable, workflow participation is optional rather than universal, and its own collection is the only one of the 13 with a Role-capable assignment field (`assignedToType`). The sender is an anonymous/external citizen, not a workflow "author" who can resubmit — meaning Scenario 2's "return to Draft for editing" has no real-world referent for this entity. This is a correctly-recognized exception in the schema's own documentation, but the mechanical inconsistency flagged in §3.12 Scenario 1 (poly lists including `contactMessages` despite it having nowhere to receive a `publications` sync) should be resolved or explicitly documented as intentional dead-path.

**`governanceDocuments`, `documents`** together form a two-collection coordination question, not a special lifecycle exactly, but the closest the schema comes to a second special case: `governanceDocuments.fileId` forward-references a `documents` row, and both are independently workflow-governed (both carry `publicationState`). No field states whether these two lifecycles are meant to run in lockstep, independently, or whether one should dominate. `strategicPlansPage.documentId` has the identical shape and the identical open question. See §3.4/§3.5/§3.11 Scenario 1 and Scenario 7.

**`committees`** has three independently-tracked state-like fields (`isActive`, `publicationState`, `archivedAt`) with no reconciliation rule — see §3.10 Scenario 5.

**`documents`** additionally has `expiryDate`, a fourth state-like concept alongside `publicationState`/`archivedAt` — see §3.11 Scenario 5.

**`publicEvents`** has a second, calendar-facing `status` (Upcoming|Ongoing|Completed) independent of `publicationState` — see §3.13 Scenario 5.

No other entity among the 13 showed a lifecycle shape requiring special-case treatment beyond the generic Draft→Review→Approve→Publish pattern and the cross-cutting engine-level gaps in §7.

---

## 6. Multiple Workflow Definition Analysis

Answering the seven questions posed by the audit brief, strictly from schema evidence (`workflowDefinitions` `100:7436`, `workflowPolicies` `277:4402`, `workflowInstances` `100:7512`):

1. **Can multiple definitions exist for the same entityType?** Schema-permitted: `workflowDefinitions.entityType` carries no uniqueness note. **Yes, structurally possible.**
2. **How is the selected definition determined?** Not by querying `workflowDefinitions` for the entityType directly. Selection happens via `workflowPolicies`, keyed by `(entityType, operation)`, whose `workflowDefinitionId` is a single direct pointer (set "only when workflowRequired=true"). `workflowInstances.workflowDefinitionId` is presumably copied from that policy row at trigger time (not stated, but the only mechanism the schema provides).
3. **Can workflowPolicies select different definitions by operation?** **Yes — confirmed.** `operation` enum (`Add|Edit|Delete`) means Article+Add and Article+Edit can each carry a different `workflowDefinitionId`. This directly satisfies the "Article → Create Workflow / Update Workflow / Delete Workflow" shape from the brief's example.
4. **Is there an active/default workflow?** `workflowDefinitions.isActive` (Boolean) exists but nothing enforces "exactly one active definition per entityType," and since selection is actually driven by the direct `workflowPolicies.workflowDefinitionId` pointer rather than an "isActive lookup," the practical function of `isActive` is closer to "usable/deprecated" than "the current one."
5. **Is there priority/order among candidates?** No — not needed under the current one-pointer-per-(entityType,operation) model, but also means the "Article → Minor Edit Workflow vs. Major Revision Workflow" shape (two definitions for the *same* operation, chosen dynamically per submission) is **not supported**: there is exactly one `workflowDefinitionId` slot per policy row, no field for a submission-time choice between candidates.
6. **Is there versioning of definitions?** **No** — no version field on `workflowDefinitions` at all.
7. **Can an existing workflowInstance retain its old definition if the definition changes later?** **No** — `workflowSteps.workflowDefinitionId` is a live reference, not a frozen copy; unlike `revisions.snapshotData` (which explicitly freezes content), there is no equivalent mechanism freezing a *workflow's step structure* for an in-flight instance. If a workflow's steps are edited mid-flight, running instances are exposed to that structural change with no protection.

**Overall: NEEDS-DECISION.** The schema fully supports per-operation workflow selection (a real capability, confirmed working) but does not support per-submission workflow-variant selection, definition versioning, or definition-change isolation for in-flight instances.

---

## 7. Workflow Engine Findings

### Critical GAPs
- **No concurrency control** (§2.P, Scenario 6, all 13 entities): no unique constraint on `workflowInstances(entityType, entityId)`, no active-instance flag, no optimistic locking anywhere in the reviewed schema. Two simultaneous workflow instances against the same entity are not prevented or detected.
- **In-progress-edit exposure risk** (Scenario 4, 12 of 13 entities): the schema does not state whether public rendering reads the entity's own collection row directly or exclusively through `publications → revisions.snapshotData`. If the former, "Approved ≠ Published" (the model's own stated hard rule, `100:7670`) can be silently violated the moment an editor starts drafting the next revision on a Live entity, because there is no separate staging copy — the same row is both the public source and the editing surface.

### Architectural GAPs
- **`Rejected` vs `Returned` reuse ambiguity** (Scenario 2, all entities): `returnedToStepId` is populated only for `Returned`; nothing states whether a `Rejected` submission reopens its existing `workflowInstance` or requires a new one.
- **Notifications cannot identify the triggering step** (Scenario 8, all entities): `notifications` has `triggerId`/`triggerType` but no `workflowStepId`; step context requires a second, potentially-stale lookup through `workflowInstances.currentStepId`.
- **`workflowPolicies.operation` does not cover Publish/Unpublish/Archive** (Scenario 5, all entities): only `Add|Edit|Delete` are policy-governable, leaving the publish/unpublish/archive transitions ungoverned by the same per-entity approval-requirement mechanism.
- **"Archived" is overloaded** (Scenario 5, all entities): `publications.status`/`{entity}.publicationState` use `Archived` for "taken off the live site," while the universal `archivedAt`/`archivedBy` tracking fields use the same word for record-level soft-delete — two different concepts sharing one term, with `committees.isActive` adding a third independent on/off signal for that entity specifically.
- **Self-approval rule references non-existent fields** (Scenario 3, most entities): the documented business rule on `workflowInstances` (row `100:7512`, "⚠ business rule") says to compare the acting user against "the content's submittedBy / authorUserId" — but only `articles` has an `authorUserId` field, and no entity has a field literally named `submittedBy`. The rule is stated but not uniformly enforceable as written.
- **No cross-collection cascade rules on HardDelete** (Scenario 7, all entities, sharpest for `governanceDocuments`↔`documents`, `committees`↔`federationAppointments`, `organizationalStructure` self-references, `contactMessages` PII): `workflowPolicies.allowHardDelete` gates *whether* hard-delete is permitted, but nothing states what happens to related `revisions`/`publications`/`workflowActionHistory` rows, or to other collections' references into the deleted row, once it fires.
- **`workflowDefinitions` has no versioning and in-flight instances are not isolated from later structural edits** (§6, all entities).

### NEEDS-DECISION (business/product, not schema)
- Whether `Rejected` vs `Returned` map onto different real product flows, and which one is "reject → back to Draft" (§2.I/J).
- Whether Regulation/Policy/Board-structural entities (`governanceDocuments`, `strategicPlansPage`, `organizationalStructure`, arguably `committees`, `presidentMessagePage`) need Role/Committee/Appointment-scoped assignment beyond today's fixed User-only `assigneeType`.
- Whether `documents` records referenced via `governanceDocuments.fileId`/`strategicPlansPage.documentId` should have independent or coordinated workflow lifecycles with their parent entity.
- Whether `contactMessages` should remain poly-eligible for `revisions`/`publications` at all, given it has no field to receive a `publications` sync.
- How `committees.isActive`, `{entity}.publicationState`, and `{entity}.archivedAt` are meant to relate wherever more than one exists on the same entity.
- Whether HardDelete requires an approval workflow of its own, or is immediate once RBAC-authorized.
- Whether workflow actions are duplicated into `auditLogs`, or `workflowActionHistory` is the exclusive record of workflow-specific events (Scenario 9, all entities).

### PASS
- The 13-type closed list is genuinely consistent across all five collections that reference it (`workflowDefinitions`, `workflowInstances`, `revisions`, `publications`, `workflowPolicies`) — independently re-verified during this audit, not merely asserted by the board's own note.
- Step ordering, current-step tracking, and the Sequential/Parallel + requiredApprovals approval-shape model are all well represented and sufficient for Scenario 1 and Scenario 3's mechanical requirements across all 13 entities.
- Rejection reason storage and return-to-step targeting are represented (for the `Returned` path).
- Revision immutability is structurally enforced by the absence of update fields on `revisions`.
- `publications.workflowInstanceId` and `revisions`/`publications` cross-linkage give a fully traceable approval-to-publish chain.
- Per-operation workflow-definition selection (`workflowPolicies.workflowDefinitionId` keyed by entityType+operation) works and is confirmed by evidence, not assumed.
- `contactMessages`'s exceptional lifecycle is self-documented in the schema, not silently inconsistent — the authors recognized it as different (`108:8149`), even though one mechanical inconsistency (poly-list inclusion in `revisions`/`publications`) slipped through.

---

## 8. Implementation Readiness

**READY WITH OPEN DECISIONS**

The engine's structural backbone (definitions → steps → instances → action history → revisions → publications, entity-agnostic, closed-list-consistent) is sound and implementable as-is for the mechanical golden path (Scenario 1) across 11 of 13 entities without further schema work. However, a NestJS+Mongoose implementation begun today would encounter real, undecided product questions almost immediately upon reaching Scenario 4 (how public read paths should source content) and Scenario 6 (no concurrency guard) — these are not edge cases, they are core to any multi-editor CMS workflow and should be resolved before, not during, implementation of the revision/publish pipeline.

---

## 9. Critical Gaps
See §7 "Critical GAPs" — concurrency control and in-progress-edit exposure risk. These two apply uniformly across the engine and are the two items most likely to cause a production incident (a lost approval due to a race, or unapproved content briefly visible) if implementation proceeds without resolving them first.

---

## 10. Architectural Gaps
See §7 "Architectural GAPs" — seven items, ranging from ambiguous reject-semantics to unenforceable self-approval rules to missing HardDelete cascade behavior.

---

## 11. Needs Decisions
See §7 "NEEDS-DECISION" for the consolidated cross-entity list, and §3.x per-entity write-ups for entity-specific instances (notably §3.4/§3.5/§3.9's Role/Committee-routing candidates and §3.4/§3.5/§3.11's `documents`-linkage coordination question).

---

## 12. Exact Open Questions for Product/Architecture Review

1. Does `Rejected` reopen the existing `workflowInstance`, or must the author's resubmission create a new one? What does a `Rejected` instance's `currentStepId` do — freeze, clear, or stay put?
2. Does public-facing rendering read `articles`/`staticPages`/etc. directly, or exclusively through `publications → revisions.snapshotData`? This single decision determines whether Scenario 4's in-place-mutation concern is real or already mitigated at the application layer.
3. Should `governanceDocuments`, `strategicPlansPage`, `organizationalStructure`, `committees`, and `presidentMessagePage` get Role/Committee/Appointment-scoped step assignment, or is named-User assignment (with manual maintenance as personnel change) the accepted tradeoff?
4. Should `workflowPolicies.operation` be extended to cover Publish/Unpublish/Archive as independently governable operations, or is publish/archive intentionally always-workflow-gated with no per-entity toggle?
5. Is "Unpublish" a distinct concept from "Archive," and if so, does it need its own state distinct from the current two-value `publications.status` (`Live|Archived`)?
6. When `governanceDocuments.fileId` / `strategicPlansPage.documentId` points at a `documents` row, should the two collections' workflows run independently, in lockstep, or should one dominate?
7. Should `contactMessages` be removed from the `revisions`/`publications` poly-eligible list, given it has no `publicationState` field to sync into?
8. Is HardDelete required to pass through a workflow approval first, or is RBAC authorization (`permissions.action='HardDelete'`) sufficient on its own?
9. What happens to a hard-deleted entity's `revisions`, `publications`, and `workflowActionHistory` rows — cascade-delete, orphan-in-place, or cascade-archive?
10. Are workflow actions (`Approved`/`Rejected`/etc.) also written to `auditLogs` as `StatusChange` rows, or is `workflowActionHistory` the sole record of workflow events?
11. For `committees` (`isActive` + `publicationState` + `archivedAt`) and `documents` (`expiryDate` + `publicationState` + `archivedAt`) and `publicEvents` (`status` + `publicationState`): what is the authoritative relationship between each entity's multiple independently-tracked state fields?
12. Should the self-approval prevention rule's field reference (`submittedBy` / `authorUserId`) be standardized across all 13 entities, given only `articles` currently has a matching field?

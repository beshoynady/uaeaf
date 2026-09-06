# UAEAF Backend — Contextual Content Authorization: Architecture Design

**Phase:** Architecture / Design only. No source code, schema, DTO, controller, service, guard, config, migration, or test file was modified to produce this document.

**Prepared as:** Senior Backend Architect + Application Security Engineer, continuing directly from `docs/security/auth-authorization-architecture-approval.md` §13, which flagged this exact gap as `DESIGN DECISION REQUIRED` and explicitly out of scope for that review.

**Date:** 2026-09-06

**Naming note:** the task brief suggested `content-authorization-architecture.md`. The existing `docs/security/` directory has exactly one prior document, and its own established convention is `<topic>-architecture-approval.md` (it ends with an approval checklist, same as this one will). This document follows that convention instead, for consistency — flagged here rather than silently deviating from either instruction.

**Skills checked:** same result as the prior review — nothing in `.claude/skills/` targets backend authorization/content-modeling design; none invoked.

**Revision note (2026-09-06):** Mechanism 1's serialization design (§2.1) was revised after this document's initial approval-pending draft. The original recommendation (per-resource DTO tiers) was independently reconfirmed in a dedicated second-opinion review, then the project owner explicitly reviewed that reasoning and decided to proceed with a unified `restrictedInfo` object instead. §2.1 now contains both the original analysis and the revised, owner-directed design with a full migration plan; §8's Revision Record has the summary.

---

## 0. Executive Summary

Both mechanisms this document was asked to design turned out to govern **completely disjoint sets of collections** — not a coincidence, but a real structural fact confirmed by reading the actual entity-type lists in code (§1.3). Content-state authorization (draft/pending/approved/published) applies only to the 9 real workflow-governed collections (`committees`, `governanceDocuments`, `organizationalStructure`, `documents`, four CMS `*Page` singletons, `contactMessages`). Field-sensitivity authorization (Public/Restricted/Sensitive-Minor) applies only to person-data collections that were never workflow-governed to begin with (`athletes`, `athleteProfiles`, `officials`, `officialProfiles`, `federationPersonnel`, `athleteGuardianRelationships`, `contactMessages`, `siteSettings`). Exactly one collection (`contactMessages`) appears in both lists, and even there the two concerns don't interact (its workflow governs *routing/triage*, not *publication* — it's excluded from the revision/publication list entirely).

**Consequence for the design:** this document builds **two independent mechanisms**, not one unified contextual-policy engine. Forcing them together would be the over-engineering the brief explicitly warned against — there is no real resource in this system today where both concerns actually co-occur and need to be reasoned about jointly.

**Two significant, previously-undocumented findings from this investigation:**
1. **The field-level leak is real and already live**, not hypothetical: `GET /athletes/:id`, `GET /athlete-profiles/:id`, `GET /federation-personnel/:id` (and their `findAll` siblings) all return the *raw Mongoose document* on the authenticated path — `dateOfBirth` (`[SENSITIVE-MINOR]`), `restricted.emiratesIdOrPassport`/`address`/`phone`/`email`, and `internalContact` all reach any actor holding the resource's generic `Read` permission. Only the `@Public()` routes filter through a `toPublicResponse()` DTO; the authenticated routes never did.
2. **`committee.publicationState` (and its 8 sibling fields) is not actually kept in sync with anything.** Its own doc comment says "denormalized ← `publications`," but it is written exactly once, at creation, directly from the admin's request body — nothing in `WorkflowInstancesService.approve()` (the code that creates the real `publications` row) ever touches it. This means the field cannot be trusted as a source of truth for a workflow-state authorization check; the check must query `workflowInstances`/`publications` directly (§2.2).

Also delivered, per the brief's explicit ask: a concrete `Import`/`Export`/`Reports` permission-action proposal grounded in the actual 65 collections across the actual 9 domains (not the "~84 collections / 11 domains" the brief estimated — corrected against the real count, per the same audit-vs-code discipline as the prior document).

---

## 1. Current-State Findings (verified, not assumed)

### 1.1 Field sensitivity — code-level enforcement today

| Marker found in code | Collections | Enforced today? |
|---|---|---|
| `[SENSITIVE-MINOR]` | `athletes.dateOfBirth`, `athleteProfiles.restricted` (comment cross-reference) | **Public path only** — `AthletesService.toPublicResponse()`/`AthleteProfilesService.toPublicResponse()` strip it. **Authenticated path: not enforced** — `findById()`/`findAll()` return the raw document. |
| `[RESTRICTED]` | `athleteProfiles.restricted` (`emiratesIdOrPassport`, `address`, `phone`, `email`), `federationPersonnel.internalContact` (`personalEmail`, `idNumber`), `athleteGuardianRelationships.guardianContact` (`phone`, `email`, `address`) **and, found during a second-opinion review of this document, `athleteGuardianRelationships.guardianName` — a top-level `LocalizedText` field, `required: true`, sitting outside `guardianContact` (confirmed at `athlete-guardian-relationship.schema.ts:23-24`) — the guardian's name is exactly as much PII as their phone/email and was missing from this table**, `contactMessages` ("almost every field"), `siteSettings` (`isMaintenanceMode`, `googleAnalyticsId`, `metaPixelId`, `sessionTimeoutMinutes`, `maxLoginAttempts`, `systemEmailSender`) | **Public path only**, where a public route exists at all. `siteSettings` has both `GET /site-settings` (raw, authenticated) and `GET /site-settings/public` (filtered) — the same asymmetry as everywhere else. `contactMessages` and `athleteGuardianRelationships` have **no public route at all**, so their Restricted fields are reachable by anyone holding the collection's plain `Read` permission, full stop. |

**This is a code-level classification convention (a doc-comment tag), not an enforced mechanism** — confirmed by grep: the strings `[SENSITIVE-MINOR]`/`[RESTRICTED]` appear only in comments and are never read by any guard, interceptor, or runtime check. The 3-tier classification itself is real and governed (`docs/design-system/17-Data-Privacy-Identity.md`, ADR-0028, Federal Decree-Law 26/2025 — Child Digital Safety, frozen baseline), and that chapter is explicit that "architecturally enforced provides stronger protection than relying solely on manual operational discipline" and that "every access to or modification of Restricted/Sensitive-Minor data MUST generate an audit record" (§7 of that chapter). **Neither the architectural enforcement nor the required audit trail exists yet for the authenticated path.**

### 1.2 The existing allowlist-DTO precedent

Confirmed working pattern, used consistently across `athletes`, `athleteProfiles`, `officials`, `officialProfiles`, `federationPersonnel`, `albums`, `hero-slides`, `navigation-menus`, `site-settings`, `users` (post the auth P0 fix): a `*PublicResponseDto` type plus a `toPublicResponse()` mapping method on the owning service, applied at the controller boundary. **This pattern extends naturally to the authenticated side** — the only real question is how many DTO *tiers* a given resource needs (§3.1), not whether the DTO-per-context philosophy applies. No generic field-masking interceptor/decorator exists anywhere in this codebase, and nothing about the problem requires inventing one (§5).

### 1.3 The workflow engine's actual state model

**The two closed lists** (`common/constants/workflow-entity-types.ts`), verified directly, not from memory of the prior audit:
- **List A** (workflow-participation, 13 declared types): `articles`, `staticPages`, `externalMediaCoverage`, `governanceDocuments`, `strategicPlansPage`, `visionMissionPage`, `aboutFederationPage`, `presidentMessagePage`, `organizationalStructure`, `committees`, `documents`, `contactMessages`, `publicEvents`.
- **List B** (revision/publication, List A minus `contactMessages`, 12 declared types).

**Of these, only 9 have an actual, built, registered Mongoose collection today**: `governanceDocuments`, `strategicPlansPage`, `visionMissionPage`, `aboutFederationPage`, `presidentMessagePage`, `organizationalStructure`, `committees`, `documents`, `contactMessages`. **`articles`, `staticPages`, `externalMediaCoverage`, `publicEvents` are declared in the enum but have no backing module, controller, or schema anywhere in the codebase** — confirmed by the earlier full collection grep (§ of the prior document) turning up no such collections. This is a real, present discrepancy worth noting: the enum documents a superset of what's actually built. Nothing in this document proposes authorization changes for the 4 unbuilt types — there's nothing to change yet.

**State is derived from two side-collections, not read off the entity itself:**
- `workflowInstances.status` (`InProgress | Approved | Rejected | Returned`, plus `archivedAt` representing "Cancelled" — confirmed, no `Cancelled` enum value exists) tracks the *approval process*.
- `publications.status` (`Live | Unpublished | Archived`) tracks *whether it's currently live to the public*, via `{entityType, entityId, status:'Live'}`, with the repository-level invariant that at most one `Live` row exists per entity at a time.
- **The entity's own `publicationState` field (e.g. `Committee.publicationState`) is documented as "denormalized ← `publications`" but is confirmed, by reading `CommitteesService.create()` and the full `WorkflowInstancesService.approve()` method, to be written exactly once — at creation, directly from the admin's own request body — and never touched again by any approval/publish/unpublish/archive code path.** An admin can `POST /committees` with `publicationState: 'Live'` today with zero actual workflow instance or publications row ever existing (confirmed by the existing e2e test `governance-cms-public.e2e-spec.ts`, which does exactly this and separately proves the *real* public snapshot still correctly returns `{}` until a genuine publish happens — i.e., the public path is safe, but the field itself is decorative and must not be trusted by any new authorization check.

**How "editing" actually happens today — no direct PATCH exists on any of the 9 governed entities' own content.** Confirmed by reading every one of their controllers: each has `Create`/`Read`/`:id/public`/`Delete` only (`organizationalStructure` additionally has `PATCH :id/parent`, a structural move, not a content edit). The real edit path is: `POST /revisions` (creates an immutable snapshot) → `POST /workflow-instances` (starts an approval process referencing that revision) → assignees act via `POST /workflow-instances/:id/{approve,reject,return}` → final-step approval auto-publishes.

**A second, pre-existing, non-RBAC authorization mechanism already governs part of this — confirmed, not assumed:** `WorkflowInstancesService`'s `loadAssignedStep()` checks whether the acting user's id is literally present in `currentStep.assigneeIds` — this is checked **in addition to**, not instead of, the coarse `@RequirePermission('workflowInstances', 'Approve')` gate on the controller. **This two-layer pattern (coarse RBAC gate + fine-grained per-resource service check) is the established precedent this document's own workflow-state design should follow (§2.2), not a new pattern to invent.**

**A genuine, existing gap found in the course of this investigation, squarely relevant to "workflow-state-aware... permissions":** `POST /revisions` is gated by a single flat `revisions:Create` permission — **not scoped per `entityType` at all.** An actor holding only `revisions:Create` (with no `committees:*`, no `governanceDocuments:*`) can submit a revision snapshot targeting *any* of the 9 governed entity types. The same is true of `workflowInstances:Create`. This is the workflow-side mirror of the field-sensitivity gap: a flat permission covering a polymorphic write.

### 1.4 The real domain/collection inventory (corrected against the brief's estimate)

**9 domains** (module folder names), **65 registered collections** (not the brief's estimated 11/~84 — verified by direct grep of every `@Schema({ collection: ... })` declaration, not counted from memory or documentation):

`athletics`, `cms-page-composition`, `documents`, `federation-governance`, `media-center`, `people-organizations`, `platform-administration`, `public-communication`, `workflow`.

Full collection list used for the Import/Export/Reports proposal in §6.

---

## 2. Target Design

### 2.1 Mechanism 1 — Field-Level Sensitivity (Public / Restricted / Sensitive-Minor)

**STATUS — REVISED BY EXPLICIT OWNER DECISION, 2026-09-06.** §2.1-ORIGINAL below recommended per-resource response-DTO tiers. That recommendation was checked twice — once in this document's original drafting, once again in a dedicated second-opinion review (which independently dispatched a second model and reconciled its findings against a fresh reading of the code) — and both passes reconfirmed it, for three concrete reasons: a same-name-everywhere restructure is a rename requiring migration, not the additive change it first looks like; `athletes.dateOfBirth` is consumed by server-side logic that must not be permission-gated; and a generic strip mechanism is opt-in and fails open, the same failure class already found and fixed once in this codebase for `authMethods.passwordHash`. **The project owner reviewed that reasoning in full and explicitly decided to proceed with the unified-object approach anyway** — the owner's call to make, not a technical rebuttal of the analysis. §2.1-REVISED is the resulting design: it adopts the owner's direction while designing directly against all three objections rather than ignoring them. §2.1-ORIGINAL is kept below, unedited, as the record of what was considered — the same document-first amendment discipline this project already applies elsewhere (e.g. ADR-0056 §2) rather than silently deleting a superseded analysis.

#### 2.1-ORIGINAL — Superseded Analysis (per-resource DTO tiers)

**Recommendation (superseded — see status note above): per-resource response-DTO tiers, selected by the actor's resolved permissions at request time — not a generic field-masking decorator/interceptor.**

Justification, against this project's own established convention and real scale: this codebase already solved "return different shapes to different audiences" for the public/authenticated split, seven times over, with the exact same DTO-plus-mapping-method shape every time. A generic field-masking interceptor (reading a manifest of "which fields are tier-N" and stripping them reflectively) would be a new abstraction solving a problem the concrete-DTO pattern already solves — for a system with a small, known, enumerable set of sensitive fields (roughly a dozen fields across 7 collections, confirmed by §1.1's table), not the hundreds of fields across dozens of resource types that would justify a generic policy engine. **Correction (added during a second-opinion review, 2026-09-06):** this paragraph originally cited "the prior review's own established principle" for concrete-DTOs-over-generics. That was checked directly against `docs/security/auth-authorization-architecture-approval.md` and **no such principle is stated there** — every occurrence of "generic" in that document is incidental (rate limits, error messages), not a DTO-design rule. The correct basis for this recommendation is the 15-module `*PublicResponseDto`/`toPublicResponse()` pattern itself (§1.2) — a real, consistently-applied **code convention**, not a previously-written architectural principle. The recommendation stands; the citation supporting it has been corrected.

**Shape:** for each resource that has any Restricted/Sensitive-Minor field, add a `*RestrictedResponseDto` — the full record *minus* the truly public-only concerns already excluded on the public DTO's sibling, but *including* the Restricted/Sensitive-Minor fields. This is the shape a caller holding the *elevated* permission (§2.1's write-side design, below) receives. Callers who hold only the resource's plain `Read` and *not* the elevated permission receive a **third, narrower shape** — call it `*AuthenticatedResponseDto` — identical to the public shape in field content (or very close to it) but distinct as a type, since "what an internal authenticated user with only baseline access sees" and "what an anonymous visitor sees" are conceptually different audiences even when the field list happens to coincide today (keeping them as separate DTOs, even if temporarily identical, avoids accidentally coupling the internal-baseline shape's future evolution to the public shape's — a real, if currently invisible, coupling risk if they were literally the same type).

**Concretely, for `athletes` (the clearest example):**

| DTO | Used by | Fields |
|---|---|---|
| `AthletePublicResponseDto` (exists) | `GET /athletes/public` | Everything except `dateOfBirth` |
| `AthleteAuthenticatedResponseDto` (new) | `GET /athletes`, `GET /athletes/:id` for an actor *without* the elevated permission | Same field list as public — `athletes:Read` alone does not imply "may see the minor's date of birth" |
| `AthleteRestrictedResponseDto` (new) | Same two routes, for an actor *with* the elevated permission | Adds `dateOfBirth` |

Selection happens in the controller/service, based on the actor's already-JWT-embedded permission set (`@CurrentUser()`, exactly the same mechanism `RolesController`/`UsersController` already use — no new plumbing) — **not** a new guard, since this isn't "allow or deny the request," it's "shape the response," a service-layer concern.

**The permission that gates the elevated tier: the existing, currently-unused `EditProtectedData` action** — confirmed by grep to be declared in `PERMISSION_ACTIONS`/`RequiredPermission` since this codebase's inception but **never once referenced by any `@RequirePermission()` call site anywhere.** This document recommends **activating it, not adding a new action** — a smaller footprint than the brief's own suggestion of designing a new mechanism from scratch, and the name already fits: `athletes:EditProtectedData` (holding it) governs both read-visibility of the protected tier and write-access to it (see below) for that resource. No asymmetric "can view but not edit" / "can edit but not view" split is proposed — nothing in the current codebase or the Data Privacy chapter suggests that split is a real requirement, and inventing it now would be exactly the "actions added simply for completeness" the brief says to avoid.

**Write side (the brief's explicit second question):** a `PATCH`/`PUT` to a resource with a protected-tier field must reject a request that *changes* that field's value unless the actor holds `EditProtectedData` for that resource — and must **silently accept** (not reject) a request that includes the field unchanged from its current stored value, since a typical "edit this record" client workflow re-submits the full object it fetched. The rejection is a `403 ForbiddenException`, not a silent drop — a silent drop would let a client believe its change succeeded when it didn't, which is worse than an explicit rejection for both security review and ordinary debugging. Concretely: `AthletesService.update()` (a method that doesn't exist yet — there's currently no update endpoint on `athletes` at all, confirmed by re-reading `athletes.controller.ts`; this design applies the moment one is built) compares `dto.dateOfBirth` against the stored value **only if the actor lacks `EditProtectedData`**; a mismatch throws, a match (or an absent field) proceeds normally.

**Audit requirement (from the Data Privacy chapter itself, not an addition of this document's own):** every read *and* write of a Restricted/Sensitive-Minor-bearing resource by an actor exercising the elevated tier must produce an audit record identifying who/when/which record — reusing the existing `auditLogs` collection and `AuditLogsService.write()`, with a new, distinct `action` value (`ProtectedDataAccessed`) so it's queryable separately from ordinary `Read`/`Update` traffic. **This means the elevated-read path cannot stay a zero-write GET the way ordinary reads are** — an explicit, deliberate exception to "reads are free," justified by the chapter's own non-negotiable compliance requirement, not a performance oversight.

**Addendum — schema-level defense in depth (added during a second-opinion review, 2026-09-06):** an alternative was raised evaluating whether to restructure the affected schemas so all Restricted/Sensitive-Minor fields live under one uniformly-named nested object per collection, stripped by a single generic helper, replacing the DTO tiers above. That replacement was evaluated and **rejected** — a generic strip helper is opt-in at every call site (the same failure shape already found and fixed once in this codebase for `authMethods.passwordHash`, per `users.controller.ts:18-23`'s own comment: *"`select: false` on the schema alone doesn't protect a document that was just created in-memory... the allowlist mapping is applied everywhere"*), it does not survive a future `.populate()` call the way a response DTO does, and the three collections that already nest this data use three different field names (`athleteProfiles.restricted`, `federationPersonnel.internalContact`, `athleteGuardianRelationships.guardianContact`) — unifying them would be a field-rename requiring migration, not the additive change it first appears to be, and `athletes.dateOfBirth` cannot be nested at all without breaking age-category eligibility logic that needs it computed server-side regardless of the caller's visibility tier.

One narrow piece of the alternative is worth keeping as a **defense-in-depth addition alongside the DTO tiers, not instead of them**: add `select: false` to the three already-existing, already-nested embeds — `athleteProfiles.restricted`, `federationPersonnel.internalContact`, `athleteGuardianRelationships.guardianContact` — mirroring `auth-method.schema.ts:18`'s `passwordHash` exactly, with the one or two repository call sites that need the elevated tier opting back in via `.select('+restricted')` etc. (mirroring `users.repository.ts:29`). This is genuinely additive (no rename, no request-contract change — confirmed no service reads these fields back off a *queried* document for business logic, only off the incoming request DTO at create time) and gives a fail-closed backstop if a future controller ever returns a raw document by mistake. It is explicitly **not** proposed for `dateOfBirth` itself, since that field must remain queryable for server-side age-category computation regardless of the caller's visibility tier — the DTO tier is `dateOfBirth`'s only and correct gate. This addendum changes two `@Prop()` declarations and one schema decorator per affected collection — a code-level query-behavior annotation, not a field rename or shape change, so it does **not** trigger ADR-0056's FigJam document-first amendment process (that ADR governs the FigJam-documented physical schema's field-level shape; `select: false` changes nothing FigJam depicts). It should still be listed as a file-level change in the approval checklist below.

#### 2.1-REVISED — Unified `restrictedInfo` Object (current design, owner-directed, 2026-09-06)

##### Step 0 — Complete field inventory, all 8 collections (verified against the actual schema files, not extrapolated from the 3 previously discussed)

| Collection | Current shape today | Sensitive field(s) | Migration needed? |
|---|---|---|---|
| `athletes` | Flat (`athlete.schema.ts:40-41`) | `dateOfBirth: Date`, `required: true` — `[SENSITIVE-MINOR]` | Yes — scalar → nested |
| `athleteProfiles` | Nested, `restricted: RestrictedProfileInfo`, `required: true` (`athlete-profile.schema.ts:52-53`) | `emiratesIdOrPassport`, `address`, `phone`, `email` (all `string \| null`) | Yes — pure rename |
| `officialProfiles` | — | **None.** Confirmed directly in `official-profile.schema.ts` — no restricted/sensitive field exists on this schema at all, and its own doc comment (lines 20-22) calls this out as a confirmed content asymmetry vs. `athleteProfiles`, not an oversight. | **No `restrictedInfo` field added.** Forcing an empty object in would misstate the schema. |
| `officials` | — | **None.** Same confirmation, `official.schema.ts` — plain roster fields only. | No field added |
| `athleteGuardianRelationships` | **Split across two locations** — `guardianContact: GuardianContact`, `required: true` (`{phone, email, address}`, `athlete-guardian-relationship.schema.ts:29-30`) **and** `guardianName: LocalizedText`, `required: true`, top-level (line 23-24) | `guardianContact.{phone,email,address}` **and** `guardianName` — the guardian's name is exactly as much PII as their phone/email; this was found missing from §1.1's table during the second-opinion review and is folded in here | Yes — consolidate two locations into one object |
| `federationPersonnel` | Nested, `internalContact: PersonnelInternalContact \| null` (`federation-personnel.schema.ts:56-57`) | `personalEmail`, `idNumber`. **`publicContact` (line 53-54) is a separate, `[PUBLIC]` object and must never be merged into `restrictedInfo`.** | Yes — pure rename, nullable |
| `contactMessages` | Flat (`contact-messages.schema.ts`) | `senderName`, `senderEmail`, `senderPhone`, `messageBody` — the citizen's own submitted PII/content. `replyBody`/`repliedAt`/`repliedBy`/`replyChannel` are staff-authored reply data, a different question — scope decision below (§7 Open Decision #6) | Yes — flat → nested, scope as decided |
| `siteSettings` | Flat, interleaved with `[PUBLIC]` fields (`site-settings.schema.ts:89-118`) | `isMaintenanceMode`, `googleAnalyticsId`, `metaPixelId`, `sessionTimeoutMinutes`, `maxLoginAttempts`, `systemEmailSender` | Yes — flat → nested. **This is the one collection with a real, already-existing write path** (`SiteSettingsService.upsert()`, singleton) that touches these fields today — not just a future hypothetical `PATCH` like the other five. |

##### Step 1 — Target shape

Final field name: **`restrictedInfo`**, per the owner's direction. Shape per collection:

```ts
// athletes
restrictedInfo: { dateOfBirth: Date }

// athleteProfiles  (renamed from `restricted`)
restrictedInfo: { emiratesIdOrPassport: string | null; address: string | null; phone: string | null; email: string | null }

// athleteGuardianRelationships  (consolidates guardianName + guardianContact)
restrictedInfo: { guardianName: LocalizedText; phone: string | null; email: string | null; address: string | null }

// federationPersonnel  (renamed from `internalContact`; nullable, publicContact untouched)
restrictedInfo: { personalEmail: string | null; idNumber: string | null } | null

// contactMessages  (new; scope = the citizen's own submitted fields — see Open Decision #6)
restrictedInfo: { senderName: string; senderEmail: string; senderPhone: string | null; messageBody: string }

// siteSettings  (new; consolidates the 6 already-flagged fields)
restrictedInfo: { isMaintenanceMode: boolean; googleAnalyticsId: string | null; metaPixelId: string | null; sessionTimeoutMinutes: number | null; maxLoginAttempts: number | null; systemEmailSender: string | null }

// officialProfiles, officials — NO restrictedInfo field. Nothing to nest.
```

The elevated permission gating `restrictedInfo` remains the existing, currently-unused `EditProtectedData` action (unchanged from §2.1-ORIGINAL) — this decision doesn't depend on which serialization mechanism sits on top of it.

##### Step 2.1 — Solving the rename problem: exact per-collection migration

**Data-state finding (relevant to urgency, not to correctness):** no seed scripts or fixture data exist anywhere in this repo (confirmed — same finding as the auth document's open item R6); the only documents that could exist are whatever the project owner has created by hand against the real Atlas cluster during manual testing. The migration script below is written to be correct and idempotent regardless of whether that's zero documents or real ones — row count is a rollout-scheduling question, not a correctness question.

Every rename below is designed as an **aggregation-pipeline `updateMany`** (MongoDB ≥ 4.2, which every currently-supported Atlas tier satisfies) rather than the classic `$rename` operator, specifically because two of the six collections must *construct* `restrictedInfo` from more than one source location (a plain `$rename` can only move one field to one destination; it cannot merge `guardianName` + `guardianContact` or six scattered `siteSettings` fields into one object). Using the same pipeline shape for all six keeps the script uniform and easy to review, even where a simpler `$rename` would technically suffice.

```ts
// api/scripts/migrations/2026-09-xx-unify-restricted-info.ts
// One-off migration script. Run manually: node --experimental-vm-modules
// api/scripts/migrations/2026-09-xx-unify-restricted-info.mjs
// Reads MONGODB_URI from the environment exactly as the app does — never
// print, log, or hardcode it anywhere in this script.
import { MongoClient } from 'mongodb';

interface MigrationSpec {
  collection: string;
  /** Matches only documents not yet migrated — makes every run idempotent. */
  guardFilter: Record<string, unknown>;
  /** Forward aggregation-pipeline update: builds `restrictedInfo`, drops the old field(s). */
  forwardPipeline: Record<string, unknown>[];
  /** Reverse pipeline — rebuilds the old shape, drops `restrictedInfo`. For rollback only. */
  reversePipeline: Record<string, unknown>[];
}

const MIGRATIONS: MigrationSpec[] = [
  {
    collection: 'athletes',
    guardFilter: { dateOfBirth: { $exists: true } },
    forwardPipeline: [
      { $set: { restrictedInfo: { dateOfBirth: '$dateOfBirth' } } },
      { $unset: 'dateOfBirth' },
    ],
    reversePipeline: [
      { $set: { dateOfBirth: '$restrictedInfo.dateOfBirth' } },
      { $unset: 'restrictedInfo' },
    ],
  },
  {
    collection: 'athleteProfiles',
    guardFilter: { restricted: { $exists: true } },
    forwardPipeline: [
      { $set: { restrictedInfo: '$restricted' } },
      { $unset: 'restricted' },
    ],
    reversePipeline: [
      { $set: { restricted: '$restrictedInfo' } },
      { $unset: 'restrictedInfo' },
    ],
  },
  {
    collection: 'federationPersonnel',
    guardFilter: { internalContact: { $exists: true } },
    forwardPipeline: [
      { $set: { restrictedInfo: '$internalContact' } },
      { $unset: 'internalContact' },
    ],
    reversePipeline: [
      { $set: { internalContact: '$restrictedInfo' } },
      { $unset: 'restrictedInfo' },
    ],
  },
  {
    collection: 'athleteGuardianRelationships',
    guardFilter: { guardianContact: { $exists: true } },
    forwardPipeline: [
      {
        $set: {
          restrictedInfo: {
            guardianName: '$guardianName',
            phone: '$guardianContact.phone',
            email: '$guardianContact.email',
            address: '$guardianContact.address',
          },
        },
      },
      { $unset: ['guardianName', 'guardianContact'] },
    ],
    reversePipeline: [
      {
        $set: {
          guardianName: '$restrictedInfo.guardianName',
          guardianContact: {
            phone: '$restrictedInfo.phone',
            email: '$restrictedInfo.email',
            address: '$restrictedInfo.address',
          },
        },
      },
      { $unset: 'restrictedInfo' },
    ],
  },
  {
    collection: 'contactMessages',
    guardFilter: { senderName: { $exists: true } },
    forwardPipeline: [
      {
        $set: {
          restrictedInfo: {
            senderName: '$senderName',
            senderEmail: '$senderEmail',
            senderPhone: '$senderPhone',
            messageBody: '$messageBody',
          },
        },
      },
      { $unset: ['senderName', 'senderEmail', 'senderPhone', 'messageBody'] },
    ],
    reversePipeline: [
      {
        $set: {
          senderName: '$restrictedInfo.senderName',
          senderEmail: '$restrictedInfo.senderEmail',
          senderPhone: '$restrictedInfo.senderPhone',
          messageBody: '$restrictedInfo.messageBody',
        },
      },
      { $unset: 'restrictedInfo' },
    ],
  },
  {
    collection: 'siteSettings',
    guardFilter: { isMaintenanceMode: { $exists: true } },
    forwardPipeline: [
      {
        $set: {
          restrictedInfo: {
            isMaintenanceMode: '$isMaintenanceMode',
            googleAnalyticsId: '$googleAnalyticsId',
            metaPixelId: '$metaPixelId',
            sessionTimeoutMinutes: '$sessionTimeoutMinutes',
            maxLoginAttempts: '$maxLoginAttempts',
            systemEmailSender: '$systemEmailSender',
          },
        },
      },
      {
        $unset: [
          'isMaintenanceMode', 'googleAnalyticsId', 'metaPixelId',
          'sessionTimeoutMinutes', 'maxLoginAttempts', 'systemEmailSender',
        ],
      },
    ],
    reversePipeline: [
      {
        $set: {
          isMaintenanceMode: '$restrictedInfo.isMaintenanceMode',
          googleAnalyticsId: '$restrictedInfo.googleAnalyticsId',
          metaPixelId: '$restrictedInfo.metaPixelId',
          sessionTimeoutMinutes: '$restrictedInfo.sessionTimeoutMinutes',
          maxLoginAttempts: '$restrictedInfo.maxLoginAttempts',
          systemEmailSender: '$restrictedInfo.systemEmailSender',
        },
      },
      { $unset: 'restrictedInfo' },
    ],
  },
];

async function run(direction: 'forward' | 'reverse' = 'forward') {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set.');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  for (const m of MIGRATIONS) {
    const pipeline = direction === 'forward' ? m.forwardPipeline : m.reversePipeline;
    const filter = direction === 'forward' ? m.guardFilter : { restrictedInfo: { $exists: true } };
    const before = await db.collection(m.collection).countDocuments(filter);
    if (before === 0) {
      console.log(`[skip] ${m.collection}: nothing to migrate (${direction})`);
      continue;
    }
    const result = await db.collection(m.collection).updateMany(filter, pipeline);
    console.log(`[${m.collection}] matched=${result.matchedCount} modified=${result.modifiedCount}`);
    const remaining = await db.collection(m.collection).countDocuments(filter);
    if (remaining > 0) {
      throw new Error(`${m.collection}: ${remaining} document(s) still unmigrated after the pass — aborting.`);
    }
  }
  await client.close();
}

run(process.argv[2] === '--reverse' ? 'reverse' : 'forward').catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Properties this design was specifically checked against:
- **Idempotent** — `guardFilter` only matches unmigrated documents; running it twice in a row does nothing the second time.
- **Verifiable** — logs matched/modified counts per collection and asserts zero remain unmigrated before moving to the next collection, so a partial failure on collection 3 doesn't silently proceed to collection 4 with collection 3 half-done.
- **Reversible** — `reversePipeline` is the exact inverse of `forwardPipeline` for every collection, runnable via `--reverse`.
- **No credential exposure** — reads `MONGODB_URI` from `process.env` exactly as `DatabaseModule` does; never logs, prints, or interpolates it into a string anywhere, consistent with this project's standing rule for that variable.
- **Dry-run recommended before any real run**: replace the `updateMany` call with `db.collection(m.collection).aggregate([{ $match: filter }, ...pipeline, { $limit: 5 }]).toArray()` temporarily and inspect the output shape by hand before running the real pass — not included as a script flag here to keep the reviewable script small, but should be done manually the first time this runs against the real cluster.

##### Step 2.2 — Solving the `dateOfBirth` problem: every real call site, found not assumed

**Honest finding: the age-category eligibility computation the original objection assumed exists does not exist yet.** `AgeCategoriesService` (`age-categories.service.ts`) is confirmed, by full read, to be plain CRUD over reference data (`minAge`/`maxAge` definitions) — nothing in the codebase today reads `athlete.dateOfBirth` to compute or check eligibility. This makes the migration's blast radius smaller than the original objection assumed, but the design below still builds the correct convention now, so the accessor pattern is in place before that computation is written, rather than being retrofitted around a permission-gated response DTO later.

**Every real code location that reads or writes `dateOfBirth` today** (found by grepping the whole `api/src` tree, not assumed):

| File | Line(s) | What it does | Change needed |
|---|---|---|---|
| `athletes/schemas/athlete.schema.ts` | 40-41 | Field declaration | Move under `restrictedInfo` (§2.1 above), add `select: false` on `restrictedInfo` (§3, Step 3 below) |
| `athletes/dto/create-athlete.dto.ts` | 20 | `dateOfBirth: string` — request-body input field | **Unchanged.** The public API request contract keeps `dateOfBirth` as a top-level input field (registration must still capture it); only the *stored* and *response* shapes nest it. `AthletesService.create()` is what maps the flat input onto the nested storage shape. |
| `athletes/athletes.service.ts` | 21 | `dateOfBirth: new Date(dto.dateOfBirth)` inside `create()`'s repository call | Change to `restrictedInfo: { dateOfBirth: new Date(dto.dateOfBirth) }` |
| `athletes/dto/athlete-public-response.dto.ts` | 8 | Doc comment only | Update wording, no logic change |
| `athletes/athletes.controller.ts` | 31 | Doc comment only | Update wording, no logic change |
| `athletes/athletes.service.spec.ts` | 37, 59 | Test fixtures construct `dateOfBirth: new Date(...)` at the top level | Update fixtures to `restrictedInfo: { dateOfBirth: ... }` |
| `athletes/athletes.service.spec.ts` | 47, 78 | `expect(result).not.toHaveProperty('dateOfBirth')` | **No change needed** — still correct: the field genuinely won't be a top-level key of the public response either way |

**No other file in `api/src` references `.dateOfBirth`** (confirmed by the same grep) — there is no hidden third consumer.

**The forward-looking accessor**, so whenever age-category eligibility *is* built, it's built against the right seam from day one:

```ts
// athletes.service.ts
/** Internal, system-trusted accessor for server-side computation only
 *  (e.g. a future age-category eligibility check). Deliberately bypasses
 *  the EditProtectedData response gate — that gate governs what an HTTP
 *  caller may SEE, not what the server's own business logic may READ to
 *  compute a derived, non-PII result (e.g. an age-category id). Never
 *  call this from a controller, and never return its result directly in
 *  an HTTP response — only a derived value (like the resolved
 *  ageCategoryId) may cross that boundary. */
async getDateOfBirthForSystemUse(athleteId: string): Promise<Date> {
  const athlete = await this.repository.findById(athleteId, { includeRestricted: true });
  if (!athlete?.restrictedInfo) {
    throw new NotFoundException(`Athlete ${athleteId} not found or has no recorded date of birth.`);
  }
  return athlete.restrictedInfo.dateOfBirth;
}
```

##### Step 2.3 — Solving the fail-open risk: an explicit allowlist, not a generic strip

The core requirement carried over from the rejected generic-strip idea's one real flaw: **a field missing from every list must never appear in the output**, the same fail-safe property the DTO tiers had. Achieved here with a small, typed, per-resource **config object** (not a full DTO class per tier) read by one shared function:

```ts
// api/src/common/serialization/field-visibility.ts
export interface FieldVisibilityConfig<T> {
  /** Visible to any actor holding the resource's plain `Read` permission. */
  baseFields: readonly (keyof T)[];
  /** Visible only to an actor additionally holding `<resourceType>:EditProtectedData`.
   *  For every resource in this document this is exactly `['restrictedInfo']` —
   *  the elevated tier is an all-or-nothing view of the one nested object,
   *  not a per-leaf-field grant (unchanged from §2.1-ORIGINAL's reasoning). */
  protectedFields: readonly (keyof T)[];
}

/** The only function that ever decides what leaves the process for one of
 *  these 6 resources. A field absent from BOTH lists is structurally
 *  unreachable — there is no code path that can emit it by accident,
 *  the same guarantee the rejected DTO tiers provided. */
export function serializeWithVisibility<T extends Record<string, unknown>>(
  shaped: T,
  config: FieldVisibilityConfig<T>,
  hasProtectedAccess: boolean,
): Partial<T> {
  const allowed = hasProtectedAccess
    ? [...config.baseFields, ...config.protectedFields]
    : config.baseFields;
  const out: Partial<T> = {};
  for (const field of allowed) {
    out[field] = shaped[field];
  }
  return out;
}
```

Per-resource usage — the "shaping" step (ObjectId → string, etc.) stays local and typed exactly as `toPublicResponse()` does today; only the final allowlist-filter step is shared:

```ts
// athletes.service.ts
interface AthleteShaped {
  id: string; name: LocalizedText; nationalityId: string; disciplineIds: string[];
  gender: AthleteGender; residencyType: ResidencyType; federationName: LocalizedText | null;
  restrictedInfo?: { dateOfBirth: Date };
}

const ATHLETE_FIELD_VISIBILITY: FieldVisibilityConfig<AthleteShaped> = {
  baseFields: ['id', 'name', 'nationalityId', 'disciplineIds', 'gender', 'residencyType', 'federationName'],
  protectedFields: ['restrictedInfo'],
};

private shape(athlete: AthleteDocument): AthleteShaped {
  return {
    id: athlete._id.toString(),
    name: athlete.name,
    nationalityId: athlete.nationalityId.toString(),
    disciplineIds: athlete.disciplineIds.map((id) => id.toString()),
    gender: athlete.gender,
    residencyType: athlete.residencyType,
    federationName: athlete.federationName,
    restrictedInfo: athlete.restrictedInfo ? { dateOfBirth: athlete.restrictedInfo.dateOfBirth } : undefined,
  };
}

/** Replaces the old single `toPublicResponse()` — the actor's permission
 *  set now decides the tier, exactly as §2.1-ORIGINAL's controller-level
 *  selection did; only the mechanism producing the final object changed. */
toResponse(athlete: AthleteDocument, hasProtectedAccess: boolean): Partial<AthleteShaped> {
  return serializeWithVisibility(this.shape(athlete), ATHLETE_FIELD_VISIBILITY, hasProtectedAccess);
}
```

**The query itself is the first gate, before serialization ever runs:** the repository only fetches `restrictedInfo` at all when the caller's permission check already says it may:

```ts
// athletes.repository.ts
async findById(id: string, opts: { includeRestricted?: boolean } = {}): Promise<AthleteDocument | null> {
  const query = this.model.findById(id);
  if (opts.includeRestricted) {
    query.select('+restrictedInfo');
  }
  return query.exec();
}
```

This produces two independent gates that must **both** fail for a leak to occur: the query must have fetched `restrictedInfo` (it only does when `hasProtectedAccess` was already true), **and** `serializeWithVisibility()` must have been called with `hasProtectedAccess: true`. A bug in either one alone is not suffic ient to leak the field — the same two-independent-layers property `select: false` + allowlist-DTO gave `passwordHash` (§3 below).

##### Step 3 — Security review of this design (same questions asked of the rejected DTO-tier approach)

**`toJSON()` / default serialization:** with `select: false` applied to `restrictedInfo` on every affected schema (§3 below), Mongoose excludes it from `.toJSON()`/`.toObject()` output by default, the same as it does today for `authMethods.passwordHash`. A future controller that accidentally `return`s a raw document (the exact bug already found and fixed once for `passwordHash`, and found live today for `athletes`/`athleteProfiles`/`federationPersonnel`) would **not** leak `restrictedInfo` even without going through `serializeWithVisibility()` — this is strictly safer on this specific vector than today's actual code, though still not as safe as the DTO-tier approach's total absence of a raw-document return path at all (a raw document under this design still leaks every *non*-restricted field, which the DTO tiers also would have shaped; that gap is unchanged either way and isn't specific to this mechanism).

**`.populate()`:** confirmed, by grep, **zero `.populate()` calls exist anywhere in this codebase today** — this is a theoretical vector, not a live one. For when it is introduced: this project's installed Mongoose is `^9.9.4` (`api/package.json`), where `selectPopulatedFields` has defaulted to `true` since Mongoose 5.4 — meaning a `select: false` field is excluded from populated sub-documents by default, the same as a direct query. This should still be **confirmed with a dedicated unit test** the first time a `.populate()` call touching one of these 6 collections is written (recommended test case added to §4's test list below), rather than trusted on documentation alone, since this exact behavior has changed across major Mongoose versions historically.

**Partial-projection queries:** any `.select(...)` call that doesn't explicitly request `+restrictedInfo` continues to exclude it, by the same `select: false` mechanism — this is actually a genuine advantage of the nested shape over the flat/DTO world: `.select('-restrictedInfo')` or simply omitting it is a correct, safe default, whereas today's flat `dateOfBirth` on `athletes` has no schema-level backstop at all.

**Honest comparison to the rejected DTO-tier approach:** this design closes the *query-time* and *default-serialization* leak vectors at least as reliably, via `select: false` — a real improvement over today's code, which has no schema-level backstop at all. It does **not** fully match the DTO-tier approach's strongest property: a DTO's allowlist is enforced by the **type system** at compile time (a field not in the DTO class literally cannot be assigned to it), whereas `serializeWithVisibility()`'s allowlist is enforced by **runtime array membership** in a config object that a developer could mistype or forget to update when a new field is added to a schema. This is a real, non-zero residual risk this design accepts in exchange for one shared function instead of 18 DTO classes — **mitigated, not eliminated,** by: (a) `select: false` as the schema-level backstop above, independent of whether `FieldVisibilityConfig` is kept correctly up to date; (b) a required unit test per resource (§4 below) asserting the *exact* full field list is covered by exactly one of `baseFields`/`protectedFields`, which fails the build the moment a new schema field is added and forgotten in the config — this is the concrete guard that makes "a developer forgets to update the config" a caught-in-CI mistake rather than a silent production leak.

##### Step 4 — Full migration plan

**Sequencing (each step independently deployable and verifiable before the next begins):**

1. **Schema changes, additive first.** Add `restrictedInfo` as a new, optional field alongside the still-existing old field(s) on all 6 collections (`athletes`, `athleteProfiles`, `federationPersonnel`, `athleteGuardianRelationships`, `contactMessages`, `siteSettings`). Zero behavior change yet — nothing reads the new field.
2. **Write-side code changes.** Update the 6 `create()` (and `siteSettings.upsert()`) call sites listed in §2.1's inventory and §2.2's table to write `restrictedInfo` instead of the old field(s). From this point, **new** documents are created correctly; existing documents still hold the old shape only.
3. **Run the migration script (§2.1's `MIGRATIONS`) against existing data**, forward direction, with the dry-run step done by hand first (§2.1's note). Verify the script's own before/after counts, then spot-check a handful of real documents by hand.
4. **Drop the old field(s) from the schema.** Only after step 3 is confirmed clean — remove `restricted`/`internalContact`/`guardianContact`/`guardianName`/the 6 flat `siteSettings` fields/the 4 flat `contactMessages` fields/`athletes.dateOfBirth` from the schema classes. (MongoDB itself doesn't need a separate "drop the field" step beyond what `$unset` in step 3 already did on the data; this step is about removing the now-dead `@Prop()` declarations from the TypeScript schema classes so nothing can accidentally write to the old shape again.)
5. **Add `select: false` to `restrictedInfo`** on all 6 schemas, plus the `.select('+restrictedInfo')` opt-in on each repository's elevated-access read path (§2.1's `findById` sketch), mirroring `auth-method.schema.ts:18`/`users.repository.ts:29`'s existing `passwordHash` pattern.
6. **Wire `serializeWithVisibility()` into each service's response path**, replacing the ad hoc `toPublicResponse()`/raw-document returns. This is the step that actually starts hiding `restrictedInfo` from actors without `EditProtectedData` — the one genuinely breaking moment in this sequence.
7. **Seed the `EditProtectedData` `Permission` documents and grant them**, reviewed per role exactly as §4 (original rollout, unchanged) already specified — do this *before* step 6 goes live in an environment with real users, so no legitimate actor is suddenly locked out.
8. **Write-side change-rejection logic** (unchanged from §2.1-ORIGINAL: reject a request that changes any field inside `restrictedInfo` when the actor lacks `EditProtectedData`; accept when `restrictedInfo` is omitted or deep-equal to the stored value) — applies identically regardless of which serialization mechanism is used.
9. **`ProtectedDataAccessed` audit action** (unchanged from §2.1-ORIGINAL) — purely additive.

**Test coverage required** (in addition to §2.1-ORIGINAL's unchanged list — write-side rejection, audit rows):
- Per resource: a unit test asserting `Object.keys(shapedType)` (or an equivalent exhaustive field list derived from the TypeScript interface) is covered by exactly one of `baseFields`/`protectedFields` in that resource's `FieldVisibilityConfig` — this is the guard against silent config drift (§3 above).
- An e2e test per resource: an actor with `Read` but not `EditProtectedData` never receives `restrictedInfo` in any response, even when the underlying document was fetched with `includeRestricted: true` by a bug (i.e., test the serializer's independence from the query layer, not just the combined happy path).
- A repository-level test confirming `findById(id)` (no `includeRestricted` flag) never returns `restrictedInfo` on the raw returned document — proves the `select: false` layer independently of the service layer above it.
- Migration script test: run the forward pipeline against a seeded in-memory collection with pre-migration-shape fixtures, assert the exact expected post-migration shape, then run `--reverse` and assert byte-for-byte equality with the original fixture (round-trip test).
- `athletes.service.spec.ts`'s existing two `not.toHaveProperty('dateOfBirth')` assertions (lines 47, 78) continue to pass unmodified and should be kept as regression coverage.

**Rollout order — which collection first, and why:** `officialProfiles`/`officials` need no change and are excluded. Of the remaining 6, sequence by **existing exposure, worst first**: `athletes` and `athleteProfiles` (the two confirmed-live leaks from §1.1, highest real risk today) → `federationPersonnel` (also a confirmed live leak, smaller field set) → `athleteGuardianRelationships` (no public route today, so no *public* exposure, but reachable by any `Read` holder) → `siteSettings` (has a real existing write path via `upsert()`, needs steps 2/8 done together deliberately, not staggered) → `contactMessages` last (depends on Open Decision #6 below being resolved first, since the exact field scope isn't yet final).

---

### 2.2 Mechanism 2 — Workflow-State-Aware Read/Edit

**Recommendation: a per-request state check layered on top of the existing action check, mirroring the workflow engine's own established two-layer pattern (§1.3) — not new permission actions per state.**

**Why not new actions (e.g. `EditDraft` vs `EditPublished`):** the brief's own evaluation criteria (§1's "prefer the simpler, more general change") points away from this. A per-state action multiplies the permission surface by the number of states for every governed resource (4 states × 9 resources = up to 36 new action/resource pairings to seed and maintain) for a distinction that is really about *one* resource's *current* condition, not a durable capability an admin's role should need to be re-granted for. It also doesn't compose with the existing `WorkflowStep.assigneeIds` mechanism at all — a named approver's authority to act on a specific in-progress instance has nothing to do with whether their *role* was granted an `EditDraft` action.

**The design:** a small, explicit service-layer check — call it `ContentStateAuthorizer` or fold it directly into each governed entity's service (either is reasonable; a shared small utility avoids repeating the same two-query lookup nine times, so a shared helper is the recommendation) — invoked wherever a governed entity's content-affecting action needs it:

```
canEdit(entityType, entityId, actor):
  activeInstance = workflowInstances.findActive(entityType, entityId)   // status: InProgress
  if activeInstance exists:
    return actor.userId is in the current step's assigneeIds
           OR actor holds <entityType>:Update AND the workflow's own
              WorkflowPolicy for this (entityType, 'Edit') says workflowRequired=false
  else:
    return actor holds <entityType>:Update   // no active process — ordinary RBAC governs
```

This directly answers the brief's own question about reuse: **yes, it reuses the workflow engine's real state (`workflowInstances`, queried fresh, never `entity.publicationState`) and its real transition-authority concept (`assigneeIds`)** rather than inventing a parallel one. It does **not** attempt to also gate *reading* a governed entity by state — an authenticated `Read` of a `committees` row that's mid-approval is not a meaningful risk (the content isn't secret, only *whether it's public yet* is gated, and that's already `publications`'s job) — so `canEdit`'s counterpart `canRead` is **not proposed**; `@RequirePermission(entityType, 'Read')` alone remains correct and sufficient for the authenticated read path, exactly as today.

**Performance, addressed directly per the brief's own instruction:** this check is inherently per-resource (it needs *this specific* `entityId`'s current state, which cannot live in a JWT minted before the resource was touched) and therefore requires 1–2 indexed queries (`workflowInstances` by `{entityType, entityId}` — already indexed; conditionally `workflowSteps` by `_id` — already indexed) on the specific mutating endpoints of 9 collections. **This does not conflict with the existing architecture's performance principle** — that principle (§23 of the auth document) is specifically about *the flat RBAC check running on every single request across the entire API*; this new check runs only on the mutation endpoints of a small, named set of governed collections, which are a low-volume administrative path (content edits by federation staff), not the public-read hot path. The two performance regimes are not in tension because they apply to different traffic.

**Closing the flat-permission gap found in §1.3:** `POST /revisions` and `POST /workflow-instances` should additionally verify the actor holds `<dto.entityType>:Update` (not just the flat `revisions:Create`/`workflowInstances:Create`) before accepting a submission for that entity type — otherwise an actor with only `revisions:Create` can propose content for a governed entity type they hold no other permission over at all. This is a straightforward addition to `RevisionsController.create()`/`WorkflowInstancesController.create()`, using `@CurrentUser()`'s already-embedded permission set exactly as `RolesController` already does for the escalation checks in the auth review.

### 2.3 Interaction Between the Two Mechanisms

**Confirmed orthogonal, and in practice non-overlapping** (§0, §1.1 vs §1.3's collection lists have exactly one entry in common — `contactMessages` — and even there the two concerns don't touch the same fields or the same code path: `contactMessages`'s Restricted-tier fields are the citizen's own submitted PII, checked by Mechanism 1; its workflow governs triage/assignment, not publication, since it's excluded from the revision/publication list). **No coupling is proposed.** A role can hold `athletes:EditProtectedData` without holding anything workflow-related (there is no workflow on `athletes` at all), and a role can hold `committees:Update` plus workflow-approval authority without ever touching a Restricted/Sensitive-Minor field (`committees` has none). Designing them as independently-checkable concerns is correct here not as a default architectural preference but because the actual data confirms there is no real resource requiring both simultaneously today.

---

## 3. Exact Schema / Permission / Endpoint Changes

### 3.1 Response shaping (Mechanism 1) — REVISED, per §2.1-REVISED

**Superseded:** the table below originally specified two new `*ResponseDto` classes per resource. Per the owner's 2026-09-06 decision (§2.1), the mechanism is now the unified `restrictedInfo` schema field plus the shared `serializeWithVisibility()` function and one `FieldVisibilityConfig` per resource (§2.1-REVISED, Step 2.3) — no per-tier DTO classes are created. The table below is kept in the shape it had (resource → what's added) so the two designs remain easy to compare, with the "New DTOs" column reinterpreted as "New config/field."

| Resource | New field / config | Existing DTOs (unchanged) |
|---|---|---|
| `athletes` | `restrictedInfo: { dateOfBirth }` schema field; `ATHLETE_FIELD_VISIBILITY` config | `AthletePublicResponseDto`, `AthletePublicListResponseDto` (public route untouched) |
| `athleteProfiles` | `restrictedInfo` (renamed from `restricted`); `ATHLETE_PROFILE_FIELD_VISIBILITY` config | `AthleteProfilePublicResponseDto` |
| `federationPersonnel` | `restrictedInfo` (renamed from `internalContact`); `FEDERATION_PERSONNEL_FIELD_VISIBILITY` config | `FederationPersonnelPublicResponseDto` |
| `athleteGuardianRelationships` | `restrictedInfo` (consolidates `guardianName` + `guardianContact`); `ATHLETE_GUARDIAN_RELATIONSHIP_FIELD_VISIBILITY` config | none exist today — **no public route exists for this collection at all** |
| `contactMessages` | `restrictedInfo` (new; scope per Open Decision #6); `CONTACT_MESSAGE_FIELD_VISIBILITY` config | none — same "no public route" situation |
| `siteSettings` | `restrictedInfo` (consolidates the 6 `[RESTRICTED]` fields); `SITE_SETTINGS_FIELD_VISIBILITY` config | `SiteSettingsPublicResponseDto` (already exists, untouched — `GET /site-settings` today returns the raw document per §1.1; this is the one resource where the "authenticated baseline" tier is introduced for the first time) |

`officials`/`officialProfiles`: **no change** — confirmed here (§2.1-REVISED Step 0) and in the prior review that neither has any Restricted/Sensitive-Minor field at all (a genuine, confirmed content asymmetry vs. `athletes`/`athleteProfiles`, not an oversight). No `restrictedInfo` field, no config entry.

### 3.2 Permission model changes

| Change | Detail |
|---|---|
| Activate `EditProtectedData` | Already exists in `PERMISSION_ACTIONS`/`RequiredPermission` — no enum change. New `Permission` documents needed: `athletes:EditProtectedData`, `athleteProfiles:EditProtectedData`, `federationPersonnel:EditProtectedData`, `athleteGuardianRelationships:EditProtectedData`, `contactMessages:EditProtectedData`, `siteSettings:EditProtectedData` |
| Revision/workflow-instance entity-type scoping | No new permission action — `RevisionsController.create()`/`WorkflowInstancesController.create()` gain a service-layer check against the actor's existing `<entityType>:Update` permission, using the permission set already in the JWT |
| New audit action | `AUDIT_ACTIONS` (currently `Create/Update/Delete/HardDelete/StatusChange/AccessDenied`) gains `ProtectedDataAccessed`, written by the new elevated-read/write paths in §2.1 |

### 3.3 Endpoint table

| Endpoint | Method | Auth | Permission | Context rule | Notes |
|---|---|---|---|---|---|
| `GET /api/v1/athletes` | GET | JWT | `athletes:Read` | `restrictedInfo` included only if actor also holds `athletes:EditProtectedData` (query opts in via `includeRestricted`, serializer gates on the same check — §2.1-REVISED) | Existing endpoint — currently returns raw document; recommended change |
| `GET /api/v1/athletes/:id` | GET | JWT | `athletes:Read` | Same | Existing, same change |
| `PATCH /api/v1/athletes/:id` | PATCH | JWT | `athletes:Update` | Reject if `restrictedInfo.dateOfBirth` changed and actor lacks `athletes:EditProtectedData` | **Recommended new endpoint** — none exists today |
| `GET /api/v1/athlete-profiles`, `/:id` | GET | JWT | `athleteProfiles:Read` | Tiering on `restrictedInfo.*` (renamed from `restricted`) | Existing, same change |
| `PATCH /api/v1/athlete-profiles/:id` | PATCH | JWT | `athleteProfiles:Update` | Reject if any `restrictedInfo.*` field changed and actor lacks `athleteProfiles:EditProtectedData` | **New** — no update endpoint exists today |
| `GET /api/v1/federation-personnel`, `/:id` | GET | JWT | `federationPersonnel:Read` | Tiering on `restrictedInfo.*` (renamed from `internalContact`; `publicContact` untouched, always visible) | Existing, same change |
| `GET /api/v1/site-settings` | GET | JWT | `siteSettings:Read` | Tiering on `restrictedInfo.*` (consolidated from 6 flat fields) | Existing, same change |
| `PUT /api/v1/site-settings` (`upsert`) | PUT | JWT | `siteSettings:Update` | Reject if any `restrictedInfo.*` field changed and actor lacks `siteSettings:EditProtectedData` | **Existing endpoint, real write path today** — unlike the other 5 resources, this one already writes these fields via `SiteSettingsService.upsert()`, so this rule is live from day one, not a future hypothetical |
| `POST /api/v1/revisions` | POST | JWT | `revisions:Create` **+** `<dto.entityType>:Update` | — | Closes the flat-permission gap, §1.3/§2.2 |
| `POST /api/v1/workflow-instances` | POST | JWT | `workflowInstances:Create` **+** `<dto.entityType>:Update` | — | Same |
| Any future `PATCH` on a governed entity (`committees`, `governanceDocuments`, etc.) | PATCH | JWT | `<entityType>:Update` | `canEdit()` check from §2.2 | No such endpoints exist yet — this is the rule they must follow when built |

**Not changed:** `GET .../public` routes (already correctly filtered), `Create`/`Delete` on any resource (creation of a new record and its own initial protected-tier value is already gated by the resource's own `Create` permission, which this document does not weaken or duplicate — a role with `athletes:Create` but not `athletes:EditProtectedData` can still register a new athlete including their date of birth, since recording it is mandatory at registration per ADR-0028's own risk mitigation; §2.1's gate is specifically about *ongoing visibility and later modification*, not initial capture — **OPEN DECISION** flagged in §7 in case the owner wants `Create` gated too).

---

## 4. Rollout / Migration Strategy

**Superseded for Mechanism 1 by §2.1-REVISED's Step 4 (2026-09-06)** — that section's 9-step sequence (schema-additive → write-side code → data migration script → drop old fields → `select: false` → wire the serializer → seed/grant `EditProtectedData` → write-rejection → audit) replaces steps 1-4 and 6 below, because a real data migration (not present in the original DTO-tier design) now sits in the middle of the sequence and changes the safe ordering. **Step 5 below (Mechanism 2's `revisions`/`workflow-instances` entity-type scoping) is unaffected by the Mechanism 1 revision and still applies as originally written**, since it doesn't touch `restrictedInfo` at all.

**This project's actual current stage — a small, pre-production, one/two-developer team — argues directly against staged/permissive-by-default rollout machinery**, for both mechanisms alike. A "log what would have been blocked before enforcing" phase is a pattern for systems with real production traffic and users who'd be surprised by a sudden new rejection; this system has neither yet. Original (Mechanism 1 portion superseded, kept for the record) sequence:

1. ~~Add the two new DTOs per resource (§3.1) and the tiering logic...~~ — superseded, see §2.1-REVISED Step 4.
2. ~~Seed the new `EditProtectedData` permission documents...~~ — superseded, see §2.1-REVISED Step 4 (still required, reordered).
3. ~~Flip tier *selection* live...~~ — superseded, see §2.1-REVISED Step 4.
4. ~~Add the write-side rejection check and the two new update endpoints...~~ — superseded, see §2.1-REVISED Step 4 (still required, reordered).
5. Add the `revisions`/`workflow-instances` entity-type scoping check (§2.2) — **unchanged, still applies**: audit first which existing seeded roles hold `revisions:Create`/`workflowInstances:Create` without the matching per-entity-type `Update`, since this step newly rejects a request shape that used to succeed for those roles; a deliberate, reviewed grant pass, not silently absorbed.
6. ~~`ProtectedDataAccessed` audit writes~~ — superseded, see §2.1-REVISED Step 4 (still required, reordered, still purely additive).

**A database migration is now required for Mechanism 1** (§2.1-REVISED Steps 0-4) — this reverses the original design's "no migration required" claim, which was true only for the now-superseded DTO-tier approach. Mechanism 2 (workflow-state-aware editing) still requires no schema/data migration at all — nothing in §2.2 touches a document shape.

---

## 5. What NOT to Build

- **No generic field-masking/redaction interceptor or policy-engine DSL.** Confirmed, concrete field list (§1.1) is small enough that per-resource DTOs are simpler, more type-safe, and match the codebase's own established taste, exactly as the brief predicted might be the case.
- **No per-workflow-state permission actions.** §2.2's reasoning — multiplies the permission surface for a distinction that's about resource condition, not role capability.
- **No contextual-policy abstraction spanning both mechanisms.** §0/§2.3 — they don't actually co-occur on real data; a unifying abstraction would serve a union of cases that doesn't exist.
- **No `canRead`-by-workflow-state check.** §2.2 — authenticated reads of mid-approval content are not a real risk this system needs to gate; only public visibility (already handled by `publications`) and edit-authority (new, §2.2) matter.
- **No asymmetric read-vs-write split on `EditProtectedData`.** §2.1 — no evidence of a real need for "can see but not change" or vice versa; one permission, both directions, is the minimal correct design today.
- **No retrofit of authorization logic onto `articles`, `staticPages`, `externalMediaCoverage`, `publicEvents`.** §1.3 — these have no backing collection yet; there is nothing to retrofit.
- **No Import/Export/Reports action for `results`/`competitions`/`rankings`.** §6 — these collections do not exist in this codebase yet (confirmed by the full 65-collection grep), despite being referenced in product/IA documentation and in the task brief's own example. Adding a `Permission` document naming a `resourceType` with no registered Mongoose model would fail this codebase's own boot-time `PermissionsService.validateResourceTypes()` check — flagged for whenever that domain is actually built, not designed against speculatively now.

---

## 6. Permission Action-Enum Expansion: Import, Export, Reports

Evaluated against the real, verified 9 domains / 65 collections (§1.4), not the brief's estimate.

### 6.1 Import — recommended scope

| Collection | Import? | Reasoning |
|---|---|---|
| `athletes` | **Yes** | Realistic bulk-load ahead of a season/registration window — the brief's own example |
| `athleteProfiles` | **Yes** | Paired with the above; profile data (club, registration number) is typically batch-entered alongside athlete records |
| `officials` | **Yes** | Same seasonal bulk-onboarding reasoning as athletes |
| `officialProfiles` | **Yes** | Paired with the above |
| `clubs` | **Yes** | Bulk member-club onboarding/season registration |
| `coaches` | **Yes** | Same reasoning |
| `countries`, `ageCategories`, `disciplines` | No | Small, largely static reference/lookup tables (a few dozen rows at most) — one-time seed data, not a repeated administrative workflow; better served by the seed-script mechanism from the prior architecture review than a user-facing bulk-import feature |
| `venues` | No (low priority) | Typically dozens of rows, manually managed comfortably via ordinary CRUD |
| `athleteClubHistory`, `coachClubHistory`, `officialClubHistory`, `athleteCoachHistory`, `athleteNationalTeamHistory`, `officialAssignments`, `athleteGuardianRelationships` | No | Relationship/history rows are naturally created as a side effect of other operations (assigning a coach, registering a guardian), not as standalone bulk-imported datasets |
| `documents`, `mediaAssets`, `albums`, `videos` | No | "Bulk" here means many individual file uploads, not structured tabular import — a UX/batching concern on the existing `Create` endpoint, not a distinct permission boundary |
| Everything else (CMS singletons, nav, governance entities, federation personnel, workflow/platform-admin collections) | No | Singleton rows, small counts, or structurally unsuited to tabular bulk-load |
| `results`/`competitions`/`rankings` | **Not applicable — collections don't exist yet** | See §5. The single most concrete-sounding example in the brief ("importing competition results from an external timing system") is exactly this not-yet-built domain — flagged as the natural first `Import`-relevant target once it's built, not designed against today |

### 6.2 Export — recommended scope (broader than Import, per the brief's own observation)

All six Import collections above, **plus**:

| Collection | Export? | Reasoning |
|---|---|---|
| `auditLogs` | **Yes** | Compliance/legal export is a concrete, real need — directly serves the Data Privacy chapter's own PDPL "Access to personal data" / regulator-request obligations (§17 §4) |
| `workflowActionHistory` | **Yes** | Same compliance reasoning — an approval-trail export |
| `contactMessages` | **Yes** | Citizen-correspondence records export, without needing a matching bulk-Import (nobody bulk-imports inbound contact messages) |
| `federationPersonnel`, `federationAppointments` | **Yes** | Personnel roster/reporting export is realistic even though bulk-*import* isn't (small enough to enter one at a time, large enough to want a directory export) |
| `documents`, `governanceDocuments` | **Yes** | Compiling a document package for external submission/audit |

### 6.3 Reports — recommended model: **(b) a dedicated `resourceType: 'reports'`**, not per-collection actions

**Reasoning:** the concrete report types this platform's real domains actually support today are inherently cross-collection aggregates — none of them belongs to a single resource's own CRUD boundary, so bolting a `Reports` action onto `athletes` or `clubs` individually would misrepresent what the capability actually does. A dedicated resource type, reusing the *existing* `Read` (view/generate) and the newly-added `Export` (download) actions — **no third new action needed** — keeps the enum minimal.

**Concrete report types, grounded in real, currently-implemented domains (not the brief's speculative "financial/federation-personnel summaries if applicable" — evaluated and only the justified ones kept):**

| Report | Draws from | Justification |
|---|---|---|
| Membership/Registration Summary | `athletes`, `officials`, `clubs`, `coaches` (counts by status/discipline/nationality/residencyType) | Directly serves realistic federation administrative reporting — season registration counts are a natural need |
| Federation Personnel Directory | `federationPersonnel`, `federationAppointments` | Org-chart/roster reporting for leadership |
| Compliance / Audit Report | `auditLogs`, `workflowActionHistory` | Directly serves the Data Privacy chapter's own §7 audit-record requirement — a report *of* the audit trail itself |
| Public Communication Summary | `contactMessages` (volume/status/type breakdown) | Realistic operational reporting on the citizen contact channel |
| ~~Competition Results Summary~~ | *(not buildable — see §5)* | Deferred until the results/competitions domain exists |

`reports:Read` gates viewing/generating any of the above; `reports:Export` gates downloading one as a file. Whether individual report *types* need their own finer-grained permission (e.g., is Compliance/Audit reporting more sensitive than a Membership Summary and deserving its own gate) is a genuine judgment call with no clear evidence either way yet — **OPEN DECISION**, §7.

### 6.4 Final `PERMISSION_ACTIONS` enum (cumulative, including the prior review's additions)

```
Create, Read, Update, Delete, HardDelete, Approve, Publish, EditProtectedData,
AssignRoles, ManageAccountStatus,   // from the prior auth architecture review
Import, Export                      // new, this document
```
(`reports` is a new `resourceType`, not a new action — it reuses `Read`/`Export` above.)

---

## 7. Open Decisions

| # | Decision needed | Recommended option | Alternative | Impact if unresolved |
|---|---|---|---|---|
| 1 | Should `Create` on a protected-tier resource also require `EditProtectedData` (not just capturing the field at registration, per ADR-0028's own mandatory-DOB requirement)? | No — `Create` stays gated by the resource's own `Create` permission only; `EditProtectedData` governs ongoing visibility/modification | Require both permissions for `Create` too | Low either way — affects only who may *register* a new minor athlete, not who can see/change one afterward |
| 2 | Should individual report *types* (§6.3) carry their own finer-grained permission beyond blanket `reports:Read`/`Export`? | Start with the blanket gate; split later only if a real need for differentiated report access emerges | Per-report-type permissions from day one | Low — over-splitting now with no evidence of need would itself be the over-engineering this document argues against elsewhere |
| 3 | Exact grant list for the newly-activated `EditProtectedData` permission (§4 step 2) and the entity-type-scoped `revisions`/`workflow-instances` checks (§4 step 5) | A deliberate, reviewed grant pass at rollout time, not auto-granted to every role that currently holds the base `Read`/`Create` | Auto-grant to preserve current behavior exactly | This is the one place this document's changes are *intentionally* more restrictive than today by default — needs an explicit owner decision on the initial grant list, not a default |
| 4 | Should `athleteGuardianRelationships` and `contactMessages` also get a `*PublicResponseDto`/public route, given they currently have none at all? | Out of scope for this document — no evidence either needs public exposure; this document only adds the *authenticated*-side tiering they're missing | Add public routes as a separate future item, if a real need emerges | None — purely a scope boundary, not a security gap |
| 5 | Found during a second-opinion review: `POST /athletes`, `POST /athlete-profiles`, `POST /federation-personnel` echo the raw created document, including `dateOfBirth`/`restricted.*`/`internalContact.*` (now `restrictedInfo.*` throughout), regardless of whether the creating actor holds `EditProtectedData`. Should the create-response also be tiered for consistency? | No — not a genuine information disclosure (the actor supplied those exact field values in the request body they just sent; nothing is revealed they didn't already know), so leave create-response untiered for now, purely for implementation simplicity | Tier the create-response too, for response-contract consistency with the read endpoints | Low — a real inconsistency in response *shape* across endpoints, but not a security gap; revisit only if a future workflow lets one actor create a record on another's behalf with pre-filled protected data |
| 6 | Owner-directed revision (§2.1-REVISED): exactly which `contactMessages` fields belong inside `restrictedInfo`? The citizen's own submitted fields (`senderName`/`senderEmail`/`senderPhone`/`messageBody`) are clearly in scope. `replyBody`/`repliedAt`/`repliedBy`/`replyChannel` are staff-authored reply data — a different question, and `replyBody` specifically may restate the citizen's PII in free text even if excluded from the object itself. | Exclude the 4 reply fields from `restrictedInfo` (visible to any `contactMessages:Read` holder, as today) — including them would require every triage staff member to also hold `EditProtectedData` just to do ordinary reply work, which is disproportionate to the actual sensitivity difference | Include the reply fields too, accepting the broader `EditProtectedData` grant requirement for triage staff | Low today (small team, triage staff likely need broad access anyway) — revisit if `replyBody` free-text PII restatement becomes a real observed problem, since the schema can't structurally prevent that content pattern either way |

---

## 8. Final Architecture Decision

**Approved for implementation**, as two independent, non-interacting mechanisms, per the phased rollout in §4 (Mechanism 1's Data migration and rollout is now §2.1-REVISED's Step 4, per the 2026-09-06 revision below). Both are additive to the existing RBAC engine — neither replaces or weakens the flat `(resourceType, action)` check that remains the system's primary authorization gate; they add a response-shaping tier (Mechanism 1) and a resource-condition-aware edit gate (Mechanism 2) on top of it, exactly where the current design's own explicit boundary (auth document §13) said more was needed.

The brief's suggestion that "a single mechanism may reasonably serve both [mechanisms]" was evaluated directly against the actual entity-type lists in code and **rejected** — the two problems are confirmed to apply to disjoint collections and do not benefit from a shared abstraction. This remains true regardless of the Mechanism 1 revision below; nothing about §2.3's orthogonality finding changed.

**REVISION RECORD, 2026-09-06 — Mechanism 1's serialization approach:** §2.1-ORIGINAL (per-resource DTO tiers) was this document's original recommendation, independently reconfirmed in a dedicated second-opinion review. **The project owner reviewed that full analysis and explicitly decided to proceed with a unified `restrictedInfo` object instead** (§2.1-REVISED) — an informed decision on a question this document itself flagged as a genuine trade-off, not a correction of an error. §2.1-REVISED's design was built specifically to close the three gaps the original analysis identified (rename risk, the `dateOfBirth` business-logic conflict, and the fail-open risk of a generic strip mechanism) rather than to ignore them. Both analyses are preserved in §2.1 for the record.

---

# ARCHITECTURE APPROVAL CHECKLIST

**APPROVED RECOMMENDATION:** Build both mechanisms as designed in §2 — Mechanism 1 per §2.1-REVISED (unified `restrictedInfo` object, owner-directed), Mechanism 2 per §2.2 (unchanged) — using the hard-cutover rollout in §4/§2.1-REVISED Step 4 (no permissive/audit-only staging phase — not warranted at this project's current scale).

**REQUIRED CHANGES:**
- `restrictedInfo` schema field on `athletes`, `athleteProfiles` (renamed from `restricted`), `federationPersonnel` (renamed from `internalContact`), `athleteGuardianRelationships` (consolidates `guardianName` + `guardianContact`), `contactMessages` (new, scope per Open Decision #6), `siteSettings` (consolidates 6 flat fields) — §2.1-REVISED Steps 0-1
- Data migration script (`api/scripts/migrations/2026-09-xx-unify-restricted-info.ts`) run against existing data before the old fields are dropped — §2.1-REVISED Step 2.1/Step 4
- `select: false` on `restrictedInfo` for all 6 resources above, with explicit `.select('+restrictedInfo')` opt-ins at the elevated-tier read call sites — §2.1-REVISED Step 4/Step 3
- `FieldVisibilityConfig` + `serializeWithVisibility()` shared function (`api/src/common/serialization/field-visibility.ts`) plus one config object per resource, replacing each `toPublicResponse()`/raw-document return — §2.1-REVISED Step 2.3/Step 4
- `AthletesService.getDateOfBirthForSystemUse()` internal accessor, ready for whenever age-category eligibility logic is built — §2.1-REVISED Step 2.2
- Activate `EditProtectedData`: seed `Permission` documents for the 6 resources above; write-side change-rejection logic; new `PATCH`/`PUT` handling for `athletes`/`athlete-profiles`/`site-settings` — §2.1-REVISED Step 4, §3.3
- `ProtectedDataAccessed` audit action, written on every elevated-tier read/write (§2.1-REVISED Step 4, §3.2)
- Entity-type-scoped permission check on `POST /revisions` and `POST /workflow-instances` (§2.2, §3.3) — unaffected by the Mechanism 1 revision
- Shared `canEdit()` workflow-state check, ready for the first governed-entity `PATCH` endpoint whenever one is built (§2.2)

**OPTIONAL / DEFERRED:**
- `Import`/`Export` actions and the `reports` resource type (§6) — genuinely new capability, not a gap-closure; sequence independently of the above
- Finer-grained per-report-type permissions (§7 #2) — only if a real need emerges

**OPEN DECISIONS:** §7, items 1–6. None block the core mechanisms; all shape specific grant/scope/consistency details. **#6 (`contactMessages` field scope) should be resolved before that collection's migration step runs**, since it determines the migration script's exact field list for that collection.

**FILES EXPECTED TO CHANGE:** the 6 schema files listed above (`restrictedInfo` field + `select: false`); the 6 repository files (elevated-access `.select('+restrictedInfo')` opt-in); the 6 service files (`create()`/`upsert()` write-side updates, new `shape()`/`toResponse()` methods replacing `toPublicResponse()` for the authenticated path, new `FieldVisibilityConfig` constant each); new `api/src/common/serialization/field-visibility.ts`; new `api/scripts/migrations/2026-09-xx-unify-restricted-info.ts`; `AthletesController`/`AthleteProfilesController`/`SiteSettingsController` (new/changed `PATCH`/`PUT` handling); `RevisionsController`/`WorkflowInstancesController` (entity-type check, unaffected by the Mechanism 1 revision); `AUDIT_ACTIONS` enum; new `Permission` seed data; `athletes.service.spec.ts` (fixture updates per §2.1-REVISED Step 2.2's table).

**DATABASE MIGRATIONS REQUIRED:** **Yes, for Mechanism 1** — the data migration script in §2.1-REVISED Step 2.1, run against all 6 affected collections before the old field names are removed from the schema classes. This supersedes the original design's "no migration required" claim, which was true only for the now-superseded DTO-tier approach. Mechanism 2 still requires none.

**SECURITY TESTS REQUIRED:** e2e coverage for — (a) an actor without `EditProtectedData` never receiving `restrictedInfo` in any authenticated response, including when the query layer was buggily given `includeRestricted: true` (tests the serializer's independence from the query gate, §2.1-REVISED Step 4); (b) a repository-level test confirming `findById(id)` without the opt-in never returns `restrictedInfo` on the raw document (tests `select: false` independently); (c) per-resource config-completeness tests asserting every field of the shaped type is covered by exactly one of `baseFields`/`protectedFields` (catches config drift, §2.1-REVISED Step 3); (d) migration script round-trip test (forward then `--reverse`, byte-for-byte fixture equality); (e) the same actor's write attempt to change `restrictedInfo.*` rejected with 403, an unchanged-value write accepted; (f) an actor with only `revisions:Create` (no matching `<entityType>:Update`) rejected on `POST /revisions`; (g) `ProtectedDataAccessed` audit rows written on elevated access, absent on baseline access.

---

**This phase is now complete. No implementation should begin until this document is explicitly approved** — including the specific migration script in §2.1-REVISED, which should be dry-run and reviewed by the owner before it ever runs against real data.

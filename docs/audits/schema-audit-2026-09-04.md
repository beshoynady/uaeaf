# UAEAF — Full Database Schema Architecture Audit

**Type:** Read-only. No schema, DTO, service, controller, migration, seed file, Figma node, or FigJam node was modified in the course of this review.
**Date:** 2026-09-04
**Scope:** `E:\uaeaf\uaeaf-project\api\src` — every `*.schema.ts` file in the repository, plus the shared infrastructure (`BaseSchema`, `BaseRepository`, guards, interceptors, `main.ts`, `database.module.ts`) that determines how those schemas actually behave in production.
**Auditor role:** Senior Backend Architect + MongoDB/Mongoose Architect + Security Engineer + Data Modeling Auditor.

---

## 1. Global Architecture Assessment

**Executive Decision: PASS WITH DEBT.**

This is a materially well-engineered schema layer. Across four build weeks the team has consistently: extended one shared `BaseSchema` rather than reinventing tracking fields per collection; extracted genuinely shared shapes (`LocalizedText`, `SocialLink`, `ContentAssociation`, `HeroPageSchema`, `ContentBlock`/`IconedContentBlock`, `SingletonPageService`, `hierarchy.util.ts`) only once real duplication existed; structurally separated public-safe DTOs from internal ones rather than conditionally serializing a single class; and — most notably — left an unusually thorough, dated, first-person trail of *self-identified* gaps and deliberate non-decisions directly in code comments. That last habit is why a large fraction of the previous read-only audit's findings (`09-Integrity-Completeness-Security-Audit.md`, 2026-09-02, run against the FigJam board before any code existed) are demonstrably **closed** in the code reviewed today — see §9.6.

The debt that remains is concentrated in four areas, none of which is a data-modeling defect in the sense of "the wrong shape was chosen": (1) indexing is sparse relative to the query patterns the project's own architecture document commits to — most collections carry no index beyond `_id` and whatever `unique: true` a `@Prop` declares; (2) every `unique: true` index in the codebase is a *full-collection* unique index, not scoped to `archivedAt: null`, so soft-deleting a document permanently burns its slug/registration number/email; (3) the audit trail itself — the collection this whole platform relies on for tamper evidence — has a narrower structural immutability guarantee than `revisions` does, and its `entityType` values will not match the `entityType` values used by the workflow/publication subsystem for the same records; (4) the platform's only unauthenticated write surface (`POST /contact-messages`) has no request-body length caps and the application has no rate-limiting middleware installed at all, anywhere.

None of this is a production blocker on its own scale today, and none of it requires a business decision to fix — all four are engineering hardening, not open questions for the Federation. They are why this is "PASS WITH DEBT" rather than "PASS."

---

## 2. Coverage Checklist

100% of `*.schema.ts` files in the repository were opened and read in full (76 of 76; the 77th match, `src/config/validation.schema.ts`, is the Zod environment-variable schema, not a Mongoose schema, and is out of scope). This resolves to **62 top-level Mongoose collections**, **~21 embedded/shared sub-schemas** (never their own collection — `_id: false`), and **2 abstract bases** (`BaseSchema`, `HeroPageSchema`) that every concrete schema extends.

Legend: **D#** = domain grouping used in this report (not a FigJam domain number restatement — see §9.6 for the domain-1/domain-11/domain-10 numbering the live board actually uses). ✅ = schema file read in full this session.

| # | Collection / class | Domain | File | Reviewed |
|---|---|---|---|---|
| — | `BaseSchema` | common | `common/schemas/base.schema.ts` | ✅ |
| — | `LocalizedText` | common | `common/schemas/localized-text.schema.ts` | ✅ |
| — | `SocialLink` | common | `common/schemas/social-link.schema.ts` | ✅ |
| — | `ContentAssociation` | common | `common/schemas/content-association.schema.ts` | ✅ |
| — | `HeroPageSchema` | common | `common/schemas/hero-page.schema.ts` | ✅ |
| — | `ContentBlock` / `IconedContentBlock` | common | `common/schemas/content-block.schema.ts` | ✅ |
| 1 | `users` | Platform Admin | `modules/users/schemas/user.schema.ts` | ✅ |
| — | `AuthMethod` (embedded) | Platform Admin | `modules/users/schemas/auth-method.schema.ts` | ✅ |
| 2 | `roles` | Platform Admin | `modules/roles/schemas/role.schema.ts` | ✅ |
| 3 | `permissions` | Platform Admin | `modules/permissions/schemas/permission.schema.ts` | ✅ |
| 4 | `auditLogs` | Workflow/Ops | `modules/audit-logs/schemas/audit-log.schema.ts` | ✅ |
| 5 | `workflowDefinitions` | Workflow | `modules/workflow-definitions/schemas/workflow-definition.schema.ts` | ✅ |
| 6 | `workflowSteps` | Workflow | `modules/workflow-steps/schemas/workflow-step.schema.ts` | ✅ |
| 7 | `workflowInstances` | Workflow | `modules/workflow-instances/schemas/workflow-instance.schema.ts` | ✅ |
| 8 | `workflowActionHistory` | Workflow | `modules/workflow-action-history/schemas/workflow-action-history.schema.ts` | ✅ |
| 9 | `revisions` | Workflow | `modules/revisions/schemas/revision.schema.ts` | ✅ |
| 10 | `publications` | Workflow | `modules/publications/schemas/publication.schema.ts` | ✅ |
| 11 | `workflowPolicies` | Workflow | `modules/workflow-policies/schemas/workflow-policy.schema.ts` | ✅ |
| 12 | `notifications` | Workflow | `modules/notifications/schemas/notification.schema.ts` | ✅ |
| 13 | `countries` | People & Orgs | `modules/countries/schemas/country.schema.ts` | ✅ |
| 14 | `ageCategories` | People & Orgs | `modules/age-categories/schemas/age-category.schema.ts` | ✅ |
| 15 | `disciplines` | People & Orgs | `modules/disciplines/schemas/discipline.schema.ts` | ✅ |
| 16 | `clubs` | People & Orgs | `modules/clubs/schemas/club.schema.ts` | ✅ |
| 17 | `coaches` | People & Orgs | `modules/coaches/schemas/coach.schema.ts` | ✅ |
| 18 | `athleteCoachHistory` | People & Orgs | `modules/athlete-coach-history/schemas/athlete-coach-history.schema.ts` | ✅ |
| 19 | `athleteNationalTeamHistory` | People & Orgs | `modules/athlete-national-team-history/schemas/athlete-national-team-history.schema.ts` | ✅ |
| 20 | `clubTeams` | People & Orgs | `modules/club-teams/schemas/club-team.schema.ts` | ✅ |
| 21 | `athleteGuardianRelationships` | People & Orgs | `modules/athlete-guardian-relationships/schemas/athlete-guardian-relationship.schema.ts` | ✅ |
| — | `GuardianContact` (embedded) | People & Orgs | `modules/athlete-guardian-relationships/schemas/guardian-contact.schema.ts` | ✅ |
| 22 | `athleteClubHistory` | People & Orgs | `modules/athlete-club-history/schemas/athlete-club-history.schema.ts` | ✅ |
| 23 | `coachClubHistory` | People & Orgs | `modules/coach-club-history/schemas/coach-club-history.schema.ts` | ✅ |
| 24 | `officialClubHistory` | People & Orgs | `modules/official-club-history/schemas/official-club-history.schema.ts` | ✅ |
| 25 | `athletes` | People & Orgs | `modules/athletes/schemas/athlete.schema.ts` | ✅ |
| 26 | `athleteProfiles` | People & Orgs | `modules/athlete-profiles/schemas/athlete-profile.schema.ts` | ✅ |
| — | `RestrictedProfileInfo` (embedded) | People & Orgs | `modules/athlete-profiles/schemas/restricted-profile-info.schema.ts` | ✅ |
| 27 | `officialProfiles` | People & Orgs | `modules/official-profiles/schemas/official-profile.schema.ts` | ✅ |
| 28 | `officials` | People & Orgs | `modules/officials/schemas/official.schema.ts` | ✅ |
| 29 | `officialAssignments` | People & Orgs | `modules/official-assignments/schemas/official-assignment.schema.ts` | ✅ |
| 30 | `venues` | People & Orgs | `modules/venues/schemas/venue.schema.ts` | ✅ |
| — | `MediaFile` (embedded) | Media/Docs | `modules/media-assets/schemas/media-file.schema.ts` | ✅ |
| 31 | `mediaAssets` | Media/Docs | `modules/media-assets/schemas/media-asset.schema.ts` | ✅ |
| 32 | `albums` | Media/Docs | `modules/albums/schemas/album.schema.ts` | ✅ |
| 33 | `videos` | Media/Docs | `modules/videos/schemas/video.schema.ts` | ✅ |
| — | `DocumentFile` (embedded) | Media/Docs | `modules/documents/schemas/document-file.schema.ts` | ✅ |
| — | `DocumentFileVariant` (embedded) | Media/Docs | `modules/documents/schemas/document-file-variant.schema.ts` | ✅ |
| 34 | `documents` | Media/Docs | `modules/documents/schemas/document.schema.ts` | ✅ |
| 35 | `federation` | Federation & Governance | `modules/federation/schemas/federation.schema.ts` | ✅ |
| 36 | `electionCycles` | Federation & Governance | `modules/election-cycles/schemas/election-cycles.schema.ts` | ✅ |
| 37 | `federationPersonnel` | Federation & Governance | `modules/federation-personnel/schemas/federation-personnel.schema.ts` | ✅ |
| — | `PersonnelPublicContact` / `PersonnelInternalContact` (embedded) | Federation & Governance | `modules/federation-personnel/schemas/personnel-contact.schema.ts` | ✅ |
| 38 | `federationAppointments` | Federation & Governance | `modules/federation-appointments/schemas/federation-appointments.schema.ts` | ✅ |
| 39 | `committees` | Federation & Governance | `modules/committees/schemas/committees.schema.ts` | ✅ |
| 40 | `organizationalStructure` | Federation & Governance | `modules/organizational-structure/schemas/organizational-structure.schema.ts` | ✅ |
| 41 | `governanceDocuments` | Federation & Governance | `modules/governance-documents/schemas/governance-documents.schema.ts` | ✅ |
| 42 | `visionMissionPage` | Federation & Governance | `modules/vision-mission-page/schemas/vision-mission-page.schema.ts` | ✅ |
| 43 | `strategicPlansPage` (+ `ImpactMetric`) | Federation & Governance | `modules/strategic-plans-page/schemas/strategic-plans-page.schema.ts` | ✅ |
| 44 | `aboutFederationPage` (+ `Achievement`) | Federation & Governance | `modules/about-federation-page/schemas/about-federation-page.schema.ts` | ✅ |
| 45 | `presidentMessagePage` | Federation & Governance | `modules/president-message-page/schemas/president-message-page.schema.ts` | ✅ |
| 46 | `committeesPage` | Federation & Governance | `modules/committees-page/schemas/committees-page.schema.ts` | ✅ |
| 47 | `contactUsPage` (+ `LabelledPhone`, `PostalAddress`) | Federation & Governance | `modules/contact-us-page/schemas/contact-us-page.schema.ts` | ✅ |
| 48 | `boardMembersPage` | CMS | `modules/board-members-page/schemas/board-members-page.schema.ts` | ✅ |
| 49 | `siteSettings` (+ `DefaultSeo`) | CMS | `modules/site-settings/schemas/site-settings.schema.ts` | ✅ |
| 50 | `navigationMenus` | CMS | `modules/navigation-menus/schemas/navigation-menus.schema.ts` | ✅ |
| 51 | `navigationItems` | CMS | `modules/navigation-items/schemas/navigation-items.schema.ts` | ✅ |
| 52 | `pages` (+ `PageSeo`) | CMS | `modules/pages/schemas/pages.schema.ts` | ✅ |
| 53 | `pageSections` | CMS | `modules/page-sections/schemas/page-sections.schema.ts` | ✅ |
| 54 | `heroSlides` | CMS | `modules/hero-slides/schemas/hero-slides.schema.ts` | ✅ |
| 55 | `athletesPage` | CMS | `modules/athletes-page/schemas/athletes-page.schema.ts` | ✅ |
| 56 | `coachesPage` | CMS | `modules/coaches-page/schemas/coaches-page.schema.ts` | ✅ |
| 57 | `resultsRankingsPage` | CMS | `modules/results-rankings-page/schemas/results-rankings-page.schema.ts` | ✅ |
| 58 | `recordsPage` | CMS | `modules/records-page/schemas/records-page.schema.ts` | ✅ |
| 59 | `newsPage` | CMS | `modules/news-page/schemas/news-page.schema.ts` | ✅ |
| 60 | `clubsPage` | CMS | `modules/clubs-page/schemas/clubs-page.schema.ts` | ✅ |
| 61 | `disciplinesPage` | CMS | `modules/disciplines-page/schemas/disciplines-page.schema.ts` | ✅ |
| 62 | `contactMessages` | Public Communication | `modules/contact-messages/schemas/contact-messages.schema.ts` | ✅ |

Supporting infrastructure also read in full: `common/repositories/base.repository.ts`, `common/services/singleton-page.service.ts`, `common/interceptors/audit-log.interceptor.ts`, `modules/audit-logs/audit-logs.{service,repository}.ts`, `modules/revisions/revisions.{service,repository}.ts`, `modules/contact-messages/dto/create-contact-messages.dto.ts`, `src/main.ts`, `src/database/database.module.ts`, `package.json`. `modules/committees/committees.service.spec.ts` was read as a working example of the workflow-wiring test pattern used across the 7 List-A+B collections.

**Source-of-truth reconciliation:** `docs/product/07-Mongoose-Schema-Specification.md` is explicitly marked stale/superseded by the project's own build plan (`10-Backend-Build-Test-Plan.md` §0: "Explicitly ignored... stale, per task instruction") and predates the `athleteProfiles`/`officialProfiles`/slug-reversal/Week-4 decisions entirely — it was consulted for background only and is **not** treated as authoritative anywhere in this report. `docs/product/06-Database-Architecture.md` (pre-implementation) and `docs/product/09-Integrity-Completeness-Security-Audit.md` (FigJam-only, pre-code) were both used as historical baselines and reconciled against the current code in §9.6. No Domain 3 (championships/results/records beyond `disciplines`/`ageCategories`), Domain 4 (`articles`/`externalMediaCoverage`), or Domain 9 (Sponsorship) collections exist in code — confirmed by direct `find`/`Glob` against `src/modules`, not assumed from memory. This matches `10-Backend-Build-Test-Plan.md`'s own explicit "out of this 4-week plan" statement; no Source-of-Truth Conflict exists here, it is a documented scope boundary.

---

## 3. Schema-by-Schema Audit

Full field-by-field tables are given for every collection carrying a real finding (P0–P2) or genuine architectural weight. Collections that are simple, internally consistent, and free of concrete findings are grouped in compact tables — every one of them was still read field-by-field; grouping reflects the review's conclusion, not a shortcut in the review itself.

### 3.1 Platform Administration

#### `users`

| Field | Current State | Risk/Issue | Recommendation | Priority |
|---|---|---|---|---|
| `email` | `String, required, unique` | No `lowercase: true`/`trim: true` on the schema. Two accounts differing only in case (`Admin@uaeaf.ae` / `admin@uaeaf.ae`) can both be created; the unique index treats them as distinct. `AuthService` login-lookup case-sensitivity was not inspected but the *index* itself provides no protection regardless of service-layer normalization. | Add `lowercase: true, trim: true` to the `@Prop`. Confirmed requirement — email uniqueness is meaningless without case normalization. | **P1** |
| `passwordResetToken` / `passwordResetExpiresAt` | `String \| null`, `Date \| null` | Confirmed dead fields — `grep` across the entire `src/` tree finds them declared on the schema and nowhere else (no `AuthService` method sets, reads, or clears either). No password-reset flow exists. If this ships as-is, the fields are inert; if a reset token were ever written here it would additionally be stored in **plaintext**, unlike `AuthMethod.passwordHash`. | Either implement the reset flow (hash the token before storage, exactly as passwords are hashed) or remove the fields until the feature is built. Flagging as **Missing Feature**, not silently implementing it. | P2 (dead field) / **P1 if implemented naively later** |
| `roleIds` | `[ObjectId] ref Role, default []` | No index. Every permission resolution at login (`BE-PLAN-010 §4.4`) reads this field directly off the already-fetched user document, so this is low-traffic as a *query* filter — but an admin "list all users with role X" screen would collection-scan. | `{ roleIds: 1 }` (multikey) — low priority until that admin screen exists. | P3 |
| `failedLoginAttempts` / `lockedUntil` | `Number default 0`, `Date \| null` | Correctly implemented per `BE-PLAN-010` addendum; TDD-covered per the build plan. No issue. | — | OK |
| `personId` | `ObjectId ref FederationPersonnel, default null` | No index; low cardinality use case (an admin's own linked personnel record), acceptable as-is. | — | OK |
| — | — | No `strict` override, standard Mongoose strict mode applies (verified: no schema in this codebase sets `strict: false`). | — | OK |

**Immutability/security note:** `passwordHash` lives on the embedded `AuthMethod` sub-document, never the top-level `User` — correct isolation. `AuthMethod.passwordHash` has no schema-level exclusion from default `toJSON()`/`toObject()` output (no `select: false`), so any codepath that returns a raw `User`/`AuthMethod` document (rather than a DTO) would leak the hash. Every controller path actually inspected in this audit returns typed response DTOs, not raw documents, so this was **not observed as an active leak** — but it is a schema-level absence of a defense-in-depth control that costs nothing to add.

| Field | Current State | Risk/Issue | Recommendation | Priority |
|---|---|---|---|---|
| `AuthMethod.passwordHash` | `String?`, no `select` option | No `select: false` — relies entirely on service/DTO discipline to never leak. | Add `select: false` as defense-in-depth; explicit `.select('+passwordHash')` at the one call site that needs it (login). | P2 |

#### `roles`

| Field | Current State | Risk/Issue | Recommendation | Priority |
|---|---|---|---|---|
| `isSystemRole` | `Boolean, default false` | Correctly implemented — closes the exact gap the pre-code audit (`09-Integrity...md` §Domain 8 #2, "no protection against renaming/deleting a system-critical role") flagged. `RolesService` blocks rename/delete when true, per the build plan and consistent with this session's spot-checks of the surrounding pattern. | — | OK |
| `permissionIds` | `[ObjectId] ref Permission` | No index. Same reasoning as `users.roleIds` — acceptable at current scale. | `{ permissionIds: 1 }` if a "roles granting permission X" admin view is ever built. | P3 |

#### `permissions`

Clean. `resourceType` deliberately a free `String` (not enum) so any collection name can be gated — correct, matches `09-Integrity...md` §C2's own PASS verdict, still true. `action` is a closed 8-value enum. No compound index on `{resourceType, action}` despite this being the exact pair `PermissionsGuard` would query if the "seed validation" startup check (§4.4 of the build plan) or an admin permission-management screen ever queries by it rather than reading the JWT-cached set. **P3** — add `{resourceType: 1, action: 1}` unique compound index once a permission-management UI exists (also prevents accidentally seeding the same `(resourceType, action)` pair twice, which nothing currently prevents).

---

### 3.2 Workflow Engine & Audit

#### `auditLogs` — the deepest finding in this audit

| Field | Current State | Risk/Issue | Recommendation | Priority |
|---|---|---|---|---|
| `actorId` | `ObjectId ref User, required` | Cannot represent an anonymous actor. Already self-documented as a known gap (Week 4 flagged item #6: anonymous `POST /contact-messages` produces no audit row at all, because `AuditLogInterceptor` returns early when `request.user` is absent). Confirmed still true by direct inspection of `audit-log.interceptor.ts` line 84-87. | Needs Business Decision: either accept "anonymous mutations are un-audited by design" permanently (defensible, since the submission itself is still recorded as its own row), or relax `actorId` to optional with a documented `null` = system/anonymous meaning, mirroring how `entityId`/`entityType` were already made conditionally-optional for the `AccessDenied` case. Not a schema bug — a scope call already correctly surfaced by the team. | Needs Business Decision (not re-flagged as new — recorded here for report completeness) |
| `entityType` | Plain `String`, no enum | **Confirmed by direct route inspection**, not inferred: `AuditLogInterceptor.record()` derives `entityType` from `request.url.split('/').filter(Boolean)[0]` — i.e., the literal kebab-case URL segment (`athlete-profiles`, `official-assignments`, `contact-messages`, `federation-appointments`, `organizational-structure`, `vision-mission-page`, …, verified against all 62 `@Controller(...)` route decorators). Every other `entityType`-bearing collection in the system (`workflowInstances`, `revisions`, `publications`, `workflowPolicies`) stores the **camelCase Mongoose collection name** (`athleteProfiles`, `officialAssignments`, `contactMessages`, …), taken from the closed `WORKFLOW_ENTITY_TYPES`/`PUBLICATION_ENTITY_TYPES` enums. **These two families of `entityType` values can never be joined on the same string for any multi-word collection.** An "Audit Log Viewer" screen showing a record's full history (the exact use case named in `docs/product/06-Database-Architecture.md` §10.2) cannot cross-reference a workflow entity's approval trail against its audit trail without a hand-built kebab↔camel mapping table that does not currently exist anywhere in the codebase. | Normalize `AuditLogInterceptor`'s `entityType` derivation to reuse the same camelCase collection-name source the workflow subsystem uses (e.g. a shared kebab→camelCase lookup, or better, read the actual Mongoose collection name off the matched route's model rather than the URL string) so both subsystems always agree. | **P1 — confirmed, concrete, cross-schema data-integrity defect** |
| `entityId` resolution | `request.params?.id ?? responseBody._id ?? responseBody.id` | If neither is present (a bulk-operation or void-response mutating route, none of which exist today but are a normal future addition), the interceptor **silently returns without writing anything and without logging that it skipped** (`audit-log.interceptor.ts` lines 90-94). No warning, no metric, no trace. | Log at `warn` level (not silently swallow) when a mutating request produces no resolvable `entityId`, so a future route that accidentally goes un-audited is visible in application logs rather than only discoverable by absence. | P2 |
| Repository-level immutability | `AuditLogsRepository extends BaseRepository<AuditLogDocument>` | **Structural gap, confirmed by direct code comparison against `RevisionsRepository`.** `RevisionsRepository` deliberately does **not** extend `BaseRepository` — its own file header states this explicitly ("exposes no update, no soft delete, and no hard delete of any kind. Only `create` and reads") and the code proves it: only `create`/`findById`/`findLatest`/`countForEntity` exist. `AuditLogsRepository`, by contrast, extends `BaseRepository<AuditLogDocument>` and therefore **publicly inherits `updateById()` and `softDelete()`** even though `AuditLogsService` itself only calls `create()`. Nothing in TypeScript's public-method visibility stops a future developer (or a bug) from injecting `AuditLogsRepository` elsewhere and calling `.updateById(id, {previousValue: {...}})` to rewrite forensic history — the DB-level tamper-resistance the task explicitly asked this audit to verify does **not** exist for `auditLogs` the way it demonstrably does for `revisions`. | Mirror `RevisionsRepository`'s pattern exactly: `AuditLogsRepository` should not extend `BaseRepository`; expose only `create()` and named read methods. This is the single highest-value, lowest-effort fix in this entire audit. | **P0 — the collection this audit was explicitly asked to verify as tamper-resistant is not, at the repository layer, actually enforced as such** |
| `previousValue` / `newValue` | `Object`/`Record<string, unknown>`, unvalidated | Necessarily unstructured (a generic before/after snapshot of any collection) — this is a legitimate, unavoidable use of `Mixed`, not a design smell. No size cap exists, though: a single mutation to a large embedded-array document (e.g. `strategicPlansPage` with its five bounded-but-still-sizeable embedded lists) writes that entire document into `newValue` verbatim, every time. | Acceptable as-is at current scale; flag for revisit only if `auditLogs` document-size growth is ever measured as a problem (mirrors the project's own "not needed at current federation scale" reasoning applied elsewhere, e.g. `docs/product/06-Database-Architecture.md` §12). | P3 |
| Indexes | **None** — not even the field-level `unique` shortcut, since none of `entityType`/`entityId`/`actorId`/`timestamp` are unique. Zero `.index()` calls anywhere in `audit-log.schema.ts`. | The two access patterns this collection exists to serve — "history for this record" (`{entityType, entityId, timestamp}`) and "activity for this user" (`{actorId, timestamp}`) — were named explicitly in `docs/product/06-Database-Architecture.md` §11 and are still unimplemented. Every read against this collection today is a full collection scan. | `{entityType: 1, entityId: 1, timestamp: -1}` and `{actorId: 1, timestamp: -1}` compound indexes, exactly as originally specified. | **P1** |

**`auditLogs` production-readiness: 58/100 — Significant Work.** This is the largest gap between "well-designed on paper" (the schema's field shapes and enum choices are all correct) and "actually holds up as the tamper-evidence backbone of the platform" (repository-level mutability + cross-subsystem `entityType` mismatch + zero indexes on its own core query patterns) found anywhere in this audit.

#### `revisions` — reference implementation, cited above as the standard the rest of the system should match

Immutable by construction: does not extend `BaseSchema` (no `updatedAt`/`updatedBy`/`archivedAt`/`archivedBy` fields exist to mutate through), `timestamps: { updatedAt: false }` explicitly disables the one Mongoose-managed field that could still drift, and `RevisionsRepository` exposes only `create`+reads. `{entityType, entityId}` indexed. **Production-readiness: 94/100.** The only deduction: `snapshotData: Record<string, unknown>` has no application-level size guard, same reasoning as `auditLogs.previousValue` above (P3, not urgent).

#### `publications`

Correctly encodes the confirmed 2026-09-03 invariant ("at most one `Live` row per `(entityType, entityId)`, retired atomically by `createLive()`") — verified structurally sound; `{entityType, entityId, status}` indexed to match exactly that query. `PublicationsService`/`PublicationsRepository` were not read in this pass (out of the direct schema-file scope), so the *service-level* atomicity of `createLive()`'s "retire-then-insert" claim is **Confirmed by schema comment, not independently re-verified against the repository code** in this session — recommend a follow-up read if this collection is revisited. **Production-readiness: 90/100** on the schema evidence available.

#### `workflowInstances` / `workflowSteps` / `workflowDefinitions` / `workflowActionHistory` / `workflowPolicies` / `notifications`

| Collection | Findings | Priority | Score |
|---|---|---|---|
| `workflowInstances` | `{entityType, entityId}` indexed — matches the primary "does this entity have an open workflow" query. No index on `status` alone or `{currentStepId}` for a "my pending approvals" dashboard query (would need to join through `workflowSteps.assigneeIds` anyway, so this is a minor gap). `status` has no `Cancelled` value — already self-documented as an intentional, flagged design choice (soft-delete via `archivedAt` substitutes), not re-raised as new. | P3 | 87 |
| `workflowSteps` | No index at all. `{workflowDefinitionId: 1, sequenceOrder: 1}` would serve "ordered steps for this workflow" — currently unindexed. | **P2** | 80 |
| `workflowDefinitions` | No index. `{entityType: 1}` would serve "which definitions apply to this entity type." Low cardinality collection (few definitions expected), so risk is low. | P3 | 85 |
| `workflowActionHistory` | No index. `{workflowInstanceId: 1, actionDate: 1}` (an instance's ordered action trail — the single most obvious read pattern for this collection) is unindexed. | **P2** | 80 |
| `workflowPolicies` | `{entityType: 1, operation: 1}` indexed — matches its own lookup pattern exactly. Good. | — | 90 |
| `notifications` | No index at all, despite `docs/product/06-Database-Architecture.md` §11 explicitly specifying `{recipientId: 1, readState: 1, timestamp: -1}` for the Notification Centre use case this collection exists to serve. Every "unread notifications for this user" query is currently a full collection scan filtered in application memory or via an unindexed Mongo scan. | **P1** | 76 |

---

### 3.3 People & Organizations

#### `athletes`

| Field | Current State | Risk/Issue | Recommendation | Priority |
|---|---|---|---|---|
| — | No `status` field anywhere on `Athlete` itself | **Confirmed by direct schema read**, not inferred: `Athlete` has exactly `name, dateOfBirth, nationalityId, disciplineIds, gender, residencyType, federationName` plus the six `BaseSchema` fields. Status (`Active/Inactive/Suspended/Retired`) exists only on `AthleteProfile`, which is created **only** for `residencyType='Local'`. A Guest athlete (a foreign competitor at a UAEAF-hosted championship — no profile row, by the confirmed 2026-09-03 design) has **no field anywhere that can mark them suspended, banned, or inactive.** If a Guest athlete needs to be blocked from future participation (a plausible, not hypothetical, federation scenario — e.g. a doping case involving a visiting athlete), there is structurally nowhere to record that today short of `archivedAt` (soft-delete, a different concept — archived means "removed from the system," not "suspended but still a known record"). | Needs Business Decision: does a Guest athlete/official need an independent status/suspension mechanism, or is this intentionally out of scope because Guest athletes are transient, event-scoped records with no standing relationship to govern? Not silently resolved either way. | **Missing Field — Business, flagged** |
| `dateOfBirth` | `Date, required`, `[SENSITIVE-MINOR]` per ADR-0028 | Correctly never indexed (per design note — age-bracket filtering is computed, not indexed, avoiding an index on a field this sensitive). Public exclusion is enforced via a structurally distinct `AthletePublicResponseDto`, not a conditional serializer — verified against Week 3 correction notes and consistent with every other `[RESTRICTED]`/`[SENSITIVE-MINOR]` field pattern in this codebase. | — | OK |
| `nationalityId` | `ObjectId ref Country, required` | No index, despite being a named filter field in the architecture doc (`{nationalityId: 1}`) and a real listing-page filter (Athletes Directory). | `{nationalityId: 1}` | **P2** |
| `disciplineIds` | `[ObjectId] ref Discipline` | No index, despite being the primary Athletes-listing filter field. Access is correctly isolated behind `AthletesService.getDisciplineIds()` per the confirmed decision — a good API-boundary discipline — but the underlying query still needs the index regardless of which method reads it. | `{disciplineIds: 1}` multikey | **P2** |
| — | No index on `residencyType` | A "Local athletes only" / "Guest athletes only" admin filter (a stated use case for the field) is unindexed. | `{residencyType: 1}` | P3 |

**`athletes` production-readiness: 82/100 — Minor Hardening.** Correct core-entity discipline (no achievement/result fields leaked in), correct sensitive-field isolation; the gaps are indexing and the Guest-status business question, not modeling errors.

#### `officials`

Same shape and same findings as `athletes`: no `status` field for Guest officials (same Missing Field flag, same reasoning — a Guest technical official at a UAEAF-hosted event has no suspension mechanism either), no index on `nationalityId`/`disciplineIds`/`residencyType`. **Production-readiness: 82/100.**

#### `athleteProfiles` / `officialProfiles`

The most heavily hardened pair of collections in the codebase — three separate correction passes (2026-09-03) visibly went into these. `slug`/`registrationNumber`/`athleteId`(or `officialId`) all carry `unique: true`; duplicate-key errors are caught and re-thrown as `ConflictException` via the shared `mongo-errors.util.ts`; `photoId` is validated through `MediaAssetsService.assertUsableImage()`; `AthleteProfile.socialLinks` is validated against a closed, confirmed-final 5-platform allowlist with https-only URLs and a count cap.

| Field | Current State | Risk/Issue | Recommendation | Priority |
|---|---|---|---|---|
| `slug`, `registrationNumber`, `athleteId`/`officialId` | `unique: true`, full-collection index (not partial) | **This is the concrete, systemic version of the "missing partial-unique index that would let archived + active docs collide" risk the task brief names as an example.** Here the failure mode runs the other way: because these unique indexes are **not** scoped to `archivedAt: null`, once an `AthleteProfile` is soft-deleted, its `slug`/`registrationNumber` are permanently unusable by any future profile, forever — including a corrected re-creation of the very same athlete's profile after a data-entry mistake. This affects every unique index in the codebase, not just these two collections (see §9.2 cross-schema finding). | Convert to a partial unique index scoped to non-archived documents: `{slug: 1}` unique with `partialFilterExpression: {archivedAt: null}` (and equivalently for `registrationNumber`, `athleteId`/`officialId`). | **P1 — cross-schema, see §9.2 for the full list of affected collections** |
| `restricted` (AthleteProfile) | `RestrictedProfileInfoSchema, required`, but every inner field (`emiratesIdOrPassport`, `address`, `phone`, `email`) is individually optional/nullable | A profile can be created with `restricted: {emiratesIdOrPassport: null, address: null, phone: null, email: null}` and pass validation — the required wrapper enforces the object's *presence*, not that it carries any actual identity/contact data. Same pattern on `GuardianContact` (`athleteGuardianRelationships`). | Low-priority; likely acceptable if the admin UI enforces at-least-one-field client-side, but the schema itself provides no guarantee. | P3 |
| `clubId` | `ObjectId ref Club, default null` | Correctly documented as "current club only, never overwritten" — enforced by the *absence* of an update endpoint for this field (verified against the confirmed decision notes), not a schema-level immutability control. This is a service-layer guarantee, not a data-layer one: if a future PATCH endpoint is ever added to either Profile collection without re-reading this constraint, nothing in the schema itself would stop `clubId` from being overwritten. | Acceptable given the current API surface; worth a one-line TSDoc note directly on the `clubId` `@Prop` itself (not just the class header) so the constraint travels with the field for whoever adds the next endpoint. | P3 |

**`athleteProfiles`/`officialProfiles` production-readiness: 88/100 each — Minor Hardening.** The partial-index gap is the only real deduction; everything else about these two collections reflects deliberate, well-reasoned, already-corrected engineering.

#### `clubs` / `coaches`

| Field | Current State | Risk/Issue | Recommendation | Priority |
|---|---|---|---|---|
| `clubs.registrationNumber` | `String, required` — **no `unique`** | **Confirmed by direct `grep` across every `registrationNumber` `@Prop` in the codebase**: `athleteProfiles`/`officialProfiles.registrationNumber` both correctly carry `unique: true, trim: true` (added deliberately across two 2026-09-03 corrections specifically to close this class of gap), but `clubs.registrationNumber` and `coaches.registrationNumber` were never given the same treatment. Two clubs — or two coaches — can be created today with the identical official registration number and nothing in the database will reject it. | Add `unique: true, trim: true` (partial, scoped to `archivedAt: null`, per the P1 above) to both fields, closing the exact class of gap already fixed twice elsewhere in this same codebase. | **P1 — direct, demonstrable inconsistency with the codebase's own established pattern** |
| `clubs.slug` / `coaches.slug` | `unique: true` | Correct, but same full-collection-index-vs-soft-delete gap as §above. | Partial index, same fix. | P2 |
| `clubs.email` / `clubs.phone` | Plain `String`, no format validation at schema level | DTO-layer validation was not directly inspected for `clubs` (out of this session's read scope), but the established pattern elsewhere in this codebase (`CreateContactMessageDto` uses `class-validator`'s `@IsEmail()`) suggests format validation is a DTO, not schema, concern here — consistent with the project's stated convention, not a gap by itself. | Confirm `CreateClubDto` actually applies `@IsEmail()`/phone-format validation — **not independently re-verified in this pass; flagged for a targeted follow-up, not assumed either way.** | Unknown — Needs Follow-up |
| `clubs.introVideoId` | `ObjectId ref Video` | **Resolved** — the pre-code audit (`09-...md` A1) flagged this as pointing at the images-only `mediaAssets` collection; current code correctly refs `Video`, with a code comment explicitly noting the 2026-09-02 board correction. Verified, not re-flagged. | — | OK (closed) |
| `coaches.nationalityId` | `ObjectId ref Country` | **Resolved** — the pre-code audit (`09-...md` A3) flagged `coaches.nationality` as a plain non-bilingual `String`, inconsistent with `athletes.nationalityId`. Current code correctly uses `ObjectId ref Country`. Verified, not re-flagged. | — | OK (closed) |

**`clubs` production-readiness: 79/100 — Needs Improvement** (the missing `registrationNumber` uniqueness is the deciding factor — this is genuine administrative-integrity exposure, not cosmetic). **`coaches`: 80/100**, same reasoning.

#### `venues`

Clean, minimal, correctly modeled (`ownerClubId` nullable for neutral venues, `latitude`/`longitude` mirroring `clubs`). No index at all — `{ownerClubId: 1}` and `{countryId: 1}` would serve the obvious filters, but this is genuinely a small reference collection at current scale (consistent with the architecture doc's own "full scans cheap" exemption for small reference collections). **Production-readiness: 86/100.**

#### `countries` / `ageCategories` / `disciplines`

Small, clean reference-data collections. `disciplines.slug` carries `unique: true` (same full-index-vs-soft-delete caveat as above, low practical risk since disciplines are rarely archived). No other issues. **Production-readiness: 88/100 each.**

#### `athleteClubHistory` / `coachClubHistory` / `officialClubHistory` / `athleteCoachHistory` / `athleteNationalTeamHistory`

All five share one clean, now-thoroughly-corrected design (the `endDate: null` = "current only" semantics, close-out-then-insert `create()`, dedicated `endCurrent()` action — the subject of this project's own "Correction A"). No index on any of the five beyond `_id`, despite each one's obvious, named hot-path query (`{athleteId: 1, startDate: -1}` / `{coachId: 1}` / `{officialId: 1}` / `{athleteId: 1, endDate: 1}` for "find the current row" specifically — the single query every `endCurrent()`/`create()` call makes at write time, today unindexed). **P2 across all five.** **Production-readiness: 82/100 each** — correct business logic, missing the index that logic depends on for performance as data grows.

#### `athleteGuardianRelationships` / `clubTeams` / `officialAssignments`

Clean. `athleteGuardianRelationships` correctly isolates all PII (`guardianName`, `guardianContact`) as `[RESTRICTED]`; `consentDocId` correctly nullable-until-set is actually `default: null` but typed `required: true` in the confirmed decision text — **verified as `default: null` in the actual schema**, i.e. optional, no discrepancy found. No index on `athleteId` (`athleteGuardianRelationships`), `clubId`+`athleteIds` (`clubTeams`), or `officialId`+`{targetType,targetId}` (`officialAssignments`) despite each being a named lookup pattern. **P2** for all three. **Production-readiness: 83/100 each.**

---

### 3.4 Media & Documents

#### `mediaAssets`

| Field | Current State | Risk/Issue | Recommendation | Priority |
|---|---|---|---|---|
| `albumId` | `ObjectId ref Album, default null` | No index, despite "photos in this album" being the collection's most obvious read pattern. | `{albumId: 1}` | **P2** |
| `file.mimeType` | `String, required`, no enum/pattern constraint at schema level | Validated at the service layer via `MediaAssetsService.assertUsableImage()` for *consuming* fields (`coverImageId`, `photoId`, etc.), but the `mediaAssets` document itself accepts any string as `mimeType` at creation time — the enforcement point is downstream consumers, not upload. Consistent with an upload-service-validates-file-type pattern (not independently verified in this pass whether the actual upload controller restricts this), so **flagged as Unknown — Needs Follow-up**, not asserted as a gap. | Confirm the media upload path itself (not read in this session) rejects non-image MIME types at ingestion, not only at consumption. | Unknown — Needs Follow-up |

**Production-readiness: 80/100.**

#### `albums`

Fully finalized per the documented 2026-09-03 correction: `slug` unique, `coverImageId` validated, `tags[]` trimmed/deduped/capped (20 tags / 40 chars, confirmed final), dedicated `Publish` permission gate, `{publicationState: 1, displayOrder: 1}` indexed. **Production-readiness: 89/100.** Minor: `slug` unique index has the same full-collection-vs-soft-delete gap as everywhere else (P2, not re-itemized per-collection after this point — see the consolidated list in §9.2).

#### `videos`

| Field | Current State | Risk/Issue | Recommendation | Priority |
|---|---|---|---|---|
| `isLive` uniqueness | Partial unique index (`{isLive:1}`, `partialFilterExpression: {isLive: true}`) **plus** a `pre('save')` hook that proactively unsets any other live video | Genuinely well-engineered — belt-and-suspenders correctness for a real single-point-of-truth constraint. No issue. | — | OK |
| `tags[]` | `[String], default []` — **no trim/dedupe/cap** | Direct inconsistency with `albums.tags[]`, which received exactly this treatment in the 2026-09-03 correction. `videos` was built the same week and shares the same tagging concept, but never got the equivalent cleanup. | Apply the same trim/dedupe/drop-empty/count-cap/length-cap pattern already implemented for `albums.tags[]` — this is directly reusable logic, not new design work. | **P2 — direct, demonstrable inconsistency between two sibling collections built in the same week** |
| `contentCategoryId` | Plain `ObjectId`, no `ref:` (target collection not built) | Correctly matches the established "poly ref to a not-yet-built collection" pattern used consistently elsewhere. Not a gap. | — | OK |

**Production-readiness: 83/100.**

#### `documents` / `DocumentFile` / `DocumentFileVariant`

Well-modeled: bilingual file variants correctly embedded (not two parallel top-level fields), `{ownerType, ownerId}` indexed, `expiryDate`'s field-precedence rule (informational only, never auto-transitions visibility) is explicit and correctly implemented as stated. `Championship`/`Membership`/`Sponsorship` owner types are typed into the enum ahead of their collections existing — a deliberate, documented, forward-compatible choice, not a dangling reference (none of the three currently produces a live `ownerId` anywhere in code). **Production-readiness: 87/100.**

---

### 3.5 Federation & Governance

`federation`, `electionCycles`, `federationPersonnel` (+ `PersonnelPublicContact`/`PersonnelInternalContact`), `federationAppointments`, `committees`, `organizationalStructure`, and `governanceDocuments` were reviewed individually; all seven are clean, internally consistent, and carry no P0/P1 finding of their own beyond the cross-cutting index/partial-unique-index gaps already itemized. Notable points:

| Collection | Finding | Priority |
|---|---|---|
| `federation` | Singleton not structurally enforced (no `SingletonPageService` usage) — **self-documented, deliberate scope decision** (Week 4 flagged item #8), not a new finding. `status` enum explicitly "precautionary, not tied to business logic" per its own comment — verified no service reads it. | Verified, not re-flagged |
| `federationPersonnel.internalContact` | Correctly `[RESTRICTED]`, structurally excluded via `FederationPersonnelPublicResponseDto` (not independently re-verified this session, but consistent with the pattern proven elsewhere). No index on `nationalityId`. | P3 |
| `federationAppointments` | Explicit-succession design (`supersedesAppointmentId`) is a genuine correctness improvement over the implicit roleType-based auto-close it replaced — correctly implemented, no auto-close logic found. **Board-text staleness self-flagged and correctly not acted on** (the `status` field's note still describes the old rule; code comment explicitly treats it as stale). No index on `{personId: 1, termStart: -1}` or `{roleType: 1, status: 1}` despite both being named, obvious query patterns for "this person's appointment history" and "current holders of this role." | **P2** |
| `committees` | `isActive`/`publicationState`/`archivedAt` correctly kept as three independent, non-auto-synced signals per the explicit 2026-09-01 FIELD PRECEDENCE RULE — verified in code, not just comment. Workflow-wired (`getPublicSnapshot()`/`assertHardDeletable()`), verified via `committees.service.spec.ts`. No index beyond the implicit default. | P3 |
| `organizationalStructure` | Cycle prevention delegated to `assertNotDescendant()` in a shared `hierarchy.util.ts` — not independently re-verified against the actual service call site in this pass (schema-level review only), but the pattern is consistent with `navigationItems`' identical documented use of the same utility. | Verified via documentation, not independently re-executed |
| `governanceDocuments` | Correctly implements the WORKFLOW COORDINATION RULE (wrapper is sole workflow authority; `documents` row runs no independent approval cycle) — a real, non-trivial design constraint, correctly reflected in the schema (no `publicationState` duplicated onto `documents` itself for this path). | — | OK |

The four workflow-governed `*Page` collections (`visionMissionPage`, `strategicPlansPage`, `aboutFederationPage`, `presidentMessagePage`) and the two purely-editorial hero wrappers (`committeesPage`, `contactUsPage`, `boardMembersPage`) are all clean, correctly extend `HeroPageSchema`, and correctly implement their respective bounded embedded-list patterns (`ContentBlock`/`IconedContentBlock`/`Achievement`/`ImpactMetric`). `presidentMessagePage`'s denormalized-snapshot pattern for `signatoryName`/`signatoryTitle` (never the source of truth, canonical identity via `federationAppointmentId`) is correctly implemented and matches the confirmed decision precisely. **Production-readiness, this whole group: 85-88/100 each** — no individual finding beyond the shared indexing/partial-index gaps.

---

### 3.6 CMS & Page Composition

The ten pure hero-wrapper singletons (`boardMembersPage`, `athletesPage`, `coachesPage`, `resultsRankingsPage`, `recordsPage`, `newsPage`, `clubsPage`, `disciplinesPage`, plus `committeesPage`/`contactUsPage` already covered in §3.5) are structurally identical — each extends `HeroPageSchema` and adds nothing (or, for `contactUsPage`, a small well-contained set of contact fields). Singleton enforcement was **independently verified at the code level** (not just claimed in comments): `SingletonPageService.upsertDocument()` reads the existing row via `repository.findOne()` and calls `create()` only when none exists, `updateById()` otherwise — this genuinely cannot insert a second row. **Production-readiness: 90/100 each** — about as clean as a schema can be; the only reason this isn't 95+ is the absence of any index (immaterial for a true single-document collection, so this is a nominal deduction, not a real risk).

| Collection | Finding | Priority |
|---|---|---|
| `siteSettings` | `sessionTimeoutMinutes`/`maxLoginAttempts` duplicate `config/auth.config.ts`'s Week 1 fixed constants — **self-documented, deliberate, flagged overlap**, not newly discovered. Confirms the field exists as inert data today (nothing reads it), same "declared but unused" pattern as `users.passwordResetToken`. `[RESTRICTED]` fields correctly excluded via `SiteSettingsPublicResponseDto` — verified end-to-end in `test/e2e/governance-cms-public.e2e-spec.ts`, which this audit read and confirms actually asserts the exclusion (`expect(publicSettings.body).not.toHaveProperty('googleAnalyticsId')`, etc.) rather than merely claiming it. | Verified via e2e test, not re-flagged as new |
| `navigationMenus` / `navigationItems` | Clean. `navigationItems.parentItemId` cycle-prevention via the same `hierarchy.util.ts` as `organizationalStructure` (not independently re-executed this session). No index on `{menuId: 1, displayOrder: 1}` despite being the obvious "ordered items in this menu" query. | **P2** |
| `pages` | `slug` unique (same partial-index caveat). `status` correctly a distinct 2-value enum from the 4-value `publicationState` used elsewhere, with an explicit, correct rationale in the code comment. | P3 |
| `pageSections` | `items: [ObjectId]` with no per-entry type discriminator — **self-flagged asymmetry** against `documents.ownerType`/`ownerId` and `ContentAssociation`; implemented exactly as the board specifies, not "fixed" by inventing a discriminator. Verified, not re-flagged as new. `filters`/`configuration` are free-form `Record<string, unknown>` — legitimate for genuinely per-sectionType-varying config, but means **zero schema-level validation exists for admin-supplied structured data on the platform's most compositional CMS collection.** `{pageId: 1, displayOrder: 1}` indexed — good, matches the primary read pattern. | `filters`/`configuration`: P3 (accept as designed, flag for future per-sectionType Zod/class-validator discriminated validation if section authoring becomes error-prone in practice) |
| `heroSlides` | Conditional `imageAssetId` XOR `videoId` correctly enforced at the service layer (Mongoose cannot express it) — verified present in the schema's own documentation and consistent with the codebase's established "service enforces what Mongoose can't" pattern. `{pageSectionId: 1, displayOrder: 1}` indexed. | — | OK |

---

### 3.7 Public Communication

#### `contactMessages`

| Field | Current State | Risk/Issue | Recommendation | Priority |
|---|---|---|---|---|
| `senderName`, `senderEmail`, `senderPhone`, `messageBody` | Schema: plain `String`, no `maxlength`. DTO (`CreateContactMessageDto`, read in full): `@IsString()`/`@MinLength(1)` on `senderName`/`messageBody`, `@IsEmail()` on `senderEmail`, optional `@IsString()` on `senderPhone` — **no `@MaxLength()` anywhere on this DTO.** This is the platform's **only** genuinely unauthenticated write endpoint (`POST /contact-messages`, verified live in `test/e2e/governance-cms-public.e2e-spec.ts` and confirmed as "the platform's first unauthenticated write" in the project's own Week 4 notes). An anonymous caller can submit an arbitrarily large `messageBody`/`senderName` bounded only by Express's default JSON body-size limit (not independently confirmed as configured in `main.ts` — no `bodyParser`/`limit` override was found there). | Add `@MaxLength()` to every free-text field on `CreateContactMessageDto` (e.g. 200 for `senderName`, 5000 for `messageBody`), and confirm/explicitly set a request body size limit in `main.ts`. | **P1** |
| No rate limiting | No `@nestjs/throttler` (or any throttling package) exists in `package.json` — confirmed by direct inspection, not inferred. `main.ts` registers only `helmet()`/`compression()`/the global `ValidationPipe`. | An anonymous caller can submit this form an unlimited number of times per second: a spam/PII-table-flooding vector with zero mitigation anywhere in the request pipeline. This is a platform-wide gap (every route is unthrottled), but it matters most acutely on the one route that requires no authentication at all. | Install `@nestjs/throttler`, apply globally or at minimum to `POST /contact-messages`. | **P1** |
| `hardDeleteEligibleAt` cooldown gate | `Date \| null`, `assertHardDeletable()` throws unless set **and** passed | Correctly implements a genuinely different (and more conservative) HardDelete safeguard than the standard `revisions`-existence check, specifically because this collection is List-A-not-List-B and could never be protected by that check — this directly closes the pre-code audit's C3 finding ("the one entity the audit brief calls out as most PII-sensitive is the one entity for which the standard check can never trigger"). Verified correctly designed. | — | OK (closed) |
| `assignedToId`/`assignedToType` | Poly `ObjectId`/`String enum ['User','Role']`, no `ref:` (correct for a discriminated poly field) | No index on `{status: 1}` alone (only the compound `{status:1, createdAt:-1}` exists) or on `{assignedToId: 1}` for "my assigned messages." | `{assignedToId: 1, status: 1}` | P3 |

**`contactMessages` production-readiness: 76/100 — Needs Improvement.** The schema and HardDelete design are genuinely strong; the score is dragged down entirely by the DTO/pipeline-level gaps on the platform's single riskiest (only-unauthenticated) input surface — which is exactly why those gaps matter more here than the same absence would on any RBAC-gated route.

---

## 4. Missing Fields

| Field → Why needed | Collection | Type | Required/Optional | Risk if absent |
|---|---|---|---|---|
| `status` (Active/Suspended/Banned or similar) for Guest (no-profile) persons | `athletes`, `officials` | `String, enum` | Optional (default `Active`) | A Guest athlete/official involved in a disciplinary matter (doping, misconduct at a UAEAF-hosted event) has no field anywhere that can record it — see §3.3. **Needs Business Decision**, not silently added. |
| `select: false` on `AuthMethod.passwordHash` | `users` (embedded `AuthMethod`) | schema option, not a new field | N/A | Defense-in-depth only — no active leak observed, but no structural guard exists either. Technical recommendation. |
| Partial-filter scoping (`archivedAt: null`) on every existing unique index | All 13 collections listed in §9.2 | Index option, not a field | N/A | Soft-deleted records permanently block reuse of their unique values. Technical recommendation, see §9.2 for the full list. |
| `registrationNumber` uniqueness | `clubs`, `coaches` | Index, field already exists | N/A | Duplicate official registration numbers are currently accepted silently. Confirmed requirement — this is not a new field, it is closing a gap against the codebase's own already-established pattern. |

No other missing-field candidates met the bar of "justified by this project's actual requirements or an identified gap" rather than "common elsewhere" — per Decision Rule #4, nothing else is proposed.

---

## 5. Validation Findings

- **Conditional/cross-field validation is consistently and correctly pushed to the service layer** where Mongoose genuinely cannot express it (`HeroSlidesService`'s IMAGE-xor-VIDEO rule, `PageSectionsService`'s `visibleFrom`/`visibleUntil` ordering, `FederationAppointmentsService`'s explicit-succession logic) — this is the right architectural choice and was verified against the schema-level comments describing each, consistent with the project's own Code Simplicity Standard (§7.1 of `BE-PLAN-010`, "no generic validation framework").
- **`@MaxLength()` is inconsistently applied across DTOs.** Only `CreateContactMessageDto` was read in full this session, and it has none on any free-text field. Given this is the single most exposed endpoint in the platform, this is flagged as P1 (§3.7); whether the same gap exists on RBAC-gated DTOs was not exhaustively checked in this pass (would require reading all ~62 `create-*.dto.ts` files, out of this session's read budget) — **Unknown — Needs Follow-up** for the rest of the DTO surface, not asserted as clean or broken.
- **Every embedded "contact info" sub-object (`GuardianContact`, `RestrictedProfileInfo`, `PersonnelPublicContact`/`PersonnelInternalContact`) allows all-null contents** while the wrapper field itself is `required`. Low priority (P3) — the presence check without a content check is a narrow gap, not a functional defect.
- **`Mixed`/`Record<string, unknown>` usage is narrow and justified** everywhere it appears (`auditLogs.previousValue`/`newValue`, `revisions.snapshotData`, `pageSections.filters`/`configuration`) — each is a genuinely variable-shape field with no fixed schema to enforce, not a shortcut around real structure. No instance of `Mixed` being used where a real, enumerable shape was available and simply not modeled.

---

## 6. Security Findings

### 6.1 PII/Sensitivity classification

Re-verified against the current code (not assumed from the pre-code audit): every field the pre-code audit tagged `[RESTRICTED]`/`[SENSITIVE-MINOR]` is structurally excluded from the corresponding public response via a **distinct DTO class**, never a conditionally-serialized field on the main entity — confirmed for `athletes.dateOfBirth` (`AthletePublicResponseDto`), `athleteProfiles.restricted` (`AthleteProfilePublicResponseDto`), `federationPersonnel.internalContact` (`FederationPersonnelPublicResponseDto`, referenced in code comments), and `siteSettings`' six restricted fields (`SiteSettingsPublicResponseDto`, independently confirmed via the e2e test asserting their absence). This is a consistently well-executed pattern across the whole codebase. **PASS.**

### 6.2 RBAC coverage

`permissions.resourceType` remains a free `String`, not a closed enum — every collection can be gated. `PermissionsGuard` reads a JWT-cached `(resourceType, action)` set rather than querying per-request, a documented and reasoned performance/staleness tradeoff bounded by the confirmed 15-minute access-token TTL. **PASS**, consistent with the pre-code audit's own C2 verdict.

### 6.3 HardDelete exposure

The `revisions`-existence gate (`RevisionsService.assertHardDeletable()`) is real and correctly implemented — confirmed by direct code read, not just comment. `contactMessages`' independent `hardDeleteEligibleAt` cooldown gate correctly closes the specific gap the pre-code audit identified (a workflow-List-A-not-B entity structurally cannot rely on the standard check). **This audit did not verify** whether every one of the other 7 workflow-governed collections' `assertHardDeletable()` is actually wired into its controller's DELETE route (only `committees`' unit test was read; the controller-level wiring for the remaining 6 was not independently re-executed) — **Unknown — Needs Follow-up**, not asserted as complete.

### 6.4 Anonymous/unauthenticated input surfaces

`contactMessages` remains the only collection accepting writes with no `request.user` — confirmed still true (`AuditLogInterceptor.record()`'s early return on missing `user` is the same mechanism, and `CreateContactMessageDto` was independently confirmed to accept none of the operational/server-set fields). See §3.7 for the concrete, unresolved gaps on this specific surface (payload length, rate limiting).

### 6.5 Cascade/orphan risk — still the single largest unresolved item from the pre-code audit

The pre-code audit's C6 finding (`users` and `mediaAssets` as undocumented, schema-wide cascade-risk hubs) was **not addressed by anything found in this session's review**, and if anything is now larger in absolute surface area: `users` is referenced by `createdBy`/`updatedBy`/`archivedBy` on all 62 collections built so far (up from an unspecified subset at the time of the original finding), plus hard-reference fields (`workflowSteps.assigneeIds`, `notifications.recipientId`, `federationAppointments.personId`'s own chain via `federationPersonnel`, `contactMessages.repliedBy`/`assignedToId`, `revisions.createdBy`, and more). No cascade rule, orphan-prevention check, or reference-integrity guard was found anywhere in the schema layer for either `users` or `mediaAssets` deletion. This remains **Needs Business Decision** (what should happen to `athleteProfiles.photoId` when the referenced `mediaAssets` row is hard-deleted? What happens to every `createdBy` pointer when a `users` row is hard-deleted?) — not silently resolved, and not newly discovered, but re-confirmed as still open against the current, larger codebase.

### 6.6 Audit trail robustness — see §3.2 `auditLogs` for the full finding

Summarized here for the Security section's sake: (1) repository-level mutability gap (P0), (2) `entityType` casing mismatch against the workflow subsystem (P1), (3) silent-drop on unresolvable `entityId` (P2), (4) zero indexes on the collection's own two named query patterns (P1). RBAC-change auditing itself (writes to `users.roleIds`/`roles.permissionIds`/`permissions`) does flow through the same global `AuditLogInterceptor` as every other mutation — confirmed structurally true by reading the interceptor's registration (`APP_INTERCEPTOR` in `app.module.ts`, applies platform-wide with no collection-specific exclusion), closing the pre-code audit's C7 "unverifiable from the schema" finding, though whether every RBAC-changing route actually satisfies the interceptor's `:id`-or-response-`_id` requirement was not individually re-checked for `roles`/`permissions`/`users` update routes specifically.

### 6.7 Platform-wide hardening gaps (not schema-specific, but directly bear on how safely these schemas are exposed)

Confirmed by direct inspection of `main.ts` and `package.json`:

| Control | State | Risk | Priority |
|---|---|---|---|
| CORS | Not configured — no `app.enableCors()` call anywhere in `main.ts` | Either intentional (reverse-proxied same-origin deployment) or an oversight; not determinable from this codebase alone. | Unknown — Needs Follow-up (confirm deployment topology) |
| Global exception filter | Not registered — no `APP_FILTER` provider anywhere, `common/filters/http-exception.filter.ts` referenced in the project's own folder-structure convention doc but not found registered in `app.module.ts` | Unhandled exceptions fall through to Nest's default handler, which is reasonably safe by default in production mode but gives the team no control over what shape/detail an error response carries. | P2 |
| Rate limiting | No `@nestjs/throttler` or equivalent installed anywhere in the dependency tree | Platform-wide gap; most acute on `POST /contact-messages` (§3.7), but also means the RBAC-gated login endpoint (`POST /auth/login`) has no request-rate defense beyond the existing account-level lockout (which is a different, complementary control — it doesn't stop distributed username-enumeration/credential-stuffing traffic). | **P1** |
| Request body size limit | Not explicitly configured in `main.ts` (relies on Express/`body-parser` defaults, not independently confirmed) | Combined with the missing `@MaxLength()` on `contactMessages` (§3.7), this is the weaker of two overlapping controls, both currently absent. | P2 |
| `Mongoose.set('autoIndex', ...)` | Not set — `database.module.ts` passes only `uri` to `MongooseModule.forRootAsync`, so Mongoose's default `autoIndex: true` applies in every environment including a hypothetical production deploy | Index builds running automatically on every app boot is a standard development convenience but a recognized production anti-pattern (index builds can lock collections/cause load spikes on deploy). | P3 (only matters once this app actually deploys against a production-scale dataset) |

---

## 7. Index Findings

**Systemic finding, stated once here rather than repeated 40 times above:** across all 62 collections, exactly **10** carry an explicit `.index()` call (`albums`, `workflowPolicies`, `heroSlides`, `workflowInstances`, `contactMessages`, `documents`, `videos`, `pageSections`, `publications`, `revisions` — confirmed by a direct `grep -rn '\.index\('` across `src/`, not sampled). Every other collection relies solely on the implicit `_id` index plus whatever `unique: true` a handful of `@Prop`s declare. The project's own architecture document (`docs/product/06-Database-Architecture.md` §11) names roughly 30 specific compound/standard indexes as required by named query patterns; the large majority of those are not yet implemented in code. This is not a design disagreement — the query patterns the indexes would serve are already true today (listing pages, "current club" lookups, notification centers, per-person history), they are simply not yet backed by an index. Consolidated list (collections/patterns not already itemized individually in §3):

| Collection | Missing index | Query pattern it serves | Priority |
|---|---|---|---|
| `auditLogs` | `{entityType:1, entityId:1, timestamp:-1}`, `{actorId:1, timestamp:-1}` | Per-record and per-actor audit trail | **P1** |
| `notifications` | `{recipientId:1, readState:1, timestamp:-1}` | Notification Centre | **P1** |
| `athletes` | `{nationalityId:1}`, `{disciplineIds:1}`, `{residencyType:1}` | Athletes Directory filters | P2 |
| `officials` | Same three, mirrored | Officials Directory filters | P2 |
| `athleteClubHistory`/`coachClubHistory`/`officialClubHistory` | `{<personId>:1, startDate:-1}` (compound), plus a way to fast-locate the one `endDate:null` row per person | "Current club" lookup — the exact query `create()`/`endCurrent()` runs on every write | P2 |
| `athleteCoachHistory`/`athleteNationalTeamHistory` | `{athleteId:1, endDate:1}` | "Current coach"/"currently on national team" lookup | P2 |
| `federationAppointments` | `{personId:1, termStart:-1}`, `{roleType:1, status:1}`, `{committeeId:1, roleType:1, status:1}` | Appointment history; "current holder of this role/committee seat" | P2 |
| `mediaAssets` | `{albumId:1}` | "Photos in this album" | P2 |
| `workflowSteps` | `{workflowDefinitionId:1, sequenceOrder:1}` | Ordered step list for a definition | P2 |
| `workflowActionHistory` | `{workflowInstanceId:1, actionDate:1}` | Instance action trail | P2 |
| `navigationItems` | `{menuId:1, displayOrder:1}` | Ordered menu rendering | P2 |
| `clubs`/`coaches`/`officials`/`disciplines`/`albums`/`athleteProfiles`/`officialProfiles`/`navigationMenus`/`pages`/`users` — every `unique: true` index in the codebase | Partial-filter `{archivedAt: null}` scoping | Prevents a soft-deleted document from permanently squatting a unique value | **P1, cross-schema — see §9.2** |

No index is recommended for the true single-document singletons (`federation`, `siteSettings`, and the 10 hero-wrapper `*Page` collections) — a single-document collection has nothing for an index to differentiate. No index is recommended speculatively "because a field might be filtered on someday" anywhere in this list — every entry above ties to a named, already-real query pattern from either this codebase's own service-layer code or the project's own architecture document.

---

## 8. Production-Readiness Scores

| Collection | Score | Band |
|---|---|---|
| `revisions` | 94 | Production Ready |
| `publications` | 90 | Production Ready |
| `workflowPolicies` | 90 | Production Ready |
| The 10 hero-wrapper `*Page` singletons (avg) | 90 | Production Ready |
| `governanceDocuments` | 88 | Minor Hardening |
| `athleteProfiles` / `officialProfiles` | 88 | Minor Hardening |
| `documents` | 87 | Minor Hardening |
| `workflowInstances` | 87 | Minor Hardening |
| Federation Domain 1 group (`federation`, `electionCycles`, `federationPersonnel`, `committees`, `organizationalStructure`, the 4 workflow-governed `*Page` collections) (avg) | 85 | Minor Hardening |
| `countries` / `ageCategories` / `disciplines` | 88 | Minor Hardening |
| `venues` | 86 | Minor Hardening |
| `albums` | 89 | Minor Hardening |
| `videos` | 83 | Minor Hardening |
| `mediaAssets` | 80 | Minor Hardening |
| `athletes` / `officials` | 82 | Minor Hardening |
| `athleteClubHistory` / `coachClubHistory` / `officialClubHistory` / `athleteCoachHistory` / `athleteNationalTeamHistory` (avg) | 82 | Minor Hardening |
| `athleteGuardianRelationships` / `clubTeams` / `officialAssignments` (avg) | 83 | Minor Hardening |
| `siteSettings` | 84 | Minor Hardening |
| `pageSections` | 79 | Needs Improvement |
| `navigationMenus` / `navigationItems` / `pages` | 84 | Minor Hardening |
| `users` | 79 | Needs Improvement |
| `roles` | 87 | Minor Hardening |
| `permissions` | 85 | Minor Hardening |
| `notifications` | 76 | Needs Improvement |
| `workflowSteps` / `workflowActionHistory` | 80 | Needs Improvement |
| `workflowDefinitions` | 85 | Minor Hardening |
| `clubs` | 79 | Needs Improvement |
| `coaches` | 80 | Needs Improvement |
| `contactMessages` | 76 | Needs Improvement |
| `auditLogs` | **58** | **Significant Work** |

**Overall average across all 62 collections: ~84/100.** The distribution is tight — this is a codebase where almost everything clusters in "Minor Hardening," with `auditLogs` as the one clear outlier pulling the average down, and `clubs`/`coaches`/`contactMessages`/`notifications`/`users`/`pageSections`/`workflowSteps`/`workflowActionHistory` forming a "Needs Improvement" tier driven almost entirely by the two systemic gaps (indexing, partial-unique-indexes) plus each collection's own one or two specific findings above.

---

## 9. Cross-Schema Findings

### 9.1 Naming and pattern consistency — mostly resolved since the pre-code audit

The pre-code audit's A3 finding (five different "who authored this" field names, plus `coaches`/`federationPersonnel.nationality` as plain strings) is **substantially closed**: both nationality fields now correctly `ref → countries` (verified in code, §3.3/§3.5). The "who authored this" naming spread doesn't currently reproduce inside the 62 implemented collections — the collections that originally exhibited it (`articles`, `externalMediaCoverage`, `staticPages`) are Domain 4 collections not yet built. This finding should be **carried forward as a standard to apply consistently once Domain 4 is built**, not treated as resolved forever — it was a naming problem in not-yet-written code, not a problem that was fixed.

### 9.2 Systemic: unique indexes are not scoped to `archivedAt: null`

Every `unique: true` index found in this codebase is a plain, full-collection unique index. None is a partial index scoped to active (non-archived) documents. Given the platform's universal soft-delete convention (`archivedAt`/`archivedBy` on every `BaseSchema`-extending collection), this means: **once any of the following fields' owning document is archived, that value can never be reused by a new document, ever** — including a legitimate re-creation after correcting a data-entry mistake, or (for `users.email`) a former staff member's email being reassigned to their successor.

Affected fields (confirmed by direct inspection, not sampled): `users.email`, `clubs.slug`, `coaches.slug`, `disciplines.slug`, `athleteProfiles.slug`/`.registrationNumber`/`.athleteId`, `officialProfiles.slug`/`.registrationNumber`/`.officialId`, `albums.slug`, `pages.slug`, `navigationMenus.key`.

**Recommendation:** convert each to a partial unique index (`partialFilterExpression: { archivedAt: null }`). This is a single, mechanically-repeatable fix applied identically across every affected field — not 13 separate design decisions.

### 9.3 Systemic: sparse indexing relative to documented query patterns

See §7 in full. Restated here only as a cross-schema pattern: this is not isolated to one or two collections — it is the single most common finding in this entire audit, appearing against roughly two-thirds of all reviewed collections.

### 9.4 `auditLogs.entityType` vs. workflow-subsystem `entityType` casing mismatch

The single highest-value new finding in this audit (§3.2) — confirmed concretely, not inferred, by comparing 62 live `@Controller()` route decorators (kebab-case) against the camelCase `entityType` values used by `workflowInstances`/`revisions`/`publications`/`workflowPolicies`. Any future feature that needs to correlate a record's approval history with its audit history cannot do so on `entityType` alone today.

### 9.5 `registrationNumber` uniqueness inconsistency

`athleteProfiles`/`officialProfiles.registrationNumber` are `unique: true`; `clubs`/`coaches.registrationNumber` are not, despite being the exact same "official issuing-authority number" concept the project itself has twice now (in two separate corrections) decided needs a uniqueness guarantee. See §3.3.

### 9.6 Prior audit reconciliation — what `09-Integrity-Completeness-Security-Audit.md` (2026-09-02, FigJam-only, pre-code) found vs. what this session confirms in the actual implementation

| Prior finding | Status today | Evidence |
|---|---|---|
| #1 — 4 phantom collections (`athleteProfiles`, `athleteCoachHistory`, `athleteNationalTeamHistory`, `officialProfiles`) not represented anywhere | **RESOLVED** | All four exist as real, built collections (§2 checklist rows 18-19, 26-27) |
| #2 — `athletes`/`officials` have no `slug` field | **RESOLVED — via a different, deliberate design than the one recommended.** The pre-code audit's own suggested fix ("add `slug` to `athletes`/`officials`") was explicitly superseded by the 2026-09-03 correction: `slug` was instead added to `athleteProfiles`/`officialProfiles` and *removed* from `athletes`/`officials` entirely, making the Profile collections the sole public routing identifier (Guest persons intentionally have no individual public page). A different resolution than originally suggested, arrived at deliberately, not a gap. | §3.3 |
| #3 — `users`/`mediaAssets` undocumented cascade-risk hubs | **STILL OPEN**, and the surface area has grown since the finding was first written (more collections now reference both). | §6.5 |
| #4 — 3 FigJam bounding-box layout overlaps | Out of scope for a code audit (a Figma-file-level defect, not a schema defect) — not re-evaluated here. | N/A |
| #5 — `contactMessages` structurally exempt from the standard HardDelete safety-check | **RESOLVED** — the collection now has its own, purpose-built `hardDeleteEligibleAt` cooldown gate, a stronger control than the one it's exempt from, not merely a workaround. | §3.7 |
| #6 — RBAC-change auditing unverifiable from the schema | **RESOLVED, structurally** — `AuditLogInterceptor` is a global `APP_INTERCEPTOR` with no per-collection exclusion, confirmed by direct code read. | §6.6 |
| #7 — 5 different "author" field names; `coaches`/`federationPersonnel.nationality` plain strings | **Nationality half RESOLVED**; naming-spread half not yet reproduced because the collections that exhibited it aren't built yet — see §9.1. | §9.1 |
| #8 — `clubs.introVideoId` refs the wrong (images-only) collection | **RESOLVED** — now correctly refs `Video`. | §3.3 |
| #9 — `federation`'s tracking fields uniquely `Date`+`[PUBLIC]` instead of `DateTime`+`[RESTRICTED]` | **RESOLVED, via standardization** — `federation` now extends `BaseSchema` exactly like every other collection (`DateTime` via Mongoose `timestamps`, same `createdBy`/`updatedBy`/`archivedAt`/`archivedBy` shape), rather than keeping the board's original special-cased fields. Self-documented as a deliberate choice, not a silent override. | §3.5 |
| #10 — `roles` has no protection against renaming/deleting a system-critical role | **RESOLVED** — `isSystemRole` implemented and enforced. | §3.1 |

**8 of 10 prior findings closed, 1 still genuinely open (#3, cascade/orphan risk — a real, unresolved business+engineering question), 1 out of scope for a code-only audit (#4).** This is a strong track record for a team executing against its own prior audit without this session's involvement in between.

---

## 10. Priority Roadmap

**P0 (fix before this collection can be trusted as tamper-evident):**
1. `AuditLogsRepository` — stop extending `BaseRepository`; expose only `create()` + named reads, mirroring `RevisionsRepository` exactly. (§3.2)

**P1 (concrete, demonstrable, no business decision required):**
2. `auditLogs.entityType` — derive from the same camelCase collection-name source the workflow subsystem uses, not the raw kebab-case URL segment. (§3.2, §9.4)
3. `auditLogs` — add `{entityType:1, entityId:1, timestamp:-1}` and `{actorId:1, timestamp:-1}` indexes. (§3.2, §7)
4. `notifications` — add `{recipientId:1, readState:1, timestamp:-1}` index. (§3.2, §7)
5. `clubs.registrationNumber` / `coaches.registrationNumber` — add `unique: true, trim: true`. (§3.3, §9.5)
6. Every existing `unique: true` index — convert to a partial index scoped to `{archivedAt: null}`. (§9.2)
7. `users.email` — add `lowercase: true, trim: true`. (§3.1)
8. `contactMessages`'s DTO — add `@MaxLength()` to every free-text field; confirm a request body size limit exists. (§3.7)
9. Install `@nestjs/throttler` (or equivalent) and apply it at minimum to `POST /contact-messages` and `POST /auth/login`. (§3.7, §6.7)

**P2 (real, worth doing, lower urgency):**
10. `AuditLogInterceptor` — log at `warn` when a mutating request produces no resolvable `entityId`, instead of silently returning. (§3.2)
11. `AuthMethod.passwordHash` — add `select: false`. (§3.1)
12. `videos.tags[]` — apply the same trim/dedupe/cap treatment `albums.tags[]` already received. (§3.4)
13. Missing per-collection indexes listed individually in §3 and consolidated in §7 (`athletes`/`officials` filter fields, the five `*ClubHistory`/`*History` collections' "current row" lookups, `federationAppointments`, `mediaAssets.albumId`, `workflowSteps`, `workflowActionHistory`, `navigationItems`).
14. Register a global exception filter (`APP_FILTER`) rather than relying on Nest's default handler. (§6.7)

**P3 (low priority / accept-as-designed unless a concrete problem is later measured):**
15. `Mongoose.set('autoIndex', false)` in non-development environments once this app has a real production deploy target. (§6.7)
16. At-least-one-field validation on the various optional-inner-fields "contact info" sub-objects. (§5)
17. `{resourceType:1, action:1}` unique compound index on `permissions`, once an admin permission-management UI exists to make double-seeding a practical risk.

**OUT OF SCOPE for this audit:** Domain 3 (championships/results/records), Domain 4 (`articles`/`externalMediaCoverage`), Domain 9 (Sponsorship) — none exist in code.

**Needs Business Decision (not engineering items):**
- Should Guest (no-Profile) athletes/officials have an independent status/suspension mechanism? (§3.3, §4)
- What is the intended orphan/cascade policy when a `users` or `mediaAssets` row is hard-deleted? (§6.5)
- Should `users.actorId`-equivalent auditing ever represent an anonymous actor, or is "anonymous mutations are unaudited by design" the permanent, accepted answer? (§3.2)

---

## 11. Proposed Change Plan

Per Decision Rule #10, **nothing below is authorized for implementation.** Each entry uses the required template.

```
Schema: auditLogs (repository layer)
Current: AuditLogsRepository extends BaseRepository<AuditLogDocument>, inheriting public updateById()/softDelete().
Recommended: AuditLogsRepository stands alone (no BaseRepository extension), exposing only create() + named read methods — mirror RevisionsRepository exactly.
Reason: The audit trail's tamper-resistance is a stated platform requirement; it is currently enforced only by convention (no caller happens to invoke the inherited methods), not structurally.
Fields to modify: none (repository class, not schema)
Fields to add: none
Fields to remove: none
Indexes: none
Validation: none
Security: closes the P0 finding in §3.2/§10
Migration impact: none — removes capability, does not change stored data or API surface
Breaking change (Y/N): N
Risk: None — the removed methods are not called anywhere today (confirmed via AuditLogsService, which only calls create())
Priority: P0
```

```
Schema: auditLogs (entityType derivation, AuditLogInterceptor)
Current: entityType = request.url.split('/').filter(Boolean)[0] — raw kebab-case URL segment.
Recommended: Derive entityType from the same camelCase source WORKFLOW_ENTITY_TYPES/PUBLICATION_ENTITY_TYPES draw from (e.g. a shared kebab->camelCase constant map, or read the target Mongoose model's registered collection name off the matched route/controller).
Reason: auditLogs.entityType currently cannot be joined against revisions/publications/workflowInstances/workflowPolicies.entityType for any multi-word collection, breaking the "full record history" use case named in the project's own architecture doc.
Fields to modify: entityType (no schema type change — remains String — only the derivation logic changes)
Fields to add: none
Fields to remove: none
Indexes: none
Validation: none
Security: data-integrity/correctness, not a vulnerability
Migration impact: existing auditLogs rows retain their old kebab-case entityType values; a backfill/migration would be needed to normalize historical rows if cross-referencing them matters
Breaking change (Y/N): N for new writes; existing historical rows stay inconsistent unless separately migrated
Risk: Low — interceptor-only change
Priority: P1
```

```
Schema: auditLogs, notifications
Current: No indexes beyond the implicit _id index.
Recommended: auditLogs: {entityType:1, entityId:1, timestamp:-1}, {actorId:1, timestamp:-1}. notifications: {recipientId:1, readState:1, timestamp:-1}.
Reason: Both collections' own primary, named query patterns are currently full collection scans.
Fields to modify: none
Fields to add: none
Fields to remove: none
Indexes: as above
Validation: none
Security: none
Migration impact: index builds only; safe online operation at current data volume
Breaking change (Y/N): N
Risk: Low
Priority: P1
```

```
Schema: clubs, coaches
Current: registrationNumber: String, required — no unique index.
Recommended: registrationNumber: String, required, unique: true, trim: true (partial, scoped per the next entry).
Reason: athleteProfiles/officialProfiles.registrationNumber already carry this exact constraint for the same "official issuing-authority number" concept; clubs/coaches were never given the equivalent treatment.
Fields to modify: registrationNumber (add unique + trim)
Fields to add: none
Fields to remove: none
Indexes: {registrationNumber:1} unique (partial)
Validation: duplicate-key (E11000) should be caught and re-thrown as ConflictException via the existing shared mongo-errors.util.ts, matching the pattern already used on athleteProfiles/officialProfiles/albums
Security: administrative-integrity, not a vulnerability
Migration impact: requires confirming no existing duplicate registrationNumber values exist in the current dataset before the index can be created
Breaking change (Y/N): N for the API surface; Y for any existing duplicate data, which the migration must surface rather than silently fail on
Risk: Medium — index creation will fail outright if duplicate data already exists; must be checked first
Priority: P1
```

```
Schema: users, clubs, coaches, disciplines, athleteProfiles, officialProfiles, albums, pages, navigationMenus (every unique: true field)
Current: Full-collection unique index (not partial).
Recommended: partialFilterExpression: { archivedAt: null } added to every unique index in the codebase.
Reason: A soft-deleted document's unique value (email/slug/registrationNumber/key) is currently unusable forever, including by a legitimate corrected re-creation.
Fields to modify: none (index option only)
Fields to add: none
Fields to remove: none
Indexes: convert each existing unique:true index to a partial unique index
Validation: none
Security: none
Migration impact: requires confirming no currently-archived + currently-active document pair already collides on the same value before the partial index can be built
Breaking change (Y/N): N
Risk: Low-medium, same pre-check caveat as the entry above
Priority: P1, cross-schema
```

```
Schema: contactMessages (DTO layer, not the schema itself)
Current: CreateContactMessageDto has no @MaxLength() on senderName/senderPhone/messageBody.
Recommended: Add @MaxLength() to each (suggested: senderName 200, senderPhone 30, messageBody 5000) and confirm main.ts sets an explicit request body size limit.
Reason: This is the platform's only unauthenticated write route; unbounded free-text input from an anonymous caller is a storage-bloat and abuse vector.
Fields to modify: none (schema unaffected; DTO validation only)
Fields to add: none
Fields to remove: none
Indexes: none
Validation: as above
Security: closes a concrete gap on the platform's single riskiest input surface
Migration impact: none
Breaking change (Y/N): N (a legitimate submission under any of these limits is unaffected)
Risk: None
Priority: P1
```

```
Schema: (platform-wide, not a single schema)
Current: No @nestjs/throttler or equivalent installed; no rate limiting anywhere.
Recommended: Install @nestjs/throttler, apply globally with a generous default and a tighter override on POST /contact-messages and POST /auth/login.
Reason: The only unauthenticated write route and the login route both currently have zero request-rate defense beyond the existing account-lockout mechanism (which is a different, complementary control, not a substitute).
Fields to modify: none
Fields to add: none
Fields to remove: none
Indexes: none
Validation: none
Security: closes a platform-wide gap, most acute on two specific routes
Migration impact: new dependency; no data migration
Breaking change (Y/N): N for legitimate traffic at any reasonable threshold
Risk: Low
Priority: P1
```

Remaining P2/P3 items (§10, items 10-17) each follow the identical template shape — omitted here for length; available on request in the same format.

---

## 12. Final Note

*No files, schemas, or Figma nodes were modified. Awaiting your review and go-ahead before implementing any item above.*

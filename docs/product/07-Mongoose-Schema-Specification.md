# UAEAF — Mongoose Schema Specification

**Status:** DRAFT — all 11 domains complete, pending review
**Purpose:** Implementation-level field specification for every collection in the Phase 2.2 Physical Model (69 collections, 11 domains — was 70; see Domain 1 sync note below). This is the direct working reference for writing `.schema.ts` files — each table below should require no further lookup elsewhere to generate its schema.
**Governing source:** FigJam Physical Model (Phase 1.1, section 03), as extended through Phase 2.2. Visibility tags (Public/Restricted/Sensitive-Minor) are carried over as-is from Phase 2.2, not re-derived here.
**Not covered here:** Actual `.schema.ts` files, NestJS module scaffolding, DTOs, controllers — this document is audit/specification only, per explicit scope.

## Conventions used throughout this document

- **ObjectId refs** are written `mongoose.Schema.Types.ObjectId` with a `ref:` target.
- **Bilingual fields** (`{en,ar}` in the diagram) are modeled as a sub-schema `{ en: String, ar: String }`, each with its own validators.
- **Populate strategy** — "default" means the API layer populates this ref on every fetch of the parent document; "on-demand" means the raw ObjectId is returned and the client/consumer requests the target explicitly (reserved for hot list/query paths per the DB doc's §10 access-pattern philosophy, and for refs whose target is rarely needed alongside the parent).
- **Index cross-reference** — checked against `docs/product/06-Database-Architecture.md` §11 (Index Strategy). That section predates Phase 1.1–2.2 and is stale in places (renamed collections, a moved field); staleness is flagged per-field where it occurs, not silently corrected in that document (out of scope for this pass).
- Every collection's `_id` row is included for completeness but is standard Mongoose (`ObjectId`, auto-generated, auto-indexed) and not elaborated per-field beyond that.

---

## Cross-Domain Open Items (not resolved in this pass — collected here for visibility)

None of these block generating `.schema.ts` files for the fields that exist today; they're either business decisions or genuine structural questions surfaced while cross-referencing, deliberately not guessed at.

| # | Item | Where it recurs | Status |
|---|---|---|---|
| 1 | Missing `slug` field despite Baseline §11 expecting a unique index for detail-page lookup | `championships` (Domain 3), `articles` (Domain 4), `staticPages` (Domain 4) — `pages` (Domain 11) does have one, resolving the pattern for composable CMS pages only | Open — recommend resolving all three together, not separately |
| 2 | `externalMediaCoverage.featured` vs. the Homepage spec's separate `homepage_visible` concept (§22) | Domain 4 | Open — carried from the Phase 2.1 audit, unreconciled |
| 3 | `mediaAssets`/`videos` use hardcoded single-target refs (`associatedChampionshipId`, `associatedAthleteId`) rather than the poly-pair pattern used elsewhere (`documents.ownerId`) | Domain 5 | Open — structural consistency note, not a missing-value gap |
| 4 | `departments.contact` is an unstructured `String` where a structured Object (phone/email/address) might be more consistent with `sponsors.restricted`/`athletes.restricted` | Domain 8 | Open — low priority |
| 5 | `records.category` requires a 4-hop traversal (`recordCandidateId → resultId → competitionStageId → eventId → disciplineId`) to reach `disciplineId` for the baseline §11 compound index — no direct field | Domain 3 | Open — denormalization candidate for query performance, not resolved |
| 6 | `results.attempts` sub-schema left as `Mixed` pending a confirmed per-discipline attempt shape (distance vs. time vs. foul-flag) | Domain 3 | Open — flagged as a follow-up, not guessed |
| 7 | `sports` collection — single- vs. multi-sport federation mandate still undecided (affects whether this collection is a necessary hop above `disciplines`) | Domain 3 | Open — carried from the Phase 2.1 audit |
| 8 | `sponsorships` target list excludes Department — explicitly confirmed as a business decision, not reopened here | Domain 9 | Closed as out-of-scope, not reopened |

---

## Domain 1 — Federation & Governance (12 collections)

**Sync note (2026-08-26):** the FigJam Physical Model was directly edited (not by this document's process) to implement the `federationPersonnel`/`federationAppointments` restructuring. This section was re-synced field-by-field from the live FigJam state, not assumed from prior passes. Net effect: `presidentialTerms`, `boardMembers`, `boardMemberTerms` removed (3); `federationPersonnel`, `federationAppointments` added (2) — 13 → 12 collections in this domain, 70 → 69 collection-wide. `committees.chairId` removed, `electionCycles` trimmed to institutional-archive fields only, `presidentMessage` re-linked to `federationAppointments`. `federation`, `organizationalStructure` (aside from one cross-reference below), `visionMission`, `strategicPlans`, `governanceDocuments`, `generalAssemblyMeetings`, `aboutFederation` are unaffected by this sync.

### `federation` (singleton) — **Patched to v1, field-by-field business review, final**

Full field set replaces the original 3-field version (`_id`, `name`, `logoId`) shown in Domains 1–10's original pass. This patch is scoped to `federation` only — no other collection's fields changed. Rebuilding this table to 15 rows (1584px tall, the new tallest table in Domain 1) required shifting Domains 2–11 down by 768px to preserve the standard 100px domain gap — a position-only layout adjustment, zero content changes to any other collection.

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each, `trim: true` — full official name | None — singleton, never queried by name | Public |
| `shortName` | `{ en: String, ar: String }` | `false` | `null` each | `maxlength: 100` each | None | Public |
| `acronym` | String | `false` | `null` | `maxlength: 20` — e.g. `"UAEAF"` | None | Public |
| `logoId` | ObjectId, ref `MediaAsset` | `true` | none | must resolve to an existing `mediaAssets` doc (app-layer check) | None — singleton | Public |
| `contact` | Sub-schema (embedded) | `false` | `{}` | `{ email: { type: String, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }, phone: { type: String, match: /^\+?[0-9\s-]{7,20}$/ }, fax: String, address: { country: String, emirate: String, city: String, area: String, street: String, building: String, poBox: String, postalCode: String } }` — every sub-field optional | None | **Restricted** — matches Chapter 17 §1's literal example ("Contact information") exactly |
| `digitalPresence` | Sub-schema (embedded) | `false` | `{}` | `{ website: { type: String, match: /^https?:\/\/.+/ }, socialLinks: [{ platform: String, url: String }] }` — `socialLinks` sub-docs keep their default `_id` (unlike `achievements[]`'s `_id:false`), since individual links are plausibly added/removed via an admin form and benefit from a stable per-entry key; `platform` deliberately left as free `String`, not an enum, per the explicit "flexible array, not fixed fields per platform" instruction — validated against known icon keys at the app layer only, not the schema | None | Public |
| `registrationNumber` | String | `false` | `null` | no format constraint — federation may not have this documented yet | None — singleton, no uniqueness to enforce | **Public — corrected from the proposed Restricted** (see note below) |
| `registrationAuthority` | String | `false` | `null` | no cross-field dependency on `registrationNumber` enforced at schema level, per explicit instruction | None | **Public — corrected from the proposed Restricted** (see note below) |
| `status` | String, enum | `false` | `'active'` | `['active', 'archived']` — **precautionary field, not currently tied to any active business logic** (explicit, non-negotiable per the instruction — do not wire this into workflow/access logic later without a fresh decision) | None — singleton | **Public — corrected from the proposed Restricted** (see note below) |
| `createdAt` | Date | auto | auto | Mongoose `timestamps: true` | None | **Public — corrected from the proposed Restricted** (see note below) |
| `updatedAt` | Date | auto | auto | Mongoose `timestamps: true` | None | **Public — corrected from the proposed Restricted** (see note below) |
| `createdBy` | ObjectId, ref `User` | `false` | `null` | lightweight per-model tracking, complementary to (not a replacement for) `auditLogs` | None | **Public — corrected from the proposed Restricted** (see note below) |
| `updatedBy` | ObjectId, ref `User` | `false` | `null` | updated on every write (app-layer, not a Mongoose hook specified here) | None | **Public — corrected from the proposed Restricted** (see note below) |

**Visibility correction, explained:** the task proposed Restricted for `registrationNumber`/`registrationAuthority`, `status`, and the four metadata fields. I applied Public to all six instead, and flagged rather than silently complied, because:
- **`registrationNumber`/`registrationAuthority`** — Chapter 17 §1's tiers classify *personal* data (PDPL/minor-protection scope). A federation's own institutional registration number isn't personal data, carries none of the impersonation/fraud risk that made `athletes.registrationNumber` Restricted, and many peer federations publish this for legitimacy. Institutional ≠ personal.
- **`status`, `createdAt`/`updatedAt`, `createdBy`/`updatedBy`** — none of these hold personal data either, and tagging them Restricted would break the visibility convention applied consistently across all 69 other collections in this document: every equivalent operational status enum (`workflowInstances.status`, `contactMessages.status`, `boardMemberTerms.status`, `users.accountStatus`) and every equivalent actor-tracking ref (`authorUserId`, `enteredBy`, `publishedBy`, `uploadedBy`, `actorId`, `reviewedBy`) was tagged Public throughout, on the same reasoning — an internal/operational field with no PII content, even when it's not meant for public API exposure.
- **`contact`** was left exactly as proposed — Restricted is correct there, it's literally Chapter 17's own worked example.

**Singleton enforcement (implementation note, not a schema field):** no Mongoose-level singleton constraint exists. Recommend enforcing at the repository/service layer with a fixed well-known `_id` (e.g. `ObjectId("000000000000000000000001")`) and an upsert-only write path, rather than a collection-level unique constraint MongoDB doesn't natively offer for "at most one document."

**Explicitly excluded, per instruction (documented so it isn't re-added by mistake):**
- `establishmentDate`/`foundingDate` — lives in `aboutFederation.foundingDate` only, avoiding a duplicate source of truth for the same fact.
- No Workflow/Revision/Publication participation — `federation` is institutional truth, not editorial content; it does **not** appear in the Domain 7 closed entity-type list.
- No CMS/presentation fields (hero, homepage sections, about text) — those belong exclusively to Domain 11 and to `aboutFederation`/`presidentMessage`.

### `electionCycles` — **Synced from direct FigJam edit: 4 operational election-management fields removed (2026-08-26)**

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `federationId` | ObjectId, ref `Federation` | `true` | none | must resolve to the singleton federation doc | **False** — single distinct value across the whole collection (FK to a singleton), zero selectivity benefit | Public |
| `startDate` | Date | `true` | none | must be `<= endDate` when both present (app-layer/pre-save hook) | `{ startDate: 1 }` — chronological listing | Public |
| `endDate` | Date | `true` | none | must be `>= startDate` | Compound with `startDate` if both are queried together; single-field otherwise sufficient | Public |
| `cycleNumber` | Number | `true` | none | `min: 1`, sequential (1, 2, 3...) | `{ cycleNumber: 1 }` unique — singleton federation makes this effectively globally sequential | Public |
| `cycleName` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 100` each — e.g. `"الدورة 2024-2028"` | None | Public |
| `status` | String, enum | `true` | `'Planned'` | `['Planned', 'Active', 'Completed', 'Cancelled']` | `{ status: 1 }` — candidate, "current cycle" lookup | Public |

Populate strategy: `federationId` — on-demand (constant value, populating it on every fetch is pure waste).

**Removed (2026-08-26):** `nominationOpenDate`, `nominationCloseDate`, `votingDate`, `resultsAnnouncementDate` — operational election-management fields, out of scope for what `electionCycles` actually is: an institutional archive of which cycle produced which appointments, not an election-management system. If a future election-operations module is built, these belong there.

### `federationPersonnel` — **New (2026-08-26): reusable person identity, replaces the board-only identity fields formerly on `boardMembers`**

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `fullName` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each, `trim: true` | None — not a lookup key | Public |
| `photoId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `shortBio` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 300` each — card/listing-length summary | None | Public |
| `biography` | `{ en: String, ar: String }` | `false` | `''` each | no `maxlength` — embedded rich text, profile/detail-page length | None | Public |
| `nationality` | String | `false` | `null` | optional, free text | None | Public |
| `publicContact` | Object | `false` | `{}` | `{ email: String, phone: String }` — optional, official public-facing contact only | None | Public |
| `internalContact` | Object | `false` | `{}` | `{ personalEmail: String, idNumber: String }` — admin/dashboard only, never exposed publicly | None | **Restricted** — personal contact/identity data, per Chapter 17 §1 |
| `status` | String, enum | `true` | `'Active'` | `['Active', 'Inactive']` — whether this person still has any relationship to the federation at all, independent of any specific role's status | `{ status: 1 }` — candidate, "active personnel" filter | Public |

Populate strategy: `photoId` — default (photo is standard personnel-card content).

**Why this replaces `boardMembers`:** a single person can hold multiple roles over time (board member → committee chair → president), and the old model split identity across `boardMembers` (board-only) and a free-text `signatoryName` (president-only), with no shared identity record. `federationPersonnel` is the one reusable identity, referenced by every role via `federationAppointments.personId`.

### `federationAppointments` — **New (2026-08-26): append-only role/position history, replaces `presidentialTerms` and `boardMemberTerms` in full**

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `personId` | ObjectId, ref `FederationPersonnel` | `true` | none | — | `{ personId: 1, termStart: -1 }` compound — "this person's appointment history, latest first" | Public |
| `roleType` | String, enum | `true` | none | `['President', 'BoardMember', 'CommitteeChair', 'CommitteeMember', 'ExecutiveDirector', 'Manager', 'Other']` | `{ roleType: 1, status: 1 }` compound — "current holders of this role type" | Public |
| `positionTitle` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each — free text, e.g. `"نائب الرئيس"`, the specific title within the broader `roleType` | None | Public |
| `committeeId` | ObjectId, ref `Committee` | `false` | `null` | populated only for `CommitteeChair`/`CommitteeMember` roleTypes; app-layer validated, not schema-enforced | `{ committeeId: 1, roleType: 1, status: 1 }` compound — derives current committee chair, replacing `committees.chairId` | Public |
| `electionCycleId` | ObjectId, ref `ElectionCycle` | `false` | `null` | populated for `President` and `BoardMember` roleTypes only (both elected by the same cycle) | `{ electionCycleId: 1 }` | Public |
| `termStart` | Date | `true` | none | — | see compounds above | Public |
| `termEnd` | Date | `false` | `null` | `null` while ongoing; must be `>= termStart` once set | None | Public |
| `status` | String, enum | `true` | `'Active'` | `['Active', 'Completed', 'Resigned', 'Removed', 'Transitioned', 'Deceased']` — merges the two prior collections' enums; `'Transitioned'` now applies to any role change, not board-only | see compounds above | Public |
| `displayOrder` | Number | `true` | `0` | `min: 0` | `{ displayOrder: 1 }` — roster ordering within a role/committee | Public |

Populate strategy: `personId` — default (name/photo needed for essentially every appointment display); `committeeId`/`electionCycleId` — on-demand.

**Business rule (app-layer, not schema-enforced):** creating a new appointment for the same `roleType` + scope (same `committeeId` for committee roles, or globally for `President`) automatically closes the previous `Active` appointment for that scope (sets its `termEnd`) rather than requiring a manual closing step. Implement as a pre-save hook or service-layer transaction — do not leave this to client discipline.

**Replaces:** `presidentialTerms` and `boardMemberTerms` in full — both are removed, not kept as legacy/deprecated tables. `committees.chairId` is also removed (see below) for the same duplicate-source-of-truth reasoning that already rejected a `memberBoardMemberIds` array on `committees`.

### `committees` — **Synced from direct FigJam edit: `chairId` removed (2026-08-26)**

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `description` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 1000` each | None | Public |
| `displayOrder` | Number | `true` | `0` | `min: 0` | `{ displayOrder: 1 }` | Public |
| `isActive` | Boolean | `true` | `true` | — | Candidate — not in baseline §11, worth adding for "active committees" filter | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | Full list: `['Draft', 'Live', 'Archived']` — synced from `publications.status`, never written directly (ADR-0020) | `{ publicationState: 1 }` — public listing filter | Public |

**Removed (2026-08-26):** `chairId` — current chair is now derived by querying `federationAppointments` (`committeeId` + `roleType: 'CommitteeChair'` + `status: 'Active'`) rather than stored directly, avoiding a duplicate source of truth alongside the appointment history. See `federationAppointments` above.

### `organizationalStructure` — **Patched, `nodeType` added (2026-08-25)**

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `parentNodeId` | ObjectId, ref `OrganizationalStructure` (self) | `false` | `null` | must not equal own `_id`; cycle prevention is app-layer, not a Mongoose validator | `{ parentNodeId: 1 }` — "children of this node" tree traversal | Public |
| `departmentId` | ObjectId, ref `Department` | `false` | `null` | — | `{ departmentId: 1 }` | Public |
| `displayOrder` | Number | `true` | `0` | `min: 0` | Compound `{ parentNodeId: 1, displayOrder: 1 }` — ordered children under one node | Public |
| `nodeType` | String, enum | `true` | none | `['General Assembly', 'Board', 'Committee', 'Executive', 'Department']` — **nodes do NOT link directly to a `boardMemberId` or `committeeId`**: a node represents the structure's shape/level only, who occupies it is resolved via `federationAppointments`/`committees` when needed (updated 2026-08-26: was `boardMembers`, now removed), never stored on the node | None | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | Full list: `['Draft', 'Live', 'Archived']` — denorm ← `publications` (ADR-0020) | `{ publicationState: 1 }` | Public |

Populate strategy: `parentNodeId` — on-demand (tree traversal is typically breadth-first via `parentNodeId` queries, not eager population); `departmentId` — default.

### `visionMission` — **Patched, 2 embedded arrays added (2026-08-25)**

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `federationId` | ObjectId, ref `Federation` | `true` | none | — | **False** — singleton FK, zero selectivity | Public |
| `visionText` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 3000` each | None | Public |
| `missionText` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 3000` each | None | Public |
| `strategicGoals` | `[StrategicGoalSchema]` (embedded) | `false` | `[]` | Bounded, ~6 items expected: `{ title: { en: String, ar: String }, description: { en: String, ar: String }, displayOrder: Number }`, `_id: false` (display-only, mirrors `aboutFederation.achievements[]`) — deliberately no icon field | None | Public |
| `coreValues` | `[CoreValueSchema]` (embedded) | `false` | `[]` | Bounded, ~6 items expected: `{ title: { en: String, ar: String }, description: { en: String, ar: String }, iconKey: String, displayOrder: Number }`, `_id: false` — `iconKey` is a free string (e.g. a lucide-react icon name), **not** a `mediaAssets` ref, consistent with `federation.digitalPresence.socialLinks.platform` (icon resolved client-side, no uploaded asset stored) | None | Public |
| `revisionId` | ObjectId, ref `Revision` | `false` | `null` | — | None | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | Full list: `['Draft', 'Live', 'Archived']` — denorm ← `publications` (ADR-0020) | `{ publicationState: 1 }` | Public |

**Why `strategicGoals`/`coreValues` live inside `visionMission` rather than separate collections:** both are edited and published together with vision/mission as one editorial unit, with no independent revision/publication lifecycle of their own — the same reasoning already established for `aboutFederation.achievements[]`.

### `strategicPlans` — **Patched, 9 fields added (2026-08-25) — Domain 1 review now complete for this model**

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `federationId` | ObjectId, ref `Federation` | `true` | none | — | **False** — singleton FK | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each | None | Public |
| `subtitle` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 300` each — hero description text | None | Public |
| `introHeading` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 150` each — e.g. `"خارطة طريق نحو المستقبل"` | None | Public |
| `introText` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 1000` each — intro paragraph | None | Public |
| `periodStart` | Date | `true` | none | — | `{ periodStart: -1 }` — "current/latest plan" listing | Public |
| `periodEnd` | Date | `true` | none | must be `> periodStart` | — | Public |
| `foundationPillars` | `[FoundationPillarSchema]` (embedded) | `false` | `[]` | Bounded, ~4 items expected (e.g. الأساس/التطوير/التنافسية/الأثر): `{ title: {en,ar}, description: {en,ar}, iconKey: String, displayOrder: Number }`, `_id: false` — `iconKey` resolved client-side (lucide-react style), not a `mediaAssets` ref, same pattern as `visionMission.coreValues` | None | Public |
| `strategicAxes` | `[StrategicAxisSchema]` (embedded) | `false` | `[]` | Bounded, ~6 items expected: `{ title: {en,ar}, description: {en,ar}, displayOrder: Number }`, `_id: false` — **no icon field**, deliberately distinct from `foundationPillars`: a separate, more detailed tier, confirmed not redundant | None | Public |
| `objectives` | `[ObjectiveSchema]` (embedded) | `false` | `[]` | Bounded, ~5 items expected: `{ title: {en,ar}, description: {en,ar}, displayOrder: Number }`, `_id: false` — **no color field**; accent color resolved client-side from `displayOrder` against a fixed palette, not stored | None | Public |
| `impactMetrics` | `[ImpactMetricSchema]` (embedded) | `false` | `[]` | Bounded, ~4 items expected: `{ value: String, label: {en,ar}, displayOrder: Number }`, `_id: false` — **intentional duplication:** one item's `value` deliberately duplicates `periodEnd`'s year (e.g. a "2030" horizon card), a deliberate client choice to keep all 4 KPI cards in one uniform array rather than special-casing one as computed-from-`periodEnd`. **Do not "fix" this as inconsistent data later.** | None | Public |
| `documentId` | ObjectId, ref `Document` | `false` | `null` | resolved `documents.file` now holds both EN/AR variants internally — see Domain 6 | None | Public |
| `documentVersion` | String | `false` | `null` | e.g. `"1.0"` — accompanies `documentId` | None | Public |
| `revisionId` | ObjectId, ref `Revision` | `false` | `null` | was missing despite `publicationState` usage — added for consistency with `visionMission`'s pattern | None | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | Full list: `['Draft', 'Live', 'Archived']` — denorm ← `publications` (ADR-0020) | `{ publicationState: 1 }` | Public |

**Explicitly not stored:** the "نحوّل الاستراتيجية إلى واقع" methodology diagram (Strategic Pillar → Objective → Initiative → Measurement → Impact) is a static design element explaining methodology, not data — no field exists for it, and none should be added.

### `governanceDocuments` — **Patched, `type` enum replaced + 2 fields added (2026-08-25) — Domain 1 review now complete for this model**

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each | None | Public |
| `description` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 300` each — short description shown under the document title on each card | None | Public |
| `type` | String, enum | `true` | none | **Replaced (2026-08-25):** was `['Bylaw', 'Policy', 'Regulation', 'AnnualReport', 'MeetingMinutes', 'Other']` (a flagged placeholder guess from the schema-readiness audit); now `['Regulation', 'Policy', 'Form', 'Guide', 'Decision']`, confirmed from the live page design's filter tabs (اللوائح/السياسات/النماذج/الأدلة/القرارات) | `{ type: 1 }` — filterable listing | Public |
| `fileId` | ObjectId, ref `Document` | `true` | none | `documents.file` now holds both EN/AR variants internally — see Domain 6 | None | Public |
| `documentVersion` | String | `false` | `null` | e.g. `"1.0"`, `"2.1"` — same field name/pattern as `strategicPlans.documentVersion`, for consistency | None | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | Full list: `['Draft', 'Live', 'Archived']` — denorm ← `publications` (ADR-0020) | `{ publicationState: 1, publishDate: -1 }` compound — listing/feed ordering, mirrors the `articles` pattern already in baseline §11 | Public |
| `publishDate` | Date | `false` | `null` | — | see compound above | Public |

**Confirmed, not added:** `updatedAt` already exists as a standard Mongoose `timestamps: true` field — schema-wide convention, not shown as an explicit row here, consistent with all 69 other collections except `federation` (which deliberately lists its metadata fields explicitly). The card's "آخر تحديث" label reads from this existing field; no separate `lastUpdated` field was added. The page-level intro ("الحوكمة والتنظيم" heading + paragraph shown above the document list) does **not** belong in this collection — deferred to Domain 11 CMS page content in a future task; no `introHeading`/`introText` fields were added here.

### `generalAssemblyMeetings`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `meetingType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** was plain `String` with no enum in the diagram — converted to enum, full list: `['Ordinary', 'Extraordinary']` (standard general-assembly distinction) | `{ meetingType: 1 }` — candidate, low priority | Public |
| `date` | Date | `true` | none | — | `{ date: -1 }` — chronological listing | Public |
| `attendingClubIds` | `[ObjectId]`, ref `Club` | `false` | `[]` | — | Candidate only — "meetings this club attended" is a plausible but not confirmed hot path; not added to required index set | Public |
| `agenda` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 5000` each | None | Public |
| `minutesDocId` | ObjectId, ref `Document` | `false` | `null` | — | None | Public |

Populate strategy: `attendingClubIds` — on-demand (potentially large array, no reason to hydrate club docs on a meeting-detail fetch).

### `aboutFederation` (new in Phase 2.2)

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `coverImage` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each | None | Public |
| `body` | `{ en: String, ar: String }` | `true` (both) | none | no `maxlength` — rich text, length governed by editor/CMS layer not the schema | None | Public |
| `foundingDate` | Date | `false` | `null` | — | None | Public |
| `achievements` | `[AchievementSchema]` (embedded) | `false` | `[]` | **[SCHEMA-READY GAP FILLED]** bounded array had no explicit max in the diagram — capped at **10 entries** (app-layer array-length validator); sub-schema `{ text: { en: String, ar: String }, year: Number }`, `_id: false` — these are a short highlight list, never individually referenced/edited outside the parent document, so no need for their own `_id` | None | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | Full list: `['Draft', 'Live', 'Archived']` — denorm ← `publications` (ADR-0020) | `{ publicationState: 1 }` | Public |

### `presidentMessage` (new in Phase 2.2) — **Synced from direct FigJam edit: `federationAppointmentId` added (2026-08-26)**

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `federationAppointmentId` | ObjectId, ref `FederationAppointment` | `true` | none | canonical link to the specific presidential appointment/term — if the president changes, the historical message stays correctly attributed to their exact term rather than a free-text name | `{ federationAppointmentId: 1 }` | Public |
| `photo` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each | None | Public |
| `messageBody` | `{ en: String, ar: String }` | `true` (both) | none | no `maxlength` — rich text | None | Public |
| `signatoryName` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each — **denormalized display snapshot**; canonical identity comes from `federationAppointmentId` → `federationAppointments` → `federationPersonnel` | None | Public |
| `signatoryTitle` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each — e.g. `"رئيس الاتحاد"`, same snapshot rationale as `signatoryName` | None | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | Full list: `['Draft', 'Live', 'Archived']` — denorm ← `publications` (ADR-0020); archival history satisfied entirely by `revisions.snapshotData`, no separate archive field/collection needed | `{ publicationState: 1 }` | Public |

Populate strategy: `federationAppointmentId` — default (signatory identity/photo typically needed alongside the message).

---

## Domain 2 — People & Organizations (11 collections)

### `clubs`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `logoId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `foundingDate` | Date | `false` | `null` | — | None | Public |
| `emirateId` | ObjectId, ref `Country` | `true` | none | Points at the `countries` collection, which also holds emirates via its own `type` enum (see that collection below) — carried as-is per the Phase 2.1 audit's LOW-priority rename recommendation, not actioned here | `{ emirateId: 1 }` — listing filter | Public |
| `registrationNumber` | String | `true` | none | **[SCHEMA-READY GAP FILLED]** not in baseline §11 for `clubs` specifically (only `athletes`) — added for consistency, same admin-uniqueness rationale | `{ registrationNumber: 1 }` unique | Restricted |
| `clubType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['SportsClub', 'School', 'University', 'Academy', 'Other']` — business-taxonomy guess, flagged for confirmation | `{ clubType: 1 }` — filterable listing | Public |

Populate strategy: `logoId` — default; `emirateId` — on-demand (low cardinality, filter UI needs the list separately anyway).

### `athletes`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `slug` | String | `true` | none | `unique`, `lowercase`, `trim`, `match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/`, `maxlength: 200` | `{ slug: 1 }` unique — detail page lookup (baseline §11, still valid) | Public |
| `dateOfBirth` | Date | `true` | none | mandatory without exception per ADR-0028/Chapter 17 (minor-classification cannot be evaluated without it) | None — never queried by exact date; age-bracket filtering is computed, not indexed | Sensitive-Minor |
| `nationalityId` | ObjectId, ref `Country` | `true` | none | — | `{ nationalityId: 1 }` (baseline §11, still valid) | Public |
| `clubId` | ObjectId, ref `Club` | `false` | `null` | `null` = directly affiliated with the Federation | `{ clubId: 1 }` (baseline §11, still valid) | Public |
| `disciplineIds` | `[ObjectId]`, ref `Discipline` | `false` | `[]` | Phase 2 open item — kept as plain ref[] per the Phase 2.1 audit's own resolution, not reopened here | `{ disciplineIds: 1 }` multikey (baseline §11, still valid) | Public |
| `registrationNumber` | String | `false` | `null` | `unique`, `sparse` — issuing authority still unresolved (source doc BR-011), index remains valid regardless (baseline §11 note, carried forward) | `{ registrationNumber: 1 }` unique, sparse | Restricted |
| `restricted` | Sub-schema (embedded, not `[..]`) | `false` | `{}` | `{ emiratesIdOrPassport: String, address: String, phone: { type: String, match: /^\+?[0-9\s-]{7,20}$/ }, email: { type: String, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ } }` — re-specified in Phase 2.2 per ADR-0028 | None — never queried directly, only read for the owning athlete's admin panel | Sensitive-Minor |
| `status` | String, enum | `true` | `'Active'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Active', 'Inactive', 'Suspended', 'Retired']` | `{ status: 1 }` — candidate, listing filter | Public |

Populate strategy: `nationalityId`, `clubId` — default (both are standard athlete-card display fields); `disciplineIds` — on-demand (can be a longer array, not needed for every list view).

### `athleteGuardianRelationships`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `athleteId` | ObjectId, ref `Athlete` | `true` | none | — | `{ athleteId: 1 }` — "this athlete's guardians" | Public |
| `guardianName` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Restricted |
| `relationshipType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Parent', 'LegalGuardian', 'Other']` | None | Public |
| `guardianContact` | Sub-schema (embedded) | `true` | none | **[SCHEMA-READY GAP FILLED]** `Object` had no internal shape specified anywhere — proposed: `{ phone: { type: String, match: /^\+?[0-9\s-]{7,20}$/ }, email: { type: String, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }, address: String }` | None | Restricted |
| `consentDocId` | ObjectId, ref `Document` | `true` | none | must reference a `documents` record with `documentType` appropriate to parental consent (app-layer check) | None | Public |
| `consentDate` | Date | `true` | none | — | None | Public |
| `isActive` | Boolean | `true` | `true` | — | Candidate — "current guardians only" filter | Public |

Populate strategy: `athleteId` — on-demand; `consentDocId` — on-demand (only needed on the compliance/audit view, not standard reads).

### `coaches`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `fullName` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `photoId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `licenseLevel` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list (World Athletics-style tiers): `['Level1', 'Level2', 'Level3', 'Level4', 'International']` | `{ licenseLevel: 1 }` — candidate | Public |
| `registrationNumber` | String | `true` | none | `unique`, `sparse` — same admin-uniqueness rationale as `athletes` | `{ registrationNumber: 1 }` unique, sparse | Restricted |

### `officials`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `fullName` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `photoId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `roleType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Referee', 'Judge', 'Starter', 'Timekeeper', 'TechnicalDelegate', 'Other']` | `{ roleType: 1 }` — candidate | Public |
| `licenseLevel` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** same list as `coaches.licenseLevel`: `['Level1', 'Level2', 'Level3', 'Level4', 'International']` | Candidate | Public |
| `registrationNumber` | String | `true` | none | `unique`, `sparse` | `{ registrationNumber: 1 }` unique, sparse | Restricted |

### `athleteClubHistory` (shape aligned to tenure-log in Phase 2.2)

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `athleteId` | ObjectId, ref `Athlete` | `true` | none | — | `{ athleteId: 1, startDate: -1 }` compound — **staleness flagged:** baseline §11 proposes this on the old `transferDate` field name, which no longer exists post-Phase-2.2 realignment; corrected here to `startDate` | Public |
| `clubId` | ObjectId, ref `Club` | `true` | none | — | see compound above | Public |
| `startDate` | Date | `true` | none | — | `{ startDate: -1 }` standalone — **staleness flagged:** replaces baseline §11's `{ transferDate: -1 }` federation-wide "transfers this season" query, same purpose, renamed field | Public |
| `endDate` | Date | `false` | `null` | `null` while the tenure is ongoing | None | Public |

### `coachClubHistory`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `coachId` | ObjectId, ref `Coach` | `true` | none | — | `{ coachId: 1 }` — **staleness flagged:** baseline §11 lists this under the old collection name `coachClubAssignments`, renamed to `coachClubHistory` in Phase 1.1; index purpose/shape unchanged | Public |
| `clubId` | ObjectId, ref `Club` | `true` | none | — | `{ clubId: 1 }` (baseline §11, name-carried-forward) | Public |
| `startDate` | Date | `true` | none | — | None | Public |
| `endDate` | Date | `false` | `null` | `null` while ongoing | None | Public |

### `officialClubHistory`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `officialId` | ObjectId, ref `Official` | `true` | none | — | `{ officialId: 1 }` — **[SCHEMA-READY GAP FILLED]** not in baseline §11 at all (new in Phase 1.1, distinct from `officialAssignments`) — added by direct analogy to `coachClubHistory` | Public |
| `clubId` | ObjectId, ref `Club` | `true` | none | — | `{ clubId: 1 }` — same rationale | Public |
| `startDate` | Date | `true` | none | — | None | Public |
| `endDate` | Date | `false` | `null` | `null` while ongoing | None | Public |

### `officialAssignments`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `officialId` | ObjectId, ref `Official` | `true` | none | — | `{ officialId: 1 }` (baseline §11, still valid) | Public |
| `targetType` | String, enum | `true` | none | Directly derivable from the existing poly list below (not a business guess): `['Event', 'Championship']` | `{ targetType: 1, targetId: 1 }` compound (baseline §11, still valid) | Public |
| `targetId` | ObjectId, poly → `events \| championships` | `true` | none | must resolve against the collection named by `targetType` (app-layer discriminated lookup) | see compound above | Public |

Populate strategy: `targetId` — on-demand (discriminated poly ref, resolve only when the assignment detail view is opened).

### `venues`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None — small reference collection, full scans cheap (baseline §11 explicit note) | Public |
| `countryId` | ObjectId, ref `Country` | `true` | none | — | None — same rationale | Public |

### `countries`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 100` each | None — small reference collection (baseline §11 explicit note) | Public |
| `type` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — directly derivable from the Phase 2.1 audit's own finding that this collection serves double duty: `['Country', 'Emirate']` | None | Public |

---

## Domain 3 — Athletics (14 collections)

### `sports`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 100` each | None — small reference collection | Public |

### `disciplines`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 100` each | None | Public |
| `sportId` | ObjectId, ref `Sport` | `true` | none | — | None — small reference collection, `sports` itself likely a single row (Phase 2.1 audit flag, unresolved) | Public |
| `disciplineGroup` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed World-Athletics-style list: `['Track', 'Field', 'Combined', 'RoadRunning', 'RaceWalking', 'CrossCountry']` | `{ disciplineGroup: 1 }` — candidate, filterable listing | Public |

### `ageCategories`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 100` each | None | Public |
| `minAge` | Number | `true` | none | `min: 0, max: 120` | None | Public |
| `maxAge` | Number | `true` | none | `min: 0, max: 120`, must be `>= minAge` (app-layer) | None | Public |

### `seasons`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 100` each | None | Public |
| `startDate` | Date | `true` | none | — | `{ startDate: -1 }` — candidate, "current season" lookup | Public |
| `endDate` | Date | `true` | none | must be `> startDate` | None | Public |
| `status` | String, enum | `true` | `'Upcoming'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Upcoming', 'Active', 'Completed']` | `{ status: 1 }` — candidate | Public |

### `championshipSeries`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None — SPEC-badge, collapse-candidate per Phase 2.1 audit if no series-level page materializes | Public |

### `championships`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each | None | Public |
| `logoId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `seasonId` | ObjectId, ref `Season` | `false` | `null` | — | `{ seasonId: 1 }` (baseline §11, still valid: "season rollup") | Public |
| `seriesId` | ObjectId, ref `ChampionshipSeries` | `false` | `null` | — | None | Public |
| `championshipType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['National', 'Regional', 'International', 'Invitational']` | `{ championshipType: 1 }` — candidate | Public |
| `startDate` | Date | `true` | none | — | `{ startDate: 1 }` (baseline §11 uses `slug`, but no `slug` field exists here — see structural note below) | Public |
| `endDate` | Date | `true` | none | must be `>= startDate` | None | Public |
| `venueId` | ObjectId, ref `Venue` | `false` | `null` | — | None | Public |
| `status` | String, enum | `true` | `'Scheduled'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'Postponed']` | `{ status: 1 }` — candidate | Public |
| `regulationsDocId` | ObjectId, ref `Document` | `false` | `null` | — | None | Public |

**Structural note (not blocking, flagging for awareness):** baseline §11 proposes a unique `{ slug: 1 }` index on `championships` for detail-page lookup, but no `slug` field exists anywhere in the current `championships` schema (name/date/venue only). If championships need a canonical URL, a `slug` field is missing from the diagram entirely — this is a genuine open item, distinct from the enum-value gaps filled elsewhere, and I have **not** added a field speculatively. Flagging for your decision.

### `events`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `championshipId` | ObjectId, ref `Championship` | `true` | none | — | `{ championshipId: 1 }` (baseline §11, still valid) | Public |
| `disciplineId` | ObjectId, ref `Discipline` | `true` | none | — | None | Public |
| `venueId` | ObjectId, ref `Venue` | `false` | `null` | — | None | Public |

**Staleness flagged:** baseline §11's `{ championshipId: 1, dateTime: 1 }` compound (for schedule ordering) references a `dateTime` field that lives on `competitionStages`, not `events`, in the current schema (events don't carry their own datetime — stages do). Corrected placement is under `competitionStages` below.

### `competitionStages`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `eventId` | ObjectId, ref `Event` | `true` | none | — | `{ eventId: 1, dateTime: 1 }` compound — corrected placement of baseline §11's schedule-ordering index (see `events` note above) | Public |
| `stageType` | String, enum | `true` | none | Already fully specified in Phase 2 — `['Qualification/Heats', 'Semi-Final', 'Final', 'Other']`; `Final` is the only medal-awarding value | `{ eventId: 1, stageType: 1 }` — candidate, "find the Final for this event" | Public |
| `sequenceOrder` | Number | `true` | none | `min: 0` | None | Public |
| `nextStageId` | ObjectId, ref `CompetitionStage` (self) | `false` | `null` | must not equal own `_id` | None | Public |
| `dateTime` | Date | `true` | none | — | see compound above | Public |
| `status` | String, enum | `true` | `'Scheduled'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Scheduled', 'InProgress', 'Completed', 'Cancelled']` | `{ status: 1 }` — candidate | Public |

### `qualificationPaths`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `sourceType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** directly derivable from `sourceId`'s existing poly list (not a business guess): `['CompetitionStage', 'Event', 'Championship']` | None | Public |
| `sourceId` | ObjectId, poly → `competitionStages \| events \| championships` | `true` | none | must resolve against the collection named by `sourceType` | None | Public |
| `targetType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** same list, derived from `targetId`: `['CompetitionStage', 'Event', 'Championship']` | None | Public |
| `targetId` | ObjectId, poly → `competitionStages \| events \| championships` | `true` | none | must resolve against the collection named by `targetType` | None | Public |
| `criteria` | String | `false` | `''` | no `maxlength` — free-text qualification rule description | None | Public |

Populate strategy: `sourceId`/`targetId` — on-demand (discriminated poly, resolved only on the qualification-path detail view).

### `participations`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `athleteIds` | `[ObjectId]`, ref `Athlete` | `true` | none | min 1 element (app-layer); single element = individual event, multiple = relay | `{ athleteIds: 1 }` multikey (baseline §11 pattern, was `athleteIds` there too) | Public |
| `competitionStageId` | ObjectId, ref `CompetitionStage` | `true` | none | — | `{ competitionStageId: 1, status: 1 }` compound — corrected placement of baseline §11's `{ eventId: 1, status: 1 }` (stage is now primary, `eventId` is denorm) | Public |
| `eventId` | ObjectId | `true` | none | denorm ← `competitionStages`, query convenience only — never written independently | None (query convenience field, not itself indexed) | Public |
| `clubAtEntry` | Sub-schema (embedded) | `false` | `null` | **[SCHEMA-READY GAP FILLED]** denorm snapshot had no shape specified — proposed: `{ clubId: ObjectId, name: { en: String, ar: String } }` | None | Public |
| `status` | String, enum | `true` | `'Entered'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Entered', 'Confirmed', 'Withdrawn', 'DidNotStart']` | see compound above | Public |
| `bib` | String | `false` | `null` | `maxlength: 10` | None | Public |
| `entryDate` | Date | `true` | none | — | None | Public |

### `results`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `participationId` | ObjectId, ref `Participation` | `false` | `null` | — | None | Public |
| `competitionStageId` | ObjectId, ref `CompetitionStage` | `true` | none | — | `{ competitionStageId: 1, rank: 1 }` compound — corrected placement of baseline §11's `{ eventId: 1, rank: 1 }` default-sort index (stage is now primary) | Public |
| `eventId` | ObjectId | `true` | none | denorm ← `competitionStages`, query convenience | None | Public |
| `athleteRef` | Sub-schema (embedded) | `true` | none | **[SCHEMA-READY GAP FILLED]** denorm snapshot had no shape specified — proposed: `{ athleteId: ObjectId, name: { en: String, ar: String }, nationalityId: ObjectId }` | `{ athleteRef.athleteId: 1, competitionStageId: -1 }` compound — corrected placement of baseline §11's Athlete-Results-History index (was `athleteRef.id`, field renamed to `athleteRef.athleteId` here for clarity — flagging the rename) | Public |
| `clubRef` | Sub-schema (embedded) | `false` | `null` | **[SCHEMA-READY GAP FILLED]** proposed: `{ clubId: ObjectId, name: { en: String, ar: String } }` | None | Public |
| `rank` | Number | `false` | `null` | `min: 1` — scoped to `competitionStageId`, not event-wide | see compound above | Public |
| `performanceValue` | String | `true` | none | no fixed format — athletics performance values vary by discipline (time `mm:ss.ss` vs. distance `m.cc`), format validated at the discipline layer, not the schema | None | Public |
| `attempts` | `[AttemptSchema]` (embedded) | `false` | `[]` | **[SCHEMA-READY GAP FILLED]** bounded array had no explicit max — capped at **8 entries** (covers field-event trial + final format); sub-schema left as `Mixed` pending a confirmed per-discipline attempt shape (distance vs. time vs. foul-flag) — flagging as a follow-up item, not guessed here | None | Public |
| `medal` | String, enum | `false` | `null` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — full list: `['Gold', 'Silver', 'Bronze']`; only set when `competitionStages.stageType = 'Final'` | `{ medal: 1 }` — candidate, "all medalists" queries | Public |
| `windReading` | Number | `false` | `null` | reasonable athletics range `min: -10, max: 10` (m/s) | None | Public |
| `recordFlag` | ObjectId, ref `Record` | `false` | `null` | — | None | Public |
| `verificationStatus` | String, enum | `true` | `'Unverified'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Unverified', 'Verified', 'Disputed', 'Corrected']`, aligned with the Homepage spec's `verification_status` terminology (§7, §10, PR-010) | `{ competitionStageId: 1, verificationStatus: 1 }` compound — corrected placement of baseline §11's public/unofficial split index | Public |
| `enteredBy` | ObjectId, ref `User` | `true` | none | — | None | Public |

Populate strategy: `athleteRef`/`clubRef` — never populated (they're denormalized snapshots by design, not refs to hydrate); `recordFlag` — on-demand.

### `recordCandidates`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `resultId` | ObjectId, ref `Result` | `true` | none | — | `{ resultId: 1 }` unique — 1:1 back-reference integrity | Public |
| `category` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['NationalRecord', 'ChampionshipRecord', 'AgeCategoryRecord', 'ClubRecord']` | `{ category: 1, reviewStatus: 1 }` compound — review-queue filtering | Public |
| `reviewStatus` | String, enum | `true` | `'Pending'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Pending', 'Approved', 'Rejected']` | see compound above | Public |
| `reviewedBy` | ObjectId, ref `User` | `false` | `null` | — | None | Public |
| `reviewDate` | Date | `false` | `null` | — | None | Public |

### `records`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `recordCandidateId` | ObjectId, ref `RecordCandidate` | `true` | none | — | `{ recordCandidateId: 1 }` unique — corrected placement of baseline §11's `{ resultId: 1 }` unique back-reference (records now point at `recordCandidates`, not `results`, directly) | Public |
| `category` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** matches `recordCandidates.category`: `['NationalRecord', 'ChampionshipRecord', 'AgeCategoryRecord', 'ClubRecord']` | `{ category: 1, disciplineId: 1 }` compound (baseline §11, still valid — though note: this collection has no direct `disciplineId` field; it's reachable only via `recordCandidateId → resultId → competitionStageId → eventId → disciplineId`. Flagging as a genuine denormalization candidate for query performance, not resolved here) | Public |
| `dateSet` | Date | `true` | none | — | `{ dateSet: -1 }` — candidate, "most recent records" listing | Public |
| `supersededById` | ObjectId, ref `Record` (self) | `false` | `null` | must not equal own `_id`; `null` = current/standing record | `{ supersededById: 1 }` — candidate, "is this record still standing" filter | Public |

### `rankingsCache`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `disciplineId` | ObjectId, ref `Discipline` | `true` | none | — | `{ disciplineId: 1, seasonId: 1, clubId: 1, ageCategoryId: 1 }` compound — one index covering the full dimensional lookup, matching baseline §11's note ("single compound index once the cache is actually built") | Public |
| `seasonId` | ObjectId, ref `Season` | `false` | `null` | `null` = all-time | see compound above | Public |
| `clubId` | ObjectId, ref `Club` | `false` | `null` | `null` = national/open | see compound above | Public |
| `ageCategoryId` | ObjectId, ref `AgeCategory` | `false` | `null` | `null` = open/all-ages | see compound above | Public |
| `rebuiltAt` | Date | `true` | none | — | None | Public |
| `entries` | `[RankingEntrySchema]` (embedded) | `true` | `[]` | Already fully specified in Phase 2.2: `{ rank: Number, athleteId: ObjectId ref→Athlete, athleteRef: { name, clubId } (denorm), value: String, resultId: ObjectId ref→Result (0..1:1, provenance) }`, `_id: false` on sub-docs (never individually referenced) | None — this is a rebuild-wholesale cache, not queried by a variable key beyond the compound above (baseline §11 explicit note) | Public |

Populate strategy: nothing on this collection is populated — it's a self-contained, pre-computed materialized view by design; consuming it should never trigger a `$lookup`/`populate` chain, which would defeat its purpose as a cache.

---

**Self-correction note (applied while starting Domain 4):** every `publicationState` field across Domain 1 (`committees`, `organizationalStructure`, `visionMission`, `strategicPlans`, `governanceDocuments`, `aboutFederation`, `presidentMessage`) had its `Draft | Live | Archived` enum values in this written spec but **not** in the FigJam Notes cell itself — only the ADR-0020 denorm relationship was shown there, which is exactly the "enum with no listed values" gap category this audit exists to catch. Retroactively fixed in FigJam (flagged `[SCHEMA-READY GAP FILLED]`) alongside Domain 4's three `publicationState` fields, which had the same gap. No further retroactive sweep needed — no other domain built so far has a `publicationState` field.

---

## Domain 4 — Content (5 collections)

### `articles`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each | None — no `slug` field on `articles` either (see structural note below, distinct from the `championships` one) | Public |
| `coverMediaId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `body` | `{ en: String, ar: String }` | `true` (both) | none | no `maxlength` — rich text | None | Public |
| `contentCategoryId` | ObjectId, ref `ContentCategory` | `false` | `null` | — | `{ contentCategoryId: 1, publicationState: 1, publishDate: -1 }` compound — category-filtered feed | Public |
| `publishDate` | DateTime | `true` | none | — | `{ publicationState: 1, publishDate: -1 }` compound (baseline §11, still valid — listing/feed ordering) | Public |
| `authorDisplayName` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 100` each — editorial byline, may differ from `authorUserId`'s account name | None | Public |
| `references` | `[ObjectId]`, poly → `athletes \| clubs \| championships` | `false` | `[]` | closed list, already fully specified | None | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | Full list, now present in both artifacts: `['Draft', 'Live', 'Archived']` — denorm ← `publications` (ADR-0020) | see compound above | Public |
| `authorUserId` | ObjectId, ref `User` | `true` | none | — | None | Public |

**Structural note (not blocking):** neither `articles` nor `championships` has a `slug` field, yet baseline §11 proposes a unique `{slug:1}` index on both for detail-page lookup — same open item as the one flagged in Domain 3, now confirmed to recur here. Recommend resolving both together rather than as two separate decisions.

Populate strategy: `coverMediaId`, `contentCategoryId` — default (standard article-card fields); `references` — on-demand.

### `contentCategories`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 100` each | None | Public |
| `displayOrder` | Number | `true` | `0` | `min: 0` | `{ displayOrder: 1 }` — candidate | Public |

### `externalMediaCoverage`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each | None | Public |
| `publisherId` | ObjectId, ref `ExternalPublisher` | `true` | none | — | None | Public |
| `originalUrl` | String | `true` | none | `match: /^https?:\/\/.+/` | None | Public |
| `publishDate` | Date | `true` | none | — | see compound below | Public |
| `summary` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 500` each | None | Public |
| `addedBy` | ObjectId, ref `User` | `true` | none | — | None | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | Full list: `['Draft', 'Live', 'Archived']` — denorm ← `publications` (ADR-0020) | `{ publicationState: 1, featured: -1, publishDate: -1 }` compound — matches baseline §11 exactly (ADR-0042 homepage carousel + archive ordering), field renamed from `originalPublishDate` in baseline to `publishDate` here — flagging the rename | Public |
| `featured` | Boolean | `true` | `false` | Homepage spec §22 query concept references a separate `homepage_visible` flag distinct from `featured` — Phase 2.1 audit flagged this as unreconciled; **not resolved here**, carried forward as an open item per the "do not guess on domain-shaping ambiguity" discipline | see compound above | Public |

### `externalPublishers`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | String | `true` | none | `maxlength: 150` — monolingual by design (publisher/brand names aren't translated), confirmed reasonable in the Phase 2.1 audit's VERIFY note | None — small reference collection | Public |
| `website` | String | `false` | `null` | `match: /^https?:\/\/.+/` | None | Public |

### `staticPages`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each | None — no `slug` field here either; static pages plausibly need one even more than articles/championships (a page's whole purpose is a stable URL) — same structural item, third recurrence | Public |
| `body` | `{ en: String, ar: String }` | `true` (both) | none | no `maxlength` — rich text | None | Public |
| `featuredImageId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | Full list: `['Draft', 'Live', 'Archived']` — denorm ← `publications` (ADR-0020) | `{ publicationState: 1 }` — candidate | Public |
| `modifiedBy` | ObjectId, ref `User` | `true` | none | — | None | Public |

---

## Domain 5 — Media Center (3 collections)

### `albums`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `parentAlbumId` | ObjectId, ref `Album` (self) | `false` | `null` | must not equal own `_id`; nesting, no FigJam connector used per this session's own self-loop-connector bug avoidance | `{ parentAlbumId: 1 }` — candidate, "children of this album" | Public |
| `coverImageId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `displayOrder` | Number | `true` | `0` | `min: 0` | Compound `{ parentAlbumId: 1, displayOrder: 1 }` — candidate | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted even after the Phase 2.2 self-owned resolution — full list: `['Draft', 'Published', 'Archived']` (deliberately "Published" not "Live", distinguishing this self-owned state machine's vocabulary from the ADR-0020 denorm one) | `{ publicationState: 1 }` — candidate | Public |

### `mediaAssets`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `albumId` | ObjectId, ref `Album` | `false` | `null` | — | `{ albumId: 1 }` — candidate, "assets in this album" | Public |
| `file` | Sub-schema (embedded) | `true` | none | **[SCHEMA-READY GAP FILLED]** `Object` had no shape specified — proposed: `{ url: String, mimeType: String, width: Number, height: Number, size: Number }`; deliberately **not** bilingual (unlike `documents.file`) — a photo asset has no language variant, only its caption/altText do | None | Public |
| `caption` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 300` each | None | Public |
| `altText` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each — required for accessibility (Chapter 6), not optional like caption | None | Public |
| `associatedChampionshipId` | ObjectId, ref `Championship` | `false` | `null` | Hardcoded single-target ref rather than a poly pair — Phase 2.1 audit flagged this as a consistency concern vs. `documents.ownerId`'s poly pattern, not resolved here (structural, not a gap-fill) | `{ associatedChampionshipId: 1 }` (baseline §11, still valid — gallery association query) | Public |
| `associatedAthleteId` | ObjectId, ref `Athlete` | `false` | `null` | Same structural note as above | `{ associatedAthleteId: 1 }` (baseline §11, still valid) | Public |
| `uploaderId` | ObjectId, ref `User` | `true` | none | — | None | Public |

### `videos`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `albumId` | ObjectId, ref `Album` | `false` | `null` | — | `{ albumId: 1 }` — candidate | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 200` each | None | Public |
| `externalPlatform` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['YouTube', 'Vimeo', 'Instagram', 'Other']` — note this is a distinct field/purpose from the Homepage CMS work's `pageSections.configuration.sourceType` (fixed to `'YOUTUBE'` only, for the Live Stream section specifically); on-demand video library videos may come from more platforms | `{ externalPlatform: 1 }` — candidate | Public |
| `externalUrl` | String | `true` | none | `match: /^https?:\/\/.+/` | None | Public |
| `thumbnailId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `associatedChampionshipId` | ObjectId, ref `Championship` | `false` | `null` | Same structural note as `mediaAssets` above | `{ associatedChampionshipId: 1 }` — candidate, by analogy to `mediaAssets` | Public |
| `uploaderId` | ObjectId, ref `User` | `true` | none | — | None | Public |

---

## Domain 6 — Documents (1 collection)

### `documents`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `file` | Sub-schema (embedded) | `true` | none | Already resolved in Phase 2.2: `{ en: { url: String, mimeType: String, size: Number, filename: String }, ar: { url: String, mimeType: String, size: Number, filename: String } }` — bilingual, one `documents` row = one logical document across both languages | None | Restricted (whole-field default per the Phase 2.1 audit's own reasoning — actual sensitivity varies by `documentType`/`ownerType`, e.g. a public governance PDF vs. a private consent form; app-layer must special-case the `Public`-eligible `documentType` values before exposing) | 
| `documentType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['GovernancePolicy', 'Regulation', 'ConsentForm', 'Contract', 'Certificate', 'MeetingMinutes', 'Other']` | `{ documentType: 1 }` — candidate | Public |
| `ownerType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** directly derivable from `ownerId`'s existing poly list (not a business guess): `['Club', 'Athlete', 'Coach', 'Official', 'Championship', 'Membership', 'Sponsorship']` | `{ ownerType: 1, ownerId: 1 }` compound (baseline §11, still valid — polymorphic owner lookup) | Public |
| `ownerId` | ObjectId, poly → `clubs \| athletes \| coaches \| officials \| championships \| memberships \| sponsorships` | `true` | none | must resolve against the collection named by `ownerType`; attachment-use only, distinct from direct forward-refs like `governanceDocuments.fileId` | see compound above | Public |
| `effectiveDate` | Date | `false` | `null` | — | None | Public |
| `expiryDate` | Date | `false` | `null` | must be `> effectiveDate` when both present | None | Public |
| `publicationState` | String, enum | `true` | `'Draft'` | **[SCHEMA-READY GAP FILLED]** same pattern as Domain 1/4/5 — full list: `['Draft', 'Live', 'Archived']` — denorm ← `publications` (ADR-0020) | `{ publicationState: 1 }` — candidate | Public |
| `uploadedBy` | ObjectId, ref `User` | `true` | none | — | None | Public |

**Visibility note on `file` specifically:** this is the one field in the entire schema whose visibility genuinely depends on runtime data (`documentType`) rather than being fixed at the schema level — flagged as a design caveat, not resolved with a computed/dynamic visibility mechanism here (out of scope for a Mongoose field-spec pass).

Populate strategy: `ownerId` — on-demand (discriminated poly, resolved only on the document detail/compliance view).

---

## Domain 7 — Workflow / Approval / Revision / Publication (8 collections)

**Closed `entityType` list, written out in full once here (all four tables below reference this same list — the FigJam Notes cells correctly cross-reference "see domain note" rather than repeating it four times, per that domain's established convention):**

```
['Article', 'StaticPage', 'ExternalMediaCoverage', 'GovernanceDocument', 'StrategicPlan',
 'VisionMission', 'AboutFederation', 'PresidentMessage', 'OrganizationalStructure',
 'Committee', 'Document', 'ContactMessage']
```
12 types (expanded from the original 9 in Phase 2.2: `AboutFederation`/`PresidentMessage` added in Group A, `Committee` added in Group 2 item 5).

### `workflowDefinitions`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `entityType` | String, enum | `true` | none | Closed 12-type list above | `{ entityType: 1 }` — candidate, "the active definition for this type" | Public |
| `isActive` | Boolean | `true` | `true` | — | see compound above | Public |

### `workflowSteps`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `workflowDefinitionId` | ObjectId, ref `WorkflowDefinition` | `true` | none | — | `{ workflowDefinitionId: 1, sequenceOrder: 1 }` compound — ordered step list for a definition | Public |
| `sequenceOrder` | Number | `true` | none | `min: 0` | see compound above | Public |
| `stepType` | String, enum | `true` | `'Sequential'` | Already specified: `['Sequential', 'Parallel']` | None | Public |
| `assigneeType` | String, enum | `true` | none | Already specified: `['User', 'Role', 'Department', 'Committee']` | None | Public |
| `assigneeId` | ObjectId, poly → `users \| roles \| departments \| committees` | `true` | none | must resolve against the collection named by `assigneeType` | None | Public |

Populate strategy: `assigneeId` — on-demand (discriminated poly).

### `workflowInstances`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `workflowDefinitionId` | ObjectId, ref `WorkflowDefinition` | `true` | none | — | None | Public |
| `entityType` | String, enum | `true` | none | Closed 12-type list above | `{ entityType: 1, entityId: 1 }` compound — "workflow state for this entity" | Public |
| `entityId` | ObjectId, poly → 12-type closed list above | `true` | none | must resolve against the collection named by `entityType` | see compound above | Public |
| `currentStepId` | ObjectId, ref `WorkflowStep` | `false` | `null` | `null` once `status` leaves `InProgress` | None | Public |
| `status` | String, enum | `true` | `'InProgress'` | Already specified: `['InProgress', 'Approved', 'Rejected', 'Returned']` | `{ status: 1 }` — candidate | Public |
| `startedAt` | DateTime | `true` | none | — | None | Public |

Populate strategy: `entityId` — on-demand.

### `workflowActionHistory`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `workflowInstanceId` | ObjectId, ref `WorkflowInstance` | `true` | none | — | `{ workflowInstanceId: 1, actionDate: 1 }` compound — full action history for one instance, chronological | Public |
| `workflowStepId` | ObjectId, ref `WorkflowStep` | `true` | none | — | None | Public |
| `actorId` | ObjectId, ref `User` | `true` | none | — | `{ actorId: 1, actionDate: -1 }` compound — "this user's recent actions" | Public |
| `action` | String, enum | `true` | none | Already specified: `['Approved', 'Rejected', 'Returned', 'Delegated']` | None | Public |
| `reason` | String | `false` | `''` | `maxlength: 1000` — required in practice when `action = 'Rejected'` (app-layer conditional requirement, not a schema-level one) | None | Public |
| `delegatedToUserId` | ObjectId, ref `User` | `false` | `null` | required only when `action = 'Delegated'` (app-layer conditional) | None | Public |
| `returnedToStepId` | ObjectId, ref `WorkflowStep` | `false` | `null` | required only when `action = 'Returned'` (app-layer conditional) — added in Phase 2.2 to close the traceability gap the Phase 2.1 audit flagged | None | Public |
| `actionDate` | DateTime | `true` | none | — | see compounds above | Public |

### `revisions`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `entityType` | String, enum | `true` | none | Closed 12-type list above | `{ entityType: 1, entityId: 1, versionNumber: -1 }` compound — "latest version for this entity" | Public |
| `entityId` | ObjectId, poly → 12-type closed list above | `true` | none | must resolve against `entityType` | see compound above | Public |
| `versionNumber` | Number | `true` | none | `min: 1`, monotonically increasing per `(entityType, entityId)` (app-layer enforced) | see compound above | Public |
| `snapshotData` | Mixed (embedded) | `true` | none | Frozen content at this version — deliberately `Mixed`/unstructured since it must accommodate any of the 12 entity types' full field set | None | Public |
| `createdBy` | ObjectId, ref `User` | `true` | none | — | None | Public |
| `createdAt` | DateTime | `true` | none | — | None | Public |

### `publications`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `entityType` | String, enum | `true` | none | Closed 12-type list above | `{ entityType: 1, entityId: 1, status: 1 }` compound — "the live publication for this entity" | Public |
| `entityId` | ObjectId, poly → 12-type closed list above | `true` | none | must resolve against `entityType` | see compound above | Public |
| `workflowInstanceId` | ObjectId, ref `WorkflowInstance` | `false` | `null` | the specific approval that authorized this publication — added in Phase 2.2 to close the audit-trail gap the Phase 2.1 audit flagged as High severity | None | Public |
| `revisionId` | ObjectId, ref `Revision` | `true` | none | — | `{ revisionId: 1 }` unique — 1:1 | Public |
| `publishedAt` | DateTime | `true` | none | — | None | Public |
| `publishedBy` | ObjectId, ref `User` | `true` | none | — | None | Public |
| `status` | String, enum | `true` | `'Live'` | Already specified: `['Live', 'Archived']` — note this is a **different, smaller** enum than the 8 `publicationState` denorm fields' `['Draft', 'Live', 'Archived']`: a `publications` row only ever exists once something has actually been published, so `'Draft'` never applies here | see compound above | Public |

### `notifications`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `type` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['ApprovalRequired', 'ApprovalCompleted', 'RecordPendingReview', 'ContactMessageAssigned', 'ContentPublished', 'General']` | None | Public |
| `recipientId` | ObjectId, ref `User` | `true` | none | — | `{ recipientId: 1, readState: 1, timestamp: -1 }` compound (baseline §11, still valid — Notification Centre) | Public |
| `triggerType` | String, enum | `true` | none | Already specified in Phase 2.2: `['WorkflowInstance', 'RecordCandidate', 'ContactMessage']` | None | Public |
| `triggerId` | ObjectId, poly → `workflowInstances \| recordCandidates \| contactMessages` | `true` | none | must resolve against `triggerType` | None | Public |
| `channel` | String, enum | `true` | none | Already specified: `['In-App', 'Email', 'Push', 'WhatsApp']` | None | Public |
| `readState` | Boolean | `true` | `false` | — | see compound above | Public |
| `deliveryState` | String, enum | `true` | `'Pending'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Pending', 'Sent', 'Failed']` | None | Public |
| `timestamp` | DateTime | `true` | none | — | see compound above | Public |

Populate strategy: `triggerId` — on-demand.

### `auditLogs`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `actorId` | ObjectId, ref `User` | `true` | none | — | `{ actorId: 1, timestamp: -1 }` compound (baseline §11, still valid — per-user activity) | Public |
| `action` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Create', 'Update', 'Delete', 'StatusChange']` | None | Public |
| `entityType` | String, enum | `true` | none | Deliberately **not** restricted to the 12-type workflow list — this is a generic cross-cutting audit trail, covers every collection in the schema, not just the CMS-workflow entities | `{ entityType: 1, entityId: 1, timestamp: -1 }` compound (baseline §11, still valid — per-record audit trail) | Public |
| `entityId` | ObjectId, poly ref (intentionally unrestricted) | `true` | none | Already documented in Phase 2.2 as intentionally open, unlike every other poly reference in the schema | see compound above | Public |
| `timestamp` | DateTime | `true` | none | — | see compounds above | Public |
| `previousValue` | Mixed (embedded) | `false` | `null` | unstructured — must accommodate any field's before-state across any collection | None | Restricted — may contain any field including ones tagged Restricted/Sensitive-Minor elsewhere; the audit log itself must be access-controlled regardless of the underlying entity's own visibility | 
| `newValue` | Mixed (embedded) | `false` | `null` | same as `previousValue` | None | Restricted (same reasoning) |
| `reason` | String | `false` | `''` | `maxlength: 500` | None | Public |

---

## Domain 8 — Platform Administration (4 collections)

### `users`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | String | `true` | none | `maxlength: 150` — monolingual by design, admin-facing internal identity, not a public-facing bilingual entity | None | Public |
| `email` | String | `true` | none | `unique`, `lowercase`, `trim`, `match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `{ email: 1 }` unique — login lookup | Restricted |
| `roleId` | ObjectId, ref `Role` | `true` | none | — | `{ roleId: 1 }` — candidate | Public |
| `accountStatus` | String, enum | `true` | `'Active'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Active', 'Suspended', 'Deactivated']` | `{ accountStatus: 1 }` — candidate | Public |
| `lastLogin` | DateTime | `false` | `null` | — | None | Restricted |
| `credentials` | Sub-schema (embedded) | `true` | none | System-generated (password hash, auth tokens) — never populated in application responses, write-only from the app's perspective | None | Restricted |

### `roles`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | String | `true` | none | `unique`, `maxlength: 100` — monolingual, admin-internal | `{ name: 1 }` unique | Public |
| `departmentId` | ObjectId, ref `Department` | `false` | `null` | — | None | Public |
| `permissionIds` | `[ObjectId]`, ref `Permission` | `false` | `[]` | — | `{ permissionIds: 1 }` multikey — candidate | Public |

### `permissions`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | String | `true` | none | `unique`, `maxlength: 100` | `{ name: 1 }` unique | Public |
| `resourceType` | String | `true` | none | free-text collection/resource identifier (e.g. `'Article'`, `'GovernanceDocument'`) — deliberately not an enum, since it must extend to any current or future collection name without a schema migration | Compound `{ resourceType: 1, action: 1 }` — "does this role have permission X on resource Y" | Public |
| `action` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Create', 'Read', 'Update', 'Delete', 'Approve', 'Publish']` | see compound above | Public |

### `departments`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 100` each | None | Public |
| `functionSummary` | String | `false` | `''` | `maxlength: 500` — monolingual (internal admin description, not public-facing) | None | Public |
| `contact` | String | `false` | `null` | **Structural note, not fixed here:** unstructured `String` for what could be a phone/email/address combination — Phase 2.1 audit flagged this as worth structuring for consistency with `sponsors.restricted`/`athletes.restricted`'s Object pattern; carried forward as a low-priority open item, not resolved | None | Public |

---

## Domain 9 — Sponsorship / Institutional Relationships (4 collections)

**Workflow/Revision exemption reminder (Phase 2.2 item 5):** none of these four collections are in the 12-type workflow/revision/publication list — their accuracy is managed operationally by direct edit, not an editorial Approve→Publish pipeline (documented in FigJam as a standalone note above this domain).

### `sponsors`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `name` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `logoId` | ObjectId, ref `MediaAsset` | `true` | none | — | None | Public |
| `website` | String | `false` | `null` | `match: /^https?:\/\/.+/` | None | Public |
| `categoryLabel` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 100` each | None | Public |
| `restricted` | Sub-schema (embedded) | `false` | `{}` | **[SCHEMA-READY GAP FILLED]** `Object` had no shape specified — proposed: `{ contactEmail: { type: String, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }, contactPhone: { type: String, match: /^\+?[0-9\s-]{7,20}$/ }, contractValue: Number, contractDocId: { type: ObjectId, ref: 'Document' } }` | None | Restricted |

### `sponsorships`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `sponsorId` | ObjectId, ref `Sponsor` | `true` | none | — | `{ sponsorId: 1 }` (baseline §11, still valid — "all targets for this sponsor") | Public |
| `targetType` | String, enum | `true` | none | Already specified: `['Federation', 'Championship', 'Event']` — Department deliberately excluded, per the explicit instruction that this is a business decision, not an architecture call | `{ targetType: 1, targetId: 1, status: 1 }` compound (baseline §11, still valid) | Public |
| `targetId` | ObjectId, poly → `federation \| championships \| events` | `true` | none | must resolve against `targetType` | see compound above | Public |
| `tier` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — derived directly from the Homepage spec's own tier language (§15: "Strategic / Official ×3 / Supporting"), not a fresh guess: `['Strategic', 'Official', 'Supporting']` | `{ tier: 1 }` — candidate, tiered grid rendering | Public |
| `startDate` | Date | `true` | none | — | None | Public |
| `endDate` | Date | `true` | none | must be `>= startDate` | None | Public |
| `status` | String, enum | `true` | `'Active'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Active', 'Expired', 'Cancelled']` | see compound above | Public |
| `bannerAssetId` | ObjectId, ref `MediaAsset` | `false` | `null` | populated only when `tier = 'Strategic'`; null otherwise (app-layer conditional, not schema-enforced) | None | Public |
| `promotionalText` | `{ en: String, ar: String }` | `false` | `null` each | same `tier = 'Strategic'` conditional; drives full-banner vs. logo-grid rendering — presentation concern, data storage only | None | Public |

### `partnerships`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `partnerName` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `partnerLogoId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `partnershipType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['BilateralAgreement', 'MOU', 'TechnicalCooperation', 'Other']` | `{ partnershipType: 1 }` — candidate | Public |
| `startDate` | Date | `true` | none | — | None | Public |
| `endDate` | Date | `false` | `null` | `null` = ongoing/indefinite | None | Public |
| `isActive` | Boolean | `true` | `true` | — | `{ isActive: 1 }` — candidate | Public |

### `memberships`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `organizationName` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `organizationLogoId` | ObjectId, ref `MediaAsset` | `false` | `null` | — | None | Public |
| `membershipType` | String, enum | `true` | none | **[SCHEMA-READY GAP FILLED]** enum was unlisted — derived from the Group C brief's own examples ("regional athletics bodies, Olympic organizations, other governing bodies"): `['RegionalBody', 'ContinentalBody', 'InternationalBody', 'OlympicCommittee']` | `{ membershipType: 1 }` — candidate | Public |
| `startDate` | Date | `true` | none | — | None | Public |
| `endDate` | Date | `false` | `null` | `null` = ongoing | None | Public |
| `status` | String, enum | `true` | `'Active'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Active', 'Suspended', 'Terminated']` | Compound `{ organizationName: 1, status: 1 }` — was baseline §11's `{ organizationId: 1, status: 1 }` under the old collection name `institutionalMemberships`; **staleness flagged:** this collection has no `organizationId` ref (organization is captured inline via `organizationName`, per the "no Organization model" hard rule), so the baseline index cannot be ported as-is — corrected to key off `organizationName` instead | Public |

---

## Domain 10 — Public Communication (1 collection)

No gaps found — this collection was already fully specified in Phase 2.2, including correct visibility tags on every PII field. No FigJam edit made.

### `contactMessages`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `messageType` | String, enum | `true` | none | Already specified: `['Complaint', 'Suggestion', 'Inquiry', 'General']` — one model, not four | `{ messageType: 1, status: 1 }` compound — candidate, admin queue filtering | Public |
| `senderName` | String | `true` | none | `maxlength: 150` | None | Restricted |
| `senderEmail` | String | `false` | `null` | `lowercase`, `trim`, `match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/` — at least one of `senderEmail`/`senderPhone` required (app-layer, not a Mongoose-level either/or validator) | None | Restricted |
| `senderPhone` | String | `false` | `null` | `match: /^\+?[0-9\s-]{7,20}$/` | None | Restricted |
| `messageBody` | String | `true` | none | `maxlength: 5000` | None | Restricted |
| `status` | String, enum | `true` | `'New'` | Already specified: `['New', 'InProgress', 'Resolved', 'Closed']` — primary/owned field, not a denorm mirror (deliberately outside the 12-type workflow list — see Domain 7 note) | `{ status: 1, createdAt: -1 }` compound — candidate, admin queue sorted by status/age | Public |
| `assignedDepartmentId` | ObjectId, ref `Department` | `false` | `null` | — | `{ assignedDepartmentId: 1, status: 1 }` compound — candidate, per-department queue | Public |
| `workflowInstanceId` | ObjectId, ref `WorkflowInstance` | `false` | `null` | only if a formal workflow was triggered — most contact messages resolve via direct department action, not the full editorial pipeline | None | Public |
| `createdAt` | DateTime | `true` | none | — | see compound above | Public |

---

## Domain 11 — CMS & Page Composition (6 collections)

This domain was built during the Homepage/CMS work immediately preceding this audit and was already close to implementation-ready — only one true gap and one stale cross-reference found.

### `siteSettings` (singleton, like `federation`)

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `socialLinks` | Sub-schema (embedded) | `false` | `{}` | Already specified: `{ facebook: String, instagram: String, x: String, youtube: String, tiktok: String }`, each `match: /^https?:\/\/.+/` when present | None — singleton | Public |
| `defaultSeo` | Sub-schema (embedded) | `false` | `{}` | Already specified: `{ titleSuffix: { en: String, ar: String }, defaultOgImageId: ObjectId ref MediaAsset, defaultDescription: { en: String, ar: String } }` | None | Public |
| `copyrightText` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 300` each | None | Public |

### `navigationMenus`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `key` | String | `true` | none | `unique`, `match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/` — e.g. `"main-nav"`, `"footer-quick-links"` | `{ key: 1 }` unique | Public |
| `location` | String, enum | `true` | none | Already specified: `['Header', 'Footer']` | None | Public |

### `navigationItems`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `menuId` | ObjectId, ref `NavigationMenu` | `true` | none | — | `{ menuId: 1, parentItemId: 1, displayOrder: 1 }` compound — full ordered tree fetch in one query | Public |
| `label` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 60` each | None | Public |
| `url` | String | `true` | none | `maxlength: 200` — internal route, e.g. `"/athletes"` | None | Public |
| `parentItemId` | ObjectId, ref `NavigationItem` (self) | `false` | `null` | must not equal own `_id`; supports the Homepage spec's documented dropdown/flyout structure | see compound above | Public |
| `displayOrder` | Number | `true` | `0` | `min: 0` | see compound above | Public |
| `isActive` | Boolean | `true` | `true` | — | None | Public |

### `pages`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `slug` | String | `true` | none | `unique`, `lowercase`, `match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/` | `{ slug: 1 }` unique — resolves the missing-`slug` structural item flagged 3× in Domains 3–4 (`championships`, `articles`, `staticPages`) for at least this one collection; those three remain open | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `status` | String, enum | `true` | `'Draft'` | Already specified, cross-reference corrected in this pass (was stale "11-type," now "12-type" after `committees` joined the workflow list in Group 2): `['Draft', 'Published']` — deliberately its own small enum, distinct from the 12-type workflow `publicationState` system; a composable page's draft/publish state is structural, not editorial-content-approval | `{ status: 1 }` — candidate | Public |
| `seo` | Sub-schema (embedded) | `false` | `{}` | Already specified: `{ metaTitle: { en: String, ar: String }, metaDescription: { en: String, ar: String }, ogImageId: ObjectId ref MediaAsset }` | None | Public |

### `pageSections`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `pageId` | ObjectId, ref `Page` | `true` | none | — | `{ pageId: 1, displayOrder: 1 }` compound — full ordered section list for a page in one query | Public |
| `sectionType` | String, enum | `true` | none | Already fully specified, closed 14-value list: `['HERO', 'FEDERATION_STATS', 'DEPARTMENTS', 'FEATURED_ATHLETES', 'UPCOMING_EVENTS', 'RANKINGS', 'LATEST_NEWS', 'EXTERNAL_MEDIA', 'SPONSORS', 'LIVE_STREAM', 'VIDEO_LIBRARY', 'MEDIA_CENTRE', 'CLUBS', 'NEWSLETTER_CTA']` | see compound above | Public |
| `displayOrder` | Number | `true` | `0` | `min: 0` | see compound above | Public |
| `enabled` | Boolean | `true` | `true` | — | `{ pageId: 1, enabled: 1 }` compound — candidate, "active sections for this page" | Public |
| `visibility` | String, enum | `true` | `'Everyone'` | **[SCHEMA-READY GAP FILLED]** enum was unlisted — proposed list: `['Everyone', 'AuthenticatedOnly', 'AdminPreviewOnly']` | None | Public |
| `selectionMode` | String, enum | `true` | none | Already specified: `['MANUAL', 'AUTOMATIC']` | None | Public |
| `items` | `[ObjectId]`, poly[] → `athletes \| articles \| externalMediaCoverage \| sponsors \| events \| clubs \| videos \| albums` | `false` | `[]` | closed 8-type list, already fully specified; used when `selectionMode = 'MANUAL'` | None | Public |
| `filters` | Mixed (embedded) | `false` | `{}` | Already specified pattern, deliberately unstructured — automatic-selection query params vary per `sectionType` (e.g. `limit`, `categoryId`, `featured`); used when `selectionMode = 'AUTOMATIC'` | None | Public |
| `configuration` | Mixed (embedded) | `false` | `{}` | Already specified pattern, deliberately unstructured — section-specific settings independent of item selection; the one confirmed concrete shape is `LIVE_STREAM`: `{ sourceType: 'YOUTUBE', youtubeVideoId: String }` (fixed to YouTube-only per explicit decision, not polymorphic) | None | Public |

Populate strategy: `items` — on-demand, resolved per `sectionType`'s target collection at render time, never eagerly.

### `heroSlides`

| Field | Mongoose Type | Required | Default | Validation | Index | Visibility |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | — | Primary (auto) | Public |
| `pageSectionId` | ObjectId, ref `PageSection` | `true` | none | should reference a `pageSections` document with `sectionType = 'HERO'` (app-layer check, not a Mongoose cross-collection validator) | `{ pageSectionId: 1, displayOrder: 1 }` compound — ordered slide sequence for one hero section | Public |
| `mediaType` | String, enum | `true` | none | Already specified: `['IMAGE', 'VIDEO']` | None | Public |
| `mediaAssetId` | ObjectId, ref `MediaAsset` | `true` | none | works for both image and video file, discriminated by `mediaType` | None | Public |
| `title` | `{ en: String, ar: String }` | `true` (both) | none | `maxlength: 150` each | None | Public |
| `subtitle` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 300` each | None | Public |
| `ctaText` | `{ en: String, ar: String }` | `false` | `''` each | `maxlength: 60` each | None | Public |
| `ctaUrl` | String | `false` | `null` | `maxlength: 200` | None | Public |
| `displayOrder` | Number | `true` | `0` | `min: 0` | see compound above | Public |
| `active` | Boolean | `true` | `true` | — | `{ pageSectionId: 1, active: 1 }` compound — candidate, "currently-eligible slides" | Public |
| `scheduledFrom` | Date | `false` | `null` | optional — slide becomes eligible once this date passes (app-layer, combined with `active`) | see compound above | Public |
| `scheduledTo` | Date | `false` | `null` | optional — must be `> scheduledFrom` when both present | see compound above | Public |

---

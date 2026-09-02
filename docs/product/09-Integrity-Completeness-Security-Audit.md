# UAEAF — Full Physical Model Integrity, Completeness & Security Audit

**Audit type:** Read-only. No FigJam node, schema field, or code was modified in the course of this review.
**Date:** 2026-09-02

---

## 1. Scope and Source of Truth

**Primary and only schema source of truth:** live FigJam file `2ZC01ZbUx3rL7czDXWi34c`, section "03 — Physical Model (Phase 1.1)" (node `77:5543`), read fresh in full via the Figma MCP FigJam reader for this audit (one complete fetch of the section subtree, ~657,000 characters / 3,903 lines, processed end-to-end). `docs/product/07-Mongoose-Schema-Specification.md` was not used as evidence (explicitly stale per task instructions). `docs/product/08-Workflow-Scenario-Review.md` (dated 2026-09-01) was read for terminology and already-confirmed Domain 7 decisions; every place where it disagrees with the live board is called out explicitly below, because the live board is authoritative and has visibly continued to evolve since that document was written (same day).

### 1.1 CRITICAL SCOPE DISCREPANCY — reported per the No-Guessing Rule, not silently resolved

The task brief states the live board has **85 collections** across 11 domains, with Domain 2 (People & Organizations) at **16** collections "including `athleteProfiles`, `athleteCoachHistory`, `athleteNationalTeamHistory`, `officialProfiles`, added 2026-09-01."

**What the live board actually contains, verified by direct table-count and cross-check against every table title label in the section:** **81 collections**, not 85. Domain 2 contains **12** collections, not 16. The four collections named above (`athleteProfiles`, `athleteCoachHistory`, `athleteNationalTeamHistory`, `officialProfiles`) **do not exist as tables anywhere in the "03 — Physical Model" section**.

Evidence:
- A full enumeration of every `<table>` node under section `77:5543` yields exactly 81 tables (verified twice, once by direct node-count and once by cross-matching every table's position against its adjacent title `<text>` label).
- The two fields that would be expected to reference these four collections do exist and do mention them **by name in prose**, but only as forward-looking narrative, not as resolved references to real tables:
  - `athletes.residencyType` (table `80:6021`) Notes: *"Local: registered UAEAF member (has a linked **athleteProfiles** record)."*
  - `officials.residencyType` (table `80:6183`) Notes: *"Local: registered UAEAF official (has a linked **officialProfiles** record)."*
  - No table, anywhere in the section, is titled `athleteProfiles`, `officialProfiles`, `athleteCoachHistory`, or `athleteNationalTeamHistory`.
- Domain-by-domain recount confirms the shortfall is isolated entirely to Domain 2: Federation & Governance = 14 (matches brief), Athletics = 14 (matches), Content = 6 (matches), Media Center = 3 (matches), Documents = 1 (matches), Workflow = 9 (matches), Platform Administration = 4 (matches), Sponsorship = 4 (matches), Public Communication = 1 (matches), CMS & Page Composition = 13 (matches). Only People & Organizations is short, by exactly 4 — precisely the four "added 2026-09-01" collections named in the brief.
- `docs/product/08-Workflow-Scenario-Review.md` (written 2026-09-01, the same day these four collections are claimed to have been added) never mentions any of the four collections either, and does not assert a 16-collection Domain 2 or an 85-collection total anywhere.

**Conclusion, per the No-Guessing Rule:** the claim that these four collections exist is **not represented in the current Physical Model — flagged for review**. This audit proceeds against the **81 collections that are actually on the board**, since that is the live source of truth this task instructs me to trust over any other document — including, in this one specific instance, the task's own preamble. Part B below scores all 85 *named* collections as instructed, explicitly marking the 4 phantom ones as NOT REPRESENTED rather than guessing a verdict for schemas that do not exist.

This is not a cosmetic gap: `residencyType=Local` on both `athletes` and `officials` is documented as meaning *"has a linked [X]Profiles record,"* i.e. the schema's own Notes cells assert a foreign-key relationship into collections that structurally do not exist yet. Any NestJS/Mongoose implementation of the Local/Guest residency model today would have nothing to link to.

### 1.2 Board has continued to evolve since 08-Workflow-Scenario-Review.md — several of its findings are now stale

Reading the board fresh (not from memory of the prior session, per instructions) surfaced multiple **2026-09-01** decisions that post-date or supersede specific findings in `08-Workflow-Scenario-Review.md`, written the same day. These are evidence-based corrections, not guesses — each is cited to the exact cell:

1. **`publicationState` gained a fourth value.** Every one of the 12 revision/publication-eligible entities now reads `Draft | Live | Unpublished | Archived` (e.g. `articles` row `88:11`, `committees` row `134:0`, `documents` row `94:10`), with an explicit note that `Unpublished` (temporary/reversible) is now deliberately distinct from `Archived` (permanent). `publications.status` (table `100:7671`) also gained `Unpublished`. **This resolves** 08-doc's Scenario 5 finding that "the model does not distinguish temporarily unpublish from permanently archive" and Open Question #5 ("Is Unpublish a distinct concept from Archive?") — it now is, verified identically worded across all 12 entities.
2. **`workflowPolicies.operation` gained two values.** It is now `Add | Edit | Delete | Unpublish | Archive` (table `277:4402`, row `277:4`), with an explicit note that `Publish` is deliberately *not* a separate operation (it is the automatic consequence of final-step approval on Add/Edit, not a distinct admin action). **This resolves** 08-doc's Architectural GAP "`workflowPolicies.operation` does not cover Publish/Unpublish/Archive" and Open Question #4.
3. **`workflowInstances.revisionId` and `workflowActionHistory.revisionId` now exist** (tables `100:7512` row `379:0`, `100:7563` row `521:1`), explicitly labeled "CRITICAL LINK, previously identified as missing." Every workflow instance, and every individual action within it, now permanently records which exact revision it targeted. This closes the specific traceability gap 08-doc worried about in its Scenario-4 discussion.
4. **The self-approval business rule was rewritten.** The `⚠ business rule` cell on `workflowInstances` (`100:7512`, row `379:1`) is explicitly marked "REVISED 2026-09-01, replacing the old submittedBy/authorUserId comparison." The new rule needs no entity-specific field at all — authorization is entirely a function of `workflowSteps.assigneeIds` membership. **This resolves** 08-doc's Architectural GAP "Self-approval rule references non-existent fields" and Open Question #12 as a *schema* matter (the underlying field-naming inconsistency for "who authored this" — `authorUserId`/`addedBy`/`modifiedBy`/`uploadedBy`/`enteredBy` — still exists and is carried forward below as finding A3, but it no longer blocks rule enforceability).
5. **`federationAppointments.supersedesAppointmentId`** (table `204:8885`, row `521:0`) replaced an "implicit roleType-based auto-close rule" with an explicit, admin-selected succession pointer, specifically to fix a correctness bug for multi-holder roles (BoardMember, CommitteeMember) that the implicit rule would have mishandled.

None of this contradicts 08-Workflow-Scenario-Review.md's remaining findings (Scenario 4's in-place-mutation ambiguity, Scenario 6's concurrency gap, Scenario 9's audit-boundary question, the Role/Committee-assignment NEEDS-DECISIONs, and the `governanceDocuments`↔`documents` coordination question are all still accurate as of this fresh read) — but the five items above are no longer open and should not be re-raised as if unresolved.

---

## 2. Part A — Collision / Consistency Findings

### A1 — Dangling references
**Verdict: PASS, with one narrative (non-field) exception already covered in §1.1.**

Every literal `ref →` / `poly →` field target was traced against the 81 real collection names. All resolve correctly, including every polymorphic list (`documents.ownerId` → 7 targets, `officialAssignments.targetId` → 2, `qualificationPaths.sourceType`/`targetType` → 3, `pageSections.items` → 10, `contactMessages.assignedToId` → 2, `notifications.triggerId` → 3, `sponsorships.targetId` → 3, `siteSettings.privacyPolicyPageId`/`termsOfUsePageId`/`accessibilityStatementPageId` → 2 each). No field points at a collection name that doesn't exist.

The one exception is the narrative (not field-level) dangling reference already documented in §1.1: the *Notes prose* on `athletes.residencyType` and `officials.residencyType` asserts linked `athleteProfiles`/`officialProfiles` records that do not exist as tables.

**One related, field-level anomaly worth flagging alongside A1 even though it is not a broken reference:** `clubs.introVideoId` (table `80:5971`, row `261:31`) is typed `ObjectId` and named for a **video**, but its ref target is `mediaAssets` — the collection whose own domain note (`92:7270`) says it was *"rescoped to images specifically now that Video is split out"* into the separate `videos` collection. Every other video-pointing field in the schema (`heroSlides.videoId`, `pageSections.configuration.videoId` for `LIVE_STREAM`) correctly points to `videos`. `clubs.introVideoId` is the one field on the entire board whose name says "video" but whose reference target is the images-only collection — either the field is mistyped (should ref `videos`) or its name is misleading (it actually holds a still image). This is a concrete, fixable inconsistency, not a guess.

### A2 — Duplicate or conflicting collection names
**Verdict: PASS.** All 81 collection names are unique; no two tables share a name or a near-identical name that could indicate an accidental duplicate model.

### A3 — Naming inconsistency for equivalent concepts
**Verdict: GAP, confirmed and extended beyond what 08-Workflow-Scenario-Review.md already found.**

The "who is responsible for this content" concept uses **five different field names** across entities that otherwise follow the same editorial pattern, all `ref → users`:
- `articles.authorUserId`
- `externalMediaCoverage.addedBy`
- `staticPages.modifiedBy` (semantically "last editor," not "original author" — a sixth shade of meaning)
- `documents.uploadedBy`
- `results.enteredBy`

None of `governanceDocuments`, `strategicPlansPage`, `visionMissionPage`, `aboutFederationPage`, `presidentMessagePage`, `organizationalStructure`, `committees`, or `publicEvents` carry an author-equivalent field at all beyond the generic `createdBy` (which is optional and explicitly "null for system-generated records" — not guaranteed to identify a human author). As noted in §1.2, this no longer breaks the self-approval rule's *enforceability* (that rule now only depends on `workflowSteps.assigneeIds`), but the inconsistency itself is unresolved and will surface the first time any admin-UI feature needs to show "submitted by" uniformly across the 12 editorial content types.

**Second, narrower A3 observation:** `coaches.nationality` and `federationPersonnel.nationality` are both plain `String` fields, while `athletes.nationalityId` and `officials.nationalityId` correctly `ref → countries` (bilingual `{en,ar}` name, consistent with the rest of the schema's reference-data pattern). If a coach's or a federation-personnel member's nationality is ever displayed on the public, bilingual site, the plain-String version cannot carry an Arabic name the way the ref-based version can. This is the same class of issue A3 is meant to catch — two collections doing the same job (person's nationality) two different, differently-capable ways.

### A4 — Enum value inconsistency across equivalent concepts
**Verdict: PASS for the primary `publicationState` enum — independently re-verified across all 12 revision/publication-eligible entities.**

Read the exact enum text on all 12: `articles`, `staticPages`, `externalMediaCoverage`, `governanceDocuments`, `strategicPlansPage`, `visionMissionPage`, `aboutFederationPage`, `presidentMessagePage`, `organizationalStructure`, `committees`, `documents`, `publicEvents`. All 12 read verbatim identically: *"Draft | Live | Unpublished | Archived (denorm ← publications) — Unpublished added 2026-09-01: ..."* — the entire sentence, not just the enum values, is copy-identical across all 12 cells. **No drift found.**

Two **documented, self-aware** exceptions exist and should not be treated as inconsistencies:
- `albums.publicationState` = `Draft | Published | Archived` (3 values, no `Unpublished`) — its own Notes cell explains why: *"self-owned — Album is a media-organization construct, not editorial narrative content; published directly by Media Center staff without a review pipeline."* Intentional, documented, PASS.
- `pages.status` / `navigationItems.status` = `Draft | Published` — explicitly noted as *"structural routing status ... distinct from the 13-type workflow `publicationState` system."* Intentional, documented, PASS.
- `contactMessages.status` = `New | InProgress | Resolved | Closed` — its own primary/non-denorm lifecycle, already covered extensively in 08-Workflow-Scenario-Review.md §3.12 and §5. PASS as a documented exception.

### A5 — The two closed entity-type lists (confirmed 2026-09-01, node `100:7435`)
**Verdict: PASS — independently re-verified, not merely re-asserted.**

The domain note at `100:7435` declares List A (13 types, workflow-participation: `workflowDefinitions`, `workflowInstances`, `workflowPolicies`) and List B (12 types, revisions/publications, List A minus `contactMessages`). Read the actual `entityType`/`entityId` Notes cells on all five collections directly:
- `workflowDefinitions.entityType` (`100:7436`): "closed list — see domain note" (no independent enumeration on this table, correctly deferring to the domain note).
- `workflowInstances.entityId` (`100:7512`, row `100:24`): full 13-type list spelled out verbatim, matches List A exactly.
- `workflowPolicies.entityType` (`277:4402`, row `277:3`): "closed list — see domain note ... retyped from plain String to String enum for consistency."
- `revisions.entityId` (`100:7620`, row `100:46`): full 12-type list spelled out verbatim, matches List B exactly, with an explicit note that `contactMessages` was deliberately removed 2026-09-01.
- `publications.entityId` (`100:7671`, row `100:57`): same 12-type list, verbatim identical wording to `revisions.entityId`.

All five are mutually consistent and match the domain note exactly. **PASS.**

### A6 — Visual/layout overlap (re-verify no two tables' bounding boxes overlap)
**Verdict: FAIL — three concrete overlaps found, computed directly from each table's `x`/`y`/`width`/`height` attributes as returned by the FigJam reader. This appears to be a regression (or an incomplete fix) since the 2026-09-01 correction referenced in the task brief.**

| Pair | Table A (domain) | Table B (domain) | Overlap region (px) |
|---|---|---|---|
| 1 | `strategicPlansPage` (`77:5862`, Domain 1) — x:[5509,6054] y:[200,4376] | `clubTeams` (`261:4353`, Domain 2) — x:[5980,6556] y:[3956,5412] | **74 × 420** |
| 2 | `documents` (`94:7376`, Domain 6) — x:[40,645] y:[19516,21932] | `workflowDefinitions` (`100:7436`, Domain 7) — x:[40,575] y:[21584,22576] | **535 × 348** |
| 2b | `documents` (`94:7376`, Domain 6) — x:[40,645] y:[19516,21932] | `workflowSteps` (`100:7468`, Domain 7) — x:[635,1170] y:[21584,23872] | 10 × 348 (sliver) |
| 3 | `contactMessages` (`108:8150`, Domain 10) — x:[40,615] y:[31188,33548] | `siteSettings` (`125:8318`, Domain 11) — x:[40,615] y:[33208,35872] | **575 × 340** (full-width) |

All three are the same root cause: an oversized table (`strategicPlansPage` at 4176px tall, `documents` at 2416px tall, `contactMessages` at 2360px tall) is taller than the ~300px gap the board's own layout convention otherwise leaves between domain rows, and its column happens to align with a table in the next row. Every other adjacent-row boundary on the board was checked the same way and found clear (a consistent ~300px gap holds everywhere else, e.g. Domain 2→3, Domain 8→9, Domain 9→10). This is a narrow, mechanical layout defect, not a data-model defect — flagging per the explicit audit instruction, not attempting to fix it (FigJam is not to be edited by this audit).

### A7 — Orphaned or unused collections
**Verdict: PASS — none found.**

Every one of the 81 collections either (a) is the target of at least one live `ref →`/`poly →` field from another collection, or (b) is a standalone, directly-routable content model with clear purpose confirmed by its own field set (the singleton `federation`/`siteSettings` pair, and the ten "Page" hero-content wrappers: `committeesPage`, `boardMembersPage`, `contactUsPage`, `athletesPage`, `coachesPage`, `resultsRankingsPage`, `recordsPage`, `newsPage`, `clubsPage`, `disciplinesPage` — none of these ten is referenced by ObjectId from elsewhere, but each corresponds one-to-one to a named public route and holds exactly the hero-banner fields (`heroImageId`, `heroTitle`, `heroSubtitle`) that role requires — this is a legitimate singleton-per-route pattern, not dead data). `clubTeams` and `rankingsCache` likewise have no inbound references but are clearly the backing store for specific, named public UI (a club's squad roster; the rankings leaderboard) — not orphans.

---

## 3. Part B — Field Completeness, Per Collection (all 85 named, grouped by domain)

Legend: **T** = Technical completeness (B1), **A** = Administrative completeness (B2). Only concrete, named-field gaps are reported; a bare "PASS" means both dimensions are adequate for the collection's evident purpose.

### Domain 1 — Federation & Governance (14)

1. **electionCycles** — T: PASS (all 6 tracking fields present, no public routing needed, `status` enum present). A: PASS (`status` gives lifecycle, `cycleNumber`/`cycleName` support admin listing/search).
2. **committees** — T: PASS. A: PASS, but note the three independently-tracked on/off signals (`isActive`, `publicationState`, `archivedAt`) already flagged in 08-doc §3.10 Scenario 5 — carried forward here as still open, not re-litigated.
3. **organizationalStructure** — T: PASS (self-ref `parentNodeId`, `ref → departments`, `ref → federationAppointments` all correctly typed ObjectId+ref). A: PASS (`nodeType` enum + `displayOrder` support an admin tree-builder UI).
4. **visionMissionPage** — T: PASS (`revisionId` present, unlike most Group-A pages). A: PASS.
5. **strategicPlansPage** — T: PASS, but see A6 above (this table's own layout overlaps `clubTeams`). A: PASS. `impactMetrics[]` intentionally duplicates `periodEnd` by documented design — not a defect.
6. **governanceDocuments** — T: GAP — `documentVersion` is a free `String` (e.g. "1.0") with no validation pattern or monotonicity constraint noted; two different governance-document version fields (`governanceDocuments.documentVersion` and `strategicPlansPage.documentVersion`) exist as parallel, unlinked scalars rather than a shared versioning primitive, though the note explicitly says this is deliberate parity, not a bug. A: PASS.
7. **aboutFederationPage** — T: PASS. A: PASS. `achievements[]` capped at 10 by design note.
8. **presidentMessagePage** — T: PASS (`federationAppointmentId` correctly makes the message follow the office, not a free-text name). A: NEEDS-DECISION carried from 08-doc — no independent gap found beyond what's already flagged there (Role/Appointment-scoped step assignment).
9. **federation** — T: **GAP** — this singleton's `createdAt`/`updatedAt`/`createdBy`/`updatedBy` are typed `Date` (every other collection on the board uses `DateTime`) and marked **[PUBLIC]** rather than [RESTRICTED] — the only collection on the entire board where these four tracking fields carry the public visibility tag. Whether this is intentional (federation identity fields are innocuous) or a copy-paste artifact from before the schema-wide [RESTRICTED] convention was adopted is not stated. A: PASS — `registrationNumber`/`registrationAuthority` explicitly documented as optional/not-yet-available, appropriately flexible for a federation that "may not have this documented yet."
10. **federationPersonnel** — T: GAP — see A3 above: `nationality` is a plain `String`, not `ref → countries`, unlike every other person-record on the board. A: PASS (`status` Active/Inactive is sufficient for admin listing).
11. **federationAppointments** — T: PASS (the 2026-09-01 `supersedesAppointmentId` fix, §1.2 item 5, is a real completeness improvement). A: PASS (`status` enum with 6 values plus `displayOrder` support rich admin filtering, e.g. "all Active appointments").
12. **committeesPage** — T: PASS (hero-wrapper pattern, consistent with its 9 CMS-domain siblings). A: PASS.
13. **boardMembersPage** — T: PASS. A: PASS.
14. **contactUsPage** — T: PASS (`phones[]` supports multiple labeled numbers; `address` is a structured object, not a single string). A: PASS.

### Domain 2 — People & Organizations (16 named; **12 represented, 4 NOT REPRESENTED — see §1.1**)

1. **clubs** — T: GAP — `introVideoId` refs `mediaAssets` (images-only) instead of `videos`; see A1. A: PASS (`status` Active/Inactive, `clubType` enum support admin filtering).
2. **athletes** — T: **GAP** — no `slug` field. Every comparable public-detail-page entity on the board (`coaches`, `clubs`, `championships`, `articles`, `externalMediaCoverage`, `staticPages`, `disciplines`, `publicEvents`) explicitly carries a `slug (unique) — for detail page routing`; `athletes` — the collection with arguably the highest-traffic individual detail pages on the whole site — has none. A: PASS (`residencyType`/`federationName` support a Local/Guest filter).
3. **athleteGuardianRelationships** — T: PASS (`[SENSITIVE-MINOR]`-adjacent fields correctly `[RESTRICTED]`, `consentDocId` correctly refs `documents`). A: PASS (`relationshipType` + `isActive` support admin listing).
4. **coaches** — T: GAP — `nationality` plain String, see A3. A: PASS.
5. **officials** — T: **GAP** — no `slug` field, same reasoning as `athletes` above; also `nationalityId` here (unlike `nationality` on coaches/personnel) correctly refs `countries`, making the *other* two collections' plain-String pattern look more clearly like the outlier. A: PASS.
6. **athleteClubHistory** — T: PASS. A: PASS (`startDate`/`endDate` support a "current club" query, though see C6 for cascade risk on `athleteId`/`clubId` deletion).
7. **coachClubHistory** — T: PASS. A: PASS.
8. **officialClubHistory** — T: PASS. A: PASS.
9. **officialAssignments** — T: PASS (`targetType`/`targetId` poly correctly resolved to `Championship | ChampionshipEvent` per the 2026-09-01 disambiguation). A: PASS.
10. **venues** — T: PASS (`ownerClubId` optional, correctly nullable for neutral/national venues). A: PASS.
11. **countries** — T: PASS (`type` enum Country|Emirate lets one collection serve both nationality and emirate-of-registration needs). A: PASS — flagged 🔒 PROTECTED REFERENCE DATA, appropriately restricted-edit.
12. **clubTeams** — T: PASS. A: PASS (`gender`/`ageCategoryId` support admin squad-listing).
13. **athleteProfiles** — **NOT REPRESENTED in the current Physical Model — flagged for review** (see §1.1).
14. **athleteCoachHistory** — **NOT REPRESENTED in the current Physical Model — flagged for review** (see §1.1).
15. **athleteNationalTeamHistory** — **NOT REPRESENTED in the current Physical Model — flagged for review** (see §1.1).
16. **officialProfiles** — **NOT REPRESENTED in the current Physical Model — flagged for review** (see §1.1).

### Domain 3 — Athletics (14)

1. **events** — T: PASS (`componentEventIds` self-ref for Combined disciplines correctly ordered `[ObjectId]`). A: PASS.
2. **ageCategories** — T: PASS. A: PASS.
3. **seasons** — T: PASS. A: PASS.
4. **championshipSeries** — T: PASS (deliberately minimal — `name` + tracking only). A: PASS.
5. **championships** — T: PASS (`slug` present, `locationText` correctly optional-alternative to `venueId`). A: PASS (`status` 5-value enum, `organizerRole` support rich filtering).
6. **championshipEvents** — T: PASS. A: PASS (`gender`/`minAge`/`maxAge` support per-championship configuration queries).
7. **competitionStages** — T: PASS (`nextStageId` self-ref, `stageType` correctly identifies the one medal-awarding value). A: PASS.
8. **qualificationPaths** — T: PASS (both `sourceType`/`targetType` fully resolved poly, no stale "events" naming left). A: PASS.
9. **participations** — T: PASS (`representationType` Club|NationalTeam is a clean, well-modeled distinction). A: PASS (`status` 4-value enum, `bib` support admin/ops workflows).
10. **results** — T: PASS (`attempts[]`/`heights[]` mutual-exclusivity enforced by pre-save validator per the note; `outcomeStatus` correctly nulls out `performanceValue`/`rank`/`medal` when DNF/DNS/DQ). A: PASS (`verificationStatus` 4-value enum + `enteredBy` give a complete "who entered this, is it verified" admin picture).
11. **recordCandidates** — T: PASS (`reviewStatus` + `reviewedBy` + `reviewDate` fully support the Result→Candidate→Review pipeline). A: PASS.
12. **records** — T: PASS (`supersededById` self-ref maintains record-history chain). A: PASS.
13. **rankingsCache** — T: PASS (explicitly a cache/denorm collection — `rebuiltAt` timestamp documents freshness). A: PASS — being a cache, it has no independent admin-edit workflow by design, which is correct for its role, not a gap.
14. **disciplines** — T: PASS (`slug` present, promoted from an enum to a full content model per its own note). A: PASS — flagged 🔒 PROTECTED REFERENCE DATA, restricted-edit.

### Domain 4 — Content (6)

1. **articles** — T: PASS (`authorUserId` present — the one entity that does have it, per A3). A: PASS.
2. **contentCategories** — T: PASS. A: PASS.
3. **externalMediaCoverage** — T: PASS. A: PASS. (`addedBy`, not `authorUserId` — see A3.)
4. **externalPublishers** — T: PASS (deliberately minimal). A: PASS.
5. **staticPages** — T: PASS. A: PASS. (`modifiedBy`, not `authorUserId` — see A3.)
6. **publicEvents** — T: PASS (`slug` present). A: PASS — carries the second independent `status` (Upcoming/Ongoing/Completed) alongside `publicationState`, already flagged in 08-doc §3.13 Scenario 5, not re-litigated here.

### Domain 5 — Media Center (3)

1. **albums** — T: PASS (self-nesting via `parentAlbumId` deliberately kept as a text note rather than a connector, avoiding a known FigJam self-loop rendering bug). A: PASS — its own 3-value `publicationState`, documented as intentional (A4).
2. **mediaAssets** — T: PASS for its scope (images-only per the 2026-09-01 domain split). A: PASS — as a pure asset-storage collection referenced by dozens of others, it correctly carries no `publicationState` of its own (visibility is governed by the referencing entity).
3. **videos** — T: PASS (`isLive` uniqueness enforced by a partial index + pre-save hook per the note — a genuinely well-specified mechanism, not just an intention). A: PASS.

### Domain 6 — Documents (1)

1. **documents** — T: PASS structurally, but see A6 (this table's height causes the only two cross-domain layout overlaps besides the strategicPlansPage/clubTeams pair). Two usage modes (`ownerId` generic attachment vs. `governanceDocuments.fileId`/`strategicPlansPage.documentId` primary-content forward-reference) are explicitly documented as non-redundant by the domain note at `95:7430` — PASS, not a gap, because the distinction is deliberate and stated. A: PASS (`documentType`/`ownerType` support rich admin filtering); `expiryDate` is explicitly informational-only per the 2026-09-01 FIELD PRECEDENCE RULE, not a silent state — correctly documented, not a gap.

### Domain 7 — Workflow / Approval / Revision / Publication (9)

1. **workflowDefinitions** — T: PASS. A: GAP carried from 08-doc §2.B — no version field, no enforced-uniqueness on `entityType`; not re-derived here, already fully documented there.
2. **workflowSteps** — T: PASS (`stepType`+`requiredApprovals` cleanly cover Sequential/Any/N-of-M without a fourth enum). A: PASS.
3. **workflowInstances** — T: PASS — the 2026-09-01 `revisionId` addition (§1.2) closes what was previously the single most significant traceability gap in this domain. A: GAP carried from 08-doc §2.P — no concurrency guard (no unique index on `(entityType, entityId)`, no active-instance flag); not re-derived, already fully documented there and still accurate.
4. **workflowActionHistory** — T: PASS — the 2026-09-01 per-action `revisionId` (§1.2) means even a resubmit-after-reject sequence keeps an exact, permanent record of which revision each action targeted. A: PASS.
5. **revisions** — T: PASS (immutability structurally enforced by the total absence of `updatedAt`/`updatedBy` fields — a documented, verified exception to the standard 6-field pattern). A: PASS for its narrow, deliberately minimal role.
6. **publications** — T: PASS (`workflowInstanceId` optional but present, giving full approval→publish traceability). A: PASS. `status` now 3-valued (`Live|Unpublished|Archived`) per §1.2 item 1.
7. **notifications** — T: GAP carried from 08-doc §7 — no `workflowStepId`, step context requires a second hop through `workflowInstances.currentStepId`; not re-derived. A: PASS (`channel`/`readState`/`deliveryState` give a complete per-notification admin/ops picture).
8. **auditLogs** — T: PASS for its deliberately unrestricted `entityId` (see C7 for the separate coverage question). A: PASS (`ipAddress`/`userAgent`/`previousValue`/`newValue` give complete forensic detail).
9. **workflowPolicies** — T: PASS — the 2026-09-01 `Unpublish`/`Archive` operation additions (§1.2 item 2) close what was previously an Architectural GAP. A: PASS (`allowHardDelete` per entityType+operation, correctly defaulting to false).

### Domain 8 — Platform Administration (4)

1. **users** — T: PASS (`roleIds` correctly `[ObjectId]` N:N per the NIST-RBAC correction note; `authMethods[]` supports the confirmed hybrid-login model). A: PASS (`accountStatus` 3-value enum). See C6 — this collection is the single largest undocumented cascade-risk surface on the entire board (referenced by `createdBy`/`updatedBy`/`archivedBy` on effectively every other collection, plus dozens of direct FK fields), a finding that belongs to Part C, not a completeness gap in `users` itself.
2. **roles** — T: PASS (`permissionIds` N:N). A: GAP — no field distinguishes a small number of system-critical roles (e.g. a "Super Admin" role) from ordinary admin-created roles; nothing prevents an admin from renaming or deleting a role that RBAC-critical permissions currently depend on. Not asserted elsewhere on the board — a genuine, specific administrative gap.
3. **permissions** — T: PASS (`resourceType` is a free String, correctly *not* a closed enum, which is what makes C2's RBAC-coverage answer PASS). A: PASS.
4. **departments** — T: PASS. A: PASS (deliberately minimal reference data).

### Domain 9 — Sponsorship / Institutional Relationships (4)

1. **sponsors** — T: PASS (`restricted` object correctly groups all commercially-sensitive fields under one `[RESTRICTED]` tag rather than scattering them). A: PASS.
2. **sponsorships** — T: PASS (`bannerAssetId`/`promotionalText` correctly validator-enforced to `tier=Strategic` only, per the note). A: PASS (`status` 3-value enum).
3. **partnerships** — T: PASS (external party kept inline by design, no standalone Organization model, per the domain note — correctly not flagged as a missing entity). A: PASS.
4. **memberships** — T: PASS (same inline-reference pattern as partnerships, explicitly noted as a deliberate rename+simplification from Baseline). A: PASS (`status` 3-value enum).

### Domain 10 — Public Communication (1)

1. **contactMessages** — T: GAP, already exhaustively documented in 08-Workflow-Scenario-Review.md §3.12 (poly-list inclusion in `revisions`/`publications` despite having no `publicationState` to sync into) — not re-derived here. A: PASS — its own primary `status` field, `assignedToId`/`assignedToType` routing, and `replyBody`/`repliedAt`/`repliedBy`/`replyChannel` give a genuinely complete case-management surface, better administratively specified than most other collections on the board. See A6 (layout overlap with `siteSettings`) and C5/C6 (PII + HardDelete considerations, Part C).

### Domain 11 — CMS & Page Composition (13)

1. **siteSettings** — T: PASS (singleton, `defaultSeo`/`cookieConsentEnabled`/`isMaintenanceMode` cover the expected site-wide config surface). A: PASS. See A6 (layout overlap with `contactMessages`).
2. **navigationMenus** — T: PASS. A: PASS.
3. **navigationItems** — T: PASS (self-ref `parentItemId` for dropdowns). A: PASS.
4. **pages** — T: PASS (`status` Draft|Published, `seo` embed). A: PASS.
5. **pageSections** — T: PASS — the largest, most carefully cross-referenced poly list on the board (`items` → 10 valid target types, individually verified in A1). A: PASS (`visibleFrom`/`visibleUntil` support scheduled promotional content without manual on/off toggling).
6. **heroSlides** — T: PASS (`mediaType` IMAGE|VIDEO correctly branches to `imageAssetId`→`mediaAssets` vs `videoId`→`videos` — the correct pattern that makes `clubs.introVideoId`'s inconsistency, A1, stand out clearly). A: PASS (`scheduledFrom`/`scheduledTo`).
7. **athletesPage** — T: PASS (hero-wrapper pattern). A: PASS.
8. **coachesPage** — T: PASS. A: PASS.
9. **resultsRankingsPage** — T: PASS. A: PASS.
10. **recordsPage** — T: PASS. A: PASS.
11. **newsPage** — T: PASS. A: PASS.
12. **clubsPage** — T: PASS. A: PASS.
13. **disciplinesPage** — T: PASS. A: PASS.

---

## 4. Part C — Security & Robustness Findings

### C1 — PII/sensitivity classification audit
**Verdict: PASS.** Every field that stores personally identifiable or sensitive information was individually checked against its Notes-cell tag:
- `athletes.dateOfBirth` → `[SENSITIVE-MINOR]`, correctly cites ADR-0028/Federal Law 26/2025 ✓
- `athleteGuardianRelationships.guardianName`/`guardianContact` → `[RESTRICTED]` ✓
- `federationPersonnel.internalContact` (`personalEmail`, `idNumber`) → `[RESTRICTED]` ✓, correctly split from `publicContact` which is `[PUBLIC]`
- `users.email`, `authMethods` (password hash), `passwordResetToken`/`passwordResetExpiresAt` → all `[RESTRICTED]` ✓
- `contactMessages.senderName`/`senderEmail`/`senderPhone`/`messageBody`/`replyBody` → all `[RESTRICTED]` ✓
- `sponsors.restricted.{contactEmail,contactPhone,contractValue,contractDocId}` → correctly grouped `[RESTRICTED]` ✓
- `clubs.email`/`phone` → `[PUBLIC]`, correctly so (institutional, not personal, contact data meant for public display)

No field storing national ID, passport, or medical/health data was found anywhere on the board outside `federationPersonnel.internalContact.idNumber` (correctly restricted) — there is no dedicated medical/health-data collection or field at all, so there is nothing un-flagged to report there.

One lower-confidence observation, not a defect: `documents.file` is blanket-marked `[RESTRICTED]` even though `documents` rows are also the primary content behind public governance PDFs (via `governanceDocuments.fileId`/`strategicPlansPage.documentId`). The board does not state how the application layer reconciles a `[RESTRICTED]`-tagged field with a page that is supposed to let the public download that same file — plausibly intentional (the *field* is restricted at the data layer; public exposure is a `publicationState`-gated application decision), but worth a product/architecture confirmation rather than an assumption.

### C2 — RBAC coverage
**Verdict: PASS.** `permissions.resourceType` (table `103:7901`) is a plain, unrestricted `String` — not a closed enum tied to a fixed entity list — so every one of the 81 collections can in principle be named as a resource a NestJS Guard checks against `permissions.action` (`Create|Read|Update|Delete|HardDelete|Approve|Publish|EditProtectedData`). No collection is structurally excluded from permission-gating.

### C3 — HardDelete exposure
**Verdict: PASS for the rule as literally written, with one precise scope caveat.** `workflowPolicies.allowHardDelete` (per entityType+`Delete` operation) plus the documented rule that HardDelete is blocked while any `revisions` row references the entity is mechanically enforceable exactly as stated: a pre-delete check need only query `revisions` for `(entityType, entityId)` existence — no missing field is required.

**Caveat, evidence-based, not speculative:** that check is meaningless for `contactMessages`, because `contactMessages` was deliberately excluded from `revisions`'s 12-type poly list on 2026-09-01 (§1.2/A5) — it *can never have* a `revisions` row, so the "blocked while revisions reference it" gate would always evaluate to "not blocked" for the one entity type the audit brief itself calls out as most sensitive here (citizen PII). This is a real, narrow gap: the schema's only structural HardDelete safety-check does not, and structurally cannot, apply to the entity most in need of a deliberate deletion review.

### C4 — Guardian/minor-data protection
**Verdict: PASS — re-verified, no denormalization leak found.** Checked every place `athletes` data is denormalized/snapshotted elsewhere on the board:
- `results.athleteRef` snapshot = `{athleteId, name, nationalityId}` — no `dateOfBirth` copied ✓
- `records.athleteRef` snapshot = `{athleteId, name, photoId}` — no `dateOfBirth` copied ✓
- `rankingsCache.entries[].athleteRef` snapshot = `{name, clubId}` per its note — no `dateOfBirth` copied ✓

`athleteGuardianRelationships` is correctly and consistently `[RESTRICTED]` throughout. The unified `athletes` collection does not use a different, less-protected field for Guest-residency minors — `dateOfBirth`'s `[SENSITIVE-MINOR]` tag applies uniformly regardless of `residencyType`.

### C5 — Anonymous/unauthenticated input surfaces
**Verdict: PASS.** `contactMessages` is confirmed, by exhaustive check of all 81 collections' `createdBy` fields, to be the only one where `createdBy` is absent entirely (every other collection has it as an optional `ref → users`). No other collection has an equivalent unauthenticated-write shape. Its PII fields are all correctly `[RESTRICTED]` (re-confirmed under C1).

### C6 — Cascade/orphan risk
**Verdict: GAP — substantially broader than the four cases 08-Workflow-Scenario-Review.md §7 already flagged (`governanceDocuments`↔`documents`, `committees`↔`federationAppointments`, `organizationalStructure` self-references, `contactMessages` PII), which are correct and are not re-derived here.**

Two systemic, schema-wide "hub" collections carry undocumented cascade risk that dwarfs the individually-flagged cases:

- **`users`** is the target of an optional `createdBy`/`updatedBy`/`archivedBy` on effectively all 81 collections, *plus* hard-reference fields that are not optional-tracking but core data: `workflowSteps.assigneeIds`, `workflowActionHistory.actorId`/`delegatedToUserId`, `notifications.recipientId`, `results.enteredBy`, `recordCandidates.reviewedBy`, `publications.publishedBy`, `contactMessages.repliedBy`/`assignedToId`, `revisions.createdBy`, `users.personId`'s own self-referential `createdBy` chain. Nothing on the board states what happens to any of this when a `users` row is hard-deleted.
- **`mediaAssets`** is referenced by `logoId`/`coverImage`/`heroImageId`/`photoId`/`thumbnailId`/`imageAssetId`-style fields across dozens of collections in every domain. No cascade or orphan-prevention rule is documented for it either.

Additional specific pairs beyond what 08-doc already covers:
- `clubs` deletion would orphan `athleteClubHistory`, `coachClubHistory`, `officialClubHistory`, `clubTeams`, `venues.ownerClubId`, and `rankingsCache.clubId` rows.
- `athletes` deletion would orphan `athleteClubHistory`, `athleteGuardianRelationships`, `participations.athleteIds`, and `clubTeams.athleteIds`.
- `venues` deletion would orphan `clubs.venueId`, `championships.venueId`, `championshipEvents.venueId`, `publicEvents.venueId`.
- `disciplines`/`countries` deletion would orphan the several `athletes`/`coaches`/`officials`/`events` fields that reference them — partially mitigated in practice by both being flagged `🔒 PROTECTED REFERENCE DATA` (edit-restricted to Super/Technical Admin), but the mitigation is an access-control convention, not a cascade rule.
- `documents` deletion would orphan `athleteGuardianRelationships.consentDocId`, `championships.regulationsDocId`, and `sponsors.restricted.contractDocId`, in addition to the `governanceDocuments`/`strategicPlansPage` cases 08-doc already flagged.

### C7 — Audit trail robustness
**Verdict: Not represented in the current Physical Model — flagged for review.**

`auditLogs.entityId` is explicitly documented as "intentionally unrestricted; generic audit trail covers all business entities" (i.e. it is *capable* of logging changes to any collection, including `users`/`roles`/`permissions`). But capability is not the same as an enforced guarantee: nothing on the `users`, `roles`, or `permissions` tables themselves — no field, no note, no trigger reference — states that a change to a user's `roleIds`, a role's `permissionIds`, or a permission row is actually written to `auditLogs`. Per the No-Guessing Rule, this is reported as unverifiable from the schema rather than assumed either way: RBAC-change auditing may be intended to happen entirely at the application layer with no schema signal, or it may simply not have been decided yet.

---

## 5. Summary Table

| Part | Category | Count |
|---|---|---|
| A | PASS | A2, A4, A5, A7 (4) |
| A | GAP / FAIL | A1 (narrative + 1 field anomaly), A3 (2 findings), A6 (3 overlaps) |
| B — Technical | PASS | 74 of 81 represented collections |
| B — Technical | GAP | `governanceDocuments`, `federation`, `federationPersonnel`, `clubs`, `athletes`, `coaches`, `officials` = 7 |
| B — Technical | NOT REPRESENTED | `athleteProfiles`, `athleteCoachHistory`, `athleteNationalTeamHistory`, `officialProfiles` = 4 |
| B — Administrative | PASS | 79 of 81 represented collections |
| B — Administrative | GAP | `roles` = 1; `contactMessages` and `workflowDefinitions`/`workflowInstances`/`notifications` carry previously-documented (not newly-found) GAPs, not double-counted here |
| B — Administrative | NOT REPRESENTED | same 4 as above |
| C | PASS | C1, C2, C4, C5 (4) |
| C | GAP (with caveat) | C3 (1) |
| C | GAP | C6 (1, broad) |
| C | Not represented / unverifiable | C7 (1) |

---

## 6. Highest-Priority Findings (top 10, ranked by real-world impact)

1. **Scope discrepancy: 4 of the claimed 85 collections do not exist on the live board** (§1.1). `residencyType=Local` on both `athletes` and `officials` asserts a foreign-key relationship into collections that are not represented. Any implementation of the Local/Guest model today has nothing to link to. **DESIGN DECISION REQUIRED** — either the four collections need to be added to the board, or the residency-type Notes cells need to stop asserting them.
2. **`athletes` and `officials` have no `slug` field**, unlike every comparable public-detail-page entity on the board (B, Domain 2 #2 and #5). This will block individual athlete/official profile-page routing the moment implementation reaches that feature. **DESIGN SYSTEM GAP** — concrete, fixable, high-confidence.
3. **`users` and `mediaAssets` are undocumented, schema-wide cascade-risk hubs** (C6) — far broader than the four cases already known from 08-Workflow-Scenario-Review.md. A HardDelete on either collection has effectively unbounded, unspecified blast radius across the schema.
4. **Three genuine bounding-box overlaps on the live board** (A6), including one directly involving `documents` and the start of the entire Workflow domain, and one involving `contactMessages` and `siteSettings` at full column width. Flagged as a mechanical layout defect that should be corrected via the Figma desktop UI per project governance (no auto-fix performed).
5. **`contactMessages` is structurally exempt from the schema's only HardDelete safety-check** (C3) — the one entity the audit brief calls out as most PII-sensitive is the one entity for which "blocked while revisions reference it" can never trigger, because it can never have a `revisions` row.
6. **RBAC-change auditing is unverifiable from the schema** (C7) — no evidence either way that changes to `users.roleIds`/`roles.permissionIds`/`permissions` rows are captured in `auditLogs`.
7. **Five different field names for "who is responsible for this content"** (A3: `authorUserId`/`addedBy`/`modifiedBy`/`uploadedBy`/`enteredBy`), plus two collections (`coaches`, `federationPersonnel`) storing nationality as a non-bilingual plain String while their peers (`athletes`, `officials`) correctly reference `countries`.
8. **`clubs.introVideoId` references the images-only `mediaAssets` collection instead of `videos`** (A1) — a concrete, narrow, fixable field-typing inconsistency, made obvious by contrast with the correct pattern used on `heroSlides.videoId`.
9. **`federation`'s tracking fields are the only ones on the board typed `Date` instead of `DateTime` and tagged `[PUBLIC]` instead of `[RESTRICTED]`** (Part B, Domain 1 #9) — narrow but worth a deliberate decision rather than silent drift.
10. **`roles` has no protection against renaming/deleting a system-critical role** (Part B, Domain 8 #2) — a specific, nameable administrative gap with real operational consequence (accidental RBAC breakage) if it occurs in production.

---

## 7. Open Questions for Product/Architecture Review

1. Do `athleteProfiles`, `athleteCoachHistory`, `athleteNationalTeamHistory`, and `officialProfiles` still need to be modeled, and if so, on what schedule — or should the `residencyType` Notes cells on `athletes`/`officials` be corrected to stop referencing them?
2. Should `athletes` and `officials` gain a `slug` field for detail-page routing, matching `coaches`/`clubs`/`championships`/etc.?
3. What is the intended HardDelete/orphan-handling policy for `users` and `mediaAssets` specifically, given their schema-wide fan-in?
4. Should `contactMessages` get its own, entity-specific HardDelete safeguard (e.g. a mandatory review step, or an explicit different rule), given it cannot rely on the `revisions`-existence check that protects the other 12 workflow-eligible entities?
5. Is RBAC-change auditing (writes to `users.roleIds`, `roles.permissionIds`, `permissions`) intended to flow into `auditLogs`, and if so, does that need a schema signal or is it purely an application-layer decision?
6. Should the "who authored/added/uploaded/entered this" field be standardized to one name across all editorial and data-entry collections, now that the self-approval rule no longer depends on any specific one of them?
7. Should `coaches.nationality` and `federationPersonnel.nationality` be converted to `ref → countries`, matching `athletes`/`officials`?
8. Is `clubs.introVideoId` meant to reference `videos` instead of `mediaAssets`, or is it actually meant to hold a still image and simply misnamed?
9. Is `federation`'s `[PUBLIC]`/`Date`-typed tracking-field pattern intentional, or should it be brought in line with the schema-wide `[RESTRICTED]`/`DateTime` convention used everywhere else?
10. Should `roles` gain a protection mechanism (e.g. a `isSystemRole` flag or delete-guard) for roles that RBAC-critical permissions currently depend on?

---

**Note on prior documents:** this audit found that several specific findings in `docs/product/08-Workflow-Scenario-Review.md` (self-approval rule enforceability, `Publish`/`Unpublish`/`Archive` policy coverage, the missing `workflowInstances.revisionId` link) were resolved on the live board on 2026-09-01, after that document was written. That document's remaining findings (Scenario 4 in-place-mutation ambiguity, Scenario 6 concurrency gap, Scenario 9 audit-boundary question, the Role/Committee-assignment NEEDS-DECISIONs, and the `governanceDocuments`↔`documents` coordination question) were independently re-verified during this pass and remain accurate. Per §27 of the project governance file, this audit does not re-litigate items already closed there; §1.2 above documents exactly which ones moved and why.

# Spec — Authorization, Authentication, Accounts & Profiles

| | |
|---|---|
| **Date** | 2026-09-26 |
| **Status** | Awaiting owner approval (Batch 0 deliverable — no code written) |
| **Authority** | Product Owner brief, 2026-09-26 (decisions A1–F10, stated as explicit approval including the schema and guard changes they imply) |
| **Evidence base** | [`docs/reviews/accounts-profiles-review.md`](../../reviews/accounts-profiles-review.md) · [`docs/reviews/roles-permissions-review.md`](../../reviews/roles-permissions-review.md). Line references are theirs and are not re-derived here. |
| **Plan** | [`docs/superpowers/plans/2026-09-26-authz-authn.md`](../plans/2026-09-26-authz-authn.md) |

---

## 0. Conflicts with approved documentation — **resolved**

CLAUDE.md §1 puts the approved Design System above a task brief, and §24 requires
a conflict to be reported rather than guessed. Four were found and all four are
now decided by the owner (2026-09-26). Each subsection records the conflict, then
the decision taken. §13 carries the same decisions as a flat list.

### 0.1 Audit-log retention — brief vs Chapter 17 §3

- **Brief C1:** «الاحتفاظ بلا حد زمني» — retain the audit log indefinitely.
- **Chapter 17 §3** (under ADR-0028, Accepted, authority Federal Decree-Law
  45/2021 PDPL): *"Every data category MUST have an explicitly defined retention
  period. 'Indefinite retention' MUST NOT be used as the default without
  periodic review."*

These are not reconcilable as written. The chapter does not forbid long
retention; it forbids *indefinite with no review*.

**Decided (owner, 2026-09-26).** No deletion, ever, and **no deletion mechanism
is built** — there is nothing to misuse. The retention period becomes "explicitly
defined" through a named annual review, recorded in ADR-0028 and ADR-0112:

| | |
|---|---|
| **Who reviews** | a Super Admin **and** the federation's data officer, together — neither alone |
| **When** | annually |
| **What the review records** | the period covered, the row count, which categories were examined, whether anything requires escalation, and the reviewers' names — written as an `auditLogs` entry of its own, so the review of the log lives in the log |
| **What it may change** | nothing about the stored rows. The review is an examination, not a purge. |

This satisfies the chapter without giving anyone the ability to remove a row.

### 0.2 Audit scope — Chapter 17 §7 demands more than the brief

- **Brief A3** audits **exports** of sensitive data.
- **Chapter 17 §7:** *"Every **access to** or modification of data classified as
  `Restricted` or `Sensitive/Minor` MUST generate an audit record"*, identifying
  who, when, and **which specific record**. *"A vague or generic access log MUST
  NOT be considered sufficient."*

So the approved chapter requires auditing **reads** of sensitive fields, not only
exports. The brief is narrower than the standard it inherits.

**Decided (owner, 2026-09-26): implement the chapter, not the brief.** Any
response that actually returns a `Restricted` or `Sensitive/Minor` field writes a
`SensitiveRead` row naming the record, **debounced once per (actor, record,
minute)**. Exports keep their own row as the brief specifies. Detail in §6.3.

### 0.3 Security settings already have two homes — the brief proposes a third

`sessionTimeoutMinutes` and `maxLoginAttempts` exist **today** in two places:

| Where | Values | Note |
|---|---|---|
| `api/src/config/auth.config.ts:10-11` | `LOCKOUT_THRESHOLD = 5`, `LOCKOUT_DURATION_MINUTES = 15` | Hard constants. Header says deliberately *not* env-driven. |
| `siteSettings.sessionTimeoutMinutes`, `siteSettings.maxLoginAttempts` | nullable, `[RESTRICTED]` | `site-settings.schema.ts:128-135`. The schema comment **already flags this overlap**: *"See the flagged overlap with `config/auth.config.ts` above."* |

Brief B5 asks for a security-settings singleton holding the same two numbers.
Built literally, one number would live in three places.

**Decided (owner, 2026-09-26).** `securitySettings` is the **single** source. The
two `siteSettings` fields are copied across by an idempotent migration and then
**removed from the schema** — not left deprecated in place, which would be a third
copy that merely looks retired. `auth.config.ts` keeps only the floor/ceiling
bounds, which B5 requires to be backend-enforced and un-overridable.

### 0.4 Cross-tab session expiry is an approved requirement the brief omits

**Chapter 17 §6:** *"Session expiration MUST be synchronized across all open
browser tabs belonging to the same user session"*, consuming Chapter 8 L4 §FB.24.
Brief B4/D2 does not mention it. It is in scope by inheritance.

**Decided (owner, 2026-09-26).** Expiry **and sign-out** reach every open tab,
via `BroadcastChannel` with a fallback on the `storage` event for contexts where
the channel is unavailable. Detail in §7.4.

### 0.5 Two further documentation facts, for the record

- **ADR-0029 (Accepted)** mandates an Identity Provider Abstraction: business
  logic must not depend on one provider's details. Its *Consequences* row says
  *"Chapter 21 will document the detailed technical implementation"* — **Chapter
  21 is frontend architecture only** and contains no such section. This spec is
  therefore the first technical record for it, and §7 keeps TOTP behind the
  abstraction so ADR-0029 is not breached. The missing chapter section is a
  documentation gap, logged in the plan's backlog, not a blocker.
- **ADR-0028 §2** requires documented, withdrawable parental consent for minors,
  with immediate effect on withdrawal. No consent fields exist in any schema. It
  is **out of scope** for this brief (§6 of the brief scopes minors only as a
  sensitive-field concern) and is logged in the backlog as a compliance gap, not
  silently absorbed.

---

## 1. Scope

**In:** the authorization model (capability map, scopes, grant/assign rules,
Super Admin protection), authentication (TOTP 2FA, trusted device, step-up,
sessions, password policy, break-glass, setup links), audit completeness,
sensitive-field protection, export/print/reports, role reset and templates, the
profile/appointment/committee API gaps, and the dashboard screens for all of it.

**Out** (brief §6): dashboard screens for people/board/committees; redesign of
those public pages (only F1 on the site); `organizationalStructure` and executive
departments; SSO/OAuth/SMS/email-OTP-as-primary; any auth change beyond B1–B6,
A10, A11.

**Protected** (brief §8): the per-request resolution and `permissions.guard.ts`
comparison logic — changed only to read the capability map and scopes, with no
per-role branch; the workflow engine beyond type registration, editorial-cycle
completion, A6 and A7; `AuditLogsRepository` append-only; the
`[PUBLIC]`/`[RESTRICTED]` split and allow-list `toPublicResponse`;
`supersedesAppointmentId`; `bootstrap-admin`'s current behaviour.

---

## 2. Authorization model

### 2.1 Action vocabulary (A1)

Eleven per-resource verbs. `Delete` is renamed `Archive` (A2), and the two dead
verbs found by the review (`HardDelete`, `EditProtectedData` — zero resources
each) are retired in favour of `PermanentDelete` and `ViewSensitive`.

| Verb | Meaning |
|---|---|
| `Read` | list and open |
| `Create` | add a record |
| `Update` | change a record |
| `Archive` | soft delete (`archivedAt`) — today's `Delete` |
| `Restore` | clear `archivedAt` |
| `PermanentDelete` | destroy the row. `purgeable` resources only, refused while published or referenced, step-up required, always audited |
| `Export` | bulk extraction to a file |
| `Print` | render a print view |
| `ViewSensitive` | see `Restricted` / `Sensitive-Minor` fields (Ch.17 §1) on this resource, on screen and in files |
| `Publish` | put on the public site; also the on/off switch (ADR-0102 §D2) |
| `Approve` | act on a review step for this resource |

**Group verbs:** `ViewReports`, `Export` and `Print`, held per product group
(owner decision, Q4 option 2 — see §2.6).
**Administrative verbs:** `ManageRoles`, `AssignRoles`, `ViewAuditLog`,
`ManageSecuritySettings`.

**Five pairs are un-grantable** — reserved to the Super Admin and refused to
every role (owner decision 4, §3.4): `users:Create`, `users:Update`,
`users:AssignRoles`, `roles:ManageRoles`, `securitySettings:ManageSecuritySettings`.
`auditLogs:ViewAuditLog` stays grantable by decision.

### 2.2 How the new verbs fit the existing pair shape — no guard rewrite

The guard compares a flat `(resourceType, action)` pair
(`permissions.guard.ts:57-60`). That stays exactly as it is, with no per-role
branch, which is what brief §8 protects. The new concepts attach as follows:

- **Administrative verbs are ordinary pairs on the resource they govern:**
  `roles:ManageRoles`, `users:AssignRoles`, `auditLogs:ViewAuditLog`,
  `securitySettings:ManageSecuritySettings`. No new mechanism.
- **`ViewReports` uses ten group pseudo-resources**, one per product group,
  carrying that single verb: `governanceReports`, `peopleReports`,
  `athleticsReports`, `mediaReports`, `documentsReports`, `workflowReports`,
  `platformReports`, `sponsorshipReports`, `commsReports`, `cmsReports`. The
  groups are **not invented here** — they are the ten domains already derived
  mechanically in `apps/dashboard/src/lib/admin/resource-domains.ts`, which maps
  all 69 resources with a completeness test.
- **Scopes are a column on the permission row, not a verb** (§2.4).

### 2.3 The capability map is the single source

One declaration per resource, naming only the verbs that resource has. It
replaces the hand-written `PERMISSION_CATALOGUE` as the source of truth:

```ts
// api/src/common/authz/capability-map.ts
export interface ResourceCapability {
  resourceType: PermissionResource;
  group: ProductGroup;
  actions: readonly PermissionAction[];
  /** PermanentDelete is offered only where this is true (A2, Ch.17 §3/§4). */
  purgeable: boolean;
  /** Field paths gated by ViewSensitive, with their Ch.17 §1 class. */
  sensitiveFields: readonly { path: string; class: 'Restricted' | 'SensitiveMinor' }[];
  /** A5 — editorial content only. */
  scopes: readonly ('own' | 'all')[];
}
```

`PERMISSION_CATALOGUE` becomes **derived** from it, so the existing
`permission-catalogue.spec.ts` invariant keeps working unchanged and gains a
third direction: every declared capability must be guarded by a decorator, every
decorator must be declared, **and** the map must cover every resource.

> **Hard constraint that shaped this map.** `permission-catalogue.spec.ts:40-45`
> fails on *any* declared pair that no `@RequirePermission` guards. So a verb
> cannot be added to the map without the route that guards it landing in the same
> batch. This is why `Export`/`Print` are narrowed in §2.5 and why the plan pairs
> every new verb with its route.

### 2.4 Scopes (A5)

`own`/`all` on editorial content only — `articles`, `albums`, `videos`,
`heroSlides`. Administrative resources carry no scopes.

- `own` = `createdBy === actor` **and** the record has never been published
  (no `publications` row in state `Live` or `Unpublished`). Editing a published
  record needs `all`, or it goes through review per policy.
- **Representation:** `permissions` gains `scope: 'own' | 'all' | null`.
  `RolesService.resolvePermissions` returns it alongside the pair.
- **Enforcement:** the guard is unchanged — it still answers "may this actor
  touch this resource with this verb at all". The **row-level** check lives in
  the service, next to the write, reading current state. This follows CLAUDE.md
  §31: the guard evaluates at request time, and the ownership test must evaluate
  at the moment the write executes, not when the screen was opened.
- A role holding both `own` and `all` for a pair resolves to `all`.

### 2.5 The capability map — all 69 resources

Generated from the live catalogue, `resource-domains.ts` and
`workflow-entity-types.ts`; only `purgeable`, sensitive fields and scopes are
declared judgements, each traced to its rule.

`purgeable` follows **Chapter 17 §3/§4 alone**: true where a PDPL erasure right
or a §2 consent withdrawal can oblige destruction rather than archival — a data
subject's own personal data, and uploaded media (a withdrawn image must actually
go). **Ten** resources, after the owner's Q6 decision added `contactMessages`
(a citizen's own submission is plainly within an erasure right); `documents`,
`governanceDocuments`, `memberships`, `partnerships` and `sponsors` stay
archival-only until a case appears. The other 59 are false.

**SA-only** marks the five pairs the owner has declared un-grantable
(decision 4, §3.4): no role may hold them at all.

Sensitive fields are the **existing** `[RESTRICTED]` / `[SENSITIVE-MINOR]`
markers in the schemas, classified by Chapter 17 §1. Nothing is newly declared
sensitive except where the brief names it (residency status).

| # | Resource | Group | Read | Create | Update | Archive | Restore | PermDel | ViewSens | Publish | Approve | purgeable | SA-only | Sensitive fields (Ch.17 §1) | Scopes |
|--:|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|---|
| 1 | `aboutFederationPage` | Governance | • |  | • | • | **+** |  |  | • | **+** | no | — | — | — |
| 2 | `ageCategories` | Athletics | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 3 | `albums` | Media | • | • | • | • | **+** |  |  | • |  | no | — | — | own · all |
| 4 | `albumsPage` | Media |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 5 | `articles` | Comms | • | • | • | • | **+** |  |  | • | **+** | no | — | — | own · all |
| 6 | `athleteClubHistory` | People | • | • | • | • | **+** |  |  |  |  | no | — | — | — |
| 7 | `athleteCoachHistory` | People | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 8 | `athleteGuardianRelationships` | People | • | • | **+** | • | **+** | **+** | **+** |  |  | yes | — | R guardianContact.{phone,email} | — |
| 9 | `athleteNationalTeamHistory` | People | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 10 | `athleteProfiles` | People | • | • | **+** | • | **+** | **+** | **+** |  |  | yes | — | M restricted.{emiratesIdOrPassport,address,phone,email} | — |
| 11 | `athletes` | People | • | • | **+** | • | **+** | **+** | **+** |  |  | yes | — | M dateOfBirth; R residencyType | — |
| 12 | `athletesPage` | CMS |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 13 | `auditLogs` | Workflow | • |  |  |  |  |  |  |  |  | no | — | — | — |
| 14 | `boardMembersPage` | Governance |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 15 | `clubTeams` | People | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 16 | `clubs` | People | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 17 | `clubsPage` | CMS |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 18 | `coachClubHistory` | People | • | • | • | • | **+** |  |  |  |  | no | — | — | — |
| 19 | `coaches` | People | • | • | **+** | • | **+** | **+** |  |  |  | yes | — | — | — |
| 20 | `coachesPage` | CMS |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 21 | `committees` | Governance | • | • | **+** | • | **+** |  |  | **+** | **+** | no | — | — | — |
| 22 | `committeesPage` | Governance |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 23 | `contactMessages` | Comms | • |  | • | • | **+** | **+** | **+** |  |  | yes | — | ? submitter contact | — |
| 24 | `contactUsPage` | Governance |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 25 | `countries` | People | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 26 | `disciplines` | Athletics | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 27 | `disciplinesPage` | CMS |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 28 | `documents` | Documents | • | • | **+** | • | **+** |  |  | **+** | **+** | no | — | — | — |
| 29 | `electionCycles` | Governance | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 30 | `federation` | Governance | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 31 | `federationAppointments` | Governance | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 32 | `federationPersonnel` | Governance | • | • | **+** | • | **+** | **+** | **+** |  |  | yes | — | R internalContact.{personalEmail,idNumber} | — |
| 33 | `governanceDocuments` | Governance | • | • | **+** | • | **+** |  |  | **+** | **+** | no | — | — | — |
| 34 | `heroSlides` | CMS | • | • | • | • | **+** |  |  |  |  | no | — | — | own · all |
| 35 | `mediaAssets` | Media | • | • | **+** | • | **+** | **+** |  |  |  | yes | — | — | — |
| 36 | `memberships` | Sponsorship | • | • | • | • | **+** |  |  |  |  | no | — | — | — |
| 37 | `navigationItems` | CMS | • | • | • | • | **+** |  |  |  |  | no | — | — | — |
| 38 | `navigationMenus` | CMS | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 39 | `newsPage` | CMS |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 40 | `notifications` | Workflow |  | • | **+** |  |  |  |  |  |  | no | — | — | — |
| 41 | `officialAssignments` | People | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 42 | `officialClubHistory` | People | • | • | • | • | **+** |  |  |  |  | no | — | — | — |
| 43 | `officialProfiles` | People | • | • | **+** | • | **+** | **+** |  |  |  | yes | — | — | — |
| 44 | `officials` | People | • | • | **+** | • | **+** | **+** | **+** |  |  | yes | — | R residencyType | — |
| 45 | `organizationalStructure` | Governance | • | • | • | • | **+** |  |  | **+** | **+** | no | — | — | — |
| 46 | `pageSections` | CMS | • | • | • | • | **+** |  |  |  |  | no | — | — | — |
| 47 | `pages` | CMS | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 48 | `partnerships` | Sponsorship | • | • | • | • | **+** |  |  |  |  | no | — | — | — |
| 49 | `permissions` | Platform | • | • | **+** |  |  |  |  |  |  | no | — | — | — |
| 50 | `presidentMessagePage` | Governance | • | • | • | • | **+** |  |  | • | **+** | no | — | — | — |
| 51 | `publications` | Workflow | • |  |  |  |  |  |  | • |  | no | — | — | — |
| 52 | `recordsPage` | CMS |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 53 | `resultsRankingsPage` | CMS |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 54 | `revisions` | Workflow | • | • | **+** |  |  |  |  |  |  | no | — | — | — |
| 55 | `roles` | Platform | • | • | • | • | **+** |  |  |  |  | no | **ManageRoles** | — | — |
| 56 | `siteSettings` | CMS | • |  | • |  |  |  | **+** |  |  | no | — | R googleAnalyticsId, metaPixelId, isMaintenanceMode, systemEmailSender | — |
| 57 | `sponsors` | Sponsorship | • | • | • | • | **+** |  |  |  |  | no | — | — | — |
| 58 | `sponsorships` | Sponsorship | • | • | • | • | **+** |  |  |  |  | no | — | — | — |
| 59 | `strategicPlansPage` | Governance | • | • | • | • | **+** |  |  | • | **+** | no | — | — | — |
| 60 | `users` | Platform | • | • | • |  |  | **+** | **+** |  |  | yes | **Create, Update, AssignRoles** | ? email | — |
| 61 | `venues` | People | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 62 | `videos` | Media | • | • | • | • | **+** |  |  |  |  | no | — | — | own · all |
| 63 | `videosPage` | Media |  |  | • |  |  |  |  | • |  | no | — | — | — |
| 64 | `visionMissionPage` | Governance | • | • | • | • | **+** |  |  | • | **+** | no | — | — | — |
| 65 | `workflowActionHistory` | Workflow | • |  |  |  |  |  |  |  |  | no | — | — | — |
| 66 | `workflowDefinitions` | Workflow | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |
| 67 | `workflowInstances` | Workflow | • | • | • |  |  |  |  |  | • | no | — | — | — |
| 68 | `workflowPolicies` | Workflow | • | • | • |  |  |  |  |  |  | no | — | — | — |
| 69 | `workflowSteps` | Workflow | • | • | **+** | • | **+** |  |  |  |  | no | — | — | — |

**Legend.** `•` the resource already declares this pair today · `**+**` new pair this map introduces · **SA-only** verbs are declared un-grantable (owner decision 4) — no role may hold them, the sync gives them to the Super Admin alone.

**Totals.** 69 resources. New pairs introduced: Update **+30**, Restore **+47**, ViewSensitive **+8**, Publish **+4**, Approve **+9**, PermanentDelete **+10**. purgeable: 10 yes, 59 no. Un-grantable (Super Admin only): 5 pairs.

### The group table — `ViewReports`, `Export`, `Print`

Ten group pseudo-resources join `PERMISSION_RESOURCES`, each carrying three verbs. **30 pairs total**, replacing the 99 per-resource `Export`/`Print` pairs (owner decision, Q4 option 2).

| Group pseudo-resource | Covers the resources of | ViewReports | Export | Print |
|---|---|:-:|:-:|:-:|
| `governanceReports` | Governance (14) | **+** | **+** | **+** |
| `peopleReports` | People (16) | **+** | **+** | **+** |
| `athleticsReports` | Athletics (2) | **+** | **+** | **+** |
| `mediaReports` | Media (5) | **+** | **+** | **+** |
| `documentsReports` | Documents (1) | **+** | **+** | **+** |
| `workflowReports` | Workflow (9) | **+** | **+** | **+** |
| `platformReports` | Platform (3) | **+** | **+** | **+** |
| `sponsorshipReports` | Sponsorship (4) | **+** | **+** | **+** |
| `commsReports` | Comms (2) | **+** | **+** | **+** |
| `cmsReports` | CMS (13) | **+** | **+** | **+** |

An export or print request names the resource; the service checks the **group** pair for it, intersects the column allow-list with the actor’s `ViewSensitive` on that resource, and audits the call. So sensitive-field visibility stays per resource while the permission to extract is per group.

### 2.6 The map's scale — resolved

The objection raised in Batch 0 was that a per-resource reading of A3 grows the
catalogue from **215 pairs to ~412**, with `Export` (+47) and `Print` (+52)
causing half of it and each of those 99 pairs needing a route to exist or the
catalogue test fails.

**Decided (owner, 2026-09-26): Q4 option 2 — `Export` and `Print` are held per
group.** Thirty pairs on the ten group pseudo-resources replace the ninety-nine.
The catalogue lands at roughly **313 pairs**, and the role screen gains three
group columns instead of two columns on every row.

What did **not** change: `ViewSensitive` stays **per resource**, so an actor who
may export from the media centre still cannot see a sensitive field of a resource
they lack it on; the export's column allow-list is intersected with that
per-resource visibility; and every export and print is audited. The permission to
*extract* is coarse; the visibility of *what* is extracted stays fine-grained.

---

## 3. Grant, assign, and the stronger-user guard (A8) — the P0 fix

Two rules, both enforced server-side in the service layer so no future route can
mount a write without them.

### 3.1 Rule 1 — you cannot give what you do not hold

The review's P0 is that `assertGrantable` guards **building** a role
(`roles.service.ts:35`, `:131-136`) and nothing guards **handing one out**. The
fix applies the same comparison at every point a role or capability reaches an
account:

| Path | Today | After |
|---|---|---|
| `POST /roles` | ✔ `assertGrantable` | unchanged |
| `PATCH /roles/:id/permissions` | ✔ `assertGrantable` | unchanged |
| `POST /users` (`roleIds`) | ✘ existence check only | **✔ superset check** |
| `PATCH /users/:id/roles` | ✘ existence check only | **✔ superset check** |

**Superset check.** Resolve every requested role's pairs, union them, and refuse
unless the actor's own resolved set is a superset — including scope: an actor
holding `articles:Update` at `own` may not grant it at `all`.

```
assertAssignableByActor(roleIds, actor):
  granted = union(resolvePermissions(roleIds))          // pairs + scope
  missing = granted.filter(p => !actorHolds(actor, p))
  if missing.length: 403 { code: 'ungrantableRole', missing }
```

`ungrantableRole` is a **new API error code** and must be registered in all three
vocabularies or it silently degrades to `conflict`: `API_ERROR_CODES`,
admin-write's group + `FROM_API_CODE`, and both message catalogues.

### 3.2 Rule 2 — you cannot touch a stronger user

Applies to: role assignment, account status, password/setup-link reissue, 2FA
reset, session revocation, and `PATCH /users/:id/person`.

```
assertNotStronger(actor, target):
  if resolved(target) ⊄ resolved(actor): 403 { code: 'targetStronger' }
```

Strictly: refuse when the target holds **any** pair the actor does not. An actor
may act on a peer holding exactly the same set (needed so two Super Admins can
each manage the other, which A9 then restricts for the last one).

### 3.3 System roles leave the API entirely

`isSystemRole` roles are not writable through any route — not renamed, not
re-permissioned, not archived. `sync-permission-catalogue.ts` is the only writer.
Today `assertEditable` already refuses rename/archive/re-permission
(`roles.service.ts:196-207`); this extends the same refusal to **assignment of**
a system role by anyone who is not already a Super Admin, closing the P0's
shortest path.

### 3.4 Account administration is Super Admin only (owner decision 4)

Creating, editing, suspending and role-assigning accounts, and managing roles
themselves, are **exclusive to the Super Admin**, exactly like
`ManageSecuritySettings`. Five pairs are declared **un-grantable** in the
capability map:

`users:Create` · `users:Update` · `users:AssignRoles` · `roles:ManageRoles` ·
`securitySettings:ManageSecuritySettings`

**Enforcement, three layers:**

1. **The map** marks them `superAdminOnly: true`, and `PERMISSION_CATALOGUE`
   carries them so the guard still resolves them normally for the Super Admin.
2. **The API refuses** any role that asks for them — on role creation and on
   permission update, before the superset check, with `code: 'ungrantableCapability'`.
   A permission row for them exists (the Super Admin holds it); what is refused
   is putting it on any other role.
3. **`sync-permission-catalogue.ts`** grants them to the Super Admin alone, which
   it already does for every pair — no special case is added.

The role screen draws them locked, with the reason, rather than hiding them: an
administrator looking for "who can create accounts" must find the answer, not an
absence.

**Why.** The superset rule (§3.1) and the stronger-user rule (§3.2) together mean
a delegated account administrator could assign almost nothing — they may only
hand out roles whose every capability they already hold, so a non-Super-Admin
holding `AssignRoles` would be able to grant roles weaker than themselves and
nothing else. The capability looked useful and was nearly inert. Operationally
NoTime creates the accounts. Making that explicit is more honest than a grant
that quietly refuses most of what its name promises.

**`ViewAuditLog` is deliberately NOT on this list** — it is grantable by decision,
so the federation can give an auditor read access without making them a Super Admin.

**What this does not relax.** §3.1 and §3.2 stay in the code, with their tests.
They are no longer the only thing standing between `users:Create` and Super
Admin, but "defence that is currently unreachable" is exactly the defence that
matters when a later change makes it reachable again. Additionally: **nobody,
including a Super Admin, may change the roles on their own account** — the
existing self-assignment refusal is kept for that reason.

**Consequence for the templates:** the "Staff Administrator" template is removed.
Six templates remain (§5).

### 3.5 Super Admin protection (A9)

- The role: not deletable, archivable, renamable, or manually re-permissioned.
- **The last active Super Admin**: their account cannot be suspended or
  deactivated, and the role cannot be removed from them — including by
  themselves. Refusal `lastSuperAdmin`.
- "Active" = `accountStatus: 'Active'` and `archivedAt: null` and holds a role
  with `isSystemRole: true`.
- **Evaluated at the moment the write executes**, inside the handler, reading
  current state (CLAUDE.md §31) — a count taken when the screen opened is exactly
  what a concurrent demotion defeats.
- The dashboard shows a standing warning while the count is `< 2`.

### 3.6 Break-glass (A10)

`npm run recover:super-admin` — a server command, never a route or a screen.

Requires `--email`, `RECOVERY_SECRET` from the environment, and a typed
confirmation. It: creates or reactivates the account; grants the Super Admin
role; clears 2FA; **issues a setup link and prints it — it never sets a
password**; revokes all that account's sessions; writes an audit row with
`action: 'StatusChange'` and `reason: 'break-glass recovery'`; and notifies the
other Super Admins. Separate file from `bootstrap/seed-admin.ts`, whose behaviour
is unchanged (brief §8).

### 3.7 Account creation never knows the password (A11)

`POST /users` **drops `password`**. A new account gets a setup token: 32 random
bytes, stored as a SHA-256 hash, single use, 72-hour expiry, consumed by
`POST /auth/setup-password`. The same mechanism serves break-glass and admin
reissue. `passwordResetToken`/`passwordResetExpiresAt` on `users` — dead fields
today — are replaced by the new `accountSetupTokens` collection rather than
revived, so a token's hash, expiry and single-use state live in one row.

---

## 4. Approvals (A6, A7)

### 4.1 Approve = capability + assignment, both required (A6)

Today `Approve` exists on one resource and scoping comes only from `assigneeIds`
(review P1-3). After this change:

- `Approve` is a per-resource verb on the 9 publication-eligible workflow types.
- `WorkflowInstancesService.approve` requires **both** `<entityType>:Approve`
  **and** membership in the current step's `assigneeIds`. The capability is
  checked in the service, not only the route, matching how `Publish` is already
  checked (`publishing.service.ts:560-570`).
- **Separation of duties:** the actor may not approve a revision they created or
  submitted. Compared against `revision.createdBy` and the instance's submitter.
  Refusal `selfApproval`.
- **Super Admin override** requires a written reason, and the reason is stored on
  the `workflowActionHistory` row and the audit row. Without a reason it is
  refused like anyone else — the override is a documented act, not a silent
  exemption.
- **Capability withdrawn while assigned** (review P1-9): the step is reported as
  blocked. `GovernableEntity` gains `blockedAssignees`, the review screen shows
  it, and the instance is routed to the admin. Nothing silently stalls.

### 4.2 Policy changes are locked and logged (A7)

- `configure()` and `disable()` both call `assertNothingRunning` — today only the
  arrangement path does (`approval-configuration.service.ts:109-111`), which is
  why `disable()` can strand content (review P1-2).
- The refusal carries the pending list: entity ids, titles and current step, so
  the administrator can chase or wait rather than guess.
- **Every policy change writes its own audit row** with old and new values,
  written explicitly inside the service under `@SkipAuditLog()`. This is the
  direct fix for review P1-1: the interceptor cannot derive an entity id for
  these routes because `GovernableEntity` carries no `_id` and the path
  parameter is `entityType`, so the row is skipped entirely today.

---

## 5. Role templates (E2) — the six

Seeded once, idempotent, as **ordinary** roles (`isSystemRole: false`) that an
administrator may edit, copy or delete. Re-running never overwrites an edit
(`$setOnInsert` on everything but the name key, the `seedPermissions` precedent).
`PermanentDelete` appears in **no** template.

**There is no account-administration template.** Owner decision 4 (§3.4) reserves
`users:Create`, `users:Update`, `AssignRoles` and `ManageRoles` to the Super
Admin, so the "Staff Administrator" template proposed in Batch 0 has been removed.

`E` and `P` are now **group** grants (§2.6), so they appear as a group name rather
than beside a resource.

`R`=Read `C`=Create `U`=Update `A`=Archive `Rs`=Restore `E`=Export `P`=Print
`VS`=ViewSensitive `Pb`=Publish `Ap`=Approve `VR`=ViewReports

| # | Template | Groups it reaches | Capabilities | Scope | Deliberately absent |
|---|---|---|---|---|---|
| 1 | **مسؤول المحتوى**<br>Content Manager | Comms, Media, CMS | `R C U A Rs` on `articles`, `albums`, `videos`, `heroSlides`, `mediaAssets`, the CMS page resources; `VR E P` on `commsReports` + `mediaReports` + `cmsReports` | `all` | `Pb` · `Ap` · `VS` · `PermanentDelete` |
| 2 | **محرر**<br>Editor | Comms, Media | `R C U A` on `articles`, `albums`, `videos` | **`own`** | `Pb` · `Ap` · `Rs` · every group grant · `VS` — and `own` already bars editing a published record |
| 3 | **مراجع ومعتمد**<br>Reviewer & Approver | Comms, Governance, Documents, Workflow | `R` on the 9 reviewable types; `Ap` on them; `R` on `workflowInstances`, `revisions`, `workflowActionHistory` | — | every `C`/`U`/`A` on content — this is what makes it a reviewer and not an editor · `Pb` · every group grant |
| 4 | **مسؤول البيانات الرياضية**<br>Sports Data Officer | People, Athletics | `R C U A Rs` on `athletes`, `athleteProfiles`, `coaches`, `officials`, `officialProfiles`, `clubs`, `clubTeams`, `disciplines`, `ageCategories`, `venues`, `countries`, the history resources; **`VS` on `athletes` + `athleteProfiles` + `athleteGuardianRelationships`**; `VR E P` on `peopleReports` + `athleticsReports` | `all` | `Pb` · `Ap` · `PermanentDelete` |
| 5 | **مسؤول الحوكمة**<br>Governance Officer | Governance, Documents | `R C U A Rs` on `committees`, `federationPersonnel`, `federationAppointments`, `electionCycles`, `governanceDocuments`, `documents`, the governance pages; `Pb` on those; **`VS` on `federationPersonnel`**; `VR E P` on `governanceReports` + `documentsReports` | `all` | **`PermanentDelete`** (brief: explicitly) · `Ap` |
| 6 | **مشاهد الإدارة العليا**<br>Executive Viewer | all ten | `VR` on all ten group resources; `R` on nothing by default | — | every write · `E` · `P` · `VS` — aggregate numbers only (A4) |

**Template 6 holds `ViewReports` without `Export`.** A board member sees the
federation's numbers and cannot pull them into a file — which is the distinction
A4 draws, and the reason `Export` is a separate verb rather than something `Read`
implies.

**Template 4 is the only one holding `ViewSensitive`,** and only on the three
athlete resources. Every other template sees a person's record with the
`Restricted` and `Sensitive/Minor` fields absent.

---

## 6. Sensitive data, export, print, reports

### 6.1 `ViewSensitive` (A3)

One serialization layer, not per-controller filtering. A `SensitiveFieldsService`
reads the capability map and strips every declared path from a response unless
the actor holds `<resource>:ViewSensitive`. Applied in both directions:

- **On screen:** the DTO omits the field entirely, rather than nulling it — an
  absent key and a null value read differently to a client, and "null" would
  claim the record has no value.
- **In files:** the export column allow-list is intersected with the actor's
  visibility, so a spreadsheet can never carry a column the screen hid. The
  existing `USER_EXPORT_COLUMNS` allow-list (`users.service.ts:27-36`) is the
  precedent and stays.
- `toPublicResponse` allow-lists are untouched (brief §8) — public responses
  never had these fields.

### 6.2 Export and print — a group grant, a per-resource file (A3, Q4 option 2)

The **permission** is per group: `<group>Reports:Export` and `:Print`. The
**file** is still per resource and still filtered per actor:

1. The request names a resource. The service resolves its group from the
   capability map and checks the group pair.
2. The column allow-list for that resource is intersected with the actor's
   `ViewSensitive` **on that resource** — so an actor with `mediaReports:Export`
   and no `ViewSensitive` on `athletes` exports athletes without the sensitive
   columns, never with them.
3. One audit row: actor, timestamp, resource, **the filters applied**, and the
   record count.

A new audit action `Export` joins `AUDIT_ACTIONS`, and per §0.2 a new
`SensitiveRead` joins it too.

### 6.3 Sensitive reads (Chapter 17 §7)

A read that actually returns at least one sensitive field writes a
`SensitiveRead` row naming the record. Debounced per (actor, record, minute) so
opening one record ten times in a minute is one row, not ten — a defensible
reading of "which specific record was accessed" that does not turn a list screen
into a thousand writes.

**Decided (owner, Q2 option 1).** The debounce key is (actor, record, minute) —
not (actor, resource, minute), which would collapse a hundred distinct records
read in one minute into one row and lose the "which specific record" the chapter
requires.

### 6.4 Reports (A4)

- Aggregate counts per group behind `<group>Reports:ViewReports` alone.
- Drilling into records inside a report additionally requires `Read` on the
  resource; sensitive columns additionally require `ViewSensitive`.
- Exporting a report is `<group>Reports:Export`, and is audited.
- The dashboard home shows only the groups the actor may report on.
- `ViewReports` **never** implies `Export`: template 6 holds the first and not
  the second, deliberately.

---

## 7. Authentication

### 7.1 TOTP 2FA (B1)

RFC 6238, SHA-1, 6 digits, 30-second step — the interoperable default every
authenticator app supports.

| Concern | Decision |
|---|---|
| Enrolment | QR (`otpauth://totp/UAEAF:<email>?issuer=UAEAF&secret=…`) plus the manual key; confirmed by one correct code before it takes effect |
| Recovery codes | 10, shown once, stored as bcrypt hashes, single use, regenerable |
| Secret at rest | **AES-256-GCM**, key from `MFA_SECRET_ENCRYPTION_KEY` (32 bytes, base64). IV per record, auth tag stored. Never logged |
| Verification | ±1 step window; the consumed step is recorded and **cannot be replayed**; failures counted against the lockout threshold |
| Enforcement | every account. First sign-in after release forces enrolment before any other route is usable |
| Admin reset | under §3.2 rule 2, plus step-up, plus audit |
| Login | correct password returns a **5-minute MFA ticket, not a session**. The session opens only after a valid code |

Kept behind ADR-0029's abstraction: an `MfaProvider` interface with one TOTP
implementation, so adding UAE PASS later does not restructure the flow.

**Dependencies (owner decision, Q7).** The TOTP algorithm itself uses Node's
built-in `crypto` — no package — and is tested against RFC 6238's published
vectors. **`qrcode` is approved** for rendering the enrolment QR; the version and
the reason are recorded in ADR-0108.

**Mail (owner decision, Q7).** No provider is chosen yet, so delivery goes behind
a port: a `MailPort` interface with one `LogMailAdapter` that writes the setup
link to a dedicated admin-only log and **nothing else** — no secrets, no codes,
no tokens beyond the link itself. The real provider is chosen before Batch 5 and
arrives as a second adapter with nothing else changing.

### 7.2 Trusted device (B2)

Token in a cookie: `httpOnly`, `Secure`, `SameSite=Strict`, path-scoped, stored
as a hash bound to the account.

| Account class | Trusted-device life |
|---|---|
| Ordinary | 30 days |
| **Sensitive** | 7 days |
| Super Admin | **0 — never trusted** |

**"Sensitive account"** = holds any of `ManageRoles`, `AssignRoles`,
`ViewSensitive`, `Export`, `PermanentDelete` — computed from the resolved set, so
it follows a role edit immediately rather than being stored and going stale.

Invalidated by: password change, any role change, account suspension. The user
sees their device list and may revoke; an admin may revoke another's under rule 2.

### 7.3 Step-up (B3)

Re-prompt for a TOTP code when the last verification is older than the step-up
window (default 15 minutes) for: role changes and assignment, `PermanentDelete`,
any export containing sensitive fields, approval-policy changes, security
settings, and resetting another user's 2FA.

Refusal is `401` with code `mfa_step_up_required`; the dashboard opens the code
dialog and replays the original request.

### 7.4 Sessions (B4) and cross-tab expiry (Ch.17 §6)

| Account class | Idle | Absolute |
|---|---|---|
| Ordinary | 2 h | 7 d |
| Sensitive | 1 h | 1 d |
| Super Admin | 30 min | 1 d |

Sliding renewal while active; a warning two minutes before expiry. Session list
with revoke, for the user and for an admin. Immediate revocation on password
change, role change, or suspension — the existing `revokeAllForUser`
(`users.service.ts:187-189`) already does the suspension case and is extended to
the other two.

**Cross-tab:** expiry, warning and sign-out synchronise across tabs via a
`BroadcastChannel` with a `localStorage` fallback, per Chapter 17 §6 / Chapter 8
L4 §FB.24. One tab signing out signs out all of them.

### 7.5 Security settings (B5)

A `securitySettings` singleton, `ManageSecuritySettings` only (Super Admin), with
**backend-enforced** bounds. Values outside the bounds are refused, not clamped —
a silently clamped setting reads back as accepted.

| Setting | Min | Max | Super Admin ceiling |
|---|---|---|---|
| Idle timeout | 15 min | 8 h | 1 h |
| Absolute session | 1 h | 30 d | 1 d |
| Trusted device | 0 | 30 d | **always 0** |
| Step-up window | 5 min | 60 min | — |
| Attempts before lockout | 3 | 10 | — |
| Minimum password length | 12 | 20 | — |

**Immutable, not settable at all:** 2FA for Super Admin · 2FA platform-wide ·
the two-Super-Admin rule.

Every change needs step-up, is audited with old and new values, and emails the
other Super Admins. "Restore defaults" and "apply to open sessions" are provided.
Cached in memory; the cache is invalidated on write.

Per §0.3 this singleton becomes the **only** home for these numbers:
`siteSettings.sessionTimeoutMinutes` and `.maxLoginAttempts` are migrated and
deprecated, and `auth.config.ts` keeps only the bounds.

### 7.6 Passwords (B6)

NIST 800-63B: minimum length from settings (floor 12), long passphrases allowed,
**no composition rules, no periodic expiry**. Rejected: a local breached/common
list committed to the repo (no network call, ever), and any password containing
the account's name or email local-part. Forced change only on suspected
compromise or first sign-in.

**Hash: `bcryptjs@3.0.3` at 12 rounds** (owner decision, Q5 — raised from the
current 10 at `users.service.ts:38`). Existing hashes stay valid and are
**rehashed transparently on the next successful login**: verify against the
stored hash, and when its cost factor is below the current one, re-hash the
plaintext already in hand and store it. No forced reset, no user-visible step,
and no migration script — the rehash happens as people sign in.

---

## 8. Audit completeness (C1, C2)

### 8.1 No silent skip (C2)

`audit-log.interceptor.ts:152-156` returns early when it cannot name an entity.
Replaced by three ordered sources:

1. `request.params.id`
2. `id`/`_id` on the response body
3. **`@AuditEntity({ type, idFrom })`** — an explicit decorator for routes keyed
   by something else, which is what the policy routes need (`entityType` in the
   path, no id in the body).

If all three fail the row is **still written**, with `entityId: null` and
`reason: 'entity id unresolved'`, and a warning is logged. Silence stops being an
option.

A test walks every mutating route — the same mechanical style as
`permission-catalogue.spec.ts` — and fails if any lacks an identity source.

### 8.2 Viewing the log (C1)

`auditLogs:ViewAuditLog` — Super Admin by default, grantable. Append-only:
`AuditLogsRepository` must not inherit mutating methods (brief §8), asserted by a
test. A "Security events" screen is a saved filter over sign-ins, failures, 2FA,
exports, sensitive reads, role changes, security settings and break-glass.
Exporting the log is itself audited. Retention per §0.1 / §13 Q1.

---

## 9. Schemas

### 9.1 New collections

| Collection | Purpose | Key fields | Indexes |
|---|---|---|---|
| `securitySettings` | singleton, §7.5 | the six settings + `updatedBy` | — (one row) |
| `mfaSecrets` | §7.1 | `userId`, `ciphertext`, `iv`, `authTag`, `confirmedAt`, `lastUsedStep` | `{userId}` unique partial `archivedAt:null` |
| `mfaRecoveryCodes` | §7.1 | `userId`, `codeHash`, `usedAt` | `{userId, usedAt}` |
| `trustedDevices` | §7.2 | `userId`, `tokenHash`, `label`, `lastSeenAt`, `expiresAt`, `revokedAt` | `{userId, revokedAt}`, `{tokenHash}` unique |
| `accountSetupTokens` | §3.6 | `userId`, `tokenHash`, `expiresAt`, `consumedAt`, `purpose` | `{tokenHash}` unique, `{userId, consumedAt}` |

### 9.2 Changed

| Target | Change |
|---|---|
| `permissions` | **+ `scope: 'own'\|'all'\|null`** (§2.4) |
| `users` | **− `password` from `CreateUserDto`** (§3.6) · `passwordResetToken`/`passwordResetExpiresAt` removed in favour of `accountSetupTokens` · **+ partial unique index on `personId`** (`personId ≠ null`, `archivedAt: null`) — F5 |
| `authSessions` | + `lastVerifiedAt` (step-up), `idleExpiresAt`, `absoluteExpiresAt` |
| `federationPersonnel` | **+ five CV arrays** (F7) · **+ `slug`** unique partial · **+ `showPublicContact` default `false`** (F6) · **+ index `{status}`** (F2) |
| `federationAppointments` | **+ indexes** `{personId,status}`, `{committeeId,status}`, `{electionCycleId}`, `{roleType,status}` (F2) |
| `workflowSteps` | (no shape change; `blockedAssignees` is computed, not stored) |
| `siteSettings` | `sessionTimeoutMinutes` and `maxLoginAttempts` **removed** after migration into `securitySettings` (§0.3, Q3) — not left deprecated in place |
| `permissions` | **+ `superAdminOnly: boolean`** (decision 4, §3.4) — the five un-grantable pairs |
| `auditLogs` | `AUDIT_ACTIONS` **+ `Export`, `SensitiveRead`** |
| `PUBLICATION_ENTITY_TYPES` | **+ `federationPersonnel`** (F9) — which forces a `PUBLISH_REQUIREMENTS` row by compile error, the mechanical gate noted in the roles review |

### 9.3 CV sections (F7)

Five arrays of subdocuments on `federationPersonnel`, each element carrying
`isVisible: boolean` and `displayOrder: number`, all text `LocalizedText`:

`qualifications` · `certifications` · `previousPositions` (outside the federation
only — inside-federation history is `federationAppointments`) · `experience` ·
`achievements`

`slug` is generated from the English name, unique, editable, with a partial
unique index (`archivedAt: null`) — the `pages.slug` precedent.

---

## 10. The dashboard's part (D1, D2)

The API is the only authority. Everything here is presentation: it decides what to
draw, never what is allowed.

### 10.1 Hiding and read-only (D1)

- The sidebar and every action control render only when the actor holds the
  capability that control's route requires. The existing `hasPermission` /
  `canAccessResource` helpers already do this across `navigation.ts` and the
  per-screen loaders; the new verbs join the same mechanism.
- Holding `Read` without `Update` opens the screen **read-only**, with an
  explicit "عرض فقط / View only" bar — not a disabled-looking form with no
  explanation, and not a 403.
- **`GET /me/permissions`** returns the resolved pairs **with their scopes** and
  the account class (ordinary / sensitive / Super Admin), refreshed when the tab
  regains focus. The account class is what the session-warning timing and the
  trusted-device copy depend on, so the client must not infer it.
- Any `403` renders the API's own message. A hidden control is a convenience; the
  refusal is the truth.
- The `own` scope shows the reason a row is not editable — "published, so editing
  needs review" — rather than hiding the row, which would read as data loss.

### 10.2 Session expiry mid-form (D2)

When a session ends while the user is in a form, the draft is written to
`localStorage` keyed by route plus record id, and restored after sign-in **on the
same page**. Wrapped in try/catch and correct when storage is empty or throws —
a private window and a thumbnailer both do that.

Cleared on successful save and on explicit discard. Never used for anything that
must survive reliably; it is a convenience against an expiry the user did not
choose.

### 10.3 What the dashboard does not decide

Scope filtering, sensitive-field omission, and every refusal in §3, §4 and §7
happen server-side. The dashboard never filters a list it was given in full and
calls that a permission — if a row should not be visible, the API must not return
it.

---

## 11. Endpoints

`SU` = step-up required.

| Method | Path | Capability | Scope | SU | Public |
|---|---|---|---|:-:|:-:|
| POST | `/auth/login` | — | — | | ✔ |
| POST | `/auth/mfa/verify` | MFA ticket | — | | ✔ |
| POST | `/auth/setup-password` | setup token | — | | ✔ |
| POST | `/auth/mfa/enroll` · `/confirm` | self | — | | |
| POST | `/auth/mfa/recovery-codes` | self | — | ✔ | |
| GET/DELETE | `/auth/devices` · `/devices/:id` | self | — | | |
| GET/DELETE | `/auth/sessions` · `/sessions/:id` | self | — | | |
| GET | `/me/permissions` | authenticated | — | | |
| POST | `/users` | `users:Create` **(SA only)** + §3.1 | — | ✔ | |
| PATCH | `/users/:id/roles` | `users:AssignRoles` **(SA only)** + §3.1 + §3.2 | — | ✔ | |
| PATCH | `/users/:id/status` | `users:Update` + §3.2 + §3.4 | — | | |
| PATCH | `/users/:id/person` | `users:Update` + §3.2 | — | | |
| POST | `/users/:id/mfa/reset` · `/setup-link` | `users:Update` + §3.2 | — | ✔ | |
| DELETE | `/users/:id/sessions` | `users:Update` + §3.2 | — | | |
| PATCH | `/roles/:id/…` | `roles:ManageRoles` + §3.1 | — | ✔ | |
| GET/PUT | `/security-settings` | `ManageSecuritySettings` | — | ✔ | |
| GET | `/audit-logs` · `/security-events` | `auditLogs:ViewAuditLog` | — | | |
| GET | `/audit-logs/export` | `auditLogs:Export` | — | ✔ | |
| PATCH | `/<resource>/:id` | `<r>:Update` | own·all | | |
| POST | `/<resource>/:id/restore` | `<r>:Restore` | — | | |
| DELETE | `/<resource>/:id/permanent` | `<r>:PermanentDelete` | — | ✔ | |
| GET | `/<resource>/export` · `/print` | `<group>Reports:Export` · `:Print` (Q4) | — | ✔ if sensitive | |
| GET | `/reports/<group>` | `<group>Reports:ViewReports` | — | | |
| PUT | `/workflow-policies/:entityType/approval` | `workflowPolicies:Update` | — | ✔ | |
| PATCH | `/federation-appointments/:id/close` | `federationAppointments:Update` | — | | |
| GET | `/federation-personnel/:slug/public` | — | — | | ✔ |
| GET | `/federation-appointments/public?electionCycleId=` | — | — | | ✔ |
| GET | `/committees/public` · `/committees/:id/members/public` | — | — | | ✔ |
| GET | `/org-chart/public` | — | — | | ✔ |

---

## 12. Scripts — written idempotent, never run by the agent (brief §9)

Run order matters; each is safe to re-run.

1. `check-person-id-duplicates` — must report zero before step 2 (F5, the `check-policy-duplicates` precedent)
2. `migrate-person-id-index` — builds the partial unique index
3. `backfill-show-public-contact` — sets `showPublicContact: false` on existing rows (F6)
4. `backfill-personnel-slug` — generates slugs, reports collisions rather than guessing
5. `build-appointment-indexes` (F2)
6. `migrate-security-settings` — copies the two `siteSettings` values, then marks them deprecated (§0.3)
7. `sync-permission-catalogue` — **existing**, re-run so Super Admin gains the new capabilities
8. `reset-roles` — archives every non-system role, reports affected accounts and open steps (E1)
9. `seed-role-templates` — the seven (E2)
10. `recover:super-admin` — break-glass, on demand only (A10)

Steps 8 and 9 are a pair: 8 leaves accounts role-less and marked, and 9 gives the
administrator something to assign.

---

## 13. Decisions taken (owner, 2026-09-26)

Batch 0 raised four conflicts and eight questions. All are decided. The table is
the record; each row's detail lives in the section named.

| # | Question | Decision | Detail |
|---|---|---|---|
| **Q1** | Audit-log retention vs Chapter 17 §3 | **Option 1.** No deletion and **no deletion mechanism built**. An annual review by a Super Admin **together with** the federation's data officer, recorded as an `auditLogs` row of its own. | §0.1, ADR-0028, ADR-0112 |
| **Q2** | Sensitive-read auditing | **Option 1.** Implement Chapter 17 §7, not the narrower A3. Debounced once per **(actor, record, minute)**. | §0.2, §6.3, ADR-0111 |
| **Q3** | Where the security numbers live | **Option 1.** `securitySettings` is the single source. The two `siteSettings` fields are migrated and then **removed from the schema**. `auth.config.ts` keeps only the bounds. | §0.3, §7.5, ADR-0109 |
| **Q4** | `Export`/`Print` granularity | **Option 2 — per group.** 30 pairs on the ten group pseudo-resources, not 99 per-resource. `ViewSensitive` stays per resource and still filters the file. | §2.6, §6.2, ADR-0111 |
| **Q5** | bcrypt cost factor | **Yes, 10 → 12**, with transparent rehash on next successful login. | §7.6, ADR-0110 |
| **Q6** | The six unclear `purgeable` resources | `contactMessages` **yes**; `documents`, `governanceDocuments`, `memberships`, `partnerships`, `sponsors` **no**. | §2.5, ADR-0103 |
| **Q7** | Dependencies | TOTP with built-in `crypto`, tested against RFC 6238 vectors. **`qrcode` approved.** Mail behind a `MailPort` with a `LogMailAdapter` until a provider is chosen. | §7.1, ADR-0108 |
| **Q8** | Batch 6's size | **Split into 6a and 6b.** | plan roadmap |

### 13.1 Decision 4 — account administration is Super Admin only

Raised by the owner after Batch 0, not by a question in it. Five pairs become
un-grantable, the "Staff Administrator" template is removed, and the templates go
from seven to six. The superset and stronger-user rules stay in the code with
their tests. Full reasoning in **§3.4**; recorded in **ADR-0104**.

### 13.2 What is still open

| Item | Needed by | Owner note |
|---|---|---|
| **Mail provider** — SMTP on `uaeaf.ae`, or a hosted service | **before Batch 5** | Until then `LogMailAdapter`. The plan stops and asks at Batch 5 if still undecided; "continue with the log" is an acceptable answer. |
| **Parental consent for minors** (ADR-0028 §2) | before any athlete data is published publicly | Marked a **mandatory compliance gap** in the backlog. Not built in this work. |
| **Committees dashboard screen** | — | Out of scope until its design is ready. |

### 13.3 New conflicts found after Batch 0

None yet. Any found while implementing is recorded here in §0's format and asked
before it is resolved — never guessed (brief §7).

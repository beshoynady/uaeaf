# ADR-0103 — One capability map declares what each resource can be asked to do

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-26, ahead of implementation (ADR-0056 §2 — document-first). |
| **Authority** | Product Owner brief, 2026-09-26 (decisions A1, A2, A5), which explicitly approves the schema and guard changes it implies. |
| **Amends** | The permission vocabulary itself: `PERMISSION_ACTIONS` loses `HardDelete` and `EditProtectedData` and gains `Archive`, `Restore`, `PermanentDelete`, `Print`, `ViewSensitive`, `ViewReports`, `ManageRoles`, `AssignRoles`, `ViewAuditLog`, `ManageSecuritySettings`. `Delete` is **renamed** `Archive`. |
| **Does not amend** | The guard's comparison logic (`permissions.guard.ts:57-60`) — it still compares a flat `(resourceType, action)` pair with no branch for any role. · Per-request resolution (`jwt.strategy.ts:62`). · `PERMISSION_RESOURCES` as a closed, typed list. · The `permission-catalogue.spec.ts` invariant, which is strengthened rather than relaxed. |
| **Context** | Two measured problems. **The vocabulary lies in both directions.** `HardDelete` and `EditProtectedData` are declared verbs that zero resources use — dead configuration of exactly the kind `PERMISSION_RESOURCES` was introduced to prevent. Meanwhile `Delete` is the *only* destructive verb, yet every repository implements it as `archivedAt` — so the permission called "delete" grants archival, and there is no way to grant or withhold real destruction. **The catalogue is hand-written.** 215 pairs across 69 resources are maintained by hand and kept honest only by a test that compares them to the decorators; nothing declares what a resource *should* be able to do, so 30 resources ended up with `Create` and `Delete` but no `Update`, and 4 workflow-governed types can be approved but never published because no `Publish` pair exists for them. |
| **Decision** | A single `capability-map.ts` declares, per resource: its product group, the verbs that apply to it, whether it is `purgeable`, its sensitive field paths with their Chapter 17 §1 class, and its scopes. `PERMISSION_CATALOGUE` becomes **derived** from that map. `Delete` is renamed `Archive` and paired with `Restore`. `PermanentDelete` is a separate verb, offered only where `purgeable` is true, refused while the record is published or referenced, requiring step-up, always audited. Scopes (`own`/`all`) are a **column on the permission row**, resolved in the service, not a verb and not a guard concern. |
| **Alternatives Considered** | **(A) Keep the hand-written catalogue and just add the missing pairs.** Rejected: it fixes the 34 pairs found this month and not the mechanism that lost them. Nothing would declare that a resource with `Create` ought to have `Update`. **(B) Generate the full cross product (69 × 15 = 1035).** Rejected for the reason the catalogue's own header already gives: it fills the role screen with rows that gate nothing. **(C) Encode scopes as extra verbs (`UpdateOwn`, `UpdateAll`).** Rejected: it doubles the verb list for four resources, and it puts a row-level data question inside a request-level guard. **(D) Adopt an external RBAC/ABAC library (CASL, Casbin).** Rejected: the brief forbids a new dependency for this, and the existing two-indexed-read resolution is both faster and easier to reason about than a policy engine for a platform of 10–20 roles. **(E) Leave `Delete` meaning archival and add `Purge`.** Rejected: the lie stays. An administrator reading "Delete" on the role screen must be able to believe it. |
| **Why This Decision** | It moves the question from "which pairs happen to exist" to "what can this resource be asked to do", and makes the answer a single declaration that a test can hold the code to. The three judgement columns are the point: `purgeable`, sensitive fields and scopes are decisions that were previously nowhere, and a resource that gains a field or a route now has one place to record what that means. And it costs no change to the hot path — the guard still compares two strings. |
| **Risks** | **The catalogue grows from 215 pairs to roughly 412, and the role screen becomes unreadable.** **Mitigation:** the seven templates of ADR-0113 are the instrument an administrator actually uses; the matrix is the fallback. The `Export`/`Print` granularity that causes half the growth is raised as an open question rather than assumed. **A verb is declared with no route to guard it, and the catalogue test fails the build.** **Mitigation:** this is the desired failure, and the plan pairs every new verb with its route in the same task. **`Delete` → `Archive` renames a permission administrators have already granted.** **Mitigation:** the rename is on the `action` value, and `sync-permission-catalogue.ts` upserts on the `(resourceType, action)` pair — so the migration must rewrite existing rows, not rely on the sync, and that is a named script step. |
| **Consequences** | `api/src/common/authz/capability-map.ts` is new and becomes the source for `PERMISSION_CATALOGUE`. `permissions` gains `scope`. `RolesService.resolvePermissions` returns scope with each pair. `permission-catalogue.spec.ts` gains a third assertion (the map covers every resource). 30 resources gain `Update`, 47 gain `Restore`, 9 gain per-type `Approve`, 4 gain `Publish`. Ten group pseudo-resources join `PERMISSION_RESOURCES` for `ViewReports`. A migration rewrites `Delete` rows to `Archive`. |

---

## D1 — Why the group verb needs pseudo-resources

`ViewReports` is held per product group, and the guard compares a pair. Rather
than teach the guard a second shape, ten resources join `PERMISSION_RESOURCES`
carrying that one verb: `governanceReports`, `peopleReports`, `athleticsReports`,
`mediaReports`, `documentsReports`, `workflowReports`, `platformReports`,
`sponsorshipReports`, `commsReports`, `cmsReports`.

The ten groups are **not invented here.** They are the domains already derived
mechanically in `apps/dashboard/src/lib/admin/resource-domains.ts`, which maps all
69 resources and has a completeness test. Reusing them means the reports grouping
and the role screen's grouping cannot drift apart.

## D2 — Why scope is enforced in the service, not the guard

The guard answers a request-level question: may this actor use this verb on this
resource at all. Ownership is a row-level question, and the row can change between
the request arriving and the write landing.

So the guard stays as it is, and the service performs the ownership test
immediately before the side effect, reading current state — CLAUDE.md §31. A
check made when the editor opened the screen is precisely the check a concurrent
publish defeats: a record that was `own`-editable when the form loaded may have
been published by the time Save is pressed, and `own` must stop applying at that
moment, not at the next page load.

## D3 — `purgeable` derives from Chapter 17, not from taste

True only where Chapter 17 §3/§4 can oblige destruction rather than archival — a
data subject's own personal data under a PDPL erasure right, or media whose
subject has withdrawn consent under §2, where the chapter requires the actual
image to go rather than be hidden later.

That yields nine: `athletes`, `athleteProfiles`, `athleteGuardianRelationships`,
`coaches`, `officials`, `officialProfiles`, `federationPersonnel`, `users`,
`mediaAssets`. Fifty-four are false. Six are genuinely unclear and are recorded as
an open question in the spec rather than guessed, because a wrong `true` here is
an irreversible capability.

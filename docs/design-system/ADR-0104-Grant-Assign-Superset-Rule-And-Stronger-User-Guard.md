# ADR-0104 — You cannot hand out what you do not hold, and you cannot touch someone stronger

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-26. Closes the P0 privilege escalation in `docs/reviews/roles-permissions-review.md` §2. |
| **Authority** | Product Owner brief, 2026-09-26 (decision A8), acting on the review's P0 finding. |
| **Amends** | `UsersService.create` and `UsersService.assignRoles` gain an authorization rule they have never had. The self-assignment refusal in `users.controller.ts:118-123` stays but stops being the only barrier. |
| **Does not amend** | `RolesService.assertGrantable` — the rule it enforces on role *building* is correct and unchanged; this ADR extends the same comparison to role *handing-out*. · The guard. · `isSystemRole` protection as it stands. |
| **Context** | The review proved a two-call path from `users:Create` to full Super Admin. The coherence rule forces any role holding `users:Create` to also hold `users:Read`; `GET /users` returns every account's `roleIds`, so the Super Admin role's id is readable; `POST /users` accepts both `roleIds` and a caller-chosen `password`; and `UsersService.create` validates only that each role **exists and is not archived** (`assertAssignable`). Nothing compares the role's permissions against the actor's — `grep` for `assertGrantable` or `actorPermissions` across the whole `users/` module returns zero. The actor then signs in as the account they just made. The 2026-09-05 audit closed the *self*-assignment variant of this chain and recorded it as closed; the variant that uses a second account was never closed. |
| **Decision** | Two rules, both enforced in the service layer. **(1) Superset on grant AND assign.** At every point a capability reaches an account — `POST /roles`, `PATCH /roles/:id/permissions`, `POST /users`, `PATCH /users/:id/roles` — the union of what is being handed over must be a subset of the actor's own resolved set, scope included. **(2) Stronger-user guard.** An actor may not act on a target holding any capability the actor lacks: not roles, status, password or setup link, 2FA reset, sessions, or person link. Additionally, assigning an `isSystemRole` role is refused to anyone who does not already hold it. |
| **Alternatives Considered** | **(A) Block only `isSystemRole` assignment.** Rejected: it closes the shortest path and leaves the general one. A custom role carrying everything is still assignable, and an administrator can create one — subject to rule 1 on creation, but an actor who already holds a wide set could still pass it on to an account they control and thereby launder it past the stronger-user guard. **(B) A dedicated `roles:Assign` permission and nothing more.** Rejected as insufficient on its own: it changes *who* may assign, not *what* they may assign. Adopted as a complement — `AssignRoles` exists in ADR-0103's vocabulary — but the superset check is what makes it safe. **(C) Remove `roleIds` from `POST /users` so accounts are always created bare.** Rejected: it adds a mandatory second step to every legitimate account creation and still leaves `PATCH /users/:id/roles` open. **(D) Keep the password out of creation and consider the hole closed.** Rejected, and this is the tempting one: ADR-0110's setup-link change does remove the *known-password* step. But the actor can still assign Super Admin to an existing colleague's account, or reissue a setup link for it under a weaker rule — so removing the password narrows the path without closing it. |
| **Why This Decision** | The asymmetry was the bug: the codebase already believed "you cannot grant what you do not hold" strongly enough to implement it twice, and simply never applied it on the path where the grant actually reaches a person. Rule 1 makes the belief total. Rule 2 closes the reflexive version of the same problem — if A cannot grant B a capability, A must also not be able to take B's account and use it, which means A must not be able to reset B's credentials either. |
| **Risks** | **A legitimate administrator is locked out of a routine task** because their own set is narrower than a role they are meant to hand out. **Mitigation:** the refusal is a 403 naming the exact missing pairs (`ungrantableRole`, with `missing`), so the gap is fixable rather than mysterious; and template 6 (Staff Administrator) is designed around it. **Two peers deadlock**, each unable to act on the other. **Mitigation:** the comparison is subset, not strict subset — equal sets may act on each other, which is what lets two Super Admins manage one another. **The new error code degrades to a generic `conflict`.** **Mitigation:** the review established that a new code must be registered in three vocabularies; both are named in the consequences and covered by a test. **The check is made against a stale permission set.** **Mitigation:** the actor's set comes from `request.user`, resolved for this request by `JwtStrategy`, so it cannot disagree with what the guard just decided. |
| **Amended 2026-09-26 (owner decision 4)** | **Account and role administration became exclusive to the Super Admin.** Five pairs are declared un-grantable in the capability map — `users:Create`, `users:Update`, `users:AssignRoles`, `roles:ManageRoles`, `securitySettings:ManageSecuritySettings` — and the API refuses any role that asks for them (`code: 'ungrantableCapability'`). `auditLogs:ViewAuditLog` stays grantable. **The two rules in this ADR are kept in full, with their tests**, even though decision 4 makes the escalation path they close unreachable today: a defence that is currently unreachable is exactly the defence that matters when a later change makes it reachable again, and the rules also still govern what a Super Admin may hand another Super Admin. The reasoning for decision 4 is that the two rules together made a delegated account administrator nearly inert — they could only hand out roles weaker than themselves — so the grant promised more than it could do; and operationally NoTime creates the accounts. Consequence: the "Staff Administrator" template is removed (ADR-0113). |
| **Amended 2026-09-27 (independent review)** | **A third rule was needed to make rule 2 hold: you cannot take away authority you do not hold either.** Rule 2 compares the target's *current* grants, and nothing stopped an actor shrinking those first — `PATCH /roles/:id/permissions` only ever checked what was being **added**, and `DELETE /roles/:id` stripped a role from every holder with no comparison at all. So rule 2 was defeatable in two calls: weaken their role, then act on them. `RolesService.assertRemovable` now refuses both routes when the role grants anything the actor lacks, reusing the same `missingPairs` helper. It runs **before** `assertGrantable`, because "you may not touch this role at all" is the broader refusal. **And the blanket system-role refusal was removed.** It was stricter than this ADR states ("refused to anyone who does not already hold it") and had a consequence nobody wanted: ADR-0105's `lastSuperAdmin` tells an administrator to appoint a second Super Admin first, and with a blanket refusal no route could — the guard became a one-way ratchet whose own advice was unfollowable. A system role is now refused by the ordinary superset comparison, which in practice only another Super Admin passes. |
| **Amended 2026-09-27 (Q-A, second round)** | **The un-grantable set grows from five to eight**, adding `users:Read`, `users:Export`, `roles:Read` and `permissions:Read`: the users list carries staff email addresses and no other role needs to see or extract it, and the only consumer of `permissions:Read` is role building, which is already `ManageRoles`. `permissions:Create` does not join the reserved set — it leaves the catalogue entirely, because `POST /permissions` does not exist: the catalogue is code, and a route that could mint a permission row at runtime could only ever mint one no decorator reads. **Enforcement is checked in `RolesService.assertGrantable` only, before the superset comparison, regardless of what the actor already holds** — a role can never be BUILT holding one of the eight. `UsersService.assertAssignableByActor` was given the identical check for one round of this task and it was withdrawn before landing (2026-09-27, fix round 1): since no role but the seeded Super Admin role can hold a reserved pair, `assertGrantable` already guarantees that, the ordinary superset comparison on the assign path already means only another holder of the pair — in practice, another Super Admin — may hand it to someone else. Repeating the reserved-pair refusal there would have reintroduced the exact one-way ratchet §D3 stands against. **So appointing a second Super Admin remains possible through the API, by an existing Super Admin, exactly as §D3 describes** — it is the recovery path ADR-0105's `lastSuperAdmin` message advises ("appoint another Super Admin before changing this account"), and that advice must stay followable. Reading a person's name is carved out from `users:Read` becoming un-grantable — see §D4 for the route this created and the six conditions bounding it. |
| **Amended 2026-09-28 (owner decision closing Batch 2)** | **The reserved set grows from eight declared to ten declared (eleven decided).** `users:Archive` and `users:Restore` join `superAdminOnly`: an independent review proved both routes exploitable — they were guarded by pairs the map left grantable, and they returned account data that `users:Read`, already reserved, exists to protect. The response leak was closed separately (both routes now answer `{ id }` only); this amendment is the classification fix that stands regardless — archiving and restoring an account is account administration, and account administration is Super-Admin-only, exactly like creating or updating one. The reserved set is now two numbers, not one: **ten declarable today** — `permissions:Read`; `roles:ManageRoles`, `roles:Read`; `users:Archive`, `users:AssignRoles`, `users:Create`, `users:Export`, `users:Read`, `users:Restore`, `users:Update` — and **eleven decided**, the eleventh being `securitySettings:ManageSecuritySettings`, still undeclarable until the `securitySettings` collection joins `PERMISSION_RESOURCES` in Batch 5, exactly as it has been since the Q-A round above. `capability-map.spec.ts` and `api/src/common/authz/super-admin-only.spec.ts` both pin the ten by name, not by count. Enforcement is unchanged and needed no new rule: `RolesService.assertGrantable` already refuses building any role holding a `superAdminOnly` pair, so the two new pairs are refused by the existing check the moment the map declares them. The assign path (`UsersService.assertAssignableByActor`) is deliberately not given a matching check, for the identical one-way-ratchet reason recorded in the Q-A round above. |
| **Consequences** | `UsersService` gains `assertAssignableByActor` and `assertNotStronger`, both called before any write. `RolesService` gains `assertRemovable`, and `remove` takes the actor's permissions. `POST /users` and `PATCH /users/:id/roles` gain step-up (ADR-0108). New error codes `ungrantableRole` and `targetStronger` join `API_ERROR_CODES`, the admin-write group with its `FROM_API_CODE` mapping, and both message catalogues. Template 6 becomes safe to seed and is seeded only after this lands. Negative tests are mandatory: the forbidden attempt must be shown to be refused. |

---

## D1 — The exact comparison

```
assertAssignableByActor(roleIds, actor):
  granted = union of resolvePermissions(roleIds)     // pairs, each with scope
  missing = granted.filter(pair => !actorHolds(actor, pair))
  if missing.length > 0:
      403 { code: 'ungrantableRole', missing: [...] }

actorHolds(actor, pair):
  actor has (pair.resourceType, pair.action)
  AND (pair.scope is null OR actor's scope for it is at least as wide)
```

Scope matters and is easy to miss: an actor holding `articles:Update` at `own`
must not be able to grant it at `all`. Widening a scope is granting something you
do not hold.

## D2 — Why the stronger-user guard covers credentials, not just roles

Role assignment is the obvious vector; credentials are the quiet one. If A may
reset B's 2FA, or reissue B's setup link, then A can become B — and B's
capabilities become A's without a single permission changing hands.

So rule 2 covers the whole set of ways to acquire another account: status, setup
link, 2FA reset, session revocation, and the person link. The test is the same in
every case, which is why it is one function called in seven places rather than
seven variations.

## D3 — What "stronger" means, precisely

Refuse when the target holds **any** pair the actor does not. Not "more pairs" —
a target with three capabilities the actor lacks and thirty fewer overall is still
stronger in the way that matters, because those three are what the actor would
gain.

Equal sets are permitted. This is deliberate and load-bearing: it is what allows
two Super Admins to administer each other, which ADR-0105 then narrows for the
last remaining one.

## D4 — GET /users/names: a named, bounded exception, and why it is safe

Decision 4 made `users:Read` Super-Admin-only, which would otherwise break every
screen that shows a person's name rather than lets someone browse the directory
— a news article's byline, an audit row's actor, a workflow step's approver.
Those are legitimate, frequent reads with nothing to do with administering
accounts, and gating them behind a Super-Admin-only permission would simply
break them for everyone else.

**The route.** `GET /users/names?ids=` carries no `@RequirePermission` —
deliberate, not an oversight — but is not `@Public()` either: `JwtAuthGuard`
still runs, so an unauthenticated caller gets 401. Approved because a
colleague's name is not sensitive data inside the dashboard, and because
stamping a resolved name onto every response that might need one would be far
larger work for no real reduction in risk.

**Six conditions bound it, each proven against a real query on a real
database — never a mocked repository, because a mock proves the code called a
function, not which fields actually left the database, and the projection is
this route's entire guarantee:**

1. The response row carries `id` and `displayName` only.
2. `displayName` never falls back to the email, or any part of it. `user.name`
   is itself bilingual and both fields are required (`{ en, ar }`), so
   `displayName` is the same shape rather than a single string that would
   force the server to guess a locale. An empty stored name falls back **per
   language, independently**: an empty `ar` becomes `مستخدم`, an empty `en`
   becomes `User`, and one language being present never papers over the other
   being missing.
3. An id that does not resolve — unknown or archived — is dropped silently.
   No error, no placeholder, no count that would let a caller tell the two
   apart: the route carries no permission, so it must never become a way to
   probe which accounts exist.
4. At most 100 ids per request; more is a 400. An id that is not a valid
   ObjectId is also a 400. The two 400s are both about the request's SHAPE;
   dropping an unresolved-but-well-formed id in silence (condition 3) is about
   the data's EXISTENCE — the route must never let a caller distinguish "not
   an id" from "an id for nobody" from "an id for someone archived".
5. Authenticated only, via the same `JwtAuthGuard` every route gets — the
   absence of `@RequirePermission` is what makes it reachable without a
   specific grant, not an absence of authentication.
6. Recorded here, in this subsection, as the named exception.

**Implementation note.** `UsersRepository.findNamesByIds` selects `_id name`
explicitly rather than fetching the whole document and dropping fields
afterward: the projection is the guarantee, and a filter applied after the
read means the email was already fetched into memory and one careless log
line away from leaving the process. `UsersService.findNamesByIds` — the
internal, `Map`-returning helper three workflow/publishing call sites already
use for a revision's author and a step's actors — is backed by the same
projected query; the route wraps it in the `{ id, displayName }` shape with
the per-language fallback applied, through `UsersService.displayNamesFor`.

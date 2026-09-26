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
| **Consequences** | `UsersService` gains `assertAssignableByActor` and `assertNotStronger`, both called before any write. `POST /users` and `PATCH /users/:id/roles` gain step-up (ADR-0108). New error codes `ungrantableRole` and `targetStronger` join `API_ERROR_CODES`, the admin-write group with its `FROM_API_CODE` mapping, and both message catalogues. Template 6 becomes safe to seed and is seeded only after this lands. Negative tests are mandatory: the forbidden attempt must be shown to be refused. |

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

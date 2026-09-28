# ADR-0105 — The last Super Admin cannot be locked out, and recovery is a server command

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-26. Closes P1-5 in `docs/reviews/roles-permissions-review.md`. |
| **Authority** | Product Owner brief, 2026-09-26 (decisions A9, A10). |
| **Amends** | `UsersService.updateAccountStatus` and `assignRoles` gain a last-holder check. Adds `npm run recover:super-admin`. |
| **Does not amend** | `bootstrap/seed-admin.ts` — its behaviour stays exactly as it is (brief §8), including its deliberate refusal to touch an existing account. · `isSystemRole` protection on the role itself. |
| **Context** | The review found no protection for the last Super Admin and no way back. `assignRoles` and `updateAccountStatus` refuse only self-action, so a second holder of `users:Update` can suspend the sole Super Admin or strip their role. Recovery is then impossible through the platform: `seedAdminUser` documents that it leaves an existing account *"entirely alone — password, roles and status"*, and it is right to — quietly re-granting Super Admin to an account an administrator deliberately demoted would be a privilege escalation performed by automation. So the correct safety property of the bootstrap script is exactly what removes the recovery path, and the fix has to be elsewhere. |
| **Decision** | **Protection:** the Super Admin role cannot be deleted, archived, renamed or manually re-permissioned through any route; and the **last active holder** cannot have the role removed nor their account suspended or deactivated — including by themselves. Refusal code `lastSuperAdmin`. The dashboard warns continuously while the active count is below two. **Recovery:** a server-only command, `npm run recover:super-admin`, requiring an email, a `RECOVERY_SECRET` environment variable and a typed confirmation. It creates or reactivates the account, grants the role, clears 2FA, **issues a setup link and prints it without ever setting a password**, revokes that account's sessions, writes a `break-glass` audit row, and notifies the remaining Super Admins. |
| **Alternatives Considered** | **(A) A recovery endpoint or dashboard screen.** Rejected outright: an HTTP route that mints a Super Admin is a permanent hole in the model this whole batch of work exists to close, however well guarded. **(B) Make `bootstrap-admin` reactivate and re-grant.** Rejected: it runs on deploy, so it would re-grant on every deploy and undo deliberate demotions silently. This is the exact reasoning already written into `seed-admin.ts:181-189`, and it stands. **(C) Have the command set a password directly.** Rejected: whoever runs the recovery then knows a Super Admin's password, and nothing distinguishes the operator from an attacker with shell access afterwards. A setup link leaves the credential in the account holder's hands. **(D) Protect the last holder only against others, not themselves.** Rejected: "I'll just demote myself for a moment" is how the last one goes. |
| **Why This Decision** | The two halves answer different failure modes and neither alone is enough. The guard prevents the ordinary accident — a routine suspension that happens to hit the only holder. The command handles the case the guard cannot: the account is already gone, or its 2FA device is lost, so no in-platform authority exists to fix it. Putting recovery on the server floor rather than in the API means the capability is bounded by who can reach the host, which is a boundary the organisation already controls. |
| **Risks** | **The count is read when the screen opens and a concurrent demotion slips past.** **Partially mitigated, and the gap is recorded rather than claimed closed** (independent review, 2026-09-27): the check runs inside the handler, immediately before the write, reading current state — CLAUDE.md §31 — which closes the stale-screen case. It does **not** close true concurrency: two requests demoting two different holders each truthfully see one other active holder and both proceed. Counting the others rather than all of them states the question better but is the same arithmetic. Closing it needs the count and the write to be one operation (a transaction, or a write MongoDB arbitrates); there is no transaction precedent in this codebase and the connection string is not configured for one, so it is an open owner decision, pinned by an `it.failing` test in `users.service.last-super-admin.spec.ts`. **`RECOVERY_SECRET` leaks and becomes a backdoor.** **Mitigation:** it is useless without shell access to the host; every run writes an audit row and emails the other Super Admins, so a run nobody authorised is visible rather than silent. **The single-Super-Admin warning is ignored.** **Mitigation:** it is persistent rather than dismissible, since the condition is persistent. **An organisation with exactly one Super Admin cannot demote them at all.** **Accepted:** that is the intent; the remedy is to appoint a second, which the warning asks for. |
| **Consequences** | `UsersService` gains `assertNotLastSuperAdmin`, called in `updateAccountStatus` and `assignRoles`. New refusal code `lastSuperAdmin` registered in all three vocabularies. New script `api/src/recover-super-admin.ts` with its own npm script, built via `tsc` to a separate outDir — never `nest build`, which deletes `dist/` and stops a running API (owner decision 2026-09-17). `RECOVERY_SECRET` documented in `.env.example`. The dashboard gains a standing banner. |

---

## D3 — The count and the write become one transaction (owner decision 2026-09-27)

**Status: Accepted — implementation in Batch 5.**

D1's guard closes the stale-screen case and not true concurrency: two requests
demoting two different holders each truthfully see one other active holder, and
both write. Counting the others rather than all of them states the question
better and is the same arithmetic.

The fix is to make the count and the write a single operation. **The topology
supports it, verified 2026-09-27** rather than assumed:

| Checked | Result |
| --- | --- |
| `api/.env.example` scheme | `mongodb+srv://` — Atlas, where every cluster is a replica set, so no `replicaSet` parameter is needed |
| Local development mongod | reports `setName: rs0` — a replica set, not a standalone |
| `startTransaction()` against it | **succeeded** (started and aborted, nothing written) |
| `mongodb-memory-server` | already a devDependency at `^11.2.0`, already exports `MongoMemoryReplSet` |

So this needs **no new dependency and no change to the connection string**.

Every path that can reduce the number of active Super Admins runs the count and
the write in one transaction: **account suspension or deactivation, removal of
the system role, and account archival** (the third has no route today and must
gain the guard with the route). The `it.failing` test in
`users.service.last-super-admin.spec.ts` becomes an ordinary passing test at that
point, and until then it stays as the standing record that the property is not
yet held.

## D4 — The lockout is scoped, not waived (owner decision 2026-09-27)

**Status: Accepted — implementation in Batch 5.** Supersedes the two options
offered when D1's gap was reported; **exempting system-role holders from the
lockout was considered and rejected**, because it removes brute-force protection
from the one account that most needs it.

Three parts, together:

**(a) The lockout counts per (account + IP address), with escalating delay.**
NIST 800-63B §5.2.2. Someone guessing from another address can no longer lock the
account holder out of their own account, which is the whole of the denial this
closes. The existing `securitySettings` bound — attempts before lockout, 3 to 10 —
keeps its range and changes meaning: it is per (account + IP), not per account.

**(b) A much higher account-wide ceiling still exists**, on the order of 100
failed attempts in 24 hours, so a distributed attempt is not unbounded. Reaching
it is recorded as a security event and notifies the other Super Admins through
`MailPort` (ADR-0108).

**(c) `lockedUntil` joins the active-Super-Admin count**, and the break-glass
command clears it — so the count stops reporting an account as available when it
cannot sign in, and there is a way back when it happens.

**Unchanged: 2FA remains a condition of entry.** A correct password alone opens no
session (ADR-0108), so the lockout is one layer of several rather than the barrier.

## D1 — "Active Super Admin" is computed, never stored

An active Super Admin is an account with `accountStatus: 'Active'`,
`archivedAt: null`, holding a role with `isSystemRole: true`.

**This definition is incomplete, found by independent review 2026-09-27.**
`accountStatus` is not the only way an account stops being able to sign in:
`AuthService` refuses on `lockedUntil` *before* it reads `accountStatus`, and
`lockedUntil` is set by five wrong passwords from an **unauthenticated**
`POST /auth/login`. So an attacker who knows the sole Super Admin's login address
can hold the platform in "no Super Admin can sign in" in fifteen-minute
episodes, while this count still reports them active.

Two other ways exist and are both unreachable today: `archivedAt` (no user
delete or archive route exists) and losing the `Local` `authMethods` entry (no
route). Those need no change.

The lockout one does, and it is **decided in D4**: the lockout is scoped to
(account + IP) rather than waived for privileged accounts, a much higher
account-wide ceiling remains, and `lockedUntil` joins this count. So the
definition of "active" gains a fourth clause — `lockedUntil` is null or past —
when D4 lands in Batch 5.

Computed on demand rather than kept as a counter. A stored count is a second
source of truth that drifts the first time a role is archived by one path and a
user by another, and the drift is invisible until the moment it matters.

## D2 — The command never sets a password

It issues the same single-use setup token ADR-0110 defines, and prints the link.
No email service exists in the repository, so printing to the command's output is
the only delivery available today, and the brief accepts that until a provider is
chosen.

The operator therefore restores *access to set a credential*, not the credential —
which is the difference between recovering an account and taking it.

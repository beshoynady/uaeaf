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
| **Risks** | **The count is read when the screen opens and a concurrent demotion slips past.** **Mitigation:** the check runs inside the handler, immediately before the write, reading current state — CLAUDE.md §31, whose own evidence is precisely this class of bug. **`RECOVERY_SECRET` leaks and becomes a backdoor.** **Mitigation:** it is useless without shell access to the host; every run writes an audit row and emails the other Super Admins, so a run nobody authorised is visible rather than silent. **The single-Super-Admin warning is ignored.** **Mitigation:** it is persistent rather than dismissible, since the condition is persistent. **An organisation with exactly one Super Admin cannot demote them at all.** **Accepted:** that is the intent; the remedy is to appoint a second, which the warning asks for. |
| **Consequences** | `UsersService` gains `assertNotLastSuperAdmin`, called in `updateAccountStatus` and `assignRoles`. New refusal code `lastSuperAdmin` registered in all three vocabularies. New script `api/src/recover-super-admin.ts` with its own npm script, built via `tsc` to a separate outDir — never `nest build`, which deletes `dist/` and stops a running API (owner decision 2026-09-17). `RECOVERY_SECRET` documented in `.env.example`. The dashboard gains a standing banner. |

---

## D1 — "Active Super Admin" is computed, never stored

An active Super Admin is an account with `accountStatus: 'Active'`,
`archivedAt: null`, holding a role with `isSystemRole: true`.

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

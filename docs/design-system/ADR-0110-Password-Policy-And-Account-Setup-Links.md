# ADR-0110 — Passwords follow NIST 800-63B, and whoever creates an account never knows its password

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-26. |
| **Authority** | Product Owner brief, 2026-09-26 (decisions B6, A11). Standard: NIST SP 800-63B. |
| **Amends** | `CreateUserDto` **loses `password`**. `users.passwordResetToken` and `passwordResetExpiresAt` are removed in favour of a dedicated collection. |
| **Does not amend** | The lockout counter. · `authMethods[].passwordHash` staying `select: false` with one legitimate internal reader. · The account-creation permission itself. |
| **Context** | Two problems. **The creator chooses the password.** `POST /users` takes a plaintext `password` (minimum 12) alongside `roleIds`, so an administrator creating an account knows its credential — which is the step that turns ADR-0104's grant hole into a working account takeover, and is poor practice regardless: a credential known to two people is not an authentication factor. **And there is no way to set one otherwise.** `passwordResetToken`/`passwordResetExpiresAt` exist on the schema and **no route reads or writes them** — a reset flow was modelled and never built, so the only path to a password is for someone else to pick it. |
| **Decision** | **Policy, per NIST 800-63B:** minimum length from `securitySettings` (floor 12), long passphrases permitted, **no composition rules and no periodic expiry**. Rejected are passwords on a local breached/common list committed to the repository — **checked with no network call, ever** — and any password containing the account's name or the local part of its email. A forced change happens only on suspected compromise or at first sign-in. **Setup links:** `POST /users` drops `password`. A new account receives a single-use setup token — 32 random bytes, stored as a SHA-256 hash, 72-hour expiry — consumed by `POST /auth/setup-password`. The same mechanism serves administrator reissue and ADR-0105's break-glass command. Tokens live in a new `accountSetupTokens` collection rather than on the user. |
| **Alternatives Considered** | **(A) Keep `password` on creation and require an immediate change at first sign-in.** Rejected: between creation and that first sign-in the creator can use the account, and nothing records that they did. **(B) Generate a random password and show it to the creator once.** Rejected for the same reason — the creator still learns a working credential. **(C) Revive `passwordResetToken` on the user document.** Rejected: one nullable field cannot express a token's hash, its expiry, whether it has been consumed and what it was for, and a reissue would overwrite the outstanding one with no record. A row per token is the shape that answers those. **(D) Enforce composition rules (upper, digit, symbol).** Rejected by NIST 800-63B and on evidence: composition rules push users toward predictable substitutions and offer less strength than length. **(E) Check passwords against an online breach API.** Rejected: the brief forbids a network call, and it would leak a password prefix to a third party on every account creation. **(F) Periodic forced expiry.** Rejected by NIST 800-63B: scheduled rotation produces incremented variants of one password. |
| **Why This Decision** | NIST 800-63B is the standard the rest of the platform's security posture already implies, and following it means the rules are defensible rather than folkloric. The setup link is the smaller half of the change and the load-bearing one: it makes "who created this account" and "who can sign in as it" two different questions, which is what ADR-0104's stronger-user rule needs in order to mean anything. |
| **Risks** | **A setup link is the only way in, and the platform cannot send email.** **Mitigation:** none is available today — no mail service exists in the repository — so the link is printed to the creating administrator's response and the command's output, as the brief accepts, until a provider is chosen. This is recorded as an open dependency, not hidden. **A leaked link is an account takeover.** **Mitigation:** single use, 72-hour expiry, hash at rest, and consumption is audited; reissue invalidates the outstanding token. **The breached-password list bloats the repository.** **Mitigation:** the common-password subset, not the full corpus — tens of thousands of entries, compressed, which covers the passwords actually chosen. **Dropping `password` breaks the dashboard's create-user form.** **Mitigation:** the form change is in the same batch, and `create-user-body.ts` already validates the body shape in one place. |
| **Consequences** | `CreateUserDto` loses `password`. New collection `accountSetupTokens` with a unique index on the token hash. New routes `POST /auth/setup-password`, `POST /users/:id/setup-link`. `users.passwordResetToken`/`passwordResetExpiresAt` removed. A local password deny-list file. `securitySettings.minPasswordLength` is the length source. The dashboard's create-user form loses its password fields and gains the link. |

---

## D1 — The current hash, and why it is not changed here

`bcryptjs@3.0.3` at **10 rounds** (`users.service.ts:38`). bcrypt is an acceptable
NIST verifier, so nothing is broken. Ten rounds is below the twelve commonly
recommended in 2026.

Raising it is one constant plus a transparent rehash on the next successful login.
Moving to argon2id would be stronger still and needs a new native dependency. The
brief requires dependency and hash changes to be presented rather than taken, so
both are offered as questions in the spec and **neither is implemented by this
ADR**.

## D2 — Why a collection rather than two fields

A token has four facts: its hash, when it expires, whether it has been used, and
what it was issued for — creation, administrator reissue, or break-glass. Two
nullable fields on the user can hold the first two and lose the rest, and a
reissue silently destroys the outstanding token with nothing recording that it
existed.

One row per token keeps the history, lets an audit row point at the specific token
consumed, and makes "this link was already used" a different answer from "this
link expired".

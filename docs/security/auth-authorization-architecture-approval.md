# UAEAF Backend — Authentication & Authorization: Architecture Approval Specification

**Phase:** Architecture / Design only. No source code, schema, DTO, controller, service, guard, strategy, config, migration, test, or `package.json` was modified to produce this document.

**Prepared as:** Senior Backend Architect + Application Security Engineer + NestJS/MongoDB Security Reviewer.

**Date:** 2026-09-06

**Inputs inspected:**
- The live repository (`api/src/**`, `api/test/**`) — read directly, file by file, listed inline throughout this document.
- `docs/audits/auth-security-audit-2026-09-05.md` — the prior Deep Security Audit (Arabic).
- `api/docs/audits/p0-fix-session-notes-2026-09-06.md` — notes from the P0 remediation session.
- `Audit Decision Matrix.txt` — **referenced by the task brief, but not found anywhere in this repository and not attached to this conversation.** Every recommendation below is therefore based on the actual codebase plus the 2026-09-05 audit report only. If a separate Decision Matrix exists elsewhere, its decisions should be reconciled against this document before final approval. **OPEN DECISION.**

**Skills checked:** `.claude/skills/` contains `figma`, `find-skills`, `frontend-design`, `framer-motion-animator`, `gsap-framer-scroll-animation`, `impeccable`, `speckit-*`, `uaeaf-design-orchestrator`, `ui-ux-pro-max`, `wcag-audit-patterns` — all design/frontend/spec-workflow tooling. None target backend security architecture, NestJS authorization, or MongoDB schema/index review, so none were invoked for this analysis. No skill was invented.

---

## 1. Executive Summary

The 2026-09-05 audit found four P0-critical, exploitable vulnerabilities in this system. **All four have since been fixed** in a dedicated remediation session (2026-09-06), verified by e2e tests that reproduce each original exploit and confirm it is now rejected:

1. `authMethods[].passwordHash` leaking through `GET /users*` — fixed (`select: false` + allowlist `UserResponseDto`).
2. The `roles:Create`/`roles:Update` + `users:Update` → Super Admin escalation chain — fixed (`RolesService.assertGrantable()`, self-assignment blocked outright).
3. `updatePermissions()` not checking `isSystemRole` — fixed (`assertNotSystemRole()` added).
4. No session/revocation layer at all — fixed (`AuthSession` collection, refresh rotation, reuse detection, `POST /auth/logout`, `POST /auth/logout-all`).

This document does **not** re-litigate those four. It picks up where the audit's P1–P3 list and its own "Recommended Target Architecture" (§22) left off, verifies each item against the *current* (post-fix) code — not the pre-fix snapshot the audit describes — and produces a single, final, approved target architecture plus a phased implementation plan.

**Overall verdict: the core RBAC engine is sound and the highest-severity holes are closed.** What remains is the *account lifecycle* around it — invitation, password reset/change, account suspension, MFA, session-layer audit logging — none of which exist today, all of which a production federal-entity system needs. There is also one operational gap this review surfaced that neither prior document flagged: **there are no seed scripts anywhere in the repository.** A fresh environment has no scripted way to create the first Permission catalog, the first system Role, or the first admin User — today that requires hand-crafted MongoDB inserts. This is treated as a P1 item below (§30, §31), not a security vulnerability per se, but a real blocker to standing the system up safely and repeatably.

---

## 2. Current Architecture (as it actually exists in the code, 2026-09-06)

```
POST /api/v1/auth/login  (rate-limited 10/60s per IP)
        │
        ▼
AuthService.login()
  → UsersRepository.findByEmail() (opts back into passwordHash via .select('+authMethods.passwordHash'))
  → lockedUntil check → accountStatus==='Active' check → bcrypt.compare()
  → on failure: UsersService.recordFailedLogin() (non-atomic read-then-write)
  → on success: resolvePermissions(roleIds) [N+1 Promise.all pattern]
  → issueTokens(): mints access JWT {sub,type:'access',permissions} (15m)
                   mints refresh JWT {sub,type:'refresh',sessionId} (7d)
                   creates AuthSession row {userId, refreshTokenHash: sha256(token), expiresAt, ipAddress, userAgent}
        │
        ▼
Every protected request
  RateLimitGuard → JwtAuthGuard (passport 'jwt', rejects type!=='access') → PermissionsGuard
  (permissions read from the JWT payload only — no DB query per request)
        │
        ▼
POST /api/v1/auth/refresh
  → verify signature+type==='refresh' → look up AuthSession by sessionId
  → reject if missing/revoked/already-replaced (reuse detection, revokes on detection)
  → reject if sha256(token) !== stored hash (defensive)
  → re-resolve permissions fresh from DB → issue new pair → mark old session replacedBySessionId

POST /api/v1/auth/logout        (authenticated; revokes the session named by the given refresh token)
POST /api/v1/auth/logout-all    (authenticated; revokes every session for the caller)
```

**Collections in play:** `users`, `roles`, `permissions`, `authSessions`, `auditLogs`. No `authTokens`, no invitation/activation mechanism, no password-reset mechanism, no MFA, no OAuth flow (only a placeholder enum value).

**Global guard order** (`app.module.ts`, `APP_GUARD`, execution order = registration order): `RateLimitGuard` → `JwtAuthGuard` → `PermissionsGuard`. Default-deny is enforced globally; a route needs `@Public()` to opt out. `AuditLogInterceptor` runs as an `APP_INTERCEPTOR` on every successful POST/PATCH/PUT/DELETE with an authenticated actor.

---

## 3. Current Security Risks (verified against the code as it stands *today*, not the pre-fix snapshot)

| # | Risk | Severity | Status |
|---|---|---|---|
| R1 | No password-reset flow; `passwordResetToken`/`passwordResetExpiresAt` fields exist on `User` but are never read or written anywhere in the codebase | P1 | Open |
| R2 | No password-change endpoint for an authenticated user | P1 | Open |
| R3 | No account-suspend/reactivate endpoint at all — `accountStatus` can only ever be set once, at creation (`'Active'`), by `UsersService.create()` | P1 | Open |
| R4 | Login/logout/refresh/logout-all are not written to `auditLogs` | P1 | Open |
| R5 | `roles:Assign` is not a separate permission from `users:Update` | P1 | Open |
| R6 | No seed scripts anywhere — no way to bootstrap the first Permission catalog / system Role / admin User | P1 | Open (new finding, not in the 2026-09-05 audit) |
| R7 | `PermissionsController.create()` never validates that `resourceType` names a real, registered collection — the boot-time check (`PermissionsService.onApplicationBootstrap`) only runs once, at startup | P1/P2 | Open (new finding) |
| R8 | No unique index on `permissions.(resourceType, action)` — duplicate rows for the same logical permission are possible | P2 | Open |
| R9 | `resolvePermissions()` resolves roles/permissions via N parallel `findById()` calls instead of one `$in` query, on every login and refresh | P2 | Open |
| R10 | `recordFailedLogin()` is a read-then-write, not an atomic `$inc` — a narrow, low-impact race can under-count one failed attempt | P2 | Open |
| R11 | `AuthMethod` has no provider-specific validation (a `Local` entry could theoretically be missing `passwordHash`, or an OAuth entry could carry one) | P2 | Open |
| R12 | No `securityStamp`/`authzVersion` — a revoked role's permissions remain valid in an already-issued access token for up to its 15-minute lifetime | P2 | Accepted trade-off (see §21) unless the owner requires stricter bounds — **OPEN DECISION** |
| R13 | JWT signing/verification does not pin `algorithm: 'HS256'` explicitly, and carries no `iss`/`aud`/`jti` | P3 | Open |
| R14 | `bcryptjs` at cost 10, not Argon2id or a higher bcrypt cost | P3 | Open (see §8 for the recommended, non-disruptive migration path) |
| R15 | No unique index on `roles.name` (no `key` field exists to index either) | P3 | Open |
| R16 | `/auth/refresh`, `/auth/logout`, `/auth/logout-all` have no dedicated rate limit (fall to the generic 100/60s default) | P2 | Open |
| R17 | MFA does not exist | P3 | Deferred by design (see §22) |
| R18 | OAuth (Google/Microsoft) does not exist beyond a placeholder enum value | P3 | Deferred by design (see §23) |

Nothing above is a P0. The P0 list from the 2026-09-05 audit is empty against the current code.

---

## 4. Target Architecture

The target keeps the current design's two genuinely strong decisions and builds the missing account-lifecycle around them:

- **Keep:** permissions embedded in a short-lived (15m) access JWT, resolved fresh from the DB only at login/refresh — this is what lets `PermissionsGuard` run with zero DB queries per request. This document explicitly **rejects** replacing it with per-request DB resolution; see §27 for the trade-off analysis.
- **Keep:** refresh tokens as signed JWTs (not opaque random bytes) whose real revocability comes from the `AuthSession` row, not from token opacity. This document explicitly **rejects** the "switch to an opaque random refresh secret" idea floated as an evaluation point; see §14 for why.
- **Add:** `AuthToken` collection for one-time flows (activation, password reset), `Invited` account status, password change/reset endpoints, account suspend/reactivate endpoint, auth-lifecycle audit events, a `roles:Assign`-equivalent permission, seed scripts, and the index/perf/hardening fixes in §3.
- **Defer, deliberately:** MFA and OAuth. Both are real, justified future work, not needed to close today's actual risk (§3 has no P0s), and both would be built on top of the account-lifecycle primitives added here (an `AuthToken` purpose for MFA recovery, `AuthMethod.providerId` for OAuth linking) rather than requiring new foundational structures later.

---

## 5. User Schema

**Current fields** (`user.schema.ts`, extends `BaseSchema`: `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`, `createdAt`, `updatedAt`):

| Field | Type | Required | Default | Index | Sensitive | Mutable | Purpose |
|---|---|---|---|---|---|---|---|
| `name` | `LocalizedText {en, ar}` | yes | — | no | no | yes | Display name |
| `email` | `string` | yes | — | unique, partial (`archivedAt: null`) | no | yes (admin-only today) | Login identity |
| `roleIds` | `ObjectId[]` (ref `Role`) | no | `[]` | no | no (ids only) | yes | RBAC assignment |
| `personId` | `ObjectId \| null` (ref `FederationPersonnel`) | no | `null` | no | no | yes | Links a staff account to its personnel record |
| `accountStatus` | `'Active'\|'Suspended'\|'Deactivated'` | no | `'Active'` | no | no | **no path to mutate it exists today** | Lifecycle gate checked at login and refresh |
| `lastLogin` | `Date \| null` | no | `null` | no | no | system-set | Observability |
| `authMethods` | `AuthMethod[]` | no | `[]` | no | **yes** (`passwordHash` sub-field) | yes | Sign-in credentials |
| `passwordResetToken` | `string \| null` | no | `null` | no | yes (dead field) | never written | **Recommend: remove** (see below) |
| `passwordResetExpiresAt` | `Date \| null` | no | `null` | no | no (dead field) | never written | **Recommend: remove** (see below) |
| `failedLoginAttempts` | `number` | no | `0` | no | no | system-set | Brute-force counter |
| `lockedUntil` | `Date \| null` | no | `null` | no | no | system-set | Brute-force lockout |

**Recommended additions:**

| Field | Type | Required | Default | Index | Sensitive | Mutable | Purpose |
|---|---|---|---|---|---|---|---|
| `passwordChangedAt` | `Date \| null` | no | `null` | no | no | system-set | Drives "sessions issued before this must be re-verified" logic if ever needed; also useful audit metadata |
| *(status enum extended)* | add `'Invited'` to `ACCOUNT_STATUSES` | — | — | — | — | — | Supports §12's invitation flow |

**Recommended removal:** `passwordResetToken` / `passwordResetExpiresAt`. These are exactly the "dead security fields without a real workflow" the task brief warns against. The real reset flow (§18) stores its token in the new `AuthToken` collection (hashed, with `purpose`/`expiresAt`/`usedAt`), not on `User` directly — this also means a reset token is never visible on a `GET /users/:id` response even by accident, since it never lives on the `User` document at all.

**Explicitly rejected additions from the target-architecture brief:**
- `authzVersion` / `securityStamp` — see §21. Not added; the existing `AuthSession`-based revocation already covers what these two fields exist to solve in frameworks that lack real server-side session tracking. Adding them here would be exactly the "duplicated security concept" the brief itself warns against introducing.
- MFA state fields (`mfaEnabled`, `mfaSecretHash`, etc.) — deferred to the P3 MFA phase (§22); adding the fields now with no consuming code would be dead schema, the same anti-pattern being removed above.

**Relationships:** `roleIds` → `roles._id` (many-to-many via array); `personId` → `federationPersonnel._id` (one-to-one, optional). **Constraints:** email uniqueness is a partial index scoped to non-archived documents (a soft-deleted user's email can be reused — correct behavior, already implemented). **Lifecycle:** `Active` → `Suspended` (reversible) / `Deactivated` (terminal, by convention — no code enforces irreversibility today; §20 defines this properly) → (new) `Invited` as the pre-`Active` state for newly created accounts.

---

## 6. AuthMethod Schema

**Current** (`auth-method.schema.ts`, embedded, `_id: false`):

| Field | Type | Required | Default | Index | Sensitive | Mutable | Purpose |
|---|---|---|---|---|---|---|---|
| `provider` | `'Local'\|'Google'\|'Microsoft'` | yes | — | no | no | no (one entry per provider, not swapped in place) | Which sign-in method this entry represents |
| `passwordHash` | `string?` | no | — | **`select: false`** | **yes** | no | bcrypt hash, Local only |
| `providerId` | `string?` | no | — | no | no | no | OAuth subject id, OAuth only |
| `linkedAt` | `Date` | no | `Date.now` | no | no | no | When this method was added |

**Verified:** `passwordHash` is `select: false` (fixed 2026-09-06); the only internal caller that opts back in is `UsersRepository.findByEmail()`, used exclusively by `AuthService.login()`. No other query path in the codebase requests `+authMethods.passwordHash`. This closes audit P0 #1 completely — confirmed by reading every call site, not assumed.

**Gap (R11, P2):** nothing enforces "Local ⇒ `passwordHash` present, `providerId` absent" or "OAuth ⇒ `providerId` present, `passwordHash` absent." Recommended: a Mongoose pre-validate hook on `AuthMethod` (or validation inside `UsersService`/a future `AuthMethodsService`) enforcing this pairing. Not urgent — there is currently no code path that can construct a malformed entry (only `UsersService.create()` writes `authMethods`, and it always writes a well-formed `Local` entry) — but it becomes load-bearing the moment account linking/unlinking (§7) or OAuth (§23) is built, so it belongs in the same implementation batch as either.

**No `lastUsedAt` field exists.** Recommended addition when multi-method accounts become real (i.e., alongside OAuth, §23) — not useful with only one method in practice today, so deferred rather than added speculatively.

---

## 7. Role Schema

**Current** (`role.schema.ts`, extends `BaseSchema`):

| Field | Type | Required | Default | Index | Sensitive | Mutable | Purpose |
|---|---|---|---|---|---|---|---|
| `name` | `LocalizedText {en, ar}` | yes | — | **none** | no | yes, unless `isSystemRole` | Display label |
| `permissionIds` | `ObjectId[]` (ref `Permission`) | no | `[]` | no | no | yes, gated by `assertGrantable` + `assertNotSystemRole` | The role's grants |
| `isSystemRole` | `boolean` | no | `false` | no | no | no (never toggled after creation — no endpoint sets it) | Protects rename/delete/`updatePermissions` |

**Recommended addition:**

| Field | Type | Required | Default | Index | Sensitive | Mutable | Purpose |
|---|---|---|---|---|---|---|---|
| `key` | `string \| null` | no | `null` | unique, partial (`key: {$ne: null}`) | no | no, once set | Stable, human-meaningful, code-referenceable identifier (`"SUPER_ADMIN"`, `"CONTENT_EDITOR"`) decoupled from the bilingual display name and from MongoDB `_id` |

**Why `key` and not `isActive`:** the brief's target model asks about both. `key` earns its place — it is the only reasonable way for seed scripts (§30/§31) and any future code that needs to say "the Super Admin role, specifically" to do so without hardcoding an `ObjectId` or fragile-matching a translated display string. **`isActive` is rejected**: a role's "not usable anymore" state is already exactly what `archivedAt` (inherited from `BaseSchema`) represents. Adding `isActive` alongside `archivedAt` would be two fields answering the same question — precisely the duplication the brief itself says to avoid (§9, §21's general principle). If a role needs to be temporarily disabled without deleting it, `archivedAt` already does that (an archived role's permissions should simply be excluded from `resolvePermissions()` — confirm this is already true: **verified not true today** — `resolvePermissions()` calls `RolesService.findById()`, which does not filter `archivedAt`. This is a genuine gap worth closing at the same time `key` is added: archived roles should stop contributing permissions. Flagged as P1, bundled with the `key` addition since both touch the same code path.

**Index plan:** `key` unique partial index (new). `name` deliberately **not** given a unique index — it is bilingual display text edited by admins; forcing uniqueness on it is a UX constraint with no security value now that `key` exists as the real stable identifier. This directly answers the audit's P3 #19 ("unique index on `roles.name`") — the recommendation is to redirect that need to the new `key` field instead of `name`.

**System role protection — current and confirmed correct:** `rename()`, `updatePermissions()`, and `remove()` all call `assertNotSystemRole()` first (verified in `roles.service.ts`). No endpoint can toggle `isSystemRole` itself — it is set only at document construction, and nothing in `CreateRoleDto` accepts it (confirmed: `CreateRoleDto` has only `name`/`permissionIds`). This is correct and should not change.

---

## 8. Permission Schema

**Current** (`permission.schema.ts`, extends `BaseSchema`):

| Field | Type | Required | Default | Index | Sensitive | Mutable | Purpose |
|---|---|---|---|---|---|---|---|
| `name` | `LocalizedText {en, ar}` | yes | — | no | no | yes | Display label only — never used for authorization matching |
| `resourceType` | `string` | yes | — | **none today** | no | no (no update endpoint exists) | Technical identity, half of the authorization key |
| `action` | `'Create'\|'Read'\|'Update'\|'Delete'\|'HardDelete'\|'Approve'\|'Publish'\|'EditProtectedData'` | yes | — | **none today** | no | no | Technical identity, other half |

**Confirmed:** authorization matching (`PermissionsGuard`, `RolesService.assertGrantable`) compares `resourceType`+`action` exclusively — `name` is never read for any access-control decision. This is correct and matches the brief's explicit requirement ("do not use localized names as authorization identifiers").

**Required index (P1, not P2 — upgraded from the original audit's P2 rating given the compounding gap found in §26 below):**

```
PermissionSchema.index({ resourceType: 1, action: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });
```

Partial (matching the project's own established convention for `email`/`slug` uniqueness) so a soft-deleted duplicate doesn't block a legitimate re-creation.

**Action enum — recommended expansion.** Two additions, both as new `PERMISSION_ACTIONS` values reused under the existing `resourceType: 'users'` (not new resource types — this keeps the model's shape unchanged and matches how `EditProtectedData` was already added as an action, not a resource):

| New action | Paired resourceType | Replaces | Reason |
|---|---|---|---|
| `AssignRoles` | `users` | The current use of `users:Update` for `PATCH /users/:id/roles` | Closes audit P1 #10 / R5 — role assignment is a materially more sensitive act than "edit a user's name," and should not be silently inherited by any future route that happens to also require `users:Update` |
| `ManageAccountStatus` | `users` | Nothing (net-new capability) | Backs the new suspend/reactivate endpoint (§20) with its own boundary, separate from `users:Update` |

**Not added:** a session-management action (e.g., "admin force-logs-out another user"). No such capability is requested or implied anywhere in the current codebase or audit — `logout`/`logout-all` are both hard-scoped to the caller's own identity (verified: `AuthService.logout()` checks `payload.sub !== actorUserId`). Adding a permission for a capability that doesn't exist yet would be exactly the "actions added simply for completeness" the brief says not to do.

---

## 9. AuthSession Schema

**Current** (`auth-session.schema.ts`) — already matches the target architecture closely; no changes recommended beyond what §30 lists as future hygiene (a TTL index, P2/P3, not required for correctness).

| Field | Type | Required | Default | Index | Sensitive | Mutable | Purpose |
|---|---|---|---|---|---|---|---|
| `userId` | `ObjectId` (ref `User`) | yes | — | compound `{userId, revokedAt}` | no | no | Owner |
| `refreshTokenHash` | `string` | yes | — | no (looked up via `sessionId` = `_id`, not by hash) | yes (but it's a hash, not the token) | no | Verifies the presented refresh token matches what was actually issued |
| `issuedAt` | `Date` | yes | `Date.now` | no | no | no | Audit/debugging |
| `expiresAt` | `Date` | yes | — | no (see TTL note below) | no | no | Mirrors the refresh JWT's own `exp` |
| `revokedAt` | `Date \| null` | no | `null` | part of compound index | no | system-set | Terminal state; a refresh against a revoked row always fails |
| `replacedBySessionId` | `ObjectId \| null` (ref `AuthSession`) | no | `null` | no | no | system-set once | Reuse-detection forward link |
| `ipAddress` | `string` | no | `''` | no | no (already low-sensitivity; not hashed) | no | Forensics |
| `userAgent` | `string` | no | `''` | no | no | no | Forensics |

**Why this deliberately does not extend `BaseSchema`:** already documented in the schema's own comment and confirmed correct on review — `createdBy`/`updatedBy` would only ever duplicate `userId`, and `archivedAt` soft-delete doesn't fit a record whose whole purpose is to be *kept* after its terminal state (`revokedAt`) so reuse-detection has something to check against.

**Session lookup strategy — confirmed correct:** the refresh JWT carries `sessionId`, which is the row's own `_id` — an indexed, O(1) lookup, not a scan. The `{userId, revokedAt}` compound index serves exactly the two real query patterns: "is this specific session still valid" (by `_id`, doesn't need the compound index) and "every active session for this user" (logout-all — uses the compound index directly).

**Reuse detection — confirmed correct and already tested** (`test/e2e/auth-sessions.e2e-spec.ts`): presenting an already-rotated refresh token is rejected, and the row is force-revoked if it wasn't already, closing the "attacker replays a stolen-but-already-used token" window at the point of first detection rather than waiting for a scheduled sweep.

**"Session family" behavior (brief's term):** not implemented as a distinct concept, and not recommended as one. The current design already achieves the practical goal a session family exists for — reuse of any token in a rotation chain revokes that chain's *current* session — without needing to track the whole chain's history explicitly. Adding a separate "family id" concept on top would be tracking the same fact two ways.

---

## 10. AuthToken Schema (new)

Required for password reset (§18) and account activation (§12) — currently, **neither can be built without this**, since `User.passwordResetToken` is a bare unhashed string field with no expiry-purpose separation and (per §5) is being removed rather than reused.

| Field | Type | Required | Default | Index | Sensitive | Mutable | Purpose |
|---|---|---|---|---|---|---|---|
| `userId` | `ObjectId` (ref `User`) | yes | — | compound `{userId, purpose, usedAt}` | no | no | Owner |
| `tokenHash` | `string` | yes | — | unique | yes (hash only, never the raw token) | no | SHA-256 of the raw token, same pattern as `AuthSession.refreshTokenHash` |
| `purpose` | `'AccountActivation'\|'PasswordReset'\|'EmailVerification'\|'MfaRecovery'` | yes | — | part of compound index | no | no | Which flow this token belongs to — a reset token must never validate an activation attempt or vice versa |
| `expiresAt` | `Date` | yes | — | TTL index (see below) | no | no | Time-bounds the token |
| `usedAt` | `Date \| null` | no | `null` | part of compound index | no | system-set once | Single-use enforcement |
| `revokedAt` | `Date \| null` | no | `null` | no | no | system-set | Explicit invalidation (e.g. "resend" revokes the previous token) |

**Index plan:**
```
AuthTokenSchema.index({ tokenHash: 1 }, { unique: true });
AuthTokenSchema.index({ userId: 1, purpose: 1, usedAt: 1 });
AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL — used/expired tokens don't need to be retained
```

One collection, four purposes (not four collections) — matches the brief's own framing and avoids four near-identical schemas for what is structurally the same record. `MfaRecovery` is listed now even though MFA is deferred (§22), so the collection doesn't need a breaking shape change when MFA is eventually built — it can start emitting rows with that `purpose` value on day one of that phase with zero schema migration.

**Never extends `BaseSchema`**, for the same reasoning as `AuthSession` — these are system-managed, single-use records, not user-editable content, and a TTL-expired row should be physically removed, not soft-deleted.

---

## 11. JWT Architecture

**Access token — current payload, confirmed via `jwt-payload.interface.ts` and `AuthService.issueTokens()`:**
```json
{ "sub": "<userId>", "type": "access", "permissions": [{ "resourceType": "...", "action": "..." }], "iat": ..., "exp": ... }
```
(`iat`/`exp` added automatically by `jsonwebtoken` via `expiresIn`; not explicit fields in the interface.)

**Refresh token — current payload:**
```json
{ "sub": "<userId>", "type": "refresh", "sessionId": "<AuthSession _id>", "iat": ..., "exp": ... }
```

**Recommended additions (P2/P3, defense-in-depth, no behavior change):**

| Claim | Add to | Value | Reason |
|---|---|---|---|
| `iss` | both | a fixed string, e.g. `"uaeaf-backend"` | Cheap tamper-evidence; costs one `issuer` check in `JwtStrategy`'s passport-jwt options plus a matching `verifyAsync` option in `AuthService` |
| `aud` | both | e.g. `"uaeaf-api"` | Same category of defense-in-depth; matters more once a second consumer (a mobile app, a partner integration) exists with a *different* intended audience |
| `jti` | access only | `crypto.randomUUID()` | Not required for anything functional today (access tokens are never looked up by id) — recommended only as cheap forensic value in future audit logging (§24), not as a live revocation key |

**Explicitly not recommended:** a `jti`-based access-token revocation list. That would require a DB/cache check on every request — the exact per-request cost the current design is built to avoid, for a benefit (sub-15-minute access-token revocation) that §21 already treats as an open business-risk decision, not a default requirement.

**Algorithm/key separation:** both tokens are signed with the same symmetric secret (`JWT_SECRET`) via HS256 (the `@nestjs/jwt`/`jsonwebtoken` default when only a plain secret is configured — confirmed neither `auth.service.ts` nor `jwt.strategy.ts` passes an explicit `algorithm` option). **Recommendation: pin `algorithm: 'HS256'` explicitly** in both the `sign()` calls and the `JwtStrategy`'s passport-jwt options (P3) — pure defense-in-depth against a hypothetical future library default change; there is no known exploitable "algorithm confusion" today since no `alg: none` or asymmetric-key mismatch path exists to abuse. **Asymmetric signing (RS256/ES256) is not recommended** — nothing in this deployment's architecture (a single backend process validating its own tokens) benefits from public/private key separation, and introducing it would add key-management complexity with no corresponding security gain, exactly the "unnecessary cryptographic complexity" the brief says to avoid.

**Same secret for both token types — is this a problem?** No, given the enforced `type` claim (see §16) — the two token types are already cryptographically indistinguishable *by signature alone*, but `JwtStrategy.validate()` and `AuthService.refresh()` both reject the wrong `type`, closing that gap at the application layer rather than the crypto layer. Introducing a second secret to sign refresh tokens would add operational complexity (two secrets to rotate, two `JWT_*_SECRET` env vars) without closing any gap the `type` claim doesn't already close.

---

## 12. Authentication Flows

### Login (current, unchanged — already correct)
```
POST /api/v1/auth/login
  → generic "Invalid credentials." for: unknown email, wrong password, non-Active account
  → distinct message for an active lockout (deliberate, documented exception to enumeration-safety)
  → on success: resolvePermissions → issueTokens → AuthSession row created
```

### Refresh / Logout / Logout-all (current, unchanged — already correct)
Described in full in §2.

### Account creation (current — the flow to replace)
```
Admin (users:Create) → POST /api/v1/users {name, email, password}
  → UsersService.create() hashes the password, sets accountStatus: 'Active' immediately
  → no activation step of any kind exists
```

### Account creation (target)
```
Admin (users:Create) → POST /api/v1/users {name, email}   ← password REMOVED from CreateUserDto
  → UsersService.create() sets accountStatus: 'Invited', authMethods: []
  → an AuthToken{purpose: 'AccountActivation'} is minted and (see §30 dependency note) delivered to the user
        │
        ▼
POST /api/v1/auth/activate {token, password}
  → validates token (purpose, not expired, not used, not revoked)
  → hashes password, writes the Local authMethod, sets accountStatus: 'Active'
  → marks token usedAt
  → (MFA setup step deferred — see §22)
```

**Dependency this flow cannot avoid, and that neither prior document resolved:** delivering the activation link to the user requires an outbound channel. This repository's only messaging-shaped module (`modules/workflow/notifications`) is an **in-app** notification record with no email/SMTP integration (confirmed: no `nodemailer`/mailer/SES/SendGrid dependency anywhere in `package.json`). **OPEN DECISION:** either (a) wire a real email provider before this phase ships, or (b) accept an interim manual flow where an admin copies the activation link out of the API response / a log line to hand to the new user directly (workable for a small federation staff, not a scalable pattern). This is a business/infrastructure decision, not an architecture one — flagged here rather than silently assumed.

---

## 13. Authorization Model

Unchanged from the current, already-correct design: RBAC via `(resourceType, action)` pairs, resolved into a flat set at login/refresh, embedded in the access token, checked with zero DB queries per request by `PermissionsGuard`. Default-deny is global (`APP_GUARD`), `@Public()` is the explicit, auditable opt-out.

**Contextual authorization (RBAC + resource state, e.g. "is this specific record published / does it contain protected minor data") does not exist as a unified layer** — where it exists at all, it is hand-built per service (e.g. `PublicationsService.getPublicSnapshot`'s "Approved ≠ Published" rule). The 2026-09-05 audit correctly classified this as `DESIGN DECISION REQUIRED`, not a bug, and this document agrees: it is a cross-cutting content-domain question (which resources need field/state-aware gating beyond resourceType+action), not something this Auth/Authz-specific review can resolve unilaterally. **Out of scope for this approval; flagged for a separate design pass if the owner wants it pursued.**

---

## 14. Privilege Boundary Model

**Role creation** — current, verified correct: any actor with `roles:Create` may create a role, but `RolesService.assertGrantable()` rejects any `permissionId` the actor does not already hold themselves (resolved by matching `resourceType`+`action`, failing closed on an unresolvable id). **No change recommended.**

**Role modification** — current, verified correct: `updatePermissions()` runs `assertNotSystemRole()` *and* `assertGrantable()`, in that order (confirmed by reading the method body) — an actor cannot escalate a role they hold by adding a permission they don't have, and cannot touch a system role's permissions at all regardless of what they hold. **No change recommended.**

**Role assignment** — current: `PATCH /users/:id/roles` requires `users:Update` and unconditionally blocks `id === actor.userId` (self-assignment) — but does **not** check whether the *target* role's permission set exceeds what the *actor* holds. **This is a real, live gap**, distinct from the closed §16-chain: today, an actor with `users:Update` but no `roles:*` permissions at all can still assign an *existing* highly-privileged role (created earlier by someone else) to a *different* user, as long as they don't target themselves. **Recommendation (P1):** `UsersController.assignRoles()` should resolve the target role's permission set and apply the same `assertGrantable`-style check used for role creation/modification — "you cannot assign a role whose permissions exceed what you yourself hold" — closing the one remaining assignment-side gap the original audit's chain didn't fully cover (it focused on the attacker *creating* the over-privileged role themselves; assigning a *pre-existing* one is the same risk via a different entry point).

**Can an admin modify a role assigned to themselves?** Yes, subject to the same `assertGrantable` rule as any other role — they cannot add a permission via that edit that they don't already hold, so editing "your own" role cannot be used to escalate. Confirmed by reading the code path; no distinction is made (or needed) between "a role I hold" and "a role I don't," since the rule is actor-permission-based, not role-identity-based.

**Can they increase their own effective permissions indirectly?** The only remaining indirect path is the assignment gap just described (assigning themselves a role — blocked outright — or arranging for a *colluding* second account to assign them an over-privileged pre-existing role — closed by the P1 fix above, which checks the *actor's* held permissions regardless of whose role is being assigned).

---

## 15. SUPER_ADMIN Model

**Finding:** there is no `SUPER_ADMIN` concept anywhere in the code today. "Super Admin" appears only as a documentation/comment convention describing an assumed seed role — grep confirms zero references outside comments in `roles.service.ts`, `roles.service.spec.ts`, and `role.schema.ts`. There is no hardcoded bypass, no wildcard permission, no `isSuperAdmin` boolean, no special-cased guard branch anywhere.

**This is rated as a genuine strength, matching the audit's own §15 assessment**, not a gap: "Super Admin" is purely *data* — a `Role` document holding every seeded `Permission`, with `isSystemRole: true` protecting it from modification through the normal generic mechanisms. There is no code path that treats it differently from any other role.

**Target definition (formalized, not new behavior):** SUPER_ADMIN is precisely *the seeded role identified by `key: "SUPER_ADMIN"` (§7) holding the full current Permission catalog, with `isSystemRole: true`.* Its authority boundary is **exactly** the union of `assertGrantable`/`assertNotSystemRole`'s general rules — it has no capability outside "holds every permission that currently exists." When a new `Permission` is created, it does **not** automatically flow into any role, including this one — an explicit `updatePermissions()` call is required, itself subject to `assertGrantable` (trivially satisfied, since by definition the actor performing a legitimate SUPER_ADMIN-role edit already holds a superset). This is the "precise and auditable authority boundary" the brief asks for: auditable because every permission it holds is an explicit row in `permissionIds`, checkable with a single query; precise because there is no ambient "if role.key === 'SUPER_ADMIN' then skip all checks" branch anywhere to audit for correctness — the checks are the same ones every other role goes through.

---

## 16. Account Lifecycle

**Current:** `Active` (default at creation) → `Suspended` / `Deactivated` exist as enum values but **nothing in the codebase ever transitions a user into either state** — confirmed by grep: `accountStatus` is written exactly once, in `UsersService.create()`, always to `'Active'`. This means, operationally, there is no way today to suspend a compromised or terminated staff account short of directly editing the database.

**Target lifecycle:**
```
Invited  →(activation)→  Active  ⇄(suspend/reactivate)  Suspended  →(disable)→  Deactivated
```
`Deactivated` is terminal by convention (no code enforces this today, and none is added — a `Deactivated → Active` transition being technically possible but organizationally disallowed is an acceptable, simple rule to state in the endpoint's documentation rather than encode as a state-machine library, matching "avoid unnecessary complexity").

**New endpoint (P1):** `PATCH /api/v1/users/:id/status` — `@RequirePermission('users', 'ManageAccountStatus')` (§8). Body: `{ accountStatus: 'Active' | 'Suspended' | 'Deactivated' }`. On transition away from `Active`: call the already-existing `AuthSessionsService.revokeAllForUser()` (no new revocation mechanism needed — this is precisely the "invalidate everything" primitive built for logout-all, reused here). On transition *into* `Active` from `Suspended` (reactivation): no session action needed, the account simply becomes loggable-into again.

**What this does and does not invalidate immediately:** revoking all sessions kills every *refresh* token instantly (the next refresh attempt for any of them fails). It does **not** kill an already-issued *access* token before its natural ≤15-minute expiry — see §21 for why this is treated as an accepted, bounded trade-off pending an explicit owner decision, not a bug to silently patch with a new mechanism.

---

## 17. Password Lifecycle

### Password Reset (new, P1)
```
POST /api/v1/auth/forgot-password {email}
  → ALWAYS returns a generic 200/204 regardless of whether the email exists (enumeration protection)
  → if the account exists and is Active: mint AuthToken{purpose:'PasswordReset', expiresAt: now+~30min}
    (delivery: see the same email-channel dependency flagged in §12 — OPEN DECISION)

POST /api/v1/auth/reset-password {token, newPassword}
  → validate token (purpose, not expired/used/revoked)
  → hash newPassword, write to the Local authMethod
  → mark token usedAt
  → AuthSessionsService.revokeAllForUser() — a password reset invalidates every existing session, always
  → set passwordChangedAt
```
**Rate limiting:** `forgot-password` needs its own tight limit (e.g. 5/60s per IP, mirroring `login`'s existing pattern) — an unthrottled reset-request endpoint is itself an enumeration/spam vector even with a generic response, since response *timing* can leak the same information a differing status code would.

### Password Change (new, P1 — does not depend on the email channel, can ship independently)
```
PATCH /api/v1/auth/password {currentPassword, newPassword}   (authenticated)
  → verify currentPassword against the caller's own stored hash
  → hash newPassword, write it
  → AuthSessionsService.revokeAllForUser(actorUserId) — EXCEPT the session the caller is currently using,
    so they aren't logged out of their own change-password action
  → set passwordChangedAt
```
The "except my own current session" carve-out needs one small addition to `AuthSessionsService`: a `revokeAllForUserExcept(userId, exceptSessionId)` variant, or `revokeAllForUser` plus one `markReplaced`-style call to re-establish the caller's own session — either is a small, low-risk addition to an already-tested service, not a new mechanism.

### Password hashing (current vs. target)
Current: `bcryptjs`, cost 10 (`PASSWORD_HASH_ROUNDS`). Not broken, not urgent, below current best practice. **OPEN DECISION, with a recommendation:** migrate to `argon2` (Argon2id) if adding a native-binding dependency is acceptable in this deployment's build/hosting environment (the current stack uses pure-JS `bcryptjs` specifically, which suggests native modules may have been avoided deliberately — confirm before committing to this). If accepted: **lazy, non-disruptive migration** — on successful login, if the stored hash is bcrypt-shaped (`$2` prefix) and the password verifies, re-hash with Argon2id and overwrite; new accounts and password changes/resets always write Argon2id. No forced password reset for existing users, no big-bang migration script needed. If native dependencies are not acceptable, the fallback is simply raising `PASSWORD_HASH_ROUNDS` to 12 (audit P3 #17) — a one-line change with no migration story at all, since bcrypt cost is validated per-hash from the hash string itself.

---

## 18. MFA Architecture

**Current state:** does not exist. Confirmed by exhaustive grep (`MFA|TOTP|speakeasy|otplib|authenticator`) and by `package.json` — no MFA library is installed.

**Recommendation: Phase P3 (future), TOTP only, not WebAuthn/passkeys, and not built in this implementation round.** Justification for deferring rather than building now: today's actual, verified attack surface (§3) has no P0s and the privilege-escalation chain the audit was most worried about is already closed by `assertGrantable`/`assertNotSystemRole`/self-assignment-blocking — MFA would add defense-in-depth against *credential compromise*, which is a real but different risk from the *authorization-logic* risk this review's P0/P1 items address. Building it now, before the account-lifecycle basics (§12, §17) exist, would mean designing MFA enrollment on top of a user-creation flow that's about to change shape anyway.

**When built (design, not implementation):**
- Fields: `mfaEnabled: boolean`, `mfaSecretHash: string | null` (encrypted at rest, not the plain TOTP seed — note this needs an actual encryption-at-rest mechanism, e.g. `libsodium`/KMS-backed, distinct from password hashing, since a TOTP secret must be *decryptable* to verify against, unlike a password hash), recovery codes stored as hashes via the existing `AuthToken{purpose:'MfaRecovery'}` shape (§10) rather than a new field/collection.
- Endpoints: `POST /auth/mfa/enroll` (returns QR/secret), `POST /auth/mfa/verify` (activates), `POST /auth/mfa/disable`, recovery-code consumption endpoint.
- **The audit's strongest MFA recommendation is adopted as a hard requirement for this phase, whenever it ships:** mandatory MFA for any role holding `roles:*`, `permissions:*`, or `users:ManageAccountStatus`/`AssignRoles` — the exact set of capabilities that matter most if an account is compromised. This should be enforced the same way system-role protection is today: a service-layer check, not a UI convention.

---

## 19. OAuth Architecture

**Current state:** does not exist beyond `AUTH_PROVIDERS` containing `'Google'`/`'Microsoft'` as enum placeholders and an unused `providerId` field. No `passport-google-oauth20`/`passport-microsoft`/equivalent dependency, no controller route, no strategy file.

**Recommendation: Phase P3 (future), built only when a concrete business need is confirmed** — there is no evidence anywhere in the current product documentation or this codebase that Google/Microsoft login is an active requirement; building it speculatively would be exactly the "unnecessary infrastructure" the brief warns against.

**Design, for whenever it is built:**
- Authorization Code flow **with PKCE**, `state` for CSRF binding, `nonce` for OIDC replay protection — all standard, all cheap, none skippable.
- Verify the provider's id token: signature (via the provider's published JWKS, cached with normal HTTP cache semantics — no need for a bespoke key-rotation mechanism), `iss` matches the expected provider, `aud` matches this application's registered client id, `exp` not passed.
- **Account linking policy (explicit, per the brief's own instruction not to auto-link on email match alone):** a Google/Microsoft sign-in with an email matching an existing `Local` (or other-provider) account does **not** automatically merge into it. Two supported paths only: (a) the user is already authenticated via an existing method and explicitly initiates "link my Google account" from within an authenticated session, or (b) at OAuth callback time with no matching authenticated session, if the provider's token claims `email_verified: true` and an account with that exact email exists, present an explicit confirmation step (not silent auto-link) before writing the new `AuthMethod` entry. Unlinking requires at least one other `AuthMethod` to remain (never leave an account with zero sign-in paths).
- Redirect URI: exact-match validation against a configured allowlist, never derived from request input.

No schema change is needed to support this later — `AuthMethod.providerId` already exists for exactly this purpose.

---

## 20. Audit Events

**Currently written** (confirmed by reading `audit-log.interceptor.ts` and `permissions.guard.ts` — nothing assumed): generic `Create`/`Update`/`Delete` on any successful mutating request with an authenticated actor (entity type derived from the route's own `@Controller()` path segment, post the `/api/v1` prefix rollout — fixed 2026-09-06 alongside that change), plus `AccessDenied` on every permission check failure.

**Not currently written at all:** every auth-lifecycle event — login success/failure, logout, refresh, session revocation, and (once built) password change/reset, MFA changes, OAuth linking, account status changes. The reason is structural, not an oversight in the interceptor: `AuditLogInterceptor` only fires for routes with an authenticated `request.user`, and login itself has none yet at the point it runs; `refresh`/`logout` are POSTs but aren't wired through the interceptor's generic method-to-action mapping in a way that produces a *meaningful* `entityType` (a login attempt isn't "creating a `roles` row").

**Recommendation (P1):** add explicit `AuditLogsService.write()` calls directly inside `AuthService`'s methods (not via the generic interceptor, which is the wrong tool for this — same reasoning the codebase already applies to `@SkipAuditLog()` workflow-action routes, which write their own precise entries rather than relying on the generic inference). Proposed action set, extending `AUDIT_ACTIONS`:

```
LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, TOKEN_REFRESH, TOKEN_REUSE_DETECTED, SESSION_REVOKED,
PASSWORD_CHANGED, PASSWORD_RESET, PASSWORD_RESET_REQUESTED,
USER_INVITED, USER_INVITATION_ACCEPTED, USER_INVITATION_RESENT, USER_INVITATION_REVOKED,
ACCOUNT_SUSPENDED, ACCOUNT_REACTIVATED, ACCOUNT_DEACTIVATED
```
(`MFA_*`/`OAUTH_*` deferred alongside their features, §18/§19 — adding the enum values now with nothing that ever writes them would be dead enum members, the same anti-pattern flagged for dead schema fields in §5.)

**`LOGIN_FAILURE` needs `actorId` to be optional** (the current `AuditLog.actorId` is `required: true`) — a failed login for a *nonexistent* email has no user to attribute it to. Recommended: either make `actorId` nullable specifically for this one action, or record failed-login attempts keyed by the *attempted* email in a `metadata` object rather than forcing a `User` reference that may not exist. The former is a smaller schema change; the latter is more semantically honest. **Minor open decision, low stakes either way.**

**Confirmed clean today and must stay that way:** no password, hash, refresh token, reset token, or Authorization header value appears in any `AuditLog` row or `Logger` call anywhere in the codebase (verified by grep). Every new audit-write call added for the events above must preserve this — log the *fact* an event happened (user id, ip, user agent, outcome), never the credential material involved.

---

## 21. Authorization Version / Security Stamp — evaluated and rejected as new fields

**`securityStamp`'s usual purpose** (invalidate every outstanding token when authentication state changes) **is already fully served by the existing `AuthSession` + `revokeAllForUser()` mechanism**, which this system has and many frameworks that popularized `securityStamp` (e.g. ASP.NET Identity, historically) did not. Adding a second field that means "please consider all my tokens invalid" when a working mechanism to *actually* invalidate them already exists is duplication, not defense-in-depth. **Rejected.**

**`authzVersion`'s usual purpose** (detect that a token's embedded permissions are stale relative to current role/permission state) is a real gap — see R12 — but a bare version-number field solves nothing by itself unless something checks it on every request, which reintroduces the exact per-request DB/cache cost the embedded-permissions design exists to avoid (§27). **Rejected as a new field for this phase.** The residual risk it would address — a revoked permission remaining honored in an already-issued access token for up to 15 minutes — is treated instead as a bounded, accepted trade-off, with the primary available mitigation being *shortening the access-token TTL* if the business decides 15 minutes is too long, not adding a new mechanism to check on every request.

**OPEN DECISION for the owner:** is a ≤15-minute window between "a permission is revoked" and "every already-issued token honoring it has expired" acceptable for this system? If the answer is a hard no (e.g. a specific compliance requirement demands near-immediate revocation), the correct next step is a scoped follow-up design for a lightweight per-request check (e.g. a short-TTL in-memory/cached `authzVersion` lookup, re-fetched only every few seconds rather than every request) — not simply adding the field now with nothing consuming it.

---

## 22. Index Strategy (consolidated)

| Collection | Existing | Add | Do not add |
|---|---|---|---|
| `users` | `{email:1}` unique partial | — | index on `roleIds` (no query pattern needs it; `resolvePermissions()`'s N+1 issue in §27 is a query-shape problem, not a missing-index problem) |
| `roles` | none | `{key:1}` unique partial (`key: {$ne: null}`) | unique index on `name` (redundant with `key` once added — see §7) |
| `permissions` | none | `{resourceType:1, action:1}` unique partial (`archivedAt: null`) | — |
| `authSessions` | `{userId:1, revokedAt:1}` | optional: TTL on `expiresAt` (P2/P3 hygiene, not correctness — see §29) | a separate index on `refreshTokenHash` (never queried by hash; the JWT's `sessionId` is the lookup key) |
| `authTokens` (new) | — | `{tokenHash:1}` unique; `{userId:1, purpose:1, usedAt:1}`; TTL on `expiresAt` | — |
| `auditLogs` | `{entityType,entityId,timestamp}`, `{actorId,timestamp}` | — (sufficient for the two named query patterns; auth-lifecycle events (§20) reuse the same two patterns, no new index needed) | — |

---

## 23. Performance Strategy — Authorization Resolution

**Current (`AuthService.resolvePermissions()`):** for N `roleIds`, `Promise.all(N × RolesService.findById())`; then for M unique `permissionIds` found across those roles, `Promise.all(M × PermissionsService.findById())`. Each `findById()` is a separate `_id`-indexed query, run in parallel — not slow in absolute terms for realistic N/M (small role/permission counts per user), but two rounds of N/M queries where two single queries would do.

**Recommendation (P2):** replace both loops with single `$in` queries:
```ts
const roles = await this.roleModel.find({ _id: { $in: roleIds }, archivedAt: null });
const permissionIds = [...new Set(roles.flatMap(r => r.permissionIds.map(String)))];
const permissions = await this.permissionModel.find({ _id: { $in: permissionIds }, archivedAt: null });
```
This also naturally fixes the "archived roles still contribute permissions" gap flagged in §7, in the same change.

**Why this runs only at login/refresh and never per-request (confirmed, and the right design):** `JwtStrategy.validate()` reads `request.user` straight from the already-verified JWT payload — zero database interaction. `PermissionsGuard` compares against that in-memory array — zero database interaction. The N+1 pattern above only executes twice per session lifetime (once at login, once per refresh, i.e. at most every 7 days per session, or every 15 minutes if a client refreshes proactively) — not on the hot path of every API call. **This is the explicitly-requested trade-off documented, per the brief's own instruction:** the system minimizes staleness (15-minute bound) while avoiding a per-request DB query entirely, at the cost of the bounded staleness window discussed in §21. **No caching layer (Redis or otherwise) is recommended** — there is no per-request cost to cache away, and introducing one would be solving a problem this design doesn't have.

---

## 24. Rate Limiting

**Current, confirmed by reading `rate-limit.guard.ts` and its usages:** in-process, fixed-window, keyed by `${controller}.${handler}:${ip}`, global default 100/60s, with dedicated tighter limits on `POST /auth/login` (10/60s) and `POST /contact-messages` (5/60s, the platform's only unauthenticated write). Explicitly documented as single-process (no shared counter across horizontally-scaled instances) — an accepted, flagged limitation at current scale, not a defect to fix in this phase.

**Gaps (P2):** `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, and (once built) `/auth/forgot-password`, `/auth/reset-password`, `/auth/activate` all currently fall to the generic 100/60s default, or don't exist yet. Recommended dedicated limits:

| Endpoint | Recommended limit | Reasoning |
|---|---|---|
| `POST /auth/refresh` | 20/60s per IP | Reuse-detection already blunts the main risk (a stolen token dies on first successful reuse-by-someone-else); this limit exists mainly to bound blind-guessing of session ids/malformed tokens, not to replace rotation |
| `POST /auth/forgot-password` | 5/60s per IP (mirrors `login`) | Prevents using the reset flow itself as an enumeration or mail-bombing vector |
| `POST /auth/reset-password`, `POST /auth/activate` | 10/60s per IP | Bounds brute-forcing a guessed/partial token; the token's own entropy is the primary defense, this is a secondary layer |

**Explicitly not recommended:** permanent account lockout as a rate-limiting response anywhere (the brief's own instruction, and already correctly avoided — the existing `LOCKOUT_DURATION_MINUTES` is time-bounded, not permanent, so it cannot be weaponized to lock a legitimate user out indefinitely by an attacker deliberately failing their login).

---

## 25. Security Test Matrix

Columns: **Exists today** (verified against the actual `test/` tree) / **Recommended new**.

### Authentication
| Case | Exists | New needed |
|---|---|---|
| Valid login | ✅ (`auth-rbac.e2e-spec.ts` and others) | |
| Invalid password | ✅ | |
| Nonexistent account | ✅ (same generic-message assertion) | |
| Suspended/Deactivated account | — | ✅ once §16's status endpoint exists |
| Invited account (pre-activation) login attempt | — | ✅ with §12 |
| Locked account (brute-force) | ✅ (`login-lockout.e2e-spec.ts`) | |
| Rate limit exceeded on login | ✅ (`rate-limit-login.e2e-spec.ts`) | |
| Expired/reused activation token | — | ✅ with §12 |
| Password reset: expired/reused token | — | ✅ with §17 |

### JWT
| Case | Exists | New needed |
|---|---|---|
| Expired access token | — (relies on library default; no explicit test) | ✅ cheap addition |
| Malformed JWT | — | ✅ |
| Invalid signature | — | ✅ |
| Wrong issuer/audience | — | ✅ once §11's `iss`/`aud` ship |
| Refresh token used as access token | ✅ (`jwt-token-type.e2e-spec.ts`) | |
| Access token used as refresh token | ✅ (`auth.service.spec.ts`) | |
| Revoked session, refresh attempted | ✅ (`auth-sessions.e2e-spec.ts`) | |

### Sessions
| Case | Exists | New needed |
|---|---|---|
| Refresh + rotation | ✅ | |
| Old refresh token reuse after rotation | ✅ | |
| Logout invalidates that session | ✅ | |
| Logout-all invalidates every session | ✅ | |
| Expired session (natural `exp`, not revoked) | — (only revocation is tested, not natural expiry) | ✅ cheap addition |

### Authorization
| Case | Exists | New needed |
|---|---|---|
| Missing permission → 403 | ✅ (`auth-rbac.e2e-spec.ts`, `permissions.guard.spec.ts`) | |
| Privilege escalation via role creation | ✅ (`privilege-escalation.e2e-spec.ts`) | |
| Privilege escalation via role modification | ✅ | |
| Self-role-assignment | ✅ | |
| Assigning a *pre-existing* over-privileged role to someone else | — | ✅ with §14's assignment-side fix |
| Unauthorized system-role modification | ✅ | |
| System role protected from `updatePermissions` specifically | ✅ (regression test exists for the exact P0 #3 bug) | |

### Data leakage
| Case | Exists | New needed |
|---|---|---|
| Password hash never in `GET /users*` | ✅ (`password-hash-leak.e2e-spec.ts`) | |
| Refresh token hash never returned by any endpoint | — (implicitly true — nothing returns `AuthSession` documents — but not explicitly asserted) | ✅ cheap addition |
| Reset/activation token hash never returned | — | ✅ with §12/§17 |

### Account security
| Case | Exists | New needed |
|---|---|---|
| Password change invalidates other sessions | — | ✅ with §17 |
| Suspension invalidates sessions | — | ✅ with §16 |
| Reactivation restores login ability | — | ✅ with §16 |

---

## 26. Migration Strategy

For every proposed change, in dependency order:

1. **`Permission` unique index + runtime `resourceType` validation (§8, §26/R7,R8).** No data migration — safe to add the index directly since no duplicates are expected to exist yet in this pre-production system (confirm with a one-time count query before applying `unique: true`, not blindly). No existing token/session impact.
2. **`Role.key` field + archived-role exclusion in `resolvePermissions` (§7, §23).** Additive field, nullable/optional — zero migration for existing roles (they simply have `key: null` until backfilled by the seed script in step 3, for the system roles that need one). Existing tokens unaffected (permissions are re-resolved at their next refresh regardless).
3. **Seed scripts (new — R6).** The single most important *operational* item in this list: a script that creates the base `Permission` catalog (idempotent — upsert by `{resourceType, action}` once the unique index from step 1 exists), a `SUPER_ADMIN`-keyed system `Role` holding all of them, and optionally a bootstrap admin `User`. No prior data to migrate — this is pure bootstrap tooling, needed before any of the account-lifecycle work below can be exercised in a fresh environment.
4. **`User.passwordResetToken`/`passwordResetExpiresAt` removal (§5).** Confirmed dead (never read/written) — safe to drop the fields from the schema outright. **No data migration needed** even though existing documents may have these keys stored: Mongoose simply stops projecting/writing them; leftover keys on old documents are inert and can be cleaned up opportunistically (not required for correctness).
5. **`AuthToken` collection (§10).** New collection, no existing data.
6. **`CreateUserDto.password` removal + `Invited` status + activation flow (§12).** **Breaking change to `POST /users`'s request contract** — any existing admin tooling/frontend calling it with a `password` field needs to update in lockstep. Existing already-`Active` users are entirely unaffected (the new flow only applies to *newly created* users going forward) — no backfill needed, no existing password is touched.
7. **Password reset/change endpoints (§17).** Purely additive endpoints; no migration.
8. **Account status endpoint (§16).** Purely additive; existing users remain `Active` until an admin explicitly acts.
9. **`roles:Assign`/`ManageAccountStatus` new permission actions (§8).** New `PERMISSION_ACTIONS` enum values are additive to the type union — existing permission documents are unaffected. **Requires a data step:** seed the two new `Permission` documents, then explicitly grant `AssignRoles` to whichever existing roles should retain the ability to assign roles (today, that's implicitly "anyone with `users:Update`" — after this change, nobody has `AssignRoles` until it's explicitly granted, which is the correct, intentional tightening, not an oversight to smooth over).
10. **Auth-lifecycle audit events (§20).** Additive; no migration.
11. **JWT `iss`/`aud`/algorithm pinning (§11).** **Existing outstanding refresh tokens (up to 7 days old) were signed without these claims** — if verification is changed to *require* `iss`/`aud` on refresh, every outstanding refresh token issued before the change becomes invalid immediately (forces a global re-login). Recommended rollout: add the claims to newly-issued tokens first, run `verifyAsync` in a mode that does not yet *require* them for one full refresh-token lifetime (7 days), then flip to requiring them once nothing old can still be outstanding. This is the one change in this list with a real "old token impact" and must be sequenced carefully, not shipped as a single atomic flag flip.
12. **Password hashing migration (§17, if Argon2id is approved).** Fully lazy, per §17 — no bulk migration script, no forced resets.

**Existing passwords:** unaffected by every item above except #12, which is explicitly lazy/non-disruptive. **Existing roles/permissions:** unaffected except where step 9 explicitly asks for a deliberate, reviewed grant decision. **Existing sessions:** unaffected by every item except #11's careful rollout note.

---

## 27. Phased Implementation Plan

### P0 — Critical Security
**None open.** All four are already fixed and verified (§1).

### P1 — Core Authentication Lifecycle
1. Seed scripts for Permissions/system Role/bootstrap admin (§26 step 3) — *nothing else in this phase can be safely exercised without this in a fresh environment.*
2. `Permission` unique compound index + runtime `resourceType` validation on create (§8, R7/R8).
3. Role-assignment gap: `assertGrantable`-style check on `PATCH /users/:id/roles` against the *target role's* permissions, not just self-assignment (§14).
4. `roles:Assign` / `ManageAccountStatus` permission actions, and re-gate `PATCH /users/:id/roles` behind `AssignRoles` instead of `users:Update` (§8, R5).
5. Account status lifecycle + `PATCH /users/:id/status` + session revocation on suspend (§16).
6. Password change endpoint (§17) — does not depend on email infrastructure, can ship independently of #7.
7. Invitation/activation flow: `Invited` status, `AuthToken` collection, `CreateUserDto.password` removal, `POST /auth/activate` (§10, §12) — **blocked on the email-delivery OPEN DECISION in §12** until that's resolved; the token/schema/endpoint work itself can proceed in parallel.
8. Password reset flow (§17) — same email-delivery dependency as #7.
9. Auth-lifecycle audit logging (§20).
10. `Role.key` field + archived-role exclusion from `resolvePermissions` (§7, §23).

### P2 — Security Hardening / Optimization
11. `resolvePermissions()` N+1 → `$in` queries (§23).
12. `recordFailedLogin()` atomic `$inc` (R10).
13. `AuthMethod` provider-specific validation (R11).
14. Dedicated rate limits on `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/activate` (§24).
15. Password hashing: Argon2id migration or bcrypt cost 10→12, per the §17 open decision.
16. `AuthSession`/`AuthToken` TTL indexes (§9, §10).

### P3 — Future Enhancements
17. `iss`/`aud`/`jti` claims + explicit `algorithm: 'HS256'` pinning (§11) — sequenced per §26 step 11's careful rollout.
18. MFA (TOTP), mandatory for privileged roles once built (§18).
19. OAuth (Google/Microsoft), only if a concrete business need emerges (§19).
20. `authzVersion`-backed near-immediate revocation, only if §21's open decision resolves toward "15 minutes is not acceptable."

---

## 28. Exact Files Expected to Change in the Implementation Phase

**New files:**
- `src/modules/platform-administration/auth-tokens/{schemas/auth-token.schema.ts, auth-tokens.repository.ts, auth-tokens.service.ts, auth-tokens.module.ts}`
- `src/database/seeds/{seed-permissions.ts, seed-roles.ts, seed-admin-user.ts}` (or one combined seed entrypoint — implementation detail for that phase)
- `src/modules/platform-administration/auth/dto/{forgot-password.dto.ts, reset-password.dto.ts, activate-account.dto.ts, change-password.dto.ts}`
- `src/modules/platform-administration/users/dto/update-account-status.dto.ts`
- `test/e2e/{password-reset.e2e-spec.ts, account-activation.e2e-spec.ts, account-status.e2e-spec.ts, role-assignment-boundary.e2e-spec.ts}`

**Modified files:**
- `src/modules/platform-administration/users/schemas/user.schema.ts` — remove `passwordResetToken`/`passwordResetExpiresAt`, add `passwordChangedAt`, extend `ACCOUNT_STATUSES` with `'Invited'`.
- `src/modules/platform-administration/users/dto/create-user.dto.ts` — remove `password`.
- `src/modules/platform-administration/users/users.service.ts` — `create()` no longer hashes/accepts a password; new methods for status change.
- `src/modules/platform-administration/users/users.controller.ts` — `assignRoles()` gains the target-role-permission check and the `AssignRoles` permission gate; new `PATCH :id/status` route.
- `src/modules/platform-administration/roles/schemas/role.schema.ts` — add `key` + its index.
- `src/modules/platform-administration/roles/roles.service.ts` (or `AuthService.resolvePermissions`, wherever it lands) — exclude archived roles.
- `src/modules/platform-administration/permissions/schemas/permission.schema.ts` — add the unique compound index.
- `src/modules/platform-administration/permissions/permissions.service.ts` — run resource-type validation per-creation, not just at boot.
- `src/common/decorators/permissions.decorator.ts` — extend `RequiredPermission['action']`/`PERMISSION_ACTIONS` with `AssignRoles`, `ManageAccountStatus`.
- `src/modules/platform-administration/auth/auth.service.ts` — `resolvePermissions()` → `$in` queries; new methods for forgot/reset/change password and activation; auth-lifecycle audit writes.
- `src/modules/platform-administration/auth/auth.controller.ts` — new routes: `forgot-password`, `reset-password`, `activate`, `PATCH password`.
- `src/modules/platform-administration/users/users.service.ts` — `recordFailedLogin()` → atomic update.
- `src/modules/workflow/audit-logs/schemas/audit-log.schema.ts` — extend `AUDIT_ACTIONS`.
- `src/common/guards/rate-limit.guard.ts` usages (decorator additions on the new/existing auth routes) — no guard logic change, just new `@RateLimit()` call sites.
- `src/modules/platform-administration/auth-sessions/auth-sessions.service.ts` — add `revokeAllForUserExcept()` (or equivalent) for the password-change carve-out.

---

## 29. Risks / Open Decisions

| # | Decision needed | Recommended option | Alternative | Security impact if unresolved |
|---|---|---|---|---|
| 1 | `Audit Decision Matrix.txt` referenced but not found — does it contain decisions that should override anything above? | Locate/attach it and reconcile before final sign-off | Proceed on this document alone | Possible contradiction with an input this review never saw |
| 2 | Email/SMS delivery channel for activation + password-reset links | Wire a real provider before shipping §12/§17 | Interim manual/admin-mediated link handoff | Neither flow can go live without *some* answer here |
| 3 | Is a ≤15-minute staleness window acceptable for "revoke this user's access right now"? | Accept it; mitigate further only by shortening access-token TTL if needed | Build an `authzVersion` + cached per-request check (P3, only if the answer is no) | Determines whether §21/#20 in §27 is ever needed at all |
| 4 | Argon2id vs. raising bcrypt cost to 12 | Argon2id if native modules are acceptable in this deployment | bcrypt cost 12 (zero migration story) | Low — current cost-10 bcrypt is not an active vulnerability, just below best practice |
| 5 | Contextual/resource-state authorization layer (RBAC + workflow state) | Out of scope for this document; separate design pass if pursued | Leave as today's per-service hand-built checks | No change to current risk; already the status quo |
| 6 | `LOGIN_FAILURE` audit rows for nonexistent emails — nullable `actorId` vs. metadata-only record | Nullable `actorId` for this one action | Metadata-object approach | Low — either works, just a modeling choice |

---

## 30. Final Architecture Decision

**Approved for implementation**, in the phased order above (§27), contingent on resolving Open Decisions #1 and #2 before P1 items 7–8 (invitation, password reset) specifically — every other P1/P2 item is unblocked and can proceed immediately.

The system's authorization core (RBAC engine, session/revocation layer, JWT type-separation) is sound, already hardened against everything the 2026-09-05 audit rated P0, and is **not** being redesigned — this document's changes are additive account-lifecycle features and targeted hardening, not a rewrite. Two specific pieces of the originally-proposed target architecture (`securityStamp`/`authzVersion` as new fields, and opaque-random refresh tokens) were evaluated and **rejected** with reasoning, per this review's own mandate to confirm/modify/reject rather than implement a brief mechanically.

---

# ARCHITECTURE APPROVAL CHECKLIST

**APPROVED RECOMMENDATION:** Proceed with the P1/P2 plan in §27 as the next implementation phase. P0 is already closed. P3 items are correctly deferred, not abandoned.

**REQUIRED CHANGES (P1):**
- Seed scripts (Permissions, system Role, bootstrap admin)
- `permissions.(resourceType,action)` unique index + per-creation resource-type validation
- Role-assignment target-permission check (close the assignment-side gap in §14)
- `roles:Assign` / `ManageAccountStatus` permission actions
- Account status lifecycle + suspend/reactivate endpoint + session revocation on suspend
- Password change endpoint
- Invitation/activation flow (pending Open Decision #2)
- Password reset flow (pending Open Decision #2)
- Auth-lifecycle audit logging
- `Role.key` field + archived-role exclusion from permission resolution

**OPTIONAL CHANGES (P2/P3):**
- `resolvePermissions()` `$in`-query optimization
- Atomic `recordFailedLogin()`
- `AuthMethod` provider-specific validation
- Dedicated rate limits on refresh/forgot-password/reset-password/activate
- Argon2id (or bcrypt cost 12)
- `AuthSession`/`AuthToken` TTL indexes
- `iss`/`aud`/`jti`/explicit `HS256` pinning
- MFA (TOTP), OAuth — both fully deferred, designs documented above for when justified

**OPEN DECISIONS:** see §29, items 1–6. Items 2 and 3 block or shape specific P1 work; the rest are lower-stakes.

**IMPLEMENTATION PHASES:** P0 (closed) → P1 (§27) → P2 → P3, in the order listed in §27, with §26's migration sequencing (especially step 11, JWT claim rollout, and the email-channel dependency gating steps 7–8).

**FILES EXPECTED TO CHANGE:** §28.

**DATABASE MIGRATIONS REQUIRED:** New collections (`authTokens`); new indexes (`permissions.(resourceType,action)` unique, `roles.key` unique partial); one schema field removal (`User.passwordResetToken`/`passwordResetExpiresAt`, no data migration needed); no changes to existing password hashes, roles, or sessions except the explicitly-sequenced JWT-claim rollout in §26 step 11. Full detail in §26.

**SECURITY TESTS REQUIRED:** Full matrix in §25 — new tests needed wherever that table's "New needed" column is checked; existing coverage confirmed already-adequate elsewhere.

---

**This phase is now complete. No implementation should begin until this document is explicitly approved, per the task's own governing rule.**

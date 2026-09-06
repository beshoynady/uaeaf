# Notes from the P0 Auth Fix Session (2026-09-06)

Scope of this session was strictly the four P0 items from
`docs/audits/auth-security-audit-2026-09-05.md` (Change 1–4). Everything
below was noticed while doing that work but is explicitly **not fixed
here** — it's either already-known P1/P2/P3 debt from the audit, or a new
observation surfaced by building the fix. Left for a future, separately
approved session.

## Already-known P1/P2/P3 items — still open, untouched

- **`roles:Assign` is still not a separate permission** from the general
  `users:Update` (audit Change 5). This session blocks self-assignment
  outright and unconditionally on `PATCH /users/:id/roles` rather than
  introducing a dedicated permission that could allow it in a controlled
  way — that was an explicit, deliberate choice per the task's own
  instructions ("whether a dedicated roles:Assign permission is
  introduced immediately or deferred... is your call").
- **Login/logout/refresh/logout-all are still not written to `auditLogs`**
  (audit P1 #9). `AuditLogInterceptor` only fires for an authenticated
  actor on POST/PATCH/PUT/DELETE, and login/refresh/logout aren't routed
  through it — this session didn't add dedicated audit-log writes for the
  auth lifecycle, since that's a P1 item, not one of the four P0s.
- **Password reset, password change, and account-suspend endpoints are
  still entirely unimplemented** (audit P1 #6/#7/#8). Untouched.
- **`AuthSession` rows are never cleaned up.** There's no TTL index on
  `expiresAt` and no cleanup job — revoked and naturally-expired session
  rows will accumulate in `authSessions` forever. A `expireAfterSeconds`
  TTL index on `expiresAt` would be a small, natural P2 fix; not added
  here since it wasn't asked for and isn't a security gap on its own
  (just unbounded storage growth over a long enough timeline).

## New observation from building this session's fix

**A plain string filter against a non-`_id` `Types.ObjectId` schema path
can silently match zero documents in this codebase's Mongoose setup.**

Found and fixed in `AuthSessionsRepository.revokeAllForUser()`: the first
version filtered with `{ userId: someString, revokedAt: null }` where
`userId` is declared `@Prop({ type: Types.ObjectId, ref: 'User' })`. This
compiled fine, threw no error, and returned `matchedCount: 0` even though
matching documents existed — confirmed by an e2e test failure and direct
`updateMany` result inspection during this session. The fix was an
explicit `new Types.ObjectId(userId)` cast in the filter, which resolved
it immediately and is now what the shipped code does.

By contrast, `AuthSessionsRepository.revoke()`'s `{ _id: id }` filter
worked correctly throughout, every time — but it was always called with
an actual `Types.ObjectId` instance (`session._id`), never a raw string,
so it never exercised the same risk.

**Why this is worth a follow-up, not just a one-off fix:** this specific
bug is now closed, but the underlying pattern — *some* repository method,
somewhere else in the codebase, filtering a `Types.ObjectId` field with a
raw string instead of an already-cast value or the implicit `_id` path —
could have the identical silent-failure signature (no thrown error, just
zero rows affected). A quick grep for repository methods taking a
`string`-typed id/ref parameter and passing it straight into a Mongoose
filter object (rather than via `_id`, or via a method like `findById`
that Mongoose/the driver casts reliably) would be a cheap way to rule
this out elsewhere. Not done in this session — flagging it here so it
isn't lost, not treating it as confirmed to exist anywhere else.

# ADR-0057 — Audit Trail: Capture, Redaction and Exposure

**Status:** Accepted
**Date:** 2026-09-08
**Scope:** Standalone (backend). Follows the ADR-0054 precedent: none of Chapters 0–26 governs interceptor behaviour or collection-level read exposure, so this is not embedded in a numbered chapter.
**Supersedes:** nothing. **Amends:** the audit-trail portion of BE-PLAN-010 §4.5.
**Implementation:** `api/src/common/interceptors/audit-log.interceptor.ts`, `api/src/common/utils/redact-audit-snapshot.ts`, `api/src/modules/workflow/audit-logs/`.

---

## 1. Context

Every mutating request through the API is recorded in `auditLogs` by a globally registered interceptor (`APP_INTERCEPTOR`). Four questions had to be settled, and the answers are not obvious from reading the code alone. This ADR is where they live, so the source comment can describe behaviour rather than carry its own history.

## 2. Decisions

### 2.1 The audit write is awaited, on the request's critical path

`concatMap`, not `tap` with a fire-and-forget promise. The row is durable before the HTTP response reaches the caller.

**Why:** an audit trail that *might* have landed by the time the caller acts on the response is not a guarantee, and a trail without a guarantee cannot be used to answer the question it exists for. The cost — one write added to every mutating request's latency — is accepted deliberately.

### 2.2 `entityType` is the camelCase collection name, derived from the route

The first path segment after the global prefix and version segment, converted from the controller's kebab-case route (`/athlete-profiles/:id` → `athleteProfiles`).

**Why:** `workflowInstances`, `revisions`, `publications` and `workflowPolicies` all carry an `entityType` field using the camelCase collection name (schema-audit-2026-09-04 §3.2/§9.4). Storing the raw route segment would make `auditLogs` the one `entityType`-bearing collection that cannot be joined against the others for the same record.

The version segment is stripped by pattern (`/^v\d+$/`), not by position, so a change to the version format does not silently shift the segment being read.

### 2.3 `previousValue` is captured by reading the record before the handler runs

Added 2026-09-08. Before it, only `newValue` was written: the trail recorded what a record became and never what it had been, which makes *"who changed this, and from what"* — the one question an audit trail exists for — unanswerable.

The pre-read goes through the raw collection named by the derived `entityType`, not through a Mongoose model.

**Why raw:** the interceptor is global and knows nothing about which module owns the route. A model registry mapping every `entityType` to its model would have to be maintained in lockstep with every new module, and would fail silently when someone forgot. Reading the collection by name stays generic over every module, present and future.

**A failed pre-read is swallowed.** The row is still worth writing without a before-state, and refusing the user's request because a snapshot could not be taken is a worse trade than an incomplete row.

### 2.4 Both snapshots are redacted before they are stored

`redactAuditSnapshot` runs over the pre-image and the response body alike, removing `authMethods`, `passwordHash`, `password`, `passwordResetToken`, `passwordResetExpiresAt` and `__v`.

**Why this is not optional:** the pre-image is read straight from storage, and a stored user document carries `authMethods[].passwordHash`. Combined with §2.5 below, which makes the collection readable over HTTP, an unredacted trail would be the richest credential target in the platform — every password hash the system has ever held, in one collection, behind one permission.

### 2.5 The collection is readable over HTTP, and only readable

`GET /api/v1/audit-logs` sits behind a dedicated `auditLogs:Read` permission pair, filterable by `entityType` / `entityId` / `actorId` / `action`, paged with `limit` capped at 100.

`AuditLogsRepository` exposes creation and reads only. It has no update, no soft delete and no hard delete, and none may be added: a trail that its own subjects can edit records nothing.

The permission is held by no seeded role. It is granted deliberately, per person.

### 2.6 Workflow endpoints opt out

Routes marked `@SkipAuditLog()` write their own, more precise entry — targeting the content entity the workflow instance concerns, with `action: 'StatusChange'`.

**Why:** this interceptor infers the action from the HTTP method, so it would log every workflow transition as a `Create` or `Update` on `workflowInstances` itself. That is the wrong entity and the wrong action.

## 3. Consequences

* Mutating requests carry one extra write in their latency budget (§2.1) and, for PATCH/PUT/DELETE, one extra read (§2.3).
* `redactAuditSnapshot`'s denylist is a maintenance obligation: a new credential-bearing field on any schema must be added to it. The test suite asserts the current set; it cannot assert fields that do not exist yet.
* Reading a collection by a derived name means a route whose segment does not match a collection produces no `previousValue` — silently, by design (§2.3).

## 4. Rejected alternatives

| Alternative | Rejected because |
|---|---|
| Fire-and-forget the audit write | No durability guarantee at the moment the caller acts on the response (§2.1). |
| A model registry for the pre-read | Must be updated for every new module, and fails silently when it is not (§2.3). |
| Store the raw kebab-case route segment as `entityType` | Breaks joinability with the four other `entityType`-bearing collections (§2.2). |
| Redact only on read | The stored data is the exposure. Redacting at the boundary leaves the hashes in the database, reachable by any future reader. |
| Give an existing role `auditLogs:Read` | Read access to the trail is a deliberate grant, not an inherited one (§2.5). |

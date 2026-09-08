# ADR-0058 — Machine-Readable API Error Codes

**Status:** Accepted
**Date:** 2026-09-08
**Scope:** Standalone (backend + BFF contract). Follows the ADR-0054 precedent: no numbered chapter governs HTTP error-body shape.
**Implementation:** `api/src/common/errors/api-error-code.ts`, `api/src/common/filters/api-exception.filter.ts`, `apps/dashboard/src/lib/api/{upstream,admin-write}.ts`.

---

## 1. Context

The API answers 403 for at least four distinct reasons, each with a different remedy:

| Reason | Thrown by | What the person must do |
|---|---|---|
| Lacks the required permission | `PermissionsGuard` | Ask for the permission |
| Touched a system role | `RolesService.assertEditable` | Stop — the record is not editable |
| Tried to grant a permission they do not hold | `RolesService.assertGrantable` | Be granted it first |
| Edited their own account | `UsersController` (roles, status) | Ask a colleague |

The dashboard needs to say something different for each. Until this decision it told them apart by matching fragments of the English message (`text.includes("assign roles to yourself")`).

**That contract had already failed.** `PATCH /users/:id/status`, added the same day, refuses a self-edit with *"You cannot change the status of your own account."* — sharing no fragment with the role-assignment refusal. It fell through to the generic case, so an administrator editing their own row was told they lacked a permission that no grant would have supplied.

The failure mode is the problem, not the instance: prose is not a contract, it is reworded by translators, editors and reviewers, and nothing fails loudly when it is.

## 2. Decision

**Every error response carries a `code` from a closed vocabulary.** `message` stays, for humans reading a log; clients branch on `code` alone.

```json
{ "statusCode": 403, "code": "systemRole", "message": "System roles cannot be renamed or deleted." }
```

### 2.1 The vocabulary is closed

`API_ERROR_CODES` in `api/src/common/errors/api-error-code.ts` lists every valid code: the seven status defaults (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `tooManyRequests`, `internalError`) and the refusals a client explains differently (`accountLocked`, `systemRole`, `ungrantablePermission`, `selfAssignment`).

A value outside the list is treated as absent. A typo at a throw site therefore degrades to the status default rather than reaching a client that has no branch for it.

### 2.2 The code is stamped centrally, not at each throw site

`ApiExceptionFilter` derives the code from the status when the thrower named none. A site that needs to be distinguished from its neighbours opts in by throwing an object:

```ts
throw new ForbiddenException({ code: 'selfAssignment', message: '...' });
```

**Why central:** there are roughly ninety `throw new NotFoundException(...)` calls across the modules. Editing all of them would be a large diff with no behavioural benefit, and the guarantee would still be partial — the next new throw site would lack a code. Stamping in the filter makes it total, including for code nobody has revisited.

Five sites currently opt in: the two `RolesService` refusals, the two `UsersController` self-edit refusals, and the lockout 401 in `AuthService.login`.

The lockout is the same failure in the authentication path: the status is 401 for a wrong password and for a locked account alike, so the login screen decided which one it was by looking for the word *"locked"* in the message — and a user-facing countdown hung on that. It now reads `accountLocked`. This changes no disclosure: the message already told an unauthenticated caller that the account exists and is locked, which is a deliberate, pre-existing decision (a person hammering a locked account needs to know why nothing works). The code changes the encoding, not what is revealed.

### 2.3 The BFF translates through an explicit map

`apps/dashboard/src/lib/api/admin-write.ts` maps API codes to its own `WriteErrorCode` through an explicit table, not a pass-through. A code added to the API before the dashboard learns to handle it falls back to the status default rather than reaching a screen with no copy for it.

### 2.4 The filter was renamed

`DatabaseExceptionFilter` → `ApiExceptionFilter`. It was already `@Catch()`-all; it now also stamps every response's code. The old name described neither.

## 3. Consequences

* The error body gains one field. `statusCode` and `message` are unchanged, including class-validator's array form, so this is additive for every existing consumer.
* Error copy is now free to be reworded, in either language, without coordinating a client change.
* Adding a distinguishable refusal is a two-step change: add the code to `API_ERROR_CODES`, then to the BFF's translation table. Skipping the second step is safe — the refusal degrades to its status default.
* `apps/dashboard/src/lib/auth/password-reset.ts` still matches message text. Its endpoints do not exist yet (build-plan item 12); it is written against a contract that has not been built, and gets codes when they are.
* `codeForStatus` calls an unmapped 4xx `badRequest` rather than `internalError`. The difference is whether the client is told to fix its request or to retry one that will never succeed.

## 4. Rejected alternatives

| Alternative | Rejected because |
|---|---|
| Keep matching message fragments | Already failed once, silently, within a day of the code being written. |
| Give every throw site an explicit code | Ninety-site diff, and still partial for anything added later (§2.2). |
| Reuse HTTP status codes alone | Four distinct refusals share 403 by definition; the status is what makes them indistinguishable. |
| Pass unknown codes through the BFF | Puts a code on screen with no translation for it — a missing-key error shown to the user (§2.3). |
| Return `error: 'Forbidden'` (Nest's default field) as the discriminator | It is derived from the status, so it carries exactly the information the status already carried. |

## 5. Open

`401` from the API during a write still classifies as `serviceUnavailable` in the dashboard, so an expired token mid-write reads as *"could not reach the server"*. Correct handling needs session-expiry copy on the administration screens; tracked separately, not part of this decision.

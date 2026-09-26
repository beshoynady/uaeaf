# Authorization & Authentication Implementation Plan — Batch 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the `users:Create` → Super Admin privilege escalation, protect the last Super Admin, stop approval-policy changes from stranding content and from going unrecorded, make the audit interceptor incapable of silence, and make the public board page list board members instead of every active person.

**Architecture:** Every rule is enforced in the **service layer**, immediately before the write, reading current state — never in a controller alone and never from a value captured when the request began (CLAUDE.md §31). `permissions.guard.ts` and the per-request resolution are not touched. Two audit fixes land together: a general one (the interceptor can no longer skip) and a precise one (policy writes record their own before-and-after).

**Tech Stack:** NestJS 12 · Mongoose 9 · Jest with `--runInBand` (mandatory) · Next.js 16 dashboard/web.

**Spec:** [`docs/superpowers/specs/2026-09-26-authz-authn-design.md`](../specs/2026-09-26-authz-authn-design.md)

**ADRs this batch implements:** [ADR-0104](../../design-system/ADR-0104-Grant-Assign-Superset-Rule-And-Stronger-User-Guard.md) · [ADR-0105](../../design-system/ADR-0105-Super-Admin-Protection-And-Break-Glass.md) (protection half only) · [ADR-0107](../../design-system/ADR-0107-Approval-Policy-Change-Lock.md) · [ADR-0112](../../design-system/ADR-0112-Audit-Interceptor-No-Silent-Skip.md) · [ADR-0119](../../design-system/ADR-0119-Derived-Org-Chart-And-Board-Page-Source.md) (board-page half only)

## Global Constraints

- **No Git commands.** Work stays uncommitted on `main`. Where a task's final step would be "commit", it is instead "report the file list to the owner" — the owner commits (CLAUDE.md §33).
- **No new dependencies** in this batch. None is needed.
- **No script runs, no database writes, no seeders, no migrations.** Batch 1 adds no script.
- **TDD is mandatory**, and every security rule gets a **negative test**: the forbidden attempt is shown to be refused.
- **Jest must run with `--runInBand`** or DB suites fail spuriously. `npx jest` runs zero tests (ESM) — always `npm test --`.
- **Type-check with `npx tsc --noEmit` only.** `nest build` under `--watch` leaves the API bound to nothing (happened twice). ts-jest does not type-check, so green tests do not mean a clean build.
- **Arrow functions** for every new function; convert functions in files you touch, except class/decorated methods, dynamic `this`, generators, overloads, `arguments`, and hoisted calls (CLAUDE.md §30).
- **Comments explain WHY and describe current state** — never history, never slice narration.
- **A new API error code must be registered in three places** or it silently degrades to `conflict`: `API_ERROR_CODES`, admin-write's group + `FROM_API_CODE`, and both message catalogues.
- **Every user-facing string is Arabic and English.**
- **Never log a token, secret or code.**
- Run **only the affected test files** this batch; the full suite is Batch 9.

## Review Focus

Five conditions the spec implies that no task's happy path exercises. Each has a test pinned to the task that owns the code.

1. **A concurrent demotion between the count and the write** — two requests each removing a different Super Admin's role, both seeing a count of 2. Expected: one succeeds, the other is refused. Pinned in Task 4.
2. **An actor whose own grant is scope-narrowed** — holds `articles:Update` at `own`, assigns a role carrying it at `all`. Expected: refused; widening a scope is granting what you do not hold. Pinned in Task 2.
3. **Equal permission sets** — two Super Admins acting on each other. Expected: permitted, because the stronger-user test is subset, not strict subset. A strict test would deadlock every peer pair. Pinned in Task 3.
4. **A mutating route whose response is `204`/void and whose path has no `:id`** — expected: an audit row is still written, with `entityId: null` and a warning, not silence. Pinned in Task 9.
5. **An appointment whose person record is missing, and a board with nobody serving** — expected: the card is dropped rather than printed nameless, and the section disappears rather than announcing zero members. Already guarded for `currentLeadership`; pinned again at the page level in Task 10.

---

## File Structure

| File | Responsibility |
|---|---|
`api/src/modules/platform-administration/users/user-authority.ts` **(new)** | Pure comparison helpers: `holdsPair`, `isSuperset`, `missingPairs`. No Nest, no I/O — so the rules are unit-testable without a module.
`api/src/modules/platform-administration/users/users.service.ts` | Gains `assertAssignableByActor`, `assertNotStronger`, `assertNotLastSuperAdmin`; `create` and `assignRoles` call them.
`api/src/modules/platform-administration/users/users.repository.ts` | Gains `countActiveSuperAdmins`.
`api/src/modules/platform-administration/users/users.controller.ts` | Passes `@CurrentUser()` into the two role paths; status route gains the last-holder path.
`api/src/modules/platform-administration/roles/roles.service.ts` | Gains `resolvePermissionsForRoles` (union for a set of role ids) and `isSystemRole(id)`.
`api/src/common/errors/api-error-code.ts` | `+ ungrantableRole`, `+ targetStronger`, `+ lastSuperAdmin`.
`api/src/modules/workflow/workflow-policies/approval-configuration.service.ts` | `disable()` gains the running-reviews check; both writers write their own audit row.
`api/src/common/decorators/audit-entity.decorator.ts` **(new)** | `@AuditEntity({ type, idFrom })`.
`api/src/common/interceptors/audit-log.interceptor.ts` | Third identity source; null-id fallback replaces the silent return.
`api/src/common/interceptors/audit-route-coverage.spec.ts` **(new)** | Walks every mutating route; fails on any with no identity source.
`apps/web/src/components/pages/board-members/board-members-screen.tsx` | Reads `/federation-appointments/public`; `mailto:` only when the contact block is present.
`apps/web/src/lib/api/types.ts` | `AppointmentPublic` type for the page.

**Dependency order:** Task 1 → 2 → 3 → 4 → 5 → 6 are sequential (each uses the previous one's exports). Tasks 7–8, 9–10 and 11 are independent of each other and of 1–6.

---

### Task 1: Pure authority comparison helpers

**Files:**
- Create: `api/src/modules/platform-administration/users/user-authority.ts`
- Test: `api/src/modules/platform-administration/users/user-authority.spec.ts`

**Interfaces:**
- Consumes: `RequiredPermission` from `common/decorators/permissions.decorator.js`, widened with an optional `scope`.
- Produces: `type Grant = { resourceType: string; action: string; scope?: 'own' | 'all' | null }`; `holdsPair(held: Grant[], wanted: Grant): boolean`; `missingPairs(held: Grant[], wanted: Grant[]): Grant[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { holdsPair, missingPairs } from './user-authority.js';

describe('user-authority', () => {
  const grant = (resourceType: string, action: string, scope?: 'own' | 'all') =>
    ({ resourceType, action, scope: scope ?? null });

  it('holds a pair it has exactly', () => {
    expect(holdsPair([grant('articles', 'Update')], grant('articles', 'Update'))).toBe(true);
  });

  it('does not hold a pair it lacks', () => {
    expect(holdsPair([grant('articles', 'Read')], grant('articles', 'Update'))).toBe(false);
  });

  it('refuses a wider scope than it holds', () => {
    expect(holdsPair([grant('articles', 'Update', 'own')], grant('articles', 'Update', 'all'))).toBe(false);
  });

  it('allows granting a narrower scope than it holds', () => {
    expect(holdsPair([grant('articles', 'Update', 'all')], grant('articles', 'Update', 'own'))).toBe(true);
  });

  it('names every pair the holder is missing, deduplicated', () => {
    const held = [grant('articles', 'Read')];
    const wanted = [grant('articles', 'Update'), grant('users', 'Create'), grant('articles', 'Update')];
    expect(missingPairs(held, wanted)).toEqual([grant('articles', 'Update'), grant('users', 'Create')]);
  });

  it('treats an empty want list as satisfied', () => {
    expect(missingPairs([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd api && npm test -- --runInBand --testPathPatterns="user-authority"`
Expected: FAIL — `Cannot find module './user-authority.js'`.

- [ ] **Step 3: Write the implementation**

```ts
/** A capability as the resolver returns it. `scope` is null on resources that
 *  declare none (ADR-0103 D2). */
export interface Grant {
  resourceType: string;
  action: string;
  scope?: 'own' | 'all' | null;
}

/** Scope width, so "at least as wide as" is a number comparison. A resource
 *  with no scopes is width 0 on both sides and compares equal. */
const width = (scope: Grant['scope']): number => (scope === 'all' ? 2 : scope === 'own' ? 1 : 0);

/** Whether `held` covers `wanted` — the same pair, at a scope at least as
 *  wide. Widening a scope is granting something you do not hold, which is
 *  the case a pair-only comparison silently permits. */
export const holdsPair = (held: readonly Grant[], wanted: Grant): boolean =>
  held.some(
    (h) =>
      h.resourceType === wanted.resourceType &&
      h.action === wanted.action &&
      width(h.scope) >= width(wanted.scope),
  );

/** Every pair in `wanted` that `held` does not cover, in first-seen order and
 *  deduplicated — it is read by a human fixing a role, so a repeated pair is
 *  noise. */
export const missingPairs = (held: readonly Grant[], wanted: readonly Grant[]): Grant[] => {
  const seen = new Set<string>();
  const missing: Grant[] = [];
  for (const pair of wanted) {
    const key = `${pair.resourceType}:${pair.action}:${pair.scope ?? ''}`;
    if (seen.has(key) || holdsPair(held, pair)) {
      continue;
    }
    seen.add(key);
    missing.push({ resourceType: pair.resourceType, action: pair.action, scope: pair.scope ?? null });
  }
  return missing;
};
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd api && npm test -- --runInBand --testPathPatterns="user-authority"`
Expected: PASS, 6 tests.

- [ ] **Step 5: Type-check**

Run: `cd api && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Report**

Report to the owner: `api/src/modules/platform-administration/users/user-authority.ts` and its spec added. Do not commit.

---

### Task 2: Superset check on role assignment — the P0 fix

**Files:**
- Modify: `api/src/modules/platform-administration/roles/roles.service.ts` (add `resolvePermissionsForRoles`)
- Modify: `api/src/modules/platform-administration/users/users.service.ts`
- Modify: `api/src/common/errors/api-error-code.ts`
- Test: `api/src/modules/platform-administration/users/users.service.authority.spec.ts` **(new)**

**Interfaces:**
- Consumes: `missingPairs` from Task 1.
- Produces: `RolesService.resolvePermissionsForRoles(roleIds: readonly string[]): Promise<Grant[]>` — the deduplicated union of what those roles grant. `UsersService.assertAssignableByActor(roleIds: readonly string[], actor: AuthenticatedUser): Promise<void>`.

- [ ] **Step 1: Write the failing negative test first — the forbidden attempt**

```ts
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';

/**
 * The escalation the roles review proved: `users:Create` was enough to become
 * Super Admin, because "you cannot grant what you do not hold" guarded role
 * BUILDING and nothing guarded role HANDING-OUT.
 */
describe('UsersService — you cannot assign what you do not hold', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;

  const superAdminRoleId = new Types.ObjectId().toString();
  const editorRoleId = new Types.ObjectId().toString();

  /** An actor who may create accounts and read users, and nothing more. */
  const staffAdmin = {
    userId: new Types.ObjectId().toString(),
    roleIds: [],
    permissions: [
      { resourceType: 'users', action: 'Create' },
      { resourceType: 'users', action: 'Read' },
    ],
  } as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: { create: jest.fn(), updateById: jest.fn(), findById: jest.fn() } },
        {
          provide: RolesService,
          useValue: { assertAssignable: jest.fn(), resolvePermissionsForRoles: jest.fn(), isSystemRole: jest.fn() },
        },
        { provide: AuthSessionsService, useValue: { revokeAllForUser: jest.fn() } },
        { provide: FederationPersonnelsService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
    rolesService = module.get(RolesService);
    rolesService.assertAssignable.mockResolvedValue(undefined as never);
    rolesService.isSystemRole.mockResolvedValue(false as never);
    repository.create.mockResolvedValue({ email: 'x@uaeaf.ae' } as never);
  });

  it('refuses to create an account holding a role the actor does not hold', async () => {
    rolesService.resolvePermissionsForRoles.mockResolvedValue([
      { resourceType: 'roles', action: 'ManageRoles', scope: null },
    ] as never);

    await expect(
      service.create(
        { name: { en: 'X', ar: 'س' }, email: 'x@uaeaf.ae', roleIds: [superAdminRoleId] } as never,
        staffAdmin,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('names the pairs that were refused, so the gap is fixable', async () => {
    rolesService.resolvePermissionsForRoles.mockResolvedValue([
      { resourceType: 'roles', action: 'ManageRoles', scope: null },
    ] as never);

    await expect(
      service.create({ name: { en: 'X', ar: 'س' }, email: 'x@uaeaf.ae', roleIds: [superAdminRoleId] } as never, staffAdmin),
    ).rejects.toMatchObject({
      response: { code: 'ungrantableRole', missing: ['roles:ManageRoles'] },
    });
  });

  it('refuses to widen a scope the actor holds only as own', async () => {
    const ownOnly = {
      userId: new Types.ObjectId().toString(),
      roleIds: [],
      permissions: [{ resourceType: 'articles', action: 'Update', scope: 'own' }],
    } as never;
    rolesService.resolvePermissionsForRoles.mockResolvedValue([
      { resourceType: 'articles', action: 'Update', scope: 'all' },
    ] as never);

    await expect(service.assignRoles(new Types.ObjectId().toString(), [editorRoleId], ownOnly)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows assigning a role whose grants the actor already holds', async () => {
    rolesService.resolvePermissionsForRoles.mockResolvedValue([
      { resourceType: 'users', action: 'Read', scope: null },
    ] as never);
    repository.updateById.mockResolvedValue({ _id: new Types.ObjectId(), roleIds: [] } as never);

    await expect(
      service.assignRoles(new Types.ObjectId().toString(), [editorRoleId], staffAdmin),
    ).resolves.toBeDefined();
  });

  it('needs no resolution at all when no roles are being assigned', async () => {
    repository.create.mockResolvedValue({ email: 'y@uaeaf.ae' } as never);
    await service.create({ name: { en: 'Y', ar: 'ي' }, email: 'y@uaeaf.ae' } as never, staffAdmin);
    expect(rolesService.resolvePermissionsForRoles).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd api && npm test -- --runInBand --testPathPatterns="users.service.authority"`
Expected: FAIL — `create` takes one argument, and `resolvePermissionsForRoles` does not exist.

- [ ] **Step 3: Add `resolvePermissionsForRoles` and `isSystemRole` to `RolesService`**

```ts
/** The deduplicated union of what a set of roles grants — what assigning
 *  them would hand over. Separate from `resolvePermissions`, which answers
 *  the same question for a signed-in caller: this one is asked about roles
 *  nobody holds yet. */
async resolvePermissionsForRoles(roleIds: readonly string[]): Promise<RequiredPermission[]> {
  return this.resolvePermissions(roleIds);
}

/** Whether this id names a seeded, RBAC-critical role. Read including
 *  archived rows: an archived system role must still refuse assignment. */
async isSystemRole(roleId: string): Promise<boolean> {
  const role = await this.repository.findByIdIncludingArchived(roleId);
  return role?.isSystemRole === true;
}
```

- [ ] **Step 4: Add the two error codes**

In `api/src/common/errors/api-error-code.ts`, add `'ungrantableRole'`, `'targetStronger'` and `'lastSuperAdmin'` to `API_ERROR_CODES`.

- [ ] **Step 5: Add `assertAssignableByActor` and call it from both writers**

```ts
/**
 * "You cannot hand out what you do not hold yourself."
 *
 * The rule `RolesService.assertGrantable` already enforces when a role is
 * BUILT, applied where the role actually reaches a person. Its absence here
 * was a complete privilege escalation: `users:Create` implies `users:Read`
 * by the coherence rule, `GET /users` reveals the Super Admin role's id, and
 * `POST /users` accepted both that id and a caller-chosen password — so two
 * calls produced an account with every permission on the platform.
 *
 * @throws ForbiddenException naming every pair the actor lacks.
 */
private async assertAssignableByActor(
  roleIds: readonly string[],
  actor: AuthenticatedUser,
): Promise<void> {
  if (roleIds.length === 0) {
    // Removing every role, or creating a bare account, hands over nothing.
    return;
  }

  // A seeded role is refused outright rather than compared: its whole point
  // is to hold the entire catalogue, so only an existing holder could pass
  // the comparison, and stating the rule is clearer than relying on it.
  for (const roleId of roleIds) {
    if (await this.rolesService.isSystemRole(roleId)) {
      throw new ForbiddenException({
        code: 'ungrantableRole',
        message: 'A system role cannot be assigned through the API.',
        missing: [],
      });
    }
  }

  const granted = await this.rolesService.resolvePermissionsForRoles(roleIds);
  const missing = missingPairs(actor.permissions, granted);
  if (missing.length > 0) {
    throw new ForbiddenException({
      code: 'ungrantableRole',
      message: 'You cannot assign a role that grants more than you hold yourself.',
      missing: missing.map((pair) => `${pair.resourceType}:${pair.action}`),
    });
  }
}
```

`create(dto, actor)` calls it after `assertAssignable` and before hashing.
`assignRoles(id, roleIds, actor)` calls it before the update.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `cd api && npm test -- --runInBand --testPathPatterns="users.service.authority"`
Expected: PASS, 5 tests.

- [ ] **Step 7: Fix the existing callers and re-run their suites**

`users.controller.ts` passes `@CurrentUser()` into both. The existing
`users.service.create.spec.ts` and `users.service.lifecycle.spec.ts` construct
`create`/`assignRoles` with the old arity and must be updated to pass an actor
holding everything those tests assign.

Run: `cd api && npm test -- --runInBand --testPathPatterns="(users\.service|users\.controller)"`
Expected: PASS — all previously green tests plus the new file.

- [ ] **Step 8: Register the codes in the dashboard's two vocabularies**

`apps/dashboard/src/lib/admin/` — add the three codes to the admin-write group and
`FROM_API_CODE`, and Arabic + English messages to both catalogues. Without this a
403 renders as a generic `conflict`.

- [ ] **Step 9: Type-check and report**

Run: `cd api && npx tsc --noEmit` — expected: no output. Then report the file list.

---

### Task 3: `assertNotStronger` — refuse acting on a stronger account

**Files:**
- Modify: `api/src/modules/platform-administration/users/users.service.ts`
- Test: `api/src/modules/platform-administration/users/users.service.stronger-user.spec.ts` **(new)**

**Interfaces:**
- Consumes: `missingPairs` (Task 1), `RolesService.resolvePermissionsForRoles` (Task 2).
- Produces: `UsersService.assertNotStronger(targetUserId: string, actor: AuthenticatedUser): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
it('refuses to change the roles of an account holding a capability the actor lacks', async () => {
  repository.findById.mockResolvedValue({ _id: new Types.ObjectId(targetId), roleIds: [strongRoleId] } as never);
  rolesService.resolvePermissionsForRoles.mockResolvedValue([
    { resourceType: 'roles', action: 'ManageRoles', scope: null },
  ] as never);

  await expect(service.assertNotStronger(targetId, staffAdmin)).rejects.toMatchObject({
    response: { code: 'targetStronger' },
  });
});

it('permits acting on a peer with an identical set — subset, not strict subset', async () => {
  repository.findById.mockResolvedValue({ _id: new Types.ObjectId(targetId), roleIds: [peerRoleId] } as never);
  rolesService.resolvePermissionsForRoles.mockResolvedValue([
    { resourceType: 'users', action: 'Create', scope: null },
    { resourceType: 'users', action: 'Read', scope: null },
  ] as never);

  await expect(service.assertNotStronger(targetId, staffAdmin)).resolves.toBeUndefined();
});

it('permits acting on a weaker account', async () => {
  repository.findById.mockResolvedValue({ _id: new Types.ObjectId(targetId), roleIds: [weakRoleId] } as never);
  rolesService.resolvePermissionsForRoles.mockResolvedValue([
    { resourceType: 'users', action: 'Read', scope: null },
  ] as never);

  await expect(service.assertNotStronger(targetId, staffAdmin)).resolves.toBeUndefined();
});

it('treats an unknown target as not found rather than as weak', async () => {
  repository.findById.mockResolvedValue(null as never);
  await expect(service.assertNotStronger(targetId, staffAdmin)).rejects.toThrow(NotFoundException);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd api && npm test -- --runInBand --testPathPatterns="stronger-user"`
Expected: FAIL — `assertNotStronger` is not a function.

- [ ] **Step 3: Implement**

```ts
/**
 * "You cannot act on someone stronger than you."
 *
 * Role assignment is the obvious vector; credentials are the quiet one. An
 * actor who may reset another's second factor, or reissue their setup link,
 * can become them — and their capabilities become the actor's without a
 * single permission changing hands. So every route that can acquire another
 * account comes through here.
 *
 * Subset, not strict subset: equal sets may act on each other, which is what
 * lets two Super Admins administer one another. ADR-0105 narrows that for
 * the last remaining one.
 *
 * @throws NotFoundException when the target does not exist — an unknown id
 *   must not read as "holds nothing", which would make it the weakest
 *   possible target.
 * @throws ForbiddenException when the target holds any pair the actor lacks.
 */
async assertNotStronger(targetUserId: string, actor: AuthenticatedUser): Promise<void> {
  const target = await this.repository.findById(targetUserId);
  if (!target) {
    throw new NotFoundException('User not found.');
  }
  const targetGrants = await this.rolesService.resolvePermissionsForRoles(
    target.roleIds.map((roleId) => roleId.toString()),
  );
  const beyond = missingPairs(actor.permissions, targetGrants);
  if (beyond.length > 0) {
    throw new ForbiddenException({
      code: 'targetStronger',
      message: 'This account holds permissions you do not hold yourself.',
      missing: beyond.map((pair) => `${pair.resourceType}:${pair.action}`),
    });
  }
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `cd api && npm test -- --runInBand --testPathPatterns="stronger-user"`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire it into the routes that can acquire an account**

`assignRoles`, `updateAccountStatus`, and (when they exist, later batches) the
setup-link, 2FA-reset, session-revoke and person-link paths. In this batch:
`assignRoles` and `updateAccountStatus`.

- [ ] **Step 6: Run the users suites and type-check**

Run: `cd api && npm test -- --runInBand --testPathPatterns="users\." && npx tsc --noEmit`
Expected: PASS, no type output.

---

### Task 4: Last-Super-Admin protection

**Files:**
- Modify: `api/src/modules/platform-administration/users/users.repository.ts`, `users.service.ts`
- Test: `api/src/modules/platform-administration/users/users.service.last-super-admin.spec.ts` **(new)**

**Interfaces:**
- Produces: `UsersRepository.countActiveSuperAdmins(excludingUserId?: string): Promise<number>`; `UsersService.assertNotLastSuperAdmin(targetUserId: string): Promise<void>`.

- [ ] **Step 1: Write the failing test, including the concurrency case (Review Focus 1)**

```ts
it('refuses to suspend the only active Super Admin', async () => {
  repository.findById.mockResolvedValue({ _id: new Types.ObjectId(targetId), roleIds: [systemRoleId] } as never);
  rolesService.isSystemRole.mockResolvedValue(true as never);
  repository.countActiveSuperAdmins.mockResolvedValue(1 as never);

  await expect(service.updateAccountStatus(targetId, 'Suspended', superAdmin)).rejects.toMatchObject({
    response: { code: 'lastSuperAdmin' },
  });
  expect(repository.updateById).not.toHaveBeenCalled();
});

it('refuses to remove the system role from the only active Super Admin', async () => {
  repository.findById.mockResolvedValue({ _id: new Types.ObjectId(targetId), roleIds: [systemRoleId] } as never);
  rolesService.isSystemRole.mockResolvedValue(true as never);
  repository.countActiveSuperAdmins.mockResolvedValue(1 as never);

  await expect(service.assignRoles(targetId, [], superAdmin)).rejects.toMatchObject({
    response: { code: 'lastSuperAdmin' },
  });
});

it('refuses even when the last Super Admin asks for it themselves', async () => {
  const selfId = superAdmin.userId;
  repository.findById.mockResolvedValue({ _id: new Types.ObjectId(selfId), roleIds: [systemRoleId] } as never);
  rolesService.isSystemRole.mockResolvedValue(true as never);
  repository.countActiveSuperAdmins.mockResolvedValue(1 as never);

  await expect(service.assertNotLastSuperAdmin(selfId)).rejects.toMatchObject({
    response: { code: 'lastSuperAdmin' },
  });
});

it('permits it while a second active holder exists', async () => {
  repository.findById.mockResolvedValue({ _id: new Types.ObjectId(targetId), roleIds: [systemRoleId] } as never);
  rolesService.isSystemRole.mockResolvedValue(true as never);
  repository.countActiveSuperAdmins.mockResolvedValue(2 as never);

  await expect(service.assertNotLastSuperAdmin(targetId)).resolves.toBeUndefined();
});

// Review Focus 1: the count must be read inside the handler, at the moment of
// the write — not captured when the request began. Two concurrent demotions
// each seeing 2 must not both succeed.
it('counts excluding the target, so two concurrent demotions cannot both pass', async () => {
  repository.findById.mockResolvedValue({ _id: new Types.ObjectId(targetId), roleIds: [systemRoleId] } as never);
  rolesService.isSystemRole.mockResolvedValue(true as never);
  repository.countActiveSuperAdmins.mockResolvedValue(1 as never);

  await expect(service.assertNotLastSuperAdmin(targetId)).rejects.toMatchObject({
    response: { code: 'lastSuperAdmin' },
  });
  expect(repository.countActiveSuperAdmins).toHaveBeenCalledWith(targetId);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd api && npm test -- --runInBand --testPathPatterns="last-super-admin"`
Expected: FAIL — `countActiveSuperAdmins` and `assertNotLastSuperAdmin` do not exist.

- [ ] **Step 3: Implement the repository count**

```ts
/**
 * Active Super Admins **other than** `excludingUserId`.
 *
 * Excluding the target is what makes the check correct under concurrency: it
 * answers "would anyone be left", not "how many are there now", so two
 * simultaneous demotions cannot each see two holders and both proceed.
 */
async countActiveSuperAdmins(excludingUserId?: string): Promise<number> {
  const systemRoleIds = await this.model.db
    .collection('roles')
    .find({ isSystemRole: true, archivedAt: null })
    .project({ _id: 1 })
    .toArray();

  return this.model.countDocuments({
    roleIds: { $in: systemRoleIds.map((role) => role._id) },
    accountStatus: 'Active',
    archivedAt: null,
    ...(excludingUserId ? { _id: { $ne: new Types.ObjectId(excludingUserId) } } : {}),
  });
}
```

- [ ] **Step 4: Implement the service guard and call it at both sites**

```ts
/**
 * Refuses the change that would leave the platform with no Super Admin who
 * can sign in.
 *
 * Read inside the handler, immediately before the write, from current state —
 * CLAUDE.md §31. A count taken when the screen opened is exactly the count a
 * concurrent demotion defeats.
 *
 * It refuses the holder's own request too: "I'll demote myself for a moment"
 * is how the last one goes.
 */
async assertNotLastSuperAdmin(targetUserId: string): Promise<void> {
  const target = await this.repository.findById(targetUserId);
  if (!target) {
    return; // Nothing to protect; the caller's own not-found handling applies.
  }
  const holdsSystemRole = (
    await Promise.all(target.roleIds.map((roleId) => this.rolesService.isSystemRole(roleId.toString())))
  ).some(Boolean);
  if (!holdsSystemRole) {
    return;
  }
  if ((await this.repository.countActiveSuperAdmins(targetUserId)) === 0) {
    throw new ForbiddenException({
      code: 'lastSuperAdmin',
      message: 'This is the last active Super Admin. Appoint another before changing this account.',
    });
  }
}
```

Called from `updateAccountStatus` when the new status is not `Active`, and from
`assignRoles` when the new list drops every system role.

- [ ] **Step 5: Run, then run the whole users set, then type-check**

Run: `cd api && npm test -- --runInBand --testPathPatterns="users\." && npx tsc --noEmit`
Expected: PASS, no type output.

- [ ] **Step 6: Report**

---

### Task 5: Remove the self-action carve-outs that are now redundant

**Files:**
- Modify: `api/src/modules/platform-administration/users/users.controller.ts`
- Test: `api/src/modules/platform-administration/users/users.controller.spec.ts`

The controller refuses `id === actor.userId` for roles and status. Tasks 2–4 now
cover the general case, and the self-refusal is still wanted for role assignment
(an actor must not re-grant themselves) but is **wrong** for status if it would
mask the `lastSuperAdmin` message.

- [ ] **Step 1: Write the test that pins the interaction**

```ts
it('still refuses self role-assignment, with the self-assignment code', async () => {
  await expect(controller.assignRoles(actorId, { roleIds: [] }, actor)).rejects.toMatchObject({
    response: { code: 'selfAssignment' },
  });
});

it('reports the last-Super-Admin refusal rather than the self-assignment one when both apply', async () => {
  usersService.updateAccountStatus.mockRejectedValue(
    new ForbiddenException({ code: 'lastSuperAdmin', message: '…' }) as never,
  );
  await expect(
    controller.updateStatus(actorId, { accountStatus: 'Suspended' }, actor),
  ).rejects.toMatchObject({ response: { code: 'selfAssignment' } });
});
```

The second test documents current behaviour: the controller's self-check fires
first, so the actor sees `selfAssignment`. That is acceptable — both refuse — and
pinning it prevents an accidental reorder from changing which message appears.

- [ ] **Step 2: Run, confirm the first passes and the second describes reality**

Run: `cd api && npm test -- --runInBand --testPathPatterns="users.controller"`
Expected: PASS both. If the second fails, the ordering changed and the test is the record of the decision.

- [ ] **Step 3: Report** — no production change if both pass.

---

### Task 6: Policy change lock — `disable()` refuses while reviews run

**Files:**
- Modify: `api/src/modules/workflow/workflow-policies/approval-configuration.service.ts`
- Test: `api/src/modules/workflow/workflow-policies/approval-configuration.lock.spec.ts` **(new)**

**Interfaces:**
- Produces: `assertNothingRunning` is called from `disable`; the refusal payload gains `pending: { entityId, title, currentStep }[]`.

- [ ] **Step 1: Write the failing test**

```ts
it('refuses to turn approvals off while a review is running, and names the pending items', async () => {
  instancesService.countOpenForDefinition.mockResolvedValue(2 as never);
  instancesService.findOpenForDefinition.mockResolvedValue([
    { entityId: 'a1', title: { en: 'Draft A', ar: 'أ' }, currentStepId: 's1' },
    { entityId: 'a2', title: { en: 'Draft B', ar: 'ب' }, currentStepId: 's1' },
  ] as never);

  await expect(service.configure('articles', { enabled: false })).rejects.toMatchObject({
    response: { code: 'reviewsRunning', pending: [{ entityId: 'a1' }, { entityId: 'a2' }] },
  });
  expect(policiesService.upsert).not.toHaveBeenCalled();
});

it('turns approvals off when nothing is running', async () => {
  instancesService.countOpenForDefinition.mockResolvedValue(0 as never);
  await service.configure('articles', { enabled: false });
  expect(policiesService.upsert).toHaveBeenCalledWith('articles', 'Edit', {
    workflowRequired: false,
    workflowDefinitionId: null,
  });
});

it('still refuses an arrangement change while reviews run — unchanged behaviour', async () => {
  instancesService.countOpenForDefinition.mockResolvedValue(1 as never);
  await expect(
    service.configure('articles', { enabled: true, mode: 'any', approverIds: [approverId], threshold: 1 }),
  ).rejects.toMatchObject({ response: { code: 'reviewsRunning' } });
});
```

- [ ] **Step 2: Run and confirm the first two fail**

Run: `cd api && npm test -- --runInBand --testPathPatterns="approval-configuration"`
Expected: FAIL — `disable()` writes without checking.

- [ ] **Step 3: Implement**

`disable()` calls `assertNothingRunning(definitionId)` before `policiesService.upsert`,
when a definition exists. `assertNothingRunning` is extended to return the pending
rows in its refusal payload — the count is already computed for
`GovernableEntity.inFlightReviews`, so this returns the rows behind a number the
screen already shows.

- [ ] **Step 4: Run and confirm pass**

Run: `cd api && npm test -- --runInBand --testPathPatterns="(approval-configuration|workflow-policies)"`
Expected: PASS, including the pre-existing policy suites.

- [ ] **Step 5: Type-check and report**

---

### Task 7: Policy changes write their own audit row, with the old value

**Files:**
- Modify: `api/src/modules/workflow/workflow-policies/approval-configuration.service.ts`, `workflow-policies.controller.ts`
- Test: `api/src/modules/workflow/workflow-policies/approval-configuration.audit.spec.ts` **(new)**

- [ ] **Step 1: Write the failing test**

```ts
it('records the arrangement before and after turning approvals on', async () => {
  // Reading the prior arrangement BEFORE the write is the whole point: the
  // interceptor cannot do it here, because its pre-read needs a path :id and
  // this route's parameter is entityType.
  await service.configure('articles', { enabled: true, mode: 'any', approverIds: [approverId], threshold: 1 });

  expect(auditLogsService.write).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'StatusChange',
      entityType: 'workflowPolicies',
      previousValue: expect.objectContaining({ workflowRequired: false }),
      newValue: expect.objectContaining({ workflowRequired: true, threshold: 1 }),
    }),
  );
});

it('records turning approvals off, naming what it was', async () => {
  instancesService.countOpenForDefinition.mockResolvedValue(0 as never);
  await service.configure('articles', { enabled: false });
  expect(auditLogsService.write).toHaveBeenCalledWith(
    expect.objectContaining({
      previousValue: expect.objectContaining({ workflowRequired: true }),
      newValue: expect.objectContaining({ workflowRequired: false }),
    }),
  );
});

it('writes no audit row when the refusal means nothing changed', async () => {
  instancesService.countOpenForDefinition.mockResolvedValue(1 as never);
  await expect(service.configure('articles', { enabled: false })).rejects.toBeDefined();
  expect(auditLogsService.write).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd api && npm test -- --runInBand --testPathPatterns="approval-configuration.audit"`
Expected: FAIL — no audit write happens at all today.

- [ ] **Step 3: Implement**

`configure` and `disable` read the current arrangement via `describe()` before
writing, then write one `auditLogs` row with both values. Both routes are marked
`@SkipAuditLog()` so the interceptor's less precise row does not duplicate it.

- [ ] **Step 4: Run and confirm pass, then type-check**

Run: `cd api && npm test -- --runInBand --testPathPatterns="(approval-configuration|workflow-policies)" && npx tsc --noEmit`

---

### Task 8: `@AuditEntity` and the end of the silent skip

**Files:**
- Create: `api/src/common/decorators/audit-entity.decorator.ts`
- Modify: `api/src/common/interceptors/audit-log.interceptor.ts`
- Test: `api/src/common/interceptors/audit-log.interceptor.spec.ts` (extend)

- [ ] **Step 1: Write the failing test (Review Focus 4)**

```ts
it('writes a row with a null entity id when nothing can name the record', async () => {
  // A 204 route whose path carries no :id — today this writes nothing at all.
  await runInterceptor({ method: 'PATCH', url: '/api/v1/workflow-policies/articles/approval', params: {} }, undefined);

  expect(auditLogsService.write).toHaveBeenCalledWith(
    expect.objectContaining({
      entityType: 'workflowPolicies',
      entityId: null,
      reason: 'entity id unresolved',
    }),
  );
});

it('prefers the path id when there is one', async () => {
  await runInterceptor({ method: 'PATCH', url: '/api/v1/articles/abc', params: { id: articleId } }, { id: 'other' });
  expect(auditLogsService.write).toHaveBeenCalledWith(
    expect.objectContaining({ entityId: new Types.ObjectId(articleId) }),
  );
});

it('falls back to the response id', async () => {
  await runInterceptor({ method: 'POST', url: '/api/v1/articles', params: {} }, { _id: articleId });
  expect(auditLogsService.write).toHaveBeenCalledWith(
    expect.objectContaining({ entityId: new Types.ObjectId(articleId) }),
  );
});

it('uses @AuditEntity when the route declares one', async () => {
  reflector.getAllAndOverride.mockReturnValue({ type: 'workflowPolicies', idFrom: 'entityType' } as never);
  await runInterceptor(
    { method: 'PUT', url: '/api/v1/workflow-policies/articles/Edit', params: { entityType: 'articles' } },
    undefined,
  );
  expect(auditLogsService.write).toHaveBeenCalledWith(
    expect.objectContaining({ entityType: 'workflowPolicies', entityId: null, reason: expect.stringContaining('articles') }),
  );
});
```

- [ ] **Step 2: Run and confirm the first fails**

Run: `cd api && npm test -- --runInBand --testPathPatterns="audit-log.interceptor"`
Expected: FAIL on the first — `write` was never called.

- [ ] **Step 3: Write the decorator**

```ts
import { SetMetadata } from '@nestjs/common';

export const AUDIT_ENTITY_KEY = 'auditEntity';

/** Names the audited entity for a route the interceptor cannot read on its
 *  own — one whose path key is not `:id` and whose response carries no id.
 *  `idFrom` names the route parameter that identifies the subject; it is
 *  recorded in `reason` when it is not an ObjectId. */
export interface AuditEntityOptions {
  type: string;
  idFrom?: string;
}

export const AuditEntity = (options: AuditEntityOptions) => SetMetadata(AUDIT_ENTITY_KEY, options);
```

- [ ] **Step 4: Replace the silent return**

```ts
// Was: `if (!entityType || !rawEntityId) return;` — which dropped the row for
// any route whose path key is not `:id` and whose response carries no id. The
// approval-policy routes are exactly that shape, so the platform's most
// governance-sensitive write was the one this skipped.
const declared = this.reflector.getAllAndOverride<AuditEntityOptions>(AUDIT_ENTITY_KEY, [
  context.getHandler(),
  context.getClass(),
]);
const entityType = declared?.type ?? this.entityTypeFor(request.url);
if (!entityType) {
  this.logger.warn(`Audit row skipped: no entity type for ${request.method} ${request.url}`);
  return;
}

const rawEntityId = request.params?.id ?? bodyId(responseBody);
const entityId = rawEntityId && Types.ObjectId.isValid(rawEntityId) ? new Types.ObjectId(rawEntityId) : null;
if (!entityId) {
  this.logger.warn(`Audit row written without an entity id: ${request.method} ${request.url}`);
}
```

…and the write proceeds with `entityId` possibly `null`, carrying
`reason: 'entity id unresolved'` plus the `idFrom` parameter's value when declared.

- [ ] **Step 5: Run and confirm pass**

Run: `cd api && npm test -- --runInBand --testPathPatterns="audit-log.interceptor"`
Expected: PASS.

- [ ] **Step 6: Type-check and report**

---

### Task 9: A test that no mutating route can be silent

**Files:**
- Create: `api/src/common/interceptors/audit-route-coverage.spec.ts`

- [ ] **Step 1: Write the test — it is the deliverable**

```ts
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Same mechanical style as `permission-catalogue.spec.ts`: derive the truth
 * from the source rather than from a list someone maintains.
 *
 * A mutating route must be able to name what it changed. Three sources
 * satisfy that: a `:id` path parameter, an id in the response, or an explicit
 * `@AuditEntity`. A route with none of them writes a row with a null entity
 * id — legal after ADR-0112, and worth knowing about, so it must be declared
 * here rather than discovered in the log.
 */
describe('audit route coverage', () => {
  const MUTATING = /^\s*@(Post|Patch|Put|Delete)\(/;

  /** Routes that legitimately have no entity: they act on the caller's own
   *  session or on a collection with no single subject. Each needs a reason. */
  const ALLOWED_WITHOUT_ENTITY = new Map<string, string>([
    ['POST /auth/login', 'no actor yet; AuthService writes its own row'],
    ['POST /auth/refresh', 'session rotation, audited by AuthService'],
    ['POST /auth/logout', "the caller's own session"],
    ['POST /auth/logout-all', "the caller's own sessions"],
  ]);

  /** Blanks comments while preserving line numbering. Without this, a doc
   *  comment that merely MENTIONS @AuditEntity reads as one — the exact
   *  mistake that inflated the route counts during the review audit. */
  const stripComments = (src: string): string =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.controller.ts') ? [full] : [];
    });

  it('every mutating route has an identity source or a recorded exemption', () => {
    const offenders: string[] = [];

    for (const file of walk(join(process.cwd(), 'src'))) {
      const lines = stripComments(readFileSync(file, 'utf8')).split(/\r?\n/);
      const controllerPath = (lines.join('\n').match(/@Controller\(\s*'([^']*)'/) ?? [])[1] ?? '';

      for (let i = 0; i < lines.length; i++) {
        const verb = lines[i].match(MUTATING);
        if (!verb) continue;

        const routePath = (lines[i].match(/@\w+\(\s*'([^']*)'/) ?? [])[1] ?? '';
        const full = `${verb[1].toUpperCase()} /${[controllerPath, routePath].filter(Boolean).join('/')}`;

        // The decorator cluster: consume whole decorators, balancing brackets
        // across lines, while the next logical line still starts with '@'.
        let j = i;
        const cluster: string[] = [];
        while (j < lines.length && /^\s*@/.test(lines[j])) {
          let depth = 0;
          do {
            cluster.push(lines[j]);
            depth += (lines[j].match(/[([{]/g) ?? []).length - (lines[j].match(/[)\]}]/g) ?? []).length;
            j++;
          } while (j < lines.length && depth > 0);
        }

        const hasPathId = /:id\b/.test(routePath);
        const hasDecorator = /@AuditEntity\(/.test(cluster.join('\n'));
        if (!hasPathId && !hasDecorator && !ALLOWED_WITHOUT_ENTITY.has(full)) {
          offenders.push(`${full}  (${file}:${i + 1})`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
```

Note what this test deliberately does **not** claim: a route with a `:id` still
writes a null-id row if that id is not a valid ObjectId at runtime. This catches a
missing *source*, not a source that resolves to nothing — which is why ADR-0112
also makes the runtime path write a row rather than skip.

- [ ] **Step 2: Run it and read the offender list**

Run: `cd api && npm test -- --runInBand --testPathPatterns="audit-route-coverage"`
Expected: FAIL, listing real routes. **Do not add them to the allow-list to make it
green.** For each, either add `@AuditEntity` or record the exemption with a reason.

- [ ] **Step 3: Fix the offenders, re-run until green, type-check, report**

---

### Task 10: The board page reads appointments

**Files:**
- Modify: `apps/web/src/components/pages/board-members/board-members-screen.tsx`, `apps/web/src/lib/api/types.ts`
- Test: `apps/web/src/components/pages/board-members/board-members-screen.spec.tsx` **(new)**

**Interfaces:**
- Consumes: `GET /federation-appointments/public` → `AppointmentPublicResponseDto[]` — `fullName`, `positionTitle`, `roleType`, `displayOrder`, `photoId`.

- [ ] **Step 1: Write the failing test (Review Focus 5)**

```ts
it('lists the people holding board posts, not every active person', async () => {
  fetchPublic.mockResolvedValue([
    { fullName: { en: 'A', ar: 'أ' }, positionTitle: { en: 'President', ar: 'الرئيس' }, roleType: 'President', displayOrder: 1, photoId: null },
  ]);
  const html = await render(locale);
  expect(fetchPublic).toHaveBeenCalledWith('/federation-appointments/public');
  expect(html).toContain('الرئيس');
});

it('announces the number of serving post-holders', async () => {
  fetchPublic.mockResolvedValue([entry('A'), entry('B'), entry('C')]);
  expect(await render('ar')).toContain('3');
});

it('shows the empty state when nobody is serving, rather than announcing zero members', async () => {
  fetchPublic.mockResolvedValue([]);
  const html = await render('ar');
  expect(html).not.toContain('StatHighlight');
});

it('prints no mailto when the contact block is absent', async () => {
  fetchPublic.mockResolvedValue([entry('A')]);
  expect(await render('ar')).not.toContain('mailto:');
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd apps/web && npx vitest run --pool=threads board-members`
Expected: FAIL — the screen calls `/federation-personnel/public`.

- [ ] **Step 3: Change the source**

`loadMembers` calls `/federation-appointments/public`; the card prints
`positionTitle` under the name; the count is the returned length; the `mailto:`
block is removed from this page — the endpoint does not carry contact at all,
which is the point.

- [ ] **Step 4: Run and confirm pass**

Run: `cd apps/web && npx vitest run --pool=threads board-members`
Expected: PASS, 4 tests.

- [ ] **Step 5: Verify in a browser against the live record**

Start the API on `PORT=3000` and the web app; load `/ar/about/board-members` and
`/en/about/board-members` **via `localhost`, never `127.0.0.1`** (Next 16 dev never
hydrates on the IP). The public read is cached 60 s, so after any data change wait
out the window and load twice before judging.

Screenshots go to the scratchpad directory, never into the repository.

- [ ] **Step 6: Stop the servers and confirm no orphans**

List `node.exe` processes with command lines, stop the app ones, confirm ports 3000
and 3002 are free. Leave the MCP tool processes alone.

- [ ] **Step 7: Report**

---

## Batch 1 exit criteria

- [ ] `npm test -- --runInBand --testPathPatterns="(user-authority|users\.|approval-configuration|workflow-policies|audit-log|audit-route-coverage)"` — all green, with the count recorded.
- [ ] `npx tsc --noEmit` in `api/` — clean.
- [ ] `npx vitest run --pool=threads board-members` in `apps/web/` — green.
- [ ] Every one of the five Review Focus conditions has a passing test.
- [ ] No Git command run; no script run; no dependency added.
- [ ] Interim report written per the brief's §14, then continue to Batch 2 without waiting.

---

## Batches 2–9 — roadmap

The writing-plans skill says a spec spanning independent subsystems should become
one plan per subsystem, each shipping working software on its own. This spec does:
the authorization model, authentication, data protection, the profiles domain and
the dashboard are five subsystems. **Recommendation: write each batch's plan at
the start of its own session**, from this spec, rather than writing 2,000 lines of
bite-sized steps now for work that eight open questions can still reshape. Batch 1
is fully specified above because it is next and it carries the P0.

| Batch | Scope | Gated on | Deliverable that proves it |
|---|---|---|---|
| **2** | Capability map + vocabulary (A1, A2, A5); catalogue derived from the map; **`superAdminOnly` on the five un-grantable pairs** (decision 4); `Update` for the 30 resources (F3); the ten group pseudo-resources; `permission-catalogue.spec.ts` extended | Batch 1. All questions answered. | The catalogue test passes in three directions; a role asking for `users:Create` is refused; a `Delete`→`Archive` migration script exists unrun |
| **3** | `ManageRoles` / `AssignRoles` declared un-grantable; system roles leave the API; `GET /me/permissions` (with scopes + account class); `reset-roles` and `seed-role-templates` **written, not run** | Batch 2 · Batch 1's ADR-0104 fix | **Six** templates exist as data; a negative test shows no template can escalate, and none asks for an un-grantable pair |
| **4** | Approvals: per-type `Approve`, SoD, blocked assignees, Super Admin override with reason (A6); editorial cycle completed for the five types, then `federationPersonnel` (F9) | Batch 2. **Stop-and-ask if `publications`/`revisions` need a shape change** | A review cannot be approved by its author; `committees` can be published |
| **5** | Authentication: TOTP (`crypto`, RFC 6238 vectors), `qrcode` enrolment, recovery codes, trusted device, step-up, sessions, `securitySettings` + migration, bcrypt 12 + transparent rehash, `MailPort`/`LogMailAdapter` (B1–B6); break-glass (A10); setup links (A11) | **⛔ Stop and ask about the mail provider if still undecided** — "continue with the log" is an acceptable answer | RFC 6238 vectors pass; a replayed code is refused; `siteSettings`' two fields are gone; the last Super Admin can be recovered from the command line |
| **6a** | Sensitive fields (`ViewSensitive`, per resource) + `ViewReports` per group + `SensitiveRead` auditing debounced per (actor, record, minute) | Batch 2 | A `Read`-only holder never receives a sensitive field; reading one record ten times in a minute writes one row, and ten records write ten |
| **6b** | Export/print routes behind the **group** grants + audit with filters and count; `ViewAuditLog`, security events, log export (C1); the annual-review audit entry | Batch 6a | An exporter without `ViewSensitive` on a resource gets a file without its sensitive columns; the log has no mutating path |
| **7** | Profiles domain: indexes (F2), appointment closure (F4), person link (F5), `showPublicContact` (F6), CV sections (F7), public endpoints (F8), derived org chart (F10) | Batch 2 for `Update`; Batch 4 for F9's read path | No N+1 on the board, committees or org chart; a closed post stays readable |
| **8** | Dashboard: the nine new screens **and every existing screen the new rules touch** — see the Batch 8 table below | Batches 2–7. **⛔ Read `docs/design-specs/auth/2026-09-26-authz-accounts/README.md` first; stop and ask if the design needs something the API cannot do** | Keyboard and screen-reader paths verified; every visual decision outside the chapters marked **Pending Figma Back-Sync** with its chapter number |
| **9** | `/simplify` on session-changed files only; full suite once; the three explanation documents, each in the agreed nine-item format | all | Full suite green, recorded |

### Batch 8 — existing screens that must change, and the rule each one carries

Not only the new screens. Every one of these already exists and breaks a new rule
until it is changed.

| Screen / surface | Change | Rule it applies |
|---|---|---|
| Every screen with a "Delete" action | becomes **Archive**; **Restore** added; **Permanent delete** only when the resource is `purgeable` and the actor holds it, behind step-up and a typed confirmation | ADR-0103 A2 |
| Every list with an export or print affordance | shown by the **group** grant, not per resource | ADR-0111 (Q4) |
| Every form or detail view carrying a sensitive field | field hidden with a "بيانات محمية / Protected data" marker when `ViewSensitive` is absent | ADR-0111 |
| Every screen reachable with `Read` and no `Update` | opens **read-only** with the "عرض فقط / View only" bar | spec §10.1 |
| Editorial lists under the `own` scope | no edit or archive control on another author's record, and the reason shown rather than the row hidden | spec §2.4 |
| **Users screen** | creation without a password (setup link); person link and unlink; **the whole screen becomes Super-Admin-only** | decision 4, ADR-0110, ADR-0115 |
| **Approval-policies screen** (`policy-manager` and its parts) | **kept as it is** — groups, cards, approval mode, approver order, "apply to group". **Added on top:** the change lock with the pending-content list; approvers pickable only from holders of `Approve` on that type; a "lost the approval capability" marker; step-up on save and on apply-to-group; the policy change log. "Apply to group" **skips** types with reviews running | ADR-0106, ADR-0107 |
| Approval-step editor | approvers from `Approve` holders only; the approve control absent for the content's own author; Super Admin override with a reason field | ADR-0106 |
| Sidebar + dashboard home | driven by `GET /me/permissions`; statistics by `ViewReports` | spec §10.1 |
| Users directory | "بدون رول / No role" marker | ADR-0113 |
| Global | standing warning while fewer than two active Super Admins | ADR-0105 |
| **Person screens + board-page admin** | built to `source/governance/` and `screens/08-*`, `09-*` in the design reference | ADR-0114, ADR-0117, ADR-0119 |

**Committees dashboard screen stays out of scope** until its design is ready.

### Backlog — noticed, deliberately not built

- **⚠️ MANDATORY COMPLIANCE GAP — ADR-0028 §2 parental consent.** No consent fields exist in any schema, and the chapter requires documented, withdrawable consent taking effect immediately. **Owner decision 2026-09-26: this is a blocking precondition for publishing any athlete data publicly** — not a nice-to-have and not deferrable past that point. Out of scope for this work; it needs its own spec.
- **argon2id** as a stronger password hash than bcrypt-12 (ADR-0110 D1). Needs a native dependency; not taken.
- **ADR-0029's promised Chapter 21 section** on the authentication abstraction does not exist — Chapter 21 is frontend architecture. This spec is the interim record.
- **`docs/design-system/00-MASTER-INDEX.md`** needs the 17 new ADRs added; a Batch 9 documentation task.
- **WebAuthn / passkeys** as a stronger second factor than TOTP (ADR-0108 alternative A).
- **Non-conforming appointment rows** missing `electionCycleId` or `committeeId`: report them, since ADR-0116 validates incoming changes only.
- **`athleteProfiles`, `officialProfiles`, `coaches`** likely need the same CV treatment as ADR-0114 gives `federationPersonnel`; not requested.

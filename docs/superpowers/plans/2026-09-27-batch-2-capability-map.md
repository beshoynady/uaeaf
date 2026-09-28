# Batch 2 — The Capability Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the owner chose inline execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one declaration per resource the source of the permission catalogue; rename `Delete` to `Archive` and pair it with `Restore`; give 30 resources the `Update` they never had; collapse the permission comparison to **one** function that understands `scope`; and declare the five account-administration pairs un-grantable.

**Architecture:** `capability-map.ts` becomes the single declaration and `PERMISSION_CATALOGUE` is **derived** from it, so `permission-catalogue.spec.ts` keeps working and gains a third direction. The guard's flat pair comparison is untouched — scope is resolved in the service, per ADR-0103 D2. Every new verb lands in the same task as the route that guards it, because the catalogue spec fails on any declared pair no decorator guards.

**Tech Stack:** NestJS 12 · Mongoose 9 · Jest with `--runInBand` (mandatory).

**Spec:** [`docs/superpowers/specs/2026-09-26-authz-authn-design.md`](../specs/2026-09-26-authz-authn-design.md)

**Preceded by:** [`docs/superpowers/plans/2026-09-26-authz-authn.md`](./2026-09-26-authz-authn.md) (Batch 1, committed by the owner)

**ADRs:** [ADR-0103](../../design-system/ADR-0103-Capability-Map-And-Action-Vocabulary.md) (primary) · [ADR-0104](../../design-system/ADR-0104-Grant-Assign-Superset-Rule-And-Stronger-User-Guard.md) (the one comparison function, and the five un-grantable pairs)

## Global Constraints

- **No Git commands.** Work stays uncommitted; the owner commits (CLAUDE.md §33).
- **No new dependencies.** None is needed.
- **Scripts are written, never run.** The `Delete`→`Archive` migration and the catalogue sync are the owner's to run.
- **TDD is mandatory**, and every security rule gets a **negative test**: the forbidden attempt is shown to be refused.
- **`npm test -- --runInBand`** always. `npx jest` runs zero tests (ESM).
- **Type-check with `npx tsc --noEmit` only.** ts-jest does not type-check.
- **Arrow functions** for new code; convert functions in files you touch, except class/decorated methods, dynamic `this`, generators, overloads, `arguments`, hoisting (CLAUDE.md §30).
- **A new API error code joins three vocabularies** or it degrades to `conflict`: `API_ERROR_CODES`, admin-write's group + `FROM_API_CODE`, and both message catalogues.
- **Every user-facing string is Arabic and English.**
- Run only the affected test files; the full suite is Batch 9.

## Review Focus

Five conditions the spec implies that no task's happy path exercises.

1. **A role asking for an un-grantable pair, via the route that builds it and the route that hands it out** — both must refuse, and a Super Admin must still hold it. Pinned in Task 5.
2. **Scope widening through the resolver, not just the helper** — a permission row stored at `own` must arrive at the comparison as `own`. Batch 1's test proved the helper against a hand-made object the real resolver could not produce. Pinned in Task 4.
3. **`Archive` on a resource whose rows are already archived** — restore must not resurrect a row whose parent is gone, and archive must be idempotent rather than overwriting `archivedAt` with a later date. Pinned in Task 7.
4. **A partial update that omits a field** — under `target: ES2023` every declared DTO property exists as `undefined`, so a naive merge wipes what was not sent. This already cost this codebase a bug. Pinned in Task 6.
5. **The catalogue spec passing vacuously** — if the derivation returns an empty list, all three assertions pass. Pinned in Task 1.

---

## File Structure

| File | Responsibility |
|---|---|
`api/src/common/authz/capability-map.ts` **(new)** | One declaration per resource: group, verbs, `purgeable`, `superAdminOnly`, sensitive field paths, scopes. The source everything else derives from.
`api/src/common/authz/capability-map.spec.ts` **(new)** | The map covers every resource; no resource declares a verb outside the vocabulary; the five un-grantable pairs are exactly as ADR-0104 names them.
`api/src/common/constants/permission-catalogue.ts` | Becomes **derived** from the map. Keeps its exported shape so nothing downstream changes.
`api/src/common/constants/permission-catalogue.spec.ts` | Gains a third assertion (the map covers every guarded pair) and a non-vacuity floor.
`api/src/common/constants/permission-resources.ts` | Gains the ten group pseudo-resources.
`api/src/modules/platform-administration/permissions/schemas/permission.schema.ts` | `PERMISSION_ACTIONS` loses `HardDelete`/`EditProtectedData`, gains `Archive`, `Restore`, `PermanentDelete`, `Print`, `ViewSensitive`, `ViewReports`, `ManageRoles`, `AssignRoles`, `ViewAuditLog`, `ManageSecuritySettings`. `Delete` is renamed `Archive`. **+ `scope`**.
`api/src/common/decorators/permissions.decorator.ts` | `RequiredPermission.action` widens to the new vocabulary; `scope` becomes an optional field on it.
`api/src/modules/platform-administration/users/user-authority.ts` | Unchanged — it is already the one comparison. Gains no new export.
`api/src/modules/platform-administration/roles/roles.service.ts` | `assertGrantable` migrates onto `holdsPair`; `resolvePermissions` stops dropping `scope`.
`api/src/modules/platform-administration/users/users.service.ts` | `assertAssignableByActor` refuses an un-grantable pair before the superset comparison.
`api/src/modules/platform-administration/roles/roles.controller.ts` · `users.controller.ts` | Re-pointed at the new pairs per the Decision-4 audit.
`api/src/migrate-delete-to-archive.ts` **(new, unrun)** | Rewrites stored `permissions.action` from `Delete` to `Archive`.
`api/src/common/authz/archive-restore.controller-mixin.ts` **(new)** | The shared `Archive`/`Restore`/`PermanentDelete` route trio, so 47 resources do not each hand-roll it.

**Dependency order:** 1 → 2 → 3 → 4 → 5 are sequential. 6, 7, 8 each depend on 1–2 and are independent of each other. 9 is last.

---

### Task 1: The capability map, and the catalogue derived from it

**Files:**
- Create: `api/src/common/authz/capability-map.ts`
- Create: `api/src/common/authz/capability-map.spec.ts`
- Modify: `api/src/common/constants/permission-catalogue.ts`
- Modify: `api/src/common/constants/permission-catalogue.spec.ts`

**Interfaces:**
- Produces: `interface ResourceCapability { resourceType: PermissionResource; group: ProductGroup; actions: readonly PermissionAction[]; purgeable: boolean; superAdminOnly: readonly PermissionAction[]; sensitiveFields: readonly { path: string; class: 'Restricted' | 'SensitiveMinor' }[]; scopes: readonly ('own' | 'all')[] }`; `CAPABILITY_MAP: readonly ResourceCapability[]`; `capabilityFor(resourceType): ResourceCapability | undefined`.
- Consumed by: every later task.

- [ ] **Step 1: Write the failing test, including the non-vacuity floor (Review Focus 5)**

```ts
import { CAPABILITY_MAP, capabilityFor } from './capability-map.js';
import { PERMISSION_RESOURCES } from '../constants/permission-resources.js';
import { PERMISSION_ACTIONS } from '../../modules/platform-administration/permissions/schemas/permission.schema.js';

describe('CAPABILITY_MAP', () => {
  // Review Focus 5: an empty derivation makes every other assertion here pass.
  it('declares a realistic number of resources, so an empty map cannot pass', () => {
    expect(CAPABILITY_MAP.length).toBeGreaterThan(60);
  });

  it('covers every resource exactly once', () => {
    const declared = CAPABILITY_MAP.map((entry) => entry.resourceType).sort();
    expect(declared).toEqual([...PERMISSION_RESOURCES].sort());
    expect(new Set(declared).size).toBe(declared.length);
  });

  it('declares no verb outside the vocabulary', () => {
    const unknown = CAPABILITY_MAP.flatMap((entry) =>
      entry.actions.filter((action) => !(PERMISSION_ACTIONS as readonly string[]).includes(action)),
    );
    expect(unknown).toEqual([]);
  });

  it('offers PermanentDelete only where the resource is purgeable', () => {
    const wrong = CAPABILITY_MAP.filter(
      (entry) => entry.actions.includes('PermanentDelete') && !entry.purgeable,
    ).map((entry) => entry.resourceType);
    expect(wrong).toEqual([]);
  });

  it('pairs Restore with Archive, never alone', () => {
    const wrong = CAPABILITY_MAP.filter(
      (entry) => entry.actions.includes('Restore') && !entry.actions.includes('Archive'),
    ).map((entry) => entry.resourceType);
    expect(wrong).toEqual([]);
  });

  it('scopes only editorial content (A5)', () => {
    const scoped = CAPABILITY_MAP.filter((entry) => entry.scopes.length > 0).map((e) => e.resourceType);
    expect(scoped.sort()).toEqual(['albums', 'articles', 'heroSlides', 'videos']);
  });

  it('names every superAdminOnly verb among the resource own actions', () => {
    const wrong = CAPABILITY_MAP.flatMap((entry) =>
      entry.superAdminOnly.filter((action) => !entry.actions.includes(action)),
    );
    expect(wrong).toEqual([]);
  });

  it('answers for a known resource and not for an unknown one', () => {
    expect(capabilityFor('users')?.group).toBe('platform-administration');
    expect(capabilityFor('notAResource' as never)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd api && npm test -- --runInBand --testPathPatterns="capability-map"`
Expected: FAIL — `Cannot find module './capability-map.js'`.

- [ ] **Step 3: Write the map**

Transcribe the spec's §2.5 table — all 69 resources plus the ten group
pseudo-resources — into `CAPABILITY_MAP`. The generator that produced that table
lives in the session scratchpad and is not part of the repository; the map is
committed source, not generated at build time, because it carries three columns
of human judgement (`purgeable`, sensitive fields, scopes) that nothing can derive.

Shape, with one entry shown in full and the rest following it:

```ts
export const CAPABILITY_MAP: readonly ResourceCapability[] = [
  {
    resourceType: 'users',
    group: 'platform-administration',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'PermanentDelete', 'AssignRoles'],
    purgeable: true,
    // ADR-0104 as amended: no role may hold these at all.
    superAdminOnly: ['Create', 'Update', 'AssignRoles'],
    sensitiveFields: [],
    scopes: [],
  },
  // … 68 more, plus the nine group report resources (Task 8 — nine, not ten:
  // Platform Administration has none, per Q-A).
];
```

- [ ] **Step 4: Derive the catalogue from it**

```ts
/** Derived, not hand-written (ADR-0103). Keeps the exported shape so nothing
 *  downstream changes: the bootstrap still seeds from this, and
 *  `permission-catalogue.spec.ts` still compares it to the decorators. */
export const PERMISSION_CATALOGUE: readonly PermissionCatalogueEntry[] = CAPABILITY_MAP.flatMap(
  (capability) =>
    capability.actions.map((action) => ({ resourceType: capability.resourceType, action })),
);
```

- [ ] **Step 5: Add the third direction to the catalogue spec**

```ts
it('declares a pair for every resource the capability map covers', () => {
  const fromMap = new Set(
    CAPABILITY_MAP.flatMap((c) => c.actions.map((a) => `${c.resourceType}:${a}`)),
  );
  expect([...fromMap].filter((pair) => !declaredPairs.has(pair)).sort()).toEqual([]);
});

// Review Focus 5 again, at this level: a derivation that returns nothing makes
// "no dead pairs" and "covers every decorator" both pass.
it('derives a realistic number of pairs', () => {
  expect(PERMISSION_CATALOGUE.length).toBeGreaterThan(250);
});
```

- [ ] **Step 6: Run both specs and read the dead-pair list**

Run: `cd api && npm test -- --runInBand --testPathPatterns="(capability-map|permission-catalogue|permission-resources)"`
Expected: FAIL on `declares no pair that nothing in the codebase guards`, listing every new verb whose route does not exist yet. **That list is the work of Tasks 5–8.** Record it in the ledger; do not shrink the map to make it green.

- [ ] **Step 7: Remove `permissions:Create` and the route behind it (owner decision 2026-09-27)**

The catalogue is derived from the capability map in source, and `seed`/`sync` are
its only writers. A permission that lets the API mint permission rows reopens the
"looks granted, guards nothing" door — a row created at runtime gates no
decorator — and it contradicts the map being the source. **`POST /permissions`
exists today** (`permissions.controller.ts:13`) and is removed.

```ts
/**
 * The catalogue is code. `CAPABILITY_MAP` declares it, `PERMISSION_CATALOGUE`
 * derives from it, and `seedPermissions` is the only writer — so a route that
 * creates a permission row at runtime could only ever create one that no
 * decorator reads, which is the exact failure `PERMISSION_RESOURCES` exists to
 * prevent.
 *
 * Asserted on the source rather than by calling the route, because the point is
 * that the route does not exist at all.
 */
it('exposes no way to create a permission through the API', () => {
  const controller = readFileSync(
    join(process.cwd(), 'src/modules/platform-administration/permissions/permissions.controller.ts'),
    'utf8',
  );

  expect(controller).not.toMatch(/@(Post|Put|Patch|Delete)\(/);
});

it('declares no Create pair for permissions', () => {
  expect(capabilityFor('permissions')?.actions).toEqual(['Read']);
});
```

- [x] **Step 8: Type-check and report** — done 2026-09-27. `npx tsc --noEmit` clean; `capability-map.spec.ts` 16/16 green.

> **What Step 6 measured, which is this batch own worklist.** The two
> directions fail apart and mean different work, so they are recorded apart:
>
> **DEAD — 125 pairs the map declares and no route guards yet** (Tasks 5–8):
> `Restore` 47 · `Update` 27 · `ViewReports`/`Export`/`Print` 9 each · `Approve` 9 ·
> `ViewSensitive` 6 · `Publish` 4 · `PermanentDelete` 2 · `Archive` 1 (`users`) ·
> `AssignRoles` 1 · `ManageRoles` 1. The `Update` count is **exactly 27**, which
> is the owner decision confirmed by measurement rather than by transcription.
>
> **MISSING — 3 pairs a live decorator needs and the map deliberately dropped:**
> `roles:Create`, `roles:Update`, `roles:Archive`. These are not future work: the
> owner merged them into `roles:ManageRoles`, so three routes are guarded **right
> now** by pairs the catalogue no longer contains — a permission no role can hold,
> which is an endpoint nobody can call. They are re-pointed in **Task 5 Step 5**,
> inside this batch, not deferred to Batch 3 with A8.

Run: `cd api && npx tsc --noEmit`. Report the dead-pair list to the owner as the batch's own worklist.

---

### Task 2: The vocabulary, and the migration that renames stored rows

> **Q-E decided (owner asked for proof before the script is written; here it is).**
>
> **The script is needed, and not for roles.** `PermissionsService.findAll` is
> `repository.find()` — the whole collection, soft-delete filtered only — and
> `GET /permissions` returns it straight to the role-building picker. After the
> rename, `seedPermissions` **upserts** on the `(resourceType, action)` pair and
> never deletes, so it would insert 47 new `Archive` rows and leave 47 `Delete`
> rows sitting in the collection. Those rows would appear in the picker as
> selectable permissions that guard nothing — exactly the "looks granted, guards
> nothing" failure `PERMISSION_RESOURCES` was introduced to prevent.
>
> **E1 does not cover it.** E1 archives *roles*. It never touches the
> *permissions* collection. So after E1 the orphan rows are unreferenced — they
> grant nothing, which is why this is not a security defect — but they are still
> listed, still selectable, and still there at the next deploy.
>
> So the script's job is narrower than the original draft implied: it cleans the
> `permissions` collection. The roles half of that draft was indeed covered by E1
> and its test is dropped.
>
> **The `DELETE` route audit** (second half of Q-E): 49 `DELETE` routes, **every
> one guarded**, and exactly **one** performs a real destruction —
> `DELETE /media-assets/:id/object`, which destroys the stored object then calls
> the codebase's only `hardDelete`. It already refuses an asset that has not been
> archived first. That route is the only one that must carry `PermanentDelete`
> rather than `Archive`; the other 48 already soft-delete and simply get the
> renamed verb. Full table in the batch report.
>
> **Q-E's two conditions (owner, 2026-09-27).**
>
> **(1) The resolver already tolerates a missing permission row, and gets the
> test.** `resolvePermissions` reads through `PermissionsService.findByIds`, which
> returns **fewer documents than ids given** when some are missing or archived,
> and the loop iterates over what came back. So a role still pointing at a removed
> row grants nothing, silently, without throwing. Nothing to change — the test the
> owner asked for is what was missing.
>
> **(2) Therefore the script is safe in any order relative to E1, and that is
> stated rather than left to a run-order rule.** The dangerous ordering would be
> one where an unresolvable id crashed permission resolution or granted something;
> condition (1) rules out both. The spec's script order still lists it after E1,
> because running it against a smaller collection is cheaper and its report is
> easier to read — a preference, not a correctness requirement, and the spec says so.

**Files:**
- Modify: `api/src/modules/platform-administration/permissions/schemas/permission.schema.ts`
- Modify: `api/src/common/decorators/permissions.decorator.ts`
- Create: `api/src/migrate-delete-to-archive.ts` **(written, not run)**
- Create: `api/src/migrate-delete-to-archive.spec.ts`

- [ ] **Step 1: Write the failing test for the migration**

```ts
describe('migrate-delete-to-archive', () => {
  // Q-E condition (1). Already true; the test is what was missing. This is also
  // what makes the script order-independent relative to E1.
  it('lets a role survive pointing at a permission row that no longer exists', async () => {
    const [row] = await permissions.insertMany([
      { resourceType: 'articles', action: 'Delete', name: { en: 'x', ar: 'x' } },
    ]);
    await roles.insertMany([{ name: { en: 'r', ar: 'r' }, permissionIds: [row._id, missingId] }]);

    const resolved = await rolesService.resolvePermissions([roleId.toString()]);

    // The unresolvable id contributes nothing and throws nothing.
    expect(resolved).toEqual([{ resourceType: 'articles', action: 'Delete', scope: null }]);
  });

  it('leaves the role documents alone — E1 owns those, and roles reference by id', async () => {
    const [row] = await permissions.insertMany([
      { resourceType: 'articles', action: 'Delete', name: { en: 'x', ar: 'x' } },
    ]);
    await roles.insertMany([{ name: { en: 'r', ar: 'r' }, permissionIds: [row._id] }]);

    await migrateDeleteToArchive(permissions);

    // The id does not change, so nothing in `roles` needs rewriting. This is the
    // half of the original draft that E1 already covered.
    expect((await roles.findOne({}))?.permissionIds[0].toString()).toBe(row._id.toString());
  });

  it('rewrites every stored Delete row to Archive', async () => {
    await permissions.insertMany([
      { resourceType: 'articles', action: 'Delete', name: { en: 'x', ar: 'x' } },
      { resourceType: 'clubs', action: 'Delete', name: { en: 'y', ar: 'y' } },
    ]);

    const result = await migrateDeleteToArchive(permissions);

    expect(result.rewritten).toBe(2);
    expect(await permissions.countDocuments({ action: 'Delete' })).toBe(0);
    expect(await permissions.countDocuments({ action: 'Archive' })).toBe(2);
  });

  it('is idempotent — a second run rewrites nothing and reports zero', async () => {
    await permissions.insertMany([{ resourceType: 'articles', action: 'Delete', name: { en: 'x', ar: 'x' } }]);

    await migrateDeleteToArchive(permissions);
    const second = await migrateDeleteToArchive(permissions);

    expect(second.rewritten).toBe(0);
  });

  it('refuses to run when an Archive row already exists for the same resource', async () => {
    // Both rows present means a partial earlier run or a hand edit. Rewriting
    // would violate the unique (resourceType, action) pair.
    await permissions.insertMany([
      { resourceType: 'articles', action: 'Delete', name: { en: 'x', ar: 'x' } },
      { resourceType: 'articles', action: 'Archive', name: { en: 'z', ar: 'z' } },
    ]);

    await expect(migrateDeleteToArchive(permissions)).rejects.toThrow(/already has an Archive/);
  });

});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd api && npm test -- --runInBand --testPathPatterns="migrate-delete-to-archive"`
Expected: FAIL — module not found.

- [ ] **Step 3: Change the vocabulary**

In `permission.schema.ts`, `PERMISSION_ACTIONS` becomes:

```ts
export const PERMISSION_ACTIONS = [
  'Read',
  'Create',
  'Update',
  // Renamed from `Delete` (ADR-0103). Every repository already implemented
  // "delete" as `archivedAt`, so the permission called Delete granted archival —
  // a name an administrator reading the role screen could not believe.
  'Archive',
  'Restore',
  // The destructive verb that did not exist. Offered only where the capability
  // map says `purgeable`, refused while the record is published or referenced.
  'PermanentDelete',
  'Export',
  'Print',
  'ViewSensitive',
  'Publish',
  'Approve',
  'ViewReports',
  'ManageRoles',
  'AssignRoles',
  'ViewAuditLog',
  'ManageSecuritySettings',
] as const;
```

`HardDelete` and `EditProtectedData` are removed: zero resources used either, which
is the dead configuration `PERMISSION_RESOURCES` exists to prevent. `permissions.decorator.ts`
drops its hand-written action union and imports `PermissionAction` instead, so the
two can no longer disagree.

- [ ] **Step 4: Write the migration**

```ts
/**
 * Rewrites stored `permissions.action` from `Delete` to `Archive`.
 *
 * Needed because `sync-permission-catalogue.ts` upserts on the
 * `(resourceType, action)` pair: after the rename it would INSERT 47 new
 * `Archive` rows and leave 47 orphaned `Delete` rows that every existing role
 * still points at. The roles are untouched here — they reference permissions by
 * id, and the id does not change.
 *
 * Idempotent: a second run finds no `Delete` rows and reports zero.
 *
 * @throws when a resource already has BOTH rows — a partial earlier run or a
 *   hand edit. Rewriting would collide with the unique pair index, so it stops
 *   and names the resource rather than half-finishing.
 */
export const migrateDeleteToArchive = async (
  permissions: Model<Permission>,
): Promise<{ rewritten: number }> => {
  const stale = await permissions.find({ action: 'Delete' }).select('resourceType').lean().exec();
  if (stale.length === 0) {
    return { rewritten: 0 };
  }

  const collisions = await permissions
    .find({ action: 'Archive', resourceType: { $in: stale.map((row) => row.resourceType) } })
    .select('resourceType')
    .lean()
    .exec();
  if (collisions.length > 0) {
    throw new Error(
      `Cannot rename: ${collisions.map((c) => c.resourceType).join(', ')} already has an Archive row.`,
    );
  }

  const result = await permissions.updateMany({ action: 'Delete' }, { $set: { action: 'Archive' } });
  return { rewritten: result.modifiedCount };
};
```

- [ ] **Step 5: Run the spec, then type-check**

Run: `cd api && npm test -- --runInBand --testPathPatterns="migrate-delete-to-archive" && npx tsc --noEmit`
Expected: PASS, 4 tests. **Do not run the migration itself.**

- [ ] **Step 6: Re-point every decorator from `'Delete'` to `'Archive'`**

47 resources. Mechanical, so script it and read the diff; a hand pass over 47
files is where one gets missed. `permission-catalogue.spec.ts` is the check: it
fails on any decorator whose pair the map does not declare.

Run: `cd api && npm test -- --runInBand --testPathPatterns="permission-catalogue" && npx tsc --noEmit`

- [ ] **Step 7: Report** — including the migration's run order relative to `sync-permission-catalogue`.

---

### Task 3: One comparison function (review finding F7, owner decision 3)

**Files:**
- Modify: `api/src/modules/platform-administration/roles/roles.service.ts`
- Create: `api/src/modules/platform-administration/roles/roles.service.one-comparison.spec.ts`

**Interfaces:**
- Consumes: `holdsPair`, `missingPairs` from Batch 1's `user-authority.ts`.
- Produces: nothing new. `assertGrantable` keeps its signature and changes its implementation.

- [ ] **Step 1: Write the failing test**

```ts
/**
 * ADR-0104 created `user-authority.ts` so that role-building and role-assignment
 * could not drift apart. `assertGrantable` was left as a third, independent,
 * pair-only comparison — so when `scope` arrives, role BUILDING would permit
 * widening `own` to `all` while role ASSIGNMENT refused it. That divergence is
 * exactly what the shared helper exists to prevent.
 */
describe('RolesService.assertGrantable — the one comparison', () => {
  it('refuses a permission the actor does not hold at all', async () => {
    permissionsService.findById.mockResolvedValue({
      _id: permissionId,
      resourceType: 'roles',
      action: 'ManageRoles',
    } as never);

    await expect(
      service.create({ name, permissionIds: [permissionId.toString()] } as never, [
        { resourceType: 'users', action: 'Read' },
      ]),
    ).rejects.toMatchObject({ response: { code: 'ungrantablePermission' } });
  });

  it('refuses a permission stored at a wider scope than the actor holds', async () => {
    permissionsService.findById.mockResolvedValue({
      _id: permissionId,
      resourceType: 'articles',
      action: 'Update',
      scope: 'all',
    } as never);

    await expect(
      service.create({ name, permissionIds: [permissionId.toString()] } as never, [
        { resourceType: 'articles', action: 'Update', scope: 'own' },
      ]),
    ).rejects.toMatchObject({ response: { code: 'ungrantablePermission' } });
  });

  it('allows a narrower scope than the actor holds', async () => {
    permissionsService.findById.mockResolvedValue({
      _id: permissionId,
      resourceType: 'articles',
      action: 'Update',
      scope: 'own',
    } as never);

    await expect(
      service.create({ name, permissionIds: [permissionId.toString()] } as never, [
        { resourceType: 'articles', action: 'Update', scope: 'all' },
      ]),
    ).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: Run it and confirm the scope tests fail**

Run: `cd api && npm test -- --runInBand --testPathPatterns="one-comparison"`
Expected: FAIL on both scope tests — `assertGrantable` compares pairs only.

- [ ] **Step 3: Migrate `assertGrantable` onto the shared helper**

```ts
private async assertGrantable(
  permissionIds: string[],
  actorPermissions: RequiredPermission[],
): Promise<PermissionCatalogueEntry[]> {
  const resolved: PermissionCatalogueEntry[] = [];
  for (const permissionId of permissionIds) {
    const permission = await this.permissionsService.findById(permissionId);
    // An unknown id is not grantable: nothing not proven grantable is ever
    // grantable, which is what makes this fail closed.
    if (!permission || !holdsPair(actorPermissions, permission)) {
      throw new ForbiddenException({
        code: 'ungrantablePermission',
        message: 'Cannot grant a permission you do not already hold yourself.',
      });
    }
    resolved.push({
      resourceType: permission.resourceType,
      action: permission.action,
      scope: permission.scope ?? null,
    });
  }
  return resolved;
}
```

- [ ] **Step 4: Run the spec and the existing roles suites**

Run: `cd api && npm test -- --runInBand --testPathPatterns="(roles\.|refusal-codes)"`
Expected: PASS, including Batch 1's `symmetry` and `lifecycle` specs.

- [ ] **Step 5: Type-check and report** — noting that `user-authority.ts` is now the only permission comparison in the codebase, and saying so in its doc comment.

---

### Task 4: `scope` survives the resolver (Review Focus 2)

**Files:**
- Modify: `api/src/modules/platform-administration/permissions/schemas/permission.schema.ts`
- Modify: `api/src/modules/platform-administration/roles/roles.service.ts`
- Modify: `api/src/common/decorators/permissions.decorator.ts`
- Create: `api/src/modules/platform-administration/roles/roles.service.scope.spec.ts`

- [ ] **Step 1: Write the failing test — the resolver, not the helper**

```ts
/**
 * Review Focus 2. Batch 1's scope test proved `holdsPair` against a hand-made
 * object carrying `scope`, cast `as never` because the type did not have the
 * field. The real resolver constructed its pairs explicitly:
 *
 *   resolved.push({ resourceType: …, action: … })
 *
 * so `scope` was dropped on the way to the comparison, and the comparison
 * silently degraded to pair-only. This tests the path, not the helper.
 */
describe('RolesService.resolvePermissions — scope reaches the comparison', () => {
  it('carries a stored scope through to the resolved pair', async () => {
    repository.findByIds.mockResolvedValue([{ _id: roleId, permissionIds: [permissionId] }] as never);
    permissionsService.findByIds.mockResolvedValue([
      { _id: permissionId, resourceType: 'articles', action: 'Update', scope: 'own' },
    ] as never);

    const resolved = await service.resolvePermissions([roleId.toString()]);

    expect(resolved).toEqual([{ resourceType: 'articles', action: 'Update', scope: 'own' }]);
  });

  it('reports a resource with no scopes as null rather than dropping the key', async () => {
    repository.findByIds.mockResolvedValue([{ _id: roleId, permissionIds: [permissionId] }] as never);
    permissionsService.findByIds.mockResolvedValue([
      { _id: permissionId, resourceType: 'users', action: 'Read', scope: null },
    ] as never);

    expect(await service.resolvePermissions([roleId.toString()])).toEqual([
      { resourceType: 'users', action: 'Read', scope: null },
    ]);
  });

  // Two grants differing only in scope are two grants. Deduplicating on the pair
  // alone would collapse them and silently keep whichever came first.
  it('does not collapse two grants that differ only in scope', async () => {
    repository.findByIds.mockResolvedValue([
      { _id: roleId, permissionIds: [permissionId, otherPermissionId] },
    ] as never);
    permissionsService.findByIds.mockResolvedValue([
      { _id: permissionId, resourceType: 'articles', action: 'Update', scope: 'own' },
      { _id: otherPermissionId, resourceType: 'articles', action: 'Update', scope: 'all' },
    ] as never);

    expect(await service.resolvePermissions([roleId.toString()])).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd api && npm test -- --runInBand --testPathPatterns="roles.service.scope"`
Expected: FAIL — the resolved pairs have no `scope` key.

- [ ] **Step 3: Add the field, widen the type, and stop dropping it**

`permission.schema.ts`:

```ts
/** A5 — editorial content only. `null` on every administrative resource, which
 *  compares as width 0 on both sides of `holdsPair` and so is a no-op there. */
@Prop({ type: String, enum: ['own', 'all'], default: null })
scope: 'own' | 'all' | null;
```

`permissions.decorator.ts` adds `scope?: 'own' | 'all' | null` to `RequiredPermission`.

`resolvePermissions` widens its dedup key and carries the field:

```ts
// The key includes the scope: two grants differing only in scope are two
// grants, and a pair-only key would collapse them and keep whichever came
// first — which is how a role holding both `own` and `all` could resolve to
// `own`.
const key = `${permission.resourceType}:${permission.action}:${permission.scope ?? ''}`;
if (!seen.has(key)) {
  seen.add(key);
  resolved.push({
    resourceType: permission.resourceType,
    action: permission.action,
    scope: permission.scope ?? null,
  });
}
```

- [ ] **Step 4: Run the spec, then every suite that touches permission resolution**

Run: `cd api && npm test -- --runInBand --testPathPatterns="(roles\.|users\.|access-control|user-authority)"`
Expected: PASS. Batch 1's `users.service.authority.spec.ts` scope test can now drop its `as never` cast — do that, so the test exercises the real type.

- [ ] **Step 5: Type-check and report**

---

### Task 5: The five un-grantable pairs, and the Decision-4 route audit

**Files:**
- Modify: `api/src/modules/platform-administration/users/users.service.ts`
- Modify: `api/src/modules/platform-administration/roles/roles.service.ts`
- Modify: `api/src/modules/platform-administration/roles/roles.controller.ts`, `users.controller.ts`
- Modify: `api/src/common/errors/api-error-code.ts`
- Create: `api/src/common/authz/super-admin-only.spec.ts`

**Interfaces:**
- Produces: `isSuperAdminOnly(resourceType, action): boolean` in `capability-map.ts`; new error code `ungrantableCapability`.

- [ ] **Step 1: Write the failing test (Review Focus 1)**

> **Q-A decided (owner, 2026-09-27): reading account data is Super-Admin-only too.**
> The set grows from five pairs to **nine**, adding `users:Read`, `users:Export`,
> `roles:Read` and `permissions:Read`. The reason given: the users list carries
> staff email addresses and no other role needs to see it; and the only consumer
> of `permissions:Read` is role building, which is `ManageRoles`. `users:Print` is
> **not** added —
> it does not exist, because Q4 made `Print` a group grant and (see below) the
> Platform Administration group has no report resource.
>
> **Two consequences, both load-bearing:**
>
> **(1) The Platform Administration group gets NO `*Reports` pseudo-resource.**
> Q-A excludes Users & Access from `ViewReports` entirely, so there is no
> `platformReports` resource and therefore no `platformReports:Export`. That is
> what keeps `users:Export` a per-resource pair rather than a group one, and it
> makes Task 8 seed **nine** group resources, not ten. Template 6 (Executive
> Viewer) holds `ViewReports` on nine groups.
>
> **(2) Internal name resolution must stop needing `users:Read`.** Several
> screens legitimately show a person's name — who saved revision 3, the actor on
> an audit row, the approver on a review step. With `users:Read` un-grantable,
> those would break for every non-Super-Admin. So resolution moves to a narrow
> projection that needs no permission at all: `{ id, displayName }`, and nothing
> else — no email, no roles, no account status. `UsersService.findNamesByIds`
> already exists and already returns only names; it gains a test asserting the
> projection cannot widen.
>
> **(3) Answered 2026-09-27, after being raised rather than guessed.**
> `permissions:Read` becomes un-grantable — its only consumer is role building,
> which is `ManageRoles`, so leaving it grantable would let a role list every
> permission while unable to see the roles holding them. And
> **`permissions:Create` leaves the catalogue entirely**, with `POST /permissions`
> (Task 1): the catalogue is derived from source, `seed`/`sync` are its only
> writers, and a route that mints permission rows at runtime can only ever create
> rows no decorator reads.

```ts
/**
 * Owner decision 4 (2026-09-26) and Q-A (2026-09-27): account and role
 * administration — and reading account data — are exclusive to the Super Admin,
 * like `ManageSecuritySettings`. Nine pairs may be held by the seeded role and
 * by no other.
 *
 * The reason is not that they are dangerous in the abstract — it is that ADR-0104's
 * two rules made a delegated account administrator nearly inert (they could only
 * hand out roles weaker than themselves), so the grant promised far more than it
 * could do. Making that explicit is more honest than a capability that quietly
 * refuses most of its own name.
 */
describe('the un-grantable pairs', () => {
  const RESERVED = [
    ['users', 'Create'],
    ['users', 'Update'],
    ['users', 'AssignRoles'],
    // Q-A: the users list carries staff email addresses, and no other role needs
    // to see or extract it.
    ['users', 'Read'],
    ['users', 'Export'],
    ['roles', 'ManageRoles'],
    ['roles', 'Read'],
    // Owner decision 2026-09-27: the only consumer is role building, which is
    // `ManageRoles` — Super Admin only. `permissions:Create` is not here because
    // it no longer exists (Task 1): the catalogue is code.
    ['permissions', 'Read'],
    ['securitySettings', 'ManageSecuritySettings'],
  ] as const;

  it('is exactly these nine, and no others', () => {
    const declared = CAPABILITY_MAP.flatMap((entry) =>
      entry.superAdminOnly.map((action) => [entry.resourceType, action] as const),
    );
    expect(declared.map(([r, a]) => `${r}:${a}`).sort()).toEqual(
      RESERVED.map(([r, a]) => `${r}:${a}`).sort(),
    );
  });

  it.each(RESERVED)('refuses %s:%s when a role is built with it', async (resourceType, action) => {
    permissionsService.findById.mockResolvedValue({ _id: permissionId, resourceType, action } as never);

    await expect(
      rolesService.create({ name, permissionIds: [permissionId.toString()] } as never, EVERYTHING),
    ).rejects.toMatchObject({ response: { code: 'ungrantableCapability' } });
  });

  it.each(RESERVED)('refuses %s:%s when a role holding it is handed out', async (resourceType, action) => {
    rolesService.resolvePermissionsForRoles.mockResolvedValue([{ resourceType, action }] as never);

    await expect(
      usersService.assignRoles(targetId, [roleId], superAdminActor),
    ).rejects.toMatchObject({ response: { code: 'ungrantableCapability' } });
  });

  // The refusal is about GRANTING, not about holding. The seeded role holds all
  // five, and the guard must let its holder use them.
  it('leaves the seeded Super Admin role holding all five', () => {
    const catalogue = new Set(PERMISSION_CATALOGUE.map((e) => `${e.resourceType}:${e.action}`));
    for (const [resourceType, action] of RESERVED) {
      expect(catalogue.has(`${resourceType}:${action}`)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd api && npm test -- --runInBand --testPathPatterns="super-admin-only"`
Expected: FAIL — `ungrantableCapability` does not exist and nothing refuses these pairs.

- [ ] **Step 3: Add the code and the refusal**

`ungrantableCapability` joins `API_ECODES`, admin-write's group and `FROM_API_CODE`,
and both message catalogues:
- EN: "That capability is reserved to a Super Admin and cannot be granted to a role."
- AR: "هذه الصلاحية محجوزة للمسؤول العام ولا يمكن منحها لأي دور."

`isSuperAdminOnly` is checked in **two** places, before the superset comparison in
each: `RolesService.assertGrantable` (building) and `UsersService.assertAssignableByActor`
(handing out). Before, not after, because "this can never be granted" is a
stronger and simpler statement than "you do not hold it".

- [ ] **Step 4: Run and confirm green**

Run: `cd api && npm test -- --runInBand --testPathPatterns="(super-admin-only|roles\.|users\.)"`

- [ ] **Step 5: Re-point the routes the Decision-4 audit found mismatched**

The audit (reported to the owner with this plan) found four:

| Route | Guard today | Becomes |
|---|---|---|
| `PATCH /users/:id/roles` | `users:Update` | `users:AssignRoles` |
| `POST /roles` | `roles:Create` | `roles:ManageRoles` |
| `PATCH /roles/:id/name` · `PATCH /roles/:id/permissions` | `roles:Update` | `roles:ManageRoles` |
| `DELETE /roles/:id` | `roles:Delete` | `roles:ManageRoles` |

`roles:Create`, `roles:Update` and `roles:Delete` leave the catalogue — `ManageRoles`
replaces all three, because "may create a role but not edit it" is not a
distinction the federation has ever needed and three pairs are three chances for a
role to hold two of them.

- [ ] **Step 6: Pin the narrow name projection (Q-A consequence 2)**

```ts
/**
 * Showing a person's name must not require `users:Read`, which is now
 * un-grantable — otherwise "who saved version 3" breaks on every screen for
 * everyone but a Super Admin.
 *
 * The projection is the guarantee: a name and an id, and no third field. A test
 * rather than a comment, because the failure mode is somebody widening it later
 * for convenience and nobody noticing that an email address just became visible
 * to every reviewer.
 */
it('returns exactly the two permitted keys, and no third', async () => {
  repository.findNamesByIds.mockResolvedValue([
    { _id: userId, displayName: { en: 'Sara', ar: 'سارة' } },
  ] as never);

  const resolved = await service.findNamesByIds([userId.toString()]);

  // The assertion is on the KEY SET, not on the absence of an "@" or of the word
  // "Active" — which was the weaker first draft. A substring check passes the
  // moment somebody adds a field whose value happens not to contain those
  // characters, which is most fields.
  expect(Object.keys(resolved[0]).sort()).toEqual(['displayName', 'id']);
});

it('narrows in the query, not after the read', async () => {
  await service.findNamesByIds([userId.toString()]);

  // An explicit `select` is what makes the guarantee: a filter applied after the
  // documents arrive means the email was fetched, was in memory, and was one
  // careless log line away from leaving the process.
  expect(repository.findNamesByIds).toHaveBeenCalledWith([userId.toString()]);
  expect(selectSpy).toHaveBeenCalledWith('_id name');
});

it('omits an id it cannot resolve rather than failing the whole listing', async () => {
  repository.findByIds.mockResolvedValue([] as never);

  expect((await service.findNamesByIds([userId.toString()])).size).toBe(0);
});
```

- [ ] **Step 7: Run the whole platform-administration set, type-check, report**

Run: `cd api && npm test -- --runInBand --testPathPatterns="platform-administration" && npx tsc --noEmit`

---

### Task 6: `Update` for the 27 resources that never had it

**Files:**
- Modify: 27 controllers and 27 services under `api/src/modules/`
- Create: one `update-*.dto.ts` per resource
- Create: `api/src/common/authz/partial-update.spec.ts`

**The 30 candidates** (spec Appendix B), of which three are excluded below, leaving **27** — the number the catalogue spec now measures as dead `Update` pairs: `ageCategories` · `athleteCoachHistory` · `athleteGuardianRelationships` · `athleteNationalTeamHistory` · `athleteProfiles` · `athletes` · `clubs` · `clubTeams` · `coaches` · `committees` · `countries` · `disciplines` · `documents` · `electionCycles` · `federation` · `federationAppointments` · `federationPersonnel` · `governanceDocuments` · `mediaAssets` · `navigationMenus` · `notifications` · `officialAssignments` · `officialProfiles` · `officials` · `pages` · `permissions` · `revisions` · `venues` · `workflowDefinitions` · `workflowSteps`

**Owner decision (spec Q1, option 3; confirmed as Q-C):** `Update` goes to what
humans edit, not to append-only system records. **Excluded, and stated rather than
inferred:** `revisions` and `permissions` are immutable by nature — a revision
that can be edited is not a revision — and `notifications` is write-once. That
leaves **27**.

> **Q-C's condition (owner, 2026-09-27).** Marking your *own* notification read
> must not need `notifications:Update`. It is an act on the `own` scope, verified
> by the notification belonging to the caller.
>
> **Already true, and it gets a test.** `PATCH /notifications/:id/read` carries no
> `@RequirePermission` (it is one of the six authenticated-but-unpermissioned
> routes Batch 1 enumerated), and `NotificationsService.markRead` passes the
> caller's id to `markReadForRecipient`, which scopes the update in the
> repository rather than in the service. So there is nothing to change — but the
> negative test the owner asked for does not exist, and that is the part worth
> having.

- [ ] **Step 1: Write the failing test for the ES2023 trap (Review Focus 4)**

```ts
/**
 * Under `target: ES2023` every declared property exists on a class instance —
 * as `undefined` when it was not sent — and the global ValidationPipe runs with
 * `transform: true`, so what reaches a service IS a class instance. A merge that
 * spreads the DTO therefore writes `undefined` over fields nobody mentioned.
 *
 * This already cost this codebase a bug: `updatePreferences` used the `in`
 * operator, which was always true, so setting the theme wiped the language on
 * every call. The unit test missed it by passing a plain object literal, which
 * does not have the absent keys.
 */
describe('partial update', () => {
  it('leaves a field the request never mentioned untouched', async () => {
    const dto = Object.assign(new UpdateFederationPersonnelDto(), { status: 'Inactive' });

    await service.update(id, dto);

    expect(Object.keys(repository.updateById.mock.calls[0][1])).toEqual(['status']);
  });

  it('applies an explicit null, which is how a value is cleared', async () => {
    const dto = Object.assign(new UpdateFederationPersonnelDto(), { shortBio: null });

    await service.update(id, dto);

    expect(repository.updateById.mock.calls[0][1]).toEqual({ shortBio: null });
  });

  it('writes nothing at all for an empty body', async () => {
    await service.update(id, new UpdateFederationPersonnelDto());

    expect(repository.updateById).toHaveBeenCalledWith(id, {});
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd api && npm test -- --runInBand --testPathPatterns="partial-update"`

- [ ] **Step 3: Write the shared builder, once**

```ts
/**
 * The update document for a partial DTO: only the keys actually supplied.
 *
 * Tests `!== undefined` rather than the `in` operator, for the reason recorded
 * in `users.service.ts`: under ES2023 `in` is always true for a declared
 * property, so `in` would include every field and write `undefined` over the
 * ones nobody sent.
 */
export const partialUpdate = <T extends object>(dto: T): Partial<T> =>
  Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined)) as Partial<T>;
```

- [ ] **Step 4: Add `@Patch(':id')` and an `Update*Dto` per resource**

Pattern, shown once and repeated for the 27:

```ts
@Patch(':id')
@RequirePermission('federationPersonnel', 'Update')
update(@Param('id') id: string, @Body() dto: UpdateFederationPersonnelDto) {
  return this.service.update(id, dto);
}
```

The DTO is the create DTO with every field optional — `PartialType` from
`@nestjs/swagger`, which the project already depends on, so no new package.
A workflow-governed resource routes its update through a new revision rather than
writing the row (spec F3); those are `committees`, `documents`,
`governanceDocuments` and `federationPersonnel`, and their update calls
`RevisionsService` exactly as the article path does.

- [ ] **Step 4b: Pin the notification `own` scope (Q-C's condition)**

```ts
/**
 * Marking a notification read is an act on your own record, so it needs no
 * permission — and must therefore be scoped by ownership, or it would let any
 * authenticated user touch anybody's notifications.
 *
 * The scoping lives in the repository, not the service, so a future caller that
 * forgets to pass the recipient cannot widen it.
 */
describe('notifications — the own scope', () => {
  it('marks the caller own notification read', async () => {
    repository.markReadForRecipient.mockResolvedValue({ _id: notificationId } as never);

    await expect(service.markRead(notificationId.toString(), recipientId)).resolves.toBeDefined();
    expect(repository.markReadForRecipient).toHaveBeenCalledWith(
      notificationId.toString(),
      new Types.ObjectId(recipientId),
    );
  });

  // The negative case. The repository filter is what refuses it, so the service
  // gets null back rather than an error — and the route answers 404, not 403,
  // because "somebody else's notification" must not be distinguishable from
  // "no such notification".
  it('cannot mark somebody else notification read', async () => {
    repository.markReadForRecipient.mockResolvedValue(null as never);

    expect(await service.markRead(notificationId.toString(), otherUserId)).toBeNull();
  });
});
```

- [ ] **Step 5: Run the affected module suites and the catalogue spec**

Run: `cd api && npm test -- --runInBand --testPathPatterns="(partial-update|permission-catalogue|federation|people-organizations|athletics)"`
Expected: PASS, and the catalogue's dead-pair list shrinks by 27 `Update` rows.

- [ ] **Step 6: Type-check and report** — listing the three excluded resources and why.

---

### Task 7: `Archive`, `Restore` and `PermanentDelete` routes

> **`mediaAssets` becomes `purgeable` (owner decision 2026-09-27, amending Q6).**
> Deliberate, and for a reason Q6 did not weigh: the destruction already exists and
> is already needed — storage quota, and withdrawing an image whose rights were
> revoked. `contactMessages` joins it. **Two purgeable resources; a third needs the
> owner's approval.**
>
> **Four mandatory conditions on `mediaAssets:PermanentDelete`:**
>
> 1. **Archived first.** Already enforced — `MediaAssetsService.purge` refuses a
>    live asset with "Archive it before purging, so nothing published loses its
>    image without warning."
> 2. **No reference anywhere.** Refusal returns the list of referrers.
> 3. **Step-up** — fail-closed as `mfa_step_up_required` until Batch 5 (Q-D).
> 4. **An audit row naming the asset and the references that were checked.**
>
> **Storage before the row, and the row survives a storage failure.** Already the
> order in `purge`, and the reason is recorded there: reversed, a provider failure
> leaves a file nothing points at, consuming quota unseen. The test the owner asked
> for pins it.
>
> **Condition 2 cannot be hand-written, and this is the measured reason.**
> `grep -rn "ref: 'MediaAsset'"` finds **41 fields across 25 schema files** — and
> that is only the top-level `ref` declarations. A hand-written check would be a
> list somebody must remember to extend, and the day a 42nd field is added the
> check silently stops being a check and a referenced file gets destroyed. So the
> referrer map is **derived from Mongoose's own schema metadata at runtime**:
> iterate `connection.models`, read each schema's paths for
> `options.ref === 'MediaAsset'`, and query those. A new field is then covered
> because it exists, not because anybody remembered it.
>
> **One class of reference metadata cannot find**, and it is the one the owner
> named explicitly: a **published revision**. `revisions.snapshotData` is a frozen
> copy of a record, so a `photoId` inside it is embedded JSON, not a `ref` — so it
> needs its own targeted scan. Without it, purging an asset still shown by a live
> publication would succeed.
>
> **Written as a standalone function** (`findMediaAssetReferrers`), because the
> unused-media report reuses it and a second copy would drift from the first.
>
> ---
>
> ### The four ref shapes (owner requirement 1), measured
>
> | Shape | In the codebase today | Must the function handle it? |
> |---|---|---|
> | `options.ref` direct | **41 fields / 25 files**, of which many are inside embedded schemas | yes — the bulk of it |
> | **Subdocuments and their arrays, any depth** | **live now**: `hero-page`, `page-seo`, `about-sections`, `sponsor-strip`, `contact-us-page` all hold MediaAsset refs inside embedded schemas | **yes — required today, not hypothetical** |
> | Array refs (`caster` / `$embeddedSchemaType`) | **7 array refs exist**, none pointing at MediaAsset yet | yes — a future `photoIds: [{ type, ref: 'MediaAsset' }]` would otherwise be invisible |
> | `refPath` (dynamic) | **0** | yes, cheap, with a synthetic-schema test |
> | Discriminators | **0** | yes, same |
>
> The test builds a throwaway schema carrying all five shapes and asserts the
> walk finds every one — so the three that do not exist yet cannot be quietly
> unsupported the day somebody uses them.
>
> ### Non-`ref` usages (owner requirement 2), measured
>
> | Class | Found | Verdict |
> |---|---|---|
> | `ObjectId` with **no** `ref` | **21 fields** | **None media-named.** All are deliberate polymorphic keys (`entityId`, `targetId`, `ownerId`) or page ids. Zero hidden media references. |
> | String fields with a media-suggestive name | **19 fields** | **None stores a MediaAsset's `url` or `storageKey`.** Every one is an external link (`socialLink.url`, `heroCta.url`, `navigationItems.url`, `contactUsPage.googleMapsUrl`/`directionsUrl`, `liveStream.url`, `video.externalUrl`, `article.sourceUrl`), a closed icon enum (`iconKey`), an enum (`mediaType`, `ltrImageMode`), a person's name (`photographer`), the asset's own `file.url`, or `documentFileVariant.url`/`filename` — which is the **documents** upload path, a separate record with no `storageKey`. |
> | Rich text able to embed `<img src>` | **2 fields** (`article.body`, `presidentMessagePage.body`) | **Structurally impossible.** `RICH_TEXT_NODES` is ten nodes — `doc, paragraph, text, heading, bulletList, orderedList, listItem, blockquote, horizontalRule, hardBreak` — and **no `image` node**, so an embed is refused by validation, not merely discouraged. |
>
> **So the measured answer to requirement 2 is zero**, with one caveat found while
> measuring and reported rather than dismissed:
>
> **A pasted link can point at a storage URL — and the owner accepted this into
> condition 2 (2026-09-27).** `RICH_TEXT_MARKS` includes `link` and
> `RICH_TEXT_LINK_SCHEMES` allows `http:`/`https:`, so an editor can paste a
> Cloudinary URL into a body; and ten plain string fields take a hand-pasted link
> too. Purging then turns a published link into a 404.
>
> ### The storageKey scan — the fields it searches
>
> Measured: **12** string URL fields exist, of which **10 are hand-pasted** and
> two are not. Plus the two rich-text bodies.
>
> | # | Field | Collection | Why it is scanned |
> |--:|---|---|---|
> | 1 | `body` (rich text) | `articles` | a `link` mark can hold any http(s) URL |
> | 2 | `body` (rich text) | `presidentMessagePage` | same |
> | 3 | `url` | `socialLink` (**embedded in many**) | editor-pasted |
> | 4 | `url` | `heroCta` | editor-pasted |
> | 5 | `url` | `navigationItems` | editor-pasted |
> | 6 | `ctaUrl` | `pageSections` | editor-pasted |
> | 7 | **`href`** | `aboutSections` | editor-pasted — **found by this measurement, not on the earlier list** |
> | 8 | `directionsUrl` | `contactUsPage` | see below |
> | 9 | `googleMapsUrl` | `contactUsPage` | see below |
> | 10 | `url` | `liveStream` | editor-pasted |
> | 11 | `externalUrl` | `videos` | editor-pasted |
> | 12 | `sourceUrl` | `articles` | editor-pasted |
>
> **The two maps fields ARE scanned, and that is the measurement deciding it.**
> The owner's condition was to exclude them *only if* validation restricts them to
> a maps domain. It does not: `upsert-contact-us-page.dto.ts:128` and `:157` carry
> **`@IsString()` alone** — not even `@IsUrl()`. So the condition is unmet and they
> are in.
>
> **Left out of the scan — two, each with its reason:**
>
> | Field | Why not |
> |---|---|
> | `documentFileVariant.url` | Written by the documents upload path, never pasted by an editor, and a different storage record with no `storageKey`. |
> | `mediaFile.url` | The asset's **own** file. It is the thing being deleted, not a reference to it — scanning it would make every asset reference itself and nothing would ever be purgeable. |
>
> **Matched on `storageKey`, escaped, never on the whole URL.** Cloudinary puts
> transformations and a version into the delivered URL
> (`/upload/w_800,f_auto/v1712/<storageKey>.jpg`), so two links to the same file
> differ as strings. The key is the stable part. It is regex-escaped before it
> reaches a `$regex`, or a crafted key would alter the query.
>
> **Each referrer carries its kind** — `ref` | `richTextLink` | `urlField` — in the
> same refusal list, so an administrator reading it knows whether to fix a field or
> edit a body.
>
> **Fail-closed covers this scan too.** A search that throws refuses the deletion.
>
> **Out of scope (owner):** forbidding storage URLs in a `link` mark at validation
> time. Not now.
>
> **No schema change is proposed.** Turning any string field into a `ref` would be
> a schema change, which §7 reserves to the owner — and the measurement found none
> that needs it.
>
> ### Fail-closed (owner requirement, non-negotiable)
>
> If any part of the reference scan cannot run — a collection missing, a query
> throwing — **the deletion is refused**. There is no path on which "the scan
> failed" becomes "no references found". The refusal names what could not be
> checked.
>
> ### The future guard (owner requirement 3)
>
> A test that fails when somebody adds a picture field the walk cannot follow. It
> flags any field whose name contains `photo`, `image`, `logo`, `cover`,
> `thumbnail`, `media` or `asset` and which is either a `String` or an `ObjectId`
> **without** a `ref` — unless it is in an exception list, where each entry
> carries its reason.
>
> The point is not to forbid such a field. It is to make adding one a decision
> somebody makes on purpose, in a file a reviewer reads, instead of a silent hole
> in an irreversible operation.
>
> **The guard extends to the scan's own coverage (owner, 2026-09-27).** It also
> fails when a **new rich-text field** or a **new free URL field** appears that is
> neither in the scan list nor in the exception list — so the scan cannot silently
> fall behind the schemas it is supposed to cover:
>
> ```ts
> it('fails when a new URL or rich-text field is neither scanned nor excused', () => {
>   const declared = new Set([...SCANNED_FIELDS, ...SCAN_EXCLUSIONS].map((f) => `${f.collection}.${f.path}`));
>   const live = urlAndRichTextFieldsIn(connection).map((f) => `${f.collection}.${f.path}`);
>
>   expect(live.filter((field) => !declared.has(field))).toEqual([]);
> });
> ```
>
> **The exception list, measured from today's schemas** (every entry a false
> positive of the name rule, with why):
>
> | Field | Where | Why it is not a media reference |
> |---|---|---|
> | `mediaType` | `hero-slides` | A closed enum (`image` \| `video`), not a file |
> | `ltrImageMode` | `hero-slides` | A closed enum (`shared` \| `separate`) |
> | `iconKey` × 4 | `content-block` ×2, `discipline`, `plan-list-items` | A closed twelve-key icon enum (ADR-0069), resolved to an SVG in the frontend — no stored file |
> | `photographer` | `media-file` | A person's name, a credit line |
> | `url`, `filename` | `document-file-variant` | The **documents** upload path: its own record, its own storage, no `storageKey`, never a MediaAsset |
> | `url` | `media-file` | The asset's own file — the thing being deleted, not a reference to it |
>
> ### Backlog
>
> **Kept:** the "unused media" report — archived assets with no referrer, older
> than a Super-Admin-set period, with their sizes — consuming
> `findMediaAssetReferrers`, and permitting a one-file purge from each row under
> the same four conditions.
>
> **Removed from the backlog by owner decision 2026-09-27, and recorded in the ADR
> as a decision rather than a deferral:** bulk permanent deletion. It will not be
> built. It would be revisited only if storage volume becomes a real problem, and
> the reason for refusing it now is that one step-up authorising many irreversible
> destructions is a different and worse thing than one step-up per destruction.
>
> **Why single-file purge stays in scope:** the route exists, and it is needed for
> the legal cases — a guardian asking for their child's photograph to be removed,
> or an image whose rights were withdrawn. Archiving only hides the picture from
> the site; the file keeps a public URL on the storage provider.

**Files:**
- Create: `api/src/common/authz/archive-restore.ts` (the shared service helpers)
- Modify: the 47 controllers that already have a `Delete` route
- Create: `api/src/common/authz/archive-restore.spec.ts`

- [ ] **Step 1: Write the failing test (Review Focus 3)**

```ts
describe('archive and restore', () => {
  it('restores a row by clearing archivedAt and archivedBy together', async () => {
    await service.restore(id, actorId);

    expect(repository.updateById).toHaveBeenCalledWith(id, { archivedAt: null, archivedBy: null });
  });

  // Archiving twice must not move the date: the first archive is when it
  // happened, and an idempotent call should not rewrite history.
  it('leaves the original archive date alone on a second archive', async () => {
    repository.findByIdIncludingArchived.mockResolvedValue({ archivedAt: new Date('2026-01-01') } as never);

    await service.archive(id, actorId);

    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('refuses PermanentDelete on a resource the map does not mark purgeable', async () => {
    await expect(service.permanentDelete('committees', id, actor)).rejects.toMatchObject({
      response: { code: 'notPurgeable' },
    });
  });
});

/**
 * The referrer scan, derived from schema metadata rather than written by hand.
 *
 * 41 `ref: 'MediaAsset'` fields across 25 schema files today. A hand-written list
 * is a list somebody must remember to extend, and the day a 42nd field is added
 * the check silently stops being a check — and a referenced file is destroyed.
 */
describe('findMediaAssetReferrers', () => {
  it('finds every collection that declares a MediaAsset reference, without a hand-written list', async () => {
    const paths = referencePathsFor(connection, 'MediaAsset');

    // Not an exact number, which would fail on every legitimate new field. A
    // floor, because the failure being guarded is the map coming back tiny or
    // empty after a refactor.
    expect(paths.length).toBeGreaterThanOrEqual(41);
    expect(paths.some((p) => p.collection === 'federationPersonnel' && p.path === 'photoId')).toBe(true);
  });

  it('reports each referrer so the refusal can name them', async () => {
    heroSlides.insertMany([{ imageId: assetId, title: { en: 'A', ar: 'أ' } }]);

    const referrers = await findMediaAssetReferrers(connection, assetId);

    expect(referrers).toEqual([{ collection: 'heroSlides', path: 'imageId', count: 1 }]);
  });

  // The class metadata cannot see, and the one the owner named. `snapshotData` is
  // a frozen copy of a record, so a photoId inside it is embedded JSON and not a
  // `ref` — invisible to the schema walk.
  it('finds an id embedded in a published revision snapshot', async () => {
    await revisions.insertMany([{ entityType: 'articles', snapshotData: { featuredImageId: assetId } }]);
    await publications.insertMany({ entityType: 'articles', status: 'Live', revisionId });

    const referrers = await findMediaAssetReferrers(connection, assetId);

    expect(referrers.some((r) => r.collection === 'revisions')).toBe(true);
  });

  it('answers empty for an asset nothing points at', async () => {
    expect(await findMediaAssetReferrers(connection, assetId)).toEqual([]);
  });

  it('finds the storageKey inside a rich-text link mark', async () => {
    await articles.insertMany([
      {
        title: { en: 'A', ar: 'أ' },
        body: {
          en: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'the poster',
                    marks: [{ type: 'link', attrs: { href: `https://res.cloudinary.com/x/image/upload/v1712/${storageKey}.jpg` } }],
                  },
                ],
              },
            ],
          },
          ar: { type: 'doc', content: [] },
        },
      },
    ]);

    const referrers = await findMediaAssetReferrers(connection, assetId);

    expect(referrers).toEqual([
      expect.objectContaining({ collection: 'articles', path: 'body', kind: 'richTextLink' }),
    ]);
  });

  it('finds the storageKey pasted into a plain URL field', async () => {
    await heroSlides.insertMany([
      { primaryCta: { url: `https://res.cloudinary.com/x/image/upload/${storageKey}.jpg`, label: { en: 'x', ar: 'x' } } },
    ]);

    expect(await findMediaAssetReferrers(connection, assetId)).toEqual([
      expect.objectContaining({ path: 'primaryCta.url', kind: 'urlField' }),
    ]);
  });

  /**
   * Cloudinary puts transformations and a version into the delivered URL, so two
   * links to the same file are different strings. Matching the whole URL would
   * miss every transformed one — which is most of them, since the frontend asks
   * for `f_auto` and a width.
   */
  it('matches a URL carrying transformations and a version', async () => {
    await heroSlides.insertMany([
      { primaryCta: { url: `https://res.cloudinary.com/x/image/upload/w_800,f_auto,q_auto/v1712345/${storageKey}.webp`, label: { en: 'x', ar: 'x' } } },
    ]);

    expect(await findMediaAssetReferrers(connection, assetId)).toHaveLength(1);
  });

  // A storageKey is provider-generated, but it reaches a `$regex` and must not be
  // able to alter the query it lands in.
  it('escapes the storageKey before it reaches the query', async () => {
    const tricky = 'folder/a.b+c(d)';
    await heroSlides.insertMany([
      { primaryCta: { url: `https://res.cloudinary.com/x/upload/${tricky}.jpg`, label: { en: 'x', ar: 'x' } } },
    ]);

    expect(await findMediaAssetReferrers(connection, assetIdFor(tricky))).toHaveLength(1);
  });

  it('does not report the asset own file as a reference to itself', async () => {
    // `mediaFile.url` contains the storageKey by definition. Scanning it would
    // make every asset self-referencing and nothing would ever be purgeable.
    expect(await findMediaAssetReferrers(connection, assetId)).toEqual([]);
  });

  /**
   * All five ref shapes in one throwaway schema. Three of them — array casters,
   * `refPath` and discriminators — have no MediaAsset user in the codebase today,
   * which is exactly why they are tested: an unsupported shape is invisible until
   * somebody uses it, and by then the walk is silently incomplete.
   */
  it('finds a reference in every shape Mongoose can express it', () => {
    const probe = new Schema({
      direct: { type: Types.ObjectId, ref: 'MediaAsset' },
      inArray: [{ type: Types.ObjectId, ref: 'MediaAsset' }],
      nested: new Schema({ deep: { type: Types.ObjectId, ref: 'MediaAsset' } }),
      nestedArray: [new Schema({ deeper: { type: Types.ObjectId, ref: 'MediaAsset' } })],
      dynamic: { type: Types.ObjectId, refPath: 'dynamicModel' },
      dynamicModel: { type: String },
    });

    const paths = referencePathsIn(probe, 'MediaAsset').map((p) => p.path).sort();

    expect(paths).toEqual(['direct', 'inArray', 'nested.deep', 'nestedArray.deeper']);
    // `refPath` cannot be resolved statically — it names a field holding the
    // model name — so it is reported as a path needing a runtime check rather
    // than silently dropped.
    expect(referencePathsIn(probe, 'MediaAsset').some((p) => p.dynamic)).toBe(false);
    expect(dynamicReferencePathsIn(probe).map((p) => p.path)).toEqual(['dynamic']);
  });
});

/**
 * Fail-closed. "The scan could not run" must never become "no references found",
 * because the action it guards is irreversible.
 */
describe('mediaAssets purge — when the scan cannot run', () => {
  it('refuses when a referrer query throws, naming what could not be checked', async () => {
    referrers.mockRejectedValue(new Error('collection unavailable') as never);

    await expect(service.permanentDelete('mediaAssets', id, actor)).rejects.toMatchObject({
      response: { code: 'referenceCheckFailed' },
    });
    expect(storage.destroy).not.toHaveBeenCalled();
    expect(repository.hardDelete).not.toHaveBeenCalled();
  });

  it('refuses when the revision snapshot scan throws', async () => {
    revisionScan.mockRejectedValue(new Error('down') as never);

    await expect(service.permanentDelete('mediaAssets', id, actor)).rejects.toMatchObject({
      response: { code: 'referenceCheckFailed' },
    });
  });
});

describe('mediaAssets purge', () => {
  it('refuses while anything still references it, naming the referrers', async () => {
    referrers.mockResolvedValue([{ collection: 'heroSlides', path: 'imageId', count: 2 }] as never);

    await expect(service.permanentDelete('mediaAssets', id, actor)).rejects.toMatchObject({
      response: {
        code: 'stillReferenced',
        referrers: [{ collection: 'heroSlides', path: 'imageId', count: 2 }],
      },
    });
  });

  it('refuses an asset that has not been archived first', async () => {
    repository.findIncludingArchived.mockResolvedValue({ archivedAt: null } as never);

    await expect(service.permanentDelete('mediaAssets', id, actor)).rejects.toMatchObject({
      response: { code: 'conflict' },
    });
  });

  // The order is the point, and its own comment in `purge` gives the reason:
  // reversed, a provider failure leaves a file nothing points at, consuming
  // quota unseen.
  it('keeps the row when the storage destroy fails', async () => {
    storage.destroy.mockRejectedValue(new Error('provider down') as never);

    await expect(service.permanentDelete('mediaAssets', id, actor)).rejects.toThrow();
    expect(repository.hardDelete).not.toHaveBeenCalled();
  });

  it('destroys the object before removing the row', async () => {
    const order: string[] = [];
    storage.destroy.mockImplementation(async () => void order.push('storage'));
    repository.hardDelete.mockImplementation(async () => void order.push('row'));

    await service.permanentDelete('mediaAssets', id, actor);

    expect(order).toEqual(['storage', 'row']);
  });

  it('audits the asset and the references it checked', async () => {
    await service.permanentDelete('mediaAssets', id, actor);

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'HardDelete',
        entityType: 'mediaAssets',
        newValue: expect.objectContaining({ referencesChecked: expect.any(Number) }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd api && npm test -- --runInBand --testPathPatterns="archive-restore"`

- [ ] **Step 3: Implement the trio, then add the routes**

Three new error codes (`notPurgeable`, `stillPublished`, `stillReferenced`) join all
three vocabularies. `PermanentDelete` requires step-up, which does not exist until
Batch 5 — so the route is **declared with the capability and refuses with
`mfa_step_up_required` until Batch 5 supplies the verification**, rather than
shipping an irreversible action with one of its two guards missing.

- [ ] **Step 4: Run, type-check, report**

Run: `cd api && npm test -- --runInBand --testPathPatterns="(archive-restore|permission-catalogue)" && npx tsc --noEmit`

---

### Task 8: The nine group pseudo-resources

**Files:**
- Modify: `api/src/common/constants/permission-resources.ts`
- Create: `api/src/modules/platform-administration/reports/reports.controller.ts` + module
- Create: `api/src/common/authz/product-group.ts`
- Create: `api/src/modules/platform-administration/reports/reports.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('group report resources', () => {
  // Nine, not ten: Q-A excludes Users & Access from ViewReports entirely, so the
  // Platform Administration group has no report resource — which is also what
  // keeps `users:Export` a per-resource pair rather than a group one.
  it('declares one pseudo-resource per reportable product group', () => {
    expect(GROUP_REPORT_RESOURCES).toHaveLength(9);
  });

  it('has no report resource for Platform Administration', () => {
    expect(GROUP_REPORT_RESOURCES.map((r) => r.group)).not.toContain('platform-administration');
  });

  it('covers every group except the one deliberately excluded', () => {
    const groups = new Set(CAPABILITY_MAP.map((entry) => entry.group));
    const covered = new Set(GROUP_REPORT_RESOURCES.map((entry) => entry.group));
    const missing = [...groups].filter((group) => !covered.has(group));
    expect(missing).toEqual(['platform-administration']);
  });

  it('gives a group resource exactly ViewReports, Export and Print', () => {
    for (const resource of GROUP_REPORT_RESOURCES) {
      expect(capabilityFor(resource.resourceType)?.actions).toEqual(['ViewReports', 'Export', 'Print']);
    }
  });

  it('refuses a report the caller has no ViewReports for', async () => {
    await expect(controller.forGroup('governance', actorWithout)).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Run, implement, run** — the nine resources, the `ProductGroup` union reused from `resource-domains.ts`'s ten domains (so the reports grouping and the role screen's grouping cannot drift), and `GET /reports/:group` behind `<group>Reports:ViewReports`. The report bodies themselves are Batch 6a; this task lands the resources, the routes and the guard so the catalogue's pairs are all guarded.

- [ ] **Step 3: Type-check and report**

---

### Task 9: Catalogue closure

- [ ] **Step 1: Run the catalogue spec and confirm the dead-pair list is empty**

Run: `cd api && npm test -- --runInBand --testPathPatterns="(permission-catalogue|permission-resources|capability-map)"`
Expected: PASS all three directions with no dead pairs and no missing decorators.

- [ ] **Step 2: Run the whole platform-administration and workflow sets**

Run: `cd api && npm test -- --runInBand --testPathPatterns="(platform-administration|workflow)" && npx tsc --noEmit`

- [ ] **Step 3: Write the run order for the owner**

`check-permission-duplicates` (new, reports only) → `migrate-delete-to-archive` →
`sync-permission-catalogue`. In that order: the sync upserts on the
`(resourceType, action)` pair, so running it before the rename inserts 47 new
`Archive` rows and orphans 47 `Delete` rows that every role still points at.

- [ ] **Step 4: Report**

---


---

### Task 10: The unused-media report (owner decision 2026-09-27 — out of the backlog, built now)

**Files:**
- Create: `api/src/modules/media-center/media-assets/unused-media.service.ts`
- Create: `api/src/modules/media-center/media-assets/unused-media.service.spec.ts`
- Create: `api/src/modules/media-center/media-assets/dto/unused-media-response.dto.ts`
- Modify: `api/src/modules/media-center/media-assets/media-assets.controller.ts` (`GET /media-assets/unused`)
- Modify: `api/src/common/authz/media-referrers.ts` (the batch sibling)

**Interfaces:**
- Consumes: `findMediaAssetReferrers`, and the field map behind it, from Task 7.
- Produces: `findReferencedMediaAssetIds(connection, candidateIds): Promise<Set<string>>` — the batch form; `UnusedMediaService.report({ olderThanDays, skip, limit })`.

> **Measured before designing (owner asked):** **the file size IS stored** —
> `MediaFile.size` is `@Prop({ type: Number, required: true })`. So the size column
> and the "space recoverable" total need **no schema change**.

- [ ] **Step 1: Write the failing test**

```ts
describe('UnusedMediaService.report', () => {
  it('lists only archived assets with no referrer, older than the window', async () => {
    // Three candidates: one referenced, one too recent, one genuinely unused.
    const report = await service.report({ olderThanDays: 90, skip: 0, limit: 20 });

    expect(report.items.map((item) => item.id)).toEqual([unusedId.toString()]);
  });

  it('carries what the row needs: name, size, when it was archived and by whom', async () => {
    const [row] = (await service.report({ olderThanDays: 90, skip: 0, limit: 20 })).items;

    expect(Object.keys(row).sort()).toEqual(
      ['archivedAt', 'archivedBy', 'id', 'originalName', 'size', 'thumbnailUrl'].sort(),
    );
  });

  it('totals the count and the space recoverable across the whole set, not the page', async () => {
    const report = await service.report({ olderThanDays: 90, skip: 0, limit: 1 });

    expect(report.items).toHaveLength(1);
    expect(report.total).toBe(3);
    expect(report.totalSize).toBe(600); // 100 + 200 + 300
  });

  it('orders largest first, so the biggest saving is on the first page', async () => {
    const sizes = (await service.report({ olderThanDays: 90, skip: 0, limit: 20 })).items.map((i) => i.size);

    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });

  it('defaults the window to 90 days', async () => {
    await service.report({ skip: 0, limit: 20 });

    expect(repository.findArchivedOlderThan).toHaveBeenCalledWith(
      expect.any(Date),
      expect.objectContaining({ days: 90 }),
    );
  });

  /**
   * The report is a snapshot and can be minutes old. An editor may have pasted
   * the file's URL into an article since. So the delete re-runs the full
   * single-asset check rather than trusting the row it was clicked from.
   */
  it('re-checks references at the delete, not at the report', async () => {
    referrers.mockResolvedValue([{ collection: 'articles', path: 'body', kind: 'richTextLink' }] as never);

    await expect(service.purgeFromReport(unusedId.toString(), actor)).rejects.toMatchObject({
      response: { code: 'stillReferenced' },
    });
  });
});

/**
 * The batch form exists for the report, which would otherwise call the
 * single-asset scan once per candidate — one query per collection per file.
 *
 * It shares the field map and both searches with the single form, and this test
 * is what keeps them from drifting: the same data must give the same answer.
 */
describe('findReferencedMediaAssetIds — the batch sibling', () => {
  it('agrees with the single-asset scan on the same data', async () => {
    const ids = [refByField, refByRichText, refByUrlField, unused].map(String);

    const batch = await findReferencedMediaAssetIds(connection, ids);
    const singly = new Set<string>();
    for (const id of ids) {
      if ((await findMediaAssetReferrers(connection, new Types.ObjectId(id))).length > 0) singly.add(id);
    }

    expect([...batch].sort()).toEqual([...singly].sort());
  });

  it('issues one query per collection, not one per candidate', async () => {
    await findReferencedMediaAssetIds(connection, Array.from({ length: 20 }, () => String(new Types.ObjectId())));

    // 20 candidates must not become 20x the queries.
    expect(countDocumentsSpy.mock.calls.length).toBeLessThan(20);
  });

  it('is fail-closed too: a failing query rejects rather than reporting no references', async () => {
    findSpy.mockRejectedValue(new Error('down'));

    await expect(findReferencedMediaAssetIds(connection, [String(unused)])).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd api && npm test -- --runInBand --testPathPatterns="unused-media"`

- [ ] **Step 3: Implement the batch scan and the report**

`GET /media-assets/unused` is guarded by **`mediaAssets:PermanentDelete`** — the
report exists to inform that decision, so it is the same authority, and
`PermanentDelete` is Super-Admin-reachable only through the seeded role.

The row's two actions are `POST /media-assets/:id/object` (Task 7, unchanged,
full four conditions, step-up **per file**) and `POST /media-assets/:id/restore`
(Task 7's restore).

- [ ] **Step 4: Run, type-check, report**

---

### Task 11: Orphaned-media candidates on save, and restore that brings images back

**Files:**
- Create: `api/src/common/authz/orphaned-media.ts`
- Create: `api/src/common/authz/orphaned-media.spec.ts`
- Modify: the editorial services whose records hold a `MediaAsset` ref
- Modify: `api/src/modules/workflow/publishing/publishing.service.ts` (`restore`)

**Interfaces:**
- Consumes: `findReferencedMediaAssetIds` (Task 10).
- Produces: `orphanedMediaCandidates(connection, removedIds): Promise<string[]>`; every editorial save response gains `orphanedMediaCandidates: string[]`.

> **Measured before designing (owner asked): can an image with references be
> archived today, and what does the site then show?**
>
> **Yes, and nothing checks.** `MediaAssetsService.remove` soft-deletes and
> decrements the album count — there is no reference check anywhere.
>
> **The site then silently omits the picture.** `GET /media-assets/public?ids=`
> documents it in its own Swagger text: *"Assets that are hidden or archived are
> simply absent from the response, so the caller must not assume a 1:1 mapping
> with what it asked for."* All sixteen web consumers follow the same shape —
> `id ? map.get(id) : undefined`, then render only when present — so there is no
> broken `<img>` and no placeholder. A hero falls back to its ink ground; a board
> card loses its portrait ring, which Chapter 27 §31 already describes as the
> intended look when a photo does not resolve.
>
> **Why that matters here:** archiving a still-referenced image blanks it on the
> live site with no warning to anybody. So the suggestion dialog must only ever
> offer images with **no** remaining reference — which is what the owner
> specified, and this measurement is the reason it is not merely tidier but
> necessary.

- [ ] **Step 1: Write the failing test**

```ts
describe('orphanedMediaCandidates', () => {
  it('offers an image the save removed and nothing else references', async () => {
    expect(await orphanedMediaCandidates(connection, [oldCoverId])).toEqual([oldCoverId.toString()]);
  });

  it('does not offer an image still used somewhere else', async () => {
    await albums.insertMany([{ coverAssetId: oldCoverId, name: { en: 'A', ar: 'أ' } }]);

    expect(await orphanedMediaCandidates(connection, [oldCoverId])).toEqual([]);
  });

  /**
   * Revisions are deliberately not counted. A replaced image is in every earlier
   * revision by definition, so counting them would mean nothing is ever
   * suggested — and archiving is reversible, so the cost of suggesting is low
   * while the cost of never suggesting is a library that only grows.
   */
  it('ignores revisions, which always hold the old image', async () => {
    await revisions.insertMany([{ entityType: 'articles', snapshotData: { coverMediaId: oldCoverId } }]);

    expect(await orphanedMediaCandidates(connection, [oldCoverId])).toEqual([oldCoverId.toString()]);
  });

  it('answers empty rather than throwing when the scan fails, so a save never fails for this', async () => {
    findSpy.mockRejectedValue(new Error('down'));

    expect(await orphanedMediaCandidates(connection, [oldCoverId])).toEqual([]);
  });
});

describe('the save response', () => {
  it('carries the candidates after a successful save', async () => {
    const saved = await articlesService.update(articleId, { coverMediaId: newCoverId } as never, actor);

    expect(saved.orphanedMediaCandidates).toEqual([oldCoverId.toString()]);
  });

  it('still saves when the candidate scan fails', async () => {
    findSpy.mockRejectedValue(new Error('down'));

    const saved = await articlesService.update(articleId, { coverMediaId: newCoverId } as never, actor);

    expect(saved.orphanedMediaCandidates).toEqual([]);
    expect(saved.id).toBe(articleId);
  });
});

describe('restore brings archived images back with the content', () => {
  it('unarchives an image the restored revision points at', async () => {
    await mediaAssets.updateOne({ _id: oldCoverId }, { archivedAt: new Date(), archivedBy: actorId });

    await publishingService.restore({ entityType: 'articles', entityId: articleId, revisionId, actor });

    expect((await mediaAssets.findById(oldCoverId))?.archivedAt).toBeNull();
  });

  it('writes an audit row for each image it brought back', async () => {
    await publishingService.restore({ entityType: 'articles', entityId: articleId, revisionId, actor });

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'mediaAssets', action: 'Update', entityId: oldCoverId }),
    );
  });

  it('leaves an image that was never archived alone', async () => {
    await publishingService.restore({ entityType: 'articles', entityId: articleId, revisionId, actor });

    expect(auditLogsService.write).not.toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'mediaAssets' }),
    );
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd api && npm test -- --runInBand --testPathPatterns="orphaned-media"`

- [ ] **Step 3: Implement**

`orphanedMediaCandidates` is **advisory**, so it is the one place in this batch
that is deliberately **not** fail-closed: a scan failure returns an empty list and
the save succeeds. Suggesting nothing costs an editor one unarchived file;
failing the save costs them their work.

Restore is the opposite — it **must** bring the images back, or a restored article
publishes with its picture silently missing, which is exactly the failure the
measurement above describes.

**Out of scope, stated:** archiving content suggests nothing about its images
(archived content can return), and the dialog never offers permanent deletion.

- [ ] **Step 4: Run, type-check, report**

### Task 12: Warn before archiving an image the site is still using (owner decision 2026-09-27)

**Files:**
- Modify: `api/src/modules/media-center/media-assets/media-assets.service.ts` (`remove`)
- Modify: `api/src/modules/media-center/media-assets/media-assets.controller.ts` (the archive route's body)
- Create: `api/src/modules/media-center/media-assets/dto/archive-media-asset.dto.ts`
- Modify: `api/src/common/errors/api-error-code.ts` (`mediaInUse`)
- Modify: `apps/dashboard/src/lib/admin/admin-write.ts` and `messages/{ar,en}.json`
- Modify: `api/src/modules/media-center/media-assets/media-assets.service.spec.ts`

**Interfaces:**
- Consumes: `findMediaAssetReferrers(connection, id, { includeRevisions: false })` — Task 7's function, in the same live-references-only mode Task 11 uses.
- Produces: `409 mediaInUse` carrying the referrer list; `ArchiveMediaAssetDto { acknowledgeReferences?: boolean }`.

> **The measured problem (owner asked; this is the answer that made the task
> necessary rather than merely tidy).**
>
> **Archiving a referenced image is allowed today and nothing checks.**
> `MediaAssetsService.remove` soft-deletes the row and decrements the album
> count — there is no reference check anywhere in it.
>
> **The site then silently omits the picture.** `GET /media-assets/public?ids=`
> says so in its own Swagger text: *"Assets that are hidden or archived are
> simply absent from the response, so the caller must not assume a 1:1 mapping
> with what it asked for."* All **sixteen** web consumers follow the same shape —
> `id ? map.get(id) : undefined`, then render only when present — so there is no
> broken `<img>` and no placeholder to notice. A hero falls back to its ink
> ground; a board card loses its portrait ring, which Chapter 27 §31 already
> describes as the intended look when a photo does not resolve.
>
> **So the failure is invisible from both ends:** the editor sees a successful
> archive, and the page still renders. Nobody is told that a published page just
> lost an image.
>
> **Why archiving is still not blocked.** The legal cases need it to work
> immediately — a guardian asking for their child's photograph to come down does
> not wait for twelve pages to be edited first. So the decision is **informed
> consent, not prevention**: the first attempt refuses and names every place the
> image will vanish from, and a second attempt carrying `acknowledgeReferences`
> proceeds and records what was known at the time.

> **A failed scan asks for the same confirmation rather than passing.** This is
> the one place the fail-closed rule takes a different shape: refusing outright
> would make a scan outage block a legal takedown, and passing silently would be
> the very failure above. So a failed scan is reported *as* a possible in-use
> case, flagged `scanIncomplete`, and needs the same acknowledgement — the
> operator is told "this may be in use and we could not check", which is the
> honest statement.

- [ ] **Step 1: Write the failing test**

```ts
describe('MediaAssetsService.remove — the in-use warning', () => {
  it('refuses an archive while the image is still referenced, naming where', async () => {
    referrers.mockResolvedValue([
      { collection: 'articles', path: 'coverMediaId', documentId: articleId, kind: 'ref' },
      { collection: 'heroSlides', path: 'url', documentId: slideId, kind: 'urlField' },
    ]);

    await expect(service.remove(assetId, actor, {})).rejects.toMatchObject({
      response: {
        code: 'mediaInUse',
        referrers: [
          expect.objectContaining({ collection: 'articles' }),
          expect.objectContaining({ collection: 'heroSlides' }),
        ],
      },
    });
  });

  /** The legal path. It must work on the second press, not be blocked. */
  it('archives on acknowledgement, and records the references in the audit row', async () => {
    referrers.mockResolvedValue([{ collection: 'articles', path: 'coverMediaId', documentId: articleId, kind: 'ref' }]);

    await service.remove(assetId, actor, { acknowledgeReferences: true });

    expect(repository.softDelete).toHaveBeenCalled();
    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: expect.stringContaining('1'),
        metadata: expect.objectContaining({ referrers: expect.arrayContaining([expect.objectContaining({ collection: 'articles' })]) }),
      }),
    );
  });

  /**
   * Neither fail-closed nor fail-open: the operator is told the check could not
   * run and confirms anyway, so an outage cannot block a takedown and cannot
   * hide a live reference either.
   */
  it('asks for the same confirmation when the scan itself fails', async () => {
    referrers.mockRejectedValue(new Error('down'));

    await expect(service.remove(assetId, actor, {})).rejects.toMatchObject({
      response: { code: 'mediaInUse', scanIncomplete: true },
    });

    await service.remove(assetId, actor, { acknowledgeReferences: true });
    expect(repository.softDelete).toHaveBeenCalled();
  });

  it('archives an unreferenced image with no confirmation at all', async () => {
    referrers.mockResolvedValue([]);

    await service.remove(assetId, actor, {});

    expect(repository.softDelete).toHaveBeenCalled();
    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ referrers: [] }) }),
    );
  });

  /** Revisions hold every image that was ever published, so counting them would
   *  make every archive need a confirmation and train the operator to click
   *  through it — which is how a warning stops being read. */
  it('ignores revisions, counting only what the live site still shows', async () => {
    await service.remove(assetId, actor, {});

    expect(referrers).toHaveBeenCalledWith(expect.anything(), assetId, { includeRevisions: false });
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd api && npm test -- --runInBand --testPathPatterns="media-assets.service"`

- [ ] **Step 3: Implement**

`mediaInUse` is a new refusal code, so it joins **three** vocabularies or it
degrades to a generic `conflict` with no test failing: `API_ERROR_CODES`, the
dashboard's `admin-write.ts` group plus its `FROM_API_CODE` map, and both
message catalogues. The dialog itself is Batch 8, screen 11.

**Bulk archive from the library**, where it exists, follows the same rule and
lists only the images that are in use — an acknowledgement that covers fifty
files of which two matter is not informed consent.

- [ ] **Step 4: Run, type-check, report**

---

## Amendments after the independent plan review (2026-09-27)

An independent reviewer checked this plan against the owner's binding decisions and
against the source. It found 8 gaps, 8 contradictions, 7 ordering defects and 10 places
where the plan mandated something that was itself a defect. Its measurement spot-checks
confirmed eleven of the plan's claims exactly and corrected two.

**Where this section and a task body disagree, this section wins.** Task bodies are left
as written so the change is visible rather than silent.

---

### A. The nineteen pairs that had no task — resolved by measuring, not by deferring

The plan said "the dead list is the work of Tasks 5–8", and Tasks 5–8 covered only 106 of
125. The remaining 19 were `Approve` x9, `Publish` x4 and `ViewSensitive` x6. Each turned
out to be a different problem.

**A1 — `Approve` on nine entity types is removed from the map. The codebase had already
proved it wrong.** `publishing.service.ts` carries this comment, written when it was fixed:

> `workflowInstances:Approve`, because that is the grant the three review routes actually
> enforce. This asked for `<entityType>:Approve`, which is a pair no route guards — and
> `permission-catalogue.spec.ts` refuses to seed a pair no route guards, so it was
> ungrantable rather than merely unheld. The effect was silent and total: `canApprove` was
> false for every reader of every type.

Declaring `articles:Approve` and its eight siblings would re-introduce, as a
*declaration*, the exact pair that was removed as a *bug*. `workflowInstances:Approve`
stays and is the only approval pair; three review routes guard it with a decorator.

**A question for the owner is raised in the report**: section 3-e says approvers are chosen
from holders of `Approve` "on the type", which may mean the per-type pair. If so it returns
in Batch 7 at one line per resource — with its enforcement path built at the same time,
rather than declared years ahead of it.

**A2 — `Publish` on the four is NOT dead. It is enforced in service code, and the catalogue
spec is blind to that.** `publishing.service.ts` resolves
`hasPermission(actor, entityType, 'Publish')` for every one of the twelve
`PUBLICATION_ENTITY_TYPES`, which includes all four of `committees`, `documents`,
`governanceDocuments` and `organizationalStructure`. The pair is real, holdable and
checked on a live request; it simply has no `@RequirePermission` decorator, and the spec
scans only decorators.

The spec therefore gains a second, named source of enforcement:

```ts
/**
 * Pairs enforced in service code rather than by a route decorator.
 *
 * `PublishingService` resolves `<entityType>:Publish` and `<entityType>:Update` for every
 * `PUBLICATION_ENTITY_TYPE` when it computes what the actor may do, so the pair is checked
 * on a real request — just not by the guard, which is why the decorator scan cannot see
 * it. Listed by hand BECAUSE it cannot be derived: the alternative is a spec that reports
 * a live permission as dead configuration and invites the next reader to delete it.
 *
 * Each entry names the file that enforces it, and the test below reads that file and fails
 * if the check is no longer there — so this list cannot rot into a box of excuses.
 */
const ENFORCED_IN_SERVICE_CODE = [
  { pair: 'committees:Publish', by: 'src/modules/workflow/publishing/publishing.service.ts' },
  { pair: 'documents:Publish', by: 'src/modules/workflow/publishing/publishing.service.ts' },
  { pair: 'governanceDocuments:Publish', by: 'src/modules/workflow/publishing/publishing.service.ts' },
  { pair: 'organizationalStructure:Publish', by: 'src/modules/workflow/publishing/publishing.service.ts' },
] as const;

it('finds the service-level check behind every pair that claims one', () => {
  for (const { pair, by } of ENFORCED_IN_SERVICE_CODE) {
    const action = pair.split(':')[1];
    expect(readFileSync(join(process.cwd(), by), 'utf8')).toContain(`entityType, '${action}'`);
  }
});
```

**A3 — `ViewSensitive` x6 is genuinely not enforced yet, and its batch is the owner's own.**
Sensitive-field hiding and view logging are A3/A4/C1, which the owner assigned to Batch
6a/6b. The verb is declared, unenforced, and has a named home.

**A4 — the "no dead pairs" gate becomes a list that can only shrink.** Asserted in both
directions, so it is not an excuse box:

```ts
/** Declared, not yet enforced, each with the batch that gives it a route. The test below
 *  compares the dead set to this list EXACTLY — so a new dead pair fails, and a pair that
 *  has since been given its route also fails until it is removed from here. A list that
 *  can only shrink is documented debt; a list that is merely tolerated is a suite nobody
 *  reads. */
const AWAITING_ITS_BATCH = [
  { pair: 'athletes:ViewSensitive', batch: '6a' },
  { pair: 'athleteProfiles:ViewSensitive', batch: '6a' },
  { pair: 'athleteGuardianRelationships:ViewSensitive', batch: '6a' },
  { pair: 'federationPersonnel:ViewSensitive', batch: '6a' },
  { pair: 'officials:ViewSensitive', batch: '6a' },
  { pair: 'siteSettings:ViewSensitive', batch: '6a' },
] as const;

it('leaves no dead pair that is not either enforced elsewhere or booked into a batch', () => {
  const excused = [
    ...ENFORCED_IN_SERVICE_CODE.map((entry) => entry.pair),
    ...AWAITING_ITS_BATCH.map((entry) => entry.pair),
  ].sort();
  const used = usedPairs();
  const dead = [...declaredPairs].filter((pair) => !used.has(pair)).sort();

  expect(dead).toEqual(excused);
});

it('books every awaiting pair into a real batch', () => {
  expect(AWAITING_ITS_BATCH.every((entry) => /^[0-9]+[ab]?$/.test(entry.batch))).toBe(true);
});
```

**Arithmetic after A1–A4:** 78 resources, **327** declared pairs (336 minus the nine
`Approve`), 214 decorated, **116 dead** = 106 owned by Tasks 5–8, plus 4 enforced in
service code, plus 6 booked into Batch 6a. Task 9's gate is now reachable *and* honest.

---

### B. Corrections already applied to live code, so the report states them as done

**B1 — the plan's "third direction" was a tautology and is gone.** `PERMISSION_CATALOGUE`
is *derived* by exactly the `flatMap` the test recomputed, so the assertion was `A ⊆ A`
and could not fail. It was presented as new coverage and named in the exit criteria.
Removed. The invariant it was reaching for moved to the map's own spec, where it can
actually fail: **no verb in the vocabulary that no resource declares.**
`ManageSecuritySettings` is its one named exception, because Batch 5 brings the collection
it belongs to — and that test is what will refuse to stay green if the collection arrives
without its verb being declared.

**B2 — that new test immediately found a second dead verb: `ViewAuditLog`.** It was in the
vocabulary, declared by no resource, while the audit log's own read was guarded by a
generic `auditLogs:Read` — two names for one act, one of which nothing read. Fixed:
`auditLogs` declares `['ViewAuditLog', 'Export']` and the read route carries
`@RequirePermission('auditLogs', 'ViewAuditLog')`. Reading the record of who touched a
thing is not the same act as reading the thing, and holding one should never imply the
other.

**B3 — a consequence of B2, and Task 5 owns it.** `missingImpliedReads` keys on the literal
action `Read`, so with `auditLogs` no longer carrying a `Read` pair, `auditLogs:Export` no
longer implies its read: a role could be granted the audit-log CSV without the audit-log
screen. That is incoherent rather than an escalation — an export is not a change, so the
rule's own reason ("whoever may change a resource must be able to read it") is not
violated. Task 5 makes the implication read each resource's own read verb instead of the
literal `Read`.

**B4 —** `permission-implications.spec.ts`'s "treats Read on its own as complete" was
asserting on `auditLogs:Read`, which no longer exists, so it would have kept passing for
the wrong reason: an unknown pair implies nothing. Re-pointed at `permissions:Read`, a
resource whose only verb is a real guarded read.

---

### C. Task-level corrections

**Task 5**

- The reserved set is **eight**, not nine. Drop the `securitySettings` row from the
  `it.each`: `securitySettings` is not in `PERMISSION_RESOURCES` at all, so the mandated
  test could not pass while the exit criterion beside it already conceded eight. The
  plan's goal line and two test strings still said "five"; all now read eight, with the
  ninth booked into Batch 5.
- **`findNamesByIds` does not exist, and the narrow projection is implementation work, not
  a test.** The repository method is `findByIds` and it reads whole user documents. The
  plan asserted the decision was already satisfied and only needed covering. Build
  `findNamesByIds` with an explicit `select('_id name')`, return a `Map`, and assert the
  key set **against the real query** — a test that mocks the repository proves nothing
  about a projection, and the projection is the entire guarantee.
- Re-point `roles:Create`, `roles:Update` and `roles:Archive` onto `roles:ManageRoles`:
  three live routes are guarded right now by pairs no role can hold.
- Expose `superAdminOnly` on the permissions read, so Batch 8's picker can render the
  reserved pairs disabled. The picker is Batch 8; without this it has nothing to read.
- Close B3's implication gap.

**Task 6** — one table-driven test across all 27 services, not three tests against one DTO
with the pattern repeated 26 more times untested. The ES2023 partial-update trap is
per-service, so only a per-service assertion covers it.

**Task 7**

- **The coverage guard had no file, no step and no run command.** Create
  `api/src/common/authz/media-reference-coverage.spec.ts`, carrying `SCANNED_FIELDS`,
  `SCAN_EXCLUSIONS` and all three clauses.
- **Clause (b) is implemented as the decision states it**: *any* ObjectId with no `ref`
  fails the guard. The plan had ANDed a media-name condition onto it, which turns a
  fail-closed sweep into a check that passes over precisely the hidden media reference it
  exists to catch, immediately in front of an irreversible delete. The 21 ObjectId fields
  that exist today are excused **by name, each with its reason** — the polymorphic keys
  (`entityId`, `targetId`, `ownerId`, `triggerId`, `assignedToId`), the three legal-page
  ids, and the closed-target lists — which is exactly what the owner's "explicit and
  justified exclusions" permits.
- **Five shapes, not four**: the synthetic probe gains a discriminator branch.
- **One referrer shape everywhere**: `{ collection, path, documentId, kind }`, `kind` in
  `'ref' | 'richTextLink' | 'urlField'`. The plan asserted three incompatible shapes
  across Tasks 7, 10 and 12.
- **Signature**: `findMediaAssetReferrers(connection, id, { includeRevisions = true } = {})`.
  Tasks 11 and 12 pass `false`. Without the option both would re-implement the exclusion
  and drift from the one function section 8 protects.
- **Register every refusal code in all three vocabularies** — `api-error-code.ts`, the
  dashboard's code union **and** its `FROM_API_CODE` map in
  `apps/dashboard/src/lib/api/admin-write.ts`, and both message catalogues. Measured:
  `referenceCheckFailed`, `stillReferenced`, `mediaInUse` and the step-up code are absent
  from all three today. A code that joins fewer than three silently degrades to the status
  default with no test failing.
- **Two of the plan's tests pass on an empty implementation**: "answers empty for an asset
  nothing points at" and "does not report the asset's own file as a reference to itself"
  both assert `toEqual([])`, so a `findMediaAssetReferrers` that always returns `[]` passes
  both — and passing those two is exactly the failure that destroys a referenced file.
  Each gains a referenced asset as a positive control **inside the same test**.
- **`contactMessages:PermanentDelete` has no route, no step and no test.** Add it, and
  reconcile it with the existing `hardDeleteEligibleAt` cooldown rather than leaving two
  gates that do not know about each other.
- **Write the storage-before-row reason as a comment.** The plan claimed `purge`'s own
  comment already gives it; the order is right and **the comment does not exist**, so the
  reason is lost unless this task writes it.
- The object route still carries `@RequirePermission('mediaAssets', 'Archive')` while being
  the codebase's only real destruction. It becomes `PermanentDelete`.

**Task 10**

- `GET /media-assets/unused` is declared **above** `@Get(':id')`, or `:id` swallows
  `unused` and the report fails as an id lookup. `@Get('public')` in the same file is the
  precedent.
- The row gains **`type`**, which the decision requires and the asserted key set omitted —
  from `MediaFile.mimeType`, which exists, so still no schema change. The assertion is an
  exact `toEqual`, so leaving it out would have made adding the column a test *failure*
  rather than a test *catching* its absence.
- **The batch test asserted the opposite of the requirement.** `toBeLessThan(20)` is passed
  by an implementation that scans only a few collections and failed by a correct one, since
  one query per collection across 25 schema files plus 12 URL fields plus the revision scan
  is well over 20. The invariant is *independence from the candidate count*: assert the
  query count is the **same for 1 candidate as for 20**. And spy on the read that returns
  which ids matched, not on `countDocuments`.
- The 90-day default is asserted at **one** source of truth. `expect.any(Date)` beside
  `objectContaining({ days: 90 })` proves nothing about 90 days and lets an implementation
  honour one and ignore the other.
- **State that the report ships inert in this batch**: its only row action is the purge, and
  every `PermanentDelete` refuses with the step-up code until Batch 5. That is defensible;
  discovering it is not.

**Task 11** — assert the audit row's **count field**, not
`reason: expect.stringContaining('1')`. The digit `1` occurs in almost any string holding
an id, a date or a length, so the assertion is close to vacuous.

**Task 12** — **`albums.service.ts` calls `mediaAssetsService.remove(photoId, archivedBy)`
when a photo leaves an album, and it was not in the task's file list.** After this task that
call starts refusing with `mediaInUse` for any referenced image, with no acknowledgement
path and no test. It joins the task: the album route propagates the refusal and its DTO
carries `acknowledgeReferences`, with a test that the 409 reaches the caller. Removing a
photo from an album really does archive a real asset, so it gets the real warning rather
than an exemption.

**Task 9** — runs **last**, after Task 12, not in position 9; its gate is evaluated once
every route exists. It also updates the spec's section 10 run order, which still omits both
new scripts — the plan had put the order in its own Step 3 while telling the reader it was
in the spec.

**Execution order for the files several tasks share** (`media-assets.controller.ts`,
`media-assets.service.ts`, and the 27/47 controller sets): **6 → 7 → 10 → 11 → 12 → 9**,
strictly sequential, never parallel.

**Task 2, for the record** — its migration test cannot use the application's own
`Permission` model, because `permission.schema.ts` enforces the current enum and the row
being migrated is a pre-rename one. The plan's code block, which another agent would copy,
still shows the model that cannot insert the fixture; the delivered spec uses a separate
fixture model targeting the same collection. Its `scope: null` assertion is also revisited
in Task 4, when `scope` arrives.

---

### D. Owner decisions of 2026-09-27 (second round) — these override A3, A4 and the Task 12 album ruling

**D0 — the principle, stated by the owner as goal 1: no pair may exist in the catalogue
without an enforcement path, not even temporarily.** That is the rule Amendment A1 applied
to `Approve`, and it applies equally to what A3 had left on an allowlist.

**D1 — `ViewSensitive` is removed from the six resources that declared it.** A3 had booked
it into Batch 6a and left it declared. Under D0 that is a permission an administrator can
be granted today that changes nothing — the exact failure this file exists to prevent. The
verb stays in `PERMISSION_ACTIONS`, because a verb no resource declares produces **no
catalogue pair at all**, so nothing becomes grantable; `capability-map.spec.ts` names it
and `ManageSecuritySettings` as its two exceptions, each with the batch that declares it.
The `sensitiveFields` column stays untouched: it records *which* fields are sensitive,
which is the classification Batch 6a will read.

**`AWAITING_ITS_BATCH` is therefore empty.** The structure stays, with a comment saying
goal 1 forbids entries and that adding one needs the owner — so the next attempt to declare
an unenforced pair has to argue for itself instead of slipping into a list.

**Revised arithmetic:** 78 resources, **321** declared pairs, 214 decorated, **110 dead** =
106 owned by Tasks 5–8 plus the 4 enforced in `publishing.service.ts`. The gate is
`dead === ENFORCED_IN_SERVICE_CODE`, both directions.

**D2 — `workflowInstances:Approve` is explicitly temporary, and `<entityType>:Approve`
lands in Batch 4, not Batch 7.** Batch 4 is A6, the approvals batch, which already contains
the workflow engine and the approval path — so the pair and the code that reads it are
built in the same batch, which was the condition. Recorded in the spec's Batch 4 section:

- a `<entityType>:Approve` pair for every `WORKFLOW_ENTITY_TYPES` member, and the engine
  reads the content type's own pair in `canApprove` and when assigning a step's approver;
- `workflowInstances:Approve` leaves the catalogue at that point;
- a negative test: a news approver cannot approve a governance document;
- the reviewer-approver template carries the `Approve` pairs for its own types;
- the policies screen offers, as approvers, only holders of that type's pair.

**No migration script for the roles.** E1 (Batch 3) archives the roles and the sync updates
the Super Admin, so the pair change needs no data rewrite. Written into the script order so
nobody writes one later.

**D3 — removing a photo from an album must never be refused and never ask for
confirmation.** This replaces the earlier ruling that folded `albums.service.ts` into Task
12's warning. The owner's design is better, and the reason is that the two acts are not the
same act: detaching a photo from an album is a *removal of one reference*, while archiving
is *withdrawal from the whole site*. Conflating them is what made the warning look
necessary there.

So `albums.service.ts` runs the reference check **excluding the album the photo is leaving**,
and branches:

| What the check finds | What happens |
|---|---|
| no other reference | the asset is archived, exactly as today |
| a reference elsewhere (an article, a page, another album) | the photo is detached from this album only, and the asset is **not** archived |
| the check failed | detached only, **not** archived |

The failure direction is the opposite of the purge's, and deliberately so: there, doing
nothing is safe and destroying is not, so it fails closed; here, *not archiving* is the
safe outcome, because the asset staying live can never blank a page that still shows it.
Both rules are "prefer the state that cannot lose something", applied to different actions.

This needs one more argument on the shared function, so the album can exclude itself:

```ts
findMediaAssetReferrers(connection, id, {
  includeRevisions = true,
  /** Referrers to drop before answering — `(collection, documentId)` pairs. The album
   *  removing the photo passes itself: it is about to stop referencing the asset, so
   *  counting its own row would mean an asset used nowhere else is never archived. */
  ignore = [],
} = {})
```

**Three tests**, one per row of the table above.

**D4 — nothing heavy runs while the three dev servers are up** (free RAM measured at 370 MB
with all three listening). Affected-file tests only, as already required. **Before the full
suite in Batch 9, stop the servers first** — and confirm no orphaned `node` process still
holds a port, per CLAUDE.md §32.

---

## Batch 2 exit criteria

- [ ] `capability-map.spec.ts`, `permission-catalogue.spec.ts` and `permission-resources.spec.ts` all green — "no dead pairs" in the amended sense (Amendment A4): the dead set equals `ENFORCED_IN_SERVICE_CODE` **exactly**, in both directions. `AWAITING_ITS_BATCH` is empty (Amendment D1): under the owner’s goal 1 no pair may be declared without an enforcement path, so there is nothing to excuse.
- [ ] No verb in `PERMISSION_ACTIONS` that no resource declares, except `ManageSecuritySettings` (Batch 5) and `ViewSensitive` (Batch 6a), both named with their batch (Amendments B1, D1).
- [ ] `workflowInstances:Approve` recorded in the spec as temporary, with the Batch 4 replacement written out (Amendment D2).
- [ ] Removing a photo from an album is never refused and never asks for confirmation; all three branches of Amendment D3 have a test.
- [ ] The nine group resources guarded, so none of the 27 report pairs is dead.
- [ ] `npx tsc --noEmit` clean.
- [ ] Every one of the five Review Focus conditions has a passing test.
- [ ] **One** permission comparison in the codebase, and `grep -rn "resourceType === " api/src` finds no second one.
- [ ] `scope` present on `permissions`, carried by `resolvePermissions`, and refused when widened — proven by a test on the resolver, not only on the helper.
- [ ] The un-grantable pairs refused on both the building and the handing-out path, and still held by the seeded role. EIGHT today; the ninth (securitySettings:ManageSecuritySettings) lands with that collection in Batch 5.
- [ ] The unused-media report is guarded, batched, and its batch scan agrees with the single-asset scan on the same data.
- [ ] orphanedMediaCandidates never fails a save, and never counts revisions.
- [ ] Restoring content brings its archived images back, with an audit row each.
- [ ] The four mismatched routes re-pointed, and the three `roles` routes measured as guarded by dropped pairs (`roles:Create`/`Update`/`Archive`) re-pointed onto `roles:ManageRoles`.
- [ ] Archiving a referenced image refuses with `mediaInUse` and its referrer list, proceeds on `acknowledgeReferences`, records the referrers in the audit row, and asks the same confirmation when the scan fails.
- [ ] `mediaInUse` present in all three vocabularies (API codes, dashboard group + FROM_API_CODE, both catalogues).
- [ ] `npm run test:guards:core` green at the end of every task, and `npm run test:guards` (all three packages) green at the end of the batch **with the dev servers stopped** (owner decision 2026-09-27).
- [ ] Every guard test written in this batch is listed in the guard catalogue in `docs/engineering/`, each with what it guards.
- [ ] The first full run’s red list presented to the owner: the guard, why it fails, and whether this batch broke it. Ours fixed in this batch; design-system contracts presented, not touched.
- [ ] **File-organisation review (owner decision 2026-09-28), run AFTER the last task and BEFORE the report.** A fresh subagent that did not write the code produces a table in `docs/superpowers/reports/batch-2.md` under a section named «تقسيم الملفات»: every file this batch created or split, with its path, its role in one line, and who uses it. Below the table, three lists: (1) any file carrying more than one responsibility; (2) any code duplicated across files that belongs in one place; (3) any module reading from another module without going through that module’s service. **Findings only — nothing is fixed now.** Skills: `improve-codebase-architecture` (responsibility split and module boundaries), `nestjs-best-practices` (controller → service → repository, and whether DTOs and providers sit where they belong), `code-simplifier` **in read-only mode** (surface duplication and name where it belongs; the fixing stays in Batch 9), `graphify` (the file dependency map, so it is visible what depends on what), and `superpowers:requesting-code-review` for the reviewer seat. **Not `archify`** — that belongs to Batch 9’s explanatory documents, not to this table.
- [ ] No Git command run; no script run; no dependency added.

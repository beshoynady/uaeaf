# Batch 3 — Role management, role reset, templates, and `GET /me/permissions`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every API path that could edit a system role, hand out authority, or let an account change its own roles; write (never run) the role-reset and six-template scripts; and give any authenticated account one endpoint that states exactly what it may do, **with scopes**.

**Architecture:** Three of Batch 3's four outcomes already have their enforcement code from Batch 2 (`isSuperAdminOnly`, `holdsPair`, `assertAssignableByActor`, `assertNotStronger`, `assertEditable`). This batch adds the layers that are *missing*, never a second copy: a declarative template matrix with a guard that reads it, two idempotent scripts split into exported logic plus a thin runner, a service-layer self-assignment refusal beneath the controller's, and a read-only `me` module. No schema field is added. No script is run.

**Tech Stack:** NestJS 12 · Mongoose 9 · Jest (ESM, `--runInBand`) · `mongodb-memory-server` 11 (already a devDependency) · TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-09-26-authz-authn-design.md` (§2.4, §3, §5, §7.2, §10.1, §11, §12) · owner prompt for Batch 3, 2026-09-28 · `docs/superpowers/reports/batch-2.md` · ADR-0103 · ADR-0104 · ADR-0105 · ADR-0106 · ADR-0113 · `docs/engineering/reviews/workflow-integrity-review.md` (OUT-02).

**Revision 2, after independent plan review.** Eleven corrections applied; the review's findings are summarised at the end under "What the plan review changed". Eight questions it raised are in **Open Questions** and are put to the owner before the tasks that depend on them.

---

## Global Constraints

Copied verbatim from the owner prompt (§5, §9) and CLAUDE.md. Every task's requirements implicitly include this section.

- **Files:** `api/` and `docs/` only. **Never** `apps/web` or `apps/dashboard` — a second session is working on the header there. Reading them is permitted; writing is not.
- **Git:** read-only. `status`, `diff`, `log`, `show`, `ls-files` only (CLAUDE.md §33). No commits. Work stays uncommitted on `main`.
- **No script is ever run against the database.** Scripts are written idempotent and left unrun.
- **No new dependency.** One approved schema change: `Role.templateKey`, optional, with a
  sparse unique index (owner decision 2026-09-28). No other schema change.
- **TDD is mandatory.** Test first, run it, see it fail, then implement. **Every security rule gets a negative test.**
- **No secrets or tokens** in code or logs.
- **Style:** arrow functions (CLAUDE.md §30); simplest thing that works; `try/catch` used plainly.
- **Comments:** short TSDoc on public exports only; `//` only where the reason is not visible in the code; decisions by number only (`See ADR-0104`). Forbidden: restating the code, narrating its history, naming a Task/batch/plan/reviewer, `I`/`we`/`let's`, markdown or emoji or `Note:`/`IMPORTANT`, more than 3 lines, a `TODO` without an owner and an ADR.
- **`npm run test:guards:core` at the end of every task**; `npm run test:guards` at the end of the batch with dev servers stopped. Run guards more than once before reporting a failure (CLAUDE.md §32; 7.9 GB RAM).
- **Jest:** `npx jest` runs zero tests here (ESM). Use `npm test -- <pattern> --runInBand`. `--runInBand` is mandatory.
- **Protected, do not restructure** (prompt §8): the guard and per-request permission resolution · `holdsPair`/`missingPairs` as the single comparison · `findMediaAssetReferrers` and its batch copy · the audit interceptor and its derivation of `action` · **`AuditLogsRepository` (append-only) — every audit row goes through `AuditLogsService`, never through a model directly** · `bootstrap-admin`.
- **Out of scope** (prompt §6): `apps/web`, `apps/dashboard`, `<type>:Approve` (Batch 4), `ViewSensitive` (Batch 6a), events and seasons, any change to id shape, running anything.

---

## Open Questions — asked before the tasks that depend on them

Tasks 1–5 depend on none of these and proceed immediately. Tasks 6–8 carry a stated safe default for each, so they can be built and then adjusted by one line when the answer arrives.

**Q1 — E1 re-pointing open approval steps conflicts with an approved decision.**
`assigneeIds` lives on `workflowSteps`, which belong to a *definition*, not an instance (`workflow-step.schema.ts:20,32`). Re-pointing one changes it for **every instance of that definition, now and in future**. That is exactly why delegation is disabled (`workflow-instances.service.ts:14-21`), why the workflow integrity review classifies it OUT-02 at P1, and why ADR-0106 alternative (E) rejects auto-removing a blocked assignee.
*(a)* Re-point the definition's step anyway, report the blast radius, and amend ADR-0106 with a dated line. Cost: the Super Admin becomes a permanent assignee of that step for all future instances.
*(b)* Report the affected steps and instances and **change nothing** — the owner re-points by hand from the report.
*(c)* Defer until a per-instance assignee field exists (a schema change, a later batch).
**Recommendation: (b).** It delivers the information the owner needs, costs nothing irreversible, and does not put a script above a P1 finding and an ADR that both say the opposite. **Default while unanswered: (b).**

**Q2 — does E1 detach archived roles from accounts?**
`RolesService.remove` detaches on every archive (`roles.service.ts:201` → `role-assignments.repository.ts:37`), and `report-reserved-pair-holders.ts:67-69` says in its own words that a role "still names its holders **until `reset-roles` clears them**" — so the existing code expects E1 to clear them.
*(a)* Detach, matching the API and that comment. Cost: irreversible without the report; un-archiving a role no longer restores its holders.
*(b)* Leave `roleIds` intact. Cost: `roleIds` point at archived roles; restoring an account silently restores a dead role (the exact hazard `detachRole`'s comment names).
**Recommendation: (a)**, because the divergence in (b) is a second meaning for "archived role" that nothing else in the codebase has. **Default while unanswered: (a)**, with the report naming every account and role so the pairing is reconstructible.

**Q3 — the `own`-scope permission row (Batch 2, question س1, still unanswered).**
`PERMISSION_CATALOGUE` emits one row per `(resource, action)` and carries no `scope` field at all (`permission-catalogue.ts:23-30`); the value is the schema default `null` (`permission.schema.ts:79`). `seedPermissions`' upsert filter has no `scope` (`seed-admin.ts:130`), so a second row would match non-deterministically. **Template 2 ("محرر", `own` only) therefore has no row to point at.**
Worse, and new since Batch 2 asked: **`own` is enforced nowhere.** No service performs a row-level ownership check, and `publishing.service.ts` ignores scope entirely (Batch 2 question س2, also open). A seeded `own` template would read as narrow and behave as `all`.
*(a)* Add scoped rows and put `scope` in the upsert filter, in this batch.
*(b)* Seed the other five and **refuse template 2**, naming why.
*(c)* Seed template 2 at `all`. **Rejected outright** — that is the silent widening ADR-0113 alternative (A) was rejected for.
**Recommendation: (b) now, (a) in the batch that builds row-level enforcement**, since a scoped row without a service that reads it is a grant that lies. **Default while unanswered: (b).**

**Q4 — how a template is matched on re-run.**
`Role` has no key field, and `BaseSchema` carries only audit and archive fields; Mongoose strict mode silently drops an undeclared one — so "store a stable key" *is* a schema change.
*(a)* Add `templateKey` to `Role`. Needs your approval (prompt §7).
*(b)* Match on `name.en`, exactly as `seedSuperAdminRole` already does. Cost: an administrator renaming a template makes the next run seed a second copy, and a deleted template returns.
**Recommendation: (b)**, scoped to `isSystemRole: false`, and the re-created-after-deletion behaviour documented as what a *seed* script does. **Default while unanswered: (b).**

**Q5 — the "sensitive account" definition (prompt §3.د asks for this to be presented, not changed).**
Spec §7.2 defines it as holding any of `ManageRoles`, `AssignRoles`, `ViewSensitive`, `Export`, `PermanentDelete`. Since it was written: `ManageRoles`/`AssignRoles` became `superAdminOnly` (`capability-map.ts:575,622`), and `ViewSensitive` is not in the catalogue until Batch 6a.
It is **not** inert, and the first draft of this plan was wrong to assume so: until `reset-roles` runs, a legacy non-system role may still hold a reserved pair — which is the entire reason `report-reserved-pair-holders` exists. So the definition still selects real accounts today.
**This plan therefore implements §7.2 verbatim, all five verbs, and changes nothing.** The pairs that make an account sensitive in practice are reported in Task 9. No decision is required unless you want the definition narrowed.

**Q6 — `videos:Update` is how a video is published** (`capability-map.ts:634-636`: "`Update` is also how a video is PUBLISHED, since the API creates every one as a draft"). Template 2 is specified as "بدون نشر", and it holds `videos:Update`.
*(a)* Drop `videos` from template 2. *(b)* Accept it and record the exception. **Recommendation: (a)** — the template's stated absence should be true. **Default while unanswered: (a)**, with the line commented so reversing it is one edit.

**Q7 — template 5's exact resource list.** Spec §5 says "the governance pages", which is not a list. Candidates in the `federation-governance` group with only `Update`/`Publish`: `boardMembersPage`, `committeesPage`, `contactUsPage`; plus `federation`, unmentioned anywhere. **Default while unanswered:** the resources the spec names explicitly, plus `organizationalStructure`, `presidentMessagePage`, `strategicPlansPage`, `visionMissionPage`, `aboutFederationPage` — each one line in the matrix, so adding or removing one later costs one line.

**Q8 — what "ماعدا المستخدمون والوصول" excludes for template 6.** There are nine group report resources and none for `platform-administration`, which matches the phrase exactly by *product group*. But the dashboard's own "Users & Access" group also contains approval policies (`apps/dashboard/src/lib/navigation.ts:188-199`, read-only), whose reports are `workflowReports`. **Default while unanswered:** all nine, the product-group reading.

---

## Review Focus

Six input classes the spec implies and no happy path exercises. Each has its test in the owning task.

1. **A template naming a pair absent from the catalogue** — a typo in data fails nowhere at compile time. → Task 7.
2. **A template that is internally incoherent** — it may change a resource it cannot read. The seed writes to the model directly and so bypasses `assertCoherent`, and the incoherence only surfaces as a `400` the first time an administrator edits the template. → Task 7.
3. **`reset-roles` run twice** — the second run must archive nothing, report zero, and still emit the same role-less list. → Task 6, against a real in-memory database.
4. **An account whose `roleIds` all point at archived roles** — `roleIds.length === 0` is a different question, and after E1 every affected account is in the second state. → Task 5.
5. **`GET /me/permissions` for an account with no role, and for one whose role was archived mid-session** — `200` with an empty list and `standard`, never `403`, `500`, or an inferred Super Admin. → Task 4.
6. **A step whose assignees collapse below `requiredApprovals`** after two of them are replaced by the same account and de-duplicated (`workflow-step.schema.ts:35`, `workflow-instances.service.ts:153`) — the step then can never complete. → Task 6, and it is one reason Q1's default is "report, do not change".

---

## File Structure

| Path | Responsibility |
|---|---|
| `api/src/common/authz/role-templates.ts` | **New.** The six templates as data. Adding a resource is one array entry. Read by the guard and by the seed script; imports nothing from Mongoose. |
| `api/src/common/authz/role-template-matrix.spec.ts` | **New guard.** Named so the runner's basename pattern cannot also sweep in `seed-role-templates.spec.ts`, which needs a database. |
| `api/src/bootstrap/reset-roles.ts` | **New.** `resetRoles(models, options)` — the logic, exported, **no `main()`**. |
| `api/src/reset-roles.ts` | **New runner.** `assertSafeDevTarget`, context, print, close. The `seed-admin.ts` / `bootstrap-admin.ts` split, for the reason in Task 6 Step 0. |
| `api/src/bootstrap/reset-roles.spec.ts` | **New.** In-memory database. Idempotency, the role-less list, the refusals. |
| `api/src/bootstrap/seed-role-templates.ts` | **New.** `seedRoleTemplates(models)` — logic, exported, no `main()`. |
| `api/src/seed-role-templates.ts` | **New runner.** |
| `api/src/bootstrap/seed-role-templates.spec.ts` | **New.** In-memory database. |
| `api/src/modules/platform-administration/me/me.controller.ts` | **New.** `GET /me/permissions`. |
| `api/src/modules/platform-administration/me/me.module.ts` | **New.** |
| `api/src/modules/platform-administration/me/account-class.ts` | **New.** The one derivation of `standard \| sensitive \| superAdmin`. |
| `api/src/modules/platform-administration/me/dto/me-permissions-response.dto.ts` | **New.** `ScopedGrantDto` (`GrantDto` plus `scope`) and the response. |
| `api/src/modules/platform-administration/me/me.controller.spec.ts`, `account-class.spec.ts` | **New.** |
| `api/src/modules/platform-administration/users/is-self.ts` | **New.** `isSelf` moved out of the controller so both layers share one comparison. |
| `api/src/modules/platform-administration/users/users.service.ts` | Modified: `assignRoles` gains the self refusal, through `isSelf`. |
| `api/src/modules/platform-administration/users/users.controller.ts` | Modified: imports `isSelf` from the new module; `GET /users` resolves the no-role marker once. |
| `api/src/modules/platform-administration/users/users.service.self-assignment.spec.ts` | **New.** |
| `api/src/modules/platform-administration/users/dto/user-response.dto.ts` | Modified: `hasNoRole: boolean`, derived. |
| `api/src/modules/platform-administration/roles/roles.service.system-role.spec.ts` | **New.** Route-driven, not reflection-driven. |
| `api/package.json` | Two npm scripts. |
| `scripts/test-guards.mjs`, `docs/engineering/guard-tests.md` | The new guard, registered in both, in one task. |
| `docs/superpowers/specs/2026-09-26-authz-authn-design.md` | §12 order; §5 matrix reconciled. |
| `docs/design-system/ADR-0113-...md` | A dated amendment only. |
| `docs/superpowers/reports/batch-3.md` | **New.** |

---

### Task 1: Measure the two id spellings — read-only, changes nothing

**Running already, dispatched before this revision.** It writes no file, touches no code, and blocks nothing. Its output goes into Task 9's report and to the owner.

**Two clarifications the plan review asked for, answered here so the measurement is not ambiguous:** the question is `_id` versus `id` **in API responses and their consumers** (the owner's prompt §3.هـ), and separately the storage-level `ObjectId`-versus-`Mixed` count that Batch 2's closure left unmeasured. Both are reported; neither is changed. `apps/web` and `apps/dashboard` are **read-only**.

- [ ] **Step 1: Report the table. Change nothing.** The owner decides. No later task depends on the answer.

---

### Task 2: A system role is unwritable through every API path

**Files:**
- Create: `api/src/modules/platform-administration/roles/roles.service.system-role.spec.ts`
- Modify: `roles.service.ts` **only if** a path proves unguarded
- Read first: `roles.service.ts:277` (`assertEditable`), `roles.controller.ts`, `roles.service.lifecycle.spec.ts:83-127`, `roles.service.spec.ts:67,136,316`

**Interfaces:**
- Consumes: `RolesService.rename`, `.updatePermissions`, `.remove`; `ForbiddenException({ code: 'systemRole' })`.
- Produces: no new export. The product is coverage that fails when a future *route* reaches a write path without the guard.

**What already exists, measured:** `assertEditable` is called at `roles.service.ts:151`, `:168` and `:198`, and each is covered once in `roles.service.lifecycle.spec.ts` and `roles.service.spec.ts`. **This task adds one thing only:** a guard driven by the controller's routes, so a *new route* wired to a *new* service method fails here.

**The first draft of this task proposed a reflection test comparing a hard-coded method list against a filter over that same list — `A ⊆ A`, incapable of failing.** Batch 2 shipped five such tests and its closure names them. The replacement below reads the controller, which is a different source from the spec file's list.

- [ ] **Step 1: Write the failing route-driven guard**

```ts
/** Every mutating route on the roles controller lands on a service method that
 *  refuses a system role. Derived from the controller's own decorators, not
 *  from a list kept beside this test. See ADR-0104. */
const mutatingRouteHandlers = (): { path: string; handler: string }[] => { /* below */ };

describe('a system role leaves the API entirely', () => {
  it.each(mutatingRouteHandlers())('%s refuses a system role', async (handler) => {
    repository.findByIdIncludingArchived.mockResolvedValue(SYSTEM_ROLE);
    await expect(callControllerHandler(handler)).rejects.toMatchObject({
      response: { code: 'systemRole' },
    });
  });

  it('found at least three mutating routes, so a broken regex cannot pass vacuously', () => {
    expect(mutatingRouteHandlers().length).toBeGreaterThanOrEqual(3);
  });

  it('still lets a live custom role through every one of them', async () => {
    repository.findByIdIncludingArchived.mockResolvedValue(CUSTOM_ROLE);
    for (const handler of mutatingRouteHandlers()) {
      await expect(callControllerHandler(handler)).resolves.toBeDefined();
    }
  });
});
```

The second test is the non-emptiness floor: a pattern that matches nothing would otherwise make `it.each([])` pass silently (Batch 2's "five tests asserting nothing").
The third is the positive control: without it, an unconditional refusal passes everything above.

**Two traps in this step, both hit during execution and recorded so the next reader does not hit them again:**

- **The controller's handlers are not `async`.** A pattern requiring `async` before the name matches nothing useful here; a lazy one drifts onto the next `GET` handler. Match the decorator, skip any further decorators, and treat `async` as optional. Confirm the derived list is exactly `rename`, `updatePermissions`, `remove` before relying on it.
- **`create` has no target role**, so it cannot be an `it.each` case — it would fail against `systemRole` without that being a finding. Split the routes on whether the path carries `:id`, and close the gap with two further tests: `create` is the **only** mutating route without `:id` (so a later `@Put('bulk')` turns this red), and `create` never stores `isSystemRole` even when the request body carries it.

Build each handler's arguments from its own parameter decorators (`ROUTE_ARGS_METADATA`), so a future route with a different signature is still called correctly without editing the test.

- [ ] **Step 2: Run it and watch it fail**

```bash
cd api && npm test -- roles.service.system-role --runInBand
```

Expected first failure: the helper does not exist. If a mutating route turns out **not** to refuse, that is a real finding — fix it by adding `await this.assertEditable(id)` as that method's first statement and nothing else. If every route already refuses, **touch no production file** and record that in the report.

- [ ] **Step 3: Verify**

```bash
cd api && npm test -- roles.service --runInBand
cd .. && npm run test:guards:core
```

---

### Task 3: Nobody changes the roles on their own account — including beneath the controller

**Files:**
- Create: `api/src/modules/platform-administration/users/is-self.ts`, `users.service.self-assignment.spec.ts`
- Modify: `users.service.ts` (`assignRoles`), `users.controller.ts` (import `isSelf` instead of declaring it)
- Read first: `users.controller.ts:19-35` — **read this before writing a single line**

**Interfaces:**
- Produces: `export const isSelf = (pathId: string, actorId: string): boolean` — moved verbatim, not rewritten.
- Consumes: `AuthenticatedUser.userId`.

**The comparison is `isSelf`, never `===`.** `users.controller.ts:19-35` records why: `ObjectId.isValid` accepts 24 hex characters in either case and Mongoose casts them to the same document, while `toString()` lowercases — so an upper-cased id passed a string compare and reached the same record. That let an administrator strip their own roles. **It was closed by independent review on 2026-09-27.** A service-level `id === actor.userId` would reopen it one layer down. Move the function; do not write a second one.

- [ ] **Step 1: Move `isSelf` to its own module, changing nothing about it**

Cut it from the controller into `is-self.ts` with its TSDoc intact, and import it back. Run `npm test -- users.controller --runInBand` and confirm the count is unchanged before going further.

- [ ] **Step 2: Write the failing service tests**

```ts
describe('UsersService.assignRoles — the self-refusal is in the service too', () => {
  it('refuses when the actor is the target, without reading a single role', async () => {
    await expect(service.assignRoles(ACTOR_ID, [new Types.ObjectId()], actorOf(ACTOR_ID)))
      .rejects.toMatchObject({ response: { code: 'selfAssignment' } });
    expect(rolesService.assertAssignable).not.toHaveBeenCalled();
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('refuses a Super Admin acting on their own account', async () => {
    await expect(service.assignRoles(ACTOR_ID, [], actorOf(ACTOR_ID, EVERY_PAIR)))
      .rejects.toMatchObject({ response: { code: 'selfAssignment' } });
  });

  it('refuses an upper-cased spelling of the actor’s own id', async () => {
    await expect(service.assignRoles(ACTOR_ID.toUpperCase(), [], actorOf(ACTOR_ID)))
      .rejects.toMatchObject({ response: { code: 'selfAssignment' } });
  });

  it('still allows acting on another account', async () => {
    await expect(service.assignRoles(OTHER_ID, [], actorOf(ACTOR_ID))).resolves.toBeDefined();
  });
});
```

The third test is the one that fails against `===` and passes against `isSelf`. Without it this task would silently reintroduce a closed vulnerability.

- [ ] **Step 3: Run and watch all three refusal tests fail**

```bash
cd api && npm test -- users.service.self-assignment --runInBand
```

- [ ] **Step 4: Implement — first statement, before any read**

```ts
if (isSelf(id, actor.userId)) {
  throw new ForbiddenException({
    code: 'selfAssignment',
    message: 'You cannot assign roles to yourself.',
  });
}
```

The controller keeps its own call: it refuses before `users:AssignRoles` is even resolved, which is a different and useful moment. `users.controller.spec.ts:121` records that the controller refuses first — confirm that comment still holds rather than editing it.

- [ ] **Step 5: Verify**

```bash
cd api && npm test -- users.controller users.service is-self --runInBand
cd .. && npm run test:guards:core
```

---

### Task 4: `GET /me/permissions`

**Files:**
- Create: `me.controller.ts`, `me.module.ts`, `account-class.ts`, `dto/me-permissions-response.dto.ts`, `me.controller.spec.ts`, `account-class.spec.ts`
- Modify: `api/src/app.module.ts`
- Read first: `users.controller.ts:70-90` and `dto/me-response.dto.ts` — **both, before writing**

**Interfaces:**
- Consumes: `AuthenticatedUser` via `@CurrentUser()`; `RolesService.isSystemRole(roleId)`.
- Produces:

```ts
export type AccountClass = 'standard' | 'sensitive' | 'superAdmin';

export class ScopedGrantDto {
  resourceType: PermissionResource;
  action: PermissionAction;
  scope: 'own' | 'all' | null;
}

export class MePermissionsResponseDto {
  permissions: ScopedGrantDto[];
  accountClass: AccountClass;
}

export const accountClassFor = (
  permissions: readonly RequiredPermission[],
  holdsSystemRole: boolean,
): AccountClass;
```

**Two things the plan review caught, and they change the implementation:**

1. **`actor.permissions` is already resolved for this request** — `JwtStrategy` calls `resolvePermissions` while building `request.user` (`jwt.strategy.ts:62`), and it carries `scope` (`permissions.decorator.ts:24-26`). `users.controller.ts:76-78` records the decision explicitly: no second query, "no chance of disagreeing with the answer the guards will give on the very next call." **Read `actor.permissions`. Do not resolve again.**
2. **`GET /users/me` already returns `permissions`** — but through `GrantDto`, which has **no `scope`** (`me-response.dto.ts:8-11`). That is the gap this route fills, along with the account class. Both routes stay; the overlap is recorded in the report, not resolved by deleting a working route.

**Route:** `GET /me/permissions`, spelled as spec §11 gives it, in a **separate controller** — `users.controller.ts` declares `@Get(':id')`, and a sibling path added there is one reordering away from being swallowed.

- [ ] **Step 1: Write the failing controller tests**

```ts
describe('GET /me/permissions', () => {
  it('returns the caller’s own resolved pairs, with their scopes', async () => {
    const actor = actorOf([{ resourceType: 'articles', action: 'Update', scope: 'own' }]);
    await expect(controller.permissions(actor)).resolves.toMatchObject({
      permissions: [{ resourceType: 'articles', action: 'Update', scope: 'own' }],
    });
  });

  it('spells an absent scope as null rather than omitting the key', async () => {
    const actor = actorOf([{ resourceType: 'clubs', action: 'Read' }]);
    const body = await controller.permissions(actor);
    expect(body.permissions[0]).toHaveProperty('scope', null);
  });

  it('answers 200 with an empty list for an account holding no role', async () => {
    await expect(controller.permissions({ userId: ID, roleIds: [], permissions: [] }))
      .resolves.toEqual({ permissions: [], accountClass: 'standard' });
  });

  it('answers 200 for a token whose roles were all archived since it was issued', async () => {
    rolesService.isSystemRole.mockResolvedValue(false);
    await expect(controller.permissions({ userId: ID, roleIds: [ARCHIVED_ROLE_ID], permissions: [] }))
      .resolves.toMatchObject({ permissions: [], accountClass: 'standard' });
    expect(rolesService.isSystemRole).toHaveBeenCalledWith(ARCHIVED_ROLE_ID);
  });

  it('reads nothing about any other account', async () => {
    await controller.permissions(actorOf([]));
    expect(usersService.findById).not.toHaveBeenCalled();
    expect(usersRepository.findById).not.toHaveBeenCalled();
  });

  it('never re-resolves permissions — it uses the set the guard already built', async () => {
    await controller.permissions(actorOf([{ resourceType: 'clubs', action: 'Read' }]));
    expect(rolesService.resolvePermissions).not.toHaveBeenCalled();
    expect(rolesService.resolvePermissionsForRoles).not.toHaveBeenCalled();
  });
});
```

The fifth test is the negative one the prompt requires (*«مايرجّعش أي بيانات عن حسابات تانية»*), and unlike the first draft's version it asserts on **calls not made**, not on a function's arity. The sixth pins the decision at `users.controller.ts:76`.

- [ ] **Step 2: Run and watch them fail**

```bash
cd api && npm test -- me.controller --runInBand
```

Expected: module not found.

- [ ] **Step 3: Write the controller**

```ts
@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(private readonly rolesService: RolesService) {}

  /** What this account may do, as the guard resolved it for this request.
   *  No permission: the caller is asking only about themselves. See spec §10.1. */
  @Get('permissions')
  @ApiOkResponse({ type: MePermissionsResponseDto })
  async permissions(@CurrentUser() actor: AuthenticatedUser): Promise<MePermissionsResponseDto> {
    const holdsSystemRole = (
      await Promise.all(actor.roleIds.map((roleId) => this.rolesService.isSystemRole(roleId)))
    ).some(Boolean);
    return {
      permissions: actor.permissions.map(({ resourceType, action, scope }) => ({
        resourceType,
        action,
        scope: scope ?? null,
      })),
      accountClass: accountClassFor(actor.permissions, holdsSystemRole),
    };
  }
}
```

No `@Public()` — `JwtAuthGuard` is global, and omitting the decorator is what makes the route authenticated.

- [ ] **Step 4: Write the failing account-class tests**

```ts
describe('accountClassFor', () => {
  it('is superAdmin when the account holds a system role', () => {
    expect(accountClassFor([], true)).toBe('superAdmin');
  });

  it.each(['ManageRoles', 'AssignRoles', 'ViewSensitive', 'Export', 'PermanentDelete'] as const)(
    'is sensitive for %s — spec §7.2, verbatim',
    (action) => {
      expect(accountClassFor([{ resourceType: 'mediaAssets', action, scope: null }], false)).toBe('sensitive');
    },
  );

  it('is standard for an editor', () => {
    expect(accountClassFor([{ resourceType: 'articles', action: 'Update', scope: 'own' }], false)).toBe('standard');
  });

  it('is standard for an account holding nothing', () => {
    expect(accountClassFor([], false)).toBe('standard');
  });

  it('prefers superAdmin over sensitive when both apply', () => {
    expect(accountClassFor([{ resourceType: 'athletes', action: 'Export', scope: null }], true)).toBe('superAdmin');
  });
});
```

The `it.each` names the five verbs as **literals**, not as a list derived from the implementation — derive them and it becomes the tautology Batch 2 shipped.

- [ ] **Step 5: Implement §7.2 verbatim — change nothing about the definition**

```ts
/** Spec §7.2. Unchanged: `ManageRoles` and `AssignRoles` are reserved to a
 *  Super Admin (ADR-0104) but a role predating that decision may still hold
 *  one, which is what `report-reserved-pair-holders` exists to find. */
const SENSITIVE_ACTIONS: readonly PermissionAction[] = [
  'ManageRoles',
  'AssignRoles',
  'ViewSensitive',
  'Export',
  'PermanentDelete',
];

export const accountClassFor = (
  permissions: readonly RequiredPermission[],
  holdsSystemRole: boolean,
): AccountClass =>
  holdsSystemRole
    ? 'superAdmin'
    : permissions.some((pair) => SENSITIVE_ACTIONS.includes(pair.action))
      ? 'sensitive'
      : 'standard';
```

`ViewSensitive` is listed although nothing can hold it until Batch 6a: the spec says five verbs, and removing one because it is currently unreachable would be a silent narrowing of a security definition. Task 9 reports which of the five actually select an account today.

- [ ] **Step 6: Register and verify**

```bash
cd api && npm test -- me.controller account-class --runInBand && npx tsc --noEmit
cd .. && npm run test:guards:core
```

`npx tsc --noEmit`, **never** `nest build` — `nest build` deletes `dist/` and kills a running API (CLAUDE.md §32; it has happened twice).

---

### Task 5: `GET /users` marks an account with no live role

**Files:**
- Modify: `dto/user-response.dto.ts`, `users.service.ts`, `users.controller.ts`
- Create: `users.no-role.spec.ts`

**Interfaces:**
- Consumes: `RolesService.findAll()` (live roles only — it filters `archivedAt: null`).
- Produces: `UserResponseDto.hasNoRole: boolean`, and a new list-level mapper. **`toResponse` stays synchronous** — it is called from `create`, `findOne`, `me`, `updateAccountStatus` and `updatePreferences` (`users.service.ts:501,582`), and making it `async` would ripple through all five for no gain.

**No schema change.** The marker is derived at read time; a stored flag goes stale the moment a role is archived.

**`MeResponseDto extends UserResponseDto`, so `GET /users/me` gains the field too.** That is correct and intended — the account that has lost every role is exactly the one that needs to be told — but it changes a response shape, so it is named here and in the report rather than discovered later.

**Why `roleIds.length === 0` is the wrong test:** whichever way Q2 is answered, an account can hold ids pointing at archived roles. The marker must mean "resolves to no **live** role".

- [ ] **Step 1: Write the failing tests — with more than one user in the fixture**

```ts
const USERS = [userWith([ARCHIVED_ROLE_ID]), userWith([LIVE_ROLE_ID]), userWith([])];

describe('the "no role" marker', () => {
  it('marks an account whose roleIds all point at archived roles', async () => {
    expect((await controller.findAll())[0].hasNoRole).toBe(true);
  });

  it('marks an account holding no role id at all', async () => {
    expect((await controller.findAll())[2].hasNoRole).toBe(true);
  });

  it('does not mark an account holding one live role', async () => {
    expect((await controller.findAll())[1].hasNoRole).toBe(false);
  });

  it('resolves the live-role set once for a list of three, not once per row', async () => {
    await controller.findAll();
    expect(rolesService.findAll).toHaveBeenCalledTimes(1);
  });
});
```

The fourth test needs **three** users in the fixture: with one user, a per-row lookup also calls once and the test cannot fail.

- [ ] **Step 2: Run and watch them fail**

```bash
cd api && npm test -- users.no-role --runInBand
```

Expected: `hasNoRole` is `undefined`.

- [ ] **Step 3: Implement**

```ts
/** No live role resolves from `roleIds` — the account exists and can sign in
 *  but may do nothing. Derived per request: a role archived a second ago must
 *  show here at once. See ADR-0113. */
@ApiProperty() hasNoRole: boolean;
```

Add a list mapper that reads the live role ids once into a `Set` and maps every user against it. For the single-user paths, resolve the same set for that one account.

- [ ] **Step 4: Verify, then regenerate OpenAPI once**

```bash
cd api && npm test -- users --runInBand && npm run generate:openapi
cd .. && npm run test:guards:core
```

`api/openapi.json` is already modified in the working tree. Regenerate **once here** and once at the end of the batch, not after every task — Batch 2's closure records three different path counts from mid-batch regeneration.

---

### Task 6: E1 — `reset-roles`, written and not run

**Files:**
- Create: `api/src/bootstrap/reset-roles.ts` (logic), `api/src/reset-roles.ts` (runner), `api/src/bootstrap/reset-roles.spec.ts`
- Modify: `api/package.json`
- Read first: `api/src/bootstrap/seed-admin.ts` and `api/src/bootstrap-admin.ts` — **this pair is the structure to copy**; also `roles.service.ts:193-202`, `role-assignments.repository.ts:28-42`, `workflow-step.schema.ts`, `workflow-instance.schema.ts:10`

**Interfaces:**
- Produces: `resetRoles(models, options): Promise<ResetReport>` where

```ts
interface ResetReport {
  archivedRoles: { id: string; name: LocalizedText }[];
  rolelessAccounts: { id: string; email: string; name: LocalizedText }[];
  blockedSteps: { stepId: string; instanceIds: string[]; assigneeIds: string[] }[];
  detachedFrom: number;
}
```

- [ ] **Step 0: Split logic from runner — this is not optional**

`report-reserved-pair-holders.ts:128` calls `main()` **at module scope**. Importing that file to test it would open a database connection. Follow `seed-admin.ts` (exported functions, no `main`) plus `bootstrap-admin.ts` (the runner) instead. The spec file imports `bootstrap/reset-roles.ts` only. **`api/src/reset-roles.ts` is never imported by a test.**

- [ ] **Step 1: Write the failing tests against a real in-memory database**

`mongodb-memory-server` is already a devDependency (`package.json:80`). Use it. Mocked models cannot tell a true idempotency test from one whose second answer the test author typed in by hand — and Batch 2's closure names exactly that failure mode.

```ts
describe('reset-roles', () => {
  it('archives every non-system role and leaves the system ones alone', async () => {
    const report = await resetRoles(models);
    expect(report.archivedRoles.map((r) => r.id)).toEqual([CUSTOM_ROLE_ID]);
    expect(await roleModel.findById(SYSTEM_ROLE_ID)).toMatchObject({ archivedAt: null });
  });

  it('archives nothing on a second run and reports the same role-less accounts', async () => {
    const first = await resetRoles(models);
    const second = await resetRoles(models);
    expect(second.archivedRoles).toEqual([]);
    expect(second.rolelessAccounts).toEqual(first.rolelessAccounts);
  });

  it('keeps every account — an account is a person, and the person still works there', async () => {
    const before = await userModel.countDocuments();
    await resetRoles(models);
    expect(await userModel.countDocuments()).toBe(before);
  });

  it('lists an account whose only role was just archived', async () => { /* … */ });

  it('lists an account that already held no role before the run', async () => { /* … */ });
});
```

The second test is real here: the second call reads what the first actually wrote.

- [ ] **Step 2: Write the failing tests for the open-step report**

Per **Q1, default (b)**: the script **reports** the affected steps and changes none of them.

```ts
it('reports the step an InProgress instance is sitting on when an assignee lost every role', async () => {
  const report = await resetRoles(models);
  expect(report.blockedSteps).toEqual([
    { stepId: STEP_A_ID, instanceIds: [INSTANCE_ID], assigneeIds: [ROLELESS_USER_ID] },
  ]);
});

it('reports a Returned instance too — it also resumes from currentStepId', async () => { /* … */ });

it('says nothing about a step whose assignees all still hold a live role', async () => {
  expect((await resetRoles(models)).blockedSteps).toEqual([]);
});

it('changes no workflow step — assigneeIds belong to the definition, not the instance', async () => {
  const before = await stepModel.find().lean();
  await resetRoles(models);
  expect(await stepModel.find().lean()).toEqual(before);
});
```

The fourth is the decisive negative test. It pins Q1's default so that switching to option (a) later is a deliberate act with a red test in front of it, not a quiet edit. `Returned` is included because `workflow-instance.schema.ts:10` lists it and the repository resumes from `currentStepId` for it.

- [ ] **Step 3: Write the failing tests for detaching**

Per **Q2, default (a)**: detach, matching `RolesService.remove`.

```ts
it('pulls every archived role id out of the accounts that held it', async () => {
  await resetRoles(models);
  expect((await userModel.findById(USER_ID)).roleIds).toEqual([]);
});

it('reports how many accounts it detached from, rather than asserting it blindly', async () => {
  expect((await resetRoles(models)).detachedFrom).toBe(2);
});

it('leaves the Super Admin’s roleIds untouched', async () => { /* … */ });

it('detaches nothing on a second run', async () => {
  await resetRoles(models);
  expect((await resetRoles(models)).detachedFrom).toBe(0);
});
```

- [ ] **Step 4: Write the audit-row test**

```ts
it('writes one audit row for the run, through AuditLogsService and not the model', async () => {
  await resetRoles(models);
  expect(auditLogsService.record).toHaveBeenCalledTimes(1);
  expect(auditModel.create).not.toHaveBeenCalled();
});
```

`AuditLogsRepository` is append-only and protected (prompt §8). **Never write a row through the model.** The row's `actorId` is required (`audit-log.schema.ts:100`); the script takes it from the Super Admin account it resolves at start-up, and refuses if there is none:

```ts
it('refuses to run when no active Super Admin exists to own the audit row', async () => {
  await userModel.deleteMany({ /* super admins */ });
  await expect(resetRoles(models)).rejects.toThrow(/Super Admin/);
  expect(await roleModel.countDocuments({ archivedAt: { $ne: null } })).toBe(0);
});
```

The second assertion is what makes it a refusal rather than a partial run.

- [ ] **Step 5: Run every test above and watch them fail**

```bash
cd api && npm test -- bootstrap/reset-roles --runInBand
```

- [ ] **Step 6: Implement, then write the runner**

Header on the runner, following `report-reserved-pair-holders.ts`:

```ts
/**
 * Archives every non-system role and reports what that leaves behind (E1).
 *
 *   npm run reset:roles
 *
 * Runs after `report:reserved-pair-holders` and before `seed:role-templates`:
 * the report is meaningless once the roles it inspects are archived, and the
 * templates are what an administrator assigns afterwards. See ADR-0113 D1.
 *
 * Built with `tsc` into `dist-seed/`, never `nest build`. Refuses
 * NODE_ENV=production and any MONGODB_URI that is not this machine.
 */
```

```json
"reset:roles": "tsc -p tsconfig.seed.json && node --env-file-if-exists=.env dist-seed/reset-roles.js"
```

- [ ] **Step 7: Verify — and do not run it**

```bash
cd api && npm test -- bootstrap/reset-roles --runInBand && npx tsc --noEmit
cd .. && npm run test:guards:core
```

**`npm run reset:roles` is never typed.** The owner runs it.

---

### Task 7: The six templates as data, with a guard that reads them

**Files:**
- Create: `api/src/common/authz/role-templates.ts`, `api/src/common/authz/role-template-matrix.spec.ts`
- Modify: `scripts/test-guards.mjs`, `docs/engineering/guard-tests.md` — **in this same task**
- Read first: `capability-map.ts`, `permission-catalogue.ts`, `permission-implications.ts` (`missingImpliedReads`), spec §2.4 and §5

**Interfaces:**

```ts
export interface RoleTemplateGrant {
  resources: readonly PermissionResource[];
  actions: readonly PermissionAction[];
  /** Only where the capability map declares scopes; `null` everywhere else. */
  scope: 'own' | 'all' | null;
}

export interface RoleTemplate {
  key: string;
  name: LocalizedText;
  description: LocalizedText;
  grants: readonly RoleTemplateGrant[];
  deliberatelyAbsent: readonly string[];
}

export const ROLE_TEMPLATES: readonly RoleTemplate[];
```

Adding a resource is **one entry in a `resources` array**, which is the shape the prompt requires so events and seasons cost one line each.

**`scope` is `null` on every resource the map does not scope.** Only `articles`, `albums`, `videos` and `heroSlides` declare `scopes: ['own','all']` (`capability-map.ts:98,119,388,645`); spec §2.4 says "administrative resources carry no scopes". The first draft of this matrix wrote `scope: 'all'` across templates 1, 4 and 5 and would have failed its own sixth test.

**The matrix** (owner prompt §3.ج; where it and spec §5 differ, the prompt wins per CLAUDE.md §1):

| # | key | Template | Grants | Scope | Deliberately absent |
|---|---|---|---|---|---|
| 1 | `content-manager` | مسؤول المحتوى | `Read Create Update Archive Restore` on `articles`, `albums`, `videos`, `heroSlides` (`all`) and on `mediaAssets`, `pages`, `pageSections`, `navigationItems`, `navigationMenus` (unscoped); `ViewReports Export Print` on `commsReports`, `mediaReports`, `cmsReports` | `all` where offered | `Publish` · `Approve` · `ViewSensitive` · `PermanentDelete` |
| 2 | `editor` | محرر | `Read Create Update Archive` on `articles`, `albums` — **`videos` excluded, see Q6** | **`own`** | `Publish` · `Restore` · `Approve` · every group grant · `ViewSensitive` |
| 3 | `reviewer-approver` | مراجع ومعتمد | `Read` on the reviewable types; `workflowInstances:Approve`; `Read` on `workflowInstances`, `revisions`, `workflowActionHistory` | `null` | every `Create`/`Update`/`Archive` on content · `Publish` · every group grant |
| 4 | `sports-data-officer` | مسؤول البيانات الرياضية | `Read Create Update Archive Restore` on `athletes`, `athleteProfiles`, `coaches`, `officials`, `officialProfiles`, `clubs`, `clubTeams`, `disciplines`, `ageCategories`, `venues`, `countries` and the five history resources; `ViewReports Export Print` on `peopleReports`, `athleticsReports` | `null` | `Publish` · `Approve` · `PermanentDelete` · **`ViewSensitive` — joins in Batch 6a** |
| 5 | `governance-officer` | مسؤول الحوكمة | `Read Create Update Archive Restore` on `committees`, `federationPersonnel`, `federationAppointments`, `electionCycles`, `governanceDocuments`, `documents`, `organizationalStructure`, `presidentMessagePage`, `strategicPlansPage`, `visionMissionPage`; **`aboutFederationPage` takes `Read Update Archive Restore` only — the capability map gives it no `Create`**; `Publish` on those offering it; `ViewReports Export Print` on `governanceReports`, `documentsReports` — **see Q7** | `null` | **`PermanentDelete`** · `Approve` |
| 6 | `executive-viewer` | مشاهد الإدارة العليا | `ViewReports` on all nine group resources — **see Q8** | `null` | every write · `Export` · `Print` · `ViewSensitive` |

Two notes that must appear **as comments in the file**, not only here:

- Template 3's `workflowInstances:Approve` is **temporary**; Batch 4 replaces it with `<type>:Approve` per reviewable type (ADR-0106).
- Template 4's `ViewSensitive` is **absent on purpose** — those pairs enter the catalogue in Batch 6a.

There are nine group report resources, not ten — `platform-administration` has none. Spec §5's "all ten" is stale; Task 9 reconciles it.

- [ ] **Step 1: Write the failing guard**

```ts
describe('the six role templates', () => {
  it('is exactly these six keys, in this order', () => {
    expect(ROLE_TEMPLATES.map((t) => t.key)).toEqual([
      'content-manager', 'editor', 'reviewer-approver',
      'sports-data-officer', 'governance-officer', 'executive-viewer',
    ]);
  });

  it('names no pair that is absent from the catalogue', () => {
    const known = new Set(PERMISSION_CATALOGUE.map((e) => `${e.resourceType}:${e.action}`));
    expect(pairsOf(ROLE_TEMPLATES).filter((p) => !known.has(key(p)))).toEqual([]);
  });

  it('holds no superAdminOnly pair', () => {
    expect(pairsOf(ROLE_TEMPLATES).filter((p) => isSuperAdminOnly(p.resourceType, p.action))).toEqual([]);
  });

  it('holds PermanentDelete nowhere', () => {
    expect(pairsOf(ROLE_TEMPLATES).filter((p) => p.action === 'PermanentDelete')).toEqual([]);
  });

  it('gives every template at least one grant', () => {
    expect(ROLE_TEMPLATES.filter((t) => pairsOf([t]).length === 0)).toEqual([]);
  });

  it('declares a scope only where the capability map offers one', () => {
    for (const grant of everyGrant(ROLE_TEMPLATES)) {
      if (grant.scope === null) continue;
      for (const resource of grant.resources) {
        expect(scopesFor(resource)).toContain(grant.scope);
      }
    }
  });

  it('leaves no template able to change a resource it cannot read', () => {
    for (const template of ROLE_TEMPLATES) {
      expect({ [template.key]: missingImpliedReads(pairsOf([template])) })
        .toEqual({ [template.key]: [] });
    }
  });

  it.each([
    ['editor', 'Publish'], ['editor', 'Restore'], ['editor', 'Approve'],
    ['governance-officer', 'PermanentDelete'],
    ['sports-data-officer', 'ViewSensitive'], ['sports-data-officer', 'Approve'],
    ['content-manager', 'Publish'], ['content-manager', 'ViewSensitive'],
    ['executive-viewer', 'Export'], ['executive-viewer', 'Print'],
  ])('%s really does not hold %s', (key, action) => {
    expect(pairsOf([templateFor(key)]).some((p) => p.action === action)).toBe(false);
  });

  it('gives the executive viewer no write verb at all', () => {
    const writes: PermissionAction[] = ['Create', 'Update', 'Archive', 'Restore', 'Publish', 'Approve'];
    expect(pairsOf([templateFor('executive-viewer')]).filter((p) => writes.includes(p.action))).toEqual([]);
  });
});
```

The seventh test is the one the plan review asked for: the seed writes to the model directly and so bypasses `assertCoherent` (`roles.service.ts:372`), which means an incoherent template surfaces only as a `400` the first time an administrator edits it. The eighth turns `deliberatelyAbsent` from prose into an assertion — the prompt names those absences as requirements, and a documented absence nothing checks is a comment.

- [ ] **Step 2: Run and watch it fail**

```bash
cd api && npm test -- role-template-matrix --runInBand
```

Expected: module not found; then, as the matrix is written, the catalogue test catching real typos — that is the test earning its place.

- [ ] **Step 3: Write `role-templates.ts`**

Data only, no behaviour, **no Mongoose import** — the guard must run without a database, for the reason Batch 2 recorded for `ACTION_ORDER` (D7).

- [ ] **Step 4: Register the guard in both places, in this task**

`scripts/test-guards.mjs` → add `'role-template-matrix'` to `API_CORE_GUARD_NAMES` with a two-line comment matching its neighbours. The name is deliberate: a pattern of `role-templates` would also match `seed-role-templates.spec.ts` from Task 8, which needs a database and does not belong in a "no database" tier.

`docs/engineering/guard-tests.md` → the same guard, its tier, and what it fails on.

- [ ] **Step 5: Verify the runner actually picks it up**

```bash
cd .. && npm run test:guards:core
```

The package count must rise by **exactly one** against Batch 2's baseline of 10 packages / 88 tests. If it does not move, the basename pattern does not match — Batch 2's closure records 76 tests silently not running for exactly this reason. **Read the printed number; do not assume it.**

---

### Task 8: E2 — `seed-role-templates`, written and not run

**Files:**
- Create: `api/src/bootstrap/seed-role-templates.ts` (logic), `api/src/seed-role-templates.ts` (runner), `api/src/bootstrap/seed-role-templates.spec.ts`
- Modify: `api/package.json`
- Read first: `seed-admin.ts:126-155` (`seedPermissions` — the `$setOnInsert` precedent the spec names), `role-templates.ts` from Task 7

**Interfaces:**

```ts
interface SeedTemplatesReport {
  created: string[];
  untouched: string[];
  /** Named and not seeded, with the reason — see Q3. */
  refused: { key: string; reason: string }[];
  /** Template pairs with no row in `permissions`; non-empty means nothing was written. */
  unresolvedPairs: string[];
}

export const seedRoleTemplates = (models: SeedModels) => Promise<SeedTemplatesReport>;
```

`unresolvedPairs`, not `missingPairs` — `missingPairs` is the name of the single permission comparison in `user-authority.ts:70`, and a second thing wearing that name is how two comparisons start looking like one.

**Behaviour:**

- **Logic and runner are split**, exactly as in Task 6 Step 0. No `main()` in the file a test imports.
- Matched by **`templateKey`** — an optional, sparse-unique field on `Role` (owner decision
  2026-09-28, superseding Q4's default (b)). It is the one approved schema change of this
  batch. Matching runs across **all** roles, archived included, so a renamed template is not
  duplicated and an archived one is not resurrected.
- `isSystemRole: false` (ADR-0113).
- `$setOnInsert` on everything, so a re-run after an administrator's edit overwrites nothing.
- If a template names a pair with no row in `permissions`, the run **writes nothing at all** and names every unresolved pair.

- [ ] **Step 1: Write the failing tests, against an in-memory database, with the final return type**

```ts
describe('seed-role-templates', () => {
  it('creates five templates and refuses the editor, naming why', async () => {
    const report = await seedRoleTemplates(models);
    expect(report.created).toHaveLength(5);
    expect(report.refused).toEqual([{ key: 'editor', reason: expect.stringMatching(/own/i) }]);
  });

  it('creates nothing on a second run', async () => {
    await seedRoleTemplates(models);
    const second = await seedRoleTemplates(models);
    expect(second.created).toEqual([]);
    expect(second.untouched).toHaveLength(5);
  });

  it('does not overwrite an administrator’s edit to a template’s permissions', async () => {
    await seedRoleTemplates(models);
    await roleModel.updateOne({ 'name.en': 'Governance Officer' }, { $set: { permissionIds: [] } });
    await seedRoleTemplates(models);
    expect((await roleModel.findOne({ 'name.en': 'Governance Officer' })).permissionIds).toEqual([]);
  });

  it('seeds every template as an ordinary role', async () => {
    await seedRoleTemplates(models);
    expect(await roleModel.countDocuments({ isSystemRole: true })).toBe(0);
  });

  it('writes nothing at all when a template names a pair with no permission row', async () => {
    await permissionModel.deleteOne({ resourceType: 'albums', action: 'Archive' });
    const before = await roleModel.countDocuments();
    const report = await seedRoleTemplates(models);
    expect(report.unresolvedPairs).toContain('albums:Archive');
    expect(report.created).toEqual([]);
    expect(await roleModel.countDocuments()).toBe(before);
  });

  it('matches only non-system roles, so an archived legacy role named "Editor" is not mistaken for the template', async () => {
    await roleModel.create({ name: { en: 'Editor', ar: 'محرر' }, isSystemRole: false, archivedAt: new Date() });
    const report = await seedRoleTemplates(models);
    expect(report.untouched).not.toContain('editor');
  });
});
```

The fifth test asserts on the **document count**, not on `create` having been called — the implementation uses `bulkWrite`, so a `create` assertion would pass without proving anything. The sixth is Q4's hazard, pinned so the answer changes a red test rather than nothing.

**The first draft of this task expected six created in Step 1 and five in Step 4.** One number, from the first step: **five**, until Q3 is answered.

- [ ] **Step 2: Run and watch them fail**

```bash
cd api && npm test -- bootstrap/seed-role-templates --runInBand
```

- [ ] **Step 3: Implement**

Resolve every template's pairs to `permissions._id` in **one** query across all six, not one per template. Refuse before the first write if any pair is unresolved.

Template 2 is refused with the reason in the report: `PERMISSION_CATALOGUE` emits no `own`-scoped row (`permission-catalogue.ts:23-30`), and seeding it at `all` would widen an editor to platform-wide edit rights — the silent widening ADR-0113 alternative (A) was rejected for. One line changes when Q3 is answered.

- [ ] **Step 4: Add the npm script and verify**

```json
"seed:role-templates": "tsc -p tsconfig.seed.json && node --env-file-if-exists=.env dist-seed/seed-role-templates.js"
```

```bash
cd api && npm test -- bootstrap/seed-role-templates --runInBand && npx tsc --noEmit
cd .. && npm run test:guards:core
```

Confirm the core guard count rose by exactly one in Task 7 and **not again here** — this spec needs a database and must not be in the core tier.

**Never run it.**

---

### Task 9: Documentation, independent review, and the report

**Files:**
- Modify: `docs/superpowers/specs/2026-09-26-authz-authn-design.md` (§12, §5)
- Modify: `docs/design-system/ADR-0113-Role-Reset-And-Templates.md` — a **dated amendment** only; never rewrite an accepted ADR's body
- Create: `docs/superpowers/reports/batch-3.md`

- [ ] **Step 1: §12 — make the order explicit rather than renumber it**

§12 already runs `7b → 8 reset-roles → 9 seed-role-templates`, so the sequence is correct and the first draft of this plan was wrong to call it a fix. What is missing is the **names**: add `(E1)` and `(E2)` beside steps 8 and 9 and a one-line reason on each, so "7b, then E1, then E2" is readable without cross-referencing the ADR.

- [ ] **Step 2: §5 — three dated corrections, and no more**

- template 6 reaches **nine** group resources, not ten;
- template 4's `ViewSensitive` is **deferred to Batch 6a**;
- template 3's `workflowInstances:Approve` is **temporary**, replaced in Batch 4.

Record the full matrix as built, including each template's `deliberatelyAbsent` list, since the prompt requires the matrix to live in the spec. Batch 2's closure D8 records §5 as stale for templates 3–6; correct the part this batch built and **no section this batch did not touch**.

- [ ] **Step 3: Full guards, services stopped**

```bash
cd .. && npm run test:guards
```

Confirm no orphaned `node` process holds a port first (CLAUDE.md §32 procedure 1). Run the suite **more than once** before reporting any failure. Batch 2's closure recorded one pre-existing web failure (five navigation routes without pages) — if it reappears it is named as pre-existing, not fixed here.

- [ ] **Step 4: Independent review — before the report is written**

`superpowers:requesting-code-review` on a subagent that has not seen the implementation, then `superpowers:verification-before-completion`. The review runs **first** so its findings can go into the report; the first draft of this plan had them in the opposite order, where the review could not reach the document.

- [ ] **Step 5: Write `docs/superpowers/reports/batch-3.md`**

The nine sections of prompt §14, in order: summary · every changed file with its role · the tests including the negative ones and the run result · the new and changed endpoint table · the template matrix and the exact script order · the id measurement from Task 1 · decisions taken alone · defects found and not fixed · questions needing the owner's decision in prompt §10's format (the eight above, plus anything execution adds).

Report explicitly: which of §7.2's five sensitive verbs select an account today, and which are currently unreachable.

- [ ] **Step 6: Write the commit commands as text, and stop**

`git add` with full paths from the repository root, then `git commit -m`, for the **owner** to run — and say whether any commit breaks the build on its own (CLAUDE.md §33 item 4). Type neither.

---

## What the plan review changed

Eleven corrections, each verified against the code before being applied.

| # | The first draft said | The code says | Fix |
|--:|---|---|---|
| 1 | Matrix scope `all` on templates 1, 4, 5 | `scopes: []` on those resources (`capability-map.ts`); spec §2.4 | `scope: null` except the four scoped resources — the draft failed its own test |
| 2 | Service self-check via `id === actor.userId` | `isSelf` exists because a string compare let an upper-cased id through (`users.controller.ts:19-35`, closed 2026-09-27) | Move `isSelf`; add the upper-case negative test |
| 3 | `resolvePermissionsForRoles` in `/me/permissions` | `actor.permissions` is already resolved and carries `scope`; a second query is refused by decision (`users.controller.ts:76`) | Read `actor.permissions` |
| 4 | `GET /me/permissions` does not exist, no overlap noted | True, but `GET /users/me` returns `permissions` **without scope** (`me-response.dto.ts:8-11`) | Both stay; the overlap is reported |
| 5 | Sensitive = `Export` + `PermanentDelete` | A legacy role may still hold a reserved pair — the reason `report-reserved-pair-holders` exists | Implement §7.2 verbatim; present, do not change |
| 6 | E1 leaves `users.roleIds` | `RolesService.remove` detaches; 7b's own comment says E1 clears them | Q2, default detach |
| 7 | E1 re-points definition steps | Contradicts ADR-0106 alt (E), OUT-02 (P1), and disabled delegation | Q1, default report-only, with a negative test |
| 8 | Copy `report-reserved-pair-holders.ts`'s shape | It calls `main()` at module scope — importing it opens a database | Split logic/runner like `seed-admin` / `bootstrap-admin` |
| 9 | "Store a stable key, no schema change" | `Role` has no such field; strict mode drops it | Q4, default match on `name.en` |
| 10 | Task 8: six created, then five | Contradicted itself | Five, from Step 1 |
| 11 | Reflection test over a hard-coded list; one-user N+1 test; arity test; mocked idempotency | All incapable of failing | Route-derived guard; three-user fixture; assert calls not made; in-memory database |

Also corrected: `missingPairs` → `unresolvedPairs` (name collision with `user-authority.ts:70`); guard file renamed to `role-template-matrix.spec.ts` so the runner cannot sweep in a database-backed spec; audit rows through `AuditLogsService`, never the model; `Returned` instances included in E1's step scan; review moved before the report.

Raised and **not** resolved here, because they need the owner: Q1–Q4 and Q6–Q8 above.

---

## Self-Review

**Spec coverage.** §2.4 scopes — Task 7's sixth test and Q3. §3.1/§3.2 — in code from Batch 2 with tests; Tasks 2 and 3 add the missing layers. §3.3 — Task 2. §3.4 reserved pairs — declared (`capability-map.ts:575,622`), guarded by `super-admin-only.spec.ts`; Task 7 extends the guarantee to templates. §5 — Tasks 7 and 8. §7.2 — Task 4, verbatim. §10.1 — Task 4 and Task 5. §12 — Task 9.

**Placeholders.** Every code step carries real code. Four places name a file to read rather than reproducing it — `seed-admin.ts`/`bootstrap-admin.ts`, `users.controller.ts:19-35`, `permission-implications.ts`, `capability-map.ts` — each an existing precedent to match exactly, where a copy in the plan would be a second source that can drift.

**Type consistency.** `accountClassFor(permissions, holdsSystemRole)` identical in Task 4 Steps 3–5. `resetRoles(models, options) → ResetReport` declared once and used in Steps 1–4. `seedRoleTemplates(models) → SeedTemplatesReport` declared once, with `refused` present from the first test.

**Review Focus.** All six have a test in the owning task: 1 → Task 7 Step 1 (second test); 2 → Task 7 Step 1 (seventh); 3 → Task 6 Step 1 (second); 4 → Task 5 Step 1 (first); 5 → Task 4 Step 1 (third and fourth); 6 → Task 6, and it is a stated reason for Q1's default.

**Dependencies on open questions.** Tasks 1–5 depend on none. Task 6 carries Q1 and Q2 as defaults with negative tests pinning them. Tasks 7 and 8 carry Q3, Q4 and Q6–Q8 the same way. Every default is the reversible choice, and each is one line to change.

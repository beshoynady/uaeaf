# UAEAF — Backend Build & Test Plan (NestJS / Mongoose / Jest)

**Document ID:** BE-PLAN-010
**Version:** 1.3.0
**Status:** Environment verified. Planning-only — no application code written yet.
**Prepared:** 2026-09-02. Revised same day — added §6 (documentation & commenting standard), §7 (code simplicity standard), the JWT-embedded permission design in §4.4, and the confirmed JWT lifetimes in §4.3 (`JWT_ACCESS_EXPIRY=15m`, `JWT_REFRESH_EXPIRY=7d` — both now confirmed, no longer open).
**Stage:** Kickoff / setup verification, per task instruction. Precedes the detailed Week 1 implementation prompt.

---

## 0. Document Control

| Field | Value |
|---|---|
| Owner | Backend Engineering, reviewed by Product Owner |
| Governs | `E:\uaeaf\uaeaf-project\api` only — NestJS/Mongoose/Jest conventions, environment state, and the 4-week build checklist |
| Does not govern | Frontend (`apps/*`, `packages/*`), UAEAF Design System, Figma, any UI/UX governance in the root `CLAUDE.md` |
| Modification safety | New file. No FigJam node, schema field, root `package.json`, or existing doc was modified to produce it. `E:\uaeaf\uaeaf-project\api` exists on disk but is empty — nothing was scaffolded into it. |
| Primary sources | FigJam file `2ZC01ZbUx3rL7czDXWi34c`, section "03 — Physical Model" (node `77:5543`) as verified in `09-Integrity-Completeness-Security-Audit.md`; `08-Workflow-Scenario-Review.md`; live environment inspection (this session, 2026-09-02) |
| Explicitly ignored | `07-Mongoose-Schema-Specification.md` (stale, per task instruction) |
| Change process | Same as other `docs/product` documents — superseded by a later dated revision, not edited in place once Week 1 begins |

---

## 1. Purpose & Scope

This document is the Step 5 deliverable of the backend kickoff task: an environment/dependency verification report, plus a build-and-test conventions document the Week 1–4 implementation prompts will build on. It does not contain a task-by-task implementation plan for any specific week — that arrives as a separate, detailed prompt per week, starting with Week 1.

**In scope:** environment verification; `api/` folder structure convention; `BaseSchema`/shared-repository pattern; Jest unit/e2e testing conventions; the code documentation & commenting standard (§6); the week-by-week checklist (mirrors the agreed 4-week order verbatim).

**Out of scope:** any Mongoose schema field definitions, controllers, services, or tests for a specific domain — those are written when their week's detailed prompt arrives. `departments` (removed 2026-09-02). Domain 3 championships/results/records, Domain 4 Content, Domain 9 Sponsorship — post-launch, not part of this 4-week plan.

---

## 2. Environment & Dependency Verification Report

### 2.1 Node.js

| Check | Result |
|---|---|
| Installed version | **v24.14.1** (`node --version`) |
| npm version | **11.19.0** |
| NestJS's current minimum | `>= 20`, read directly off the published package (`npm view @nestjs/core engines` → `{ node: '>= 20' }`), not assumed from training knowledge |
| Verdict | **PASS** — installed version exceeds the floor by 4 major versions |

### 2.2 NestJS CLI

`nest --version` → command not found. **Not installed globally.**

**Recommendation (not yet actioned):** install `@nestjs/cli` as a project devDependency inside `api/` (via `npx @nestjs/cli new .` for the initial scaffold) rather than globally. A global CLI drifts out of sync with the version a given checkout expects; a local devDependency pins the version in `api/package.json` and is invoked via `npx nest` or an npm script. This is a recommendation, not a decision made on your behalf — flag if you'd rather install it globally.

### 2.3 MongoDB

| Check | Result |
|---|---|
| Local instance | **Running.** Windows service `MongoDB` (Status: Running), process `mongod` (PID 4500) |
| Version | `db version v8.2.2` |
| Listening | `127.0.0.1:27017`, confirmed via `Get-NetTCPConnection` (state `Listen`) |
| Reachability | Confirmed live — `mongosh --eval "db.runCommand({ping:1})"` returned `{ ok: 1, ... }` |
| Auth | No credentials required to reach it locally (ping succeeded unauthenticated against the default connection) |
| `mongosh` CLI | Installed, v2.8.3 |

**Verdict: PASS**, no remote connection string needed for local development. **Open item for you to confirm, not guessed:** the database name to use (e.g. `uaeaf` vs `uaeaf_dev`) and whether a separate `uaeaf_test` database (or `mongodb-memory-server`, see §5.3) should back Jest e2e runs. Proposed default below in §2.5, pending your confirmation.

### 2.4 Other required packages

Every version below was read live from the npm registry on 2026-09-02 (`npm view <pkg> version`), not assumed:

| Package | Latest | Purpose |
|---|---|---|
| `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` | 12.0.1 / — / 12.0.1 | Framework core (bundled by `nest new`) |
| `@nestjs/cli` | 12.0.0 | Scaffolding/build CLI — see §2.2 |
| `@nestjs/mongoose` | 12.0.0 | Mongoose integration (`forRootAsync`, `@Schema`/`@Prop` decorators) |
| `mongoose` | 9.9.4 | MongoDB ODM |
| `@nestjs/jwt` | 12.0.1 | JWT signing/verification |
| `@nestjs/passport`, `passport`, `passport-jwt` | 12.0.0 / 0.7.0 / 4.0.1 | Passport strategy integration for the JWT guard |
| `@nestjs/config` | 12.0.0 | Validated environment configuration (§4.3) |
| `class-validator`, `class-transformer` | 0.15.1 / 0.5.1 | DTO validation/serialization |
| `@nestjs/testing` | 12.0.1 | Jest + DI test harness (bundled by `nest new`) |
| `@nestjs/swagger` | 12.0.1 | OpenAPI/Swagger doc generation — required per this project's standing documentation-sync workflow (Swagger is regenerated after every code change, not optional here) |
| `bcrypt` | 6.0.0 | Password hashing. Chosen over `argon2` as the default — it's what NestJS's own auth documentation uses and needs no native build step beyond the prebuilt binary; flag if you'd rather use `argon2` instead |
| `helmet`, `compression` | 8.3.0 / 1.8.1 | Standard Express hardening middleware for an API that will be reachable outside localhost |
| `jest`, `ts-jest`, `@types/jest` | 30.5.1 / 29.4.12 / 30.0.0 | Test runner (bundled by `nest new`, versions confirmed current) |
| `supertest`, `@types/supertest` | 7.2.2 / 7.2.1 | E2E HTTP assertions (§5.2) |
| `mongodb-memory-server` | 11.2.0 | Ephemeral, real MongoDB instance for e2e/integration tests — avoids both over-mocking Mongoose query behavior and touching the dev database (§5.3) |
| `@compodoc/compodoc` | 2.0.0 | Generated code-reference documentation from TSDoc comments + Nest decorators (§6.2) |

None of these are installed yet — `api/` is empty. Nothing was installed automatically; installation happens as the first step of the Week 1 implementation prompt, not as part of this planning deliverable.

**Nothing here required credentials only you hold** — MongoDB is local and unauthenticated, and every package above is public on the npm registry.

### 2.5 Project location

Confirmed: `E:\uaeaf\uaeaf-project\api` exists on disk and is **empty** — ready for a fresh `nest new .` scaffold. It sits outside the root `package.json`'s workspace globs (`"workspaces": ["apps/*", "packages/*"]`), so it will **not** be picked up by npm workspaces — it is genuinely standalone, exactly as instructed. The existing frontend (`apps/dashboard`, `apps/web`, `packages/content`, `packages/design-tokens`, `packages/ui`) is untouched; nothing in this session read or modified any file under those paths.

**Proposed default (pending your confirmation, not silently decided):** Mongo database name `uaeaf` for development, `uaeaf_test` reserved if a real (non-memory-server) test database is ever needed. `MONGODB_URI=mongodb://127.0.0.1:27017/uaeaf` in `.env`.

---

## 3. Folder Structure Convention

Feature-module organization (by domain, not by technical layer) — each module is self-contained with its own controller, service, repository, schema, and DTOs, matching the pattern in the newly-installed `nestjs-best-practices` skill's `arch-feature-modules` rule. `common/` holds only genuinely cross-cutting code shared by every domain (base schema, base repository, guards, interceptors, decorators, filters) — a class only belongs there if two or more unrelated domains need it verbatim.

```
api/
├── src/
│   ├── main.ts                          # bootstrap: ValidationPipe, Helmet, Swagger, CORS
│   ├── app.module.ts
│   ├── common/
│   │   ├── schemas/
│   │   │   └── base.schema.ts           # §4.1
│   │   ├── repositories/
│   │   │   └── base.repository.ts       # §4.2
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts      # @Public() — bypasses JwtAuthGuard
│   │   │   ├── permissions.decorator.ts # @RequirePermission(resourceType, action)
│   │   │   └── current-user.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── permissions.guard.ts     # §4.4, checks against permissions.action enum
│   │   ├── interceptors/
│   │   │   └── audit-log.interceptor.ts # §4.5
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   └── interfaces/
│   │       └── jwt-payload.interface.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── validation.schema.ts         # Joi schema, fail-fast at boot
│   ├── database/
│   │   └── database.module.ts           # MongooseModule.forRootAsync
│   └── modules/
│       ├── auth/
│       │   ├── dto/
│       │   │   └── login.dto.ts
│       │   ├── strategies/
│       │   │   └── jwt.strategy.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.service.spec.ts
│       │   └── auth.module.ts
│       ├── users/
│       │   ├── dto/
│       │   ├── schemas/
│       │   │   └── user.schema.ts       # extends BaseSchema
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   ├── users.service.spec.ts
│       │   ├── users.repository.ts
│       │   ├── users.repository.spec.ts
│       │   └── users.module.ts
│       ├── roles/                       # same shape as users/
│       ├── permissions/                 # same shape as users/
│       └── audit-logs/                  # same shape as users/, write-side only in Week 1
├── test/
│   ├── jest-e2e.json
│   └── e2e/
│       ├── auth.e2e-spec.ts
│       └── users.e2e-spec.ts
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

Every subsequent week adds new directories under `modules/` only — `common/`, `config/`, and `database/` are Week 1 deliverables and should need no structural changes after that (only new guard/decorator/interceptor **files** as new cross-cutting needs appear, e.g. a workflow-state interceptor in Week 2).

---

## 4. BaseSchema & Shared Repository Pattern

### 4.1 `BaseSchema`

Grounded in the field pattern `09-Integrity-Completeness-Security-Audit.md` verified as consistent across the 81 live collections — `createdAt`/`updatedAt` as `DateTime`, `createdBy`/`updatedBy` as `ref → users`, and soft delete via `archivedAt`/`archivedBy` rather than physical deletion (consistent with `permissions.action` treating `Delete` and `HardDelete` as two distinct, separately-gated actions — see §4.4). This is not an invented convention; it is the one the schema already uses everywhere, made concrete in code:

```typescript
// src/common/schemas/base.schema.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export abstract class BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  archivedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  archivedBy: Types.ObjectId | null;
}
```

Each domain schema extends it and is built with `SchemaFactory.createForClass`, which walks the prototype chain and picks up the inherited `@Prop` metadata:

```typescript
// src/modules/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User extends BaseSchema {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: [Types.ObjectId], ref: 'Role', default: [] })
  roleIds: Types.ObjectId[];

  @Prop({ type: String, enum: ['Active', 'Suspended', 'Deactivated'], default: 'Active' })
  accountStatus: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

`roleIds` as a `Types.ObjectId[]` and `accountStatus` as a 3-value enum match the field shapes the audit confirmed on the live `users` table — this is not a placeholder guess at the shape.

### 4.2 `BaseRepository<T>`

Encapsulates the query logic every domain repository needs (soft-delete-aware finds, soft delete itself), keeping services free of raw Mongoose filter objects — the `arch-use-repository-pattern` rule this project's newly-installed skill documents:

```typescript
// src/common/repositories/base.repository.ts
import { Model, FilterQuery, UpdateQuery, Types } from 'mongoose';

export abstract class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.model.findOne({ _id: id, archivedAt: null } as FilterQuery<T>).exec();
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne({ ...filter, archivedAt: null } as FilterQuery<T>).exec();
  }

  async find(filter: FilterQuery<T> = {}): Promise<T[]> {
    return this.model.find({ ...filter, archivedAt: null } as FilterQuery<T>).exec();
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async updateById(id: string, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  /** Soft delete — the default. HardDelete is a separate, more privileged
   *  operation (see permissions.action, §4.4) and is NOT exposed here;
   *  a domain repository that legitimately needs it defines its own
   *  hardDeleteById() explicitly, so the capability is opt-in per module. */
  async softDelete(id: string, archivedBy: Types.ObjectId): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, { archivedAt: new Date(), archivedBy }, { new: true })
      .exec();
  }
}
```

Domain repositories extend this for the common cases and add named methods for anything domain-specific (`findByEmail`, `findActiveByRole`, etc.) — never a `findWithFilter(arbitraryQuery)` escape hatch that lets a service reach back into raw Mongoose filters.

### 4.3 Configuration

`@nestjs/config` with `registerAs` namespaces (`app`, `database`, `jwt`) and a `validationSchema` that fails fast at boot on a missing `JWT_SECRET`, `MONGODB_URI`, etc. — no `process.env` access outside `config/*.ts`. **Updated 2026-09-02:** originally Joi, bridged through `ConfigModule`'s alternate `validate` hook since this `@nestjs/config` version's native `validationSchema` option expects a Standard Schema validator; swapped to Zod (the officially-supported Standard Schema library) wired through the native `validationSchema` option directly, removing the bridging workaround. Same env vars, same fail-fast behavior — see `api/README.md`.

**JWT lifetimes — confirmed, not placeholders:**

| Constant | Value | Status |
|---|---|---|
| `JWT_ACCESS_EXPIRY` | `15m` exactly | **Confirmed 2026-09-02.** This is the security boundary that makes §4.4's cached-permissions design safe — see below. |
| `JWT_REFRESH_EXPIRY` | `7d` | **Confirmed 2026-09-02.** |

Both constants live in `jwt.config.ts` (via `registerAs('jwt', ...)`), read through `ConfigService`/the namespaced injection token — never hardcoded inline in `AuthService` or anywhere else.

The refresh token itself carries **no permissions** — it only allows minting a new 15-minute access token. Minting that new access token re-resolves the user's *current* `roleIds` → `permissionIds` → `permissions` **and** `accountStatus` at that exact moment, so a role change or a suspension is picked up the next time the access token is refreshed, worst case ~15 minutes after it happened — not indefinitely, per the exact TTL above.

### 4.4 RBAC guard

Grounded in the confirmed live schema: `permissions.resourceType` is a free (not enum) string, and `permissions.action` is the closed enum `Create | Read | Update | Delete | HardDelete | Approve | Publish | EditProtectedData` (`09-Integrity-Completeness-Security-Audit.md` §C2/§4). `users.roleIds` and `roles.permissionIds` are both N:N `ObjectId[]`.

**Performance design:** the `(resourceType, action)` permission set is resolved **once, at login** (`users.roleIds` → `roles.permissionIds` → `permissions`), flattened, and embedded in the JWT payload. `PermissionsGuard` checks a route's `@RequirePermission('users', 'Update')` declaration against that embedded set on every request — it does **not** re-query `users`/`roles`/`permissions` per request, the same `Reflector`-based pattern as `JwtAuthGuard`/`@Public()` otherwise uses for metadata, just reading from `request.user` instead of the database.

**Trade-off this creates, to be made explicit in the Week 1 implementation, not left implicit:** a permission change (role edited, role reassigned, permission added/removed) or an account suspension (`accountStatus=Suspended`) does not take effect for an already-issued access token until it expires — bounded to **exactly 15 minutes** by the confirmed `JWT_ACCESS_EXPIRY` (§4.3), not "on the order of minutes." That exact bound is the deliberate decision that makes skipping a per-request DB check acceptable; it must be documented on `AuthService`/`PermissionsGuard` (per §6.1's TSDoc requirement) rather than discovered later as a surprise. If a specific case ever needs to revoke *immediately* rather than within 15 minutes, that has to go through refresh-token revocation, not a shorter access-token TTL "for that case" — a distinction worth carrying into Week 1 rather than conflating the two.

**Startup validation (third confirmed requirement, alongside cached-permission resolution and AccessDenied logging):** every `permissions.resourceType` value seeded into the database is checked at application startup against Mongoose's actually-registered collection names (`mongoose.modelNames()` or equivalent) — a simple boot-time check, not a generic validation framework. See §7.6 for why this stays a plain check rather than growing into an abstraction.

**Not decided here, carried forward as an open item for the Week 1 prompt (§8):** whether writes to `users.roleIds` / `roles.permissionIds` / `permissions` route through `AuditLogInterceptor` like every other mutation, or need dedicated handling — the schema audit (§C7) found this unverifiable from the schema alone.

### 4.5 Audit interceptor

A global `AuditLogInterceptor` (registered via `APP_INTERCEPTOR`) writes to `auditLogs` on every mutating request (`POST`/`PATCH`/`PUT`/`DELETE`) it sees succeed, capturing `entityId`, `ipAddress`, `userAgent`, and — where the service surfaces it — `previousValue`/`newValue`, matching the fields the audit confirmed exist on the live `auditLogs` collection.

---

## 5. Jest Testing Approach

### 5.1 Unit tests (services, guards, interceptors, repositories with non-trivial queries)

`@nestjs/testing`'s `Test.createTestingModule`, every dependency mocked via `useValue`/`jest.fn()` — never real DI against a live Mongoose connection, never manual `new Service(...)` construction (bypasses DI and is the specific anti-pattern the `test-use-testing-module` rule calls out). Test files are colocated (`x.service.spec.ts` next to `x.service.ts`).

**Coverage expectations for Week 1:**
- `common/guards/*`, `common/interceptors/*`, `common/decorators/*` — these are the enforcement points every later domain depends on; target effectively full branch coverage (allow/deny, public/protected, present/missing permission).
- `modules/*/​*.service.ts` — full coverage of business-logic branches (e.g. `AuthService`: valid login, wrong password, inactive account, expired refresh token; `UsersService`: create, duplicate email, soft delete).
- `modules/*/*.repository.ts` — unit-test only methods with real logic beyond a `BaseRepository` passthrough (e.g. a custom `findActiveByRole`); a repository method that's a one-line call to an inherited `BaseRepository` method is exercised via e2e instead of duplicated in a mock-heavy unit test.
- Controllers — thin (delegate to a service, apply decorators); not separately unit-tested where an e2e test already exercises the same route through the full pipe/guard/interceptor stack. A controller earns a unit test only if it contains real branching logic of its own.

No fixed percentage gate is set for Week 1 beyond "the branches above are covered" — a hard numeric threshold (e.g. `coverageThreshold` in Jest config) gets introduced once Week 2 establishes what a realistic per-module baseline looks like across more modules; setting one off a single week's module set risks being either meaningless (set too low) or a false blocker (set too high off an unrepresentative sample).

### 5.2 E2E tests (Supertest against a fully bootstrapped app)

`Test.createTestingModule({ imports: [AppModule] }).compile()`, `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))` — the exact same pipe configuration `main.ts` uses in production, per the `test-e2e-supertest` rule. Scope for Week 1:
- `POST /auth/login` — success, wrong credentials, inactive account.
- `GET /users/me` — 401 with no token, 200 with a valid one.
- A representative protected route exercised with a user that **has** the required permission (200) and one that **doesn't** (403) — proves the RBAC guard is wired end-to-end, not just correct in isolation.

### 5.3 Test database isolation

`mongodb-memory-server` spins up a real, ephemeral `mongod` process per test run (or per suite) — Mongoose schema validation, unique-index enforcement, and actual query execution all run for real, without the risk of an e2e run touching the local dev database at `127.0.0.1:27017`, and without over-mocking the query layer the way a fully-stubbed repository would (the `arch-use-repository-pattern` rule's whole point is to make query logic testable, not to make it untested). The in-memory instance's URI is injected into `MongooseModule.forRootAsync` via a `.env.test`-scoped `ConfigService` override in the e2e `TestingModule`.

---

## 6. Code Documentation & Commenting Standard

Applies to Week 1 and every week after. English throughout — code, comments, generated docs.

### 6.1 Comment requirements

- **TSDoc (`/** ... */`) on every exported class, service method, guard, interceptor, and DTO** — not a one-line restatement of the name, but what it does, parameters, return value, and thrown exceptions. Example, showing the level of detail expected (and cross-referencing the design decision in §4.4 rather than re-explaining it inline):

  ```typescript
  /**
   * Verifies the requesting user holds the permission declared by
   * @RequirePermission() on the target route handler.
   *
   * Resolution is read from the cached permission set embedded in the
   * JWT at login time — this guard does NOT query
   * users → roles → permissions on every request (see BE-PLAN-010 §4.4
   * for the performance rationale and its staleness trade-off).
   *
   * @throws ForbiddenException if the required (resourceType, action)
   *   pair is not present in the user's resolved permission set.
   *   Every denial is also logged via AuditLogInterceptor as an
   *   AccessDenied event.
   */
  @Injectable()
  export class PermissionsGuard implements CanActivate { ... }
  ```

- **Inline comments explain WHY, not WHAT.** The code already shows what it does; restating that is noise. Comment on non-obvious business rules — especially ones this project explicitly decided, so the reasoning survives past the PR that made it:

  ```typescript
  // isSystemRole=true blocks rename/delete — protects seeded RBAC-critical
  // roles (e.g. Super Admin) from accidental breakage. Decision: 2026-09-02.
  if (role.isSystemRole) {
    throw new ForbiddenException('System roles cannot be modified.');
  }
  ```

  Do **not** write `// loop through users` above a loop that obviously loops through users.

- **File-level header** at the top of every service/guard/interceptor/module file: one or two sentences on the file's responsibility, plus — where relevant — a pointer to the FigJam collection/domain it implements, e.g. `// Implements: roles collection, Domain 8 — Platform Administration (FigJam node 103:7869)`.

- **DTOs:** every `@ApiProperty()` carries a `description`, not just a type — this feeds the generated Swagger docs and the TSDoc-based reference docs from the same source, so the two never drift out of sync from each other.

### 6.2 Generated + written documentation

1. **Compodoc** (`@compodoc/compodoc`, devDependency, §2.4) — the standard NestJS documentation generator. `npm run docs:generate` outputs to `api/documentation/` (gitignored, regenerated on demand, never committed). It reads the TSDoc comments from §6.1 plus Nest decorators automatically into a navigable site — modules, controllers, services, classes, a dependency graph, and a documentation-coverage percentage. This is the primary "how the code works" reference; it needs near-zero manual upkeep if §6.1 is actually followed, which is exactly why §6.1 is a requirement and not a suggestion.

2. **`api/README.md`** — written by hand, covering: what the application is (one paragraph); local setup (env vars, MongoDB requirement, install/run/test commands); a pointer to §3 of this document for the folder structure convention rather than duplicating it; how to regenerate Compodoc and Swagger; and a pointer to `docs/product/*.md` for architecture decisions — this project's existing decision-record location, not a new one.

3. **Swagger/OpenAPI** (already required, §2.4) — the "how the API works" reference (endpoints, request/response shapes), distinct from Compodoc's "how the code works" reference. Both are needed; they serve different readers (API consumers vs. future backend developers).

4. **No new ADR/decision-record system.** This project already has one — `docs/product/*.md` (e.g. `08-Workflow-Scenario-Review.md`, `09-Integrity-Completeness-Security-Audit.md`, this document). Any architectural decision made during implementation continues to go there; do not invent a parallel format.

### 6.3 Verification

At the end of Week 1, report the Compodoc-generated documentation-coverage percentage alongside the Jest coverage already required by §5 — both are evidence this standard was actually followed, not just described.

---

## 7. Code Simplicity Standard

**Confirmed 2026-09-02.** This is about *how* the already-agreed pieces get built, not *whether* they exist — nothing in §3–§4 (BaseSchema, BaseRepository, guards, interceptors) or the three confirmed functional requirements (resourceType startup validation, JWT-cached permission resolution, AccessDenied logging) is being removed or reduced by this section.

**Rule:** implement everything as simply and directly as NestJS's own idiomatic conventions allow. Do not add complexity beyond what a feature genuinely requires.

### 7.1 No extra design patterns beyond what's already agreed

No Factory, Strategy, Observer, Builder, or similar pattern layered on top of NestJS's own DI/module system unless the live FigJam schema itself forces it (e.g. a genuinely polymorphic `entityType`/`entityId` field, of which the schema already has several — those get a `switch`/discriminated-union handled directly, not a generic polymorphism framework). If an abstraction is being introduced "for future flexibility" that the current week doesn't actually need yet, it waits until a real second use case exists — it is not added speculatively now.

### 7.2 Straightforward control flow

Plain `async`/`await`, early returns for guard clauses, no clever one-liners or chained ternaries that trade readability for brevity. A method should read top-to-bottom without needing a second pass to follow what it does.

### 7.3 Short, single-purpose functions/methods

A service method doing several distinct things is split into named private methods with clear names — logic is not compressed into one dense block "to keep the file smaller."

### 7.4 No unnecessary metaprogramming or dynamic magic

Stick to NestJS's own decorator conventions (`@Injectable`, `@Schema`, `@Prop`, etc.) — no custom decorator factories, reflection-based dynamic module loading, or similar, unless a specific requirement genuinely needs it.

### 7.5 Field/variable names match the FigJam field names exactly

Already the project convention (§4.1's `roleIds`, `accountStatus`, etc. are taken verbatim from the live schema). No renaming for "cleaner code" that then requires a mapping layer to translate back to the schema.

### 7.6 The three confirmed functional requirements, implemented as directly as possible

- **`resourceType` seed validation** (§4.4) → a simple startup check comparing seeded `permissions.resourceType` values against Mongoose's registered collection names. Not a generic "validation framework."
- **Cached permissions in the JWT** (§4.4) → the flattened `(resourceType, action)` array goes directly into the JWT payload at login/refresh. No separate caching service or abstraction layer for Week 1 — a Redis layer is a legitimate future addition *if* JWT payload size becomes a real, measured problem, not a preemptive one.
- **AccessDenied logging** (§4.5) → a direct write to `auditLogs` from inside `PermissionsGuard` at the point of denial. Not a generic event-bus/pub-sub system.

### 7.7 Why this matters

A future developer — per the commenting/documentation standard in §6 — should be able to open any service file and understand it without first learning a project-specific abstraction layer. NestJS's own conventions (modules, providers, DI, decorators) are already the professional standard for a backend this size; nothing further needs to be layered on top of them.

---

## 8. Known Open Items Feeding Into Week 1 (flagged, not resolved here)

Per the No-Guessing principle already in use on this project's own audit documents, these are surfaced for the Week 1 prompt to settle explicitly, not silently decided in this planning document:

~~1. `roles.isSystemRole` protection~~ — **resolved 2026-09-02.** Added to the live FigJam board (Boolean, default false); `RolesService.rename()`/`.remove()` throw `ForbiddenException` when true, TDD-covered.
~~2. RBAC-change auditing~~ — **resolved by existing design, no bespoke handling needed.** `AuditLogInterceptor` is a global `APP_INTERCEPTOR` on every mutating request, so `PATCH /roles/:id/permissions`, `PATCH /users/:id/roles`, and writes to `permissions` all flow through it identically to any other mutation — verified in `test/e2e/auth-rbac.e2e-spec.ts`.
3. **Database name and test-database strategy** (§2.5) — `uaeaf` proposed as the dev database name; `mongodb-memory-server` proposed for e2e in place of a persistent `uaeaf_test` database. Both are proposals pending your confirmation, not settled.
4. **`bcrypt` vs `argon2`** for password hashing (§2.4) — superseded: neither is in use. `bcrypt`'s native install script is blocked by this environment's npm script-allowlist policy, so `bcryptjs` (pure JS, same algorithm) is used instead — see `api/README.md`.

~~5. `JWT_REFRESH_EXPIRY` (§4.3)~~ — **resolved 2026-09-02, confirmed at `7d`.** No longer open.
~~6. `auditLogs.action` has no `AccessDenied`/`Deny` value~~ — **resolved 2026-09-02, then extended same day.** `AccessDenied` added to the live enum; `PermissionsGuard` now writes a real `auditLogs` row on **every** denial where an authenticated actor is present. The live board also made `entityId` explicitly optional the same day (`entityType` required only when `entityId` is set), specifically to represent a collection-level denial (list/create route, no `:id` yet) as `entityId: null` rather than needing a Logger-only fallback — so the earlier Logger-fallback for that case has been removed; `Logger` now only covers the defensive no-authenticated-actor case, which should never occur since `JwtAuthGuard` runs first. Not re-opened as a new open item; flagged here for visibility only.
7. **Brute-force login lockout** (addendum, confirmed 2026-09-02) — implemented: `users.failedLoginAttempts`/`lockedUntil` (added to the live board), `LOCKOUT_THRESHOLD=5`/`LOCKOUT_DURATION_MINUTES=15` in `src/config/auth.config.ts`. A locked account is rejected before password comparison, with a deliberately distinct message; an attempt during an active lockout does not extend it. TDD unit tests (`UsersService`, `AuthService`) plus `test/e2e/login-lockout.e2e-spec.ts` cover the 5th-attempt trigger, the no-further-increment-while-locked behavior, and reset-after-expiry.

None of these block continuing past Week 1 — they're small enough to settle as they come up.

---

## 9. Week-by-Week Checklist

Mirrors the agreed build order exactly — not resequenced here.

### Week 1 (2026-09-02 → 2026-09-08) — Foundation + Domain 8 + Auth/RBAC/Audit
- [ ] `nest new .` scaffold in `api/`, folder structure per §3
- [ ] `BaseSchema` + `BaseRepository<T>` (§4.1–4.2)
- [ ] `MongooseModule.forRootAsync` wired to local MongoDB (§2.3, §2.5)
- [ ] `ConfigModule` with Joi validation (§4.3)
- [ ] `users`, `roles`, `permissions` modules (schemas, repositories, services, controllers) — **`departments` explicitly excluded** (removed 2026-09-02)
- [ ] `AuthModule` — JWT strategy, login, refresh token; `JWT_ACCESS_EXPIRY=15m` and `JWT_REFRESH_EXPIRY` set in `jwt.config.ts` only, never hardcoded inline (§4.3)
- [ ] Refresh flow re-resolves `roleIds`/`permissionIds`/`accountStatus` at mint time, not just at original login (§4.3)
- [ ] `JwtAuthGuard`, `PermissionsGuard`, `@Public()`/`@RequirePermission()` decorators (§4.4)
- [ ] `resourceType` startup validation against Mongoose's registered collection names (§4.4, §7.6)
- [ ] `AuditLogInterceptor` + `auditLogs` module (write path only), including direct AccessDenied writes from `PermissionsGuard` (§7.6)
- [ ] Implementation follows the Code Simplicity Standard (§7) — no unrequested design patterns, short single-purpose methods, FigJam-exact field names
- [ ] Unit tests per §5.1 for every item above
- [ ] E2E tests per §5.2
- [ ] Swagger doc generation wired (per this project's standing doc-sync workflow)
- [ ] TSDoc comments, file headers, and `@ApiProperty` descriptions per §6.1 on everything above
- [ ] Compodoc configured (`npm run docs:generate`) and `api/README.md` written per §6.2
- [ ] Compodoc documentation-coverage % and Jest coverage reported together per §6.3
- [ ] §8 open items resolved or explicitly deferred with a written reason

### Week 2 (2026-09-09 → 2026-09-15) — Domain 7 Workflow Engine
**Completed 2026-09-02** (ahead of schedule). All 9 collections built, TDD throughout (38 new unit tests + 1 new e2e suite covering the golden path, reject→resubmit→approve, concurrency rejection, and the HardDelete gate against a real ephemeral MongoDB), real-boot smoke-tested. See the Week 2 completion report for the full list of flagged scope boundaries and ambiguities (entity-side `publicationState` sync deferred to Week 3/4, `workflowInstances.status` has no `Cancelled` value on the live board, `contactMessages` structurally excluded from `publications`, Delegate semantics not detailed in the confirmed decisions, and others).
- [x] `workflowDefinitions`, `workflowSteps`, `workflowInstances`, `workflowActionHistory`
- [x] `revisions`, `publications`
- [x] `workflowPolicies`
- [x] `notifications`
- [x] `auditLogs` extended to cover workflow actions (dual logging: `workflowActionHistory` + `auditLogs` `StatusChange`, via a `@SkipAuditLog()` escape hatch on `AuditLogInterceptor` so the generic and the workflow-specific writers never double-log the same action)

### Week 3 (2026-09-16 → 2026-09-22) — People & Organizations, Discipline/AgeCategory, Media, Documents
**Completed 2026-09-03** (ahead of schedule). All 22 collections built, TDD throughout (96 unit tests / 21 suites, 4 e2e suites incl. a new People/Documents one covering Local-athlete+profile, Guest-athlete-no-profile, and documents-attach-to-club), real-boot smoke-tested (91 new routes mapped, Swagger JSON verified for every nested/bilingual DTO). See the Week 3 completion report for flagged scope boundaries (contentCategories/championships/memberships/sponsorships not built — plain ObjectId poly refs with no `ref:`, profile-record auto-creation NOT wired into athlete/official creation).

**2026-09-03 corrections applied post-completion:**
- `athleteClubHistory`/`coachClubHistory`/`officialClubHistory.endDate`: the "optionality inferred by analogy" judgment call above was superseded by a confirmed rule — `endDate: null` means only "current," at most one such row per person, enforced in each service's `create()`/new `endCurrent()` action (close-out-then-insert, sequential, not high-concurrency). +17 tests (120 total / 26 suites).
- `albums` schema finalized: `parentAlbumId` removed (no hierarchy — grouping via `associations[]` only), `slug`/`description`/`publishedAt`/`publishedBy` added (publish fields server-set only, via a new dedicated `PATCH /albums/:id/publish` gated by a `Publish` permission, never generic update/create). `coverImageId` now cross-validated against `mediaAssets` (exists, not archived, `image/*` mimeType). `tags[]` cleanup (trim/dedupe/drop-empty/cap) added, limits confirmed final 2026-09-03 (20 tags / 40 chars — no longer a placeholder, see below). `AthleteProfile.registrationNumber` also given a unique index (parallel gap on `OfficialProfile.registrationNumber` flagged at the time, not fixed yet — closed in the very next correction below).

**2026-09-03, Athlete/AthleteProfile finalization (same day, third correction):**
- **Slug reversal**: `athletes.slug`/`officials.slug` removed entirely — `athleteProfiles.slug`/`officialProfiles.slug` (new field, `officialProfiles` never had one) are now the SOLE public routing identifiers. A Guest athlete/official (no Profile row) has no individual public page — intentional. `AthleteProfile.slug` was found missing its `unique: true` despite being documented as unique — fixed alongside, since it's now load-bearing for routing. `OfficialProfile.registrationNumber` also picked up `unique: true`/`trim: true` in this same schema edit (closing the gap flagged above) — confirmed with a dedicated unit test in the 2026-09-03 fourth correction, below.
- Public routing implemented as a testable service seam, not a live HTTP route: `AthleteProfilesService`/`OfficialProfilesService.getPublicBySlug(slug)` resolves slug→profile→parentId→parent entity and returns two distinct public-safe response DTOs (`AthleteProfilePublicResponseDto`+`AthletePublicResponseDto`, excluding `restricted`/`dateOfBirth` respectively — structural exclusion via distinct classes, not a conditional serializer). **Deliberately did not wire an unauthenticated `@Public()` controller route** — that's Week 4/CMS surface per established precedent (Publications module); flagged as a scope call, not silently decided.
- `AthletesService`/`OfficialsService.getDisciplineIds()` added as the sanctioned access seam for the flagged, not-yet-decided future `disciplineIds` redesign — structure kept exactly as-is otherwise.
- `photoId` (AthleteProfile/OfficialProfile) and `coverImageId` (Album) now share one validation seam: `MediaAssetsService.assertUsableImage()` (exists/not-archived/`image/*` mimeType) — Album's own duplicate check was refactored to call it too (root-cause consolidation).
- `AthleteProfile.socialLinks` validated: allowed platform (closed list — **not board-sourced, flagged placeholder**), https-only URL (rejects `javascript:`/`data:` by construction via `URL().protocol`), count cap (10, also a flagged placeholder), dedupe by platform (first occurrence wins). Scoped to `AthleteProfilesService` only — did NOT touch the shared `SocialLink` schema/DTO also used by `clubs`, to avoid an unrequested behavior change there.
- `registrationNumber`/`slug` duplicate-key (E11000) now caught at the service layer and re-thrown as a clean `ConflictException` — new shared `common/utils/mongo-errors.util.ts` (`isDuplicateKeyError`/`duplicateKeyField`), verified against a real MongoDB E11000 error shape (`code: 11000`, `keyValue: {field: value}`), applied to `AthleteProfilesService`, `OfficialProfilesService`, and (proactively, same trivial reuse) `AlbumsService`.
- Verified, no code change needed: Athlete/Official have no achievement/result/ranking fields (core-entity discipline already held); `residencyType` Guest-block already enforced; `federationName` already has no hard required-when-Guest constraint; `clubId` already can't be "overwritten" since no update endpoint exists for either Profile collection; `status` already independent of `archivedAt` (remove() never touches status, nothing sets archivedAt from a status change).
- +18 tests (138/28 suites). Full verification: build/lint clean, e2e 4/4, real-boot smoke test (Swagger confirms `slug` removed from `CreateAthleteDto`/`CreateOfficialDto`, present on both Profile DTOs), Compodoc regenerated.

**2026-09-03, combined final confirmations (same day, fourth correction):**
- Album `tags[]` limits (20/40) and `AthleteProfile.socialLinks` allowed-platform list confirmed final, not placeholders — comments updated accordingly. The confirmed platform list (Facebook/Instagram/X/YouTube/TikTok, 5 values) is narrower than the placeholder list actually shipped in the third correction (which also included `LinkedIn`/`'Other'`, 7 values) — this was a real, if small, behavior change, not comment-only as initially framed; flagged and applied rather than silently left as-is. `socialLinks` max-count (10) was already an exact match, no change needed there.
- `OfficialProfile.registrationNumber`'s unique index was, on inspection, already added in the third correction's same schema edit as `slug` — not a fresh fix. Added the specific unit test requested (duplicate `registrationNumber` across two `OfficialProfile` records → clean `ConflictException` via the shared E11000 handler), alongside the pre-existing duplicate-`slug` test.
- Added an explicit Week 4 checklist item (above) tracking the deferred `@Public()` route wiring for `toPublicResponse()`/`getPublicBySlug()`, so it isn't lost among Week 4's CMS/governance scope.
- +1 test (139/28 suites — same suite count, one more case). Full verification: build/lint clean, e2e 4/4, real-boot smoke test, Compodoc regenerated.

**2026-09-03, officialAssignments.role + venues location fields (same day, fifth correction):**
- `officialAssignments.role` added (same enum as `officials.roleType` — `Referee/Judge/Starter/Timekeeper/TechnicalDelegate/Other`), required at creation, independent per-assignment (a different role than the official's general qualification). The shared enum was promoted to `common/constants/official-role-types.ts` (previously lived only in `officials/schemas/official.schema.ts`) so both collections import the same source, matching the established `RESIDENCY_TYPES`/`LICENSE_LEVELS` sharing pattern rather than a cross-module schema import.
- `venues.latitude`/`longitude` added — **flagged discrepancy**: the correction described `venues` as "not built yet, documentation only, no code change needed," but `venues` was in fact already built in Week 3 (Domain 2, live in this codebase since 2026-09-03's Week 3 completion) — only `federation` (Domain 1) is genuinely unbuilt. Added the fields now, live, mirroring the existing `clubs.latitude`/`longitude` pattern exactly (optional `number | null`), rather than deferring a fix to code that already exists. `federation.address`/`latitude`/`longitude` left untouched — correctly out of scope, no `federation` module exists yet (Week 4, Domain 1).
- No new unit tests added for either change — both are plain field additions (declarative `@IsIn`/`@IsNumber` validation, no service-level branching), consistent with how `officialAssignments`/`venues` had no dedicated spec files before either (Week 3 established that only real conditional logic gets a unit test, not plain CRUD field mapping).
- Same test count (139/28 suites — no new tests added, none needed). Full verification: build/lint clean, e2e 4/4, real-boot smoke test (Swagger confirms `role` on `CreateOfficialAssignmentDto`, `latitude`/`longitude` on `CreateVenueDto`), Compodoc regenerated.
- [x] Domain 2: `clubs`, `athletes`, `athleteProfiles`, `coaches`, `officials`, `officialProfiles`, `venues`, `countries`, `clubTeams`, and the `*History` collections (`athleteClubHistory`, `coachClubHistory`, `officialClubHistory`, `athleteCoachHistory`, `athleteNationalTeamHistory`, `officialAssignments`, `athleteGuardianRelationships`)
- [x] Domain 3 (partial): `disciplines`, `ageCategories` only — no championships/results/records
- [x] Domain 5: Media Center (`albums`, `mediaAssets`, `videos`)
- [x] Domain 6: Documents (`documents`, wired into Week 2's Workflow engine — already anticipated in `WORKFLOW_ENTITY_TYPES`/`PUBLICATION_ENTITY_TYPES`)

### Week 4 (2026-09-23 → 2026-09-29) — Federation & Governance, CMS, Public Communication
- [ ] Domain 1: all 14 Federation & Governance collections, now workflow-governed via Week 2's engine
- [ ] Domain 11: CMS & Page Composition
- [ ] Domain 10: Public Communication (`contactMessages`)
- [ ] Wire the already-built, already-tested `toPublicResponse()` (`AthletesService`/`OfficialsService`) and `getPublicBySlug()` (`AthleteProfilesService`/`OfficialProfilesService`) to real unauthenticated `@Public()` routes (e.g. `GET /athletes/public/:slug`, `GET /officials/public/:slug`) — deliberately deferred here during the 2026-09-03 Athlete/AthleteProfile correction rather than built then, since the public HTTP surface itself is Week 4/CMS scope. The resolution logic and public-safe DTOs already exist and are unit-tested; only the route wiring is outstanding. Do not let this get lost among Week 4's CMS/governance scope.

**Explicitly out of this 4-week plan:** Domain 3's championship/results/records collections, Domain 4 Content (`articles`/`externalMediaCoverage`), Domain 9 Sponsorship.

---

## 10. Confirmation

Environment verified, no blockers found. Ready to receive the detailed Week 1 implementation prompt.

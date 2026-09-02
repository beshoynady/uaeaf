# UAEAF Backend API

The NestJS/Mongoose backend for the UAE Athletics Federation platform. Week 1
covers Foundation, Domain 8 (Platform Administration: `users`, `roles`,
`permissions`), JWT authentication, RBAC, and audit logging. Schema fields
are read directly from the live FigJam Physical Model (file
`2ZC01ZbUx3rL7czDXWi34c`, section "03 — Physical Model") — this repo does
not maintain a competing schema definition.

## Local setup

Requirements: Node.js >= 20 (developed/verified on v24), a local MongoDB
instance (developed/verified on v8.2.2, `mongodb://127.0.0.1:27017`).

```bash
cp .env.example .env   # then set a real JWT_SECRET (32+ chars)
npm install
npm run start:dev
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | e.g. `mongodb://127.0.0.1:27017/uaeaf` |
| `JWT_SECRET` | yes | 32+ characters |
| `JWT_ACCESS_EXPIRY` | no, defaults `15m` | confirmed, do not lengthen — see `docs/product/10-Backend-Build-Test-Plan.md` §4.3 |
| `JWT_REFRESH_EXPIRY` | no, defaults `7d` | confirmed |
| `PORT` | no, defaults `3000` | |
| `NODE_ENV` | no, defaults `development` | `development` \| `production` \| `test` |

Startup fails fast (Zod, via `ConfigModule`'s native `validationSchema`
option — see `src/config/validation.schema.ts`) if a required variable is
missing or malformed.

### Commands

| Command | Does |
|---|---|
| `npm run start:dev` | Dev server, watch mode |
| `npm run build` | Production TypeScript build (`nest build`) |
| `npm run test` | Jest unit tests |
| `npm run test:cov` | Jest unit tests with coverage |
| `npm run test:e2e` | Jest e2e tests (Supertest + an ephemeral, real MongoDB via `mongodb-memory-server` — never touches the local dev database) |
| `npm run lint` | oxlint |
| `npm run docs:generate` | Compodoc → `documentation/` (gitignored, regenerate on demand) |

## Folder structure

See `docs/product/10-Backend-Build-Test-Plan.md` §3 for the full convention
and rationale (feature-module organization, `common/` for cross-cutting
code only). Summary: `src/modules/<domain>/` is self-contained
(schema/repository/service/controller/dto); `src/common/` holds
`BaseSchema`/`BaseRepository` and the guards/interceptors/decorators every
domain shares; `src/config/` holds one file per config namespace.

## Architecture notes

- **Module system:** ESM (`"type": "module"`), required because
  `@nestjs/*` packages in the installed version publish ESM-only — there is
  no working CommonJS path with this dependency set. Relative imports use
  explicit `.js` extensions in `.ts` source (TypeScript's `nodenext`
  resolution requires this); type-only imports use `import type` (a plain
  `import` of a type-only export, e.g. Mongoose's `HydratedDocument` or
  `QueryFilter`, fails at runtime under ESM instead of just being an
  unused-import warning, unlike under CommonJS).
- **Auth:** access tokens embed the caller's resolved `(resourceType,
  action)` permission set at login/refresh time; `PermissionsGuard` checks
  the token's cached set, never a live `users → roles → permissions` query
  per request. `JWT_ACCESS_EXPIRY=15m` is the resulting staleness bound on
  permission/suspension changes. See §4.3–§4.4 of the plan doc for the full
  rationale and the refresh flow's re-resolution.
- **Soft delete:** every collection extends `BaseSchema`
  (`createdAt`/`updatedAt`/`createdBy`/`updatedBy`/`archivedAt`/`archivedBy`);
  `BaseRepository` filters out archived documents by default and exposes
  `softDelete()`, not physical deletion. `HardDelete` is a distinct,
  more-privileged permission action a repository opts into explicitly.
- **Password hashing:** `bcryptjs` (pure JS), not native `bcrypt` — this
  environment's npm policy blocks `bcrypt`'s native `node-gyp` install
  script by default; `bcryptjs` avoids the native build entirely with the
  same hashing algorithm.
- **AccessDenied logging:** `PermissionsGuard` denials are logged via
  NestJS's `Logger`, not written to the `auditLogs` collection — the live
  FigJam board's `auditLogs.action` enum has no `AccessDenied`/`Deny` value.
  Extending that enum is an open decision (plan doc §8, item 6), not made
  unilaterally here.

## Where decisions are recorded

Architecture and build decisions live in `docs/product/` (this project's
existing convention — see `10-Backend-Build-Test-Plan.md` and the
FigJam-integrity audits before it), not in a separate ADR system inside
`api/`.

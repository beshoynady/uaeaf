# UAEAF — Full Project Discovery & Frontend Kickoff Planning

**Date:** 2026-09-07
**Type:** Read-only discovery + roadmap + next-step proposal. Nothing was executed, scaffolded, or modified. The only file written this session is this report.
**Git state at start:** branch `main`, HEAD `91a478b`, working tree carrying four pre-existing uncommitted items (`CLAUDE.md` modified; `docs/engineering/`, `docs/security/`, `docs/audits/full-backend-verification-2026-09-06.md` untracked).

**Methodology:** `superpowers:brainstorming` and `superpowers:using-superpowers` were both available and applied (brainstorming was loaded earlier in this same session and its lens is applied to Part 4 §14–15 — genuinely open questions are asked, not answered for you). `superpowers:verification-before-completion`'s standard is applied throughout: every finding below cites a path or a command output, none is carried over from a prior session's summary.

**Governing process:** `docs/engineering/UAEAF-ENGINEERING-OPERATING-MODEL.md` + `CLAUDE.md` §29, both re-read at the start of this session and confirmed unchanged.

---

# PART 1 — REPOSITORY STRUCTURE

## 1.1 Top level

```
uaeaf-project/
├── api/                  NestJS backend (the bulk of built work)
├── apps/
│   ├── web/              Next.js 16 public website — SCAFFOLDED, see §3
│   └── dashboard/        EMPTY DIRECTORY (placeholder only, zero files)
├── packages/
│   ├── design-tokens/    REAL, WORKING token pipeline — see §3.2
│   ├── ui/               EMPTY DIRECTORY (placeholder only, zero files)
│   └── content/          EMPTY DIRECTORY (placeholder only, zero files)
├── docs/                 audits/ design-system/ engineering/ product/ security/
├── my-project/           STRAY — unrelated spec-kit scaffold, untracked (see Suggestions S8)
├── package.json          npm workspaces root: ["apps/*", "packages/*"]
├── CLAUDE.md             Design governance §1–28 + engineering pointer §29
├── UAEAF_VISUAL_REDESIGN_CHECKPOINT.md
└── skills-lock.json
```

**This is an npm-workspaces monorepo** (`package.json` → `"workspaces": ["apps/*", "packages/*"]`), not a single-app repo. `node_modules` is installed at both root and `apps/web`.

`apps/dashboard`, `packages/ui`, and `packages/content` are literally empty directories — `ls -la` shows no files at all, and `git ls-files` returns nothing for them (git does not track empty directories). They are intent placeholders created at monorepo init, not partial work.

## 1.2 Inside `api/` — actual domain structure (read from `src/`, not from the stale audit doc)

Nine domain folders under `src/modules/`, 70 module folders total:

| Domain folder | Modules | Notes |
|---|---|---|
| `athletics/` | 2 | age-categories, disciplines |
| `cms-page-composition/` | 13 | all 13 carry `@Public()` routes |
| `documents/` | 1 | documents |
| `federation-governance/` | 14 | 11 of 14 carry `@Public()` routes |
| `media-center/` | 5 | albums, albums-page, media-assets, videos, videos-page |
| `people-organizations/` | 16 | athletes/officials/clubs/coaches + profiles + 5 history collections |
| `platform-administration/` | 5 | auth, auth-sessions, permissions, roles, users |
| `public-communication/` | 1 | contact-messages |
| `workflow/` | 9 | audit-logs, notifications, publications, revisions, workflow-* (5) |
| **Total** | **70** | 64 have HTTP controllers |

Six modules deliberately have no controller or no schema of their own: `auth-sessions` (no controller/dto — internal session management), `auth` (no schema/repository — operates on `users`/`authMethods`), `audit-logs` (no controller — append-only via the global interceptor). These are design decisions, documented in their own file headers, not gaps.

Note for reconciliation: `docs/product/07-Mongoose-Schema-Specification.md` describes **11 business domains / 69 collections**; the code uses **9 domain folders / 70 modules**. These are two different groupings (business domains vs. code folders), not a contradiction — but no document currently maps one to the other. See Suggestion S5.

## 1.3 Inside `docs/` — five subfolders, actual contents

| Folder | Files | Notable |
|---|---|---|
| `audits/` | 5 | `schema-audit-2026-09-04.md`, `p0-p1-implementation-notes.md`, `auth-security-audit-2026-09-05.md`, `media-gallery-open-decisions.md`, `full-backend-verification-2026-09-06.md` |
| `design-system/` | 42 md + 4 SVG brand assets | 27 numbered chapters + Ch. 27, 3 standalone ADRs (0054/0055/0056), 3 governance protocol docs, `brand-assets/` |
| `engineering/` | 1 | `UAEAF-ENGINEERING-OPERATING-MODEL.md` (created 2026-09-06) |
| `product/` | 11 | `00-MASTER-SPECIFICATION` → `10-Backend-Build-Test-Plan` |
| `security/` | 2 | **Both untracked in git.** `auth-authorization-architecture-approval.md` (729 lines), `content-authorization-architecture-approval.md` (726 lines) — see §2.5 |

There is **no `docs/api/` folder** — see §2.4.

Also present but git-ignored (generated): `api/documentation/` (compodoc), `api/coverage/` (jest), `apps/web/.next/`, `packages/design-tokens/build/`.

---

# PART 2 — WHAT'S ACTUALLY DONE (BACKEND)

## 2.1 The nine P0/P1 hardening items — all nine CONFIRMED present in current code

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | `AuditLogsRepository` append-only | ✅ | `workflow/audit-logs/audit-logs.repository.ts` — `grep -c "extends BaseRepository"` → **0**; class exposes only `create()` |
| 2 | `entityType` casing via `kebabToCamel()` | ✅ | `common/interceptors/audit-log.interceptor.ts` (3 refs); also correctly strips the `/api/v1` prefix at lines 96–109 — the later versioning commit did **not** break it |
| 3 | `auditLogs` compound indexes | ✅ code | `audit-log.schema.ts:81-82` — `{entityType,entityId,timestamp}`, `{actorId,timestamp}` |
| 4 | `notifications` compound index | ✅ code | `notification.schema.ts:66` — `{recipientId,readState,timestamp}` |
| 5 | `clubs`/`coaches.registrationNumber` unique | ✅ | `club.schema.ts:93-95`, `coach.schema.ts:73-75` (partial-unique) |
| 6 | Partial-unique-index conversion | ✅ | `partialFilterExpression` now in **10** schema files (the original 9 + `videos.schema.ts` added by the media-gallery pass); 17 index definitions total |
| 7 | `contactMessages` limits | ✅ | 6 `@MaxLength` in `create-contact-messages.dto.ts`; `main.ts` `limit: '1mb'` ×2 (json + urlencoded) |
| 8 | Rate limiting | ✅ | `@RateLimit(10,60)` on `POST /auth/login`, `@RateLimit(5,60)` on `POST /contact-messages`; `RateLimitGuard` registered first among `APP_GUARD`s |
| 9 | (item 3+4 counted separately in the original roadmap) | ✅ | see rows 3–4 |

**Runtime caveat carried forward:** items 3/4/6 are correct in code and were materialized on the **local** MongoDB yesterday (`docs/audits/full-backend-verification-2026-09-06.md` → F1 Resolution), but remain **unverified on Atlas**, which is what `api/.env` actually points at. Still blocked on the Atlas IP allowlist.

## 2.2 The four Auth P0 fixes — all four CONFIRMED present

| # | Fix | Evidence |
|---|---|---|
| 1 | `passwordHash` no longer leaks | `users/schemas/auth-method.schema.ts:18` — `@Prop({ select: false })`; allowlist `users/dto/user-response.dto.ts` |
| 2 | Privilege-escalation chain closed | `roles/roles.service.ts` — `assertGrantable()` at lines 26, 59; self-assignment blocked |
| 3 | `isSystemRole` protects `updatePermissions()` | `roles/roles.service.ts` — `assertNotSystemRole()` at lines 44, 58, 69 |
| 4 | Session/logout layer | `platform-administration/auth-sessions/` (module, repository, service, schema); `POST /auth/logout` (`auth.controller.ts:45`), `POST /auth/logout-all` (`:53`) |
| + | JWT `type` claim | `common/interfaces/jwt-payload.interface.ts:16` (`type: 'access'`), `:29` (`type: 'refresh'`) |

## 2.3 `toPublicResponse()` / `getPublicBySlug()` wiring — **DONE, not a blocker**

This was the item flagged as potentially blocking all frontend work. It is wired:

- **34 controllers carry at least one `@Public()` route.**
- Concrete end-to-end example, `people-organizations/athlete-profiles/athlete-profiles.controller.ts`:
  ```
  33:  @Get('public/:slug')
  34:  @Public()
  35:  getPublicBySlug(@Param('slug') slug: string) {
  36:    return this.service.getPublicBySlug(slug);
  ```
- `toPublicResponse`/`getPublicBySlug` appear across 19 files including `athletes`, `officials`, `athlete-profiles`, `official-profiles`, `albums`, `media-assets`, `hero-slides`, `navigation-menus`, `federation-personnel` services — with dedicated specs (`athletes.service.spec.ts`, `albums.service.public.integration.spec.ts`, etc.).

**The public API surface exists and is tested. The frontend has an API to read from.**

## 2.4 API contract artifacts — one exists, one does not

- ✅ **`api/openapi.json` EXISTS**, is **git-tracked**, and is **current** — last written by commit `91a478b` (the `/api/v1` versioning commit, the current HEAD). 202 KB, `UAEAF Backend API 0.1.0`, **158 paths**, all under `/api/v1/*` except `/health`.
- ❌ **`docs/api/public-api-contract.md` does NOT exist.** There is no `docs/api/` directory at all.

So the machine-readable contract is in good shape; what's missing is the *curated public subset* — a frontend-facing document answering "which of these 158 endpoints may the public website call, and what exactly does each return." That distinction matters directly for the roadmap (see B4).

## 2.5 Two substantial architecture documents exist, are approved-in-principle, and are NOT implemented

Both in `docs/security/`, both dated 2026-09-06, **both still untracked in git**:

**`auth-authorization-architecture-approval.md`** (729 lines, 30 sections). Confirms all four P0s fixed, then designs the entire remaining account lifecycle. Its own verdict: *"the core RBAC engine is sound and the highest-severity holes are closed. What remains is the account lifecycle around it — invitation, password reset/change, account suspension, MFA, session-layer audit logging — none of which exist today."* Approved for implementation, phased, contingent on two open decisions.

**It also surfaces a finding no prior document flagged, which I verified independently:**

> **There are no seed scripts anywhere in the repository.**
> `find . -iname "*seed*"` (excluding `node_modules`/`.git`) returns only two unrelated skill-internal files. There is no scripted way to create the first Permission catalog, the first system Role, or the first admin User. A fresh environment requires hand-crafted MongoDB inserts to become usable.

**`content-authorization-architecture-approval.md`** (726 lines). Designs contextual content authorization: a unified `restrictedInfo` object replacing per-resource DTO tiers (owner-directed revision, per its own §8 Revision Record), plus workflow-state-aware read/edit. **Verified not implemented:** `grep -r "restrictedInfo" api/src` → **zero matches**. It carries a full per-collection migration plan across 8 collections including `athleteProfiles`/`officialProfiles` — i.e. it will change the shape of exactly the public payloads the website will consume.

## 2.6 Test and build state (run fresh this session in the prior session; not re-run today to respect the no-execution constraint)

Last verified 2026-09-06: **51/51 unit suites, 266/266 unit tests, 13/13 e2e suites, `nest build` exit 0.** Nothing in the working tree has changed since (`git status` shows only doc files), so these numbers still stand, but they were not re-executed today.

## 2.7 Module-by-module completeness

Every one of the 70 modules has its full CRUD skeleton — schema + dto + service + controller + module + repository (with the six documented exceptions in §1.2). **Nothing is "not started."** The real differentiators are test coverage and known feature gaps:

**Complete + has dedicated unit/integration specs (41 modules):** all of `media-center` (5), most of `people-organizations` (11 of 16), `platform-administration` (auth, permissions, roles, users), `workflow` (audit-logs, notifications, publications, revisions, workflow-instances), `cms-page-composition` (athletes-page, hero-slides, navigation-menus, page-sections, site-settings), `federation-governance` (committees, federation-appointments, organizational-structure), `documents`, `contact-messages`.

**Complete scaffolding, no dedicated spec file (29 modules):** `age-categories`, `disciplines`, `clubs-page`, `coaches-page`, `disciplines-page`, `navigation-items`, `news-page`, `pages`, `records-page`, `results-rankings-page`, `about-federation-page`, `board-members-page`, `committees-page`, `contact-us-page`, `election-cycles`, `federation-personnel`, `federation`, `governance-documents`, `president-message-page`, `strategic-plans-page`, `vision-mission-page`, `athlete-guardian-relationships`, `club-teams`, `countries`, `official-assignments`, `venues`, `auth-sessions`, `workflow-action-history`, `workflow-definitions`, `workflow-policies`, `workflow-steps`. Many are covered indirectly by the e2e public-API suites; none is verified in isolation.

**Known feature gaps (documented, not silent):** password reset / password change / account-suspend endpoints (none exist); `roles:Assign` not separated from `users:Update`; auth-lifecycle events (login/logout/refresh) not written to `auditLogs`; `AuthSession` rows never cleaned up (no TTL index); no seed scripts; `restrictedInfo` not implemented.

---

# PART 3 — WHAT'S ACTUALLY DONE (FRONTEND / DESIGN)

## 3.1 `apps/web` — considerably further along than "not started," but the pages are empty

Next.js **16.2.12**, React **19.2.4**, Tailwind **v4**, **JavaScript (not TypeScript — `jsconfig.json`, `.js` files)**. Depends on `@uaeaf/design-tokens: "*"` (workspace link). 17 tracked files.

**What is genuinely built (and it is real, design-system-cited work):**

- **`src/app/layout.js`** — Arabic-first RTL root (`lang="ar" dir="rtl"`); three fonts wired via `next/font/google` (Alexandria variable for Arabic, IBM Plex Sans variable for Latin, IBM Plex Mono 400) citing *Chapter 4 §ADR-0007/§4.8/§4.9*; a pre-paint theme-bootstrap inline script citing *Chapter 7 §7.4*; bilingual `metadata`.
- **`src/app/globals.css`** — imports Tailwind v4 **and** `@uaeaf/design-tokens/build/css/index.css`; maps token CSS variables into Tailwind's `@theme` namespaces (spacing, shadow, font) citing *Chapter 21 §21.2/§21.3* and *Chapter 3 §3.4.1*; defines the **complete 14-level typography utility scale** (`text-display-xl` → `text-overline`) with genuine two-step mobile/desktop values per *Chapter 4 §4.4/§4.7*; enforces `prefers-reduced-motion` per *Chapter 5 §5.8*.

**What is NOT built:**

- **`src/app/page.js` is still the untouched stock `create-next-app` template** — the Next.js logo, "To get started, edit the page.js file." There is no UAEAF page content of any kind.
- No components, no routes beyond `/`, no API client, no locale switching, no header/nav/footer.

**Age:** `git log -- apps/web` shows two commits, the newest `d3cc5d6` on **2026-07-27** — this foundation is ~6 weeks old and untouched since; all backend work happened after it. Dependencies are installed but **I did not run `next build`/`next dev`** (that writes to `.next/`, outside this session's write permission) — so *whether the 6-week-old scaffold still builds against its current lockfile is genuinely unverified.* Treat that as the first 5-minute check of the next session, not as a known-good.

**Operational note for all future frontend work:** `apps/web/AGENTS.md` (auto-generated, and `apps/web/CLAUDE.md` is just `@AGENTS.md`) states: *"This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."* Next.js 16 + React 19 postdate reliable recall; this instruction should be honored literally on every frontend task.

## 3.2 `packages/design-tokens` — a real, working, built pipeline

Not a stub. Token source tree mirrors design-system Chapter 3 structure:

- `tokens/primitive/` — 12 files: border, breakpoints, colors, elevation, grid, motion, opacity, radius, sizing, spacing, typography, zindex
- `tokens/semantic/` — 6 files: colors.light / colors.dark / colors.high-contrast, elevation, motion, typography
- `tokens/component/` — button, card
- `tokens/brand/` — brand.json
- `scripts/build.mjs` → generates (git-ignored) `build/css/{base,light,dark,high-contrast,index}.css`, `build/tailwind-vars.cjs`, `build/tokens.json`

`package.json` describes itself as *"Design System token source (Chapter 3) and generated build output (Chapter 3 §3.9 Export Pipeline)"* — i.e. this is the implemented half of the design system's own export pipeline, and `apps/web` already consumes it. **Light, dark, and high-contrast themes all have token sets; only light/dark are wired into the app's bootstrap script.**

## 3.3 `docs/design-system/` — one-paragraph state

Complete and frozen. `00-MASTER-INDEX.md` declares **"Design System Review & Consolidation (v1.0.0 Final)"** with **27 chapters (0–26), every one marked `Frozen`**, each bound to an ADR (ADR-0001→0035 verified as a continuous, gap-free sequence), plus a "later amendment ADRs" paragraph listing ADR-0038/0039/0050/0051/0052/0053 and standalone ADR-0054/0055/0056 — with an explicit self-caveat that this later list *"is not re-verified for uniqueness/gaps."* Three indexing gaps are visible (see Suggestions S1–S3): `27-Brand-Visual-Language.md` exists as a file but is absent from the chapter table; the three governance protocol documents (`UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL`, `UAEAF-DESIGN-CRITIQUE-JURY-PROTOCOL`, `UAEAF-VISUAL-GOVERNANCE-INDEX`) are not referenced anywhere in the index despite `CLAUDE.md` §22 making two of them mandatory reading; and ADR-0041 — cited twice in `CLAUDE.md` §5/§6 as the governing exception for club-shield and membership-caption micro-labels — does not appear in the index's amendment list at all.

## 3.4 `docs/product/` — 11 specs, one badly stale

| Doc | Version / Status |
|---|---|
| `00-MASTER-SPECIFICATION.md` (816 ln) | v0.2.0 — **Draft**, pending Federation sign-off on §52 Open Decisions |
| `01-Information-Architecture.md` (1092 ln) | Draft v0.2 — reconciled against the built homepage; contains **Needs Validation** items + one open product decision (§15.1) |
| `02-Homepage-Specification.md` (544 ln) | v0.2.0 — **Reconciled with Approved Build**; §5/§6/§8/§11a/§14a supersede the v0.1.0 section order, superseded text struck through, auditable |
| `03-Content-Data-Structuring-Document.md` (1028 ln) | Business/domain spec, Arabic-primary |
| `04-Executive-Workflow-Summary-Arabic.md` (383 ln) | v1.1 — non-technical executive summary |
| `05-Client-Requirements-Register-2026-08.md` (83 ln) | Classification only — explicitly states nothing has been built from it yet |
| `06-Database-Architecture.md` (677 ln) | DB-ARCH-006 v1.0.0 — Draft, pending Product Owner review (§20) |
| `07-Mongoose-Schema-Specification.md` (994 ln) | DRAFT — 11 domains / 69 collections, pending review |
| `08-Workflow-Scenario-Review.md` (729 ln) | Read-only review, 2026-09-01 |
| `09-Integrity-Completeness-Security-Audit.md` (344 ln) | Read-only audit, 2026-09-02 |
| `10-Backend-Build-Test-Plan.md` (546 ln) | BE-PLAN-010 v1.3.0 — **"Planning-only — no application code written yet"** ← **materially false today** (70 modules, 266 tests). See Suggestion S4. |

`02-Homepage-Specification.md` is the only doc that has been explicitly reconciled against built reality. Everything else still describes a pre-implementation world.

---

# PART 4 — ROADMAP, DEPENDENCIES, SUGGESTIONS, AND NEXT STEP

## 4.1 Backend track

| ID | Step | Why here | Size |
|---|---|---|---|
| **B1** | **Seed scripts** — permission catalog, system roles, bootstrap admin | Nothing else can be stood up repeatably without it; no login is possible in a fresh environment today. Already specified in the security doc's P1 list. | S–M |
| **B2** | **Atlas access + index materialization there** | `.env` points at Atlas; its index state is unknown. Needs *your* action (IP allowlist) before any verification is possible. Carries the unfinished half of Finding F1. | S (blocked on you) |
| **B3** | **Content seed data** for the public collections | Every public collection is currently empty. The website cannot be built or reviewed against an API returning `[]`. | M |
| **B4** | **`docs/api/public-api-contract.md`** — curated public subset of the 158 endpoints | `openapi.json` is complete but undifferentiated; the frontend needs to know which endpoints are public and what each returns. | S |
| **B5** | **`restrictedInfo` implementation** (content-authorization doc) | Changes the shape of `athleteProfiles`/`officialProfiles` public payloads. Cheaper before profile pages exist than after. | M–L |
| **B6** | **Account lifecycle P1 batch** — password change/reset, suspend, invitation, auth audit logging, `roles:Assign` | Designed and approved-in-principle; required before any real admin usage, but not required by the public website. | L |
| **B7** | **Unit-test backfill** for the 29 spec-less modules | Debt, not a blocker. Best done incrementally as each module is touched. | M |
| **B8** | **Commit `docs/security/` + update `10-Backend-Build-Test-Plan.md`** | Governance hygiene; two approved architecture docs currently exist only in an untracked working tree — one machine failure from being lost. | XS |
| **B9** | **Environment/deploy strategy** — dev vs prod Atlas separation, `autoIndex:false` in prod, secrets handling | Required before launch, not before development. | M |

## 4.2 Frontend track

| ID | Step | Why here | Size |
|---|---|---|---|
| **F0** | **Verify the 6-week-old scaffold still builds**; decide JS→TS; confirm component location | Five minutes of derisking before anything is built on top of it. Both decisions get 10× more expensive after page work starts. | XS |
| **F1** | **App shell** — header, primary nav, footer, locale/theme switch | Every page needs it; it's the natural first consumer of `packages/ui` and of the real `navigation-menus` public endpoint. | M |
| **F2** | **One page end-to-end against the real API** (thinnest complete vertical slice) | Proves scaffold → token → component → API client → rendered page → RTL/a11y in one pass, on the smallest possible surface. | M |
| **F3** | **Homepage — 18 sections** | The bulk of the 2 Oct milestone. Ordered by your priority, not by spec order. | L |
| **F4** | **Remaining public page templates** (12 per Chapter 20) | Breadth after depth. | L |
| **F5** | **Bilingual AR/EN routing + locale switching** | `layout.js` currently hardcodes `lang="ar" dir="rtl"`; the content model and design system are bilingual throughout. Retrofitting after 30 components exist is painful. | M |
| **F6** | **SEO** — metadata, sitemap, structured data (Chapter 14 + `nextjs-seo` skill) | Needs real pages to exist first; needed before public launch. | M |
| **F7** | **Accessibility pass** (Chapter 6 + WCAG 2.2, `wcag-audit-patterns` skill) | Continuous, but needs a formal gate before the milestone. | M |
| **F8** | **`apps/dashboard`** — admin CMS | Post-October. Depends on B6. | L |

## 4.3 Cross-track dependencies (the ordering constraints that actually matter)

1. **F2/F3 (real pages) → blocked on B3 (content seed).** You cannot build or review a homepage against empty collections. *This is the single most under-appreciated dependency in the plan.* Mitigation: build against typed mocks derived from `openapi.json`, then swap — but the swap is only honest once B3 exists.
2. **F3 (homepage sections) → wants B4 (public API contract) first.** Not a hard block (`openapi.json` covers it), but without a curated public subset, each section's developer re-derives "which endpoint, what shape" from a 158-path spec.
3. **F4 (athlete/official profile pages) → hard-blocked on B5 (`restrictedInfo`).** Building profile components now, against the current payload shape, guarantees rework when the approved `restrictedInfo` migration lands. Either do B5 first, or schedule profile pages after it.
4. **Any authenticated UI (dashboard login, CMS) → blocked on B1 (seed scripts).** Without them there is no admin user to log in as.
5. **Any shared/staging environment the frontend can point at → blocked on B2 (Atlas access).** Until then, frontend development runs against a local backend + local Mongo.
6. **F8 (dashboard) → blocked on B6 (account lifecycle).** User management screens need password reset / suspend endpoints to exist.
7. **F5 (bilingual routing) → soft-blocks F3/F4.** Every component built before locale switching exists will need revisiting. Cheaper early.

**Not blocked on anything (can start immediately, today):** F0, F1, B1, B4, B8.

## 4.4 Suggestions — **none of these are approved, all need your sign-off**

| ID | Area | Suggestion |
|---|---|---|
| **S1** | Design system | `27-Brand-Visual-Language.md` exists but is missing from `00-MASTER-INDEX.md`'s chapter table. Add it, or state why it sits outside the frozen set. |
| **S2** | Design system | The three governance protocol docs are absent from the Master Index despite `CLAUDE.md` §22 making two of them mandatory reading. Index them. |
| **S3** | Design system | ADR-0041 is cited twice in `CLAUDE.md` §5/§6 as governing law but appears nowhere in the Master Index amendment list; ADR-0036/0037 and 0040–0049 are also unaccounted for. Run the ADR consolidation pass the index itself says it hasn't done. |
| **S4** | Product docs | `10-Backend-Build-Test-Plan.md` still says *"no application code written yet."* It is the most-wrong sentence in the repo. Mark it superseded or add a status header. |
| **S5** | Product docs | No document maps the spec's 11 business domains / 69 collections onto the code's 9 domain folders / 70 modules. A short mapping table would end a recurring source of confusion. |
| **S6** | Backend | `AuthSession` has no TTL index — revoked/expired rows accumulate forever. Small, self-contained, already flagged in the P0 fix notes. |
| **S7** | Backend | 13 identical `no-unused-vars` lint errors (unused `ValidationPipe`) across every e2e spec — `npm run lint` is currently red. One-line fix per file, or a shared test app-factory. |
| **S8** | Repo hygiene | `my-project/` is a stray, untracked spec-kit scaffold unrelated to UAEAF. Delete it or move it out of the repo. |
| **S9** | Repo hygiene | `docs/security/`'s two approved architecture documents are untracked. Commit them (B8). |
| **S10** | Frontend | `apps/web` is JavaScript while the backend is strict TypeScript and the API has a full OpenAPI schema. Generating a typed API client from `openapi.json` is only possible in TS. Strong recommendation to convert now, while `page.js` is the only real file. **Asked as a question below.** |
| **S11** | Frontend | `packages/ui` and `packages/content` are empty. Recommendation: build components inside `apps/web` first and extract into `packages/ui` only when `apps/dashboard` actually needs to share them (YAGNI — a shared package with one consumer is pure overhead). |
| **S12** | Frontend | The high-contrast theme has full token coverage in `packages/design-tokens` but is not wired into `layout.js`'s bootstrap script (only light/dark). Chapter 6 accessibility compliance likely wants it exposed. |
| **S13** | Governance | The engineering operating model §14 mandates TDD, but there is no frontend testing setup at all (no Vitest/Playwright/RTL in `apps/web`). Decide the frontend testing stack before F1, or TDD becomes aspirational on this track. |

## 4.5 Working through the 2 October milestone — thinking out loud

**What the constraint actually is:** a partial-payment milestone around 2 October for "public website + minimum static pages." Roughly three and a half weeks.

**What's genuinely in our favor:** far more is done than a normal project at this stage. The token pipeline is built and wired. The typography scale, RTL root, fonts, and theming are done. 34 controllers already serve public routes, tested. `openapi.json` is current. This is not a standing start — it's a paused one.

**What genuinely worries me, in order:**

1. **Empty collections.** Every public content collection has zero documents. This is a bigger threat to the milestone than any amount of UI work, because it's invisible until you try to demo. A homepage that renders beautifully against mocks and empty against the real API is not a shippable milestone. Whether this is a blocker at all depends on something only you know: whether real UAEAF content exists to load, or whether the milestone ships with sample content.
2. **The `restrictedInfo` migration is queued and will change public payload shapes.** If profile pages get built in the next three weeks against today's shapes, that's guaranteed rework. Sequencing this correctly is nearly free; discovering it late is not.
3. **JS vs TS is a now-or-never-cheap decision.** With `page.js` as the only real file, conversion costs an hour. After 18 homepage sections, it costs a week — and in between, we give up generating a typed client from a 158-path OpenAPI spec that already exists.
4. **Three and a half weeks against 18 homepage sections + 12 page templates is not obviously enough** for breadth-first. Which is why the shape of the milestone matters so much.

**On "should UI work wait for the public API contract?"** — No. `openapi.json` already exists and is current, and B4 is a distillation of it, not a prerequisite for it. Component, layout, and token work can start immediately. What *should* wait is anything consuming athlete/official profile payloads (dependency #3).

**On "is there a thinnest complete vertical slice?"** — Yes, and I think it's the strongest available move. One real page, end-to-end, against the real API: it forces every layer to meet — token → Tailwind theme → component → API client → data fetching → RTL → a11y → build. Every unknown in this stack surfaces on the smallest possible surface, once, instead of eighteen times. Breadth-first across 18 sections would find the same problems eighteen times over.

**On "scaffold-and-tokens first, or one real page first?"** — The scaffold-and-tokens phase is *already done* (that's §3.1/§3.2, done six weeks ago). What's left of "foundation" is the app shell (F1) and the F0 decisions. So the honest answer is: F0 → F1 → F2, where F1 and F2 are nearly the same work — the shell *is* most of the first page. I'd bundle them.

**Which page for the slice?** I have a view but it depends on your milestone definition, so I'm asking rather than assuming. The homepage is the highest-value but also the largest and most section-heavy (18 sections). A simpler content page (e.g. About the Federation / President's Message — both already have `@Public()` endpoints and CMS singletons) would prove the same stack in a fraction of the work, and *then* the homepage gets built on a proven foundation. The counter-argument is that the milestone is explicitly "the public website," and a homepage that isn't started three weeks out is a real risk.

## 4.6 Recommended scope for the *single next session*

**Recommendation: "Frontend foundation unblock" — F0 + the beginning of F1.** Concretely:

1. Verify `apps/web` still builds and runs on its 6-week-old lockfile (and read `node_modules/next/dist/docs/` per `AGENTS.md` before touching anything).
2. Execute the JS→TS conversion, *if* you approve S10 — while it's a one-hour job.
3. Decide and set up the frontend testing stack (S13), so the operating model's TDD requirement is real on this track from line one.
4. Build the app shell skeleton — header / nav / footer — against the real `navigation-menus` public endpoint, using the existing token utilities.

That is genuinely one sitting's work, it unblocks everything downstream, and it commits to nothing that the answers below would invalidate.

**Deliberately deferred, and why:**
- *Homepage sections* — until the milestone-scope and section-priority questions are answered; building the wrong 6 of 18 sections is the most expensive mistake available right now.
- *Athlete/official profile pages* — until B5 (`restrictedInfo`) lands, per dependency #3.
- *`packages/ui` extraction* — until a second consumer exists (S11).
- *B6 account lifecycle, F8 dashboard* — not on the public-website critical path; post-October.
- *B7 test backfill, S1–S5 doc fixes* — real debt, but none of it blocks the milestone. Best done incrementally.

**Parallel backend work that could run alongside, if you want two tracks moving:** B1 (seed scripts) then B3 (content seed) — because as argued above, empty collections are the quiet threat to the whole milestone.

---

## Open questions for you (asked, not assumed)

1. **What does "public website + minimum static pages" mean contractually for 2 October** — hardcoded static content, or API-driven pages with real CMS data behind them?
2. **Is real UAEAF content available to seed** (Arabic copy, athlete data, news, imagery), or does the milestone ship with sample/placeholder content?
3. **JS or TypeScript for `apps/web`** (S10)?
4. **Which homepage sections matter most**, if not all 18 make the milestone?

These are carried into chat via `AskUserQuestion`. Nothing in this report will be acted on without your per-item approval.

---

# PART 5 — ANSWERS RECEIVED (2026-09-07) AND THE PLAN THEY PRODUCE

## 5.1 Decisions

| # | Question | Decision |
|---|---|---|
| 1 | 2 Oct milestone scope | **Hybrid** — hardcode editorial/marketing copy, wire the genuinely dynamic sections to the real API |
| 2 | Content | **Placeholder/sample content for now**, with real content loaded later |
| 3 | `apps/web` language | **Convert to TypeScript now** |
| 4 | Homepage section priority | **Top-of-page first, in reconciled spec order** |

## 5.2 Correction to the brief's own figure: it's **13 sections, not 18**

`docs/product/02-Homepage-Specification.md` §6 *Section Inventory [Reconciled v0.2.0]* defines **13 numbered sections** plus Global Header, Global Footer, and a floating social rail — 16 discrete build units. The "18 sections" figure predates the v0.2.0 reconciliation (which merged the former separate Results and Upcoming Events sections into one, §5, and removed the Services/Quick Actions block, §6 `[D]`). Planning below uses 13.

Two known gaps are already recorded in that spec and are inherited by the frontend build, not introduced by it:
- **Hero (§1)** — target state is a 5-slide carousel (`CMP-CAROUSEL-001`); the approved Figma build is a single static slide. Open gap, §25 Q10.
- **Global Footer (§13)** — Quick Links still shows the retired 7-item list and **must** be updated 1:1 to the resolved 9-item header, including "UAEAF in the Media." Not yet done.

Also refines Suggestion **S3**: ADR-0036 (`CMP-LIVESTREAM-001`), ADR-0037 (`CMP-AFFILIATIONS-001`) and ADR-0042 (`CT-EXTERNALMEDIA-001`) *do* exist, embedded in Chapters 8-L6 / 8-L8 / 13 respectively — they are simply missing from the Master Index's amendment paragraph. The gap is in the index, not in the decisions.

## 5.3 Build order, with the hybrid static/dynamic split applied

Ordered per decision 4 (top-of-page first). "Dynamic" = wire to a real `@Public()` endpoint against sample-seeded data; "Static" = hardcoded copy in the frontend for this milestone, CMS-wired after.

| Order | Section | Milestone treatment | Backend dependency |
|---|---|---|---|
| 0 | Global Header | **Static** nav initially; swap to `navigation-menus` public endpoint when convenient | none (then `navigation-menus`) |
| 1 | Hero | **Static** (single slide, per the known §25 Q10 gap — do not invent the carousel) | none |
| 2 | Federation by the Numbers | **Static** figures | none |
| 3 | Clubs Network | **Dynamic** — clubs list + emirate filter | `clubs` public routes + sample seed |
| 4 | Featured Athletes | **Dynamic** — but see risk below | `athletes`/`athlete-profiles` + **B5 `restrictedInfo`** |
| 5 | Results & Rankings + Upcoming Events | **Static** for the milestone — the underlying results/rankings/events domains are not built | ⚠ see §5.4 |
| 6 | Live Stream & Videos | **Dynamic** (video shelf) / static live signal | `videos` public routes + sample seed |
| 7 | News | **Dynamic** | ⚠ see §5.4 |
| 8 | UAEAF in the Media | **Static** for the milestone (external press items) | `CT-EXTERNALMEDIA-001` not built |
| 9 | Sponsors & Partners | **Static** | none |
| 10 | Media Centre | **Dynamic** — albums/media mosaic | `albums`, `media-assets` (both built + tested) |
| 11 | Memberships / Affiliations | **Static** logos | none |
| 12 | Newsletter | **Static** form; submission endpoint TBD | none for render |
| 13 | Global Footer | **Static**, with the mandated 9-item Quick Links correction | none |

## 5.4 Two content-domain gaps this ordering exposes

Worth flagging now rather than at section-build time:

- **Sections 5 and 7 have no backend domain behind them.** There is no `news`/`articles` module and no `results`/`rankings`/`events`/`competitions` module anywhere in `api/src/modules` — the 70 modules cover governance, people, media, CMS page-composition and workflow, but not editorial news or competition results. `01-Information-Architecture.md` treats both as first-class. Under the hybrid decision these ship static for 2 October, which is fine — but they are **genuinely unbuilt domains**, not just unseeded ones, and that should be visible in whatever gets shown to the Federation.
- **Section 4 (Featured Athletes) is the one section that touches the `restrictedInfo` migration** (dependency #3, §4.3). Recommend either building it against a deliberately minimal payload (name, discipline, photo, slug — none of which the migration touches), or scheduling it after B5.

## 5.5 Revised next-session scope (unchanged in shape, sharpened by the answers)

1. Verify `apps/web` still builds on its 6-week-old lockfile; read `node_modules/next/dist/docs/` first per `AGENTS.md`.
2. **Convert `apps/web` to TypeScript** (decision 3) — `jsconfig.json` → `tsconfig.json`, `layout.js`/`page.js` → `.tsx`, types installed. Do it before any component exists.
3. Stand up the frontend test stack (Suggestion S13) so the operating model's TDD requirement is real from line one.
4. Build the Global Header + Global Footer shell (order 0 and 13) — static nav, correct 9-item Quick Links, using the existing token utilities. These two bracket every page and are pure-static under the hybrid decision, so they carry zero backend dependency.

Deferred exactly as in §4.6, with one addition: **generating a typed API client from `openapi.json`** becomes available once the TS conversion lands, and should be its own small task before the first dynamic section (order 3).

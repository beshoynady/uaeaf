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

---

# PART 6 — APP SHELL BUILD (2026-09-07) AND DEVIATION LOG

Executed after owner approval of the four-step scope, with standing authority to
apply UX/technical/accessibility improvements without per-item approval, on the
condition that every deviation from the approved Figma frame is logged here.
**No Figma file was modified** — that remains gated on separate explicit approval.

## 6.1 What was built

| Step | Result |
|---|---|
| 1. Scaffold health | `next build` green on the 6-week-old lockfile: `✓ Compiled successfully`, 4 static routes |
| 2. TypeScript | `jsconfig.json` → `tsconfig.json` (strict); `layout.js`/`page.js` → `.tsx`; `typescript`, `@types/*` installed. `npx tsc --noEmit` clean |
| 3. Test stack | Vitest + React Testing Library + jsdom; `vitest.config.mts`, `vitest.setup.ts`, `test`/`test:watch` scripts. Written test-first (RED verified before implementation) |
| 4. Header + Footer | `src/components/layout/site-header.tsx`, `site-footer.tsx`, data model in `src/lib/navigation.ts`, wired into `layout.tsx` with a `<main id="main-content">` |

**Verification:** 14/14 component tests pass · `tsc --noEmit` clean · `eslint` clean ·
`next build` green · rendered and measured in a real browser at 1440×900.
Measured header height **96px exactly**. Accessibility probe on the live page:
3 correct landmarks, 3 labelled `<nav>`s, heading order H1→H2 with no skips,
**0** of 32 links without an accessible name, **0** images missing `alt`
(18 decorative correctly hidden), **0** unsafe external links, skip link first
in focus order.

Assets: all 14 Figma-exported SVG/PNG assets downloaded and committed to
`apps/web/public/{brand,icons}` — the MCP asset URLs expire in ~7 days, so
referencing them directly would have broken the build within a week.

## 6.2 Deviation log — where the code intentionally differs from the approved frame

Ordered most-likely-to-be-questioned first.

| # | Deviation | Why |
|---|---|---|
| **D1** | **DOM order reversed** for every horizontal row: header (Logo→Nav→Utilities), footer columns (Brand→QuickLinks→Location→Contact), social icons, legal links, and the legal strip's two halves | Figma flattens each row to LTR, so its first child is the *leftmost*. Under this app's `dir="rtl"` document the first child lands *rightmost*. Reversing the DOM is what actually reproduces the approved visual; **not** reversing it mirrors the design. Chosen over `flex-row-reverse` so screen-reader and tab order keep matching visual order (WCAG 2.2 SC 1.3.2, SC 2.4.3). Verified in-browser before and after. |
| **D2** | **Header dimensions use master integers, not the exported values**: 24px padding (not 23.852), 16px nav text (not 15.9), 13px utilities (not 12.92), 12px gap (not 11.926), 2px/1px rules (not 1.99/0.994), **96px height (not 95.407)** | Every exported figure in node 2374:1175 is a uniform ×0.99385 scaling — the R7 instance artefact documented in `CLAUDE.md` §4, which states the correct master values are the clean integers. This is compliance with §4, not a departure from it. The footer node needed no such correction; its values were already clean. |
| **D3** | Dropdown chevrons render as **decoration** (`aria-hidden`), items stay plain links; **no** `aria-haspopup`/`aria-expanded` | The flyout panels (Figma 169:1479 / 169:1492) are a separate increment. Advertising a menu that never opens would promise assistive-tech users behaviour that does not exist. The visual chevron is preserved exactly. |
| **D4** | Footer swooshes positioned with **physical** `left`/`right`, not logical `start`/`end` | The approved footer *is* the Arabic RTL composition, so its coordinates are already final. Treating them as logical mirrored both pairs and dropped the white swoosh on top of the social icons — caught in browser verification, not in review. |
| **D5** | Map-card label "مدينة زايد الرياضية" uses **bold (700)**, Figma specifies **SemiBold (600)** | The design system defines exactly four weights — 400/500/700/900 (Chapter 3, verified in `packages/design-tokens`). 600 is not an approved value. Per `CLAUDE.md` §16 a missing value is a **DESIGN SYSTEM GAP**, not licence to mint a token, so it maps to the nearest approved weight. Flagged for owner decision. |
| **D6** | Footer columns are four **equal** `basis-[292px]` quarters | Matches Figma's four `flex-[1_0_0]` 292px columns. My first pass used differing `min-width`s, which pushed the Contact column under the swoosh. |
| **D7** | X and TikTok social assets render **full-bleed at 32px**; the other three are 16px glyphs on a gradient | Figma exports those two as complete button artwork rather than bare glyphs. Rendering them as 16px glyphs produced a visibly wrong, shrunken icon. |
| **D8** | Contact email and "مركز المساعدة" ship as **links**; Figma has them as flat text | They are actionable contact details. `mailto:` for the address, route link for the help centre. |
| **D9** | **Skip link added** ("تخطَّ إلى المحتوى الرئيسي" → `#main-content`) | WCAG 2.2 SC 2.4.1 Bypass Blocks. A static mockup has no way to express a keyboard affordance; its absence in Figma is not a design decision. |
| **D10** | **`aria-current="page"`** on the active nav item, plus visible focus rings throughout | Figma conveys "active" by green underline alone (colour-only) and defines no focus state at all — only default/hover/active. Both are required for keyboard and AT users. The underline is preserved and always rendered (transparent when inactive) so row height cannot shift between states. |
| **D11** | Semantic landmarks and lists (`<header>/<nav>/<main>/<footer>/<ul>/<li>`), labelled `<nav>`s, accessible names on all icon-only controls, decorative art `aria-hidden` | Figma is flat frames; semantics have no representation there. |
| **D12** | Utilities render as `<button>`s, not text | ☾ / بحث / AR&#124;EN are controls. Theme/search are keyboard-reachable and named but still unwired; AR&#124;EN is now a real control — see D15. |
| **D13** | Nav hidden below `lg`; mobile drawer not built | The approved mobile drawer (`2159:1128`, 390 viewport) is its own increment. Hiding is honest; a broken half-responsive nav would not be. **Open item.** |
| **D14** | Stock `create-next-app` content removed from `page.tsx` | It shipped Next.js branding and a competing full-viewport layout that conflicted with the real shell. Replaced with a minimal placeholder. |
| **D15** | **AR&#124;EN control changed from `<button>` to a real `<Link>`** (i18n foundation, 2026-09-07) | Switching language now navigates to `/en/...` ↔ `/ar/...` — a URL change, so a link is the semantically correct control (links navigate, buttons act in place; WAI-ARIA). Figma shows it as an inert label with no interaction spec either way. |
| **D16** | **D1's DOM-order reversal needed NO locale-conditional change** — same Header/Footer DOM order now serves both `dir="rtl"` (ar) and `dir="ltr"` (en) | Predicted in the i18n planning session as an open hypothesis, now confirmed: verified via rendered HTML at `/ar` and `/en` (`curl`, both dev-server responses inspected) that `dir` alone correctly repositions logo/utilities/columns in both directions. **Caveat:** this is DOM order, not CSS — `LEGAL_LINKS`/`SOCIAL_LINKS` array order and the footer's JSX column order are still fixed data/markup, not re-evaluated per locale; they happen to read correctly in both directions today but were not independently re-verified item-by-item beyond the HTML-level checks described in Part 7. |
| **D17** | Footer decorative swooshes stay **physically positioned and unmirrored** in English too (no locale-conditional flip) | Owner-approved as part of the i18n plan: these are fixed brand artwork (like the logo), not a text flow that should mirror with reading direction. Deliberate, not an oversight. |
| **D18** | Root path `/` redirects with **HTTP 307 (Temporary Redirect)**, not 301/308 | next-intl's `createMiddleware` issues a 307 for locale-prefix redirects by default (verified in the actual response headers) — there is no simple built-in option for a permanent-status redirect. The owner's decision was "permanent redirect to `/ar`" in the sense of *durable default behaviour*; if a literal HTTP-permanent (301/308) status is required (e.g. for SEO), that needs custom `proxy.ts` logic beyond next-intl's default and was not built — flagging rather than assuming which sense was meant. |

## 6.3 Not fixed on purpose — content decisions that are yours

- ~~Footer Quick Links (10) vs header nav (9) diverged~~ — **RESOLVED 2026-09-07**:
  owner decided to reconcile the footer 1:1 with the header. `FOOTER_QUICK_LINKS`
  in `navigation.ts` is now an alias of `PRIMARY_NAV` (9 items, identical order
  and labels), not a second list — closes Homepage Specification §6 row 13.
  Verified: 14/14 tests still pass, `tsc --noEmit` clean. The superseded 10-item
  Figma-verbatim list (with "الرياضيون", "الأخبار", "الاتحاد في الإعلام" as its
  own entry) is not reproduced anywhere in code; it remains in git history only.
- **Nav `href`s are provisional** (`/about`, `/members`, `/tournaments`, …) — no
  routes exist yet and the IA document does not fix these slugs.

## 6.4 Figma-side items still awaiting your approval (untouched)

1. Approved baseline frame `2374:1174` is **8758px tall but its content runs to 9410px** — the Newsletter section is partly clipped and the Footer entirely so, which is why that node screenshots blank.
2. Header and footer are **not real components** — 87 header and 77 footer frames, zero symbols, with measurable drift (header 95 vs 96px; footer heights 364/440/470/500/514/522…).
3. The single node named "Footer Master" sits inside `strategic-plan-tablet-en` at 768px wide.
4. Header height carries the fractional 95.40682px rather than 96px.
5. SemiBold (600) used in the footer is outside the approved four-weight scale (D5).

---

# PART 7 — i18n FOUNDATION BUILD (2026-09-07)

Executed after a plan-only session was presented and approved (root path: permanent
redirect to `/ar`; plan approved as proposed). Library, routing shape, and message
structure verified against next-intl 4.14.2's own docs and Next.js 16.2.9's upgrade
guide at implementation time, not from training memory (see D-context below).

## 7.1 What was built

- `next-intl` installed; `next.config.mjs` wrapped with `createNextIntlPlugin()`.
- `src/i18n/{routing,navigation,request}.ts` — `routing.ts` declares `locales: ["ar","en"]`,
  `defaultLocale: "ar"`; direction mapping (`ar`→`rtl`, `en`→`ltr`) lives alongside it.
- `src/proxy.ts` — Next.js 16 renamed the middleware convention to a **named** `proxy`
  export in `proxy.ts` (not `middleware.ts`/`export default`); confirmed against Next's
  own 16.2.9 upgrade guide, since next-intl's own docs still show the pre-rename pattern.
- `app/` restructured to `app/[locale]/` (`layout.tsx`, `page.tsx`, `globals.css`);
  `favicon.ico` stays at the app root (locale-independent).
- `messages/ar.json` + `messages/en.json` — every previously hardcoded Arabic string
  extracted (layout metadata, nav labels, legal links, social aria-labels, header/footer
  copy, homepage placeholder). English copy is a direct working translation of the
  approved Arabic content, not new copy — **not professionally reviewed**, flagged for
  sign-off before this ships publicly facing English users.
- `src/lib/navigation.ts` — `label` fields replaced with translation `key`s; structure
  (order, hrefs, RTL DOM-reversal data) unchanged.
- `site-header.tsx`/`site-footer.tsx` — converted to `useTranslations()`, next-intl's
  locale-aware `Link`; the 4 physical `text-right` occurrences (3 footer, 1 homepage)
  converted to logical `text-end` (the only physical-class retrofit actually needed —
  `items-end`/`justify-between` etc. are already direction-symmetric per the flexbox
  spec, confirmed rather than assumed).
- `language-toggle.tsx` — new small client component, the real AR|EN control (D15).

## 7.2 Verification

- **Unit tests:** 29/29 passing (`vitest`), both site-header/site-footer suites now
  parametrized across `ar`/`en` via `describe.each`, plus a dedicated language-toggle
  test. A `next/navigation` mock was required in `vitest.setup.ts` (`usePathname` etc.
  return `null` with no real Next.js router mounted in jsdom, which crashed next-intl's
  `Link` on `href.pathname` since `typeof null === "object"` — a test-environment fix,
  not a production code change).
- **HTTP-level verification** (dev server + `curl`, both locales): root `/` → `307` to
  `/ar`; `/ar` renders `lang="ar" dir="rtl"` with Arabic title/H1/nav/aria-labels; `/en`
  renders `lang="en" dir="ltr"` with English equivalents; nav hrefs correctly
  locale-prefixed (`/en/about`, `/en/clubs`, …); `aria-current` still correctly applied.
- **Real browser/screenshot verification was NOT performed.** Both available browser
  tools (Playwright MCP, chrome-devtools MCP) were down (connection timeout) for this
  entire session. HTTP/DOM-level checks above are a genuine but partial substitute —
  they confirm markup, attributes, and translated strings are correct, but do not
  confirm pixel-level layout, wrapping, or spacing under `dir="ltr"`. **This is real
  outstanding verification debt**, not a formality: D16's DOM-order-symmetry finding in
  particular should be re-confirmed visually once a browser tool is available, before
  treating the English layout as production-ready.

## 7.3 Backend fields added the same session (design↔schema mapping pilot follow-up)

Unrelated to i18n but executed under the same owner go-ahead: the read-only Album
Detail mapping pilot (see chat — not reproduced in this file, it never touched
frontend code) found `championshipName`, `photographer`, and `captureDate` had no
backing field anywhere. Owner approved adding them as real fields:

- `Album.championshipName: LocalizedText | null` — **denormalized, captured at
  album-creation time from admin input**, not a live join (the `championships`
  collection doesn't exist yet). Exposed in `AlbumPublicResponseDto`. Explicitly
  flagged in the schema's own doc comment for review when that module is eventually built.
- `MediaFile.photographer: string | null` and `MediaFile.captureDate: Date | null` —
  chosen over `MediaAsset` as the more natural fit (file-intrinsic facts, alongside
  width/height/size, not CMS/presentation concerns like caption/isFeatured). Exposed
  in `MediaFilePublicResponseDto`.
- 8 new unit/integration tests added (`albums.service.spec.ts`,
  `albums.service.public.integration.spec.ts`, `media-assets.service.spec.ts`); full
  `albums`+`media-assets` suite: 42/42 passing. No migration needed — new fields
  default to `null` for existing documents (schema-ready-gap pattern already used
  elsewhere in this schema, e.g. `MediaFile.checksum`).
- ~~**Side finding, not fixed (out of scope):** `api/openapi.json` is committed but
  contains only `/health`~~ — **RESOLVED same day (owner escalation, this was flagged
  twice)**, see Part 8 below.

---

# PART 8 — openapi.json ROOT CAUSE AND FIX (2026-09-07, owner escalation)

Flagged twice in one session (Part 7.3 above, from the read-only mapping pilot) —
owner escalated it to immediate priority. Root cause found and fixed; a durable
one-command regeneration path added; CI/hook-level enforcement proposed but **not**
implemented (would require adding this repo's first CI workflow — flagged for a
separate decision, not executed unilaterally).

## 8.1 Root cause

**There was never an automated generation step at all** — not "forgot to run it."
`main.ts` only ever built the Swagger document in-memory and served it live at
`/api/docs` / `/api/docs-json`; nothing anywhere (`package.json` script, git hook, or
CI) ever wrote that document to the committed `api/openapi.json` file. Confirmed:
- `grep`/`Glob` for `.github/workflows/*` → **no CI pipeline exists in this repo at
  all**, of any kind.
- No script, anywhere in the repo, references `openapi.json` as a write target.

The file was almost certainly hand-created once (someone hit `/api/docs-json` and
committed the output — exactly what this session did to fix it) and then never
regenerated, because nothing was ever wired to catch or prevent that drift. This is
why it recurred/was noticed twice: the underlying gap (no generation step) was never
closed the first time it was flagged.

## 8.2 Fix applied

- `api/src/swagger.config.ts` (new) — extracted the `DocumentBuilder`/
  `SwaggerModule.createDocument` setup out of `main.ts` into one shared function, so
  the live `/api/docs` UI and the committed snapshot can never build the document
  two different ways.
- `api/src/generate-openapi.ts` (new) — boots the full Nest app (no `.listen()`),
  builds the document via the shared function, writes it to `api/openapi.json`,
  closes the app. Needs a reachable `MONGODB_URI` (local or Atlas) to boot — reads/
  writes no data.
- `npm run generate:openapi` (new script, `api/package.json`) — `nest build && node
  dist/generate-openapi.js`. One command, no manual `curl`/copy-paste.
- Regenerated `api/openapi.json`: **158 real paths** (was 1 — `/health` only),
  covering every controller including the same-session `championshipName`/
  `photographer`/`captureDate` additions. Full backend suite re-verified after the
  `main.ts` refactor: **272/272 tests passing, 51/51 suites**.
- Environment note: this sandbox has no network egress to the Atlas cluster in
  `.env` (`Could not resolve host: cluster0.qrypavf.mongodb.net`) — the same
  constraint flagged as an open item in the earlier F1 backend audit. Generation was
  run against the local `mongod` already running on this machine via a
  process-level `MONGODB_URI` override (`.env` itself was not touched); the scratch
  local database used for it was dropped afterward.

## 8.3 New finding surfaced while verifying the fix (not fixed — separate, larger scope)

**Zero of the API's 258 endpoint operations document a response schema** — confirmed
programmatically (`responses['200'].content['application/json'].schema` is absent
everywhere; zero `@ApiResponse`/`@ApiOkResponse`/`@ApiCreatedResponse` decorators
exist anywhere in `src/**/*.controller.ts`). Request bodies ARE documented (via
`@Body() dto: SomeDto` typing), but nothing tells Swagger what any endpoint
*returns* — so even now that `openapi.json` has all 158 real paths, a consumer
reading it cannot see response shapes (e.g. `AlbumPublicResponseDto`'s new
`championshipName` field exists in the code and is now correctly hidden from the
request-side `CreateAlbumDto` schema, but doesn't appear anywhere as a *response*
schema either, since no endpoint declares one). This is systemic and pre-existing,
not something this session introduced or expanded — decorating ~258 operations is a
separate, much larger task than "regenerate the file," so it is reported here, not
attempted.

## 8.4 Proposed prevention (NOT implemented — needs a decision, no CI edited)

Two options, cheapest-first:

**A. Git hook (Husky pre-push or pre-commit), interim, no CI needed:**
Run `npm run generate:openapi` (against a local/dev Mongo) then
`git diff --exit-code api/openapi.json`; block the push/commit if it's dirty. Cheap,
works today, but only protects commits made through a machine with the hook
installed (bypassable with `--no-verify`, and useless in CI-driven merges).

**B. CI gate (durable, but this repo has zero CI today — bigger lift):**
A workflow step (e.g. GitHub Actions with a MongoDB service container) that runs
`npm run generate:openapi` then fails the build on `git diff --exit-code
api/openapi.json`. This is the only option that can't be bypassed locally, but since
`.github/workflows/` doesn't exist yet in this repo, adding it is a repo-level CI
decision beyond "fix openapi.json," and wasn't made unilaterally here.

**Recommendation:** A (git hook) now, as a same-day, zero-dependency safety net;
B (CI gate) the first time this repo stands up CI for any other reason, so this
check rides along rather than justifying CI on its own. Owner decision needed on
whether/when to act on either.

---

# PART 9 — D16 REAL VISUAL VERIFICATION (2026-09-07, chrome-devtools-mcp)

Playwright/chrome-devtools MCP were fixed (Part 8-adjacent finding — see chat: both
hung on an unanswered `npx` install prompt; fixed by installing both packages
globally) and reconnected after a restart. This is the actual pixel-level check
Part 7.2 flagged as outstanding debt — HTTP/DOM inspection replaced with real
screenshots and computed-layout measurements at 1440px width (`dev` server,
`apps/web`, both `/ar` and `/en`).

## 9.1 D16 — CONFIRMED, with measurements

The header's DOM order (Logo → Nav → Utilities) needed no locale-conditional
change. Measured `getBoundingClientRect()` on both locales, same viewport:

| | `/ar` (`dir="rtl"`) | `/en` (`dir="ltr"`) |
|---|---|---|
| Logo | x = 1205–1325 (**right** edge) | x = 24–144 (**left** edge) |
| Utilities (theme/search/AR\|EN) | x = 17–140 (**left** edge) | x = 1307–1441 (**right** edge) |
| Header height | 96px | 96px |

Exact mirror image, both directions, from the identical DOM/JSX — `dir` alone
does the work, confirming the hypothesis raised in the i18n planning session and
carried as open debt through Part 7. D16 in the Part 6.2 deviation table can be
marked **verified**, not just predicted.

## 9.2 NEW FINDING — footer's 4-column row breaks below ~1312px available width (not an i18n/direction issue)

Found while capturing the confirmation screenshots — **not fixed**, per instruction,
documented for a decision instead.

**Symptom:** at 1440px viewport width, the footer's 4th column ("Contact"/"التواصل")
drops to its own row instead of staying alongside the other 3, and then stretches to
fill that entire row's width, dragging its heading/text to the far opposite corner
of the footer (screenshotted in both `/ar` and `/en` — the two are exact mirror
images of the same bug, confirming it is direction-independent).

**Root cause, confirmed via `evaluate_script` measurements, not guessed:**
- The footer row's actual available width at this viewport was **1221px** — not
  the intended 1312px (`max-w-[1312px]`) — because a page vertical scrollbar
  (content is 1110px tall vs. an ~900px viewport window from the harness's browser)
  eats ~15px, and the browser's real usable width was already below 1364px before
  that.
- Four columns at `flexBasis: 292px` + 3×`gap-12` (48px) need **1312px minimum**
  to fit in one row without growing. 1221px < 1312px → the last DOM child (the
  Contact section, per D1's RTL-reversed order) is the one that wraps.
- Every column also carries `flex-1` (grow). Once Contact is alone on row 2 with
  no sibling to share the row, it grows to fill the **entire** 1221px row —
  measured `computedWidth: "1221px"` vs. its siblings' `375px`.
- Contact's own `items-end` (meant to right/left-align its short block of text
  within a normal 292px-wide column) now aligns that content to the *end* edge of
  a box that's 4× too wide — landing it in the opposite corner from where it
  should be, not just wrapping untidily.

**Why this wasn't caught in the original Header/Footer build session:** that
session's screenshot verification (Part 6.1) was taken when the page's total
content was short enough not to trigger a vertical scrollbar — the exact
1312px-vs-available-width margin is razor-thin (essentially zero slack), so the
bug was always latent, just never triggered until a page tall enough to scroll
was screenshotted. **Not an i18n regression** — reproduces identically in `/ar`
without any i18n-related change, given the same scrollbar condition.

**Not fixed. Three options for the owner to choose from, most to least robust:**

A. Rebuild the row as CSS Grid (`grid-cols-4` collapsing to `grid-cols-2` at a
   defined breakpoint) instead of `flex-wrap` + `flex-1` — grid tracks don't
   balloon to fill an abandoned row the way a lone flex-grow item does, so this
   removes the failure mode structurally rather than patching the symptom.
B. Keep flexbox, drop `flex-1` (grow) on these four columns so they stay fixed at
   `292px` even when one wraps alone — wrapping still occurs under the same
   width pressure, but the wrapped column no longer stretches into the opposite
   corner; still not a designed responsive behavior, just a less-broken one.
C. Shave `max-w-[1312px]` down a few px for scrollbar headroom — cheapest, but
   scrollbar width is 0–17px depending on OS/browser (macOS overlay scrollbars
   take 0px), so this is a guess at a moving target, not a real fix.

Classified per CLAUDE.md §13/§24: **RESPONSIVE DESIGN NOT VERIFIABLE below this
exact width band** (no breakpoint behavior was ever specified for the footer
between 1440px and the mobile breakpoint) + **DESIGN DECISION REQUIRED** on which
of A/B/C to apply. Not touched pending that decision.

---

# PART 10 — HUSKY PRE-PUSH HOOK + PRIORITY RESPONSE-SCHEMA DOCS (2026-09-07)

## 10.1 Husky pre-push hook — implemented, tested, two real bugs found and fixed along the way

Implemented Part 8.4 option A exactly as proposed: `.husky/pre-push` regenerates
`api/openapi.json` (`npm run generate:openapi`) and blocks the push if it differs
from what's committed. Root `package.json` gained `husky` as a devDependency plus
the standard `"prepare": "husky"` script.

Tested all three real paths by direct invocation (not just written and assumed —
verification-before-completion):
- **Stale DTO, unregenerated file** → correctly blocked, exit 1, clear message.
- **In-sync file** → correctly passes, exit 0.
- **Unreachable MongoDB** → correctly fails at a bounded 45s, exit 1, clear message
  — not the unbounded hang it did on the first attempt (see below).

**Two real defects found and fixed while testing, not left as "works on paper":**

1. **Unreachable-DB hang.** `npm run generate:openapi` doesn't fail fast when
   `MONGODB_URI` can't be reached — Mongoose keeps retrying, so the first version
   of this hook could stall `git push` indefinitely. Fixed by wrapping the
   generation step in a 45-second Node `exec` timeout (portable — no dependency on
   a shell `timeout` binary, which isn't guaranteed on every OS) that fails
   cleanly with a message pointing at `MONGODB_URI` and the `--no-verify` escape
   hatch.
2. **CRLF/LF false-positive diff.** This repo has `core.autocrlf=true` (Windows
   default) and no `.gitattributes` — so every regeneration showed as a full
   ~800-line diff from line-ending normalization alone, which would have made the
   hook block every push regardless of real content changes. Fixed by adding
   `.gitattributes` (`api/openapi.json text eol=lf`, new file, repo's first) and
   renormalizing the tracked file once.

## 10.2 Response schema documentation — scoped to what the frontend actually consumes today

Checked first, as instructed, rather than assuming: **`apps/web` makes zero API
calls anywhere** (`grep` for `fetch(`/`axios`/etc. across `apps/web/src` — no
matches). Header/footer are fully static, driven by `src/lib/navigation.ts`, not a
backend response. So the "header/footer if they pull real data" condition in the
request is **not currently met** — nothing to document there yet, reported rather
than force-fitted.

The unconditional half of the request — the album endpoint carrying today's new
fields — **is** in scope and done: `GET /albums/public/:slug`
(`AlbumsController.getPublicBySlug`), the only endpoint that returns
`championshipName`/`photographer`/`captureDate`.

- New `AlbumDetailPageResponseDto` (wraps `album`/`mediaAssets`/`relatedAlbums` —
  the endpoint's actual composite shape, previously only expressed as an inline
  TypeScript return type, invisible to Swagger).
- `@ApiOkResponse` with a `oneOf` schema (`AlbumDetailPageResponseDto` **or**
  `null`) — modeled precisely rather than lying about nullability: this endpoint
  really does return HTTP 200 with a literal `null` body (not a 404) when no
  Published album matches the slug, matching `AthleteProfilesService`'s existing
  convention. A generated client that saw only the non-null type would produce a
  response type that's wrong exactly where a caller most needs it right (the
  not-found path).
- Result: **5 previously-unregistered response DTOs** now appear in
  `components.schemas` — `AlbumPublicResponseDto`, `MediaFilePublicResponseDto`,
  `MediaAssetPublicResponseDto`, `RelatedAlbumSummaryDto`,
  `AlbumDetailPageResponseDto`. All already had complete `@ApiProperty()`
  decorators from today's earlier field additions; the only gap was the missing
  `@ApiOkResponse` wiring that would have made Swagger discover them at all.

**A third real bug found while verifying this, not related to the response-schema
work itself:** the `generate-openapi.ts` script built earlier today (Part 8) never
called `app.setGlobalPrefix()`/`enableVersioning()` — so every one of its 158
generated paths was silently missing `/api/v1` (e.g. `/permissions` instead of
`/api/v1/permissions`), diverging from what the real server actually serves. This
had been true since the script was first written, just never checked at the exact
path-string level until now. Fixed by extracting `configureApiRouting()` (new
`api/src/api-routing.config.ts`) shared by both `main.ts` and
`generate-openapi.ts`, so the two can't apply different routing config and
silently diverge — the same fix pattern as Part 8's `swagger.config.ts`, now
applied to routing, not just the document body.

**Verification:** full backend suite re-run after all of the above:
**272/272 tests, 51/51 suites passing.**

## 10.3 Everything else — tech debt, not touched

Per instruction, no other controller was decorated. Confirmed earlier (Part 8.3):
**zero of the API's other ~257 endpoint operations document a response schema.**
That finding stands as reported — systemic, pre-existing, out of scope for this
pass. Priority for the *next* pass, whenever it happens, should follow the same
rule used here: document what the frontend is actually about to consume next, not
the full surface at once.

---

# PART 11 — FOOTER RESPONSIVE FIX + CLAUDE.md §1a (2026-09-07)

## 11.1 New governance rule: CLAUDE.md §1a

Owner decision, applied verbatim, ahead of the fix below: when Figma access is
unavailable and a real responsive/layout decision is required to fix an evidenced
defect, every value must derive from a cited Design System rule (primarily
Chapter 5), never taste — logged as `PENDING FIGMA BACK-SYNC` for review once
access returns. Added to `CLAUDE.md` as **§1a — Design Decisions Under Figma
Unavailability**, directly after §1's Source of Truth Hierarchy. This section
(11) is the first application of it.

## 11.2 Scope correction found before implementation: not a narrow edge case

Part 9.2 described the bug as triggered "below ~1312px available width," framed
as a scrollbar-driven edge case near the approved 1440px width. Re-reading
`site-footer.tsx` before designing the fix surfaced a broader fact: the row
(`flex flex-wrap ... gap-12`, each column `flex-1 basis-[292px]`) carried **zero
breakpoints of any kind**. The same wrap-and-balloon failure therefore applied to
*every* width below 1312px, including real mobile/tablet viewports, not only the
scrollbar-shaved edge — new evidence justifying a real per-breakpoint design
rather than a single CSS patch, consistent with the owner's §1a instruction.

## 11.3 Design — derived from Chapter 5 §5.2/§5.10, each decision cited

Tailwind's default breakpoints (`sm=640, md=768, lg=1024, xl=1280`) are numerically
identical to Design System §5.2's own table, so no custom breakpoint was
introduced — only the existing documented numbers.

| Range | §5.2/§5.10 citation | Applied layout |
|---|---|---|
| ≤767px (xs/sm) | §5.10: "MUST stack vertically... most important first" | `grid-cols-1`; DOM order (Brand→Quick Links→Location→Contact) already documented as the logical order |
| 768–1023px (md) | §5.2: 8 cols / 24px gutter | `grid-cols-2` — 8÷4 sections = 2 columns each, an exact division |
| 1024–1279px (lg) | §5.2: 12 cols / 24px gutter; §5.10: "side-by-side at lg+ MUST NOT stack" | `grid-cols-4`, `gap-x-6`(24px) — fractional, since a fixed 292px column cannot fit even at lg's own upper bound (4×292+3×24=1240px > 1183px max content width) |
| ≥1280px (xl/2xl) | Approved geometry, CLAUDE.md §3 (protected) | `grid-cols-4`, `gap-12`(48px, the pre-existing approved value) — at exactly 1312px available this computes to exactly 292px per column, pixel-identical to the original |

Three fixed-width children (`w-[260px]` brand description, `w-[250px]` location
card, `w-[200px]` address text) were converted to `w-full max-w-[...]` so they
shrink inside a narrower `lg`-band column instead of overflowing it — a necessary
companion change, not scope creep, since the low end of `lg` produces columns
narrower than these hard-coded widths.

## 11.4 TDD

Two new tests added to `site-footer.test.tsx` before implementation, confirmed
**red** against the unmodified component (missing `data-testid`s), then
**green** after the change — plus the full pre-existing 29-test suite re-run
green throughout. jsdom has no layout engine, so these assert only the class
*contract* (grid classes present per breakpoint, `flex-wrap`/`flex-1` gone, fixed
widths converted to fluid); the actual geometry is confirmed in §11.5.
**Final: 31/31 frontend tests passing.**

## 11.5 Real-browser verification — a second real bug caught and fixed, not just the planned check

Verified via `chrome-devtools-mcp` against a live `next dev` server, both real
window resize and CDP viewport emulation (this sandbox's physical screen caps
window resize at ~1360px, so exact 1440px required emulation) — 8 states (AR/EN
× 375/500px, 900px, 1100px, 1440px), each cross-checked with `getBoundingClientRect()`
measurements, not screenshots alone.

**Bug found by this verification, not assumed away:** the first implementation
used `xl:flex` + fixed `xl:basis-[292px]` (a literal port of the original
markup, `flex-wrap` and `flex-1` merely removed). At 1364px viewport (inside the
"protected" ≥1280px band, with a vertical scrollbar shaving a few px), the fixed
1312px-wide row no longer fit its 1221px-1364px actual container — and because
`flex-wrap` was gone, it no longer wrapped either; it **overflowed and was
clipped** by the footer's own `overflow-hidden`, measured at `left: -27px` on the
Contact column. Same "1312px, zero slack" root cause as the original bug (Part
9.2), just manifesting as an invisible clip instead of a wrap-balloon.

**Fix:** replaced the `xl:flex`+fixed-basis block with `xl:gap-12` on the same
`grid-cols-4` used at `lg`, so the row stays a CSS grid at every breakpoint from
`lg` upward — grid `1fr` tracks shrink proportionally under pressure instead of
overflowing. Re-verified at the exact failing width (1364px): columns shrunk to
269px, zero overflow, zero clip. Re-verified at true 1440px (CDP-emulated):
exactly 292px per column, pixel-identical to the pre-existing approved geometry.
Also observed, and correctly handled, the same scrollbar effect occurring
naturally between locales: `/en`'s marginally taller content triggered a real
scrollbar at 1440×900 that `/ar` didn't, shrinking columns to 288px on that
locale alone — exactly the graceful-degradation behavior the fix exists to
provide, confirmed by measurement, not asserted.

All 8 states, final screenshots: correct stacking/2×2/4-column layouts, correct
AR↔EN mirroring (same CSS, `dir`-driven, no locale-conditional logic — direction
handling is inherited, not re-implemented), no overflow, no clipping, no balloon.

## 11.6 New, unrelated deviation found during this verification — not touched

At the `lg` band (measured at 1100px), the **header's** desktop nav
(`site-header.tsx`, `nav.hidden lg:block`) overflows to `document.documentElement.scrollWidth: 1441` while `window.innerWidth` is `1100` — the nav's item list has
no responsive treatment of its own within the `lg` band and runs off the right
edge. This is unrelated to the footer fix (different component, different root
cause: no per-item compaction/hidden-menu logic vs. the footer's fixed-width
grid math) and was not touched, per the same "document, don't fix without
permission" discipline as Part 9.2. Confirmed via direct `getBoundingClientRect()`
enumeration of every overflowing element — all 17 offending nodes trace to the
header nav list, none to the footer.

## 11.7 PENDING FIGMA BACK-SYNC

Per CLAUDE.md §1a, logged here for review once Figma access returns:

1. Footer `md` layout (768–1023px, 2×2 grid) — no Figma frame exists yet at this
   width; derived from §5.2's 8-column/24px-gutter row and §5.10, per §11.3.
2. Footer `lg` layout (1024–1279px, fractional 4-column grid) — no Figma frame
   exists yet at this width; derived from §5.2's 12-column/24px-gutter row and
   §5.10, per §11.3.
3. Footer `xs`/`sm` stacked layout (≤767px) — no Figma frame exists yet; derived
   from §5.10's stacking mandate using the DOM order already established as
   "logical order" in the existing code comment.

Not pending back-sync: the `xl`/`2xl` treatment is unchanged in its approved
pixel outcome (292px columns at 1440px) — only its CSS mechanism changed
(grid instead of flex), which has no Figma-visible surface.

## 11.8 Also flagged, not part of this task's scope

The header `lg`-band nav overflow (§11.6) — needs its own decision (compact nav
item set, a hidden-menu breakpoint, or something else) before any fix; not
decided or touched here.

## Executive Decision (this Part)

**PASS WITH DOCUMENTED DEBT.** Footer wrap/balloon/clip defect resolved across
all four Chapter-5-derived breakpoints, verified by both automated tests and
real-browser pixel measurement in both locales; one regression introduced during
implementation was caught by that same verification and fixed before sign-off.
Remaining debt: §11.6's header nav overflow (`DESIGN DECISION REQUIRED`, out of
scope) and §11.7's three Pending Figma Back-Sync items (owner review once Figma
access returns).

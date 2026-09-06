# Full Backend Verification & Code Review — 2026-09-06

Read-only audit. Independently re-verifies the two already-merged hardening
passes on `main` (P0/P1 9-item pass, documented in
`docs/audits/p0-p1-implementation-notes.md`; auth hardening 4-item pass,
documented in `api/docs/audits/p0-fix-session-notes-2026-09-06.md`) against
the current state of the repository and a real, currently-running MongoDB
instance. No code was changed. No git state was changed (working tree had
two pre-existing uncommitted files from an unrelated earlier task this
session — `CLAUDE.md`, `docs/engineering/` — neither touched here).

Git state at the start of this audit: branch `main`, HEAD `91a478b`.

Methodology: `superpowers:verification-before-completion` and
`superpowers:requesting-code-review` were both available this session and
were applied — every verdict below is backed by a command actually run in
this session (shown inline), not by reading code and inferring behavior.

---

## 1. Summary Verdict

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| A1 | `AuditLogsRepository` no `updateById`/`softDelete` | **CONFIRMED** | `api/src/modules/workflow/audit-logs/audit-logs.repository.ts` — class has only `create()`; does not extend `BaseRepository` |
| A2 | `entityType` casing (`kebabToCamel`) still wired, survives reorg **and** the later `/api/v1` prefix rollout | **CONFIRMED** | `kebab-to-camel.util.ts` (pure string transform, location-independent); `audit-log.interceptor.ts:96-109` explicitly strips `API_GLOBAL_PREFIX`/`v\d+` before reading the entity segment (added in the same commit that introduced the prefix, `91a478b`); spot-checked 3 post-reorg collections (`electionCycles`, `clubTeams`, `officialAssignments`) all correctly derivable from their controller paths; global `APP_INTERCEPTOR` registration intact (`app.module.ts:166`); 64/64 current `@Controller()` paths all kebab-case |
| A3 | `auditLogs`/`notifications` compound indexes exist in a real Mongo instance | **RESOLVED (local instance only)** | Originally PARTIAL — see Finding F1 and its Resolution subsection below. Materialized via `Model.syncIndexes()` against local `mongodb://127.0.0.1:27017/uaeaf`; still not verified against the app's actual configured target (Atlas), which remains unreachable from this environment. |
| A4 | `users.email` `lowercase`/`trim` + matching login-lookup normalization | **CONFIRMED** | `user.schema.ts:34` (`lowercase: true, trim: true`); `users.repository.ts:28` (`email.toLowerCase().trim()`) |
| A5 | `clubs`/`coaches.registrationNumber` uniqueness + `ConflictException` on duplicate | **CONFIRMED** | Schema unique index present; `clubs.service.ts`/`coaches.service.ts` catch the duplicate-key error and throw `ConflictException`; `clubs.service.spec.ts:27-34` explicitly asserts this and passes |
| A6 | Partial-unique-index conversion (`partialFilterExpression: { archivedAt: null }`) applied across the full set | **RESOLVED (local instance only)** | Code correct on all 9 affected collections/13 fields (see Finding F2 re: the task's "11 collections" figure). Originally PARTIAL — the live local `uaeaf` database's `email_1`/`slug_1`/`registrationNumber_1`/`athleteId_1`/`officialId_1`/`key_1` indexes were plain `unique: true` with no `partialFilterExpression`. Fixed via `syncIndexes()` and behaviorally re-verified end to end (active/active reject, archived-slug reuse, archived/archived coexist) — see Finding F1's Resolution subsection. Still not verified against Atlas, the app's actual configured target, which remains unreachable from this environment. |
| A7 | `contactMessages` `@MaxLength()` + body-size limit | **CONFIRMED** | DTO has `@MaxLength` on all 4 free-text fields (200/254/30/5000); `main.ts:35-36` sets `json`/`urlencoded` limit to `1mb` |
| A8 | Rate-limit guard still applied to both routes; `@nestjs/throttler` still incompatible today | **CONFIRMED** | `@RateLimit(10,60)` on `POST /auth/login`, `@RateLimit(5,60)` on `POST /contact-messages`; `RateLimitGuard` is the first global `APP_GUARD`; `npm view @nestjs/throttler` (run fresh today) still reports peer range capping at `^11.0.0` for `@nestjs/common`/`@nestjs/core` vs. this project's `^12.0.1` |
| B9 | Real duplicate-data pre-checks against a populated DB | **CONFIRMED, but vacuous** | The `uaeaf` database now exists (it did not on 2026-09-04) and is no longer literally empty (`contactMessages` has 1 document) — but all 9 collections the pre-checks target (`users`, `clubs`, `coaches`, `disciplines`, `athleteProfiles`, `officialProfiles`, `albums`, `pages`, `navigationMenus`) still show **0 documents**. Actual aggregation queries were run (not skipped) and returned zero collisions, but with nothing to collide against. See Finding F3. |
| B10 | MongoDB service state; no lingering effect on `restaurant` | **CONFIRMED**, plus one unrelated observation | Windows service `MongoDB`: `Status=Running`, `StartType=Automatic` — normal. Single-node replica set `rs0`, this node `PRIMARY`. `restaurant` database intact (118 collections). See Finding F4 re: an unexpected empty `restaurant_verify_scratch` database and a dbPath discrepancy vs. the prior session's notes. |
| B11 | Rate-limiter in-memory nature documented durably | **CONFIRMED** | Code comment `rate-limit.guard.ts:41-45` (explicit "flagged, not solved here"); `docs/audits/p0-p1-implementation-notes.md:31-49` |
| C12 | Full test suite counts vs. last reported baseline | **CONFIRMED (exceeds baseline, no drop)** | Unit: **51/51 suites, 266/266 tests** (baseline 50/50, 237/237). E2E: **13/13 suites, 13/13 tests** (baseline 7/7 suites). See §3. |
| C13 | Reorg regression skim (duplicate logic, stale imports, duplicated schema files) | **CONFIRMED / NOT AN ISSUE** | `npm run build` → exit 0, clean. No leftover flat-layout module directories. No duplicate `*.schema.ts` basenames anywhere in the tree. No stale relative-import patterns found. One unrelated lint finding logged in §4, not a reorg regression. |
| D | `schema-audit-2026-09-04.md` stale paths | **CONFIRMED still stale (flag only, not fixed)** | `grep -c "modules/[a-z-]*/"` → exactly **70** matches, matching the "~70" figure in the implementation notes; spot-checked ~19 of the referenced flat paths (e.g. `modules/clubs/`, `modules/athletes/`) and confirmed none exist on disk post-reorg |

No item came back **REGRESSED** or **BLOCKED**.

---

## 2. Findings Requiring a Decision

### F1 — P1 — Two live-database index states don't match the code (A3, A6)

**What:** The code for both the `auditLogs`/`notifications` compound
indexes (A3) and the 9-collection partial-unique-index conversion (A6) is
correct and unit/integration-tested (those tests run against an ephemeral
`mongodb-memory-server`, which always builds indexes fresh and so cannot
surface this). But the real, persistent `uaeaf` database on this machine —
the only real Mongo instance available to check against — does not have
either:

- `auditLogs`/`notifications`: no compound indexes at all, only `_id_`.
- `users.email`, `clubs`/`coaches.slug`/`registrationNumber`,
  `disciplines.slug`, `athleteProfiles`/`officialProfiles.slug`/
  `.registrationNumber`/`.athleteId`/`.officialId`, `albums`/`pages.slug`,
  `navigationMenus.key`: all present as plain `unique: true` indexes, with
  **no** `partialFilterExpression`.

**Why this matters concretely, not just theoretically:** MongoDB does not
retroactively alter an existing index's options when the code that builds
it changes — `createIndexes()` either leaves a same-named/same-key index
alone or errors on a genuine conflict; it never silently upgrades one.
Right now, in this real database, a soft-deleted user's email (or a
club/coach slug or registration number) **would still permanently block
reuse** — the exact defect A6 was written to close is still live in this
environment, despite the code being correct.

**Most likely explanation (evidence, not certainty):** `contactMessages`
in this same database has its own correct index
(`status_1_createdAt_-1`) and one real document, which means the actual
compiled app did connect to and successfully `autoIndex` against this
database at some point. The most consistent explanation for
`auditLogs`/`notifications` having *no* compound index at all, and the
unique fields having the *old, non-partial* shape, is that this run
happened from a checkout that predates both the auditLogs/notifications
index additions and the partial-index conversion — i.e., this database has
not been touched by the app since those two P0/P1 sub-items were merged.

**Recommended action (not performed here — read-only audit):** restart the
app once against this database (or run a small one-off
`Model.syncIndexes()` per affected model) and re-run `getIndexes()` to
confirm convergence, before this environment is used for anything beyond
local smoke-testing. This is a pure operations/runtime-sync step, not a
code change.

**Severity:** P1 — the code is right, but "the code is right" is not the
same claim as "the running system enforces it," and this audit was asked
to verify the latter.

### F1 — Resolution (2026-09-06, follow-up session)

**Scope-changing discovery made before any index was touched:**
`api/.env`'s `MONGODB_URI` no longer points at
`mongodb://127.0.0.1:27017/uaeaf` — it now points at a MongoDB Atlas
cluster (`cluster0.qrypavf.mongodb.net`). `api/.env.example` was updated
to the Atlas SRV template in the same commit as the auth-hardening pass
(`61c820f`, 2026-09-06), so this is a deliberate, recent change, not
leftover state. Practical consequence: **local mongod — the only instance
this and the original audit session checked — is not the database the
app is actually configured to use right now.** A direct connection
attempt to the configured Atlas URI from this environment failed:
```
MongoServerSelectionError: connect ETIMEDOUT 159.41.67.98:27017.
It looks like this is a MongoDB Atlas cluster. Please ensure that your
Network Access List allows connections from your IP.
```
This is an Atlas Network Access List (IP allowlist) restriction — nothing
fixable from inside this session. Presented to the project owner, who
chose: fix local now, track Atlas as a separate follow-up. **Atlas itself
has not been checked or modified in any way and its index state relative
to A3/A6 remains genuinely unknown.**

**Pre-check (Step 1):** re-ran the full active/active, archived/archived,
and active-vs-archived collision scan across all 9 partial-unique fields
against local `uaeaf`, fresh, immediately before touching anything.
Every collection was still empty (0 documents) — zero collisions,
confirmed, nothing to report or halt on.

**Materialization (Step 2):** used `Model.syncIndexes()` — the project's
own established mechanism for reconciling a live collection's indexes
against its current Mongoose schema (the same primitive its own
`*.repository.spec.ts` files use via `ensureIndexes()`; `syncIndexes()` is
the correct sibling here specifically because it also *drops* an
existing same-name index whose options no longer match the schema, which
`ensureIndexes()`/`createIndexes()` alone will not do). Ran once per
affected model, using the actual compiled schema objects from `dist/`
(zero risk of re-typing index definitions by hand) connected directly to
`mongodb://127.0.0.1:27017/uaeaf` via a temporary script created and
deleted within this session — never committed, confirmed absent from
`git status` afterward.

Result — old plain-`unique` indexes dropped and rebuilt with the correct
`partialFilterExpression`:
```
users            : dropped/created ["email_1"]
clubs            : dropped/created ["slug_1"]
coaches          : dropped/created ["slug_1"]
disciplines      : dropped/created ["slug_1"]
athleteProfiles  : dropped/created ["athleteId_1","registrationNumber_1","slug_1"]
officialProfiles : dropped/created ["officialId_1","slug_1","registrationNumber_1"]
albums           : dropped/created ["slug_1"]
pages            : dropped/created ["slug_1"]
navigationMenus  : dropped/created ["key_1"]
```
`auditLogs` and `notifications` had nothing to drop (no prior conflicting
index); both compound indexes were newly created and confirmed present
in the post-sync `getIndexes()` output:
`entityType_1_entityId_1_timestamp_-1`, `actorId_1_timestamp_-1` on
`auditLogs`; `recipientId_1_readState_1_timestamp_-1` on `notifications`.

Incidental, in-scope-by-construction side effect: `albums` also picked up
two of its own previously-missing (unrelated, pre-existing-schema, not an
F1 item) indexes — `contentCategoryId_1_publicationState_1` and the
`associations.ownerType`/`ownerId` compound index — since `syncIndexes()`
reconciles every index on a model, not just the one under investigation.
Zero cost (0 documents in the collection) and correct per that schema's
own already-approved definitions; not a new decision, just the same
mechanism doing its job on the same collection.

**Verification (Step 3):**

1. `getIndexes()` on all 11 collections re-run post-sync — every index now
   matches its schema definition exactly (full JSON captured during this
   session; the field-set summary above is the complete diff from before).
2. Three-part behavioral re-test on `athleteProfiles.slug`, executed
   directly against local `uaeaf` and cleaned up immediately after (0
   real documents before and after — confirmed):
   - Two **active** docs sharing a slug → **correctly rejected**:
     `E11000 duplicate key error ... index: slug_1 dup key: { slug:
     "f1-verify-slug" }`.
   - Archiving the first doc, then inserting a **new active** doc with the
     same slug → **correctly succeeded** (this is the exact defect the
     fix exists to close).
   - Archiving that second doc too, so **two archived** docs share the
     same slug → **correctly allowed** (count confirmed = 2).
3. App boot: `node dist/main.js` against the now-fixed local database →
   `Nest application successfully started`, no index-conflict or other
   error, all modules initialized cleanly.
4. Full suite re-run after the fix: **51/51 unit suites, 266/266 unit
   tests, 13/13 e2e suites, 13/13 e2e tests** — identical to the
   already-confirmed post-hardening baseline, no drop. (Expected: all
   tests run against an ephemeral `mongodb-memory-server`, not local
   `uaeaf`, so this reconfirms no regression rather than exercising the
   fix itself — the behavioral re-test in point 2 is what exercises the
   fix.)

**Status: RESOLVED for the local MongoDB instance. OPEN / BLOCKED for
Atlas** — the database the running application is actually configured to
use has not been checked at all. Next action is the project owner's:
add this environment's (or the real deployment's) egress IP to the Atlas
cluster's Network Access List, after which this exact procedure
(pre-check → `syncIndexes()` → behavioral re-test) should be repeated
against Atlas before this finding is considered fully closed.

### F2 — Informational — the task's "11 collections" figure doesn't match the source plan (A6)

The task brief for this audit says "confirm all 11 collections listed in
the original plan." The original plan
(`docs/audits/schema-audit-2026-09-04.md` §9.2, restated in its P1
roadmap item 6) actually lists **13 affected fields across 9 collections**
(`users`, `clubs`, `coaches`, `disciplines`, `athleteProfiles`,
`officialProfiles`, `albums`, `pages`, `navigationMenus`) — matching
exactly the 9 schema files in `p0-p1-implementation-notes.md`'s item-6
file map. No 11-collection list exists anywhere in the source documents.
This doesn't change the verdict (all 9/13 are confirmed correct in code —
see F1 for the separate live-index gap) — flagging only so "11" isn't
carried forward into a future task as if it were the real count.

### F3 — Informational — the `uaeaf` database is no longer empty, but still not usefully populated (B9)

Between the 2026-09-04 pre-check session and today, something (most likely
a manual local run of the dev server, given the single `contactMessages`
document) caused the `uaeaf` database to come into existence on this
machine. This means the "database is empty" framing from the original
pre-check is now technically outdated, but the actual pre-check conclusion
is unchanged: none of the 9 collections the duplicate-checks target have
any data yet, so the checks (run fresh this session, not skipped) still
report zero collisions because there is still nothing to collide. This
should be re-run again once real seed/test data exists.

### F4 — Informational — environment has changed shape since 2026-09-04; one unexplained empty scratch database (B10)

Two observations, neither a regression and neither touched or altered
during this audit:

1. The MongoDB Windows service currently in use has `dbPath: C:\Program
   Files\MongoDB\Server\8.2\data` and runs as a single-node replica set
   (`rs0`, this node `PRIMARY`) — a different setup than the `C:\data\db`
   manual `mongod` invocation described in
   `docs/audits/p0-p1-implementation-notes.md`. This is consistent with
   the owner having since installed/configured MongoDB properly as a
   service rather than the one-off manual invocation used for the earlier
   audit's pre-checks, and is almost certainly what actually explains F1
   (a different, and until-recently-empty, database that hasn't yet been
   touched by a post-hardening app run). Not itself a problem.
2. `listDatabases` also shows a small (`24KB`, 2 empty collections:
   `branches`, `employees`) `restaurant_verify_scratch` database that
   isn't mentioned in any prior session's notes and wasn't created by
   this session. It's empty and harmless, but its existence is
   unexplained — noted per the task's explicit request to check for any
   lingering effect on the unrelated `restaurant` project. The `restaurant`
   database itself is intact (118 collections, untouched).

---

## 3. Test Suite Results

| Suite | Current | Last reported baseline | Delta |
|---|---|---|---|
| Unit — suites | 51/51 passed | 50/50 | +1 |
| Unit — tests | 266/266 passed | 237/237 | +29 |
| E2E — suites | 13/13 passed | 7/7 | +6 |
| E2E — tests | 13/13 passed | (not separately reported) | — |
| Build (`nest build`) | exit 0, clean | — | — |
| Lint (`oxlint`) | 13 errors (see §4) | — | new since baseline |

Commands run this session:
```
npm test                 # 51 suites, 266 tests, 112.6s
npm run test:e2e         # 13 suites, 13 tests, 123.8s
npm run build            # exit 0
npm run lint             # 13 errors, all one pattern (see §4)
```
The increase in both unit and e2e counts is fully explained by the auth
hardening pass's new spec files (`auth.service.spec.ts`,
`roles.service.spec.ts`, `config/validation.schema.spec.ts`,
`auth-sessions.e2e-spec.ts`, `jwt-token-type.e2e-spec.ts`,
`password-hash-leak.e2e-spec.ts`, `privilege-escalation.e2e-spec.ts`,
`rate-limit-login.e2e-spec.ts`, `rate-limit-contact-messages.e2e-spec.ts`)
— no count dropped anywhere.

---

## 4. Anything Else Noticed (out of this audit's explicit scope — logged, not acted on)

- **`oxlint` reports 13 `no-unused-vars` errors, one per e2e spec file,
  all for the same unused `ValidationPipe` import** (e.g.
  `test/e2e/workflow-engine.e2e-spec.ts:24`,
  `test/e2e/auth-rbac.e2e-spec.ts:28`, and 11 others). Not caused by the
  domain-folder reorg or either hardening pass specifically — looks like a
  copy-pasted e2e bootstrap block that imports `ValidationPipe` without
  using it directly (likely superseded by a shared test app-factory).
  Mechanical, zero functional risk, but is a real current lint failure a
  reviewer would flag. **FOLLOW-UP, severity: cosmetic/P2.**
- The four P0 auth-hardening items' own implementation notes
  (`api/docs/audits/p0-fix-session-notes-2026-09-06.md`) already disclose
  three of their own pieces of still-open debt (`roles:Assign` not a
  separate permission, auth-lifecycle events not written to `auditLogs`,
  `AuthSession` rows never cleaned up / no TTL index) — these are already
  correctly self-documented as open P1/P2 debt by that session and are not
  re-litigated here; re-verifying them wasn't in this audit's scope.
- `docs/audits/schema-audit-2026-09-04.md`'s own P2/P3 roadmap items
  (10, 12, 14, 15, 16 in its §10) were not in this audit's 13-item scope
  and were not checked.

---

## Executive Decision

**PASS WITH DEBT.** All 13 checked items are either fully confirmed or
resolve to informational/environmental notes; the code for every
hardening item is correct. Finding F1's index-materialization gap has
been fixed and behaviorally re-verified against the local MongoDB
instance (see F1's Resolution subsection, 2026-09-06 follow-up). It
remains genuinely **BLOCKED** against the one database that actually
matters for production correctness — the Atlas cluster `api/.env` now
points the app at — because this environment's IP isn't on that
cluster's Network Access List. That is an infrastructure/access item for
the project owner, not a code or index-definition problem: the same
`syncIndexes()` + behavioral-retest procedure used here should be
repeated against Atlas once reachable.

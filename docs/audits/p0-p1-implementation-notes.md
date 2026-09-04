# P0 + P1 Hardening — Implementation Notes

Companion to `schema-audit-2026-09-04.md`. Covers the 9 approved items
(P0 #1, P1 #2–#9), implemented directly on `main` and left uncommitted
per this session's instructions.

## Pre-check results (Items 4, 5, 6)

No local/dev database was reachable at session start (`mongod` was not
running). The project's `.env` points at `mongodb://127.0.0.1:27017/uaeaf`,
and the machine has a MongoDB 8.2 installation with a real, non-empty data
directory (`C:\data\db`) — but that data directory's only user database is
`restaurant`, an unrelated project. `mongod` was started against it
specifically to run the required pre-checks honestly against real
infrastructure rather than skip them; it was shut down again once the
checks completed.

Formal pre-check queries were run against `uaeaf.users`, `uaeaf.clubs`,
`uaeaf.coaches`, `uaeaf.disciplines`, `uaeaf.athleteProfiles`,
`uaeaf.officialProfiles`, `uaeaf.albums`, `uaeaf.pages`, and
`uaeaf.navigationMenus`. **None of these collections exist** — the `uaeaf`
database has never been seeded on this machine. Result: zero
case/whitespace email collisions (Item 4), zero duplicate
`registrationNumber` values (Item 5), and zero archived+active collisions
on any Item 6 field — all trivially, because zero documents exist in any
of them. This is a genuine pre-check outcome, not a skipped step; if a
seeded dev database becomes available later, re-running these same queries
before the next deploy is still worthwhile since this session's finding
only covers "as of 2026-09-04, this machine."

## Deviation from the plan: rate limiting (Item 8)

Per the task's own allowance ("or equivalent already-vetted package if you
find a reason `@nestjs/throttler` doesn't fit — flag and ask before
substituting"): `@nestjs/throttler`'s currently published peer-dependency
range is `@nestjs/common`/`@nestjs/core` `^7–^11`, and this project runs
NestJS **12.0.1** — confirmed fresh this session via `npm view
@nestjs/throttler peerDependencies`, not assumed from prior work. Installing
it would mean forcing an unsupported peer-dependency combination.

Built a small custom `RateLimitGuard` instead (`common/guards/rate-limit.guard.ts`
+ `common/decorators/rate-limit.decorator.ts`): an in-memory, fixed-window
request counter keyed by `${controller}.${handler}:${ip}`, registered
globally via `APP_GUARD` with a generous default (100 req/60s), overridden
per-route via `@RateLimit(limit, windowSeconds)` on `POST /auth/login`
(10/60s) and `POST /contact-messages` (5/60s). In-memory only — correct for
this project's current single-process deployment, does not share counters
across multiple instances if the platform is later horizontally scaled.
Flagged, not solved here.

## Out-of-scope items noticed, not fixed

- **`docs/audits/schema-audit-2026-09-04.md`'s internal path references are
  stale.** That audit was originally written against the flat
  `api/src/modules/<name>/` layout. Earlier today's separate
  `refactor/modules-domain-folders` work (merged to `main` before this
  session started) reorganized every module into domain subfolders
  (e.g. `modules/audit-logs/` → `modules/workflow/audit-logs/`,
  `modules/users/` → `modules/platform-administration/users/`). The audit
  document itself was copied over unmodified (~70 internal `modules/...`
  path references now point at pre-refactor locations) since rewriting a
  655-line historical audit report's paths is outside this session's
  9-item scope — flagged here rather than silently done as a side effect.
- No other issues were noticed outside the 9 approved items while working
  through them.

## Item-by-item file map (for reviewer convenience)

All paths below reflect the current post-refactor `main` layout, not the
audit document's.

1. `modules/workflow/audit-logs/audit-logs.repository.ts` (+ new
   `.repository.spec.ts`)
2. `common/utils/kebab-to-camel.util.ts` (new), `common/interceptors/audit-log.interceptor.ts`
3. `modules/workflow/audit-logs/schemas/audit-log.schema.ts`,
   `modules/workflow/notifications/schemas/notification.schema.ts` (+ new
   `notifications.repository.spec.ts`)
4. `modules/platform-administration/users/schemas/user.schema.ts`,
   `users.repository.ts` (+ new `users.repository.spec.ts`)
5. `modules/people-organizations/clubs/{schemas/club.schema.ts,clubs.service.ts}`
   (+ new `clubs.service.spec.ts`),
   `modules/people-organizations/coaches/{schemas/coach.schema.ts,coaches.service.ts}`
   (+ new `coaches.service.spec.ts`)
6. Partial-index conversion: `users/schemas/user.schema.ts`,
   `people-organizations/clubs/schemas/club.schema.ts`,
   `people-organizations/coaches/schemas/coach.schema.ts`,
   `athletics/disciplines/schemas/discipline.schema.ts`,
   `people-organizations/athlete-profiles/schemas/athlete-profile.schema.ts`
   (+ new `athlete-profiles.repository.spec.ts`, the representative test),
   `people-organizations/official-profiles/schemas/official-profile.schema.ts`,
   `media-center/albums/schemas/album.schema.ts`,
   `cms-page-composition/pages/schemas/pages.schema.ts`,
   `cms-page-composition/navigation-menus/schemas/navigation-menus.schema.ts`
7. `modules/public-communication/contact-messages/dto/create-contact-messages.dto.ts`
   (+ new `create-contact-messages.dto.spec.ts`), `contact-messages.controller.ts`,
   `src/main.ts` (body-size limit), `test/e2e/governance-cms-public.e2e-spec.ts`
   (over-limit 400 assertions added)
8. `common/decorators/rate-limit.decorator.ts` (new),
   `common/guards/rate-limit.guard.ts` (new, + `.spec.ts`), `app.module.ts`,
   `modules/platform-administration/auth/auth.controller.ts`,
   `modules/public-communication/contact-messages/contact-messages.controller.ts`,
   `test/e2e/rate-limit-login.e2e-spec.ts` (new),
   `test/e2e/rate-limit-contact-messages.e2e-spec.ts` (new)

## Verification summary

Baseline (before any item): 42/42 unit suites, 205/205 unit tests, build
clean. After all 9 items: **50/50 unit suites, 237/237 unit tests, 7/7 e2e
suites** (up from a 5/5 e2e baseline — the 2 new rate-limit specs).
Verified after every individual item, not just at the end.

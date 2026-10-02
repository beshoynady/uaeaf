# Public Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **No step in this plan stages or commits anything** — all work stays uncommitted for the owner (CLAUDE.md §33). A task is done when its verification command is green, not when something is committed.

**Goal:** Build the `publicEvents` collection end-to-end — backend module published through `PublishingService` from day one, permissions, search source, the hero bar's `nextEventId`, dashboard list/form/section screens, and the public `/events` (cards + calendar), `/events/[slug]`, homepage section, hero bar and header card — without changing or deleting any field on any existing schema, without a migration, a new external service or a new npm dependency.

**Architecture:** A new NestJS module at `api/src/modules/public-communication/public-events/` (FigJam places `publicEvents` in DOMAIN 4 — Content beside `articles`; spec §3), shaped like `seasons` for CRUD and like `articles` for publishing (submit + publish + publish-approved + editorial-state). The collection name is exactly `publicEvents`, because `PublishingService.modelFor` finds a model by collection name. Every Dubai calendar-day computation in the API goes through the existing `api/src/common/utils/dubai-day-range.util.ts`; the web and dashboard get the same rule as `@uaeaf/content/events`, pinned to the API's behaviour by a shared-vector parity test. Albums and videos already point at events (`album.publicEventId`, `video.associations`), so the past-event page reads them through their existing public filters.

**Tech Stack:** NestJS 10 / Mongoose (API, Jest under ESM), Next.js App Router + next-intl (`apps/web`, Vitest), Next.js (`apps/dashboard`, Vitest), `@uaeaf/content` workspace package (Vitest).

**Spec:** `docs/design-specs/events/2026-09-29-events-design.md` — task headers cite the spec section they implement. Where a task depends on an owner decision, it names it as `D-n` from spec §17; **a task marked BLOCKED must not start until that decision is recorded in `docs/design-specs/decision-log.md`.**

## Global Constraints

- **Test commands.** API: `cd api && npm test -- <path> --runInBand`. Plain `npx jest` runs zero tests under this repo's ESM setup, and DB suites fail spuriously without `--runInBand` (spec M-22). Web/dashboard/package: `npx vitest run <path>` from the app's folder. Type-check: `npx tsc --noEmit` in the app's folder. **Never `nest build`** while a dev API runs under `--watch` — it deletes `dist/` and leaves the API bound to nothing.
- **No database writes.** No task runs `sync:permissions`, a seed, or any script that writes to MongoDB. Where a step needs one, it is written as an instruction for the owner. `api/.env` is never edited.
- **Three agents are building seasons in the same folders right now.** Every task that touches a file listed in spec §16 starts with `git diff -- <file>` and a fresh read, and edits only its own lines. Never overwrite, restore or reformat another agent's hunk.
- **Arrow functions** for every new function and in every touched file, per CLAUDE.md §30 and its exceptions (class/decorated methods, dynamic `this`, generators, overloads, `arguments`, hoisting).
- **Tokens only.** No hex, no free px in `apps/web`/`apps/dashboard`; the drawings' values are mapped to tokens, and sizes off the Chapter 4 scale go to D-18, not to the nearest number.
- **Checks at the moment of action (CLAUDE.md §31).** Submit/publish/visibility/featured handlers read current state inside the handler; each gets a test that changes the state between request and action.
- **Out of scope unless its decision is recorded:** `.ics` feed and calendar-service buttons, export (D-11); public document serving (D-7); creating venues from the event form (D-10); championship linking in any DTO (D-6); the homepage section (D-13).

## Reconciliation — assumptions vs. code

The full, cited list is spec §18 (M-1 … M-26). The ones that change what a task below does:

1. `publicEvents` is already in `WORKFLOW_ENTITY_TYPES` (`workflow-entity-types.ts:34`) with empty rows in `entity-content.ts:51,173` → Task 8 fills rows, it does not add a type.
2. `PublishingService.markLive` writes `publicationState: 'Live'` (`publishing.service.ts:303`) → the schema uses `PUBLICATION_STATES`, and every public filter reads `'Live'`. (Seasons read `'Published'` — M-2, reported in Task 38, not fixed here.)
3. Seasons has no `publish-approved` route (M-3) → Task 7 mounts all four publishing routes after `articles.controller.ts:152-198`.
4. The search source's `publicFilter` is static (`search.service.ts:77-95,136`) → Task 12 adds `publicFilterAt(now)`.
5. `GET /sponsorships/public` hides `targetId` → partners are read server-side in the events module (Task 6).
6. `Venue` has no city and no public route → the public response embeds `{name, latitude, longitude}` read by the server (Task 6).
7. `Countdown` is bound to `NextEventLike` and hides itself without a bilingual label/venue → Task 24 generalizes it without changing the manual hero bar's behaviour.
8. Only `apps/web/src/app/sitemap.ts` is served by Next (`sitemap-news.ts` is not a file convention) → Task 29 mounts event entries in `sitemap.ts`.
9. The dashboard sidebar is still flat despite decision-log #57 → Task 16 builds the group.

---

## Phase 0 — Gates

### Task 0: Record the blocking decisions and read the live state

**Files:** none created. Read-only.

- [ ] **Step 1:** Confirm `docs/design-specs/decision-log.md` has entries for **D-1** (event types — blocks Task 2), **D-13** (homepage section — blocks Tasks 21 and 31), **D-7** (documents — blocks the documents UI in Tasks 20 and 28), **D-11** (calendar/export — blocks Task 27's subscribe band beyond the single-event `.ics` if not authorised). If any is missing, stop and ask the owner; do not start the blocked task.
- [ ] **Step 2:** For every file in spec §16, run `git diff -- <file>` and record its current shape in the task notes, so later edits are made against what is actually there.
- [ ] **Step 3:** Confirm the helper exists and its exports are unchanged: `api/src/common/utils/dubai-day-range.util.ts` must export `PLATFORM_TIME_ZONE`, `DayRange`, `dubaiDayStart`, `dubaiNextDayStart`, `dubaiDayRange`, `isWithinDayRange`, `dayRangesOverlap`, `dayRangeContains`. If the seasons agent renamed anything, update the names used in this plan before continuing.
- [ ] **Step 4:** Confirm the next free ADR number in `docs/design-system/` (D-20; 0127 was free on 2026-09-29).

Run: `git status --short && git diff --stat`
Expected: a snapshot recorded; no file written.

---

## Phase 1 — The shared rule (`packages/content`)

### Task 1: `@uaeaf/content/events` — timing, day X of N, countdown, month grid

Spec §3.4, §5.1–5.3, §6.3.

**Files:**
- Create: `packages/content/events/timing.ts`
- Create: `packages/content/events/calendar.ts`
- Create: `packages/content/events/index.ts`
- Create: `packages/content/events/timing.spec.ts`
- Create: `packages/content/events/calendar.spec.ts`
- Create: `packages/content/events/dubai-day-vectors.json` (shared test vectors)
- Modify: `packages/content/package.json` (`exports["./events"] = "./events/index.ts"`)

**Interfaces — Produces:**

```ts
export type EventStatus = 'Scheduled' | 'Postponed' | 'Cancelled';
export type EventTiming = 'upcoming' | 'running' | 'past';
export interface EventDatesLike { startDate: string; endDate: string; isAllDay: boolean; status: EventStatus }

export const PLATFORM_TIME_ZONE = 'Asia/Dubai';
export const dubaiDayStart: (at: Date) => Date;          // same algorithm as the API util: offset read through Intl
export const dubaiNextDayStart: (at: Date) => Date;
export const dubaiDayRange: (first: Date, last: Date) => { from: Date; to: Date };
export const eventTiming: (event: EventDatesLike, now: Date) => EventTiming;
export const eventDayProgress: (event: EventDatesLike, now: Date) => { day: number; of: number } | null; // null unless running and of > 1
export const countdownTo: (event: EventDatesLike, now: Date) =>
  { days: number; hours: number; minutes: number } | null;   // null unless upcoming && Scheduled
export const daysUntilStart: (event: EventDatesLike, now: Date) => number | null; // "بعد 6 أيام"

// calendar.ts
export interface MonthGrid { weeks: { days: { date: string; inMonth: boolean; isToday: boolean }[] }[] }
export const monthGrid: (year: number, month: number, now: Date) => MonthGrid;   // Monday-first, 5–6 weeks
export interface BarSegment { eventId: string; weekIndex: number; startCol: number; span: number; startsHere: boolean; endsHere: boolean; lane: number }
export const layoutBars: (events: ReadonlyArray<{ id: string } & EventDatesLike>, grid: MonthGrid, lanes: number) =>
  { bars: BarSegment[]; overflow: Record<string, number> };                    // overflow per day key, rendering decided by D-17
```

- [ ] **Step 1: Write `dubai-day-vectors.json`** — instants and expected `dubaiDayStart`/`dubaiNextDayStart` results: 19:59:59Z and 20:00:00Z (Dubai midnight boundary), a leap day, a month end, a year end.
- [ ] **Step 2: Write the failing `timing.spec.ts`** covering: running on the start day from Dubai midnight even before the start time (spec §5.1's stated consequence); `Postponed` is `upcoming` even after its original date; `past` from the start of the day after the end day; single-day event has no progress; day 4 of 8 for the drawn camp (25 Sep – 2 Oct, now 28 Sep); countdown to the start instant, and to Dubai midnight when `isAllDay`; no countdown for `Postponed`/`Cancelled`.
- [ ] **Step 3: Write the failing `calendar.spec.ts`**: October 2026 first row is Mon 28 Sep … Sun 4 Oct (1 Oct is Thursday); a bar crossing a week boundary splits into two segments with `startsHere`/`endsHere` set only at the true ends; a third concurrent event in a two-lane week lands in `overflow`.
- [ ] **Step 4: Implement** `timing.ts` and `calendar.ts` as arrow functions. The day helpers mirror `dubai-day-range.util.ts`'s algorithm (the `wallClockAt`/`offsetAt`/`startOfZoneDay` sequence), not a `+4` constant (decision-log #58).
- [ ] **Step 5: Run.**

Run: `cd packages/content && npx vitest run events`
Expected: PASS.

(The API side of the parity check is Task 5 Step 1, which reads the same `dubai-day-vectors.json`.)

---

## Phase 2 — Backend (`api/`)

### Task 2: `PublicEvent` schema, subdocuments, event types, indexes — BLOCKED on D-1

Spec §3.1–3.3, §3.7–3.9.

**Files:**
- Create: `api/src/modules/public-communication/public-events/schemas/public-event.schema.ts`
- Create: `api/src/modules/public-communication/public-events/public-event-types.ts`
- Test: `api/src/modules/public-communication/public-events/schemas/public-event.schema.spec.ts`

**Interfaces — Produces:** `PublicEvent`, `PublicEventDocument`, `PublicEventSchema`, `ProgrammeSession`, `EventGuest`, `EventRegistration` (all `_id: false` subdocs), `PUBLIC_EVENT_STATUSES`, `ATTENDANCE_MODES`, `SESSION_KINDS`, `GUEST_PERSON_TYPES`, `CHAMPIONSHIP_RELATIONS`; from `public-event-types.ts`: `PUBLIC_EVENT_TYPES`, `PublicEventType`, `EVENT_GROUPS`, `EVENT_TYPE_GROUP: Record<PublicEventType, EventGroup>`.

**Consumes:** `BaseSchema`, `LocalizedTextSchema`, `LocalizedRichTextSchema`, `PageSeoSchema`, `PUBLICATION_STATES` (`api/src/common/constants/publication-states.ts`).

- [ ] **Step 1: Write `public-event-types.ts`** with the list recorded for D-1. Group ids in enum order `institutional, knowledge, development, preparation, celebration, community` (order matters: D-4's option (a) maps `category.1–5` by enum position per ADR-0065 D3b).
- [ ] **Step 2: Write the schema** exactly per spec §3.1: `@Schema({ collection: 'publicEvents', timestamps: true })`; every reference `MongooseSchema.Types.ObjectId`; `championshipId` with no `ref` (poly-ref pattern, `album.schema.ts:101-103`); `publicationState` enum `PUBLICATION_STATES` default `'Draft'`; `publishDate: Date | null` (so `markLive` fills it); `registration` default `{ required: false, url: null, deadline: null }`. Indexes per spec §3.9, including `{ 'title.ar': 'text', 'title.en': 'text' }, { default_language: 'none', name: 'search_text' }`.
- [ ] **Step 3: Write the failing schema spec** (MongoMemoryReplSet, `await model.init()` before transactions): partial unique `slug` (archived duplicate allowed); partial unique `isFeatured`; `timestamps` present; `publicationState` rejects `'Published'`; `title.en` required.
- [ ] **Step 4: Run.**

Run: `cd api && npm test -- src/modules/public-communication/public-events/schemas --runInBand`
Expected: PASS.

### Task 3: DTOs

Spec §3.1, §3.3.

**Files:**
- Create: `api/src/modules/public-communication/public-events/dto/create-public-event.dto.ts`
- Create: `.../dto/update-public-event.dto.ts`
- Create: `.../dto/programme-session.dto.ts`
- Create: `.../dto/event-guest.dto.ts`
- Create: `.../dto/event-registration.dto.ts`
- Create: `.../dto/publish-public-event.dto.ts` (`{ expectedUpdatedAt: string }`, mirroring `publish-season.dto.ts`)
- Create: `.../dto/public-event-list-query.dto.ts` (`tab`, `season`, `group`, `attendance`, `from`, `to`, `page`, `limit` ≤ 48 like `AlbumListQueryDto`)
- Create: `.../dto/update-visibility.dto.ts` (`{ isVisible: boolean; visibleFrom: string | null }`)
- Test: `.../dto/create-public-event.dto.spec.ts`

**Interfaces — Produces:** the DTO classes above. `CreatePublicEventDto` excludes `publicationState`, `publishDate`, `isFeatured`, `isVisible`, `visibleFrom`, `championshipId`, `championshipRelation` (server-set, dedicated routes, or D-6). `UpdatePublicEventDto` = `PartialType(OmitType(CreatePublicEventDto, ['slug']))` — match `update-season.dto.ts`'s exclusion pattern after reading it.

- [ ] **Step 1: Write the failing validator spec:** `summary.*` over 200 chars refused; `from`/`to` must match `^([01]\d|2[0-3]):[0-5]\d$`; `onlineUrl`/`registration.url` must be `https:`; `dayIndex` a non-negative integer; unknown `eventType` refused; `personType` in `GUEST_PERSON_TYPES` or null.
- [ ] **Step 2: Implement** with class-validator, `@ApiProperty` on every field (Swagger is part of done).
- [ ] **Step 3: Run.**

Run: `cd api && npm test -- src/modules/public-communication/public-events/dto --runInBand`
Expected: PASS.

### Task 4: `PublicEventsRepository`

Spec §3.9, §4.3.

**Files:**
- Create: `api/src/modules/public-communication/public-events/public-events.repository.ts`
- Test: `.../public-events.repository.spec.ts`

**Interfaces — Consumes:** `BaseRepository<T>` (`api/src/common/repositories/base.repository.ts`), `dubaiDayStart`, `dubaiNextDayStart`, `DayRange`.
**Produces:**

```ts
export const publicFilterAt: (now: Date) => QueryFilter<PublicEventDocument>;   // spec §4.3 — the ONE visibility rule
class PublicEventsRepository extends BaseRepository<PublicEventDocument> {
  findPublicBySlug(slug: string, now: Date): Promise<PublicEventDocument | null>;
  findPublicById(id: string, now: Date): Promise<PublicEventDocument | null>;
  findPublicSharingDays(range: DayRange, now: Date): Promise<PublicEventDocument[]>;   // startDate < to && endDate >= from
  findPublicRunning(now: Date): Promise<PublicEventDocument[]>;
  findPublicUpcoming(now: Date, limit: number, excludeId?: string): Promise<PublicEventDocument[]>;
  findPublicPage(filter: PublicEventListFilter, now: Date, page: number, limit: number): Promise<{ items: PublicEventDocument[]; total: number }>;
  countPublicByTab(filter: PublicEventListFilter, now: Date): Promise<{ running: number; upcoming: number; past: number }>;
  setFeatured(id: string | null): Promise<PublicEventDocument | null>;   // transaction: clear holder, set new — like SeasonsRepository.setCurrent
}
```

- [ ] **Step 1: Write the failing spec:** `publicFilterAt` excludes Draft, `isVisible:false`, future `visibleFrom`, archived; `findPublicSharingDays` includes an event ending at 23:00 Dubai on the range's first day and excludes one starting at the range's `to`; `setFeatured` leaves exactly one holder, and clears all when `null`.
- [ ] **Step 2: Implement.** Tab filters are expressed on the indexed fields with day boundaries from the util (upcoming: `status: 'Postponed' OR startDate >= dubaiNextDayStart(now)`… write each tab as the exact inverse of spec §5.1 and assert it in the spec against `eventTiming` from Task 1 on the same fixtures).
- [ ] **Step 3: Run.**

Run: `cd api && npm test -- src/modules/public-communication/public-events/public-events.repository.spec.ts --runInBand`
Expected: PASS.

### Task 5: `PublicEventsService` — writes, rules, timing

Spec §3.3, §3.4, §5.

**Files:**
- Create: `api/src/modules/public-communication/public-events/public-events.service.ts`
- Create: `.../event-timing.ts` (API-side `eventTiming`/`eventDayProgress` built on `dubai-day-range.util.ts`)
- Test: `.../event-timing.spec.ts` (reads `packages/content/events/dubai-day-vectors.json` — the parity check)
- Test: `.../public-events.service.spec.ts`

**Interfaces — Consumes:** `PublicEventsRepository`; `dubaiDayRange`, `isWithinDayRange` from `api/src/common/utils/dubai-day-range.util.ts`; the shared partial-update setters (`api/src/common/utils/partial-update.util.ts`), as `seasons.service.ts` uses them.
**Produces:** `create(dto, actorId)`, `update(id, dto, actorId)`, `findById`, `findAdminList(query)`, `setVisibility(id, dto)`, `setFeatured(id)`, `remove(id, archivedBy)`, `unarchive(id)`.

- [ ] **Step 1: Write the failing `event-timing.spec.ts`**: every vector in `dubai-day-vectors.json` gives the same answer through `dubaiDayStart`/`dubaiNextDayStart` here as through `@uaeaf/content/events`; then the timing cases of Task 1 Step 2, run against the API implementation.
- [ ] **Step 2: Write the failing service spec:** end day before start day → `eventEndsBeforeStart`; single-day timed event with end before start → same; `registration.required` with no url/deadline → `registrationIncomplete`; deadline on/after start → `registrationAfterStart`; `InPerson` clears `onlineUrl`; `Scheduled` clears `statusNote`; a programme `dayIndex` ≥ day count refused; `update` of an unrelated field does not touch `publicationState`.
- [ ] **Step 3: Write the failing delete-guard spec:** `remove()` refuses `409 stillReferenced` naming each referrer when a live album has `publicEventId`, a live video has an `associations` entry `{ownerType:'publicEvents', ownerId}`, or the HERO section's `configuration.nextEvent.nextEventId` equals the id. Shape after `SeasonsService.remove`/`referrersOf` (`seasons.service.ts:268-296`). Reads go through `AlbumsRepository`/`VideosRepository`/`PageSectionsRepository` (all exported by their modules — verify `PageSectionsRepository` in `page-sections.module.ts:14` and the album/video module exports before importing).
- [ ] **Step 4: Write the failing §31 test:** `setVisibility` reads the record inside the handler; a `publicationState` change between two calls is reflected in the second call's response note.
- [ ] **Step 5: Implement.**
- [ ] **Step 6: Run.**

Run: `cd api && npm test -- src/modules/public-communication/public-events --runInBand`
Expected: PASS.

### Task 6: Public read model — serializer, selection, related, partners, media counts

Spec §3.5, §3.6, §5.4, §6.4, §6.5, §7, §8.3, §11.4.

**Files:**
- Create: `api/src/modules/public-communication/public-events/public-events.public.ts` (the public service half)
- Create: `.../dto/public-event-response.dto.ts`
- Create: `.../home-selection.ts` (pure)
- Test: `.../home-selection.spec.ts`
- Test: `.../public-events.public.spec.ts`

**Interfaces — Consumes:** `PublicEventsRepository`; `SponsorsService` (exported, `sponsors.module.ts:13`); a read-only `Sponsorship` model registered in this module; `isInWindow` from `api/src/common/utils/sponsorship-window.util.ts`; a read-only `Venue` model; `AlbumsRepository`/`VideosRepository` counts; `SeasonsService.findById` (exported, `seasons.module.ts:22`).
**Produces:**

```ts
interface PublicEventCard { id; slug; title; summary; eventType; group; startDate; endDate; isAllDay; status; statusNote;
  timing: EventTiming; dayProgress: {day:number; of:number} | null; place; venueName; attendanceMode; coverImageId;
  media: { photos: number; videos: number } | null /* past only */ }
interface PublicEventDetail extends PublicEventCard { description; season: {slug; name}; venue: {name; latitude; longitude} | null;
  registration: { open: boolean; url: string | null; deadline: string | null }; audience; organizerUnit; programme; guests;
  partners: SponsorPublic[]; related: PublicEventCard[]; onlineUrl?: string /* present only while running, spec §5.4 */; seo }
interface PublicEventBrief { slug; title; place; venueName; startDate; endDate; isAllDay; status; timing; dayProgress }
const selectHomeBanner: (events: Candidate[], now: Date) => Candidate | null;              // featured → running → soonest upcoming
const selectHomeCards: (events: Candidate[], banner: Candidate | null, limit: number, includeRunning: boolean, now: Date) => Candidate[];
const selectHeaderNext: (events: Candidate[], now: Date) => Candidate | null;              // soonest upcoming Scheduled
```

- [ ] **Step 1: Write the failing `home-selection.spec.ts`:** featured wins when a candidate; featured that is cancelled / hidden / past / postponed falls through; running beats upcoming; postponed never selected; cards exclude the banner, respect `limit`, put running first only when `includeRunning`; empty input → banner `null` and cards `[]` (the section hides). The two open rules (which running when several; cancelled in cards) are written as `it.todo` naming D-13 until recorded.
- [ ] **Step 2: Write the failing public spec:** `onlineUrl` key absent before the start instant and after the run, present during; `registration.open` false after the deadline; partners only from `targetType: 'Event'`, matching `targetId`, inside their window; `venue` embedded without the caller holding `venues:Read`; a hidden event → `null`.
- [ ] **Step 3: Implement.** The serializer is the only place `onlineUrl` is emitted.
- [ ] **Step 4: Run.**

Run: `cd api && npm test -- src/modules/public-communication/public-events --runInBand`
Expected: PASS.

### Task 7: `PublicEventsController`

Spec §4.2, §6, §8.1.

**Files:**
- Create: `api/src/modules/public-communication/public-events/public-events.controller.ts`
- Test: `.../public-events.controller.spec.ts`

**Interfaces — Consumes:** `PublicEventsService`, the public half from Task 6, `PublishingService` (`api/src/modules/workflow/publishing/publishing.service.ts`), `@RequirePermission`, `@Public`, `@SkipAuditLog`, `@CurrentUser`, `extractRequestContext`.
**Produces** — literal segments before params (`albums.controller.ts`/`seasons.controller.ts` convention):

| Method | Route | Guard |
|---|---|---|
| `GET` | `/public-events/public` | `@Public()` — list + tab counts (`PublicEventListQueryDto`) |
| `GET` | `/public-events/public/calendar?season=&year=&month=` | `@Public()` — events sharing a day with the month + the season's phases/keyDates |
| `GET` | `/public-events/public/home` | `@Public()` — `{ banner, cards }`, reading the chosen section row's `itemLimit`/`configuration.includeRunning`. **Mounted only once D-13 is recorded**; until then the route does not exist (no placeholder answer) |
| `GET` | `/public-events/public/header-next` | `@Public()` |
| `GET` | `/public-events/public/brief/:id` | `@Public()` — hero bar |
| `GET` | `/public-events/public/sitemap` | `@Public()` — `{slug, updatedAt, publishDate}[]` |
| `GET` | `/public-events/public/:slug` | `@Public()` — detail, `null` (200) when not visible |
| `POST` | `/public-events` | `publicEvents:Create` |
| `GET` | `/public-events` | `publicEvents:Read` |
| `GET` | `/public-events/summary` | `publicEvents:Read` — the four tiles |
| `GET` | `/public-events/:id` | `publicEvents:Read` |
| `GET` | `/public-events/:id/editorial-state` | `publicEvents:Read` — as `articles.controller.ts:125` |
| `PATCH` | `/public-events/:id` | `publicEvents:Update` (+ `PublishingService.assertCanEdit` while a review runs) |
| `PATCH` | `/public-events/:id/visibility` | D-14 (`Publish` recommended) |
| `PATCH` | `/public-events/:id/featured` | D-14 |
| `POST` | `/public-events/:id/submit` | `publicEvents:Update` → `publishingService.submit` |
| `PATCH` | `/public-events/:id/publish` | `publicEvents:Publish` → `publishingService.publishDirect` |
| `POST` | `/public-events/:id/publish-approved` | `publicEvents:Publish` → `publishingService.publishApproved` |
| `DELETE` | `/public-events/:id` | `publicEvents:Archive` |
| `POST` | `/public-events/:id/unarchive` | `publicEvents:Restore` (ADR-0120 naming) |

- [ ] **Step 1: Write the failing controller spec (red first):** no `Publish` → 403 on `publish`; a policy with `workflowRequired: true` → `publish` 409 `workflowRequired`; no policy → `publish` succeeds for a `Publish` holder and the record reads `publicationState: 'Live'` **and appears in `GET /public-events/public`** (the end-to-end check that would have caught M-2 in seasons); `submit` with no policy → 409 `conflict`; `publish-approved` publishes the approved revision; `public/current`-style ordering: `public/brief/:id` is never read as `:slug`.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Run.**

Run: `cd api && npm test -- src/modules/public-communication/public-events --runInBand`
Expected: PASS.

### Task 8: Module, registration, and the registries that must move with it

Spec §11.2, §11.3, §4.2.

**Files:**
- Create: `api/src/modules/public-communication/public-events/public-events.module.ts`
- Modify: `api/src/app.module.ts` (import `PublicEventsModule` beside `ArticlesModule`) — coordination file
- Modify: `api/src/common/authz/media-references.ts` (`'publicEvents'` into `SCANNED_COLLECTIONS`, alphabetical) — coordination file
- Modify: `api/src/common/constants/entity-content.ts` (the two `publicEvents` rows, spec §4.2) — coordination file
- Modify: `api/src/common/interceptors/audit-route-coverage.spec.ts` (`WRITES_ITS_OWN_ROW`: submit, publish, publish-approved) — coordination file
- Modify: `api/src/common/utils/raw-dto-cast-scan.spec.ts` (`'modules/public-communication/public-events/public-events.service.ts'` into `UPDATE_METHODS_USING_SHARED_SETTERS`) — coordination file

**Interfaces — Produces:** `PublicEventsModule` exporting `PublicEventsService` and `PublicEventsRepository` (for search and page-sections reads).

- [ ] **Step 1: Write the module** — `MongooseModule.forFeature([{ PublicEvent }, { Sponsorship (read) }, { Venue (read) }])`, imports the modules whose services Task 5/6 consume (`WorkflowModule` pieces for `PublishingService`, `SponsorsModule`, `SeasonsModule`, albums/videos/page-sections repositories). Check each for a circular import (`SeasonsModule` must not import this module; Task 34's season change reads the model directly for that reason).
- [ ] **Step 2: Registries**, one line each, reading each file fresh first (Global Constraints).
- [ ] **Step 3: Run the guards that must stay green.**

Run: `cd api && npm test -- src/common/authz/media-reference-coverage.spec.ts src/common/interceptors/audit-route-coverage.spec.ts src/common/utils/raw-dto-cast-scan.spec.ts src/common/constants/entity-content.spec.ts --runInBand`
Expected: PASS (the coverage guard fails if Step 2's `SCANNED_COLLECTIONS` line is missing — that is the check).

- [ ] **Step 4: Type-check.**

Run: `cd api && npx tsc --noEmit`
Expected: no errors.

### Task 9: API error codes

Spec §3.3.

**Files:**
- Modify: `api/src/common/errors/api-error-code.ts` (`eventEndsBeforeStart`, `registrationIncomplete`, `registrationAfterStart`, `invalidNextEventId`)
- Modify: the dashboard's shared vocabulary (`apps/dashboard/src/lib/api/admin-write.ts` group + `FROM_API_CODE`) and both message catalogues

- [ ] **Step 1:** Add each code to all three vocabularies in the same task (a code in one only degrades to `conflict` with no failing test).
- [ ] **Step 2: Run.**

Run: `cd api && npm test -- src/common/errors --runInBand` and `cd apps/dashboard && npx vitest run src/lib/api`
Expected: PASS.

---

## Phase 3 — Permissions

### Task 10: `PERMISSION_RESOURCES` + `CAPABILITY_MAP` + `RESOURCE_TO_DOMAIN`

Spec §11.1.

**Files:**
- Modify: `api/src/common/constants/permission-resources.ts` — coordination file
- Modify: `api/src/common/authz/capability-map.ts` (entry after `presidentMessagePage`/before `records*` alphabetically; shape in spec §11.1) — coordination file
- Modify: `apps/dashboard/src/lib/admin/resource-domains.ts` (`publicEvents: "public-communication"`) — coordination file

- [ ] **Step 1:** Add the three lines.
- [ ] **Step 2: Run.**

Run: `cd api && npm test -- src/common/authz src/common/constants src/modules/platform-administration/refusal-codes.spec.ts --runInBand` and `cd apps/dashboard && npx vitest run src/lib/admin/resource-domains.spec.ts`
Expected: PASS.

### Task 11: Permission sync — owner step

**Files:** none.

- [ ] **Step 1:** Write in the task report, for the owner to run: `cd api && npm run sync:permissions`. **Do not run it** — it writes to the database.
- [ ] **Step 2:** Role templates stay unchanged until D-16 is recorded.

---

## Phase 4 — Search

### Task 12: Events as the seventh search source

Spec §12.

**Files:**
- Modify: `api/src/modules/platform-administration/search/search-sources.ts` (`SEARCH_SOURCE_KEYS`, `SearchSource.publicFilterAt?`, `SearchSourceModels.publicEventModel`, the entry) — coordination file
- Modify: `api/src/modules/platform-administration/search/search.service.ts` (inject the model; line 136 uses `source.publicFilterAt?.(new Date()) ?? source.publicFilter`)
- Modify: `api/src/modules/platform-administration/search/search.module.ts` (`forFeature` + `PublicEvent`)
- Test: `api/src/modules/platform-administration/search/search.service.spec.ts` (extend)

**Interfaces — Consumes:** `publicFilterAt` from Task 4 (the same function — not a copy).

- [ ] **Step 1: Write the failing test:** an event with `visibleFrom` one minute in the future is not found; one minute later it is; a Draft is never found; `hrefOf` gives `/events/<slug>`.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Run.**

Run: `cd api && npm test -- src/modules/platform-administration/search --runInBand`
Expected: PASS.

---

## Phase 5 — Hero bar (`nextEventId`)

### Task 13: Accept `nextEventId` in the HERO settings

Spec §8.1.

**Files:**
- Modify: `api/src/modules/cms-page-composition/page-sections/hero-settings.ts` (validation + header comment, which today says there is no events entity)
- Modify: `api/src/modules/cms-page-composition/page-sections/hero-settings.spec.ts`
- Modify: the `@ApiProperty` descriptions in `.../dto/create-page-sections.dto.ts:109` and `.../dto/update-page-sections.dto.ts:101`

- [ ] **Step 1: Write the failing tests:** `nextEventId: null` accepted; a 24-hex string accepted; anything else → 400 `invalidNextEventId`; a linked bar (`nextEventId` set) with empty manual fields and `isVisible: true` is **not** refused as `incompleteNextEvent` (the manual fields are unused in linked mode).
- [ ] **Step 2: Implement.** No schema change: `configuration` is free-form.
- [ ] **Step 3: Run.**

Run: `cd api && npm test -- src/modules/cms-page-composition/page-sections --runInBand`
Expected: PASS.

---

## Phase 6 — Dashboard (`apps/dashboard`)

### Task 14: Admin API proxy routes

**Files (mirror `apps/dashboard/src/app/api/admin/seasons/**` and `apps/dashboard/src/lib/admin/seasons/route-support.ts`):**
- Create: `apps/dashboard/src/app/api/admin/public-events/route.ts` (GET, POST)
- Create: `.../public-events/summary/route.ts`
- Create: `.../public-events/[id]/route.ts` (GET, PATCH, DELETE)
- Create: `.../public-events/[id]/editorial-state/route.ts`
- Create: `.../public-events/[id]/visibility/route.ts`
- Create: `.../public-events/[id]/featured/route.ts`
- Create: `.../public-events/[id]/submit/route.ts`
- Create: `.../public-events/[id]/publish/route.ts`
- Create: `.../public-events/[id]/publish-approved/route.ts`
- Create: `.../public-events/[id]/unarchive/route.ts`
- Create: `apps/dashboard/src/lib/admin/public-events/route-support.ts` (`classifyEventFailure`, `forwardEvent` — the seasons reasoning about 422 and own codes applies verbatim)
- Test: `apps/dashboard/src/app/api/admin/public-events/public-events-routes.spec.ts`

- [ ] **Step 1: Write the failing spec:** each route forwards method/path unchanged; non-Mongo ids answer 404 without calling upstream (`isMongoId`); `workflowRequired`, `activeWorkflowExists`, `stillReferenced` and the Task 9 codes reach the screen under their own names.
- [ ] **Step 2: Implement.**

Run: `cd apps/dashboard && npx vitest run src/app/api/admin/public-events`
Expected: PASS.

### Task 15: `lib/admin/public-events` — types, requests, filters, draft, publish mode

**Files:**
- Create: `apps/dashboard/src/lib/admin/public-events/types.ts`
- Create: `.../requests.ts`
- Create: `.../list-filters.ts`
- Create: `.../event-draft.ts` (form state ↔ DTO; Dubai day + `HH:mm` ↔ instants using `@uaeaf/content/events`)
- Create: `.../event-copy.ts` (duplicate: drops `slug`, publication fields, sets Draft)
- Create: `.../suggest-season.ts` (season whose Dubai day range contains the start day, from the loaded season list)
- Create: `.../error-codes.ts`
- Tests: `.spec.ts` beside each

**Interfaces — Consumes:** `publishModeOf` — import from `apps/dashboard/src/lib/admin/seasons/publish-mode.ts` if it is still there, or move it to `apps/dashboard/src/lib/admin/publishing/publish-mode.ts` if the seasons agent has already shared it; do not write a third copy (shared-components rule, 2026-09-22).

- [ ] **Step 1: Write failing specs:** `event-draft` round-trips a timed two-day event and an all-day one; an empty English summary becomes `[[pending-content]]` (D-19 — skip with `it.todo` if D-19 chose the alternative); `suggest-season` picks the containing season and returns `null` between seasons.
- [ ] **Step 2: Implement.**

Run: `cd apps/dashboard && npx vitest run src/lib/admin/public-events`
Expected: PASS.

### Task 16: Sidebar group «الفعاليات والمواسم»

Spec §9.1; decision-log #57.

**Files:**
- Modify: `apps/dashboard/src/lib/navigation.ts` (replace the flat `seasons` item at `:325-333` with a group `eventsSeasons` whose children are `events` → `/events` requiring `publicEvents:Read`, and `seasons` → `/seasons` requiring `seasons:Read`) — coordination file
- Modify: `apps/dashboard/src/lib/navigation.spec.ts`, `apps/dashboard/src/components/shell/sidebar-nav.spec.tsx`
- Modify: `apps/dashboard/messages/ar.json`, `apps/dashboard/messages/en.json` (`Nav.eventsSeasons`, `Nav.events`) and `NAV_ICON` in `apps/dashboard/src/lib/icons/ui-icons.tsx`

- [ ] **Step 1: Write the failing tests:** a user with only `seasons:Read` sees the group with one child; with neither, no group; the group label equals the breadcrumb text already shown on the seasons screen, in both languages.
- [ ] **Step 2: Implement** — confirm with the seasons agent first that no parallel change to this block is in flight.

Run: `cd apps/dashboard && npx vitest run src/lib/navigation.spec.ts src/components/shell/sidebar-nav.spec.tsx src/lib/i18n`
Expected: PASS.

### Task 17: Events list screen (`dash-01`)

Spec §9.2.

**Files:**
- Create: `apps/dashboard/src/app/[locale]/(app)/events/page.tsx`
- Create: `apps/dashboard/src/components/admin/public-events/events-board.tsx`
- Create: `.../events-table.tsx`
- Create: `.../event-row-parts.tsx` (type chip, timing pill, approval pill, visibility switch + note)
- Test: `.../public-events-components.spec.tsx`

**Interfaces — Consumes:** `stat-tiles.tsx`, `apps/dashboard/src/components/ui/inline-confirm.tsx` (moved there by the seasons work), Task 15's requests.

- [ ] **Step 1: Write the failing component tests:** the four tiles; tab counts; the visibility note reads «معاد الظهور عدّى — تظهر بعد الموافقة» for a past `visibleFrom` on a non-Live event; the switch is absent for a user without the D-14 permission; «نسخ» opens the create form pre-filled; the footer says «الأوقات بتوقيت الإمارات».
- [ ] **Step 2: Implement.** Tabs/drafts behaviour per D-17 (or the spec §9.2 proposal once authorised).

Run: `cd apps/dashboard && npx vitest run src/components/admin/public-events`
Expected: PASS.

### Task 18: Event form — sections 1–4 (basics, time & place, season & links, programme)

Spec §9.3.

**Files:**
- Create: `apps/dashboard/src/app/[locale]/(app)/events/new/page.tsx`
- Create: `apps/dashboard/src/app/[locale]/(app)/events/[id]/edit/page.tsx`
- Create: `apps/dashboard/src/components/admin/public-events/event-form.tsx`
- Create: `.../event-basics-section.tsx` (reuses `bilingual-field.tsx`, `rich-text/bilingual-rich-text.tsx`)
- Create: `.../event-time-place-section.tsx`
- Create: `.../event-season-section.tsx` (championship controls rendered disabled with the drawn text — D-6)
- Create: `.../event-programme-section.tsx`
- Test: `.../event-form.spec.tsx`

- [ ] **Step 1: Write the failing tests:** the group label updates from the type; the duration line reads «المدة: يومان»; the programme's day tabs follow the dates; shortening the event to one day flags sessions on day 2 before save; the season is suggested and stays editable.
- [ ] **Step 2: Implement** following `apps/dashboard/src/components/admin/seasons/season-form.tsx` for save/publish structure (save never gated on readiness).

Run: `cd apps/dashboard && npx vitest run src/components/admin/public-events`
Expected: PASS.

### Task 19: Event form — sections 5–8 and the aside

Spec §9.3.

**Files:**
- Create: `.../event-guests-section.tsx` (registry picker per D-8; «اسم وصفة فقط» always available)
- Create: `.../event-documents-partners-section.tsx` (documents chips **only if** D-7 allows; partners link to `apps/dashboard/src/components/admin/sponsor-relations/` screens with `targetType: 'Event'`)
- Create: `.../event-registration-section.tsx`
- Create: `.../event-scheduling-section.tsx`
- Create: `.../event-aside.tsx` (visibility & publishing from `editorial-state`, linked content counts, section checklist)
- Test: extend `.../event-form.spec.tsx`

- [ ] **Step 1: Write the failing tests:** the submit/publish button follows the policy (`publishModeOf`); pressing submit with unsaved edits is refused at the press (§31 red test: edit after the confirm opens, then confirm); the checklist shows «!» on basics when the English summary is pending; the note fields are disabled for «في موعدها».
- [ ] **Step 2: Implement.**

Run: `cd apps/dashboard && npx vitest run src/components/admin/public-events`
Expected: PASS.

### Task 20: Hero editor — pick the next event

Spec §8.1, §9.4.

**Files:**
- Modify: `apps/dashboard/src/components/admin/homepage-hero/hero-settings-editor.tsx`
- Modify: `apps/dashboard/src/components/admin/homepage-hero/homepage-hero-editor.spec.tsx`

- [ ] **Step 1: Write the failing test:** choosing «فعالية من القائمة» sends `nextEvent.nextEventId` and keeps the manual fields untouched; choosing «نص حر» sends `nextEventId: null`; the list offers only visible, non-past, non-cancelled events.
- [ ] **Step 2: Implement.**

Run: `cd apps/dashboard && npx vitest run src/components/admin/homepage-hero`
Expected: PASS.

### Task 21: Homepage events-section screen — BLOCKED on D-13

Spec §7, §9.4.

**Files:**
- Create: `apps/dashboard/src/app/[locale]/(app)/homepage/events/page.tsx`
- Create: `apps/dashboard/src/components/admin/homepage-events/homepage-events-editor.tsx`
- Modify: `apps/dashboard/src/lib/admin/homepage/sections.ts` (`href` for the section type D-13 chooses; `HOMEPAGE_RAIL_ORDER` position after `LATEST_NEWS:coverage`)
- Test: `apps/dashboard/src/components/admin/homepage-events/homepage-events-editor.spec.tsx`, `apps/dashboard/src/lib/admin/homepage/sections.spec.ts`

- [ ] **Step 1: Write the failing tests:** the stepper holds 3–6; «فعالية مميزة» calls `PATCH /public-events/:id/featured`; the hero card is read-only with a link to `/homepage/hero`.
- [ ] **Step 2: Implement.**

Run: `cd apps/dashboard && npx vitest run src/components/admin/homepage-events src/lib/admin/homepage`
Expected: PASS.

---

## Phase 7 — Public site (`apps/web`)

### Task 22: Messages

Spec §6; D-22.

**Files:**
- Create or modify per D-22: `apps/web/messages/ar/events.json`, `apps/web/messages/en/events.json`
- Modify (if a new file): `apps/web/src/i18n/messages.ts` (`MESSAGE_FILES` + both locale maps) — coordination file
- Tests: `apps/web/src/lib/i18n/message-parity.spec.ts`, `apps/web/src/lib/pages/page-message-keys.spec.ts`

- [ ] **Step 1:** Add the `Events` namespace: page copy, tabs, filters, badges, the plural forms («بعد {n, plural, …}») as ICU, programme kinds, group and type names from D-1, status notes' labels. Latin digits everywhere (`ar-AE-u-nu-latn`, as `formatEventDateTime` does).

Run: `cd apps/web && npx vitest run src/lib/i18n src/lib/pages/page-message-keys.spec.ts`
Expected: PASS.

### Task 23: Web data layer

**Files:**
- Create: `apps/web/src/lib/events/event-types.ts` (response types from Task 6)
- Create: `apps/web/src/lib/events/event-query.ts` (URL ⇄ filter, after `apps/web/src/lib/albums/album-query.ts`)
- Create: `apps/web/src/lib/events/load.ts` (`fetchPublic` with tag `["events"]`)
- Tests: `event-query.spec.ts`, `load.spec.ts`

- [ ] **Step 1: Write failing specs:** `?tab=&season=&group=&attendance=&period=&view=` round-trip; unknown values dropped; a failed fetch yields an empty state, never a throw.

Run: `cd apps/web && npx vitest run src/lib/events`
Expected: PASS.

### Task 24: Generalize `Countdown`

Spec §5.3; M-12.

**Files:**
- Modify: `apps/web/src/components/shared/countdown.tsx`
- Modify: `apps/web/src/components/shared/countdown.spec.tsx`
- Modify: `apps/web/src/components/pages/home/hero-event-bar.tsx` (call site only)

**Interfaces — Produces:** `Countdown` takes `stateAt: (now: Date) => EventBarState` and `initial`; the manual bar passes `(now) => eventBarState(event, now)` so its behaviour is byte-identical; events pass a function built on `countdownTo`/`eventTiming`.

- [ ] **Step 1: Write the failing test:** the manual bar renders exactly as before (existing assertions unchanged); an event countdown ticks at the minute boundary and hides when `timing` leaves `upcoming`.

Run: `cd apps/web && npx vitest run src/components/shared/countdown.spec.tsx src/components/pages/home`
Expected: PASS.

### Task 25: Event card, badges and date tile

Spec §6.2.

**Files:**
- Create: `apps/web/src/components/pages/events/event-card.tsx` (grid card), `event-feature-card.tsx` (running, horizontal), `event-row.tsx` (mobile/agenda row), `event-badges.tsx` (timing, status, group chip), `event-date-tile.tsx`, `event-progress.tsx`
- Test: `apps/web/src/components/pages/events/event-card.spec.tsx`

- [ ] **Step 1: Write failing tests:** a card without a cover uses the neutral surface (no group fill); the group chip always shows its words; postponed shows the struck original date and no countdown; the running dot has no animation class (D-5 until recorded); `progressbar` carries `aria-valuemin/max/now`; the whole card is one link.
- [ ] **Step 2: Implement** on existing surfaces and tokens; group colours per D-4 (placeholder: neutral chip for all groups until the ADR — no hex).

Run: `cd apps/web && npx vitest run src/components/pages/events`
Expected: PASS.

### Task 26: `/events` — cards view

Spec §6.1.

**Files:**
- Modify: `apps/web/src/app/[locale]/events/page.tsx` (full body; keeps the file)
- Create: `apps/web/src/components/pages/events/events-hero.tsx`, `events-controls.tsx`, `events-running.tsx`, `events-grid.tsx`, `events-empty.tsx`
- Test: `apps/web/src/components/pages/events/events-page.spec.tsx`

- [ ] **Step 1: Write failing tests:** tabs are a WAI-ARIA tablist with counts; the season card disappears with no current season; «مسح الفلاتر» clears the URL; the empty state's button resets the group; the default tab follows D-17.
- [ ] **Step 2: Implement.** The subscribe band renders only what D-11 authorised; with nothing authorised it is not rendered.

Run: `cd apps/web && npx vitest run src/components/pages/events src/app/[locale]/events`
Expected: PASS.

### Task 27: `/events?view=calendar`

Spec §6.3.

**Files:**
- Create: `apps/web/src/components/pages/events/calendar/events-calendar.tsx`, `month-table.tsx`, `month-agenda.tsx`, `calendar-legend.tsx`
- Test: `apps/web/src/components/pages/events/calendar/events-calendar.spec.tsx`

**Interfaces — Consumes:** `monthGrid`, `layoutBars` (Task 1); `GET /public-events/public/calendar`; phase colours from decision-log #60's tokens.

- [ ] **Step 1: Write failing tests:** a `<table>` with seven `<th scope="col">` starting الإثنين; October 2026's first data cell is 28 September; a bar continuing from September carries «← بدأ …» and no start rounding; the agenda lists every event and key date of the month in date order; no «البطولات» control is rendered (spec §14 C-1); below `lg` only the agenda renders (spec §6.3 item 6, `PENDING FIGMA BACK-SYNC`).
- [ ] **Step 2: Implement.** The PDF link renders only if D-7 allows serving the season calendar document.

Run: `cd apps/web && npx vitest run src/components/pages/events/calendar`
Expected: PASS.

### Task 28: `/events/[slug]` — upcoming/running and past

Spec §6.4, §6.5.

**Files:**
- Create: `apps/web/src/app/[locale]/events/[slug]/page.tsx`
- Create: `apps/web/src/components/pages/events/detail/event-hero.tsx`, `event-facts.tsx`, `event-section-nav.tsx`, `event-about.tsx`, `event-registration-card.tsx`, `event-programme.tsx` (tabs pattern), `event-guests.tsx`, `event-documents.tsx` (D-7), `event-partners.tsx`, `event-related.tsx`, `event-past-media.tsx`, `event-mobile-cta.tsx`
- Create: `apps/web/src/app/api/events/[slug]/ics/route.ts` — **only if D-11 authorises** the single-event `.ics` (RFC 5545 text, no dependency; route-handler pattern per the repo's internal-route convention)
- Tests: `apps/web/src/components/pages/events/detail/event-detail.spec.tsx`

- [ ] **Step 1: Write failing tests:** a hidden event renders `notFound()`; the section nav lists exactly the non-empty sections; programme tabs obey arrows/Home/End and default to today's day while running; the registration button disappears after the deadline; the online link appears only while running; the past page shows the newest linked album with «فتح الألبوم كاملًا», two videos via `?association=publicEvents:<id>`, and no «أخبار مرتبطة» box; the hero uses `section-black` for every group.
- [ ] **Step 2: Implement.** Share uses the existing photo-share behaviour (`apps/web/src/components/shared/albums/photo-share.tsx`), extracted to a shared component if used unchanged (shared-components rule).

Run: `cd apps/web && npx vitest run src/components/pages/events/detail`
Expected: PASS.

### Task 29: SEO — metadata, JSON-LD, page registry, sitemap

Spec §6.6; D-15.

**Files:**
- Modify: `apps/web/src/lib/pages/public-pages.ts` (remove `events` from `PREPARING_PAGES`; add to `PUBLIC_PAGES` with the register and `registerBasis` recorded for D-15, `schemaType: "CollectionPage"`, `listEndpoint: "/public-events/public"`) — coordination file
- Create: `apps/web/src/lib/events/event-jsonld.ts` + spec
- Create: `apps/web/src/lib/events/event-sitemap.ts` + spec
- Modify: `apps/web/src/app/sitemap.ts` (append event entries; albums/news per D-15)
- Tests: `apps/web/src/lib/design-system/seo-contract.spec.ts`, `apps/web/src/lib/pages/activation-seo.spec.ts`, `apps/web/src/lib/pages/internal-links-contract.spec.ts`

- [ ] **Step 1: Write failing tests:** JSON-LD `eventStatus` per `status`, `eventAttendanceMode` per mode, dates with `+04:00`, no URL in `VirtualLocation` before the start, no `offers`; sitemap entries carry `lastModified` from `updatedAt ?? publishDate` and both language alternates; `/events` is indexable only when the list endpoint answers items.
- [ ] **Step 2: Implement.**

Run: `cd apps/web && npx vitest run src/lib/events src/lib/design-system/seo-contract.spec.ts src/lib/pages`
Expected: PASS.

### Task 30: Hero bar — linked mode

Spec §8.1; D-3.

**Files:**
- Modify: `apps/web/src/lib/pages/homepage.ts` (`readNextEvent` at `:70`: linked mode fetches `/public-events/public/brief/:id`)
- Modify: `apps/web/src/components/pages/home/hero-event-bar.tsx` (linked: label «الفعالية القادمة»/«جارية الآن», meta with «اليوم X من N», the whole bar one link with an accessible name carrying name and state)
- Tests: extend the homepage and hero-event-bar specs

- [ ] **Step 1: Write failing tests:** manual mode unchanged; linked + hidden/cancelled/postponed/past → no bar (or D-3's recorded fallback); linked + running → «جارية الآن» with day progress and no countdown.

Run: `cd apps/web && npx vitest run src/lib/pages src/components/pages/home`
Expected: PASS.

### Task 31: Homepage events section — BLOCKED on D-13

Spec §7.

**Files:**
- Create: `apps/web/src/components/pages/home/home-events-section.tsx`, `home-events-banner.tsx`
- Modify: `apps/web/src/app/[locale]/page.tsx` (render in the D-13 position; hidden when the endpoint returns no banner and no cards)
- Test: `apps/web/src/components/pages/home/home-events-section.spec.tsx`

- [ ] **Step 1: Write failing tests:** no section markup at all when empty; the season badge links to the current season; the banner shows «فعالية مميزة» only for the featured one; cards never repeat the banner.

Run: `cd apps/web && npx vitest run src/components/pages/home`
Expected: PASS.

### Task 32: Header card

Spec §8.3.

**Files:**
- Modify: `apps/web/src/lib/header/features.ts` (`nextEvent` from `/public-events/public/header-next`; widened type `{ title, href, startsAt, endsAt, isAllDay }`; `Promise.allSettled` failure → `null`) — coordination file
- Modify: `apps/web/src/components/layout/cards/index.tsx` (`EventCard` gains the countdown via Task 24; comment at `:125-129` rewritten to current state)
- Tests: `apps/web/src/lib/header/features.spec.ts`, `apps/web/src/components/layout/cards/index.spec.tsx`

- [ ] **Step 1: Write failing tests:** the reader failing leaves every other field intact and `nextEvent: null`; the card links to `/events/<slug>`; the fallback card still renders on `null`.

Run: `cd apps/web && npx vitest run src/lib/header src/components/layout/cards`
Expected: PASS.

### Task 33: Search on the web

Spec §12.

**Files:**
- Modify: `apps/web/src/lib/search/client.ts:11` (`SEARCH_SOURCE_KEYS` + `"publicEvents"`)
- Modify: `apps/web/src/components/search/search-dialog.tsx`, `search-results.tsx` (label maps)
- Modify: `apps/web/src/app/api/search/route.ts` only if its allowlist names the types
- Tests: `search-dialog.spec.tsx`, `search-results.spec.tsx`

Run: `cd apps/web && npx vitest run src/components/search src/lib/search`
Expected: PASS.

### Task 34: Season page and season delete guard — coordination

Spec §10.

**Files:**
- Modify (only if it exists when this task starts): the season page's events section created by the seasons agent under `apps/web/src/components/pages/seasons/`, and its stats reader (`apps/web/src/lib/seasons/season-stats.ts` per the seasons plan)
- Modify: `api/src/modules/media-center/seasons/seasons.service.ts` (`referrersOf` gains live events with this `seasonId`, read through a `PublicEvent` model registered in `SeasonsModule`'s `forFeature` — not by importing `PublicEventsModule`, which imports `SeasonsModule`) — coordination file
- Tests: the seasons service spec (extend), the season page spec (extend)

- [ ] **Step 1:** Agree the change with the seasons agent before editing either file.
- [ ] **Step 2: Write failing tests:** a season with a live event refuses deletion naming «N event(s)»; the season page lists three events and `total`.

Run: `cd api && npm test -- src/modules/media-center/seasons --runInBand` and `cd apps/web && npx vitest run src/components/pages/seasons src/lib/seasons`
Expected: PASS.

---

## Phase 8 — Verification and documentation

### Task 35: Full regression

**Files:** none.

- [ ] `cd api && npm test -- --runInBand` (with dev servers stopped; never two suites at once on this machine)
- [ ] `cd apps/web && npx vitest run --pool=threads`
- [ ] `cd apps/dashboard && npx vitest run --pool=threads`
- [ ] `cd packages/content && npx vitest run`
- [ ] `npx tsc --noEmit` in `api/`, `apps/web/`, `apps/dashboard/`, `packages/content/`
- [ ] `node scripts/test-guards.mjs all` (and add any new guard to both `scripts/test-guards.mjs` and `docs/engineering/guard-tests.md` in the same task — the runner's own rule)

Expected: all green. A red here is fixed at its root, not skipped.

### Task 36: Live check

**Files:** none; screenshots in the session scratchpad only (never the repo).

- [ ] Start the API with `PORT=3000` and the web/dashboard apps; browse via `localhost`, not `127.0.0.1` (the dev origin does not hydrate there).
- [ ] At 1440 and 390, both locales, light/dark/high-contrast: `/events` (each tab, a filter in the URL), `?view=calendar`, an upcoming, a running and a past event, the homepage section (if built), the hero bar in both modes, the header panel card, search for an event title. Compare with `docs/design-specs/events/png/`.
- [ ] Measure: no horizontal scroll at 320; touch targets ≥ 44; focus visible on every control; `prefers-reduced-motion: reduce` stops every animation; the countdown's accessible name reads in full.
- [ ] Wait 65 s after a dashboard save before calling a public page stale (60 s public cache).
- [ ] Stop every started server and confirm ports 3000/3001/3002 are free and no orphaned `node` remains (CLAUDE.md §32).

### Task 37: ADR and documentation sync

**Files:**
- Create: `docs/design-system/ADR-01NN-Public-Events.md` (number from Task 0 Step 4) — the decisions actually recorded for D-1…D-24, what was built, the `PENDING FIGMA BACK-SYNC` list from spec §15, and a note superseding ADR-0081 D2
- Modify: `docs/design-system/ADR-0081-The-Next-Event-Bar-And-Its-Data-Source.md` (status table: D2 superseded by the new ADR)
- Modify: `docs/product/01-Information-Architecture.md` §12 (record `/events`, `?view=calendar`, `/events/[slug]` as built, with the breakpoints actually built)
- Modify: `docs/engineering/guard-tests.md`
- Modify: `docs/design-specs/decision-log.md`
- Modify: `docs/design-specs/progress-log.md`
- Create: `docs/design-specs/events/figjam-back-sync.md` — the list of FigJam `289:4555` changes (spec M-5, D-1, D-2, D-6, D-21) for when the owner confirms Figma edits; **no Figma edit is made**

- [ ] Write each from the code as built, not from this plan.

### Task 38: Hand the seasons defects over

**Files:** none (report text).

- [ ] Report to the seasons owner, with file and line: M-2 (`markLive` writes `'Live'`; `season.schema.ts` enum and `PUBLISHED_SEASON` read `'Published'`) and M-3 (no `publish-approved` route). Not fixed in this project.

### Task 39: Owner hand-off

**Files:** none.

- [ ] List every file this plan created or modified, grouped by phase, and state which phases build on their own (Phases 1–5 do; the Phase 6/7 tasks that call Phase 2 routes do not build or run without it). All work stays uncommitted; staging and committing are the owner's (CLAUDE.md §33), so this plan contains no such step.
- [ ] Write `cd api && npm run sync:permissions` for the owner to run (Task 11).

---

## Self-Review Notes

**Spec coverage:** §3 → Tasks 2–5; §4.2 publishing → Tasks 7, 8, 19; §4.3 visibility → Tasks 4, 12; §5 timing/countdown → Tasks 1, 5, 24; §6.1 → 26; §6.2 → 25; §6.3 → 27; §6.4–6.5 → 28; §6.6 → 29; §7 → 6, 21, 31; §8.1 → 13, 20, 30; §8.3 → 32; §9 → 14–21; §10 → 34; §11 → 8, 10, 11; §12 → 12, 33; §13 → every task's tests + 35; §14/§17 → Task 0 gates and the BLOCKED marks; §15 → 27, 36, 37; §16 → Global Constraints + 34 + 38; §18 → Reconciliation.

**Blocked:** Task 2 (D-1) — and therefore everything after it in Phase 2; Tasks 21 and 31 (D-13). Partially gated: 19, 27, 28 (D-7, D-11), 17, 26 (D-17), 25 (D-4, D-5), 29 (D-15), 30 (D-3).

**Count:** 40 tasks (Phase 0: 1 · Phase 1: 1 · Phase 2: 8 · Phase 3: 2 · Phase 4: 1 · Phase 5: 1 · Phase 6: 8 · Phase 7: 13 · Phase 8: 5).

**Estimate:** ~6–7 engineering days once D-1 and D-13 are recorded (spec §20).

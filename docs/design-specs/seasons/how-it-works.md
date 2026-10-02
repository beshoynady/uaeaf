# Seasons

A season is a record with a first and a last day, phases, key dates and a publication state.
It is edited in the dashboard, published through the platform's publishing engine, shown on
`/seasons`, `/seasons/[slug]` and `/seasons/current`, offered in the header's Events & Seasons
panel, and used to narrow the public album and video libraries. This document explains the
subsystem as it exists in the code today. The decisions behind it are ADR-0127.

---

### 1. Why it was built this way, and what was rejected

**Dates are calendar days in Dubai, not instants.** The Federation asks "does the season include
31 August?" and expects yes all day on 31 August in Dubai. So `startDate` and `endDate` name the
first and last day, both inclusive, and every comparison turns them into a half-open range —
from the start of the first day to the start of the day after the last — through one helper,
`dubai-day-range.util.ts`. The offset is read from the `Asia/Dubai` zone through `Intl`, not
written as `+4`. Rejected: UTC midnights (a season would end four hours early in Dubai), an
inclusive `23:59:59.999` bound (leaves gaps, makes adjacency ambiguous), a hard-coded offset.

**The old label rule was left alone.** Albums and videos were already filed into seasons by
`seasonRange` (`videos/season.ts`): a label such as `2025–2026` means 1 September to 1 September,
UTC midnight. Its callers lie outside this work's approved scope, and moving it to Dubai days
would have shifted every album and video by four hours. So the season record's days sit
**beside** it: a label still means what it always meant, and a season's slug means that
season's own days. Rejected: converting labels to slugs and looking them up, which silently
re-reads every old link.

**A season is a publication entity type.** It is published through `PublishingService`, behind
the type's approval policy and a dedicated `Publish` permission, and speaks the platform's words
(`Draft | Live | Unpublished | Archived`, `publishDate`, `publishedBy`). The first version copied
`albums`' words (`Published`, `publishedAt`), and a published season vanished from the site: the
engine wrote `Live`, the public query read `Published`. Rejected: an `albums`-style publish route
of the season's own, which is a second door that never consults the policy.

**The header reads seasons once, on the server.** The picker's list and its year search both
come from the header's single cached read, so opening the panel makes no request.

### 2. File map, in the order data flows through them

| Order | File | Role |
| --- | --- | --- |
| 1 | `api/src/common/utils/dubai-day-range.util.ts` | `dubaiDayRange`, `isWithinDayRange`, `dayRangesOverlap`, `dayRangeContains` — the one definition of "these days". |
| 2 | `api/src/modules/media-center/seasons/schemas/season.schema.ts` | The collection, its phase and key-date subdocuments, four indexes (unique live slug, one current season, publication + start, start + end). |
| 3 | `…/seasons/dto/*.ts` | Create/update/publish bodies. `Live` is not creatable; the update body inherits that list. |
| 4 | `…/seasons/seasons.repository.ts` | `PUBLISHED_SEASON` (what a visitor may see), overlap query, the one-transaction `setCurrent`. |
| 5 | `…/seasons/seasons.service.ts` | Day-range validation, phase rules (`assertPhasesFit`), overlap refusal, delete guard (albums/videos still inside the season's days), public response shape. |
| 6 | `…/seasons/seasons.controller.ts` | Admin CRUD, `set-current`, `submit` / `publish` / `publish-approved` / `editorial-state` through `PublishingService`, and the three public reads. |
| 7 | `api/src/modules/workflow/publishing/publishing.service.ts` | `markLive` writes `Live`, `publishDate` and — when the schema has it — `publishedBy`. |
| 8 | `…/seasons/season-range-resolver.ts` | `?season=` for the album and video lists: label → `seasonRange`; slug → the season's days; else nothing. Registered in `AlbumsModule` and `VideosModule`. |
| 9 | `…/albums/albums.public-filter.ts`, `…/videos/videos.public-filter.ts` | Take the resolved range as a second argument; without it they read the label as before. |
| 10 | `apps/dashboard/src/app/api/admin/seasons/**` | The admin proxy routes, one per API write. |
| 11 | `apps/dashboard/src/lib/admin/seasons/*`, `components/admin/seasons/*` | List screen, seven-section form, phase strip and chips, the editorial buttons the server says are available. |
| 12 | `apps/web/src/lib/seasons/load.ts`, `types.ts`, `season-days.ts`, `timeline.ts` | Public reads, the public shape, Dubai days on the site, timeline geometry. |
| 13 | `apps/web/src/lib/seasons/season-stats.ts` | Album and video counts and previews, asked for by the season's slug. |
| 14 | `apps/web/src/app/[locale]/seasons/**` | The archive, the season page, and `/seasons/current`'s redirect. |
| 15 | `apps/web/src/components/pages/seasons/*` | Hero, timeline, badges, cards, archive grid, year search, `seasons.css` (the phase colours). |
| 16 | `apps/web/src/lib/seasons/year-search.ts` | `toLatinDigits`, `seasonSearchText`, `matchesSeasonQuery` — shared by the archive and the header. |
| 17 | `apps/web/src/lib/header/features.ts` → `components/layout/cards/season-picker.tsx` | The header's `seasons` field and the Events & Seasons picker. |

### 3. One real example, traced end to end: "Videos of this season"

A visitor on `/ar/seasons/2026-2027` follows the link into the video library.

1. **`app/[locale]/seasons/[slug]/page.tsx`** writes `videosHref` as
   `/media/videos?season=2026-2027` — the slug, hyphen and all.
2. **`lib/video/library-query.ts`**, `readLibraryQuery`, accepts the value because it is a year
   pair joined by a hyphen or an en dash (`SEASON`), and `apiQuery` sends it to the API unchanged.
3. **`VideosController`** passes `season` through `QueryPublicVideosDto` (shaped only, never
   refused) to `VideosService.findPublicPage`.
4. **`SeasonRangeResolver.resolve`** first asks `seasonRange("2026-2027")` — `null`, it is not an
   en-dash label — then looks for a season with that slug under `PUBLISHED_SEASON`. Found, it
   returns `dubaiDayRange(startDate, endDate)`: from 31 August 20:00 UTC (1 September in Dubai)
   to the start of the day after the last day.
5. **`buildPublicVideoFilter(query, range)`** writes `publishedAt: { $gte, $lt }` from that range.
   An explicit `from`/`to` would still win.
6. The library shows the season's videos. Had the visitor arrived with `?season=2026–2027` (en
   dash), step 4 would have returned the September-to-September UTC range, exactly as before this
   subsystem existed.

The counts under the season's hero use the same path (`season-stats.ts` asks by slug), so the
number on the page and the list behind the link cover the same days.

### 4. Non-obvious decisions and their reasons

- **The label is tried first.** A value that parses as a label is never looked up as a slug, so
  an old link cannot change meaning because someone later names a season after it.
- **Only a visible, live season resolves.** A Draft or hidden season's slug is ignored by the
  public filters, so its dates are not published through them.
- **The resolver is registered on the `Season` model inside the album and video modules**, not
  reached through `SeasonsModule`, because `SeasonsModule` imports both for its delete guard. The
  services take it as `@Optional()` so their many unit tests need not build one;
  `season-range-wiring.spec.ts` is what fails if a module stops providing it.
- **A one-day season is valid.** Under inclusive days, `start == end` lasts one day; only a last
  day before the first is refused, compared as days, not instants.
- **Phases:** the same type never shares a day; different types may (registration runs during
  competition); every phase lies inside the season. Shrinking a season past an existing phase is
  refused, because the check runs on what the save would store.
- **`publishedBy` is written by the engine**, for any type whose schema has the field — the
  narrower fact "who put this live", which survives later edits, unlike `updatedBy`.
- **Phase colours are four fixed token pairs, red excluded** (ADR-0050 reserves it), and the type
  is named on every badge and segment, so colour never carries the meaning alone.
- **The header tile is neutral for every season.** The design's per-season fills (one of them
  blue, which has no token) would make colour distinguish seasons; the current one carries a
  "Current" pill in words.

### 5. How to extend it

**Adding a field to a season:** schema → create DTO (and, if editable, not omitted from the
update DTO) → `SeasonsService.create`/`update` (dates through `setDateField`, ids through
`setObjectIdField` — `raw-dto-cast-scan.spec.ts` refuses raw casts) → `toPublicResponse` if the
site shows it → `apps/web/src/lib/seasons/types.ts` → the dashboard draft and form section.
An id pointing at a media asset or document also needs `media-reference-coverage.spec.ts` to
agree.

**Another list filtering by season:** inject `SeasonRangeResolver` into its service, register it
and the `Season` model in its module, pass the resolved range into its pure filter, and add the
module to `season-range-wiring.spec.ts`.

**A new phase type:** `SEASON_PHASE_TYPES` in the schema and in `apps/web/src/lib/seasons/types.ts`,
a token pair in `seasons.css` and `phase-type-chip.tsx`, both locales' names, and the contrast
spec `season-phase-contrast.spec.ts`.

Run: `cd api && node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/modules/media-center/seasons && npx tsc --noEmit`,
then in `apps/web` `npx vitest run --pool=threads src/lib/seasons` and `src/components/layout`.

### 6. Three mistakes someone will make

1. **Comparing a season's dates as instants.** `endDate < now` is wrong for the whole of the last
   day in Dubai. Go through `dubaiDayRange`; the web has the same rule in `season-days.ts`.
2. **"Fixing" `seasonRange` to use Dubai days.** It files every album and video, and old links
   depend on it; changing it is an owner decision, not a cleanup (ADR-0127 D5).
3. **Writing `publicationState` from the season service.** The only ways into `Live` are the
   publishing routes; a service-level write bypasses the approval policy, and `updateOne` would
   not even validate the value — which is how the original defect stayed invisible.

### 7. Tests that guard it

- `api/.../seasons/season-range-resolver.spec.ts` — label read as `seasonRange` with no lookup;
  slug to Dubai days (whole last day, one-day season, non-year slug); unknown slug `null`.
- `api/.../seasons/season-range-resolver.integration.spec.ts` — real database: slug narrows albums
  and videos to the season's days; a label returns the same content before and after a season
  record exists; Draft and hidden seasons do not resolve; a date window still wins.
- `api/.../seasons/season-range-wiring.spec.ts` — both modules provide the resolver and both
  services ask for it.
- `api/.../seasons/seasons.service.spec.ts`, `seasons.repository.spec.ts`,
  `seasons.repository.set-current.spec.ts`, `seasons.publishing.spec.ts`,
  `seasons.controller.spec.ts`, `schemas/season.schema.spec.ts`, `dto/create-season.dto.spec.ts`
  — day rules, overlap, phases, current season, publication vocabulary and routes.
- `api/src/common/utils/dubai-day-range.util.spec.ts` — the day arithmetic.
- `apps/web/src/lib/video/library-query.spec.ts` — both season forms reach the API unchanged.
- `apps/web/src/lib/seasons/*.spec.ts` — counts asked by slug, Dubai days, timeline, year search.
- `apps/web/src/lib/header/features.spec.ts`, `components/layout/site-header.test.tsx` — the
  picker's data isolation, the three rows, year search with Arabic-Indic digits, no match, empty
  list, drawer.
- `apps/web/src/lib/design-system/season-phase-contrast.spec.ts` — the phase colours' contrast.

### 8. What was deliberately not built, and why

- **Sponsor linking.** The sponsorship draft and request body carry no `targetId`, so a `Season`
  target would name no season. **BLOCKED.**
- **Document upload.** No documents upload route and no backend file-type check exist; faking the
  check in the browser is refused. **BLOCKED.**
- **Un-archive in the dashboard.** No API route lists archived seasons, so the dashboard cannot
  learn an archived season's id. **PENDING-OWNER.**
- **A slug in the album library's address.** The season page's album link still carries the
  en-dash label (September to September UTC), because that address accepts labels only by a
  documented contract. **PENDING-OWNER.**
- **Naming a slug-selected season in the video library's select.** The filter applies; the
  select shows "all seasons". **DESIGN DECISION REQUIRED.**
- **The Championships panel's season summary.** No championships or records collection exists.

### 9. Vocabulary

| Term | Meaning here |
| --- | --- |
| Label | `2025–2026` with an en dash: `seasonRange`'s September-to-September UTC range, derived from a date. |
| Slug | A season record's address, e.g. `2025-2026`; resolves to that season's own days. |
| Dubai day | A calendar day in `Asia/Dubai`; stored as that day's Dubai midnight. |
| Day range | `[start of first day, start of the day after the last day)`. |
| Current season | The one season with `isCurrent: true`; `/seasons/current` redirects to it. |
| Live / visible | Published by the engine (`publicationState: 'Live'`) and not hidden (`isVisible: true`) — both required for any public read. |
| Phase type | `preparation`, `domestic`, `international`, `rest` — one fixed colour pair each. |

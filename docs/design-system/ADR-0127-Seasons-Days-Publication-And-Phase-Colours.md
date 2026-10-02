# ADR-0127 — Seasons: inclusive Dubai days, the platform's publication vocabulary, and one colour per phase type

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-29. **Built** in the working tree (API, dashboard, public site, header picker), uncommitted. Phase overlap (D4) awaits the Federation's confirmation; everything else is decided. |
| **Authority** | Product Owner decisions of 2026-09-29, recorded in `docs/design-specs/decision-log.md` rows 59–73 (Arabic, the owner's working record). |
| **Numbering note** | ADR-0122 to ADR-0126 are taken. The owner reserved ADR-0127 onward for seasons, public events and the translation split; this record is ADR-0127. |
| **Amends** | Nothing in Chapters 0–27. Adds the `seasons` collection and its rules; adds a second reading of the public album and video `season` parameter beside the existing one (D5). |
| **Does not amend** | `videos/season.ts` (`seasonLabel`, `seasonRange`) — untouched by decision (D5). · ADR-0050's colour hierarchy, which D8 applies rather than changes. · ADR-0125, whose policy rule D7 follows. |
| **Context** | The platform had no season entity: albums and videos derive a label from a date (`seasonRange`, UTC midnight, 1 September to 1 September). The seasons subsystem adds a real record — a name, a first and a last day, phases, key dates — published on `/seasons`, `/seasons/[slug]` and `/seasons/current`, edited in the dashboard, and offered in the header. Building it surfaced three defects that each made a published season unreachable or undatable (D6), and a mismatch between the album and video libraries' readings of `?season=` (D5). |
| **Decision** | A season's dates are **inclusive Asia/Dubai calendar days**, compared internally as a half-open range whose offset is read from the time zone. A one-day season is valid. Phases of one type never share a day; phases of different types may; every phase lies inside its season. `seasonRange` is not touched: a season's **slug** resolves beside it, a **label** keeps resolving exactly as before. Seasons speak the platform publication vocabulary (`Draft \| Live \| Unpublished \| Archived`, `publishDate`, `publishedBy`), and every route into `Live` is governed. Each phase type has one fixed token pair; red is not among them; colour is never the only thing that tells two phases apart. |
| **Alternatives Considered** | Listed per decision below. |
| **Why This Decision** | Each rule answers a question the Federation asks in calendar days, in its own time zone: "does the season include 31 August?" must be yes on 31 August in Dubai, whatever instant the database stores. Every other choice here follows from keeping that one answer consistent across the API, the dashboard and the public site, without moving content that existing links already point at. |
| **Risks** | **Two season readings coexist** (D5): a label covers 1 September to 1 September UTC; a slug covers the season's own Dubai days. **Mitigation:** the season page asks the API by slug for its counts and previews, so its numbers are the season's own days; the one link that still carries a label (into the album library) is recorded as open in D10. **Overlap check and write are not atomic** (decision log #68): two simultaneous creations could both pass. **Mitigation:** recorded as debt under CLAUDE.md §31; the fix needs a transaction or lock and is outside this scope. **Phase-shape edges below 3:1** in some modes (decision log #73). **Mitigation:** every text passes AA and the type is named on every badge and segment; recorded as DESIGN DECISION REQUIRED, no token changed. |
| **Consequences** | New collection `seasons` with four indexes; new resource `seasons` in the permission catalogue (requires `sync:permissions` on each database, run by the owner); new public routes `GET /seasons/public`, `/public/current`, `/public/:slug`; the album and video list routes accept a slug in `season`; the header's Events & Seasons panel gains a picker. |

---

## D1 — Dates are inclusive Asia/Dubai calendar days, compared half-open, the offset read from the zone

A season's `startDate` and `endDate` name its first and last day, both included, read in
`Asia/Dubai`. The dashboard stores each day as that day's Dubai midnight. Every comparison
goes through `api/src/common/utils/dubai-day-range.util.ts`:

- `dubaiDayRange(first, last)` returns `[start of the first day, start of the day after the last day)`.
  Half-open, so two ranges that meet at a day boundary (a season ending 31 August, the next
  starting 1 September) share no instant, and one that ends on a day covers the whole of it.
- `isWithinDayRange`, `dayRangesOverlap` and `dayRangeContains` are the only comparisons the
  seasons code uses; there is no second copy.
- The offset is **read from the time zone through `Intl.DateTimeFormat`**, not written as `+4`.
  Dubai keeps +4 all year today; a rule that reads the zone stays right if that ever changes,
  where a constant that happens to be right does not.

**Rejected:** storing and comparing UTC midnights (a season would end four hours early in
Dubai); an inclusive upper bound at `23:59:59.999` (leaves a gap and makes adjacency ambiguous);
a hard-coded offset.

The public site mirrors the same rule (`apps/web/src/lib/seasons/season-days.ts`), and the
year search reads a season's years from its Dubai days.

## D2 — A one-day season is valid

Under D1, `startDate == endDate` is a season that lasts one day, exactly as a one-day phase
already was. Only a last day that falls **before** the first is refused, and the comparison is
between Dubai days, not instants: two moments of one Dubai day are the same day
(`SeasonsService.assertValidRange`). **Rejected:** keeping `start < end`, which contradicted
the rule every other check in the module follows. (Decision log #65.)

## D3 — Seasons do not overlap each other

A season may not share a Dubai day with another live season (`seasonOverlap`, 409, naming the
other season). Meeting at a day boundary is not sharing a day. The query stays on the indexed
fields: against a day boundary, a stored day compares exactly as its raw instant does
(`SeasonsRepository.findOverlapping`).

## D4 — Phases: the same type never overlaps, different types may, every phase inside the season

- Two phases of the **same type** may not share a day (`seasonPhaseOverlap`, 422, carrying both
  phases' index and name so the form can mark them).
- Phases of **different types** may overlap: registration runs during competition by design.
- Every phase lies inside its season's days, and a phase may not end before it starts
  (`seasonPhaseOutOfRange`, 422, carrying the phase's index and name). Shrinking a season past a
  phase it already has is refused the same way, because the check runs on what the save would
  store.

**Rejected:** forbidding every overlap (contradicts how a season actually runs); a 422 with no
code (the dashboard could not say which phase to fix — decision log #66).
**Status:** DECIDED — PENDING-FEDERATION confirmation (decision log #61).

## D5 — `seasonRange` stays exactly as it is; a slug resolves beside it

`api/src/modules/media-center/videos/season.ts` is **not changed**. Its callers —
`albums/albums.public-filter.ts`, `albums/albums.repository.ts` (the gallery's season facets),
`video-section/video-settings.ts`, and within the videos module `videos.public-filter.ts` and
`dto/video-public-response.dto.ts` (`seasonLabel`) — lie outside the approved scope. Moving
`seasonRange` to Dubai days would shift every album and video filed by it by four hours
without authorisation, and change which season existing links return. (Decision log #59.)

Instead, `api/src/modules/media-center/seasons/season-range-resolver.ts` reads the public
`season` parameter of `GET /albums/public` and `GET /videos/public` in this order:

1. **A label** (`2025–2026`, en dash) → `seasonRange`, unchanged. Old links return what they
   always returned, whether or not a season record now exists.
2. **A season's slug** (`2026-2027`, or any other slug) → that season's own days through
   `dubaiDayRange`. Only a season a visitor may see (`Live`, visible, not archived) resolves; a
   Draft or hidden season does not publish its dates through a filter.
3. **Anything else** → no season filter, the whole library, as before.

The resolver is registered in `AlbumsModule` and `VideosModule` directly on the `Season` model,
because `SeasonsModule` imports both for its delete guard. The list services take it as
`@Optional()`; `season-range-wiring.spec.ts` fails if either module stops providing it.

**This closes the hyphen/en-dash mismatch for videos end to end.** The season page links to the
video library with the slug (`?season=2026-2027`); the web video library now accepts a hyphen
slug or an en-dash label and forwards either unchanged; the API resolves the slug. Before, the
web library accepted only the hyphen form and the API only the en dash, so the link showed the
unfiltered library — and the library's own season select, whose options are en-dash labels,
was dropped by the same web check.

**Rejected:** the plan's first draft, converting every en dash to a hyphen and looking the
result up as a slug — it would have silently re-read every old label link as the season's own
days. Changing `seasonRange` itself — not authorised (above).

## D6 — Seasons speak the platform publication vocabulary

`seasons` is a publication entity type, so `PublishingService.markLive` is what puts one live,
and it writes the platform's words. The season schema originally copied `albums`' vocabulary
(`Draft | Published | Archived`, `publishedAt`). Three defects followed, each confirmed:

1. **A published season vanished from the public site.** `markLive` writes
   `publicationState: 'Live'` through an `updateOne`, which runs no enum validator, so the write
   succeeded; the public query read `'Published'` and found nothing. Each side agreed with itself
   and with nothing else. `albums` never meets this code because it is not a publication entity
   type — which is how the copy looked safe. (Decision log #62.)
2. **The publication date was never recorded.** `markLive` writes `publishDate` when the schema
   has that path; the season called it `publishedAt`, so the branch never ran. (Decision log #63.)
3. **An approved season could not be published** — there was no `publish-approved` route.
   (Decision log #64.)

**Decision:** `publicationState` uses `PUBLICATION_STATES` (`Draft | Live | Unpublished | Archived`);
the date is `publishDate`; the public read is `PUBLISHED_SEASON = { publicationState: 'Live', isVisible: true, archivedAt: null }`.
No migration: no season existed in any database when this changed.

**`publishedBy`.** `PublishingService.markLive` now writes `publishedBy` — the actor who put the
record live — **when the schema has the field**, by the same schema-asks-for-it rule it already
applies to `publishDate`. `updatedBy` records the last hand on a record; `publishedBy` is the
narrower fact that survives later edits.

## D7 — Publishing is governed end to end, with no direct door

| Route | Permission | Path |
| --- | --- | --- |
| `POST /seasons/:id/submit` | `seasons:Update` | Opens a review through the type's policy; the workflow definition comes from the policy, never from the caller. |
| `PATCH /seasons/:id/publish` | `seasons:Publish` | `PublishingService.publishDirect`: allowed only where the type's policy says direct publish (ADR-0125), with the `expectedUpdatedAt` concurrency check. |
| `POST /seasons/:id/publish-approved` | `seasons:Publish` | `PublishingService.publishApproved`: publishes what a completed review approved. |
| `GET /seasons/:id/editorial-state` | `seasons:Read` | What the dashboard needs to draw the right button. |

There is **no other way into `Live`**: `CreateSeasonDto` accepts every state except `Live`
(`CREATABLE_SEASON_PUBLICATION_STATES`), `UpdateSeasonDto` inherits that same restricted list
and `SeasonsService.update` never writes `publicationState` at all, and `SeasonsService` has no
`publish()` of its own. **Rejected:** a service-level publish like
`albums`' own route, which ADR-0125 D1 records as a second door that never consults the policy.

## D8 — One fixed colour per phase type; red deliberately excluded; colour never the sole differentiator

| Phase type | Ground | Ink | Edge |
| --- | --- | --- | --- |
| preparation · إعداد | `neutral-warm-200` | `neutral-warm-900` | — |
| domestic · داخلي | `green-700` | white | section-green border |
| international · خارجي | `brand-black` | white | `border-strong` |
| rest · راحة | `neutral-warm-50` | `neutral-warm-700` | **dashed** `neutral-warm-400` |

Implemented once, in `apps/web/src/components/pages/seasons/seasons.css`
(`.season-phase-tone[data-phase]`), through the semantic tokens that resolve to these values
(domestic through the section-green register, `#005226` / white). The dashboard draws the
same four pairs in `apps/dashboard/src/components/admin/seasons/phase-type-chip.tsx`.

**Red is excluded on purpose.** ADR-0050's colour hierarchy holds red to about 5% of any page
and reserves it for alerts and live broadcast; spending it on a routine phase would take that
meaning away. (Decision log #60.)

**Colour is never the only differentiator.** Every phase badge and timeline segment prints the
type's name, the legend names all four, and the rest phase carries a dashed edge as a second,
non-colour cue. Contrast: every text pair passes AA in light and dark; some shape edges fall below
3:1 in some modes (decision log #73) — recorded as DESIGN DECISION REQUIRED, no token changed.

**Rejected:** a colour per phase including red; free per-phase hex as the demo drew it
(CLAUDE.md §2, §16).

## D9 — The header's season picker is served by the header's one read

The Events & Seasons panel's middle track ("Go to a season" / «انتقل إلى موسم», header design
spec §3.4) lists the latest three public seasons and searches every public season by year.
`getHeaderFeatures` reads `GET /seasons/public` — the same cached read (60 seconds) the archive
page makes — alongside its other sources, so opening the panel makes no request. A failed read
is `seasons: []`, costs no other field, and removes the track: the panel shows its links and
card alone. The year search reuses `toLatinDigits` through `matchesSeasonQuery`, so `٢٠٢٤` and
`۲۰۲۴` find what `2024` finds. Like every middle track, it is dropped in the mobile drawer.

Each season's short name sits in one neutral tile (the header's raised step and strong edge);
the design's per-season fills — green, blue, maroon — are not used: seasons design spec §5.3
already refuses a colour per season, and blue has no token. The current season carries a
"Current" pill in words. **PENDING FIGMA BACK-SYNC:** the tile's neutral fill has no frame.

## D10 — Open items

| Item | Classification |
| --- | --- |
| Linking a sponsor to a season: the sponsorship draft and request body carry no `targetId`, so a `Season` target would name no season. | **BLOCKED** (decision log #70) |
| Uploading season documents: no documents upload route, no backend file-type check. | **BLOCKED** (decision log #71) |
| Un-archiving from the dashboard: no API route lists archived seasons. | **PENDING-OWNER** (decision log #72) |
| The season page's album link still carries the en-dash label, because the album library's address accepts labels only (`apps/web/src/lib/albums/season-label.ts`); it opens 1 September–1 September UTC, not the season's own days. Accepting a slug there changes that module's documented contract. | **PENDING-OWNER** |
| The video library's season select lists labels; arriving with a slug, the filter applies but the select shows "all seasons". | **DESIGN DECISION REQUIRED** (how a slug-selected season is named in the select) |
| Phase overlap rule. | **PENDING-FEDERATION** (D4) |
| Overlap check and write not atomic. | Debt — CLAUDE.md §31 (decision log #68) |

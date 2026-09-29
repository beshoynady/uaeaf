# Seasons Subsystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `seasons` collection end-to-end — backend module, permissions, dashboard CRUD, and public site (season page, archive, `/seasons/current` redirect) — and wire it into the existing album/video season filters and the header's season picker, without changing any field on any existing schema.

**Architecture:** A new NestJS module (`api/src/modules/media-center/seasons`) following the `albums` module's exact shape (schema/dto/repository/service/controller/module) since `seasons` is self-published content like `albums`, not workflow-governed content. The public site adds two new route trees (`/seasons`, `/seasons/[slug]`) and rewrites `/seasons/current` from a "preparing" placeholder into a redirecting `page.tsx`. Album/video season filtering gains a database-backed resolution step in front of the existing pure `seasonRange()` fallback, so old `?season=` links keep resolving.

**Tech Stack:** NestJS 10 / Mongoose 9.9.4 (API), Next.js App Router + next-intl (`apps/web`), Next.js (`apps/dashboard`), Vitest/Jest.

**Spec:** `docs/design-specs/seasons/2026-09-29-seasons-design.md` — this plan implements it section by section; task headers below cite the spec section they satisfy.

## Global Constraints

- `/seasons/current` answers a 302 to the current season, or to `/seasons` when none exists. It stays a `page.tsx` (not a `route.ts`) so `apps/web/src/lib/pages/internal-links-contract.spec.ts` keeps passing, and it stays in `PREPARING_PAGES` — it is a redirect, not content (spec §4.3).
- Old media links `?season=2025–2026` must keep resolving to the same season after this ships. `api/src/modules/media-center/videos/season.ts` (`seasonLabel`/`seasonRange`) is touched by **no task** in this plan — it stays exactly as-is, used only as the fallback when no `Season` record matches (spec §8.1).
- The Championships panel's current-season summary card stays hidden (`currentSeasonSummary: null`). No task in this plan fills it — there are no championships or records collections to summarize (spec §8.2).
- Albums gain **no** `seasonId` field. An album's season stays derived from `eventDate` (already true today). No task in this plan touches `album.schema.ts`.
- No field is added, removed, or renamed on any existing schema. The only existing-file changes with content impact are: `sponsorship.schema.ts` (one enum value added to `SPONSORSHIP_TARGET_TYPES`), `permission-resources.ts` / `capability-map.ts` / `resource-domains.ts` (one resource added), `media-references.ts` (`seasons` added to `SCANNED_COLLECTIONS`), `public-pages.ts` / `preparing-pages` entries (moving `seasons` from preparing to public; updating `current-season`'s basis text), `apps/web/src/lib/navigation.ts` / `apps/dashboard/src/lib/navigation.ts` (nav entries), and the two header-feature files that already return `null` placeholders for season data.

---

## Reconciliation — what the appendix assumes vs. what the code actually does

Verified directly against the files below (line numbers as read 2026-09-29). Where the appendix's wording implied something the code contradicts, the code wins (CLAUDE.md §1) and the difference is called out.

1. **The derived-season logic is not at `packages/content/.../season.ts`.** It lives at `api/src/modules/media-center/videos/season.ts` (`SEASON_START_MONTH` line 18, `seasonLabel` line 29, `seasonRange` lines 49-63). No `packages/content` season file exists at all (search returned nothing). Four call sites, all in `api/`:
   - `api/src/modules/media-center/albums/albums.public-filter.ts:3,78` — `seasonRange(query.season)` filters `eventDate`.
   - `api/src/modules/media-center/albums/albums.repository.ts:9,255,308-309` — builds the album gallery's season **facets** (counts per season) from `eventDate`.
   - `api/src/modules/media-center/videos/videos.public-filter.ts:2,116-119` — `seasonRange(query.season)` filters `publishedAt` (not `eventDate` — a video has no event date).
   - `api/src/modules/media-center/videos/dto/video-public-response.dto.ts:3,67` — `seasonLabel(video.publishedAt)` is echoed back as a read-only `season` field on every public video.
   - A fifth, client-side consumer also exists and is not in the appendix: `apps/web/src/lib/albums/season-label.ts:22-27` validates a `season` query-string value (`isSeasonLabel`) before it is put on a link, on the **web** app, independent of the API's own `season.ts`.

2. **Albums and videos filter on different date fields.** `eventDate` for albums, `publishedAt` for videos. Any season-resolution helper this plan adds must be called once per module with the right field name — there is no single shared "the date" concept to hook into.

3. **`sponsorships.targetType` today is `['Federation', 'Championship', 'Event']`** (`api/src/modules/sponsorship-relations/sponsorships/schemas/sponsorship.schema.ts:10`), confirming the appendix's premise exactly. `targetId` carries no `ref:` (line 41-42, poly-ref pattern, comment explains two of the three targets have no collection yet) — adding `'Season'` needs no change to `targetId`.

4. **`PERMISSION_RESOURCES` is a flat `as const` array** (`api/src/common/constants/permission-resources.ts:17-107`) that by itself grants nothing. Adding a resource for real requires three more files, verified by reading them, not assumed from the appendix:
   - `api/src/common/authz/capability-map.ts` — `CAPABILITY_MAP`, one entry per resource declaring its `actions`/`group`/`scopes`/etc. (e.g. `albums` at lines 91-99). `PERMISSION_CATALOGUE` (`api/src/common/constants/permission-catalogue.ts:28-30`) is *derived* from this by `flatMap` — it is not edited directly.
   - `apps/dashboard/src/lib/admin/resource-domains.ts:68-138` — `RESOURCE_TO_DOMAIN`, which groups the resource under a heading in the roles screen. A resource missing here still renders, under "unclassified" (line 59-66) — not a hard failure, but a real gap.
   - `api/src/sync-permission-catalogue.ts` — the script (`npm run sync:permissions`) that actually upserts `permissions` collection rows from `PERMISSION_CATALOGUE` and resets the Super Admin role to hold exactly those. Editing the three files above changes nothing in a running database until this runs.
   - The appendix does not mention `capability-map.ts`, `resource-domains.ts`, or the sync script at all — it only names `PERMISSION_RESOURCES` and "the bootstrap script." This plan's Phase 2 covers all four.

5. **`WORKFLOW_ENTITY_TYPES` is a closed 13-item list** (`api/src/common/constants/workflow-entity-types.ts:14-28`) of editorial/governance content (articles, static pages, governance documents, committees, public events, ...). It does **not** include `albums` or `videos`, and `album.schema.ts:19-26` states why in so many words: an album is "a media-organization construct, not editorial narrative content," published directly by Media Center staff, "deliberately absent from both `WORKFLOW_ENTITY_TYPES` and `PUBLICATION_ENTITY_TYPES`." The appendix's own wording ("تُضاف `seasons` لـ`WORKFLOW_ENTITY_TYPES` لو مرّ بالموافقات") treats this as conditional/undecided. Given `seasons` is structurally identical to `albums` (dashboard-managed, no editorial review cycle, its own `Publish` permission), **this plan does not add `seasons` to `WORKFLOW_ENTITY_TYPES`** — same pattern as albums/videos, not a guess.

6. **A fifth guard the appendix never mentions: `media-references.ts`.** `Season.logoId`/`bannerId`/`shareImageId` (→ `MediaAsset`) and `calendarDocumentId`/`documentIds` (→ `Document`) put `seasons` inside the media-reference scan's reach automatically — `schemaRootsOf(connection)` (`media-references.ts:405-409`) walks every registered Mongoose model, no allowlist needed for the scan to run. But `SCANNED_COLLECTIONS` (lines 49-121) is also compared byte-for-byte against every registered collection by `media-reference-coverage.spec.ts:370-374` (`expect([...SCANNED_COLLECTIONS].sort()).toEqual(roots.map(...).sort())`). Registering the `Season` schema without adding `'seasons'` to `SCANNED_COLLECTIONS` fails that guard test immediately. Phase 1 includes this.

7. **`/athletics`, `/seasons`, `/seasons/current` already exist as `PREPARING_PAGES`, exactly as stated in the brief** — verified by reading all three page files:
   - `apps/web/src/app/[locale]/athletics/page.tsx`, `.../seasons/page.tsx`, `.../seasons/current/page.tsx` — each an identical two-line pattern: `generateMetadata` → `buildPreparingPageMetadata(KEY, locale)`, body → `<PreparingPageScreen pageKey={KEY} locale={locale} />`.
   - Their registry entries are `apps/web/src/lib/pages/public-pages.ts:363-369` (`athletics`), `:386-392` (`seasons`), `:393-399` (`current-season`).
   - The header's nav data already links both: `apps/web/src/lib/navigation.ts:134,141-142` has an `eventsSeasons` group with `currentSeason → /seasons/current` and `seasonsArchive → /seasons` — this is **already live**, not planned; the header redesign project shipped this part already.
8. **`internal-links-contract.spec.ts` does not check `PUBLIC_PAGES`/`PREPARING_PAGES` membership at all.** It checks that `app/[locale]/<route>/page.tsx` exists on disk for every literal `href`/`route:` it finds by scanning `navDestinations()`, `FOOTER_QUICK_LINKS`, `LEGAL_LINKS`, and a fixed set of component trees (`apps/web/src/lib/pages/internal-links-contract.spec.ts:83-84` `pageFileFor`, `:136-142` the assertion). Since the header nav already links `/seasons/current`, turning that route into a `route.ts` Route Handler (the more idiomatic way to answer a bare 302 in Next.js) would fail this test the moment it ships. This plan's Task 24 instead keeps a `page.tsx` there and calls `redirect()` from inside the Server Component — satisfies the 302 requirement and keeps the file the test looks for.
9. **The dashboard sidebar has no "grouped, titled section" for events/seasons today, and no `events`/`championships` backend to group with.** `apps/dashboard/src/lib/navigation.ts:320-323` shows `albums` and `videos` as flat, ungrouped `NavItem`s. The mockups' "الفعاليات والمواسم" heading over "الفعاليات"/"المواسم" is aspirational — no `events` NestJS module exists (`find … -iname "*event*"` under `api/src/modules` returns nothing) so there is nothing to group `seasons` with yet. `apps/dashboard/src/components/shell/sidebar-nav.tsx:184-243` already supports a titled group (any non-`flat` `NavItem` with `children`) with **no code change needed** to add one later — this plan adds `seasons` as a flat item now (Task 20) and leaves the grouped header to whichever project builds `events`.
10. **Every one of the twelve `PUBLIC_PAGES` listing pages has a matching `<name>Page` hero-wrapper collection** (`HeroPageSchema`, `api/src/common/schemas/hero-page.schema.ts:6-18`, e.g. `albums-page`/`videos-page` modules), giving each an editable hero title/subtitle/image with its own `Update`/`Publish` permission pair in `CAPABILITY_MAP`. The appendix's `dash-01`/`dash-02` mockups show no equivalent "seasons page settings" screen — only the season **list** and season **form**. This plan does **not** add a `seasonsPage` collection (spec §4.2, flagged `DESIGN DECISION REQUIRED — deferred`); `/seasons`'s heading and description are static i18n strings.
11. **The search source registry DOES exist — under a different name.** The identifier is not `SEARCH_SOURCES` but `buildSearchSources(models)`, a factory at `api/src/modules/platform-administration/search/search-sources.ts:105`, returning six registered sources (`articles`, `albums`, `videos`, `clubs`, `athletes`, `coaches`). It is called once from `SearchService`'s constructor. A source is a single entry in that array plus a `search_text` index on the collection — by design, adding one requires no edit to the service or controller. **Registering `seasons` is therefore in scope and is Task 26 below.**
12. **`PageSeo` already exists as a shared, reusable sub-schema** (`api/src/common/schemas/page-seo.schema.ts:16-26`: `metaTitle`, `metaDescription`, `ogImageId`) built for exactly the three fields the appendix asks Season to have under different names (`seoTitle{ar,en}`, `seoDescription{ar,en}`). This plan embeds `PageSeoSchema` on `Season` instead of hand-rolling two more `LocalizedText` fields — same fields, no duplicate definition (CLAUDE.md §16: prefer the existing token/schema).
13. **`BaseRepository<T>`** (`api/src/common/repositories/base.repository.ts`) is the shared soft-delete-aware CRUD base every domain repository (including `AlbumsRepository`) extends. `SeasonsRepository` follows the same pattern rather than reimplementing `findById`/`archiveIfLive`/`restoreIfArchived`/etc.

**Nothing in the appendix was found to be flatly wrong** about behavior it described (the season-derivation mechanism, the album/video filter shape, the sponsorship target types, the preparing-page state of the three routes) — every gap above is something the appendix simply did not mention, not a contradiction. All are covered in the tasks below.

---

## Phase 1 — Backend (`api/`)

### Task 1: `Season` schema, phase/key-date subdocuments, indexes

**Files:**
- Create: `api/src/modules/media-center/seasons/schemas/season.schema.ts`
- Test: `api/src/modules/media-center/seasons/schemas/season.schema.spec.ts`

**Interfaces:**
- Produces: `Season` class, `SeasonDocument`, `SeasonSchema`, `SEASON_PUBLICATION_STATES`, `SeasonPublicationState`, `SEASON_PHASE_TYPES`, `SeasonPhaseType`, `SeasonPhase` class, `SeasonKeyDate` class.

- [ ] **Step 1: Write the schema**

```ts
// api/src/modules/media-center/seasons/schemas/season.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { PageSeo, PageSeoSchema } from '../../../../common/schemas/page-seo.schema.js';

export type SeasonDocument = HydratedDocument<Season>;

export const SEASON_PUBLICATION_STATES = ['Draft', 'Published', 'Archived'] as const;
export type SeasonPublicationState = (typeof SEASON_PUBLICATION_STATES)[number];

/** Self-owned, like `ALBUM_PUBLICATION_STATES` (`album.schema.ts:12-17`) —
 *  seasons are media/operational content, not editorial narrative, so they
 *  are deliberately absent from `WORKFLOW_ENTITY_TYPES` (see the plan's
 *  reconciliation §5). */
export const SEASON_PHASE_TYPES = ['preparation', 'domestic', 'international', 'rest'] as const;
export type SeasonPhaseType = (typeof SEASON_PHASE_TYPES)[number];

/** Not a standalone collection: `_id: false`, same convention as
 *  `ContentAssociation`. */
@Schema({ _id: false })
export class SeasonPhase {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: String, enum: SEASON_PHASE_TYPES, required: true })
  type: SeasonPhaseType;

  @Prop({ type: Date, required: true })
  from: Date;

  @Prop({ type: Date, required: true })
  to: Date;
}
export const SeasonPhaseSchema = SchemaFactory.createForClass(SeasonPhase);

@Schema({ _id: false })
export class SeasonKeyDate {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: Date, required: true })
  date: Date;
}
export const SeasonKeyDateSchema = SchemaFactory.createForClass(SeasonKeyDate);

/** Implements: seasons collection, Domain 5 — Media Center. Self-published
 *  like `albums`/`videos` — see the plan's reconciliation §5 for why this is
 *  deliberately absent from `WORKFLOW_ENTITY_TYPES`. */
@Schema({ collection: 'seasons', timestamps: true })
export class Season extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ required: true, trim: true })
  shortName: string;

  /** Uniqueness declared below as a partial index, matching
   *  `AlbumSchema`'s slug index (`album.schema.ts:191`) — not `unique: true`
   *  here, so a soft-deleted season's slug does not block re-creation. */
  @Prop({ required: true, trim: true })
  slug: string;

  @Prop({ type: LocalizedTextSchema, default: null })
  tagline: LocalizedText | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MediaAsset', default: null })
  logoId: Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MediaAsset', default: null })
  bannerId: Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MediaAsset', default: null })
  shareImageId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, required: true })
  about: LocalizedText;

  /** Shown on the public page only once `endDate` has passed — a display
   *  rule, not a storage rule, so this is never conditionally required. */
  @Prop({ type: LocalizedTextSchema, default: null })
  closingSummary: LocalizedText | null;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: [SeasonPhaseSchema], default: [] })
  phases: SeasonPhase[];

  @Prop({ type: [SeasonKeyDateSchema], default: [] })
  keyDates: SeasonKeyDate[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Document', default: null })
  calendarDocumentId: Types.ObjectId | null;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Document', default: [] })
  documentIds: Types.ObjectId[];

  /** At most one season holds this at a time — enforced by the partial
   *  unique index below AND by `SeasonsService.setCurrent` clearing the
   *  previous holder in the same operation (belt and suspenders; there is
   *  no existing precedent for the DB half of this in this codebase —
   *  `Album.isFeatured` is app-level only, see the design spec §3). */
  @Prop({ type: Boolean, default: false })
  isCurrent: boolean;

  @Prop({ type: String, enum: SEASON_PUBLICATION_STATES, required: true })
  publicationState: SeasonPublicationState;

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  publishedBy: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false })
  isVisible: boolean;

  @Prop({ type: PageSeoSchema, default: () => ({}) })
  seo: PageSeo;
}

export const SeasonSchema = SchemaFactory.createForClass(Season);

SeasonSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });
SeasonSchema.index({ isCurrent: 1 }, { unique: true, partialFilterExpression: { isCurrent: true } });
SeasonSchema.index({ publicationState: 1, startDate: -1 });
SeasonSchema.index({ startDate: 1, endDate: 1 });
```

- [ ] **Step 2: Write the schema spec**

```ts
// api/src/modules/media-center/seasons/schemas/season.schema.spec.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Season, SeasonSchema } from './season.schema.js';

describe('Season schema', () => {
  let mongod: MongoMemoryServer;
  let SeasonModel: mongoose.Model<Season>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    SeasonModel = mongoose.model(Season.name, SeasonSchema);
    await SeasonModel.syncIndexes();
  });

  afterEach(async () => {
    await SeasonModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  const base = (overrides: Partial<Season> = {}) => ({
    name: { en: 'Season 2026-2027', ar: 'موسم 2026-2027' },
    shortName: '26/27',
    about: { en: 'About', ar: 'نبذة' },
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2027-08-31T23:59:59.999Z'),
    publicationState: 'Draft' as const,
    ...overrides,
  });

  it('rejects a second season with the same slug while both are live', async () => {
    await SeasonModel.create({ ...base(), slug: '2026-2027' });
    await expect(SeasonModel.create({ ...base(), slug: '2026-2027' })).rejects.toThrow();
  });

  it('allows a re-created slug once the original is archived', async () => {
    const original = await SeasonModel.create({ ...base(), slug: '2026-2027' });
    await SeasonModel.updateOne({ _id: original._id }, { archivedAt: new Date() });
    await expect(SeasonModel.create({ ...base(), slug: '2026-2027' })).resolves.toBeDefined();
  });

  it('rejects a second isCurrent:true season', async () => {
    await SeasonModel.create({ ...base(), slug: '2025-2026', isCurrent: true });
    await expect(SeasonModel.create({ ...base(), slug: '2026-2027', isCurrent: true })).rejects.toThrow();
  });

  it('allows any number of isCurrent:false seasons', async () => {
    await SeasonModel.create({ ...base(), slug: '2024-2025', isCurrent: false });
    await expect(SeasonModel.create({ ...base(), slug: '2025-2026', isCurrent: false })).resolves.toBeDefined();
  });
});
```

- [ ] **Step 3: Run the spec and verify it fails before the indexes exist**, then implement Step 1's schema, then verify the spec passes:

Run: `npx jest api/src/modules/media-center/seasons/schemas/season.schema.spec.ts --runInBand`
Expected after Step 1 lands: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add api/src/modules/media-center/seasons/schemas/season.schema.ts api/src/modules/media-center/seasons/schemas/season.schema.spec.ts
git commit -m "feat(seasons): add Season schema with phases, key dates and partial-unique indexes"
```

---

### Task 2: Register `seasons` in the media-reference scan

**Files:**
- Modify: `api/src/common/authz/media-references.ts:49-121` (`SCANNED_COLLECTIONS`)

**Interfaces:**
- Consumes: nothing new — `SCANNED_COLLECTIONS` is a plain `as const` array.

- [ ] **Step 1: Add `'seasons'` to `SCANNED_COLLECTIONS`, alphabetically** (between `'roles'` and `'siteSettings'`).

- [ ] **Step 2: Run the coverage guard — it will still fail until Task 1's model is actually registered in a running Mongoose connection (Task 8 does that), so run it again after Task 8, not now.** Record this dependency in Task 8's steps.

- [ ] **Step 3: Commit** (fold into Task 8's commit — this one-line change has no independent test until the module is wired up).

---

### Task 3: Create/update DTOs

**Files:**
- Create: `api/src/modules/media-center/seasons/dto/create-season.dto.ts`
- Create: `api/src/modules/media-center/seasons/dto/update-season.dto.ts`
- Create: `api/src/modules/media-center/seasons/dto/season-phase.dto.ts`
- Create: `api/src/modules/media-center/seasons/dto/season-key-date.dto.ts`

**Interfaces:**
- Consumes: `SEASON_PUBLICATION_STATES`, `SEASON_PHASE_TYPES` from Task 1.
- Produces: `CreateSeasonDto`, `UpdateSeasonDto`, `SeasonPhaseDto`, `SeasonKeyDateDto`, `CREATABLE_SEASON_PUBLICATION_STATES`.

- [ ] **Step 1: Write `SeasonPhaseDto`/`SeasonKeyDateDto`** (plain nested DTOs: `name`/`title` as `LocalizedTextDto`, `type` as `@IsIn(SEASON_PHASE_TYPES)`, `from`/`to`/`date` as `@IsDateString()`).

- [ ] **Step 2: Write `CreateSeasonDto`**, following `create-album.dto.ts`'s shape exactly: every field from Task 1's schema except `publishedAt`/`publishedBy`/`isCurrent` (server-set only — `isCurrent` changes only through the dedicated `set-current` route, Task 6) and excluding `'Published'` from the creatable `publicationState` values:

```ts
export const CREATABLE_SEASON_PUBLICATION_STATES = SEASON_PUBLICATION_STATES.filter((s) => s !== 'Published');
```

- [ ] **Step 3: Write `UpdateSeasonDto`** as `PartialType(OmitType(CreateSeasonDto, ['slug'] as const))` — slug is not editable after creation once a public URL may already point at it (same reasoning as `UpdateAlbumDto` excluding fields it cannot change; verify against `update-album.dto.ts` before writing and match its exact exclusion pattern, since this repo does not use a single shared "no rename" comment block twice).

- [ ] **Step 4: Write a validator spec** for each DTO (nested `phases`/`keyDates` arrays validate their entries; an invalid `type` value is rejected).

Run: `npx jest api/src/modules/media-center/seasons/dto --runInBand`

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/media-center/seasons/dto
git commit -m "feat(seasons): add create/update DTOs"
```

---

### Task 4: `SeasonsRepository`

**Files:**
- Create: `api/src/modules/media-center/seasons/seasons.repository.ts`
- Test: `api/src/modules/media-center/seasons/seasons.repository.spec.ts`

**Interfaces:**
- Consumes: `BaseRepository<T>` (`api/src/common/repositories/base.repository.ts`), `SeasonDocument`.
- Produces: `SeasonsRepository` with, beyond the inherited `BaseRepository` methods: `findBySlug(slug)`, `findCurrent()`, `listOrdered()` (all live seasons, `startDate` descending), `findOverlapping(startDate, endDate, excludeId?)`, `setCurrent(id)` (atomic two-write: clear the previous holder, set the new one).

- [ ] **Step 1: Write the failing repository spec** covering `findOverlapping` (a season whose range intersects an existing one, in both directions, is returned; a season that only touches the boundary — `endDate === otherStartDate` — is not, matching the half-open `[from, to)` convention `seasonRange` already uses) and `setCurrent` (the previous `isCurrent:true` row becomes `false` in the same call).

- [ ] **Step 2: Implement `SeasonsRepository`**, extending `BaseRepository<SeasonDocument>` the way `AlbumsRepository` does (`albums.repository.ts:1-9`):

```ts
async setCurrent(id: string): Promise<SeasonDocument | null> {
  const session = await this.model.startSession();
  try {
    return await session.withTransaction(async () => {
      await this.model.updateMany({ isCurrent: true }, { isCurrent: false }, { session });
      return this.model.findOneAndUpdate(
        { _id: id, archivedAt: null },
        { isCurrent: true },
        { returnDocument: 'after', session },
      );
    });
  } finally {
    await session.endSession();
  }
}
```

- [ ] **Step 3: Run the spec, verify it passes.**

Run: `npx jest api/src/modules/media-center/seasons/seasons.repository.spec.ts --runInBand`

- [ ] **Step 4: Commit**

```bash
git add api/src/modules/media-center/seasons/seasons.repository.ts api/src/modules/media-center/seasons/seasons.repository.spec.ts
git commit -m "feat(seasons): add SeasonsRepository with overlap lookup and atomic set-current"
```

---

### Task 5: `SeasonsService` — overlap validation, delete guard, publish

**Files:**
- Create: `api/src/modules/media-center/seasons/seasons.service.ts`
- Test: `api/src/modules/media-center/seasons/seasons.service.spec.ts`

**Interfaces:**
- Consumes: `SeasonsRepository` (Task 4), `AlbumsRepository`/`VideosRepository` (existing, for the delete guard's content check), `findMediaAssetReferrers` is **not** used here — the delete guard queries `albums`/`videos` directly by date range, since there is no `seasonId` to join on (spec §3.1).
- Produces: `SeasonsService.create/update/findById/findBySlug/listOrdered/publish/setCurrent/remove`.

- [ ] **Step 1: Write the failing spec for overlap rejection** — creating a season whose `[startDate, endDate)` intersects an existing live season throws a typed error (`SeasonOverlapError` or similar, mirroring how other services in this codebase throw a named error class rather than a bare string — check `sponsorships.service.ts`'s overlap check before writing this, and match its error-throwing convention exactly).

- [ ] **Step 2: Write the failing spec for the delete guard** — `remove()` on a season with at least one album (`eventDate` inside its range) or video (`publishedAt` inside its range) throws a `409`-mapped error instead of archiving.

- [ ] **Step 3: Write the failing spec for `publish()`** — sets `publicationState: 'Published'`, `publishedAt: now`, `publishedBy: actorId`; refuses (or no-ops, matching `AlbumsService.publish()`'s exact behavior — read it before deciding) on an already-published season.

- [ ] **Step 4: Implement `SeasonsService`**, modeled on `AlbumsService` (read `albums.service.ts` fully before writing this task's implementation so method names/error shapes match the codebase's convention rather than inventing new ones).

- [ ] **Step 5: Run all three specs, verify pass.**

Run: `npx jest api/src/modules/media-center/seasons/seasons.service.spec.ts --runInBand`

- [ ] **Step 6: Commit**

```bash
git add api/src/modules/media-center/seasons/seasons.service.ts api/src/modules/media-center/seasons/seasons.service.spec.ts
git commit -m "feat(seasons): add SeasonsService with overlap validation and content-linked delete guard"
```

---

### Task 6: `SeasonsController`

**Files:**
- Create: `api/src/modules/media-center/seasons/seasons.controller.ts`

**Interfaces:**
- Consumes: `SeasonsService` (Task 5), `@RequirePermission` decorator (`resourceType: 'seasons'`, actions per Phase 2's `CAPABILITY_MAP` entry), `@Public()` decorator.
- Produces: routes below.

- [ ] **Step 1: Write the controller**, following `albums.controller.ts`'s route-ordering convention exactly (literal segments before `:id`/`:slug` params — the file comment at `albums.controller.ts:40-46` explains why):

| Method | Route | Guard |
|---|---|---|
| `POST` | `/seasons` | `seasons:Create` |
| `GET` | `/seasons` | `seasons:Read` |
| `GET` | `/seasons/public` | `@Public()` — archive listing |
| `GET` | `/seasons/public/current` | `@Public()` — the current season, or `null` |
| `GET` | `/seasons/public/:slug` | `@Public()` — season detail composite |
| `GET` | `/seasons/:id` | `seasons:Read` |
| `PATCH` | `/seasons/:id` | `seasons:Update` |
| `PATCH` | `/seasons/:id/set-current` | `seasons:Update` |
| `PATCH` | `/seasons/:id/publish` | `seasons:Publish` |
| `DELETE` | `/seasons/:id` | `seasons:Archive` |
| `POST` | `/seasons/:id/unarchive` | `seasons:Restore` |

- [ ] **Step 2: Write an e2e/integration spec** hitting `GET /seasons/public/current` before and after `set-current`, confirming the public read reflects the change and that the guard rejects `seasons:Update`-less callers on the write routes.

Run: `npx jest api/src/modules/media-center/seasons --runInBand`

- [ ] **Step 3: Commit**

```bash
git add api/src/modules/media-center/seasons/seasons.controller.ts api/src/modules/media-center/seasons/seasons.controller.spec.ts
git commit -m "feat(seasons): add SeasonsController with public and admin routes"
```

---

### Task 7: `SeasonsModule` + `app.module.ts` registration

**Files:**
- Create: `api/src/modules/media-center/seasons/seasons.module.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Produces: `SeasonsModule`, exporting `SeasonsService` (for Phase 5's album/video filter wiring, and for `getHeaderFeatures`).

- [ ] **Step 1: Write `SeasonsModule`**, matching `albums.module.ts`'s shape:

```ts
@Module({
  imports: [MongooseModule.forFeature([{ name: Season.name, schema: SeasonSchema }])],
  controllers: [SeasonsController],
  providers: [SeasonsRepository, SeasonsService],
  exports: [SeasonsService],
})
export class SeasonsModule {}
```

- [ ] **Step 2: Register `SeasonsModule` in `app.module.ts`'s imports**, alongside the other `media-center` modules.

- [ ] **Step 3: Boot the API and confirm the model registers.** This is the point where Task 2's `SCANNED_COLLECTIONS` entry becomes verifiable — run the coverage guard now:

Run: `npx jest api/src/common/authz/media-reference-coverage.spec.ts --runInBand`
Expected: PASS (fails before Task 2's line is added, once `Season` is a registered model).

- [ ] **Step 4: `npx tsc --noEmit` across `api/`** to confirm the module graph compiles (do not run `nest build` if the dev API is running under `--watch` — it deletes `dist/` and kills the watcher, per this project's own operating notes).

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/media-center/seasons/seasons.module.ts api/src/app.module.ts
git commit -m "feat(seasons): wire SeasonsModule into the application"
```

---

## Phase 2 — Permissions

### Task 8: `PERMISSION_RESOURCES` + `CAPABILITY_MAP` + `resource-domains.ts`

**Files:**
- Modify: `api/src/common/constants/permission-resources.ts:17-107`
- Modify: `api/src/common/authz/capability-map.ts`
- Modify: `apps/dashboard/src/lib/admin/resource-domains.ts:68-138`

**Interfaces:**
- Produces: `'seasons'` as a valid `PermissionResource`, gating `@RequirePermission('seasons', …)` calls Task 6 already wrote.

- [ ] **Step 1: Add `'seasons'`** to the `PERMISSION_RESOURCES` array (alphabetical neighbor: after `'roles'`, before `'siteSettings'`).

- [ ] **Step 2: Add a `CAPABILITY_MAP` entry**, copying the `albums` entry's shape exactly (`capability-map.ts:91-99`):

```ts
{
  resourceType: 'seasons',
  group: 'media-center',
  actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
  purgeable: false,
  superAdminOnly: [],
  sensitiveFields: [],
  scopes: [],
},
```

- [ ] **Step 3: Add `seasons: "media-center"` to `RESOURCE_TO_DOMAIN`** in `resource-domains.ts`.

- [ ] **Step 4: Run the catalogue/coverage guards** that already exist for this exact purpose:

Run: `npx jest api/src/common/constants/permission-catalogue.spec.ts api/src/common/authz/capability-map.spec.ts --runInBand`
Run: `npx vitest run apps/dashboard/src/lib/admin/resource-domains.spec.ts`

Expected: PASS — these guards compare `@RequirePermission` decorators (from Task 6) against `CAPABILITY_MAP`/`PERMISSION_RESOURCES` in both directions, and `resource-domains.spec.ts` checks every `PERMISSION_RESOURCES` entry is mapped.

- [ ] **Step 5: Commit**

```bash
git add api/src/common/constants/permission-resources.ts api/src/common/authz/capability-map.ts apps/dashboard/src/lib/admin/resource-domains.ts
git commit -m "feat(auth): register seasons as an RBAC resource"
```

---

### Task 9: Run `sync:permissions` locally and record the result

**Files:** none (operational step against the local dev database — see this project's "Local DB Admin Authorization" standing permission for `admin@uaeaf.ae` against the local MongoDB).

- [ ] **Step 1:** `cd api && npm run sync:permissions`
- [ ] **Step 2:** Confirm the log line reports the new `seasons` permission rows and that Super Admin's role now includes them.
- [ ] **Step 3:** No commit — this is a database write, not a code change. Note the row count in the task's completion note for the reviewer.

---

### Task 10: `sponsorships.targetType` gains `'Season'`

**Files:**
- Modify: `api/src/modules/sponsorship-relations/sponsorships/schemas/sponsorship.schema.ts:10`

- [ ] **Step 1: Change the enum**

```ts
export const SPONSORSHIP_TARGET_TYPES = ['Federation', 'Championship', 'Event', 'Season'] as const;
```

This is a value-set change on an existing field's allowed values, not a field addition/removal/rename — permitted under the "no schema field changes" constraint, and it is the one sponsorship change the appendix explicitly authorizes.

- [ ] **Step 2: Update (or confirm) `create-sponsorship.dto.ts`'s `@IsIn(SPONSORSHIP_TARGET_TYPES)` picks the new value up automatically** (it imports the constant rather than hard-coding the list — verify this before assuming it, since a DTO that hard-codes the enum values separately would need its own edit).

- [ ] **Step 3: Add a case to `sponsorships.service.spec.ts`** creating a `targetType: 'Season'` sponsorship with a `targetId` equal to a season's `_id`, confirming it persists and reads back — matching whatever test already exists for `'Event'`.

Run: `npx jest api/src/modules/sponsorship-relations/sponsorships --runInBand`

- [ ] **Step 4: Commit**

```bash
git add api/src/modules/sponsorship-relations/sponsorships/schemas/sponsorship.schema.ts api/src/modules/sponsorship-relations/sponsorships/sponsorships.service.spec.ts
git commit -m "feat(sponsorships): allow Season as a sponsorship target type"
```

---

## Phase 3 — Dashboard (`apps/dashboard`)

### Task 11: Admin API proxy routes

**Files:**
- Create: `apps/dashboard/src/app/api/admin/seasons/route.ts` (GET list, POST create)
- Create: `apps/dashboard/src/app/api/admin/seasons/[id]/route.ts` (GET one, PATCH update, DELETE)
- Create: `apps/dashboard/src/app/api/admin/seasons/[id]/publish/route.ts`
- Create: `apps/dashboard/src/app/api/admin/seasons/[id]/set-current/route.ts`
- Create: `apps/dashboard/src/app/api/admin/seasons/[id]/unarchive/route.ts`

**Interfaces:**
- Consumes: whatever the equivalent `apps/dashboard/src/app/api/admin/albums/**/route.ts` files use to forward to the API with the admin's session — read `apps/dashboard/src/app/api/admin/albums/route.ts` and `.../[id]/publish/route.ts` first and match their exact proxy pattern (auth forwarding, error passthrough) rather than reinventing it.

- [ ] **Step 1–5: One proxy route per file, each mirroring its `albums` counterpart's structure.** Since these are thin passthroughs, write each with its own small spec asserting the correct upstream path/method is called and the response status/body pass through unchanged.

Run: `npx vitest run apps/dashboard/src/app/api/admin/seasons`

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/app/api/admin/seasons
git commit -m "feat(dashboard): add seasons admin API proxy routes"
```

---

### Task 12: `lib/admin/seasons` — types, requests, list filters

**Files:**
- Create: `apps/dashboard/src/lib/admin/seasons/types.ts`
- Create: `apps/dashboard/src/lib/admin/seasons/requests.ts`
- Create: `apps/dashboard/src/lib/admin/seasons/list-filters.ts`
- Create: `apps/dashboard/src/lib/admin/seasons/to-admin-season.ts`
- Test: matching `.spec.ts` for each, mirroring `apps/dashboard/src/lib/admin/albums/{types,requests,list-filters,to-admin-album}.ts` and their specs.

- [ ] **Step 1–4: One file at a time**, each following its `albums` namesake's shape and export names (`AdminSeason` in place of `AdminAlbum`, `fetchSeasons`/`createSeason`/`updateSeason`/`setSeasonCurrent`/`publishSeason` in place of the album equivalents).

Run: `npx vitest run apps/dashboard/src/lib/admin/seasons`

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/admin/seasons
git commit -m "feat(dashboard): add seasons admin data layer"
```

---

### Task 13: Seasons list screen (`dash-01`)

**Files:**
- Create: `apps/dashboard/src/components/admin/seasons/seasons-table.tsx`
- Create: `apps/dashboard/src/components/admin/seasons/season-row-parts.tsx`
- Create: `apps/dashboard/src/app/[locale]/seasons/page.tsx` (dashboard app's own route, distinct from `apps/web`'s)

**Interfaces:**
- Consumes: `fetchSeasons` (Task 12), `AdminSeason` (Task 12).
- Produces: the list screen from `dash-01-seasons-list.png` — column for season (name + range), status (`publicationState` + `isCurrent` badge), content summary, actions (edit, delete disabled when content-linked per the 409 the API returns, "make current" with a confirm dialog).

- [ ] **Step 1: Write a component test** asserting: the current season's row shows the "الموسم الحالي" badge; "اجعله الموسم الحالي" is hidden on the row that already holds it; clicking it on another row opens a confirm dialog before calling `setSeasonCurrent`.

- [ ] **Step 2: Implement**, following `apps/dashboard/src/components/admin/albums/albums-table.tsx` and `apps/dashboard/src/components/admin/albums/inline-confirm.tsx` for the confirm-dialog pattern (reuse `inline-confirm.tsx`'s component directly rather than rebuilding a confirm affordance).

Run: `npx vitest run apps/dashboard/src/components/admin/seasons`

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/components/admin/seasons/seasons-table.tsx apps/dashboard/src/components/admin/seasons/season-row-parts.tsx apps/dashboard/src/app/[locale]/seasons/page.tsx
git commit -m "feat(dashboard): add seasons list screen"
```

---

### Task 14: Season form — sections 1–3 (identity, visuals, phases)

**Files:**
- Create: `apps/dashboard/src/components/admin/seasons/season-form.tsx`
- Create: `apps/dashboard/src/components/admin/seasons/season-identity-section.tsx`
- Create: `apps/dashboard/src/components/admin/seasons/season-visuals-section.tsx`
- Create: `apps/dashboard/src/components/admin/seasons/season-phases-section.tsx`

**Interfaces:**
- Produces: the first three of the seven `dash-02-season-form.png` sections. `season-phases-section.tsx` renders the phase editor (add/remove row; each row: name, type select from `SEASON_PHASE_TYPES`, from/to dates) and calls a client-side range check before allowing submit (mirrors, does not replace, the server-side overlap check from Task 5).

- [ ] **Step 1: Write a form test** for the phases section: adding a phase whose `to` precedes its `from` blocks submit with an inline error; a phase entirely outside `[startDate, endDate)` also blocks submit.

- [ ] **Step 2: Implement**, modeled on `apps/dashboard/src/components/admin/albums/album-basics-section.tsx` and `album-occasion-section.tsx` for form-section conventions (react-hook-form usage, bilingual field pattern via `apps/dashboard/src/components/admin/bilingual-field.tsx`).

Run: `npx vitest run apps/dashboard/src/components/admin/seasons/season-form.tsx apps/dashboard/src/components/admin/seasons/season-phases-section.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/components/admin/seasons/season-form.tsx apps/dashboard/src/components/admin/seasons/season-identity-section.tsx apps/dashboard/src/components/admin/seasons/season-visuals-section.tsx apps/dashboard/src/components/admin/seasons/season-phases-section.tsx
git commit -m "feat(dashboard): add season form identity, visuals and phases sections"
```

---

### Task 15: Season form — sections 4–7 (key dates, about, documents/sponsor, SEO)

**Files:**
- Create: `apps/dashboard/src/components/admin/seasons/season-key-dates-section.tsx`
- Create: `apps/dashboard/src/components/admin/seasons/season-about-section.tsx`
- Create: `apps/dashboard/src/components/admin/seasons/season-documents-section.tsx`
- Create: `apps/dashboard/src/components/admin/seasons/season-seo-section.tsx`

**Interfaces:**
- Consumes: existing document-picker and sponsor-picker components — search `apps/dashboard/src/components/admin` for the existing document attachment UI (used by `governance-documents` or similar) and the existing sponsor-relations picker (`apps/dashboard/src/components/admin/sponsor-relations/`) before building new ones; this section links to `sponsorships` records, it does not store a sponsor field on `Season` (spec §6.2, section 6's note).

- [ ] **Step 1: Write tests** for: `season-documents-section.tsx` renders `calendarDocumentId` and `documentIds[]` using the shared document picker; `season-seo-section.tsx` shows a character counter and search-result preview, matching whatever existing `*Page` SEO section component already does this (reuse it if one is shared already — check before writing a new one, since `PageSeo` is a shared schema specifically to avoid a fourth hand-rolled SEO form).

- [ ] **Step 2: Implement.**

Run: `npx vitest run apps/dashboard/src/components/admin/seasons`

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/components/admin/seasons/season-key-dates-section.tsx apps/dashboard/src/components/admin/seasons/season-about-section.tsx apps/dashboard/src/components/admin/seasons/season-documents-section.tsx apps/dashboard/src/components/admin/seasons/season-seo-section.tsx
git commit -m "feat(dashboard): add season form key dates, about, documents and SEO sections"
```

---

### Task 16: Dashboard nav entry

**Files:**
- Modify: `apps/dashboard/src/lib/navigation.ts` (near line 320-323)

- [ ] **Step 1: Add the flat nav item**, next to `albums`/`videos`:

```ts
{ key: "seasons", href: "/seasons", requires: [{ resourceType: "seasons", action: "Read" }] },
```

- [ ] **Step 2: Add the `Nav.seasons` message key** to the dashboard's `messages/en.json`/`messages/ar.json` and the `NAV_ICON` map (`apps/dashboard/src/lib/icons/ui-icons.ts` or wherever `NAV_ICON` is declared — locate it before assuming the path).

- [ ] **Step 3: Run the existing nav test**, updated for the new entry:

Run: `npx vitest run apps/dashboard/src/lib/navigation.spec.ts apps/dashboard/src/components/shell/sidebar-nav.spec.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/lib/navigation.ts apps/dashboard/src/lib/navigation.spec.ts
git commit -m "feat(dashboard): add Seasons to the sidebar"
```

---

## Phase 4 — Public site (`apps/web`)

### Task 17: Season query composable (albums + videos live counts)

**Files:**
- Create: `apps/web/src/lib/seasons/season-stats.ts`

**Interfaces:**
- Produces: `fetchSeasonStats(slug)` returning `{ events: number | null, albums: number, videos: number }` for the hero stats row and archive card stats — `events` is always `null` until Project 3 ships (spec §4.1 point 2).

- [ ] **Step 1: Write a test** asserting `events` is always `null` and `albums`/`videos` come from the public album/video list endpoints filtered by this season's slug.

- [ ] **Step 2: Implement**, calling the existing `GET /albums/public?season=` and video equivalent (Phase 5 makes these resolve against real season records; this task can be written and tested against the current `seasonRange`-only behavior and will pick up the richer resolution automatically once Phase 5 lands, since the query parameter shape does not change).

Run: `npx vitest run apps/web/src/lib/seasons/season-stats.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/seasons/season-stats.ts apps/web/src/lib/seasons/season-stats.spec.ts
git commit -m "feat(web): add season stats query for the hero row and archive cards"
```

---

### Task 18: Season timeline component (phases + key dates)

**Files:**
- Create: `apps/web/src/components/pages/seasons/season-timeline.tsx`

**Interfaces:**
- Consumes: `Season.phases`, `Season.keyDates` (as returned by the public detail endpoint).
- Produces: `<SeasonTimeline phases={...} keyDates={...} startDate={...} endDate={...} />` — a 12-column month axis (per spec §4.1 point 3), each phase positioned by its `from`/`to` relative to `startDate`/`endDate`, a "today" marker when today falls inside the range, key dates plotted beneath.

- [ ] **Step 1: Write a unit test** for the pure positioning math (phase column span from date range → grid columns) independent of rendering — this is the part most likely to have off-by-one errors (a phase ending exactly on the season's `endDate` must still render inside the 12-column grid).

- [ ] **Step 2: Implement the positioning function**, then the component using it.

- [ ] **Step 3: Visual check**: render with the four phase types from the mockup and confirm no phase's column overflows the grid at any of the design system's registered breakpoints (Chapter 5).

Run: `npx vitest run apps/web/src/components/pages/seasons/season-timeline.spec.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/pages/seasons/season-timeline.tsx apps/web/src/components/pages/seasons/season-timeline.spec.ts
git commit -m "feat(web): add season phases timeline component"
```

---

### Task 19: `/seasons/[slug]` page

**Files:**
- Create: `apps/web/src/app/[locale]/seasons/[slug]/page.tsx`
- Create: `apps/web/src/components/pages/seasons/season-hero.tsx`
- Create: `apps/web/src/components/pages/seasons/season-events-section.tsx` (empty-state only, per spec §4.1 point 4)
- Create: `apps/web/src/components/pages/seasons/season-media-section.tsx`
- Create: `apps/web/src/components/pages/seasons/season-documents-sponsor.tsx`
- Create: `apps/web/src/components/pages/seasons/season-nav.tsx` (prev/next)

**Interfaces:**
- Consumes: `GET /seasons/public/:slug` (Task 6), `SeasonTimeline` (Task 18), existing album/video gallery grid components (reuse, do not rebuild), existing sponsor-strip reader filtered by `targetType: 'Season'`.
- Produces: the full page composite from spec §4.1, rendering `null` (not-found) the same way `AlbumDetailPageResponseDto`'s `null` composite is handled today.

- [ ] **Step 1: Write the page's data-fetch test** (or integration test) confirming a 404-equivalent render when the API returns `null`, and that `closingSummary` only renders when `endDate` has passed.

- [ ] **Step 2: Implement `season-hero.tsx`** — banner/logo/name/tagline/date range/current badge/phase badge, using the black-register hero pattern already used by `/about/governance/policies` (cite: `public-pages.ts:230`'s "the hero is the black register" comment) rather than inventing a new hero treatment.

- [ ] **Step 3: Implement `season-events-section.tsx`** as an empty state only — no event data source exists yet (Global Constraints; Project 3 fills this later by adding a data prop, not by this task guessing at Project 3's shape).

- [ ] **Step 4: Implement `season-media-section.tsx`**, reusing the existing album/video grid components with `season={slug}` passed as the filter (same components `/media/albums` and `/media/videos` already render — no new gallery UI).

- [ ] **Step 5: Implement `season-documents-sponsor.tsx`** and `season-nav.tsx`.

- [ ] **Step 6: Assemble `page.tsx`**, with `generateMetadata` building canonical/hreflang/OG from `season.seo` (Task 1's embedded `PageSeo`), following the pattern of any other dynamic detail page's `generateMetadata` (read `apps/web/src/app/[locale]/about/president/page.tsx` or the album detail page's metadata function for the exact helper names before writing this).

Run: `npx vitest run apps/web/src/app/[locale]/seasons`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/[locale]/seasons/[slug]/page.tsx apps/web/src/components/pages/seasons
git commit -m "feat(web): add the season detail page"
```

---

### Task 20: `/seasons` archive page

**Files:**
- Create: `apps/web/src/app/[locale]/seasons/page.tsx` (replaces the `PreparingPageScreen` body)
- Create: `apps/web/src/components/pages/seasons/seasons-archive-grid.tsx`
- Create: `apps/web/src/components/pages/seasons/season-year-search.tsx`

**Interfaces:**
- Consumes: `GET /seasons/public` (Task 6).
- Produces: the featured-current-season card + 3-column grid of past seasons + year search, per spec §4.2.

- [ ] **Step 1: Write `season-year-search.tsx`'s digit-normalization test first** — Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) typed into the search field must match the same seasons a Latin-digit query would, since the archive stores/searches years as Latin numerals (spec §10).

```ts
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const toLatinDigits = (value: string): string =>
  value.replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)));
```

- [ ] **Step 2: Implement `season-year-search.tsx`** using `toLatinDigits` before filtering.

- [ ] **Step 3: Implement `seasons-archive-grid.tsx`**, matching `SeasonsArchive.dc.html`'s layout (current-season feature card in the black/green identity register, then a 3-column grid) — per spec §5.3, every past-season card uses the **same** neutral/black surface token, not a rotating per-index color.

- [ ] **Step 4: Assemble `page.tsx`**, with a static i18n heading/description (spec §4.2 — no `seasonsPage` collection in this plan) and `generateMetadata` using `isIndexable`-style logic matching the other `PUBLIC_PAGES` entries once Task 22 registers it.

Run: `npx vitest run apps/web/src/app/[locale]/seasons/page.spec.tsx apps/web/src/components/pages/seasons/season-year-search.spec.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/seasons/page.tsx apps/web/src/components/pages/seasons/seasons-archive-grid.tsx apps/web/src/components/pages/seasons/season-year-search.tsx
git commit -m "feat(web): add the seasons archive page"
```

---

### Task 21: `/seasons/current` becomes a real redirect

**Files:**
- Modify: `apps/web/src/app/[locale]/seasons/current/page.tsx` (full rewrite of the body; keep the file)

**Interfaces:**
- Consumes: `GET /seasons/public/current` (Task 6).

- [ ] **Step 1: Write the page**

```tsx
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { fetchCurrentSeasonSlug } from "@/lib/seasons/current-season";

const CurrentSeasonPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const slug = await fetchCurrentSeasonSlug();
  redirect(slug ? `/${locale}/seasons/${slug}` : `/${locale}/seasons`);
};

export default CurrentSeasonPage;
```

(Confirm the exact locale-prefixing convention other redirecting pages in this app use, if any exist, before assuming the plain `${locale}` interpolation above is correct — `next-intl`'s `redirect` re-export from `@/i18n/navigation` may be the required call instead of the bare `next/navigation` one, precisely so the locale prefix is handled consistently. Check `apps/web/src/i18n/navigation.ts` for a `redirect` export before writing this file for real.)

- [ ] **Step 2: Write `fetchCurrentSeasonSlug`** in `apps/web/src/lib/seasons/current-season.ts`, returning `null` on any API failure (never throwing — a redirect page must not 500).

- [ ] **Step 3: Write an integration test** asserting a 302/307 (Next's `redirect()` status) to `/seasons` when no season is current, and to `/seasons/<slug>` when one is.

- [ ] **Step 4: Run `internal-links-contract.spec.ts` specifically**, to confirm this rewrite (still a `page.tsx`) keeps it green:

Run: `npx vitest run apps/web/src/lib/pages/internal-links-contract.spec.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/seasons/current/page.tsx apps/web/src/lib/seasons/current-season.ts
git commit -m "feat(web): turn /seasons/current into a redirect to the current season"
```

---

### Task 22: Move `seasons` from `PREPARING_PAGES` to `PUBLIC_PAGES`

**Files:**
- Modify: `apps/web/src/lib/pages/public-pages.ts:386-392` (remove the `seasons` entry from `PREPARING_PAGES`)
- Modify: `apps/web/src/lib/pages/public-pages.ts` (add a `seasons` entry to `PUBLIC_PAGES`)
- Modify: `apps/web/src/lib/pages/public-pages.ts:393-399` (`current-season` entry's `registerBasis` — update its text to state it is a permanent redirect, not deferred content; it stays in `PREPARING_PAGES`, per Global Constraints)

- [ ] **Step 1: Add the `PUBLIC_PAGES` entry**, following the `albums` entry's shape:

```ts
{
  key: "seasons",
  route: "/seasons",
  apiPath: "/seasons-page", // or the real listing path Task 6 exposes — reconcile the exact apiPath convention against how `albums`'s "/albums-page" vs "/albums/public" split is used, since `listEndpoint` (below) is the one actually read for content-threshold indexability
  messageKey: "seasons",
  register: "neutral",
  registerBasis: "Same pattern as the other media/collection listing pages (§3.34.2 Media Centre row) — neutral ground, black hero on the detail pages beneath it.",
  schemaType: "CollectionPage",
  listEndpoint: "/seasons/public",
},
```

- [ ] **Step 2: Remove the `seasons` object from `PREPARING_PAGES`**, leave `athletics`, `national-teams`, `events`, `current-season`, and everything else untouched.

- [ ] **Step 3: Run the existing page-registration guard tests**

Run: `npx vitest run apps/web/src/lib/pages/page-message-keys.spec.ts apps/web/src/lib/pages/activation-seo.spec.ts apps/web/src/lib/design-system/seo-contract.spec.ts`

- [ ] **Step 4: Confirm the sitemap picks it up** — `apps/web/src/app/sitemap.ts` reads `PUBLIC_PAGES` directly (line 32), so no sitemap code changes; run its test if one exists, or a manual `curl localhost:3000/sitemap.xml` check once the dev server for `apps/web` is running (per this project's server-hygiene notes: confirm no orphaned Next process is already bound to the port first).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/pages/public-pages.ts
git commit -m "feat(web): promote /seasons from preparing to a live public page"
```

---

## Phase 5 — Wiring

### Task 23: Season-aware resolution in the album/video public filters

**Files:**
- Modify: `api/src/modules/media-center/albums/albums.service.ts` (call site only — not `albums.public-filter.ts` itself)
- Modify: `api/src/modules/media-center/videos/videos.service.ts` (call site only — not `videos.public-filter.ts` itself)
- Create: `api/src/modules/media-center/seasons/season-range-resolver.ts`
- Modify: `api/src/modules/media-center/albums/albums.public-filter.ts` (accept a resolved range instead of calling `seasonRange` itself)
- Modify: `api/src/modules/media-center/videos/videos.public-filter.ts` (same)

**Interfaces:**
- Consumes: `SeasonsRepository` (Task 4), `seasonRange` (existing, unchanged, `videos/season.ts`).
- Produces: `resolveSeasonRange(seasonsRepository, label): Promise<{ from: Date; to: Date } | null>`.

- [ ] **Step 1: Write the failing resolver spec** — a label matching a real season's `slug` (after `–` → `-` conversion) resolves to that season's stored `startDate`/`endDate`; a label matching no season falls back to `seasonRange(label)`'s answer exactly; a malformed label resolves to `null` exactly as `seasonRange` does today.

```ts
export const resolveSeasonRange = async (
  seasons: SeasonsRepository,
  label: string | undefined,
): Promise<{ from: Date; to: Date } | null> => {
  if (!label) return null;
  const slug = label.replace('–', '-'); // en dash → hyphen
  const stored = await seasons.findBySlug(slug);
  if (stored) return { from: stored.startDate, to: stored.endDate };
  return seasonRange(label);
};
```

- [ ] **Step 2: Add an optional `resolvedSeasonRange` field to `AlbumFilterQuery`/`PublicVideoQuery`**, and change the one `seasonRange(query.season)` call inside each pure builder to prefer it when present:

```ts
// albums.public-filter.ts, replacing the current season block
const season = query.resolvedSeasonRange ?? (query.season ? seasonRange(query.season) : null);
```

(This keeps `buildAlbumFilter`/`buildPublicVideoFilter` pure and their existing unit tests — `albums.public-filter.spec.ts`, and the videos equivalent — untouched and still valid, since calling them with `resolvedSeasonRange: undefined` reproduces today's exact behavior.)

- [ ] **Step 3: Call `resolveSeasonRange` once in each service**, before building the filter, and pass its result through as `resolvedSeasonRange`.

- [ ] **Step 4: Write an integration test** proving `?season=2025–2026` still returns the same albums after a real `2025-2026` `Season` record is created with matching dates, and continues to work identically before that record exists.

Run: `npx jest api/src/modules/media-center/albums api/src/modules/media-center/videos api/src/modules/media-center/seasons --runInBand`

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/media-center/seasons/season-range-resolver.ts api/src/modules/media-center/albums/albums.public-filter.ts api/src/modules/media-center/albums/albums.service.ts api/src/modules/media-center/videos/videos.public-filter.ts api/src/modules/media-center/videos/videos.service.ts
git commit -m "feat(seasons): resolve season query params against real season records, falling back to derived ranges"
```

---

### Task 24: Header season picker

**Files:**
- Modify: whichever file implements `getHeaderFeatures(locale)` (per `docs/design-specs/header/2026-09-28-header-redesign-plan.md` — locate the actual file before editing; the header plan describes its contract but this plan does not re-derive its file path without reading it first)
- Modify: the header mega-menu panel component that renders the "الفعاليات والمواسم" panel's middle column (currently a static "تصفّح أرشيف المواسم" link, per the header plan §3.4's note: "في هذا المشروع يُعرض مكان «انتقل إلى موسم» كرابط بسيط... يُبنى في المشروع 2")

**Interfaces:**
- Consumes: `SeasonsService.listOrdered()` (Task 5), capped to 3.
- Produces: `getHeaderFeatures`'s return type gains `recentSeasons: { slug: string; shortName: string; isCurrent: boolean }[]` (empty array on failure — same `Promise.allSettled`/independent-field-failure contract every other field already follows).

- [ ] **Step 1: Write the failing test** — a failing `SeasonsService` call yields `recentSeasons: []` and does not throw or null out any other field of `getHeaderFeatures`'s result (matching the existing test pattern for `presidentExcerpt`/etc. failing independently).

- [ ] **Step 2: Implement the field.**

- [ ] **Step 3: Replace the static "تصفّح أرشيف المواسم" link** with the last-3-seasons list plus a year-search input reusing `toLatinDigits` (Task 20) client-side, filtering the 3 (or, once typed, fetching a fuller match from `/seasons/public?q=`).

- [ ] **Step 4: Confirm the panel still renders correctly with `recentSeasons: []`** (the fallback state — panel shows only the static "أرشيف المواسم" link, matching the header plan's fallback-table convention for every other panel field).

Run: whichever header test file exercises `getHeaderFeatures` fallbacks — locate and run it.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): wire the header's season picker to real season records"
```

---

## Phase 6 — Switch to live + regression

### Task 25: Full regression pass

**Files:** none created — verification only.

- [ ] **Step 1:** `npx jest api --runInBand` — full API suite green, specifically re-confirming `media-reference-coverage.spec.ts`, `permission-catalogue.spec.ts`, `capability-map.spec.ts`.
- [ ] **Step 2:** `npx vitest run` in `apps/web` — specifically `internal-links-contract.spec.ts`, `page-message-keys.spec.ts`, `activation-seo.spec.ts`, the new season specs.
- [ ] **Step 3:** `npx vitest run` in `apps/dashboard` — specifically `navigation.spec.ts`, `resource-domains.spec.ts`, `sidebar-nav.spec.tsx`.
- [ ] **Step 4:** `npx tsc --noEmit` in each of `api/`, `apps/web/`, `apps/dashboard/` (ts-jest's `isolatedModules` does not type-check — this project's own standing note — so this step is not optional).
- [ ] **Step 5:** Manual pass: open `/seasons`, `/seasons/[a real slug]`, `/seasons/current` (confirm the 302), and the header's season picker, in a real browser, both locales, at the registered breakpoints.
- [ ] No commit — this task is a gate, not a change.

### Task 26: ADR + documentation sync

**Files:**
- Create: `docs/design-system/ADR-0123-Seasons-Collection-And-Public-Pages.md` (next available ADR number — confirm the actual next number against `docs/design-system/00-MASTER-INDEX.md` before naming the file, since other work may have taken 0122 or later in the meantime)
- Modify: `docs/product/01-Information-Architecture.md` (§12, recording `/seasons`, `/seasons/[slug]`, `/seasons/current` as built, per this project's own documentation-sync policy)
- Modify: `docs/engineering/guard-tests.md` (new guard tests added in this plan: the season schema index specs, the coverage-guard re-run)
- Modify: `docs/design-specs/decision-log.md` (the decisions this plan made in the appendix's absence: no `WORKFLOW_ENTITY_TYPES` entry, no `seasonsPage`, uniform archive-card color, `season.ts` fallback-only role confirmed)

- [ ] **Step 1–4:** One file at a time, each a documentation-only diff. No tests apply; this task's acceptance is a human review of accuracy against what Phases 1–5 actually built (not what was planned — re-read the merged code, not this plan, when writing the ADR).

- [ ] **Step 5: Commit**

```bash
git commit -m "docs(seasons): add ADR-0123 and sync IA/guard-tests/decision-log docs"
```

---

## Self-Review Notes (per writing-plans skill)

**Spec coverage:** §3 (schema/indexes) → Task 1; §3.3 (no `WORKFLOW_ENTITY_TYPES`) → reconciliation §5 + Task 1's comment; §4.1–4.4 (site pages) → Tasks 17-22; §5 (header) → Task 24; §6 (dashboard) → Tasks 11-16; §7 (set-current) → Tasks 4, 6, 13; §8.1 (filter backward-compat) → Task 23; §8.2 (championships card stays hidden) → Global Constraints, no task touches it; §8.3 (search source) → Task 26; §9 (RBAC + sponsorships + media-reference coverage) → Tasks 8-10, 2; §10 (i18n/digits) → Task 20's `toLatinDigits`; §11 (tests) → distributed across each task's own spec plus Task 25; §12 (out of scope) → no task touches `SeasonThemeDemo`, `seasonsPage`, or archive-card per-season coloring.

**Task count:** 26 tasks (Phase 1: 7, Phase 2: 3, Phase 3: 6, Phase 4: 6, Phase 5: 2, Phase 6: 2).

**Estimate:** ~4.5–5 engineering days total — Phase 1 ~1.5 days, Phase 2 ~0.5 day, Phase 3 ~1.5 days, Phase 4 ~1.5 days, Phase 5 ~0.5 day, Phase 6 ~0.5 day (overlapping slightly with the phases before it in practice, since regression checks run continuously) — consistent with the design spec's own §13 estimate.

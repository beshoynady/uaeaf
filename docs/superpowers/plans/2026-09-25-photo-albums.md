# Photo Albums Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editors create, fill, order and publish photo albums today — with no category and no linked entity — while the schema is already shaped for seasons, championships, competitions, public events and players to plug in later without a schema change.

**Architecture:** The `albums` and `mediaAssets` collections already exist (ADR-0054, ADR-0055) and are kept. `contentCategoryId` is removed — the one authorised non-additive change. Entity linking becomes one optional `event: {entityType, entityId}` plus `playerIds[]`, with `seasonId`/`championshipId` denormalised at save time by walking a **config map** (`LINKABLE_ENTITIES`) that is empty today, so the API rejects every link until a module registers itself. The public list gains filters and a `facets` endpoint whose empty answers make the entity filters hide themselves in the UI.

**Tech Stack:** NestJS 11 + Mongoose (ESM, `.js` import specifiers), Jest (`--runInBand`), Next.js 16 App Router + next-intl, `@uaeaf/brand-ui`, `@uaeaf/design-tokens`, Vitest.

**Spec:** The Product Owner decisions of 2026-09-25 (D1–D6) in the session transcript, plus the original Photo Albums brief and its Appendix A. Binding design reference: `docs/design-specs/albums/albums-main.png`, `albums-mobile-1.png`, `albums-mobile-2.png` (canvas v14).

## Global Constraints

- **Git is read-only.** Only `status`, `diff`, `log`, `show`, `ls-files`. **No task ends in a commit** — the standard TDD commit step is replaced by "record the file list for the owner". The owner commits. (CLAUDE.md §33.)
- **No new dependency.** Not one, in any workspace.
- **No hand-written hex or rgba** in any new file. `identity-palette-contract.spec.ts` walks every `.tsx` under `apps/web/src` and `packages/brand-ui` automatically — a new file is covered without being listed, and **no exemption may be added**.
- **New guards must pass:** `surface-paint-contract.spec.ts`, `locale-aware-link-contract.spec.ts` (Phase H), plus `token-contract`, `identity-palette-contract`, `surface-adjacency-contract`, `motion-contract`, `motion-budget`.
- **Schema changes are additive**, except removing `Album.contentCategoryId` (D1-1, explicitly approved).
- **TDD is mandatory on the backend.** Red test first, always.
- **Run only the affected files' tests**, never the full suite. API: `npm test -- --runInBand --testPathPatterns="<pattern>"`. `npx jest` alone runs zero tests (ESM).
- **`mediaAssets.albumId` stays nullable.** Protected.
- **Seed scripts never touch a non-local database.** Reuse `assertSafeDevTarget` from `api/src/bootstrap/dev-database.ts`; do not write a second guard.
- **Arrow functions** for every new function; convert functions in touched files, except class/decorated methods, dynamic `this`, generators, overloads, `arguments`, and hoisted-before-definition. (CLAUDE.md §30.)
- **Comments explain WHY, in English**, and describe current state — never history.
- **Every admin route carries `:id`** so `audit-log.interceptor.ts` records it (it reads `params.id ?? body._id ?? body.id`).
- **`select` is not in the kit.** Use each app's shared select, or a native `<select>` styled with kit tokens. **Never add a select to `packages/brand-ui`.**
- Token build output already exists at `packages/design-tokens/build/css/`; `build.mjs` need not be run.

## Review Focus

Five things the spec implies, that no task's happy path exercises, ordered by how likely they are to bite a real editor or visitor. Each has a test pinned to the task that owns the code.

1. **An album whose `event` names a type absent from `LINKABLE_ENTITIES` must be refused, not silently stored.** The map is empty today, so *every* link is this case. Pinned to Task 1, Step 9.
2. **`GET /albums/facets` on an empty database must return empty arrays, not `null` and not a 500.** This is the live condition on day one, and the whole filter bar's visibility depends on it. Pinned to Task 2, Step 11.
3. **A `from`/`to` range where `from > to` must return an empty list, not every album.** A hand-edited URL is an ordinary event on a public page. Pinned to Task 2, Step 7.
4. **Deleting the cover photo must promote the first remaining photo and keep `assetCount` correct** — otherwise a published album renders a broken hero. Pinned to Task 3, Step 13.
5. **`seed:albums:dev` pointed at `mongodb+srv://` must refuse before writing anything.** Pinned to Task 4, Step 3.

---

## File Structure

**Task 1 — schema**
- Modify `api/src/modules/media-center/albums/schemas/album.schema.ts` — remove `contentCategoryId`; add `event`, `seasonId`, `championshipId`, `playerIds`, `eventDate`, `location`, `isFeatured`; add five indexes.
- Create `api/src/modules/media-center/albums/schemas/album-event.schema.ts` — the `{entityType, entityId}` embed.
- Create `api/src/modules/media-center/albums/linkable-entities.ts` — the config map, empty, plus its types.
- Create `api/src/modules/media-center/albums/album-ancestry.ts` — pure ancestor walk, testable without a database.
- Modify `api/src/modules/media-center/albums/dto/create-album.dto.ts`, `albums.service.ts`, `albums.service.spec.ts`.
- Create `api/src/modules/media-center/albums/linkable-entities.spec.ts`, `album-ancestry.spec.ts`.

**Task 2 — public API**
- Create `api/src/modules/media-center/albums/albums.public-filter.ts` + spec — pure filter builder, mirroring `videos.public-filter.ts`.
- Create `api/src/modules/media-center/albums/dto/album-list-query.dto.ts`, `dto/album-facets-response.dto.ts`.
- Modify `albums.repository.ts` (list with preview photos, facets aggregation), `albums.service.ts`, `albums.controller.ts`.

**Task 3 — admin API + section**
- Modify `api/src/common/constants/permission-catalogue.ts` (add `albums:Update`).
- Modify `albums.controller.ts`, `albums.service.ts`, `albums.repository.ts` — update, photo order, cover, featured.
- Create `api/src/bootstrap/seed-photo-gallery-section.ts` + spec; modify `api/src/bootstrap-admin.ts`.

**Task 4 — dev seed**
- Create `api/src/bootstrap/seed-albums-dev.ts` + spec, `api/src/seed-albums-dev.ts`, `api/src/seed-albums-dev-clean.ts`; modify `api/package.json` scripts.

**Task 5 — ambient motion**
- Modify `docs/design-system/ADR-0099-Media-Showcase-Motion.md` → retitle and rescope.
- Create `apps/web/src/lib/motion/use-ambient-motion.ts` + spec.
- Create `apps/web/src/lib/design-system/ambient-motion-contract.spec.ts`.

**Task 6 — UI, three parallel agents.** File ownership table at the end.

---

### Task 1: Album schema — remove the category, add the link model

**Files:**
- Modify: `api/src/modules/media-center/albums/schemas/album.schema.ts`
- Create: `api/src/modules/media-center/albums/schemas/album-event.schema.ts`
- Create: `api/src/modules/media-center/albums/linkable-entities.ts`
- Create: `api/src/modules/media-center/albums/album-ancestry.ts`
- Modify: `api/src/modules/media-center/albums/dto/create-album.dto.ts`
- Modify: `api/src/modules/media-center/albums/albums.service.ts`
- Test: `api/src/modules/media-center/albums/linkable-entities.spec.ts`, `album-ancestry.spec.ts`, `albums.service.spec.ts`

**Interfaces:**
- Produces: `ALBUM_EVENT_TYPES` (readonly tuple), `AlbumEventType`, `AlbumEvent` class + `AlbumEventSchema`; `LINKABLE_ENTITIES: Partial<Record<AlbumEventType, LinkableEntity>>` (empty today — `Partial`, because a full `Record` would require all four keys to exist), `LinkableEntity = { modelName: string; parentField: string | null; parentType: AlbumEventType | null }`, `isLinkable(type: string): boolean`; `resolveAncestry(event: AlbumEventRef | null, deps: AncestryDeps): Promise<Ancestry>` where `Ancestry = { seasonId: Types.ObjectId | null; championshipId: Types.ObjectId | null }`.
- Consumes: `BaseSchema`, `LocalizedTextSchema` from `api/src/common/schemas/`.

- [ ] **Step 1: Write the failing test for the empty link map**

Create `api/src/modules/media-center/albums/linkable-entities.spec.ts`:

```ts
import { LINKABLE_ENTITIES, isLinkable } from './linkable-entities.js';

describe('LINKABLE_ENTITIES', () => {
  it('is empty, because no linkable module is built yet', () => {
    expect(Object.keys(LINKABLE_ENTITIES)).toEqual([]);
  });

  it('refuses every event type while the map is empty', () => {
    for (const type of ['seasons', 'championships', 'sportsEvents', 'publicEvents']) {
      expect(isLinkable(type)).toBe(false);
    }
  });

  it('refuses a type that is not an album event type at all', () => {
    expect(isLinkable('articles')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd api && npm test -- --runInBand --testPathPatterns="linkable-entities"`
Expected: FAIL — `Cannot find module './linkable-entities.js'`.

- [ ] **Step 3: Write the map**

Create `api/src/modules/media-center/albums/linkable-entities.ts`:

```ts
/**
 * The event types an album may be linked to, and how to walk from one up to
 * its season.
 *
 * `ALBUM_EVENT_TYPES` is the vocabulary; `LINKABLE_ENTITIES` is what is
 * actually connectable today, and it is deliberately empty. None of the four
 * collections is built, so a link to any of them could be neither resolved
 * nor verified — storing one would be storing an id nothing can check.
 *
 * To connect a module once it exists, add one entry naming its Mongoose model
 * and the field on it that points at its parent. Nothing else changes: the
 * schema already holds the shape, the service already walks the chain, and
 * the filters already query it.
 *
 * `parentField`/`parentType` are per-entry on purpose rather than a hardcoded
 * chain. The documented hierarchy disagrees with itself in one place —
 * `publicEvents` carries `championshipId` per
 * `docs/product/08-Workflow-Scenario-Review.md:596`, not the `seasonId` a
 * "public event belongs to a season" reading would imply — and a chain
 * written into code would have to pick one reading before the owner has.
 */
export const ALBUM_EVENT_TYPES = ['seasons', 'championships', 'sportsEvents', 'publicEvents'] as const;
export type AlbumEventType = (typeof ALBUM_EVENT_TYPES)[number];

export interface LinkableEntity {
  /** The Mongoose model name, for resolving the document at save time. */
  modelName: string;
  /** The field on that document pointing at its parent — `null` at the root. */
  parentField: string | null;
  /** What that parent is, so the walk knows which entry to read next. */
  parentType: AlbumEventType | null;
}

export const LINKABLE_ENTITIES: Partial<Record<AlbumEventType, LinkableEntity>> = {};

/** Whether a link to this type can be stored at all. A type in the vocabulary
 *  but absent from the map is refused: the vocabulary says what an album could
 *  point at one day, the map says what exists now. */
export const isLinkable = (type: string): boolean =>
  Object.prototype.hasOwnProperty.call(LINKABLE_ENTITIES, type);
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd api && npm test -- --runInBand --testPathPatterns="linkable-entities"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing ancestry test**

Create `api/src/modules/media-center/albums/album-ancestry.spec.ts`. The walk is tested with a stub map, because the real one is empty and will be for some time:

```ts
import { Types } from 'mongoose';
import { resolveAncestry } from './album-ancestry.js';
import type { LinkableEntity, AlbumEventType } from './linkable-entities.js';

describe('resolveAncestry', () => {
  const seasonId = new Types.ObjectId();
  const championshipId = new Types.ObjectId();
  const sportsEventId = new Types.ObjectId();

  // A championship under a season, and a competition under that championship.
  const map: Partial<Record<AlbumEventType, LinkableEntity>> = {
    seasons: { modelName: 'Season', parentField: null, parentType: null },
    championships: { modelName: 'Championship', parentField: 'seasonId', parentType: 'seasons' },
    sportsEvents: { modelName: 'SportsEvent', parentField: 'championshipId', parentType: 'championships' },
  };

  const documents: Record<string, Record<string, unknown>> = {
    [championshipId.toString()]: { _id: championshipId, seasonId },
    [sportsEventId.toString()]: { _id: sportsEventId, championshipId },
  };

  const load = async (_modelName: string, id: Types.ObjectId) => documents[id.toString()] ?? null;

  it('returns both ancestors for a competition two levels down', async () => {
    const result = await resolveAncestry({ entityType: 'sportsEvents', entityId: sportsEventId }, { map, load });
    expect(result.championshipId?.toString()).toBe(championshipId.toString());
    expect(result.seasonId?.toString()).toBe(seasonId.toString());
  });

  it('returns only the season for a championship one level down', async () => {
    const result = await resolveAncestry({ entityType: 'championships', entityId: championshipId }, { map, load });
    expect(result.championshipId).toBeNull();
    expect(result.seasonId?.toString()).toBe(seasonId.toString());
  });

  it('returns nothing for a season, which is the root', async () => {
    const result = await resolveAncestry({ entityType: 'seasons', entityId: seasonId }, { map, load });
    expect(result).toEqual({ seasonId, championshipId: null });
  });

  it('returns nulls when the event is null', async () => {
    const result = await resolveAncestry(null, { map, load });
    expect(result).toEqual({ seasonId: null, championshipId: null });
  });

  it('stops at a missing parent document rather than throwing', async () => {
    const orphan = new Types.ObjectId();
    const result = await resolveAncestry({ entityType: 'championships', entityId: orphan }, { map, load });
    expect(result).toEqual({ seasonId: null, championshipId: null });
  });
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `cd api && npm test -- --runInBand --testPathPatterns="album-ancestry"`
Expected: FAIL — module not found.

- [ ] **Step 7: Write the ancestry walk**

Create `api/src/modules/media-center/albums/album-ancestry.ts`:

```ts
import { Types } from 'mongoose';
import { LINKABLE_ENTITIES, type AlbumEventType, type LinkableEntity } from './linkable-entities.js';

export interface AlbumEventRef {
  entityType: AlbumEventType;
  entityId: Types.ObjectId;
}

export interface Ancestry {
  seasonId: Types.ObjectId | null;
  championshipId: Types.ObjectId | null;
}

/** Loads one document by model name and id, or `null`. Injected so the walk
 *  is testable without a database and without the four models existing. */
export type LoadEntity = (modelName: string, id: Types.ObjectId) => Promise<Record<string, unknown> | null>;

/** Four types in the vocabulary, so four hops is already longer than any real
 *  chain — and a cycle in a misconfigured map cannot hang a save the editor is
 *  waiting on. Declared above its use: a `const` is not hoisted. */
const ALBUM_EVENT_HOP_LIMIT = 4;

export interface AncestryDeps {
  map?: Partial<Record<AlbumEventType, LinkableEntity>>;
  load: LoadEntity;
}

/**
 * Walks from an album's event up to its season, recording the two ancestors
 * the filters query on.
 *
 * Denormalised rather than joined: "every album in this season" has to be one
 * indexed query, and a join would need the three intermediate collections to
 * exist, which is exactly what cannot be assumed.
 *
 * A missing parent document ends the walk instead of throwing. This runs
 * inside a save the editor is waiting on, and a dangling reference upstream is
 * not a reason to refuse their album — it is a reason to record what could be
 * resolved. The guard against a *wrong* link is `isLinkable`, at the DTO.
 */
export const resolveAncestry = async (
  event: AlbumEventRef | null,
  deps: AncestryDeps,
): Promise<Ancestry> => {
  const map = deps.map ?? LINKABLE_ENTITIES;
  const ancestry: Ancestry = { seasonId: null, championshipId: null };
  if (!event) return ancestry;

  let type: AlbumEventType | null = event.entityType;
  let id: Types.ObjectId | null = event.entityId;

  for (let hop = 0; hop < ALBUM_EVENT_HOP_LIMIT && type && id; hop += 1) {
    if (type === 'seasons') ancestry.seasonId = id;
    if (type === 'championships') ancestry.championshipId = id;

    const entry = map[type];
    if (!entry?.parentField || !entry.parentType) break;

    const document = await deps.load(entry.modelName, id);
    const parent = document?.[entry.parentField];
    if (!(parent instanceof Types.ObjectId)) break;

    type = entry.parentType;
    id = parent;
  }

  // The album's own event is not its own ancestor: a championship album has a
  // season above it, not itself as "the championship".
  if (event.entityType === 'championships') ancestry.championshipId = null;
  if (event.entityType === 'seasons') ancestry.seasonId = event.entityId;

  return ancestry;
};

```

> **Note for the implementer:** the last two lines before `return` encode a decision the tests pin: for a championship album, `championshipId` is left `null` because `event.entityId` already says which championship it is, and duplicating it would make the "albums of this championship" query match twice. Task 2's filter handles that by matching `championshipId` **or** `event.entityId` — which is also what makes a championship's filter return its competitions' albums.

- [ ] **Step 8: Run it and watch it pass**

Run: `cd api && npm test -- --runInBand --testPathPatterns="album-ancestry"`
Expected: PASS, 5 tests.

- [ ] **Step 9: Write the failing DTO-refusal test (Review Focus #1)**

Append to `api/src/modules/media-center/albums/albums.service.spec.ts`:

```ts
describe('event linking', () => {
  it('refuses an event whose type is not registered in LINKABLE_ENTITIES', async () => {
    const repository = makeRepository();
    const service = new AlbumsService(repository, makeMediaAssetsService(), makeAncestryLoader());

    await expect(
      service.create({
        ...baseDto,
        event: { entityType: 'championships', entityId: new Types.ObjectId().toString() },
      }),
    ).rejects.toThrow(/not available yet/i);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses playerIds while players are not linkable', async () => {
    const repository = makeRepository();
    const service = new AlbumsService(repository, makeMediaAssetsService(), makeAncestryLoader());

    await expect(
      service.create({ ...baseDto, playerIds: [new Types.ObjectId().toString()] }),
    ).rejects.toThrow(/not available yet/i);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('stores a null event and an empty playerIds without consulting the map', async () => {
    const repository = makeRepository();
    repository.create.mockResolvedValue({} as never);
    const service = new AlbumsService(repository, makeMediaAssetsService(), makeAncestryLoader());

    await service.create(baseDto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: null, playerIds: [], seasonId: null, championshipId: null }),
    );
  });
});
```

Also update `baseDto` at the top of the file: **delete the `contentCategoryId` line**, and add `makeAncestryLoader = () => ({ load: jest.fn() })`.

- [ ] **Step 10: Run it and watch it fail**

Run: `cd api && npm test -- --runInBand --testPathPatterns="albums.service.spec"`
Expected: FAIL — the service does not accept `event`, and the old tests still send `contentCategoryId`.

- [ ] **Step 11: Change the schema**

In `api/src/modules/media-center/albums/schemas/album.schema.ts`:

1. **Delete** the `contentCategoryId` prop and its doc comment, and delete the `AlbumSchema.index({ contentCategoryId: 1, publicationState: 1 })` line.
2. Update the class doc comment: replace the `contentCategoryId` sentence with:
   `contentCategoryId was removed 2026-09-25 (Product Owner decision D1-1): it pointed at a contentCategories collection that was never built, so it could be neither resolved nor filtered — the same reason videos dropped it on 2026-09-23. No enum replaces it: the design filters by linked entity and period, and the category chips were removed from the canvas in v14.`
3. Add, after `associations`:

```ts
  /** The one event this album documents, or `null`. One, not many: an album
   *  is the record of a single occasion, and the filters ask "which occasion",
   *  which has no answer when there are three. Broader grouping is what
   *  `associations[]` is for. */
  @Prop({ type: AlbumEventSchema, default: null })
  event: AlbumEvent | null;

  /** Denormalised ancestors of `event`, computed at save time by
   *  `resolveAncestry`. Stored so "every album in this season" is one indexed
   *  query rather than a join through collections that do not exist yet.
   *  [BACKLOG] A championship moved to a different season must trigger a
   *  recompute of every album beneath it — to be built with the championships
   *  module, since nothing can move today. */
  @Prop({ type: Types.ObjectId, default: null })
  seasonId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  championshipId: Types.ObjectId | null;

  /** Athletes appearing in this album. No `ref:` — the collection is not
   *  registered yet, matching the established poly-ref pattern here. */
  @Prop({ type: [Types.ObjectId], default: [] })
  playerIds: Types.ObjectId[];

  /** When the occasion happened, which is what the card and the period filter
   *  show — distinct from `publishedAt`, which is when the federation got
   *  round to posting it. */
  @Prop({ type: Date, default: null })
  eventDate: Date | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  location: LocalizedText | null;

  /** At most one album carries this at a time; `AlbumsService.setFeatured`
   *  clears the previous holder in the same operation. */
  @Prop({ type: Boolean, default: false })
  isFeatured: boolean;
```

4. Replace the removed index with these five:

```ts
// The public list's default ordering, and its period filter.
AlbumSchema.index({ publicationState: 1, eventDate: -1 });
AlbumSchema.index({ seasonId: 1 });
AlbumSchema.index({ championshipId: 1 });
AlbumSchema.index({ 'event.entityType': 1, 'event.entityId': 1 });
AlbumSchema.index({ playerIds: 1 });
// One featured album, found without a scan.
AlbumSchema.index({ isFeatured: 1, publicationState: 1 });
```

> `publicationState`, not `status`: D1-6 wrote `{ status, eventDate }`, but the field on this schema has been `publicationState` since ADR-0054 and `status` does not exist. Same index, real field name.

Create `api/src/modules/media-center/albums/schemas/album-event.schema.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ALBUM_EVENT_TYPES, type AlbumEventType } from '../linkable-entities.js';

/** The `event` embed on `albums`. Not a standalone collection: `_id: false`.
 *  `entityId` is a plain `ObjectId` with no `ref:` — none of the four target
 *  collections is registered, which is the same poly-ref pattern
 *  `ContentAssociation` already follows. */
@Schema({ _id: false })
export class AlbumEvent {
  @Prop({ type: String, enum: ALBUM_EVENT_TYPES, required: true })
  entityType: AlbumEventType;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;
}

export const AlbumEventSchema = SchemaFactory.createForClass(AlbumEvent);
```

- [ ] **Step 12: Change the DTO**

In `api/src/modules/media-center/albums/dto/create-album.dto.ts`: **delete** the `contentCategoryId` property and its decorators, and add:

```ts
  @ApiProperty({ required: false, nullable: true, description: 'The single event this album documents.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AlbumEventDto)
  event?: AlbumEventDto | null;

  @ApiProperty({ required: false, type: [String], description: 'Athlete ids appearing in this album.' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  playerIds?: string[];

  @ApiProperty({ required: false, description: 'When the occasion happened.' })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiProperty({ required: false, type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  location?: LocalizedTextDto;
```

Create `AlbumEventDto` in the same folder as `dto/album-event.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { ALBUM_EVENT_TYPES, type AlbumEventType } from '../linkable-entities.js';

export class AlbumEventDto {
  @ApiProperty({ enum: ALBUM_EVENT_TYPES })
  @IsIn(ALBUM_EVENT_TYPES)
  entityType: AlbumEventType;

  @ApiProperty()
  @IsMongoId()
  entityId: string;
}
```

- [ ] **Step 13: Change the service**

In `api/src/modules/media-center/albums/albums.service.ts`:

- Inject an ancestry loader. Add to the constructor: `private readonly ancestry: { load: LoadEntity }`. Register it in `albums.module.ts` as a provider whose `load` resolves a model from the Mongoose connection by name and returns `null` when the model is not registered — which is always, today:

```ts
/** Resolves a linked entity's document by model name. Every model it could be
 *  asked for is unregistered today, so it answers `null` and the walk stops —
 *  which is correct, not a failure: there is nothing to walk to. */
export const createAncestryLoader = (connection: Connection) => ({
  load: async (modelName: string, id: Types.ObjectId) => {
    const model = connection.models[modelName];
    if (!model) return null;
    return (await model.findById(id).lean().exec()) as Record<string, unknown> | null;
  },
});
```

- In `create()`, before the `try`, add the refusal and the walk:

```ts
    const event = this.assertLinkable(dto.event ?? null);
    if (dto.playerIds?.length && !isLinkable('players')) {
      throw new ConflictException(
        'Linking athletes is not available yet: the athletes module is not connected. Save the album without them.',
      );
    }
    const ancestry = await resolveAncestry(event, this.ancestry);
```

with:

```ts
  /** @throws ConflictException when the event's type is in the vocabulary but
   *  not connected yet — which is every type today. A stored link to a
   *  collection that does not exist is an id nothing can resolve, so it is
   *  refused at the edge rather than written and discovered later. */
  private assertLinkable(event: AlbumEventDto | null): AlbumEventRef | null {
    if (!event) return null;
    if (!isLinkable(event.entityType)) {
      throw new ConflictException(
        `Linking to ${event.entityType} is not available yet: that module is not connected. Save the album without an event.`,
      );
    }
    return { entityType: event.entityType, entityId: new Types.ObjectId(event.entityId) };
  }
```

- Remove `contentCategoryId` from the `repository.create` payload and add:

```ts
        event,
        seasonId: ancestry.seasonId,
        championshipId: ancestry.championshipId,
        playerIds: (dto.playerIds ?? []).map((id) => new Types.ObjectId(id)),
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        location: dto.location ?? null,
        isFeatured: false,
```

- In `toPublicResponse`, remove the `contentCategoryId` line and add `event`, `eventDate`, `location`, `isFeatured`. Update `AlbumPublicResponseDto` to match.

- [ ] **Step 14: Run the album tests and watch them pass**

Run: `cd api && npm test -- --runInBand --testPathPatterns="albums"`
Expected: PASS. The two integration specs (`albums.service.public.integration.spec.ts`, `albums.repository.spec.ts`) construct albums with `contentCategoryId` — remove that key from their fixtures as part of this step. If any other fixture in the repo sets it, `grep -rn "contentCategoryId" api/src` and clear them all; the field no longer exists.

- [ ] **Step 15: Type-check**

Run: `cd api && npx tsc --noEmit`
Expected: no errors. **Do not run `nest build`** — it deletes `dist/` and kills the running watch server.

- [ ] **Step 16: Record the files for the owner's commit**

List, do not run: `api/src/modules/media-center/albums/**`, `api/src/common/constants/` if touched. No git command.

---

### Task 2: Public list, filters and facets

**Files:**
- Create: `api/src/modules/media-center/albums/albums.public-filter.ts`, `albums.public-filter.spec.ts`
- Create: `api/src/modules/media-center/albums/dto/album-list-query.dto.ts`, `dto/album-facets-response.dto.ts`
- Modify: `api/src/modules/media-center/albums/albums.repository.ts`, `albums.service.ts`, `albums.controller.ts`

**Interfaces:**
- Consumes: `ALBUM_EVENT_TYPES` (Task 1).
- Produces: `buildAlbumFilter(query): FilterQuery<Album>`; `AlbumsRepository.findPublicPage(filter, page, limit)`, `AlbumsRepository.facets()`; routes `GET /albums/public`, `GET /albums/facets`, `GET /albums/public/featured`, `GET /albums/stats`.

- [ ] **Step 1: Write the failing filter test**

Create `albums.public-filter.spec.ts`. Cover: published-only always; each parameter present only when supplied; `championshipId` matching either field; a bad value ignored rather than answering nothing; and `from > to`.

```ts
import { Types } from 'mongoose';
import { buildAlbumFilter } from './albums.public-filter.js';

describe('buildAlbumFilter', () => {
  it('always restricts to published, non-archived albums', () => {
    expect(buildAlbumFilter({})).toEqual({ publicationState: 'Published', archivedAt: null });
  });

  it('adds no key for a parameter that was not supplied', () => {
    // `{ seasonId: undefined }` matches documents LACKING the field in Mongo,
    // which is the opposite of "any season".
    expect(Object.keys(buildAlbumFilter({}))).toEqual(['publicationState', 'archivedAt']);
  });

  it('matches a championship by the denormalised field or by the event itself', () => {
    const id = new Types.ObjectId().toString();
    const filter = buildAlbumFilter({ championshipId: id });
    expect(filter.$or).toEqual([
      { championshipId: new Types.ObjectId(id) },
      { 'event.entityId': new Types.ObjectId(id), 'event.entityType': 'championships' },
    ]);
  });

  it('ignores a malformed id rather than returning an empty library', () => {
    expect(buildAlbumFilter({ seasonId: 'not-an-id' }).seasonId).toBeUndefined();
  });

  it('returns a filter that matches nothing when from is after to', () => {
    const filter = buildAlbumFilter({ from: '2026-06-01', to: '2026-01-01' });
    expect(filter.eventDate).toEqual({ $gte: new Date('2026-06-01'), $lte: new Date('2026-01-01') });
  });

  it('escapes regex specials in the search term', () => {
    const filter = buildAlbumFilter({ q: 'a.*b' });
    expect(String(filter.$and?.[0]?.$or?.[0]?.['title.ar'])).toContain('a\\.\\*b');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd api && npm test -- --runInBand --testPathPatterns="albums.public-filter"`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the filter builder**

Create `albums.public-filter.ts`, modelled on `videos.public-filter.ts` — read that file first and follow its two stated rules (only supplied fields become keys; a bad narrowing is ignored, not answered with nothing). Escape regex specials with the same `REGEX_SPECIALS` constant. `championshipId` produces the `$or` above; `q` searches `title.ar`, `title.en` and `location`. A `from`/`to` pair becomes `eventDate: { $gte, $lte }` — an inverted range is left to match nothing, which is the truthful answer to a range with no days in it.

- [ ] **Step 4: Run it and watch it pass**

Run: `cd api && npm test -- --runInBand --testPathPatterns="albums.public-filter"`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the failing repository test for the list with preview photos**

In `albums.repository.spec.ts`, add a test that seeds one published album with five visible photos and asserts `findPublicPage` returns `previewPhotos` of length 3, ordered by `displayOrder`, with the cover first when one is set.

- [ ] **Step 6: Run it, watch it fail, then implement**

`findPublicPage` uses a single aggregation with `$lookup` + a sub-pipeline capped at `$limit: 3`, sorted by `displayOrder` — never a per-album query. Return `{ items, total }`.

- [ ] **Step 7: Pin Review Focus #3 — an inverted range returns nothing**

Add to `albums.public-filter.spec.ts` an assertion that a filter built from `from: '2026-06-01', to: '2026-01-01'` cannot match a document with any `eventDate`, and in the repository spec assert the list comes back empty for that range with albums present.

- [ ] **Step 8: Write the failing facets test**

In `albums.repository.spec.ts`:

```ts
it('returns empty facet lists when no album carries a link', async () => {
  // Every album today: event null, playerIds empty.
  const facets = await repository.facets();
  expect(facets).toEqual({ seasons: [], events: [], players: [] });
});

it('counts only published albums in a facet', async () => {
  // one Published and one Draft album sharing an event
  const facets = await repository.facets();
  expect(facets.events).toEqual([expect.objectContaining({ count: 1 })]);
});
```

- [ ] **Step 9: Implement `facets()`**

An aggregation over published, non-archived albums only: `$group` by `seasonId`, by `event`, and `$unwind` + `$group` by `playerIds`, each producing `{ id, count }`. Names are **not** resolved today — no collection to resolve them from — so each entry carries `name: null`, and the UI hides a facet whose list is empty. Document that in a comment.

- [ ] **Step 10: Wire the controller routes**

In `albums.controller.ts`, **declare in this order**, before the existing `@Get('public/:slug')`:

```ts
  @Get('public')        // the list
  @Get('public/featured')
  @Get('facets')
  @Get('stats')
  @Get('public/:slug')  // existing — MUST stay last of the `public/*` group
```

Nest matches in declaration order, so `public/featured` declared after `public/:slug` would be swallowed as a slug. The existing file already documents this convention for `public/:slug` vs `:id`.

- [ ] **Step 11: Pin Review Focus #2 — facets on an empty database**

Add a controller-level test asserting `GET /albums/facets` on a database with no albums answers `200` with `{ seasons: [], events: [], players: [] }` — not `null`, not 500.

- [ ] **Step 12: Run the album tests, type-check, record files**

Run: `cd api && npm test -- --runInBand --testPathPatterns="albums"` then `npx tsc --noEmit`.

- [ ] **Step 13: Regenerate the OpenAPI spec**

Run: `cd api && npm run generate:openapi`
This uses `dist-openapi/`, not `dist/`, so it does not disturb the running watch server. `api/openapi.json` is part of the owner's commit.

---

### Task 3: Admin editing, photo management, and the homepage section

**Files:**
- Modify: `api/src/common/constants/permission-catalogue.ts`
- Modify: `api/src/modules/media-center/albums/albums.controller.ts`, `albums.service.ts`, `albums.repository.ts`
- Create: `api/src/bootstrap/seed-photo-gallery-section.ts`, `seed-photo-gallery-section.spec.ts`
- Modify: `api/src/bootstrap-admin.ts`

**Interfaces:**
- Produces: `PATCH /albums/:id`, `POST /albums/:id/photos`, `PATCH /albums/:id/photos/order`, `PATCH|DELETE /albums/:id/photos/:photoId`, `PATCH /albums/:id/cover`, `PATCH /albums/:id/featured`; `seedPhotoGallerySection(models)`.

- [ ] **Step 1: Add `albums:Update` to the catalogue**

`permission-catalogue.spec.ts` re-derives the catalogue from the `@RequirePermission` decorators and fails if the two disagree **in either direction** — so add the decorator and the catalogue entry in the same step, or the test fails. Insert after the `albums:Read` line:

```ts
  { resourceType: 'albums', action: 'Update' },
```

- [ ] **Step 2: Run the catalogue test**

Run: `cd api && npm test -- --runInBand --testPathPatterns="permission-catalogue"`
Expected: FAIL until Step 3 adds a route guarded by `albums:Update`; then PASS.

- [ ] **Step 3: Add `PATCH /albums/:id`**

Guarded `@RequirePermission('albums', 'Update')`. Body is an `UpdateAlbumDto` (a `PartialType(CreateAlbumDto)` minus `slug` — a published album's URL does not change silently). Re-run `assertLinkable` and `resolveAncestry` when `event` is present, so ancestors never go stale against a changed link.

- [ ] **Step 4–12: Photo routes**

Each route carries `:id`. `POST /albums/:id/photos` registers a batch of already-uploaded assets, capped at 50, setting `albumId` and appending `displayOrder`; it delegates to `MediaAssetsService` so the `assetCount` `$inc` stays in one place. `PATCH /albums/:id/photos/order` takes an ordered array of photo ids and writes `displayOrder` in one `bulkWrite`. `PATCH /albums/:id/featured` clears the previous holder and sets the new one in a single operation.

- [ ] **Step 13: Pin Review Focus #4 — deleting the cover**

```ts
it('promotes the first remaining photo when the cover is deleted', async () => {
  // album with cover = photo A, plus B and C at displayOrder 1 and 2
  await service.removePhoto(albumId, photoA.id, actor);
  const album = await repository.findById(albumId);
  expect(album.coverImageId.toString()).toBe(photoB.id);
  expect(album.assetCount).toBe(2);
});

it('leaves coverImageId null when the last photo is deleted', async () => {
  await service.removePhoto(albumId, onlyPhoto.id, actor);
  const album = await repository.findById(albumId);
  expect(album.coverImageId).toBeNull();
  expect(album.assetCount).toBe(0);
});
```

- [ ] **Step 14: Seed the `PHOTO_GALLERY` homepage section**

Copy the shape of `api/src/bootstrap/seed-video-section.ts` exactly — **create if absent, never upsert**, so an editor's saved count or hidden switch survives the next deploy. Use `sectionType: 'PHOTO_GALLERY'`, which is already in the approved `PAGE_SECTION_TYPES` closed list and already registered in the dashboard rail at `apps/dashboard/src/lib/admin/homepage/sections.ts`. **Do not add `PHOTO_ALBUMS`.** Real Arabic and English copy, never placeholders. Call it from `bootstrap-admin.ts` beside the video section, and add its result strings.

- [ ] **Step 15: Assert idempotence**

```ts
it('creates the row once and leaves it alone on a second run', async () => {
  expect(await seedPhotoGallerySection(models)).toBe('created');
  expect(await seedPhotoGallerySection(models)).toBe('exists');
  expect(await sections.countDocuments({ sectionType: 'PHOTO_GALLERY' })).toBe(1);
});
```

- [ ] **Step 16: Run, type-check, regenerate OpenAPI, record files**

---

### Task 4: Development seed

**Files:**
- Create: `api/src/bootstrap/seed-albums-dev.ts`, `seed-albums-dev.spec.ts`, `api/src/seed-albums-dev.ts`, `api/src/seed-albums-dev-clean.ts`
- Modify: `api/package.json`

- [ ] **Step 1: Add the scripts**

```json
"seed:albums:dev": "tsc -p tsconfig.seed.json && node --env-file-if-exists=.env dist-seed/seed-albums-dev.js",
"seed:albums:dev:clean": "tsc -p tsconfig.seed.json && node --env-file-if-exists=.env dist-seed/seed-albums-dev-clean.js"
```

`tsconfig.seed.json`, not `nest build` — it writes to `dist-seed/` so the seed is runnable while the API serves.

- [ ] **Step 2: Write the failing safety test**

- [ ] **Step 3: Pin Review Focus #5**

```ts
it('refuses an Atlas connection string before writing anything', () => {
  expect(() => assertSafeDevTarget('mongodb+srv://user:pw@cluster.mongodb.net/uaeaf', 'development'))
    .toThrow(/local database/i);
});

it('refuses production regardless of host', () => {
  expect(() => assertSafeDevTarget('mongodb://127.0.0.1:27017/uaeaf', 'production')).toThrow(/production/i);
});
```

Reuse `assertSafeDevTarget` from `api/src/bootstrap/dev-database.ts` — it already rejects `mongodb+srv://` (it matches only `mongodb://`), every non-local host, and `NODE_ENV=production`. **Do not write a second guard.** The script prints the database name before it starts.

- [ ] **Step 4–9: Seed content**

12 albums, 8–20 photos each, dates spread across the last two seasons, one `isFeatured`, ten Published and two Draft, `event: null` and `playerIds: []`. Every slug starts with `dev-seed-`, and the script skips a slug that already exists, so a second run adds nothing.

Images: about 30 athletics photographs under the Unsplash or Pexels licence (both permit commercial use without attribution; the federation records attribution anyway). Each one's `file.photographer` carries the photographer's name and the record carries the source URL. Upload through the **existing** path — `POST /media-assets/upload`, one file per request — into a `uaeaf/dev-seed/albums` folder. Photos may repeat across albums.

**If downloading the images or reaching Cloudinary is not possible from this machine, stop and ask** (the owner's stop-point 2). Do not substitute generated images: the library's AI-provenance policy is a separate, settled decision.

- [ ] **Step 10: The clean script**

`seed:albums:dev:clean` removes every album whose slug starts with `dev-seed-`, purges their media assets through the existing two-step path (archive, then destroy the object), and removes the Cloudinary folder. It calls `assertSafeDevTarget` first, exactly like the seed.

---

### Task 5: Ambient Motion Policy

**Files:**
- Modify: `docs/design-system/ADR-0099-Media-Showcase-Motion.md`
- Create: `apps/web/src/lib/motion/use-ambient-motion.ts`, `use-ambient-motion.spec.ts`
- Create: `apps/web/src/lib/design-system/ambient-motion-contract.spec.ts`

- [ ] **Step 1: Rescope the ADR**

Retitle to **ADR-0099: Ambient Motion Policy**. Change the scope from "media showcase components" to **the whole site**, keeping the six conditions as written and keeping the D5 component registrations. Update the **Amends** row to state plainly that it amends **Chapter 3 §3.14** and **ADR-0098 D5** site-wide rather than for one component family, and record in **Consequences** that the per-view cap of one continuous rotation still holds. Add a decision noting that interaction-bound motion (`:hover`/`:focus-within` only, as `PhotoStack` uses) needs **no** pause control, since nothing runs unprompted. Add that the motion-library choice (Motion/GSAP) is deferred to its own ADR and the current implementation is CSS only. Keep `ambient`'s own restriction untouched.

- [ ] **Step 2: Write the failing hook test**

Assert the hook reports `false` under `prefers-reduced-motion: reduce`; pauses when the element is not intersecting; pauses on `document.hidden`; and resumes when all three clear. Drive it with a fake `IntersectionObserver` and `matchMedia`.

- [ ] **Step 3–5: Implement `useAmbientMotion`**

```ts
/**
 * Whether a continuously-animating element should be moving right now.
 *
 * ADR-0099 permits unprompted motion only while six conditions hold together,
 * and five of them are state this hook owns: reduced-motion, intersection,
 * tab visibility, hover and focus. Each was written out by hand in the first
 * component that needed them, and a condition written by hand is a condition
 * a later component forgets — which is why this returns one boolean rather
 * than leaving five to be recombined at each call site.
 *
 * The sixth, a visible pause control, is markup and cannot live here; the
 * contract test checks for it in the components that use this hook.
 */
export const useAmbientMotion = (ref: RefObject<HTMLElement | null>): boolean => { /* ... */ };
```

- [ ] **Step 6: Write the contract test and prove it by mutation**

`ambient-motion-contract.spec.ts` asserts that every component calling `useAmbientMotion` also renders a pause control with an accessible name, and that no component animates a layout-affecting property. Then **remove each condition in turn and confirm the suite turns red for that condition**, and restore it. A guard nobody has watched fail has not been verified — this repository has a recorded case of a loop guard reporting green while measuring zero frames.

---

### Task 6: Dashboard and website — three parallel agents

Start only after Tasks 1–3 are green and `api/openapi.json` is regenerated: the agents build against a fixed contract.

**File ownership — no file appears twice.**

| Agent | Owns | Must not touch |
|---|---|---|
| **A — shared components** | `apps/web/src/components/shared/albums/**` (`AlbumCard`, `PhotoStack`, `FeaturedAlbumDeck`, `AlbumFilterBar`, `PhotoGrid`, `Lightbox`, `EntityChips`), `apps/web/src/lib/albums/**` | pages, dashboard, `packages/brand-ui` |
| **B — website pages** | `apps/web/src/app/[locale]/media/albums/**`, `apps/web/src/components/pages/albums/**`, `apps/web/src/lib/pages/public-pages.ts` (the albums row only) | `components/shared/albums/**`, dashboard |
| **C — dashboard** | `apps/dashboard/src/app/[locale]/(app)/albums/**`, `apps/dashboard/src/components/admin/albums/**`, `apps/dashboard/src/lib/admin/homepage/sections.ts` (the rail-order line only) | web, shared components |

**Binding design reference for A and B:** `docs/design-specs/albums/albums-main.png` (desktop) and `albums-mobile-1.png` / `albums-mobile-2.png`. Layout, sizing, order and motion are binding; **colours are a visual reference only** and come from the kit per the identity mapping table.

**What the canvas v14 fixes, read from the image:** the filter bar holds exactly five controls in this order — الموسم الرياضي, البطولة / الفعالية, اللاعب, الفترة الزمنية, بحث — with the result counter (`9 من 9 ألبوم`) below it at the line start and the hint at the line end. **There are no category chips.** Cards are four across on desktop with a chip over the image coloured by event type (championship green, public event red, competition `ink`), a title, a date-and-place meta row, and a footer above a top border holding `تصفح الألبوم ←` and a green `N صورة` chip. Pagination is numbered on desktop.

**Identity mapping (actual names):** `Surface kind="canvas" mesh` for the page; `PageHero` + `Surface kind="photo-light"` for the hero; `BreadcrumbItem` from `PageHero`; `BrandStreaks`; `TricolorDivider`/`BrandAccentBar`; `GlassTile`/`StatHighlight` for the hero figures; `Surface kind="ink" mesh` for the featured card — **the mesh or a `BrandAccentBar` first child is mandatory and `surface-adjacency-contract.spec.ts` fails without it**; `Surface kind="raised"` + `BrandBorder variant="hover"` for `AlbumCard`; `FilterChip`; `SearchField`; `Button variant="secondary"` for the tricolour-edged button; `EmptyState`; `SectionHeading`; `BRAND_CONTAINER`; `BRAND_FOCUSABLE` + `BRAND_FOCUS_WIDE`; `--color-text-link`; `--color-green-300` on ink.

`BrandBorder`'s variants are `static | hover | live` — there is no `animated`.

**Period filter:** reuse `VIDEO_PERIODS` and `rangeIsPossible` from `@uaeaf/content/time-range`; build the small shared control in `components/shared/albums/`, not a second copy of the video panel.

**Facets rule:** a filter whose `facets` list is empty is removed from the DOM together with its label. Today that hides the season, event and player filters, leaving period and search.

---

### Task 7: Simplify, verify, document

- [ ] **Step 1: `/simplify` on this session's changed files only**

No behaviour and no visual change; nothing in the Protected Positions is touched. Anything larger than a local simplification is written to the backlog, not applied. Re-run the affected files' tests afterwards.

- [ ] **Step 2: One Playwright run**

Arabic and English, desktop 1440 and mobile 390, for: the albums listing, an album detail page, the lightbox open, the homepage section, and the four dashboard screens. Screenshots go to the scratchpad by absolute path, **never into the repository**.

- [ ] **Step 3: Accessibility**

axe on the public pages; a full keyboard pass over the lightbox, the filter bar, and the dashboard reordering. Confirm arrow keys reverse correctly in RTL and that `scrollBy` sign is handled — `element.dir` reads `""` in this codebase, so read direction from the document, not the element.

- [ ] **Step 4: Performance**

One Lighthouse mobile run each on the listing and the detail page. Record LCP, CLS and INP. Targets: LCP < 2.5s, CLS < 0.1. Measure on `localhost`, not `127.0.0.1` — Next 16 dev never hydrates on the latter here.

- [ ] **Step 5: Direction and motion**

Confirm the deck and the stacks mirror in English, that `prefers-reduced-motion` stops every animation, and that the pause control works.

- [ ] **Step 6: Write `docs/features/photo-albums.md`**

The agreed nine sections: why it exists and the rejected alternatives (chief among them `event` + ancestors versus a field per type, and photos as media assets versus embedded); the file map in work-chain order; one real example traced from upload to lightbox; the non-obvious decisions; how to add a new linkable entity step by step; three common failures; the guards; what was deliberately not built; the glossary.

---

## Deferred — not built this session

- **Task 5.5 (D5, `isActive` page visibility).** `pages.schema.ts` carries `slug`, `title`, `status` and `seo` and **no `isActive`**, and no `ComingSoon` component exists anywhere in `apps/web`. The system D5 says to consume is not on disk. Per the owner's stop-point 3: reported, and the rest continues.

## Awaiting approval — recommended, not done

- **`Album.associations[]` now overlaps `event` + `playerIds`.** It stays, because removing it is non-additive (outside the single authorised removal) and `AlbumsRepository.findRelated()` — the related-albums strip of ADR-0055 — is built on it. Recommendation: keep `associations[]` as the broad grouping axis and `event` as the single occasion, and say so in the schema comment. A later ADR can retire one.
- **`sportsEvents` chosen over the documented `events`** for the competition type, because `CONTENT_ASSOCIATION_OWNER_TYPES` has used `sportsEvents` since 2026-09-23 and `events` collides with `publicEvents` in reading. Flagged, not silently taken.
- **`publicEvents`' parent is `championshipId` per the documentation**, not the season D1 assumed. No entry is written for it; the map stays empty and the decision is the owner's when that module is built.

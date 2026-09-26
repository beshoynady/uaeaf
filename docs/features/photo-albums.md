# Photo Albums

The federation's photo gallery: a public listing, a single-album viewer, a
homepage section, and the CMS screens that fill them.

---

## 1. Why it exists, and what was rejected

The Media Centre had a `/media/albums` page that drew a hero and nothing else.
`albums` and `mediaAssets` existed as collections (ADR-0054, ADR-0055) with a
working single-album endpoint, but there was **no public list** — so nothing
could be browsed, and no editor screen existed to create an album at all.

Three alternatives were considered and rejected, each for a measured reason.

**A `links[]` array instead of explicit fields.** The first design gave an
album one `event: {entityType, entityId}` plus `seasonId`/`championshipId`
*derived* by walking a hierarchy at save time. It was built, then removed. Two
costs killed it: the walk needed four collections that do not exist, so it
resolved nothing and could not be exercised; and every derived value goes stale
the day a championship moves to a different season, which would have meant a
recompute job for data nobody can create yet. Explicit fields cost one extra
picker in the form and remove both problems. The editor knows which season it
was; asking is cheaper than inferring.

**A `category` enum, or a `contentCategories` collection.** `Album` carried a
required `contentCategoryId` pointing at a collection that was never built, so
no album could be created without inventing an id. `videos` had hit the same
wall on 2026-09-23 and resolved it by deleting the field. Albums followed. No
enum replaced it: the approved canvas (v14) removed the category chips, and the
filters ask about linked entities and time instead — an enum would have been a
field nothing reads.

**Photos embedded in the album document.** Rejected: a photo is a
`MediaAsset`, the same record the rest of the platform already uses for hero
images and page media, and `albumId` on it is nullable *by decision* because
assets exist outside albums. Embedding would have produced a second kind of
image with its own upload path.

`associations[]` was also removed. It carried the same six facts the explicit
fields now carry, and two fields holding one fact is a fact that can disagree
with itself. `videos` and `live-streams` still use the shared
`ContentAssociation` embed — see §8.

---

## 2. File map, in the order work flows

**Schema and rules**
- `api/src/modules/media-center/albums/schemas/album.schema.ts` — the collection, its affiliation fields, and seven indexes.
- `api/src/modules/media-center/albums/album-affiliation.ts` — the coherence rules, as a pure function.
- `api/src/modules/media-center/media-assets/schemas/media-asset.schema.ts` — a photo. Unchanged by this work.

**Reading**
- `albums.public-filter.ts` — query string → Mongo filter. Pure, no database.
- `albums.repository.ts` — `findPublicPage` (list + preview photos in one `$lookup`), `facets`, `findRelated` (four-tier ranking), `findFeatured`, `stats`, `clearFeatured`.
- `albums.service.ts` — `listPublic`, `facets`, `featured`, `stats`, `getPublicBySlug`, and the public-safe mapping.
- `albums.controller.ts` — route order matters; see §6.

**Writing**
- `albums.service.ts` — `create`, `update`, `publish`, `remove`, `removePhoto`, `setCover`, `reorderPhotos`, `setFeatured`.
- `media-assets.service.ts` — `uploadAndCreate` is how a photo joins an album, and the only place `assetCount` moves.
- `api/src/common/constants/permission-catalogue.ts` — `albums:Create|Read|Update|Delete|Publish`.

**Homepage section**
- `photo-gallery-section/photo-gallery-settings.ts` — reads the free-form `configuration` without trusting it.
- `photo-gallery-section/photo-gallery-section.service.ts` — one payload for the whole section.
- `api/src/bootstrap/seed-photo-gallery-section.ts` — creates the `pageSections` row once, never updates it.

**Development data**
- `api/src/bootstrap/seed-albums-dev.ts` + `api/src/seed-albums-dev.ts` / `-clean.ts`
- `api/src/bootstrap/dev-seed-photos.json` — empty by design; see §4.

**Website**
- `apps/web/src/components/shared/albums/` — `AlbumCard`, `PhotoStack`, `FeaturedAlbumDeck`, `AlbumFilterBar`, `AssociationChips`, `AlbumViewer`, `PhotoSlider`, `PhotoIndexGrid`, `Filmstrip`, `LaneProgress`.
- `apps/web/src/lib/albums/` — URL ↔ filter state, affiliation mapping, facet options, photo windowing.
- `apps/web/src/lib/motion/use-ambient-motion.ts` — ADR-0099's six conditions, in one hook.
- `apps/web/src/app/[locale]/media/albums/` — both pages and their `_data/` loaders.
- `apps/web/src/components/pages/home/albums-section/` — the homepage section.

**Dashboard**
- `apps/dashboard/src/app/[locale]/(app)/albums/` — list, new, edit.
- `apps/dashboard/src/components/admin/albums/` — the board, the form, photo management.
- `apps/dashboard/src/lib/admin/albums/` — drafts, requests, the upload queue.

---

## 3. One real example, traced end to end

**An editor uploads a photo, and a visitor sees it in the lightbox.**

1. The editor opens `/ar/albums/<id>/edit` and drops five files on the
   dropzone. `use-album-uploads.ts` puts them in a queue and starts three at a
   time (`upload-queue.ts`).
2. Each file goes out on its own `XMLHttpRequest` (`upload-transport.ts`), so
   `xhr.upload.onprogress` can drive a real progress bar — `fetch` reports
   none. Alt text is pre-filled as `"{album title} — صورة {n}"`, because
   `UploadMediaAssetDto` requires it in both languages and an upload screen is
   the only moment anyone knows what the picture shows.
3. The request reaches the dashboard's BFF route handler, which forwards it to
   `POST /api/v1/media-assets/upload` with the session's token. The browser
   never calls NestJS directly.
4. `MediaAssetsService.uploadAndCreate` runs `assertUploadable` on the bytes
   (format, size, dimensions — read from the bytes, never from the request),
   stores the object through `StorageProvider` (Cloudinary today), then writes
   the record. If the record write fails, the stored object is destroyed: a
   file nothing points at is the orphan this order exists to prevent.
5. Because the record carries `albumId`, the service `$inc`s the album's
   `assetCount`. **This is the only place that number moves.**
6. When the batch finishes, the dashboard sends the complete order to
   `PATCH /albums/:id/photos/order`, which writes `displayOrder` from each
   id's position in one `bulkWrite`.
7. A visitor opens `/ar/media/albums/<slug>`. The page calls
   `GET /albums/public/<slug>?skip=0`, which returns the album, **at most 40**
   visible photos in display order, `photoTotal`, and the related-albums strip.
8. `AlbumViewer` mounts a window of ±8 slides. Only the current photo is offered
   at stage size, as a `srcset` of Cloudinary `w_640` and `w_1640` with
   `sizes` naming the 300px phone box and the 820px desktop stage, so the
   browser picks; every side slide loads at `w_480` (the two either side
   eagerly); thumbnails at `w_192` (`photo-window.ts`).
9. As the reader nears the end of what is loaded, `onRequestMore` fires. A
   pager refuses a second request while one is in flight, and appends a page
   only when its offset equals the number of photos already held — so a late or
   repeated answer can neither duplicate nor skip.
10. Pressing the arrow keys moves the slider. Forward is `ArrowLeft` in Arabic
    and `ArrowRight` in English, read from `document.documentElement` — see §6.

---

## 4. Decisions that are not obvious

**Ancestors are not derived — each level is stated.** See §1. The consequence
worth knowing: filtering by championship returns its competitions' albums *for
free*, because the editor filled both fields. No `$or` is needed.

**The season is the exception: it is derived, never stored.** There is no
`seasonId`. `videos/season.ts` records the platform's decision — "this platform
has no season entity and none is being added" — and a second, contradicting
answer here would have made the same word mean a label in one public endpoint
and an id in its neighbour. An album's season is `seasonLabel(eventDate)`, and
the public `season` parameter takes a label such as `2025–2026`, exactly as the
video library's does. `facets.seasons` is grouped from published albums' dates,
so **the season filter works today** while the three entity filters stay
hidden. Boundaries come from `SEASON_START_MONTH` in that one helper; there is
no second copy.

**An album may have no affiliation at all.** The hero copy promises "the
federation's official activities", and a board meeting belongs to no
championship. Two coherence rules hold: a competition requires a championship,
and a championship and a public event exclude each other. Both are about which
fields are filled *together*, so they are enforced today even though none of
the three collections exists. There is no season rule, because there is no
season field to be inconsistent with.

**`update` checks coherence on the merged album, not on the patch.** Clearing a
championship while saying nothing about its competition leaves a competition
with nothing above it; a check that saw only the patch would allow it.

**A malformed id in a filter is ignored; an inverted date range is not.** A
stale bookmark must not turn a public page into an error, so a bad id drops out
and the visitor sees the unfiltered gallery. But `from > to` is a window with
no days in it, and the truthful answer is that it holds no albums.

**`facets` decides the shape of the filter bar.** A filter whose list comes
back empty is removed from the DOM *with its label*. Today that hides
championship/event and competition. The season shows as soon as a dated album
is published: each option is the label itself (`2025–2026`, en dash), which is
also what the address and the API carry. `season-label.ts` refuses what the
API's `seasonRange` refuses (a hyphen, years out of order or not consecutive),
so no season reaches the address that the API would ignore. Athlete and club
show when their facets fill. It grows by itself as content arrives, with no
code change.

**Preview photos: three for a card, five for the homepage lead.**
`FeaturedAlbumDeck` has five slots and only turns when all five are filled.
`listPublic` takes a preview count so the section can ask for five without a
second request per album.

**The dev seed reuses local media assets and attaches no credit.**
`dev-seed-photos.json` ships empty because every entry must name the
photographer — `MediaFile.photographer` is shown to a visitor as a credit, and
a credit naming the wrong person is worse than no picture. A photographer's
name cannot be derived from an image URL. Until the file is filled, the seed
borrows what the local library holds and says so on stdout. **The UI hides the
credit line entirely when there is no credit; it never draws a placeholder.**

**`PHOTO_GALLERY`, not `PHOTO_ALBUMS`.** `PAGE_SECTION_TYPES` is a closed list
read verbatim from the design board and already contained `PHOTO_GALLERY`, as
did `PAGE_SECTION_ITEM_TARGETS` for `albums`.

**The section seed creates but never updates.** An upsert would reset an
editor's saved count or hidden switch on every deploy, silently, because a
deploy script reports success either way.

---

## 5. How to add a new linkable entity

When the seasons, championships, competitions or public-events module is built:

1. **Schema:** nothing to do. `championshipId`, `competitionId` and
   `publicEventId` already exist, already indexed. Add `ref:` to the `@Prop`
   once the model is registered, if you want `populate()`. **Do not add a
   season entity** without reopening the decision recorded in §4 — it would put
   two answers in the codebase for one question.
2. **Names:** add a public listing endpoint returning `{ id, name: {ar, en} }`,
   the shape `/athletes/public` and `/clubs/public` already use.
3. **Facets:** nothing to do. `AlbumsRepository.facets()` already counts all
   six, and the filter already reads them.
4. **Website:** pass the new names into `AlbumFacetNames`. The filter control
   appears by itself the moment its facet list is non-empty.
5. **Dashboard:** in `apps/dashboard/src/lib/admin/albums/affiliation.ts`, flip
   `AFFILIATION_MODULES_BUILT` for that entity and point its picker at the new
   endpoint. The coherence rules are already written.
6. **Chips:** `AssociationChips` covers championship, competition and public
   event, each chip writing its kind as a word before the name. Athlete and
   club kinds are **not yet drawn** — add them there, with their own kind word.

For a genuinely new *kind* of affiliation (not one of the four), add the field
to the schema, an index, a clause in `buildAlbumFilter`, a facet in
`countBy`, and a rule in `assertAffiliationShape`. Five small edits, each in an
obvious place.

---

## 6. Three ways this breaks

**Route order in `albums.controller.ts`.** Nest matches in declaration order.
`@Get('public/:slug')` **must stay after** `public`, `public/facets`,
`public/featured` and `public/stats`, or those literals are read as slugs and
answer with a null album. Same rule puts every `public/*` route before
`@Get(':id')`.

**`element.dir` reads `""` in this codebase.** Any direction-dependent
behaviour — arrow keys, `scrollBy`, a `translateX` sign — must read direction
from `document.documentElement`, never from the element. `scrollBy` is also
negative-forward in RTL. `photo-window.ts`'s `arrowStep` has a test pinning
exactly this.

**`assetCount` drifting from reality.** It is denormalised, and it moves in
exactly two places: `MediaAssetsService.create`/`uploadAndCreate` (`$inc +1`)
and `remove` (`$inc -1`). If you add a path that moves a photo between albums,
it must decrement the old album and increment the new one — **no such path
exists today**, which is why none is handled. A second upload route would be a
second place for the number to drift.

---

## 7. The guards

| What it protects | Where |
|---|---|
| Affiliation coherence (10 cases) | `album-affiliation.spec.ts` |
| Filter building: only supplied keys, bad ids ignored, regex escaped, inverted range | `albums.public-filter.spec.ts` |
| Indexes are actually used (`IXSCAN`, never `COLLSCAN`) | `albums.repository.spec.ts` |
| Related-albums tier order | `albums.repository.spec.ts` |
| Facets empty on an empty database, counts published only | `albums.repository.spec.ts` |
| Cover promotion and `assetCount` after a delete | `albums.photos.integration.spec.ts` |
| One featured album at a time | `albums.photos.integration.spec.ts` |
| Photo paging: 40 per page, total counted with the page | `albums.service.public.integration.spec.ts` |
| Page size is 8 | `albums.service.spec.ts` |
| Permission catalogue matches the `@RequirePermission` decorators | `permission-catalogue.spec.ts` |
| Section seed is idempotent and never overwrites an editor | `seed-photo-gallery-section.spec.ts` |
| Dev seed refuses any non-local database | `seed-albums-dev.spec.ts` |
| `contentCategoryId` and `associations` are gone | `albums.repository.spec.ts` |
| Public club shape leaks no administrative field | `clubs.public.spec.ts` |
| Ambient motion: six conditions, proven by mutation | `use-ambient-motion.spec.ts`, `ambient-motion-contract.spec.ts` |
| A filter with no facets is not drawn | `album-filter-bar.spec.tsx` |
| The season travels as its label, unchanged, through address and API | `season-label.spec.ts`, `album-query.spec.ts`, `album-filter-bar.spec.tsx` |
| Chips: kind written as a word; identity colours only as plates, 4.5:1 in every theme | `album-card.spec.tsx` |
| Photo link at every width; share sheet, clipboard and manual fallback | `photo-share.spec.tsx`, `share-link.spec.ts` |
| Current slide `srcset` 640w/1640w, side slides `w_480` | `photo-window.spec.ts`, `photo-slider.spec.tsx` |
| Index stagger 20ms, 30th cell at 580ms; every local duration carries its derivation | `album-viewer.spec.tsx` |
| No literal colour, no raw ramp step, no Tailwind palette | `apps/web/src/lib/design-system/` (24 files) |

---

## 8. Deliberately not built

- **The three occasion modules** — championships, competitions, public events.
  The schema is ready; the collections are not. **Seasons are deliberately not
  among them**: the season is derived from a date.
- **`pages.isActive` page visibility.** Another session owns it. Every place
  that will consult it carries `// TODO(isActive): wire when pages.isActive
  lands` and nothing else — no substitute was built.
- **Editing a photo's alt text, caption or credit.** `PATCH /media-assets/:id`
  does not exist, so the dashboard's photo panel is read-only
  (`TODO(media-patch)`).
- **A batch photo-registration endpoint.** `POST /media-assets/upload` already
  accepts `albumId` and maintains `assetCount`; a second path would be a second
  place for that count to drift.
- **Migrating `videos` and `live-streams` off `ContentAssociation`.** They still
  use the shared embed. The codebase now has two ways to express a media item's
  context. Accepted for now; recorded here so the divergence is known and not
  discovered.
- **Face tagging, ZIP download, watermarking, comments, video inside albums,
  and migrating the old site's images.** All out of scope by decision.

---

## 9. Terms

| Term | Meaning |
|---|---|
| **Affiliation** | Where an album sits: championship → competition, or a public event, plus the athletes and clubs in it. |
| **Season** | A sporting year, September to September, written `2025–2026`. Derived from a date by `videos/season.ts`, never stored. |
| **Occasion** | The single event an album documents — a championship or a public event, never both. |
| **Facet** | One filter's available options and their counts. An empty facet hides its filter. |
| **Preview photos** | The first photos returned with an album in a list: three for a card's stack, five for the homepage lead's deck. |
| **Lead** | The album the homepage section opens with — the featured one, or the newest. |
| **Featured** | The one album marked to lead the gallery. At most one at a time, enforced in `setFeatured`. |
| **Ambient motion** | Motion that runs without the reader starting it. ADR-0099 permits it only while six conditions hold together. |
| **Finish line** | The tricolour sweep across a newly-current photo in the slider — the album view's signature. |
| **Dev seed** | `npm run seed:albums:dev`. Local databases only, enforced by `assertSafeDevTarget`. |

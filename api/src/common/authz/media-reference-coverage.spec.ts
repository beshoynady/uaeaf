import mongoose from 'mongoose';
import type { Schema } from 'mongoose';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  MEDIA_ASSET_MODEL,
  SCANNED_COLLECTIONS,
  SCAN_EXCLUSIONS,
  idPathsWithoutRefIn,
  referencePathsIn,
  scannableTextFieldsIn,
} from './media-references.js';
import type { SchemaRoot } from './media-references.js';

/**
 * The coverage guard for the media reference scan.
 *
 * `findMediaAssetReferrers` is the last thing between a permanent delete and a
 * published page. It follows what the schemas declare, so the danger is not a
 * bug in it — it is a field added tomorrow that carries a reference in a shape
 * the scan cannot follow. Nothing in the application would notice; the first
 * symptom would be a purge that succeeded and a page with a hole in it.
 *
 * So this fails when a NEW field appears that the scan would not see:
 *
 *  (a) a string-typed field whose name suggests a picture — `photo`, `image`,
 *      `logo`, `cover`, `thumbnail`, `media`, `asset`;
 *  (b) ANY id-shaped field with no `ref`. Not "any media-named one": the name
 *      condition would pass over precisely the hidden reference the sweep
 *      exists to catch, immediately in front of an irreversible delete;
 *  (c) a new rich-text or free-URL field absent from the scanned list.
 *
 * The point is not to forbid such a field. It is to make adding one a decision
 * somebody makes on purpose, in a file somebody reads, instead of a silent
 * hole in an irreversible operation.
 *
 * It reads the project's own schemas, so it is a guard by the criterion in
 * `docs/engineering/guard-tests.md`, where it is registered along with
 * `scripts/test-guards.mjs` (core tier).
 */
const SRC = fileURLToPath(new URL('../../', import.meta.url));

const sourceFiles = async (dir: string, suffix = '.ts'): Promise<string[]> => {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(path, suffix)));
    else if (entry.name.endsWith(suffix)) found.push(path);
  }
  return found;
};

/**
 * Every collection-backed schema in the project, read without a database.
 *
 * Discovery is automatic — every `*.schema.ts` under `src` — so a collection
 * added tomorrow is swept without anyone registering it here. Embedded schemas
 * carry no `collection` option and are reached by the walk from their parent
 * instead, which is what produces the full dotted path a Mongo filter needs.
 */
const files = await sourceFiles(SRC, '.schema.ts');
const roots: (SchemaRoot & { file: string; exported: string })[] = [];
const everySchema = new Map<string, Schema>();
for (const file of files) {
  const module = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  for (const [exported, value] of Object.entries(module)) {
    if (!(value instanceof mongoose.Schema)) continue;
    everySchema.set(exported, value as Schema);
    const collection = value.get('collection');
    if (typeof collection !== 'string' || collection.length === 0) continue;
    if (roots.some((root) => root.schema === value)) continue;
    roots.push({ collection, schema: value as Schema, file, exported });
  }
}

/** The schema identifiers the modules hand to `MongooseModule.forFeature`. */
const registeredSchemaNames = new Set<string>();
for (const file of await sourceFiles(SRC)) {
  const text = await readFile(file, 'utf8');
  if (!text.includes('forFeature')) continue;
  for (const match of text.matchAll(/schema:\s*(\w+)/g)) registeredSchemaNames.add(match[1]);
}

const label = (field: { collection: string; path: string }): string => `${field.collection}.${field.path}`;

/**
 * Free URL and rich-text fields the scan searches for a pasted storage key.
 *
 * Measured from the schemas rather than chosen: this is what
 * `scannableTextFieldsIn` derives today, recorded here so a field added
 * tomorrow fails this guard even though the scan would already search it. The
 * scan deriving the set and the guard declaring it are the two halves of one
 * guarantee — the derivation means a new field is never missed, the
 * declaration means it is never covered without somebody looking at it.
 *
 * Eighteen paths, which is the owner's twelve FIELDS counted per path:
 * `socialLink.url` is embedded in four collections, `heroCta.url` in two slots
 * of a slide, and `aboutSections.href` in three sections.
 */
const SCANNED_FIELDS: readonly { collection: string; path: string; kind: 'richTextLink' | 'urlField' }[] = [
  { collection: 'heroSlides', path: 'primaryCta.url', kind: 'urlField' },
  { collection: 'heroSlides', path: 'secondaryCta.url', kind: 'urlField' },
  { collection: 'navigationItems', path: 'url', kind: 'urlField' },
  { collection: 'pageSections', path: 'ctaUrl', kind: 'urlField' },
  { collection: 'aboutFederationPage', path: 'governance.link.href', kind: 'urlField' },
  { collection: 'aboutFederationPage', path: 'cta.primary.href', kind: 'urlField' },
  { collection: 'aboutFederationPage', path: 'cta.secondary.href', kind: 'urlField' },
  // Both map fields ARE scanned, and the measurement is what decided it: the
  // owner's condition was to exclude them only if validation restricts them to
  // a maps domain, and `upsert-contact-us-page.dto.ts` carries `@IsString()`
  // alone — not even `@IsUrl()`. So the condition is unmet and they are in.
  { collection: 'contactUsPage', path: 'googleMapsUrl', kind: 'urlField' },
  { collection: 'contactUsPage', path: 'map.directionsUrl', kind: 'urlField' },
  { collection: 'contactUsPage', path: 'socialLinks.url', kind: 'urlField' },
  { collection: 'federationPersonnel', path: 'socialLinks.url', kind: 'urlField' },
  { collection: 'athleteProfiles', path: 'socialLinks.url', kind: 'urlField' },
  { collection: 'clubs', path: 'socialLinks.url', kind: 'urlField' },
  { collection: 'liveStreams', path: 'url', kind: 'urlField' },
  { collection: 'videos', path: 'externalUrl', kind: 'urlField' },
  { collection: 'articles', path: 'sourceUrl', kind: 'urlField' },
  // `DocumentFileVariantDto.url` is `@IsString() @MinLength(1)` and the service
  // stores `dto.file` as sent, so an editor supplies this URL like any other.
  { collection: 'documents', path: 'file.en.url', kind: 'urlField' },
  { collection: 'documents', path: 'file.ar.url', kind: 'urlField' },
  // The two rich-text bodies. `RICH_TEXT_MARKS` includes `link`, so an editor
  // can paste a delivery URL into either one.
  { collection: 'articles', path: 'body', kind: 'richTextLink' },
  { collection: 'presidentMessagePage', path: 'messageBody', kind: 'richTextLink' },
];

/**
 * Every id-shaped field that declares no `ref`, each with the reason it is not
 * a hidden media reference.
 *
 * Classified by whether its type field's enum can name `mediaAssets` — decided
 * from the enum, never from the field's name.
 * Four verdicts:
 *
 *  - `live` — the enum can name `mediaAssets` and the reference is current. It
 *    would belong in the scan as a targeted query conditioned on the type
 *    field, NOT on this list. **None today**, and the test below refuses one.
 *  - `historical` — the type can name `mediaAssets`, but the row records that
 *    something happened, which is the opposite of the asset being in use.
 *  - `impossible` — the enum cannot name `mediaAssets`; the justification is
 *    the enum itself, quoted.
 *  - `no-enum` — no closed list exists, so possibility is decided from what
 *    writes the field, and then judged live versus historical. The next
 *    polymorphic field added without an enum needs the same treatment.
 *  - `scanned` — not an id at all: a free-form blob the scan already searches.
 */
const OBJECT_ID_EXCLUSIONS: readonly {
  collection: string;
  path: string;
  verdict: 'live' | 'historical' | 'impossible' | 'no-enum' | 'scanned';
  reason: string;
}[] = [
  {
    collection: 'pageSections',
    path: 'items',
    verdict: 'impossible',
    reason:
      'PAGE_SECTION_ITEM_TARGETS is ten values — athletes, articles, externalMediaCoverage, sponsors, partnerships, championshipEvents, publicEvents, clubs, videos, albums — and no mediaAssets. It does include `videos` and `albums`, which are CONTAINERS of media: a section pointing at an album is not a reference to the asset, and the album own `coverImageId` is the reference, which is an ordinary schema ref already covered.',
  },
  {
    collection: 'pageSections',
    path: 'filters',
    verdict: 'no-enum',
    reason:
      'Free-form JSON: the server-side query configuration for AUTOMATIC mode (category, count, date window). No closed list exists, so possibility is decided from the writer, and nothing writes a media asset id here — the query is over articles, albums, videos and sponsorships, never over one picture.',
  },
  {
    collection: 'pageSections',
    path: 'configuration',
    verdict: 'no-enum',
    reason:
      'Free-form JSON of presentation settings. Decided from the writers, which are measured: PHOTO_GALLERY holds `albumIds`, SPONSORS holds `bannerSponsorshipId`, VIDEO_LIBRARY holds a featured/carousel block, HERO holds `nextEvent` and playback. Album, sponsorship and video ids — never a media asset id. If one is ever written here the verdict becomes `live` and it needs a targeted scan, so this row is the first place to look.',
  },
  {
    collection: 'siteSettings',
    path: 'privacyPolicyPageId',
    verdict: 'no-enum',
    reason:
      'Polymorphic over `pages | staticPages` per the schema comment, with no enum because `staticPages` is not built. Decided from the writer: the site-settings screen stores a page id, and the footer reads it as a page address.',
  },
  {
    collection: 'siteSettings',
    path: 'termsOfUsePageId',
    verdict: 'no-enum',
    reason: 'Same as `privacyPolicyPageId` — the second of the three legal pages, polymorphic over `pages | staticPages`.',
  },
  {
    collection: 'siteSettings',
    path: 'accessibilityStatementPageId',
    verdict: 'no-enum',
    reason: 'Same as `privacyPolicyPageId` — the third of the three legal pages, polymorphic over `pages | staticPages`.',
  },
  {
    collection: 'siteSettings',
    path: 'sponsorStrip.sponsorshipIds',
    verdict: 'impossible',
    reason:
      'The manual selection of the sponsor strip: sponsorship ids, read only when `selection` is `manual`. A sponsorship carries its own `bannerAssetId`, which is an ordinary schema ref already covered.',
  },
  {
    collection: 'siteSettings',
    path: 'sponsorStrip.pinnedSponsorshipId',
    verdict: 'impossible',
    reason: 'One chosen sponsorship at the head of the strip — a sponsorship id, never a file. Same reasoning as `sponsorshipIds`.',
  },
  {
    collection: 'documents',
    path: 'ownerId',
    verdict: 'impossible',
    reason:
      'DOCUMENT_OWNER_TYPES is `Club, Athlete, Coach, Official, Championship, Membership, Sponsorship` — no mediaAssets. A document upload is its own storage record with no `storageKey`.',
  },
  {
    collection: 'albums',
    path: 'championshipId',
    verdict: 'impossible',
    reason:
      'The competitive branch of where an album sits. `championships` is a Domain 3 collection that is not built, which is why there is no `ref:` — the target is a championship, never a picture.',
  },
  {
    collection: 'albums',
    path: 'competitionId',
    verdict: 'impossible',
    reason: 'One competition inside `championshipId` — a single final or day of a championship, not a picture.',
  },
  {
    collection: 'albums',
    path: 'publicEventId',
    verdict: 'impossible',
    reason:
      'The institutional branch: a conference, an honouring, a signing. `publicEvents`, not built yet — mutually exclusive with `championshipId` and never a picture.',
  },
  {
    collection: 'albums',
    path: 'athleteIds',
    verdict: 'impossible',
    reason: 'The athletes an album is about, for the visitor filter. Athlete ids; an athlete profile photo is a schema ref of its own.',
  },
  {
    collection: 'albums',
    path: 'clubIds',
    verdict: 'impossible',
    reason: 'The clubs an album is about, for the visitor filter. Club ids; a club logo is a schema ref of its own.',
  },
  {
    collection: 'liveStreams',
    path: 'associations.ownerId',
    verdict: 'impossible',
    reason:
      'CONTENT_ASSOCIATION_OWNER_TYPES is `championships, sportsEvents, publicEvents, athletes, clubs` — no mediaAssets. The stream thumbnail is `thumbnailId`, a declared ref.',
  },
  {
    collection: 'videos',
    path: 'associations.ownerId',
    verdict: 'impossible',
    reason: 'The same shared `ContentAssociation` enum as `liveStreams` — five owner types, none of them mediaAssets.',
  },
  {
    collection: 'officialAssignments',
    path: 'targetId',
    verdict: 'impossible',
    reason: 'OFFICIAL_ASSIGNMENT_TARGET_TYPES is `Championship, ChampionshipEvent` — two values, no mediaAssets.',
  },
  {
    collection: 'contactMessages',
    path: 'assignedToId',
    verdict: 'impossible',
    reason: 'Polymorphic over `users | roles` per the schema comment: who a citizen message is routed to. Neither is a file.',
  },
  {
    collection: 'sponsorships',
    path: 'targetId',
    verdict: 'impossible',
    reason: 'SPONSORSHIP_TARGET_TYPES is `Federation, Championship, Event` — three values, no mediaAssets.',
  },
  {
    collection: 'notifications',
    path: 'triggerId',
    verdict: 'impossible',
    reason: 'NOTIFICATION_TRIGGER_TYPES is `WorkflowInstance, RecordCandidate, ContactMessage` — three values, no mediaAssets.',
  },
  {
    collection: 'publications',
    path: 'entityId',
    verdict: 'impossible',
    reason:
      'PUBLICATION_ENTITY_TYPES is the twelve-member list in `common/constants/workflow-entity-types.ts` (List A minus contactMessages) and contains no mediaAssets: a picture is not published on its own, it is published as part of a record.',
  },
  {
    collection: 'revisions',
    path: 'entityId',
    verdict: 'impossible',
    reason: 'The same PUBLICATION_ENTITY_TYPES twelve, with no mediaAssets. A revision is of a record, never of a file.',
  },
  {
    collection: 'workflowInstances',
    path: 'entityId',
    verdict: 'impossible',
    reason:
      'WORKFLOW_ENTITY_TYPES is thirteen members — articles, staticPages, externalMediaCoverage, governanceDocuments, strategicPlansPage, visionMissionPage, aboutFederationPage, presidentMessagePage, organizationalStructure, committees, documents, contactMessages, publicEvents — and no mediaAssets, so no approval step can be about one picture.',
  },
  {
    collection: 'auditLogs',
    path: 'entityId',
    verdict: 'historical',
    reason:
      'No enum exists — the schema says the closed list was never captured from the board and the author refused to invent one — and in practice the answer IS mediaAssets, because `AuditLogInterceptor` derives `entityType` from the route, so every media route writes one. It is excluded because the row is history, not usage: the log records that something happened TO the asset, which is the opposite of the asset being in use, and the purge deliberately leaves the log intact (the log is append-only).',
  },
  {
    collection: 'auditLogs',
    path: 'previousValue',
    verdict: 'historical',
    reason:
      'The before-image of a changed record, so it can hold a media id that a field once had. Historical for the same reason as `entityId`: it records a change that already happened, and a purge does not rewrite the log.',
  },
  {
    collection: 'auditLogs',
    path: 'newValue',
    verdict: 'historical',
    reason:
      'The after-image of a changed record, so it can hold a media id. Historical for the same reason: what is live is the record itself, which the scan reads directly, and the log must survive the purge.',
  },
  {
    collection: 'revisions',
    path: 'snapshotData',
    verdict: 'scanned',
    reason:
      'Not an id but a frozen copy of a whole record, and the one class of reference schema metadata cannot see. It is not excluded at all: the revision snapshot scan searches it for every reference path and every pasted key, which is what stops a purge of an asset a live publication still displays.',
  },
];

describe('the media reference scan covers what the schemas declare', () => {

  // Guards the guard: if discovery broke — an import that stopped resolving, a
  // renamed export — every check below would pass over nothing and report
  // green, which is the failure this whole file exists to prevent.
  it('finds a collection-backed schema for every file that declares one', () => {
    expect(roots.length).toBeGreaterThanOrEqual(60);
    expect(roots.map((root) => root.collection)).toContain('mediaAssets');
    expect(roots.map((root) => root.collection)).toContain('revisions');
  });

  it('reads the declared MediaAsset references from metadata, and finds no fewer than were measured', () => {
    const paths = roots.flatMap((root) =>
      referencePathsIn(root.schema, MEDIA_ASSET_MODEL).map((found) => ({
        collection: root.collection,
        path: found.path,
      })),
    );
    const nested = paths.filter((found) => found.path.includes('.'));

    // Floors, not exact numbers: a legitimate new field must not fail the
    // build. The nested count is separate because a total cannot tell 60 found
    // from 47 found with recursion into subdocuments broken.
    expect(paths.length).toBeGreaterThanOrEqual(60);
    expect(nested.length).toBeGreaterThanOrEqual(13);
    expect(paths).toContainEqual({ collection: 'federationPersonnel', path: 'photoId' });
    expect(nested).toContainEqual({ collection: 'articles', path: 'seo.ogImageId' });
    expect(nested).toContainEqual({ collection: 'aboutFederationPage', path: 'timeline.items.imageId' });
  });

  // The scan reads the connection, this guard reads the schema files, and
  // nothing else compares them: an unregistered collection-backed schema would
  // be swept here and never queried there.
  it('registers every collection-backed schema, and expects exactly those collections', () => {
    expect(roots.filter((root) => !registeredSchemaNames.has(root.exported)).map((root) => root.collection)).toEqual(
      [],
    );
    expect([...SCANNED_COLLECTIONS].sort()).toEqual(roots.map((root) => root.collection).sort());
  });

  // A registered schema with no explicit `collection` takes a name Mongoose
  // derives, which this guard cannot read — so the whole collection would be
  // swept by neither clause while its declared refs are still queried.
  it('gives every registered schema an explicit collection', () => {
    const registeredWithoutCollection = [...everySchema.entries()]
      .filter(([exported, schema]) => registeredSchemaNames.has(exported) && typeof schema.get('collection') !== 'string')
      .map(([exported]) => exported);

    expect(registeredWithoutCollection).toEqual([]);
  });

  it('fails when a new URL or rich-text field is neither scanned nor excused', () => {
    const declared = new Set([...SCANNED_FIELDS, ...SCAN_EXCLUSIONS].map(label));

    expect(scannableTextFieldsIn(roots).filter((field) => !declared.has(label(field)))).toEqual([]);
  });

  it('declares the same kind for a scanned field as the scan derives for it', () => {
    const derived = new Map(scannableTextFieldsIn(roots).map((field) => [label(field), field.kind]));

    expect(SCANNED_FIELDS.filter((field) => derived.get(label(field)) !== field.kind)).toEqual([]);
  });

  // Both directions. A declaration that no longer names a live field is a list
  // rotting into a box of excuses, which is how a guard stops guarding.
  it('keeps no scanned or excluded field that the schemas no longer declare', () => {
    const live = new Set(scannableTextFieldsIn(roots).map(label));

    expect([...SCANNED_FIELDS, ...SCAN_EXCLUSIONS].filter((field) => !live.has(label(field)))).toEqual([]);
  });

  it('fails when an id-shaped field with no ref is added without a reason', () => {
    const excused = new Set(OBJECT_ID_EXCLUSIONS.map(label));

    expect(idPathsWithoutRefIn(roots).filter((field) => !excused.has(label(field)))).toEqual([]);
  });

  it('keeps no excused id-shaped field that the schemas no longer declare', () => {
    const live = new Set(idPathsWithoutRefIn(roots).map(label));

    expect(OBJECT_ID_EXCLUSIONS.filter((field) => !live.has(label(field)))).toEqual([]);
  });

  // The verdict that would need new code is `live` — a polymorphic id that can
  // name `mediaAssets` and is a current usage. There is none today; one
  // appearing is a reference class nobody has accounted for, and it gets a
  // targeted query rather than a row on this list.
  it('excuses no id-shaped field as a live reference without a scan behind it', () => {
    expect(OBJECT_ID_EXCLUSIONS.filter((entry) => entry.verdict === 'live')).toEqual([]);
    expect(OBJECT_ID_EXCLUSIONS.filter((entry) => entry.reason.trim().length <= 20)).toEqual([]);
  });

  it('gives every scan exclusion a reason', () => {
    expect(SCAN_EXCLUSIONS.filter((entry) => entry.reason.trim().length <= 20)).toEqual([]);
  });
});

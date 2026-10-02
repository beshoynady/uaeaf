import { Schema as MongooseSchema, Types } from 'mongoose';
import type { Connection, Model, Schema, SchemaType } from 'mongoose';
import { RICH_TEXT_LANGS, RICH_TEXT_MAX_DEPTH } from '../rich-text/rich-text-allowlist.js';

/**
 * Is this media file still used?
 *
 * The one answer everything that destroys or withdraws a media asset asks
 * first: the permanent delete, the unused-media report, the in-use archive
 * warning, and the album that is about to stop referencing a photo. One
 * function, because several callers need it and a second copy would drift
 * from the first — and because the copy that drifted would be the one in
 * front of an irreversible delete.
 *
 * Three sources of a reference, none of them optional:
 *
 *  1. **Schema refs, read from Mongoose's metadata at runtime.** 41 fields
 *     across 25 schema files declare `ref: 'MediaAsset'` today. A hand-written
 *     list stops being a check the day somebody adds the 42nd field, and stops
 *     silently. Derived from the schemas, a new field is covered because it
 *     exists, not because anybody remembered it.
 *  2. **`revisions.snapshotData`.** A published revision is a frozen copy of a
 *     record, so an id inside it is embedded JSON and no schema walk can see
 *     it. Without this, purging an asset a live publication still displays
 *     would succeed.
 *  3. **Hand-pasted storage links.** `RICH_TEXT_MARKS` includes `link` and ten
 *     plain string fields accept one, so an editor can paste a delivery URL
 *     into a body or a CTA. Matched on the `storageKey`, never on the whole
 *     URL: the provider puts transformations and a version into the delivered
 *     URL, so a full-URL match misses every transformed copy of the same file.
 *
 * **Fail-closed.** If any part of the check cannot complete, this throws
 * `MediaReferenceCheckFailedError` and never answers an empty list. A `catch`
 * that swallowed an error into `[]` would destroy a referenced file.
 *
 * Its coverage is guarded by `media-reference-coverage.spec.ts`, which fails
 * when a field the scan cannot follow is added to any schema.
 */

export const MEDIA_ASSET_MODEL = 'MediaAsset';
export const MEDIA_ASSETS_COLLECTION = 'mediaAssets';
export const REVISIONS_COLLECTION = 'revisions';
export const SNAPSHOT_PATH = 'snapshotData';
const STORAGE_KEY_PATH = 'file.storageKey';

/** The collections the scan must see on the connection, and refuses without: an
 *  unregistered collection is never queried, so a short roster would answer "no
 *  references" about documents nobody read. The coverage guard proves the list. */
export const SCANNED_COLLECTIONS = [
  'aboutFederationPage',
  'ageCategories',
  'albums',
  'albumsPage',
  'articles',
  'athleteClubHistory',
  'athleteCoachHistory',
  'athleteGuardianRelationships',
  'athleteNationalTeamHistory',
  'athleteProfiles',
  'athletes',
  'athletesPage',
  'auditLogs',
  'authSessions',
  'boardMembersPage',
  'clubTeams',
  'clubs',
  'clubsPage',
  'coachClubHistory',
  'coaches',
  'coachesPage',
  'committees',
  'committeesPage',
  'contactMessages',
  'contactUsPage',
  'countries',
  'disciplines',
  'disciplinesPage',
  'documents',
  'electionCycles',
  'federation',
  'federationAppointments',
  'federationPersonnel',
  'federationPositions',
  'governanceDocuments',
  'heroSlides',
  'liveStreams',
  'mediaAssets',
  'memberships',
  'navigationItems',
  'navigationMenus',
  'newsPage',
  'notifications',
  'officialAssignments',
  'officialClubHistory',
  'officialProfiles',
  'officials',
  'organizationalStructure',
  'pageSections',
  'pages',
  'partnerships',
  'permissions',
  'presidentMessagePage',
  'publications',
  'recordsPage',
  'resultsRankingsPage',
  'revisions',
  'roles',
  'seasons',
  'siteSettings',
  'sponsors',
  'sponsorships',
  'strategicPlansPage',
  'users',
  'venues',
  'videos',
  'videosPage',
  'visionMissionPage',
  'workflowActionHistory',
  'workflowDefinitions',
  'workflowInstances',
  'workflowPolicies',
  'workflowSteps',
] as const;

export type MediaReferrerKind = 'ref' | 'richTextLink' | 'urlField';

/** One shape for every referrer, everywhere: the refusal list, the unused
 *  report and the archive warning all read the same rows. */
export interface MediaAssetReferrer {
  collection: string;
  path: string;
  documentId: string;
  kind: MediaReferrerKind;
}

export interface IgnoredDocument {
  collection: string;
  documentId: string;
}

export interface FindMediaAssetReferrersOptions {
  /** `false` counts live references only — a revision is permanent history,
   *  and archiving is reversible, so the orphan report and the archive warning
   *  must not treat a frozen snapshot as a reason to keep a file. */
  includeRevisions?: boolean;
  /**
   * Referrers to drop before answering. The album removing a photo passes
   * itself: it is about to stop referencing the asset, so counting its own row
   * would mean an asset used nowhere else is never archived.
   *
   * **Never populated from a request body.** It suppresses referrers, so a
   * caller who could fill it could hide the reference that refuses their
   * permanent delete. A route names the document IT is about to change, and
   * nothing else.
   */
  ignore?: readonly IgnoredDocument[];
}

/**
 * The check could not complete — which is not the same answer as "nothing
 * references it", and must never be turned into it.
 *
 * `unchecked` names what could not be read, so the refusal can say so, and
 * `code` is the string the API answers with.
 */
export class MediaReferenceCheckFailedError extends Error {
  readonly code = 'referenceCheckFailed';

  constructor(readonly unchecked: readonly string[]) {
    super(`The media reference check could not complete. Unchecked: ${unchecked.join(', ')}.`);
    this.name = 'MediaReferenceCheckFailedError';
  }
}

// ---------------------------------------------------------------------------
// Reading Mongoose's metadata
//
// Measured on this project's Mongoose (9.9.4) before this was written, because
// the obvious reading is wrong for one shape. For an array of refs written the
// natural way — `[{ type: ObjectId, ref: 'MediaAsset' }]` — `options.ref`,
// `caster` and `$embeddedSchemaType` are ALL undefined, and the ref is
// readable only at `options.type[0].ref`. A walk that reads the caster (which
// is what the older documentation suggests) reports "no references" for a
// field that holds them.
// ---------------------------------------------------------------------------

/** The internals this walk reads. Every member is optional and the cast below
 *  severs any tie to `SchemaType`, so a property a future major removes reads as
 *  `undefined` with no diagnostic — which is what the coverage guard is for. */
export interface WalkableType {
  instance?: string;
  options?: Record<string, unknown>;
  schema?: Schema;
  caster?: { instance?: string; options?: Record<string, unknown> };
  $embeddedSchemaType?: { instance?: string; options?: Record<string, unknown> };
  /** The path's own cast, which is the only reading of a path that cannot be
   *  fooled by metadata: it answers what a stored value would become. */
  cast?: (value: unknown) => unknown;
}

const asWalkable = (type: SchemaType): WalkableType => type as unknown as WalkableType;

const OBJECT_ID_INSTANCES = new Set(['ObjectID', 'ObjectId']);

/**
 * Both ObjectId classes, because a schema can be handed either.
 *
 * `Types.ObjectId` is bson's, named `ObjectId`. `MongooseSchema.Types.ObjectId`
 * is the schema-layer one the schemas declare — it is a different class, its
 * `name` is `SchemaObjectId`, and it announces itself through `schemaName`
 * instead. Reading only the bson name misses every array path: an array's
 * `caster` and `$embeddedSchemaType` are both `undefined` on 9.9.4, so the
 * declared element type is the only thing left to read, and
 * `albums.athleteIds` would report as no id at all.
 */
const isObjectIdConstructor = (declared: unknown): boolean => {
  if (declared === Types.ObjectId || declared === MongooseSchema.Types.ObjectId) return true;
  if (typeof declared !== 'function') return false;
  return declared.name === 'ObjectId' || (declared as { schemaName?: unknown }).schemaName === 'ObjectId';
};

const isStringConstructor = (declared: unknown): boolean =>
  declared === String || (typeof declared === 'function' && declared.name === 'SchemaString');

/** True for a declared type and for an array of it, read from every place
 *  9.9.4 puts the information. Widened deliberately: an ObjectId this misses
 *  is a hidden reference the coverage guard would never flag. */
const isDeclared = (type: WalkableType, matches: (declared: unknown) => boolean, instances: Set<string>): boolean => {
  if (instances.has(type.instance ?? '')) return true;
  if (instances.has(type.caster?.instance ?? '')) return true;
  if (instances.has(type.$embeddedSchemaType?.instance ?? '')) return true;
  const declared = type.options?.type;
  if (matches(declared)) return true;
  if (Array.isArray(declared)) {
    const first = declared[0] as { type?: unknown } | undefined;
    return matches(first) || matches(first?.type);
  }
  return false;
};

const isObjectIdPath = (type: WalkableType): boolean =>
  isDeclared(type, isObjectIdConstructor, OBJECT_ID_INSTANCES);

const isStringPath = (type: WalkableType): boolean => isDeclared(type, isStringConstructor, new Set(['String']));

/**
 * A path Mongoose cannot type.
 *
 * Swept alongside the real `ObjectId` paths, and kept even though the schemas
 * no longer produce one by accident. `@nestjs/mongoose` recognises a declared
 * type as a Mongoose type only when its prototype chain reaches
 * `mongoose.SchemaType` (`definitions.factory.js: isMongooseSchemaType`).
 * `Types.ObjectId` is the **bson** class, whose chain does not, so Nest treats
 * it as an ordinary class, builds an empty definition from it and hands
 * Mongoose `{ type: {} }` — a `Mixed` path holding an id that nothing casts.
 * Every reference is declared with the schema-layer class now, and
 * `reference-path-typing.spec.ts` is what keeps it that way; this stays because
 * an untyped path is at least as opaque as an ObjectId with no `ref`, so the
 * wider set is the safer one to sweep in front of an irreversible delete.
 *
 * `type: Object`, which five paths declare deliberately, collapses to the same
 * `{}` — so this reading cannot tell a free-form document from a mis-declared
 * id, and does not try to. Both are swept.
 */
const isEmptyObjectDeclaration = (declared: unknown): boolean =>
  typeof declared === 'object' &&
  declared !== null &&
  !Array.isArray(declared) &&
  Object.getOwnPropertyNames(declared).length === 0;

const isUntypedPath = (type: WalkableType): boolean => {
  if (type.instance === 'Mixed') return true;
  if (type.caster?.instance === 'Mixed' || type.$embeddedSchemaType?.instance === 'Mixed') return true;
  // An Array path's `caster` is undefined on 9.9.4 whatever it holds, so only
  // the declaration itself can name a bare id array.
  const declared = type.options?.type;
  return isEmptyObjectDeclaration(declared) || (Array.isArray(declared) && isEmptyObjectDeclaration(declared[0]));
};

/** Every place a `ref` (or a `refPath`) can be declared, for one path. */
export const declaredOn = (type: WalkableType, key: 'ref' | 'refPath'): unknown[] => {
  const arrayType = type.options?.type;
  const inArray = Array.isArray(arrayType) ? (arrayType[0] as Record<string, unknown> | undefined) : undefined;
  return [
    type.options?.[key],
    inArray?.[key],
    type.caster?.options?.[key],
    type.$embeddedSchemaType?.options?.[key],
  ].filter((value) => value !== undefined && value !== null);
};

/** A single-nested path holding one ProseMirror document per language — the
 *  `LocalizedRichText` shape. Detected structurally rather than by field name,
 *  so a second rich-text field is covered the day it is declared. */
const isRichTextPath = (type: WalkableType): boolean => {
  const schema = type.schema;
  if (!schema) return false;
  const keys = Object.keys(schema.paths).filter((key) => key !== '_id' && key !== '__v');
  if (keys.length !== RICH_TEXT_LANGS.length) return false;
  return RICH_TEXT_LANGS.every((lang) => {
    const path = schema.paths[lang] as SchemaType | undefined;
    return path !== undefined && asWalkable(path).instance === 'Mixed';
  });
};

export type LeafVisitor = (path: string, type: WalkableType) => void;

/**
 * Every path a schema declares, sub-schemas walked in place and
 * discriminators with them.
 *
 * Array segments are joined with `.` and no `$`, because that is how a Mongo
 * filter addresses an element's field: `slides.imageId` matches any element.
 * `stack` is a recursion stack rather than a visited set — `LocalizedTextSchema`
 * is the same schema object at dozens of paths, and a visited set would walk
 * it once and skip the rest.
 */
export const walkPaths = (schema: Schema, visit: LeafVisitor, prefix = '', stack: readonly Schema[] = []): void => {
  if (stack.includes(schema)) return;
  const nested = [...stack, schema];
  for (const [key, raw] of Object.entries(schema.paths)) {
    if (key === '_id' || key === '__v') continue;
    const type = asWalkable(raw);
    const path = prefix ? `${prefix}.${key}` : key;
    visit(path, type);
    if (type.schema && !isRichTextPath(type)) walkPaths(type.schema, visit, path, nested);
  }
  for (const child of discriminatorSchemasOf(schema)) {
    walkPaths(child, visit, prefix, nested);
  }
};

/**
 * The discriminator schemas of a schema, from both places Mongoose keeps them.
 *
 * `Model.discriminator()` fills `schema.discriminators`; `Schema.discriminator()`
 * only records the child in `_applyDiscriminators` and waits for a model to be
 * compiled. Reading one and not the other leaves a whole shape unsupported
 * depending on which spelling declared it.
 */
const discriminatorSchemasOf = (schema: Schema): Schema[] => {
  const deferred = (schema as unknown as { _applyDiscriminators?: Map<string, unknown> })._applyDiscriminators;
  const candidates: unknown[] = [
    ...Object.values(schema.discriminators ?? {}),
    ...(deferred ? [...deferred.values()] : []),
  ];
  return candidates
    .map((candidate) =>
      candidate instanceof MongooseSchema
        ? candidate
        : ((candidate as { schema?: unknown } | null)?.schema as Schema | undefined),
    )
    .filter((candidate): candidate is Schema => candidate instanceof MongooseSchema);
};

export interface ReferencePath {
  path: string;
}

/** The paths of one schema that point at `modelName`, in all five shapes:
 *  direct, array (both spellings), nested subdocument, document array and
 *  discriminator. */
export const referencePathsIn = (schema: Schema, modelName: string): ReferencePath[] => {
  const found = new Map<string, ReferencePath>();
  walkPaths(schema, (path, type) => {
    if (declaredOn(type, 'ref').includes(modelName)) found.set(path, { path });
  });
  return [...found.values()];
};

export interface DynamicReferencePath {
  path: string;
  /** The field naming the model, as declared. `null` when the `ref` is a
   *  function, which cannot be resolved without a document either. */
  typePath: string | null;
}

/**
 * Paths whose target is decided at runtime — a `refPath`, or a `ref` declared
 * as a function.
 *
 * Reported separately rather than dropped. The scan queries them for the
 * asset's id without the type condition, which can only over-report: an
 * ObjectId equal to this asset's `_id` is this asset, whatever the type field
 * beside it says.
 */
export const dynamicReferencePathsIn = (schema: Schema): DynamicReferencePath[] => {
  const found = new Map<string, DynamicReferencePath>();
  walkPaths(schema, (path, type) => {
    const refPaths = declaredOn(type, 'refPath').filter((value): value is string => typeof value === 'string');
    if (refPaths.length > 0) {
      found.set(path, { path, typePath: refPaths[0] });
      return;
    }
    if (declaredOn(type, 'ref').some((value) => typeof value === 'function')) {
      found.set(path, { path, typePath: null });
    }
  });
  return [...found.values()];
};

export interface SchemaRoot {
  collection: string;
  schema: Schema;
}

export const schemaRootsOf = (connection: Connection): SchemaRoot[] =>
  Object.values(connection.models).map((model) => ({
    collection: model.collection.collectionName,
    schema: model.schema,
  }));

/** Every declared reference to `modelName` across the connection, with the
 *  collection that declares it. */
export const referencePathsFor = (
  connection: Connection,
  modelName: string,
): { collection: string; path: string }[] => {
  const found = new Map<string, { collection: string; path: string }>();
  for (const root of schemaRootsOf(connection)) {
    for (const { path } of referencePathsIn(root.schema, modelName)) {
      found.set(`${root.collection}.${path}`, { collection: root.collection, path });
    }
  }
  return [...found.values()];
};

// ---------------------------------------------------------------------------
// The text scan: where a hand-pasted storage link can sit
// ---------------------------------------------------------------------------

/** A free URL field, by its last segment. */
const URL_LEAF = /(?:url|uri|href|link)$/i;

/** A picture-shaped name anywhere in the path. Applied to the whole path, not
 *  the leaf, so a localized `heroImageAlt.en` is covered too. */
const MEDIA_IN_PATH = /photo|image|logo|cover|thumbnail|media|asset/i;

export interface ScannableTextField {
  collection: string;
  path: string;
  kind: 'richTextLink' | 'urlField';
}

/**
 * Every string-typed or rich-text path a pasted storage link could sit in,
 * derived from the schemas rather than listed.
 *
 * Deriving it means a new URL field is scanned the day it is declared, before
 * anybody remembers to register it — while the coverage guard still fails, so
 * the new field is classified on purpose rather than covered by accident.
 * Returns the candidates INCLUDING the excluded ones: the guard needs the
 * whole candidate set, and the scan filters.
 */
export const scannableTextFieldsIn = (roots: readonly SchemaRoot[]): ScannableTextField[] => {
  const found = new Map<string, ScannableTextField>();
  for (const root of roots) {
    walkPaths(root.schema, (path, type) => {
      const key = `${root.collection}.${path}`;
      if (isRichTextPath(type)) {
        found.set(key, { collection: root.collection, path, kind: 'richTextLink' });
        return;
      }
      if (!isStringPath(type)) return;
      const leaf = path.slice(path.lastIndexOf('.') + 1);
      if (URL_LEAF.test(leaf) || MEDIA_IN_PATH.test(path)) {
        found.set(key, { collection: root.collection, path, kind: 'urlField' });
      }
    });
  }
  return [...found.values()];
};

/**
 * Every path that could hold a document id nothing declares a target for: an
 * `ObjectId` with no `ref` and no `refPath`, and every untyped (`Mixed`) path,
 * which could hold one without saying so (see `isUntypedPath`).
 *
 * What the coverage guard sweeps. Exported from here so the guard walks the
 * same tree the scan walks, rather than a second one that could disagree with
 * it.
 */
export const idPathsWithoutRefIn = (
  roots: readonly SchemaRoot[],
): { collection: string; path: string; declaredAs: 'ObjectId' | 'Mixed' }[] => {
  const found = new Map<string, { collection: string; path: string; declaredAs: 'ObjectId' | 'Mixed' }>();
  for (const root of roots) {
    walkPaths(root.schema, (path, type) => {
      const objectId = isObjectIdPath(type);
      if (!objectId && !isUntypedPath(type)) return;
      if (declaredOn(type, 'ref').length > 0 || declaredOn(type, 'refPath').length > 0) return;
      found.set(`${root.collection}.${path}`, {
        collection: root.collection,
        path,
        declaredAs: objectId ? 'ObjectId' : 'Mixed',
      });
    });
  }
  return [...found.values()];
};

/** Fields the text scan does not search, each with its reason. Every entry is a
 *  field the derivation above would otherwise scan: the coverage guard checks
 *  both directions, so an entry naming nothing live fails it. */
export const SCAN_EXCLUSIONS = [
  {
    collection: 'mediaAssets',
    path: 'file.url',
    reason:
      "The asset's own file. It is the thing being deleted, not a reference to it — scanning it would make every asset reference itself and nothing would ever be purgeable.",
  },
  {
    collection: 'mediaAssets',
    path: 'file.photographer',
    reason: "A person's name, a credit line. It holds no storage location.",
  },
  {
    collection: 'heroSlides',
    path: 'mediaType',
    reason: 'A closed enum — `HERO_SLIDE_MEDIA_TYPES` is `IMAGE | VIDEO` — not a file.',
  },
  {
    collection: 'heroSlides',
    path: 'ltrImageMode',
    reason: 'A closed enum — `LTR_IMAGE_MODES` is `same | mirror | separate` — not a file.',
  },
] as const;

const EXCLUDED = new Set(SCAN_EXCLUSIONS.map((entry) => `${entry.collection}.${entry.path}`));

export const isScanExcluded = (collection: string, path: string): boolean =>
  EXCLUDED.has(`${collection}.${path}`);

/** Where a storage key can sit in a stored ProseMirror document: a link mark's
 *  `href`, and a node's plain text. Mongo's dotted paths traverse arrays, and
 *  the depths come from `RICH_TEXT_MAX_DEPTH`, the allowlist's own cap. */
const richTextProbePaths = (path: string): string[] => {
  const paths: string[] = [];
  for (const lang of RICH_TEXT_LANGS) {
    for (let depth = 1; depth < RICH_TEXT_MAX_DEPTH; depth += 1) {
      const nested = `${path}.${lang}.${'content.'.repeat(depth)}`;
      paths.push(`${nested}marks.attrs.href`, `${nested}text`);
    }
  }
  return paths;
};

/** A storageKey is provider-generated, but it reaches a regex and must not be
 *  able to alter the query it lands in. */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------

interface Candidate {
  id: Types.ObjectId;
  idText: string;
  storageKey: string;
}

interface Clause {
  /** The path reported to a reader, which for rich text is the field rather
   *  than the generated `content.…marks.attrs.href` it matched at. */
  path: string;
  kind: MediaReferrerKind;
  /** The paths actually inspected in a matched document. */
  probes: string[];
  filter: Record<string, unknown>;
}

/**
 * Refuses anything that is not an id instead of forwarding it into a filter.
 *
 * `{ $ne: null }` arriving here would match every document, and
 * `new Types.ObjectId(null)` mints a random id rather than throwing — so the
 * check would answer about an asset nobody asked about.
 */
const toObjectId = (value: Types.ObjectId | string): Types.ObjectId => {
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  throw new TypeError('A media asset id must be an ObjectId or a 24-character hex string.');
};

const modelForCollection = (connection: Connection, collection: string): Model<unknown> | undefined =>
  Object.values(connection.models).find((model) => model.collection.collectionName === collection) as
    | Model<unknown>
    | undefined;

/** Values at a dotted path, traversing arrays the way a Mongo filter does. */
const valuesAt = (value: unknown, segments: readonly string[]): unknown[] => {
  if (segments.length === 0) return [value];
  if (Array.isArray(value)) return value.flatMap((item) => valuesAt(item, segments));
  if (value !== null && typeof value === 'object') {
    const next = (value as Record<string, unknown>)[segments[0]];
    return next === undefined ? [] : valuesAt(next, segments.slice(1));
  }
  return [];
};

const holdsKey = (value: unknown, storageKey: string): boolean => {
  if (typeof value === 'string') return value.includes(storageKey);
  if (Array.isArray(value)) return value.some((item) => holdsKey(item, storageKey));
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) => holdsKey(item, storageKey));
  }
  return false;
};

/** A projection that keeps every inspected path without asking Mongo for two
 *  paths where one contains the other, which it refuses. */
const minimalProjection = (paths: readonly string[]): Record<string, 1> => {
  const kept = paths.filter((path) => !paths.some((other) => other !== path && path.startsWith(`${other}.`)));
  return Object.fromEntries([...new Set(kept)].map((path) => [path, 1] as const));
};

interface RootFields {
  idPaths: string[];
  textFields: ScannableTextField[];
}

/** Read once per root and used by both passes: the walk is the expensive part,
 *  and the snapshot pass asks the same schemas the same questions. */
const fieldsOf = (root: SchemaRoot): RootFields => ({
  idPaths: [
    ...referencePathsIn(root.schema, MEDIA_ASSET_MODEL).map((found) => found.path),
    ...dynamicReferencePathsIn(root.schema).map((found) => found.path),
  ],
  textFields: scannableTextFieldsIn([root]).filter((field) => !isScanExcluded(field.collection, field.path)),
});

const clausesFrom = (
  fields: RootFields,
  idFilter: Record<string, unknown>,
  keyPattern: RegExp,
  snapshotPrefix: string | null,
): Clause[] => {
  const prefixed = (path: string): string => (snapshotPrefix ? `${snapshotPrefix}.${path}` : path);
  const clauses: Clause[] = [];

  for (const idPath of fields.idPaths) {
    const path = prefixed(idPath);
    clauses.push({ path, kind: 'ref', probes: [path], filter: { [path]: idFilter } });
  }
  for (const field of fields.textFields) {
    const path = prefixed(field.path);
    const probes = field.kind === 'richTextLink' ? richTextProbePaths(path) : [path];
    clauses.push({
      path,
      kind: field.kind,
      probes: field.kind === 'richTextLink' ? [path] : probes,
      filter: probes.length === 1 ? { [probes[0]]: keyPattern } : { $or: probes.map((probe) => ({ [probe]: keyPattern })) },
    });
  }
  return clauses;
};

/** One clause per (kind, path). Several collections contribute the same
 *  snapshot path — `logoId` is declared by four of them — and a repeated clause
 *  would report the same referrer twice. */
const uniqueClauses = (clauses: readonly Clause[]): Clause[] => [
  ...new Map(clauses.map((clause) => [`${clause.kind}:${clause.path}`, clause])).values(),
];

const referrersInDocument = (
  collection: string,
  document: Record<string, unknown>,
  clauses: readonly Clause[],
  candidates: readonly Candidate[],
): { referrer: MediaAssetReferrer; assetId: string }[] => {
  const documentId = String(document._id);
  const found: { referrer: MediaAssetReferrer; assetId: string }[] = [];
  for (const clause of clauses) {
    for (const candidate of candidates) {
      const matched = clause.probes.some((probe) => {
        const values = valuesAt(document, probe.split('.'));
        return clause.kind === 'ref'
          ? values.some((value) => value !== null && value !== undefined && String(value) === candidate.idText)
          : values.some((value) => holdsKey(value, candidate.storageKey));
      });
      if (matched) {
        found.push({
          referrer: { collection, path: clause.path, documentId, kind: clause.kind },
          assetId: candidate.idText,
        });
      }
    }
  }
  return found;
};

/** The stored `storageKey` of each candidate. One query whatever the count,
 *  and fail-closed: without the key the text scan cannot run at all, and an
 *  empty key would become a regex that matches every string. */
const candidatesFor = async (
  connection: Connection,
  ids: readonly Types.ObjectId[],
  unchecked: string[],
): Promise<Candidate[]> => {
  const model = modelForCollection(connection, MEDIA_ASSETS_COLLECTION);
  if (!model) {
    unchecked.push(MEDIA_ASSETS_COLLECTION);
    return [];
  }
  let rows: Record<string, unknown>[] = [];
  try {
    // One id spelling here, unlike the referrer queries: `_id` is a real
    // ObjectId path, and a row this misses yields no key, so it is refused
    // rather than reported as unreferenced.
    rows = (await model
      .find({ _id: { $in: [...ids] } }, { [STORAGE_KEY_PATH]: 1 })
      .lean()
      .exec()) as Record<string, unknown>[];
  } catch {
    unchecked.push(`${MEDIA_ASSETS_COLLECTION}.${STORAGE_KEY_PATH}`);
    return [];
  }

  const byId = new Map(rows.map((row) => [String(row._id), row]));
  const candidates: Candidate[] = [];
  for (const id of ids) {
    const idText = id.toString();
    const row = byId.get(idText);
    const storageKey = row ? String(valuesAt(row, STORAGE_KEY_PATH.split('.'))[0] ?? '') : '';
    if (!storageKey.trim()) {
      unchecked.push(`${MEDIA_ASSETS_COLLECTION}.${STORAGE_KEY_PATH} of ${idText}`);
      continue;
    }
    candidates.push({ id, idText, storageKey });
  }
  return candidates;
};

/**
 * The whole scan, for one asset or for a batch. Both forms share it, which is
 * why they cannot disagree, and the query count is one per collection plus one
 * for the keys and one for the revisions — independent of how many candidates
 * are asked about.
 */
const scan = async (
  connection: Connection,
  ids: readonly Types.ObjectId[],
  { includeRevisions = true, ignore = [] }: FindMediaAssetReferrersOptions,
): Promise<Map<string, MediaAssetReferrer[]>> => {
  const byAsset = new Map<string, MediaAssetReferrer[]>(ids.map((id) => [id.toString(), []]));
  if (ids.length === 0) return byAsset;

  const unchecked: string[] = [];
  const candidates = await candidatesFor(connection, ids, unchecked);
  const roots = schemaRootsOf(connection);
  // A collection with no model on this connection produces no query, so its
  // documents are never read and their references never found.
  const present = new Set(roots.map((root) => root.collection));
  unchecked.push(...SCANNED_COLLECTIONS.filter((collection) => !present.has(collection)));
  if (unchecked.length > 0) throw new MediaReferenceCheckFailedError(unchecked);

  const keyPattern = new RegExp(candidates.map((candidate) => escapeRegex(candidate.storageKey)).join('|'));
  const ignored = new Set(ignore.map((entry) => `${entry.collection}.${entry.documentId}`));

  const record = (collection: string, documents: Record<string, unknown>[], clauses: readonly Clause[]): void => {
    for (const document of documents) {
      for (const { referrer, assetId } of referrersInDocument(collection, document, clauses, candidates)) {
        if (ignored.has(`${referrer.collection}.${referrer.documentId}`)) continue;
        byAsset.get(assetId)?.push(referrer);
      }
    }
  };

  // Both spellings of the same id, because a row written before the reference
  // paths were typed could hold either and MongoDB compares the BSON type
  // before the value.
  //
  // ⚠️ Measured: on a real `ObjectId` path Mongoose casts every member of an
  // `$in`, so the string half arrives as the ObjectId it already carries and
  // adds nothing. These queries go through the model, so a reference genuinely
  // stored as a string is invisible to them — and this scan is what stands
  // between a permanent delete and a published page. Nothing is known to be
  // stored that way; `npm run convert:reference-ids` is what settles it for a
  // given database. Recorded here rather than worked around, because making
  // this filter uncastable changes what the delete refusal reads and that is
  // not a change to make silently.
  const idFilter = { $in: [...ids, ...ids.map((id) => id.toString())] };

  // Grouped by collection, not by model: a discriminator is a second model on
  // the same collection, and querying it separately would read the same
  // documents twice. The paths of both are in the one filter instead.
  const byCollection = new Map<string, Clause[]>();
  const add = (collection: string, clauses: readonly Clause[]): void => {
    if (clauses.length > 0) byCollection.set(collection, [...(byCollection.get(collection) ?? []), ...clauses]);
  };

  // A snapshot is a frozen copy of one of the other collections, so what it can
  // hold is the union of their paths, under `snapshotData`. `revisions` own
  // declared paths are scanned like any collection's, in the same query.
  const snapshotClauses: Clause[] = [];
  for (const root of roots) {
    const fields = fieldsOf(root);
    add(root.collection, clausesFrom(fields, idFilter, keyPattern, null));
    if (includeRevisions && root.collection !== REVISIONS_COLLECTION) {
      snapshotClauses.push(...clausesFrom(fields, idFilter, keyPattern, SNAPSHOT_PATH));
    }
  }
  add(REVISIONS_COLLECTION, snapshotClauses);

  for (const [collection, clauses] of byCollection) {
    const unique = uniqueClauses(clauses);
    const model = modelForCollection(connection, collection);
    if (!model) {
      unchecked.push(collection);
      continue;
    }
    try {
      const documents = (await model
        .find(
          { $or: unique.map((clause) => clause.filter) },
          minimalProjection(unique.flatMap((clause) => clause.probes)),
        )
        .lean()
        .exec()) as Record<string, unknown>[];
      record(collection, documents, unique);
    } catch {
      unchecked.push(collection);
    }
  }

  if (unchecked.length > 0) throw new MediaReferenceCheckFailedError(unchecked);
  return byAsset;
};

/**
 * Everything that still points at this media asset.
 *
 * @throws MediaReferenceCheckFailedError when any part of the check could not
 *   run. There is no path on which that becomes an empty list.
 * @throws TypeError when the id is not an id.
 */
export const findMediaAssetReferrers = async (
  connection: Connection,
  assetId: Types.ObjectId | string,
  options: FindMediaAssetReferrersOptions = {},
): Promise<MediaAssetReferrer[]> => {
  const id = toObjectId(assetId);
  const byAsset = await scan(connection, [id], options);
  return byAsset.get(id.toString()) ?? [];
};

/**
 * Which of these assets are referenced — the batch form the unused-media
 * report reads.
 *
 * The same field map and the same searches as the single form, with one query
 * per collection for all candidates rather than one per candidate.
 *
 * @throws MediaReferenceCheckFailedError when any part of the check could not
 *   run, for the whole batch: reporting the rest as unused would offer a
 *   permanent delete for files that were never checked.
 */
export const findReferencedMediaAssetIds = async (
  connection: Connection,
  candidateIds: readonly (Types.ObjectId | string)[],
  options: FindMediaAssetReferrersOptions = {},
): Promise<Set<string>> => {
  // Deduplicated: the same id twice would match twice and report the referrer
  // twice.
  const ids = [...new Map(candidateIds.map(toObjectId).map((id) => [id.toString(), id])).values()];
  const byAsset = await scan(connection, ids, options);
  return new Set([...byAsset.entries()].filter(([, referrers]) => referrers.length > 0).map(([id]) => id));
};

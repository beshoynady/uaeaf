import { Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { declaredOn, schemaRootsOf, walkPaths } from '../common/authz/media-references.js';
import type { WalkableType } from '../common/authz/media-references.js';

/**
 * Converts a stored reference that is a string into an `ObjectId`.
 *
 * Every reference path in the schemas is a real `ObjectId` path, so every write
 * the application makes casts before it stores. Before that was true a `PATCH`
 * could pass a DTO's raw string through an untyped path and store it as a
 * string — and MongoDB compares the BSON type before the value, so an
 * `ObjectId` filter never matches such a row again. The reference is still
 * there and every query says it is not.
 *
 * Nothing is known to be stored as a string today; this is the safety net for a
 * database whose state nobody has read. So the dry run is the default and a
 * write takes an explicit flag: a maintenance script whose default is
 * destructive is one mistyped command from a rewrite nobody asked for.
 *
 * The work list is derived from the schemas at runtime — every path whose
 * declared options carry a `ref` or a `refPath` — never from a list of
 * collections written by hand, because a hand-written list is the one that gets
 * missed. Paths that are id-shaped but declare no target are **not** converted;
 * `unreferencedIdPathsIn` reports them so the gap is visible before the run
 * rather than discovered after it.
 *
 * Idempotent: a second run finds nothing and reports zero.
 */

/**
 * 24 hex digits, and nothing else — the only string that is the same id written
 * a different way.
 *
 * Stated here rather than delegated to `Types.ObjectId.isValid`, and the
 * measurement is the argument: on this project's bson, `isValid` agrees for
 * every string (it refuses `'twelve-chars'`, and the constructor throws for
 * it), but earlier versions accepted any twelve-character string and read it as
 * raw bytes, turning a label into a perfectly valid id pointing at nothing.
 * What counts as a convertible value in a data migration should not move when a
 * transitive dependency changes its mind.
 *
 * `null` and `undefined` never reach a cast at all — only values that are
 * already `typeof 'string'` are considered. Measured, because it does not
 * refuse: `new Types.ObjectId(null)` and `new Types.ObjectId(undefined)` each
 * mint a brand-new random id (see `setObjectIdField` in
 * `common/utils/partial-update.util.ts`).
 */
const OBJECT_ID_HEX = /^[0-9a-f]{24}$/i;

export interface ReferenceIdPath {
  collection: string;
  path: string;
}

export interface RefusedValue {
  documentId: string;
  /** The concrete location, array indices included — where to look by hand. */
  at: string;
  value: string;
}

export interface ReferenceConversionRow {
  collection: string;
  path: string;
  /** Documents holding at least one string at this path. */
  documents: number;
  /** String values that are convertible — written when `write` is set. */
  values: number;
  /** Strings that are not an id, reported and never coerced. */
  invalid: RefusedValue[];
}

export interface ReferenceConversionReport {
  wrote: boolean;
  rows: ReferenceConversionRow[];
  /** What the sweep covered, so an empty report cannot be mistaken for an
   *  empty sweep. */
  scanned: { collections: number; paths: number };
  converted: number;
  /** Id-shaped paths with no declared target, outside this conversion. */
  skippedWithoutRef: ReferenceIdPath[];
}

const OBJECT_ID_INSTANCES = new Set(['ObjectID', 'ObjectId']);

const isReference = (type: WalkableType): boolean =>
  declaredOn(type, 'ref').length > 0 || declaredOn(type, 'refPath').length > 0;

/** An `ObjectId` element, whether the path holds one or an array of them. On
 *  this project's mongoose an array path's `caster` is `undefined`, so the
 *  declared type is read as well. */
const isObjectIdPath = (type: WalkableType): boolean => {
  if (OBJECT_ID_INSTANCES.has(type.instance ?? '')) return true;
  if (OBJECT_ID_INSTANCES.has(type.caster?.instance ?? '')) return true;
  if (OBJECT_ID_INSTANCES.has(type.$embeddedSchemaType?.instance ?? '')) return true;
  const declared = type.options?.type;
  const element = Array.isArray(declared) ? declared[0] : declared;
  return element === Types.ObjectId || (typeof element === 'function' && element.name === 'ObjectId');
};

const pathsMatching = (connection: Connection, matches: (type: WalkableType) => boolean): ReferenceIdPath[] => {
  const found = new Map<string, ReferenceIdPath>();
  for (const root of schemaRootsOf(connection)) {
    walkPaths(root.schema, (path, type) => {
      if (matches(type)) found.set(`${root.collection}.${path}`, { collection: root.collection, path });
    });
  }
  return [...found.values()];
};

/** The conversion's work list: every declared reference, in every shape —
 *  scalar, array, nested subdocument, document array and discriminator. */
export const referenceIdPathsIn = (connection: Connection): ReferenceIdPath[] =>
  pathsMatching(connection, isReference);

/** Id-shaped paths declaring neither `ref` nor `refPath`. Reported, not
 *  converted: what they point at is decided by a sibling field or by nothing at
 *  all, so widening the write to cover them is a decision for the owner. */
export const unreferencedIdPathsIn = (connection: Connection): ReferenceIdPath[] =>
  pathsMatching(connection, (type) => isObjectIdPath(type) && !isReference(type));

interface Leaf {
  at: string;
  value: unknown;
}

/** Any document, with the one field the write addresses it by. */
type StoredDocument = Record<string, unknown> & { _id: Types.ObjectId };

/**
 * Every concrete location a declared path reaches inside one document, array
 * indices included.
 *
 * Descending arrays with their index rather than addressing them with `$[]` or
 * a dotted path is what lets one `$set` name a single element: `timeline.items`
 * is a document array, and `timeline.items.imageId` is not a location Mongo can
 * write to.
 */
const leavesAt = (value: unknown, segments: readonly string[], at: string): Leaf[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => leavesAt(item, segments, at === '' ? String(index) : `${at}.${index}`));
  }
  if (segments.length === 0) return [{ at, value }];
  if (value === null || typeof value !== 'object') return [];
  const [head, ...rest] = segments;
  return leavesAt((value as Record<string, unknown>)[head], rest, at === '' ? head : `${at}.${head}`);
};

/**
 * Converts every reference stored as a string.
 *
 * Reads before it writes: the dry run is the default and `write` is the only
 * way past it. A value that is not 24 hex digits is reported and left exactly
 * as it is.
 */
export const convertReferenceIds = async (
  connection: Connection,
  { write = false }: { write?: boolean } = {},
): Promise<ReferenceConversionReport> => {
  const paths = referenceIdPathsIn(connection);
  const byCollection = new Map<string, string[]>();
  for (const { collection, path } of paths) {
    byCollection.set(collection, [...(byCollection.get(collection) ?? []), path]);
  }

  const rows: ReferenceConversionRow[] = [];
  let converted = 0;

  for (const [collection, collectionPaths] of byCollection) {
    const driver = connection.collection(collection);
    // One query per collection. A dotted path in a filter traverses arrays on
    // its own, so this finds a string however deep it sits.
    const documents = await driver
      .find<StoredDocument>({ $or: collectionPaths.map((path) => ({ [path]: { $type: 'string' } })) })
      .toArray();

    for (const path of collectionPaths) {
      const row: ReferenceConversionRow = { collection, path, documents: 0, values: 0, invalid: [] };
      const segments = path.split('.');

      for (const document of documents) {
        const strings = leavesAt(document, segments, '').filter((leaf) => typeof leaf.value === 'string');
        if (strings.length === 0) continue;
        row.documents += 1;

        const set: Record<string, Types.ObjectId> = {};
        for (const leaf of strings) {
          const value = leaf.value as string;
          if (!OBJECT_ID_HEX.test(value)) {
            row.invalid.push({ documentId: String(document._id), at: leaf.at, value });
            continue;
          }
          row.values += 1;
          set[leaf.at] = new Types.ObjectId(value);
        }

        if (write && Object.keys(set).length > 0) {
          await driver.updateOne({ _id: document._id }, { $set: set });
          converted += Object.keys(set).length;
        }
      }

      if (row.documents > 0) rows.push(row);
    }
  }

  return {
    wrote: write,
    rows,
    scanned: { collections: byCollection.size, paths: paths.length },
    converted,
    skippedWithoutRef: unreferencedIdPathsIn(connection),
  };
};

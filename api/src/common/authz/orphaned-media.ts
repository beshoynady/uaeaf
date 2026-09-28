import { Types } from 'mongoose';
import type { Connection, Model, Schema } from 'mongoose';
import { MEDIA_ASSETS_COLLECTION, MEDIA_ASSET_MODEL, findReferencedMediaAssetIds, referencePathsIn } from './media-references.js';

/**
 * The two directions of "an editor swapped a picture": saving suggests an
 * old, unused image for archiving and never fails the save over it;
 * restoring brings a pointed-at archived image back and never best-effort.
 */

/** A document or plain object, read as data — spread into a save's response
 *  instead of `Object.assign`, since `toObject()`/`toJSON()` silently drop a
 *  property merely assigned onto a Mongoose document instance. */
export const asPlainObject = (value: object): Record<string, unknown> =>
  'toObject' in value && typeof (value as { toObject?: unknown }).toObject === 'function'
    ? ((value as { toObject: () => Record<string, unknown> }).toObject())
    : (value as Record<string, unknown>);

// Every 24-hex id at a dotted path, traversing arrays the way a document
// array stores them, read here from an in-memory object rather than by query.
const idsAtPath = (value: unknown, segments: readonly string[]): string[] => {
  if (segments.length === 0) {
    if (value === null || value === undefined) return [];
    const text = String(value);
    return /^[0-9a-fA-F]{24}$/.test(text) ? [text] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => idsAtPath(item, segments));
  if (value !== null && typeof value === 'object') {
    return idsAtPath((value as Record<string, unknown>)[segments[0]], segments.slice(1));
  }
  return [];
};

const modelForCollection = (connection: Connection, collection: string): Model<unknown> | undefined =>
  Object.values(connection.models).find((model) => model.collection.collectionName === collection) as
    | Model<unknown>
    | undefined;

/** The MediaAsset ids a save's `before` no longer shares with `after` — read
 *  from the schema's own declared refs, never a hand-kept field list, so a
 *  second image field is covered the day it is declared. */
export const removedMediaAssetIds = (schema: Schema, before: object | null, after: object): string[] => {
  if (!before) return [];
  const paths = referencePathsIn(schema, MEDIA_ASSET_MODEL).map((entry) => entry.path.split('.'));
  const beforeObject = asPlainObject(before);
  const afterObject = asPlainObject(after);
  const beforeIds = new Set(paths.flatMap((segments) => idsAtPath(beforeObject, segments)));
  const afterIds = new Set(paths.flatMap((segments) => idsAtPath(afterObject, segments)));
  return [...beforeIds].filter((id) => !afterIds.has(id));
};

/** Which of these removed ids nothing else references any more.
 *  Deliberately not fail-closed: suggesting nothing costs an editor one
 *  unarchived file, and failing the save over it would cost their work. */
export const orphanedMediaCandidates = async (
  connection: Connection,
  removedIds: readonly (Types.ObjectId | string)[],
): Promise<string[]> => {
  if (removedIds.length === 0) return [];
  const wanted = [...new Set(removedIds.map((id) => id.toString()))];
  try {
    const referenced = await findReferencedMediaAssetIds(connection, wanted, { includeRevisions: false });
    return wanted.filter((id) => !referenced.has(id));
  } catch {
    return [];
  }
};

/** Which of this content's referenced MediaAsset ids are archived —
 *  read-only. Restoring them is `MediaAssetsService.unarchive`'s job: it is
 *  the only place that also `$inc`s the owning album's `assetCount`.
 *  @throws Error when `mediaAssets` has no model on `connection`. */
export const archivedReferencedMediaAssetIds = async (
  connection: Connection,
  schema: Schema,
  content: Record<string, unknown>,
): Promise<Types.ObjectId[]> => {
  const paths = referencePathsIn(schema, MEDIA_ASSET_MODEL).map((entry) => entry.path.split('.'));
  const ids = [...new Set(paths.flatMap((segments) => idsAtPath(content, segments)))].map(
    (id) => new Types.ObjectId(id),
  );
  if (ids.length === 0) return [];

  const model = modelForCollection(connection, MEDIA_ASSETS_COLLECTION);
  if (!model) {
    throw new Error(`${MEDIA_ASSETS_COLLECTION} has no model on this connection.`);
  }

  const archived = (await model
    .find({ _id: { $in: ids }, archivedAt: { $ne: null } }, { _id: 1 })
    .lean()
    .exec()) as { _id: Types.ObjectId }[];
  return archived.map((row) => row._id);
};

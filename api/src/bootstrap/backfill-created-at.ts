import type { Connection, Types } from 'mongoose';
import { openDatabase, registeredModels } from './dev-database.js';

/**
 * The logic behind `npm run backfill:created-at`, kept apart from the entry
 * point so it runs against a real MongoDB in the test suite.
 *
 * Restores `createdAt` on documents written while their schema had no
 * `timestamps`, from the second encoded in the first four bytes of their
 * ObjectId — the moment the id was generated, which for a document created
 * through the API is the moment it was created.
 *
 * `updatedAt` is never written. Nothing recorded when those documents last
 * changed, and an invented date is indistinguishable from a real one.
 */
export interface BackfillRow {
  collection: string;
  /** Documents with no `createdAt` whose id yields a plausible date. */
  fillable: Types.ObjectId[];
  oldest: Date | null;
  newest: Date | null;
  skipped: {
    /** An `_id` that is not an ObjectId carries no date at all. */
    notAnObjectId: number;
    /** Older than the defect: something else wrote these without a date. */
    beforeSince: number;
    /** A date after now can only come from an id built by hand. */
    inTheFuture: number;
    /** `createdAt: null` is a field someone wrote; it is reported, not overwritten. */
    explicitNull: number;
  };
}

/**
 * What the backfill would write, per collection — and writes nothing.
 *
 * Only collections whose schema keeps `createdAt` are considered: a missing
 * date anywhere else is not this defect.
 */
export async function planCreatedAtBackfill(
  connection: Connection,
  window: { since: Date; now: Date },
): Promise<BackfillRow[]> {
  const db = await openDatabase(connection);
  const collections = [
    ...new Set(
      registeredModels(connection)
        .filter((model) => model.schema.path('createdAt'))
        .map((model) => model.collection.collectionName),
    ),
  ].sort();

  const plan: BackfillRow[] = [];
  for (const name of collections) {
    const collection = db.collection(name);
    const row: BackfillRow = {
      collection: name,
      fillable: [],
      oldest: null,
      newest: null,
      skipped: {
        notAnObjectId: 0,
        beforeSince: 0,
        inTheFuture: 0,
        explicitNull: await collection.countDocuments({ createdAt: { $type: 'null' } }),
      },
    };

    for await (const { _id } of collection.find({ createdAt: { $exists: false } }, { projection: { _id: 1 } })) {
      if ((_id as { _bsontype?: string })?._bsontype !== 'ObjectId') {
        row.skipped.notAnObjectId += 1;
        continue;
      }
      const id = _id as Types.ObjectId;
      const created = id.getTimestamp();
      if (created < window.since) {
        row.skipped.beforeSince += 1;
      } else if (created > window.now) {
        row.skipped.inTheFuture += 1;
      } else {
        row.fillable.push(id);
        if (!row.oldest || created < row.oldest) row.oldest = created;
        if (!row.newest || created > row.newest) row.newest = created;
      }
    }

    plan.push(row);
  }
  return plan;
}

/**
 * Writes the plan through the raw driver, so Mongoose's own `timestamps`
 * cannot add an `updatedAt` on the way. Each write is conditional on the
 * document still having no `createdAt`: a date that appeared after the
 * plan was made is kept, never overwritten.
 */
export async function applyCreatedAtBackfill(
  connection: Connection,
  plan: BackfillRow[],
): Promise<Array<{ collection: string; written: number }>> {
  const db = await openDatabase(connection);
  const written: Array<{ collection: string; written: number }> = [];

  for (const row of plan) {
    if (row.fillable.length === 0) {
      written.push({ collection: row.collection, written: 0 });
      continue;
    }
    const result = await db.collection(row.collection).bulkWrite(
      row.fillable.map((_id) => ({
        updateOne: {
          filter: { _id, createdAt: { $exists: false } },
          update: { $set: { createdAt: _id.getTimestamp() } },
        },
      })),
      { ordered: false },
    );
    written.push({ collection: row.collection, written: result.modifiedCount });
  }
  return written;
}

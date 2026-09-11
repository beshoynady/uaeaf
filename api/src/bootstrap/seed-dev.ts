import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import mongoose, { type Connection, type Model, type Types } from 'mongoose';
import { openDatabase, registeredModels } from './dev-database.js';

const { EJSON } = mongoose.mongo.BSON;

/**
 * The logic behind `npm run seed:dev` and `npm run seed:export`, kept apart
 * from the entry point so it runs against a real MongoDB in the test suite.
 *
 * The seed takes a development database — empty or not — to a known state:
 * the page records, the media they point at, sample board members and
 * sample inbox messages. Users, sessions, audit history and the permission
 * catalogue are not fixtures: the first three are history or secrets, and
 * the catalogue already lives in code, where `runBootstrap` seeds it.
 *
 * The fixtures are Extended JSON under `api/seed/dev/`, one file per
 * collection, so ids and dates survive the round trip and a change to them
 * reads as an ordinary diff.
 */
export interface DevFixtureSet {
  collection: string;
  /** A page record: the application expects exactly one document. */
  singleton: boolean;
}

/** Referenced collections first, so a partial run never leaves a page
 *  pointing at media that was not written. */
export const DEV_FIXTURE_SETS: readonly DevFixtureSet[] = [
  { collection: 'mediaAssets', singleton: false },
  { collection: 'federationPersonnel', singleton: false },
  { collection: 'contactMessages', singleton: false },
  { collection: 'albumsPage', singleton: true },
  { collection: 'athletesPage', singleton: true },
  { collection: 'boardMembersPage', singleton: true },
  { collection: 'clubsPage', singleton: true },
  { collection: 'coachesPage', singleton: true },
  { collection: 'committeesPage', singleton: true },
  { collection: 'contactUsPage', singleton: true },
  { collection: 'disciplinesPage', singleton: true },
  { collection: 'newsPage', singleton: true },
  { collection: 'recordsPage', singleton: true },
  { collection: 'resultsRankingsPage', singleton: true },
  { collection: 'videosPage', singleton: true },
];

export type DevDocument = { _id: Types.ObjectId; [field: string]: unknown };
export type DevFixtures = Map<string, DevDocument[]>;

export interface SeedRow {
  collection: string;
  inserted: number;
  replaced: number;
  skipped: number;
}

const KNOWN_PATH_TYPES = new Set(['real', 'nested', 'virtual']);

export async function loadDevFixtures(dir: string): Promise<DevFixtures> {
  const fixtures: DevFixtures = new Map();
  for (const set of DEV_FIXTURE_SETS) {
    const text = await readFile(join(dir, `${set.collection}.json`), 'utf8');
    fixtures.set(set.collection, EJSON.parse(text, { relaxed: true }) as DevDocument[]);
  }
  return fixtures;
}

export async function writeDevFixtures(dir: string, fixtures: DevFixtures): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const set of DEV_FIXTURE_SETS) {
    const docs = fixtures.get(set.collection) ?? [];
    await writeFile(join(dir, `${set.collection}.json`), `${EJSON.stringify(docs, undefined, 2, { relaxed: true })}\n`);
  }
}

/**
 * Checks every fixture against the schema the API will read it with, and
 * throws before anything is written.
 *
 * The seed writes documents as they are, ids and timestamps included, so
 * Mongoose never sees them on the way in. Without this, a fixture taken
 * before a schema change would be seeded without complaint and fail only
 * later, in a request, far from its cause.
 */
export async function validateDevFixtures(connection: Connection, fixtures: DevFixtures): Promise<void> {
  for (const set of DEV_FIXTURE_SETS) {
    const docs = fixtures.get(set.collection);
    if (!docs) throw new Error(`Fixtures for "${set.collection}" are missing.`);
    if (set.singleton && docs.length !== 1) {
      throw new Error(`"${set.collection}" is a page record and must hold exactly one document; found ${docs.length}.`);
    }

    const model = modelFor(connection, set.collection);
    for (const doc of docs) {
      // A whitelist, not `=== 'adhoc'`: Mongoose 9 reports an unknown path as
      // `adhocOrUndefined`, and a blacklist written for one spelling silently
      // accepts every field once the spelling changes.
      const unknown = Object.keys(doc).filter((key) => !KNOWN_PATH_TYPES.has(model.schema.pathType(key)));
      if (unknown.length > 0) {
        throw new Error(`${set.collection} ${String(doc._id)}: ${unknown.join(', ')} is not in the schema.`);
      }
      try {
        await new model(doc).validate();
      } catch (error) {
        throw new Error(`${set.collection} ${String(doc._id)} does not validate: ${(error as Error).message}`);
      }
    }
  }
}

/**
 * Writes the fixtures.
 *
 * By default only what is missing: a page record is written when its
 * collection is empty, any other document when its id is absent. Whatever
 * was entered in the dashboard since stays — the seed exists to prevent
 * losing work, not to cause it.
 *
 * With `reset`, the fixture version wins: a page record replaces whatever
 * record the collection holds, any other document is replaced by id.
 * Documents the fixtures do not know about are left alone either way.
 */
export async function seedDevFixtures(
  connection: Connection,
  fixtures: DevFixtures,
  options: { reset: boolean },
): Promise<SeedRow[]> {
  await validateDevFixtures(connection, fixtures);

  const report: SeedRow[] = [];
  for (const set of DEV_FIXTURE_SETS) {
    const docs = fixtures.get(set.collection)!;
    const collection = (await openDatabase(connection)).collection(set.collection);
    const row: SeedRow = { collection: set.collection, inserted: 0, replaced: 0, skipped: 0 };

    if (set.singleton) {
      const occupied = (await collection.countDocuments({}, { limit: 1 })) > 0;
      if (occupied && !options.reset) {
        row.skipped = docs.length;
      } else {
        if (occupied) await collection.deleteMany({});
        await collection.insertMany(docs);
        row[occupied ? 'replaced' : 'inserted'] = docs.length;
      }
    } else if (options.reset) {
      const result = await collection.bulkWrite(
        docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } })),
      );
      row.inserted = result.upsertedCount;
      row.replaced = docs.length - result.upsertedCount;
    } else {
      // Not `$setOnInsert`: update operators apply fields in lexicographic
      // order, which would re-sort every seeded document's keys and make the
      // next export rewrite every fixture for nothing.
      const present = new Set(
        (await collection.find({ _id: { $in: docs.map((doc) => doc._id) } }, { projection: { _id: 1 } }).toArray()).map(
          (doc) => String(doc._id),
        ),
      );
      const missing = docs.filter((doc) => !present.has(String(doc._id)));
      if (missing.length > 0) await collection.insertMany(missing);
      row.inserted = missing.length;
      row.skipped = docs.length - missing.length;
    }

    report.push(row);
  }
  return report;
}

/**
 * Reads the current development database back into fixtures — how the
 * fixtures are maintained: export, then review the diff.
 *
 * Refuses outright if any document holds a field that looks like a
 * credential, and validates what it read, so a stale or sensitive field is
 * something a person has to look at rather than something that ends up in
 * git.
 */
export async function exportDevFixtures(connection: Connection): Promise<DevFixtures> {
  const db = await openDatabase(connection);
  const fixtures: DevFixtures = new Map();
  for (const set of DEV_FIXTURE_SETS) {
    const docs = await db.collection(set.collection).find({}).sort({ _id: 1 }).toArray();
    fixtures.set(set.collection, docs as DevDocument[]);
  }

  assertNoSecrets(fixtures);
  await validateDevFixtures(connection, fixtures);
  return fixtures;
}

const CREDENTIAL_KEY = /password|passcode|passphrase|hash|token|secret|api_?key/i;

/** Throws on the first field whose *name* looks like a credential. The
 *  message names the collection, document and path — never the value. */
export function assertNoSecrets(fixtures: DevFixtures): void {
  for (const [collection, docs] of fixtures) {
    for (const doc of docs) {
      const path = findCredentialKey(doc, '');
      if (path) {
        throw new Error(
          `${collection} ${String(doc._id)}: "${path}" looks like a credential. ` +
            'Refusing to write it into the repository — remove or rename the field in the development database first.',
        );
      }
    }
  }
}

function findCredentialKey(value: unknown, path: string): string | null {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findCredentialKey(item, `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object' || value instanceof Date || '_bsontype' in value) return null;

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (CREDENTIAL_KEY.test(key)) return childPath;
    const found = findCredentialKey(child, childPath);
    if (found) return found;
  }
  return null;
}

function modelFor(connection: Connection, collection: string): Model<unknown> {
  const model = registeredModels(connection).find((candidate) => candidate.collection.collectionName === collection);
  if (!model) throw new Error(`No Mongoose model is registered for the "${collection}" collection.`);
  return model;
}

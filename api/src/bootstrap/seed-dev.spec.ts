import mongoose, { Types, type Schema } from 'mongoose';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../test/utils/mongo-memory-server.js';
import { AthletesPage, AthletesPageSchema } from '../modules/cms-page-composition/athletes-page/schemas/athletes-page.schema.js';
import { ClubsPage, ClubsPageSchema } from '../modules/cms-page-composition/clubs-page/schemas/clubs-page.schema.js';
import { CoachesPage, CoachesPageSchema } from '../modules/cms-page-composition/coaches-page/schemas/coaches-page.schema.js';
import {
  DisciplinesPage,
  DisciplinesPageSchema,
} from '../modules/cms-page-composition/disciplines-page/schemas/disciplines-page.schema.js';
import { NewsPage, NewsPageSchema } from '../modules/cms-page-composition/news-page/schemas/news-page.schema.js';
import { RecordsPage, RecordsPageSchema } from '../modules/cms-page-composition/records-page/schemas/records-page.schema.js';
import {
  ResultsRankingsPage,
  ResultsRankingsPageSchema,
} from '../modules/cms-page-composition/results-rankings-page/schemas/results-rankings-page.schema.js';
import {
  BoardMembersPage,
  BoardMembersPageSchema,
} from '../modules/federation-governance/board-members-page/schemas/board-members-page.schema.js';
import {
  CommitteesPage,
  CommitteesPageSchema,
} from '../modules/federation-governance/committees-page/schemas/committees-page.schema.js';
import {
  ContactUsPage,
  ContactUsPageSchema,
} from '../modules/federation-governance/contact-us-page/schemas/contact-us-page.schema.js';
import {
  FederationPersonnel,
  FederationPersonnelSchema,
} from '../modules/federation-governance/federation-personnel/schemas/federation-personnel.schema.js';
import { AlbumsPage, AlbumsPageSchema } from '../modules/media-center/albums-page/schemas/albums-page.schema.js';
import { MediaAsset, MediaAssetSchema } from '../modules/media-center/media-assets/schemas/media-asset.schema.js';
import { VideosPage, VideosPageSchema } from '../modules/media-center/videos-page/schemas/videos-page.schema.js';
import {
  ContactMessage,
  ContactMessageSchema,
} from '../modules/public-communication/contact-messages/schemas/contact-messages.schema.js';
import {
  DEV_FIXTURE_SETS,
  assertNoSecrets,
  exportDevFixtures,
  loadDevFixtures,
  seedDevFixtures,
  validateDevFixtures,
  writeDevFixtures,
  type DevFixtures,
} from './seed-dev.js';

const { EJSON } = mongoose.mongo.BSON;
const FIXTURES_DIR = fileURLToPath(new URL('../../seed/dev/', import.meta.url));

/** Every model the fixtures need, registered the way `AppModule` registers
 *  them — by class name, with the collection fixed by the schema itself. */
const MODELS: Array<[string, Schema]> = [
  [AlbumsPage.name, AlbumsPageSchema],
  [AthletesPage.name, AthletesPageSchema],
  [BoardMembersPage.name, BoardMembersPageSchema],
  [ClubsPage.name, ClubsPageSchema],
  [CoachesPage.name, CoachesPageSchema],
  [CommitteesPage.name, CommitteesPageSchema],
  [ContactMessage.name, ContactMessageSchema],
  [ContactUsPage.name, ContactUsPageSchema],
  [DisciplinesPage.name, DisciplinesPageSchema],
  [FederationPersonnel.name, FederationPersonnelSchema],
  [MediaAsset.name, MediaAssetSchema],
  [NewsPage.name, NewsPageSchema],
  [RecordsPage.name, RecordsPageSchema],
  [ResultsRankingsPage.name, ResultsRankingsPageSchema],
  [VideosPage.name, VideosPageSchema],
];

/** A deep, independent copy: the fixtures are EJSON, so EJSON is the copy. */
function clone(fixtures: DevFixtures): DevFixtures {
  return new Map([...fixtures].map(([name, docs]) => [name, EJSON.parse(EJSON.stringify(docs, { relaxed: true }), { relaxed: true })]));
}

function asText(fixtures: DevFixtures): string {
  return EJSON.stringify(Object.fromEntries(fixtures), { relaxed: true });
}

const raw = (collection: string) => mongoose.connection.db!.collection(collection);

describe('dev fixtures', () => {
  let server: MongoMemoryServer;
  let committed: DevFixtures;

  beforeAll(async () => {
    server = await connectTestDatabase();
    for (const [name, schema] of MODELS) mongoose.model(name, schema);
    committed = await loadDevFixtures(FIXTURES_DIR);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  describe('as committed', () => {
    it('hold one file per declared set and nothing else', async () => {
      const files = (await readdir(FIXTURES_DIR)).sort();
      expect(files).toEqual(DEV_FIXTURE_SETS.map((set) => `${set.collection}.json`).sort());
    });

    it('give every page exactly one record', () => {
      for (const set of DEV_FIXTURE_SETS.filter((s) => s.singleton)) {
        expect([set.collection, committed.get(set.collection)?.length]).toEqual([set.collection, 1]);
      }
    });

    it('validate against the current schemas, field for field', async () => {
      // The day a schema changes, this is what says the fixtures went stale —
      // rather than a seed that quietly writes documents the API rejects.
      await expect(validateDevFixtures(mongoose.connection, committed)).resolves.toBeUndefined();
    });

    it('link only to documents they also carry', () => {
      const ids = new Set([...committed.values()].flat().map((doc) => String(doc._id)));
      const unresolved: string[] = [];
      const walk = (value: unknown, path: string): void => {
        if (value instanceof Types.ObjectId) {
          if (!path.endsWith('._id') && !ids.has(String(value))) unresolved.push(path.replace(/\[\d+\]/g, '[]'));
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => walk(item, `${path}[${index}]`));
        } else if (value && typeof value === 'object' && !(value instanceof Date)) {
          for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
        }
      };
      for (const [collection, docs] of committed) docs.forEach((doc) => walk(doc, collection));

      // One known exception, named rather than tolerated: every board member
      // points at a `countries` document that does not exist in the source
      // database either. It was dangling before these fixtures were taken,
      // and `countries` is not seeded. Anything else unresolved fails here.
      expect([...new Set(unresolved)]).toEqual(['federationPersonnel.nationalityId']);
    });

    it('carry nothing that looks like a credential', () => {
      expect(() => assertNoSecrets(committed)).not.toThrow();
    });
  });

  describe('seedDevFixtures', () => {
    it('brings an empty database to the fixture state, links intact', async () => {
      const report = await seedDevFixtures(mongoose.connection, committed, { reset: false });

      for (const [collection, docs] of committed) {
        expect([collection, await raw(collection).countDocuments()]).toEqual([collection, docs.length]);
        expect(report.find((row) => row.collection === collection)?.inserted).toBe(docs.length);
      }
      const contact = await raw('contactUsPage').findOne({});
      expect(await raw('mediaAssets').findOne({ _id: contact!.heroImageId })).not.toBeNull();
      expect(await raw('mediaAssets').findOne({ _id: contact!.map.imageId })).not.toBeNull();
    });

    it('changes nothing the second time', async () => {
      await seedDevFixtures(mongoose.connection, committed, { reset: false });
      const report = await seedDevFixtures(mongoose.connection, committed, { reset: false });

      expect(report.every((row) => row.inserted === 0 && row.replaced === 0)).toBe(true);
      for (const [collection, docs] of committed) {
        expect(await raw(collection).countDocuments()).toBe(docs.length);
      }
    });

    it('by default keeps what was entered in the dashboard, and never adds a second page record', async () => {
      await seedDevFixtures(mongoose.connection, committed, { reset: false });
      await raw('contactUsPage').updateOne({}, { $set: { email: 'edited@uaeaf.ae' } });

      await seedDevFixtures(mongoose.connection, committed, { reset: false });

      expect(await raw('contactUsPage').countDocuments()).toBe(1);
      expect((await raw('contactUsPage').findOne({}))!.email).toBe('edited@uaeaf.ae');
    });

    it('by default restores a missing document but keeps an edited one', async () => {
      await seedDevFixtures(mongoose.connection, committed, { reset: false });
      const [kept, lost] = committed.get('mediaAssets')!;
      await raw('mediaAssets').updateOne({ _id: kept._id }, { $set: { displayOrder: 99 } });
      await raw('mediaAssets').deleteOne({ _id: lost._id });

      await seedDevFixtures(mongoose.connection, committed, { reset: false });

      expect(await raw('mediaAssets').findOne({ _id: lost._id })).not.toBeNull();
      expect((await raw('mediaAssets').findOne({ _id: kept._id }))!.displayOrder).toBe(99);
    });

    it('with reset, puts back the fixture versions and leaves unrelated documents alone', async () => {
      await seedDevFixtures(mongoose.connection, committed, { reset: false });
      const [asset] = committed.get('mediaAssets')!;
      await raw('contactUsPage').updateOne({}, { $set: { email: 'edited@uaeaf.ae' } });
      await raw('mediaAssets').updateOne({ _id: asset._id }, { $set: { displayOrder: 99 } });
      const unrelated = new Types.ObjectId();
      await raw('mediaAssets').insertOne({ ...asset, _id: unrelated });

      const report = await seedDevFixtures(mongoose.connection, committed, { reset: true });

      const contact = await raw('contactUsPage').findOne({});
      expect(contact!.email).toBe(committed.get('contactUsPage')![0].email);
      expect((await raw('mediaAssets').findOne({ _id: asset._id }))!.displayOrder).toBe(asset.displayOrder);
      expect(await raw('mediaAssets').findOne({ _id: unrelated })).not.toBeNull();
      expect(report.find((row) => row.collection === 'contactUsPage')?.replaced).toBe(1);
    });

    it('writes nothing at all when any fixture carries a field the schema does not know', async () => {
      const broken = clone(committed);
      broken.get('contactUsPage')![0].notInTheSchema = true;

      await expect(seedDevFixtures(mongoose.connection, broken, { reset: false })).rejects.toThrow(
        /contactUsPage.*notInTheSchema/,
      );
      for (const set of DEV_FIXTURE_SETS) expect(await raw(set.collection).countDocuments()).toBe(0);
    });

    it('writes nothing at all when any fixture holds a value of the wrong type', async () => {
      // `displayOrder`, not a page's `heroImageId`: the hero schema declares
      // that one `Mixed`, so it accepts anything and would prove nothing.
      const broken = clone(committed);
      broken.get('mediaAssets')![0].displayOrder = 'not-a-number';

      await expect(seedDevFixtures(mongoose.connection, broken, { reset: false })).rejects.toThrow(
        /mediaAssets.*displayOrder/,
      );
      for (const set of DEV_FIXTURE_SETS) expect(await raw(set.collection).countDocuments()).toBe(0);
    });
  });

  describe('exportDevFixtures', () => {
    it('reproduces the committed fixtures exactly, through files and back', async () => {
      await seedDevFixtures(mongoose.connection, committed, { reset: false });
      const dir = await mkdtemp(join(tmpdir(), 'seed-export-'));
      try {
        await writeDevFixtures(dir, await exportDevFixtures(mongoose.connection));
        expect(asText(await loadDevFixtures(dir))).toBe(asText(committed));
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it('refuses to export a document holding anything that looks like a credential, and names where', async () => {
      await seedDevFixtures(mongoose.connection, committed, { reset: false });
      await raw('contactMessages').updateOne({}, { $set: { 'meta.resetToken': 'hunter2-value' } });

      const attempt = exportDevFixtures(mongoose.connection);

      await expect(attempt).rejects.toThrow(/contactMessages.*meta\.resetToken/);
      await expect(attempt).rejects.toThrow(expect.objectContaining({ message: expect.not.stringContaining('hunter2-value') }));
    });
  });
});

import mongoose, { Types } from 'mongoose';
import type { Connection, Schema } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AboutFederationPageSchema } from '../modules/federation-governance/about-federation-page/schemas/about-federation-page.schema.js';
import { ArticleSchema } from '../modules/public-communication/articles/schemas/article.schema.js';
import { UserSchema } from '../modules/platform-administration/users/schemas/user.schema.js';
import { convertReferenceIds, referenceIdPathsIn, unreferencedIdPathsIn } from './convert-reference-ids.js';

/**
 * The conversion runs against a real MongoDB, because the whole subject is the
 * BSON type of a stored value and nothing else can answer for it.
 *
 * Every string value in these fixtures is inserted through the driver: a write
 * through a model would be cast, which is exactly the state the conversion
 * exists to reach.
 */
describe('convertReferenceIds', () => {
  let server: MongoMemoryServer;
  let connection: Connection;

  const ASSET = new Types.ObjectId();
  const OTHER_ASSET = new Types.ObjectId();
  const ROLE_A = new Types.ObjectId();
  const ROLE_B = new Types.ObjectId();
  const PERSON = new Types.ObjectId();

  const raw = (collection: string) => connection.collection(collection);

  const rowOf = (
    rows: readonly { collection: string; path: string }[],
    collection: string,
    path: string,
  ): { collection: string; path: string; documents: number; values: number; invalid: unknown[] } | undefined =>
    rows.find((row) => row.collection === collection && row.path === path) as never;

  beforeAll(async () => {
    server = await MongoMemoryServer.create({ instance: { launchTimeout: 25_000 } });
    connection = await mongoose.createConnection(server.getUri()).asPromise();
    const register = (name: string, schema: Schema) => connection.model(name, schema as never);
    register('User', UserSchema);
    register('Article', ArticleSchema);
    register('AboutFederationPage', AboutFederationPageSchema);
    await Promise.all(Object.values(connection.models).map((model) => model.init()));
  }, 90_000);

  afterEach(async () => {
    for (const model of Object.values(connection.models)) await model.collection.deleteMany({});
  });

  afterAll(async () => {
    await connection?.close();
    await server?.stop();
  });

  describe('the work list it derives from the schemas', () => {
    it('finds the scalar, array, nested and array-of-subdocument reference paths', () => {
      const paths = referenceIdPathsIn(connection).map((entry) => `${entry.collection}.${entry.path}`);

      expect(paths).toContain('users.personId');
      expect(paths).toContain('users.roleIds');
      expect(paths).toContain('articles.seo.ogImageId');
      expect(paths).toContain('aboutFederationPage.timeline.items.imageId');
    });

    it('lists every path exactly once, however many schemas share the sub-schema', () => {
      const paths = referenceIdPathsIn(connection).map((entry) => `${entry.collection}.${entry.path}`);

      expect(paths.length).toBe(new Set(paths).size);
    });

    it('reads a refPath the same way it reads a ref', () => {
      const schema = new mongoose.Schema(
        { ownerType: String, ownerId: { type: mongoose.Schema.Types.ObjectId, refPath: 'ownerType' } },
        { collection: 'polymorphicProbe' },
      );
      const probe = mongoose.createConnection();
      probe.model('PolymorphicProbe', schema);

      expect(referenceIdPathsIn(probe)).toEqual([{ collection: 'polymorphicProbe', path: 'ownerId' }]);
    });

    // The paths this script does NOT convert, reported so the gap is visible
    // before anybody runs it rather than after.
    it('reports id-shaped paths that declare no target separately', () => {
      const paths = unreferencedIdPathsIn(connection).map((entry) => `${entry.collection}.${entry.path}`);

      expect(paths).not.toContain('users.personId');
      expect(referenceIdPathsIn(connection).some((entry) => paths.includes(`${entry.collection}.${entry.path}`))).toBe(
        false,
      );
    });
  });

  describe('the dry run', () => {
    it('is the default, and writes nothing', async () => {
      await raw('users').insertOne({ email: 'a@uaeaf.ae', personId: PERSON.toString(), roleIds: [] });

      const report = await convertReferenceIds(connection);

      expect(report.wrote).toBe(false);
      expect(report.converted).toBe(0);
      expect(rowOf(report.rows, 'users', 'personId')).toMatchObject({ documents: 1, values: 1, invalid: [] });
      expect((await raw('users').findOne({ email: 'a@uaeaf.ae' }))?.personId).toBe(PERSON.toString());
    });

    it('reports nothing for a database that already stores every reference as an ObjectId', async () => {
      await raw('users').insertOne({ email: 'a@uaeaf.ae', personId: PERSON, roleIds: [ROLE_A] });

      const report = await convertReferenceIds(connection);

      expect(report.rows).toEqual([]);
      expect(report.scanned.paths).toBeGreaterThan(0);
    });
  });

  describe('writing', () => {
    it('converts a scalar path', async () => {
      await raw('users').insertOne({ email: 'a@uaeaf.ae', personId: PERSON.toString(), roleIds: [] });

      const report = await convertReferenceIds(connection, { write: true });

      expect(report.wrote).toBe(true);
      expect(report.converted).toBe(1);
      expect((await raw('users').findOne({ email: 'a@uaeaf.ae' }))?.personId).toEqual(PERSON);
    });

    it('converts only the string elements of an array, leaving the ObjectIds alone', async () => {
      await raw('users').insertOne({ email: 'a@uaeaf.ae', roleIds: [ROLE_A, ROLE_B.toString()] });

      await convertReferenceIds(connection, { write: true });

      const stored = await raw('users').findOne<{ roleIds: unknown[] }>({ email: 'a@uaeaf.ae' });
      expect(stored?.roleIds).toEqual([ROLE_A, ROLE_B]);
    });

    it('converts a nested path inside a subdocument', async () => {
      await raw('articles').insertOne({ slug: 'a', seo: { ogImageId: ASSET.toString() } });

      await convertReferenceIds(connection, { write: true });

      const stored = await raw('articles').findOne<{ seo: { ogImageId: unknown } }>({ slug: 'a' });
      expect(stored?.seo.ogImageId).toEqual(ASSET);
    });

    it('converts a path inside a document array, element by element', async () => {
      await raw('aboutFederationPage').insertOne({
        timeline: {
          items: [{ imageId: ASSET.toString() }, { imageId: OTHER_ASSET }, { imageId: null }],
        },
      });

      await convertReferenceIds(connection, { write: true });

      const stored = await raw('aboutFederationPage').findOne<{ timeline: { items: { imageId: unknown }[] } }>({});
      expect(stored?.timeline.items.map((item) => item.imageId)).toEqual([ASSET, OTHER_ASSET, null]);
    });

    it('reports what it converted, per collection and path', async () => {
      await raw('users').insertOne({ email: 'a@uaeaf.ae', personId: PERSON.toString(), roleIds: [ROLE_A.toString()] });
      await raw('users').insertOne({ email: 'b@uaeaf.ae', personId: PERSON.toString(), roleIds: [] });

      const report = await convertReferenceIds(connection, { write: true });

      expect(rowOf(report.rows, 'users', 'personId')).toMatchObject({ documents: 2, values: 2 });
      expect(rowOf(report.rows, 'users', 'roleIds')).toMatchObject({ documents: 1, values: 1 });
      expect(report.converted).toBe(3);
    });
  });

  describe('a value it will not touch', () => {
    it('reports a string that is not a valid ObjectId and leaves it stored', async () => {
      await raw('users').insertOne({ email: 'a@uaeaf.ae', personId: 'not-an-id', roleIds: [] });

      const report = await convertReferenceIds(connection, { write: true });

      expect(rowOf(report.rows, 'users', 'personId')).toMatchObject({
        values: 0,
        invalid: [{ value: 'not-an-id' }],
      });
      expect(report.converted).toBe(0);
      expect((await raw('users').findOne({ email: 'a@uaeaf.ae' }))?.personId).toBe('not-an-id');
    });

    // A twelve-character label: what older bson read as twelve raw bytes,
    // turning it into a valid-looking id pointing at nothing. This project's
    // bson throws for it instead, so the refusal here is what keeps the
    // conversion's rule its own rather than a transitive dependency's.
    it('refuses a twelve-character string rather than reading it as bytes', async () => {
      await raw('users').insertOne({ email: 'a@uaeaf.ae', personId: 'twelve-chars', roleIds: [] });

      const report = await convertReferenceIds(connection, { write: true });

      expect(report.converted).toBe(0);
      expect(rowOf(report.rows, 'users', 'personId')).toMatchObject({ invalid: [{ value: 'twelve-chars' }] });
      expect((await raw('users').findOne({ email: 'a@uaeaf.ae' }))?.personId).toBe('twelve-chars');
    });

    // `new Types.ObjectId(null)` and `new Types.ObjectId(undefined)` do not
    // throw on this project's mongoose: each mints a brand-new random id. A
    // conversion that reached them would point records at documents that have
    // never existed.
    it('leaves null and a missing field untouched', async () => {
      await raw('users').insertOne({ email: 'null@uaeaf.ae', personId: null, roleIds: [] });
      await raw('users').insertOne({ email: 'absent@uaeaf.ae', roleIds: [] });

      const report = await convertReferenceIds(connection, { write: true });

      expect(report.rows).toEqual([]);
      expect(report.converted).toBe(0);
      expect((await raw('users').findOne({ email: 'null@uaeaf.ae' }))?.personId).toBeNull();
      expect(await raw('users').findOne({ email: 'absent@uaeaf.ae', personId: { $exists: true } })).toBeNull();
    });

    it('leaves an empty string untouched and reports it', async () => {
      await raw('users').insertOne({ email: 'a@uaeaf.ae', personId: '', roleIds: [] });

      const report = await convertReferenceIds(connection, { write: true });

      expect(report.converted).toBe(0);
      expect(rowOf(report.rows, 'users', 'personId')).toMatchObject({ invalid: [{ value: '' }] });
      expect((await raw('users').findOne({ email: 'a@uaeaf.ae' }))?.personId).toBe('');
    });
  });

  describe('a second run', () => {
    it('converts nothing and reports zero', async () => {
      await raw('users').insertOne({ email: 'a@uaeaf.ae', personId: PERSON.toString(), roleIds: [ROLE_A.toString()] });
      await raw('articles').insertOne({ slug: 'a', seo: { ogImageId: ASSET.toString() } });
      await convertReferenceIds(connection, { write: true });

      const second = await convertReferenceIds(connection, { write: true });

      expect(second.rows).toEqual([]);
      expect(second.converted).toBe(0);
    });

    it('still reports an invalid value it refused the first time', async () => {
      await raw('users').insertOne({ email: 'a@uaeaf.ae', personId: 'not-an-id', roleIds: [] });
      await convertReferenceIds(connection, { write: true });

      const second = await convertReferenceIds(connection, { write: true });

      expect(rowOf(second.rows, 'users', 'personId')).toMatchObject({ invalid: [{ value: 'not-an-id' }] });
    });
  });
});

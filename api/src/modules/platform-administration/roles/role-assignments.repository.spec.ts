import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserSchema } from '../users/schemas/user.schema.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { RoleAssignmentsRepository } from './role-assignments.repository.js';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  registerTestModel,
} from '../../../../test/utils/mongo-memory-server.js';

/**
 * Detaching an archived role has to find the reference whatever BSON type it
 * was stored as.
 *
 * `roleIds` is a real `ObjectId` array path, so every write the application
 * makes from here on stores `ObjectId`s. What is already in the database is a
 * different question: before that was true a `PATCH` could store the raw
 * string, and MongoDB compares the BSON type before the value, so one filter
 * spelling finds one kind of row and is blind to the other. An account the
 * detach misses keeps a role that no longer exists.
 *
 * Runs against a real MongoDB because that is the only place the type
 * comparison happens. The string rows are inserted through the driver, which
 * is the one way to store what Mongoose would otherwise cast away.
 */
describe('RoleAssignmentsRepository.detachRole', () => {
  let server: MongoMemoryServer;
  let model: Model<UserDocument>;
  let repository: RoleAssignmentsRepository;

  const ARCHIVED_ROLE = new Types.ObjectId();
  const KEPT_ROLE = new Types.ObjectId();
  const OTHER_ROLE = new Types.ObjectId();

  const account = (email: string, roleIds: unknown[], extra: object = {}) => ({
    _id: new Types.ObjectId(),
    email,
    passwordHash: 'x',
    name: { en: email, ar: email },
    roleIds,
    accountStatus: 'Active',
    archivedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...extra,
  });

  /** Through the driver, never the model: the point of the string rows is that
   *  they are what a cast would have prevented. */
  const insert = async (...documents: object[]): Promise<void> => {
    await model.collection.insertMany(documents as never[]);
  };

  const roleIdsOf = async (email: string): Promise<string[]> => {
    const stored = await model.collection.findOne<{ roleIds?: unknown[] }>({ email });
    return (stored?.roleIds ?? []).map(String);
  };

  /** The accounts the detach reports, as ids the assertions can name. */
  const detachedFrom = async (): Promise<string[]> =>
    (await repository.detachRole(ARCHIVED_ROLE.toString())).map(String).sort();

  const idsOf = (...accounts: { _id: Types.ObjectId }[]): string[] =>
    accounts.map((account) => account._id.toString()).sort();

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = registerTestModel<UserDocument>('User', UserSchema);
    await model.init();
    repository = new RoleAssignmentsRepository(model);
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('detaches the role from an account that stores it as an ObjectId', async () => {
    const holder = account('objectid@uaeaf.ae', [ARCHIVED_ROLE, KEPT_ROLE]);
    await insert(holder);

    expect(await detachedFrom()).toEqual(idsOf(holder));
    expect(await roleIdsOf('objectid@uaeaf.ae')).toEqual([KEPT_ROLE.toString()]);
  });

  it('detaches the role from an account that stores it as a string', async () => {
    const holder = account('string@uaeaf.ae', [ARCHIVED_ROLE.toString(), KEPT_ROLE]);
    await insert(holder);

    expect(await detachedFrom()).toEqual(idsOf(holder));
    expect(await roleIdsOf('string@uaeaf.ae')).toEqual([KEPT_ROLE.toString()]);
  });

  // The ids are what a caller writes one audit row per, so they have to name
  // exactly the accounts the pull changed — no more, no fewer.
  it('detaches both spellings in one pass, and reports every account it changed', async () => {
    const objectIdHolder = account('objectid@uaeaf.ae', [ARCHIVED_ROLE]);
    const stringHolder = account('string@uaeaf.ae', [ARCHIVED_ROLE.toString()]);
    const bothHolder = account('both@uaeaf.ae', [ARCHIVED_ROLE, ARCHIVED_ROLE.toString(), KEPT_ROLE]);
    await insert(objectIdHolder, stringHolder, bothHolder);

    expect(await detachedFrom()).toEqual(idsOf(objectIdHolder, stringHolder, bothHolder));
    expect(await roleIdsOf('objectid@uaeaf.ae')).toEqual([]);
    expect(await roleIdsOf('string@uaeaf.ae')).toEqual([]);
    expect(await roleIdsOf('both@uaeaf.ae')).toEqual([KEPT_ROLE.toString()]);
  });

  // Not scoped to `archivedAt: null`: an archived account still holds the
  // reference, and restoring it would silently restore a role that is gone.
  it('detaches from an archived account too', async () => {
    const holder = account('archived@uaeaf.ae', [ARCHIVED_ROLE.toString()], { archivedAt: new Date('2026-02-01') });
    await insert(holder);

    expect(await detachedFrom()).toEqual(idsOf(holder));
    expect(await roleIdsOf('archived@uaeaf.ae')).toEqual([]);
  });

  it('changes nothing on an account that does not hold the role, in either spelling', async () => {
    await insert(account('other@uaeaf.ae', [OTHER_ROLE]), account('other-string@uaeaf.ae', [OTHER_ROLE.toString()]));

    expect(await detachedFrom()).toEqual([]);
    expect(await roleIdsOf('other@uaeaf.ae')).toEqual([OTHER_ROLE.toString()]);
    expect(await roleIdsOf('other-string@uaeaf.ae')).toEqual([OTHER_ROLE.toString()]);
  });

  it('is idempotent — a second detach of the same role changes nothing', async () => {
    await insert(account('string@uaeaf.ae', [ARCHIVED_ROLE.toString(), KEPT_ROLE]));
    await repository.detachRole(ARCHIVED_ROLE.toString());

    expect(await detachedFrom()).toEqual([]);
    expect(await roleIdsOf('string@uaeaf.ae')).toEqual([KEPT_ROLE.toString()]);
  });

  it('refuses an id that is not an ObjectId rather than matching on the string alone', async () => {
    await insert(account('string@uaeaf.ae', ['not-an-object-id']));

    await expect(repository.detachRole('not-an-object-id')).rejects.toThrow();
    expect(await roleIdsOf('string@uaeaf.ae')).toEqual(['not-an-object-id']);
  });
});

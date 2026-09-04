import { Model, Types } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AthleteProfileSchema } from './schemas/athlete-profile.schema.js';
import type { AthleteProfileDocument } from './schemas/athlete-profile.schema.js';
import { AthleteProfilesRepository } from './athlete-profiles.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../test/utils/mongo-memory-server.js';

/**
 * Representative test for the partial-unique-index conversion
 * (schema-audit-2026-09-04.md §9.2/§11, P1 finding): `athleteProfiles.slug`
 * stands in for every field converted in this pass (`users.email`,
 * `clubs`/`coaches.slug`/`registrationNumber`, `disciplines.slug`,
 * `officialProfiles.slug`/`.registrationNumber`/`.officialId`,
 * `albums.slug`, `pages.slug`, `navigationMenus.key`, and
 * `athleteProfiles.athleteId`/`.registrationNumber` themselves) — all use
 * the identical `partialFilterExpression: { archivedAt: null }` pattern.
 */
describe('AthleteProfilesRepository (partial unique index on slug)', () => {
  let server: MongoMemoryServer;
  let model: Model<AthleteProfileDocument>;
  let repository: AthleteProfilesRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<AthleteProfileDocument>('AthleteProfile', AthleteProfileSchema);
    await model.ensureIndexes();
    repository = new AthleteProfilesRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const restricted = { emiratesIdOrPassport: null, address: null, phone: null, email: null };
  const makeProfile = (overrides: Partial<AthleteProfileDocument>) => ({
    athleteId: new Types.ObjectId(),
    slug: 'john-athlete',
    registrationNumber: `REG-${new Types.ObjectId().toString()}`,
    restricted,
    status: 'Active' as const,
    ...overrides,
  });

  it('(a) rejects a second ACTIVE document with the same slug', async () => {
    await repository.create(makeProfile({}));

    await expect(repository.create(makeProfile({}))).rejects.toThrow();
  });

  it('(b) allows a new ACTIVE document to reuse the slug of an ARCHIVED document', async () => {
    const archivedBy = new Types.ObjectId();
    const first = await repository.create(makeProfile({}));
    await repository.softDelete(first._id.toString(), archivedBy);

    await expect(repository.create(makeProfile({}))).resolves.toBeDefined();
  });

  it('(c) allows two ARCHIVED documents to share the same slug', async () => {
    const archivedBy = new Types.ObjectId();
    const first = await repository.create(makeProfile({}));
    await repository.softDelete(first._id.toString(), archivedBy);
    const second = await repository.create(makeProfile({}));
    await expect(repository.softDelete(second._id.toString(), archivedBy)).resolves.toBeDefined();

    const archivedCount = await model.countDocuments({ slug: 'john-athlete', archivedAt: { $ne: null } });
    expect(archivedCount).toBe(2);
  });
});

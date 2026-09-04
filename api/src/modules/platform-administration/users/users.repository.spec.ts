import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserSchema } from './schemas/user.schema.js';
import type { UserDocument } from './schemas/user.schema.js';
import { UsersRepository } from './users.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';

describe('UsersRepository (email normalization)', () => {
  let server: MongoMemoryServer;
  let model: Model<UserDocument>;
  let repository: UsersRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<UserDocument>('User', UserSchema);
    await model.ensureIndexes();
    repository = new UsersRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const baseUser = {
    name: { en: 'Admin', ar: 'المدير' },
    accountStatus: 'Active' as const,
  };

  it('stores email lowercased and trimmed regardless of input casing/whitespace', async () => {
    const created = await repository.create({ ...baseUser, email: '  Admin@UAEAF.ae  ' });
    expect(created.email).toBe('admin@uaeaf.ae');
  });

  it('findByEmail() locates the user regardless of the lookup input\'s casing/whitespace', async () => {
    await repository.create({ ...baseUser, email: 'admin@uaeaf.ae' });

    const found = await repository.findByEmail('  Admin@UAEAF.ae  ');

    expect(found).not.toBeNull();
    expect(found?.email).toBe('admin@uaeaf.ae');
  });

  it('rejects a second account whose email differs only by case (unique index is normalization-aware)', async () => {
    await repository.create({ ...baseUser, email: 'admin@uaeaf.ae' });

    await expect(repository.create({ ...baseUser, email: 'Admin@UAEAF.ae' })).rejects.toThrow();
  });
});

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';
import { Permission, PermissionSchema } from './schemas/permission.schema.js';
import { PermissionsRepository } from './permissions.repository.js';
import { PermissionsService } from './permissions.service.js';

describe('PermissionsService', () => {
  let server: MongoMemoryServer;
  let service: PermissionsService;
  let repository: PermissionsRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    // A model registered under a name whose default collection ("users")
    // happens to match a real FigJam collection, standing in for the real
    // UsersModule without needing to import it here.
    mongoose.model('User', new mongoose.Schema({}, { collection: 'users' }));
    const model = mongoose.model<Permission>('Permission', PermissionSchema);
    repository = new PermissionsRepository(model);
    service = new PermissionsService(repository);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('passes when every resourceType matches a registered collection', async () => {
    await repository.create({ name: { en: 'View users', ar: 'عرض المستخدمين' }, resourceType: 'users', action: 'Read' });

    await expect(service.validateResourceTypes()).resolves.toBeUndefined();
  });

  it('throws when a resourceType has no matching registered collection', async () => {
    await repository.create({ name: { en: 'View ghosts', ar: 'عرض الأشباح' }, resourceType: 'ghosts', action: 'Read' });

    await expect(service.validateResourceTypes()).rejects.toThrow(/ghosts/);
  });
});

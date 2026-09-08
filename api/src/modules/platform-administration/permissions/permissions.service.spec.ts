import mongoose from 'mongoose';
import type { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Permission, PermissionSchema } from './schemas/permission.schema.js';
import { PermissionsRepository } from './permissions.repository.js';
import { PermissionsService } from './permissions.service.js';

/**
 * Deliberately does NOT use the shared `connectTestDatabase()` helper.
 *
 * That helper connects the global `mongoose` default instance, which is not
 * how the application runs: NestJS's `MongooseModule.forRootAsync` creates
 * its own connection and registers all 65 models on that. The previous
 * version of this suite used the global instance, and that is exactly why
 * it stayed green while `validateResourceTypes()` was reading a model list
 * that is permanently empty in production (fixed 2026-09-07).
 *
 * So this suite reproduces the real topology: a dedicated connection holds
 * the models, and the global instance deliberately holds none.
 */
describe('PermissionsService', () => {
  let server: MongoMemoryServer;
  let connection: Connection;
  let service: PermissionsService;
  let repository: PermissionsRepository;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    connection = mongoose.createConnection(server.getUri());
    await connection.asPromise();

    // Stands in for the real UsersModule: a model whose collection name is
    // "users", matching the resourceType the first test seeds.
    connection.model('User', new mongoose.Schema({}, { collection: 'users' }));
    const model = connection.model<Permission>('Permission', PermissionSchema);
    repository = new PermissionsRepository(model);
    service = new PermissionsService(repository, connection);
  });

  afterEach(async () => {
    for (const key of Object.keys(connection.collections)) {
      await connection.collections[key].deleteMany({});
    }
  });

  afterAll(async () => {
    await connection.close();
    await server.stop();
  });

  it('reads the model list from the injected connection, not the global mongoose instance', () => {
    // The regression guard for the 2026-09-07 bug. If the service ever goes
    // back to `mongoose.modelNames()` it sees this empty list, and the test
    // below it starts failing on perfectly valid data.
    expect(mongoose.modelNames()).toHaveLength(0);
    expect(connection.modelNames()).toContain('User');
  });

  it('passes when every resourceType matches a registered collection', async () => {
    await repository.create({
      name: { en: 'View users', ar: 'عرض المستخدمين' },
      resourceType: 'users',
      action: 'Read',
    });

    await expect(service.validateResourceTypes()).resolves.toBeUndefined();
  });

  it('throws when a resourceType has no matching registered collection', async () => {
    // Inserted through the raw driver, deliberately bypassing Mongoose
    // validation. Since 2026-09-07 `resourceType` is an enum, so this row
    // can no longer be created through the model at all — which is the
    // point: the enum is the write-time guard, and `validateResourceTypes()`
    // is the startup guard for rows that arrived some other way (a manual
    // DB edit, a migration, or a row predating the enum). This test covers
    // the second guard, so it must simulate exactly that.
    await connection.collection('permissions').insertOne({
      name: { en: 'View ghosts', ar: 'عرض الأشباح' },
      resourceType: 'ghosts',
      action: 'Read',
    });

    await expect(service.validateResourceTypes()).rejects.toThrow(/ghosts/);
  });
});

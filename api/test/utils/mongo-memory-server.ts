import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/** Starts an ephemeral, real MongoDB instance and connects Mongoose to it
 *  (see BE-PLAN-010 §5.3) — used by both repository unit tests and e2e specs.
 *
 *  Both Jest configs set `testTimeout` to 30 s, and a hook without its own
 *  limit takes that value. The instance itself gets 10 s to start, so under
 *  Jest's 5 s default a cold first start failed the hook before the real
 *  cause could surface. 30 s is also the limit the e2e suites already give
 *  their own `beforeAll`. */
export async function connectTestDatabase(): Promise<MongoMemoryServer> {
  const server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri());
  return server;
}

export async function disconnectTestDatabase(server: MongoMemoryServer): Promise<void> {
  await mongoose.disconnect();
  await server.stop();
}

export async function clearTestDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

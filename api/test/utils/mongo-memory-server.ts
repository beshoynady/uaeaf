import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/** Starts an ephemeral, real MongoDB instance and connects Mongoose to it
 *  (see BE-PLAN-010 §5.3) — used by both repository unit tests and e2e specs. */
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

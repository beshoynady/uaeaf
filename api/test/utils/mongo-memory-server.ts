import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { Connection, Model, Schema } from 'mongoose';

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

/** Compiles a schema into a model typed the way the application's
 *  repositories receive one: `Model<XDocument>`.
 *
 *  The repositories declare `Model<HydratedDocument<X>>`, which Mongoose 9's
 *  `model()` generics do not produce from a `Schema<X>`. Nest injects models
 *  untyped, so the application never meets the mismatch; a test that compiles
 *  its own model does. The one cast that bridges it lives here rather than in
 *  every such test. The root is in the repositories, recorded as a separate
 *  item in docs/engineering/plans/president-message-plan.md.
 *
 *  Without `connection` it registers on the global mongoose instance, the one
 *  `connectTestDatabase()` connects. */
export const registerTestModel = <TDocument>(
  name: string,
  schema: Schema,
  connection?: Connection,
): Model<TDocument> =>
  (connection ? connection.model(name, schema) : mongoose.model(name, schema)) as unknown as Model<TDocument>;

/** The part of an `explain('queryPlanner')` result the index tests read.
 *  Mongoose types `explain()` as returning the query itself; the server
 *  answers with its explain document. */
export type QueryPlannerExplanation = { queryPlanner: { winningPlan: unknown } };

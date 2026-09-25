import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { Connection, Model, Schema } from 'mongoose';

/** Starts an ephemeral, real MongoDB instance and connects Mongoose to it
 *  (see BE-PLAN-010 §5.3) — used by both repository unit tests and e2e specs.
 *
 *  Both Jest configs set `testTimeout` to 30 s, and a hook without its own
 *  limit takes that value. 30 s is also the limit the e2e suites already give
 *  their own `beforeAll`.
 *
 *  `launchTimeout` is raised from the library's 10 s default because that
 *  default is measured against a cold start on this project's disk: mongod
 *  reaches "waiting for connections" in about 3 s once the OS has its pages
 *  cached, and well past 10 s the first time, while ts-jest is compiling in
 *  the same process. At 10 s every integration spec in the repository failed
 *  identically — an environment limit reported as a instance error, with the
 *  real cause not in the message. It stays inside the 30 s hook budget. */
const LAUNCH_TIMEOUT_MS = 25_000;

export async function connectTestDatabase(): Promise<MongoMemoryServer> {
  const server = await MongoMemoryServer.create({ instance: { launchTimeout: LAUNCH_TIMEOUT_MS } });
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

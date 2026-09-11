import type { Connection, Model } from 'mongoose';

/**
 * What every script that writes to the local development database shares:
 * the refusal to touch anything else, and access to the models and the raw
 * database behind a connection.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Refuses production, and any database that is not on this machine.
 *
 * These scripts delete page records, rewrite dates and copy a database into
 * the repository; pointed at a shared server, any of those is an incident.
 * The refusal never repeats the address, which can carry a password.
 */
export function assertSafeDevTarget(uri: string | undefined, nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new Error('Refusing to run with NODE_ENV=production. Development scripts are for development databases only.');
  }
  if (!uri) {
    throw new Error('MONGODB_URI is not set.');
  }

  // `mongodb+srv://` never matches: it names a DNS record, which is a remote cluster by definition.
  const match = /^mongodb:\/\/(?:[^@/]*@)?([^/?]+)/.exec(uri);
  const hosts = match ? match[1].split(',').map(hostOf) : [];
  if (hosts.length === 0 || !hosts.every((host) => LOCAL_HOSTS.has(host))) {
    throw new Error(
      'Refusing: MONGODB_URI must point at a local database (localhost, 127.0.0.1 or ::1). ' +
        'Development scripts never write to, or read from, a shared server.',
    );
  }
}

function hostOf(hostAndPort: string): string {
  if (hostAndPort.startsWith('[')) return hostAndPort.slice(1, hostAndPort.indexOf(']'));
  return hostAndPort.split(':')[0].toLowerCase();
}

/**
 * Every model compiled against this connection. `AppModule` registers them
 * on the Nest connection; the test suite registers them on Mongoose's
 * default one, where they are listed on the Mongoose instance instead.
 */
export function registeredModels(connection: Connection): Model<unknown>[] {
  const candidates = [...Object.values(connection.models), ...Object.values(connection.base?.models ?? {})];
  return [...new Set(candidates)].filter((model) => model.db === connection) as Model<unknown>[];
}

/** The raw driver database — writes through it bypass Mongoose middleware,
 *  `timestamps` included, which is the point for scripts that must write
 *  exactly what they mean. */
export async function openDatabase(connection: Connection): Promise<NonNullable<Connection['db']>> {
  if (!connection.db) await connection.asPromise();
  return connection.db!;
}

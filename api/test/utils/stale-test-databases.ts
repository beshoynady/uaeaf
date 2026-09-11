import { readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** `mongodb-memory-server`'s prefix for the data folder of every instance
 *  it starts. Nothing else is ever touched. */
const TEST_DATABASE_PREFIX = 'mongo-mem-';

/** A live mongod checkpoints every 60 seconds, so an hour without a write
 *  is not an instance that is merely slow — it is one whose process is gone. */
const DEFAULT_STALE_AFTER_MS = 60 * 60 * 1000;

export interface SweepOptions {
  root?: string;
  now?: number;
  staleAfterMs?: number;
}

/**
 * Deletes the data folders that crashed test runs left behind.
 *
 * `MongoMemoryServer.stop()` removes its folder, so a run that finishes
 * leaves nothing; one that crashes never gets there, and the folder stays
 * in the temp directory for good. Those folders hold real WiredTiger files
 * — tens to hundreds of megabytes each — and accumulate on the system drive.
 *
 * A folder is stale when its newest file is older than the threshold. The
 * folder's own date would be the wrong test: it is set when the instance
 * starts, and a long run is still writing.
 *
 * Returns the names removed. Never throws: a folder that cannot be deleted
 * — on Windows, one a running mongod still holds open — is left for the
 * next run, and a failed sweep must never be what fails the tests.
 */
export async function sweepStaleTestDatabases(options: SweepOptions = {}): Promise<string[]> {
  const root = options.root ?? tmpdir();
  const now = options.now ?? Date.now();
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;

  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const removed: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(TEST_DATABASE_PREFIX)) continue;

    const path = join(root, entry.name);
    try {
      if (now - (await newestWrite(path)) <= staleAfterMs) continue;
      await rm(path, { recursive: true, force: true });
      removed.push(entry.name);
    } catch {
      // Held open by a live process, or gone already: either way, not ours to force.
    }
  }
  return removed;
}

/**
 * Jest `globalSetup` for both the unit and the e2e configuration: runs once,
 * before any worker starts an instance of its own.
 *
 * It lives in this file rather than a wrapper beside it because Jest loads
 * `globalSetup` through Node's own ESM loader, not its module mapper — a
 * wrapper's `./stale-test-databases.js` import does not resolve to this
 * `.ts` file there. With no relative imports, Node's type stripping loads it
 * as is.
 */
export default async function globalSetup(): Promise<void> {
  const removed = await sweepStaleTestDatabases();
  if (removed.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`\n[test setup] removed ${removed.length} test database folder(s) left by crashed runs`);
  }
}

/** The most recent modification time of the folder or anything inside it. */
async function newestWrite(path: string): Promise<number> {
  let newest = (await stat(path)).mtimeMs;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    const time = entry.isDirectory() ? await newestWrite(child) : (await stat(child)).mtimeMs;
    if (time > newest) newest = time;
  }
  return newest;
}

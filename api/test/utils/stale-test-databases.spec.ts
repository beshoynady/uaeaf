import { mkdtemp, mkdir, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sweepStaleTestDatabases } from './stale-test-databases.js';

/**
 * A test run that crashes never reaches `MongoMemoryServer.stop()`, so the
 * data folder of every instance it started stays in the temp directory for
 * good. They accumulate to gigabytes on the system drive — enough to stop
 * Windows growing its page file, which runs the machine out of memory and
 * takes the MongoDB service down with it.
 *
 * The sweep runs at the start of every test run. What it must never do is
 * touch the folder of an instance that is still alive, or anything that is
 * not a test database at all.
 */
describe('sweepStaleTestDatabases', () => {
  const HOUR = 60 * 60 * 1000;
  const now = Date.parse('2026-09-11T06:00:00Z');
  let root: string;

  async function folder(name: string, ageMs: number, withFile = true): Promise<void> {
    const path = join(root, name);
    await mkdir(path);
    const at = new Date(now - ageMs);
    if (withFile) {
      const file = join(path, 'WiredTiger.wt');
      await writeFile(file, 'x');
      await utimes(file, at, at);
    }
    await utimes(path, at, at);
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'sweep-spec-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('removes a test database folder nothing has written to for longer than the threshold', async () => {
    await folder('mongo-mem-crashed', 3 * HOUR);

    const removed = await sweepStaleTestDatabases({ root, now, staleAfterMs: HOUR });

    expect(removed).toEqual(['mongo-mem-crashed']);
    expect(await readdir(root)).toEqual([]);
  });

  it('leaves the folder of an instance that is still writing', async () => {
    // A live mongod checkpoints every 60 seconds, so its newest file is
    // always recent — that, not the folder's own age, is what marks it live.
    await folder('mongo-mem-live', 30 * 1000);

    const removed = await sweepStaleTestDatabases({ root, now, staleAfterMs: HOUR });

    expect(removed).toEqual([]);
    expect(await readdir(root)).toEqual(['mongo-mem-live']);
  });

  it('judges a folder by its newest file, not by when the folder was created', async () => {
    await folder('mongo-mem-long-running', 5 * HOUR);
    const recent = new Date(now - 60 * 1000);
    const file = join(root, 'mongo-mem-long-running', 'journal.wt');
    await writeFile(file, 'x');
    await utimes(file, recent, recent);
    // Adding the file refreshed the folder's own date; put it back, or this
    // case would pass for an implementation that only reads the folder.
    const created = new Date(now - 5 * HOUR);
    await utimes(join(root, 'mongo-mem-long-running'), created, created);

    expect(await sweepStaleTestDatabases({ root, now, staleAfterMs: HOUR })).toEqual([]);
  });

  it('removes an old folder a crash left empty', async () => {
    await folder('mongo-mem-empty', 3 * HOUR, false);

    expect(await sweepStaleTestDatabases({ root, now, staleAfterMs: HOUR })).toEqual(['mongo-mem-empty']);
  });

  it('touches nothing that is not a test database folder, however old', async () => {
    await folder('some-other-tool', 30 * 24 * HOUR);
    await writeFile(join(root, 'mongo-mem-not-a-folder'), 'x');

    const removed = await sweepStaleTestDatabases({ root, now, staleAfterMs: HOUR });

    expect(removed).toEqual([]);
    expect((await readdir(root)).sort()).toEqual(['mongo-mem-not-a-folder', 'some-other-tool']);
  });

  it('does not fail the run when the temp directory does not exist', async () => {
    await expect(
      sweepStaleTestDatabases({ root: join(root, 'missing'), now, staleAfterMs: HOUR }),
    ).resolves.toEqual([]);
  });
});

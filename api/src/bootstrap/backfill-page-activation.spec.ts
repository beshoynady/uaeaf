import { jest } from '@jest/globals';
import type { Connection } from 'mongoose';
import {
  ACTIVATABLE_COLLECTIONS,
  backfillPageActivation,
  planPageActivationBackfill,
} from './backfill-page-activation.js';

/**
 * A page written before `isActive` existed carries no such key, and Mongoose
 * applies a schema default when it *creates* a document — never to one already
 * stored. So without this backfill every one of these pages reads back
 * `undefined`, the public gate sees "not true", and fifteen live pages go dark
 * the moment the gate ships. That is the failure these tests pin.
 */
describe('backfillPageActivation', () => {
  /** One fake collection per name, each answering how many of its rows lack
   *  the key. `updateMany` reports the same number as modified, which is what
   *  a real `$set` scoped to the missing key would report. */
  const makeConnection = (missing: Readonly<Record<string, number>>) => {
    const updates: { name: string; filter: unknown; update: unknown }[] = [];

    const collection = jest.fn((name: string) => ({
      countDocuments: jest.fn(async () => missing[name] ?? 0),
      updateMany: jest.fn(async (filter: unknown, update: unknown) => {
        updates.push({ name, filter, update });
        return { modifiedCount: missing[name] ?? 0 };
      }),
    }));

    return { connection: { collection } as unknown as Connection, updates };
  };

  it('names the fifteen collections that carry the shared field, and not About', () => {
    // Fifteen collections extend `HeroPageSchema`. `aboutFederationPage`
    // declares its own `isActive` at `default: false` and has never been live,
    // so it has nothing to preserve and must not be switched on by a migration.
    expect(ACTIVATABLE_COLLECTIONS).toHaveLength(15);
    expect(ACTIVATABLE_COLLECTIONS).not.toContain('aboutFederationPage');
    expect(ACTIVATABLE_COLLECTIONS).toContain('presidentMessagePage');
    expect(ACTIVATABLE_COLLECTIONS).toContain('contactUsPage');
  });

  it('reports what it would write without writing it', async () => {
    const { connection, updates } = makeConnection({ athletesPage: 1, clubsPage: 1 });

    const plan = await planPageActivationBackfill(connection);

    expect(plan.total).toBe(2);
    expect(plan.missingKey.athletesPage).toBe(1);
    expect(plan.missingKey.clubsPage).toBe(1);
    // Every collection is named, including the ones with nothing to write: a
    // name absent from the report would read as "nothing to do there" whether
    // or not anything was looked at.
    expect(Object.keys(plan.missingKey)).toEqual([...ACTIVATABLE_COLLECTIONS]);
    expect(updates).toHaveLength(0);
  });

  it('writes true only where the key is absent', async () => {
    const { connection, updates } = makeConnection({ athletesPage: 1 });

    const report = await backfillPageActivation(connection);

    expect(report.total).toBe(1);
    const athletes = updates.find((entry) => entry.name === 'athletesPage');
    // Scoped to the missing key, so an editor who has already switched a page
    // off does not have that undone, and running it twice is running it once.
    expect(athletes?.filter).toEqual({ isActive: { $exists: false } });
    expect(athletes?.update).toEqual({ $set: { isActive: true } });
  });

  it('does not move updatedAt', async () => {
    const { connection, updates } = makeConnection({ recordsPage: 1 });

    await backfillPageActivation(connection);

    // `publishDirect` uses `updatedAt` for optimistic concurrency, so a
    // migration that bumps it invalidates every open editor's
    // `expectedUpdatedAt`. Driver-level `updateMany` writes no timestamp of its
    // own — the assertion is that no `$currentDate` was added on top of it.
    for (const entry of updates) {
      expect(entry.update).not.toHaveProperty('$currentDate');
      expect(Object.keys(entry.update as object)).toEqual(['$set']);
    }
  });

  it('touches every collection, including the ones with nothing missing', async () => {
    const { connection, updates } = makeConnection({});

    const report = await backfillPageActivation(connection);

    expect(report.total).toBe(0);
    // Every collection is visited so the report names all fifteen: a migration
    // that silently skipped a collection would read as "nothing to do there".
    expect(updates.map((entry) => entry.name)).toEqual([...ACTIVATABLE_COLLECTIONS]);
  });
});

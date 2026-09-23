import { jest } from '@jest/globals';
import type { Connection } from 'mongoose';
import { backfillArticleSource, planSourceBackfill } from './backfill-article-source.js';

/**
 * A round-up written before `sourceOutlet` existed names no outlet, and stays
 * that way until an editor names one: the backfill writes `null`, never a
 * guess about who published a story first.
 */
describe('backfillArticleSource', () => {
  const makeConnection = (counts: { missing: number; without: number; with: number }) => {
    const updateMany = jest.fn(async () => ({ modifiedCount: counts.missing }));
    const countDocuments = jest.fn(async (filter: Record<string, unknown>) => {
      // The three reads differ by whether they name a category at all.
      if (filter.category !== 'FederationInMedia') return counts.missing;
      return filter.sourceOutlet ? counts.with : counts.without;
    });
    const collection = jest.fn(() => ({ countDocuments, updateMany }));

    return { connection: { collection } as unknown as Connection, updateMany };
  };

  it('reports what it would write without writing it', async () => {
    const { connection, updateMany } = makeConnection({ missing: 5, without: 2, with: 0 });

    expect(await planSourceBackfill(connection)).toEqual({
      missingKey: 5,
      coverageWithoutSource: 2,
      coverageWithSource: 0,
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('writes null onto the articles missing either key, and nothing else', async () => {
    const { connection, updateMany } = makeConnection({ missing: 3, without: 1, with: 1 });

    await backfillArticleSource(connection);

    expect(updateMany).toHaveBeenCalledWith(
      { $or: [{ sourceOutlet: { $exists: false } }, { sourceUrl: { $exists: false } }] },
      { $set: { sourceOutlet: null, sourceUrl: null } },
    );
  });

  it('writes nothing when every article already declares both keys', async () => {
    const { connection, updateMany } = makeConnection({ missing: 0, without: 4, with: 8 });

    // Zero to write, and still four round-ups for the newsroom to fill in:
    // the backfill's job is the keys, not the editorial backlog it reports.
    expect(await backfillArticleSource(connection)).toEqual({
      missingKey: 0,
      coverageWithoutSource: 4,
      coverageWithSource: 8,
    });
    expect(updateMany).not.toHaveBeenCalled();
  });
});

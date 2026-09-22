import { jest } from '@jest/globals';
import type { Connection } from 'mongoose';
import { backfillArticleTopic, planTopicBackfill } from './backfill-article-topic.js';

/**
 * An article written before `topic` existed is unclassified, and stays so
 * until someone classifies it: the backfill writes `null`, never a guess.
 */
describe('backfillArticleTopic', () => {
  const makeConnection = (counts: { missing: number; unclassified: number; classified: number }) => {
    const updateMany = jest.fn(async () => ({ modifiedCount: counts.missing }));
    const countDocuments = jest.fn(async (filter: { topic?: unknown }) => {
      const topic = filter.topic as { $exists?: boolean; $ne?: null } | null;
      if (topic === null) return counts.unclassified;
      return topic?.$exists === false ? counts.missing : counts.classified;
    });
    const collection = jest.fn(() => ({ countDocuments, updateMany }));

    return { connection: { collection } as unknown as Connection, updateMany };
  };

  it('reports what it would write without writing it', async () => {
    const { connection, updateMany } = makeConnection({ missing: 12, unclassified: 12, classified: 0 });

    expect(await planTopicBackfill(connection)).toEqual({ missingKey: 12, unclassified: 12, classified: 0 });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('writes null onto the articles with no topic key, and nothing else', async () => {
    const { connection, updateMany } = makeConnection({ missing: 3, unclassified: 3, classified: 2 });

    await backfillArticleTopic(connection);

    expect(updateMany).toHaveBeenCalledWith({ topic: { $exists: false } }, { $set: { topic: null } });
  });

  it('writes nothing when every article already declares a topic key', async () => {
    const { connection, updateMany } = makeConnection({ missing: 0, unclassified: 4, classified: 8 });

    expect(await backfillArticleTopic(connection)).toEqual({ missingKey: 0, unclassified: 4, classified: 8 });
    expect(updateMany).not.toHaveBeenCalled();
  });
});

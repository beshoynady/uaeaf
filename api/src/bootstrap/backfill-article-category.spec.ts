import { jest } from '@jest/globals';
import type { Connection } from 'mongoose';
import { backfillArticleCategory, planCategoryBackfill } from './backfill-article-category.js';

/**
 * The defect this closes is invisible on every screen.
 *
 * An article stored before `category` existed reads back as `General`, because
 * Mongoose applies the default on hydration — and does not match a query for
 * `General`, because the key is not in the document. So the categorised feed is
 * quietly shorter than the uncategorised one, and nothing anywhere reports it.
 */
describe('backfillArticleCategory', () => {
  const makeConnection = (missing: number, present: number) => {
    const updateMany = jest.fn(async () => ({ modifiedCount: missing }));
    const countDocuments = jest.fn(async (filter: { category?: { $exists: boolean } }) =>
      filter.category?.$exists === false ? missing : present,
    );
    const collection = jest.fn(() => ({ countDocuments, updateMany }));

    return { connection: { collection } as unknown as Connection, updateMany, collection };
  };

  it('reports what it would write without writing it', async () => {
    const { connection, updateMany } = makeConnection(3, 2);

    expect(await planCategoryBackfill(connection)).toEqual({ filled: 3, alreadySet: 2 });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('fills only the documents that carry no category key', async () => {
    const { connection, updateMany } = makeConnection(3, 2);

    const report = await backfillArticleCategory(connection);

    expect(report).toEqual({ filled: 3, alreadySet: 2 });
    expect(updateMany).toHaveBeenCalledWith(
      { category: { $exists: false } },
      { $set: { category: 'General' } },
    );
  });

  it('leaves a deliberately chosen category alone, even when it is General', async () => {
    const { connection, updateMany } = makeConnection(1, 4);

    await backfillArticleCategory(connection);

    // `$exists: true` is what protects an editor's own filing decision from
    // being rewritten by a migration that runs again next deploy.
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ category: { $exists: false } }),
      expect.anything(),
    );
  });

  it('writes nothing at all when there is nothing to fill', async () => {
    const { connection, updateMany } = makeConnection(0, 6);

    const report = await backfillArticleCategory(connection);

    expect(report).toEqual({ filled: 0, alreadySet: 6 });
    // Running it twice must be the same as running it once.
    expect(updateMany).not.toHaveBeenCalled();
  });
});

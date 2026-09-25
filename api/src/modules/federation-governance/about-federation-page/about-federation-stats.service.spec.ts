import { jest } from '@jest/globals';
import { Model } from 'mongoose';
import { AboutFederationStatsService } from './about-federation-stats.service.js';

/**
 * The ecosystem section's numbers are counted, never written.
 *
 * The rule this guards is the owner's: no figure about the federation is
 * typed by hand into a page, because a typed figure is right on the day it is
 * typed and wrong afterwards, with nothing to notice it. A source that does
 * not exist answers `null`, and the page drops that tile rather than printing
 * a placeholder or a stale number.
 */

/** Records the filter it was asked to count with, so a test can assert what
 *  the service actually excluded rather than trusting the number back. */
const modelCounting = (total: number, seen: Record<string, unknown>[] = []) =>
  ({
    countDocuments: jest.fn((filter: Record<string, unknown> = {}) => {
      seen.push(filter);
      return { exec: async () => total };
    }),
  }) as unknown as Model<unknown>;

const modelFailing = () =>
  ({
    countDocuments: jest.fn(() => ({
      exec: async () => {
        throw new Error('collection unavailable');
      },
    })),
  }) as unknown as Model<unknown>;

describe('AboutFederationStatsService', () => {
  it('counts the three collections that exist', async () => {
    const service = new AboutFederationStatsService(modelCounting(18), modelCounting(1240), modelCounting(45));

    expect(await service.counts()).toEqual({
      clubs: 18,
      athletes: 1240,
      officials: 45,
      championships: null,
    });
  });

  // There is no championships collection yet. Answering `null` rather than
  // zero is the difference between "we do not know" and "there are none":
  // a zero would print a tile claiming the federation runs no championships.
  it('answers null for championships, which has no collection to count', async () => {
    const service = new AboutFederationStatsService(modelCounting(1), modelCounting(1), modelCounting(1));

    expect((await service.counts()).championships).toBeNull();
  });

  it('counts an empty collection as zero, which is a fact and not a gap', async () => {
    const service = new AboutFederationStatsService(modelCounting(0), modelCounting(5), modelCounting(5));

    expect((await service.counts()).clubs).toBe(0);
  });

  // One unreadable collection must not take the whole section down with it.
  it('answers null for a source it could not read, and keeps the others', async () => {
    const service = new AboutFederationStatsService(modelFailing(), modelCounting(1240), modelCounting(45));

    expect(await service.counts()).toEqual({
      clubs: null,
      athletes: 1240,
      officials: 45,
      championships: null,
    });
  });

  it('answers all-null when nothing can be counted, so the caller can drop the section', async () => {
    const service = new AboutFederationStatsService(modelFailing(), modelFailing(), modelFailing());

    expect(Object.values(await service.counts()).every((count) => count === null)).toBe(true);
  });
});

/**
 * The page says "18 clubs in the system", not "18 rows in a table".
 *
 * Counting everything would include archived records — deleted, as far as
 * every other screen is concerned — and, for clubs, ones the federation has
 * marked Inactive. Either would overstate the federation to a visitor, and the
 * number would disagree with the club listing on the very next page.
 */
describe('AboutFederationStatsService — what it counts', () => {
  it('excludes archived records from every source, as every public read does', async () => {
    const clubFilters: Record<string, unknown>[] = [];
    const athleteFilters: Record<string, unknown>[] = [];
    const officialFilters: Record<string, unknown>[] = [];

    await new AboutFederationStatsService(
      modelCounting(1, clubFilters),
      modelCounting(1, athleteFilters),
      modelCounting(1, officialFilters),
    ).counts();

    for (const filters of [clubFilters, athleteFilters, officialFilters]) {
      expect(filters[0]).toMatchObject({ archivedAt: null });
    }
  });

  /** `clubs` is the one of the three that carries a status. A club the
   *  federation marked Inactive is not a member of the system today. */
  it('counts only Active clubs, which is what the tile claims', async () => {
    const clubFilters: Record<string, unknown>[] = [];

    await new AboutFederationStatsService(
      modelCounting(1, clubFilters),
      modelCounting(1),
      modelCounting(1),
    ).counts();

    expect(clubFilters[0]).toEqual({ archivedAt: null, status: 'Active' });
  });

  /** Athletes and officials have no status field; their own public listings
   *  filter on nothing but the soft delete, and these numbers must agree with
   *  those listings. */
  it('filters athletes and officials exactly as their own public listings do', async () => {
    const athleteFilters: Record<string, unknown>[] = [];
    const officialFilters: Record<string, unknown>[] = [];

    await new AboutFederationStatsService(
      modelCounting(1),
      modelCounting(1, athleteFilters),
      modelCounting(1, officialFilters),
    ).counts();

    expect(athleteFilters[0]).toEqual({ archivedAt: null });
    expect(officialFilters[0]).toEqual({ archivedAt: null });
  });
});

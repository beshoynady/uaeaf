import { resolveSeasonRange } from './season-range-resolver.js';
import type { FindSeasonDays } from './season-range-resolver.js';
import { seasonRange } from '../videos/season.js';

/** A Dubai calendar day stored the way the dashboard stores one: its Dubai midnight. */
const day = (date: string): Date => new Date(`${date}T00:00:00+04:00`);

/** A lookup that answers one slug and records every slug it was asked for. */
const lookup = (slug: string, first: string, last: string) => {
  const asked: string[] = [];
  const find: FindSeasonDays = async (value) => {
    asked.push(value);
    return value === slug ? { startDate: day(first), endDate: day(last) } : null;
  };
  return { find, asked };
};

describe('resolveSeasonRange', () => {
  it('reads a label exactly as seasonRange does, without looking up a season', async () => {
    const { find, asked } = lookup('2025–2026', '2025-08-15', '2026-07-31');

    await expect(resolveSeasonRange('2025–2026', find)).resolves.toEqual(seasonRange('2025–2026'));
    expect(asked).toEqual([]);
  });

  it("resolves a season's slug to its own inclusive Dubai days, half-open", async () => {
    const { find } = lookup('2025-2026', '2025-08-15', '2026-07-31');

    const range = await resolveSeasonRange('2025-2026', find);

    expect(range?.from.toISOString()).toBe('2025-08-14T20:00:00.000Z');
    // The whole of 31 July in Dubai: the range ends where 1 August begins.
    expect(range?.to.toISOString()).toBe('2026-07-31T20:00:00.000Z');
  });

  it('resolves a slug that is not shaped like a year pair', async () => {
    const { find } = lookup('indoor-2027', '2027-01-10', '2027-03-01');

    const range = await resolveSeasonRange('indoor-2027', find);

    expect(range?.from.toISOString()).toBe('2027-01-09T20:00:00.000Z');
  });

  it('resolves a one-day season to that whole Dubai day', async () => {
    const { find } = lookup('one-day', '2027-02-02', '2027-02-02');

    const range = await resolveSeasonRange('one-day', find);

    expect(range?.from.toISOString()).toBe('2027-02-01T20:00:00.000Z');
    expect(range?.to.toISOString()).toBe('2027-02-02T20:00:00.000Z');
  });

  it('answers null for a slug no visible season holds, rather than reading it as a label', async () => {
    const { find, asked } = lookup('something-else', '2025-08-15', '2026-07-31');

    await expect(resolveSeasonRange('2025-2026', find)).resolves.toBeNull();
    expect(asked).toEqual(['2025-2026']);
  });

  it.each([undefined, ''])('answers null for an absent parameter (%p) without a lookup', async (param) => {
    const { find, asked } = lookup('x', '2025-08-15', '2026-07-31');

    await expect(resolveSeasonRange(param, find)).resolves.toBeNull();
    expect(asked).toEqual([]);
  });
});

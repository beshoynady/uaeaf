import {
  dayRangeContains,
  dayRangesOverlap,
  dubaiDayRange,
  dubaiDayStart,
  isWithinDayRange,
} from './dubai-day-range.util.js';

/** A Dubai wall-clock time written with its offset, so each case reads as the
 *  time a person in Dubai would see. */
const dubai = (local: string): Date => new Date(`${local}+04:00`);

describe('dubaiDayRange — first and last day are inclusive Dubai calendar days', () => {
  // Stored the way the dashboard stores a day: that day's Dubai midnight.
  const season = dubaiDayRange(dubai('2026-09-01T00:00:00'), dubai('2027-08-31T00:00:00'));

  it('runs from Dubai midnight of the first day to Dubai midnight after the last', () => {
    expect(season.from.toISOString()).toBe('2026-08-31T20:00:00.000Z');
    expect(season.to.toISOString()).toBe('2027-08-31T20:00:00.000Z');
  });

  it('holds an event at 23:30 Dubai on the last day', () => {
    expect(isWithinDayRange(dubai('2027-08-31T23:30:00'), season)).toBe(true);
  });

  it('does not hold an event at 00:00 Dubai on the day after the last', () => {
    expect(isWithinDayRange(dubai('2027-09-01T00:00:00'), season)).toBe(false);
  });

  it('holds an event at 02:00 Dubai on the first day, which is 22:00 UTC the day before', () => {
    const early = dubai('2026-09-01T02:00:00');
    expect(early.toISOString()).toBe('2026-08-31T22:00:00.000Z');
    expect(isWithinDayRange(early, season)).toBe(true);
  });

  it('reads a day from whatever time it carries, not from UTC midnight', () => {
    // `new Date('2026-09-01')` is 04:00 Dubai on the 1st; 23:59 Dubai is 19:59 UTC.
    const range = dubaiDayRange(new Date('2026-09-01'), dubai('2027-08-31T23:59:00'));
    expect(range).toEqual(season);
  });

  it('carries a last day at the end of a month into the next month', () => {
    expect(dubaiDayStart(dubai('2026-12-31T23:59:59')).toISOString()).toBe('2026-12-30T20:00:00.000Z');
    expect(dubaiDayRange(dubai('2026-12-31T00:00:00'), dubai('2026-12-31T00:00:00')).to.toISOString()).toBe(
      '2026-12-31T20:00:00.000Z',
    );
  });
});

describe('dayRangesOverlap / dayRangeContains', () => {
  const march = dubaiDayRange(dubai('2027-03-01T00:00:00'), dubai('2027-03-31T00:00:00'));

  it('treats ranges sharing a day as overlapping', () => {
    const fromLastDay = dubaiDayRange(dubai('2027-03-31T00:00:00'), dubai('2027-04-10T00:00:00'));
    expect(dayRangesOverlap(march, fromLastDay)).toBe(true);
  });

  it('treats consecutive days as not overlapping', () => {
    const april = dubaiDayRange(dubai('2027-04-01T00:00:00'), dubai('2027-04-30T00:00:00'));
    expect(dayRangesOverlap(march, april)).toBe(false);
  });

  it('contains a range ending on the same last day, and not one running a day past it', () => {
    const lateMarch = dubaiDayRange(dubai('2027-03-20T00:00:00'), dubai('2027-03-31T00:00:00'));
    const pastMarch = dubaiDayRange(dubai('2027-03-20T00:00:00'), dubai('2027-04-01T00:00:00'));
    expect(dayRangeContains(march, lateMarch)).toBe(true);
    expect(dayRangeContains(march, pastMarch)).toBe(false);
  });
});

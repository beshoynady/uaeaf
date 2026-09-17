import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isInWindow, sponsorshipState } from './sponsorship-window.util.js';

/**
 * The API's copy of the sponsorship window (ADR-0077 D2, ADR-0085 D1).
 *
 * The web and the dashboard read the same rule from `@uaeaf/content/sponsors`
 * (`window.ts`). The API cannot import that workspace (its compiled root is
 * `src`), so the rule is repeated here, and the last test fails the day the
 * two copies disagree.
 */
describe('sponsorship window (API copy)', () => {
  const start = '2026-08-31T20:00:00.000Z'; // 2026-09-01 00:00 Dubai
  const end = '2027-08-31T19:59:59.000Z'; // 2027-08-31 23:59:59 Dubai

  it('opens at Dubai midnight of the start day and closes after the end day', () => {
    expect(isInWindow(start, end, new Date('2026-08-31T19:59:00.000Z'))).toBe(false);
    expect(isInWindow(start, end, new Date('2026-08-31T20:00:00.000Z'))).toBe(true);
    expect(isInWindow(start, end, new Date('2027-08-31T19:59:00.000Z'))).toBe(true);
    expect(isInWindow(start, end, new Date('2027-08-31T20:00:00.000Z'))).toBe(false);
  });

  it('treats a missing end as open-ended and a cancelled status as never running', () => {
    expect(isInWindow(start, null, new Date('2099-01-01T00:00:00.000Z'))).toBe(true);
    expect(sponsorshipState({ startDate: start, endDate: end, status: 'Cancelled' }, new Date('2027-01-01T00:00:00.000Z'))).toBe(
      'cancelled',
    );
  });

  it('is the same rule the site and the dashboard read, never a copy that drifts', () => {
    const shared = readFileSync(join(process.cwd(), '..', 'packages', 'content', 'sponsors', 'window.ts'), 'utf-8');
    const local = readFileSync(new URL('./sponsorship-window.util.ts', import.meta.url), 'utf-8');
    // Everything between the two markers is the rule itself; what surrounds it
    // is each workspace's imports, quoting and export syntax.
    const rule = (source: string) => {
      const body = source.split('// RULE-START')[1]?.split('// RULE-END')[0] ?? '';
      return body.replace(/'/g, '"').replace(/\s+/g, ' ').trim();
    };
    expect(rule(local)).not.toBe('');
    expect(rule(local)).toBe(rule(shared));
  });
});

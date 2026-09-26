import { holdsPair, missingPairs } from './user-authority.js';

/**
 * The comparison behind "you cannot hand out what you do not hold".
 *
 * Pure functions, tested without a Nest module, because the rule they encode is
 * the one the roles review found missing entirely — worth pinning on its own
 * before it is wired into two services that each have their own reasons to fail.
 */
describe('user-authority', () => {
  const grant = (resourceType: string, action: string, scope?: 'own' | 'all') => ({
    resourceType,
    action,
    scope: scope ?? null,
  });

  it('holds a pair it has exactly', () => {
    expect(holdsPair([grant('articles', 'Update')], grant('articles', 'Update'))).toBe(true);
  });

  it('does not hold a pair it lacks', () => {
    expect(holdsPair([grant('articles', 'Read')], grant('articles', 'Update'))).toBe(false);
  });

  it('does not confuse the same action on another resource', () => {
    expect(holdsPair([grant('articles', 'Update')], grant('users', 'Update'))).toBe(false);
  });

  it('refuses a wider scope than it holds', () => {
    expect(holdsPair([grant('articles', 'Update', 'own')], grant('articles', 'Update', 'all'))).toBe(
      false,
    );
  });

  it('allows granting a narrower scope than it holds', () => {
    expect(holdsPair([grant('articles', 'Update', 'all')], grant('articles', 'Update', 'own'))).toBe(
      true,
    );
  });

  it('treats an unscoped pair on both sides as equal', () => {
    expect(holdsPair([grant('users', 'Read')], grant('users', 'Read'))).toBe(true);
  });

  it('names every pair the holder is missing, deduplicated and in first-seen order', () => {
    const held = [grant('articles', 'Read')];
    const wanted = [grant('articles', 'Update'), grant('users', 'Create'), grant('articles', 'Update')];

    expect(missingPairs(held, wanted)).toEqual([grant('articles', 'Update'), grant('users', 'Create')]);
  });

  it('returns nothing when every wanted pair is held', () => {
    const held = [grant('articles', 'Read'), grant('articles', 'Update')];

    expect(missingPairs(held, [grant('articles', 'Read')])).toEqual([]);
  });

  it('treats an empty want list as satisfied, whatever is held', () => {
    expect(missingPairs([], [])).toEqual([]);
  });

  it('reports every wanted pair when nothing at all is held', () => {
    expect(missingPairs([], [grant('users', 'Create')])).toEqual([grant('users', 'Create')]);
  });
});

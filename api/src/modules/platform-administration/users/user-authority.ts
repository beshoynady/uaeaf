/**
 * The comparison behind "you cannot hand out what you do not hold".
 *
 * Pure functions with no Nest and no I/O. Independent review finding F7 was
 * that this comparison existed three times, each slightly different, so a
 * rule tightened in one stayed loose in the others. It is now the one place
 * every grant-vs-grant permission check in the codebase runs through:
 * `RolesService.assertGrantable` (building a role) and `assertRemovable`
 * (shrinking or archiving one), plus `UsersService.assertAssignableByActor`
 * (ADR-0104 rule 1) and `assertNotStronger` (rule 2, comparing a target
 * account's grants against the same actor's). A shared helper is what keeps
 * those answers from drifting apart.
 *
 * Not in scope here: `PermissionsGuard`'s flat check of a single required
 * pair against the actor's own list, and the same shape in
 * `PublishingService.hasPermission` — neither compares one grant against
 * another, which is what this file exists to do consistently.
 */

/** A capability as `RolesService.resolvePermissions` returns it.
 *
 *  `scope` is optional because most resources declare none. Only the four
 *  scoped resources named in `CAPABILITY_MAP` (`albums`, `articles`,
 *  `heroSlides`, `videos`) ever carry `'own'` or `'all'`; every other
 *  resource carries `null`, which compares as width 0 on both sides and is
 *  a no-op in `holdsPair`. */
export interface Grant {
  resourceType: string;
  action: string;
  scope?: 'own' | 'all' | null;
}

/** Scope as a number, so "at least as wide as" is a comparison rather than a
 *  table of cases. A resource that declares no scopes is 0 on both sides and
 *  therefore compares equal.
 *
 *  Exported — this is the one place scope ordering is defined (finding F7).
 *  `RolesService.resolvePermissions` reuses it to pick the widest scope when
 *  a role holds the same pair more than once, rather than re-implementing
 *  the ordering a second time. */
export const width = (scope: Grant['scope']): number => (scope === 'all' ? 2 : scope === 'own' ? 1 : 0);

/**
 * Whether `held` covers `wanted`: the same (resourceType, action), at a scope
 * at least as wide.
 *
 * The scope half is the part a pair-only comparison silently permits. An actor
 * who may edit only their own articles must not be able to grant a role that
 * edits everyone's — widening a scope is handing over something they do not
 * hold, even though the pair matches.
 */
export const holdsPair = (held: readonly Grant[], wanted: Grant): boolean =>
  held.some(
    (candidate) =>
      candidate.resourceType === wanted.resourceType &&
      candidate.action === wanted.action &&
      width(candidate.scope) >= width(wanted.scope),
  );

/**
 * Every pair in `wanted` that `held` does not cover.
 *
 * Deduplicated and in first-seen order: the list is read by a human fixing a
 * role, and the same pair repeated three times because three roles carry it is
 * noise rather than information.
 *
 * Never throws. An empty `wanted` is satisfied by anything, including an actor
 * holding nothing — removing every role from an account hands over nothing.
 */
export const missingPairs = (held: readonly Grant[], wanted: readonly Grant[]): Grant[] => {
  const seen = new Set<string>();
  const missing: Grant[] = [];

  for (const pair of wanted) {
    const key = `${pair.resourceType}:${pair.action}:${pair.scope ?? ''}`;
    if (seen.has(key) || holdsPair(held, pair)) {
      continue;
    }
    seen.add(key);
    missing.push({
      resourceType: pair.resourceType,
      action: pair.action,
      scope: pair.scope ?? null,
    });
  }

  return missing;
};

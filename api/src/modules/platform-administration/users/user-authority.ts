/**
 * The comparison behind "you cannot hand out what you do not hold".
 *
 * Pure functions with no Nest and no I/O, because two services need the same
 * rule for different reasons: `UsersService.create`/`assignRoles` compare a
 * role's grants against the actor's (ADR-0104 rule 1), and the stronger-user
 * guard compares a target account's grants against the same actor's (rule 2).
 * A shared helper is what keeps those two answers from drifting apart.
 */

/** A capability as `RolesService.resolvePermissions` returns it.
 *
 *  `scope` is optional because `RequiredPermission` does not carry one yet —
 *  scopes arrive with the capability map (ADR-0103 D2), and until then every
 *  pair compares at width 0 on both sides. Declaring it now means the rule is
 *  already correct when the field appears, rather than silently permitting a
 *  widened scope on the day it does. */
export interface Grant {
  resourceType: string;
  action: string;
  scope?: 'own' | 'all' | null;
}

/** Scope as a number, so "at least as wide as" is a comparison rather than a
 *  table of cases. A resource that declares no scopes is 0 on both sides and
 *  therefore compares equal. */
const width = (scope: Grant['scope']): number => (scope === 'all' ? 2 : scope === 'own' ? 1 : 0);

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

# ADR-0112 — A write that cannot be attributed is still recorded

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-26. Closes the interceptor gap carried as known debt in both reviews. |
| **Authority** | Product Owner brief, 2026-09-26 (decision C2). Inherits **Chapter 17 §7** — *"A vague or generic access log MUST NOT be considered sufficient"*. |
| **Amends** | `audit-log.interceptor.ts:152-156`, which returns early and writes nothing. |
| **Does not amend** | `AuditLogsRepository`'s append-only nature (brief §8). · `@SkipAuditLog()`, whose purpose — a route writing its own more precise row — is unchanged and extended. · The camelCase `entityType` derivation, which is what makes rows joinable against `workflowInstances`, `revisions` and `publications`. |
| **Context** | The interceptor derives `entityId` from `request.params.id`, falling back to `id`/`_id` on the response. When neither exists it returns, writing nothing at all: `if (!entityType \|\| !rawEntityId) return;`. Most routes satisfy one source, so the gap looked academic — until the roles review measured where it actually bites. `PUT /workflow-policies/:entityType/approval` has `entityType` in the path and returns a `GovernableEntity` with no `_id`, so **turning the federation's approval requirement on or off for a content type writes no audit row whatsoever.** The most governance-sensitive write on the platform is the one the mechanism silently drops, and the failure mode guaranteed that: a route is exempted precisely when its shape is unusual, and unusual shapes are where the important settings live. |
| **Decision** | Three identity sources, tried in order: `request.params.id`; `id`/`_id` on the response body; and a new **`@AuditEntity({ type, idFrom })`** decorator for routes keyed by something else. If all three fail the row is **still written**, with `entityId: null` and `reason: 'entity id unresolved'`, plus a warning in the logs. Silence stops being a possible outcome. A test walks every mutating route — the mechanical style `permission-catalogue.spec.ts` established — and fails if any lacks an identity source. |
| **Alternatives Considered** | **(A) Add `_id` to the responses that lack it.** Works for today's two routes and rejected as the fix: it leaves the audit trail's completeness depending on the shape of a response DTO, so the next DTO that omits an id re-opens the hole silently. **(B) Throw when identity cannot be resolved.** Rejected: it converts a logging deficiency into a failed user request, and an administrator would be unable to save a policy because the audit could not name it. **(C) Require `@AuditEntity` on every mutating route.** Rejected as unnecessary ceremony — most routes already carry `:id`, and a decorator that is almost always redundant is a decorator people stop reading. **(D) Keep the skip and rely on the route-coverage test to catch omissions.** Rejected: the test catches a *missing source*, not a source that resolves to nothing at runtime, and the second is what happened. **(E) Log a warning and still skip the row.** Rejected: a warning in a log file is not an audit record, and Chapter 17 §7 is explicit that a generic log does not satisfy the requirement. |
| **Why This Decision** | An audit trail whose completeness depends on incidental response shapes is not a trail. Writing the row without an id is strictly better than writing nothing: it preserves who, when, what kind of thing and what changed, which is most of what Chapter 17 §7 asks for, and it makes the deficiency visible instead of invisible. The decorator then lets the routes that genuinely key on something else be precise rather than merely non-silent. |
| **Risks** | **Rows with `entityId: null` accumulate and nobody fixes them.** **Mitigation:** the route-coverage test fails the build for a *new* route without a source, so the null rows can only come from existing routes, and those are enumerated and fixed in the same batch. **A warning per request floods the logs.** **Mitigation:** it can only fire on routes the test has not forced to declare a source, which after this batch is none. **The decorator's `idFrom` names a field that does not exist.** **Mitigation:** it resolves at runtime to the null-id path rather than throwing, and a unit test covers each decorated route. |
| **Consequences** | `@AuditEntity()` is new. The interceptor's `record()` gains the third source and the null-id fallback. `workflow-policies` write routes carry the decorator — and also write their own explicit rows under `@SkipAuditLog()` per ADR-0107, which is the more precise record; the decorator is the safety net beneath it. A new route-coverage spec is added. |

---

## D1 — Why both this and ADR-0107's explicit write

They fix different things. This ADR guarantees that **no** mutating route can be
silent — a property of the mechanism, tested mechanically across all 204 write
routes.

ADR-0107's explicit write gives the policy routes something the interceptor cannot
produce for them: the **previous** arrangement. The interceptor's pre-read also
needs a path `:id` to fetch the prior state, so even with identity resolved, a
policy change would record its new value against a null old one. The service knows
both, so it writes both.

Belt and braces, deliberately, on the one write where the review found the trail
entirely absent.

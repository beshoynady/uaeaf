# ADR-0121 — A response spells its identifier `id` when it passes through a DTO, and `_id` when it does not

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-28. |
| **Authority** | Product Owner decision, 2026-09-28, on the identifier measurement taken during Batch 3. |
| **Amends** | Nothing in behaviour. It writes down the rule the codebase already follows and puts a guard behind it. |
| **Does not amend** | The stored shape. `_id` remains the document key in MongoDB for every collection. · Any existing endpoint's response — no route changes spelling because of this ADR. · The `Mixed`-path defect, which is ADR-scope for Batch 3b and a different problem entirely. |
| **Context** | Measured across 491 endpoints in 74 controllers: 370 answer `_id`, 47 answer `id`, one answers both, and 73 carry no identifier. The split is not arbitrary — an endpoint answers `id` exactly when its response passes through a DTO, and `_id` when the controller returns a Mongoose document or a `.lean()` object. Raw documents never carry `id`: no schema sets `virtuals: true` or a `toJSON` transform, and there is no global serializer. The rule was real and undocumented, which is how it broke: `GET /permissions` gained a DTO and began answering `id`, the dashboard's `PermissionResponse` still declared `_id`, and every cell of the role permission matrix read `undefined` — with no test red, because the dashboard's fixtures also said `_id`. |
| **Decision** | **Public endpoints answer `id` through a DTO. Administrative endpoints answer `_id` from the document.** The exceptions are the administrative resources that already have a response DTO — `users` and `permissions` — and they answer `id`. An explicit allow-list in `api/` names every administrative endpoint permitted to answer `id`, and a guard fails when an administrative endpoint answers `id` without being on it. A resource added to the list is a deliberate act in the task that gives it a serializer. |
| **Alternatives Considered** | **(A) Unify everything on `id`.** Rejected for now: it would break 118 `_id` reads across 41 dashboard files at once, for a consistency that buys nothing until those files are being touched anyway. **(B) Unify everything on `_id`.** Rejected: it would mean withdrawing the DTOs that `users` and `permissions` gained precisely because a raw document leaked `authMethods[].passwordHash` — the allow-list is the cheap half of that protection, and the spelling is the visible half. **(C) Add an `id` virtual to every schema so both spellings always answer.** Rejected: it removes the signal. Today the spelling tells a reader whether they are looking at an allow-listed projection or a whole document, and that distinction is worth more than the convenience. **(D) Leave it undocumented and fix consumers as they break.** Rejected — it already broke once, silently, in production code on `main`. |
| **Why This Decision** | The rule the codebase follows is a good one: the spelling marks whether a response was filtered. Writing it down costs nothing; guarding it turns the next serializer from a silent break into a red test. The choice not to unify is deliberate — a rename touching 118 call sites is a migration, and this ADR is a rule. |
| **Risks** | **The allow-list drifts and becomes a rubber stamp**, added to whenever the guard complains. **Mitigation:** the guard names the endpoint and the rule, and 6a's serializer work adds each resource in the task that serializes it, where a reviewer can see why. **The guard is expensive or needs tooling the project does not have.** **Mitigation:** it reads the project's own controllers and DTOs, as `permission-catalogue.spec.ts` and `archive-restore.spec.ts` already do; if it turns out to need more, the design is presented before it is built. **A consumer reads the wrong spelling anyway**, as the dashboard did. **Mitigation:** this ADR does not claim to prevent that — the dashboard's own fixtures must be written from the real response shape, which is a separate correction recorded with the permission-matrix fix. |
| **Corrected 2026-09-29, before the guard was built** | **The Decision row's "the exceptions are `users` and `permissions`" is wrong**, and the feasibility probe for the guard is what found it. At least ten further administrative endpoints already answer `id`: `GET /live-streams/:id` (`live-streams.controller.ts:39-45`, guarded `videos:Read`, returning `LiveStreamAdminResponseDto extends LiveStreamPublicResponseDto` which declares `id`) · `GET /audit-logs` (`audit-logs.service.ts:117-119`) · `GET /media-assets/unused` (`unused-media.service.ts:86-88`) · `GET /revisions` and `GET /revisions/:id` (`publishing.service.ts:557,614`) · and the five `GET …/:id/editorial-state` routes on `about-federation-page`, `president-message-page`, `strategic-plans-page`, `vision-mission-page` and `articles`. Most are invisible to a text scan of the controllers, because 468 of 493 handlers declare no return type and the DTO is named only inside the service. **The allow-list is therefore not yet written, and the guard is not built** — writing either against the wrong set would encode the error. The owner decides whether these routes join the list or the rule is restated. |
| **Consequences** | One allow-list and one guard in `api/`. `GET /revisions/:id`, the single endpoint answering both spellings, and the dead `user.id ?? user._id` fallback in the dashboard are cleaned up in Batch 8. Resources gaining a serializer in Batch 6a join the list in the same task. |

---

## D1 — Why the exception list is endpoints, not resources

A resource is not the unit that answers. `users` answers `id` on six routes and
carries no identifier on `GET /users/export`, which returns a CSV. Writing the
rule against resources would either exempt routes that need no exemption or
force an entry for a route that answers nothing.

## D2 — What the guard cannot see

The guard reads what the API returns. It cannot see what a consumer declares,
which is exactly where the failure that prompted this ADR lived: the API was
correct and the dashboard's type was stale. A guard on this side is still worth
having — it catches the API changing under a consumer — but the other half of
the protection is that a consumer's fixtures are written from the real response,
not from memory of it.

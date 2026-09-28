# ADR-0120 — Permanent deletion of media, and the Archive/Restore pair beside it

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-28. |
| **Authority** | Product Owner decisions 2026-09-27 (section C of the batch's owner decisions), amending Q6. Inherits **ADR-0103** (the capability map, the `Delete`→`Archive` rename, and `PermanentDelete` as a separate verb offered only where `purgeable` is true) and **Chapter 17 §3/§4**. |
| **Amends** | `DELETE /media-assets/:id/object`, which was guarded by `mediaAssets:Archive` while being the only real destruction in the codebase, and wrote the generic interceptor row. · `contactMessages.hardDeleteEligibleAt` and `ContactMessagesService.assertHardDeletable`, both **removed** (owner decision 2026-09-28) — see D5. · `BaseRepository.softDelete`, which rewrote the archive date on a second call. |
| **Does not amend** | The `purgeable` set — two resources, `mediaAssets` and `contactMessages`, pinned by name in `capability-map.spec.ts`; a third is an owner decision. · `findMediaAssetReferrers` and its coverage guard, which this ADR consumes unchanged. · The audit log's append-only nature: a permanent deletion removes the record, never the rows recording what happened to it. |
| **Context** | Archiving hides a picture from the site and leaves the file with a public URL at the storage provider. Two situations need more than that: storage quota, and withdrawing an image whose rights were revoked — a guardian asking for a child's photograph to be removed, or a licence that has ended. A citizen's own contact submission is the same shape of problem under a PDPL erasure right. Both are irreversible, so both are gated rather than offered. |
| **Decision** | `PermanentDelete` exists on exactly the two purgeable resources. On `mediaAssets` it requires **all four** of: step-up verification; the asset is archived; nothing anywhere references it; and an audit row, written **before** the destruction, naming the asset and the breadth of the reference check. `contactMessages` carries three of the four — no reference check, because a message is linked to nothing. Every condition is checked in the **service**, not at the route. The stored object is destroyed **before** the row is removed. |
| **Consequences** | `MediaAssetPurgeService` is new and holds the media path; `ContactMessagesService.permanentDelete` and `ContactMessagesRepository.hardDelete`/`findIncludingArchived` are new. `StepUpModule` is new and is the one place step-up is bound. `BaseRepository` gains `restore`, `archiveIfLive` and `restoreIfArchived`, and `softDelete` becomes idempotent. Three API error codes join all three vocabularies. Both permanent-delete routes carry `@SkipAuditLog()` and are declared in `audit-route-coverage.spec.ts`. 47 `Restore` routes and one `users:Archive` route close 50 of the catalogue's dead pairs. `contactMessages.hardDeleteEligibleAt` leaves the schema. |

---

## D1 — The four conditions, and the order they are checked in

1. **Step-up verification.** First, at the service entry, because it is an authorisation question and the answer does not depend on the asset: no caller can present a second factor, so nothing below it is reachable. See D3.
2. **Archived first.** `assertArchivedFirst` (`common/authz/archive-restore.ts`), shared by both resources so they cannot enforce it differently. A live record may still be rendered by a published page, and destroying it in one step would blank that page with nothing naming why.
3. **No reference anywhere** — `findMediaAssetReferrers`, whose derivation, five ref shapes, twenty scanned text paths and revision-snapshot scan are the subject of its own module doc and its coverage guard. The refusal is `stillReferenced` and carries every referrer with its `kind` (`ref` | `richTextLink` | `urlField`), because "fix a field" and "edit an article's body" are different instructions.
4. **An audit row, written before the destruction.** By the service, not the interceptor. See D4.

Below step-up the order is the one a reader needs: a refusal names the nearest reason, and the reference scan — the only expensive step — runs after the cheap refusals.

## D2 — Storage before the row

`storage.destroy` first, then `repository.hardDelete`. Reversed, a provider failure leaves an object nothing points at, consuming quota unseen and with nothing naming it. A row whose file is gone is visible and fixable; a file no row names is neither. Two tests pin it: the invocation order, and that the row survives a failed destroy.

## D3 — Step-up is unbuilt, and the service refuses

Measured before this was written: zero occurrences of `stepUp`, `step_up` or `mfa_step_up` anywhere in `api/src`. There is no verification to present and nothing to check it against.

So the check is a **port with one implementation that refuses**: `StepUpVerifier`, bound by `StepUpModule` to `UnavailableStepUpVerifier`, which calls `refuseWithoutStepUp` for every caller. No argument, no configuration and no header changes the outcome.

**It is asserted at the service entry, not at the route** (CLAUDE.md §31: a guard is evaluated where the action executes). Both purge services are exported — the unused-media report is their next consumer — so a refusal written in a controller would be skipped by any caller that did not go through one, and the route guard cannot see whether a refusal ran. Conditions 2 and 4 were already service-side and unskippable; condition 3 is now too, which matters most for the one that is inert and therefore easiest to forget.

Three things hold it there: a negative test per service with the real verifier injected, asserting the destruction is untouched; the same through each route with the real service behind it; and a guard asserting `STEP_UP_VERIFIER` is bound in exactly one file and to that one class, because binding a permissive verifier is the only remaining way to disable it silently.

The code is `mfa_step_up_required` — snake_case where every other code in `API_ERROR_CODES` is camelCase. It is the owner's own literal, kept rather than normalised so the pair that builds the verification and the pair that refuses it use the same string.

**When step-up is built, only `UnavailableStepUpVerifier` is replaced**, in `step-up.module.ts`. No service and no route changes.

## D4 — Why each route writes its own audit row

The global interceptor writes `newValue: null` for a `PermanentDelete` and knows nothing about the reference check, so it cannot record what was checked. For a contact message it is worse than incomplete: it stores the pre-image, which would copy the citizen's submission into `auditLogs` — a collection readable over HTTP — at the moment of an erasure request. Erasing a record while keeping a copy of it is not an erasure.

Both routes therefore carry `@SkipAuditLog()` and write their own row:

- **mediaAssets** — `storageKey`, `originalName`, `referencesChecked` (the breadth of the scan) and `referrersFound`.
- **contactMessages** — `messageType`, `status` and `archivedAt`. The sender, subject and body are deliberately absent.

Neither hand-types its action: both call `auditActionFor('DELETE', 'PermanentDelete')`, the one function that derives an audit action from a permission verb, and `audit-action-literal-scan.spec.ts` forbids the literal.

### The row is written BEFORE the destruction

Condition 4 is a condition, so it is met before the act it governs. Written afterwards, `auditLogsService.write` throwing would leave the object destroyed, the record removed, no trace of either, and a 500 telling the caller nothing happened — an unrecorded irreversible deletion, which is the one failure mode this ADR exists to prevent.

So: the row records the intent and the references that were checked; then the destruction runs. An audit write that fails now destroys nothing, which is the correct direction for a fail-closed condition.

**An outcome that differs from the intent is a second row, never an edit to the first.** The log is append-only, and two rows — "permanent delete authorised; destroying the stored object" followed by "storage refused the destroy; the record was kept" — are a truthful history where one amended row would be a rewritten one. Three failure points each append their own row: the storage destroy, the media row removal after the object is gone, and the contact-message row removal.

What this deliberately does not promise: a process that dies mid-destruction leaves the intent row and no outcome row, and no second row could have been written by a process that stopped. A lone intent row therefore means "authorised and begun", not "completed" — which is what an append-only log can honestly say.

## D5 — `contactMessages`: the cooldown is removed, and three conditions replace it

**Owner decision, 2026-09-28: `hardDeleteEligibleAt` leaves the schema, its gate leaves the service, and the condition leaves the list.** `contactMessages:PermanentDelete` requires step-up verification, the message archived first, and an audit row written before the removal. There is no reference check: a contact message is linked to nothing, and it produces no `revisions` either, so the "blocked while revisions reference it" rule the other twelve workflow-eligible entities rely on has nothing to look at here.

The reason the cooldown went, measured before it was removed:

- **Nothing ever set the field.** `create` wrote `null`, no route and no script changed it, and no retention window for a contact message is documented anywhere.
- **So the gate refused every deletion** — including the legitimate ones: spam, abusive content, and a citizen's own erasure request, which is the case the collection was made purgeable for in the first place.
- **And it could not be satisfied beside an archive-first rule.** It read the row through `findById`, which scopes `archivedAt: null`, so the only messages it could ever find were exactly the ones archive-first refuses.

A gate that refuses everything is not a conservative control; it is an absent capability with a comment claiming otherwise. What protects a citizen's record now is three conditions that can each actually be met, and an audit row that exists whether or not the removal succeeds.

`docs/audits/schema-audit-2026-09-04.md` recorded this field as closing its finding C3 / #5. That document is evidence of what was known then and is **not** rewritten; a dated appendix (2026-09-28) records what was found since and which controls close the finding now.

## D6 — Route naming: `POST /:id/unarchive`

`Restore` is the verb; the path is not `/:id/restore`, and the reason is measured. Five controllers already answer `POST /:id/restore` — `aboutFederationPage`, `presidentMessagePage`, `strategicPlansPage`, `visionMissionPage` and `articles` — with `PublishingService.restore`, which copies a past revision over the draft. That is a different act: it changes a record's content, where this one changes whether the record exists in the directory at all. Renaming the existing route would break the dashboard's revisions panel, which calls it.

One path for all 47 rather than `/restore` on the 42 that are free and something else on the five: a lifecycle route that is named differently depending on which controller it is in is a route nobody can find.

`archivedAt` and `archivedBy` are cleared **together**, in one statement. A row with `archivedAt: null` and `archivedBy` still set reads as live while naming who archived it, and every soft-delete filter keys on `archivedAt` alone.

## D7 — A second archive does not move the first archive's date

`softDelete` now updates under `{ _id, archivedAt: null }`, so a second call rewrites neither the date nor the actor. The date records when the archive happened; reattributing it to whoever asked again is a falsified record. The row is still answered either way, so the caller cannot tell the two calls apart — an idempotent archive, not a refusal.

Two callers need to know which call was the one that archived, because they move a denormalized count: `MediaAssetsService.remove` and `unarchive`, which take a photo out of its album's `assetCount` and put it back. They use `archiveIfLive` / `restoreIfArchived`, which answer `null` when nothing changed. Before this, a double archive decremented the count twice and nothing restored it.

## D8 — Three things the owner refused, and why

**(a) Bulk permanent deletion.** Not built, and not deferred — refused. One step-up authorising many irreversible destructions is a different and worse thing than one step-up per destruction: the operator confirms once and cannot see, at that moment, everything the confirmation covers. It would be revisited only if storage volume became a real problem, and the single-file purge plus the unused-media report answer the cases that exist (a withdrawn licence, a guardian's request, a file nothing will ever use again).

**(b) Blocking storage URLs inside a rich-text `link` mark by validation.** `RICH_TEXT_MARKS` permits `link` and `RICH_TEXT_LINK_SCHEMES` allows `http:`/`https:`, so an editor can paste a Cloudinary URL into a body and a purge would turn it into a 404. Refused as a validation rule because the scan already covers that risk: the reference check searches the escaped `storageKey` inside both rich-text bodies and every free URL field, and reports the hit as `kind: 'richTextLink'`. A validator would also refuse legitimate links to the provider, and would only move the problem to the fields it does not cover.

**(c) Deleting or archiving images when their content is archived.** Archiving an article does not archive its pictures, and permanently deleting one never cascades. The two lifecycles are deliberately independent: an image is shared between records, so a cascade from one of them would take a picture off pages that are still live, and the owner's own reason for archiving content is often that it will come back.

## D9 — Fail-closed, and why the catch is not narrow

If any part of the reference check cannot run, the deletion is refused with `referenceCheckFailed` and neither the destroy nor the row removal happens. The refusal names what could not be read.

The `catch` takes **anything**, not only `MediaReferenceCheckFailedError`: a `TypeError`, a driver throw from outside the scan's own guards, a future refactor that throws something else. Catching one class is precisely how "the check failed" becomes "nothing references it" in front of an irreversible destruction, and there is a test for a foreign throw as well as for the scan's own.

`ignore` — the scan option that suppresses referrers — is not reachable from a request. The provider in `media-assets.module.ts` binds the scan to the connection and exposes a function of one argument, the asset id, so there is no parameter for a body to reach. A caller who could fill `ignore` could hide the very reference that refuses their deletion.

## D10 — `users:Archive`, and the two refusals it inherits

`users` declared `Archive` and `Restore` with no route at all. `DELETE /users/:id` now archives an account, which is distinct from suspending it: `accountStatus` says whether someone may sign in, the archive says whether the account is still part of the directory.

It carries three rules, none of them new:

- **No self-archive.** The same rule, and the same reasoning, as self role-assignment and self status change: an administrator who archives their own account has locked themselves out of undoing it.
- **`assertNotStronger`.** An actor may not archive an account holding pairs they do not hold.
- **`assertNotLastSuperAdmin`.** Archiving the last active Super Admin would leave nobody able to sign in and undo it.

And it **revokes every session the account holds** — which closes the refresh half of the problem, and only that half. Stated precisely, because the first version of this section claimed both:

- **Refresh: closed.** `AuthService` refuses a session whose `revokedAt` is set, so a revoked refresh token mints nothing.
- **Access: OPEN, and named as a gap.** `JwtStrategy.validate` reads the token's `roleIds` and nothing else — no account read, no session read, and the access token carries no `sessionId` to look one up by. **An archived account therefore keeps its full authority until its access token expires, up to fifteen minutes.**

Closing the access half needs the per-request path: either a `sessionId` claim checked against the session store, or an account re-read in `JwtStrategy`. Both belong with the session work, so it is **not** closed here. It is recorded instead as an `it.failing` test in `jwt.strategy.spec.ts` — an archived account presenting a still-valid access token, asserting the refusal that does not happen — so the gap is a standing item in the suite rather than something rediscovered later.

## D11 — What is still refused, and what a reader should not mistake for a defect

Both `PermanentDelete` routes answer `403 mfa_step_up_required` to every request today. That is the designed state, not an omission: an irreversible destruction does not ship with one of its four conditions absent. The paths behind the refusal are complete and tested, so the work when step-up arrives is to move one call — D3 says where.

## D12 — The archive and unarchive routes on `users` answer the id and nothing else

A route guarded by one pair must not answer with what a different pair protects.

`users:Archive` and `users:Restore` are **grantable**; `users:Read` is one of the reserved pairs, so no role may hold it. And `missingImpliedReads` is deliberately silent about a reserved read — demanding one nobody outside the Super Admin role could ever hold would be unfollowable advice. The consequence is that a holder of `users:Archive` need not hold `users:Read`: a `UserResponseDto` on these two routes would hand them the email, the roles, the account status and the last login for the price of an archive and an unarchive.

So both answer `{ id }` (`UserRefDto`) — the id the caller already sent, which discloses nothing.

**`users` is the only resource where this arises, and that is a property of the implication rule rather than luck.** For every other resource, holding `Restore` requires holding that resource's own read verb or the role is refused as incoherent, so the record those 46 routes answer is one the caller may read. `users` is the single exception because its read is reserved, which is the exact case the rule steps aside for.

Whether `users:Archive`/`Restore` should join the reserved set entirely is an owner-level question and is unaffected by this: the narrow response is correct either way.

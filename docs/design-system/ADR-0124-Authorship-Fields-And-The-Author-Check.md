# ADR-0124 — `createdBy` and `updatedBy` are mandatory everywhere, and "the author" is all three of them

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-29. **Nothing here is built yet** — it is Batch 4 work. |
| **Authority** | Product Owner decisions, 2026-09-29: the answer to the author-definition question, and written decisions 1 and 4 of the same day. |
| **Numbering note** | ADR-0122 was taken by the header session on the same day; ADR-0123 records the reference-path typing. This record is ADR-0124. |
| **Amends** | Every resource schema gains `createdBy` and `updatedBy` as **required** fields. ADR-0106's separation-of-duties rule gains a definition of "the author" it did not have. ADR-0113's "records whose `createdBy` is null stay closed to `own`" ends once the backfill runs. |
| **Does not amend** | Content-credit fields (ADR-0125 §B) — a byline is not an authorship field and takes no part in this check. · The `own` scope's construction, which is Batch 4 and unchanged in shape. |
| **Context** | Measured 2026-09-29, and the measurement is why this record exists. **There is no author comparison anywhere in `api/src`** — `selfApproval` has zero occurrences outside the spec, and the approve path's own doc comment says so: *"the only self-approval gate … no author-field comparison exists or is performed."* Worse, the field an implementer would naturally reach for is a trap: `workflowInstances.createdBy` **exists** (inherited from `BaseSchema`) and is **`null` on every row ever written** — `WorkflowInstancesService.create` never sets it and none of its six updates do either. A check reading it would fail **open**. And `createdBy` is written on exactly one content resource (`articles`); `albums`, `videos` and `heroSlides` leave it `null`. Three different people can each reasonably be called "the author": whoever pressed submit (`revision.createdBy`), whoever created the record (`record.createdBy`), and whoever last edited it (`record.updatedBy`). The revision snapshot deliberately **strips** authorship (`NOT_CONTENT`), so the snapshot itself cannot answer the question. |
| **Decision** | **(1) `createdBy` and `updatedBy` are `required` on every resource schema.** The server writes them from the current user on **every** create and every update, archival and restore included. A value for either arriving in the request body is **refused**. A guard fails when a resource schema lacks either field, or when a create or update path does not write them. Legacy rows are filled by an **idempotent script** using the bootstrap Super Admin account — the existing data is test data — written, not run, and placed in the script order **after** the reference-id conversion (ADR-0123). **(2) "The author", for the approval check, is all three of `revision.createdBy`, the record's `createdBy` and the record's `updatedBy`.** If the approver matches **any** of them, the approval is refused. Until (1) lands, a field that is `null` is **skipped** — that field only — and `revision.createdBy` is checked in every case, because it is `required: true` on every creation path already. **`workflowInstances.createdBy` is never read by any check**, and a negative test holds that. **(3)** When the rule leaves a review with no permitted approver, the remedy is the **Super Admin override with a written reason** (ADR-0106 D2), not a relaxation of the rule. |
| **Alternatives Considered** | **(A) `revision.createdBy` alone.** Rejected: it names whoever *froze* the snapshot, not whoever wrote the text, so someone can write an article, have a colleague submit it, and approve their own words. **(B) The record's `createdBy` alone.** Rejected: it is written on one content resource out of four today, and `null` means "unknown", not "not you" — a check reading it would fail open on three resources. **(C) Two of the three.** Rejected as arbitrary once all three are cheap: with (1) in force all three are populated and the check is three string comparisons on data already in hand. **(D) Refuse with no override.** Rejected for the reason ADR-0106 already gave: in a federation of 30–50 accounts a type may have exactly one qualified person, and a hard refusal stops publication with no remedy. |
| **Why This Decision** | A security check that reads a field which is `null` in practice is worse than no check, because it reports a decision it never made. Making the fields mandatory is what turns the author question from a guess into a comparison. Checking all three is the only reading under which no ordering of "wrote it / submitted it / edited it" lets the same person both produce and approve the same text. |
| **Risks** | **The backfill attributes old rows to the bootstrap Super Admin**, which is a fiction about who wrote them. **Mitigation:** the owner has stated the existing data is test data; the script is idempotent and named, so the attribution is visible rather than implied. **A required field breaks an existing create path that does not set it.** **Mitigation:** the guard fails on exactly that, before deployment rather than after. **The override becomes routine.** **Mitigation:** ADR-0106's existing mitigation — the reason is mandatory and audited, so routine use is visible in the security-events view rather than inferred. **`updatedBy` in the check punishes a typo fix**: an editor who corrects a spelling can no longer approve. **Accepted deliberately** — the alternative is a rule with a hole the size of one keystroke. |
| **Consequences** | Every resource schema changes shape. A new guard. A new backfill script, written and not run, after ADR-0123's converter in the script order. ADR-0106's separation-of-duties rule becomes implementable. ADR-0113's `own`-and-`null` carve-out ends when the backfill runs. Negative tests required: a body carrying `createdBy` or `updatedBy` does not change the stored value; every update writes `updatedBy` to the current user; `workflowInstances.createdBy` is read by nothing. |

---

## D1 — Re-approval after a `return`, and why the rule is per step

`return` re-points a live review at an earlier step, so an approver legitimately
arrives at a step they have already approved. Cycle-scoping does not
disambiguate it: `return` writes no `Submitted`/`Resubmitted` row, so the cycle
boundary does not move.

**The rule is therefore: one approval per person per step.** Re-approving the
*same* step after a return is permitted; approving a *second* step of the same
review is refused, and the refusal says so — "you approved a different step of
this review". The Super Admin override with a written reason applies here too.

This preserves the existing guarantee that a repeat approval by the same actor
on one step counts once, which an existing test pins, and it does not punish a
legitimate return cycle.

**This rule is new.** ADR-0106 requires only the author comparison; "one person
does not constitute two approval stages" appears in no approved document before
this one.

## D2 — The comparison is made on strings, and why that is not a style choice

Every reference field involved was an untyped `Mixed` path until ADR-0123, and
the module's fields are the ones an author check must compare. Two failure modes
follow, and they are not symmetrical:

- `.equals()` on a value that is a string throws — a **500**, loud, and caught.
- A typed Mongo filter that misses returns "no match" — which this check reads
  as **"not the author"**, and the approval proceeds. Silent, and open.

So the comparison is `String(...) === String(...)`, in JavaScript, never a
filter. The existing assignee-membership gate is string-based already, and is by
that accident the one comparison in the module the typing defect could not
defeat. ADR-0123 removes the underlying hazard; this rule survives it because a
security comparison should not depend on a schema declaration being right.

## D3 — `contactMessages` has no revision

`contactMessages` is a workflow entity type but not a publication entity type,
so nothing validates that its instances point at a real revision. For an
instance of that type the author question has **no answer**. It is handled by
entity type — explicitly, in the code — and never by testing the revision for
`null`, because "no revision" and "not the author" must not collapse into the
same branch.

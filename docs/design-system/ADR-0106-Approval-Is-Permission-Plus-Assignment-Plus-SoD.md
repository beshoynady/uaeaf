# ADR-0106 — Approving needs the capability, the assignment, and someone other than the author

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-26. Closes P1-3, P1-4 and P1-9 in `docs/reviews/roles-permissions-review.md`. |
| **Authority** | Product Owner brief, 2026-09-26 (decision A6). |
| **Amends** | `Approve` stops being one platform-wide grant and becomes per entity type. `WorkflowInstancesService.approve` gains a capability check and a separation-of-duties check. |
| **Does not amend** | The workflow engine's state machine, concurrency control, Rejected-vs-Returned semantics, or the explicit-succession decision. · The 2026-09-20 separation of approval from publication — approval still leaves the instance `Approved` and stops. · `assigneeType: 'User'` (approval routes to named individuals, never to a role as a group). |
| **Context** | Three findings, one cause. `Approve` appears on exactly **one** of 69 resources — `workflowInstances` — and all four review routes use it, so "Fatima reviews news but not governance documents" cannot be expressed as a permission at all; the only scoping is membership of the step's `assigneeIds`. The engine's own doc comment states the second problem plainly: *"the only self-approval gate; no author-field comparison exists or is performed"* — so an author listed as an assignee approves their own submission, and with `requiredApprovals: 1` a review is a one-person formality. Third, when a reviewer's capability is withdrawn while they are assigned to an open step, per-request resolution correctly refuses them immediately, but nothing removes them from the step: the review stays pending on someone who can no longer act, counts toward the threshold, and if the threshold equals the assignee count the content is stuck — while changing the arrangement is refused because a review is running. |
| **Decision** | Approving requires **both** `<entityType>:Approve` and membership of the current step's `assigneeIds`. The capability is checked **in the service**, not only on the route, matching how `Publish` is already checked. **Separation of duties:** the actor may not approve a revision they created or submitted, compared against `revision.createdBy` and the instance's submitter; refusal `selfApproval`. A **Super Admin may override** the separation rule only with a written reason, which is stored on the action-history row and the audit row; without a reason they are refused like anyone else. A step carrying an assignee who no longer holds the capability is reported as **blocked** and routed to the admin. |
| **Alternatives Considered** | **(A) Keep `Approve` global and scope by assignment alone.** Rejected: it is the status quo, and it cannot express the operating model's own sentence about reviewers for particular content types. **(B) Scope by assignment and fix only the dashboard**, so review controls appear only where the person is actually assigned. Rejected as a half-measure: it removes a confusing 403 and gives the administrator no control over who may review what. **(C) Route approval to roles instead of named users.** Rejected: the board's note fixes `assigneeType` to `User`, and "the news team approves it" is not an accountable record of who decided. **(D) Refuse self-approval with no override.** Rejected: in a federation of 30–50 accounts there may be exactly one person qualified for a content type, and a hard refusal stops publication with no remedy. The override with a recorded reason keeps the rule while leaving a door that cannot be walked through quietly. **(E) Auto-remove a blocked assignee from the step.** Rejected: silently rewriting who is reviewing a live submission is the migration the engine deliberately refuses elsewhere, for the same reason — an approval by people nobody consented to. |
| **Why This Decision** | The capability answers "may this person review this kind of thing", the assignment answers "is it their turn", and the separation rule answers "is this a review at all". They are three different questions and each was previously answered by the wrong mechanism or not at all. Checking the capability in the service rather than the controller follows the precedent the publishing service already set, and for the stated reason: no future route can mount the action without the check. |
| **Risks** | **Existing reviewers lose access on deploy**, because their roles carry the old global `workflowInstances:Approve` and not the new per-type pairs. **Mitigation:** the migration maps the global grant to the per-type pairs for every role that held it, and the reset-and-templates scripts land after it. **A single-reviewer type becomes unpublishable** once self-approval is refused. **Mitigation:** the override exists, and the policy screen warns when a type's only approver is also its only editor. **The override becomes routine.** **Mitigation:** the reason is mandatory and audited, so routine use is visible in the security-events view rather than inferred. **A blocked step is reported but nobody acts.** **Mitigation:** it surfaces on the policy screen beside the pending content, which is the screen an administrator opens to fix exactly this. |
| **Consequences** | `Approve` is declared on the 9 publication-eligible workflow types. `WorkflowInstancesService.approve` gains the capability check, the author comparison and the override path. `GovernableEntity` gains `blockedAssignees`. New refusal code `selfApproval`. `workflowActionHistory` rows carry the override reason in their existing `reason` field. The four review routes keep `workflowInstances:Approve` as the coarse gate and gain the per-type check beneath it. |

---

## D1 — Why both checks, and why the capability check lives in the service

The route decorator is a coarse filter: it keeps unauthenticated and plainly
unauthorised callers out. It cannot know the entity type, because the instance id
is all the route has — the type is on the instance, which the service loads.

So the per-type check has to happen after the load, which puts it in the service.
That is also where `PublishingService.assertPermission` sits, and its comment gives
the reason this ADR adopts: checked there, *"no future route can mount this
without it."*

## D2 — The override is a record, not an exemption

A Super Admin bypassing separation of duties must supply a reason string. It is
stored twice — on the `workflowActionHistory` row for the review's own trail, and
on the `auditLogs` row for the security view — because the two are read by
different people for different questions.

No reason, no override: the refusal is identical to any other actor's. This keeps
the Super Admin's power inside the model rather than beside it, which is the same
principle that keeps the guard free of per-role branches.

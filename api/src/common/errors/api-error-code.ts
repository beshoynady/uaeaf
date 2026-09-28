import { HttpStatus } from '@nestjs/common';

/**
 * The closed vocabulary of machine-readable error codes this API answers with.
 *
 * Every error response carries one, stamped by `ApiExceptionFilter`. A client
 * branches on the code; the `message` beside it is for a human reading a log,
 * and may be reworded at any time without that being a breaking change.
 *
 * Before this existed the dashboard told the four distinct 403s apart by
 * matching fragments of their English messages. That contract had already
 * failed silently once: `PATCH /users/:id/status` refuses a self-edit with
 * wording that shares no fragment with the self role-assignment refusal, so
 * the screen showed the generic "you lack permission" for a refusal that had
 * nothing to do with permissions.
 *
 * Keep this list closed. A code the list does not contain is treated as
 * absent, so a typo at a throw site degrades to the status default instead of
 * reaching a client with no branch for it.
 */
export const API_ERROR_CODES = [
  // Status defaults — what a refusal means when nothing more specific is said.
  'badRequest',
  'unauthorized',
  'forbidden',
  'notFound',
  'conflict',
  'tooManyRequests',
  'internalError',
  // Specific refusals a client is expected to explain differently.
  'accountLocked',
  'systemRole',
  'ungrantablePermission',
  'selfAssignment',
  // A permission set that is not a coherent role: it may change a resource
  // it cannot read. Distinct from every code above because it is not an
  // authorization failure at all — the actor may hold the missing read — and
  // because the body carries the exact pairs that would fix it, which the
  // dashboard ticks on the caller's behalf.
  'impliedReadMissing',
  // Publishing refusals (ADR-0069 D4/D5). Each prevents the task, so the
  // dashboard renders them as a persistent alert in the action panel rather
  // than a toast (Chapter 8 L4, ADR-0016) — and each needs different words:
  // "an administrator has not configured this yet" and "someone edited this
  // while you were reading it" are not the same problem for the same person.
  'publishingPolicyMissing',
  'workflowRequired',
  'activeWorkflowExists',
  'staleRecord',
  'pendingContent',
  // A field the page cannot be published without is still empty. Distinct
  // from `pendingContent` because the marker is a string and a missing image
  // is not — and because the two are different jobs: chasing the client for
  // copy, versus uploading a portrait the editor already has.
  'missingRequiredField',
  'underReview',
  'richTextNotAllowed',
  // The strategic plan's list refusals (ADR-0075). Four different fixes: show
  // an item again, reload because the order was computed against a list that
  // has changed, correct a list name no section carries, and remove an item
  // from a row that is full. As `badRequest` all four read as one sentence.
  'listNeedsVisibleItem',
  'invalidListOrder',
  'unknownList',
  'listTooLong',
  // The hero slide's two buttons (owner decision 2026-09-16). Three codes
  // because they are three different fixes, and as one `badRequest` an editor
  // would read the same sentence for all of them: write the missing half,
  // shorten what you wrote, or correct a link that goes nowhere the site
  // allows. The last is the one worth separating hardest — a link stored as
  // `http://` or `javascript:` is a defect the editor cannot see and every
  // visitor can.
  'incompleteCta',
  'ctaLabelTooLong',
  'invalidCtaUrl',
  // `ltrImageMode: separate` without its English picture or that picture's
  // focal point. Its own code so the dashboard can point at the English
  // picture panel rather than at the slide.
  'incompleteLtrImage',
  // The dashboard's save is a publish (owner decision 2026-09-17): a visible
  // slide must be complete, and no hero text may be longer than its field holds
  // at 390px. Two codes, two fixes: write what is missing, or shorten.
  'incompleteSlide',
  'heroTextTooLong',
  // A slide's window that ends before it opens: the slide would never show
  // and only read "scheduled". Its own code so the fix points at the end.
  'scheduleEndsBeforeStart',
  // The HERO section's next-event bar and playback (owner decision
  // 2026-09-17): fill in what a visible bar needs, set an end no earlier than
  // the start, or choose one of the supported durations.
  'incompleteNextEvent',
  'nextEventEndsBeforeStart',
  'invalidPlayback',
  // Sponsors, partners and memberships (ADR-0085). Four different fixes: set
  // an end no earlier than the start; give a championship or event
  // sponsorship the end it must have; point a Federation sponsorship at the
  // federation or at nothing; shorten a name past 150 characters.
  'sponsorshipEndsBeforeStart',
  'sponsorshipEndRequired',
  'invalidSponsorshipTarget',
  'organizationNameTooLong',
  // Publishing an approved revision, now that approving no longer publishes
  // by itself (owner decision 2026-09-20). `notApproved` is not
  // `activeWorkflowExists` and not `workflowRequired`: nothing is running and
  // nothing is wrong with the policy — the record simply has no standing
  // approval, and the fix is to send it for review.
  'notApproved',
  // Two articles cannot share an address. Its own code because the fix is a
  // single field the editor is looking at, and as a bare `conflict` it reads
  // as "something changed underneath you", which is a different instruction.
  'slugTaken',
  // Approval-policy configuration (audit findings H5/H6). A step that needs
  // more approvals than it names approvers can never be satisfied, and a
  // second step at one position is silently skipped by `findNext` — two
  // different corrections, neither of which is "try again".
  'unsatisfiableStep',
  'duplicateStepOrder',
  // Changing who approves replaces the steps, and a replaced step is archived
  // — which is the step reviews already running point at. Its own code because
  // the fix is neither "fix a field" nor "try again": it is to wait for those
  // reviews to finish, or finish them, and the dashboard says how many.
  'reviewsInFlight',
  // A stored policy that demands a review nobody can ever give: it requires
  // approval and names no definition, or names one with nobody on it. The
  // sibling of `unsatisfiableStep` — that one is a step no set of people could
  // satisfy, this is a policy no step could. Its own code because the fix is
  // "name approvers or turn review off", which is neither a retry nor a field
  // correction.
  'unsatisfiablePolicy',
  // A settings field sent to the general `PUT /site-settings` when a screen of
  // its own writes it through its own route (ADR-0093). Its own code because
  // the fix is neither a field correction nor a retry: the same request
  // belongs on another route, and the body names it.
  'writtenElsewhere',
  // The three refusals that make account administration safe (ADR-0104,
  // ADR-0105). Separate codes because they are three different situations for
  // the same administrator, and as one `forbidden` all three read "you lack
  // permission" — which is wrong for every one of them:
  //
  //  - `ungrantableRole`: the actor may assign roles, just not THIS one, and
  //    the body names the exact pairs they would be handing over without
  //    holding. The dashboard lists them so the gap is fixable.
  //  - `targetStronger`: nothing is wrong with the role or the request; the
  //    account being edited holds capabilities the actor does not, so someone
  //    else has to make the change.
  //  - `lastSuperAdmin`: the change is legitimate and the platform would be
  //    left with nobody who can sign in to undo it. The fix is to appoint a
  //    second Super Admin first, which no other refusal implies.
  'ungrantableRole',
  'targetStronger',
  'lastSuperAdmin',
  // Decision 4 / Q-A (2026-09-27): account and role administration, and
  // reading account data, are reserved to the Super Admin — eight pairs no
  // role may ever hold. Distinct from `ungrantablePermission` (you do not
  // hold this) and `ungrantableRole` (this role grants more than you hold):
  // here holding more would not help, because nobody may grant it to anyone.
  'ungrantableCapability',
  // Permanent deletion (ADR-0120). Three refusals, three different things to do,
  // and as one `forbidden` or `conflict` all three read as "try again" in front
  // of the only irreversible act on the platform:
  //
  //  - `stillReferenced`: something still points at the file, and the body names
  //    each referrer with its kind, so the administrator knows whether to fix a
  //    field or edit an article's body.
  //  - `referenceCheckFailed`: the check could not run, which is not the same
  //    answer as "nothing references it" and is never turned into it. The body
  //    names what could not be read.
  //  - `mfa_step_up_required`: snake_case where everything above is camelCase,
  //    because it is the owner's own literal. Every permanent delete answers it,
  //    because nothing in this API verifies a second factor yet.
  'stillReferenced',
  'referenceCheckFailed',
  'mfa_step_up_required',
  // The in-use archive warning (owner decision 2026-09-27, Batch 2 §C).
  // Distinct from `stillReferenced`: that one refuses the platform's only
  // irreversible act outright, while this one is informed consent — the
  // same refusal on the first attempt, and `acknowledgeReferences: true`
  // proceeds anyway. Answered too when the reference check itself could not
  // complete (the body flags `scanIncomplete`), because a scan outage must
  // neither block a legal takedown nor silently pass as "nothing uses it".
  'mediaInUse',
  // A `PATCH` sent `null` for a field the record cannot be without. Its own
  // code because the fix is neither "correct this value" nor "try again": the
  // field has no empty state, so the request should have omitted it. Answered
  // by every partial update — the `Update*Dto`s refuse it at validation, and
  // `refuseNull` (`partial-update.util.ts`) for the reference and date fields
  // their `update()` post-processes.
  'requiredFieldCleared',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

const BY_STATUS: ReadonlyMap<number, ApiErrorCode> = new Map([
  [HttpStatus.BAD_REQUEST, 'badRequest' as const],
  [HttpStatus.UNAUTHORIZED, 'unauthorized' as const],
  [HttpStatus.FORBIDDEN, 'forbidden' as const],
  [HttpStatus.NOT_FOUND, 'notFound' as const],
  [HttpStatus.CONFLICT, 'conflict' as const],
  [HttpStatus.TOO_MANY_REQUESTS, 'tooManyRequests' as const],
  [HttpStatus.INTERNAL_SERVER_ERROR, 'internalError' as const],
]);

/**
 * The code for a status that arrived without one.
 *
 * An unmapped 4xx is still the caller's request being unusable, so it reports
 * as `badRequest` rather than `internalError` — the difference is whether the
 * client is told to fix something or to retry.
 */
export const codeForStatus = (status: number): ApiErrorCode => {
  return BY_STATUS.get(status) ?? (status >= 500 ? 'internalError' : 'badRequest');
};

export const isApiErrorCode = (value: unknown): value is ApiErrorCode => {
  return typeof value === 'string' && (API_ERROR_CODES as readonly string[]).includes(value);
};

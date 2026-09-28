import { ConflictException, ForbiddenException } from '@nestjs/common';

/**
 * The two rules every permanent deletion on this platform shares, in one place
 * so the purgeable resources cannot enforce them differently.
 *
 * The reversible half of the lifecycle needs nothing here: `Archive` and
 * `Restore` are `BaseRepository.softDelete`/`restore`, which every repository
 * inherits. Their routes are `DELETE /:id` and `POST /:id/unarchive` — the
 * second is not `/:id/restore` because five controllers already answer that
 * path with the revision restore (`PublishingService.restore`), which copies a
 * past revision over the draft and is a different act from bringing an archived
 * record back. See ADR-0120.
 */

/**
 * Refuses a permanent deletion of a record that is still live.
 *
 * The first of the four conditions (ADR-0120): archiving is what takes a record
 * off the site, so a live one may still be rendered by a published page, and
 * destroying it in one step would blank that page with nothing naming why.
 *
 * @throws ConflictException when `archivedAt` is not set.
 */
export const assertArchivedFirst = (record: { archivedAt: Date | null }, subject: string): void => {
  if (record.archivedAt) {
    return;
  }
  throw new ConflictException({
    code: 'conflict',
    message: `${subject} is still live. Archive it first, so nothing published loses it without warning.`,
  });
};

/**
 * Refuses a permanent deletion for want of step-up verification.
 *
 * Nothing in this API verifies a second factor, so the third condition
 * (ADR-0120) cannot be met by any caller: there is no verification to present
 * and nothing to check it against.
 *
 * @throws ForbiddenException always.
 */
export const refuseWithoutStepUp = (subject: string): never => {
  throw new ForbiddenException({
    code: 'mfa_step_up_required',
    message: `Permanently deleting ${subject} needs step-up verification, which this API does not provide yet.`,
  });
};

/** Injection token for `StepUpVerifier`. */
export const STEP_UP_VERIFIER = Symbol('STEP_UP_VERIFIER');

/**
 * Confirms that the caller has just re-proved who they are.
 *
 * A port rather than a call to `refuseWithoutStepUp`, so the check sits at the
 * service entry every destruction goes through — a route is not the last line,
 * because the services are exported and a direct caller would skip a refusal
 * written in a controller (ADR-0120 §D3).
 */
export interface StepUpVerifier {
  /** @throws ForbiddenException with `mfa_step_up_required` when the caller has
   *  not presented, or cannot present, a second factor. */
  assertVerified(subject: string): Promise<void>;
}

/**
 * The only implementation, and it refuses every caller.
 *
 * Bound by `StepUpModule`, which is the one place the verification is named, so
 * replacing it is a single edit in a file a reviewer reads rather than a hunt
 * through the services that depend on it.
 */
export class UnavailableStepUpVerifier implements StepUpVerifier {
  assertVerified = async (subject: string): Promise<void> => {
    refuseWithoutStepUp(subject);
  };
}

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
  'underReview',
  'richTextNotAllowed',
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
export function codeForStatus(status: number): ApiErrorCode {
  return BY_STATUS.get(status) ?? (status >= 500 ? 'internalError' : 'badRequest');
}

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && (API_ERROR_CODES as readonly string[]).includes(value);
}

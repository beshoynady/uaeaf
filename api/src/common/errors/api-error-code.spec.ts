import { HttpStatus } from '@nestjs/common';
import { codeForStatus, isApiErrorCode } from './api-error-code.js';

/**
 * The vocabulary exists so a client can act on a refusal without reading the
 * sentence attached to it. Before this, the dashboard told a system-role
 * refusal apart from a self-assignment refusal by matching English fragments
 * of the message — a contract that breaks silently the moment anyone edits
 * the copy, and that had already broken once: the self-status refusal added
 * on 2026-09-08 was worded differently and fell through to the generic case.
 */
describe('codeForStatus', () => {
  it.each([
    [HttpStatus.BAD_REQUEST, 'badRequest'],
    [HttpStatus.UNAUTHORIZED, 'unauthorized'],
    [HttpStatus.FORBIDDEN, 'forbidden'],
    [HttpStatus.NOT_FOUND, 'notFound'],
    [HttpStatus.CONFLICT, 'conflict'],
    [HttpStatus.TOO_MANY_REQUESTS, 'tooManyRequests'],
    [HttpStatus.INTERNAL_SERVER_ERROR, 'internalError'],
  ])('maps %i to %s', (status, expected) => {
    expect(codeForStatus(status)).toBe(expected);
  });

  it('calls an unmapped client error a bad request, not a server error', () => {
    // 422 and friends are still the caller's request being unusable. Saying
    // "internalError" would tell them to retry something that will never
    // succeed.
    expect(codeForStatus(422)).toBe('badRequest');
  });

  it('calls an unmapped server error a server error', () => {
    expect(codeForStatus(503)).toBe('internalError');
  });
});

describe('isApiErrorCode', () => {
  it('accepts a code in the vocabulary', () => {
    expect(isApiErrorCode('systemRole')).toBe(true);
    // A code the vocabulary does not carry is silently rewritten to the
    // status default by `ApiExceptionFilter`, so `RolesService` would
    // answer a plain `badRequest` and the dashboard could not tell an
    // incoherent permission set from any other rejected body.
    expect(isApiErrorCode('impliedReadMissing')).toBe(true);
  });

  it('rejects anything outside it', () => {
    // A typo in a throw site must degrade to the status default rather than
    // reach a client that has no branch for it.
    expect(isApiErrorCode('systemRoles')).toBe(false);
    expect(isApiErrorCode(undefined)).toBe(false);
    expect(isApiErrorCode(42)).toBe(false);
  });
});

import { Types } from 'mongoose';

/**
 * Whether a path id names the caller's own account.
 *
 * Not `===`. `ObjectId.isValid` accepts any 24 hex characters in either case and
 * Mongoose casts them to the same document, while `toString()` canonicalises to
 * lowercase — so an upper-cased hex id failed a string compare and reached the
 * same record. That let an administrator suspend themselves or strip their own
 * roles, which is exactly what the self-refusals exist to prevent (found by
 * independent review, 2026-09-27).
 *
 * Falls back to the string compare for an id that is not a valid ObjectId: it
 * cannot name a record, so the only thing left to do is compare what was sent.
 */
export const isSelf = (pathId: string, actorId: string): boolean =>
  Types.ObjectId.isValid(pathId) && Types.ObjectId.isValid(actorId)
    ? new Types.ObjectId(pathId).equals(new Types.ObjectId(actorId))
    : pathId === actorId;

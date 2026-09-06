import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export type AuthSessionDocument = HydratedDocument<AuthSession>;

/**
 * One issued refresh token, tracked server-side so it can be revoked before
 * its natural 7-day expiry (auth-security-audit-2026-09-05.md P0 #4: before
 * this collection existed, refresh tokens were pure stateless JWTs with no
 * logout, no rotation, and no reuse detection at all).
 *
 * Deliberately does NOT extend `BaseSchema`: this is a system-managed
 * operational record, not user-editable content — `createdBy`/`updatedBy`
 * would always just duplicate `userId`, and "soft delete via archivedAt"
 * doesn't fit a session's actual lifecycle (`revokedAt` already is that
 * lifecycle's terminal state, and a revoked row is kept, not hidden, since
 * it's what reuse detection checks against).
 */
@Schema({ collection: 'authSessions' })
export class AuthSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  /** SHA-256 of the refresh token (see `common/utils/hash-token.util.ts`) —
   *  never the raw token itself, so a leaked DB row alone isn't a usable
   *  credential. */
  @Prop({ required: true })
  refreshTokenHash: string;

  @Prop({ type: Date, required: true, default: Date.now })
  issuedAt: Date;

  /** Mirrors the refresh JWT's own `exp` — lets a cheap query find rows
   *  that are dead weight even before `revokedAt` is ever set. */
  @Prop({ type: Date, required: true })
  expiresAt: Date;

  /** Set the moment this session is logged out (or force-revoked via
   *  logout-all, or as a defensive response to detected token reuse). A
   *  refresh attempt against a revoked session is always rejected, even if
   *  the JWT's own signature/expiry are still technically valid. */
  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  /** Set when this session is rotated into a new one on a successful
   *  refresh. A refresh request presenting the OLD token after this is set
   *  is a reuse of an already-consumed token — rejected, and treated as a
   *  possible compromise signal (see AuthSessionsService.revoke()). */
  @Prop({ type: Types.ObjectId, ref: 'AuthSession', default: null })
  replacedBySessionId: Types.ObjectId | null;

  @Prop({ default: '' })
  ipAddress: string;

  @Prop({ default: '' })
  userAgent: string;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);
// "All active sessions for a user" (logout-all) and "is this exact session
// still valid" (every refresh) are the two query patterns this collection
// exists to serve.
AuthSessionSchema.index({ userId: 1, revokedAt: 1 });

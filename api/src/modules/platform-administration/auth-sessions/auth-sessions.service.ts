import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthSessionsRepository } from './auth-sessions.repository.js';
import type { AuthSessionDocument } from './schemas/auth-session.schema.js';

/**
 * Thin CRUD/lifecycle layer over `authSessions` — deliberately does not
 * throw HTTP exceptions itself; AuthService owns the actual security
 * decisions (what counts as "invalid", what message the caller sees), the
 * same split already used between UsersService and AuthService.login().
 */
@Injectable()
export class AuthSessionsService {
  constructor(private readonly repository: AuthSessionsRepository) {}

  async create(params: {
    sessionId: Types.ObjectId;
    userId: Types.ObjectId;
    refreshTokenHash: string;
    expiresAt: Date;
    ipAddress: string;
    userAgent: string;
  }): Promise<AuthSessionDocument> {
    return this.repository.create({
      _id: params.sessionId,
      userId: params.userId,
      refreshTokenHash: params.refreshTokenHash,
      issuedAt: new Date(),
      expiresAt: params.expiresAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  async findById(sessionId: string): Promise<AuthSessionDocument | null> {
    return this.repository.findById(sessionId);
  }

  async revoke(sessionId: string | Types.ObjectId): Promise<void> {
    await this.repository.revoke(sessionId);
  }

  /** Logout-all: every outstanding refresh token for this user stops
   *  working, regardless of which device/session issued it. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.repository.revokeAllForUser(userId);
  }

  /** Links the just-rotated-away session to the one that replaced it —
   *  presenting the old token again after this is reuse of a consumed
   *  token, not a live session (see AuthService.refresh()). */
  async markReplaced(oldSessionId: Types.ObjectId, newSessionId: Types.ObjectId): Promise<void> {
    await this.repository.markReplaced(oldSessionId, newSessionId);
  }
}

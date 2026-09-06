import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthSession } from './schemas/auth-session.schema.js';
import type { AuthSessionDocument } from './schemas/auth-session.schema.js';

/** Not a `BaseRepository<T>` subclass — `AuthSession` has no `archivedAt`
 *  (see the schema's own comment on why it skips `BaseSchema`), so the
 *  generic soft-delete-aware queries there don't apply here. */
@Injectable()
export class AuthSessionsRepository {
  constructor(@InjectModel(AuthSession.name) private readonly model: Model<AuthSessionDocument>) {}

  async create(data: {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    refreshTokenHash: string;
    issuedAt: Date;
    expiresAt: Date;
    ipAddress: string;
    userAgent: string;
  }): Promise<AuthSessionDocument> {
    return this.model.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<AuthSessionDocument | null> {
    return this.model.findById(id).exec();
  }

  async revoke(id: string | Types.ObjectId): Promise<void> {
    await this.model.updateOne({ _id: id }, { revokedAt: new Date() }).exec();
  }

  /** Logout-all: every session for this user that isn't already revoked.
   *  Casts `userId` to `Types.ObjectId` explicitly rather than relying on
   *  Mongoose's usual automatic query-value casting — verified by direct
   *  testing that a plain string filter here silently matched zero
   *  documents against this field even though `revoke()`'s `_id`-based
   *  filter (implicitly typed on every schema) worked fine, so this path
   *  cannot be trusted to auto-cast. */
  async revokeAllForUser(userId: string | Types.ObjectId): Promise<void> {
    await this.model
      .updateMany({ userId: new Types.ObjectId(userId), revokedAt: null }, { revokedAt: new Date() })
      .exec();
  }

  async markReplaced(id: string | Types.ObjectId, replacedBySessionId: Types.ObjectId): Promise<void> {
    await this.model.updateOne({ _id: id }, { replacedBySessionId }).exec();
  }
}

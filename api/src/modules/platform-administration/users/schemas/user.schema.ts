import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { AuthMethod, AuthMethodSchema } from './auth-method.schema.js';

export type UserDocument = HydratedDocument<User>;

export const ACCOUNT_STATUSES = ['Active', 'Suspended', 'Deactivated'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** Implements: users collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7819, re-read fresh 2026-09-03 — `name` corrected from
 *  plain String to bilingual `{en,ar}`: a staff member's name is recorded
 *  in both Arabic and English, standard UAE government-record practice,
 *  not a translation). Fields not needed by Week 1 (personId ->
 *  federationPersonnel) are still declared, since they exist on the live
 *  board — omitting a documented field would itself be a drift from the
 *  schema, not a scope simplification. */
@Schema({ collection: 'users' })
export class User extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  /** Uniqueness is an implementation-necessary addition, not stated on the
   *  board's Notes cell — login-by-email is not well-defined without it.
   *  `lowercase`/`trim` normalize on write so the unique index is actually
   *  meaningful (without them, "Admin@uaeaf.ae" and "admin@uaeaf.ae" could
   *  both be created as distinct accounts) — `UsersRepository.findByEmail()`
   *  normalizes its query input to match (schema-audit-2026-09-04.md
   *  §3.1, P1 finding). The unique index itself is declared below as a
   *  partial index, not via `unique: true` here — see that index's comment. */
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: [Types.ObjectId], ref: 'Role', default: [] })
  roleIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'FederationPersonnel', default: null })
  personId: Types.ObjectId | null;

  @Prop({ type: String, enum: ACCOUNT_STATUSES, default: 'Active' })
  accountStatus: AccountStatus;

  @Prop({ type: Date, default: null })
  lastLogin: Date | null;

  @Prop({ type: [AuthMethodSchema], default: [] })
  authMethods: AuthMethod[];

  @Prop({ type: String, default: null })
  passwordResetToken: string | null;

  @Prop({ type: Date, default: null })
  passwordResetExpiresAt: Date | null;

  /** Brute-force counter (BE-PLAN-010 addendum, confirmed 2026-09-02).
   *  Incremented on a wrong-password login attempt, reset to 0 on success. */
  @Prop({ type: Number, default: 0 })
  failedLoginAttempts: number;

  /** Set when failedLoginAttempts reaches LOCKOUT_THRESHOLD; login is
   *  rejected while `lockedUntil > now`, without comparing the password. */
  @Prop({ type: Date, default: null })
  lockedUntil: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
// Partial (not a plain `unique: true` @Prop) so a soft-deleted user's
// email doesn't permanently block a new/reissued account from using it
// (schema-audit-2026-09-04.md §9.2, P1 finding).
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });

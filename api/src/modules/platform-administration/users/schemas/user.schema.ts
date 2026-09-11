import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { AuthMethod, AuthMethodSchema } from './auth-method.schema.js';

export type UserDocument = HydratedDocument<User>;

export const ACCOUNT_STATUSES = ['Active', 'Suspended', 'Deactivated'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** Mirrors the frontend's `AppLocale` exactly — the dashboard reads this to
 *  pick a locale, so a value the frontend cannot route is a bug, not a
 *  preference. */
export const USER_LANGUAGES = ['ar', 'en'] as const;
export type UserLanguage = (typeof USER_LANGUAGES)[number];

/** Mirrors the values the frontend theme toggle writes to `data-theme`.
 *  `high-contrast` is deliberately absent: it has full token coverage but is
 *  not wired into the theme bootstrap (open item S12), so offering it here
 *  would let a user store a preference the UI cannot honour. */
export const USER_THEMES = ['light', 'dark'] as const;
export type UserTheme = (typeof USER_THEMES)[number];

/** Implements: users collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7819, re-read fresh 2026-09-03 — `name` corrected from
 *  plain String to bilingual `{en,ar}`: a staff member's name is recorded
 *  in both Arabic and English, standard UAE government-record practice,
 *  not a translation). Fields not needed by Week 1 (personId ->
 *  federationPersonnel) are still declared, since they exist on the live
 *  board — omitting a documented field would itself be a drift from the
 *  schema, not a scope simplification. */
@Schema({ collection: 'users', timestamps: true })
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

  /** The account's own avatar, as a standalone reference (owner decision,
   *  2026-09-07). Deliberately NOT resolved through
   *  `personId → federationPersonnel.photoId`: not every account is a
   *  federation person (service and contractor accounts exist), and an
   *  administrator's dashboard avatar is an account-level choice rather
   *  than an official personnel portrait. */
  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  photoId: Types.ObjectId | null;

  /** Preferred dashboard language. `null` means "not chosen" — the client
   *  falls back to the request/URL locale. Persisted per account rather
   *  than per device so the choice follows the user across machines, which
   *  device-local storage cannot do. */
  @Prop({ type: String, enum: USER_LANGUAGES, default: null })
  preferredLanguage: UserLanguage | null;

  /** Preferred colour theme. `null` means "not chosen" — the client falls
   *  back to the OS `prefers-color-scheme`, matching the existing theme
   *  bootstrap's own precedence (stored value → system). */
  @Prop({ type: String, enum: USER_THEMES, default: null })
  preferredTheme: UserTheme | null;

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

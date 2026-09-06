import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export const AUTH_PROVIDERS = ['Local', 'Google', 'Microsoft'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/** One embedded entry in `users.authMethods[]` — an account can have several
 *  linked sign-in methods at once (e.g. password AND Google), per the
 *  confirmed hybrid-login decision. Not a standalone collection: `_id: false`. */
@Schema({ _id: false })
export class AuthMethod {
  @Prop({ required: true, type: String, enum: AUTH_PROVIDERS })
  provider: AuthProvider;

  /** Local provider only. `select: false` so no query returns this by
   *  default (auth-security-audit-2026-09-05.md P0 #1 — the bcrypt hash was
   *  leaking through GET /users*); UsersRepository.findByEmail() opts back
   *  in explicitly for the one place that legitimately needs it (login). */
  @Prop({ select: false })
  passwordHash?: string;

  /** OAuth providers only. */
  @Prop()
  providerId?: string;

  /** OAuth providers only. */
  @Prop({ type: Date, default: Date.now })
  linkedAt: Date;
}

export const AuthMethodSchema = SchemaFactory.createForClass(AuthMethod);

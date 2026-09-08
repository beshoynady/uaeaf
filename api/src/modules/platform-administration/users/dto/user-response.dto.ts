import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { ACCOUNT_STATUSES, USER_LANGUAGES, USER_THEMES } from '../schemas/user.schema.js';
import type { AccountStatus, UserLanguage, UserTheme } from '../schemas/user.schema.js';

/** Allowlist shape for every user-returning endpoint (GET /users,
 *  GET /users/:id, GET /users/me) — deliberately excludes `authMethods`
 *  entirely (auth-security-audit-2026-09-05.md P0 #1: the raw document
 *  leaked `authMethods[].passwordHash`) and the internal lockout/reset
 *  fields (`failedLoginAttempts`, `lockedUntil`, `passwordResetToken`,
 *  `passwordResetExpiresAt`) that no caller of these routes needs. */
export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) name: LocalizedTextDto;
  @ApiProperty() email: string;
  @ApiProperty({ type: [String] }) roleIds: string[];
  @ApiProperty({ required: false, nullable: true }) personId: string | null;
  @ApiProperty({ enum: ACCOUNT_STATUSES }) accountStatus: AccountStatus;
  @ApiProperty({ required: false, nullable: true }) lastLogin: Date | null;
  @ApiProperty({ required: false, nullable: true }) photoId: string | null;

  /** `null` = not chosen; the client falls back to the request locale. */
  @ApiProperty({ enum: USER_LANGUAGES, required: false, nullable: true })
  preferredLanguage: UserLanguage | null;

  /** `null` = not chosen; the client falls back to `prefers-color-scheme`. */
  @ApiProperty({ enum: USER_THEMES, required: false, nullable: true })
  preferredTheme: UserTheme | null;
}

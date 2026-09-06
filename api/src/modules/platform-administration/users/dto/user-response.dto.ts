import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { ACCOUNT_STATUSES } from '../schemas/user.schema.js';
import type { AccountStatus } from '../schemas/user.schema.js';

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
}

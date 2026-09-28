import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PERMISSION_ACTIONS } from '../schemas/permission.schema.js';
import type { PermissionAction } from '../schemas/permission.schema.js';
import { PERMISSION_RESOURCES } from '../../../../common/constants/permission-resources.js';
import type { PermissionResource } from '../../../../common/constants/permission-resources.js';

/**
 * `GET /permissions` / `GET /permissions/:id` response shape.
 *
 * Adds one field the stored document does not carry: `superAdminOnly`, read
 * off `CAPABILITY_MAP` at response time rather than stored on the row, so it
 * can never drift from `isSuperAdminOnly` (owner decision 2026-09-27). The
 * role-building screen greys out a reserved pair using this field — Batch 8's
 * picker, which has nothing to read without it.
 */
export class PermissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) name: LocalizedTextDto;
  @ApiProperty({ enum: PERMISSION_RESOURCES }) resourceType: PermissionResource;
  @ApiProperty({ enum: PERMISSION_ACTIONS }) action: PermissionAction;
  @ApiProperty({ required: false, nullable: true }) scope: 'own' | 'all' | null;
  @ApiProperty({
    description: 'Whether Decision 4 reserves this pair to the Super Admin role — never grantable.',
  })
  superAdminOnly: boolean;
}

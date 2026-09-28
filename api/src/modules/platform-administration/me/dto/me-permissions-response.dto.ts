import { ApiProperty } from '@nestjs/swagger';
import { PERMISSION_RESOURCES, type PermissionResource } from '../../../../common/constants/permission-resources.js';
import { PERMISSION_ACTIONS, type PermissionAction } from '../../permissions/schemas/permission.schema.js';
import type { AccountClass } from '../account-class.js';

/** One resolved pair with its scope, which `GrantDto` on `GET /users/me` does not carry. */
export class ScopedGrantDto {
  @ApiProperty({ enum: PERMISSION_RESOURCES }) resourceType: PermissionResource;
  @ApiProperty({ enum: PERMISSION_ACTIONS }) action: PermissionAction;
  @ApiProperty({ enum: ['own', 'all'], nullable: true, type: String }) scope: 'own' | 'all' | null;
}

/** `GET /me/permissions`. See spec §10.1. */
export class MePermissionsResponseDto {
  @ApiProperty({ type: [ScopedGrantDto] })
  permissions: ScopedGrantDto[];

  @ApiProperty({ enum: ['standard', 'sensitive', 'superAdmin'] })
  accountClass: AccountClass;
}

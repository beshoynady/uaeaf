import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto.js';
import type { RequiredPermission } from '../../../../common/decorators/permissions.decorator.js';
import { PERMISSION_RESOURCES } from '../../../../common/constants/permission-resources.js';
import { PERMISSION_ACTIONS } from '../../permissions/schemas/permission.schema.js';

/** One entry of the caller's resolved authority. */
export class GrantDto implements RequiredPermission {
  @ApiProperty({ enum: PERMISSION_RESOURCES }) resourceType: RequiredPermission['resourceType'];
  @ApiProperty({ enum: PERMISSION_ACTIONS }) action: RequiredPermission['action'];
}

/**
 * GET /users/me only — deliberately NOT the shape of GET /users or
 * GET /users/:id.
 *
 * `permissions` is what the caller may do, resolved for this request by
 * JwtStrategy. It lives here because the access token stopped carrying a
 * permission set (owner decision 2026-09-07) and the dashboard shell still
 * has to decide which navigation entries to render. Attaching it to the
 * profile call the shell already makes keeps that at zero extra round trips.
 *
 * It is scoped to `me` on purpose: a list of users is not the place to
 * publish everyone's authority, and no caller of the other two routes needs
 * it.
 */
export class MeResponseDto extends UserResponseDto {
  @ApiProperty({ type: [GrantDto] })
  permissions: RequiredPermission[];
}

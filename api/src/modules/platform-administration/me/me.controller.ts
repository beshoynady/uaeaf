import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { RolesService } from '../roles/roles.service.js';
import { accountClassFor } from './account-class.js';
import { MePermissionsResponseDto } from './dto/me-permissions-response.dto.js';

/** Routes about the caller's own account, kept apart from `users/:id` so no path of theirs can be shadowed by it. */
@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(private readonly rolesService: RolesService) {}

  /** What this account may do, as the guard resolved it for this request.
   *  No permission: the caller is asking only about themselves. See spec §10.1. */
  @Get('permissions')
  @ApiOkResponse({ type: MePermissionsResponseDto })
  async permissions(@CurrentUser() actor: AuthenticatedUser): Promise<MePermissionsResponseDto> {
    const holdsSystemRole = (
      await Promise.all(actor.roleIds.map((roleId) => this.rolesService.isSystemRole(roleId)))
    ).some(Boolean);
    return {
      permissions: actor.permissions.map(({ resourceType, action, scope }) => ({
        resourceType,
        action,
        scope: scope ?? null,
      })),
      accountClass: accountClassFor(actor.permissions, holdsSystemRole),
    };
  }
}

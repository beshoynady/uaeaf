import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { PermissionsService } from './permissions.service.js';
import { PermissionResponseDto } from './dto/permission-response.dto.js';

/** Implements: permissions collection, Domain 8 — Platform Administration.
 *
 *  Read-only by design (owner decision 2026-09-27). The catalogue is code:
 *  `CAPABILITY_MAP` declares it, `PERMISSION_CATALOGUE` derives from it, and
 *  `seed-admin` / `sync-permission-catalogue` are its only writers. A route that
 *  minted a permission row at runtime could only ever mint one that no
 *  `@RequirePermission` decorator reads — a permission that looks granted in the
 *  dashboard and gates nothing, which is the exact failure `PERMISSION_RESOURCES`
 *  was introduced to close.
 *
 *  Both reads are Super-Admin-only: `permissions:Read` is a reserved pair
 *  (Decision 4), so no role can be granted it. */
@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermission('permissions', 'Read')
  @ApiOkResponse({ type: [PermissionResponseDto] })
  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionsService.findAll();
    return permissions.map((permission) => this.permissionsService.toResponse(permission));
  }

  @Get(':id')
  @RequirePermission('permissions', 'Read')
  @ApiOkResponse({ type: PermissionResponseDto })
  async findOne(@Param('id') id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionsService.findById(id);
    if (!permission) {
      throw new NotFoundException('Permission not found.');
    }
    return this.permissionsService.toResponse(permission);
  }
}

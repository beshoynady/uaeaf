import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { AuditEntity } from '../../../common/decorators/audit-entity.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { RenameRoleDto } from './dto/rename-role.dto.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';

/** Implements: roles collection, Domain 8 — Platform Administration. */
@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // create/updatePermissions take @CurrentUser() to enforce "you cannot
  // grant a permission you don't hold yourself" (auth-security-audit-
  // 2026-09-05.md P0 #2) — the actor's own permission set already lives in
  // their JWT, so this reads it from the request context rather than
  // re-deriving it insecurely.
  @Post()
  @RequirePermission('roles', 'ManageRoles')
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.create(dto, user.permissions);
  }

  @Get()
  @RequirePermission('roles', 'Read')
  findAll() {
    return this.rolesService.findAll();
  }

  /** 404s rather than answering 200 with an empty body for an unknown or
   *  archived id (fixed 2026-09-08). */
  @Get(':id')
  @RequirePermission('roles', 'Read')
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    return role;
  }

  /** Renames the role and, when the body carries one, rewrites its
   *  description. Rejected by RolesService if isSystemRole=true. */
  @Patch(':id/name')
  @RequirePermission('roles', 'ManageRoles')
  rename(@Param('id') id: string, @Body() dto: RenameRoleDto) {
    return this.rolesService.rename(id, dto.name, dto.description);
  }

  @Patch(':id/permissions')
  @RequirePermission('roles', 'ManageRoles')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.updatePermissions(
      id,
      dto.permissionIds.map((permissionId) => new Types.ObjectId(permissionId)),
      user.permissions,
    );
  }

  /** Archives the role and clears it from every account holding it.
   *  Rejected if the role is a system role, unknown, or already archived.
   *
   *  `@AuditEntity({ action: 'Archive' })`: `roles:ManageRoles` also guards
   *  renaming a role and editing its permissions, so the permission verb
   *  alone cannot say which of those this specific route is (independent
   *  review, round 4) — without it, `auditActionFor` falls back to the
   *  HTTP method and logs `Delete`, indistinguishable from an irreversible
   *  destruction, for an act that is reversible and merely detaches the
   *  role from its holders.
   *
   *  The request context is passed on because the service writes a row per
   *  account detached, and a row recorded from a real request carries the real
   *  address and agent rather than the empty strings a script leaves. */
  @Delete(':id')
  @RequirePermission('roles', 'ManageRoles')
  @AuditEntity({ action: 'Archive' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.rolesService.remove(
      id,
      new Types.ObjectId(user.userId),
      user.permissions,
      extractRequestContext(req),
    );
  }
}

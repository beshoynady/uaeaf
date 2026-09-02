import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { RenameRoleDto } from './dto/rename-role.dto.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';

/** Implements: roles collection, Domain 8 — Platform Administration. */
@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermission('roles', 'Create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermission('roles', 'Read')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermission('roles', 'Read')
  findOne(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  /** Rejected by RolesService if isSystemRole=true. */
  @Patch(':id/name')
  @RequirePermission('roles', 'Update')
  rename(@Param('id') id: string, @Body() dto: RenameRoleDto) {
    return this.rolesService.rename(id, dto.name);
  }

  @Patch(':id/permissions')
  @RequirePermission('roles', 'Update')
  updatePermissions(@Param('id') id: string, @Body() dto: UpdateRolePermissionsDto) {
    return this.rolesService.updatePermissions(
      id,
      dto.permissionIds.map((permissionId) => new Types.ObjectId(permissionId)),
    );
  }

  /** Soft-deletes the role — rejected by RolesService if isSystemRole=true. */
  @Delete(':id')
  @RequirePermission('roles', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.remove(id, new Types.ObjectId(user.userId));
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { AssignRolesDto } from './dto/assign-roles.dto.js';

/** Implements: users collection, Domain 8 — Platform Administration. */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission('users', 'Create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @RequirePermission('users', 'Read')
  findAll() {
    return this.usersService.findAll();
  }

  /** No @RequirePermission — any authenticated user may read their own
   *  profile, gated only by JwtAuthGuard. */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.userId);
  }

  @Get(':id')
  @RequirePermission('users', 'Read')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/roles')
  @RequirePermission('users', 'Update')
  assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    return this.usersService.assignRoles(
      id,
      dto.roleIds.map((roleId) => new Types.ObjectId(roleId)),
    );
  }
}

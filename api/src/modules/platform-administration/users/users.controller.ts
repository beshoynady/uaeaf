import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { AssignRolesDto } from './dto/assign-roles.dto.js';
import type { UserResponseDto } from './dto/user-response.dto.js';

/** Implements: users collection, Domain 8 — Platform Administration. */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Every route below maps through UsersService.toResponse() rather than
  // returning the raw document — auth-security-audit-2026-09-05.md P0 #1
  // found `authMethods[].passwordHash` leaking via these exact routes, and
  // `select: false` on the schema alone doesn't protect a document that
  // was just created in-memory (create() below), so the allowlist mapping
  // is applied everywhere a User ever leaves this controller.

  @Post()
  @RequirePermission('users', 'Create')
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto);
    return this.usersService.toResponse(user);
  }

  @Get()
  @RequirePermission('users', 'Read')
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => this.usersService.toResponse(user));
  }

  /** No @RequirePermission — any authenticated user may read their own
   *  profile, gated only by JwtAuthGuard. */
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    const found = await this.usersService.findById(user.userId);
    if (!found) {
      // Defensive: a valid JWT for a since-deleted user should never reach
      // this point in practice, but returning null silently would be a
      // confusing 200 for a caller — fail loudly instead.
      throw new NotFoundException('User not found.');
    }
    return this.usersService.toResponse(found);
  }

  @Get(':id')
  @RequirePermission('users', 'Read')
  async findOne(@Param('id') id: string): Promise<UserResponseDto | null> {
    const found = await this.usersService.findById(id);
    return found ? this.usersService.toResponse(found) : null;
  }

  @Patch(':id/roles')
  @RequirePermission('users', 'Update')
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto | null> {
    // Blocks the second step of the escalation chain in
    // auth-security-audit-2026-09-05.md §16: create a role with every
    // permission (now rejected by RolesService, see roles.service.ts),
    // then self-assign it via this endpoint. `users:Update` is a general
    // "edit a user" permission, not one scoped for granting yourself power
    // — self-assignment is refused outright rather than gated behind that
    // same general permission. A dedicated roles:Assign permission that
    // deliberately allows self-assignment is a separate, later decision
    // (audit Change 5, not part of this P0 fix).
    if (id === actor.userId) {
      throw new ForbiddenException('You cannot assign roles to yourself.');
    }
    const updated = await this.usersService.assignRoles(
      id,
      dto.roleIds.map((roleId) => new Types.ObjectId(roleId)),
    );
    return updated ? this.usersService.toResponse(updated) : null;
  }
}

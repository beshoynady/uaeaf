import { Body, Controller, ForbiddenException, Get, Header, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { AssignRolesDto } from './dto/assign-roles.dto.js';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { MeResponseDto } from './dto/me-response.dto.js';

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
   *  profile, gated only by JwtAuthGuard.
   *
   *  Returns `permissions` on top of the shared profile shape. Since the
   *  2026-09-07 token decision the access token carries roleIds only, so
   *  this is where a client learns what it may actually do. The value is
   *  taken from `user`, which JwtStrategy already resolved for this
   *  request — no second query, and no chance of disagreeing with the
   *  answer the guards will give on the very next call. */
  @Get('me')
  @ApiOkResponse({ type: MeResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    const found = await this.usersService.findById(user.userId);
    if (!found) {
      // Defensive: a valid JWT for a since-deleted user should never reach
      // this point in practice, but returning null silently would be a
      // confusing 200 for a caller — fail loudly instead.
      throw new NotFoundException('User not found.');
    }
    return { ...this.usersService.toResponse(found), permissions: user.permissions };
  }

  /** No @RequirePermission — like `GET me`, a user acts on their own record,
   *  gated only by JwtAuthGuard. The id comes from the JWT, never from the
   *  request body, so this route cannot be used to edit another account. */
  @Patch('me/preferences')
  @ApiOkResponse({ type: UserResponseDto })
  async updateMyPreferences(
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const updated = await this.usersService.updatePreferences(user.userId, dto);
    if (!updated) {
      throw new NotFoundException('User not found.');
    }
    return updated;
  }

  /** 404s rather than answering 200 with an empty body, which is what an
   *  unknown id produced until 2026-09-08 — a status that told the caller
   *  the account exists and simply has no fields. */
  /** Before `:id` — Nest matches in declaration order. */
  @Get('export')
  @RequirePermission('users', 'Export')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="users.csv"')
  exportCsv() {
    return this.usersService.exportCsv();
  }

  @Get(':id')
  @RequirePermission('users', 'Read')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const found = await this.usersService.findById(id);
    if (!found) {
      throw new NotFoundException('User not found.');
    }
    return this.usersService.toResponse(found);
  }

  @Patch(':id/roles')
  @RequirePermission('users', 'Update')
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
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
      throw new ForbiddenException({
        code: 'selfAssignment',
        message: 'You cannot assign roles to yourself.',
      });
    }
    const updated = await this.usersService.assignRoles(
      id,
      dto.roleIds.map((roleId) => new Types.ObjectId(roleId)),
    );
    return this.usersService.toResponse(updated);
  }

  /**
   * Suspends, deactivates or restores an account.
   *
   * Added 2026-09-08. Until then nothing in the API wrote `accountStatus`,
   * so holding an account meant editing the database by hand.
   *
   * Self-exclusion is the same rule, and the same reasoning, as role
   * assignment above: `users:Update` is a general "edit a user" permission,
   * and an administrator locking themselves out — or quietly restoring
   * their own suspended account — is not what it is for. Someone else with
   * the permission does it.
   */
  @Patch(':id/status')
  @RequirePermission('users', 'Update')
  @ApiOkResponse({ type: UserResponseDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAccountStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    if (id === actor.userId) {
      throw new ForbiddenException({
        code: 'selfAssignment',
        message: 'You cannot change the status of your own account.',
      });
    }
    return this.usersService.updateAccountStatus(id, dto.accountStatus);
  }
}

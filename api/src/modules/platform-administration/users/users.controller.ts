import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Header, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { UsersService, MAX_NAME_LOOKUP_IDS } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { AssignRolesDto } from './dto/assign-roles.dto.js';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UserNameDto } from './dto/user-name.dto.js';
import { UserRefDto } from './dto/user-ref.dto.js';
import { MeResponseDto } from './dto/me-response.dto.js';
import { isSelf } from './is-self.js';

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

  /** The actor is passed through so `UsersService` can refuse a role that
   *  grants more than the caller holds (ADR-0104 rule 1). `users:Create` alone
   *  was a complete path to Super Admin until that rule reached this route. */
  @Post()
  @RequirePermission('users', 'Create')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto, actor);
    return this.usersService.toResponseFor(user);
  }

  @Get()
  @RequirePermission('users', 'Read')
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return this.usersService.toResponses(users);
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
    return { ...(await this.usersService.toResponseFor(found)), permissions: user.permissions };
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

  /**
   * Colleague name resolution — ADR-0104 §D4.
   *
   * Carries no `@RequirePermission`, deliberately: `users:Read` is now
   * Super-Admin-only, and a byline, an audit row's actor, and a workflow
   * step's approver all need to show a name regardless of who is looking.
   * Still not public — this route is not `@Public()`, so `JwtAuthGuard`
   * still runs and an unauthenticated caller gets 401.
   *
   * Declared ahead of `:id`, same reason as `export` above — Nest matches
   * path segments in declaration order, and `names` would otherwise be read
   * as an id.
   */
  @Get('names')
  @ApiQuery({
    name: 'ids',
    required: false,
    description:
      `Comma-separated user ids, at most ${MAX_NAME_LOOKUP_IDS}. More than the cap, or an id ` +
      'that is not a valid ObjectId, is rejected with 400 — malformed input is rejected at the ' +
      "boundary. An id that does not resolve (unknown or archived) is dropped from the response " +
      'without a trace, so the response can never be used to tell the two apart.',
  })
  @ApiOkResponse({ type: [UserNameDto] })
  async namesByIds(@Query('ids') ids?: string): Promise<UserNameDto[]> {
    const requested = [
      ...new Set(
        (ids ?? '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    if (requested.length > MAX_NAME_LOOKUP_IDS) {
      throw new BadRequestException(`At most ${MAX_NAME_LOOKUP_IDS} ids may be requested at once.`);
    }
    const invalid = requested.filter((id) => !Types.ObjectId.isValid(id));
    if (invalid.length > 0) {
      throw new BadRequestException(`Not a valid id: ${invalid.join(', ')}.`);
    }
    return this.usersService.displayNamesFor(requested);
  }

  @Get(':id')
  @RequirePermission('users', 'Read')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const found = await this.usersService.findById(id);
    if (!found) {
      throw new NotFoundException('User not found.');
    }
    return this.usersService.toResponseFor(found);
  }

  @Patch(':id/roles')
  @RequirePermission('users', 'AssignRoles')
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    // Blocks the second step of the escalation chain in
    // auth-security-audit-2026-09-05.md §16: create a role with every
    // permission (now rejected by RolesService, see roles.service.ts),
    // then self-assign it via this endpoint. `users:AssignRoles` is its own
    // dedicated grant for handing out authority — re-pointed here from the
    // general `users:Update` (independent review, round 4, I6): the route
    // that hands out every other permission on the platform should not be
    // guarded by the same verb as an ordinary profile edit, which is what
    // the comment below already argued for before the permission existed to
    // say it with. Self-assignment is refused unconditionally regardless of
    // which permission guards the route — that is a separate rule, not a
    // consequence of this one.
    if (isSelf(id, actor.userId)) {
      throw new ForbiddenException({
        code: 'selfAssignment',
        message: 'You cannot assign roles to yourself.',
      });
    }
    const updated = await this.usersService.assignRoles(
      id,
      dto.roleIds.map((roleId) => new Types.ObjectId(roleId)),
      actor,
      extractRequestContext(req),
    );
    return this.usersService.toResponseFor(updated);
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
    if (isSelf(id, actor.userId)) {
      throw new ForbiddenException({
        code: 'selfAssignment',
        message: 'You cannot change the status of your own account.',
      });
    }
    return this.usersService.updateAccountStatus(id, dto.accountStatus, actor);
  }

  /**
   * Archives the account — reversible, and distinct from suspending it:
   * `accountStatus` says whether someone may sign in, this says whether the
   * account is still part of the directory.
   *
   * Self-exclusion is the same rule and the same reasoning as role assignment
   * and status above: an administrator who archives their own account has locked
   * themselves out of undoing it, and someone else with the permission does it.
   *
   * **Answers the id and nothing else.** `users:Archive` is grantable while
   * `users:Read` is reserved, and `missingImpliedReads` is deliberately silent
   * about a reserved read — so a holder of this pair need not hold the read, and
   * a `UserResponseDto` here would hand them the email, the roles, the status and
   * the last login by archiving. Every other resource's `Restore` route may
   * answer its record, because for those the implication rule requires the read
   * (ADR-0120 §D12).
   */
  @Delete(':id')
  @RequirePermission('users', 'Archive')
  @ApiOkResponse({ type: UserRefDto })
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserRefDto> {
    if (isSelf(id, actor.userId)) {
      throw new ForbiddenException({
        code: 'selfAssignment',
        message: 'You cannot archive your own account.',
      });
    }
    const archived = await this.usersService.remove(id, actor);
    if (!archived) {
      throw new NotFoundException('User not found.');
    }
    return { id: archived._id.toString() };
  }

  /** See ADR-0120: not `:id/restore`, which is the revision restore. No
   *  self-exclusion — an archived account cannot make the request. Answers the
   *  id and nothing else, for the reason `remove` above gives. */
  @Post(':id/unarchive')
  @RequirePermission('users', 'Restore')
  @ApiOkResponse({ type: UserRefDto })
  async unarchive(@Param('id') id: string): Promise<UserRefDto> {
    const restored = await this.usersService.unarchive(id);
    if (!restored) {
      throw new NotFoundException('User not found.');
    }
    return { id: restored._id.toString() };
  }
}

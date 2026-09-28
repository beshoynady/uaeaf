import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { UsersRepository } from './users.repository.js';
import type { User, UserDocument } from './schemas/user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import type { UserResponseDto } from './dto/user-response.dto.js';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { LOCKOUT_DURATION_MINUTES, LOCKOUT_THRESHOLD } from '../../../config/auth.config.js';
import type { AccountStatus } from './schemas/user.schema.js';
import type { LocalizedText } from '../../../common/schemas/localized-text.schema.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import { duplicateKeyField, isDuplicateKeyError } from '../../../common/utils/mongo-errors.util.js';
import { toCsv, type CsvColumn } from '../../../common/utils/csv.util.js';
import { missingPairs } from './user-authority.js';
import { isSelf } from './is-self.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * Column order for `users:Export`.
 *
 * An allow-list, never a dump. `authMethods` holds `passwordHash`, and
 * `passwordResetToken` is a live credential — both would walk out of the
 * platform inside a spreadsheet nobody re-reads before forwarding. Listing
 * columns explicitly is what makes adding a sensitive field to the schema
 * a no-op for this file.
 */
const USER_EXPORT_COLUMNS: readonly CsvColumn[] = [
  { key: 'name.ar', header: 'Name (AR)' },
  { key: 'name.en', header: 'Name (EN)' },
  { key: 'email', header: 'Email' },
  { key: 'accountStatus', header: 'Status' },
  { key: 'preferredLanguage', header: 'Language' },
  { key: 'lastLogin', header: 'Last login' },
  { key: 'failedLoginAttempts', header: 'Failed logins' },
  { key: 'lockedUntil', header: 'Locked until' },
];

const PASSWORD_HASH_ROUNDS = 10;

/** `GET /users/names` fallback (ADR-0104 §D4, condition 2) — applied per
 *  language, independently, when the stored name for that language is empty.
 *  Never the email: this route carries no permission, so an empty name must
 *  not push the response toward the one other identifying field on the
 *  account. */
const DISPLAY_NAME_FALLBACK: LocalizedText = { en: 'User', ar: 'مستخدم' };

/** `GET /users/names` (ADR-0104 §D4, condition 4) — more than this in one
 *  request is a 400, not a silent truncation. */
export const MAX_NAME_LOOKUP_IDS = 100;

/** Implements: users collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7819). */
@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    // Role assignment has to know whether a role id resolves to anything.
    // The dependency runs one way only — RolesModule binds the `User` model
    // directly for its own single write (see RoleAssignmentsRepository)
    // rather than importing this module back.
    private readonly rolesService: RolesService,
    // Suspending an account has to end the sessions it already has.
    private readonly authSessionsService: AuthSessionsService,
    // An account may name the federation person it belongs to. The link is
    // verified rather than trusted: nothing reads `personId` yet, so a
    // reference to a record that does not exist would go unnoticed
    // indefinitely.
    private readonly personnel: FederationPersonnelsService,
    // Appointing or revoking the Super Admin role is a recorded security
    // event (owner decision 2026-09-27) — see `assignRoles`.
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /** Hashes the plaintext password and stores it as the user's Local
   *  authMethod entry — the plaintext value itself is never persisted.
   *
   *  The duplicate-key catch is what makes a taken email a 409 rather than
   *  the bare 500 it produced until 2026-09-08. `email` is normalised to
   *  lowercase by the schema, so `Admin@x.ae` and `admin@x.ae` collide;
   *  saying which field collided is what lets the form point at it.
   *
   *  Only the duplicate shape is translated — anything else is rethrown
   *  untouched, so a database outage is never reported as a naming clash.
   *
   *  @throws ConflictException when the email is already registered. */
  async create(dto: CreateUserDto, actor: AuthenticatedUser): Promise<UserDocument> {
    const roleIds = dto.roleIds ?? [];
    // Every check runs before anything is written. An account created and
    // then found to name a role that does not exist would have to be undone,
    // and a half-provisioned account looks provisioned.
    await this.rolesService.assertAssignable(roleIds);
    await this.assertAssignableByActor(roleIds, actor);
    const personId = await this.resolvePersonId(dto.personId);

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);
    try {
      return await this.repository.create({
        name: dto.name,
        email: dto.email,
        accountStatus: 'Active',
        roleIds: roleIds.map((roleId) => new Types.ObjectId(roleId)),
        personId,
        authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const field = duplicateKeyField(error) ?? 'email';
        throw new ConflictException(`An account with this ${field} already exists.`);
      }
      throw error;
    }
  }

  /**
   * "You cannot hand out what you do not hold yourself" — ADR-0104 rule 1.
   *
   * The rule `RolesService.assertGrantable` enforces when a role is BUILT,
   * applied where a role actually reaches a person. Its absence here was a
   * complete privilege escalation, proved in
   * `docs/reviews/roles-permissions-review.md` §2: the coherence rule forces any
   * role holding `users:Create` to also hold `users:Read`, `GET /users` reveals
   * the Super Admin role's id, and `POST /users` accepted both that id and a
   * caller-chosen password — so two calls produced an account holding every
   * permission on the platform, and the actor signed in as it.
   *
   * Scope is compared, not just the pair: an actor holding `articles:Update` at
   * `own` may not grant it at `all`. See `holdsPair`.
   *
   * @throws ForbiddenException naming every pair the actor lacks.
   */
  private async assertAssignableByActor(
    roleIds: readonly string[],
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (roleIds.length === 0) {
      // A bare account, or one being stripped of every role, hands over nothing.
      return;
    }

    // A system role is NOT special-cased. It holds the whole catalogue, so the
    // comparison below refuses it to everyone who does not already cover it —
    // which is what ADR-0104 says ("refused to anyone who does not already hold
    // it") and, in practice, means only another Super Admin.
    //
    // An earlier version refused every system role outright. Stricter, and it
    // broke something: `lastSuperAdmin` tells an administrator to appoint a
    // second Super Admin before changing the last one's account, and with a
    // blanket refusal no route could. The guard became a one-way ratchet whose
    // own advice could not be followed.
    const granted = await this.rolesService.resolvePermissionsForRoles(roleIds);

    // Decision 4's eight reserved pairs are refused only at the GRANT path
    // (`RolesService.assertGrantable`), not here. No role but the seeded
    // Super Admin role can ever hold one, so the superset comparison right
    // below already restricts assigning such a role to another holder of
    // it — in practice, another Super Admin. Repeating the reserved-pair
    // refusal on this path would deny that appointment unconditionally,
    // which is the same one-way ratchet the paragraph above removed for
    // system roles generally: ADR-0105's `lastSuperAdmin` tells an
    // administrator to appoint a second Super Admin before changing the
    // last one's account, and a route that could never do that would make
    // its own advice unfollowable.
    const missing = missingPairs(actor.permissions, granted);
    if (missing.length > 0) {
      throw new ForbiddenException({
        code: 'ungrantableRole',
        message: 'You cannot assign a role that grants more than you hold yourself.',
        missing: missing.map((pair) => `${pair.resourceType}:${pair.action}`),
      });
    }
  }

  /**
   * "You cannot act on someone stronger than you" — ADR-0104 rule 2.
   *
   * Role assignment is the obvious way to acquire another account's authority;
   * credentials are the quiet one. An actor who may reset another's second
   * factor, or reissue their setup link, can become them — and their
   * capabilities become the actor's without a single permission changing hands.
   * So every route that can acquire an account calls this: role assignment,
   * account status, setup link, 2FA reset, session revocation, person link.
   *
   * Subset, not strict subset. Equal sets may act on each other, which is what
   * lets two Super Admins administer one another; ADR-0105 narrows that for the
   * last remaining one. A strict test would deadlock every peer pair.
   *
   * @throws NotFoundException when the target does not exist — an unknown id
   *   must not read as "holds nothing", which would make a non-existent account
   *   the weakest possible target.
   * @throws ForbiddenException when the target holds any pair the actor lacks.
   */
  async assertNotStronger(targetUserId: string, actor: AuthenticatedUser): Promise<void> {
    const target = await this.repository.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('User not found.');
    }

    const targetGrants = await this.rolesService.resolvePermissionsForRoles(
      target.roleIds.map((roleId) => roleId.toString()),
    );
    const beyond = missingPairs(actor.permissions, targetGrants);
    if (beyond.length > 0) {
      throw new ForbiddenException({
        code: 'targetStronger',
        message: 'This account holds permissions you do not hold yourself.',
        missing: beyond.map((pair) => `${pair.resourceType}:${pair.action}`),
      });
    }
  }

  /**
   * Refuses a change that would leave the platform with no Super Admin able to
   * sign in — ADR-0105.
   *
   * Read inside the handler, immediately before the write, from current state
   * (CLAUDE.md §31). A count taken when the screen opened is exactly the count a
   * concurrent demotion defeats, which is why the repository counts the OTHER
   * holders rather than all of them.
   *
   * It refuses the holder's own request too. "I'll demote myself for a moment"
   * is how the last one goes, and there is no way back through the API: the
   * bootstrap script deliberately leaves an existing account's roles and status
   * untouched, so recovery is ADR-0105's break-glass command or direct database
   * access.
   *
   * @throws ForbiddenException when the target is the last active holder.
   */
  async assertNotLastSuperAdmin(targetUserId: string): Promise<void> {
    const target = await this.repository.findById(targetUserId);
    if (!target) {
      // Nothing to protect. The caller's own not-found handling applies.
      return;
    }

    const holdsSystemRole = (
      await Promise.all(
        target.roleIds.map((roleId) => this.rolesService.isSystemRole(roleId.toString())),
      )
    ).some(Boolean);
    if (!holdsSystemRole) {
      return;
    }

    if ((await this.repository.countActiveSuperAdmins(targetUserId)) === 0) {
      throw new ForbiddenException({
        code: 'lastSuperAdmin',
        message:
          'This is the last active Super Admin. Appoint another one before changing this account.',
      });
    }
  }

  /** @throws BadRequestException when the id names no federation person. */
  private async resolvePersonId(personId?: string): Promise<Types.ObjectId | null> {
    if (!personId) {
      return null;
    }
    const person = await this.personnel.findById(personId);
    if (!person) {
      throw new BadRequestException(`No federation person has the id ${personId}.`);
    }
    return new Types.ObjectId(personId);
  }

  async findAll(): Promise<UserDocument[]> {
    return this.repository.find();
  }

  /** Every live account as a spreadsheet, behind `users:Export`. See
   *  `USER_EXPORT_COLUMNS` for why this is an allow-list. */
  async exportCsv(): Promise<string> {
    return toCsv(
      (await this.repository.find()) as unknown as Record<string, unknown>[],
      USER_EXPORT_COLUMNS,
    );
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.repository.findById(id);
  }

  /**
   * Display names for a set of user ids, keyed by id.
   *
   * Deliberately narrower than `findByIds`: a caller that wants to label
   * "who saved version 3" needs a name, and handing it whole user documents
   * would put email addresses and account state into a screen that has no
   * business showing them. An id with no matching account is simply absent
   * from the map — a deleted account must not break a history listing.
   *
   * Backed by `UsersRepository.findNamesByIds`, which selects `_id name`
   * explicitly rather than fetching the whole document and dropping fields
   * afterward (owner decision 2026-09-27) — the projection is the guarantee:
   * a filter applied after the read means the email was already fetched into
   * memory, and one careless log line away from leaving the process. Used
   * both internally (revision history, workflow actor labels) and by
   * `displayNamesFor` below, which serves `GET /users/names`.
   */
  async findNamesByIds(ids: readonly string[]): Promise<Map<string, LocalizedText>> {
    const users = await this.repository.findNamesByIds([...new Set(ids)]);
    return new Map(users.map((user) => [String(user._id), user.name]));
  }

  /**
   * The `GET /users/names` response shape (ADR-0104 §D4) — id and a display
   * name only, never anything else.
   *
   * The fallback applies per language independently: an empty `ar` becomes
   * `مستخدم`, an empty `en` becomes `User`, and one being present never papers
   * over the other being missing. Never the email — this route carries no
   * permission, so a stored name that happens to be blank must not nudge a
   * caller toward the one other identifying field on the account.
   *
   * An id that resolves to nothing (unknown or archived — indistinguishable,
   * by design) is simply absent from the result. Silence is the point: with
   * no permission gating this route, a distinguishable "not found" would let
   * a caller learn which accounts exist by comparing the response to what it
   * asked for.
   *
   * `name?.en`/`name?.ar` (independent review, round 4, M9): a row with no
   * `name` subdocument at all — reachable the same way the empty-string row
   * in `users.names.spec.ts` is, by bypassing Mongoose's own validation —
   * used to throw reading `.en` off `undefined`, a 500 on a route every
   * authenticated user can reach. The fallback now covers "missing
   * entirely", not only "present but blank".
   */
  async displayNamesFor(
    ids: readonly string[],
  ): Promise<{ id: string; displayName: LocalizedText }[]> {
    const names = await this.findNamesByIds(ids);
    return [...names.entries()].map(([id, name]) => ({
      id,
      displayName: {
        en: name?.en || DISPLAY_NAME_FALLBACK.en,
        ar: name?.ar || DISPLAY_NAME_FALLBACK.ar,
      },
    }));
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.repository.findByEmail(email);
  }

  /**
   * Replaces the account's roles with exactly this list.
   *
   * Validates first, writes second. Until 2026-09-08 this was a bare update:
   * `@IsMongoId` had checked the *shape* of each id and nothing had checked
   * that it resolved to a role, so a well-formed id for a role that never
   * existed was stored silently and granted nothing.
   *
   * @throws BadRequestException when an id resolves to no live role.
   * @throws NotFoundException when the account itself does not exist.
   * @throws ForbiddenException with code `selfAssignment` when the actor is the target.
   */
  async assignRoles(
    id: string,
    roleIds: Types.ObjectId[],
    actor: AuthenticatedUser,
    /** From `extractRequestContext(req)` at the controller. Defaulted so
     *  every existing caller (and every test) that has nothing to pass
     *  keeps compiling — the two new security-event rows below are the
     *  only readers. */
    context: { ipAddress: string; userAgent: string } = { ipAddress: '', userAgent: '' },
  ): Promise<UserDocument> {
    if (isSelf(id, actor.userId)) {
      throw new ForbiddenException({
        code: 'selfAssignment',
        message: 'You cannot assign roles to yourself.',
      });
    }
    const asStrings = roleIds.map((roleId) => roleId.toString());
    await this.rolesService.assertAssignable(asStrings);
    await this.assertAssignableByActor(asStrings, actor);
    await this.assertNotStronger(id, actor);

    // Only when the new list drops every system role. Re-assigning a Super Admin
    // their own role, or adding a second role beside it, removes no holder and
    // must not be refused.
    //
    // This branch was briefly removed as unreachable, on the reasoning that
    // `assertAssignableByActor` refused every system role so no list could
    // contain one. That reasoning died with the blanket refusal: a Super Admin
    // may now appoint another, so a list containing a system role is reachable
    // and this branch is live.
    const keepsASystemRole = (
      await Promise.all(asStrings.map((roleId) => this.rolesService.isSystemRole(roleId)))
    ).some(Boolean);
    if (!keepsASystemRole) {
      await this.assertNotLastSuperAdmin(id);
    }

    // Read BEFORE the write: the security event this call may record — a
    // grant or a revocation — is about the transition INTO this call, which
    // only the account's state going in can answer.
    const wasHoldingSystemRole = await this.holdsSystemRole(id);

    const updated = await this.repository.updateById(id, { roleIds });
    if (!updated) {
      throw new NotFoundException('User not found.');
    }

    await this.recordSuperAdminTransition(wasHoldingSystemRole, keepsASystemRole, id, actor, context);

    return updated;
  }

  /** Whether this account currently holds a system role — read fresh, not
   *  reused from `assertNotLastSuperAdmin`'s own read, because `assignRoles`
   *  specifically needs the state going INTO this call. */
  private async holdsSystemRole(userId: string): Promise<boolean> {
    const user = await this.repository.findById(userId);
    if (!user) {
      return false;
    }
    const flags = await Promise.all(
      user.roleIds.map((roleId) => this.rolesService.isSystemRole(roleId.toString())),
    );
    return flags.some(Boolean);
  }

  /**
   * Appointing or revoking the Super Admin role is its own recorded security
   * event (owner decision 2026-09-27) — alongside, not instead of, the guards
   * already in `assignRoles`: `assertNotLastSuperAdmin` above already refused
   * a revocation that would leave nobody able to sign in. This only records
   * what happened once a write has actually gone through.
   *
   * Silent when the holder status did not change either way — adding a
   * second ordinary role beside an existing system role, or re-saving the
   * same one, is neither a grant nor a revocation.
   *
   * ASSUMPTION, undocumented until now (independent review, round 4, M6):
   * this fires for ANY system role, not specifically the seeded Super Admin
   * — `holdsSystemRole` reads `RolesService.isSystemRole`, which is `true`
   * for every role seeded with that flag. Accurate today because exactly one
   * system role exists. A second system role seeded in the future would also
   * write `SuperAdminGranted`/`SuperAdminRevoked` for itself, which may or
   * may not be the intended scope of "Super Admin" event naming — pinned by
   * `users.service.super-admin-events.spec.ts`'s "fires for any system role"
   * test so that changing it is a deliberate choice, not a surprise.
   */
  private async recordSuperAdminTransition(
    wasHoldingSystemRole: boolean,
    keepsASystemRole: boolean,
    targetId: string,
    actor: AuthenticatedUser,
    context: { ipAddress: string; userAgent: string },
  ): Promise<void> {
    if (wasHoldingSystemRole === keepsASystemRole) {
      return;
    }
    await this.auditLogsService.write({
      actorId: new Types.ObjectId(actor.userId),
      action: keepsASystemRole ? 'SuperAdminGranted' : 'SuperAdminRevoked',
      entityType: 'users',
      entityId: new Types.ObjectId(targetId),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  /**
   * Suspends, deactivates or restores an account.
   *
   * `accountStatus` had no writer at all before 2026-09-08 — the column was
   * set once at creation and by the seed script, so holding an account meant
   * editing the database by hand.
   *
   * Moving away from `Active` revokes every live session. Login and refresh
   * both already reject a non-active account, but an access token issued a
   * minute earlier keeps working for the rest of its fifteen-minute life; a
   * suspension that waits for that is not a suspension. Restoring an account
   * revokes nothing — there is nothing to revoke, and it is not a security
   * event.
   *
   * @throws NotFoundException when the account does not exist.
   */
  async updateAccountStatus(
    id: string,
    accountStatus: AccountStatus,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    await this.assertNotStronger(id, actor);

    // Restoring an account to Active adds a holder rather than removing one, so
    // it is never the change that empties the role.
    if (accountStatus !== 'Active') {
      await this.assertNotLastSuperAdmin(id);
    }

    const updated = await this.repository.updateById(id, { accountStatus });
    if (!updated) {
      throw new NotFoundException('User not found.');
    }
    if (accountStatus !== 'Active') {
      await this.authSessionsService.revokeAllForUser(id);
    }
    return this.toResponseFor(updated);
  }

  /**
   * Archives the account, and ends every session it holds.
   *
   * The revocation is not housekeeping. `JwtStrategy` resolves permissions from
   * the token's `roleIds` and never re-reads the account, so an archived user's
   * access token keeps working until it expires and its refresh token keeps
   * minting new ones — archiving alone would not end the session it is meant to.
   *
   * The two refusals are the ones `updateAccountStatus` already applies, for the
   * same reasons: an actor may not archive an account holding more than they do,
   * and archiving the last Super Admin would leave nobody able to undo it.
   *
   * @throws ForbiddenException when the target is stronger, or is the last
   *   active Super Admin.
   */
  async remove(id: string, actor: AuthenticatedUser): Promise<UserDocument | null> {
    await this.assertNotStronger(id, actor);
    await this.assertNotLastSuperAdmin(id);

    const archived = await this.repository.softDelete(id, new Types.ObjectId(actor.userId));
    if (archived) {
      await this.authSessionsService.revokeAllForUser(id);
    }
    return archived;
  }

  /** Brings an archived account back. It signs in again from scratch: nothing
   *  restores the sessions `remove` ended. */
  async unarchive(id: string): Promise<UserDocument | null> {
    return this.repository.restore(id);
  }

  /** Maps a full `User` document to its allowlist response shape — the
   *  controller boundary that must never let `authMethods` (or the raw
   *  document at all) escape (auth-security-audit-2026-09-05.md P0 #1). */
  toResponse(user: UserDocument, liveRoleIds: ReadonlySet<string>): UserResponseDto {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      roleIds: user.roleIds.map((id) => id.toString()),
      personId: user.personId ? user.personId.toString() : null,
      accountStatus: user.accountStatus,
      lastLogin: user.lastLogin,
      photoId: user.photoId ? user.photoId.toString() : null,
      preferredLanguage: user.preferredLanguage,
      preferredTheme: user.preferredTheme,
      hasNoRole: !user.roleIds.some((roleId) => liveRoleIds.has(roleId.toString())),
    };
  }

  /** `toResponse` for a list: the live-role set is read once, not once per row. */
  async toResponses(users: UserDocument[]): Promise<UserResponseDto[]> {
    const liveRoleIds = await this.liveRoleIds();
    return users.map((user) => this.toResponse(user, liveRoleIds));
  }

  /** `toResponse` for a single account, against the same live-role set. */
  async toResponseFor(user: UserDocument): Promise<UserResponseDto> {
    return this.toResponse(user, await this.liveRoleIds());
  }

  // RolesService.findAll answers live roles only, so an archived role is absent.
  private async liveRoleIds(): Promise<ReadonlySet<string>> {
    const roles = await this.rolesService.findAll();
    return new Set(roles.map((role) => role._id.toString()));
  }

  /** Self-service preference update — the writer for `preferredLanguage`/
   *  `preferredTheme`. Without it those columns would be readable but
   *  unsettable, the same half-implementation the frontend's theme
   *  bootstrap had before its toggle existed.
   *
   *  Builds the update from only the fields actually supplied, so a request
   *  that sets one preference cannot clear the other. An explicit `null` IS
   *  applied — it is how a user returns a preference to "follow the system".
   *
   *  Tests `!== undefined` rather than the `in` operator. `in` was wrong and
   *  silently so (fixed 2026-09-07, caught by driving the real endpoint):
   *  the global ValidationPipe runs with `transform: true`, so what arrives
   *  here is a class instance, and under `target: ES2023` every declared
   *  property exists on it — as `undefined` when it was not sent. `in` was
   *  therefore always true, and changing the theme wiped the language on
   *  every single call. The unit test missed it by passing a plain object
   *  literal, which does not have the absent keys; it now builds a real DTO
   *  the way the pipe does. */
  async updatePreferences(id: string, dto: UpdatePreferencesDto): Promise<UserResponseDto | null> {
    const update: Partial<Pick<User, 'preferredLanguage' | 'preferredTheme'>> = {};
    if (dto.preferredLanguage !== undefined) {
      update.preferredLanguage = dto.preferredLanguage;
    }
    if (dto.preferredTheme !== undefined) {
      update.preferredTheme = dto.preferredTheme;
    }

    const user = await this.repository.updateById(id, update);
    return user ? this.toResponseFor(user) : null;
  }

  async recordSuccessfulLogin(id: string): Promise<void> {
    await this.repository.updateById(id, {
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  /** @param currentAttempts the caller's already-fetched
   *  `user.failedLoginAttempts`, so this does one write, not a
   *  read-then-write against a value that could have moved. Sets
   *  `lockedUntil` the moment the incremented count reaches
   *  LOCKOUT_THRESHOLD. */
  async recordFailedLogin(id: string, currentAttempts: number): Promise<void> {
    const failedLoginAttempts = currentAttempts + 1;
    const update: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts };
    if (failedLoginAttempts >= LOCKOUT_THRESHOLD) {
      update.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    }
    await this.repository.updateById(id, update);
  }
}

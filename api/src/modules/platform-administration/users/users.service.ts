import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
import { duplicateKeyField, isDuplicateKeyError } from '../../../common/utils/mongo-errors.util.js';
import { toCsv, type CsvColumn } from '../../../common/utils/csv.util.js';

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
  async create(dto: CreateUserDto): Promise<UserDocument> {
    const roleIds = dto.roleIds ?? [];
    // Both checks run before anything is written. An account created and
    // then found to name a role that does not exist would have to be undone,
    // and a half-provisioned account looks provisioned.
    await this.rolesService.assertAssignable(roleIds);
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
   */
  async findNamesByIds(ids: readonly string[]): Promise<Map<string, LocalizedText>> {
    const users = await this.repository.findByIds([...new Set(ids)]);
    return new Map(users.map((user) => [String(user._id), user.name]));
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
   */
  async assignRoles(id: string, roleIds: Types.ObjectId[]): Promise<UserDocument> {
    await this.rolesService.assertAssignable(roleIds.map((roleId) => roleId.toString()));
    const updated = await this.repository.updateById(id, { roleIds });
    if (!updated) {
      throw new NotFoundException('User not found.');
    }
    return updated;
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
  async updateAccountStatus(id: string, accountStatus: AccountStatus): Promise<UserResponseDto> {
    const updated = await this.repository.updateById(id, { accountStatus });
    if (!updated) {
      throw new NotFoundException('User not found.');
    }
    if (accountStatus !== 'Active') {
      await this.authSessionsService.revokeAllForUser(id);
    }
    return this.toResponse(updated);
  }

  /** Maps a full `User` document to its allowlist response shape — the
   *  controller boundary that must never let `authMethods` (or the raw
   *  document at all) escape (auth-security-audit-2026-09-05.md P0 #1). */
  toResponse(user: UserDocument): UserResponseDto {
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
    };
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
    return user ? this.toResponse(user) : null;
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

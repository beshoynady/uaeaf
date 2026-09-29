import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RolesRepository } from './roles.repository.js';
import { RoleAssignmentsRepository } from './role-assignments.repository.js';
import type { RoleDocument } from './schemas/role.schema.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import type { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import type { RequiredPermission } from '../../../common/decorators/permissions.decorator.js';
import { missingImpliedReads } from '../../../common/constants/permission-implications.js';
import { holdsPair, missingPairs, width } from '../users/user-authority.js';
import type { PermissionCatalogueEntry } from '../../../common/constants/permission-catalogue.js';
import { isSuperAdminOnly } from '../../../common/authz/capability-map.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import type { RequestContext } from '../../workflow/workflow-instances/workflow-instances.service.js';

/** Why an account lost a role on the rows `remove` writes. Its own value, not
 *  `reset-roles`'s, so an administrator reading the trail can tell a route an
 *  administrator took from a maintenance run over the whole collection. */
export const ROLE_ARCHIVE_DETACH_REASON = 'role-archived';

/** Implements: roles collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7869). */
@Injectable()
export class RolesService {
  constructor(
    private readonly repository: RolesRepository,
    private readonly permissionsService: PermissionsService,
    private readonly assignments: RoleAssignmentsRepository,
    // ADR-0107: this service writes its own audit rows. The interceptor cannot —
    // it records the role, and nothing on the route names the accounts that
    // lost it.
    private readonly auditLogs: AuditLogsService,
  ) {}

  /** @param actorPermissions the acting user's own resolved permission set
   *  (from their JWT, via @CurrentUser() at the controller) — required so
   *  a new role can never be created with a permission the creator doesn't
   *  already hold (auth-security-audit-2026-09-05.md P0 #2: this was the
   *  first step of a confirmed roles:Create + users:Update -> Super Admin
   *  escalation chain). */
  async create(dto: CreateRoleDto, actorPermissions: RequiredPermission[]): Promise<RoleDocument> {
    this.assertCoherent(await this.assertGrantable(dto.permissionIds, actorPermissions));
    return this.repository.create({
      name: dto.name,
      description: dto.description ?? null,
      permissionIds: dto.permissionIds.map((id) => new Types.ObjectId(id)),
    });
  }

  /**
   * Resolves a user's roleIds into the flattened {resourceType, action} set
   * PermissionsGuard compares against.
   *
   * This is the read that replaced the permission set formerly embedded in
   * the access token (owner decision 2026-09-07, superseding BE-PLAN-010
   * §4.4). It runs on every authenticated request, via JwtStrategy, which
   * is what makes a role edit take effect immediately rather than at the
   * end of the token's 15-minute life.
   *
   * Exactly two reads, whatever the user holds — one for the roles, one for
   * their permissions. The version this replaced issued one findById per
   * permission: 165 round trips for the Super Admin.
   *
   * Fails open to *nothing*, never to an error: a role or permission that
   * is missing or archived is simply absent from the batch, so it grants
   * nothing while the user's other roles keep working.
   */
  async resolvePermissions(roleIds: readonly string[]): Promise<RequiredPermission[]> {
    // Both short-circuits are stated here rather than left to the
    // repositories, so the "no reads at all" guarantee for a user with no
    // roles is a property of this method and is testable as one.
    if (roleIds.length === 0) {
      return [];
    }

    const roles = await this.repository.findByIds(roleIds);
    const permissionIds = [
      ...new Set(roles.flatMap((role) => role.permissionIds.map((id) => id.toString()))),
    ];
    if (permissionIds.length === 0) {
      return [];
    }

    const permissions = await this.permissionsService.findByIds(permissionIds);

    // Deduplicated on the pair, keeping the widest scope held — design spec
    // §2.4: a role holding the same pair at both `own` and `all` resolves to
    // `all`, one entry, not two. `width` is reused from `user-authority.ts`
    // rather than a second ordering written here: that file is the one place
    // scope ordering is defined (finding F7), and duplicating it is exactly
    // what F7 closed. Order of first appearance is kept for the pairs
    // themselves so the result stays stable and readable; only the scope
    // within a pair is chosen by width, not by which document came first.
    const order: string[] = [];
    const widest = new Map<string, RequiredPermission>();
    for (const permission of permissions) {
      const key = `${permission.resourceType}:${permission.action}`;
      const scope = permission.scope ?? null;
      const current = widest.get(key);
      if (!current) {
        order.push(key);
        widest.set(key, { resourceType: permission.resourceType, action: permission.action, scope });
      } else if (width(scope) > width(current.scope)) {
        widest.set(key, { resourceType: permission.resourceType, action: permission.action, scope });
      }
    }
    return order.map((key) => widest.get(key) as RequiredPermission);
  }

  /**
   * The deduplicated union of what a set of roles grants — what assigning them
   * would actually hand over.
   *
   * Thin over `resolvePermissions`, and named separately because the question is
   * different: that one answers "what may this signed-in caller do", this one
   * answers "what would this role give someone". Sharing the implementation is
   * the point — a second traversal is a second place for the two answers to
   * disagree, and ADR-0104's rule compares them directly.
   */
  async resolvePermissionsForRoles(roleIds: readonly string[]): Promise<RequiredPermission[]> {
    return this.resolvePermissions(roleIds);
  }

  /**
   * Whether this id names a seeded, RBAC-critical role.
   *
   * Reads through `findByIdIncludingArchived` for the same reason
   * `assertEditable` does: the soft-delete scope turns an archived role into
   * `null`, and a `null` here would read as "not a system role" — so an
   * archived Super Admin role would become assignable.
   */
  async isSystemRole(roleId: string): Promise<boolean> {
    const role = await this.repository.findByIdIncludingArchived(roleId);
    return role?.isSystemRole === true;
  }

  async findAll(): Promise<RoleDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<RoleDocument | null> {
    return this.repository.findById(id);
  }

  /** @throws NotFoundException when no live role has this id.
   *  @throws ForbiddenException when the target is a system role —
   *  RBAC-critical seeded roles cannot be renamed. */
  async rename(
    id: string,
    name: LocalizedTextDto,
    /** Omitted leaves the stored description untouched; `null` removes it.
     *  The two have to stay distinguishable — writing `undefined` into the
     *  update would clear a description the caller never mentioned. */
    description?: LocalizedTextDto | null,
  ): Promise<RoleDocument> {
    await this.assertEditable(id);
    const changes: Record<string, unknown> =
      description === undefined ? { name } : { name, description };
    const updated = await this.repository.updateById(id, changes);
    return this.assertUpdated(updated);
  }

  /** @param actorPermissions same "cannot grant what you don't hold" rule
   *  as create() above. Also now checks isSystemRole — the audit found this
   *  specific method was the one place isSystemRole wasn't enforced, so the
   *  seeded Super Admin role's own permissions could be rewritten by anyone
   *  with roles:Update (P0 #3). */
  async updatePermissions(
    id: string,
    permissionIds: Types.ObjectId[],
    actorPermissions: RequiredPermission[],
  ): Promise<RoleDocument> {
    await this.assertEditable(id);
    await this.assertRemovable(id, actorPermissions);
    this.assertCoherent(
      await this.assertGrantable(
        permissionIds.map((permissionId) => permissionId.toString()),
        actorPermissions,
      ),
    );
    const updated = await this.repository.updateById(id, { permissionIds });
    return this.assertUpdated(updated);
  }

  /**
   * Archives a role, removes it from everyone holding it, and records what
   * each account lost.
   *
   * The detach runs *after* the archive, never before: doing it first would
   * strip the role from every user and then leave the role live if the
   * archive did not land. Archiving alone already stops the role granting
   * anything, because permission resolution filters archived rows — the
   * detach exists so the reference stops appearing on accounts that no
   * screen can explain it on.
   *
   * One `Update` row per account the role was pulled from, in the shape
   * `reset-roles` writes so the two paths read alike: the row names the
   * ACCOUNT, since the role's own `Archive` row — written by
   * `AuditLogInterceptor` from the route's `@AuditEntity` — already names the
   * role and cannot name the holders. Without these rows an account could
   * lose a role with nothing in the trail saying so.
   *
   * @param context the request's `{ ipAddress, userAgent }`, from
   *   `extractRequestContext(req)` at the controller. Defaulted so callers
   *   with nothing to pass keep working; the rows below are its only readers.
   * @throws NotFoundException when no live role has this id.
   * @throws ForbiddenException when the target is a system role.
   */
  async remove(
    id: string,
    archivedBy: Types.ObjectId,
    actorPermissions: RequiredPermission[],
    context: RequestContext = {},
  ): Promise<RoleDocument> {
    await this.assertEditable(id);
    await this.assertRemovable(id, actorPermissions);

    const session = await this.repository.startSession();
    try {
      // One transaction for the whole route, not one per account as the
      // resumable `reset-roles` script uses: an HTTP request cannot be resumed,
      // so a partial result leaves nobody to finish it.
      return await session.withTransaction(async () => {
        const archived = this.assertUpdated(await this.repository.softDelete(id, archivedBy, session));
        const detachedFrom = await this.assignments.detachRole(id, session);
        for (const accountId of detachedFrom) {
          await this.auditLogs.write(
            {
              actorId: archivedBy,
              action: 'Update',
              entityType: 'users',
              entityId: accountId,
              previousValue: { roleId: id },
              newValue: null,
              reason: ROLE_ARCHIVE_DETACH_REASON,
              ipAddress: context.ipAddress ?? '',
              userAgent: context.userAgent ?? '',
            },
            session,
          );
        }
        return archived;
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * "You cannot take away authority you do not hold" — the other half of
   * ADR-0104 rule 1, and what makes rule 2 hold.
   *
   * Rule 2 refuses acting on an account stronger than you by comparing that
   * account's CURRENT grants. Without this, the comparison was trivially
   * defeated in two calls: shrink their role first through a route that only
   * checked what was being ADDED, then act on them now that they are weak. The
   * same gap let `DELETE /roles/:id` strip a role from every holder with no
   * comparison at all.
   *
   * It does not escalate the actor's own authority — rule 1 still bounds what
   * they may grant — but it hands them the power to disable anyone, and it
   * becomes an account-takeover step as soon as setup links and 2FA reset sit
   * behind the same guard.
   *
   * @throws ForbiddenException naming every pair the role grants that the actor
   *   does not hold.
   */
  private async assertRemovable(
    roleId: string,
    actorPermissions: RequiredPermission[],
  ): Promise<void> {
    const current = await this.resolvePermissions([roleId]);
    const beyond = missingPairs(actorPermissions, current);
    if (beyond.length > 0) {
      throw new ForbiddenException({
        code: 'ungrantableRole',
        message: 'This role grants more than you hold yourself, so you cannot change or remove it.',
        missing: beyond.map((pair) => `${pair.resourceType}:${pair.action}`),
      });
    }
  }

  /**
   * Every role id a user is about to be given must resolve to a live role.
   *
   * `@IsMongoId` on the DTO checks the shape and nothing else, so a
   * well-formed id for a role that never existed — or was archived — was
   * stored silently and simply granted nothing. Naming the offenders is what
   * makes that a fixable 400 rather than an assignment that appears to work.
   *
   * @throws BadRequestException listing every id that resolves to nothing.
   */
  async assertAssignable(roleIds: readonly string[]): Promise<void> {
    if (roleIds.length === 0) {
      // Removing every role from an account is a legitimate assignment and
      // needs no read at all.
      return;
    }

    const requested = [...new Set(roleIds)];
    const found = await this.repository.findByIds(requested);
    const live = new Set(found.map((role) => role._id.toString()));
    const missing = requested.filter((roleId) => !live.has(roleId));

    if (missing.length > 0) {
      throw new BadRequestException(
        `Unknown or archived role: ${missing.join(', ')}.`,
      );
    }
  }

  /**
   * Reads the role as it actually is — archived or not — and decides whether
   * it may be written to.
   *
   * Replaces `assertNotSystemRole`, which read through `findById`. That
   * method filters `archivedAt: null`, so an archived role came back `null`,
   * the system-role check passed vacuously, and the write went ahead against
   * a deleted record.
   */
  private async assertEditable(id: string): Promise<RoleDocument> {
    const role = await this.repository.findByIdIncludingArchived(id);
    if (!role || role.archivedAt !== null) {
      throw new NotFoundException('Role not found.');
    }
    if (role.isSystemRole) {
      throw new ForbiddenException({
        code: 'systemRole',
        message: 'System roles cannot be renamed or deleted.',
      });
    }
    return role;
  }

  /** Turns the driver's "matched nothing" into a 404. Without it these
   *  routes answered 200 with an empty body, telling the caller a change
   *  landed on a record that does not exist. */
  private assertUpdated(role: RoleDocument | null): RoleDocument {
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    return role;
  }

  /**
   * "You cannot grant a permission you don't already hold yourself" —
   * closes the escalation chain in auth-security-audit-2026-09-05.md §16:
   * without this, roles:Create + users:Update alone was enough to become
   * a de facto Super Admin. Fails closed on an unknown permissionId too
   * (nothing not proven grantable is ever grantable).
   *
   * Compares through `holdsPair` (review finding F7) rather than a second,
   * pair-only comparison of its own: `user-authority.ts` is now the one
   * place `assertGrantable`, `UsersService.assertNotStronger` and role
   * assignment all compare a grant, so a rule tightened in one cannot stay
   * loose in another. The permission document is passed straight to
   * `holdsPair` — it already carries `scope`, so an actor holding
   * `articles:Update` at `own` may not grant it at `all` even though the
   * pair matches.
   * @throws ForbiddenException naming the first ungrantable permission found.
   */
  private async assertGrantable(
    permissionIds: string[],
    actorPermissions: RequiredPermission[],
  ): Promise<PermissionCatalogueEntry[]> {
    const resolved: PermissionCatalogueEntry[] = [];
    for (const permissionId of permissionIds) {
      const permission = await this.permissionsService.findById(permissionId);
      if (!permission) {
        throw new ForbiddenException({
          code: 'ungrantablePermission',
          message: 'Cannot grant a permission you do not already hold yourself.',
        });
      }
      // Checked BEFORE the superset comparison below, and regardless of what
      // the actor holds — owner decision 4 / Q-A (2026-09-27) / 2026-09-28.
      // Account and role administration, and reading account data, are ten
      // declared pairs (eleven decided; see ADR-0104) the seeded Super Admin
      // role holds and no role built through this method may ever include,
      // even for an actor who already holds the whole catalogue: "this can
      // never be granted" is a stronger, simpler statement than "you do not
      // hold it".
      if (isSuperAdminOnly(permission.resourceType, permission.action)) {
        throw new ForbiddenException({
          code: 'ungrantableCapability',
          message: 'That capability is reserved to a Super Admin and cannot be granted to a role.',
        });
      }
      if (!holdsPair(actorPermissions, permission)) {
        throw new ForbiddenException({
          code: 'ungrantablePermission',
          message: 'Cannot grant a permission you do not already hold yourself.',
        });
      }
      // Returned rather than discarded: `assertCoherent` needs the same
      // pairs this loop already read, and re-reading them would double the
      // round trips for a rule that adds no information.
      resolved.push({ resourceType: permission.resourceType, action: permission.action });
    }
    return resolved;
  }

  /**
   * "Whoever may change a resource must be able to read it" — owner
   * decision 2026-09-08. See `missingImpliedReads` for why the rule is
   * silent on the thirteen resources that have no guarded read.
   *
   * A 400 and not a 403: the actor may well hold the missing read himself,
   * so nothing here is an authorization failure. The submitted permission
   * set is simply not a coherent role. `missing` carries the exact pairs
   * that would fix it — the dashboard ticks them rather than making an
   * administrator find them among 165 checkboxes.
   *
   * @throws BadRequestException naming every read the grant leaves out.
   */
  private assertCoherent(granted: readonly PermissionCatalogueEntry[]): void {
    const missing = missingImpliedReads(granted);
    if (missing.length === 0) {
      return;
    }
    throw new BadRequestException({
      code: 'impliedReadMissing',
      message: 'A role that may change a resource must also be able to read it.',
      missing: missing.map((entry) => `${entry.resourceType}:${entry.action}`),
    });
  }
}

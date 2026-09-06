import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { RolesRepository } from './roles.repository.js';
import type { RoleDocument } from './schemas/role.schema.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import type { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import type { RequiredPermission } from '../../../common/decorators/permissions.decorator.js';

/** Implements: roles collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7869). */
@Injectable()
export class RolesService {
  constructor(
    private readonly repository: RolesRepository,
    private readonly permissionsService: PermissionsService,
  ) {}

  /** @param actorPermissions the acting user's own resolved permission set
   *  (from their JWT, via @CurrentUser() at the controller) — required so
   *  a new role can never be created with a permission the creator doesn't
   *  already hold (auth-security-audit-2026-09-05.md P0 #2: this was the
   *  first step of a confirmed roles:Create + users:Update -> Super Admin
   *  escalation chain). */
  async create(dto: CreateRoleDto, actorPermissions: RequiredPermission[]): Promise<RoleDocument> {
    await this.assertGrantable(dto.permissionIds, actorPermissions);
    return this.repository.create({
      name: dto.name,
      permissionIds: dto.permissionIds.map((id) => new Types.ObjectId(id)),
    });
  }

  async findAll(): Promise<RoleDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<RoleDocument | null> {
    return this.repository.findById(id);
  }

  /** @throws ForbiddenException when the target role is a system role
   *  (isSystemRole=true) — RBAC-critical seeded roles cannot be renamed. */
  async rename(id: string, name: LocalizedTextDto): Promise<RoleDocument | null> {
    await this.assertNotSystemRole(id);
    return this.repository.updateById(id, { name });
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
  ): Promise<RoleDocument | null> {
    await this.assertNotSystemRole(id);
    await this.assertGrantable(
      permissionIds.map((permissionId) => permissionId.toString()),
      actorPermissions,
    );
    return this.repository.updateById(id, { permissionIds });
  }

  /** @throws ForbiddenException when the target role is a system role
   *  (isSystemRole=true) — RBAC-critical seeded roles cannot be deleted. */
  async remove(id: string, archivedBy: Types.ObjectId): Promise<RoleDocument | null> {
    await this.assertNotSystemRole(id);
    return this.repository.softDelete(id, archivedBy);
  }

  private async assertNotSystemRole(id: string): Promise<void> {
    const role = await this.repository.findById(id);
    if (role?.isSystemRole) {
      throw new ForbiddenException('System roles cannot be renamed or deleted.');
    }
  }

  /**
   * "You cannot grant a permission you don't already hold yourself" —
   * closes the escalation chain in auth-security-audit-2026-09-05.md §16:
   * without this, roles:Create + users:Update alone was enough to become
   * a de facto Super Admin. Fails closed on an unknown permissionId too
   * (nothing not proven grantable is ever grantable).
   * @throws ForbiddenException naming the first ungrantable permission found.
   */
  private async assertGrantable(
    permissionIds: string[],
    actorPermissions: RequiredPermission[],
  ): Promise<void> {
    for (const permissionId of permissionIds) {
      const permission = await this.permissionsService.findById(permissionId);
      const alreadyHeld =
        permission != null &&
        actorPermissions.some(
          (held) => held.resourceType === permission.resourceType && held.action === permission.action,
        );
      if (!alreadyHeld) {
        throw new ForbiddenException(
          'Cannot grant a permission you do not already hold yourself.',
        );
      }
    }
  }
}

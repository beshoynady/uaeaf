import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { RolesRepository } from './roles.repository.js';
import type { RoleDocument } from './schemas/role.schema.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import type { LocalizedTextDto } from '../../common/dto/localized-text.dto.js';

/** Implements: roles collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7869). */
@Injectable()
export class RolesService {
  constructor(private readonly repository: RolesRepository) {}

  async create(dto: CreateRoleDto): Promise<RoleDocument> {
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

  async updatePermissions(id: string, permissionIds: Types.ObjectId[]): Promise<RoleDocument | null> {
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
}

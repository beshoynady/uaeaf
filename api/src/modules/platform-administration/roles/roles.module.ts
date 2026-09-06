import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema.js';
import { RolesRepository } from './roles.repository.js';
import { RolesService } from './roles.service.js';
import { RolesController } from './roles.controller.js';
// PermissionsService is needed by RolesService to resolve a permissionId to
// its {resourceType, action} pair when checking "can the actor grant this?"
// (auth-security-audit-2026-09-05.md P0 #2) — one-directional import,
// PermissionsModule never depends back on RolesModule, so no cycle.
import { PermissionsModule } from '../permissions/permissions.module.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]), PermissionsModule],
  controllers: [RolesController],
  providers: [RolesRepository, RolesService],
  exports: [RolesService],
})
export class RolesModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema.js';
import { RolesRepository } from './roles.repository.js';
import { RoleAssignmentsRepository } from './role-assignments.repository.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { RolesService } from './roles.service.js';
import { RolesController } from './roles.controller.js';
// PermissionsService is needed by RolesService to resolve a permissionId to
// its {resourceType, action} pair when checking "can the actor grant this?"
// (auth-security-audit-2026-09-05.md P0 #2) — one-directional import,
// PermissionsModule never depends back on RolesModule, so no cycle.
import { PermissionsModule } from '../permissions/permissions.module.js';

@Module({
  imports: [
    // The `User` model is bound here, rather than UsersModule being
    // imported, for exactly one write: clearing an archived role off the
    // accounts that held it. UsersModule imports RolesModule (to validate
    // role ids on assignment), so importing it back would make the pair
    // mutually dependent and force forwardRef through both.
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
    ]),
    PermissionsModule,
  ],
  controllers: [RolesController],
  providers: [RolesRepository, RoleAssignmentsRepository, RolesService],
  exports: [RolesService],
})
export class RolesModule {}

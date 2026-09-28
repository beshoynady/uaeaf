import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { RolesModule } from '../roles/roles.module.js';
import { AuthSessionsModule } from '../auth-sessions/auth-sessions.module.js';
import { FederationPersonnelsModule } from '../../federation-governance/federation-personnel/federation-personnel.module.js';
import { AuditLogsModule } from '../../workflow/audit-logs/audit-logs.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    // Role assignment validates its ids against the roles collection, and a
    // status change away from Active ends the account's live sessions.
    RolesModule,
    AuthSessionsModule,
    // Verifying an optional personId at creation. One-directional: nothing
    // under federation-governance imports this module back.
    FederationPersonnelsModule,
    // Appointing or revoking the Super Admin role writes its own security
    // event (owner decision 2026-09-27) — see UsersService.assignRoles.
    AuditLogsModule,
  ],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}

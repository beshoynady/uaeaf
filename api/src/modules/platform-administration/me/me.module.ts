import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module.js';
import { MeController } from './me.controller.js';

/** The caller's own account. Reads `request.user` and asks `RolesService` only whether a role is a system role. */
@Module({
  imports: [RolesModule],
  controllers: [MeController],
})
export class MeModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module.js';
import { RolesModule } from '../roles/roles.module.js';
import { PermissionsModule } from '../permissions/permissions.module.js';
import { AuthSessionsModule } from '../auth-sessions/auth-sessions.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    UsersModule,
    RolesModule,
    PermissionsModule,
    // Session/revocation layer (auth-security-audit-2026-09-05.md P0 #4) —
    // logout/logout-all and refresh-token rotation both live in AuthService,
    // this just supplies the persisted AuthSession record they act on.
    AuthSessionsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // No default secret/signOptions here: AuthService always passes an
    // explicit secret + expiresIn per call (access vs. refresh need
    // different lifetimes, BE-PLAN-010 §4.3), so a module-level default
    // would only be dead configuration.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}

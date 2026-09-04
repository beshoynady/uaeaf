import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../platform-administration/users/users.module.js';
import { RolesModule } from '../platform-administration/roles/roles.module.js';
import { PermissionsModule } from '../platform-administration/permissions/permissions.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    UsersModule,
    RolesModule,
    PermissionsModule,
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

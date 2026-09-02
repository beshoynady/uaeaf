import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
import { jwtConfig } from './config/jwt.config.js';
import { validationSchema } from './config/validation.schema.js';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { PermissionsModule } from './modules/permissions/permissions.module.js';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { WorkflowDefinitionsModule } from './modules/workflow-definitions/workflow-definitions.module.js';
import { WorkflowStepsModule } from './modules/workflow-steps/workflow-steps.module.js';
import { WorkflowInstancesModule } from './modules/workflow-instances/workflow-instances.module.js';
import { WorkflowActionHistoryModule } from './modules/workflow-action-history/workflow-action-history.module.js';
import { RevisionsModule } from './modules/revisions/revisions.module.js';
import { PublicationsModule } from './modules/publications/publications.module.js';
import { WorkflowPoliciesModule } from './modules/workflow-policies/workflow-policies.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validationSchema,
    }),
    DatabaseModule,
    AuditLogsModule,
    PermissionsModule,
    RolesModule,
    UsersModule,
    AuthModule,
    WorkflowDefinitionsModule,
    WorkflowStepsModule,
    RevisionsModule,
    PublicationsModule,
    WorkflowActionHistoryModule,
    WorkflowInstancesModule,
    WorkflowPoliciesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    // JwtAuthGuard runs first (populates request.user), then PermissionsGuard
    // reads it — order here is the execution order.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}

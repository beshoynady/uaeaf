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
import { CountriesModule } from './modules/countries/countries.module.js';
import { AgeCategoriesModule } from './modules/age-categories/age-categories.module.js';
import { DisciplinesModule } from './modules/disciplines/disciplines.module.js';
import { VenuesModule } from './modules/venues/venues.module.js';
import { MediaAssetsModule } from './modules/media-assets/media-assets.module.js';
import { ClubsModule } from './modules/clubs/clubs.module.js';
import { AthletesModule } from './modules/athletes/athletes.module.js';
import { CoachesModule } from './modules/coaches/coaches.module.js';
import { OfficialsModule } from './modules/officials/officials.module.js';
import { AthleteProfilesModule } from './modules/athlete-profiles/athlete-profiles.module.js';
import { OfficialProfilesModule } from './modules/official-profiles/official-profiles.module.js';
import { AthleteClubHistoryModule } from './modules/athlete-club-history/athlete-club-history.module.js';
import { CoachClubHistoryModule } from './modules/coach-club-history/coach-club-history.module.js';
import { OfficialClubHistoryModule } from './modules/official-club-history/official-club-history.module.js';
import { AthleteCoachHistoryModule } from './modules/athlete-coach-history/athlete-coach-history.module.js';
import { AthleteNationalTeamHistoryModule } from './modules/athlete-national-team-history/athlete-national-team-history.module.js';
import { OfficialAssignmentsModule } from './modules/official-assignments/official-assignments.module.js';
import { ClubTeamsModule } from './modules/club-teams/club-teams.module.js';
import { AthleteGuardianRelationshipsModule } from './modules/athlete-guardian-relationships/athlete-guardian-relationships.module.js';
import { AlbumsModule } from './modules/albums/albums.module.js';
import { VideosModule } from './modules/videos/videos.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
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
    CountriesModule,
    AgeCategoriesModule,
    DisciplinesModule,
    VenuesModule,
    MediaAssetsModule,
    ClubsModule,
    AthletesModule,
    CoachesModule,
    OfficialsModule,
    AthleteProfilesModule,
    OfficialProfilesModule,
    AthleteClubHistoryModule,
    CoachClubHistoryModule,
    OfficialClubHistoryModule,
    AthleteCoachHistoryModule,
    AthleteNationalTeamHistoryModule,
    OfficialAssignmentsModule,
    ClubTeamsModule,
    AthleteGuardianRelationshipsModule,
    AlbumsModule,
    VideosModule,
    DocumentsModule,
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

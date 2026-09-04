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
import { FederationsModule } from './modules/federation/federation.module.js';
import { ElectionCyclesModule } from './modules/election-cycles/election-cycles.module.js';
import { FederationPersonnelsModule } from './modules/federation-personnel/federation-personnel.module.js';
import { FederationAppointmentsModule } from './modules/federation-appointments/federation-appointments.module.js';
import { CommitteesModule } from './modules/committees/committees.module.js';
import { OrganizationalStructureNodesModule } from './modules/organizational-structure/organizational-structure.module.js';
import { GovernanceDocumentsModule } from './modules/governance-documents/governance-documents.module.js';
import { VisionMissionPagesModule } from './modules/vision-mission-page/vision-mission-page.module.js';
import { StrategicPlansPagesModule } from './modules/strategic-plans-page/strategic-plans-page.module.js';
import { AboutFederationPagesModule } from './modules/about-federation-page/about-federation-page.module.js';
import { PresidentMessagePagesModule } from './modules/president-message-page/president-message-page.module.js';
import { CommitteesPagesModule } from './modules/committees-page/committees-page.module.js';
import { BoardMembersPageModule } from './modules/board-members-page/board-members-page.module.js';
import { ContactUsPagesModule } from './modules/contact-us-page/contact-us-page.module.js';
import { SiteSettingsModule } from './modules/site-settings/site-settings.module.js';
import { NavigationMenusModule } from './modules/navigation-menus/navigation-menus.module.js';
import { NavigationItemsModule } from './modules/navigation-items/navigation-items.module.js';
import { PagesModule } from './modules/pages/pages.module.js';
import { PageSectionsModule } from './modules/page-sections/page-sections.module.js';
import { HeroSlidesModule } from './modules/hero-slides/hero-slides.module.js';
import { AthletesPageModule } from './modules/athletes-page/athletes-page.module.js';
import { CoachesPageModule } from './modules/coaches-page/coaches-page.module.js';
import { ResultsRankingsPageModule } from './modules/results-rankings-page/results-rankings-page.module.js';
import { RecordsPageModule } from './modules/records-page/records-page.module.js';
import { NewsPageModule } from './modules/news-page/news-page.module.js';
import { ClubsPageModule } from './modules/clubs-page/clubs-page.module.js';
import { DisciplinesPageModule } from './modules/disciplines-page/disciplines-page.module.js';
import { ContactMessagesModule } from './modules/contact-messages/contact-messages.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { RateLimitGuard } from './common/guards/rate-limit.guard.js';
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
    // Week 4 — Domain 1 Federation & Governance
    FederationsModule,
    ElectionCyclesModule,
    FederationPersonnelsModule,
    FederationAppointmentsModule,
    CommitteesModule,
    OrganizationalStructureNodesModule,
    GovernanceDocumentsModule,
    VisionMissionPagesModule,
    StrategicPlansPagesModule,
    AboutFederationPagesModule,
    PresidentMessagePagesModule,
    CommitteesPagesModule,
    BoardMembersPageModule,
    ContactUsPagesModule,
    // Week 4 — Domain 11 CMS & Page Composition
    SiteSettingsModule,
    NavigationMenusModule,
    NavigationItemsModule,
    PagesModule,
    PageSectionsModule,
    HeroSlidesModule,
    AthletesPageModule,
    CoachesPageModule,
    ResultsRankingsPageModule,
    RecordsPageModule,
    NewsPageModule,
    ClubsPageModule,
    DisciplinesPageModule,
    // Week 4 — Domain 10 Public Communication
    ContactMessagesModule,
  ],
  controllers: [AppController],
  providers: [
    // RateLimitGuard runs first — reject abusive traffic as cheaply as
    // possible, before JWT verification work. JwtAuthGuard then populates
    // request.user, and PermissionsGuard reads it — order here is the
    // execution order (schema-audit-2026-09-04.md §3.7/§6.7, P1 finding).
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}

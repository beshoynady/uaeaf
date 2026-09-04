import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
import { jwtConfig } from './config/jwt.config.js';
import { validationSchema } from './config/validation.schema.js';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './modules/platform-administration/users/users.module.js';
import { RolesModule } from './modules/platform-administration/roles/roles.module.js';
import { PermissionsModule } from './modules/platform-administration/permissions/permissions.module.js';
import { AuditLogsModule } from './modules/workflow/audit-logs/audit-logs.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { WorkflowDefinitionsModule } from './modules/workflow/workflow-definitions/workflow-definitions.module.js';
import { WorkflowStepsModule } from './modules/workflow/workflow-steps/workflow-steps.module.js';
import { WorkflowInstancesModule } from './modules/workflow/workflow-instances/workflow-instances.module.js';
import { WorkflowActionHistoryModule } from './modules/workflow/workflow-action-history/workflow-action-history.module.js';
import { RevisionsModule } from './modules/workflow/revisions/revisions.module.js';
import { PublicationsModule } from './modules/workflow/publications/publications.module.js';
import { WorkflowPoliciesModule } from './modules/workflow/workflow-policies/workflow-policies.module.js';
import { NotificationsModule } from './modules/workflow/notifications/notifications.module.js';
import { CountriesModule } from './modules/people-organizations/countries/countries.module.js';
import { AgeCategoriesModule } from './modules/athletics/age-categories/age-categories.module.js';
import { DisciplinesModule } from './modules/athletics/disciplines/disciplines.module.js';
import { VenuesModule } from './modules/people-organizations/venues/venues.module.js';
import { MediaAssetsModule } from './modules/media-center/media-assets/media-assets.module.js';
import { ClubsModule } from './modules/people-organizations/clubs/clubs.module.js';
import { AthletesModule } from './modules/people-organizations/athletes/athletes.module.js';
import { CoachesModule } from './modules/people-organizations/coaches/coaches.module.js';
import { OfficialsModule } from './modules/people-organizations/officials/officials.module.js';
import { AthleteProfilesModule } from './modules/people-organizations/athlete-profiles/athlete-profiles.module.js';
import { OfficialProfilesModule } from './modules/people-organizations/official-profiles/official-profiles.module.js';
import { AthleteClubHistoryModule } from './modules/people-organizations/athlete-club-history/athlete-club-history.module.js';
import { CoachClubHistoryModule } from './modules/people-organizations/coach-club-history/coach-club-history.module.js';
import { OfficialClubHistoryModule } from './modules/people-organizations/official-club-history/official-club-history.module.js';
import { AthleteCoachHistoryModule } from './modules/people-organizations/athlete-coach-history/athlete-coach-history.module.js';
import { AthleteNationalTeamHistoryModule } from './modules/people-organizations/athlete-national-team-history/athlete-national-team-history.module.js';
import { OfficialAssignmentsModule } from './modules/people-organizations/official-assignments/official-assignments.module.js';
import { ClubTeamsModule } from './modules/people-organizations/club-teams/club-teams.module.js';
import { AthleteGuardianRelationshipsModule } from './modules/people-organizations/athlete-guardian-relationships/athlete-guardian-relationships.module.js';
import { AlbumsModule } from './modules/media-center/albums/albums.module.js';
import { VideosModule } from './modules/media-center/videos/videos.module.js';
import { DocumentsModule } from './modules/documents/documents/documents.module.js';
import { FederationsModule } from './modules/federation-governance/federation/federation.module.js';
import { ElectionCyclesModule } from './modules/federation-governance/election-cycles/election-cycles.module.js';
import { FederationPersonnelsModule } from './modules/federation-governance/federation-personnel/federation-personnel.module.js';
import { FederationAppointmentsModule } from './modules/federation-governance/federation-appointments/federation-appointments.module.js';
import { CommitteesModule } from './modules/federation-governance/committees/committees.module.js';
import { OrganizationalStructureNodesModule } from './modules/federation-governance/organizational-structure/organizational-structure.module.js';
import { GovernanceDocumentsModule } from './modules/federation-governance/governance-documents/governance-documents.module.js';
import { VisionMissionPagesModule } from './modules/federation-governance/vision-mission-page/vision-mission-page.module.js';
import { StrategicPlansPagesModule } from './modules/federation-governance/strategic-plans-page/strategic-plans-page.module.js';
import { AboutFederationPagesModule } from './modules/federation-governance/about-federation-page/about-federation-page.module.js';
import { PresidentMessagePagesModule } from './modules/federation-governance/president-message-page/president-message-page.module.js';
import { CommitteesPagesModule } from './modules/federation-governance/committees-page/committees-page.module.js';
import { BoardMembersPageModule } from './modules/federation-governance/board-members-page/board-members-page.module.js';
import { ContactUsPagesModule } from './modules/federation-governance/contact-us-page/contact-us-page.module.js';
import { SiteSettingsModule } from './modules/cms-page-composition/site-settings/site-settings.module.js';
import { NavigationMenusModule } from './modules/cms-page-composition/navigation-menus/navigation-menus.module.js';
import { NavigationItemsModule } from './modules/cms-page-composition/navigation-items/navigation-items.module.js';
import { PagesModule } from './modules/cms-page-composition/pages/pages.module.js';
import { PageSectionsModule } from './modules/cms-page-composition/page-sections/page-sections.module.js';
import { HeroSlidesModule } from './modules/cms-page-composition/hero-slides/hero-slides.module.js';
import { AthletesPageModule } from './modules/cms-page-composition/athletes-page/athletes-page.module.js';
import { CoachesPageModule } from './modules/cms-page-composition/coaches-page/coaches-page.module.js';
import { ResultsRankingsPageModule } from './modules/cms-page-composition/results-rankings-page/results-rankings-page.module.js';
import { RecordsPageModule } from './modules/cms-page-composition/records-page/records-page.module.js';
import { NewsPageModule } from './modules/cms-page-composition/news-page/news-page.module.js';
import { ClubsPageModule } from './modules/cms-page-composition/clubs-page/clubs-page.module.js';
import { DisciplinesPageModule } from './modules/cms-page-composition/disciplines-page/disciplines-page.module.js';
import { AlbumsPageModule } from './modules/media-center/albums-page/albums-page.module.js';
import { VideosPageModule } from './modules/media-center/videos-page/videos-page.module.js';
import { ContactMessagesModule } from './modules/public-communication/contact-messages/contact-messages.module.js';
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
    AlbumsPageModule,
    VideosPageModule,
    // Week 4 — Domain 10 Public Communication
    ContactMessagesModule,
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

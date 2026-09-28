/** Every resource an RBAC permission may gate.
 *
 *  Derived 2026-09-07 by extracting the exact `resourceType` argument of all
 *  `@RequirePermission()` usages in `src/` — this list is a record of what
 *  the codebase actually guards, not an aspirational catalogue.
 *
 *  Why this exists: `permissions.resourceType` was a free-form `String` and
 *  `@RequirePermission()`'s first parameter was a plain `string`, with
 *  nothing connecting them. A permission row created for `"albumss"` saved
 *  successfully and then silently matched no route, forever — a permission
 *  that appears granted in the dashboard but grants nothing. Typing both
 *  ends against this list turns that class of mistake into a compile error
 *  (decorator side) and a 400 (API side).
 *
 *  Adding a resource: add the module's guarded routes first, then add the
 *  name here. A name with no guarded route is dead configuration. */
export const PERMISSION_RESOURCES = [
  'aboutFederationPage',
  'ageCategories',
  'albums',
  'albumsPage',
  'articles',
  'auditLogs',
  'athleteClubHistory',
  'athleteCoachHistory',
  'athleteGuardianRelationships',
  'athleteNationalTeamHistory',
  'athleteProfiles',
  'athletes',
  'athletesPage',
  'boardMembersPage',
  'clubTeams',
  'clubs',
  'clubsPage',
  'coachClubHistory',
  'coaches',
  'coachesPage',
  'committees',
  'committeesPage',
  'contactMessages',
  'contactUsPage',
  'countries',
  'disciplines',
  'disciplinesPage',
  'documents',
  'electionCycles',
  'federation',
  'federationAppointments',
  'federationPersonnel',
  'governanceDocuments',
  'heroSlides',
  'mediaAssets',
  'memberships',
  'navigationItems',
  'navigationMenus',
  'newsPage',
  'notifications',
  'officialAssignments',
  'officialClubHistory',
  'officialProfiles',
  'officials',
  'organizationalStructure',
  'pageSections',
  'pages',
  'partnerships',
  'permissions',
  'presidentMessagePage',
  'publications',
  'recordsPage',
  'resultsRankingsPage',
  'revisions',
  'roles',
  'siteSettings',
  'sponsors',
  'sponsorships',
  'strategicPlansPage',
  'users',
  'venues',
  'videos',
  'videosPage',
  'visionMissionPage',
  'workflowActionHistory',
  'workflowDefinitions',
  'workflowInstances',
  'workflowPolicies',
  'workflowSteps',
  // The group report resources (ADR-0103 D1). `ViewReports` is held per product
  // group rather than per resource, and the guard compares a flat pair — so
  // rather than teach it a second shape, each group is a resource carrying that
  // verb. The groups are not invented here: they are the ten domains already
  // derived mechanically in `apps/dashboard/src/lib/admin/resource-domains.ts`,
  // so the reports grouping and the role screen's grouping cannot drift apart.
  //
  // NINE, not ten. Users & Access is excluded from reports entirely (owner
  // decision 2026-09-27): the users list carries staff email addresses, reading
  // it is Super-Admin-only, and there is no aggregate of it anyone else needs.
  // That exclusion is also what keeps `users:Export` a per-resource pair.
  'governanceReports',
  'peopleReports',
  'athleticsReports',
  'mediaReports',
  'documentsReports',
  'workflowReports',
  'sponsorshipReports',
  'commsReports',
  'cmsReports',
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

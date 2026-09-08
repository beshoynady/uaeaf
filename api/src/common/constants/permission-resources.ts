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
  'permissions',
  'presidentMessagePage',
  'publications',
  'recordsPage',
  'resultsRankingsPage',
  'revisions',
  'roles',
  'siteSettings',
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
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

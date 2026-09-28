import type { PermissionResource } from '../constants/permission-resources.js';
import type { PermissionAction } from '../../modules/platform-administration/permissions/schemas/permission.schema.js';

/**
 * What each resource can be asked to do — the one declaration everything else
 * derives from (ADR-0103).
 *
 * `PERMISSION_CATALOGUE` is generated from this file rather than maintained
 * beside it, so the two cannot disagree. Before it existed, 215 pairs were kept
 * by hand and nothing declared what a resource *should* be able to do: thirty
 * resources ended up with `Create` and `Archive` and no `Update`, and four
 * workflow-governed types could be approved and never published.
 *
 * Three of the columns are human judgement and carry the decision that set them:
 *
 *  - `purgeable` — Chapter 17 §3/§4. TWO resources (owner decision 2026-09-27):
 *    `mediaAssets`, because a withdrawn image must actually leave the storage
 *    provider, and `contactMessages`, because a citizen's own submission is
 *    plainly within a PDPL erasure right. A third needs the owner's approval.
 *  - `sensitiveFields` — the existing `[RESTRICTED]` / `[SENSITIVE-MINOR]`
 *    markers in the schemas, classified by Chapter 17 §1. Nothing is newly
 *    declared sensitive.
 *  - `scopes` — A5: editorial content only.
 *
 * `superAdminOnly` names the pairs **no role may hold at all** (ADR-0104 as
 * amended, and Q-A): account administration, and reading account data. The
 * seeded Super Admin role still holds them — what is refused is granting them.
 */
export type ProductGroup =
  | 'federation-governance'
  | 'people-organizations'
  | 'athletics'
  | 'media-center'
  | 'documents'
  | 'workflow'
  | 'platform-administration'
  | 'sponsorship-relations'
  | 'public-communication'
  | 'cms-page-composition';

/** Chapter 17 §1's three-tier classification, minus `Public` — a field listed
 *  here is by definition not public. */
export type SensitivityClass = 'Restricted' | 'SensitiveMinor';

export interface ResourceCapability {
  resourceType: PermissionResource;
  group: ProductGroup;
  actions: readonly PermissionAction[];
  /** `PermanentDelete` is offered only where this is true. */
  purgeable: boolean;
  /** Verbs no role may be granted, however wide the grantor's own authority. */
  superAdminOnly: readonly PermissionAction[];
  sensitiveFields: readonly { path: string; class: SensitivityClass }[];
  scopes: readonly ('own' | 'all')[];
  /** The verb that reads this resource, when it is not `Read` — absent means
   *  `Read`. `permission-implications.ts` derives "whoever may change a
   *  resource must be able to read it" from this rather than the literal
   *  string `Read`, so a resource whose read has its own name (today, only
   *  `auditLogs`) is still covered by the rule instead of silently excepted
   *  from it (owner decision 2026-09-27, closing a gap `ViewAuditLog`
   *  opened). */
  readVerb?: PermissionAction;
}

export const CAPABILITY_MAP: readonly ResourceCapability[] = [
  // `Create` is absent rather than forgotten: the About page is one row, put
  // there by the seed and edited from then on, so no route creates one and a
  // `Create` grant would gate nothing.
  //
  // `Publish` gates the switch that takes the page on and off the site as well
  // as publishing it: deciding what the public sees is a publishing decision,
  // not an editing one.
  {
    resourceType: 'aboutFederationPage',
    group: 'federation-governance',
    actions: ['Read', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'ageCategories',
    group: 'athletics',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'albums',
    group: 'media-center',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: ['own', 'all'],
  },
  // `Publish` gates the switch that takes a landing page on and off the site
  // (ADR-0102 §D2), and gates nothing else on the twelve `*Page` resources:
  // they carry no review cycle, so there is no other publishing act to hold.
  {
    resourceType: 'albumsPage',
    group: 'media-center',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'articles',
    group: 'public-communication',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: ['own', 'all'],
  },
  {
    resourceType: 'athleteClubHistory',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'athleteCoachHistory',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'athleteGuardianRelationships',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [{ path: 'guardianContact', class: 'Restricted' }],
    scopes: [],
  },
  {
    resourceType: 'athleteNationalTeamHistory',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'athleteProfiles',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [{ path: 'restricted', class: 'SensitiveMinor' }],
    scopes: [],
  },
  {
    resourceType: 'athletes',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Export'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [{ path: 'dateOfBirth', class: 'SensitiveMinor' }, { path: 'residencyType', class: 'Restricted' }],
    scopes: [],
  },
  {
    resourceType: 'athletesPage',
    group: 'cms-page-composition',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'auditLogs',
    group: 'workflow',
    // `ViewAuditLog` rather than `Read` (owner decision 2026-09-27: the verb is
    // grantable by decision). Reading the audit log is not the same act as
    // reading a record, and holding one should never imply the other — so the
    // log has its own verb rather than sharing the one every resource has.
    actions: ['ViewAuditLog', 'Export'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
    // Otherwise `missingImpliedReads` would key on the literal `Read`, find no
    // such pair here, and let `auditLogs:Export` through ungoverned — a role
    // could hold the CSV without the screen it exports from.
    readVerb: 'ViewAuditLog',
  },
  {
    resourceType: 'boardMembersPage',
    group: 'federation-governance',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'clubTeams',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'clubs',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Export'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'clubsPage',
    group: 'cms-page-composition',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'coachClubHistory',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'coaches',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'coachesPage',
    group: 'cms-page-composition',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'committees',
    group: 'federation-governance',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'committeesPage',
    group: 'federation-governance',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'contactMessages',
    group: 'public-communication',
    actions: ['Read', 'Update', 'Archive', 'Restore', 'PermanentDelete', 'Export'],
    purgeable: true,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'contactUsPage',
    group: 'federation-governance',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'countries',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'disciplines',
    group: 'athletics',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'disciplinesPage',
    group: 'cms-page-composition',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'documents',
    group: 'documents',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'electionCycles',
    group: 'federation-governance',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'federation',
    group: 'federation-governance',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'federationAppointments',
    group: 'federation-governance',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'federationPersonnel',
    group: 'federation-governance',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [{ path: 'internalContact', class: 'Restricted' }],
    scopes: [],
  },
  {
    resourceType: 'governanceDocuments',
    group: 'federation-governance',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'heroSlides',
    group: 'cms-page-composition',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: ['own', 'all'],
  },
  {
    resourceType: 'mediaAssets',
    group: 'media-center',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'PermanentDelete'],
    purgeable: true,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'memberships',
    group: 'sponsorship-relations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'navigationItems',
    group: 'cms-page-composition',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'navigationMenus',
    group: 'cms-page-composition',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'newsPage',
    group: 'cms-page-composition',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'notifications',
    group: 'workflow',
    actions: ['Create'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'officialAssignments',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'officialClubHistory',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'officialProfiles',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'officials',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [{ path: 'residencyType', class: 'Restricted' }],
    scopes: [],
  },
  {
    resourceType: 'organizationalStructure',
    group: 'federation-governance',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'pageSections',
    group: 'cms-page-composition',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'pages',
    group: 'cms-page-composition',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'partnerships',
    group: 'sponsorship-relations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'permissions',
    group: 'platform-administration',
    actions: ['Read'],
    purgeable: false,
    superAdminOnly: ['Read'],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'presidentMessagePage',
    group: 'federation-governance',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'publications',
    group: 'workflow',
    actions: ['Read', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'recordsPage',
    group: 'cms-page-composition',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'resultsRankingsPage',
    group: 'cms-page-composition',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'revisions',
    group: 'workflow',
    actions: ['Read', 'Create'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'roles',
    group: 'platform-administration',
    actions: ['Read', 'ManageRoles'],
    purgeable: false,
    superAdminOnly: ['ManageRoles', 'Read'],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'siteSettings',
    group: 'cms-page-composition',
    actions: ['Read', 'Update'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [{ path: 'googleAnalyticsId', class: 'Restricted' }, { path: 'metaPixelId', class: 'Restricted' }, { path: 'isMaintenanceMode', class: 'Restricted' }, { path: 'systemEmailSender', class: 'Restricted' }],
    scopes: [],
  },
  {
    resourceType: 'sponsors',
    group: 'sponsorship-relations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'sponsorships',
    group: 'sponsorship-relations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'strategicPlansPage',
    group: 'federation-governance',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  // Archiving or restoring an account is account administration, reserved to
  // Super Admin like the account's other administrative verbs. See ADR-0104.
  {
    resourceType: 'users',
    group: 'platform-administration',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'AssignRoles', 'Export'],
    purgeable: false,
    superAdminOnly: ['Create', 'Update', 'AssignRoles', 'Read', 'Export', 'Archive', 'Restore'],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'venues',
    group: 'people-organizations',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  // `Update` is also how a video is PUBLISHED, since the API creates every one
  // as a draft, and it carries the three live-stream routes, whose permissions
  // ride on this subject rather than a second one.
  {
    resourceType: 'videos',
    group: 'media-center',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: ['own', 'all'],
  },
  {
    resourceType: 'videosPage',
    group: 'media-center',
    actions: ['Update', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'visionMissionPage',
    group: 'federation-governance',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore', 'Publish'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'workflowActionHistory',
    group: 'workflow',
    actions: ['Read'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'workflowDefinitions',
    group: 'workflow',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'workflowInstances',
    group: 'workflow',
    // `Approve` lives here and nowhere else. A per-entity `<entityType>:Approve`
    // was tried and abandoned (see `publishing.service.ts`): no route guarded it,
    // so the catalogue refused to seed it, so it could not be granted — and
    // `canApprove` was therefore false for every reader of every type, silently.
    // The three review routes enforce this pair, so this is the one that exists.
    actions: ['Read', 'Create', 'Update', 'Approve'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'workflowPolicies',
    group: 'workflow',
    actions: ['Read', 'Create', 'Update'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  {
    resourceType: 'workflowSteps',
    group: 'workflow',
    actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
  },
  // The group report resources. NINE, not ten: Q-A excludes Users & Access from
  // reports entirely, which is also what keeps `users:Export` a per-resource
  // pair rather than a group one.
  {
    resourceType: 'governanceReports',
    group: 'federation-governance',
    actions: ['ViewReports', 'Export', 'Print'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
    // Without this, `readVerbFor` answered the default `'Read'` — which none
    // of the nine `*Reports` resources declares — so `missingImpliedReads`
    // was silently exempt for all nine: a role could hold `Export`/`Print`
    // (the report CSV) without `ViewReports` (the screen it exports from).
    // Independent review, round 4 (I5): the same incoherence `ViewAuditLog`
    // was given a `readVerb` to close, reproduced nine times over.
    readVerb: 'ViewReports',
  },
  {
    resourceType: 'peopleReports',
    group: 'people-organizations',
    actions: ['ViewReports', 'Export', 'Print'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
    // Without this, `readVerbFor` answered the default `'Read'` — which none
    // of the nine `*Reports` resources declares — so `missingImpliedReads`
    // was silently exempt for all nine: a role could hold `Export`/`Print`
    // (the report CSV) without `ViewReports` (the screen it exports from).
    // Independent review, round 4 (I5): the same incoherence `ViewAuditLog`
    // was given a `readVerb` to close, reproduced nine times over.
    readVerb: 'ViewReports',
  },
  {
    resourceType: 'athleticsReports',
    group: 'athletics',
    actions: ['ViewReports', 'Export', 'Print'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
    // Without this, `readVerbFor` answered the default `'Read'` — which none
    // of the nine `*Reports` resources declares — so `missingImpliedReads`
    // was silently exempt for all nine: a role could hold `Export`/`Print`
    // (the report CSV) without `ViewReports` (the screen it exports from).
    // Independent review, round 4 (I5): the same incoherence `ViewAuditLog`
    // was given a `readVerb` to close, reproduced nine times over.
    readVerb: 'ViewReports',
  },
  {
    resourceType: 'mediaReports',
    group: 'media-center',
    actions: ['ViewReports', 'Export', 'Print'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
    // Without this, `readVerbFor` answered the default `'Read'` — which none
    // of the nine `*Reports` resources declares — so `missingImpliedReads`
    // was silently exempt for all nine: a role could hold `Export`/`Print`
    // (the report CSV) without `ViewReports` (the screen it exports from).
    // Independent review, round 4 (I5): the same incoherence `ViewAuditLog`
    // was given a `readVerb` to close, reproduced nine times over.
    readVerb: 'ViewReports',
  },
  {
    resourceType: 'documentsReports',
    group: 'documents',
    actions: ['ViewReports', 'Export', 'Print'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
    // Without this, `readVerbFor` answered the default `'Read'` — which none
    // of the nine `*Reports` resources declares — so `missingImpliedReads`
    // was silently exempt for all nine: a role could hold `Export`/`Print`
    // (the report CSV) without `ViewReports` (the screen it exports from).
    // Independent review, round 4 (I5): the same incoherence `ViewAuditLog`
    // was given a `readVerb` to close, reproduced nine times over.
    readVerb: 'ViewReports',
  },
  {
    resourceType: 'workflowReports',
    group: 'workflow',
    actions: ['ViewReports', 'Export', 'Print'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
    // Without this, `readVerbFor` answered the default `'Read'` — which none
    // of the nine `*Reports` resources declares — so `missingImpliedReads`
    // was silently exempt for all nine: a role could hold `Export`/`Print`
    // (the report CSV) without `ViewReports` (the screen it exports from).
    // Independent review, round 4 (I5): the same incoherence `ViewAuditLog`
    // was given a `readVerb` to close, reproduced nine times over.
    readVerb: 'ViewReports',
  },
  {
    resourceType: 'sponsorshipReports',
    group: 'sponsorship-relations',
    actions: ['ViewReports', 'Export', 'Print'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
    // Without this, `readVerbFor` answered the default `'Read'` — which none
    // of the nine `*Reports` resources declares — so `missingImpliedReads`
    // was silently exempt for all nine: a role could hold `Export`/`Print`
    // (the report CSV) without `ViewReports` (the screen it exports from).
    // Independent review, round 4 (I5): the same incoherence `ViewAuditLog`
    // was given a `readVerb` to close, reproduced nine times over.
    readVerb: 'ViewReports',
  },
  {
    resourceType: 'commsReports',
    group: 'public-communication',
    actions: ['ViewReports', 'Export', 'Print'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
    // Without this, `readVerbFor` answered the default `'Read'` — which none
    // of the nine `*Reports` resources declares — so `missingImpliedReads`
    // was silently exempt for all nine: a role could hold `Export`/`Print`
    // (the report CSV) without `ViewReports` (the screen it exports from).
    // Independent review, round 4 (I5): the same incoherence `ViewAuditLog`
    // was given a `readVerb` to close, reproduced nine times over.
    readVerb: 'ViewReports',
  },
  {
    resourceType: 'cmsReports',
    group: 'cms-page-composition',
    actions: ['ViewReports', 'Export', 'Print'],
    purgeable: false,
    superAdminOnly: [],
    sensitiveFields: [],
    scopes: [],
    // Without this, `readVerbFor` answered the default `'Read'` — which none
    // of the nine `*Reports` resources declares — so `missingImpliedReads`
    // was silently exempt for all nine: a role could hold `Export`/`Print`
    // (the report CSV) without `ViewReports` (the screen it exports from).
    // Independent review, round 4 (I5): the same incoherence `ViewAuditLog`
    // was given a `readVerb` to close, reproduced nine times over.
    readVerb: 'ViewReports',
  },
];

const BY_RESOURCE = new Map(CAPABILITY_MAP.map((entry) => [entry.resourceType, entry]));

export const capabilityFor = (resourceType: string): ResourceCapability | undefined =>
  BY_RESOURCE.get(resourceType as PermissionResource);

/** Whether this pair is reserved to the Super Admin and may never be granted. */
export const isSuperAdminOnly = (resourceType: string, action: string): boolean =>
  capabilityFor(resourceType)?.superAdminOnly.includes(action as PermissionAction) ?? false;

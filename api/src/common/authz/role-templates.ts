import type { PermissionResource } from '../constants/permission-resources.js';
import type { LocalizedText } from '../schemas/localized-text.schema.js';
import type { PermissionAction } from '../../modules/platform-administration/permissions/schemas/permission.schema.js';

/** One block of a template: every listed resource receives every listed action. */
export interface RoleTemplateGrant {
  resources: readonly PermissionResource[];
  actions: readonly PermissionAction[];
  /** Only where the capability map declares scopes; `null` everywhere else. */
  scope: 'own' | 'all' | null;
}

/** A starting-point role an administrator may edit, copy or delete (See ADR-0113). */
export interface RoleTemplate {
  key: string;
  name: LocalizedText;
  description: LocalizedText;
  grants: readonly RoleTemplateGrant[];
  deliberatelyAbsent: readonly PermissionAction[];
}

const EDITORIAL: readonly PermissionAction[] = [
  'Read',
  'Create',
  'Update',
  'Archive',
  'Restore',
];
const GROUP_REPORTS: readonly PermissionAction[] = [
  'ViewReports',
  'Export',
  'Print',
];

/** The six role templates, as data only (See ADR-0113). */
export const ROLE_TEMPLATES: readonly RoleTemplate[] = [
  {
    key: 'content-manager',
    name: { ar: 'مسؤول المحتوى', en: 'Content Manager' },
    description: {
      ar: 'يدير الأخبار والوسائط وصفحات الموقع، ولا ينشر ولا يعتمد.',
      en: 'Manages news, media and site pages; does not publish or approve.',
    },
    grants: [
      {
        resources: ['articles', 'albums', 'videos', 'heroSlides'],
        actions: EDITORIAL,
        scope: 'all',
      },
      {
        resources: [
          'mediaAssets',
          'pages',
          'pageSections',
          'navigationItems',
          'navigationMenus',
        ],
        actions: EDITORIAL,
        scope: null,
      },
      {
        resources: ['commsReports', 'mediaReports', 'cmsReports'],
        actions: GROUP_REPORTS,
        scope: null,
      },
    ],
    deliberatelyAbsent: [
      'Publish',
      'Approve',
      'ViewSensitive',
      'PermanentDelete',
    ],
  },
  {
    key: 'editor',
    name: { ar: 'محرر', en: 'Editor' },
    description: {
      ar: 'يكتب ويعدّل ما أنشأه بنفسه من أخبار وألبومات، بدون نشر.',
      en: 'Writes and edits their own news and albums, without publishing.',
    },
    grants: [
      // No videos: videos:Update also publishes a video.
      // No Archive: archiving does not refuse a published record.
      {
        resources: ['articles', 'albums'],
        actions: ['Read', 'Create', 'Update'],
        scope: 'own',
      },
    ],
    deliberatelyAbsent: [
      'Publish',
      'Archive',
      'Restore',
      'Approve',
      'ViewReports',
      'Export',
      'Print',
      'ViewSensitive',
    ],
  },
  {
    key: 'reviewer-approver',
    name: { ar: 'مراجع ومعتمد', en: 'Reviewer & Approver' },
    description: {
      ar: 'يراجع المحتوى المُرسَل للاعتماد ويعتمده، ولا يكتبه ولا ينشره.',
      en: 'Reviews and approves submitted content; does not write or publish it.',
    },
    grants: [
      {
        resources: [
          'articles',
          'governanceDocuments',
          'strategicPlansPage',
          'visionMissionPage',
          'aboutFederationPage',
          'presidentMessagePage',
          'organizationalStructure',
          'committees',
          'documents',
        ],
        actions: ['Read'],
        scope: null,
      },
      {
        resources: ['workflowInstances', 'revisions', 'workflowActionHistory'],
        actions: ['Read'],
        scope: null,
      },
      // The current approval gate; its per-type scoping (See ADR-0106) is not built.
      { resources: ['workflowInstances'], actions: ['Approve'], scope: null },
    ],
    deliberatelyAbsent: [
      'Create',
      'Update',
      'Archive',
      'Publish',
      'ViewReports',
      'Export',
      'Print',
    ],
  },
  {
    key: 'sports-data-officer',
    name: { ar: 'مسؤول البيانات الرياضية', en: 'Sports Data Officer' },
    description: {
      ar: 'يدير بيانات الرياضيين والمدربين والحكام والأندية وتقاريرها.',
      en: 'Manages athlete, coach, official and club data and their reports.',
    },
    grants: [
      {
        resources: [
          'athletes',
          'athleteProfiles',
          'coaches',
          'officials',
          'officialProfiles',
          'clubs',
          'clubTeams',
          'disciplines',
          'ageCategories',
          'venues',
          'countries',
          'athleteClubHistory',
          'athleteCoachHistory',
          'athleteNationalTeamHistory',
          'coachClubHistory',
          'officialClubHistory',
        ],
        actions: EDITORIAL,
        scope: null,
      },
      {
        resources: ['peopleReports', 'athleticsReports'],
        actions: GROUP_REPORTS,
        scope: null,
      },
    ],
    // ViewSensitive is absent on purpose: its pairs are not in the catalogue yet.
    deliberatelyAbsent: [
      'Publish',
      'Approve',
      'PermanentDelete',
      'ViewSensitive',
    ],
  },
  {
    key: 'governance-officer',
    name: { ar: 'مسؤول الحوكمة', en: 'Governance Officer' },
    description: {
      ar: 'يدير اللجان والتعيينات والانتخابات ووثائق الحوكمة وصفحاتها وينشرها.',
      en: 'Manages and publishes committees, appointments, elections, governance documents and pages.',
    },
    // Governance records and the pages that present them.
    grants: [
      {
        resources: [
          'committees',
          'federationPersonnel',
          'federationAppointments',
          'electionCycles',
          'governanceDocuments',
          'documents',
          'organizationalStructure',
          'presidentMessagePage',
          'strategicPlansPage',
          'visionMissionPage',
        ],
        actions: EDITORIAL,
        scope: null,
      },
      // A single seeded row: the map offers no Create on it.
      {
        resources: ['aboutFederationPage'],
        actions: ['Read', 'Update', 'Archive', 'Restore'],
        scope: null,
      },
      // The map offers these two nothing but Update and Publish.
      {
        resources: ['boardMembersPage', 'committeesPage'],
        actions: ['Update'],
        scope: null,
      },
      {
        resources: [
          'committees',
          'governanceDocuments',
          'documents',
          'organizationalStructure',
          'presidentMessagePage',
          'strategicPlansPage',
          'visionMissionPage',
          'aboutFederationPage',
          'boardMembersPage',
          'committeesPage',
        ],
        actions: ['Publish'],
        scope: null,
      },
      {
        resources: ['governanceReports', 'documentsReports'],
        actions: GROUP_REPORTS,
        scope: null,
      },
    ],
    deliberatelyAbsent: ['PermanentDelete', 'Approve'],
  },
  {
    key: 'executive-viewer',
    name: { ar: 'مشاهد الإدارة العليا', en: 'Executive Viewer' },
    description: {
      ar: 'يطّلع على تقارير المجموعات عدا المستخدمين والوصول، بلا كتابة ولا تصدير ولا طباعة.',
      en: 'Sees every group report but users and access; no writes, no export, no print.',
    },
    grants: [
      // Eight of the nine report resources: workflowReports sits under Users & Access.
      {
        resources: [
          'governanceReports',
          'peopleReports',
          'athleticsReports',
          'mediaReports',
          'documentsReports',
          'sponsorshipReports',
          'commsReports',
          'cmsReports',
        ],
        actions: ['ViewReports'],
        scope: null,
      },
    ],
    deliberatelyAbsent: [
      'Create',
      'Update',
      'Archive',
      'Restore',
      'Publish',
      'Approve',
      'Export',
      'Print',
      'ViewSensitive',
    ],
  },
];

/**
 * Which product domain each RBAC resource belongs to.
 *
 * NOT a judgement call. Derived mechanically on 2026-09-08 by locating every
 * `@RequirePermission('<resource>', …)` in `api/src` and recording which
 * directory under `api/src/modules/` declares it; the nine module folders
 * were then matched to the domain headings in
 * `docs/product/07-Mongoose-Schema-Specification.md` (`## Domain N — Title`).
 * All 64 entries of `PERMISSION_RESOURCES` are covered, every resource lives
 * in exactly one folder, and no resource is declared without a guarded route.
 * (`auditLogs` joined the list on 2026-09-08, when the trail gained a read
 * endpoint — see api/src/modules/workflow/audit-logs/.)
 *
 * Why group at all: 164 permissions over 63 resources is not a list anyone
 * reads top to bottom. Grouping by the domain the resource genuinely belongs
 * to lets an administrator answer "what can this role touch in the media
 * centre" without knowing the resource identifiers by heart.
 *
 * The English titles are the schema specification's own headings, quoted.
 * **The Arabic titles are machine-authored and await approved bilingual
 * copy** — the same standing gap as the seeded permission labels
 * ("قراءة — users"), recorded rather than presented as approved
 * terminology. The English identifier stays visible beside every Arabic
 * label precisely so nothing is misrepresented while that is open.
 */

export interface ResourceDomain {
  /** Domain number in the schema specification. Orders the groups. */
  order: number;
  /** Quoted from the specification heading. */
  en: string;
  /** Machine-authored, pending approved copy. */
  ar: string;
}

export const RESOURCE_DOMAINS: Record<string, ResourceDomain> = {
  "federation-governance": { order: 1, en: "Federation & Governance", ar: "الاتحاد والحوكمة" },
  "people-organizations": { order: 2, en: "People & Organizations", ar: "الأشخاص والمنظمات" },
  athletics: { order: 3, en: "Athletics", ar: "ألعاب القوى" },
  "media-center": { order: 5, en: "Media Center", ar: "المركز الإعلامي" },
  documents: { order: 6, en: "Documents", ar: "الوثائق" },
  workflow: {
    order: 7,
    en: "Workflow / Approval / Revision / Publication",
    ar: "سير العمل والاعتماد والنشر",
  },
  "platform-administration": { order: 8, en: "Platform Administration", ar: "إدارة المنصة" },
  "public-communication": { order: 10, en: "Public Communication", ar: "التواصل العام" },
  "cms-page-composition": { order: 11, en: "CMS & Page Composition", ar: "تكوين الصفحات" },
};

/**
 * The bucket for a resource this file has not heard of.
 *
 * A resource added to the API after this map was derived must still render.
 * Dropping it would hide a real permission from the only screen that can
 * grant it — far worse than showing it under a heading that says plainly it
 * has not been classified. Ordered last.
 */
export const UNCLASSIFIED_DOMAIN_KEY = "unclassified";

const RESOURCE_TO_DOMAIN: Record<string, string> = {
  aboutFederationPage: "federation-governance",
  ageCategories: "athletics",
  albums: "media-center",
  albumsPage: "media-center",
  athleteClubHistory: "people-organizations",
  athleteCoachHistory: "people-organizations",
  athleteGuardianRelationships: "people-organizations",
  athleteNationalTeamHistory: "people-organizations",
  athleteProfiles: "people-organizations",
  athletes: "people-organizations",
  athletesPage: "cms-page-composition",
  auditLogs: "workflow",
  boardMembersPage: "federation-governance",
  clubTeams: "people-organizations",
  clubs: "people-organizations",
  clubsPage: "cms-page-composition",
  coachClubHistory: "people-organizations",
  coaches: "people-organizations",
  coachesPage: "cms-page-composition",
  committees: "federation-governance",
  committeesPage: "federation-governance",
  contactMessages: "public-communication",
  contactUsPage: "federation-governance",
  countries: "people-organizations",
  disciplines: "athletics",
  disciplinesPage: "cms-page-composition",
  documents: "documents",
  electionCycles: "federation-governance",
  federation: "federation-governance",
  federationAppointments: "federation-governance",
  federationPersonnel: "federation-governance",
  governanceDocuments: "federation-governance",
  heroSlides: "cms-page-composition",
  mediaAssets: "media-center",
  navigationItems: "cms-page-composition",
  navigationMenus: "cms-page-composition",
  newsPage: "cms-page-composition",
  notifications: "workflow",
  officialAssignments: "people-organizations",
  officialClubHistory: "people-organizations",
  officialProfiles: "people-organizations",
  officials: "people-organizations",
  organizationalStructure: "federation-governance",
  pageSections: "cms-page-composition",
  pages: "cms-page-composition",
  permissions: "platform-administration",
  presidentMessagePage: "federation-governance",
  publications: "workflow",
  recordsPage: "cms-page-composition",
  resultsRankingsPage: "cms-page-composition",
  revisions: "workflow",
  roles: "platform-administration",
  siteSettings: "cms-page-composition",
  strategicPlansPage: "federation-governance",
  users: "platform-administration",
  venues: "people-organizations",
  videos: "media-center",
  videosPage: "media-center",
  visionMissionPage: "federation-governance",
  workflowActionHistory: "workflow",
  workflowDefinitions: "workflow",
  workflowInstances: "workflow",
  workflowPolicies: "workflow",
  workflowSteps: "workflow",
};

export function domainKeyFor(resourceType: string): string {
  return RESOURCE_TO_DOMAIN[resourceType] ?? UNCLASSIFIED_DOMAIN_KEY;
}

/** Sort key for a domain heading. Unclassified sorts last, deliberately. */
export function domainOrder(key: string): number {
  return RESOURCE_DOMAINS[key]?.order ?? Number.MAX_SAFE_INTEGER;
}

/** Exported for the test that guards the derivation's completeness. */
export const MAPPED_RESOURCE_COUNT = Object.keys(RESOURCE_TO_DOMAIN).length;

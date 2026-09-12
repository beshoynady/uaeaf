import type { PublicationEntityType } from './workflow-entity-types.js';

/**
 * What each workflow-governed entity type's content is, per type, in one
 * file.
 *
 * Two questions are answered here because they are answered together: when a
 * page module is built, both of its rows are written in the same edit. Split
 * across two files, the second is the one that gets forgotten — and a
 * forgotten `REVISION_READ_FIELDS` row shows an editor an empty version,
 * while a forgotten `PUBLISH_REQUIREMENTS` row publishes a page with a hole
 * in it.
 *
 * Neither list belongs inside `PublishingService` or `RevisionsService`.
 * Those are generic by design — they take an `entityType` and know nothing
 * about any page. A rule about one page living inside them would mean the
 * next eleven pages each edit the shared service instead of adding a line
 * here.
 */

/**
 * Fields that must carry a value before an entity may be published.
 *
 * The `[[pending-content]]` marker covers missing *text*: it is a string, so
 * it can sit in the field it is standing in for. A missing image cannot be
 * marked that way — `featuredImageId` is either an ObjectId or null, and
 * null is indistinguishable from "deliberately no portrait" without this
 * list saying which pages require one (ADR-0069 D5, owner decision
 * 2026-09-12).
 *
 * Only names that also appear in `REVISION_READ_FIELDS` for the same type
 * are meaningful; `entity-content.spec.ts` enforces that.
 */
export const PUBLISH_REQUIREMENTS: Record<PublicationEntityType, readonly string[]> = {
  articles: [],
  staticPages: [],
  externalMediaCoverage: [],
  governanceDocuments: [],
  strategicPlansPage: [],
  visionMissionPage: [],
  aboutFederationPage: [],
  // The president's portrait carries the hero composition (ADR-0069 D8).
  // Published without it, the page's whole top third is an empty frame.
  presidentMessagePage: ['featuredImageId'],
  organizationalStructure: [],
  committees: [],
  documents: [],
  publicEvents: [],
};

/**
 * The fields of a stored revision that a dashboard reader may see.
 *
 * An allowlist, not a denylist, and applied when the revision is *read* —
 * not only when it was written. `RevisionsService` strips bookkeeping at
 * write time, but a snapshot is immutable: a row frozen in June carries
 * whatever June's rules let through, including fields the schema has since
 * dropped (`presidentMessagePage.goals`, removed by ADR-0069 D2). Filtering
 * at read time is the only filter that applies to rows already in the
 * database.
 *
 * A type with no entries returns no content rather than all of it. Four of
 * the twelve have no module yet; when one is built, its row is written here
 * with the rest of the module, and until then an empty version is a visible
 * gap rather than a silent leak.
 */
export const REVISION_READ_FIELDS: Record<PublicationEntityType, readonly string[]> = {
  articles: [],
  staticPages: [],
  externalMediaCoverage: [],
  governanceDocuments: ['title', 'description', 'type', 'fileId', 'documentVersion'],
  strategicPlansPage: [
    'heroImageId',
    'heroTitle',
    'heroSubtitle',
    'federationId',
    'introHeading',
    'introText',
    'periodStart',
    'periodEnd',
    'foundationPillars',
    'strategicAxes',
    'objectives',
    'impactMetrics',
    'documentId',
    'documentVersion',
  ],
  visionMissionPage: [
    'heroImageId',
    'heroTitle',
    'heroSubtitle',
    'federationId',
    'visionText',
    'missionText',
    'strategicGoals',
    'coreValues',
  ],
  aboutFederationPage: [
    'heroImageId',
    'heroTitle',
    'heroSubtitle',
    'foundingDate',
    'historicalIntro',
    'foundingDecreeCaption',
    'roleHeading',
    'roleText',
    'globalMembershipYear',
    'globalMembershipHeading',
    'globalMembershipText',
    'firstPresidentPhoto',
    'firstPresidentName',
    'firstPresidentTitle',
    'firstPresidentBio',
    'achievements',
  ],
  // `federationAppointmentId` is deliberately absent: it is the canonical
  // identity link, not editable and not read by any screen. Restoring a
  // version reads the stored snapshot directly, never this projection, so
  // leaving it out costs a restore nothing.
  presidentMessagePage: [
    'heroImageId',
    'heroTitle',
    'heroSubtitle',
    'featuredImageId',
    'pullQuote',
    'messageBody',
    'valuesTitle',
    'values',
    'signatoryName',
    'signatoryTitle',
    'seo',
  ],
  organizationalStructure: ['title', 'parentNodeId', 'displayOrder', 'nodeType', 'federationAppointmentId'],
  committees: ['name', 'description', 'displayOrder', 'isActive', 'committeeType', 'committeeGroup'],
  documents: ['file', 'documentType', 'ownerType', 'ownerId', 'effectiveDate', 'expiryDate'],
  publicEvents: [],
};

/**
 * The snapshot reduced to the fields the type's allowlist names.
 *
 * Absent fields stay absent — a version saved before a field existed reads
 * back without it rather than with a null that looks like a deliberate
 * clearing.
 */
export function projectRevisionContent(
  entityType: PublicationEntityType,
  snapshot: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = REVISION_READ_FIELDS[entityType];
  return Object.fromEntries(allowed.filter((field) => field in snapshot).map((field) => [field, snapshot[field]]));
}

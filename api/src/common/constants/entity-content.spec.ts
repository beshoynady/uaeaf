import { Schema } from 'mongoose';
import { PUBLISH_REQUIREMENTS, REVISION_READ_FIELDS, projectRevisionContent } from './entity-content.js';
import { PUBLICATION_ENTITY_TYPES } from './workflow-entity-types.js';
import type { PublicationEntityType } from './workflow-entity-types.js';
// Imported, not re-typed: a copy of this list would go stale the moment a
// bookkeeping field is added, and the test below would keep passing against
// the old one.
import { NOT_CONTENT } from '../../modules/workflow/revisions/revisions.service.js';
import { GovernanceDocumentSchema } from '../../modules/federation-governance/governance-documents/schemas/governance-documents.schema.js';
import { StrategicPlansPageSchema } from '../../modules/federation-governance/strategic-plans-page/schemas/strategic-plans-page.schema.js';
import { VisionMissionPageSchema } from '../../modules/federation-governance/vision-mission-page/schemas/vision-mission-page.schema.js';
import { AboutFederationPageSchema } from '../../modules/federation-governance/about-federation-page/schemas/about-federation-page.schema.js';
import { PresidentMessagePageSchema } from '../../modules/federation-governance/president-message-page/schemas/president-message-page.schema.js';
import { OrganizationalStructureNodeSchema } from '../../modules/federation-governance/organizational-structure/schemas/organizational-structure.schema.js';
import { CommitteeSchema } from '../../modules/federation-governance/committees/schemas/committees.schema.js';
import { DocumentSchema } from '../../modules/documents/documents/schemas/document.schema.js';

/**
 * The eight entity types whose collection exists today. The other four have
 * no module, so there is no schema to check their (empty) allowlist against.
 */
const BUILT: ReadonlyArray<[PublicationEntityType, Schema]> = [
  ['governanceDocuments', GovernanceDocumentSchema],
  ['strategicPlansPage', StrategicPlansPageSchema],
  ['visionMissionPage', VisionMissionPageSchema],
  ['aboutFederationPage', AboutFederationPageSchema],
  ['presidentMessagePage', PresidentMessagePageSchema],
  ['organizationalStructure', OrganizationalStructureNodeSchema],
  ['committees', CommitteeSchema],
  ['documents', DocumentSchema],
];

describe('entity content registry', () => {
  it('covers every publication entity type in both registries', () => {
    for (const entityType of PUBLICATION_ENTITY_TYPES) {
      expect(REVISION_READ_FIELDS[entityType]).toBeDefined();
      expect(PUBLISH_REQUIREMENTS[entityType]).toBeDefined();
    }
  });

  // A name that no longer exists on the schema is the failure this guards:
  // it reads back as nothing, so the field silently vanishes from the
  // version a reader opens rather than failing loudly.
  it.each(BUILT)('only allows fields %s actually declares', (entityType, schema) => {
    const declared = Object.keys(schema.paths);

    for (const field of REVISION_READ_FIELDS[entityType]) {
      expect(declared).toContain(field);
    }
  });

  it.each(BUILT)('never allows a field %s treats as bookkeeping', (entityType) => {
    for (const field of REVISION_READ_FIELDS[entityType]) {
      expect(NOT_CONTENT).not.toContain(field);
    }
  });

  // A requirement naming a field nobody may read would block publishing over
  // something no screen can show or fix.
  it('only requires fields that are readable content', () => {
    for (const entityType of PUBLICATION_ENTITY_TYPES) {
      for (const field of PUBLISH_REQUIREMENTS[entityType]) {
        expect(REVISION_READ_FIELDS[entityType]).toContain(field);
      }
    }
  });

  it('requires the portrait before the president message may be published', () => {
    expect(PUBLISH_REQUIREMENTS.presidentMessagePage).toEqual(['featuredImageId']);
  });
});

describe('projectRevisionContent', () => {
  it('drops a field the current allowlist does not name', () => {
    const snapshot = {
      heroTitle: { ar: 'كلمة الرئيس', en: "President's Message" },
      // Removed from the schema by ADR-0069 D2, still present in every
      // snapshot frozen before the migration.
      goals: [{ title: 'old' }],
      federationAppointmentId: '68c0000000000000000000aa',
    };

    expect(projectRevisionContent('presidentMessagePage', snapshot)).toEqual({
      heroTitle: { ar: 'كلمة الرئيس', en: "President's Message" },
    });
  });

  it('leaves an absent field absent rather than null', () => {
    const projected = projectRevisionContent('presidentMessagePage', { heroTitle: { ar: 'ع', en: 'e' } });

    expect('pullQuote' in projected).toBe(false);
  });

  it('returns nothing for a type with no module yet', () => {
    expect(projectRevisionContent('articles', { body: 'secret draft' })).toEqual({});
  });
});

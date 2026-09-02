/**
 * The two closed entity-type lists for Domain 7 (FigJam domain note
 * `100:7435`, re-read fresh 2026-09-02 for Week 2 — verbatim match, no
 * drift from the same note as read for BE-PLAN-010 §Week1/addenda).
 *
 * List A (workflow-participation, 13 types) gates
 * `workflowDefinitions.entityType`, `workflowInstances.entityType`, and
 * `workflowPolicies.entityType`. List B (revision/publication, 12 types —
 * List A minus `contactMessages`) gates `revisions.entityType` and
 * `publications.entityType`: a citizen-submitted contact message can be
 * routed through an internal approval workflow, but has no
 * `publicationState` and is never "published."
 */
export const WORKFLOW_ENTITY_TYPES = [
  'articles',
  'staticPages',
  'externalMediaCoverage',
  'governanceDocuments',
  'strategicPlansPage',
  'visionMissionPage',
  'aboutFederationPage',
  'presidentMessagePage',
  'organizationalStructure',
  'committees',
  'documents',
  'contactMessages',
  'publicEvents',
] as const;
export type WorkflowEntityType = (typeof WORKFLOW_ENTITY_TYPES)[number];

export const PUBLICATION_ENTITY_TYPES = WORKFLOW_ENTITY_TYPES.filter(
  (entityType) => entityType !== 'contactMessages',
) as Exclude<WorkflowEntityType, 'contactMessages'>[];
export type PublicationEntityType = (typeof PUBLICATION_ENTITY_TYPES)[number];

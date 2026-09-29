/**
 * The two closed entity-type lists for Domain 7 (FigJam domain note
 * `100:7435`, re-read fresh 2026-09-02 for Week 2 — verbatim match, no
 * drift from the same note as read for BE-PLAN-010 §Week1/addenda).
 *
 * List A (workflow-participation, 14 types) gates
 * `workflowDefinitions.entityType`, `workflowInstances.entityType`, and
 * `workflowPolicies.entityType`. List B (revision/publication, 13 types —
 * List A minus `contactMessages`) gates `revisions.entityType` and
 * `publications.entityType`: a citizen-submitted contact message can be
 * routed through an internal approval workflow, but has no
 * `publicationState` and is never "published."
 *
 * `seasons` joined both lists after the FigJam note: it carried its own
 * `Publish` route and permission with no policy gate at all — a second
 * door into `Published`, the same shape ADR-0125 records for `albums`. It
 * is now governed the same as everything else on List B, through
 * `PublishingService`, and its old route calls that instead of publishing
 * itself.
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
  'seasons',
] as const;
export type WorkflowEntityType = (typeof WORKFLOW_ENTITY_TYPES)[number];

export const PUBLICATION_ENTITY_TYPES = WORKFLOW_ENTITY_TYPES.filter(
  (entityType) => entityType !== 'contactMessages',
) as Exclude<WorkflowEntityType, 'contactMessages'>[];
export type PublicationEntityType = (typeof PUBLICATION_ENTITY_TYPES)[number];

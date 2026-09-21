import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { WORKFLOW_STEP_TYPES } from '../workflow-steps/schemas/workflow-step.schema.js';
import { WORKFLOW_ACTIONS } from '../workflow-action-history/schemas/workflow-action-history.schema.js';
// One actor shape across this module, not two. A reviewer and a version's
// author are the same kind of thing to a reader — a name, never the account
// behind it — and a second class would be a second thing to keep in step.
import { RevisionActorDto } from './revision-history.dto.js';
import type { PublishingMode } from '../workflow-policies/workflow-policies.service.js';
import type { WorkflowInstanceStatus } from '../workflow-instances/schemas/workflow-instance.schema.js';
import type { WorkflowStepType } from '../workflow-steps/schemas/workflow-step.schema.js';
import type { WorkflowAction } from '../workflow-action-history/schemas/workflow-action-history.schema.js';
import type { PublishBlockerKind } from './publish-blockers.js';

/** One reason this record may not be published yet. */
export class PublishBlockerDto {
  @ApiProperty({
    enum: ['pendingContent', 'missingRequired'],
    description:
      '`pendingContent` — the field still carries the awaiting-the-client marker. ' +
      '`missingRequired` — the field must hold a value before this type may be published and is empty.',
  })
  kind: PublishBlockerKind;

  @ApiProperty({ description: 'Record path, e.g. `pullQuote.en` or `featuredImageId`.' })
  field: string;
}

/** An action the caller may take on this record right now. */
export const EDITORIAL_ACTIONS = [
  'save',
  'submit',
  'resubmit',
  'publish',
  // Putting a finished approval on the site, which is NOT `publish`.
  //
  // They were one name until 2026-09-21, and the ambiguity was a defect:
  // `publish` is `publishDirect`, which refuses with 409 whenever the type's
  // policy requires review — so an approved article under such a policy
  // offered a button that could not work, and no other route to the site.
  // Two acts, two revision sources, two audit entries: two names.
  'publishApproved',
  'approve',
  'reject',
  'return',
] as const;
export type EditorialAction = (typeof EDITORIAL_ACTIONS)[number];

/**
 * One step of a review, as the panel draws it.
 *
 * `approvals` is the count for the CURRENT submission cycle, not since the
 * beginning: an approval given before a rejection approved text the author
 * has since been told to change, and showing it as progress would say the
 * step is nearly done when it has not started again. The repository's
 * `countDistinctApprovers` is where a cycle's boundary is defined.
 */
export class WorkflowStepSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Position in the chain; the panel sorts on this, not on insertion order.' })
  sequenceOrder: number;

  @ApiProperty({ enum: WORKFLOW_STEP_TYPES })
  stepType: WorkflowStepType;

  @ApiProperty({ description: 'Approvals this step needs before the review moves on.' })
  requiredApprovals: number;

  @ApiProperty({ description: 'Distinct approvers so far in the current submission cycle.' })
  approvals: number;

  @ApiProperty({ type: [RevisionActorDto], description: 'Who may decide this step. Always named individuals.' })
  assignees: RevisionActorDto[];

  @ApiProperty({ description: 'Whether the review is waiting on this step now.' })
  isCurrent: boolean;
}

/** The review running on this record, if one is. */
export class WorkflowSummaryDto {
  @ApiProperty()
  instanceId: string;

  @ApiProperty({ type: LocalizedTextDto, nullable: true, description: 'The definition governing this review.' })
  definitionName: LocalizedTextDto | null;

  @ApiProperty({ enum: ['InProgress', 'Approved', 'Rejected', 'Returned'] })
  status: WorkflowInstanceStatus;

  @ApiProperty({
    type: [WorkflowStepSummaryDto],
    description: 'Every step in the order it runs — not only the current one, so an author can see who is still to come.',
  })
  steps: WorkflowStepSummaryDto[];
}

/** One decision taken on this record. */
export class EditorialHistoryEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: WORKFLOW_ACTIONS })
  action: WorkflowAction;

  @ApiProperty({ type: RevisionActorDto })
  actor: RevisionActorDto;

  @ApiProperty({ nullable: true, description: 'Mandatory upstream for Rejected and Returned; null where none was given.' })
  reason: string | null;

  @ApiProperty({ description: 'ISO date the action was taken.' })
  actionDate: string;

  @ApiProperty({ description: 'The step the action was taken on.' })
  workflowStepId: string;

  @ApiProperty({ nullable: true, description: 'Populated only when the action is `Returned`.' })
  returnedToStepId: string | null;

  @ApiProperty({
    description:
      'Meaningful only when the action is `Rejected`: true where the reviewer asked for changes, ' +
      'false where they refused the item. The engine behaves identically either way.',
  })
  revisionRequested: boolean;
}

/**
 * Everything the dashboard needs to draw the status panel, in one read.
 *
 * `availableActions` is computed on the server, not inferred by the client
 * from the other fields. The dashboard would have to re-implement the
 * policy resolution, the permission check, the review-in-progress rule and
 * the assignee rule to work them out — four chances to disagree with the
 * server about what a person may do, and the disagreement would show as a
 * button that fails when pressed.
 */
export class EditorialStateDto {
  @ApiProperty({ description: 'Denormalized publication state of the record itself.' })
  publicationState: string;

  @ApiProperty({
    enum: ['workflow', 'direct', 'blocked'],
    description:
      'How this entity publishes, resolved from workflowPolicies. "blocked" means an administrator ' +
      'has not configured a usable policy — drafts still save, nothing publishes.',
  })
  mode: PublishingMode;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Why the mode is blocked; null otherwise.',
  })
  blockedReason: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'ISO date of the current Live publication.' })
  publishedAt: string | null;

  @ApiProperty({
    type: RevisionActorDto,
    required: false,
    nullable: true,
    description:
      'Who put the current Live version on the site; null when nothing is live. Resolved here because the ' +
      'panel prints a name, and most editors may not call the users route to resolve one themselves.',
  })
  publishedBy: RevisionActorDto | null;

  @ApiProperty({ required: false, nullable: true })
  workflowInstanceId: string | null;

  @ApiProperty({ required: false, nullable: true, enum: ['InProgress', 'Approved', 'Rejected', 'Returned'] })
  workflowStatus: WorkflowInstanceStatus | null;

  @ApiProperty({ required: false, nullable: true, description: 'Id of the step awaiting a decision.' })
  currentStepId: string | null;

  @ApiProperty({ description: 'Whether the caller may edit the draft right now.' })
  canEdit: boolean;

  @ApiProperty({
    isArray: true,
    enum: EDITORIAL_ACTIONS,
    description: 'What this caller may do now, computed server-side.',
  })
  availableActions: EditorialAction[];

  @ApiProperty({ description: 'The record\'s updatedAt, to send back as expectedUpdatedAt when publishing.' })
  updatedAt: string | null;

  @ApiProperty({
    isArray: true,
    type: PublishBlockerDto,
    description:
      'Everything standing between this draft and the public site. Publishing is refused while non-empty, ' +
      'and the dashboard renders it as a readiness list above the publish button rather than waiting to ' +
      'refuse the press.',
  })
  publishBlockers: PublishBlockerDto[];

  @ApiProperty({
    isArray: true,
    enum: EDITORIAL_ACTIONS,
    description:
      'Actions this caller would be allowed if `publishBlockers` were empty, and is not allowed only ' +
      'because it is not. The dashboard draws these as disabled controls described by the readiness ' +
      'list, so a reader hears why they cannot publish rather than finding no button at all. Never ' +
      'overlaps `availableActions`, and never names an action the caller lacks the permission for — ' +
      '"not ready yet" and "not yours to do" are different answers and must not look alike.',
  })
  blockedByReadiness: EditorialAction[];

  @ApiProperty({
    type: WorkflowSummaryDto,
    required: false,
    nullable: true,
    description: 'The review this record is in, with its steps; null when no review has been opened.',
  })
  workflow: WorkflowSummaryDto | null;

  @ApiProperty({
    isArray: true,
    type: EditorialHistoryEntryDto,
    description:
      'Every decision taken on this record across all of its reviews, newest first. Capped at the most ' +
      'recent 100 — a bound no real review approaches, and one this description states rather than ' +
      'letting the panel truncate in silence.',
  })
  history: EditorialHistoryEntryDto[];
}

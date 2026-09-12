import { ApiProperty } from '@nestjs/swagger';
import type { PublishingMode } from '../workflow-policies/workflow-policies.service.js';
import type { WorkflowInstanceStatus } from '../workflow-instances/schemas/workflow-instance.schema.js';

/** An action the caller may take on this record right now. */
export const EDITORIAL_ACTIONS = [
  'save',
  'submit',
  'resubmit',
  'publish',
  'approve',
  'reject',
  'return',
] as const;
export type EditorialAction = (typeof EDITORIAL_ACTIONS)[number];

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
    type: String,
    description: 'Field paths still carrying the pending-content marker. Publishing is refused while non-empty.',
  })
  pendingContent: string[];
}

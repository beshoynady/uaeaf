import { PartialType } from '@nestjs/swagger';
import { CreateWorkflowStepDto } from './create-workflow-step.dto.js';

/** Request body for PATCH /workflow-steps/:id. Every field optional;
 *  omitting one leaves it unchanged.
 *
 *  `requiredApprovals` and `assigneeIds` are both kept editable, unlike this
 *  batch's relink fields (`athleteId`, `officialId`, `fileId` elsewhere):
 *  each is an ordinary edit on its own, and their validity is a
 *  relationship between them rather than an identity link. `create()`'s
 *  `unsatisfiableStep` check is re-run in the service against the MERGED
 *  values (patch fields on top of whatever the patch does not send) — see
 *  `WorkflowStepsService.update()`. */
export class UpdateWorkflowStepDto extends PartialType(CreateWorkflowStepDto, { skipNullProperties: false }) {}

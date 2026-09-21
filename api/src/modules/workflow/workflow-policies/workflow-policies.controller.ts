import { BadRequestException, Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { ApprovalConfigurationService } from './approval-configuration.service.js';
import { ConfigureApprovalDto } from './dto/configure-approval.dto.js';
import { CreateWorkflowPolicyDto } from './dto/create-workflow-policy.dto.js';
import { SetWorkflowPolicyDto } from './dto/set-workflow-policy.dto.js';
import { WORKFLOW_ENTITY_TYPES } from '../../../common/constants/workflow-entity-types.js';
import type { WorkflowEntityType } from '../../../common/constants/workflow-entity-types.js';
import { WORKFLOW_POLICY_OPERATIONS } from './schemas/workflow-policy.schema.js';
import type { WorkflowPolicyOperation } from './schemas/workflow-policy.schema.js';

/** Implements: workflowPolicies collection, Domain 7. */
@ApiTags('workflow-policies')
@Controller('workflow-policies')
export class WorkflowPoliciesController {
  constructor(
    private readonly service: WorkflowPoliciesService,
    private readonly configuration: ApprovalConfigurationService,
  ) {}

  /** Every entity type an administrator may put behind a review, with what is
   *  configured for each. Declared ahead of `GET :id` so `governable` is never
   *  read as an id. */
  @Get('governable')
  @RequirePermission('workflowPolicies', 'Read')
  governable() {
    return this.configuration.listGovernable();
  }

  @Post()
  @RequirePermission('workflowPolicies', 'Create')
  create(@Body() dto: CreateWorkflowPolicyDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('workflowPolicies', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** Declared ahead of `GET :id` so an entity type is never swallowed as an
   *  `:id` value — the route-ordering convention `pages.controller.ts` set. */
  @Get(':entityType/:operation')
  @RequirePermission('workflowPolicies', 'Read')
  findByPair(@Param('entityType') entityType: string, @Param('operation') operation: string) {
    const pair = this.assertPair(entityType, operation);
    return this.service.findByEntityTypeAndOperation(pair.entityType, pair.operation);
  }

  @Get(':id')
  @RequirePermission('workflowPolicies', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /**
   * Turns approvals on or off for one entity type, in one call.
   *
   * Whether a review is required, who decides and how their decisions combine
   * are applied together — separately, a half-finished change leaves a policy
   * demanding approval from a definition with nobody on it, which stops every
   * publication of that type with nothing on any screen to say why.
   */
  @Put(':entityType/approval')
  @RequirePermission('workflowPolicies', 'Update')
  configureApproval(@Param('entityType') entityType: string, @Body() dto: ConfigureApprovalDto) {
    return this.configuration.configure(entityType, {
      enabled: dto.enabled,
      mode: dto.mode,
      approverIds: dto.approverIds,
      threshold: dto.threshold,
    });
  }

  /** Sets the single policy for this pair (ADR-0069 D6). `PUT` rather than
   *  `PATCH` because the body states the whole policy, and rather than
   *  `POST` because sending it twice must not create a second one. */
  @Put(':entityType/:operation')
  @RequirePermission('workflowPolicies', 'Update')
  set(
    @Param('entityType') entityType: string,
    @Param('operation') operation: string,
    @Body() dto: SetWorkflowPolicyDto,
  ) {
    const pair = this.assertPair(entityType, operation);
    return this.service.upsert(pair.entityType, pair.operation, {
      workflowRequired: dto.workflowRequired,
      workflowDefinitionId: dto.workflowDefinitionId ?? null,
      allowHardDelete: dto.allowHardDelete,
    });
  }

  /** Path segments are strings; both are closed enums. Validated here so an
   *  unknown pair is a 400 naming the closed list, not a silent miss that
   *  reads as "no policy" and blocks publishing for a typo. */
  private assertPair(
    entityType: string,
    operation: string,
  ): { entityType: WorkflowEntityType; operation: WorkflowPolicyOperation } {
    if (!(WORKFLOW_ENTITY_TYPES as readonly string[]).includes(entityType)) {
      throw new BadRequestException(
        `Unknown entityType "${entityType}". Expected one of: ${WORKFLOW_ENTITY_TYPES.join(', ')}.`,
      );
    }
    if (!(WORKFLOW_POLICY_OPERATIONS as readonly string[]).includes(operation)) {
      throw new BadRequestException(
        `Unknown operation "${operation}". Expected one of: ${WORKFLOW_POLICY_OPERATIONS.join(', ')}.`,
      );
    }
    return {
      entityType: entityType as WorkflowEntityType,
      operation: operation as WorkflowPolicyOperation,
    };
  }
}

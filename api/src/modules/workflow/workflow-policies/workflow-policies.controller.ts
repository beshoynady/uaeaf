import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { CreateWorkflowPolicyDto } from './dto/create-workflow-policy.dto.js';

/** Implements: workflowPolicies collection, Domain 7. */
@ApiTags('workflow-policies')
@Controller('workflow-policies')
export class WorkflowPoliciesController {
  constructor(private readonly service: WorkflowPoliciesService) {}

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

  @Get(':id')
  @RequirePermission('workflowPolicies', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
}

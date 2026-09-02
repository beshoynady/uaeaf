import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { WorkflowStepsService } from './workflow-steps.service.js';
import { CreateWorkflowStepDto } from './dto/create-workflow-step.dto.js';

/** Implements: workflowSteps collection, Domain 7. */
@ApiTags('workflow-steps')
@Controller('workflow-steps')
export class WorkflowStepsController {
  constructor(private readonly service: WorkflowStepsService) {}

  @Post()
  @RequirePermission('workflowSteps', 'Create')
  create(@Body() dto: CreateWorkflowStepDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('workflowSteps', 'Read')
  findByDefinition(@Query('workflowDefinitionId') workflowDefinitionId: string) {
    return this.service.findByDefinition(workflowDefinitionId);
  }

  @Get(':id')
  @RequirePermission('workflowSteps', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('workflowSteps', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}

import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { WorkflowDefinitionsService } from './workflow-definitions.service.js';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto.js';

/** Implements: workflowDefinitions collection, Domain 7. */
@ApiTags('workflow-definitions')
@Controller('workflow-definitions')
export class WorkflowDefinitionsController {
  constructor(private readonly service: WorkflowDefinitionsService) {}

  @Post()
  @RequirePermission('workflowDefinitions', 'Create')
  create(@Body() dto: CreateWorkflowDefinitionDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('workflowDefinitions', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('workflowDefinitions', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('workflowDefinitions', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}

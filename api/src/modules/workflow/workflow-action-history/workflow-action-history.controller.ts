import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { WorkflowActionHistoryService } from './workflow-action-history.service.js';

/** Implements: workflowActionHistory collection, Domain 7. Read-only —
 *  see WorkflowActionHistoryService for why there is no write route. */
@ApiTags('workflow-action-history')
@Controller('workflow-action-history')
export class WorkflowActionHistoryController {
  constructor(private readonly service: WorkflowActionHistoryService) {}

  @Get()
  @RequirePermission('workflowActionHistory', 'Read')
  findByInstance(@Query('workflowInstanceId') workflowInstanceId: string) {
    return this.service.findByInstance(workflowInstanceId);
  }
}

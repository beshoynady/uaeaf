import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { SkipAuditLog } from '../../../common/decorators/skip-audit-log.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { WorkflowInstancesService } from './workflow-instances.service.js';
import { CreateWorkflowInstanceDto } from './dto/create-workflow-instance.dto.js';
import { ApproveWorkflowInstanceDto, RejectWorkflowInstanceDto } from './dto/action-reason.dto.js';
import { ReturnWorkflowInstanceDto } from './dto/return-workflow-instance.dto.js';
import { ResubmitWorkflowInstanceDto } from './dto/resubmit-workflow-instance.dto.js';
import { DelegateWorkflowInstanceDto } from './dto/delegate-workflow-instance.dto.js';

/**
 * Implements: workflowInstances collection, Domain 7. Every action route
 * is `@SkipAuditLog()` — WorkflowInstancesService writes its own precise
 * `auditLogs` `StatusChange` entry targeting the content entity, not
 * `workflowInstances` itself (see AuditLogInterceptor's doc comment).
 * Gated by `RequirePermission(entityType-agnostic 'workflowInstances',
 * 'Approve')` for the approval-shaped actions, per the Week 2 prompt's
 * "workflow actions require the Approve permission action on the relevant
 * resourceType" — `workflowInstances` is used as the resourceType here
 * since a workflow action is fundamentally an action ON the workflow
 * engine, not on the target entity's own collection (which has no
 * NestJS module yet — see the Week 2 completion report).
 */
@ApiTags('workflow-instances')
@Controller('workflow-instances')
export class WorkflowInstancesController {
  constructor(private readonly service: WorkflowInstancesService) {}

  @Post()
  @RequirePermission('workflowInstances', 'Create')
  @SkipAuditLog()
  create(@Body() dto: CreateWorkflowInstanceDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.create(
      {
        workflowDefinitionId: new Types.ObjectId(dto.workflowDefinitionId),
        entityType: dto.entityType,
        entityId: new Types.ObjectId(dto.entityId),
        revisionId: new Types.ObjectId(dto.revisionId),
        actorId: user.userId,
      },
      extractRequestContext(req),
    );
  }

  @Get(':id')
  @RequirePermission('workflowInstances', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post(':id/approve')
  @RequirePermission('workflowInstances', 'Approve')
  @SkipAuditLog()
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveWorkflowInstanceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.approve(id, user.userId, dto.reason, extractRequestContext(req));
  }

  @Post(':id/reject')
  @RequirePermission('workflowInstances', 'Approve')
  @SkipAuditLog()
  reject(
    @Param('id') id: string,
    @Body() dto: RejectWorkflowInstanceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.reject(id, user.userId, dto.reason, extractRequestContext(req));
  }

  @Post(':id/return')
  @RequirePermission('workflowInstances', 'Approve')
  @SkipAuditLog()
  return_(
    @Param('id') id: string,
    @Body() dto: ReturnWorkflowInstanceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.return(id, user.userId, dto.returnedToStepId, dto.reason, extractRequestContext(req));
  }

  @Post(':id/resubmit')
  @RequirePermission('workflowInstances', 'Update')
  @SkipAuditLog()
  resubmit(
    @Param('id') id: string,
    @Body() dto: ResubmitWorkflowInstanceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.resubmit(id, user.userId, dto.revisionId, extractRequestContext(req));
  }

  @Post(':id/delegate')
  @RequirePermission('workflowInstances', 'Approve')
  @SkipAuditLog()
  delegate(
    @Param('id') id: string,
    @Body() dto: DelegateWorkflowInstanceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.delegate(id, user.userId, dto.delegatedToUserId, dto.reason, extractRequestContext(req));
  }

  @Post(':id/cancel')
  @RequirePermission('workflowInstances', 'Update')
  @SkipAuditLog()
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.cancel(id, user.userId, extractRequestContext(req));
  }
}

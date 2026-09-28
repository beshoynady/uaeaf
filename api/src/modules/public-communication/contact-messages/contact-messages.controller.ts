import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RateLimit } from '../../../common/decorators/rate-limit.decorator.js';
import { SkipAuditLog } from '../../../common/decorators/skip-audit-log.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { ContactMessagesService } from './contact-messages.service.js';
import {
  CreateContactMessageDto,
  ReplyToContactMessageDto,
  UpdateContactMessageStatusDto,
} from './dto/create-contact-messages.dto.js';

/** Implements: contactMessages collection, Domain 10 — Public
 *  Communication.
 *
 *  The POST is `@Public()` — it IS the citizen-facing contact form, the one
 *  unauthenticated WRITE on the platform. Everything else is RBAC-gated:
 *  the messages themselves are `[RESTRICTED]` citizen PII and are never
 *  publicly readable. */
@ApiTags('contact-messages')
@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly service: ContactMessagesService) {}

  /** ⚠️ Flagged for an owner decision, not silently resolved: this is the
   *  platform's first unauthenticated WRITE, and `AuditLogInterceptor`
   *  skips any request with no `request.user`, so a citizen submission
   *  produces NO `auditLogs` row. That is not a crash — it is the
   *  interceptor behaving as Week 1 designed it, and `auditLogs.actorId` is
   *  a required ref → users, so an anonymous actor cannot currently be
   *  represented at all. The submission itself is still recorded (this
   *  collection's own row, with `createdAt`). Making anonymous submissions
   *  auditable would require relaxing `auditLogs.actorId` to optional —
   *  a Week 1-2 schema change this week's brief explicitly excludes. */
  @Post()
  @Public()
  @RateLimit(5, 60)
  create(@Body() dto: CreateContactMessageDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('contactMessages', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** The count behind the dashboard header's bell. Before `:id` — Nest
   *  matches in declaration order. */
  @Get('summary')
  @RequirePermission('contactMessages', 'Read')
  summary() {
    return this.service.summary();
  }

  /** Before `:id` — Nest matches in declaration order. */
  @Get('export')
  @RequirePermission('contactMessages', 'Export')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="contact-messages.csv"')
  exportCsv() {
    return this.service.exportCsv();
  }

  @Get(':id')
  @RequirePermission('contactMessages', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/status')
  @RequirePermission('contactMessages', 'Update')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateContactMessageStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @Patch(':id/reply')
  @RequirePermission('contactMessages', 'Update')
  reply(
    @Param('id') id: string,
    @Body() dto: ReplyToContactMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reply(id, dto, new Types.ObjectId(user.userId));
  }

  @Delete(':id')
  @RequirePermission('contactMessages', 'Archive')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }

  /** Not `:id/restore`: that path is the revision restore elsewhere in this API
   *  (ADR-0120). */
  @Post(':id/unarchive')
  @RequirePermission('contactMessages', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }

  /**
   * Erases the message for good — a citizen's own submission, which an archive
   * does not satisfy under a PDPL erasure request.
   *
   * Its three conditions are in ADR-0120 §D5 and every one of them is checked in
   * the service, which is what makes them unskippable: step-up verification has
   * nothing to verify against in this API, so every request here is refused
   * before anything is read or removed.
   */
  @Delete(':id/record')
  @RequirePermission('contactMessages', 'PermanentDelete')
  @SkipAuditLog()
  @HttpCode(HttpStatus.NO_CONTENT)
  permanentDelete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.permanentDelete(id, user, extractRequestContext(req));
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { ContactMessagesService } from './contact-messages.service.js';
import {
  CreateContactMessageDto,
  ReplyToContactMessageDto,
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

  @Get(':id')
  @RequirePermission('contactMessages', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
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
  @RequirePermission('contactMessages', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { NotificationsService } from './notifications.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';

/** Implements: notifications collection, Domain 7. `GET /me` and
 *  `PATCH :id/read` carry no @RequirePermission — any authenticated user
 *  manages their own notifications, gated only by JwtAuthGuard (same
 *  pattern as `GET /users/me`). */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  @RequirePermission('notifications', 'Create')
  create(@Body() dto: CreateNotificationDto) {
    return this.service.create(dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findForRecipient(user.userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markRead(id, user.userId);
  }
}

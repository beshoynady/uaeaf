import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TRIGGER_TYPES,
  NOTIFICATION_TYPES,
} from '../schemas/notification.schema.js';
import type {
  NotificationChannel,
  NotificationTriggerType,
  NotificationType,
} from '../schemas/notification.schema.js';

/** Request body for POST /notifications. */
export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification event class.', enum: NOTIFICATION_TYPES })
  @IsIn(NOTIFICATION_TYPES)
  type: NotificationType;

  @ApiProperty({ description: 'Recipient user id.' })
  @IsMongoId()
  recipientId: string;

  @ApiProperty({ description: 'What triggered this notification.', enum: NOTIFICATION_TRIGGER_TYPES })
  @IsIn(NOTIFICATION_TRIGGER_TYPES)
  triggerType: NotificationTriggerType;

  @ApiProperty({ description: 'Id of the triggering record (poly, matches triggerType).' })
  @IsMongoId()
  triggerId: string;

  @ApiProperty({ description: 'Delivery channel.', enum: NOTIFICATION_CHANNELS })
  @IsIn(NOTIFICATION_CHANNELS)
  channel: NotificationChannel;
}

import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationsRepository } from './notifications.repository.js';
import type { NotificationDocument } from './schemas/notification.schema.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import type { NotificationType, NotificationTriggerType } from './schemas/notification.schema.js';

/** Implements: notifications collection, Domain 7 (FigJam node `100:7722`). */
@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
    return this.repository.create({
      type: dto.type,
      recipientId: new Types.ObjectId(dto.recipientId),
      triggerType: dto.triggerType,
      triggerId: new Types.ObjectId(dto.triggerId),
      channel: dto.channel,
    });
  }

  /** Convenience for a caller (e.g. a future WorkflowInstancesService
   *  integration to notify a step's assignees) to create a notification
   *  without going through the HTTP DTO layer — not currently wired to any
   *  workflow action; see the Week 2 completion report. */
  async notify(input: {
    type: NotificationType;
    recipientId: Types.ObjectId;
    triggerType: NotificationTriggerType;
    triggerId: Types.ObjectId;
  }): Promise<NotificationDocument> {
    return this.repository.create({ ...input, channel: 'In-App' });
  }

  async findForRecipient(recipientId: string): Promise<NotificationDocument[]> {
    return this.repository.findByRecipient(new Types.ObjectId(recipientId));
  }

  /** Scoped to the caller — see NotificationsRepository.markReadForRecipient
   *  for why this is not a plain `updateById`. */
  async markRead(id: string, recipientId: string): Promise<NotificationDocument | null> {
    return this.repository.markReadForRecipient(id, new Types.ObjectId(recipientId));
  }
}

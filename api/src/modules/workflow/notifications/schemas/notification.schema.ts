import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';

export type NotificationDocument = HydratedDocument<Notification>;

export const NOTIFICATION_TYPES = [
  'ApprovalRequired',
  'ApprovalCompleted',
  'RecordPendingReview',
  'ContactMessageAssigned',
  'ContentPublished',
  'General',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TRIGGER_TYPES = ['WorkflowInstance', 'RecordCandidate', 'ContactMessage'] as const;
export type NotificationTriggerType = (typeof NOTIFICATION_TRIGGER_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['In-App', 'Email', 'Push', 'WhatsApp'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_DELIVERY_STATES = ['Pending', 'Sent', 'Failed'] as const;
export type NotificationDeliveryState = (typeof NOTIFICATION_DELIVERY_STATES)[number];

/** Implements: notifications collection, Domain 7 (FigJam node `100:7722`,
 *  re-read fresh 2026-09-02). `triggerId` is polymorphic across
 *  `WorkflowInstance | RecordCandidate | ContactMessage` (matching
 *  `triggerType`) — plain `ObjectId`, no `ref`. No `workflowStepId` field
 *  exists on the live board; step-level context for a workflow-triggered
 *  notification is only reachable via a second hop through
 *  `workflowInstances.currentStepId` — a known, documented engine-level
 *  gap, not something this module fabricates a field for. */
@Schema({ collection: 'notifications' })
export class Notification extends BaseSchema {
  @Prop({ type: String, enum: NOTIFICATION_TYPES, required: true })
  type: NotificationType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  @Prop({ type: String, enum: NOTIFICATION_TRIGGER_TYPES, required: true })
  triggerType: NotificationTriggerType;

  @Prop({ type: Types.ObjectId, required: true })
  triggerId: Types.ObjectId;

  @Prop({ type: String, enum: NOTIFICATION_CHANNELS, required: true })
  channel: NotificationChannel;

  @Prop({ type: Boolean, required: true, default: false })
  readState: boolean;

  @Prop({ type: String, enum: NOTIFICATION_DELIVERY_STATES, required: true, default: 'Pending' })
  deliveryState: NotificationDeliveryState;

  @Prop({ type: Date, required: true, default: Date.now })
  timestamp: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
// Notification Centre: "unread notifications for this user, newest first"
// (docs/product/06-Database-Architecture.md §11; schema-audit-2026-09-04.md
// §3.2/§7, P1 finding).
NotificationSchema.index({ recipientId: 1, readState: 1, timestamp: -1 });

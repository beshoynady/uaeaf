import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';

export type ContactMessageDocument = HydratedDocument<ContactMessage>;

/** One model, not four — per the board. */
export const CONTACT_MESSAGE_TYPES = ['Complaint', 'Suggestion', 'Inquiry', 'General'] as const;
export type ContactMessageType = (typeof CONTACT_MESSAGE_TYPES)[number];

/** The message's OWN lifecycle — primary/owned here, NOT a denormalized
 *  mirror of anything. `contactMessages` has no `publicationState`. */
export const CONTACT_MESSAGE_STATUSES = ['New', 'InProgress', 'Resolved', 'Closed'] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

export const CONTACT_MESSAGE_ASSIGNEE_TYPES = ['User', 'Role'] as const;
export type ContactMessageAssigneeType = (typeof CONTACT_MESSAGE_ASSIGNEE_TYPES)[number];

/** Which of the sender's contact channels the reply went out through. */
export const CONTACT_MESSAGE_REPLY_CHANNELS = ['Email', 'Phone'] as const;
export type ContactMessageReplyChannel = (typeof CONTACT_MESSAGE_REPLY_CHANNELS)[number];

/** Implements: contactMessages collection, Domain 10 — Public
 *  Communication (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  List A but NOT List B (domain note `100:7435`, re-verified verbatim
 *  this week): a citizen's message can be routed through an internal
 *  approval workflow via `workflowInstanceId`, but it has no
 *  `publicationState` and is never "published", so it never produces a
 *  `revisions` or `publications` row. `ContactMessagesService` therefore
 *  exposes no `getPublicSnapshot()` — there is nothing publishable.
 *
 *  PERMANENT ERASURE: because this collection is structurally excluded from
 *  `revisions`, the standard "blocked while revisions reference it" check
 *  that protects the other twelve workflow-eligible entities can never
 *  apply here. What protects it instead is ADR-0120's three conditions —
 *  step-up verification, archived first, and an audit row written before the
 *  removal — enforced in `ContactMessagesService.permanentDelete()`.
 *
 *  Almost every field is `[RESTRICTED]`: this is a private citizen
 *  submission record, not public data. The board also lists no `createdBy`
 *  for it (an inbound message has no internal author); `BaseSchema`
 *  supplies the field uniformly and it simply stays null for
 *  citizen-submitted rows. */
@Schema({ collection: 'contactMessages', timestamps: true })
export class ContactMessage extends BaseSchema {
  @Prop({ type: String, enum: CONTACT_MESSAGE_TYPES, required: true })
  messageType: ContactMessageType;

  @Prop({ type: String, required: true })
  senderName: string;

  /** Nullable since 2026-09-10: the public form no longer requires an email
   *  address (`CreateContactMessageDto`), and a `required: true` here would
   *  turn every phone-only submission into a Mongoose ValidationError — a 500
   *  the citizen reads as "the message could not be sent". Widening a stored
   *  field is safe for the rows that already have one. */
  @Prop({ type: String, default: null })
  senderEmail: string | null;

  /** Required by the DTO, not here — the reason is written out beside it. */
  @Prop({ type: String, default: null })
  senderPhone: string | null;

  /** The subject line from the public form. Optional — the form does not
   *  require it, and messages predating the field have none. */
  @Prop({ type: String, default: null })
  subject: string | null;

  @Prop({ type: String, required: true })
  messageBody: string;

  @Prop({ type: String, enum: CONTACT_MESSAGE_STATUSES, required: true, default: 'New' })
  status: ContactMessageStatus;

  /** Poly → `users | roles`. Message routing is a platform/dashboard
   *  operational concern, deliberately independent of the federation's own
   *  organizational structure (this replaced an earlier `departmentId`). */
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  assignedToId: Types.ObjectId | null;

  @Prop({ type: String, enum: CONTACT_MESSAGE_ASSIGNEE_TYPES, default: null })
  assignedToType: ContactMessageAssigneeType | null;

  /** Set only if a formal workflow was triggered. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'WorkflowInstance', default: null })
  workflowInstanceId: Types.ObjectId | null;

  /** The reply text written by the assigned staff member. The system
   *  RECORDS what was said; it does not itself send the email/SMS — that
   *  is an external integration at the service layer, not a schema
   *  concern, and is deliberately not implemented here. */
  @Prop({ type: String, default: null })
  replyBody: string | null;

  @Prop({ type: Date, default: null })
  repliedAt: Date | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  repliedBy: Types.ObjectId | null;

  @Prop({ type: String, enum: CONTACT_MESSAGE_REPLY_CHANNELS, default: null })
  replyChannel: ContactMessageReplyChannel | null;
}

export const ContactMessageSchema = SchemaFactory.createForClass(ContactMessage);
ContactMessageSchema.index({ status: 1, createdAt: -1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';

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
 *  HARDDELETE SAFEGUARD (board note, 2026-09-02): because this collection
 *  is structurally excluded from `revisions`, the standard "blocked while
 *  revisions reference it" HardDelete check that protects the other twelve
 *  workflow-eligible entities can never apply. `hardDeleteEligibleAt` is
 *  its entity-specific replacement: HardDelete is permitted only once that
 *  timestamp is set AND has passed — a deliberate review/cooldown window
 *  before a citizen's PII can be permanently erased. Enforced in
 *  `ContactMessagesService.assertHardDeletable()`.
 *
 *  Almost every field is `[RESTRICTED]`: this is a private citizen
 *  submission record, not public data. The board also lists no `createdBy`
 *  for it (an inbound message has no internal author); `BaseSchema`
 *  supplies the field uniformly and it simply stays null for
 *  citizen-submitted rows. */
@Schema({ collection: 'contactMessages' })
export class ContactMessage extends BaseSchema {
  @Prop({ type: String, enum: CONTACT_MESSAGE_TYPES, required: true })
  messageType: ContactMessageType;

  @Prop({ type: String, required: true })
  senderName: string;

  @Prop({ type: String, required: true })
  senderEmail: string;

  @Prop({ type: String, default: null })
  senderPhone: string | null;

  @Prop({ type: String, required: true })
  messageBody: string;

  @Prop({ type: String, enum: CONTACT_MESSAGE_STATUSES, required: true, default: 'New' })
  status: ContactMessageStatus;

  /** Null by default; HardDelete stays blocked until this is set and has
   *  passed — see the HARDDELETE SAFEGUARD note above. */
  @Prop({ type: Date, default: null })
  hardDeleteEligibleAt: Date | null;

  /** Poly → `users | roles`. Message routing is a platform/dashboard
   *  operational concern, deliberately independent of the federation's own
   *  organizational structure (this replaced an earlier `departmentId`). */
  @Prop({ type: Types.ObjectId, default: null })
  assignedToId: Types.ObjectId | null;

  @Prop({ type: String, enum: CONTACT_MESSAGE_ASSIGNEE_TYPES, default: null })
  assignedToType: ContactMessageAssigneeType | null;

  /** Set only if a formal workflow was triggered. */
  @Prop({ type: Types.ObjectId, ref: 'WorkflowInstance', default: null })
  workflowInstanceId: Types.ObjectId | null;

  /** The reply text written by the assigned staff member. The system
   *  RECORDS what was said; it does not itself send the email/SMS — that
   *  is an external integration at the service layer, not a schema
   *  concern, and is deliberately not implemented here. */
  @Prop({ type: String, default: null })
  replyBody: string | null;

  @Prop({ type: Date, default: null })
  repliedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  repliedBy: Types.ObjectId | null;

  @Prop({ type: String, enum: CONTACT_MESSAGE_REPLY_CHANNELS, default: null })
  replyChannel: ContactMessageReplyChannel | null;
}

export const ContactMessageSchema = SchemaFactory.createForClass(ContactMessage);
ContactMessageSchema.index({ status: 1, createdAt: -1 });

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContactMessagesRepository } from './contact-messages.repository.js';
import type { ContactMessageDocument } from './schemas/contact-messages.schema.js';
import {
  CreateContactMessageDto,
  ReplyToContactMessageDto,
} from './dto/create-contact-messages.dto.js';

/** Implements: contactMessages collection, Domain 10 — Public
 *  Communication.
 *
 *  List A but NOT List B. There is deliberately NO `getPublicSnapshot()`
 *  here: the collection produces no `publications`/`revisions` rows, so
 *  the Week 2 public-snapshot path does not apply — copying the
 *  `DocumentsService` mode (a) shape wholesale would have been wrong.
 *  Workflow participation is via `workflowInstanceId` only. */
@Injectable()
export class ContactMessagesService {
  constructor(private readonly repository: ContactMessagesRepository) {}

  /** Public submission. Server-sets `status='New'`; every operational and
   *  reply field stays null until staff act (see `CreateContactMessageDto`). */
  async create(dto: CreateContactMessageDto): Promise<ContactMessageDocument> {
    return this.repository.create({
      messageType: dto.messageType,
      senderName: dto.senderName,
      senderEmail: dto.senderEmail,
      senderPhone: dto.senderPhone ?? null,
      messageBody: dto.messageBody,
      status: 'New',
      hardDeleteEligibleAt: null,
      assignedToId: null,
      assignedToType: null,
      workflowInstanceId: null,
      replyBody: null,
      repliedAt: null,
      repliedBy: null,
      replyChannel: null,
    });
  }

  async findAll(): Promise<ContactMessageDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<ContactMessageDocument | null> {
    return this.repository.findById(id);
  }

  /** Records a staff reply. The system stores WHAT was said and through
   *  which channel; actually delivering the email/SMS is an external
   *  integration, explicitly out of schema/service scope per the board.
   *  @throws NotFoundException when the message doesn't exist. */
  async reply(
    id: string,
    dto: ReplyToContactMessageDto,
    repliedBy: Types.ObjectId,
  ): Promise<ContactMessageDocument | null> {
    const message = await this.repository.findById(id);
    if (!message) {
      throw new NotFoundException(`Contact message ${id} not found.`);
    }

    return this.repository.updateById(id, {
      replyBody: dto.replyBody,
      replyChannel: dto.replyChannel,
      repliedAt: new Date(),
      repliedBy,
    });
  }

  /** The entity-specific HardDelete gate (board note, 2026-09-02).
   *
   *  Unlike the other twelve workflow-eligible entities, this one can never
   *  be protected by the "blocked while revisions reference it" rule — it
   *  has no revisions. Permanent erasure of a citizen's PII is instead
   *  gated on `hardDeleteEligibleAt` being both SET and PASSED, giving a
   *  deliberate review/cooldown window.
   *  @throws NotFoundException when the message doesn't exist.
   *  @throws ForbiddenException while the cooldown is unset or unexpired. */
  async assertHardDeletable(id: string, now: Date = new Date()): Promise<void> {
    const message = await this.repository.findById(id);
    if (!message) {
      throw new NotFoundException(`Contact message ${id} not found.`);
    }
    if (!message.hardDeleteEligibleAt) {
      throw new ForbiddenException(
        `Contact message ${id} cannot be hard-deleted: hardDeleteEligibleAt is not set.`,
      );
    }
    if (message.hardDeleteEligibleAt > now) {
      throw new ForbiddenException(
        `Contact message ${id} cannot be hard-deleted before ${message.hardDeleteEligibleAt.toISOString()}.`,
      );
    }
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<ContactMessageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContactMessagesRepository } from './contact-messages.repository.js';
import type { ContactMessageDocument, ContactMessageStatus } from './schemas/contact-messages.schema.js';
import {
  CreateContactMessageDto,
  ReplyToContactMessageDto,
} from './dto/create-contact-messages.dto.js';
import { toCsv, type CsvColumn } from '../../../common/utils/csv.util.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import { auditActionFor } from '../../workflow/audit-logs/audit-action.util.js';
import {
  assertArchivedFirst,
  STEP_UP_VERIFIER,
  type StepUpVerifier,
} from '../../../common/authz/archive-restore.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/** Column order for `contactMessages:Export`. Assignment and workflow ids
 *  are omitted — they are internal plumbing, not answers. */
const CONTACT_MESSAGE_EXPORT_COLUMNS: readonly CsvColumn[] = [
  { key: 'messageType', header: 'Type' },
  { key: 'status', header: 'Status' },
  { key: 'senderName', header: 'Sender' },
  { key: 'senderEmail', header: 'Email' },
  { key: 'senderPhone', header: 'Phone' },
  { key: 'subject', header: 'Subject' },
  { key: 'messageBody', header: 'Message' },
  { key: 'replyBody', header: 'Reply' },
  { key: 'repliedAt', header: 'Replied at' },
  { key: 'replyChannel', header: 'Reply channel' },
];

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
  constructor(
    private readonly repository: ContactMessagesRepository,
    @Inject(STEP_UP_VERIFIER) private readonly stepUp: StepUpVerifier,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /** The inbox as a spreadsheet, behind `contactMessages:Export` — the
   *  reporting need the owner recorded as requirement #11 (periodic reply
   *  counts) is answered from this file until the Reports section exists. */
  async exportCsv(): Promise<string> {
    return toCsv(
      (await this.repository.find()) as unknown as Record<string, unknown>[],
      CONTACT_MESSAGE_EXPORT_COLUMNS,
    );
  }

  /** Public submission. Server-sets `status='New'`; every operational and
   *  reply field stays null until staff act (see `CreateContactMessageDto`). */
  async create(dto: CreateContactMessageDto): Promise<ContactMessageDocument> {
    return this.repository.create({
      messageType: dto.messageType,
      senderName: dto.senderName,
      senderEmail: dto.senderEmail ?? null,
      senderPhone: dto.senderPhone ?? null,
      subject: dto.subject ?? null,
      messageBody: dto.messageBody,
      status: 'New',
      assignedToId: null,
      assignedToType: null,
      workflowInstanceId: null,
      replyBody: null,
      repliedAt: null,
      repliedBy: null,
      replyChannel: null,
    });
  }

  /** Newest first: the inbox is read from the top. */
  async findAll(): Promise<ContactMessageDocument[]> {
    return this.repository.findNewestFirst();
  }

  /** What the dashboard header's bell shows. `New` is the unread state;
   *  a message leaves it when someone opens it or moves it on. */
  async summary(): Promise<{ newCount: number }> {
    return { newCount: await this.repository.countByStatus('New') };
  }

  /** Moves a message between the four statuses. Any status may follow any
   *  other: `New` again is "mark as unread", and a closed message reopens.
   *  @throws NotFoundException when the message doesn't exist. */
  async updateStatus(id: string, status: ContactMessageStatus): Promise<ContactMessageDocument | null> {
    const message = await this.repository.findById(id);
    if (!message) {
      throw new NotFoundException(`Contact message ${id} not found.`);
    }

    return this.repository.updateById(id, { status });
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

  /**
   * Erases the message for good.
   *
   * Three conditions, in this order (ADR-0120 §D5): step-up verification,
   * archived first, and an audit row written before the removal. No reference
   * check — a message is linked to nothing, and it produces no revisions either,
   * so the "blocked while revisions reference it" rule the other twelve
   * workflow-eligible entities rely on has nothing to look at here.
   *
   * The read is `findIncludingArchived`: a read filtering `archivedAt: null`
   * finds only the messages archive-first refuses.
   *
   * @throws ForbiddenException when step-up verification cannot be presented —
   *   which is every caller today, so nothing below it is reachable.
   * @throws NotFoundException when the message doesn't exist.
   * @throws ConflictException while the message is still live.
   */
  permanentDelete = async (
    id: string,
    actor: AuthenticatedUser,
    context: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> => {
    await this.stepUp.assertVerified(`contact message ${id}`);

    const message = await this.repository.findIncludingArchived(id);
    if (!message) {
      throw new NotFoundException(`Contact message ${id} not found.`);
    }
    assertArchivedFirst(message, `Contact message ${id}`);

    // Derived from this route's own (method, permission) pair, never typed in:
    // `audit-action-literal-scan.spec.ts` forbids the literal.
    const action = auditActionFor('DELETE', 'PermanentDelete');
    if (!action) {
      throw new Error('No audit action for DELETE PermanentDelete.');
    }

    const subject = {
      actorId: new Types.ObjectId(actor.userId),
      action,
      entityType: 'contactMessages',
      entityId: message._id as Types.ObjectId,
      ipAddress: context.ipAddress ?? '',
      userAgent: context.userAgent ?? '',
      previousValue: null,
      // The sender, the subject and the body are deliberately absent: erasing a
      // citizen's submission while copying it into a collection that is readable
      // over HTTP would not be an erasure.
      newValue: {
        messageType: message.messageType,
        status: message.status,
        archivedAt: message.archivedAt,
      },
    };

    // Recorded before the removal: written afterwards, a failing audit write
    // would leave an irreversible erasure with no trace. The log is append-only,
    // so a failure is a second row rather than an edit to this one.
    await this.auditLogsService.write({
      ...subject,
      reason: 'Permanent erasure authorised; removing the record',
    });

    try {
      await this.repository.hardDelete(id);
    } catch (cause) {
      await this.auditLogsService.write({
        ...subject,
        reason: 'The record could not be removed',
      });
      throw cause;
    }
  };

  async remove(id: string, archivedBy: Types.ObjectId): Promise<ContactMessageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<ContactMessageDocument | null> {
    return this.repository.restore(id);
  }
}

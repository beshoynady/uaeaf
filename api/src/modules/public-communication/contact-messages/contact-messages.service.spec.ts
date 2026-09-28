import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContactMessagesService } from './contact-messages.service.js';
import { ContactMessagesRepository } from './contact-messages.repository.js';
import type { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import {
  UnavailableStepUpVerifier,
  type StepUpVerifier,
} from '../../../common/authz/archive-restore.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

describe('ContactMessagesService', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      findNewestFirst: jest.fn(),
      countByStatus: jest.fn(),
      findIncludingArchived: jest.fn(),
      hardDelete: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    }) as unknown as jest.Mocked<ContactMessagesRepository>;

  const makeAuditLogs = () =>
    ({
      write: jest.fn<AuditLogsService['write']>().mockResolvedValue({} as never),
    }) as unknown as jest.Mocked<AuditLogsService>;

  /** A verifier that lets the call through, so the conditions BELOW step-up can
   *  be exercised. The production one refuses — see the first test below. */
  const passingStepUp = (): StepUpVerifier => ({ assertVerified: async () => undefined });

  const submission = {
    messageType: 'Complaint' as const,
    senderName: 'Citizen',
    senderPhone: '+971 50 123 4567',
    messageBody: 'Body text.',
  };

  describe('create (public submission)', () => {
    it('server-sets status New and leaves every operational and reply field null', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await service.create(submission);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'New',
          assignedToId: null,
          assignedToType: null,
          workflowInstanceId: null,
          replyBody: null,
          repliedAt: null,
          repliedBy: null,
          replyChannel: null,
        }),
      );
    });

    it('stores null rather than undefined when no email address was given', async () => {
      // ADR-0067 D11 made the address optional. `undefined` would leave the
      // stored document without the key at all, so a later `$set` on it would
      // be the first thing to create it — and every read in between would have
      // to cope with a field that is sometimes absent rather than sometimes
      // null. The schema's default is null; this keeps the write agreeing.
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await service.create(submission);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ senderEmail: null, senderPhone: '+971 50 123 4567' }),
      );
    });
  });

  describe('the inbox (owner request 2026-09-22)', () => {
    it('lists the messages newest first', async () => {
      const repository = makeRepository();
      const rows = [{ senderName: 'newest' }, { senderName: 'oldest' }];
      repository.findNewestFirst.mockResolvedValue(rows as never);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await expect(service.findAll()).resolves.toBe(rows);
    });

    it('counts the new messages for the header bell', async () => {
      // "New" is the unread state: no second read flag exists to drift from it.
      const repository = makeRepository();
      repository.countByStatus.mockResolvedValue(3);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await expect(service.summary()).resolves.toEqual({ newCount: 3 });
      expect(repository.countByStatus).toHaveBeenCalledWith('New');
    });
  });

  describe('updateStatus', () => {
    it('moves a message to the status given and nothing else', async () => {
      const repository = makeRepository();
      const id = new Types.ObjectId().toString();
      repository.findById.mockResolvedValue({ _id: id, status: 'New' } as never);
      repository.updateById.mockResolvedValue({ _id: id, status: 'InProgress' } as never);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await expect(service.updateStatus(id, 'InProgress')).resolves.toEqual({ _id: id, status: 'InProgress' });
      expect(repository.updateById).toHaveBeenCalledWith(id, { status: 'InProgress' });
    });

    it('throws NotFoundException for an unknown or archived message', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(null);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await expect(service.updateStatus(new Types.ObjectId().toString(), 'Closed')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('reply', () => {
    it('records the reply text, channel, time and author', async () => {
      const repository = makeRepository();
      const id = new Types.ObjectId().toString();
      const repliedBy = new Types.ObjectId();
      repository.findById.mockResolvedValue({ _id: id } as never);
      repository.updateById.mockResolvedValue({} as never);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await service.reply(id, { replyBody: 'Thank you.', replyChannel: 'Email' }, repliedBy);

      expect(repository.updateById).toHaveBeenCalledWith(id, {
        replyBody: 'Thank you.',
        replyChannel: 'Email',
        repliedAt: expect.any(Date),
        repliedBy,
      });
    });

    it('throws NotFoundException for an unknown message', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(null);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await expect(
        service.reply(new Types.ObjectId().toString(), { replyBody: 'x', replyChannel: 'Email' }, new Types.ObjectId()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * Permanent erasure, and the three conditions that gate it (ADR-0120 §D5):
   * step-up verification, archived first, and an audit row written before the
   * removal. No reference check — a message is linked to nothing.
   */
  describe('permanentDelete', () => {
    const actor = { userId: new Types.ObjectId().toString() } as AuthenticatedUser;
    const archived = {
      _id: new Types.ObjectId(),
      messageType: 'Complaint',
      status: 'Closed',
      senderName: 'Citizen',
      senderEmail: 'citizen@example.ae',
      messageBody: 'Body text.',
      archivedAt: new Date('2026-08-01'),
    };

    /** Step-up is checked at the service entry, not at the route, so a caller
     *  that does not go through a controller cannot skip it. */
    it('refuses without step-up verification, and reads nothing', async () => {
      const repository = makeRepository();
      const auditLogs = makeAuditLogs();
      const service = new ContactMessagesService(
        repository,
        new UnavailableStepUpVerifier(),
        auditLogs,
      );

      await expect(service.permanentDelete('id', actor)).rejects.toMatchObject({
        response: { code: 'mfa_step_up_required' },
      });
      expect(repository.findIncludingArchived).not.toHaveBeenCalled();
      expect(repository.hardDelete).not.toHaveBeenCalled();
      expect(auditLogs.write).not.toHaveBeenCalled();
    });

    it('reads the archived row, which is the only kind that can be erased', async () => {
      const repository = makeRepository();
      repository.findIncludingArchived.mockResolvedValue(archived as never);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await service.permanentDelete('id', actor);

      expect(repository.findIncludingArchived).toHaveBeenCalledWith('id');
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('refuses a message that has not been archived first, and removes nothing', async () => {
      const repository = makeRepository();
      repository.findIncludingArchived.mockResolvedValue({
        ...archived,
        archivedAt: null,
      } as never);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await expect(service.permanentDelete('id', actor)).rejects.toThrow(ConflictException);
      expect(repository.hardDelete).not.toHaveBeenCalled();
    });

    it('reports an unknown message as not found', async () => {
      const repository = makeRepository();
      repository.findIncludingArchived.mockResolvedValue(null);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await expect(service.permanentDelete('missing', actor)).rejects.toThrow(NotFoundException);
    });

    it('removes the row once the three conditions are satisfied', async () => {
      const repository = makeRepository();
      repository.findIncludingArchived.mockResolvedValue(archived as never);
      const service = new ContactMessagesService(repository, passingStepUp(), makeAuditLogs());

      await service.permanentDelete('id', actor);

      expect(repository.hardDelete).toHaveBeenCalledWith('id');
    });

    /** Written afterwards, a failing audit write would leave an irreversible
     *  erasure with no trace and a 500 saying nothing happened. */
    it('records the erasure before removing the row', async () => {
      const repository = makeRepository();
      const auditLogs = makeAuditLogs();
      repository.findIncludingArchived.mockResolvedValue(archived as never);
      const service = new ContactMessagesService(repository, passingStepUp(), auditLogs);

      await service.permanentDelete('id', actor);

      expect(auditLogs.write.mock.invocationCallOrder[0]).toBeLessThan(
        repository.hardDelete.mock.invocationCallOrder[0],
      );
    });

    it('removes nothing when the audit row cannot be written', async () => {
      const repository = makeRepository();
      const auditLogs = makeAuditLogs();
      auditLogs.write.mockRejectedValue(new Error('audit down') as never);
      repository.findIncludingArchived.mockResolvedValue(archived as never);
      const service = new ContactMessagesService(repository, passingStepUp(), auditLogs);

      await expect(service.permanentDelete('id', actor)).rejects.toThrow('audit down');
      expect(repository.hardDelete).not.toHaveBeenCalled();
    });

    /** Append-only: an outcome that differs from the intent is a second row,
     *  never an edit to the first. */
    it('appends a second row when the removal fails', async () => {
      const repository = makeRepository();
      const auditLogs = makeAuditLogs();
      repository.findIncludingArchived.mockResolvedValue(archived as never);
      repository.hardDelete.mockRejectedValue(new Error('driver down') as never);
      const service = new ContactMessagesService(repository, passingStepUp(), auditLogs);

      await expect(service.permanentDelete('id', actor)).rejects.toThrow('driver down');
      expect(auditLogs.write).toHaveBeenCalledTimes(2);
      expect(auditLogs.write.mock.calls[1][0].reason).toContain('could not be removed');
    });

    it('records the erasure without copying back what was erased', async () => {
      const repository = makeRepository();
      const auditLogs = makeAuditLogs();
      repository.findIncludingArchived.mockResolvedValue(archived as never);
      const service = new ContactMessagesService(repository, passingStepUp(), auditLogs);

      await service.permanentDelete('id', actor, { ipAddress: '10.0.0.1', userAgent: 'jest' });

      const row = auditLogs.write.mock.calls[0][0];
      expect(row).toMatchObject({
        action: 'PermanentDelete',
        entityType: 'contactMessages',
        entityId: archived._id,
        previousValue: null,
        ipAddress: '10.0.0.1',
        userAgent: 'jest',
      });
      const recorded = JSON.stringify(row.newValue);
      expect(recorded).not.toContain('citizen@example.ae');
      expect(recorded).not.toContain('Body text.');
      expect(recorded).not.toContain('Citizen');
    });
  });
});

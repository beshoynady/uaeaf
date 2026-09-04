import { jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContactMessagesService } from './contact-messages.service.js';
import { ContactMessagesRepository } from './contact-messages.repository.js';

describe('ContactMessagesService', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
    }) as unknown as jest.Mocked<ContactMessagesRepository>;

  const submission = {
    messageType: 'Complaint' as const,
    senderName: 'Citizen',
    senderEmail: 'citizen@example.com',
    messageBody: 'Body text.',
  };

  describe('create (public submission)', () => {
    it('server-sets status New and leaves every operational and reply field null', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new ContactMessagesService(repository);

      await service.create(submission);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'New',
          hardDeleteEligibleAt: null,
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
  });

  describe('reply', () => {
    it('records the reply text, channel, time and author', async () => {
      const repository = makeRepository();
      const id = new Types.ObjectId().toString();
      const repliedBy = new Types.ObjectId();
      repository.findById.mockResolvedValue({ _id: id } as never);
      repository.updateById.mockResolvedValue({} as never);
      const service = new ContactMessagesService(repository);

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
      const service = new ContactMessagesService(repository);

      await expect(
        service.reply(new Types.ObjectId().toString(), { replyBody: 'x', replyChannel: 'Email' }, new Types.ObjectId()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertHardDeletable (entity-specific PII safeguard)', () => {
    it('blocks HardDelete while hardDeleteEligibleAt is unset', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({ hardDeleteEligibleAt: null } as never);
      const service = new ContactMessagesService(repository);

      await expect(service.assertHardDeletable('id')).rejects.toThrow(ForbiddenException);
    });

    it('blocks HardDelete while the cooldown has not yet passed', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        hardDeleteEligibleAt: new Date('2026-12-31'),
      } as never);
      const service = new ContactMessagesService(repository);

      await expect(
        service.assertHardDeletable('id', new Date('2026-09-03')),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permits HardDelete once the cooldown has passed', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        hardDeleteEligibleAt: new Date('2026-01-01'),
      } as never);
      const service = new ContactMessagesService(repository);

      await expect(
        service.assertHardDeletable('id', new Date('2026-09-03')),
      ).resolves.toBeUndefined();
    });

    it('throws NotFoundException for an unknown message', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(null);
      const service = new ContactMessagesService(repository);

      await expect(service.assertHardDeletable('missing')).rejects.toThrow(NotFoundException);
    });
  });
});

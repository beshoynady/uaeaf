import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContactMessagesController } from './contact-messages.controller.js';
import { ContactMessagesService } from './contact-messages.service.js';
import type { ContactMessagesRepository } from './contact-messages.repository.js';
import type { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import { UnavailableStepUpVerifier } from '../../../common/authz/archive-restore.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * Erasing a citizen's submission is irreversible, so it is refused for want of
 * step-up verification — and the refusal is proven through the route, with the
 * real service and the real verifier behind it, because a refusal asserted
 * against a mocked service proves only that the mock was configured.
 */
describe('ContactMessagesController — the permanent delete route', () => {
  const actor = { userId: new Types.ObjectId().toString() } as AuthenticatedUser;
  const request = { ip: '10.0.0.1', headers: { 'user-agent': 'jest' } } as never;

  const build = () => {
    const repository = {
      findIncludingArchived: jest.fn(),
      hardDelete: jest.fn(),
    } as unknown as jest.Mocked<ContactMessagesRepository>;
    const auditLogs = {
      write: jest.fn<AuditLogsService['write']>().mockResolvedValue({} as never),
    } as unknown as jest.Mocked<AuditLogsService>;
    const service = new ContactMessagesService(
      repository,
      new UnavailableStepUpVerifier(),
      auditLogs,
    );
    return { repository, auditLogs, controller: new ContactMessagesController(service) };
  };

  it('refuses with the step-up code', async () => {
    const { controller } = build();

    await expect(controller.permanentDelete('abc', actor, request)).rejects.toMatchObject({
      response: { code: 'mfa_step_up_required' },
    });
  });

  it('reads nothing, removes nothing and records nothing', async () => {
    const { controller, repository, auditLogs } = build();

    await expect(controller.permanentDelete('abc', actor, request)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.findIncludingArchived).not.toHaveBeenCalled();
    expect(repository.hardDelete).not.toHaveBeenCalled();
    expect(auditLogs.write).not.toHaveBeenCalled();
  });
});

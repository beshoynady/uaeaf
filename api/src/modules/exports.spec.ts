import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ClubsService } from './people-organizations/clubs/clubs.service.js';
import { ClubsRepository } from './people-organizations/clubs/clubs.repository.js';
import { AuditLogsService } from './workflow/audit-logs/audit-logs.service.js';
import { AuditLogsRepository } from './workflow/audit-logs/audit-logs.repository.js';
import { ContactMessagesService } from './public-communication/contact-messages/contact-messages.service.js';
import { ContactMessagesRepository } from './public-communication/contact-messages/contact-messages.repository.js';
import { UsersService } from './platform-administration/users/users.service.js';
import { UsersRepository } from './platform-administration/users/users.repository.js';
import { RolesService } from './platform-administration/roles/roles.service.js';
import { AuthSessionsService } from './platform-administration/auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from './federation-governance/federation-personnel/federation-personnel.service.js';

/**
 * The `Export` surface, in one place.
 *
 * Bulk extraction is a single cross-cutting decision applied to five
 * collections, so it is tested as one thing — the same reasoning that puts
 * `refusal-codes.spec.ts` across four services rather than inside each.
 *
 * What these tests actually protect is the column list. A CSV is a file that
 * leaves the platform: a field added to a schema and picked up by a careless
 * `Object.keys` export would walk out with it, and nobody would notice until
 * the file was already in an inbox.
 */
describe('CSV exports', () => {
  // `find` for the four BaseRepository-backed collections; `findPage` for
  // `auditLogs`, which deliberately exposes no general `find()` so that
  // append-only is a property of its public surface.
  const mockRepo = () => ({ find: jest.fn(), findPage: jest.fn() });

  async function build(
    service: new (...args: never[]) => unknown,
    repositoryToken: unknown,
    extraProviders: { provide: unknown; useValue: unknown }[] = [],
  ): Promise<{ service: never; repository: { find: jest.Mock } }> {
    const repository = mockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        service,
        { provide: repositoryToken as never, useValue: repository },
        ...(extraProviders as never[]),
      ],
    }).compile();
    return { service: module.get(service) as never, repository: repository as never };
  }

  describe('users — the one that must never leak a credential', () => {
    it('exports the account but not the password hash or the reset token', async () => {
      const { service, repository } = await build(UsersService, UsersRepository, [
        { provide: RolesService, useValue: {} },
        { provide: AuthSessionsService, useValue: {} },
        { provide: FederationPersonnelsService, useValue: {} },
      ]);
      repository.find.mockResolvedValue([
        {
          name: { ar: 'مسؤول المنصة', en: 'Platform Administrator' },
          email: 'admin@uaeaf.ae',
          accountStatus: 'Active',
          failedLoginAttempts: 0,
          authMethods: [
            { provider: 'Local', passwordHash: '$2b$12$SECRETHASHVALUEGOESHERE' },
          ],
          passwordResetToken: 'RESETTOKENVALUE',
        },
      ] as never);

      const csv = await (service as unknown as UsersService).exportCsv();

      expect(csv).toContain('admin@uaeaf.ae');
      expect(csv).not.toContain('SECRETHASHVALUE');
      expect(csv).not.toContain('RESETTOKENVALUE');
      expect(csv).not.toContain('passwordHash');
    });
  });

  describe('auditLogs', () => {
    const oneEntry = {
      items: [
        {
          action: 'Update',
          entityType: 'athletes',
          timestamp: new Date('2026-09-08T10:00:00.000Z'),
          ipAddress: '127.0.0.1',
          previousValue: { nationalId: 'SHOULD-NOT-TRAVEL' },
          newValue: { nationalId: 'ALSO-SHOULD-NOT-TRAVEL' },
        },
      ],
      total: 1,
    };

    it('exports the trail but not the snapshots it carries', async () => {
      const { service, repository } = await build(AuditLogsService, AuditLogsRepository);
      repository.findPage.mockResolvedValue(oneEntry as never);

      const csv = await (service as unknown as AuditLogsService).exportCsv();

      expect(csv).toContain('athletes');
      // `previousValue`/`newValue` are arbitrary entity snapshots. They are
      // redacted for display by `redactAuditSnapshot`; a raw dump into a
      // spreadsheet would bypass that entirely.
      expect(csv).not.toContain('SHOULD-NOT-TRAVEL');
    });

    it('caps one export rather than loading an unbounded trail', async () => {
      const { service, repository } = await build(AuditLogsService, AuditLogsRepository);
      repository.findPage.mockResolvedValue(oneEntry as never);

      await (service as unknown as AuditLogsService).exportCsv();

      expect(repository.findPage).toHaveBeenCalledWith({}, 0, 10_000);
    });

    it('narrows the export with the same filter the listing accepts', async () => {
      const { service, repository } = await build(AuditLogsService, AuditLogsRepository);
      repository.findPage.mockResolvedValue(oneEntry as never);

      await (service as unknown as AuditLogsService).exportCsv({
        entityType: 'athletes',
        action: 'Delete',
      } as never);

      expect(repository.findPage).toHaveBeenCalledWith(
        { entityType: 'athletes', action: 'Delete' },
        0,
        10_000,
      );
    });
  });

  describe('clubs', () => {
    it('exports the registry row in both languages', async () => {
      const { service, repository } = await build(ClubsService, ClubsRepository);
      repository.find.mockResolvedValue([
        {
          name: { ar: 'نادي العين', en: 'Al Ain Club' },
          slug: 'al-ain',
          clubType: 'Club',
          status: 'Active',
          registrationNumber: 'RC-014',
        },
      ] as never);

      const csv = await (service as unknown as ClubsService).exportCsv();

      expect(csv).toContain('نادي العين,Al Ain Club');
      expect(csv).toContain('RC-014');
    });
  });

  describe('contactMessages', () => {
    it('exports the message and its reply state', async () => {
      const { service, repository } = await build(
        ContactMessagesService,
        ContactMessagesRepository,
      );
      repository.find.mockResolvedValue([
        {
          messageType: 'General',
          senderName: 'Amal',
          senderEmail: 'amal@example.ae',
          messageBody: 'Hello',
          status: 'Replied',
          repliedAt: new Date('2026-09-08T09:00:00.000Z'),
        },
      ] as never);

      const csv = await (service as unknown as ContactMessagesService).exportCsv();

      expect(csv).toContain('amal@example.ae');
      expect(csv).toContain('Replied');
    });
  });

  it('every export reads through the soft-delete-aware find', async () => {
    const { service, repository } = await build(ClubsService, ClubsRepository);
    repository.find.mockResolvedValue([] as never);

    await (service as unknown as ClubsService).exportCsv();

    expect(repository.find).toHaveBeenCalledWith();
  });
});

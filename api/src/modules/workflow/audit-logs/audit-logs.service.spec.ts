import { jest } from '@jest/globals';
import { AuditLogsService } from './audit-logs.service.js';
import { AuditLogsRepository } from './audit-logs.repository.js';
import type { QueryAuditLogsDto } from './dto/query-audit-logs.dto.js';

/**
 * Task 5 addendum (owner, 2026-09-27): a security-events view needs one
 * filter, derived from `SECURITY_AUDIT_ACTIONS` rather than a hand-listed
 * set at the call site — the screen that uses it is a later batch, but the
 * filter has to exist and be correct now so that screen has something to
 * read.
 */
describe('AuditLogsService — security-events filter', () => {
  let repository: jest.Mocked<AuditLogsRepository>;
  let service: AuditLogsService;

  beforeEach(() => {
    repository = { findPage: jest.fn(async () => ({ items: [], total: 0 })) } as never;
    service = new AuditLogsService(repository);
  });

  it('filters to exactly the four security action kinds', async () => {
    await service.query({ securityEventsOnly: true } as QueryAuditLogsDto);

    const [filter] = repository.findPage.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(filter).toEqual({
      action: { $in: ['AccessDenied', 'SuperAdminGranted', 'SuperAdminRevoked', 'PermanentDelete'] },
    });
  });

  it('excludes an ordinary Update when the security filter is on', async () => {
    await service.query({ securityEventsOnly: true, action: 'Update' } as never);

    const [filter] = repository.findPage.mock.calls[0] as unknown as [{ action: { $in: readonly string[] } }];
    expect(filter.action.$in).not.toContain('Update');
  });

  it('falls back to a plain action filter when the security flag is absent', async () => {
    await service.query({ action: 'Update' } as QueryAuditLogsDto);

    const [filter] = repository.findPage.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(filter).toEqual({ action: 'Update' });
  });
});

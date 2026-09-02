import { Injectable } from '@nestjs/common';
import { AuditLogsRepository } from './audit-logs.repository.js';
import type { AuditLogDocument } from './schemas/audit-log.schema.js';
import type { WriteAuditLogInput } from './dto/write-audit-log.dto.js';

/** Implements: auditLogs collection (FigJam node 100:7778). */
@Injectable()
export class AuditLogsService {
  constructor(private readonly repository: AuditLogsRepository) {}

  async write(entry: WriteAuditLogInput): Promise<AuditLogDocument> {
    return this.repository.create(entry);
  }
}

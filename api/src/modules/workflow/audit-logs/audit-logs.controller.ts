import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { AuditLogsService } from './audit-logs.service.js';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto.js';
import { AuditLogPageDto } from './dto/audit-log-response.dto.js';

/**
 * Reading the audit trail.
 *
 * Added 2026-09-08. The collection had a schema, a repository and a service
 * since Week 2, and every mutating request had been writing to it — but
 * nothing exposed it over HTTP, so the trail could only be read by opening
 * the database. An audit log nobody can read is a log, not an audit.
 *
 * Read-only by construction, not by convention: `AuditLogsRepository`
 * exposes no update, no soft delete and no hard delete, and this controller
 * declares no mutating route. `@RequirePermission('auditLogs', 'Read')` is a
 * new pair in the catalogue — no existing role holds it until someone grants
 * it deliberately, which is the correct default for a record of who did
 * what.
 */
@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get('export')
  @RequirePermission('auditLogs', 'Export')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="audit-logs.csv"')
  exportCsv(@Query() query: QueryAuditLogsDto) {
    return this.auditLogsService.exportCsv(query);
  }

  @Get()
  @RequirePermission('auditLogs', 'Read')
  @ApiOkResponse({ type: AuditLogPageDto })
  async findAll(@Query() query: QueryAuditLogsDto): Promise<AuditLogPageDto> {
    return this.auditLogsService.query(query);
  }
}

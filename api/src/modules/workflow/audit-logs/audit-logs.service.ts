import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditLogsRepository } from './audit-logs.repository.js';
import type { AuditLogDocument } from './schemas/audit-log.schema.js';
import type { WriteAuditLogInput } from './dto/write-audit-log.dto.js';
import type { QueryAuditLogsDto } from './dto/query-audit-logs.dto.js';
import type { AuditLogPageDto, AuditLogResponseDto } from './dto/audit-log-response.dto.js';
import { toCsv, type CsvColumn } from '../../../common/utils/csv.util.js';

const DEFAULT_LIMIT = 50;

/** Ceiling on one export. The trail is append-only and unbounded; without
 *  this the whole collection would be built into a single in-memory string.
 *  Newest first, and the listing's own filters narrow anything older. */
const AUDIT_LOG_EXPORT_MAX_ROWS = 10_000;

/**
 * Column order for `auditLogs:Export`.
 *
 * `previousValue` and `newValue` are deliberately absent. They hold
 * arbitrary snapshots of whatever entity changed — including fields the
 * display path runs through `redactAuditSnapshot` first. Dumping them raw
 * into a spreadsheet would route around that redaction entirely, which is
 * exactly the kind of quiet leak a bulk export is prone to.
 */
const AUDIT_LOG_EXPORT_COLUMNS: readonly CsvColumn[] = [
  { key: 'timestamp', header: 'Timestamp' },
  { key: 'action', header: 'Action' },
  { key: 'entityType', header: 'Entity type' },
  { key: 'entityId', header: 'Entity id' },
  { key: 'actorId', header: 'Actor id' },
  { key: 'reason', header: 'Reason' },
  { key: 'ipAddress', header: 'IP address' },
  { key: 'userAgent', header: 'User agent' },
];

/** Implements: auditLogs collection (FigJam node 100:7778). */
@Injectable()
export class AuditLogsService {
  constructor(private readonly repository: AuditLogsRepository) {}

  /**
   * The trail as a spreadsheet, behind `auditLogs:Export`.
   *
   * Capped, and deliberately so. `auditLogs` is append-only and grows with
   * every write and every refused request; an unbounded export would load
   * the whole collection into one string in memory. The cap takes the
   * newest rows, which is the end of the trail anyone exporting it is
   * asking about, and the same filter the listing accepts is available for
   * anything older.
   *
   * Reads through `findPage` because `AuditLogsRepository` deliberately
   * exposes no general `find()` — it does not extend `BaseRepository`
   * precisely so that append-only is a property of its public surface
   * rather than a convention.
   */
  async exportCsv(query: QueryAuditLogsDto = {} as QueryAuditLogsDto): Promise<string> {
    const { items } = await this.repository.findPage(
      this.buildFilter(query),
      0,
      AUDIT_LOG_EXPORT_MAX_ROWS,
    );
    return toCsv(items as unknown as Record<string, unknown>[], AUDIT_LOG_EXPORT_COLUMNS);
  }

  async write(entry: WriteAuditLogInput): Promise<AuditLogDocument> {
    return this.repository.create(entry);
  }

  /**
   * A filtered page of the trail, newest first.
   *
   * Only the fields that were actually supplied become filter keys — sending
   * `{ entityId: undefined }` to Mongoose would match documents whose
   * `entityId` is missing, which is the opposite of "no filter".
   */
  async query(query: QueryAuditLogsDto): Promise<AuditLogPageDto> {
    const { items, total } = await this.repository.findPage(
      this.buildFilter(query),
      query.skip ?? 0,
      query.limit ?? DEFAULT_LIMIT,
    );

    return { items: items.map((item) => this.toResponse(item)), total };
  }

  /** Shared by the listing and the export so the two can never filter
   *  differently. Only supplied fields become keys — sending
   *  `{ entityId: undefined }` to Mongoose matches documents whose
   *  `entityId` is missing, which is the opposite of "no filter". */
  private buildFilter(query: QueryAuditLogsDto): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (query.entityType) {
      filter.entityType = query.entityType;
    }
    if (query.entityId) {
      filter.entityId = new Types.ObjectId(query.entityId);
    }
    if (query.actorId) {
      filter.actorId = new Types.ObjectId(query.actorId);
    }
    if (query.action) {
      filter.action = query.action;
    }
    return filter;
  }

  /** The allowlist boundary. The stored row is a Mongoose document carrying
   *  BaseSchema's tracking fields on top of its own; only the audit facts
   *  leave here. */
  private toResponse(entry: AuditLogDocument): AuditLogResponseDto {
    return {
      id: entry._id.toString(),
      actorId: entry.actorId.toString(),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ? entry.entityId.toString() : null,
      timestamp: entry.timestamp,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
      reason: entry.reason,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    };
  }
}

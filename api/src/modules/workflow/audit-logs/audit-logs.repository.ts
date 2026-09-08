import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema.js';
import type { AuditLogDocument } from './schemas/audit-log.schema.js';
import type { WriteAuditLogInput } from './dto/write-audit-log.dto.js';

/**
 * Implements: auditLogs collection. Deliberately does NOT extend
 * `BaseRepository` — mirrors `RevisionsRepository`'s pattern exactly.
 * `auditLogs` is the platform's tamper-evidence backbone; `BaseRepository`
 * would have publicly inherited `updateById()`/`softDelete()` even though
 * nothing calls them today, leaving the "append-only" guarantee enforced
 * only by convention rather than by the repository's own public surface.
 * This class exposes `create()` and reads only — no update, no soft
 * delete, no hard delete, of any kind, ever (schema-audit-2026-09-04.md
 * §3.2, P0 finding).
 */
@Injectable()
export class AuditLogsRepository {
  constructor(@InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>) {}

  async create(data: WriteAuditLogInput): Promise<AuditLogDocument> {
    return this.model.create(data);
  }

  /**
   * A page of the trail, newest first, plus the matching total.
   *
   * Reads only — the class comment above still holds: no update, no soft
   * delete, no hard delete, of any kind, ever. Adding a read path does not
   * weaken the append-only guarantee, and it is the reason that guarantee
   * was worth having.
   */
  async findPage(
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ): Promise<{ items: AuditLogDocument[]; total: number }> {
    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
}

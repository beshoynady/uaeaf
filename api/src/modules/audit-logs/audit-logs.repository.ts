import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { AuditLog } from './schemas/audit-log.schema.js';
import type { AuditLogDocument } from './schemas/audit-log.schema.js';

/** Implements: auditLogs collection. Write path only for Week 1 — no
 *  read/query endpoints are exposed yet (BE-PLAN-010 §3). */
@Injectable()
export class AuditLogsRepository extends BaseRepository<AuditLogDocument> {
  constructor(@InjectModel(AuditLog.name) model: Model<AuditLogDocument>) {
    super(model);
  }
}

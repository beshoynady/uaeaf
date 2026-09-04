import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CoachClubHistoryRepository } from './coach-club-history.repository.js';
import type { CoachClubHistoryDocument } from './schemas/coach-club-history.schema.js';
import { CreateCoachClubHistoryDto } from './dto/create-coach-club-history.dto.js';
import { EndCurrentDto } from '../../../common/dto/end-current.dto.js';

/** Implements: coachClubHistory collection, Domain 2 — People &
 *  Organizations (FigJam node `80:6264`). Enforces the confirmed
 *  `endDate` invariant (2026-09-02 correction): at most one row with
 *  `endDate: null` per coach at any time — see `create()`/`endCurrent()`. */
@Injectable()
export class CoachClubHistoryService {
  constructor(private readonly repository: CoachClubHistoryRepository) {}

  /** Creating a new current row (no `endDate`) first closes out the
   *  coach's existing current row, if any, on `dto.transferDate`
   *  (default: now). A row created with an explicit `endDate` is already
   *  historical and never displaces the current row. */
  async create(dto: CreateCoachClubHistoryDto): Promise<CoachClubHistoryDocument> {
    const coachId = new Types.ObjectId(dto.coachId);
    if (!dto.endDate) {
      const current = await this.repository.findCurrent(coachId);
      if (current) {
        await this.repository.updateById(current._id.toString(), {
          endDate: dto.transferDate ? new Date(dto.transferDate) : new Date(),
        });
      }
    }

    return this.repository.create({
      coachId,
      clubId: new Types.ObjectId(dto.clubId),
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });
  }

  async findAll(): Promise<CoachClubHistoryDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<CoachClubHistoryDocument | null> {
    return this.repository.findById(id);
  }

  /** Ends the coach's current club relationship (release/contract expiry)
   *  without creating a replacement row.
   *  @throws NotFoundException when the coach has no current row. */
  async endCurrent(coachId: string, dto: EndCurrentDto): Promise<CoachClubHistoryDocument | null> {
    const current = await this.repository.findCurrent(new Types.ObjectId(coachId));
    if (!current) {
      throw new NotFoundException(`Coach ${coachId} has no current club relationship.`);
    }
    return this.repository.updateById(current._id.toString(), {
      endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
    });
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<CoachClubHistoryDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}

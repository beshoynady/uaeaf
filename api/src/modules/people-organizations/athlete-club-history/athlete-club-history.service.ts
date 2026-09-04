import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AthleteClubHistoryRepository } from './athlete-club-history.repository.js';
import type { AthleteClubHistoryDocument } from './schemas/athlete-club-history.schema.js';
import { CreateAthleteClubHistoryDto } from './dto/create-athlete-club-history.dto.js';
import { EndCurrentDto } from '../../../common/dto/end-current.dto.js';

/** Implements: athleteClubHistory collection, Domain 2 — People &
 *  Organizations (FigJam node `80:6226`). Enforces the confirmed
 *  `endDate` invariant (2026-09-02 correction): at most one row with
 *  `endDate: null` per athlete at any time — see `create()`/`endCurrent()`. */
@Injectable()
export class AthleteClubHistoryService {
  constructor(private readonly repository: AthleteClubHistoryRepository) {}

  /** Creating a new current row (no `endDate`) first closes out the
   *  athlete's existing current row, if any, on `dto.transferDate`
   *  (default: now). A row created with an explicit `endDate` is already
   *  historical and never displaces the current row. */
  async create(dto: CreateAthleteClubHistoryDto): Promise<AthleteClubHistoryDocument> {
    const athleteId = new Types.ObjectId(dto.athleteId);
    if (!dto.endDate) {
      const current = await this.repository.findCurrent(athleteId);
      if (current) {
        await this.repository.updateById(current._id.toString(), {
          endDate: dto.transferDate ? new Date(dto.transferDate) : new Date(),
        });
      }
    }

    return this.repository.create({
      athleteId,
      clubId: new Types.ObjectId(dto.clubId),
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });
  }

  async findAll(): Promise<AthleteClubHistoryDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<AthleteClubHistoryDocument | null> {
    return this.repository.findById(id);
  }

  /** Ends the athlete's current club relationship (release/contract expiry)
   *  without creating a replacement row.
   *  @throws NotFoundException when the athlete has no current row. */
  async endCurrent(athleteId: string, dto: EndCurrentDto): Promise<AthleteClubHistoryDocument | null> {
    const current = await this.repository.findCurrent(new Types.ObjectId(athleteId));
    if (!current) {
      throw new NotFoundException(`Athlete ${athleteId} has no current club relationship.`);
    }
    return this.repository.updateById(current._id.toString(), {
      endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
    });
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<AthleteClubHistoryDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}

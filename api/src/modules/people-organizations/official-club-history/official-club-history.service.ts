import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OfficialClubHistoryRepository } from './official-club-history.repository.js';
import type { OfficialClubHistoryDocument } from './schemas/official-club-history.schema.js';
import { CreateOfficialClubHistoryDto } from './dto/create-official-club-history.dto.js';
import { EndCurrentDto } from '../../../common/dto/end-current.dto.js';

/** Implements: officialClubHistory collection, Domain 2 — People &
 *  Organizations (FigJam node `80:6302`). Enforces the confirmed
 *  `endDate` invariant (2026-09-02 correction): at most one row with
 *  `endDate: null` per official at any time — see `create()`/`endCurrent()`. */
@Injectable()
export class OfficialClubHistoryService {
  constructor(private readonly repository: OfficialClubHistoryRepository) {}

  /** Creating a new current row (no `endDate`) first closes out the
   *  official's existing current row, if any, on `dto.transferDate`
   *  (default: now). A row created with an explicit `endDate` is already
   *  historical and never displaces the current row. */
  async create(dto: CreateOfficialClubHistoryDto): Promise<OfficialClubHistoryDocument> {
    const officialId = new Types.ObjectId(dto.officialId);
    if (!dto.endDate) {
      const current = await this.repository.findCurrent(officialId);
      if (current) {
        await this.repository.updateById(current._id.toString(), {
          endDate: dto.transferDate ? new Date(dto.transferDate) : new Date(),
        });
      }
    }

    return this.repository.create({
      officialId,
      clubId: new Types.ObjectId(dto.clubId),
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });
  }

  async findAll(): Promise<OfficialClubHistoryDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<OfficialClubHistoryDocument | null> {
    return this.repository.findById(id);
  }

  /** Ends the official's current club relationship (release/contract
   *  expiry) without creating a replacement row.
   *  @throws NotFoundException when the official has no current row. */
  async endCurrent(officialId: string, dto: EndCurrentDto): Promise<OfficialClubHistoryDocument | null> {
    const current = await this.repository.findCurrent(new Types.ObjectId(officialId));
    if (!current) {
      throw new NotFoundException(`Official ${officialId} has no current club relationship.`);
    }
    return this.repository.updateById(current._id.toString(), {
      endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
    });
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<OfficialClubHistoryDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}

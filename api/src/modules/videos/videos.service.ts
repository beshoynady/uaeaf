import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { VideosRepository } from './videos.repository.js';
import type { VideoDocument } from './schemas/video.schema.js';
import { CreateVideoDto } from './dto/create-video.dto.js';

/** Implements: videos collection, Domain 5 — Media Center (FigJam node
 *  `92:7326`). Plain CRUD — the `isLive` single-live-stream invariant is
 *  enforced at the schema layer (partial unique index + pre-save hook),
 *  not here (see the schema's doc comment). */
@Injectable()
export class VideosService {
  constructor(private readonly repository: VideosRepository) {}

  async create(dto: CreateVideoDto): Promise<VideoDocument> {
    return this.repository.create({
      title: dto.title,
      contentCategoryId: new Types.ObjectId(dto.contentCategoryId),
      isLive: dto.isLive ?? false,
      externalPlatform: dto.externalPlatform,
      externalUrl: dto.externalUrl,
      thumbnailId: dto.thumbnailId ? new Types.ObjectId(dto.thumbnailId) : null,
      associations: (dto.associations ?? []).map((association) => ({
        ownerType: association.ownerType,
        ownerId: new Types.ObjectId(association.ownerId),
        role: association.role ?? 'Related',
        displayOrder: association.displayOrder ?? 0,
      })),
      tags: dto.tags ?? [],
    });
  }

  async findAll(): Promise<VideoDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<VideoDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<VideoDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}

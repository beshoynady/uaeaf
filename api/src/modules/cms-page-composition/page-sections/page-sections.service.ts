import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { PageSectionsRepository } from './page-sections.repository.js';
import type { PageSectionDocument } from './schemas/page-sections.schema.js';
import { CreatePageSectionDto } from './dto/create-page-sections.dto.js';
import { selectVisibleInWindow } from '../../../common/utils/visibility-window.util.js';

/** Implements: pageSections collection, Domain 11 — CMS & Page
 *  Composition. */
@Injectable()
export class PageSectionsService {
  constructor(private readonly repository: PageSectionsRepository) {}

  /** @throws BadRequestException when the visibility window is inverted
   *  (`visibleUntil` before `visibleFrom`) — a window that can never open
   *  is always an input error, not a valid schedule. */
  async create(dto: CreatePageSectionDto): Promise<PageSectionDocument> {
    const visibleFrom = dto.visibleFrom ? new Date(dto.visibleFrom) : null;
    const visibleUntil = dto.visibleUntil ? new Date(dto.visibleUntil) : null;
    if (visibleFrom && visibleUntil && visibleUntil < visibleFrom) {
      throw new BadRequestException('visibleUntil must not be earlier than visibleFrom.');
    }

    return this.repository.create({
      pageId: new Types.ObjectId(dto.pageId),
      sectionType: dto.sectionType,
      sectionTitle: dto.sectionTitle ?? null,
      sectionSubtitle: dto.sectionSubtitle ?? null,
      itemLimit: dto.itemLimit ?? null,
      ctaText: dto.ctaText ?? null,
      ctaUrl: dto.ctaUrl ?? null,
      visibleFrom,
      visibleUntil,
      displayOrder: dto.displayOrder,
      enabled: dto.enabled ?? true,
      visibility: dto.visibility,
      selectionMode: dto.selectionMode,
      items: (dto.items ?? []).map((id) => new Types.ObjectId(id)),
      filters: dto.filters ?? null,
      configuration: dto.configuration ?? null,
    });
  }

  async findAll(): Promise<PageSectionDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<PageSectionDocument | null> {
    return this.repository.findById(id);
  }

  /** The sections a public visitor should see for one page, in display
   *  order: enabled, `visibility='Everyone'`, and inside their
   *  visibleFrom/visibleUntil window at `now`. */
  async findPublicByPage(pageId: string, now: Date = new Date()): Promise<PageSectionDocument[]> {
    const sections = await this.repository.find({
      pageId: new Types.ObjectId(pageId),
      enabled: true,
      visibility: 'Everyone',
    });
    return selectVisibleInWindow(
      sections,
      now,
      (section) => section.visibleFrom,
      (section) => section.visibleUntil,
    );
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<PageSectionDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}

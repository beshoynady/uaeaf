import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PageSectionsRepository } from './page-sections.repository.js';
import type { PageSectionDocument } from './schemas/page-sections.schema.js';
import { CreatePageSectionDto } from './dto/create-page-sections.dto.js';
import { UpdatePageSectionDto } from './dto/update-page-sections.dto.js';
import type { PageSectionPublicResponseDto } from './dto/page-section-public-response.dto.js';
import { selectVisibleInWindow } from '../../../common/utils/visibility-window.util.js';
import { assertHeroSettings } from './hero-settings.js';
import { wasSent } from '../../../common/utils/partial-update.util.js';

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
    // A HERO section's settings have rules of their own; every other section's
    // configuration stays free-form.
    if (dto.sectionType === 'HERO') assertHeroSettings(dto.configuration);

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

  /**
   * Applies a partial edit, checking the window on the section the edit
   * *produces* rather than on the body.
   *
   * A body carrying only `visibleUntil` reads as valid on its own and can
   * still invert a window against a stored `visibleFrom` — the same state
   * `create` refuses. So the merged pair is what gets checked.
   *
   * @throws NotFoundException when no such section exists.
   * @throws BadRequestException when the resulting window can never open.
   */
  async update(id: string, dto: UpdatePageSectionDto): Promise<PageSectionDocument> {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException('Page section not found.');
    }

    // Sent means not undefined (`wasSent`): an own-key test is true for every
    // field the pipeline's DTO instance declares, sent or not.
    const has = (key: keyof UpdatePageSectionDto) => wasSent(dto, key);
    const visibleFrom = has('visibleFrom')
      ? (dto.visibleFrom ? new Date(dto.visibleFrom) : null)
      : current.visibleFrom;
    const visibleUntil = has('visibleUntil')
      ? (dto.visibleUntil ? new Date(dto.visibleUntil) : null)
      : current.visibleUntil;
    if (visibleFrom && visibleUntil && visibleUntil < visibleFrom) {
      throw new BadRequestException('visibleUntil must not be earlier than visibleFrom.');
    }

    if (has('configuration') && current.sectionType === 'HERO') assertHeroSettings(dto.configuration);

    const update: Record<string, unknown> = {};
    if (has('sectionTitle')) update.sectionTitle = dto.sectionTitle ?? null;
    if (has('sectionSubtitle')) update.sectionSubtitle = dto.sectionSubtitle ?? null;
    if (has('itemLimit')) update.itemLimit = dto.itemLimit ?? null;
    if (has('ctaText')) update.ctaText = dto.ctaText ?? null;
    if (has('ctaUrl')) update.ctaUrl = dto.ctaUrl ?? null;
    if (has('visibleFrom')) update.visibleFrom = visibleFrom;
    if (has('visibleUntil')) update.visibleUntil = visibleUntil;
    if (dto.displayOrder !== undefined) update.displayOrder = dto.displayOrder;
    if (dto.enabled !== undefined) update.enabled = dto.enabled;
    if (dto.visibility !== undefined) update.visibility = dto.visibility;
    if (dto.selectionMode !== undefined) update.selectionMode = dto.selectionMode;
    if (dto.items !== undefined) update.items = dto.items.map((itemId) => new Types.ObjectId(itemId));
    if (has('filters')) update.filters = dto.filters ?? null;
    if (has('configuration')) update.configuration = dto.configuration ?? null;

    const saved = await this.repository.updateById(id, update);
    if (!saved) {
      throw new NotFoundException('Page section not found.');
    }
    return saved;
  }

  async findAll(): Promise<PageSectionDocument[]> {
    return this.repository.find();
  }

  /** One page's sections in display order, for the editor — disabled and
   *  out-of-window sections included, since that is what the editor edits. */
  async findByPage(pageId: string): Promise<PageSectionDocument[]> {
    const sections = await this.repository.find({ pageId: new Types.ObjectId(pageId) });
    return [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async findById(id: string): Promise<PageSectionDocument | null> {
    return this.repository.findById(id);
  }

  /** The sections a public visitor should see for one page, in display
   *  order: enabled, `visibility='Everyone'`, and inside their
   *  visibleFrom/visibleUntil window at `now`. Returns the public-safe
   *  shape, never raw documents. */
  async findPublicByPage(pageId: string, now: Date = new Date()): Promise<PageSectionPublicResponseDto[]> {
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
    ).map((section) => this.toPublicResponse(section));
  }

  /** Maps a full `PageSection` document to its public-safe shape (excludes
   *  the visibility gate, `filters`, and the audit trail — see the DTO's
   *  doc comment). */
  toPublicResponse(section: PageSectionDocument): PageSectionPublicResponseDto {
    return {
      id: section._id.toString(),
      sectionType: section.sectionType,
      sectionTitle: section.sectionTitle,
      sectionSubtitle: section.sectionSubtitle,
      itemLimit: section.itemLimit,
      ctaText: section.ctaText,
      ctaUrl: section.ctaUrl,
      displayOrder: section.displayOrder,
      selectionMode: section.selectionMode,
      items: section.items.map((id) => id.toString()),
      configuration: section.configuration,
    };
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<PageSectionDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { HeroSlidesRepository } from './hero-slides.repository.js';
import type { HeroSlideDocument } from './schemas/hero-slides.schema.js';
import { CreateHeroSlideDto } from './dto/create-hero-slides.dto.js';
import type { HeroSlidePublicResponseDto } from './dto/hero-slide-public-response.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';

/** Implements: heroSlides collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class HeroSlidesService {
  constructor(
    private readonly repository: HeroSlidesRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  /** Enforces the board's conditional media rule, which Mongoose cannot
   *  express: an IMAGE slide needs `imageAssetId` (validated as a real,
   *  non-archived image), a VIDEO slide needs `videoId`. The unused field
   *  is rejected rather than silently stored, so a slide can never carry
   *  contradictory media.
   *  @throws BadRequestException when the pairing is wrong. */
  async create(dto: CreateHeroSlideDto): Promise<HeroSlideDocument> {
    if (dto.mediaType === 'IMAGE') {
      if (!dto.imageAssetId) {
        throw new BadRequestException('imageAssetId is required when mediaType is IMAGE.');
      }
      if (dto.videoId) {
        throw new BadRequestException('videoId must be omitted when mediaType is IMAGE.');
      }
      await this.mediaAssetsService.assertUsableImage(dto.imageAssetId);
    } else {
      if (!dto.videoId) {
        throw new BadRequestException('videoId is required when mediaType is VIDEO.');
      }
      if (dto.imageAssetId) {
        throw new BadRequestException('imageAssetId must be omitted when mediaType is VIDEO.');
      }
    }

    return this.repository.create({
      pageSectionId: new Types.ObjectId(dto.pageSectionId),
      mediaType: dto.mediaType,
      imageAssetId: dto.imageAssetId ? new Types.ObjectId(dto.imageAssetId) : null,
      videoId: dto.videoId ? new Types.ObjectId(dto.videoId) : null,
      title: dto.title,
      subtitle: dto.subtitle,
      ctaText: dto.ctaText,
      ctaUrl: dto.ctaUrl,
      displayOrder: dto.displayOrder,
      active: dto.active ?? true,
      scheduledFrom: dto.scheduledFrom ? new Date(dto.scheduledFrom) : null,
      scheduledTo: dto.scheduledTo ? new Date(dto.scheduledTo) : null,
    });
  }

  async findAll(): Promise<HeroSlideDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<HeroSlideDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<HeroSlideDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  /** The slides a public visitor should see for one HERO `pageSection`, in
   *  display order: `active` and inside their `scheduledFrom`/`scheduledTo`
   *  window at `now` — mirrors `PageSectionsService.findPublicByPage()`'s
   *  filtering convention (2026-09-04, public-routes closure: this was the
   *  one missing link in the otherwise-fully-public
   *  pages → page-sections → heroSlides composition chain). */
  async findPublicBySection(pageSectionId: string, now: Date = new Date()): Promise<HeroSlidePublicResponseDto[]> {
    const slides = await this.repository.find({ pageSectionId: new Types.ObjectId(pageSectionId), active: true });
    return slides
      .filter((slide) => !slide.scheduledFrom || slide.scheduledFrom <= now)
      .filter((slide) => !slide.scheduledTo || slide.scheduledTo >= now)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((slide) => this.toPublicResponse(slide));
  }

  /** Maps a full `HeroSlide` document to its public-safe shape (excludes
   *  the visibility-gate fields — see the DTO's doc comment). */
  toPublicResponse(slide: HeroSlideDocument): HeroSlidePublicResponseDto {
    return {
      id: slide._id.toString(),
      mediaType: slide.mediaType,
      imageAssetId: slide.imageAssetId ? slide.imageAssetId.toString() : null,
      videoId: slide.videoId ? slide.videoId.toString() : null,
      title: slide.title,
      subtitle: slide.subtitle,
      ctaText: slide.ctaText,
      ctaUrl: slide.ctaUrl,
      displayOrder: slide.displayOrder,
    };
  }
}

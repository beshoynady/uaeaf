import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { HeroSlidesRepository } from './hero-slides.repository.js';
import type { HeroSlideDocument } from './schemas/hero-slides.schema.js';
import { CreateHeroSlideDto } from './dto/create-hero-slides.dto.js';
import { ReorderHeroSlidesDto, UpdateHeroSlideDto } from './dto/update-hero-slides.dto.js';
import type {
  HeroCtaPublicResponseDto,
  HeroImagePublicResponseDto,
  HeroLtrImagePublicResponseDto,
  HeroSlidePublicResponseDto,
} from './dto/hero-slide-public-response.dto.js';
import type { HeroCtaDto } from './dto/hero-slide-parts.dto.js';
import type { PublicImageDto } from '../../../common/dto/public-page.dto.js';
import { assertCtaUsable, assertHeroTexts, assertScheduleOrder, assertVisibleSlideComplete } from './hero-slides.validation.js';
import { HERO_SLIDE_LIMIT } from './schemas/hero-slides.schema.js';
import type { LtrImageMode } from './schemas/hero-slides.schema.js';
import { CENTRE } from './schemas/focal-point.schema.js';
import { EMPTY_HERO_TEXT } from './schemas/hero-text.schema.js';
import type { FocalPoint } from './schemas/focal-point.schema.js';
import { isExternalCtaUrl } from './schemas/hero-cta.schema.js';
import type { HeroCta } from './schemas/hero-cta.schema.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { selectVisibleInWindow } from '../../../common/utils/visibility-window.util.js';
import { wasSent } from '../../../common/utils/partial-update.util.js';

/** A button as it is stored: never absent, only hidden. */
const storedCta = (cta: HeroCtaDto | undefined) => ({
  isVisible: cta?.isVisible ?? false,
  label: cta?.label ?? null,
  url: cta?.url ?? null,
});

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
   *
   *  Then three rules the owner added on 2026-09-16: a section holds at most
   *  five slides, a phone crop that is switched on must name a picture, and a
   *  visible button must be complete.
   *
   *  @throws BadRequestException on any of the above — `listTooLong`,
   *  `missingRequiredField`, `incompleteCta`, `ctaLabelTooLong`,
   *  `invalidCtaUrl`, or an unclassified message for the media pairing. */
  async create(dto: CreateHeroSlideDto): Promise<HeroSlideDocument> {
    // A new slide is hidden unless the request says otherwise, and a hidden
    // slide may still be missing its picture (owner decisions 2026-09-17); a
    // visible one may not (`assertVisibleSlideComplete` below).
    const active = dto.active ?? false;
    if (dto.mediaType === 'IMAGE') {
      if (dto.videoId) {
        throw new BadRequestException('videoId must be omitted when mediaType is IMAGE.');
      }
      if (dto.imageAssetId) await this.mediaAssetsService.assertUsableImage(dto.imageAssetId);
    } else {
      if (!dto.videoId) {
        throw new BadRequestException('videoId is required when mediaType is VIDEO.');
      }
      if (dto.imageAssetId) {
        throw new BadRequestException('imageAssetId must be omitted when mediaType is VIDEO.');
      }
    }

    // Counted before writing, and counting every slide the section holds —
    // inactive ones included. A hidden slide takes its place back the moment
    // an editor shows it again, so a limit that ignored it would be a limit
    // on what is visible today rather than on what the row can hold.
    const existing = await this.repository.find({ pageSectionId: new Types.ObjectId(dto.pageSectionId) });
    if (existing.length >= HERO_SLIDE_LIMIT.max) {
      throw new BadRequestException({
        code: 'listTooLong',
        message: `A HERO section holds at most ${HERO_SLIDE_LIMIT.max} slides; this one already has ${existing.length}.`,
        list: 'heroSlides',
        limit: HERO_SLIDE_LIMIT.max,
      });
    }

    assertHeroTexts(dto);
    assertVisibleSlideComplete({ ...dto, active, imageAssetId: dto.imageAssetId ?? null });
    assertScheduleOrder(dto.scheduledFrom ? new Date(dto.scheduledFrom) : null, dto.scheduledTo ? new Date(dto.scheduledTo) : null);
    this.assertMobileCropComplete(dto.useMobileImage ?? false, dto.mobileImageAssetId ?? null);
    this.assertLtrImageComplete(dto.ltrImageMode ?? 'mirror', dto.ltrImageAssetId ?? null, dto.ltrFocalPoint ?? null);
    assertCtaUsable('primaryCta', dto.primaryCta);
    assertCtaUsable('secondaryCta', dto.secondaryCta);

    // The portrait crop is checked by the same gate as the landscape one: an
    // archived or missing asset is the same defect whichever slot it sits in.
    if (dto.mobileImageAssetId) {
      await this.mediaAssetsService.assertUsableImage(dto.mobileImageAssetId);
    }
    if (dto.ltrImageAssetId) {
      await this.mediaAssetsService.assertUsableImage(dto.ltrImageAssetId);
    }

    return this.repository.create({
      pageSectionId: new Types.ObjectId(dto.pageSectionId),
      mediaType: dto.mediaType,
      imageAssetId: dto.imageAssetId ? new Types.ObjectId(dto.imageAssetId) : null,
      desktopFocalPoint: dto.desktopFocalPoint ?? { ...CENTRE },
      useMobileImage: dto.useMobileImage ?? false,
      mobileImageAssetId: dto.mobileImageAssetId ? new Types.ObjectId(dto.mobileImageAssetId) : null,
      mobileFocalPoint: dto.mobileFocalPoint ?? { ...CENTRE },
      ltrImageMode: dto.ltrImageMode ?? 'mirror',
      ltrImageAssetId: dto.ltrImageAssetId ? new Types.ObjectId(dto.ltrImageAssetId) : null,
      ltrFocalPoint: dto.ltrFocalPoint ?? null,
      videoId: dto.videoId ? new Types.ObjectId(dto.videoId) : null,
      eyebrow: dto.eyebrow ?? null,
      title: dto.title ?? { ...EMPTY_HERO_TEXT },
      subtitle: dto.subtitle ?? { ...EMPTY_HERO_TEXT },
      primaryCta: storedCta(dto.primaryCta),
      secondaryCta: storedCta(dto.secondaryCta),
      displayOrder: dto.displayOrder,
      active,
      scheduledFrom: dto.scheduledFrom ? new Date(dto.scheduledFrom) : null,
      scheduledTo: dto.scheduledTo ? new Date(dto.scheduledTo) : null,
    });
  }

  /** A phone crop that is switched on has to name a picture. Switched off, the
   *  picture may stay — turning the crop off for a campaign must not throw
   *  away the image chosen for it.
   *  @throws BadRequestException (`missingRequiredField`). */
  private assertMobileCropComplete(useMobileImage: boolean, mobileImageAssetId: string | null): void {
    if (useMobileImage && !mobileImageAssetId) {
      throw new BadRequestException({
        code: 'missingRequiredField',
        message: 'useMobileImage is on, so mobileImageAssetId is required.',
        field: 'mobileImageAssetId',
      });
    }
  }

  /** A separate English picture is a picture and the point its crop keeps;
   *  either alone leaves an English reader with a frame nobody composed. In
   *  the other two modes both may stay stored, unused, for the same reason a
   *  switched-off phone crop keeps its picture.
   *  @throws BadRequestException (`incompleteLtrImage`, naming the missing field). */
  private assertLtrImageComplete(
    mode: LtrImageMode,
    ltrImageAssetId: string | null,
    ltrFocalPoint: FocalPoint | null,
  ): void {
    if (mode !== 'separate') return;
    const field = !ltrImageAssetId ? 'ltrImageAssetId' : !ltrFocalPoint ? 'ltrFocalPoint' : null;
    if (!field) return;
    throw new BadRequestException({
      code: 'incompleteLtrImage',
      message: `ltrImageMode is "separate", so ${field} is required.`,
      field,
    });
  }

  /**
   * Applies a partial edit, and re-checks the media rule against the slide
   * the edit *produces* rather than against the body alone.
   *
   * That distinction is the whole correctness argument here. A body that
   * carries only `{ mediaType: 'VIDEO' }` looks harmless field by field, but
   * applied to a stored IMAGE slide it yields a VIDEO slide still holding an
   * `imageAssetId` — exactly the contradictory state `create` refuses to
   * write. So the merged shape is validated, not the request.
   *
   * @throws NotFoundException when no such slide exists.
   * @throws BadRequestException when the resulting slide would be contradictory.
   */
  async update(id: string, dto: UpdateHeroSlideDto): Promise<HeroSlideDocument> {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException('Hero slide not found.');
    }

    // Sent means not undefined (`wasSent`): an own-key test is true for every
    // field the pipeline's DTO instance declares, sent or not.
    const has = (key: keyof UpdateHeroSlideDto) => wasSent(dto, key);
    const mediaType = dto.mediaType ?? current.mediaType;
    const imageAssetId = has('imageAssetId')
      ? (dto.imageAssetId ?? null)
      : (current.imageAssetId?.toString() ?? null);
    const videoId = has('videoId') ? (dto.videoId ?? null) : (current.videoId?.toString() ?? null);

    if (mediaType === 'IMAGE') {
      if (videoId) {
        throw new BadRequestException('videoId must be omitted when mediaType is IMAGE.');
      }
    } else {
      if (!videoId) {
        throw new BadRequestException('videoId is required when mediaType is VIDEO.');
      }
      if (imageAssetId) {
        throw new BadRequestException('imageAssetId must be omitted when mediaType is VIDEO.');
      }
    }

    // The phone crop and the two buttons are checked on the merged slide for
    // the same reason the media pairing is. `{ useMobileImage: true }` alone
    // is valid as a body and invalid as a result; so is showing a button whose
    // label was never written.
    this.assertMobileCropComplete(
      dto.useMobileImage ?? current.useMobileImage,
      has('mobileImageAssetId')
        ? (dto.mobileImageAssetId ?? null)
        : (current.mobileImageAssetId?.toString() ?? null),
    );
    this.assertLtrImageComplete(
      dto.ltrImageMode ?? current.ltrImageMode ?? 'mirror',
      has('ltrImageAssetId') ? (dto.ltrImageAssetId ?? null) : (current.ltrImageAssetId?.toString() ?? null),
      has('ltrFocalPoint') ? (dto.ltrFocalPoint ?? null) : (current.ltrFocalPoint ?? null),
    );
    const merged = {
      eyebrow: has('eyebrow') ? dto.eyebrow : current.eyebrow,
      title: has('title') ? dto.title : current.title,
      subtitle: has('subtitle') ? dto.subtitle : current.subtitle,
    };
    assertHeroTexts(merged);
    assertVisibleSlideComplete({ ...merged, active: dto.active ?? current.active, mediaType, imageAssetId });
    assertScheduleOrder(
      has('scheduledFrom') ? (dto.scheduledFrom ? new Date(dto.scheduledFrom) : null) : (current.scheduledFrom ?? null),
      has('scheduledTo') ? (dto.scheduledTo ? new Date(dto.scheduledTo) : null) : (current.scheduledTo ?? null),
    );
    assertCtaUsable('primaryCta', has('primaryCta') ? dto.primaryCta : current.primaryCta);
    assertCtaUsable('secondaryCta', has('secondaryCta') ? dto.secondaryCta : current.secondaryCta);

    // Only images arriving in this request are checked. Re-checking a stored
    // one would make an unrelated edit fail because an asset was archived
    // after the slide was written — a surprise, and not this request's fault.
    if (has('imageAssetId') && dto.imageAssetId) {
      await this.mediaAssetsService.assertUsableImage(dto.imageAssetId);
    }
    if (has('mobileImageAssetId') && dto.mobileImageAssetId) {
      await this.mediaAssetsService.assertUsableImage(dto.mobileImageAssetId);
    }
    if (has('ltrImageAssetId') && dto.ltrImageAssetId) {
      await this.mediaAssetsService.assertUsableImage(dto.ltrImageAssetId);
    }

    const update: Record<string, unknown> = {};
    if (dto.mediaType !== undefined) update.mediaType = dto.mediaType;
    if (has('imageAssetId')) update.imageAssetId = imageAssetId ? new Types.ObjectId(imageAssetId) : null;
    if (dto.desktopFocalPoint !== undefined) update.desktopFocalPoint = dto.desktopFocalPoint;
    if (dto.useMobileImage !== undefined) update.useMobileImage = dto.useMobileImage;
    if (has('mobileImageAssetId')) {
      update.mobileImageAssetId = dto.mobileImageAssetId ? new Types.ObjectId(dto.mobileImageAssetId) : null;
    }
    if (dto.mobileFocalPoint !== undefined) update.mobileFocalPoint = dto.mobileFocalPoint;
    if (dto.ltrImageMode !== undefined) update.ltrImageMode = dto.ltrImageMode;
    if (has('ltrImageAssetId')) {
      update.ltrImageAssetId = dto.ltrImageAssetId ? new Types.ObjectId(dto.ltrImageAssetId) : null;
    }
    if (has('ltrFocalPoint')) update.ltrFocalPoint = dto.ltrFocalPoint ?? null;
    if (has('videoId')) update.videoId = videoId ? new Types.ObjectId(videoId) : null;
    if (has('eyebrow')) update.eyebrow = dto.eyebrow ?? null;
    if (dto.title !== undefined) update.title = dto.title;
    if (dto.subtitle !== undefined) update.subtitle = dto.subtitle;
    if (dto.primaryCta !== undefined) update.primaryCta = storedCta(dto.primaryCta);
    if (dto.secondaryCta !== undefined) update.secondaryCta = storedCta(dto.secondaryCta);
    if (dto.displayOrder !== undefined) update.displayOrder = dto.displayOrder;
    if (dto.active !== undefined) update.active = dto.active;
    if (has('scheduledFrom')) update.scheduledFrom = dto.scheduledFrom ? new Date(dto.scheduledFrom) : null;
    if (has('scheduledTo')) update.scheduledTo = dto.scheduledTo ? new Date(dto.scheduledTo) : null;

    const saved = await this.repository.updateById(id, update);
    if (!saved) {
      throw new NotFoundException('Hero slide not found.');
    }
    return saved;
  }

  /**
   * Writes a whole section's order in one call, `displayOrder` following the
   * position in `slideIds`.
   *
   * Every id must belong to the named section and the list must name every
   * one of its slides. A partial list would renumber the slides it carries
   * and leave the rest on their old numbers, which is how two slides end up
   * claiming the same position.
   *
   * @throws BadRequestException when the list does not match the section's slides exactly.
   */
  async reorder(dto: ReorderHeroSlidesDto): Promise<HeroSlideDocument[]> {
    const sectionId = new Types.ObjectId(dto.pageSectionId);
    const slides = await this.repository.find({ pageSectionId: sectionId });
    const stored = new Set(slides.map((slide) => slide._id.toString()));
    const asked = new Set(dto.slideIds);

    if (asked.size !== dto.slideIds.length) {
      throw new BadRequestException('slideIds contains the same slide more than once.');
    }
    if (asked.size !== stored.size || [...asked].some((id) => !stored.has(id))) {
      throw new BadRequestException('slideIds must name every slide of this section, and only those.');
    }

    await Promise.all(dto.slideIds.map((id, index) => this.repository.updateById(id, { displayOrder: index })));
    return this.repository.find({ pageSectionId: sectionId });
  }

  async findAll(): Promise<HeroSlideDocument[]> {
    return this.repository.find();
  }

  /** One section's slides in display order, for the editor — unlike the
   *  public read, this shows inactive and out-of-window slides too, because
   *  staging a slide before it goes live is the point of `active`. */
  async findBySection(pageSectionId: string): Promise<HeroSlideDocument[]> {
    const slides = await this.repository.find({ pageSectionId: new Types.ObjectId(pageSectionId) });
    return [...slides].sort((a, b) => a.displayOrder - b.displayOrder);
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
   *  pages → page-sections → heroSlides composition chain).
   *
   *  `selectVisibleInWindow` sorts by `displayOrder`, so the order the
   *  reader receives is the order the editor set, not whatever the index
   *  happened to yield. */
  async findPublicBySection(pageSectionId: string, now: Date = new Date()): Promise<HeroSlidePublicResponseDto[]> {
    const slides = await this.repository.find({ pageSectionId: new Types.ObjectId(pageSectionId), active: true });
    const visible = selectVisibleInWindow(
      slides,
      now,
      (slide) => slide.scheduledFrom,
      (slide) => slide.scheduledTo,
    );

    const images = await this.mediaAssetsService.resolvePublicImages(
      visible.flatMap((slide) => [slide.imageAssetId, slide.mobileImageAssetId, slide.ltrImageAssetId]),
    );

    return visible.map((slide) => this.toPublicResponse(slide, images));
  }

  /** Maps a full `HeroSlide` document to its public-safe shape (excludes
   *  the visibility-gate fields and the assets' provenance mark — see the
   *  DTO's doc comment). */
  toPublicResponse(
    slide: HeroSlideDocument,
    images: Map<string, PublicImageDto> = new Map(),
  ): HeroSlidePublicResponseDto {
    const framed = (ref: unknown, focalPoint: FocalPoint): HeroImagePublicResponseDto | null => {
      const image = ref ? (images.get(String(ref)) ?? null) : null;
      return image ? { image, focalPoint: { x: focalPoint?.x ?? 50, y: focalPoint?.y ?? 50 } } : null;
    };

    // A hidden button's words never leave the server: the reader receives the
    // object only when the visitor may see it, which is why the public shape
    // has no `isVisible` to be read wrongly.
    const cta = (stored: HeroCta): HeroCtaPublicResponseDto | null =>
      stored?.isVisible && stored.label && stored.url
        ? { label: stored.label, url: stored.url, isExternal: isExternalCtaUrl(stored.url) }
        : null;

    const desktop = framed(slide.imageAssetId, slide.desktopFocalPoint);

    // Resolved here, once, so every reader draws the same English picture. A
    // mirrored picture's crop has to keep the same subject, which after the
    // flip stands at 100 − x; sending the flipped point means no reader can
    // flip the picture and forget the crop.
    const ltr = (): HeroLtrImagePublicResponseDto | null => {
      if (!desktop) return null;
      const mode = slide.ltrImageMode ?? 'mirror';
      if (mode === 'separate') {
        const separate = slide.ltrFocalPoint ? framed(slide.ltrImageAssetId, slide.ltrFocalPoint) : null;
        return separate ? { ...separate, mirrored: false } : null;
      }
      if (mode === 'same') return { ...desktop, mirrored: false };
      return { image: desktop.image, focalPoint: { x: 100 - desktop.focalPoint.x, y: desktop.focalPoint.y }, mirrored: true };
    };

    return {
      id: slide._id.toString(),
      mediaType: slide.mediaType,
      desktop,
      desktopLtr: ltr(),
      // The phone crop is offered only when the slide switched it on. A stored
      // picture with the switch off is an editor's kept choice, not a crop.
      mobile: slide.useMobileImage ? framed(slide.mobileImageAssetId, slide.mobileFocalPoint) : null,
      videoId: slide.videoId ? slide.videoId.toString() : null,
      eyebrow: slide.eyebrow ?? null,
      title: slide.title,
      subtitle: slide.subtitle,
      primaryCta: cta(slide.primaryCta),
      secondaryCta: cta(slide.secondaryCta),
      displayOrder: slide.displayOrder,
    };
  }
}

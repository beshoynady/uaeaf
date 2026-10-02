import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SeasonsRepository } from './seasons.repository.js';
import type { SeasonDocument, SeasonPhase, SeasonKeyDate } from './schemas/season.schema.js';
import { CreateSeasonDto } from './dto/create-season.dto.js';
import { UpdateSeasonDto } from './dto/update-season.dto.js';
import { toPageSeo } from '../../../common/dto/page-seo.dto.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../../common/utils/mongo-errors.util.js';
import { wasSent, setDateField, setObjectIdField, setObjectIdArrayField } from '../../../common/utils/partial-update.util.js';
import { AlbumsRepository } from '../albums/albums.repository.js';
import { VideosRepository } from '../videos/videos.repository.js';
import type { LocalizedText } from '../../../common/schemas/localized-text.schema.js';
import type { PageSeo } from '../../../common/schemas/page-seo.schema.js';
import {
  dayRangeContains,
  dayRangesOverlap,
  dubaiDayRange,
  dubaiDayStart,
  dubaiNextDayStart,
} from '../../../common/utils/dubai-day-range.util.js';
import type { DayRange } from '../../../common/utils/dubai-day-range.util.js';

/** A season as every public route answers it — audit-trail fields from
 *  `BaseSchema` excluded, matching `AlbumPublicResponseDto`'s convention. */
export interface SeasonPublicResponse {
  id: string;
  name: LocalizedText;
  shortName: string;
  slug: string;
  tagline: LocalizedText | null;
  logoId: string | null;
  bannerId: string | null;
  shareImageId: string | null;
  about: LocalizedText;
  closingSummary: LocalizedText | null;
  startDate: Date;
  endDate: Date;
  phases: SeasonPhase[];
  keyDates: SeasonKeyDate[];
  calendarDocumentId: string | null;
  documentIds: string[];
  isCurrent: boolean;
  seo: PageSeo;
}

/** `null` for an absent id, an `ObjectId` for a present one — written once
 *  because several fields need it, matching `AlbumsService`'s own helper. */
const objectIdOrNull = (id: string | null | undefined): Types.ObjectId | null => (id ? new Types.ObjectId(id) : null);

/** Every phase/key-date date string turned into a real `Date`, so the stored
 *  document never carries the DTO's ISO strings. */
const toStoredPhases = (phases: CreateSeasonDto['phases']) =>
  (phases ?? []).map((phase) => ({ ...phase, from: new Date(phase.from), to: new Date(phase.to) }));

const toStoredKeyDates = (keyDates: CreateSeasonDto['keyDates']) =>
  (keyDates ?? []).map((entry) => ({ ...entry, date: new Date(entry.date) }));

/** How a refusal names a phase: its position in `phases[]`, which the form
 *  highlights, and its name in both languages. */
const describePhase = (phase: Pick<SeasonPhase, 'name'>, index: number) => ({ index, name: phase.name });

/**
 * Every phase is a span of inclusive Dubai calendar days inside the season's
 * own days, and no two phases of the same type share a day. Phases of
 * different types may overlap: registration runs during competition by design
 * (owner decision 2026-09-29).
 *
 * Checked on the phases the save would store, against the season dates it
 * would store, so shrinking a season past a phase it already has is refused
 * too.
 *
 * @throws UnprocessableEntityException when a phase ends on a day before it
 *   starts, or reaches outside the season.
 * @throws UnprocessableEntityException (`seasonPhaseOverlap`) naming both
 *   phases and their type when two of one type share a day.
 */
const assertPhasesFit = (phases: Pick<SeasonPhase, 'name' | 'type' | 'from' | 'to'>[], season: DayRange): void => {
  const ranges = phases.map((phase, index) => {
    const range = dubaiDayRange(phase.from, phase.to);
    if (!(range.from.getTime() < range.to.getTime())) {
      throw new UnprocessableEntityException({
        code: 'seasonPhaseOutOfRange',
        message: `Phase "${phase.name.en}" must not end on a day before it starts.`,
        phase: describePhase(phase, index),
      });
    }
    if (!dayRangeContains(season, range)) {
      throw new UnprocessableEntityException({
        code: 'seasonPhaseOutOfRange',
        message: `Phase "${phase.name.en}" must fall within the season's first and last day.`,
        phase: describePhase(phase, index),
      });
    }
    return range;
  });

  phases.forEach((first, i) => {
    phases.slice(i + 1).forEach((second, offset) => {
      const j = i + 1 + offset;
      if (first.type !== second.type || !dayRangesOverlap(ranges[i], ranges[j])) return;
      throw new UnprocessableEntityException({
        code: 'seasonPhaseOverlap',
        message: `Phases "${first.name.en}" and "${second.name.en}" are both of type "${first.type}" and share at least one day.`,
        phaseType: first.type,
        phases: [describePhase(first, i), describePhase(second, j)],
      });
    });
  });
};

/**
 * Implements: `seasons` collection, Domain 5 — Media Center.
 *
 * Carries no `publish()` of its own (see `season.schema.ts`): moving a
 * season to `Live` is `PublishingService`'s job (`publishDirect`, or
 * `publishApproved` after a review), so this service is never a path into
 * that state at all.
 */
@Injectable()
export class SeasonsService {
  constructor(
    private readonly repository: SeasonsRepository,
    private readonly albumsRepository: AlbumsRepository,
    private readonly videosRepository: VideosRepository,
  ) {}

  /** `startDate`/`endDate` are the season's first and last Dubai calendar
   *  days, both inclusive (see `dubai-day-range.util.ts`).
   *  @throws UnprocessableEntityException when `startDate` is not before `endDate`.
   *  @throws UnprocessableEntityException when a phase does not fit (`assertPhasesFit`).
   *  @throws ConflictException (`seasonOverlap`) when a day is shared with a live season.
   *  @throws ConflictException when `slug` is already taken. */
  async create(dto: CreateSeasonDto): Promise<SeasonDocument> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    this.assertValidRange(startDate, endDate);
    const days = dubaiDayRange(startDate, endDate);
    const phases = toStoredPhases(dto.phases);
    assertPhasesFit(phases, days);
    await this.assertNoOverlap(days);

    try {
      return await this.repository.create({
        name: dto.name,
        shortName: dto.shortName,
        slug: dto.slug,
        tagline: dto.tagline ?? null,
        logoId: objectIdOrNull(dto.logoId),
        bannerId: objectIdOrNull(dto.bannerId),
        shareImageId: objectIdOrNull(dto.shareImageId),
        about: dto.about,
        closingSummary: dto.closingSummary ?? null,
        startDate,
        endDate,
        phases,
        keyDates: toStoredKeyDates(dto.keyDates),
        calendarDocumentId: objectIdOrNull(dto.calendarDocumentId),
        documentIds: (dto.documentIds ?? []).map((id) => new Types.ObjectId(id)),
        isCurrent: false,
        publicationState: dto.publicationState,
        publishDate: null,
        publishedBy: null,
        isVisible: dto.isVisible ?? false,
        seo: dto.seo ? toPageSeo(dto.seo) : { metaTitle: null, metaDescription: null, ogImageId: null },
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'slug'}.`);
      }
      throw error;
    }
  }

  /** Checks the range on the season the edit *produces*: `startDate`/
   *  `endDate` are read back from `update` rather than re-derived from
   *  `dto`, so there is exactly one place either becomes a `Date` (the
   *  setters below), matching `PageSectionsService.update()`'s convention.
   *  @throws NotFoundException when `id` references no season.
   *  Phases are checked the same way: the ones sent, or the stored ones when
   *  none are, against the merged days.
   *  @throws NotFoundException when `id` references no season.
   *  @throws UnprocessableEntityException when the merged range is not `startDate < endDate`.
   *  @throws UnprocessableEntityException when a phase does not fit (`assertPhasesFit`).
   *  @throws ConflictException (`seasonOverlap`) when the merged days share one with a different live season. */
  async update(id: string, dto: UpdateSeasonDto): Promise<SeasonDocument | null> {
    const current = await this.assertSeason(id);

    const has = (key: keyof UpdateSeasonDto) => wasSent(dto, key);

    const update: Record<string, unknown> = {};
    setDateField(update, dto, 'startDate', { nullable: false });
    setDateField(update, dto, 'endDate', { nullable: false });

    const startDate = 'startDate' in update ? (update.startDate as Date) : current.startDate;
    const endDate = 'endDate' in update ? (update.endDate as Date) : current.endDate;
    this.assertValidRange(startDate, endDate);
    const days = dubaiDayRange(startDate, endDate);
    const phases = has('phases') ? toStoredPhases(dto.phases) : current.phases;
    assertPhasesFit(phases, days);
    await this.assertNoOverlap(days, id);

    if (has('name')) update.name = dto.name;
    if (has('shortName')) update.shortName = dto.shortName;
    if (has('tagline')) update.tagline = dto.tagline ?? null;
    setObjectIdField(update, dto, 'logoId', { nullable: true });
    setObjectIdField(update, dto, 'bannerId', { nullable: true });
    setObjectIdField(update, dto, 'shareImageId', { nullable: true });
    if (has('about')) update.about = dto.about;
    if (has('closingSummary')) update.closingSummary = dto.closingSummary ?? null;
    if (has('phases')) update.phases = phases;
    if (has('keyDates')) update.keyDates = toStoredKeyDates(dto.keyDates);
    setObjectIdField(update, dto, 'calendarDocumentId', { nullable: true });
    setObjectIdArrayField(update, dto, 'documentIds');
    if (has('isVisible')) update.isVisible = dto.isVisible;
    if (dto.seo !== undefined) update.seo = toPageSeo(dto.seo);

    return this.repository.updateById(id, update);
  }

  /**
   * The dates are inclusive Dubai calendar days, so a season whose first and
   * last day are the same lasts one day and is valid — the same way a
   * one-day phase is. Only a last day that falls BEFORE the first is refused,
   * and the comparison is between days, not instants: two moments on one
   * Dubai day are the same day however far apart their clocks are.
   *
   * @throws UnprocessableEntityException when the last day precedes the first.
   */
  private assertValidRange(startDate: Date, endDate: Date): void {
    if (dubaiDayStart(endDate).getTime() < dubaiDayStart(startDate).getTime()) {
      throw new UnprocessableEntityException('A season must not end on a day before it starts.');
    }
  }

  /** @throws ConflictException (`seasonOverlap`) when `days` shares a Dubai
   *  calendar day with a live season other than `excludeId`. */
  private async assertNoOverlap(days: DayRange, excludeId?: string): Promise<void> {
    const [conflict] = await this.repository.findOverlapping(days, excludeId);
    if (!conflict) {
      return;
    }
    throw new ConflictException({
      code: 'seasonOverlap',
      message: `This range overlaps season "${conflict.slug}" (${conflict.startDate.toISOString()} – ${conflict.endDate.toISOString()}).`,
      conflictingSeasonId: conflict._id.toString(),
    });
  }

  /**
   * Makes this season current, clearing whoever held it before.
   *
   * The existence check happens inside the same transaction the repository
   * runs (`SeasonsRepository.setCurrent`), at the moment of the write rather
   * than before it — a `null` result here means the id never resolved to a
   * live season, and the previous holder's clear was rolled back with it.
   *
   * @throws NotFoundException when `id` references no live season.
   */
  async setCurrent(id: string): Promise<SeasonDocument> {
    const updated = await this.repository.setCurrent(id);
    if (!updated) {
      throw new NotFoundException(`Season ${id} not found.`);
    }
    return updated;
  }

  /**
   * Archives a season, refusing when a live album or video still falls
   * inside its date range.
   *
   * `albums`/`videos` carry no `seasonId` — an album's season is derived
   * from `eventDate`, a video's from `publishedAt` — so the check queries
   * both directly by the season's own range rather than joining on an id
   * that does not exist. `publicEvents` does not exist yet; the list below
   * is where a future referrer joins, not a rewrite of this method.
   *
   * @throws NotFoundException when `id` references no season.
   * @throws ConflictException naming what still references it.
   */
  async remove(id: string, archivedBy: Types.ObjectId): Promise<SeasonDocument | null> {
    const season = await this.assertSeason(id);
    const referrers = await this.referrersOf(season);
    if (referrers.length > 0) {
      throw new ConflictException({
        code: 'stillReferenced',
        message: `Season ${id} is still referenced by ${referrers.join(', ')}. Hide it instead, or remove those first.`,
        referrers,
      });
    }
    return this.repository.softDelete(id, archivedBy);
  }

  /** Every kind of live content still falling inside this season's days —
   *  the whole of its first and last Dubai day included — each named with a
   *  count: what `remove()` reports in its refusal. */
  private async referrersOf(season: SeasonDocument): Promise<string[]> {
    const days = dubaiDayRange(season.startDate, season.endDate);
    const range = { $gte: days.from, $lt: days.to };
    const [albums, videos] = await Promise.all([
      this.albumsRepository.findPaginated(0, 1, { eventDate: range }),
      this.videosRepository.findPaginated(0, 1, { publishedAt: range }),
    ]);

    const referrers: string[] = [];
    if (albums.total > 0) referrers.push(`${albums.total} album(s)`);
    if (videos.total > 0) referrers.push(`${videos.total} video(s)`);
    return referrers;
  }

  /**
   * Brings an archived season back.
   *
   * The overlap check reads live seasons only, so while this one was archived
   * another may have been given its days; restoring it then would put two
   * live seasons on one day, which `create` and `update` both refuse. Checked
   * here the same way, against every other live season. A season that is not
   * archived is answered as it is, as `restore` always has.
   *
   * @throws ConflictException (`seasonOverlap`) when another live season now
   *   shares one of its days.
   * @throws ConflictException when another live season now holds its slug.
   */
  async unarchive(id: string): Promise<SeasonDocument | null> {
    const season = await this.repository.findByIdIncludingArchived(id);
    if (season?.archivedAt) {
      await this.assertNoOverlap(dubaiDayRange(season.startDate, season.endDate), id);
    }
    try {
      return await this.repository.restore(id);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'slug'}.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<SeasonDocument[]> {
    return this.repository.listOrdered();
  }

  async findById(id: string): Promise<SeasonDocument | null> {
    return this.repository.findById(id);
  }

  /** The public archive: every season a visitor may see, most recently
   *  started first. */
  async listPublic(): Promise<SeasonPublicResponse[]> {
    const seasons = await this.repository.listPublic();
    return seasons.map(SeasonsService.toPublicResponse);
  }

  /** The current season, restricted to what a visitor may see — `null` when
   *  none is current, or the current one is a Draft or hidden. */
  async getPublicCurrent(): Promise<SeasonPublicResponse | null> {
    const season = await this.repository.findPublicCurrent();
    return season ? SeasonsService.toPublicResponse(season) : null;
  }

  /** The individual public season page: `null` (not a thrown error) when
   *  `slug` doesn't resolve to a season a visitor may see, mirroring
   *  `AlbumsService.getPublicBySlug()`'s convention. */
  async getPublicBySlug(slug: string): Promise<SeasonPublicResponse | null> {
    const season = await this.repository.findPublicBySlug(slug);
    return season ? SeasonsService.toPublicResponse(season) : null;
  }

  /** Strips the audit-trail fields `BaseSchema` carries — a visitor has no
   *  business reading who created or last touched a season record. */
  private static toPublicResponse(season: SeasonDocument): SeasonPublicResponse {
    return {
      id: season._id.toString(),
      name: season.name,
      shortName: season.shortName,
      slug: season.slug,
      tagline: season.tagline,
      logoId: season.logoId?.toString() ?? null,
      bannerId: season.bannerId?.toString() ?? null,
      shareImageId: season.shareImageId?.toString() ?? null,
      about: season.about,
      // Shown once the whole last Dubai day is over, not from its first moment.
      closingSummary: dubaiNextDayStart(season.endDate).getTime() <= Date.now() ? season.closingSummary : null,
      startDate: season.startDate,
      endDate: season.endDate,
      phases: season.phases,
      keyDates: season.keyDates,
      calendarDocumentId: season.calendarDocumentId?.toString() ?? null,
      documentIds: season.documentIds.map((id) => id.toString()),
      isCurrent: season.isCurrent,
      seo: season.seo,
    };
  }

  /** @throws NotFoundException when `id` references no season. */
  private async assertSeason(id: string): Promise<SeasonDocument> {
    const season = await this.repository.findById(id);
    if (!season) {
      throw new NotFoundException(`Season ${id} not found.`);
    }
    return season;
  }
}

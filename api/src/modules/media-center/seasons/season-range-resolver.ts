import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Season } from './schemas/season.schema.js';
import type { SeasonDocument } from './schemas/season.schema.js';
import { PUBLISHED_SEASON } from './seasons.repository.js';
import { seasonRange } from '../videos/season.js';
import type { SeasonRange } from '../videos/season.js';
import { dubaiDayRange } from '../../../common/utils/dubai-day-range.util.js';

/**
 * What the public album and video filters read a `season` parameter as.
 *
 * Two forms are accepted, checked in this order:
 *
 * 1. **A label** (`2025–2026`, en dash) goes to `seasonRange` exactly as it
 *    always has: UTC midnight, 1 September to 1 September. Old links keep
 *    returning the same albums and videos, and `seasonRange` itself is not
 *    changed, because its other callers (the album facets, the video
 *    `season` field) would move with it.
 * 2. **A season's slug** (`2026-2027`, or any other slug) resolves to that
 *    season's own inclusive Asia/Dubai days, through `dubaiDayRange` — the
 *    same range the season's page, its delete guard and its overlap check
 *    use. Only a season a visitor may see resolves: a Draft or hidden season
 *    does not publish its dates through a filter.
 *
 * Anything else resolves to `null`, which the filters read as "no season" —
 * a stale link shows the library, not an empty page.
 */
export type FindSeasonDays = (slug: string) => Promise<Pick<Season, 'startDate' | 'endDate'> | null>;

export const resolveSeasonRange = async (
  param: string | undefined,
  findSeasonDays: FindSeasonDays,
): Promise<SeasonRange | null> => {
  if (!param) return null;
  const label = seasonRange(param);
  if (label) return label;

  const season = await findSeasonDays(param.trim());
  return season ? dubaiDayRange(season.startDate, season.endDate) : null;
};

/** `resolveSeasonRange` against the `seasons` collection. Registered by the
 *  album and video modules directly on the `Season` model rather than through
 *  `SeasonsModule`, which imports both of them for its delete guard. */
@Injectable()
export class SeasonRangeResolver {
  constructor(@InjectModel(Season.name) private readonly model: Model<SeasonDocument>) {}

  resolve(param: string | undefined): Promise<SeasonRange | null> {
    return resolveSeasonRange(param, (slug) =>
      this.model.findOne({ slug, ...PUBLISHED_SEASON }).select({ startDate: 1, endDate: 1 }).lean().exec(),
    );
  }
}

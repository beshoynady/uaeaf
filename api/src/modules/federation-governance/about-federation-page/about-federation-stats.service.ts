import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

/**
 * The four numbers the About page's ecosystem section prints.
 *
 * Every one of them is counted from the records themselves. None is stored on
 * the page and none may be typed by an editor: a figure written by hand is
 * correct on the day it is written and silently wrong from the next club that
 * registers, with nothing in the system able to notice.
 *
 * `null` means "no source", and it is not the same as `0`. Zero clubs is a
 * fact the page may state; an unknown number of championships is not, so the
 * section drops that tile instead of printing a placeholder. There is no
 * championships collection in this platform yet — building one is a domain of
 * its own, out of this page's scope — so that key is permanently `null` here
 * until one exists, and the page is written to survive its absence.
 */
export interface AboutFederationCounts {
  clubs: number | null;
  athletes: number | null;
  officials: number | null;
  championships: null;
}

@Injectable()
export class AboutFederationStatsService {
  private readonly logger = new Logger(AboutFederationStatsService.name);

  constructor(
    @InjectModel('Club') private readonly clubs: Model<unknown>,
    @InjectModel('Athlete') private readonly athletes: Model<unknown>,
    @InjectModel('Official') private readonly officials: Model<unknown>,
  ) {}

  async counts(): Promise<AboutFederationCounts> {
    // Each source is counted the way its own public listing reads it, so the
    // tile and the listing behind it can never disagree. `clubs` is the only
    // one of the three carrying a status: a club marked Inactive is not a
    // member of the system today, and counting it would overstate the
    // federation on its own About page.
    const [clubs, athletes, officials] = await Promise.all([
      this.countOf(this.clubs, 'clubs', { archivedAt: null, status: 'Active' }),
      this.countOf(this.athletes, 'athletes', { archivedAt: null }),
      this.countOf(this.officials, 'officials', { archivedAt: null }),
    ]);

    return { clubs, athletes, officials, championships: null };
  }

  /**
   * One source's count, or `null` when it could not be read.
   *
   * A failure is swallowed deliberately. This is one section of a page that is
   * otherwise complete, and a database hiccup while counting clubs is not a
   * reason for a visitor to get an error instead of the federation's history.
   * It is logged so the failure is not silent to us, and the tile disappears
   * rather than showing a number nobody can vouch for.
   */
  private async countOf(
    model: Model<unknown>,
    name: string,
    filter: Record<string, unknown>,
  ): Promise<number | null> {
    try {
      return await model.countDocuments(filter).exec();
    } catch (error) {
      this.logger.warn(`About page: could not count ${name}; its tile will not be printed.`, error);
      return null;
    }
  }
}

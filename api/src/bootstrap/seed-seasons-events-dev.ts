import { Types } from 'mongoose';
import type { Model } from 'mongoose';

/**
 * Development data for `seasons` and `publicEvents` — two collections that
 * are specified but not yet built (`api/src/app.module.ts` registers neither
 * module today). This file seeds both against the shape each will have once
 * it lands, so the same script fills them with no edit once it does.
 *
 * `seasons` is written strictly against
 * `docs/design-specs/seasons/2026-09-29-seasons-design.md` §3, the one field
 * table that exists for either collection. No equivalent table exists yet
 * for `publicEvents` anywhere in the repository — the project that
 * specifies it (`docs/design-specs/seasons-events-designs.zip`'s `events/`
 * half) has mockups but no written field spec. The `PublicEvent` shape below
 * is this script's own minimal inference from the six states asked for, not
 * a cited source; treat every field on it as provisional and expect to
 * revise this half once the real spec exists.
 *
 * Every date on a seeded season or event is computed from the `now` passed
 * in, never a fixed calendar date — a row asked to look "in progress" must
 * still look that way whenever this later runs.
 */

const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

/** Midnight Asia/Dubai on the given calendar date, stored as its UTC instant
 *  — the platform convention (§10 of the seasons spec) for any date whose
 *  meaning is a calendar day rather than a relative offset. */
const dubaiMidnightUtc = (year: number, monthIndex0: number, day: number): Date =>
  new Date(Date.UTC(year, monthIndex0, day) - DUBAI_OFFSET_MS);

const days = (n: number): number => n * 24 * 60 * 60 * 1000;

const markAr = (text: string): string => `${text} (تجريبي)`;
const markEn = (text: string): string => `${text} (demo)`;

export const DEMO_SLUG_PREFIX = 'demo-';

/** The Sep 1 → Aug 31 boundary `seasons.ts`'s existing `seasonRange` already
 *  assumes (`api/src/modules/media-center/videos/season.ts`) — reused here,
 *  not a new convention, so the seeded "current" season lines up with what
 *  the fallback resolver would already compute for the same date. */
const seasonBoundsForStartYear = (startYear: number): { start: Date; end: Date } => ({
  start: dubaiMidnightUtc(startYear, 8, 1),
  end: dubaiMidnightUtc(startYear + 1, 7, 31),
});

const currentSeasonStartYear = (now: Date): number => {
  const year = now.getUTCFullYear();
  return now >= dubaiMidnightUtc(year, 8, 1) ? year : year - 1;
};

const shortName = (start: Date, end: Date): string =>
  `${start.getUTCFullYear().toString().slice(-2)}/${end.getUTCFullYear().toString().slice(-2)}`;

const seasonSlug = (start: Date, end: Date): string =>
  `${DEMO_SLUG_PREFIX}${start.getUTCFullYear()}-${end.getUTCFullYear()}`;

export interface SeasonsEventsDemoModels {
  seasons: Model<Record<string, unknown>> | null;
  publicEvents: Model<Record<string, unknown>> | null;
}

export interface SeasonsEventsDemoReport {
  seasons: { created: number; existing: number; skipped: boolean };
  publicEvents: { created: number; existing: number; skipped: boolean };
}

/** Creates three seasons (previous, current, next — `isCurrent` on the one
 *  containing `now`) and eight public events spread across every state the
 *  brief asks for. Each half is skipped, and says so, when its model is not
 *  registered rather than throwing. */
export const seedSeasonsAndEventsDemo = async (
  models: SeasonsEventsDemoModels,
  now: Date,
): Promise<SeasonsEventsDemoReport> => {
  const report: SeasonsEventsDemoReport = {
    seasons: { created: 0, existing: 0, skipped: true },
    publicEvents: { created: 0, existing: 0, skipped: true },
  };

  if (models.seasons) {
    report.seasons.skipped = false;
    const currentStartYear = currentSeasonStartYear(now);
    const previous = seasonBoundsForStartYear(currentStartYear - 1);
    const current = seasonBoundsForStartYear(currentStartYear);
    const next = seasonBoundsForStartYear(currentStartYear + 1);

    const seasonRows = [
      {
        id: 5001,
        range: previous,
        isCurrent: false,
        publicationState: 'Published' as const,
        isVisible: true,
        closingSummary: true,
        withTimeline: false,
      },
      {
        id: 5002,
        range: current,
        isCurrent: true,
        publicationState: 'Published' as const,
        isVisible: true,
        closingSummary: false,
        withTimeline: true,
      },
      {
        id: 5003,
        range: next,
        isCurrent: false,
        publicationState: 'Draft' as const,
        isVisible: false,
        closingSummary: false,
        withTimeline: false,
      },
    ];

    for (const row of seasonRows) {
      const _id = new Types.ObjectId(`df${row.id}`.padStart(24, '0'));
      if (await models.seasons.findOne({ _id }).lean()) {
        report.seasons.existing += 1;
        continue;
      }
      const startYear = row.range.start.getUTCFullYear();
      const endYear = row.range.end.getUTCFullYear();
      const name = {
        en: markEn(`Season ${startYear}–${endYear}`),
        ar: markAr(`موسم ${startYear}–${endYear}`),
      };
      await models.seasons.create({
        _id,
        name,
        shortName: shortName(row.range.start, row.range.end),
        slug: seasonSlug(row.range.start, row.range.end),
        tagline: null,
        logoId: null,
        bannerId: null,
        shareImageId: null,
        about: {
          en: `Demo content for the ${startYear}–${endYear} season, seeded for local review.`,
          ar: `محتوى تجريبي لموسم ${startYear}–${endYear}، أُدرج لأغراض المراجعة المحلية.`,
        },
        closingSummary: row.closingSummary
          ? {
              en: 'The season closed with the demo programme completed across all seeded clubs.',
              ar: 'اختُتم الموسم ببرنامج العرض التجريبي مكتملاً عبر كل الأندية المُدرجة.',
            }
          : null,
        startDate: row.range.start,
        endDate: row.range.end,
        phases: row.withTimeline
          ? [
              {
                name: { en: 'Preparation', ar: 'إعداد' },
                type: 'preparation',
                from: row.range.start,
                to: new Date(row.range.start.getTime() + days(60)),
              },
              {
                name: { en: 'Domestic competition', ar: 'منافسات داخلية' },
                type: 'domestic',
                from: new Date(row.range.start.getTime() + days(60)),
                to: new Date(row.range.start.getTime() + days(180)),
              },
              {
                name: { en: 'International competition', ar: 'منافسات خارجية' },
                type: 'international',
                from: new Date(row.range.start.getTime() + days(180)),
                to: new Date(row.range.start.getTime() + days(300)),
              },
              {
                name: { en: 'Rest', ar: 'راحة' },
                type: 'rest',
                from: new Date(row.range.start.getTime() + days(300)),
                to: row.range.end,
              },
            ]
          : [],
        keyDates: row.withTimeline
          ? [
              { title: { en: 'Registration opens', ar: 'فتح باب التسجيل' }, date: row.range.start },
              {
                title: { en: 'Season closing ceremony', ar: 'حفل ختام الموسم' },
                date: row.range.end,
              },
            ]
          : [],
        calendarDocumentId: null,
        documentIds: [],
        isCurrent: row.isCurrent,
        publicationState: row.publicationState,
        publishedAt: row.publicationState === 'Published' ? row.range.start : null,
        publishedBy: null,
        isVisible: row.isVisible,
        seo: { metaTitle: name, metaDescription: null, ogImageId: null },
      });
      report.seasons.created += 1;
    }
  }

  if (models.publicEvents) {
    report.publicEvents.skipped = false;

    type EventStatus = 'Scheduled' | 'Postponed';
    type PublicationState = 'Draft' | 'Published';

    interface EventRow {
      id: number;
      en: string;
      ar: string;
      startOffsetDays: number;
      endOffsetDays: number;
      status: EventStatus;
      publicationState: PublicationState;
      isVisible: boolean;
    }

    // Eight rows covering, in order: in progress, two upcoming (near and
    // far), two past, postponed, hidden, and a draft still to be published
    // ("scheduled to appear later" — it has no public existence until then).
    const eventRows: EventRow[] = [
      { id: 1, en: 'UAE Open Track Meet', ar: 'بطولة الإمارات المفتوحة للمضمار', startOffsetDays: -1, endOffsetDays: 2, status: 'Scheduled', publicationState: 'Published', isVisible: true },
      { id: 2, en: 'National Relay Cup', ar: 'كأس التتابع الوطني', startOffsetDays: 7, endOffsetDays: 8, status: 'Scheduled', publicationState: 'Published', isVisible: true },
      { id: 3, en: 'Spring Championship', ar: 'بطولة الربيع', startOffsetDays: 90, endOffsetDays: 92, status: 'Scheduled', publicationState: 'Published', isVisible: true },
      { id: 4, en: 'Desert Cross Country', ar: 'اختراق الضاحية الصحراوي', startOffsetDays: -45, endOffsetDays: -44, status: 'Scheduled', publicationState: 'Published', isVisible: true },
      { id: 5, en: "Founders' Memorial Meet", ar: 'بطولة ذكرى المؤسسين', startOffsetDays: -200, endOffsetDays: -199, status: 'Scheduled', publicationState: 'Published', isVisible: true },
      { id: 6, en: 'Coastal Youth Games', ar: 'ألعاب الشباب الساحلية', startOffsetDays: 20, endOffsetDays: 21, status: 'Postponed', publicationState: 'Published', isVisible: true },
      { id: 7, en: 'Federation Gala Meet', ar: 'بطولة حفل الاتحاد', startOffsetDays: 15, endOffsetDays: 16, status: 'Scheduled', publicationState: 'Published', isVisible: false },
      { id: 8, en: 'Winter Invitational', ar: 'دعوة الشتاء', startOffsetDays: 60, endOffsetDays: 61, status: 'Scheduled', publicationState: 'Draft', isVisible: false },
    ];

    for (const row of eventRows) {
      const _id = new Types.ObjectId(`df6${row.id.toString().padStart(3, '0')}`.padStart(24, '0'));
      if (await models.publicEvents.findOne({ _id }).lean()) {
        report.publicEvents.existing += 1;
        continue;
      }
      await models.publicEvents.create({
        _id,
        name: { en: markEn(row.en), ar: markAr(row.ar) },
        slug: `${DEMO_SLUG_PREFIX}${row.en
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')}`,
        startDate: new Date(now.getTime() + days(row.startOffsetDays)),
        endDate: new Date(now.getTime() + days(row.endOffsetDays)),
        location: { en: 'Dubai', ar: 'دبي' },
        status: row.status,
        publicationState: row.publicationState,
        isVisible: row.isVisible,
        publishedAt: row.publicationState === 'Published' ? new Date(now.getTime() - days(1)) : null,
      });
      report.publicEvents.created += 1;
    }
  }

  return report;
};

export interface SeasonsEventsCleanResult {
  seasons: number | null;
  publicEvents: number | null;
}

/** Removes exactly the rows `seedSeasonsAndEventsDemo` created, matched by
 *  the same `demo-` slug prefix used to create them. `null` on either field
 *  means that collection's model was not registered — nothing to remove,
 *  not a failed removal. */
export const cleanSeasonsAndEventsDemo = async (
  models: SeasonsEventsDemoModels,
): Promise<SeasonsEventsCleanResult> => {
  const slugFilter = { slug: { $regex: `^${DEMO_SLUG_PREFIX}` } };
  const seasons = models.seasons ? (await models.seasons.deleteMany(slugFilter).exec()).deletedCount ?? 0 : null;
  const publicEvents = models.publicEvents
    ? (await models.publicEvents.deleteMany(slugFilter).exec()).deletedCount ?? 0
    : null;
  return { seasons, publicEvents };
};

import type { Model } from 'mongoose';
import type { Page } from '../modules/cms-page-composition/pages/schemas/pages.schema.js';
import type { PageSection } from '../modules/cms-page-composition/page-sections/schemas/page-sections.schema.js';

/**
 * The homepage's `VIDEO_LIBRARY` row, created once by `bootstrap:admin`.
 *
 * ── Why the bootstrap owns this and not a migration ────────────────────────
 *
 * Every other homepage section is created by whoever composed the page. This
 * one has a dashboard screen, a public endpoint and a rendered section all
 * written against a row that no deploy produces — so on any environment but
 * the one it was built on, the feature is silently absent: the public endpoint
 * answers `enabled: false`, the section draws nothing, and the dashboard
 * editor reports that the section is missing. Nothing is broken and nothing
 * says why.
 *
 * `bootstrap:admin` already exists to make an empty database usable and is
 * already re-run on every deploy, which is exactly this job.
 *
 * ── Create if absent, never update ─────────────────────────────────────────
 *
 * Not an upsert. An upsert re-applies the defaults on every deploy, so an
 * editor who set the count to 12, hid the section or wrote their own heading
 * would find it reset by the next release — silently, because a deploy script
 * reports success either way. A row that exists is the editor's, and this
 * leaves it alone.
 */

export const VIDEO_SECTION_TYPE = 'VIDEO_LIBRARY';

/**
 * What an unconfigured video section is.
 *
 * Stated once, here, because two other places already encode the same
 * answer — the dashboard's `readSectionDraft` fallbacks and the API's
 * `video-settings.ts` reader — and three copies of "the default count is 8"
 * is two chances to disagree.
 *
 * The texts are the approved design's. They are real copy, not placeholders:
 * a section seeded with "Section title" would put that on the federation's
 * homepage until someone noticed.
 */
export const VIDEO_SECTION_DEFAULTS = {
  sectionTitle: { en: 'From the heart of the track', ar: 'من قلب المضمار' },
  sectionSubtitle: {
    en: "The latest clips from the federation's championships and events",
    ar: 'أحدث اللقطات والمقاطع من بطولات الاتحاد وفعالياته',
  },
  configuration: {
    eyebrow: { en: 'Media Centre', ar: 'المركز الإعلامي' },
    featured: { mode: 'latest' as const },
    carousel: {
      source: 'latest' as const,
      count: 8,
      includeReels: false,
      heading: { en: 'Latest clips', ar: 'أحدث المقاطع' },
    },
  },
} as const;

export interface VideoSectionModels {
  pages: Model<Page>;
  pageSections: Model<PageSection>;
}

/** `created` on the first run, `exists` on every run after it, and
 *  `noHomepage` when there is no page to attach the section to. */
export type VideoSectionSeedResult = 'created' | 'exists' | 'noHomepage';

const HOMEPAGE_SLUG = 'home';

export const seedVideoSection = async (models: VideoSectionModels): Promise<VideoSectionSeedResult> => {
  const homepage = await models.pages.findOne({ slug: HOMEPAGE_SLUG, archivedAt: null }).exec();
  // An empty cluster has no pages at all. The administrator still has to be
  // created, so this reports and returns rather than throwing.
  if (!homepage) {
    return 'noHomepage';
  }

  const existing = await models.pageSections
    .findOne({ pageId: homepage._id, sectionType: VIDEO_SECTION_TYPE })
    .exec();
  if (existing) {
    return 'exists';
  }

  // After everything already composed, rather than at a fixed index: a
  // hardcoded `displayOrder` would collide with whatever section already holds
  // it and drop the video stage into the middle of a page nobody asked it to
  // join. Where it finally sits is the editor's to decide.
  const last = await models.pageSections
    .findOne({ pageId: homepage._id })
    .sort({ displayOrder: -1 })
    .select('displayOrder')
    .lean()
    .exec();

  await models.pageSections.create({
    pageId: homepage._id,
    sectionType: VIDEO_SECTION_TYPE,
    displayOrder: (last?.displayOrder ?? -1) + 1,
    enabled: true,
    visibility: 'Everyone',
    selectionMode: 'AUTOMATIC',
    sectionTitle: VIDEO_SECTION_DEFAULTS.sectionTitle,
    sectionSubtitle: VIDEO_SECTION_DEFAULTS.sectionSubtitle,
    configuration: VIDEO_SECTION_DEFAULTS.configuration,
  });

  return 'created';
};

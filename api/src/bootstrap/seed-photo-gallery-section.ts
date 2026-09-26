import type { Model } from 'mongoose';
import type { Page } from '../modules/cms-page-composition/pages/schemas/pages.schema.js';
import type { PageSection } from '../modules/cms-page-composition/page-sections/schemas/page-sections.schema.js';

/**
 * The homepage's `PHOTO_GALLERY` row, created once by `bootstrap:admin`.
 *
 * ── Why this row is seeded, and not composed ───────────────────────────────
 *
 * The albums section has a dashboard screen, a public endpoint and a rendered
 * section, all written against a row that no deploy produces. Without this,
 * the feature is silently absent on every environment but the one it was built
 * on: the endpoint answers `enabled: false`, the section draws nothing, and
 * the dashboard reports the section missing. Nothing is broken and nothing
 * says why. `bootstrap:admin` already exists to make a database usable and
 * already runs on every deploy, which is exactly this job.
 *
 * ── `PHOTO_GALLERY`, not `PHOTO_ALBUMS` ───────────────────────────────────
 *
 * `PAGE_SECTION_TYPES` is a closed list read verbatim from the live FigJam
 * board, and `PHOTO_GALLERY` is already in it — as is `albums` in
 * `PAGE_SECTION_ITEM_TARGETS`, and a `PHOTO_GALLERY` entry in the dashboard's
 * own section rail. Adding a second type for the same section would put the
 * codebase at odds with the board and leave two rows competing for one slot.
 *
 * ── Create if absent, never update ────────────────────────────────────────
 *
 * Not an upsert. An upsert re-applies the defaults on every deploy, so an
 * editor who set the count to 8, hid the section or wrote their own heading
 * would find it reset by the next release — silently, because a deploy script
 * reports success either way. A row that exists is the editor's, and this
 * leaves it alone.
 */

export const PHOTO_GALLERY_SECTION_TYPE = 'PHOTO_GALLERY';

/**
 * What an unconfigured albums section is.
 *
 * The texts are real copy, not placeholders: a section seeded with "Section
 * title" would put that on the federation's homepage until somebody noticed.
 *
 * `count` is 3 because the homepage lays the cards out three across beside the
 * lead album — four would leave the fourth alone on a second row. The gallery
 * page's own grid is four wide; this is a different grid. `mode: 'latest'`
 * because a homepage that needs an editor to pick albums before it shows any
 * is a homepage that shows none.
 */
export const PHOTO_GALLERY_SECTION_DEFAULTS = {
  sectionTitle: { en: 'Photo albums', ar: 'ألبومات الصور' },
  sectionSubtitle: {
    en: "Moments from the federation's championships, events and official activities",
    ar: 'لقطات من بطولات الاتحاد وفعالياته وأنشطته الرسمية',
  },
  configuration: {
    eyebrow: { en: 'Media Centre', ar: 'المركز الإعلامي' },
    enabled: true,
    mode: 'latest' as const,
    count: 3,
    albumIds: [] as string[],
  },
} as const;

export interface PhotoGallerySectionModels {
  pages: Model<Page>;
  pageSections: Model<PageSection>;
}

/** `created` on the first run, `exists` on every run after it, and
 *  `noHomepage` when there is no page to attach the section to. */
export type PhotoGallerySectionSeedResult = 'created' | 'exists' | 'noHomepage';

const HOMEPAGE_SLUG = 'home';

export const seedPhotoGallerySection = async (
  models: PhotoGallerySectionModels,
): Promise<PhotoGallerySectionSeedResult> => {
  const homepage = await models.pages.findOne({ slug: HOMEPAGE_SLUG, archivedAt: null }).exec();
  // An empty cluster has no pages at all. The administrator still has to be
  // created, so this reports and returns rather than throwing.
  if (!homepage) {
    return 'noHomepage';
  }

  const existing = await models.pageSections
    .findOne({ pageId: homepage._id, sectionType: PHOTO_GALLERY_SECTION_TYPE })
    .exec();
  if (existing) {
    return 'exists';
  }

  // After everything already composed, rather than at a fixed index: a
  // hardcoded `displayOrder` would collide with whatever section already holds
  // it. Where it finally sits is the editor's to decide.
  const last = await models.pageSections
    .findOne({ pageId: homepage._id })
    .sort({ displayOrder: -1 })
    .select('displayOrder')
    .lean()
    .exec();

  await models.pageSections.create({
    pageId: homepage._id,
    sectionType: PHOTO_GALLERY_SECTION_TYPE,
    displayOrder: (last?.displayOrder ?? -1) + 1,
    enabled: true,
    visibility: 'Everyone',
    selectionMode: 'AUTOMATIC',
    sectionTitle: PHOTO_GALLERY_SECTION_DEFAULTS.sectionTitle,
    sectionSubtitle: PHOTO_GALLERY_SECTION_DEFAULTS.sectionSubtitle,
    configuration: PHOTO_GALLERY_SECTION_DEFAULTS.configuration,
  });

  return 'created';
};

import { Types } from 'mongoose';
import type { Model } from 'mongoose';

/**
 * Development data for the photo gallery.
 *
 * What it is for: the gallery page hides any filter whose facet list is empty,
 * so on an empty database it shows period and search alone and nothing can be
 * seen working. This fills the local database with enough to exercise every
 * part of it — albums across two seasons, athletes and clubs attached to some
 * of them, one featured album, two drafts that must not appear publicly.
 *
 * It is local-only, enforced by `assertSafeDevTarget` at the entry point. It
 * writes athletes and clubs too, because the local database has none and the
 * two filters that actually resolve today would otherwise stay hidden.
 *
 * Everything it creates is recognisable and removable: album and club slugs
 * begin with `dev-seed-`, and the athletes are exactly the names in
 * `DEV_ATHLETES`. `npm run seed:albums:dev:clean` removes precisely those.
 */

export const DEV_SEED_PREFIX = 'dev-seed-';

/** The eight athletes the seed creates, by name. The clean script matches on
 *  this exact list — athletes carry no slug, so the names are the handle. */
export const DEV_ATHLETES = [
  { en: 'Maryam Al Farsi', ar: 'مريم الفارسي', gender: 'Female' },
  { en: 'Khalid Al Mansoori', ar: 'خالد المنصوري', gender: 'Male' },
  { en: 'Noura Al Hashimi', ar: 'نورة الهاشمي', gender: 'Female' },
  { en: 'Omar Al Balushi', ar: 'عمر البلوشي', gender: 'Male' },
  { en: 'Salama Al Dhaheri', ar: 'سلامة الظاهري', gender: 'Female' },
  { en: 'Rashid Al Nuaimi', ar: 'راشد النعيمي', gender: 'Male' },
  { en: 'Alia Al Suwaidi', ar: 'علياء السويدي', gender: 'Female' },
  { en: 'Saeed Al Kaabi', ar: 'سعيد الكعبي', gender: 'Male' },
] as const;

/** Five clubs, each in a different emirate. */
export const DEV_CLUBS = [
  { slug: `${DEV_SEED_PREFIX}al-ain`, en: 'Al Ain Athletics Club', ar: 'نادي العين لألعاب القوى' },
  { slug: `${DEV_SEED_PREFIX}al-wasl`, en: 'Al Wasl Athletics Club', ar: 'نادي الوصل لألعاب القوى' },
  { slug: `${DEV_SEED_PREFIX}sharjah`, en: 'Sharjah Athletics Club', ar: 'نادي الشارقة لألعاب القوى' },
  { slug: `${DEV_SEED_PREFIX}al-jazira`, en: 'Al Jazira Athletics Club', ar: 'نادي الجزيرة لألعاب القوى' },
  { slug: `${DEV_SEED_PREFIX}fujairah`, en: 'Fujairah Athletics Club', ar: 'نادي الفجيرة لألعاب القوى' },
] as const;

/**
 * Twelve albums.
 *
 * Ten published and two drafts, so "published only" is visible rather than
 * assumed. Dates spread across two athletics seasons (September→August), so
 * every option of the period filter returns something different. One is
 * featured.
 *
 * None carries a championship, competition or public event: those three
 * collections do not exist, and an id pointing at nothing is not test data, it
 * is a broken reference. Those three filters stay hidden. The season filter
 * does appear, because a season is derived from `eventDate` and the dates
 * below span two of them.
 */
export const DEV_ALBUMS = [
  { slug: 'uae-championship-2026', en: 'UAE Athletics Championship 2026', ar: 'بطولة الإمارات لألعاب القوى 2026', place: { en: 'Dubai', ar: 'دبي' }, date: '2026-03-14', featured: true, photos: 20 },
  { slug: 'gulf-championship-2026', en: 'Gulf Athletics Championship 2026', ar: 'بطولة الخليج لألعاب القوى 2026', place: { en: 'Sharjah', ar: 'الشارقة' }, date: '2026-02-01', photos: 16 },
  { slug: 'asian-championship-2026', en: 'Asian Athletics Championship', ar: 'بطولة آسيا لألعاب القوى', place: { en: 'Dubai', ar: 'دبي' }, date: '2026-08-28', photos: 14 },
  { slug: 'season-champions-honouring', en: "Honouring the Season's Champions", ar: 'حفل تكريم أبطال الموسم', place: { en: 'Abu Dhabi', ar: 'أبوظبي' }, date: '2025-06-20', photos: 12 },
  { slug: 'national-team-camp-2025', en: 'National Team Camp 2025', ar: 'معسكر المنتخب الوطني 2025', place: { en: 'Al Ain', ar: 'العين' }, date: '2025-11-05', photos: 18 },
  { slug: 'national-sport-day-2025', en: 'National Sport Day 2025', ar: 'يوم الرياضة الوطني 2025', place: { en: 'Dubai', ar: 'دبي' }, date: '2025-12-02', photos: 11 },
  { slug: 'arab-games-2024', en: 'Arab Games 2024', ar: 'دورة الألعاب العربية 2024', place: { en: 'Abu Dhabi', ar: 'أبوظبي' }, date: '2024-11-20', photos: 15 },
  { slug: 'uae-championship-2025', en: 'UAE Athletics Championship 2025', ar: 'بطولة الإمارات لألعاب القوى 2025', place: { en: 'Dubai', ar: 'دبي' }, date: '2025-03-10', photos: 17 },
  { slug: 'federation-press-conference', en: 'Federation Press Conference', ar: 'المؤتمر الصحفي للاتحاد', place: { en: 'Dubai', ar: 'دبي' }, date: '2026-01-15', photos: 8 },
  { slug: 'youth-championship-2026', en: 'Youth Championship 2026', ar: 'بطولة الشباب 2026', place: { en: 'Ajman', ar: 'عجمان' }, date: '2026-04-08', photos: 13 },
  { slug: 'cross-country-2025', en: 'Cross Country Championship 2025', ar: 'بطولة اختراق الضاحية 2025', place: { en: 'Fujairah', ar: 'الفجيرة' }, date: '2025-10-18', draft: true, photos: 9 },
  { slug: 'training-camp-2026', en: 'Preparation Camp 2026', ar: 'معسكر الإعداد 2026', place: { en: 'Al Ain', ar: 'العين' }, date: '2026-05-22', draft: true, photos: 10 },
] as const;

/** One stored image the seed can attach to an album. */
export interface SeedPhotoSource {
  url: string;
  storageKey: string;
  width: number;
  height: number;
  mimeType: string;
  size: number;
  /** The photographer, when the source names one. `null` for a reused local
   *  asset, which is not a photograph anyone took. */
  photographer: string | null;
}

export interface SeedAlbumsDevModels {
  albums: Model<Record<string, unknown>>;
  mediaAssets: Model<Record<string, unknown>>;
  athletes: Model<Record<string, unknown>>;
  clubs: Model<Record<string, unknown>>;
}

export interface SeedAlbumsDevResult {
  athletes: number;
  clubs: number;
  albums: number;
  photos: number;
  skipped: number;
}

/**
 * Creates the development gallery. Idempotent: an album whose slug already
 * exists is skipped whole, so a second run adds nothing and changes nothing.
 */
export const seedAlbumsDev = async (
  models: SeedAlbumsDevModels,
  photoSources: SeedPhotoSource[],
): Promise<SeedAlbumsDevResult> => {
  if (photoSources.length === 0) {
    throw new Error('No photo sources: the seed has nothing to fill the albums with.');
  }

  const result: SeedAlbumsDevResult = { athletes: 0, clubs: 0, albums: 0, photos: 0, skipped: 0 };

  // Athletes and clubs first: the albums reference them.
  const athleteIds: Types.ObjectId[] = [];
  for (const athlete of DEV_ATHLETES) {
    const existing = await models.athletes.findOne({ 'name.en': athlete.en }).exec();
    if (existing) {
      athleteIds.push(existing._id as Types.ObjectId);
      continue;
    }
    const created = await models.athletes.create({
      name: { en: athlete.en, ar: athlete.ar },
      // A date inside a plausible competing age, and a nationality id that
      // points at no country row — `countries` is empty locally, and Mongoose
      // does not enforce a `ref`. Deliberate: inventing a country row to
      // satisfy a required field would put data nobody asked for in the
      // database.
      dateOfBirth: new Date('1999-05-12'),
      nationalityId: new Types.ObjectId(),
      disciplineIds: [],
      gender: athlete.gender,
      residencyType: 'Local',
      federationName: null,
    });
    athleteIds.push(created._id as Types.ObjectId);
    result.athletes += 1;
  }

  const clubIds: Types.ObjectId[] = [];
  for (const club of DEV_CLUBS) {
    const existing = await models.clubs.findOne({ slug: club.slug }).exec();
    if (existing) {
      clubIds.push(existing._id as Types.ObjectId);
      continue;
    }
    const created = await models.clubs.create({
      name: { en: club.en, ar: club.ar },
      slug: club.slug,
      logoId: null,
      foundingDate: new Date('1990-01-01'),
      emirateId: new Types.ObjectId(),
      registrationNumber: `DEV-${club.slug}`,
      clubType: 'SportsClub',
      status: 'Active',
      socialLinks: [],
    });
    clubIds.push(created._id as Types.ObjectId);
    result.clubs += 1;
  }

  for (const [index, album] of DEV_ALBUMS.entries()) {
    const slug = `${DEV_SEED_PREFIX}${album.slug}`;
    if (await models.albums.findOne({ slug }).exec()) {
      result.skipped += 1;
      continue;
    }

    // Spread across the two lists so some albums carry athletes, some carry
    // clubs, some carry both and some carry neither — which is what makes the
    // two filters show a range of counts rather than one number.
    const albumAthletes = index % 3 === 2 ? [] : athleteIds.slice(index % 4, (index % 4) + 2);
    const albumClubs = index % 4 === 3 ? [] : clubIds.slice(index % 3, (index % 3) + 2);

    const created = await models.albums.create({
      title: { en: album.en, ar: album.ar },
      slug,
      description: {
        en: `Photographs from ${album.en}.`,
        ar: `لقطات من ${album.ar}.`,
      },
      championshipId: null,
      competitionId: null,
      publicEventId: null,
      athleteIds: albumAthletes,
      clubIds: albumClubs,
      eventDate: new Date(album.date),
      location: album.place,
      isFeatured: 'featured' in album && album.featured === true,
      championshipName: null,
      coverImageId: null,
      displayOrder: index,
      publicationState: 'draft' in album && album.draft === true ? 'Draft' : 'Published',
      publishedAt: 'draft' in album && album.draft === true ? null : new Date(album.date),
      publishedBy: null,
      tags: [],
      assetCount: 0,
    });

    const photoIds: Types.ObjectId[] = [];
    for (let position = 0; position < album.photos; position += 1) {
      // The sources repeat across albums on purpose: thirty stored objects
      // rather than a hundred and sixty uploads, which is the difference
      // between a seed that runs in a minute and one that runs in twenty.
      const source = photoSources[(index * 7 + position) % photoSources.length];
      const photo = await models.mediaAssets.create({
        albumId: created._id,
        file: {
          url: source.url,
          mimeType: source.mimeType,
          width: source.width,
          height: source.height,
          size: source.size,
          originalName: `${album.slug}-${position + 1}.jpg`,
          storageKey: source.storageKey,
          checksum: null,
          photographer: source.photographer,
          captureDate: new Date(album.date),
        },
        caption: {
          en: `${album.en} — photo ${position + 1}`,
          ar: `${album.ar} — صورة ${position + 1}`,
        },
        altText: {
          en: `${album.en} — photo ${position + 1}`,
          ar: `${album.ar} — صورة ${position + 1}`,
        },
        displayOrder: position,
        isVisible: true,
        isFeatured: false,
      });
      photoIds.push(photo._id as Types.ObjectId);
      result.photos += 1;
    }

    await models.albums.updateOne(
      { _id: created._id },
      { $set: { coverImageId: photoIds[0] ?? null, assetCount: photoIds.length } },
    );
    result.albums += 1;
  }

  return result;
};

export interface CleanAlbumsDevResult {
  albums: number;
  photos: number;
  athletes: number;
  clubs: number;
  /** Distinct stored objects the caller should destroy at the provider. */
  storageKeys: string[];
}

/**
 * Removes everything `seedAlbumsDev` created, and nothing else.
 *
 * Matches on the `dev-seed-` slug prefix and on the exact athlete names, so an
 * album an editor made by hand is never caught by it. Returns the distinct
 * storage keys rather than destroying them, because whether the objects are
 * the seed's to destroy depends on where they came from — reused local assets
 * belong to the media library and must survive.
 */
export const cleanAlbumsDev = async (models: SeedAlbumsDevModels): Promise<CleanAlbumsDevResult> => {
  const albums = await models.albums.find({ slug: { $regex: `^${DEV_SEED_PREFIX}` } }).exec();
  const albumIds = albums.map((album) => album._id);

  const photos = await models.mediaAssets.find({ albumId: { $in: albumIds } }).exec();
  const storageKeys = [
    ...new Set(photos.map((photo) => (photo.file as { storageKey: string }).storageKey)),
  ];

  const removedPhotos = await models.mediaAssets.deleteMany({ albumId: { $in: albumIds } }).exec();
  const removedAlbums = await models.albums.deleteMany({ _id: { $in: albumIds } }).exec();
  const removedClubs = await models.clubs
    .deleteMany({ slug: { $regex: `^${DEV_SEED_PREFIX}` } })
    .exec();
  const removedAthletes = await models.athletes
    .deleteMany({ 'name.en': { $in: DEV_ATHLETES.map((athlete) => athlete.en) } })
    .exec();

  return {
    albums: removedAlbums.deletedCount ?? 0,
    photos: removedPhotos.deletedCount ?? 0,
    athletes: removedAthletes.deletedCount ?? 0,
    clubs: removedClubs.deletedCount ?? 0,
    storageKeys,
  };
};

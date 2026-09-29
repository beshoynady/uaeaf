import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import type { ClubType, ClubStatus } from '../modules/people-organizations/clubs/schemas/club.schema.js';
import type { CoachGender } from '../modules/people-organizations/coaches/schemas/coach.schema.js';
import type { LicenseLevel } from '../common/constants/license-levels.js';
import type { AthleteGender } from '../modules/people-organizations/athletes/schemas/athlete.schema.js';
import type { AthleteProfileStatus } from '../modules/people-organizations/athlete-profiles/schemas/athlete-profile.schema.js';

/**
 * Development directory data: clubs, coaches, athletes and their public
 * profiles.
 *
 * The local database ships with none of these, so the directories, search
 * and filters have nothing to render against. Every name carries a marker —
 * `(تجريبي)` in Arabic, `(demo)` in English — so a seeded row is never
 * mistaken for a real federation record on screen.
 *
 * Idempotent by fixed id: a record already present at its own id is left
 * untouched, including any edit made to it since. Cleanup matches on the
 * `demo-` slug prefix (clubs, coaches, profiles) or on the exact seeded name
 * pair (athletes, which carry no slug) — the same shape `cleanAlbumsDev`
 * already uses in `seed-albums-dev.ts`, so a hand-made record is never
 * caught by either.
 *
 * `countries` and `disciplines` are empty on this database too. Rather than
 * invent rows nobody asked for, nationality/emirate/discipline references
 * point at ids that resolve to nothing — `Mongoose` does not enforce `ref`,
 * and `reuseLocalAssets`'s sibling comment in `seed-albums-dev.ts` documents
 * the same call for the same reason.
 */

export const DEMO_SLUG_PREFIX = 'demo-';

const markAr = (text: string): string => `${text} (تجريبي)`;
const markEn = (text: string): string => `${text} (demo)`;

/** A deterministic 24-hex-character id, so a second run recognises what the
 *  first one created without a lookup by name or slug. */
const fixedId = (n: number): Types.ObjectId =>
  new Types.ObjectId(`df${n.toString().padStart(4, '0')}`.padStart(24, '0'));

const registrationNumber = (kind: string, n: number): string => `DEMO-${kind}-${n.toString().padStart(4, '0')}`;

interface ClubSeed {
  id: number;
  en: string;
  ar: string;
  clubType: ClubType;
  status: ClubStatus;
  foundingDate: string;
}

/** Six clubs, one per emirate slot, spanning every `clubType` and one
 *  `Inactive` row so the status filter has more than one value to show. */
const CLUB_SEEDS: ClubSeed[] = [
  { id: 1, en: 'Al Noor Athletics Club', ar: 'نادي النور لألعاب القوى', clubType: 'SportsClub', status: 'Active', foundingDate: '1998-04-01' },
  { id: 2, en: 'Desert Falcons Club', ar: 'نادي صقور الصحراء', clubType: 'SportsClub', status: 'Active', foundingDate: '2003-09-15' },
  { id: 3, en: 'Al Shamal Athletics Academy', ar: 'أكاديمية الشمال لألعاب القوى', clubType: 'Academy', status: 'Active', foundingDate: '2011-01-10' },
  { id: 4, en: 'Coastal Runners School', ar: 'مدرسة العدّائين الساحليين', clubType: 'School', status: 'Active', foundingDate: '2015-06-20' },
  { id: 5, en: 'Al Waha University Club', ar: 'نادي جامعة الواحة', clubType: 'University', status: 'Active', foundingDate: '2009-02-01' },
  { id: 6, en: 'Rising Stars Club', ar: 'نادي النجوم الصاعدة', clubType: 'SportsClub', status: 'Inactive', foundingDate: '2001-11-05' },
];

interface CoachSeed {
  id: number;
  en: string;
  ar: string;
  licenseLevel: LicenseLevel;
  gender: CoachGender;
  clubIndex: number | null;
  startDate: string;
}

/** Four coaches across the license scale; one carries no `clubId`, which is
 *  allowed (`Coach.clubId` defaults to `null`) and exercises the
 *  unaffiliated case in the directory. */
const COACH_SEEDS: CoachSeed[] = [
  { id: 1, en: 'Khalid Al Marzouqi', ar: 'خالد المرزوقي', licenseLevel: 'Level3', gender: 'Male', clubIndex: 0, startDate: '2010-03-01' },
  { id: 2, en: 'Amina Al Zaabi', ar: 'أمينة الزعابي', licenseLevel: 'International', gender: 'Female', clubIndex: 1, startDate: '2006-08-15' },
  { id: 3, en: 'Yousef Al Shamsi', ar: 'يوسف الشامسي', licenseLevel: 'Level2', gender: 'Male', clubIndex: 2, startDate: '2018-01-20' },
  { id: 4, en: 'Fatima Al Qasimi', ar: 'فاطمة القاسمي', licenseLevel: 'Level4', gender: 'Female', clubIndex: null, startDate: '2013-05-10' },
];

interface AthleteSeed {
  id: number;
  en: string;
  ar: string;
  gender: AthleteGender;
  dateOfBirth: string;
  clubIndex: number | null;
  profileStatus: AthleteProfileStatus;
}

/** Ten athletes, all `residencyType: 'Local'` — the only residency a profile
 *  may be created for (`AthleteProfilesService.create()`'s invariant,
 *  documented on `athlete-profile.schema.ts`). Spread across all six clubs,
 *  one left unaffiliated, and one profile in each of `Inactive`/`Retired`
 *  so the status filter shows the full range. */
const ATHLETE_SEEDS: AthleteSeed[] = [
  { id: 1, en: 'Mohammed Al Falasi', ar: 'محمد الفلاسي', gender: 'Male', dateOfBirth: '2001-02-14', clubIndex: 0, profileStatus: 'Active' },
  { id: 2, en: 'Shamma Al Mazrouei', ar: 'شمة المزروعي', gender: 'Female', dateOfBirth: '2003-07-22', clubIndex: 0, profileStatus: 'Active' },
  { id: 3, en: 'Rashid Al Ketbi', ar: 'راشد الكتبي', gender: 'Male', dateOfBirth: '1999-11-30', clubIndex: 1, profileStatus: 'Active' },
  { id: 4, en: 'Maitha Al Suwaidi', ar: 'ميثاء السويدي', gender: 'Female', dateOfBirth: '2005-04-09', clubIndex: 1, profileStatus: 'Active' },
  { id: 5, en: 'Hamdan Al Nuaimi', ar: 'حمدان النعيمي', gender: 'Male', dateOfBirth: '2000-09-18', clubIndex: 2, profileStatus: 'Active' },
  { id: 6, en: 'Latifa Al Blooshi', ar: 'لطيفة البلوشي', gender: 'Female', dateOfBirth: '2002-12-05', clubIndex: 3, profileStatus: 'Active' },
  { id: 7, en: 'Sultan Al Qasimi', ar: 'سلطان القاسمي', gender: 'Male', dateOfBirth: '1997-06-25', clubIndex: 4, profileStatus: 'Active' },
  { id: 8, en: 'Reem Al Dhaheri', ar: 'ريم الظاهري', gender: 'Female', dateOfBirth: '2004-03-17', clubIndex: 4, profileStatus: 'Inactive' },
  { id: 9, en: 'Obaid Al Hosani', ar: 'عبيد الحوصني', gender: 'Male', dateOfBirth: '1996-10-08', clubIndex: 5, profileStatus: 'Retired' },
  { id: 10, en: 'Aisha Al Marri', ar: 'عائشة المرّي', gender: 'Female', dateOfBirth: '2006-01-27', clubIndex: null, profileStatus: 'Active' },
];

const slugify = (text: string): string =>
  `${DEMO_SLUG_PREFIX}${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`;

export interface DirectoryDemoModels {
  clubs: Model<Record<string, unknown>>;
  coaches: Model<Record<string, unknown>>;
  athletes: Model<Record<string, unknown>>;
  athleteProfiles: Model<Record<string, unknown>>;
}

export interface DirectoryDemoReport {
  clubs: { created: number; existing: number };
  coaches: { created: number; existing: number };
  athletes: { created: number; existing: number };
  athleteProfiles: { created: number; existing: number };
}

/** Creates the six clubs, four coaches, ten athletes and their ten profiles.
 *  Skips whichever of those already exist at their own fixed id. */
export const seedDirectoryDemo = async (models: DirectoryDemoModels): Promise<DirectoryDemoReport> => {
  const report: DirectoryDemoReport = {
    clubs: { created: 0, existing: 0 },
    coaches: { created: 0, existing: 0 },
    athletes: { created: 0, existing: 0 },
    athleteProfiles: { created: 0, existing: 0 },
  };

  const clubIds: Types.ObjectId[] = [];
  for (const club of CLUB_SEEDS) {
    const _id = fixedId(1000 + club.id);
    clubIds.push(_id);
    if (await models.clubs.findOne({ _id }).lean()) {
      report.clubs.existing += 1;
      continue;
    }
    await models.clubs.create({
      _id,
      name: { en: markEn(club.en), ar: markAr(club.ar) },
      slug: slugify(club.en),
      logoId: null,
      foundingDate: new Date(club.foundingDate),
      // No `countries` row exists locally to point at — see file header.
      emirateId: new Types.ObjectId(),
      registrationNumber: registrationNumber('CLUB', club.id),
      clubType: club.clubType,
      coverImage: null,
      description: null,
      email: null,
      phone: null,
      address: null,
      website: null,
      socialLinks: [],
      venueId: null,
      status: club.status,
      introVideoId: null,
      latitude: null,
      longitude: null,
    });
    report.clubs.created += 1;
  }

  for (const coach of COACH_SEEDS) {
    const _id = fixedId(2000 + coach.id);
    if (await models.coaches.findOne({ _id }).lean()) {
      report.coaches.existing += 1;
      continue;
    }
    await models.coaches.create({
      _id,
      fullName: { en: markEn(coach.en), ar: markAr(coach.ar) },
      slug: slugify(coach.en),
      photoId: null,
      licenseLevel: coach.licenseLevel,
      registrationNumber: registrationNumber('COACH', coach.id),
      clubId: coach.clubIndex === null ? null : clubIds[coach.clubIndex],
      disciplineIds: [],
      nationalityId: new Types.ObjectId(),
      bio: null,
      gender: coach.gender,
      status: 'Active',
      startDate: new Date(coach.startDate),
    });
    report.coaches.created += 1;
  }

  for (const athlete of ATHLETE_SEEDS) {
    const athleteObjectId = fixedId(3000 + athlete.id);
    const profileId = fixedId(4000 + athlete.id);

    const existingAthlete = await models.athletes.findOne({ _id: athleteObjectId }).lean();
    if (existingAthlete) {
      report.athletes.existing += 1;
    } else {
      await models.athletes.create({
        _id: athleteObjectId,
        name: { en: markEn(athlete.en), ar: markAr(athlete.ar) },
        dateOfBirth: new Date(athlete.dateOfBirth),
        nationalityId: new Types.ObjectId(),
        disciplineIds: [],
        gender: athlete.gender,
        residencyType: 'Local',
        federationName: null,
      });
      report.athletes.created += 1;
    }

    if (await models.athleteProfiles.findOne({ _id: profileId }).lean()) {
      report.athleteProfiles.existing += 1;
      continue;
    }
    await models.athleteProfiles.create({
      _id: profileId,
      athleteId: athleteObjectId,
      slug: slugify(athlete.en),
      clubId: athlete.clubIndex === null ? null : clubIds[athlete.clubIndex],
      registrationNumber: registrationNumber('ATH', athlete.id),
      // Left null rather than invented: `emiratesIdOrPassport`/`phone`/etc.
      // are real personal data on a real profile, and a fabricated value
      // reads as real data to anyone who later looks at the row.
      restricted: { emiratesIdOrPassport: null, address: null, phone: null, email: null },
      status: athlete.profileStatus,
      photoId: null,
      bio: null,
      socialLinks: [],
    });
    report.athleteProfiles.created += 1;
  }

  return report;
};

export interface DirectoryDemoCleanResult {
  clubs: number;
  coaches: number;
  athletes: number;
  athleteProfiles: number;
}

/** Removes exactly what `seedDirectoryDemo` created. Clubs/coaches/profiles
 *  match on the `demo-` slug prefix; athletes carry no slug, so they match
 *  on the exact seeded `{en, ar}` name pair instead — both scopes a real,
 *  hand-made record could not accidentally satisfy. */
export const cleanDirectoryDemo = async (models: DirectoryDemoModels): Promise<DirectoryDemoCleanResult> => {
  const slugFilter = { slug: { $regex: `^${DEMO_SLUG_PREFIX}` } };
  const athleteNameFilter = {
    $or: ATHLETE_SEEDS.map((athlete) => ({ 'name.en': markEn(athlete.en), 'name.ar': markAr(athlete.ar) })),
  };

  const removedProfiles = await models.athleteProfiles.deleteMany(slugFilter).exec();
  const removedAthletes = await models.athletes.deleteMany(athleteNameFilter).exec();
  const removedCoaches = await models.coaches.deleteMany(slugFilter).exec();
  const removedClubs = await models.clubs.deleteMany(slugFilter).exec();

  return {
    clubs: removedClubs.deletedCount ?? 0,
    coaches: removedCoaches.deletedCount ?? 0,
    athletes: removedAthletes.deletedCount ?? 0,
    athleteProfiles: removedProfiles.deletedCount ?? 0,
  };
};

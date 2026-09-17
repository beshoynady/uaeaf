import { Types, type Model } from 'mongoose';
import { fileURLToPath } from 'node:url';
import { assertSafeDevTarget } from './dev-database.js';

/**
 * The sponsor-relations seed (ADR-0085 D2): the federation's one real sponsor,
 * and fictional partners, memberships and sponsors to build and review the
 * homepage with.
 *
 * Every fictional record is `isDemo: true` and says so in its own name ("Demo",
 * «تجريبي»), so it is recognisable on a screen and hidden from every public read
 * in production (D2.1). Logos are uploaded through the dashboard's own upload
 * path, passed in as `upload`; the entry point wires it to `MediaAssetsService`.
 *
 * Idempotent: every record has a fixed id, and a record already present is left
 * alone, logo included. Nothing an editor changed since is overwritten.
 */

/** The official display name (owner, 2026-09-17): singular, as the logo and
 *  Figma write it. English only — no Arabic name is invented. */
export const REAL_SPONSOR_NAME = 'Ultimate Power Solution';

/**
 * PROVISIONAL — replace with the contract's dates before launch.
 * 2026-09-01 00:00 to 2027-08-31 23:59:59 in Asia/Dubai, stored as UTC.
 */
export const UPS_PROVISIONAL_WINDOW = {
  provisional: true,
  startDate: new Date('2026-09-01T00:00:00+04:00'),
  endDate: new Date('2027-08-31T23:59:59+04:00'),
} as const;

type Name = { ar: string | null; en: string | null };

/** A logo is either one of the demo PNGs beside the fixtures, or an approved
 *  project asset under `apps/web/public` (the real sponsor's, from Figma). */
type LogoRef = { demo: string } | { projectAsset: string };

interface SponsorFixture {
  _id: Types.ObjectId;
  name: Name;
  website: string | null;
  isDemo: boolean;
  logo: LogoRef;
}

interface SponsorshipFixture {
  _id: Types.ObjectId;
  sponsorId: Types.ObjectId;
  targetType: 'Federation' | 'Championship' | 'Event';
  tier: 'Strategic' | 'Official' | 'Supporting';
  startDate: Date;
  endDate: Date | null;
  scopeLabel: { ar: string; en: string } | null;
  isFeatured: boolean;
  displayOrder: number;
  isVisible: boolean;
  isDemo: boolean;
}

interface PartnershipFixture {
  _id: Types.ObjectId;
  partnerName: Name;
  partnershipType: 'BilateralAgreement' | 'MOU' | 'TechnicalCooperation' | 'Other';
  startDate: Date;
  displayOrder: number;
  isVisible: boolean;
  isDemo: boolean;
  logo: LogoRef;
}

interface MembershipFixture {
  _id: Types.ObjectId;
  organizationName: Name;
  membershipType: 'RegionalBody' | 'ContinentalBody' | 'InternationalBody' | 'OlympicCommittee';
  startDate: Date;
  displayOrder: number;
  isVisible: boolean;
  isDemo: boolean;
  logo: LogoRef;
}

export interface SponsorRelationFixtures {
  sponsors: SponsorFixture[];
  sponsorships: SponsorshipFixture[];
  partnerships: PartnershipFixture[];
  memberships: MembershipFixture[];
}

const id = (hex: string) => new Types.ObjectId(hex);

const UPS_SPONSOR_ID = id('6aa0850000000000000000a1');
const UPS_SPONSORSHIP_ID = id('6aa0850000000000000000b1');

export const SPONSOR_RELATION_FIXTURES: SponsorRelationFixtures = {
  sponsors: [
    {
      _id: UPS_SPONSOR_ID,
      name: { ar: null, en: REAL_SPONSOR_NAME },
      website: 'https://upsgenerator.com/',
      isDemo: false,
      logo: { projectAsset: 'design-assets/sponsors/sponsor-logo-ultimate-power-solution-2374-1993.jpeg' },
    },
    {
      _id: id('6aa0850000000000000000a2'),
      name: { ar: 'مجموعة دونلاين التجريبية', en: 'Duneline Demo Group' },
      website: null,
      isDemo: true,
      logo: { demo: 'sponsor-duneline.png' },
    },
    {
      _id: id('6aa0850000000000000000a3'),
      name: { ar: null, en: 'Palmstone Demo Bank' },
      website: null,
      isDemo: true,
      logo: { demo: 'sponsor-palmstone.png' },
    },
    {
      _id: id('6aa0850000000000000000a4'),
      name: { ar: 'شركة الواحة التجريبية للتجهيزات', en: null },
      website: null,
      isDemo: true,
      logo: { demo: 'sponsor-wahat.png' },
    },
    {
      _id: id('6aa0850000000000000000a5'),
      name: { ar: 'مؤسسة سراب التجريبية', en: 'Sarab Demo Foundation' },
      website: null,
      isDemo: true,
      logo: { demo: 'sponsor-sarab.png' },
    },
  ],
  sponsorships: [
    {
      _id: UPS_SPONSORSHIP_ID,
      sponsorId: UPS_SPONSOR_ID,
      targetType: 'Federation',
      tier: 'Official',
      startDate: UPS_PROVISIONAL_WINDOW.startDate,
      endDate: UPS_PROVISIONAL_WINDOW.endDate,
      // What exactly it sponsors is not recorded anywhere; nothing is invented.
      scopeLabel: null,
      isFeatured: false,
      displayOrder: 0,
      isVisible: true,
      isDemo: false,
    },
    {
      // Hidden: lets an editor show it to watch the banner move to the higher
      // tier (ADR-0085 D5.1) without the demo taking the banner by default.
      _id: id('6aa0850000000000000000b2'),
      sponsorId: id('6aa0850000000000000000a2'),
      targetType: 'Federation',
      tier: 'Strategic',
      startDate: new Date('2026-01-01T00:00:00+04:00'),
      endDate: null,
      scopeLabel: { ar: 'الشريك الاستراتيجي التجريبي', en: 'Demo strategic sponsor' },
      isFeatured: false,
      displayOrder: 0,
      isVisible: false,
      isDemo: true,
    },
    {
      _id: id('6aa0850000000000000000b3'),
      sponsorId: id('6aa0850000000000000000a3'),
      targetType: 'Federation',
      tier: 'Official',
      startDate: new Date('2026-01-01T00:00:00+04:00'),
      endDate: new Date('2027-12-31T23:59:59+04:00'),
      scopeLabel: { ar: 'راعٍ رسمي تجريبي للاتحاد', en: 'Demo official sponsor of the federation' },
      isFeatured: false,
      displayOrder: 1,
      isVisible: true,
      isDemo: true,
    },
    {
      _id: id('6aa0850000000000000000b4'),
      sponsorId: id('6aa0850000000000000000a4'),
      targetType: 'Federation',
      tier: 'Supporting',
      startDate: new Date('2025-06-01T00:00:00+04:00'),
      endDate: null,
      scopeLabel: { ar: 'تجهيزات تجريبية للمنتخبات', en: 'Demo equipment for the national teams' },
      isFeatured: true,
      displayOrder: 2,
      isVisible: true,
      isDemo: true,
    },
    {
      _id: id('6aa0850000000000000000b5'),
      sponsorId: id('6aa0850000000000000000a5'),
      targetType: 'Championship',
      tier: 'Supporting',
      startDate: new Date('2026-09-01T00:00:00+04:00'),
      endDate: new Date('2026-12-31T23:59:59+04:00'),
      scopeLabel: { ar: 'الراعي الداعم لبطولة تجريبية', en: 'Supporting sponsor of a demo championship' },
      isFeatured: false,
      displayOrder: 3,
      isVisible: true,
      isDemo: true,
    },
  ],
  partnerships: [
    {
      _id: id('6aa0850000000000000000c1'),
      partnerName: { ar: 'أكاديمية ميريديان التجريبية', en: 'Meridian Demo Academy' },
      partnershipType: 'MOU',
      startDate: new Date('2024-03-01T00:00:00+04:00'),
      displayOrder: 0,
      isVisible: true,
      isDemo: true,
      logo: { demo: 'partner-meridian.png' },
    },
    {
      _id: id('6aa0850000000000000000c2'),
      partnerName: { ar: null, en: 'Coastline Demo Institute' },
      partnershipType: 'TechnicalCooperation',
      startDate: new Date('2025-01-15T00:00:00+04:00'),
      displayOrder: 1,
      isVisible: true,
      isDemo: true,
      logo: { demo: 'partner-coastline.png' },
    },
    {
      _id: id('6aa0850000000000000000c3'),
      partnerName: { ar: 'مركز الساحل التجريبي للرياضة', en: null },
      partnershipType: 'BilateralAgreement',
      startDate: new Date('2023-09-01T00:00:00+04:00'),
      displayOrder: 2,
      isVisible: true,
      isDemo: true,
      logo: { demo: 'partner-sahel.png' },
    },
  ],
  memberships: [
    {
      _id: id('6aa0850000000000000000d1'),
      organizationName: { ar: 'الاتحاد القاري التجريبي لألعاب القوى', en: 'Demo Continental Athletics Union' },
      membershipType: 'ContinentalBody',
      startDate: new Date('1990-01-01T00:00:00+04:00'),
      displayOrder: 0,
      isVisible: true,
      isDemo: true,
      logo: { demo: 'membership-continental.png' },
    },
    {
      _id: id('6aa0850000000000000000d2'),
      organizationName: { ar: 'الرابطة الإقليمية التجريبية', en: 'Demo Regional League' },
      membershipType: 'RegionalBody',
      startDate: new Date('1995-01-01T00:00:00+04:00'),
      displayOrder: 1,
      isVisible: true,
      isDemo: true,
      logo: { demo: 'membership-regional.png' },
    },
    {
      _id: id('6aa0850000000000000000d3'),
      organizationName: { ar: null, en: 'Demo World Track Council' },
      membershipType: 'InternationalBody',
      startDate: new Date('1986-01-01T00:00:00+04:00'),
      displayOrder: 2,
      isVisible: true,
      isDemo: true,
      logo: { demo: 'membership-world-track.png' },
    },
    {
      _id: id('6aa0850000000000000000d4'),
      organizationName: { ar: 'اللجنة التجريبية للرياضات المتعددة', en: 'Demo Multi-Sport Committee' },
      membershipType: 'OlympicCommittee',
      startDate: new Date('1979-01-01T00:00:00+04:00'),
      displayOrder: 3,
      isVisible: true,
      isDemo: true,
      logo: { demo: 'membership-multisport.png' },
    },
    {
      _id: id('6aa0850000000000000000d5'),
      organizationName: { ar: 'مجلس الخليج التجريبي للرياضة', en: null },
      membershipType: 'RegionalBody',
      startDate: new Date('2001-01-01T00:00:00+04:00'),
      displayOrder: 4,
      isVisible: true,
      isDemo: true,
      logo: { demo: 'membership-gulf.png' },
    },
  ],
};

const DEMO_LOGOS = fileURLToPath(new URL('../../seed/sponsor-relations/logos/', import.meta.url));
const WEB_PUBLIC = fileURLToPath(new URL('../../../apps/web/public/', import.meta.url));

export const logoFile = (logo: LogoRef): string => ('demo' in logo ? DEMO_LOGOS + logo.demo : WEB_PUBLIC + logo.projectAsset);

/**
 * Organisations named on the approved Figma frames or on the old site — real
 * brands a demo record must never carry, even with "Demo" beside them. Latin
 * names match on word boundaries ("du" must not catch "Duneline").
 */
const REAL_NAMES_LATIN = [
  'ADNOC', 'Emirates NBD', 'Etisalat', 'e&', 'Mubadala', 'Emirates', 'du', 'Nike', 'Adidas', 'Hublot', 'Etihad',
  'First Abu Dhabi Bank', 'FAB', 'General Authority of Sports', 'Alfardan', 'Al Fardan', 'Olympic', 'IOC', 'IAAF',
  'World Athletics', 'Asian Athletics', 'Arab Athletics',
];
const REAL_NAMES_ARABIC = [
  'أدنوك', 'بنك الإمارات دبي', 'اتصالات', 'مبادلة', 'طيران الإمارات', 'نايكي', 'أديداس', 'طيران الاتحاد',
  'بنك أبوظبي الأول', 'الهيئة العامة للرياضة', 'الفردان', 'الأولمبي', 'الأولمبية', 'الاتحاد الدولي لألعاب القوى',
  'الاتحاد الآسيوي لألعاب القوى', 'الاتحاد العربي لألعاب القوى',
];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const namesARealOrganisation = (name: Name): string | null => {
  const latin = REAL_NAMES_LATIN.find((real) => name.en && new RegExp(`(^|[^A-Za-z])${escapeRegExp(real)}([^A-Za-z]|$)`, 'i').test(name.en));
  const arabic = REAL_NAMES_ARABIC.find((real) => name.ar?.includes(real));
  return latin ?? arabic ?? null;
};

/**
 * @throws Error when a demo record carries a real organisation's name, or a
 * side of its name without the demo marker, or when anything but the one real
 * sponsor is not marked demo.
 */
export const assertFixturesAreSafe = (fixtures: SponsorRelationFixtures): void => {
  const demoNames = [
    ...fixtures.sponsors.filter((item) => item.isDemo).map((item) => item.name),
    ...fixtures.partnerships.map((item) => item.partnerName),
    ...fixtures.memberships.map((item) => item.organizationName),
  ];
  for (const name of demoNames) {
    const real = namesARealOrganisation(name);
    if (real) throw new Error(`A demo record is named after a real organisation ("${real}"): ${JSON.stringify(name)}.`);
    if ((name.en && !/\bDemo\b/.test(name.en)) || (name.ar && !name.ar.includes('تجريبي'))) {
      throw new Error(`A demo record's name is missing its demo marker on one side: ${JSON.stringify(name)}.`);
    }
  }

  const real = fixtures.sponsors.filter((item) => !item.isDemo);
  const undemo = [...fixtures.partnerships, ...fixtures.memberships].filter((item) => !item.isDemo);
  if (real.length !== 1 || real[0].name.en !== REAL_SPONSOR_NAME || undemo.length > 0) {
    throw new Error(`Only "${REAL_SPONSOR_NAME}" may be a real record in the seed.`);
  }
  const realIds = new Set(real.map((item) => item._id.toString()));
  if (fixtures.sponsorships.some((item) => !item.isDemo && !realIds.has(item.sponsorId.toString()))) {
    throw new Error('A sponsorship of a demo sponsor is not marked demo.');
  }
};

/** Uploads one logo file and returns the new `mediaAssets` id. */
export type LogoUploader = (file: string, altText: { ar: string; en: string }) => Promise<Types.ObjectId>;

export interface SponsorRelationModels {
  sponsors: Model<any>;
  sponsorships: Model<any>;
  partnerships: Model<any>;
  memberships: Model<any>;
  pages: Model<any>;
  pageSections: Model<any>;
}

export interface SponsorRelationSeedReport {
  inserted: number;
  kept: number;
  sections: 'added' | 'already present' | 'no homepage record';
}

/** "شعار X" / "X logo", with X as the organisation writes itself in each
 *  language, or its only name where it has one. The site draws the name
 *  beside the logo, so this text serves the media library, not the page. */
const logoAltText = (name: Name) => {
  const ar = name.ar ?? name.en!;
  const en = name.en ?? name.ar!;
  return { ar: `شعار ${ar}`, en: `${en} logo` };
};

/**
 * Writes whatever is missing. Refuses production and any database not on this
 * machine before it reads, writes or uploads anything.
 */
export const seedSponsorRelations = async (input: {
  models: SponsorRelationModels;
  upload: LogoUploader;
  env: { MONGODB_URI?: string; NODE_ENV?: string };
  fixtures?: SponsorRelationFixtures;
}): Promise<SponsorRelationSeedReport> => {
  assertSafeDevTarget(input.env.MONGODB_URI, input.env.NODE_ENV);
  const fixtures = input.fixtures ?? SPONSOR_RELATION_FIXTURES;
  assertFixturesAreSafe(fixtures);

  const { models, upload } = input;
  const report: SponsorRelationSeedReport = { inserted: 0, kept: 0, sections: 'no homepage record' };

  const write = async (model: Model<any>, record: { _id: Types.ObjectId }, build: () => Promise<Record<string, unknown>>) => {
    if (await model.exists({ _id: record._id })) {
      report.kept += 1;
      return;
    }
    await model.create({ _id: record._id, ...(await build()) });
    report.inserted += 1;
  };

  for (const { logo, ...sponsor } of fixtures.sponsors) {
    await write(models.sponsors, sponsor, async () => ({
      ...sponsor,
      logoId: await upload(logoFile(logo), logoAltText(sponsor.name)),
    }));
  }
  for (const sponsorship of fixtures.sponsorships) {
    await write(models.sponsorships, sponsorship, async () => ({ ...sponsorship, status: 'Active' }));
  }
  for (const { logo, ...partnership } of fixtures.partnerships) {
    await write(models.partnerships, partnership, async () => ({
      ...partnership,
      isActive: true,
      partnerLogoId: await upload(logoFile(logo), logoAltText(partnership.partnerName)),
    }));
  }
  for (const { logo, ...membership } of fixtures.memberships) {
    await write(models.memberships, membership, async () => ({
      ...membership,
      status: 'Active',
      organizationLogoId: await upload(logoFile(logo), logoAltText(membership.organizationName)),
    }));
  }

  report.sections = await addHomepageSections(models, fixtures);
  return report;
};

/** The homepage's three sections, in `02-Homepage-Specification.md` §5's order
 *  after whatever the page already holds. The real sponsor is the banner
 *  preference, so a demo Official sponsorship never takes its place. */
const addHomepageSections = async (
  models: SponsorRelationModels,
  fixtures: SponsorRelationFixtures,
): Promise<SponsorRelationSeedReport['sections']> => {
  const home = await models.pages.findOne({ slug: 'home', archivedAt: null }).lean<{ _id: Types.ObjectId }>();
  if (!home) return 'no homepage record';

  const existing = await models.pageSections.find({ pageId: home._id, archivedAt: null }).lean<{ sectionType: string; displayOrder: number }[]>();
  const present = new Set(existing.map((section) => section.sectionType));
  const wanted = ['SPONSORS', 'PARTNERS', 'MEMBERSHIPS'].filter((type) => !present.has(type));
  if (wanted.length === 0) return 'already present';

  const realSponsorship = fixtures.sponsorships.find((item) => !item.isDemo);
  let order = Math.max(0, ...existing.map((section) => section.displayOrder)) + 1;
  for (const sectionType of wanted) {
    await models.pageSections.create({
      pageId: home._id,
      sectionType,
      displayOrder: order++,
      enabled: true,
      visibility: 'Everyone',
      selectionMode: 'AUTOMATIC',
      configuration: sectionType === 'SPONSORS' && realSponsorship ? { bannerSponsorshipId: realSponsorship._id.toString() } : null,
    });
  }
  return 'added';
};

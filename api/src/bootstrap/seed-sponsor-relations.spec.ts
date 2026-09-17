import mongoose, { Types } from 'mongoose';
import { existsSync, readFileSync } from 'node:fs';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../test/utils/mongo-memory-server.js';
import { probeImage } from '../modules/media-center/media-assets/upload/image-probe.js';
import { Sponsor, SponsorSchema } from '../modules/sponsorship-relations/sponsors/schemas/sponsor.schema.js';
import { Sponsorship, SponsorshipSchema } from '../modules/sponsorship-relations/sponsorships/schemas/sponsorship.schema.js';
import { Partnership, PartnershipSchema } from '../modules/sponsorship-relations/partnerships/schemas/partnership.schema.js';
import { Membership, MembershipSchema } from '../modules/sponsorship-relations/memberships/schemas/membership.schema.js';
import { Page, PageSchema } from '../modules/cms-page-composition/pages/schemas/pages.schema.js';
import { PageSection, PageSectionSchema } from '../modules/cms-page-composition/page-sections/schemas/page-sections.schema.js';
import {
  REAL_SPONSOR_NAME,
  SPONSOR_RELATION_FIXTURES,
  UPS_PROVISIONAL_WINDOW,
  assertFixturesAreSafe,
  logoFile,
  seedSponsorRelations,
  type LogoUploader,
} from './seed-sponsor-relations.js';

/**
 * The sponsor-relations seed (ADR-0085 D2).
 *
 * One real organisation — the federation's official sponsor — and every other
 * record fictional, marked `isDemo`, with names nobody could mistake for a real
 * company. The seed writes to a local development database only, uploads each
 * logo through the dashboard's own upload path, and can run again without
 * duplicating a record or re-uploading a logo.
 */
describe('seedSponsorRelations', () => {
  let server: MongoMemoryServer;
  const LOCAL = 'mongodb://127.0.0.1:27017/uaeaf';

  const models = () => ({
    sponsors: mongoose.models[Sponsor.name] ?? mongoose.model(Sponsor.name, SponsorSchema),
    sponsorships: mongoose.models[Sponsorship.name] ?? mongoose.model(Sponsorship.name, SponsorshipSchema),
    partnerships: mongoose.models[Partnership.name] ?? mongoose.model(Partnership.name, PartnershipSchema),
    memberships: mongoose.models[Membership.name] ?? mongoose.model(Membership.name, MembershipSchema),
    pages: mongoose.models[Page.name] ?? mongoose.model(Page.name, PageSchema),
    pageSections: mongoose.models[PageSection.name] ?? mongoose.model(PageSection.name, PageSectionSchema),
  });

  const recordingUploader = () => {
    const calls: { file: string; altText: { ar: string; en: string } }[] = [];
    const upload: LogoUploader = async (file, altText) => {
      calls.push({ file, altText });
      return new Types.ObjectId();
    };
    return { calls, upload };
  };

  beforeAll(async () => {
    server = await connectTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  describe('the fixtures', () => {
    it('hold exactly one real organisation: the official sponsor, Official tier, with its link and provisional dates', () => {
      const real = SPONSOR_RELATION_FIXTURES.sponsors.filter((sponsor) => !sponsor.isDemo);
      expect(real).toHaveLength(1);
      expect(real[0].name).toEqual({ ar: null, en: REAL_SPONSOR_NAME });
      expect(REAL_SPONSOR_NAME).toBe('Ultimate Power Solution');
      expect(real[0].website).toBe('https://upsgenerator.com/');

      const realSponsorships = SPONSOR_RELATION_FIXTURES.sponsorships.filter((item) => item.sponsorId.equals(real[0]._id));
      expect(realSponsorships).toHaveLength(1);
      expect(realSponsorships[0].tier).toBe('Official');
      expect(realSponsorships[0].isDemo).toBe(false);
      expect(realSponsorships[0].startDate.toISOString()).toBe('2026-08-31T20:00:00.000Z');
      expect(realSponsorships[0].endDate?.toISOString()).toBe('2027-08-31T19:59:59.000Z');
      expect(UPS_PROVISIONAL_WINDOW.provisional).toBe(true);
    });

    it('mark every other record as demo, and write "Demo" or «تجريبي» on every side of its name', () => {
      const names = [
        ...SPONSOR_RELATION_FIXTURES.sponsors.filter((item) => item.isDemo).map((item) => item.name),
        ...SPONSOR_RELATION_FIXTURES.partnerships.map((item) => item.partnerName),
        ...SPONSOR_RELATION_FIXTURES.memberships.map((item) => item.organizationName),
      ];
      expect(names.length).toBeGreaterThanOrEqual(10);
      for (const name of names) {
        if (name.en) expect(name.en).toMatch(/\bDemo\b/);
        if (name.ar) expect(name.ar).toMatch(/تجريبي/);
      }
      expect(SPONSOR_RELATION_FIXTURES.partnerships.every((item) => item.isDemo)).toBe(true);
      expect(SPONSOR_RELATION_FIXTURES.memberships.every((item) => item.isDemo)).toBe(true);
    });

    it('include English-only and Arabic-only names, so the single-language rule is exercised', () => {
      const names = [
        ...SPONSOR_RELATION_FIXTURES.sponsors.map((item) => item.name),
        ...SPONSOR_RELATION_FIXTURES.partnerships.map((item) => item.partnerName),
        ...SPONSOR_RELATION_FIXTURES.memberships.map((item) => item.organizationName),
      ];
      expect(names.some((name) => name.en && !name.ar)).toBe(true);
      expect(names.some((name) => name.ar && !name.en)).toBe(true);
    });

    it('refuse a demo record named after a real organisation from Figma or the old site', () => {
      expect(() => assertFixturesAreSafe(SPONSOR_RELATION_FIXTURES)).not.toThrow();

      const leaked = structuredClone(SPONSOR_RELATION_FIXTURES);
      leaked.partnerships[0].partnerName = { ar: null, en: 'Etihad Airways Demo' };
      expect(() => assertFixturesAreSafe(leaked)).toThrow(/real organisation/);

      const unmarked = structuredClone(SPONSOR_RELATION_FIXTURES);
      unmarked.memberships[0].organizationName = { ar: 'اتحاد قاري', en: null };
      expect(() => assertFixturesAreSafe(unmarked)).toThrow(/demo marker/);
    });

    it('point every logo at a PNG of at least 200px a side, the upload path\'s floor', () => {
      const all = [
        ...SPONSOR_RELATION_FIXTURES.sponsors,
        ...SPONSOR_RELATION_FIXTURES.partnerships,
        ...SPONSOR_RELATION_FIXTURES.memberships,
      ];
      for (const record of all) {
        const file = logoFile(record.logo);
        expect(existsSync(file)).toBe(true);
        const probed = probeImage(readFileSync(file));
        expect(probed).not.toBeNull();
        expect(Math.min(probed!.width, probed!.height)).toBeGreaterThanOrEqual(200);
      }
    });
  });

  describe('running it', () => {
    it('refuses production before writing or uploading anything', async () => {
      const { calls, upload } = recordingUploader();

      await expect(
        seedSponsorRelations({ models: models(), upload, env: { MONGODB_URI: LOCAL, NODE_ENV: 'production' } }),
      ).rejects.toThrow(/production/);

      expect(calls).toHaveLength(0);
      expect(await models().sponsors.countDocuments()).toBe(0);
    });

    it('writes every fixture once, with its logo uploaded, its demo mark and its visibility', async () => {
      const { calls, upload } = recordingUploader();

      const report = await seedSponsorRelations({ models: models(), upload, env: { MONGODB_URI: LOCAL, NODE_ENV: 'development' } });

      const { sponsors, sponsorships, partnerships, memberships } = models();
      expect(await sponsors.countDocuments()).toBe(SPONSOR_RELATION_FIXTURES.sponsors.length);
      expect(await sponsorships.countDocuments()).toBe(SPONSOR_RELATION_FIXTURES.sponsorships.length);
      expect(await partnerships.countDocuments()).toBe(SPONSOR_RELATION_FIXTURES.partnerships.length);
      expect(await memberships.countDocuments()).toBe(SPONSOR_RELATION_FIXTURES.memberships.length);
      expect(calls).toHaveLength(
        SPONSOR_RELATION_FIXTURES.sponsors.length + SPONSOR_RELATION_FIXTURES.partnerships.length + SPONSOR_RELATION_FIXTURES.memberships.length,
      );
      expect(report.inserted).toBeGreaterThan(0);

      const real = await sponsors.findOne({ 'name.en': REAL_SPONSOR_NAME }).lean();
      expect(real?.isDemo).toBe(false);
      expect(real?.logoId).toBeInstanceOf(Types.ObjectId);
      expect(await sponsors.countDocuments({ isDemo: false })).toBe(1);
      expect(await partnerships.countDocuments({ isDemo: false })).toBe(0);
      expect(await memberships.countDocuments({ isDemo: false })).toBe(0);
    });

    it('gives each logo bilingual alt text that names the organisation as it writes itself', async () => {
      const { calls, upload } = recordingUploader();

      await seedSponsorRelations({ models: models(), upload, env: { MONGODB_URI: LOCAL, NODE_ENV: 'development' } });

      const ups = calls.find((call) => call.altText.en.includes(REAL_SPONSOR_NAME));
      expect(ups?.altText).toEqual({ ar: `شعار ${REAL_SPONSOR_NAME}`, en: `${REAL_SPONSOR_NAME} logo` });
    });

    it('adds nothing and uploads nothing on a second run', async () => {
      const first = recordingUploader();
      await seedSponsorRelations({ models: models(), upload: first.upload, env: { MONGODB_URI: LOCAL, NODE_ENV: 'development' } });

      const second = recordingUploader();
      const report = await seedSponsorRelations({ models: models(), upload: second.upload, env: { MONGODB_URI: LOCAL, NODE_ENV: 'development' } });

      expect(second.calls).toHaveLength(0);
      expect(report.inserted).toBe(0);
      expect(await models().sponsors.countDocuments()).toBe(SPONSOR_RELATION_FIXTURES.sponsors.length);
    });

    it('adds the three homepage sections after the hero, with the real sponsor preferred for the banner', async () => {
      const { upload } = recordingUploader();
      const { pages, pageSections } = models();
      const home = await pages.create({ slug: 'home', title: { ar: 'الرئيسية', en: 'Home' }, status: 'Published' });
      await pageSections.create({
        pageId: home._id,
        sectionType: 'HERO',
        displayOrder: 0,
        visibility: 'Everyone',
        selectionMode: 'MANUAL',
      });

      await seedSponsorRelations({ models: models(), upload, env: { MONGODB_URI: LOCAL, NODE_ENV: 'development' } });

      const sections = await pageSections.find({ pageId: home._id }).sort({ displayOrder: 1 }).lean();
      expect(sections.map((section) => section.sectionType)).toEqual(['HERO', 'SPONSORS', 'PARTNERS', 'MEMBERSHIPS']);
      const realSponsorship = SPONSOR_RELATION_FIXTURES.sponsorships.find((item) => !item.isDemo)!;
      expect(sections[1].configuration).toEqual({ bannerSponsorshipId: realSponsorship._id.toString() });
      expect(sections[1].ctaUrl ?? null).toBeNull();
    });

    it('leaves the sections alone when there is no homepage record yet', async () => {
      const { upload } = recordingUploader();

      const report = await seedSponsorRelations({ models: models(), upload, env: { MONGODB_URI: LOCAL, NODE_ENV: 'development' } });

      expect(await models().pageSections.countDocuments()).toBe(0);
      expect(report.sections).toBe('no homepage record');
    });
  });
});

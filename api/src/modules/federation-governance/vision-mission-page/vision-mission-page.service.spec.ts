import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { VisionMissionPagesService } from './vision-mission-page.service.js';
import type { WithheldPageDto } from '../../../common/dto/withheld-page.dto.js';
/**
 * The page as a served page.
 *
 * `getCurrentPublic` and `getPublicSnapshot` now answer the switch alone for a
 * page that has been taken off the site (ADR-0102 §D2), so their type is a
 * union. Every test below is about a *served* page, and narrowing once here is
 * clearer than narrowing at each assertion — and it fails loudly if the gate
 * ever withholds a page these tests expect to be served.
 */
const served = <T>(page: T | WithheldPageDto | null): T => {
  if (page === null || (page as { isActive?: unknown }).isActive === false) {
    throw new Error('expected a served page, got the activation switch alone');
  }
  return page as T;
};


/**
 * Every picture the page prints is content with a field on the record, the
 * section backgrounds as much as the hero (owner rule 2026-09-14, ADR-0070
 * D1): checked on the way in, stored as a ref, and printed from the published
 * version.
 */

const ids = {
  hero: new Types.ObjectId(),
  vision: new Types.ObjectId(),
  mission: new Types.ObjectId(),
  values: new Types.ObjectId(),
  cta: new Types.ObjectId(),
};

const image = (name: string) => ({
  url: `https://cdn/${name}.jpg`,
  altText: { ar: '', en: '' },
  width: 1536,
  height: 672,
});

const text = (value: string) => ({ ar: value, en: value });

/** A stand-in for one collaborator method, typed loosely: the service reads
 *  each through its own signature, which is what these specs exercise. */
const mock = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const make = () => {
  // Served, so `getCurrentPublic` answers the page rather than the switch
  // alone. The switch is read from the row, never the snapshot (ADR-0102 §D4),
  // so every spec about a published page has to say the row is switched on.
  const repository = {
    find: mock(),
    findByIdWithActivation: mock().mockResolvedValue({ isActive: true }),
    updateById: mock(),
  };
  const publications = { findLive: mock(), getPublicSnapshot: mock() };
  const revisions = {};
  const media = { resolvePublicImages: mock(), assertUsableImage: mock() };
  const service = new VisionMissionPagesService(
    repository as never,
    publications as never,
    revisions as never,
    media as never,
  );
  return { service, repository, publications, media };
};

describe('VisionMissionPagesService — section photographs', () => {
  it('prints every photograph the published version points at', async () => {
    const { service, repository, publications, media } = make();
    repository.find.mockResolvedValue([{ _id: new Types.ObjectId() }]);
    publications.findLive.mockResolvedValue({ publishedAt: new Date('2026-09-14T11:23:32.000Z') });
    publications.getPublicSnapshot.mockResolvedValue({
      heroTitle: text('h'),
      heroSubtitle: text('s'),
      heroImageId: ids.hero,
      visionImageId: ids.vision,
      missionImageId: ids.mission,
      valuesImageId: ids.values,
      ctaImageId: ids.cta,
      visionText: text('v'),
      missionText: text('m'),
      strategicGoals: [],
      coreValues: [],
      seo: null,
    });
    media.resolvePublicImages.mockResolvedValue(
      new Map([
        [String(ids.hero), image('hero')],
        [String(ids.vision), image('vision')],
        [String(ids.mission), image('mission')],
        [String(ids.values), image('values')],
        [String(ids.cta), image('cta')],
      ]),
    );

    const page = await service.getCurrentPublic();

    expect(page).toMatchObject({
      heroImage: image('hero'),
      visionImage: image('vision'),
      missionImage: image('mission'),
      valuesImage: image('values'),
      ctaImage: image('cta'),
    });
    expect(media.resolvePublicImages).toHaveBeenCalledTimes(1);
  });

  it('prints no photograph for a section whose ref is empty', async () => {
    const { service, repository, publications, media } = make();
    repository.find.mockResolvedValue([{ _id: new Types.ObjectId() }]);
    publications.findLive.mockResolvedValue({ publishedAt: new Date('2026-09-14T11:23:32.000Z') });
    publications.getPublicSnapshot.mockResolvedValue({
      heroTitle: text('h'),
      heroSubtitle: text('s'),
      visionText: text('v'),
      missionText: text('m'),
      strategicGoals: [],
      coreValues: [],
      seo: null,
    });
    media.resolvePublicImages.mockResolvedValue(new Map());

    const page = await service.getCurrentPublic();

    expect(page).toMatchObject({ visionImage: null, missionImage: null, valuesImage: null, ctaImage: null });
  });

  it('refuses a section photograph that is not a usable image, before anything is saved', async () => {
    const { service, repository, media } = make();
    media.assertUsableImage.mockImplementation(async (id: unknown) => {
      if (id === String(ids.cta)) throw new Error('not an image');
    });

    await expect(
      service.update(String(new Types.ObjectId()), { ctaImageId: String(ids.cta) } as never, new Types.ObjectId()),
    ).rejects.toThrow('not an image');
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('stores a section photograph as a ref, and clears one sent as null', async () => {
    const { service, repository } = make();
    repository.updateById.mockResolvedValue({});

    await service.update(
      String(new Types.ObjectId()),
      { visionImageId: String(ids.vision), missionImageId: null } as never,
      new Types.ObjectId(),
    );

    const set = (repository.updateById.mock.calls[0][1] as { $set: Record<string, unknown> }).$set;
    expect(set.visionImageId).toBeInstanceOf(Types.ObjectId);
    expect(String(set.visionImageId)).toBe(String(ids.vision));
    expect(set.missionImageId).toBeNull();
    expect(set).not.toHaveProperty('valuesImageId');
  });
});

/** A goal carries one of the twelve icon keys, as a core value does (owner
 *  decision 2026-09-15), and the public page prints it. */
describe('VisionMissionPagesService — strategic goals', () => {
  it('prints each goal with its icon, in the order the goals declare', async () => {
    const { service, repository, publications, media } = make();
    repository.find.mockResolvedValue([{ _id: new Types.ObjectId() }]);
    publications.findLive.mockResolvedValue({ publishedAt: new Date('2026-09-14T11:23:32.000Z') });
    publications.getPublicSnapshot.mockResolvedValue({
      heroTitle: text('h'),
      heroSubtitle: text('s'),
      visionText: text('v'),
      missionText: text('m'),
      strategicGoals: [
        { title: text('second'), description: text('b'), iconKey: 'trophy', displayOrder: 2 },
        { title: text('first'), description: text('a'), iconKey: 'star', displayOrder: 1 },
      ],
      coreValues: [],
      seo: null,
    });
    media.resolvePublicImages.mockResolvedValue(new Map());

    const page = await service.getCurrentPublic();

    expect(served(page).strategicGoals).toEqual([
      { title: text('first'), description: text('a'), iconKey: 'star', displayOrder: 1 },
      { title: text('second'), description: text('b'), iconKey: 'trophy', displayOrder: 2 },
    ]);
  });
});

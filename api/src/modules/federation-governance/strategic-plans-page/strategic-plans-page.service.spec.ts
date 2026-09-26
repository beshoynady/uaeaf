import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { StrategicPlansPagesService } from './strategic-plans-page.service.js';
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
 * The service keeps three promises the page and the dashboard rely on: the
 * public projection prints only visible items, in order, with every picture
 * resolved in one query; a save touches only what it names and keeps an
 * item's id; a reorder is a full permutation of the list or nothing.
 */

const ids = {
  hero: new Types.ObjectId(),
  intro: new Types.ObjectId(),
  objectives: new Types.ObjectId(),
  metrics: new Types.ObjectId(),
  cta: new Types.ObjectId(),
  og: new Types.ObjectId(),
};

const image = (name: string) => ({
  url: `https://cdn/${name}.jpg`,
  altText: { ar: '', en: '' },
  width: 1536,
  height: 672,
});

const text = (value: string) => ({ ar: value, en: value });

const item = (name: string, displayOrder: number, extra: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  title: text(name),
  description: text(`${name} description`),
  displayOrder,
  isVisible: true,
  ...extra,
});

/** The required texts of a snapshot, so a spec only states what it tests. */
const baseSnapshot = () => ({
  heroTitle: text('h'),
  heroSubtitle: text('s'),
  introHeading: text('ih'),
  introText: text('it'),
  pillarsTitle: text('pt'),
  objectivesTitle: text('ot'),
  metricsTitle: text('mt'),
  executionTitle: text('et'),
  ctaTitle: text('ct'),
  phases: [],
  pillars: [],
  objectives: [],
  metrics: [],
  executionSteps: [],
  seo: null,
});

/** A stand-in for one collaborator method, typed loosely: the service reads
 *  each through its own signature, which is what these specs exercise. */
const mock = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const make = () => {
  // Served, so `getCurrentPublic` answers the page rather than the switch
  // alone. The switch is read from the row, never the snapshot (ADR-0102 §D4),
  // so every spec about a published page has to say the row is switched on.
  const repository = {
    find: mock(),
    findById: mock(),
    findByIdWithActivation: mock().mockResolvedValue({ isActive: true }),
    updateById: mock(),
    updateIfUnchanged: mock(),
    create: mock(),
  };
  const publications = { findLive: mock(), getPublicSnapshot: mock() };
  const revisions = {};
  const media = { resolvePublicImages: mock(), assertUsableImage: mock() };
  const service = new StrategicPlansPagesService(
    repository as never,
    publications as never,
    revisions as never,
    media as never,
  );
  return { service, repository, publications, media };
};

const publishedAt = new Date('2026-09-15T09:00:00.000Z');

const liveWith = (
  made: ReturnType<typeof make>,
  snapshot: Record<string, unknown>,
  images = new Map<string, ReturnType<typeof image>>(),
) => {
  made.repository.find.mockResolvedValue([{ _id: new Types.ObjectId() }]);
  made.publications.findLive.mockResolvedValue({ publishedAt });
  made.publications.getPublicSnapshot.mockResolvedValue(snapshot);
  made.media.resolvePublicImages.mockResolvedValue(images);
};

const setOf = (made: ReturnType<typeof make>) =>
  (made.repository.updateById.mock.calls[0][1] as { $set: Record<string, unknown> }).$set;

describe('StrategicPlansPagesService — public projection', () => {
  it('prints every photograph the published version points at, resolved in one query', async () => {
    const made = make();
    liveWith(
      made,
      {
        ...baseSnapshot(),
        heroImageId: ids.hero,
        introImageId: ids.intro,
        objectivesImageId: ids.objectives,
        metricsImageId: ids.metrics,
        ctaImageId: ids.cta,
        seo: { metaTitle: text('m'), metaDescription: null, ogImageId: ids.og },
      },
      new Map([
        [String(ids.hero), image('hero')],
        [String(ids.intro), image('intro')],
        [String(ids.objectives), image('objectives')],
        [String(ids.metrics), image('metrics')],
        [String(ids.cta), image('cta')],
        [String(ids.og), image('og')],
      ]),
    );

    const page = await made.service.getCurrentPublic();

    expect(page).toMatchObject({
      heroImage: image('hero'),
      introImage: image('intro'),
      objectivesImage: image('objectives'),
      metricsImage: image('metrics'),
      ctaImage: image('cta'),
      seo: { metaTitle: text('m'), metaDescription: null, ogImage: image('og') },
      publishedAt: publishedAt.toISOString(),
    });
    expect(made.media.resolvePublicImages).toHaveBeenCalledTimes(1);
    const asked = made.media.resolvePublicImages.mock.calls[0][0] as unknown[];
    expect(asked.map(String)).toEqual(expect.arrayContaining(Object.values(ids).map(String)));
  });

  it('prints no photograph for a section whose ref is empty', async () => {
    const made = make();
    liveWith(made, baseSnapshot());

    const page = await made.service.getCurrentPublic();

    expect(page).toMatchObject({
      heroImage: null,
      introImage: null,
      objectivesImage: null,
      metricsImage: null,
      ctaImage: null,
      seo: null,
      phasesTitle: null,
      pillarsText: null,
      executionText: null,
      ctaText: null,
    });
  });

  it('omits hidden items and sorts each list by displayOrder, with the id as a string', async () => {
    const made = make();
    const second = item('second', 2, { iconKey: 'trophy' });
    const first = item('first', 1, { iconKey: 'layers' });
    const hidden = item('hidden', 3, { iconKey: 'sparkles', isVisible: false });
    const pillarB = item('b', 2);
    const pillarA = item('a', 1);
    const metric = { _id: new Types.ObjectId(), value: '+30%', label: text('l'), displayOrder: 1, isVisible: true };
    const hiddenMetric = { ...metric, _id: new Types.ObjectId(), value: '0', isVisible: false };
    const step = { _id: new Types.ObjectId(), title: text('s'), description: null, displayOrder: 1, isVisible: true };
    liveWith(made, {
      ...baseSnapshot(),
      phases: [second, hidden, first],
      pillars: [pillarB, pillarA],
      objectives: [item('o', 1, { isVisible: false })],
      metrics: [hiddenMetric, metric],
      executionSteps: [step],
    });

    const page = await made.service.getCurrentPublic();

    expect(served(page).phases).toEqual([
      { id: String(first._id), title: first.title, description: first.description, iconKey: 'layers', displayOrder: 1 },
      { id: String(second._id), title: second.title, description: second.description, iconKey: 'trophy', displayOrder: 2 },
    ]);
    expect(served(page).pillars.map((pillar) => pillar.id)).toEqual([String(pillarA._id), String(pillarB._id)]);
    expect(served(page).objectives).toEqual([]);
    expect(served(page).metrics).toEqual([{ id: String(metric._id), value: '+30%', label: text('l'), displayOrder: 1 }]);
    expect(served(page).executionSteps).toEqual([{ id: String(step._id), title: text('s'), description: null, displayOrder: 1 }]);
    expect(JSON.stringify(page)).not.toContain('isVisible');
  });

  it('treats an item with no visibility flag as visible', async () => {
    const made = make();
    const legacy = { _id: new Types.ObjectId(), title: text('t'), description: text('d'), displayOrder: 1 };
    liveWith(made, { ...baseSnapshot(), pillars: [legacy] });

    const page = await made.service.getCurrentPublic();

    expect(served(page).pillars).toHaveLength(1);
  });

  it('picks the newest Live publication among the rows, and null when none is Live', async () => {
    const made = make();
    const older = new Types.ObjectId();
    const newer = new Types.ObjectId();
    const unpublished = new Types.ObjectId();
    made.repository.find.mockResolvedValue([{ _id: older }, { _id: unpublished }, { _id: newer }]);
    made.publications.findLive.mockImplementation(async (_type: unknown, id: unknown) => {
      if (String(id) === String(older)) return { publishedAt: new Date('2026-09-01T00:00:00.000Z') };
      if (String(id) === String(newer)) return { publishedAt };
      return null;
    });
    made.publications.getPublicSnapshot.mockImplementation(async (_type: unknown, id: unknown) => ({
      ...baseSnapshot(),
      heroTitle: text(String(id) === String(newer) ? 'newer' : 'older'),
    }));
    made.media.resolvePublicImages.mockResolvedValue(new Map());

    expect(served(await made.service.getCurrentPublic()).heroTitle).toEqual(text('newer'));

    made.publications.findLive.mockResolvedValue(null);
    expect(await made.service.getCurrentPublic()).toBeNull();
  });

  it("answers one row's public read with the same projection: no federationId, no hidden item", async () => {
    const made = make();
    const entityId = new Types.ObjectId();
    const shown = item('shown', 1);
    const hidden = item('hidden', 2, { isVisible: false });
    made.publications.findLive.mockResolvedValue({ publishedAt });
    made.publications.getPublicSnapshot.mockResolvedValue({
      ...baseSnapshot(),
      federationId: new Types.ObjectId(),
      pillars: [shown, hidden],
    });
    made.media.resolvePublicImages.mockResolvedValue(new Map());

    const page = await made.service.getPublicSnapshot(String(entityId));

    expect(page).not.toBeNull();
    expect(page).not.toHaveProperty('federationId');
    expect(served(page).pillars.map((pillar) => pillar.id)).toEqual([String(shown._id)]);
    expect(JSON.stringify(page)).not.toContain(String(hidden._id));
    expect(served(page).publishedAt).toBe(publishedAt.toISOString());
    expect(String(made.publications.findLive.mock.calls[0][1])).toBe(String(entityId));
  });

  it("answers one row's public read with null when nothing of it is Live", async () => {
    const made = make();
    made.publications.findLive.mockResolvedValue(null);
    made.publications.getPublicSnapshot.mockResolvedValue(null);

    expect(await made.service.getPublicSnapshot(String(new Types.ObjectId()))).toBeNull();
  });
});

describe('StrategicPlansPagesService — saving', () => {
  it('refuses a section photograph that is not a usable image, before anything is saved', async () => {
    const made = make();
    made.media.assertUsableImage.mockImplementation(async (id: unknown) => {
      if (id === String(ids.cta)) throw new Error('not an image');
    });

    await expect(
      made.service.update(String(new Types.ObjectId()), { ctaImageId: String(ids.cta) } as never, new Types.ObjectId()),
    ).rejects.toThrow('not an image');
    expect(made.repository.updateById).not.toHaveBeenCalled();
  });

  it('throws NotFound when no row has that id', async () => {
    const made = make();
    made.repository.findById.mockResolvedValue(null);

    await expect(
      made.service.update(String(new Types.ObjectId()), { ctaText: text('x') } as never, new Types.ObjectId()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(made.repository.updateById).not.toHaveBeenCalled();
  });

  it('applies only the keys the request carries: texts copied, images as refs, null clears', async () => {
    const made = make();
    made.repository.findById.mockResolvedValue({ pillars: [] });
    made.repository.updateById.mockResolvedValue({});
    const updatedBy = new Types.ObjectId();

    await made.service.update(
      String(new Types.ObjectId()),
      { introImageId: String(ids.intro), metricsImageId: null, ctaText: null, pillarsTitle: text('p') } as never,
      updatedBy,
    );

    const set = setOf(made);
    expect(String(set.introImageId)).toBe(String(ids.intro));
    expect(set.introImageId).toBeInstanceOf(Types.ObjectId);
    expect(set.metricsImageId).toBeNull();
    expect(set.ctaText).toBeNull();
    expect(set.pillarsTitle).toEqual(text('p'));
    expect(set.updatedBy).toBe(updatedBy);
    expect(set).not.toHaveProperty('heroTitle');
    expect(set).not.toHaveProperty('pillars');
    expect(set).not.toHaveProperty('ctaImageId');
    expect(set).not.toHaveProperty('federationId');
    expect(set).not.toHaveProperty('publicationState');
  });

  it('stores the seo embed with its share image as a ref', async () => {
    const made = make();
    made.repository.findById.mockResolvedValue({});
    made.repository.updateById.mockResolvedValue({});

    await made.service.update(
      String(new Types.ObjectId()),
      { seo: { metaTitle: text('m'), ogImageId: String(ids.og) } } as never,
      new Types.ObjectId(),
    );

    expect(setOf(made).seo).toEqual({ metaTitle: text('m'), metaDescription: null, ogImageId: ids.og });
  });

  it('keeps the id of an item the stored list already holds and gives any other item a new one', async () => {
    const made = make();
    const kept = item('kept', 1);
    const foreign = new Types.ObjectId();
    made.repository.findById.mockResolvedValue({ pillars: [kept, item('gone', 2)] });
    made.repository.updateById.mockResolvedValue({});

    await made.service.update(
      String(new Types.ObjectId()),
      {
        pillars: [
          { _id: String(kept._id), title: text('renamed'), description: text('d'), displayOrder: 2, isVisible: false },
          { title: text('new'), description: text('d'), displayOrder: 1 },
          { _id: String(foreign), title: text('foreign'), description: text('d'), displayOrder: 3 },
        ],
      } as never,
      new Types.ObjectId(),
    );

    const pillars = setOf(made).pillars as Array<{ _id: Types.ObjectId; title: unknown; isVisible: boolean }>;
    expect(pillars).toHaveLength(3);
    expect(String(pillars[0]._id)).toBe(String(kept._id));
    expect(pillars[0]).toMatchObject({ title: text('renamed'), displayOrder: 1, isVisible: false });
    expect(pillars[1]._id).toBeInstanceOf(Types.ObjectId);
    expect(pillars[1].isVisible).toBe(true);
    expect(pillars[2]._id).toBeInstanceOf(Types.ObjectId);
    expect(String(pillars[2]._id)).not.toBe(String(foreign));
    expect(new Set(pillars.map((pillar) => String(pillar._id))).size).toBe(3);
  });

  it('creates the row with every list item given an id and a visibility', async () => {
    const made = make();
    made.repository.create.mockImplementation(async (data: unknown) => data);

    const created = (await made.service.create({
      federationId: String(new Types.ObjectId()),
      heroTitle: text('h'),
      heroSubtitle: text('s'),
      introHeading: text('ih'),
      introText: text('it'),
      pillarsTitle: text('pt'),
      objectivesTitle: text('ot'),
      metricsTitle: text('mt'),
      executionTitle: text('et'),
      ctaTitle: text('ct'),
      phases: [{ title: text('p'), description: text('d'), iconKey: 'layers', displayOrder: 1 }],
      metrics: [{ value: '2030', label: text('l'), displayOrder: 1 }],
      publicationState: 'Draft',
    } as never)) as unknown as Record<string, unknown>;

    expect(created.federationId).toBeInstanceOf(Types.ObjectId);
    expect(created.heroImageId).toBeNull();
    expect(created.introImageId).toBeNull();
    expect(created.phasesTitle).toBeNull();
    expect(created.pillars).toEqual([]);
    expect(created.revisionId).toBeNull();
    const [phase] = created.phases as Array<Record<string, unknown>>;
    expect(phase._id).toBeInstanceOf(Types.ObjectId);
    expect(phase.isVisible).toBe(true);
    expect(phase.iconKey).toBe('layers');
    const [metric] = created.metrics as Array<Record<string, unknown>>;
    expect(metric._id).toBeInstanceOf(Types.ObjectId);
    expect(metric.value).toBe('2030');
  });

  it('renumbers displayOrder from the array position, whatever the client sent', async () => {
    const made = make();
    made.repository.findById.mockResolvedValue({ pillars: [] });
    made.repository.updateById.mockResolvedValue({});

    await made.service.update(
      String(new Types.ObjectId()),
      {
        pillars: [
          { title: text('first'), description: text('d'), displayOrder: 5 },
          { title: text('second'), description: text('d'), displayOrder: 5 },
          { title: text('third'), description: text('d'), displayOrder: 9 },
        ],
      } as never,
      new Types.ObjectId(),
    );

    const pillars = setOf(made).pillars as Array<{ title: unknown; displayOrder: number }>;
    expect(pillars.map((pillar) => [pillar.title, pillar.displayOrder])).toEqual([
      [text('first'), 1],
      [text('second'), 2],
      [text('third'), 3],
    ]);
  });
});

describe('StrategicPlansPagesService — a section keeps a visible item', () => {
  const pillar = (isVisible?: boolean) => ({ title: text('p'), description: text('d'), displayOrder: 1, isVisible });

  const saving = (made: ReturnType<typeof make>, dto: Record<string, unknown>) => {
    made.repository.findById.mockResolvedValue({ pillars: [] });
    made.repository.updateById.mockResolvedValue({});
    return made.service.update(String(new Types.ObjectId()), dto as never, new Types.ObjectId());
  };

  it.each([
    ['an empty list', []],
    ['a list whose every item is hidden', [pillar(false), pillar(false)]],
  ])('refuses %s with a coded BadRequest and writes nothing', async (_name, pillars) => {
    const made = make();

    const attempt = saving(made, { pillars });

    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt).rejects.toMatchObject({ response: { code: 'listNeedsVisibleItem', list: 'pillars' } });
    expect(made.repository.updateById).not.toHaveBeenCalled();
  });

  it('accepts a list with one visible item among hidden ones', async () => {
    const made = make();

    await saving(made, { pillars: [pillar(false), pillar(), pillar(false)] });

    expect(made.repository.updateById).toHaveBeenCalledTimes(1);
  });

  it('leaves a list the request does not carry unchecked', async () => {
    const made = make();

    await saving(made, { ctaText: text('x') });

    expect(made.repository.updateById).toHaveBeenCalledTimes(1);
  });

  it('refuses a create whose list has no item, and creates nothing', async () => {
    const made = make();
    made.repository.create.mockImplementation(async (data: unknown) => data);

    const attempt = made.service.create({
      federationId: String(new Types.ObjectId()),
      phases: [],
      publicationState: 'Draft',
    } as never);

    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt).rejects.toMatchObject({ response: { code: 'listNeedsVisibleItem', list: 'phases' } });
    expect(made.repository.create).not.toHaveBeenCalled();
  });
});

describe('StrategicPlansPagesService — a row holds at most ten items', () => {
  const phase = (n: number, isVisible = true) => ({
    title: text(`p${n}`),
    description: text('d'),
    iconKey: 'layers',
    displayOrder: n,
    isVisible,
  });
  const step = (n: number) => ({ title: text(`s${n}`), description: text('d'), displayOrder: n, isVisible: true });
  const many = <T>(count: number, make: (n: number) => T): T[] =>
    Array.from({ length: count }, (_, index) => make(index + 1));

  const saving = (made: ReturnType<typeof make>, dto: Record<string, unknown>) => {
    made.repository.findById.mockResolvedValue({ phases: [], executionSteps: [] });
    made.repository.updateById.mockResolvedValue({});
    return made.service.update(String(new Types.ObjectId()), dto as never, new Types.ObjectId());
  };

  // The phases stand on one rail and the steps on one climb; past the count a
  // row can hold at the width it is drawn, both fall back to their phone
  // layout, and beyond ten the section is a list nobody scrolls (ADR-0075,
  // owner decision 2026-09-16). The pillars, objectives and metrics wrap on
  // their own and carry no limit.
  it.each([
    ['phases', many(11, phase)],
    ['executionSteps', many(11, step)],
  ])('refuses %s longer than ten with a coded BadRequest and writes nothing', async (key, items) => {
    const made = make();

    const attempt = saving(made, { [key]: items });

    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt).rejects.toMatchObject({ response: { code: 'listTooLong', list: key, limit: 10 } });
    expect(made.repository.updateById).not.toHaveBeenCalled();
  });

  it('accepts exactly ten', async () => {
    const made = make();

    await saving(made, { phases: many(10, phase) });

    expect(made.repository.updateById).toHaveBeenCalledTimes(1);
  });

  // Hidden items still occupy the row the moment an editor shows them, and
  // the count the API stores is what the next editor opens.
  it('counts hidden items too', async () => {
    const made = make();

    const attempt = saving(made, { phases: [...many(10, phase), phase(11, false)] });

    await expect(attempt).rejects.toMatchObject({ response: { code: 'listTooLong', list: 'phases' } });
  });

  it('leaves the lists that wrap on their own unlimited', async () => {
    const made = make();

    await saving(made, { pillars: many(11, (n) => ({ title: text(`x${n}`), description: text('d'), displayOrder: n, isVisible: true })) });

    expect(made.repository.updateById).toHaveBeenCalledTimes(1);
  });

  it('refuses a create whose list is longer than ten, and creates nothing', async () => {
    const made = make();
    made.repository.create.mockImplementation(async (data: unknown) => data);

    const attempt = made.service.create({
      federationId: String(new Types.ObjectId()),
      executionSteps: many(11, step),
      publicationState: 'Draft',
    } as never);

    await expect(attempt).rejects.toMatchObject({ response: { code: 'listTooLong', list: 'executionSteps' } });
    expect(made.repository.create).not.toHaveBeenCalled();
  });
});

describe('StrategicPlansPagesService — reordering a list', () => {
  const stored = () => [item('a', 1), item('b', 2), item('c', 3)];

  const reorder = (made: ReturnType<typeof make>, list: string, ids: string[], id = String(new Types.ObjectId())) =>
    made.service.reorderList(id, list as never, ids, new Types.ObjectId());

  const reorderSet = (made: ReturnType<typeof make>) =>
    (made.repository.updateIfUnchanged.mock.calls[0][2] as { $set: Record<string, unknown> }).$set;

  it('renumbers the items from 1 in the order given and returns the updated row', async () => {
    const made = make();
    const [a, b, c] = stored();
    const rowId = String(new Types.ObjectId());
    const updatedAt = new Date('2026-09-15T08:00:00.000Z');
    made.repository.findById.mockResolvedValue({ objectives: [a, b, c], updatedAt });
    made.repository.updateIfUnchanged.mockResolvedValue({ objectives: 'updated' });

    const result = await reorder(made, 'objectives', [String(c._id), String(a._id), String(b._id)], rowId);

    expect(result).toEqual({ objectives: 'updated' });
    expect(made.repository.updateById).not.toHaveBeenCalled();
    const [writtenId, writtenUpdatedAt] = made.repository.updateIfUnchanged.mock.calls[0];
    expect(writtenId).toBe(rowId);
    expect(writtenUpdatedAt).toBe(updatedAt);
    const objectives = reorderSet(made).objectives as Array<{ _id: Types.ObjectId; displayOrder: number; title: unknown }>;
    expect(objectives.map((entry) => [String(entry._id), entry.displayOrder])).toEqual([
      [String(c._id), 1],
      [String(a._id), 2],
      [String(b._id), 3],
    ]);
    expect(objectives[0].title).toEqual(c.title);
    expect(reorderSet(made)).not.toHaveProperty('pillars');
  });

  it('refuses with a coded Conflict when the row changed between the read and the write', async () => {
    const made = make();
    const [a, b] = stored();
    made.repository.findById.mockResolvedValue({ metrics: [a, b], updatedAt: new Date() });
    made.repository.updateIfUnchanged.mockResolvedValue(null);

    const attempt = reorder(made, 'metrics', [String(b._id), String(a._id)]);

    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(attempt).rejects.toMatchObject({ response: { code: 'staleRecord' } });
  });

  it('reads the stored items as plain data, not as Mongoose subdocuments', async () => {
    const made = make();
    const [a, b] = stored();
    // A hydrated row: spreading one of its subdocuments copies the
    // document's internals, not the item's fields. `toObject()` is the data.
    made.repository.findById.mockResolvedValue({
      toObject: () => ({ metrics: [a, b] }),
      metrics: [{ _id: a._id, $__: 'internals' }, { _id: b._id, $__: 'internals' }],
    });
    made.repository.updateIfUnchanged.mockResolvedValue({});

    await reorder(made, 'metrics', [String(b._id), String(a._id)]);

    const metrics = reorderSet(made).metrics as Array<Record<string, unknown>>;
    expect(metrics[0]).toEqual({ ...b, displayOrder: 1 });
    expect(metrics[1]).toEqual({ ...a, displayOrder: 2 });
  });

  it.each([
    ['a missing id', (a: string, b: string) => [a, b]],
    ['a duplicated id', (a: string, b: string) => [a, a, b]],
    ['an unknown id', (a: string, b: string) => [a, b, String(new Types.ObjectId())]],
    ['an extra id', (a: string, b: string, c: string) => [a, b, c, String(new Types.ObjectId())]],
  ])('refuses %s with a coded BadRequest and writes nothing', async (_name, pick) => {
    const made = make();
    const [a, b, c] = stored();
    made.repository.findById.mockResolvedValue({ phases: [a, b, c] });

    const attempt = reorder(made, 'phases', pick(String(a._id), String(b._id), String(c._id)));

    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt).rejects.toMatchObject({ response: { code: 'invalidListOrder' } });
    expect(made.repository.updateById).not.toHaveBeenCalled();
    expect(made.repository.updateIfUnchanged).not.toHaveBeenCalled();
  });

  it('throws NotFound when no row has that id', async () => {
    const made = make();
    made.repository.findById.mockResolvedValue(null);

    await expect(reorder(made, 'metrics', [String(new Types.ObjectId())])).rejects.toBeInstanceOf(NotFoundException);
  });
});

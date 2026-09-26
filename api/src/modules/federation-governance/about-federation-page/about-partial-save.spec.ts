import { jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { AboutFederationPagesService } from './about-federation-page.service.js';
import { AboutFederationPagesRepository } from './about-federation-page.repository.js';
import { AboutFederationStatsService } from './about-federation-stats.service.js';
import { UpdateAboutFederationPageDto } from './dto/update-about-federation-page.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { FederationAppointmentsService } from '../federation-appointments/federation-appointments.service.js';

/**
 * Saving one field of a section must leave the rest of that section alone.
 *
 * ── Why the body goes through `plainToInstance` here ───────────────────────
 *
 * Because that is the difference between this test and the one that missed the
 * bug. A hand-written object literal carries only the keys it names. A
 * validated DTO is a class instance, and at this project's compile target
 * (`ES2023`) a declared-but-unset field is an own property holding
 * `undefined` — so `Object.entries` on a body that named only `hero.eyebrow`
 * also yields `title` and `description`, as `undefined`.
 *
 * Writing those through erased them. One saved field blanked the rest of its
 * section, the page then read `undefined[locale]`, and the route answered 500.
 * Nothing in the unit suite could see it, because nothing in the unit suite
 * built the body the controller actually receives.
 */

const pair = (value: string) => ({ ar: value, en: value });

const stored = {
  _id: new Types.ObjectId(),
  hero: {
    eyebrow: pair('since 1974'),
    title: pair('About the Federation'),
    description: pair('More than half a century'),
    imageId: null,
  },
  timeline: {
    eyebrow: pair('e'),
    title: pair('t'),
    description: pair('d'),
    items: [{ _id: new Types.ObjectId(), datePrecision: 'year', year: 1974, title: pair('m'), description: pair('x') }],
  },
  toObject() {
    const { toObject, ...rest } = this;
    void toObject;
    return rest;
  },
};

const serviceWith = () => {
  const updateById = jest.fn(async () => stored);
  const repository = {
    findById: jest.fn(async () => stored),
    updateById,
  } as unknown as AboutFederationPagesRepository;

  const service = new AboutFederationPagesService(
    repository,
    {} as unknown as PublicationsService,
    { assertUsableImage: jest.fn(async () => undefined) } as unknown as MediaAssetsService,
    {} as unknown as AboutFederationStatsService,
    {} as unknown as FederationAppointmentsService,
  );
  return { service, updateById };
};

/** The body exactly as the controller receives it, after the global pipe. */
const asBody = (raw: Record<string, unknown>) => plainToInstance(UpdateAboutFederationPageDto, raw);

describe('a partial save of one section', () => {
  it('keeps the fields the body did not name', async () => {
    const { service, updateById } = serviceWith();

    await service.update(
      stored._id.toString(),
      asBody({ hero: { eyebrow: pair('since April 1974 — updated') } }),
      new Types.ObjectId(),
    );

    const written = (updateById.mock.calls[0] as unknown[])[1] as { $set: Record<string, unknown> };
    const hero = written.$set.hero as Record<string, unknown>;

    expect(hero.eyebrow).toEqual(pair('since April 1974 — updated'));
    expect(hero.title).toEqual(pair('About the Federation'));
    expect(hero.description).toEqual(pair('More than half a century'));
  });

  it('writes no key as undefined, which is what erased them', async () => {
    const { service, updateById } = serviceWith();

    await service.update(stored._id.toString(), asBody({ hero: { eyebrow: pair('x') } }), new Types.ObjectId());

    const written = (updateById.mock.calls[0] as unknown[])[1] as { $set: Record<string, unknown> };
    const hero = written.$set.hero as Record<string, unknown>;

    expect(Object.entries(hero).filter(([, value]) => value === undefined)).toEqual([]);
  });

  it('touches no other section', async () => {
    const { service, updateById } = serviceWith();

    await service.update(stored._id.toString(), asBody({ hero: { eyebrow: pair('x') } }), new Types.ObjectId());

    const written = (updateById.mock.calls[0] as unknown[])[1] as { $set: Record<string, unknown> };

    expect(Object.keys(written.$set).sort()).toEqual(['hero', 'updatedBy']);
  });

  /** A caller clearing a picture sends `null`, which is a value and must be
   *  written — the rule is about `undefined`, not about falsy. */
  it('still applies a field the body sets to null', async () => {
    const { service, updateById } = serviceWith();

    await service.update(stored._id.toString(), asBody({ hero: { imageId: null } }), new Types.ObjectId());

    const written = (updateById.mock.calls[0] as unknown[])[1] as { $set: Record<string, unknown> };
    const hero = written.$set.hero as Record<string, unknown>;

    expect(hero.imageId).toBeNull();
    expect(hero.title).toEqual(pair('About the Federation'));
  });
});

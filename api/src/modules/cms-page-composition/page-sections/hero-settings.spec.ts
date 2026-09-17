import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { PageSectionsService } from './page-sections.service.js';
import { PageSectionsRepository } from './page-sections.repository.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERO_PLAYBACK_INTERVALS, assertHeroSettings } from './hero-settings.js';

/**
 * The HERO section's own settings (owner decisions 2026-09-17): the next-event
 * bar, typed by hand, and the slides' playback.
 *
 * The bar says nothing it cannot say in full: once it is switched on, its label,
 * name and venue are needed in both languages, and when it starts and ends.
 * It ends no earlier than it starts. Playback offers the three durations the
 * site supports.
 */
describe('HERO section settings', () => {
  const event = (overrides: Record<string, unknown> = {}) => ({
    isVisible: true,
    label: { ar: 'البطولة القادمة', en: 'Next championship' },
    name: { ar: 'بطولة الإمارات', en: 'UAE Championship' },
    venue: { ar: 'أبوظبي', en: 'Abu Dhabi' },
    startsAt: '2026-10-16T14:00:00.000Z',
    endsAt: '2026-10-18T18:00:00.000Z',
    ...overrides,
  });

  const settings = (nextEvent: unknown, playback: unknown = { autoplay: true, intervalMs: 7000 }) => ({
    nextEvent,
    playback,
  });

  it('accepts a complete visible event and a supported playback', () => {
    expect(() => assertHeroSettings(settings(event()))).not.toThrow();
  });

  it('accepts a hidden event with nothing filled in', () => {
    expect(() =>
      assertHeroSettings(
        settings({ isVisible: false, label: { ar: '', en: '' }, name: { ar: '', en: '' }, venue: { ar: '', en: '' }, startsAt: null, endsAt: null }),
      ),
    ).not.toThrow();
  });

  it('refuses a visible event with gaps, naming every one', () => {
    expect(() => assertHeroSettings(settings(event({ venue: { ar: 'أبوظبي', en: ' ' }, endsAt: null })))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'incompleteNextEvent', missing: ['venue.en', 'endsAt'] }) }),
    );
  });

  it('refuses an event that ends before it starts, visible or not', () => {
    const backwards = { startsAt: '2026-10-16T14:00:00.000Z', endsAt: '2026-10-16T13:59:00.000Z' };
    for (const isVisible of [true, false]) {
      expect(() => assertHeroSettings(settings(event({ ...backwards, isVisible })))).toThrow(
        expect.objectContaining({ response: expect.objectContaining({ code: 'nextEventEndsBeforeStart' }) }),
      );
    }
  });

  it('accepts an event that ends the moment it starts', () => {
    expect(() =>
      assertHeroSettings(settings(event({ startsAt: '2026-10-16T14:00:00.000Z', endsAt: '2026-10-16T14:00:00.000Z' }))),
    ).not.toThrow();
  });

  it.each([
    ['name', 'eventName', 52],
    ['label', 'eventLabel', 52],
    ['venue', 'eventVenue', 35],
  ])('refuses a %s longer than the bar holds at 390', (field, _limitName, limit) => {
    expect(() => assertHeroSettings(settings(event({ [field]: { ar: 'ع', en: 'x'.repeat(limit + 1) } })))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'heroTextTooLong', field: `nextEvent.${field}.en`, limit }) }),
    );
  });

  it.each([
    [{ autoplay: true, intervalMs: 6000 }],
    [{ autoplay: 'yes', intervalMs: 7000 }],
    [{ intervalMs: 7000 }],
  ])('refuses the playback %p', (playback) => {
    expect(() => assertHeroSettings(settings(event(), playback))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'invalidPlayback' }) }),
    );
  });

  it('offers the durations the web and the dashboard offer, never a copy that drifts', () => {
    const shared = readFileSync(join(process.cwd(), '..', 'packages', 'content', 'hero', 'limits.ts'), 'utf-8');
    expect(shared).toContain(`intervals: [${HERO_PLAYBACK_INTERVALS.join(', ')}]`);
  });

  it('refuses an unreadable date as a gap, not as a date', () => {
    expect(() => assertHeroSettings(settings(event({ startsAt: 'soon' })))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'incompleteNextEvent', missing: ['startsAt'] }) }),
    );
  });

  describe('where the service applies them', () => {
    const makeRepository = () =>
      ({
        create: jest.fn(async () => ({})),
        findById: jest.fn(),
        updateById: jest.fn(async () => ({})),
      }) as unknown as jest.Mocked<PageSectionsRepository>;

    const section = (sectionType: string, configuration: unknown) => ({
      pageId: new Types.ObjectId().toString(),
      sectionType: sectionType as 'HERO',
      displayOrder: 0,
      visibility: 'Everyone' as const,
      selectionMode: 'MANUAL' as const,
      configuration: configuration as Record<string, unknown>,
    });

    it('checks a HERO section on create, and writes nothing when refused', async () => {
      const repository = makeRepository();
      await expect(
        new PageSectionsService(repository).create(section('HERO', settings(event({ name: { ar: '', en: '' } })))),
      ).rejects.toMatchObject({ response: { code: 'incompleteNextEvent' } });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('leaves any other section\'s configuration to that section', async () => {
      const repository = makeRepository();
      await new PageSectionsService(repository).create(section('LATEST_NEWS', { nextEvent: 'anything' }));
      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('checks the configuration an edit writes to a stored HERO section', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({ sectionType: 'HERO', visibleFrom: null, visibleUntil: null } as never);

      await expect(
        new PageSectionsService(repository).update('id', { configuration: settings(event(), { autoplay: true, intervalMs: 1 }) }),
      ).rejects.toMatchObject({ response: { code: 'invalidPlayback' } });
      expect(repository.updateById).not.toHaveBeenCalled();
    });
  });
});

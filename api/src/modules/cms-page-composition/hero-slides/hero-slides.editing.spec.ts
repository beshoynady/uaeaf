import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { HeroSlidesService } from './hero-slides.service.js';
import { HeroSlidesRepository } from './hero-slides.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { HERO_CTA_LABEL_MAX } from './schemas/hero-cta.schema.js';
import { HERO_SLIDE_LIMIT } from './schemas/hero-slides.schema.js';

/**
 * Editing a slide, and the rules the owner added on 2026-09-16.
 *
 * `hero-slides.service.spec.ts` covers the original create path and the
 * scheduling window. What is here is everything the dashboard's hero screen
 * needs and the original shape could not express: two independently visible
 * buttons, a phone crop with its own focal point, a section that holds at
 * most five slides, and a public shape that never carries a hidden button's
 * words or an asset's provenance mark.
 */
describe('HeroSlidesService — editing', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(),
      find: jest.fn(async () => []),
      findById: jest.fn(),
      updateById: jest.fn(),
    }) as unknown as jest.Mocked<HeroSlidesRepository>;

  const makeMediaAssets = () =>
    ({
      assertUsableImage: jest.fn(),
      resolvePublicImages: jest.fn(async () => new Map()),
    }) as unknown as jest.Mocked<MediaAssetsService>;

  const base = {
    pageSectionId: new Types.ObjectId().toString(),
    title: { en: 'T', ar: 'ع' },
    subtitle: { en: 'S', ar: 'ع' },
    displayOrder: 1,
  };

  const visibleCta = { isVisible: true, label: { ar: 'استعرض', en: 'Browse' }, url: '/championships' };

  const ready = () => {
    const repository = makeRepository();
    const media = makeMediaAssets();
    media.assertUsableImage.mockResolvedValue(undefined);
    repository.create.mockResolvedValue({} as never);
    return { repository, media, service: new HeroSlidesService(repository, media) };
  };

  describe('the two buttons', () => {
    it('stores a slide with no visible button at all', async () => {
      const { repository, service } = ready();

      await service.create({ ...base, mediaType: 'IMAGE', imageAssetId: new Types.ObjectId().toString() });

      const written = repository.create.mock.calls[0][0] as Record<string, { isVisible: boolean }>;
      expect(written.primaryCta.isVisible).toBe(false);
      expect(written.secondaryCta.isVisible).toBe(false);
    });

    it('keeps a hidden button’s words rather than erasing them', async () => {
      const { repository, service } = ready();
      const kept = { isVisible: false, label: { ar: 'لاحقًا', en: 'Later' }, url: '/news' };

      await service.create({
        ...base,
        mediaType: 'IMAGE',
        imageAssetId: new Types.ObjectId().toString(),
        secondaryCta: kept,
      });

      const written = repository.create.mock.calls[0][0] as Record<string, unknown>;
      expect(written.secondaryCta).toEqual(kept);
    });

    it.each([
      ['no label at all', { isVisible: true, url: '/x' }],
      ['only Arabic', { isVisible: true, label: { ar: 'استعرض', en: '' }, url: '/x' }],
      ['only English', { isVisible: true, label: { ar: '', en: 'Browse' }, url: '/x' }],
      ['no url', { isVisible: true, label: { ar: 'استعرض', en: 'Browse' } }],
      ['a blank url', { isVisible: true, label: { ar: 'استعرض', en: 'Browse' }, url: '   ' }],
    ])('refuses a visible button with %s', async (_why, cta) => {
      const { service } = ready();

      await expect(
        service.create({
          ...base,
          mediaType: 'IMAGE',
          imageAssetId: new Types.ObjectId().toString(),
          primaryCta: cta,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses a label longer than the button can hold at 390', async () => {
      const { service } = ready();

      await expect(
        service.create({
          ...base,
          mediaType: 'IMAGE',
          imageAssetId: new Types.ObjectId().toString(),
          primaryCta: { isVisible: true, label: { ar: 'ا'.repeat(HERO_CTA_LABEL_MAX + 1), en: 'Browse' }, url: '/x' },
        }),
      ).rejects.toMatchObject({ response: { code: 'ctaLabelTooLong' } });
    });

    it('counts a label as a reader does, so vowel marks do not push an Arabic label over', async () => {
      const { service } = ready();
      // 32 letters, each with a fatha: 64 code points, 32 characters on screen.
      // The dashboard counts graphemes; counting code points here refused a
      // label the screen had accepted, part-way through a publish.
      const voweled = 'بَ'.repeat(HERO_CTA_LABEL_MAX);

      await expect(
        service.create({
          ...base,
          mediaType: 'IMAGE',
          imageAssetId: new Types.ObjectId().toString(),
          primaryCta: { isVisible: true, label: { ar: voweled, en: 'Browse' }, url: '/x' },
        }),
      ).resolves.toBeDefined();
    });

    it.each(['http://example.com', 'javascript:alert(1)', '//evil.example', 'news'])(
      'refuses the link %s with its own code',
      async (url) => {
        const { service } = ready();

        await expect(
          service.create({
            ...base,
            mediaType: 'IMAGE',
            imageAssetId: new Types.ObjectId().toString(),
            primaryCta: { isVisible: true, label: { ar: 'استعرض', en: 'Browse' }, url },
          }),
        ).rejects.toMatchObject({ response: { code: 'invalidCtaUrl' } });
      },
    );

    it('accepts an internal path and an external https link together', async () => {
      const { repository, service } = ready();

      await service.create({
        ...base,
        mediaType: 'IMAGE',
        imageAssetId: new Types.ObjectId().toString(),
        primaryCta: visibleCta,
        secondaryCta: { isVisible: true, label: { ar: 'العالمي', en: 'World' }, url: 'https://worldathletics.org' },
      });

      expect(repository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('the phone crop', () => {
    it('refuses switching the crop on without a picture', async () => {
      const { service } = ready();

      await expect(
        service.create({
          ...base,
          mediaType: 'IMAGE',
          imageAssetId: new Types.ObjectId().toString(),
          useMobileImage: true,
        }),
      ).rejects.toMatchObject({ response: { code: 'missingRequiredField' } });
    });

    it('lets a kept picture stay while the crop is off', async () => {
      const { repository, service } = ready();
      const mobileImageAssetId = new Types.ObjectId().toString();

      await service.create({
        ...base,
        mediaType: 'IMAGE',
        imageAssetId: new Types.ObjectId().toString(),
        useMobileImage: false,
        mobileImageAssetId,
      });

      const written = repository.create.mock.calls[0][0] as Record<string, unknown>;
      expect(written.useMobileImage).toBe(false);
      expect(String(written.mobileImageAssetId)).toBe(mobileImageAssetId);
    });

    it('defaults both focal points to the centre', async () => {
      const { repository, service } = ready();

      await service.create({ ...base, mediaType: 'IMAGE', imageAssetId: new Types.ObjectId().toString() });

      const written = repository.create.mock.calls[0][0] as Record<string, { x: number; y: number }>;
      expect(written.desktopFocalPoint).toEqual({ x: 50, y: 50 });
      expect(written.mobileFocalPoint).toEqual({ x: 50, y: 50 });
    });
  });

  describe('the section’s capacity', () => {
    it(`refuses a ${HERO_SLIDE_LIMIT.max + 1}th slide`, async () => {
      const { repository, service } = ready();
      repository.find.mockResolvedValue(
        Array.from({ length: HERO_SLIDE_LIMIT.max }, () => ({ _id: new Types.ObjectId() })) as never,
      );

      await expect(
        service.create({ ...base, mediaType: 'IMAGE', imageAssetId: new Types.ObjectId().toString() }),
      ).rejects.toMatchObject({ response: { code: 'listTooLong' } });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('counts hidden slides against the limit, because showing one takes its place back', async () => {
      const { repository, service } = ready();
      repository.find.mockResolvedValue(
        Array.from({ length: HERO_SLIDE_LIMIT.max }, () => ({ _id: new Types.ObjectId(), active: false })) as never,
      );

      await expect(
        service.create({ ...base, mediaType: 'IMAGE', imageAssetId: new Types.ObjectId().toString() }),
      ).rejects.toMatchObject({ response: { code: 'listTooLong' } });
    });
  });

  // A slide whose window ends before it opens never shows, and says nothing:
  // it only reads "scheduled" in the dashboard. Refused with its own code,
  // on the slide as it would be stored (owner decision 2026-09-17).
  describe('the schedule', () => {
    it('refuses a window that ends before it starts', async () => {
      const { repository, service } = ready();

      await expect(
        service.create({
          ...base,
          mediaType: 'IMAGE',
          imageAssetId: new Types.ObjectId().toString(),
          scheduledFrom: '2026-10-10T08:00:00.000Z',
          scheduledTo: '2026-10-01T08:00:00.000Z',
        }),
      ).rejects.toMatchObject({ response: { code: 'scheduleEndsBeforeStart', field: 'scheduledTo' } });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('accepts a window that opens and closes at the same moment, and an open end', async () => {
      const { service } = ready();
      const at = '2026-10-10T08:00:00.000Z';

      await expect(
        service.create({ ...base, mediaType: 'IMAGE', imageAssetId: new Types.ObjectId().toString(), scheduledFrom: at, scheduledTo: at }),
      ).resolves.toBeDefined();
      await expect(
        service.create({ ...base, mediaType: 'IMAGE', imageAssetId: new Types.ObjectId().toString(), scheduledFrom: at }),
      ).resolves.toBeDefined();
    });

    it('refuses an end moved before the stored start, although the request names only the end', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        _id: new Types.ObjectId(),
        mediaType: 'IMAGE',
        imageAssetId: new Types.ObjectId(),
        primaryCta: { isVisible: false, label: null, url: null },
        secondaryCta: { isVisible: false, label: null, url: null },
        scheduledFrom: new Date('2026-10-10T08:00:00.000Z'),
        scheduledTo: null,
      } as never);

      await expect(
        new HeroSlidesService(repository, makeMediaAssets()).update('id', { scheduledTo: '2026-10-01T08:00:00.000Z' }),
      ).rejects.toMatchObject({ response: { code: 'scheduleEndsBeforeStart' } });
      expect(repository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const stored = (overrides: Record<string, unknown> = {}) => ({
      _id: new Types.ObjectId(),
      mediaType: 'IMAGE',
      imageAssetId: new Types.ObjectId(),
      desktopFocalPoint: { x: 50, y: 50 },
      useMobileImage: false,
      mobileImageAssetId: null,
      mobileFocalPoint: { x: 50, y: 50 },
      videoId: null,
      eyebrow: null,
      primaryCta: { isVisible: false, label: null, url: null },
      secondaryCta: { isVisible: false, label: null, url: null },
      ...overrides,
    });

    it('refuses a media-type switch that would leave the stored image behind', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(stored() as never);

      // Valid field by field, contradictory once applied: a VIDEO slide still
      // holding an imageAssetId is precisely the state `create` refuses.
      await expect(
        new HeroSlidesService(repository, makeMediaAssets()).update('id', { mediaType: 'VIDEO' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('refuses showing a button whose label was never written', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(stored() as never);

      await expect(
        new HeroSlidesService(repository, makeMediaAssets()).update('id', {
          primaryCta: { isVisible: true },
        }),
      ).rejects.toMatchObject({ response: { code: 'incompleteCta' } });
    });

    it('refuses switching the phone crop on when the stored slide has no picture for it', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(stored() as never);

      // The body alone is valid; the slide it produces is not.
      await expect(
        new HeroSlidesService(repository, makeMediaAssets()).update('id', { useMobileImage: true }),
      ).rejects.toMatchObject({ response: { code: 'missingRequiredField' } });
    });

    it('leaves a stored button alone when the request does not mention it', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(stored({ primaryCta: visibleCta }) as never);
      repository.updateById.mockResolvedValue({} as never);

      await new HeroSlidesService(repository, makeMediaAssets()).update('id', {
        title: { ar: 'جديد', en: 'New' },
      });

      expect(repository.updateById.mock.calls[0][1]).not.toHaveProperty('primaryCta');
    });

    it('does not re-check an image the request did not send', async () => {
      const repository = makeRepository();
      const media = makeMediaAssets();
      repository.findById.mockResolvedValue(stored() as never);
      repository.updateById.mockResolvedValue({} as never);

      // An asset archived after the slide was written must not make an
      // unrelated text edit fail: that failure is not this request's fault.
      await new HeroSlidesService(repository, media).update('id', { subtitle: { ar: 'ن', en: 'S' } });

      expect(media.assertUsableImage).not.toHaveBeenCalled();
    });

    it('rejects an unknown slide before touching anything', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(null as never);

      await expect(
        new HeroSlidesService(repository, makeMediaAssets()).update('id', { displayOrder: 2 }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('reorder', () => {
    const pageSectionId = new Types.ObjectId().toString();
    const ids = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
    const sectionSlides = ids.map((_id, index) => ({ _id, displayOrder: index }));

    it('writes displayOrder from the position in the list', async () => {
      const repository = makeRepository();
      repository.find.mockResolvedValue(sectionSlides as never);
      repository.updateById.mockResolvedValue({} as never);

      const reversed = [...ids].reverse().map((id) => id.toString());
      await new HeroSlidesService(repository, makeMediaAssets()).reorder({ pageSectionId, slideIds: reversed });

      const written = repository.updateById.mock.calls.map(([id, update]) => [
        id,
        (update as { displayOrder: number }).displayOrder,
      ]);
      expect(written).toEqual([
        [reversed[0], 0],
        [reversed[1], 1],
        [reversed[2], 2],
      ]);
    });

    it('refuses a partial list, which is how two slides end up sharing a position', async () => {
      const repository = makeRepository();
      repository.find.mockResolvedValue(sectionSlides as never);

      await expect(
        new HeroSlidesService(repository, makeMediaAssets()).reorder({
          pageSectionId,
          slideIds: [ids[0].toString(), ids[1].toString()],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('refuses a list naming a slide from another section', async () => {
      const repository = makeRepository();
      repository.find.mockResolvedValue(sectionSlides as never);

      await expect(
        new HeroSlidesService(repository, makeMediaAssets()).reorder({
          pageSectionId,
          slideIds: [ids[0].toString(), ids[1].toString(), new Types.ObjectId().toString()],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses a list that names the same slide twice', async () => {
      const repository = makeRepository();
      repository.find.mockResolvedValue(sectionSlides as never);

      await expect(
        new HeroSlidesService(repository, makeMediaAssets()).reorder({
          pageSectionId,
          slideIds: [ids[0].toString(), ids[0].toString(), ids[1].toString()],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('the public shape', () => {
    const pageSectionId = new Types.ObjectId().toString();
    const landscape = { url: '/wide.jpg', altText: { en: 'Track', ar: 'مضمار' }, width: 2400, height: 1300 };
    const portrait = { url: '/tall.jpg', altText: { en: 'Track', ar: 'مضمار' }, width: 1200, height: 1600 };

    const publish = async (overrides: Record<string, unknown>, resolved: Map<string, unknown>) => {
      const repository = makeRepository();
      const media = makeMediaAssets();
      repository.find.mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          mediaType: 'IMAGE',
          desktopFocalPoint: { x: 50, y: 50 },
          useMobileImage: false,
          mobileImageAssetId: null,
          mobileFocalPoint: { x: 50, y: 50 },
          videoId: null,
          eyebrow: null,
          title: { en: 'T', ar: 'ع' },
          subtitle: { en: 'S', ar: 'ع' },
          primaryCta: { isVisible: false, label: null, url: null },
          secondaryCta: { isVisible: false, label: null, url: null },
          displayOrder: 0,
          active: true,
          scheduledFrom: null,
          scheduledTo: null,
          ...overrides,
        },
      ] as never);
      media.resolvePublicImages.mockResolvedValue(resolved as never);
      const [slide] = await new HeroSlidesService(repository, media).findPublicBySection(pageSectionId);
      return slide;
    };

    it('carries the picture together with the point that must survive the crop', async () => {
      const imageAssetId = new Types.ObjectId();
      const slide = await publish(
        { imageAssetId, desktopFocalPoint: { x: 30, y: 70 } },
        new Map([[imageAssetId.toString(), landscape]]),
      );

      expect(slide.desktop).toEqual({ image: landscape, focalPoint: { x: 30, y: 70 } });
      expect(slide).not.toHaveProperty('imageAssetId');
    });

    it('offers the phone crop only when the slide switched it on', async () => {
      const imageAssetId = new Types.ObjectId();
      const mobileImageAssetId = new Types.ObjectId();
      const resolved = new Map<string, unknown>([
        [imageAssetId.toString(), landscape],
        [mobileImageAssetId.toString(), portrait],
      ]);

      const off = await publish({ imageAssetId, mobileImageAssetId, useMobileImage: false }, resolved);
      expect(off.mobile).toBeNull();

      const on = await publish(
        { imageAssetId, mobileImageAssetId, useMobileImage: true, mobileFocalPoint: { x: 60, y: 20 } },
        resolved,
      );
      expect(on.mobile).toEqual({ image: portrait, focalPoint: { x: 60, y: 20 } });
    });

    it('never sends a hidden button’s words to a visitor', async () => {
      const imageAssetId = new Types.ObjectId();
      const slide = await publish(
        {
          imageAssetId,
          primaryCta: visibleCta,
          secondaryCta: { isVisible: false, label: { ar: 'سرّي', en: 'Secret' }, url: '/unreleased' },
        },
        new Map([[imageAssetId.toString(), landscape]]),
      );

      expect(slide.primaryCta).toEqual({ label: visibleCta.label, url: '/championships', isExternal: false });
      expect(slide.secondaryCta).toBeNull();
      expect(JSON.stringify(slide)).not.toContain('unreleased');
    });

    it('marks an external link so the reader can open it in a new tab', async () => {
      const imageAssetId = new Types.ObjectId();
      const slide = await publish(
        {
          imageAssetId,
          primaryCta: { isVisible: true, label: { ar: 'العالمي', en: 'World' }, url: 'https://worldathletics.org' },
        },
        new Map([[imageAssetId.toString(), landscape]]),
      );

      expect(slide.primaryCta?.isExternal).toBe(true);
    });
  });
});

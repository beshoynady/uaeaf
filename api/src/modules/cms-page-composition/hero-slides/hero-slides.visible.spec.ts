import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Types } from 'mongoose';
import { HeroSlidesService } from './hero-slides.service.js';
import { HeroSlidesRepository } from './hero-slides.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { HERO_TEXT_LIMITS } from './schemas/hero-text.schema.js';
import type { HeroSlideDocument } from './schemas/hero-slides.schema.js';

/**
 * A slide an editor is still writing, and a slide a visitor can see (owner
 * decisions 2026-09-17).
 *
 * The dashboard's save is a publish. So a new slide starts hidden, a hidden
 * slide may be saved half written, and the moment a slide is visible it has to
 * be complete: both titles, both subtitles and a picture. Visible or not, no
 * text may be longer than its field holds at 390px.
 */
describe('HeroSlidesService — hidden drafts and visible slides', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(async () => ({})),
      find: jest.fn(async () => []),
      findById: jest.fn(),
      updateById: jest.fn(async () => ({})),
    }) as unknown as jest.Mocked<HeroSlidesRepository>;

  const makeMedia = () =>
    ({
      assertUsableImage: jest.fn(async () => undefined),
      resolvePublicImages: jest.fn(async () => new Map()),
    }) as unknown as jest.Mocked<MediaAssetsService>;

  const ready = () => {
    const repository = makeRepository();
    return { repository, service: new HeroSlidesService(repository, makeMedia()) };
  };

  const complete = () => ({
    pageSectionId: new Types.ObjectId().toString(),
    mediaType: 'IMAGE' as const,
    imageAssetId: new Types.ObjectId().toString(),
    title: { ar: 'المضمار يبدأ من هنا', en: 'The track starts here' },
    subtitle: { ar: 'اتحاد يقود ألعاب القوى', en: 'The federation that governs athletics' },
    displayOrder: 0,
  });

  it('stores a new slide hidden when the request does not say', async () => {
    const { repository, service } = ready();

    await service.create(complete());

    expect((repository.create.mock.calls[0][0] as { active: boolean }).active).toBe(false);
  });

  it('stores a hidden slide with no text and no picture yet', async () => {
    const { repository, service } = ready();
    const { pageSectionId, displayOrder } = complete();

    await service.create({ pageSectionId, mediaType: 'IMAGE', displayOrder, active: false });

    const written = repository.create.mock.calls[0][0] as { title: unknown; subtitle: unknown; imageAssetId: unknown };
    expect(written.title).toEqual({ ar: '', en: '' });
    expect(written.subtitle).toEqual({ ar: '', en: '' });
    expect(written.imageAssetId).toBeNull();
  });

  it('refuses a visible slide missing any text or its picture, naming every gap', async () => {
    const { repository, service } = ready();
    const { pageSectionId, displayOrder } = complete();

    await expect(
      service.create({
        pageSectionId,
        mediaType: 'IMAGE',
        displayOrder,
        active: true,
        title: { ar: 'عنوان', en: '  ' },
        subtitle: { ar: '', en: 'Subtitle' },
      }),
    ).rejects.toMatchObject({
      response: { code: 'incompleteSlide', missing: ['title.en', 'subtitle.ar', 'imageAssetId'] },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('stores a complete visible slide', async () => {
    const { repository, service } = ready();

    await service.create({ ...complete(), active: true });

    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('refuses showing a stored slide that has no picture, and writes nothing', async () => {
    const { repository, service } = ready();
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      mediaType: 'IMAGE',
      imageAssetId: null,
      videoId: null,
      active: false,
      title: { ar: 'عنوان', en: 'Title' },
      subtitle: { ar: 'نص', en: 'Text' },
      useMobileImage: false,
      mobileImageAssetId: null,
      ltrImageMode: 'mirror',
      ltrImageAssetId: null,
      ltrFocalPoint: null,
      primaryCta: { isVisible: false, label: null, url: null },
      secondaryCta: { isVisible: false, label: null, url: null },
    } as unknown as HeroSlideDocument);

    await expect(service.update('id', { active: true })).rejects.toMatchObject({
      response: { code: 'incompleteSlide', missing: ['imageAssetId'] },
    });
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it.each([
    ['eyebrow', 'ar', HERO_TEXT_LIMITS.eyebrow],
    ['title', 'en', HERO_TEXT_LIMITS.title],
    ['subtitle', 'ar', HERO_TEXT_LIMITS.subtitle],
  ] as const)('refuses a %s.%s longer than it holds at 390, even on a hidden slide', async (field, language, limit) => {
    const { service } = ready();
    const text = { ar: 'ع', en: 'E', [language]: 'x'.repeat(limit + 1) };

    await expect(service.create({ ...complete(), active: false, [field]: text })).rejects.toMatchObject({
      response: { code: 'heroTextTooLong', field: `${field}.${language}`, limit },
    });
  });

  it('counts a character as a reader does, so a text at the limit is stored', async () => {
    const { repository, service } = ready();

    await service.create({ ...complete(), title: { ar: 'ع'.repeat(HERO_TEXT_LIMITS.title), en: 'T' } });

    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('keeps the limits the web and the dashboard count towards, never a copy that drifts', () => {
    const shared = readFileSync(join(process.cwd(), '..', 'packages', 'content', 'hero', 'limits.ts'), 'utf-8');
    for (const [field, limit] of Object.entries(HERO_TEXT_LIMITS)) {
      expect(shared).toMatch(new RegExp(`\\b${field}: ${limit},`));
    }
  });
});

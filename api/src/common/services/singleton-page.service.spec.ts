import 'reflect-metadata';
import { jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { NewsPageService } from '../../modules/cms-page-composition/news-page/news-page.service.js';
import type { NewsPageRepository } from '../../modules/cms-page-composition/news-page/news-page.repository.js';
import type { MediaAssetsService } from '../../modules/media-center/media-assets/media-assets.service.js';
import { UpsertNewsPageDto } from '../../modules/cms-page-composition/news-page/dto/upsert-news-page.dto.js';

/**
 * The singleton pages' `PUT` is a replacement, not a partial update.
 *
 * Unlike a `PATCH` (`wasSent`), an omitted field here means "none": the
 * dashboard removes a page's picture by leaving `heroImageId` out of the body
 * (`readPageBody` drops an unset value), and it always sends every field the
 * page stores. Turning an omission into "keep the stored value" would make a
 * removed picture come back. Pinned here, on one of the pages that share the
 * shape, as the contract both sides rely on (audit of 2026-09-17).
 */
describe('SingletonPageService upsert — a replacement', () => {
  const storedImage = new Types.ObjectId();
  const stored = {
    _id: new Types.ObjectId(),
    heroImageId: storedImage,
    heroTitle: { ar: 'الأخبار', en: 'News' },
    heroSubtitle: { ar: 'آخر الأخبار', en: 'Latest news' },
  };

  const ready = () => {
    const repository = {
      findOne: jest.fn(async () => stored),
      updateById: jest.fn(async (_id: string, update: Record<string, unknown>) => ({ ...stored, ...update })),
      create: jest.fn(),
    } as unknown as jest.Mocked<NewsPageRepository>;
    const media = { assertUsableImage: jest.fn(async () => undefined) } as unknown as MediaAssetsService;
    return { repository, service: new NewsPageService(repository, media) };
  };

  it('clears the picture when the body leaves it out, which is how the dashboard removes it', async () => {
    const { repository, service } = ready();
    const body = plainToInstance(UpsertNewsPageDto, {
      heroTitle: { ar: 'الأخبار', en: 'News' },
      heroSubtitle: { ar: 'جديد', en: 'New' },
    });

    await service.upsert(body);

    expect(repository.updateById.mock.calls[0][1]).toMatchObject({ heroImageId: null, heroSubtitle: { ar: 'جديد', en: 'New' } });
  });

  it('keeps the picture when the body names it again', async () => {
    const { repository, service } = ready();
    const body = plainToInstance(UpsertNewsPageDto, {
      heroImageId: storedImage.toString(),
      heroTitle: { ar: 'الأخبار', en: 'News' },
      heroSubtitle: { ar: 'جديد', en: 'New' },
    });

    await service.upsert(body);

    expect(String((repository.updateById.mock.calls[0][1] as { heroImageId: Types.ObjectId }).heroImageId)).toBe(storedImage.toString());
  });
});

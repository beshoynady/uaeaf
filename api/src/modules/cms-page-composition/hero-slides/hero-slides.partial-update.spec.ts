import 'reflect-metadata';
import { jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { HeroSlidesService } from './hero-slides.service.js';
import { HeroSlidesRepository } from './hero-slides.repository.js';
import { UpdateHeroSlideDto } from './dto/update-hero-slides.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { PageSectionsService } from '../page-sections/page-sections.service.js';
import { PageSectionsRepository } from '../page-sections/page-sections.repository.js';
import { UpdatePageSectionDto } from '../page-sections/dto/update-page-sections.dto.js';

/**
 * A partial update, as the request pipeline actually delivers it.
 *
 * `ValidationPipe({ transform: true })` turns the body into a DTO instance, and
 * with ES2022 class fields every property the class declares is an own property
 * of that instance, `undefined` when the body did not send it. A presence check
 * that asks "is it an own key?" is therefore true for every field, and an update
 * that sends one field is read as clearing all the others. JSON cannot carry
 * `undefined`, so "sent" is "not undefined", and an explicit `null` still clears.
 *
 * Found live on 2026-09-17: the dashboard sent `{ desktopFocalPoint }` for a
 * complete visible slide and the API refused it as missing its titles and
 * picture.
 */
const asDelivered = <T extends object>(dto: new () => T, body: object): T => plainToInstance(dto, body);

describe('HeroSlidesService.update with a delivered DTO', () => {
  const stored = {
    _id: new Types.ObjectId(),
    mediaType: 'IMAGE',
    imageAssetId: new Types.ObjectId(),
    desktopFocalPoint: { x: 50, y: 50 },
    useMobileImage: false,
    mobileImageAssetId: null,
    mobileFocalPoint: { x: 50, y: 50 },
    ltrImageMode: 'mirror',
    ltrImageAssetId: null,
    ltrFocalPoint: null,
    videoId: null,
    eyebrow: { ar: 'سطر', en: 'Line' },
    title: { ar: 'المضمار يبدأ من هنا', en: 'The track starts here' },
    subtitle: { ar: 'اتحاد يقود ألعاب القوى', en: 'The federation' },
    primaryCta: { isVisible: false, label: null, url: null },
    secondaryCta: { isVisible: false, label: null, url: null },
    displayOrder: 0,
    active: true,
    scheduledFrom: new Date('2026-09-01T00:00:00.000Z'),
    scheduledTo: null,
  };

  const ready = () => {
    const repository = {
      findById: jest.fn(async () => stored),
      updateById: jest.fn(async (_id: string, update: Record<string, unknown>) => ({ ...stored, ...update })),
    } as unknown as jest.Mocked<HeroSlidesRepository>;
    const media = {
      assertUsableImage: jest.fn(async () => undefined),
    } as unknown as jest.Mocked<MediaAssetsService>;
    return { repository, service: new HeroSlidesService(repository, media) };
  };

  it('accepts a focal point alone for a complete visible slide, and writes only that', async () => {
    const { repository, service } = ready();

    await service.update(stored._id.toString(), asDelivered(UpdateHeroSlideDto, { desktopFocalPoint: { x: 70, y: 51 } }));

    expect(repository.updateById.mock.calls[0][1]).toEqual({ desktopFocalPoint: { x: 70, y: 51 } });
  });

  it('still clears a field sent as null', async () => {
    const { repository, service } = ready();

    await service.update(stored._id.toString(), asDelivered(UpdateHeroSlideDto, { eyebrow: null, scheduledFrom: null }));

    expect(repository.updateById.mock.calls[0][1]).toEqual({ eyebrow: null, scheduledFrom: null });
  });
});

describe('PageSectionsService.update with a delivered DTO', () => {
  const stored = {
    _id: new Types.ObjectId(),
    sectionType: 'NEWS',
    sectionTitle: { ar: 'الأخبار', en: 'News' },
    ctaUrl: '/news',
    visibleFrom: null,
    visibleUntil: null,
  };

  it('writes the settings alone and leaves the section title and link as stored', async () => {
    const repository = {
      findById: jest.fn(async () => stored),
      updateById: jest.fn(async (_id: string, update: Record<string, unknown>) => ({ ...stored, ...update })),
    } as unknown as jest.Mocked<PageSectionsRepository>;
    const service = new PageSectionsService(repository);

    await service.update(stored._id.toString(), asDelivered(UpdatePageSectionDto, { configuration: { layout: 'grid' } }));

    expect(repository.updateById.mock.calls[0][1]).toEqual({ configuration: { layout: 'grid' } });
  });
});

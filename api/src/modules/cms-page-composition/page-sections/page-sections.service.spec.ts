import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PageSectionsService } from './page-sections.service.js';
import { PageSectionsRepository } from './page-sections.repository.js';

describe('PageSectionsService', () => {
  const makeRepository = () =>
    ({ create: jest.fn(), find: jest.fn() }) as unknown as jest.Mocked<PageSectionsRepository>;

  const pageId = new Types.ObjectId().toString();
  const base = {
    pageId,
    sectionType: 'LATEST_NEWS' as const,
    displayOrder: 1,
    visibility: 'Everyone' as const,
    selectionMode: 'AUTOMATIC' as const,
  };

  describe('create', () => {
    it('rejects an inverted visibility window', async () => {
      const service = new PageSectionsService(makeRepository());

      await expect(
        service.create({ ...base, visibleFrom: '2026-10-01', visibleUntil: '2026-09-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a valid window and converts items to ObjectIds', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new PageSectionsService(repository);

      await service.create({
        ...base,
        selectionMode: 'MANUAL',
        items: [new Types.ObjectId().toString()],
        visibleFrom: '2026-09-01',
        visibleUntil: '2026-10-01',
      });

      const call = repository.create.mock.calls[0][0] as { items: Types.ObjectId[] };
      expect(call.items[0]).toBeInstanceOf(Types.ObjectId);
    });
  });

  describe('findPublicByPage', () => {
    const now = new Date('2026-09-15');

    it('keeps only sections inside their visibility window, in displayOrder', async () => {
      const repository = makeRepository();
      // Minimal but *valid* documents: `findPublicByPage` now maps through
      // `toPublicResponse`, so fixtures need the fields that mapping reads.
      const section = (displayOrder: number, visibleFrom: Date | null, visibleUntil: Date | null) => ({
        _id: new Types.ObjectId(),
        items: [],
        displayOrder,
        visibleFrom,
        visibleUntil,
      });
      repository.find.mockResolvedValue([
        section(2, null, null),
        section(1, new Date('2026-09-01'), new Date('2026-09-30')),
        section(3, new Date('2026-10-01'), null), // not open yet
        section(4, null, new Date('2026-09-10')), // expired
      ] as never);
      const service = new PageSectionsService(repository);

      const result = await service.findPublicByPage(pageId, now);

      expect(result.map((section) => section.displayOrder)).toEqual([1, 2]);
    });

    it('queries only enabled, Everyone-visible sections of that page', async () => {
      const repository = makeRepository();
      repository.find.mockResolvedValue([] as never);
      const service = new PageSectionsService(repository);

      await service.findPublicByPage(pageId, now);

      expect(repository.find).toHaveBeenCalledWith({
        pageId: expect.any(Types.ObjectId),
        enabled: true,
        visibility: 'Everyone',
      });
    });
  });

  describe('toPublicResponse', () => {
    const makeDocument = () =>
      ({
        _id: new Types.ObjectId(),
        pageId: new Types.ObjectId(),
        sectionType: 'HERO',
        sectionTitle: { en: 'Hero', ar: 'الواجهة' },
        sectionSubtitle: null,
        itemLimit: 5,
        ctaText: { en: 'See all', ar: 'عرض الكل' },
        ctaUrl: '/news',
        displayOrder: 1,
        selectionMode: 'MANUAL',
        items: [new Types.ObjectId(), new Types.ObjectId()],
        // Visibility gate — server-side only, must never reach a public reader.
        enabled: true,
        visibility: 'Everyone',
        visibleFrom: new Date('2026-09-01'),
        visibleUntil: new Date('2026-09-30'),
        filters: { tag: 'featured' },
        configuration: { autoplay: true },
        createdBy: new Types.ObjectId(),
        updatedBy: new Types.ObjectId(),
        archivedAt: null,
        archivedBy: null,
      }) as never;

    it('exposes what a renderer needs, with items serialised as strings', () => {
      const service = new PageSectionsService(makeRepository());
      const document = makeDocument() as unknown as { _id: Types.ObjectId; items: Types.ObjectId[] };

      const result = service.toPublicResponse(document as never);

      expect(result).toEqual({
        id: document._id.toString(),
        sectionType: 'HERO',
        sectionTitle: { en: 'Hero', ar: 'الواجهة' },
        sectionSubtitle: null,
        itemLimit: 5,
        ctaText: { en: 'See all', ar: 'عرض الكل' },
        ctaUrl: '/news',
        displayOrder: 1,
        selectionMode: 'MANUAL',
        items: document.items.map((id) => id.toString()),
        configuration: { autoplay: true },
      });
    });

    it('strips the visibility gate, the query filters, and the audit trail', () => {
      const service = new PageSectionsService(makeRepository());

      const result = service.toPublicResponse(makeDocument()) as unknown as Record<string, unknown>;

      // `enabled`/`visibility`/`visibleFrom`/`visibleUntil` already did their
      // job in `findPublicByPage` — a public reader only ever sees sections
      // that passed. `filters` is server-side query config, not display data.
      for (const leaked of [
        'enabled',
        'visibility',
        'visibleFrom',
        'visibleUntil',
        'filters',
        'pageId',
        'createdBy',
        'updatedBy',
        'archivedAt',
        'archivedBy',
        '_id',
      ]) {
        expect(result).not.toHaveProperty(leaked);
      }
    });
  });
});

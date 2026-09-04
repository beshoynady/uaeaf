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
      repository.find.mockResolvedValue([
        { displayOrder: 2, visibleFrom: null, visibleUntil: null },
        { displayOrder: 1, visibleFrom: new Date('2026-09-01'), visibleUntil: new Date('2026-09-30') },
        { displayOrder: 3, visibleFrom: new Date('2026-10-01'), visibleUntil: null }, // not open yet
        { displayOrder: 4, visibleFrom: null, visibleUntil: new Date('2026-09-10') }, // expired
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
});

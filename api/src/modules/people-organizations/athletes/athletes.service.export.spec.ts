import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AthletesService } from './athletes.service.js';
import { AthletesRepository } from './athletes.repository.js';

/**
 * Bulk extraction, behind its own grant.
 *
 * `athletes:Export` is a separate action from `athletes:Read` by owner
 * decision (2026-09-08): reading fifty rows on a screen and pulling every
 * athlete the federation holds into a file that leaves the platform are
 * different decisions, and the approved IA separates them too — Export
 * Centre is its own screen at a lower priority than the registries.
 */
describe('AthletesService.exportCsv', () => {
  let service: AthletesService;
  let repository: jest.Mocked<AthletesRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AthletesService,
        { provide: AthletesRepository, useValue: { find: jest.fn() } },
      ],
    }).compile();

    service = module.get(AthletesService);
    repository = module.get(AthletesRepository);
  });

  it('writes one row per athlete, both languages side by side', async () => {
    repository.find.mockResolvedValue([
      {
        name: { ar: 'أمل الشامسي', en: 'Amal Al Shamsi' },
        dateOfBirth: new Date('2004-03-11T00:00:00.000Z'),
        gender: 'Female',
        residencyType: 'Citizen',
        federationName: null,
      },
    ] as never);

    const csv = await service.exportCsv();

    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('أمل الشامسي,Amal Al Shamsi');
    expect(csv).toContain('2004-03-11T00:00:00.000Z');
    expect(csv).toContain('Female');
  });

  it('exports a header row when the registry is empty', async () => {
    repository.find.mockResolvedValue([] as never);

    const csv = await service.exportCsv();

    expect(csv.replace('﻿', '').split('\r\n')).toHaveLength(1);
  });

  it('reads through the soft-delete-aware find, never a raw scan', async () => {
    // `find()` scopes to `archivedAt: null`. An export that bypassed it
    // would hand out records the platform considers deleted.
    repository.find.mockResolvedValue([] as never);

    await service.exportCsv();

    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith();
  });
});

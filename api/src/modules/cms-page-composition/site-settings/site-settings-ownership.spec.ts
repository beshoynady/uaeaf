import { jest } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import { INTERCEPTORS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Types } from 'mongoose';
import { SiteSettingsController } from './site-settings.controller.js';
import { SiteSettingsService } from './site-settings.service.js';
import { SiteSettingsRepository } from './site-settings.repository.js';
import {
  FIELDS_WRITTEN_ELSEWHERE,
  RefuseFieldsWrittenElsewhereInterceptor,
} from './refuse-fields-written-elsewhere.interceptor.js';

/**
 * Who writes which settings field (ADR-0093). The general save writes only
 * what no screen of its own owns, and the refusal sits on the general route
 * alone: the footer and strip routes are exactly where those fields belong.
 */
describe('site settings field ownership', () => {
  it('writes none of the owned fields on the general save, even if a caller got past the route', async () => {
    const repository = {
      findOne: jest.fn(async () => ({ _id: new Types.ObjectId() })),
      create: jest.fn(async (data: unknown) => data),
      updateById: jest.fn(async (_id: string, data: unknown) => data),
    } as unknown as jest.Mocked<SiteSettingsRepository>;
    const service = new SiteSettingsService(repository, { assertUsableImage: jest.fn() } as never);

    await service.upsert({ isMaintenanceMode: true });

    const written = repository.updateById.mock.calls[0][1] as Record<string, unknown>;
    for (const field of Object.keys(FIELDS_WRITTEN_ELSEWHERE)) {
      expect(written).not.toHaveProperty(field);
    }
    expect(written.isMaintenanceMode).toBe(true);
  });

  it('refuses owned fields on the general route only', () => {
    const interceptorsOn = (handler: keyof SiteSettingsController) =>
      (Reflect.getMetadata(INTERCEPTORS_METADATA, SiteSettingsController.prototype[handler]) ?? []) as unknown[];

    expect(interceptorsOn('upsert')).toContain(RefuseFieldsWrittenElsewhereInterceptor);
    expect(interceptorsOn('upsertFooter')).not.toContain(RefuseFieldsWrittenElsewhereInterceptor);
    expect(interceptorsOn('upsertSponsorStrip')).not.toContain(RefuseFieldsWrittenElsewhereInterceptor);
  });

  it('names, for each owned field, a route this controller actually serves', () => {
    // Read off the controller's own routing metadata, so a renamed route
    // cannot leave the refusal pointing callers at nothing.
    const base = Reflect.getMetadata(PATH_METADATA, SiteSettingsController) as string;
    const served = Object.getOwnPropertyNames(SiteSettingsController.prototype)
      .map((name) => (SiteSettingsController.prototype as unknown as Record<string, object>)[name])
      .filter((handler) => Reflect.getMetadata(METHOD_METADATA, handler) === RequestMethod.PUT)
      .map((handler) => `PUT /${base}${[Reflect.getMetadata(PATH_METADATA, handler)].filter((path) => path && path !== '/').map((path) => `/${path}`).join('')}`);

    for (const route of Object.values(FIELDS_WRITTEN_ELSEWHERE)) {
      expect(served).toContain(route);
    }
  });
});

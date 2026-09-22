import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { RefuseFieldsWrittenElsewhereInterceptor } from './refuse-fields-written-elsewhere.interceptor.js';

/**
 * A settings field with a screen of its own is written by that screen's route
 * and no other (ADR-0093). Sent to the general `PUT /site-settings`, it is
 * refused by name, with the route that does write it — not ignored, so an old
 * caller finds out at once instead of watching its change disappear.
 */
const contextWith = (body: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ body }) }) }) as unknown as ExecutionContext;

const run = (body: unknown) => {
  const handle = jest.fn(() => of('written'));
  const interceptor = new RefuseFieldsWrittenElsewhereInterceptor();
  const outcome = () => interceptor.intercept(contextWith(body), { handle } as CallHandler);
  return { handle, outcome };
};

const refusalOf = (body: unknown) => {
  const { handle, outcome } = run(body);
  try {
    outcome();
  } catch (error) {
    expect(handle).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse() as Record<string, unknown>;
  }
  throw new Error('Expected the request to be refused, but it went through.');
};

describe('RefuseFieldsWrittenElsewhereInterceptor', () => {
  it("refuses a footer field, and names the footer's route", () => {
    const refusal = refusalOf({ copyrightText: { en: '©', ar: '©' }, isMaintenanceMode: false });

    expect(refusal).toMatchObject({
      code: 'writtenElsewhere',
      fields: ['copyrightText'],
      routes: ['PUT /site-settings/footer'],
    });
    expect(refusal.message).toContain('PUT /site-settings/footer');
  });

  it('refuses a field sent as null, since clearing it is writing it', () => {
    expect(refusalOf({ footerAboutBlurb: null })).toMatchObject({ fields: ['footerAboutBlurb'] });
  });

  it('names every field it refuses, and each route once', () => {
    const refusal = refusalOf({ footerHeadings: {}, copyrightText: null, sponsorStrip: {} });

    expect(refusal.fields).toEqual(['copyrightText', 'footerHeadings', 'sponsorStrip']);
    expect(refusal.routes).toEqual(['PUT /site-settings/footer', 'PUT /site-settings/sponsor-strip']);
  });

  it('lets a body with none of them through to validation', () => {
    const { handle, outcome } = run({ isMaintenanceMode: true, maintenanceMessage: { en: 'Back soon', ar: 'نعود قريبًا' } });

    outcome();

    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('leaves a body that is not an object to validation', () => {
    const { handle, outcome } = run(undefined);

    outcome();

    expect(handle).toHaveBeenCalledTimes(1);
  });
});

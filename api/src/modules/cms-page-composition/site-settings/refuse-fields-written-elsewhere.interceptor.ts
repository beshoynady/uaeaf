import { BadRequestException, Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';

/**
 * The settings fields a screen of their own writes, each by the one route that
 * may write it (ADR-0093). One source for a field means one writer, not a
 * second writer that is careful: the footer's words belong to the footer's
 * screen, the strip's settings to the strip's.
 *
 * None of these is on `UpsertSiteSettingsDto`. This list is what lets the
 * general route refuse them by name instead of as "should not exist".
 */
export const FIELDS_WRITTEN_ELSEWHERE: Readonly<Record<string, string>> = {
  footerAboutBlurb: 'PUT /site-settings/footer',
  copyrightText: 'PUT /site-settings/footer',
  footerHeadings: 'PUT /site-settings/footer',
  sponsorStrip: 'PUT /site-settings/sponsor-strip',
};

/**
 * On `PUT /site-settings`: a request carrying any field another route owns is
 * refused whole, naming the fields and the routes that write them. Nothing of
 * it is written — a partial save would apply the rest and hide the part that
 * was wrong.
 *
 * An interceptor and not a pipe, because it has to run first: the global
 * `ValidationPipe` (`forbidNonWhitelisted`) runs before any pipe bound here and
 * would refuse the same fields with only "property … should not exist", which
 * does not tell an old caller where the field went. Interceptors run after the
 * guards, so an unauthorised caller is still told only that.
 */
@Injectable()
export class RefuseFieldsWrittenElsewhereInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const body: unknown = context.switchToHttp().getRequest<{ body?: unknown }>().body;
    // A body that is not an object is the validation pipe's to refuse.
    const fields =
      typeof body === 'object' && body !== null
        ? Object.keys(FIELDS_WRITTEN_ELSEWHERE)
            .filter((field) => Object.hasOwn(body, field))
            .sort()
        : [];
    if (fields.length > 0) {
      const routes = [...new Set(fields.map((field) => FIELDS_WRITTEN_ELSEWHERE[field]))];
      throw new BadRequestException({
        code: 'writtenElsewhere',
        message: `${fields.join(', ')} ${fields.length === 1 ? 'is' : 'are'} written through ${routes.join(' and ')}, not PUT /site-settings. Nothing was saved.`,
        fields,
        routes,
      });
    }
    return next.handle();
  }
}

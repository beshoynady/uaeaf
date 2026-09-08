import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX } from '../../../src/common/constants/api-versioning.constant.js';
import { ApiExceptionFilter } from '../../../src/common/filters/api-exception.filter.js';

/** Mirrors main.ts's bootstrap (global prefix, URI versioning, validation
 *  pipe, exception filter). e2e specs build their INestApplication directly
 *  from AppModule and never run main.ts's bootstrap(), so each one must apply
 *  the same setup itself -- centralized here instead of duplicated per file,
 *  so a future API version bump only means editing the shared constant.
 *
 *  Anything main.ts applies globally belongs here too. The filter was missing
 *  until 2026-09-08, so every e2e spec was exercising an application whose
 *  error responses did not match the deployed one: no `code` on a refusal
 *  that named none, and a duplicate key or malformed id surfacing as a 500
 *  instead of a 409 or a 400. */
export function configureTestApp(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX, { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_DEFAULT_VERSION });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
}

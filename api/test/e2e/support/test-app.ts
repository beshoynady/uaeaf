import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX } from '../../../src/common/constants/api-versioning.constant.js';

/** Mirrors main.ts's bootstrap (global prefix, URI versioning, validation
 *  pipe). e2e specs build their INestApplication directly from AppModule
 *  and never run main.ts's bootstrap(), so each one must apply the same
 *  routing setup itself -- centralized here instead of duplicated per
 *  file, so a future API version bump only means editing the shared
 *  constant (UAEAF api/v1 prefix rollout, 2026-09-06). */
export function configureTestApp(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX, { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_DEFAULT_VERSION });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
}

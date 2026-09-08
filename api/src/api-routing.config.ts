import { RequestMethod, VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX } from './common/constants/api-versioning.constant.js';

/** Applies the global prefix + URI versioning scheme shared by the live app
 *  (`main.ts`) and the `openapi.json` generator (`generate-openapi.ts`) — a
 *  bug found and fixed 2026-09-07: the generator originally called
 *  `NestFactory.create(AppModule)` directly without this, so every path in
 *  the generated document was missing `/api/v1` even though the real,
 *  running server correctly serves it there. Extracted so the live app and
 *  the generated snapshot can never silently apply different routing
 *  config and diverge again — the exact class of bug this whole
 *  generator/hook exists to prevent for the document's *content*, now
 *  applied to its *routing* too.
 *
 *  `/health` is excluded from the prefix (and marked `VERSION_NEUTRAL` on
 *  the controller) because it's an uptime-monitoring endpoint, not a
 *  versioned API route — infra shouldn't have to track API version bumps
 *  just to keep probing it. */
export function configureApiRouting(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX, { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_DEFAULT_VERSION });
}

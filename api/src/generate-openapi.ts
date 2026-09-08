import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApiRouting } from './api-routing.config.js';
import { buildSwaggerDocument } from './swagger.config.js';

/** Regenerates the committed `api/openapi.json` snapshot from the live
 *  decorator metadata — the exact document `main.ts` serves at
 *  `/api/docs-json`, just written to disk instead of over HTTP.
 *
 *  Root cause this exists to fix (2026-09-07): before this script, nothing
 *  in the repo ever wrote this file — `main.ts` only ever served the
 *  document live, in-memory, per request. The committed `openapi.json` had
 *  been created once by hand and never touched again, so it silently drifted
 *  down to containing only `/health` while the real API grew to 150+ paths.
 *  There is also no CI in this repo yet to catch that drift automatically
 *  (no `.github/workflows` at all) — see the audit note this session added
 *  for the proposed CI/git-hook gate. Until that exists, this script is the
 *  one-command replacement for "hand-craft the file again": run it after any
 *  controller/DTO change and commit the resulting diff.
 *
 *  Boots the full app (so it needs a reachable `MONGODB_URI` — local or
 *  Atlas; no data is read or written) but never calls `.listen()`.
 *
 *  MUST call `configureApiRouting()` before building the document — found
 *  the hard way (2026-09-07, verifying this very script's own output): the
 *  first version of this file skipped it, so every generated path was
 *  missing `/api/v1` even though the real server correctly serves it
 *  there. `main.ts` shares the same function so the two can't diverge. */
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApiRouting(app);
  const document = buildSwaggerDocument(app);
  const outPath = new URL('../openapi.json', import.meta.url);
  writeFileSync(outPath, JSON.stringify(document, null, 2) + '\n');
  await app.close();
  // eslint-disable-next-line no-console
  console.log(`openapi.json regenerated: ${Object.keys(document.paths).length} paths.`);
}

await main();

import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { UPS_PROVISIONAL_WINDOW, seedSponsorRelations } from './bootstrap/seed-sponsor-relations.js';
import { MediaAssetsService } from './modules/media-center/media-assets/media-assets.service.js';
import { STORAGE_FOLDERS } from './modules/media-center/storage/storage-provider.js';
import { Sponsor } from './modules/sponsorship-relations/sponsors/schemas/sponsor.schema.js';
import { Sponsorship } from './modules/sponsorship-relations/sponsorships/schemas/sponsorship.schema.js';
import { Partnership } from './modules/sponsorship-relations/partnerships/schemas/partnership.schema.js';
import { Membership } from './modules/sponsorship-relations/memberships/schemas/membership.schema.js';
import { Page } from './modules/cms-page-composition/pages/schemas/pages.schema.js';
import { PageSection } from './modules/cms-page-composition/page-sections/schemas/page-sections.schema.js';

/**
 * Seeds the federation's real sponsor and the demo partners, memberships and
 * sponsors (ADR-0085 D2) into the local development database.
 *
 *   npm run seed:sponsors
 *
 * Built with `tsc` into `dist-seed/`, never `nest build`: `nest build` deletes
 * `dist/` and stops a running `start:dev` (owner decision 2026-09-17).
 * Uploads each logo through `MediaAssetsService`, the dashboard's own path.
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 * Requires MONGODB_URI and the Cloudinary credentials in `api/.env`.
 */
const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[seed:sponsors] ${message}`);
};

const main = async (): Promise<void> => {
  // Checked before Nest opens a connection, and again inside the seed.
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'], abortOnError: false });
  try {
    const media = app.get(MediaAssetsService);
    const model = (name: string) => app.get<Model<any>>(getModelToken(name));

    const report = await seedSponsorRelations({
      env: process.env,
      models: {
        sponsors: model(Sponsor.name),
        sponsorships: model(Sponsorship.name),
        partnerships: model(Partnership.name),
        memberships: model(Membership.name),
        pages: model(Page.name),
        pageSections: model(PageSection.name),
      },
      upload: async (file, altText) => {
        const buffer = await readFile(file);
        const asset = await media.uploadAndCreate(
          { buffer, size: buffer.length, originalname: basename(file) },
          { caption: altText, altText, isAiGenerated: false },
          STORAGE_FOLDERS.pages,
        );
        log(`uploaded ${basename(file)}`);
        return asset._id;
      },
    });

    log(`inserted ${report.inserted} · kept ${report.kept} · homepage sections: ${report.sections}`);
    if (UPS_PROVISIONAL_WINDOW.provisional) {
      log('PROVISIONAL: the real sponsor\'s dates (2026-09-01 → 2027-08-31, Dubai) are placeholders for the contract dates.');
    }
  } finally {
    await app.close();
  }
};

try {
  await main();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[seed:sponsors] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

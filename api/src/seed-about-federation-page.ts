import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { ABOUT_SEED } from './bootstrap/about-federation-seed-content.js';
import { AboutFederationPage } from './modules/federation-governance/about-federation-page/schemas/about-federation-page.schema.js';

/**
 * Seeds the About page's approved first content into the local development
 * database.
 *
 *   npm run seed:about
 *
 * Built with `tsc` into `dist-seed/`, never `nest build`: `nest build` deletes
 * `dist/` and stops a running `start:dev` (owner decision 2026-09-17).
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 *
 * Idempotent, and specifically *not* an overwrite: a second run leaves an
 * existing row exactly as it is. The row is what an editor works in, and a
 * seed that reset it would throw away a morning's writing for anyone who ran
 * it twice. Re-seeding from scratch is deleting the row first, deliberately.
 *
 * The page is seeded switched off. Its English is a draft translation and its
 * picture slots are empty; the owner reviews both in the dashboard and
 * switches the page on there.
 */
const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[seed:about] ${message}`);
};

const main = async (): Promise<void> => {
  // Checked before Nest opens a connection.
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const model = app.get<Model<{ _id: Types.ObjectId }>>(getModelToken(AboutFederationPage.name));

    const existing = await model.findOne({ archivedAt: null }).exec();
    if (existing) {
      log(`An About page row already exists (${existing._id.toString()}); leaving it untouched.`);
      return;
    }

    const created = await model.create({
      ...ABOUT_SEED,
      isActive: false,
      publicationState: 'Draft',
    } as unknown as { _id: Types.ObjectId });

    log(`Created the About page row ${created._id.toString()}, switched off, in Draft.`);
    log('Next: review the English, add the pictures, submit for approval, then switch the page on.');
  } finally {
    await app.close();
  }
};

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[seed:about] failed:', error);
  process.exitCode = 1;
});

import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { seedDirectoryDemo } from './bootstrap/seed-directory-dev.js';
import { seedSeasonsAndEventsDemo } from './bootstrap/seed-seasons-events-dev.js';
import { Club } from './modules/people-organizations/clubs/schemas/club.schema.js';
import { Coach } from './modules/people-organizations/coaches/schemas/coach.schema.js';
import { Athlete } from './modules/people-organizations/athletes/schemas/athlete.schema.js';
import { AthleteProfile } from './modules/people-organizations/athlete-profiles/schemas/athlete-profile.schema.js';

/**
 * Fills the local development database with a directory: six clubs, four
 * coaches, ten athletes with public profiles, and — where their modules are
 * registered — three seasons and eight public events.
 *
 *   npm run seed:directory:dev
 *
 * Local only, and it says which database before it writes anything. Built
 * with `tsc` into `dist-seed/`, never `nest build` — the same reason every
 * other seed here is (owner decision 2026-09-17): `nest build` deletes
 * `dist/` and stops a running `start:dev`.
 */

const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[seed:directory] ${message}`);
};

/** `getModelToken` throws when nothing provides it — true today for
 *  `Season`/`PublicEvent`, whose modules are not yet part of `AppModule`. */
const optionalModel = <T = Record<string, unknown>>(
  app: INestApplicationContext,
  name: string,
): Model<T> | null => {
  try {
    return app.get(getModelToken(name));
  } catch {
    return null;
  }
};

const run = async (): Promise<void> => {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const clubs = app.get<Model<Club>>(getModelToken(Club.name));
    log(`database: ${clubs.db.name}`);

    const directoryReport = await seedDirectoryDemo({
      clubs: app.get(getModelToken(Club.name)),
      coaches: app.get(getModelToken(Coach.name)),
      athletes: app.get(getModelToken(Athlete.name)),
      athleteProfiles: app.get(getModelToken(AthleteProfile.name)),
    });
    log(
      `clubs: ${directoryReport.clubs.created} created, ${directoryReport.clubs.existing} already there`,
    );
    log(
      `coaches: ${directoryReport.coaches.created} created, ${directoryReport.coaches.existing} already there`,
    );
    log(
      `athletes: ${directoryReport.athletes.created} created, ${directoryReport.athletes.existing} already there`,
    );
    log(
      `athleteProfiles: ${directoryReport.athleteProfiles.created} created, ` +
        `${directoryReport.athleteProfiles.existing} already there`,
    );

    const seasonsModel = optionalModel(app, 'Season');
    const publicEventsModel = optionalModel(app, 'PublicEvent');

    const seasonsEventsReport = await seedSeasonsAndEventsDemo(
      { seasons: seasonsModel, publicEvents: publicEventsModel },
      new Date(),
    );

    if (seasonsEventsReport.seasons.skipped) {
      log('seasons: skipped — no Season model is registered in AppModule yet');
    } else {
      log(
        `seasons: ${seasonsEventsReport.seasons.created} created, ` +
          `${seasonsEventsReport.seasons.existing} already there`,
      );
    }

    if (seasonsEventsReport.publicEvents.skipped) {
      log('publicEvents: skipped — no PublicEvent model is registered in AppModule yet');
    } else {
      log(
        `publicEvents: ${seasonsEventsReport.publicEvents.created} created, ` +
          `${seasonsEventsReport.publicEvents.existing} already there`,
      );
    }
  } finally {
    await app.close();
  }
};

try {
  await run();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[seed:directory] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

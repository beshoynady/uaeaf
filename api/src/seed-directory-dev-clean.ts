import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { cleanDirectoryDemo } from './bootstrap/seed-directory-dev.js';
import { cleanSeasonsAndEventsDemo } from './bootstrap/seed-seasons-events-dev.js';
import { Club } from './modules/people-organizations/clubs/schemas/club.schema.js';
import { Coach } from './modules/people-organizations/coaches/schemas/coach.schema.js';
import { Athlete } from './modules/people-organizations/athletes/schemas/athlete.schema.js';
import { AthleteProfile } from './modules/people-organizations/athlete-profiles/schemas/athlete-profile.schema.js';

/**
 * Removes everything `npm run seed:directory:dev` created.
 *
 *   npm run seed:directory:dev:clean
 *
 * Local only, by the same guard as the seed. Matches the `demo-` slug prefix
 * (clubs, coaches, athlete profiles, and seasons/public events where those
 * models exist) or the exact seeded name pair (athletes, which carry no
 * slug) — nothing a real record could satisfy by accident.
 */

const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[seed:directory:clean] ${message}`);
};

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

    const directoryResult = await cleanDirectoryDemo({
      clubs: app.get(getModelToken(Club.name)),
      coaches: app.get(getModelToken(Coach.name)),
      athletes: app.get(getModelToken(Athlete.name)),
      athleteProfiles: app.get(getModelToken(AthleteProfile.name)),
    });
    log(
      `removed ${directoryResult.clubs} clubs, ${directoryResult.coaches} coaches, ` +
        `${directoryResult.athletes} athletes, ${directoryResult.athleteProfiles} athlete profiles`,
    );

    const seasonsEventsResult = await cleanSeasonsAndEventsDemo({
      seasons: optionalModel(app, 'Season'),
      publicEvents: optionalModel(app, 'PublicEvent'),
    });
    log(
      seasonsEventsResult.seasons === null
        ? 'seasons: skipped — no Season model is registered in AppModule'
        : `removed ${seasonsEventsResult.seasons} seasons`,
    );
    log(
      seasonsEventsResult.publicEvents === null
        ? 'publicEvents: skipped — no PublicEvent model is registered in AppModule'
        : `removed ${seasonsEventsResult.publicEvents} public events`,
    );
  } finally {
    await app.close();
  }
};

try {
  await run();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[seed:directory:clean] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

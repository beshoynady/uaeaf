import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { cleanAlbumsDev } from './bootstrap/seed-albums-dev.js';
import { Album } from './modules/media-center/albums/schemas/album.schema.js';
import { MediaAsset } from './modules/media-center/media-assets/schemas/media-asset.schema.js';
import { Athlete } from './modules/people-organizations/athletes/schemas/athlete.schema.js';
import { Club } from './modules/people-organizations/clubs/schemas/club.schema.js';
import { STORAGE_PROVIDER, type StorageProvider } from './modules/media-center/storage/storage-provider.js';

/**
 * Removes everything `npm run seed:albums:dev` created.
 *
 *   npm run seed:albums:dev:clean
 *
 * Local only, by the same guard as the seed. Matches the `dev-seed-` slug
 * prefix and the seed's own athlete names, so nothing an editor made by hand
 * is caught by it.
 *
 * ── Which stored objects it destroys ──────────────────────────────────────
 *
 * Only the ones under the seed's own folder. When the seed reused assets the
 * local media library already held — which it does while the photo manifest is
 * empty — those objects belong to the library, and destroying them would take
 * images out from under pages that still use them. Their records are removed
 * from the albums; the files stay.
 */

const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[seed:albums:clean] ${message}`);
};

/** The folder the seed uploads into. Only a key inside it is the seed's to
 *  destroy. */
const SEED_FOLDER = 'dev-seed/albums';

const run = async (): Promise<void> => {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const albums = app.get<Model<Album>>(getModelToken(Album.name));
    log(`database: ${albums.db.name}`);

    const result = await cleanAlbumsDev({
      albums: app.get(getModelToken(Album.name)),
      mediaAssets: app.get(getModelToken(MediaAsset.name)),
      athletes: app.get(getModelToken(Athlete.name)),
      clubs: app.get(getModelToken(Club.name)),
    });

    const ours = result.storageKeys.filter((key) => key.includes(SEED_FOLDER));
    const borrowed = result.storageKeys.length - ours.length;

    const storage = app.get<StorageProvider>(STORAGE_PROVIDER);
    for (const key of ours) {
      // A provider failure on one object must not abandon the rest: the
      // records are already gone, so a key left behind is quota, not
      // corruption, and it is reported rather than thrown over.
      try {
        await storage.destroy(key);
      } catch (error) {
        log(`could not destroy ${key}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    log(
      `removed ${result.albums} albums, ${result.photos} photos, ${result.athletes} athletes, ` +
        `${result.clubs} clubs; destroyed ${ours.length} stored objects` +
        (borrowed > 0 ? `; left ${borrowed} belonging to the media library untouched.` : '.'),
    );
  } finally {
    await app.close();
  }
};

try {
  await run();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[seed:albums:clean] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

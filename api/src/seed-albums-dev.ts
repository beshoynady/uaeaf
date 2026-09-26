import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { seedAlbumsDev, type SeedPhotoSource } from './bootstrap/seed-albums-dev.js';
import { Album } from './modules/media-center/albums/schemas/album.schema.js';
import { MediaAsset } from './modules/media-center/media-assets/schemas/media-asset.schema.js';
import { Athlete } from './modules/people-organizations/athletes/schemas/athlete.schema.js';
import { Club } from './modules/people-organizations/clubs/schemas/club.schema.js';
import { STORAGE_PROVIDER, STORAGE_FOLDERS, type StorageProvider } from './modules/media-center/storage/storage-provider.js';

/**
 * Fills the local development database with a photo gallery.
 *
 *   npm run seed:albums:dev
 *
 * Local only, and it says which database before it writes anything. Twelve
 * albums, eight athletes and five clubs, so every filter the gallery can draw
 * today has something to draw.
 *
 * ── Where the photographs come from ───────────────────────────────────────
 *
 * From `bootstrap/dev-seed-photos.json` when it lists any, uploaded once each
 * through the storage provider the application already uses.
 *
 * That file is empty as shipped, and deliberately so: every entry has to name
 * the photographer, because `MediaFile.photographer` is shown to a visitor as
 * a credit and a credit naming the wrong person is worse than no picture —
 * and a photographer's name cannot be derived from an image URL.
 *
 * While it is empty the seed reuses the media assets already in the local
 * database, and says so. Those are existing library images, not photographs
 * anyone took, so they are attached with no credit rather than a made-up one.
 */

const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[seed:albums] ${message}`);
};

interface PhotoManifestEntry {
  url: string;
  photographer: string;
  source: string;
}

const readManifest = (): PhotoManifestEntry[] => {
  // Read from the source tree, not from `dist-seed` beside the compiled file:
  // the list is something an operator edits, and having to rebuild before a
  // new photograph is picked up is a step nobody would remember.
  const path = resolve(process.cwd(), 'src/bootstrap/dev-seed-photos.json');
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as { photos?: PhotoManifestEntry[] };
    return parsed.photos ?? [];
  } catch {
    // A missing or unreadable manifest is the ordinary case, not a failure:
    // the seed has a working fallback and says which one it took.
    return [];
  }
};

/** Downloads each listed photograph and stores it, once. */
const uploadManifest = async (
  entries: PhotoManifestEntry[],
  storage: StorageProvider,
): Promise<SeedPhotoSource[]> => {
  const sources: SeedPhotoSource[] = [];
  for (const [index, entry] of entries.entries()) {
    const response = await fetch(entry.url);
    if (!response.ok) {
      throw new Error(`Could not download ${entry.url} (HTTP ${response.status}).`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const stored = await storage.upload({
      buffer,
      folder: `${STORAGE_FOLDERS.library}/dev-seed/albums`,
      originalName: `dev-seed-${index + 1}.jpg`,
    });
    sources.push({
      url: stored.url,
      storageKey: stored.storageKey,
      width: stored.width,
      height: stored.height,
      mimeType: stored.mimeType,
      size: stored.bytes,
      photographer: entry.photographer,
    });
    log(`uploaded ${index + 1}/${entries.length} (${entry.photographer})`);
  }
  return sources;
};

/** Reuses what the local media library already holds. No credit is attached:
 *  these are not photographs anyone took, and an invented name would outlive
 *  the seed that wrote it. */
const reuseLocalAssets = async (mediaAssets: Model<MediaAsset>): Promise<SeedPhotoSource[]> => {
  const existing = await mediaAssets.find({ archivedAt: null }).limit(30).lean().exec();
  return existing.map((asset) => {
    const file = asset.file as unknown as {
      url: string; storageKey: string; width: number; height: number; mimeType: string; size: number;
    };
    return {
      url: file.url,
      storageKey: file.storageKey,
      width: file.width,
      height: file.height,
      mimeType: file.mimeType,
      size: file.size,
      photographer: null,
    };
  });
};

const run = async (): Promise<void> => {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const connection = app.get<Model<Album>>(getModelToken(Album.name)).db;
    log(`database: ${connection.name}`);

    const mediaAssets = app.get<Model<MediaAsset>>(getModelToken(MediaAsset.name));

    const manifest = readManifest();
    let sources: SeedPhotoSource[];
    if (manifest.length > 0) {
      log(`uploading ${manifest.length} credited photographs`);
      sources = await uploadManifest(manifest, app.get<StorageProvider>(STORAGE_PROVIDER));
    } else {
      sources = await reuseLocalAssets(mediaAssets);
      log(
        `dev-seed-photos.json lists none, so reusing ${sources.length} existing local media assets. ` +
          'They carry no photographer credit, because they are not photographs anyone took.',
      );
    }

    if (sources.length === 0) {
      throw new Error(
        'Nothing to fill the albums with: dev-seed-photos.json is empty and the local media library holds no assets.',
      );
    }

    const result = await seedAlbumsDev(
      {
        albums: app.get(getModelToken(Album.name)),
        mediaAssets: app.get(getModelToken(MediaAsset.name)),
        athletes: app.get(getModelToken(Athlete.name)),
        clubs: app.get(getModelToken(Club.name)),
      },
      sources,
    );

    log(
      `created ${result.albums} albums, ${result.photos} photos, ${result.athletes} athletes, ` +
        `${result.clubs} clubs; skipped ${result.skipped} albums that already existed.`,
    );
  } finally {
    await app.close();
  }
};

try {
  await run();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[seed:albums] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

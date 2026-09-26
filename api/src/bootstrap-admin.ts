import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { Page } from './modules/cms-page-composition/pages/schemas/pages.schema.js';
import { PageSection } from './modules/cms-page-composition/page-sections/schemas/page-sections.schema.js';
import { Permission } from './modules/platform-administration/permissions/schemas/permission.schema.js';
import { Role } from './modules/platform-administration/roles/schemas/role.schema.js';
import { User } from './modules/platform-administration/users/schemas/user.schema.js';
import { readBootstrapAdminInput, runBootstrap } from './bootstrap/seed-admin.js';
import { seedVideoSection, type VideoSectionSeedResult } from './bootstrap/seed-video-section.js';
import {
  seedPhotoGallerySection,
  type PhotoGallerySectionSeedResult,
} from './bootstrap/seed-photo-gallery-section.js';

/** What the operator reads for each outcome of the video-section seed. */
const VIDEO_SECTION_REPORT: Record<VideoSectionSeedResult, string> = {
  created: 'homepage VIDEO_LIBRARY section created',
  exists: 'homepage VIDEO_LIBRARY section already existed (left untouched)',
  noHomepage: 'no homepage page row yet, so no VIDEO_LIBRARY section was created',
};

/** The same three outcomes, for the albums section. */
const PHOTO_GALLERY_REPORT: Record<PhotoGallerySectionSeedResult, string> = {
  created: 'homepage PHOTO_GALLERY section created',
  exists: 'homepage PHOTO_GALLERY section already existed (left untouched)',
  noHomepage: 'no homepage page row yet, so no PHOTO_GALLERY section was created',
};

const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[bootstrap] ${message}`);
};

/**
 * Creates the first administrator, and the permissions and role that
 * administrator needs to exist at all.
 *
 * WHY THIS SCRIPT HAS TO EXIST
 * Every write route is behind `@RequirePermission`, and `JwtAuthGuard` and
 * `PermissionsGuard` are registered globally. So creating a user requires
 * the `users:Create` permission, and holding any permission requires a
 * user. On an empty database that is a closed loop: no sequence of API
 * calls produces the first account. Something outside the API has to break
 * it exactly once, and this is that thing.
 *
 * This file is deliberately thin -- it reads the environment, opens a Nest
 * context for the Mongoose models, and delegates. All the behaviour worth
 * testing lives in `bootstrap/seed-admin.ts`, which `seed-admin.spec.ts`
 * exercises against a real MongoDB, including the second run.
 *
 * Run with:  npm run bootstrap:admin
 * Requires:  MONGODB_URI, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD
 * Optional:  BOOTSTRAP_ADMIN_NAME_EN, BOOTSTRAP_ADMIN_NAME_AR
 */
const main = async (): Promise<void> => {
  const admin = readBootstrapAdminInput(process.env);

  // `abortOnError: false` matters more than it looks: Nest's default is to
  // log the failure and call `process.exit(1)` itself. Combined with a muted
  // logger that produces a silent exit 1 -- found while verifying this very
  // script, which failed with no output at all until this was set. Letting
  // the error propagate is what lets the catch at the bottom of this file
  // say what actually went wrong.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const result = await runBootstrap(
      {
        permissions: app.get<Model<Permission>>(getModelToken(Permission.name)),
        roles: app.get<Model<Role>>(getModelToken(Role.name)),
        users: app.get<Model<User>>(getModelToken(User.name)),
      },
      admin,
    );

    log(`permissions in catalogue: ${result.permissionCount}`);
    log(`Super Admin role: ${result.roleId.toString()}`);
    log(
      result.userCreated
        ? `administrator created: ${admin.email}`
        : `administrator already existed: ${admin.email} (left untouched)`,
    );

    // The homepage's composed sections. Both create-if-absent, so re-running a
    // deploy never resets settings an editor has since changed.
    const models = {
      pages: app.get<Model<Page>>(getModelToken(Page.name)),
      pageSections: app.get<Model<PageSection>>(getModelToken(PageSection.name)),
    };

    const videoSection = await seedVideoSection(models);
    log(VIDEO_SECTION_REPORT[videoSection]);

    const photoGallery = await seedPhotoGallerySection(models);
    log(PHOTO_GALLERY_REPORT[photoGallery]);
  } finally {
    await app.close();
  }
};

/** Reports the failure explicitly rather than relying on Node's top-level
 *  rejection output -- this runs on a server, often through a deploy step
 *  that only surfaces stdout/stderr, and a silent exit 1 tells an operator
 *  nothing about which environment variable is missing. */
try {
  await main();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[bootstrap] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

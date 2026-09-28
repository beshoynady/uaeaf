import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { seedRoleTemplates } from './bootstrap/seed-role-templates.js';

// Seeds the templates as ordinary, editable roles; runs after `reset:roles`. See ADR-0113 D1.
// Built with `tsc` into `dist-seed/`, never `nest build`, which deletes `dist/` and stops a running API.
// Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[seed:role-templates] ${message}`);
};

const main = async (): Promise<void> => {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const model = <T>(name: string) => app.get<Model<T>>(getModelToken(name));
    const report = await seedRoleTemplates({ permissions: model('Permission'), roles: model('Role') });

    if (report.unresolvedPairs.length > 0) {
      log(`Nothing written. Pairs with no permission row: ${report.unresolvedPairs.join(', ')}`);
      log('Run `npm run sync:permissions` first.');
      process.exitCode = 1;
    } else {
      log(`created: ${report.created.join(', ') || 'none'}`);
      log(`untouched: ${report.untouched.join(', ') || 'none'}`);
    }
    for (const { key, reason } of report.refused) {
      log(`refused ${key}: ${reason}`);
    }
  } finally {
    await app.close();
  }
};

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[seed:role-templates] failed:', error);
  process.exitCode = 1;
});

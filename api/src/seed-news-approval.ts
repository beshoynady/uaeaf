import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { seedNewsApproval, type ApprovalMode } from './bootstrap/seed-news-approval.js';
import { WorkflowDefinition } from './modules/workflow/workflow-definitions/schemas/workflow-definition.schema.js';
import { WorkflowStep } from './modules/workflow/workflow-steps/schemas/workflow-step.schema.js';
import { WorkflowPolicy } from './modules/workflow/workflow-policies/schemas/workflow-policy.schema.js';
import { User } from './modules/platform-administration/users/schemas/user.schema.js';

/**
 * Configures the articles approval policy on the local development database.
 *
 *   npm run seed:news-approval                       # any one approver, the admin
 *   npm run seed:news-approval -- --mode=ALL         # every approver must approve
 *   npm run seed:news-approval -- --mode=SEQUENTIAL  # in the order listed
 *   npm run seed:news-approval -- --threshold=2      # with --mode=THRESHOLD
 *
 * Built with `tsc` into `dist-seed/`, never `nest build`: `nest build` deletes
 * `dist/` and stops a running `start:dev` (owner decision 2026-09-17).
 * Refuses `NODE_ENV=production` and any `MONGODB_URI` that is not this machine.
 *
 * The approvers default to every active administrator the database has. The
 * dashboard's policy screen does the same thing through the API; this exists
 * so a fresh development database can publish a news item before that screen
 * is built.
 */
const log = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

const readMode = (argv: readonly string[]): { mode: ApprovalMode; threshold: number } => {
  const valueOf = (flag: string): string | undefined =>
    argv.find((arg) => arg.startsWith(`--${flag}=`))?.split('=')[1];

  const mode = (valueOf('mode') ?? 'THRESHOLD').toUpperCase();
  if (mode !== 'ALL' && mode !== 'THRESHOLD' && mode !== 'SEQUENTIAL') {
    throw new Error(`--mode must be ALL, THRESHOLD or SEQUENTIAL; got "${mode}".`);
  }

  const raw = valueOf('threshold');
  const threshold = raw === undefined ? 1 : Number(raw);
  if (!Number.isInteger(threshold) || threshold < 1) {
    throw new Error(`--threshold must be a whole number of 1 or more; got "${raw}".`);
  }

  return { mode, threshold };
};

const main = async (): Promise<void> => {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);
  const { mode, threshold } = readMode(process.argv.slice(2));

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const users = app.get<Model<Record<string, unknown>>>(getModelToken(User.name));
    const approvers = await users
      .find({ status: 'Active', archivedAt: null })
      .select('_id email')
      .lean<{ _id: Types.ObjectId; email: string }[]>();

    if (approvers.length === 0) {
      throw new Error('No active user to approve anything. Run `npm run bootstrap:admin` first.');
    }

    const report = await seedNewsApproval(
      {
        workflowDefinitions: app.get(getModelToken(WorkflowDefinition.name)),
        workflowSteps: app.get(getModelToken(WorkflowStep.name)),
        workflowPolicies: app.get(getModelToken(WorkflowPolicy.name)),
      },
      approvers.map((user) => user._id),
      mode,
      threshold,
    );

    log(`approvers:  ${approvers.map((user) => user.email).join(', ')}`);
    log(`mode:       ${mode}${mode === 'THRESHOLD' ? ` (${threshold} of ${approvers.length})` : ''}`);
    log(`definition: ${report.definition}`);
    log(`steps:      ${report.steps}`);
    log(`policy:     ${report.policy}`);
  } finally {
    await app.close();
  }
};

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

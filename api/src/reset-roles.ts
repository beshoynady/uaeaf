import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { resetRoles } from './bootstrap/reset-roles.js';
import { Role } from './modules/platform-administration/roles/schemas/role.schema.js';
import { User } from './modules/platform-administration/users/schemas/user.schema.js';
import { WorkflowStep } from './modules/workflow/workflow-steps/schemas/workflow-step.schema.js';
import { WorkflowInstance } from './modules/workflow/workflow-instances/schemas/workflow-instance.schema.js';
import { AuditLogsService } from './modules/workflow/audit-logs/audit-logs.service.js';

// Runs after `report:reserved-pair-holders`, whose report is meaningless once roles are archived, and before
// `seed:role-templates`. See ADR-0113. Built with `tsc` into `dist-seed/`, never `nest build`.
// Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.

const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(message);
};

const main = async (): Promise<void> => {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const model = <T>(name: string) => app.get<Model<T>>(getModelToken(name));
    const report = await resetRoles({
      roles: model<Role>(Role.name),
      users: model<User>(User.name),
      workflowSteps: model<WorkflowStep>(WorkflowStep.name),
      workflowInstances: model<WorkflowInstance>(WorkflowInstance.name),
      auditLogs: app.get(AuditLogsService),
    });

    log(`Roles archived (${report.archivedRoles.length}):`);
    for (const role of report.archivedRoles) {
      log(`  - ${role.name.en} / ${role.name.ar} (${role.id})`);
    }

    log(`Accounts detached from a non-system role: ${report.detachedFrom}`);

    log(`Accounts with no live role (${report.rolelessAccounts.length}):`);
    for (const account of report.rolelessAccounts) {
      log(`  - ${account.email} — ${account.name.en} / ${account.name.ar} (${account.id})`);
    }

    log(`Open workflow steps with an assignee who can no longer act (${report.blockedSteps.length}):`);
    for (const step of report.blockedSteps) {
      log(
        `  - definition ${step.definitionId}, step ${step.stepId}: ${step.openInstanceCount} open instance(s); ` +
          `assignees unable to act: ${step.assigneeIds.join(', ')}` +
          (step.unsatisfiable ? ' [CANNOT COMPLETE]' : ''),
      );
    }
  } finally {
    await app.close();
  }
};

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(`[reset-roles] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

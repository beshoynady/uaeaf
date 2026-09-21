import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { DEMO_ARTICLES, DEMO_PEOPLE, seedNewsroomDemo } from './bootstrap/seed-newsroom-demo.js';
import { backfillArticleCategory } from './bootstrap/backfill-article-category.js';
import { seedNewsApproval } from './bootstrap/seed-news-approval.js';
import { Article } from './modules/public-communication/articles/schemas/article.schema.js';
import { User } from './modules/platform-administration/users/schemas/user.schema.js';
import { Role } from './modules/platform-administration/roles/schemas/role.schema.js';
import { Permission } from './modules/platform-administration/permissions/schemas/permission.schema.js';
import { WorkflowDefinition } from './modules/workflow/workflow-definitions/schemas/workflow-definition.schema.js';
import { WorkflowStep } from './modules/workflow/workflow-steps/schemas/workflow-step.schema.js';
import { WorkflowPolicy } from './modules/workflow/workflow-policies/schemas/workflow-policy.schema.js';
import { PublishingService } from './modules/workflow/publishing/publishing.service.js';
import { WorkflowInstancesService } from './modules/workflow/workflow-instances/workflow-instances.service.js';
import { ArticlesService } from './modules/public-communication/articles/articles.service.js';
import type { AuthenticatedUser } from './common/interfaces/jwt-payload.interface.js';

/**
 * Fills a development newsroom: three people, eight articles, and a review
 * queue with real work in it.
 *
 *   npm run seed:newsroom
 *
 * Built with `tsc` into `dist-seed/`, never `nest build`: `nest build` deletes
 * `dist/` and stops a running `start:dev` (owner decision 2026-09-17).
 * Refuses `NODE_ENV=production` and any `MONGODB_URI` that is not this machine.
 *
 * ── Why it walks the real path ─────────────────────────────────────────────
 *
 * Each article reaches its destination through the same submit, approve and
 * publish calls a person would make. Writing `publicationState: 'Live'` into
 * the collection would be quicker and would produce a feed the workflow never
 * touched — a demonstration of the design with the mechanism cut out of it,
 * which is the one thing a demonstration must not do. The queue that ends up
 * on the review screen is a queue the engine actually created.
 *
 * Every demo password is the local development password from `api/.env`, which
 * is why this refuses to run anywhere but a development database.
 */
const log = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

/** A service-layer actor for one of the demo people, carrying the grants their
 *  role holds — the services check permissions, not sessions. */
const actorFor = async (
  users: Model<Record<string, unknown>>,
  roles: Model<Record<string, unknown>>,
  permissions: Model<Record<string, unknown>>,
  userId: Types.ObjectId,
): Promise<AuthenticatedUser> => {
  const user = await users.findOne({ _id: userId }).lean<{ roleIds: Types.ObjectId[] }>();
  const held = await roles
    .find({ _id: { $in: user?.roleIds ?? [] } })
    .lean<{ permissionIds: Types.ObjectId[] }[]>();
  const permissionIds = held.flatMap((role) => role.permissionIds ?? []);
  const rows = await permissions
    .find({ _id: { $in: permissionIds } })
    .lean<{ resourceType: string; action: string }[]>();

  return {
    userId: userId.toString(),
    permissions: rows.map((row) => ({ resourceType: row.resourceType, action: row.action })),
  } as unknown as AuthenticatedUser;
};

const main = async (): Promise<void> => {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const password = process.env.DEV_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('DEV_ADMIN_PASSWORD is not set in api/.env — the demo accounts need a password to sign in with.');
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });

  try {
    const bcrypt = (await import('bcryptjs')).default;
    const users = app.get<Model<Record<string, unknown>>>(getModelToken(User.name));
    const roles = app.get<Model<Record<string, unknown>>>(getModelToken(Role.name));
    const permissions = app.get<Model<Record<string, unknown>>>(getModelToken(Permission.name));
    const articles = app.get<Model<Record<string, unknown>>>(getModelToken(Article.name));

    // Articles written before `category` existed read back as `General` and
    // match no query for it, so the categorised feed would be quietly shorter
    // than the uncategorised one. Run first, so everything below sees a
    // consistent collection.
    const backfilled = await backfillArticleCategory(articles.db as never);
    log(`category: ${backfilled.filled} backfilled, ${backfilled.alreadySet} already set`);

    const report = await seedNewsroomDemo(
      { users, roles, permissions, articles },
      await bcrypt.hash(password, 10),
    );
    log(`people:   ${report.people.created} created, ${report.people.existing} already there`);
    log(`articles: ${report.articles.created} created, ${report.articles.existing} already there`);

    const [editor, approver, publisher] = DEMO_PEOPLE;

    // The approver is the one the queue must land on, so the policy names
    // them — not the administrator, whose queue would then hold the demo work.
    const policy = await seedNewsApproval(
      {
        workflowDefinitions: app.get(getModelToken(WorkflowDefinition.name)),
        workflowSteps: app.get(getModelToken(WorkflowStep.name)),
        workflowPolicies: app.get(getModelToken(WorkflowPolicy.name)),
      },
      [approver._id],
      'THRESHOLD',
      1,
    );
    log(`policy:   definition ${policy.definition}, ${policy.steps} step(s), policy ${policy.policy}`);

    const publishing = app.get(PublishingService);
    const instances = app.get(WorkflowInstancesService);
    const articlesService = app.get(ArticlesService);


    const editorActor = await actorFor(users, roles, permissions, editor._id);
    const approverActor = await actorFor(users, roles, permissions, approver._id);
    const publisherActor = await actorFor(users, roles, permissions, publisher._id);

    const walked: string[] = [];

    for (const article of DEMO_ARTICLES) {
      if (article.destination === 'draft') {
        continue;
      }

      // Already walked on a previous run, in any of three ways: it is live, it
      // is sitting in someone's queue, or it is approved and waiting. Only an
      // untouched draft may be walked, because re-submitting a record that has
      // an open review is something the engine correctly refuses.
      const current = await articles.findOne({ _id: article._id }).lean<{ publicationState: string }>();
      const openReview = await instances.findActive('articles', article._id);
      const approvedAlready = await instances.findLatestApproved('articles', article._id);
      if (current?.publicationState === 'Live' || openReview || approvedAlready) {
        continue;
      }

      const submitted = await publishing.submit({
        entityType: 'articles',
        entityId: article._id,
        actor: editorActor,
      });

      if (article.destination === 'awaitingApproval') {
        walked.push(`${article.slug} → awaiting the approver`);
        continue;
      }

      await instances.approve(submitted.workflowInstanceId, approver._id.toString());

      if (article.destination === 'approved') {
        walked.push(`${article.slug} → approved, waiting to be published`);
        continue;
      }

      await publishing.publishApproved({
        entityType: 'articles',
        entityId: article._id,
        actor: publisherActor,
      });

      if (article.destination === 'hidden') {
        await articlesService.setArchived(article._id.toString(), true, editorActor);
        walked.push(`${article.slug} → published, then hidden from the feed`);
        continue;
      }

      walked.push(`${article.slug} → published`);
    }

    void approverActor;
    log('');
    for (const line of walked) {
      log(`  ${line}`);
    }
    log('');
    log(`sign in as any of: ${DEMO_PEOPLE.map((person) => person.email).join(', ')}`);
    log('their password is DEV_ADMIN_PASSWORD from api/.env');
  } finally {
    await app.close();
  }
};

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

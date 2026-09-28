import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectConnection } from '@nestjs/mongoose';
import { Observable, concatMap } from 'rxjs';
import { Types } from 'mongoose';
// Type-only: mongoose's ESM build exports `Connection` as a type, not a
// runtime binding, so a value import fails to resolve under Node's ESM
// loader (caught by the interceptor's own suite, 2026-09-08).
import type { Connection } from 'mongoose';
import { AuditLogsService } from '../../modules/workflow/audit-logs/audit-logs.service.js';
import type { AuditAction } from '../../modules/workflow/audit-logs/schemas/audit-log.schema.js';
import { auditActionFor } from '../../modules/workflow/audit-logs/audit-action.util.js';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface.js';
import { SKIP_AUDIT_LOG_KEY } from '../decorators/skip-audit-log.decorator.js';
import { AUDIT_ENTITY_KEY } from '../decorators/audit-entity.decorator.js';
import type { AuditEntityOptions } from '../decorators/audit-entity.decorator.js';
import { REQUIRED_PERMISSION_KEY } from '../decorators/permissions.decorator.js';
import type { RequiredPermission } from '../decorators/permissions.decorator.js';
import { extractRequestContext } from '../utils/request-context.util.js';
import { kebabToCamel } from '../utils/kebab-to-camel.util.js';
import { API_GLOBAL_PREFIX } from '../constants/api-versioning.constant.js';
import { redactAuditSnapshot } from '../utils/redact-audit-snapshot.js';

// `auditActionFor` moved to `audit-logs/audit-action.util.ts` (owner
// decision 2026-09-27, round 3) so `ArticlesService` — and any future
// self-auditing service — can call the same function this interceptor
// calls, without a service importing from an interceptor file. Re-exported
// here so nothing that already imported it from this module breaks.
export { auditActionFor };

/**
 * Writes an `auditLogs` row for every successful mutating request
 * (POST/PATCH/PUT/DELETE). Registered globally via `APP_INTERCEPTOR`.
 *
 * `entityType` is the camelCase collection name derived from the route's
 * first segment (`/athlete-profiles/:id` -> `athleteProfiles`), which is what
 * makes these rows joinable against `workflowInstances`, `revisions`,
 * `publications` and `workflowPolicies` for the same record. `entityId` comes
 * from the route's `:id`, falling back to the created document's id for POST.
 * A request with no authenticated actor is skipped rather than guessed at.
 *
 * For PATCH/PUT/DELETE the record is read before the handler runs and stored
 * as `previousValue`. Both that snapshot and the response body pass through
 * `redactAuditSnapshot` first: the pre-image comes straight from storage and a
 * user document carries `authMethods[].passwordHash`, which must never reach a
 * collection that is readable over HTTP. A pre-read that fails is swallowed --
 * the row is still worth writing without a before-state.
 *
 * The write is awaited before the response is emitted, so it is on the
 * request's critical path. Routes marked `@SkipAuditLog()` write their own,
 * more precise entry instead.
 *
 * Every one of those choices, and what was rejected, is recorded in
 * `docs/design-system/ADR-0057-Audit-Trail-Capture-And-Exposure.md`.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly reflector: Reflector,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const required = this.reflector.getAllAndOverride<RequiredPermission>(REQUIRED_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const declared =
      this.reflector.getAllAndOverride<AuditEntityOptions>(AUDIT_ENTITY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || undefined;
    // `@AuditEntity({ action })` wins outright — the genuine special case
    // (independent review, round 4): a route whose OWN permission verb
    // cannot express what the route does at all (`roles:ManageRoles` covers
    // renaming, editing permissions AND archiving a role in one verb; on
    // `DELETE /roles/:id` specifically it means archiving), so no reading of
    // the permission alone — however this function evolves — could derive
    // the right value generically. Declared per route, next to the
    // decorators that already describe it, rather than teaching
    // `auditActionFor` a one-off case.
    const action = declared?.action ?? auditActionFor(request.method as string, required?.action);

    if (!action) {
      return next.handle();
    }

    // Taken BEFORE the handler runs — after it, the record has already
    // changed and there is nothing left to compare against.
    const previous = this.snapshotBefore(request, action);

    return next.handle().pipe(
      concatMap(async (responseBody) => {
        await this.record(request, action, responseBody, await previous, declared);
        return responseBody;
      }),
    );
  }

  /** The record as it stands before a modifying request touches it, or null
   *  for a creation (there is nothing yet) and whenever it cannot be read. */
  private async snapshotBefore(
    request: { url: string; params?: Record<string, string> },
    action: AuditAction,
  ): Promise<Record<string, unknown> | null> {
    if (action === 'Create') {
      return null;
    }
    const id = request.params?.id;
    const entityType = this.entityTypeFor(request.url);
    if (!id || !entityType || !Types.ObjectId.isValid(id)) {
      return null;
    }

    try {
      const document = await this.connection
        .collection(entityType)
        .findOne({ _id: new Types.ObjectId(id) });
      return redactAuditSnapshot(document);
    } catch {
      // A collection that does not exist under this name, or a read that
      // fails. The audit row is still worth writing without a before-state.
      return null;
    }
  }

  /**
   * The camelCase collection name for a request URL.
   *
   * The entity's own segment is not index 0 — the global prefix and the
   * version segment come first. The version is matched by pattern rather than
   * skipped by position, so a change to the version format cannot silently
   * shift which segment is read.
   */
  private entityTypeFor(url: string): string | undefined {
    const segments = url.split('/').filter(Boolean);
    if (segments[0] === API_GLOBAL_PREFIX) {
      segments.shift();
      if (/^v\d+$/.test(segments[0] ?? '')) {
        segments.shift();
      }
    }
    const routeSegment = segments[0];
    return routeSegment ? kebabToCamel(routeSegment) : undefined;
  }

  private async record(
    request: {
      url: string;
      // Named in the warning when a row cannot be attributed, so an operator
      // reading the log can find the route.
      method: string;
      params?: Record<string, string>;
      headers: Record<string, string | undefined>;
      ip?: string;
      user?: AuthenticatedUser;
    },
    action: AuditAction,
    responseBody: unknown,
    previousValue: Record<string, unknown> | null,
    declared: AuditEntityOptions | undefined,
  ): Promise<void> {
    const user = request.user;
    if (!user) {
      return;
    }

    // An explicit `@AuditEntity` wins over the URL: a route keyed by something
    // other than `:id` knows its own subject, and the segment may not name it.
    const entityType = declared?.type ?? this.entityTypeFor(request.url);
    if (!entityType) {
      this.logger.warn(
        `Audit row skipped: no entity type for ${request.method} ${request.url}. ` +
          'Add @AuditEntity({ type }) to this route.',
      );
      return;
    }

    const rawEntityId =
      request.params?.id ??
      (responseBody as { _id?: string; id?: string } | null)?._id ??
      (responseBody as { id?: string } | null)?.id;

    // The row is written whether or not the record can be named (ADR-0112).
    // The early return this replaced dropped the row entirely, and it dropped it
    // precisely for the routes whose shape is unusual — which is where the
    // governance-sensitive settings live. `PUT /workflow-policies/:entityType/
    // approval` was the proof: turning the federation's approval requirement on
    // or off left no trace at all.
    const entityId =
      rawEntityId && Types.ObjectId.isValid(rawEntityId) ? new Types.ObjectId(rawEntityId) : null;

    // What identified the subject, when it was not an id. A policy keyed by
    // `entityType` has a real identity; it simply is not an ObjectId.
    const declaredKey = declared?.idFrom ? request.params?.[declared.idFrom] : undefined;

    if (!entityId) {
      this.logger.warn(
        `Audit row written without an entity id: ${request.method} ${request.url}` +
          (declaredKey ? ` (subject: ${declaredKey})` : ''),
      );
    }

    await this.auditLogsService.write({
      actorId: new Types.ObjectId(user.userId),
      action,
      entityType,
      entityId,
      ...extractRequestContext(request),
      previousValue,
      // Null when nothing meaningful remains to show — a true deletion,
      // reversible or not. `Archive`/`Restore` keep their `newValue`: the
      // record is still there, only its state changed, which is exactly
      // what the log now distinguishes from `PermanentDelete`.
      newValue: action === 'Delete' || action === 'PermanentDelete' ? null : redactAuditSnapshot(responseBody),
      ...(entityId
        ? {}
        : {
            reason: declaredKey
              ? `entity id unresolved (subject: ${declaredKey})`
              : 'entity id unresolved',
          }),
    });
  }
}

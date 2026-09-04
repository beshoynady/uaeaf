import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, concatMap } from 'rxjs';
import { Types } from 'mongoose';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service.js';
import type { AuditAction } from '../../modules/audit-logs/schemas/audit-log.schema.js';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface.js';
import { SKIP_AUDIT_LOG_KEY } from '../decorators/skip-audit-log.decorator.js';
import { extractRequestContext } from '../utils/request-context.util.js';
import { kebabToCamel } from '../utils/kebab-to-camel.util.js';

const METHOD_TO_ACTION: Partial<Record<string, AuditAction>> = {
  POST: 'Create',
  PATCH: 'Update',
  PUT: 'Update',
  DELETE: 'Delete',
};

/**
 * Writes to `auditLogs` on every successful mutating request (POST/PATCH/
 * PUT/DELETE), registered globally via APP_INTERCEPTOR (BE-PLAN-010 §4.5).
 * `entityType` is read off the first URL path segment and converted from
 * the controller's kebab-case route (e.g. `/athlete-profiles/:id` ->
 * `athlete-profiles`) to the camelCase Mongoose collection name every
 * other `entityType`-bearing collection uses (`athleteProfiles` — see
 * `kebabToCamel()`), so this collection's `entityType` values are always
 * joinable against `workflowInstances`/`revisions`/`publications`/
 * `workflowPolicies.entityType` for the same record
 * (schema-audit-2026-09-04.md §3.2/§9.4). `entityId` comes from the route's
 * `:id` param, falling back to the created document's id in the response
 * body for POST. A request with no authenticated actor (login itself, or
 * any route that legitimately has none) is skipped rather than guessed.
 *
 * The audit write is awaited (`concatMap`, not `tap`+fire-and-forget)
 * before the HTTP response is emitted to the client: an audit trail that
 * might not have landed yet by the time the caller acts on the response
 * is not a durable guarantee. This does mean the write is on the request's
 * critical path — an acceptable, deliberate tradeoff for this project's
 * audit trail.
 *
 * Routes marked `@SkipAuditLog()` (Week 2: workflow action endpoints) are
 * skipped here entirely — they write their own, more precise `auditLogs`
 * entry (targeting the content entity a workflow instance concerns, with
 * `action: 'StatusChange'`), because this interceptor's generic
 * method-to-action inference would otherwise log every such POST/PATCH as
 * a `Create`/`Update` on `workflowInstances` itself, which is wrong.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly reflector: Reflector,
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
    const action = METHOD_TO_ACTION[request.method as string];

    if (!action) {
      return next.handle();
    }

    return next.handle().pipe(
      concatMap(async (responseBody) => {
        await this.record(request, action, responseBody);
        return responseBody;
      }),
    );
  }

  private async record(
    request: {
      url: string;
      params?: Record<string, string>;
      headers: Record<string, string | undefined>;
      ip?: string;
      user?: AuthenticatedUser;
    },
    action: AuditAction,
    responseBody: unknown,
  ): Promise<void> {
    const user = request.user;
    if (!user) {
      return;
    }

    const routeSegment = request.url.split('/').filter(Boolean)[0];
    const entityType = routeSegment ? kebabToCamel(routeSegment) : routeSegment;
    const rawEntityId =
      request.params?.id ?? (responseBody as { _id?: string; id?: string } | null)?._id ?? (responseBody as { id?: string } | null)?.id;
    if (!entityType || !rawEntityId) {
      return;
    }

    await this.auditLogsService.write({
      actorId: new Types.ObjectId(user.userId),
      action,
      entityType,
      entityId: new Types.ObjectId(rawEntityId),
      ...extractRequestContext(request),
      newValue: action === 'Delete' ? null : (responseBody as Record<string, unknown>),
    });
  }
}

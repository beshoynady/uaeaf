import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
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
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface.js';
import { SKIP_AUDIT_LOG_KEY } from '../decorators/skip-audit-log.decorator.js';
import { extractRequestContext } from '../utils/request-context.util.js';
import { kebabToCamel } from '../utils/kebab-to-camel.util.js';
import { API_GLOBAL_PREFIX } from '../constants/api-versioning.constant.js';
import { redactAuditSnapshot } from '../utils/redact-audit-snapshot.js';

const METHOD_TO_ACTION: Partial<Record<string, AuditAction>> = {
  POST: 'Create',
  PATCH: 'Update',
  PUT: 'Update',
  DELETE: 'Delete',
};

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
    const action = METHOD_TO_ACTION[request.method as string];

    if (!action) {
      return next.handle();
    }

    // Taken BEFORE the handler runs — after it, the record has already
    // changed and there is nothing left to compare against.
    const previous = this.snapshotBefore(request, action);

    return next.handle().pipe(
      concatMap(async (responseBody) => {
        await this.record(request, action, responseBody, await previous);
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
      params?: Record<string, string>;
      headers: Record<string, string | undefined>;
      ip?: string;
      user?: AuthenticatedUser;
    },
    action: AuditAction,
    responseBody: unknown,
    previousValue: Record<string, unknown> | null,
  ): Promise<void> {
    const user = request.user;
    if (!user) {
      return;
    }

    const entityType = this.entityTypeFor(request.url);
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
      previousValue,
      newValue: action === 'Delete' ? null : redactAuditSnapshot(responseBody),
    });
  }
}

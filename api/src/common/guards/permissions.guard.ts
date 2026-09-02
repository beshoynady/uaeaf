import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { REQUIRED_PERMISSION_KEY } from '../decorators/permissions.decorator.js';
import type { RequiredPermission } from '../decorators/permissions.decorator.js';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface.js';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service.js';
import { extractRequestContext } from '../utils/request-context.util.js';

interface DenialRequest {
  params?: Record<string, string>;
  method: string;
  url: string;
  ip?: string;
  headers: Record<string, string | undefined>;
  user?: AuthenticatedUser;
}

/**
 * Checks a route's @RequirePermission() against the permission set already
 * embedded in the caller's JWT (populated by JwtStrategy into
 * `request.user`, resolved once at login/refresh — see AuthService) — never
 * a live users -> roles -> permissions query per request (BE-PLAN-010 §4.4).
 *
 * Every denial is recorded as an `AccessDenied` row in `auditLogs` (enum
 * extended on the live FigJam board 2026-09-02) whenever an authenticated
 * actor is present. A collection-level route (list/create, no `:id` yet)
 * writes `entityId: null` — the live board made `entityId` explicitly
 * optional the same day specifically to represent this case (a denial
 * about a resource/action in general, not one record). Only the defensive
 * (should-never-happen, since JwtAuthGuard runs first) case of no
 * authenticated actor at all falls back to Logger — there is no actor to
 * attribute the row to.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /** @throws ForbiddenException when the required (resourceType, action)
   *  pair is not present in the caller's resolved permission set. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(REQUIRED_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }

    const request: DenialRequest = context.switchToHttp().getRequest();
    const user = request.user;
    const hasPermission = user?.permissions.some(
      (permission) =>
        permission.resourceType === required.resourceType && permission.action === required.action,
    );

    if (!hasPermission) {
      await this.recordDenial(request, user, required);
      throw new ForbiddenException(
        `Missing permission: ${required.action} on ${required.resourceType}.`,
      );
    }

    return true;
  }

  private async recordDenial(
    request: DenialRequest,
    user: AuthenticatedUser | undefined,
    required: RequiredPermission,
  ): Promise<void> {
    if (!user) {
      this.logger.warn(
        `AccessDenied actor=anonymous resourceType=${required.resourceType} action=${required.action} method=${request.method} url=${request.url} timestamp=${new Date().toISOString()}`,
      );
      return;
    }

    const rawId = request.params?.id;

    await this.auditLogsService.write({
      actorId: new Types.ObjectId(user.userId),
      action: 'AccessDenied',
      entityType: required.resourceType,
      entityId: rawId ? new Types.ObjectId(rawId) : null,
      ...extractRequestContext(request),
      reason: `${required.action} on ${required.resourceType}`,
    });
  }
}

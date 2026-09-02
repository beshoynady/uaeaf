import { SetMetadata } from '@nestjs/common';

/** Metadata key AuditLogInterceptor reads via Reflector to skip its generic
 *  method-to-action write for a route. */
export const SKIP_AUDIT_LOG_KEY = 'skipAuditLog';

/**
 * Marks a route as handled by its own, more precise audit-log write instead
 * of AuditLogInterceptor's generic HTTP-method inference. Used by workflow
 * action endpoints (submit/approve/reject/return/resubmit/delegate/cancel):
 * they write a `StatusChange` entry themselves, targeting the *content*
 * entity the workflow instance concerns — not `workflowInstances` itself,
 * which the generic interceptor would otherwise (incorrectly) log as a
 * `Create`/`Update` on every POST/PATCH to these routes.
 */
export const SkipAuditLog = () => SetMetadata(SKIP_AUDIT_LOG_KEY, true);

/** Minimal shape of an inbound HTTP request this helper needs — matches
 *  Express's `Request` as well as the narrower request interfaces declared
 *  independently in `PermissionsGuard` and `AuditLogInterceptor`. */
export interface RequestLike {
  ip?: string;
  headers: { 'user-agent'?: string };
}

/** Extracts the `{ ipAddress, userAgent }` pair every `auditLogs` write
 *  records, defaulting both to `''` when absent — used by PermissionsGuard,
 *  AuditLogInterceptor, and WorkflowInstancesController so the mapping from
 *  request to audit context lives in exactly one place. */
export function extractRequestContext(request: RequestLike): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: request.ip ?? '',
    userAgent: request.headers['user-agent'] ?? '',
  };
}

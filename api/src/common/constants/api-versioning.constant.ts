/** Single source of truth for the API's global prefix and default URI
 *  version (main.ts's setGlobalPrefix/enableVersioning). Anything else that
 *  needs to know these values -- AuditLogInterceptor's entityType
 *  derivation from the URL, e2e test bootstrap, e2e path helpers -- imports
 *  them from here instead of duplicating the literals, so a future version
 *  bump only means editing this file (UAEAF api/v1 prefix rollout,
 *  2026-09-06). */
export const API_GLOBAL_PREFIX = 'api';
export const API_DEFAULT_VERSION = '1';

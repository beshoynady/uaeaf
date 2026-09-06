import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX } from '../../../src/common/constants/api-versioning.constant.js';

/** Single place that knows the API's current base path. Every e2e spec
 *  builds its request paths through `apiPath()` instead of hardcoding
 *  `/api/v1/...` itself, so a future version bump (`/api/v2`) only means
 *  changing the shared constant, not every spec (UAEAF api/v1 prefix
 *  rollout, 2026-09-06). */
export const API_PREFIX = `/${API_GLOBAL_PREFIX}/v${API_DEFAULT_VERSION}`;

export function apiPath(path: string): string {
  return `${API_PREFIX}${path}`;
}

/** Single place that knows the API's current base path. Every e2e spec
 *  builds its request paths through `apiPath()` instead of hardcoding
 *  `/api/v1/...` itself, so a future version bump (`/api/v2`) only means
 *  changing this one file, not every spec (UAEAF api/v1 prefix rollout,
 *  2026-09-06). */
export const API_PREFIX = '/api/v1';

export function apiPath(path: string): string {
  return `${API_PREFIX}${path}`;
}

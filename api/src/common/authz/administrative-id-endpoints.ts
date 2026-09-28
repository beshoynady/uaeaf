/**
 * The administrative endpoints permitted to answer `id` rather than `_id`.
 *
 * A data catalogue only: nothing checks it against the controllers yet. The
 * guard that does is built in a later phase (See ADR-0121).
 */
export interface AdministrativeIdEndpoint {
  /** `GET /users/:id` — the method and the path as the controller declares it. */
  endpoint: string;
  /** Why this administrative route answers `id` instead of `_id`. */
  reason: string;
}

const USER_RESPONSE = 'Maps the account through UsersService.toResponse into UserResponseDto, which declares `id`.';
const USER_REF = 'Answers UserRefDto, the acted-on account id and nothing else, which declares `id`.';
const PERMISSION_RESPONSE = 'Maps the permission through PermissionsService.toResponse into PermissionResponseDto, which declares `id`.';
const EDITORIAL_STATE =
  'Answers EditorialStateDto from PublishingService.editorialState; its WorkflowStepSummaryDto and EditorialHistoryEntryDto rows declare `id`.';

/** Every administrative endpoint allowed to answer `id` (See ADR-0121). */
export const ADMINISTRATIVE_ID_ENDPOINTS: readonly AdministrativeIdEndpoint[] = [
  { endpoint: 'POST /users', reason: USER_RESPONSE },
  { endpoint: 'GET /users', reason: USER_RESPONSE },
  { endpoint: 'GET /users/me', reason: 'Answers MeResponseDto, UserResponseDto plus the caller permissions, which declares `id`.' },
  { endpoint: 'PATCH /users/me/preferences', reason: USER_RESPONSE },
  { endpoint: 'GET /users/names', reason: 'Answers UserNameDto rows from UsersService.displayNamesFor, each declaring `id`.' },
  { endpoint: 'GET /users/:id', reason: USER_RESPONSE },
  { endpoint: 'PATCH /users/:id/roles', reason: USER_RESPONSE },
  { endpoint: 'PATCH /users/:id/status', reason: USER_RESPONSE },
  { endpoint: 'DELETE /users/:id', reason: USER_REF },
  { endpoint: 'POST /users/:id/unarchive', reason: USER_REF },
  { endpoint: 'GET /permissions', reason: PERMISSION_RESPONSE },
  { endpoint: 'GET /permissions/:id', reason: PERMISSION_RESPONSE },
  {
    endpoint: 'GET /live-streams/:id',
    reason: 'Answers LiveStreamAdminResponseDto, which extends LiveStreamPublicResponseDto and inherits its `id`.',
  },
  { endpoint: 'GET /audit-logs', reason: 'Maps each row through AuditLogsService.toResponse into AuditLogResponseDto, which declares `id`.' },
  { endpoint: 'GET /media-assets/unused', reason: 'Maps each row through UnusedMediaService.toRow into UnusedMediaRowDto, which declares `id`.' },
  { endpoint: 'GET /revisions', reason: 'Answers RevisionSummaryDto rows from PublishingService.revisionHistory, each declaring `id`.' },
  {
    endpoint: 'GET /revisions/:id',
    reason:
      'Answers RevisionDetailDto with `id` at the top level and `_id` inside `content`, the frozen snapshot passed through unrenamed: the one endpoint that answers both spellings.',
  },
  { endpoint: 'GET /about-federation-page/:id/editorial-state', reason: EDITORIAL_STATE },
  { endpoint: 'GET /president-message-page/:id/editorial-state', reason: EDITORIAL_STATE },
  { endpoint: 'GET /strategic-plans-page/:id/editorial-state', reason: EDITORIAL_STATE },
  { endpoint: 'GET /vision-mission-page/:id/editorial-state', reason: EDITORIAL_STATE },
  { endpoint: 'GET /articles/:id/editorial-state', reason: EDITORIAL_STATE },
];

import type { FieldError, OrganizationKind, OrganizationStep } from "./organizations";
import type { SponsorsStep } from "./sponsors";
import { isStripDirty, type StripDraft } from "./strip-settings";

/**
 * Runs a planned save for the sponsors, partners and memberships screens
 * through the dashboard's route handlers, one request at a time, in order
 * (ADR-0084's pattern).
 *
 * Saving is publishing and the API has no transaction across records, so a
 * refusal part-way leaves the earlier writes live. The result says how many
 * landed and which records were created, so the screen re-reads what is stored
 * and keeps only what did not land as unsaved.
 */

export type Send = (
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
) => Promise<{ ok: boolean; status: number; body: unknown }>;

export interface RelationRequest {
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
  /** The draft key a created record's id is remembered under. */
  createsKey?: string;
  /** A field filled with the id created earlier for another key. */
  ref?: { field: string; key: string };
  /** Where an error on this request is shown: the draft path prefix. */
  errorPrefix: string;
}

export type RelationSaveResult =
  | { ok: true; created: Record<string, string> }
  | { ok: false; completed: number; code: string; errors: FieldError[]; created: Record<string, string> };

const ORGANIZATION_ROUTE: Record<OrganizationKind, string> = {
  partners: "/api/admin/partnerships",
  memberships: "/api/admin/memberships",
};

export const organizationRequests = (kind: OrganizationKind, steps: readonly OrganizationStep[]): RelationRequest[] =>
  steps.map((step) => {
    const errorPrefix = `items.${step.key}`;
    switch (step.kind) {
      case "delete":
        return { method: "DELETE", url: `${ORGANIZATION_ROUTE[kind]}/${step.id}`, errorPrefix };
      case "create":
        return { method: "POST", url: ORGANIZATION_ROUTE[kind], body: step.body, createsKey: step.key, errorPrefix };
      case "update":
        return { method: "PATCH", url: `${ORGANIZATION_ROUTE[kind]}/${step.id}`, body: step.body, errorPrefix };
    }
  });

export const sponsorRequests = (steps: readonly SponsorsStep[]): RelationRequest[] =>
  steps.map((step) => {
    if (step.kind === "section") {
      return { method: "PATCH", url: `/api/admin/sponsors-section/${step.id}`, body: step.body, errorPrefix: "section" };
    }
    const route = `/api/admin/${step.entity}`;
    const errorPrefix = `${step.entity}.${step.key}`;
    switch (step.kind) {
      case "delete":
        return { method: "DELETE", url: `${route}/${step.id}`, errorPrefix };
      case "update":
        return { method: "PATCH", url: `${route}/${step.id}`, body: step.body, errorPrefix };
      case "create":
        return step.entity === "sponsorships"
          ? { method: "POST", url: route, body: step.body, createsKey: step.key, ref: { field: "sponsorId", key: step.sponsorKey }, errorPrefix }
          : { method: "POST", url: route, body: step.body, createsKey: step.key, errorPrefix };
    }
  });

/** The strip's settings are one record, written whole (ADR-0077 D5). */
export const stripRequests = (saved: StripDraft, draft: StripDraft): RelationRequest[] =>
  isStripDirty(saved, draft) ? [{ method: "PUT", url: "/api/admin/site-settings/sponsor-strip", body: { ...draft }, errorPrefix: "strip" }] : [];

/** The browser's transport: JSON in and out, the body read even on a refusal. */
export const fetchRelationSend: Send = async (method, url, body) => {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed: unknown = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body: parsed };
};

/** The API's field names, as the screens name the same fields. */
const DRAFT_FIELD: Record<string, string> = {
  name: "name",
  "name.ar": "nameAr",
  "name.en": "nameEn",
  partnerName: "name",
  "partnerName.ar": "nameAr",
  "partnerName.en": "nameEn",
  organizationName: "name",
  "organizationName.ar": "nameAr",
  "organizationName.en": "nameEn",
  logoId: "logoId",
  partnerLogoId: "logoId",
  organizationLogoId: "logoId",
  startDate: "startDay",
  endDate: "endDay",
  "scopeLabel.ar": "scopeAr",
  "scopeLabel.en": "scopeEn",
  ctaText: "ctaText",
  ctaUrl: "ctaUrl",
  "configuration.bannerSponsorshipId": "bannerSponsorshipId",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const runRelationSave = async (requests: readonly RelationRequest[], send: Send): Promise<RelationSaveResult> => {
  const created = new Map<string, string>();
  const failed = (completed: number, request: RelationRequest, body: unknown): RelationSaveResult => {
    const code = isRecord(body) && typeof body.code === "string" ? body.code : "serviceUnavailable";
    const field = isRecord(body) && typeof body.field === "string" ? DRAFT_FIELD[body.field] : undefined;
    const limit = isRecord(body) && typeof body.limit === "number" ? body.limit : undefined;
    const errors: FieldError[] = field
      ? [limit === undefined ? { path: `${request.errorPrefix}.${field}`, code } : { path: `${request.errorPrefix}.${field}`, code, limit }]
      : [];
    return { ok: false, completed, code, errors, created: Object.fromEntries(created) };
  };

  for (const [index, request] of requests.entries()) {
    try {
      const body = request.ref ? { ...request.body, [request.ref.field]: created.get(request.ref.key) } : request.body;
      const response = await send(request.method, request.url, body);
      if (!response.ok) return failed(index, request, response.body);
      if (request.createsKey) {
        const id = isRecord(response.body) && typeof response.body._id === "string" ? response.body._id : null;
        // Without the new id a later step could not name the record.
        if (!id) return failed(index, request, null);
        created.set(request.createsKey, id);
      }
    } catch {
      return failed(index, request, null);
    }
  }
  return { ok: true, created: Object.fromEntries(created) };
};

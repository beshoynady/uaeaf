import { isMongoId, isMongoIdList } from "../request-shapes";

/**
 * What the sponsors, partners and memberships route handlers forward to the API
 * (ADR-0085).
 *
 * Only a record's own fields leave: the API refuses a whole request over one
 * unknown key (`forbidNonWhitelisted`), which would fail a save with nothing on
 * screen to explain it. `isDemo` and a sponsor's `restricted` contract are not
 * in any list, so these screens can never set them. The values themselves are
 * the API's to judge.
 */

export type RelationEntity = "sponsors" | "sponsorships" | "partnerships" | "memberships";

const FIELDS: Record<RelationEntity, readonly string[]> = {
  sponsors: ["name", "logoId", "website", "categoryLabel"],
  sponsorships: [
    "sponsorId",
    "targetType",
    "targetId",
    "tier",
    "startDate",
    "endDate",
    "status",
    "scopeLabel",
    "isFeatured",
    "displayOrder",
    "isVisible",
  ],
  partnerships: ["partnerName", "partnerLogoId", "partnershipType", "startDate", "endDate", "isActive", "displayOrder", "isVisible"],
  memberships: ["organizationName", "organizationLogoId", "membershipType", "startDate", "endDate", "status", "displayOrder", "isVisible"],
};

const STRIP_FIELDS = ["isVisible", "displayMode", "selection", "sponsorshipIds", "order", "pinnedSponsorshipId", "speed"] as const;

type Parsed<T> = { ok: true; body: T } | { ok: false };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pick = (body: Record<string, unknown>, fields: readonly string[]) =>
  Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));

export const readRelationBody = (entity: RelationEntity, body: unknown): Parsed<Record<string, unknown>> =>
  isRecord(body) ? { ok: true, body: pick(body, FIELDS[entity]) } : { ok: false };

/**
 * The SPONSORS section's settings only: the banner preference inside
 * `configuration`, and the call to action. Anything else a section carries —
 * its place, its visibility, another section type's configuration — is not
 * this screen's to change.
 */
export const readSponsorsSectionBody = (body: unknown): Parsed<Record<string, unknown>> => {
  if (!isRecord(body) || !isRecord(body.configuration)) return { ok: false };
  const bannerSponsorshipId = body.configuration.bannerSponsorshipId ?? null;
  if (bannerSponsorshipId !== null && !isMongoId(bannerSponsorshipId)) return { ok: false };
  return { ok: true, body: { configuration: { bannerSponsorshipId }, ...pick(body, ["ctaText", "ctaUrl"]) } };
};

/** The strip's settings, every field present, the ids real ids. */
export const readStripBody = (body: unknown): Parsed<Record<string, unknown>> => {
  if (!isRecord(body) || !STRIP_FIELDS.every((field) => Object.hasOwn(body, field)) || !isMongoIdList(body.sponsorshipIds)) {
    return { ok: false };
  }
  return { ok: true, body: pick(body, STRIP_FIELDS) };
};

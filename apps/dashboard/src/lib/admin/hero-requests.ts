import { isMongoId, isMongoIdList } from "./request-shapes";

/**
 * What the homepage hero's route handlers accept before a request leaves for
 * the API.
 *
 * Only a slide's own fields are forwarded. The API rejects a whole request over
 * one unknown key (`forbidNonWhitelisted`), which would fail a save with nothing
 * on screen to explain it; and a slide's `pageSectionId` never changes on an
 * edit, so an update cannot carry it (moving a slide between sections is not an
 * edit). The field values themselves are the API's to judge.
 */

const SLIDE_FIELDS = [
  "mediaType",
  "imageAssetId",
  "desktopFocalPoint",
  "useMobileImage",
  "mobileImageAssetId",
  "mobileFocalPoint",
  "ltrImageMode",
  "ltrImageAssetId",
  "ltrFocalPoint",
  "eyebrow",
  "title",
  "subtitle",
  "primaryCta",
  "secondaryCta",
  "displayOrder",
  "active",
  "scheduledFrom",
  "scheduledTo",
] as const;

type Parsed<T> = { ok: true; body: T } | { ok: false };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pick = (body: Record<string, unknown>, fields: readonly string[]) =>
  Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));

export const readCreateSlide = (body: unknown): Parsed<Record<string, unknown>> => {
  if (!isRecord(body) || !isMongoId(body.pageSectionId)) return { ok: false };
  return { ok: true, body: { pageSectionId: body.pageSectionId, ...pick(body, SLIDE_FIELDS) } };
};

export const readUpdateSlide = (body: unknown): Parsed<Record<string, unknown>> =>
  isRecord(body) ? { ok: true, body: pick(body, SLIDE_FIELDS) } : { ok: false };

export const readReorder = (body: unknown): Parsed<{ pageSectionId: string; slideIds: string[] }> =>
  isRecord(body) && isMongoId(body.pageSectionId) && isMongoIdList(body.slideIds)
    ? { ok: true, body: { pageSectionId: body.pageSectionId, slideIds: body.slideIds } }
    : { ok: false };

export const readSectionSettings = (body: unknown): Parsed<{ configuration: Record<string, unknown> }> =>
  isRecord(body) && isRecord(body.configuration) ? { ok: true, body: { configuration: body.configuration } } : { ok: false };

/** A request body as JSON, or `undefined` when it is not JSON at all. */
export const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};

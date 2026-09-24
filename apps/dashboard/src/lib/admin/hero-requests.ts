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

/**
 * A section's own settings, as the homepage screens save them.
 *
 * `configuration` is required — it is what every one of these screens exists
 * to write. The three beside it are optional and carried only when sent: the
 * video section's editor owns its heading, its sub-heading and whether the
 * section is drawn at all, and those are stored on the row rather than inside
 * `configuration`. The hero screen sends none of them and is unchanged.
 *
 * A section's page, type and order stay absent: those are what a section *is*,
 * and no settings screen has business changing them.
 */
const SECTION_FIELDS = ["enabled", "sectionTitle", "sectionSubtitle"] as const;

export const readSectionSettings = (body: unknown): Parsed<Record<string, unknown>> =>
  isRecord(body) && isRecord(body.configuration)
    ? { ok: true, body: { configuration: body.configuration, ...pick(body, SECTION_FIELDS) } }
    : { ok: false };

/** A request body as JSON, or `undefined` when it is not JSON at all. */
export const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};

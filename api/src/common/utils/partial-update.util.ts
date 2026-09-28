import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Which fields a partial update (`PATCH`) carries.
 *
 * A service receives the DTO instance `ValidationPipe({ transform: true })`
 * built, and with ES2022 class fields every property the class declares is an
 * own property of that instance, `undefined` when the request did not send it.
 * So "is it an own key?" is true for every field, and a presence check written
 * that way reads an update that sent one field as clearing all the others (the
 * defect found in hero slides and page sections on 2026-09-17).
 *
 * JSON cannot carry `undefined`: a field was sent exactly when it is not
 * `undefined`, and an explicit `null` is still a request to clear it.
 *
 * Replacement writes (`PUT`, the singleton pages' `upsert`) are different by
 * design: an omitted field there means "none" (the dashboard removes a picture
 * by leaving it out), so they do not use this.
 */
export const wasSent = <T extends object>(dto: T, key: keyof T): boolean => dto[key] !== undefined;

/**
 * The update document for a partial DTO: only the keys the request actually
 * sent, `dto` unchanged otherwise.
 *
 * The single shared builder every plain-CRUD service's `update()` calls
 * instead of hand-rolling the same `if (dto.x !== undefined) update.x = dto.x`
 * block per field. Filters by `!== undefined` — the same rule `wasSent` names
 * above — never by `in`/`hasOwnProperty`/`Object.keys`, which are true for
 * every field a class declares whether or not the request sent it.
 *
 * Returns `Record<string, unknown>` rather than `Partial<T>`: the caller
 * hands this straight to `repository.updateById`, whose `UpdateQuery<T>`
 * parameter is keyed on the *document* shape, not the DTO's (a DTO's
 * `photoId?: string` is not the document's `photoId: Types.ObjectId`), and
 * `Record<string, unknown>` is the same escape hatch `HeroSlidesService` and
 * `ArticlesService` already build by hand for the same reason.
 */
export const partialUpdate = <T extends object>(dto: T): Record<string, unknown> =>
  Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));

/**
 * Whether source code decides a partial update by own keys: the defect above
 * in any of its spellings. Used by the contract test that scans every service,
 * so the pattern cannot return unnoticed.
 */
export const presenceByOwnKey = (source: string): boolean =>
  [
    /Object\.hasOwn\(\s*dto\b/,
    /\bhasOwnProperty\.call\(\s*dto\b/,
    /\bdto\.hasOwnProperty\(/,
    /['"`]\w+['"`]\s+in\s+dto\b/,
    /\bin\s+dto\)/,
    /Object\.(keys|entries)\(\s*dto\s*\)/,
  ].some((pattern) => pattern.test(source));

/** Whether the schema's own `@Prop()` allows `null` to be stored for this
 *  path — read from the schema (`default: null`, a `| null` TS type), never
 *  inferred from the DTO's own optionality, which answers a different
 *  question ("must the request send this") from this one ("may the record
 *  hold no value"). A required field that happens to accept `null` is the
 *  same defect this file exists to close, with a different value. */
export interface FieldNullability {
  nullable: boolean;
}

/** One refusal shared by every field setter below, so a cleared required
 *  field always reads the same regardless of which one refused it. It covers
 *  reference and date fields only; every other required field is refused one
 *  layer up, by `PartialType(…, { skipNullProperties: false })` on the
 *  `Update*Dto` (scanned by `raw-dto-cast-scan.spec.ts`). Typed
 *  `never`: callable as a bare statement (`if (!nullable) refuseNull(key)`)
 *  and TypeScript still knows nothing after it runs in that branch. */
const refuseNull = (key: string): never => {
  throw new BadRequestException({
    code: 'requiredFieldCleared',
    message: `${key} is required and cannot be cleared with null.`,
  });
};

/**
 * Writes one ObjectId-typed field from a partial-update DTO into `target`.
 * The only place allowed to call `new Types.ObjectId(...)` on a DTO value —
 * enforced by `raw-dto-cast-scan.spec.ts` — because that call does not do
 * what it looks like it does for the two values a partial update actually
 * sends for "no id".
 *
 * Measured against this project's pinned `mongoose` (Fix round 2):
 * `new Types.ObjectId(null)` and `new Types.ObjectId(undefined)` do not
 * throw and do not produce anything null-like — each mints a brand new,
 * unrelated, entirely valid-looking random id. A service that wrote
 * `if (dto.x !== undefined) update.x = new Types.ObjectId(dto.x)` therefore
 * took the ordinary "clear the picture" request `{ x: null }` and pointed
 * the record at an id that has never existed — silently, with no error and
 * nothing in the response to reveal it. This function is the fix: it reads
 * the raw DTO value BEFORE any cast and answers the three cases a bare cast
 * conflates.
 *
 * - absent (`undefined`): `target` is left untouched — the field was not
 *   part of this request.
 * - explicit `null`: written as `null` when `nullable` says the schema
 *   allows it (a real "clear", e.g. `discipline.coverImage`); refused with
 *   `BadRequestException` otherwise — a required reference has no valid
 *   "no value" state to be silently placed into.
 * - a string: cast with `new Types.ObjectId(value)`, which still throws its
 *   own `BSONError` for a malformed id — a genuinely invalid value is
 *   refused, never coerced into something that merely looks valid.
 */
export const setObjectIdField = <T extends object>(
  target: Record<string, unknown>,
  dto: T,
  key: Extract<keyof T, string>,
  { nullable }: FieldNullability,
): void => {
  const value = dto[key] as unknown as string | null | undefined;
  if (value === undefined) return;
  if (value === null) {
    if (!nullable) refuseNull(key);
    target[key] = null;
    return;
  }
  target[key] = new Types.ObjectId(value);
};

/** Same three cases as `setObjectIdField`, for a Date-typed field.
 *  `new Date(null)` silently answers the Unix epoch instead of refusing or
 *  clearing — the same shape of defect, for `new Date(...)` instead of
 *  `new Types.ObjectId(...)`. */
export const setDateField = <T extends object>(
  target: Record<string, unknown>,
  dto: T,
  key: Extract<keyof T, string>,
  { nullable }: FieldNullability,
): void => {
  const value = dto[key] as unknown as string | null | undefined;
  if (value === undefined) return;
  if (value === null) {
    if (!nullable) refuseNull(key);
    target[key] = null;
    return;
  }
  target[key] = new Date(value);
};

/** Same three cases, for an array-of-ObjectId field (today, only
 *  `workflowSteps.assigneeIds`). An array's schema-level "no value" state is
 *  an empty array, not `null` — none of this codebase's array-of-ObjectId
 *  fields is typed to accept `null`, so unlike the two setters above this
 *  one refuses it unconditionally rather than taking a `nullable` option
 *  nothing would ever set to `true`. */
export const setObjectIdArrayField = <T extends object>(
  target: Record<string, unknown>,
  dto: T,
  key: Extract<keyof T, string>,
): void => {
  const value = dto[key] as unknown as readonly string[] | null | undefined;
  if (value === undefined) return;
  if (value === null) {
    refuseNull(key);
    return;
  }
  target[key] = value.map((id) => new Types.ObjectId(id));
};

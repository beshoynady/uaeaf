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

import type { LocalizedText } from "@/lib/api/types";

/**
 * Body guards for the administration route handlers.
 *
 * These are not a second validation layer for its own sake. Three fields on
 * the API reject badly in ways the dashboard has to prevent rather than
 * report (all verified 2026-09-08 against the API source):
 *
 * - `name` on `POST /roles`, `PATCH /roles/:id/name` and `POST /users` carries
 *   only `@ValidateNested()`. class-validator returns early on an undefined
 *   nested value, so the ValidationPipe accepts a body with no `name` at all
 *   and Mongoose's `required: true` throws instead — and with no exception
 *   filter registered, that reaches the browser as a bare 500.
 * - `@MinLength(1)` on both halves of `LocalizedTextDto` means an empty
 *   string is a 400, not a saved blank.
 * - `@IsMongoId({ each: true })` rejects the whole array on one malformed id.
 *
 * Checking here turns each of those into a specific message the form can put
 * next to the field that caused it.
 */

const MONGO_ID = /^[0-9a-fA-F]{24}$/;

export function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { en, ar } = value as Record<string, unknown>;
  // Trimmed, because " " satisfies @MinLength(1) upstream and would store a
  // role whose name renders as blank in every list that shows it.
  return typeof en === "string" && en.trim().length > 0 && typeof ar === "string" && ar.trim().length > 0;
}

export function isMongoId(value: unknown): value is string {
  return typeof value === "string" && MONGO_ID.test(value);
}

export function isMongoIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isMongoId);
}

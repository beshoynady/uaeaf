import type { FieldError } from "@/lib/admin/homepage-hero";

/**
 * The sentence a field shows for its error, by code.
 *
 * Beside a field the fix is local and short ("required because the button is
 * visible"); the summary above the editor uses the longer `WriteErrors`
 * sentences, which say which kind of field it was.
 */
const KEYS: Record<string, string> = {
  incompleteSlide: "requiredVisibleSlide",
  incompleteCta: "requiredVisibleButton",
  ctaLabelTooLong: "tooLong",
  heroTextTooLong: "tooLong",
  invalidCtaUrl: "invalidUrl",
  incompleteLtrImage: "requiredSeparate",
  missingRequiredField: "requiredMobile",
  incompleteNextEvent: "requiredVisibleEvent",
  nextEventEndsBeforeStart: "endsBeforeStart",
  scheduleEndsBeforeStart: "endsBeforeStart",
  invalidPlayback: "invalidInterval",
};

export type Translate = (key: string, values?: Record<string, string | number>) => string;

export const fieldMessage = (t: Translate, error: FieldError | undefined): string | null => {
  if (!error) return null;
  const key = KEYS[error.code];
  return key ? t(key, { limit: error.limit ?? 0 }) : null;
};

/** The first error at a path, for a field that shows one message. */
export const errorAt = (errors: readonly FieldError[], path: string): FieldError | undefined =>
  errors.find((error) => error.path === path);

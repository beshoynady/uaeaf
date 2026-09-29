import type { SeasonDraft, SeasonProblem, SeasonProblemCode } from "@/lib/admin/seasons/season-draft";

/**
 * What every section of the season form is handed.
 *
 * The draft lives in `SeasonForm`; each section reads the part it draws and
 * writes through `set`. `problems` is the whole list, so a section can show
 * the ones that belong to its fields — and only after the first save attempt,
 * which is what `showErrors` says: a form that opens already red tells the
 * editor they have done something wrong before they have done anything (the
 * album form's rule).
 */
export type SeasonDraftSetter = <K extends keyof SeasonDraft>(key: K, value: SeasonDraft[K]) => void;

export interface SeasonSectionProps {
  draft: SeasonDraft;
  set: SeasonDraftSetter;
  problems: readonly SeasonProblem[];
  showErrors: boolean;
  /** No `seasons:Update` (or `Create`, on a new season): every field reads,
   *  none writes. */
  disabled: boolean;
}

/** The sentence for the first of `codes` present on the form (not on a row),
 *  when errors are showing — the shape every field's `error` prop takes. */
export const fieldProblem = (
  props: Pick<SeasonSectionProps, "problems" | "showErrors">,
  codes: SeasonProblemCode | readonly SeasonProblemCode[],
  t: (key: string) => string,
): string | null => {
  if (!props.showErrors) return null;
  const wanted: readonly SeasonProblemCode[] = typeof codes === "string" ? [codes] : codes;
  const found = props.problems.find((problem) => problem.row === undefined && wanted.includes(problem.code));
  return found ? t(`problem_${found.code}`) : null;
};

/** The sentence for one row's problem of the given family, when errors are
 *  showing. */
export const rowProblem = (
  props: Pick<SeasonSectionProps, "problems" | "showErrors">,
  row: number,
  codes: readonly SeasonProblemCode[],
  t: (key: string) => string,
): string | null => {
  if (!props.showErrors) return null;
  const found = props.problems.find((problem) => problem.row === row && codes.includes(problem.code));
  return found ? t(`problem_${found.code}`) : null;
};

/** Whether none of `codes` is present — a section's completion tick. */
export const clearOf = (problems: readonly SeasonProblem[], codes: readonly SeasonProblemCode[]): boolean =>
  !problems.some((problem) => codes.includes(problem.code));

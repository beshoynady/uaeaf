import type { AlbumDraft, DraftProblem } from "@/lib/admin/albums/album-draft";

/**
 * What every section of the album form is handed.
 *
 * The draft lives in `AlbumForm`; each section reads the part it draws and
 * writes through `set`. `problems` is the whole list, so a section can show the
 * ones that belong to its fields — and only after the first save attempt, which
 * is what `showErrors` says: a form that opens already red tells the editor
 * they have done something wrong before they have done anything.
 */
export type DraftSetter = <K extends keyof AlbumDraft>(key: K, value: AlbumDraft[K]) => void;

export interface SectionProps {
  draft: AlbumDraft;
  set: DraftSetter;
  problems: readonly DraftProblem[];
  showErrors: boolean;
}

/** The problem's sentence when it is present and errors are showing, else null
 *  — the shape every field's `error` prop takes. */
export const problemText = (
  props: Pick<SectionProps, "problems" | "showErrors">,
  problem: DraftProblem | readonly DraftProblem[],
  t: (key: string) => string,
): string | null => {
  if (!props.showErrors) return null;
  const wanted = typeof problem === "string" ? [problem] : problem;
  const found = props.problems.find((entry) => wanted.includes(entry));
  return found ? t(`problem_${found}`) : null;
};

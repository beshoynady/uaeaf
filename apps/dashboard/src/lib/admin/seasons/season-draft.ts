import { SLUG_PATTERN } from "@/lib/admin/articles";
import { dayToInstant, instantToDay, isDay } from "./season-dates";
import type { AdminSeason, SeasonPhaseType } from "./types";
import type { LocalizedText } from "@/lib/api/types";
import type { SeoDraft } from "@/lib/admin/editorial-draft";

/**
 * The season form's draft, the problems that would make its save fail, and
 * the two request bodies it becomes.
 *
 * Flat strings, because a form is flat: each input edits one string, and the
 * nested shapes the API stores are rebuilt only when a save leaves. Dates are
 * Dubai days (`YYYY-MM-DD`), turned into instants by `season-dates.ts`.
 *
 * -- Pairs are both-or-neither ----------------------------------------------
 *
 * Every bilingual field goes through `LocalizedTextDto`, whose two halves are
 * each `@MinLength(1)`. A tagline written in Arabic only is not a partial
 * tagline the API keeps — it is a 400 that refuses the whole save. So the
 * optional pairs are checked as pairs here, beside the field.
 */

export interface PhaseDraft {
  /** A React key only; never sent. Rows are added and removed, so an index
   *  would hand one row's typed text to its neighbour. */
  key: string;
  nameAr: string;
  nameEn: string;
  type: SeasonPhaseType | "";
  from: string;
  to: string;
}

export interface KeyDateDraft {
  key: string;
  titleAr: string;
  titleEn: string;
  date: string;
}

export interface SeasonDraft {
  nameAr: string;
  nameEn: string;
  slug: string;
  shortName: string;
  taglineAr: string;
  taglineEn: string;
  /** Media ids, `""` for none — the shape `MediaPicker` holds. */
  logoId: string;
  bannerId: string;
  shareImageId: string;
  aboutAr: string;
  aboutEn: string;
  closingAr: string;
  closingEn: string;
  start: string;
  end: string;
  phases: PhaseDraft[];
  keyDates: KeyDateDraft[];
  calendarDocumentId: string;
  documentIds: string[];
  isVisible: boolean;
  seo: SeoDraft;
}

let rowCounter = 0;
export const newRowKey = (prefix: string): string => {
  rowCounter += 1;
  return `${prefix}-${rowCounter}`;
};

export const emptyPhase = (): PhaseDraft => ({ key: newRowKey("phase"), nameAr: "", nameEn: "", type: "", from: "", to: "" });
export const emptyKeyDate = (): KeyDateDraft => ({ key: newRowKey("key-date"), titleAr: "", titleEn: "", date: "" });

const EMPTY_PAIR: LocalizedText = { ar: "", en: "" };

export const draftFromSeason = (season: AdminSeason | null): SeasonDraft => ({
  nameAr: season?.name.ar ?? "",
  nameEn: season?.name.en ?? "",
  slug: season?.slug ?? "",
  shortName: season?.shortName ?? "",
  taglineAr: season?.tagline?.ar ?? "",
  taglineEn: season?.tagline?.en ?? "",
  logoId: season?.logoId ?? "",
  bannerId: season?.bannerId ?? "",
  shareImageId: season?.shareImageId ?? "",
  aboutAr: season?.about.ar ?? "",
  aboutEn: season?.about.en ?? "",
  closingAr: season?.closingSummary?.ar ?? "",
  closingEn: season?.closingSummary?.en ?? "",
  start: instantToDay(season?.startDate ?? null),
  end: instantToDay(season?.endDate ?? null),
  phases: (season?.phases ?? []).map((phase) => ({
    key: newRowKey("phase"),
    nameAr: phase.name.ar,
    nameEn: phase.name.en,
    type: phase.type,
    from: instantToDay(phase.from),
    to: instantToDay(phase.to),
  })),
  keyDates: (season?.keyDates ?? []).map((entry) => ({
    key: newRowKey("key-date"),
    titleAr: entry.title.ar,
    titleEn: entry.title.en,
    date: instantToDay(entry.date),
  })),
  calendarDocumentId: season?.calendarDocumentId ?? "",
  documentIds: season?.documentIds ?? [],
  isVisible: season?.isVisible ?? false,
  seo: {
    metaTitle: season?.seo.metaTitle ?? EMPTY_PAIR,
    metaDescription: season?.seo.metaDescription ?? EMPTY_PAIR,
    ogImageId: season?.seo.ogImageId ?? "",
  },
});

export const SEASON_PROBLEM_CODES = [
  "nameArRequired",
  "nameEnRequired",
  "slugInvalid",
  "shortNameRequired",
  "taglinePair",
  "startRequired",
  "endRequired",
  "rangeInverted",
  "phaseIncomplete",
  "phaseInverted",
  "phaseOutsideSeason",
  "phaseSameTypeOverlap",
  "keyDateIncomplete",
  "keyDateOutsideSeason",
  "aboutArRequired",
  "aboutEnRequired",
  "closingSummaryPair",
  "seoTitlePair",
  "seoDescriptionPair",
] as const;
export type SeasonProblemCode = (typeof SEASON_PROBLEM_CODES)[number];

/** One problem, and the row it belongs to for the two row editors. */
export interface SeasonProblem {
  code: SeasonProblemCode;
  row?: number;
}

type PairState = "empty" | "complete" | "half";

const pairState = (ar: string, en: string): PairState => {
  const hasAr = ar.trim() !== "";
  const hasEn = en.trim() !== "";
  if (hasAr && hasEn) return "complete";
  return hasAr || hasEn ? "half" : "empty";
};


/**
 * Everything that would make the save fail, in the order the form draws it.
 *
 * A function of the draft, called at the press rather than memoised at
 * render: the state it judges is the state when the editor asked to save
 * (CLAUDE.md §31).
 *
 * Every day is inclusive (`season-dates.ts`): a one-day season starts and
 * ends on the same day, and a phase may end on the season's last day. Phases
 * and key dates stay inside the season's days. Two phases of the same type
 * may not share a day; phases of different types may — registration runs
 * during competition on purpose. The API checks the same rules and is the
 * arbiter; these exist so the editor is told beside the field, before a
 * round trip. `YYYY-MM-DD` compares correctly as text, so no date object is
 * built for it.
 */
/** Whether two complete phases of one type share at least one day. Each
 *  range includes both its ends. */
const sameTypeOverlap = (a: PhaseDraft, b: PhaseDraft): boolean =>
  a.type !== "" &&
  a.type === b.type &&
  isDay(a.from) &&
  isDay(a.to) &&
  a.from <= a.to &&
  a.from <= b.to &&
  b.from <= a.to;

export const draftProblems = (draft: SeasonDraft, creating: boolean): SeasonProblem[] => {
  const problems: SeasonProblem[] = [];
  const add = (code: SeasonProblemCode, row?: number) => problems.push(row === undefined ? { code } : { code, row });

  if (draft.nameAr.trim() === "") add("nameArRequired");
  if (draft.nameEn.trim() === "") add("nameEnRequired");
  // The address is set once: `UpdateSeasonDto` omits it.
  if (creating && !SLUG_PATTERN.test(draft.slug)) add("slugInvalid");
  if (draft.shortName.trim() === "") add("shortNameRequired");
  if (pairState(draft.taglineAr, draft.taglineEn) === "half") add("taglinePair");

  const hasStart = isDay(draft.start);
  const hasEnd = isDay(draft.end);
  if (!hasStart) add("startRequired");
  if (!hasEnd) add("endRequired");
  const rangeKnown = hasStart && hasEnd;
  if (rangeKnown && draft.start > draft.end) add("rangeInverted");

  draft.phases.forEach((phase, row) => {
    if (pairState(phase.nameAr, phase.nameEn) !== "complete" || phase.type === "" || !isDay(phase.from) || !isDay(phase.to)) {
      add("phaseIncomplete", row);
      return;
    }
    if (phase.to < phase.from) add("phaseInverted", row);
    else if (rangeKnown && (phase.from < draft.start || phase.to > draft.end)) add("phaseOutsideSeason", row);
    else if (draft.phases.slice(0, row).some((earlier) => sameTypeOverlap(earlier, phase))) {
      add("phaseSameTypeOverlap", row);
    }
  });

  draft.keyDates.forEach((entry, row) => {
    if (pairState(entry.titleAr, entry.titleEn) !== "complete" || !isDay(entry.date)) {
      add("keyDateIncomplete", row);
      return;
    }
    if (rangeKnown && (entry.date < draft.start || entry.date > draft.end)) add("keyDateOutsideSeason", row);
  });

  if (draft.aboutAr.trim() === "") add("aboutArRequired");
  if (draft.aboutEn.trim() === "") add("aboutEnRequired");
  if (pairState(draft.closingAr, draft.closingEn) === "half") add("closingSummaryPair");
  if (pairState(draft.seo.metaTitle.ar, draft.seo.metaTitle.en) === "half") add("seoTitlePair");
  if (pairState(draft.seo.metaDescription.ar, draft.seo.metaDescription.en) === "half") add("seoDescriptionPair");

  return problems;
};

const trimmedPair = (ar: string, en: string): LocalizedText | null =>
  pairState(ar, en) === "complete" ? { ar: ar.trim(), en: en.trim() } : null;

/** Days as instants. Only called on a draft with no problems, so every day
 *  is well-formed; the `?? ""` never reaches the API. */
const instant = (day: string): string => dayToInstant(day) ?? "";

const phasesBody = (draft: SeasonDraft) =>
  draft.phases.map((phase) => ({
    name: { ar: phase.nameAr.trim(), en: phase.nameEn.trim() },
    type: phase.type,
    from: instant(phase.from),
    to: instant(phase.to),
  }));

const keyDatesBody = (draft: SeasonDraft) =>
  draft.keyDates.map((entry) => ({
    title: { ar: entry.titleAr.trim(), en: entry.titleEn.trim() },
    date: instant(entry.date),
  }));

/** `PageSeoDto`: each empty field left out, which `toPageSeo` stores as
 *  `null` — so an emptied field is cleared on an edit, not kept. */
const seoBody = (seo: SeoDraft): Record<string, unknown> => {
  const metaTitle = trimmedPair(seo.metaTitle.ar, seo.metaTitle.en);
  const metaDescription = trimmedPair(seo.metaDescription.ar, seo.metaDescription.en);
  return {
    ...(metaTitle ? { metaTitle } : {}),
    ...(metaDescription ? { metaDescription } : {}),
    ...(seo.ogImageId ? { ogImageId: seo.ogImageId } : {}),
  };
};

const shared = (draft: SeasonDraft): Record<string, unknown> => ({
  name: { ar: draft.nameAr.trim(), en: draft.nameEn.trim() },
  shortName: draft.shortName.trim(),
  about: { ar: draft.aboutAr.trim(), en: draft.aboutEn.trim() },
  startDate: instant(draft.start),
  endDate: instant(draft.end),
  phases: phasesBody(draft),
  keyDates: keyDatesBody(draft),
  documentIds: draft.documentIds,
  isVisible: draft.isVisible,
  seo: seoBody(draft.seo),
});

const OPTIONAL_IDS = ["logoId", "bannerId", "shareImageId", "calendarDocumentId"] as const;

/**
 * `POST /seasons`'s body. Always a draft: `Published` is the separate publish
 * step, and a season created straight into `Archived` is not something the
 * list or the form offers. Empty optional fields are left out — the create
 * DTO's optional fields are not nullable.
 */
export const toCreateBody = (draft: SeasonDraft): Record<string, unknown> => {
  const tagline = trimmedPair(draft.taglineAr, draft.taglineEn);
  const closingSummary = trimmedPair(draft.closingAr, draft.closingEn);
  const ids = Object.fromEntries(OPTIONAL_IDS.flatMap((key) => (draft[key] ? [[key, draft[key]]] : [])));
  return {
    ...shared(draft),
    slug: draft.slug,
    publicationState: "Draft",
    ...(tagline ? { tagline } : {}),
    ...(closingSummary ? { closingSummary } : {}),
    ...ids,
  };
};

/**
 * `PATCH /seasons/:id`'s body: every editable field, with `null` where the
 * editor emptied one the API can clear. Sent whole rather than diffed — a
 * full body is last-write-wins, which is what an editor pressing Save means.
 */
export const toPatchBody = (draft: SeasonDraft): Record<string, unknown> => ({
  ...shared(draft),
  tagline: trimmedPair(draft.taglineAr, draft.taglineEn),
  closingSummary: trimmedPair(draft.closingAr, draft.closingEn),
  ...Object.fromEntries(OPTIONAL_IDS.map((key) => [key, draft[key] || null])),
});

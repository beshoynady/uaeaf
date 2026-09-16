import type { LocalizedText } from "@/lib/api/types";
import { editorialDraft, type PageSeo, type SeoDraft } from "@/lib/admin/editorial-draft";
import {
  fromStoredList,
  toStoredList,
  type PlanListItemDraft,
  type PlanListKind,
  type PlanMetricDraft,
  type PlanPhaseDraft,
  type PlanStepDraft,
  type StoredPlanItem,
  type StoredPlanMetric,
  type StoredPlanPhase,
  type StoredPlanStep,
} from "@/lib/admin/plan-lists";

/**
 * The Strategic Plan page as its screen edits it (ADR-0075).
 *
 * The scalar fields — titles, texts, pictures, SEO — go through
 * `editorialDraft`, as every editorial screen's do. The five lists do not:
 * their items carry an `_id` and a visibility, which `editorialDraft`'s
 * "blocks" kind knows nothing about, so they are held by `plan-lists.ts` and
 * joined here. Either way a save sends only what changed, and a changed list
 * is sent whole, because its order is part of its meaning.
 */

export interface StrategicPlanResponse {
  _id: string;
  heroImageId: string | null;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  introHeading: LocalizedText;
  introText: LocalizedText;
  introImageId: string | null;
  phasesTitle: LocalizedText | null;
  phases: StoredPlanPhase[];
  pillarsTitle: LocalizedText;
  pillarsText: LocalizedText | null;
  pillars: StoredPlanItem[];
  objectivesTitle: LocalizedText;
  objectivesImageId: string | null;
  objectives: StoredPlanItem[];
  metricsTitle: LocalizedText;
  metricsImageId: string | null;
  metrics: StoredPlanMetric[];
  executionTitle: LocalizedText;
  executionText: LocalizedText | null;
  executionSteps: StoredPlanStep[];
  ctaTitle: LocalizedText;
  ctaText: LocalizedText | null;
  ctaImageId: string | null;
  seo: PageSeo | null;
  publicationState: string;
  /** Read only to order the collection when the URL names no record. */
  createdAt: string;
  updatedAt: string;
}

/** The fields `editorialDraft` handles. */
interface StrategicPlanScalars {
  heroImageId: string;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  introHeading: LocalizedText;
  introText: LocalizedText;
  introImageId: string;
  phasesTitle: LocalizedText;
  pillarsTitle: LocalizedText;
  pillarsText: LocalizedText;
  objectivesTitle: LocalizedText;
  objectivesImageId: string;
  metricsTitle: LocalizedText;
  metricsImageId: string;
  executionTitle: LocalizedText;
  executionText: LocalizedText;
  ctaTitle: LocalizedText;
  ctaText: LocalizedText;
  ctaImageId: string;
  seo: SeoDraft;
}

export interface StrategicPlanDraft extends StrategicPlanScalars {
  phases: PlanPhaseDraft[];
  pillars: PlanListItemDraft[];
  objectives: PlanListItemDraft[];
  metrics: PlanMetricDraft[];
  executionSteps: PlanStepDraft[];
}

export type StrategicPlanListField = "phases" | "pillars" | "objectives" | "metrics" | "executionSteps";

/** Which item shape each list holds — the one fact the list field and the
 *  save body both need. */
export const LIST_KINDS: Readonly<Record<StrategicPlanListField, PlanListKind>> = {
  phases: "phase",
  pillars: "item",
  objectives: "item",
  metrics: "metric",
  executionSteps: "step",
};

const LIST_FIELDS = Object.keys(LIST_KINDS) as StrategicPlanListField[];

/** `federationId`, `publicationState` and `revisionId` are not fields of the
 *  draft, so they are never sent. The four optional texts are the ones the
 *  API stores as `null` when cleared. */
const scalars = editorialDraft<StrategicPlanResponse, StrategicPlanScalars>({
  heroImageId: "image",
  heroTitle: "text",
  heroSubtitle: "text",
  introHeading: "text",
  introText: "text",
  introImageId: "image",
  phasesTitle: "optionalText",
  pillarsTitle: "text",
  pillarsText: "optionalText",
  objectivesTitle: "text",
  objectivesImageId: "image",
  metricsTitle: "text",
  metricsImageId: "image",
  executionTitle: "text",
  executionText: "optionalText",
  ctaTitle: "text",
  ctaText: "optionalText",
  ctaImageId: "image",
  seo: "seo",
});

export const toDraft = (record: StrategicPlanResponse): StrategicPlanDraft => ({
  ...scalars.toDraft(record),
  phases: fromStoredList("phase", record.phases ?? []),
  pillars: fromStoredList("item", record.pillars ?? []),
  objectives: fromStoredList("item", record.objectives ?? []),
  metrics: fromStoredList("metric", record.metrics ?? []),
  executionSteps: fromStoredList("step", record.executionSteps ?? []),
});

/** A list compares by value: reference equality first, and the JSON form
 *  when that fails — the same fast path `editorialDraft` takes. */
const sameList = (left: unknown, right: unknown): boolean =>
  left === right || JSON.stringify(left) === JSON.stringify(right);

const changedLists = (original: StrategicPlanDraft, draft: StrategicPlanDraft): StrategicPlanListField[] =>
  LIST_FIELDS.filter((field) => !sameList(original[field], draft[field]));

export const changedFrom = (original: StrategicPlanDraft, draft: StrategicPlanDraft): string[] => [
  ...scalars.changedFrom(original, draft),
  ...changedLists(original, draft),
];

/** The request body for a save: only the fields that changed, each changed
 *  list whole and in the API's shape. */
export const toPatchBody = (original: StrategicPlanDraft, draft: StrategicPlanDraft): Record<string, unknown> => ({
  ...scalars.toPatchBody(original, draft),
  ...Object.fromEntries(
    changedLists(original, draft).map((field) => [field, storedList(field, draft)]),
  ),
});

const storedList = (field: StrategicPlanListField, draft: StrategicPlanDraft): unknown => {
  switch (field) {
    case "phases":
      return toStoredList("phase", draft.phases);
    case "metrics":
      return toStoredList("metric", draft.metrics);
    case "executionSteps":
      return toStoredList("step", draft.executionSteps);
    case "pillars":
      return toStoredList("item", draft.pillars);
    case "objectives":
      return toStoredList("item", draft.objectives);
  }
};

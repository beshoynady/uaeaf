import type { LocalizedText } from "@/lib/api/types";

/**
 * The five lists of the strategic plan — phases, pillars, objectives, metrics,
 * execution steps — as the screen edits them and as the API stores them.
 *
 * Not `content-blocks.ts`: those lists have no identity and no visibility.
 * These do. Every stored item carries an `_id` the API keeps when the item is
 * sent back, and `isVisible`, which lets an editor take an item off the page
 * without deleting what it says. A list is still sent whole, because order
 * is content and `displayOrder` is the field that says it — so every
 * operation here returns a new list renumbered from 1, and the positions and
 * the numbers can never disagree.
 *
 * An item with no `_id` is new; the API generates one. Nothing here invents
 * an id, which is what keeps "new" and "existing" a fact rather than a guess.
 */

/** Which of the four item shapes a list holds. */
export type PlanListKind = "item" | "phase" | "metric" | "step";

/**
 * How many items a list drawn as one row holds (ADR-0075, owner decision
 * 2026-09-16): the plan's phases and its execution steps. The API refuses the
 * eleventh with `listTooLong`; this is the same number, so the screen refuses
 * it first and says why. Kept beside the list helpers rather than imported,
 * because the dashboard does not depend on the API's package — the two are
 * held together by `plan-lists.spec.ts` and by the API's own spec.
 */
export const MAX_PLAN_ROW_ITEMS = 10;

interface PlanListBase {
  _id?: string;
  displayOrder: number;
  isVisible: boolean;
}

/** A pillar or an objective. */
export interface PlanListItemDraft extends PlanListBase {
  title: LocalizedText;
  description: LocalizedText;
}

/** A phase card: one of the four plan glyphs. */
export interface PlanPhaseDraft extends PlanListItemDraft {
  iconKey: string;
}

/** A KPI card: a free-text figure with a bilingual label. */
export interface PlanMetricDraft extends PlanListBase {
  value: string;
  label: LocalizedText;
}

/** One step of the execution chain. Its description is optional upstream
 *  (`null`), edited here as an empty pair so its inputs stay controlled. */
export interface PlanStepDraft extends PlanListBase {
  title: LocalizedText;
  description: LocalizedText;
}

export type PlanListDraft = PlanListItemDraft | PlanPhaseDraft | PlanMetricDraft | PlanStepDraft;

/** The item shape a kind edits. */
export type DraftOf<K extends PlanListKind> = K extends "phase"
  ? PlanPhaseDraft
  : K extends "metric"
    ? PlanMetricDraft
    : K extends "step"
      ? PlanStepDraft
      : PlanListItemDraft;

/**
 * The shapes the API returns. `isVisible` may be absent on rows written
 * before the field existed, and a step's description may be `null`.
 */
export interface StoredPlanItem {
  _id?: string;
  title: LocalizedText;
  description: LocalizedText;
  displayOrder: number;
  isVisible?: boolean;
}

export interface StoredPlanPhase extends StoredPlanItem {
  iconKey: string;
}

export interface StoredPlanMetric {
  _id?: string;
  value: string;
  label: LocalizedText;
  displayOrder: number;
  isVisible?: boolean;
}

export interface StoredPlanStep {
  _id?: string;
  title: LocalizedText;
  description: LocalizedText | null;
  displayOrder: number;
  isVisible?: boolean;
}

export type StoredOf<K extends PlanListKind> = K extends "phase"
  ? StoredPlanPhase
  : K extends "metric"
    ? StoredPlanMetric
    : K extends "step"
      ? StoredPlanStep
      : StoredPlanItem;

const EMPTY_TEXT: LocalizedText = { ar: "", en: "" };

const textOr = (value: LocalizedText | null | undefined): LocalizedText =>
  value ? { ar: value.ar ?? "", en: value.en ?? "" } : { ...EMPTY_TEXT };

const isBlank = (value: LocalizedText): boolean => value.ar.trim() === "" && value.en.trim() === "";

export const renumber = <T extends PlanListBase>(items: readonly T[]): T[] =>
  items.map((item, index) => ({ ...item, displayOrder: index + 1 }));

/** Sorted by the order the entries declare rather than the order they
 *  arrived in, then renumbered: a list drawn in arrival order would renumber
 *  itself the first time anything moved. */
export const sortItems = <T extends PlanListBase>(items: readonly T[]): T[] =>
  renumber([...items].sort((left, right) => left.displayOrder - right.displayOrder));

/**
 * Moves one entry to any position — a drag lands wherever it is dropped, and
 * the up/down buttons are the one-step case. Out-of-range or no-op moves
 * return the list unchanged, renumbered, so a caller need not check first.
 */
export const moveItem = <T extends PlanListBase>(items: readonly T[], from: number, to: number): T[] => {
  const inRange = (index: number) => index >= 0 && index < items.length;
  if (!inRange(from) || !inRange(to) || from === to) {
    return renumber(items);
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return renumber(next);
};

export const removeItem = <T extends PlanListBase>(items: readonly T[], index: number): T[] =>
  renumber(items.filter((_, position) => position !== index));

/** The template carries no `_id`, and none is invented: the API tells a new
 *  item from a stored one by exactly that absence. */
export const appendItem = <T extends PlanListBase>(items: readonly T[], template: Omit<T, "displayOrder" | "_id">): T[] =>
  renumber([...items, { ...template, displayOrder: items.length + 1 } as T]);

export const toggleVisible = <T extends PlanListBase>(items: readonly T[], index: number): T[] =>
  items.map((item, position) => (position === index ? { ...item, isVisible: !item.isVisible } : item));

/**
 * The stored list as the form holds it: visible unless told otherwise, a
 * step's `null` description as an empty pair, sorted and renumbered.
 */
export const fromStoredList = <K extends PlanListKind>(kind: K, stored: readonly StoredOf<K>[]): DraftOf<K>[] =>
  sortItems(
    stored.map((item) => {
      const visible = item.isVisible ?? true;
      if (kind === "step") {
        const step = item as StoredPlanStep;
        return { ...step, description: textOr(step.description), isVisible: visible };
      }
      return { ...item, isVisible: visible };
    }) as DraftOf<K>[],
  );

/**
 * The form's list as the API takes it: renumbered, nothing dropped (a hidden
 * item is sent with `isVisible: false`, not left out), and a step's blank
 * description sent as `null` — the API's way of clearing it. A pillar's or
 * objective's blank description is sent as it is, because it is required
 * upstream and the refusal is the author's to see.
 */
export const toStoredList = <K extends PlanListKind>(kind: K, items: readonly DraftOf<K>[]): StoredOf<K>[] =>
  renumber(items).map((item) => {
    if (kind === "step") {
      const step = item as PlanStepDraft;
      return { ...step, description: isBlank(step.description) ? null : step.description };
    }
    return item;
  }) as StoredOf<K>[];

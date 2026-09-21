/**
 * The approval-policy screen's shapes and its one piece of arithmetic.
 *
 * Mirrors `ApprovalConfigurationService` upstream. The translation from a
 * choice into steps happens on the server — this only has to refuse a choice
 * the server would refuse, so the administrator is told at the control they
 * just moved rather than by a rejected save.
 */

export const APPROVAL_MODES = ["ALL", "THRESHOLD", "SEQUENTIAL"] as const;
export type ApprovalMode = (typeof APPROVAL_MODES)[number];

/** One entity type's arrangement, as `GET /workflow-policies/governable`
 *  reports it. */
export interface GovernableEntity {
  entityType: string;
  enabled: boolean;
  mode: ApprovalMode | null;
  approverIds: string[];
  threshold: number;
  /**
   * Reviews running right now under this type's arrangement.
   *
   * Above zero, changing who decides is refused upstream: replacing the steps
   * archives the one each running review points at, which would leave them
   * undecidable. The screen states the number before the administrator edits,
   * so the lock is a fact they can see rather than a save that fails.
   */
  inFlightReviews: number;
}

/** What the screen sends back for one type. */
export interface ApprovalChoice {
  enabled: boolean;
  mode?: ApprovalMode;
  approverIds?: string[];
  threshold?: number;
}

/**
 * Why the server would not save, when it would not.
 *
 * Returned rather than thrown so the screen has one path for "refused" and one
 * for "broke", and so a refusal the administrator can act on does not arrive as
 * an exception. `inFlightReviews` travels with `reviewsInFlight`: the screen's
 * own count was read when the page loaded, and the whole point of this arriving
 * is that a review started after that.
 */
export interface ApprovalSaveRefusal {
  code: string;
  inFlightReviews?: number;
}

/** A person who can be named as an approver. */
export interface ApproverOption {
  id: string;
  name: { ar: string; en: string };
  email: string;
}

export interface ApprovalChoiceErrors {
  approvers?: boolean;
  threshold?: boolean;
}

/**
 * Whether the server would accept this choice.
 *
 * Two refusals, both of which the server also makes — this is the earlier half
 * of the pair, not a substitute for it. A threshold above the number of
 * distinct approvers describes a step nobody could ever satisfy: every article
 * reaching it would stop there permanently, with nothing on any screen to say
 * why. Catching it at the control makes it a correction rather than a defect.
 *
 * Counted as a set, because the engine counts distinct approvers: the same
 * person named twice raises the apparent headcount without raising the real
 * one.
 */
export const validateApprovalChoice = (choice: ApprovalChoice): ApprovalChoiceErrors => {
  if (!choice.enabled) {
    // Turning approvals off needs no approvers and no threshold.
    return {};
  }

  const errors: ApprovalChoiceErrors = {};
  const distinct = new Set(choice.approverIds ?? []).size;

  if (distinct === 0) {
    errors.approvers = true;
    return errors;
  }

  const required = choice.mode === "ALL" ? distinct : (choice.threshold ?? 1);
  if (required > distinct) {
    errors.threshold = true;
  }

  return errors;
};

export const hasApprovalErrors = (errors: ApprovalChoiceErrors): boolean =>
  Object.keys(errors).length > 0;

/**
 * How many approvals this arrangement actually needs.
 *
 * Shown beside the controls so an administrator can read the consequence of
 * what they chose without inferring it: "3 of 5" and "each in turn" are the
 * two things they are deciding between, and neither is visible from a mode
 * name alone.
 */
export const requiredApprovals = (choice: ApprovalChoice): number => {
  const distinct = new Set(choice.approverIds ?? []).size;
  if (choice.mode === "ALL") return distinct;
  if (choice.mode === "SEQUENTIAL") return distinct;
  return Math.min(choice.threshold ?? 1, distinct);
};

/**
 * What an arrangement MEANS, as one comparable string.
 *
 * Mirrors `arrangementShape` on the server exactly, mode by mode, because the
 * two must agree on one question: did the administrator actually change who
 * decides? Disagreeing in either direction is a defect. Stricter here locks a
 * save the server would have accepted; looser lets a save through to be
 * refused, which is the silent failure this screen exists to remove.
 *
 * - ALL and THRESHOLD are one step holding everybody, so the approvers are
 *   compared as a set — reordering the checkboxes changes nothing the engine
 *   would do.
 * - SEQUENTIAL is one step per approver, so the order IS the arrangement.
 */
export const arrangementShape = (
  mode: ApprovalMode | null,
  approverIds: readonly string[],
  threshold: number,
): string => {
  const distinct = [...new Set(approverIds)];
  if (distinct.length === 0) return "";

  if (mode === "SEQUENTIAL") {
    return distinct.map((id) => `${id}:1`).join("|");
  }

  const required = mode === "ALL" ? distinct.length : threshold;
  return `${[...distinct].sort().join(",")}:${required}`;
};

/**
 * Whether this draft would change the arrangement the server currently holds.
 *
 * The lock is about changing who decides, not about saving. Switching approval
 * off touches no step and strands no review, and re-saving an unchanged
 * arrangement writes nothing — refusing either would leave an administrator
 * unable to correct a policy at exactly the moment work depends on it.
 */
export const changesArrangement = (entity: GovernableEntity, draft: ApprovalChoice): boolean => {
  if (!draft.enabled) return false;

  return (
    arrangementShape(entity.mode, entity.approverIds, entity.threshold) !==
    arrangementShape(draft.mode ?? null, draft.approverIds ?? [], draft.threshold ?? 1)
  );
};

/**
 * Whether this draft differs from what is stored at all.
 *
 * Wider than `changesArrangement`, which answers only about who decides:
 * switching review on or off is a change too, and it is the one an
 * administrator makes most often.
 *
 * What it is for: the row offers to save only once there is something to save.
 * Twelve rows each carrying a primary button spends the screen's loudest
 * control on eleven rows nobody has touched, and buries the one that matters.
 */
export const differsFromSaved = (entity: GovernableEntity, draft: ApprovalChoice): boolean =>
  draft.enabled !== entity.enabled || changesArrangement(entity, draft);

/**
 * Moving one approver up or down a sequential arrangement.
 *
 * Returned as a new list rather than mutated, because the caller holds it in
 * React state. A move off either end is a no-op rather than a wrap: an
 * administrator pressing "up" on the first approver means "nothing happens",
 * not "send them to the back".
 */
export const moveApprover = (
  approverIds: readonly string[],
  from: number,
  direction: -1 | 1,
): string[] => {
  const to = from + direction;
  if (from < 0 || from >= approverIds.length || to < 0 || to >= approverIds.length) {
    return [...approverIds];
  }

  const next = [...approverIds];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
};

/**
 * Whether this arrangement is one nobody could ever satisfy.
 *
 * Two shapes, and the second is the deadlock the API refuses with
 * `unsatisfiablePolicy`: review is required and no approver is named, so
 * nothing of that type could ever be published. Said here so the control
 * refuses before the save does, which is the pairing every other refusal on
 * this screen already uses.
 */
export const isDeadlocked = (choice: ApprovalChoice): boolean =>
  choice.enabled && new Set(choice.approverIds ?? []).size === 0;

/**
 * The one sentence a row leads with: who decides, and how many of them.
 *
 * The screen's whole reframing rests on this. An `enum` value, a mode name and
 * a count of checked boxes are three facts an administrator has to assemble in
 * their head before they know whether the arrangement is the one they meant.
 * Assembled here instead, so the row answers "who approves this" before it
 * offers to change it.
 *
 * Returns the parts rather than a string: the sentence is built in the
 * catalogues, where the two languages order it differently.
 */
export interface ArrangementSummary {
  /** How many approvals a submission needs to clear. */
  required: number;
  /** How many people could give one. */
  total: number;
  /** True where they decide one after another rather than together. */
  inTurn: boolean;
  /** The approvers' own names, in the order the policy holds them. */
  names: string[];
}

export const describeArrangement = (
  entity: GovernableEntity,
  approvers: readonly ApproverOption[],
  locale: "ar" | "en",
): ArrangementSummary => {
  const distinct = [...new Set(entity.approverIds)];
  const byId = new Map(approvers.map((approver) => [approver.id, approver]));

  return {
    required: entity.mode === "THRESHOLD" ? Math.min(entity.threshold, distinct.length) : distinct.length,
    total: distinct.length,
    inTurn: entity.mode === "SEQUENTIAL",
    // An id with no account behind it keeps its place rather than vanishing:
    // a policy naming somebody who has since been deleted is a thing the
    // administrator needs to see, not a silently shorter list.
    names: distinct.map((id) => {
      const approver = byId.get(id);
      return approver ? approver.name[locale] || approver.email : id;
    }),
  };
};

/** Message key for an entity type's readable name, so the label lives in the
 *  catalogues rather than being derived from an identifier. */
export const entityMessageKey = (entityType: string): string => `entity_${entityType}`;

/**
 * The stored arrangement, as a draft the screen can edit.
 *
 * One definition for three uses that must agree: the draft a type opens with,
 * what "discard changes" returns to, and what "apply to the group" copies —
 * the saved arrangement, never an unsaved edit. A fresh array, so editing the
 * draft can never reach the props it came from.
 */
export const savedChoice = (entity: GovernableEntity): ApprovalChoice => ({
  enabled: entity.enabled,
  mode: entity.mode ?? "THRESHOLD",
  approverIds: [...entity.approverIds],
  threshold: entity.threshold,
});

/**
 * Whether a type's stored arrangement cannot work as it stands.
 *
 * Two shapes, both only while approval is required: nobody is named (the
 * deadlock `isDeadlocked` describes), or somebody is named whose account no
 * longer exists, so their decision can never arrive. A type that publishes
 * directly consults nobody, so what it names stops nothing.
 */
export const needsAttention = (entity: GovernableEntity, approvers: readonly ApproverOption[]): boolean => {
  if (!entity.enabled) return false;
  const distinct = new Set(entity.approverIds);
  if (distinct.size === 0) return true;
  const known = new Set(approvers.map((approver) => approver.id));
  return [...distinct].some((id) => !known.has(id));
};

/**
 * The four views of the list.
 *
 * Only two states are stored — approval required, or published directly — so
 * those are two of the filters, and the third is the derived one an
 * administrator acts on.
 */
export const POLICY_FILTERS = ["all", "required", "direct", "attention"] as const;
export type PolicyFilter = (typeof POLICY_FILTERS)[number];

export const matchesFilter = (
  entity: GovernableEntity,
  filter: PolicyFilter,
  approvers: readonly ApproverOption[],
): boolean => {
  if (filter === "required") return entity.enabled;
  if (filter === "direct") return !entity.enabled;
  if (filter === "attention") return needsAttention(entity, approvers);
  return true;
};

/** The screen's three figures, counted over every type rather than over the
 *  rows a filter happens to show. */
export interface PolicyStats {
  required: number;
  total: number;
  inReview: number;
  attention: number;
}

export const policyStats = (
  entities: readonly GovernableEntity[],
  approvers: readonly ApproverOption[],
): PolicyStats => ({
  required: entities.filter((entity) => entity.enabled).length,
  total: entities.length,
  inReview: entities.reduce((sum, entity) => sum + entity.inFlightReviews, 0),
  attention: entities.filter((entity) => needsAttention(entity, approvers)).length,
});

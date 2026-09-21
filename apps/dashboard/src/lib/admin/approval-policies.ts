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

/** Message key for an entity type's readable name, so the label lives in the
 *  catalogues rather than being derived from an identifier. */
export const entityMessageKey = (entityType: string): string => `entity_${entityType}`;

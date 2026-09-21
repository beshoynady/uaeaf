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
}

/** What the screen sends back for one type. */
export interface ApprovalChoice {
  enabled: boolean;
  mode?: ApprovalMode;
  approverIds?: string[];
  threshold?: number;
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

/** Message key for an entity type's readable name, so the label lives in the
 *  catalogues rather than being derived from an identifier. */
export const entityMessageKey = (entityType: string): string => `entity_${entityType}`;

import type { LocalizedText } from "@/lib/api/types";
import { isInstanceAction } from "./editorial-entities";

/**
 * The editorial state of one record, exactly as the API reports it.
 *
 * Every field here is decided on the server. The dashboard re-derives none
 * of it: which actions a person may take depends on the publishing policy,
 * four permissions, whether a review is running and whether this reader is
 * handling its current step — four rules the browser would have to
 * re-implement, and four chances to offer a button the API then refuses.
 *
 * `GET /<entity>/:id/editorial-state` is the one source, and
 * `EditorialStateDto` in the API is its declaration. This file is the mirror
 * of that declaration, not a second opinion about it.
 */

/** Someone the panel names. A name, never the account behind it. */
export interface EditorialActor {
  id: string;
  name: LocalizedText | null;
}

/**
 * Why a record may not be published yet.
 *
 * `pendingContent` is copy the client has not supplied — nobody on the
 * editorial side can clear it. `missingRequired` is a field the editor can
 * fill now. They are listed together and told apart by their words, because
 * the reader's next move differs.
 */
export const PUBLISH_BLOCKER_KINDS = ["pendingContent", "missingRequired"] as const;
export type PublishBlockerKind = (typeof PUBLISH_BLOCKER_KINDS)[number];

export interface PublishBlocker {
  kind: PublishBlockerKind;
  /** The record path, e.g. `pullQuote.en`. */
  field: string;
}

/** How this entity type reaches the public site. `blocked` is not a failure
 *  of this record: no usable policy is configured for the type at all. */
export type PublishingMode = "workflow" | "direct" | "blocked";

export type WorkflowInstanceStatus = "InProgress" | "Approved" | "Rejected" | "Returned";

export type WorkflowStepType = "Sequential" | "Parallel";

export interface WorkflowStepSummary {
  id: string;
  sequenceOrder: number;
  stepType: WorkflowStepType;
  requiredApprovals: number;
  /** Distinct approvers so far in the current submission cycle. */
  approvals: number;
  assignees: EditorialActor[];
  isCurrent: boolean;
}

export interface WorkflowSummary {
  instanceId: string;
  definitionName: LocalizedText | null;
  status: WorkflowInstanceStatus;
  steps: WorkflowStepSummary[];
}

export const WORKFLOW_HISTORY_ACTIONS = [
  "Submitted",
  "Resubmitted",
  "Approved",
  "Rejected",
  "Returned",
  "Delegated",
] as const;
export type WorkflowHistoryAction = (typeof WORKFLOW_HISTORY_ACTIONS)[number];

export interface EditorialHistoryEntry {
  id: string;
  action: WorkflowHistoryAction;
  actor: EditorialActor;
  reason: string | null;
  actionDate: string;
  workflowStepId: string;
  returnedToStepId: string | null;
}

/**
 * Everything the API reports as available, `save` included.
 *
 * Deliberately not the same list as `EDITORIAL_ACTIONS` in
 * `editorial-entities.ts`. That one is the closed set of *routes* the BFF may
 * forward to and carries `restore`; this one is the closed set of *answers*
 * the API gives about a record and carries `save`. Saving is a `PATCH` with a
 * body of content, not a decision, and restoring is offered by the version
 * panel rather than reported by this state. Merging them would put a name in
 * each list that the other cannot honour.
 */
export const EDITORIAL_STATE_ACTIONS = [
  "save",
  "submit",
  "resubmit",
  "publish",
  // Putting a finished approval on the site — served by `publish-approved`,
  // not by `publish`, which is the no-review path and refuses with 409 under
  // any policy that requires review. One name for both meant the only route
  // to the site for an approved article published nothing at all.
  "publishApproved",
  "approve",
  "reject",
  "return",
] as const;
export type EditorialStateAction = (typeof EDITORIAL_STATE_ACTIONS)[number];

export interface EditorialState {
  publicationState: string;
  mode: PublishingMode;
  blockedReason: string | null;
  publishedAt: string | null;
  publishedBy: EditorialActor | null;
  workflowInstanceId: string | null;
  workflowStatus: WorkflowInstanceStatus | null;
  currentStepId: string | null;
  canEdit: boolean;
  availableActions: EditorialStateAction[];
  /**
   * What this reader could do if the draft were ready, and cannot only
   * because it is not.
   *
   * Its own list rather than something derived from `availableActions` and
   * `publishBlockers`: an action is absent from `availableActions` whether
   * the reader lacks the permission, a review is running, or the content is
   * not ready — one absence, three causes, and only this one is a control
   * worth drawing disabled with the readiness list bound to it.
   */
  blockedByReadiness: EditorialStateAction[];
  updatedAt: string | null;
  publishBlockers: PublishBlocker[];
  workflow: WorkflowSummary | null;
  history: EditorialHistoryEntry[];
}

/**
 * The decisions the status panel draws buttons for, in the order it draws
 * them.
 *
 * `save` is absent on purpose: the editor's own bar owns saving, and a second
 * save button in a second place would leave an author unsure which one their
 * unsaved work belongs to.
 *
 * The order is the escalation of ADR-0016 read as consequence: what moves the
 * record forward first, what sends it back last. `reject` ends the cycle, so
 * it is last and carries the destructive variant.
 */
export const PANEL_ACTIONS = [
  "publish",
  // Beside `publish` because it is the same move for the reader — the record
  // goes on the site — and never offered at the same time: the server reports
  // one or the other depending on whether an approval is standing.
  "publishApproved",
  "submit",
  "resubmit",
  "approve",
  "return",
  "reject",
] as const;
export type PanelAction = (typeof PANEL_ACTIONS)[number];

/**
 * Which buttons to draw — the server's list, intersected with the ones this
 * panel knows how to draw, and nothing else.
 *
 * The intersection runs this way round (panel order filtered by the server's
 * answer) rather than the other, so an action the API starts reporting that
 * this panel has no button, no confirmation and no copy for is ignored rather
 * than rendered as a bare key.
 */
export const panelActions = (state: EditorialState): PanelAction[] => {
  return drawable(state.availableActions);
};

/**
 * The intersection itself, so the cast lives in one place.
 *
 * Both selectors run it the same way round for the same reason; written twice,
 * the cast was two casts, and a correction to one of them would have been a
 * correction to half the panel.
 */
const drawable = (list: readonly string[]): PanelAction[] => {
  return PANEL_ACTIONS.filter((action) => list.includes(action));
};

/**
 * Buttons to draw disabled, with the readiness list as their description.
 *
 * Same intersection, same direction, same reason as `panelActions`: the
 * server's answer filtered by what this panel can draw, so an action it has
 * no button for is ignored rather than rendered as a bare key.
 */
export const readinessHeldActions = (state: EditorialState): PanelAction[] => {
  return drawable(state.blockedByReadiness);
};

/** Actions the API refuses without an explanation (`@MinLength(1)` on both),
 *  so the panel must refuse to send one without it too. */
export const ACTIONS_NEEDING_REASON: readonly PanelAction[] = ["reject", "return"];

export const needsReason = (action: PanelAction): boolean => {
  return ACTIONS_NEEDING_REASON.includes(action);
};

/**
 * Which id this action is sent against.
 *
 * The three review decisions are mounted on `workflow-instances/:id`, which is
 * a different collection with a different id. Which actions those are is
 * answered by the registry that the route handler already consults — not by a
 * second list here, which is what this was, one edit away from disagreeing
 * with the route that has to act on it.
 */
export const actionTargetId = (action: PanelAction, entityId: string, state: EditorialState): string | null => {
  return isInstanceAction(action) ? state.workflowInstanceId : entityId;
};

/**
 * Steps a returned review may be sent back to: every step before the current
 * one.
 *
 * Returning to the current step or a later one is not "send this back" — the
 * API would accept the id and the review would sit where it already is, or
 * skip ahead. An empty list means there is nowhere to return to, and the
 * panel offers no return at all rather than an empty picker.
 */
export const returnableSteps = (state: EditorialState): WorkflowStepSummary[] => {
  const steps = state.workflow?.steps ?? [];
  const current = steps.find((step) => step.isCurrent);
  if (!current) {
    return [];
  }
  return steps.filter((step) => step.sequenceOrder < current.sequenceOrder);
};


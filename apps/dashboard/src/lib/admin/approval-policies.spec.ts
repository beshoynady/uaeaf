import { describe, expect, it } from "vitest";
import {
  changesArrangement,
  hasApprovalErrors,
  requiredApprovals,
  validateApprovalChoice,
  type ApprovalChoice,
  type GovernableEntity,
} from "./approval-policies";

const choice = (overrides: Partial<ApprovalChoice> = {}): ApprovalChoice => ({
  enabled: true,
  mode: "THRESHOLD",
  approverIds: ["a", "b", "c"],
  threshold: 2,
  ...overrides,
});

const stored = (overrides: Partial<GovernableEntity> = {}): GovernableEntity => ({
  entityType: "articles",
  enabled: true,
  mode: "THRESHOLD",
  approverIds: ["a", "b", "c"],
  threshold: 2,
  inFlightReviews: 0,
  ...overrides,
});

/**
 * The screen's half of a refusal the server also makes.
 *
 * A step needing more approvals than it has people can never be satisfied:
 * every article reaching it stops there permanently, and nothing on any screen
 * says why. Catching it at the control turns a defect into a correction.
 */
describe("validateApprovalChoice", () => {
  it("accepts an arrangement the engine could satisfy", () => {
    expect(hasApprovalErrors(validateApprovalChoice(choice()))).toBe(false);
  });

  it("refuses a threshold above the number of approvers", () => {
    expect(validateApprovalChoice(choice({ threshold: 5 }))).toEqual({ threshold: true });
  });

  it("counts a repeated approver once", () => {
    // The engine counts distinct actors, so naming the same person twice
    // raises the apparent headcount without raising the real one.
    expect(validateApprovalChoice(choice({ approverIds: ["a", "a"], threshold: 2 }))).toEqual({
      threshold: true,
    });
  });

  it("refuses an arrangement with nobody in it", () => {
    expect(validateApprovalChoice(choice({ approverIds: [] }))).toEqual({ approvers: true });
  });

  it("asks for nothing when approvals are being switched off", () => {
    // Turning it off is a complete choice on its own; demanding approvers
    // first would make it impossible to switch off a misconfigured policy.
    expect(validateApprovalChoice({ enabled: false })).toEqual({});
  });

  it("never refuses ALL, which cannot exceed its own list", () => {
    expect(validateApprovalChoice(choice({ mode: "ALL", threshold: 99 }))).toEqual({});
  });
});

describe("requiredApprovals", () => {
  it("reads ALL as everyone on the list", () => {
    expect(requiredApprovals(choice({ mode: "ALL" }))).toBe(3);
  });

  it("reads SEQUENTIAL as everyone, in turn", () => {
    expect(requiredApprovals(choice({ mode: "SEQUENTIAL" }))).toBe(3);
  });

  it("reads THRESHOLD as the chosen number", () => {
    expect(requiredApprovals(choice({ threshold: 2 }))).toBe(2);
  });

  it("never reports more than the list can supply", () => {
    // What the control SHOWS must stay truthful even while the choice beside
    // it is invalid, or the administrator reads "5 of 3" and doubts the screen
    // rather than the number they typed.
    expect(requiredApprovals(choice({ threshold: 9 }))).toBe(3);
  });
});


/**
 * Which saves a running review may block.
 *
 * The server refuses a change to the arrangement while reviews are running,
 * because replacing the steps archives the one each review is waiting at. This
 * decides which saves are that change — and it has to decide it exactly as the
 * server does. Stricter here locks a save the server would have taken; looser
 * lets one through to be refused, which is the silent failure the screen exists
 * to remove.
 */
describe("changesArrangement", () => {
  it("sees no change in re-saving the same people", () => {
    expect(changesArrangement(stored(), choice())).toBe(false);
  });

  it("sees a change when an approver is added", () => {
    expect(changesArrangement(stored(), choice({ approverIds: ["a", "b", "c", "d"] }))).toBe(true);
  });

  it("sees a change when an approver is removed", () => {
    expect(changesArrangement(stored(), choice({ approverIds: ["a", "b"] }))).toBe(true);
  });

  it("sees a change when the threshold moves", () => {
    expect(changesArrangement(stored(), choice({ threshold: 3 }))).toBe(true);
  });

  it("sees a change when the mode changes", () => {
    expect(changesArrangement(stored(), choice({ mode: "ALL" }))).toBe(true);
  });

  it("sees no change in reordering the checkboxes under ALL", () => {
    // ALL is one step holding everybody, and the server sorts a step's
    // approvers before comparing. Calling this a change would lock an
    // administrator out over the order they happened to tick boxes in.
    const entity = stored({ mode: "ALL", approverIds: ["a", "b", "c"], threshold: 3 });
    expect(changesArrangement(entity, choice({ mode: "ALL", approverIds: ["c", "a", "b"] }))).toBe(false);
  });

  it("sees reordering under SEQUENTIAL as the change it is", () => {
    // SEQUENTIAL is one step per approver, so the order IS who decides first.
    const entity = stored({ mode: "SEQUENTIAL", approverIds: ["a", "b"] });
    expect(changesArrangement(entity, choice({ mode: "SEQUENTIAL", approverIds: ["b", "a"] }))).toBe(true);
  });

  it("sees no change in switching approval off", () => {
    // Disabling touches no step and strands no review. Treating it as a change
    // would make a misconfigured policy impossible to switch off at exactly
    // the moment work is moving through it.
    expect(changesArrangement(stored(), choice({ enabled: false, approverIds: [] }))).toBe(false);
  });

  it("counts a repeated approver once, as the engine does", () => {
    expect(changesArrangement(stored(), choice({ approverIds: ["a", "a", "b", "c"] }))).toBe(false);
  });
});

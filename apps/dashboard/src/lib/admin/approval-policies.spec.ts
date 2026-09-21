import { describe, expect, it } from "vitest";
import {
  hasApprovalErrors,
  requiredApprovals,
  validateApprovalChoice,
  type ApprovalChoice,
} from "./approval-policies";

const choice = (overrides: Partial<ApprovalChoice> = {}): ApprovalChoice => ({
  enabled: true,
  mode: "THRESHOLD",
  approverIds: ["a", "b", "c"],
  threshold: 2,
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

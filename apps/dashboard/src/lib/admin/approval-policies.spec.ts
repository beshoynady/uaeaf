import { describe, expect, it } from "vitest";
import {
  changesArrangement,
  hasApprovalErrors,
  matchesFilter,
  needsAttention,
  policyStats,
  requiredApprovals,
  savedChoice,
  validateApprovalChoice,
  type ApprovalChoice,
  type ApproverOption,
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

const accounts: ApproverOption[] = [
  { id: "a", name: { ar: "أ", en: "A" }, email: "a@uaeaf.ae" },
  { id: "b", name: { ar: "ب", en: "B" }, email: "b@uaeaf.ae" },
  { id: "c", name: { ar: "ج", en: "C" }, email: "c@uaeaf.ae" },
];

describe("needsAttention", () => {
  it("leaves alone a type that publishes directly, whoever it names", () => {
    // Off, the approvers are not consulted at all, so an empty or stale list
    // stops nothing.
    expect(needsAttention(stored({ enabled: false, approverIds: [] }), accounts)).toBe(false);
  });

  it("flags a type that requires approval and names nobody", () => {
    expect(needsAttention(stored({ approverIds: [] }), accounts)).toBe(true);
  });

  it("flags a type that names somebody whose account is gone", () => {
    // Their step can never be decided by them, and nothing else on the
    // screen would say so.
    expect(needsAttention(stored({ approverIds: ["a", "gone"] }), accounts)).toBe(true);
  });

  it("leaves alone a type whose approvers all exist", () => {
    expect(needsAttention(stored(), accounts)).toBe(false);
  });
});

describe("matchesFilter", () => {
  const direct = stored({ enabled: false });
  const required = stored();
  const broken = stored({ approverIds: [] });

  it("keeps everything under all", () => {
    expect([direct, required, broken].every((entity) => matchesFilter(entity, "all", accounts))).toBe(true);
  });

  it("splits the two states the server stores", () => {
    expect(matchesFilter(required, "required", accounts)).toBe(true);
    expect(matchesFilter(direct, "required", accounts)).toBe(false);
    expect(matchesFilter(direct, "direct", accounts)).toBe(true);
    expect(matchesFilter(required, "direct", accounts)).toBe(false);
  });

  it("keeps only what needs attention under attention", () => {
    expect(matchesFilter(broken, "attention", accounts)).toBe(true);
    expect(matchesFilter(required, "attention", accounts)).toBe(false);
  });
});

describe("policyStats", () => {
  it("counts from every type, not from the page a filter shows", () => {
    const stats = policyStats(
      [
        stored({ inFlightReviews: 2 }),
        stored({ entityType: "committees", enabled: false, inFlightReviews: 1 }),
        stored({ entityType: "documents", approverIds: [] }),
      ],
      accounts,
    );

    expect(stats).toEqual({ required: 2, total: 3, inReview: 3, attention: 1 });
  });
});

describe("savedChoice", () => {
  it("is the stored arrangement as a draft", () => {
    expect(savedChoice(stored({ mode: "SEQUENTIAL", approverIds: ["b", "a"] }))).toEqual({
      enabled: true,
      mode: "SEQUENTIAL",
      approverIds: ["b", "a"],
      threshold: 2,
    });
  });

  it("offers a count when nothing is stored yet", () => {
    // A type never configured has no mode; the draft opens on the one the
    // screen has always opened on.
    expect(savedChoice(stored({ enabled: false, mode: null, approverIds: [] })).mode).toBe("THRESHOLD");
  });

  it("is a copy, so editing the draft never edits what is stored", () => {
    const entity = stored();
    savedChoice(entity).approverIds?.push("x");
    expect(entity.approverIds).toEqual(["a", "b", "c"]);
  });
});

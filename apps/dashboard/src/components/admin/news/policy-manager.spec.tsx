import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PolicyManager } from "./policy-manager";
import type { ApproverOption, GovernableEntity } from "@/lib/admin/approval-policies";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

const entity = (overrides: Partial<GovernableEntity> = {}): GovernableEntity => ({
  entityType: "articles",
  enabled: false,
  mode: null,
  approverIds: [],
  threshold: 1,
  inFlightReviews: 0,
  ...overrides,
});

const approvers: ApproverOption[] = [
  { id: "u1", name: { ar: "أحمد", en: "Ahmed" }, email: "a@uaeaf.ae" },
  { id: "u2", name: { ar: "سارة", en: "Sara" }, email: "s@uaeaf.ae" },
];

const renderManager = (entities: GovernableEntity[], onSave = vi.fn()) =>
  render(<PolicyManager entities={entities} approvers={approvers} locale="ar" onSave={onSave} />);

/** The master column: every policy, grouped. */
const list = () => screen.getByRole("region", { name: "policyListTitle" });
/** The detail column, named by the policy it shows. */
const detail = () => screen.getByRole("region", { name: /^entity_/ });
const choose = (entityType: string) =>
  userEvent.click(within(list()).getByRole("button", { name: new RegExp(`^entity_${entityType}`) }));
const saveButton = () => screen.getByRole("button", { name: /^policySave/ });
const addApprover = (id: string) => userEvent.selectOptions(screen.getByLabelText("policyAddApprover"), id);
const removeApprover = (name: string) =>
  userEvent.click(screen.getByRole("button", { name: new RegExp(`policyRemoveApprover.*${name}`) }));
const orderList = () => screen.getByRole("list", { name: "policyOrder" });

describe("PolicyManager", () => {
  describe("as a list beside its details", () => {
    it("lists every governable type the server sent, configured or not", () => {
      // Driven by the server's list, so a thirteenth governed type appears here
      // without a line of code being written for it.
      renderManager([entity(), entity({ entityType: "committees" }), entity({ entityType: "documents" })]);

      expect(within(list()).getAllByRole("button")).toHaveLength(3);
    });

    it("groups the types under the domain each belongs to", () => {
      renderManager([entity(), entity({ entityType: "committees" })]);

      // `articles` is public communication and `committees` is federation
      // governance. An administrator arrives asking "who signs off on the
      // news", not "what is `workflowRequired` for `articles`".
      const headings = within(list())
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent);
      expect(headings).toHaveLength(2);
      expect(headings).not.toContain("");
    });

    it("shows the chosen policy's settings at once, beside the list", async () => {
      renderManager([entity(), entity({ entityType: "committees" })]);

      await choose("articles");

      expect(detail()).toHaveAccessibleName("entity_articles");
      expect(within(list()).getByRole("button", { name: /^entity_articles/ })).toHaveAttribute("aria-current", "true");
      expect(within(list()).getByRole("button", { name: /^entity_committees/ })).not.toHaveAttribute("aria-current");
    });

    it("keeps each policy's unsaved choices to itself as the reader moves between them", async () => {
      renderManager([entity(), entity({ entityType: "committees" })]);

      await choose("committees");
      await userEvent.click(screen.getByLabelText("policyEnabled"));

      // One shared draft would make the second policy overwrite the first.
      await choose("articles");
      expect(screen.queryByText("policyApprovers")).not.toBeInTheDocument();

      // And moving away loses nothing.
      await choose("committees");
      expect(screen.getByLabelText("policyEnabled")).toBeChecked();
    });

    it("marks a policy with unsaved changes in the list", async () => {
      renderManager([entity(), entity({ entityType: "committees" })]);
      await choose("articles");

      await userEvent.click(screen.getByLabelText("policyEnabled"));

      expect(within(list()).getByRole("button", { name: /^entity_articles/ })).toHaveTextContent("rowUnsaved");
      expect(within(list()).getByRole("button", { name: /^entity_committees/ })).not.toHaveTextContent("rowUnsaved");
    });

    it("describes each row by what is saved", async () => {
      renderManager([entity({ enabled: true, mode: "THRESHOLD", approverIds: ["u1", "u2"], threshold: 1 })]);

      const row = within(list()).getByRole("button", { name: /^entity_articles/ });
      expect(row).toHaveTextContent("statusRequired");
      expect(row).toHaveTextContent('rowMetaThreshold:{"required":1,"total":2}');

      await removeApprover("سارة");

      // The row answers "what is the rule today" while the detail edits it.
      expect(row).toHaveTextContent('rowMetaThreshold:{"required":1,"total":2}');
    });
  });

  describe("filters and figures", () => {
    const three = () => [
      entity({ enabled: true, mode: "ALL", approverIds: ["u1"], inFlightReviews: 2 }),
      entity({ entityType: "committees" }),
      entity({ entityType: "documents", enabled: true, mode: "ALL", approverIds: [] }),
    ];

    it("counts each view in its own name", () => {
      renderManager(three());

      const filters = screen.getByRole("group", { name: "filtersLabel" });
      expect(within(filters).getByRole("button", { name: 'filter_all:{"count":3}' })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(within(filters).getByRole("button", { name: 'filter_required:{"count":2}' })).toBeInTheDocument();
      expect(within(filters).getByRole("button", { name: 'filter_direct:{"count":1}' })).toBeInTheDocument();
      expect(within(filters).getByRole("button", { name: 'filter_attention:{"count":1}' })).toBeInTheDocument();
    });

    it("narrows the list to the chosen view", async () => {
      renderManager(three());

      await userEvent.click(screen.getByRole("button", { name: /^filter_direct/ }));

      expect(screen.getByRole("button", { name: /^filter_direct/ })).toHaveAttribute("aria-pressed", "true");
      const rows = within(list()).getAllByRole("button");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveAccessibleName(/^entity_committees/);
    });

    it("flags the policies that need attention", () => {
      renderManager(three());

      expect(within(list()).getByRole("button", { name: /^entity_documents/ })).toHaveTextContent("rowAttention");
      expect(within(list()).getByRole("button", { name: /^entity_articles/ })).not.toHaveTextContent("rowAttention");
    });

    it("states the three figures over every type", () => {
      renderManager(three());

      const figures = screen.getByRole("region", { name: "statsCaption" });
      expect(within(figures).getByText("statRequired").parentElement).toHaveTextContent("2");
      expect(within(figures).getByText("statInReview").parentElement).toHaveTextContent("2");
      expect(within(figures).getByText("statAttention").parentElement).toHaveTextContent("1");
    });
  });

  describe("the arrangement", () => {
    it("hides the arrangement entirely while a type needs no review", () => {
      renderManager([entity()]);

      // Nothing to choose until there is something to choose about.
      expect(screen.queryByText("policyApprovers")).not.toBeInTheDocument();
      expect(screen.getByText("policyOffExplained")).toBeInTheDocument();
    });

    it("reveals the arrangement when review is switched on", async () => {
      renderManager([entity()]);

      await userEvent.click(screen.getByRole("switch", { name: "policyEnabled" }));

      expect(screen.getByText("policyApprovers")).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "policyMode" })).toBeInTheDocument();
    });

    it("offers the three modes as one choice", async () => {
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: ["u1", "u2"] })]);

      expect(screen.getByRole("button", { name: "mode_ALL" })).toHaveAttribute("aria-pressed", "true");

      await userEvent.click(screen.getByRole("button", { name: "mode_SEQUENTIAL" }));

      expect(screen.getByRole("button", { name: "mode_SEQUENTIAL" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "mode_ALL" })).toHaveAttribute("aria-pressed", "false");
    });

    it("explains unanimity only under everyone", async () => {
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: ["u1", "u2"] })]);

      expect(screen.getByText(/^policyAllExplained/)).toHaveTextContent('"total":2');

      await userEvent.click(screen.getByRole("button", { name: "mode_THRESHOLD" }));

      expect(screen.queryByText(/^policyAllExplained/)).not.toBeInTheDocument();
    });

    it("adds and removes an approver", async () => {
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: ["u1"] })]);

      await addApprover("u2");
      expect(screen.getByRole("button", { name: /policyRemoveApprover.*سارة/ })).toBeInTheDocument();

      await removeApprover("أحمد");
      expect(screen.queryByRole("button", { name: /policyRemoveApprover.*أحمد/ })).not.toBeInTheDocument();
    });

    it("offers only people not already named", () => {
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: ["u1"] })]);

      const options = within(screen.getByLabelText("policyAddApprover"))
        .getAllByRole("option")
        .map((option) => option.textContent);
      expect(options).toContain("سارة");
      expect(options).not.toContain("أحمد");
    });

    it("saves a policy for a type that never had one", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderManager([entity({ entityType: "committees" })], onSave);

      await userEvent.click(screen.getByLabelText("policyEnabled"));
      await addApprover("u1");
      await userEvent.click(saveButton());

      expect(onSave).toHaveBeenCalledWith(
        "committees",
        expect.objectContaining({ enabled: true, approverIds: ["u1"] }),
      );
    });

    it("lets a type be switched off without naming anyone", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: ["u1"] })], onSave);

      await userEvent.click(screen.getByLabelText("policyEnabled"));
      await userEvent.click(saveButton());

      // Demanding approvers first would make a misconfigured policy impossible
      // to turn off.
      expect(onSave).toHaveBeenCalledWith("articles", expect.objectContaining({ enabled: false }));
    });
  });

  describe("the number of approvals", () => {
    const counted = (overrides: Partial<GovernableEntity> = {}) =>
      entity({ enabled: true, mode: "THRESHOLD", approverIds: ["u1", "u2"], threshold: 1, ...overrides });

    it("steps between one and the number of approvers", async () => {
      renderManager([counted()]);

      expect(screen.getByRole("button", { name: "policyThresholdDown" })).toBeDisabled();

      await userEvent.click(screen.getByRole("button", { name: "policyThresholdUp" }));

      expect(screen.getByLabelText("policyThreshold")).toHaveValue(2);
      expect(screen.getByRole("button", { name: "policyThresholdUp" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "policyThresholdDown" })).toBeEnabled();
    });

    it("prints the consequence of the choice, not only its name", () => {
      renderManager([counted({ threshold: 2 })]);

      // "2 of 2" is what the administrator is actually choosing; a mode name
      // alone does not say it.
      expect(screen.getByText(/^policySummary:/)).toHaveTextContent('"required":2');
      expect(screen.getByText(/^policySummary:/)).toHaveTextContent('"total":2');
    });

    it("refuses to save an arrangement nobody could satisfy", async () => {
      const onSave = vi.fn();
      renderManager([counted({ threshold: 2 })], onSave);

      await removeApprover("سارة");

      // Told at the control they just moved, not by a rejected save. The
      // server refuses the same thing; this is the earlier half of the pair.
      expect(screen.getByLabelText("policyThreshold")).toHaveAccessibleDescription(
        expect.stringContaining("errorThreshold"),
      );
      expect(saveButton()).toBeDisabled();
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe("what is saved and what is being changed", () => {
    it("says who approves before it offers to change it", () => {
      renderManager([entity({ enabled: true, mode: "THRESHOLD", approverIds: ["u1", "u2"], threshold: 1 })]);

      const summary = screen.getByText(/^policySummaryOf:/);
      expect(summary).toHaveTextContent('"required":1');
      expect(summary).toHaveTextContent('"total":2');
      // The people by name, not by identifier: an administrator confirms an
      // arrangement by recognising who is in it.
      expect(summary).toHaveTextContent("أحمد");
    });

    it("says plainly when a type publishes without review", () => {
      renderManager([entity()]);

      expect(screen.getByText("policySummaryOff")).toBeInTheDocument();
    });

    it("calls out a policy that requires approval and names nobody", () => {
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: [] })]);

      // This one arrangement is not strict, it is broken: nothing of that type
      // can ever be published, and nothing else on the screen would say so.
      expect(screen.getByText("policySummaryNobody")).toBeInTheDocument();
    });

    it("keeps naming an approver whose account is gone", () => {
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: ["u1", "deleted-account"] })]);

      // A shorter list would hide the fact that a policy names somebody who no
      // longer exists — which is exactly what an administrator needs to see.
      expect(screen.getByText(/^policySummaryOf:/)).toHaveTextContent("deleted-account");
      expect(screen.getByRole("button", { name: /policyRemoveApprover.*deleted-account/ })).toBeInTheDocument();
    });

    it("describes what is saved, not what is being chosen", async () => {
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: ["u1"] })]);

      await addApprover("u2");

      // A sentence that moved with the controls would leave the administrator
      // no way to see what they are changing away from.
      expect(screen.getByText(/^policySummaryOf:/)).toHaveTextContent('"total":1');
    });

    it("offers no save until something changes", async () => {
      renderManager([entity()]);

      expect(saveButton()).toBeDisabled();

      await userEvent.click(screen.getByLabelText("policyEnabled"));
      await addApprover("u1");

      expect(saveButton()).toBeEnabled();
    });

    it("names the policy the save belongs to", () => {
      renderManager([entity()]);

      expect(saveButton()).toHaveAccessibleName('policySave:{"name":"entity_articles"}');
    });

    it("discards the changes back to what is saved", async () => {
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: ["u1"] })]);
      expect(screen.queryByRole("button", { name: "policyDiscard" })).not.toBeInTheDocument();

      await addApprover("u2");
      await userEvent.click(screen.getByRole("button", { name: "policyDiscard" }));

      expect(screen.queryByRole("button", { name: /policyRemoveApprover.*سارة/ })).not.toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
      expect(screen.queryByRole("button", { name: "policyDiscard" })).not.toBeInTheDocument();
    });
  });

  describe("the approval path", () => {
    const path = () => screen.getByRole("figure");
    const stages = () =>
      within(path())
        .getAllByRole("listitem")
        .map((item) => item.textContent);

    it("draws the saved path under its own caption", () => {
      renderManager([entity({ enabled: true, mode: "SEQUENTIAL", approverIds: ["u1", "u2"] })]);

      expect(path()).toHaveAccessibleName("flowCurrent");
      expect(stages()).toEqual(["flowStart", "أحمد", "سارة", "flowPublish"]);
    });

    it("follows the change being made, and says so", async () => {
      renderManager([entity({ enabled: true, mode: "SEQUENTIAL", approverIds: ["u1", "u2"] })]);

      await userEvent.click(screen.getByRole("button", { name: "mode_THRESHOLD" }));

      expect(path()).toHaveAccessibleName("flowAfterSave");
      expect(stages()).toEqual(["flowStart", 'flowThreshold:{"required":1,"total":2}', "flowPublish"]);
    });

    it("goes straight to publication when nobody reviews", () => {
      renderManager([entity()]);

      expect(stages()).toEqual(["flowStart", "flowPublishDirect"]);
    });

    it("gathers everyone into one gate when all must approve", () => {
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: ["u1", "u2"] })]);

      expect(stages()).toEqual(["flowStart", 'flowAll:{"total":2}', "flowPublish"]);
    });
  });

  describe("while reviews are running under the arrangement", () => {
    const underReview = (overrides = {}) =>
      entity({
        enabled: true,
        mode: "ALL",
        approverIds: ["u1"],
        threshold: 1,
        inFlightReviews: 2,
        ...overrides,
      });

    it("states how many reviews are running before anything is touched", () => {
      // The count is the reason the arrangement is locked. Shown only after a
      // rejected save, the administrator composes an edit that was never
      // going to be accepted.
      renderManager([underReview()]);

      expect(screen.getByText(/policyLockedPlural/)).toHaveTextContent('"count":2');
      expect(screen.getByText("policyLockedWhy")).toBeInTheDocument();
      expect(within(list()).getByRole("button", { name: /^entity_articles/ })).toHaveTextContent("rowLocked");
    });

    it("counts one review in the singular", () => {
      renderManager([underReview({ inFlightReviews: 1 })]);

      expect(screen.getByText("policyLocked")).toBeInTheDocument();
    });

    it("blocks the save once the arrangement is actually changed", async () => {
      const onSave = vi.fn();
      renderManager([underReview()], onSave);

      await addApprover("u2");

      // Changing who approves replaces the steps, and a replaced step is the
      // one those two reviews are waiting at — they could never be decided.
      // The server refuses it; this is the earlier half of the pair.
      expect(saveButton()).toBeDisabled();
      expect(onSave).not.toHaveBeenCalled();
    });

    it("announces the lock only once it is stopping something", async () => {
      renderManager([underReview()]);

      // Live from the first render, it would interrupt a screen-reader user
      // reading a policy they had not yet touched.
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await addApprover("u2");

      expect(screen.getByRole("alert")).toHaveTextContent("policyLockedPlural");
    });

    it("never reaches the lock over an arrangement nobody changed", () => {
      renderManager([underReview()]);

      // Re-saving an unchanged arrangement writes nothing upstream, and the
      // save waits for a change — so the one operation the lock must never
      // block is one the screen cannot even attempt.
      expect(saveButton()).toBeDisabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("still lets approval be switched off", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderManager([underReview()], onSave);

      await userEvent.click(screen.getByLabelText("policyEnabled"));
      await userEvent.click(saveButton());

      // Disabling strands no review, and a policy most needs correcting
      // exactly while work is moving through it.
      expect(onSave).toHaveBeenCalledWith("articles", expect.objectContaining({ enabled: false }));
    });

    it("takes the block away when the change is undone", async () => {
      renderManager([underReview()]);

      await addApprover("u2");
      expect(screen.getByRole("alert")).toBeInTheDocument();

      await removeApprover("سارة");

      // Read from the draft as it stands, not from what it was on mount.
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("says nothing about a lock on a type with no reviews running", () => {
      renderManager([entity()]);

      expect(screen.queryByText(/policyLocked/)).not.toBeInTheDocument();
    });
  });

  describe("when the server refuses a save the screen did not predict", () => {
    // `inFlightReviews: 0` on purpose: this is the race the screen cannot see
    // — a review submitted between the page load and the click. The screen's
    // own lock was computed from a count that was true and no longer is.
    const raced = () => entity({ enabled: true, mode: "ALL", approverIds: ["u1"], inFlightReviews: 0 });

    it("says a review started rather than failing silently", async () => {
      const onSave = vi.fn().mockResolvedValue({ code: "reviewsInFlight", inFlightReviews: 1 });
      renderManager([raced()], onSave);

      await addApprover("u2");
      await userEvent.click(saveButton());

      // Swallowed, this leaves an administrator looking at a button they
      // pressed and an arrangement that never changed.
      expect(await screen.findByRole("alert")).toHaveTextContent("policySaveRefused");
    });

    it("distinguishes a refusal from a breakage", async () => {
      const onSave = vi.fn().mockResolvedValue({ code: "internalError" });
      renderManager([raced()], onSave);

      await addApprover("u2");
      await userEvent.click(saveButton());

      // "A review started, reload" and "try again" are different instructions.
      expect(await screen.findByRole("alert")).toHaveTextContent("policySaveFailed");
    });

    it("clears the refusal when the save is attempted again", async () => {
      const onSave = vi
        .fn()
        .mockResolvedValueOnce({ code: "reviewsInFlight", inFlightReviews: 1 })
        .mockResolvedValueOnce(null);
      renderManager([raced()], onSave);

      await addApprover("u2");
      await userEvent.click(saveButton());
      expect(await screen.findByRole("alert")).toBeInTheDocument();

      await userEvent.click(saveButton());

      // A stale refusal beside a successful save reads as a failure.
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("keeps one policy's refusal out of another's", async () => {
      const onSave = vi.fn().mockResolvedValue({ code: "reviewsInFlight", inFlightReviews: 1 });
      renderManager(
        [raced(), entity({ entityType: "committees", enabled: true, mode: "ALL", approverIds: ["u1"] })],
        onSave,
      );

      await choose("articles");
      await addApprover("u2");
      await userEvent.click(saveButton());
      expect(await screen.findByRole("alert")).toBeInTheDocument();

      await choose("committees");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await choose("articles");
      expect(screen.getByRole("alert")).toHaveTextContent("policySaveRefused");
    });
  });

  describe("a sequential arrangement", () => {
    const sequential = () => entity({ enabled: true, mode: "SEQUENTIAL", approverIds: ["u1", "u2"] });
    const positions = () =>
      within(orderList())
        .getAllByRole("listitem")
        .map((item) => item.textContent ?? "");

    it("numbers the approvers, because the order is the policy", () => {
      renderManager([sequential()]);

      // The same two people in two orders are two arrangements: a different
      // person holds every article up first.
      expect(positions().some((text) => text.includes('"position":1') && text.includes("أحمد"))).toBe(true);
      expect(positions().some((text) => text.includes('"position":2') && text.includes("سارة"))).toBe(true);
    });

    it("moves an approver down, and says whose button that is", async () => {
      renderManager([sequential()]);

      // Each button names the person it moves. A column of identical "down"
      // buttons tells a screen-reader user which of them they are on: none.
      await userEvent.click(screen.getByRole("button", { name: /policyMoveDown.*أحمد/ }));

      expect(positions().some((text) => text.includes('"position":1') && text.includes("سارة"))).toBe(true);
    });

    it("cannot move the first approver up, or the last one down", () => {
      renderManager([sequential()]);

      // Disabled rather than wrapping: pressing "up" on the first person means
      // nothing happens, not "send them to the back".
      expect(screen.getByRole("button", { name: /policyMoveUp.*أحمد/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /policyMoveDown.*سارة/ })).toBeDisabled();
    });

    it("sends the order the administrator arranged", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderManager([sequential()], onSave);

      await userEvent.click(screen.getByRole("button", { name: /policyMoveDown.*أحمد/ }));
      await userEvent.click(saveButton());

      // `buildSteps` numbers the steps from this array's own order, so a list
      // sorted or de-duplicated on the way out would silently reassign who
      // decides first.
      expect(onSave).toHaveBeenCalledWith("articles", expect.objectContaining({ approverIds: ["u2", "u1"] }));
    });

    it("offers no order to arrange under the other two modes", () => {
      renderManager([entity({ enabled: true, mode: "ALL", approverIds: ["u1", "u2"] })]);

      // Under ALL and THRESHOLD every approver decides on the same step, so
      // there is no order — and a numbered list would invent one.
      expect(screen.queryByText("policyOrder")).not.toBeInTheDocument();
    });

    it("keeps an approver whose account is gone in its place", () => {
      renderManager([entity({ enabled: true, mode: "SEQUENTIAL", approverIds: ["u1", "deleted-account"] })]);

      // Dropping it would renumber the arrangement and hide the fact that a
      // policy names somebody who no longer exists.
      expect(positions().some((text) => text.includes("deleted-account"))).toBe(true);
    });
  });

  describe("a policy that would deadlock", () => {
    const nobody = () => entity({ enabled: true, mode: "ALL", approverIds: [] });

    it("says so on a type that already carries the deadlock", () => {
      renderManager([nobody()]);

      // A stored arrangement that stops every publication of that type — the
      // shape the API answers `unsatisfiablePolicy` for. Nothing is dirty, so
      // there is nothing to save; what matters is that the policy says what
      // is wrong with it.
      expect(screen.getByText("policyDeadlocked")).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("says it before the save, not after", async () => {
      const onSave = vi.fn();
      renderManager([entity()], onSave);

      await userEvent.click(screen.getByLabelText("policyEnabled"));

      expect(screen.getByRole("alert")).toHaveTextContent("policyDeadlocked");
      expect(saveButton()).toBeDisabled();
      expect(onSave).not.toHaveBeenCalled();
    });

    it("lifts the refusal as soon as somebody is named", async () => {
      renderManager([nobody()]);

      await addApprover("u1");

      expect(screen.queryByText("policyDeadlocked")).not.toBeInTheDocument();
      expect(saveButton()).toBeEnabled();
    });

    it("still allows turning approval off on a deadlocked type", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderManager([nobody()], onSave);

      await userEvent.click(screen.getByLabelText("policyEnabled"));
      await userEvent.click(saveButton());

      // The way out of the deadlock. Refusing this too would leave a broken
      // policy with no way to correct it from the screen that stored it.
      expect(onSave).toHaveBeenCalledWith("articles", expect.objectContaining({ enabled: false }));
    });
  });

  describe("applying one policy to its group", () => {
    // `staticPages`, `externalMediaCoverage` and `publicEvents` share the
    // page-composition group; `documents` is alone in its own.
    const source = () => entity({ entityType: "staticPages", enabled: true, mode: "ALL", approverIds: ["u1"] });
    const applyButton = () => screen.getByRole("button", { name: "groupApplyButton" });

    it("is a separate action from saving", () => {
      renderManager([source(), entity({ entityType: "publicEvents" })]);

      expect(applyButton()).toBeEnabled();
      expect(saveButton()).toBeDisabled();
    });

    it("waits while the policy it would copy has unsaved changes", async () => {
      renderManager([source(), entity({ entityType: "publicEvents" })]);

      await addApprover("u2");

      // It copies what is saved. Enabled now, the reader could not tell
      // whether their edit was about to be copied or not.
      expect(applyButton()).toBeDisabled();
      expect(screen.getByText(/^groupApplyNeedsSave/)).toBeInTheDocument();
    });

    it("has nothing to do in a group of one", () => {
      renderManager([entity({ entityType: "documents", enabled: true, mode: "ALL", approverIds: ["u1"] })]);

      expect(applyButton()).toBeDisabled();
      expect(screen.getByText("groupApplyAlone")).toBeInTheDocument();
    });

    it("asks before overwriting, and names what will change", async () => {
      const onSave = vi.fn().mockResolvedValue(null);
      renderManager([source(), entity({ entityType: "publicEvents" })], onSave);

      await userEvent.click(applyButton());

      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText(/^groupApplyWillChange/)).toHaveTextContent("entity_publicEvents");
    });

    it("copies the saved arrangement to the others in the group", async () => {
      const onSave = vi.fn().mockResolvedValue(null);
      renderManager(
        [source(), entity({ entityType: "publicEvents" }), entity({ entityType: "articles" })],
        onSave,
      );

      // Public communication sorts first, so the news would open selected.
      await choose("staticPages");
      await userEvent.click(applyButton());
      await userEvent.click(screen.getByRole("button", { name: "groupApplyConfirm" }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith("publicEvents", {
        enabled: true,
        mode: "ALL",
        approverIds: ["u1"],
        threshold: 1,
      });
      expect(await screen.findByText(/^groupApplyResult_applied/)).toHaveTextContent("entity_publicEvents");
    });

    it("skips a policy whose running reviews it would strand", async () => {
      const onSave = vi.fn().mockResolvedValue(null);
      renderManager(
        [
          source(),
          entity({ entityType: "externalMediaCoverage", inFlightReviews: 1 }),
          entity({ entityType: "publicEvents" }),
        ],
        onSave,
      );

      await userEvent.click(applyButton());
      expect(screen.getByText(/^groupApplySkipped/)).toHaveTextContent("entity_externalMediaCoverage");
      await userEvent.click(screen.getByRole("button", { name: "groupApplyConfirm" }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith("publicEvents", expect.anything());
      expect(await screen.findByText(/^groupApplyResult_skipped/)).toHaveTextContent(
        "entity_externalMediaCoverage",
      );
    });

    it("reports each policy's own outcome when only some succeed", async () => {
      const onSave = vi
        .fn()
        .mockResolvedValueOnce({ code: "reviewsInFlight", inFlightReviews: 1 })
        .mockResolvedValueOnce(null);
      renderManager(
        [source(), entity({ entityType: "externalMediaCoverage" }), entity({ entityType: "publicEvents" })],
        onSave,
      );

      await userEvent.click(applyButton());
      await userEvent.click(screen.getByRole("button", { name: "groupApplyConfirm" }));

      expect(await screen.findByText(/^groupApplyResult_refused/)).toHaveTextContent(
        "entity_externalMediaCoverage",
      );
      expect(screen.getByText(/^groupApplyResult_applied/)).toHaveTextContent("entity_publicEvents");
    });

    it("has nothing to apply when the group already matches", () => {
      renderManager([source(), entity({ entityType: "publicEvents", enabled: true, mode: "ALL", approverIds: ["u1"] })]);

      expect(applyButton()).toBeDisabled();
      expect(screen.getByText("groupApplyNothing")).toBeInTheDocument();
    });
  });
});

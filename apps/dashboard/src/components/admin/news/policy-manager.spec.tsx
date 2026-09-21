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

const rowFor = (entityType: string) =>
  screen.getByRole("heading", { name: `entity_${entityType}` }).closest("li") as HTMLElement;

describe("PolicyManager", () => {
  it("lists every governable type the server sent, configured or not", () => {
    // Driven by the server's list, so a thirteenth governed type appears here
    // without a line of code being written for it.
    render(
      <PolicyManager
        entities={[entity(), entity({ entityType: "committees" }), entity({ entityType: "documents" })]}
        approvers={approvers}
        locale="ar"
        onSave={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("hides the arrangement entirely while a type needs no review", () => {
    render(<PolicyManager entities={[entity()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

    // Nothing to choose until there is something to choose about.
    expect(screen.queryByText("policyApprovers")).not.toBeInTheDocument();
  });

  it("reveals the arrangement when review is switched on", async () => {
    render(<PolicyManager entities={[entity()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

    await userEvent.click(screen.getByLabelText("policyEnabled"));

    expect(screen.getByText("policyApprovers")).toBeInTheDocument();
    expect(screen.getByLabelText("policyMode")).toBeInTheDocument();
  });

  it("saves a policy for a type that never had one", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <PolicyManager entities={[entity({ entityType: "committees" })]} approvers={approvers} locale="ar" onSave={onSave} />,
    );

    await userEvent.click(screen.getByLabelText("policyEnabled"));
    await userEvent.click(screen.getByLabelText("أحمد"));
    await userEvent.click(screen.getByRole("button", { name: "save" }));

    expect(onSave).toHaveBeenCalledWith(
      "committees",
      expect.objectContaining({ enabled: true, approverIds: ["u1"] }),
    );
  });

  it("refuses to save an arrangement nobody could satisfy", async () => {
    const onSave = vi.fn();
    render(
      <PolicyManager
        entities={[entity({ enabled: true, mode: "THRESHOLD", approverIds: ["u1"], threshold: 1 })]}
        approvers={approvers}
        locale="ar"
        onSave={onSave}
      />,
    );

    await userEvent.clear(screen.getByLabelText("policyThreshold"));
    await userEvent.type(screen.getByLabelText("policyThreshold"), "5");

    // Told at the control they just moved, not by a rejected save. The server
    // refuses the same thing; this is the earlier half of the pair.
    //
    // The message is asserted where `TextField` puts it — associated with the
    // control through `aria-describedby` rather than announced as a live
    // region, which is the pattern every other field on this dashboard uses.
    expect(screen.getByLabelText("policyThreshold")).toHaveAccessibleDescription(
      expect.stringContaining("errorThreshold"),
    );
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses an arrangement with nobody in it", async () => {
    render(<PolicyManager entities={[entity()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

    await userEvent.click(screen.getByLabelText("policyEnabled"));

    // One alert, not two: "choose an approver" and the deadlock notice fired
    // on the same condition, and the notice is the one that says what happens
    // if nobody is named.
    expect(screen.getByRole("alert")).toHaveTextContent("policyDeadlocked");
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();
  });

  it("prints the consequence of the choice, not only its name", async () => {
    render(
      <PolicyManager
        entities={[entity({ enabled: true, mode: "THRESHOLD", approverIds: ["u1", "u2"], threshold: 2 })]}
        approvers={approvers}
        locale="ar"
        onSave={vi.fn()}
      />,
    );

    // "2 of 2" is what the administrator is actually choosing; a mode name
    // alone does not say it.
    // Anchored: the row also carries `policySummaryOf`, which is what the
    // arrangement IS, and this case is about what the draft WOULD be.
    expect(screen.getByText(/^policySummary:/)).toHaveTextContent('"required":2');
    expect(screen.getByText(/^policySummary:/)).toHaveTextContent('"total":2');
  });

  it("keeps each row's choices to itself", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <PolicyManager
        entities={[entity(), entity({ entityType: "committees" })]}
        approvers={approvers}
        locale="ar"
        onSave={onSave}
      />,
    );

    const committees = rowFor("committees");
    await userEvent.click(within(committees).getByLabelText("policyEnabled"));

    // One shared draft would make the second row overwrite the first.
    expect(within(rowFor("articles")).queryByText("policyApprovers")).not.toBeInTheDocument();
    expect(within(committees).getByText("policyApprovers")).toBeInTheDocument();
  });

  it("lets a type be switched off without naming anyone", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <PolicyManager
        entities={[entity({ enabled: true, mode: "ALL", approverIds: ["u1"] })]}
        approvers={approvers}
        locale="ar"
        onSave={onSave}
      />,
    );

    await userEvent.click(screen.getByLabelText("policyEnabled"));
    await userEvent.click(screen.getByRole("button", { name: "save" }));

    // Demanding approvers first would make a misconfigured policy impossible
    // to turn off.
    expect(onSave).toHaveBeenCalledWith("articles", expect.objectContaining({ enabled: false }));
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
      render(<PolicyManager entities={[underReview()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      expect(screen.getByText(/policyLockedPlural/)).toHaveTextContent('"count":2');
      expect(screen.getByText("policyLockedWhy")).toBeInTheDocument();
    });

    it("counts one review in the singular", () => {
      render(
        <PolicyManager
          entities={[underReview({ inFlightReviews: 1 })]}
          approvers={approvers}
          locale="ar"
          onSave={vi.fn()}
        />,
      );

      expect(screen.getByText("policyLocked")).toBeInTheDocument();
    });

    it("blocks the save once the arrangement is actually changed", async () => {
      const onSave = vi.fn();
      render(<PolicyManager entities={[underReview()]} approvers={approvers} locale="ar" onSave={onSave} />);

      await userEvent.click(screen.getByLabelText("سارة"));

      // Changing who approves replaces the steps, and a replaced step is the
      // one those two reviews are waiting at — they could never be decided.
      // The server refuses it; this is the earlier half of the pair.
      expect(screen.getByRole("button", { name: "save" })).toBeDisabled();
      expect(onSave).not.toHaveBeenCalled();
    });

    it("announces the lock only once it is stopping something", async () => {
      render(<PolicyManager entities={[underReview()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      // Live from the first render, it would interrupt a screen-reader user
      // reading a row they had not yet touched.
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await userEvent.click(screen.getByLabelText("سارة"));

      expect(screen.getByRole("alert")).toHaveTextContent("policyLockedPlural");
    });

    it("never reaches the lock over an arrangement nobody changed", () => {
      render(<PolicyManager entities={[underReview()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      // Re-saving an unchanged arrangement writes nothing upstream, and the
      // row now offers no save until something differs — so the one operation
      // the lock must never block is one the screen cannot even attempt.
      expect(screen.queryByRole("button", { name: "save" })).not.toBeInTheDocument();
    });

    it("still lets approval be switched off", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<PolicyManager entities={[underReview()]} approvers={approvers} locale="ar" onSave={onSave} />);

      await userEvent.click(screen.getByLabelText("policyEnabled"));
      await userEvent.click(screen.getByRole("button", { name: "save" }));

      // Disabling strands no review, and a policy most needs correcting
      // exactly while work is moving through it.
      expect(onSave).toHaveBeenCalledWith("articles", expect.objectContaining({ enabled: false }));
    });

    it("takes the block away when the change is undone", async () => {
      render(<PolicyManager entities={[underReview()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      await userEvent.click(screen.getByLabelText("سارة"));
      expect(screen.getByRole("button", { name: "save" })).toBeDisabled();

      await userEvent.click(screen.getByLabelText("سارة"));

      // Read from the draft as it stands, not from what it was on mount. With
      // nothing left to save the row offers nothing, which is the same answer
      // as a disabled button and one less control to read.
      expect(screen.queryByRole("button", { name: "save" })).not.toBeInTheDocument();
    });

    it("says nothing about a lock on a type with no reviews running", () => {
      render(<PolicyManager entities={[entity()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

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
      render(<PolicyManager entities={[raced()]} approvers={approvers} locale="ar" onSave={onSave} />);

      // Something has to change for the row to offer a save at all.
      await userEvent.click(screen.getByLabelText("سارة"));
      await userEvent.click(screen.getByRole("button", { name: "save" }));

      // Swallowed, this leaves an administrator looking at a button they
      // pressed and an arrangement that never changed.
      expect(await screen.findByRole("alert")).toHaveTextContent("policySaveRefused");
    });

    it("distinguishes a refusal from a breakage", async () => {
      const onSave = vi.fn().mockResolvedValue({ code: "internalError" });
      render(<PolicyManager entities={[raced()]} approvers={approvers} locale="ar" onSave={onSave} />);

      await userEvent.click(screen.getByLabelText("سارة"));
      await userEvent.click(screen.getByRole("button", { name: "save" }));

      // "A review started, reload" and "try again" are different instructions.
      expect(await screen.findByRole("alert")).toHaveTextContent("policySaveFailed");
    });

    it("clears the refusal when the save is attempted again", async () => {
      const onSave = vi
        .fn()
        .mockResolvedValueOnce({ code: "reviewsInFlight", inFlightReviews: 1 })
        .mockResolvedValueOnce(null);
      render(<PolicyManager entities={[raced()]} approvers={approvers} locale="ar" onSave={onSave} />);

      await userEvent.click(screen.getByLabelText("سارة"));
      await userEvent.click(screen.getByRole("button", { name: "save" }));
      expect(await screen.findByRole("alert")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "save" }));

      // A stale refusal beside a successful save reads as a failure.
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("keeps one row's refusal out of another row's", async () => {
      const onSave = vi.fn().mockResolvedValue({ code: "reviewsInFlight", inFlightReviews: 1 });
      render(
        <PolicyManager
          entities={[raced(), entity({ entityType: "committees", enabled: true, mode: "ALL", approverIds: ["u1"] })]}
          approvers={approvers}
          locale="ar"
          onSave={onSave}
        />,
      );

      await userEvent.click(within(rowFor("articles")).getByLabelText("سارة"));
      await userEvent.click(within(rowFor("articles")).getByRole("button", { name: "save" }));

      expect(await within(rowFor("articles")).findByRole("alert")).toBeInTheDocument();
      expect(within(rowFor("committees")).queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("as a working tool rather than a table", () => {
    it("groups the types under the domain each belongs to", () => {
      render(
        <PolicyManager
          entities={[entity(), entity({ entityType: "committees" })]}
          approvers={approvers}
          locale="ar"
          onSave={vi.fn()}
        />,
      );

      // `articles` is public communication and `committees` is federation
      // governance. An administrator arrives asking "who signs off on the
      // news", not "what is `workflowRequired` for `articles`" — and twelve
      // identifiers in one flat column answer the second question only.
      const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
      expect(headings).toHaveLength(2);
      expect(headings).not.toContain("");
    });

    it("says who approves before it offers to change it", () => {
      render(
        <PolicyManager
          entities={[entity({ enabled: true, mode: "THRESHOLD", approverIds: ["u1", "u2"], threshold: 1 })]}
          approvers={approvers}
          locale="ar"
          onSave={vi.fn()}
        />,
      );

      const summary = screen.getByText(/^policySummaryOf:/);
      expect(summary).toHaveTextContent('"required":1');
      expect(summary).toHaveTextContent('"total":2');
      // The people by name, not by identifier: an administrator confirms an
      // arrangement by recognising who is in it.
      expect(summary).toHaveTextContent("أحمد");
    });

    it("says plainly when a type publishes without review", () => {
      render(<PolicyManager entities={[entity()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      expect(screen.getByText("policySummaryOff")).toBeInTheDocument();
    });

    it("calls out a policy that requires approval and names nobody", () => {
      render(
        <PolicyManager
          entities={[entity({ enabled: true, mode: "ALL", approverIds: [] })]}
          approvers={approvers}
          locale="ar"
          onSave={vi.fn()}
        />,
      );

      // This one arrangement is not strict, it is broken: nothing of that type
      // can ever be published, and nothing else on the screen would say so.
      expect(screen.getByText("policySummaryNobody")).toBeInTheDocument();
    });

    it("keeps naming an approver whose account is gone", () => {
      render(
        <PolicyManager
          entities={[entity({ enabled: true, mode: "ALL", approverIds: ["u1", "deleted-account"] })]}
          approvers={approvers}
          locale="ar"
          onSave={vi.fn()}
        />,
      );

      // A shorter list would hide the fact that a policy names somebody who no
      // longer exists — which is exactly what an administrator needs to see.
      expect(screen.getByText(/^policySummaryOf:/)).toHaveTextContent("deleted-account");
    });

    it("describes what is saved, not what is being typed", async () => {
      render(
        <PolicyManager
          entities={[entity({ enabled: true, mode: "ALL", approverIds: ["u1"] })]}
          approvers={approvers}
          locale="ar"
          onSave={vi.fn()}
        />,
      );

      await userEvent.click(screen.getByLabelText("سارة"));

      // A sentence that moved with the checkboxes would leave the
      // administrator no way to see what they are changing away from.
      expect(screen.getByText(/^policySummaryOf:/)).toHaveTextContent('"total":1');
    });
  });

  it("offers no save on a row nobody has touched", () => {
    render(<PolicyManager entities={[entity()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

    // Twelve rows each carrying a primary button spends the screen's loudest
    // control on eleven rows with nothing to save, and buries the one that
    // matters.
    expect(screen.queryByRole("button", { name: "save" })).not.toBeInTheDocument();
  });

  it("offers a save as soon as something changes", async () => {
    render(<PolicyManager entities={[entity()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

    await userEvent.click(screen.getByLabelText("policyEnabled"));

    expect(screen.getByRole("button", { name: "save" })).toBeInTheDocument();
  });

  describe("a sequential arrangement", () => {
    const sequential = () =>
      entity({ enabled: true, mode: "SEQUENTIAL", approverIds: ["u1", "u2"] });

    it("numbers the approvers, because the order is the policy", () => {
      render(<PolicyManager entities={[sequential()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      // The same two people in two orders are two arrangements: a different
      // person holds every article up first. A checkbox grid cannot say which.
      const positions = screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
      expect(positions.some((text) => text.includes('"position":1') && text.includes("أحمد"))).toBe(true);
      expect(positions.some((text) => text.includes('"position":2') && text.includes("سارة"))).toBe(true);
    });

    it("moves an approver down, and says whose button that is", async () => {
      render(<PolicyManager entities={[sequential()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      // Each button names the person it moves. A column of identical "down"
      // buttons tells a screen-reader user which of them they are on: none.
      await userEvent.click(screen.getByRole("button", { name: /policyMoveDown.*أحمد/ }));

      const positions = screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
      expect(positions.some((text) => text.includes('"position":1') && text.includes("سارة"))).toBe(true);
    });

    it("cannot move the first approver up, or the last one down", () => {
      render(<PolicyManager entities={[sequential()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      // Disabled rather than wrapping: pressing "up" on the first person means
      // nothing happens, not "send them to the back".
      expect(screen.getByRole("button", { name: /policyMoveUp.*أحمد/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /policyMoveDown.*سارة/ })).toBeDisabled();
    });

    it("sends the order the administrator arranged", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<PolicyManager entities={[sequential()]} approvers={approvers} locale="ar" onSave={onSave} />);

      await userEvent.click(screen.getByRole("button", { name: /policyMoveDown.*أحمد/ }));
      await userEvent.click(screen.getByRole("button", { name: "save" }));

      // `buildSteps` numbers the steps from this array's own order, so a list
      // sorted or de-duplicated on the way out would silently reassign who
      // decides first.
      expect(onSave).toHaveBeenCalledWith("articles", expect.objectContaining({ approverIds: ["u2", "u1"] }));
    });

    it("offers no order to arrange under the other two modes", () => {
      render(
        <PolicyManager
          entities={[entity({ enabled: true, mode: "ALL", approverIds: ["u1", "u2"] })]}
          approvers={approvers}
          locale="ar"
          onSave={vi.fn()}
        />,
      );

      // Under ALL and THRESHOLD every approver decides on the same step, so
      // there is no order — and a numbered list would invent one.
      expect(screen.queryByText("policyOrder")).not.toBeInTheDocument();
    });

    it("keeps an approver whose account is gone in its place", () => {
      render(
        <PolicyManager
          entities={[entity({ enabled: true, mode: "SEQUENTIAL", approverIds: ["u1", "deleted-account"] })]}
          approvers={approvers}
          locale="ar"
          onSave={vi.fn()}
        />,
      );

      // Dropping it would renumber the arrangement and hide the fact that a
      // policy names somebody who no longer exists.
      const positions = screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
      expect(positions.some((text) => text.includes("deleted-account"))).toBe(true);
    });
  });

  describe("a policy that would deadlock", () => {
    const nobody = () => entity({ enabled: true, mode: "ALL", approverIds: [] });

    it("says so on a type that already carries the deadlock", () => {
      render(<PolicyManager entities={[nobody()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      // A stored arrangement that stops every publication of that type — the
      // shape the API now answers `unsatisfiablePolicy` for. Nothing is dirty,
      // so there is no save to disable; what matters is that the row says what
      // is wrong with it rather than looking like any other strict policy.
      expect(screen.getByText("policyDeadlocked")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "save" })).not.toBeInTheDocument();
    });

    it("says it before the save, not after", async () => {
      const onSave = vi.fn();
      render(<PolicyManager entities={[entity()]} approvers={approvers} locale="ar" onSave={onSave} />);

      await userEvent.click(screen.getByLabelText("policyEnabled"));

      expect(screen.getByRole("alert")).toHaveTextContent("policyDeadlocked");
      expect(onSave).not.toHaveBeenCalled();
    });

    it("lifts the refusal as soon as somebody is named", async () => {
      render(<PolicyManager entities={[nobody()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      await userEvent.click(screen.getByLabelText("أحمد"));

      expect(screen.queryByText("policyDeadlocked")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "save" })).toBeEnabled();
    });

    it("still allows turning approval off on a deadlocked type", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<PolicyManager entities={[nobody()]} approvers={approvers} locale="ar" onSave={onSave} />);

      await userEvent.click(screen.getByLabelText("policyEnabled"));
      await userEvent.click(screen.getByRole("button", { name: "save" }));

      // The way out of the deadlock. Refusing this too would leave a broken
      // policy with no way to correct it from the screen that stored it.
      expect(onSave).toHaveBeenCalledWith("articles", expect.objectContaining({ enabled: false }));
    });
  });
});

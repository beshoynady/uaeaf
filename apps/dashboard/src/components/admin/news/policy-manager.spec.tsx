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

    expect(screen.getByRole("alert")).toHaveTextContent("errorApprovers");
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
    expect(screen.getByText(/policySummary/)).toHaveTextContent('"required":2');
    expect(screen.getByText(/policySummary/)).toHaveTextContent('"total":2');
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

    it("still saves the same arrangement unchanged", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<PolicyManager entities={[underReview()]} approvers={approvers} locale="ar" onSave={onSave} />);

      await userEvent.click(screen.getByRole("button", { name: "save" }));

      // Re-saving writes nothing upstream, so refusing it would tell an
      // administrator their own untouched settings are now illegal.
      expect(onSave).toHaveBeenCalledWith("articles", expect.objectContaining({ enabled: true }));
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

    it("lifts the block when the change is undone", async () => {
      render(<PolicyManager entities={[underReview()]} approvers={approvers} locale="ar" onSave={vi.fn()} />);

      await userEvent.click(screen.getByLabelText("سارة"));
      expect(screen.getByRole("button", { name: "save" })).toBeDisabled();

      await userEvent.click(screen.getByLabelText("سارة"));

      // Read from the draft as it stands, not from what it was on mount.
      expect(screen.getByRole("button", { name: "save" })).toBeEnabled();
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

      await userEvent.click(screen.getByRole("button", { name: "save" }));

      // Swallowed, this leaves an administrator looking at a button they
      // pressed and an arrangement that never changed.
      expect(await screen.findByRole("alert")).toHaveTextContent("policySaveRefused");
    });

    it("distinguishes a refusal from a breakage", async () => {
      const onSave = vi.fn().mockResolvedValue({ code: "internalError" });
      render(<PolicyManager entities={[raced()]} approvers={approvers} locale="ar" onSave={onSave} />);

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

      await userEvent.click(within(rowFor("articles")).getByRole("button", { name: "save" }));

      expect(await within(rowFor("articles")).findByRole("alert")).toBeInTheDocument();
      expect(within(rowFor("committees")).queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});

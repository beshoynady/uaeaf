import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApprovalFlow } from "./approval-flow";

describe("ApprovalFlow", () => {
  it("reads as an ordered path from start to end", () => {
    // An ordered list, so a screen reader says "3 of 5" before each stage —
    // the order is the information, and a row of boxes with arrows between
    // them says nothing without sight.
    render(<ApprovalFlow caption="Current path" start="Written" stages={["Editor", "Director"]} end="Published" />);

    const figure = screen.getByRole("figure", { name: "Current path" });
    const stages = within(figure)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(stages).toEqual(["Written", "Editor", "Director", "Published"]);
  });

  it("goes straight from start to end when nobody reviews", () => {
    render(<ApprovalFlow caption="Current path" start="Written" stages={[]} end="Published directly" />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps the arrows out of what is read aloud", () => {
    const { container } = render(
      <ApprovalFlow caption="Current path" start="Written" stages={["Editor"]} end="Published" />,
    );

    const arrows = container.querySelectorAll("svg");
    expect(arrows).toHaveLength(2);
    arrows.forEach((arrow) => expect(arrow).toHaveAttribute("aria-hidden", "true"));
  });
});

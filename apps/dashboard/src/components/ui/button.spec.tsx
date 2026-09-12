import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

/**
 * CMP-BUTTON-001's loading contract, which every screen used to write by hand
 * and none of them wrote the same way.
 */
describe("Button", () => {
  it("is a real button element, defaulting to type=button", () => {
    render(<Button>Publish</Button>);

    const button = screen.getByRole("button", { name: "Publish" });
    expect(button.tagName).toBe("BUTTON");
    // A typeless button inside a form submits it — which is how a Cancel
    // beside a form ends up saving.
    expect(button).toHaveAttribute("type", "button");
  });

  it("submits when asked to", () => {
    render(<Button type="submit">Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });

  // "The Label MUST NOT jump or suddenly disappear" — so it is still there,
  // still named, and still occupying the width it reserved.
  it("keeps its accessible name while loading", () => {
    render(<Button loading>Publish</Button>);

    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
  });

  it("reports itself busy while loading", () => {
    render(<Button loading>Publish</Button>);

    expect(screen.getByRole("button", { name: "Publish" })).toHaveAttribute("aria-busy", "true");
  });

  it("carries no busy attribute when idle", () => {
    render(<Button>Publish</Button>);

    expect(screen.getByRole("button", { name: "Publish" })).not.toHaveAttribute("aria-busy");
  });

  // The second press is the one that publishes twice.
  it("cannot be pressed again while its operation runs", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button loading onClick={onClick}>
        Publish
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("passes the press through when idle", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Publish</Button>);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("stays disabled when told to, loading or not", () => {
    render(<Button disabled>Publish</Button>);

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("takes its interaction states from the variant, never from the caller", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button", { name: "Delete" });
    // The registry's own contract test proves the string carries every state;
    // this proves the variant actually reaches the element.
    expect(button.className).toMatch(/--color-semantic-error/);
    expect(button.className).toMatch(/hover:/);
  });

  it("appends layout classes without losing the variant's", () => {
    render(<Button className="w-full">Publish</Button>);

    const button = screen.getByRole("button", { name: "Publish" });
    expect(button.className).toContain("w-full");
    expect(button.className).toMatch(/--button-primary-background/);
  });
});

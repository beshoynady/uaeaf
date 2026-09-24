import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VideoStill } from "./video-still";

/**
 * "There is no picture" is a state, not a hole.
 *
 * The broadcast banner drew nothing at all before this existed, and the form
 * preview drew an empty frame — both for the ordinary case of a platform that
 * names no still. This file holds the rule that every surface answers that
 * case with something deliberate.
 */
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

describe("VideoStill", () => {
  it("draws the stored picture when there is one", () => {
    const { container } = render(<VideoStill url="https://cdn.test/still.jpg" />);

    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.test/still.jpg");
  });

  it("draws a dark ground and a mark when there is none, never an empty box", () => {
    const { container } = render(<VideoStill />);

    expect(container.querySelector("img")).toBeNull();
    const placeholder = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(placeholder).not.toBeNull();
    // The video system's own register, and a mark inside it.
    expect(placeholder.getAttribute("style")).toContain("linear-gradient");
    expect(placeholder.querySelector("svg")).not.toBeNull();
  });

  it("keeps the placeholder out of the accessible name", () => {
    // "There is no still" is not worth reading out once per row down a list of
    // ten. The title beside it is the record's name.
    render(<VideoStill />);

    expect(screen.queryByRole("img")).toBeNull();
  });

  it("treats null and undefined the same way", () => {
    const { container: withNull } = render(<VideoStill url={null} />);
    const { container: withNothing } = render(<VideoStill />);

    expect(withNull.querySelector("img")).toBeNull();
    expect(withNothing.querySelector("img")).toBeNull();
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/lib/navigation";
import { NAV_ICON, UiIcon } from "./ui-icons";

/** Every screen a link can reach: the top-level screens and each group's
 *  children, not the groups themselves, which draw no icon of their own. */
const screenKeys = (): string[] =>
  NAV_ITEMS.flatMap((item) => (item.children ? item.children.map((child) => child.key) : [item.key]));

describe("NAV_ICON", () => {
  it("gives every screen in the navigation an icon", () => {
    // The collapsed sidebar shows icons only. A screen with no icon would be
    // an empty square there, named only by a tooltip nobody can see coming.
    const missing = screenKeys().filter((key) => !(key in NAV_ICON));
    expect(missing).toEqual([]);
  });
});

describe("UiIcon", () => {
  it("is hidden from assistive technology, because its control carries the name", () => {
    const { container } = render(<UiIcon name="search" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("draws in the colour of the text around it", () => {
    // CMP-ICON-001: `currentColor`, so an icon follows its control through
    // hover, disabled and the three themes without a colour of its own.
    const { container } = render(<UiIcon name="search" />);
    expect(container.querySelector("svg")).toHaveAttribute("stroke", "currentColor");
  });
});

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PRIMARY_NAV, type NavItem } from "@/lib/navigation";
import { NavIcon } from "./nav-icon";

const leafKeys = (items: readonly NavItem[]): string[] =>
  items.flatMap((item) => (item.children ? leafKeys(item.children) : item.href ? [item.key] : []));

describe("NavIcon", () => {
  it("renders a glyph for every nav link key with no crash", () => {
    for (const key of leafKeys(PRIMARY_NAV)) {
      const { container, unmount } = render(<NavIcon name={key} />);
      expect(container.querySelector("svg"), key).not.toBeNull();
      unmount();
    }
  });

  it("a known key renders its own glyph, not the fallback", () => {
    const { container } = render(<NavIcon name="clubs" />);
    expect(container.querySelector("svg")).not.toHaveAttribute("data-icon-fallback");
  });

  it("falls back to the generic glyph for an unmapped key", () => {
    const { container } = render(<NavIcon name="not-a-real-nav-key" />);
    expect(container.querySelector("svg")).toHaveAttribute("data-icon-fallback", "true");
  });
});

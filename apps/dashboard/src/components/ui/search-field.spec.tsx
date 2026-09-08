import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchField } from "./search-field";

/**
 * The five search controls this component replaces each removed the browser's
 * focus outline and drew nothing in its place — `outline-none` on the input,
 * no `focus-within:` on the wrapping label. A keyboard user tabbing into the
 * primary filter of four separate admin screens got no indication of where
 * they were. That is WCAG 2.4.7, and it shipped.
 *
 * They were five copies of one control, so the fix is one control.
 */
function renderField(over: Partial<React.ComponentProps<typeof SearchField>> = {}) {
  return render(
    <SearchField label="ابحث في الأدوار" value="" onValueChange={() => {}} {...over} />,
  );
}

describe("SearchField", () => {
  it("is reachable and named for a screen reader", () => {
    renderField();
    expect(screen.getByRole("searchbox", { name: "ابحث في الأدوار" })).toBeInTheDocument();
  });

  it("keeps the accessible name even when the label is visually hidden", () => {
    // Every existing call site hid the label. A placeholder is not a label:
    // it disappears on first keystroke and is not exposed as an accessible
    // name by every AT/browser pairing.
    renderField();
    const field = screen.getByRole("searchbox", { name: "ابحث في الأدوار" });
    expect(field).toHaveAttribute("placeholder", "ابحث في الأدوار");
  });

  it("reports what the reader typed", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderField({ onValueChange });

    await user.type(screen.getByRole("searchbox"), "م");

    expect(onValueChange).toHaveBeenCalledWith("م");
  });

  it("draws a focus indicator on the shell that contains the input", () => {
    // The regression this component exists to prevent. The shell carries the
    // ring because the input fills it edge to edge.
    renderField();
    const shell = screen.getByRole("searchbox").closest("label");
    expect(shell?.className).toMatch(/focus-within:ring-2/);
    expect(shell?.className).toMatch(/focus-within:ring-offset-\[color:var\(--a11y-focus-offset\)\]/);
  });

  it("renders its icon as decoration, not as content", () => {
    const { container } = renderField();
    const icon = container.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    // `focusable="false"` — IE/Edge legacy still tab-stops SVGs without it,
    // and it costs nothing to keep the tab order to real controls only.
    expect(icon).toHaveAttribute("focusable", "false");
  });

  it("carries a direction override where the content is not the UI language", () => {
    // The permission matrix searches resource identifiers — `contactMessages`,
    // `aboutFederationPage` — which are Latin regardless of the interface
    // being Arabic. Without dir="ltr" the caret and any punctuation reorder.
    renderField({ dir: "ltr" });
    expect(screen.getByRole("searchbox")).toHaveAttribute("dir", "ltr");
  });

  it("styles the disabled state rather than only setting the attribute", () => {
    renderField({ disabled: true });
    const field = screen.getByRole("searchbox");
    expect(field).toBeDisabled();
    expect(field.closest("label")?.className).toMatch(/has-\[:disabled\]:/);
  });
});

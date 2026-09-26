import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { SectionList } from "./section-list";
import { readinessOf } from "@/lib/admin/about-readiness";
import type { AboutDraft } from "@/lib/admin/about-readiness";
import { toDraft } from "@/lib/admin/about-federation";

/**
 * The page's ten sections as a vertical tab strip (ADR-0102 §D1).
 *
 * Three things are worth pinning. **The switch is a sibling of the tab**, so
 * toggling a section's visibility does not navigate the editor away from the
 * section they are editing — one control, one meaning. **The strip is a vertical
 * tablist**, so a keyboard reader moves through ten sections with the arrows
 * from a single tab stop rather than ten. And **three sections have no switch**,
 * for two different reasons (ADR-0101 D2), which is a rule that would break
 * silently the moment someone made the rows uniform.
 */

/** A draft with nothing filled in beyond what the readiness computation needs.
 *  The sections' *contents* are not what this file is about. */
const draft: AboutDraft = toDraft({
  _id: "rec-1",
  updatedAt: "2026-09-26T00:00:00.000Z",
  hiddenSections: [],
  hero: {},
  facts: {},
  seo: {},
} as never);

const mount = (overrides: Partial<Parameters<typeof SectionList>[0]> = {}) => {
  const onSelect = vi.fn();
  const onToggle = vi.fn();
  const readiness = readinessOf(draft, { leaderCount: 3, statCount: 2 });

  renderWithIntl(
    <SectionList
      sections={readiness.sections}
      selected="hero"
      hiddenSections={[]}
      disabled={false}
      onSelect={onSelect}
      onToggle={onToggle}
      {...overrides}
    />,
    "ar",
  );

  return { onSelect, onToggle };
};

describe("the About section rail", () => {
  it("is a vertical tablist", () => {
    mount();
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("marks one tab selected, and keeps one tab stop", () => {
    mount({ selected: "story" });

    const tabs = screen.getAllByRole("tab");
    expect(tabs.filter((tab) => tab.getAttribute("aria-selected") === "true")).toHaveLength(1);
    expect(tabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
  });

  it("changes the switch without changing the selection", async () => {
    const { onSelect, onToggle } = mount();

    await userEvent.click(screen.getByRole("switch", { name: /القصة/ }));

    // The switch sits beside the tab, never inside it. A control inside a
    // control is one click with two meanings.
    expect(onToggle).toHaveBeenCalledWith("story", false);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("moves down the rail on ArrowDown and wraps", async () => {
    const { onSelect } = mount({ selected: "hero" });

    screen.getAllByRole("tab")[0].focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(onSelect).toHaveBeenCalledWith("facts");

    // Backwards from the first reaches the last: the rail is a ring, as the
    // tabs pattern specifies.
    await userEvent.keyboard("{ArrowUp}");
    expect(onSelect).toHaveBeenCalledWith("cta");
  });

  it("honours Home and End", async () => {
    const { onSelect } = mount({ selected: "story" });

    screen.getByRole("tab", { name: /القصة/ }).focus();
    await userEvent.keyboard("{End}");
    expect(onSelect).toHaveBeenCalledWith("cta");
    await userEvent.keyboard("{Home}");
    expect(onSelect).toHaveBeenCalledWith("hero");
  });

  it("gives the hero and the two automatic sections no switch", () => {
    mount();

    // ADR-0101 D2: the hero always prints, and leadership and the ecosystem
    // follow their source rather than an editorial preference. Ten rows, seven
    // switches.
    expect(screen.getAllByRole("tab")).toHaveLength(10);
    expect(screen.getAllByRole("switch")).toHaveLength(7);
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorTabs } from "./editor-tabs";

/**
 * The tab strip's keyboard contract.
 *
 * Two things here are worth a test and would not announce themselves if they
 * broke. **The arrows follow the writing direction**: the dashboard's default
 * locale is Arabic, so the *next* tab is to the left, and `element.dir` reads
 * "" on an element that inherits its direction — the direction has to come from
 * the computed style (memory: `reference_rtl_scroll_and_inline_block`). And
 * **the strip is one tab stop**, not one per tab: the WAI-ARIA tabs pattern puts
 * `tabIndex={0}` on the selected tab alone, so a keyboard reader tabs past the
 * strip in one press rather than four.
 */

const TABS = [
  { id: "content", label: "المحتوى" },
  { id: "review", label: "المراجعة والنشر", count: 5, tone: "warning" as const },
  { id: "history", label: "الإصدارات والسجل", count: 21 },
] as const;

const setup = (selected: string = "content", dir: "rtl" | "ltr" = "rtl") => {
  const onSelect = vi.fn();
  render(
    <div dir={dir}>
      <EditorTabs tabs={TABS} selected={selected} onSelect={onSelect} label="أقسام الإدارة" />
    </div>,
  );
  return onSelect;
};

const focusTab = (name: string) => {
  const tab = screen.getByRole("tab", { name: new RegExp(name) });
  tab.focus();
  return tab;
};

describe("EditorTabs", () => {
  it("is a labelled tablist", () => {
    setup();
    expect(screen.getByRole("tablist")).toHaveAccessibleName("أقسام الإدارة");
  });

  it("marks the selected tab, and only it", () => {
    setup("review");
    const selected = screen.getAllByRole("tab").filter((tab) => tab.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAccessibleName(/المراجعة/);
  });

  it("keeps exactly one tab in the tab order", () => {
    setup("review");
    const stops = screen.getAllByRole("tab").filter((tab) => tab.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAccessibleName(/المراجعة/);
  });

  it("moves to the NEXT tab on ArrowLeft in RTL", async () => {
    const onSelect = setup("content");
    focusTab("المحتوى");
    await userEvent.keyboard("{ArrowLeft}");
    expect(onSelect).toHaveBeenCalledWith("review");
  });

  it("moves to the PREVIOUS tab on ArrowRight in RTL", async () => {
    const onSelect = setup("review");
    focusTab("المراجعة");
    await userEvent.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenCalledWith("content");
  });

  it("moves to the NEXT tab on ArrowRight in LTR", async () => {
    // The same component in the English dashboard. Reversing the arrows for
    // Arabic must not reverse them for everybody.
    const onSelect = setup("content", "ltr");
    focusTab("المحتوى");
    await userEvent.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenCalledWith("review");
  });

  it("wraps at both ends", async () => {
    const onSelect = setup("content");
    focusTab("المحتوى");
    // Backwards from the first reaches the last.
    await userEvent.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenCalledWith("history");
  });

  it("honours Home and End", async () => {
    const onSelect = setup("review");
    focusTab("المراجعة");
    await userEvent.keyboard("{End}");
    expect(onSelect).toHaveBeenCalledWith("history");
    await userEvent.keyboard("{Home}");
    expect(onSelect).toHaveBeenCalledWith("content");
  });

  it("selects on click", async () => {
    const onSelect = setup("content");
    await userEvent.click(screen.getByRole("tab", { name: /الإصدارات/ }));
    expect(onSelect).toHaveBeenCalledWith("history");
  });

  it("names its count in the accessible name, not in colour alone", () => {
    setup();
    // Chapter 6 §6.2: a badge that only a sighted reader can count is not a
    // signal. The number is part of the tab's name.
    expect(screen.getByRole("tab", { name: /المراجعة/ })).toHaveAccessibleName(/5/);
  });

  it("points each tab at its own panel", () => {
    setup();
    const tab = screen.getByRole("tab", { name: /المحتوى/ });
    expect(tab.getAttribute("aria-controls")).toBe("editor-panel-content");
    expect(tab.id).toBe("editor-tab-content");
  });
});

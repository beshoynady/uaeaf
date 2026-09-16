import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import type { PlanListItemDraft, PlanPhaseDraft } from "@/lib/admin/plan-lists";
import { PlanListField } from "./plan-list-field";

/**
 * The list editor the strategic plan's five lists share. What it must keep
 * true on every operation: rows drawn in `displayOrder`, `_id`s kept on the
 * rows that had one and absent on the rows that did not, `displayOrder`
 * 1..n after every move, and a hidden row still on the screen and still
 * editable.
 */

const text = (value: string) => ({ ar: value, en: value });

const LABELS = {
  legend: (number: number, total: number) => `المحور ${number} من ${total}`,
  add: "إضافة محور",
  remove: "حذف هذا المحور",
  empty: "لا محاور بعد.",
  show: "ظاهر على الصفحة",
  hide: "مخفي",
  lastVisible: "يبقى في كل قسم عنصر ظاهر واحد على الأقل.",
};

const ITEMS: PlanListItemDraft[] = [
  { _id: "p1", title: text("الأول"), description: text("وصف"), displayOrder: 1, isVisible: true },
  { _id: "p2", title: text("الثاني"), description: text("وصف"), displayOrder: 2, isVisible: true },
  { _id: "p3", title: text("الثالث"), description: text("وصف"), displayOrder: 3, isVisible: true },
];

const mount = (items: PlanListItemDraft[] = ITEMS) => {
  const onChange = vi.fn();
  renderWithIntl(
    <PlanListField id="pillar" items={items} onChange={onChange} disabled={false} labels={LABELS} fields={{ kind: "item" }} />,
  );
  return onChange;
};

const row = (number: number, total = 3) => screen.getByRole("group", { name: `المحور ${number} من ${total}` });

const lastCall = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.calls[onChange.mock.calls.length - 1][0] as PlanListItemDraft[];

describe("PlanListField", () => {
  it("draws the rows in displayOrder with their titles", () => {
    mount();

    expect(screen.getAllByRole("group")).toHaveLength(3);
    expect(row(1)).toBeInTheDocument();
    expect(row(3)).toBeInTheDocument();
    expect(
      screen.getAllByLabelText("العنوان — بالعربية").map((input) => (input as HTMLInputElement).value),
    ).toEqual(["الأول", "الثاني", "الثالث"]);
  });

  it("says so when the list is empty", () => {
    mount([]);
    expect(screen.getByText("لا محاور بعد.")).toBeInTheDocument();
  });

  it("adds a row without an _id, numbered last and visible", async () => {
    const onChange = mount();

    await userEvent.click(screen.getByRole("button", { name: "إضافة محور" }));

    const next = lastCall(onChange);
    expect(next).toHaveLength(4);
    expect("_id" in next[3]).toBe(false);
    expect(next[3].displayOrder).toBe(4);
    expect(next[3].isVisible).toBe(true);
    expect(next.slice(0, 3).map((entry) => entry._id)).toEqual(["p1", "p2", "p3"]);
  });

  it("moves a row down with the button, keeping _ids and renumbering", async () => {
    const onChange = mount();

    await userEvent.click(within(row(1)).getByRole("button", { name: "تحريك لأسفل" }));

    const next = lastCall(onChange);
    expect(next.map((entry) => entry._id)).toEqual(["p2", "p1", "p3"]);
    expect(next.map((entry) => entry.displayOrder)).toEqual([1, 2, 3]);
  });

  it("disables the move that would leave the list", () => {
    mount();

    expect(within(row(1)).getByRole("button", { name: "تحريك لأعلى" })).toBeDisabled();
    expect(within(row(3)).getByRole("button", { name: "تحريك لأسفل" })).toBeDisabled();
  });

  it("reorders on a native drag and drop, any distance", () => {
    const onChange = mount();
    const rows = screen.getAllByRole("listitem");

    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(rows[2]);
    fireEvent.drop(rows[2]);

    const next = lastCall(onChange);
    expect(next.map((entry) => entry._id)).toEqual(["p2", "p3", "p1"]);
    expect(next.map((entry) => entry.displayOrder)).toEqual([1, 2, 3]);
  });

  it("does nothing on a drop with no drag in flight", () => {
    const onChange = mount();

    fireEvent.drop(screen.getAllByRole("listitem")[1]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("offers a drag handle with an accessible name on every row", () => {
    mount();
    expect(screen.getAllByRole("button", { name: "اسحب لإعادة الترتيب" })).toHaveLength(3);
  });

  it("hides a row without removing it, and marks it hidden", async () => {
    const onChange = mount();

    await userEvent.click(within(row(2)).getByRole("checkbox", { name: "ظاهر على الصفحة" }));

    const next = lastCall(onChange);
    expect(next).toHaveLength(3);
    expect(next.map((entry) => entry.isVisible)).toEqual([true, false, true]);
    expect(next[1]._id).toBe("p2");
  });

  it("keeps a hidden row editable and badged", () => {
    mount([{ ...ITEMS[0], isVisible: false }, ITEMS[1]]);

    const hidden = row(1, 2);
    expect(within(hidden).getByText("مخفي")).toBeInTheDocument();
    expect(within(hidden).getByLabelText("العنوان — بالعربية")).toBeEnabled();
    expect(within(row(2, 2)).queryByText("مخفي")).toBeNull();
  });

  it("removes a row and renumbers the rest", async () => {
    const onChange = mount();

    await userEvent.click(within(row(2)).getByRole("button", { name: "حذف هذا المحور" }));

    const next = lastCall(onChange);
    expect(next.map((entry) => entry._id)).toEqual(["p1", "p3"]);
    expect(next.map((entry) => entry.displayOrder)).toEqual([1, 2]);
  });

  it("edits one language of one row without touching the others", async () => {
    const onChange = mount();

    await userEvent.type(within(row(3)).getByLabelText("العنوان — بالإنجليزية"), "!");

    const next = lastCall(onChange);
    expect(next[2].title.en).toBe("الثالث!");
    expect(next[2].title.ar).toBe("الثالث");
    expect(next[0]).toEqual(ITEMS[0]);
  });

  it("offers the four phase icons to a phase list, with the stored one selected", () => {
    const phases: PlanPhaseDraft[] = [{ ...ITEMS[0], iconKey: "trophy" }];
    const onChange = vi.fn();
    renderWithIntl(
      <PlanListField id="phase" items={phases} onChange={onChange} disabled={false} labels={LABELS} fields={{ kind: "phase" }} />,
    );

    const select = screen.getByRole("combobox", { name: "الأيقونة" }) as HTMLSelectElement;
    expect(select.value).toBe("trophy");
    expect([...select.options].map((option) => option.value)).toEqual(["layers", "trending-up", "trophy", "sparkles"]);
  });

  it("starts a new phase on the first icon key, since the API requires one", async () => {
    const onChange = vi.fn();
    renderWithIntl(
      <PlanListField id="phase" items={[]} onChange={onChange} disabled={false} labels={LABELS} fields={{ kind: "phase" }} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "إضافة محور" }));

    const [next] = onChange.mock.calls[0][0] as PlanPhaseDraft[];
    expect(next.iconKey).toBe("layers");
    expect("_id" in next).toBe(false);
  });

  it("edits a metric's value and label", async () => {
    const onChange = vi.fn();
    renderWithIntl(
      <PlanListField
        id="metric"
        items={[{ _id: "m1", value: "2030", label: text("الأفق"), displayOrder: 1, isVisible: true }]}
        onChange={onChange}
        disabled={false}
        labels={LABELS}
        fields={{ kind: "metric" }}
      />,
    );

    await userEvent.type(screen.getByLabelText("القيمة"), "+");

    const [next] = onChange.mock.calls[onChange.mock.calls.length - 1][0] as { value: string }[];
    expect(next.value).toBe("2030+");
    expect(screen.getByLabelText("التسمية — بالعربية")).toBeInTheDocument();
  });

  it("does not require a step's description", () => {
    renderWithIntl(
      <PlanListField
        id="step"
        items={[{ _id: "s1", title: text("خطوة"), description: text(""), displayOrder: 1, isVisible: true }]}
        onChange={vi.fn()}
        disabled={false}
        labels={LABELS}
        fields={{ kind: "step" }}
      />,
    );

    expect(screen.getByLabelText("العنوان — بالعربية")).toBeRequired();
    expect(screen.getByLabelText("الوصف — بالعربية")).not.toBeRequired();
  });

  // ADR-0075: an editor may not take a section off the page, and a list with
  // no visible item takes its section off. The last visible item's remove
  // and hide controls are refused, and the row says why (CLAUDE.md §31.2:
  // the unsafe state is unreachable, not merely warned about).
  it("refuses to remove or hide the last visible item, and says why", () => {
    mount([ITEMS[0], { ...ITEMS[1], isVisible: false }]);

    const last = row(1, 2);
    const remove = within(last).getByRole("button", { name: "حذف هذا المحور" });
    const hide = within(last).getByRole("checkbox", { name: "ظاهر على الصفحة" });
    expect(remove).toBeDisabled();
    expect(hide).toBeDisabled();
    expect(within(last).getByText(LABELS.lastVisible)).toBeInTheDocument();
    expect(remove).toHaveAccessibleDescription(LABELS.lastVisible);

    // The hidden row is not the last visible one: it can still go.
    expect(within(row(2, 2)).getByRole("button", { name: "حذف هذا المحور" })).toBeEnabled();
    expect(within(row(2, 2)).queryByText(LABELS.lastVisible)).toBeNull();
  });

  // ADR-0075 (owner decision 2026-09-16): the phases and the execution steps
  // stand in one row, and past ten items the section stops being readable at
  // any width. The API refuses the eleventh; the screen makes it unreachable
  // and says why, and `add` checks again at the moment it acts (§31).
  it("refuses to add past the list's limit, and says why", async () => {
    const ten = Array.from({ length: 10 }, (_, index) => ({
      ...ITEMS[0],
      _id: `p${index + 1}`,
      displayOrder: index + 1,
    }));
    const onChange = vi.fn();
    renderWithIntl(
      <PlanListField
        id="phase"
        items={ten}
        onChange={onChange}
        disabled={false}
        labels={{ ...LABELS, limitReached: "لا يزيد هذا القسم على ١٠ عناصر." }}
        fields={{ kind: "item" }}
        max={10}
      />,
    );

    const add = screen.getByRole("button", { name: "إضافة محور" });
    expect(add).toBeDisabled();
    expect(add).toHaveAccessibleDescription("لا يزيد هذا القسم على ١٠ عناصر.");
    await userEvent.click(add);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("leaves adding open below the limit, and on a list with no limit", () => {
    const nine = Array.from({ length: 9 }, (_, index) => ({ ...ITEMS[0], _id: `p${index + 1}`, displayOrder: index + 1 }));
    const view = renderWithIntl(
      <PlanListField
        id="phase"
        items={nine}
        onChange={vi.fn()}
        disabled={false}
        labels={{ ...LABELS, limitReached: "لا يزيد هذا القسم على ١٠ عناصر." }}
        fields={{ kind: "item" }}
        max={10}
      />,
    );
    expect(screen.getByRole("button", { name: "إضافة محور" })).toBeEnabled();
    view.unmount();

    // The pillars wrap on their own: no limit, no note, whatever the count.
    mount(Array.from({ length: 12 }, (_, index) => ({ ...ITEMS[0], _id: `q${index + 1}`, displayOrder: index + 1 })));
    expect(screen.getByRole("button", { name: "إضافة محور" })).toBeEnabled();
  });

  it("refuses the only item of a list", () => {
    mount([ITEMS[0]]);
    expect(within(row(1, 1)).getByRole("button", { name: "حذف هذا المحور" })).toBeDisabled();
  });

  // CLAUDE.md §31.1: the guard is read when the drop lands, not when the drag began.
  it("refuses a drop when the list became disabled while the row was in flight", () => {
    const onChange = vi.fn();
    const view = renderWithIntl(
      <PlanListField id="pillar" items={ITEMS} onChange={onChange} disabled={false} labels={LABELS} fields={{ kind: "item" }} />,
    );
    const rows = screen.getAllByRole("listitem");

    fireEvent.dragStart(rows[0]);
    view.rerender(<PlanListField id="pillar" items={ITEMS} onChange={onChange} disabled labels={LABELS} fields={{ kind: "item" }} />);
    fireEvent.dragOver(rows[2]);
    fireEvent.drop(rows[2]);

    expect(onChange).not.toHaveBeenCalled();
  });

  // Rows are keyed by position, so after a remove the next row's remove
  // button would sit under the pointer and the keyboard focus: a second press
  // would delete a second item.
  it("moves focus to the add button after a remove", async () => {
    mount();

    await userEvent.click(within(row(2)).getByRole("button", { name: "حذف هذا المحور" }));

    expect(screen.getByRole("button", { name: "إضافة محور" })).toHaveFocus();
  });

  it("disables every control when told to", () => {
    renderWithIntl(
      <PlanListField id="pillar" items={ITEMS} onChange={vi.fn()} disabled labels={LABELS} fields={{ kind: "item" }} />,
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).toBeDisabled();
    }
  });
});

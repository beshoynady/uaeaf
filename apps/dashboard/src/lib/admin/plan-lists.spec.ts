import { describe, expect, it } from "vitest";
import {
  appendItem,
  fromStoredList,
  moveItem,
  removeItem,
  renumber,
  sortItems,
  toStoredList,
  toggleVisible,
  type PlanListItemDraft,
  type PlanStepDraft,
} from "./plan-lists";

/**
 * The five lists of the strategic plan are sent whole, so every helper here
 * must leave a list the API accepts: `displayOrder` 1..n in the order shown,
 * `_id` kept on every item that had one, and absent on every item that did
 * not (the API generates one).
 */

const text = (value: string) => ({ ar: `${value}-ar`, en: `${value}-en` });

const item = (order: number, id: string | null = `id-${order}`): PlanListItemDraft => ({
  ...(id === null ? {} : { _id: id }),
  title: text(`t${order}`),
  description: text(`d${order}`),
  displayOrder: order,
  isVisible: true,
});

const ids = (items: readonly PlanListItemDraft[]) => items.map((entry) => entry._id);
const orders = (items: readonly PlanListItemDraft[]) => items.map((entry) => entry.displayOrder);

describe("sortItems", () => {
  it("orders by the declared displayOrder and renumbers from 1", () => {
    const sorted = sortItems([item(7), item(2), item(5)]);

    expect(ids(sorted)).toEqual(["id-2", "id-5", "id-7"]);
    expect(orders(sorted)).toEqual([1, 2, 3]);
  });

  it("does not mutate its input", () => {
    const input = [item(2), item(1)];
    sortItems(input);
    expect(orders(input)).toEqual([2, 1]);
  });
});

describe("renumber", () => {
  it("writes 1..n in the order given", () => {
    expect(orders(renumber([item(9), item(9), item(9)]))).toEqual([1, 2, 3]);
  });
});

describe("moveItem", () => {
  const list = [item(1), item(2), item(3), item(4)];

  it("moves one item any distance, keeping every _id and renumbering 1..n", () => {
    const moved = moveItem(list, 0, 2);

    expect(ids(moved)).toEqual(["id-2", "id-3", "id-1", "id-4"]);
    expect(orders(moved)).toEqual([1, 2, 3, 4]);
  });

  it("moves an item backwards as well", () => {
    expect(ids(moveItem(list, 3, 1))).toEqual(["id-1", "id-4", "id-2", "id-3"]);
  });

  it("returns an equal list when the move goes nowhere or out of range", () => {
    expect(ids(moveItem(list, 1, 1))).toEqual(ids(list));
    expect(ids(moveItem(list, -1, 2))).toEqual(ids(list));
    expect(ids(moveItem(list, 1, 4))).toEqual(ids(list));
  });
});

describe("removeItem", () => {
  it("drops the item and renumbers the rest", () => {
    const removed = removeItem([item(1), item(2), item(3)], 1);

    expect(ids(removed)).toEqual(["id-1", "id-3"]);
    expect(orders(removed)).toEqual([1, 2]);
  });
});

describe("appendItem", () => {
  it("adds the template last, numbered n+1, with no _id", () => {
    const appended = appendItem([item(1), item(2)], {
      title: text("new"),
      description: text("new"),
      isVisible: true,
    });

    expect(appended).toHaveLength(3);
    expect(appended[2].displayOrder).toBe(3);
    expect("_id" in appended[2]).toBe(false);
    expect(ids(appended).slice(0, 2)).toEqual(["id-1", "id-2"]);
  });
});

describe("toggleVisible", () => {
  it("flips isVisible on that item only and changes nothing else", () => {
    const toggled = toggleVisible([item(1), item(2)], 1);

    expect(toggled[1].isVisible).toBe(false);
    expect(toggled[0].isVisible).toBe(true);
    expect(toggleVisible(toggled, 1)[1].isVisible).toBe(true);
    expect(ids(toggled)).toEqual(["id-1", "id-2"]);
    expect(orders(toggled)).toEqual([1, 2]);
  });
});

describe("fromStoredList", () => {
  it("treats a missing isVisible as visible and sorts by displayOrder", () => {
    const stored = [
      { _id: "b", title: text("b"), description: text("b"), displayOrder: 2 },
      { _id: "a", title: text("a"), description: text("a"), displayOrder: 1, isVisible: false },
    ];
    const draft = fromStoredList("item", stored);

    expect(draft.map((entry) => entry._id)).toEqual(["a", "b"]);
    expect(draft.map((entry) => entry.isVisible)).toEqual([false, true]);
  });

  it("gives a step with a null description an empty one to edit", () => {
    const [step] = fromStoredList("step", [
      { _id: "s", title: text("s"), description: null, displayOrder: 1, isVisible: true },
    ]);

    expect(step.description).toEqual({ ar: "", en: "" });
  });
});

describe("toStoredList", () => {
  it("renumbers and keeps hidden items, sending isVisible false", () => {
    const hidden = { ...item(5), isVisible: false };
    const stored = toStoredList("item", [item(9), hidden]);

    expect(stored).toHaveLength(2);
    expect(stored.map((entry) => entry.displayOrder)).toEqual([1, 2]);
    expect(stored[1].isVisible).toBe(false);
    expect(stored[1]._id).toBe("id-5");
  });

  it("sends a step's blank description as null, and a written one as is", () => {
    const blank: PlanStepDraft = {
      _id: "s1",
      title: text("s"),
      description: { ar: " ", en: "" },
      displayOrder: 1,
      isVisible: true,
    };
    const written: PlanStepDraft = { ...blank, _id: "s2", description: text("d") };

    const stored = toStoredList("step", [blank, written]);

    expect(stored[0].description).toBeNull();
    expect(stored[1].description).toEqual(text("d"));
  });

  it("leaves a plain item's blank description alone, for the API to refuse", () => {
    const [stored] = toStoredList("item", [{ ...item(1), description: { ar: "", en: "" } }]);
    expect(stored.description).toEqual({ ar: "", en: "" });
  });

  it("does not put an _id on an item that has none", () => {
    const [stored] = toStoredList("item", [item(1, null)]);
    expect("_id" in stored).toBe(false);
  });
});

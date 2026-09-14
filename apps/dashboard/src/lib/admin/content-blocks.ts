import type { LocalizedText } from "@/lib/api/types";

/**
 * One entry of a bounded editorial list — a strategic goal, a value, a pillar
 * — as a screen edits it. `iconKey` only on the lists that carry an icon.
 *
 * Order is content in these lists, and `displayOrder` is the field that says
 * it. Every operation here returns a new list renumbered from 1, so a list's
 * positions and its `displayOrder`s never disagree.
 */
export interface BlockDraft {
  title: LocalizedText;
  description: LocalizedText;
  displayOrder: number;
  iconKey?: string;
}

export const renumberBlocks = <T extends BlockDraft>(items: readonly T[]): T[] =>
  items.map((item, index) => ({ ...item, displayOrder: index + 1 }));

/** Sorted by the order the entries declare rather than the order they
 *  arrived in, then renumbered. */
export const sortBlocks = <T extends BlockDraft>(items: readonly T[]): T[] =>
  renumberBlocks([...items].sort((left, right) => left.displayOrder - right.displayOrder));

/** Moves one entry one place. Out-of-range moves return the list unchanged: a
 *  held key can outrun the re-render that disables the button. */
export const moveBlock = <T extends BlockDraft>(items: readonly T[], index: number, direction: -1 | 1): T[] => {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return renumberBlocks(next);
};

export const removeBlock = <T extends BlockDraft>(items: readonly T[], index: number): T[] =>
  renumberBlocks(items.filter((_, position) => position !== index));

export const appendBlock = <T extends BlockDraft>(items: readonly T[], template: Omit<T, "displayOrder">): T[] =>
  renumberBlocks([...items, { ...template, displayOrder: items.length + 1 } as T]);

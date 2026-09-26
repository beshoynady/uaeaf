/**
 * Moving one photo within an album's order.
 *
 * Both return the WHOLE order, because that is what the API takes:
 * `PATCH /albums/:id/photos/order` must list every photo exactly once. A move
 * instruction ("7 to position 2") would depend on the order requests arrive
 * in; a complete order is last-write-wins and belongs to whoever sent it.
 *
 * `null` when the move changes nothing — the first photo moved back, a drop
 * onto itself, an id that is not in the list — so the caller never sends a
 * write that stores the order already there.
 */

/** One place along the reading direction: `-1` back, `+1` forward. The
 *  keyboard path — the two buttons on each photo. */
export const moveBy = (order: readonly string[], id: string, delta: -1 | 1): string[] | null => {
  const from = order.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return null;
  const next = [...order];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
};

/**
 * The dragged photo, placed where the one it was dropped on stood. The pointer
 * path — native drag and drop onto another tile.
 *
 * Dropping forward puts it after the target and dropping back puts it before,
 * which is what "put it here" means from either side.
 */
export const moveTo = (order: readonly string[], draggedId: string, targetId: string): string[] | null => {
  const from = order.indexOf(draggedId);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return null;
  const next = order.filter((id) => id !== draggedId);
  next.splice(to, 0, draggedId);
  return next;
};

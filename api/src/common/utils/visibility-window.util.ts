/** Narrows a list to items currently inside their optional `from`/`until`
 *  window, sorted by `displayOrder` — the shared "what should a public
 *  visitor see right now" rule behind both `PageSectionsService.findPublicByPage()`
 *  (`visibleFrom`/`visibleUntil`) and `HeroSlidesService.findPublicBySection()`
 *  (`scheduledFrom`/`scheduledTo`). A `null` bound never excludes. */
export function selectVisibleInWindow<T extends { displayOrder: number }>(
  items: T[],
  now: Date,
  from: (item: T) => Date | null,
  until: (item: T) => Date | null,
): T[] {
  return items
    .filter((item) => {
      const bound = from(item);
      return !bound || bound <= now;
    })
    .filter((item) => {
      const bound = until(item);
      return !bound || bound >= now;
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

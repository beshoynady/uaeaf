/** The two fields of an editorial collection's rows a screen reads to choose
 *  one. Importable anywhere: it imports nothing. */
export interface EditorialRecord {
  _id: string;
  createdAt: string;
}

/**
 * Which row of the collection an editorial screen edits.
 *
 * Each of these pages is one record held as a collection upstream, so the
 * screen edits one row rather than offering a list.
 *
 * - A requested id is matched against the list the API already returned for
 *   this reader, never fetched on its own: a URL cannot widen what its author
 *   may see, and an id they hold no grant for is simply not in the list.
 * - With no id, the oldest row. "Whatever came back first" reads the same on
 *   a one-row collection and stops being deterministic the moment a second
 *   row exists, and the second row is a test record, which must never take
 *   the place of the real page.
 * - Neither case falls back to some other row: `null` is the answer, and the
 *   screen says which absence it is.
 */
export const selectRecord = <T extends EditorialRecord>(records: readonly T[], requested: string | null): T | null =>
  requested
    ? (records.find((candidate) => candidate._id === requested) ?? null)
    : ([...records].sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0] ?? null);

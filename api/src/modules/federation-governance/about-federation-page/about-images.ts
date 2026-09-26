/**
 * Turning the page's stored picture ids into the pictures themselves.
 *
 * Two pure steps rather than one, and neither of them knows how an id is
 * resolved:
 *
 * - `collectImageIds` walks the projected page once and returns every id it
 *   will need, deduplicated. The service resolves that set in a single query;
 *   otherwise a timeline of six milestones is six round trips, and the media
 *   service caps an anonymous request's lookups anyway.
 * - `attachImages` puts each resolved picture where its id was. An id that
 *   resolved to nothing — deleted asset, wrong id, one the public filter
 *   refused — becomes `null` rather than an entry pointing nowhere, so the
 *   page draws its own identity-coloured placeholder instead of a broken
 *   image. A slot that was empty to begin with reaches the page as the same
 *   `null`, because to the page those two are the same situation.
 *
 * The stored id never reaches a visitor: they get a URL.
 */

/** Where a picture can hang on this page. Written once so the two functions
 *  below cannot drift apart. */
type Slot = { holder: Record<string, unknown>; key: 'imageId' | 'ogImageId' | 'photoId'; as: 'image' | 'ogImage' | 'photo' };

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

/** Every place on a projected page that carries a picture id. */
const slotsOf = (page: Record<string, unknown>): Slot[] => {
  const slots: Slot[] = [];

  const single = (section: unknown) => {
    const record = asRecord(section);
    if (record && 'imageId' in record) {
      slots.push({ holder: record, key: 'imageId', as: 'image' });
    }
  };

  const listed = (section: unknown) => {
    const record = asRecord(section);
    const items = Array.isArray(record?.items) ? record.items : [];
    for (const item of items) {
      single(item);
    }
  };

  single(page.hero);
  single(page.story);
  listed(page.timeline);
  listed(page.achievements);
  listed(page.pioneers);

  // The board's portraits. They reach the page by a different route from every
  // other picture here — the appointments module hands them over as ids
  // alongside the names, rather than being stored on this record — and they
  // are resolved the same way regardless, because to the page they are
  // pictures in a slot like any other.
  const leadership = asRecord(page.leadership);
  const people = Array.isArray(leadership?.people) ? leadership.people : [];
  for (const person of people) {
    const record = asRecord(person);
    if (record && 'photoId' in record) {
      slots.push({ holder: record, key: 'photoId', as: 'photo' });
    }
  }

  const seo = asRecord(page.seo);
  if (seo && 'ogImageId' in seo) {
    slots.push({ holder: seo, key: 'ogImageId', as: 'ogImage' });
  }

  return slots;
};

export const collectImageIds = (page: Record<string, unknown>): string[] => {
  const ids = slotsOf(page)
    .map((slot) => slot.holder[slot.key])
    .filter((id): id is string | { toString(): string } => Boolean(id))
    .map(String);

  return [...new Set(ids)];
};

/**
 * A copy of the tree's own structure, with its leaves left as they are.
 *
 * `structuredClone` cannot be used here, and the reason is worth keeping: a
 * published snapshot is a database read, so its leaves are BSON values —
 * `ObjectId`, `Date` — and `structuredClone` throws `DataCloneError` on the
 * first one it meets. Every unit test passed because a hand-written fixture
 * holds plain strings; the failure needed a real publication to appear, and
 * then it was a 500 on the page itself.
 *
 * Only the containers need copying anyway. This function rewrites which key a
 * picture hangs on, never a picture's value, so a leaf can be shared with the
 * caller's object safely.
 */
const copyTree = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(copyTree);
  }
  // A plain object and nothing else: an ObjectId or a Date is a leaf here, and
  // reconstructing one would be both wasteful and lossy.
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copyTree(entry)]));
  }
  return value;
};

export const attachImages = <TImage>(
  page: Record<string, unknown>,
  resolved: ReadonlyMap<string, TImage>,
): Record<string, unknown> => {
  // Copied first: swapping keys in place would edit an object the caller may
  // still hold.
  const copy = copyTree(page) as Record<string, unknown>;

  for (const slot of slotsOf(copy)) {
    const id = slot.holder[slot.key];
    delete slot.holder[slot.key];
    slot.holder[slot.as] = id ? (resolved.get(String(id)) ?? null) : null;
  }

  return copy;
};

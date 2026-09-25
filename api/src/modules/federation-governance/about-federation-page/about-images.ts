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
type Slot = { holder: Record<string, unknown>; key: 'imageId' | 'ogImageId'; as: 'image' | 'ogImage' };

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

export const attachImages = <TImage>(
  page: Record<string, unknown>,
  resolved: ReadonlyMap<string, TImage>,
): Record<string, unknown> => {
  // Deep-copied first: the projected page is built from a publication
  // snapshot, and swapping keys in place would edit an object the caller may
  // still hold.
  const copy = structuredClone(page) as Record<string, unknown>;

  for (const slot of slotsOf(copy)) {
    const id = slot.holder[slot.key];
    delete slot.holder[slot.key];
    slot.holder[slot.as] = id ? (resolved.get(String(id)) ?? null) : null;
  }

  return copy;
};

import type { AdminVideo } from "./types";

/**
 * One stored video, as every admin screen reads it.
 *
 * The API answers in its own storage shape — `externalPlatform`, `externalUrl`,
 * `_id` — and the screens read one flat row. That translation was written out
 * three times (the list, the section editor's picker, and now the editor
 * screens) before it moved here: ten fields, field for field, including the
 * `id ?? _id` fallback and every type guard. Three copies is two chances for
 * one screen to read a field the others do not.
 *
 * Nothing here throws. A single malformed row must not take down a list of
 * twelve, so an unusable one answers `null` and the caller drops it.
 */
export const toAdminVideo = (raw: unknown): AdminVideo | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;

  const id = typeof row.id === "string" ? row.id : typeof row._id === "string" ? row._id : null;
  if (!id) return null;

  const title = (typeof row.title === "object" && row.title !== null ? row.title : {}) as Record<string, unknown>;

  return {
    id,
    title: { ar: typeof title.ar === "string" ? title.ar : "", en: typeof title.en === "string" ? title.en : "" },
    category: (row.category ?? "events") as AdminVideo["category"],
    kind: (row.kind ?? "video") as AdminVideo["kind"],
    platform: (row.externalPlatform ?? "youtube") as AdminVideo["platform"],
    url: typeof row.externalUrl === "string" ? row.externalUrl : "",
    externalId: typeof row.externalId === "string" ? row.externalId : "",
    thumbnailId: typeof row.thumbnailId === "string" ? row.thumbnailId : null,
    status: row.status === "published" ? "published" : "draft",
    publishedAt: typeof row.publishedAt === "string" ? row.publishedAt : null,
  };
};

/** Whatever shape the list endpoint answered in, as an array of rows. It has
 *  returned both a bare array and a `{ items }` page at different times. */
export const toAdminVideoList = (raw: unknown): AdminVideo[] => {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { items?: unknown })?.items)
      ? (raw as { items: unknown[] }).items
      : [];
  return list.map(toAdminVideo).filter((video): video is AdminVideo => video !== null);
};

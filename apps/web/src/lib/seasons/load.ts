import { fetchPublic } from "@/lib/api/public-client";
import type { SeasonPublic } from "./types";

/**
 * The seasons pages' reads from the public API.
 *
 * Every read goes through `fetchPublic`, so a failure is `null`: the archive
 * tells an unreachable API (`null`) apart from one with nothing published
 * (`[]`), and a season that does not resolve is a 404.
 */

const TAGS = ["seasons"] as const;

/** Every public season, newest first. Sorted here as well as upstream, so the
 *  order the pages draw — and the neighbours below — never depend on it. */
export const loadSeasonArchive = async (): Promise<SeasonPublic[] | null> => {
  const seasons = await fetchPublic<SeasonPublic[]>("/seasons/public", TAGS);
  if (!Array.isArray(seasons)) return null;
  return [...seasons].sort((a, b) => Date.parse(b.startDate) - Date.parse(a.startDate));
};

/** One public season, or `null` for a slug that names none — a draft, a hidden
 *  season and a slug nobody used all read the same. */
export const loadSeason = (slug: string): Promise<SeasonPublic | null> =>
  fetchPublic<SeasonPublic>(`/seasons/public/${encodeURIComponent(slug)}`, TAGS);

/** The seasons either side of one in time, from a newest-first archive. */
export const neighboursOf = (
  archive: readonly SeasonPublic[],
  slug: string,
): { previous: SeasonPublic | null; next: SeasonPublic | null } => {
  const index = archive.findIndex((season) => season.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return { previous: archive[index + 1] ?? null, next: archive[index - 1] ?? null };
};

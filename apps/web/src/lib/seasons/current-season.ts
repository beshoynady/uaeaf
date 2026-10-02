import { fetchPublic } from "@/lib/api/public-client";
import type { SeasonPublic } from "./types";

/**
 * The current season's slug, for `/seasons/current` to redirect to — or `null`
 * when no season is current, when the current one is not public, or when the
 * API cannot answer. It never throws: a redirect route that failed here would
 * answer 500 instead of sending the reader to the archive.
 */
export const fetchCurrentSeasonSlug = async (): Promise<string | null> => {
  try {
    const current = await fetchPublic<Pick<SeasonPublic, "slug"> | null>("/seasons/public/current", ["seasons"]);
    return typeof current?.slug === "string" && current.slug !== "" ? current.slug : null;
  } catch {
    return null;
  }
};

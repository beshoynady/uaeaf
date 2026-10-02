import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The two seasons routes whose answer is not a page: a slug that names no
 * public season is a 404, and `/seasons/current` is a redirect. Next signals
 * both by throwing an error whose `digest` carries the status and target.
 */

const loadSeason = vi.fn();
const fetchCurrentSeasonSlug = vi.fn();

vi.mock("@/lib/seasons/load", () => ({
  loadSeason: (...args: unknown[]) => loadSeason(...args),
  loadSeasonArchive: async () => [],
  neighboursOf: () => ({ previous: null, next: null }),
}));
// Outside a request there is no locale store to write to; the pages' own
// behaviour does not depend on it.
vi.mock("next-intl/server", () => ({
  setRequestLocale: () => undefined,
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/seasons/current-season", () => ({
  fetchCurrentSeasonSlug: () => fetchCurrentSeasonSlug(),
}));

const { default: SeasonPage, generateMetadata } = await import("./[slug]/page");
const { default: CurrentSeasonPage } = await import("./current/page");

const digestOf = async (render: () => Promise<unknown>): Promise<string> => {
  try {
    await render();
  } catch (error) {
    const { digest, message } = error as { digest?: string; message?: string };
    return digest ?? `not a Next control-flow error: ${message}`;
  }
  throw new Error("expected the route to throw a Next control-flow error");
};

afterEach(() => {
  loadSeason.mockReset();
  fetchCurrentSeasonSlug.mockReset();
});

describe("/seasons/[slug]", () => {
  const params = Promise.resolve({ locale: "ar" as const, slug: "1999-2000" });

  it("answers 404 when the API names no such season", async () => {
    loadSeason.mockResolvedValue(null);
    await expect(digestOf(() => SeasonPage({ params }))).resolves.toBe("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("keeps an unknown season out of the index", async () => {
    loadSeason.mockResolvedValue(null);
    await expect(generateMetadata({ params })).resolves.toEqual({ robots: { index: false, follow: true } });
  });
});

describe("/seasons/current", () => {
  const params = Promise.resolve({ locale: "ar" as const });

  it("sends the reader to the current season", async () => {
    fetchCurrentSeasonSlug.mockResolvedValue("2026-2027");
    const digest = await digestOf(() => CurrentSeasonPage({ params }));
    expect(digest).toMatch(/^NEXT_REDIRECT;replace;\/ar\/seasons\/2026-2027;307;/);
  });

  it("sends the reader to the archive when no season is current", async () => {
    fetchCurrentSeasonSlug.mockResolvedValue(null);
    const digest = await digestOf(() => CurrentSeasonPage({ params }));
    expect(digest).toMatch(/^NEXT_REDIRECT;replace;\/ar\/seasons;307;/);
  });
});

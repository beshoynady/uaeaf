import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Where the footer's location comes from (owner decision 2026-09-22, option
 * B): the contact page's own record, the one the map on that page is drawn
 * from, so the footer and the map cannot name two different places.
 */
const fetchPublic = vi.fn();

vi.mock("@/lib/api/public-client", () => ({
  fetchPublic: (path: string) => fetchPublic(path) as unknown,
}));

const { loadFooterPlace } = await import("./footer-place");

const RECORD = {
  map: {
    pinTitle: { ar: "١ شارع النهدة، النهدة الأولى", en: "1 Al Nahda Street, Al Nahda 1" },
    pinSubtitle: { ar: "دبي، الإمارات العربية المتحدة", en: "Dubai, United Arab Emirates" },
  },
};

beforeEach(() => {
  fetchPublic.mockReset();
});

describe("loadFooterPlace", () => {
  it("reads the place from the contact page's record, in the page's language", async () => {
    fetchPublic.mockResolvedValue(RECORD);

    await expect(loadFooterPlace("ar")).resolves.toEqual({
      place: "١ شارع النهدة، النهدة الأولى",
      region: "دبي، الإمارات العربية المتحدة",
    });
    await expect(loadFooterPlace("en")).resolves.toEqual({
      place: "1 Al Nahda Street, Al Nahda 1",
      region: "Dubai, United Arab Emirates",
    });
    expect(fetchPublic).toHaveBeenCalledWith("/contact-us-page");
  });

  it("names no place when the record cannot be read", async () => {
    fetchPublic.mockResolvedValue(null);

    await expect(loadFooterPlace("ar")).resolves.toEqual({ place: null, region: null });
  });
});

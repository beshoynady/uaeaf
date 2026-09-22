import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Where everything the footer shows comes from (ADR-0092).
 *
 * The contact page's record is the one source for the place, the map, the
 * email, the office hours and the channels (owner decision 2026-09-22): the
 * footer keeps no copy of any of them, so the two cannot drift, as the
 * footer's own address (Abu Dhabi) and hours had drifted from the record's.
 * The site settings hold only the footer's own words.
 */
const fetchPublic = vi.fn();

vi.mock("@/lib/api/public-client", () => ({
  fetchPublic: (path: string) => fetchPublic(path) as unknown,
}));

const { loadFooterContent } = await import("./footer-content");

const CONTACT = {
  email: "info@uaeaf.ae",
  googleMapsUrl: "https://maps.app.goo.gl/yZQC6nW4EGY8iS4C9",
  officeHours: { ar: "الأحد – الخميس، ٨:٠٠ – ١٥:٠٠", en: "Sunday – Thursday, 08:00 – 15:00" },
  socialLinks: [
    { platform: "Instagram", url: "https://www.instagram.com/uaeaf", iconId: "6aa1d5c24a3f231870e29d89" },
    { platform: "X", url: "https://x.com/uaeaf", iconId: null },
  ],
  map: {
    latitude: 25.286069,
    longitude: 55.3642228,
    pinTitle: { ar: "١ شارع النهدة، النهدة الأولى", en: "1 Al Nahda Street, Al Nahda 1" },
    pinSubtitle: { ar: "دبي، الإمارات العربية المتحدة", en: "Dubai, United Arab Emirates" },
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=25.286069,55.3642228",
  },
};

const SETTINGS = {
  footerAboutBlurb: { ar: "وصف الاتحاد.", en: "About the federation." },
  copyrightText: { ar: "© ٢٠٢٦ الاتحاد", en: "© 2026 UAEAF" },
  footerHeadings: { quickLinks: { ar: "روابط", en: "Links" }, location: null, contact: { ar: "راسلنا", en: "Write to us" } },
};

const ICON = { id: "6aa1d5c24a3f231870e29d89", file: { url: "https://cdn.test/instagram.png" } };

const answer = (routes: Record<string, unknown>) =>
  fetchPublic.mockImplementation(async (path: string) => {
    const match = Object.keys(routes).find((prefix) => path.startsWith(prefix));
    return match ? routes[match] : null;
  });

beforeEach(() => {
  fetchPublic.mockReset();
});

describe("loadFooterContent", () => {
  it("reads the contact facts from the contact page's record, in the page's language", async () => {
    answer({ "/contact-us-page": CONTACT, "/site-settings/public": SETTINGS, "/media-assets/public": [ICON] });

    const content = await loadFooterContent("en");

    expect(content).toMatchObject({
      place: "1 Al Nahda Street, Al Nahda 1",
      region: "Dubai, United Arab Emirates",
      latitude: 25.286069,
      longitude: 55.3642228,
      directionsUrl: CONTACT.map.directionsUrl,
      email: "info@uaeaf.ae",
      officeHours: "Sunday – Thursday, 08:00 – 15:00",
    });
    expect(content.channels).toEqual(CONTACT.socialLinks);
  });

  it("reads the footer's own words from the site settings, leaving what is unset for the built-in text", async () => {
    answer({ "/contact-us-page": CONTACT, "/site-settings/public": SETTINGS, "/media-assets/public": [ICON] });

    const content = await loadFooterContent("ar");

    expect(content.aboutBlurb).toBe("وصف الاتحاد.");
    expect(content.copyright).toBe("© ٢٠٢٦ الاتحاد");
    expect(content.headings).toEqual({ quickLinks: "روابط", location: null, contact: "راسلنا" });
  });

  it("resolves the channels' uploaded icons in one request", async () => {
    answer({ "/contact-us-page": CONTACT, "/site-settings/public": SETTINGS, "/media-assets/public": [ICON] });

    const content = await loadFooterContent("ar");

    expect(content.icons.get(ICON.id)?.file.url).toBe("https://cdn.test/instagram.png");
    expect(fetchPublic).toHaveBeenCalledWith(`/media-assets/public?ids=${ICON.id}`);
  });

  it("asks for no picture when no channel has an icon", async () => {
    answer({
      "/contact-us-page": { ...CONTACT, socialLinks: [{ platform: "X", url: "https://x.com/uaeaf" }] },
      "/site-settings/public": SETTINGS,
    });

    await loadFooterContent("ar");

    expect(fetchPublic.mock.calls.map(([path]) => path)).not.toContainEqual(expect.stringContaining("/media-assets"));
  });

  it("names nothing it cannot read, rather than something remembered", async () => {
    answer({});

    await expect(loadFooterContent("ar")).resolves.toEqual({
      place: null,
      region: null,
      latitude: null,
      longitude: null,
      directionsUrl: null,
      email: null,
      officeHours: null,
      channels: [],
      icons: new Map(),
      aboutBlurb: null,
      copyright: null,
      headings: { quickLinks: null, location: null, contact: null },
    });
  });
});

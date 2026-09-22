import { describe, expect, it } from "vitest";
import {
  EMPTY_FOOTER_DRAFT,
  footerRequests,
  fromFooterRecord,
  isFooterDirty,
  loadFooter,
  readFooterBody,
  validateFooter,
  type FooterDraft,
} from "./footer-settings";

/**
 * The footer screen's model (ADR-0092 D12): the footer's own words — its
 * description, its copyright line, and the headings of its three titled
 * columns — edited as one record and saved whole. What else the footer shows
 * belongs to the contact page's record and is only read here.
 */

const pair = (ar: string, en: string) => ({ ar, en });

const filled: FooterDraft = {
  footerAboutBlurb: pair("وصف", "About"),
  copyrightText: pair("© الاتحاد", "© UAEAF"),
  headings: { quickLinks: pair("روابط", "Links"), location: pair("الموقع", "Location"), contact: pair("التواصل", "Contact") },
};

describe("fromFooterRecord", () => {
  it("opens on empty fields before the footer was ever saved, which the site reads as its built-in text", () => {
    expect(fromFooterRecord(null)).toEqual(EMPTY_FOOTER_DRAFT);
    expect(fromFooterRecord({ footerAboutBlurb: null, copyrightText: null, footerHeadings: null })).toEqual(EMPTY_FOOTER_DRAFT);
  });

  it("opens on what is stored", () => {
    expect(
      fromFooterRecord({
        footerAboutBlurb: filled.footerAboutBlurb,
        copyrightText: filled.copyrightText,
        footerHeadings: { quickLinks: filled.headings.quickLinks, location: null, contact: filled.headings.contact },
      }),
    ).toEqual({ ...filled, headings: { ...filled.headings, location: pair("", "") } });
  });
});

describe("validateFooter", () => {
  it("accepts a text in both languages, and a text left empty in both", () => {
    expect(validateFooter(filled)).toEqual([]);
    expect(validateFooter(EMPTY_FOOTER_DRAFT)).toEqual([]);
  });

  it("refuses a text written in one language only, where it would render blank in the other", () => {
    const draft = { ...filled, copyrightText: pair("© الاتحاد", " "), headings: { ...filled.headings, location: pair("", "Location") } };

    expect(validateFooter(draft)).toEqual([
      { path: "footer.copyrightText", code: "bothLanguages" },
      { path: "footer.headings.location", code: "bothLanguages" },
    ]);
  });
});

describe("footerRequests", () => {
  it("sends nothing when nothing changed", () => {
    expect(footerRequests(filled, filled)).toEqual([]);
    expect(isFooterDirty(filled, filled)).toBe(false);
  });

  it("sends the whole footer in one write, trimmed, with an emptied text as null", () => {
    const draft = { ...filled, footerAboutBlurb: pair("", ""), headings: { ...filled.headings, contact: pair("  راسلنا ", " Write to us ") } };

    expect(isFooterDirty(filled, draft)).toBe(true);
    expect(footerRequests(filled, draft)).toEqual([
      {
        method: "PUT",
        url: "/api/admin/site-settings/footer",
        body: {
          footerAboutBlurb: null,
          copyrightText: pair("© الاتحاد", "© UAEAF"),
          footerHeadings: { quickLinks: pair("روابط", "Links"), location: pair("الموقع", "Location"), contact: pair("راسلنا", "Write to us") },
        },
        errorPrefix: "footer",
      },
    ]);
  });
});

describe("readFooterBody — what the route handler forwards", () => {
  const body = { footerAboutBlurb: pair("أ", "a"), copyrightText: null, footerHeadings: { quickLinks: null, location: pair("ب", "b"), contact: null } };

  it("forwards the footer's three fields and nothing else", () => {
    expect(readFooterBody({ ...body, isMaintenanceMode: true, footerHeadings: { ...body.footerHeadings, newsletter: pair("ج", "c") } })).toEqual({
      ok: true,
      body,
    });
  });

  it("refuses a body that is not the footer's shape", () => {
    expect(readFooterBody(null)).toEqual({ ok: false });
    expect(readFooterBody([body])).toEqual({ ok: false });
    expect(readFooterBody({ ...body, copyrightText: "© UAEAF" })).toEqual({ ok: false });
    expect(readFooterBody({ ...body, footerHeadings: { location: { ar: 1, en: "b" } } })).toEqual({ ok: false });
  });
});

describe("loadFooter", () => {
  const CONTACT = {
    email: "info@uaeaf.ae",
    officeHours: pair("الأحد – الخميس", "Sunday – Thursday"),
    socialLinks: [
      { platform: "Instagram", url: "https://www.instagram.com/uaeaf", iconId: "6aa1d5c24a3f231870e29d89" },
      { platform: "X", url: "https://x.com/uaeaf", iconId: null },
    ],
    map: { latitude: 25.286069, longitude: 55.3642228, pinTitle: pair("١ شارع النهدة", "1 Al Nahda Street"), pinSubtitle: pair("دبي", "Dubai"), directionsUrl: "https://maps.test/dir" },
  };

  it("opens on the stored settings, and on the contact page's record for what the footer only shows", async () => {
    const reads: string[] = [];
    const load = await loadFooter(async (path) => {
      reads.push(path);
      return path === "/site-settings" ? { copyrightText: filled.copyrightText } : CONTACT;
    });

    expect(reads.sort()).toEqual(["/contact-us-page", "/site-settings"]);
    expect(load).toEqual({
      state: "ready",
      initial: { ...EMPTY_FOOTER_DRAFT, copyrightText: filled.copyrightText },
      sourced: {
        channels: [
          { platform: "Instagram", url: "https://www.instagram.com/uaeaf", hasIcon: true },
          { platform: "X", url: "https://x.com/uaeaf", hasIcon: false },
        ],
        place: CONTACT.map.pinTitle,
        region: CONTACT.map.pinSubtitle,
        coordinates: { latitude: 25.286069, longitude: 55.3642228 },
        directionsUrl: "https://maps.test/dir",
        email: "info@uaeaf.ae",
        officeHours: CONTACT.officeHours,
      },
    });
  });

  it("opens with nothing sourced when the contact page was never saved", async () => {
    const load = await loadFooter(async (path) => (path === "/site-settings" ? null : null));

    expect(load).toMatchObject({
      state: "ready",
      initial: EMPTY_FOOTER_DRAFT,
      sourced: { channels: [], place: null, region: null, coordinates: null, directionsUrl: null, email: null, officeHours: null },
    });
  });

  it("reports a failed read rather than opening on empty fields that would overwrite the stored ones", async () => {
    await expect(
      loadFooter(async () => {
        throw Object.assign(new Error("upstream"), { status: 503 });
      }),
    ).resolves.toEqual({ state: "loadFailed" });
  });
});

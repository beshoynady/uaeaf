import { describe, expect, it } from "vitest";
import { readRelationBody, readSponsorsSectionBody, readStripBody } from "./requests";

/**
 * What the sponsors, partners and memberships route handlers forward (ADR-0085).
 *
 * Only a record's own fields leave for the API: the API refuses a whole request
 * over one unknown key (`forbidNonWhitelisted`), and a demo mark or a contract
 * sub-document must never be settable from these screens.
 */
describe("sponsor-relations requests", () => {
  it("forwards a sponsor's own fields and drops the demo mark and the restricted contract", () => {
    expect(
      readRelationBody("sponsors", {
        name: { ar: null, en: "Demo" },
        logoId: "6aa0850000000000000000f1",
        website: null,
        categoryLabel: null,
        isDemo: true,
        restricted: { contractValue: 1 },
      }),
    ).toEqual({ ok: true, body: { name: { ar: null, en: "Demo" }, logoId: "6aa0850000000000000000f1", website: null, categoryLabel: null } });
  });

  it("forwards a sponsorship's fields, its sponsor included, and never a demo mark", () => {
    const parsed = readRelationBody("sponsorships", { sponsorId: "6aa0850000000000000000a1", tier: "Official", isDemo: true, targetId: null });
    expect(parsed).toEqual({ ok: true, body: { sponsorId: "6aa0850000000000000000a1", tier: "Official", targetId: null } });
  });

  it("forwards partnership and membership fields under their own names", () => {
    expect(readRelationBody("partnerships", { partnerName: { ar: "أ", en: null }, isActive: false, status: "Active" })).toEqual({
      ok: true,
      body: { partnerName: { ar: "أ", en: null }, isActive: false },
    });
    expect(readRelationBody("memberships", { organizationName: { ar: "أ", en: null }, status: "Suspended", isActive: false })).toEqual({
      ok: true,
      body: { organizationName: { ar: "أ", en: null }, status: "Suspended" },
    });
  });

  it("refuses a body that is not an object", () => {
    expect(readRelationBody("sponsors", "nope")).toEqual({ ok: false });
    expect(readRelationBody("sponsors", [1])).toEqual({ ok: false });
  });

  it("forwards only the SPONSORS section's banner preference and call to action", () => {
    expect(
      readSponsorsSectionBody({
        configuration: { bannerSponsorshipId: "6aa0850000000000000000b1", nextEvent: { isVisible: true } },
        ctaText: { ar: "كن شريكًا", en: "Become a partner" },
        ctaUrl: "/contact",
        enabled: false,
      }),
    ).toEqual({
      ok: true,
      body: { configuration: { bannerSponsorshipId: "6aa0850000000000000000b1" }, ctaText: { ar: "كن شريكًا", en: "Become a partner" }, ctaUrl: "/contact" },
    });
    expect(readSponsorsSectionBody({ configuration: { bannerSponsorshipId: "not-an-id" } })).toEqual({ ok: false });
  });

  it("forwards the whole strip settings and nothing else", () => {
    const strip = { isVisible: true, displayMode: "logoName", selection: "allActive", sponsorshipIds: [], order: "tier", pinnedSponsorshipId: null, speed: "medium" };
    expect(readStripBody({ ...strip, extra: 1 })).toEqual({ ok: true, body: strip });
    expect(readStripBody({ ...strip, sponsorshipIds: ["nope"] })).toEqual({ ok: false });
  });
});

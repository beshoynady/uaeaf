import { describe, expect, it } from "vitest";
import { loadOrganizations, loadSponsors, loadStrip } from "./load";

/**
 * What the sponsors, partners, memberships and strip screens open on, read with
 * the editor's own session (`fetchAsUser`: `null` for a refused read, a thrown
 * error carrying the upstream status for anything else).
 */
describe("sponsor relations loaders", () => {
  const PAGE = "6aa0850000000000000000a0";
  const SECTION = { _id: "6aa0850000000000000000e1", sectionType: "SPONSORS", configuration: { bannerSponsorshipId: "6aa0850000000000000000d1" }, ctaText: null, ctaUrl: null };
  const SPONSOR = { _id: "6aa0850000000000000000b1", name: { ar: null, en: "Ultimate Power Solution" }, logoId: "6aa0850000000000000000f1", website: null, categoryLabel: null };
  const SHIP = {
    _id: "6aa0850000000000000000d1",
    sponsorId: SPONSOR._id,
    targetType: "Federation",
    targetId: null,
    tier: "Official",
    startDate: "2026-08-31T20:00:00.000Z",
    endDate: "2027-08-31T19:59:59.999Z",
    status: "Active",
    scopeLabel: null,
    isFeatured: false,
    displayOrder: 0,
    isVisible: true,
  };

  const reader =
    (answers: Record<string, unknown>) =>
    async (path: string): Promise<unknown> => {
      if (!(path in answers)) throw Object.assign(new Error("not found"), { status: 404 });
      return answers[path];
    };

  const homepage = {
    "/pages/public/home": { id: PAGE },
    [`/page-sections/by-page/${PAGE}`]: [{ _id: "x", sectionType: "HERO" }, SECTION],
  };

  it("opens the partners screen on the stored records", async () => {
    const load = await loadOrganizations("partners", reader({ "/partnerships": [{ _id: "c1", partnerName: { ar: null, en: "X" }, partnershipType: "MOU", startDate: SHIP.startDate, endDate: null, isActive: true, displayOrder: 0, isVisible: true }] }));
    expect(load.state).toBe("ready");
    expect(load.state === "ready" && load.draft.items.map((item) => item.nameEn)).toEqual(["X"]);
  });

  it("reports a failed read of the list rather than an empty screen", async () => {
    expect(await loadOrganizations("memberships", reader({ "/memberships": null }))).toEqual({ state: "loadFailed" });
  });

  it("opens the sponsors screen with the homepage's SPONSORS section", async () => {
    const load = await loadSponsors(reader({ ...homepage, "/sponsors": [SPONSOR], "/sponsorships": [SHIP] }));
    expect(load.state === "ready" && load.draft.section).toMatchObject({ id: SECTION._id, bannerSponsorshipId: SHIP._id });
    expect(load.state === "ready" && load.draft.sponsors[0].sponsorships.map((item) => item.id)).toEqual([SHIP._id]);
  });

  it("still opens the sponsors screen when the homepage has no SPONSORS section, with nothing to save it to", async () => {
    const load = await loadSponsors(reader({ "/sponsors": [SPONSOR], "/sponsorships": [SHIP] }));
    expect(load.state === "ready" && load.draft.section.id).toBeNull();
  });

  it("opens the strip on its defaults when it was never saved, with the banner preference for its preview", async () => {
    const load = await loadStrip(reader({ ...homepage, "/site-settings": { sponsorStrip: null }, "/sponsors": [SPONSOR], "/sponsorships": [SHIP] }));
    expect(load).toMatchObject({ state: "ready", bannerSponsorshipId: SHIP._id, sponsors: [SPONSOR], sponsorships: [SHIP] });
    expect(load.state === "ready" && load.initial.speed).toBe("medium");
  });

  it("reports an unreachable service", async () => {
    const failing = async () => {
      throw Object.assign(new Error("down"), { status: 503 });
    };
    expect(await loadStrip(failing)).toEqual({ state: "loadFailed" });
  });
});

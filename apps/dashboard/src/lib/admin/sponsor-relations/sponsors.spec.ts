import { describe, expect, it } from "vitest";
import {
  adoptCreatedSponsors,
  addSponsor,
  addSponsorship,
  fromSponsorRecords,
  moveSponsor,
  planSponsors,
  previewShowcase,
  removeSponsor,
  removeSponsorship,
  updateSection,
  updateSponsor,
  updateSponsorship,
  validateSponsors,
  type SponsorRecord,
  type SponsorshipRecord,
  type SponsorsSectionRecord,
} from "./sponsors";

/**
 * The sponsors screen's model (ADR-0077 D1–D2, ADR-0085): each sponsor with its
 * sponsorships, and the section's banner preference and call to action.
 *
 * The organisation and the contract are two records: a sponsor is created
 * first, and a sponsorship written in the same save names it by the key the
 * runner resolves to the new id. The preview answers from the site's own
 * function (`selectShowcase`), so what the editor sees in the banner is what
 * the site will draw.
 */
describe("sponsors model", () => {
  const ups: SponsorRecord = {
    _id: "6aa0850000000000000000a1",
    name: { ar: null, en: "Ultimate Power Solution" },
    logoId: "6aa0850000000000000000f1",
    website: "https://upsgenerator.com/",
    categoryLabel: null,
    isDemo: false,
  };
  const upsShip: SponsorshipRecord = {
    _id: "6aa0850000000000000000b1",
    sponsorId: "6aa0850000000000000000a1",
    targetType: "Federation",
    targetId: null,
    tier: "Official",
    startDate: "2026-08-31T20:00:00.000Z",
    endDate: "2027-08-31T19:59:59.000Z",
    status: "Active",
    scopeLabel: null,
    isFeatured: false,
    displayOrder: 0,
    isVisible: true,
    isDemo: false,
  };
  const section: SponsorsSectionRecord = { _id: "6aa0850000000000000000e1", configuration: null, ctaText: null, ctaUrl: null };

  const load = () => fromSponsorRecords([ups], [upsShip], section);

  it("groups each sponsorship under its sponsor, dates as Dubai days", () => {
    const draft = load();

    expect(draft.sponsors).toHaveLength(1);
    expect(draft.sponsors[0]).toMatchObject({ id: ups._id, nameEn: "Ultimate Power Solution", nameAr: "", isDemo: false });
    expect(draft.sponsors[0].sponsorships[0]).toMatchObject({ id: upsShip._id, tier: "Official", startDay: "2026-09-01", endDay: "2027-08-31" });
    expect(draft.section).toEqual({ id: section._id, bannerSponsorshipId: null, ctaTextAr: "", ctaTextEn: "", ctaUrl: "" });
  });

  it("requires a name and a logo on a sponsor, and a website that is a web address", () => {
    let draft = addSponsor(load());
    const key = draft.sponsors[1].key;
    draft = updateSponsor(draft, key, { website: "upsgenerator.com" });

    expect(validateSponsors(draft)).toEqual(
      expect.arrayContaining([
        { path: `sponsors.${key}.name`, code: "missingRequiredField" },
        { path: `sponsors.${key}.logoId`, code: "missingRequiredField" },
        { path: `sponsors.${key}.website`, code: "invalidRequest" },
      ]),
    );
  });

  it("requires an end day for a championship or event sponsorship, and an end no earlier than the start", () => {
    let draft = load();
    const sponsorKey = draft.sponsors[0].key;
    draft = addSponsorship(draft, sponsorKey);
    const shipKey = draft.sponsors[0].sponsorships[1].key;
    draft = updateSponsorship(draft, sponsorKey, shipKey, { targetType: "Championship", tier: "Supporting", startDay: "2026-10-01" });

    expect(validateSponsors(draft)).toEqual([{ path: `sponsorships.${shipKey}.endDay`, code: "sponsorshipEndRequired" }]);

    draft = updateSponsorship(draft, sponsorKey, shipKey, { endDay: "2026-09-01" });
    expect(validateSponsors(draft)).toEqual([{ path: `sponsorships.${shipKey}.endDay`, code: "sponsorshipEndsBeforeStart" }]);
  });

  it("keeps a scope label within 120 characters a side, and asks for both sides once one is written", () => {
    let draft = load();
    const sponsorKey = draft.sponsors[0].key;
    const shipKey = draft.sponsors[0].sponsorships[0].key;
    draft = updateSponsorship(draft, sponsorKey, shipKey, { scopeAr: "ا".repeat(121), scopeEn: "" });

    expect(validateSponsors(draft)).toEqual(
      expect.arrayContaining([
        { path: `sponsorships.${shipKey}.scopeAr`, code: "scopeLabelTooLong", limit: 120 },
        { path: `sponsorships.${shipKey}.scopeEn`, code: "missingRequiredField" },
      ]),
    );
  });

  it("refuses a call to action with only one half written, or a link the site does not allow", () => {
    let draft = updateSection(load(), { ctaUrl: "/contact" });
    expect(validateSponsors(draft)).toEqual([{ path: "section.ctaText", code: "incompleteCta" }]);

    draft = updateSection(draft, { ctaTextAr: "كن شريكًا", ctaTextEn: "Become a partner", ctaUrl: "http://example.com" });
    expect(validateSponsors(draft)).toEqual([{ path: "section.ctaUrl", code: "invalidCtaUrl" }]);
  });

  it("plans a new sponsor before its sponsorship, which names the sponsor by key", () => {
    let draft = addSponsor(load());
    const sponsorKey = draft.sponsors[1].key;
    draft = updateSponsor(draft, sponsorKey, { nameEn: "Demo Co", logoId: "6aa0850000000000000000f9" });
    draft = addSponsorship(draft, sponsorKey);
    const shipKey = draft.sponsors[1].sponsorships[0].key;
    draft = updateSponsorship(draft, sponsorKey, shipKey, { tier: "Supporting", startDay: "2026-10-01" });

    expect(planSponsors(load(), draft)).toEqual([
      {
        kind: "create",
        entity: "sponsors",
        key: sponsorKey,
        body: { name: { ar: null, en: "Demo Co" }, logoId: "6aa0850000000000000000f9", website: null, categoryLabel: null },
      },
      {
        kind: "create",
        entity: "sponsorships",
        key: shipKey,
        sponsorKey,
        body: {
          targetType: "Federation",
          tier: "Supporting",
          startDate: "2026-09-30T20:00:00.000Z",
          endDate: null,
          status: "Active",
          scopeLabel: null,
          isFeatured: false,
          // Global, in the list's order: after the Official sponsorship above it.
          displayOrder: 1,
          isVisible: false,
        },
      },
    ]);
  });

  it("orders sponsorships across sponsors, so moving a sponsor moves its sponsorships in the site's grid", () => {
    let draft = addSponsor(load());
    const key = draft.sponsors[1].key;
    draft = updateSponsor(draft, key, { nameEn: "Demo Co", logoId: "6aa0850000000000000000f9" });
    draft = addSponsorship(draft, key);
    const shipKey = draft.sponsors[1].sponsorships[0].key;
    draft = updateSponsorship(draft, key, shipKey, { startDay: "2026-10-01" });
    draft = moveSponsor(draft, key, -1);

    const steps = planSponsors(load(), draft);
    expect(steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "create", entity: "sponsorships", key: shipKey, body: expect.objectContaining({ displayOrder: 0 }) }),
        { kind: "update", entity: "sponsorships", key: upsShip._id, id: upsShip._id, body: { displayOrder: 1 } },
      ]),
    );
  });

  it("deletes a removed sponsor's sponsorships before the sponsor", () => {
    const draft = removeSponsor(load(), ups._id);

    expect(planSponsors(load(), draft)).toEqual([
      { kind: "delete", entity: "sponsorships", key: upsShip._id, id: upsShip._id },
      { kind: "delete", entity: "sponsors", key: ups._id, id: ups._id },
    ]);
  });

  it("writes only changed sponsorship fields, and the section when its settings change", () => {
    let draft = updateSponsorship(load(), ups._id, upsShip._id, { isFeatured: true });
    draft = updateSection(draft, { bannerSponsorshipId: upsShip._id });

    expect(planSponsors(load(), draft)).toEqual([
      { kind: "update", entity: "sponsorships", key: upsShip._id, id: upsShip._id, body: { isFeatured: true } },
      { kind: "section", id: section._id, body: { configuration: { bannerSponsorshipId: upsShip._id }, ctaText: null, ctaUrl: null } },
    ]);
  });

  it("removes one sponsorship without touching its sponsor", () => {
    const draft = removeSponsorship(load(), ups._id, upsShip._id);
    expect(planSponsors(load(), draft)).toEqual([{ kind: "delete", entity: "sponsorships", key: upsShip._id, id: upsShip._id }]);
  });

  it("previews the banner with the site's rule: an Official sponsor alone, then a Strategic one takes it", () => {
    const now = new Date("2027-03-01T08:00:00.000Z");
    let draft = load();
    expect(previewShowcase(draft, now).banner?.sponsorName).toEqual({ ar: null, en: "Ultimate Power Solution" });

    draft = addSponsor(draft);
    const key = draft.sponsors[1].key;
    draft = updateSponsor(draft, key, { nameEn: "Strategic Demo" });
    draft = addSponsorship(draft, key);
    const shipKey = draft.sponsors[1].sponsorships[0].key;
    draft = updateSponsorship(draft, key, shipKey, { tier: "Strategic", startDay: "2026-01-01", isVisible: true });

    const preview = previewShowcase(draft, now);
    expect(preview.banner?.sponsorName).toEqual({ ar: null, en: "Strategic Demo" });
    expect(preview.grid.map((item) => item.sponsorName.en)).toEqual(["Ultimate Power Solution"]);
  });

  it("leaves hidden and cancelled sponsorships out of the preview", () => {
    const now = new Date("2027-03-01T08:00:00.000Z");
    const hidden = updateSponsorship(load(), ups._id, upsShip._id, { isVisible: false });
    expect(previewShowcase(hidden, now).banner).toBeNull();

    const cancelled = updateSponsorship(load(), ups._id, upsShip._id, { status: "Cancelled" });
    expect(previewShowcase(cancelled, now).banner).toBeNull();
  });

  it("gives created sponsors and sponsorships the ids the API returned", () => {
    const withSponsor = addSponsor(fromSponsorRecords([], [], null));
    const sponsorKey = withSponsor.sponsors[0].key;
    const draft = addSponsorship(withSponsor, sponsorKey);
    const shipKey = draft.sponsors[0].sponsorships[0].key;
    const adopted = adoptCreatedSponsors(draft, { [sponsorKey]: "6aa0850000000000000000b9", [shipKey]: "6aa0850000000000000000d9" });
    expect(adopted.sponsors[0]).toMatchObject({ key: "6aa0850000000000000000b9", id: "6aa0850000000000000000b9" });
    expect(adopted.sponsors[0].sponsorships[0]).toMatchObject({ key: "6aa0850000000000000000d9", id: "6aa0850000000000000000d9" });
  });
});

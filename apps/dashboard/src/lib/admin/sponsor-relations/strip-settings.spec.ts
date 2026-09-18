import { describe, expect, it } from "vitest";
import { fromStripRecord, isStripDirty, previewStrip, validateStrip } from "./strip-settings";
import type { SponsorRecord, SponsorshipRecord } from "./sponsors";

/**
 * The strip settings screen's model (ADR-0077 D5, ADR-0085 D7): one setting set
 * for the whole strip, the owner's defaults before anything is saved, and a
 * preview drawn with the site's own rules.
 */
describe("strip settings model", () => {
  const now = new Date("2027-03-01T08:00:00.000Z");

  const sponsor = (id: string, en: string): SponsorRecord => ({ _id: id, name: { ar: null, en }, logoId: null, website: null, categoryLabel: null });
  const ship = (id: string, sponsorId: string, tier: string, displayOrder: number, overrides: Partial<SponsorshipRecord> = {}): SponsorshipRecord => ({
    _id: id,
    sponsorId,
    targetType: "Federation",
    targetId: null,
    tier,
    startDate: "2026-08-31T20:00:00.000Z",
    endDate: null,
    status: "Active",
    scopeLabel: null,
    isFeatured: false,
    displayOrder,
    isVisible: true,
    ...overrides,
  });

  it("opens on the owner's defaults when the strip was never saved", () => {
    expect(fromStripRecord(null)).toEqual({
      isVisible: true,
      displayMode: "logoName",
      selection: "allActive",
      sponsorshipIds: [],
      order: "tier",
      pinnedSponsorshipId: null,
      speed: "medium",
    });
  });

  it("refuses a manual selection with nothing chosen", () => {
    const draft = { ...fromStripRecord(null), selection: "manual" as const };
    expect(validateStrip(draft)).toEqual([{ path: "strip.sponsorshipIds", code: "missingRequiredField" }]);
  });

  it("knows when nothing changed", () => {
    const saved = fromStripRecord(null);
    expect(isStripDirty(saved, { ...saved })).toBe(false);
    expect(isStripDirty(saved, { ...saved, speed: "fast" })).toBe(true);
  });

  it("holds nobody by default, and previews every running sponsorship in tier order", () => {
    // ADR-0086 D2: the pin is the editor's choice, not the banner's. Nothing
    // chosen means nothing held, and everyone travels.
    const sponsors = [sponsor("a", "Ultimate Power Solution"), sponsor("b", "Palmstone Demo Bank"), sponsor("c", "Wahat Demo")];
    const sponsorships = [ship("s1", "a", "Official", 0), ship("s2", "b", "Official", 1), ship("s3", "c", "Supporting", 2), ship("s4", "c", "Supporting", 3, { isVisible: false })];

    const preview = previewStrip(fromStripRecord(null), sponsors, sponsorships, null, now);

    expect(preview.pinned).toBeNull();
    expect(preview.others.map((item) => item.name.en)).toEqual(["Ultimate Power Solution", "Palmstone Demo Bank", "Wahat Demo"]);
    expect(preview.phoneFallsBack).toBe(false);
  });

  it("holds the chosen sponsorship and leaves it out of the row it previews", () => {
    const sponsors = [sponsor("a", "Ultimate Power Solution"), sponsor("b", "Palmstone Demo Bank"), sponsor("c", "Wahat Demo")];
    const sponsorships = [ship("s1", "a", "Official", 0), ship("s2", "b", "Official", 1), ship("s3", "c", "Supporting", 2)];

    const preview = previewStrip({ ...fromStripRecord(null), pinnedSponsorshipId: "s1" }, sponsors, sponsorships, null, now);

    expect(preview.pinned?.name).toEqual({ ar: null, en: "Ultimate Power Solution" });
    expect(preview.others.map((item) => item.name.en)).toEqual(["Palmstone Demo Bank", "Wahat Demo"]);
  });

  it("holds nobody, and leaves no gap, when the chosen sponsorship is not running", () => {
    const sponsors = [sponsor("a", "Ultimate Power Solution"), sponsor("b", "Palmstone Demo Bank")];
    const sponsorships = [ship("s1", "a", "Official", 0), ship("s2", "b", "Official", 1, { isVisible: false })];

    const preview = previewStrip({ ...fromStripRecord(null), pinnedSponsorshipId: "s2" }, sponsors, sponsorships, null, now);

    expect(preview.pinned).toBeNull();
    expect(preview.others.map((item) => item.name.en)).toEqual(["Ultimate Power Solution"]);
  });

  it("says the scope mode falls back to logo and name on a phone", () => {
    const preview = previewStrip({ ...fromStripRecord(null), displayMode: "logoNameScope" }, [sponsor("a", "A")], [ship("s1", "a", "Official", 0)], null, now);
    expect(preview.phoneFallsBack).toBe(true);
  });

  it("shows nothing when the strip is hidden", () => {
    const preview = previewStrip({ ...fromStripRecord(null), isVisible: false }, [sponsor("a", "A")], [ship("s1", "a", "Official", 0)], null, now);
    expect(preview.pinned).toBeNull();
    expect(preview.others).toEqual([]);
  });
});

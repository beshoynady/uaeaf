import { selectShowcase, sponsorStats } from "./showcase";
import type { ShowcaseSponsorship } from "./showcase";

/**
 * Who fills the banner and who fills the grid (ADR-0085 D5.1), and the
 * section's three figures (ADR-0077 D6).
 *
 * The banner takes the highest tier present among the sponsorships running at
 * `now` — never pinned to Strategic. The editor's preference only chooses among
 * that tier. The banner's sponsorship is not repeated in the grid.
 */
describe("sponsors showcase", () => {
  const now = new Date("2027-03-01T08:00:00.000Z");

  const sponsorship = (id: string, tier: ShowcaseSponsorship["tier"], overrides: Partial<ShowcaseSponsorship> = {}): ShowcaseSponsorship => ({
    id,
    sponsorId: `sponsor-${id}`,
    tier,
    targetType: "Federation",
    displayOrder: 0,
    startDate: "2026-08-31T20:00:00.000Z",
    endDate: "2027-08-31T19:59:59.000Z",
    ...overrides,
  });

  it("has no banner and no grid when nothing runs", () => {
    expect(selectShowcase([], { bannerSponsorshipId: null }, now)).toEqual({ banner: null, grid: [] });
  });

  it("puts an Official sponsorship in the banner when it is the only one", () => {
    const ups = sponsorship("ups", "Official");

    expect(selectShowcase([ups], { bannerSponsorshipId: null }, now)).toEqual({ banner: ups, grid: [] });
  });

  it("moves the banner to a Strategic sponsorship once one is added, and returns the Official one to the grid", () => {
    const ups = sponsorship("ups", "Official");
    const strategic = sponsorship("strategic", "Strategic", { displayOrder: 5 });

    const showcase = selectShowcase([ups, strategic], { bannerSponsorshipId: null }, now);

    expect(showcase.banner?.id).toBe("strategic");
    expect(showcase.grid.map((item) => item.id)).toEqual(["ups"]);
  });

  it("returns the banner to the Official sponsorship when the Strategic one's Dubai window has ended", () => {
    const ups = sponsorship("ups", "Official");
    const strategic = sponsorship("strategic", "Strategic", { endDate: "2027-02-28T19:59:59.000Z" });

    const showcase = selectShowcase([ups, strategic], { bannerSponsorshipId: null }, now);

    expect(showcase.banner?.id).toBe("ups");
    expect(showcase.grid).toEqual([]);
  });

  it("lets the editor's preference choose among the highest tier, by display order otherwise", () => {
    const first = sponsorship("first", "Strategic", { displayOrder: 1 });
    const second = sponsorship("second", "Strategic", { displayOrder: 2 });

    expect(selectShowcase([second, first], { bannerSponsorshipId: null }, now).banner?.id).toBe("first");

    const preferred = selectShowcase([first, second], { bannerSponsorshipId: "second" }, now);
    expect(preferred.banner?.id).toBe("second");
    expect(preferred.grid.map((item) => item.id)).toEqual(["first"]);
  });

  it("never lets the preference put a lower tier in the banner", () => {
    const strategic = sponsorship("strategic", "Strategic");
    const official = sponsorship("official", "Official");

    expect(selectShowcase([strategic, official], { bannerSponsorshipId: "official" }, now).banner?.id).toBe("strategic");
  });

  it("orders the grid by tier, then by display order", () => {
    const items = [
      sponsorship("support", "Supporting", { displayOrder: 0 }),
      sponsorship("official-b", "Official", { displayOrder: 2 }),
      sponsorship("strategic", "Strategic", { displayOrder: 9 }),
      sponsorship("official-a", "Official", { displayOrder: 1 }),
    ];

    expect(selectShowcase(items, { bannerSponsorshipId: null }, now).grid.map((item) => item.id)).toEqual([
      "official-a",
      "official-b",
      "support",
    ]);
  });

  describe("sponsorStats", () => {
    it("counts distinct sponsors, whole years of the longest running sponsorship and this year's championships", () => {
      const items = [
        sponsorship("a", "Official", { startDate: "2020-01-01T00:00:00.000Z", endDate: null }),
        sponsorship("b", "Supporting", { sponsorId: "sponsor-a", targetType: "Championship" }),
        sponsorship("c", "Supporting", { targetType: "Championship" }),
      ];

      expect(sponsorStats(items, now)).toEqual([
        { key: "sponsors", value: 2 },
        { key: "years", value: 7 },
        { key: "championships", value: 2 },
      ]);
    });

    it("prints no figure below one: a sponsorship that began this year shows no \"0 years\"", () => {
      const ups = sponsorship("ups", "Official");

      expect(sponsorStats([ups], now)).toEqual([{ key: "sponsors", value: 1 }]);
    });

    it("counts nothing that is not running at now", () => {
      const ended = sponsorship("ended", "Official", { endDate: "2026-12-31T19:59:59.000Z" });

      expect(sponsorStats([ended], now)).toEqual([]);
    });
  });
});

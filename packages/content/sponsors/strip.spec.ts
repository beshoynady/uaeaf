import {
  STRIP_BREAKPOINTS,
  STRIP_DEFAULTS,
  stripDisplayMode,
  stripItems,
  stripLoopSeconds,
  stripRowFrom,
} from "./strip";
import type { ShowcaseSponsorship } from "./showcase";
import type { StripSettingsLike } from "./strip";

/**
 * The global sponsor strip (ADR-0077 D5, ADR-0085 D7): who it shows, which one
 * is pinned, whether the row stands still, and how long one loop takes.
 *
 * Nothing is measured at run time: the row's capacity comes from the item
 * count and fixed minimum widths (`row-capacity.ts`'s pattern), so the server
 * draws the final layout and nothing shifts when the page hydrates.
 */
describe("sponsor strip", () => {
  const now = new Date("2027-03-01T08:00:00.000Z");

  const sponsorship = (id: string, tier: ShowcaseSponsorship["tier"], displayOrder: number, overrides: Partial<ShowcaseSponsorship> = {}): ShowcaseSponsorship => ({
    id,
    sponsorId: `sponsor-${id}`,
    tier,
    targetType: "Federation",
    displayOrder,
    startDate: "2026-08-31T20:00:00.000Z",
    endDate: null,
    ...overrides,
  });

  const settings = (overrides: Partial<StripSettingsLike> = {}): StripSettingsLike => ({
    isVisible: true,
    displayMode: "logoName",
    selection: "allActive",
    sponsorshipIds: [],
    order: "tier",
    pinTopTier: true,
    speed: "medium",
    ...overrides,
  });

  it("defaults to the owner's settings, the API's own defaults: visible, logo + name, every running sponsor, by tier, top tier pinned, medium", () => {
    expect(STRIP_DEFAULTS).toEqual({
      isVisible: true,
      displayMode: "logoName",
      selection: "allActive",
      sponsorshipIds: [],
      order: "tier",
      pinTopTier: true,
      speed: "medium",
    });
  });

  describe("stripItems", () => {
    const items = [
      sponsorship("support", "Supporting", 0),
      sponsorship("ups", "Official", 0),
      sponsorship("demo-official", "Official", 1),
      sponsorship("ended", "Official", 2, { endDate: "2026-12-31T19:59:59.000Z" }),
    ];

    it("shows nothing when the strip is hidden", () => {
      expect(stripItems(items, settings({ isVisible: false }), null, now)).toEqual({ pinned: null, others: [] });
    });

    it("pins the banner's sponsorship and orders the rest by tier, leaving out what has ended", () => {
      const result = stripItems(items, settings(), "ups", now);

      expect(result.pinned?.id).toBe("ups");
      expect(result.others.map((item) => item.id)).toEqual(["demo-official", "support"]);
    });

    it("pins nothing when pinning is off, and keeps every running sponsorship in the row", () => {
      const result = stripItems(items, settings({ pinTopTier: false }), "ups", now);

      expect(result.pinned).toBeNull();
      expect(result.others.map((item) => item.id)).toEqual(["ups", "demo-official", "support"]);
    });

    it("orders by the editor's display order when the order is manual", () => {
      const result = stripItems(items, settings({ pinTopTier: false, order: "manual" }), null, now);

      expect(result.others.map((item) => item.id)).toEqual(["support", "ups", "demo-official"]);
    });

    it("shows only a manual selection, in the order it was chosen, skipping what is not running", () => {
      const result = stripItems(
        items,
        settings({ pinTopTier: false, selection: "manual", sponsorshipIds: ["support", "ended", "ups"] }),
        null,
        now,
      );

      expect(result.others.map((item) => item.id)).toEqual(["support", "ups"]);
    });

    it("pins within a manual selection only when the pinned sponsorship was selected", () => {
      const result = stripItems(items, settings({ selection: "manual", sponsorshipIds: ["support"] }), "ups", now);

      expect(result.pinned).toBeNull();
      expect(result.others.map((item) => item.id)).toEqual(["support"]);
    });
  });

  describe("stripDisplayMode", () => {
    it("falls back from logo + name + scope to logo + name below md, as ADR-0077 D5 #7 decided", () => {
      expect(stripDisplayMode("logoNameScope", "base")).toBe("logoName");
      expect(stripDisplayMode("logoNameScope", "sm")).toBe("logoName");
      expect(stripDisplayMode("logoNameScope", "md")).toBe("logoNameScope");
      expect(stripDisplayMode("logo", "base")).toBe("logo");
    });
  });

  describe("stripRowFrom", () => {
    it("lists the breakpoints narrowest first", () => {
      expect(STRIP_BREAKPOINTS).toEqual(["base", "sm", "md", "lg", "xl", "2xl"]);
    });

    it("stands one pinned sponsor still at every width", () => {
      expect(stripRowFrom(0, true, "logoName")).toBe("base");
    });

    it("stands a short row still from the width that holds it, and never below", () => {
      const from = stripRowFrom(3, true, "logoName");
      expect(from).not.toBeNull();
      expect(STRIP_BREAKPOINTS.indexOf(from!)).toBeGreaterThan(0);
      expect(stripRowFrom(3, true, "logo")).not.toBeNull();
      expect(STRIP_BREAKPOINTS.indexOf(stripRowFrom(3, true, "logo")!)).toBeLessThanOrEqual(STRIP_BREAKPOINTS.indexOf(from!));
    });

    it("moves at every width when no row holds the items", () => {
      expect(stripRowFrom(40, true, "logoNameScope")).toBeNull();
    });
  });

  describe("stripLoopSeconds", () => {
    it("takes longer for more items, for slower speeds and for the longer scope items", () => {
      const medium = stripLoopSeconds(4, "logoName", "medium");
      expect(stripLoopSeconds(8, "logoName", "medium")).toBeGreaterThan(medium);
      expect(stripLoopSeconds(4, "logoName", "slow")).toBeGreaterThan(medium);
      expect(stripLoopSeconds(4, "logoName", "fast")).toBeLessThan(medium);
      expect(stripLoopSeconds(4, "logoNameScope", "medium")).toBeGreaterThan(medium);
    });

    it("gives each item the same time on screen at a speed, however many there are", () => {
      expect(stripLoopSeconds(6, "logo", "medium") / 6).toBe(stripLoopSeconds(2, "logo", "medium") / 2);
    });
  });
});

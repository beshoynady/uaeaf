import {
  STRIP_DEFAULTS,
  STRIP_GAP,
  STRIP_ITEM_MIN,
  STRIP_PIXELS_PER_SECOND,
  stripCopies,
  stripCopyWidth,
  stripItems,
  stripLoopSeconds,
} from "./strip";
import type { ShowcaseSponsorship } from "./showcase";
import type { StripSettingsLike } from "./strip";

/**
 * The global sponsor strip (ADR-0077 D5, ADR-0085 D7 and D9): who it shows,
 * which one is pinned, how wide one copy of the row is, how many copies it
 * takes for the seam never to show, and how long one cycle runs.
 *
 * Nothing is measured at run time. Every width here is one D8 #4 already
 * fixed, so the server draws the final layout and nothing shifts when the page
 * hydrates (Chapter 5 §5.9).
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
    pinnedSponsorshipId: null,
    speed: "medium",
    ...overrides,
  });

  it("defaults to the owner's settings, the API's own defaults: visible, logo + name, every running sponsor, by tier, nobody pinned, medium", () => {
    expect(STRIP_DEFAULTS).toEqual({
      isVisible: true,
      displayMode: "logoName",
      selection: "allActive",
      sponsorshipIds: [],
      order: "tier",
      pinnedSponsorshipId: null,
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
      expect(stripItems(items, settings({ isVisible: false }), now)).toEqual({ pinned: null, others: [] });
    });

    // ADR-0086 D2, the four states the editor can leave this in.

    it("holds nobody and rotates everyone when nothing is pinned", () => {
      const result = stripItems(items, settings(), now);

      expect(result.pinned).toBeNull();
      expect(result.others.map((item) => item.id)).toEqual(["ups", "demo-official", "support"]);
    });

    it("holds the chosen sponsorship and leaves it out of the row, so it is never in two places", () => {
      const result = stripItems(items, settings({ pinnedSponsorshipId: "ups" }), now);

      expect(result.pinned?.id).toBe("ups");
      expect(result.others.map((item) => item.id)).toEqual(["demo-official", "support"]);
    });

    it("holds nobody, and leaves no gap, when the chosen sponsorship is no longer running", () => {
      // The window decides this, not a second rule: an ended or unpublished
      // sponsorship is simply not among the ones the strip can show.
      const result = stripItems(items, settings({ pinnedSponsorshipId: "ended" }), now);

      expect(result.pinned).toBeNull();
      expect(result.others.map((item) => item.id)).toEqual(["ups", "demo-official", "support"]);
    });

    it("lets the previous one rejoin the row when the choice moves to another", () => {
      const before = stripItems(items, settings({ pinnedSponsorshipId: "ups" }), now);
      const after = stripItems(items, settings({ pinnedSponsorshipId: "demo-official" }), now);

      expect(before.others.map((item) => item.id)).not.toContain("ups");
      expect(after.pinned?.id).toBe("demo-official");
      expect(after.others.map((item) => item.id)).toContain("ups");
    });

    it("orders by the editor's display order when the order is manual", () => {
      const result = stripItems(items, settings({ order: "manual" }), now);

      expect(result.others.map((item) => item.id)).toEqual(["support", "ups", "demo-official"]);
    });

    it("shows only a manual selection, in the order it was chosen, skipping what is not running", () => {
      const result = stripItems(
        items,
        settings({ selection: "manual", sponsorshipIds: ["support", "ended", "ups"] }),
        now,
      );

      expect(result.others.map((item) => item.id)).toEqual(["support", "ups"]);
    });

    it("holds the chosen one within a manual selection only when it was selected", () => {
      const result = stripItems(
        items,
        settings({ selection: "manual", sponsorshipIds: ["support"], pinnedSponsorshipId: "ups" }),
        now,
      );

      expect(result.pinned).toBeNull();
      expect(result.others.map((item) => item.id)).toEqual(["support"]);
    });
  });

  describe("the loop's geometry (ADR-0085 D9)", () => {
    it("gives one copy the width of its items and their gaps, so copies tile with no join", () => {
      // Each item carries the gap that follows it, which is what makes the
      // seam between the last item of one copy and the first of the next look
      // like every other gap in the row.
      expect(stripCopyWidth(1, "logoName")).toBe(STRIP_ITEM_MIN.logoName + STRIP_GAP);
      expect(stripCopyWidth(4, "logoName")).toBe(4 * (STRIP_ITEM_MIN.logoName + STRIP_GAP));
      expect(stripCopyWidth(0, "logoName")).toBe(0);
    });

    it("repeats until the track is wider than the widest viewport by a whole copy", () => {
      // D9.3: one cycle travels exactly one copy, so the end of the track can
      // only come into view if the track is not that much wider than the
      // frame. 1312 is Chapter 5 §5.2's widest content width.
      const covers = (count: number, mode: Parameters<typeof stripCopyWidth>[1]) =>
        stripCopies(count, mode) * stripCopyWidth(count, mode) - stripCopyWidth(count, mode);
      for (const count of [2, 3, 5, 10, 24]) {
        expect(covers(count, "logoName"), `${count} sponsors`).toBeGreaterThanOrEqual(1312);
      }
    });

    it("never draws fewer than two copies once there is a loop at all", () => {
      expect(stripCopies(24, "logoNameScope")).toBeGreaterThanOrEqual(2);
      expect(stripCopies(2, "logo")).toBeGreaterThanOrEqual(2);
    });

    // ADR-0086 D5: one sponsor is not a loop.
    it("does not repeat a single sponsor, because repetition would misstate how many there are", () => {
      for (const mode of ["logo", "logoName", "logoNameScope"] as const) {
        expect(stripCopies(1, mode), mode).toBe(0);
      }
    });

    it("draws nothing to repeat when there is nothing to show", () => {
      expect(stripCopies(0, "logoName")).toBe(0);
    });
  });

  describe("the loop's speed (ADR-0085 D9.2)", () => {
    it("moves at one rate in pixels per second, whatever the count", () => {
      // The defect this replaces: seconds-per-item made a long row move faster
      // than a short one. The rate is what a visitor perceives, so the rate is
      // what is held fixed.
      const rate = (count: number) => stripCopyWidth(count, "logoName") / stripLoopSeconds(count, "logoName", "medium");
      expect(rate(1)).toBeCloseTo(rate(10), 6);
      expect(rate(3)).toBeCloseTo(STRIP_PIXELS_PER_SECOND.medium, 6);
    });

    it("moves at one rate whatever the display mode", () => {
      // And the other half of it: a logo-only strip used to cross at 32px/s
      // while a logo-and-name strip crossed at 57px/s, on the same page.
      const rate = (mode: Parameters<typeof stripCopyWidth>[1]) =>
        stripCopyWidth(4, mode) / stripLoopSeconds(4, mode, "medium");
      expect(rate("logo")).toBeCloseTo(rate("logoName"), 6);
      expect(rate("logoNameScope")).toBeCloseTo(rate("logoName"), 6);
    });

    it("keeps the editor's three speeds ordered, and the default one unchanged", () => {
      expect(STRIP_PIXELS_PER_SECOND.slow).toBeLessThan(STRIP_PIXELS_PER_SECOND.medium);
      expect(STRIP_PIXELS_PER_SECOND.medium).toBeLessThan(STRIP_PIXELS_PER_SECOND.fast);
      // D9.2: medium is D8 #2's 4.5s per item over the default mode's own
      // 256px of track — the same speed as before, in the unit that holds.
      expect(STRIP_PIXELS_PER_SECOND.medium).toBe(Math.round((STRIP_ITEM_MIN.logoName + STRIP_GAP) / 4.5));
    });

    it("takes longer for a longer row and for a slower speed", () => {
      const medium = stripLoopSeconds(4, "logoName", "medium");
      expect(stripLoopSeconds(8, "logoName", "medium")).toBeGreaterThan(medium);
      expect(stripLoopSeconds(4, "logoName", "slow")).toBeGreaterThan(medium);
      expect(stripLoopSeconds(4, "logoName", "fast")).toBeLessThan(medium);
    });

    it("gives an empty strip no duration to run", () => {
      expect(stripLoopSeconds(0, "logoName", "medium")).toBe(0);
    });
  });
});

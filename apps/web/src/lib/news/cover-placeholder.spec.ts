import { describe, expect, it } from "vitest";
import { coverPlaceholder, PLACEHOLDER_REGISTERS } from "./cover-placeholder";

/**
 * What a card shows when the newsroom published without a picture.
 *
 * The rule the whole thing exists to keep: no article ever renders a hole.
 * Everything below is about making the filler honest — derived from the
 * article rather than random, on the federation's own registers rather than an
 * invented grey, and varied enough that a grid of them does not look stamped.
 */
describe("coverPlaceholder", () => {
  it("gives the same article the same placeholder every time", () => {
    // A card and the share image it links to must agree, and so must two
    // renders of the same page. Randomness here would make an article change
    // colour on reload.
    const first = coverPlaceholder({ slug: "national-championship-2026", category: "General" });
    const second = coverPlaceholder({ slug: "national-championship-2026", category: "General" });

    expect(first).toEqual(second);
  });

  it("puts the two shelves on different registers", () => {
    const news = coverPlaceholder({ slug: "a-story", category: "General" });
    const media = coverPlaceholder({ slug: "a-story", category: "FederationInMedia" });

    // The category is what the brief derives the colour from, and it is also
    // what separates the two homepage shelves — so a reader scanning a mixed
    // list can tell them apart without reading the badge.
    expect(news.register).not.toBe(media.register);
  });

  it("never spends the federation red on a placeholder", () => {
    // ADR-0050 budgets red at 5% or less of a page. A grid of twelve cards
    // with no uploaded pictures would blow that budget on filler, which is the
    // one thing red must never be spent on.
    const registers = Array.from({ length: 40 }, (_, i) =>
      coverPlaceholder({ slug: `story-${i}`, category: i % 2 ? "General" : "FederationInMedia" }).register,
    );

    expect(registers).not.toContain("red");
    expect(new Set(registers)).toEqual(new Set(PLACEHOLDER_REGISTERS));
  });

  it("varies the motif so a grid does not look stamped", () => {
    const placements = Array.from({ length: 12 }, (_, i) =>
      coverPlaceholder({ slug: `story-${i}`, category: "General" }),
    ).map((p) => `${p.motif.x}:${p.motif.y}:${p.motif.scale}`);

    // Same register, different geometry: the colour says which shelf, the
    // placement keeps twelve of them from reading as one repeated tile.
    expect(new Set(placements).size).toBeGreaterThan(1);
  });

  it("keeps the motif inside the frame", () => {
    for (let i = 0; i < 60; i += 1) {
      const { motif } = coverPlaceholder({ slug: `story-${i}`, category: "General" });

      // Expressed as percentages of the box. Outside 0–100 the motif clips at
      // an edge and the card reads as a rendering fault rather than a design.
      expect(motif.x).toBeGreaterThanOrEqual(0);
      expect(motif.x).toBeLessThanOrEqual(100);
      expect(motif.y).toBeGreaterThanOrEqual(0);
      expect(motif.y).toBeLessThanOrEqual(100);
      expect(motif.scale).toBeGreaterThan(0);
    }
  });

  it("survives a slug that is empty or not Latin", () => {
    // A slug is Latin by validation upstream, but this also renders for a
    // preview of an unsaved draft, and a hash that throws takes the page with
    // it.
    expect(() => coverPlaceholder({ slug: "", category: "General" })).not.toThrow();
    expect(() => coverPlaceholder({ slug: "بطولة", category: "General" })).not.toThrow();
  });
});

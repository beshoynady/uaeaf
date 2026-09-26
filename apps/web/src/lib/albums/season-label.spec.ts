import { describe, expect, it } from "vitest";

import { isSeasonLabel } from "./season-label";

/**
 * The season label, held to the API's own shape (`videos/season.ts`,
 * `seasonRange`): anything this accepts, the API filters by; anything it
 * refuses, the API would have ignored.
 */

const EN_DASH = "\u2013";

describe("isSeasonLabel", () => {
  it("accepts the label the facets write, en dash and all", () => {
    expect(isSeasonLabel(`2025${EN_DASH}2026`)).toBe(true);
    // The same label typed as a literal, so the escape cannot drift from it.
    expect(isSeasonLabel("2025–2026")).toBe(true);
  });

  it("refuses a hyphen, which the API refuses too", () => {
    expect(isSeasonLabel("2025-2026")).toBe(false);
  });

  it("refuses two years that are not one season", () => {
    expect(isSeasonLabel(`2026${EN_DASH}2025`)).toBe(false);
    expect(isSeasonLabel(`2025${EN_DASH}2027`)).toBe(false);
  });

  it("refuses an id, which is what the season filter took before it was derived", () => {
    expect(isSeasonLabel("a".repeat(24))).toBe(false);
  });

  it("refuses anything around the label rather than trimming it", () => {
    expect(isSeasonLabel(` 2025${EN_DASH}2026`)).toBe(false);
    expect(isSeasonLabel(`2025${EN_DASH}2026x`)).toBe(false);
  });
});

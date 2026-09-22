import { describe, expect, it } from "vitest";
import { COVERAGE_PLACEHOLDER_COUNT, showsCoveragePlaceholders } from "./media-coverage";

describe("the coverage placeholders", () => {
  it("never reach production", () => {
    expect(showsCoveragePlaceholders("production")).toBe(false);
  });

  it("show in development and in tests", () => {
    expect(showsCoveragePlaceholders("development")).toBe(true);
    expect(showsCoveragePlaceholders("test")).toBe(true);
  });

  it("are five, so the track overflows at 1440px as the canvas draws it", () => {
    expect(COVERAGE_PLACEHOLDER_COUNT).toBe(5);
  });
});

import { describe, expect, it } from "vitest";
import {
  HERO_CTA_LABEL_MAX,
  HERO_PLAYBACK,
  HERO_TEXT_LIMITS,
  graphemeLength,
  isInternalHeroUrl,
  isUsableHeroUrl,
} from "./limits";

describe("the limits an editor writes within", () => {
  it("are the ones measured at 390 with the site's own elements (progress log §٢٧.٣)", () => {
    expect(HERO_TEXT_LIMITS).toEqual({
      eyebrow: 52,
      title: 44,
      subtitle: 116,
      eventName: 52,
      eventLabel: 52,
      eventVenue: 35,
    });
    expect(HERO_CTA_LABEL_MAX).toBe(32);
  });

  it("counts what a reader sees as one character, ignoring the ends' spaces", () => {
    expect(graphemeLength("abc")).toBe(3);
    expect(graphemeLength("👍🏽")).toBe(1);
    expect(graphemeLength("  مرحبا  ")).toBe(5);
  });

  it("offers only the dwell values the site supports, each longer than the transition", () => {
    expect(HERO_PLAYBACK.intervals).toEqual([5000, 7000, 9000]);
    expect(HERO_PLAYBACK.defaultIntervalMs).toBe(7000);
    for (const interval of HERO_PLAYBACK.intervals) {
      expect(interval - HERO_PLAYBACK.transitionMs).toBeGreaterThanOrEqual(3500);
    }
  });

  it("holds links to the hero buttons' rule", () => {
    expect(isInternalHeroUrl("/championships")).toBe(true);
    expect(isInternalHeroUrl("//evil.example")).toBe(false);
    expect(isUsableHeroUrl("https://worldathletics.org")).toBe(true);
    expect(isUsableHeroUrl("http://example.com")).toBe(false);
    expect(isUsableHeroUrl("javascript:alert(1)")).toBe(false);
    expect(isUsableHeroUrl("news")).toBe(false);
  });
});

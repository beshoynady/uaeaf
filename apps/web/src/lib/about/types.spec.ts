import { describe, expect, it } from "vitest";
import { ABOUT_SECTION_ORDER, firstSectionAfterHero, sectionAnchor } from "./types";
import type { AboutPage } from "./types";

const page = (present: string[]): AboutPage =>
  present.reduce((built, key) => ({ ...built, [key]: {} }), { isActive: true } as AboutPage);

describe("ABOUT_SECTION_ORDER", () => {
  it("is the printed order, hero first and the call to action last (ADR-0101 D3)", () => {
    expect(ABOUT_SECTION_ORDER).toEqual([
      "hero",
      "facts",
      "story",
      "timeline",
      "achievements",
      "pioneers",
      "leadership",
      "governance",
      "ecosystem",
      "cta",
    ]);
  });
});

/**
 * The hero's scroll cue is the one control inviting a reader onward. Pointed
 * at a section an editor has switched off, it becomes a dead link on the most
 * prominent thing on the page — and nothing about the page would look wrong
 * while it was broken.
 */
describe("firstSectionAfterHero", () => {
  it("points at the facts row on a complete page", () => {
    expect(firstSectionAfterHero(page(["hero", "facts", "story", "cta"]))).toBe("facts");
  });

  it("skips past a section the editor switched off", () => {
    expect(firstSectionAfterHero(page(["hero", "story", "cta"]))).toBe("story");
  });

  it("skips past several", () => {
    expect(firstSectionAfterHero(page(["hero", "governance"]))).toBe("governance");
  });

  it("answers null when the hero is all there is, so the cue can be left out", () => {
    expect(firstSectionAfterHero(page(["hero"]))).toBeNull();
  });

  it("never points at the hero itself", () => {
    expect(firstSectionAfterHero(page(["hero", "facts"]))).not.toBe("hero");
  });
});

describe("sectionAnchor", () => {
  it("gives every section a distinct anchor", () => {
    const anchors = ABOUT_SECTION_ORDER.map(sectionAnchor);

    expect(new Set(anchors).size).toBe(ABOUT_SECTION_ORDER.length);
  });
});

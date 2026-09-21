import { describe, expect, it } from "vitest";
import { newsSections, shelfCategory } from "./homepage-news";
import type { PageSectionPublic } from "@/lib/api/types";

const section = (overrides: Partial<PageSectionPublic> = {}): PageSectionPublic =>
  ({
    id: "s1",
    sectionType: "LATEST_NEWS",
    sectionTitle: null,
    sectionSubtitle: null,
    itemLimit: null,
    ctaText: null,
    ctaUrl: null,
    displayOrder: 1,
    selectionMode: "AUTOMATIC",
    items: [],
    configuration: null,
    ...overrides,
  }) as PageSectionPublic;

/**
 * Which shelves the homepage carries, and what narrows each.
 *
 * The decision this pins: both shelves are one section type, told apart by
 * the section's own configuration. The alternative was a second value in the
 * API's closed `PAGE_SECTION_TYPES` enum, which needs owner approval to
 * express something the existing extension point already expresses.
 */
describe("newsSections", () => {
  it("takes the news shelves and leaves every other section alone", () => {
    const sections = [
      section({ id: "hero", sectionType: "HERO" as never }),
      section({ id: "news" }),
      section({ id: "sponsors", sectionType: "SPONSORS" as never }),
    ];

    expect(newsSections(sections).map((s) => s.id)).toEqual(["news"]);
  });

  it("never claims the external-media section", () => {
    // `EXTERNAL_MEDIA` belongs to `externalMediaCoverage` — a separate
    // collection of pointers at coverage other outlets published. Drawing
    // articles under it would put someone else's headline in the federation's
    // voice, which is the one conflation the schema comment forbids by name.
    expect(newsSections([section({ sectionType: "EXTERNAL_MEDIA" as never })])).toEqual([]);
  });

  it("draws the shelves in the order they were composed", () => {
    const sections = [
      section({ id: "media", displayOrder: 5 }),
      section({ id: "latest", displayOrder: 4 }),
    ];

    // The CMS decides which shelf leads. Sorting here rather than trusting
    // the response's order means two shelves cannot swap places between
    // deploys for reasons nobody chose.
    expect(newsSections(sections).map((s) => s.id)).toEqual(["latest", "media"]);
  });
});

describe("shelfCategory", () => {
  it("reads the category a shelf is narrowed to", () => {
    expect(shelfCategory(section({ configuration: { category: "FederationInMedia" } }))).toBe(
      "FederationInMedia",
    );
  });

  it("treats a shelf with no configuration as everything", () => {
    expect(shelfCategory(section())).toBeNull();
    expect(shelfCategory(section({ configuration: {} }))).toBeNull();
  });

  it("ignores a category the enum does not name", () => {
    // `configuration` is free-form, so a typo in the CMS would otherwise
    // become a filter that matches nothing and a shelf that silently
    // disappears — the hardest kind of bug to see on a front page.
    expect(shelfCategory(section({ configuration: { category: "Genral" } }))).toBeNull();
    expect(shelfCategory(section({ configuration: { category: 7 } }))).toBeNull();
  });
});

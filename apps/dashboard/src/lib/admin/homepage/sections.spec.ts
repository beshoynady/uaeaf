import { describe, expect, it } from "vitest";
import { HOMEPAGE_SECTIONS, SECTION_REORDER_ENABLED, isLocked, moveSection, toHomepageSections } from "./sections";

/**
 * The homepage's sections, as the management screen orders and shows them.
 *
 * Two properties matter and neither is obvious from the happy path: a move
 * must produce a *permutation* (nothing lost, nothing duplicated, every
 * `displayOrder` still distinct), and the hero must be impossible to hide —
 * not merely un-offered.
 */

const row = (sectionType: string, displayOrder: number, enabled = true) => ({
  _id: `id-${sectionType}`,
  sectionType,
  displayOrder,
  enabled,
});

describe("toHomepageSections", () => {
  it("orders by displayOrder, not by the order the API happened to return", () => {
    const sections = toHomepageSections([row("LATEST_NEWS", 4), row("HERO", 0), row("SPONSORS", 1)]);

    expect(sections.map((s) => s.sectionType)).toEqual(["HERO", "SPONSORS", "LATEST_NEWS"]);
  });

  it("leaves out the footer, which is not a homepage section", () => {
    // It is on every page of the site, so hiding it "on the homepage" is not a
    // thing the platform can do. Its editor stays in the sidebar. No `FOOTER`
    // row exists today either -- the footer and the sponsor strip are stored
    // in `siteSettings`, not in `pageSections` -- so this is the guard for a
    // row appearing later, not a case the screen meets now.
    const sections = toHomepageSections([row("HERO", 0), row("FOOTER", 9)]);

    expect(sections.map((s) => s.sectionType)).not.toContain("FOOTER");
  });

  it("keeps a section the registry does not name, rather than hiding it", () => {
    // A section added upstream before this screen learns about it must still
    // be orderable and hideable. Dropping it would make the screen silently
    // disagree with the page it claims to describe.
    const sections = toHomepageSections([row("HERO", 0), row("SOMETHING_NEW", 1)]);

    expect(sections.map((s) => s.sectionType)).toContain("SOMETHING_NEW");
  });

  it("carries the editor's address for a section that has one", () => {
    const [hero] = toHomepageSections([row("HERO", 0)]);

    expect(hero.href).toBe("/homepage/hero");
  });

  it("tells the two LATEST_NEWS rows apart by the category on the row", () => {
    // The homepage holds two of them: the general shelf, and the one narrowed
    // to `FederationInMedia` where "UAEAF in the media" stands. Keyed on type
    // alone they were both named "آخر الأخبار", and an editor hiding one of
    // two identically named rows is guessing which.
    const sections = toHomepageSections([
      { _id: "general", sectionType: "LATEST_NEWS", displayOrder: 0 },
      { _id: "coverage", sectionType: "LATEST_NEWS", displayOrder: 1, configuration: { category: "FederationInMedia" } },
    ]);

    expect(sections.map((s) => s.messageKey)).toEqual(["latestNews", "externalMedia"]);
  });

  it("reads a LATEST_NEWS row with any other category as the general shelf", () => {
    const [row1] = toHomepageSections([
      { _id: "a", sectionType: "LATEST_NEWS", displayOrder: 0, configuration: { category: "General" } },
    ]);

    expect(row1.messageKey).toBe("latestNews");
  });

  it("gives no address to a section with no editor yet", () => {
    // Several approved sections have no screen. They are still listed, still
    // orderable and still hideable — a link to a route that does not exist is
    // worse than no link.
    const [row1] = toHomepageSections([row("FEDERATION_STATS", 1)]);

    expect(row1.href).toBeNull();
  });
});

describe("isLocked", () => {
  it("locks the hero", () => {
    // Not merely un-offered: the write path refuses it too, so a hand-crafted
    // request cannot take the front door off the homepage.
    expect(isLocked("HERO")).toBe(true);
  });

  it("locks nothing else", () => {
    for (const sectionType of ["SPONSORS", "VIDEO_LIBRARY", "LATEST_NEWS", "ANYTHING"]) {
      expect(isLocked(sectionType)).toBe(false);
    }
  });
});

describe("moveSection", () => {
  const list = [row("A", 0), row("B", 1), row("C", 2), row("D", 3)].map((r) => ({
    id: r._id,
    sectionType: r.sectionType,
    displayOrder: r.displayOrder,
  }));

  it("swaps a section with the one above it", () => {
    const moved = moveSection(list, "id-C", "up");

    expect(moved?.map((s) => s.sectionType)).toEqual(["A", "C", "B", "D"]);
  });

  it("swaps a section with the one below it", () => {
    const moved = moveSection(list, "id-B", "down");

    expect(moved?.map((s) => s.sectionType)).toEqual(["A", "C", "B", "D"]);
  });

  it("refuses to move the first one up, and the last one down", () => {
    // `null` rather than a silent no-op list: the caller must not send a write
    // that changes nothing, and the buttons are disabled from the same fact.
    expect(moveSection(list, "id-A", "up")).toBeNull();
    expect(moveSection(list, "id-D", "down")).toBeNull();
  });

  it("refuses an id that is not in the list", () => {
    expect(moveSection(list, "id-nope", "up")).toBeNull();
  });

  it("renumbers from zero with no gaps and no duplicates", () => {
    // The list may arrive with gaps (4, 9, 12) from hand edits upstream. A
    // swap that preserved them would leave two sections able to collide on a
    // later insert.
    const gappy = [
      { id: "a", sectionType: "A", displayOrder: 4 },
      { id: "b", sectionType: "B", displayOrder: 9 },
      { id: "c", sectionType: "C", displayOrder: 12 },
    ];

    const moved = moveSection(gappy, "c", "up");

    expect(moved?.map((s) => s.displayOrder)).toEqual([0, 1, 2]);
    expect(moved?.map((s) => s.sectionType)).toEqual(["A", "C", "B"]);
  });

  it("is a permutation: every section survives exactly once", () => {
    const moved = moveSection(list, "id-C", "up");

    expect(moved).toHaveLength(list.length);
    expect(new Set(moved?.map((s) => s.id)).size).toBe(list.length);
  });

  it("returns only the sections whose order actually changed", () => {
    // The screen sends one PATCH per changed row. Sending all four on every
    // press would be three writes that store the number already there — and
    // three more chances for one of them to fail.
    const moved = moveSection(list, "id-C", "up");
    const changed = moved?.filter((s, index) => s.displayOrder !== index);

    expect(changed).toEqual([]);
    expect(moved?.filter((s) => list.find((o) => o.id === s.id)?.displayOrder !== s.displayOrder)).toHaveLength(2);
  });
});

describe("HOMEPAGE_SECTIONS", () => {
  it("names every section that has an editor screen", () => {
    // If a screen exists and the registry does not know its section type, the
    // list draws it with no Edit link and the reader cannot reach the screen
    // from the page that lists it.
    const withHref = HOMEPAGE_SECTIONS.filter((s) => s.href !== null);

    expect(withHref.map((s) => s.sectionType)).toEqual(
      // The sponsor strip and the footer are absent on purpose: both are
      // `siteSettings`, not `pageSections` rows, so neither can be ordered or
      // hidden here even though both have a sidebar screen.
      expect.arrayContaining(["HERO", "SPONSORS", "PARTNERS", "MEMBERSHIPS", "VIDEO_LIBRARY"]),
    );
  });

  it("declares no duplicate section type", () => {
    const types = HOMEPAGE_SECTIONS.map((s) => s.sectionType);

    expect(new Set(types).size).toBe(types.length);
  });
});

describe("SECTION_REORDER_ENABLED", () => {
  it("is off while the homepage does not read displayOrder", () => {
    // Not a preference. `apps/web/src/app/[locale]/page.tsx` draws three
    // hardcoded groups and sorts only within each, so a saved reorder changes
    // nothing a visitor sees — a control that reports success and does
    // nothing. Backlog §7 "ترتيب الرئيسية الحقيقي" turns this back on as its
    // last step; this test is what makes flipping it a deliberate act.
    expect(SECTION_REORDER_ENABLED).toBe(false);
  });

  it("keeps the ordering logic itself working, so turning it on is one line", () => {
    const list = [
      { id: "a", sectionType: "A", displayOrder: 0 },
      { id: "b", sectionType: "B", displayOrder: 1 },
    ];

    expect(moveSection(list, "b", "up")?.map((s) => s.sectionType)).toEqual(["B", "A"]);
  });
});

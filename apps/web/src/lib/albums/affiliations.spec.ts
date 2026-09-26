import { describe, expect, it } from "vitest";

import { albumAffiliations, narrowestAffiliation } from "./affiliations";
import { EMPTY_ALBUM_FACETS, albumFilterOptions } from "./facet-options";

const CH = "b".repeat(24);
const CO = "c".repeat(24);
const EV = "d".repeat(24);

const bare = { championshipId: null, competitionId: null, publicEventId: null, championshipName: null };

describe("albumAffiliations", () => {
  it("returns nothing for an album with no occasion, so no chip is drawn", () => {
    expect(albumAffiliations(bare, "ar")).toEqual([]);
  });

  it("names the championship from the album's own captured name", () => {
    expect(
      albumAffiliations(
        { ...bare, championshipId: CH, championshipName: { ar: "بطولة الإمارات 2026", en: "UAE Championship 2026" } },
        "en",
      ),
    ).toEqual([{ kind: "championship", id: CH, label: "UAE Championship 2026" }]);
  });

  it("leaves out an affiliation it cannot name rather than inventing a label", () => {
    expect(albumAffiliations({ ...bare, championshipId: CH, competitionId: CO }, "ar")).toEqual([]);
  });

  it("names a competition and an event from the entity lists", () => {
    const names = {
      competitions: [{ id: CO, name: { ar: "نهائي 100 متر", en: "100m final" } }],
      publicEvents: [{ id: EV, name: { ar: "يوم الرياضة الوطني", en: "National Sports Day" } }],
    };
    expect(albumAffiliations({ ...bare, competitionId: CO, publicEventId: EV }, "ar", names)).toEqual([
      { kind: "competition", id: CO, label: "نهائي 100 متر" },
      { kind: "publicEvent", id: EV, label: "يوم الرياضة الوطني" },
    ]);
  });
});

describe("narrowestAffiliation", () => {
  it("prefers the competition over the championship it sits in", () => {
    const list = [
      { kind: "championship" as const, id: CH, label: "Championship" },
      { kind: "competition" as const, id: CO, label: "100m final" },
    ];
    expect(narrowestAffiliation(list)?.kind).toBe("competition");
  });

  it("is undefined when there is none", () => {
    expect(narrowestAffiliation([])).toBeUndefined();
  });
});

describe("albumFilterOptions", () => {
  it("offers nothing for any facet while the API returns empty lists", () => {
    const options = albumFilterOptions(EMPTY_ALBUM_FACETS, {}, "ar");
    expect(Object.values(options).every((list) => list.length === 0)).toBe(true);
  });

  it("joins an id to its name and keeps the count", () => {
    const options = albumFilterOptions(
      { ...EMPTY_ALBUM_FACETS, athletes: [{ id: "e".repeat(24), count: 3 }] },
      { athletes: [{ id: "e".repeat(24), name: { ar: "حمد", en: "Hamad" } }] },
      "en",
    );
    expect(options.athletes).toEqual([{ id: "e".repeat(24), label: "Hamad", count: 3 }]);
  });

  it("offers each season by its own label, newest first as the API sends them, with no names needed", () => {
    const options = albumFilterOptions(
      {
        ...EMPTY_ALBUM_FACETS,
        seasons: [
          { id: "2025\u20132026", count: 12 },
          { id: "2024\u20132025", count: 3 },
        ],
      },
      {},
      "ar",
    );
    expect(options.seasons).toEqual([
      { id: "2025\u20132026", label: "2025\u20132026", count: 12 },
      { id: "2024\u20132025", label: "2024\u20132025", count: 3 },
    ]);
  });

  it("does not offer a season the address would drop", () => {
    const options = albumFilterOptions(
      {
        ...EMPTY_ALBUM_FACETS,
        seasons: [
          { id: "2025-2026", count: 4 },
          { id: "a".repeat(24), count: 2 },
          { id: "2023\u20132024", count: 0 },
        ],
      },
      {},
      "en",
    );
    expect(options.seasons).toEqual([]);
  });

  it("does not offer an id it cannot name", () => {
    const options = albumFilterOptions(
      { ...EMPTY_ALBUM_FACETS, clubs: [{ id: "f".repeat(24), count: 2 }] },
      {},
      "ar",
    );
    expect(options.clubs).toEqual([]);
  });
});

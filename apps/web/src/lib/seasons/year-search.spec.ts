import { describe, expect, it } from "vitest";
import { matchesSeasonQuery, seasonSearchText, toLatinDigits } from "./year-search";

const SEASON = {
  slug: "2026-2027",
  shortName: "26/27",
  startDate: "2026-08-31T20:00:00.000Z",
  endDate: "2027-08-30T20:00:00.000Z",
};

describe("toLatinDigits", () => {
  it("reads Arabic-Indic and Extended Arabic-Indic digits as Latin ones", () => {
    expect(toLatinDigits("٢٠٢٦")).toBe("2026");
    expect(toLatinDigits("۲۰۲۷")).toBe("2027");
    expect(toLatinDigits("26/27")).toBe("26/27");
  });
});

describe("matchesSeasonQuery", () => {
  const text = seasonSearchText(SEASON);

  it("finds the season by either of its years, in either numeral system", () => {
    expect(matchesSeasonQuery(text, "2026")).toBe(true);
    expect(matchesSeasonQuery(text, "٢٠٢٧")).toBe(true);
    expect(matchesSeasonQuery(text, " 2027 ")).toBe(true);
  });

  it("finds it by its short name", () => {
    expect(matchesSeasonQuery(text, "٢٦/٢٧")).toBe(true);
  });

  it("keeps every season for an empty query and none for another year", () => {
    expect(matchesSeasonQuery(text, "")).toBe(true);
    expect(matchesSeasonQuery(text, "2024")).toBe(false);
  });
});

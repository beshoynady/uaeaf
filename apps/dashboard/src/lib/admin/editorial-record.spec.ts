import { describe, expect, it } from "vitest";
import { selectRecord } from "./editorial-record";

const row = (_id: string, createdAt: string) => ({ _id, createdAt });

const REAL = row("real", "2026-09-01T00:00:00.000Z");
const TEST = row("test", "2026-09-10T00:00:00.000Z");

describe("selectRecord", () => {
  it("opens the oldest row when the URL names none, whatever order the API returned", () => {
    expect(selectRecord([TEST, REAL], null)).toBe(REAL);
  });

  it("opens the named row when this reader's list holds it", () => {
    expect(selectRecord([REAL, TEST], "test")).toBe(TEST);
  });

  it("opens nothing for an id the list does not hold, rather than some other row", () => {
    expect(selectRecord([REAL, TEST], "elsewhere")).toBeNull();
  });

  it("opens nothing on an empty collection", () => {
    expect(selectRecord([], null)).toBeNull();
  });
});

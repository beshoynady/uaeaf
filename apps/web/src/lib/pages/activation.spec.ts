import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The gate that decides whether a page shows its content or the in-preparation
 * page (ADR-0102 §D2), and where the one line of copy comes from (§D5).
 *
 * Two failures are worth pinning here because each would be silent. A row
 * written before `isActive` existed carries no such key, and reading absence as
 * "withheld" would take fifteen live federation pages off the site at once. And
 * the copy has a fallback: an unreachable API must not leave the page with an
 * empty paragraph where a sentence belongs.
 */
const fetchPublic = vi.fn();

vi.mock("@/lib/api/public-client", () => ({
  fetchPublic: (path: string) => fetchPublic(path) as unknown,
}));

const getTranslations = vi.fn();

vi.mock("next-intl/server", () => ({
  getTranslations: (options: unknown) => getTranslations(options) as unknown,
}));

const { isServed, withheldMessage } = await import("./activation");

beforeEach(() => {
  fetchPublic.mockReset();
  getTranslations.mockReset();
  // The fallback the site already has for a page in preparation.
  getTranslations.mockResolvedValue((key: string) => (key === "Preparing.status" ? "قيد الإعداد" : key));
});

describe("isServed", () => {
  it("withholds only on an explicit false", () => {
    expect(isServed({ isActive: false })).toBe(false);
    expect(isServed({ isActive: true })).toBe(true);
  });

  it("serves a record that says nothing about the field", () => {
    // A row written before `isActive` existed. The backfill makes these
    // explicit, but a live page must not go dark because it had not run yet.
    expect(isServed({})).toBe(true);
  });

  it("serves an absent record, leaving 'never saved' to the route", () => {
    // "Never saved" and "nothing published" are the route's cases, answered
    // with a 404 or its own screen. One gate, one question.
    expect(isServed(null)).toBe(true);
    expect(isServed(undefined)).toBe(true);
  });
});

describe("withheldMessage", () => {
  it("prefers the federation's own maintenance message", async () => {
    fetchPublic.mockResolvedValue({ maintenanceMessage: { ar: "نعود قريبًا", en: "Back soon" } });

    await expect(withheldMessage("ar")).resolves.toBe("نعود قريبًا");
    await expect(withheldMessage("en")).resolves.toBe("Back soon");
  });

  it("falls back when no message has been written", async () => {
    fetchPublic.mockResolvedValue({ maintenanceMessage: null });

    await expect(withheldMessage("ar")).resolves.toBe("قيد الإعداد");
  });

  it("falls back on a message that is only whitespace", async () => {
    // An editor who cleared the field left a string, not a null.
    fetchPublic.mockResolvedValue({ maintenanceMessage: { ar: "   ", en: "   " } });

    await expect(withheldMessage("ar")).resolves.toBe("قيد الإعداد");
  });

  it("falls back when the settings cannot be read at all", async () => {
    // The worst moment for a hard failure: the API is down and this sentence
    // is the only thing on the page.
    fetchPublic.mockResolvedValue(null);

    await expect(withheldMessage("ar")).resolves.toBe("قيد الإعداد");
  });
});

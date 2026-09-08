import { describe, expect, it } from "vitest";
import { isLocalizedText, isMongoIdList } from "./request-shapes";

describe("isLocalizedText", () => {
  it("accepts a filled bilingual pair", () => {
    expect(isLocalizedText({ en: "Content Manager", ar: "مدير المحتوى" })).toBe(true);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a bare string", "Content Manager"],
    ["one language missing", { en: "Content Manager" }],
    ["a non-string half", { en: "Content Manager", ar: 12 }],
  ])("rejects %s", (_label, value) => {
    expect(isLocalizedText(value)).toBe(false);
  });

  it("rejects an empty half, which the API would store as a blank name", () => {
    expect(isLocalizedText({ en: "", ar: "مدير المحتوى" })).toBe(false);
  });

  it("rejects whitespace, which passes @MinLength(1) upstream and renders blank", () => {
    expect(isLocalizedText({ en: "   ", ar: "مدير المحتوى" })).toBe(false);
  });
});

describe("isMongoIdList", () => {
  const id = "507f1f77bcf86cd799439011";

  it("accepts a list of object ids", () => {
    expect(isMongoIdList([id, id])).toBe(true);
  });

  it("accepts an empty list — a role with no permissions is legitimate", () => {
    expect(isMongoIdList([])).toBe(true);
  });

  it.each([
    ["a non-array", id],
    ["a short id", ["507f1f77"]],
    ["a non-hex id", ["zzzf1f77bcf86cd799439011"]],
    ["a non-string entry", [123]],
  ])("rejects %s", (_label, value) => {
    expect(isMongoIdList(value)).toBe(false);
  });
});

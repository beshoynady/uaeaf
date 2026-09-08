import { describe, expect, it } from "vitest";
import { localized } from "./types";

describe("localized", () => {
  it("returns the field for the reading locale", () => {
    expect(localized({ ar: "المستخدمون", en: "Users" }, "ar")).toBe("المستخدمون");
    expect(localized({ ar: "المستخدمون", en: "Users" }, "en")).toBe("Users");
  });

  it("falls back to the other language rather than rendering an empty cell", () => {
    // Bilingual fields were only made required recently; older rows can hold
    // one side. A blank name in a list of roles is unusable — the wrong
    // language is still an identification.
    expect(localized({ ar: "", en: "News Approver" }, "ar")).toBe("News Approver");
  });

  it("returns an empty string when nothing is set at all", () => {
    expect(localized({ ar: "", en: "" }, "ar")).toBe("");
    expect(localized(null, "en")).toBe("");
  });
});

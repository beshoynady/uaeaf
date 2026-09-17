import { displayName } from "./name";

/**
 * An organisation's name on the page (ADR-0085 D4): the page's language when
 * the organisation has a name in it, otherwise the other one — never a
 * translation. The language travels with the text, so the page can isolate a
 * foreign name and a screen reader can pronounce it.
 */
describe("displayName", () => {
  it("uses the page's language when the name exists in it", () => {
    expect(displayName({ ar: "شركة النخبة", en: "Elite Co" }, "ar")).toEqual({ text: "شركة النخبة", lang: "ar", isForeign: false });
    expect(displayName({ ar: "شركة النخبة", en: "Elite Co" }, "en")).toEqual({ text: "Elite Co", lang: "en", isForeign: false });
  });

  it("shows an English-only name as it is on the Arabic page, marked as English", () => {
    expect(displayName({ ar: null, en: "Ultimate Power Solution" }, "ar")).toEqual({
      text: "Ultimate Power Solution",
      lang: "en",
      isForeign: true,
    });
  });

  it("shows an Arabic-only name as it is on the English page, marked as Arabic", () => {
    expect(displayName({ ar: "مؤسسة الرمال الذهبية", en: null }, "en")).toEqual({
      text: "مؤسسة الرمال الذهبية",
      lang: "ar",
      isForeign: true,
    });
  });

  it("treats a blank side as absent", () => {
    expect(displayName({ ar: "  ", en: "Elite Co" }, "ar")).toEqual({ text: "Elite Co", lang: "en", isForeign: true });
  });

  it("returns null for a name with neither side, so nothing nameless is drawn", () => {
    expect(displayName({ ar: null, en: "" }, "ar")).toBeNull();
    expect(displayName(null, "en")).toBeNull();
  });
});

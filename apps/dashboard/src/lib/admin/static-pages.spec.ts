import { describe, expect, it } from "vitest";
import { STATIC_PAGES, findStaticPage, readPageBody } from "./static-pages";

/**
 * The registry is the contract between three places that would otherwise
 * drift: the screen that renders the form, the route handler that forwards
 * it, and the API that receives it. One list, read by all three.
 *
 * It is data rather than twelve hand-written forms because the pages really
 * are the same shape — ten of them are a hero title, a hero subtitle and an
 * optional image, and writing that out ten times is ten places for a field
 * name to be misspelled in a way nothing catches until an editor's text
 * silently fails to save.
 */
describe("STATIC_PAGES", () => {
  it("covers every singleton page the API exposes a PUT for", () => {
    expect(STATIC_PAGES.map((page) => page.key).sort()).toEqual(
      [
        "albums",
        "athletes",
        "board-members",
        "clubs",
        "coaches",
        "committees",
        "contact-us",
        "disciplines",
        "news",
        "records",
        "results-rankings",
        "videos",
      ].sort(),
    );
  });

  it("names the API path and permission resource for each", () => {
    for (const page of STATIC_PAGES) {
      expect(page.apiPath).toBe(`/${page.key}-page`);
      // The resource is what `@RequirePermission` uses upstream; a mismatch
      // would hide the screen from someone who can edit it, or show it to
      // someone the API will refuse.
      expect(page.resourceType).toMatch(/^[a-z][A-Za-z]+Page$/);
    }
  });

  it("requires a hero title and subtitle on every page", () => {
    for (const page of STATIC_PAGES) {
      const required = page.fields.filter((f) => f.kind === "localized" && f.required).map((f) => f.name);
      expect(required).toContain("heroTitle");
      expect(required).toContain("heroSubtitle");
    }
  });

  it("resolves a page by key and refuses anything else", () => {
    expect(findStaticPage("news")?.apiPath).toBe("/news-page");
    // The route handler takes this key from the URL. Without the lookup an
    // attacker would choose the upstream path.
    expect(findStaticPage("../users")).toBeUndefined();
    expect(findStaticPage("site-settings")).toBeUndefined();
  });
});

describe("readPageBody", () => {
  const news = findStaticPage("news")!;
  const hero = { heroTitle: { ar: "الأخبار", en: "News" }, heroSubtitle: { ar: "آخر ما لدينا", en: "The latest" } };

  it("keeps a complete hero and trims it", () => {
    expect(readPageBody(news, { ...hero, heroTitle: { ar: " الأخبار ", en: " News " } })).toEqual({
      ok: true,
      body: hero,
    });
  });

  it("rejects a half-filled bilingual field", () => {
    // `@MinLength(1)` on each half upstream; a blank half stores a page whose
    // title renders empty in one language.
    expect(readPageBody(news, { ...hero, heroSubtitle: { ar: "آخر ما لدينا", en: "  " } })).toEqual({
      ok: false,
      code: "invalidRequest",
    });
  });

  it("carries an optional image through, and omits it when unset", () => {
    const imageId = "a".repeat(24);
    expect(readPageBody(news, { ...hero, heroImageId: imageId })).toMatchObject({
      ok: true,
      body: { heroImageId: imageId },
    });
    // Omitted rather than null: `@IsOptional()` upstream skips an absent
    // field, while null fails `@IsMongoId()` on an image simply not chosen.
    const cleared = readPageBody(news, { ...hero, heroImageId: "" });
    expect(cleared.ok && "heroImageId" in cleared.body).toBe(false);
  });

  it("rejects a malformed image id rather than forwarding it", () => {
    expect(readPageBody(news, { ...hero, heroImageId: "not-an-id" })).toEqual({
      ok: false,
      code: "invalidRequest",
    });
  });

  it("keeps the extra prose fields the committees page has", () => {
    const committees = findStaticPage("committees")!;
    const body = {
      ...hero,
      introHeading: { ar: "اللجان", en: "Committees" },
      introText: { ar: "نصّ", en: "Text" },
    };
    expect(readPageBody(committees, body)).toEqual({ ok: true, body });
  });

  it("drops fields the page does not declare", () => {
    // `forbidNonWhitelisted` upstream rejects the whole request over one
    // stray key, so a field left over from another page's form would fail
    // the save with nothing on screen explaining why.
    const result = readPageBody(news, { ...hero, introHeading: { ar: "x", en: "y" } });
    expect(result.ok && "introHeading" in result.body).toBe(false);
  });
});

describe("readPageBody — contact page", () => {
  const contact = findStaticPage("contact-us")!;
  const base = {
    heroTitle: { ar: "اتصل بنا", en: "Contact us" },
    heroSubtitle: { ar: "نحن هنا", en: "We are here" },
    email: " Info@UAEAF.ae ",
  };

  it("normalises the address the way a mailbox is written", () => {
    expect(readPageBody(contact, base)).toMatchObject({ ok: true, body: { email: "info@uaeaf.ae" } });
  });

  it("refuses a contact page with no email", () => {
    // It is the one field the page exists to carry.
    expect(readPageBody(contact, { ...base, email: "" })).toEqual({ ok: false, code: "invalidRequest" });
  });

  it("drops blank rows from the phone list instead of sending them", () => {
    const result = readPageBody(contact, {
      ...base,
      phones: [
        { label: { ar: "الخط الرئيسي", en: "Main line" }, number: "+971 2 000 0000" },
        { label: { ar: "", en: "" }, number: "" },
      ],
    });
    expect(result.ok && result.body.phones).toHaveLength(1);
  });

  it("omits an address whose every part is blank", () => {
    const result = readPageBody(contact, { ...base, address: { city: "", street: "  " } });
    expect(result.ok && "address" in result.body).toBe(false);
  });

  it("keeps the parts of an address that were filled in", () => {
    const result = readPageBody(contact, { ...base, address: { city: " Abu Dhabi ", poBox: "1234", street: "" } });
    expect(result.ok && result.body.address).toEqual({ city: "Abu Dhabi", poBox: "1234" });
  });

  it("drops a social link missing either half", () => {
    const result = readPageBody(contact, {
      ...base,
      socialLinks: [
        { platform: "Instagram", url: "https://instagram.com/uaeaf" },
        { platform: "X", url: "" },
        { platform: "", url: "https://example.ae" },
      ],
    });
    expect(result.ok && result.body.socialLinks).toEqual([
      { platform: "Instagram", url: "https://instagram.com/uaeaf" },
    ]);
  });
});

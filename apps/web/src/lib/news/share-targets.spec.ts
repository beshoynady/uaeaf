import { describe, expect, it } from "vitest";
import { shareHref, SHARE_TARGETS } from "./share-targets";

const URL_ = "https://uaeaf.ae/ar/news/championship-2026";
const TITLE = "الاتحاد & البطولة";

describe("shareHref", () => {
  it("encodes a headline that carries an ampersand", () => {
    // Unencoded, the parameter ends at the `&` and the rest of the headline is
    // gone — silently, with a share window that looks fine.
    const href = shareHref("x", URL_, TITLE) ?? "";

    expect(href).not.toContain("& ");
    expect(href).toContain(encodeURIComponent(TITLE));
  });

  it("encodes the address, so a query string in it survives", () => {
    const href = shareHref("facebook", `${URL_}?from=homepage`, TITLE) ?? "";

    expect(href).toContain(encodeURIComponent(`${URL_}?from=homepage`));
  });

  it("sends WhatsApp one field holding both, because it reads only one", () => {
    const href = shareHref("whatsapp", URL_, TITLE) ?? "";

    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(href.split("text=")[1])).toBe(`${TITLE} ${URL_}`);
  });

  it("sends Facebook the address alone", () => {
    // It reads the headline and the picture from the page's own Open Graph
    // tags; a `text` parameter would be ignored, not merged.
    const href = shareHref("facebook", URL_, TITLE) ?? "";

    expect(href).not.toContain(encodeURIComponent(TITLE));
  });

  it("gives copy-to-clipboard no address at all", () => {
    // Which is what tells the component to copy rather than to open a window.
    expect(shareHref("copy", URL_, TITLE)).toBeNull();
  });

  it("answers every target it declares", () => {
    // A target added to the list without a branch would return undefined and
    // the button would open "undefined" as a URL.
    for (const target of SHARE_TARGETS) {
      const href = shareHref(target, URL_, TITLE);
      expect(href === null || href.startsWith("https://")).toBe(true);
    }
  });

  it("offers no target that cannot receive a link", () => {
    // Figma draws Instagram among the six. It has no share-a-link endpoint,
    // so a button for it would open a window with the reader's story missing.
    expect(SHARE_TARGETS).not.toContain("instagram");
  });
});

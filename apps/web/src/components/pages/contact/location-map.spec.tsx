import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocationMap } from "./location-map";

/**
 * The live map on the contact page (owner request 2026-09-22): Google's own
 * embed at the federation's coordinates, with no API key, in place of the
 * still picture the page used while no official address existed.
 */
describe("LocationMap", () => {
  const renderMap = (locale: "ar" | "en" = "ar") =>
    render(<LocationMap latitude={25.286069} longitude={55.3642228} locale={locale} title="خريطة موقع الاتحاد" />);

  const source = () => new URL(screen.getByTitle("خريطة موقع الاتحاد").getAttribute("src") ?? "");

  it("embeds Google Maps at the coordinates, with no key", () => {
    renderMap();

    expect(screen.getByTitle("خريطة موقع الاتحاد").tagName).toBe("IFRAME");
    expect(`${source().origin}${source().pathname}`).toBe("https://www.google.com/maps");
    expect(source().searchParams.get("q")).toBe("25.286069,55.3642228");
    expect(source().searchParams.get("output")).toBe("embed");
    expect(source().searchParams.has("key")).toBe(false);
  });

  it("labels the map in the page's own language", () => {
    renderMap("en");
    expect(source().searchParams.get("hl")).toBe("en");
  });

  it("loads only when the reader nears it", () => {
    // A third-party frame on every visit to the page would cost everyone a
    // cross-origin request and its weight, including those who never scroll.
    renderMap();
    expect(screen.getByTitle("خريطة موقع الاتحاد").getAttribute("loading")).toBe("lazy");
  });
});

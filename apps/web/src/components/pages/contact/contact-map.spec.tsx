import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ContactUsPage } from "@/lib/api/types";

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));

const { ContactMap } = await import("./contact-map");

/**
 * The location panel with the official address (owner request 2026-09-22):
 * a live map at the stored coordinates, the place written under it, and the
 * two ways out to Google Maps.
 */
const RECORD = {
  googleMapsUrl: "https://maps.app.goo.gl/yZQC6nW4EGY8iS4C9",
  map: {
    title: { ar: "موقعنا", en: "Our location" },
    latitude: 25.286069,
    longitude: 55.3642228,
    pinTitle: { ar: "١ شارع النهدة، النهدة الأولى", en: "1 Al Nahda Street, Al Nahda 1" },
    pinSubtitle: { ar: "دبي، الإمارات العربية المتحدة", en: "Dubai, United Arab Emirates" },
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=25.286069,55.3642228",
  },
} as unknown as ContactUsPage;

const renderMap = async (record: ContactUsPage = RECORD) =>
  render(await ContactMap({ locale: "ar", record, headingId: "contact-map-heading" }));

describe("ContactMap", () => {
  it("draws the live map at the record's coordinates", async () => {
    await renderMap();

    const frame = screen.getByTitle("map.frameTitle");
    expect(new URL(frame.getAttribute("src") ?? "").searchParams.get("q")).toBe("25.286069,55.3642228");
  });

  it("carries no picture of a map any more", async () => {
    const { container } = await renderMap();
    expect(container.querySelector("img")).toBeNull();
  });

  it("writes the place under the map rather than over it", async () => {
    // Laid over a live map, the label would cover Google's own marker and
    // take the pointer from the map beneath it.
    await renderMap();

    const place = screen.getByText("١ شارع النهدة، النهدة الأولى");
    expect(screen.getByText("دبي، الإمارات العربية المتحدة")).toBeInTheDocument();
    expect(place.closest('[data-testid="contact-map-frame"]')).toBeNull();
  });

  it("opens the place, and routing to the coordinates", async () => {
    await renderMap();

    const place = screen.getByRole("link", { name: "map.viewOnMaps" });
    const route = screen.getByRole("link", { name: "map.openDirections" });
    expect(place.getAttribute("href")).toBe("https://maps.app.goo.gl/yZQC6nW4EGY8iS4C9");
    expect(route.getAttribute("href")).toBe("https://www.google.com/maps/dir/?api=1&destination=25.286069,55.3642228");
    for (const link of [place, route]) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
  });

  it("draws no map, and no empty frame, without coordinates", async () => {
    await renderMap({ ...RECORD, map: { ...RECORD.map, latitude: null, longitude: null } } as unknown as ContactUsPage);

    expect(screen.queryByTitle("map.frameTitle")).toBeNull();
    expect(document.querySelector('[data-testid="contact-map-frame"]')).toBeNull();
    // The rest of the panel still stands: the heading and the ways out.
    expect(within(screen.getByTestId("contact-map")).getByRole("heading", { name: "موقعنا" })).toBeInTheDocument();
  });
});

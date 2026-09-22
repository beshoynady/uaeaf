import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FooterMapFrame } from "./footer-map-frame";

/**
 * The footer's map frame draws the map only once the frame is on the reader's
 * screen (ADR-0092 D3).
 *
 * `loading="lazy"` alone did not hold that: measured 2026-09-22 on the
 * homepage at 1440×900, Chromium requested the frame at load with the footer
 * 3741px below the screen. The footer is on every page, so that was a
 * third-party request on every visit, including those that never scroll.
 */

type Callback = (entries: { isIntersecting: boolean }[]) => void;

const stubObserver = () => {
  const observed: { callback: Callback; disconnect: ReturnType<typeof vi.fn> } = { callback: () => undefined, disconnect: vi.fn() };
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Callback) {
        observed.callback = callback;
      }
      observe = vi.fn();
      disconnect = observed.disconnect;
    },
  );
  return observed;
};

const MAP = <iframe title="map" src="https://www.google.com/maps?output=embed" />;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FooterMapFrame", () => {
  it("draws no map until the frame is on the screen, and keeps the frame's box meanwhile", () => {
    const observer = stubObserver();
    const { container, queryByTitle } = render(<FooterMapFrame className="min-h-[220px]">{MAP}</FooterMapFrame>);

    expect(queryByTitle("map")).toBeNull();
    // The box is there from the first paint, so the map arriving moves nothing.
    expect(container.querySelector('[data-testid="footer-map-frame"]')?.className).toContain("min-h-[220px]");

    act(() => observer.callback([{ isIntersecting: false }]));
    expect(queryByTitle("map")).toBeNull();

    act(() => observer.callback([{ isIntersecting: true }]));
    expect(queryByTitle("map")).not.toBeNull();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it("sends the map in the server's HTML only inside <noscript>, for a reader without JavaScript", () => {
    const html = renderToString(<FooterMapFrame className="">{MAP}</FooterMapFrame>);

    expect(html).toContain("<noscript>");
    expect(html.match(/<iframe/g)).toHaveLength(1);
    expect(html.indexOf("<iframe")).toBeGreaterThan(html.indexOf("<noscript>"));
  });
});

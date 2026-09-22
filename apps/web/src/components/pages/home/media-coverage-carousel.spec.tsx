import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaCoverageCarousel } from "./media-coverage-carousel";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

/** A track of this size, measured the way the carousel measures it. */
const sized = (clientWidth: number, scrollWidth: number) => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(clientWidth);
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(scrollWidth);
};

let resize: () => void = () => {};

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe = () => resize();
      disconnect = () => {};
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const slides = () => [1, 2, 3, 4, 5].map((n) => <p key={n}>card {n}</p>);

describe("MediaCoverageCarousel", () => {
  it("pages the track by its own width: five cards in a 1312px track are two pages", () => {
    sized(1312, 5 * 308 + 4 * 24);
    render(<MediaCoverageCarousel>{slides()}</MediaCoverageCarousel>);

    expect(screen.getByText('position:{"index":1,"count":2}')).toBeInTheDocument();
    expect(screen.getAllByRole("group")).toHaveLength(5);
  });

  it("survives a track measured before it has a width", () => {
    // A track read mid-layout reports no width while its cards already have
    // one; dividing by it made the page count infinite and the dots throw.
    sized(0, 1636);

    expect(() => render(<MediaCoverageCarousel>{slides()}</MediaCoverageCarousel>)).not.toThrow();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    sized(1312, 1636);
    act(() => resize());
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("draws no controls when every card fits", () => {
    sized(1312, 1304);
    render(<MediaCoverageCarousel>{slides().slice(0, 4)}</MediaCoverageCarousel>);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

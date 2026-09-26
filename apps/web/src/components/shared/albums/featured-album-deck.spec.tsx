import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FeaturedAlbumDeck } from "./featured-album-deck";
import type { MediaAssetPublic } from "@/lib/api/types";

/**
 * The deck is the one component on the albums page that moves unprompted, so
 * the six conditions of ADR-0099 D1 are asserted here against the rendered
 * component rather than trusted to the helper alone:
 *
 * - it runs only while `useAmbientMotion` says so, and the stylesheet reads
 *   that one switch (D1.2, D1.3 through the helper);
 * - the pause button is visible, named by its action, and reflects state (D1.1);
 * - under reduced motion it describes the stillness instead of offering to
 *   stop it (D1.4);
 * - the keyframes touch transform and opacity only (D1.5).
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

let observerCallback: ((entries: { isIntersecting: boolean }[]) => void) | null = null;

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  setReducedMotion(false);
  observerCallback = null;
  globalThis.IntersectionObserver = class {
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
      observerCallback = callback;
    }
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const cover = (id: string) => ({
  id,
  photo: {
    id: `photo-${id}`,
    file: { url: `/media/${id}.jpg`, mimeType: "image/jpeg", width: 1600, height: 1000, size: 1, photographer: null, captureDate: null },
    caption: { ar: "", en: "" },
    altText: { ar: `غلاف ${id}`, en: `Cover ${id}` },
    displayOrder: 0,
    isFeatured: false,
  } satisfies MediaAssetPublic,
});

const five = ["a", "b", "c", "d", "e"].map(cover);

const deckOf = (container: HTMLElement) => container.querySelector(".album-deck") as HTMLElement;

const onScreen = () =>
  act(() => {
    observerCallback?.([{ isIntersecting: true }]);
  });

describe("FeaturedAlbumDeck", () => {
  it("draws five covers, the front one painted last", () => {
    const { container } = render(<FeaturedAlbumDeck covers={five} locale="en" />);
    const slots = [...container.querySelectorAll(".album-deck__card")].map((card) => card.getAttribute("data-slot"));
    expect(slots).toEqual(["4", "3", "2", "1", "0"]);
    expect(screen.getByRole("list", { name: "label" })).toBeInTheDocument();
    expect(screen.getByAltText("Cover a")).toBeInTheDocument();
  });

  it("does not run until it is on screen", () => {
    const { container } = render(<FeaturedAlbumDeck covers={five} locale="en" />);
    expect(deckOf(container)).toHaveAttribute("data-running", "false");
    onScreen();
    expect(deckOf(container)).toHaveAttribute("data-running", "true");
  });

  it("stops while the pointer is over it and while focus is inside it", () => {
    const { container } = render(<FeaturedAlbumDeck covers={five} locale="en" />);
    onScreen();
    const deck = deckOf(container);

    fireEvent.pointerEnter(deck);
    expect(deck).toHaveAttribute("data-running", "false");
    fireEvent.pointerLeave(deck);
    expect(deck).toHaveAttribute("data-running", "true");

    act(() => screen.getByRole("button").focus());
    expect(deck).toHaveAttribute("data-running", "false");
  });

  it("has a visible pause button named by what it will do, which reflects the state", async () => {
    // One pointer for the whole test, so it enters the deck once and leaves once.
    const user = userEvent.setup();
    const { container } = render(<FeaturedAlbumDeck covers={five} locale="en" />);
    onScreen();
    const deck = deckOf(container);

    const button = screen.getByRole("button", { name: "pause" });
    await user.click(button);
    expect(screen.getByRole("button", { name: "play" })).toBe(button);

    // Leaving with the pointer and with focus is not enough to restart it
    // while the reader's pause stands.
    await user.unhover(deck);
    act(() => button.blur());
    expect(deck).toHaveAttribute("data-running", "false");

    // Resuming, then leaving again, restarts it.
    await user.click(button);
    expect(screen.getByRole("button", { name: "pause" })).toBe(button);
    await user.unhover(deck);
    act(() => button.blur());
    expect(deck).toHaveAttribute("data-running", "true");
  });

  it("under reduced motion never runs, and its button says why rather than offering to stop it", async () => {
    setReducedMotion(true);
    const { container } = render(<FeaturedAlbumDeck covers={five} locale="en" />);
    onScreen();

    expect(deckOf(container)).toHaveAttribute("data-running", "false");
    const button = screen.getByRole("button", { name: "motionOff" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: "motionOff" })).toBeInTheDocument();
  });

  it("draws fewer than five covers at rest, with nothing to pause", () => {
    const { container } = render(<FeaturedAlbumDeck covers={five.slice(0, 3)} locale="en" />);
    expect(container.querySelectorAll(".album-deck__card")).toHaveLength(3);
    expect(deckOf(container)).toHaveAttribute("data-slots", "3");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("the deck's stylesheet", () => {
  const css = readFileSync(join(import.meta.dirname, "albums.css"), "utf-8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const blocks = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/g) ?? [];
  const guarded = blocks.join("\n");
  const outside = blocks.reduce((rest, block) => rest.replace(block, ""), css);

  it("attaches the cycle only when the reader has not asked for reduced motion", () => {
    expect(guarded).toMatch(/animation:\s*album-deck-cycle/);
    expect(outside).not.toMatch(/animation:\s*album-deck-/);
  });

  it("holds every animated part until the helper sets data-running", () => {
    const released = [...guarded.matchAll(/([^{}]+)\{\s*animation-play-state:\s*running;\s*\}/g)].map((match) => match[1]);
    expect(released).toHaveLength(1);
    for (const selector of released[0].split(",")) {
      expect(selector.trim()).toMatch(/^\.album-deck\[data-running="true"\]/);
    }
    expect(guarded.match(/animation-play-state:\s*paused/g)).toHaveLength(3);
  });

  it("animates transform and opacity only (ADR-0099 D1.5)", () => {
    for (const [, name, body] of css.matchAll(/@keyframes\s+(album-deck-[\w-]+)\s*\{([\s\S]*?)\n\}/g)) {
      for (const [, property] of body.matchAll(/^\s*([a-z-]+)\s*:/gm)) {
        expect(["transform", "opacity"], `${name} animates ${property}`).toContain(property);
      }
    }
  });

  it("declares its period locally, with the arithmetic beside it (ADR-0099 D3)", () => {
    const raw = readFileSync(join(import.meta.dirname, "albums.css"), "utf-8");
    expect(raw).toMatch(/5 x 3s = 15s\.[\s\S]{0,200}--album-deck-period: 15s;/);
    expect(raw).toMatch(/3 x 1\.5s = 4\.5s\.[\s\S]{0,200}--photo-stack-period: 4\.5s;/);
  });
});

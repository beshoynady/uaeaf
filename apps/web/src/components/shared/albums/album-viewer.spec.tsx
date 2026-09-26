import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import arMessages from "../../../../messages/ar.json";
import enMessages from "../../../../messages/en.json";
import { REVEAL_CAP, STAGE_SIZES, revealStep } from "@/lib/albums/photo-window";
import type { ViewerPhoto } from "@/lib/albums/photo-window";

import { ALBUM_VIEWER_PLAY_EVENT, AlbumViewer, DWELL_MS, requestAlbumSlideshow } from "./album-viewer";

/**
 * The viewer as a whole: the surface it stands on, the two views, the one
 * index they share, the address it writes, and autoplay under ADR-0099 —
 * which must not start by itself, and must stop for every reason the motion
 * helper names.
 */

const IntlWrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="ar" messages={arMessages}>
    {children}
  </NextIntlClientProvider>
);
const renderViewer = (ui: ReactElement) => render(ui, { wrapper: IntlWrapper });

const photo = (n: number): ViewerPhoto => ({
  id: `p${n}`,
  src: `https://res.cloudinary.com/uaeaf/image/upload/v1/albums/p${n}.jpg`,
  width: 1600,
  height: 1000,
  alt: `وصف ${n}`,
  caption: `تعليق ${n}`,
});
const album = (count: number) => Array.from({ length: count }, (_, i) => photo(i + 1));

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_CSS = readFileSync(join(HERE, "viewer.css"), "utf-8");
const CSS = RAW_CSS.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));

let intersect: ((entries: { isIntersecting: boolean }[]) => void) | null = null;

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion: reduce") ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

/** The stage scrolled into view, as the observer would report it. */
const onScreen = () => act(() => intersect?.([{ isIntersecting: true }]));

const counter = (container: HTMLElement) => container.querySelector("[aria-live]")?.textContent;

beforeEach(() => {
  document.documentElement.setAttribute("dir", "rtl");
  window.history.replaceState(null, "", "/ar/media/albums/uae-2026");
  setReducedMotion(false);
  intersect = null;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        intersect = callback;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("dir");
});

describe("the section", () => {
  it("stands on ink with its mesh, the edge ADR-0098 requires of an ink ground", () => {
    const { container } = renderViewer(<AlbumViewer photos={album(5)} id="album-photos" />);
    const surface = container.querySelector('[data-surface="ink"]');
    expect(surface).not.toBeNull();
    expect(surface?.id).toBe("album-photos");
    expect(surface?.querySelector(".brand-mesh")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "صور الألبوم" })).toBeInTheDocument();
  });

  it("renders nothing for an empty album", () => {
    const { container } = renderViewer(<AlbumViewer photos={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("speaks English on the English page", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AlbumViewer photos={album(3)} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Album photos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
  });
});

describe("slider and index", () => {
  it("opens on the slider, with the toggle reporting it through aria-pressed", () => {
    renderViewer(<AlbumViewer photos={album(12)} />);
    expect(screen.getByRole("button", { name: /شريط العرض/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /الفهرس/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("region", { name: "صور الألبوم في شريط العرض" })).toBeInTheDocument();
  });

  it("shows every photo in the index, the current one marked", () => {
    renderViewer(<AlbumViewer photos={album(12)} initialPhotoId="p4" />);
    fireEvent.click(screen.getByRole("button", { name: /الفهرس/ }));
    const grid = screen.getByRole("group", { name: "فهرس صور الألبوم" });
    const cells = within(grid).getAllByRole("button");
    expect(cells).toHaveLength(12);
    expect(cells[3]).toHaveAttribute("aria-current", "true");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("returns to the slider on the chosen photo, with focus on the stage and the address updated", () => {
    const replace = vi.spyOn(window.history, "replaceState");
    const { container } = renderViewer(<AlbumViewer photos={album(12)} />);
    fireEvent.click(screen.getByRole("button", { name: /الفهرس/ }));
    fireEvent.click(screen.getByRole("button", { name: "الصورة 9 من 12" }));

    const stage = screen.getByRole("region");
    expect(document.activeElement).toBe(stage);
    expect(counter(container)).toBe("الصورة 9 من 12");
    expect(String(replace.mock.calls.at(-1)?.[2])).toContain("photo=p9");
    replace.mockRestore();
  });

  it("staggers the first 30 cells and starts every later one with the 30th", () => {
    renderViewer(<AlbumViewer photos={album(40)} />);
    fireEvent.click(screen.getByRole("button", { name: /الفهرس/ }));
    const cells = within(screen.getByRole("group", { name: "فهرس صور الألبوم" })).getAllByRole("button");
    expect(cells[5].style.getPropertyValue("--av-cell-step")).toBe("5");
    expect(cells[29].style.getPropertyValue("--av-cell-step")).toBe("29");
    expect(cells[30].style.getPropertyValue("--av-cell-step")).toBe("29");
    expect(cells[39].style.getPropertyValue("--av-cell-step")).toBe("29");
  });
});

describe("the address", () => {
  it("opens on ?photo=<id> passed from the request", () => {
    const { container } = renderViewer(<AlbumViewer photos={album(12)} initialPhotoId="p7" />);
    expect(counter(container)).toBe("الصورة 7 من 12");
  });

  it("reads ?photo=<id> itself when the page did not pass it", () => {
    window.history.replaceState(null, "", "/ar/media/albums/uae-2026?photo=p5");
    const { container } = renderViewer(<AlbumViewer photos={album(12)} />);
    expect(counter(container)).toBe("الصورة 5 من 12");
  });

  it("ignores a stale id and opens on the first photo", () => {
    const { container } = renderViewer(<AlbumViewer photos={album(12)} initialPhotoId="deleted" />);
    expect(counter(container)).toBe("الصورة 1 من 12");
  });

  it("replaces the address on every move and never pushes history", () => {
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    renderViewer(<AlbumViewer photos={album(12)} />);
    fireEvent.click(screen.getByRole("button", { name: "الصورة التالية" }));
    fireEvent.click(screen.getByRole("button", { name: "الصورة التالية" }));
    expect(window.location.search).toBe("?photo=p3");
    expect(push).not.toHaveBeenCalled();
    replace.mockRestore();
    push.mockRestore();
  });
});

describe("autoplay (ADR-0099)", () => {
  it("does not start by itself", () => {
    vi.useFakeTimers();
    const { container } = renderViewer(<AlbumViewer photos={album(12)} />);
    onScreen();
    act(() => vi.advanceTimersByTime(DWELL_MS * 3));
    expect(counter(container)).toBe("الصورة 1 من 12");
  });

  it("advances one photo per dwell after the reader presses play", () => {
    vi.useFakeTimers();
    const { container } = renderViewer(<AlbumViewer photos={album(12)} />);
    onScreen();
    fireEvent.click(screen.getByRole("button", { name: "تشغيل العرض التلقائي" }));
    expect(screen.getByRole("button", { name: "إيقاف العرض التلقائي" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(DWELL_MS - 1));
    expect(counter(container)).toBe("الصورة 1 من 12");
    act(() => vi.advanceTimersByTime(1));
    expect(counter(container)).toBe("الصورة 2 من 12");
  });

  it("stops while the pointer is on the photos, and resumes when it leaves", () => {
    vi.useFakeTimers();
    const { container } = renderViewer(<AlbumViewer photos={album(12)} />);
    onScreen();
    fireEvent.click(screen.getByRole("button", { name: "تشغيل العرض التلقائي" }));
    const region = container.querySelector(".av-region") as HTMLElement;

    fireEvent.pointerEnter(region);
    act(() => vi.advanceTimersByTime(DWELL_MS * 2));
    expect(counter(container)).toBe("الصورة 1 من 12");
    expect(region).toHaveAttribute("data-held");

    fireEvent.pointerLeave(region);
    act(() => vi.advanceTimersByTime(DWELL_MS));
    expect(counter(container)).toBe("الصورة 2 من 12");
  });

  it("stops while focus is inside the photos", () => {
    vi.useFakeTimers();
    const { container } = renderViewer(<AlbumViewer photos={album(12)} />);
    onScreen();
    fireEvent.click(screen.getByRole("button", { name: "تشغيل العرض التلقائي" }));
    fireEvent.focus(screen.getByRole("region"));
    act(() => vi.advanceTimersByTime(DWELL_MS * 2));
    expect(counter(container)).toBe("الصورة 1 من 12");
  });

  it("stops while the photos are off screen", () => {
    vi.useFakeTimers();
    const { container } = renderViewer(<AlbumViewer photos={album(12)} />);
    fireEvent.click(screen.getByRole("button", { name: "تشغيل العرض التلقائي" }));
    act(() => vi.advanceTimersByTime(DWELL_MS * 2));
    expect(counter(container)).toBe("الصورة 1 من 12");
  });

  it("pauses on the second press", () => {
    vi.useFakeTimers();
    const { container } = renderViewer(<AlbumViewer photos={album(12)} />);
    onScreen();
    fireEvent.click(screen.getByRole("button", { name: "تشغيل العرض التلقائي" }));
    fireEvent.click(screen.getByRole("button", { name: "إيقاف العرض التلقائي" }));
    act(() => vi.advanceTimersByTime(DWELL_MS * 2));
    expect(counter(container)).toBe("الصورة 1 من 12");
  });

  it("ends on the last photo instead of starting over", () => {
    vi.useFakeTimers();
    const { container } = renderViewer(<AlbumViewer photos={album(3)} />);
    onScreen();
    fireEvent.click(screen.getByRole("button", { name: "تشغيل العرض التلقائي" }));
    // One act per dwell: each photo's timer is scheduled by the render the
    // previous one caused, which only happens when an act ends.
    for (let step = 0; step < 5; step += 1) act(() => vi.advanceTimersByTime(DWELL_MS));
    expect(counter(container)).toBe("الصورة 3 من 3");
    expect(screen.getByRole("button", { name: "تشغيل العرض التلقائي" })).toBeInTheDocument();
  });

  it("starts from the hero's button through the play event", () => {
    vi.useFakeTimers();
    const { container } = renderViewer(<AlbumViewer photos={album(12)} />);
    onScreen();
    fireEvent.click(screen.getByRole("button", { name: /الفهرس/ }));
    act(() => requestAlbumSlideshow());
    expect(screen.getByRole("region")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(DWELL_MS));
    expect(counter(container)).toBe("الصورة 2 من 12");
    expect(ALBUM_VIEWER_PLAY_EVENT).toBe("uaeaf:album-viewer-play");
  });

  it("does not exist under reduced motion, and the button says why", () => {
    setReducedMotion(true);
    vi.useFakeTimers();
    const { container } = renderViewer(<AlbumViewer photos={album(12)} />);
    onScreen();
    const play = screen.getByRole("button", { name: "العرض التلقائي متوقف لأن جهازك يطلب حركة أقل" });
    expect(play).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(play);
    act(() => vi.advanceTimersByTime(DWELL_MS * 2));
    expect(counter(container)).toBe("الصورة 1 من 12");
  });

  it("dwells exactly as long as the stylesheet's Ken Burns lasts", () => {
    const declared = CSS.match(/--av-dwell:\s*(\d+)ms;/)?.[1];
    expect(Number(declared)).toBe(DWELL_MS);
  });
});

describe("paging in", () => {
  it("asks for more photos when the render window reaches the loaded end", () => {
    const onRequestMore = vi.fn();
    renderViewer(<AlbumViewer photos={album(40)} total={48} initialPhotoId="p33" onRequestMore={onRequestMore} />);
    expect(onRequestMore).toHaveBeenCalled();
  });

  it("does not ask while the window is far from the end", () => {
    const onRequestMore = vi.fn();
    renderViewer(<AlbumViewer photos={album(40)} total={48} onRequestMore={onRequestMore} />);
    expect(onRequestMore).not.toHaveBeenCalled();
  });
});

describe("the stylesheet", () => {
  /** Every block's text with the at-rules enclosing it, found by walking the
   *  braces: a regular expression cannot tell which `@media` a rule is in. */
  const blocks = (() => {
    const found: { prelude: string; body: string; within: string[] }[] = [];
    const open: { prelude: string; start: number }[] = [];
    let preludeStart = 0;
    for (let i = 0; i < CSS.length; i += 1) {
      if (CSS[i] === "{") {
        open.push({ prelude: CSS.slice(preludeStart, i).trim(), start: i + 1 });
        preludeStart = i + 1;
      } else if (CSS[i] === "}") {
        const block = open.pop();
        if (block) {
          found.push({
            prelude: block.prelude,
            body: CSS.slice(block.start, i),
            within: open.map(({ prelude }) => prelude),
          });
        }
        preludeStart = i + 1;
      } else if (CSS[i] === ";") {
        preludeStart = i + 1;
      }
    }
    return found;
  })();

  it("moves nothing for a reader who asked for less motion", () => {
    // Every transition and animation lives inside a no-preference block, so
    // reduced motion is the absence of the rule, not a reset racing it.
    const offenders = blocks
      .filter(({ prelude }) => !prelude.startsWith("@") && !/^(from|to|\d+%)/.test(prelude))
      .filter(({ body }) => /(?:^|;|\s)(transition|animation)(?:-[a-z]+)?\s*:/.test(body))
      .filter(({ within }) => !within.some((at) => /prefers-reduced-motion:\s*no-preference/.test(at)))
      .map(({ prelude }) => prelude);
    expect(offenders).toEqual([]);
  });

  it("hides the finish line unless motion is allowed", () => {
    const resting = blocks.find(({ prelude, within }) => prelude === ".av-finish" && within.length === 0);
    expect(resting?.body).toMatch(/display:\s*none/);
  });

  it("builds the finish line from the surface's tricolour stops, not from literal colours", () => {
    const finish = blocks.find(({ prelude, within }) => prelude === ".av-finish" && within.length === 0)?.body ?? "";
    expect(finish).toContain("var(--surface-tricolor-start) 30%");
    expect(finish).toContain("var(--surface-tricolor-mid) 42%");
    expect(finish).toContain("var(--surface-tricolor-mid) 58%");
    expect(finish).toContain("var(--surface-tricolor-end) 70%");
    expect(CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\(/);
  });

  it("reserves every image box, so arriving images move nothing (CLS 0)", () => {
    const rule = (selector: string) => blocks.find(({ prelude, within }) => prelude === selector && within.length === 0)?.body ?? "";
    expect(rule(".av-slide")).toMatch(/aspect-ratio:\s*var\(--av-ratio\)/);
    expect(rule(".av-cell")).toMatch(/aspect-ratio:\s*3 \/ 2/);
    expect(rule(".av-thumb__img")).toMatch(/block-size:\s*var\(--av-thumb-h\)/);
    expect(rule(".av-stage")).toMatch(/block-size:\s*var\(--av-stage\)/);
  });

  it("multiplies every horizontal translation by --dirx", () => {
    for (const match of CSS.matchAll(/translateX\(([^;]*)\)/g)) {
      if (/translateX\(0\)/.test(match[0])) continue;
      expect(match[1]).toContain("var(--dirx)");
    }
  });

  it("staggers the index 20ms a cell, so the 30th cell starts at 580ms, inside Chapter 5 §5.7's 600ms", () => {
    const step = Number(CSS.match(/--av-cell-stagger:\s*(\d+)ms;/)?.[1]);
    expect(step).toBe(20);
    // The last step any cell takes, however long the album.
    const lastStep = revealStep(Number.MAX_SAFE_INTEGER);
    expect(lastStep).toBe(REVEAL_CAP - 1);
    expect(lastStep * step).toBe(580);
    expect(lastStep * step).toBeLessThanOrEqual(600);
    // …and it is the largest whole step that fits thirty cells under the ceiling.
    expect(lastStep * (step + 1)).toBeGreaterThan(600);
  });

  it("tells the browser the slide boxes it draws, so its srcset choice is made for the real box", () => {
    const root = (desktop: boolean) =>
      blocks.find(
        ({ prelude, within }) =>
          prelude === ".av-root" &&
          (desktop ? within.some((at) => at.includes("min-width: 1024px")) : within.length === 0),
      )?.body ?? "";
    expect(root(false)).toMatch(/--av-w:\s*min\(300px,/);
    expect(root(true)).toMatch(/--av-w:\s*820px;/);
    expect(STAGE_SIZES).toBe("(min-width: 1024px) 820px, 300px");
  });
});

describe("every local duration carries its reason (ADR-0099 D3)", () => {
  /**
   * Each custom property holding a duration in the album stylesheets, with
   * the comment directly above it, asterisks and line breaks collapsed.
   */
  const localDurations = (source: string) =>
    [...source.matchAll(/(--[\w-]+):\s*([\d.]+m?s);/g)].map((match) => {
      const before = source.slice(0, match.index).trimEnd();
      const comment = before.endsWith("*/") ? before.slice(before.lastIndexOf("/*")) : "";
      return { name: match[1], value: match[2], comment: comment.replace(/[\s*]+/g, " ").trim() };
    });

  const found = [
    ...localDurations(RAW_CSS),
    ...localDurations(readFileSync(join(HERE, "albums.css"), "utf-8")),
  ];

  it("knows every one of them, so a new duration cannot arrive without its derivation", () => {
    expect(found.map(({ name, value }) => `${name}: ${value}`)).toEqual([
      "--av-slide-duration: 800ms",
      "--av-veil-delay: 120ms",
      "--av-finish-duration: 1000ms",
      "--av-dwell: 5200ms",
      "--av-cell-stagger: 20ms",
      "--photo-stack-period: 4.5s",
      "--album-deck-period: 15s",
    ]);
  });

  it("puts a comment directly above each one", () => {
    for (const { name, comment } of found) expect(comment, name).toMatch(/^\/ .+ \/$/);
  });

  it.each([
    ["--av-slide-duration", "95% at 341ms"],
    ["--av-veil-delay", "15% of the 800ms travel"],
    ["--av-finish-duration", "350-850ms after the move began"],
    ["--av-dwell", "800ms travel plus 4.4s at rest"],
    ["--av-cell-stagger", "29 x 20ms = 580ms"],
    ["--photo-stack-period", "3 x 1.5s = 4.5s"],
    ["--album-deck-period", "5 x 3s = 15s"],
  ])("derives %s rather than restating it", (name, derivation) => {
    expect(found.find((entry) => entry.name === name)?.comment).toContain(derivation);
  });
});

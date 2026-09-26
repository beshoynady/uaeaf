import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import arMessages from "../../../../messages/ar.json";
import enMessages from "../../../../messages/en.json";

import { PhotoShare } from "./photo-share";

/**
 * The photo link on every width, and every way the platform can answer it:
 * a share sheet, a dismissed sheet, a clipboard, a missing clipboard and a
 * refused one. Each answer must leave the reader either done or told what to
 * do, never pressing a button that silently did nothing.
 */

const Arabic = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="ar" messages={arMessages}>
    {children}
  </NextIntlClientProvider>
);

const COPIED = arMessages.albums.viewer.photoLinkCopied;
const MANUAL = arMessages.albums.viewer.photoLinkManual;

/** Installs exactly the capabilities a test names and nothing else. */
const platform = ({
  share,
  writeText,
}: {
  share?: (data: ShareData) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}) => {
  if (share) Object.defineProperty(navigator, "share", { value: share, configurable: true });
  if (writeText) Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
};

const compact = (container: HTMLElement) => container.querySelector<HTMLButtonElement>(".av-share__compact button")!;
const full = (container: HTMLElement) => container.querySelector<HTMLButtonElement>(".av-share__full button")!;
const status = () => screen.getByRole("status");

beforeEach(() => {
  window.history.replaceState(null, "", "/ar/media/albums/uae-2026");
});

afterEach(() => {
  for (const key of ["share", "clipboard"]) Reflect.deleteProperty(navigator, key);
  vi.useRealTimers();
});

describe("the control", () => {
  it("is the kit's 44x44 icon button below lg, named in words", () => {
    const { container } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });
    const button = compact(container);
    // `brand-icon-button` is the kit's 44x44 control (ADR-0068 D2.2).
    expect(button).toHaveClass("brand-icon-button");
    expect(button).toHaveAttribute("aria-label", "رابط الصورة");
    // The glyph is decoration; the label is the name.
    expect(button.querySelector("svg")?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("is the labelled secondary button from lg, with the same words", () => {
    const { container } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });
    expect(full(container)).toHaveTextContent("رابط الصورة");
    expect(full(container)).toHaveAttribute("data-variant", "secondary");
  });

  it("speaks English on the English page", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <PhotoShare photoId="p7" />
      </NextIntlClientProvider>,
    );
    expect(compact(container)).toHaveAttribute("aria-label", "Photo link");
  });

  it("keeps an empty live region in the page before anything is said", () => {
    render(<PhotoShare photoId="p7" />, { wrapper: Arabic });
    expect(status()).toBeEmptyDOMElement();
  });
});

describe("pressing it", () => {
  it("writes the photo into the address first, without adding history", async () => {
    const push = vi.spyOn(window.history, "pushState");
    platform({ writeText: vi.fn().mockResolvedValue(undefined) });
    const { container } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });

    await act(async () => fireEvent.click(compact(container)));

    expect(window.location.search).toBe("?photo=p7");
    expect(push).not.toHaveBeenCalled();
    push.mockRestore();
  });

  it("opens the platform's share sheet when there is one, and says nothing over it", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    platform({ share, writeText });
    const { container } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });

    await act(async () => fireEvent.click(compact(container)));

    expect(share).toHaveBeenCalledWith({ url: expect.stringContaining("photo=p7") });
    expect(writeText).not.toHaveBeenCalled();
    expect(status()).toBeEmptyDOMElement();
  });

  it("copies nothing and says nothing when the reader dismisses the sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    platform({ share: () => Promise.reject(new DOMException("canceled", "AbortError")), writeText });
    const { container } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });

    await act(async () => fireEvent.click(compact(container)));

    expect(writeText).not.toHaveBeenCalled();
    expect(status()).toBeEmptyDOMElement();
  });

  it("copies and confirms, visibly, where there is no share sheet", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    platform({ writeText });
    const { container } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });

    await act(async () => fireEvent.click(compact(container)));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("photo=p7"));
    expect(status()).toHaveTextContent(COPIED);
    // Not the visually hidden kind: the reader of an icon button sees it.
    expect(status()).not.toHaveClass("brand-visually-hidden");

    act(() => vi.advanceTimersByTime(2600));
    expect(status()).toBeEmptyDOMElement();
  });

  it("copies when the share sheet fails for a reason that is not the reader's", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    platform({ share: () => Promise.reject(new DOMException("no activation", "NotAllowedError")), writeText });
    const { container } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });

    await act(async () => fireEvent.click(full(container)));

    expect(writeText).toHaveBeenCalled();
    expect(status()).toHaveTextContent(COPIED);
  });

  it("tells the reader where the link is when there is no clipboard at all", async () => {
    // jsdom has neither `navigator.share` nor `navigator.clipboard`: the
    // insecure-context case, exactly.
    expect("share" in navigator).toBe(false);
    expect(navigator.clipboard).toBeUndefined();
    const { container } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });

    await act(async () => fireEvent.click(compact(container)));

    expect(status()).toHaveTextContent(MANUAL);
    // What it says is true: the page's own link now opens this photo.
    expect(window.location.search).toBe("?photo=p7");
  });

  it("tells the reader where the link is when the clipboard refuses the write, and keeps saying it", async () => {
    vi.useFakeTimers();
    platform({ writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) });
    const { container } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });

    await act(async () => fireEvent.click(compact(container)));
    expect(status()).toHaveTextContent(MANUAL);

    // An instruction does not time out mid-read.
    act(() => vi.advanceTimersByTime(10_000));
    expect(status()).toHaveTextContent(MANUAL);
  });

  it("clears what it said once the reader moves to another photo", async () => {
    platform({ writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) });
    const { container, rerender } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });

    await act(async () => fireEvent.click(compact(container)));
    expect(status()).toHaveTextContent(MANUAL);

    rerender(<PhotoShare photoId="p8" />);
    expect(status()).toBeEmptyDOMElement();
  });

  it("says nothing about a photo the reader has already left when the answer arrives", async () => {
    let answer: () => void = () => {};
    platform({ writeText: () => new Promise<void>((resolve) => (answer = resolve)) });
    const { container, rerender } = render(<PhotoShare photoId="p7" />, { wrapper: Arabic });

    fireEvent.click(compact(container));
    rerender(<PhotoShare photoId="p8" />);
    await act(async () => answer());

    expect(status()).toBeEmptyDOMElement();
  });
});

describe("the stylesheet", () => {
  const css = readFileSync(join(import.meta.dirname, "viewer.css"), "utf-8");

  /** The body of the first `selector {` rule, optionally only inside the
   *  `@media` blocks whose query mentions `media`. */
  const rule = (selector: string, media?: string) => {
    const scope = media === undefined ? css : css.split("@media").filter((block) => block.includes(media)).join("");
    const start = scope.indexOf(`${selector} {`);
    return start === -1 ? "" : scope.slice(start, scope.indexOf("}", start));
  };

  it("finds the rules it checks", () => {
    for (const selector of [".av-meta__end", ".av-share__full", ".av-share__status"]) {
      expect(rule(selector), selector).not.toBe("");
    }
  });

  it("shows the photo link at every width: the caption row's end is no longer hidden below lg", () => {
    expect(rule(".av-meta__end")).toMatch(/display:\s*flex/);
    expect(rule(".av-meta__end")).not.toMatch(/display:\s*none/);
  });

  it("draws the icon button below lg and the labelled button from lg, one at a time", () => {
    expect(rule(".av-share__full")).toMatch(/display:\s*none/);
    expect(rule(".av-share__compact", "min-width: 1024px")).toMatch(/display:\s*none/);
    expect(rule(".av-share__full", "min-width: 1024px")).toMatch(/display:\s*inline-flex/);
  });

  it("places the confirmation out of the flow, so it moves nothing as it comes and goes", () => {
    const placed = rule(".av-share__status");
    expect(placed).toMatch(/position:\s*absolute/);
    expect(placed).toMatch(/pointer-events:\s*none/);
    expect(placed).toMatch(/inset-inline-end:/);
    expect(placed).not.toMatch(/(^|[^-])(left|right)\s*:/);
  });
});
